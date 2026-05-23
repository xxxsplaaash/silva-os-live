import {
  T45_sampled_associative_evidence_exports_correctly,
  T45_sampled_trace_evidence_exports_correctly,
  T45_lanes_remain_separate_on_export,
  T45_annotations_do_not_overwrite_raw_payloads,
  T45_exported_evidence_consumable_by_pack313,
  T45_missing_annotations_produce_insufficient_not_pass,
} from "./t45ShadowSessionSamplingFixtures";

const fixtures: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: "T45_sampled_associative_evidence_exports_correctly", fn: T45_sampled_associative_evidence_exports_correctly },
  { name: "T45_sampled_trace_evidence_exports_correctly", fn: T45_sampled_trace_evidence_exports_correctly },
  { name: "T45_lanes_remain_separate_on_export", fn: T45_lanes_remain_separate_on_export },
  { name: "T45_annotations_do_not_overwrite_raw_payloads", fn: T45_annotations_do_not_overwrite_raw_payloads },
  { name: "T45_exported_evidence_consumable_by_pack313", fn: T45_exported_evidence_consumable_by_pack313 },
  { name: "T45_missing_annotations_produce_insufficient_not_pass", fn: T45_missing_annotations_produce_insufficient_not_pass },
];

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.15 — Shadow Session Sampling Fixture Suite (T45)");
  console.log("  [Evidence export → Annotation template → Replay → Review]");
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

  console.log(`\nFinished T45. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
