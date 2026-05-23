import {
  T43_empty_entries_produce_all_insufficient,
  T43_p99_requires_min_10_samples,
  T43_p99_computed_correctly_from_samples,
  T43_contradiction_recovery_rate_from_operator_annotations,
  T43_noise_precision_loss_rate_from_operator_annotations,
  T43_token_overflow_counts_correctly,
  T43_review_disambiguation_rate_averages_correctly,
  T43_associative_utilisation_rate_is_hit_fraction,
  T43_trace_utilisation_rate_is_match_coverage,
  T43_note_graph_size_evidence_detected,
  T43_episode_summary_population_rate_trace_only,
  T43_promotion_gate_all_criteria_unmet_when_no_data,
  T43_promotion_gate_partially_met,
  T43_promotion_gate_fully_met,
  T43_lanes_aggregated_independently,
  T43_render_lane_report_markdown_contains_required_fields,
  T43_render_full_report_never_merges_lanes,
  T43_serialize_lane_report_machine_readable,
  T43_insufficient_sentinel_serialized_as_string,
} from "./t43ShadowDataReviewFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T43_empty_entries_produce_all_insufficient", fn: T43_empty_entries_produce_all_insufficient },
  { name: "T43_p99_requires_min_10_samples", fn: T43_p99_requires_min_10_samples },
  { name: "T43_p99_computed_correctly_from_samples", fn: T43_p99_computed_correctly_from_samples },
  { name: "T43_contradiction_recovery_rate_from_operator_annotations", fn: T43_contradiction_recovery_rate_from_operator_annotations },
  { name: "T43_noise_precision_loss_rate_from_operator_annotations", fn: T43_noise_precision_loss_rate_from_operator_annotations },
  { name: "T43_token_overflow_counts_correctly", fn: T43_token_overflow_counts_correctly },
  { name: "T43_review_disambiguation_rate_averages_correctly", fn: T43_review_disambiguation_rate_averages_correctly },
  { name: "T43_associative_utilisation_rate_is_hit_fraction", fn: T43_associative_utilisation_rate_is_hit_fraction },
  { name: "T43_trace_utilisation_rate_is_match_coverage", fn: T43_trace_utilisation_rate_is_match_coverage },
  { name: "T43_note_graph_size_evidence_detected", fn: T43_note_graph_size_evidence_detected },
  { name: "T43_episode_summary_population_rate_trace_only", fn: T43_episode_summary_population_rate_trace_only },
  { name: "T43_promotion_gate_all_criteria_unmet_when_no_data", fn: T43_promotion_gate_all_criteria_unmet_when_no_data },
  { name: "T43_promotion_gate_partially_met", fn: T43_promotion_gate_partially_met },
  { name: "T43_promotion_gate_fully_met", fn: T43_promotion_gate_fully_met },
  { name: "T43_lanes_aggregated_independently", fn: T43_lanes_aggregated_independently },
  { name: "T43_render_lane_report_markdown_contains_required_fields", fn: T43_render_lane_report_markdown_contains_required_fields },
  { name: "T43_render_full_report_never_merges_lanes", fn: T43_render_full_report_never_merges_lanes },
  { name: "T43_serialize_lane_report_machine_readable", fn: T43_serialize_lane_report_machine_readable },
  { name: "T43_insufficient_sentinel_serialized_as_string", fn: T43_insufficient_sentinel_serialized_as_string },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.13 — Shadow Data Review Fixture Suite (T43)");
  console.log("  [REVIEW LAYER ONLY — not a promotion decision]");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      await fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T43. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
