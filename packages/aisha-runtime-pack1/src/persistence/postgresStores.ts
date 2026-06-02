import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import type {
  PoolClient,
  PoolConfig,
  QueryResult,
  QueryResultRow,
} from "pg";
import { AISHA_PACK1_POSTGRES_SCHEMA } from "./postgresSchema";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import type {
  EpisodeBoundaryDecision,
  EpisodeRecord,
  IEpisodeStore,
  INoteVersioning,
  ISnapshotStore,
  IThreadStore,
  ITurnStore,
  ListActiveNotesFilter,
  ListContradictionEvidenceFilter,
  ListProvisionalNotesFilter,
  NoteCandidate,
  NoteLinkRecord,
  NoteMergeResult,
  NoteRecord,
  ProvisionalPromotionResult,
  StateSnapshotRecord,
  ThreadRecord,
  TurnRecord,
} from "../memory/types";
import type {
  IRuntimeJournal,
  IRuntimeTransaction,
  RuntimeJournalSnapshot,
  StagedArtifact,
} from "../runtime/runtime_types";

const { Pool } = pg;
const GLOBAL_SESSION_ID = "__global__";

type DbPool = InstanceType<typeof Pool>;

function payloadValue<T>(value: T): string {
  return JSON.stringify(value);
}

function rowPayload<T>(row?: { payload_json?: unknown } | null): T | null {
  if (!row) return null;
  const raw = row.payload_json;
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

function asIso(value?: string): string {
  return value || new Date().toISOString();
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export interface AishaPostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  max?: number;
}

export function resolveAishaPostgresConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AishaPostgresConfig {
  const connectionString = String(
    env.AISHA_POSTGRES_URL || env.AISHA_TEST_POSTGRES_URL || "",
  ).trim();
  if (connectionString) return { connectionString };

  const database = String(env.AISHA_POSTGRES_DATABASE || "").trim();
  const user = String(env.AISHA_POSTGRES_USER || "").trim();
  const password = String(env.AISHA_POSTGRES_PASSWORD || "").trim();
  const cloudSqlConnectionName = String(
    env.AISHA_CLOUD_SQL_CONNECTION_NAME || "",
  ).trim();

  if (!database || !user || !password || !cloudSqlConnectionName) {
    throw new Error(
      "AISHA_PERSISTENCE=postgres requires AISHA_POSTGRES_URL or AISHA_POSTGRES_DATABASE, AISHA_POSTGRES_USER, AISHA_POSTGRES_PASSWORD, and AISHA_CLOUD_SQL_CONNECTION_NAME",
    );
  }

  return {
    host: `/cloudsql/${cloudSqlConnectionName}`,
    port: Number(env.AISHA_POSTGRES_PORT || 5432),
    database,
    user,
    password,
    max: Number(env.AISHA_POSTGRES_POOL_MAX || 4),
  };
}

function poolConfig(config: AishaPostgresConfig): PoolConfig {
  if (config.connectionString) {
    return {
      connectionString: config.connectionString,
      ssl: config.ssl === true ? { rejectUnauthorized: false } : undefined,
      max: config.max ?? 4,
    };
  }
  return {
    host: config.host,
    port: config.port ?? 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl === true ? { rejectUnauthorized: false } : undefined,
    max: config.max ?? 4,
  };
}

export class AishaPostgresConnection {
  private readonly pool: DbPool;
  private readonly transactionClient = new AsyncLocalStorage<PoolClient>();

  constructor(config: AishaPostgresConfig) {
    this.pool = new Pool(poolConfig(config));
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(AISHA_PACK1_POSTGRES_SCHEMA);
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    const client = this.transactionClient.getStore();
    if (client) return client.query<T>(sql, params);
    return this.pool.query<T>(sql, params);
  }

  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.transactionClient.run(client, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error. Rollback failure is operational noise.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PostgresRuntimeJournal implements IRuntimeJournal {
  private state: "open" | "committed" | "aborted" = "open";
  private readonly stagedArtifacts: StagedArtifact[] = [];

  constructor(
    private readonly connection: AishaPostgresConnection,
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
    const result = await this.connection.withTransaction(input.apply);
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

export class PostgresRuntimeTransaction implements IRuntimeTransaction {
  constructor(private readonly connection: AishaPostgresConnection) {}

  async openJournal(input: {
    traceId: string;
    sessionId: string;
  }): Promise<IRuntimeJournal> {
    return new PostgresRuntimeJournal(
      this.connection,
      input.traceId,
      input.sessionId,
    );
  }
}

export class PostgresTurnStore implements ITurnStore {
  constructor(private readonly connection: AishaPostgresConnection) {}

  async write(turn: TurnRecord): Promise<TurnRecord> {
    const result = await this.connection.query(
      `
      INSERT INTO aisha_turns (
        id, session_id, turn_index, speaker, state_snapshot_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
      `,
      [
        turn.id,
        turn.sessionId,
        turn.turnIndex,
        turn.speaker,
        turn.stateSnapshotId,
        asIso(turn.createdAt),
        turn.updatedAt || null,
        payloadValue(turn),
      ],
    );
    if (result.rowCount !== 1) throw new Error(`Turn already exists: ${turn.id}`);
    return turn;
  }

  async getRecent(sessionId: string, limit: number): Promise<TurnRecord[]> {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_turns
      WHERE session_id = $1
      ORDER BY turn_index DESC, created_at DESC
      LIMIT $2
      `,
      [sessionId, Math.max(0, limit)],
    );
    return result.rows
      .map((row) => rowPayload<TurnRecord>(row))
      .filter((turn): turn is TurnRecord => Boolean(turn))
      .reverse();
  }

  async getById(id: string): Promise<TurnRecord | null> {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_turns WHERE id = $1`,
      [id],
    );
    return rowPayload<TurnRecord>(result.rows[0]);
  }

  async getByIds(ids: string[]): Promise<TurnRecord[]> {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_turns WHERE id = ANY($1::text[])`,
      [ids],
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload<TurnRecord>(row)]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((turn): turn is TurnRecord => Boolean(turn));
  }
}

export class PostgresSnapshotStore implements ISnapshotStore {
  constructor(private readonly connection: AishaPostgresConnection) {}

  async write(snapshot: StateSnapshotRecord): Promise<StateSnapshotRecord> {
    const result = await this.connection.query(
      `
      INSERT INTO aisha_state_snapshots (
        id, session_id, turn_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
      `,
      [
        snapshot.id,
        snapshot.sessionId,
        snapshot.turnId,
        asIso(snapshot.createdAt),
        snapshot.updatedAt || null,
        payloadValue(snapshot),
      ],
    );
    if (result.rowCount !== 1) {
      throw new Error(`Snapshot already exists: ${snapshot.id}`);
    }
    return snapshot;
  }

  async getLatest(sessionId: string): Promise<StateSnapshotRecord | null> {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_state_snapshots
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [sessionId],
    );
    return rowPayload<StateSnapshotRecord>(result.rows[0]);
  }

  async getByTurnId(turnId: string): Promise<StateSnapshotRecord | null> {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_state_snapshots WHERE turn_id = $1 LIMIT 1`,
      [turnId],
    );
    return rowPayload<StateSnapshotRecord>(result.rows[0]);
  }

  async getRecent(
    sessionId: string,
    limit: number,
  ): Promise<StateSnapshotRecord[]> {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_state_snapshots
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      `,
      [sessionId, Math.max(0, limit)],
    );
    return result.rows
      .map((row) => rowPayload<StateSnapshotRecord>(row))
      .filter((snapshot): snapshot is StateSnapshotRecord => Boolean(snapshot));
  }
}

export class PostgresEpisodeStore implements IEpisodeStore {
  constructor(private readonly connection: AishaPostgresConnection) {}

  async createFromTurn(
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
    options?: { episodeId?: string },
  ): Promise<EpisodeRecord> {
    const episode: EpisodeRecord = {
      id: options?.episodeId ?? `ep_${turn.id}`,
      kind: "episode",
      createdAt: turn.createdAt,
      updatedAt: turn.updatedAt,
      sourceModality: turn.sourceModality,
      sessionId: turn.sessionId,
      threadId: `thread_${turn.sessionId}`,
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId
        ? [turn.recognizedPersonId]
        : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score,
      },
    };

    await this.upsert(episode);
    return episode;
  }

  async appendTurn(
    episodeId: string,
    turn: TurnRecord,
    decision: EpisodeBoundaryDecision,
  ): Promise<EpisodeRecord> {
    const existing = await this.getById(episodeId);
    if (!existing) return this.createFromTurn(turn, decision);

    const updated: EpisodeRecord = {
      ...existing,
      updatedAt: turn.createdAt,
      endTurnId: turn.id,
      turnIds: unique([...existing.turnIds, turn.id]),
      modalityMix: unique([...existing.modalityMix, turn.sourceModality]),
      participantSpeakerIds: unique([
        ...existing.participantSpeakerIds,
        ...(turn.speakerId ? [turn.speakerId] : []),
      ]),
      participantPersonIds: unique([
        ...existing.participantPersonIds,
        ...(turn.recognizedPersonId ? [turn.recognizedPersonId] : []),
      ]),
      boundaryReason: {
        topicShift:
          existing.boundaryReason.topicShift || decision.topicShift,
        surpriseDiscontinuity:
          existing.boundaryReason.surpriseDiscontinuity ||
          decision.surpriseDiscontinuity,
        score: Math.max(existing.boundaryReason.score, decision.score),
      },
    };

    await this.upsert(updated);
    return updated;
  }

  async getActive(sessionId: string): Promise<EpisodeRecord | null> {
    const thread = await this.connection.query(
      `SELECT active_episode_id FROM aisha_threads WHERE session_id = $1 LIMIT 1`,
      [sessionId],
    );
    const activeEpisodeId = thread.rows[0]?.active_episode_id;
    if (activeEpisodeId) return this.getById(String(activeEpisodeId));

    const latest = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_episodes
      WHERE session_id = $1
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
      `,
      [sessionId],
    );
    return rowPayload<EpisodeRecord>(latest.rows[0]);
  }

  async getById(id: string): Promise<EpisodeRecord | null> {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_episodes WHERE id = $1`,
      [id],
    );
    return rowPayload<EpisodeRecord>(result.rows[0]);
  }

  async getByIds(ids: string[]): Promise<EpisodeRecord[]> {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_episodes WHERE id = ANY($1::text[])`,
      [ids],
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload<EpisodeRecord>(row)]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((episode): episode is EpisodeRecord => Boolean(episode));
  }

  private async upsert(episode: EpisodeRecord): Promise<void> {
    await this.connection.query(
      `
      INSERT INTO aisha_episodes (
        id, session_id, thread_id, start_turn_id, end_turn_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id,
        thread_id = excluded.thread_id,
        end_turn_id = excluded.end_turn_id,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
      `,
      [
        episode.id,
        episode.sessionId,
        episode.threadId,
        episode.startTurnId,
        episode.endTurnId,
        asIso(episode.createdAt),
        episode.updatedAt || null,
        payloadValue(episode),
      ],
    );
  }
}

export class PostgresThreadStore implements IThreadStore {
  constructor(private readonly connection: AishaPostgresConnection) {}

  async update(
    sessionId: string,
    episode: EpisodeRecord,
  ): Promise<ThreadRecord> {
    const existing = await this.getActive(sessionId);
    const thread: ThreadRecord = {
      id: existing?.id ?? `thread_${sessionId}`,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: unique([...(existing?.episodeIds ?? []), episode.id]),
      lastUpdatedAt: episode.updatedAt ?? episode.createdAt,
      focalRelationshipPersonId: existing?.focalRelationshipPersonId,
      threadSummary: existing?.threadSummary,
    };

    await this.connection.query(
      `
      INSERT INTO aisha_threads (
        id, session_id, active_episode_id, last_updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT(session_id) DO UPDATE SET
        id = excluded.id,
        active_episode_id = excluded.active_episode_id,
        last_updated_at = excluded.last_updated_at,
        payload_json = excluded.payload_json
      `,
      [
        thread.id,
        thread.sessionId,
        thread.activeEpisodeId,
        thread.lastUpdatedAt,
        payloadValue(thread),
      ],
    );
    return thread;
  }

  async getActive(sessionId: string): Promise<ThreadRecord | null> {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_threads WHERE session_id = $1`,
      [sessionId],
    );
    return rowPayload<ThreadRecord>(result.rows[0]);
  }
}

export class PostgresNoteVersioning implements INoteVersioning {
  constructor(private readonly connection: AishaPostgresConnection) {}

  validate(candidate: NoteCandidate): { valid: boolean; reasons: string[] } {
    return new InMemoryNoteVersioning().validate(candidate);
  }

  async mergeOrSupersede(
    candidate: NoteCandidate,
    existing: NoteRecord[],
    context?: { trust: number; caution: number },
  ): Promise<NoteMergeResult> {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(existing);
    const result = await versioning.mergeOrSupersede(
      candidate,
      existing,
      context,
    );
    await this.persistNotes(result.notesWritten, candidate.sourceEpisodeIds);
    await this.persistLinks(result.linksWritten);
    return result;
  }

  async persistReviewSignals(
    signals: import("../memory/reactiveReconsolidation").PersistedReviewSignal[],
    subjectScope: {
      subjectKind: NoteRecord["subjectKind"];
      subjectPersonId?: string;
      relationshipContextPersonId?: string;
    },
  ): Promise<NoteRecord[]> {
    if (!signals.length) return [];
    const noteIds = signals.map((signal) => signal.noteId);
    const targetNotes = await this.getNotesByIds(noteIds);
    const resolvedSessionIds = (
      await Promise.all(
        targetNotes.map((note) => this.resolveNoteSessionId(note)),
      )
    ).filter((sessionId): sessionId is string => Boolean(sessionId));
    const sessionIds = unique(resolvedSessionIds);
    const scopeNotes = await this.loadNotes({
      sessionIds: sessionIds.length ? sessionIds : undefined,
      subjectScope,
    });
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(scopeNotes);
    const updated = await versioning.persistReviewSignals(
      signals,
      subjectScope,
    );
    await this.persistNotes(updated);
    return updated;
  }

  async listActiveNotes(
    filter?: ListActiveNotesFilter,
  ): Promise<NoteRecord[]> {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ filter }));
    return versioning.listActiveNotes(filter);
  }

  async listProvisionalNotes(
    filter?: ListProvisionalNotesFilter,
  ): Promise<NoteRecord[]> {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ provisionalFilter: filter }));
    return versioning.listProvisionalNotes(filter);
  }

  async evaluateProvisionalPromotion(
    filter?: ListProvisionalNotesFilter,
  ): Promise<ProvisionalPromotionResult> {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ provisionalFilter: filter }));
    const result = await versioning.evaluateProvisionalPromotion(filter);
    await this.persistNotes([
      ...result.promoted,
      ...result.expired,
      ...result.unchanged,
    ]);
    return result;
  }

  async listContradictionEvidence(
    filter?: ListContradictionEvidenceFilter,
  ): Promise<NoteRecord[]> {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ contradictionFilter: filter }));
    return versioning.listContradictionEvidence(filter);
  }

  async operatorReview(
    noteId: string,
    decision: "accept" | "reject",
    operatorId: string,
  ): Promise<NoteRecord | null> {
    const note = await this.getNoteById(noteId);
    if (!note) return null;
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes([note]);
    const updated = await versioning.operatorReview(
      noteId,
      decision,
      operatorId,
    );
    if (updated) await this.persistNotes([updated]);
    return updated;
  }

  async listSupersededByIds(
    noteIds: string[],
  ): Promise<Record<string, string>> {
    if (!noteIds.length) return {};
    const result = await this.connection.query(
      `
      SELECT DISTINCT ON (from_note_id)
        from_note_id,
        to_note.payload_json AS to_payload
      FROM aisha_note_links link
      JOIN aisha_notes to_note ON to_note.id = link.to_note_id
      WHERE link.relation = 'supersedes'
        AND link.from_note_id = ANY($1::text[])
      ORDER BY from_note_id, link.created_at DESC
      `,
      [noteIds],
    );
    const out: Record<string, string> = {};
    for (const row of result.rows) {
      const prior = rowPayload<NoteRecord>({ payload_json: row.to_payload });
      if (prior) out[String(row.from_note_id)] = prior.canonicalText;
    }
    return out;
  }

  private async getNoteById(id: string): Promise<NoteRecord | null> {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_notes WHERE id = $1`,
      [id],
    );
    return rowPayload<NoteRecord>(result.rows[0]);
  }

  private async getNotesByIds(ids: string[]): Promise<NoteRecord[]> {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_notes WHERE id = ANY($1::text[])`,
      [ids],
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload<NoteRecord>(row)]),
    );
    return ids
      .map((id) => byId.get(id))
      .filter((note): note is NoteRecord => Boolean(note));
  }

  private async loadNotes(input: {
    filter?: ListActiveNotesFilter;
    provisionalFilter?: ListProvisionalNotesFilter;
    contradictionFilter?: ListContradictionEvidenceFilter;
    sessionIds?: string[];
    subjectScope?: {
      subjectKind: NoteRecord["subjectKind"];
      subjectPersonId?: string;
      relationshipContextPersonId?: string;
    };
  } = {}): Promise<NoteRecord[]> {
    const filter =
      input.filter ?? input.provisionalFilter ?? input.contradictionFilter;
    const sessionIds = input.sessionIds ?? this.sessionIdsForFilter(filter);
    const where: string[] = [];
    const params: unknown[] = [];

    if (sessionIds?.length) {
      params.push(sessionIds);
      where.push(`session_id = ANY($${params.length}::text[])`);
    }

    if (input.subjectScope) {
      params.push(input.subjectScope.subjectKind);
      where.push(`subject_kind = $${params.length}`);
      if (input.subjectScope.subjectPersonId) {
        params.push(input.subjectScope.subjectPersonId);
        where.push(`subject_person_id = $${params.length}`);
      }
      if (input.subjectScope.relationshipContextPersonId) {
        params.push(input.subjectScope.relationshipContextPersonId);
        where.push(`relationship_context_person_id = $${params.length}`);
      }
    }

    const sql = [
      "SELECT payload_json FROM aisha_notes",
      where.length ? `WHERE ${where.join(" AND ")}` : "",
      "ORDER BY COALESCE(updated_at, created_at) DESC",
      "LIMIT 500",
    ].join(" ");
    const result = await this.connection.query(sql, params);
    return result.rows
      .map((row) => rowPayload<NoteRecord>(row))
      .filter((note): note is NoteRecord => Boolean(note));
  }

  private sessionIdsForFilter(
    filter?:
      | ListActiveNotesFilter
      | ListProvisionalNotesFilter
      | ListContradictionEvidenceFilter,
  ): string[] | undefined {
    const sessionId = "sessionId" in (filter ?? {})
      ? (filter as ListActiveNotesFilter | ListContradictionEvidenceFilter)
          .sessionId
      : undefined;
    if (!sessionId) return undefined;
    const includeGlobal = Boolean(filter && "includeGlobal" in filter && filter.includeGlobal);
    return includeGlobal ? [sessionId, GLOBAL_SESSION_ID] : [sessionId];
  }

  private async persistNotes(
    notes: NoteRecord[],
    fallbackEpisodeIds: string[] = [],
  ): Promise<void> {
    for (const note of notes) {
      const sessionId =
        (await this.resolveNoteSessionId(note, fallbackEpisodeIds)) ??
        GLOBAL_SESSION_ID;
      await this.connection.query(
        `
        INSERT INTO aisha_notes (
          id, session_id, subtype, status, subject_kind, subject_speaker_id,
          subject_person_id, relationship_context_person_id, confidence,
          created_at, updated_at, payload_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        ON CONFLICT(id) DO UPDATE SET
          session_id = excluded.session_id,
          subtype = excluded.subtype,
          status = excluded.status,
          subject_kind = excluded.subject_kind,
          subject_speaker_id = excluded.subject_speaker_id,
          subject_person_id = excluded.subject_person_id,
          relationship_context_person_id = excluded.relationship_context_person_id,
          confidence = excluded.confidence,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
        `,
        [
          note.id,
          sessionId,
          note.subtype,
          note.status,
          note.subjectKind,
          note.subjectSpeakerId || null,
          note.subjectPersonId || null,
          note.relationshipContextPersonId || null,
          note.confidence,
          asIso(note.createdAt),
          note.updatedAt || null,
          payloadValue(note),
        ],
      );
    }
  }

  private async persistLinks(links: NoteLinkRecord[]): Promise<void> {
    for (const link of links) {
      const sessionId =
        (await this.resolveLinkSessionId(link)) ?? GLOBAL_SESSION_ID;
      await this.connection.query(
        `
        INSERT INTO aisha_note_links (
          id, session_id, from_note_id, to_note_id, relation, created_at, updated_at, payload_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT(id) DO UPDATE SET
          session_id = excluded.session_id,
          from_note_id = excluded.from_note_id,
          to_note_id = excluded.to_note_id,
          relation = excluded.relation,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
        `,
        [
          link.id,
          sessionId,
          link.fromNoteId,
          link.toNoteId,
          link.relation,
          asIso(link.createdAt),
          link.updatedAt || null,
          payloadValue(link),
        ],
      );
    }
  }

  private async resolveNoteSessionId(
    note: NoteRecord,
    fallbackEpisodeIds: string[] = [],
  ): Promise<string | null> {
    const existing = await this.connection.query(
      `SELECT session_id FROM aisha_notes WHERE id = $1`,
      [note.id],
    );
    if (existing.rows[0]?.session_id) return String(existing.rows[0].session_id);
    return this.resolveSessionIdFromEpisodeIds([
      ...note.sourceEpisodeIds,
      ...fallbackEpisodeIds,
    ]);
  }

  private async resolveLinkSessionId(
    link: NoteLinkRecord,
  ): Promise<string | null> {
    const result = await this.connection.query(
      `
      SELECT session_id FROM aisha_notes
      WHERE id = $1 OR id = $2
      ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [link.fromNoteId, link.toNoteId],
    );
    return result.rows[0]?.session_id ? String(result.rows[0].session_id) : null;
  }

  private async resolveSessionIdFromEpisodeIds(
    episodeIds: string[],
  ): Promise<string | null> {
    const ids = unique(episodeIds.filter(Boolean));
    if (!ids.length) return null;
    const result = await this.connection.query(
      `SELECT session_id FROM aisha_episodes WHERE id = ANY($1::text[]) LIMIT 1`,
      [ids],
    );
    return result.rows[0]?.session_id ? String(result.rows[0].session_id) : null;
  }
}

export interface AishaPostgresProductionStores {
  connection: AishaPostgresConnection;
  turnStore: ITurnStore;
  snapshotStore: ISnapshotStore;
  episodeStore: IEpisodeStore;
  threadStore: IThreadStore;
  noteVersioning: INoteVersioning;
  runtimeTransaction: IRuntimeTransaction;
  close(): Promise<void>;
}

export async function createPostgresProductionStores(
  config: AishaPostgresConfig,
): Promise<AishaPostgresProductionStores> {
  const connection = new AishaPostgresConnection(config);
  await connection.ensureSchema();
  return {
    connection,
    turnStore: new PostgresTurnStore(connection),
    snapshotStore: new PostgresSnapshotStore(connection),
    episodeStore: new PostgresEpisodeStore(connection),
    threadStore: new PostgresThreadStore(connection),
    noteVersioning: new PostgresNoteVersioning(connection),
    runtimeTransaction: new PostgresRuntimeTransaction(connection),
    close: () => connection.close(),
  };
}

export async function createPostgresProductionStoresFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AishaPostgresProductionStores> {
  return createPostgresProductionStores(resolveAishaPostgresConfigFromEnv(env));
}
