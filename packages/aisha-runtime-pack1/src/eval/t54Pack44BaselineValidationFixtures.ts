/**
 * T54 — Pack 4.4 Baseline Validation Fixture
 *
 * Validates the contents of the PACK_4_4_RELEASE_BASELINE.md memo
 * to ensure all required summaries and constraints are explicitly documented.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_4_4_RELEASE_BASELINE.md");

export async function T54_baseline_contains_required_sections() {
  assert.ok(fs.existsSync(MEMO_PATH), `Baseline memo not found at ${MEMO_PATH}`);
  const content = fs.readFileSync(MEMO_PATH, "utf8");

  const requiredPhrases = [
    "Pack 4.1: Ungrounded Claim Critic",
    "t50UngroundedClaimFixtures",
    "Pack 4.2: Reconsolidation Signal Frequency Persistence",
    "t51ReconsolidationFrequencyFixtures",
    "Pack 4.3: Architecture Decision",
    "t53Pack44CombinedInteractionFixtures",
    "runPack44ReleaseBaseline.ts",
    "Pack 3.19 Live Shadow Ops Unblock",
    "No live shadow claims",
    "No retrieval promotion",
  ];

  const missing = requiredPhrases.filter(phrase => !content.includes(phrase));

  if (missing.length > 0) {
    throw new Error(
      `Baseline is missing required phrases:\n` + missing.map(m => ` - ${m}`).join("\n")
    );
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.4 — T54 Baseline Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T54_baseline_contains_required_sections", fn: T54_baseline_contains_required_sections },
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

  console.log(`\nFinished T54. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
