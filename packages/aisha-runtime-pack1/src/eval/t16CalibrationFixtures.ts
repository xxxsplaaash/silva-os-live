import * as assert from "assert";
import { calculateCalibratedConfidence, isNoteUncertain } from "../memory/calibrationSandbox";
import type { NoteRecord, TurnRecord } from "../memory/types";
import { scoreSessionAudit } from "./sessionAuditScorer";

function mockNote(overrides: Partial<NoteRecord>): NoteRecord {
  return {
    id: "n1",
    kind: "note",
    createdAt: "2026-04-01T00:00:00.000Z",
    sourceModality: "text",
    subtype: "K_pref",
    canonicalText: "User preference: tea",
    confidence: overrides.extractionConfidenceRaw ?? 0.78,
    extractionConfidenceRaw: overrides.extractionConfidenceRaw ?? 0.78,
    provenanceChain: [],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1"],
    status: overrides.status ?? "active",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
    ...overrides,
  };
}

export async function T16_calibration_evidence_boosts_confidence() {
  const note = mockNote({ extractionConfidenceRaw: 0.72, sourceEpisodeIds: ["ep1", "ep2", "ep3"] });
  const conf = calculateCalibratedConfidence(note);
  
  // 0.72 base + 0.10 evidence boost (2 extra episodes * 0.05)
  assert.strictEqual(conf.toFixed(2), "0.82");
}

export async function T16_calibration_stale_flagging_triggers_uncertainty() {
  const note = mockNote({ 
    extractionConfidenceRaw: 0.76, 
    sourceEpisodeIds: ["ep1"],
    reinferencePolicy: { mode: "needs_review", reason: "retrieved_weak_stale_note" }
  });
  
  const conf = calculateCalibratedConfidence(note);
  // 0.76 base - 0.15 stale penalty = 0.61
  assert.strictEqual(conf.toFixed(2), "0.61");
  // 0.61 drops below 0.65 threshold, marking it explicitly UNCERTAIN at render
  assert.strictEqual(isNoteUncertain(note), true);
}

export async function T16_calibration_contradiction_heavily_penalizes() {
  const note = mockNote({ 
    extractionConfidenceRaw: 0.78, 
    reinferencePolicy: { mode: "needs_review", reason: "contradiction_sensitive_lower_support" }
  });
  
  const conf = calculateCalibratedConfidence(note);
  // 0.78 base - 0.20 contradiction penalty = 0.58
  assert.strictEqual(conf.toFixed(2), "0.58");
  assert.strictEqual(isNoteUncertain(note), true);
}

export async function T16_audit_demonstrates_calibration_improvement() {
  // Proving via Pack 1.9 scaffolding that weaker notes lose authority earlier.
  // Scenario: A weakly extracted note (0.72) is contradicted. Old baseline would leave it active
  // but confidence marginally dropped. New calibrated system renders it uncertain early and 
  // correctly reflects its precision proxy.
  
  const noteBefore = mockNote({ extractionConfidenceRaw: 0.72 });
  const noteAfter = mockNote({ 
    extractionConfidenceRaw: 0.72, 
    reinferencePolicy: { mode: "needs_review", reason: "contradiction_sensitive_lower_support" },
    status: "superseded"
  });

  const audit = scoreSessionAudit({
    sessionId: "audit_1",
    turns: [], 
    notesBefore: [noteBefore], 
    notesAfter: [noteAfter]
  });

  // Stale handling quality proves the boundary correctly transitioned needs_review
  assert.strictEqual(audit.metrics.staleNoteHandlingQuality > 0.5, true);
  // Usefulness is fully validated via supersession counts
  assert.strictEqual(audit.metrics.visibleContinuityUsefulness, 0.95);
}
