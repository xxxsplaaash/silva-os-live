import {
  T18_superseded_archived_after_30_days,
  T18_rejected_archived_after_7_days,
  T18_stale_needs_review_archived_after_21_days,
  T18_active_clean_notes_not_swept_by_age,
  T18_manifest_renders_deterministic_sections
} from "./t18NoteLifecycleFixtures";

const fixtures = [
  { name: "T18_superseded_archived_after_30_days", fn: T18_superseded_archived_after_30_days },
  { name: "T18_rejected_archived_after_7_days", fn: T18_rejected_archived_after_7_days },
  { name: "T18_stale_needs_review_archived_after_21_days", fn: T18_stale_needs_review_archived_after_21_days },
  { name: "T18_active_clean_notes_not_swept_by_age", fn: T18_active_clean_notes_not_swept_by_age },
  { name: "T18_manifest_renders_deterministic_sections", fn: T18_manifest_renders_deterministic_sections }
];

async function main() {
  console.log("Starting T18 Note Lifecycle Evaluation Suite...\n");

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

  console.log(`\nFinished T18. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T18 runner crashed:", err);
  process.exit(1);
});
