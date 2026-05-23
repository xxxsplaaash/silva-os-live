/**
 * T57 — Pack 5.0 Next Arc Planning Validation Fixture
 *
 * Validates the contents of the PACK_5_0_NEXT_ARC_PLANNING.md memo.
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_5_0_NEXT_ARC_PLANNING.md");

export async function T57_next_arc_planning_contains_required_sections() {
  assert.ok(fs.existsSync(MEMO_PATH), `Planning memo not found at ${MEMO_PATH}`);
  const content = fs.readFileSync(MEMO_PATH, "utf8");

  const requiredPhrases = [
    // All candidate arcs
    "Live Ops Unblock / Real Shadow Retry",
    "Semantic Calibration Planning",
    "Contradiction-Aware Continuity Demo",
    "Release Hardening / Persistence-Readiness Planning",
    "Further Memory / Retrieval Architecture Expansion",

    // Live ops blocked
    "live ops blocked by missing live API key",
    "BLOCKED",

    // Retrieval promotion denied
    "retrieval promotion remains denied",

    // Semantic calibration data-gated
    "semantic calibration is still data-gated",

    // Recommendation
    "Arc 3",
    "Contradiction-Aware Continuity Demo Planning",

    // Demo proof criteria
    "User states a stable truth",
    "User later contradicts",
    "preserves old truth as linked history",
    "updates active truth",
    "behaves correctly on the next relevant turn",

    // Forbidden claims
    "Production readiness",
    "live retrieval promotion",
    "Consciousness",
    "Real live user evidence",
    "Fully autonomous learning",

    // Next legal branches
    "pack5-1-continuity-demo-implementation",
    "pack5-live-ops-retry",
    "pack5-semantic-calibration",
  ];

  const missing = requiredPhrases.filter(phrase => !content.includes(phrase));
  if (missing.length > 0) {
    throw new Error(
      `Planning memo is missing required phrases:\n` + missing.map(m => ` - ${m}`).join("\n")
    );
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 5.0 — T57 Next Arc Planning Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T57_next_arc_planning_contains_required_sections", fn: T57_next_arc_planning_contains_required_sections },
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

  console.log(`\nFinished T57. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
