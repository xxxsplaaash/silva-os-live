/**
 * T60 — Pack 5.3 Stakeholder Brief Validation Fixtures
 *
 * Validates the Pack 5.3 stakeholder brief artifacts:
 * - Files exist
 * - Markdown references Pack 5.1 and 5.2 source artifacts
 * - Brief contains the five demo proof beats
 * - Brief contains stakeholder demo script
 * - Brief contains forbidden-claim guardrails
 * - JSON marks productionReady=false, liveEvidence=false, retrievalPromotion=false, consciousnessClaim=false
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIEF_DIR = path.join(__dirname, "../../artifacts/demos/pack5_3_stakeholder_brief");
const MD_PATH = path.join(BRIEF_DIR, "STAKEHOLDER_BRIEF.md");
const JSON_PATH = path.join(BRIEF_DIR, "stakeholder_brief.json");

// ─── T60_brief_files_exist ────────────────────────────────────────────────────
export async function T60_brief_files_exist() {
  assert.ok(fs.existsSync(MD_PATH), `STAKEHOLDER_BRIEF.md not found at ${MD_PATH}`);
  assert.ok(fs.existsSync(JSON_PATH), `stakeholder_brief.json not found at ${JSON_PATH}`);
}

// ─── T60_markdown_references_pack51_and_pack52_artifacts ──────────────────────
export async function T60_markdown_references_pack51_and_pack52_artifacts() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  assert.ok(
    content.includes("pack5_1_continuity_demo/README.md"),
    "Brief must reference Pack 5.1 README artifact"
  );
  assert.ok(
    content.includes("pack5_1_continuity_demo/report.json"),
    "Brief must reference Pack 5.1 report.json artifact"
  );
  assert.ok(
    content.includes("pack5_2_operator_report/OPERATOR_REPORT.md"),
    "Brief must reference Pack 5.2 OPERATOR_REPORT.md artifact"
  );
  assert.ok(
    content.includes("pack5_2_operator_report/operator_report.json"),
    "Brief must reference Pack 5.2 operator_report.json artifact"
  );
}

// ─── T60_markdown_contains_five_demo_proof_beats ──────────────────────────────
export async function T60_markdown_contains_five_demo_proof_beats() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const lc = content.toLowerCase();
  const requiredBeats = [
    "stable truth established",
    "truth contradicted / updated",
    "old truth superseded, not deleted",
    "new truth becomes active",
    "next relevant turn uses new truth"
  ];
  const missing = requiredBeats.filter(b => !lc.includes(b));
  if (missing.length > 0) {
    throw new Error(`Brief missing required proof beats: ${missing.join(", ")}`);
  }
}

// ─── T60_markdown_contains_stakeholder_demo_script ────────────────────────────
export async function T60_markdown_contains_stakeholder_demo_script() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const requiredScriptElements = [
    "Stakeholder Demo Script",
    "Opening Explanation",
    "Demo Beats",
    "Closing Takeaway"
  ];
  const missing = requiredScriptElements.filter(s => !content.includes(s));
  if (missing.length > 0) {
    throw new Error(`Brief missing stakeholder demo script elements: ${missing.join(", ")}`);
  }
}

// ─── T60_markdown_contains_forbidden_claim_guardrails ─────────────────────────
export async function T60_markdown_contains_forbidden_claim_guardrails() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const lc = content.toLowerCase();
  const forbiddenGuardrails = [
    "no production readiness claim",
    "no live evidence claim",
    "no retrieval promotion claim",
    "no consciousness claim",
    "no fully autonomous learning claim"
  ];
  const missing = forbiddenGuardrails.filter(g => !lc.includes(g));
  if (missing.length > 0) {
    throw new Error(`Brief missing forbidden-claim guardrails: ${missing.join(", ")}`);
  }
}

// ─── T60_json_flags_correct ───────────────────────────────────────────────────
export async function T60_json_flags_correct() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const brief = JSON.parse(raw);

  assert.strictEqual(brief.productionReady, false, "stakeholder_brief.json must set productionReady=false");
  assert.strictEqual(brief.liveEvidence, false, "stakeholder_brief.json must set liveEvidence=false");
  assert.strictEqual(brief.retrievalPromotion, false, "stakeholder_brief.json must set retrievalPromotion=false");
  assert.strictEqual(brief.consciousnessClaim, false, "stakeholder_brief.json must set consciousnessClaim=false");
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 5.3 — T60 Stakeholder Brief Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T60_brief_files_exist", fn: T60_brief_files_exist },
    { name: "T60_markdown_references_pack51_and_pack52_artifacts", fn: T60_markdown_references_pack51_and_pack52_artifacts },
    { name: "T60_markdown_contains_five_demo_proof_beats", fn: T60_markdown_contains_five_demo_proof_beats },
    { name: "T60_markdown_contains_stakeholder_demo_script", fn: T60_markdown_contains_stakeholder_demo_script },
    { name: "T60_markdown_contains_forbidden_claim_guardrails", fn: T60_markdown_contains_forbidden_claim_guardrails },
    { name: "T60_json_flags_correct", fn: T60_json_flags_correct },
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

  console.log(`\nFinished T60. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
