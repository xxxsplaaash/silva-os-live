import {
  EpisodeRecord,
  HeuristicGateDecision,
  INoteExtractionSandbox,
  NoteCandidate,
  TurnRecord,
} from "./types";

function normalizeValue(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanExtractedValue(text: string): string {
  return text
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\b(now|these days|lately|currently)\b$/i, "")
    .trim();
}

function dedupeCandidates(candidates: NoteCandidate[]): NoteCandidate[] {
  const seen = new Set<string>();
  const result: NoteCandidate[] = [];

  for (const candidate of candidates) {
    const key = [
      candidate.subtype,
      candidate.subjectKind,
      candidate.subjectSpeakerId ?? "",
      candidate.subjectPersonId ?? "",
      candidate.relationshipContextPersonId ?? "",
      normalizeValue(candidate.normalizedValue ?? candidate.canonicalText),
    ].join("|");

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

function isEphemeralChatter(text: string): boolean {
  const normalized = normalizeValue(text);
  return /^(ok|okay|cool|lol|haha|sure|nice|yep|yup|alright|sounds good|thanks|thank you|okay cool thanks)$/.test(
    normalized,
  );
}

function hasStrongPreferenceSignal(text: string): boolean {
  if (isUtteranceHistoryChallenge(text)) return false;
  return /\b(?:i like|i love|i prefer|i only drink|i always drink|i never drink|i hate|i don't like|i do not like|my [a-z0-9 _-]{2,80} preference is|my [a-z0-9 _-]{2,80} style is|my [a-z0-9 _-]{2,80} aesthetic is)\b/i.test(
    text,
  );
}

/**
 * Implied preference: behavioral/habitual patterns that reliably signal a stable
 * durable preference without being a direct opinion statement.
 * Used in the heuristic gate and as an extraction gate — async lane only.
 */
function hasImpliedPreferenceSignal(text: string): boolean {
  return /\b(?:my go-to|go-to is|go for|i usually get|i typically get|i typically have|i usually have|i always get|i tend to order|i tend to get|i always order|i start my day with|my usual is|i always start with|i avoid|i stay away from|i gave up|i cut out|doesn't agree with me|doesn't work for me)\b/i.test(
    text,
  );
}

function hasStrongProfileSignal(text: string): boolean {
  if (isUtteranceHistoryChallenge(text)) return false;
  return /\b(?:i am|i'm|i usually|i tend to|i always|i never)\b/i.test(text);
}

function isUtteranceHistoryChallenge(text: string): boolean {
  return /\b(?:i\s+(?:never|didn't|did not)\s+(?:say|said|claim|claimed|tell|told)|did\s+i\s+(?:ever\s+)?(?:say|claim|tell)|what\s+did\s+i\s+(?:say|claim|tell)\s+before|you\s+(?:said|claimed|told\s+me)\s+(?:i\s+(?:said|claimed|told|prefer|like|love|hate)|my\s+[a-z0-9 _-]{2,80}\s+(?:preference|style|aesthetic)\s+is))\b/i.test(
    text,
  );
}

function looksPreferenceLike(text: string): boolean {
  return /\b(?:drink|eat|coffee|latte|tea|food|music|movie|movies|dashboard|landing page|homepage|website|brand|design|style|aesthetic|colour|color|accent|prefer|preference|like|love|hate)\b/i.test(
    text,
  );
}

/**
 * Clean extracted values from behavioral pattern captures.
 * More aggressive than cleanExtractedValue: also strips leading articles and
 * trailing hedges like "sometimes"/"usually".
 */
function cleanBehavioralValue(text: string): string {
  return text
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/^(?:a |an |the )/i, "")
    .replace(/\b(now|these days|lately|currently|sometimes|usually|typically|generally|often)\b$/i, "")
    .trim();
}

/**
 * Deterministic Pack 1 extraction sandbox:
 * - heuristic gate only
 * - restricted to K_pref / K_profile
 * - no open-ended personality mining
 * - no reflective/reconsolidation logic
 *
 * Base-user notes are emitted as global user notes:
 * - subjectKind = "user"
 * - no subjectSpeakerId
 * - no subjectPersonId
 * - no relationshipContextPersonId
 */
export class SimpleNoteExtractionSandbox implements INoteExtractionSandbox {
  heuristicGate(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): HeuristicGateDecision {
    const userTurns = turns.filter((t) => t.speaker === "user");
    const texts = userTurns.map((t) => t.rawText.trim());

    const reasons: string[] = [];

    if (userTurns.length === 0) {
      return {
        pass: false,
        reasons: ["no_user_turns"],
      };
    }

    const ephemeralOnly = texts.every(isEphemeralChatter);
    if (ephemeralOnly) {
      return {
        pass: false,
        reasons: ["ephemeral_chatter_only"],
      };
    }

    const hasPreference = texts.some(hasStrongPreferenceSignal);
    const hasProfile = texts.some(hasStrongProfileSignal);
    const hasImplied = texts.some(hasImpliedPreferenceSignal);
    // K_boundary signals also pass the gate
    const hasBoundary = texts.some((t) =>
      /\b(?:I don't want to talk about|let's change the subject|drop the subject|don't bring it up|never mind about|no more about)\b/i.test(t),
    );

    if (hasPreference) reasons.push("strong_preference_signal");
    if (hasProfile) reasons.push("strong_profile_signal");
    if (hasImplied) reasons.push("implied_preference_signal");
    if (hasBoundary) reasons.push("boundary_signal");
    if (episode.turnIds.length > 0) reasons.push("episode_present");

    const pass = hasPreference || hasProfile || hasImplied || hasBoundary;
    if (!pass) reasons.push("no_promotable_signal");

    return {
      pass,
      reasons,
    };
  }

  async extract(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): Promise<NoteCandidate[]> {
    const userTurns = turns.filter((t) => t.speaker === "user");
    const candidates: NoteCandidate[] = [];

    for (const turn of userTurns) {
      // Split turn into basic sentences to allow multiple independent matches
      // across different parts of a compound turn.
      const sentences = turn.rawText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const text of sentences) {
        if (isUtteranceHistoryChallenge(text)) {
          continue;
        }

        // ── Pack 2.6: Deterministic hedge / temporality post-filter ───────────
        // These flags are evaluated per-sentence and used to penalise confidence.
        // Aspiration/intention receives the largest penalty (−0.40) to ensure
        // these signals cannot reach the 0.65 promotion threshold on a cold start.
        const isTemporary = /\b(right now|just for now|at the moment|for now)\b/i.test(text);
        const isConditional = /\b(if |in case|unless|depending on|when it rains)\b/i.test(text);
        const isAmbivalent = /\b(might|maybe|probably|perhaps|guess|suppose)\b/i.test(text);
        const isAspiration = /\b(want to|hope to|planning to|going to|trying to|wish I|plan to|someday|eventually|tomorrow)\b/i.test(text);

        const hedgePenalty = (base: number): number => {
          let c = base;
          if (isAspiration) c -= 0.40; // heaviest: never reaches 0.65 alone
          if (isTemporary)  c -= 0.35;
          if (isConditional) c -= 0.30;
          if (isAmbivalent) c -= 0.25;
          return Math.max(0.10, Math.round(c * 100) / 100);
        };

        // ── Group K_boundary: Explicit user restriction ───────────────────────
        // These are safety signals. They must be active immediately (not provisional)
        // because they gate what AISHA is permitted to discuss.
        const boundaryMatch = text.match(
          /\b(?:I don't want to talk about|let's change the subject|drop the subject|don't bring it up|never mind about|no more about)\s+(.+?)(?:[.!?]|$)/i,
        );
        if (boundaryMatch) {
          const cleaned = cleanExtractedValue(boundaryMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_boundary",
              canonicalText: `User boundary: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: 0.90,
              extractionConfidenceRaw: 0.90,
              // K_boundary: status not set here — versioning will force "active" for K_boundary
              provenanceChain: ["heuristic_boundary_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_boundary_pattern",
            } as NoteCandidate);
            continue;
          }
        }

        // ── Group A0: Explicit slot preference ───────────────────────────────
        // Example: "My dashboard preference is obsidian with one red accent."
        // This is a direct stable preference, not an inferred behavior, so it can
        // become active immediately and uses a colon-normalized slot for safe
        // supersession when the same slot changes later.
        const slotPrefMatch = text.match(
          /\bmy\s+([a-z0-9 _-]{2,80}?)\s+preference\s+is\s+(.+?)(?:[.!?]|$)/i,
        );
        if (slotPrefMatch) {
          const slot = cleanBehavioralValue(slotPrefMatch[1]).toLowerCase();
          const cleaned = cleanExtractedValue(slotPrefMatch[2]);
          if (slot.length > 0 && cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User ${slot} preference: ${cleaned}`,
              normalizedValue: normalizeValue(`${slot} preference: ${cleaned}`),
              confidence: hedgePenalty(0.88),
              extractionConfidenceRaw: 0.88,
              status: "active",
              provenanceChain: ["heuristic_slot_preference_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_slot_preference_pattern",
            });
            continue;
          }
        }

        // ── Group A0b: Explicit slot style / aesthetic ──────────────────────
        // Example: "My landing page style is black glass with a single red pulse."
        // This is the same durable slot-mutation shape as a preference, but the
        // user naturally names visual taste as "style" or "aesthetic".
        const slotStyleMatch = text.match(
          /\bmy\s+([a-z0-9 _-]{2,80}?)\s+(style|aesthetic)\s+is\s+(.+?)(?:[.!?]|$)/i,
        );
        if (slotStyleMatch) {
          const slot = cleanBehavioralValue(slotStyleMatch[1]).toLowerCase();
          const slotKind = slotStyleMatch[2].toLowerCase();
          const cleaned = cleanExtractedValue(slotStyleMatch[3]);
          if (slot.length > 0 && cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User ${slot} ${slotKind}: ${cleaned}`,
              normalizedValue: normalizeValue(`${slot} ${slotKind}: ${cleaned}`),
              confidence: hedgePenalty(0.86),
              extractionConfidenceRaw: 0.86,
              status: "active",
              provenanceChain: ["heuristic_slot_style_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_slot_style_pattern",
            });
            continue;
          }
        }

        // ── Group A: Explicit preference ──────────────────────────────────────
        const prefMatch = text.match(
          /\b(?:I like|I love|I prefer|I only drink|I always drink|I never drink|I hate|I don't like|I do not like)\s+(.+?)(?:[.!?]|$)/i,
        );

        if (prefMatch) {
          const cleaned = cleanExtractedValue(prefMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.78),
              extractionConfidenceRaw: 0.78,
              status: "provisional",
              provenanceChain: ["heuristic_preference_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_preference_pattern",
            });
            continue; // Skip further matches for this specific sentence
          }
        }

        // ── Group B: Behavioral / habitual implied preference ────────────────
        // Lower confidence (0.72) than explicit — implied, not directly stated.
        const behavioralMatch = text.match(
          /\b(?:my go-to is|go-to is|i usually get|i typically get|i typically have|i usually have|i always get|i always order|i tend to order|i tend to get|i always start with|i start my day with|my usual is)\s+(.+?)(?:[.!?]|$)/i,
        );

        if (behavioralMatch) {
          const cleaned = cleanBehavioralValue(behavioralMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.72),
              extractionConfidenceRaw: 0.72,
              status: "provisional",
              provenanceChain: ["heuristic_behavioral_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_behavioral_pattern",
            });
            continue;
          }
        }

        // ── Group C: Avoidance / negation implied preference ─────────────────
        // Slightly higher confidence (0.74) — avoidance is typically an explicit rejection.
        const avoidanceMatch = text.match(
          /\b(?:i avoid|i stay away from|i gave up|i cut out|i stopped having|i don't do)\s+(.+?)(?:[.!?]|$)/i,
        );

        if (avoidanceMatch) {
          const cleaned = cleanBehavioralValue(avoidanceMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: avoids ${cleaned}`,
              normalizedValue: normalizeValue(`avoids ${cleaned}`),
              confidence: hedgePenalty(0.74),
              extractionConfidenceRaw: 0.74,
              status: "provisional",
              provenanceChain: ["heuristic_avoidance_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_avoidance_pattern",
            });
            continue;
          }
        }

        // ── Group D: Behavior-described preference ────────────────────────────
        // Weakest signal (0.70) — indirect inference from go-for/ordering behavior.
        const behaviorDescMatch = text.match(
          /\b(?:i(?:'ll)? go for|i(?:'ll)? have|i(?:'ll)? get)\s+(.+?)(?:\s+every time|[.!?]|$)/i,
        );

        if (behaviorDescMatch) {
          const cleaned = cleanBehavioralValue(behaviorDescMatch[1]);
          // Must be preference-domain content (food/drink/media) to avoid noise
          if (cleaned.length > 0 && looksPreferenceLike(cleaned)) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.70),
              extractionConfidenceRaw: 0.70,
              status: "provisional",
              provenanceChain: ["heuristic_behavior_described_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_behavior_described_pattern",
            });
            continue;
          }
        }

        // ── Group E: General profile / trait preference ───────────────────────
        const profileMatch = text.match(
          /\b(?:I am|I'm|I usually|I tend to|I always|I never)\s+(.+?)(?:[.!?]|$)/i,
        );

        if (profileMatch) {
          const cleaned = cleanExtractedValue(profileMatch[1]);
          if (cleaned.length > 0 && !looksPreferenceLike(cleaned)) {
            candidates.push({
              subtype: "K_profile",
              canonicalText: `User profile: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.7),
              extractionConfidenceRaw: 0.7,
              status: "provisional",
              provenanceChain: ["heuristic_profile_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_profile_pattern",
            });
            continue;
          }
        }
      }
    }

    return dedupeCandidates(candidates);
  }
}

export interface LlmExtractionDeps {
  generate: (prompt: string) => Promise<string>;
}

/**
 * T6: LLM Note Extractor
 * Provides high-fidelity semantic extraction bounded by the prompt.
 * Bypasses heuristic checks internally, relying on an external gate.
 */
export class LlmNoteExtractionSandbox implements INoteExtractionSandbox {
  constructor(private readonly deps: LlmExtractionDeps) {}

  heuristicGate(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): HeuristicGateDecision {
    // Rely completely on external gating.
    return { pass: true, reasons: ["llm_sandbox_pass_through"] };
  }

  async extract(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): Promise<NoteCandidate[]> {
    const userTurns = turns.filter((t) => t.speaker === "user");
    if (userTurns.length === 0) return [];

    const dialogue = turns
      .map((t) => `${t.speaker.toUpperCase()}: ${t.rawText}`)
      .join("\n");

    const prompt = `You are a memory extractor.
Analyze the following dialogue and extract stable semantic note candidates about the user's preferences (K_pref) or profile (K_profile).
Do not extract open-ended personality traits or speculative conclusions. Restrict extraction to explicitly stated preferences or routines.

Return strict JSON in this exact format:
{
  "candidates": [
    {
      "subtype": "K_pref" | "K_profile",
      "canonicalText": "User preference/profile: <fact>",
      "normalizedValue": "<fact>",
      "confidence": <float from 0.0 to 1.0>,
      "provenanceReason": "<brief explanation>"
    }
  ]
}

Dialogue:
${dialogue}`;

    try {
      const responseText = await this.deps.generate(prompt);

      let parsed;
      try {
        const jsonStart = responseText.indexOf("{");
        const jsonEnd = responseText.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd >= 0) {
          parsed = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
        } else {
          parsed = JSON.parse(responseText);
        }
      } catch {
        return [];
      }

      if (!parsed || !Array.isArray(parsed.candidates)) return [];

      const candidates: NoteCandidate[] = [];
      for (const item of parsed.candidates) {
        if (!["K_pref", "K_profile"].includes(item.subtype)) continue;
        if (!item.canonicalText) continue;

        const parsedConfidence = Math.max(0, Math.min(1, item.confidence || 0.72));
        candidates.push({
          subtype: item.subtype as "K_pref" | "K_profile",
          canonicalText: item.canonicalText,
          normalizedValue: item.normalizedValue || normalizeValue(item.canonicalText),
          confidence: parsedConfidence,
          extractionConfidenceRaw: parsedConfidence,
          provenanceChain: [item.provenanceReason || "llm_constrained_v1"],
          subjectKind: "user",
          sourceEpisodeIds: [episode.id],
          provenanceReason: item.provenanceReason || "llm_constrained_v1",
        });
      }

      return dedupeCandidates(candidates);
    } catch (error) {
      console.warn("[EXTRACTION] LLM extraction failed:", error);
      return [];
    }
  }
}

/**
 * T6: Two-Stage Gate
 * Fuses the fast deterministic heuristic gate with the high-fidelity LLM extractor.
 * Strictly adheres to Speed Doctrine: hot path gate must be cheap.
 */
export class TwoStageExtractionSandbox implements INoteExtractionSandbox {
  constructor(
    private readonly heuristicGateSandbox: INoteExtractionSandbox,
    private readonly llmSandbox: INoteExtractionSandbox,
  ) {}

  heuristicGate(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): HeuristicGateDecision {
    return this.heuristicGateSandbox.heuristicGate(episode, turns);
  }

  async extract(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): Promise<NoteCandidate[]> {
    // Note: Re-checks the heuristic gate even though async followup typically gates before calling extract().
    // This redundancy is intentionally preserved as a defensive layer because the evaluation is extremely cheap.
    const gate = this.heuristicGateSandbox.heuristicGate(episode, turns);
    // If the fast heuristic gate does not pass, avoid the LLM call entirely.
    if (!gate.pass) return [];

    return this.llmSandbox.extract(episode, turns);
  }
}
