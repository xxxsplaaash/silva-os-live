/**
 * T13 — Visible Continuity Surfacing Fixtures
 *
 * Pack 1.7 coverage. Tests:
 *   1.  fresh note (no supersession) renders without "superseded:" line
 *   2.  superseding note shows "was: <prior text>" inline
 *   3.  visible continuity is present on the very next retrieval turn after supersession
 *   4.  superseded text is truncated/sanitized (not a history essay)
 *   5.  supersession context does not corrupt source truth (active note canonicalText unchanged)
 *   6.  multiple notes: only the one with a supersession link shows "superseded:"
 *   7.  stale annotation and "superseded:" can coexist on the same note
 *   8.  supersessionContext is empty when no links exist
 *   9.  listSupersededByIds returns empty for notes with no supersedes link
 *   10. listSupersededByIds returns correct text for notes with supersedes link
 *   11. rejected note still shows its supersession context (not filtered from context output)
 *   12. reinforce (same meaning) does NOT create a supersedes link → no "superseded:" shown
 *   13. stale note in supersession chain: "superseded:" uses canonicalText, not normalized value
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { SimpleContextBuilder } from "../memory/contextBuilder";
import type { NoteCandidate, NoteRecord, RetrievalBundle } from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIXED_TS_OLD = "2026-01-01T00:00:00.000Z";
const FIXED_TS_NEW = "2026-04-15T00:00:00.000Z";

function makeCandidate(
  value: string,
  overrides: Partial<NoteCandidate> = {},
): NoteCandidate {
  return {
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: 0.82,
    extractionConfidenceRaw: 0.82,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_01"],
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: "note_base",
    kind: "note",
    createdAt: FIXED_TS_NEW,
    updatedAt: FIXED_TS_NEW,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: "User preference: oat lattes",
    normalizedValue: "oat lattes",
    confidence: 0.82,
    extractionConfidenceRaw: 0.82,
    provenanceChain: [],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_01"],
    lastConfirmedAt: FIXED_TS_NEW,
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
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

// ─── T13_fresh_note_no_was_line ───────────────────────────────────────────────

export async function T13_fresh_note_no_was_line() {
  const note = makeNote();
  const bundle = emptyBundle([note]);
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    !stableNotesBlock.includes("> superseded:"),
    `Expected no 'superseded:' line for a note with no supersession context.\nGot:\n${stableNotesBlock}`,
  );
}

// ─── T13_superseding_note_shows_was_line ─────────────────────────────────────

export async function T13_superseding_note_shows_was_line() {
  const note = makeNote({ id: "note_new" });
  const priorText = "User preference: black coffee";
  const bundle = emptyBundle([note], { note_new: priorText });
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("> superseded:"),
    `Expected 'superseded:' line when supersessionContext contains an entry for this note.\nGot:\n${stableNotesBlock}`,
  );
  assert.ok(
    stableNotesBlock.includes("black coffee"),
    `Expected suppressed prior text "black coffee" to appear in the 'superseded:' line.\nGot:\n${stableNotesBlock}`,
  );
}

// ─── T13_continuity_on_next_retrieval_turn ───────────────────────────────────

export async function T13_continuity_on_next_retrieval_turn() {
  const versioning = new InMemoryNoteVersioning();

  // First extraction: prefers dairy
  // Pack 2.6: contradiction is narrowly scoped to avoidance/negation opposites.
  // "dairy" is contradicted by "avoids dairy" — this triggers real supersession.
  await versioning.mergeOrSupersede(makeCandidate("dairy"), []);
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });

  // Second extraction: avoids dairy (real contradiction — supersedes dairy)
  await versioning.mergeOrSupersede(
    makeCandidate("avoids dairy"),
    afterFirst,
  );

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(activeNotes.length, 1, "Only one active note should remain");

  const supersessionContext = await versioning.listSupersededByIds(
    activeNotes.map((n) => n.id),
  );

  assert.ok(
    Object.keys(supersessionContext).length > 0,
    "supersessionContext must be non-empty after supersession",
  );

  const priorText = Object.values(supersessionContext)[0];
  assert.ok(
    priorText.includes("dairy"),
    `Prior text must reference the superseded note.\nGot: "${priorText}"`,
  );

  // Render the bundle as the context builder would
  const bundle = emptyBundle(activeNotes, supersessionContext);
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("avoids dairy"),
    "Updated truth (avoids dairy) must appear in context",
  );
  assert.ok(
    stableNotesBlock.includes("> superseded:"),
    "Visible continuity 'superseded:' line must appear on next retrieval turn",
  );
  assert.ok(
    stableNotesBlock.includes("dairy"),
    "Superseded truth must be visible via 'superseded:' line",
  );
}

// ─── T13_superseded_text_is_bounded ──────────────────────────────────────────

export async function T13_superseded_text_is_bounded() {
  const veryLongPriorText = "User preference: " + "x".repeat(200);
  const note = makeNote({ id: "note_bounded" });
  const bundle = emptyBundle([note], { note_bounded: veryLongPriorText });
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  // The total output line including > superseded: prefix must not be a bloated history essay
  const wasLine = stableNotesBlock.split("\n").find((l) => l.trim().startsWith("> superseded:"));
  assert.ok(wasLine, "Expected a 'superseded:' line in output");
  assert.ok(
    wasLine.length < 220,
    `'superseded:' line must be bounded in length (< 220 chars), got ${wasLine.length}:\n${wasLine}`,
  );
}

// ─── T13_supersession_does_not_corrupt_canonical_text ────────────────────────

export async function T13_supersession_does_not_corrupt_canonical_text() {
  const versioning = new InMemoryNoteVersioning();

  // Pack 2.6: use real avoidance contradiction pair
  await versioning.mergeOrSupersede(makeCandidate("dairy"), []);
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });
  await versioning.mergeOrSupersede(makeCandidate("avoids dairy"), afterFirst);

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(activeNotes.length, 1);

  const [active] = activeNotes;
  assert.strictEqual(
    active.canonicalText,
    "User preference: avoids dairy",
    "Active note canonicalText must not contain superseded truth",
  );
  assert.ok(
    !active.canonicalText.includes("dairy") || active.canonicalText.includes("avoids dairy"),
    "Active note canonicalText must not be polluted with prior text",
  );
}

// ─── T13_multiple_notes_only_superseding_shows_was ───────────────────────────

export async function T13_multiple_notes_only_superseding_shows_was() {
  const noteWithSupersession = makeNote({ id: "note_w_super" });
  const noteWithoutSupersession = makeNote({
    id: "note_fresh",
    canonicalText: "User profile: obsessive about concise plans",
    subtype: "K_profile",
  });

  const bundle = emptyBundle(
    [noteWithSupersession, noteWithoutSupersession],
    { note_w_super: "User preference: black coffee" },
  );

  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  const wasLines = stableNotesBlock.split("\n").filter((l) => l.trim().startsWith("> superseded:"));
  assert.strictEqual(
    wasLines.length,
    1,
    `Expected exactly 1 'superseded:' line (only the superseding note), got ${wasLines.length}:\n${stableNotesBlock}`,
  );
}

// ─── T13_stale_and_was_can_coexist ───────────────────────────────────────────

export async function T13_stale_and_was_can_coexist() {
  const staleNote = makeNote({
    id: "note_stale_super",
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" },
  });

  const bundle = emptyBundle(
    [staleNote],
    { note_stale_super: "User preference: black coffee" },
  );

  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);

  assert.ok(
    stableNotesBlock.includes("|STALE"),
    "STALE annotation must appear on stale note",
  );
  assert.ok(
    stableNotesBlock.includes("> superseded:"),
    "'superseded:' line must also appear (stale + supersession coexist)",
  );
}

// ─── T13_supersession_context_empty_no_links ─────────────────────────────────

export async function T13_supersession_context_empty_no_links() {
  const versioning = new InMemoryNoteVersioning();
  await versioning.mergeOrSupersede(makeCandidate("oat lattes"), []);

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  const supersessionContext = await versioning.listSupersededByIds(
    activeNotes.map((n) => n.id),
  );

  assert.deepStrictEqual(
    supersessionContext,
    {},
    "supersessionContext must be empty when no supersedes links exist",
  );
}

// ─── T13_list_superseded_by_ids_returns_empty_for_no_link ────────────────────

export async function T13_list_superseded_by_ids_returns_empty_for_no_link() {
  const versioning = new InMemoryNoteVersioning();
  const result = await versioning.listSupersededByIds(["nonexistent_note_id"]);
  assert.deepStrictEqual(
    result,
    {},
    "listSupersededByIds must return empty map for unknown noteIds",
  );
}

// ─── T13_list_superseded_by_ids_returns_prior_text ───────────────────────────

export async function T13_list_superseded_by_ids_returns_prior_text() {
  const versioning = new InMemoryNoteVersioning();

  // Pack 2.6: use real avoidance contradiction pair
  await versioning.mergeOrSupersede(makeCandidate("dairy"), []);
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });
  await versioning.mergeOrSupersede(makeCandidate("avoids dairy"), afterFirst);

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(activeNotes.length, 1);

  const result = await versioning.listSupersededByIds([activeNotes[0].id]);
  assert.strictEqual(
    Object.keys(result).length,
    1,
    "Must return one entry for the superseding note",
  );
  assert.ok(
    result[activeNotes[0].id].includes("dairy"),
    `Prior text must mention "dairy".\nGot: ${result[activeNotes[0].id]}`,
  );
}

// ─── T13_rejected_note_supersession_still_in_context ────────────────────────

export async function T13_rejected_note_supersession_still_in_context() {
  // Even if the superseding note is later rejected (gated), the supersession
  // context lookup itself is pure read — it returns whatever was stored.
  const versioning = new InMemoryNoteVersioning();

  // Pack 2.6: use real avoidance contradiction pair
  await versioning.mergeOrSupersede(makeCandidate("dairy"), []);
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });

  const { notesWritten } = await versioning.mergeOrSupersede(
    makeCandidate("avoids dairy"),
    afterFirst,
    { trust: -0.5, caution: 0 },
  );
  const supersingNoteId = notesWritten.find((n) => n.status === "active")!.id;

  // Check supersession context is available even before operator review
  const result = await versioning.listSupersededByIds([supersingNoteId]);
  assert.ok(
    result[supersingNoteId]?.includes("dairy"),
    "supersessionContext must be available regardless of gating state",
  );
}

// ─── T13_reinforce_does_not_create_supersedes_link ───────────────────────────

export async function T13_reinforce_does_not_create_supersedes_link() {
  const versioning = new InMemoryNoteVersioning();

  // First extraction
  await versioning.mergeOrSupersede(makeCandidate("oat lattes"), []);
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });

  // Reinforce (same meaning, same track)
  await versioning.mergeOrSupersede(
    makeCandidate("oat lattes", { sourceEpisodeIds: ["ep_02"] }),
    afterFirst,
  );

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(activeNotes.length, 1, "Reinforce must not create a new note");

  // supersessionContext must be empty — reinforce does not supersede
  const supersessionContext = await versioning.listSupersededByIds(
    activeNotes.map((n) => n.id),
  );

  assert.deepStrictEqual(
    supersessionContext,
    {},
    "Reinforce must not create a supersedes link → supersessionContext must be empty",
  );

  // Verify no "superseded:" line in context
  const bundle = emptyBundle(activeNotes, supersessionContext);
  const builder = new SimpleContextBuilder();
  const { stableNotesBlock } = builder.build(bundle);
  assert.ok(
    !stableNotesBlock.includes("> superseded:"),
    "Reinforced note must not show a 'superseded:' line",
  );
}

// ─── T13_was_uses_canonical_text_not_normalized_value ────────────────────────

export async function T13_was_uses_canonical_text_not_normalized_value() {
  const versioning = new InMemoryNoteVersioning();

  // Pack 2.6: use real avoidance contradiction pair
  // First note has a rich canonicalText
  await versioning.mergeOrSupersede(
    makeCandidate("dairy", {
      canonicalText: "User preference: RICH canonical text for dairy extraction",
    }),
    [],
  );
  const afterFirst = await versioning.listActiveNotes({ includeGlobal: true });
  await versioning.mergeOrSupersede(makeCandidate("avoids dairy"), afterFirst);

  const activeNotes = await versioning.listActiveNotes({ includeGlobal: true });
  const result = await versioning.listSupersededByIds([activeNotes[0].id]);

  const priorText = result[activeNotes[0].id];
  assert.ok(
    priorText.includes("RICH canonical text"),
    `listSupersededByIds must return canonicalText, not normalizedValue.\nGot: "${priorText}"`,
  );
}
