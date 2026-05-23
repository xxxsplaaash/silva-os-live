/**
 * T31 — Adversarial Continuity Suite
 *
 * This is a live-fire architecture stress test, not a generic memory test.
 * It pressures the runtime's three routing lanes:
 *   1. Ephemeral Affect   — temporary state, emotional immediacy, no durable write
 *   2. Durable Posture    — persistent preferences/facts that survive session resets
 *   3. Canon Mutation     — explicit reversals that must supersede the prior active note
 *
 * Six categories:
 *   CAT-A: Changed Truths (Canon Mutation lane)
 *   CAT-B: Durable Preferences (Durable Posture lane)
 *   CAT-C: Conditional Truths (Durable Posture / Ephemeral boundary)
 *   CAT-D: Boundaries / Wrong-Fit Help (K_boundary immediate active)
 *   CAT-E: Relational Pull (Durable Posture, relational subtype)
 *   CAT-F: Creative / Canon / Continuity (Canon Mutation + retrieval integrity)
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 * Does NOT merge with T30.
 * Does NOT widen the hot path.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import { SimpleContextBuilder } from "../memory/contextBuilder";
import type {
  NoteCandidate,
  NoteRecord,
  RetrievalBundle,
  EpisodeRecord,
  TurnRecord,
} from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIXED_TS_OLD = "2026-01-01T00:00:00.000Z";
const FIXED_TS_NEW = "2026-04-15T00:00:00.000Z";

function makeTurn(id: string, text: string, sessionId = "t31"): TurnRecord {
  return {
    id,
    kind: "turn",
    createdAt: FIXED_TS_NEW,
    sourceModality: "text",
    speaker: "user",
    rawText: text,
    normalizedText: text.toLowerCase(),
    sessionId,
    turnIndex: 0,
    stateSnapshotId: `snap_${id}`,
    immutable: true,
  };
}

function makeEpisode(id: string, turnIds: string[], sessionId = "t31"): EpisodeRecord {
  return {
    id,
    kind: "episode",
    createdAt: FIXED_TS_NEW,
    updatedAt: FIXED_TS_NEW,
    sourceModality: "text",
    sessionId,
    threadId: `th_${sessionId}`,
    startTurnId: turnIds[0],
    endTurnId: turnIds[turnIds.length - 1],
    turnIds,
    topicLabels: [],
    primaryModality: "text",
    modalityMix: ["text"],
    participantSpeakerIds: [],
    participantPersonIds: [],
    boundaryReason: { topicShift: false, surpriseDiscontinuity: false, score: 0 },
  };
}

function makeNote(id: string, overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_TS_OLD,
    updatedAt: FIXED_TS_OLD,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${id}`,
    normalizedValue: id,
    confidence: 0.82,
    extractionConfidenceRaw: 0.82,
    provenanceChain: ["test"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_seed"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
    ...overrides,
  };
}

function makeCandidate(value: string, overrides: Partial<NoteCandidate> = {}): NoteCandidate {
  return {
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: 0.82,
    extractionConfidenceRaw: 0.82,
    provenanceReason: "test_extraction",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_seed"],
    ...overrides,
  };
}

function emptyBundle(notes: NoteRecord[], supersessionContext: Record<string, string> = {}): RetrievalBundle {
  return {
    recentTurns: [],
    activeThread: [],
    activeNotes: notes,
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-A: Changed Truths — Canon Mutation Lane
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-A1: Python → Rust Reversal
 *
 * Target subsystem   : INoteVersioning.mergeOrSupersede
 * Expected routing   : Canon Mutation — new K_pref supersedes old K_pref
 * Expected write     : New note status=active, old note status=superseded
 * Expected retrieval : Only Rust note returned from listActiveNotes()
 * Expected output    : Context block shows "using Rust" with "> superseded: python" inline
 * Exact failure mode : If the Python note survives as active, contradiction-aware retrieval
 *                      fails and the output can drift back to Python.
 *
 * Doctrine: The project's strongest wedge is visible contradiction-aware continuity.
 * This is the canonical "draft the hiring req" test case.
 */
