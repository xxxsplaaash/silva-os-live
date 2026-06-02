import type { ProcessTurnDeps } from "./runtime_types";
import type { IEpisodeStore, ISnapshotStore, IThreadStore, ITurnStore, INoteVersioning } from "../memory/types";
import type { IRuntimeTransaction } from "./runtime_types";
import { ShadowEvidenceStore } from "../research/shadowEvidenceStore";
export interface ProductionStores {
    turnStore: ITurnStore;
    snapshotStore: ISnapshotStore;
    episodeStore: IEpisodeStore;
    threadStore: IThreadStore;
    noteVersioning: INoteVersioning;
    runtimeTransaction?: IRuntimeTransaction;
    /**
     * Pack 3.14c: optional pre-created shadow evidence store.
     * When provided, the builder wraps it in a ShadowEvidenceCollector and
     * injects it into ProcessTurnDeps. When absent, a fresh store is created
     * internally. Either way a real collector is always wired — no manual
     * injection is required in real sessions.
     * When AISHA_SHADOW_ASSOCIATIVE and AISHA_SHADOW_TRACE are both OFF (default),
     * the store remains empty; there is no cost to keeping it alive.
     */
    shadowEvidenceStore?: ShadowEvidenceStore;
}
export interface ProductionRuntimeConfig {
    geminiApiKey: string;
    geminiModel?: string;
    geminiMaxOutputTokens?: number;
    geminiTimeoutMs?: number;
}
/**
 * Constructs the production ProcessTurnDeps for the real generator path.
 *
 * Move 1 scope only:
 * - real Gemini generation
 * - production parser
 * - keep async note extraction on the simple heuristic sandbox for now
 *
 * Do not wire the LLM extraction lane here yet. That belongs to Move 3.
 */
export declare function buildProductionRuntime(config: ProductionRuntimeConfig, stores: ProductionStores): ProcessTurnDeps;
