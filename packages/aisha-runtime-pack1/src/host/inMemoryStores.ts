/**
 * Volatile Host Stores
 * 
 * These stores are:
 * - volatile
 * - temporary
 * - not durable
 * - not real production persistence
 * - to be replaced later by SQLite/Postgres stores
 */

import type {
  EpisodeBoundaryDecision,
  EpisodeRecord,
  ThreadRecord,
  IEpisodeStore,
  IThreadStore,
  TurnRecord,
  INoteVersioning,
  NoteCandidate,
  NoteRecord,
  ListActiveNotesFilter,
  ListProvisionalNotesFilter,
  ListContradictionEvidenceFilter,
} from "../memory/types";

export class FixtureEpisodeStore implements IEpisodeStore {
  private byId = new Map<string, EpisodeRecord>();
  private bySession = new Map<string, EpisodeRecord>();

  async createFromTurn(
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
    opts?: { episodeId?: string },
  ): Promise<EpisodeRecord> {
    const ep: EpisodeRecord = {
      id: opts?.episodeId ?? `ep_${turn.id}`,
      kind: "episode",
      createdAt: turn.createdAt,
      sourceModality: turn.sourceModality,
      sessionId: turn.sessionId,
      threadId: `thread_${turn.sessionId}`,
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId
        ? [turn.recognizedPersonId]
        : [],
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };
    this.byId.set(ep.id, ep);
    this.bySession.set(turn.sessionId, ep);
    return ep;
  }

  async appendTurn(
    episodeId: string,
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
  ): Promise<EpisodeRecord> {
    const ep = this.byId.get(episodeId);
    if (!ep) return this.createFromTurn(turn, decision);
    const updated = {
      ...ep,
      endTurnId: turn.id,
      turnIds: [...ep.turnIds, turn.id],
    };
    this.byId.set(episodeId, updated);
    this.bySession.set(turn.sessionId, updated);
    return updated;
  }

  async getActive(sessionId: string) {
    return this.bySession.get(sessionId) ?? null;
  }
  async getById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async getByIds(ids: string[]) {
    return ids
      .map((id) => this.byId.get(id))
      .filter((e): e is EpisodeRecord => Boolean(e));
  }
}

export class FixtureThreadStore implements IThreadStore {
  private threads = new Map<string, ThreadRecord>();

  async update(
    sessionId: string,
    episode: EpisodeRecord,
  ): Promise<ThreadRecord> {
    const existing = this.threads.get(sessionId);
    const thread: ThreadRecord = {
      id: existing?.id ?? `thread_${sessionId}`,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: [...new Set([...(existing?.episodeIds ?? []), episode.id])],
      lastUpdatedAt: new Date().toISOString(),
    };
    this.threads.set(sessionId, thread);
    return thread;
  }

  async getActive(sessionId: string) {
    return this.threads.get(sessionId) ?? null;
  }
}

export class FixtureNoteVersioning implements INoteVersioning {
  private notes = new Map<string, NoteRecord>();

  validate(_c: NoteCandidate) {
    return { valid: true, reasons: [] };
  }
  async mergeOrSupersede() {
    return { notesWritten: [], linksWritten: [] };
  }
  async persistReviewSignals() {
    return [];
  }
  async listActiveNotes(_f?: ListActiveNotesFilter) {
    return [...this.notes.values()];
  }
  async listProvisionalNotes(_f?: ListProvisionalNotesFilter) {
    return [];
  }
  async evaluateProvisionalPromotion() {
    return { promoted: [], expired: [], unchanged: [] };
  }
  async listContradictionEvidence(_f?: ListContradictionEvidenceFilter) {
    return [];
  }
  async operatorReview() {
    return null;
  }
  async listSupersededByIds(_ids: string[]) {
    return {};
  }
}
