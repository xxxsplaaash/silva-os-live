import type { StateSnapshotRecord } from "../memory/types";
export interface ResponseShapingBlock {
    certaintyBand: "low" | "medium" | "high";
    warmth: "warm" | "neutral";
    caution: "high" | "normal";
    brevity: "concise" | "normal";
    priority: "reassure" | "hedge" | "deepen" | "none";
    directives: string[];
}
/**
 * Deterministic Pack 1 semantic state translator.
 *
 * This is intentionally compact and inspectable:
 * - no hidden model reasoning
 * - no factual mutation
 * - no personality explosion
 */
export declare function translateStateToResponseShaping(snapshot: StateSnapshotRecord): ResponseShapingBlock;
