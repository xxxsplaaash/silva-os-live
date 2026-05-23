/**
 * A.I.S.H.A → Studio Pulse Adapter Contract
 *
 * This file defines the TypeScript surface Studio Pulse (Codex) codes against.
 * It is the ONLY file Codex should import from the A.I.S.H.A engine package.
 *
 * Do not import internal A.I.S.H.A modules from Codex.
 * Do not reimplement the memory, note, or truth stores in Studio Pulse.
 */
interface AishaRecentMessage {
    role: "user" | "assistant" | "other";
    content: string;
    speakerId?: string;
    personId?: string;
    timestamp?: string;
}
interface AishaCharacterState {
    personId: string;
    displayName?: string;
    lastKnownBeliefs?: string[];
    role?: string;
    mood?: string;
    intent?: string;
}
interface AishaModalityMetadata {
    sourceModality: "text" | "voice" | "image" | "video";
    sourceChannel?: "chat" | "voice_call" | "upload" | "camera" | "screen";
    speakerId?: string;
    activeSpeakerId?: string;
    recognizedPersonId?: string;
    speakerConfidence?: number;
}
interface AishaStudioPulseRequest {
    /** Stable user identifier across sessions */
    userId?: string;
    /** Per-conversation/session identifier (required) */
    sessionId: string;
    /** Thread/conversation group identifier (required) */
    threadId: string;
    /** Optional Studio Pulse room identifier */
    roomId?: string;
    /** Active character being addressed — maps to recognizedPersonId internally */
    activeCharacterId?: string;
    /** Active speaker identifier for this turn */
    activeSpeakerId?: string;
    /** The user's message text (required) */
    messageText: string;
    /** Recent message turns for context window */
    recentMessages?: AishaRecentMessage[];
    /** Studio Pulse project-level context */
    projectContext?: Record<string, unknown>;
    /** Current local room state snapshot from Studio Pulse */
    localRoomState?: Record<string, unknown>;
    /** Known character states from Studio Pulse side */
    characterStates?: Record<string, AishaCharacterState>;
    /** Modality metadata for voice/multimodal turns */
    modalityMetadata?: AishaModalityMetadata;
}
interface AishaSpeakerResponse {
    /** Which speaker/character this response entry is for */
    speakerId?: string;
    personId?: string;
    /** The generated response text */
    content: string;
}
interface AishaTruthRecord {
    noteId: string;
    subtype: "K_pref" | "K_profile" | "K_boundary";
    /** Human-readable canonical text */
    canonicalText: string;
    normalizedValue?: string;
    status: "active" | "provisional" | "superseded" | "disputed" | "archived" | "expired";
    confidence: number;
    /** If this truth superseded another, the canonical text of the old (superseded) truth */
    supersededPriorText?: string;
    /** Ordered provenance chain */
    provenanceChain: string[];
    subjectKind: "user" | "person" | "relationship";
    subjectPersonId?: string;
    lastConfirmedAt?: string;
}
interface AishaRelationshipState {
    sourcePersonId: string;
    targetPersonId: string;
    trust: number;
    tension: number;
    historySummary?: string;
    lastInteractionAt?: string;
    isPlaceholder?: boolean;
}
interface AishaContinuityEvent {
    eventId: string;
    eventType: "memory_formed" | "relationship_changed" | "tension_spike" | "boundary_established" | "other";
    description: string;
    subjectIds: string[];
    actorIds?: string[];
    targetIds?: string[];
    continuityExplanation?: string;
    importance: "low" | "medium" | "high";
    isPlaceholder?: boolean;
}
interface AishaCharacterProfile {
    personId: string;
    stableNotes: AishaTruthRecord[];
    relationshipStates: AishaRelationshipState[];
    isPlaceholder?: boolean;
}
interface AishaRoomSocialState {
    roomId: string;
    overallTension: number;
    dominantMood: string;
    activeConflicts?: string[];
    speakerPressures?: string[];
    isPlaceholder?: boolean;
}
interface AishaMemorySummary {
    /** Active, currently-believed truths */
    activeTruths: AishaTruthRecord[];
    /** Superseded / archived historical truths — the evidence that was replaced */
    supersededTruths: AishaTruthRecord[];
    /** Extracted note candidates not yet confirmed as active */
    memoryCandidates: AishaTruthRecord[];
    /** Character-specific memory summaries (what each character remembers/feels) */
    characterProfiles?: AishaCharacterProfile[];
    sessionId: string;
    threadId?: string;
    episodeId?: string;
}
interface AishaStateEnvelope {
    certainty: number;
    load: number;
    tension: number;
    valence: number;
    desire: number;
    trust: number;
    activeRelationshipPersonId?: string;
    activeSpeakerId?: string;
}
interface AishaRelationshipDelta {
    personId: string;
    vectorKey: string;
    delta: number;
}
interface AishaEngineTrace {
    traceId: string;
    sessionId: string;
    status: "running" | "succeeded" | "failed";
    events: Array<{
        stage: string;
        at: string;
        data?: Record<string, unknown>;
    }>;
    failureReason?: string;
    criticLoopCycles?: number;
    criticMaxCyclesHit?: boolean;
}
interface AishaEngineError {
    code: string;
    message: string;
    /** Which internal stage failed */
    stage?: string;
    /** Whether the caller can retry without changing inputs */
    retryable: boolean;
}
interface AishaStudioPulseResponse {
    /** True when the full A.I.S.H.A runtime path executed without falling back */
    ok: boolean;
    /** Array of response entries — always at least one */
    responses: AishaSpeakerResponse[];
    /** Memory state after this turn */
    memorySummary: AishaMemorySummary;
    /** Emotional/relational state envelope */
    stateEnvelope: AishaStateEnvelope;
    /**
     * Advisory only. Studio Pulse owns final planning and speaker selection.
     * This provides continuity pressure signals to the host.
     */
    roomSocialState?: AishaRoomSocialState;
    /** Continuity events that matter for the next turn */
    continuityEvents?: AishaContinuityEvent[];
    /** Per-person relationship deltas for this turn */
    relationshipDeltas: AishaRelationshipDelta[];
    /** Full execution trace for debugging */
    trace: AishaEngineTrace;
    /**
     * "production" — real Gemini generator ran
     * "fixture"    — in-memory fixture generator ran (no LLM)
     * "mock"       — this was not processed by the A.I.S.H.A engine at all
     * "unavailable" — engine could not boot (missing deps / key)
     */
    engineMode: "production" | "fixture" | "mock" | "unavailable";
    /** True only when the real engine path completed — never set for mock/unavailable */
    aishaEngineConnected: boolean;
    /** 0.0–1.0 confidence in the response */
    confidence?: number;
    /** Set when ok=false */
    fallbackReason?: string;
    /** Error details on hard failure */
    error?: AishaEngineError;
}

