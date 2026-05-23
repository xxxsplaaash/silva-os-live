import {
  T39_graph_builder_builds_bidirectional_edges,
  T39_walk_reaches_direct_support_link,
  T39_walk_does_not_traverse_supersedes_forward,
  T39_walk_respects_max_hops,
  T39_walk_excludes_seeds_from_hits,
  T39_contradiction_recall_measured_correctly,
  T39_stale_rescue_rate_measured_with_ground_truth,
  T39_stale_rescue_proxy_without_ground_truth,
  T39_cross_episode_diversity_measured,
  T39_noise_precision_loss_measured,
  T39_cross_episode_link_finder,
  T39_full_pipeline_baseline_vs_associative_comparison,
  T39_render_metrics_markdown,
} from "./t39AssociativeRetrievalFixtures";

const fixtures = [
  { name: "T39_graph_builder_builds_bidirectional_edges", fn: T39_graph_builder_builds_bidirectional_edges },
  { name: "T39_walk_reaches_direct_support_link", fn: T39_walk_reaches_direct_support_link },
  { name: "T39_walk_does_not_traverse_supersedes_forward", fn: T39_walk_does_not_traverse_supersedes_forward },
  { name: "T39_walk_respects_max_hops", fn: T39_walk_respects_max_hops },
  { name: "T39_walk_excludes_seeds_from_hits", fn: T39_walk_excludes_seeds_from_hits },
  { name: "T39_contradiction_recall_measured_correctly", fn: T39_contradiction_recall_measured_correctly },
  { name: "T39_stale_rescue_rate_measured_with_ground_truth", fn: T39_stale_rescue_rate_measured_with_ground_truth },
  { name: "T39_stale_rescue_proxy_without_ground_truth", fn: T39_stale_rescue_proxy_without_ground_truth },
  { name: "T39_cross_episode_diversity_measured", fn: T39_cross_episode_diversity_measured },
  { name: "T39_noise_precision_loss_measured", fn: T39_noise_precision_loss_measured },
  { name: "T39_cross_episode_link_finder", fn: T39_cross_episode_link_finder },
  { name: "T39_full_pipeline_baseline_vs_associative_comparison", fn: T39_full_pipeline_baseline_vs_associative_comparison },
  { name: "T39_render_metrics_markdown", fn: T39_render_metrics_markdown },
];

function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.9 — Associative Retrieval Research Fixture Suite");
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

  console.log(`\nFinished T39. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
