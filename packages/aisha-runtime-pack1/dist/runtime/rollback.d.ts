import { IRuntimeRollback } from "./runtime_types";
export declare class JournalRollbackHelper implements IRuntimeRollback {
    rollback(input: {
        journal: {
            abort(): Promise<void>;
        };
        traceId: string;
        sessionId: string;
        reason: string;
        error?: unknown;
    }): Promise<void>;
}