type NoteSubtype = "K_pref" | "K_profile" | "K_boundary";
type NoteStatus = "active" | "provisional" | "superseded" | "disputed" | "archived" | "expired";
type Modality = "text" | "voice" | "image" | "video";
type ConsentStatus = "allow" | "filter" | "deny" | "needs_review";
interface RecordMeta {
    id: string;
    createdAt: string;
    updatedAt?: string;
    sourceModality: Modality;
}
interface IdentityContext {
    speakerId?: string;
    recognizedPersonId?: string;
    speakerConfidence?: number;
    relationshipScope?: string;
    coPresentEntities?: string[];
}
interface PrivacyContext {
    consentStatus?: ConsentStatus;
}
interface TurnRecord extends RecordMeta, Partial<IdentityContext>, Partial<PrivacyContext> {
    kind: "turn";
    sessionId: string;
    turnIndex: number;
    speaker: "user" | "aisha" | "other";
    rawText: string;
    normalizedText?: string;
    stateSnapshotId: string;
    relationshipTargetPersonId?: string;
    entityMentions: Array<{
        surface: string;
        entityType: "person" | "org" | "place" | "object" | "unknown";
        personId?: string;
        confidence?: number;
    }>;
    immutable: true;
}
interface StateSnapshotRecord extends RecordMeta, Partial<PrivacyContext> {
    kind: "state_snapshot";
    sessionId: string;
    turnId: string;
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
    schemaVersion: string;
}
interface EpisodeRecord extends RecordMeta, Partial<IdentityContext>, Partial<PrivacyContext> {
    kind: "episode";
    sessionId: string;
    threadId: string;
    startTurnId: string;
    endTurnId: string;
    turnIds: string[];
    topicLabels: string[];
    summary?: string;
    primaryModality: Modality | "mixed";
    modalityMix: Modality[];
    participantSpeakerIds: string[];
    participantPersonIds: string[];
    focalRelationshipPersonId?: string;
    boundaryReason: {
        topicShift: boolean;
        surpriseDiscontinuity: boolean;
        score: number;
    };
}
interface ThreadRecord {
    id: string;
    sessionId: string;
    activeEpisodeId: string;
    episodeIds: string[];
    lastUpdatedAt: string;
    threadSummary?: string;
    focalRelationshipPersonId?: string;
}
interface AuditEvent {
    timestamp: string;
    action: "created" | "relationship_gated" | "operator_approved" | "operator_rejected";
    reason: string;
    operatorId?: string;
    previousState?: string;
    newState?: string;
}
interface NoteRecord extends RecordMeta, Partial<PrivacyContext> {
    kind: "note";
    subtype: NoteSubtype;
    status: NoteStatus;
    canonicalText: string;
    normalizedValue?: string;
    confidence: number;
    extractionConfidenceRaw: number;
    provenanceChain: string[];
    subjectKind: "user" | "person" | "relationship";
    subjectSpeakerId?: string;
    subjectPersonId?: string;
    relationshipContextPersonId?: string;
    sourceEpisodeIds: string[];
    lastConfirmedAt?: string;
    lastReviewedAt?: string;
    reviewState: "pending" | "accepted" | "rejected";
    reinferencePolicy: {
        mode: "allow" | "block_auto_reinfer" | "needs_review";
        reason?: string;
    };
    auditTrail: AuditEvent[];
    expiresAt?: string;
    reconsolidationSignalCount?: number;
}
interface EpisodeBoundaryInput {
    sessionId: string;
    activeEpisode?: EpisodeRecord | null;
    recentTurns: TurnRecord[];
    currentTurn: TurnRecord;
    previousSnapshot?: StateSnapshotRecord | null;
    currentSnapshot: StateSnapshotRecord;
}
interface EpisodeBoundaryDecision {
    split: boolean;
    topicShift: boolean;
    surpriseDiscontinuity: boolean;
    score: number;
    reasons: string[];
}
interface RetrievalBundle {
    recentTurns: TurnRecord[];
    activeThread: EpisodeRecord[];
    activeNotes: NoteRecord[];
    supportingEpisodes: EpisodeRecord[];
    contradictionEvidence: Array<NoteRecord | EpisodeRecord>;
    /**
     * Supersession context for active notes. Map from active noteId → canonical
     * text of the note it superseded. Populated by the retrieval planner; empty
     * when no supersession links exist. Read-only; no store writes in render path.
     */
    supersessionContext: Record<string, string>;
}
interface MemoryContextBlock {
    stableNotesBlock: string;
    threadBlock: string;
    episodeEvidenceBlock?: string;
}
interface ITurnStore {
    write(turn: TurnRecord): Promise<TurnRecord>;
    getRecent(sessionId: string, limit: number): Promise<TurnRecord[]>;
    getById(id: string): Promise<TurnRecord | null>;
    getByIds(ids: string[]): Promise<TurnRecord[]>;
}
interface ISnapshotStore {
    write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord>;
    getLatest(sessionId: string): Promise<StateSnapshotRecord | null>;
    getByTurnId(turnId: string): Promise<StateSnapshotRecord | null>;
    getRecent(sessionId: string, limit: number): Promise<StateSnapshotRecord[]>;
}
interface IEpisodeBoundaryDetector {
    decide(input: EpisodeBoundaryInput): EpisodeBoundaryDecision;
}
interface IEpisodeStore {
    createFromTurn(turn: TurnRecord, decision: EpisodeBoundaryDecision, options?: {
        episodeId?: string;
    }): Promise<EpisodeRecord>;
    appendTurn(episodeId: string, turn: TurnRecord, decision: EpisodeBoundaryDecision): Promise<EpisodeRecord>;
    getActive(sessionId: string): Promise<EpisodeRecord | null>;
    getById(id: string): Promise<EpisodeRecord | null>;
    getByIds(ids: string[]): Promise<EpisodeRecord[]>;
}
interface IThreadStore {
    update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord>;
    getActive(sessionId: string): Promise<ThreadRecord | null>;
}
interface IRetrievalPlanner {
    build(sessionId: string, currentTurn: TurnRecord): Promise<RetrievalBundle>;
    /**
     * Targeted re-retrieval for specific notes identified by the critic.
     * Replaces only activeNotes; all other fields are inherited from baseBundle.
     * Does NOT write to any store. Does NOT call Date.now().
     */
    buildTargeted(input: {
        sessionId: string;
        currentTurn: TurnRecord;
        baseBundle: RetrievalBundle;
        targetNoteIds: string[];
    }): Promise<RetrievalBundle>;
}
interface IContextBuilder {
    build(bundle: RetrievalBundle): MemoryContextBlock;
}

