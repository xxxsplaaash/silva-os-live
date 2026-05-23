import {
  T21_mixed_session_calculates_all_turn_latency_tax,
  T21_strict_useful_alignment_requires_purging_contradicted_text,
  T21_budget_exhaustion_is_captured,
  T21_harmful_regression_detects_panic_truncations,
  T21_report_export_surfaces_all_macro_cost_metrics,
} from "./t21CriticEffectivenessFixtures";

const fixtures = [
  { name: "T21_mixed_session_calculates_all_turn_latency_tax",               fn: T21_mixed_session_calculates_all_turn_latency_tax },
  { name: "T21_strict_useful_alignment_requires_purging_contradicted_text",  fn: T21_strict_useful_alignment_requires_purging_contradicted_text },
  { name: "T21_budget_exhaustion_is_captured",                               fn: T21_budget_exhaustion_is_captured },
  { name: "T21_harmful_regression_detects_panic_truncations",                fn: T21_harmful_regression_detects_panic_truncations },
  { name: "T21_report_export_surfaces_all_macro_cost_metrics",               fn: T21_report_export_surfaces_all_macro_cost_metrics },
];

async function main() {
  console.log("Starting T21 Strict Critic Effectiveness Suite...\n");
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
      console.log(`   - ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T21. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T21 runner crashed:", err);
  process.exit(1);
});
