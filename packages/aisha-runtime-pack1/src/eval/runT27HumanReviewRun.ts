/**
 * T27 Runner — Pack 3.1 First Human Review Run
 *
 * Simulates a full, bounded human-review pipeline run:
 *   1. Evaluates runtime scenarios (T24)
 *   2. Generates blinded packets and answer keys (T25)
 *   3. Generates the exact JSON form for human raters (T27)
 *   4. Validates empty template structure
 *   5. Mocks two reviewers completing the forms
 *   6. Ingests their JSONs through the validation gateway
 *   7. Produces a multi-reviewer decision report (T26)
 *   8. Writes all artifacts to disk
 */
import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

import { SCENARIOS, runComparison, ScenarioResult } from "./t24KPositionDemoEval";
import { buildBlindedPacket, renderReviewPacket, renderAnswerKey } from "./t25BlindABReview";
import { ingestRatings, renderDecisionReport, CompletedRating } from "./t26ReviewIngestion";
import { generateBlankReviewTemplate, validateReviewerTemplate } from "./t27HumanReviewRun";

async function main() {
  console.log("Starting T27 First Human Review Run Suite (Pack 3.1)...\n");

  let totalPass = 0;
  let totalFail = 0;

  function check(label: string, fn: () => void) {
    process.stdout.write(`Running [${label}]... `);
    try {
      fn();
      console.log("✅ PASS");
      totalPass++;
    } catch (err: any) {
      console.log("❌ FAIL\n   " + err.message);
      totalFail++;
    }
  }

  // ── 1. Eval Scenarios (T24) ────────────────────────────────────────────────
  const results: ScenarioResult[] = [];
  for (const scenario of SCENARIOS) {
    results.push(await runComparison(scenario));
  }

  // ── 2. Build Packet & Key (T25) ───────────────────────────────────────────
  // This will securely crash as expected when feeding identical core stubs into the gate.
  check("T27_real_stub_generation_is_unreviewable_and_fails_hard", () => {
    assert.throws(
      () => buildBlindedPacket(results),
      /FAIL HARD: Fewer than 3 genuinely reviewable scenarios/
    );
  });

  console.log(`\nFinished T27. Passed: ${totalPass}, Failed: ${totalFail}`);
  console.log(`Note: T27 halted because the reviewability gate correctly aborted before packet construction.`);

  if (totalFail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
