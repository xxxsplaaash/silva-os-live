import type {
  IFallbackHandler,
  FallbackResult,
  TurnInput,
} from "../runtime/runtime_types";

function contradictionSensitive(text: string): boolean {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    text,
  );
}

/**
 * Deterministic Pack 1 fallback handler.
 *
 * Goals:
 * - cautious
 * - grounded
 * - no invented memory
 * - no fake confidence
 */
export class CautiousFallbackHandler implements IFallbackHandler {
  async build(input: {
    turn: TurnInput;
    reason: string;
    error?: unknown;
  }): Promise<FallbackResult> {
    if (contradictionSensitive(input.turn.rawText)) {
      return {
        text: "I want to be careful here because the details may have changed. Please restate the current fact in one sentence.",
        reason: input.reason,
      };
    }

    return {
      text: "I want to be careful here, so I couldn't safely complete that response. Please restate the request in one concrete sentence.",
      reason: input.reason,
    };
  }
}

