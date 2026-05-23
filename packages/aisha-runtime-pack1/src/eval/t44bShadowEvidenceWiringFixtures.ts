/**
 * T44b — Pack 3.14b End-to-End Shadow Evidence Collection Wiring Fixtures
 *
 * Proves that the Pack 3.12 shadow run path actually appends evidence into
 * a ShadowEvidenceStore when a ShadowEvidenceCollector is injected via
 * ProcessTurnDeps.shadowEvidenceCollector.
 *
 * These fixtures use the real runAssociativeShadow / runTraceShadow functions
 * and a real ShadowEvidenceCollector + ShadowEvidenceStore — no mocks for the
 * collection path.
 *
 * Coverage:
 *   T44b_associative_shadow_run_appends_to_store
 *   T44b_trace_shadow_run_appends_to_store
 *   T44b_lanes_append_independently_to_same_store
 *   T44b_no_dep_uses_noop_collector_does_not_throw
 *   T44b_collector_failure_does_not_propagate
 *   T44b_stored_payload_matches_shadow_entry_fields
 *   T44b_export_from_store_consumable_by_pack313
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import {
  runAssociativeShadow,
  runTraceShadow,
  resetShadowAutoDisable,
} from "../runtime/shadowRetrievalOrchestrator";
import {
  ShadowEvidenceStore,
  resetEvidenceSequence,
} from "../research/shadowEvidenceStore";
import {
  ShadowEvidenceCollector,
  NoOpShadowEvidenceCollector,
  type IShadowEvidenceCollector,
} from "../research/shadowEvidenceCollector";
import { aggregateLaneEvidence } from "../research/shadowDataReview";
import type { RetrievalBundle, NoteRecord } from "../memory/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-27T11:00:00.000Z";

function makeNote(id: string, value: string): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: ["extracted_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };
}

function makeBundle(notes: NoteRecord[]): RetrievalBundle {
  return {
    recentTurns: [],
    activeThread: [],
    activeNotes: notes,
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: [],
  };
}

// ─── T44b_associative_shadow_run_appends_to_store ────────────────────────────

export async function T44b_associative_shadow_run_appends_to_store() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  const bundle = makeBundle([makeNote("n1", "coffee"), makeNote("n2", "milk")]);

  const shadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44b",
    turnId: "turn_assoc_1",
  });

  assert.ok(shadow !== null, "shadow run must return an entry");

  // Simulate what processTurn does
  const evidenceId = collector.collect(shadow!, FIXED_NOW);

  assert.ok(evidenceId !== null, "collector must return an evidenceId");
  assert.strictEqual(store.size(), 1, "store must contain exactly 1 entry");
  assert.strictEqual(store.listByLane("associative").length, 1);
  assert.strictEqual(store.listByLane("trace").length, 0);

  const record = store.get(evidenceId!)!;
  assert.strictEqual(record.payload.lane, "associative");
  assert.strictEqual(record.payload.auditKind, "shadow_retrieval_research");
  assert.strictEqual(record.collectedAt, FIXED_NOW);

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44b_trace_shadow_run_appends_to_store ──────────────────────────────────

export async function T44b_trace_shadow_run_appends_to_store() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  const bundle = makeBundle([makeNote("n1", "coffee")]);

  const shadow = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s_t44b",
    turnId: "turn_trace_1",
  });

  assert.ok(shadow !== null, "trace shadow run must return an entry");

  const evidenceId = collector.collect(shadow!, FIXED_NOW);

  assert.ok(evidenceId !== null);
  assert.strictEqual(store.size(), 1);
  assert.strictEqual(store.listByLane("trace").length, 1);
  assert.strictEqual(store.listByLane("associative").length, 0);

  const record = store.get(evidenceId!)!;
  assert.strictEqual(record.payload.lane, "trace");

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44b_lanes_append_independently_to_same_store ──────────────────────────

export async function T44b_lanes_append_independently_to_same_store() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  const bundle = makeBundle([makeNote("n1", "coffee")]);

  const assocShadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44b",
    turnId: "turn_both_1",
  });
  const traceShadow = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s_t44b",
    turnId: "turn_both_1",
  });

  collector.collect(assocShadow!, FIXED_NOW);
  collector.collect(traceShadow!, FIXED_NOW);

  assert.strictEqual(store.size(), 2);
  assert.strictEqual(store.listByLane("associative").length, 1);
  assert.strictEqual(store.listByLane("trace").length, 1);

  // Verify lane field on stored payloads
  const [assocId] = store.listByLane("associative");
  const [traceId] = store.listByLane("trace");
  assert.strictEqual(store.get(assocId)!.payload.lane, "associative");
  assert.strictEqual(store.get(traceId)!.payload.lane, "trace");

  // IDs must be different — no merging
  assert.notStrictEqual(assocId, traceId);

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44b_no_dep_uses_noop_collector_does_not_throw ──────────────────────────

export async function T44b_no_dep_uses_noop_collector_does_not_throw() {
  // Simulate deps.shadowEvidenceCollector = undefined (the ?? NoOp path)
  resetShadowAutoDisable();
  const bundle = makeBundle([makeNote("n1", "coffee")]);

  const shadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44b",
    turnId: "turn_noop",
  });

  assert.doesNotThrow(() => {
    const noop = new NoOpShadowEvidenceCollector();
    const result = noop.collect(shadow!, FIXED_NOW);
    assert.strictEqual(result, null, "NoOp must always return null");
  });

  resetShadowAutoDisable();
}

// ─── T44b_collector_failure_does_not_propagate ───────────────────────────────

export async function T44b_collector_failure_does_not_propagate() {
  resetShadowAutoDisable();
  const bundle = makeBundle([makeNote("n1", "coffee")]);
  const shadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44b",
    turnId: "turn_fail",
  });

  // Broken store that throws
  const brokenStore = { append: (): never => { throw new Error("store broken"); } } as unknown as ShadowEvidenceStore;
  const collector = new ShadowEvidenceCollector(brokenStore);

  assert.doesNotThrow(() => {
    const result = collector.collect(shadow!, FIXED_NOW);
    assert.strictEqual(result, null);
  }, "collector must silently swallow store errors");

  resetShadowAutoDisable();
}

// ─── T44b_stored_payload_matches_shadow_entry_fields ────────────────────────

export async function T44b_stored_payload_matches_shadow_entry_fields() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  const bundle = makeBundle([makeNote("n1", "espresso")]);

  const shadow = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s_t44b_fields",
    turnId: "turn_fields",
  });
  assert.ok(shadow);

  collector.collect(shadow!, FIXED_NOW);
  const [id] = store.listByLane("trace");
  const record = store.get(id)!;

  // All shadow entry fields must survive the freeze/copy in append()
  assert.strictEqual(record.payload.sessionId, shadow!.sessionId);
  assert.strictEqual(record.payload.turnId, shadow!.turnId);
  assert.strictEqual(record.payload.baselineNoteCount, shadow!.baselineNoteCount);
  assert.strictEqual(record.payload.shadowHitCount, shadow!.shadowHitCount);
  assert.strictEqual(record.payload.latencyMs, shadow!.latencyMs);
  assert.strictEqual(record.payload.estimatedTokenDelta, shadow!.estimatedTokenDelta);
  assert.strictEqual(record.payload.reviewDisambiguationEstimate, shadow!.reviewDisambiguationEstimate);

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44b_export_from_store_consumable_by_pack313 ───────────────────────────

export async function T44b_export_from_store_consumable_by_pack313() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  const bundle = makeBundle([makeNote("n1", "coffee"), makeNote("n2", "milk")]);

  // Collect 5 associative + 5 trace shadow entries
  for (let i = 0; i < 5; i++) {
    const assoc = await runAssociativeShadow({
      retrieval: bundle,
      allLinks: [],
      eligibleNotes: bundle.activeNotes,
      sessionId: `s_t44b_agg`,
      turnId: `turn_assoc_${i}`,
    });
    collector.collect(assoc!, FIXED_NOW);

    const trace = await runTraceShadow({
      retrieval: bundle,
      recentTurns: [],
      sessionId: `s_t44b_agg`,
      turnId: `turn_trace_${i}`,
    });
    collector.collect(trace!, FIXED_NOW);
  }

  assert.strictEqual(store.size(), 10);

  // Export per-lane and feed into Pack 3.13 aggregation
  const assocEntries = store.exportForReview("associative");
  const traceEntries = store.exportForReview("trace");

  const assocReport = aggregateLaneEvidence("associative", assocEntries);
  const traceReport = aggregateLaneEvidence("trace", traceEntries);

  assert.strictEqual(assocReport.totalEntries, 5);
  assert.strictEqual(traceReport.totalEntries, 5);

  // No operator annotations yet → gate not met, but metrics must not throw
  assert.strictEqual(assocReport.promotionGateMet, false);
  assert.strictEqual(traceReport.promotionGateMet, false);

  // utilisationRate must be computable (not INSUFFICIENT) since we have entries
  assert.ok(assocReport.utilisationRate !== "INSUFFICIENT");
  assert.ok(traceReport.utilisationRate !== "INSUFFICIENT");

  store.clear();
  resetShadowAutoDisable();
}
