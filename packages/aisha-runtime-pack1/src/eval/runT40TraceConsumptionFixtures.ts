import {
  T40_extract_trace_event_labels_contradiction,
  T40_extract_trace_event_labels_preference_assertion,
  T40_extract_trace_event_labels_stale_context,
  T40_extract_trace_event_no_labels_for_neutral_turn,
  T40_extract_episode_trace_event_returns_null_without_summary,
  T40_extract_episode_trace_event_labels_contradiction,
  T40_token_overlap_zero_for_unrelated_text,
  T40_match_trace_to_note_supports,
  T40_match_trace_to_note_contradicts,
  T40_match_trace_to_note_returns_null_below_threshold,
  T40_run_trace_consumption_classifies_supported_and_contradicted,
  T40_run_trace_consumption_orphans_unmatched_notes,
  T40_contradiction_recovery_rate_with_ground_truth,
  T40_stale_rescue_rate_with_ground_truth,
  T40_stale_rescue_proxy_without_ground_truth,
  T40_noise_precision_loss_rate,
  T40_review_disambiguation_rate,
  T40_delta_metrics_vs_baseline_and_associative,
  T40_render_metrics_markdown,
} from "./t40TraceConsumptionFixtures";

const fixtures = [
  { name: "T40_extract_trace_event_labels_contradiction", fn: T40_extract_trace_event_labels_contradiction },
  { name: "T40_extract_trace_event_labels_preference_assertion", fn: T40_extract_trace_event_labels_preference_assertion },
  { name: "T40_extract_trace_event_labels_stale_context", fn: T40_extract_trace_event_labels_stale_context },
  { name: "T40_extract_trace_event_no_labels_for_neutral_turn", fn: T40_extract_trace_event_no_labels_for_neutral_turn },
  { name: "T40_extract_episode_trace_event_returns_null_without_summary", fn: T40_extract_episode_trace_event_returns_null_without_summary },
  { name: "T40_extract_episode_trace_event_labels_contradiction", fn: T40_extract_episode_trace_event_labels_contradiction },
  { name: "T40_token_overlap_zero_for_unrelated_text", fn: T40_token_overlap_zero_for_unrelated_text },
  { name: "T40_match_trace_to_note_supports", fn: T40_match_trace_to_note_supports },
  { name: "T40_match_trace_to_note_contradicts", fn: T40_match_trace_to_note_contradicts },
  { name: "T40_match_trace_to_note_returns_null_below_threshold", fn: T40_match_trace_to_note_returns_null_below_threshold },
  { name: "T40_run_trace_consumption_classifies_supported_and_contradicted", fn: T40_run_trace_consumption_classifies_supported_and_contradicted },
  { name: "T40_run_trace_consumption_orphans_unmatched_notes", fn: T40_run_trace_consumption_orphans_unmatched_notes },
  { name: "T40_contradiction_recovery_rate_with_ground_truth", fn: T40_contradiction_recovery_rate_with_ground_truth },
  { name: "T40_stale_rescue_rate_with_ground_truth", fn: T40_stale_rescue_rate_with_ground_truth },
  { name: "T40_stale_rescue_proxy_without_ground_truth", fn: T40_stale_rescue_proxy_without_ground_truth },
  { name: "T40_noise_precision_loss_rate", fn: T40_noise_precision_loss_rate },
  { name: "T40_review_disambiguation_rate", fn: T40_review_disambiguation_rate },
  { name: "T40_delta_metrics_vs_baseline_and_associative", fn: T40_delta_metrics_vs_baseline_and_associative },
  { name: "T40_render_metrics_markdown", fn: T40_render_metrics_markdown },
];

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.10 — Trace Consumption Research Fixture Suite");
  console.log("  [RESEARCH LANE ONLY — not wired to production hot path]");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T40. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
