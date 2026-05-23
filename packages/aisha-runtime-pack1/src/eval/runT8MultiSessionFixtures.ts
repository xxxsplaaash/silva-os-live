import {
  T8_stable_notes_across_three_sessions,
  T8_instability_detected_when_value_changes,
  T8_contradiction_recovery_one_of_two,
  T8_stale_promotion_counted_correctly,
  T8_persisted_throughout_count,
  T8_empty_sessions_returns_zero_metrics,
  T8_single_session_all_active,
} from "./t8MultiSessionFixtures";

const fixtures = [
  { name: "T8_stable_notes_across_three_sessions", fn: T8_stable_notes_across_three_sessions },
  { name: "T8_instability_detected_when_value_changes", fn: T8_instability_detected_when_value_changes },
  { name: "T8_contradiction_recovery_one_of_two", fn: T8_contradiction_recovery_one_of_two },
  { name: "T8_stale_promotion_counted_correctly", fn: T8_stale_promotion_counted_correctly },
  { name: "T8_persisted_throughout_count", fn: T8_persisted_throughout_count },
  { name: "T8_empty_sessions_returns_zero_metrics", fn: T8_empty_sessions_returns_zero_metrics },
  { name: "T8_single_session_all_active", fn: T8_single_session_all_active },
];

function main() {
  console.log("Starting T8 Multi-Session Truth Metrics Fixture Suite...\n");

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
      console.log(`   - ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T8. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
