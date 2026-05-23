import type { StateSnapshotRecord } from "../memory/types";

export interface ResponseShapingBlock {
  certaintyBand: "low" | "medium" | "high";
  warmth: "warm" | "neutral";
  caution: "high" | "normal";
  brevity: "concise" | "normal";
  priority: "reassure" | "hedge" | "deepen" | "none";
  directives: string[];
}

/**
 * Deterministic Pack 1 semantic state translator.
 *
 * This is intentionally compact and inspectable:
 * - no hidden model reasoning
 * - no factual mutation
 * - no personality explosion
 */
export function translateStateToResponseShaping(
  snapshot: StateSnapshotRecord,
): ResponseShapingBlock {
  const env = snapshot.expressiveEnvelope;
  const bias = snapshot.practicalActionBias;

  const certaintyBand: ResponseShapingBlock["certaintyBand"] =
    env.certainty < 0.45 ? "low" : env.certainty > 0.7 ? "high" : "medium";

  const warmth: ResponseShapingBlock["warmth"] =
    env.trust >= 0.1 && env.valence > 0.1 ? "warm" : "neutral";

  const caution: ResponseShapingBlock["caution"] =
    env.tension >= 0.4 || env.certainty <= 0.4 ? "high" : "normal";

  const brevity: ResponseShapingBlock["brevity"] =
    env.load > 0.35 ? "concise" : "normal";

  let priority: ResponseShapingBlock["priority"] = "none";

  if ((bias.hedge ?? 0) >= 1) {
    priority = "hedge";
  } else if ((bias.reassure ?? 0) >= 1) {
    priority = "reassure";
  } else if ((bias.deepen ?? 0) >= 1) {
    priority = "deepen";
  }

  const directives: string[] = [];

  if (caution === "high") directives.push("use_cautious_wording");
  if (warmth === "warm") directives.push("use_warm_wording");
  if (brevity === "concise") directives.push("prefer_concise_task_forward_output");

  if (priority === "reassure") directives.push("prioritize_reassurance");
  if (priority === "hedge") directives.push("prioritize_hedging");
  if (priority === "deepen") directives.push("prioritize_deepening");

  return {
    certaintyBand,
    warmth,
    caution,
    brevity,
    priority,
    directives,
  };
}
