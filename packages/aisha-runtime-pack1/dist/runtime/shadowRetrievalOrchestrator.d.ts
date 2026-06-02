/**
 * Pack 3.12 — Shadow Retrieval Instrumentation
 *
 * SHADOW MODE ONLY. Not a live retrieval path.
 * Approved by Pack 3.11 Option D: shadow-mode promotion of both associative
 * retrieval and trace consumption, independently, feature-flag-gated, default OFF.
 *
 * Contract (non-negotiable per Pack 3.11 §9):
 *  - Does NOT modify bundle.activeNotes, bundle.contradictionEvidence,
 *    bundle.supportingEpisodes, or any generator-visible field.
 *  - Does NOT write to noteVersioning, turnStore, threadStore, or any persistent store.
 *  - Exceptions are silently swallowed and logged — never propagated.
 *  - Results are written only to the operator audit log (OperatorAuditEntry).
 *  - Hard latency gate: if either lane exceeds SHADOW_LATENCY_HARD_LIMIT_MS on
 *    three consecutive turns, that lane's flag is automatically disabled.
 *  - The two lanes are independent: their outputs are NEVER merged.
 */
import type { NoteRecord, NoteLinkRecord, TurnRecord, RetrievalBundle } from "../memory/types";
import type { OperatorAuditEntry } from "../memory/operatorAuditTrail";
/**
 * Read feature flags from process.env. Both default to OFF.
 * Never call this in a tight loop; read once per turn at the call site.
 */
export declare function readShadowFlags(): {
    associative: boolean;
    trace: boolean;
};
/** Pack 3.11 §9.4: auto-disable if exceeded on 3 consecutive turns. */
export declare const SHADOW_LATENCY_HARD_LIMIT_MS = 15;
export declare function isShadowAutoDisabled(lane: "associative" | "trace"): boolean;
/**
 * Record a latency sample for a lane. If the hard limit is exceeded on
 * SHADOW_CONSECUTIVE_LIMIT consecutive turns, the lane is auto-disabled.
 * Returns true if the lane was just auto-disabled.
 */
export declare function recordShadowLatency(lane: "associative" | "trace", latencyMs: number): boolean;
/**
 * Reset auto-disable state. Call only in tests.
 * Never call in production code.
 */
export declare function resetShadowAutoDisable(): void;
export interface ShadowAuditEntry {
    auditKind: "shadow_retrieval_research";
    lane: "associative" | "trace";
    sessionId: string;
    turnId: string;
    /** Number of notes in the finalized baseline retrieval bundle. */
    baselineNoteCount: number;
    /** Number of shadow-lane hits produced (not injected into bundle). */
    shadowHitCount: number;
    /**
     * Estimated token delta if the shadow hits were injected into the prompt.
     * Computed as: shadowHitCount × AVG_NOTE_TOKEN_COST (35 tokens per note).
     * Used to predict prompt budget impact for Pack 3.12 gate evidence.
     */
    estimatedTokenDelta: number;
    /** Wall-time latency of the shadow call in milliseconds. */
    latencyMs: number;
    /**
     * Fraction of shadow hits that match notes already flagged as needs_review.
     * Available as a proxy for review disambiguation usefulness.
     */
    reviewDisambiguationEstimate: number;
    /**
     * Fraction of shadow hits that are from a different episode than any baseline note.
     * Available for cross-episode diversity measurement.
     */
    crossEpisodeDiversityEstimate: number;
    /** Whether the lane was auto-disabled on this turn (latency limit exceeded). */
    autoDisabledThisTurn: boolean;
}
/**
 * Run the associative retrieval shadow lane.
 * Returns null if the lane is disabled or throws any error.
 * NEVER modifies the retrieval bundle.
 */
export declare function runAssociativeShadow(params: {
    retrieval: RetrievalBundle;
    allLinks: NoteLinkRecord[];
    eligibleNotes: NoteRecord[];
    sessionId: string;
    turnId: string;
}): Promise<ShadowAuditEntry | null>;
/**
 * Run the trace consumption shadow lane.
 * Returns null if the lane is disabled or throws any error.
 * NEVER modifies the retrieval bundle.
 */
export declare function runTraceShadow(params: {
    retrieval: RetrievalBundle;
    recentTurns: TurnRecord[];
    sessionId: string;
    turnId: string;
}): Promise<ShadowAuditEntry | null>;
/**
 * Convert a ShadowAuditEntry into an OperatorAuditEntry for Pack 3.8 log
 * compatibility. The canonicalText field carries the JSON-serialized shadow
 * audit data so it is fully machine-readable.
 */
export declare function shadowAuditToOperatorEntry(shadow: ShadowAuditEntry): OperatorAuditEntry;
