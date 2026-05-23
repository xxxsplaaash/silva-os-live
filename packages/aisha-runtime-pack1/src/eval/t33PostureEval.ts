/**
 * T33 Response Posture Eval — Pack 3.3b (patch over Pack 3.3)
 *
 * Changes from Pack 3.3:
 *   - Captures biasesObservedByRuntime before each turn (diagnostic: did biases form?)
 *   - Captures realizedIntent from kPositionAblation (new field in geminiGeneratorAdapter)
 *   - Adds CellValidity classification: VALID / INFRA_FAILURE / POSTURE_REALIZATION_FAILURE / POSTURE_MISMATCH
 *   - Each cell records its validity status and reason code
 *
 * Evaluation is side-by-side raw evidence. No judge logic.
 */

import { KPositionStore, MIN_SESSION_GATE } from "../memory/kPositionStore";
import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { processTurn } from "../runtime/processTurn";
import { TurnInput } from "../runtime/runtime_types";
import { GeminiGeneratorAdapter } from "../generation/geminiGeneratorAdapter";
import { ProductionParser } from "../runtime/productionParser";

// ─── Posture Mode Definitions ────────────────────────────────────────────────

export type PostureModeId =
  | "PURE_A"
  | "COMPRESSED_B"
  | "FULL_B"
  | "EXPLORATION_EXPAND"
  | "AB_HYBRID";

export interface PostureModeBiasConfig {
  communication_pace?: number;
  detail_tolerance?: number;
  task_structure_preference?: number;
}

export interface PostureMode {
  id: PostureModeId;
  label: string;
  description: string;
  biases: PostureModeBiasConfig;
  /** Directives we expect applyKPositionShaping to produce if biases form correctly. */
  expectedDirectives: string[];
  expectedIntent: "normal" | "direct_answer" | "question_forward";
}

export const POSTURE_MODES: PostureMode[] = [
  {
    id: "PURE_A",
    label: "Pure A",
    description: "Baseline — no K_position biases, normal intent, no injected directives.",
    biases: {},
    expectedDirectives: [],
    expectedIntent: "normal",
  },
  {
    id: "COMPRESSED_B",
    label: "Compressed B",
    description: "direct_answer intent + concise directive. No granular structure.",
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
    description: "direct_answer intent + granular structure + concise directive.",
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
  {
    id: "EXPLORATION_EXPAND",
    label: "Exploration Expand",
    description: "question_forward intent + deepening directive.",
    biases: {
      communication_pace: -0.9,
      detail_tolerance: 0.9,
    },
    expectedDirectives: [
      "communication_pace:normal→question_forward",
      "detail_tolerance:+deepening_directive",
    ],
    expectedIntent: "question_forward",
  },
  {
    id: "AB_HYBRID",
    label: "A/B Hybrid",
    description: "normal intent + granular structure directive. Pace and depth remain neutral.",
    biases: {
      task_structure_preference: 0.9,
    },
    expectedDirectives: ["task_structure_preference:+granular_directive"],
    expectedIntent: "normal",
  },
];

// ─── Scenario Definitions ────────────────────────────────────────────────────

export interface PostureScenario {
  id: string;
  scenarioClass: string;
  description: string;
  isControl: boolean;
  turns: TurnInput[];
}

export const SCENARIOS: PostureScenario[] = [
  {
    id: "P33_S1_FRUSTRATION_BLOCKED",
    scenarioClass: "frustration + blocked action",
    description:
      "User is stuck on a build error and expressing escalating annoyance. Tests whether posture suppresses frustration or provides actionable relief.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s1",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "My TypeScript build has been failing for 45 minutes with the same 'Cannot find module' error and I have tried everything. What is actually wrong?",
      },
    ],
  },
  {
    id: "P33_S2_BREADTH_IDEATION",
    scenarioClass: "breadth-heavy ideation",
    description:
      "User asks for wide brainstorming on a large conceptual project. Tests whether posture over-structures creative exploration or enables it.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s2",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "I am starting a new studio and want to think about what kinds of AI tools I could build for creative professionals. Give me as many directions as you can.",
      },
    ],
  },
  {
    id: "P33_S3_OVERWHELM_FIRST_STEP",
    scenarioClass: "overwhelm + first-step request",
    description:
      "User is drowning in tasks and explicitly asks for only one concrete starting point. Tests whether posture actually delivers a single step or spirals into excessive planning.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s3",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "I have 40 tasks due this week, three fires, and I cannot think straight. Do not give me a system, do not give me a list. Just tell me the one thing I should do right now.",
      },
    ],
  },
  {
    id: "P33_S4_URGENT_TECHNICAL",
    scenarioClass: "urgent technical query",
    description:
      "User needs a specific command or fix immediately for a production outage. Tests whether posture delivers precision fast without bloat.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s4",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "Our production API is returning 502s. Nginx logs show upstream timed out. Our Node service is running. What is the exact command to check if the Node port is bound and accepting connections?",
      },
    ],
  },
  {
    id: "P33_S5_PRECISION_FACTUAL",
    scenarioClass: "precision factual query",
    description:
      "User asks a narrow factual question with a precise answer. Tests whether posture over-explains a simple fact or delivers it cleanly.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s5",
        speaker: "user",
        sourceModality: "text",
        rawText: "What year did the Berlin Wall fall?",
      },
    ],
  },
  {
    id: "P33_S6_RESISTANT_ANTI_THERAPY",
    scenarioClass: "resistant / anti-therapy user",
    description:
      "User explicitly rejects emotional reflection and therapy-style engagement. Tests whether posture respects the stated preference or still leaks warmth framing.",
    isControl: false,
    turns: [
      {
        sessionId: "p33_s6",
        speaker: "user",
        sourceModality: "text",
        rawText:
          "I do not want to talk about my feelings or 'process' anything. I just need to know if my plan is solid or not. Here it is: I am quitting my job next month without a backup offer. Is that stupid?",
      },
    ],
  },
  {
    id: "P33_S7_CALIBRATION_CONTROL",
    scenarioClass: "calibration / control",
    description:
      "MANDATORY CONTROL. Neutral, standard conversational query. All modes should produce comparable, non-warped output. Deviation indicates posture overreach.",
    isControl: true,
    turns: [
      {
        sessionId: "p33_s7",
        speaker: "user",
        sourceModality: "text",
        rawText: "What is a good way to stay focused while working from home?",
      },
    ],
  },
];

