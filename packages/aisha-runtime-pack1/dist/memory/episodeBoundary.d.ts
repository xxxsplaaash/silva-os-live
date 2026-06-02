import { EpisodeBoundaryDecision, EpisodeBoundaryInput, IEpisodeBoundaryDetector } from "./types";
export declare class DeterministicEpisodeBoundaryDetector implements IEpisodeBoundaryDetector {
    private readonly topicShiftThreshold;
    private readonly surpriseThreshold;
    constructor(topicShiftThreshold?: number, surpriseThreshold?: number);
    decide(input: EpisodeBoundaryInput): EpisodeBoundaryDecision;
}
