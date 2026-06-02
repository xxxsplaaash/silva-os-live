/**
 * Pack 3.8 — Operator Audit Trail
 *
 * A standalone, machine-readable audit record for every note lifecycle decision.
 * Separate from the embedded NoteRecord.auditTrail (which is a compact per-note
 * event log). This record is intended for operator review dashboards and offline
 * audit pipelines.
 *
 * Pure data. No I/O. No runtime dependencies.
 */
export type OperatorAuditOutcome = "accepted" | "rejected" | "needs_review" | "superseded" | "reinforced";
export type OperatorAuditReasonCode = "relationship_trust_accepted" | "default_pending" | "relationship_trust_gated" | "relationship_caution_gated" | "contradiction_needs_review" | "relationship_trust_rejected" | "weakly_grounded_rejected" | "superseded_prior_note" | "reinforced_existing_note";
export interface OperatorAuditSignals {
    /** Relationship trust at time of extraction. Range: -1.0 to 1.0. */
    trust: number;
    /** Relationship caution at time of extraction. Range: 0.0 to 1.0. */
    caution: number;
    /** Candidate note confidence at extraction. Range: 0.0 to 1.0. */
    confidence: number;
    /** Whether a prior active conflicting note existed. */
    hasContradiction: boolean;
    /** Number of prior active conflicting notes found. */
    contradictionCount: number;
}
export interface OperatorAuditSupersessionLink {
    /** ID of the note that was superseded or disputed. */
    priorNoteId: string;
    /** Canonical text of the superseded note. */
    priorCanonicalText: string;
    /** New status assigned to the prior note. */
    priorNewStatus: "superseded" | "disputed";
}
export interface OperatorAuditEntry {
    /** Monotonically increasing identifier for this audit event. */
    auditId: string;
    /** ISO 8601 timestamp — set by caller so it remains pure/deterministic in tests. */
    timestamp: string;
    /** The resulting note's ID (or the reinforced/superseded note's ID). */
    noteId: string;
    /** Candidate's subtype. */
    subtype: string;
    /** Candidate's canonical text. */
    canonicalText: string;
    /** The decision reached. */
    outcome: OperatorAuditOutcome;
    /** Primary machine-readable reason for the outcome. */
    primaryReason: OperatorAuditReasonCode;
    /** All contributing reasons (may be >1). */
    allReasons: OperatorAuditReasonCode[];
    /** The quantitative signals that drove the decision. */
    signals: OperatorAuditSignals;
    /** Populated when outcome is "superseded" or the new note caused supersession. */
    supersessionLinks?: OperatorAuditSupersessionLink[];
}
export interface OperatorAuditLog {
    sessionId?: string;
    entries: OperatorAuditEntry[];
}
export declare function makeAuditId(): string;
/**
 * Resets the audit ID sequence. Call this in tests to get deterministic IDs.
 * Never call this in production code.
 */
export declare function resetAuditSequence(): void;
/**
 * Build an OperatorAuditEntry for a new note acceptance/rejection/gating decision.
 */
export declare function buildAcceptanceAuditEntry(params: {
    auditId: string;
    timestamp: string;
    noteId: string;
    subtype: string;
    canonicalText: string;
    outcome: OperatorAuditOutcome;
    primaryReason: OperatorAuditReasonCode;
    allReasons: OperatorAuditReasonCode[];
    signals: OperatorAuditSignals;
    supersessionLinks?: OperatorAuditSupersessionLink[];
}): OperatorAuditEntry;
/**
 * Build an OperatorAuditEntry for a superseded prior note.
 * Records the link back to the new note that caused supersession.
 */
export declare function buildSupersessionAuditEntry(params: {
    auditId: string;
    timestamp: string;
    priorNoteId: string;
    priorCanonicalText: string;
    priorNewStatus: "superseded" | "disputed";
    causedByNoteId: string;
    signals: OperatorAuditSignals;
}): OperatorAuditEntry;
/**
 * Render an OperatorAuditEntry as a compact single-line markdown list item
 * for operator dashboards and export manifests.
 */
export declare function renderAuditEntryMarkdown(entry: OperatorAuditEntry): string;
/**
 * Export an entire OperatorAuditLog as a markdown section.
 */
export declare function renderAuditLogMarkdown(log: OperatorAuditLog): string;
