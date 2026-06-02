import { GeneratorInput } from "../runtime/runtime_types";
export interface BuiltPrompt {
    systemPrompt: string;
    userMessage: string;
}
export declare function buildGenerationPrompt(input: GeneratorInput): BuiltPrompt;
