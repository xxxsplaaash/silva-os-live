/**
 * T65 — Pack 6.3 Continuity Demo UI Closeout Validation Fixtures
 *
 * Validates the Pack 6.3 closeout baseline document to ensure it accurately
 * summarizes the Pack 6 arc, states what is proven, explicitly defines
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

const CLOSEOUT_PATH = path.join(__dirname, "../../docs/baselines/PACK_6_CONTINUITY_DEMO_UI_CLOSEOUT.md");

// ─── T65_closeout_file_exists ──────────────────────────────────────────────────
export async function T65_closeout_file_exists() {
  assert.ok(fs.existsSync(CLOSEOUT_PATH), `Closeout baseline not found at ${CLOSEOUT_PATH}`);
}

// ─── T65_closeout_summarizes_pack_6_arc ────────────────────────────────────────
export async function T65_closeout_summarizes_pack_6_arc() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  const requiredSummaries = [
    "pack 6.0", "next arc planning",
    "pack 6.1", "ui planning/spec",
    "pack 6.2", "static ui prototype"
  ];
  
  const missing = requiredSummaries.filter(s => !content.includes(s));
  if (missing.length > 0) {
    throw new Error(`Closeout baseline missing pack summaries: ${missing.join(", ")}`);
  }
}

// ─── T65_closeout_states_what_is_proven ────────────────────────────────────────
export async function T65_closeout_states_what_is_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  
  assert.ok(content.includes("the pack 5 continuity proof has a stakeholder-facing static ui representation"), "Missing proven claim: stakeholder-facing static UI representation");
  assert.ok(content.includes("active truth is visually represented"), "Missing proven claim: active truth visually represented");
  assert.ok(content.includes("superseded historical truth is visually represented"), "Missing proven claim: superseded historical truth visually represented");
  assert.ok(content.includes("supersession/provenance is visually represented"), "Missing proven claim: supersession/provenance visually represented");
  assert.ok(content.includes("next-turn continuity check is visually represented"), "Missing proven claim: next-turn continuity check visually represented");
  assert.ok(content.includes("guardrails are visibly represented"), "Missing proven claim: guardrails visibly represented");
}

// ─── T65_closeout_states_what_is_not_proven ────────────────────────────────────
export async function T65_closeout_states_what_is_not_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  const requiredForbiddenClaims = [
    "production readiness",
    "live evidence",
    "retrieval promotion",
    "consciousness",
    "fully autonomous learning",
    "semantic calibration",
    "runtime ui integration"
  ];
  
  const forbiddenSection = content.split("what is not proven")[1] || content.split("forbidden claims")[1];
  
  if (!forbiddenSection) {
    throw new Error("Closeout baseline missing 'What Is NOT Proven' or 'Forbidden Claims' section");
  }

  const missing = requiredForbiddenClaims.filter(c => !forbiddenSection.includes(c));
  if (missing.length > 0) {
    throw new Error(`Closeout baseline missing unproven/forbidden claims: ${missing.join(", ")}`);
  }
}

// ─── T65_closeout_defines_next_legal_arcs ──────────────────────────────────────
export async function T65_closeout_defines_next_legal_arcs() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  
  assert.ok(content.includes("static demo refinement only as artifact work"), "Missing valid next arc: static demo refinement only as artifact work");
  assert.ok(content.includes("live ops retry only after pack 3.19b / 4.5 blockers are resolved"), "Missing valid next arc: live ops retry");
  assert.ok(content.includes("semantic calibration planning only with clearly labeled data"), "Missing valid next arc: semantic calibration planning");
  assert.ok(content.includes("runtime ui integration only after explicit implementation planning"), "Missing valid next arc: runtime ui integration");
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 6.3 — T65 Continuity Demo UI Closeout Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T65_closeout_file_exists", fn: T65_closeout_file_exists },
    { name: "T65_closeout_summarizes_pack_6_arc", fn: T65_closeout_summarizes_pack_6_arc },
    { name: "T65_closeout_states_what_is_proven", fn: T65_closeout_states_what_is_proven },
    { name: "T65_closeout_states_what_is_not_proven", fn: T65_closeout_states_what_is_not_proven },
    { name: "T65_closeout_defines_next_legal_arcs", fn: T65_closeout_defines_next_legal_arcs },
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

  console.log(`\nFinished T65. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
