import { ISnapshotStore, StateSnapshotRecord } from "./types";

export class InMemorySnapshotStore implements ISnapshotStore {
  private readonly byId = new Map<string, StateSnapshotRecord>();
  private readonly latestBySession = new Map<string, string>();
  private readonly byTurnId = new Map<string, string>();

  async write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord> {
    if (this.byId.has(snapshot.id)) throw new Error(`Snapshot already exists: ${snapshot.id}`);
    this.byId.set(snapshot.id, snapshot);
    this.latestBySession.set(snapshot.sessionId, snapshot.id);
    this.byTurnId.set(snapshot.turnId, snapshot.id);
    return snapshot;
  }

  async getLatest(sessionId: string): Promise<StateSnapshotRecord | null> {
    const id = this.latestBySession.get(sessionId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async getByTurnId(turnId: string): Promise<StateSnapshotRecord | null> {
    const id = this.byTurnId.get(turnId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async getRecent(sessionId: string, limit: number): Promise<StateSnapshotRecord[]> {
    const all = Array.from(this.byId.values()).filter(s => s.sessionId === sessionId);
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all.slice(0, limit);
  }
}
