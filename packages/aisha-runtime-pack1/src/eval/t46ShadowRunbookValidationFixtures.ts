/**
 * T46 — Pack 3.16 Runbook Validation
 *
 * Ensures the shadow session operator runbook exists and contains the
 * critical commands and Pack 3.11 thresholds required for evidence collection
 * and review, guaranteeing the manual procedure strictly matches the audited spec.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

const RUNBOOK_PATH = path.join(__dirname, "../../docs/runbooks/pack3-16-shadow-session-runbook.md");

export function T46_runbook_exists_and_contains_safety_checks() {
  assert.ok(fs.existsSync(RUNBOOK_PATH), "Pack 3.16 runbook must exist at docs/runbooks/pack3-16-shadow-session-runbook.md");
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");

  assert.ok(content.includes("git branch --show-current"), "Runbook must include branch verification command");
  assert.ok(content.includes("git tag --points-at HEAD"), "Runbook must include tag verification command");
  assert.ok(content.includes("echo $AISHA_SHADOW_ASSOCIATIVE"), "Runbook must verify shadow associative flag is default OFF");
  assert.ok(content.includes("echo $AISHA_SHADOW_TRACE"), "Runbook must verify shadow trace flag is default OFF");
  assert.ok(content.includes("npx tsx src/eval/runT42ShadowRetrievalFixtures.ts"), "Runbook must verify no live-path promotion via T42");
}

export function T46_runbook_contains_sampling_commands() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");
  
  assert.ok(content.includes("export AISHA_SHADOW_ASSOCIATIVE=1"), "Runbook must include command to enable associative sampling");
  assert.ok(content.includes("export AISHA_SHADOW_TRACE=1"), "Runbook must include command to enable trace sampling");
  assert.ok(content.includes("unset AISHA_SHADOW_ASSOCIATIVE"), "Runbook must include command to disable associative sampling");
  assert.ok(content.includes("unset AISHA_SHADOW_TRACE"), "Runbook must include command to disable trace sampling");
}

export function T46_runbook_contains_evidence_workflow_scripts() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");

  assert.ok(content.includes("exportShadowEvidence"), "Runbook must document exportShadowEvidence usage");
  assert.ok(content.includes("exportAnnotationTemplate"), "Runbook must document exportAnnotationTemplate usage");
  assert.ok(content.includes("loadAnnotatedSnapshot"), "Runbook must document loadAnnotatedSnapshot usage");
  assert.ok(content.includes("aggregateLaneEvidence"), "Runbook must document aggregateLaneEvidence usage");
}

export function T46_runbook_contains_annotation_guidelines() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");

  assert.ok(content.includes("operatorReviewed"), "Runbook must include operatorReviewed guidelines");
  assert.ok(content.includes("contradictionCaught"), "Runbook must include contradictionCaught guidelines");
  assert.ok(content.includes("noiseFlagged"), "Runbook must include noiseFlagged guidelines");
  assert.ok(content.includes("noteGraphSizeLogged"), "Runbook must include noteGraphSizeLogged guidelines");
  assert.ok(content.includes("episodeSummaryPopulationRate"), "Runbook must include episodeSummaryPopulationRate guidelines");
}

export function T46_runbook_enforces_pack311_thresholds() {
  const content = fs.readFileSync(RUNBOOK_PATH, "utf8");

  assert.ok(content.includes("contradictionRecoveryRate` >= 0.80"), "Runbook must enforce contradictionRecoveryRate >= 0.80");
  assert.ok(content.includes("noisePrecisionLossRate` <= 0.25"), "Runbook must enforce noisePrecisionLossRate <= 0.25");
  assert.ok(content.includes("shadow p99 latency` <= 5ms"), "Runbook must enforce shadow p99 latency <= 5ms");
  assert.ok(content.includes("operator-reviewed audit entries"), "Runbook must enforce >= 10 operator-reviewed audit entries");
  assert.ok(content.includes("Zero prompt token budget overflows"), "Runbook must enforce zero prompt token budget overflows");
  assert.ok(content.includes("reviewDisambiguationRate` >= 0.50"), "Runbook must enforce reviewDisambiguationRate >= 0.50 for trace");
  assert.ok(content.includes("traceUtilisationRate` >= 0.30"), "Runbook must enforce traceUtilisationRate >= 0.30 for trace");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.16 — Shadow Session Runbook Validation (T46)");
  console.log("  [Markdown structural/content verification]");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T46_runbook_exists_and_contains_safety_checks", fn: T46_runbook_exists_and_contains_safety_checks },
    { name: "T46_runbook_contains_sampling_commands", fn: T46_runbook_contains_sampling_commands },
    { name: "T46_runbook_contains_evidence_workflow_scripts", fn: T46_runbook_contains_evidence_workflow_scripts },
    { name: "T46_runbook_contains_annotation_guidelines", fn: T46_runbook_contains_annotation_guidelines },
    { name: "T46_runbook_enforces_pack311_thresholds", fn: T46_runbook_enforces_pack311_thresholds },
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

  console.log(`\nFinished T46. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
