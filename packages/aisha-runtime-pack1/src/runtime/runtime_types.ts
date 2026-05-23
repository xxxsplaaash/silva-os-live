import {
  EpisodeBoundaryDecision,
  EpisodeRecord,
  IEpisodeBoundaryDetector,
  IEpisodeStore,
  IContextBuilder,
  IRetrievalPlanner,
  ISnapshotStore,
  ITurnStore,
  IThreadStore,
  MemoryContextBlock,
  RetrievalBundle,
  StateSnapshotRecord,
  ThreadRecord,
  TurnRecord,
} from "../memory/types";

export interface TurnInput {
  sessionId: string;
  speaker: "user" | "aisha" | "other";
  rawText: string;
  normalizedText?: string;
  timestamp?: string;
  sourceModality: "text" | "voice" | "image" | "video";
  sourceChannel?: "chat" | "voice_call" | "upload" | "camera" | "screen";
  speakerId?: string;
  recognizedPersonId?: string;
  speakerConfidence?: number;
  relationshipScope?: string;
  relationshipTargetPersonId?: string;
  coPresentEntities?: string[];
  consentStatus?: "allow" | "filter" | "deny" | "needs_review";
  entityMentions?: TurnRecord["entityMentions"];
  /** Studio Pulse context passed through the adapter */
  studioPulseContext?: {
    activeSpeakerId?: string;
    activeCharacterId?: string;
    roomId?: string;
    localRoomState?: Record<string, unknown>;
    characterStates?: Record<string, unknown>;
    recentMessages?: any[];
    projectContext?: Record<string, unknown>;
  };
}

export interface DeterministicStateResult {
  compounds: Record<string, number>;
  relationshipVectors: Record<string, number>;
  practicalActionBias: Record<string, number>;
  expressiveEnvelope: {
    certainty: number;
    load: number;
    tension: number;
    valence: number;
    desire: number;
    trust: number;
  };
  activeRelationshipPersonId?: string;
  activeSpeakerId?: string;
  debug?: Record<string, unknown>;
}

export interface IDeterministicStateEngine {
  update(input: {
    turn: TurnInput;
    previousSnapshot: StateSnapshotRecord | null;
  }): Promise<DeterministicStateResult>;
}

export interface GeneratorInput {
  sessionId: string;
  turn: TurnRecord;
  snapshot: StateSnapshotRecord;
  retrieval: RetrievalBundle;
  memoryContext: MemoryContextBlock;
  /**
   * kPositionBiases — Pack 2.7 prototype shaping slot.
   *
   * Optional. When absent (undefined), behavior is identical to pre-Pack-2.7.
   * When present, carries directional shaping signals from the K_position store.
   *
   * ISOLATION RULES:
   *   - This field carries DirectionalBias structs ONLY (no NoteRecord, no user text).
   *   - Content here is NEVER surfaced verbally to the user.
   *   - Content here NEVER appears in stableNotesBlock or any visible output.
   *   - Only the generator adapter may read this field.
   *   - The hot path (processTurn.ts) passes this as undefined implicitly.
   */
  kPositionBiases?: ReadonlyArray<{ domain: string; bias: number; confidence: number }>;
  /** Studio Pulse context preserved from TurnInput for generation */
  studioPulseContext?: TurnInput["studioPulseContext"];
}

