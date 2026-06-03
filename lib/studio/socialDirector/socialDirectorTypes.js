const CHARACTER_IDS = Object.freeze(['aisha', 'vanya', 'leah', 'claudia', 'grok']);
const ROOM_MOODS = Object.freeze(['warm', 'playful', 'tense', 'focused', 'chaotic', 'quiet', 'sharp', 'cooling']);
const RESPONSE_MODES = Object.freeze(['single', 'small_exchange', 'open_floor', 'aisha_takeover', 'room_check']);
const SPEAKER_ROLES = Object.freeze(['primary', 'side', 'closer', 'called_in']);
const SOCIAL_ROOM_MOVES = Object.freeze(['anchor', 'challenge', 'redirect', 'defend', 'deflect', 'cool', 'escalate', 'observe']);
const SOCIAL_STANCES = Object.freeze(['dominant', 'defensive', 'allied', 'dismissive', 'curious', 'silent']);
const SOCIAL_INTERRUPTION_KINDS = Object.freeze(['status-cut', 'continuity-correction']);
const VISIBLE_STATES = Object.freeze([
  'Anchoring',
  'Reading',
  'Reading the room',
  'Watching',
  'Tracking',
  'Tracking failure',
  'Tracking next steps',
  'Holding critique',
  'Ready',
  'Cooling',
  'Protective',
  'Aligned',
  'Resisting'
]);

const CHARACTER_ALIASES = Object.freeze({
  aisha: 'aisha',
  motsepe: 'aisha',
  vanya: 'vanya',
  khumalo: 'vanya',
  leah: 'leah',
  mokoena: 'leah',
  claudia: 'claudia',
  naidoo: 'claudia',
  grok: 'grok',
  gerhard: 'grok'
});

const BANNED_VISIBLE_PHRASES = Object.freeze([
  'I hear',
  'I will keep this human',
  'degraded mode',
  'fallback',
  'I need the object',
  'Give me the thing',
  'Say the thing plainly',
  'if that is the object',
  'on that:',
  'I agree with'
]);

const RAW_INTERNAL_MARKERS = Object.freeze([
  'exchangeContextV06',
  'selectedSpeakers',
  'addendumConstraint',
  'relationshipSummaries',
  'repairNeeded',
  'pulseReason',
  'debug',
  'aishaDiagnostics',
  'projectContext',
  'activeSpeakerId',
  'schemaVersion',
  'validationFallbackReason'
]);

function text(value = '') {
  return String(value == null ? '' : value).trim();
}

function compactText(value = '', max = 500) {
  return text(value).replace(/\s+/g, ' ').slice(0, max).trim();
}

function normalizeSpeakerId(value = '') {
  const raw = text(value).toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(/\s+/)[0] || '';
  return CHARACTER_ALIASES[raw] || (CHARACTER_IDS.includes(raw) ? raw : '');
}

function directAddressTarget(message = '') {
  const normalized = ` ${text(message).toLowerCase()} `;
  for (const id of CHARACTER_IDS) {
    const names = [id, ...Object.entries(CHARACTER_ALIASES).filter(([, target]) => target === id).map(([alias]) => alias)];
    if (names.some(name => new RegExp(`(^|[^a-z])@?${name}([^a-z]|$)`, 'i').test(normalized))) return id;
  }
  return '';
}

function explicitEveryoneRequested(message = '') {
  return /\b(everyone|everybody|all of you|you all|y'all|whole room|full room|all five|everyone come online|hear from everyone)\b/i.test(text(message));
}

function openFloorRequested(message = '', body = {}) {
  return body.openFloor === true
    || body.openFloorMode === true
    || /\b(open floor|hear from the room|whole room perspective|room perspective)\b/i.test(text(message));
}

function sentenceCount(value = '') {
  const clean = compactText(value, 2000);
  if (!clean) return 0;
  return clean.split(/[.!?]+(?:\s+|$)/).map(item => item.trim()).filter(Boolean).length || 1;
}

function wordCount(value = '') {
  return compactText(value, 2000).split(/\s+/).filter(Boolean).length;
}

function truncateSentences(value = '', maxSentences = 2, maxChars = 360) {
  const clean = compactText(value, maxChars * 2);
  if (!clean) return '';
  const matches = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [clean];
  return matches.slice(0, maxSentences).join(' ').replace(/\s+/g, ' ').slice(0, maxChars).trim();
}

module.exports = {
  BANNED_VISIBLE_PHRASES,
  CHARACTER_IDS,
  RAW_INTERNAL_MARKERS,
  RESPONSE_MODES,
  ROOM_MOODS,
  SPEAKER_ROLES,
  SOCIAL_INTERRUPTION_KINDS,
  SOCIAL_ROOM_MOVES,
  SOCIAL_STANCES,
  VISIBLE_STATES,
  compactText,
  directAddressTarget,
  explicitEveryoneRequested,
  normalizeSpeakerId,
  openFloorRequested,
  sentenceCount,
  text,
  truncateSentences,
  wordCount
};
