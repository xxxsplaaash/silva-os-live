import {
  IRuntimeJournal,
  IRuntimeTransaction,
  RuntimeJournalSnapshot,
  StagedArtifact,
} from "./runtime_types";

class InMemoryRuntimeJournal implements IRuntimeJournal {
  private state: "open" | "committed" | "aborted" = "open";
  private readonly stagedArtifacts: StagedArtifact[] = [];

  constructor(
    private readonly traceId: string,
    private readonly sessionId: string,
  ) {}

  async stage(artifact: StagedArtifact): Promise<void> {
    this.ensureOpen("stage");
    this.stagedArtifacts.push({
      ...artifact,
      data: { ...artifact.data },
    });
  }

  snapshot(): RuntimeJournalSnapshot {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      stagedArtifacts: this.stagedArtifacts.map((artifact) => ({
        ...artifact,
        data: { ...artifact.data },
      })),
    };
  }

  async commit<T>(input: { apply: () => Promise<T> }): Promise<T> {
    this.ensureOpen("commit");
    const result = await input.apply();
    this.state = "committed";
    return result;
  }

  async abort(): Promise<void> {
    if (this.state === "committed") {
      throw new Error("journal_already_committed");
    }

    this.state = "aborted";
  }

  private ensureOpen(operation: string): void {
    if (this.state !== "open") {
      throw new Error(`journal_not_open:${operation}:${this.state}`);
    }
  }
}

export class InMemoryRuntimeTransaction implements IRuntimeTransaction {
  async openJournal(input: {
    traceId: string;
    sessionId: string;
  }): Promise<IRuntimeJournal> {
    return new InMemoryRuntimeJournal(input.traceId, input.sessionId);
  }
}
