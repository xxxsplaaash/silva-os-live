/**
 * Pack 3.13 — Shadow Data Review: Evidence Aggregator
 *
 * REVIEW LAYER ONLY. Not a live path, not a promotion decision.
 * Reads ShadowAuditEntry[] emitted by Pack 3.12 (auditKind: "shadow_retrieval_research")
 * and aggregates them independently per lane into EvidenceReport objects.
 *
 * All functions are pure. No I/O, no store calls, no Date.now().
 * Insufficiency is reported explicitly — no synthetic pass/fail without real data.
 *
 * Pack 3.11 promotion gate requirements addressed here:
 *   contradictionRecoveryRate         — reported as estimated proxy
 *   noisePrecisionLossRate            — reported as estimated proxy
 *   shadow p99 latency                — computed from latencyMs samples
 *   token overflow count              — counted where estimatedTokenDelta > 0
 *   operator-reviewed entry count     — counted from operatorReviewed flag
 *   reviewDisambiguationRate          — averaged from per-entry estimates
 *   traceUtilisationRate              — associative: hitRate; trace: matchRate
 *   real note graph size logging      — presence of noteGraphSizeLogged flag
 *   episode summary population rate   — presence of episodeSummaryPopulationRate
 */

import type { ShadowAuditEntry } from "../runtime/shadowRetrievalOrchestrator";

// ─── Enriched Shadow Entry ────────────────────────────────────────────────────

/**
 * An operator-annotated shadow audit entry.
 * The `operatorReviewed` flag is set externally (e.g. by an operator dashboard
 * or manually during review). `contradictionCaught` and `noiseFlagged` are
 * operator annotations used to compute ground-truth recall and precision rates.
 */
export interface AnnotatedShadowEntry extends ShadowAuditEntry {
  /** True when an operator has manually reviewed this entry. */
  operatorReviewed: boolean;
  /**
   * True when the operator confirmed this shadow entry correctly surfaced
   * a contradiction that the baseline missed.
   */
  contradictionCaught?: boolean;
  /**
   * True when the operator flagged the shadow hit as noise (not useful).
   */
  noiseFlagged?: boolean;
  /**
   * True when a real note graph size was logged alongside this entry.
   * Used to confirm real-session graph density was captured.
   */
  noteGraphSizeLogged?: boolean;
  /**
   * Fraction of episodes that had summary text populated when this entry
   * was collected. Applies to the trace lane only.
   */
  episodeSummaryPopulationRate?: number;
}

// ─── Evidence Report ──────────────────────────────────────────────────────────

/**
 * Insufficiency sentinel values for metrics that cannot be computed
 * because real-session evidence is absent.
 */
export const INSUFFICIENT = "INSUFFICIENT" as const;
export type MaybeInsufficient<T> = T | typeof INSUFFICIENT;

export interface LaneEvidenceReport {
  lane: "associative" | "trace";

  /** Total shadow entries collected for this lane. */
  totalEntries: number;

  /**
   * Number of operator-reviewed entries.
   * Pack 3.11 gate requires >= 10 before live-path promotion.
   */
  operatorReviewedCount: number;

  /**
   * Fraction of operator-reviewed entries where a contradiction was correctly
   * caught by the shadow lane. INSUFFICIENT when < 1 reviewed entry with
   * a contradictionCaught annotation.
   */
  contradictionRecoveryRate: MaybeInsufficient<number>;

  /**
   * Fraction of operator-reviewed entries where the shadow hit was flagged
   * as noise. INSUFFICIENT when < 1 reviewed entry with a noiseFlagged annotation.
   */
  noisePrecisionLossRate: MaybeInsufficient<number>;

  /**
   * Computed p99 latency across all entries in milliseconds.
   * INSUFFICIENT when < 10 entries.
   */
  p99LatencyMs: MaybeInsufficient<number>;

  /**
   * Number of entries where estimatedTokenDelta would exceed the prompt budget
   * if shadow hits were injected. Uses PROMPT_TOKEN_BUDGET_CAP as the limit.
   * INSUFFICIENT when no entries present.
   */
  tokenOverflowCount: MaybeInsufficient<number>;

  /**
   * Average reviewDisambiguationEstimate across all entries.
   * 0 is a valid value (no needs_review notes touched). INSUFFICIENT only
   * when no entries are present.
   */
  reviewDisambiguationRate: MaybeInsufficient<number>;

  /**
   * For associative: fraction of entries where shadowHitCount > 0 (walk produced hits).
   * For trace: average of (shadowHitCount / baselineNoteCount) across entries with notes.
   * INSUFFICIENT when no entries present.
   */
  utilisationRate: MaybeInsufficient<number>;

  /**
   * Whether any entry in this lane has noteGraphSizeLogged === true.
   * Required for Pack 3.11 gate (real graph density evidence).
   */
  noteGraphSizeEvidencePresent: boolean;

