/**
 * T55 — Pack 4.5 Live Ops Readiness Review Validation Fixture
 *
 * Validates the contents of the PACK_4_5_LIVE_OPS_READINESS_REVIEW.md memo
 * to ensure all required readiness classifications and constraints are documented.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_4_5_LIVE_OPS_READINESS_REVIEW.md");

export async function T55_readiness_review_contains_required_sections() {
  assert.ok(fs.existsSync(MEMO_PATH), `Readiness review not found at ${MEMO_PATH}`);
  const content = fs.readFileSync(MEMO_PATH, "utf8");

  const requiredPhrases = [
    // Required Categories
    "Live API Key / Env Var",
    "Real Runtime/Session Entrypoint",
    "Shadow Sampling Flags",
    "Evidence Export Location",
    "Annotation Owner/Operator Review Workflow",
    "Stop Conditions",
    "Success Criteria",
    
    // Status Classifications
    "READY",
    "BLOCKED",
    "UNKNOWN",
    
    // Mandatory Strictures
    "No Retrieval Promotion",
    "No Fake Evidence",
    "Retry Gating",
    "live retry is only allowed if",
  ];

  const missing = requiredPhrases.filter(phrase => !content.includes(phrase));

  if (missing.length > 0) {
    throw new Error(
      `Readiness review is missing required phrases:\n` + missing.map(m => ` - ${m}`).join("\n")
    );
  }

  // Ensure overall status reflects BLOCKED since key/entrypoint are missing
  assert.ok(
    content.includes("**BLOCKED**"),
    "Overall readiness status must be explicitly declared as BLOCKED"
  );
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.5 — T55 Live Ops Readiness Review Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T55_readiness_review_contains_required_sections", fn: T55_readiness_review_contains_required_sections },
  ];

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

  console.log(`\nFinished T55. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
