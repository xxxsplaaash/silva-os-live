import {
  EpisodeBoundaryDecision,
  EpisodeRecord,
  IEpisodeStore,
  Modality,
  TurnRecord,
} from "./types";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function derivePrimaryModality(modalities: Modality[]): Modality | "mixed" {
  const uniq = unique(modalities);
  return uniq.length === 1 ? uniq[0] : "mixed";
}

function defaultThreadId(sessionId: string): string {
  return `thread_${sessionId}`;
}

export class InMemoryEpisodeStore implements IEpisodeStore {
  private readonly byId = new Map<string, EpisodeRecord>();
  private readonly activeBySession = new Map<string, string>();

  async createFromTurn(
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
    options?: { episodeId?: string },
  ): Promise<EpisodeRecord> {
    const episode: EpisodeRecord = {
      id: options?.episodeId ?? makeId("episode"),
      kind: "episode",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceModality: turn.sourceModality,
      speakerId: turn.speakerId,
      recognizedPersonId: turn.recognizedPersonId,
      speakerConfidence: turn.speakerConfidence,
      relationshipScope: turn.relationshipScope,
      coPresentEntities: turn.coPresentEntities ?? [],
      consentStatus: turn.consentStatus,
      sessionId: turn.sessionId,
      threadId: defaultThreadId(turn.sessionId),
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      summary: undefined,
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId ? [turn.recognizedPersonId] : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };
    this.byId.set(episode.id, episode);
    this.activeBySession.set(turn.sessionId, episode.id);
    return episode;
  }

  async appendTurn(episodeId: string, turn: TurnRecord, decision: EpisodeBoundaryDecision): Promise<EpisodeRecord> {
    const existing = this.byId.get(episodeId);
    if (!existing) throw new Error(`Episode not found: ${episodeId}`);

    const modalityMix = unique([...existing.modalityMix, turn.sourceModality]);
    const participantSpeakerIds = unique([...existing.participantSpeakerIds, ...(turn.speakerId ? [turn.speakerId] : [])]);
    const participantPersonIds = unique([...existing.participantPersonIds, ...(turn.recognizedPersonId ? [turn.recognizedPersonId] : [])]);
    const coPresentEntities = unique([...(existing.coPresentEntities ?? []), ...(turn.coPresentEntities ?? [])]);

    const updated: EpisodeRecord = {
      ...existing,
      updatedAt: new Date().toISOString(),
      endTurnId: turn.id,
      turnIds: [...existing.turnIds, turn.id],
      sourceModality: turn.sourceModality,
      primaryModality: derivePrimaryModality(modalityMix),
      modalityMix,
      participantSpeakerIds,
      participantPersonIds,
      focalRelationshipPersonId: turn.relationshipTargetPersonId ?? existing.focalRelationshipPersonId,
      coPresentEntities,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };

    this.byId.set(updated.id, updated);
    this.activeBySession.set(turn.sessionId, updated.id);
    return updated;
  }

  async getActive(sessionId: string): Promise<EpisodeRecord | null> {
    const id = this.activeBySession.get(sessionId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async getById(id: string): Promise<EpisodeRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async getByIds(ids: string[]): Promise<EpisodeRecord[]> {
    return ids.map((id) => this.byId.get(id)).filter((e): e is EpisodeRecord => Boolean(e));
  }
}
