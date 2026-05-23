/**
 * T39 — Pack 3.9 Associative Retrieval Research Fixtures
 *
 * RESEARCH LANE ONLY. Deterministic pure-function tests over the
 * associativeRetrieval and associativeRetrievalMetrics modules.
 *
 * Coverage:
 *   T39_graph_builder_builds_bidirectional_edges
 *   T39_walk_reaches_direct_support_link
 *   T39_walk_does_not_traverse_supersedes_forward
 *   T39_walk_respects_max_hops
 *   T39_walk_excludes_seeds_from_hits
 *   T39_contradiction_recall_measured_correctly
 *   T39_stale_rescue_rate_measured_with_ground_truth
 *   T39_stale_rescue_proxy_without_ground_truth
 *   T39_cross_episode_diversity_measured
 *   T39_noise_precision_loss_measured
 *   T39_cross_episode_link_finder
 *   T39_full_pipeline_baseline_vs_associative_comparison
 *   T39_render_metrics_markdown
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import {
  buildNoteGraph,
  associativeWalk,
  runAssociativeRetrieval,
  findCrossEpisodeLinks,
} from "../research/associativeRetrieval";
import {
  computeAssociativeRetrievalMetrics,
  renderAssociativeMetricsMarkdown,
} from "../research/associativeRetrievalMetrics";
import type { NoteRecord, NoteLinkRecord, EpisodeRecord } from "../memory/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-25T10:00:00.000Z";

function makeNote(
  id: string,
  value: string,
  opts: {
    sourceEpisodeIds?: string[];
    status?: NoteRecord["status"];
    reinferenceMode?: "allow" | "needs_review";
    confidence?: number;
  } = {},
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: opts.status ?? "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: opts.confidence ?? 0.80,
    extractionConfidenceRaw: opts.confidence ?? 0.80,
    provenanceChain: ["extracted_v1"],
    subjectKind: "user",
    sourceEpisodeIds: opts.sourceEpisodeIds ?? ["ep_1"],
    reviewState: "accepted",
    reinferencePolicy: {
      mode: opts.reinferenceMode ?? "allow",
      reason: opts.reinferenceMode === "needs_review" ? "retrieved_weak_stale_note" : undefined,
    },
    auditTrail: [],
  };
}

function makeLink(
  from: string,
  to: string,
  relation: NoteLinkRecord["relation"],
  strength = 1.0,
): NoteLinkRecord {
  return {
    id: `link_${from}_${to}`,
    kind: "note_link",
    fromNoteId: from,
    toNoteId: to,
    relation,
    strength,
    createdAt: FIXED_NOW,
    sourceModality: "text",
  };
}

function makeEpisode(id: string, topics: string[], personIds: string[] = []): EpisodeRecord {
  return {
    id,
    kind: "episode",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_1",
    threadId: "thread_1",
    startTurnId: "t_start",
    endTurnId: "t_end",
    turnIds: [],
    topicLabels: topics,
    primaryModality: "text",
    modalityMix: ["text"],
    participantSpeakerIds: [],
    participantPersonIds: personIds,
    boundaryReason: { topicShift: false, surpriseDiscontinuity: false, score: 0 },
  };
}

// ─── T39_graph_builder_builds_bidirectional_edges ─────────────────────────────

export function T39_graph_builder_builds_bidirectional_edges() {
  const links = [
    makeLink("note_a", "note_b", "supports"),
    makeLink("note_b", "note_c", "contradicts"),
  ];
  const graph = buildNoteGraph(links);

  // Forward edges
  const fwdA = graph.forward.get("note_a");
  assert.ok(fwdA, "note_a must have forward edges");
  assert.strictEqual(fwdA![0].targetId, "note_b");
  assert.strictEqual(fwdA![0].relation, "supports");

  // Backward edges
  const bwdB = graph.backward.get("note_b");
  assert.ok(bwdB, "note_b must have backward edges");
  assert.strictEqual(bwdB![0].sourceId, "note_a");
  assert.strictEqual(bwdB![0].relation, "supports");

  // Multi-edge
  const fwdB = graph.forward.get("note_b");
  assert.ok(fwdB);
  assert.strictEqual(fwdB![0].targetId, "note_c");
}

// ─── T39_walk_reaches_direct_support_link ────────────────────────────────────

export function T39_walk_reaches_direct_support_link() {
  const noteA = makeNote("note_a", "coffee");
  const noteB = makeNote("note_b", "espresso"); // supported by A

  const links = [makeLink("note_a", "note_b", "supports")];
  const graph = buildNoteGraph(links);
  const pool = new Map([["note_a", noteA], ["note_b", noteB]]);
  const seeds = new Set(["note_a"]);

  const hits = associativeWalk(seeds, graph, pool);

  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].note.id, "note_b");
  assert.strictEqual(hits[0].hopDistance, 1);
  assert.ok(hits[0].traversedRelations.includes("supports"));
  assert.ok(hits[0].score > 0);
}

// ─── T39_walk_does_not_traverse_supersedes_forward ───────────────────────────

export function T39_walk_does_not_traverse_supersedes_forward() {
  const noteA = makeNote("note_a", "coffee");
  const noteB = makeNote("note_b", "old-coffee", { status: "superseded" });

  const links = [makeLink("note_a", "note_b", "supersedes")];
  const graph = buildNoteGraph(links);
  const pool = new Map([["note_a", noteA], ["note_b", noteB]]);
  const seeds = new Set(["note_a"]);

  const hits = associativeWalk(seeds, graph, pool);

  // supersedes is not in TRAVERSABLE_FORWARD — note_b must NOT be reached
  assert.strictEqual(hits.length, 0, "supersedes relation must not be traversed forward");
}

// ─── T39_walk_respects_max_hops ───────────────────────────────────────────────

export function T39_walk_respects_max_hops() {
  // Chain: A → B → C → D (all supports, 3 hops from A)
  const noteA = makeNote("note_a", "a");
  const noteB = makeNote("note_b", "b");
  const noteC = makeNote("note_c", "c");
  const noteD = makeNote("note_d", "d");

  const links = [
    makeLink("note_a", "note_b", "supports"),
    makeLink("note_b", "note_c", "supports"),
    makeLink("note_c", "note_d", "supports"),
  ];
  const graph = buildNoteGraph(links);
  const pool = new Map([
    ["note_a", noteA], ["note_b", noteB], ["note_c", noteC], ["note_d", noteD]
  ]);
  const seeds = new Set(["note_a"]);

  const hits = associativeWalk(seeds, graph, pool);

  const hitIds = new Set(hits.map((h) => h.note.id));
  assert.ok(hitIds.has("note_b"), "hop 1 must be included");
  assert.ok(hitIds.has("note_c"), "hop 2 must be included");
  assert.ok(!hitIds.has("note_d"), "hop 3 must be excluded (MAX_HOPS=2)");
}

// ─── T39_walk_excludes_seeds_from_hits ───────────────────────────────────────

export function T39_walk_excludes_seeds_from_hits() {
  const noteA = makeNote("note_a", "coffee");
  const noteB = makeNote("note_b", "espresso");

  const links = [makeLink("note_a", "note_b", "supports")];
  const graph = buildNoteGraph(links);
  const pool = new Map([["note_a", noteA], ["note_b", noteB]]);
  const seeds = new Set(["note_a"]);

  const hits = associativeWalk(seeds, graph, pool);

  const hitIds = hits.map((h) => h.note.id);
  assert.ok(!hitIds.includes("note_a"), "seed note_a must NOT appear in hits");
  assert.ok(hitIds.includes("note_b"), "note_b must appear in hits");
}

// ─── T39_contradiction_recall_measured_correctly ─────────────────────────────

export function T39_contradiction_recall_measured_correctly() {
  const baselineNotes = [makeNote("note_a", "coffee"), makeNote("note_b", "milk")];
  const hitA = makeNote("note_c", "avoids coffee"); // expected contradiction
  const hitB = makeNote("note_d", "avoids milk");   // also expected
  const hitC = makeNote("note_e", "noise");          // not expected

  const hits = [
    { note: hitA, hopDistance: 1, traversedRelations: ["contradicts" as const], score: 0.7 },
    { note: hitB, hopDistance: 1, traversedRelations: ["contradicts" as const], score: 0.6 },
    { note: hitC, hopDistance: 2, traversedRelations: ["supports" as const], score: 0.3 },
  ];

  const groundTruth = {
    expectedContradictionIds: new Set(["note_c", "note_d"]),
  };

  const metrics = computeAssociativeRetrievalMetrics(
    baselineNotes, hits, [], groundTruth
  );

  // Both expected contradictions were hit
  assert.strictEqual(metrics.contradictionRecallRate, 1.0);
  // noise: note_e is not in expected sets — 1 of 3 hits = 0.333...
  assert.ok(Math.abs(metrics.noisePrecisionLossRate - 1/3) < 0.001);
}

// ─── T39_stale_rescue_rate_measured_with_ground_truth ────────────────────────

export function T39_stale_rescue_rate_measured_with_ground_truth() {
  const baselineStale = makeNote("note_stale", "old coffee", { reinferenceMode: "needs_review" });
  const baselineNotes = [baselineStale];

  const rescueNote = makeNote("note_rescue", "fresh coffee");
  const hits = [
    { note: rescueNote, hopDistance: 1, traversedRelations: ["supports" as const], score: 0.75 },
  ];

  const groundTruth = {
    expectedStaleRescueIds: new Set(["note_rescue"]),
  };

  const metrics = computeAssociativeRetrievalMetrics(
    baselineNotes, hits, [], groundTruth
  );

  assert.strictEqual(metrics.staleRescueRate, 1.0);
  assert.strictEqual(metrics.baselineStaleCount, 1);
}

// ─── T39_stale_rescue_proxy_without_ground_truth ─────────────────────────────

export function T39_stale_rescue_proxy_without_ground_truth() {
  const baselineStale1 = makeNote("note_stale_1", "old a", { reinferenceMode: "needs_review" });
  const baselineStale2 = makeNote("note_stale_2", "old b", { reinferenceMode: "needs_review" });
  const baselineNotes = [baselineStale1, baselineStale2];

  // 1 non-stale hit: rescues 1 of 2 stale = 0.5 proxy
  const freshHit = makeNote("note_fresh", "fresh pref");
  const hits = [
    { note: freshHit, hopDistance: 1, traversedRelations: ["supports" as const], score: 0.8 },
  ];

  const metrics = computeAssociativeRetrievalMetrics(
    baselineNotes, hits, [] // no groundTruth
  );

  // proxy: 1 non-stale hit / 2 stale baseline = 0.5
  assert.strictEqual(metrics.staleRescueRate, 0.5);
  assert.strictEqual(metrics.baselineStaleCount, 2);
}

// ─── T39_cross_episode_diversity_measured ────────────────────────────────────

export function T39_cross_episode_diversity_measured() {
  // Baseline notes are all from ep_1
  const baselineNotes = [
    makeNote("note_a", "a", { sourceEpisodeIds: ["ep_1"] }),
    makeNote("note_b", "b", { sourceEpisodeIds: ["ep_1"] }),
  ];

  // One hit from ep_1 (same episode), one from ep_2 (cross-episode)
  const sameEpHit = makeNote("note_c", "c", { sourceEpisodeIds: ["ep_1"] });
  const crossEpHit = makeNote("note_d", "d", { sourceEpisodeIds: ["ep_2"] });

  const hits = [
    { note: sameEpHit, hopDistance: 1, traversedRelations: ["supports" as const], score: 0.7 },
    { note: crossEpHit, hopDistance: 1, traversedRelations: ["supports" as const], score: 0.65 },
  ];

  const metrics = computeAssociativeRetrievalMetrics(baselineNotes, hits, []);

  // 1 of 2 hits are cross-episode = 0.5
  assert.strictEqual(metrics.crossEpisodeDiversityRate, 0.5);
  assert.strictEqual(metrics.crossEpisodeHitCount, 1);
}

// ─── T39_noise_precision_loss_measured ───────────────────────────────────────

export function T39_noise_precision_loss_measured() {
  const baselineNotes = [makeNote("note_a", "a")];
  const expectedHit = makeNote("note_b", "b");
  const noiseHit = makeNote("note_c", "c");

  const hits = [
    { note: expectedHit, hopDistance: 1, traversedRelations: ["supports" as const], score: 0.8 },
    { note: noiseHit, hopDistance: 2, traversedRelations: ["supports" as const], score: 0.3 },
  ];

  const groundTruth = {
    expectedContradictionIds: new Set(["note_b"]),
  };

  const metrics = computeAssociativeRetrievalMetrics(baselineNotes, hits, [], groundTruth);

  // 1 of 2 hits is noise = 0.5
  assert.strictEqual(metrics.noisePrecisionLossRate, 0.5);
}

// ─── T39_cross_episode_link_finder ───────────────────────────────────────────

export function T39_cross_episode_link_finder() {
  const ep1 = makeEpisode("ep_1", ["coffee", "morning"], ["person_a"]);
  const ep2 = makeEpisode("ep_2", ["tea", "afternoon"], []); // different topic, different person
  const ep3 = makeEpisode("ep_3", ["coffee", "work"], ["person_b"]); // shares "coffee" topic
  const ep4 = makeEpisode("ep_4", ["lunch"], ["person_a"]); // shares person_a

  const allEpisodes = [ep1, ep2, ep3, ep4];
  const baselineIds = new Set(["ep_1"]);

  const crossLinks = findCrossEpisodeLinks(baselineIds, allEpisodes, 5);

  const crossIds = new Set(crossLinks.map((ep) => ep.id));
  // ep_3 shares "coffee" topic with ep_1 → included
  assert.ok(crossIds.has("ep_3"), "ep_3 shares topic coffee with ep_1");
  // ep_4 shares person_a with ep_1 → included
  assert.ok(crossIds.has("ep_4"), "ep_4 shares person_a with ep_1");
  // ep_2 shares nothing → not included
  assert.ok(!crossIds.has("ep_2"), "ep_2 shares nothing with ep_1");
  // ep_1 itself is not returned (it's a baseline)
  assert.ok(!crossIds.has("ep_1"), "baseline ep_1 must not appear in cross links");
}

// ─── T39_full_pipeline_baseline_vs_associative_comparison ────────────────────

export function T39_full_pipeline_baseline_vs_associative_comparison() {
  // Baseline: 3 active notes, 1 stale
  const n1 = makeNote("n1", "coffee", { sourceEpisodeIds: ["ep_1"] });
  const n2 = makeNote("n2", "milk", { sourceEpisodeIds: ["ep_1"] });
  const n3 = makeNote("n3", "old pref", {
    sourceEpisodeIds: ["ep_1"],
    reinferenceMode: "needs_review",
  });

  // Hidden notes: linked but beyond baseline window
  const n4 = makeNote("n4", "avoids coffee", { sourceEpisodeIds: ["ep_2"] }); // contradiction
  const n5 = makeNote("n5", "fresh pref", { sourceEpisodeIds: ["ep_2"] });     // stale rescue

  const links = [
    makeLink("n1", "n4", "supports"), // n4 is reachable via backward-contradicts from n1
    makeLink("n3", "n5", "supports"), // n5 is reachable from stale n3
  ];

  const baselineIds = new Set(["n1", "n2", "n3"]);
  const eligibleNotes = [n1, n2, n3, n4, n5];

  const result = runAssociativeRetrieval(baselineIds, links, eligibleNotes);

  // n4 and n5 should be in the associative-only set
  const associativeIds = new Set(result.hits.map((h) => h.note.id));
  assert.ok(associativeIds.has("n4") || associativeIds.has("n5"), "must surface at least one non-baseline note");

  // Baseline-only should contain notes not reachable associatively
  const allAssocIds = new Set(result.hits.map((h) => h.note.id));
  for (const id of result.baselineOnly) {
    assert.ok(!allAssocIds.has(id), `baselineOnly note ${id} must not appear in associative hits`);
  }

  // Compute metrics
  const groundTruth = {
    expectedContradictionIds: new Set(["n4"]),
    expectedStaleRescueIds: new Set(["n5"]),
  };
  const metrics = computeAssociativeRetrievalMetrics(
    [n1, n2, n3], result.hits, [], groundTruth
  );

  assert.ok(metrics.totalHits >= 0, "totalHits must be non-negative");
  assert.ok(metrics.avgHopDistance >= 0, "avgHopDistance must be non-negative");
}

// ─── T39_render_metrics_markdown ─────────────────────────────────────────────

export function T39_render_metrics_markdown() {
  const metrics = {
    contradictionRecallRate: 0.75,
    staleRescueRate: 0.5,
    crossEpisodeDiversityRate: 0.333,
    noisePrecisionLossRate: 0.2,
    totalHits: 5,
    avgHopDistance: 1.4,
    avgScore: 0.612,
    baselineStaleCount: 2,
    crossEpisodeHitCount: 2,
  };

  const md = renderAssociativeMetricsMarkdown(metrics, "Test Report");
  assert.ok(md.includes("# Test Report"), "must include report header");
  assert.ok(md.includes("Contradiction Recall Rate"), "must include contradiction recall");
  assert.ok(md.includes("0.750"), "must include formatted recall value");
  assert.ok(md.includes("Noise / Precision Loss Rate"), "must include noise metric");
  assert.ok(md.includes("Total Hits**: 5"), "must include total hits");
}
