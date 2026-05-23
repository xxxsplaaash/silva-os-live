import { NoteRecord } from "./types";

export const ARCHIVE_THRESHOLDS_DAYS = {
  SUPERSEDED: 30,
  REJECTED: 7,
  STALE_NEEDS_REVIEW: 21,
  STALE_PROVISIONAL_EXPIRED: 14, // provisional→stale notes archive sooner
};

function daysBetween(olderMs: number, newerMs: number): number {
  return Math.max(0, newerMs - olderMs) / (1000 * 60 * 60 * 24);
}

/**
 * Pure, deterministic evaluation of when notes should transition fully out
 * of active/superseded purgatory into final 'archived' state to prevent 
 * long-term bloat without deleting. Offline-side only.
 */
export function evaluateArchiveEligibility(note: NoteRecord, evalTimeMs: number): NoteRecord | null {
  if (note.status === "archived") return null; // Already transitioned

  // We baseline against last meaningful update sequence to give things fair grace.
  const noteTime = Date.parse(note.updatedAt ?? note.createdAt);
  if (Number.isNaN(noteTime)) return null;

  const age = daysBetween(noteTime, evalTimeMs);

  // 1. Long-superseded notes (30 days)
  // Maintains recent superseded truth for continuity, then cold-stores it.
  if (note.status === "superseded" && age >= ARCHIVE_THRESHOLDS_DAYS.SUPERSEDED) {
    return { ...note, status: "archived" };
  }

  // 2. Explicitly Rejected / Blocked notes (7 days)
  // Short retention allows operator audit, then sweeps.
  if (note.reviewState === "rejected" && age >= ARCHIVE_THRESHOLDS_DAYS.REJECTED) {
    return { ...note, status: "archived" };
  }

  // 3. Stale review-needed notes (21 days)
  // A note that sat in needs_review purgatory for 3 weeks without any explicit
  // reinference confirmation or human operator acceptance is swept.
  if (
    note.status === "active" &&
    note.reinferencePolicy.mode === "needs_review" &&
    age >= ARCHIVE_THRESHOLDS_DAYS.STALE_NEEDS_REVIEW
  ) {
    return { ...note, status: "archived" };
  }

  // 4. Stale provisional-expired notes (14 days)
  // Provisional notes that expired without promotion transition to stale via
  // evaluateProvisionalPromotion(). These stale notes archive quickly.
  if (note.status === "stale" && age >= ARCHIVE_THRESHOLDS_DAYS.STALE_PROVISIONAL_EXPIRED) {
    return { ...note, status: "archived" };
  }

  return null;
}

/**
 * Renders a bounded inspection report for newly archived history, 
 * keeping it strictly separated from normal session alerts.
 */
export function exportArchiveManifestMarkdown(
  archivedNotes: NoteRecord[],
  reportDate: string
): string {
  let md = `# Archive Manifest\n**Generated**: ${reportDate}\n**Total Archived**: ${archivedNotes.length}\n\n`;

  if (!archivedNotes.length) {
    return md + "No notes transitioned to archive.\n";
  }

  const byReason = {
    superseded: archivedNotes.filter(n => n.status === "archived" && n.reviewState !== "rejected" && !n.reinferencePolicy.reason),
    rejected: archivedNotes.filter(n => n.reviewState === "rejected"),
    stale: archivedNotes.filter(n => n.status === "archived" && n.reviewState !== "rejected" && n.reinferencePolicy.mode === "needs_review")
  };

  if (byReason.superseded.length) {
    md += `## Long-Superseded Storage\n`;
    byReason.superseded.forEach(n => {
      md += `- [${n.id}] ${n.canonicalText} (Confidence: ${n.confidence})\n`;
    });
    md += `\n`;
  }

  if (byReason.rejected.length) {
    md += `## Rejected & Swept\n`;
    byReason.rejected.forEach(n => {
      md += `- [${n.id}] ${n.canonicalText}\n`;
    });
    md += `\n`;
  }

  if (byReason.stale.length) {
    md += `## Stale / Unconfirmed Timeout\n`;
    byReason.stale.forEach(n => {
      md += `- [${n.id}] ${n.canonicalText} (${n.reinferencePolicy.reason || "unknown_reason"})\n`;
    });
    md += `\n`;
  }

  return md;
}
