/**
 * T25 Blind A/B Review Generator — Pack 2.9
 *
 * PROTOTYPE GRADE.
 *
 * Purpose:
 *   Produce blinded A/B review artifacts from T24 scenario results.
 *   A human reviewer scores each pair without knowing which side is
 *   baseline (unshaped) and which is shaped (K_position active).
 *   A separate answer key preserves the ground truth.
 *
 * Blinding rules:
 *   - Side assignment (A=baseline or A=shaped) is deterministic per scenario ID.
 *   - The review packet contains only the prompt context, outputs A and B, and
 *     the rating rubric. No mechanism names, no ablation data, no shaping labels.
 *   - The answer key maps scenario ID → { A: "baseline"|"shaped", shapingFired: boolean }.
 *
 * Deterministic ordering:
 *   Uses a simple hash of the scenario ID to assign A/B sides reproducibly.
 *   Same inputs always produce the same blinded packet — no randomness.
 */

import { SCENARIOS, runComparison, ScenarioResult } from "./t24KPositionDemoEval";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlindedPair {
  scenarioId: string;
  /** Human-readable context shown to the reviewer. */
  context: string;
  /** The final user message shown to the reviewer. */
  userMessage: string;
  /** Output assigned to side A. */
  textA: string;
  /** Output assigned to side B. */
  textB: string;
}

export interface AnswerKeyEntry {
  scenarioId: string;
  /** Which side is the baseline (unshaped) output. */
  baseline: "A" | "B";
  /** Which side is the shaped (K_position active) output. */
  shaped: "A" | "B";
  /** Whether K_position shaping visibly fired (ablation non-empty). */
  shapingFired: boolean;
  /** Adjustments applied, for post-review analysis only. */
  adjustmentsApplied: string[];
}

export interface BlindedPacket {
  pairs: BlindedPair[];
  answerKey: AnswerKeyEntry[];
}

// ─── Deterministic side assignment ───────────────────────────────────────────

/**
 * Deterministic hash of a string → integer.
 * Uses djb2-style accumulation. Stable across runs.
 */
function deterministicHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h;
}

/**
 * Returns true if baseline should be assigned to side A for this scenario.
 * Determined by lowest bit of hash of scenario ID — deterministic, not random.
 */
function baselineIsA(scenarioId: string): boolean {
  return (deterministicHash(scenarioId) & 1) === 0;
}

// ─── Packet builder ───────────────────────────────────────────────────────────

function stripCannedLeadIns(text: string): string {
  const canonical = [
    "Here's the direct answer.",
    "Tell me a bit more about that. What part matters most?",
    "Tell me a bit more about that.",
    "What part matters most?",
    "Glad to help.",
    "I may be wrong, but",
    "You're okay.",
    "Let's be careful.",
    "Can you clarify what changed most?",
    "Based on what you've said so far,",
    "Next step:",
    "Stub response to:"
  ];
  let stripped = text;
  for (const phrase of canonical) {
    stripped = stripped.split(phrase).join("");
  }
  return stripped.replace(/\s+/g, " ").trim();
}

function isReviewableDifference(textA: string, textB: string): boolean {
  if (textA === textB) return false;
  
  const coreA = stripCannedLeadIns(textA);
  const coreB = stripCannedLeadIns(textB);
  
  if (coreA === coreB && coreA !== "") {
    return false;
  }
  
  const wordsA = coreA.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = coreB.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (wordsA.length > 0 && wordsB.length > 0) {
    const intersection = wordsA.filter(w => wordsB.includes(w));
    const overlapResA = intersection.length / wordsA.length;
    const overlapResB = intersection.length / wordsB.length;
    if (overlapResA > 0.8 && overlapResB > 0.8) {
      return false;
    }
  }
  
  // If one is empty after stripping and the other is too? Wait, if they are different they pass.
  // One short appended question delta? (Already handled by canonical stripping).
  // Tiny wrapper text?
  return true;
}

export function buildBlindedPacket(results: ScenarioResult[]): BlindedPacket {
  const pairs: BlindedPair[] = [];
  const answerKey: AnswerKeyEntry[] = [];

  for (const result of results) {
    const isTextIdentical = result.baselineText.trim() === result.shapedText.trim();
    const isReviewable = isReviewableDifference(result.baselineText, result.shapedText);
    const scenario = SCENARIOS.find((s) => s.id === result.scenarioId)!;

    if (!isReviewable) {
      if (!scenario.isNegativeCase) {
        // Exclude active scenarios that lack meaningful reviewable text variation
        continue;
      }
    }

    const assignBaselineToA = baselineIsA(result.scenarioId);

    const textA = assignBaselineToA ? result.baselineText : result.shapedText;
    const textB = assignBaselineToA ? result.shapedText : result.baselineText;

    const contextDesc = (scenario.isNegativeCase && isTextIdentical) 
      ? "[CONTROL: Evaluator Calibration] " + result.description 
      : result.description;

    const lastTurn = scenario.turns[scenario.turns.length - 1];

    pairs.push({
      scenarioId: result.scenarioId,
      context: contextDesc,
      userMessage: lastTurn.rawText,
      textA,
      textB,
    });

    answerKey.push({
      scenarioId: result.scenarioId,
      baseline: assignBaselineToA ? "A" : "B",
      shaped: assignBaselineToA ? "B" : "A",
      shapingFired:
        (result.ablation?.adjustmentsApplied?.length ?? 0) > 0,
      adjustmentsApplied: result.ablation?.adjustmentsApplied ?? [],
    });
  }

  if (pairs.filter((p) => !p.context.includes("[CONTROL")).length < 3) {
    throw new Error(
      "FAIL HARD: Fewer than 3 genuinely reviewable scenarios with visible A/B differences exist.",
    );
  }

  return { pairs, answerKey };
}

