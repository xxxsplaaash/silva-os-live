import { SessionReviewSummary, exportReviewWorkflowMarkdown } from "./sessionReviewWorkflow";
import { type NoteRecord } from "../memory/types";

export interface IntegratedReviewReport {
  sessionId: string;
  status: SessionReviewSummary["status"];
  hasArchivedNotes: boolean;
  markdown: string;
}

/**
 * Classifies newly archived notes into operator-meaningful buckets
 * for quick diagnostic review without polluting the main session limits.
 */
function organizeArchivedNotes(archivedNotes: NoteRecord[]) {
  const buckets = {
    superseded: [] as NoteRecord[],
    rejected: [] as NoteRecord[],
    stale: [] as NoteRecord[],
  };

  for (const n of archivedNotes) {
    if (n.reviewState === "rejected") {
      buckets.rejected.push(n);
    } else if (n.status === "archived" && n.reinferencePolicy.mode === "needs_review") {
      buckets.stale.push(n);
    } else {
      buckets.superseded.push(n);
    }
  }

  return buckets;
}

/**
 * Renders the integrated Pack 2.3 report combining Session Audit triage
 * with the Pack 2.2 Archive Lifecycle sweep actions in a single artifact.
 */
export function buildIntegratedReviewReport(
  summary: SessionReviewSummary,
  newlyArchivedNotes: NoteRecord[]
): IntegratedReviewReport {
  let md = exportReviewWorkflowMarkdown(summary);

  if (newlyArchivedNotes.length > 0) {
    md += `\n---\n## Archive Sweep Diagnostics\n`;
    md += `*${newlyArchivedNotes.length} notes were safely cold-stored during this review cycle.*\n\n`;

    const buckets = organizeArchivedNotes(newlyArchivedNotes);

    if (buckets.superseded.length > 0) {
      md += `### Swept: Long-Superseded\n`;
      buckets.superseded.forEach((n) => {
        md += `- [${n.id}] \`${n.canonicalText}\`\n`;
      });
      md += `\n`;
    }

    if (buckets.rejected.length > 0) {
      md += `### Swept: Operator Rejected\n`;
      buckets.rejected.forEach((n) => {
        md += `- [${n.id}] \`${n.canonicalText}\`\n`;
      });
      md += `\n`;
    }

    if (buckets.stale.length > 0) {
      md += `### Swept: Stale / Unconfirmed Timeout\n`;
      buckets.stale.forEach((n) => {
        const reason = n.reinferencePolicy.reason || "timeout";
        md += `- [${n.id}] \`${n.canonicalText}\` *(Reason: ${reason})*\n`;
      });
      md += `\n`;
    }
  }

  return {
    sessionId: summary.sessionId,
    status: summary.status,
    hasArchivedNotes: newlyArchivedNotes.length > 0,
    markdown: md,
  };
}
