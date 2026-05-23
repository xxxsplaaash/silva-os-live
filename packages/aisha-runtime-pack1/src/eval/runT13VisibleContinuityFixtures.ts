import {
  T13_fresh_note_no_was_line,
  T13_superseding_note_shows_was_line,
  T13_continuity_on_next_retrieval_turn,
  T13_superseded_text_is_bounded,
  T13_supersession_does_not_corrupt_canonical_text,
  T13_multiple_notes_only_superseding_shows_was,
  T13_stale_and_was_can_coexist,
  T13_supersession_context_empty_no_links,
  T13_list_superseded_by_ids_returns_empty_for_no_link,
  T13_list_superseded_by_ids_returns_prior_text,
  T13_rejected_note_supersession_still_in_context,
  T13_reinforce_does_not_create_supersedes_link,
  T13_was_uses_canonical_text_not_normalized_value,
} from "./t13VisibleContinuityFixtures";

const fixtures = [
  { name: "T13_fresh_note_no_was_line", fn: T13_fresh_note_no_was_line },
  { name: "T13_superseding_note_shows_was_line", fn: T13_superseding_note_shows_was_line },
  { name: "T13_continuity_on_next_retrieval_turn", fn: T13_continuity_on_next_retrieval_turn },
  { name: "T13_superseded_text_is_bounded", fn: T13_superseded_text_is_bounded },
  { name: "T13_supersession_does_not_corrupt_canonical_text", fn: T13_supersession_does_not_corrupt_canonical_text },
  { name: "T13_multiple_notes_only_superseding_shows_was", fn: T13_multiple_notes_only_superseding_shows_was },
  { name: "T13_stale_and_was_can_coexist", fn: T13_stale_and_was_can_coexist },
  { name: "T13_supersession_context_empty_no_links", fn: T13_supersession_context_empty_no_links },
  { name: "T13_list_superseded_by_ids_returns_empty_for_no_link", fn: T13_list_superseded_by_ids_returns_empty_for_no_link },
  { name: "T13_list_superseded_by_ids_returns_prior_text", fn: T13_list_superseded_by_ids_returns_prior_text },
  { name: "T13_rejected_note_supersession_still_in_context", fn: T13_rejected_note_supersession_still_in_context },
  { name: "T13_reinforce_does_not_create_supersedes_link", fn: T13_reinforce_does_not_create_supersedes_link },
  { name: "T13_was_uses_canonical_text_not_normalized_value", fn: T13_was_uses_canonical_text_not_normalized_value },
];

async function main() {
  console.log("Starting T13 Visible Continuity Surfacing Fixture Suite...\n");

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

  console.log(`\nFinished T13. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T13 runner crashed:", err);
  process.exit(1);
});
