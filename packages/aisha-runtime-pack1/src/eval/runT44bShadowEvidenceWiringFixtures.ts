import {
  T44b_associative_shadow_run_appends_to_store,
  T44b_trace_shadow_run_appends_to_store,
  T44b_lanes_append_independently_to_same_store,
  T44b_no_dep_uses_noop_collector_does_not_throw,
  T44b_collector_failure_does_not_propagate,
  T44b_stored_payload_matches_shadow_entry_fields,
  T44b_export_from_store_consumable_by_pack313,
} from "./t44bShadowEvidenceWiringFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T44b_associative_shadow_run_appends_to_store", fn: T44b_associative_shadow_run_appends_to_store },
  { name: "T44b_trace_shadow_run_appends_to_store", fn: T44b_trace_shadow_run_appends_to_store },
  { name: "T44b_lanes_append_independently_to_same_store", fn: T44b_lanes_append_independently_to_same_store },
  { name: "T44b_no_dep_uses_noop_collector_does_not_throw", fn: T44b_no_dep_uses_noop_collector_does_not_throw },
  { name: "T44b_collector_failure_does_not_propagate", fn: T44b_collector_failure_does_not_propagate },
  { name: "T44b_stored_payload_matches_shadow_entry_fields", fn: T44b_stored_payload_matches_shadow_entry_fields },
  { name: "T44b_export_from_store_consumable_by_pack313", fn: T44b_export_from_store_consumable_by_pack313 },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.14b — Shadow Evidence Wiring Fixture Suite (T44b)");
  console.log("  [End-to-end: shadow run → collector → store → Pack 3.13]");
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

  console.log(`\nFinished T44b. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
