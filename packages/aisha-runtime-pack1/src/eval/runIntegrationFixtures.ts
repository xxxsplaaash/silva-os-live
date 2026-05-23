import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { INTEGRATION_FIXTURES } from "./integrationFixtures";
import { ScenarioRunner } from "./scenarioRunner";

async function main() {
  console.log("Starting Integration Fixtures (T4, T5)...\n");
  
  const factory = new InMemoryScenarioEnvironmentFactory();
  const runner = new ScenarioRunner(factory);
  
  let passedCount = 0;
  let failedCount = 0;

  for (const fixture of INTEGRATION_FIXTURES) {
    process.stdout.write(`Running [${fixture.id}]... `);
    try {
      const result = await runner.runFixture(fixture);
      if (result.passed) {
        console.log("✅ PASS");
        passedCount++;
      } else {
        console.log("❌ FAIL");
        failedCount++;
        result.assertions.failures.forEach(f => {
          console.log(`   - [${f.code}] ${f.message}`);
        });
        // Print some inspection info for debugging if failed
        console.log("   Inspection Snapshot:", JSON.stringify(result.inspection.snapshot?.expressiveEnvelope, null, 2));
        console.log("   Active Notes:", result.inspection.activeNotes.map(n => n.canonicalText));
        console.log("   Contradiction Evidence:", result.inspection.contradictionEvidence.map(n => n.canonicalText));
      }
    } catch (e: any) {
      console.log("💥 CRASH");
      console.error(e);
      failedCount++;
    }
  }

  console.log(`\nFinished. Passed: ${passedCount}, Failed: ${failedCount}`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
