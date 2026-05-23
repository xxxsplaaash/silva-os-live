import type {
  EpisodeRecord,
  NoteRecord,
  StateSnapshotRecord,
  ThreadRecord,
  TurnRecord,
} from "../memory/types";
import type {
  ProcessTurnDeps,
  ProcessTurnResult,
  RuntimeTraceSnapshot,
  TurnInput,
} from "../runtime/runtime_types";

export interface ScenarioFixture {
  id: string;
  description: string;
  input: TurnInput;
  preludeTurns?: TurnInput[];
  initialState?: Record<string, unknown>;
  expected: ScenarioAssertions;
}

export interface ScenarioAssertions {
  outcome: "success" | "fallback";

  outputIncludes?: string[];
  outputExcludes?: string[];

  outputMaxWords?: number;
  outputMaxQuestionCount?: number;
  outputSentenceCountAtMost?: number;

  fallbackReasonIncludes?: string[];

  traceStagesIncludes?: string[];
  traceStagesExcludes?: string[];

  memory?: {
    turnWritten?: boolean;
    snapshotWritten?: boolean;
    episodeWritten?: boolean;
    threadWritten?: boolean;

    activeNoteCount?: number;
    contradictionEvidenceCount?: number;
    episodeTurnCount?: number;

    activeNoteTextIncludes?: string[];
    contradictionNoteTextIncludes?: string[];

    activeNoteStateIncludes?: Array<{
      canonicalTextIncludes: string;
      reviewState?: NoteRecord["reviewState"];
      reinferenceMode?: NoteRecord["reinferencePolicy"]["mode"];
      reinferenceReason?: string;
    }>;

    activeNoteStateExcludes?: Array<{
      canonicalTextIncludes: string;
      reviewState?: NoteRecord["reviewState"];
      reinferenceMode?: NoteRecord["reinferencePolicy"]["mode"];
      reinferenceReason?: string;
    }>;
  };

  snapshot?: {
    tensionGreaterThan?: number;
    trustLessThan?: number;
    trustDecreased?: boolean;
    tensionIncreased?: boolean;
    cautionAtLeast?: "low" | "medium" | "high";
  };
}

export interface ScenarioInspectors {
  getRecentTurns(sessionId: string): Promise<TurnRecord[]>;
  getLatestSnapshot(sessionId: string): Promise<StateSnapshotRecord | null>;
  getRecentSnapshots(sessionId: string, limit: number): Promise<StateSnapshotRecord[]>;
  getActiveEpisode(sessionId: string): Promise<EpisodeRecord | null>;
  getActiveThread(sessionId: string): Promise<ThreadRecord | null>;
  listActiveNotes(): Promise<NoteRecord[]>;
  listContradictionEvidence(): Promise<NoteRecord[]>;
}

export interface ScenarioEnvironment {
  deps: ProcessTurnDeps;
  inspectors: ScenarioInspectors;
  seed?(initialState?: Record<string, unknown>): Promise<void>;
}

export interface ScenarioEnvironmentFactory {
  create(): Promise<ScenarioEnvironment>;
}

export interface ScenarioAssertionFailure {
  code: string;
  message: string;
}

export interface ScenarioAssertionReport {
  passed: boolean;
  failures: ScenarioAssertionFailure[];
}

export interface ScenarioRunResult {
  fixtureId: string;
  description: string;
  passed: boolean;
  result: ProcessTurnResult;
  trace: RuntimeTraceSnapshot;
  assertions: ScenarioAssertionReport;
  inspection: {
    turns: TurnRecord[];
    snapshot: StateSnapshotRecord | null;
    recentSnapshots: StateSnapshotRecord[];
    episode: EpisodeRecord | null;
    thread: ThreadRecord | null;
    activeNotes: NoteRecord[];
    contradictionEvidence: NoteRecord[];
  };
}
