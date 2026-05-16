const express = require('express');
const { nowIso, parseJson, statements } = require('../db/sqlite');
const { getGenerationStatus } = require('../lib/imageGeneration/generationStatusStore');

const router = express.Router();

const PROFILE_KEYS = {
  closets: 'generator_closet_v1',
  sceneLibrary: 'generator_scene_library_v1',
  presets: 'generator_presets_v1',
  shotHistory: 'generator_shot_history_v1'
};
const MAX_CLOSET_BYTES = 15 * 1024 * 1024;
const MAX_SHOT_HISTORY_ENTRIES = 200;
const SHOT_HISTORY_STATUSES = new Set(['generated', 'approved', 'rejected']);

function readProfileKey(key, fallback) {
  const row = statements.getSystemState.get(key);
  return row?.value_json ? parseJson(row.value_json, fallback) : fallback;
}

function writeProfileKey(key, value) {
  statements.setSystemState.run({
    key,
    value_json: JSON.stringify(value ?? {}),
    updated_at: nowIso()
  });
}

function cleanObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value ?? {}), 'utf8');
}

function cleanString(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function stripBase64Images(value, depth = 0) {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.map(item => stripBase64Images(item, depth + 1));
  if (!value || typeof value !== 'object') {
    if (typeof value === 'string' && /^data:image\//i.test(value)) return '';
    return value;
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/^(imageData|imageDataUrl|dataUrl|preview)$/i.test(key) && typeof item === 'string' && /^data:image\//i.test(item)) {
      return [key, ''];
    }
    return [key, stripBase64Images(item, depth + 1)];
  }));
}

function validateWardrobeItem(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (!item.id || !item.name) return false;
  if (item.image && typeof item.image === 'object' && item.image.dataUrl) {
    if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(String(item.image.dataUrl))) return false;
  }
  return true;
}

function validateClosets(closets) {
  if (!closets || typeof closets !== 'object' || Array.isArray(closets)) return false;
  for (const items of Object.values(closets)) {
    if (!Array.isArray(items)) return false;
    for (const item of items) {
      if (!validateWardrobeItem(item)) return false;
    }
  }
  return true;
}

function enforceClosetWrite(res, closets) {
  if (!validateClosets(closets)) {
    res.status(400).json({
      ok: false,
      error: 'INVALID_CLOSET_SHAPE',
      message: 'Wardrobe data is not in the expected character closet format.'
    });
    return false;
  }
  if (byteLength(closets) > MAX_CLOSET_BYTES) {
    res.status(413).json({
      ok: false,
      error: 'CLOSET_TOO_LARGE',
      message: 'Wardrobe data exceeds the local 15MB limit. Remove older wardrobe items before saving more.'
    });
    return false;
  }
  return true;
}

function readShotHistory() {
  const history = readProfileKey(PROFILE_KEYS.shotHistory, []);
  return Array.isArray(history) ? history.filter(item => item && typeof item === 'object') : [];
}

function writeShotHistory(history) {
  writeProfileKey(PROFILE_KEYS.shotHistory, Array.isArray(history) ? history.slice(0, MAX_SHOT_HISTORY_ENTRIES) : []);
}

function normalizeShotHistoryRecord(input, existing = {}) {
  const shot = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const status = cleanString(shot.status || existing.status || 'generated', 32);
  const cost = Number(shot.costZAR ?? existing.costZAR ?? 0);
  return {
    ...existing,
    ...stripBase64Images(shot),
    id: cleanString(shot.id || existing.id, 120),
    character: cleanString(shot.character || existing.character, 80).toLowerCase(),
    dna: cleanString(shot.dna || existing.dna, 180),
    promptSnippet: cleanString(shot.promptSnippet || existing.promptSnippet, 160),
    model: cleanString(shot.model || existing.model, 120),
    costZAR: Number.isFinite(cost) ? Number(cost.toFixed(2)) : 0,
    status,
    createdAt: cleanString(shot.createdAt || existing.createdAt || nowIso(), 40),
    updatedAt: cleanString(shot.updatedAt || existing.updatedAt || nowIso(), 40)
  };
}

