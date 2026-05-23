import type { NoteRecord } from "../memory/types";

export interface TruthCoherenceMetrics {
  /**
   * Fraction of notes that maintained consistent normalizedValue across all sessions.
   * 1.0 if no notes exist (vacuously stable). Computed per-note across all session snapshots.
   */
  stabilityRate: number;

  /**
   * Fraction of noted contradictions (notes that are superseded/disputed in at least one session)
   * that ended up in a non-active state by the final session snapshot.
   * 0.0 if no contradictions observed.
   */
  contradictionRecoveryRate: number;

  /**
   * Count of notes that transitioned from `reinferencePolicy.mode === "allow"` to
   * `reinferencePolicy.mode === "needs_review"` between consecutive session snapshots.
   */
  stalePromotionCount: number;

  /**
   * Count of notes that were `status === "active"` in every session snapshot
   * (present and not superseded, disputed, or archived in any session).
   */
  persistedThroughoutCount: number;

  // --- Pack 3.6 Metrics ---
  /**
   * Fraction of notes that entered 'needs_review' state and subsequently had their normalizedValue mutated
   * in a future session snapshot.
   */
  staleNoteDriftRate: number;

  /**
   * Fraction of ground-truth expected contradictions that the critic loop successfully caught
   * (identified by note IDs that were expected to be disputed/superseded and actually were).
   */
  criticCatchRate: number;

  /**
   * Fraction of superseded notes that were falsely superseded (not in the expectedSupersededIds ground truth).
   */
  falseSupersessionRate: number;

  /**
   * Fraction of notes that persisted as active but were expected to be superseded/archived.
   */
  falsePersistenceRate: number;
}

export interface MultiSessionGroundTruth {
  expectedSupersededIds?: Set<string>;
  expectedPersistedIds?: Set<string>;
  expectedContradictionIds?: Set<string>;
}

/**
 * Computes truth-coherence metrics across a sequence of per-session note snapshots.
 *
 * @param sessionSnapshots - Array of per-session `NoteRecord[]` snapshots, ordered from
 *   oldest session to newest. Each entry represents all notes visible at session boundary.
 *
 * Pure function — no I/O, no async, no Date.now().
 */
