import { IRuntimeValidator, ParsedOutput, ValidationResult } from "./runtime_types";
export declare class MinimalRuntimeValidator implements IRuntimeValidator {
    validate(input: {
        parsed: ParsedOutput;
        turn: {
            rawText: string;
        };
        snapshot: {
            expressiveEnvelope: Record<string, number>;
        };
        retrieval: {
            activeNotes: Array<unknown>;
            contradictionEvidence: Array<unknown>;
        };
    }): ValidationResult;
}
