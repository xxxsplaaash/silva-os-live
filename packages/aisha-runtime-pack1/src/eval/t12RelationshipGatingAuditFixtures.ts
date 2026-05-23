/**
 * T12 — Relationship-Gated Note Acceptance + Operator Audit Trail Fixtures
 *
 * Pack 1.6 deeper coverage beyond T9. Tests:
 *   1.  trust=0 exactly (boundary — should NOT gate)
 *   2.  trust=-0.01 (boundary — should gate)
 *   3.  caution > 0.7 with neutral trust gates note
 *   4.  both caution and trust trigger → reason is trust-gated (trust takes priority in reason)
 *   5.  gated note is still active (not deleted)
 *   6.  gated note's auditTrail survives listActiveNotes
 *   7.  audit trail appends, not overwrites (operator_approved after relationship_gated)
 *   8.  reinforce (same meaning) does NOT corrupt audit trail of existing note
 *   9.  superseded prior note still has correct source truth (not gated retroactively)
 *   10. operator_rejected blocks further auto-reinfer permanently
 *   11. operator_approved upgrades gated note to allow + accepted
 *   12. gated note visible in listActiveNotes (not filtered out)
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import type { NoteCandidate, NoteRecord } from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── T12_trust_at_zero_is_not_gated ──────────────────────────────────────────

export async function T12_trust_at_zero_is_not_gated() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("oat lattes"),
    [],
    { trust: 0, caution: 0 }, // exactly 0 — boundary, not negative
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(
    note.reinferencePolicy.mode,
    "allow",
    "trust=0 must NOT trigger gating (gate is trust < 0)",
  );
  assert.strictEqual(note.auditTrail.length, 1, "Only 'created' event; no gating event");
  assert.strictEqual(note.auditTrail[0].action, "created");
}

// ─── T12_trust_just_below_zero_is_gated ──────────────────────────────────────

export async function T12_trust_just_below_zero_is_gated() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("espresso"),
    [],
    { trust: -0.01, caution: 0 },
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(note.reinferencePolicy.reason, "relationship_trust_gated");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  // Pack 3.7: reason is now a machine-readable code, not a formatted trust string.
  assert.strictEqual(
    note.auditTrail[1].reason,
    "relationship_trust_gated",
    `Expected machine-readable reason code, got: ${note.auditTrail[1].reason}`,
  );
}

// ─── T12_high_caution_gates_even_with_neutral_trust ──────────────────────────

export async function T12_high_caution_gates_even_with_neutral_trust() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("dark roast"),
    [],
    { trust: 0.2, caution: 0.75 }, // trust positive, caution above 0.7
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(
    note.reinferencePolicy.mode,
    "needs_review",
    "caution > 0.7 must trigger soft gate even when trust is positive",
  );
  assert.strictEqual(
    note.reinferencePolicy.reason,
    "relationship_caution_gated",
    "reason must distinguish caution gating from trust gating",
  );
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  // Pack 3.7: reason is now a machine-readable code, not a formatted caution string.
  assert.strictEqual(
    note.auditTrail[1].reason,
    "relationship_caution_gated",
    `Expected machine-readable reason code, got: ${note.auditTrail[1].reason}`,
  );
}

// ─── T12_caution_at_threshold_is_not_gated ───────────────────────────────────

export async function T12_caution_at_threshold_is_not_gated() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("black coffee"),
    [],
    { trust: 0.1, caution: 0.70 }, // exactly 0.7 — boundary, not above
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(
    note.reinferencePolicy.mode,
    "allow",
    "caution=0.7 exactly must NOT gate (threshold is > 0.7)",
  );
}

// ─── T12_trust_and_caution_both_trigger_trust_takes_reason ───────────────────

export async function T12_trust_and_caution_both_trigger_trust_takes_reason() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("flat white"),
    [],
    { trust: -0.3, caution: 0.8 }, // both trigger
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(
    note.reinferencePolicy.reason,
    "relationship_trust_gated",
    "when both trigger, trust takes precedence in the stored reason",
  );
}

// ─── T12_gated_note_is_still_active ──────────────────────────────────────────

export async function T12_gated_note_is_still_active() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("oat milk"),
    [],
    { trust: -0.5, caution: 0.1 },
  );
  const noteId = notesWritten[0].id;

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const found = active.find((n) => n.id === noteId);
  assert.ok(found, "gated note must remain in listActiveNotes (not silently deleted)");
  assert.strictEqual(found.status, "active");
  assert.strictEqual(found.reinferencePolicy.mode, "needs_review");
}

// ─── T12_gated_note_audit_trail_survives_list ────────────────────────────────

export async function T12_gated_note_audit_trail_survives_list() {
  const versioning = new InMemoryNoteVersioning();
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("almond milk"),
    [],
    { trust: -0.4, caution: 0 },
  );
  const noteId = notesWritten[0].id;

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const found = active.find((n) => n.id === noteId);
  assert.ok(found, "must be in active list");
  assert.strictEqual(found.auditTrail.length, 2, "Both 'created' and 'relationship_gated' must be present");
  assert.strictEqual(found.auditTrail[0].action, "created");
  assert.strictEqual(found.auditTrail[1].action, "relationship_gated");
  assert.ok(
    typeof found.auditTrail[1].reason === "string" && found.auditTrail[1].reason.length > 0,
    "relationship_gated audit entry must have a non-empty reason",
  );
  assert.strictEqual(found.auditTrail[1].newState, "needs_review");
}

// ─── T12_audit_trail_appends_not_overwrites ───────────────────────────────────

export async function T12_audit_trail_appends_not_overwrites() {
  const versioning = new InMemoryNoteVersioning();

  // Create gated note (2 entries: created + relationship_gated)
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("soy milk"),
    [],
    { trust: -0.5, caution: 0 },
  );
  const noteId = notesWritten[0].id;
  assert.strictEqual(notesWritten[0].auditTrail.length, 2);

  // Approve it — should add operator_approved entry
  const approved = await versioning.operatorReview(noteId, "accept", "op_audit_01");
  assert.ok(approved, "operatorReview must return the updated note");
  assert.strictEqual(approved.auditTrail.length, 3, "3 entries: created, relationship_gated, operator_approved");
  assert.strictEqual(approved.auditTrail[0].action, "created");
  assert.strictEqual(approved.auditTrail[1].action, "relationship_gated");
  assert.strictEqual(approved.auditTrail[2].action, "operator_approved");
  assert.strictEqual(approved.auditTrail[2].operatorId, "op_audit_01");

  // Reject it — should add operator_rejected entry
  const rejected = await versioning.operatorReview(noteId, "reject", "op_audit_01");
  assert.ok(rejected);
  assert.strictEqual(rejected.auditTrail.length, 4, "4 entries: created, gated, approved, rejected");
  assert.strictEqual(rejected.auditTrail[3].action, "operator_rejected");
  assert.strictEqual(rejected.auditTrail[3].operatorId, "op_audit_01");
}

// ─── T12_reinforce_does_not_corrupt_audit_trail ───────────────────────────────

export async function T12_reinforce_does_not_corrupt_audit_trail() {
  const versioning = new InMemoryNoteVersioning();

  // First extraction — gated
  const firstResult = await versioning.mergeOrSupersede(
    makeCandidate("oat lattes"),
    [],
    { trust: -0.3, caution: 0 },
  );
  const firstNoteId = firstResult.notesWritten[0].id;
  assert.strictEqual(firstResult.notesWritten[0].auditTrail.length, 2);

  // Second extraction — same meaning → reinforce path (NOT a new note)
  const existing = await versioning.listActiveNotes({ includeGlobal: true });
  const secondResult = await versioning.mergeOrSupersede(
    makeCandidate("oat lattes", { sourceEpisodeIds: ["ep_02"] }),
    existing,
    { trust: 0.5, caution: 0 }, // higher trust now — but reinforce path, not new note
  );

  // The reinforce path updates the existing note — it must NOT add audit events
  const reinforced = secondResult.notesWritten[0];
  assert.strictEqual(
    reinforced.id,
    firstNoteId,
    "reinforce must update existing note, not create a new one",
  );
  // Reinforce path does NOT touch auditTrail
  assert.strictEqual(
    reinforced.auditTrail.length,
    2,
    "Reinforce must NOT append new audit entries",
  );
  // Source episode list must grow
  assert.ok(
    reinforced.sourceEpisodeIds.includes("ep_02"),
    "reinforced note must include new episode",
  );
}

// ─── T12_superseded_prior_not_retroactively_gated ────────────────────────────

export async function T12_superseded_prior_not_retroactively_gated() {
  const versioning = new InMemoryNoteVersioning();

  // Create an original note with high trust (no gating).
  // Pack 2.6: contradiction is narrowly scoped to avoidance/negation opposites.
  // "dairy" is contradicted by "avoids dairy" — and vice versa.
  const firstResult = await versioning.mergeOrSupersede(
    makeCandidate("dairy"),
    [],
    { trust: 0.8, caution: 0 },
  );
  const priorNoteId = firstResult.notesWritten[0].id;
  assert.strictEqual(firstResult.notesWritten[0].reinferencePolicy.mode, "allow");

  // Now supersede it with the direct avoidance opposite under low trust
  const existing = await versioning.listActiveNotes({ includeGlobal: true });
  const secondResult = await versioning.mergeOrSupersede(
    makeCandidate("avoids dairy"), // real avoidance contradiction → supersedes
    existing,
    { trust: -0.5, caution: 0 },
  );

  // The NEW note is gated (low trust) — and is active
  const newNote = secondResult.notesWritten.find((n) => n.status === "active");
  assert.ok(newNote, "new note must be active");
  assert.strictEqual(newNote.reinferencePolicy.mode, "needs_review");

  // The PRIOR note is disputed (active contradicted by active) and must keep its original reinferencePolicy
  const disputedNote = secondResult.notesWritten.find((n) => n.id === priorNoteId);
  assert.ok(disputedNote, "prior note must appear in notesWritten as disputed");
  assert.ok(
    disputedNote.status === "disputed" || disputedNote.status === "superseded",
    "Prior note must be disputed or superseded",
  );
  assert.strictEqual(
    disputedNote.reinferencePolicy.mode,
    "allow",
    "Prior note reinferencePolicy must not be retroactively modified",
  );
}


// ─── T12_operator_rejected_blocks_auto_reinfer ───────────────────────────────

export async function T12_operator_rejected_blocks_auto_reinfer() {
  const versioning = new InMemoryNoteVersioning();

  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("matcha latte"),
    [],
    { trust: -0.5, caution: 0 },
  );
  const noteId = notesWritten[0].id;

  await versioning.operatorReview(noteId, "reject", "op_block_01");

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const found = active.find((n) => n.id === noteId);
  // Rejected notes are filtered out of listActiveNotes
  assert.strictEqual(
    found,
    undefined,
    "operator_rejected note must not appear in listActiveNotes",
  );

  // Attempting another reinfer: same-track candidate against empty existing
  // The note is rejected so it's invisible — a new note would be created
  // This verifies the note store doesn't serve rejected notes as merge targets
  const existingVisible = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(existingVisible.length, 0, "No active notes visible after rejection");
}

// ─── T12_operator_approved_lifts_gating ──────────────────────────────────────

export async function T12_operator_approved_lifts_gating() {
  const versioning = new InMemoryNoteVersioning();

  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("chai latte"),
    [],
    { trust: -0.5, caution: 0 },
  );
  const noteId = notesWritten[0].id;

  // Before approval: note is gated
  const beforeApproval = await versioning.listActiveNotes({ includeGlobal: true });
  const gated = beforeApproval.find((n) => n.id === noteId);
  assert.ok(gated);
  assert.strictEqual(gated.reinferencePolicy.mode, "needs_review");

  // Approve
  const approved = await versioning.operatorReview(noteId, "accept", "op_lift_01");
  assert.ok(approved);
  assert.strictEqual(approved.reviewState, "accepted");
  assert.strictEqual(approved.reinferencePolicy.mode, "allow");

  // After approval: note is visible as allow
  const afterApproval = await versioning.listActiveNotes({ includeGlobal: true });
  const lifted = afterApproval.find((n) => n.id === noteId);
  assert.ok(lifted, "note must still be in listActiveNotes after approval");
  assert.strictEqual(lifted.reinferencePolicy.mode, "allow");
  assert.strictEqual(lifted.reviewState, "accepted");
}

// ─── T12_no_context_leaves_note_ungated ──────────────────────────────────────

export async function T12_no_context_leaves_note_ungated() {
  const versioning = new InMemoryNoteVersioning();

  // No context provided → trust defaults to 0, caution defaults to 0 → no gating
  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("plain water"),
    [],
    // no context argument
  );

  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(
    note.reinferencePolicy.mode,
    "allow",
    "Absent context must default to ungated",
  );
  assert.strictEqual(note.auditTrail.length, 1);
  assert.strictEqual(note.auditTrail[0].action, "created");
}
