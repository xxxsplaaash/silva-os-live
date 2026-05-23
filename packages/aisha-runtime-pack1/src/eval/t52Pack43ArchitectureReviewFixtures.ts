/**
 * T52 — Pack 4.3 Architecture Review Validation Fixture
 *
 * Validates the contents of the PACK_4_3_ARCHITECTURE_REVIEW.md memo
 * to ensure all required summaries and constraints are explicitly documented.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_4_3_ARCHITECTURE_REVIEW.md");

export async function T52_memo_contains_required_sections() {
  assert.ok(fs.existsSync(MEMO_PATH), `Memo not found at ${MEMO_PATH}`);
  const content = fs.readFileSync(MEMO_PATH, "utf8");

  const requiredPhrases = [
    "ungrounded_claim", // Pack 4.1 summary
    "session-level finding", // Pack 4.1 characteristic
    "no re-retrieval", // Pack 4.1 characteristic
    "reconsolidationSignalCount", // Pack 4.2 summary
    "escalation", // Pack 4.2 characteristic
    "contradiction bypass", // Pack 4.2 characteristic
    "migration-safe", // Pack 4.2 characteristic
    "Semantic State Calibration Hardening", // Deferred item
    "Live Shadow Retrieval Promotion", // Deferred item
    "Operational Live Retry", // Deferred item
    "Product-Facing Demo Work", // Deferred item
    "Release Baseline", // Next-arc candidate/recommendation
    "No retrieval promotion", // Forbidden promotion language
    "No trace consumption promotion", // Forbidden promotion language
    "No live shadow claims", // Forbidden promotion language
    "No product-facing behavior", // Forbidden promotion language
  ];

  const missing = requiredPhrases.filter(phrase => !content.includes(phrase));

  if (missing.length > 0) {
    throw new Error(
      `Memo is missing required phrases:\n` + missing.map(m => ` - ${m}`).join("\n")
    );
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.3 — T52 Architecture Review Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T52_memo_contains_required_sections", fn: T52_memo_contains_required_sections },
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

  console.log(`\nFinished T52. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