/**
 * Pack 3.12 — Shadow Retrieval Instrumentation
 *
 * SHADOW MODE ONLY. Not a live retrieval path.
 * Approved by Pack 3.11 Option D: shadow-mode promotion of both associative
 * retrieval and trace consumption, independently, feature-flag-gated, default OFF.
 *
 * Contract (non-negotiable per Pack 3.11 §9):
 *  - Does NOT modify bundle.activeNotes, bundle.contradictionEvidence,
 *    bundle.supportingEpisodes, or any generator-visible field.
 *  - Does NOT write to noteVersioning, turnStore, threadStore, or any persistent store.
 *  - Exceptions are silently swallowed and logged — never propagated.
 *  - Results are written only to the operator audit log (OperatorAuditEntry).
 *  - Hard latency gate: if either lane exceeds SHADOW_LATENCY_HARD_LIMIT_MS on
 *    three consecutive turns, that lane's flag is automatically disabled.
 *  - The two lanes are independent: their outputs are NEVER merged.
 */

interface ShadowAuditEntry {
    auditKind: "shadow_retrieval_research";
    lane: "associative" | "trace";
    sessionId: string;
    turnId: string;
    /** Number of notes in the finalized baseline retrieval bundle. */
    baselineNoteCount: number;
    /** Number of shadow-lane hits produced (not injected into bundle). */
    shadowHitCount: number;
    /**
     * Estimated token delta if the shadow hits were injected into the prompt.
     * Computed as: shadowHitCount × AVG_NOTE_TOKEN_COST (35 tokens per note).
     * Used to predict prompt budget impact for Pack 3.12 gate evidence.
     */
    estimatedTokenDelta: number;
    /** Wall-time latency of the shadow call in milliseconds. */
    latencyMs: number;
    /**
     * Fraction of shadow hits that match notes already flagged as needs_review.
     * Available as a proxy for review disambiguation usefulness.
     */
    reviewDisambiguationEstimate: number;
    /**
     * Fraction of shadow hits that are from a different episode than any baseline note.
     * Available for cross-episode diversity measurement.
     */
    crossEpisodeDiversityEstimate: number;
    /** Whether the lane was auto-disabled on this turn (latency limit exceeded). */
    autoDisabledThisTurn: boolean;
}

