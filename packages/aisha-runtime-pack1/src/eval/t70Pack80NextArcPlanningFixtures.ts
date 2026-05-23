/**
 * T70 — Pack 8.0 Next Arc Planning Validation Fixtures
 *
 * Validates the PACK_8_0_NEXT_ARC_PLANNING.md memo.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_8_0_NEXT_ARC_PLANNING.md");

export async function T70_memo_file_exists() {
  assert.ok(fs.existsSync(MEMO_PATH), `Memo not found at ${MEMO_PATH}`);
}

export async function T70_memo_contains_all_candidate_arcs() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const arcs = [
    "external judge demo handoff package",
    "static html frame expansion",
    "runtime ui integration planning",
    "live ops retry / real shadow collection",
    "semantic calibration planning with labeled data",
    "pitch / deck artifact planning",
    "further memory / retrieval architecture expansion"
  ];
  const missing = arcs.filter(a => !content.includes(a));
  assert.strictEqual(missing.length, 0, `Missing candidate arcs: ${missing.join(", ")}`);
}

export async function T70_memo_contains_blocker_language() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("live ops") && content.includes("blocked"), "Missing live ops blocked language");
  assert.ok(content.includes("retrieval promotion") && content.includes("denied"), "Missing retrieval promotion denied language");
  assert.ok(content.includes("semantic calibration") && content.includes("data-gated"), "Missing semantic calibration data-gated language");
  assert.ok(content.includes("runtime ui integration") && content.includes("premature"), "Missing runtime UI integration premature language");
  assert.ok(content.includes("static html") && content.includes("secondary"), "Missing static HTML secondary language");
}

export async function T70_memo_recommends_handoff_package() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("external judge demo handoff package"),
    "Missing External Judge Demo Handoff Package recommendation"
  );
}

export async function T70_memo_contains_required_handoff_contents() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const required = [
    "top-level readme",
    "judge demo one-pager",
    "judge demo script",
    "storyboard json",
    "proof beats json",
    "visual asset plan",
    "static prototype references",
    "guardrail/attestation file",
    "local viewing instructions",
    "source artifact index"
  ];
  const missing = required.filter(r => !content.includes(r));
  assert.strictEqual(missing.length, 0, `Missing handoff contents: ${missing.join(", ")}`);
}

export async function T70_memo_contains_forbidden_claims() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const forbidden = [
    "production readiness",
    "live evidence",
    "retrieval promotion",
    "consciousness",
    "fully autonomous learning",
    "semantic calibration",
    "runtime integration",
    "final judge mode",
    "amd live renderer"
  ];
  const section = content.split("forbidden claims").slice(1).join("forbidden claims");
  if (!section) throw new Error("Missing 'Forbidden Claims' section");
  const missing = forbidden.filter(f => !section.includes(f));
  assert.strictEqual(missing.length, 0, `Missing forbidden claims: ${missing.join(", ")}`);
}

export async function T70_memo_contains_next_legal_branch_guidance() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("pack 8.1") && content.includes("pack8-1-external-judge-demo-handoff"),
    "Missing next legal branch guidance for Pack 8.1"
  );
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 8.0 — T70 Next Arc Planning Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T70_memo_file_exists", fn: T70_memo_file_exists },
    { name: "T70_memo_contains_all_candidate_arcs", fn: T70_memo_contains_all_candidate_arcs },
    { name: "T70_memo_contains_blocker_language", fn: T70_memo_contains_blocker_language },
    { name: "T70_memo_recommends_handoff_package", fn: T70_memo_recommends_handoff_package },
    { name: "T70_memo_contains_required_handoff_contents", fn: T70_memo_contains_required_handoff_contents },
    { name: "T70_memo_contains_forbidden_claims", fn: T70_memo_contains_forbidden_claims },
    { name: "T70_memo_contains_next_legal_branch_guidance", fn: T70_memo_contains_next_legal_branch_guidance },
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

  console.log(`\nFinished T70. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
