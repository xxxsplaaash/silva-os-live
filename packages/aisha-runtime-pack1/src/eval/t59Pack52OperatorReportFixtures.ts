/**
 * T59 — Pack 5.2 Operator Report Validation Fixtures
 *
 * Validates the Pack 5.2 operator report artifacts:
 * - Files exist
 * - Markdown references Pack 5.1 source artifacts
 * - Proof table is present
 * - All required continuity proof claims present
 * - Forbidden-claim guardrails present
 * - JSON marks productionReady=false, liveEvidence=false, retrievalPromotion=false
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_DIR = path.join(__dirname, "../../artifacts/demos/pack5_2_operator_report");
const MD_PATH = path.join(REPORT_DIR, "OPERATOR_REPORT.md");
const JSON_PATH = path.join(REPORT_DIR, "operator_report.json");

// ─── T59_report_files_exist ───────────────────────────────────────────────────
export async function T59_report_files_exist() {
  assert.ok(fs.existsSync(MD_PATH), `OPERATOR_REPORT.md not found at ${MD_PATH}`);
  assert.ok(fs.existsSync(JSON_PATH), `operator_report.json not found at ${JSON_PATH}`);
}

// ─── T59_markdown_references_pack51_artifacts ─────────────────────────────────
export async function T59_markdown_references_pack51_artifacts() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  assert.ok(
    content.includes("pack5_1_continuity_demo/README.md"),
    "Operator report must reference Pack 5.1 README artifact"
  );
  assert.ok(
    content.includes("pack5_1_continuity_demo/report.json"),
    "Operator report must reference Pack 5.1 report.json artifact"
  );
}

// ─── T59_proof_table_exists ───────────────────────────────────────────────────
export async function T59_proof_table_exists() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const requiredTablePhrases = [
    "Demo Proof Table",
    "Expected Behavior",
    "Observed Result",
    "Status",
    "PASS",
  ];
  const missing = requiredTablePhrases.filter(p => !content.includes(p));
  if (missing.length > 0) {
    throw new Error(`Proof table missing phrases: ${missing.join(", ")}`);
  }
}

// ─── T59_markdown_contains_continuity_claims ──────────────────────────────────
export async function T59_markdown_contains_continuity_claims() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const requiredClaims = [
    "initial stable truth",           // step 1 narrative
    "old truth",                       // supersession
    "new truth",                       // active update
    "next",                            // next-turn behavior
    "contradiction evidence",          // remains inspectable
    "No Retrieval Promotion",          // guardrail
    "No Live Evidence",                // guardrail
    "No production readiness",         // guardrail (case-insensitive via toLowerCase below)
  ];

  const lc = content.toLowerCase();
  const missing = requiredClaims.filter(p => !lc.includes(p.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(`Operator report missing continuity claims: ${missing.join(", ")}`);
  }
}

// ─── T59_markdown_contains_forbidden_claim_guardrails ─────────────────────────
export async function T59_markdown_contains_forbidden_claim_guardrails() {
  const content = fs.readFileSync(MD_PATH, "utf8");
  const forbiddenGuardrails = [
    "Production readiness",
    "Live evidence",
    "Retrieval promotion",
    "Consciousness",
    "autonomous learning",
  ];
  const lc = content.toLowerCase();
  const missing = forbiddenGuardrails.filter(p => !lc.includes(p.toLowerCase()));
  if (missing.length > 0) {
    throw new Error(`Operator report missing forbidden-claim guardrails: ${missing.join(", ")}`);
  }
}

// ─── T59_json_flags_correct ───────────────────────────────────────────────────
export async function T59_json_flags_correct() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const report = JSON.parse(raw);

  assert.strictEqual(report.productionReady, false, "operator_report.json must set productionReady=false");
  assert.strictEqual(report.liveEvidence, false, "operator_report.json must set liveEvidence=false");
  assert.strictEqual(report.retrievalPromotion, false, "operator_report.json must set retrievalPromotion=false");
}

// ─── T59_json_proof_table_all_pass ────────────────────────────────────────────
export async function T59_json_proof_table_all_pass() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const report = JSON.parse(raw);

  assert.ok(Array.isArray(report.proofTable), "proofTable must be an array");
  assert.ok(report.proofTable.length >= 5, "proofTable must have at least 5 steps");

  const failing = report.proofTable.filter((row: { status: string }) => row.status !== "PASS");
  assert.strictEqual(failing.length, 0, `All proof table rows must be PASS. Failing: ${JSON.stringify(failing)}`);
}

// ─── T59_json_source_pack_references_51 ──────────────────────────────────────
export async function T59_json_source_pack_references_51() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const report = JSON.parse(raw);

  assert.strictEqual(report.sourcePack, "5.1", "operator_report.json must reference sourcePack=5.1");
  assert.ok(
    Array.isArray(report.sourceArtifacts) && report.sourceArtifacts.some((a: string) => a.includes("pack5_1")),
    "operator_report.json must reference pack5_1 source artifacts"
  );
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 5.2 — T59 Operator Report Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T59_report_files_exist", fn: T59_report_files_exist },
    { name: "T59_markdown_references_pack51_artifacts", fn: T59_markdown_references_pack51_artifacts },
    { name: "T59_proof_table_exists", fn: T59_proof_table_exists },
    { name: "T59_markdown_contains_continuity_claims", fn: T59_markdown_contains_continuity_claims },
    { name: "T59_markdown_contains_forbidden_claim_guardrails", fn: T59_markdown_contains_forbidden_claim_guardrails },
    { name: "T59_json_flags_correct", fn: T59_json_flags_correct },
    { name: "T59_json_proof_table_all_pass", fn: T59_json_proof_table_all_pass },
    { name: "T59_json_source_pack_references_51", fn: T59_json_source_pack_references_51 },
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

  console.log(`\nFinished T59. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
