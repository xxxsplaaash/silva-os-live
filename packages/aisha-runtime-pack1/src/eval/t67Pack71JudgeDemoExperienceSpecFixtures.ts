/**
 * T67 — Pack 7.1 Judge Demo Experience Spec Validation Fixtures
 *
 * Validates the contents of the Pack 7.1 files.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, "../../");
const SPEC_PATH = path.join(BASE_DIR, "docs/baselines/PACK_7_1_JUDGE_DEMO_EXPERIENCE_SPEC.md");
const SCRIPT_PATH = path.join(BASE_DIR, "artifacts/demos/pack7_1_judge_demo_experience/JUDGE_DEMO_SCRIPT.md");
const STORYBOARD_PATH = path.join(BASE_DIR, "artifacts/demos/pack7_1_judge_demo_experience/demo_storyboard.json");
const PROOF_PATH = path.join(BASE_DIR, "artifacts/demos/pack7_1_judge_demo_experience/proof_beats.json");

export async function T67_files_exist() {
  assert.ok(fs.existsSync(SPEC_PATH), `Missing spec at ${SPEC_PATH}`);
  assert.ok(fs.existsSync(SCRIPT_PATH), `Missing script at ${SCRIPT_PATH}`);
  assert.ok(fs.existsSync(STORYBOARD_PATH), `Missing storyboard at ${STORYBOARD_PATH}`);
  assert.ok(fs.existsSync(PROOF_PATH), `Missing proof beats at ${PROOF_PATH}`);
}

export async function T67_spec_contains_north_star() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("demo north star"), "Missing Demo North Star section");
  assert.ok(content.includes("a.i.s.h.a does not just remember what you said. she preserves what changed"), "Missing specific North Star quote");
}

export async function T67_spec_contains_null_alibi_framing() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("null alibi"), "Missing NULL ALIBI");
  assert.ok(content.includes("article 9"), "Missing Article 9");
  assert.ok(content.includes("mertens"), "Missing Mertens");
  assert.ok(content.includes("mei"), "Missing Mei");
  assert.ok(content.includes("beckett"), "Missing Beckett");
}

export async function T67_spec_contains_timelines() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("judge demo timeline"), "Missing Judge Demo Timeline");
  assert.ok(content.includes("regular-person demo timeline"), "Missing Regular-Person Demo Timeline");
}

export async function T67_spec_contains_required_panels() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
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
  panels.forEach(p => assert.ok(content.includes(p), `Missing panel: ${p}`));
}

export async function T67_spec_contains_continuity_proof_beats() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  const beats = [
    "stable truth established",
    "contradictory truth introduced",
    "old truth preserved as history/evidence",
    "active truth updated or disambiguated",
    "supersession/provenance link visible",
    "next-turn behavior uses correct active truth",
    "contradiction is not hidden, overwritten, or flattened"
  ];
  beats.forEach(b => assert.ok(content.includes(b), `Missing proof beat: ${b}`));
}

export async function T67_script_exists_and_contains_sections() {
  const content = fs.readFileSync(SCRIPT_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("narrator opening"), "Missing narrator opening");
  assert.ok(content.includes("first user/player command"), "Missing first user/player command");
  assert.ok(content.includes("contradiction reveal"), "Missing contradiction reveal");
  assert.ok(content.includes("beckett audit pressure"), "Missing beckett audit pressure");
  assert.ok(content.includes("a.i.s.h.a recommendation"), "Missing a.i.s.h.a recommendation");
  assert.ok(content.includes("proof trace reveal"), "Missing proof trace reveal");
  assert.ok(content.includes("closing line"), "Missing closing line");
}

export async function T67_json_files_are_valid() {
  const storyboard = JSON.parse(fs.readFileSync(STORYBOARD_PATH, "utf8"));
  assert.ok(Array.isArray(storyboard), "Storyboard must be an array");
  assert.ok(storyboard.length > 0, "Storyboard must not be empty");
  assert.ok(storyboard[0].beatId, "Storyboard missing beatId");
  assert.ok(storyboard[0].screenState, "Storyboard missing screenState");
  assert.ok(storyboard[0].guardrailLabel, "Storyboard missing guardrailLabel");

  const proofs = JSON.parse(fs.readFileSync(PROOF_PATH, "utf8"));
  assert.ok(Array.isArray(proofs), "Proofs must be an array");
  assert.ok(proofs.length > 0, "Proofs must not be empty");
  assert.ok(proofs[0].proofId, "Proofs missing proofId");
  assert.ok(proofs[0].forbiddenOverclaim, "Proofs missing forbiddenOverclaim");
}

export async function T67_spec_contains_comparison_frame() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("comparison frame"), "Missing comparison frame");
  assert.ok(content.includes("normal assistant"), "Missing normal assistant");
  assert.ok(content.includes("flat memory"), "Missing flat memory");
  assert.ok(content.includes("naive rag"), "Missing naive rag");
}

export async function T67_spec_contains_salivate_moments() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
  const moments = [
    "two npcs can both be telling the truth, and that is the problem",
    "the system remembers the lie as evidence, not as current truth",
    "the next move changes because the memory graph changed",
    "burning a cover solves one problem while creating another",
    "the proof trace shows why a.i.s.h.a said what she said"
  ];
  moments.forEach(m => assert.ok(content.includes(m), `Missing salivate moment: ${m}`));
}

export async function T67_spec_contains_forbidden_claims() {
  const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
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
  const section = content.split("forbidden claims")[1] || content.split("hard guardrails")[1];
  forbidden.forEach(f => assert.ok(section.includes(f), `Missing forbidden claim: ${f}`));
}

export async function T67_spec_contains_next_branch_guidance() {
    const content = fs.readFileSync(SPEC_PATH, "utf8").toLowerCase();
    assert.ok(content.includes("next legal branch guidance"), "Missing next branch guidance");
}


// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 7.1 — T67 Judge Demo Experience Spec Validation");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T67_files_exist", fn: T67_files_exist },
    { name: "T67_spec_contains_north_star", fn: T67_spec_contains_north_star },
    { name: "T67_spec_contains_null_alibi_framing", fn: T67_spec_contains_null_alibi_framing },
    { name: "T67_spec_contains_timelines", fn: T67_spec_contains_timelines },
    { name: "T67_spec_contains_required_panels", fn: T67_spec_contains_required_panels },
    { name: "T67_spec_contains_continuity_proof_beats", fn: T67_spec_contains_continuity_proof_beats },
    { name: "T67_script_exists_and_contains_sections", fn: T67_script_exists_and_contains_sections },
    { name: "T67_json_files_are_valid", fn: T67_json_files_are_valid },
    { name: "T67_spec_contains_comparison_frame", fn: T67_spec_contains_comparison_frame },
    { name: "T67_spec_contains_salivate_moments", fn: T67_spec_contains_salivate_moments },
    { name: "T67_spec_contains_forbidden_claims", fn: T67_spec_contains_forbidden_claims },
    { name: "T67_spec_contains_next_branch_guidance", fn: T67_spec_contains_next_branch_guidance }
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

  console.log(`\nFinished T67. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
