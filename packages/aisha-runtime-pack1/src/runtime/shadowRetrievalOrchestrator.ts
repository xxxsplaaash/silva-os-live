/**
 * Pack 3.12 — Shadow Retrieval Instrumentation
 *
 * SHADOW MODE ONLY. Not a live retrieval path.
 * Approved by Pack 3.11 Option D: shadow-mode promotion of both associative
 * retrieval and trace consumption, independently, feature-flag-gated, default OFF.
 *
 * Contract (non-negotiable per Pack 3.11 §9):
 *  - Does NOT modify bundle.activeNotes, bundle.contradictionEvidence,
 *    bundle.supportingEpisodes, or any generator-visible field.
 *  - Does NOT write to noteVersioning, turnStore, threadStore, or any persistent store.
 *  - Exceptions are silently swallowed and logged — never propagated.
 *  - Results are written only to the operator audit log (OperatorAuditEntry).
 *  - Hard latency gate: if either lane exceeds SHADOW_LATENCY_HARD_LIMIT_MS on
 *    three consecutive turns, that lane's flag is automatically disabled.
 *  - The two lanes are independent: their outputs are NEVER merged.
 */

import type { NoteRecord, NoteLinkRecord, TurnRecord, RetrievalBundle } from "../memory/types";
import type { OperatorAuditEntry } from "../memory/operatorAuditTrail";
import {
  buildAcceptanceAuditEntry,
  makeAuditId,
} from "../memory/operatorAuditTrail";
import {
  runAssociativeRetrieval,
} from "../research/associativeRetrieval";
import {
  extractTraceEvent,
  runTraceConsumption,
} from "../research/traceConsumption";

// ─── Feature Flags ────────────────────────────────────────────────────────────

/**
 * Read feature flags from process.env. Both default to OFF.
 * Never call this in a tight loop; read once per turn at the call site.
 */
export function readShadowFlags(): { associative: boolean; trace: boolean } {
  return {
    associative: process.env.AISHA_SHADOW_ASSOCIATIVE === "1",
    trace: process.env.AISHA_SHADOW_TRACE === "1",
  };
}

// ─── Hard Latency Auto-Disable ────────────────────────────────────────────────

/** Pack 3.11 §9.4: auto-disable if exceeded on 3 consecutive turns. */
export const SHADOW_LATENCY_HARD_LIMIT_MS = 15;
const SHADOW_CONSECUTIVE_LIMIT = 3;

// Mutable counters — module-level, reset on server restart.
// Intentionally not persisted: conservative reset is safe.
const _consecutiveOverruns = { associative: 0, trace: 0 };
const _autoDisabled = { associative: false, trace: false };

export function isShadowAutoDisabled(lane: "associative" | "trace"): boolean {
  return _autoDisabled[lane];
}

/**
 * Record a latency sample for a lane. If the hard limit is exceeded on
 * SHADOW_CONSECUTIVE_LIMIT consecutive turns, the lane is auto-disabled.
 * Returns true if the lane was just auto-disabled.
 */
export function recordShadowLatency(lane: "associative" | "trace", latencyMs: number): boolean {
  if (latencyMs > SHADOW_LATENCY_HARD_LIMIT_MS) {
    _consecutiveOverruns[lane] += 1;
    if (_consecutiveOverruns[lane] >= SHADOW_CONSECUTIVE_LIMIT && !_autoDisabled[lane]) {
      _autoDisabled[lane] = true;
      console.error(
        `[SHADOW][${lane.toUpperCase()}] AUTO-DISABLED: exceeded ${SHADOW_LATENCY_HARD_LIMIT_MS}ms ` +
        `on ${SHADOW_CONSECUTIVE_LIMIT} consecutive turns. Set AISHA_SHADOW_${lane.toUpperCase()}=0 to acknowledge.`,
      );
      return true;
    }
  } else {
    _consecutiveOverruns[lane] = 0;
  }
  return false;
}

/**
 * Reset auto-disable state. Call only in tests.
 * Never call in production code.
 */
export function resetShadowAutoDisable(): void {
  _consecutiveOverruns.associative = 0;
  _consecutiveOverruns.trace = 0;
  _autoDisabled.associative = false;
  _autoDisabled.trace = false;
}

