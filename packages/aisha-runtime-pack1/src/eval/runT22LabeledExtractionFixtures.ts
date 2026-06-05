/**
 * Runner for T22 labeled extraction evaluation baseline (Pack 2.6).
 */

import {
  T22_temporary_state_is_demoted,
  T22_conditional_preference_is_demoted,
  T22_ambivalent_preference_is_demoted,
  T22_aspiration_intention_is_suppressed,
  T22_stable_preference_is_provisional_on_cold_start,
  T22_stable_profile_is_provisional_on_cold_start,
  T22_k_boundary_is_immediately_active,
  T22_stacked_hedges_compound_correctly,
  T22_avoidance_signal_is_provisional,
  T22_utterance_history_denial_is_not_profile_memory,
  T22_assistant_attributed_preference_is_not_profile_memory,
} from "./t22LabeledExtractionFixtures";

const FIXTURES = [
  { id: "T22_temporary_state_is_demoted", fn: T22_temporary_state_is_demoted },
  { id: "T22_conditional_preference_is_demoted", fn: T22_conditional_preference_is_demoted },
  { id: "T22_ambivalent_preference_is_demoted", fn: T22_ambivalent_preference_is_demoted },
  { id: "T22_aspiration_intention_is_suppressed", fn: T22_aspiration_intention_is_suppressed },
  { id: "T22_stable_preference_is_provisional_on_cold_start", fn: T22_stable_preference_is_provisional_on_cold_start },
  { id: "T22_stable_profile_is_provisional_on_cold_start", fn: T22_stable_profile_is_provisional_on_cold_start },
  { id: "T22_k_boundary_is_immediately_active", fn: T22_k_boundary_is_immediately_active },
  { id: "T22_stacked_hedges_compound_correctly", fn: T22_stacked_hedges_compound_correctly },
  { id: "T22_avoidance_signal_is_provisional", fn: T22_avoidance_signal_is_provisional },
  { id: "T22_utterance_history_denial_is_not_profile_memory", fn: T22_utterance_history_denial_is_not_profile_memory },
  { id: "T22_assistant_attributed_preference_is_not_profile_memory", fn: T22_assistant_attributed_preference_is_not_profile_memory },
];

async function main() {
  console.log("Starting T22 Labeled Extraction Suite (Pack 2.6 Step 0 Gate)...\n");

  let passed = 0;
  let failed = 0;

  for (const fixture of FIXTURES) {
    process.stdout.write(`Running [${fixture.id}]... `);
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

  console.log(`\nFinished T22. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T22 runner crashed:", err);
  process.exit(1);
});
