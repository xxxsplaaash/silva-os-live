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
import type { EpisodeBoundaryDecision, EpisodeRecord, ThreadRecord, IEpisodeStore, IThreadStore, TurnRecord, INoteVersioning, NoteCandidate, NoteRecord, ListActiveNotesFilter, ListProvisionalNotesFilter, ListContradictionEvidenceFilter } from "../memory/types";
export declare class FixtureEpisodeStore implements IEpisodeStore {
    private byId;
    private bySession;
    createFromTurn(turn: TurnRecord, decision: EpisodeBoundaryDecision, opts?: {
        episodeId?: string;
    }): Promise<EpisodeRecord>;
    appendTurn(episodeId: string, turn: TurnRecord, decision: EpisodeBoundaryDecision): Promise<EpisodeRecord>;
    getActive(sessionId: string): Promise<EpisodeRecord | null>;
    getById(id: string): Promise<EpisodeRecord | null>;
    getByIds(ids: string[]): Promise<EpisodeRecord[]>;
}
export declare class FixtureThreadStore implements IThreadStore {
    private threads;
    update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord>;
    getActive(sessionId: string): Promise<ThreadRecord | null>;
}
export declare class FixtureNoteVersioning implements INoteVersioning {
    private notes;
    validate(_c: NoteCandidate): {
        valid: boolean;
        reasons: never[];
    };
    mergeOrSupersede(): Promise<{
        notesWritten: never[];
        linksWritten: never[];
    }>;
    persistReviewSignals(): Promise<never[]>;
    listActiveNotes(_f?: ListActiveNotesFilter): Promise<NoteRecord[]>;
    listProvisionalNotes(_f?: ListProvisionalNotesFilter): Promise<never[]>;
    evaluateProvisionalPromotion(): Promise<{
        promoted: never[];
        expired: never[];
        unchanged: never[];
    }>;
    listContradictionEvidence(_f?: ListContradictionEvidenceFilter): Promise<never[]>;
    operatorReview(): Promise<null>;
    listSupersededByIds(_ids: string[]): Promise<{}>;
}
