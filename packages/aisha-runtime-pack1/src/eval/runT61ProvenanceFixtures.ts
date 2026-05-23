import {
  T61_raw_confidence_frozen_on_reinforce,
  T61_joint_gate_episode_override,
  T61_joint_gate_single_episode_fails,
  T61_stale_prompt_annotation,
  T61_fresh_note_no_stale_annotation,
  T61_combined_signal_cap,
  T61_review_budget_ceiling,
} from "./t61ProvenanceFixtures";

async function main() {
  console.log("Starting T61 Provenance & Memory-Strength Fixture Suite...\n");

  let passed = 0;
  let failed = 0;

  const run = async (name: string, fn: () => Promise<void>) => {
    process.stdout.write(`Running [${name}]... `);
    try {
      await fn();
      console.log("✅ PASS");
      passed++;
    } catch (e: any) {
      console.log("❌ FAIL");
      console.error(`   - ${e.message}`);
      failed++;
    }
  };

  await run("T61_raw_confidence_frozen_on_reinforce", T61_raw_confidence_frozen_on_reinforce);
  await run("T61_joint_gate_episode_override", T61_joint_gate_episode_override);
  await run("T61_joint_gate_single_episode_fails", T61_joint_gate_single_episode_fails);
  await run("T61_stale_prompt_annotation", T61_stale_prompt_annotation);
  await run("T61_fresh_note_no_stale_annotation", T61_fresh_note_no_stale_annotation);
  await run("T61_combined_signal_cap", T61_combined_signal_cap);
  await run("T61_review_budget_ceiling", T61_review_budget_ceiling);

  console.log(`\nFinished T61. Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN T61 RUNNER:", err);
  process.exit(1);
});