// ─── Shadow Audit Entry Type ──────────────────────────────────────────────────

export interface ShadowAuditEntry {
  auditKind: "shadow_retrieval_research";
  lane: "associative" | "trace";
  sessionId: string;
  turnId: string;
  /** Number of notes in the finalized baseline retrieval bundle. */
  baselineNoteCount: number;
  /** Number of shadow-lane hits produced (not injected into bundle). */
  shadowHitCount: number;
  /**
   * Estimated token delta if the shadow hits were injected into the prompt.
   * Computed as: shadowHitCount × AVG_NOTE_TOKEN_COST (35 tokens per note).
   * Used to predict prompt budget impact for Pack 3.12 gate evidence.
   */
  estimatedTokenDelta: number;
  /** Wall-time latency of the shadow call in milliseconds. */
  latencyMs: number;
  /**
   * Fraction of shadow hits that match notes already flagged as needs_review.
   * Available as a proxy for review disambiguation usefulness.
   */
  reviewDisambiguationEstimate: number;
  /**
   * Fraction of shadow hits that are from a different episode than any baseline note.
   * Available for cross-episode diversity measurement.
   */
  crossEpisodeDiversityEstimate: number;
  /** Whether the lane was auto-disabled on this turn (latency limit exceeded). */
  autoDisabledThisTurn: boolean;
}

// ─── Token Cost Estimate ──────────────────────────────────────────────────────

/** Conservative per-note token estimate for prompt budget projection. */
const AVG_NOTE_TOKEN_COST = 35;

// ─── Associative Shadow Run ───────────────────────────────────────────────────

/**
 * Run the associative retrieval shadow lane.
 * Returns null if the lane is disabled or throws any error.
 * NEVER modifies the retrieval bundle.
 */
export async function runAssociativeShadow(params: {
  retrieval: RetrievalBundle;
  allLinks: NoteLinkRecord[];
  eligibleNotes: NoteRecord[];
  sessionId: string;
  turnId: string;
}): Promise<ShadowAuditEntry | null> {
  const { retrieval, allLinks, eligibleNotes, sessionId, turnId } = params;

  const baselineIds = new Set(retrieval.activeNotes.map((n) => n.id));
  const baselineEpisodeIds = new Set(retrieval.activeNotes.flatMap((n) => n.sourceEpisodeIds));

  const t0 = Date.now();
  let result: ReturnType<typeof runAssociativeRetrieval>;

  try {
    result = runAssociativeRetrieval(baselineIds, allLinks, eligibleNotes, 6);
  } catch (err) {
    console.warn("[SHADOW][ASSOCIATIVE] error during shadow run (swallowed):", err);
    return null;
  }

  const latencyMs = Date.now() - t0;
  const autoDisabled = recordShadowLatency("associative", latencyMs);

  const hits = result.hits;
  const shadowHitCount = hits.length;

  // Review disambiguation estimate: fraction of hits that are needs_review notes
  const needsReviewHits = hits.filter(
    (h) => h.note.reinferencePolicy.mode === "needs_review" || h.note.reviewState === "pending",
  ).length;
  const reviewDisambiguationEstimate =
    shadowHitCount === 0 ? 0 : needsReviewHits / shadowHitCount;

  // Cross-episode diversity estimate: fraction from a different episode than any baseline note
  const crossEpisodeHits = hits.filter(
    (h) => !h.note.sourceEpisodeIds.some((epId) => baselineEpisodeIds.has(epId)),
  ).length;
  const crossEpisodeDiversityEstimate =
    shadowHitCount === 0 ? 0 : crossEpisodeHits / shadowHitCount;

  return {
    auditKind: "shadow_retrieval_research",
    lane: "associative",
    sessionId,
    turnId,
    baselineNoteCount: retrieval.activeNotes.length,
    shadowHitCount,
    estimatedTokenDelta: shadowHitCount * AVG_NOTE_TOKEN_COST,
    latencyMs,
    reviewDisambiguationEstimate,
    crossEpisodeDiversityEstimate,
    autoDisabledThisTurn: autoDisabled,
  };
}

