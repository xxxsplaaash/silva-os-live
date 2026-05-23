import {
  T11_persist_review_signals_sets_last_reviewed_at,
  T11_review_state_survives_subsequent_list,
  T11_contradiction_signal_persists,
  T11_already_needs_review_stays_needs_review_on_neutral_turn,
  T11_combined_signals_budget_cap,
  T11_multi_session_state_readable,
  T11_priority_upgrade_preserves_higher_reason,
} from "./t11PersistedReconsolidationFixtures";

const fixtures = [
  { name: "T11_persist_review_signals_sets_last_reviewed_at", fn: T11_persist_review_signals_sets_last_reviewed_at },
  { name: "T11_review_state_survives_subsequent_list", fn: T11_review_state_survives_subsequent_list },
  { name: "T11_contradiction_signal_persists", fn: T11_contradiction_signal_persists },
  { name: "T11_already_needs_review_stays_needs_review_on_neutral_turn", fn: T11_already_needs_review_stays_needs_review_on_neutral_turn },
  { name: "T11_combined_signals_budget_cap", fn: T11_combined_signals_budget_cap },
  { name: "T11_multi_session_state_readable", fn: T11_multi_session_state_readable },
  { name: "T11_priority_upgrade_preserves_higher_reason", fn: T11_priority_upgrade_preserves_higher_reason },
];

async function main() {
  console.log("Starting T11 Persisted Reconsolidation Fixture Suite...\n");

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

  console.log(`\nFinished T11. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T11 runner crashed:", err);
  process.exit(1);
});
