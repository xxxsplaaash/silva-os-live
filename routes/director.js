const express = require('express');

const router = express.Router();

const SCHEMA_VERSION = 'director.parse-brief.v1';
const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

function cleanText(value, fallback = '') {
  return String(value == null ? fallback : value).replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
}

function includesAny(text, words) {
  return words.some(word => text.includes(word));
}

function firstMatch(text, items) {
  return items.find(item => item.patterns.some(pattern => pattern.test(text))) || null;
}

const CHARACTER_MATCHERS = [
  { id: 'aisha', label: 'Aisha Motsepe', patterns: [/\baisha\b/i, /\bmotsepe\b/i, /\bcco\b/i, /\bchief creative\b/i] },
  { id: 'leah', label: 'Leah Mokoena', patterns: [/\bleah\b/i, /\bmokoena\b/i, /\btrend analyst\b/i, /\bcontent intelligence\b/i] },
  { id: 'claudia', label: 'Claudia Naidoo', patterns: [/\bclaudia\b/i, /\bnaidoo\b/i, /\bclient systems\b/i, /\boperations\b/i] },
  { id: 'grok', label: 'Gerhard Kroukamp', patterns: [/\bgrok\b/i, /\bgerhard\b/i, /\bkroukamp\b/i, /\bautomation\b/i] },
  { id: 'vanya', label: 'Vanya Khumalo', patterns: [/\bvanya\b/i, /\bkhumalo\b/i, /\bpeople ops\b/i, /\bhr\b/i, /\btalent\b/i] }
];

const LOCATION_MATCHERS = [
  { id: 'rooftop_jhb', label: 'JHB Rooftop', patterns: [/\bsandton\b.*\brooftop\b/i, /\brooftop\b.*\bsandton\b/i, /\bjhb\b.*\brooftop\b/i, /\bjoburg\b.*\brooftop\b/i, /\bskyline\b/i] },
  { id: 'cafe_braam', label: 'Cafe - Braamfontein', patterns: [/\bbraamfontein\b.*\bcaf[eé]\b/i, /\bcaf[eé]\b.*\bbraamfontein\b/i, /\bbraam\b.*\bcaf[eé]\b/i] },
  { id: 'cafe_rosebank', label: 'Cafe - Rosebank', patterns: [/\brosebank\b.*\bcaf[eé]\b/i, /\bcaf[eé]\b.*\brosebank\b/i] },
  { id: 'keyes', label: 'Keyes Design Corridor', patterns: [/\bkeyes\b/i, /\bart mile\b/i, /\bgallery corridor\b/i] },
  { id: 'sandton_lobby', label: 'Sandton Hotel Lobby', patterns: [/\bsandton\b.*\blobby\b/i, /\bhotel lobby\b/i, /\bpremium lobby\b/i] },
  { id: 'maboneng', label: 'Maboneng Precinct', patterns: [/\bmaboneng\b/i, /\bart district\b/i] },
  { id: 'street_jhb', label: 'City Street (JHB CBD)', patterns: [/\bcbd\b/i, /\bjoburg street\b/i, /\bjohannesburg street\b/i, /\bstreet\b/i] },
  { id: 'studio_desk', label: 'Studio / Clean Desk', patterns: [/\bstudio\b/i, /\bclean desk\b/i, /\bdesk\b/i] },
  { id: 'melrose_arch_evening', label: 'Melrose Arch evening', patterns: [/\bmelrose arch\b/i] },
  { id: 'soweto_corner', label: 'Soweto street corner', patterns: [/\bsoweto\b/i] },
  { id: 'cape_town_waterfront', label: 'Cape Town V&A Waterfront', patterns: [/\bv&a\b/i, /\bwaterfront\b/i, /\bcape town\b/i] },
  { id: 'clifton_blue_hour', label: 'Clifton beach at blue hour', patterns: [/\bclifton\b/i, /\bbeach\b/i] },
  { id: 'dubai_financial_canyon', label: 'Dubai financial district glass canyon', patterns: [/\bdubai\b/i, /\bglass canyon\b/i] },
  { id: 'lagos_island_rooftop', label: 'Lagos Island rooftop', patterns: [/\blagos\b.*\brooftop\b/i, /\brooftop\b.*\blagos\b/i] },
  { id: 'tokyo_neon_corridor', label: 'Tokyo neon corridor', patterns: [/\btokyo\b/i, /\bneon\b/i] },
  { id: 'studio_white_cove', label: 'All-white infinity cove', patterns: [/\binfinity cove\b/i, /\bwhite cove\b/i] },
  { id: 'studio_black_void', label: 'All-black void studio', patterns: [/\bblack void\b/i, /\bvoid studio\b/i] },
  { id: 'grey_fog_float', label: 'Floating in soft grey fog (no ground visible)', patterns: [/\bfog\b/i, /\bfloating\b/i] },
  { id: 'savanna_tall_grass', label: 'Standing in tall golden grass (chest height, African savanna)', patterns: [/\btall grass\b/i, /\bsavanna\b/i, /\bgolden grass\b/i] },
  { id: 'city_rain_street', label: 'Standing in rain on city street', patterns: [/\brain\b/i, /\bwet street\b/i] },
  { id: 'hotel_suite_window', label: 'Luxury hotel suite - bed and window light', patterns: [/\bhotel suite\b/i, /\bsuite\b/i, /\bwindow light\b/i] },
  { id: 'art_gallery_white', label: 'Art gallery - white walls and spotlight', patterns: [/\bart gallery\b/i, /\bwhite walls\b/i, /\bspotlight\b/i] }
];

