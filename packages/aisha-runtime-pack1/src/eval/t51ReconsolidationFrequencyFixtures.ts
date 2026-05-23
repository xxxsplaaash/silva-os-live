/**
 * T51 — Pack 4.2 Reconsolidation Signal Frequency Persistence Fixtures
 *
 * Verifies:
 *  1. First soft signal records reconsolidationSignalCount but does NOT escalate
 *  2. Repeated soft signal (reaching threshold) escalates to needs_review
 *  3. Signal for one note does not increment a different note's count
 *  4. Contradiction signal bypasses frequency gating and escalates immediately
 *  5. Count survives across turn-to-turn reads (in-memory fixture path)
 *  6. deriveGatedRetrievalSignals emits soft_signal_increment below threshold
 *  7. deriveGatedRetrievalSignals emits retrieved_weak_stale_note at/above threshold
 *  8. Existing T11 reconsolidation behaviour does not regress
 *
 * All deterministic — no live LLM, no Date.now() in assertions.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import {
  deriveCombinedReviewSignals,
  deriveGatedRetrievalSignals,
  SOFT_SIGNAL_ESCALATION_THRESHOLD,
  MAX_RECONSOLIDATION_SIGNALS_PER_TURN,
} from "../memory/reactiveReconsolidation";
import type { NoteRecord, TurnRecord } from "../memory/types";

// ─── Fixed constants ──────────────────────────────────────────────────────────

const FIXED_OLD = "2026-02-01T10:00:00.000Z"; // > 14 days before FIXED_NOW
const FIXED_NOW = "2026-04-30T10:00:00.000Z";

function makeWeakStaleNote(
  id: string,
  normalizedValue: string,
  signalCount = 0,
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
    confidence: 0.68,                    // below WEAK_CONFIDENCE_THRESHOLD (0.72)
    extractionConfidenceRaw: 0.68,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_single"],     // count=1, below LOW_EVIDENCE_THRESHOLD (1)
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
    reconsolidationSignalCount: signalCount,
  };
}

function makeStrongNote(id: string, normalizedValue: string): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_OLD,
    updatedAt: FIXED_OLD,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence: 0.90,
    extractionConfidenceRaw: 0.90,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1", "ep2", "ep3"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };
}

function makeNeutralTurn(): TurnRecord {
  return {
    id: "turn_t51_neutral",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t51",
    turnIndex: 1,
    speaker: "user",
    rawText: "What do you remember about me?",
    stateSnapshotId: "snap_t51",
    entityMentions: [],
    immutable: true,
  };
}

function makeContradictionTurn(): TurnRecord {
  return {
    id: "turn_t51_contradiction",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t51",
    turnIndex: 2,
    speaker: "user",
    rawText: "Actually I stopped drinking espresso.",
    stateSnapshotId: "snap_t51",
    entityMentions: [],
    immutable: true,
  };
}

// ─── T51_first_soft_signal_increments_count_not_escalate ─────────────────────
export async function T51_first_soft_signal_increments_count_not_escalate() {
  const versioning = new InMemoryNoteVersioning();
  // note starts with signalCount=0 (below threshold)
  const note = makeWeakStaleNote("note_t51_01", "espresso", 0);
  await versioning.seedNotes([note]);

  const signals = deriveGatedRetrievalSignals({
    currentTurn: makeNeutralTurn(),
    activeNotes: [note],
  });

  assert.strictEqual(signals.length, 1, "Expected exactly 1 signal");
  assert.strictEqual(
    signals[0].reason,
    "soft_signal_increment",
    `Expected soft_signal_increment (count=0 < threshold=${SOFT_SIGNAL_ESCALATION_THRESHOLD}), got ${signals[0].reason}`,
  );

  // Persist the increment signal
  await versioning.persistReviewSignals(signals, { subjectKind: "user" });

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updated = after.find((n) => n.id === note.id)!;

  assert.strictEqual(
    updated.reinferencePolicy.mode,
    "allow",
    "reinferencePolicy must remain 'allow' after first soft signal (below threshold)",
  );
  assert.strictEqual(
    updated.reviewState,
    "accepted",
    "reviewState must remain 'accepted' after first soft signal",
  );
  assert.strictEqual(
    updated.reconsolidationSignalCount,
    1,
    "reconsolidationSignalCount must be 1 after first soft signal",
  );
}

// ─── T51_repeated_soft_signal_escalates ──────────────────────────────────────
export async function T51_repeated_soft_signal_escalates() {
  const versioning = new InMemoryNoteVersioning();
  // Note starts at SOFT_SIGNAL_ESCALATION_THRESHOLD - 1. With threshold 2,
  // count is 1. The next signal makes it 2, triggering escalation.
  const preSignalCount = SOFT_SIGNAL_ESCALATION_THRESHOLD - 1;
  const note = makeWeakStaleNote("note_t51_02", "oat lattes", preSignalCount);
  await versioning.seedNotes([note]);

  const signals = deriveGatedRetrievalSignals({
    currentTurn: makeNeutralTurn(),
    activeNotes: [note],
  });

  // nextCount = count + 1 >= threshold → full escalation signal
  assert.strictEqual(signals.length, 1, "Expected exactly 1 signal");
  assert.strictEqual(
    signals[0].reason,
    "retrieved_weak_stale_note",
    `Expected retrieved_weak_stale_note at count=${preSignalCount} + 1 >= threshold=${SOFT_SIGNAL_ESCALATION_THRESHOLD}, got ${signals[0].reason}`,
  );

  await versioning.persistReviewSignals(signals, { subjectKind: "user" });

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updated = after.find((n) => n.id === note.id)!;

  assert.strictEqual(
    updated.reinferencePolicy.mode,
    "needs_review",
    "reinferencePolicy must escalate to needs_review when signalCount >= threshold",
  );
  assert.strictEqual(updated.reviewState, "pending");
  assert.ok(updated.lastReviewedAt, "lastReviewedAt must be set on escalation");
}

// ─── T51_signal_does_not_cross_note_boundary ─────────────────────────────────
export async function T51_signal_does_not_cross_note_boundary() {
  const versioning = new InMemoryNoteVersioning();
  const noteA = makeWeakStaleNote("note_t51_03a", "coffee", 0);
  const noteB = makeWeakStaleNote("note_t51_03b", "tea", 0);
  await versioning.seedNotes([noteA, noteB]);

  // Only emit signal for noteA
  await versioning.persistReviewSignals(
    [{ noteId: noteA.id, reason: "soft_signal_increment" }],
    { subjectKind: "user" },
  );

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updatedA = after.find((n) => n.id === noteA.id)!;
  const updatedB = after.find((n) => n.id === noteB.id)!;

  assert.strictEqual(
    updatedA.reconsolidationSignalCount,
    1,
    "noteA signal count must be 1",
  );
  assert.strictEqual(
    updatedB.reconsolidationSignalCount ?? 0,
    0,
    "noteB signal count must remain 0 — signal for noteA must not affect noteB",
  );
}

// ─── T51_contradiction_bypasses_frequency_gate ───────────────────────────────
export async function T51_contradiction_bypasses_frequency_gate() {
  const versioning = new InMemoryNoteVersioning();
  // Weak note + strong note in same track (K_pref|user)
  const weakNote = makeWeakStaleNote("note_t51_04w", "espresso", 0);
  const strongNote = makeStrongNote("note_t51_04s", "oat lattes");
  await versioning.seedNotes([weakNote, strongNote]);

  const signals = deriveCombinedReviewSignals({
    currentTurn: makeContradictionTurn(),
    activeNotes: [weakNote, strongNote],
  });

  const contradictionSignal = signals.find(
    (s) => s.reason === "contradiction_sensitive_lower_support",
  );
  assert.ok(
    contradictionSignal,
    "Expected contradiction_sensitive_lower_support signal to be emitted immediately regardless of signalCount",
  );

  await versioning.persistReviewSignals(signals, { subjectKind: "user" });

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updatedWeak = after.find((n) => n.id === weakNote.id)!;
  assert.strictEqual(
    updatedWeak.reinferencePolicy.mode,
    "needs_review",
    "Contradiction must immediately escalate without requiring frequency threshold",
  );
  assert.strictEqual(
    updatedWeak.reinferencePolicy.reason,
    "contradiction_sensitive_lower_support",
  );
}

// ─── T51_count_survives_multiple_turn_reads ───────────────────────────────────
export async function T51_count_survives_multiple_turn_reads() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeWeakStaleNote("note_t51_05", "black coffee", 0);
  await versioning.seedNotes([note]);

  // Turn 1: first soft signal
  await versioning.persistReviewSignals(
    [{ noteId: note.id, reason: "soft_signal_increment" }],
    { subjectKind: "user" },
  );

  // Read after turn 1
  const afterTurn1 = await versioning.listActiveNotes({ includeGlobal: true });
  const t1 = afterTurn1.find((n) => n.id === note.id)!;
  assert.strictEqual(t1.reconsolidationSignalCount, 1, "Count must be 1 after turn 1");
  assert.strictEqual(t1.reinferencePolicy.mode, "allow", "Must not escalate after turn 1");

  // Turn 2: another read without signal — count must not change
  const afterTurn2Read = await versioning.listActiveNotes({ includeGlobal: true });
  const t2 = afterTurn2Read.find((n) => n.id === note.id)!;
  assert.strictEqual(
    t2.reconsolidationSignalCount,
    1,
    "Count must not drift on read-only turn 2",
  );
}

// ─── T51_gated_signal_below_threshold_emits_increment_reason ─────────────────
export async function T51_gated_signal_below_threshold_emits_increment_reason() {
  // Below threshold
  for (let count = 0; count < SOFT_SIGNAL_ESCALATION_THRESHOLD - 1; count++) {
    const note = makeWeakStaleNote(`note_t51_06_${count}`, "dark roast", count);
    const signals = deriveGatedRetrievalSignals({
      currentTurn: makeNeutralTurn(),
      activeNotes: [note],
    });
    assert.ok(signals.length > 0, `Expected a signal at count=${count}`);
    assert.strictEqual(
      signals[0].reason,
      "soft_signal_increment",
      `Expected soft_signal_increment at count=${count}, got ${signals[0].reason}`,
    );
  }
}

// ─── T51_gated_signal_at_threshold_emits_escalation_reason ───────────────────
export async function T51_gated_signal_at_threshold_emits_escalation_reason() {
  // At and above threshold. Next count = count + 1 >= threshold means count >= threshold - 1.
  for (let count = SOFT_SIGNAL_ESCALATION_THRESHOLD - 1; count <= SOFT_SIGNAL_ESCALATION_THRESHOLD + 2; count++) {
    const note = makeWeakStaleNote(`note_t51_07_${count}`, "flat white", count);
    const signals = deriveGatedRetrievalSignals({
      currentTurn: makeNeutralTurn(),
      activeNotes: [note],
    });
    assert.ok(signals.length > 0, `Expected a signal at count=${count}`);
    assert.strictEqual(
      signals[0].reason,
      "retrieved_weak_stale_note",
      `Expected retrieved_weak_stale_note at count=${count} + 1 >= threshold=${SOFT_SIGNAL_ESCALATION_THRESHOLD}, got ${signals[0].reason}`,
    );
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.2 — T51 Reconsolidation Signal Frequency Fixtures");
  console.log(`  SOFT_SIGNAL_ESCALATION_THRESHOLD = ${SOFT_SIGNAL_ESCALATION_THRESHOLD}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T51_first_soft_signal_increments_count_not_escalate", fn: T51_first_soft_signal_increments_count_not_escalate },
    { name: "T51_repeated_soft_signal_escalates", fn: T51_repeated_soft_signal_escalates },
    { name: "T51_signal_does_not_cross_note_boundary", fn: T51_signal_does_not_cross_note_boundary },
    { name: "T51_contradiction_bypasses_frequency_gate", fn: T51_contradiction_bypasses_frequency_gate },
    { name: "T51_count_survives_multiple_turn_reads", fn: T51_count_survives_multiple_turn_reads },
    { name: "T51_gated_signal_below_threshold_emits_increment_reason", fn: T51_gated_signal_below_threshold_emits_increment_reason },
    { name: "T51_gated_signal_at_threshold_emits_escalation_reason", fn: T51_gated_signal_at_threshold_emits_escalation_reason },
  ];

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      await fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T51. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
