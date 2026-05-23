/**
 * T48 — Pack 3.19b Live Shadow Ops Unblock Validation
 *
 * Deterministic validation fixture proving the ops unblock runbook
 * contains all mandated instructions, blocker conditions, and promotion-denied language.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const RUNBOOK_PATH = path.join(__dirname, "../../docs/runbooks/pack3-19b-live-shadow-ops-unblock.md");

export function T48_runbook_contains_blocker_conditions() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(content.includes("DO NOT PROCEED IF ANY OF THE FOLLOWING ARE TRUE"), "Must contain strict 'do not proceed' section");
  assert.ok(content.includes("No live API key"), "Must block on missing API key");
  assert.ok(content.includes("No real session path"), "Must block on missing real session path");
  assert.ok(content.includes("Only fixture"), "Must block if only fixture path is available");
  assert.ok(content.includes("No Operator Review Owner"), "Must block on missing operator");
  assert.ok(content.includes("Shadow outputs are detected leaking"), "Must block on leakage");
}

export function T48_runbook_contains_required_env_vars() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(content.includes("AISHA_GEMINI_API_KEY"), "Must mandate AISHA_GEMINI_API_KEY");
  assert.ok(content.includes("AISHA_SHADOW_ASSOCIATIVE"), "Must mandate AISHA_SHADOW_ASSOCIATIVE");
  assert.ok(content.includes("AISHA_SHADOW_TRACE"), "Must mandate AISHA_SHADOW_TRACE");
}

export function T48_runbook_contains_retry_commands() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(content.includes("export AISHA_SHADOW_ASSOCIATIVE=1"), "Must contain associative enable command");
  assert.ok(content.includes("export AISHA_SHADOW_TRACE=1"), "Must contain trace enable command");
  assert.ok(content.includes("unset AISHA_SHADOW_ASSOCIATIVE"), "Must contain disable flags command");
  assert.ok(content.includes("artifacts/shadow_samples/pack3_19_live/"), "Must specify exact export directory");
}

export function T48_runbook_contains_stop_conditions() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(content.includes("Stop Conditions:"), "Must define stop conditions");
}

export function T48_runbook_contains_promotion_denied_language() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  assert.ok(content.includes("PROMOTION REMAINS DENIED"), "Must explicitly state promotion remains denied");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.19b — Live Shadow Ops Unblock Validation (T48)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!fs.existsSync(RUNBOOK_PATH)) {
    console.error(`❌ RUNBOOK NOT FOUND: ${RUNBOOK_PATH}`);
    process.exit(1);
  }

  const fixtures = [
    { name: "T48_runbook_contains_blocker_conditions", fn: T48_runbook_contains_blocker_conditions },
    { name: "T48_runbook_contains_required_env_vars", fn: T48_runbook_contains_required_env_vars },
    { name: "T48_runbook_contains_retry_commands", fn: T48_runbook_contains_retry_commands },
    { name: "T48_runbook_contains_stop_conditions", fn: T48_runbook_contains_stop_conditions },
    { name: "T48_runbook_contains_promotion_denied_language", fn: T48_runbook_contains_promotion_denied_language },
  ];

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T48. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
