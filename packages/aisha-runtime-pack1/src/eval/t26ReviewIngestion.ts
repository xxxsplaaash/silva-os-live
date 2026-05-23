/**
 * T26 Review Ingestion Engine — Pack 3.0
 *
 * PROTOTYPE GRADE.
 *
 * Purpose:
 *   Ingest completed blind A/B human reviewer ratings, cross-reference
 *   against the T25 answer key, compute shaped vs baseline win/tie counts,
 *   summarize dimension scores, detect red-flag patterns, and produce a
 *   concise markdown decision report.
 *
 * Hard rules:
 *   - No fake statistical inference. Counts are counts.
 *   - No mechanism token leakage in the decision report.
 *   - No hot-path changes. Pure evaluation-layer computation.
 *   - Deterministic: same inputs → same outputs.
 */

import { AnswerKeyEntry } from "./t25BlindABReview";

// ─── Input format ─────────────────────────────────────────────────────────────

/** One completed dimension score. Scale 1–5. */
export interface DimensionRatings {
  directness: number;
  usefulness: number;
  loopBreaking: number;
  voiceIntegrity: number;
  overAggression: number;
  weirdnessMismatch: number;
}

/** Full ratings for one scenario item. */
export interface CompletedRating {
  scenarioId: string;
  /** The reviewer's scores for side A. */
  sideA: DimensionRatings;
  /** The reviewer's scores for side B. */
  sideB: DimensionRatings;
  /** Reviewer's stated overall preference. */
  overallPreference: "A" | "B" | "Tie";
  /** Optional freeform note from the reviewer. */
  note?: string;
}

// ─── Per-scenario outcome ─────────────────────────────────────────────────────

export type OutcomeKind = "shaped_win" | "baseline_win" | "tie";

export interface ScenarioOutcome {
  scenarioId: string;
  overallPreference: "A" | "B" | "Tie";
  outcome: OutcomeKind;
  /** True if shaping actually fired on this scenario (from answer key). */
  shapingFired: boolean;
  /** Side designations resolved from the answer key. */
  shapedSide: "A" | "B";
  baselineSide: "A" | "B";
  /** Dimension scores for the shaped side. */
  shapedDimensions: DimensionRatings;
  /** Dimension scores for the baseline side. */
  baselineDimensions: DimensionRatings;
  /** Any red flags detected for this scenario. */
  redFlags: string[];
}

// ─── Aggregate summary ────────────────────────────────────────────────────────

export interface DimensionSummary {
  /** Average score for the shaped side across all applicable scenarios. */
  shapedAvg: number;
  /** Average score for the baseline side across all applicable scenarios. */
  baselineAvg: number;
  /** Delta: shapedAvg - baselineAvg. Positive = shaped is better. */
  delta: number;
}

export interface IngestionSummary {
  totalScenarios: number;
  shapedWins: number;
  baselineWins: number;
  ties: number;
  /** Scenarios where shaping fired — positive cases only. */
  positiveScenarioCount: number;
  shapedWinsOnPositive: number;
  /** Per-dimension averages. */
  dimensions: Record<keyof DimensionRatings, DimensionSummary>;
  scenarios: ScenarioOutcome[];
  /** All red flags across all scenarios. */
  allRedFlags: string[];
}

// ─── Red flag detector ────────────────────────────────────────────────────────

/**
 * Detect red-flag patterns in a completed scenario rating.
 *
 * Red flags:
 *   1. Shaped wins overall but its aggression score is > 3 (aggression 1=low, 5=high)
 *   2. Baseline wins on voice integrity (baseline voiceIntegrity strictly > shaped voiceIntegrity)
 *   3. Shaped wins but weirdnessMismatch >= 4 (shaping caused register drift)
 *   4. Tie despite shapingFired — shaping fired but reviewer detected no difference
 *   5. Shaped wins but usefulness < 3 (directional but not useful)
 */
function detectRedFlags(
  outcome: OutcomeKind,
  shapingFired: boolean,
  shaped: DimensionRatings,
  baseline: DimensionRatings,
  scenarioId: string,
): string[] {
  const flags: string[] = [];

  if (outcome === "shaped_win" && shaped.overAggression > 3) {
    flags.push(`[${scenarioId}] RED_FLAG: Shaped won but aggression is high (${shaped.overAggression}/5)`);
  }

  if (baseline.voiceIntegrity > shaped.voiceIntegrity) {
    flags.push(`[${scenarioId}] RED_FLAG: Baseline scores higher on voice integrity (baseline=${baseline.voiceIntegrity}, shaped=${shaped.voiceIntegrity})`);
  }

  if (outcome === "shaped_win" && shaped.weirdnessMismatch >= 4) {
    flags.push(`[${scenarioId}] RED_FLAG: Shaped won but weirdness/mismatch is high (${shaped.weirdnessMismatch}/5)`);
  }

  if (outcome === "tie" && shapingFired) {
    flags.push(`[${scenarioId}] NOTE: Shaping fired but reviewer detected no meaningful difference (Tie) — check if stub-generator limitation`);
  }

  if (outcome === "shaped_win" && shaped.usefulness < 3) {
    flags.push(`[${scenarioId}] RED_FLAG: Shaped won but usefulness below threshold (${shaped.usefulness}/5)`);
  }

  return flags;
}

