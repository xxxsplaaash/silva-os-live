import { ITurnStore, TurnRecord } from "./types";
export declare class InMemoryTurnStore implements ITurnStore {
    private readonly byId;
    private readonly bySession;
    write(turn: TurnRecord): Promise<TurnRecord>;
    getRecent(sessionId: string, limit: number): Promise<TurnRecord[]>;
    getById(id: string): Promise<TurnRecord | null>;
    getByIds(ids: string[]): Promise<TurnRecord[]>;
}
