import type { ScenarioAssertionFailure, ScenarioRunResult } from "./fixtureTypes";

function formatFailures(failures: ScenarioAssertionFailure[]): string[] {
  if (failures.length === 0) {
    return ["  assertions: none"];
  }

  return failures.map(
    (failure, index) => `  assertion[${index + 1}] ${failure.code}: ${failure.message}`,
  );
}

function formatTraceSummary(result: ScenarioRunResult): string[] {
  const trace = result.trace;
  const lastStage =
    trace.events.length > 0 ? trace.events[trace.events.length - 1].stage : "(none)";

  const lines = [
    `  trace.status: ${trace.status}`,
    `  trace.events: ${trace.events.length}`,
    `  trace.lastStage: ${lastStage}`,
  ];

  if (trace.failureReason) {
    lines.push(`  trace.failureReason: ${trace.failureReason}`);
  }

  return lines;
}

function formatMemorySummary(result: ScenarioRunResult): string[] {
  return [
    `  memory.turns: ${result.inspection.turns.length}`,
    `  memory.snapshot: ${result.inspection.snapshot ? "present" : "missing"}`,
    `  memory.episode: ${result.inspection.episode ? result.inspection.episode.id : "missing"}`,
    `  memory.thread: ${result.inspection.thread ? result.inspection.thread.id : "missing"}`,
    `  memory.activeNotes: ${result.inspection.activeNotes.length}`,
    `  memory.contradictionEvidence: ${result.inspection.contradictionEvidence.length}`,
  ];
}

export function formatScenarioRun(result: ScenarioRunResult): string {
  const status = result.passed ? "PASS" : "FAIL";

  const lines: string[] = [
    `[${status}] ${result.fixtureId}`,
    `  description: ${result.description}`,
    `  outcome.ok: ${result.result.ok}`,
    `  output: ${result.result.text}`,
    ...formatTraceSummary(result),
    ...formatMemorySummary(result),
    ...formatFailures(result.assertions.failures),
  ];

  if (result.result.fallbackReason) {
    lines.push(`  fallback.reason: ${result.result.fallbackReason}`);
  }

  return lines.join("\n");
}

export function formatRunSummary(input: {
  passed: number;
  failed: number;
  results: ScenarioRunResult[];
}): string {
  const lines: string[] = [
    "=== PACK 1 DEFAULT FIXTURE RUN ===",
    `fixtures.total: ${input.results.length}`,
    `fixtures.passed: ${input.passed}`,
    `fixtures.failed: ${input.failed}`,
    "",
  ];

  for (const result of input.results) {
    lines.push(formatScenarioRun(result));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function printRunSummary(input: {
  passed: number;
  failed: number;
  results: ScenarioRunResult[];
}): void {
  console.log(formatRunSummary(input));
}
