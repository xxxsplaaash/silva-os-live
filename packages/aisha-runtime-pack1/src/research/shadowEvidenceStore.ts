/**
 * Pack 3.14 — Shadow Evidence Collection Store
 *
 * EVIDENCE COLLECTION ONLY. Not a live path, not a promotion decision.
 * Provides an append-only in-process evidence store for ShadowAuditEntry[]
 * emitted by Pack 3.12 and operator annotations needed by Pack 3.13 aggregation.
 *
 * Design invariants:
 *  - Raw shadow payload (ShadowAuditEntry) is NEVER mutated after appending.
 *  - Operator annotations are stored as a separate overlay keyed by evidenceId.
 *  - Associative and trace lanes are internally separated; queries return one lane.
 *  - No I/O in this module — persistence is the caller's responsibility.
 *  - No imports from production runtime except shared value types and ShadowAuditEntry.
 *  - export() produces AnnotatedShadowEntry[] consumable by Pack 3.13 aggregateLaneEvidence().
 */

import type { ShadowAuditEntry } from "../runtime/shadowRetrievalOrchestrator";
import type { AnnotatedShadowEntry } from "./shadowDataReview";

// ─── Evidence Record ──────────────────────────────────────────────────────────

/**
 * An immutable raw shadow evidence record as stored in the collection.
 * The `payload` field is a frozen snapshot of the original ShadowAuditEntry.
 * It is never modified after creation.
 */
export interface ShadowEvidenceRecord {
  /** Stable unique ID for this evidence record. */
  evidenceId: string;
  /** ISO timestamp when this record was appended to the store. */
  collectedAt: string;
  /**
   * Frozen copy of the original ShadowAuditEntry.
   * Must not be mutated by any code path.
   */
  readonly payload: Readonly<ShadowAuditEntry>;
}

// ─── Operator Annotation Overlay ─────────────────────────────────────────────

/**
 * Operator annotations for a single evidence record.
 * Applied as an overlay keyed by evidenceId; never overwrites ShadowEvidenceRecord.payload.
 */
export interface ShadowEvidenceAnnotation {
  evidenceId: string;
  /** True when an operator has manually reviewed this entry. */
  operatorReviewed: boolean;
  /**
   * True when the operator confirmed a contradiction was correctly surfaced.
   * undefined = not yet annotated.
   */
  contradictionCaught?: boolean;
  /**
   * True when the operator flagged the shadow hit as noise.
   * undefined = not yet annotated.
   */
  noiseFlagged?: boolean;
  /**
   * True when real note graph size was logged alongside this evidence record.
   */
  noteGraphSizeLogged?: boolean;
  /**
   * Fraction of episodes with summary text at time of collection (trace lane only).
   */
  episodeSummaryPopulationRate?: number;
  /** ISO timestamp of the most recent annotation update. */
  annotatedAt?: string;
}

// ─── Evidence ID Generator ────────────────────────────────────────────────────

let _evidenceSeq = 0;

/**
 * Generate a deterministic evidence ID. Sequence resets on module reload.
 * For tests: call resetEvidenceSequence() before each fixture.
 */
export function makeEvidenceId(): string {
  _evidenceSeq += 1;
  return `ev_${String(_evidenceSeq).padStart(6, "0")}`;
}

export function resetEvidenceSequence(): void {
  _evidenceSeq = 0;
}

// ─── Shadow Evidence Store ────────────────────────────────────────────────────

/**
 * In-process append-only shadow evidence store.
 * Keeps associative and trace lanes in separate internal maps for O(1) lane filtering.
 * Thread-safety: this is single-process Node.js; no locking needed.
 */
export class ShadowEvidenceStore {
  /** Raw evidence records keyed by evidenceId. */
  private readonly records = new Map<string, ShadowEvidenceRecord>();
  /** Operator annotation overlays keyed by evidenceId. */
  private readonly annotations = new Map<string, ShadowEvidenceAnnotation>();
  /** Lane-separated ordered evidence ID lists. */
  private readonly laneIndex: { associative: string[]; trace: string[] } = {
    associative: [],
    trace: [],
  };

  /**
   * Append a new shadow audit entry as a frozen evidence record.
   * Returns the generated evidenceId.
   * NEVER modifies the passed entry — a frozen copy is stored.
   */
  append(entry: ShadowAuditEntry, collectedAt: string): string {
    const evidenceId = makeEvidenceId();
    const record: ShadowEvidenceRecord = {
      evidenceId,
      collectedAt,
      payload: Object.freeze({ ...entry }),
    };
    this.records.set(evidenceId, record);
    this.laneIndex[entry.lane].push(evidenceId);
    return evidenceId;
  }

  /**
   * Apply or update operator annotations for an evidence record.
   * Throws if the evidenceId is unknown — annotation must target a real record.
   * Does NOT modify the underlying payload.
   */
  annotate(evidenceId: string, annotation: Omit<ShadowEvidenceAnnotation, "evidenceId">, annotatedAt: string): void {
    if (!this.records.has(evidenceId)) {
      throw new Error(`ShadowEvidenceStore.annotate: unknown evidenceId "${evidenceId}"`);
    }
    const existing = this.annotations.get(evidenceId) ?? { evidenceId, operatorReviewed: false };
    this.annotations.set(evidenceId, {
      ...existing,
      ...annotation,
      evidenceId,
      annotatedAt,
    });
  }

