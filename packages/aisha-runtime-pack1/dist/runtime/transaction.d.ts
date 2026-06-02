import { IRuntimeJournal, IRuntimeTransaction } from "./runtime_types";
export declare class InMemoryRuntimeTransaction implements IRuntimeTransaction {
    openJournal(input: {
        traceId: string;
        sessionId: string;
    }): Promise<IRuntimeJournal>;
}
