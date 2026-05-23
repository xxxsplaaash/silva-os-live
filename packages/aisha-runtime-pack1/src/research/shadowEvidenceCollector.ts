/**
 * Pack 3.14 — Shadow Evidence Collector (Hot-Path Bridge)
 *
 * EVIDENCE COLLECTION ONLY. Not a live path, not a promotion decision.
 * This is the only production-touching piece in Pack 3.14.
 *
 * Responsibility: receive ShadowAuditEntry from Pack 3.12 shadow runs and
 * append them to a ShadowEvidenceStore instance supplied by the caller.
 *
 * Contract:
 *  - Does NOT modify the retrieval bundle, any note record, or any store
 *    that the generator reads.
 *  - All exceptions silently swallowed — never propagated to the hot path.
 *  - The ShadowEvidenceStore instance is injected by the caller; this module
 *    does not create or own a singleton store.
 *  - Associative and trace entries are dispatched to the same store but the
 *    store's lane index keeps them separated (see shadowEvidenceStore.ts).
 *  - No Date.now() in the callable path — clock is injected for determinism.
 */

import type { ShadowAuditEntry } from "../runtime/shadowRetrievalOrchestrator";
import type { ShadowEvidenceStore } from "./shadowEvidenceStore";

// ─── Collector Interface ──────────────────────────────────────────────────────

export interface IShadowEvidenceCollector {
  /**
   * Collect a shadow audit entry from Pack 3.12.
   * Must never throw. Returns the generated evidenceId, or null on failure.
   */
  collect(entry: ShadowAuditEntry, collectedAt: string): string | null;
}

// ─── Default Implementation ───────────────────────────────────────────────────

/**
 * Production shadow evidence collector.
 * Wraps ShadowEvidenceStore.append() in a silent try/catch.
 * Accepts an injected clock so callers control timestamps.
 */
export class ShadowEvidenceCollector implements IShadowEvidenceCollector {
  constructor(private readonly store: ShadowEvidenceStore) {}

  collect(entry: ShadowAuditEntry, collectedAt: string): string | null {
    try {
      return this.store.append(entry, collectedAt);
    } catch (err) {
      console.warn("[SHADOW][COLLECTOR] evidence append failed (swallowed):", err);
      return null;
    }
  }
}

// ─── No-Op Implementation ─────────────────────────────────────────────────────

/**
 * No-op collector for contexts where evidence collection is not configured.
 * Satisfies the interface without any side effects.
 */
export class NoOpShadowEvidenceCollector implements IShadowEvidenceCollector {
  collect(_entry: ShadowAuditEntry, _collectedAt: string): null {
    return null;
  }
}
