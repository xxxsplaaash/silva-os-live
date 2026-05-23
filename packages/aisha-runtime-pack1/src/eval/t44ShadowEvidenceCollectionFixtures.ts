/**
 * T44 — Pack 3.14 Shadow Evidence Collection Fixtures
 *
 * EVIDENCE COLLECTION ONLY. Deterministic pure tests over:
 *   - ShadowEvidenceStore (append, annotate, export, snapshot)
 *   - ShadowEvidenceCollector / NoOpShadowEvidenceCollector
 *   - mergeForReview integration with Pack 3.13 aggregateLaneEvidence()
 *
 * Coverage:
 *   T44_append_stores_frozen_payload
 *   T44_append_preserves_lane_separation
 *   T44_raw_payload_is_not_mutated_by_annotation
 *   T44_annotation_unknown_evidenceid_throws
 *   T44_annotation_overlay_merges_without_touching_payload
 *   T44_export_for_review_includes_all_annotation_fields
 *   T44_export_for_review_unannotated_defaults_operatorreview_false
 *   T44_exportall_never_merges_lanes
 *   T44_collector_returns_evidenceid
 *   T44_collector_silently_handles_store_errors
 *   T44_noop_collector_returns_null
 *   T44_snapshot_export_preserves_lane_separation
 *   T44_snapshot_import_restores_records_and_annotations
 *   T44_imported_snapshot_payload_is_frozen
 *   T44_export_consumable_by_pack313_aggregation
 *   T44_evidence_ids_are_unique_per_append
 *
 * No live LLM. No I/O. All deterministic.
 */

import * as assert from "assert";
import {
  ShadowEvidenceStore,
  mergeForReview,
  exportSnapshot,
  importSnapshot,
  resetEvidenceSequence,
  type ShadowEvidenceRecord,
  type ShadowEvidenceAnnotation,
} from "../research/shadowEvidenceStore";
import {
  ShadowEvidenceCollector,
  NoOpShadowEvidenceCollector,
} from "../research/shadowEvidenceCollector";
import { aggregateLaneEvidence } from "../research/shadowDataReview";
import type { ShadowAuditEntry } from "../runtime/shadowRetrievalOrchestrator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-26T14:00:00.000Z";
const FIXED_ANNOTATED = "2026-04-26T15:00:00.000Z";

function makeShadowEntry(lane: "associative" | "trace", overrides: Partial<ShadowAuditEntry> = {}): ShadowAuditEntry {
  return {
    auditKind: "shadow_retrieval_research",
    lane,
    sessionId: "s_t44",
    turnId: `turn_${lane}_1`,
    baselineNoteCount: 5,
    shadowHitCount: 2,
    estimatedTokenDelta: 70,
    latencyMs: 3,
    reviewDisambiguationEstimate: 0.4,
    crossEpisodeDiversityEstimate: 0.5,
    autoDisabledThisTurn: false,
    ...overrides,
  };
}

// ─── T44_append_stores_frozen_payload ────────────────────────────────────────

export function T44_append_stores_frozen_payload() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const entry = makeShadowEntry("associative");

  const evidenceId = store.append(entry, FIXED_NOW);
  const record = store.get(evidenceId);

  assert.ok(record, "record must be stored");
  assert.strictEqual(record!.evidenceId, evidenceId);
  assert.strictEqual(record!.collectedAt, FIXED_NOW);

  // Payload must be frozen
  assert.ok(Object.isFrozen(record!.payload), "payload must be frozen");

  store.clear();
}

// ─── T44_append_preserves_lane_separation ────────────────────────────────────

