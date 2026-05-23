/**
 * Runner for T31 Adversarial Continuity Suite.
 *
 * Separate from T30 (labeled extraction audit).
 * Execution order: T22 gate (optional check) → T29 lifecycle → T31 adversarial.
 */

import {
  T31_A1_python_to_rust_reversal_supersedes_correctly,
  T31_A2_reversal_visible_in_context_block_as_superseded,
  T31_A3_deadline_note_survives_tech_stack_reversal,
  T31_B1_durable_preference_provisional_on_cold_start,
  T31_B2_durable_preference_promotes_after_corroboration,
  T31_C1_conditional_truth_demoted_to_provisional,
  T31_C2_ephemeral_affect_does_not_write_to_durable_store,
  T31_D1_boundary_signal_forces_immediate_active_status,
  T31_D2_boundary_note_visible_in_context_block,
  T31_E1_relational_preference_provisional_on_cold_start,
  T31_E2_aversion_does_not_collide_with_positive_preference,
  T31_F1_superseded_note_excluded_from_active_retrieval,
  T31_F2_creative_canon_history_visible_in_context,
  T31_F3_expired_provisional_does_not_re_enter_active_context,
} from "./t31AdversarialContinuityFixtures";

const FIXTURES = [
  // CAT-A: Changed Truths
  { id: "T31_A1_python_to_rust_reversal_supersedes_correctly",       fn: T31_A1_python_to_rust_reversal_supersedes_correctly,       category: "CAT-A: Changed Truths" },
  { id: "T31_A2_reversal_visible_in_context_block_as_superseded",    fn: T31_A2_reversal_visible_in_context_block_as_superseded,    category: "CAT-A: Changed Truths" },
  { id: "T31_A3_deadline_note_survives_tech_stack_reversal",         fn: T31_A3_deadline_note_survives_tech_stack_reversal,         category: "CAT-A: Changed Truths" },
  // CAT-B: Durable Preferences
  { id: "T31_B1_durable_preference_provisional_on_cold_start",       fn: T31_B1_durable_preference_provisional_on_cold_start,       category: "CAT-B: Durable Preferences" },
  { id: "T31_B2_durable_preference_promotes_after_corroboration",    fn: T31_B2_durable_preference_promotes_after_corroboration,    category: "CAT-B: Durable Preferences" },
  // CAT-C: Conditional Truths
  { id: "T31_C1_conditional_truth_demoted_to_provisional",           fn: T31_C1_conditional_truth_demoted_to_provisional,           category: "CAT-C: Conditional Truths" },
  { id: "T31_C2_ephemeral_affect_does_not_write_to_durable_store",   fn: T31_C2_ephemeral_affect_does_not_write_to_durable_store,   category: "CAT-C: Conditional Truths" },
  // CAT-D: Boundaries
  { id: "T31_D1_boundary_signal_forces_immediate_active_status",     fn: T31_D1_boundary_signal_forces_immediate_active_status,     category: "CAT-D: Boundaries" },
  { id: "T31_D2_boundary_note_visible_in_context_block",              fn: T31_D2_boundary_note_visible_in_context_block,             category: "CAT-D: Boundaries" },
  // CAT-E: Relational Pull
  { id: "T31_E1_relational_preference_provisional_on_cold_start",    fn: T31_E1_relational_preference_provisional_on_cold_start,    category: "CAT-E: Relational Pull" },
  { id: "T31_E2_aversion_does_not_collide_with_positive_preference", fn: T31_E2_aversion_does_not_collide_with_positive_preference, category: "CAT-E: Relational Pull" },
  // CAT-F: Creative / Canon / Continuity
  { id: "T31_F1_superseded_note_excluded_from_active_retrieval",     fn: T31_F1_superseded_note_excluded_from_active_retrieval,     category: "CAT-F: Canon/Continuity" },
  { id: "T31_F2_creative_canon_history_visible_in_context",          fn: T31_F2_creative_canon_history_visible_in_context,          category: "CAT-F: Canon/Continuity" },
  { id: "T31_F3_expired_provisional_does_not_re_enter_active_context", fn: T31_F3_expired_provisional_does_not_re_enter_active_context, category: "CAT-F: Canon/Continuity" },
];

async function main() {
  console.log("Starting T31 Adversarial Continuity Suite...\n");

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  let currentCategory = "";

  for (const fixture of FIXTURES) {
    if (fixture.category !== currentCategory) {
      currentCategory = fixture.category;
      console.log(`\n── ${currentCategory} ──────────────────────────────────`);
    }
    process.stdout.write(`  Running [${fixture.id}]... `);
    try {
      await fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log("❌ FAIL");
      console.log(`     → ${msg}`);
      failed++;
      failures.push(`[${fixture.id}] ${msg}`);
    }
  }

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`T31 Adversarial Continuity: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\nFailed fixtures:");
    for (const f of failures) {
      console.log(`  ✗ ${f}`);
    }
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T31 runner crashed:", err);
  process.exit(1);
});
