/**
 * T69 — Pack 7.3 Judge Demo Phase Closeout Validation Fixtures
 *
 * Validates the PACK_7_JUDGE_DEMO_PHASE_CLOSEOUT.md document to ensure it
 * accurately summarizes the Pack 7 arc, states what is proven/design-ready,
 * explicitly defines what is NOT proven (forbidden claims), and bounds the
 * next legal arcs.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOSEOUT_PATH = path.join(__dirname, "../../docs/baselines/PACK_7_JUDGE_DEMO_PHASE_CLOSEOUT.md");

export async function T69_closeout_file_exists() {
  assert.ok(fs.existsSync(CLOSEOUT_PATH), `Closeout baseline not found at ${CLOSEOUT_PATH}`);
}

export async function T69_closeout_summarizes_pack_7_arc() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  const required = [
    "pack 7.0b", "judge-facing continuity trial",
    "pack 7.1", "judge demo experience spec",
    "pack 7.2", "static judge demo visual assets"
  ];
  const missing = required.filter(r => !content.includes(r));
  assert.strictEqual(missing.length, 0, `Missing pack summaries: ${missing.join(", ")}`);
}

export async function T69_closeout_states_what_is_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  const proven = [
    "null alibi / article 9 judge-facing wrapper exists as demo-adjacent plan",
    "mertens / mei belief collision exists as core contradiction scenario",
    "beckett audit pressure exists as consequence mechanism",
    "judge and regular-person hooks are defined",
    "continuity proof beats are storyboarded",
    "static visual asset manifest exists",
    "comparison frame exists",
    "guardrails are represented"
  ];
  const missing = proven.filter(p => !content.includes(p));
  assert.strictEqual(missing.length, 0, `Missing proven claims: ${missing.join(", ")}`);
}

export async function T69_closeout_states_what_is_not_proven() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
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
  const section = content.split("what is not proven")[1] || content.split("forbidden claims")[1];
  if (!section) throw new Error("Missing 'What Is NOT Proven' section");
  const missing = forbidden.filter(f => !section.includes(f));
  assert.strictEqual(missing.length, 0, `Missing forbidden claims in section: ${missing.join(", ")}`);
}

export async function T69_closeout_defines_next_legal_arcs() {
  const content = fs.readFileSync(CLOSEOUT_PATH, "utf8").toLowerCase();
  const arcs = [
    "external design handoff package",
    "static html frame expansion only as artifact work",
    "runtime ui integration planning only after explicit authorization",
    "live ops retry only after pack 3.19b / 4.5 blockers are resolved",
    "semantic calibration planning only with clearly labeled data"
  ];
  const missing = arcs.filter(a => !content.includes(a));
  assert.strictEqual(missing.length, 0, `Missing next legal arcs: ${missing.join(", ")}`);
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 7.3 — T69 Judge Demo Phase Closeout Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T69_closeout_file_exists", fn: T69_closeout_file_exists },
    { name: "T69_closeout_summarizes_pack_7_arc", fn: T69_closeout_summarizes_pack_7_arc },
    { name: "T69_closeout_states_what_is_proven", fn: T69_closeout_states_what_is_proven },
    { name: "T69_closeout_states_what_is_not_proven", fn: T69_closeout_states_what_is_not_proven },
    { name: "T69_closeout_defines_next_legal_arcs", fn: T69_closeout_defines_next_legal_arcs },
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

  console.log(`\nFinished T69. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
