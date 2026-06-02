import { GeneratorOutput, IRuntimeParser, ParsedOutput } from "./runtime_types";
export declare class ProductionParser implements IRuntimeParser {
    parse(output: GeneratorOutput): ParsedOutput;
}
