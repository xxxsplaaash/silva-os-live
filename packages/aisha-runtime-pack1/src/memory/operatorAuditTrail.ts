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

// ─── Decision Outcome ─────────────────────────────────────────────────────────

export type OperatorAuditOutcome =
  | "accepted"          // auto-accepted: high trust, no contradiction, confident
  | "rejected"          // auto-rejected: very low trust or weak confidence
  | "needs_review"      // soft-gated: moderate trust/caution issue or contradiction
  | "superseded"        // an existing note was superseded by this new candidate
  | "reinforced";       // same-meaning candidate reinforced an existing note

// ─── Reason Codes ────────────────────────────────────────────────────────────

export type OperatorAuditReasonCode =
  // Acceptance
  | "relationship_trust_accepted"         // trust >= 0.8
  | "default_pending"                     // trust in [0, 0.8), no contradiction
  // Gating → needs_review
  | "relationship_trust_gated"            // trust < 0, not rejected
  | "relationship_caution_gated"          // caution > 0.7
  | "contradiction_needs_review"          // prior active conflict detected
  // Rejection
  | "relationship_trust_rejected"         // trust <= -0.6
  | "weakly_grounded_rejected"            // confidence < 0.65
  // Supersession linkage
  | "superseded_prior_note"               // the noted prior was transitioned
  // Reinforce
  | "reinforced_existing_note";           // same-meaning: bumped existing

// ─── Decision Signals ─────────────────────────────────────────────────────────

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

// ─── Supersession Evidence ───────────────────────────────────────────────────

export interface OperatorAuditSupersessionLink {
  /** ID of the note that was superseded or disputed. */
  priorNoteId: string;
  /** Canonical text of the superseded note. */
  priorCanonicalText: string;
  /** New status assigned to the prior note. */
  priorNewStatus: "superseded" | "disputed";
}

// ─── Primary Audit Entry ─────────────────────────────────────────────────────

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

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface OperatorAuditLog {
  sessionId?: string;
  entries: OperatorAuditEntry[];
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _seq = 0;

export function makeAuditId(): string {
  _seq += 1;
  return `aud_${_seq.toString().padStart(6, "0")}`;
}

/**
 * Resets the audit ID sequence. Call this in tests to get deterministic IDs.
 * Never call this in production code.
 */
export function resetAuditSequence(): void {
  _seq = 0;
}

/**
 * Build an OperatorAuditEntry for a new note acceptance/rejection/gating decision.
 */
export function buildAcceptanceAuditEntry(params: {
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
}): OperatorAuditEntry {
  return {
    auditId: params.auditId,
    timestamp: params.timestamp,
    noteId: params.noteId,
    subtype: params.subtype,
    canonicalText: params.canonicalText,
    outcome: params.outcome,
    primaryReason: params.primaryReason,
    allReasons: params.allReasons,
    signals: params.signals,
    supersessionLinks: params.supersessionLinks,
  };
}

/**
 * Build an OperatorAuditEntry for a superseded prior note.
 * Records the link back to the new note that caused supersession.
 */
export function buildSupersessionAuditEntry(params: {
  auditId: string;
  timestamp: string;
  priorNoteId: string;
  priorCanonicalText: string;
  priorNewStatus: "superseded" | "disputed";
  causedByNoteId: string;
  signals: OperatorAuditSignals;
}): OperatorAuditEntry {
  return {
    auditId: params.auditId,
    timestamp: params.timestamp,
    noteId: params.priorNoteId,
    subtype: "supersession_link",
    canonicalText: params.priorCanonicalText,
    outcome: "superseded",
    primaryReason: "superseded_prior_note",
    allReasons: ["superseded_prior_note"],
    signals: params.signals,
    supersessionLinks: [
      {
        priorNoteId: params.priorNoteId,
        priorCanonicalText: params.priorCanonicalText,
        priorNewStatus: params.priorNewStatus,
      },
    ],
  };
}

/**
 * Render an OperatorAuditEntry as a compact single-line markdown list item
 * for operator dashboards and export manifests.
 */
export function renderAuditEntryMarkdown(entry: OperatorAuditEntry): string {
  const contradiction = entry.signals.hasContradiction
    ? ` ⚠ contradiction(${entry.signals.contradictionCount})`
    : "";
  const supersession = entry.supersessionLinks?.length
    ? ` → superseded: [${entry.supersessionLinks.map((s) => s.priorNoteId).join(", ")}]`
    : "";
  return (
    `- [${entry.auditId}] ${entry.outcome.toUpperCase()} ` +
    `| note=${entry.noteId} | reason=${entry.primaryReason}` +
    ` | trust=${entry.signals.trust.toFixed(2)} conf=${entry.signals.confidence.toFixed(2)} caution=${entry.signals.caution.toFixed(2)}` +
    `${contradiction}${supersession}`
  );
}

/**
 * Export an entire OperatorAuditLog as a markdown section.
 */
export function renderAuditLogMarkdown(log: OperatorAuditLog): string {
  const header = log.sessionId
    ? `# Operator Audit Log: ${log.sessionId}\n\n`
    : `# Operator Audit Log\n\n`;
  if (log.entries.length === 0) {
    return header + "_No audit entries._\n";
  }
  return header + log.entries.map(renderAuditEntryMarkdown).join("\n") + "\n";
}
