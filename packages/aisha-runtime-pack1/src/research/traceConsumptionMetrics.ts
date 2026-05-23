/**
 * Pack 3.10 — Trace Consumption Evaluation Metrics
 *
 * RESEARCH LANE ONLY. Pure function metrics for measuring trace consumption
 * against: (a) baseline retrieval alone, (b) associative retrieval from Pack 3.9.
 *
 * Outputs are machine-readable only. No LLM-as-judge.
 */

import type { NoteRecord } from "../memory/types";
import type { TraceConsumptionResult, TraceNoteMatch } from "./traceConsumption";
import type { AssociativeHit } from "./associativeRetrieval";

// ─── Metric Types ─────────────────────────────────────────────────────────────

export interface TraceConsumptionMetrics {
  /**
   * Fraction of expected contradiction notes (ground truth) identified by
   * trace evidence as "contradicts". Range: 0.0–1.0.
   */
  contradictionRecoveryRate: number;

  /**
   * Fraction of stale/needs_review baseline notes for which trace evidence
   * provided at least one supporting or disambiguating match.
   */
  staleNoteRescueRate: number;

  /**
   * Fraction of trace matches that were NOT in any expected ground-truth set
   * (neither expected contradictions nor expected rescue targets).
   * Proxy for noise / over-consumption risk.
   */
  noisePrecisionLossRate: number;

  /**
   * Fraction of notes whose review outcome could be disambiguated by trace:
   * i.e., a needs_review note received a "supports" or "contradicts" trace match.
   */
  reviewDisambiguationRate: number;

  /**
   * Delta in contradictionRecoveryRate between trace-augmented and baseline-only.
   * Positive = trace adds value; negative = trace adds noise only.
   */
  contradictionRecoveryDeltaVsBaseline: number;

  /**
   * Delta in contradictionRecoveryRate vs Pack 3.9 associative retrieval.
   * Positive = trace outperforms associative; negative = associative wins.
   */
  contradictionRecoveryDeltaVsAssociative: number;

  /**
   * Total trace events consumed.
   */
  traceEventsConsumed: number;

  /**
   * Total trace-note matches found (before cap).
   */
  totalMatches: number;

  /**
   * Fraction of consumed trace events that matched at least one note.
   */
  traceUtilisationRate: number;
}

// ─── Ground Truth ─────────────────────────────────────────────────────────────

export interface TraceEvalGroundTruth {
  /** IDs of notes expected to be surfaced as contradiction evidence. */
  expectedContradictionIds?: Set<string>;
  /** IDs of notes expected to be rescued from stale/needs_review. */
  expectedStaleRescueIds?: Set<string>;
}

// ─── Baseline Comparison Input ────────────────────────────────────────────────

export interface BaselineComparisonInput {
  /** Contradiction recovery rate achieved by baseline planner alone. */
  baselineContradictionRecoveryRate: number;
  /** Contradiction recovery rate achieved by Pack 3.9 associative retrieval. */
  associativeContradictionRecoveryRate: number;
}

// ─── Core Metric Computation ──────────────────────────────────────────────────

/**
 * Compute all Pack 3.10 trace consumption metrics.
 * Pure function. Same inputs → same outputs.
 *
 * @param baselineNotes         Notes from the baseline retrieval planner.
 * @param traceResult           Output of runTraceConsumption().
 * @param groundTruth           Optional expected sets for precision/recall.
 * @param baselineComparison    Contradiction rates from baseline/associative for delta metrics.
 */
