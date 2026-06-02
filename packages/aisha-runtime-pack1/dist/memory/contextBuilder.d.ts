import { IContextBuilder, MemoryContextBlock, RetrievalBundle } from "./types";
export declare class SimpleContextBuilder implements IContextBuilder {
    build(bundle: RetrievalBundle): MemoryContextBlock;
}
