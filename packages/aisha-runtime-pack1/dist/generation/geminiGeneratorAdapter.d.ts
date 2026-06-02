import { GeneratorInput, GeneratorOutput, IGeneratorAdapter } from "../runtime/runtime_types";
export interface GeminiGeneratorAdapterConfig {
    apiKey?: string;
    model: string;
    maxOutputTokens: number;
    timeoutMs: number;
    vertex?: VertexGeminiAdapterConfig;
}
export interface VertexGeminiAdapterConfig {
    enabled: boolean;
    projectId: string;
    location: string;
    locationFallbacks?: string[];
    keyFilename?: string;
    useApplicationDefaultCredentials?: boolean;
    fastModel?: string;
    proModel?: string;
}
export declare class GeminiGeneratorAdapter implements IGeneratorAdapter {
    private readonly config;
    constructor(config: GeminiGeneratorAdapterConfig);
    private hasVertexConfig;
    private generateWithVertex;
    generate(input: GeneratorInput): Promise<GeneratorOutput>;
}