export function computeTruthCoherenceMetrics(
  sessionSnapshots: NoteRecord[][],
  groundTruth?: MultiSessionGroundTruth,
): TruthCoherenceMetrics {
  if (sessionSnapshots.length === 0) {
    return {
      stabilityRate: 1.0,
      contradictionRecoveryRate: 0,
      stalePromotionCount: 0,
      persistedThroughoutCount: 0,
      staleNoteDriftRate: 0,
      criticCatchRate: 0,
      falseSupersessionRate: 0,
      falsePersistenceRate: 0,
    };
  }

  // ── Stability Rate ────────────────────────────────────────────────────────
  // For each note ID that appears in at least two sessions, check whether its
  // normalizedValue is consistent across all sessions it appears in.
  const noteValuesById = new Map<string, Set<string>>();

  for (const snapshot of sessionSnapshots) {
    for (const note of snapshot) {
      const val = note.normalizedValue ?? note.canonicalText;
      const existing = noteValuesById.get(note.id) ?? new Set();
      existing.add(val);
      noteValuesById.set(note.id, existing);
    }
  }

  let stableCount = 0;
  let totalTracked = 0;
  for (const valueSet of noteValuesById.values()) {
    totalTracked++;
    if (valueSet.size === 1) stableCount++;
  }

  const stabilityRate = totalTracked === 0 ? 1.0 : stableCount / totalTracked;

  // ── Contradiction Recovery Rate ───────────────────────────────────────────
  // A "noted contradiction" is a note that appears as superseded/disputed in any snapshot.
  // It's "recovered" if it appears only in non-active states in the final snapshot,
  // or does not appear at all in the final snapshot.
  const finalSnapshot = sessionSnapshots[sessionSnapshots.length - 1] ?? [];
  const finalById = new Map<string, NoteRecord>();
  for (const note of finalSnapshot) {
    finalById.set(note.id, note);
  }

  const contradictionIds = new Set<string>();
  for (const snapshot of sessionSnapshots) {
    for (const note of snapshot) {
      if (note.status === "superseded" || note.status === "disputed") {
        contradictionIds.add(note.id);
      }
    }
  }

  let recoveredCount = 0;
  for (const id of contradictionIds) {
    const finalNote = finalById.get(id);
    // Recovered if absent from final snapshot or non-active in final snapshot
    if (!finalNote || finalNote.status !== "active") {
      recoveredCount++;
    }
  }

  const contradictionRecoveryRate =
    contradictionIds.size === 0 ? 0 : recoveredCount / contradictionIds.size;

  // ── Stale Promotion Count ─────────────────────────────────────────────────
  // Count transitions where a note goes from mode "allow" in session N to "needs_review"
  // in session N+1 (or later), treating the first occurrence of a note as its baseline.
  const noteFirstSeenMode = new Map<string, string>();
  let stalePromotionCount = 0;

  for (const snapshot of sessionSnapshots) {
    for (const note of snapshot) {
      const mode = note.reinferencePolicy.mode;
      const prevMode = noteFirstSeenMode.get(note.id);

      if (prevMode === undefined) {
        noteFirstSeenMode.set(note.id, mode);
      } else if (prevMode === "allow" && mode === "needs_review") {
        stalePromotionCount++;
        // Update the tracked mode so we don't double-count
        noteFirstSeenMode.set(note.id, mode);
      }
    }
  }

  // ── Persisted Throughout Count ────────────────────────────────────────────
  // A note "persisted throughout" if it appears in ALL session snapshots as active.
  const noteSessionAppearances = new Map<string, { active: number; total: number }>();

  for (const snapshot of sessionSnapshots) {
    const seenInThisSnapshot = new Set<string>();
    for (const note of snapshot) {
      if (seenInThisSnapshot.has(note.id)) continue;
      seenInThisSnapshot.add(note.id);

      const counts = noteSessionAppearances.get(note.id) ?? { active: 0, total: 0 };
      counts.total++;
      if (note.status === "active") counts.active++;
      noteSessionAppearances.set(note.id, counts);
    }
  }

  let persistedThroughoutCount = 0;
  for (const [, counts] of noteSessionAppearances) {
    if (counts.total === sessionSnapshots.length && counts.active === sessionSnapshots.length) {
      persistedThroughoutCount++;
    }
  }

  // ── Pack 3.6: Stale Note Drift Rate ───────────────────────────────────────
  // A note drifts if it was "needs_review" and then its value changes in a future session.
  let staleDriftCount = 0;
  let totalStaleNotes = 0;
  const staleNotesWithValues = new Map<string, Set<string>>();

  for (const snapshot of sessionSnapshots) {
    for (const note of snapshot) {
      if (note.reinferencePolicy.mode === "needs_review") {
        const val = note.normalizedValue ?? note.canonicalText;
        const existing = staleNotesWithValues.get(note.id) ?? new Set();
        if (existing.size === 0) totalStaleNotes++; // first time tracked as stale
        existing.add(val);
        staleNotesWithValues.set(note.id, existing);
      }
    }
  }

  for (const valueSet of staleNotesWithValues.values()) {
    if (valueSet.size > 1) staleDriftCount++;
  }

  const staleNoteDriftRate = totalStaleNotes === 0 ? 0 : staleDriftCount / totalStaleNotes;

  // ── Pack 3.6: Ground Truth Metrics ────────────────────────────────────────
  let criticCatchRate = 0;
  let falseSupersessionRate = 0;
  let falsePersistenceRate = 0;

  if (groundTruth) {
    // Critic catch rate: fraction of expectedContradictionIds that actually ended up superseded/disputed
    if (groundTruth.expectedContradictionIds && groundTruth.expectedContradictionIds.size > 0) {
      let caughtCount = 0;
      for (const expectedId of groundTruth.expectedContradictionIds) {
        if (contradictionIds.has(expectedId)) caughtCount++;
      }
      criticCatchRate = caughtCount / groundTruth.expectedContradictionIds.size;
    }

    // False supersession rate: fraction of actually superseded notes that were NOT in expectedSupersededIds
    if (groundTruth.expectedSupersededIds) {
      const actuallySuperseded = Array.from(contradictionIds); // ID was superseded/disputed at some point
      let falseSuperCount = 0;
      for (const id of actuallySuperseded) {
        if (!groundTruth.expectedSupersededIds.has(id)) falseSuperCount++;
      }
      falseSupersessionRate = actuallySuperseded.length === 0 ? 0 : falseSuperCount / actuallySuperseded.length;
    }

    // False persistence rate: notes that persisted throughout but were not in expectedPersistedIds
    // (or, conversely, notes that were active in the final snapshot but were expected to be superseded)
    if (groundTruth.expectedSupersededIds) {
      const finalActiveIds = Array.from(finalById.values()).filter(n => n.status === "active").map(n => n.id);
      let falsePersistCount = 0;
      for (const id of finalActiveIds) {
        if (groundTruth.expectedSupersededIds.has(id)) falsePersistCount++;
      }
      // Rate = fraction of final active notes that should have been superseded
      falsePersistenceRate = finalActiveIds.length === 0 ? 0 : falsePersistCount / finalActiveIds.length;
    }
  }

  return {
    stabilityRate,
    contradictionRecoveryRate,
    stalePromotionCount,
    persistedThroughoutCount,
    staleNoteDriftRate,
    criticCatchRate,
    falseSupersessionRate,
    falsePersistenceRate,
  };
}
