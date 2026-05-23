/**
 * T49 — Pack 3 Closeout Baseline Validation
 *
 * Deterministic validation fixture proving the Pack 3 Closeout Baseline
 * document contains all mandated summaries, pack names, promotion-denied
 * status, blocked conditions, and clear transition rules.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const BASELINE_PATH = path.join(__dirname, "../../docs/baselines/PACK_3_CLOSEOUT_BASELINE.md");

export function T49_baseline_contains_all_pack3_tags() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  const requiredTags = [
    "3.5e", "3.6", "3.7", "3.8", "3.9", "3.10", "3.11", 
    "3.12", "3.13", "3.14", "3.15", "3.16", "3.17", "3.18", "3.19", "3.19b"
  ];

  for (const tag of requiredTags) {
    assert.ok(content.includes(tag), `Must summarize Pack ${tag}`);
  }
}

export function T49_baseline_contains_promotion_denied_language() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.ok(content.includes("PROMOTION REMAINS DENIED"), "Must state promotion remains denied");
  assert.ok(content.includes("What Remains Denied"), "Must explicitly list denied capabilities");
  assert.ok(content.includes("live-path promotion"), "Must explicitly deny live-path promotion");
  assert.ok(content.includes("generator-visible fields"), "Must deny shadow output in generator-visible fields");
}

export function T49_baseline_contains_blocked_live_collection_status() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.ok(content.includes("Current Blockers"), "Must document current blockers");
  assert.ok(content.includes("AISHA_GEMINI_API_KEY"), "Must list missing API key as blocker");
}

export function T49_baseline_contains_ops_unblock_requirements() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.ok(content.includes("Exact Conditions for Retry"), "Must state exact retry conditions");
  assert.ok(content.includes("Operator Review Owner"), "Must require an operator review owner");
}

export function T49_baseline_contains_forbidden_promotion_claims() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.ok(content.includes("fixtures"), "Must forbid treating fixtures as production evidence");
  assert.ok(content.includes("controlled samples"), "Must forbid treating controlled samples as production evidence");
}

export function T49_baseline_contains_next_legal_branch_guidance() {
  const content = fs.readFileSync(BASELINE_PATH, "utf8");
  assert.ok(content.includes("Next Legal Branches"), "Must provide branch guidance");
  assert.ok(content.includes("Live Retry Branch"), "Must mention Live Retry Branch");
  assert.ok(content.includes("Pack 4 Planning Branch"), "Must mention Pack 4 Planning Branch");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.20 — Pack 3 Closeout Baseline Validation (T49)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`❌ BASELINE NOT FOUND: ${BASELINE_PATH}`);
    process.exit(1);
  }

  const fixtures = [
    { name: "T49_baseline_contains_all_pack3_tags", fn: T49_baseline_contains_all_pack3_tags },
    { name: "T49_baseline_contains_promotion_denied_language", fn: T49_baseline_contains_promotion_denied_language },
    { name: "T49_baseline_contains_blocked_live_collection_status", fn: T49_baseline_contains_blocked_live_collection_status },
    { name: "T49_baseline_contains_ops_unblock_requirements", fn: T49_baseline_contains_ops_unblock_requirements },
    { name: "T49_baseline_contains_forbidden_promotion_claims", fn: T49_baseline_contains_forbidden_promotion_claims },
    { name: "T49_baseline_contains_next_legal_branch_guidance", fn: T49_baseline_contains_next_legal_branch_guidance },
  ];

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T49. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