  /**
   * Mean episodeSummaryPopulationRate across trace-lane entries that have
   * the field populated. INSUFFICIENT if none present. Associative: always INSUFFICIENT.
   */
  episodeSummaryPopulationRate: MaybeInsufficient<number>;

  /**
   * Whether all Pack 3.11 gate criteria have been met for this lane.
   * false = gate not yet met. Never returns true without real evidence.
   */
  promotionGateMet: boolean;

  /**
   * Human-readable list of unmet gate criteria.
   */
  unmetGateCriteria: string[];
}

// ─── Token Budget ──────────────────────────────────────────────────────────────

/**
 * Conservative prompt token budget cap for pack 3.11 overflow detection.
 * Based on MAX_ACTIVE_NOTES=8 × 35 tokens each = 280 baseline notes budget.
 * Any estimatedTokenDelta > SHADOW_TOKEN_OVERFLOW_THRESHOLD flags a risk.
 */
export const PROMPT_TOKEN_BUDGET_CAP = 280; // tokens
export const SHADOW_TOKEN_OVERFLOW_THRESHOLD = PROMPT_TOKEN_BUDGET_CAP; // flag if shadow would exceed budget alone

// ─── P99 Computation ─────────────────────────────────────────────────────────

/**
 * Compute the p99 value from a sorted array of numbers.
 * Returns INSUFFICIENT if fewer than MIN_SAMPLES entries are provided.
 */
const P99_MIN_SAMPLES = 10;

