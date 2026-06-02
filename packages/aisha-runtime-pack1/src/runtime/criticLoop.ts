import type {
  CriticFinding,
  CriticIssueType,
  CriticLoopResult,
  ICriticLoop,
  IGeneratorAdapter,
  MAX_CRITIC_CYCLES,
  ParsedOutput,
} from "./runtime_types";
import { MAX_CRITIC_CYCLES as CYCLE_CAP } from "./runtime_types";
import type {
  NoteRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  TurnRecord,
  IRetrievalPlanner,
  IContextBuilder,
} from "../memory/types";

//
// ─── DETERMINISTIC EVALUATION ────────────────────────────────────────────────
// evaluateText() is pure deterministic — no LLM, no I/O.
// It checks the parsed text against the retrieval bundle and snapshot.
//

const CERTAINTY_FLOOR = 0.4;
const TRUST_FLOOR = -0.2;

/**
 * Checks whether parsed.text surfaces a note that is contradicted by a
 * higher-support active note in the same track.
 *
 * A note is "surfaced" if its normalizedValue appears as a substring in the output text.
 * Track is defined by subtype + subjectKind (same as reactiveReconsolidation trackKey).
 */
function findMemoryContradictions(
  parsedText: string,
  activeNotes: NoteRecord[],
): CriticFinding[] {
  const findings: CriticFinding[] = [];

  // Build track → best-supported note map
  type TrackKey = string;
  const bestByTrack = new Map<TrackKey, NoteRecord>();
  for (const note of activeNotes) {
    const key = `${note.subtype}|${note.subjectKind}|${note.subjectSpeakerId ?? ""}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
    const existing = bestByTrack.get(key);
    if (!existing || note.sourceEpisodeIds.length > existing.sourceEpisodeIds.length ||
      (note.sourceEpisodeIds.length === existing.sourceEpisodeIds.length && note.confidence > existing.confidence)) {
      bestByTrack.set(key, note);
    }
  }

  for (const note of activeNotes) {
    if (!note.normalizedValue) continue;
    if (!parsedText.includes(note.normalizedValue)) continue;

    const key = `${note.subtype}|${note.subjectKind}|${note.subjectSpeakerId ?? ""}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
    const best = bestByTrack.get(key);

    if (best && best.id !== note.id && best.normalizedValue && best.normalizedValue !== note.normalizedValue) {
      findings.push({
        issueType: "memory_contradiction",
        affectedNoteId: note.id,
        reason: `Output surfaces "${note.normalizedValue}" (note ${note.id}) but higher-support note ${best.id} has value "${best.normalizedValue}"`,
      });
    }
  }

  return findings;
}

/**
 * Checks whether parsed.text contains token references to stale notes
 * (notes with reinferencePolicy.mode === "needs_review").
 *
 * The context builder renders stale notes as "[K_*|...|STALE]" — we detect
 * the |STALE marker in the output as a proxy for the note being referenced.
 * Also cross-checks normalizedValue substrings if STALE token not present.
 */
function findStaleNoteSurfaced(
  parsedText: string,
  activeNotes: NoteRecord[],
): CriticFinding[] {
  const findings: CriticFinding[] = [];

  for (const note of activeNotes) {
    if (note.reinferencePolicy.mode !== "needs_review") continue;

    const staleToken = `[${note.subtype}|`;
    const hasStaleInText = parsedText.includes(staleToken) && parsedText.includes("|STALE]");
    const hasValueInText = note.normalizedValue ? parsedText.includes(note.normalizedValue) : false;

    if (hasStaleInText || hasValueInText) {
      findings.push({
        issueType: "stale_note_surfaced",
        affectedNoteId: note.id,
        reason: `Output references stale/needs-review note ${note.id} ("${note.normalizedValue ?? note.canonicalText}")`,
      });
    }
  }

  return findings;
}

/**
 * Checks session-level certainty + trust thresholds.
 * Returns at most one finding per cycle (session-level).
 * Never triggers re-retrieval.
 */
function findThresholdCoherenceFailure(
  snapshot: StateSnapshotRecord,
): CriticFinding[] {
  const { certainty, trust } = snapshot.expressiveEnvelope;
  if (certainty < CERTAINTY_FLOOR && trust < TRUST_FLOOR) {
    return [{
      issueType: "threshold_coherence_failure",
      affectedNoteId: undefined,
      reason: `Session state below coherence floor: certainty=${certainty.toFixed(2)} trust=${trust.toFixed(2)}`,
    }];
  }
  return [];
}

// ─── Ungrounded claim constants ───────────────────────────────────────────────

/**
 * Minimum word count for a sentence to be evaluated for groundedness.
 * Short responses (greetings, acknowledgements) are excluded to prevent noise.
 */
