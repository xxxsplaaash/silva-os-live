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
/**
 * Insufficiency sentinel values for metrics that cannot be computed
 * because real-session evidence is absent.
 */
export declare const INSUFFICIENT: "INSUFFICIENT";
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
/**
 * Conservative prompt token budget cap for pack 3.11 overflow detection.
 * Based on MAX_ACTIVE_NOTES=8 × 35 tokens each = 280 baseline notes budget.
 * Any estimatedTokenDelta > SHADOW_TOKEN_OVERFLOW_THRESHOLD flags a risk.
 */
export declare const PROMPT_TOKEN_BUDGET_CAP = 280;
export declare const SHADOW_TOKEN_OVERFLOW_THRESHOLD = 280;
export declare function computeP99(values: number[]): MaybeInsufficient<number>;
/**
 * Aggregate AnnotatedShadowEntry[] for a single lane into a LaneEvidenceReport.
 * Pure function. Same inputs → same outputs.
 *
 * @param lane      Which lane to aggregate ("associative" | "trace").
 * @param entries   All AnnotatedShadowEntry[] for this lane (pre-filtered by lane).
 */
export declare function aggregateLaneEvidence(lane: "associative" | "trace", entries: AnnotatedShadowEntry[]): LaneEvidenceReport;
/**
 * Aggregate all shadow entries for both lanes independently.
 * Returns two separate LaneEvidenceReport objects. Never merges the lanes.
 */
export declare function aggregateAllLanes(entries: AnnotatedShadowEntry[]): {
    associative: LaneEvidenceReport;
    trace: LaneEvidenceReport;
};