const LIGHTING_MATCHERS = [
  { id: 'golden_pm', label: 'Golden Hour (PM)', patterns: [/\bgolden hour\b/i, /\bsunset\b/i, /\bevening gold\b/i, /\bsundown\b/i] },
  { id: 'golden_am', label: 'Golden Hour (AM)', patterns: [/\bdawn\b/i, /\bsunrise\b/i, /\bmorning golden\b/i] },
  { id: 'morning', label: 'Morning Light', patterns: [/\bmorning\b/i, /\bsoft morning\b/i] },
  { id: 'late_afternoon', label: 'Late Afternoon', patterns: [/\bafternoon\b/i, /\blate day\b/i, /\bslant light\b/i] },
  { id: 'midday', label: 'Midday / Overcast', patterns: [/\bovercast\b/i, /\bcloudy\b/i, /\bmidday\b/i, /\bnoon\b/i] },
  { id: 'blue_hour', label: 'Blue Hour / Dusk', patterns: [/\bblue hour\b/i, /\bdusk\b/i, /\bnight\b/i, /\bafter[- ]?hours\b/i] },
  { id: 'indoor_artificial', label: 'Indoor Artificial (Studio)', patterns: [/\bstudio light\b/i, /\bartificial\b/i, /\bflash\b/i, /\bgel\b/i] },
  { id: 'indoor_day', label: 'Indoor Daylight', patterns: [/\bindoor daylight\b/i, /\bwindow daylight\b/i, /\bwindow-led\b/i] }
];

const MOOD_MATCHERS = [
  { id: 'confident', label: 'Confident / Assured', patterns: [/\bpower\b/i, /\bcommand\b/i, /\bauthority\b/i, /\bconfident\b/i, /\bwinning\b/i, /\bvictorious\b/i] },
  { id: 'sharp', label: 'Sharp / Focused', patterns: [/\beditorial\b/i, /\bfocused\b/i, /\bsharp\b/i, /\bprecise\b/i] },
  { id: 'soft', label: 'Soft / Relaxed', patterns: [/\bsoft\b/i, /\brelaxed\b/i, /\bcasual\b/i, /\bease\b/i] },
  { id: 'pensive', label: 'Pensive / Thoughtful', patterns: [/\bintrospective\b/i, /\bquiet\b/i, /\bthinking\b/i, /\btired\b/i, /\breflective\b/i] },
  { id: 'candid', label: 'Candid / Real', patterns: [/\bcandid\b/i, /\breal\b/i, /\bdocumentary\b/i, /\bnatural\b/i] },
  { id: 'in_motion', label: 'In Motion / Transitional', patterns: [/\bmovement\b/i, /\bmoving\b/i, /\btransition\b/i, /\bleaving\b/i, /\barriving\b/i] },
  { id: 'composed', label: 'Composed / Premium', patterns: [/\bpremium\b/i, /\bcomposed\b/i, /\bluxury\b/i, /\bpolished\b/i] }
];

const CAMPAIGN_MATCHERS = [
  { id: 'c1', label: 'The Monday Brief', patterns: [/\bmonday brief\b/i] },
  { id: 'c2', label: 'City to Desk', patterns: [/\bcity to desk\b/i] },
  { id: 'c3', label: 'Quiet Infrastructure', patterns: [/\bquiet infrastructure\b/i] },
  { id: 'c4', label: 'People Behind The Studio', patterns: [/\bpeople behind\b/i, /\bpeople ops\b/i, /\bculture\b/i] },
  { id: 'c5', label: 'Image Pressure', patterns: [/\bimage pressure\b/i, /\beditorial campaign\b/i, /\bspring campaign\b/i, /\bspring\b/i] },
  { id: 'c6', label: 'Build → Ship → Learn', patterns: [/\bbuild\b.*\bship\b.*\blearn\b/i, /\bship\b.*\blearn\b/i] }
];

