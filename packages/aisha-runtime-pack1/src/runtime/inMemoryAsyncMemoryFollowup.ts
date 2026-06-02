import type {
  IEpisodeStore,
  INoteExtractionSandbox,
  INoteVersioning,
  ISnapshotStore,
  ITurnStore,
  NoteLinkRecord,
  NoteRecord,
} from "../memory/types";
import {
  deriveCombinedReviewSignals,
  derivePersistedReviewSignals,
  type PersistedReviewSignal,
} from "../memory/reactiveReconsolidation";
import type { AsyncMemoryFollowupResult, IAsyncMemoryFollowup } from "./runtime_types";

// Removed ReviewPersistingNoteVersioning since INoteVersioning now natively has persistReviewSignals

function isContradictionSensitiveText(text: string): boolean {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed|now)\b/i.test(
    text,
  );
}

function noteTimestamp(note: NoteRecord): number {
  const raw =
    note.lastConfirmedAt ??
    note.updatedAt ??
    note.createdAt ??
    "1970-01-01T00:00:00.000Z";

  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function supportScore(note: NoteRecord): number {
  return (
    note.sourceEpisodeIds.length * 1_000_000_000 +
    noteTimestamp(note) * 1_000 +
    Math.round(note.confidence * 1000)
  );
}

function looseTrackKey(note: NoteRecord): string {
  return [note.subtype, note.subjectKind].join("|");
}

function contradictionFallbackSignals(notes: NoteRecord[]): PersistedReviewSignal[] {
  const byTrack = new Map<string, NoteRecord[]>();

  for (const note of notes) {
    if (note.status !== "active") continue;

    const key = looseTrackKey(note);
    const arr = byTrack.get(key) ?? [];
    arr.push(note);
    byTrack.set(key, arr);
  }

  const signals: PersistedReviewSignal[] = [];

  for (const trackNotes of byTrack.values()) {
    if (trackNotes.length < 2) continue;

    const ranked = [...trackNotes].sort((a, b) => supportScore(b) - supportScore(a));
    const best = ranked[0];
    if (!best) continue;

    for (const note of ranked.slice(1)) {
      signals.push({
        noteId: note.id,
        reason: "contradiction_sensitive_lower_support",
      });
    }
  }

  return signals;
}

export class InMemoryAsyncMemoryFollowup implements IAsyncMemoryFollowup {
  constructor(
    private readonly deps: {
      episodeStore: IEpisodeStore;
      turnStore: ITurnStore;
      snapshotStore: ISnapshotStore;
      noteExtractionSandbox: INoteExtractionSandbox;
      noteVersioning: INoteVersioning;
    },
  ) {}

  async scheduleEpisodeProcessing(input: {
    sessionId: string;
    episodeId: string;
  }): Promise<AsyncMemoryFollowupResult> {
    const t0 = Date.now();
    const summary: AsyncMemoryFollowupResult = {
      gatePassed: false,
      candidatesExtracted: 0,
      notesWritten: [],
      linksWritten: [],
    };
    try {
      const episode = await this.deps.episodeStore.getById(input.episodeId);
      if (!episode) return summary;
      if (episode.sessionId !== input.sessionId) return summary;

      const turns = await this.deps.turnStore.getByIds(episode.turnIds);
      if (turns.length === 0) return summary;

      const gate = this.deps.noteExtractionSandbox.heuristicGate(episode, turns);
      summary.gatePassed = gate.pass;

      const currentTurn = turns[turns.length - 1];
      if (!currentTurn) return summary;

      const currentSnapshot = await this.deps.snapshotStore.getByTurnId(currentTurn.id);

      if (gate.pass) {
        const candidates = await this.deps.noteExtractionSandbox.extract(
          episode,
          turns,
        );
        summary.candidatesExtracted = candidates.length;

        for (const candidate of candidates) {
          const validation = this.deps.noteVersioning.validate(candidate);
          if (!validation.valid) continue;

          const existing = await this.deps.noteVersioning.listActiveNotes({
            sessionId: input.sessionId,
            includeGlobal: true,
            includeProvisional: true,
            subjectPersonId: candidate.subjectPersonId,
            relationshipContextPersonId: candidate.relationshipContextPersonId,
          });

          const merge = await this.deps.noteVersioning.mergeOrSupersede(
            candidate, 
            existing,
            currentSnapshot ? { 
              trust: currentSnapshot.expressiveEnvelope.trust, 
              caution: currentSnapshot.expressiveEnvelope.tension 
            } : undefined
          );
          summary.notesWritten.push(...merge.notesWritten);
          summary.linksWritten.push(...(merge.linksWritten as NoteLinkRecord[]));
        }
      }

      let activeNotes = await this.deps.noteVersioning.listActiveNotes({
        sessionId: input.sessionId,
        includeGlobal: true,
        subjectSpeakerId: currentTurn.speakerId,
        subjectPersonId: currentTurn.relationshipTargetPersonId,
        relationshipContextPersonId: currentTurn.relationshipTargetPersonId,
      });

      let signals = deriveCombinedReviewSignals({
        currentTurn,
        activeNotes,
      });

      const contradictionMode = isContradictionSensitiveText(currentTurn.rawText);
      const hasContradictionSignal = signals.some(
        (signal) => signal.reason === "contradiction_sensitive_lower_support",
      );

      if (contradictionMode && !hasContradictionSignal) {
        const broaderNotes = await this.deps.noteVersioning.listActiveNotes({
          sessionId: input.sessionId,
          includeGlobal: true,
        });

        const broaderSignals = deriveCombinedReviewSignals({
          currentTurn,
          activeNotes: broaderNotes,
        });

        const broaderHasContradictionSignal = broaderSignals.some(
          (signal) => signal.reason === "contradiction_sensitive_lower_support",
        );

        if (broaderHasContradictionSignal) {
          activeNotes = broaderNotes;
          signals = broaderSignals;
        } else {
          const forcedSignals = contradictionFallbackSignals(broaderNotes);
          if (forcedSignals.length > 0) {
            activeNotes = broaderNotes;
            signals = forcedSignals;
          }
        }
      }

      if (signals.length > 0) {
        // Group signals by their target note's subject scope so we can call the scoped persist API
        const groupedSignals = new Map<string, {
          scope: {
            subjectKind: NoteRecord["subjectKind"];
            subjectPersonId?: string;
            relationshipContextPersonId?: string;
          };
          signals: PersistedReviewSignal[];
        }>();

        for (const sig of signals) {
          const note = activeNotes.find((n) => n.id === sig.noteId);
          if (!note) continue;

          const scopeKey = `${note.subjectKind}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
          if (!groupedSignals.has(scopeKey)) {
            groupedSignals.set(scopeKey, {
              scope: {
                subjectKind: note.subjectKind,
                subjectPersonId: note.subjectPersonId,
                relationshipContextPersonId: note.relationshipContextPersonId,
              },
              signals: [],
            });
          }
          groupedSignals.get(scopeKey)!.signals.push(sig);
        }

        for (const group of groupedSignals.values()) {
          const reviewed = await this.deps.noteVersioning.persistReviewSignals(group.signals, group.scope);
          summary.notesWritten.push(...reviewed);
        }
      }
      return summary;
    } finally {
      console.log(`[PERF] async followup latency: ${Date.now() - t0}ms`);
    }
  }
}
