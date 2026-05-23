import {
  T15_audit_scenario_perfect_recall,
  T15_audit_scenario_low_recall,
  T15_audit_scenario_continuity_and_bloat,
  T15_audit_scenario_stale_handling,
  T15_audit_scenario_markdown_export,
} from "./t15RealSessionEvalFixtures";

const fixtures = [
  { name: "T15_audit_scenario_perfect_recall", fn: T15_audit_scenario_perfect_recall },
  { name: "T15_audit_scenario_low_recall", fn: T15_audit_scenario_low_recall },
  { name: "T15_audit_scenario_continuity_and_bloat", fn: T15_audit_scenario_continuity_and_bloat },
  { name: "T15_audit_scenario_stale_handling", fn: T15_audit_scenario_stale_handling },
  { name: "T15_audit_scenario_markdown_export", fn: T15_audit_scenario_markdown_export },
];

async function main() {
  console.log("Starting T15 Real-Session Eval Fixture Suite...\n");

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

  console.log(`\nFinished T15. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T15 runner crashed:", err);
  process.exit(1);
});
