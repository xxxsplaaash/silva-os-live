import type { IFallbackHandler, FallbackResult, TurnInput } from "../runtime/runtime_types";
/**
 * Deterministic Pack 1 fallback handler.
 *
 * Goals:
 * - cautious
 * - grounded
 * - no invented memory
 * - no fake confidence
 */
export declare class CautiousFallbackHandler implements IFallbackHandler {
    build(input: {
        turn: TurnInput;
        reason: string;
        error?: unknown;
    }): Promise<FallbackResult>;
}
