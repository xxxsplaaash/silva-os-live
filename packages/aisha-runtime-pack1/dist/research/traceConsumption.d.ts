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
export type TraceLabel = "contradiction_signal" | "preference_assertion" | "preference_negation" | "stale_note_context" | "relationship_signal" | "boundary_event";
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
/**
 * Deterministic label extraction from a TurnRecord.
 * Applies lightweight regex heuristics — no LLM, no embeddings.
 * Returns the TraceEvent with any detected labels attached.
 */
export declare function extractTraceEvent(turn: TurnRecord): TraceEvent;
/**
 * Construct a synthetic TraceEvent from an EpisodeRecord summary.
 * Used to incorporate episode-level evidence without re-reading all turns.
 */
export declare function extractEpisodeTraceEvent(episode: EpisodeRecord): TraceEvent | null;
export declare function matchTraceToNote(event: TraceEvent, note: NoteRecord): TraceNoteMatch | null;
/**
 * Run a full trace consumption pass over a note pool.
 * Pure function. All inputs are value-typed snapshots.
 *
 * @param notes         Pool of NoteRecord[] to match against (pre-filtered for consent/status).
 * @param traceEvents   Sequence of TraceEvent[] (from extractTraceEvent / extractEpisodeTraceEvent).
 * @param maxMatches    Hard cap on total TraceNoteMatch entries returned.
 */
export declare function runTraceConsumption(notes: NoteRecord[], traceEvents: TraceEvent[], maxMatches?: number): TraceConsumptionResult;
