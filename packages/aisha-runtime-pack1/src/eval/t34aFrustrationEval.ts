/**
 * T34a Frustration Subtype Eval — Pack 3.4a
 *
 * Splits the "frustration + blocked action" class into 4 testable subtypes
 * to isolate the root cause of the narrow_claim collapse under shaped modes.
 */

import { KPositionStore, MIN_SESSION_GATE } from "../memory/kPositionStore";
import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { processTurn } from "../runtime/processTurn";
import { TurnInput } from "../runtime/runtime_types";
import { ProductionParser } from "../runtime/productionParser";

// ─── Posture Mode Definitions ────────────────────────────────────────────────

export type PostureModeId = "PURE_A" | "COMPRESSED_B" | "FULL_B";

export interface PostureModeBiasConfig {
  communication_pace?: number;
  detail_tolerance?: number;
  task_structure_preference?: number;
}

export interface PostureMode {
  id: PostureModeId;
  label: string;
  biases: PostureModeBiasConfig;
  expectedDirectives: string[];
  expectedIntent: "normal" | "direct_answer" | "question_forward";
}

export const TARGETED_MODES: PostureMode[] = [
  {
    id: "PURE_A",
    label: "Pure A",
    biases: {},
    expectedDirectives: [],
    expectedIntent: "normal",
  },
  {
    id: "COMPRESSED_B",
    label: "Compressed B",
    biases: {
      communication_pace: 0.9,
      detail_tolerance: -0.9,
    },
    expectedDirectives: [
      "communication_pace:normal→direct_answer",
      "detail_tolerance:+concise_directive",
    ],
    expectedIntent: "direct_answer",
  },
  {
    id: "FULL_B",
    label: "Full B",
    biases: {
      communication_pace: 0.9,
      task_structure_preference: 0.9,
      detail_tolerance: -0.9,
    },
    expectedDirectives: [
      "communication_pace:normal→direct_answer",
      "task_structure_preference:+granular_directive",
      "detail_tolerance:+concise_directive",
    ],
    expectedIntent: "direct_answer",
  },
];

// ─── Scenario Definitions ────────────────────────────────────────────────────

export interface PostureScenario {
  id: string;
  subtypeClass: string;
  turns: TurnInput[];
}

export const FRUSTRATION_SUBTYPES: PostureScenario[] = [
  {
    id: "P34A_S1_DIAGNOSTIC",
    subtypeClass: "diagnostic frustration",
    turns: [
      {
        sessionId: "p34a_s1",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "My build has been failing for 45 minutes with a 'module not found' error. I am losing my mind. Stop giving me fixes and just explain why this keeps happening.",
      },
    ],
  },
  {
    id: "P34A_S2_EXECUTION",
    subtypeClass: "execution frustration",
    turns: [
      {
        sessionId: "p34a_s2",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "I am trying to run the migrations. I followed the steps. Step 3 threw a connection timeout. What is the exact next command I need to type?",
      },
    ],
  },
  {
    id: "P34A_S3_JUST_FIX_IT",
    subtypeClass: "'just fix it' frustration",
    turns: [
      {
        sessionId: "p34a_s3",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "This regex is completely broken and nothing is matching. I'm done trying to understand it. Give me the exact working string, nothing else.",
      },
    ],
  },
  {
    id: "P34A_S4_BLOCKED_UNCERTAIN",
    subtypeClass: "blocked-but-uncertain frustration",
    turns: [
      {
        sessionId: "p34a_s4",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "Everything I touch in this codebase breaks. I'm so frustrated I want to quit. I don't even know where to look to find the problem.",
      },
    ],
  },
];

// ─── Cell Validity Classification ────────────────────────────────

export type CellValidity =
  | "VALID"
  | "INFRA_FAILURE"
  | "POSTURE_REALIZATION_FAILURE"
  | "POSTURE_MISMATCH";

export interface ObservedBias {
  domain: string;
  bias: number;
  confidence: number;
}

function classifyCell(input: {
  mode: PostureMode;
  apiStatus: ModeRunResult["apiStatus"];
  apiErrorMessage: string | null;
  biasesObservedByRuntime: ObservedBias[];
  appliedShapingDirectives: string[];
  realizedIntent: string | null;
}): { validity: CellValidity; invalidReason: string | null } {
  const { mode, apiStatus, apiErrorMessage, biasesObservedByRuntime, appliedShapingDirectives, realizedIntent } = input;

  if (apiStatus !== "success") {
    return {
      validity: "INFRA_FAILURE",
      invalidReason: apiErrorMessage ?? "api_status_not_success",
    };
  }

  if (mode.id === "PURE_A") {
    if (appliedShapingDirectives.length > 0) {
      return {
        validity: "POSTURE_MISMATCH",
        invalidReason: `pure_a_but_shaping_fired: ${appliedShapingDirectives.join(",")}`,
      };
    }
    return { validity: "VALID", invalidReason: null };
  }

  if (biasesObservedByRuntime.length === 0) {
    return {
      validity: "POSTURE_REALIZATION_FAILURE",
      invalidReason: "biases_not_formed_in_runtime",
    };
  }

  if (appliedShapingDirectives.length === 0) {
    return {
      validity: "POSTURE_REALIZATION_FAILURE",
      invalidReason: "biases_present_but_shaping_did_not_fire",
    };
  }

  if (realizedIntent !== null && realizedIntent !== mode.expectedIntent) {
    return {
      validity: "POSTURE_MISMATCH",
      invalidReason: `intent_mismatch: expected=${mode.expectedIntent} realized=${realizedIntent}`,
    };
  }

  if (realizedIntent === null) {
    return {
      validity: "POSTURE_REALIZATION_FAILURE",
      invalidReason: "realized_intent_not_captured_in_metadata",
    };
  }

  return { validity: "VALID", invalidReason: null };
}

