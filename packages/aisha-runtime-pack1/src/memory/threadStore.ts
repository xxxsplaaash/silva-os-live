import { EpisodeRecord, IThreadStore, ThreadRecord } from "./types";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export class InMemoryThreadStore implements IThreadStore {
  private readonly bySession = new Map<string, ThreadRecord>();

  async update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord> {
    const existing = this.bySession.get(sessionId);
    const updated: ThreadRecord = {
      id: existing?.id ?? episode.threadId,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: unique([...(existing?.episodeIds ?? []), episode.id]),
      lastUpdatedAt: new Date().toISOString(),
      threadSummary: existing?.threadSummary,
      focalRelationshipPersonId: episode.focalRelationshipPersonId ?? existing?.focalRelationshipPersonId,
    };
    this.bySession.set(sessionId, updated);
    return updated;
  }

  async getActive(sessionId: string): Promise<ThreadRecord | null> {
    return this.bySession.get(sessionId) ?? null;
  }
}
