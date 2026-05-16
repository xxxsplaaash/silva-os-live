const express = require('express');

const router = express.Router();

const CACHE_TTL_MS = 60 * 1000;
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ACTION_SCHEMA_VERSION = 'ai.suggest-actions.v1';
const AESTHETIC_SCHEMA_VERSION = 'ai.analyze-aesthetic.v1';

function cleanText(value, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim();
}

function recipeValue(recipe, path, fallback = '') {
  return path.reduce((value, key) => (value && value[key] != null ? value[key] : undefined), recipe) ?? fallback;
}

function titleFromAction(action) {
  const text = cleanText(action, 'Action');
  const parts = text.split(' - ');
  return cleanText(parts[1] || parts[0] || 'Action');
}

function normalizeSuggestion(item, index) {
  const action = cleanText(item?.action || item?.pose || item?.description);
  if (!action) return null;
  return {
    id: cleanText(item?.id, `suggested_action_${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `suggested_action_${index + 1}`,
    title: cleanText(item?.title, titleFromAction(action)).slice(0, 80),
    action: action.slice(0, 220),
    reason: cleanText(item?.reason, 'Fits the selected character, location, wardrobe, and mood.').slice(0, 180),
    category: cleanText(item?.category, 'AI Suggested').slice(0, 60)
  };
}

function deterministicActionSuggestions(recipe = {}) {
  const scene = recipe.scenePack || {};
  const wardrobe = recipe.wardrobePack || {};
  const character = recipe.character?.name || recipe.characterName || recipe.character || 'the character';
  const location = cleanText(scene.location || scene.locationName || scene.locationId, 'the selected location');
  const lighting = cleanText(scene.lighting || scene.lightingId, 'available light');
  const mood = cleanText(scene.mood || scene.moodId, 'controlled');
  const wardrobeText = cleanText(wardrobe.name || wardrobe.override || wardrobe.garments, 'the selected wardrobe').toLowerCase();
  const locationText = location.toLowerCase();
  const interior = /(cafe|hotel|suite|office|boardroom|interior|gallery|studio|corridor|library|restaurant|kitchen|hospital|church|market)/i.test(locationText);
  const exterior = /(street|rooftop|beach|promenade|garden|dam|jetty|cliff|savanna|grass|waterfront|skyline|estate|mountain)/i.test(locationText);
  const fashion = /(jacket|blazer|collar|sleeve|skirt|dress|shirt|tailor|wardrobe|outfit|fashion)/i.test(wardrobeText);

  const pool = [];
  if (interior) {
    pool.push(
      ['Table Authority', 'Seated at desk, looking up at camera - workspace authority', `Makes ${character} feel anchored inside ${location}, with hands and posture doing useful story work.`, 'Seated / Grounded'],
      ['Conversation Hold', 'Direct gaze, seated, hands visible - conversational authority', `Strong for ${mood} energy under ${lighting}; it keeps identity readable.`, 'Still / Presence'],
      ['Lean In', 'Leaning forward over table, engaged - intensity', `Uses the room as context without letting it swallow the character.`, 'Seated / Grounded']
    );
  }
  if (exterior) {
    pool.push(
      ['Arrival Frame', 'Mid-stride, one foot forward - arriving', `Gives ${location} motion and depth instead of another static pose.`, 'Movement / Energy'],
      ['Walk-In Power', 'Walking toward camera, direct look - approach', `Works when the environment has enough depth to carry a moving subject.`, 'Movement / Energy'],
      ['The Reveal', 'Turning to face camera from profile - the reveal', `Adds editorial motion while keeping the face visible for identity lock.`, 'Movement / Energy']
    );
  }
  if (fashion) {
    pool.push(
      ['Garment Detail', 'Adjusting collar or sleeve - garment focus', `Makes the wardrobe reference intentional instead of decorative.`, 'Fashion / Editorial'],
      ['Wardrobe Reveal', 'Holding jacket open - wardrobe reveal', `Lets the outfit become the hero while keeping posture controlled.`, 'Fashion / Editorial'],
      ['Editorial Line', 'Full body, hands at sides - fashion editorial standing', `Clean silhouette read for ${wardrobe.name || wardrobe.override || 'the selected outfit'}.`, 'Fashion / Editorial']
    );
  }
  pool.push(
    ['Quiet Confidence', 'Slight smile, not performing it - quiet confidence', `Softens the frame without making it feel stock or overly posed.`, 'Expressive / Emotional'],
    ['No-Smile Focus', 'Intense eye contact, no smile - focus and presence', `Good when the shot needs authority more than warmth.`, 'Expressive / Emotional'],
    ['Caught Turn', 'Over-shoulder glance, mid-turn - caught in motion', `Adds energy while keeping a clean identity angle.`, 'Still / Presence'],
    ['Owned Space', 'Leaning against wall, arms loose - ease and ownership', `Lets ${character} inhabit ${location} naturally.`, 'Still / Presence']
  );

  const seen = new Set();
  return pool
    .filter(([, action]) => {
      if (seen.has(action)) return false;
      seen.add(action);
      return true;
    })
    .slice(0, 6)
    .map(([title, action, reason, category], index) => normalizeSuggestion({
      id: `local_action_${index + 1}`,
      title,
      action,
      reason,
      category
    }, index));
}

function extractJsonArray(text) {
  const raw = cleanText(text);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.items)) return parsed.items;
  } catch {}
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {}
  }
  return null;
}

function normalizeImageInput(imageBase64) {
  const raw = String(imageBase64 || '').trim();
  if (!raw) return null;
  let mediaType = 'image/jpeg';
  let data = raw;
  const match = raw.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([\s\S]+)$/i);
  if (match) {
    mediaType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    data = match[2];
  }
  data = String(data || '').replace(/\s+/g, '');
  if (data.length < 24 || !/^[A-Za-z0-9+/=]+$/.test(data)) return null;
  return { mediaType, data };
}

function normalizeStringList(value, fallback = []) {
  const input = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(/\n|,\s*/) : []);
  const out = input
    .map(item => cleanText(item))
    .filter(Boolean)
    .slice(0, 8);
  return out.length ? out : fallback;
}

function normalizeAesthetic(raw = {}) {
  const promptModifiers = normalizeStringList(raw.promptModifiers || raw.modifiers, [
    'warm directional light shaped around the subject',
    'cohesive editorial color palette',
    'controlled shadow depth with natural skin texture',
    'camera-real campaign image energy',
    'clean visual hierarchy around one subject'
  ]).slice(0, 8);
  const negativeModifiers = normalizeStringList(raw.negativeModifiers || raw.avoid, [
    'flat generic stock lighting',
    'oversaturated artificial colors',
    'beauty-filter skin smoothing',
    'busy unfocused background'
  ]).slice(0, 5);
  const label = cleanText(raw.aestheticLabel || raw.style || raw.category, 'editorial');
  const allowed = /^(editorial|documentary|fashion|commercial|cinematic|conceptual)$/i.test(label)
    ? label.toLowerCase()
    : 'editorial';
  return {
    lighting: cleanText(raw.lighting, 'warm directional afternoon light with controlled shadow').slice(0, 220),
    colorPalette: cleanText(raw.colorPalette || raw.palette, 'amber, terracotta, warm neutral, shadow black').slice(0, 180),
    mood: cleanText(raw.mood, 'quiet authority').slice(0, 160),
    cameraStyle: cleanText(raw.cameraStyle || raw.camera, 'medium portrait, 50mm feel, shallow natural depth').slice(0, 180),
    environment: cleanText(raw.environment, 'camera-real editorial environment, controlled depth').slice(0, 180),
    aestheticLabel: allowed,
    promptModifiers,
    negativeModifiers
  };
}

function deterministicAestheticFallback() {
  return normalizeAesthetic({
    lighting: 'warm directional afternoon light, shaped from one side with soft falloff',
    colorPalette: 'amber, terracotta, warm neutral highlights, deep shadow black',
    mood: 'quiet authority, intimate editorial confidence',
    cameraStyle: 'medium portrait, 50mm natural perspective, shallow background separation',
    environment: 'camera-real campaign environment with controlled depth and clean subject priority',
    aestheticLabel: 'editorial',
    promptModifiers: [
      'warm directional afternoon light',
      'amber and terracotta editorial palette',
      'deep shadow black without crushed identity detail',
      'quiet authority in the pose and environment',
      'medium portrait with 50mm natural perspective',
      'controlled depth and clean subject separation',
      'campaign image polish without looking like a poster'
    ],
    negativeModifiers: [
      'flat stock lighting',
      'random saturated colors',
      'over-smoothed beauty skin',
      'busy cluttered background',
      'poster or graphic design treatment'
    ]
  });
}

async function fetchClaudeAesthetic(image) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !image) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  const payload = {
    model: process.env.ANTHROPIC_AESTHETIC_MODEL || 'claude-3-5-haiku-latest',
    max_tokens: 1100,
    temperature: 0.2,
    system: 'You are an aesthetic analysis system for a professional AI image production studio. Return only valid JSON.',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: image.mediaType,
            data: image.data
          }
        },
        {
          type: 'text',
          text: [
            'Analyze this reference image and return ONLY JSON with this exact shape:',
            '{"lighting":"description of light quality, direction, color temperature","colorPalette":"dominant colors, warmth/coolness, saturation","mood":"emotional quality","cameraStyle":"distance, lens feel, depth of field","environment":"interior/exterior, space type, time of day","aestheticLabel":"editorial|documentary|fashion|commercial|cinematic|conceptual","promptModifiers":["5-8 specific prompt phrases"],"negativeModifiers":["3-5 things to avoid"]}',
            'Do not identify people, brands, artists, or copyrighted work. Describe transferable visual qualities only.'
          ].join('\n')
        }
      ]
    }]
  };

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    const text = Array.isArray(data.content)
      ? data.content.map(part => part?.text || '').join('\n')
      : '';
    const parsed = extractJsonObject(text);
    return parsed ? normalizeAesthetic(parsed) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchClaudeSuggestions(recipe) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  const payload = {
    model: process.env.ANTHROPIC_ACTION_MODEL || 'claude-3-5-haiku-latest',
    max_tokens: 900,
    temperature: 0.6,
    system: 'You are an action and pose director for a fashion/editorial AI image production console. Return only valid JSON.',
    messages: [{
      role: 'user',
      content: [
        'Suggest exactly 6 action/pose options for this shot.',
        'Return JSON only in this shape:',
        '[{"id":"slug","title":"short title","action":"plain action text","reason":"why it fits","category":"one of Still / Presence, Movement / Energy, Seated / Grounded, Expressive / Emotional, Fashion / Editorial"}]',
        '',
        `Character: ${cleanText(recipeValue(recipe, ['character', 'name'], recipe.characterName || recipe.character || 'selected character'))}`,
        `Location: ${cleanText(recipeValue(recipe, ['scenePack', 'location'], recipeValue(recipe, ['scenePack', 'locationId'], 'selected location')))}`,
        `Mood: ${cleanText(recipeValue(recipe, ['scenePack', 'mood'], recipeValue(recipe, ['scenePack', 'moodId'], 'selected mood')))}`,
        `Lighting: ${cleanText(recipeValue(recipe, ['scenePack', 'lighting'], recipeValue(recipe, ['scenePack', 'lightingId'], 'selected lighting')))}`,
        `Wardrobe: ${cleanText(recipeValue(recipe, ['wardrobePack', 'name'], recipeValue(recipe, ['wardrobePack', 'override'], recipeValue(recipe, ['wardrobePack', 'garments'], 'selected wardrobe'))))}`,
        `Model: ${cleanText(recipe.selectedModel || recipe.imageModel || recipe.model, 'selected image model')}`
      ].join('\n')
    }]
  };

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    const text = Array.isArray(data.content)
      ? data.content.map(part => part?.text || '').join('\n')
      : '';
    const parsed = extractJsonArray(text);
    if (!Array.isArray(parsed)) return null;
    const items = parsed.map(normalizeSuggestion).filter(Boolean).slice(0, 6);
    return items.length === 6 ? items : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/suggest-actions', async (req, res) => {
  const recipe = req.body?.recipe && typeof req.body.recipe === 'object' ? req.body.recipe : {};
  const claudeItems = await fetchClaudeSuggestions(recipe);
  const items = claudeItems || deterministicActionSuggestions(recipe);
  res.json({
    ok: true,
    schemaVersion: ACTION_SCHEMA_VERSION,
    source: claudeItems ? 'claude' : 'local_contextual_fallback',
    cacheTtlMs: CACHE_TTL_MS,
    items
  });
});

async function analyzeAestheticHandler(req, res) {
  const image = normalizeImageInput(req.body?.imageBase64 || req.body?.imageData || req.body?.dataUrl);
  if (!image) {
    return res.status(400).json({
      ok: false,
      schemaVersion: AESTHETIC_SCHEMA_VERSION,
      error: 'imageBase64 required'
    });
  }

  const claudeAesthetic = await fetchClaudeAesthetic(image);
  res.json({
    ok: true,
    schemaVersion: AESTHETIC_SCHEMA_VERSION,
    source: claudeAesthetic ? 'claude' : 'local_fallback',
    aesthetic: claudeAesthetic || deterministicAestheticFallback()
  });
}

router.post('/analyze-aesthetic-ref', analyzeAestheticHandler);
router.post('/analyze-aesthetic', analyzeAestheticHandler);

module.exports = router;
