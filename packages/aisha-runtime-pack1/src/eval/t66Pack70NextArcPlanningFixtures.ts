/**
 * T66 — Pack 7.0b Next Arc Planning Validation Fixtures (Corrected)
 *
 * Validates the corrected PACK_7_0_NEXT_ARC_PLANNING.md memo:
 * - All candidate arcs present
 * - NULL ALIBI / Article 9 demo-adjacent framing
 * - All blocker language present
 * - Static packaging explicitly called too weak
 * - Judge-Facing Continuity Trial Experience is the recommendation
 * - All required sections present (Judge Hook, Regular-Person Hook, Core Demo Scenario,
 *   Continuity Proof Beats, Experience Design Panels, Salivate Moments, Comparison Frame,
 *   Pack 7.1 deliverables, Forbidden Claims, Success Criteria, Next Branch Guidance)
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMO_PATH = path.join(__dirname, "../../docs/baselines/PACK_7_0_NEXT_ARC_PLANNING.md");

export async function T66_memo_file_exists() {
  assert.ok(fs.existsSync(MEMO_PATH), `Memo not found at ${MEMO_PATH}`);
}

export async function T66_memo_contains_all_candidate_arcs() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const candidates = [
    "static demo packaging / release artifact planning",
    "judge-facing continuity trial experience planning",
    "runtime ui integration planning",
    "semantic calibration planning with labeled data",
    "live ops retry / real shadow collection",
    "persistence / release hardening planning",
    "further memory/retrieval architecture expansion"
  ];
  const missing = candidates.filter(c => !content.includes(c));
  assert.strictEqual(missing.length, 0, `Missing candidate arcs: ${missing.join(", ")}`);
}

export async function T66_memo_contains_null_alibi_framing() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("null alibi"), "Missing NULL ALIBI demo-adjacent framing");
  assert.ok(content.includes("article 9"), "Missing Article 9 reference");
  assert.ok(content.includes("mertens"), "Missing Mertens NPC reference");
  assert.ok(content.includes("mei"), "Missing Mei NPC reference");
  assert.ok(content.includes("beckett"), "Missing Beckett audit trigger reference");
}

export async function T66_memo_contains_blocker_language() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("live ops") && content.includes("blocked"), "Missing live ops blocked language");
  assert.ok(content.includes("retrieval promotion") && content.includes("denied"), "Missing retrieval promotion denied language");
  assert.ok(content.includes("semantic calibration") && content.includes("data-gated"), "Missing semantic calibration data-gated language");
  assert.ok(content.includes("runtime ui integration") && content.includes("premature"), "Missing runtime UI integration premature language");
}

export async function T66_memo_rejects_static_packaging_as_too_weak() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("static") && content.includes("too weak"),
    "Missing explicit rejection of static packaging as too weak"
  );
}

export async function T66_memo_selects_judge_facing_experience() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("judge-facing continuity trial experience"),
    "Missing Judge-Facing Continuity Trial Experience as selected arc"
  );
}

export async function T66_memo_contains_judge_hook() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("judge hook"), "Missing Judge Hook section");
  assert.ok(content.includes("first 10 seconds"), "Missing 10-second hook in Judge Hook");
  assert.ok(content.includes("30 seconds"), "Missing 30-second understanding in Judge Hook");
  assert.ok(content.includes("90 seconds"), "Missing 90-second verification in Judge Hook");
}

export async function T66_memo_contains_regular_person_hook() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("regular-person hook"), "Missing Regular-Person Hook section");
  assert.ok(content.includes("this is different"), "Missing 'this is different' moment");
}

export async function T66_memo_contains_core_demo_scenario() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("core demo scenario"), "Missing Core Demo Scenario section");
  assert.ok(content.includes("heist"), "Missing heist framing in Core Demo Scenario");
}

export async function T66_memo_contains_continuity_proof_beats() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("continuity proof beats"), "Missing Continuity Proof Beats section");
  const beats = [
    "stable truth established",
    "contradictory truth introduced",
    "old truth preserved as history",
    "active truth updated or disambiguated",
    "supersession/provenance link visible",
    "next-turn behavior uses the correct active truth",
    "contradiction is not hidden, overwritten, or flattened"
  ];
  const missing = beats.filter(b => !content.includes(b));
  assert.strictEqual(missing.length, 0, `Missing proof beats: ${missing.join(", ")}`);
}

export async function T66_memo_contains_experience_design_panels() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("experience design panels"), "Missing Experience Design Panels section");
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
  const missing = panels.filter(p => !content.includes(p));
  assert.strictEqual(missing.length, 0, `Missing experience panels: ${missing.join(", ")}`);
}

export async function T66_memo_contains_salivate_moments() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("salivate") || content.includes("make them salivate"), "Missing 'Make Them Salivate' section");
  const moments = [
    "two npcs can both be telling the truth, and that is the problem",
    "the system remembers the lie as evidence, not as current truth",
    "the next move changes because the memory graph changed",
    "burning a cover solves one problem while creating another",
    "the proof trace shows why a.i.s.h.a said what she said"
  ];
  const missing = moments.filter(m => !content.includes(m));
  assert.strictEqual(missing.length, 0, `Missing salivate moments: ${missing.join(", ")}`);
}

export async function T66_memo_contains_comparison_frame() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("comparison frame"), "Missing Comparison Frame section");
  assert.ok(content.includes("normal assistant"), "Missing normal assistant comparison");
  assert.ok(content.includes("flat memory"), "Missing flat memory comparison");
  assert.ok(content.includes("naive rag"), "Missing naive RAG comparison");
}

export async function T66_memo_contains_pack71_deliverables() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  const deliverables = [
    "pack7-1-judge-demo-experience-spec",
    "pack_7_1_judge_demo_experience_spec.md",
    "judge_demo_script.md",
    "demo_storyboard.json",
    "proof_beats.json"
  ];
  const missing = deliverables.filter(d => !content.includes(d));
  assert.strictEqual(missing.length, 0, `Missing Pack 7.1 deliverables: ${missing.join(", ")}`);
}

export async function T66_memo_contains_forbidden_claims() {
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
  const forbiddenSection = content.split("forbidden claims").slice(1).join("forbidden claims");
  if (!forbiddenSection) throw new Error("Missing 'Forbidden Claims' section");
  const missing = forbidden.filter(f => !forbiddenSection.includes(f));
  assert.strictEqual(missing.length, 0, `Missing forbidden claims: ${missing.join(", ")}`);
}

export async function T66_memo_contains_success_criteria() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(content.includes("success criteria"), "Missing Success Criteria section");
  const criteria = [
    "a judge can explain the mechanism back in one sentence",
    "a regular person can explain the dramatic problem",
    "the proof trace is visible, not hidden",
    "the demo shows consequence, not just memory",
    "no forbidden claims are made"
  ];
  const missing = criteria.filter(c => !content.includes(c));
  assert.strictEqual(missing.length, 0, `Missing success criteria: ${missing.join(", ")}`);
}

export async function T66_memo_contains_next_legal_branch_guidance() {
  const content = fs.readFileSync(MEMO_PATH, "utf8").toLowerCase();
  assert.ok(
    content.includes("pack 7.1") || content.includes("pack7.1") || content.includes("pack7-1"),
    "Missing next legal branch guidance referencing Pack 7.1"
  );
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 7.0b — T66 Judge-Facing Planning Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T66_memo_file_exists", fn: T66_memo_file_exists },
    { name: "T66_memo_contains_all_candidate_arcs", fn: T66_memo_contains_all_candidate_arcs },
    { name: "T66_memo_contains_null_alibi_framing", fn: T66_memo_contains_null_alibi_framing },
    { name: "T66_memo_contains_blocker_language", fn: T66_memo_contains_blocker_language },
    { name: "T66_memo_rejects_static_packaging_as_too_weak", fn: T66_memo_rejects_static_packaging_as_too_weak },
    { name: "T66_memo_selects_judge_facing_experience", fn: T66_memo_selects_judge_facing_experience },
    { name: "T66_memo_contains_judge_hook", fn: T66_memo_contains_judge_hook },
    { name: "T66_memo_contains_regular_person_hook", fn: T66_memo_contains_regular_person_hook },
    { name: "T66_memo_contains_core_demo_scenario", fn: T66_memo_contains_core_demo_scenario },
    { name: "T66_memo_contains_continuity_proof_beats", fn: T66_memo_contains_continuity_proof_beats },
    { name: "T66_memo_contains_experience_design_panels", fn: T66_memo_contains_experience_design_panels },
    { name: "T66_memo_contains_salivate_moments", fn: T66_memo_contains_salivate_moments },
    { name: "T66_memo_contains_comparison_frame", fn: T66_memo_contains_comparison_frame },
    { name: "T66_memo_contains_pack71_deliverables", fn: T66_memo_contains_pack71_deliverables },
    { name: "T66_memo_contains_forbidden_claims", fn: T66_memo_contains_forbidden_claims },
    { name: "T66_memo_contains_success_criteria", fn: T66_memo_contains_success_criteria },
    { name: "T66_memo_contains_next_legal_branch_guidance", fn: T66_memo_contains_next_legal_branch_guidance },
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

  console.log(`\nFinished T66. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
