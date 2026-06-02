import { IEpisodeStore, INoteVersioning, IRetrievalPlanner, IThreadStore, ITurnStore, RetrievalBundle, TurnRecord } from "./types";
/**
 * Deterministic Pack 1 retrieval planner:
 * - recent turns
 * - compact active thread slice
 * - ranked active notes
 * - contradiction evidence isolated in a separate lane
 * - narrow reactive reconsolidation applied only at retrieval time
 * - no embeddings, vectors, or LLM ranking
 */
export declare class SimpleRetrievalPlanner implements IRetrievalPlanner {
    private readonly deps;
    constructor(deps: {
        turnStore: ITurnStore;
        threadStore: IThreadStore;
        episodeStore: IEpisodeStore;
        noteVersioning: INoteVersioning;
    });
    build(sessionId: string, currentTurn: TurnRecord): Promise<RetrievalBundle>;
    private buildActiveNotesLane;
    private selectSupportingEpisodes;
    private buildContradictionLane;
    buildTargeted(input: {
        sessionId: string;
        currentTurn: TurnRecord;
        baseBundle: RetrievalBundle;
        targetNoteIds: string[];
    }): Promise<RetrievalBundle>;
}