// ─── Per-Mode Run Result ──────────────────────────────────────────────────────

export interface ModeRunResult {
  modeId: PostureModeId;
  modeLabel: string;
  scenarioId: string;
  subtypeClass: string;
  rawText: string;
  biasesObservedByRuntime: ObservedBias[];
  appliedShapingDirectives: string[];
  realizedIntent: string | null;
  kPositionBiasesUsed: PostureModeBiasConfig;
  apiStatus: "success" | "failed" | "fallback";
  apiErrorMessage: string | null;
  latencyMs: number | null;
  cellValidity: CellValidity;
  cellInvalidReason: string | null;
}

// ─── Bias loader ──────────────────────────────────────────────────────────────

function loadBiasesIntoStore(
  store: KPositionStore,
  biases: PostureModeBiasConfig,
) {
  const domains = Object.keys(biases) as Array<keyof PostureModeBiasConfig>;
  for (const domain of domains) {
    const delta = biases[domain]!;
    for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
      store.recordEvidence({
        domain: domain as any,
        evidence: {
          kind: "observed_behavior",
          sessionId: `p34a_sess_${i}`,
          episodeId: "ep_1",
          observedAt: "2026-01-15T10:00:00Z",
          description: `p34a_evidence_${i}_${domain}`,
        },
        biasDelta: delta,
      });
    }
  }
}

// ─── Single mode/scenario runner ─────────────────────────────────────────────

export async function runFrustrationEvalScenario(
  mode: PostureMode,
  scenario: PostureScenario,
  generator: any,
): Promise<ModeRunResult> {
  const store = new KPositionStore();
  loadBiasesIntoStore(store, mode.biases);

  const biasesObservedByRuntime: ObservedBias[] = Object.keys(mode.biases).length > 0
    ? (store.getDirectionalBiases({ turnId: "p34a_preflight" }) as ObservedBias[])
    : [];

  const factory = new InMemoryScenarioEnvironmentFactory({
    kPositionStore: Object.keys(mode.biases).length > 0 ? store : undefined,
    generator,
    parser: new ProductionParser(),
  });
  const env = await factory.create();

  let text = "";
  let appliedDirectives: string[] = [];
  let realizedIntent: string | null = null;
  let apiStatus: ModeRunResult["apiStatus"] = "failed";
  let apiErrorMessage: string | null = null;
  let latencyMs: number | null = null;
  let lastRes: any = null;

  const start = Date.now();
  try {
    for (const turn of scenario.turns) {
      // In Pack 3.4, PostureRouter vetos shaped modes if tension > 0.4.
      // However, processTurn falls back to KPositionStore if router returns PURE_A.
      // So these store-loaded biases will still be injected into the generator.
      lastRes = await processTurn(env.deps, turn);
      text = lastRes.text ?? "";
    }
    latencyMs = Date.now() - start;

    const events: any[] = lastRes?.trace?.events ?? [];
    const genEvent = events.find((e: any) => e.stage === "generation.completed");
    const ablation = genEvent?.data?.generatorMetadata?.kPositionAblation;

    if (ablation) {
      appliedDirectives = ablation.adjustmentsApplied ?? [];
      realizedIntent = ablation.realizedIntent ?? null;
    }

    const fallbackReason = lastRes?.fallbackReason;
    if (fallbackReason && fallbackReason !== "not_invoked") {
      apiStatus = "fallback";
      apiErrorMessage = fallbackReason;
    } else if (genEvent) {
      apiStatus = "success";
    } else {
      apiStatus = "failed";
      apiErrorMessage = lastRes?.trace?.failureReason ?? "generation_event_missing";
    }
  } catch (err: any) {
    latencyMs = Date.now() - start;
    apiStatus = "failed";
    apiErrorMessage = err?.message ?? String(err);
    text = "";
  }

  const { validity: cellValidity, invalidReason: cellInvalidReason } = classifyCell({
    mode,
    apiStatus,
    apiErrorMessage,
    biasesObservedByRuntime,
    appliedShapingDirectives: appliedDirectives,
    realizedIntent,
  });

  console.error(
    `[P34A_RESULT] mode=${mode.id} subtype=${scenario.id} validity=${cellValidity} intent=${realizedIntent ?? "null"} directives=[${appliedDirectives.join(",")}]`,
  );

  return {
    modeId: mode.id,
    modeLabel: mode.label,
    scenarioId: scenario.id,
    subtypeClass: scenario.subtypeClass,
    rawText: text,
    biasesObservedByRuntime,
    appliedShapingDirectives: appliedDirectives,
    realizedIntent,
    kPositionBiasesUsed: mode.biases,
    apiStatus,
    apiErrorMessage,
    latencyMs,
    cellValidity,
    cellInvalidReason,
  };
}
