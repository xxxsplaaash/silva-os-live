import { NoteRecord, TurnRecord } from "./types";

export type PersistedReviewReason =
  | "retrieved_weak_stale_note"
  | "contradiction_sensitive_lower_support"
  | "soft_signal_increment"; // Pack 4.2: soft signal below escalation threshold; increments count only

export interface PersistedReviewSignal {
  noteId: string;
  reason: PersistedReviewReason;
}

const STALE_DAYS_THRESHOLD = 14;
const WEAK_CONFIDENCE_THRESHOLD = 0.72;
const LOW_EVIDENCE_THRESHOLD = 1;
const RETRIEVAL_REVIEW_PENALTY = 0.08;
const CONTRADICTION_REVIEW_PENALTY = 0.1;

// Named constants for T7 caps to prevent review storms
export const MAX_RECONSOLIDATION_SIGNALS_PER_TURN = 2;

/**
 * Pack 4.2: Soft reconsolidation signals are only escalated to `needs_review`
 * after this many consecutive qualifying retrievals. Below this threshold,
 * the signal is recorded as `soft_signal_increment` (count-only, no escalation).
 */
export const SOFT_SIGNAL_ESCALATION_THRESHOLD = 2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function noteTimestamp(note: NoteRecord): number {
  const raw =
    note.lastConfirmedAt ??
    note.updatedAt ??
    note.createdAt ??
    "1970-01-01T00:00:00.000Z";

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function daysBetween(olderMs: number, newerMs: number): number {
  const delta = Math.max(0, newerMs - olderMs);
  return delta / (1000 * 60 * 60 * 24);
}

function contradictionSensitive(turn: TurnRecord): boolean {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    turn.rawText,
  );
}

function trackKey(
  note: Pick<
    NoteRecord,
    | "subtype"
    | "subjectKind"
    | "subjectSpeakerId"
    | "subjectPersonId"
    | "relationshipContextPersonId"
  >,
): string {
  return [
    note.subtype,
    note.subjectKind,
    note.subjectSpeakerId ?? "",
    note.subjectPersonId ?? "",
    note.relationshipContextPersonId ?? "",
  ].join("|");
}

function supportComparison(a: NoteRecord, b: NoteRecord): number {
  if (a.sourceEpisodeIds.length !== b.sourceEpisodeIds.length) {
    return a.sourceEpisodeIds.length - b.sourceEpisodeIds.length;
  }

  const aTime = noteTimestamp(a);
  const bTime = noteTimestamp(b);
  if (aTime !== bTime) {
    return aTime - bTime;
  }

  if (a.confidence !== b.confidence) {
    return a.confidence - b.confidence;
  }

  return b.id.localeCompare(a.id) * -1;
}

function bestNoteByTrack(notes: NoteRecord[]): Map<string, NoteRecord> {
  const best = new Map<string, NoteRecord>();

  for (const note of notes) {
    const key = trackKey(note);
    const existing = best.get(key);

    if (!existing || supportComparison(note, existing) > 0) {
      best.set(key, note);
    }
  }

  return best;
}

function maybeNeedsConfirmation(
  note: NoteRecord,
  currentTurn: TurnRecord,
): boolean {
  const turnTime = Date.parse(currentTurn.createdAt);
  const ageDays = daysBetween(
    noteTimestamp(note),
    Number.isNaN(turnTime) ? Date.now() : turnTime,
  );

  return (
    ageDays >= STALE_DAYS_THRESHOLD &&
    note.confidence <= WEAK_CONFIDENCE_THRESHOLD &&
    note.sourceEpisodeIds.length <= LOW_EVIDENCE_THRESHOLD
  );
}

function cloneWithReviewPenalty(
  note: NoteRecord,
  penalty: number,
  reason: PersistedReviewReason,
): NoteRecord {
  const nextConfidence = round2(Math.max(0.55, note.confidence - penalty));

  return {
    ...note,
    confidence: nextConfidence,
    reviewState: "pending",
    reinferencePolicy: {
      mode: "needs_review",
      reason,
    },
  };
}

function resolvePersistentReviewReason(input: {
  note: NoteRecord;
  currentTurn: TurnRecord;
  bestByTrack: Map<string, NoteRecord>;
}): PersistedReviewReason | undefined {
  const { note, currentTurn, bestByTrack } = input;
  const contradictionMode = contradictionSensitive(currentTurn);
  const best = bestByTrack.get(trackKey(note));

  if (
    contradictionMode &&
    best &&
    best.id !== note.id &&
    supportComparison(best, note) > 0
  ) {
    return "contradiction_sensitive_lower_support";
  }

  return undefined;
}

export function reviewRetrievedActiveNotes(input: {
  currentTurn: TurnRecord;
  activeNotes: NoteRecord[];
}): NoteRecord[] {
  const bestByTrack = bestNoteByTrack(input.activeNotes);

  return input.activeNotes.map((note) => {
    const reason = resolvePersistentReviewReason({
      note,
      currentTurn: input.currentTurn,
      bestByTrack,
    });

    if (!reason) {
      return note;
    }

    if (reason === "contradiction_sensitive_lower_support") {
      return cloneWithReviewPenalty(
        note,
        CONTRADICTION_REVIEW_PENALTY,
        reason,
      );
    }

    return cloneWithReviewPenalty(note, RETRIEVAL_REVIEW_PENALTY, reason);
  });
}

