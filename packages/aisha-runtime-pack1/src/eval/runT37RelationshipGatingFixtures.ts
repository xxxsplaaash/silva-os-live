import {
  T37_high_trust_aligned_notes_accepted,
  T37_low_trust_rejected,
  T37_weakly_grounded_rejected,
  T37_contradiction_does_not_bypass_review_on_high_trust,
} from "./t37RelationshipGatingFixtures";

const fixtures = [
  { name: "T37_high_trust_aligned_notes_accepted", fn: T37_high_trust_aligned_notes_accepted },
  { name: "T37_low_trust_rejected", fn: T37_low_trust_rejected },
  { name: "T37_weakly_grounded_rejected", fn: T37_weakly_grounded_rejected },
  { name: "T37_contradiction_does_not_bypass_review_on_high_trust", fn: T37_contradiction_does_not_bypass_review_on_high_trust },
];

async function main() {
  console.log("Starting T37 Advanced Relationship Acceptance Gating Fixture Suite...\n");

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

  console.log(`\nFinished T37. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
