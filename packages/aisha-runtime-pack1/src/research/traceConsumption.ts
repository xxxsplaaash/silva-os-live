/**
 * Pack 3.10 — Trace Consumption Research Prototype
 *
 * RESEARCH LANE ONLY. Not wired into any production hot-path.
 *
 * "Trace" here means structured historical evidence extracted from turn-level
 * logs (TurnRecord[]) and episode summaries (EpisodeRecord[]) that are already
 * persisted in the system — treated as read-only research artifacts.
 *
 * Design constraints:
 *  - Pure functions. No I/O, no store writes, no embeddings, no LLM calls.
 *  - No Date.now() — receive evalTimeMs as a parameter for determinism.
 *  - Must never be imported by any production runtime module.
 *  - Trace data is READ ONLY in this module; no side-effects to note store.
 *  - Outputs are machine-readable only (no LLM-as-judge).
 *
 * Separation guarantee:
 *  - This module only imports from ../memory/types (shared value types).
 *  - It does NOT import from ../research/associativeRetrieval so the two
 *    research lanes remain independently measurable.
 */

import type { NoteRecord, TurnRecord, EpisodeRecord } from "../memory/types";

// ─── Trace Record Types ───────────────────────────────────────────────────────

/**
 * A lightweight structured trace event extracted from a TurnRecord or
 * EpisodeRecord for use in the research pipeline.
 * Callers construct these; this module never reads from disk.
 */
export interface TraceEvent {
  /** Source turn or episode ID. */
  sourceId: string;
  /** Timestamp of the original event. */
  timestamp: string;
  /** Which session produced this event. */
  sessionId: string;
  /** The speaker role at the time. */
  speaker: "user" | "aisha" | "other" | "episode_boundary";
  /** Raw text evidence. */
  rawText: string;
  /** Optional structured labels: contradiction signals, preference mentions, etc. */
  labels?: TraceLabel[];
  /** Optional confidence of the labelling. */
  labelConfidence?: number;
}

export type TraceLabel =
  | "contradiction_signal"   // text contains explicit contradiction markers
  | "preference_assertion"   // text asserts a stable preference
  | "preference_negation"    // text retracts or negates a preference
  | "stale_note_context"     // text references something the system flagged as stale
  | "relationship_signal"    // text contains relationship context evidence
  | "boundary_event";        // episode boundary marker

/**
 * A labelled trace event matched against a specific note ID.
 * Used to assess whether trace evidence supports or contradicts a note.
 */
export interface TraceNoteMatch {
  traceEvent: TraceEvent;
  noteId: string;
  /** Direction of the match relative to the note's claim. */
  matchType: "supports" | "contradicts" | "ambiguous";
  /** Fraction of the note's normalized value found in the trace text (0–1). */
  textOverlapScore: number;
}

/**
 * Full result of one trace consumption pass for a note pool.
 */
export interface TraceConsumptionResult {
  /** Notes that have at least one supporting trace event. */
  traceSupported: NoteRecord[];
  /** Notes that have at least one contradicting trace event. */
  traceContradicted: NoteRecord[];
  /** Notes with no matching trace evidence. */
  traceOrphaned: NoteRecord[];
  /** All individual matches, sorted by textOverlapScore desc. */
  allMatches: TraceNoteMatch[];
  /** Raw event count consumed. */
  traceEventsConsumed: number;
}

// ─── Label Extraction ─────────────────────────────────────────────────────────

/**
 * Deterministic label extraction from a TurnRecord.
 * Applies lightweight regex heuristics — no LLM, no embeddings.
 * Returns the TraceEvent with any detected labels attached.
 */