const ACTION_MATCHERS = [
  { action: 'Walking toward camera, direct look - approach', patterns: [/\bwalking toward\b/i, /\bapproach\b/i, /\barriving\b/i] },
  { action: 'Walking away from camera, looking back - departure', patterns: [/\bwalking away\b/i, /\bleaving\b/i, /\bdeparture\b/i, /\bexit\b/i] },
  { action: 'Seated cafe, hands around cup - focused relaxation', patterns: [/\bsitting\b/i, /\bseated\b/i, /\bcafe\b.*\bcup\b/i] },
  { action: 'Seated at desk, looking up at camera - workspace authority', patterns: [/\bdesk\b/i, /\bworkspace\b/i, /\bworkstation\b/i] },
  { action: 'Mid-stride, one foot forward - arriving', patterns: [/\bmid[- ]?stride\b/i, /\bstreet\b/i, /\bwalk\b/i] },
  { action: 'Direct gaze, standing, full stillness - authority', patterns: [/\bdirect gaze\b/i, /\bstanding\b/i, /\bauthority\b/i, /\bpower\b/i] },
  { action: 'Turning to face camera from profile - the reveal', patterns: [/\breveal\b/i, /\bturning\b/i, /\bturn\b/i] },
  { action: 'Looking off-frame, something caught attention - curiosity', patterns: [/\boff[- ]?frame\b/i, /\bcuriosity\b/i, /\bcaught attention\b/i] },
  { action: 'Adjusting collar or sleeve - garment focus', patterns: [/\badjusting\b/i, /\bcollar\b/i, /\bsleeve\b/i, /\bgarment\b/i] },
  { action: 'Full body, hands at sides - fashion editorial standing', patterns: [/\bfashion\b/i, /\bfull body\b/i] }
];

const CAMERA_DISTANCE_MATCHERS = [
  { id: 'tight portrait', patterns: [/\btight\b/i, /\bclose[- ]?up\b/i, /\bface\b/i] },
  { id: 'medium portrait', patterns: [/\bmedium\b/i, /\bportrait\b/i] },
  { id: 'three-quarter body', patterns: [/\b3\/4\b/i, /\bthree[- ]?quarter\b/i] },
  { id: 'full body environmental', patterns: [/\bfull body\b/i, /\benvironmental\b/i, /\bwide\b/i] },
  { id: 'waist-up candid', patterns: [/\bwaist[- ]?up\b/i] }
];

const MOVEMENT_MATCHERS = [
  { id: 'walking naturally', patterns: [/\bwalk/i, /\bstride\b/i, /\bmove/i] },
  { id: 'turning through available light', patterns: [/\bturn/i, /\breveal\b/i, /\blight\b/i] },
  { id: 'hands adjusting jacket', patterns: [/\badjust/i, /\bjacket\b/i, /\bsleeve\b/i] },
  { id: 'looking off then back', patterns: [/\boff[- ]?frame\b/i, /\blooking back\b/i] },
  { id: 'still but alive', patterns: [/\bstill\b/i, /\bquiet\b/i, /\bcalm\b/i] }
];

const PROPS_MATCHERS = [
  { id: 'phone in hand', patterns: [/\bphone\b/i] },
  { id: 'coffee cup', patterns: [/\bcoffee\b/i, /\bcup\b/i] },
  { id: 'notebook', patterns: [/\bnotebook\b/i, /\bnotes\b/i] },
  { id: 'small tote bag', patterns: [/\btote\b/i, /\bbag\b/i] },
  { id: 'car keys', patterns: [/\bcar keys\b/i, /\bkeys\b/i] },
  { id: 'laptop sleeve', patterns: [/\blaptop\b/i] }
];

const NUMBER_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

function extractShotCount(text) {
  const numeric = text.match(/\b([1-9]|1[0-2])\s*(?:shots?|frames?|images?)\b/i);
  if (numeric) return Number(numeric[1]);
  const word = Object.keys(NUMBER_WORDS).find(key => new RegExp(`\\b${key}\\s+(shots?|frames?|images?)\\b`, 'i').test(text));
  return word ? NUMBER_WORDS[word] : null;
}

