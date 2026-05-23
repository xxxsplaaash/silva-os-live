/**
 * T68 — Pack 7.2 Static Judge Demo Visual Assets Validation Fixtures
 *
 * Validates the contents of the Pack 7.2 static asset package.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, "../../artifacts/demos/pack7_2_static_judge_demo_visual_assets");
const PLAN_PATH = path.join(BASE_DIR, "VISUAL_ASSET_PLAN.md");
const MANIFEST_PATH = path.join(BASE_DIR, "static_frame_manifest.json");
const ONEPAGER_PATH = path.join(BASE_DIR, "judge_demo_onepager.md");

export async function T68_directory_exists() {
  assert.ok(fs.existsSync(BASE_DIR), `Missing directory at ${BASE_DIR}`);
}

export async function T68_required_files_exist() {
  assert.ok(fs.existsSync(PLAN_PATH), `Missing plan at ${PLAN_PATH}`);
  assert.ok(fs.existsSync(MANIFEST_PATH), `Missing manifest at ${MANIFEST_PATH}`);
  assert.ok(fs.existsSync(ONEPAGER_PATH), `Missing onepager at ${ONEPAGER_PATH}`);
}

export async function T68_manifest_is_valid() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  assert.ok(Array.isArray(manifest.frames), "Manifest frames must be an array");
  assert.ok(manifest.frames.length > 0, "Manifest frames must not be empty");
  
  const frameIds = manifest.frames.map((f: any) => f.id);
  assert.ok(frameIds.includes("frame_01_opening"), "Missing ordered frame: frame_01_opening");
  assert.ok(frameIds.includes("frame_02_collision"), "Missing ordered frame: frame_02_collision");
  assert.ok(frameIds.includes("frame_03_proof_trace"), "Missing ordered frame: frame_03_proof_trace");
  assert.ok(frameIds.includes("frame_04_comparison"), "Missing ordered frame: frame_04_comparison");
}

export async function T68_plan_references_pack_7_1() {
  const content = fs.readFileSync(PLAN_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("pack 7.1") || content.includes("pack_7_1"), "Missing reference to Pack 7.1 inputs");
}

export async function T68_contains_null_alibi_framing() {
  const checkContent = (filepath: string) => {
    const content = fs.readFileSync(filepath, "utf8").toLowerCase();
    assert.ok(content.includes("null alibi") || content.includes("article 9"), `Missing NULL ALIBI/Article 9 in ${path.basename(filepath)}`);
    assert.ok(content.includes("mertens"), `Missing Mertens in ${path.basename(filepath)}`);
    assert.ok(content.includes("mei"), `Missing Mei in ${path.basename(filepath)}`);
    assert.ok(content.includes("beckett") || content.includes("collision") || content.includes("auditor"), `Missing audit pressure in ${path.basename(filepath)}`);
  };
  
  checkContent(PLAN_PATH);
  checkContent(ONEPAGER_PATH);
}

export async function T68_contains_all_required_panels() {
  const content = fs.readFileSync(PLAN_PATH, "utf8").toLowerCase();
  const panels = [
    "scene / heist board",
    "command input",
    "current active cover / truth",
    "npc belief states",
    "collision warning",
    "a.i.s.h.a recommendation",
    "what changed",
    "proof trace / trail",
    "guardrail card"
  ];
  panels.forEach(p => assert.ok(content.includes(p), `Missing panel mention: ${p}`));
}

export async function T68_contains_comparison_frame() {
  const content = fs.readFileSync(ONEPAGER_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("normal assistant"), "Missing comparison: normal assistant");
  assert.ok(content.includes("flat memory"), "Missing comparison: flat memory");
  assert.ok(content.includes("naive rag"), "Missing comparison: naive rag");
  assert.ok(content.includes("a.i.s.h.a"), "Missing comparison: a.i.s.h.a");
}

export async function T68_guardrails_are_present() {
  const guardrails = [
    "static demo artifact",
    "not runtime integrated",
    "not live evidence",
    "not production ready",
    "no retrieval promotion",
    "no consciousness claim",
    "no final judge mode",
    "no amd live renderer"
  ];

  const checkGuardrails = (filepath: string) => {
    const content = fs.readFileSync(filepath, "utf8").toLowerCase();
    guardrails.forEach(g => assert.ok(content.includes(g), `Missing guardrail '${g}' in ${path.basename(filepath)}`));
  };

  checkGuardrails(PLAN_PATH);
  checkGuardrails(MANIFEST_PATH);
  checkGuardrails(ONEPAGER_PATH);
}


// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 7.2 — T68 Static Judge Demo Visual Assets Validation");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T68_directory_exists", fn: T68_directory_exists },
    { name: "T68_required_files_exist", fn: T68_required_files_exist },
    { name: "T68_manifest_is_valid", fn: T68_manifest_is_valid },
    { name: "T68_plan_references_pack_7_1", fn: T68_plan_references_pack_7_1 },
    { name: "T68_contains_null_alibi_framing", fn: T68_contains_null_alibi_framing },
    { name: "T68_contains_all_required_panels", fn: T68_contains_all_required_panels },
    { name: "T68_contains_comparison_frame", fn: T68_contains_comparison_frame },
    { name: "T68_guardrails_are_present", fn: T68_guardrails_are_present },
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

  console.log(`\nFinished T68. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
