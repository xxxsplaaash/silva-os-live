import { EpisodeRecord, HeuristicGateDecision, INoteExtractionSandbox, NoteCandidate, TurnRecord } from "./types";
/**
 * Deterministic Pack 1 extraction sandbox:
 * - heuristic gate only
 * - restricted to K_pref / K_profile
 * - no open-ended personality mining
 * - no reflective/reconsolidation logic
 *
 * Base-user notes are emitted as global user notes:
 * - subjectKind = "user"
 * - no subjectSpeakerId
 * - no subjectPersonId
 * - no relationshipContextPersonId
 */
export declare class SimpleNoteExtractionSandbox implements INoteExtractionSandbox {
    heuristicGate(episode: EpisodeRecord, turns: TurnRecord[]): HeuristicGateDecision;
    extract(episode: EpisodeRecord, turns: TurnRecord[]): Promise<NoteCandidate[]>;
}
export interface LlmExtractionDeps {
    generate: (prompt: string) => Promise<string>;
}
/**
 * T6: LLM Note Extractor
 * Provides high-fidelity semantic extraction bounded by the prompt.
 * Bypasses heuristic checks internally, relying on an external gate.
 */
export declare class LlmNoteExtractionSandbox implements INoteExtractionSandbox {
    private readonly deps;
    constructor(deps: LlmExtractionDeps);
    heuristicGate(episode: EpisodeRecord, turns: TurnRecord[]): HeuristicGateDecision;
    extract(episode: EpisodeRecord, turns: TurnRecord[]): Promise<NoteCandidate[]>;
}
/**
 * T6: Two-Stage Gate
 * Fuses the fast deterministic heuristic gate with the high-fidelity LLM extractor.
 * Strictly adheres to Speed Doctrine: hot path gate must be cheap.
 */
export declare class TwoStageExtractionSandbox implements INoteExtractionSandbox {
    private readonly heuristicGateSandbox;
    private readonly llmSandbox;
    constructor(heuristicGateSandbox: INoteExtractionSandbox, llmSandbox: INoteExtractionSandbox);
    heuristicGate(episode: EpisodeRecord, turns: TurnRecord[]): HeuristicGateDecision;
    extract(episode: EpisodeRecord, turns: TurnRecord[]): Promise<NoteCandidate[]>;
}
