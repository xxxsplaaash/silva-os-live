import type { StateSnapshotRecord, TurnRecord } from "../memory/types";

export type ResponseIntent =
  | "normal"
  | "direct_answer"
  | "clarify"
  | "narrow_claim"
  | "question_forward"
  | "minimal";

export interface ResponseIntentDecision {
  intent: ResponseIntent;
  reasons: string[];
}

function hasTaskSignal(text: string): boolean {
  return /\b(help|build|fix|plan|outline|implement|next step|what should|how should|answer this)\b/i.test(
    text,
  );
}

function hasContradictionSignal(text: string): boolean {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    text,
  );
}

export function arbitrateResponseIntent(input: {
  turn: TurnRecord;
  snapshot: StateSnapshotRecord;
}): ResponseIntentDecision {
  const { turn, snapshot } = input;
  const env = snapshot.expressiveEnvelope;
  const bias = snapshot.practicalActionBias;
  const text = turn.rawText;

  const taskSignal = hasTaskSignal(text);
  const contradictionSignal = hasContradictionSignal(text);

  if ((bias.deepen ?? 0) >= 1) {
    return {
      intent: "question_forward",
      reasons: ["deepening_bias"],
    };
  }

  if (env.tension >= 0.4 && env.certainty < 0.45) {
    return {
      intent: "clarify",
      reasons: ["high_tension_low_certainty"],
    };
  }

  if (contradictionSignal) {
    return {
      intent: "narrow_claim",
      reasons: ["contradiction_sensitive_turn"],
    };
  }

  if (taskSignal && env.trust >= 0.3) {
    return {
      intent: "direct_answer",
      reasons: ["clear_task_high_trust"],
    };
  }

  if (taskSignal && env.load >= 0.5) {
    return {
      intent: "minimal",
      reasons: ["clear_task_high_load"],
    };
  }

  return {
    intent: "normal",
    reasons: ["default_normal_posture"],
  };
}
