import * as assert from "assert";
import { classifySessionReview, exportReviewWorkflowMarkdown } from "./sessionReviewWorkflow";
import type { SessionAuditRecord } from "./sessionAuditScorer";

function mockAudit(overrides: Partial<SessionAuditRecord["metrics"]>): SessionAuditRecord {
  return {
    sessionId: "audit_test",
    evaluatedAt: "2026-04-01T00:00:00Z",
    metrics: {
      extractionRecallProxy: 1.0,
      notePrecisionProxy: 1.0,
      contradictionRecovery: 1.0,
      staleNoteHandlingQuality: 1.0,
      relationshipGatingAppropriateness: 1.0,
      visibleContinuityUsefulness: 1.0,
      latencyPromptBloatImpact: 1.0,
      personalityPreservationProxy: 1.0,
      ...overrides,
    },
    artifacts: {
      systemPromptTokensAvg: 500,
      totalExtractedNotes: 1,
      supersessionCount: 0,
      gatedRejections: 0,
      finalActiveNoteCount: 1,
    },
  };
}

export async function T17_clean_session_yields_no_issues() {
  const audit = mockAudit({});
  const summary = classifySessionReview(audit);
  
  assert.strictEqual(summary.status, "clean");
  assert.strictEqual(summary.issues.length, 0);

  const md = exportReviewWorkflowMarkdown(summary);
  assert.ok(md.includes("✅ CLEAN"));
  assert.ok(md.includes("No issues detected"));
}

export async function T17_contradiction_failure_yields_blocker() {
  const audit = mockAudit({ contradictionRecovery: 0.5 });
  const summary = classifySessionReview(audit);
  
  assert.strictEqual(summary.status, "blocked");
  const blocker = summary.issues.find(i => i.severity === "blocker");
  assert.ok(blocker);
  assert.strictEqual(blocker.metric, "contradictionRecovery");

  const md = exportReviewWorkflowMarkdown(summary);
  assert.ok(md.includes("🚨 BLOCKED"));
  assert.ok(md.includes("## Blockers"));
  assert.ok(md.includes("contradictionRecovery"));
}

export async function T17_prompt_bloat_yields_tuning_issue() {
  const audit = mockAudit({ latencyPromptBloatImpact: 0.6 });
  const summary = classifySessionReview(audit);
  
  assert.strictEqual(summary.status, "needs_tuning");
  const tuning = summary.issues.find(i => i.severity === "tuning");
  assert.ok(tuning);
  assert.strictEqual(tuning.metric, "latencyPromptBloatImpact");

  const md = exportReviewWorkflowMarkdown(summary);
  assert.ok(md.includes("⚠️ NEEDS TUNING"));
  assert.ok(md.includes("## Tuning Issues"));
}

export async function T17_mixed_issues_escalate_to_blocked() {
  const audit = mockAudit({
    staleNoteHandlingQuality: 0.2, // blocker
    extractionRecallProxy: 0.5,    // tuning
  });
  
  const summary = classifySessionReview(audit);
  
  // Blocker strictly overrides tuning for status
  assert.strictEqual(summary.status, "blocked");
  assert.strictEqual(summary.issues.length, 2);

  const md = exportReviewWorkflowMarkdown(summary);
  // Both sections should appear in the export
  assert.ok(md.includes("🚨 BLOCKED"));
  assert.ok(md.includes("## Blockers"));
  assert.ok(md.includes("## Tuning Issues"));
}
