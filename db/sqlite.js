const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.SILVA_DB_PATH
  ? path.resolve(process.env.SILVA_DB_PATH)
  : path.join(DEFAULT_DB_DIR, 'silva.db');
const DB_DIR = path.dirname(DB_PATH);
const SCHEMA_PATH = path.join(__dirname, 'init.sql');
const STUDIO2_V4_SCHEMA_PATH = path.join(__dirname, 'studio2_v4_migration.sql');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
if (fs.existsSync(STUDIO2_V4_SCHEMA_PATH)) {
  db.exec(fs.readFileSync(STUDIO2_V4_SCHEMA_PATH, 'utf8'));
}

function nowIso() {
  return new Date().toISOString();
}

function safeJson(value) {
  return JSON.stringify(value ?? null);
}

function parseJson(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function makeId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowWithPayload(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return { ...payload, _row: row };
}

function stripRowArtifacts(value) {
  if (Array.isArray(value)) return value.map(stripRowArtifacts);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === '_row' || key === 'payload_json') continue;
    out[key] = stripRowArtifacts(inner);
  }
  return out;
}

const PULSE_SPEAKER_IDS = new Set(['studio', 'aisha', 'leah', 'claudia', 'grok', 'vanya', 'user']);

function normalizePulseTarget(value) {
  const target = String(value || '').trim().toLowerCase();
  return PULSE_SPEAKER_IDS.has(target) && target !== 'user' ? target : 'studio';
}

function normalizePulseThreadId(value) {
  const id = String(value || '').trim();
  if (!id) return '';
  return PULSE_SPEAKER_IDS.has(id.toLowerCase()) ? '' : id;
}

function studioPulseMessagePayload(input = {}) {
  const clean = stripRowArtifacts(input);
  return {
    id: clean.id || '',
    threadId: clean.threadId || clean.thread_id || '',
    userTurnIndex: Number.isFinite(Number(clean.userTurnIndex ?? clean.user_turn_index)) ? Number(clean.userTurnIndex ?? clean.user_turn_index) : 0,
    speakerId: clean.speakerId || clean.speaker_id || '',
    kind: clean.kind || 'message',
    text: clean.text || '',
    tone: clean.tone || '',
    delayMs: Number.isFinite(Number(clean.delayMs ?? clean.delay_ms)) ? Number(clean.delayMs ?? clean.delay_ms) : 0,
    replyToId: clean.replyToId || clean.reply_to_id || '',
    emotionalState: clean.emotionalState || clean.emotional_state || '',
    targetSpeakerId: clean.targetSpeakerId || clean.target_speaker_id || '',
    targetType: clean.targetType || clean.target_type || '',
    directTarget: clean.directTarget || clean.direct_target || '',
    label: clean.label || '',
    visible: clean.visible !== false,
    saveToArchive: clean.saveToArchive !== false,
    speakerName: clean.speakerName || '',
    role: clean.role || '',
    color: clean.color || '',
    metadata: clean.metadata && typeof clean.metadata === 'object' ? clean.metadata : {},
    createdAt: clean.createdAt || clean.created_at || '',
    updatedAt: clean.updatedAt || clean.updated_at || ''
  };
}

function rowToStudioPulseMessage(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    id: String(row.id || payload.id || ''),
    threadId: String(row.thread_id || payload.threadId || ''),
    userTurnIndex: Number.isFinite(Number(payload.userTurnIndex ?? payload.user_turn_index)) ? Number(payload.userTurnIndex ?? payload.user_turn_index) : 0,
    speakerId: String(row.speaker_id || payload.speakerId || ''),
    kind: String(row.kind || payload.kind || 'message'),
    text: String(row.text || payload.text || ''),
    tone: String(row.tone || payload.tone || ''),
    delayMs: Number.isFinite(Number(row.delay_ms)) ? Number(row.delay_ms) : Number(payload.delayMs || 0) || 0,
    replyToId: String(row.reply_to_id || payload.replyToId || ''),
    emotionalState: String(row.emotional_state || payload.emotionalState || ''),
    targetSpeakerId: String(payload.targetSpeakerId || ''),
    targetType: String(payload.targetType || ''),
    directTarget: String(payload.directTarget || ''),
    label: String(payload.label || ''),
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    createdAt: row.created_at || payload.createdAt || '',
    updatedAt: row.updated_at || payload.updatedAt || ''
  };
}

function rowToStudioPulseAsset(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    id: String(row.id || payload.id || ''),
    threadId: String(row.thread_id || payload.threadId || ''),
    workflowId: String(row.workflow_id || payload.workflowId || ''),
    name: String(row.name || payload.name || ''),
    mimeType: String(row.mime_type || payload.mimeType || ''),
    kind: String(row.kind || payload.kind || 'file'),
    source: String(row.source || payload.source || 'upload'),
    previewUrl: String(row.preview_url || payload.previewUrl || ''),
    textExtract: String(row.text_extract || payload.textExtract || ''),
    createdAt: row.created_at || payload.createdAt || '',
    updatedAt: row.updated_at || payload.updatedAt || ''
  };
}

function rowToStudioPulseWorkflow(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    id: String(row.id || payload.id || ''),
    threadId: String(row.thread_id || payload.threadId || ''),
    intent: String(row.intent || payload.intent || 'room-chat'),
    status: String(row.status || payload.status || 'draft'),
    createdBy: String(row.created_by || payload.createdBy || 'aisha'),
    createdAt: row.created_at || payload.createdAt || '',
    updatedAt: row.updated_at || payload.updatedAt || ''
  };
}

function rowToStudio2ThreadState(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    threadId: String(row.thread_id || payload.threadId || ''),
    schemaVersion: String(row.schema_version || payload.schemaVersion || 'studio2.v4'),
    updatedAt: String(row.updated_at || payload.updatedAt || '')
  };
}

function rowToStudio2CharacterState(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    threadId: String(row.thread_id || payload.threadId || ''),
    characterId: String(row.character_id || payload.characterId || ''),
    schemaVersion: String(row.schema_version || payload.schemaVersion || 'studio2.v4'),
    updatedAt: String(row.updated_at || payload.updatedAt || '')
  };
}

function rowToStudio2RelationshipState(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    threadId: String(row.thread_id || payload.threadId || ''),
    pairKey: String(row.pair_key || payload.pairKey || ''),
    schemaVersion: String(row.schema_version || payload.schemaVersion || 'studio2.v4'),
    updatedAt: String(row.updated_at || payload.updatedAt || '')
  };
}

function rowToStudio2ReflectionPatch(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json, {});
  return {
    ...payload,
    id: String(row.id || payload.id || ''),
    threadId: String(row.thread_id || payload.threadId || ''),
    schemaVersion: String(row.schema_version || payload.schemaVersion || 'studio2.v4'),
    createdAt: String(row.created_at || payload.createdAt || '')
  };
}