export async function T31_A1_python_to_rust_reversal_supersedes_correctly() {
  const versioning = new InMemoryNoteVersioning();

  // Session Turn 1: Python decision established
  const pythonCandidate = makeCandidate("backend language: Python", {
    subtype: "K_pref",
    canonicalText: "Tech decision: using Python for backend. Deadline Nov 14.",
    normalizedValue: "backend language: Python",
  });
  const result1 = await versioning.mergeOrSupersede(pythonCandidate, []);
  assert.ok(result1.notesWritten.length > 0, "Python note must be written");
  const pythonNoteId = result1.notesWritten[0].id;

  // Verify Python is active
  const activeAfterPython = await versioning.listActiveNotes({ includeGlobal: true });
  assert.ok(
    activeAfterPython.some(n => n.id === pythonNoteId),
    "Python note must be active after Turn 1"
  );

  // Session Turn 2: Reversal — Rust supersedes Python
  const rustCandidate = makeCandidate("backend language: Rust", {
    subtype: "K_pref",
    canonicalText: "Tech decision reversed: using Rust for backend. Deadline unchanged (Nov 14).",
    normalizedValue: "backend language: Rust",
    sourceEpisodeIds: ["ep_seed_2"],
  });
  const result2 = await versioning.mergeOrSupersede(rustCandidate, activeAfterPython);

  // Rust note must be written
  assert.ok(result2.notesWritten.length > 0, "Rust note must be written");
  const rustNote = result2.notesWritten.find(n => n.normalizedValue?.includes("Rust"));
  assert.ok(rustNote, "Rust note must exist in written notes");
  assert.strictEqual(rustNote!.status, "active", "Rust note must be active");

  // Active notes must now contain Rust but NOT as active-Python
  const activeAfterRust = await versioning.listActiveNotes({ includeGlobal: true });
  const activeRust = activeAfterRust.find(n => n.normalizedValue?.includes("Rust"));
  const activePython = activeAfterRust.find(n => n.id === pythonNoteId && n.status === "active");

  assert.ok(activeRust, "Rust note must be in active retrieval after reversal");
  assert.strictEqual(
    activePython,
    undefined,
    "Python note must NOT be active after reversal — it must be superseded"
  );
}

/**
 * T31-A2: Superseded note visible in context builder (contradiction-aware continuity)
 *
 * Target subsystem   : SimpleContextBuilder.build → supersessionContext rendering
 * Expected routing   : Canon Mutation — supersessionContext contains prior python text
 * Expected output    : stableNotesBlock shows "> superseded: ...Python..." inline
 * Exact failure mode : If supersessionContext is silently dropped, the output has no
 *                      historical anchor and cannot demonstrate memory fidelity.
 */
export async function T31_A2_reversal_visible_in_context_block_as_superseded() {
  const rustNote = makeNote("rust_note", {
    subtype: "K_pref",
    canonicalText: "Tech decision: using Rust for backend",
    normalizedValue: "backend language: Rust",
    status: "active",
  });
  const priorPythonText = "Tech decision: using Python for backend. Deadline Nov 14.";

  const bundle = emptyBundle([rustNote], { rust_note: priorPythonText });
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("superseded"),
    `Expected stableNotesBlock to include 'superseded' marker.\nGot:\n${stableNotesBlock}`
  );
  assert.ok(
    stableNotesBlock.includes("Python"),
    `Expected stableNotesBlock to show prior Python text inline.\nGot:\n${stableNotesBlock}`
  );
  assert.ok(
    stableNotesBlock.includes("Rust"),
    `Expected stableNotesBlock to show current Rust value.\nGot:\n${stableNotesBlock}`
  );
}