// ─── Trace Shadow Run ─────────────────────────────────────────────────────────

/**
 * Run the trace consumption shadow lane.
 * Returns null if the lane is disabled or throws any error.
 * NEVER modifies the retrieval bundle.
 */
export async function runTraceShadow(params: {
  retrieval: RetrievalBundle;
  recentTurns: TurnRecord[];
  sessionId: string;
  turnId: string;
}): Promise<ShadowAuditEntry | null> {
  const { retrieval, recentTurns, sessionId, turnId } = params;

  const baselineEpisodeIds = new Set(retrieval.activeNotes.flatMap((n) => n.sourceEpisodeIds));

  const t0 = Date.now();
  let traceResult: ReturnType<typeof runTraceConsumption>;

  try {
    const events = recentTurns.map(extractTraceEvent);
    traceResult = runTraceConsumption(retrieval.activeNotes, events, 20);
  } catch (err) {
    console.warn("[SHADOW][TRACE] error during shadow run (swallowed):", err);
    return null;
  }

  const latencyMs = Date.now() - t0;
  const autoDisabled = recordShadowLatency("trace", latencyMs);

  // For trace, "shadow hits" = notes that received any match (supported or contradicted)
  const matchedNoteIds = new Set(traceResult.allMatches.map((m) => m.noteId));
  const shadowHitCount = matchedNoteIds.size;

  // Review disambiguation: gated notes that received a supporting or contradicting match
  const needsReviewNotes = retrieval.activeNotes.filter(
    (n) => n.reinferencePolicy.mode === "needs_review" || n.reviewState === "pending",
  );
  const disambiguated = needsReviewNotes.filter((n) =>
    traceResult.allMatches.some(
      (m) => m.noteId === n.id && (m.matchType === "supports" || m.matchType === "contradicts"),
    ),
  ).length;
  const reviewDisambiguationEstimate =
    needsReviewNotes.length === 0 ? 0 : disambiguated / needsReviewNotes.length;

  // For trace, cross-episode is not meaningful in the same way (trace reads recentTurns,
  // not episode boundaries), so we report 0 for this lane.
  const crossEpisodeDiversityEstimate = 0;

  return {
    auditKind: "shadow_retrieval_research",
    lane: "trace",
    sessionId,
    turnId,
    baselineNoteCount: retrieval.activeNotes.length,
    shadowHitCount,
    estimatedTokenDelta: shadowHitCount * AVG_NOTE_TOKEN_COST,
    latencyMs,
    reviewDisambiguationEstimate,
    crossEpisodeDiversityEstimate,
    autoDisabledThisTurn: autoDisabled,
  };
}

// ─── Audit Entry Serializer ───────────────────────────────────────────────────

/**
 * Convert a ShadowAuditEntry into an OperatorAuditEntry for Pack 3.8 log
 * compatibility. The canonicalText field carries the JSON-serialized shadow
 * audit data so it is fully machine-readable.
 */
export function shadowAuditToOperatorEntry(shadow: ShadowAuditEntry): OperatorAuditEntry {
  return buildAcceptanceAuditEntry({
    auditId: makeAuditId(),
    timestamp: new Date().toISOString(),
    noteId: `shadow_${shadow.lane}_${shadow.turnId}`,
    subtype: "shadow_retrieval_research",
    canonicalText: JSON.stringify({
      auditKind: shadow.auditKind,
      lane: shadow.lane,
      baselineNoteCount: shadow.baselineNoteCount,
      shadowHitCount: shadow.shadowHitCount,
      estimatedTokenDelta: shadow.estimatedTokenDelta,
      latencyMs: shadow.latencyMs,
      reviewDisambiguationEstimate: shadow.reviewDisambiguationEstimate,
      crossEpisodeDiversityEstimate: shadow.crossEpisodeDiversityEstimate,
      autoDisabledThisTurn: shadow.autoDisabledThisTurn,
    }),
    outcome: "accepted",          // nominal — shadow entries don't have a gating outcome
    primaryReason: "default_pending",
    allReasons: ["default_pending"],
    signals: {
      trust: 0,
      caution: 0,
      confidence: 1,
      hasContradiction: false,
      contradictionCount: 0,
    },
  });
}
