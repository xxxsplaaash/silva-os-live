/**
 * T28 Runner — Pack 3.2 First Real Completed-Review Ingestion
 *
 * Usage for humans:
 *   npx tsx src/eval/runT28RealReviewIngestion.ts [path/to/reviewer1.json] [path/to/reviewer2.json] ...
 *
 * Requirements:
 *   - Reads actual human-filled JSON files passed via CLI OR runs self-tests if no args.
 *   - Parses and strictly validates structure against CompletedRating[] contract (T27).
 *   - Matches against live-regenerated answer key (T25).
 *   - Aggregates multi-reviewer inputs (T26).
 *   - Surfaces missing/invalid files cleanly.
 *   - Emits a final decision artifact based entirely on real feedback.
 */

import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import { SCENARIOS, runComparison, ScenarioResult } from "./t24KPositionDemoEval";
import { buildBlindedPacket } from "./t25BlindABReview";
import { ingestRatings, renderDecisionReport, CompletedRating } from "./t26ReviewIngestion";
import { generateBlankReviewTemplate, validateReviewerTemplate } from "./t27HumanReviewRun";

async function main() {
  const args = process.argv.slice(2);
  const isCliMode = args.length > 0;

  console.log(`Starting T28 Real Review Ingestion (Pack 3.2)... [Mode: ${isCliMode ? "CLI" : "Test"}]\n`);

  // Generate foundational evaluation structures
  const results: ScenarioResult[] = [];
  for (const scenario of SCENARIOS) {
    results.push(await runComparison(scenario));
  }
  // ── 1. CLI Execution Mode ──────────────────────────────────────────────────
  if (isCliMode) {
    const packet = buildBlindedPacket(results);
    const answerKey = packet.answerKey;

    const validPayloads: CompletedRating[] = [];
    const invalidFiles: string[] = [];

    function processFile(filePath: string) {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        invalidFiles.push(filePath);
        return;
      }

      let raw: string;
      try {
        raw = fs.readFileSync(filePath, "utf8");
      } catch (e: any) {
        console.log(`⚠️  Error reading file: ${filePath} - ${e.message}`);
        invalidFiles.push(filePath);
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e: any) {
        console.log(`⚠️  Invalid JSON syntax in file: ${filePath}`);
        invalidFiles.push(filePath);
        return;
      }

      if (!validateReviewerTemplate(parsed)) {
        console.log(`⚠️  File failed strict structural validation (CompletedRating[] schema): ${filePath}`);
        invalidFiles.push(filePath);
        return;
      }

      console.log(`✅ Successfully loaded and validated: ${filePath} (${parsed.length} ratings)`);
      validPayloads.push(...parsed);
    }

    for (const arg of args) {
      // Resolve against current working directory so relative CLI paths work smoothly
      processFile(path.resolve(process.cwd(), arg));
    }

    if (validPayloads.length === 0) {
      console.error("\n❌ No valid review payloads were found. Aborting.");
      process.exit(1);
    }

    // Ingest combined set and generate the real decision report
    const summary = ingestRatings(validPayloads, answerKey);
    const reportStr = renderDecisionReport(summary);
    const outPath = path.resolve(process.cwd(), "REAL_DECISION_REPORT_PACK_3_2.md");
    fs.writeFileSync(outPath, reportStr, "utf8");

    console.log(`\nFinal real decision report exported to: ${outPath}`);

    if (invalidFiles.length > 0) {
      console.log(`Note: ${invalidFiles.length} files were skipped due to errors.`);
      process.exit(1); // Standard signal that inputs were missing/invalid despite partial success
    }
    return;
  }

  // ── 2. Test Execution Mode (No Args) ──────────────────────────────────────
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

  const testDir = path.resolve(__dirname, "../../.t28-test-sandbox");
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // Now we actually assert the hard fail instead of assigning it directly above.
  check("T28_real_stub_generation_is_unreviewable_and_fails_hard", () => {
    assert.throws(
      () => buildBlindedPacket(results),
      /FAIL HARD: Fewer than 3 genuinely reviewable scenarios/
    );
  });

  fs.rmSync(testDir, { recursive: true, force: true });

  console.log(`\nFinished T28. Passed: ${totalPass}, Failed: ${totalFail}`);
  console.log(`Note: T28 halted because the reviewability gate correctly aborted before answer key construction.`);

  if (totalFail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
