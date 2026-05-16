const express = require('express');
const { nowIso, parseJson, statements } = require('../db/sqlite');

const router = express.Router();

const PROFILE_KEYS = {
  closets: 'generator_closet_v1',
  sceneLibrary: 'generator_scene_library_v1',
  presets: 'generator_presets_v1'
};

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
    writeProfileKey(PROFILE_KEYS.closets, cleanObject(body.closets));
  }
  if (Object.prototype.hasOwnProperty.call(body, 'sceneLibrary')) {
    writeProfileKey(PROFILE_KEYS.sceneLibrary, cleanObject(body.sceneLibrary));
  }
  if (Object.prototype.hasOwnProperty.call(body, 'presets')) {
    writeProfileKey(PROFILE_KEYS.presets, cleanObject(body.presets));
  }
  res.json(publicProfile());
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
