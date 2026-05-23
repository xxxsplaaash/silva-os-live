import { CautiousFallbackHandler } from "../governance/fallback";
import { SimpleContextBuilder } from "../memory/contextBuilder";
import { DeterministicEpisodeBoundaryDetector } from "../memory/episodeBoundary";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import { SimpleRetrievalPlanner } from "../memory/retrievalPlanner";
import { InMemorySnapshotStore } from "../memory/snapshotStore";
import { InMemoryTurnStore } from "../memory/turnStore";
import type {
  ConsentStatus,
  EpisodeBoundaryDecision,
  EpisodeRecord,
  IEpisodeStore,
  INoteVersioning,
  IThreadStore,
  NoteCandidate,
  NoteLinkRecord,
  NoteRecord,
  StateSnapshotRecord,
  ThreadRecord,
  TurnRecord,
} from "../memory/types";
import { InMemoryGeneratorAdapter } from "../generation/inMemoryGeneratorAdapter";
import { FixturePathParser } from "../runtime/fixtureParser";
import { processTurn } from "../runtime/processTurn";
import { InMemoryAsyncMemoryFollowup } from "../runtime/inMemoryAsyncMemoryFollowup";
import { CompoundStateEngine } from "../state/compoundStateEngine";
import { RegexSignalClassifier } from "../state/signals";
import { JournalRollbackHelper } from "../runtime/rollback";
import { InMemoryRuntimeTransaction } from "../runtime/transaction";
import type {
  DeterministicStateResult,
  FallbackResult,
  IClock,
  IDeterministicStateEngine,
  IFallbackHandler,
  IIdGenerator,
  IRuntimeTrace,
  ITraceFactory,
  ProcessTurnDeps,
  RuntimeTraceSnapshot,
  TraceEvent,
  TurnInput,
} from "../runtime/runtime_types";
import { MinimalRuntimeValidator } from "../runtime/validator";
import type {
  ScenarioEnvironment,
  ScenarioEnvironmentFactory,
} from "./fixtureTypes";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeValue(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSubject(a: NoteCandidate | NoteRecord, b: NoteRecord): boolean {
  return (
    a.subjectKind === b.subjectKind &&
    (a.subjectSpeakerId ?? "") === (b.subjectSpeakerId ?? "") &&
    (a.subjectPersonId ?? "") === (b.subjectPersonId ?? "") &&
    (a.relationshipContextPersonId ?? "") ===
      (b.relationshipContextPersonId ?? "")
  );
}

function isSameMeaning(candidate: NoteCandidate, note: NoteRecord): boolean {
  const normalizedCandidate = normalizeValue(
    candidate.normalizedValue ?? candidate.canonicalText,
  );
  const normalizedExisting = normalizeValue(
    note.normalizedValue ?? note.canonicalText,
  );

  return (
    candidate.subtype === note.subtype &&
    sameSubject(candidate, note) &&
    normalizedCandidate === normalizedExisting
  );
}

function derivePrimaryModality(
  modalities: Array<"text" | "voice" | "image" | "video">,
): "text" | "voice" | "image" | "video" | "mixed" {
  const uniq = unique(modalities);
  return uniq.length === 1 ? uniq[0] : "mixed";
}

function isGlobalUserScopedNote(note: {
  subjectKind: string;
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  relationshipContextPersonId?: string;
}): boolean {
  return (
    note.subjectKind === "user" &&
    !note.subjectSpeakerId &&
    !note.subjectPersonId &&
    !note.relationshipContextPersonId
  );
}

/**
 * Fixture-path consent rule:
 * if a seeded fixture note does not specify consentStatus, treat it as "allow".
 * This keeps fixture seeding lightweight while still respecting explicit "deny".
 */
function consentAllowed(
  consentStatus: ConsentStatus | undefined,
  allowedConsentStatuses?: Array<Exclude<ConsentStatus, undefined>>,
): boolean {
  if (!allowedConsentStatuses || allowedConsentStatuses.length === 0) {
    return consentStatus !== "deny";
  }

  if (!consentStatus) {
    return allowedConsentStatuses.includes("allow");
  }

  return allowedConsentStatuses.includes(consentStatus);
}

type FixtureActiveNotesFilter = {
  sessionId?: string;
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  includeGlobal?: boolean;
  relationshipContextPersonId?: string;
  allowedConsentStatuses?: Array<Exclude<ConsentStatus, undefined>>;
  maxResults?: number;
};

type FixtureContradictionFilter = {
  sessionId?: string;
  subjectSpeakerId?: string;
  subjectPersonId?: string;
  relationshipContextPersonId?: string;
  allowedConsentStatuses?: Array<Exclude<ConsentStatus, undefined>>;
  maxResults?: number;
};

class SystemClock implements IClock {
  nowIso(): string {
    return nowIso();
  }
}

class SequentialIdGenerator implements IIdGenerator {
  private counters = new Map<string, number>();

  next(prefix: string): string {
    const nextValue = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, nextValue);
    return `${prefix}_${nextValue}`;
  }
}

