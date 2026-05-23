/**
 * T44c — Pack 3.14c Composition Root Injection Fixtures
 *
 * Proves that buildProductionRuntime() produces ProcessTurnDeps whose
 * shadowEvidenceCollector is a real ShadowEvidenceCollector backed by a real
 * ShadowEvidenceStore — without any manual test-only injection.
 *
 * These fixtures call buildProductionRuntime() directly and then drive shadow
 * runs through the collector obtained from the returned deps, verifying that
 * evidence lands in the store. No mock collector. No manual dep patching.
 *
 * Coverage:
 *   T44c_buildProductionRuntime_deps_has_real_collector
 *   T44c_collector_from_deps_appends_associative_evidence
 *   T44c_collector_from_deps_appends_trace_evidence
 *   T44c_supplied_store_is_reused_not_replaced
 *   T44c_fresh_store_created_when_none_supplied
 *   T44c_collector_does_not_touch_bundle_fields
 *
 * No live LLM. No Date.now() assertions. All deterministic.
 */

import * as assert from "assert";
import {
  buildProductionRuntime,
  type ProductionRuntimeConfig,
  type ProductionStores,
} from "../runtime/runtimeBuilder";
import {
  ShadowEvidenceStore,
  resetEvidenceSequence,
} from "../research/shadowEvidenceStore";
import { ShadowEvidenceCollector } from "../research/shadowEvidenceCollector";
import {
  runAssociativeShadow,
  runTraceShadow,
  resetShadowAutoDisable,
} from "../runtime/shadowRetrievalOrchestrator";
import type { NoteRecord, RetrievalBundle } from "../memory/types";

// ─── Minimal store stubs ─────────────────────────────────────────────────────
// Only what buildProductionRuntime touches during construction. No I/O.

function makeStubStores(shadowEvidenceStore?: ShadowEvidenceStore): ProductionStores {
  const noopStore = new Proxy({} as never, {
    get: () => () => Promise.resolve(undefined),
  });
  return {
    turnStore: noopStore,
    snapshotStore: noopStore,
    episodeStore: noopStore,
    threadStore: noopStore,
    noteVersioning: noopStore,
    shadowEvidenceStore,
  };
}

const STUB_CONFIG: ProductionRuntimeConfig = {
  geminiApiKey: "stub-key-t44c",
  geminiModel: "gemini-2.5-flash",
};

const FIXED_NOW = "2026-04-27T12:00:00.000Z";

// ─── Note / Bundle helpers ────────────────────────────────────────────────────

function makeNote(id: string): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `Note ${id}`,
    normalizedValue: id,
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

// ─── T44c_buildProductionRuntime_deps_has_real_collector ─────────────────────

export function T44c_buildProductionRuntime_deps_has_real_collector() {
  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores());

  assert.ok(
    deps.shadowEvidenceCollector !== undefined,
    "shadowEvidenceCollector must be present in deps returned by buildProductionRuntime",
  );
  assert.ok(
    deps.shadowEvidenceCollector instanceof ShadowEvidenceCollector,
    "shadowEvidenceCollector must be a ShadowEvidenceCollector instance",
  );
}

// ─── T44c_collector_from_deps_appends_associative_evidence ───────────────────

export async function T44c_collector_from_deps_appends_associative_evidence() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores(store));
  const bundle = makeBundle([makeNote("n1"), makeNote("n2")]);

  const shadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44c",
    turnId: "turn_t44c_assoc",
  });

  assert.ok(shadow !== null, "shadow run must produce an entry");

  // Use the collector from the composed deps — not a hand-crafted one
  const evidenceId = deps.shadowEvidenceCollector!.collect(shadow!, FIXED_NOW);

  assert.ok(evidenceId !== null, "collector from deps must return an evidenceId");
  assert.strictEqual(store.size(), 1, "evidence must be in the store");
  assert.strictEqual(store.listByLane("associative").length, 1);
  assert.strictEqual(store.listByLane("trace").length, 0);
  assert.strictEqual(store.get(evidenceId!)!.payload.lane, "associative");

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44c_collector_from_deps_appends_trace_evidence ─────────────────────────

export async function T44c_collector_from_deps_appends_trace_evidence() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores(store));
  const bundle = makeBundle([makeNote("n1")]);

  const shadow = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s_t44c",
    turnId: "turn_t44c_trace",
  });

  assert.ok(shadow !== null);

  const evidenceId = deps.shadowEvidenceCollector!.collect(shadow!, FIXED_NOW);

  assert.ok(evidenceId !== null);
  assert.strictEqual(store.size(), 1);
  assert.strictEqual(store.listByLane("trace").length, 1);
  assert.strictEqual(store.listByLane("associative").length, 0);

  store.clear();
  resetShadowAutoDisable();
}