function customLocationFromBrief(rawBrief, knownLocation) {
  if (knownLocation) return null;
  const brief = cleanText(rawBrief);
  const match = brief.match(/\b(?:in|at|inside|on)\s+([^,.]+?)(?:\s+(?:at|during|with|for|wearing|walking|sitting|standing)\b|[,.]|$)/i);
  if (!match) return null;
  const candidate = cleanText(match[1]);
  if (!candidate || candidate.length < 4) return null;
  if (/^(golden hour|night|morning|afternoon|the shot|a shot)$/i.test(candidate)) return null;
  return {
    locationId: `custom_location_${slug(candidate)}`,
    customLocationText: candidate,
    locationName: candidate
  };
}

function matchedField(label, value, text) {
  return { label, value, text };
}

function parseBriefRules(brief, currentCharacter = '') {
  const raw = cleanText(brief);
  const text = raw.toLowerCase();
  const fields = {};
  const matched = [];
  const unspecified = [];

  const character = firstMatch(raw, CHARACTER_MATCHERS) || CHARACTER_MATCHERS.find(item => item.id === cleanText(currentCharacter).toLowerCase());
  if (character) {
    fields.characterId = character.id;
    matched.push(matchedField('Character', character.id, character.label));
  } else {
    unspecified.push('character');
  }

  const location = firstMatch(raw, LOCATION_MATCHERS);
  if (location) {
    fields.locationId = location.id;
    fields.locationName = location.label;
    matched.push(matchedField('Location', location.id, location.label));
  } else {
    const custom = customLocationFromBrief(raw, location);
    if (custom) {
      Object.assign(fields, custom);
      matched.push(matchedField('Location', custom.locationId, custom.locationName));
    } else {
      unspecified.push('location');
    }
  }

  const lighting = firstMatch(raw, LIGHTING_MATCHERS);
  if (lighting) {
    fields.lighting = lighting.id;
    matched.push(matchedField('Lighting', lighting.id, lighting.label));
  } else {
    unspecified.push('lighting');
  }

  const action = firstMatch(raw, ACTION_MATCHERS);
  if (action) {
    fields.shotAction = action.action;
    matched.push(matchedField('Action', action.action, action.action));
  } else if (fields.locationId === 'rooftop_jhb') {
    fields.shotAction = 'Direct gaze, standing, full stillness - authority';
    matched.push(matchedField('Action', fields.shotAction, 'Rooftop authority stance'));
  } else {
    unspecified.push('action');
  }

  const mood = firstMatch(raw, MOOD_MATCHERS);
  if (mood) {
    fields.moodId = mood.id;
    matched.push(matchedField('Mood', mood.id, mood.label));
  } else {
    unspecified.push('mood');
  }

  const cameraDistance = firstMatch(raw, CAMERA_DISTANCE_MATCHERS);
  if (cameraDistance) {
    fields.cameraDistance = cameraDistance.id;
    matched.push(matchedField('Camera distance', cameraDistance.id, cameraDistance.id));
  } else if (fields.locationId === 'rooftop_jhb') {
    fields.cameraDistance = 'three-quarter body';
    matched.push(matchedField('Camera distance', fields.cameraDistance, 'Rooftop default'));
  } else {
    unspecified.push('cameraDistance');
  }

  const movement = firstMatch(raw, MOVEMENT_MATCHERS);
  if (movement) {
    fields.movement = movement.id;
    matched.push(matchedField('Movement', movement.id, movement.id));
  }

  const props = firstMatch(raw, PROPS_MATCHERS);
  if (props) {
    fields.props = props.id;
    matched.push(matchedField('Props', props.id, props.id));
  }

  const campaign = firstMatch(raw, CAMPAIGN_MATCHERS);
  if (campaign) {
    fields.campaignId = campaign.id;
    matched.push(matchedField('Campaign', campaign.id, campaign.label));
  }

  if (includesAny(text, ['cinematic', 'film still', 'movie frame', 'music video'])) {
    fields.cameraStyle = 'cinematic';
    matched.push(matchedField('Camera style', 'cinematic', 'Cinematic / Wide Lens'));
  }

  const targetShotCount = extractShotCount(raw);
  if (targetShotCount) {
    matched.push(matchedField('Shot count', targetShotCount, `${targetShotCount} shot${targetShotCount === 1 ? '' : 's'}`));
  }

  const weights = {
    characterId: 0.18,
    locationId: 0.22,
    lighting: 0.16,
    shotAction: 0.16,
    moodId: 0.12,
    cameraDistance: 0.08,
    campaignId: 0.05
  };
  let confidence = Object.entries(weights).reduce((total, [key, weight]) => total + (fields[key] ? weight : 0), 0);
  if (targetShotCount) confidence += 0.03;
  confidence = Math.min(0.95, Number(confidence.toFixed(2)));

  const summaryParts = [
    character?.label,
    fields.locationName || fields.customLocationText,
    lighting?.label,
    mood?.label,
    fields.cameraDistance
  ].filter(Boolean);

  return {
    confidence,
    summary: summaryParts.length ? `Set: ${summaryParts.join(' · ')}` : 'Brief read, but no strong shot settings were found yet.',
    fields,
    unspecified,
    targetShotCount,
    matched
  };
}

