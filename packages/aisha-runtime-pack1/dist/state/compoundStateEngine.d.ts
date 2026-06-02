import type { IDeterministicStateEngine, DeterministicStateResult, TurnInput } from "../runtime/runtime_types";
import type { StateSnapshotRecord } from "../memory/types";
import type { ISignalClassifier } from "./signals";
export declare class CompoundStateEngine implements IDeterministicStateEngine {
    private readonly deps;
    constructor(deps: {
        classifier: ISignalClassifier;
    });
    update(input: {
        turn: TurnInput;
        previousSnapshot: StateSnapshotRecord | null;
    }): Promise<DeterministicStateResult>;
}