// ─── Review packet renderer ───────────────────────────────────────────────────

const RUBRIC = `
## Rating Rubric

For each item, write a score (1–5) for both Response A and Response B:

| Dimension | Description | A | B |
|---|---|---|---|
| Directness | Does it lead with action rather than preamble? | | |
| Usefulness | Does it address the user's request? | | |
| Loop-Breaking | Would this response break a stuck, repetitive pattern? | | |
| Voice Integrity | Does it feel natural and appropriate for an AI assistant? | | |
| Over-Aggression | Is it too blunt/curt to the point of being unhelpful? (1=not at all, 5=very) | | |
| Weirdness/Mismatch | Does anything feel off-topic or out of register? (1=none, 5=very) | | |
| Overall Preference | Which response do you prefer overall? Circle: **A** / **B** / **Tie** | | |
`.trim();

const INTERNAL_TOKEN_PATTERN = /K_position|kPosition|communication_pace|detail_tolerance|task_structure_preference|baseline|shaped/g;

function sanitizeContextForReview(text: string): string {
  return text.replace(INTERNAL_TOKEN_PATTERN, "[system]");
}

export function renderReviewPacket(packet: BlindedPacket): string {
  const lines: string[] = [];

  lines.push("# A.I.S.H.A Pack 2.9 — Blind A/B Human Review Packet");
  lines.push("");
  lines.push("**Instructions:**");
  lines.push("- Read each scenario context and the user's message.");
  lines.push("- Score Response A and Response B using the rubric below each pair.");
  lines.push("- Do NOT consult any other files during rating — this packet is self-contained.");
  lines.push("- Return your completed ratings to the evaluation lead.");
  lines.push("");
  lines.push(RUBRIC);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < packet.pairs.length; i++) {
    const pair = packet.pairs[i];
    lines.push(`## Item ${i + 1}: ${pair.scenarioId}`);
    lines.push("");
    lines.push(`**Scenario context:** ${sanitizeContextForReview(pair.context)}`);
    lines.push("");
    lines.push(`**User message:** "${pair.userMessage}"`);
    lines.push("");
    lines.push("### Response A");
    lines.push("```");
    lines.push(pair.textA || "(empty)");
    lines.push("```");
    lines.push("");
    lines.push("### Response B");
    lines.push("```");
    lines.push(pair.textB || "(empty)");
    lines.push("```");
    lines.push("");
    lines.push("### Your Ratings");
    lines.push("");
    lines.push("| Dimension | A (1–5) | B (1–5) |");
    lines.push("|---|---|---|");
    lines.push("| Directness | | |");
    lines.push("| Usefulness | | |");
    lines.push("| Loop-Breaking | | |");
    lines.push("| Voice Integrity | | |");
    lines.push("| Over-Aggression | | |");
    lines.push("| Weirdness/Mismatch | | |");
    lines.push("");
    lines.push("**Overall preference:** A / B / Tie");
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Answer key renderer ──────────────────────────────────────────────────────

export function renderAnswerKey(packet: BlindedPacket): string {
  const lines: string[] = [];

  lines.push("# A.I.S.H.A Pack 2.9 — A/B Review Answer Key");
  lines.push("");
  lines.push("> **DO NOT SHARE** this file with the reviewer before they complete ratings.");
  lines.push("");
  lines.push("| Scenario | Baseline = | Shaped = | Shaping Fired? | Adjustments Applied |");
  lines.push("|---|---|---|---|---|");

  for (const entry of packet.answerKey) {
    lines.push(
      `| ${entry.scenarioId} | ${entry.baseline} | ${entry.shaped} | ${entry.shapingFired ? "Yes" : "No"} | ${entry.adjustmentsApplied.join(", ") || "(none)"} |`,
    );
  }

  lines.push("");
  lines.push("## Revealing Results");
  lines.push("");
  lines.push("After the reviewer returns scores, use this key to tally:");
  lines.push("- **Shaped preferred** = reviewer preferred the shaped side");
  lines.push("- **Baseline preferred** = reviewer preferred the baseline side");
  lines.push("- **Tie** = no meaningful difference detected");
  lines.push("");
  lines.push("A shaped-preferred result on a positive scenario and a tie/baseline result on the negative case");
  lines.push("constitutes evidence that K_position shaping produces real directional benefit.");

  return lines.join("\n");
}

// ─── Optional: result reader ──────────────────────────────────────────────────

export interface ReviewRating {
  scenarioId: string;
  /** Which side the reviewer preferred: A, B, or Tie. */
  overallPreference: "A" | "B" | "Tie";
}

export interface PreferenceSummary {
  shapedPreferred: number;
  baselinePreferred: number;
  ties: number;
  total: number;
  /** Scenarios where shaped was preferred. */
  shapedWins: string[];
  /** Scenarios where baseline was preferred. */
  baselineWins: string[];
}

export function summarizePreferences(
  ratings: ReviewRating[],
  answerKey: AnswerKeyEntry[],
): PreferenceSummary {
  let shapedPreferred = 0;
  let baselinePreferred = 0;
  let ties = 0;
  const shapedWins: string[] = [];
  const baselineWins: string[] = [];

  for (const rating of ratings) {
    const key = answerKey.find((k) => k.scenarioId === rating.scenarioId);
    if (!key) continue;

    if (rating.overallPreference === "Tie") {
      ties++;
    } else if (rating.overallPreference === key.shaped) {
      shapedPreferred++;
      shapedWins.push(rating.scenarioId);
    } else {
      baselinePreferred++;
      baselineWins.push(rating.scenarioId);
    }
  }

  return {
    shapedPreferred,
    baselinePreferred,
    ties,
    total: ratings.length,
    shapedWins,
    baselineWins,
  };
}
