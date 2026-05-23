import {
  T17_clean_session_yields_no_issues,
  T17_contradiction_failure_yields_blocker,
  T17_prompt_bloat_yields_tuning_issue,
  T17_mixed_issues_escalate_to_blocked
} from "./t17SessionReviewWorkflowFixtures";

const fixtures = [
  { name: "T17_clean_session_yields_no_issues", fn: T17_clean_session_yields_no_issues },
  { name: "T17_contradiction_failure_yields_blocker", fn: T17_contradiction_failure_yields_blocker },
  { name: "T17_prompt_bloat_yields_tuning_issue", fn: T17_prompt_bloat_yields_tuning_issue },
  { name: "T17_mixed_issues_escalate_to_blocked", fn: T17_mixed_issues_escalate_to_blocked },
];

async function main() {
  console.log("Starting T17 Session Review Workflow Evaluation Suite...\n");

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

  console.log(`\nFinished T17. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T17 runner crashed:", err);
  process.exit(1);
});