export function extractTraceEvent(turn: TurnRecord): TraceEvent {
  const text = turn.rawText;
  const labels: TraceLabel[] = [];

  // Contradiction signals
  if (/\b(actually|not anymore|no longer|used to|stopped|instead|changed|i don't|i no longer)\b/i.test(text)) {
    labels.push("contradiction_signal");
  }

  // Preference assertion
  if (/\b(i like|i love|i prefer|i always|i usually|my go-to|i tend to)\b/i.test(text)) {
    labels.push("preference_assertion");
  }

  // Preference negation
  if (/\b(i don't like|i hate|i avoid|i stopped|i gave up|i cut out|i never)\b/i.test(text)) {
    labels.push("preference_negation");
  }

  // Stale note context
  if (/\b(used to|back then|previously|before|at the time|that was)\b/i.test(text)) {
    labels.push("stale_note_context");
  }

  // Relationship signal
  if (/\b(trust|feels safe|comfortable|not ready|awkward|close|distant)\b/i.test(text)) {
    labels.push("relationship_signal");
  }

  return {
    sourceId: turn.id,
    timestamp: turn.createdAt,
    sessionId: turn.sessionId,
    speaker: turn.speaker,
    rawText: text,
    labels: labels.length > 0 ? labels : undefined,
    labelConfidence: labels.length > 0 ? 0.72 : 0,
  };
}

/**
 * Construct a synthetic TraceEvent from an EpisodeRecord summary.
 * Used to incorporate episode-level evidence without re-reading all turns.
 */
export function extractEpisodeTraceEvent(episode: EpisodeRecord): TraceEvent | null {
  if (!episode.summary) return null;

  const labels: TraceLabel[] = ["boundary_event"];

  if (/contradict|conflict|inconsistent|changed/i.test(episode.summary)) {
    labels.push("contradiction_signal");
  }
  if (/prefer|like|love|avoid|hate/i.test(episode.summary)) {
    labels.push("preference_assertion");
  }

  return {
    sourceId: episode.id,
    timestamp: episode.createdAt,
    sessionId: episode.sessionId,
    speaker: "episode_boundary",
    rawText: episode.summary,
    labels,
    labelConfidence: 0.6,
  };
}

// ─── Trace ↔ Note Matching ─────────────────────────────────────────────────────

const STOP_WORDS = new Set(["i", "a", "an", "the", "and", "or", "is", "are", "was", "were", "to", "of", "in", "my"]);

/**
 * Compute normalized text overlap between a trace event and a note's normalizedValue.
 * Token-level Jaccard similarity. Pure function, no external dependencies.
 */
function tokenOverlap(traceText: string, noteValue: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOP_WORDS.has(t)),
    );

  const traceTokens = tokenize(traceText);
  const noteTokens = tokenize(noteValue);

  if (noteTokens.size === 0 || traceTokens.size === 0) return 0;

  let shared = 0;
  for (const tok of noteTokens) {
    if (traceTokens.has(tok)) shared++;
  }

  // Jaccard: intersection / union
  const union = new Set([...traceTokens, ...noteTokens]).size;
  return shared / union;
}

/**
 * Classify whether a trace event supports or contradicts a specific note,
 * using the event's labels and text overlap.
 * Returns null if the overlap is below MIN_OVERLAP_THRESHOLD.
 */
const MIN_OVERLAP_THRESHOLD = 0.08;

export function matchTraceToNote(
  event: TraceEvent,
  note: NoteRecord,
): TraceNoteMatch | null {
  const noteValue = note.normalizedValue ?? note.canonicalText;
  const overlap = tokenOverlap(event.rawText, noteValue);

  if (overlap < MIN_OVERLAP_THRESHOLD) return null;

  const hasContradiction =
    event.labels?.includes("contradiction_signal") ||
    event.labels?.includes("preference_negation") ||
    false;
  const hasSupport =
    event.labels?.includes("preference_assertion") && !hasContradiction;

  const matchType: TraceNoteMatch["matchType"] =
    hasContradiction ? "contradicts" : hasSupport ? "supports" : "ambiguous";

  return {
    traceEvent: event,
    noteId: note.id,
    matchType,
    textOverlapScore: overlap,
  };
}

// ─── Primary Trace Consumption ────────────────────────────────────────────────

/**
 * Run a full trace consumption pass over a note pool.
 * Pure function. All inputs are value-typed snapshots.
 *
 * @param notes         Pool of NoteRecord[] to match against (pre-filtered for consent/status).
 * @param traceEvents   Sequence of TraceEvent[] (from extractTraceEvent / extractEpisodeTraceEvent).
 * @param maxMatches    Hard cap on total TraceNoteMatch entries returned.
 */
export function runTraceConsumption(
  notes: NoteRecord[],
  traceEvents: TraceEvent[],
  maxMatches = 20,
): TraceConsumptionResult {
  const allMatches: TraceNoteMatch[] = [];

  for (const event of traceEvents) {
    for (const note of notes) {
      const match = matchTraceToNote(event, note);
      if (match) allMatches.push(match);
    }
  }

  // Sort by overlap score descending, cap at maxMatches
  allMatches.sort((a, b) => b.textOverlapScore - a.textOverlapScore);
  const cappedMatches = allMatches.slice(0, maxMatches);

  const supportedIds = new Set<string>();
  const contradictedIds = new Set<string>();

  for (const match of cappedMatches) {
    if (match.matchType === "contradicts") contradictedIds.add(match.noteId);
    else if (match.matchType === "supports") supportedIds.add(match.noteId);
  }

  const traceSupported = notes.filter(
    (n) => supportedIds.has(n.id) && !contradictedIds.has(n.id),
  );
  const traceContradicted = notes.filter((n) => contradictedIds.has(n.id));
  const traceOrphaned = notes.filter(
    (n) => !supportedIds.has(n.id) && !contradictedIds.has(n.id),
  );

  return {
    traceSupported,
    traceContradicted,
    traceOrphaned,
    allMatches: cappedMatches,
    traceEventsConsumed: traceEvents.length,
  };
}
