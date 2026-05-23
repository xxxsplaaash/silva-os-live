/**
 * Runner for T29 provisional lifecycle evaluation (Pack 2.6).
 *
 * Execution order:
 *   Step 0 gate: T22 (labeled extraction) must pass before this suite runs.
 *   Step 1-12:  T29 provisional lifecycle tests.
 */

import {
  T29_provisional_note_routes_to_listProvisionalNotes_not_listActiveNotes,
  T29_provisional_note_absent_from_active_retrieval,
  T29_provisional_note_absent_from_contradiction_evidence,
  T29_evaluateProvisionalPromotion_promotes_when_multi_episode_and_conf,
  T29_evaluateProvisionalPromotion_does_not_promote_single_episode,
  T29_evaluateProvisionalPromotion_does_not_promote_low_confidence,
  T29_evaluateProvisionalPromotion_expires_past_expiresAt,
  T29_stale_note_excluded_from_listActiveNotes,
  T29_stale_note_archives_via_evaluateArchiveEligibility,
  T29_stale_note_not_archived_when_young,
  T29_k_boundary_is_never_provisional,
  T29_listProvisionalNotes_filter_by_subjectPersonId,
  T29_promotion_clears_expiresAt,
  T29_evaluateProvisionalPromotion_does_not_promote_exact_boundary,
} from "./t29ProvisionalLifecycleFixtures";

const FIXTURES = [
  {
    id: "T29_provisional_note_routes_to_listProvisionalNotes_not_listActiveNotes",
    fn: T29_provisional_note_routes_to_listProvisionalNotes_not_listActiveNotes,
  },
  {
    id: "T29_provisional_note_absent_from_active_retrieval",
    fn: T29_provisional_note_absent_from_active_retrieval,
  },
  {
    id: "T29_provisional_note_absent_from_contradiction_evidence",
    fn: T29_provisional_note_absent_from_contradiction_evidence,
  },
  {
    id: "T29_evaluateProvisionalPromotion_promotes_when_multi_episode_and_conf",
    fn: T29_evaluateProvisionalPromotion_promotes_when_multi_episode_and_conf,
  },
  {
    id: "T29_evaluateProvisionalPromotion_does_not_promote_single_episode",
    fn: T29_evaluateProvisionalPromotion_does_not_promote_single_episode,
  },
  {
    id: "T29_evaluateProvisionalPromotion_does_not_promote_low_confidence",
    fn: T29_evaluateProvisionalPromotion_does_not_promote_low_confidence,
  },
  {
    id: "T29_evaluateProvisionalPromotion_expires_past_expiresAt",
    fn: T29_evaluateProvisionalPromotion_expires_past_expiresAt,
  },
  {
    id: "T29_stale_note_excluded_from_listActiveNotes",
    fn: T29_stale_note_excluded_from_listActiveNotes,
  },
  {
    id: "T29_stale_note_archives_via_evaluateArchiveEligibility",
    fn: T29_stale_note_archives_via_evaluateArchiveEligibility,
  },
  {
    id: "T29_stale_note_not_archived_when_young",
    fn: T29_stale_note_not_archived_when_young,
  },
  {
    id: "T29_k_boundary_is_never_provisional",
    fn: T29_k_boundary_is_never_provisional,
  },
  {
    id: "T29_listProvisionalNotes_filter_by_subjectPersonId",
    fn: T29_listProvisionalNotes_filter_by_subjectPersonId,
  },
  {
    id: "T29_promotion_clears_expiresAt",
    fn: T29_promotion_clears_expiresAt,
  },
  {
    id: "T29_evaluateProvisionalPromotion_does_not_promote_exact_boundary",
    fn: T29_evaluateProvisionalPromotion_does_not_promote_exact_boundary,
  },
];

async function main() {
  console.log("Starting T29 Provisional Lifecycle Suite (Pack 2.6)...\n");

  let passed = 0;
  let failed = 0;

  for (const fixture of FIXTURES) {
    process.stdout.write(`Running [${fixture.id}]... `);
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

  console.log(`\nFinished T29. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T29 runner crashed:", err);
  process.exit(1);
});
