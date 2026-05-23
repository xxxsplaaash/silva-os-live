import {
  T42_walk_does_not_surface_rejected_notes,
  T42_walk_does_not_surface_block_auto_reinfer_notes,
  T42_walk_does_surface_allowed_note_adjacent_to_rejected,
  T42_walk_does_not_expand_through_rejected_intermediate,
  T42_feature_flags_default_off,
  T42_feature_flag_on_when_set_to_one,
  T42_latency_auto_disable_triggers_on_third_overrun,
  T42_latency_overrun_counter_resets_on_fast_turn,
  T42_shadow_associative_returns_null_when_auto_disabled,
  T42_shadow_trace_run_does_not_modify_retrieval_bundle,
  T42_shadow_associative_run_does_not_modify_retrieval_bundle,
  T42_shadow_audit_entry_serializes_to_operator_entry,
} from "./t42ShadowRetrievalFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T42_walk_does_not_surface_rejected_notes", fn: T42_walk_does_not_surface_rejected_notes },
  { name: "T42_walk_does_not_surface_block_auto_reinfer_notes", fn: T42_walk_does_not_surface_block_auto_reinfer_notes },
  { name: "T42_walk_does_surface_allowed_note_adjacent_to_rejected", fn: T42_walk_does_surface_allowed_note_adjacent_to_rejected },
  { name: "T42_walk_does_not_expand_through_rejected_intermediate", fn: T42_walk_does_not_expand_through_rejected_intermediate },
  { name: "T42_feature_flags_default_off", fn: T42_feature_flags_default_off },
  { name: "T42_feature_flag_on_when_set_to_one", fn: T42_feature_flag_on_when_set_to_one },
  { name: "T42_latency_auto_disable_triggers_on_third_overrun", fn: T42_latency_auto_disable_triggers_on_third_overrun },
  { name: "T42_latency_overrun_counter_resets_on_fast_turn", fn: T42_latency_overrun_counter_resets_on_fast_turn },
  { name: "T42_shadow_associative_returns_null_when_auto_disabled", fn: T42_shadow_associative_returns_null_when_auto_disabled },
  { name: "T42_shadow_trace_run_does_not_modify_retrieval_bundle", fn: T42_shadow_trace_run_does_not_modify_retrieval_bundle },
  { name: "T42_shadow_associative_run_does_not_modify_retrieval_bundle", fn: T42_shadow_associative_run_does_not_modify_retrieval_bundle },
  { name: "T42_shadow_audit_entry_serializes_to_operator_entry", fn: T42_shadow_audit_entry_serializes_to_operator_entry },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.12 — Shadow Retrieval Instrumentation Fixture Suite (T42)");
  console.log("  [SHADOW MODE ONLY — flags default OFF in all environments]");
  console.log("═══════════════════════════════════════════════════════════════\n");

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
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T42. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
