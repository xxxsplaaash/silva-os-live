/**
 * runPack33PostureEval.ts — Pack 3.3b runner
 *
 * Generates side-by-side raw outputs for all 5 posture modes across 7 scenarios.
 * No automated judge scoring. Evidence-only output for human review.
 *
 * Pack 3.3b additions over Pack 3.3:
 *   - Reports biasesObservedByRuntime per cell (bias formation diagnostic)
 *   - Reports realizedIntent per cell
 *   - Reports cellValidity and cellInvalidReason per cell
 *   - Summary separates: valid evidence / infra failures / posture-realization failures
 *   - Supports partial rerun targeting only INVALID cells from a prior NDJSON run
 *   - Full clean rerun path available as default
 *
 * Retry / resilience:
 *   - Exponential backoff on 429/503/RESOURCE_EXHAUSTED (max 3 attempts)
 *   - 800ms polite inter-call delay
 *   - Per-result NDJSON append so partial runs survive crashes
 */

import * as fs from "fs";
import * as path from "path";
import {
  POSTURE_MODES,
  SCENARIOS,
  runPostureModeOnScenario,
  ModeRunResult,
  CellValidity,
} from "./t33PostureEval";
import { GeminiGeneratorAdapter } from "../generation/geminiGeneratorAdapter";

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_PATH = path.resolve(process.cwd(), "PACK_3_3B_POSTURE_EVAL_RUN.json");
const NDJSON_PATH = OUTPUT_PATH + ".ndjson";
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 2000;
const INTER_CALL_DELAY_MS = 800;

// ─── CLI args ─────────────────────────────────────────────────────────────────

