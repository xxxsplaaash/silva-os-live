import type { IEpisodeStore, INoteExtractionSandbox, INoteVersioning, ISnapshotStore, ITurnStore } from "../memory/types";
import type { IAsyncMemoryFollowup } from "./runtime_types";
export declare class InMemoryAsyncMemoryFollowup implements IAsyncMemoryFollowup {
    private readonly deps;
    constructor(deps: {
        episodeStore: IEpisodeStore;
        turnStore: ITurnStore;
        snapshotStore: ISnapshotStore;
        noteExtractionSandbox: INoteExtractionSandbox;
        noteVersioning: INoteVersioning;
    });
    scheduleEpisodeProcessing(input: {
        sessionId: string;
        episodeId: string;
    }): Promise<void>;
}