function compactMigratedState(state = {}) {
  const base = stripRowArtifacts(state);
  const personhood = base.personhood && typeof base.personhood === 'object' ? base.personhood : {};
  const aiCommsCenter = base.aiCommsCenter && typeof base.aiCommsCenter === 'object' ? base.aiCommsCenter : {};
  return {
    _version: base._version || '',
    prompts: Array.isArray(base.prompts) ? base.prompts : [],
    gallery: Array.isArray(base.gallery) ? base.gallery : [],
    plannerPosts: Array.isArray(base.plannerPosts) ? base.plannerPosts : [],
    reviewEvents: Array.isArray(base.reviewEvents) ? base.reviewEvents : [],
    sessionLog: Array.isArray(base.sessionLog) ? base.sessionLog.slice(0, 48) : [],
    characters: base.characters && typeof base.characters === 'object' ? base.characters : {},
    assetRefs: base.assetRefs && typeof base.assetRefs === 'object' ? base.assetRefs : {},
    teamRecords: base.teamRecords && typeof base.teamRecords === 'object' ? base.teamRecords : {},
    homeProfiles: base.homeProfiles && typeof base.homeProfiles === 'object' ? base.homeProfiles : {},
    homeAssets: base.homeAssets && typeof base.homeAssets === 'object' ? base.homeAssets : {},
    pulseHomes: base.pulseHomes && typeof base.pulseHomes === 'object' ? base.pulseHomes : {},
    providerSettings: base.providerSettings && typeof base.providerSettings === 'object' ? base.providerSettings : {},
    analytics: base.analytics && typeof base.analytics === 'object' ? base.analytics : {},
    currentModes: base.currentModes && typeof base.currentModes === 'object' ? base.currentModes : {},
    characterTuning: base.characterTuning && typeof base.characterTuning === 'object' ? base.characterTuning : {},
    councilTuning: base.councilTuning && typeof base.councilTuning === 'object' ? base.councilTuning : {},
    characterBehaviorTree: base.characterBehaviorTree && typeof base.characterBehaviorTree === 'object' ? base.characterBehaviorTree : {},
    councilBehavior: base.councilBehavior && typeof base.councilBehavior === 'object' ? base.councilBehavior : {},
    relationships: base.relationships && typeof base.relationships === 'object' ? base.relationships : {},
    savedSearch: base.savedSearch && typeof base.savedSearch === 'object' ? base.savedSearch : {},
    lastSeenAt: typeof base.lastSeenAt === 'string' ? base.lastSeenAt : null,
    aiCommsCenter: {
      target: normalizePulseTarget(aiCommsCenter.target || 'studio'),
      ambientEnabled: aiCommsCenter.ambientEnabled !== false,
      lastAmbientAt: Number(aiCommsCenter.lastAmbientAt || 0) || 0,
      activeThreadId: normalizePulseThreadId(aiCommsCenter.activeThreadId || ''),
      roomMode: String(aiCommsCenter.roomMode || 'balanced'),
      feed: Array.isArray(aiCommsCenter.feed) ? aiCommsCenter.feed.slice(-24) : [],
      roomTone: Array.isArray(aiCommsCenter.roomTone) ? aiCommsCenter.roomTone.slice(0, 12) : []
    },
    personhood: {
      liveState: personhood.liveState && typeof personhood.liveState === 'object' ? personhood.liveState : {},
      relationships: personhood.relationships && typeof personhood.relationships === 'object' ? personhood.relationships : {},
      profiles: personhood.profiles && typeof personhood.profiles === 'object' ? personhood.profiles : {},
      events: Array.isArray(personhood.events) ? personhood.events.slice(-160) : [],
      microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.slice(-32) : [],
      peerObservations: personhood.peerObservations && typeof personhood.peerObservations === 'object' ? personhood.peerObservations : {},
      holding: personhood.holding && typeof personhood.holding === 'object' ? personhood.holding : {},
      autonomyQueue: personhood.autonomyQueue && typeof personhood.autonomyQueue === 'object' ? personhood.autonomyQueue : {},
      salienceMemory: personhood.salienceMemory && typeof personhood.salienceMemory === 'object' ? personhood.salienceMemory : {},
      relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.slice(-80) : [],
      relationshipEdges: personhood.relationshipEdges && typeof personhood.relationshipEdges === 'object' ? personhood.relationshipEdges : {},
      presence: personhood.presence && typeof personhood.presence === 'object' ? personhood.presence : {},
      silence: Array.isArray(personhood.silence) ? personhood.silence.slice(-16) : [],
      config: personhood.config && typeof personhood.config === 'object' ? personhood.config : {}
    }
  };
}