class RuntimeTrace implements IRuntimeTrace {
  private status: "running" | "succeeded" | "failed" = "running";
  private failureReason?: string;
  private readonly events: TraceEvent[] = [];

  constructor(
    private readonly traceId: string,
    private readonly sessionId: string,
  ) {}

  add(event: TraceEvent): void {
    this.events.push({
      ...event,
      data: event.data ? { ...event.data } : undefined,
    });
  }

  fail(reason: string): void {
    this.status = "failed";
    this.failureReason = reason;
  }

  succeed(): void {
    this.status = "succeeded";
  }

  snapshot(): RuntimeTraceSnapshot {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      status: this.status,
      events: this.events.map((event) => ({
        ...event,
        data: event.data ? { ...event.data } : undefined,
      })),
      failureReason: this.failureReason,
    };
  }
}

class RuntimeTraceFactory implements ITraceFactory {
  create(input: { traceId: string; sessionId: string }): IRuntimeTrace {
    return new RuntimeTrace(input.traceId, input.sessionId);
  }
}

class FixtureFallbackHandler implements IFallbackHandler {
  async build(input: {
    turn: TurnInput;
    reason: string;
    error?: unknown;
  }): Promise<FallbackResult> {
    return {
      text: `Fallback response to: ${input.turn.rawText}`,
      reason: input.reason,
    };
  }
}



class FixtureEpisodeStore implements IEpisodeStore {
  private readonly byId = new Map<string, EpisodeRecord>();
  private readonly activeBySession = new Map<string, string>();

  async createFromTurn(
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
    options?: { episodeId?: string },
  ): Promise<EpisodeRecord> {
    const episode: EpisodeRecord = {
      id: options?.episodeId ?? makeId("episode"),
      kind: "episode",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceModality: turn.sourceModality,
      speakerId: turn.speakerId,
      recognizedPersonId: turn.recognizedPersonId,
      speakerConfidence: turn.speakerConfidence,
      relationshipScope: turn.relationshipScope,
      coPresentEntities: turn.coPresentEntities ?? [],
      consentStatus: turn.consentStatus,

      sessionId: turn.sessionId,
      threadId: `thread_${turn.sessionId}`,
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      summary: undefined,
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId ? [turn.recognizedPersonId] : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };

    this.byId.set(episode.id, episode);
    this.activeBySession.set(turn.sessionId, episode.id);
    return episode;
  }

