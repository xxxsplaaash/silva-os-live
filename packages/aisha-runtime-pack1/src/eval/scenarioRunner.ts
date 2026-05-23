import { processTurn } from "../runtime/processTurn";
import type {
  ScenarioEnvironmentFactory,
  ScenarioFixture,
  ScenarioRunResult,
} from "./fixtureTypes";
import { assertScenario } from "./assertions";

/**
 * Pack 1 scenario runner:
 * - one fixture -> one environment
 * - optional prelude turns -> one asserted turn
 * - captures trace and memory inspection
 * - supports success and fallback expectations
 * - does not pretend to be a full test framework
 */
export class ScenarioRunner {
  constructor(private readonly environmentFactory: ScenarioEnvironmentFactory) {}

  async runFixture(fixture: ScenarioFixture): Promise<ScenarioRunResult> {
    const environment = await this.environmentFactory.create();

    if (environment.seed) {
      await environment.seed(fixture.initialState);
    }

    if (fixture.preludeTurns?.length) {
      for (const turn of fixture.preludeTurns) {
        await processTurn(environment.deps, turn);
      }
    }

    const result = await processTurn(environment.deps, fixture.input);

    const inspection = {
      turns: await environment.inspectors.getRecentTurns(fixture.input.sessionId),
      snapshot: await environment.inspectors.getLatestSnapshot(fixture.input.sessionId),
      recentSnapshots: await environment.inspectors.getRecentSnapshots(fixture.input.sessionId, 10),
      episode: await environment.inspectors.getActiveEpisode(fixture.input.sessionId),
      thread: await environment.inspectors.getActiveThread(fixture.input.sessionId),
      activeNotes: await environment.inspectors.listActiveNotes(),
      contradictionEvidence:
        await environment.inspectors.listContradictionEvidence(),
    };

    const assertions = assertScenario({
      expected: fixture.expected,
      result,
      inspection,
    });

    return {
      fixtureId: fixture.id,
      description: fixture.description,
      passed: assertions.passed,
      result,
      trace: result.trace,
      assertions,
      inspection,
    };
  }

  async runFixtures(fixtures: ScenarioFixture[]): Promise<ScenarioRunResult[]> {
    const results: ScenarioRunResult[] = [];

    for (const fixture of fixtures) {
      results.push(await this.runFixture(fixture));
    }

    return results;
  }

  async runAndSummarize(fixtures: ScenarioFixture[]): Promise<{
    passed: number;
    failed: number;
    results: ScenarioRunResult[];
  }> {
    const results = await this.runFixtures(fixtures);
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    return {
      passed,
      failed,
      results,
    };
  }
}
