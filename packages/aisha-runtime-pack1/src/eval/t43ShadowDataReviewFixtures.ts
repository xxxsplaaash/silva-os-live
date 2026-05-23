/**
 * T43 — Pack 3.13 Shadow Data Review Fixtures
 *
 * REVIEW LAYER ONLY. Deterministic pure-function tests over shadowDataReview
 * and shadowDataReviewReport modules using mocked AnnotatedShadowEntry[] inputs.
 *
 * Coverage:
 *   T43_empty_entries_produce_all_insufficient
 *   T43_p99_requires_min_10_samples
 *   T43_p99_computed_correctly_from_samples
 *   T43_contradiction_recovery_rate_from_operator_annotations
 *   T43_noise_precision_loss_rate_from_operator_annotations
 *   T43_token_overflow_counts_correctly
 *   T43_review_disambiguation_rate_averages_correctly
 *   T43_associative_utilisation_rate_is_hit_fraction
 *   T43_trace_utilisation_rate_is_match_coverage
 *   T43_note_graph_size_evidence_detected
 *   T43_episode_summary_population_rate_trace_only
 *   T43_promotion_gate_all_criteria_unmet_when_no_data
 *   T43_promotion_gate_partially_met
 *   T43_promotion_gate_fully_met
 *   T43_lanes_aggregated_independently
 *   T43_render_lane_report_markdown_contains_required_fields
 *   T43_render_full_report_never_merges_lanes
 *   T43_serialize_lane_report_machine_readable
 *   T43_insufficient_sentinel_serialized_as_string
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import {
  aggregateLaneEvidence,
  aggregateAllLanes,
  computeP99,
  INSUFFICIENT,
  SHADOW_TOKEN_OVERFLOW_THRESHOLD,
  type AnnotatedShadowEntry,
} from "../research/shadowDataReview";
import {
  renderLaneReportMarkdown,
  renderFullShadowDataReport,
  serializeLaneReport,
} from "../research/shadowDataReviewReport";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-26T12:00:00.000Z";

function makeEntry(
  lane: "associative" | "trace",
  opts: Partial<AnnotatedShadowEntry> = {},
): AnnotatedShadowEntry {
  return {
    auditKind: "shadow_retrieval_research",
    lane,
    sessionId: "s_t43",
    turnId: `turn_${Math.random().toString(36).slice(2, 8)}`,
    baselineNoteCount: 5,
    shadowHitCount: 2,
    estimatedTokenDelta: 70,
    latencyMs: 3,
    reviewDisambiguationEstimate: 0.4,
    crossEpisodeDiversityEstimate: 0.5,
    autoDisabledThisTurn: false,
    operatorReviewed: false,
    ...opts,
  };
}

// ─── T43_empty_entries_produce_all_insufficient ───────────────────────────────

export function T43_empty_entries_produce_all_insufficient() {
  const report = aggregateLaneEvidence("associative", []);

  assert.strictEqual(report.totalEntries, 0);
  assert.strictEqual(report.operatorReviewedCount, 0);
  assert.strictEqual(report.contradictionRecoveryRate, INSUFFICIENT);
  assert.strictEqual(report.noisePrecisionLossRate, INSUFFICIENT);
  assert.strictEqual(report.p99LatencyMs, INSUFFICIENT);
  assert.strictEqual(report.tokenOverflowCount, INSUFFICIENT);
  assert.strictEqual(report.reviewDisambiguationRate, INSUFFICIENT);
  assert.strictEqual(report.utilisationRate, INSUFFICIENT);
  assert.strictEqual(report.noteGraphSizeEvidencePresent, false);
  assert.strictEqual(report.promotionGateMet, false);
  assert.ok(report.unmetGateCriteria.length > 0, "must list unmet criteria when no data");
}

// ─── T43_p99_requires_min_10_samples ────────────────────────────────────────

export function T43_p99_requires_min_10_samples() {
  const result9 = computeP99([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.strictEqual(result9, INSUFFICIENT, "fewer than 10 samples must return INSUFFICIENT");

  const result10 = computeP99([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(result10 !== INSUFFICIENT, "10 samples must return a value");
}

// ─── T43_p99_computed_correctly_from_samples ─────────────────────────────────

export function T43_p99_computed_correctly_from_samples() {
  // 100 values 1..100 → p99 = 99
  const values = Array.from({ length: 100 }, (_, i) => i + 1);
  const p99 = computeP99(values);
  assert.ok(p99 !== INSUFFICIENT);
  assert.strictEqual(p99, 99);
}

// ─── T43_contradiction_recovery_rate_from_operator_annotations ───────────────

export function T43_contradiction_recovery_rate_from_operator_annotations() {
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("associative", { operatorReviewed: true, contradictionCaught: true }),
    makeEntry("associative", { operatorReviewed: true, contradictionCaught: true }),
    makeEntry("associative", { operatorReviewed: true, contradictionCaught: false }),
    makeEntry("associative", { operatorReviewed: false }), // not reviewed — excluded
  ];

  const report = aggregateLaneEvidence("associative", entries);

  // 2 caught out of 3 annotated = 0.666...
  assert.ok(report.contradictionRecoveryRate !== INSUFFICIENT);
  assert.ok(Math.abs((report.contradictionRecoveryRate as number) - 2 / 3) < 0.001);
}

// ─── T43_noise_precision_loss_rate_from_operator_annotations ────────────────

export function T43_noise_precision_loss_rate_from_operator_annotations() {
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("trace", { operatorReviewed: true, noiseFlagged: false }),
    makeEntry("trace", { operatorReviewed: true, noiseFlagged: false }),
    makeEntry("trace", { operatorReviewed: true, noiseFlagged: true }),
    makeEntry("trace", { operatorReviewed: true, noiseFlagged: true }),
  ];

  const report = aggregateLaneEvidence("trace", entries);

  // 2 noisy of 4 annotated = 0.5
  assert.ok(report.noisePrecisionLossRate !== INSUFFICIENT);
  assert.strictEqual(report.noisePrecisionLossRate as number, 0.5);
}

// ─── T43_token_overflow_counts_correctly ────────────────────────────────────

export function T43_token_overflow_counts_correctly() {
  const safe = makeEntry("associative", { estimatedTokenDelta: SHADOW_TOKEN_OVERFLOW_THRESHOLD - 1 });
  const overflow = makeEntry("associative", { estimatedTokenDelta: SHADOW_TOKEN_OVERFLOW_THRESHOLD + 1 });

  const report = aggregateLaneEvidence("associative", [safe, overflow, safe]);

  assert.ok(report.tokenOverflowCount !== INSUFFICIENT);
  assert.strictEqual(report.tokenOverflowCount as number, 1, "one overflow entry must be counted");
}

// ─── T43_review_disambiguation_rate_averages_correctly ──────────────────────

export function T43_review_disambiguation_rate_averages_correctly() {
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("trace", { reviewDisambiguationEstimate: 0.6 }),
    makeEntry("trace", { reviewDisambiguationEstimate: 0.4 }),
    makeEntry("trace", { reviewDisambiguationEstimate: 0.8 }),
  ];

  const report = aggregateLaneEvidence("trace", entries);

  assert.ok(report.reviewDisambiguationRate !== INSUFFICIENT);
  assert.ok(Math.abs((report.reviewDisambiguationRate as number) - 0.6) < 0.001);
}

// ─── T43_associative_utilisation_rate_is_hit_fraction ───────────────────────

export function T43_associative_utilisation_rate_is_hit_fraction() {
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("associative", { shadowHitCount: 3 }),  // has hits
    makeEntry("associative", { shadowHitCount: 0 }),  // no hits
    makeEntry("associative", { shadowHitCount: 1 }),  // has hits
  ];

  const report = aggregateLaneEvidence("associative", entries);

  // 2 of 3 turns produced hits = 0.666...
  assert.ok(report.utilisationRate !== INSUFFICIENT);
  assert.ok(Math.abs((report.utilisationRate as number) - 2 / 3) < 0.001);
}

// ─── T43_trace_utilisation_rate_is_match_coverage ───────────────────────────

export function T43_trace_utilisation_rate_is_match_coverage() {
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("trace", { shadowHitCount: 3, baselineNoteCount: 5 }),  // 3/5 = 0.6
    makeEntry("trace", { shadowHitCount: 1, baselineNoteCount: 4 }),  // 1/4 = 0.25
  ];

  const report = aggregateLaneEvidence("trace", entries);

  // avg(0.6, 0.25) = 0.425
  assert.ok(report.utilisationRate !== INSUFFICIENT);
  assert.ok(Math.abs((report.utilisationRate as number) - 0.425) < 0.001);
}

// ─── T43_note_graph_size_evidence_detected ──────────────────────────────────

export function T43_note_graph_size_evidence_detected() {
  const noEvidence = makeEntry("associative", { noteGraphSizeLogged: false });
  const withEvidence = makeEntry("associative", { noteGraphSizeLogged: true });

  const reportWithout = aggregateLaneEvidence("associative", [noEvidence]);
  assert.strictEqual(reportWithout.noteGraphSizeEvidencePresent, false);

  const reportWith = aggregateLaneEvidence("associative", [noEvidence, withEvidence]);
  assert.strictEqual(reportWith.noteGraphSizeEvidencePresent, true);
}

// ─── T43_episode_summary_population_rate_trace_only ─────────────────────────

export function T43_episode_summary_population_rate_trace_only() {
  // Trace: should compute average
  const traceEntries: AnnotatedShadowEntry[] = [
    makeEntry("trace", { episodeSummaryPopulationRate: 0.6 }),
    makeEntry("trace", { episodeSummaryPopulationRate: 0.4 }),
  ];
  const traceReport = aggregateLaneEvidence("trace", traceEntries);
  assert.ok(traceReport.episodeSummaryPopulationRate !== INSUFFICIENT);
  assert.ok(Math.abs((traceReport.episodeSummaryPopulationRate as number) - 0.5) < 0.001);

  // Associative: always INSUFFICIENT
  const assocEntries = [makeEntry("associative", { episodeSummaryPopulationRate: 0.9 })];
  const assocReport = aggregateLaneEvidence("associative", assocEntries);
  assert.strictEqual(
    assocReport.episodeSummaryPopulationRate,
    INSUFFICIENT,
    "associative lane must always return INSUFFICIENT for episodeSummaryPopulationRate",
  );
}

// ─── T43_promotion_gate_all_criteria_unmet_when_no_data ─────────────────────

export function T43_promotion_gate_all_criteria_unmet_when_no_data() {
  const report = aggregateLaneEvidence("associative", []);
  assert.strictEqual(report.promotionGateMet, false);
  assert.ok(report.unmetGateCriteria.length >= 5, "must list multiple unmet criteria");
  // Key criteria must appear
  const criteriaText = report.unmetGateCriteria.join(" ");
  assert.ok(criteriaText.includes("operatorReviewedCount"), "missing operatorReviewedCount");
  assert.ok(criteriaText.includes("contradictionRecoveryRate"), "missing contradictionRecoveryRate");
  assert.ok(criteriaText.includes("p99"), "missing p99");
}

// ─── T43_promotion_gate_partially_met ────────────────────────────────────────

export function T43_promotion_gate_partially_met() {
  // 10 reviewed entries, good contradiction rate, but p99 still INSUFFICIENT (< 10 samples)
  const entries: AnnotatedShadowEntry[] = Array.from({ length: 10 }, (_, i) =>
    makeEntry("associative", {
      operatorReviewed: true,
      contradictionCaught: true,
      noiseFlagged: false,
      latencyMs: 2,
      estimatedTokenDelta: 0,
    }),
  );

  const report = aggregateLaneEvidence("associative", entries);
  // p99 needs >= 10 samples — we have 10, so it should compute
  // contradictionRecoveryRate = 1.0 ✅, noise = 0.0 ✅, p99 = 2ms ✅
  // but noteGraphSizeEvidencePresent = false ❌
  assert.strictEqual(report.promotionGateMet, false);
  assert.ok(
    report.unmetGateCriteria.some((c) => c.includes("noteGraphSizeEvidence")),
    "noteGraphSizeEvidence must be listed as unmet",
  );
}

// ─── T43_promotion_gate_fully_met ────────────────────────────────────────────

export function T43_promotion_gate_fully_met() {
  // Construct a fully-gate-passing associative lane
  const entries: AnnotatedShadowEntry[] = Array.from({ length: 10 }, (_, i) =>
    makeEntry("associative", {
      operatorReviewed: true,
      contradictionCaught: true,   // recovery rate = 1.0
      noiseFlagged: false,          // noise rate = 0.0
      latencyMs: 2,                 // p99 well under 5ms
      estimatedTokenDelta: 0,       // no token overflow
      reviewDisambiguationEstimate: 0.6,
      noteGraphSizeLogged: true,    // graph size evidence present
    }),
  );

  const report = aggregateLaneEvidence("associative", entries);

  assert.ok(report.contradictionRecoveryRate !== INSUFFICIENT);
  assert.ok((report.contradictionRecoveryRate as number) >= 0.80);
  assert.ok(report.noisePrecisionLossRate !== INSUFFICIENT);
  assert.ok((report.noisePrecisionLossRate as number) <= 0.25);
  assert.ok(report.p99LatencyMs !== INSUFFICIENT);
  assert.ok((report.p99LatencyMs as number) <= 5);
  assert.strictEqual(report.tokenOverflowCount as number, 0);
  assert.strictEqual(report.noteGraphSizeEvidencePresent, true);
  assert.strictEqual(report.promotionGateMet, true);
  assert.strictEqual(report.unmetGateCriteria.length, 0);
}

// ─── T43_lanes_aggregated_independently ──────────────────────────────────────

export function T43_lanes_aggregated_independently() {
  // Feed a mix of assoc and trace entries into aggregateAllLanes
  const entries: AnnotatedShadowEntry[] = [
    makeEntry("associative", { shadowHitCount: 5 }),
    makeEntry("trace", { shadowHitCount: 1, episodeSummaryPopulationRate: 0.7 }),
    makeEntry("associative", { shadowHitCount: 3 }),
    makeEntry("trace", { shadowHitCount: 2 }),
  ];

  const reports = aggregateAllLanes(entries);

  assert.strictEqual(reports.associative.lane, "associative");
  assert.strictEqual(reports.trace.lane, "trace");
  assert.strictEqual(reports.associative.totalEntries, 2, "associative must see only 2 entries");
  assert.strictEqual(reports.trace.totalEntries, 2, "trace must see only 2 entries");

  // Episode summary applies to trace only
  assert.ok(reports.trace.episodeSummaryPopulationRate !== INSUFFICIENT);
  assert.strictEqual(reports.associative.episodeSummaryPopulationRate, INSUFFICIENT);
}

// ─── T43_render_lane_report_markdown_contains_required_fields ────────────────

export function T43_render_lane_report_markdown_contains_required_fields() {
  const report = aggregateLaneEvidence("associative", []);
  const md = renderLaneReportMarkdown(report);

  assert.ok(md.includes("Associative Retrieval"), "must include lane name");
  assert.ok(md.includes("Promotion Gate"), "must include gate status");
  assert.ok(md.includes("INSUFFICIENT"), "must surface INSUFFICIENT values");
  assert.ok(md.includes("Contradiction Recovery Rate"), "must include contradiction metric");
  assert.ok(md.includes("p99"), "must include p99");
  assert.ok(md.includes("Token Overflow Count"), "must include token overflow");
  assert.ok(md.includes("Unmet Gate Criteria"), "must list unmet criteria");
}

// ─── T43_render_full_report_never_merges_lanes ───────────────────────────────

export function T43_render_full_report_never_merges_lanes() {
  const assocEntries = [makeEntry("associative", { shadowHitCount: 3 })];
  const traceEntries = [makeEntry("trace", { shadowHitCount: 1 })];

  const reports = aggregateAllLanes([...assocEntries, ...traceEntries]);
  const fullMd = renderFullShadowDataReport(reports, "Test Report");

  // Both sections must appear separately
  assert.ok(fullMd.includes("Associative Retrieval"), "must include associative section");
  assert.ok(fullMd.includes("Trace Consumption"), "must include trace section");
  // A horizontal rule must separate them
  assert.ok(fullMd.includes("---"), "sections must be separated");
  // The summary must reference both individually
  assert.ok(fullMd.includes("Associative Lane Gate"), "must show associative gate status");
  assert.ok(fullMd.includes("Trace Lane Gate"), "must show trace gate status");
}

// ─── T43_serialize_lane_report_machine_readable ──────────────────────────────

export function T43_serialize_lane_report_machine_readable() {
  const report = aggregateLaneEvidence("trace", []);
  const serialized = serializeLaneReport(report);

  assert.strictEqual(serialized.lane, "trace");
  assert.strictEqual(serialized.totalEntries, 0);
  assert.strictEqual(serialized.promotionGateMet, false);
  assert.ok(Array.isArray(serialized.unmetGateCriteria));

  // INSUFFICIENT fields must be serialized as the string "INSUFFICIENT"
  assert.strictEqual(serialized.contradictionRecoveryRate, "INSUFFICIENT");
  assert.strictEqual(serialized.p99LatencyMs, "INSUFFICIENT");
}

// ─── T43_insufficient_sentinel_serialized_as_string ─────────────────────────

export function T43_insufficient_sentinel_serialized_as_string() {
  const report = aggregateLaneEvidence("associative", []);
  const serialized = serializeLaneReport(report);

  // All MaybeInsufficient fields should be either a number or exactly "INSUFFICIENT"
  const insufficientFields = [
    "contradictionRecoveryRate",
    "noisePrecisionLossRate",
    "p99LatencyMs",
    "tokenOverflowCount",
    "reviewDisambiguationRate",
    "utilisationRate",
    "episodeSummaryPopulationRate",
  ];

  for (const field of insufficientFields) {
    const val = serialized[field];
    assert.ok(
      val === "INSUFFICIENT" || typeof val === "number",
      `${field} must be "INSUFFICIENT" or a number, got ${JSON.stringify(val)}`,
    );
  }

  // JSON roundtrip must preserve the sentinel
  const json = JSON.stringify(serialized);
  const parsed = JSON.parse(json);
  assert.strictEqual(
    parsed.contradictionRecoveryRate,
    "INSUFFICIENT",
    "INSUFFICIENT must survive JSON roundtrip",
  );
}