function validateShotRecord(shot) {
  if (!shot || typeof shot !== 'object' || Array.isArray(shot)) return 'shot object is required';
  for (const key of ['id', 'character', 'dna', 'promptSnippet', 'model', 'createdAt']) {
    if (!cleanString(shot[key], 200)) return `${key} is required`;
  }
  if (!Object.prototype.hasOwnProperty.call(shot, 'costZAR') || !Number.isFinite(Number(shot.costZAR))) return 'costZAR is required';
  if (!SHOT_HISTORY_STATUSES.has(cleanString(shot.status || '', 32))) return 'status must be generated, approved, or rejected';
  return '';
}

function filterShotHistory(history, query = {}) {
  const character = cleanString(query.character, 80).toLowerCase();
  const status = cleanString(query.status, 32);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), MAX_SHOT_HISTORY_ENTRIES);
  return history
    .filter(item => !character || item.character === character)
    .filter(item => !status || item.status === status)
    .slice(0, limit);
}

function publicProfile() {
  return {
    ok: true,
    schemaVersion: 'generator.profile.v1',
    closets: readProfileKey(PROFILE_KEYS.closets, {}),
    sceneLibrary: readProfileKey(PROFILE_KEYS.sceneLibrary, {}),
    presets: readProfileKey(PROFILE_KEYS.presets, {})
  };
}

function concept(value, fallback) {
  return String(value || fallback || '').trim();
}

router.get('/profile', (req, res) => {
  res.json(publicProfile());
});

router.post('/profile', (req, res) => {
  const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, 'closets')) {
    const closets = cleanObject(body.closets);
    if (!enforceClosetWrite(res, closets)) return;
    writeProfileKey(PROFILE_KEYS.closets, closets);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'sceneLibrary')) {
    writeProfileKey(PROFILE_KEYS.sceneLibrary, cleanObject(body.sceneLibrary));
  }
  if (Object.prototype.hasOwnProperty.call(body, 'presets')) {
    writeProfileKey(PROFILE_KEYS.presets, cleanObject(body.presets));
  }
  res.json(publicProfile());
});

router.get('/shot-history', (req, res) => {
  const history = filterShotHistory(readShotHistory(), req.query || {});
  res.json({ ok: true, schemaVersion: 'generator.shot-history.v1', history });
});

router.get('/generation-status/:id', (req, res) => {
  res.json({
    schemaVersion: 'generator.generation-status.v1',
    ...getGenerationStatus(req.params.id)
  });
});

router.post('/shot-history', (req, res) => {
  const rawShot = (req.body || {}).shot;
  const validationError = validateShotRecord(rawShot);
  if (validationError) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_SHOT_HISTORY_RECORD',
      message: validationError
    });
  }
  const normalized = normalizeShotHistoryRecord(rawShot, { updatedAt: nowIso() });
  const history = readShotHistory().filter(item => item && item.id !== normalized.id);
  history.unshift(normalized);
  const trimmed = history.slice(0, MAX_SHOT_HISTORY_ENTRIES);
  writeShotHistory(trimmed);
  res.json({ ok: true, schemaVersion: 'generator.shot-history.v1', shot: normalized, history: trimmed });
});

router.patch('/shot-history/:id', (req, res) => {
  const id = cleanString(req.params.id, 120);
  const patch = req.body || {};
  const status = cleanString(patch.status, 32);
  if (!id || !SHOT_HISTORY_STATUSES.has(status)) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_SHOT_HISTORY_PATCH',
      message: 'shot id and valid status are required.'
    });
  }
  const history = readShotHistory();
  const index = history.findIndex(item => item && item.id === id);
  if (index < 0) {
    return res.status(404).json({
      ok: false,
      error: 'SHOT_HISTORY_NOT_FOUND',
      message: 'No shot history record exists for that id.'
    });
  }
  const updates = {
    status,
    failureType: cleanString(patch.failureType, 80),
    failureNote: cleanString(patch.failureNote, 500),
    approvedAt: cleanString(patch.approvedAt, 40),
    rejectedAt: cleanString(patch.rejectedAt, 40),
    updatedAt: nowIso()
  };
  if (status === 'approved' && !updates.approvedAt) updates.approvedAt = nowIso();
  if (status === 'rejected' && !updates.rejectedAt) updates.rejectedAt = nowIso();
  const normalized = normalizeShotHistoryRecord(updates, history[index]);
  history[index] = normalized;
  writeShotHistory(history);
  res.json({ ok: true, schemaVersion: 'generator.shot-history.v1', shot: normalized, history });
});

