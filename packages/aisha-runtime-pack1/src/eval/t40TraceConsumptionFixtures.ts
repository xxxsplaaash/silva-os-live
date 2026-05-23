/**
 * T40 — Pack 3.10 Trace Consumption Research Fixtures
 *
 * RESEARCH LANE ONLY. Deterministic pure-function tests over the
 * traceConsumption and traceConsumptionMetrics modules.
 *
 * Coverage:
 *   T40_extract_trace_event_labels_contradiction
 *   T40_extract_trace_event_labels_preference_assertion
 *   T40_extract_trace_event_labels_stale_context
 *   T40_extract_trace_event_no_labels_for_neutral_turn
 *   T40_extract_episode_trace_event_returns_null_without_summary
 *   T40_extract_episode_trace_event_labels_contradiction
 *   T40_token_overlap_zero_for_unrelated_text
 *   T40_match_trace_to_note_supports
 *   T40_match_trace_to_note_contradicts
 *   T40_match_trace_to_note_returns_null_below_threshold
 *   T40_run_trace_consumption_classifies_supported_and_contradicted
 *   T40_run_trace_consumption_orphans_unmatched_notes
 *   T40_contradiction_recovery_rate_with_ground_truth
 *   T40_stale_rescue_rate_with_ground_truth
 *   T40_stale_rescue_proxy_without_ground_truth
 *   T40_noise_precision_loss_rate
 *   T40_review_disambiguation_rate
 *   T40_delta_metrics_vs_baseline_and_associative
 *   T40_render_metrics_markdown
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import {
  extractTraceEvent,
  extractEpisodeTraceEvent,
  matchTraceToNote,
  runTraceConsumption,
  type TraceEvent,
} from "../research/traceConsumption";
import {
  computeTraceConsumptionMetrics,
  renderTraceConsumptionMetricsMarkdown,
} from "../research/traceConsumptionMetrics";
import type { NoteRecord, TurnRecord, EpisodeRecord } from "../memory/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-25T12:00:00.000Z";

function makeTurn(id: string, rawText: string, speaker: TurnRecord["speaker"] = "user"): TurnRecord {
  return {
    id,
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t40",
    turnIndex: 0,
    speaker,
    rawText,
    stateSnapshotId: "snap_1",
    entityMentions: [],
    immutable: true,
  };
}

function makeNote(
  id: string,
  value: string,
  opts: {
    reinferenceMode?: "allow" | "needs_review";
    reviewState?: NoteRecord["reviewState"];
    status?: NoteRecord["status"];
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
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: ["extracted_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    reviewState: opts.reviewState ?? "accepted",
    reinferencePolicy: {
      mode: opts.reinferenceMode ?? "allow",
      reason: opts.reinferenceMode === "needs_review" ? "retrieved_weak_stale_note" : undefined,
    },
    auditTrail: [],
  };
}

function makeEpisode(id: string, summary?: string): EpisodeRecord {
  return {
    id,
    kind: "episode",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t40",
    threadId: "thread_1",
    startTurnId: "t_start",
    endTurnId: "t_end",
    turnIds: [],
    topicLabels: [],
    primaryModality: "text",
    modalityMix: ["text"],
    participantSpeakerIds: [],
    participantPersonIds: [],
    summary,
    boundaryReason: { topicShift: false, surpriseDiscontinuity: false, score: 0 },
  };
}

// ─── T40_extract_trace_event_labels_contradiction ─────────────────────────────

export function T40_extract_trace_event_labels_contradiction() {
  const turn = makeTurn("t1", "Actually, I don't drink coffee anymore.");
  const event = extractTraceEvent(turn);
  assert.ok(event.labels?.includes("contradiction_signal"), "must detect contradiction_signal");
  assert.ok((event.labelConfidence ?? 0) > 0);
}

// ─── T40_extract_trace_event_labels_preference_assertion ──────────────────────

export function T40_extract_trace_event_labels_preference_assertion() {
  const turn = makeTurn("t2", "I always prefer oat milk in my latte.");
  const event = extractTraceEvent(turn);
  assert.ok(event.labels?.includes("preference_assertion"), "must detect preference_assertion");
}

// ─── T40_extract_trace_event_labels_stale_context ────────────────────────────

export function T40_extract_trace_event_labels_stale_context() {
  const turn = makeTurn("t3", "That was back then, things have changed.");
  const event = extractTraceEvent(turn);
  assert.ok(event.labels?.includes("stale_note_context"), "must detect stale_note_context");
}

// ─── T40_extract_trace_event_no_labels_for_neutral_turn ──────────────────────

export function T40_extract_trace_event_no_labels_for_neutral_turn() {
  const turn = makeTurn("t4", "Hello, how are you doing today?");
  const event = extractTraceEvent(turn);
  assert.strictEqual(event.labels, undefined, "neutral turn must have no labels");
  assert.strictEqual(event.labelConfidence, 0);
}

// ─── T40_extract_episode_trace_event_returns_null_without_summary ─────────────

export function T40_extract_episode_trace_event_returns_null_without_summary() {
  const ep = makeEpisode("ep_1"); // no summary
  const result = extractEpisodeTraceEvent(ep);
  assert.strictEqual(result, null, "episode without summary must return null");
}

// ─── T40_extract_episode_trace_event_labels_contradiction ────────────────────

export function T40_extract_episode_trace_event_labels_contradiction() {
  const ep = makeEpisode("ep_2", "User mentioned contradicting preference about coffee.");
  const result = extractEpisodeTraceEvent(ep);
  assert.ok(result !== null, "must return an event");
  assert.ok(result!.labels?.includes("contradiction_signal"));
  assert.ok(result!.labels?.includes("boundary_event"));
}

// ─── T40_token_overlap_zero_for_unrelated_text ───────────────────────────────

export function T40_token_overlap_zero_for_unrelated_text() {
  const turn = makeTurn("t5", "The weather is beautiful today.");
  const note = makeNote("n1", "coffee");
  const event = extractTraceEvent(turn);
  const match = matchTraceToNote(event, note);
  // Should be null because overlap is below threshold
  assert.strictEqual(match, null, "unrelated text must not produce a match");
}

// ─── T40_match_trace_to_note_supports ────────────────────────────────────────

export function T40_match_trace_to_note_supports() {
  const turn = makeTurn("t6", "I always prefer oat milk coffee latte in my morning routine.");
  const note = makeNote("n1", "oat milk coffee");
  const event = extractTraceEvent(turn);
  const match = matchTraceToNote(event, note);
  assert.ok(match !== null, "must produce a match");
  assert.strictEqual(match!.matchType, "supports");
  assert.ok(match!.textOverlapScore > 0);
}

// ─── T40_match_trace_to_note_contradicts ─────────────────────────────────────

export function T40_match_trace_to_note_contradicts() {
  const turn = makeTurn("t7", "Actually I don't drink coffee anymore, I stopped having coffee.");
  const note = makeNote("n2", "coffee");
  const event = extractTraceEvent(turn);
  const match = matchTraceToNote(event, note);
  assert.ok(match !== null, "must produce a match");
  assert.strictEqual(match!.matchType, "contradicts");
}

// ─── T40_match_trace_to_note_returns_null_below_threshold ────────────────────

export function T40_match_trace_to_note_returns_null_below_threshold() {
  const turn = makeTurn("t8", "I like reading science fiction novels.");
  const note = makeNote("n3", "espresso macchiato"); // no token overlap with reading/fiction
  const event = extractTraceEvent(turn);
  const match = matchTraceToNote(event, note);
  assert.strictEqual(match, null, "below-threshold overlap must return null");
}

// ─── T40_run_trace_consumption_classifies_supported_and_contradicted ──────────

export function T40_run_trace_consumption_classifies_supported_and_contradicted() {
  const noteSupported = makeNote("n1", "oat milk");
  const noteContradicted = makeNote("n2", "coffee");
  const noteOrphaned = makeNote("n3", "jazz music"); // unrelated

  const turns = [
    makeTurn("t1", "I always prefer oat milk in everything."),
    makeTurn("t2", "Actually I stopped having coffee, I don't drink coffee anymore."),
  ];

  const events = turns.map(extractTraceEvent);
  const result = runTraceConsumption([noteSupported, noteContradicted, noteOrphaned], events);

  const supportedIds = result.traceSupported.map((n) => n.id);
  const contradictedIds = result.traceContradicted.map((n) => n.id);
  const orphanedIds = result.traceOrphaned.map((n) => n.id);

  assert.ok(supportedIds.includes("n1"), "n1 (oat milk) must be supported");
  assert.ok(contradictedIds.includes("n2"), "n2 (coffee) must be contradicted");
  assert.ok(orphanedIds.includes("n3"), "n3 (jazz music) must be orphaned");
  assert.strictEqual(result.traceEventsConsumed, 2);
}

// ─── T40_run_trace_consumption_orphans_unmatched_notes ───────────────────────

export function T40_run_trace_consumption_orphans_unmatched_notes() {
  const note = makeNote("n1", "obscure vintage tea blend");
  const turns = [makeTurn("t1", "The weather outside is lovely.")];
  const events = turns.map(extractTraceEvent);
  const result = runTraceConsumption([note], events);

  assert.strictEqual(result.traceSupported.length, 0);
  assert.strictEqual(result.traceContradicted.length, 0);
  assert.strictEqual(result.traceOrphaned.length, 1);
  assert.strictEqual(result.traceOrphaned[0].id, "n1");
}

// ─── T40_contradiction_recovery_rate_with_ground_truth ───────────────────────

export function T40_contradiction_recovery_rate_with_ground_truth() {
  const noteA = makeNote("n1", "coffee");
  const noteB = makeNote("n2", "milk");
  const noteC = makeNote("n3", "jazz music");

  // Trace contradicts n1 and n2; n3 unmatched
  const turns = [
    makeTurn("t1", "Actually I stopped coffee, I don't drink coffee anymore."),
    makeTurn("t2", "I don't use milk at all, I stopped having milk."),
  ];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([noteA, noteB, noteC], events);

  const groundTruth = {
    expectedContradictionIds: new Set(["n1", "n2"]),
  };

  const metrics = computeTraceConsumptionMetrics([noteA, noteB, noteC], traceResult, groundTruth);
  assert.strictEqual(metrics.contradictionRecoveryRate, 1.0, "Both expected contradictions must be caught");
}

// ─── T40_stale_rescue_rate_with_ground_truth ─────────────────────────────────

export function T40_stale_rescue_rate_with_ground_truth() {
  const staleNote = makeNote("n1", "oat latte", { reinferenceMode: "needs_review" });

  const turns = [makeTurn("t1", "I always prefer oat latte in the morning.")];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([staleNote], events);

  const groundTruth = { expectedStaleRescueIds: new Set(["n1"]) };
  const metrics = computeTraceConsumptionMetrics([staleNote], traceResult, groundTruth);

  assert.strictEqual(metrics.staleNoteRescueRate, 1.0, "n1 is stale and trace supports it → rescued");
}

// ─── T40_stale_rescue_proxy_without_ground_truth ─────────────────────────────

export function T40_stale_rescue_proxy_without_ground_truth() {
  const stale1 = makeNote("n1", "oat milk", { reinferenceMode: "needs_review" });
  const stale2 = makeNote("n2", "espresso", { reinferenceMode: "needs_review" });

  // Trace only matches n1 (not n2)
  const turns = [makeTurn("t1", "I always prefer oat milk in my coffee.")];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([stale1, stale2], events);

  const metrics = computeTraceConsumptionMetrics([stale1, stale2], traceResult);

  // n1 matched, n2 didn't → 1 of 2 stale notes rescued = 0.5
  assert.strictEqual(metrics.staleNoteRescueRate, 0.5, "proxy: 1 of 2 stale notes rescued");
}

// ─── T40_noise_precision_loss_rate ───────────────────────────────────────────

export function T40_noise_precision_loss_rate() {
  const expectedNote = makeNote("n1", "coffee");
  const noiseNote = makeNote("n2", "oat milk");

  const turns = [
    makeTurn("t1", "I don't drink coffee anymore."),
    makeTurn("t2", "I always prefer oat milk."),
  ];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([expectedNote, noiseNote], events);

  const groundTruth = { expectedContradictionIds: new Set(["n1"]) };
  const metrics = computeTraceConsumptionMetrics([expectedNote, noiseNote], traceResult, groundTruth);

  // Matches for n2 are noise; n2 appears in allMatches but not in expectedIds
  assert.ok(metrics.noisePrecisionLossRate >= 0 && metrics.noisePrecisionLossRate <= 1);
}

// ─── T40_review_disambiguation_rate ──────────────────────────────────────────

export function T40_review_disambiguation_rate() {
  const needsReview1 = makeNote("n1", "coffee", { reinferenceMode: "needs_review", reviewState: "pending" });
  const needsReview2 = makeNote("n2", "tea", { reinferenceMode: "needs_review", reviewState: "pending" });

  // Trace provides a clear supports match for n1 only
  const turns = [makeTurn("t1", "I always prefer coffee in the morning, love it.")];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([needsReview1, needsReview2], events);

  const metrics = computeTraceConsumptionMetrics([needsReview1, needsReview2], traceResult);

  // n1 got disambiguated (supports match), n2 didn't → 0.5
  assert.strictEqual(metrics.reviewDisambiguationRate, 0.5, "n1 disambiguated by supports; n2 not");
}

// ─── T40_delta_metrics_vs_baseline_and_associative ───────────────────────────

export function T40_delta_metrics_vs_baseline_and_associative() {
  const note = makeNote("n1", "coffee");
  const turns = [makeTurn("t1", "Actually I don't drink coffee anymore.")];
  const events = turns.map(extractTraceEvent);
  const traceResult = runTraceConsumption([note], events);

  const groundTruth = { expectedContradictionIds: new Set(["n1"]) };
  const baselineComparison = {
    baselineContradictionRecoveryRate: 0.0,      // baseline caught nothing
    associativeContradictionRecoveryRate: 0.5,   // associative caught half
  };

  const metrics = computeTraceConsumptionMetrics([note], traceResult, groundTruth, baselineComparison);

  // Trace caught the contradiction → rate = 1.0
  assert.strictEqual(metrics.contradictionRecoveryRate, 1.0);
  // Delta vs baseline: 1.0 - 0.0 = +1.0
  assert.strictEqual(metrics.contradictionRecoveryDeltaVsBaseline, 1.0);
  // Delta vs associative: 1.0 - 0.5 = +0.5
  assert.strictEqual(metrics.contradictionRecoveryDeltaVsAssociative, 0.5);
}

// ─── T40_render_metrics_markdown ─────────────────────────────────────────────

export function T40_render_metrics_markdown() {
  const metrics = {
    contradictionRecoveryRate: 0.80,
    staleNoteRescueRate: 0.50,
    noisePrecisionLossRate: 0.20,
    reviewDisambiguationRate: 0.60,
    contradictionRecoveryDeltaVsBaseline: 0.80,
    contradictionRecoveryDeltaVsAssociative: 0.30,
    traceEventsConsumed: 12,
    totalMatches: 8,
    traceUtilisationRate: 0.667,
  };

  const md = renderTraceConsumptionMetricsMarkdown(metrics, "Test Report 3.10");
  assert.ok(md.includes("# Test Report 3.10"), "must include header");
  assert.ok(md.includes("Contradiction Recovery Rate"), "must include contradiction metric");
  assert.ok(md.includes("0.800"), "must include formatted value");
  assert.ok(md.includes("+0.800"), "must show positive delta");
  assert.ok(md.includes("Events Consumed**: 12"), "must include trace stats");
}