/**
 * Pack 3.14 — Shadow Evidence Collector (Hot-Path Bridge)
 *
 * EVIDENCE COLLECTION ONLY. Not a live path, not a promotion decision.
 * This is the only production-touching piece in Pack 3.14.
 *
 * Responsibility: receive ShadowAuditEntry from Pack 3.12 shadow runs and
 * append them to a ShadowEvidenceStore instance supplied by the caller.
 *
 * Contract:
 *  - Does NOT modify the retrieval bundle, any note record, or any store
 *    that the generator reads.
 *  - All exceptions silently swallowed — never propagated to the hot path.
 *  - The ShadowEvidenceStore instance is injected by the caller; this module
 *    does not create or own a singleton store.
 *  - Associative and trace entries are dispatched to the same store but the
 *    store's lane index keeps them separated (see shadowEvidenceStore.ts).
 *  - No Date.now() in the callable path — clock is injected for determinism.
 */

interface IShadowEvidenceCollector {
    /**
     * Collect a shadow audit entry from Pack 3.12.
     * Must never throw. Returns the generated evidenceId, or null on failure.
     */
    collect(entry: ShadowAuditEntry, collectedAt: string): string | null;
}

interface TurnInput {
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
interface DeterministicStateResult {
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
interface IDeterministicStateEngine {
    update(input: {
        turn: TurnInput;
        previousSnapshot: StateSnapshotRecord | null;
    }): Promise<DeterministicStateResult>;
}
interface GeneratorInput {
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
    kPositionBiases?: ReadonlyArray<{
        domain: string;
        bias: number;
        confidence: number;
    }>;
    /** Studio Pulse context preserved from TurnInput for generation */
    studioPulseContext?: TurnInput["studioPulseContext"];
}
interface GeneratorOutput {
    raw: unknown;
    text?: string;
    metadata?: Record<string, unknown>;
}
interface IGeneratorAdapter {
    generate(input: GeneratorInput): Promise<GeneratorOutput>;
}
interface ParsedOutput {
    text: string;
    metadata?: Record<string, unknown>;
}
interface IRuntimeParser {
    parse(output: GeneratorOutput): ParsedOutput;
}
interface ValidationResult {
    valid: boolean;
    reasons: string[];
}
interface IRuntimeValidator {
    validate(input: {
        parsed: ParsedOutput;
        turn: TurnRecord;
        snapshot: StateSnapshotRecord;
        retrieval: RetrievalBundle;
    }): ValidationResult;
}
interface StagedArtifact {
    kind: "turn_candidate" | "snapshot_candidate" | "episode_candidate" | "thread_candidate" | "generation_output" | "validation_result" | "critic_measurement";
    key?: string;
    data: Record<string, unknown>;
}
interface RuntimeJournalSnapshot {
    traceId: string;
    sessionId: string;
    stagedArtifacts: StagedArtifact[];
}
interface IRuntimeJournal {
    stage(artifact: StagedArtifact): Promise<void>;
    snapshot(): RuntimeJournalSnapshot;
    commit<T>(input: {
        apply: () => Promise<T>;
    }): Promise<T>;
    abort(): Promise<void>;
}
interface IRuntimeTransaction {
    openJournal(input: {
        traceId: string;
        sessionId: string;
    }): Promise<IRuntimeJournal>;
}
interface IRuntimeRollback {
    rollback(input: {
        journal: IRuntimeJournal;
        traceId: string;
        sessionId: string;
        reason: string;
        error?: unknown;
    }): Promise<void>;
}
interface FallbackResult {
    text: string;
    reason: string;
}
interface IFallbackHandler {
    build(input: {
        turn: TurnInput;
        reason: string;
        error?: unknown;
    }): Promise<FallbackResult>;
}
/**
 * Typed vocabulary for critic findings. New issue types require a plan update;
 * do not add ad-hoc strings here.
 */
type CriticIssueType = "memory_contradiction" | "stale_note_surfaced" | "ungrounded_claim" | "threshold_coherence_failure";
interface CriticFinding {
    issueType: CriticIssueType;
    /** Localizes issue to a specific note where applicable. Undefined for session-level findings. */
    affectedNoteId?: string;
    /** Human-readable reason for logging and trace only. Never fed back to the LLM generator. */
    reason: string;
}
interface CriticLoopResult {
    cycleCount: number;
    maxCyclesHit: boolean;
    findings: CriticFinding[];
    didReRetrieve: boolean;
    finalText: string;
}
interface ICriticLoop {
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
interface TraceEvent {
    stage: string;
    at: string;
    data?: Record<string, unknown>;
}
interface RuntimeTraceSnapshot {
    traceId: string;
    sessionId: string;
    status: "running" | "succeeded" | "failed";
    events: TraceEvent[];
    failureReason?: string;
}
interface IRuntimeTrace {
    add(event: TraceEvent): void;
    fail(reason: string, error?: unknown): void;
    succeed(): void;
    snapshot(): RuntimeTraceSnapshot;
}
interface ITraceFactory {
    create(input: {
        traceId: string;
        sessionId: string;
    }): IRuntimeTrace;
}
interface IIdGenerator {
    next(prefix: string): string;
}
interface IClock {
    nowIso(): string;
}
interface IAsyncMemoryFollowup {
    scheduleEpisodeProcessing(input: {
        sessionId: string;
        episodeId: string;
    }): Promise<void>;
}
interface RuntimeMemoryDeps {
    turnStore: ITurnStore;
    snapshotStore: ISnapshotStore;
    episodeBoundary: IEpisodeBoundaryDetector;
    episodeStore: IEpisodeStore;
    threadStore: IThreadStore;
    retrievalPlanner: IRetrievalPlanner;
    contextBuilder: IContextBuilder;
}
interface KPositionScope {
    turnId: string;
    activeDomain?: string;
}
interface IKPositionStoreBoundary {
    getDirectionalBiases(scope: KPositionScope): ReadonlyArray<{
        domain: string;
        bias: number;
        confidence: number;
    }>;
}
interface ProcessTurnDeps extends RuntimeMemoryDeps {
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
    shadowEvidenceCollector?: IShadowEvidenceCollector;
}

/**
 * A.I.S.H.A Host Adapter for Studio Pulse
 *
 * Translates AishaStudioPulseRequest → TurnInput → processTurn() → AishaStudioPulseResponse.
 *
 * Rules:
 * - Uses in-memory stores + InMemoryGeneratorAdapter for the fixture path.
 * - Returns engineMode: "unavailable" with aishaEngineConnected: false when deps cannot be built.
 * - Never fabricates a successful engine response.
 * - Never claims aishaEngineConnected: true unless processTurn() returned ok: true.
 * - Does not invent memory fields that don't exist in the engine yet.
 */

interface AishaHostAdapterOptions {
    /**
     * Pre-built ProcessTurnDeps. Use buildProductionRuntime() for real Gemini path,
     * or buildFixtureDeps() from tests for the in-memory path.
     * When absent, the adapter returns engineMode: "unavailable".
     */
    deps?: ProcessTurnDeps;
    /**
     * "production" | "fixture" — set by the caller to honestly label which deps path is active.
     * The adapter will not override this unless falling back to unavailable.
     */
    engineMode?: "production" | "fixture";
    /**
     * Optional production Gemini key supplied by the Studio Pulse host. This lets
     * the host reuse its existing provider-vault key chain without exposing the
     * secret or importing runtime internals. Falls back to GEMINI_API_KEY.
     */
    productionGeminiApiKey?: string;
    /**
     * Optional production Gemini timeout supplied by Studio Pulse. Kept on the
     * public host boundary so callers do not import runtime internals.
     */
    productionGeminiTimeoutMs?: number;
    /**
     * Optional production Gemini model supplied by Studio Pulse experiments.
     * Falls back to the runtime default when unset.
     */
    productionGeminiModel?: string;
}
/**
 * processAishaRequest
 *
 * The one function Studio Pulse calls. Maps AishaStudioPulseRequest to the engine and back.
 * Returns engineMode: "unavailable" and aishaEngineConnected: false if deps are missing.
 */
declare function processAishaRequest(request: AishaStudioPulseRequest, options?: AishaHostAdapterOptions): Promise<AishaStudioPulseResponse>;

export { type AishaCharacterState, type AishaEngineError, type AishaEngineTrace, type AishaHostAdapterOptions, type AishaMemorySummary, type AishaModalityMetadata, type AishaRecentMessage, type AishaRelationshipDelta, type AishaSpeakerResponse, type AishaStateEnvelope, type AishaStudioPulseRequest, type AishaStudioPulseResponse, type AishaTruthRecord, processAishaRequest };