// ─── Structural Metrics ───────────────────────────────────────────────────────

export interface StructuralMetrics {
  wordCount: number;
  sentenceCount: number;
  questionCount: number;
}

export function computeStructuralMetrics(text: string): StructuralMetrics {
  const trimmed = text.trim();
  const wordCount = trimmed === "" ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
  const sentenceCount =
    trimmed === "" ? 0 : (trimmed.match(/[.!?](?:\s|$)/g) ?? []).length || 1;
  const questionCount = (trimmed.match(/\?/g) ?? []).length;
  return { wordCount, sentenceCount, questionCount };
}

// ─── Overreach / Failure Flags ────────────────────────────────────────────────

export interface OverreachFlags {
  therapySpeakLeakage: boolean;
  unnecessaryEmotionalReflection: boolean;
  refusalOrEvasiveness: boolean;
  overCompression: boolean;
  exploratoryBloat: boolean;
  structuralOverformattingInNeutralCase: boolean;
}

const THERAPY_SPEAK_TOKENS = [
  "i hear you",
  "it's understandable",
  "it is understandable",
  "your feelings",
  "feel seen",
  "that must be",
  "i can imagine how",
  "it makes sense that you",
  "validate",
  "hold space",
  "processing",
];

const REFUSAL_TOKENS = [
  "i can't help",
  "i cannot help",
  "i'm not able to",
  "i am not able to",
  "i want to be careful here",
  "couldn't safely complete",
  "could not safely complete",
  "stub response to:",
  "please restate",
];

const EMOTIONAL_REFLECTION_TOKENS = [
  "it sounds like you",
  "it seems like you",
  "you might be feeling",
  "you seem to be",
  "notice that you",
  "reflect on",
  "pause and think about how you feel",
];

export function computeOverreachFlags(
  text: string,
  scenarioClass: string,
): OverreachFlags {
  const lower = text.toLowerCase();
  const metrics = computeStructuralMetrics(text);

  const therapySpeakLeakage = THERAPY_SPEAK_TOKENS.some((t) => lower.includes(t));
  const unnecessaryEmotionalReflection = EMOTIONAL_REFLECTION_TOKENS.some((t) => lower.includes(t));
  const refusalOrEvasiveness = REFUSAL_TOKENS.some((t) => lower.includes(t));

  const isNeutralOrFactual =
    scenarioClass === "precision factual query" ||
    scenarioClass === "calibration / control";
  const overCompression = !isNeutralOrFactual && metrics.wordCount < 5;

  const specificAnswerExpected =
    scenarioClass === "urgent technical query" ||
    scenarioClass === "precision factual query" ||
    scenarioClass === "overwhelm + first-step request";
  const exploratoryBloat = specificAnswerExpected && metrics.questionCount > 3;

  const isNeutralCase =
    scenarioClass === "calibration / control" ||
    scenarioClass === "precision factual query";
  const hasLists = /^\s*[\d]+\.\s+/m.test(text) || /^\s*[-•*]\s+/m.test(text);
  const structuralOverformattingInNeutralCase = isNeutralCase && hasLists;

  return {
    therapySpeakLeakage,
    unnecessaryEmotionalReflection,
    refusalOrEvasiveness,
    overCompression,
    exploratoryBloat,
    structuralOverformattingInNeutralCase,
  };
}

// ─── Cell Validity Classification — Pack 3.3b ────────────────────────────────

