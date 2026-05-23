import {
  T36_stale_note_drift_detected,
  T36_critic_catch_rate_calculated,
  T36_false_supersession_rate,
  T36_false_persistence_rate,
} from "./t36MultiSessionTruthFixtures";

const fixtures = [
  { name: "T36_stale_note_drift_detected", fn: T36_stale_note_drift_detected },
  { name: "T36_critic_catch_rate_calculated", fn: T36_critic_catch_rate_calculated },
  { name: "T36_false_supersession_rate", fn: T36_false_supersession_rate },
  { name: "T36_false_persistence_rate", fn: T36_false_persistence_rate },
];

function main() {
  console.log("Starting T36 Multi-Session Truth Metrics Fixture Suite...\n");

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

  console.log(`\nFinished T36. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
