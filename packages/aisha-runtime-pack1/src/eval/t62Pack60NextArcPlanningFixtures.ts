/**
 * T62 — Pack 6.0 Next Arc Planning Validation Fixtures
 *
 * Validates the contents of the PACK_6_0_NEXT_ARC_PLANNING.md memo
 * to ensure all candidates, blockers, the UI planning recommendation,
 * required proof elements, and forbidden claims are explicitly documented.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_6_0_NEXT_ARC_PLANNING.md");

export async function T62_memo_file_exists() {
  assert.ok(fs.existsSync(MEMO_PATH), `Memo not found at ${MEMO_PATH}`);
}

export async function T62_memo_contains_all_candidate_arcs() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const candidates = [
    "live ops retry",
    "semantic calibration planning",
    "product-facing continuity demo ui planning",
    "persistence / release hardening planning",
    "further memory/retrieval architecture expansion"
  ];
  const missing = candidates.filter(c => !content.includes(c));
  assert.strictEqual(missing.length, 0, `Missing candidate arcs: ${missing.join(", ")}`);
}

export async function T62_memo_contains_blocker_language() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  
  assert.ok(content.includes("live ops") && content.includes("blocked"), "Missing live ops blocked language");
  assert.ok(content.includes("retrieval promotion") && content.includes("denied"), "Missing retrieval promotion denied language");
  assert.ok(content.includes("semantic calibration") && content.includes("data-gated"), "Missing semantic calibration data-gated language");
}

export async function T62_memo_contains_ui_planning_recommendation() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("product-facing continuity demo ui planning"),
    "Missing product-facing continuity demo UI planning recommendation"
  );
}

export async function T62_memo_contains_required_demo_ui_proof_elements() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const required = [
    "active truth",
    "superseded historical truth",
    "supersession link",
    "next-turn behavior using updated truth",
    "guardrails"
  ];
  const missing = required.filter(r => !content.includes(r));
  assert.strictEqual(missing.length, 0, `Missing required UI proof elements: ${missing.join(", ")}`);
}

export async function T62_memo_contains_forbidden_claims() {
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

export async function T62_memo_contains_next_legal_branch_guidance() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("implementation pack") && content.includes("ui planning"),
    "Missing next legal branch guidance (implementation pack / UI planning)"
  );
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 6.0 — T62 Next Arc Planning Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T62_memo_file_exists", fn: T62_memo_file_exists },
    { name: "T62_memo_contains_all_candidate_arcs", fn: T62_memo_contains_all_candidate_arcs },
    { name: "T62_memo_contains_blocker_language", fn: T62_memo_contains_blocker_language },
    { name: "T62_memo_contains_ui_planning_recommendation", fn: T62_memo_contains_ui_planning_recommendation },
    { name: "T62_memo_contains_required_demo_ui_proof_elements", fn: T62_memo_contains_required_demo_ui_proof_elements },
    { name: "T62_memo_contains_forbidden_claims", fn: T62_memo_contains_forbidden_claims },
    { name: "T62_memo_contains_next_legal_branch_guidance", fn: T62_memo_contains_next_legal_branch_guidance },
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

  console.log(`\nFinished T62. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