router.post('/wardrobe/:characterId/item', (req, res) => {
  const characterId = String(req.params.characterId || '').trim().toLowerCase();
  const item = req.body || {};
  const normalized = {
    ...item,
    characterId: String(item.characterId || characterId)
  };
  if (!characterId || !validateWardrobeItem(normalized)) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_WARDROBE_ITEM',
      message: 'Wardrobe item needs id, characterId, name, and optional image.dataUrl.'
    });
  }
  const closets = readProfileKey(PROFILE_KEYS.closets, {});
  const list = Array.isArray(closets[characterId]) ? closets[characterId].slice() : [];
  const idx = list.findIndex(existing => existing && existing.id === normalized.id);
  if (idx >= 0) list[idx] = normalized;
  else list.unshift(normalized);
  closets[characterId] = list;
  if (!enforceClosetWrite(res, closets)) return;
  writeProfileKey(PROFILE_KEYS.closets, closets);
  res.json({ ok: true, characterId, item: normalized, closets });
});

router.delete('/wardrobe/:characterId/item/:itemId', (req, res) => {
  const characterId = String(req.params.characterId || '').trim().toLowerCase();
  const itemId = String(req.params.itemId || '').trim();
  if (!characterId || !itemId) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_WARDROBE_DELETE',
      message: 'characterId and itemId are required.'
    });
  }
  const closets = readProfileKey(PROFILE_KEYS.closets, {});
  const list = Array.isArray(closets[characterId]) ? closets[characterId].slice() : [];
  closets[characterId] = list.filter(item => item && item.id !== itemId);
  if (!enforceClosetWrite(res, closets)) return;
  writeProfileKey(PROFILE_KEYS.closets, closets);
  res.json({ ok: true, characterId, deleted: itemId, closets });
});

router.post('/concepts', (req, res) => {
  const body = req.body || {};
  const character = concept(body.character, 'selected character');
  const location = concept(body.location, 'Johannesburg');
  const outfit = concept(body.outfit, 'signature outfit');
  const mood = concept(body.mood, 'controlled');
  const camera = concept(body.camera, 'editorial realism');
  const ideas = [
    {
      id: 'concept_city_hold',
      title: 'City Hold',
      scene: `${character} paused in ${location}, holding eye contact with quiet pressure.`,
      outfit,
      camera,
      light: 'soft directional city light',
      action: 'standing still, aware of the room'
    },
    {
      id: 'concept_movement_cut',
      title: 'Movement Cut',
      scene: `${character} moving through ${location} mid-step, identity still locked and camera-real.`,
      outfit,
      camera: 'documentary street realism',
      light: 'available light with natural shadows',
      action: 'walking past camera with controlled energy'
    },
    {
      id: 'concept_table_read',
      title: 'Table Read',
      scene: `${character} seated in ${location}, hands in frame, expression ${mood}.`,
      outfit,
      camera: 'phone-real close editorial frame',
      light: 'window light and real interior spill',
      action: 'quiet pause before speaking'
    },
    {
      id: 'concept_detail_anchor',
      title: 'Detail Anchor',
      scene: `${character} in ${location}, outfit texture and body posture doing the storytelling.`,
      outfit,
      camera,
      light: 'warm natural light',
      action: 'subtle shoulder turn, face clear'
    },
    {
      id: 'concept_after_motion',
      title: 'After Motion',
      scene: `${character} just after movement in ${location}, still exact, not posed like stock.`,
      outfit,
      camera: 'candid premium realism',
      light: 'late-afternoon practical light',
      action: 'looking away then back toward lens'
    },
    {
      id: 'concept_direct_final',
      title: 'Direct Final',
      scene: `${character} framed cleanly in ${location}, final campaign-quality raw photograph.`,
      outfit,
      camera,
      light: 'clean honest light, visible skin texture',
      action: 'direct gaze, relaxed posture'
    }
  ];
  res.json({
    ok: true,
    schemaVersion: 'generator.concepts.v1',
    source: 'local_structured',
    items: ideas
  });
});

module.exports = router;
