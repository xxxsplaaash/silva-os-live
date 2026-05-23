/**
 * runPack34aFrustrationEval.ts — Pack 3.4a runner
 *
 * Generates side-by-side raw outputs for 3 modes across 4 frustration subtypes.
 * No automated judge scoring. Evidence-only output for human review.
 */

import * as fs from "fs";
import * as path from "path";
import {
  TARGETED_MODES,
  FRUSTRATION_SUBTYPES,
  runFrustrationEvalScenario,
  ModeRunResult,
} from "./t34aFrustrationEval";
import { GeminiGeneratorAdapter } from "../generation/geminiGeneratorAdapter";

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.resolve(process.cwd(), "PACK_3_4A_FRUSTRATION_EVAL_RUN.json");
const NDJSON_PATH = OUTPUT_PATH + ".ndjson";
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;
const INTER_CALL_DELAY_MS = 800;

// ─── CLI args ─────────────────────────────────────────────────────────────────

const RERUN_INVALID_ONLY = process.argv.includes("--rerun-invalid");

// ─── Retry with backoff ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

const RETRY_TRIGGER_STRINGS = [
  "resource_exhausted",
  "quota",
  "429",
  "unavailable",
  "503",
  "too_many_requests",
];

function isRetryable(msg: string | null): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return RETRY_TRIGGER_STRINGS.some((s) => lower.includes(s));
}

async function runWithRetry(
  mode: any,
  scenario: any,
  generator: any,
): Promise<ModeRunResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < MAX_RETRIES) {
    try {
      const result = await runFrustrationEvalScenario(mode, scenario, generator);

      if (result.apiStatus === "failed" && isRetryable(result.apiErrorMessage)) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
        console.error(
          `[P34A_RETRY] mode=${mode.id} scenario=${scenario.id} attempt=${attempt + 1}/${MAX_RETRIES} error="${result.apiErrorMessage}" backoff=${delay}ms`,
        );
        await sleep(delay);
        attempt++;
        continue;
      }

      return result;
    } catch (err: any) {
      lastError = err;
      if (isRetryable(err?.message) && attempt < MAX_RETRIES - 1) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
        console.error(
          `[P34A_RETRY] mode=${mode.id} scenario=${scenario.id} attempt=${attempt + 1}/${MAX_RETRIES} thrown="${err.message}" backoff=${delay}ms`,
        );
        await sleep(delay);
        attempt++;
      } else {
        break;
      }
    }
  }

  console.error(
    `[P34A_FAILED] mode=${mode.id} scenario=${scenario.id} exhausted retries. last_error="${lastError?.message}"`,
  );
  return {
    modeId: mode.id,
    modeLabel: mode.label,
    scenarioId: scenario.id,
    subtypeClass: scenario.subtypeClass,
    rawText: "",
    biasesObservedByRuntime: [],
    appliedShapingDirectives: [],
    realizedIntent: null,
    kPositionBiasesUsed: mode.biases,
    apiStatus: "failed",
    apiErrorMessage: lastError?.message ?? "max_retries_exhausted",
    latencyMs: null,
    cellValidity: "INFRA_FAILURE",
    cellInvalidReason: lastError?.message ?? "max_retries_exhausted",
  };
}

// ─── Resumable NDJSON helpers ─────────────────────────────────────────────────

function appendResultToNdjson(result: ModeRunResult): void {
  fs.appendFileSync(NDJSON_PATH, JSON.stringify(result) + "\n", "utf-8");
}