export function T44_append_preserves_lane_separation() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();

  store.append(makeShadowEntry("associative"), FIXED_NOW);
  store.append(makeShadowEntry("trace"), FIXED_NOW);
  store.append(makeShadowEntry("associative"), FIXED_NOW);

  const assocIds = store.listByLane("associative");
  const traceIds = store.listByLane("trace");

  assert.strictEqual(assocIds.length, 2, "must have 2 associative entries");
  assert.strictEqual(traceIds.length, 1, "must have 1 trace entry");
  assert.strictEqual(store.size(), 3, "total size must be 3");

  // No ID overlap between lanes
  const assocSet = new Set(assocIds);
  for (const id of traceIds) {
    assert.ok(!assocSet.has(id), `trace evidenceId ${id} must not appear in associative lane`);
  }

  store.clear();
}

// ─── T44_raw_payload_is_not_mutated_by_annotation ────────────────────────────

export function T44_raw_payload_is_not_mutated_by_annotation() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const entry = makeShadowEntry("trace", { shadowHitCount: 3, latencyMs: 4 });
  const id = store.append(entry, FIXED_NOW);

  const beforeAnnotation = { ...store.get(id)!.payload };

  store.annotate(id, {
    operatorReviewed: true,
    contradictionCaught: true,
    noiseFlagged: false,
  }, FIXED_ANNOTATED);

  const afterAnnotation = store.get(id)!.payload;

  // Every field of the raw payload must be identical
  assert.strictEqual(afterAnnotation.shadowHitCount, beforeAnnotation.shadowHitCount);
  assert.strictEqual(afterAnnotation.latencyMs, beforeAnnotation.latencyMs);
  assert.strictEqual(afterAnnotation.lane, beforeAnnotation.lane);
  assert.ok(Object.isFrozen(afterAnnotation), "payload must still be frozen after annotation");

  store.clear();
}

// ─── T44_annotation_unknown_evidenceid_throws ────────────────────────────────

export function T44_annotation_unknown_evidenceid_throws() {
  const store = new ShadowEvidenceStore();

  assert.throws(
    () => store.annotate("ev_does_not_exist", { operatorReviewed: true }, FIXED_ANNOTATED),
    /unknown evidenceId/,
    "must throw when evidenceId does not exist",
  );
}

// ─── T44_annotation_overlay_merges_without_touching_payload ──────────────────

export function T44_annotation_overlay_merges_without_touching_payload() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const id = store.append(makeShadowEntry("associative"), FIXED_NOW);

  // First annotation
  store.annotate(id, {
    operatorReviewed: true,
    contradictionCaught: false,
  }, FIXED_ANNOTATED);

  let ann = store.getAnnotation(id)!;
  assert.strictEqual(ann.operatorReviewed, true);
  assert.strictEqual(ann.contradictionCaught, false);
  assert.strictEqual(ann.noiseFlagged, undefined, "noiseFlagged must be absent until set");

  // Update annotation — must not wipe previous fields
  store.annotate(id, {
    operatorReviewed: true,
    noiseFlagged: true,
  }, FIXED_ANNOTATED);

  ann = store.getAnnotation(id)!;
  assert.strictEqual(ann.noiseFlagged, true);
  // contradictionCaught from first annotation must persist (spread merge)
  assert.strictEqual(ann.contradictionCaught, false, "previous annotation field must persist through update");

  store.clear();
}

// ─── T44_export_for_review_includes_all_annotation_fields ────────────────────

export function T44_export_for_review_includes_all_annotation_fields() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const id = store.append(makeShadowEntry("trace"), FIXED_NOW);

  store.annotate(id, {
    operatorReviewed: true,
    contradictionCaught: true,
    noiseFlagged: false,
    noteGraphSizeLogged: true,
    episodeSummaryPopulationRate: 0.75,
  }, FIXED_ANNOTATED);

  const exported = store.exportForReview("trace");
  assert.strictEqual(exported.length, 1);

  const entry = exported[0];
  assert.strictEqual(entry.operatorReviewed, true);
  assert.strictEqual(entry.contradictionCaught, true);
  assert.strictEqual(entry.noiseFlagged, false);
  assert.strictEqual(entry.noteGraphSizeLogged, true);
  assert.strictEqual(entry.episodeSummaryPopulationRate, 0.75);

  // Raw payload fields must still be present
  assert.strictEqual(entry.lane, "trace");
  assert.strictEqual(entry.auditKind, "shadow_retrieval_research");

  store.clear();
}

