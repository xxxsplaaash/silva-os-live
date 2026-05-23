import type { NoteRecord } from "./types";

/**
 * Pure function to derive the true runtime trust level of a note.
 * Uses extraction raw confidence as the baseline, adjusts up for 
 * evidence reinforcement, and heavily penalizes explicitly stalled/contradicted 
 * states ("needs_review"). 
 * 
 * Strict Read-Path safe: does not use live Date.now() or execute store I/O.
 */
export function calculateCalibratedConfidence(note: NoteRecord): number {
  // Baseline is raw extraction confidence or fallback to stored tracking confidence
  const base = note.extractionConfidenceRaw ?? note.confidence;
  
  // Reward: Evidence scale (+0.05 per extra reinforcing episode, max +0.15)
  const evidenceBonus = Math.min(0.15, Math.max(0, note.sourceEpisodeIds.length - 1) * 0.05);
  
  // Penalty: Explicitly flagged stale or contested status by the reconsolidation layer
  let statusPenalty = 0;
  if (note.reinferencePolicy.mode === "needs_review") {
    // Determine penalty severity based on the specific persisted reason
    switch (note.reinferencePolicy.reason) {
      case "contradiction_sensitive_lower_support":
        statusPenalty = 0.20; // Heavy penalty for direct user contradiction traces
        break;
      case "retrieved_weak_stale_note":
        statusPenalty = 0.15; // Moderate penalty for time-stale drift
        break;
      case "relationship_trust_gated":
      case "relationship_caution_gated":
        statusPenalty = 0.10; // Base penalty for operator bounds
        break;
      default:
        statusPenalty = 0.15; // Generic "needs review" fallback penalty
    }
  }

  // Cap bounds securely between 0 and 1
  return Math.min(1.0, Math.max(0.01, base + evidenceBonus - statusPenalty));
}

/**
 * Evaluates whether a note warrants render-time active caution.
 * Distinct from 'needs_review' - uncertain simply means the system lacks 
 * high deterministic faith in the current output.
 */
export function isNoteUncertain(note: NoteRecord, threshold = 0.65): boolean {
  return calculateCalibratedConfidence(note) < threshold;
}
