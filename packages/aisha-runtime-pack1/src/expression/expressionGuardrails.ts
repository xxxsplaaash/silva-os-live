import type { ResponseShapingBlock } from "./semanticStateTranslator";
import type { ResponseIntentDecision } from "../runtime/responseIntentArbitrator";

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]?/g) ?? [];
  return matches.map((s) => normalizeWhitespace(s)).filter(Boolean);
}

function joinSentences(sentences: string[]): string {
  return normalizeWhitespace(sentences.join(" "));
}

function keepOnlyFirstQuestionSentence(sentences: string[]): string[] {
  const result: string[] = [];
  let seenQuestion = false;

  for (const sentence of sentences) {
    const isQuestion = sentence.includes("?");

    if (!isQuestion) {
      result.push(sentence);
      continue;
    }

    if (!seenQuestion) {
      result.push(sentence);
      seenQuestion = true;
    }
  }

  return result;
}

function capWordCount(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

function stripStubPrefix(sentence: string): string {
  return sentence.replace(/^Stub response to:\s*/i, "").trim();
}

function softenWarmSentence(sentence: string): string {
  return normalizeWhitespace(
    sentence
      .replace(/!+/g, ".")
      .replace(/\b(absolutely|totally|so excited|super excited)\b/gi, "")
      .replace(/\s+/g, " "),
  );
}

function chooseConciseSentence(sentences: string[]): string {
  return (
    sentences.find((sentence) => sentence.includes("Next step:")) ??
    sentences.find((sentence) => sentence.includes("Here's the direct answer.")) ??
    sentences[0] ??
    ""
  );
}

/**
 * Minimal deterministic anti-drift guardrails.
 *
 * Important:
 * - constrain wording only where needed
 * - do not replace already-correct intent behavior
 * - preserve question-forward follow-up behavior
 * - preserve concise-mode "Next step:" behavior
 */
export function applyExpressionGuardrails(input: {
  bodyText: string;
  shaping: ResponseShapingBlock;
  intentDecision: ResponseIntentDecision;
}): string {
  const { shaping, intentDecision } = input;

  let sentences = splitSentences(input.bodyText);

  if (intentDecision.intent === "question_forward") {
    sentences = keepOnlyFirstQuestionSentence(sentences);
    return joinSentences(sentences);
  }

  if (
    intentDecision.intent === "clarify" ||
    intentDecision.intent === "narrow_claim"
  ) {
    sentences = sentences.slice(0, 2);
  }

  if (shaping.warmth === "warm") {
    sentences = sentences
      .map((sentence, index) => {
        const nextSentence = index > 0 ? stripStubPrefix(sentence) : sentence;
        return softenWarmSentence(nextSentence);
      })
      .filter(Boolean);
  }

  let text = joinSentences(sentences);

  if (shaping.brevity === "concise" || intentDecision.intent === "minimal") {
    const conciseSentence = chooseConciseSentence(splitSentences(text));
    return normalizeWhitespace(capWordCount(conciseSentence, 10));
  }

  return text;
}

