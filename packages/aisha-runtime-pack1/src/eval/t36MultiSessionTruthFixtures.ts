/**
 * T36 — Multi-Session Truth Metrics Fixtures (Pack 3.6)
 *
 * Deterministic pure-function tests for new computeTruthCoherenceMetrics additions
 * (stale-note drift, critic catch-rate, false supersession, false persistence).
 */

import { computeTruthCoherenceMetrics } from "./multiSessionMetrics";
import type { NoteRecord } from "../memory/types";

const FIXED_NOW = "2026-04-25T10:00:00.000Z";

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
    sourceEpisodeIds: ["ep_t36"],
    reviewState: reinferenceMode === "needs_review" ? "pending" : "accepted",
    reinferencePolicy: reinferenceMode === "needs_review"
      ? { mode: "needs_review", reason: "retrieved_weak_stale_note" }
      : { mode: "allow" },
  };
}

// ─── TEST: T36_stale_note_drift_detected ─────────────────────────────────────
export function T36_stale_note_drift_detected() {
  const noteV1 = makeNote("note_drift", "coffee", "active", "needs_review");
  const noteV2 = { ...noteV1, normalizedValue: "tea", canonicalText: "User preference: tea" };
  const noteStable = makeNote("note_stable", "morning", "active", "needs_review");

  const sessions = [
    [noteV1, noteStable],
    [noteV2, noteStable],
  ];

  const metrics = computeTruthCoherenceMetrics(sessions);

  // Out of 2 stale notes, 1 drifted.
  if (metrics.staleNoteDriftRate !== 0.5) {
    throw new Error(`Expected staleNoteDriftRate=0.5, got ${metrics.staleNoteDriftRate}`);
  }
}

// ─── TEST: T36_critic_catch_rate_calculated ──────────────────────────────────
export function T36_critic_catch_rate_calculated() {
  const noteMissed = makeNote("note_missed", "coffee", "active");
  const noteCaught = makeNote("note_caught", "tea", "superseded");

  const sessions = [
    [noteMissed, noteCaught]
  ];

  const groundTruth = {
    expectedContradictionIds: new Set(["note_missed", "note_caught"])
  };

  const metrics = computeTruthCoherenceMetrics(sessions, groundTruth);

  // 1 out of 2 expected contradictions was actually superseded/disputed
  if (metrics.criticCatchRate !== 0.5) {
    throw new Error(`Expected criticCatchRate=0.5, got ${metrics.criticCatchRate}`);
  }
}

// ─── TEST: T36_false_supersession_rate ───────────────────────────────────────
export function T36_false_supersession_rate() {
  const noteLegitSuper = makeNote("note_legit", "coffee", "superseded");
  const noteFalseSuper = makeNote("note_false", "tea", "superseded");

  const sessions = [[noteLegitSuper, noteFalseSuper]];

  const groundTruth = {
    expectedSupersededIds: new Set(["note_legit"])
  };

  const metrics = computeTruthCoherenceMetrics(sessions, groundTruth);

  // 2 notes were superseded. Only 1 was expected to be. 1 false out of 2 total superseded = 0.5
  if (metrics.falseSupersessionRate !== 0.5) {
    throw new Error(`Expected falseSupersessionRate=0.5, got ${metrics.falseSupersessionRate}`);
  }
}

// ─── TEST: T36_false_persistence_rate ────────────────────────────────────────
export function T36_false_persistence_rate() {
  const noteLegitActive = makeNote("note_legit_active", "coffee", "active");
  const noteFalseActive = makeNote("note_false_active", "tea", "active");

  const sessions = [[noteLegitActive, noteFalseActive]];

  const groundTruth = {
    // Both are active, but note_false_active was expected to be superseded
    expectedSupersededIds: new Set(["note_false_active"])
  };

  const metrics = computeTruthCoherenceMetrics(sessions, groundTruth);

  // 2 notes are active in the final session. 1 of them should have been superseded. Rate = 1/2 = 0.5
  if (metrics.falsePersistenceRate !== 0.5) {
    throw new Error(`Expected falsePersistenceRate=0.5, got ${metrics.falsePersistenceRate}`);
  }
}
