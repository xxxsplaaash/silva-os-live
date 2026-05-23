#!/usr/bin/env npx tsx
/**
 * Pack 4.4 Release Baseline Regression Matrix Runner
 *
 * Executes the formal regression matrix for the A.I.S.H.A. Pack 4 architecture.
 */

import { execSync } from "child_process";
import * as path from "path";

const SCRIPTS = [
  "t50UngroundedClaimFixtures.ts",
  "t51ReconsolidationFrequencyFixtures.ts",
  "runT7CriticLoopFixtures.ts",
  "runT11PersistedReconsolidationFixtures.ts",
  "t52Pack43ArchitectureReviewFixtures.ts",
  "t53Pack44CombinedInteractionFixtures.ts",
  "t54Pack44BaselineValidationFixtures.ts",
];

console.log("═══════════════════════════════════════════════════════════════");
console.log("  A.I.S.H.A. Pack 4.4 Formal Regression Matrix");
console.log("═══════════════════════════════════════════════════════════════\n");

let anyFailed = false;

for (const script of SCRIPTS) {
  console.log(`\n=== Running ${script} ===`);
  const fullPath = path.join(__dirname, script);
  try {
    // Pipe output so it streams to the console
    execSync(`npx tsx ${fullPath}`, { stdio: "inherit" });
  } catch (err) {
    console.error(`\n❌ Script ${script} FAILED.`);
    anyFailed = true;
  }
}

console.log("\n═══════════════════════════════════════════════════════════════");
if (anyFailed) {
  console.log("  ❌ REGRESSION MATRIX FAILED.");
  process.exit(1);
} else {
  console.log("  ✅ REGRESSION MATRIX PASSED. PACK 4 IS BASELINE LOCKED.");
  process.exit(0);
}