// ─── T44_export_for_review_unannotated_defaults_operatorreview_false ──────────

export function T44_export_for_review_unannotated_defaults_operatorreview_false() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  store.append(makeShadowEntry("associative"), FIXED_NOW);

  const exported = store.exportForReview("associative");
  assert.strictEqual(exported.length, 1);
  assert.strictEqual(exported[0].operatorReviewed, false, "unannotated entry must default to operatorReviewed=false");
  assert.strictEqual(exported[0].contradictionCaught, undefined);
  assert.strictEqual(exported[0].noiseFlagged, undefined);

  store.clear();
}

// ─── T44_exportall_never_merges_lanes ────────────────────────────────────────

export function T44_exportall_never_merges_lanes() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  store.append(makeShadowEntry("associative"), FIXED_NOW);
  store.append(makeShadowEntry("trace"), FIXED_NOW);
  store.append(makeShadowEntry("trace"), FIXED_NOW);

  const all = store.exportAll();

  assert.strictEqual(all.associative.length, 1, "associative must have 1 entry");
  assert.strictEqual(all.trace.length, 2, "trace must have 2 entries");

  // Verify lane field on each
  for (const e of all.associative) {
    assert.strictEqual(e.lane, "associative");
  }
  for (const e of all.trace) {
    assert.strictEqual(e.lane, "trace");
  }

  store.clear();
}

// ─── T44_collector_returns_evidenceid ────────────────────────────────────────

export function T44_collector_returns_evidenceid() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);

  const id = collector.collect(makeShadowEntry("associative"), FIXED_NOW);
  assert.ok(id !== null, "collector must return an evidenceId");
  assert.ok(id!.startsWith("ev_"), "evidenceId must have ev_ prefix");
  assert.strictEqual(store.size(), 1, "store must contain 1 entry");

  store.clear();
}

// ─── T44_collector_silently_handles_store_errors ─────────────────────────────

export function T44_collector_silently_handles_store_errors() {
  // Simulate a broken store by passing a store that throws on append
  const brokenStore = {
    append(): never {
      throw new Error("simulated store failure");
    },
  } as unknown as ShadowEvidenceStore;

  const collector = new ShadowEvidenceCollector(brokenStore);

  let result: string | null = "sentinel";
  assert.doesNotThrow(() => {
    result = collector.collect(makeShadowEntry("trace"), FIXED_NOW);
  }, "collector must not propagate store errors");

  assert.strictEqual(result, null, "collector must return null on error");
}

// ─── T44_noop_collector_returns_null ─────────────────────────────────────────

export function T44_noop_collector_returns_null() {
  const noop = new NoOpShadowEvidenceCollector();
  const result = noop.collect(makeShadowEntry("associative"), FIXED_NOW);
  assert.strictEqual(result, null, "NoOp collector must always return null");
}

// ─── T44_snapshot_export_preserves_lane_separation ───────────────────────────

export function T44_snapshot_export_preserves_lane_separation() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  store.append(makeShadowEntry("associative"), FIXED_NOW);
  store.append(makeShadowEntry("trace"), FIXED_NOW);

  const snapshot = exportSnapshot(store, FIXED_NOW);

  assert.strictEqual(snapshot.version, 1);
  assert.strictEqual(snapshot.lanes.associative.length, 1);
  assert.strictEqual(snapshot.lanes.trace.length, 1);
  assert.strictEqual(snapshot.lanes.associative[0].record.payload.lane, "associative");
  assert.strictEqual(snapshot.lanes.trace[0].record.payload.lane, "trace");

  // JSON roundtrip must preserve structure
  const json = JSON.stringify(snapshot);
  const parsed: typeof snapshot = JSON.parse(json);
  assert.strictEqual(parsed.lanes.associative.length, 1);
  assert.strictEqual(parsed.lanes.trace.length, 1);

  store.clear();
}

