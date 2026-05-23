import {
  T44c_buildProductionRuntime_deps_has_real_collector,
  T44c_collector_from_deps_appends_associative_evidence,
  T44c_collector_from_deps_appends_trace_evidence,
  T44c_supplied_store_is_reused_not_replaced,
  T44c_fresh_store_created_when_none_supplied,
  T44c_collector_does_not_touch_bundle_fields,
} from "./t44cCompositionRootFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T44c_buildProductionRuntime_deps_has_real_collector", fn: T44c_buildProductionRuntime_deps_has_real_collector },
  { name: "T44c_collector_from_deps_appends_associative_evidence", fn: T44c_collector_from_deps_appends_associative_evidence },
  { name: "T44c_collector_from_deps_appends_trace_evidence", fn: T44c_collector_from_deps_appends_trace_evidence },
  { name: "T44c_supplied_store_is_reused_not_replaced", fn: T44c_supplied_store_is_reused_not_replaced },
  { name: "T44c_fresh_store_created_when_none_supplied", fn: T44c_fresh_store_created_when_none_supplied },
  { name: "T44c_collector_does_not_touch_bundle_fields", fn: T44c_collector_does_not_touch_bundle_fields },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.14c — Composition Root Injection Fixture Suite (T44c)");
  console.log("  [buildProductionRuntime() → real collector → real store]");
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

  console.log(`\nFinished T44c. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
