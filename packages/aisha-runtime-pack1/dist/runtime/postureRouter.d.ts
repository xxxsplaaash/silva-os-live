import { StateSnapshotRecord, TurnRecord } from "../memory/types";
export type PostureModeId = "PURE_A" | "EXPLORATION_EXPAND";
export interface PostureBias {
    domain: string;
    bias: number;
    confidence: number;
}
/**
 * Implements the conservative Pack 3.4 response routing policy.
 * Default is PURE_A.
 * Authorizes EXPLORATION_EXPAND only for high-confidence breadth/ideation requests.
 */
export declare class PostureRouter {
    route(snapshot: StateSnapshotRecord, turn: TurnRecord): PostureModeId;
    getBiases(mode: PostureModeId): PostureBias[];
}