export interface GeneratorOutput {
  raw: unknown;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface IGeneratorAdapter {
  generate(input: GeneratorInput): Promise<GeneratorOutput>;
}

export interface ParsedOutput {
  text: string;
  metadata?: Record<string, unknown>;
}

export interface IRuntimeParser {
  parse(output: GeneratorOutput): ParsedOutput;
}

export interface ValidationResult {
  valid: boolean;
  reasons: string[];
}

export interface IRuntimeValidator {
  validate(input: {
    parsed: ParsedOutput;
    turn: TurnRecord;
    snapshot: StateSnapshotRecord;
    retrieval: RetrievalBundle;
  }): ValidationResult;
}

export interface StagedArtifact {
  kind:
    | "turn_candidate"
    | "snapshot_candidate"
    | "episode_candidate"
    | "thread_candidate"
    | "generation_output"
    | "validation_result"
    | "critic_measurement";
  key?: string;
  data: Record<string, unknown>;
}

export interface RuntimeJournalSnapshot {
  traceId: string;
  sessionId: string;
  stagedArtifacts: StagedArtifact[];
}

export interface IRuntimeJournal {
  stage(artifact: StagedArtifact): Promise<void>;
  snapshot(): RuntimeJournalSnapshot;
  commit<T>(input: { apply: () => Promise<T> }): Promise<T>;
  abort(): Promise<void>;
}

export interface IRuntimeTransaction {
  openJournal(input: {
    traceId: string;
    sessionId: string;
  }): Promise<IRuntimeJournal>;
}

export interface IRuntimeRollback {
  rollback(input: {
    journal: IRuntimeJournal;
    traceId: string;
    sessionId: string;
    reason: string;
    error?: unknown;
  }): Promise<void>;
}

export interface FallbackResult {
  text: string;
  reason: string;
}

export interface IFallbackHandler {
  build(input: {
    turn: TurnInput;
    reason: string;
    error?: unknown;
  }): Promise<FallbackResult>;
}

/**
 * MAX_CRITIC_CYCLES is the hard-coded ceiling for bounded critic iterations.
 * It is NOT a runtime config parameter. Do not make it tunable.
 */
export const MAX_CRITIC_CYCLES = 2;

/**
 * Typed vocabulary for critic findings. New issue types require a plan update;
 * do not add ad-hoc strings here.
 */
export type CriticIssueType =
  | "memory_contradiction"           // response surfaces a note contradicted by a higher-support active note
  | "stale_note_surfaced"            // response references a note flagged as needs_review / stale
  | "ungrounded_claim"              // reserved: returns zero findings in Pack 1.2
  | "threshold_coherence_failure";  // session certainty + trust below combined minimum

export interface CriticFinding {
  issueType: CriticIssueType;
  /** Localizes issue to a specific note where applicable. Undefined for session-level findings. */
  affectedNoteId?: string;
  /** Human-readable reason for logging and trace only. Never fed back to the LLM generator. */
  reason: string;
}

export interface CriticLoopResult {
  cycleCount: number;       // cycles that ran; 0 if evaluateText found nothing on first pass
  maxCyclesHit: boolean;    // true if aborted at MAX_CRITIC_CYCLES with findings still present
  findings: CriticFinding[]; // all findings across cycles; empty if the loop exited clean
  didReRetrieve: boolean;   // true if at least one targeted re-retrieval ran
  finalText: string;        // text to commit; original if cycleCount=0, last regeneration otherwise
}

export interface ICriticLoop {
  /**
   * Runs the bounded critic loop synchronously in the hot path, before journal.commit().
   * If MAX_CRITIC_CYCLES is hit with findings still present, commits the last generated text
   * and records maxCyclesHit=true. Never aborts the turn solely due to critic failure.
   */
  run(input: {
    turn: TurnRecord;
    snapshot: StateSnapshotRecord;
    retrieval: RetrievalBundle;
    initialParsed: ParsedOutput;
  }): Promise<CriticLoopResult>;
}

export interface TraceEvent {
  stage: string;
  at: string;
  data?: Record<string, unknown>;
}

export interface RuntimeTraceSnapshot {
  traceId: string;
  sessionId: string;
  status: "running" | "succeeded" | "failed";
  events: TraceEvent[];
  failureReason?: string;
}

export interface IRuntimeTrace {
  add(event: TraceEvent): void;
  fail(reason: string, error?: unknown): void;
  succeed(): void;
  snapshot(): RuntimeTraceSnapshot;
}

export interface ITraceFactory {
  create(input: { traceId: string; sessionId: string }): IRuntimeTrace;
}

export interface IIdGenerator {
  next(prefix: string): string;
}

export interface IClock {
  nowIso(): string;
}

export interface IAsyncMemoryFollowup {
  scheduleEpisodeProcessing(input: {
    sessionId: string;
    episodeId: string;
  }): Promise<void>;
}

export interface RuntimeMemoryDeps {
  turnStore: ITurnStore;
  snapshotStore: ISnapshotStore;
  episodeBoundary: IEpisodeBoundaryDetector;
  episodeStore: IEpisodeStore;
  threadStore: IThreadStore;
  retrievalPlanner: IRetrievalPlanner;
  contextBuilder: IContextBuilder;
}

export interface KPositionScope {
  turnId: string;
  activeDomain?: string;
}

export interface IKPositionStoreBoundary {
  getDirectionalBiases(scope: KPositionScope): ReadonlyArray<{ domain: string; bias: number; confidence: number }>;
}

export interface ProcessTurnDeps extends RuntimeMemoryDeps {
  stateEngine: IDeterministicStateEngine;
  generator: IGeneratorAdapter;
  parser: IRuntimeParser;
  validator: IRuntimeValidator;
  transaction: IRuntimeTransaction;
  rollback: IRuntimeRollback;
  fallback: IFallbackHandler;
  traceFactory: ITraceFactory;
  idGenerator: IIdGenerator;
  clock: IClock;
  criticLoop?: ICriticLoop;
  asyncMemoryFollowup?: IAsyncMemoryFollowup;
  kPositionStore?: IKPositionStoreBoundary;
  /**
   * Pack 3.14b: optional shadow evidence collector.
   * When absent, a NoOpShadowEvidenceCollector is used — no evidence is stored
   * and no existing call site is affected. Feature-flag guard remains in the
   * Pack 3.12 shadow block; this dep only controls where evidence is written.
   */
  shadowEvidenceCollector?: import("../research/shadowEvidenceCollector").IShadowEvidenceCollector;
}

export interface BuildTurnArtifactsResult {
  turn: TurnRecord;
  snapshot: StateSnapshotRecord;
}

export interface StagedMemorySlice {
  turn: TurnRecord;
  snapshot: StateSnapshotRecord;
  boundary: EpisodeBoundaryDecision;
  episode: EpisodeRecord;
  thread: ThreadRecord;
}

export interface CommittedMemorySlice {
  turn: TurnRecord;
  snapshot: StateSnapshotRecord;
  episode: EpisodeRecord;
  thread: ThreadRecord;
}

export interface ProcessTurnResult {
  ok: boolean;
  text: string;
  trace: RuntimeTraceSnapshot;
  turnId?: string;
  snapshotId?: string;
  episodeId?: string;
  threadId?: string;
  criticLoop?: CriticLoopResult;
  fallbackReason?: string;
}
