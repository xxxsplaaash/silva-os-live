/**
 * T11 — Persisted Reconsolidation Review State Fixtures
 *
 * Verifies:
 *   1. persistReviewSignals sets lastReviewedAt on the stored note
 *   2. needs_review / stale state survives across turns without re-derivation
 *   3. contradiction_sensitive_lower_support persists after a contradiction turn
 *   4. a note already in needs_review stays in needs_review on a neutral follow-up turn
 *   5. deriveCombinedReviewSignals respects budget cap (MAX_RECONSOLIDATION_SIGNALS_PER_TURN)
 *   6. multi-session: review state from session 1 is readable in session 2 via listActiveNotes
 *
 * All deterministic — no live LLM, no Date.now() in assertions.
 * All timestamps are fixed strings to keep assertions stable.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import {
  deriveCombinedReviewSignals,
  MAX_RECONSOLIDATION_SIGNALS_PER_TURN,
} from "../memory/reactiveReconsolidation";
import type { NoteRecord, TurnRecord } from "../memory/types";

// ─── Fixed constants ──────────────────────────────────────────────────────────

const FIXED_OLD = "2026-02-01T10:00:00.000Z"; // > 14 days before FIXED_NOW
const FIXED_NOW = "2026-04-18T10:00:00.000Z";

function makeOldNote(
  id: string,
  normalizedValue: string,
  confidence: number,
  sourceCount: number,
  reinferenceMode: "allow" | "needs_review" = "allow",
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_OLD,
    updatedAt: FIXED_OLD,
    lastConfirmedAt: FIXED_OLD,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence,
    extractionConfidenceRaw: confidence,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: Array.from({ length: sourceCount }, (_, i) => `ep_${id}_${i}`),
    reviewState: reinferenceMode === "needs_review" ? "pending" : "accepted",
    reinferencePolicy: reinferenceMode === "needs_review"
      ? { mode: "needs_review", reason: "retrieved_weak_stale_note" }
      : { mode: "allow" },
    auditTrail: [],
  };
}

function makeTurn(
  rawText: string,
  sessionId = "session_t11",
  createdAt = FIXED_NOW,
): TurnRecord {
  return {
    id: `turn_t11_${Math.random().toString(36).slice(2, 8)}`,
    kind: "turn",
    createdAt,
    sourceModality: "text",
    sessionId,
    turnIndex: 1,
    speaker: "user",
    rawText,
    stateSnapshotId: "snap_t11",
    entityMentions: [],
    immutable: true,
  };
}

// ─── T11_persist_review_signals_sets_last_reviewed_at ────────────────────────

export async function T11_persist_review_signals_sets_last_reviewed_at() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeOldNote("note_stale_01", "oat lattes", 0.68, 1);
  await versioning.seedNotes([note]);

  const before = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(before.length, 1);
  assert.strictEqual(before[0].lastReviewedAt, undefined, "lastReviewedAt should be unset before persist");

  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "retrieved_weak_stale_note" }],
    { subjectKind: "user" },
  );

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(after.length, 1);
  const updated = after[0];
  assert.ok(
    typeof updated.lastReviewedAt === "string" && updated.lastReviewedAt.length > 0,
    `lastReviewedAt must be set after persistReviewSignals, got: ${updated.lastReviewedAt}`
  );
  assert.strictEqual(updated.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(updated.reviewState, "pending");
}

// ─── T11_review_state_survives_subsequent_list ───────────────────────────────

export async function T11_review_state_survives_subsequent_list() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeOldNote("note_stale_02", "dark roast", 0.68, 1);
  await versioning.seedNotes([note]);

  // Simulate turn N: persist review signals
  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "retrieved_weak_stale_note" }],
    { subjectKind: "user" },
  );

  // Simulate turn N+1: list notes again without re-deriving signals
  const turnN1 = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(turnN1.length, 1);
  const noteN1 = turnN1[0];

  assert.strictEqual(noteN1.reinferencePolicy.mode, "needs_review", "Mode must persist to next list call");
  assert.strictEqual(noteN1.reinferencePolicy.reason, "retrieved_weak_stale_note");
  assert.strictEqual(noteN1.reviewState, "pending");
  assert.ok(noteN1.lastReviewedAt, "lastReviewedAt must survive to turn N+1");

  // Simulate turn N+2: list again — must still be in needs_review
  const turnN2 = await versioning.listActiveNotes({ includeGlobal: true });
  const noteN2 = turnN2[0];
  assert.strictEqual(noteN2.reinferencePolicy.mode, "needs_review", "Mode must persist to turn N+2");
  assert.strictEqual(noteN2.lastReviewedAt, noteN1.lastReviewedAt, "lastReviewedAt must not change between reads");
}

// ─── T11_contradiction_signal_persists ───────────────────────────────────────

export async function T11_contradiction_signal_persists() {
  const versioning = new InMemoryNoteVersioning();
  const weakNote = makeOldNote("note_weak_03", "espresso", 0.68, 1);
  const strongNote = makeOldNote("note_strong_03", "oat lattes", 0.88, 3);
  await versioning.seedNotes([weakNote, strongNote]);

  // Contradiction-sensitive turn
  const turn = makeTurn("Actually I stopped drinking espresso.");
  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });

  const signals = deriveCombinedReviewSignals({ currentTurn: turn, activeNotes });
  assert.ok(
    signals.some((s) => s.reason === "contradiction_sensitive_lower_support"),
    "Expected contradiction_sensitive_lower_support signal"
  );

  await versioning.persistReviewSignals(signals, { subjectKind: "user" });

  // After: weak note must be in needs_review
  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const persistedWeak = after.find((n) => n.id === weakNote.id);
  assert.ok(persistedWeak, "weak note must still be in active list");
  assert.strictEqual(persistedWeak.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(persistedWeak.reinferencePolicy.reason, "contradiction_sensitive_lower_support");
  assert.ok(persistedWeak.lastReviewedAt, "lastReviewedAt must be set on contradiction persist");

  // On a neutral next turn — note stays in needs_review (no re-derivation needed)
  const neutralTurn = makeTurn("Thanks, got it.");
  const afterNeutral = await versioning.listActiveNotes({ includeGlobal: true });
  const noteAfterNeutral = afterNeutral.find((n) => n.id === weakNote.id);
  assert.ok(noteAfterNeutral, "weak note must still exist after neutral turn");
  assert.strictEqual(
    noteAfterNeutral.reinferencePolicy.mode,
    "needs_review",
    "needs_review must survive a neutral turn without re-derivation"
  );
}

// ─── T11_already_needs_review_stays_needs_review_on_neutral_turn ─────────────

export async function T11_already_needs_review_stays_needs_review_on_neutral_turn() {
  const versioning = new InMemoryNoteVersioning();
  // Start with a note already in needs_review state (simulating state from prior session)
  const note = makeOldNote("note_stale_04", "black coffee", 0.68, 1, "needs_review");
  await versioning.seedNotes([note]);

  // Neutral turn — no contradiction, no stale trigger
  const neutralTurn = makeTurn("Sounds good, thanks.");
  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });

  // No signals should be derived (note is old but neutralTurn is not contradiction-sensitive)
  // but the note must still be in needs_review from the stored state
  const noteFromStore = activeNotes.find((n) => n.id === note.id);
  assert.ok(noteFromStore, "note must be retrievable");
  assert.strictEqual(
    noteFromStore.reinferencePolicy.mode,
    "needs_review",
    "Previously persisted needs_review must survive without forced re-derivation"
  );

  // persistReviewSignals is NOT called here — verifying pure store read-back
  const afterAnotherRead = await versioning.listActiveNotes({ includeGlobal: true });
  const noteAfter = afterAnotherRead.find((n) => n.id === note.id);
  assert.strictEqual(
    noteAfter?.reinferencePolicy.mode,
    "needs_review",
    "needs_review must survive repeated reads without any write calls"
  );
}

// ─── T11_combined_signals_budget_cap ─────────────────────────────────────────

export async function T11_combined_signals_budget_cap() {
  // Build 5 old, weak, single-source notes — all qualify for retrieved_weak_stale_note
  const notes: NoteRecord[] = Array.from({ length: 5 }, (_, i) =>
    makeOldNote(`note_budget_${i}`, `value_${i}`, 0.68, 1)
  );

  const turn = makeTurn("What do you remember?");
  const signals = deriveCombinedReviewSignals({ currentTurn: turn, activeNotes: notes });

  assert.ok(
    signals.length <= MAX_RECONSOLIDATION_SIGNALS_PER_TURN,
    `Expected at most ${MAX_RECONSOLIDATION_SIGNALS_PER_TURN} signals, got ${signals.length}`
  );
}

// ─── T11_multi_session_state_readable ────────────────────────────────────────

export async function T11_multi_session_state_readable() {
  const versioning = new InMemoryNoteVersioning();

  // Session 1: persist review signal
  const note = makeOldNote("note_session_05", "oat lattes", 0.68, 1);
  await versioning.seedNotes([note]);

  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "retrieved_weak_stale_note" }],
    { subjectKind: "user" },
  );

  // Verify it's persisted from session 1's perspective
  const session1Notes = await versioning.listActiveNotes({ includeGlobal: true });
  const session1Note = session1Notes.find((n) => n.id === note.id);
  assert.ok(session1Note, "note must exist in session 1");
  assert.strictEqual(session1Note.reinferencePolicy.mode, "needs_review");

  // Session 2: does not call persistReviewSignals, only reads
  // (InMemoryNoteVersioning is ephemeral and shared; in real prod it's a DB row)
  // This tests that the in-memory store correctly surfaces the same state
  const session2Notes = await versioning.listActiveNotes({ includeGlobal: true });
  const session2Note = session2Notes.find((n) => n.id === note.id);
  assert.ok(session2Note, "note must be readable in session 2 without re-derivation");
  assert.strictEqual(
    session2Note.reinferencePolicy.mode,
    "needs_review",
    "Review state must persist across session boundary reads"
  );
  assert.strictEqual(
    session2Note.lastReviewedAt,
    session1Note.lastReviewedAt,
    "lastReviewedAt must not drift between session reads"
  );
}

// ─── T11_priority_upgrade_preserves_higher_reason ────────────────────────────

export async function T11_priority_upgrade_preserves_higher_reason() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeOldNote("note_priority_06", "flat white", 0.68, 1);
  await versioning.seedNotes([note]);

  // First: persist low-priority reason
  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "retrieved_weak_stale_note" }],
    { subjectKind: "user" },
  );

  const afterLow = await versioning.listActiveNotes({ includeGlobal: true });
  const noteLow = afterLow.find((n) => n.id === note.id)!;
  assert.strictEqual(noteLow.reinferencePolicy.reason, "retrieved_weak_stale_note");

  // Second: persist higher-priority reason — should upgrade
  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "contradiction_sensitive_lower_support" }],
    { subjectKind: "user" },
  );

  const afterHigh = await versioning.listActiveNotes({ includeGlobal: true });
  const noteHigh = afterHigh.find((n) => n.id === note.id)!;
  assert.strictEqual(
    noteHigh.reinferencePolicy.reason,
    "contradiction_sensitive_lower_support",
    "Higher-priority reason must upgrade over lower-priority"
  );

  // Third: re-persist low-priority — should NOT downgrade
  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "retrieved_weak_stale_note" }],
    { subjectKind: "user" },
  );

  const afterDowngrade = await versioning.listActiveNotes({ includeGlobal: true });
  const noteDowngrade = afterDowngrade.find((n) => n.id === note.id)!;
  assert.strictEqual(
    noteDowngrade.reinferencePolicy.reason,
    "contradiction_sensitive_lower_support",
    "Low-priority signal must NOT downgrade an existing high-priority persisted reason"
  );
}
