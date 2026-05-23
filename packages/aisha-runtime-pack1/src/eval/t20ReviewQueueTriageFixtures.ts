import * as assert from "assert";
import { triageReviewQueue } from "./reviewQueueTriage";
import type { NoteRecord } from "../memory/types";

function makeNote(id: string, overrides: Partial<NoteRecord>): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    sourceModality: "text",
    subtype: "K_pref",
    canonicalText: `Note ${id}`,
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: [],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1", "ep2"],
    status: "active",
    reinferencePolicy: { mode: "needs_review" },
    reviewState: "pending",
    auditTrail: [],
    ...overrides,
  };
}

// 1. Rejected note goes straight to auto_expire, not genuine_review
export async function T20_rejected_note_auto_expires() {
  const note = makeNote("n1", { reviewState: "rejected", confidence: 0.75 });
  const report = triageReviewQueue("s1", [note], [note]);
  const decision = report.decisions[0];

  assert.strictEqual(decision.bin, "auto_expire");
  assert.strictEqual(decision.reason, "operator_rejected");
  assert.ok(report.markdown.includes("Auto-Expire"));
  assert.ok(!report.markdown.includes("👁️ Genuine Review"), "Genuine Review section must be absent when queue is fully triaged");
}

// 2. Weak single-episode stale note auto-expires
export async function T20_weak_stale_single_episode_auto_expires() {
  const note = makeNote("n2", {
    confidence: 0.55,
    sourceEpisodeIds: ["ep1"],
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" },
  });
  const report = triageReviewQueue("s1", [note], [note]);
  const decision = report.decisions[0];

  assert.strictEqual(decision.bin, "auto_expire");
  assert.strictEqual(decision.reason, "single_episode_weak_stale");
}

// 3. High-confidence multi-episode note with no competitors gets auto-confirmed
export async function T20_strong_multi_episode_no_competitor_auto_confirms() {
  const note = makeNote("n3", {
    confidence: 0.92,
    sourceEpisodeIds: ["ep1", "ep2", "ep3"],
    reviewState: "pending",
    reinferencePolicy: { mode: "needs_review" },
  });
  // allActiveNotes only contains THIS note (no competitor)
  const report = triageReviewQueue("s1", [note], [note]);
  const decision = report.decisions[0];

  assert.strictEqual(decision.bin, "auto_confirm");
  assert.strictEqual(decision.reason, "multi_episode_high_confidence_no_competitor");
}

// 4. auto_confirm is blocked when a competing note exists on the same track
export async function T20_auto_confirm_blocked_by_competitor() {
  const note = makeNote("n4", {
    confidence: 0.92,
    sourceEpisodeIds: ["ep1", "ep2"],
    reviewState: "pending",
    reinferencePolicy: { mode: "needs_review" },
  });
  const competitor = makeNote("n4b", {
    subtype: "K_pref",
    subjectKind: "user",
    status: "active",
    confidence: 0.88,
  });
  const report = triageReviewQueue("s1", [note], [note, competitor]);
  const decision = report.decisions[0];

  assert.strictEqual(decision.bin, "genuine_review");
}

// 5. Contradiction-flagged note goes to genuine_review as HIGH priority
export async function T20_contradiction_flagged_note_is_high_priority_genuine_review() {
  const note = makeNote("n5", {
    reinferencePolicy: {
      mode: "needs_review",
      reason: "contradiction_sensitive_lower_support",
    },
  });
  const report = triageReviewQueue("s1", [note], [note]);
  const decision = report.decisions[0];

  assert.strictEqual(decision.bin, "genuine_review");
  assert.strictEqual(decision.priority, "high");
  assert.ok(report.markdown.includes("🔴 High Priority"));
}

// 6. Mixed queue correctly counts all three bins
export async function T20_mixed_queue_counted_correctly() {
  const rejected = makeNote("n6a", { reviewState: "rejected" });
  const weakStale = makeNote("n6b", {
    confidence: 0.50,
    sourceEpisodeIds: ["ep1"],
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" },
  });
  const strongClean = makeNote("n6c", {
    confidence: 0.91,
    sourceEpisodeIds: ["ep1", "ep2"],
    reviewState: "pending",
    reinferencePolicy: { mode: "needs_review" },
    subtype: "K_profile", // different track — no competitor
  });
  const contradiction = makeNote("n6d", {
    reinferencePolicy: { mode: "needs_review", reason: "contradiction_sensitive_lower_support" },
  });

  const allNotes = [rejected, weakStale, strongClean, contradiction];
  const report = triageReviewQueue("s1", allNotes, allNotes);

  assert.strictEqual(report.counts.auto_expire, 2);    // rejected + weak_stale
  assert.strictEqual(report.counts.auto_confirm, 1);   // strongClean (K_profile, no competitor)
  assert.strictEqual(report.counts.genuine_review, 1); // contradiction
  assert.strictEqual(report.totalInput, 4);
}