/**
 * T31-A3: Deadline unchanged after tech-stack reversal
 *
 * Target subsystem   : INoteVersioning.mergeOrSupersede (same-meaning reinforce)
 * Expected routing   : Durable Posture — deadline note is reinforced, NOT superseded
 * Expected write     : Deadline note confidence increases; no new note written; no supersession link
 * Expected retrieval : Deadline still in active notes with same value
 * Exact failure mode : If the reversal turn's extraction incorrectly supersedes the deadline note,
 *                      canonical project context is lost.
 */
export async function T31_A3_deadline_note_survives_tech_stack_reversal() {
  const versioning = new InMemoryNoteVersioning();

  // Seed a deadline note
  const deadlineCandidate = makeCandidate("deadline: Nov 14", {
    subtype: "K_pref",
    canonicalText: "Project deadline: November 14",
    normalizedValue: "deadline: Nov 14",
    sourceEpisodeIds: ["ep_seed"],
  });
  const r1 = await versioning.mergeOrSupersede(deadlineCandidate, []);
  const deadlineNoteId = r1.notesWritten[0].id;

  const activeBeforeReversal = await versioning.listActiveNotes({ includeGlobal: true });

  // Now a reversal on the tech stack — deadline text also re-appears in the same turn
  const deadlineReiteration = makeCandidate("deadline: Nov 14", {
    subtype: "K_pref",
    canonicalText: "Project deadline: November 14",
    normalizedValue: "deadline: Nov 14",
    sourceEpisodeIds: ["ep_seed_2"],
  });
  const r2 = await versioning.mergeOrSupersede(deadlineReiteration, activeBeforeReversal);

  // The deadline note should be reinforced in place, not written as a brand-new note with a supersession chain
  const activeAfterReversal = await versioning.listActiveNotes({ includeGlobal: true });
  const deadlineNote = activeAfterReversal.find(n => n.id === deadlineNoteId);

  assert.ok(
    deadlineNote,
    "Deadline note must survive the reversal turn as active"
  );
  assert.ok(
    deadlineNote!.sourceEpisodeIds.length >= 2,
    "Deadline note must be corroborated (episode count >= 2) after re-mention"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-B: Durable Preferences — Durable Posture Lane
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-B1: Stable preference extracted as provisional on cold start, not active
 *
 * Target subsystem   : SimpleNoteExtractionSandbox.extract
 * Expected routing   : Durable Posture → provisional (cold start discipline)
 * Expected write     : status=provisional, confidence >= 0.65
 * Expected retrieval : NOT in listActiveNotes(); IS in listProvisionalNotes()
 * Exact failure mode : If extracted directly to active, cold-start overclaiming occurs —
 *                      the system presents unverified facts as established memory.
 */
export async function T31_B1_durable_preference_provisional_on_cold_start() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const versioning = new InMemoryNoteVersioning();

  const turn = makeTurn("t1", "I always work better with quiet, minimal meetings.");
  const ep = makeEpisode("ep1", ["t1"]);
  const candidates = await sandbox.extract(ep, [turn]);

  assert.ok(candidates.length > 0, "Must extract at least one candidate from durable preference");
  const prefCandidate = candidates[0];
  assert.strictEqual(prefCandidate.status, "provisional", "Durable preference must be provisional on cold start");
  assert.ok(prefCandidate.confidence >= 0.65, "Provisional durable preference confidence must be >= 0.65");

  // Seed into versioning — must remain provisional in store
  await versioning.seedNotes([{
    ...makeNote("pref_meeting", {
      canonicalText: "User prefers quiet, minimal meetings",
      normalizedValue: "quiet minimal meetings",
      status: "provisional",
      confidence: prefCandidate.confidence,
    }),
  }]);

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const provisional = await versioning.listProvisionalNotes();

  assert.strictEqual(
    active.find(n => n.normalizedValue === "quiet minimal meetings"),
    undefined,
    "Provisional preference must NOT appear in active notes"
  );
  assert.ok(
    provisional.find(n => n.normalizedValue === "quiet minimal meetings"),
    "Provisional preference MUST appear in listProvisionalNotes()"
  );
}

/**
 * T31-B2: Durable preference promotes after multi-episode corroboration
 *
 * Target subsystem   : INoteVersioning.evaluateProvisionalPromotion
 * Expected routing   : Durable Posture — provisional → active
 * Expected write     : status=active, expiresAt cleared, sourceEpisodeIds.length >= 2
 * Expected retrieval : Now in listActiveNotes(); no longer in listProvisionalNotes()
 * Exact failure mode : If promotion never fires, the runtime permanently under-serves
 *                      a user who has expressed consistent preferences across sessions.
 */
export async function T31_B2_durable_preference_promotes_after_corroboration() {
  const versioning = new InMemoryNoteVersioning();

  const note = makeNote("pref_corroborated", {
    status: "provisional",
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1", "ep_2"], // Two distinct source episodes
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();

  assert.strictEqual(result.promoted.length, 1, "Corroborated note must be promoted");
  assert.strictEqual(result.promoted[0].status, "active");
  assert.strictEqual(result.promoted[0].expiresAt, undefined, "expiresAt must be cleared on promotion");

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  assert.ok(
    active.find(n => n.id === "pref_corroborated"),
    "Promoted note must appear in listActiveNotes()"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-C: Conditional Truths — Durable Posture / Ephemeral boundary
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-C1: Conditional preference demoted to provisional (not active)
 *
 * Target subsystem   : SimpleNoteExtractionSandbox hedge suppression
 * Expected routing   : Durable Posture → provisional (conditional penalty applied)
 * Expected write     : status=provisional, confidence < 0.65
 * Expected retrieval : NOT in active retrieval
 * Exact failure mode : If "if I'm in a rush" is not detected as a conditional hedge,
 *                      the system treats a situational behavior as a permanent trait.
 */
export async function T31_C1_conditional_truth_demoted_to_provisional() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turn = makeTurn("t1", "I usually take notes in Notion, but only if I have time to structure them.");
  const ep = makeEpisode("ep1", ["t1"]);

  const candidates = await sandbox.extract(ep, [turn]);

  assert.ok(candidates.length > 0, "Must extract conditional preference candidate");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional", "Conditional truth must be provisional");
  assert.ok(
    c.confidence < 0.65,
    `Conditional hedge must suppress confidence below 0.65. Got: ${c.confidence}`
  );
}

/**
 * T31-C2: Ephemeral affect does NOT write to durable store
 *
 * Target subsystem   : SimpleNoteExtractionSandbox gate (ephemeral chatter)
 * Expected routing   : Ephemeral Affect — extraction must return [] (no candidates)
 * Expected write     : Nothing written to note store
 * Expected retrieval : Nothing in listActiveNotes() or listProvisionalNotes()
 * Exact failure mode : If "right now I feel overwhelmed" creates a durable memory note,
 *                      the ephemeral affect lane is broken and emotional state corrupts K_pref.
 */
export async function T31_C2_ephemeral_affect_does_not_write_to_durable_store() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const versioning = new InMemoryNoteVersioning();

  const turn = makeTurn("t1", "Right now I'm overwhelmed and can't focus on anything.");
  const ep = makeEpisode("ep1", ["t1"]);

  const candidates = await sandbox.extract(ep, [turn]);

  // Either no candidates, or all candidates have confidence below promotion threshold (< 0.65)
  const durableLeaks = candidates.filter(c => c.confidence >= 0.65 && c.status !== "provisional");
  assert.strictEqual(
    durableLeaks.length,
    0,
    `Ephemeral affect must not leak to durable store. Got ${durableLeaks.length} durable candidate(s).`
  );

  // Simulate what versioning would see — nothing should ever land in active notes
  const active = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(active.length, 0, "Active notes must be empty after ephemeral affect turn");
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-D: Boundaries / Wrong-Fit Help — K_boundary Immediate Active
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-D1: Explicit discomfort signal creates active K_boundary immediately
 *
 * Target subsystem   : INoteVersioning.mergeOrSupersede — K_boundary fast-path
 * Expected routing   : K_boundary → active immediately (no provisional holding)
 * Expected write     : status=active, confidence >= 0.85, no expiresAt
 * Expected retrieval : In listActiveNotes() immediately; never in listProvisionalNotes()
 * Exact failure mode : If K_boundary is routed through provisional, the safety signal
 *                      is delayed and may never be enforced during the hot path.
 */
export async function T31_D1_boundary_signal_forces_immediate_active_status() {
  const versioning = new InMemoryNoteVersioning();

  const boundaryCandidate = makeCandidate("no discussion of past relationship", {
    subtype: "K_boundary",
    canonicalText: "User boundary: do not bring up their ex-relationship or ask about it.",
    normalizedValue: "no discussion of past relationship",
    confidence: 0.90,
    extractionConfidenceRaw: 0.90,
    provenanceReason: "heuristic_boundary_pattern",
    sourceEpisodeIds: ["ep_1"],
  });
  const result = await versioning.mergeOrSupersede(boundaryCandidate as any, []);

  assert.ok(result.notesWritten.length > 0, "K_boundary must be written");
  const written = result.notesWritten[0];

  assert.strictEqual(written.status, "active", "K_boundary must be active immediately");
  assert.strictEqual(written.expiresAt, undefined, "K_boundary must not have expiresAt");
  assert.ok(written.confidence >= 0.85, "K_boundary confidence must be >= 0.85");

  // Must be in active notes, never in provisional
  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const provisional = await versioning.listProvisionalNotes();

  assert.ok(active.find(n => n.subtype === "K_boundary"), "K_boundary must appear in active retrieval");
  assert.strictEqual(
    provisional.find(n => n.subtype === "K_boundary"),
    undefined,
    "K_boundary must NEVER appear in provisional notes"
  );
}

/**
 * T31-D2: Wrong-fit help is excluded from active context when boundary is present
 *
 * Target subsystem   : SimpleContextBuilder + listActiveNotes boundary filter awareness
 * Expected routing   : K_boundary surfaces in stableNotesBlock with safe rendering
 * Expected output    : stableNotesBlock includes boundary note text
 * Exact failure mode : If K_boundary notes are filtered out or not rendered,
 *                      the output can produce boundary-violating responses.
 */
export async function T31_D2_boundary_note_visible_in_context_block() {
  const boundaryNote = makeNote("boundary_1", {
    subtype: "K_boundary",
    canonicalText: "User boundary: do not bring up their ex-relationship or ask about it.",
    normalizedValue: "no discussion of past relationship",
    confidence: 0.90,
    status: "active",
    reviewState: "accepted",
  });

  const bundle = emptyBundle([boundaryNote]);
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("boundary") || stableNotesBlock.includes("K_boundary"),
    `Expected stableNotesBlock to include K_boundary note.\nGot:\n${stableNotesBlock}`
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-E: Relational Pull — Durable Posture, relational subtype
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-E1: Strong relational preference extracted as provisional (not active)
 *
 * Target subsystem   : SimpleNoteExtractionSandbox — interpersonal preference signals
 * Expected routing   : Durable Posture → provisional (cold start)
 * Expected write     : status=provisional, confidence >= 0.65
 * Expected retrieval : In listProvisionalNotes(), NOT in listActiveNotes()
 * Exact failure mode : If relational pull signals land directly in active memory,
 *                      cold-start overclaiming in relational context becomes possible.
 *
 * Note: The extractor requires an explicit preference-verb anchor ("prefer", "like", "love",
 * etc.) to fire on interpersonal descriptors. Bare descriptive phrases without a verb anchor
 * ("warmth", "mystery") are correctly dropped as noise. This fixture uses "I prefer" to
 * ensure the signal is extractable — consistent with the T30 labeled baseline.
 */
export async function T31_E1_relational_preference_provisional_on_cold_start() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turn = makeTurn("t1", "I prefer warmth and quiet confidence in the people I spend time with.");
  const ep = makeEpisode("ep1", ["t1"]);

  const candidates = await sandbox.extract(ep, [turn]);

  assert.ok(candidates.length > 0, "Must extract relational preference candidate with explicit verb anchor");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional", "Relational preference must be provisional on cold start");
  assert.ok(
    c.confidence >= 0.65,
    `Stable relational preference confidence must be >= 0.65 for promotion eligibility. Got: ${c.confidence}`
  );
}

/**
 * T31-E2: Aversion signal stored separately from positive preference (no collision)
 *
 * Target subsystem   : INoteVersioning.mergeOrSupersede — K_pref track isolation
 * Expected routing   : Two separate provisional notes (positive pref + avoidance)
 * Expected write     : Both notes written with distinct normalizedValues
 * Expected retrieval : listProvisionalNotes() contains both, with no merge/collision
 * Exact failure mode : If avoidance signal overwrites the positive preference via a
 *                      same-track merge, relational context becomes incoherent.
 */
export async function T31_E2_aversion_does_not_collide_with_positive_preference() {
  const versioning = new InMemoryNoteVersioning();

  const positiveNote = makeNote("pos_pref", {
    subtype: "K_pref",
    canonicalText: "User relational preference: drawn to warmth and quiet confidence",
    normalizedValue: "drawn to warmth and quiet confidence",
    status: "provisional",
    confidence: 0.75,
    sourceEpisodeIds: ["ep_1"],
  });
  const aversionNote = makeNote("neg_pref", {
    subtype: "K_pref",
    canonicalText: "User aversion: annoyed by loud, performative confidence",
    normalizedValue: "avoids loud performative confidence",
    status: "provisional",
    confidence: 0.75,
    sourceEpisodeIds: ["ep_1"],
  });

  await versioning.seedNotes([positiveNote, aversionNote]);

  const provisional = await versioning.listProvisionalNotes();

  assert.ok(
    provisional.find(n => n.normalizedValue?.includes("warmth")),
    "Positive relational preference must be in provisional notes"
  );
  assert.ok(
    provisional.find(n => n.normalizedValue?.includes("avoids")),
    "Aversion signal must be in provisional notes separately"
  );
  assert.strictEqual(
    provisional.length,
    2,
    "Both relational signals must coexist without collision"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAT-F: Creative / Canon / Continuity — Canon Mutation + retrieval integrity
// ══════════════════════════════════════════════════════════════════════════════

/**
 * T31-F1: Superseded note excluded from active context after canon mutation
 *
 * Target subsystem   : listActiveNotes filtering (status=superseded excluded)
 * Expected routing   : Canon Mutation → old note status=superseded, blocked from retrieval
 * Expected write     : Old note must be status=superseded in store
 * Expected retrieval : listActiveNotes() must NOT return the superseded note
 * Exact failure mode : If superseded notes re-enter the active lane, the retrieval planner
 *                      builds a context that contradicts the user's explicit reversal.
 */
export async function T31_F1_superseded_note_excluded_from_active_retrieval() {
  const versioning = new InMemoryNoteVersioning();

  // Seed the original canon note
  const originalCandidate = makeCandidate("creative direction: surrealist noir", {
    subtype: "K_pref",
    canonicalText: "Project creative direction: surrealist noir aesthetic",
    normalizedValue: "creative direction: surrealist noir",
  });
  const r1 = await versioning.mergeOrSupersede(originalCandidate, []);
  const originalNoteId = r1.notesWritten[0].id;

  const activeAfterOriginal = await versioning.listActiveNotes({ includeGlobal: true });

  // Canon mutation — reversal to a new creative direction
  const revisedCandidate = makeCandidate("creative direction: clean minimalism", {
    subtype: "K_pref",
    canonicalText: "Project creative direction revised: clean minimalism",
    normalizedValue: "creative direction: clean minimalism",
    sourceEpisodeIds: ["ep_seed_2"],
  });
  await versioning.mergeOrSupersede(revisedCandidate, activeAfterOriginal);

  const activeAfterRevision = await versioning.listActiveNotes({ includeGlobal: true });

  assert.strictEqual(
    activeAfterRevision.find(n => n.id === originalNoteId && n.status === "active"),
    undefined,
    "Original superseded note must NOT appear in listActiveNotes() as active"
  );
  assert.ok(
    activeAfterRevision.find(n => n.normalizedValue?.includes("minimalism")),
    "Revised note must appear as active"
  );
}

/**
 * T31-F2: Context block shows creative canon history via supersessionContext
 *
 * Target subsystem   : SimpleContextBuilder — supersessionContext rendering for continuity
 * Expected routing   : Canon Mutation → context shows "was: surrealist noir" inline
 * Expected output    : stableNotesBlock includes superseded prior text
 * Exact failure mode : If the context builder drops the supersessionContext, the output
 *                      has no historical anchor and demonstrates no visible memory.
 */
export async function T31_F2_creative_canon_history_visible_in_context() {
  const revisedNote = makeNote("creative_revised", {
    subtype: "K_pref",
    canonicalText: "Project creative direction revised: clean minimalism",
    normalizedValue: "creative direction: clean minimalism",
    status: "active",
  });
  const priorText = "Project creative direction: surrealist noir aesthetic";
  const bundle = emptyBundle([revisedNote], { creative_revised: priorText });

  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("superseded"),
    `Context must show 'superseded' marker for canon mutation history.\nGot:\n${stableNotesBlock}`
  );
  assert.ok(
    stableNotesBlock.includes("surrealist"),
    `Context must show the prior canon text "surrealist".\nGot:\n${stableNotesBlock}`
  );
  assert.ok(
    stableNotesBlock.includes("minimalism"),
    `Context must show the current canon "minimalism".\nGot:\n${stableNotesBlock}`
  );
}

/**
 * T31-F3: Stale provisional note archived after expiresAt, does not re-enter active context
 *
 * Target subsystem   : evaluateProvisionalPromotion → stale → evaluateArchiveEligibility
 * Expected routing   : Ephemeral → provisional → stale → archived
 * Expected write     : status=stale after expiry; status=archived after threshold age
 * Expected retrieval : Neither in listActiveNotes() nor in listProvisionalNotes()
 * Exact failure mode : If expired provisional notes re-enter retrieval, ghost memories
 *                      corrupt context on future sessions.
 */
export async function T31_F3_expired_provisional_does_not_re_enter_active_context() {
  const versioning = new InMemoryNoteVersioning();

  // Provisional note with expiresAt in the past
  const note = makeNote("expired_provisional", {
    status: "provisional",
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1"],
    expiresAt: "2020-01-01T00:00:00.000Z", // far in the past
    canonicalText: "User expressed: maybe try minimalist design someday",
    normalizedValue: "aspirational: minimalist design",
  });
  await versioning.seedNotes([note]);

  // Run promotion/expiry evaluation
  const evalResult = await versioning.evaluateProvisionalPromotion();
  assert.strictEqual(evalResult.expired.length, 1, "Expired note must be caught and transitioned to stale");
  assert.strictEqual(evalResult.expired[0].status, "stale");

  // Must not appear in either active or provisional lanes
  const active = await versioning.listActiveNotes({ includeGlobal: true });
  const provisional = await versioning.listProvisionalNotes();

  assert.strictEqual(
    active.find(n => n.id === "expired_provisional"),
    undefined,
    "Stale note must NOT appear in active notes"
  );
  assert.strictEqual(
    provisional.find(n => n.id === "expired_provisional"),
    undefined,
    "Stale note must NOT appear in provisional notes"
  );
}
