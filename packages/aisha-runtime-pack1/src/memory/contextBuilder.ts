import {
  IContextBuilder,
  MemoryContextBlock,
  RetrievalBundle,
  StableNoteView,
} from "./types";

const MAX_STABLE_NOTES = 4;
const MAX_NOTE_TEXT_LENGTH = 180;
const MAX_THREAD_LINE_LENGTH = 160;
const RESERVED_BLOCK_MARKERS = [
  "---STABLE_NOTES---",
  "---END_STABLE_NOTES---",
  "---THREAD_CONTEXT---",
  "---END_THREAD_CONTEXT---",
  "---EPISODE_EVIDENCE---",
  "---END_EPISODE_EVIDENCE---",
];

function collapseWhitespace(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripReservedMarkers(text: string): string {
  let out = text;
  for (const marker of RESERVED_BLOCK_MARKERS) {
    out = out.split(marker).join(" ");
  }
  return out;
}

function sanitizeInlineText(text: string, maxLength: number): string {
  let out = text;

  out = stripReservedMarkers(out);
  out = collapseWhitespace(out);
  out = out.replace(/[\[\]\|]/g, " ");

  if (out.length > maxLength) {
    out = `${out.slice(0, maxLength - 3).trim()}...`;
  }

  return out || "(empty)";
}

function noteIsPersistedStale(note: { reinferencePolicy: { mode: string; reason?: string } }): boolean {
  return (
    note.reinferencePolicy.mode === "needs_review" &&
    note.reinferencePolicy.reason === "retrieved_weak_stale_note"
  );
}

function toStableNoteViews(
  bundle: RetrievalBundle,
  maxNotes = MAX_STABLE_NOTES,
) {
  return bundle.activeNotes.slice(0, maxNotes).map((note) => ({
    noteId: note.id,
    subtype: note.subtype,
    text: sanitizeInlineText(note.canonicalText, MAX_NOTE_TEXT_LENGTH),
    confidence: note.confidence,
    calibratedConfidence: calculateCalibratedConfidence(note),
    isUncertain: isNoteUncertain(note),
    // Fallback for notes migrated from Pack 1 baseline that predate this field
    extractionConfidenceRaw: (note as any).extractionConfidenceRaw ?? note.confidence,
    lastConfirmedAt: note.lastConfirmedAt,
    sourceEpisodeCount: note.sourceEpisodeIds.length,
    // Reads persisted store state only — no Date.now() or live age calculation
    isStale: noteIsPersistedStale(note),
    // Reads supersession map from bundle — no store calls in render path
    supersededPriorText: bundle.supersessionContext[note.id]
      ? sanitizeInlineText(bundle.supersessionContext[note.id], MAX_NOTE_TEXT_LENGTH)
      : undefined,
  }));
}

import { calculateCalibratedConfidence, isNoteUncertain } from "./calibrationSandbox";

function renderStableNotesBlock(notes: ReturnType<typeof toStableNoteViews>): string {
  if (!notes.length) {
    return "---STABLE_NOTES---\n(none)\n---END_STABLE_NOTES---";
  }

  const lines: string[] = [];
  for (const note of notes) {
    const staleMark = note.isStale ? "|STALE" : "";
    const uncertainMark = note.isUncertain ? "|UNCERTAIN" : "";
    
    lines.push(`[${note.subtype}|${note.calibratedConfidence.toFixed(2)}|src=${note.sourceEpisodeCount}${staleMark}${uncertainMark}] ${note.text}`);
    if (note.supersededPriorText) {
      lines.push(`  > superseded: ${note.supersededPriorText}`);
    }
  }

  return ["---STABLE_NOTES---", ...lines, "---END_STABLE_NOTES---"].join("\n");
}

function renderThreadBlock(bundle: RetrievalBundle): string {
  if (!bundle.activeThread.length) {
    return "---THREAD_CONTEXT---\n(none)\n---END_THREAD_CONTEXT---";
  }

  const lines = bundle.activeThread.map((episode) => {
    const rawLabel =
      episode.summary ??
      `Episode ${episode.id} turns=${episode.turnIds.length} modality=${episode.primaryModality}`;

    return `- ${sanitizeInlineText(rawLabel, MAX_THREAD_LINE_LENGTH)}`;
  });

  return ["---THREAD_CONTEXT---", ...lines, "---END_THREAD_CONTEXT---"].join(
    "\n",
  );
}

function renderEpisodeEvidenceBlock(bundle: RetrievalBundle): string | undefined {
  if (!bundle.supportingEpisodes.length) return undefined;

  const lines = bundle.supportingEpisodes.map((episode) => {
    const rawLabel =
      episode.summary ??
      `Supporting episode ${episode.id} turns=${episode.turnIds.length}`;

    return `- ${sanitizeInlineText(rawLabel, MAX_THREAD_LINE_LENGTH)}`;
  });

  return [
    "---EPISODE_EVIDENCE---",
    ...lines,
    "---END_EPISODE_EVIDENCE---",
  ].join("\n");
}

export class SimpleContextBuilder implements IContextBuilder {
  build(bundle: RetrievalBundle): MemoryContextBlock {
    const stableNotesBlock = renderStableNotesBlock(toStableNoteViews(bundle));
    const threadBlock = renderThreadBlock(bundle);
    const episodeEvidenceBlock = renderEpisodeEvidenceBlock(bundle);

    return {
      stableNotesBlock,
      threadBlock,
      episodeEvidenceBlock,
    };
  }
}