const UNGROUNDED_MIN_TOKENS = 4;

/**
 * Patterns that signal a memory-referencing assertion.
 * The sentence must match at least one pattern before groundedness is checked.
 */
const MEMORY_ASSERTION_PATTERNS = [
  /\b(remember|recall|you mentioned|you said|you told me|as you said|based on what|from what you've|i know that you|you prefer|you like|you are|you were|your)\b/i,
];

/**
 * Normalises text for substring comparison: lowercase, collapse whitespace.
 */
function normaliseForGrounding(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Splits output text into candidate sentences for claim evaluation.
 * Splits on sentence-ending punctuation, filters to non-empty strings.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.?!]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Returns true if the sentence appears grounded by at least one note.
 * A sentence is grounded if the note's normalizedValue or canonicalText
 * appears as a substring in the normalised sentence text.
 */
function isSentenceGrounded(
  normSentence: string,
  activeNotes: NoteRecord[],
  contradictionEvidence: Array<NoteRecord | { canonicalText?: string; normalizedValue?: string }>,
): boolean {
  const allEvidence = [
    ...activeNotes,
    ...contradictionEvidence,
  ] as Array<{ canonicalText?: string; normalizedValue?: string }>;

  return allEvidence.some((e) => {
    if (e.normalizedValue && e.normalizedValue.length >= 3) {
      if (normSentence.includes(normaliseForGrounding(e.normalizedValue))) return true;
    }
    if (e.canonicalText && e.canonicalText.length >= 3) {
      if (normSentence.includes(normaliseForGrounding(e.canonicalText))) return true;
    }
    return false;
  });
}

/**
 * Pack 4.1: Detects memory-referencing assertions in the output that cannot
 * be traced to any note in the retrieval bundle (active or contradiction evidence).
 *
 * Grounding rules:
 * - Only evaluates sentences that match a MEMORY_ASSERTION_PATTERN.
 * - Only evaluates sentences with >= UNGROUNDED_MIN_TOKENS word tokens.
 * - A sentence is grounded if any active note's normalizedValue or canonicalText
 *   appears as a substring (case-insensitive) in the sentence.
 * - Returns at most one finding per sentence.
 * - `affectedNoteId` is undefined (session-level finding; does not trigger re-retrieval).
 */
function findUngroundedClaims(
  parsedText: string,
  retrieval: RetrievalBundle,
): CriticFinding[] {
  const findings: CriticFinding[] = [];
  const sentences = splitSentences(parsedText);
  const contradictionGroundingEvidence: Array<{
    canonicalText?: string;
    normalizedValue?: string;
  }> = retrieval.contradictionEvidence.map((e) => {
    if (e.kind === "note") {
      return {
        canonicalText: e.canonicalText,
        normalizedValue: e.normalizedValue,
      };
    }
    return { canonicalText: e.summary };
  });

  for (const sentence of sentences) {
    const tokens = sentence.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < UNGROUNDED_MIN_TOKENS) continue;

    const isAssertion = MEMORY_ASSERTION_PATTERNS.some((p) => p.test(sentence));
    if (!isAssertion) continue;

    const normSentence = normaliseForGrounding(sentence);
    if (!isSentenceGrounded(normSentence, retrieval.activeNotes, contradictionGroundingEvidence)) {
      findings.push({
        issueType: "ungrounded_claim",
        affectedNoteId: undefined,
        reason: `Sentence asserts memory-referenced fact with no grounding anchor in retrieval bundle: "${sentence.slice(0, 80)}${sentence.length > 80 ? "..." : ""}"`
      });
    }
  }

  return findings;
}

/**
 * Evaluates the parsed text against the retrieval bundle and snapshot.
 * Pure deterministic — no LLM, no I/O, no Date.now().
 */
function evaluateText(
  parsedText: string,
  retrieval: RetrievalBundle,
  snapshot: StateSnapshotRecord,
): CriticFinding[] {
  const findings: CriticFinding[] = [];

  try {
    findings.push(...findMemoryContradictions(parsedText, retrieval.activeNotes));
  } catch (err) {
    console.warn("[CRITIC] evaluateText memory_contradiction check threw:", err);
  }

  try {
    findings.push(...findStaleNoteSurfaced(parsedText, retrieval.activeNotes));
  } catch (err) {
    console.warn("[CRITIC] evaluateText stale_note_surfaced check threw:", err);
  }

  try {
    findings.push(...findThresholdCoherenceFailure(snapshot));
  } catch (err) {
    console.warn("[CRITIC] evaluateText threshold_coherence_failure check threw:", err);
  }

  // Pack 4.1: ungrounded_claim detection
  try {
    findings.push(...findUngroundedClaims(parsedText, retrieval));
  } catch (err) {
    console.warn("[CRITIC] evaluateText ungrounded_claim check threw:", err);
  }

  return findings;
}

