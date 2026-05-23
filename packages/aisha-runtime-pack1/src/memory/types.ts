export type NoteSubtype = "K_pref" | "K_profile" | "K_boundary";
export type NoteStatus = "active" | "provisional" | "superseded" | "disputed" | "archived" | "expired";
export type Modality = "text" | "voice" | "image" | "video";
export type ConsentStatus = "allow" | "filter" | "deny" | "needs_review";

export interface RecordMeta {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sourceModality: Modality;
}

export interface IdentityContext {
  speakerId?: string;
  recognizedPersonId?: string;
  speakerConfidence?: number;
  relationshipScope?: string;
  coPresentEntities?: string[];
}

export interface PrivacyContext {
  consentStatus?: ConsentStatus;
}

export type BaseMemoryMeta = RecordMeta &
  Partial<IdentityContext> &
  Partial<PrivacyContext>;

export interface TurnRecord
  extends RecordMeta,
    Partial<IdentityContext>,
    Partial<PrivacyContext> {
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

export interface StateSnapshotRecord extends RecordMeta, Partial<PrivacyContext> {
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

export interface EpisodeRecord
  extends RecordMeta,
    Partial<IdentityContext>,
    Partial<PrivacyContext> {
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

export interface ThreadRecord {
  id: string;
  sessionId: string;
  activeEpisodeId: string;
  episodeIds: string[];
  lastUpdatedAt: string;
  threadSummary?: string;
  focalRelationshipPersonId?: string;
}

export interface AuditEvent {
  timestamp: string;
  action: "created" | "relationship_gated" | "operator_approved" | "operator_rejected";
  reason: string;
  operatorId?: string;
  previousState?: string;
  newState?: string;
}

export interface NoteRecord extends RecordMeta, Partial<PrivacyContext> {
  kind: "note";
  subtype: NoteSubtype;
  status: NoteStatus;
  canonicalText: string;
  normalizedValue?: string;
  confidence: number;                // live value; may be discounted by penalties
  extractionConfidenceRaw: number;   // frozen at extraction time; used for audit/diagnostics
  provenanceChain: string[];         // ordered events; e.g. ["llm_constrained_v1", "reinforced_ep2"]
  subjectKind: "user" | "person" | "relationship";
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  relationshipContextPersonId?: string;
  sourceEpisodeIds: string[];
  lastConfirmedAt?: string;
  lastReviewedAt?: string;           // set by persistReviewSignals; survives across turns
  reviewState: "pending" | "accepted" | "rejected";
  reinferencePolicy: {
    mode: "allow" | "block_auto_reinfer" | "needs_review";
    reason?: string;
  };
  auditTrail: AuditEvent[];
  expiresAt?: string;                // Provisional notes have bounded lifetimes
  reconsolidationSignalCount?: number; // Pack 4.2: count of soft reconsolidation signals received; undefined === 0
}

export interface NoteLinkRecord extends RecordMeta {
  kind: "note_link";
  fromNoteId: string;
  toNoteId: string;
  relation:
    | "supports"
    | "contradicts"
    | "supersedes"
    | "derived_from"
    | "blocks_reinference_for";
  strength?: number;
}

export interface EpisodeBoundaryInput {
  sessionId: string;
  activeEpisode?: EpisodeRecord | null;
  recentTurns: TurnRecord[];
  currentTurn: TurnRecord;
  previousSnapshot?: StateSnapshotRecord | null;
  currentSnapshot: StateSnapshotRecord;
}

export interface EpisodeBoundaryDecision {
  split: boolean;
  topicShift: boolean;
  surpriseDiscontinuity: boolean;
  score: number;
  reasons: string[];
}

export interface NoteCandidate {
  subtype: NoteSubtype;
  canonicalText: string;
  normalizedValue?: string;
  confidence: number;
  extractionConfidenceRaw: number;   // immutable at extraction time; never decays
  provenanceChain?: string[];        // ordered provenance events; max 5 entries
  subjectKind: "user" | "person" | "relationship";
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  relationshipContextPersonId?: string;
  sourceEpisodeIds: string[];
  provenanceReason: string;
  status: NoteStatus;
}

export interface HeuristicGateDecision {
  pass: boolean;
  reasons: string[];
}

export interface RetrievalBundle {
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

export interface StableNoteView {
  noteId: string;
  subtype: NoteSubtype;
  text: string;
  confidence: number;
  extractionConfidenceRaw: number;   // frozen at extraction time
  lastConfirmedAt?: string;
  sourceEpisodeCount: number;
  isStale: boolean;                  // true if reinferencePolicy marks this note as stale
  supersededPriorText?: string;      // canonical text of the note this superseded, if any
}

export interface MemoryContextBlock {
  stableNotesBlock: string;
  threadBlock: string;
  episodeEvidenceBlock?: string;
}

export interface ListActiveNotesFilter {
  sessionId?: string;
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  includeGlobal?: boolean;
  relationshipContextPersonId?: string;
  allowedConsentStatuses?: ConsentStatus[];
  maxResults?: number;
  includeProvisional?: boolean;
}

export interface ListProvisionalNotesFilter {
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  includeGlobal?: boolean;
  maxResults?: number;
}

export interface ProvisionalPromotionResult {
  promoted: NoteRecord[];   // notes whose status changed from provisional → active
  expired: NoteRecord[];    // notes whose status changed from provisional → stale
  unchanged: NoteRecord[];  // provisional notes that did not meet promotion or expiry thresholds
}

export interface ListContradictionEvidenceFilter {
  sessionId?: string;
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  relationshipContextPersonId?: string;
  allowedConsentStatuses?: ConsentStatus[];
  maxResults?: number;
  includeProvisional?: boolean;
}

export interface NoteMergeResult {
  notesWritten: NoteRecord[];
  linksWritten: NoteLinkRecord[];
  /**
   * Pack 3.8: Operator audit entries emitted for this merge operation.
   * Includes one entry per new/rejected/reviewed note, plus one per superseded prior.
   * Optional — present only when mergeOrSupersede has audit emission enabled.
   */
  auditEntries?: import("./operatorAuditTrail").OperatorAuditEntry[];
}

export interface ITurnStore {
  write(turn: TurnRecord): Promise<TurnRecord>;
  getRecent(sessionId: string, limit: number): Promise<TurnRecord[]>;
  getById(id: string): Promise<TurnRecord | null>;
  getByIds(ids: string[]): Promise<TurnRecord[]>;
}

export interface ISnapshotStore {
  write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord>;
  getLatest(sessionId: string): Promise<StateSnapshotRecord | null>;
  getByTurnId(turnId: string): Promise<StateSnapshotRecord | null>;
  getRecent(sessionId: string, limit: number): Promise<StateSnapshotRecord[]>;
}

export interface IEpisodeBoundaryDetector {
  decide(input: EpisodeBoundaryInput): EpisodeBoundaryDecision;
}

export interface IEpisodeStore {
  createFromTurn(
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
    options?: { episodeId?: string },
  ): Promise<EpisodeRecord>;
  appendTurn(
    episodeId: string,
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
  ): Promise<EpisodeRecord>;
  getActive(sessionId: string): Promise<EpisodeRecord | null>;
  getById(id: string): Promise<EpisodeRecord | null>;
  getByIds(ids: string[]): Promise<EpisodeRecord[]>;
}

export interface IThreadStore {
  update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord>;
  getActive(sessionId: string): Promise<ThreadRecord | null>;
}

export interface INoteExtractionSandbox {
  heuristicGate(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): HeuristicGateDecision;
  extract(
    episode: EpisodeRecord,
    turns: TurnRecord[],
  ): Promise<NoteCandidate[]>;
}

export interface INoteVersioning {
  validate(candidate: NoteCandidate): { valid: boolean; reasons: string[] };
  mergeOrSupersede(
    candidate: NoteCandidate,
    existing: NoteRecord[],
    context?: { trust: number; caution: number },
  ): Promise<NoteMergeResult>;
  persistReviewSignals(
    signals: import("./reactiveReconsolidation").PersistedReviewSignal[],
    subjectScope: {
      subjectKind: NoteRecord["subjectKind"];
      subjectPersonId?: string;
      relationshipContextPersonId?: string;
    },
  ): Promise<NoteRecord[]>;
  listActiveNotes(filter?: ListActiveNotesFilter): Promise<NoteRecord[]>;
  /**
   * Returns only provisional notes. Never returns active or stale notes.
   * Used exclusively by the async followup lane (evaluateProvisionalPromotion).
   * Must NEVER be called on the hot generation path.
   */
  listProvisionalNotes(filter?: ListProvisionalNotesFilter): Promise<NoteRecord[]>;
  /**
   * Evaluates each current provisional note:
   *   - promote to active if corroborated by >1 distinct source episodes AND confidence >= 0.65
   *   - expire to stale if expiresAt has passed
   *   - leave unchanged otherwise
   * Returns a ProvisionalPromotionResult. Writes promoted/expired notes back to store.
   * Async followup lane only. Never call on hot path.
   */
  evaluateProvisionalPromotion(
    filter?: ListProvisionalNotesFilter,
  ): Promise<ProvisionalPromotionResult>;
  listContradictionEvidence(
    filter?: ListContradictionEvidenceFilter,
  ): Promise<NoteRecord[]>;
  operatorReview(
    noteId: string,
    decision: "accept" | "reject",
    operatorId: string,
  ): Promise<NoteRecord | null>;
  /**
   * For each given active noteId, returns the canonical text of the note it
   * directly superseded, if a supersedes link exists. Pure read. No writes.
   * Bounded: at most 1 superseded text per input noteId.
   */
  listSupersededByIds(noteIds: string[]): Promise<Record<string, string>>;
}

export interface IRetrievalPlanner {
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

export interface IContextBuilder {
  build(bundle: RetrievalBundle): MemoryContextBlock;
}
