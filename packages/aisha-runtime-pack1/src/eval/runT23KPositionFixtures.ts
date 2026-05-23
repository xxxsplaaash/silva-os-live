/**
 * Runner for T23 K_position prototype fixtures (Pack 2.7).
 */

import {
  T23_domain_whitelist_blocks_unknown_domain,
  T23_pressure_does_not_affect_bias_or_confidence,
  T23_single_session_does_not_form_assessment,
  T23_two_sessions_does_not_form_assessment,
  T23_three_sessions_crosses_formation_gate,
  T23_formed_but_low_confidence_produces_no_bias_output,
  T23_formed_and_confident_produces_directional_bias,
  T23_counter_evidence_weakens_confidence_and_pulls_bias,
  T23_pressure_log_grows_bias_frozen,
  T23_no_bias_output_before_formation,
  T23_audit_returns_correct_counts,
  T23_multiple_domains_tracked_independently,
  T23_pressure_before_evidence_still_logged,
  T23_reset_clears_all_state,
  T23_k_position_has_zero_imports_from_user_fact_stores,
  T23_shaping_alters_generator_intent_when_k_position_present,
  T23_shaping_alters_generator_directives_for_detail_tolerance,
  T23_shaping_produces_no_visible_text_contamination,
  T23_end_to_end_invisible_shaping_via_processTurn,
  T23_scoped_retrieval_returns_matching_active_domain_bias,
  T23_stale_bias_invalidates_on_domain_context_shift,
  T23_absence_behavior_cleanly_falls_back_to_unshaped,
} from "./t23KPositionFixtures";

const FIXTURES: Array<{ id: string; fn: () => void | Promise<void> }> = [
  { id: "T23_domain_whitelist_blocks_unknown_domain", fn: T23_domain_whitelist_blocks_unknown_domain },
  { id: "T23_pressure_does_not_affect_bias_or_confidence", fn: T23_pressure_does_not_affect_bias_or_confidence },
  { id: "T23_single_session_does_not_form_assessment", fn: T23_single_session_does_not_form_assessment },
  { id: "T23_two_sessions_does_not_form_assessment", fn: T23_two_sessions_does_not_form_assessment },
  { id: "T23_three_sessions_crosses_formation_gate", fn: T23_three_sessions_crosses_formation_gate },
  { id: "T23_formed_but_low_confidence_produces_no_bias_output", fn: T23_formed_but_low_confidence_produces_no_bias_output },
  { id: "T23_formed_and_confident_produces_directional_bias", fn: T23_formed_and_confident_produces_directional_bias },
  { id: "T23_counter_evidence_weakens_confidence_and_pulls_bias", fn: T23_counter_evidence_weakens_confidence_and_pulls_bias },
  { id: "T23_pressure_log_grows_bias_frozen", fn: T23_pressure_log_grows_bias_frozen },
  { id: "T23_no_bias_output_before_formation", fn: T23_no_bias_output_before_formation },
  { id: "T23_audit_returns_correct_counts", fn: T23_audit_returns_correct_counts },
  { id: "T23_multiple_domains_tracked_independently", fn: T23_multiple_domains_tracked_independently },
  { id: "T23_pressure_before_evidence_still_logged", fn: T23_pressure_before_evidence_still_logged },
  { id: "T23_reset_clears_all_state", fn: T23_reset_clears_all_state },
  { id: "T23_k_position_has_zero_imports_from_user_fact_stores", fn: T23_k_position_has_zero_imports_from_user_fact_stores },
  { id: "T23_shaping_alters_generator_intent_when_k_position_present", fn: T23_shaping_alters_generator_intent_when_k_position_present },
  { id: "T23_shaping_alters_generator_directives_for_detail_tolerance", fn: T23_shaping_alters_generator_directives_for_detail_tolerance },
  { id: "T23_shaping_produces_no_visible_text_contamination", fn: T23_shaping_produces_no_visible_text_contamination },
  { id: "T23_end_to_end_invisible_shaping_via_processTurn", fn: T23_end_to_end_invisible_shaping_via_processTurn },
  { id: "T23_scoped_retrieval_returns_matching_active_domain_bias", fn: T23_scoped_retrieval_returns_matching_active_domain_bias },
  { id: "T23_stale_bias_invalidates_on_domain_context_shift", fn: T23_stale_bias_invalidates_on_domain_context_shift },
  { id: "T23_absence_behavior_cleanly_falls_back_to_unshaped", fn: T23_absence_behavior_cleanly_falls_back_to_unshaped },
];

async function main() {
  console.log("Starting T23 K_position Prototype Suite (Pack 2.7)...\n");

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

  console.log(`\nFinished T23. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T23 runner crashed:", err);
  process.exit(1);
});
