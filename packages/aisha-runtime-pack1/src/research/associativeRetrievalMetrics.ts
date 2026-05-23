/**
 * Pack 3.9 — Associative Retrieval Evaluation Metrics
 *
 * RESEARCH LANE ONLY. Pure function metrics for comparing associative retrieval
 * against the baseline SimpleRetrievalPlanner output.
 *
 * All metrics are machine-readable (no LLM-as-judge).
 * All functions are pure: same inputs → same outputs.
 */

import type { NoteRecord, EpisodeRecord } from "../memory/types";
import type { AssociativeHit } from "./associativeRetrieval";

// ─── Metric Types ─────────────────────────────────────────────────────────────

export interface AssociativeRetrievalMetrics {
  /**
   * Fraction of expected contradiction notes (ground truth) that appeared
   * in the associative result. Range: 0.0–1.0.
   * Higher = better contradiction recall.
   */
  contradictionRecallRate: number;

  /**
   * Fraction of stale/needs_review notes in the baseline that were rescued
   * (replaced or supplemented) by non-stale associative alternatives.
   * Range: 0.0–1.0. Higher = better stale rescue.
   */
  staleRescueRate: number;

  /**
   * Fraction of returned associative hits that are from a different episode
   * than any seed note (cross-episode diversity). Range: 0.0–1.0.
   * Higher = more cross-episode linkage usefulness.
   */
  crossEpisodeDiversityRate: number;

  /**
   * Fraction of associative hits that do NOT appear in any ground truth
   * expected set (neither contradiction nor stale rescue targets).
   * Range: 0.0–1.0. Higher = more noise / precision loss risk.
   */
  noisePrecisionLossRate: number;

  /**
   * Total associative hits returned.
   */
  totalHits: number;

  /**
   * Average hop distance of all hits. 1.0 = all direct neighbours.
   */
  avgHopDistance: number;

  /**
   * Average score across all hits.
   */
  avgScore: number;

  /**
   * Total baseline notes that are stale/needs_review.
   */
  baselineStaleCount: number;

  /**
   * Count of associative hits from cross-episode linkage.
   */
  crossEpisodeHitCount: number;
}

// ─── Ground Truth Helper ──────────────────────────────────────────────────────

export interface AssociativeEvalGroundTruth {
  /**
   * IDs of notes that are expected to be surfaced as contradiction evidence.
   * Used to compute contradictionRecallRate.
   */
  expectedContradictionIds?: Set<string>;
  /**
   * IDs of notes expected to rescue stale baseline notes.
   */
  expectedStaleRescueIds?: Set<string>;
}

// ─── Core Metric Computation ──────────────────────────────────────────────────

/**
 * Compute all Pack 3.9 evaluation metrics from a retrieval comparison.
 * Pure function. No I/O, no Date.now().
 *
 * @param baselineNotes     Notes returned by the baseline planner.
 * @param associativeHits   Hits returned by associativeWalk().
 * @param allEpisodes       All episodes in scope (for cross-episode analysis).
 * @param groundTruth       Optional expected sets for precision/recall measurement.
 */
