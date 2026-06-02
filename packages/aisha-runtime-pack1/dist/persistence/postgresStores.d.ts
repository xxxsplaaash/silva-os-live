import type { QueryResult, QueryResultRow } from "pg";
import type { EpisodeBoundaryDecision, EpisodeRecord, IEpisodeStore, INoteVersioning, ISnapshotStore, IThreadStore, ITurnStore, ListActiveNotesFilter, ListContradictionEvidenceFilter, ListProvisionalNotesFilter, NoteCandidate, NoteMergeResult, NoteRecord, ProvisionalPromotionResult, StateSnapshotRecord, ThreadRecord, TurnRecord } from "../memory/types";
import type { IRuntimeJournal, IRuntimeTransaction } from "../runtime/runtime_types";
export interface AishaPostgresConfig {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    max?: number;
}
export declare function resolveAishaPostgresConfigFromEnv(env?: NodeJS.ProcessEnv): AishaPostgresConfig;
export declare class AishaPostgresConnection {
    private readonly pool;
    private readonly transactionClient;
    constructor(config: AishaPostgresConfig);
    ensureSchema(): Promise<void>;
    query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    withTransaction<T>(fn: () => Promise<T>): Promise<T>;
    close(): Promise<void>;
}
export declare class PostgresRuntimeTransaction implements IRuntimeTransaction {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    openJournal(input: {
        traceId: string;
        sessionId: string;
    }): Promise<IRuntimeJournal>;
}
export declare class PostgresTurnStore implements ITurnStore {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    write(turn: TurnRecord): Promise<TurnRecord>;
    getRecent(sessionId: string, limit: number): Promise<TurnRecord[]>;
    getById(id: string): Promise<TurnRecord | null>;
    getByIds(ids: string[]): Promise<TurnRecord[]>;
}
export declare class PostgresSnapshotStore implements ISnapshotStore {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord>;
    getLatest(sessionId: string): Promise<StateSnapshotRecord | null>;
    getByTurnId(turnId: string): Promise<StateSnapshotRecord | null>;
    getRecent(sessionId: string, limit: number): Promise<StateSnapshotRecord[]>;
}
export declare class PostgresEpisodeStore implements IEpisodeStore {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    createFromTurn(turn: TurnRecord, decision: EpisodeBoundaryDecision, options?: {
        episodeId?: string;
    }): Promise<EpisodeRecord>;
    appendTurn(episodeId: string, turn: TurnRecord, decision: EpisodeBoundaryDecision): Promise<EpisodeRecord>;
    getActive(sessionId: string): Promise<EpisodeRecord | null>;
    getById(id: string): Promise<EpisodeRecord | null>;
    getByIds(ids: string[]): Promise<EpisodeRecord[]>;
    private upsert;
}
export declare class PostgresThreadStore implements IThreadStore {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord>;
    getActive(sessionId: string): Promise<ThreadRecord | null>;
}
export declare class PostgresNoteVersioning implements INoteVersioning {
    private readonly connection;
    constructor(connection: AishaPostgresConnection);
    validate(candidate: NoteCandidate): {
        valid: boolean;
        reasons: string[];
    };
    mergeOrSupersede(candidate: NoteCandidate, existing: NoteRecord[], context?: {
        trust: number;
        caution: number;
    }): Promise<NoteMergeResult>;
    persistReviewSignals(signals: import("../memory/reactiveReconsolidation").PersistedReviewSignal[], subjectScope: {
        subjectKind: NoteRecord["subjectKind"];
        subjectPersonId?: string;
        relationshipContextPersonId?: string;
    }): Promise<NoteRecord[]>;
    listActiveNotes(filter?: ListActiveNotesFilter): Promise<NoteRecord[]>;
    listProvisionalNotes(filter?: ListProvisionalNotesFilter): Promise<NoteRecord[]>;
    evaluateProvisionalPromotion(filter?: ListProvisionalNotesFilter): Promise<ProvisionalPromotionResult>;
    listContradictionEvidence(filter?: ListContradictionEvidenceFilter): Promise<NoteRecord[]>;
    operatorReview(noteId: string, decision: "accept" | "reject", operatorId: string): Promise<NoteRecord | null>;
    listSupersededByIds(noteIds: string[]): Promise<Record<string, string>>;
    private getNoteById;
    private getNotesByIds;
    private loadNotes;
    private sessionIdsForFilter;
    private persistNotes;
    private persistLinks;
    private resolveNoteSessionId;
    private resolveLinkSessionId;
    private resolveSessionIdFromEpisodeIds;
}
export interface AishaPostgresProductionStores {
    connection: AishaPostgresConnection;
    turnStore: ITurnStore;
    snapshotStore: ISnapshotStore;
    episodeStore: IEpisodeStore;
    threadStore: IThreadStore;
    noteVersioning: INoteVersioning;
    runtimeTransaction: IRuntimeTransaction;
    close(): Promise<void>;
}
export declare function createPostgresProductionStores(config: AishaPostgresConfig): Promise<AishaPostgresProductionStores>;
export declare function createPostgresProductionStoresFromEnv(env?: NodeJS.ProcessEnv): Promise<AishaPostgresProductionStores>;
