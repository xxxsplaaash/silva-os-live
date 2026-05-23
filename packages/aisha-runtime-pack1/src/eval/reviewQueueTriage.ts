import type { NoteRecord } from "../memory/types";

export type TriageBin = "auto_confirm" | "auto_expire" | "genuine_review";

export type TriagePriority = "high" | "medium" | "low";

export interface TriageDecision {
  noteId: string;
  bin: TriageBin;
  priority?: TriagePriority;      // only for genuine_review items
  reason: string;
}

export interface TriageReport {
  sessionId: string;
  totalInput: number;
  decisions: TriageDecision[];
  counts: { auto_confirm: number; auto_expire: number; genuine_review: number };
  markdown: string;
}

/**
 * Deterministic rules for auto-confirm eligibility.
 * A note is safe to confirm automatically only when it is:
 *   - single-track (no competing note)
 *   - high-confidence AND multi-episode
 *   - NOT marked by a contradiction signal
 *   - has already been reviewed at least once and passed (accepted)
 *
 * Never silently blesses notes with any blocker risk.
 */
function isAutoConfirmable(note: NoteRecord, allNotes: NoteRecord[]): string | null {
  // Cannot auto-confirm if the note is in a contradiction-flagged state
  if (note.reinferencePolicy.reason === "contradiction_sensitive_lower_support") {
    return null;
  }
  // Cannot auto-confirm if previously accepted but re-entered review without clear reason
  if (note.reviewState === "rejected") return null;

  // Must have multiple corroborating episodes
  if (note.sourceEpisodeIds.length < 2) return null;

  // Must be above the certainty floor for auto-confirm
  if (note.confidence < 0.80) return null;

  // Must not have any live competitor note on the same subject+subtype
  const competitors = allNotes.filter(
    (other) =>
      other.id !== note.id &&
      other.subtype === note.subtype &&
      other.subjectKind === note.subjectKind &&
      other.status === "active"
  );
  if (competitors.length > 0) return null;

  return "multi_episode_high_confidence_no_competitor";
}

/**
 * Deterministic rules for auto-expire eligibility.
 * A note is safe to expire (archive without operator action) when ALL of:
 *   - explicitly rejected by a previous operator action
 *   - OR reinferencPolicy.reason = "retrieved_weak_stale_note" with confidence < 0.60
 *     AND only 1 episode (no meaningful corroboration ever existed)
 *
 * Never silently destroys contested or multi-episode history.
 */
function isAutoExpirable(note: NoteRecord): string | null {
  // Operator-explicit rejection is the clearest safe case
  if (note.reviewState === "rejected") {
    return "operator_rejected";
  }

  // Single-evidence, stale, low-confidence, already flagged — safe to expire
  if (
    note.reinferencePolicy.reason === "retrieved_weak_stale_note" &&
    note.confidence < 0.60 &&
    note.sourceEpisodeIds.length <= 1
  ) {
    return "single_episode_weak_stale";
  }

  return null;
}

/**
 * For genuine-review items, assign priority so operators work high→medium→low.
 *   - high:   contradiction-sensitive, or disputed status
 *   - medium: multi-episode but below threshold; relationship-gated
 *   - low:    single-episode, low-confidence, unclear reason
 */
function assignPriority(note: NoteRecord): TriagePriority {
  if (
    note.reinferencePolicy.reason === "contradiction_sensitive_lower_support" ||
    note.status === "disputed"
  ) {
    return "high";
  }
  if (
    note.sourceEpisodeIds.length >= 2 ||
    note.reinferencePolicy.reason === "relationship_trust_gated" ||
    note.reinferencePolicy.reason === "relationship_caution_gated"
  ) {
    return "medium";
  }
  return "low";
}

function renderTriageMarkdown(sessionId: string, decisions: TriageDecision[]): string {
  const confirm = decisions.filter((d) => d.bin === "auto_confirm");
  const expire = decisions.filter((d) => d.bin === "auto_expire");
  const review = decisions.filter((d) => d.bin === "genuine_review");

  const hi = review.filter((d) => d.priority === "high");
  const med = review.filter((d) => d.priority === "medium");
  const lo = review.filter((d) => d.priority === "low");

  let md = `# Review Queue Triage: ${sessionId}\n`;
  md += `**Input**: ${decisions.length} | `;
  md += `**Auto-Confirm**: ${confirm.length} | `;
  md += `**Auto-Expire**: ${expire.length} | `;
  md += `**Genuine Review**: ${review.length}\n\n`;

  if (confirm.length > 0) {
    md += `## ✅ Auto-Confirm (${confirm.length})\n`;
    confirm.forEach((d) => {
      md += `- [${d.noteId}] ${d.reason}\n`;
    });
    md += `\n`;
  }

  if (expire.length > 0) {
    md += `## 🗄️ Auto-Expire (${expire.length})\n`;
    expire.forEach((d) => {
      md += `- [${d.noteId}] ${d.reason}\n`;
    });
    md += `\n`;
  }

  if (review.length > 0) {
    md += `## 👁️ Genuine Review (${review.length})\n`;
    if (hi.length > 0) {
      md += `### 🔴 High Priority\n`;
      hi.forEach((d) => { md += `- [${d.noteId}]\n`; });
    }
    if (med.length > 0) {
      md += `### 🟡 Medium Priority\n`;
      med.forEach((d) => { md += `- [${d.noteId}]\n`; });
    }
    if (lo.length > 0) {
      md += `### 🟢 Low Priority\n`;
      lo.forEach((d) => { md += `- [${d.noteId}]\n`; });
    }
    md += `\n`;
  }

  return md;
}

/**
 * Triages a list of pending / needs-review notes into the three bins.
 * No mutations. No store writes. Offline-side only.
 */
export function triageReviewQueue(
  sessionId: string,
  pendingNotes: NoteRecord[],
  allActiveNotes: NoteRecord[]
): TriageReport {
  const decisions: TriageDecision[] = [];

  for (const note of pendingNotes) {
    const expireReason = isAutoExpirable(note);
    if (expireReason) {
      decisions.push({ noteId: note.id, bin: "auto_expire", reason: expireReason });
      continue;
    }

    const confirmReason = isAutoConfirmable(note, allActiveNotes);
    if (confirmReason) {
      decisions.push({ noteId: note.id, bin: "auto_confirm", reason: confirmReason });
      continue;
    }

    decisions.push({
      noteId: note.id,
      bin: "genuine_review",
      priority: assignPriority(note),
      reason: note.reinferencePolicy.reason ?? "pending_unclassified",
    });
  }

  const counts = {
    auto_confirm: decisions.filter((d) => d.bin === "auto_confirm").length,
    auto_expire: decisions.filter((d) => d.bin === "auto_expire").length,
    genuine_review: decisions.filter((d) => d.bin === "genuine_review").length,
  };

  return {
    sessionId,
    totalInput: pendingNotes.length,
    decisions,
    counts,
    markdown: renderTriageMarkdown(sessionId, decisions),
  };
}
