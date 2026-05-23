/**
 * T61 — Pack 5.4 Continuity Demo Closeout Validation Fixtures
 *
 * Validates the Pack 5.4 closeout baseline document to ensure it accurately
 * summarizes the Pack 5 arc, states what is proven, explicitly defines
 * what is NOT proven (forbidden claims), and properly bounds the next legal arcs.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOSEOUT_PATH = path.join(__dirname, "../../docs/baselines/PACK_5_CONTINUITY_DEMO_CLOSEOUT.md");

// ─── T61_closeout_file_exists ──────────────────────────────────────────────────
export async function T61_closeout_file_exists() {
  assert.ok(fs.existsSync(CLOSEOUT_PATH), `Closeout baseline not found at ${CLOSEOUT_PATH}`);
}

// ─── T61_closeout_summarizes_pack_5_arc ────────────────────────────────────────
export async function T61_closeout_summarizes_pack_5_arc() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8");
  const requiredSummaries = [
    "Pack 5.0", "next arc planning",
    "Pack 5.1", "deterministic continuity demo",
    "Pack 5.2", "operator report",
    "Pack 5.3", "stakeholder brief"
  ];
  
  const missing = requiredSummaries.filter(s => !content.toLowerCase().includes(s.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(`Closeout baseline missing pack summaries: ${missing.join(", ")}`);
  }
}

// ─── T61_closeout_states_what_is_proven ────────────────────────────────────────
export async function T61_closeout_states_what_is_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8");
  const lc = content.toLowerCase();
  
  assert.ok(lc.includes("deterministic contradiction-aware continuity"), "Missing proven claim: deterministic contradiction-aware continuity works");
  assert.ok(lc.includes("old truth is superseded, not deleted") || lc.includes("superseded and preserved, not deleted"), "Missing proven claim: old truth is superseded, not deleted");
  assert.ok(lc.includes("new truth becomes active"), "Missing proven claim: new truth becomes active");
  assert.ok(lc.includes("next-turn context uses updated truth") || lc.includes("next-turn context retrieval dynamically uses the updated truth"), "Missing proven claim: next-turn context uses updated truth");
  assert.ok(lc.includes("historical truth remains inspectable"), "Missing proven claim: historical truth remains inspectable");
}

// ─── T61_closeout_states_what_is_not_proven ────────────────────────────────────
export async function T61_closeout_states_what_is_not_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8");
  const requiredForbiddenClaims = [
    "production readiness",
    "live evidence",
    "retrieval promotion",
    "consciousness",
    "fully autonomous learning",
    "semantic calibration"
  ];
  
  const lc = content.toLowerCase();
  const notProvenSection = lc.split("what is not proven")[1] || lc.split("forbidden claims")[1];
  
  if (!notProvenSection) {
    throw new Error("Closeout baseline missing 'What Is NOT Proven' or 'Forbidden Claims' section");
  }

  const missing = requiredForbiddenClaims.filter(c => !notProvenSection.includes(c));
  if (missing.length > 0) {
    throw new Error(`Closeout baseline missing unproven/forbidden claims: ${missing.join(", ")}`);
  }
}

// ─── T61_closeout_defines_next_legal_arcs ──────────────────────────────────────
export async function T61_closeout_defines_next_legal_arcs() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8");
  const lc = content.toLowerCase();
  
  assert.ok(lc.includes("pack 6") && lc.includes("semantic calibration") && lc.includes("only if"), "Missing valid next arc: Semantic calibration planning");
  assert.ok(lc.includes("live ops retry") && lc.includes("only if"), "Missing valid next arc: Live ops retry");
  assert.ok(lc.includes("product demo ui planning") && lc.includes("only as non-runtime"), "Missing valid next arc: Product demo UI planning");
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 5.4 — T61 Continuity Demo Closeout Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T61_closeout_file_exists", fn: T61_closeout_file_exists },
    { name: "T61_closeout_summarizes_pack_5_arc", fn: T61_closeout_summarizes_pack_5_arc },
    { name: "T61_closeout_states_what_is_proven", fn: T61_closeout_states_what_is_proven },
    { name: "T61_closeout_states_what_is_not_proven", fn: T61_closeout_states_what_is_not_proven },
    { name: "T61_closeout_defines_next_legal_arcs", fn: T61_closeout_defines_next_legal_arcs },
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

  console.log(`\nFinished T61. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
