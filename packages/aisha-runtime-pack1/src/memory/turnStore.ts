import { ITurnStore, TurnRecord } from "./types";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object" && !Object.isFrozen(nested)) {
        deepFreeze(nested);
      }
    }
  }
  return value;
}

export class InMemoryTurnStore implements ITurnStore {
  private readonly byId = new Map<string, TurnRecord>();
  private readonly bySession = new Map<string, TurnRecord[]>();

  async write(turn: TurnRecord): Promise<TurnRecord> {
    const frozen = deepFreeze({
      ...turn,
      immutable: true as const,
      entityMentions: [...turn.entityMentions],
      coPresentEntities: [...(turn.coPresentEntities ?? [])],
    });

    if (this.byId.has(frozen.id)) throw new Error(`Turn already exists: ${frozen.id}`);
    this.byId.set(frozen.id, frozen);
    const existing = this.bySession.get(frozen.sessionId) ?? [];
    this.bySession.set(frozen.sessionId, [...existing, frozen]);
    return frozen;
  }

  async getRecent(sessionId: string, limit: number): Promise<TurnRecord[]> {
    const turns = this.bySession.get(sessionId) ?? [];
    return turns.slice(Math.max(0, turns.length - limit));
  }

  async getById(id: string): Promise<TurnRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async getByIds(ids: string[]): Promise<TurnRecord[]> {
    return ids.map((id) => this.byId.get(id)).filter((t): t is TurnRecord => Boolean(t));
  }
}