/**
 * VALID: generation succeeded, biases formed (if applicable), realized posture matches intent.
 * INFRA_FAILURE: API error, quota, timeout, or fallback handler fired.
 * POSTURE_REALIZATION_FAILURE: generation succeeded but shaping did not fire or biases did not form.
 * POSTURE_MISMATCH: shaping fired, but realized intent contradicts the intended posture mode.
 */
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

  // 1. Infra failure: any non-success API state
  if (apiStatus !== "success") {
    return {
      validity: "INFRA_FAILURE",
      invalidReason: apiErrorMessage ?? "api_status_not_success",
    };
  }

  // 2. Pure A has no biases — it's valid as long as no shaping fired
  if (mode.id === "PURE_A") {
    if (appliedShapingDirectives.length > 0) {
      return {
        validity: "POSTURE_MISMATCH",
        invalidReason: `pure_a_but_shaping_fired: ${appliedShapingDirectives.join(",")}`,
      };
    }
    return { validity: "VALID", invalidReason: null };
  }

  // 3. Biases did not form: runtime returned no biases despite the store being loaded
  if (biasesObservedByRuntime.length === 0) {
    return {
      validity: "POSTURE_REALIZATION_FAILURE",
      invalidReason: "biases_not_formed_in_runtime",
    };
  }

  // 4. Shaping did not fire: biases were present but no directives applied
  if (appliedShapingDirectives.length === 0) {
    return {
      validity: "POSTURE_REALIZATION_FAILURE",
      invalidReason: "biases_present_but_shaping_did_not_fire",
    };
  }

  // 5. Intent mismatch: the realized intent contradicts the expected intent
  if (realizedIntent !== null && realizedIntent !== mode.expectedIntent) {
    return {
      validity: "POSTURE_MISMATCH",
      invalidReason: `intent_mismatch: expected=${mode.expectedIntent} realized=${realizedIntent}`,
    };
  }

  // 6. Missing realized posture metadata: shaping fired but realizedIntent not captured
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
  scenarioClass: string;
  isControl: boolean;
  rawText: string;
  /** Biases the runtime read from the store before running the turn (diagnostic: did formation work?) */
  biasesObservedByRuntime: ObservedBias[];
  appliedShapingDirectives: string[];
  realizedIntent: string | null;
  kPositionBiasesUsed: PostureModeBiasConfig;
  apiStatus: "success" | "failed" | "fallback";
  apiErrorMessage: string | null;
  latencyMs: number | null;
  metrics: StructuralMetrics;
  flags: OverreachFlags;
  /** Pack 3.3b: explicit cell validity classification */
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
          sessionId: `p33_sess_${i}`,
          episodeId: "ep_1",
          observedAt: "2026-01-15T10:00:00Z",
          description: `p33_evidence_${i}_${domain}`,
        },
        biasDelta: delta,
      });
    }
  }
}

// ─── Single mode/scenario runner ─────────────────────────────────────────────

export async function runPostureModeOnScenario(
  mode: PostureMode,
  scenario: PostureScenario,
  generator: any,
): Promise<ModeRunResult> {
  const store = new KPositionStore();
  loadBiasesIntoStore(store, mode.biases);

  // Pack 3.3b: capture what the runtime would read from the store BEFORE the turn.
  // This is the key diagnostic: if this is empty despite loading biases, formation failed.
  const biasesObservedByRuntime: ObservedBias[] = Object.keys(mode.biases).length > 0
    ? (store.getDirectionalBiases({ turnId: "p33_preflight" }) as ObservedBias[])
    : [];

  console.error(
    `[P33B_PREFLIGHT] mode=${mode.id} scenario=${scenario.id} biasesObservedByRuntime=${biasesObservedByRuntime.length} domains=[${biasesObservedByRuntime.map(b => `${b.domain}:${b.bias.toFixed(2)}@${b.confidence.toFixed(2)}`).join(",")}]`,
  );

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

  const metrics = computeStructuralMetrics(text);
  const flags = computeOverreachFlags(text, scenario.scenarioClass);

  const { validity: cellValidity, invalidReason: cellInvalidReason } = classifyCell({
    mode,
    apiStatus,
    apiErrorMessage,
    biasesObservedByRuntime,
    appliedShapingDirectives: appliedDirectives,
    realizedIntent,
  });

  console.error(
    `[P33B_RESULT] mode=${mode.id} scenario=${scenario.id} apiStatus=${apiStatus} cellValidity=${cellValidity} realizedIntent=${realizedIntent ?? "null"} directives=[${appliedDirectives.join(",")}] words=${metrics.wordCount}${cellInvalidReason ? ` invalidReason=${cellInvalidReason}` : ""}`,
  );

  return {
    modeId: mode.id,
    modeLabel: mode.label,
    scenarioId: scenario.id,
    scenarioClass: scenario.scenarioClass,
    isControl: scenario.isControl,
    rawText: text,
    biasesObservedByRuntime,
    appliedShapingDirectives: appliedDirectives,
    realizedIntent,
    kPositionBiasesUsed: mode.biases,
    apiStatus,
    apiErrorMessage,
    latencyMs,
    metrics,
    flags,
    cellValidity,
    cellInvalidReason,
  };
}