// Contradiction signals specifically (highest priority, but capped)
export function derivePersistedReviewSignals(input: {
  currentTurn: TurnRecord;
  activeNotes: NoteRecord[];
}): PersistedReviewSignal[] {
  const bestByTrack = bestNoteByTrack(input.activeNotes);
  const byNoteId = new Map<string, PersistedReviewSignal>();

  for (const note of input.activeNotes) {
    const reason = resolvePersistentReviewReason({
      note,
      currentTurn: input.currentTurn,
      bestByTrack,
    });

    if (reason === "contradiction_sensitive_lower_support") {
      byNoteId.set(note.id, {
        noteId: note.id,
        reason,
      });

      if (byNoteId.size >= MAX_RECONSOLIDATION_SIGNALS_PER_TURN) {
        break;
      }
    }
  }

  return [...byNoteId.values()];
}

// Low-priority background signals (capped to fill remaining budget)
export function deriveRetrievalReviewSignals(input: {
  currentTurn: TurnRecord;
  activeNotes: NoteRecord[];
}): PersistedReviewSignal[] {
  const signals: PersistedReviewSignal[] = [];

  for (const note of input.activeNotes) {
    if (maybeNeedsConfirmation(note, input.currentTurn)) {
      signals.push({
        noteId: note.id,
        reason: "retrieved_weak_stale_note",
      });

      if (signals.length >= MAX_RECONSOLIDATION_SIGNALS_PER_TURN) {
        break;
      }
    }
  }

  return signals;
}

/**
 * Pack 4.2: Frequency-gated version of deriveRetrievalReviewSignals.
 *
 * If a note qualifies for a soft signal (retrieved_weak_stale_note):
 * - If (reconsolidationSignalCount + 1) < SOFT_SIGNAL_ESCALATION_THRESHOLD:
 *   emits `soft_signal_increment` (count-only; no `needs_review` escalation).
 * - If (reconsolidationSignalCount + 1) >= SOFT_SIGNAL_ESCALATION_THRESHOLD:
 *   emits `retrieved_weak_stale_note` (full escalation).
 *
 * Contradiction signals are handled separately and bypass frequency gating entirely.
 */
export function deriveGatedRetrievalSignals(input: {
  currentTurn: TurnRecord;
  activeNotes: NoteRecord[];
}): PersistedReviewSignal[] {
  const signals: PersistedReviewSignal[] = [];

  for (const note of input.activeNotes) {
    if (maybeNeedsConfirmation(note, input.currentTurn)) {
      const currentCount = note.reconsolidationSignalCount ?? 0;
      const nextCount = currentCount + 1;
      const reason: PersistedReviewReason =
        nextCount >= SOFT_SIGNAL_ESCALATION_THRESHOLD
          ? "retrieved_weak_stale_note"
          : "soft_signal_increment";

      signals.push({ noteId: note.id, reason });

      if (signals.length >= MAX_RECONSOLIDATION_SIGNALS_PER_TURN) {
        break;
      }
    }
  }

  return signals;
}

/**
 * Unified signal budget enforcer.
 * Contradiction signals take priority and bypass frequency gating.
 * Soft/stale signals are frequency-gated via deriveGatedRetrievalSignals (Pack 4.2).
 * Combined total never exceeds MAX_RECONSOLIDATION_SIGNALS_PER_TURN.
 */
export function deriveCombinedReviewSignals(input: {
  currentTurn: TurnRecord;
  activeNotes: NoteRecord[];
}): PersistedReviewSignal[] {
  const contradictionSignals = derivePersistedReviewSignals(input);
  const remainingBudget = MAX_RECONSOLIDATION_SIGNALS_PER_TURN - contradictionSignals.length;

  if (remainingBudget <= 0) return contradictionSignals;

  const coveredNoteIds = new Set(contradictionSignals.map((s) => s.noteId));

  // Pack 4.2: use frequency-gated version for soft signals
  const softSignals = deriveGatedRetrievalSignals(input)
    .filter((s) => !coveredNoteIds.has(s.noteId))
    .slice(0, remainingBudget);

  return [...contradictionSignals, ...softSignals];
}

export function tightenContradictionEvidenceLinkage(input: {
  activeNotes: NoteRecord[];
  contradictionEvidence: NoteRecord[];
}): NoteRecord[] {
  if (!input.contradictionEvidence.length || !input.activeNotes.length) {
    return input.contradictionEvidence;
  }

  const activeTracks = new Set(input.activeNotes.map((note) => trackKey(note)));

  const linked = input.contradictionEvidence.filter((note) =>
    activeTracks.has(trackKey(note)),
  );

  return linked.length > 0 ? linked : input.contradictionEvidence;
}
