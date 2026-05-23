/**
 * T56 — Pack 4.6 Static Architecture Closeout Validation Fixture
 *
 * Validates the contents of the PACK_4_STATIC_ARCHITECTURE_CLOSEOUT.md memo
 * to ensure all pack summaries, allowed/denied strictures, and next steps are present.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_4_STATIC_ARCHITECTURE_CLOSEOUT.md");

export async function T56_closeout_contains_required_sections() {
  assert.ok(fs.existsSync(MEMO_PATH), `Closeout memo not found at ${MEMO_PATH}`);
  const content = fs.readFileSync(MEMO_PATH, "utf8");

  const requiredPhrases = [
    // All Pack 4 names
    "Pack 4.0: Architecture Planning",
    "Pack 4.1: Ungrounded Claim Critic",
    "Pack 4.2: Reconsolidation Signal Frequency Persistence",
    "Pack 4.3: Architecture Review",
    "Pack 4.4: Release Baseline",
    "Pack 4.5: Live Ops Readiness Review",
    
    // Blocked Status
    "BLOCKED",

    // Allowed
    "What is Now Allowed",
    "ops-compliant live retry",
    "Semantic Calibration Planning",
    "Product Demo Planning",

    // Denied
    "What Remains Denied",
    "associative retrieval live promotion",
    "trace consumption live promotion",
    "hybrid retrieval promotion",
    "Fake live evidence",
    "Fabricated operator review",
    "Product-facing claims of production readiness",
    
    // Status/Guidance
    "deterministic baseline is",
    "no live shadow evidence exists",
    "live retrieval promotion remains denied",
    "semantic calibration remains deferred",
    "Next Legal Branches",
  ];

  const missing = requiredPhrases.filter(phrase => !content.toLowerCase().includes(phrase.toLowerCase()));

  if (missing.length > 0) {
    throw new Error(
      `Closeout memo is missing required phrases:\n` + missing.map(m => ` - ${m}`).join("\n")
    );
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.6 — T56 Static Architecture Closeout Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T56_closeout_contains_required_sections", fn: T56_closeout_contains_required_sections },
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

  console.log(`\nFinished T56. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
