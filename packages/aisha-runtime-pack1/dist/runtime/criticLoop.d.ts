import type { CriticLoopResult, ICriticLoop, IGeneratorAdapter, ParsedOutput } from "./runtime_types";
import type { RetrievalBundle, StateSnapshotRecord, TurnRecord, IRetrievalPlanner, IContextBuilder } from "../memory/types";
export interface BoundedCriticLoopDeps {
    retrievalPlanner: IRetrievalPlanner;
    generator: IGeneratorAdapter;
    contextBuilder: IContextBuilder;
}
/**
 * Concrete implementation of ICriticLoop.
 *
 * Lifecycle per turn:
 *  1. evaluateText (deterministic) on the initial parsed output
 *  2. If clean: return immediately (cycleCount=0)
 *  3. If findings need re-retrieval: buildTargeted → regenerate → re-evaluate
 *  4. Repeat up to CYCLE_CAP (2) times total
 *  5. If CYCLE_CAP hit with findings: commit last generated text, record maxCyclesHit=true
 *
 * Risk gates:
 * - evaluateText throws → caught per-type, treated as zero findings for that category
 * - regeneration throws → abort remaining cycles, commit current text
 * - buildTargeted returns unchanged bundle → skip regen for that cycle
 * - Runs only when injected into ProcessTurnDeps.criticLoop; default is absent (no-op)
 */
export declare class BoundedCriticLoop implements ICriticLoop {
    private readonly deps;
    constructor(deps: BoundedCriticLoopDeps);
    run(input: {
        turn: TurnRecord;
        snapshot: StateSnapshotRecord;
        retrieval: RetrievalBundle;
        initialParsed: ParsedOutput;
    }): Promise<CriticLoopResult>;
}
