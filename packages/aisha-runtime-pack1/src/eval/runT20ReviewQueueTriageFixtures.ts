import {
  T20_rejected_note_auto_expires,
  T20_weak_stale_single_episode_auto_expires,
  T20_strong_multi_episode_no_competitor_auto_confirms,
  T20_auto_confirm_blocked_by_competitor,
  T20_contradiction_flagged_note_is_high_priority_genuine_review,
  T20_mixed_queue_counted_correctly,
} from "./t20ReviewQueueTriageFixtures";

const fixtures = [
  { name: "T20_rejected_note_auto_expires", fn: T20_rejected_note_auto_expires },
  { name: "T20_weak_stale_single_episode_auto_expires", fn: T20_weak_stale_single_episode_auto_expires },
  { name: "T20_strong_multi_episode_no_competitor_auto_confirms", fn: T20_strong_multi_episode_no_competitor_auto_confirms },
  { name: "T20_auto_confirm_blocked_by_competitor", fn: T20_auto_confirm_blocked_by_competitor },
  { name: "T20_contradiction_flagged_note_is_high_priority_genuine_review", fn: T20_contradiction_flagged_note_is_high_priority_genuine_review },
  { name: "T20_mixed_queue_counted_correctly", fn: T20_mixed_queue_counted_correctly },
];

async function main() {
  console.log("Starting T20 Review Queue Triage Evaluation Suite...\n");

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

  console.log(`\nFinished T20. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T20 runner crashed:", err);
  process.exit(1);
});
