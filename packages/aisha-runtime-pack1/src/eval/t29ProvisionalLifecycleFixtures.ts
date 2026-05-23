/**
 * T29 — Pack 2.6 Provisional Lifecycle (Step 1–8 Gate)
 *
 * Tests:
 *   1. Provisional notes routed to listProvisionalNotes(), not listActiveNotes()
 *   2. Provisional notes absent from active retrieval (note confidence gate)
 *   3. Provisional notes absent from contradiction evidence lane
 *   4. evaluateProvisionalPromotion() promotes when multi-episode + confidence >= 0.65
 *   5. evaluateProvisionalPromotion() does NOT promote single-episode notes
 *   6. evaluateProvisionalPromotion() does NOT promote low-confidence notes
 *   7. evaluateProvisionalPromotion() expires notes past expiresAt → stale
 *   8. Stale notes are excluded from listActiveNotes() and listProvisionalNotes()
 *   9. Stale notes archive correctly via evaluateArchiveEligibility()
 *  10. K_boundary is always active, never provisional (safety signal integrity)
 *  11. listProvisionalNotes() filter by subjectPersonId works correctly
 *  12. Promotion sets expiresAt = undefined and status = active
 *
 * All deterministic. No live LLM. No hot-path modifications.
 */

import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { evaluateArchiveEligibility, ARCHIVE_THRESHOLDS_DAYS } from "../memory/noteLifecyclePolicy";
import type { NoteRecord } from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNote(
  id: string,
  overrides: Partial<NoteRecord> = {},
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sourceModality: "text",
    subtype: "K_pref",
    status: "provisional",
    canonicalText: `User preference: test note ${id}`,
    normalizedValue: `test note ${id}`,
    confidence: 0.78,
    extractionConfidenceRaw: 0.78,
    provenanceChain: ["heuristic_preference_pattern"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    reviewState: "pending",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [{ timestamp: "2026-01-01T00:00:00.000Z", action: "created", reason: "Test" }],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    ...overrides,
  };
}

// ─── T29_provisional_note_routes_to_listProvisionalNotes_not_listActiveNotes ─

export async function T29_provisional_note_routes_to_listProvisionalNotes_not_listActiveNotes() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeNote("n1"); // provisional, confidence=0.78, 1 source episode
  await versioning.seedNotes([note]);

  const active = await versioning.listActiveNotes();
  const provisional = await versioning.listProvisionalNotes();

  assert.strictEqual(
    active.find((n) => n.id === "n1"),
    undefined,
    "Provisional note must NOT appear in listActiveNotes()",
  );
  assert.ok(
    provisional.find((n) => n.id === "n1"),
    "Provisional note MUST appear in listProvisionalNotes()",
  );
}

// ─── T29_provisional_note_absent_from_active_retrieval ───────────────────────

export async function T29_provisional_note_absent_from_active_retrieval() {
  const versioning = new InMemoryNoteVersioning();
  // Provisional note with high confidence — still must not enter retrieval
  const note = makeNote("n2", {
    confidence: 0.80,
    sourceEpisodeIds: ["ep_1"], // single episode → cannot promote
  });
  await versioning.seedNotes([note]);

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(
    active.find((n) => n.id === "n2"),
    undefined,
    "High-confidence provisional note must still be absent from active retrieval",
  );
}

// ─── T29_provisional_note_absent_from_contradiction_evidence ─────────────────

export async function T29_provisional_note_absent_from_contradiction_evidence() {
  const versioning = new InMemoryNoteVersioning();
  // Seed a provisional note and an active avoidance note that should contradict it
  const provisional = makeNote("n3_pref", {
    normalizedValue: "oat milk",
    status: "provisional",
    confidence: 0.78,
  });
  // For contradiction evidence to appear, status must be superseded or disputed.
  // Provisional notes must NOT show up in contradiction evidence.
  await versioning.seedNotes([provisional]);

  const contradictions = await versioning.listContradictionEvidence({});
  assert.strictEqual(
    contradictions.find((n) => n.id === "n3_pref"),
    undefined,
    "Provisional note must be absent from contradiction evidence lane",
  );
}

// ─── T29_evaluateProvisionalPromotion_promotes_when_multi_episode_and_conf ───

