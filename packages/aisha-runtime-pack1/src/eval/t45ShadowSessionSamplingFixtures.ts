/**
 * T45 — Pack 3.15 Shadow Session Sampling Fixtures
 *
 * Proves that the shadow sampling protocol works correctly for exporting
 * and importing shadow snapshots/annotations, and that they properly integrate
 * with the Pack 3.13 review layer without mutating raw payloads or merging lanes.
 *
 * Coverage:
 *  - T45_sampled_associative_evidence_exports_correctly
 *  - T45_sampled_trace_evidence_exports_correctly
 *  - T45_lanes_remain_separate_on_export
 *  - T45_annotations_do_not_overwrite_raw_payloads
 *  - T45_exported_evidence_consumable_by_pack313
 *  - T45_missing_annotations_produce_insufficient_not_pass
 *
 * No live LLM. No Date.now() assertions. Deterministic.
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import {
  ShadowSessionSampler,
  exportShadowEvidence,
  generateAnnotationTemplate,
  exportAnnotationTemplate,
  loadAnnotatedSnapshot,
} from "../research/shadowSessionSampling";
import {
  ShadowEvidenceStore,
  resetEvidenceSequence,
} from "../research/shadowEvidenceStore";
import { aggregateLaneEvidence } from "../research/shadowDataReview";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-27T14:00:00.000Z";

function makeDummyAssocAudit() {
  return {
    auditKind: "shadow_retrieval_research" as const,
    lane: "associative" as const,
    sessionId: "s_t45",
    turnId: "turn_assoc",
    baselineNoteCount: 1,
    shadowHitCount: 2,
    latencyMs: 12,
    estimatedTokenDelta: 50,
    reviewDisambiguationEstimate: 1,
    crossEpisodeDiversityEstimate: 2,
    autoDisabledThisTurn: false,
  };
}

function makeDummyTraceAudit() {
  return {
    auditKind: "shadow_retrieval_research" as const,
    lane: "trace" as const,
    sessionId: "s_t45",
    turnId: "turn_trace",
    baselineNoteCount: 1,
    shadowHitCount: 1,
    latencyMs: 8,
    estimatedTokenDelta: 30,
    reviewDisambiguationEstimate: 0,
    crossEpisodeDiversityEstimate: undefined, // Trace doesn't have this
    autoDisabledThisTurn: false,
  };
}

function withTempDir(fn: (dir: string) => void | Promise<void>) {
  return async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "t45-"));
    try {
      await fn(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

// ─── T45_sampled_associative_evidence_exports_correctly ──────────────────────

export const T45_sampled_associative_evidence_exports_correctly = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  
  // Fake an associative sampling run
  const evId = store.append(makeDummyAssocAudit(), FIXED_NOW);
  assert.ok(evId);

  const snapPath = path.join(dir, "snap.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);

  const loaded = loadAnnotatedSnapshot(snapPath);
  assert.strictEqual(loaded.size(), 1);
  assert.strictEqual(loaded.listByLane("associative").length, 1);
  assert.strictEqual(loaded.listByLane("trace").length, 0);

  const record = loaded.get(loaded.listByLane("associative")[0])!;
  assert.strictEqual(record.payload.lane, "associative");
  assert.strictEqual(record.payload.shadowHitCount, 2);
});

// ─── T45_sampled_trace_evidence_exports_correctly ────────────────────────────

export const T45_sampled_trace_evidence_exports_correctly = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  
  const evId = store.append(makeDummyTraceAudit(), FIXED_NOW);
  assert.ok(evId);

  const snapPath = path.join(dir, "snap_trace.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);

  const loaded = loadAnnotatedSnapshot(snapPath);
  assert.strictEqual(loaded.size(), 1);
  assert.strictEqual(loaded.listByLane("trace").length, 1);
  assert.strictEqual(loaded.listByLane("associative").length, 0);

  const record = loaded.get(loaded.listByLane("trace")[0])!;
  assert.strictEqual(record.payload.lane, "trace");
});

// ─── T45_lanes_remain_separate_on_export ─────────────────────────────────────

export const T45_lanes_remain_separate_on_export = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  
  store.append(makeDummyAssocAudit(), FIXED_NOW);
  store.append(makeDummyTraceAudit(), FIXED_NOW);

  const snapPath = path.join(dir, "snap_both.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);

  const loaded = loadAnnotatedSnapshot(snapPath);
  assert.strictEqual(loaded.size(), 2);
  assert.strictEqual(loaded.listByLane("associative").length, 1);
  assert.strictEqual(loaded.listByLane("trace").length, 1);

  // Exporters must not mix the entries
  const assocEntries = loaded.exportForReview("associative");
  assert.strictEqual(assocEntries.length, 1);
  assert.strictEqual(assocEntries[0].lane, "associative");

  const traceEntries = loaded.exportForReview("trace");
  assert.strictEqual(traceEntries.length, 1);
  assert.strictEqual(traceEntries[0].lane, "trace");
});

// ─── T45_annotations_do_not_overwrite_raw_payloads ───────────────────────────

export const T45_annotations_do_not_overwrite_raw_payloads = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  store.append(makeDummyAssocAudit(), FIXED_NOW);

  const snapPath = path.join(dir, "snap_immutable.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);

  // Generate an annotation template, mark it reviewed and flag a contradiction
  const templatePath = path.join(dir, "ann_template.json");
  exportAnnotationTemplate(store, "associative", templatePath);
  
  const templateStr = fs.readFileSync(templatePath, "utf8");
  const template = JSON.parse(templateStr);
  template[0].operatorReviewed = true;
  template[0].contradictionCaught = true;
  // Intentionally try to maliciously overwrite payload fields via JSON injection
  template[0].shadowHitCount = 999; 
  template[0].latencyMs = 0;
  fs.writeFileSync(templatePath, JSON.stringify(template), "utf8");

  // Load snapshot with annotations
  const loaded = loadAnnotatedSnapshot(snapPath, templatePath);
  
  // The raw record in the store must NOT be mutated
  const evId = loaded.listByLane("associative")[0];
  const record = loaded.get(evId)!;
  
  assert.strictEqual(record.payload.shadowHitCount, 2, "raw payload shadowHitCount must be immutable");
  assert.strictEqual(record.payload.latencyMs, 12, "raw payload latencyMs must be immutable");
  
  // But the annotation overlay must carry the operator signals
  const merged = loaded.exportForReview("associative")[0];
  assert.strictEqual(merged.operatorReviewed, true);
  assert.strictEqual(merged.contradictionCaught, true);
  assert.strictEqual(merged.shadowHitCount, 2, "merged output must prioritize raw payload over injected malicious annotation fields");
});

// ─── T45_exported_evidence_consumable_by_pack313 ─────────────────────────────

export const T45_exported_evidence_consumable_by_pack313 = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  
  // Mock 2 associative runs
  store.append(makeDummyAssocAudit(), FIXED_NOW);
  store.append(makeDummyAssocAudit(), FIXED_NOW);

  const snapPath = path.join(dir, "snap_agg.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);

  const annPath = path.join(dir, "ann_agg.json");
  exportAnnotationTemplate(store, "associative", annPath);

  // Mock operator completing the review
  const annotations = JSON.parse(fs.readFileSync(annPath, "utf8"));
  annotations[0].operatorReviewed = true;
  annotations[0].contradictionCaught = true;
  annotations[0].noiseFlagged = false;

  annotations[1].operatorReviewed = true;
  annotations[1].contradictionCaught = false;
  annotations[1].noiseFlagged = true; // One noise
  fs.writeFileSync(annPath, JSON.stringify(annotations), "utf8");

  // Load and send to Pack 3.13 aggregation
  const loaded = loadAnnotatedSnapshot(snapPath, annPath);
  const report = aggregateLaneEvidence("associative", loaded.exportForReview("associative"));

  assert.strictEqual(report.totalEntries, 2);
  assert.strictEqual(report.operatorReviewedCount, 2);
  assert.strictEqual(report.contradictionRecoveryRate, 0.5); // 1 out of 2 caught
  assert.strictEqual(report.noisePrecisionLossRate, 0.5);    // 1 out of 2 noise
  
  // Gate check: Need 50 entries to pass, so it should be false, not crash
  assert.strictEqual(report.promotionGateMet, false);
});

// ─── T45_missing_annotations_produce_insufficient_not_pass ───────────────────

export const T45_missing_annotations_produce_insufficient_not_pass = withTempDir((dir) => {
  resetEvidenceSequence();
  const store = new ShadowEvidenceStore();
  
  // Append 100 entries so we meet the volume threshold
  for (let i = 0; i < 100; i++) {
    store.append(makeDummyAssocAudit(), FIXED_NOW);
  }

  const snapPath = path.join(dir, "snap_vol.json");
  exportShadowEvidence(store, snapPath, FIXED_NOW);
  
  // Load WITHOUT annotations
  const loaded = loadAnnotatedSnapshot(snapPath);
  const report = aggregateLaneEvidence("associative", loaded.exportForReview("associative"));

  // We have 100 entries, but 0 are operator reviewed
  assert.strictEqual(report.totalEntries, 100);
  assert.strictEqual(report.operatorReviewedCount, 0);

  // Metrics requiring review must be INSUFFICIENT, not 0 (which might accidentally pass gates)
  assert.strictEqual(report.contradictionRecoveryRate, "INSUFFICIENT");
  assert.strictEqual(report.noisePrecisionLossRate, "INSUFFICIENT");
  
  // And the promotion gate MUST NOT be met
  assert.strictEqual(report.promotionGateMet, false);
});
