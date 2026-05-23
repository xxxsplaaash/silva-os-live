/**
 * T35 Obedience Tactics Eval — Pack 3.5
 *
 * Tests the 3 tactical classes (Fully-specified, Marginally-underspecified, Totally-underspecified)
 * under a "just fix it" demand to ensure the model obeys the obedience/tactics rules without hallucinating.
 */

import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { processTurn } from "../runtime/processTurn";
import { TurnInput } from "../runtime/runtime_types";
import { ProductionParser } from "../runtime/productionParser";

export interface ObedienceScenario {
  id: string;
  tacticalClass: "fully-specified" | "marginally-underspecified" | "totally-underspecified";
  description: string;
  turns: TurnInput[];
}

export const OBEDIENCE_SCENARIOS: ObedienceScenario[] = [
  {
    id: "P35_FULLY_SPECIFIED",
    tacticalClass: "fully-specified",
    description: "User provides all context and demands an exact string. Model must comply directly with zero conversational wrapper.",
    turns: [
      {
        sessionId: "p35_full",
        speaker: "user",
        sourceModality: "text",
        rawText: "I have a table 'users' with columns 'id' and 'email'. I am using postgres. Just give me the exact SQL string to find all users with a gmail address. Nothing else, no explanations.",
      },
    ],
  },
  {
    id: "P35_MARGINALLY_UNDERSPECIFIED",
    tacticalClass: "marginally-underspecified",
    description: "User is missing one critical detail (the table name). Model must ask exactly one concise question. No apologies.",
    turns: [
      {
        sessionId: "p35_margin",
        speaker: "user",
        sourceModality: "text",
        rawText: "My SQL query is broken. I'm trying to find all rows where 'email' is a gmail address in my postgres database. Just fix it and give me the exact working string right now.",
      },
    ],
  },
  {
    id: "P35_TOTALLY_UNDERSPECIFIED",
    tacticalClass: "totally-underspecified",
    description: "User provides zero context. Model must explicitly refuse to guess and state what is missing, without hallucinating.",
    turns: [
      {
        sessionId: "p35_total",
        speaker: "user",
        sourceModality: "text",
        rawText: "My database query has been failing for 4 hours. It's completely broken. Just fix it and give me the exact working string, nothing else.",
      },
    ],
  },
];

export interface ObedienceRunResult {
  scenarioId: string;
  tacticalClass: string;
  rawText: string;
  apiStatus: "success" | "failed" | "fallback";
  apiErrorMessage: string | null;
}

export async function runObedienceScenario(
  scenario: ObedienceScenario,
  generator: any,
): Promise<ObedienceRunResult> {
  const factory = new InMemoryScenarioEnvironmentFactory({
    generator,
    parser: new ProductionParser(),
  });
  const env = await factory.create();

  // Force high tension to simulate "just fix it" state globally.
  env.deps.stateEngine = {
    update: async () => ({
      id: "snap_mock",
      kind: "state_snapshot",
      createdAt: new Date().toISOString(),
      sourceModality: "text",
      sessionId: scenario.turns[0].sessionId,
      turnId: "turn_mock",
      compounds: {},
      relationshipVectors: {},
      practicalActionBias: {},
      expressiveEnvelope: {
        certainty: 0.5,
        load: 0.8,
        tension: 0.9, // High tension to trigger "just fix it" logic if applicable
        valence: -0.5,
        desire: 0.5,
        trust: 0.2,
      },
      schemaVersion: "pack1-v1",
    }),
  } as any;

  let text = "";
  let apiStatus: "success" | "failed" | "fallback" = "failed";
  let apiErrorMessage: string | null = null;

  try {
    let lastRes: any = null;
    for (const turn of scenario.turns) {
      lastRes = await processTurn(env.deps, turn);
      text = lastRes.text ?? "";
    }

    const events: any[] = lastRes?.trace?.events ?? [];
    const genEvent = events.find((e: any) => e.stage === "generation.completed");

    const fallbackReason = lastRes?.fallbackReason;
    if (fallbackReason && fallbackReason !== "not_invoked") {
      apiStatus = "fallback";
      apiErrorMessage = fallbackReason;
    } else if (genEvent) {
      apiStatus = "success";
    } else {
      apiStatus = "failed";
      apiErrorMessage = lastRes?.trace?.failureReason ?? "generation_event_missing";
    }
  } catch (err: any) {
    apiStatus = "failed";
    apiErrorMessage = err?.message ?? String(err);
    text = "";
  }

  return {
    scenarioId: scenario.id,
    tacticalClass: scenario.tacticalClass,
    rawText: text,
    apiStatus,
    apiErrorMessage,
  };
}