export function computeP99(values: number[]): MaybeInsufficient<number> {
  if (values.length < P99_MIN_SAMPLES) return INSUFFICIENT;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── Core Aggregation ────────────────────────────────────────────────────────

/**
 * Aggregate AnnotatedShadowEntry[] for a single lane into a LaneEvidenceReport.
 * Pure function. Same inputs → same outputs.
 *
 * @param lane      Which lane to aggregate ("associative" | "trace").
 * @param entries   All AnnotatedShadowEntry[] for this lane (pre-filtered by lane).
 */
export function aggregateLaneEvidence(
  lane: "associative" | "trace",
  entries: AnnotatedShadowEntry[],
): LaneEvidenceReport {
  const laneEntries = entries.filter((e) => e.lane === lane);
  const totalEntries = laneEntries.length;

  // ── Operator-reviewed count ────────────────────────────────────────────────
  const reviewedEntries = laneEntries.filter((e) => e.operatorReviewed);
  const operatorReviewedCount = reviewedEntries.length;

  // ── Contradiction recovery rate ────────────────────────────────────────────
  const entriesWithContraAnnotation = reviewedEntries.filter(
    (e) => e.contradictionCaught !== undefined,
  );
  let contradictionRecoveryRate: MaybeInsufficient<number> = INSUFFICIENT;
  if (entriesWithContraAnnotation.length >= 1) {
    const caught = entriesWithContraAnnotation.filter((e) => e.contradictionCaught).length;
    contradictionRecoveryRate = caught / entriesWithContraAnnotation.length;
  }

  // ── Noise precision loss rate ─────────────────────────────────────────────
  const entriesWithNoiseAnnotation = reviewedEntries.filter((e) => e.noiseFlagged !== undefined);
  let noisePrecisionLossRate: MaybeInsufficient<number> = INSUFFICIENT;
  if (entriesWithNoiseAnnotation.length >= 1) {
    const noisy = entriesWithNoiseAnnotation.filter((e) => e.noiseFlagged).length;
    noisePrecisionLossRate = noisy / entriesWithNoiseAnnotation.length;
  }

  // ── P99 latency ───────────────────────────────────────────────────────────
  const latencies = laneEntries.map((e) => e.latencyMs);
  const p99LatencyMs = computeP99(latencies);

  // ── Token overflow count ──────────────────────────────────────────────────
  let tokenOverflowCount: MaybeInsufficient<number> = INSUFFICIENT;
  if (totalEntries > 0) {
    tokenOverflowCount = laneEntries.filter(
      (e) => e.estimatedTokenDelta > SHADOW_TOKEN_OVERFLOW_THRESHOLD,
    ).length;
  }

  // ── Review disambiguation rate ────────────────────────────────────────────
  let reviewDisambiguationRate: MaybeInsufficient<number> = INSUFFICIENT;
  if (totalEntries > 0) {
    const sum = laneEntries.reduce((acc, e) => acc + e.reviewDisambiguationEstimate, 0);
    reviewDisambiguationRate = sum / totalEntries;
  }

  // ── Utilisation rate ──────────────────────────────────────────────────────
  let utilisationRate: MaybeInsufficient<number> = INSUFFICIENT;
  if (totalEntries > 0) {
    if (lane === "associative") {
      // Associative: fraction of turns where the walk produced at least one hit
      const withHits = laneEntries.filter((e) => e.shadowHitCount > 0).length;
      utilisationRate = withHits / totalEntries;
    } else {
      // Trace: average match coverage (hits / baseline notes)
      const entriesWithNotes = laneEntries.filter((e) => e.baselineNoteCount > 0);
      if (entriesWithNotes.length > 0) {
        const sumRate = entriesWithNotes.reduce(
          (acc, e) => acc + e.shadowHitCount / e.baselineNoteCount,
          0,
        );
        utilisationRate = sumRate / entriesWithNotes.length;
      } else {
        utilisationRate = 0;
      }
    }
  }

  // ── Note graph size evidence ───────────────────────────────────────────────
  const noteGraphSizeEvidencePresent = laneEntries.some((e) => e.noteGraphSizeLogged === true);

  // ── Episode summary population rate ───────────────────────────────────────
  let episodeSummaryPopulationRate: MaybeInsufficient<number> = INSUFFICIENT;
  if (lane === "trace") {
    const withRate = laneEntries.filter((e) => e.episodeSummaryPopulationRate !== undefined);
    if (withRate.length > 0) {
      const sum = withRate.reduce((acc, e) => acc + (e.episodeSummaryPopulationRate ?? 0), 0);
      episodeSummaryPopulationRate = sum / withRate.length;
    }
  }

  // ── Promotion gate check ──────────────────────────────────────────────────
  const unmetGateCriteria: string[] = [];

  if (operatorReviewedCount < 10)
    unmetGateCriteria.push(`operatorReviewedCount=${operatorReviewedCount} (need >= 10)`);

  if (contradictionRecoveryRate === INSUFFICIENT)
    unmetGateCriteria.push("contradictionRecoveryRate=INSUFFICIENT (no operator annotations yet)");
  else if (contradictionRecoveryRate < 0.80)
    unmetGateCriteria.push(`contradictionRecoveryRate=${contradictionRecoveryRate.toFixed(3)} (need >= 0.80)`);

  if (noisePrecisionLossRate === INSUFFICIENT)
    unmetGateCriteria.push("noisePrecisionLossRate=INSUFFICIENT (no operator annotations yet)");
  else if (noisePrecisionLossRate > 0.25)
    unmetGateCriteria.push(`noisePrecisionLossRate=${noisePrecisionLossRate.toFixed(3)} (need <= 0.25)`);

  if (p99LatencyMs === INSUFFICIENT)
    unmetGateCriteria.push(`p99LatencyMs=INSUFFICIENT (need >= ${P99_MIN_SAMPLES} samples)`);
  else if (p99LatencyMs > 5)
    unmetGateCriteria.push(`p99LatencyMs=${p99LatencyMs.toFixed(1)}ms (need <= 5ms)`);

  if (tokenOverflowCount === INSUFFICIENT)
    unmetGateCriteria.push("tokenOverflowCount=INSUFFICIENT (no entries yet)");
  else if (tokenOverflowCount > 0)
    unmetGateCriteria.push(`tokenOverflowCount=${tokenOverflowCount} (need 0)`);

  if (!noteGraphSizeEvidencePresent)
    unmetGateCriteria.push("noteGraphSizeEvidencePresent=false (required for graph-density validation)");

  if (lane === "trace") {
    if (episodeSummaryPopulationRate === INSUFFICIENT)
      unmetGateCriteria.push("episodeSummaryPopulationRate=INSUFFICIENT (trace lane only)");
    if (reviewDisambiguationRate === INSUFFICIENT || reviewDisambiguationRate < 0.50)
      unmetGateCriteria.push(
        `reviewDisambiguationRate=${reviewDisambiguationRate === INSUFFICIENT ? "INSUFFICIENT" : reviewDisambiguationRate.toFixed(3)} (trace lane: need >= 0.50)`,
      );
    if (utilisationRate === INSUFFICIENT || utilisationRate < 0.30)
      unmetGateCriteria.push(
        `traceUtilisationRate=${utilisationRate === INSUFFICIENT ? "INSUFFICIENT" : utilisationRate.toFixed(3)} (trace lane: need >= 0.30)`,
      );
  }

  const promotionGateMet = unmetGateCriteria.length === 0;

  return {
    lane,
    totalEntries,
    operatorReviewedCount,
    contradictionRecoveryRate,
    noisePrecisionLossRate,
    p99LatencyMs,
    tokenOverflowCount,
    reviewDisambiguationRate,
    utilisationRate,
    noteGraphSizeEvidencePresent,
    episodeSummaryPopulationRate,
    promotionGateMet,
    unmetGateCriteria,
  };
}

/**
 * Aggregate all shadow entries for both lanes independently.
 * Returns two separate LaneEvidenceReport objects. Never merges the lanes.
 */
export function aggregateAllLanes(entries: AnnotatedShadowEntry[]): {
  associative: LaneEvidenceReport;
  trace: LaneEvidenceReport;
} {
  return {
    associative: aggregateLaneEvidence("associative", entries),
    trace: aggregateLaneEvidence("trace", entries),
  };
}