/**
 * Returns the note IDs implicated by a set of findings that warrant re-retrieval.
 * threshold_coherence_failure and ungrounded_claim do NOT trigger re-retrieval.
 * ungrounded_claim has no affectedNoteId — it is a session-level finding only.
 */
function findingsRequiringReRetrieval(findings: CriticFinding[]): string[] {
  const ids: string[] = [];
  for (const f of findings) {
    if (
      f.affectedNoteId &&
      (f.issueType === "memory_contradiction" || f.issueType === "stale_note_surfaced")
    ) {
      ids.push(f.affectedNoteId);
    }
    // ungrounded_claim: explicitly excluded — no note ID, no re-retrieval
  }
  return ids;
}

//
// ─── BOUNDED CRITIC LOOP ─────────────────────────────────────────────────────
//

export interface BoundedCriticLoopDeps {
  retrievalPlanner: IRetrievalPlanner;
  generator: IGeneratorAdapter;
  contextBuilder: IContextBuilder;
}

/**
 * Concrete implementation of ICriticLoop.
 *
 * Lifecycle per turn:
 *  1. evaluateText (deterministic) on the initial parsed output
 *  2. If clean: return immediately (cycleCount=0)
 *  3. If findings need re-retrieval: buildTargeted → regenerate → re-evaluate
 *  4. Repeat up to CYCLE_CAP (2) times total
 *  5. If CYCLE_CAP hit with findings: commit last generated text, record maxCyclesHit=true
 *
 * Risk gates:
 * - evaluateText throws → caught per-type, treated as zero findings for that category
 * - regeneration throws → abort remaining cycles, commit current text
 * - buildTargeted returns unchanged bundle → skip regen for that cycle
 * - Runs only when injected into ProcessTurnDeps.criticLoop; default is absent (no-op)
 */
export class BoundedCriticLoop implements ICriticLoop {
  constructor(private readonly deps: BoundedCriticLoopDeps) {}

  async run(input: {
    turn: TurnRecord;
    snapshot: StateSnapshotRecord;
    retrieval: RetrievalBundle;
    initialParsed: ParsedOutput;
  }): Promise<CriticLoopResult> {
    const allFindings: CriticFinding[] = [];
    let currentText = input.initialParsed.text;
    let currentRetrieval = input.retrieval;
    let cycleCount = 0;
    let maxCyclesHit = false;
    let didReRetrieve = false;

    for (let cycle = 0; cycle < CYCLE_CAP; cycle++) {
      const findings = evaluateText(currentText, currentRetrieval, input.snapshot);

      if (findings.length === 0) {
        // Clean pass — exit immediately
        break;
      }

      // Accumulate findings from this cycle
      for (const f of findings) {
        if (!allFindings.some((existing) => existing.affectedNoteId === f.affectedNoteId && existing.issueType === f.issueType)) {
          allFindings.push(f);
        }
      }

      cycleCount++;

      if (cycle === CYCLE_CAP - 1) {
        // Last allowed cycle — cannot iterate further
        maxCyclesHit = true;
        break;
      }

      // Try targeted re-retrieval for note-specific findings
      const reRetrievalNoteIds = findingsRequiringReRetrieval(findings);

      if (reRetrievalNoteIds.length > 0) {
        const targetedBundle = await this.deps.retrievalPlanner.buildTargeted({
          sessionId: input.turn.sessionId,
          currentTurn: input.turn,
          baseBundle: currentRetrieval,
          targetNoteIds: reRetrievalNoteIds,
        });

        if (targetedBundle === currentRetrieval) {
          // No progress — bundle unchanged, skip regen for this cycle
          console.log("[CRITIC] buildTargeted returned unchanged bundle; aborting re-retrieval for this cycle");
          break;
        }

        didReRetrieve = true;
        currentRetrieval = targetedBundle;

        // Regenerate with the updated retrieval bundle and a fresh memory context
        try {
          const regenMemoryContext = this.deps.contextBuilder.build(currentRetrieval);
          const regenOutput = await this.deps.generator.generate({
            sessionId: input.turn.sessionId,
            turn: input.turn,
            snapshot: input.snapshot,
            retrieval: currentRetrieval,
            memoryContext: regenMemoryContext,
          });
          currentText = regenOutput.text ?? currentText;
        } catch (regenErr) {
          console.error("[CRITIC] regeneration threw during critic cycle; aborting remaining cycles:", regenErr);
          break;
        }
      } else {
        // Only session-level findings (e.g. threshold_coherence_failure) — no re-retrieval needed
        break;
      }
    }

    return {
      cycleCount,
      maxCyclesHit,
      findings: allFindings,
      didReRetrieve,
      finalText: currentText,
    };
  }
}