  /**
   * Retrieve a single evidence record by ID.
   * Returns undefined if not found.
   */
  get(evidenceId: string): ShadowEvidenceRecord | undefined {
    return this.records.get(evidenceId);
  }

  /**
   * Retrieve the annotation overlay for an evidence record.
   * Returns undefined if no annotation has been applied.
   */
  getAnnotation(evidenceId: string): ShadowEvidenceAnnotation | undefined {
    return this.annotations.get(evidenceId);
  }

  /**
   * List all evidence IDs for a specific lane, in append order.
   */
  listByLane(lane: "associative" | "trace"): string[] {
    return [...this.laneIndex[lane]];
  }

  /**
   * Total number of evidence records in the store.
   */
  size(): number {
    return this.records.size;
  }

  /**
   * Export AnnotatedShadowEntry[] for a specific lane.
   * Merges raw payload with any operator annotation overlay.
   * Output is directly consumable by Pack 3.13 aggregateLaneEvidence().
   *
   * Raw payload fields are always authoritative.
   * Annotation fields are overlaid on top without touching payload.
   */
  exportForReview(lane: "associative" | "trace"): AnnotatedShadowEntry[] {
    return this.laneIndex[lane].map((evidenceId) => {
      const record = this.records.get(evidenceId)!;
      const annotation = this.annotations.get(evidenceId);
      return mergeForReview(record, annotation);
    });
  }

  /**
   * Export all evidence for all lanes, grouped by lane.
   * Lanes are never merged into a single array.
   */
  exportAll(): { associative: AnnotatedShadowEntry[]; trace: AnnotatedShadowEntry[] } {
    return {
      associative: this.exportForReview("associative"),
      trace: this.exportForReview("trace"),
    };
  }

  /**
   * Wipe all stored evidence and annotations. Call only in tests.
   * Never call in production code.
   */
  clear(): void {
    this.records.clear();
    this.annotations.clear();
    this.laneIndex.associative.length = 0;
    this.laneIndex.trace.length = 0;
  }
}

// ─── Merge Helper ─────────────────────────────────────────────────────────────

/**
 * Produce an AnnotatedShadowEntry by combining an immutable ShadowEvidenceRecord
 * with an optional annotation overlay.
 * Raw payload is authoritative; annotations extend but never replace it.
 * Pure function.
 */
export function mergeForReview(
  record: ShadowEvidenceRecord,
  annotation?: ShadowEvidenceAnnotation,
): AnnotatedShadowEntry {
  return {
    // Spread raw payload fields (immutable)
    ...record.payload,
    // Overlay annotation fields (caller-provided, default false/undefined)
    operatorReviewed: annotation?.operatorReviewed ?? false,
    contradictionCaught: annotation?.contradictionCaught,
    noiseFlagged: annotation?.noiseFlagged,
    noteGraphSizeLogged: annotation?.noteGraphSizeLogged,
    episodeSummaryPopulationRate: annotation?.episodeSummaryPopulationRate,
  };
}

// ─── JSON Serialization ───────────────────────────────────────────────────────

/**
 * Serialize the store contents to a JSON-safe snapshot for persistence.
 * Callers are responsible for writing to disk / remote storage.
 * Preserves lane separation in the snapshot format.
 */
export interface ShadowEvidenceSnapshot {
  version: 1;
  exportedAt: string;
  lanes: {
    associative: Array<{ record: ShadowEvidenceRecord; annotation?: ShadowEvidenceAnnotation }>;
    trace: Array<{ record: ShadowEvidenceRecord; annotation?: ShadowEvidenceAnnotation }>;
  };
}

export function exportSnapshot(store: ShadowEvidenceStore, exportedAt: string): ShadowEvidenceSnapshot {
  const buildLane = (lane: "associative" | "trace") =>
    store.listByLane(lane).map((evidenceId) => ({
      record: store.get(evidenceId)!,
      annotation: store.getAnnotation(evidenceId),
    }));

  return {
    version: 1,
    exportedAt,
    lanes: {
      associative: buildLane("associative"),
      trace: buildLane("trace"),
    },
  };
}

/**
 * Restore a ShadowEvidenceStore from a previously exported snapshot.
 * Raw payloads are re-frozen on restore. Sequence counter is NOT restored
 * (new records appended after restore get fresh IDs).
 */
export function importSnapshot(snapshot: ShadowEvidenceSnapshot): ShadowEvidenceStore {
  const store = new ShadowEvidenceStore();

  for (const lane of ["associative", "trace"] as const) {
    for (const { record, annotation } of snapshot.lanes[lane]) {
      // Re-insert preserving original evidenceId without calling append() to avoid
      // sequence mutation. Access private fields via a typed cast for test utility.
      (store as unknown as {
        records: Map<string, ShadowEvidenceRecord>;
        annotations: Map<string, ShadowEvidenceAnnotation>;
        laneIndex: { associative: string[]; trace: string[] };
      }).records.set(record.evidenceId, {
        ...record,
        payload: Object.freeze({ ...record.payload }),
      });
      if (annotation) {
        (store as unknown as { annotations: Map<string, ShadowEvidenceAnnotation> })
          .annotations.set(record.evidenceId, annotation);
      }
      (store as unknown as { laneIndex: { associative: string[]; trace: string[] } })
        .laneIndex[lane].push(record.evidenceId);
    }
  }

  return store;
}
