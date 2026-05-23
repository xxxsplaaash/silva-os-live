/**
 * T38 — Operator Audit Trail Fixtures (Pack 3.8)
 *
 * Deterministic pure-function tests verifying that mergeOrSupersede emits
 * correct OperatorAuditEntry records for every lifecycle decision.
 *
 * Coverage:
 *   T38_accepted_note_emits_correct_audit_entry
 *   T38_rejected_low_trust_emits_correct_audit_entry
 *   T38_rejected_weak_confidence_emits_correct_audit_entry
 *   T38_needs_review_trust_gated_emits_correct_audit_entry
 *   T38_needs_review_caution_gated_emits_correct_audit_entry
 *   T38_contradiction_review_retains_signal_evidence
 *   T38_supersession_generates_traceable_linkage
 *   T38_reinforce_emits_reinforced_audit_entry
 *   T38_render_audit_log_markdown
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { resetAuditSequence, renderAuditLogMarkdown } from "../memory/operatorAuditTrail";
import type { NoteCandidate, NoteRecord } from "../memory/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCandidate(
  value: string,
  overrides: Partial<NoteCandidate> = {},
): NoteCandidate {
  return {
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: 0.85,
    extractionConfidenceRaw: 0.85,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_01"],
    ...overrides,
  };
}

// Reset sequence before each test to get predictable IDs.
function setup() {
  resetAuditSequence();
  return new InMemoryNoteVersioning();
}

// ─── T38_accepted_note_emits_correct_audit_entry ──────────────────────────────

export async function T38_accepted_note_emits_correct_audit_entry() {
  const versioning = setup();
  const result = await versioning.mergeOrSupersede(
    makeCandidate("oat latte"),
    [],
    { trust: 0.9, caution: 0.1 },
  );

  assert.ok(result.auditEntries, "auditEntries must be present");
  assert.strictEqual(result.auditEntries!.length, 1);

  const entry = result.auditEntries![0];
  assert.strictEqual(entry.outcome, "accepted");
  assert.strictEqual(entry.primaryReason, "relationship_trust_accepted");
  assert.ok(entry.allReasons.includes("relationship_trust_accepted"));
  assert.strictEqual(entry.signals.trust, 0.9);
  assert.strictEqual(entry.signals.confidence, 0.85);
  assert.strictEqual(entry.signals.hasContradiction, false);
  assert.strictEqual(entry.signals.contradictionCount, 0);
  assert.strictEqual(entry.noteId, result.notesWritten[0].id);
}

// ─── T38_rejected_low_trust_emits_correct_audit_entry ────────────────────────

export async function T38_rejected_low_trust_emits_correct_audit_entry() {
  const versioning = setup();
  const result = await versioning.mergeOrSupersede(
    makeCandidate("espresso"),
    [],
    { trust: -0.7, caution: 0.1 },
  );

  assert.ok(result.auditEntries);
  assert.strictEqual(result.auditEntries!.length, 1);

  const entry = result.auditEntries![0];
  assert.strictEqual(entry.outcome, "rejected");
  assert.strictEqual(entry.primaryReason, "relationship_trust_rejected");
  assert.ok(entry.allReasons.includes("relationship_trust_rejected"));
  assert.strictEqual(entry.signals.trust, -0.7);
  assert.strictEqual(entry.signals.hasContradiction, false);
}

// ─── T38_rejected_weak_confidence_emits_correct_audit_entry ──────────────────

export async function T38_rejected_weak_confidence_emits_correct_audit_entry() {
  const versioning = setup();
  const result = await versioning.mergeOrSupersede(
    makeCandidate("flat white", { confidence: 0.45, extractionConfidenceRaw: 0.45 }),
    [],
    { trust: 0.9, caution: 0.1 },
  );

  assert.ok(result.auditEntries);
  assert.strictEqual(result.auditEntries!.length, 1);

  const entry = result.auditEntries![0];
  assert.strictEqual(entry.outcome, "rejected");
  assert.strictEqual(entry.primaryReason, "weakly_grounded_rejected");
  assert.ok(entry.allReasons.includes("weakly_grounded_rejected"));
  assert.strictEqual(entry.signals.confidence, 0.45);
}

// ─── T38_needs_review_trust_gated_emits_correct_audit_entry ──────────────────

export async function T38_needs_review_trust_gated_emits_correct_audit_entry() {
  const versioning = setup();
  const result = await versioning.mergeOrSupersede(
    makeCandidate("matcha"),
    [],
    { trust: -0.3, caution: 0.1 },
  );

  assert.ok(result.auditEntries);
  assert.strictEqual(result.auditEntries!.length, 1);

  const entry = result.auditEntries![0];
  assert.strictEqual(entry.outcome, "needs_review");
  assert.strictEqual(entry.primaryReason, "relationship_trust_gated");
  assert.ok(entry.allReasons.includes("relationship_trust_gated"));
  assert.strictEqual(entry.signals.trust, -0.3);
}

// ─── T38_needs_review_caution_gated_emits_correct_audit_entry ────────────────

export async function T38_needs_review_caution_gated_emits_correct_audit_entry() {
  const versioning = setup();
  const result = await versioning.mergeOrSupersede(
    makeCandidate("dark roast"),
    [],
    { trust: 0.4, caution: 0.85 },
  );

  assert.ok(result.auditEntries);
  assert.strictEqual(result.auditEntries!.length, 1);

  const entry = result.auditEntries![0];
  assert.strictEqual(entry.outcome, "needs_review");
  assert.strictEqual(entry.primaryReason, "relationship_caution_gated");
  assert.ok(entry.allReasons.includes("relationship_caution_gated"));
  assert.strictEqual(entry.signals.caution, 0.85);
}

// ─── T38_contradiction_review_retains_signal_evidence ────────────────────────

export async function T38_contradiction_review_retains_signal_evidence() {
  const versioning = setup();

  // Seed a prior active note
  const priorNote: NoteRecord = {
    id: "note_prior_dairy",
    kind: "note",
    createdAt: "2026-04-25T10:00:00.000Z",
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: "User preference: dairy",
    normalizedValue: "dairy",
    confidence: 0.85,
    extractionConfidenceRaw: 0.85,
    provenanceChain: ["extracted_v0"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_00"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };

  // Even high trust cannot bypass contradiction routing
  const result = await versioning.mergeOrSupersede(
    makeCandidate("avoids dairy"),
    [priorNote],
    { trust: 0.9, caution: 0.1 },
  );

  assert.ok(result.auditEntries);
  // Entry 0: new note (needs_review because contradiction)
  // Entry 1: supersession/dispute entry for the prior note
  assert.strictEqual(result.auditEntries!.length, 2, "Must emit 2 entries: new note + superseded prior");

  const newEntry = result.auditEntries![0];
  assert.strictEqual(newEntry.outcome, "needs_review");
  assert.strictEqual(newEntry.primaryReason, "contradiction_needs_review");
  assert.ok(newEntry.allReasons.includes("contradiction_needs_review"));
  assert.strictEqual(newEntry.signals.hasContradiction, true);
  assert.strictEqual(newEntry.signals.contradictionCount, 1);
  // High trust is recorded but does NOT override
  assert.strictEqual(newEntry.signals.trust, 0.9);

  const superEntry = result.auditEntries![1];
  assert.strictEqual(superEntry.outcome, "superseded");
  assert.strictEqual(superEntry.primaryReason, "superseded_prior_note");
  assert.strictEqual(superEntry.noteId, priorNote.id);
  assert.ok(superEntry.supersessionLinks, "supersession links must be present");
  assert.strictEqual(superEntry.supersessionLinks![0].priorNoteId, priorNote.id);
  assert.strictEqual(superEntry.supersessionLinks![0].priorCanonicalText, priorNote.canonicalText);
  // Trust + contradiction signals preserved in supersession entry too
  assert.strictEqual(superEntry.signals.trust, 0.9);
  assert.strictEqual(superEntry.signals.hasContradiction, true);
}

// ─── T38_supersession_generates_traceable_linkage ────────────────────────────

export async function T38_supersession_generates_traceable_linkage() {
  const versioning = setup();

  const priorNote: NoteRecord = {
    id: "note_coffee_avoidance",
    kind: "note",
    createdAt: "2026-04-25T09:00:00.000Z",
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: "User preference: avoids coffee",
    normalizedValue: "avoids coffee",
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: ["extracted_v0"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_old"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };

  const result = await versioning.mergeOrSupersede(
    makeCandidate("coffee"),
    [priorNote],
    { trust: 0.5, caution: 0.0 },
  );

  assert.ok(result.auditEntries);
  assert.strictEqual(result.auditEntries!.length, 2);

  const [newEntry, superEntry] = result.auditEntries!;

  // Confirm the supersession link captures enough to reconstruct what happened
  assert.strictEqual(superEntry.noteId, priorNote.id);
  assert.strictEqual(superEntry.canonicalText, priorNote.canonicalText);
  assert.ok(
    superEntry.supersessionLinks![0].priorNewStatus === "disputed" ||
      superEntry.supersessionLinks![0].priorNewStatus === "superseded",
    "priorNewStatus must be set",
  );

  // New note's audit entry references the same signals
  assert.strictEqual(newEntry.signals.contradictionCount, 1);
}

// ─── T38_reinforce_emits_reinforced_audit_entry ───────────────────────────────

export async function T38_reinforce_emits_reinforced_audit_entry() {
  const versioning = setup();

  // Create an initial note
  const firstResult = await versioning.mergeOrSupersede(
    makeCandidate("chai latte"),
    [],
    { trust: 0.5, caution: 0.0 },
  );
  const firstNoteId = firstResult.notesWritten[0].id;

  // Reinforce with same meaning
  const existing = await versioning.listActiveNotes({ includeGlobal: true });
  const reinforceResult = await versioning.mergeOrSupersede(
    makeCandidate("chai latte", { sourceEpisodeIds: ["ep_02"] }),
    existing,
    { trust: 0.6, caution: 0.0 },
  );

  assert.ok(reinforceResult.auditEntries);
  assert.strictEqual(reinforceResult.auditEntries!.length, 1);

  const entry = reinforceResult.auditEntries![0];
  assert.strictEqual(entry.outcome, "reinforced");
  assert.strictEqual(entry.primaryReason, "reinforced_existing_note");
  assert.strictEqual(entry.noteId, firstNoteId);
  assert.strictEqual(entry.signals.hasContradiction, false);
}

// ─── T38_render_audit_log_markdown ───────────────────────────────────────────

export async function T38_render_audit_log_markdown() {
  resetAuditSequence();
  const versioning = new InMemoryNoteVersioning();

  const result = await versioning.mergeOrSupersede(
    makeCandidate("oat milk"),
    [],
    { trust: 0.9, caution: 0.1 },
  );

  const log = {
    sessionId: "session_test_38",
    entries: result.auditEntries ?? [],
  };

  const markdown = renderAuditLogMarkdown(log);
  assert.ok(markdown.includes("# Operator Audit Log: session_test_38"), "Must include session header");
  assert.ok(markdown.includes("ACCEPTED"), "Must include outcome");
  assert.ok(markdown.includes("relationship_trust_accepted"), "Must include reason code");
  assert.ok(markdown.includes("trust=0.90"), "Must include trust signal");
}