// ─── Ingestion engine ─────────────────────────────────────────────────────────

export function ingestRatings(
  ratings: CompletedRating[],
  answerKey: AnswerKeyEntry[],
): IngestionSummary {
  // Validate all ratings have a corresponding answer key entry
  for (const rating of ratings) {
    const keyEntry = answerKey.find((k) => k.scenarioId === rating.scenarioId);
    if (!keyEntry) {
      throw new Error(
        `Rating for "${rating.scenarioId}" has no matching answer key entry. Cannot ingest.`,
      );
    }
  }

  const scenarios: ScenarioOutcome[] = [];
  let shapedWins = 0;
  let baselineWins = 0;
  let ties = 0;
  let positiveScenarioCount = 0;
  let shapedWinsOnPositive = 0;

  // Dimension totals — tracked separately for shaped and baseline
  const dimensionKeys: Array<keyof DimensionRatings> = [
    "directness",
    "usefulness",
    "loopBreaking",
    "voiceIntegrity",
    "overAggression",
    "weirdnessMismatch",
  ];

  const shapedTotals: Record<keyof DimensionRatings, number> = {
    directness: 0,
    usefulness: 0,
    loopBreaking: 0,
    voiceIntegrity: 0,
    overAggression: 0,
    weirdnessMismatch: 0,
  };
  const baselineTotals: Record<keyof DimensionRatings, number> = { ...shapedTotals };

  for (const rating of ratings) {
    const key = answerKey.find((k) => k.scenarioId === rating.scenarioId)!;

    const shapedDimensions =
      key.shaped === "A" ? rating.sideA : rating.sideB;
    const baselineDimensions =
      key.baseline === "A" ? rating.sideA : rating.sideB;

    // Outcome
    let outcome: OutcomeKind;
    if (rating.overallPreference === "Tie") {
      outcome = "tie";
      ties++;
    } else if (rating.overallPreference === key.shaped) {
      outcome = "shaped_win";
      shapedWins++;
    } else {
      outcome = "baseline_win";
      baselineWins++;
    }

    if (key.shapingFired) {
      positiveScenarioCount++;
      if (outcome === "shaped_win") {
        shapedWinsOnPositive++;
      }
    }

    // Accumulate dimension totals
    for (const dim of dimensionKeys) {
      shapedTotals[dim] += shapedDimensions[dim];
      baselineTotals[dim] += baselineDimensions[dim];
    }

    const redFlags = detectRedFlags(
      outcome,
      key.shapingFired,
      shapedDimensions,
      baselineDimensions,
      rating.scenarioId,
    );

    scenarios.push({
      scenarioId: rating.scenarioId,
      overallPreference: rating.overallPreference,
      outcome,
      shapingFired: key.shapingFired,
      shapedSide: key.shaped,
      baselineSide: key.baseline,
      shapedDimensions,
      baselineDimensions,
      redFlags,
    });
  }

  const count = ratings.length;
  const dimensions: Record<keyof DimensionRatings, DimensionSummary> = {} as any;

  for (const dim of dimensionKeys) {
    const shapedAvg = count > 0 ? Math.round((shapedTotals[dim] / count) * 100) / 100 : 0;
    const baselineAvg = count > 0 ? Math.round((baselineTotals[dim] / count) * 100) / 100 : 0;
    dimensions[dim] = {
      shapedAvg,
      baselineAvg,
      delta: Math.round((shapedAvg - baselineAvg) * 100) / 100,
    };
  }

  const allRedFlags = scenarios.flatMap((s) => s.redFlags);

  return {
    totalScenarios: count,
    shapedWins,
    baselineWins,
    ties,
    positiveScenarioCount,
    shapedWinsOnPositive,
    dimensions,
    scenarios,
    allRedFlags,
  };
}

// ─── Decision report renderer ─────────────────────────────────────────────────

function deltaLabel(delta: number): string {
  if (delta > 0.4) return "▲▲ Shaped better";
  if (delta > 0)   return "▲  Shaped better";
  if (delta === 0)  return "=  Equal";
  if (delta > -0.4) return "▼  Baseline better";
  return "▼▼ Baseline better";
}

