import {
  T14_behavioral_go_to_is,
  T14_behavioral_usually_get,
  T14_behavioral_typically_have,
  T14_behavioral_always_order,
  T14_behavioral_start_my_day_with,
  T14_avoidance_i_avoid,
  T14_avoidance_stay_away_from,
  T14_avoidance_gave_up,
  T14_behavior_described_go_for_drink,
  T14_behavior_described_ill_have_coffee,
  T14_gate_passes_implied_only,
  T14_gate_rejects_pure_ephemeral_chatter,
  T14_behavioral_confidence_below_explicit,
  T14_avoidance_confidence_calibration,
  T14_deduplication_same_implied_twice,
  T14_explicit_still_works_alongside_new,
  T14_behavior_described_non_domain_not_extracted,
  T14_provenance_chain_per_group,
} from "./t14ExtractionCoverageFixtures";

const fixtures = [
  { name: "T14_behavioral_go_to_is", fn: T14_behavioral_go_to_is },
  { name: "T14_behavioral_usually_get", fn: T14_behavioral_usually_get },
  { name: "T14_behavioral_typically_have", fn: T14_behavioral_typically_have },
  { name: "T14_behavioral_always_order", fn: T14_behavioral_always_order },
  { name: "T14_behavioral_start_my_day_with", fn: T14_behavioral_start_my_day_with },
  { name: "T14_avoidance_i_avoid", fn: T14_avoidance_i_avoid },
  { name: "T14_avoidance_stay_away_from", fn: T14_avoidance_stay_away_from },
  { name: "T14_avoidance_gave_up", fn: T14_avoidance_gave_up },
  { name: "T14_behavior_described_go_for_drink", fn: T14_behavior_described_go_for_drink },
  { name: "T14_behavior_described_ill_have_coffee", fn: T14_behavior_described_ill_have_coffee },
  { name: "T14_gate_passes_implied_only", fn: T14_gate_passes_implied_only },
  { name: "T14_gate_rejects_pure_ephemeral_chatter", fn: T14_gate_rejects_pure_ephemeral_chatter },
  { name: "T14_behavioral_confidence_below_explicit", fn: T14_behavioral_confidence_below_explicit },
  { name: "T14_avoidance_confidence_calibration", fn: T14_avoidance_confidence_calibration },
  { name: "T14_deduplication_same_implied_twice", fn: T14_deduplication_same_implied_twice },
  { name: "T14_explicit_still_works_alongside_new", fn: T14_explicit_still_works_alongside_new },
  { name: "T14_behavior_described_non_domain_not_extracted", fn: T14_behavior_described_non_domain_not_extracted },
  { name: "T14_provenance_chain_per_group", fn: T14_provenance_chain_per_group },
];

async function main() {
  console.log("Starting T14 Extraction Coverage Fixture Suite...\n");

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

  console.log(`\nFinished T14. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T14 runner crashed:", err);
  process.exit(1);
});
