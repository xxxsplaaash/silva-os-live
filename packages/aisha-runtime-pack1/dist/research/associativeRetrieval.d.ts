/**
 * Pack 3.9 — Associative Retrieval Research Prototype
 *
 * RESEARCH LANE ONLY. Not wired into any production hot-path.
 * Implements a lightweight graph-walk over existing note/episode link structures
 * to surface notes/episodes that the baseline retrieval planner does not surface.
 *
 * Design constraints:
 *  - Pure functions or in-memory computation from inputs already provided.
 *  - No I/O, no external stores, no embeddings, no LLM calls.
 *  - No Date.now() calls (pass evalTimeMs where needed for determinism in tests).
 *  - Must not import from runtime hot-path modules that could cause side-effects.
 *  - Exported comparison metrics are machine-readable only (no judge logic).
 */
import type { NoteRecord, NoteLinkRecord, EpisodeRecord } from "../memory/types";
/**
 * A lightweight adjacency structure built from NoteLinkRecord[]
 * used by the graph-walk without touching the live store.
 */
export interface NoteGraph {
    /** Map from noteId → outgoing link targets with relation labels. */
    forward: Map<string, Array<{
        targetId: string;
        relation: NoteLinkRecord["relation"];
        strength: number;
    }>>;
    /** Map from noteId → incoming link sources with relation labels. */
    backward: Map<string, Array<{
        sourceId: string;
        relation: NoteLinkRecord["relation"];
        strength: number;
    }>>;
}
/**
 * An associatively-retrieved note with the path that caused it to surface.
 */
export interface AssociativeHit {
    note: NoteRecord;
    /** Hop distance from any seed note. 1 = directly linked. */
    hopDistance: number;
    /** The relation type(s) traversed to reach this note. */
    traversedRelations: NoteLinkRecord["relation"][];
    /** Composite relevance score: confidence × link-strength decay. */
    score: number;
}
/**
 * Result of one associative retrieval call.
 */
export interface AssociativeRetrievalResult {
    hits: AssociativeHit[];
    /** IDs surfaced by baseline but NOT by associative retrieval. */
    baselineOnly: string[];
    /** IDs surfaced by associative retrieval but NOT by baseline. */
    associativeOnly: string[];
    /** IDs surfaced by both. */
    intersection: string[];
}
/**
 * Build a bidirectional adjacency graph from a flat list of note links.
 * Pure function. No store calls.
 */
export declare function buildNoteGraph(links: NoteLinkRecord[]): NoteGraph;
/**
 * Walk the note graph outward from seed note IDs, up to MAX_HOPS.
 * Respects consent and reviewState filters on notes in the candidate pool.
 * Returns AssociativeHit[] sorted by score descending.
 *
 * @param seedIds         IDs of notes already in the baseline retrieval set.
 * @param graph           Adjacency graph built from buildNoteGraph().
 * @param notePool        All notes available to surface (pre-filtered for consent/status).
 * @param maxResults      Hard cap on returned hits.
 */
export declare function associativeWalk(seedIds: Set<string>, graph: NoteGraph, notePool: Map<string, NoteRecord>, maxResults?: number): AssociativeHit[];
/**
 * Run associative retrieval and compute comparison against baseline.
 * Pure function. All inputs are value-typed, no store calls.
 *
 * @param baselineNoteIds  Set of note IDs returned by the current baseline planner.
 * @param links            All NoteLinkRecord[] available in the research scope.
 * @param eligibleNotes    NoteRecord[] pool (consent/status pre-filtered, seeds included).
 * @param maxAssociative   Hard cap on associative hits.
 */
export declare function runAssociativeRetrieval(baselineNoteIds: Set<string>, links: NoteLinkRecord[], eligibleNotes: NoteRecord[], maxAssociative?: number): AssociativeRetrievalResult;
/**
 * Cross-episode linkage: find episodes that share participant or relationship
 * context with the baseline episode set, beyond the MAX_THREAD_EPISODES window.
 * Returns episodes sorted by recency that are NOT in the baseline slice.
 */
export declare function findCrossEpisodeLinks(baselineEpisodeIds: Set<string>, allEpisodes: EpisodeRecord[], maxResults?: number): EpisodeRecord[];