/**
 * --rerun-invalid: load prior NDJSON, re-execute only cells with non-VALID status.
 * Default: full clean run, overwrites prior state.
 */
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
      const result = await runPostureModeOnScenario(mode, scenario, generator);

      if (result.apiStatus === "failed" && isRetryable(result.apiErrorMessage)) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
        console.error(
          `[P33B_RETRY] mode=${mode.id} scenario=${scenario.id} attempt=${attempt + 1}/${MAX_RETRIES} error="${result.apiErrorMessage}" backoff=${delay}ms`,
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
          `[P33B_RETRY] mode=${mode.id} scenario=${scenario.id} attempt=${attempt + 1}/${MAX_RETRIES} thrown="${err.message}" backoff=${delay}ms`,
        );
        await sleep(delay);
        attempt++;
      } else {
        break;
      }
    }
  }

  console.error(
    `[P33B_FAILED] mode=${mode.id} scenario=${scenario.id} exhausted retries. last_error="${lastError?.message}"`,
  );
  return {
    modeId: mode.id,
    modeLabel: mode.label,
    scenarioId: scenario.id,
    scenarioClass: scenario.scenarioClass,
    isControl: scenario.isControl,
    rawText: "",
    biasesObservedByRuntime: [],
    appliedShapingDirectives: [],
    realizedIntent: null,
    kPositionBiasesUsed: mode.biases,
    apiStatus: "failed",
    apiErrorMessage: lastError?.message ?? "max_retries_exhausted",
    latencyMs: null,
    metrics: { wordCount: 0, sentenceCount: 0, questionCount: 0 },
    flags: {
      therapySpeakLeakage: false,
      unnecessaryEmotionalReflection: false,
      refusalOrEvasiveness: false,
      overCompression: false,
      exploratoryBloat: false,
      structuralOverformattingInNeutralCase: false,
    },
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
      console.error(`[P33B_WARN] Failed to parse NDJSON line: ${line.slice(0, 80)}`);
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
    scenarios: SCENARIOS.map((s) => s.id),
    modes: POSTURE_MODES.map((m) => m.id),
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

// ─── Per-cell report block ────────────────────────────────────────────────────

function buildCellReportBlock(result: ModeRunResult) {
  return {
    modeId: result.modeId,
    modeLabel: result.modeLabel,
    intendedMode: {
      expectedIntent: POSTURE_MODES.find((m) => m.id === result.modeId)?.expectedIntent ?? null,
      expectedDirectives: POSTURE_MODES.find((m) => m.id === result.modeId)?.expectedDirectives ?? [],
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
    metrics: result.metrics,
    flags: result.flags,
    rawText: result.rawText,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";

  if (!apiKey) {
    console.error("[P33B] GEMINI_API_KEY not set. Exiting.");
    process.exit(1);
  }

  const generator = new GeminiGeneratorAdapter({
    apiKey,
    model,
    maxOutputTokens: 1024,
    timeoutMs: 30000,
  });

  // ── Determine which cells to run ──────────────────────────────────────────

  let priorResults: ModeRunResult[] = [];
  const cellsToRun: Array<{ mode: (typeof POSTURE_MODES)[number]; scenario: (typeof SCENARIOS)[number] }> = [];

  if (RERUN_INVALID_ONLY) {
    priorResults = loadPriorResults();
    const invalidKeys = new Set(
      priorResults
        .filter((r) => r.cellValidity !== "VALID")
        .map((r) => `${r.modeId}::${r.scenarioId}`),
    );
    console.error(`[P33B] --rerun-invalid mode. Prior cells: ${priorResults.length}. Invalid to rerun: ${invalidKeys.size}`);

    for (const scenario of SCENARIOS) {
      for (const mode of POSTURE_MODES) {
        if (invalidKeys.has(`${mode.id}::${scenario.id}`)) {
          cellsToRun.push({ mode, scenario });
        }
      }
    }
  } else {
    // Full clean run
    if (fs.existsSync(NDJSON_PATH)) {
      fs.unlinkSync(NDJSON_PATH);
      console.error("[P33B] Cleared previous NDJSON run file for fresh run.");
    }
    for (const scenario of SCENARIOS) {
      for (const mode of POSTURE_MODES) {
        cellsToRun.push({ mode, scenario });
      }
    }
  }

  console.error(`[P33B] Starting Pack 3.3b Posture Eval. model=${model}`);
  console.error(`[P33B] Cells to execute: ${cellsToRun.length} of ${POSTURE_MODES.length * SCENARIOS.length} total`);
  console.error(`[P33B] Resumable NDJSON: ${NDJSON_PATH}`);
  console.error(`[P33B] Final JSON: ${OUTPUT_PATH}`);

  const newResults: ModeRunResult[] = [];

  for (const { mode, scenario } of cellsToRun) {
    console.error(`\n[P33B] scenario=${scenario.id} mode=${mode.id}`);
    const result = await runWithRetry(mode, scenario, generator);
    appendResultToNdjson(result);
    newResults.push(result);
    await sleep(INTER_CALL_DELAY_MS);
  }

  // ── Merge with prior valid results if partial rerun ───────────────────────

  const rerunKeys = new Set(newResults.map((r) => `${r.modeId}::${r.scenarioId}`));
  const survivingPrior = priorResults.filter(
    (r) => r.cellValidity === "VALID" && !rerunKeys.has(`${r.modeId}::${r.scenarioId}`),
  );
  const allResults = [...survivingPrior, ...newResults];

  // ── Build final structured output ─────────────────────────────────────────

  const summary = buildSummary(allResults, model);

  const scenarioBlocks = SCENARIOS.map((scenario) => {
    const modeResults = POSTURE_MODES.map((mode) => {
      const result = allResults.find(
        (r) => r.modeId === mode.id && r.scenarioId === scenario.id,
      );
      return result ? buildCellReportBlock(result) : null;
    });

    const flagSummaryByMode: Record<string, string[]> = {};
    for (const cell of modeResults) {
      if (!cell) continue;
      const active = Object.entries(cell.flags as Record<string, boolean>)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (active.length > 0) flagSummaryByMode[cell.modeId] = active;
    }

    return {
      scenarioId: scenario.id,
      scenarioClass: scenario.scenarioClass,
      isControl: scenario.isControl,
      userPrompt: scenario.turns[scenario.turns.length - 1].rawText,
      modeResults,
      flagsRaisedByMode: flagSummaryByMode,
    };
  });

  const finalOutput = { packVersion: "3.3b", summary, scenarioBlocks };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2), "utf-8");

  // ── Print summary ─────────────────────────────────────────────────────────

  console.error(`\n[P33B] ══════════════ PACK 3.3b RUN COMPLETE ══════════════`);
  console.error(`[P33B] Total cells: ${summary.totalCells}`);
  console.error(`[P33B] Valid evidence: ${summary.validEvidence}`);
  console.error(`[P33B] Infra failures: ${summary.infraFailures}`);
  console.error(`[P33B] Posture-realization failures: ${summary.postureRealizationFailures}`);
  console.error(`[P33B] Posture mismatches: ${summary.postureMismatches}`);
  console.error(`[P33B] Output: ${OUTPUT_PATH}`);

  if (summary.postureRealizationFailures > 0) {
    console.error(`[P33B] ⚠ POSTURE_REALIZATION_FAILURE cells detected — check biasesObservedByRuntime in those cells.`);
  }
  if (summary.infraFailures > 0) {
    console.error(`[P33B] ⚠ INFRA_FAILURE cells detected — rerun with: npx tsx src/eval/runPack33PostureEval.ts --rerun-invalid`);
  }

  // Emit final JSON to stdout for piping
  console.log(JSON.stringify(finalOutput, null, 2));
}

main().catch((e) => {
  console.error("[P33B_FATAL]", e);
  process.exit(1);
});
