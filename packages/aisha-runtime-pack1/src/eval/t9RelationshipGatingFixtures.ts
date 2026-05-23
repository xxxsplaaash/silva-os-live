import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { NoteCandidate, NoteRecord, StateSnapshotRecord } from "../memory/types";
import { CompoundStateEngine } from "../state/compoundStateEngine";
import { ISignalClassifier } from "../state/signals";
import { TurnInput } from "../runtime/runtime_types";

class MockClassifier implements ISignalClassifier {
  async classify(text: string) {
    if (text.includes("praise")) return { praise_or_validation: 1, contradiction_or_frustration: 0, task_or_build_request: 0, uncertainty_or_hedge: 0 };
    if (text.includes("frustrate")) return { praise_or_validation: 0, contradiction_or_frustration: 1, task_or_build_request: 0, uncertainty_or_hedge: 0 };
    return { praise_or_validation: 0, contradiction_or_frustration: 0, task_or_build_request: 0, uncertainty_or_hedge: 0 };
  }
}

export async function T9_high_trust_extraction_allows_note() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User likes high-trust things",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: 0.5, caution: 0.1 });
  
  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "allow");
  assert.strictEqual(note.reviewState, "pending");
  assert.strictEqual(note.auditTrail.length, 1);
  assert.strictEqual(note.auditTrail[0].action, "created");
}

export async function T9_low_trust_extraction_softens_to_needs_review() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User likes low-trust things",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: -0.5, caution: 0.5 });
  
  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(note.reinferencePolicy.reason, "relationship_trust_gated");
  assert.strictEqual(note.reviewState, "pending");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[0].action, "created");
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
}

export async function T9_operator_review_flow() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User stuff",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: -0.5, caution: 0.5 });
  const noteId = notesWritten[0].id;

  const approved = await versioning.operatorReview(noteId, "accept", "operator_1");
  assert.ok(approved);
  assert.strictEqual(approved.reviewState, "accepted");
  assert.strictEqual(approved.reinferencePolicy.mode, "allow");
  assert.strictEqual(approved.auditTrail.length, 3);
  assert.strictEqual(approved.auditTrail[2].action, "operator_approved");

  const rejected = await versioning.operatorReview(noteId, "reject", "operator_1");
  assert.ok(rejected);
  assert.strictEqual(rejected.reviewState, "rejected");
  assert.strictEqual(rejected.reinferencePolicy.mode, "block_auto_reinfer");
  assert.strictEqual(rejected.auditTrail.length, 4);
  assert.strictEqual(rejected.auditTrail[3].action, "operator_rejected");
}

export async function T9_multi_session_drift_relaxation() {
  const engine = new CompoundStateEngine({ classifier: new MockClassifier() });

  const prevSnapshot: StateSnapshotRecord = {
    id: "snap_1",
    kind: "state_snapshot",
    createdAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
    sessionId: "session_1",
    turnId: "turn_old",
    sourceModality: "text",
    compounds: {},
    practicalActionBias: {},
    relationshipVectors: { trust: 0.9, caution: 0 },
    expressiveEnvelope: {
      certainty: 0.5,
      load: 0.2,
      tension: 0.1,
      valence: 0,
      desire: 0.2,
      trust: 0.9, // Very high trust
    },
    schemaVersion: "1.0",
  };

  // Turn 1: Less than 1 hour later, new session -> NO boundary decay (meaningless gap)
  const turn1: TurnInput = {
    sessionId: "session_2",
    speaker: "user",
    rawText: "hello",
    sourceModality: "text",
    timestamp: new Date("2026-01-01T10:30:00.000Z").toISOString(), // 30 mins
  };

  const state1 = await engine.update({ turn: turn1, previousSnapshot: prevSnapshot });
  // Normal decay is 0.02 (approach(trust, 0, 0.02)), not 0.20
  // 0.9 -> 0.9 + (0 - 0.9)*0.02 = 0.882
  assert.ok(state1.expressiveEnvelope.trust > 0.85);

  // Turn 2: More than 1 hour later, new session -> Boundary decay applies!
  const turn2: TurnInput = {
    sessionId: "session_3",
    speaker: "user",
    rawText: "hello",
    sourceModality: "text",
    timestamp: new Date("2026-01-01T12:00:00.000Z").toISOString(), // 2 hours
  };

  const state2 = await engine.update({ turn: turn2, previousSnapshot: prevSnapshot });
  // Boundary decay 0.20 applied before normal decay 0.02
  // Trust 0.9 at boundary decay: 0.9 -> 0.9 + (0 - 0.9)*0.20 = 0.72
  // Then normal decay: 0.72 -> 0.72 + (0 - 0.72)*0.02 = 0.7056
  assert.ok(state2.expressiveEnvelope.trust < 0.73);
  assert.ok(state2.expressiveEnvelope.trust > 0.69);
}
