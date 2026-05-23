import {
  T10_clean_pass_exits_at_cycle_zero,
  T10_context_builder_called_on_regen,
  T10_max_cycles_hard_cap_at_two,
  T10_turn_not_aborted_when_max_cycles_hit,
  T10_no_associative_retrieval,
} from "./t10LiveCriticFixtures";

const fixtures = [
  { name: "T10_clean_pass_exits_at_cycle_zero", fn: T10_clean_pass_exits_at_cycle_zero },
  { name: "T10_context_builder_called_on_regen", fn: T10_context_builder_called_on_regen },
  { name: "T10_max_cycles_hard_cap_at_two", fn: T10_max_cycles_hard_cap_at_two },
  { name: "T10_turn_not_aborted_when_max_cycles_hit", fn: T10_turn_not_aborted_when_max_cycles_hit },
  { name: "T10_no_associative_retrieval", fn: T10_no_associative_retrieval },
];

async function main() {
  console.log("Starting T10 Live Critic Loop Fixture Suite...\n");

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

  console.log(`\nFinished T10. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T10 runner crashed:", err);
  process.exit(1);
});