export async function T29_evaluateProvisionalPromotion_promotes_when_multi_episode_and_conf() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeNote("n4", {
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1", "ep_2"], // >1 distinct episodes → eligible
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();

  assert.strictEqual(result.promoted.length, 1, "Note must be promoted");
  assert.strictEqual(result.promoted[0].id, "n4");
  assert.strictEqual(result.promoted[0].status, "active");
  assert.strictEqual(result.promoted[0].expiresAt, undefined);
  assert.strictEqual(result.expired.length, 0);

  // Must now appear in listActiveNotes()
  const active = await versioning.listActiveNotes({ includeGlobal: true });
  assert.ok(
    active.find((n) => n.id === "n4"),
    "Promoted note must now appear in listActiveNotes()",
  );
}

// ─── T29_evaluateProvisionalPromotion_does_not_promote_single_episode ────────

export async function T29_evaluateProvisionalPromotion_does_not_promote_single_episode() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeNote("n5", {
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1"], // only 1 episode → must NOT promote
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();

  assert.strictEqual(result.promoted.length, 0, "Single-episode note must NOT be promoted");
  assert.strictEqual(result.unchanged.length, 1);
  assert.strictEqual(result.unchanged[0].status, "provisional");
}

// ─── T29_evaluateProvisionalPromotion_does_not_promote_low_confidence ────────

export async function T29_evaluateProvisionalPromotion_does_not_promote_low_confidence() {
  const versioning = new InMemoryNoteVersioning();
  // Aspiration note: confidence penalized to ~0.38, 2 episodes — still must not promote
  const note = makeNote("n6", {
    confidence: 0.38, // below 0.65 threshold
    extractionConfidenceRaw: 0.78,
    sourceEpisodeIds: ["ep_1", "ep_2"],
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();

  assert.strictEqual(result.promoted.length, 0, "Low-confidence note must NOT be promoted");
  assert.strictEqual(result.unchanged[0].confidence, 0.38);
}

// ─── T29_evaluateProvisionalPromotion_expires_past_expiresAt ─────────────────

export async function T29_evaluateProvisionalPromotion_expires_past_expiresAt() {
  const versioning = new InMemoryNoteVersioning();
  // expiresAt in the past → must expire to stale
  const note = makeNote("n7", {
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1"],
    expiresAt: "2020-01-01T00:00:00.000Z", // far in the past
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();

  assert.strictEqual(result.expired.length, 1, "Expired note must be in expired list");
  assert.strictEqual(result.expired[0].id, "n7");
  assert.strictEqual(result.expired[0].status, "stale");
  assert.strictEqual(result.expired[0].expiresAt, undefined);
  assert.strictEqual(result.promoted.length, 0);
}

// ─── T29_stale_note_excluded_from_listActiveNotes ────────────────────────────

export async function T29_stale_note_excluded_from_listActiveNotes() {
  const versioning = new InMemoryNoteVersioning();
  const staleNote = makeNote("n8", {
    status: "stale",
    confidence: 0.78,
    expiresAt: undefined,
  });
  await versioning.seedNotes([staleNote]);

  const active = await versioning.listActiveNotes({ includeGlobal: true });
  assert.strictEqual(
    active.find((n) => n.id === "n8"),
    undefined,
    "Stale note must not appear in listActiveNotes()",
  );

  const provisional = await versioning.listProvisionalNotes();
  assert.strictEqual(
    provisional.find((n) => n.id === "n8"),
    undefined,
    "Stale note must not appear in listProvisionalNotes()",
  );
}

// ─── T29_stale_note_archives_via_evaluateArchiveEligibility ──────────────────

export async function T29_stale_note_archives_via_evaluateArchiveEligibility() {
  // A stale note that is ARCHIVE_THRESHOLDS_DAYS.STALE_PROVISIONAL_EXPIRED days old
  const dayMs = 24 * 60 * 60 * 1000;
  const staleDaysAgo = ARCHIVE_THRESHOLDS_DAYS.STALE_PROVISIONAL_EXPIRED + 1;
  const oldDate = new Date(Date.now() - staleDaysAgo * dayMs).toISOString();

  const staleNote = makeNote("n9", {
    status: "stale",
    createdAt: oldDate,
    updatedAt: oldDate,
    expiresAt: undefined,
  });

  const result = evaluateArchiveEligibility(staleNote, Date.now());
  assert.ok(result, "Old stale note must be archive-eligible");
  assert.strictEqual(result!.status, "archived");
}

// ─── T29_stale_note_not_archived_when_young ──────────────────────────────────

export async function T29_stale_note_not_archived_when_young() {
  // A stale note that is only 1 day old — must NOT archive yet
  const dayMs = 24 * 60 * 60 * 1000;
  const recentDate = new Date(Date.now() - 1 * dayMs).toISOString();

  const staleNote = makeNote("n10", {
    status: "stale",
    createdAt: recentDate,
    updatedAt: recentDate,
    expiresAt: undefined,
  });

  const result = evaluateArchiveEligibility(staleNote, Date.now());
  assert.strictEqual(result, null, "Young stale note must NOT be archive-eligible yet");
}

// ─── T29_k_boundary_is_never_provisional ─────────────────────────────────────

export async function T29_k_boundary_is_never_provisional() {
  const versioning = new InMemoryNoteVersioning();
  // Simulate a K_boundary candidate going through mergeOrSupersede
  const { NoteCandidate: _ } = {} as any; // type import only
  const candidates = [
    {
      subtype: "K_boundary" as const,
      canonicalText: "User boundary: my health records",
      normalizedValue: "my health records",
      confidence: 0.90,
      extractionConfidenceRaw: 0.90,
      provenanceChain: ["heuristic_boundary_pattern"],
      subjectKind: "user" as const,
      sourceEpisodeIds: ["ep_1"],
      provenanceReason: "heuristic_boundary_pattern",
      // No status field — versioning must force active for K_boundary
    },
  ];

  const result = await versioning.mergeOrSupersede(candidates[0] as any, []);
  assert.strictEqual(result.notesWritten.length, 1);
  assert.strictEqual(result.notesWritten[0].status, "active",
    "K_boundary note must be immediately active, never provisional");
  assert.strictEqual(result.notesWritten[0].expiresAt, undefined,
    "K_boundary note must not have an expiresAt (no provisional bounding)");
}

// ─── T29_listProvisionalNotes_filter_by_subjectPersonId ──────────────────────

export async function T29_listProvisionalNotes_filter_by_subjectPersonId() {
  const versioning = new InMemoryNoteVersioning();

  const globalNote = makeNote("n11", {
    subjectKind: "user",
    subjectPersonId: undefined,
  });
  const personNote = makeNote("n12", {
    subjectKind: "person",
    subjectPersonId: "person_alice",
  });
  await versioning.seedNotes([globalNote, personNote]);

  // Filter for a specific person — should only return person's note
  const personResults = await versioning.listProvisionalNotes({
    subjectPersonId: "person_alice",
  });
  assert.strictEqual(personResults.length, 1);
  assert.strictEqual(personResults[0].id, "n12");

  // Filter with includeGlobal — should include both
  const globalResults = await versioning.listProvisionalNotes({
    subjectPersonId: "person_alice",
    includeGlobal: true,
  });
  assert.strictEqual(globalResults.length, 2);
}

// ─── T29_promotion_clears_expiresAt ──────────────────────────────────────────

export async function T29_promotion_clears_expiresAt() {
  const versioning = new InMemoryNoteVersioning();
  const note = makeNote("n13", {
    confidence: 0.78,
    sourceEpisodeIds: ["ep_1", "ep_2"],
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();
  assert.strictEqual(result.promoted.length, 1);
  assert.strictEqual(result.promoted[0].expiresAt, undefined,
    "Promoted notes must have expiresAt cleared");
  assert.strictEqual(result.promoted[0].status, "active");
}

// ─── T29_evaluateProvisionalPromotion_does_not_promote_exact_boundary ────────

export async function T29_evaluateProvisionalPromotion_does_not_promote_exact_boundary() {
  const versioning = new InMemoryNoteVersioning();
  // Exactly at confidence 0.65, exactly 1 episode → should NOT promote (need >1 AND >=0.65)
  const note = makeNote("n14", {
    confidence: 0.65,
    sourceEpisodeIds: ["ep_1"], // only 1
  });
  await versioning.seedNotes([note]);

  const result = await versioning.evaluateProvisionalPromotion();
  assert.strictEqual(result.promoted.length, 0,
    "Single-episode note at threshold confidence must NOT promote");
}
