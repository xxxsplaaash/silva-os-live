import {
  T38_accepted_note_emits_correct_audit_entry,
  T38_rejected_low_trust_emits_correct_audit_entry,
  T38_rejected_weak_confidence_emits_correct_audit_entry,
  T38_needs_review_trust_gated_emits_correct_audit_entry,
  T38_needs_review_caution_gated_emits_correct_audit_entry,
  T38_contradiction_review_retains_signal_evidence,
  T38_supersession_generates_traceable_linkage,
  T38_reinforce_emits_reinforced_audit_entry,
  T38_render_audit_log_markdown,
} from "./t38OperatorAuditTrailFixtures";

const fixtures = [
  { name: "T38_accepted_note_emits_correct_audit_entry", fn: T38_accepted_note_emits_correct_audit_entry },
  { name: "T38_rejected_low_trust_emits_correct_audit_entry", fn: T38_rejected_low_trust_emits_correct_audit_entry },
  { name: "T38_rejected_weak_confidence_emits_correct_audit_entry", fn: T38_rejected_weak_confidence_emits_correct_audit_entry },
  { name: "T38_needs_review_trust_gated_emits_correct_audit_entry", fn: T38_needs_review_trust_gated_emits_correct_audit_entry },
  { name: "T38_needs_review_caution_gated_emits_correct_audit_entry", fn: T38_needs_review_caution_gated_emits_correct_audit_entry },
  { name: "T38_contradiction_review_retains_signal_evidence", fn: T38_contradiction_review_retains_signal_evidence },
  { name: "T38_supersession_generates_traceable_linkage", fn: T38_supersession_generates_traceable_linkage },
  { name: "T38_reinforce_emits_reinforced_audit_entry", fn: T38_reinforce_emits_reinforced_audit_entry },
  { name: "T38_render_audit_log_markdown", fn: T38_render_audit_log_markdown },
];

async function main() {
  console.log("Starting T38 Operator Audit Trail Fixture Suite...\n");

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

  console.log(`\nFinished T38. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch(console.error);