// ─── T44_snapshot_import_restores_records_and_annotations ────────────────────

export function T44_snapshot_import_restores_records_and_annotations() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const id1 = store.append(makeShadowEntry("associative"), FIXED_NOW);
  const id2 = store.append(makeShadowEntry("trace"), FIXED_NOW);

  store.annotate(id2, {
    operatorReviewed: true,
    contradictionCaught: true,
  }, FIXED_ANNOTATED);

  const snapshot = exportSnapshot(store, FIXED_NOW);

  // Serialize and deserialize to simulate persistence roundtrip
  const restored = importSnapshot(JSON.parse(JSON.stringify(snapshot)));

  assert.strictEqual(restored.size(), 2);

  const assocExported = restored.exportForReview("associative");
  assert.strictEqual(assocExported.length, 1);
  assert.strictEqual(assocExported[0].lane, "associative");
  assert.strictEqual(assocExported[0].operatorReviewed, false);

  const traceExported = restored.exportForReview("trace");
  assert.strictEqual(traceExported.length, 1);
  assert.strictEqual(traceExported[0].operatorReviewed, true);
  assert.strictEqual(traceExported[0].contradictionCaught, true);

  store.clear();
}

// ─── T44_imported_snapshot_payload_is_frozen ─────────────────────────────────

export function T44_imported_snapshot_payload_is_frozen() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  store.append(makeShadowEntry("associative"), FIXED_NOW);
  const snapshot = exportSnapshot(store, FIXED_NOW);

  const restored = importSnapshot(JSON.parse(JSON.stringify(snapshot)));
  const [id] = restored.listByLane("associative");
  const record = restored.get(id)!;

  assert.ok(Object.isFrozen(record.payload), "restored payload must be frozen");

  store.clear();
}

// ─── T44_export_consumable_by_pack313_aggregation ────────────────────────────

export function T44_export_consumable_by_pack313_aggregation() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();

  // Add 10 operator-reviewed associative entries with annotations
  for (let i = 0; i < 10; i++) {
    const id = store.append(
      makeShadowEntry("associative", {
        latencyMs: 2,
        estimatedTokenDelta: 0,
        reviewDisambiguationEstimate: 0.5,
      }),
      FIXED_NOW,
    );
    store.annotate(id, {
      operatorReviewed: true,
      contradictionCaught: true,
      noiseFlagged: false,
      noteGraphSizeLogged: true,
    }, FIXED_ANNOTATED);
  }

  // Export and feed directly into Pack 3.13 aggregation
  const exported = store.exportForReview("associative");
  const report = aggregateLaneEvidence("associative", exported);

  assert.strictEqual(report.totalEntries, 10);
  assert.strictEqual(report.operatorReviewedCount, 10);
  assert.ok(report.contradictionRecoveryRate !== "INSUFFICIENT");
  assert.strictEqual(report.contradictionRecoveryRate as number, 1.0);
  assert.ok(report.noisePrecisionLossRate !== "INSUFFICIENT");
  assert.strictEqual(report.noisePrecisionLossRate as number, 0.0);
  assert.ok(report.p99LatencyMs !== "INSUFFICIENT");
  assert.strictEqual(report.tokenOverflowCount as number, 0);
  assert.strictEqual(report.noteGraphSizeEvidencePresent, true);

  store.clear();
}

// ─── T44_evidence_ids_are_unique_per_append ───────────────────────────────────

export function T44_evidence_ids_are_unique_per_append() {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  const ids: string[] = [];

  for (let i = 0; i < 20; i++) {
    const lane = i % 2 === 0 ? "associative" as const : "trace" as const;
    ids.push(store.append(makeShadowEntry(lane), FIXED_NOW));
  }

  const uniqueIds = new Set(ids);
  assert.strictEqual(uniqueIds.size, 20, "all 20 appended evidence IDs must be unique");

  store.clear();
}
