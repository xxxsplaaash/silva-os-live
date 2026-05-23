import {
  T16_calibration_evidence_boosts_confidence,
  T16_calibration_stale_flagging_triggers_uncertainty,
  T16_calibration_contradiction_heavily_penalizes,
  T16_audit_demonstrates_calibration_improvement
} from "./t16CalibrationFixtures";

const fixtures = [
  { name: "T16_calibration_evidence_boosts_confidence", fn: T16_calibration_evidence_boosts_confidence },
  { name: "T16_calibration_stale_flagging_triggers_uncertainty", fn: T16_calibration_stale_flagging_triggers_uncertainty },
  { name: "T16_calibration_contradiction_heavily_penalizes", fn: T16_calibration_contradiction_heavily_penalizes },
  { name: "T16_audit_demonstrates_calibration_improvement", fn: T16_audit_demonstrates_calibration_improvement },
];

async function main() {
  console.log("Starting T16 Calibration Evaluation Suite...\n");

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

  console.log(`\nFinished T16. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("T16 runner crashed:", err);
  process.exit(1);
});
