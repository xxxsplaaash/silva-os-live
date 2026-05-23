import * as assert from "assert";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { NoteCandidate, NoteRecord } from "../memory/types";

export async function T37_high_trust_aligned_notes_accepted() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User likes coffee",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: 0.9, caution: 0.1 });
  
  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "allow");
  assert.strictEqual(note.reviewState, "accepted");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  assert.strictEqual(note.auditTrail[1].reason, "relationship_trust_accepted");
}

export async function T37_low_trust_rejected() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User likes coffee",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: -0.7, caution: 0.1 });
  
  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "block_auto_reinfer");
  assert.strictEqual(note.reviewState, "rejected");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  assert.strictEqual(note.auditTrail[1].reason, "relationship_trust_rejected");
}

export async function T37_weakly_grounded_rejected() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User likes coffee",
    confidence: 0.5, // Weak!
    extractionConfidenceRaw: 0.5,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [], { trust: 0.9, caution: 0.1 });
  
  assert.strictEqual(notesWritten.length, 1);
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "block_auto_reinfer");
  assert.strictEqual(note.reviewState, "rejected");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  assert.strictEqual(note.auditTrail[1].reason, "weakly_grounded_rejected");
}

export async function T37_contradiction_does_not_bypass_review_on_high_trust() {
  const versioning = new InMemoryNoteVersioning();
  const candidate: NoteCandidate = {
    subtype: "K_pref",
    canonicalText: "User avoids coffee",
    normalizedValue: "avoids coffee",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceReason: "extracted_v1",
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
  };

  const priorNote: NoteRecord = {
    id: "note_1",
    kind: "note",
    createdAt: "2026-04-25T10:00:00.000Z",
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: "User preference: coffee",
    normalizedValue: "coffee",
    confidence: 0.9,
    extractionConfidenceRaw: 0.9,
    provenanceChain: ["extracted_v0"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_0"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };

  // High trust (0.9) but it's a contradiction.
  const { notesWritten } = await versioning.mergeOrSupersede(candidate, [priorNote], { trust: 0.9, caution: 0.1 });
  
  // Note 0 is the new note, Note 1 is the superseded old note.
  const note = notesWritten[0];
  assert.strictEqual(note.reinferencePolicy.mode, "needs_review");
  assert.strictEqual(note.reviewState, "pending");
  assert.strictEqual(note.auditTrail.length, 2);
  assert.strictEqual(note.auditTrail[1].action, "relationship_gated");
  assert.strictEqual(note.auditTrail[1].reason, "contradiction_needs_review");
}
