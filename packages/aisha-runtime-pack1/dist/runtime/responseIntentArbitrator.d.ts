import type { StateSnapshotRecord, TurnRecord } from "../memory/types";
export type ResponseIntent = "normal" | "direct_answer" | "clarify" | "narrow_claim" | "question_forward" | "minimal";
export interface ResponseIntentDecision {
    intent: ResponseIntent;
    reasons: string[];
}
export declare function arbitrateResponseIntent(input: {
    turn: TurnRecord;
    snapshot: StateSnapshotRecord;
}): ResponseIntentDecision;
