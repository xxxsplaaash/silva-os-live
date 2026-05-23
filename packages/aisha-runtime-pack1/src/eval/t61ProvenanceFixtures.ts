/**
 * Pack 1.1 — Memory-Strength Hardening
 * Deterministic mocked test suite (no Date.now(), no LLM calls, fixed IDs/timestamps).
 */

import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { SimpleContextBuilder } from "../memory/contextBuilder";
import { deriveCombinedReviewSignals } from "../memory/reactiveReconsolidation";
import type {
  NoteCandidate,
  NoteRecord,
  RetrievalBundle,
  TurnRecord,
} from "../memory/types";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

const FIXED_TS = "2026-04-17T00:00:00.000Z";

function makeCandidate(overrides: Partial<NoteCandidate> = {}): NoteCandidate {
  return {
    subtype: "K_pref",
    canonicalText: "User preference: black coffee",
    normalizedValue: "black coffee",
    confidence: 0.78,
    extractionConfidenceRaw: 0.78,
    provenanceChain: ["heuristic_preference_pattern"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    provenanceReason: "heuristic_preference_pattern",
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: "note_mock_1",
    kind: "note",
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
    sourceModality: "text",
    subtype: "K_pref",
    status: "active",
    canonicalText: "User preference: black coffee",
    normalizedValue: "black coffee",
    confidence: 0.78,
    extractionConfidenceRaw: 0.78,
    provenanceChain: ["heuristic_preference_pattern"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    lastConfirmedAt: FIXED_TS,
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    ...overrides,
  };
}

function makeUserTurn(text: string): TurnRecord {
  return {
    id: "turn_mock_1",
    kind: "turn",
    sessionId: "sess_fixture",
    turnIndex: 0,
    speaker: "user",
    rawText: text,
    stateSnapshotId: "snap_1",
    entityMentions: [],
    immutable: true,
    createdAt: FIXED_TS,
    sourceModality: "text",
  };
}

// ---------------------------------------------------------------------------
// T61_raw_confidence_frozen_on_reinforce
// ---------------------------------------------------------------------------

export async function T61_raw_confidence_frozen_on_reinforce() {
  const versioning = new InMemoryNoteVersioning();

  // Write first candidate (confidence 0.78)
  const first = makeCandidate({
    confidence: 0.78,
    extractionConfidenceRaw: 0.78,
  });
  const { notesWritten: written1 } = await versioning.mergeOrSupersede(first, []);
  const noteId = written1[0].id;

  // Reinforce with same-meaning candidate at higher confidence
  const reinforcing = makeCandidate({
    confidence: 0.91,
    extractionConfidenceRaw: 0.91,
    provenanceReason: "heuristic_preference_pattern",
    sourceEpisodeIds: ["ep_2"],
  });
  const existing = await versioning.listActiveNotes();
  const { notesWritten: written2 } = await versioning.mergeOrSupersede(reinforcing, existing);

  const reinforced = written2.find((n) => n.id === noteId);
  if (!reinforced) throw new Error("Reinforced note not found in written set");

  // Live confidence should have been bumped to max(0.78, 0.91)
  if (reinforced.confidence !== 0.91) {
    throw new Error(`Expected reinforced confidence 0.91, got ${reinforced.confidence}`);
  }

  // extractionConfidenceRaw must remain frozen at original 0.78
  if (reinforced.extractionConfidenceRaw !== 0.78) {
    throw new Error(
      `Expected extractionConfidenceRaw frozen at 0.78, got ${reinforced.extractionConfidenceRaw}`,
    );
  }

  // provenanceChain should have a reinforcement entry appended
  if (!reinforced.provenanceChain.some((e) => e.startsWith("reinforced_ep_"))) {
    throw new Error(
      `Expected provenanceChain to contain a reinforced_ep_ entry, got: ${JSON.stringify(reinforced.provenanceChain)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_joint_gate_episode_override
// ---------------------------------------------------------------------------

export async function T61_joint_gate_episode_override() {
  const versioning = new InMemoryNoteVersioning();

  // Note: confidence = 0.62 (below 0.65 threshold), but 3 source episodes
  const candidate = makeCandidate({
    confidence: 0.62,
    extractionConfidenceRaw: 0.62,
    sourceEpisodeIds: ["ep_1", "ep_2", "ep_3"],
  });
  await versioning.mergeOrSupersede(candidate, []);

  const activeNotes = await versioning.listActiveNotes();

  if (activeNotes.length !== 1) {
    throw new Error(
      `Expected 1 note to pass joint gate (episode override), got ${activeNotes.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_joint_gate_single_episode_fails
// ---------------------------------------------------------------------------

export async function T61_joint_gate_single_episode_fails() {
  const versioning = new InMemoryNoteVersioning();

  // Note: confidence = 0.62, only 1 source episode — must be excluded
  const candidate = makeCandidate({
    confidence: 0.62,
    extractionConfidenceRaw: 0.62,
    sourceEpisodeIds: ["ep_1"],
  });
  await versioning.mergeOrSupersede(candidate, []);

  const activeNotes = await versioning.listActiveNotes();

  if (activeNotes.length !== 0) {
    throw new Error(
      `Expected 0 notes (joint gate should exclude low-confidence single-episode note), got ${activeNotes.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_stale_prompt_annotation
// ---------------------------------------------------------------------------

export async function T61_stale_prompt_annotation() {
  // A note with persisted stale reinferencePolicy must render |STALE in the prompt block
  const staleNote = makeNote({
    id: "note_stale_1",
    reinferencePolicy: {
      mode: "needs_review",
      reason: "retrieved_weak_stale_note",
    },
  });

  const bundle: RetrievalBundle = {
    recentTurns: [],
    activeThread: [],
    activeNotes: [staleNote],
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: {},
  };

  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  if (!stableNotesBlock.includes("|STALE")) {
    throw new Error(
      `Expected prompt block to contain |STALE annotation for a note with reinferencePolicy.reason === "retrieved_weak_stale_note".\nGot:\n${stableNotesBlock}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_fresh_note_no_stale_annotation
// ---------------------------------------------------------------------------

export async function T61_fresh_note_no_stale_annotation() {
  // A note with clean reinferencePolicy (mode: allow) must NOT render |STALE
  const freshNote = makeNote({
    id: "note_fresh_1",
    reinferencePolicy: { mode: "allow" },
  });

  const bundle: RetrievalBundle = {
    recentTurns: [],
    activeThread: [],
    activeNotes: [freshNote],
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: {},
  };

  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  if (stableNotesBlock.includes("|STALE")) {
    throw new Error(
      `Expected prompt block to NOT contain |STALE annotation for a note with clean reinferencePolicy.\nGot:\n${stableNotesBlock}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_combined_signal_cap
// ---------------------------------------------------------------------------

export async function T61_combined_signal_cap() {
  // Build 4 notes: 2 contradiction-sensitive (lower support) + 2 stale-only
  // deriveCombinedReviewSignals must return exactly 2 total (the cap)

  const highSupportNote = makeNote({
    id: "note_high_support",
    canonicalText: "User preference: tea",
    normalizedValue: "tea",
    sourceEpisodeIds: ["ep_1", "ep_2"], // high support
  });

  const lowSupportNote1 = makeNote({
    id: "note_low_1",
    canonicalText: "User preference: tea",
    normalizedValue: "tea",
    sourceEpisodeIds: ["ep_1"], // same track but lower support
  });

  const lowSupportNote2 = makeNote({
    id: "note_low_2",
    canonicalText: "User preference: tea",
    normalizedValue: "tea",
    sourceEpisodeIds: ["ep_1"],
  });

  // Two notes that are stale only (weak + old but not contradiction-sensitive track)
  const staleNote1 = makeNote({
    id: "note_stale_s1",
    canonicalText: "User preference: oat milk",
    normalizedValue: "oat milk",
    confidence: 0.68,
    sourceEpisodeIds: ["ep_old"],
    lastConfirmedAt: "2020-01-01T00:00:00.000Z",
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" },
  });

  const staleNote2 = makeNote({
    id: "note_stale_s2",
    canonicalText: "User preference: almond milk",
    normalizedValue: "almond milk",
    confidence: 0.67,
    sourceEpisodeIds: ["ep_old2"],
    lastConfirmedAt: "2020-01-01T00:00:00.000Z",
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" },
  });

  const activeNotes = [highSupportNote, lowSupportNote1, lowSupportNote2, staleNote1, staleNote2];

  const turn = makeUserTurn("actually I don't drink that anymore"); // contradiction-sensitive turn

  const combined = deriveCombinedReviewSignals({ currentTurn: turn, activeNotes });

  if (combined.length > 2) {
    throw new Error(
      `Expected at most 2 combined signals (cap = MAX_RECONSOLIDATION_SIGNALS_PER_TURN), got ${combined.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// T61_review_budget_ceiling
// ---------------------------------------------------------------------------

export async function T61_review_budget_ceiling() {
  const versioning = new InMemoryNoteVersioning();

  const globalUserScope = {
    subjectKind: "user" as const,
    subjectPersonId: undefined,
    relationshipContextPersonId: undefined,
  };

  // Write the extra note FIRST (before budget fills), so it exists in the store
  const extraCandidate = makeCandidate({
    canonicalText: "User preference: extra_item",
    normalizedValue: "extra_item",
    confidence: 0.75,
    extractionConfidenceRaw: 0.75,
    sourceEpisodeIds: ["ep_extra"],
  });
  const { notesWritten: extraWritten } = await versioning.mergeOrSupersede(extraCandidate, []);
  const extraNoteId = extraWritten[0]?.id;
  if (!extraNoteId) throw new Error("Extra note was not written");

  // Write 10 more notes that will fill the budget
  for (let i = 0; i < 10; i++) {
    const candidate = makeCandidate({
      canonicalText: `User preference: item_${i}`,
      normalizedValue: `item_${i}`,
      confidence: 0.75,
      extractionConfidenceRaw: 0.75,
      sourceEpisodeIds: [`ep_budget_${i}`],
    });
    await versioning.mergeOrSupersede(candidate, []);
  }

  const allNotes = await versioning.listActiveNotes();

  // Stamp exactly 10 scoped notes as needs_review (budget notes, not the extra one)
  const budgetNotes = allNotes.filter((n) => !n.canonicalText.includes("extra_item")).slice(0, 10);
  if (budgetNotes.length < 10) {
    throw new Error(`Expected at least 10 budget notes, found ${budgetNotes.length}`);
  }

  const stamped = await versioning.persistReviewSignals(
    budgetNotes.map((n) => ({ noteId: n.id, reason: "retrieved_weak_stale_note" as const })),
    globalUserScope,
  );
  if (stamped.length < 10) {
    throw new Error(`Expected 10 notes stamped as needs_review, got ${stamped.length}`);
  }

  // Budget is now at ceiling. Trying to persist a signal for the extra note under the same scope
  // must be dropped.
  const dropped = await versioning.persistReviewSignals(
    [{ noteId: extraNoteId, reason: "retrieved_weak_stale_note" }],
    globalUserScope,
  );

  if (dropped.length !== 0) {
    throw new Error(
      `Expected review signal to be dropped when scoped budget is at ceiling (10), but ${dropped.length} note(s) were updated`,
    );
  }

  // Verify cross-scope isolation: a different subjectKind scope is NOT blocked
  const otherScope = {
    subjectKind: "person" as const,
    subjectPersonId: "person_abc",
    relationshipContextPersonId: undefined,
  };

  const personCandidate = makeCandidate({
    canonicalText: "User preference: green tea",
    normalizedValue: "green tea",
    subjectKind: "person",
    subjectPersonId: "person_abc",
    confidence: 0.75,
    extractionConfidenceRaw: 0.75,
    sourceEpisodeIds: ["ep_person_1"],
  });
  const { notesWritten: personWritten } = await versioning.mergeOrSupersede(personCandidate, []);
  const personNoteId = personWritten[0]?.id;
  if (!personNoteId) throw new Error("Person-scoped note was not written");

  const crossScopeResult = await versioning.persistReviewSignals(
    [{ noteId: personNoteId, reason: "retrieved_weak_stale_note" }],
    otherScope,
  );

  if (crossScopeResult.length === 0) {
    throw new Error(
      "Cross-scope review signal was incorrectly blocked. Budget ceiling for user scope must not affect person scope.",
    );
  }
}

