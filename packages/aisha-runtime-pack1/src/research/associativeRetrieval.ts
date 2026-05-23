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

// ─── Core Types ───────────────────────────────────────────────────────────────

/**
 * A lightweight adjacency structure built from NoteLinkRecord[]
 * used by the graph-walk without touching the live store.
 */
export interface NoteGraph {
  /** Map from noteId → outgoing link targets with relation labels. */
  forward: Map<string, Array<{ targetId: string; relation: NoteLinkRecord["relation"]; strength: number }>>;
  /** Map from noteId → incoming link sources with relation labels. */
  backward: Map<string, Array<{ sourceId: string; relation: NoteLinkRecord["relation"]; strength: number }>>;
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

// ─── NoteGraph Builder ────────────────────────────────────────────────────────

/**
 * Build a bidirectional adjacency graph from a flat list of note links.
 * Pure function. No store calls.
 */
export function buildNoteGraph(links: NoteLinkRecord[]): NoteGraph {
  const forward = new Map<string, Array<{ targetId: string; relation: NoteLinkRecord["relation"]; strength: number }>>();
  const backward = new Map<string, Array<{ sourceId: string; relation: NoteLinkRecord["relation"]; strength: number }>>();

  for (const link of links) {
    // Forward: from → to
    const fwd = forward.get(link.fromNoteId) ?? [];
    fwd.push({ targetId: link.toNoteId, relation: link.relation, strength: link.strength ?? 1 });
    forward.set(link.fromNoteId, fwd);

    // Backward: to ← from
    const bwd = backward.get(link.toNoteId) ?? [];
    bwd.push({ sourceId: link.fromNoteId, relation: link.relation, strength: link.strength ?? 1 });
    backward.set(link.toNoteId, bwd);
  }

  return { forward, backward };
}

// ─── Associative Retrieval ────────────────────────────────────────────────────

/**
 * Relations that are safe to traverse outward (follow the link as written).
 * "supersedes" and "blocks_reinference_for" are excluded from forward traversal
 * to prevent retrieval of stale/blocked content through associative chaining.
 */
const TRAVERSABLE_FORWARD: Set<NoteLinkRecord["relation"]> = new Set([
  "supports",
  "derived_from",
]);

/**
 * Relations that are safe to traverse backward (follow the link in reverse).
 * "contradicts" backward is included so contradiction targets can seed alerts.
 */
const TRAVERSABLE_BACKWARD: Set<NoteLinkRecord["relation"]> = new Set([
  "supports",
  "contradicts",
  "derived_from",
]);

const MAX_HOPS = 2;
const LINK_STRENGTH_DECAY = 0.7; // applied per hop

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
export function associativeWalk(
  seedIds: Set<string>,
  graph: NoteGraph,
  notePool: Map<string, NoteRecord>,
  maxResults = 6,
): AssociativeHit[] {
  // BFS over forward + backward adjacency.
  // Track visited IDs to avoid cycles and duplicate hits.
  const visited = new Set<string>(seedIds); // seeds are excluded from hits
  const queue: Array<{ id: string; hop: number; relations: NoteLinkRecord["relation"][]; cumulativeStrength: number }> = [];

  // Seed the queue from all forward and backward neighbours of seed notes
  for (const seedId of seedIds) {
    const fwdEdges = graph.forward.get(seedId) ?? [];
    for (const edge of fwdEdges) {
      if (!TRAVERSABLE_FORWARD.has(edge.relation)) continue;
      if (!visited.has(edge.targetId)) {
        queue.push({ id: edge.targetId, hop: 1, relations: [edge.relation], cumulativeStrength: edge.strength });
      }
    }
    const bwdEdges = graph.backward.get(seedId) ?? [];
    for (const edge of bwdEdges) {
      if (!TRAVERSABLE_BACKWARD.has(edge.relation)) continue;
      if (!visited.has(edge.sourceId)) {
        queue.push({ id: edge.sourceId, hop: 1, relations: [edge.relation], cumulativeStrength: edge.strength });
      }
    }
  }

  const hits: AssociativeHit[] = [];

  while (queue.length > 0 && hits.length < maxResults * 2) {
    const item = queue.shift()!;
    if (visited.has(item.id)) continue;
    visited.add(item.id);

    const note = notePool.get(item.id);
    if (!note) continue; // not in eligible pool

    // \u2500\u2500 Pack 3.12 / Pack 3.11 §9.6: Pack 3.7 gating boundary \u2500\u2500
    // Notes that were rejected or blocked by the relationship gate must NEVER
    // be surfaced through associative traversal, even if a link reaches them.
    if (note.reviewState === "rejected") continue;
    if (note.reinferencePolicy.mode === "block_auto_reinfer") continue;

    const decayedStrength = item.cumulativeStrength * Math.pow(LINK_STRENGTH_DECAY, item.hop - 1);
    const score = note.confidence * decayedStrength;

    hits.push({
      note,
      hopDistance: item.hop,
      traversedRelations: item.relations,
      score,
    });


    // Continue expanding up to MAX_HOPS
    if (item.hop < MAX_HOPS) {
      const nextHop = item.hop + 1;
      const fwdEdges = graph.forward.get(item.id) ?? [];
      for (const edge of fwdEdges) {
        if (!TRAVERSABLE_FORWARD.has(edge.relation)) continue;
        if (!visited.has(edge.targetId)) {
          queue.push({
            id: edge.targetId,
            hop: nextHop,
            relations: [...item.relations, edge.relation],
            cumulativeStrength: edge.strength,
          });
        }
      }
      const bwdEdges = graph.backward.get(item.id) ?? [];
      for (const edge of bwdEdges) {
        if (!TRAVERSABLE_BACKWARD.has(edge.relation)) continue;
        if (!visited.has(edge.sourceId)) {
          queue.push({
            id: edge.sourceId,
            hop: nextHop,
            relations: [...item.relations, edge.relation],
            cumulativeStrength: edge.strength,
          });
        }
      }
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Run associative retrieval and compute comparison against baseline.
 * Pure function. All inputs are value-typed, no store calls.
 *
 * @param baselineNoteIds  Set of note IDs returned by the current baseline planner.
 * @param links            All NoteLinkRecord[] available in the research scope.
 * @param eligibleNotes    NoteRecord[] pool (consent/status pre-filtered, seeds included).
 * @param maxAssociative   Hard cap on associative hits.
 */
export function runAssociativeRetrieval(
  baselineNoteIds: Set<string>,
  links: NoteLinkRecord[],
  eligibleNotes: NoteRecord[],
  maxAssociative = 6,
): AssociativeRetrievalResult {
  const graph = buildNoteGraph(links);
  const notePool = new Map<string, NoteRecord>(eligibleNotes.map((n) => [n.id, n]));

  const hits = associativeWalk(baselineNoteIds, graph, notePool, maxAssociative);
  const associativeIds = new Set(hits.map((h) => h.note.id));

  const baselineOnly = [...baselineNoteIds].filter((id) => !associativeIds.has(id));
  const associativeOnly = [...associativeIds].filter((id) => !baselineNoteIds.has(id));
  const intersection = [...baselineNoteIds].filter((id) => associativeIds.has(id));

  return { hits, baselineOnly, associativeOnly, intersection };
}

// ─── Episode Associativity ────────────────────────────────────────────────────

/**
 * Cross-episode linkage: find episodes that share participant or relationship
 * context with the baseline episode set, beyond the MAX_THREAD_EPISODES window.
 * Returns episodes sorted by recency that are NOT in the baseline slice.
 */
export function findCrossEpisodeLinks(
  baselineEpisodeIds: Set<string>,
  allEpisodes: EpisodeRecord[],
  maxResults = 3,
): EpisodeRecord[] {
  const baseline = allEpisodes.filter((ep) => baselineEpisodeIds.has(ep.id));

  const baselinePersonIds = new Set<string>(
    baseline.flatMap((ep) => [...ep.participantPersonIds, ep.focalRelationshipPersonId ?? ""]).filter(Boolean),
  );
  const baselineTopics = new Set<string>(
    baseline.flatMap((ep) => ep.topicLabels),
  );

  const candidates = allEpisodes.filter((ep) => {
    if (baselineEpisodeIds.has(ep.id)) return false;
    const sharedPerson = ep.participantPersonIds.some((pid) => baselinePersonIds.has(pid)) ||
      baselinePersonIds.has(ep.focalRelationshipPersonId ?? "");
    const sharedTopic = ep.topicLabels.some((t) => baselineTopics.has(t));
    return sharedPerson || sharedTopic;
  });

  return candidates
    .sort((a, b) => {
      const aMs = Date.parse(a.createdAt);
      const bMs = Date.parse(b.createdAt);
      return bMs - aMs;
    })
    .slice(0, maxResults);
}
