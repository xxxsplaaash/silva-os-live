/**
 * A.I.S.H.A → Studio Pulse Adapter Contract
 *
 * This file defines the TypeScript surface Studio Pulse (Codex) codes against.
 * It is the ONLY file Codex should import from the A.I.S.H.A engine package.
 *
 * Do not import internal A.I.S.H.A modules from Codex.
 * Do not reimplement the memory, note, or truth stores in Studio Pulse.
 */
export interface AishaRecentMessage {
    role: "user" | "assistant" | "other";
    content: string;
    speakerId?: string;
    personId?: string;
    timestamp?: string;
}
export interface AishaCharacterState {
    personId: string;
    displayName?: string;
    lastKnownBeliefs?: string[];
    role?: string;
    mood?: string;
    intent?: string;
}
export interface AishaModalityMetadata {
    sourceModality: "text" | "voice" | "image" | "video";
    sourceChannel?: "chat" | "voice_call" | "upload" | "camera" | "screen";
    speakerId?: string;
    activeSpeakerId?: string;
    recognizedPersonId?: string;
    speakerConfidence?: number;
}
export interface AishaStudioPulseRequest {
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
export interface AishaSpeakerResponse {
    /** Which speaker/character this response entry is for */
    speakerId?: string;
    personId?: string;
    /** The generated response text */
    content: string;
}
export interface AishaTruthRecord {
    noteId: string;
    subtype: "K_pref" | "K_profile" | "K_boundary";
    /** Human-readable canonical text */
    canonicalText: string;
    normalizedValue?: string;
    status: "active" | "provisional" | "superseded" | "disputed" | "archived" | "expired" | "stale";
    confidence: number;
    /** If this truth superseded another, the canonical text of the old (superseded) truth */
    supersededPriorText?: string;
    /** Ordered provenance chain */
    provenanceChain: string[];
    subjectKind: "user" | "person" | "relationship";
    subjectPersonId?: string;
    lastConfirmedAt?: string;
}
export interface AishaRelationshipState {
    sourcePersonId: string;
    targetPersonId: string;
    trust: number;
    tension: number;
    historySummary?: string;
    lastInteractionAt?: string;
    isPlaceholder?: boolean;
}
export interface AishaContinuityEvent {
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
export interface AishaCharacterProfile {
    personId: string;
    stableNotes: AishaTruthRecord[];
    relationshipStates: AishaRelationshipState[];
    isPlaceholder?: boolean;
}
export interface AishaRoomSocialState {
    roomId: string;
    overallTension: number;
    dominantMood: string;
    activeConflicts?: string[];
    speakerPressures?: string[];
    isPlaceholder?: boolean;
}
export interface AishaMemorySummary {
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
export interface AishaStateEnvelope {
    certainty: number;
    load: number;
    tension: number;
    valence: number;
    desire: number;
    trust: number;
    activeRelationshipPersonId?: string;
    activeSpeakerId?: string;
}
export interface AishaRelationshipDelta {
    personId: string;
    vectorKey: string;
    delta: number;
}
export interface AishaEngineTrace {
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
    aishaDiagnostics?: {
        aishaPersistenceMode?: "memory" | "postgres";
        aishaPersistenceBackend?: "in-memory" | "postgres" | "unavailable";
        aishaPersistenceConnected?: boolean;
        aishaPersistenceFailureReason?: string;
    };
}
export interface AishaEngineError {
    code: string;
    message: string;
    /** Which internal stage failed */
    stage?: string;
    /** Whether the caller can retry without changing inputs */
    retryable: boolean;
}
export interface AishaStudioPulseResponse {
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
