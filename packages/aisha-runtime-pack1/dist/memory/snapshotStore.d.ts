import { ISnapshotStore, StateSnapshotRecord } from "./types";
export declare class InMemorySnapshotStore implements ISnapshotStore {
    private readonly byId;
    private readonly latestBySession;
    private readonly byTurnId;
    write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord>;
    getLatest(sessionId: string): Promise<StateSnapshotRecord | null>;
    getByTurnId(turnId: string): Promise<StateSnapshotRecord | null>;
    getRecent(sessionId: string, limit: number): Promise<StateSnapshotRecord[]>;
}
