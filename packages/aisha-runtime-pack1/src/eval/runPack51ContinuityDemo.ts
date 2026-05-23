#!/usr/bin/env npx tsx
/**
 * Pack 5.1 Continuity Demo Runner
 * Executes the T58 contradiction-aware continuity demo fixtures.
 */

import { runT58 } from "./t58Pack51ContinuityDemoFixtures";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const { passed, failed, steps } = await runT58();

  const report = {
    pack: "5.1",
    scenario: "Contradiction-Aware Continuity Demo",
    executedAt: new Date().toISOString(),
    passed,
    failed,
    steps,
    constraints: {
      retrievalPromotion: "DENIED — InMemoryNoteVersioning only",
      liveEvidence: "NONE — all fixtures are deterministic seeds",
      llmAsJudge: "NOT USED",
      productionReadiness: "NOT CLAIMED",
    },
  };

  const outDir = path.join(__dirname, "../../artifacts/demos/pack5_1_continuity_demo");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nReport written to artifacts/demos/pack5_1_continuity_demo/report.json`);

  if (failed > 0) process.exit(1);
}

main().catch(console.error);
