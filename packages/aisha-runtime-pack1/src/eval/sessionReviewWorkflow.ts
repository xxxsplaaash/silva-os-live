import { SessionAuditRecord } from "./sessionAuditScorer";

export type IssueSeverity = "blocker" | "tuning";

export interface ReviewIssue {
  severity: IssueSeverity;
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export interface SessionReviewSummary {
  sessionId: string;
  status: "blocked" | "needs_tuning" | "clean";
  issues: ReviewIssue[];
}

/**
 * Classifies a raw session audit into actionable operator triage states.
 * Separates absolute blockers (regressions) from tuning drift.
 */
export function classifySessionReview(audit: SessionAuditRecord): SessionReviewSummary {
  const issues: ReviewIssue[] = [];
  const m = audit.metrics;

  // Blocker checks (Functional regressions and critical memory corruption)
  if (m.contradictionRecovery < 0.8) {
    issues.push({
      severity: "blocker",
      metric: "contradictionRecovery",
      value: m.contradictionRecovery,
      threshold: 0.8,
      message: "Contradiction recovery failed in session. Memory is bleeding into truth.",
    });
  }
  if (m.staleNoteHandlingQuality < 0.8) {
    issues.push({
      severity: "blocker",
      metric: "staleNoteHandlingQuality",
      value: m.staleNoteHandlingQuality,
      threshold: 0.8,
      message: "Stale note handled improperly. Needs-review barrier was bypassed.",
    });
  }

  // Tuning checks (Performance/Quality drifting)
  if (m.extractionRecallProxy < 0.7) {
    issues.push({
      severity: "tuning",
      metric: "extractionRecallProxy",
      value: m.extractionRecallProxy,
      threshold: 0.7,
      message: "Extraction recall is drifting low. Missed potential signals.",
    });
  }
  if (m.latencyPromptBloatImpact < 0.8) {
    issues.push({
      severity: "tuning",
      metric: "latencyPromptBloatImpact",
      value: m.latencyPromptBloatImpact,
      threshold: 0.8,
      message: "System prompt bloat exceeded bounds. Context window density is unhealthy.",
    });
  }

  const status = issues.some((i) => i.severity === "blocker")
    ? "blocked"
    : issues.some((i) => i.severity === "tuning")
    ? "needs_tuning"
    : "clean";

  return { sessionId: audit.sessionId, status, issues };
}

/**
 * Renders a bounded, readable review artifact meant for operator inspection,
 * skipping raw log parsing.
 */
export function exportReviewWorkflowMarkdown(summary: SessionReviewSummary): string {
  const statusEmoji =
    summary.status === "blocked"
      ? "🚨 BLOCKED"
      : summary.status === "needs_tuning"
      ? "⚠️ NEEDS TUNING"
      : "✅ CLEAN";

  let md = `# Session Review: ${summary.sessionId}\n**Status**: ${statusEmoji}\n\n`;

  if (summary.issues.length === 0) {
    md += "No issues detected. Session parameters within nominal bounds.\n";
    return md;
  }

  const blockers = summary.issues.filter((i) => i.severity === "blocker");
  const tuning = summary.issues.filter((i) => i.severity === "tuning");

  if (blockers.length > 0) {
    md += `## Blockers\n`;
    for (const b of blockers) {
      md += `- [**${b.metric}**] ${b.message} *(Value: ${b.value.toFixed(2)}, Threshold: ${b.threshold.toFixed(2)})*\n`;
    }
    md += `\n`;
  }

  if (tuning.length > 0) {
    md += `## Tuning Issues\n`;
    for (const t of tuning) {
      md += `- [**${t.metric}**] ${t.message} *(Value: ${t.value.toFixed(2)}, Threshold: ${t.threshold.toFixed(2)})*\n`;
    }
    md += `\n`;
  }

  return md;
}