function extractJsonObject(text) {
  const raw = cleanText(text);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}

function normalizeClaudeParsed(parsed, rules) {
  if (!parsed || typeof parsed !== 'object') return null;
  const fields = parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : parsed;
  const merged = {
    ...rules,
    fields: { ...rules.fields },
    matched: Array.isArray(rules.matched) ? rules.matched.slice() : [],
    unspecified: Array.isArray(rules.unspecified) ? rules.unspecified.slice() : []
  };
  [
    'characterId',
    'locationId',
    'customLocationText',
    'locationName',
    'lighting',
    'shotAction',
    'moodId',
    'cameraDistance',
    'movement',
    'props',
    'campaignId',
    'cameraStyle',
    'sceneOverride'
  ].forEach(key => {
    if (fields[key] != null && cleanText(fields[key])) merged.fields[key] = cleanText(fields[key], '').slice(0, key === 'sceneOverride' ? 500 : 240);
  });
  if (parsed.targetShotCount && Number.isFinite(Number(parsed.targetShotCount))) {
    merged.targetShotCount = Math.max(1, Math.min(12, Number(parsed.targetShotCount)));
  }
  if (parsed.summary) merged.summary = cleanText(parsed.summary).slice(0, 220);
  if (Array.isArray(parsed.unspecified)) merged.unspecified = parsed.unspecified.map(item => cleanText(item)).filter(Boolean).slice(0, 10);
  merged.confidence = Math.max(rules.confidence || 0, Math.min(0.95, Number(parsed.confidence) || 0.72));
  return merged;
}

async function enhanceWithClaude(brief, rules, currentCharacter) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || rules.confidence >= 0.7) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7500);
  const payload = {
    model: process.env.ANTHROPIC_DIRECTOR_MODEL || 'claude-3-5-haiku-latest',
    max_tokens: 800,
    temperature: 0.1,
    system: 'You parse one-sentence creative director briefs into a safe JSON shot-builder patch. Return only JSON. Do not invent provider routes or generation calls.',
    messages: [{
      role: 'user',
      content: [
        'Parse this brief for a vanilla JS AI image shot builder.',
        'Return JSON only in this shape:',
        '{"confidence":0.0,"summary":"Set: ...","fields":{"characterId":"","locationId":"","customLocationText":"","lighting":"","shotAction":"","moodId":"","cameraDistance":"","movement":"","props":"","campaignId":"","cameraStyle":"","sceneOverride":""},"unspecified":["field"],"targetShotCount":null}',
        'Allowed characterId: aisha, leah, claudia, grok, vanya.',
        'Allowed lighting: golden_pm, golden_am, morning, late_afternoon, midday, blue_hour, indoor_day, indoor_artificial.',
        'Allowed moodId: sharp, composed, candid, pensive, confident, in_motion, soft.',
        'Allowed cameraDistance: tight portrait, medium portrait, three-quarter body, full body environmental, waist-up candid.',
        'Use customLocationText only if no known location ID fits.',
        '',
        `Current character: ${cleanText(currentCharacter || '')}`,
        `Brief: ${brief}`
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
    const text = Array.isArray(data.content) ? data.content.map(part => part?.text || '').join('\n') : '';
    return normalizeClaudeParsed(extractJsonObject(text), rules);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/parse-brief', async (req, res) => {
  const body = req.body || {};
  const brief = cleanText(body.brief);
  const currentCharacter = cleanText(body.character);
  if (!brief) {
    return res.status(400).json({ ok: false, error: 'brief required' });
  }
  const rules = parseBriefRules(brief, currentCharacter);
  const enhanced = await enhanceWithClaude(brief, rules, currentCharacter);
  res.json({
    ok: true,
    schemaVersion: SCHEMA_VERSION,
    source: enhanced ? 'rules+claude' : 'rules',
    parsedShot: enhanced || rules
  });
});

module.exports = {
  router,
  parseBriefRules
};
