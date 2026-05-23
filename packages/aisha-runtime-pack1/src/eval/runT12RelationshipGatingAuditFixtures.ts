import {
  T12_trust_at_zero_is_not_gated,
  T12_trust_just_below_zero_is_gated,
  T12_high_caution_gates_even_with_neutral_trust,
  T12_caution_at_threshold_is_not_gated,
  T12_trust_and_caution_both_trigger_trust_takes_reason,
  T12_gated_note_is_still_active,
  T12_gated_note_audit_trail_survives_list,
  T12_audit_trail_appends_not_overwrites,
  T12_reinforce_does_not_corrupt_audit_trail,
  T12_superseded_prior_not_retroactively_gated,
  T12_operator_rejected_blocks_auto_reinfer,
  T12_operator_approved_lifts_gating,
  T12_no_context_leaves_note_ungated,
} from "./t12RelationshipGatingAuditFixtures";

const fixtures = [
  { name: "T12_trust_at_zero_is_not_gated", fn: T12_trust_at_zero_is_not_gated },
  { name: "T12_trust_just_below_zero_is_gated", fn: T12_trust_just_below_zero_is_gated },
  { name: "T12_high_caution_gates_even_with_neutral_trust", fn: T12_high_caution_gates_even_with_neutral_trust },
  { name: "T12_caution_at_threshold_is_not_gated", fn: T12_caution_at_threshold_is_not_gated },
  { name: "T12_trust_and_caution_both_trigger_trust_takes_reason", fn: T12_trust_and_caution_both_trigger_trust_takes_reason },
  { name: "T12_gated_note_is_still_active", fn: T12_gated_note_is_still_active },
  { name: "T12_gated_note_audit_trail_survives_list", fn: T12_gated_note_audit_trail_survives_list },
  { name: "T12_audit_trail_appends_not_overwrites", fn: T12_audit_trail_appends_not_overwrites },
  { name: "T12_reinforce_does_not_corrupt_audit_trail", fn: T12_reinforce_does_not_corrupt_audit_trail },
  { name: "T12_superseded_prior_not_retroactively_gated", fn: T12_superseded_prior_not_retroactively_gated },
  { name: "T12_operator_rejected_blocks_auto_reinfer", fn: T12_operator_rejected_blocks_auto_reinfer },
  { name: "T12_operator_approved_lifts_gating", fn: T12_operator_approved_lifts_gating },
  { name: "T12_no_context_leaves_note_ungated", fn: T12_no_context_leaves_note_ungated },
];

async function main() {
  console.log("Starting T12 Relationship Gating + Operator Audit Trail Fixture Suite...\n");

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

  console.log(`\nFinished T12. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T12 runner crashed:", err);
  process.exit(1);
});