  async appendTurn(
    episodeId: string,
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
  ): Promise<EpisodeRecord> {
    const existing = this.byId.get(episodeId);
    if (!existing) {
      throw new Error(`episode_not_found:${episodeId}`);
    }

    const modalityMix = unique([...existing.modalityMix, turn.sourceModality]);
    const updated: EpisodeRecord = {
      ...existing,
      updatedAt: nowIso(),
      sourceModality: turn.sourceModality,
      recognizedPersonId: turn.recognizedPersonId,
      speakerConfidence: turn.speakerConfidence,
      relationshipScope: turn.relationshipScope,
      coPresentEntities: unique([
        ...(existing.coPresentEntities ?? []),
        ...(turn.coPresentEntities ?? []),
      ]),
      consentStatus: turn.consentStatus ?? existing.consentStatus,
      endTurnId: turn.id,
      turnIds: [...existing.turnIds, turn.id],
      primaryModality: derivePrimaryModality(modalityMix),
      modalityMix,
      participantSpeakerIds: unique([
        ...existing.participantSpeakerIds,
        ...(turn.speakerId ? [turn.speakerId] : []),
      ]),
      participantPersonIds: unique([
        ...existing.participantPersonIds,
        ...(turn.recognizedPersonId ? [turn.recognizedPersonId] : []),
      ]),
      focalRelationshipPersonId:
        turn.relationshipTargetPersonId ?? existing.focalRelationshipPersonId,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };

    this.byId.set(updated.id, updated);
    this.activeBySession.set(turn.sessionId, updated.id);
    return updated;
  }

  async getActive(sessionId: string): Promise<EpisodeRecord | null> {
    const id = this.activeBySession.get(sessionId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async getById(id: string): Promise<EpisodeRecord | null> {
    return this.byId.get(id) ?? null;
  }

  async getByIds(ids: string[]): Promise<EpisodeRecord[]> {
    return ids
      .map((id) => this.byId.get(id))
      .filter((episode): episode is EpisodeRecord => Boolean(episode));
  }

  async seedEpisodes(episodes: EpisodeRecord[]): Promise<void> {
    for (const episode of episodes) {
      this.byId.set(episode.id, episode);
      this.activeBySession.set(episode.sessionId, episode.id);
    }
  }
}

class FixtureThreadStore implements IThreadStore {
  private readonly bySession = new Map<string, ThreadRecord>();

  async update(sessionId: string, episode: EpisodeRecord): Promise<ThreadRecord> {
    const existing = this.bySession.get(sessionId);

    const updated: ThreadRecord = {
      id: existing?.id ?? episode.threadId,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: unique([...(existing?.episodeIds ?? []), episode.id]),
      lastUpdatedAt: nowIso(),
      threadSummary: existing?.threadSummary,
      focalRelationshipPersonId:
        episode.focalRelationshipPersonId ?? existing?.focalRelationshipPersonId,
    };

    this.bySession.set(sessionId, updated);
    return updated;
  }

  async getActive(sessionId: string): Promise<ThreadRecord | null> {
    return this.bySession.get(sessionId) ?? null;
  }

  async seedThread(thread: ThreadRecord): Promise<void> {
    this.bySession.set(thread.sessionId, thread);
  }
}

class FixtureNoteVersioning implements INoteVersioning {
  private readonly notesById = new Map<string, NoteRecord>();
  private readonly linksById = new Map<string, NoteLinkRecord>();

  validate(candidate: NoteCandidate): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!["K_pref", "K_profile"].includes(candidate.subtype)) {
      reasons.push("unsupported_subtype");
    }

    if (!candidate.canonicalText.trim()) {
      reasons.push("empty_canonical_text");
    }

    if (!candidate.sourceEpisodeIds.length) {
      reasons.push("missing_source_episode_ids");
    }

    if (candidate.confidence < 0 || candidate.confidence > 1) {
      reasons.push("confidence_out_of_bounds");
    }

    return { valid: reasons.length === 0, reasons };
  }

