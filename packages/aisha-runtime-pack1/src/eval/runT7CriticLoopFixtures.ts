import {
  T7_clean_output_no_cycle,
  T7_contradiction_triggers_one_cycle,
  T7_max_cycles_hit_commits_final_text,
  T7_stale_note_finding_no_retrieval_skip,
  T7_threshold_coherence_finding_no_retrieval,
  T7_critic_loop_absent_pass_through,
  T7_regen_failure_aborts_remaining_cycles,
} from "./t7CriticLoopFixtures";

const fixtures = [
  { name: "T7_clean_output_no_cycle", fn: T7_clean_output_no_cycle },
  { name: "T7_contradiction_triggers_one_cycle", fn: T7_contradiction_triggers_one_cycle },
  { name: "T7_max_cycles_hit_commits_final_text", fn: T7_max_cycles_hit_commits_final_text },
  { name: "T7_stale_note_finding_no_retrieval_skip", fn: T7_stale_note_finding_no_retrieval_skip },
  { name: "T7_threshold_coherence_finding_no_retrieval", fn: T7_threshold_coherence_finding_no_retrieval },
  { name: "T7_critic_loop_absent_pass_through", fn: T7_critic_loop_absent_pass_through },
  { name: "T7_regen_failure_aborts_remaining_cycles", fn: T7_regen_failure_aborts_remaining_cycles },
];

async function main() {
  console.log("Starting T7 Critic Loop Fixture Suite...\n");

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

  console.log(`\nFinished T7. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T7 runner crashed:", err);
  process.exit(1);
});
