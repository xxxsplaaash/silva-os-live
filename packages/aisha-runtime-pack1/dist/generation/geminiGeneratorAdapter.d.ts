import { GeneratorInput, GeneratorOutput, IGeneratorAdapter } from "../runtime/runtime_types";
export interface GeminiGeneratorAdapterConfig {
    apiKey: string;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
}
export declare class GeminiGeneratorAdapter implements IGeneratorAdapter {
    private readonly config;
    constructor(config: GeminiGeneratorAdapterConfig);
    generate(input: GeneratorInput): Promise<GeneratorOutput>;
}