  async mergeOrSupersede(
    candidate: NoteCandidate,
    existing: NoteRecord[],
  ): Promise<{ notesWritten: NoteRecord[]; linksWritten: NoteLinkRecord[] }> {
    const notesWritten: NoteRecord[] = [];
    const linksWritten: NoteLinkRecord[] = [];

    const activeSameTrack = existing.filter(
      (note) =>
        note.status === "active" &&
        candidate.subtype === note.subtype &&
        sameSubject(candidate, note),
    );

    const supportiveMatch = activeSameTrack.find((note) =>
      isSameMeaning(candidate, note),
    );

    if (supportiveMatch) {
      const updated: NoteRecord = {
        ...supportiveMatch,
        updatedAt: nowIso(),
        lastConfirmedAt: nowIso(),
        confidence: Math.min(
          1,
          Math.max(supportiveMatch.confidence, candidate.confidence),
        ),
        sourceEpisodeIds: unique([
          ...supportiveMatch.sourceEpisodeIds,
          ...candidate.sourceEpisodeIds,
        ]),
      };

      this.notesById.set(updated.id, updated);
      notesWritten.push(updated);
      return { notesWritten, linksWritten };
    }

    const newNote: NoteRecord = {
      id: makeId("note"),
      kind: "note",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceModality: "text",
      status: "active",
      subtype: candidate.subtype,
      canonicalText: candidate.canonicalText,
      normalizedValue: candidate.normalizedValue,
      confidence: candidate.confidence,
      subjectKind: candidate.subjectKind,
      subjectSpeakerId: candidate.subjectSpeakerId,
      subjectPersonId: candidate.subjectPersonId,
      relationshipContextPersonId: candidate.relationshipContextPersonId,
      sourceEpisodeIds: candidate.sourceEpisodeIds,
      lastConfirmedAt: nowIso(),
      reviewState: "pending",
      reinferencePolicy: {
        mode: "allow",
      },
    };

    this.notesById.set(newNote.id, newNote);
    notesWritten.push(newNote);

    for (const prior of activeSameTrack) {
      const supersededPrior: NoteRecord = {
        ...prior,
        updatedAt: nowIso(),
        status: "superseded",
      };

      this.notesById.set(supersededPrior.id, supersededPrior);
      notesWritten.push(supersededPrior);

      const link: NoteLinkRecord = {
        id: makeId("note_link"),
        kind: "note_link",
        createdAt: nowIso(),
        sourceModality: "text",
        fromNoteId: newNote.id,
        toNoteId: supersededPrior.id,
        relation: "supersedes",
        strength: 1,
      };

      this.linksById.set(link.id, link);
      linksWritten.push(link);
    }

    return { notesWritten, linksWritten };
  }

  async persistReviewSignals(
    signals: import("../memory/reactiveReconsolidation").PersistedReviewSignal[],
    subjectScope: {
      subjectKind: NoteRecord["subjectKind"];
      subjectPersonId?: string;
      relationshipContextPersonId?: string;
    },
  ): Promise<NoteRecord[]> {
    const updated: NoteRecord[] = [];
    for (const sig of signals) {
      const n = this.notesById.get(sig.noteId);
      if (n && n.status === "active") {
        n.reviewState = "pending";
        n.reinferencePolicy = { mode: "needs_review", reason: sig.reason };
        updated.push(n);
      }
    }
    return updated;
  }

