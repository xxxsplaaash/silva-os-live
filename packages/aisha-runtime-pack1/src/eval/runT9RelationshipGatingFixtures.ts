import {
  T9_high_trust_extraction_allows_note,
  T9_low_trust_extraction_softens_to_needs_review,
  T9_operator_review_flow,
  T9_multi_session_drift_relaxation,
} from "./t9RelationshipGatingFixtures";

const fixtures = [
  { name: "T9_high_trust_extraction_allows_note", fn: T9_high_trust_extraction_allows_note },
  { name: "T9_low_trust_extraction_softens_to_needs_review", fn: T9_low_trust_extraction_softens_to_needs_review },
  { name: "T9_operator_review_flow", fn: T9_operator_review_flow },
  { name: "T9_multi_session_drift_relaxation", fn: T9_multi_session_drift_relaxation },
];

async function main() {
  console.log("Starting T9 Relationship Gating Fixture Suite...\n");

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

  console.log(`\nFinished T9. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T9 runner crashed:", err);
  process.exit(1);
});
