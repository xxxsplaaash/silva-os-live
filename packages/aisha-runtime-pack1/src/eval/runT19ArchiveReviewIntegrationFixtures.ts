import {
  T19_integrated_report_with_no_archived_notes,
  T19_integrated_report_includes_all_archive_buckets
} from "./t19ArchiveReviewIntegrationFixtures";

const fixtures = [
  { name: "T19_integrated_report_with_no_archived_notes", fn: T19_integrated_report_with_no_archived_notes },
  { name: "T19_integrated_report_includes_all_archive_buckets", fn: T19_integrated_report_includes_all_archive_buckets },
];

async function main() {
  console.log("Starting T19 Archive Review Integration Evaluation Suite...\n");

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

  console.log(`\nFinished T19. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T19 runner crashed:", err);
  process.exit(1);
});