  async listActiveNotes(filter?: FixtureActiveNotesFilter): Promise<NoteRecord[]> {
    const notes = [...this.notesById.values()].filter((note) => {
      if (note.status !== "active") return false;
      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (!consentAllowed(note.consentStatus, filter?.allowedConsentStatuses)) {
        return false;
      }
      if (note.confidence < 0.6) return false;
      return true;
    });

    const filtered = notes.filter((note) => {
      if (!filter) return true;

      if (filter.relationshipContextPersonId) {
        const matchesRelationship =
          note.relationshipContextPersonId === filter.relationshipContextPersonId;
        const allowGlobal =
          filter.includeGlobal === true && !note.relationshipContextPersonId;
        if (!matchesRelationship && !allowGlobal) return false;
      }

      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }

      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal =
          filter.includeGlobal === true && isGlobalUserScopedNote(note);
        if (!matchesSpeaker && !allowGlobal) return false;
      }

      return true;
    });

    return filtered
      .sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        const aTime = Date.parse(a.updatedAt ?? a.createdAt);
        const bTime = Date.parse(b.updatedAt ?? b.createdAt);
        return bTime - aTime;
      })
      .slice(0, filter?.maxResults ?? filtered.length);
  }

  async listContradictionEvidence(
    filter?: FixtureContradictionFilter,
  ): Promise<NoteRecord[]> {
    const notes = [...this.notesById.values()].filter((note) => {
      if (!(note.status === "superseded" || note.status === "disputed")) {
        return false;
      }
      return consentAllowed(note.consentStatus, filter?.allowedConsentStatuses);
    });

    const filtered = notes.filter((note) => {
      if (!filter) return true;

      if (filter.subjectPersonId && note.subjectPersonId !== filter.subjectPersonId) {
        return false;
      }

      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal =
          isGlobalUserScopedNote(note) && note.subjectKind === "user";
        if (!matchesSpeaker && !allowGlobal) {
          return false;
        }
      }

      if (
        filter.relationshipContextPersonId &&
        note.relationshipContextPersonId !== filter.relationshipContextPersonId
      ) {
        return false;
      }

      return true;
    });

    return filtered
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.createdAt);
        const bTime = Date.parse(b.updatedAt ?? b.createdAt);
        return bTime - aTime;
      })
      .slice(0, filter?.maxResults ?? 10);
  }

  async seedNotes(notes: NoteRecord[]): Promise<void> {
    for (const note of notes) {
      this.notesById.set(note.id, note);
    }
  }

  async listSupersededByIds(noteIds: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const idSet = new Set(noteIds);

    const linksByFrom = new Map<string, NoteLinkRecord[]>();
    for (const link of this.linksById.values()) {
      if (link.relation !== "supersedes") continue;
      if (!idSet.has(link.fromNoteId)) continue;
      const existing = linksByFrom.get(link.fromNoteId) ?? [];
      existing.push(link);
      linksByFrom.set(link.fromNoteId, existing);
    }

    for (const [fromNoteId, links] of linksByFrom.entries()) {
      const sorted = links.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
      const best = sorted[0];
      if (!best) continue;

      const supersededNote = this.notesById.get(best.toNoteId);
      if (!supersededNote) continue;

      result[fromNoteId] = supersededNote.canonicalText;
    }

    return result;
  }

  async operatorReview(
    noteId: string,
    decision: "accept" | "reject",
    operatorId: string,
  ): Promise<NoteRecord | null> {
    const note = this.notesById.get(noteId);
    if (!note) return null;

    const updated: NoteRecord = {
      ...note,
      updatedAt: nowIso(),
      reviewState: decision === "accept" ? "accepted" : "rejected",
      reinferencePolicy: {
        mode: decision === "accept" ? "allow" : "block_auto_reinfer",
      },
    };

    this.notesById.set(updated.id, updated);
    return updated;
  }
}

type SeedState = Partial<{
  turns: TurnRecord[];
  snapshots: StateSnapshotRecord[];
  episodes: EpisodeRecord[];
  thread: ThreadRecord;
  notes: NoteRecord[];
}>;

export interface InMemoryScenarioConfig {
  generator?: any; // typed fully in caller
  parser?: any;
  kPositionStore?: any;
}