const statements = {
  setSystemState: db.prepare(`
    INSERT INTO system_state (key, value_json, updated_at)
    VALUES (@key, @value_json, @updated_at)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `),

  addSnapshot: db.prepare(`
    INSERT INTO state_snapshots (id, source, payload_json, created_at)
    VALUES (@id, @source, @payload_json, @created_at)
  `),

  upsertPrompt: db.prepare(`
    INSERT INTO prompts (
      id, title, char_id, campaign_id, prompt_text, saved, tested, payload_json, created_at, updated_at
    ) VALUES (
      @id, @title, @char_id, @campaign_id, @prompt_text, @saved, @tested, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      char_id = excluded.char_id,
      campaign_id = excluded.campaign_id,
      prompt_text = excluded.prompt_text,
      saved = excluded.saved,
      tested = excluded.tested,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertGallery: db.prepare(`
    INSERT INTO gallery_items (
      id, title, char_id, campaign_id, prompt_id, img_src, provider, model, drift, payload_json, created_at, updated_at
    ) VALUES (
      @id, @title, @char_id, @campaign_id, @prompt_id, @img_src, @provider, @model, @drift, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      char_id = excluded.char_id,
      campaign_id = excluded.campaign_id,
      prompt_id = excluded.prompt_id,
      img_src = excluded.img_src,
      provider = excluded.provider,
      model = excluded.model,
      drift = excluded.drift,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertPlanner: db.prepare(`
    INSERT INTO planner_posts (
      id, title, char_id, campaign_id, prompt_id, scheduled_for, status, payload_json, created_at, updated_at
    ) VALUES (
      @id, @title, @char_id, @campaign_id, @prompt_id, @scheduled_for, @status, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      char_id = excluded.char_id,
      campaign_id = excluded.campaign_id,
      prompt_id = excluded.prompt_id,
      scheduled_for = excluded.scheduled_for,
      status = excluded.status,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertReviewEvent: db.prepare(`
    INSERT INTO review_events (
      id, kind, subject_type, subject_id, char_id, prompt_id, gallery_id, planner_id, campaign_id, overall, drift, payload_json, created_at, updated_at
    ) VALUES (
      @id, @kind, @subject_type, @subject_id, @char_id, @prompt_id, @gallery_id, @planner_id, @campaign_id, @overall, @drift, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      subject_type = excluded.subject_type,
      subject_id = excluded.subject_id,
      char_id = excluded.char_id,
      prompt_id = excluded.prompt_id,
      gallery_id = excluded.gallery_id,
      planner_id = excluded.planner_id,
      campaign_id = excluded.campaign_id,
      overall = excluded.overall,
      drift = excluded.drift,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertSessionLog: db.prepare(`
    INSERT INTO session_logs (id, type, ts, payload_json, created_at)
    VALUES (@id, @type, @ts, @payload_json, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      ts = excluded.ts,
      payload_json = excluded.payload_json
  `),

  upsertCharacterState: db.prepare(`
    INSERT INTO character_state (character_id, payload_json, updated_at)
    VALUES (@character_id, @payload_json, @updated_at)
    ON CONFLICT(character_id) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertRelationship: db.prepare(`
    INSERT INTO relationships (pair_key, payload_json, updated_at)
    VALUES (@pair_key, @payload_json, @updated_at)
    ON CONFLICT(pair_key) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudioPulseThread: db.prepare(`
    INSERT INTO studio_pulse_threads (
      id, title, status, pinned, include_in_context, payload_json, created_at, updated_at, last_message_at
    ) VALUES (
      @id, @title, @status, @pinned, @include_in_context, @payload_json, @created_at, @updated_at, @last_message_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      status = excluded.status,
      pinned = excluded.pinned,
      include_in_context = excluded.include_in_context,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at,
      last_message_at = excluded.last_message_at
  `),

  upsertStudioPulseMessage: db.prepare(`
    INSERT INTO studio_pulse_messages (
      id, thread_id, speaker_id, kind, text, tone, delay_ms, reply_to_id, emotional_state, payload_json, created_at, updated_at
    ) VALUES (
      @id, @thread_id, @speaker_id, @kind, @text, @tone, @delay_ms, @reply_to_id, @emotional_state, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      thread_id = excluded.thread_id,
      speaker_id = excluded.speaker_id,
      kind = excluded.kind,
      text = excluded.text,
      tone = excluded.tone,
      delay_ms = excluded.delay_ms,
      reply_to_id = excluded.reply_to_id,
      emotional_state = excluded.emotional_state,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudioPulseAsset: db.prepare(`
    INSERT INTO studio_pulse_assets (
      id, thread_id, workflow_id, name, mime_type, kind, source, preview_url, text_extract, payload_json, created_at, updated_at
    ) VALUES (
      @id, @thread_id, @workflow_id, @name, @mime_type, @kind, @source, @preview_url, @text_extract, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      thread_id = excluded.thread_id,
      workflow_id = excluded.workflow_id,
      name = excluded.name,
      mime_type = excluded.mime_type,
      kind = excluded.kind,
      source = excluded.source,
      preview_url = excluded.preview_url,
      text_extract = excluded.text_extract,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudioPulseWorkflow: db.prepare(`
    INSERT INTO studio_pulse_workflows (
      id, thread_id, intent, status, created_by, payload_json, created_at, updated_at
    ) VALUES (
      @id, @thread_id, @intent, @status, @created_by, @payload_json, @created_at, @updated_at
    )
    ON CONFLICT(id) DO UPDATE SET
      thread_id = excluded.thread_id,
      intent = excluded.intent,
      status = excluded.status,
      created_by = excluded.created_by,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudio2ThreadState: db.prepare(`
    INSERT INTO studio2_thread_state (
      thread_id, schema_version, payload_json, updated_at
    ) VALUES (
      @thread_id, @schema_version, @payload_json, @updated_at
    )
    ON CONFLICT(thread_id) DO UPDATE SET
      schema_version = excluded.schema_version,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudio2CharacterState: db.prepare(`
    INSERT INTO studio2_character_state (
      thread_id, character_id, schema_version, payload_json, updated_at
    ) VALUES (
      @thread_id, @character_id, @schema_version, @payload_json, @updated_at
    )
    ON CONFLICT(thread_id, character_id) DO UPDATE SET
      schema_version = excluded.schema_version,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  upsertStudio2RelationshipState: db.prepare(`
    INSERT INTO studio2_relationship_state (
      thread_id, pair_key, schema_version, payload_json, updated_at
    ) VALUES (
      @thread_id, @pair_key, @schema_version, @payload_json, @updated_at
    )
    ON CONFLICT(thread_id, pair_key) DO UPDATE SET
      schema_version = excluded.schema_version,
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `),

  insertStudio2ReflectionPatch: db.prepare(`
    INSERT INTO studio2_reflection_patches (
      id, thread_id, schema_version, payload_json, created_at
    ) VALUES (
      @id, @thread_id, @schema_version, @payload_json, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      payload_json = excluded.payload_json,
      created_at = excluded.created_at
  `),

  deleteStudioPulseMessagesByThread: db.prepare(`DELETE FROM studio_pulse_messages WHERE thread_id = ?`),
  deleteStudioPulseThread: db.prepare(`DELETE FROM studio_pulse_threads WHERE id = ?`),
  deleteStudioPulseAsset: db.prepare(`DELETE FROM studio_pulse_assets WHERE id = ?`),
  deleteStudio2ThreadState: db.prepare(`DELETE FROM studio2_thread_state WHERE thread_id = ?`),
  deleteStudio2CharacterStatesByThread: db.prepare(`DELETE FROM studio2_character_state WHERE thread_id = ?`),
  deleteStudio2RelationshipStatesByThread: db.prepare(`DELETE FROM studio2_relationship_state WHERE thread_id = ?`),

  getPrompts: db.prepare(`SELECT * FROM prompts ORDER BY updated_at DESC`),
  getPromptById: db.prepare(`SELECT * FROM prompts WHERE id = ?`),
  getGallery: db.prepare(`SELECT * FROM gallery_items ORDER BY updated_at DESC`),
  getGalleryById: db.prepare(`SELECT * FROM gallery_items WHERE id = ?`),
  getPlanner: db.prepare(`SELECT * FROM planner_posts ORDER BY COALESCE(scheduled_for, updated_at) ASC, updated_at DESC`),
  getPlannerById: db.prepare(`SELECT * FROM planner_posts WHERE id = ?`),
  getReviewEvents: db.prepare(`SELECT * FROM review_events ORDER BY created_at DESC, updated_at DESC`),
  getReviewEventById: db.prepare(`SELECT * FROM review_events WHERE id = ?`),
  countPrompts: db.prepare(`SELECT COUNT(*) AS count FROM prompts`),
  countGallery: db.prepare(`SELECT COUNT(*) AS count FROM gallery_items`),
  countPlanner: db.prepare(`SELECT COUNT(*) AS count FROM planner_posts`),
  countReviewEvents: db.prepare(`SELECT COUNT(*) AS count FROM review_events`),
  countRelationships: db.prepare(`SELECT COUNT(*) AS count FROM relationships`),
  getSessionLogs: db.prepare(`SELECT * FROM session_logs ORDER BY ts DESC LIMIT ?`),
  getStudioPulseThreads: db.prepare(`SELECT * FROM studio_pulse_threads ORDER BY pinned DESC, updated_at DESC LIMIT ?`),
  searchStudioPulseThreads: db.prepare(`
    SELECT * FROM studio_pulse_threads
    WHERE title LIKE @query OR payload_json LIKE @query
    ORDER BY pinned DESC, updated_at DESC
    LIMIT @limit
  `),
  getStudioPulseThreadById: db.prepare(`SELECT * FROM studio_pulse_threads WHERE id = ?`),
  getStudioPulseMessagesByThread: db.prepare(`
    SELECT id, thread_id, speaker_id, kind, text, tone, delay_ms, reply_to_id, emotional_state, payload_json, created_at, updated_at
    FROM studio_pulse_messages
    WHERE thread_id = ?
    ORDER BY created_at ASC, rowid ASC
  `),
  getStudioPulseMessagesTailByThread: db.prepare(`
    SELECT id, thread_id, speaker_id, kind, text, tone, delay_ms, reply_to_id, emotional_state, payload_json, created_at, updated_at
    FROM studio_pulse_messages
    WHERE thread_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `),
  getStudioPulseAssetsByThread: db.prepare(`
    SELECT id, thread_id, workflow_id, name, mime_type, kind, source, preview_url, text_extract, payload_json, created_at, updated_at
    FROM studio_pulse_assets
    WHERE thread_id = ?
    ORDER BY created_at DESC, rowid DESC
  `),
  getStudioPulseAssetById: db.prepare(`
    SELECT id, thread_id, workflow_id, name, mime_type, kind, source, preview_url, text_extract, payload_json, created_at, updated_at
    FROM studio_pulse_assets
    WHERE id = ?
  `),
  getStudioPulseWorkflowsByThread: db.prepare(`
    SELECT id, thread_id, intent, status, created_by, payload_json, created_at, updated_at
    FROM studio_pulse_workflows
    WHERE thread_id = ?
    ORDER BY updated_at DESC, rowid DESC
  `),
  getStudioPulseWorkflowById: db.prepare(`
    SELECT id, thread_id, intent, status, created_by, payload_json, created_at, updated_at
    FROM studio_pulse_workflows
    WHERE id = ?
  `),
  getStudio2ThreadStateByThread: db.prepare(`
    SELECT thread_id, schema_version, payload_json, updated_at
    FROM studio2_thread_state
    WHERE thread_id = ?
  `),
  getStudio2CharacterStatesByThread: db.prepare(`
    SELECT thread_id, character_id, schema_version, payload_json, updated_at
    FROM studio2_character_state
    WHERE thread_id = ?
    ORDER BY character_id ASC
  `),
  getStudio2RelationshipStatesByThread: db.prepare(`
    SELECT thread_id, pair_key, schema_version, payload_json, updated_at
    FROM studio2_relationship_state
    WHERE thread_id = ?
    ORDER BY pair_key ASC
  `),
  getStudio2ReflectionPatchesByThread: db.prepare(`
    SELECT id, thread_id, schema_version, payload_json, created_at
    FROM studio2_reflection_patches
    WHERE thread_id = ?
    ORDER BY created_at DESC, rowid DESC
    LIMIT ?
  `),
  countStudioPulseAssets: db.prepare(`SELECT COUNT(*) AS count FROM studio_pulse_assets`),
  countStudioPulseWorkflows: db.prepare(`SELECT COUNT(*) AS count FROM studio_pulse_workflows`),
  countStudio2Threads: db.prepare(`SELECT COUNT(*) AS count FROM studio2_thread_state`),
  getCharacterStates: db.prepare(`SELECT * FROM character_state ORDER BY character_id ASC`),
  getRelationships: db.prepare(`SELECT * FROM relationships ORDER BY pair_key ASC`),
  getRelationshipByKey: db.prepare(`SELECT * FROM relationships WHERE pair_key = ?`),
  getLatestSnapshot: db.prepare(`SELECT * FROM state_snapshots ORDER BY created_at DESC LIMIT 1`),
  getSystemState: db.prepare(`SELECT * FROM system_state WHERE key = ?`)
};

function normalizePrompt(input) {
  const ts = nowIso();
  return {
    id: input.id || makeId('prompt'),
    title: input.title || '',
    char_id: input.char || input.char_id || '',
    campaign_id: input.campaignId || input.campaign_id || input.campaign || '',
    prompt_text: input.prompt || input.prompt_text || '',
    saved: input.saved ? 1 : 0,
    tested: input.tested ? 1 : 0,
    payload_json: safeJson(input),
    created_at: input.createdAt || input.created_at || ts,
    updated_at: ts
  };
}

function normalizeGallery(input) {
  const ts = nowIso();
  return {
    id: input.id || makeId('gallery'),
    title: input.title || '',
    char_id: input.char || input.char_id || '',
    campaign_id: input.campaignId || input.campaign_id || input.campaign || '',
    prompt_id: input.promptId || input.prompt_id || '',
    img_src: input.imgSrc || input.img_src || '',
    provider: input.provider || '',
    model: input.model || '',
    drift: Number.isFinite(input.drift) ? input.drift : 0,
    payload_json: safeJson(input),
    created_at: input.createdAt || input.created_at || input.timestamp || ts,
    updated_at: ts
  };
}

function normalizePlanner(input) {
  const ts = nowIso();
  return {
    id: input.id || makeId('plan'),
    title: input.title || '',
    char_id: input.char || input.char_id || '',
    campaign_id: input.campaignId || input.campaign_id || input.campaign || '',
    prompt_id: input.promptId || input.prompt_id || '',
    scheduled_for: input.scheduledFor || input.scheduled_for || input.date || null,
    status: input.status || '',
    payload_json: safeJson(input),
    created_at: input.createdAt || input.created_at || ts,
    updated_at: ts
  };
}

function normalizeReviewEvent(input) {
  const ts = nowIso();
  const overallValue = input.overall == null ? null : Number(input.overall);
  const driftValue = input.drift == null ? (input.driftLevel == null ? null : Number(input.driftLevel)) : Number(input.drift);

  return {
    id: input.id || makeId('review'),
    kind: input.kind || 'review',
    subject_type: input.subjectType || input.subject_type || (input.galleryId || input.gallery_id ? 'gallery' : input.plannerId || input.planner_id ? 'planner' : 'prompt'),
    subject_id: input.subjectId || input.subject_id || input.galleryId || input.gallery_id || input.plannerId || input.planner_id || input.promptId || input.prompt_id || '',
    char_id: input.char || input.char_id || input.charId || '',
    prompt_id: input.promptId || input.prompt_id || '',
    gallery_id: input.galleryId || input.gallery_id || '',
    planner_id: input.plannerId || input.planner_id || '',
    campaign_id: input.campaignId || input.campaign_id || input.campaign || '',
    overall: Number.isFinite(overallValue) ? overallValue : null,
    drift: Number.isFinite(driftValue) ? driftValue : null,
    payload_json: safeJson(input),
    created_at: input.createdAt || input.created_at || input.ts || ts,
    updated_at: ts
  };
}

function normalizeSessionLog(input) {
  return {
    id: input.id || makeId('log'),
    type: input.type || 'event',
    ts: input.ts || nowIso(),
    payload_json: safeJson(input.meta ?? input.payload ?? input),
    created_at: input.created_at || nowIso()
  };
}

function normalizeStudioPulseThread(input = {}) {
  const ts = nowIso();
  const id = input.id || makeId('pulse_thread');
  const title = String(input.title || 'Untitled Studio Pulse chat').trim() || 'Untitled Studio Pulse chat';
  const status = String(input.status || 'active').trim() || 'active';
  const createdAt = input.createdAt || input.created_at || ts;
  const lastMessageAt = input.lastMessageAt || input.last_message_at || ts;
  return {
    id,
    title,
    status,
    pinned: input.pinned ? 1 : 0,
    include_in_context: input.includeInContext === false ? 0 : 1,
    payload_json: safeJson({
      ...input,
      id,
      title,
      status,
      pinned: Boolean(input.pinned),
      includeInContext: input.includeInContext !== false,
      createdAt,
      updatedAt: ts,
      lastMessageAt
    }),
    created_at: createdAt,
    updated_at: ts,
    last_message_at: lastMessageAt
  };
}

function normalizeStudioPulseMessage(input = {}) {
  const ts = nowIso();
  const payload = studioPulseMessagePayload({
    ...input,
    createdAt: input.createdAt || input.created_at || ts,
    updatedAt: ts
  });
  return {
    id: payload.id || input.id || makeId('pulse_msg'),
    thread_id: String(payload.threadId || '').trim(),
    speaker_id: String(payload.speakerId || '').trim(),
    kind: String(payload.kind || 'message').trim() || 'message',
    text: String(payload.text || '').trim(),
    tone: String(payload.tone || '').trim(),
    delay_ms: Number.isFinite(Number(payload.delayMs)) ? Number(payload.delayMs) : 0,
    reply_to_id: String(payload.replyToId || '').trim(),
    emotional_state: String(payload.emotionalState || '').trim(),
    payload_json: safeJson(payload),
    created_at: payload.createdAt || ts,
    updated_at: ts
  };
}

function normalizeStudioPulseAsset(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    id: payload.id || makeId('pulse_asset'),
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    workflow_id: String(payload.workflowId || payload.workflow_id || '').trim(),
    name: String(payload.name || 'Untitled asset').trim() || 'Untitled asset',
    mime_type: String(payload.mimeType || payload.mime_type || 'application/octet-stream').trim() || 'application/octet-stream',
    kind: String(payload.kind || 'file').trim() || 'file',
    source: String(payload.source || 'upload').trim() || 'upload',
    preview_url: String(payload.previewUrl || payload.preview_url || '').trim(),
    text_extract: String(payload.textExtract || payload.text_extract || '').trim(),
    payload_json: safeJson({
      ...payload,
      id: payload.id || undefined,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      workflowId: String(payload.workflowId || payload.workflow_id || '').trim(),
      name: String(payload.name || 'Untitled asset').trim() || 'Untitled asset',
      mimeType: String(payload.mimeType || payload.mime_type || 'application/octet-stream').trim() || 'application/octet-stream',
      kind: String(payload.kind || 'file').trim() || 'file',
      source: String(payload.source || 'upload').trim() || 'upload',
      previewUrl: String(payload.previewUrl || payload.preview_url || '').trim(),
      textExtract: String(payload.textExtract || payload.text_extract || '').trim(),
      createdAt: payload.createdAt || payload.created_at || ts,
      updatedAt: ts
    }),
    created_at: payload.createdAt || payload.created_at || ts,
    updated_at: ts
  };
}

function normalizeStudioPulseWorkflow(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    id: payload.id || makeId('pulse_workflow'),
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    intent: String(payload.intent || 'room-chat').trim() || 'room-chat',
    status: String(payload.status || 'draft').trim() || 'draft',
    created_by: String(payload.createdBy || payload.created_by || 'aisha').trim() || 'aisha',
    payload_json: safeJson({
      ...payload,
      id: payload.id || undefined,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      intent: String(payload.intent || 'room-chat').trim() || 'room-chat',
      status: String(payload.status || 'draft').trim() || 'draft',
      createdBy: String(payload.createdBy || payload.created_by || 'aisha').trim() || 'aisha',
      createdAt: payload.createdAt || payload.created_at || ts,
      updatedAt: ts
    }),
    created_at: payload.createdAt || payload.created_at || ts,
    updated_at: ts
  };
}

function normalizeStudio2ThreadState(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    schema_version: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
    payload_json: safeJson({
      ...payload,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      schemaVersion: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
      updatedAt: ts
    }),
    updated_at: ts
  };
}

function normalizeStudio2CharacterState(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    character_id: String(payload.characterId || payload.character_id || '').trim(),
    schema_version: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
    payload_json: safeJson({
      ...payload,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      characterId: String(payload.characterId || payload.character_id || '').trim(),
      schemaVersion: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
      updatedAt: ts
    }),
    updated_at: ts
  };
}

function normalizeStudio2RelationshipState(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    pair_key: String(payload.pairKey || payload.pair_key || '').trim(),
    schema_version: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
    payload_json: safeJson({
      ...payload,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      pairKey: String(payload.pairKey || payload.pair_key || '').trim(),
      schemaVersion: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
      updatedAt: ts
    }),
    updated_at: ts
  };
}

function normalizeStudio2ReflectionPatch(input = {}) {
  const ts = nowIso();
  const payload = stripRowArtifacts(input);
  return {
    id: payload.id || makeId('studio2_reflect'),
    thread_id: String(payload.threadId || payload.thread_id || '').trim(),
    schema_version: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
    payload_json: safeJson({
      ...payload,
      threadId: String(payload.threadId || payload.thread_id || '').trim(),
      schemaVersion: String(payload.schemaVersion || payload.schema_version || 'studio2.v4').trim() || 'studio2.v4',
      createdAt: payload.createdAt || payload.created_at || ts
    }),
    created_at: payload.createdAt || payload.created_at || ts
  };
}

function collectReviewEvents(state = {}) {
  const promptById = new Map((Array.isArray(state.prompts) ? state.prompts : []).map(item => [item.id, item]));
  const galleryById = new Map((Array.isArray(state.gallery) ? state.gallery : []).map(item => [item.id, item]));
  const explicit = Array.isArray(state.reviewEvents) ? state.reviewEvents.slice() : [];
  const existingLegacyKeys = new Set(explicit.map(item => item?.legacyKey).filter(Boolean));
  const derived = [];
  const feedback = state.learning?.feedback || {};

  for (const [galleryId, reviews] of Object.entries(feedback.gallery || {})) {
    const item = galleryById.get(galleryId) || {};
    for (let idx = 0; idx < (Array.isArray(reviews) ? reviews.length : 0); idx += 1) {
      const review = reviews[idx] || {};
      const legacyKey = `gallery:${galleryId}:${review.ts || idx}`;
      if (existingLegacyKeys.has(legacyKey)) continue;
      existingLegacyKeys.add(legacyKey);
      derived.push({
        ...review,
        kind: 'gallery_review',
        subjectType: 'gallery',
        subjectId: galleryId,
        galleryId,
        promptId: item.promptId || '',
        campaignId: item.campaignId || item.campaign || '',
        char: item.char || '',
        legacyKey,
        createdAt: review.ts || nowIso()
      });
    }
  }

  for (const [promptId, reviews] of Object.entries(feedback.prompts || {})) {
    const item = promptById.get(promptId) || {};
    for (let idx = 0; idx < (Array.isArray(reviews) ? reviews.length : 0); idx += 1) {
      const review = reviews[idx] || {};
      const legacyKey = `prompt:${promptId}:${review.ts || idx}`;
      if (existingLegacyKeys.has(legacyKey)) continue;
      existingLegacyKeys.add(legacyKey);
      derived.push({
        ...review,
        kind: 'prompt_review',
        subjectType: 'prompt',
        subjectId: promptId,
        promptId,
        campaignId: item.campaignId || item.campaign || '',
        char: item.char || '',
        legacyKey,
        createdAt: review.ts || nowIso()
      });
    }
  }

  for (let idx = 0; idx < (Array.isArray(state.learning?.imageReviews) ? state.learning.imageReviews.length : 0); idx += 1) {
    const review = state.learning.imageReviews[idx] || {};
    const galleryId = review.galleryId || review.subjectId || '';
    if (!galleryId) continue;
    const item = galleryById.get(galleryId) || {};
    const prompt = item.promptId ? promptById.get(item.promptId) : null;
    const legacyKey = review.legacyKey || `imageReview:${galleryId}:${review.ts || review.createdAt || idx}`;
    if (existingLegacyKeys.has(legacyKey)) continue;
    existingLegacyKeys.add(legacyKey);
    derived.push({
      ...review,
      kind: 'gallery_review',
      subjectType: 'gallery',
      subjectId: galleryId,
      galleryId,
      promptId: review.promptId || item.promptId || '',
      campaignId: review.campaignId || item.campaignId || item.campaign || '',
      plannerIds: Array.isArray(review.plannerIds) ? review.plannerIds.slice() : (prompt && Array.isArray(prompt.linkedPlannerIds) ? prompt.linkedPlannerIds.slice() : []),
      char: review.char || item.char || '',
      legacyKey,
      createdAt: review.createdAt || review.ts || nowIso()
    });
  }

  for (let idx = 0; idx < (Array.isArray(state.learning?.promptReviews) ? state.learning.promptReviews.length : 0); idx += 1) {
    const review = state.learning.promptReviews[idx] || {};
    const promptId = review.promptId || review.subjectId || '';
    if (!promptId) continue;
    const item = promptById.get(promptId) || {};
    const legacyKey = review.legacyKey || `promptReview:${promptId}:${review.ts || review.createdAt || idx}`;
    if (existingLegacyKeys.has(legacyKey)) continue;
    existingLegacyKeys.add(legacyKey);
    derived.push({
      ...review,
      kind: 'prompt_review',
      subjectType: 'prompt',
      subjectId: promptId,
      promptId,
      campaignId: review.campaignId || item.campaignId || item.campaign || '',
      plannerIds: Array.isArray(review.plannerIds) ? review.plannerIds.slice() : (Array.isArray(item.linkedPlannerIds) ? item.linkedPlannerIds.slice() : []),
      char: review.char || item.char || '',
      legacyKey,
      createdAt: review.createdAt || review.ts || nowIso()
    });
  }

  return explicit.concat(derived);
}

function getLatestSnapshotState() {
  const row = statements.getLatestSnapshot.get();
  return row ? parseJson(row.payload_json, {}) : {};
}

function buildRuntimeOverlayFromState(snapshot = {}) {
  const personhood = snapshot.personhood && typeof snapshot.personhood === 'object' ? snapshot.personhood : {};
  const liveState = personhood.liveState && typeof personhood.liveState === 'object' ? personhood.liveState : {};
  const pulseHomes = snapshot.pulseHomes && typeof snapshot.pulseHomes === 'object' ? snapshot.pulseHomes : {};
  const aiCommsCenter = snapshot.aiCommsCenter && typeof snapshot.aiCommsCenter === 'object' ? snapshot.aiCommsCenter : {};
  return {
    currentModes: snapshot.currentModes && typeof snapshot.currentModes === 'object' ? snapshot.currentModes : {},
    teamRecords: snapshot.teamRecords && typeof snapshot.teamRecords === 'object' ? snapshot.teamRecords : {},
    homeProfiles: snapshot.homeProfiles && typeof snapshot.homeProfiles === 'object' ? snapshot.homeProfiles : {},
    homeAssets: snapshot.homeAssets && typeof snapshot.homeAssets === 'object' ? snapshot.homeAssets : {},
    pulseHomes,
    characterTuning: snapshot.characterTuning && typeof snapshot.characterTuning === 'object' ? snapshot.characterTuning : {},
    councilTuning: snapshot.councilTuning && typeof snapshot.councilTuning === 'object' ? snapshot.councilTuning : {},
    relationships: (snapshot.relationships && typeof snapshot.relationships === 'object' ? snapshot.relationships : (snapshot.personhood?.relationships && typeof snapshot.personhood.relationships === 'object' ? snapshot.personhood.relationships : {})),
    liveState,
    assetRefs: snapshot.assetRefs && typeof snapshot.assetRefs === 'object' ? snapshot.assetRefs : {},
    providerSettings: snapshot.providerSettings && typeof snapshot.providerSettings === 'object' ? snapshot.providerSettings : {},
    characterBehaviorTree: snapshot.characterBehaviorTree && typeof snapshot.characterBehaviorTree === 'object' ? snapshot.characterBehaviorTree : {},
    councilBehavior: snapshot.councilBehavior && typeof snapshot.councilBehavior === 'object' ? snapshot.councilBehavior : {},
    analytics: snapshot.analytics && typeof snapshot.analytics === 'object' ? snapshot.analytics : {},
    characters: snapshot.characters && typeof snapshot.characters === 'object' ? snapshot.characters : {},
    savedSearch: snapshot.savedSearch && typeof snapshot.savedSearch === 'object' ? snapshot.savedSearch : {},
    lastSeenAt: typeof snapshot.lastSeenAt === 'string' ? snapshot.lastSeenAt : null,
    aiCommsCenter: {
      target: normalizePulseTarget(aiCommsCenter.target || 'studio'),
      ambientEnabled: aiCommsCenter.ambientEnabled !== false,
      lastAmbientAt: Number(aiCommsCenter.lastAmbientAt || 0) || 0,
      activeThreadId: normalizePulseThreadId(aiCommsCenter.activeThreadId || ''),
      roomMode: String(aiCommsCenter.roomMode || 'balanced'),
      feed: Array.isArray(aiCommsCenter.feed) ? aiCommsCenter.feed.slice(-24) : [],
      roomTone: Array.isArray(aiCommsCenter.roomTone) ? aiCommsCenter.roomTone.slice(0, 12) : []
    },
    personhood: {
      liveState,
      relationships: personhood.relationships && typeof personhood.relationships === 'object' ? personhood.relationships : {},
      profiles: personhood.profiles && typeof personhood.profiles === 'object' ? personhood.profiles : {},
      events: Array.isArray(personhood.events) ? personhood.events.slice(-160) : [],
      microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.slice(-32) : [],
      peerObservations: personhood.peerObservations && typeof personhood.peerObservations === 'object' ? personhood.peerObservations : {},
      holding: personhood.holding && typeof personhood.holding === 'object' ? personhood.holding : {},
      autonomyQueue: personhood.autonomyQueue && typeof personhood.autonomyQueue === 'object' ? personhood.autonomyQueue : {},
      salienceMemory: personhood.salienceMemory && typeof personhood.salienceMemory === 'object' ? personhood.salienceMemory : {},
      relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.slice(-80) : [],
      relationshipEdges: personhood.relationshipEdges && typeof personhood.relationshipEdges === 'object' ? personhood.relationshipEdges : {},
      presence: personhood.presence && typeof personhood.presence === 'object' ? personhood.presence : {},
      silence: Array.isArray(personhood.silence) ? personhood.silence.slice(-16) : [],
      config: personhood.config && typeof personhood.config === 'object' ? personhood.config : {}
    }
  };
}

function runtimeOverlayPayloadFromState(state = {}) {
  return buildRuntimeOverlayFromState(state);
}

function getRuntimeOverlayState(key = 'runtime_overlay') {
  const safeKey = String(key || 'runtime_overlay').trim() || 'runtime_overlay';
  const row = statements.getSystemState.get(safeKey);
  if (row?.value_json) return buildRuntimeOverlayFromState(parseJson(row.value_json, {}));
  return buildRuntimeOverlayFromState({});
}

const migrateState = db.transaction((state, source = 'manual') => {
  const snapshotId = makeId('snapshot');
  const ts = nowIso();
  const compactState = compactMigratedState(state);
  statements.addSnapshot.run({
    id: snapshotId,
    source,
    payload_json: safeJson(compactState),
    created_at: ts
  });

  const prompts = Array.isArray(compactState.prompts) ? compactState.prompts : [];
  const gallery = Array.isArray(compactState.gallery) ? compactState.gallery : [];
  const plannerPosts = Array.isArray(compactState.plannerPosts) ? compactState.plannerPosts : [];
  const reviewEvents = collectReviewEvents(compactState);
  const sessionLog = Array.isArray(compactState.sessionLog) ? compactState.sessionLog : [];
  const liveState = compactState.personhood?.liveState || {};
  const relationships = compactState.personhood?.relationships || compactState.relationships || {};

  for (const item of prompts) statements.upsertPrompt.run(normalizePrompt(item));
  for (const item of gallery) statements.upsertGallery.run(normalizeGallery(item));
  for (const item of plannerPosts) statements.upsertPlanner.run(normalizePlanner(item));
  for (const item of reviewEvents) statements.upsertReviewEvent.run(normalizeReviewEvent(item));
  for (const item of sessionLog) statements.upsertSessionLog.run(normalizeSessionLog(item));

  for (const [characterId, payload] of Object.entries(liveState)) {
    statements.upsertCharacterState.run({
      character_id: characterId,
      payload_json: safeJson(payload),
      updated_at: ts
    });
  }

  for (const [pairKey, payload] of Object.entries(relationships)) {
    statements.upsertRelationship.run({
      pair_key: pairKey,
      payload_json: safeJson(payload),
      updated_at: ts
    });
  }

  if (compactState.characterBehaviorTree && typeof compactState.characterBehaviorTree === 'object') {
    statements.setSystemState.run({
      key: 'studio_character_behavior_tree',
      value_json: safeJson(compactState.characterBehaviorTree),
      updated_at: ts
    });
  }

  if (compactState.councilBehavior && typeof compactState.councilBehavior === 'object') {
    statements.setSystemState.run({
      key: 'studio_council_behavior',
      value_json: safeJson(compactState.councilBehavior),
      updated_at: ts
    });
  }

  statements.setSystemState.run({
    key: 'runtime_overlay',
    value_json: safeJson(runtimeOverlayPayloadFromState(compactState)),
    updated_at: ts
  });

  statements.setSystemState.run({
    key: 'last_migration',
    value_json: safeJson({
      snapshotId,
      source,
      prompts: prompts.length,
      gallery: gallery.length,
      plannerPosts: plannerPosts.length,
      reviewEvents: reviewEvents.length,
      sessionLog: sessionLog.length,
      migratedAt: ts
    }),
    updated_at: ts
  });

  return {
    snapshotId,
    migratedAt: ts,
    counts: {
      prompts: prompts.length,
      gallery: gallery.length,
      plannerPosts: plannerPosts.length,
      reviewEvents: reviewEvents.length,
      sessionLog: sessionLog.length,
      characterState: Object.keys(liveState).length,
      relationships: Object.keys(relationships).length
    }
  };
});

const replaceStudioPulseThreadMessages = db.transaction((threadId, messages = []) => {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return;
  statements.deleteStudioPulseMessagesByThread.run(safeThreadId);
  for (const item of Array.isArray(messages) ? messages : []) {
    const normalized = normalizeStudioPulseMessage({ ...item, threadId: safeThreadId });
    if (!normalized.thread_id || !normalized.text) continue;
    statements.upsertStudioPulseMessage.run(normalized);
  }
});

const appendStudioPulseThreadMessages = db.transaction((threadId, messages = [], keepLimit = 240) => {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return;
  for (const item of Array.isArray(messages) ? messages : []) {
    const normalized = normalizeStudioPulseMessage({ ...item, threadId: safeThreadId });
    if (!normalized.thread_id || !normalized.text) continue;
    statements.upsertStudioPulseMessage.run(normalized);
  }
  const existing = statements.getStudioPulseMessagesTailByThread.all(safeThreadId, Math.max(keepLimit + 64, keepLimit));
  if (existing.length <= keepLimit) return;
  const keepIds = new Set(existing.slice(0, keepLimit).map(row => String(row.id || '')));
  const staleIds = existing.slice(keepLimit).map(row => String(row.id || '')).filter(Boolean);
  if (!staleIds.length) return;
  const deleteById = db.prepare(`DELETE FROM studio_pulse_messages WHERE id = ?`);
  for (const id of staleIds) {
    if (keepIds.has(id)) continue;
    deleteById.run(id);
  }
});

function getStudioPulseThreads(limit = 60) {
  return statements.getStudioPulseThreads.all(Math.max(1, Number(limit) || 60)).map(rowWithPayload);
}

function searchStudioPulseThreads(query = '', limit = 60) {
  const q = String(query || '').trim();
  if (!q) return getStudioPulseThreads(limit);
  return statements.searchStudioPulseThreads.all({
    query: `%${q}%`,
    limit: Math.max(1, Number(limit) || 60)
  }).map(rowWithPayload);
}

function getStudioPulseThreadById(id) {
  return rowWithPayload(statements.getStudioPulseThreadById.get(String(id || '')));
}

function getStudioPulseMessages(threadId, limit = 0) {
  const safeThreadId = String(threadId || '');
  const safeLimit = Math.max(0, Number(limit) || 0);
  if (safeLimit > 0) {
    return statements.getStudioPulseMessagesTailByThread
      .all(safeThreadId, safeLimit)
      .slice()
      .reverse()
      .map(rowToStudioPulseMessage)
      .filter(Boolean);
  }
  return statements.getStudioPulseMessagesByThread.all(safeThreadId).map(rowToStudioPulseMessage).filter(Boolean);
}

function getStudioPulseAssets(threadId) {
  return statements.getStudioPulseAssetsByThread
    .all(String(threadId || ''))
    .map(rowToStudioPulseAsset)
    .filter(Boolean);
}

function getStudioPulseAssetById(id) {
  return rowToStudioPulseAsset(statements.getStudioPulseAssetById.get(String(id || '')));
}

function getStudioPulseWorkflows(threadId) {
  return statements.getStudioPulseWorkflowsByThread
    .all(String(threadId || ''))
    .map(rowToStudioPulseWorkflow)
    .filter(Boolean);
}

function getStudioPulseWorkflowById(id) {
  return rowToStudioPulseWorkflow(statements.getStudioPulseWorkflowById.get(String(id || '')));
}

function getStudio2ThreadState(threadId) {
  return rowToStudio2ThreadState(statements.getStudio2ThreadStateByThread.get(String(threadId || '')));
}

function getStudio2CharacterStates(threadId) {
  const out = {};
  for (const row of statements.getStudio2CharacterStatesByThread.all(String(threadId || ''))) {
    const item = rowToStudio2CharacterState(row);
    if (item?.characterId) out[item.characterId] = item;
  }
  return out;
}

function getStudio2RelationshipStates(threadId) {
  const out = {};
  for (const row of statements.getStudio2RelationshipStatesByThread.all(String(threadId || ''))) {
    const item = rowToStudio2RelationshipState(row);
    if (item?.pairKey) out[item.pairKey] = item;
  }
  return out;
}

function getStudio2ReflectionPatches(threadId, limit = 12) {
  return statements.getStudio2ReflectionPatchesByThread
    .all(String(threadId || ''), Math.max(1, Number(limit) || 12))
    .map(rowToStudio2ReflectionPatch)
    .filter(Boolean);
}

const replaceStudio2CharacterStates = db.transaction((threadId, states = {}) => {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return;
  statements.deleteStudio2CharacterStatesByThread.run(safeThreadId);
  for (const [characterId, payload] of Object.entries(states || {})) {
    const normalized = normalizeStudio2CharacterState({
      ...payload,
      threadId: safeThreadId,
      characterId
    });
    if (!normalized.thread_id || !normalized.character_id) continue;
    statements.upsertStudio2CharacterState.run(normalized);
  }
});

const replaceStudio2RelationshipStates = db.transaction((threadId, states = {}) => {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return;
  statements.deleteStudio2RelationshipStatesByThread.run(safeThreadId);
  for (const [pairKey, payload] of Object.entries(states || {})) {
    const normalized = normalizeStudio2RelationshipState({
      ...payload,
      threadId: safeThreadId,
      pairKey
    });
    if (!normalized.thread_id || !normalized.pair_key) continue;
    statements.upsertStudio2RelationshipState.run(normalized);
  }
});

function upsertStudio2ThreadState(threadId, payload = {}) {
  const normalized = normalizeStudio2ThreadState({
    ...payload,
    threadId
  });
  if (!normalized.thread_id) return null;
  statements.upsertStudio2ThreadState.run(normalized);
  return getStudio2ThreadState(normalized.thread_id);
}

function insertStudio2ReflectionPatch(threadId, payload = {}) {
  const normalized = normalizeStudio2ReflectionPatch({
    ...payload,
    threadId
  });
  if (!normalized.thread_id) return null;
  statements.insertStudio2ReflectionPatch.run(normalized);
  return rowToStudio2ReflectionPatch({
    id: normalized.id,
    thread_id: normalized.thread_id,
    schema_version: normalized.schema_version,
    payload_json: normalized.payload_json,
    created_at: normalized.created_at
  });
}

module.exports = {
  db,
  nowIso,
  parseJson,
  rowWithPayload,
  statements,
  normalizePrompt,
  normalizeGallery,
  normalizePlanner,
  normalizeReviewEvent,
  normalizeSessionLog,
  normalizeStudioPulseThread,
  normalizeStudioPulseMessage,
  normalizeStudioPulseAsset,
  normalizeStudioPulseWorkflow,
  normalizeStudio2ThreadState,
  normalizeStudio2CharacterState,
  normalizeStudio2RelationshipState,
  normalizeStudio2ReflectionPatch,
  getLatestSnapshotState,
  getRuntimeOverlayState,
  runtimeOverlayPayloadFromState,
  migrateState,
  replaceStudioPulseThreadMessages,
  appendStudioPulseThreadMessages,
  getStudioPulseThreads,
  searchStudioPulseThreads,
  getStudioPulseThreadById,
  getStudioPulseMessages,
  getStudioPulseAssets,
  getStudioPulseAssetById,
  getStudioPulseWorkflows,
  getStudioPulseWorkflowById,
  getStudio2ThreadState,
  getStudio2CharacterStates,
  getStudio2RelationshipStates,
  getStudio2ReflectionPatches,
  replaceStudio2CharacterStates,
  replaceStudio2RelationshipStates,
  upsertStudio2ThreadState,
  insertStudio2ReflectionPatch
};