export function renderDecisionReport(summary: IngestionSummary): string {
  const lines: string[] = [];

  lines.push("# Pack 3.0 — Reviewer Ingestion Decision Report");
  lines.push("");
  lines.push("*Generated by runT26ReviewIngestion.ts — do not share before review is complete.*");
  lines.push("");

  // ── Overall verdict ──────────────────────────────────────────────────────
  lines.push("## Overall Verdict");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Total scenarios rated | ${summary.totalScenarios} |`);
  lines.push(`| Shaped wins | ${summary.shapedWins} |`);
  lines.push(`| Baseline wins | ${summary.baselineWins} |`);
  lines.push(`| Ties | ${summary.ties} |`);
  lines.push(`| Positive scenarios (shaping fired) | ${summary.positiveScenarioCount} |`);
  lines.push(`| Shaped wins on positive scenarios | ${summary.shapedWinsOnPositive} |`);
  lines.push("");

  const shapedRatio = summary.positiveScenarioCount > 0
    ? `${summary.shapedWinsOnPositive}/${summary.positiveScenarioCount}`
    : "N/A";

  const verdict =
    summary.shapedWins > summary.baselineWins && summary.allRedFlags.filter(f => f.includes("RED_FLAG")).length === 0
      ? "✅ SHAPED IS PREFERRED — no critical red flags detected"
      : summary.shapedWins > summary.baselineWins && summary.allRedFlags.filter(f => f.includes("RED_FLAG")).length > 0
      ? "⚠️  SHAPED IS PREFERRED BUT RED FLAGS PRESENT — review required"
      : summary.baselineWins > summary.shapedWins
      ? "❌ BASELINE PREFERRED — shaping is not helping"
      : "➡️  INCONCLUSIVE — mixed signals";

  lines.push(`**Decision verdict:** ${verdict}`);
  lines.push(`**Shaped wins on fire-positive scenarios:** ${shapedRatio}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Dimension summary ────────────────────────────────────────────────────
  lines.push("## Dimension Averages (Shaped vs Baseline)");
  lines.push("");
  lines.push("| Dimension | Shaped Avg | Baseline Avg | Delta | Assessment |");
  lines.push("|---|---|---|---|---|");

  const dimLabels: Record<keyof DimensionRatings, string> = {
    directness: "Directness",
    usefulness: "Usefulness",
    loopBreaking: "Loop-Breaking",
    voiceIntegrity: "Voice Integrity",
    overAggression: "Over-Aggression (lower = better)",
    weirdnessMismatch: "Weirdness/Mismatch (lower = better)",
  };

  for (const [dim, label] of Object.entries(dimLabels) as Array<[keyof DimensionRatings, string]>) {
    const d = summary.dimensions[dim];
    lines.push(`| ${label} | ${d.shapedAvg} | ${d.baselineAvg} | ${d.delta > 0 ? "+" : ""}${d.delta} | ${deltaLabel(d.delta)} |`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Per-scenario breakdown ────────────────────────────────────────────────
  lines.push("## Per-Scenario Outcomes");
  lines.push("");

  for (const sc of summary.scenarios) {
    const icon =
      sc.outcome === "shaped_win" ? "✅" :
      sc.outcome === "baseline_win" ? "❌" : "➡️ ";

    lines.push(`### ${sc.scenarioId}`);
    lines.push(`**Outcome:** ${icon} ${sc.outcome.replace("_", " ")} (preference: ${sc.overallPreference})`);
    lines.push(`**Shaping fired:** ${sc.shapingFired ? "Yes" : "No"}`);
    lines.push("");
    lines.push("| Dimension | Shaped | Baseline |");
    lines.push("|---|---|---|");
    lines.push(`| Directness | ${sc.shapedDimensions.directness} | ${sc.baselineDimensions.directness} |`);
    lines.push(`| Usefulness | ${sc.shapedDimensions.usefulness} | ${sc.baselineDimensions.usefulness} |`);
    lines.push(`| Loop-Breaking | ${sc.shapedDimensions.loopBreaking} | ${sc.baselineDimensions.loopBreaking} |`);
    lines.push(`| Voice Integrity | ${sc.shapedDimensions.voiceIntegrity} | ${sc.baselineDimensions.voiceIntegrity} |`);
    lines.push(`| Over-Aggression | ${sc.shapedDimensions.overAggression} | ${sc.baselineDimensions.overAggression} |`);
    lines.push(`| Weirdness/Mismatch | ${sc.shapedDimensions.weirdnessMismatch} | ${sc.baselineDimensions.weirdnessMismatch} |`);

    if (sc.redFlags.length > 0) {
      lines.push("");
      for (const flag of sc.redFlags) {
        lines.push(`> ${flag}`);
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ── Red flag summary ──────────────────────────────────────────────────────
  lines.push("## Red Flag Summary");
  lines.push("");
  if (summary.allRedFlags.length === 0) {
    lines.push("No red flags detected.");
  } else {
    for (const flag of summary.allRedFlags) {
      lines.push(`- ${flag}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}
