const { CHARACTER_IDS, CHARACTER_PROFILES } = require('./characters');
const { normalizeCharacterContinuityState } = require('./continuity');

const DEFAULT_PRESENCE = {
  aisha: 'active',
  leah: 'quiet',
  claudia: 'quiet',
  grok: 'quiet',
  vanya: 'active'
};

const DEFAULT_MOOD = {
  aisha: 'composed',
  leah: 'sharp',
  claudia: 'focused',
  grok: 'diagnostic',
  vanya: 'warm'
};

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return value;
  }
}

function clamp01(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function createDefaultCharacterState(id) {
  return {
    presence: DEFAULT_PRESENCE[id] || 'unknown',
    mood: DEFAULT_MOOD[id] || 'steady',
    attention: id === 'aisha' || id === 'vanya' ? 0.78 : 0.56,
    trustTowardUser: 0.64,
    irritation: 0.12,
    warmth: id === 'vanya' ? 0.72 : id === 'grok' ? 0.28 : 0.52,
    energy: id === 'leah' ? 0.76 : id === 'claudia' ? 0.62 : 0.68,
    currentIntent: 'listening',
    lastSpokeAt: '',
    shortTermMemorySummary: ''
  };
}

function normalizeCharacterState(id, input = {}) {
  const base = createDefaultCharacterState(id);
  const next = input && typeof input === 'object' ? input : {};
  const presence = ['active', 'quiet', 'away', 'unknown'].includes(String(next.presence || '').toLowerCase())
    ? String(next.presence || '').toLowerCase()
    : base.presence;
  return {
    ...base,
    ...next,
    presence,
    mood: String(next.mood || base.mood),
    attention: clamp01(next.attention, base.attention),
    trustTowardUser: clamp01(next.trustTowardUser, base.trustTowardUser),
    irritation: clamp01(next.irritation, base.irritation),
    warmth: clamp01(next.warmth, base.warmth),
    energy: clamp01(next.energy, base.energy),
    currentIntent: String(next.currentIntent || base.currentIntent),
    lastSpokeAt: String(next.lastSpokeAt || ''),
    shortTermMemorySummary: String(next.shortTermMemorySummary || '')
  };
}

function normalizePresenceStatus(characterStates = {}) {
  return Object.fromEntries(
    CHARACTER_IDS.map(id => [id, normalizeCharacterState(id, characterStates[id]).presence])
  );
}

function createRoomIntelligenceState({
  threadId = '',
  roomId = '',
  previous = null,
  messages = []
} = {}) {
  const prev = previous && typeof previous === 'object' ? clone(previous) : {};
  const prevCharacters = prev.characterStates && typeof prev.characterStates === 'object' ? prev.characterStates : {};
  const characterStates = Object.fromEntries(
    CHARACTER_IDS.map(id => [id, normalizeCharacterState(id, prevCharacters[id])])
  );
  const knownPresenceStatus = normalizePresenceStatus(characterStates);
  const activeCharacterIds = CHARACTER_IDS.filter(id => knownPresenceStatus[id] === 'active');
  const inactiveCharacterIds = CHARACTER_IDS.filter(id => ['away', 'unknown'].includes(knownPresenceStatus[id]));
  const recentTurns = safeArray(prev.recentCharacterTurns).slice(-8);
  const lastKnownSpeaker = [...(Array.isArray(messages) ? messages : [])]
    .reverse()
    .find(item => CHARACTER_PROFILES[String(item?.speakerId || item?.speaker_id || '').toLowerCase()]);
  const characterContinuityV0 = normalizeCharacterContinuityState(prev.characterContinuityV0, {
    roomId: String(roomId || prev.roomId || threadId || 'open-room'),
    threadId: String(threadId || prev.threadId || '')
  });

  return {
    schemaVersion: 'studio-pulse.room-intelligence.v0',
    roomId: String(roomId || prev.roomId || threadId || 'open-room'),
    threadId: String(threadId || prev.threadId || ''),
    activeCharacterIds,
    inactiveCharacterIds,
    roomMood: String(prev.roomMood || 'steady'),
    currentTopic: String(prev.currentTopic || ''),
    unresolvedQuestions: safeArray(prev.unresolvedQuestions).slice(-6),
    recentTension: clamp01(prev.recentTension, 0.12),
    lastSpeakerId: String(prev.lastSpeakerId || lastKnownSpeaker?.speakerId || lastKnownSpeaker?.speaker_id || ''),
    recentCharacterTurns: recentTurns,
    knownPresenceStatus,
    characterStates,
    characterContinuityV0,
    updatedAt: String(prev.updatedAt || '')
  };
}

function presenceGroups(roomState = {}) {
  const status = roomState.knownPresenceStatus || {};
  const groups = {
    active: [],
    quiet: [],
    away: [],
    unknown: []
  };
  CHARACTER_IDS.forEach(id => {
    const presence = ['active', 'quiet', 'away', 'unknown'].includes(String(status[id] || '').toLowerCase())
      ? String(status[id] || '').toLowerCase()
      : 'unknown';
    groups[presence].push(id);
  });
  return groups;
}

module.exports = {
  DEFAULT_PRESENCE,
  createDefaultCharacterState,
  normalizeCharacterState,
  createRoomIntelligenceState,
  presenceGroups,
  clamp01
};