export function computeTraceConsumptionMetrics(
  baselineNotes: NoteRecord[],
  traceResult: TraceConsumptionResult,
  groundTruth?: TraceEvalGroundTruth,
  baselineComparison?: BaselineComparisonInput,
): TraceConsumptionMetrics {
  const allMatches = traceResult.allMatches;
  const matchedNoteIds = new Set(allMatches.map((m) => m.noteId));
  const contradictedIds = new Set(
    allMatches.filter((m) => m.matchType === "contradicts").map((m) => m.noteId),
  );

  // ── Contradiction recovery rate ────────────────────────────────────────────
  let contradictionRecoveryRate = 0;
  if (groundTruth?.expectedContradictionIds && groundTruth.expectedContradictionIds.size > 0) {
    let caught = 0;
    for (const id of groundTruth.expectedContradictionIds) {
      if (contradictedIds.has(id)) caught++;
    }
    contradictionRecoveryRate = caught / groundTruth.expectedContradictionIds.size;
  }

  // ── Stale note rescue rate ─────────────────────────────────────────────────
  const baselineStaleIds = new Set(
    baselineNotes
      .filter((n) => n.reinferencePolicy.mode === "needs_review")
      .map((n) => n.id),
  );

  let staleNoteRescueRate = 0;
  if (groundTruth?.expectedStaleRescueIds && groundTruth.expectedStaleRescueIds.size > 0) {
    let rescued = 0;
    for (const id of groundTruth.expectedStaleRescueIds) {
      if (matchedNoteIds.has(id)) rescued++;
    }
    staleNoteRescueRate = rescued / groundTruth.expectedStaleRescueIds.size;
  } else if (baselineStaleIds.size > 0) {
    // Proxy: count stale baseline notes that received any trace match
    let staleMatched = 0;
    for (const id of baselineStaleIds) {
      if (matchedNoteIds.has(id)) staleMatched++;
    }
    staleNoteRescueRate = staleMatched / baselineStaleIds.size;
  }

  // ── Noise / precision loss ─────────────────────────────────────────────────
  const expectedIds = new Set([
    ...(groundTruth?.expectedContradictionIds ?? []),
    ...(groundTruth?.expectedStaleRescueIds ?? []),
  ]);

  let noisePrecisionLossRate = 0;
  if (allMatches.length > 0 && expectedIds.size > 0) {
    const noiseMatches = allMatches.filter((m) => !expectedIds.has(m.noteId)).length;
    noisePrecisionLossRate = noiseMatches / allMatches.length;
  }

  // ── Review disambiguation rate ─────────────────────────────────────────────
  const needsReviewNoteIds = new Set(
    baselineNotes
      .filter((n) => n.reinferencePolicy.mode === "needs_review" || n.reviewState === "pending")
      .map((n) => n.id),
  );

  let disambiguatedCount = 0;
  for (const id of needsReviewNoteIds) {
    const hasDisambiguatingMatch = allMatches.some(
      (m) => m.noteId === id && (m.matchType === "supports" || m.matchType === "contradicts"),
    );
    if (hasDisambiguatingMatch) disambiguatedCount++;
  }
  const reviewDisambiguationRate =
    needsReviewNoteIds.size === 0 ? 0 : disambiguatedCount / needsReviewNoteIds.size;

  // ── Delta metrics vs baseline and associative ──────────────────────────────
  const contradictionRecoveryDeltaVsBaseline =
    contradictionRecoveryRate - (baselineComparison?.baselineContradictionRecoveryRate ?? 0);
  const contradictionRecoveryDeltaVsAssociative =
    contradictionRecoveryRate - (baselineComparison?.associativeContradictionRecoveryRate ?? 0);

  // ── Trace utilisation rate ─────────────────────────────────────────────────
  const eventsWithMatch = new Set(allMatches.map((m) => m.traceEvent.sourceId)).size;
  const traceUtilisationRate =
    traceResult.traceEventsConsumed === 0
      ? 0
      : eventsWithMatch / traceResult.traceEventsConsumed;

  return {
    contradictionRecoveryRate,
    staleNoteRescueRate,
    noisePrecisionLossRate,
    reviewDisambiguationRate,
    contradictionRecoveryDeltaVsBaseline,
    contradictionRecoveryDeltaVsAssociative,
    traceEventsConsumed: traceResult.traceEventsConsumed,
    totalMatches: allMatches.length,
    traceUtilisationRate,
  };
}

/**
 * Render a compact markdown report of Pack 3.10 metrics.
 */
export function renderTraceConsumptionMetricsMarkdown(
  metrics: TraceConsumptionMetrics,
  label = "Pack 3.10 Trace Consumption Eval",
): string {
  const sign = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(3);
  return `# ${label}

## Recall Metrics
- **Contradiction Recovery Rate**: ${metrics.contradictionRecoveryRate.toFixed(3)}
- **Stale Note Rescue Rate**: ${metrics.staleNoteRescueRate.toFixed(3)}
- **Review Disambiguation Rate**: ${metrics.reviewDisambiguationRate.toFixed(3)}

## Noise
- **Noise / Precision Loss Rate**: ${metrics.noisePrecisionLossRate.toFixed(3)}

## Delta vs Reference Systems
- **Δ vs Baseline Retrieval**: ${sign(metrics.contradictionRecoveryDeltaVsBaseline)}
- **Δ vs Pack 3.9 Associative**: ${sign(metrics.contradictionRecoveryDeltaVsAssociative)}

## Trace Utilisation
- **Events Consumed**: ${metrics.traceEventsConsumed}
- **Total Matches**: ${metrics.totalMatches}
- **Utilisation Rate**: ${metrics.traceUtilisationRate.toFixed(3)}
`;
}
