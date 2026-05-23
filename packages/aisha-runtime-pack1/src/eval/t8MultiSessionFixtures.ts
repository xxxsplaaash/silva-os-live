/**
 * T8 — Multi-Session Truth Metrics Fixtures
 *
 * Deterministic pure-function tests for computeTruthCoherenceMetrics.
 * No async, no I/O, no LLM, no stores.
 */

import { computeTruthCoherenceMetrics } from "./multiSessionMetrics";
import type { NoteRecord } from "../memory/types";

const FIXED_NOW = "2026-04-17T10:00:00.000Z";

function makeNote(
  id: string,
  normalizedValue: string,
  status: NoteRecord["status"] = "active",
  reinferenceMode: "allow" | "needs_review" = "allow",
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status,
    subtype: "K_pref",
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_t8"],
    reviewState: reinferenceMode === "needs_review" ? "pending" : "accepted",
    reinferencePolicy: reinferenceMode === "needs_review"
      ? { mode: "needs_review", reason: "retrieved_weak_stale_note" }
      : { mode: "allow" },
  };
}

// ─── TEST: T8_stable_notes_across_three_sessions ─────────────────────────────
export function T8_stable_notes_across_three_sessions() {
  // Same note, same value, in all 3 sessions
  const noteA = makeNote("note_a", "oat lattes");
  const sessions = [
    [noteA],
    [{ ...noteA }],
    [{ ...noteA }],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  if (metrics.stabilityRate !== 1.0) {
    throw new Error(`Expected stabilityRate=1.0, got ${metrics.stabilityRate}`);
  }
}

// ─── TEST: T8_instability_detected_when_value_changes ────────────────────────
export function T8_instability_detected_when_value_changes() {
  // Same note ID, different normalizedValue in session 2
  const noteV1 = makeNote("note_unstable", "black coffee");
  const noteV2 = { ...noteV1, normalizedValue: "oat lattes", canonicalText: "User preference: oat lattes" };

  const sessions = [
    [noteV1],
    [noteV2],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  if (metrics.stabilityRate >= 1.0) {
    throw new Error(`Expected stabilityRate < 1.0 for unstable note, got ${metrics.stabilityRate}`);
  }
}

// ─── TEST: T8_contradiction_recovery_one_of_two ──────────────────────────────
export function T8_contradiction_recovery_one_of_two() {
  // Two notes appear as superseded in session 1.
  // In final session: noteA is absent (recovered), noteB is still active (not recovered).
  const noteA = makeNote("note_a_recv", "oat lattes", "superseded");
  const noteB = makeNote("note_b_recv", "black coffee", "superseded");
  const noteBActive = makeNote("note_b_recv", "black coffee", "active"); // Same ID, now active in final

  const sessions = [
    [noteA, noteB],      // Both superseded in session 1
    [noteBActive],       // Only B reappears in final (as active = not recovered)
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  if (metrics.contradictionRecoveryRate !== 0.5) {
    throw new Error(
      `Expected contradictionRecoveryRate=0.5, got ${metrics.contradictionRecoveryRate}`,
    );
  }
}

// ─── TEST: T8_stale_promotion_counted_correctly ──────────────────────────────
export function T8_stale_promotion_counted_correctly() {
  // Two notes transition from allow → needs_review between sessions
  const noteA_s1 = makeNote("note_stale_a", "green tea", "active", "allow");
  const noteB_s1 = makeNote("note_stale_b", "mornings", "active", "allow");
  const noteA_s2 = makeNote("note_stale_a", "green tea", "active", "needs_review");
  const noteB_s2 = makeNote("note_stale_b", "mornings", "active", "needs_review");

  const sessions = [
    [noteA_s1, noteB_s1],
    [noteA_s2, noteB_s2],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  if (metrics.stalePromotionCount !== 2) {
    throw new Error(`Expected stalePromotionCount=2, got ${metrics.stalePromotionCount}`);
  }
}

// ─── TEST: T8_persisted_throughout_count ─────────────────────────────────────
export function T8_persisted_throughout_count() {
  // 3 sessions. Only noteA is active in all 3.
  // noteB is active in 1 and 2, but absent in 3.
  // noteC is absent in session 1.
  const noteA = makeNote("note_persist_a", "oat lattes", "active");
  const noteB = makeNote("note_persist_b", "espresso", "active");
  const noteC = makeNote("note_persist_c", "matcha", "active");

  const sessions = [
    [noteA, noteB],
    [noteA, noteB, noteC],
    [noteA, noteC],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  // noteA appears in all 3 and is active in all 3 → persisted throughout
  // noteB appears in sessions 1+2 only → not persisted throughout
  // noteC appears in sessions 2+3 only → not persisted throughout
  if (metrics.persistedThroughoutCount !== 1) {
    throw new Error(`Expected persistedThroughoutCount=1, got ${metrics.persistedThroughoutCount}`);
  }
}

// ─── TEST: T8_empty_sessions_returns_zero_metrics ───────────────────────────
export function T8_empty_sessions_returns_zero_metrics() {
  const metrics = computeTruthCoherenceMetrics([]);

  if (metrics.stabilityRate !== 1.0) {
    throw new Error(`Expected stabilityRate=1.0 for empty input, got ${metrics.stabilityRate}`);
  }
  if (metrics.contradictionRecoveryRate !== 0) {
    throw new Error(`Expected contradictionRecoveryRate=0 for empty input, got ${metrics.contradictionRecoveryRate}`);
  }
  if (metrics.stalePromotionCount !== 0) {
    throw new Error(`Expected stalePromotionCount=0 for empty input, got ${metrics.stalePromotionCount}`);
  }
  if (metrics.persistedThroughoutCount !== 0) {
    throw new Error(`Expected persistedThroughoutCount=0 for empty input, got ${metrics.persistedThroughoutCount}`);
  }
  // Must not throw NaN or crash
  if (Number.isNaN(metrics.stabilityRate) || Number.isNaN(metrics.contradictionRecoveryRate)) {
    throw new Error("Metrics contain NaN for empty input — division by zero not guarded");
  }
}

// ─── TEST: T8_single_session_all_active ──────────────────────────────────────
export function T8_single_session_all_active() {
  // Single session: all notes active, none contradicted, none stale
  const sessions = [
    [
      makeNote("note_single_a", "oat lattes", "active", "allow"),
      makeNote("note_single_b", "mornings", "active", "allow"),
    ],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  if (metrics.stabilityRate !== 1.0) {
    throw new Error(`Expected stabilityRate=1.0, got ${metrics.stabilityRate}`);
  }
  if (metrics.stalePromotionCount !== 0) {
    throw new Error(`Expected stalePromotionCount=0, got ${metrics.stalePromotionCount}`);
  }
  if (metrics.persistedThroughoutCount !== 2) {
    throw new Error(`Expected persistedThroughoutCount=2 (both notes in single session), got ${metrics.persistedThroughoutCount}`);
  }
}
