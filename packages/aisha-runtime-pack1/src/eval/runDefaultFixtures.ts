import { DEFAULT_FIXTURES } from "./defaultFixtures";
import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { printRunSummary } from "./reporters";
import { ScenarioRunner } from "./scenarioRunner";

export async function runDefaultFixtures(): Promise<{
  passed: number;
  failed: number;
}> {
  const runner = new ScenarioRunner(new InMemoryScenarioEnvironmentFactory());
  const summary = await runner.runAndSummarize(DEFAULT_FIXTURES);

  printRunSummary(summary);

  return {
    passed: summary.passed,
    failed: summary.failed,
  };
}

async function main(): Promise<void> {
  try {
    const summary = await runDefaultFixtures();

    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);

    console.error("default_fixture_run_failed");
    console.error(message);
    process.exitCode = 1;
  }
}

void main();