// ─── T44c_supplied_store_is_reused_not_replaced ──────────────────────────────

export function T44c_supplied_store_is_reused_not_replaced() {
  resetEvidenceSequence();
  const preExisting = new ShadowEvidenceStore();

  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores(preExisting));

  // Append directly to preExisting store before building a second set of deps
  // that also receives the same store — both collectors must see the same data
  const deps2 = buildProductionRuntime(STUB_CONFIG, makeStubStores(preExisting));

  // Verify both collectors point at the same backing store by writing through one
  // and reading from the other's store via the underlying identity
  // We can check identity: if the collector is backed by the same store object,
  // a write through deps.shadowEvidenceCollector should be readable from
  // deps2.shadowEvidenceCollector if they share the same store ref.
  // Since we can't expose store internals from the collector directly, we verify
  // via direct store manipulation and confirm it has the right identity.
  assert.ok(
    deps.shadowEvidenceCollector instanceof ShadowEvidenceCollector,
    "first deps must have a real collector",
  );
  assert.ok(
    deps2.shadowEvidenceCollector instanceof ShadowEvidenceCollector,
    "second deps must have a real collector",
  );

  // A fresh store supplied as input must be the one used, not a new one.
  // We prove this by appending to preExisting directly and then collecting
  // through the first deps' collector — the store.size() must reflect both.
  const dummyEntry = {
    auditKind: "shadow_retrieval_research" as const,
    lane: "associative" as const,
    sessionId: "s_t44c_reuse",
    turnId: "turn_reuse",
    baselineNoteCount: 1,
    shadowHitCount: 0,
    estimatedTokenDelta: 0,
    latencyMs: 1,
    reviewDisambiguationEstimate: 0,
    crossEpisodeDiversityEstimate: 0,
    autoDisabledThisTurn: false,
  };
  deps.shadowEvidenceCollector!.collect(dummyEntry, FIXED_NOW);

  // preExisting store should now contain 1 entry (written through deps collector)
  assert.strictEqual(preExisting.size(), 1, "pre-existing store must reflect collector writes");

  preExisting.clear();
}

// ─── T44c_fresh_store_created_when_none_supplied ─────────────────────────────

export function T44c_fresh_store_created_when_none_supplied() {
  // When no shadowEvidenceStore is passed, buildProductionRuntime creates one.
  // We can verify the collector is still a real ShadowEvidenceCollector (not NoOp).
  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores(/* no store */));

  assert.ok(deps.shadowEvidenceCollector instanceof ShadowEvidenceCollector,
    "collector must be a real ShadowEvidenceCollector even when no store is supplied");

  // Writing through it must not throw
  const dummyEntry = {
    auditKind: "shadow_retrieval_research" as const,
    lane: "trace" as const,
    sessionId: "s_t44c_fresh",
    turnId: "turn_fresh",
    baselineNoteCount: 2,
    shadowHitCount: 1,
    estimatedTokenDelta: 35,
    latencyMs: 2,
    reviewDisambiguationEstimate: 0,
    crossEpisodeDiversityEstimate: 0,
    autoDisabledThisTurn: false,
  };
  assert.doesNotThrow(() => {
    deps.shadowEvidenceCollector!.collect(dummyEntry, FIXED_NOW);
  });
}

// ─── T44c_collector_does_not_touch_bundle_fields ─────────────────────────────

export async function T44c_collector_does_not_touch_bundle_fields() {
  resetEvidenceSequence();
  resetShadowAutoDisable();

  const store = new ShadowEvidenceStore();
  const deps = buildProductionRuntime(STUB_CONFIG, makeStubStores(store));
  const note1 = makeNote("n_immutable_1");
  const note2 = makeNote("n_immutable_2");
  const bundle = makeBundle([note1, note2]);

  // Snapshot the bundle before any shadow run + collection
  const beforeActiveNoteIds = bundle.activeNotes.map((n) => n.id).join(",");
  const beforeContraLen = bundle.contradictionEvidence.length;
  const beforeEpisodeLen = bundle.supportingEpisodes.length;

  const shadow = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s_t44c_immutable",
    turnId: "turn_immutable",
  });
  deps.shadowEvidenceCollector!.collect(shadow!, FIXED_NOW);

  // Bundle must be identical after collection
  assert.strictEqual(
    bundle.activeNotes.map((n) => n.id).join(","),
    beforeActiveNoteIds,
    "activeNotes must not be mutated by collector",
  );
  assert.strictEqual(bundle.contradictionEvidence.length, beforeContraLen);
  assert.strictEqual(bundle.supportingEpisodes.length, beforeEpisodeLen);

  store.clear();
  resetShadowAutoDisable();
}