export function computeAssociativeRetrievalMetrics(
  baselineNotes: NoteRecord[],
  associativeHits: AssociativeHit[],
  allEpisodes: EpisodeRecord[],
  groundTruth?: AssociativeEvalGroundTruth,
): AssociativeRetrievalMetrics {
  const hitNoteIds = new Set(associativeHits.map((h) => h.note.id));
  const baselineEpisodeIds = new Set(baselineNotes.flatMap((n) => n.sourceEpisodeIds));

  // ── Contradiction recall ──────────────────────────────────────────────────
  let contradictionRecallRate = 0;
  if (groundTruth?.expectedContradictionIds && groundTruth.expectedContradictionIds.size > 0) {
    let caught = 0;
    for (const id of groundTruth.expectedContradictionIds) {
      if (hitNoteIds.has(id)) caught++;
    }
    contradictionRecallRate = caught / groundTruth.expectedContradictionIds.size;
  }

  // ── Stale rescue rate ─────────────────────────────────────────────────────
  const baselineStaleIds = new Set(
    baselineNotes
      .filter((n) => n.reinferencePolicy.mode === "needs_review")
      .map((n) => n.id),
  );
  const baselineStaleCount = baselineStaleIds.size;

  let staleRescueRate = 0;
  if (groundTruth?.expectedStaleRescueIds && groundTruth.expectedStaleRescueIds.size > 0) {
    let rescued = 0;
    for (const id of groundTruth.expectedStaleRescueIds) {
      if (hitNoteIds.has(id)) rescued++;
    }
    staleRescueRate = rescued / groundTruth.expectedStaleRescueIds.size;
  } else if (baselineStaleCount > 0) {
    // Without ground truth: proxy by counting non-stale associative hits
    const nonStaleHits = associativeHits.filter(
      (h) => h.note.reinferencePolicy.mode !== "needs_review",
    ).length;
    staleRescueRate = Math.min(1.0, nonStaleHits / baselineStaleCount);
  }

  // ── Cross-episode diversity ───────────────────────────────────────────────
  const crossEpisodeHits = associativeHits.filter((h) =>
    !h.note.sourceEpisodeIds.some((epId) => baselineEpisodeIds.has(epId)),
  );
  const crossEpisodeHitCount = crossEpisodeHits.length;
  const crossEpisodeDiversityRate =
    associativeHits.length === 0 ? 0 : crossEpisodeHitCount / associativeHits.length;

  // ── Noise / precision loss ────────────────────────────────────────────────
  const expectedIds = new Set([
    ...(groundTruth?.expectedContradictionIds ?? []),
    ...(groundTruth?.expectedStaleRescueIds ?? []),
  ]);

  let noisePrecisionLossRate = 0;
  if (associativeHits.length > 0 && expectedIds.size > 0) {
    const noiseHits = associativeHits.filter((h) => !expectedIds.has(h.note.id)).length;
    noisePrecisionLossRate = noiseHits / associativeHits.length;
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const totalHits = associativeHits.length;
  const avgHopDistance =
    totalHits === 0
      ? 0
      : associativeHits.reduce((sum, h) => sum + h.hopDistance, 0) / totalHits;
  const avgScore =
    totalHits === 0
      ? 0
      : associativeHits.reduce((sum, h) => sum + h.score, 0) / totalHits;

  return {
    contradictionRecallRate,
    staleRescueRate,
    crossEpisodeDiversityRate,
    noisePrecisionLossRate,
    totalHits,
    avgHopDistance,
    avgScore,
    baselineStaleCount,
    crossEpisodeHitCount,
  };
}

/**
 * Render a compact markdown report of Pack 3.9 eval metrics.
 * Machine-readable values preserved in the text for parsing.
 */
export function renderAssociativeMetricsMarkdown(
  metrics: AssociativeRetrievalMetrics,
  label = "Pack 3.9 Associative Retrieval Eval",
): string {
  return `# ${label}

## Recall Metrics
- **Contradiction Recall Rate**: ${metrics.contradictionRecallRate.toFixed(3)}
- **Stale Note Rescue Rate**: ${metrics.staleRescueRate.toFixed(3)}

## Diversity & Noise
- **Cross-Episode Diversity Rate**: ${metrics.crossEpisodeDiversityRate.toFixed(3)} (${metrics.crossEpisodeHitCount}/${metrics.totalHits} hits)
- **Noise / Precision Loss Rate**: ${metrics.noisePrecisionLossRate.toFixed(3)}

## Hit Quality
- **Total Hits**: ${metrics.totalHits}
- **Avg Hop Distance**: ${metrics.avgHopDistance.toFixed(2)}
- **Avg Score**: ${metrics.avgScore.toFixed(3)}

## Baseline Context
- **Baseline Stale Notes**: ${metrics.baselineStaleCount}
`;
}