function loadPriorResults(): ModeRunResult[] {
  if (!fs.existsSync(NDJSON_PATH)) return [];
  const lines = fs.readFileSync(NDJSON_PATH, "utf-8").trim().split("\n").filter(Boolean);
  const results: ModeRunResult[] = [];
  for (const line of lines) {
    try {
      results.push(JSON.parse(line) as ModeRunResult);
    } catch {
      console.error(`[P34A_WARN] Failed to parse NDJSON line: ${line.slice(0, 80)}`);
    }
  }
  return results;
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(results: ModeRunResult[], model: string) {
  const valid = results.filter((r) => r.cellValidity === "VALID");
  const infraFailures = results.filter((r) => r.cellValidity === "INFRA_FAILURE");
  const postureFailures = results.filter((r) => r.cellValidity === "POSTURE_REALIZATION_FAILURE");
  const mismatches = results.filter((r) => r.cellValidity === "POSTURE_MISMATCH");

  return {
    model,
    totalCells: results.length,
    validEvidence: valid.length,
    infraFailures: infraFailures.length,
    postureRealizationFailures: postureFailures.length,
    postureMismatches: mismatches.length,
    subtypes: FRUSTRATION_SUBTYPES.map((s) => s.id),
    modes: TARGETED_MODES.map((m) => m.id),
    infraFailureDetails: infraFailures.map((r) => ({
      modeId: r.modeId,
      scenarioId: r.scenarioId,
      reason: r.cellInvalidReason,
    })),
    postureRealizationFailureDetails: postureFailures.map((r) => ({
      modeId: r.modeId,
      scenarioId: r.scenarioId,
      reason: r.cellInvalidReason,
      biasesObservedCount: r.biasesObservedByRuntime.length,
      appliedDirectives: r.appliedShapingDirectives,
    })),
    postureMismatchDetails: mismatches.map((r) => ({
      modeId: r.modeId,
      scenarioId: r.scenarioId,
      reason: r.cellInvalidReason,
      realizedIntent: r.realizedIntent,
    })),
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";

  if (!apiKey) {
    console.error("[P34A] GEMINI_API_KEY not set. Exiting.");
    process.exit(1);
  }

  const generator = new GeminiGeneratorAdapter({
    apiKey,
    model,
    maxOutputTokens: 1024,
    timeoutMs: 30000,
  });

  let priorResults: ModeRunResult[] = [];
  const cellsToRun: Array<{ mode: (typeof TARGETED_MODES)[number]; scenario: (typeof FRUSTRATION_SUBTYPES)[number] }> = [];

  if (RERUN_INVALID_ONLY) {
    priorResults = loadPriorResults();
    const invalidKeys = new Set(
      priorResults
        .filter((r) => r.cellValidity !== "VALID")
        .map((r) => `${r.modeId}::${r.scenarioId}`),
    );
    console.error(`[P34A] --rerun-invalid mode. Prior cells: ${priorResults.length}. Invalid to rerun: ${invalidKeys.size}`);

    for (const scenario of FRUSTRATION_SUBTYPES) {
      for (const mode of TARGETED_MODES) {
        if (invalidKeys.has(`${mode.id}::${scenario.id}`)) {
          cellsToRun.push({ mode, scenario });
        }
      }
    }
  } else {
    if (fs.existsSync(NDJSON_PATH)) {
      fs.unlinkSync(NDJSON_PATH);
      console.error("[P34A] Cleared previous NDJSON run file for fresh run.");
    }
    for (const scenario of FRUSTRATION_SUBTYPES) {
      for (const mode of TARGETED_MODES) {
        cellsToRun.push({ mode, scenario });
      }
    }
  }

  console.error(`[P34A] Starting Pack 3.4a Frustration Subtype Eval. model=${model}`);
  console.error(`[P34A] Cells to execute: ${cellsToRun.length} of ${TARGETED_MODES.length * FRUSTRATION_SUBTYPES.length} total`);

  const newResults: ModeRunResult[] = [];

  for (const { mode, scenario } of cellsToRun) {
    console.error(`\n[P34A] subtype=${scenario.id} mode=${mode.id}`);
    const result = await runWithRetry(mode, scenario, generator);
    appendResultToNdjson(result);
    newResults.push(result);
    await sleep(INTER_CALL_DELAY_MS);
  }

  const rerunKeys = new Set(newResults.map((r) => `${r.modeId}::${r.scenarioId}`));
  const survivingPrior = priorResults.filter(
    (r) => r.cellValidity === "VALID" && !rerunKeys.has(`${r.modeId}::${r.scenarioId}`),
  );
  const allResults = [...survivingPrior, ...newResults];

  const summary = buildSummary(allResults, model);

  const scenarioBlocks = FRUSTRATION_SUBTYPES.map((scenario) => {
    const modeResults = TARGETED_MODES.map((mode) => {
      const result = allResults.find(
        (r) => r.modeId === mode.id && r.scenarioId === scenario.id,
      );
      return result ? {
        modeId: result.modeId,
        modeLabel: result.modeLabel,
        intendedMode: {
          expectedIntent: TARGETED_MODES.find((m) => m.id === result.modeId)?.expectedIntent ?? null,
          expectedDirectives: TARGETED_MODES.find((m) => m.id === result.modeId)?.expectedDirectives ?? [],
          kPositionBiasesUsed: result.kPositionBiasesUsed,
        },
        realizedPosture: {
          biasesObservedByRuntime: result.biasesObservedByRuntime,
          appliedShapingDirectives: result.appliedShapingDirectives,
          realizedIntent: result.realizedIntent,
        },
        validity: {
          cellValidity: result.cellValidity,
          cellInvalidReason: result.cellInvalidReason,
        },
        apiStatus: result.apiStatus,
        apiErrorMessage: result.apiErrorMessage,
        latencyMs: result.latencyMs,
        rawText: result.rawText,
      } : null;
    });

    return {
      scenarioId: scenario.id,
      subtypeClass: scenario.subtypeClass,
      userPrompt: scenario.turns[scenario.turns.length - 1].rawText,
      modeResults,
    };
  });

  const finalOutput = { packVersion: "3.4a", summary, scenarioBlocks };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), "utf-8");

  console.error(`\n[P34A] ══════════════ PACK 3.4a RUN COMPLETE ══════════════`);
  console.error(`[P34A] Total cells: ${summary.totalCells}`);
  console.error(`[P34A] Valid evidence: ${summary.validEvidence}`);
  console.error(`[P34A] Infra failures: ${summary.infraFailures}`);
  console.error(`[P34A] Posture-realization failures: ${summary.postureRealizationFailures}`);
  console.error(`[P34A] Posture mismatches: ${summary.postureMismatches}`);
  console.error(`[P34A] Output: ${OUTPUT_PATH}`);

  if (summary.infraFailures > 0) {
    console.error(`[P34A] ⚠ INFRA_FAILURE cells detected — rerun with: npx tsx src/eval/runPack34aFrustrationEval.ts --rerun-invalid`);
  }

  console.log(JSON.stringify(finalOutput, null, 2));
}

main().catch((e) => {
  console.error("[P34A_FATAL]", e);
  process.exit(1);
});
