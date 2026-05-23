/**
 * T64 — Pack 6.2 Static UI Prototype Validation Fixtures
 *
 * Validates the contents of the pack6_2_static_ui_prototype directory
 * to ensure all prototype files, required panels, specific Pack 5 values,
 * and strict guardrails are present.
 *
 * Deterministic — no LLM, no live network.
 */

import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTOTYPE_DIR = path.join(__dirname, "../../artifacts/demos/pack6_2_static_ui_prototype");
const MD_PATH = path.join(PROTOTYPE_DIR, "STATIC_UI_PROTOTYPE.md");
const JSON_PATH = path.join(PROTOTYPE_DIR, "prototype_payload.json");
const HTML_PATH = path.join(PROTOTYPE_DIR, "prototype.html");

export async function T64_prototype_directory_exists() {
  assert.ok(fs.existsSync(PROTOTYPE_DIR), `Prototype directory not found at ${PROTOTYPE_DIR}`);
}

export async function T64_required_prototype_files_exist() {
  assert.ok(fs.existsSync(MD_PATH), "STATIC_UI_PROTOTYPE.md is missing");
  assert.ok(fs.existsSync(JSON_PATH), "prototype_payload.json is missing");
  assert.ok(fs.existsSync(HTML_PATH), "prototype.html is missing");
}

export async function T64_md_contains_required_panels() {
  const content = fs.readFileSync(MD_PATH, "utf8").toLowerCase();
  const panels = [
    "current active truth",
    "historical truth / superseded memory",
    "supersession link / provenance",
    "next-turn continuity check",
    "guardrails / what this does not prove"
  ];
  const missing = panels.filter(p => !content.includes(p));
  assert.strictEqual(missing.length, 0, `MD missing required panels: ${missing.join(", ")}`);
}

export async function T64_html_contains_required_panels() {
  const content = fs.readFileSync(HTML_PATH, "utf8").toLowerCase();
  const panels = [
    "current active truth",
    "historical truth / superseded memory",
    "supersession link / provenance",
    "next-turn continuity check",
    "guardrails / what this does not prove"
  ];
  const missing = panels.filter(p => !content.includes(p));
  assert.strictEqual(missing.length, 0, `HTML missing required panels: ${missing.join(", ")}`);
}

export async function T64_contains_pack_5_demo_values() {
  // Check JSON payload
  const payload = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  assert.strictEqual(payload.state.historicalTruth.value, "drink preference: espresso");
  assert.strictEqual(payload.state.historicalTruth.status, "superseded");
  assert.strictEqual(payload.state.activeTruth.value, "drink preference: oat lattes");
  assert.strictEqual(payload.state.activeTruth.status, "active");

  // Check MD
  const mdContent = fs.readFileSync(MD_PATH, "utf8").toLowerCase();
  assert.ok(mdContent.includes("drink preference: espresso"));
  assert.ok(mdContent.includes("drink preference: oat lattes"));
  
  // Check HTML
  const htmlContent = fs.readFileSync(HTML_PATH, "utf8").toLowerCase();
  assert.ok(htmlContent.includes("drink preference: espresso"));
  assert.ok(htmlContent.includes("drink preference: oat lattes"));
}

export async function T64_contains_guardrail_labels() {
  const htmlContent = fs.readFileSync(HTML_PATH, "utf8").toLowerCase();
  assert.ok(htmlContent.includes("deterministic demo artifact"));
  assert.ok(htmlContent.includes("static prototype"));
  assert.ok(htmlContent.includes("not live"));
  assert.ok(htmlContent.includes("not production"));
}

export async function T64_json_flags_correct() {
  const payload = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  assert.strictEqual(payload.productionReady, false, "productionReady must be false");
  assert.strictEqual(payload.liveEvidence, false, "liveEvidence must be false");
  assert.strictEqual(payload.retrievalPromotion, false, "retrievalPromotion must be false");
  assert.strictEqual(payload.runtimeIntegrated, false, "runtimeIntegrated must be false");
}

// ─── Main runner ──────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 6.2 — T64 Static UI Prototype Validation Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T64_prototype_directory_exists", fn: T64_prototype_directory_exists },
    { name: "T64_required_prototype_files_exist", fn: T64_required_prototype_files_exist },
    { name: "T64_md_contains_required_panels", fn: T64_md_contains_required_panels },
    { name: "T64_html_contains_required_panels", fn: T64_html_contains_required_panels },
    { name: "T64_contains_pack_5_demo_values", fn: T64_contains_pack_5_demo_values },
    { name: "T64_contains_guardrail_labels", fn: T64_contains_guardrail_labels },
    { name: "T64_json_flags_correct", fn: T64_json_flags_correct },
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

  console.log(`\nFinished T64. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}