export class InMemoryScenarioEnvironmentFactory
  implements ScenarioEnvironmentFactory
{
  constructor(private readonly config: InMemoryScenarioConfig = {}) {}
  async create(): Promise<ScenarioEnvironment> {
    const turnStore = new InMemoryTurnStore();
    const snapshotStore = new InMemorySnapshotStore();
    const episodeBoundary = new DeterministicEpisodeBoundaryDetector();
    const episodeStore = new FixtureEpisodeStore();
    const threadStore = new FixtureThreadStore();
    const noteVersioning = new FixtureNoteVersioning();
    const noteExtractionSandbox = new SimpleNoteExtractionSandbox();
    const retrievalPlanner = new SimpleRetrievalPlanner({
      turnStore,
      threadStore,
      episodeStore,
      noteVersioning,
    });
    const contextBuilder = new SimpleContextBuilder();
    const asyncMemoryFollowup = new InMemoryAsyncMemoryFollowup({
      episodeStore,
      turnStore,
      snapshotStore,
      noteExtractionSandbox,
      noteVersioning,
    });

    const deps: ProcessTurnDeps = {
      turnStore,
      snapshotStore,
      episodeBoundary,
      episodeStore,
      threadStore,
      retrievalPlanner,
      contextBuilder,

      stateEngine: new CompoundStateEngine({ classifier: new RegexSignalClassifier() }),
      generator: this.config.generator ?? new InMemoryGeneratorAdapter(),
      parser: this.config.parser ?? new FixturePathParser(),
      validator: new MinimalRuntimeValidator(),
      transaction: new InMemoryRuntimeTransaction(),
      rollback: new JournalRollbackHelper(),
      fallback: new CautiousFallbackHandler(),
      traceFactory: new RuntimeTraceFactory(),
      idGenerator: new SequentialIdGenerator(),
      clock: new SystemClock(),
      // criticLoop is intentionally absent in fixture environments by default.
      // Inject BoundedCriticLoop into InMemoryScenarioConfig to test critic behavior.
      criticLoop: undefined,
      asyncMemoryFollowup,
      kPositionStore: this.config.kPositionStore,
    };

    return {
      deps,
      inspectors: {
        getRecentTurns: async (s: string) => turnStore.getRecent(s, 100),
        getLatestSnapshot: async (s: string) => snapshotStore.getLatest(s),
        getRecentSnapshots: async (s: string, limit: number) => snapshotStore.getRecent(s, limit),
        getActiveEpisode: async (s: string) => {
          const thread = await threadStore.getActive(s);
          if (!thread || !thread.episodeIds.length) return null;
          const ep = await episodeStore.getByIds([
            thread.episodeIds[thread.episodeIds.length - 1],
          ]);
          return ep[0] ?? null;
        },
        getActiveThread: async (s: string) => threadStore.getActive(s),
        listActiveNotes: async () =>
          noteVersioning.listActiveNotes({
            allowedConsentStatuses: ["allow", "filter", "needs_review"],
          }),
        listContradictionEvidence: async () =>
          noteVersioning.listContradictionEvidence({
            allowedConsentStatuses: ["allow", "filter", "needs_review"],
            maxResults: 2,
          }),
      },
      seed: async (initialState?: Record<string, unknown>) => {
        if (!initialState) return;

        const seed = initialState as SeedState;

        for (const turn of seed.turns ?? []) {
          await turnStore.write(turn);
        }

        for (const snapshot of seed.snapshots ?? []) {
          await snapshotStore.write(snapshot);
        }

        if (seed.episodes?.length) {
          await episodeStore.seedEpisodes(seed.episodes);
        }

        if (seed.thread) {
          await threadStore.seedThread(seed.thread);
        }

        if (seed.notes?.length) {
          await noteVersioning.seedNotes(seed.notes);
        }
      },
    };
  }
}

/**
 * Small convenience helper for direct local fixture runs without a separate harness.
 */
export async function runSingleFixtureTurn(input: {
  factory?: ScenarioEnvironmentFactory;
  turn: TurnInput;
  initialState?: Record<string, unknown>;
}) {
  const factory = input.factory ?? new InMemoryScenarioEnvironmentFactory();
  const environment = await factory.create();

  if (environment.seed) {
    await environment.seed(input.initialState);
  }

  return processTurn(environment.deps, input.turn);
}
