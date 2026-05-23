/**
 * T71 — Pack 8.1 External Judge Demo Handoff Validation Fixtures
 *
 * Validates the contents of the pack8_1_external_judge_demo_handoff directory.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = path.join(__dirname, "../../artifacts/handoff/pack8_1_external_judge_demo_handoff");
const README = path.join(BASE, "README.md");
const ONEPAGER = path.join(BASE, "JUDGE_DEMO_ONEPAGER.md");
const SCRIPT = path.join(BASE, "JUDGE_DEMO_SCRIPT.md");
const ATTESTATION = path.join(BASE, "GUARDRAIL_ATTESTATION.md");
const INDEX = path.join(BASE, "artifact_index.json");
const MANIFEST = path.join(BASE, "handoff_manifest.json");

export async function T71_directory_exists() {
  assert.ok(fs.existsSync(BASE), `Handoff directory not found at ${BASE}`);
}

export async function T71_required_files_exist() {
  [README, ONEPAGER, SCRIPT, ATTESTATION, INDEX, MANIFEST].forEach(f =>
    assert.ok(fs.existsSync(f), `Missing file: ${path.basename(f)}`)
  );
}

export async function T71_json_files_are_valid() {
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  assert.ok(index.sourceArtifacts, "artifact_index.json missing sourceArtifacts");
  assert.ok(index.sourceArtifacts.pack7_1, "artifact_index.json missing pack7_1 sources");
  assert.ok(index.sourceArtifacts.pack7_2, "artifact_index.json missing pack7_2 sources");

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  assert.ok(Array.isArray(manifest.files), "handoff_manifest.json files must be an array");
  assert.ok(manifest.files.length > 0, "handoff_manifest.json files must not be empty");
}

export async function T71_readme_contains_summaries() {
  const content = fs.readFileSync(README, "utf8").toLowerCase();
  assert.ok(content.includes("30-second summary"), "README missing 30-second summary");
  assert.ok(content.includes("90-second judge explanation"), "README missing 90-second judge explanation");
  assert.ok(content.includes("local viewing"), "README missing local viewing instructions");
  assert.ok(content.includes("static handoff artifact"), "README missing static handoff label");
  assert.ok(content.includes("non-runtime"), "README missing non-runtime label");
  assert.ok(content.includes("not live"), "README missing not-live label");
  assert.ok(content.includes("not production ready"), "README missing not-production-ready label");
}

export async function T71_onepager_contains_null_alibi_framing() {
  const content = fs.readFileSync(ONEPAGER, "utf8").toLowerCase();
  assert.ok(content.includes("null alibi") || content.includes("article 9"), "Onepager missing NULL ALIBI/Article 9");
  assert.ok(content.includes("mertens"), "Onepager missing Mertens");
  assert.ok(content.includes("mei"), "Onepager missing Mei");
  assert.ok(content.includes("beckett") || content.includes("collision") || content.includes("audit"), "Onepager missing Beckett/audit framing");
}

export async function T71_script_contains_key_elements() {
  const content = fs.readFileSync(SCRIPT, "utf8").toLowerCase();
  assert.ok(content.includes("mertens"), "Script missing Mertens");
  assert.ok(content.includes("mei"), "Script missing Mei");
  assert.ok(content.includes("beckett"), "Script missing Beckett");
  assert.ok(content.includes("a.i.s.h.a recommendation"), "Script missing A.I.S.H.A recommendation");
}

export async function T71_attestation_contains_all_forbidden_claims() {
  const content = fs.readFileSync(ATTESTATION, "utf8").toLowerCase();
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
  const missing = forbidden.filter(f => !content.includes(f));
  assert.strictEqual(missing.length, 0, `Missing forbidden claims in attestation: ${missing.join(", ")}`);
}

export async function T71_index_references_pack7_artifacts() {
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  const all: string[] = [
    ...index.sourceArtifacts.pack7_1,
    ...index.sourceArtifacts.pack7_2
  ];
  assert.ok(all.some((p: string) => p.includes("pack7_1")), "artifact_index missing Pack 7.1 references");
  assert.ok(all.some((p: string) => p.includes("pack7_2")), "artifact_index missing Pack 7.2 references");
}

export async function T71_json_flags_non_runtime() {
  const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
  assert.strictEqual(index.guardrails.productionReady, false);
  assert.strictEqual(index.guardrails.liveEvidence, false);
  assert.strictEqual(index.guardrails.retrievalPromotion, false);
  assert.strictEqual(index.guardrails.runtimeIntegrated, false);
  assert.strictEqual(index.guardrails.finalJudgeMode, false);
  assert.strictEqual(index.guardrails.amdLiveRenderer, false);

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  assert.strictEqual(manifest.runtimeIntegrated, false);
  assert.strictEqual(manifest.liveEvidence, false);
  assert.strictEqual(manifest.productionReady, false);
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 8.1 — T71 External Judge Demo Handoff Validation");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T71_directory_exists", fn: T71_directory_exists },
    { name: "T71_required_files_exist", fn: T71_required_files_exist },
    { name: "T71_json_files_are_valid", fn: T71_json_files_are_valid },
    { name: "T71_readme_contains_summaries", fn: T71_readme_contains_summaries },
    { name: "T71_onepager_contains_null_alibi_framing", fn: T71_onepager_contains_null_alibi_framing },
    { name: "T71_script_contains_key_elements", fn: T71_script_contains_key_elements },
    { name: "T71_attestation_contains_all_forbidden_claims", fn: T71_attestation_contains_all_forbidden_claims },
    { name: "T71_index_references_pack7_artifacts", fn: T71_index_references_pack7_artifacts },
    { name: "T71_json_flags_non_runtime", fn: T71_json_flags_non_runtime },
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

  console.log(`\nFinished T71. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
