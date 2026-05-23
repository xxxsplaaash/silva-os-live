/**
 * T15 — Real-Session Evaluation Fixtures (Pack 1.9)
 *
 * Validates the pure heuristic scoring layer used to evaluate real sessions
 * offline without modifying hot-path application logic.
 */

import * as assert from "assert";
import {
  scoreSessionAudit,
  SessionAuditInput,
  exportSessionAuditMarkdown,
} from "./sessionAuditScorer";
import type { TurnRecord, NoteRecord } from "../memory/types";

const FIXED_TS = "2026-04-18T00:00:00.000Z";

function makeTurn(text: string): TurnRecord {
  return {
    id: "t_" + Math.random(),
    kind: "turn",
    createdAt: FIXED_TS,
    sourceModality: "text",
    sessionId: "sess_eval1",
    turnIndex: 0,
    speaker: "user",
    rawText: text,
    stateSnapshotId: "snap1",
    entityMentions: [],
    immutable: true,
  };
}

function makeNote(text: string, status: "active" | "superseded" | "archived" = "active"): NoteRecord {
  return {
    id: "n_" + Math.random(),
    kind: "note",
    createdAt: FIXED_TS,
    subtype: "K_pref",
    canonicalText: text,
    normalizedValue: text.toLowerCase(),
    confidence: 0.8,
    extractionConfidenceRaw: 0.8,
    provenanceChain: ["eval_test"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1"],
    provenanceReason: "eval_test",
    status,
    reinferencePolicy: {
      mode: "allow",
      staleAt: "2099-01-01T00:00:00Z",
    },
    auditTrail: [],
  };
}

export async function T15_audit_scenario_perfect_recall() {
  const turns = [
    makeTurn("I love coffee."), 
    makeTurn("My go-to is espresso."),
  ];
  
  const notesBefore: NoteRecord[] = [];
  const notesAfter: NoteRecord[] = [
    makeNote("coffee"),
    makeNote("espresso")
  ];

  const input: SessionAuditInput = { sessionId: "sess1", turns, notesBefore, notesAfter };
  const audit = scoreSessionAudit(input, FIXED_TS);

  // Both turns have signal, both gave extracted notes -> 1.0 recall
  assert.strictEqual(audit.metrics.extractionRecallProxy, 1.0);
  assert.strictEqual(audit.metrics.notePrecisionProxy, 1.0);
  assert.strictEqual(audit.artifacts.totalExtractedNotes, 2);
}

export async function T15_audit_scenario_low_recall() {
  const turns = [
    makeTurn("I love coffee."), 
    makeTurn("I avoid sugar."),
    makeTurn("I always order tea."),
  ];
  
  // Only extracted 1 note despite 3 signal turns
  const notesBefore: NoteRecord[] = [];
  const notesAfter: NoteRecord[] = [
    makeNote("coffee"),
  ];

  const input: SessionAuditInput = { sessionId: "sess2", turns, notesBefore, notesAfter };
  const audit = scoreSessionAudit(input, FIXED_TS);

  // Math.min(1.0, 1 / 3) => 0.333...
  assert.ok(audit.metrics.extractionRecallProxy < 0.35);
}

export async function T15_audit_scenario_continuity_and_bloat() {
  const turns = [makeTurn("Some chat.")];
  
  const notesBefore: NoteRecord[] = [makeNote("old note")];
  // Now 10 active notes, increasing bloat, and one superseded note
  const notesAfter = Array.from({ length: 11 }, (_, i) => makeNote(`note ${i}`));
  notesAfter[0].status = "superseded"; // Visible continuity!

  const input: SessionAuditInput = { sessionId: "sess3", turns, notesBefore, notesAfter };
  const audit = scoreSessionAudit(input, FIXED_TS);

  assert.strictEqual(audit.artifacts.supersessionCount, 1);
  assert.strictEqual(audit.metrics.visibleContinuityUsefulness, 0.95);
  
  // 10 active notes * 25 + 400 = 650 tokens -> > 600 means bloat penalty < 1.0
  assert.strictEqual(audit.artifacts.systemPromptTokensAvg, 650);
  assert.strictEqual(audit.metrics.latencyPromptBloatImpact, 0.95); // 1.0 - (50/1000)
}

export async function T15_audit_scenario_stale_handling() {
  const noteBefore = makeNote("something");
  noteBefore.reinferencePolicy.mode = "allow";

  const noteAfter = {
    ...noteBefore,
    reinferencePolicy: { ...noteBefore.reinferencePolicy, mode: "needs_review" as const }
  };

  const input: SessionAuditInput = {
    sessionId: "sess4",
    turns: [makeTurn("I hate that something")],
    notesBefore: [noteBefore],
    notesAfter: [noteAfter]
  };

  const audit = scoreSessionAudit(input, FIXED_TS);

  // Stale note handling triggers 0.8
  assert.strictEqual(audit.metrics.staleNoteHandlingQuality, 0.8);
}

export async function T15_audit_scenario_markdown_export() {
  const input: SessionAuditInput = {
    sessionId: "sess_md",
    turns: [makeTurn("hello")],
    notesBefore: [],
    notesAfter: [makeNote("note")]
  };
  
  const audit = scoreSessionAudit(input, FIXED_TS);
  const md = exportSessionAuditMarkdown(audit);

  assert.ok(md.includes("# Session Audit: sess_md"));
  assert.ok(md.includes("**Evaluated At**: " + FIXED_TS));
  assert.ok(md.includes("- **Extraction Recall Proxy**:"));
  assert.ok(md.includes("- **Newly Extracted Notes**: 1"));
}
