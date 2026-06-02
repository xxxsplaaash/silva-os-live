import { NoteRecord, TurnRecord } from "./types";
export type PersistedReviewReason = "retrieved_weak_stale_note" | "contradiction_sensitive_lower_support" | "soft_signal_increment";
export interface PersistedReviewSignal {
    noteId: string;
    reason: PersistedReviewReason;
}
export declare const MAX_RECONSOLIDATION_SIGNALS_PER_TURN = 2;
/**
 * Pack 4.2: Soft reconsolidation signals are only escalated to `needs_review`
 * after this many consecutive qualifying retrievals. Below this threshold,
 * the signal is recorded as `soft_signal_increment` (count-only, no escalation).
 */
export declare const SOFT_SIGNAL_ESCALATION_THRESHOLD = 2;
export declare function reviewRetrievedActiveNotes(input: {
    currentTurn: TurnRecord;
    activeNotes: NoteRecord[];
}): NoteRecord[];
export declare function derivePersistedReviewSignals(input: {
    currentTurn: TurnRecord;
    activeNotes: NoteRecord[];
}): PersistedReviewSignal[];
export declare function deriveRetrievalReviewSignals(input: {
    currentTurn: TurnRecord;
    activeNotes: NoteRecord[];
}): PersistedReviewSignal[];
/**
 * Pack 4.2: Frequency-gated version of deriveRetrievalReviewSignals.
 *
 * If a note qualifies for a soft signal (retrieved_weak_stale_note):
 * - If (reconsolidationSignalCount + 1) < SOFT_SIGNAL_ESCALATION_THRESHOLD:
 *   emits `soft_signal_increment` (count-only; no `needs_review` escalation).
 * - If (reconsolidationSignalCount + 1) >= SOFT_SIGNAL_ESCALATION_THRESHOLD:
 *   emits `retrieved_weak_stale_note` (full escalation).
 *
 * Contradiction signals are handled separately and bypass frequency gating entirely.
 */
export declare function deriveGatedRetrievalSignals(input: {
    currentTurn: TurnRecord;
    activeNotes: NoteRecord[];
}): PersistedReviewSignal[];
/**
 * Unified signal budget enforcer.
 * Contradiction signals take priority and bypass frequency gating.
 * Soft/stale signals are frequency-gated via deriveGatedRetrievalSignals (Pack 4.2).
 * Combined total never exceeds MAX_RECONSOLIDATION_SIGNALS_PER_TURN.
 */
export declare function deriveCombinedReviewSignals(input: {
    currentTurn: TurnRecord;
    activeNotes: NoteRecord[];
}): PersistedReviewSignal[];
export declare function tightenContradictionEvidenceLinkage(input: {
    activeNotes: NoteRecord[];
    contradictionEvidence: NoteRecord[];
}): NoteRecord[];
