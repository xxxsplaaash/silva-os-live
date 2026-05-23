import { IRuntimeRollback } from "./runtime_types";

export class JournalRollbackHelper implements IRuntimeRollback {
  async rollback(input: {
    journal: {
      abort(): Promise<void>;
    };
    traceId: string;
    sessionId: string;
    reason: string;
    error?: unknown;
  }): Promise<void> {
    try {
      await input.journal.abort();
    } catch (abortError) {
      throw new Error(
        `rollback_abort_failed:${input.reason}:${
          abortError instanceof Error ? abortError.message : "unknown"
        }`,
      );
    }
  }
}
