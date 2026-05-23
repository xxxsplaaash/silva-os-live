import {
  EpisodeBoundaryDecision,
  EpisodeBoundaryInput,
  IEpisodeBoundaryDetector,
} from "./types";

const STOPWORDS = new Set(["a","an","and","are","as","at","be","but","by","for","from","i","in","is","it","me","my","of","on","or","that","the","this","to","we","you"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function uniqueTokens(texts: string[]): Set<string> {
  return new Set(texts.flatMap(tokenize));
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return 1 - intersection / union.size;
}

function computeTopicShiftScore(input: EpisodeBoundaryInput): number {
  const priorTexts = input.recentTurns.slice(-4).map((t) => t.rawText);
  const currentText = input.currentTurn.rawText;
  return jaccardDistance(uniqueTokens(priorTexts), uniqueTokens([currentText]));
}

function computeSurpriseDiscontinuityScore(input: EpisodeBoundaryInput): number {
  if (!input.previousSnapshot) return 0;
  const prev = input.previousSnapshot.expressiveEnvelope;
  const curr = input.currentSnapshot.expressiveEnvelope;
  return Math.max(
    Math.abs(curr.tension - prev.tension),
    Math.abs(curr.trust - prev.trust),
    Math.abs(curr.valence - prev.valence),
    Math.abs(curr.load - prev.load),
  );
}

export class DeterministicEpisodeBoundaryDetector implements IEpisodeBoundaryDetector {
  constructor(
    private readonly topicShiftThreshold = 0.72,
    private readonly surpriseThreshold = 0.35,
  ) {}

  decide(input: EpisodeBoundaryInput): EpisodeBoundaryDecision {
    const topicShiftScore = computeTopicShiftScore(input);
    const surpriseScore = computeSurpriseDiscontinuityScore(input);

    const topicShift = topicShiftScore >= this.topicShiftThreshold;
    const surpriseDiscontinuity = surpriseScore >= this.surpriseThreshold;
    const split = topicShift || surpriseDiscontinuity;
    const score = Math.max(topicShiftScore, surpriseScore);

    const reasons: string[] = [];
    if (topicShift) reasons.push(`topic_shift:${topicShiftScore.toFixed(2)}`);
    if (surpriseDiscontinuity) reasons.push(`surprise_discontinuity:${surpriseScore.toFixed(2)}`);
    if (!split) reasons.push("append_to_active_episode");

    return { split, topicShift, surpriseDiscontinuity, score, reasons };
  }
}
