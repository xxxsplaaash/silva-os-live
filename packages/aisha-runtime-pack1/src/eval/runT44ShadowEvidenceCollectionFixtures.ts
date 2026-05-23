import {
  T44_append_stores_frozen_payload,
  T44_append_preserves_lane_separation,
  T44_raw_payload_is_not_mutated_by_annotation,
  T44_annotation_unknown_evidenceid_throws,
  T44_annotation_overlay_merges_without_touching_payload,
  T44_export_for_review_includes_all_annotation_fields,
  T44_export_for_review_unannotated_defaults_operatorreview_false,
  T44_exportall_never_merges_lanes,
  T44_collector_returns_evidenceid,
  T44_collector_silently_handles_store_errors,
  T44_noop_collector_returns_null,
  T44_snapshot_export_preserves_lane_separation,
  T44_snapshot_import_restores_records_and_annotations,
  T44_imported_snapshot_payload_is_frozen,
  T44_export_consumable_by_pack313_aggregation,
  T44_evidence_ids_are_unique_per_append,
} from "./t44ShadowEvidenceCollectionFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T44_append_stores_frozen_payload", fn: T44_append_stores_frozen_payload },
  { name: "T44_append_preserves_lane_separation", fn: T44_append_preserves_lane_separation },
  { name: "T44_raw_payload_is_not_mutated_by_annotation", fn: T44_raw_payload_is_not_mutated_by_annotation },
  { name: "T44_annotation_unknown_evidenceid_throws", fn: T44_annotation_unknown_evidenceid_throws },
  { name: "T44_annotation_overlay_merges_without_touching_payload", fn: T44_annotation_overlay_merges_without_touching_payload },
  { name: "T44_export_for_review_includes_all_annotation_fields", fn: T44_export_for_review_includes_all_annotation_fields },
  { name: "T44_export_for_review_unannotated_defaults_operatorreview_false", fn: T44_export_for_review_unannotated_defaults_operatorreview_false },
  { name: "T44_exportall_never_merges_lanes", fn: T44_exportall_never_merges_lanes },
  { name: "T44_collector_returns_evidenceid", fn: T44_collector_returns_evidenceid },
  { name: "T44_collector_silently_handles_store_errors", fn: T44_collector_silently_handles_store_errors },
  { name: "T44_noop_collector_returns_null", fn: T44_noop_collector_returns_null },
  { name: "T44_snapshot_export_preserves_lane_separation", fn: T44_snapshot_export_preserves_lane_separation },
  { name: "T44_snapshot_import_restores_records_and_annotations", fn: T44_snapshot_import_restores_records_and_annotations },
  { name: "T44_imported_snapshot_payload_is_frozen", fn: T44_imported_snapshot_payload_is_frozen },
  { name: "T44_export_consumable_by_pack313_aggregation", fn: T44_export_consumable_by_pack313_aggregation },
  { name: "T44_evidence_ids_are_unique_per_append", fn: T44_evidence_ids_are_unique_per_append },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.14 — Shadow Evidence Collection Fixture Suite (T44)");
  console.log("  [EVIDENCE COLLECTION ONLY — no promotion in this pack]");
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

  console.log(`\nFinished T44. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
