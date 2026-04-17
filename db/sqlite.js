const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'silva.db');
const SCHEMA_PATH = path.join(__dirname, 'init.sql');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

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

  getPrompts: db.prepare(`SELECT * FROM prompts ORDER BY updated_at DESC`),
  getPromptById: db.prepare(`SELECT * FROM prompts WHERE id = ?`),
  getGallery: db.prepare(`SELECT * FROM gallery_items ORDER BY updated_at DESC`),
  getGalleryById: db.prepare(`SELECT * FROM gallery_items WHERE id = ?`),
  getPlanner: db.prepare(`SELECT * FROM planner_posts ORDER BY COALESCE(scheduled_for, updated_at) ASC, updated_at DESC`),
  getPlannerById: db.prepare(`SELECT * FROM planner_posts WHERE id = ?`),
  getSessionLogs: db.prepare(`SELECT * FROM session_logs ORDER BY ts DESC LIMIT ?`),
  getCharacterStates: db.prepare(`SELECT * FROM character_state ORDER BY character_id ASC`),
  getRelationships: db.prepare(`SELECT * FROM relationships ORDER BY pair_key ASC`),
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

function normalizeSessionLog(input) {
  return {
    id: input.id || makeId('log'),
    type: input.type || 'event',
    ts: input.ts || nowIso(),
    payload_json: safeJson(input.meta ?? input.payload ?? input),
    created_at: input.created_at || nowIso()
  };
}

const migrateState = db.transaction((state, source = 'manual') => {
  const snapshotId = makeId('snapshot');
  const ts = nowIso();
  statements.addSnapshot.run({
    id: snapshotId,
    source,
    payload_json: safeJson(state),
    created_at: ts
  });

  const prompts = Array.isArray(state.prompts) ? state.prompts : [];
  const gallery = Array.isArray(state.gallery) ? state.gallery : [];
  const plannerPosts = Array.isArray(state.plannerPosts) ? state.plannerPosts : [];
  const sessionLog = Array.isArray(state.sessionLog) ? state.sessionLog : [];
  const liveState = state.personhood?.liveState || {};
  const relationships = state.personhood?.relationships || state.relationships || {};

  for (const item of prompts) statements.upsertPrompt.run(normalizePrompt(item));
  for (const item of gallery) statements.upsertGallery.run(normalizeGallery(item));
  for (const item of plannerPosts) statements.upsertPlanner.run(normalizePlanner(item));
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

  statements.setSystemState.run({
    key: 'last_migration',
    value_json: safeJson({
      snapshotId,
      source,
      prompts: prompts.length,
      gallery: gallery.length,
      plannerPosts: plannerPosts.length,
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
      sessionLog: sessionLog.length,
      characterState: Object.keys(liveState).length,
      relationships: Object.keys(relationships).length
    }
  };
});

module.exports = {
  db,
  nowIso,
  parseJson,
  rowWithPayload,
  statements,
  normalizePrompt,
  normalizeGallery,
  normalizePlanner,
  normalizeSessionLog,
  migrateState
};
