import * as assert from "assert";
import { buildIntegratedReviewReport } from "./archiveReviewIntegration";
import type { SessionReviewSummary } from "./sessionReviewWorkflow";
import type { NoteRecord } from "../memory/types";

function mockSummary(status: SessionReviewSummary["status"]): SessionReviewSummary {
  return {
    sessionId: "test_session_1",
    status,
    issues: [],
  };
}

function mockArchivedNote(id: string, overrides: Partial<NoteRecord>): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    sourceModality: "text",
    subtype: "K_pref",
    canonicalText: "Mock note",
    confidence: 0.8,
    extractionConfidenceRaw: 0.8,
    provenanceChain: [],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1"],
    status: "archived",
    reinferencePolicy: { mode: "allow" },
    reviewState: "accepted",
    auditTrail: [],
    ...overrides,
  };
}

export async function T19_integrated_report_with_no_archived_notes() {
  const summary = mockSummary("clean");
  const report = buildIntegratedReviewReport(summary, []);
  
  assert.strictEqual(report.hasArchivedNotes, false);
  assert.ok(report.markdown.includes("✅ CLEAN"));
  assert.ok(!report.markdown.includes("Archive Sweep Diagnostics"));
}

export async function T19_integrated_report_includes_all_archive_buckets() {
  const summary = mockSummary("needs_tuning");
  const notes = [
    mockArchivedNote("n1", { reviewState: "accepted", canonicalText: "Long gone" }), // superseded
    mockArchivedNote("n2", { reviewState: "rejected", canonicalText: "Bad guess" }), // rejected
    mockArchivedNote("n3", { reviewState: "pending", reinferencePolicy: { mode: "needs_review", reason: "drift" }, canonicalText: "Stale pending" }), // stale
  ];

  const report = buildIntegratedReviewReport(summary, notes);
  
  assert.strictEqual(report.hasArchivedNotes, true);
  assert.ok(report.markdown.includes("⚠️ NEEDS TUNING"));
  assert.ok(report.markdown.includes("Archive Sweep Diagnostics"));
  assert.ok(report.markdown.includes("3 notes were safely cold-stored"));
  
  assert.ok(report.markdown.includes("Swept: Long-Superseded"));
  assert.ok(report.markdown.includes("`Long gone`"));
  
  assert.ok(report.markdown.includes("Swept: Operator Rejected"));
  assert.ok(report.markdown.includes("`Bad guess`"));
  
  assert.ok(report.markdown.includes("Swept: Stale / Unconfirmed Timeout"));
  assert.ok(report.markdown.includes("`Stale pending`"));
  assert.ok(report.markdown.includes("drift"));
}
