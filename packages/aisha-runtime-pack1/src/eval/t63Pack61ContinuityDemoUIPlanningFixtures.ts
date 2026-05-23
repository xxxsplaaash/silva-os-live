/**
 * T63 — Pack 6.1 Continuity Demo UI Planning Validation Fixtures
 *
 * Validates the contents of the PACK_6_1_CONTINUITY_DEMO_UI_PLANNING.md memo
 * to ensure all UI panels, proof trace elements, stakeholder copy blocks,
 * and forbidden claims are explicitly documented per the strict requirements.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_6_1_CONTINUITY_DEMO_UI_PLANNING.md");

export async function T63_plan_file_exists() {
  assert.ok(fs.existsSync(MEMO_PATH), `UI Planning doc not found at ${MEMO_PATH}`);
}

export async function T63_plan_defines_core_sections() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const sections = [
    "demo objective",
    "target audience",
    "user story",
    "demo scene",
    "ui panels / sections",
    "proof trace elements",
    "copy blocks",
    "guardrails",
    "success criteria",
    "non-goals"
  ];
  const missing = sections.filter(s => !content.includes(s));
  assert.strictEqual(missing.length, 0, `Missing core sections: ${missing.join(", ")}`);
}

export async function T63_plan_contains_required_panels() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const panels = [
    "current active truth",
    "historical truth / superseded memory",
    "supersession link / provenance",
    "next-turn continuity check",
    "guardrails / what this does not prove"
  ];
  const missing = panels.filter(p => !content.includes(p));
  assert.strictEqual(missing.length, 0, `Missing required UI panels: ${missing.join(", ")}`);
}

export async function T63_plan_contains_required_proof_elements() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const required = [
    "active truth",
    "superseded historical truth",
    "supersession link / provenance",
    "next-turn behavior using updated truth",
    "deterministic proof label"
  ];
  const missing = required.filter(r => !content.includes(r));
  assert.strictEqual(missing.length, 0, `Missing required UI proof elements: ${missing.join(", ")}`);
}

export async function T63_plan_contains_stakeholder_copy() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  
  assert.ok(content.includes("normal assistants accumulate facts"), "Missing copy: normal assistants accumulate facts");
  assert.ok(content.includes("migrates truth over time"), "Missing copy: A.I.S.H.A migrates truth over time");
  assert.ok(content.includes("old truth is preserved instead of deleted"), "Missing copy: old truth is preserved instead of deleted");
  assert.ok(content.includes("next-turn behavior uses the updated active truth"), "Missing copy: next-turn behavior uses the updated active truth");
}

export async function T63_plan_contains_forbidden_claims() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const forbidden = [
    "production readiness",
    "live evidence",
    "retrieval promotion",
    "consciousness",
    "fully autonomous learning",
    "semantic calibration"
  ];
  
  // Extract just the forbidden claims section to prevent accidental matches elsewhere
  const forbiddenSection = content.split("forbidden claims").slice(1).join("forbidden claims");
  if (!forbiddenSection) throw new Error("Missing 'Forbidden Claims' section");

  const missing = forbidden.filter(f => !forbiddenSection.includes(f));
  assert.strictEqual(missing.length, 0, `Missing forbidden claims in section: ${missing.join(", ")}`);
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 6.1 — T63 Continuity Demo UI Planning Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T63_plan_file_exists", fn: T63_plan_file_exists },
    { name: "T63_plan_defines_core_sections", fn: T63_plan_defines_core_sections },
    { name: "T63_plan_contains_required_panels", fn: T63_plan_contains_required_panels },
    { name: "T63_plan_contains_required_proof_elements", fn: T63_plan_contains_required_proof_elements },
    { name: "T63_plan_contains_stakeholder_copy", fn: T63_plan_contains_stakeholder_copy },
    { name: "T63_plan_contains_forbidden_claims", fn: T63_plan_contains_forbidden_claims },
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

  console.log(`\nFinished T63. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
