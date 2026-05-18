const { CHARACTER_IDS, characterDisplayName } = require('./characters');

const USER_ENTITY_ID = 'user';
const SCHEMA_VERSION = 'studio-pulse.character-continuity.v0';
const MEMORY_CAPS = Object.freeze({
  stableTraits: 12,
  preferences: 12,
  dislikes: 12,
  runningJokes: 8,
  projectAttachments: 8,
  recentEmotionalNotes: 10,
  continuityEvents: 24,
  recentContinuityEventsForAisha: 12,
  lastSocialImpulses: 10,
  relationshipDeltas: 8,
  relationshipSummariesForAisha: 5,
  unresolvedSocialThreads: 8,
  suppressedSpeakers: 5,
  pulseReason: 120,
  pulseTopicAnchor: 80,
  expressivePulseSummary: 5,
  specialistGravitySummary: 3
});

const EXPRESSIVE_SCHEMA_VERSION = 'studio-pulse.expressive-habitat.v0.5';
const CANONICAL_PULSE_LABELS = Object.freeze({
  anchoring: 'Anchoring',
  reading: 'Reading',
  tracking: 'Tracking',
  'holding-critique': 'Holding critique',
  ready: 'Ready',
  cooling: 'Cooling',
  protective: 'Protective',
  aligned: 'Aligned',
  resisting: 'Resisting',
  watching: 'Watching'
});
const PULSE_DISPLAY_LABELS = Object.freeze({
  ...CANONICAL_PULSE_LABELS,
  'reading-the-room': 'Reading the room',
  'tracking-failure': 'Tracking failure',
  'tracking-next-steps': 'Tracking next steps',
  'cooling-off': 'Cooling off'
});
const CONTEXTUAL_PULSE_TO_CANONICAL = Object.freeze({
  'reading-the-room': 'reading',
  'tracking-failure': 'tracking',
  'tracking-next-steps': 'tracking',
  'cooling-off': 'cooling'
});
const ROOM_MOODS = new Set(['neutral', 'warm', 'elevated', 'tense', 'cooling']);
const AISHA_AUTHORITY_STATES = new Set(['anchoring', 'watching', 'ready', 'protective', 'takeover']);
const SPECIALIST_GRAVITY_IDS = ['leah', 'claudia', 'grok'];
const SPECIALIST_GRAVITY_CAP = 3;
const VANYA_LEAD_STATUS = 'lead-room-voice';
const EXPRESSION_LEVEL_LABELS = Object.freeze({
  0: 'no-visible-change',
  1: 'internal-shift',
  2: 'pulse-shift',
  3: 'room-mood-shift',
  4: 'posture-chip-shift',
  5: 'side-comment-disabled',
  6: 'full-response'
});

const CHARACTER_MEMORY_SEEDS = Object.freeze({
  aisha: {
    seedTraits: ['room lead', 'standards keeper'],
    seedPreferences: ['clear asks', 'earned confidence'],
    seedDislikes: ['vague performance', 'generic assistant tone']
  },
  leah: {
    seedTraits: ['taste reader', 'cultural critic'],
    seedPreferences: ['specific references', 'fresh work'],
    seedDislikes: ['bland praise', 'trend cosplay']
  },
  claudia: {
    seedTraits: ['operations lead', 'delivery stabilizer'],
    seedPreferences: ['owners', 'deadlines', 'clean scope'],
    seedDislikes: ['drift', 'unowned work']
  },
  grok: {
    seedTraits: ['diagnostic pattern reader', 'systems gremlin'],
    seedPreferences: ['repeatable fixes', 'clean failure signals'],
    seedDislikes: ['fake fixes', 'mystery meat debugging']
  },
  vanya: {
    seedTraits: ['social pulse', 'morale reader'],
    seedPreferences: ['human warmth', 'honest energy'],
    seedDislikes: ['flattened tone', 'performative care']
  }
});

const DEFAULT_PULSE_BY_CHARACTER = Object.freeze({
  aisha: {
    currentPulse: 'Anchoring',
    visibleLabel: 'Anchoring',
    pulseReason: 'room anchor',
    topicAnchor: 'room'
  },
  vanya: {
    currentPulse: 'Reading',
    visibleLabel: 'Reading the room',
    pulseReason: 'lead social voice',
    topicAnchor: 'room'
  },
  leah: {
    currentPulse: 'Watching',
    visibleLabel: 'Watching',
    pulseReason: 'taste signal quiet',
    topicAnchor: 'room'
  },
  claudia: {
    currentPulse: 'Tracking',
    visibleLabel: 'Tracking next steps',
    pulseReason: 'delivery signal quiet',
    topicAnchor: 'room'
  },
  grok: {
    currentPulse: 'Watching',
    visibleLabel: 'Watching',
    pulseReason: 'diagnostic signal quiet',
    topicAnchor: 'room'
  }
});

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

function clampInt(value, fallback = 0, min = 0, max = 999) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function compact(value = '', max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function pulseKey(value = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  return raw
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function canonicalPulseKey(value = '') {
  const key = pulseKey(value);
  if (CANONICAL_PULSE_LABELS[key]) return key;
  return CONTEXTUAL_PULSE_TO_CANONICAL[key] || '';
}

function safePulseLabel(value = '', fallback = 'Watching') {
  const key = canonicalPulseKey(value);
  const fallbackKey = canonicalPulseKey(fallback) || 'watching';
  return CANONICAL_PULSE_LABELS[key] || CANONICAL_PULSE_LABELS[fallbackKey] || 'Watching';
}

function safePulseDisplayLabel(value = '', fallback = 'Watching') {
  const key = pulseKey(value);
  if (PULSE_DISPLAY_LABELS[key]) return PULSE_DISPLAY_LABELS[key];
  return safePulseLabel(fallback);
}

function roomMoodLabel(value = '') {
  const mood = String(value || '').toLowerCase();
  if (mood === 'warm') return 'Warm';
  if (mood === 'elevated') return 'Elevated';
  if (mood === 'tense') return 'Tense';
  if (mood === 'cooling') return 'Cooling';
  return 'Neutral';
}

function memoryKey(value = '', canonicalAliases = {}) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const key = raw
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return canonicalAliases[key] || key;
}

function normalizeMemoryList(items, options = {}) {
  const {
    maxItems = 12,
    maxItemLength = 120,
    canonicalAliases = {},
    keepLast = false
  } = options;
  const source = Array.isArray(items) ? items : [];
  const normalized = [];
  const seen = new Set();
  const ordered = keepLast ? [...source].reverse() : source;
  ordered.forEach(item => {
    if (typeof item !== 'string') return;
    const text = compact(item, maxItemLength);
    if (!text) return;
    const key = memoryKey(text, canonicalAliases);
    if (!key || seen.has(key)) return;
    seen.add(key);
    normalized.push(text);
  });
  const limit = Math.max(0, Number(maxItems) || 0);
  if (keepLast) return normalized.slice(0, limit).reverse();
  return normalized.slice(0, limit);
}

function safeArray(value, limit = 12) {
  return (Array.isArray(value) ? value : [])
    .map(item => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean)
    .slice(-limit);
}

function seedKeySet(items = []) {
  return new Set(normalizeMemoryList(items, { maxItems: 64 }).map(item => memoryKey(item)));
}

function learnedWithoutSeeds(items = [], seedItems = [], options = {}) {
  const seedKeys = seedKeySet(seedItems);
  return normalizeMemoryList(items, { maxItems: options.maxItems || 24, maxItemLength: options.maxItemLength || 120 })
    .filter(item => !seedKeys.has(memoryKey(item)));
}

function relationshipKey(fromCharacterId = '', toEntityId = '') {
  return `${String(fromCharacterId || '').toLowerCase()}__${String(toEntityId || '').toLowerCase()}`;
}

function createDefaultCharacterMemory(characterId = '') {
  const name = characterDisplayName(characterId);
  const defaults = CHARACTER_MEMORY_SEEDS[characterId] || {};
  const seedTraits = normalizeMemoryList(defaults.seedTraits, { maxItems: MEMORY_CAPS.stableTraits });
  const seedPreferences = normalizeMemoryList(defaults.seedPreferences, { maxItems: MEMORY_CAPS.preferences });
  const seedDislikes = normalizeMemoryList(defaults.seedDislikes, { maxItems: MEMORY_CAPS.dislikes });
  return {
    characterId,
    displayName: name,
    seedTraits,
    seedPreferences,
    seedDislikes,
    learnedTraits: [],
    learnedPreferences: [],
    learnedDislikes: [],
    stableTraits: seedTraits,
    preferences: seedPreferences,
    dislikes: seedDislikes,
    runningJokes: [],
    projectAttachments: [],
    recentEmotionalNotes: []
  };
}

function normalizeCharacterMemory(characterId = '', input = {}) {
  const base = createDefaultCharacterMemory(characterId);
  const next = input && typeof input === 'object' ? input : {};
  const seedTraits = normalizeMemoryList(base.seedTraits || [], { maxItems: MEMORY_CAPS.stableTraits });
  const seedPreferences = normalizeMemoryList(base.seedPreferences || [], { maxItems: MEMORY_CAPS.preferences });
  const seedDislikes = normalizeMemoryList(base.seedDislikes || [], { maxItems: MEMORY_CAPS.dislikes });
  const learnedTraits = normalizeMemoryList([
    ...(next.learnedTraits || []),
    ...learnedWithoutSeeds(next.stableTraits || [], seedTraits, { maxItems: MEMORY_CAPS.stableTraits * 2 })
  ], { maxItems: MEMORY_CAPS.stableTraits });
  const learnedPreferences = normalizeMemoryList([
    ...(next.learnedPreferences || []),
    ...learnedWithoutSeeds(next.preferences || [], seedPreferences, { maxItems: MEMORY_CAPS.preferences * 2 })
  ], { maxItems: MEMORY_CAPS.preferences });
  const learnedDislikes = normalizeMemoryList([
    ...(next.learnedDislikes || []),
    ...learnedWithoutSeeds(next.dislikes || [], seedDislikes, { maxItems: MEMORY_CAPS.dislikes * 2 })
  ], { maxItems: MEMORY_CAPS.dislikes });
  return {
    ...base,
    ...next,
    characterId,
    displayName: String(next.displayName || base.displayName),
    seedTraits,
    seedPreferences,
    seedDislikes,
    learnedTraits,
    learnedPreferences,
    learnedDislikes,
    stableTraits: normalizeMemoryList([...seedTraits, ...learnedTraits], { maxItems: MEMORY_CAPS.stableTraits }),
    preferences: normalizeMemoryList([...seedPreferences, ...learnedPreferences], { maxItems: MEMORY_CAPS.preferences }),
    dislikes: normalizeMemoryList([...seedDislikes, ...learnedDislikes], { maxItems: MEMORY_CAPS.dislikes }),
    runningJokes: normalizeMemoryList(next.runningJokes, { maxItems: MEMORY_CAPS.runningJokes, maxItemLength: 120, keepLast: true }),
    projectAttachments: normalizeMemoryList(next.projectAttachments, { maxItems: MEMORY_CAPS.projectAttachments, maxItemLength: 160, keepLast: true }),
    recentEmotionalNotes: normalizeMemoryList(next.recentEmotionalNotes, { maxItems: MEMORY_CAPS.recentEmotionalNotes, maxItemLength: 140, keepLast: true })
  };
}

function createDefaultRelationshipState(fromCharacterId = '', toEntityId = USER_ENTITY_ID) {
  return {
    fromCharacterId,
    toEntityId,
    trust: 0.58,
    irritation: 0.12,
    warmth: fromCharacterId === 'vanya' ? 0.68 : fromCharacterId === 'grok' ? 0.28 : 0.5,
    respect: fromCharacterId === 'aisha' || fromCharacterId === 'claudia' ? 0.66 : 0.58,
    rivalry: fromCharacterId === 'leah' || fromCharacterId === 'grok' ? 0.18 : 0.08,
    protectiveness: fromCharacterId === 'vanya' || fromCharacterId === 'aisha' ? 0.42 : 0.22,
    repairNeeded: 0.08,
    skepticism: fromCharacterId === 'grok' ? 0.32 : 0.16,
    collaboration: fromCharacterId === 'claudia' || fromCharacterId === 'aisha' ? 0.58 : 0.46,
    recentPressure: 0.08,
    lastShiftReason: '',
    lastShiftAt: '',
    lastMeaningfulInteraction: ''
  };
}

function normalizeRelationshipState(input = {}, fromCharacterId = '', toEntityId = USER_ENTITY_ID) {
  const base = createDefaultRelationshipState(fromCharacterId, toEntityId);
  const next = input && typeof input === 'object' ? input : {};
  return {
    ...base,
    ...next,
    fromCharacterId: String(next.fromCharacterId || fromCharacterId || base.fromCharacterId).toLowerCase(),
    toEntityId: String(next.toEntityId || toEntityId || base.toEntityId).toLowerCase(),
    trust: clamp01(next.trust, base.trust),
    irritation: clamp01(next.irritation, base.irritation),
    warmth: clamp01(next.warmth, base.warmth),
    respect: clamp01(next.respect, base.respect),
    rivalry: clamp01(next.rivalry, base.rivalry),
    protectiveness: clamp01(next.protectiveness, base.protectiveness),
    repairNeeded: clamp01(next.repairNeeded, base.repairNeeded),
    skepticism: clamp01(next.skepticism, base.skepticism),
    collaboration: clamp01(next.collaboration, base.collaboration),
    recentPressure: clamp01(next.recentPressure, base.recentPressure),
    lastShiftReason: String(next.lastShiftReason || ''),
    lastShiftAt: String(next.lastShiftAt || ''),
    lastMeaningfulInteraction: String(next.lastMeaningfulInteraction || '')
  };
}

function seedRelationshipStates(input = {}) {
  const existing = input && typeof input === 'object' ? input : {};
  const out = {};
  CHARACTER_IDS.forEach(from => {
    const targets = [USER_ENTITY_ID, ...CHARACTER_IDS.filter(id => id !== from)];
    targets.forEach(to => {
      const key = relationshipKey(from, to);
      out[key] = normalizeRelationshipState(existing[key], from, to);
    });
  });
  return out;
}

function normalizeRoomSocialState(input = {}) {
  const next = input && typeof input === 'object' ? input : {};
  return {
    warmth: clamp01(next.warmth, 0.52),
    tension: clamp01(next.tension, 0.12),
    chaos: clamp01(next.chaos, 0.18),
    momentum: clamp01(next.momentum, 0.36),
    dominantMood: String(next.dominantMood || 'steady'),
    unresolvedSocialThreads: normalizeMemoryList(next.unresolvedSocialThreads, { maxItems: MEMORY_CAPS.unresolvedSocialThreads, maxItemLength: 100, keepLast: true }),
    currentFloorHolder: String(next.currentFloorHolder || ''),
    suppressedSpeakers: normalizeMemoryList(next.suppressedSpeakers, { maxItems: MEMORY_CAPS.suppressedSpeakers, maxItemLength: 40, keepLast: true })
  };
}

function defaultPulseState(characterId = '') {
  const id = String(characterId || '').toLowerCase();
  const base = DEFAULT_PULSE_BY_CHARACTER[id] || DEFAULT_PULSE_BY_CHARACTER.vanya;
  const currentPulse = safePulseLabel(base.currentPulse);
  return {
    characterId: id,
    currentPulse,
    pulseReason: compact(base.pulseReason || 'present in room', MEMORY_CAPS.pulseReason),
    topicAnchor: compact(base.topicAnchor || 'room', MEMORY_CAPS.pulseTopicAnchor),
    expiresAfterTurns: 0,
    visibleLabel: safePulseDisplayLabel(base.visibleLabel || currentPulse, currentPulse),
    updatedAtTurn: 0
  };
}

function normalizePulseState(characterId = '', input = {}, turnIndex = 0) {
  const base = defaultPulseState(characterId);
  const next = input && typeof input === 'object' ? input : {};
  const currentPulse = safePulseLabel(next.currentPulse || next.visibleLabel || base.currentPulse, base.currentPulse);
  const label = safePulseDisplayLabel(next.visibleLabel || (next.currentPulse ? currentPulse : base.visibleLabel) || currentPulse, currentPulse);
  return {
    ...base,
    ...next,
    characterId: String(next.characterId || characterId || base.characterId).toLowerCase(),
    currentPulse,
    pulseReason: compact(next.pulseReason || base.pulseReason, MEMORY_CAPS.pulseReason),
    topicAnchor: compact(next.topicAnchor || base.topicAnchor, MEMORY_CAPS.pulseTopicAnchor),
    expiresAfterTurns: clampInt(next.expiresAfterTurns, base.expiresAfterTurns, 0, 4),
    visibleLabel: label,
    updatedAtTurn: clampInt(next.updatedAtTurn, turnIndex, 0, 999999)
  };
}

function normalizeSpecialistGravity(input = {}) {
  const next = input && typeof input === 'object' ? input : {};
  const out = {};
  SPECIALIST_GRAVITY_IDS.forEach(id => {
    const item = next[id] && typeof next[id] === 'object' ? next[id] : {};
    out[id] = {
      characterId: id,
      value: clampInt(item.value ?? item.gravity, 0, 0, SPECIALIST_GRAVITY_CAP),
      topicAnchor: compact(item.topicAnchor || '', MEMORY_CAPS.pulseTopicAnchor),
      lastSignal: compact(item.lastSignal || '', MEMORY_CAPS.pulseReason),
      updatedAtTurn: clampInt(item.updatedAtTurn, 0, 0, 999999)
    };
  });
  return out;
}

function normalizeExpressiveHabitatState(input = {}, options = {}) {
  const next = input && typeof input === 'object' ? input : {};
  const turnIndex = clampInt(next.turnIndex, 0, 0, 999999);
  const characterPulses = {};
  CHARACTER_IDS.forEach(id => {
    characterPulses[id] = normalizePulseState(id, next.characterPulses?.[id], turnIndex);
  });
  const authority = String(next.aishaAuthorityState || '').toLowerCase();
  const mood = String(next.roomMood || '').toLowerCase();
  return {
    schemaVersion: EXPRESSIVE_SCHEMA_VERSION,
    roomId: String(next.roomId || options.roomId || ''),
    threadId: String(next.threadId || options.threadId || ''),
    roomMood: ROOM_MOODS.has(mood) ? mood : 'neutral',
    vanyaLeadStatus: String(next.vanyaLeadStatus || VANYA_LEAD_STATUS),
    aishaAuthorityState: AISHA_AUTHORITY_STATES.has(authority) ? authority : 'anchoring',
    aishaCooldownTurns: clampInt(next.aishaCooldownTurns, 0, 0, 4),
    characterPulses,
    specialistGravity: normalizeSpecialistGravity(next.specialistGravity),
    expressionLevel: clampInt(next.expressionLevel, 0, 0, 6),
    lastTopicAnchor: compact(next.lastTopicAnchor || '', MEMORY_CAPS.pulseTopicAnchor),
    lastTakeoverReason: compact(next.lastTakeoverReason || '', MEMORY_CAPS.pulseReason),
    updatedAtTurn: turnIndex,
    updatedAt: String(next.updatedAt || '')
  };
}

function hashText(value = '') {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function continuityEventId({ threadId = '', roomId = '', type = '', characters = [], summary = '' } = {}) {
  const speakerKey = normalizeMemoryList(characters, { maxItems: 5, maxItemLength: 40 }).join('-') || 'room';
  const scope = compact(threadId || roomId || 'open-room', 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'open-room';
  const eventType = compact(type || 'room-note', 60).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'room-note';
  return `cont_${scope}_${eventType}_${speakerKey}_${hashText(memoryKey(summary || eventType))}`;
}

function normalizeContinuityEvent(input = {}) {
  const next = input && typeof input === 'object' ? input : {};
  return {
    id: String(next.id || ''),
    timestamp: String(next.timestamp || ''),
    type: String(next.type || 'room-note'),
    characters: normalizeMemoryList(next.characters, { maxItems: 5, maxItemLength: 40 }),
    userVisibleSummary: compact(next.userVisibleSummary || '', 180),
    memoryImportance: clamp01(next.memoryImportance, 0.3),
    relationshipDeltas: Array.isArray(next.relationshipDeltas) ? next.relationshipDeltas.slice(-MEMORY_CAPS.relationshipDeltas) : [],
    shouldPersist: next.shouldPersist !== false
  };
}

function normalizeContinuityEvents(events = []) {
  const out = [];
  const seen = new Set();
  safeArray(events, MEMORY_CAPS.continuityEvents * 2)
    .map(normalizeContinuityEvent)
    .filter(item => item.id || item.userVisibleSummary)
    .forEach(item => {
      const id = item.id || continuityEventId({
        type: item.type,
        characters: item.characters,
        summary: item.userVisibleSummary
      });
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ ...item, id });
    });
  return out.slice(-MEMORY_CAPS.continuityEvents);
}

function normalizeCharacterContinuityState(input = {}, options = {}) {
  const prev = input && typeof input === 'object' ? clone(input) : {};
  const characterMemories = {};
  CHARACTER_IDS.forEach(id => {
    characterMemories[id] = normalizeCharacterMemory(id, prev.characterMemories?.[id]);
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    roomId: String(prev.roomId || options.roomId || ''),
    threadId: String(prev.threadId || options.threadId || ''),
    characterMemories,
    relationshipStates: seedRelationshipStates(prev.relationshipStates),
    roomSocialState: normalizeRoomSocialState(prev.roomSocialState),
    expressiveHabitatV0: normalizeExpressiveHabitatState(prev.expressiveHabitatV0, {
      roomId: prev.roomId || options.roomId,
      threadId: prev.threadId || options.threadId
    }),
    continuityEvents: normalizeContinuityEvents(prev.continuityEvents),
    lastSocialImpulses: safeArray(prev.lastSocialImpulses, MEMORY_CAPS.lastSocialImpulses),
    updatedAt: String(prev.updatedAt || '')
  };
}

function isDesignCritique(perception = {}) {
  const text = `${perception.text || ''} ${perception.topicFocus || ''}`.toLowerCase();
  return /\b(design|critique|logo|visual|brand|layout|composition|controversial|taste|aesthetic)\b/.test(text);
}

function isRepeatedFailure(perception = {}, continuityState = {}) {
  const text = String(perception.text || '').toLowerCase();
  const hasFailureSubject = /\b(provider|error|failure|fail|failed|failing|timeout|bug|broken|broke|not working|crash|unavailable|fragile|runtime|route|request|save|key|api)\b/.test(text);
  const hasRepeatCue = /\b(again|still|keeps|repeated|same problem|same issue|same error|same timeout|failed again|broke again|broken again|not working again)\b/.test(text);
  if (hasFailureSubject && hasRepeatCue) {
    return true;
  }
  if (!hasFailureSubject) return false;
  return safeArray(continuityState.continuityEvents, 24)
    .some(event => ['pattern-failure', 'relationship-pattern'].includes(event.type) && /fail|broke|error|not working/i.test(event.userVisibleSummary || ''));
}

function isWarmCheckIn(perception = {}) {
  const text = String(perception.text || '').toLowerCase();
  return perception.emotionalTone === 'worried'
    || /\b(check in|how are we feeling|i feel|i'm stressed|im stressed|overwhelmed|need a human read|morale|vibe)\b/.test(text);
}

function isRunningJokeSignal(perception = {}, continuityState = {}) {
  const text = String(perception.text || '').toLowerCase();
  const explicitJoke = /\b(running joke|inside joke|same joke|keeps joking|still joking|again with the joke|embrace the joke|make it a bit)\b/.test(text);
  if (explicitJoke) return true;
  const jokeish = /\b(joke|tease|lol|haha|stealing|stole|last slice)\b/.test(text);
  if (!jokeish) return false;
  return safeArray(continuityState.continuityEvents, MEMORY_CAPS.continuityEvents)
    .some(event => /running-joke|teasing/i.test(event.type || '') || /\b(joke|tease|stealing|stole|last slice)\b/i.test(event.userVisibleSummary || ''));
}

function topicAnchorFor(perception = {}) {
  return compact(perception.topicFocus || perception.currentTopic || perception.text || 'room', MEMORY_CAPS.pulseTopicAnchor);
}

function expressiveDomainSignals(perception = {}, continuityState = {}) {
  const text = String(perception.text || '').toLowerCase();
  const creative = isDesignCritique(perception)
    || perception.taskType === 'creative'
    || /\b(bland|taste|creative|copy|culture|brand|visual|aesthetic|direction)\b/i.test(text);
  const structure = perception.taskType === 'planning'
    || /\b(drift|drifting|owner|ownership|deadline|next step|scope|delivery|unowned|sequence|plan|planning gap)\b/i.test(text);
  const failure = isRepeatedFailure(perception, continuityState)
    || perception.taskType === 'technical'
    || /\b(error|failure|failed|failing|timeout|provider|bug|broken|fragile|risk|crash|unavailable)\b/i.test(text);
  const stress = isWarmCheckIn(perception);
  const repair = /\b(sorry|apolog(?:y|ise|ize)|my bad|that was harsh|fair,?\s*sorry)\b/i.test(text);
  const confusion = /\b(confused|still confused|lost|not making sense|what is happening|too many threads|i do not follow|i don't follow)\b/i.test(text);
  const drift = /\b(drifting|losing the thread|lost the thread|too many threads|scattered|reset the room|reset this)\b/i.test(text);
  const pileOn = /\b(pile[-\s]?on|dogpile|gang up|everyone is piling|all piling)\b/i.test(text);
  return {
    creative,
    structure,
    failure,
    stress,
    repair,
    confusion,
    drift,
    pileOn,
    topicAnchor: topicAnchorFor(perception)
  };
}

function aishaTakeoverReason({ perception = {}, roomState = {}, socialImpulses = [] } = {}) {
  if (Array.isArray(perception.requestedCharacterIds) && perception.requestedCharacterIds.length) return '';
  if (perception.asksRollCall || perception.asksAboutRoomState || perception.asksEveryone) return '';
  const continuity = normalizeCharacterContinuityState(roomState.characterContinuityV0 || {}, {
    roomId: roomState.roomId,
    threadId: roomState.threadId
  });
  const habitat = normalizeExpressiveHabitatState(continuity.expressiveHabitatV0);
  if (Number(habitat.aishaCooldownTurns || 0) > 0) return '';
  const signals = expressiveDomainSignals(perception, continuity);
  const social = normalizeRoomSocialState(continuity.roomSocialState);
  const highImpulseCount = (Array.isArray(socialImpulses) ? socialImpulses : [])
    .filter(item => Number(item?.intensity || 0) >= 0.72)
    .length;
  if (signals.pileOn || (perception.taskType === 'conflict' && highImpulseCount >= 4 && Number(social.tension || 0) >= 0.55)) {
    return 'pile-on-risk';
  }
  const aishaPulse = normalizePulseState('aisha', habitat.characterPulses.aisha, habitat.updatedAtTurn);
  const aishaReady = habitat.aishaAuthorityState === 'ready' || aishaPulse.currentPulse === 'Ready';
  if (signals.confusion && (Number(social.tension || 0) >= 0.38 || ['tense', 'elevated'].includes(habitat.roomMood))) {
    return aishaReady ? 'user-confusion-compounding' : '';
  }
  if (signals.drift) {
    return aishaReady ? 'room-drift' : '';
  }
  return '';
}

function firstRelationshipTarget(perception = {}, fallback = USER_ENTITY_ID) {
  const requested = Array.isArray(perception.requestedCharacterIds) ? perception.requestedCharacterIds : [];
  const direct = requested.find(id => CHARACTER_IDS.includes(String(id || '').toLowerCase()));
  return direct || fallback;
}

function classifyRelationshipMoment({ perception = {}, plan = {}, turns = [], continuityState = {} } = {}) {
  const text = String(perception.text || '').toLowerCase();
  const speakers = (Array.isArray(turns) ? turns : [])
    .map(turn => String(turn?.speakerId || '').toLowerCase())
    .filter(id => CHARACTER_IDS.includes(id));
  const targetId = firstRelationshipTarget(perception, USER_ENTITY_ID);
  const mentioned = Array.isArray(perception.requestedCharacterIds) ? perception.requestedCharacterIds : [];
  const hasApology = /\b(sorry|apolog(?:y|ise|ize)|my bad|fair,?\s*sorry|that was harsh|i was harsh)\b/i.test(text);
  const hasRepairDetail = hasApology && /\b(because|issue|problem|provider|timeout|failed|failure|reason|what happened|fault)\b/i.test(text);
  const hasSupport = /\b(is right|you'?re right|agree with|good point|has a point|backing|support|fair call)\b/i.test(text);
  const hasDismissal = /\b(useless|that was useless|wrong|nonsense|shut up|bad take|terrible take|you failed|your fault|not helpful)\b/i.test(text);
  const hasCorrection = /\b(actually|correction|not quite|that is wrong|wrong because|push back|disagree)\b/i.test(text);

  if (hasApology) {
    return {
      type: 'repair',
      targetId,
      targetCharacterIds: CHARACTER_IDS.includes(targetId) ? [targetId] : speakers,
      specificRepair: hasRepairDetail,
      reason: hasRepairDetail ? 'specific-repair' : 'general-repair'
    };
  }
  if (perception.taskType === 'conflict' || hasDismissal) {
    return {
      type: 'dismissal',
      targetId,
      targetCharacterIds: CHARACTER_IDS.includes(targetId) ? [targetId] : speakers,
      harsh: true,
      reason: 'dismissal-or-insult'
    };
  }
  if (isRepeatedFailure(perception, continuityState)) {
    return {
      type: 'repeated-failure',
      targetId: USER_ENTITY_ID,
      targetCharacterIds: ['grok', 'claudia'],
      reason: 'unresolved-failure-pattern'
    };
  }
  if (hasSupport && mentioned.length) {
    return {
      type: 'support',
      targetId: firstRelationshipTarget(perception),
      targetCharacterIds: mentioned.filter(id => CHARACTER_IDS.includes(id)),
      reason: 'explicit-support'
    };
  }
  if (isDesignCritique(perception) || hasCorrection) {
    return {
      type: hasCorrection ? 'correction' : 'critique',
      targetId: USER_ENTITY_ID,
      targetCharacterIds: speakers,
      harsh: /\b(bland|no taste|bad|weak|lazy|terrible)\b/i.test(text),
      reason: hasCorrection ? 'correction' : 'critique'
    };
  }
  if (isWarmCheckIn(perception)) {
    return {
      type: 'emotional-check-in',
      targetId: USER_ENTITY_ID,
      targetCharacterIds: speakers.length ? speakers : ['vanya'],
      reason: 'emotional-check-in'
    };
  }
  if (isRunningJokeSignal(perception, continuityState)) {
    return {
      type: 'teasing',
      targetId,
      targetCharacterIds: CHARACTER_IDS.includes(targetId) ? [targetId] : speakers,
      reason: 'running-joke'
    };
  }
  return {
    type: 'casual-neutral',
    targetId: USER_ENTITY_ID,
    targetCharacterIds: speakers,
    reason: plan.intentFamily || perception.taskType || 'ordinary-turn'
  };
}

function makeImpulse(characterId, impulseType, intensity, reason, perception = {}, targetId = '') {
  return {
    characterId,
    impulseType,
    intensity: clamp01(intensity, 0),
    reason,
    targetId: targetId ? String(targetId).toLowerCase() : '',
    topicAnchor: compact(perception.topicFocus || perception.currentTopic || perception.text || 'room', 80)
  };
}

function relationshipFor(continuityState = {}, fromCharacterId = '', toEntityId = USER_ENTITY_ID) {
  const key = relationshipKey(fromCharacterId, toEntityId);
  return normalizeRelationshipState(continuityState.relationshipStates?.[key], fromCharacterId, toEntityId);
}

function relationshipPressureFor(continuityState = {}, characterId = '') {
  const userRel = relationshipFor(continuityState, characterId, USER_ENTITY_ID);
  return Math.max(
    Number(userRel.repairNeeded || 0),
    Number(userRel.recentPressure || 0),
    Number(userRel.irritation || 0) * 0.8,
    Number(userRel.skepticism || 0) * 0.5
  );
}

function applyRelationshipPressureToImpulses(impulses = {}, continuityState = {}, perception = {}) {
  CHARACTER_IDS.forEach(id => {
    const impulse = impulses[id];
    if (!impulse) return;
    const relationship = relationshipFor(continuityState, id, USER_ENTITY_ID);
    const pressure = relationshipPressureFor(continuityState, id);
    if (pressure >= 0.48 && ['observe', 'withdraw'].includes(String(impulse.impulseType || ''))) {
      impulses[id] = makeImpulse(id, 'holdback', Math.min(0.72, pressure), 'relationship-pressure-holding-back', perception, USER_ENTITY_ID);
    }
    if (isRepeatedFailure(perception, continuityState) && id === 'grok') {
      impulses[id] = makeImpulse(id, 'speak', Math.min(0.98, 0.86 + Number(relationship.skepticism || 0) * 0.18), 'skepticism-from-repeated-failures', perception, USER_ENTITY_ID);
    }
    if (perception.taskType === 'planning' && id === 'claudia') {
      impulses[id] = makeImpulse(id, 'speak', Math.min(0.96, Number(impulse.intensity || 0) + Number(relationship.collaboration || 0) * 0.08), 'collaboration-pressure-for-planning', perception, USER_ENTITY_ID);
    }
    if (isWarmCheckIn(perception) && id === 'vanya') {
      impulses[id] = makeImpulse(id, 'support', Math.min(0.96, Number(impulse.intensity || 0) + Number(relationship.warmth || 0) * 0.06), 'warmth-pressure-for-check-in', perception, USER_ENTITY_ID);
    }
  });
  return impulses;
}

function applyExpressiveHabitatPressureToImpulses(impulses = {}, continuityState = {}, perception = {}) {
  const habitat = normalizeExpressiveHabitatState(continuityState.expressiveHabitatV0);
  const signals = expressiveDomainSignals(perception, continuityState);
  const raise = (id, impulseType, floor, reason) => {
    const current = impulses[id] || makeImpulse(id, 'observe', 0.2, 'listening-for-relevance', perception);
    const intensity = Math.max(Number(current.intensity || 0), floor);
    impulses[id] = makeImpulse(id, impulseType, intensity, reason, perception, USER_ENTITY_ID);
  };
  if (signals.creative && Number(habitat.specialistGravity.leah?.value || 0) >= 3) {
    raise('leah', 'challenge', 0.86, 'expressive-gravity-holding-critique');
  }
  if (signals.structure && Number(habitat.specialistGravity.claudia?.value || 0) >= 3) {
    raise('claudia', 'speak', 0.84, 'expressive-gravity-tracking-next-steps');
  }
  if (signals.failure && Number(habitat.specialistGravity.grok?.value || 0) >= 3) {
    raise('grok', 'speak', 0.9, 'expressive-gravity-tracking-failure');
  }
  if (signals.stress && impulses.vanya) {
    raise('vanya', 'support', Math.max(0.88, Number(impulses.vanya.intensity || 0)), 'vanya-lead-social-temperature');
  }
  return impulses;
}

function finalizeSocialImpulses(impulses = {}, continuityState = {}, perception = {}) {
  const adjusted = applyExpressiveHabitatPressureToImpulses(
    applyRelationshipPressureToImpulses(impulses, continuityState, perception),
    continuityState,
    perception
  );
  return CHARACTER_IDS.map(id => adjusted[id]);
}

function calculateSocialImpulses({ perception = {}, roomState = {}, continuityState = null } = {}) {
  const continuity = normalizeCharacterContinuityState(continuityState || roomState.characterContinuityV0 || {}, {
    roomId: roomState.roomId,
    threadId: roomState.threadId
  });
  const social = normalizeRoomSocialState(continuity.roomSocialState);
  const impulses = {};
  CHARACTER_IDS.forEach(id => {
    impulses[id] = makeImpulse(id, 'observe', 0.2, 'listening-for-relevance', perception);
  });

  if (Array.isArray(perception.requestedCharacterIds) && perception.requestedCharacterIds.length) {
    const target = perception.requestedCharacterIds[0];
    impulses[target] = makeImpulse(target, 'speak', 0.96, 'direct-character-address', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (perception.asksEveryone) {
    CHARACTER_IDS.forEach(id => {
      impulses[id] = makeImpulse(id, id === 'vanya' ? 'support' : id === 'leah' || id === 'grok' ? 'challenge' : 'speak', 0.82, 'explicit-room-invitation', perception, USER_ENTITY_ID);
    });
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (perception.taskType === 'conflict') {
    impulses.aisha = makeImpulse('aisha', 'challenge', 0.94, 'room-boundary-needed', perception, USER_ENTITY_ID);
    impulses.vanya = makeImpulse('vanya', 'support', 0.82, 'de-escalate-with-warmth', perception, USER_ENTITY_ID);
    impulses.grok = makeImpulse('grok', 'challenge', 0.76, 'diagnose-hostile-signal', perception, USER_ENTITY_ID);
    impulses.leah = makeImpulse('leah', 'withdraw', 0.58, 'heat-without-useful-brief', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (perception.taskType === 'greeting') {
    impulses.vanya = makeImpulse('vanya', 'speak', 0.86, 'warm-room-entry', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', social.tension >= 0.62 || roomState.recentTension >= 0.62 ? 'support' : 'observe', social.tension >= 0.62 ? 0.68 : 0.42, 'room-lead-holding-shape', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (perception.taskType === 'planning') {
    impulses.claudia = makeImpulse('claudia', 'speak', 0.9, 'planning-needs-operations-owner', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', 'observe', 0.48, 'authority-available-if-scope-drifts', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (isRepeatedFailure(perception, continuity)) {
    impulses.grok = makeImpulse('grok', 'speak', 0.94, 'repeated-failure-pattern', perception, USER_ENTITY_ID);
    impulses.claudia = makeImpulse('claudia', 'observe', 0.56, 'delivery-risk-visible', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (isDesignCritique(perception)) {
    impulses.leah = makeImpulse('leah', 'challenge', 0.9, 'taste-and-design-critique', perception, USER_ENTITY_ID);
    impulses.grok = makeImpulse('grok', 'challenge', /\b(pattern|structure|system|logo|layout)\b/i.test(perception.text || perception.topicFocus || '') ? 0.7 : 0.5, 'structure-read-available', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (isWarmCheckIn(perception)) {
    impulses.vanya = makeImpulse('vanya', 'support', 0.88, 'emotional-room-check-in', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', social.tension >= 0.5 || perception.emotionalTone === 'worried' ? 'support' : 'observe', social.tension >= 0.5 ? 0.66 : 0.54, 'room-lead-can-hold-the-floor', perception, USER_ENTITY_ID);
    return finalizeSocialImpulses(impulses, continuity, perception);
  }

  if (perception.taskType === 'technical') {
    impulses.grok = makeImpulse('grok', 'speak', 0.84, 'technical-diagnosis-needed', perception, USER_ENTITY_ID);
  } else if (perception.taskType === 'creative') {
    impulses.leah = makeImpulse('leah', 'speak', 0.8, 'creative-taste-needed', perception, USER_ENTITY_ID);
  }
  return finalizeSocialImpulses(impulses, continuity, perception);
}

function applyRelationshipDelta(state, delta = {}, now = '') {
  const from = String(delta.fromCharacterId || '').toLowerCase();
  const to = String(delta.toEntityId || USER_ENTITY_ID).toLowerCase();
  if (!from || !CHARACTER_IDS.includes(from)) return null;
  const key = relationshipKey(from, to);
  const current = normalizeRelationshipState(state.relationshipStates[key], from, to);
  const next = {
    ...current,
    trust: clamp01(current.trust + Number(delta.trust || 0), current.trust),
    irritation: clamp01(current.irritation + Number(delta.irritation || 0), current.irritation),
    warmth: clamp01(current.warmth + Number(delta.warmth || 0), current.warmth),
    respect: clamp01(current.respect + Number(delta.respect || 0), current.respect),
    rivalry: clamp01(current.rivalry + Number(delta.rivalry || 0), current.rivalry),
    protectiveness: clamp01(current.protectiveness + Number(delta.protectiveness || 0), current.protectiveness),
    repairNeeded: clamp01(current.repairNeeded + Number(delta.repairNeeded || 0), current.repairNeeded),
    skepticism: clamp01(current.skepticism + Number(delta.skepticism || 0), current.skepticism),
    collaboration: clamp01(current.collaboration + Number(delta.collaboration || 0), current.collaboration),
    recentPressure: clamp01(current.recentPressure + Number(delta.recentPressure || 0), current.recentPressure),
    lastShiftReason: String(delta.reason || current.lastShiftReason || ''),
    lastShiftAt: now,
    lastMeaningfulInteraction: delta.meaningful === false ? current.lastMeaningfulInteraction : now
  };
  state.relationshipStates[key] = next;
  return { ...delta, fromCharacterId: from, toEntityId: to };
}

function eventTypeFor(perception = {}, plan = {}) {
  const moment = classifyRelationshipMoment({ perception, plan, continuityState: plan.continuityState || {} });
  if (moment.type === 'support') return 'relationship-supported';
  if (moment.type === 'dismissal') return 'relationship-friction';
  if (moment.type === 'repair') return 'relationship-repair';
  if (perception.taskType === 'conflict') return 'conflict-boundary';
  if (isRepeatedFailure(perception, plan.continuityState || {})) return 'relationship-pattern';
  if (isRunningJokeSignal(perception, plan.continuityState || {})) return 'running-joke';
  if (isDesignCritique(perception)) return 'design-critique';
  if (perception.taskType === 'planning') return 'planning-alignment';
  if (isWarmCheckIn(perception)) return 'emotional-check-in';
  if (perception.taskType === 'greeting') return 'room-greeting';
  if (perception.asksEveryone) return 'room-opinion';
  return 'room-turn';
}

function relationshipDeltasFor({ eventType = '', turns = [], perception = {}, relationshipMoment = {}, continuityState = {} } = {}) {
  const speakers = (Array.isArray(turns) ? turns : []).map(turn => String(turn.speakerId || '').toLowerCase()).filter(id => CHARACTER_IDS.includes(id));
  const deltas = [];
  const targetCharacters = normalizeMemoryList(relationshipMoment.targetCharacterIds || [], { maxItems: 5, maxItemLength: 40 })
    .filter(id => CHARACTER_IDS.includes(id));
  const relationshipTargets = targetCharacters.length ? targetCharacters : speakers;
  relationshipTargets.forEach(id => {
    if (eventType === 'conflict-boundary') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, irritation: 0.1, warmth: -0.05, trust: -0.03, repairNeeded: 0.14, recentPressure: 0.12, reason: 'conflict-boundary' });
    } else if (eventType === 'relationship-friction') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, irritation: 0.1, warmth: -0.05, trust: -0.03, repairNeeded: 0.14, recentPressure: 0.12, reason: 'dismissal' });
    } else if (eventType === 'relationship-repair') {
      const repeatedFailure = isRepeatedFailure(perception, continuityState) && id === 'grok';
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, irritation: -0.1, repairNeeded: -0.14, warmth: 0.04, trust: 0.03, recentPressure: repeatedFailure ? -0.04 : -0.08, skepticism: repeatedFailure ? 0.03 : 0, collaboration: relationshipMoment.specificRepair ? 0.02 : 0.01, reason: relationshipMoment.reason || 'repair' });
    } else if (eventType === 'relationship-supported') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, trust: 0.02, warmth: 0.03, respect: 0.02, irritation: -0.02, repairNeeded: -0.03, collaboration: 0.01, reason: 'support' });
    } else if (eventType === 'relationship-pattern') {
      if (id === 'grok') {
        deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, skepticism: 0.03, recentPressure: 0.04, reason: 'repeated-failure' });
      } else if (id === 'claudia') {
        deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, collaboration: 0.02, recentPressure: 0.04, reason: 'repeated-failure' });
      }
    } else if (eventType === 'design-critique') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, respect: 0.03, trust: 0.01, rivalry: id === 'leah' || id === 'grok' ? 0.01 : 0, irritation: relationshipMoment.harsh ? 0.01 : 0, reason: 'design-critique' });
    } else if (eventType === 'planning-alignment') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, respect: 0.03, trust: 0.02, reason: 'planning-alignment' });
    } else if (eventType === 'emotional-check-in') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.04, trust: 0.01, protectiveness: id === 'vanya' || id === 'aisha' ? 0.02 : 0, reason: eventType });
    } else if (eventType === 'running-joke') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.03, rivalry: 0.02, reason: 'teasing' });
    } else if (relationshipMoment.type === 'casual-neutral') {
      const current = relationshipFor(continuityState, id, USER_ENTITY_ID);
      if (Number(current.repairNeeded || 0) > 0.18 || Number(current.recentPressure || 0) > 0.18 || Number(current.irritation || 0) > 0.22) {
        deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, irritation: -0.01, repairNeeded: -0.01, recentPressure: -0.02, reason: 'cooling-neutral-turn', meaningful: false });
      }
    }
  });
  if (relationshipMoment.type === 'repair' && isRepeatedFailure(perception, continuityState)) {
    if (!deltas.some(delta => delta.fromCharacterId === 'claudia' && delta.reason === 'repeated-failure')) {
      deltas.push({ fromCharacterId: 'claudia', toEntityId: USER_ENTITY_ID, collaboration: 0.02, recentPressure: 0.04, reason: 'repeated-failure' });
    }
  }
  return deltas;
}

function eventMood(eventType = '', perception = {}, relationshipMoment = {}, continuityState = {}) {
  const signals = expressiveDomainSignals(perception, continuityState);
  if (['conflict-boundary', 'relationship-friction'].includes(eventType) || relationshipMoment.type === 'dismissal') return 'tense';
  if (eventType === 'relationship-repair' || signals.repair) return 'cooling';
  if (eventType === 'relationship-pattern' || signals.failure) return 'elevated';
  if (eventType === 'emotional-check-in' || eventType === 'room-greeting' || signals.stress) return 'warm';
  return 'neutral';
}

function expressionLevelFor({ visibleTurns = [], pulseChanged = false, moodChanged = false, internalShift = false } = {}) {
  if (visibleTurns.length) return 6;
  if (pulseChanged) return 4;
  if (moodChanged) return 3;
  if (internalShift) return 1;
  return 0;
}

function specialistPulseFor(id = '', value = 0, signals = {}) {
  if (id === 'leah') {
    if (value >= 2) return { currentPulse: 'Ready', visibleLabel: 'Ready', pulseReason: 'creative signal repeated' };
    if (signals.creative || value >= 1) return { currentPulse: 'Holding critique', visibleLabel: 'Holding critique', pulseReason: 'taste signal present' };
  }
  if (id === 'claudia') {
    if (value >= 2) return { currentPulse: 'Ready', visibleLabel: 'Ready', pulseReason: 'structure signal repeated' };
    if (signals.structure || value >= 1) return { currentPulse: 'Tracking', visibleLabel: 'Tracking next steps', pulseReason: 'delivery signal present' };
  }
  if (id === 'grok') {
    if (value >= 2) return { currentPulse: 'Ready', visibleLabel: 'Ready', pulseReason: 'failure signal repeated' };
    if (signals.failure || value >= 1) return { currentPulse: 'Tracking', visibleLabel: 'Tracking failure', pulseReason: 'failure signal present' };
  }
  return null;
}

function setPulse(pulses = {}, id = '', update = {}, turnIndex = 0, expiresAfterTurns = 2) {
  if (!CHARACTER_IDS.includes(id)) return false;
  const before = normalizePulseState(id, pulses[id], turnIndex);
  const next = normalizePulseState(id, {
    ...before,
    currentPulse: update.currentPulse || before.currentPulse,
    visibleLabel: update.visibleLabel || update.currentPulse || before.visibleLabel,
    pulseReason: update.pulseReason || before.pulseReason,
    topicAnchor: update.topicAnchor || before.topicAnchor,
    expiresAfterTurns,
    updatedAtTurn: turnIndex
  }, turnIndex);
  pulses[id] = next;
  return before.visibleLabel !== next.visibleLabel || before.currentPulse !== next.currentPulse;
}

function decayPulseExpiries(pulses = {}, turnIndex = 0) {
  const out = {};
  CHARACTER_IDS.forEach(id => {
    const pulse = normalizePulseState(id, pulses[id], turnIndex);
    if (Number(pulse.expiresAfterTurns || 0) <= 0) {
      out[id] = pulse;
      return;
    }
    const remaining = Math.max(0, Number(pulse.expiresAfterTurns || 0) - 1);
    out[id] = remaining === 0
      ? normalizePulseState(id, defaultPulseState(id), turnIndex)
      : { ...pulse, expiresAfterTurns: remaining };
  });
  return out;
}

function reduceExpressiveHabitatState({
  previous = {},
  perception = {},
  plan = {},
  turns = [],
  relationshipMoment = {},
  eventType = '',
  continuityState = {},
  threadId = '',
  roomId = '',
  now = ''
} = {}) {
  const prev = normalizeExpressiveHabitatState(previous, { threadId, roomId });
  const turnIndex = clampInt(prev.updatedAtTurn, 0, 0, 999999) + 1;
  const signals = expressiveDomainSignals(perception, continuityState);
  const topicAnchor = signals.topicAnchor || prev.lastTopicAnchor || 'room';
  const visibleTurns = Array.isArray(turns) ? turns : [];
  const speakers = new Set(visibleTurns.map(turn => String(turn?.speakerId || '').toLowerCase()).filter(Boolean));
  const next = {
    ...prev,
    roomId: prev.roomId || roomId,
    threadId: prev.threadId || threadId,
    characterPulses: decayPulseExpiries(prev.characterPulses, turnIndex),
    specialistGravity: normalizeSpecialistGravity(prev.specialistGravity),
    updatedAtTurn: turnIndex,
    updatedAt: now || prev.updatedAt
  };

  let pulseChanged = false;
  let internalShift = false;
  const previousMood = next.roomMood;
  const mood = eventMood(eventType, perception, relationshipMoment, continuityState);
  next.roomMood = mood;

  const topicShift = prev.lastTopicAnchor && topicAnchor && memoryKey(prev.lastTopicAnchor) !== memoryKey(topicAnchor)
    && !signals.creative && !signals.structure && !signals.failure;
  SPECIALIST_GRAVITY_IDS.forEach(id => {
    const current = { ...next.specialistGravity[id] };
    let value = current.value;
    if (topicShift) value = Math.max(0, value - 1);
    const signalActive = (id === 'leah' && signals.creative)
      || (id === 'claudia' && signals.structure)
      || (id === 'grok' && signals.failure);
    if (signalActive) {
      value = Math.min(SPECIALIST_GRAVITY_CAP, value + 1);
      internalShift = true;
    }
    if (speakers.has(id) || (plan.intentFamily === 'aisha-takeover' && id !== 'aisha')) {
      value = 0;
    }
    next.specialistGravity[id] = {
      characterId: id,
      value,
      topicAnchor: value > 0 ? topicAnchor : '',
      lastSignal: signalActive ? compact(perception.text || eventType || 'signal', MEMORY_CAPS.pulseReason) : current.lastSignal,
      updatedAtTurn: signalActive || value !== current.value ? turnIndex : current.updatedAtTurn
    };
    const pulse = specialistPulseFor(id, value, signals);
    if (pulse) {
      pulseChanged = setPulse(next.characterPulses, id, {
        ...pulse,
        topicAnchor
      }, turnIndex, value >= 2 ? 3 : 2) || pulseChanged;
    } else if (topicShift && value === 0) {
      pulseChanged = setPulse(next.characterPulses, id, defaultPulseState(id), turnIndex, 0) || pulseChanged;
    }
  });

  if (signals.stress || eventType === 'emotional-check-in') {
    pulseChanged = setPulse(next.characterPulses, 'vanya', {
      currentPulse: 'Protective',
      visibleLabel: 'Protective',
      pulseReason: 'user needs a human read',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
    pulseChanged = setPulse(next.characterPulses, 'aisha', {
      currentPulse: 'Protective',
      visibleLabel: 'Protective',
      pulseReason: 'room needs holding',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
  } else if (['conflict-boundary', 'relationship-friction'].includes(eventType)) {
    pulseChanged = setPulse(next.characterPulses, 'vanya', {
      currentPulse: 'Protective',
      visibleLabel: 'Protective',
      pulseReason: 'friction in room',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
    pulseChanged = setPulse(next.characterPulses, 'aisha', {
      currentPulse: 'Anchoring',
      visibleLabel: 'Anchoring',
      pulseReason: 'room boundary holding',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
  } else if (eventType === 'relationship-repair') {
    pulseChanged = setPulse(next.characterPulses, 'aisha', {
      currentPulse: 'Anchoring',
      visibleLabel: 'Anchoring',
      pulseReason: 'repair cooling the room',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
  } else if ((signals.confusion || signals.drift) && Number(prev.aishaCooldownTurns || 0) <= 0) {
    pulseChanged = setPulse(next.characterPulses, 'aisha', {
      currentPulse: 'Ready',
      visibleLabel: 'Ready',
      pulseReason: signals.confusion ? 'user confusion compounding' : 'room drift building',
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
  }

  if (plan.intentFamily === 'aisha-takeover') {
    next.aishaAuthorityState = 'anchoring';
    next.aishaCooldownTurns = 2;
    next.lastTakeoverReason = compact(plan.trace || plan.steps?.[0]?.reason || 'room reset', MEMORY_CAPS.pulseReason);
    pulseChanged = setPulse(next.characterPulses, 'aisha', {
      currentPulse: 'Anchoring',
      visibleLabel: 'Anchoring',
      pulseReason: next.lastTakeoverReason,
      topicAnchor
    }, turnIndex, 2) || pulseChanged;
  } else {
    const cooldown = Math.max(0, Number(prev.aishaCooldownTurns || 0) - 1);
    next.aishaCooldownTurns = cooldown;
    const stagedAisha = (signals.confusion || signals.drift) && cooldown === 0;
    next.aishaAuthorityState = signals.stress
      ? 'protective'
      : stagedAisha
        ? 'ready'
        : cooldown > 0
          ? 'watching'
          : 'anchoring';
  }

  if (!speakers.has('vanya') && !signals.stress && next.characterPulses.vanya.visibleLabel === 'Reading') {
    next.characterPulses.vanya = { ...next.characterPulses.vanya, visibleLabel: 'Reading the room' };
  }
  next.lastTopicAnchor = topicAnchor;
  next.expressionLevel = expressionLevelFor({
    visibleTurns,
    pulseChanged,
    moodChanged: previousMood !== next.roomMood,
    internalShift
  });
  return normalizeExpressiveHabitatState(next, { threadId: next.threadId || threadId, roomId: next.roomId || roomId });
}

function addMemoryItem(memory = {}, field = '', value = '', options = {}) {
  const caps = {
    learnedTraits: MEMORY_CAPS.stableTraits,
    learnedPreferences: MEMORY_CAPS.preferences,
    learnedDislikes: MEMORY_CAPS.dislikes,
    runningJokes: MEMORY_CAPS.runningJokes,
    projectAttachments: MEMORY_CAPS.projectAttachments,
    recentEmotionalNotes: MEMORY_CAPS.recentEmotionalNotes
  };
  memory[field] = normalizeMemoryList([...(memory[field] || []), value], {
    maxItems: caps[field] || 8,
    maxItemLength: options.maxItemLength || 140,
    keepLast: options.keepLast !== false
  });
}

function normalizeUpdatedMemory(state = {}, id = '') {
  if (!state.characterMemories?.[id]) return;
  state.characterMemories[id] = normalizeCharacterMemory(id, state.characterMemories[id]);
}

function updateMemoryForEvent(state, event = {}, perception = {}) {
  const text = compact(perception.text || event.userVisibleSummary || '', 140);
  (event.characters || []).forEach(id => {
    const memory = state.characterMemories[id];
    if (!memory) return;
    if (['pattern-failure', 'relationship-pattern'].includes(event.type) && id === 'grok') {
      addMemoryItem(memory, 'projectAttachments', text || 'Repeated failure pattern', { maxItemLength: 160 });
      addMemoryItem(memory, 'recentEmotionalNotes', 'Noted a repeated failure pattern.', { maxItemLength: 120 });
    } else if (event.type === 'design-critique' && id === 'leah') {
      addMemoryItem(memory, 'learnedPreferences', 'design critique with receipts', { maxItemLength: 120 });
      addMemoryItem(memory, 'recentEmotionalNotes', 'Leaned in for a taste/critique read.', { maxItemLength: 120 });
    } else if (event.type === 'emotional-check-in' && id === 'vanya') {
      addMemoryItem(memory, 'recentEmotionalNotes', 'User asked for a warmer human read.', { maxItemLength: 120 });
    } else if (event.type === 'running-joke') {
      const targetId = /\b(grok|gerhard)\b/i.test(text) ? 'grok' : id;
      const targetMemory = state.characterMemories[targetId];
      if (targetMemory) {
        addMemoryItem(targetMemory, 'runningJokes', text || 'Repeated room joke.', { maxItemLength: 120 });
        normalizeUpdatedMemory(state, targetId);
      }
    }
    normalizeUpdatedMemory(state, id);
  });
}

function reduceCharacterContinuityState({
  previous = null,
  perception = {},
  plan = {},
  turns = [],
  socialImpulses = [],
  threadId = '',
  roomId = ''
} = {}) {
  const now = new Date().toISOString();
  const next = normalizeCharacterContinuityState(previous, { threadId, roomId });
  const visibleTurns = (Array.isArray(turns) ? turns : [])
    .filter(turn => CHARACTER_IDS.includes(String(turn?.speakerId || '').toLowerCase()) && String(turn?.content || turn?.text || '').trim());
  const speakers = visibleTurns.map(turn => String(turn.speakerId || '').toLowerCase());
  const relationshipMoment = classifyRelationshipMoment({ perception, plan, turns: visibleTurns, continuityState: next });
  const eventType = eventTypeFor(perception, { ...plan, continuityState: next });
  const summary = compact(perception.text || eventType, 180);
  const eventId = continuityEventId({
    threadId: next.threadId || threadId,
    roomId: next.roomId || roomId,
    type: eventType,
    characters: speakers,
    summary
  });
  const alreadyRecorded = next.continuityEvents.some(item => item.id === eventId);
  const deltas = alreadyRecorded
    ? []
    : relationshipDeltasFor({ eventType, turns: visibleTurns, perception, relationshipMoment, continuityState: next })
      .map(delta => applyRelationshipDelta(next, delta, now))
      .filter(Boolean);
  const meaningfulEventTypes = new Set([
    'conflict-boundary',
    'relationship-supported',
    'relationship-friction',
    'relationship-repair',
    'relationship-pattern',
    'running-joke',
    'design-critique',
    'planning-alignment',
    'emotional-check-in',
    'room-tension-shift'
  ]);
  const shouldPersist = meaningfulEventTypes.has(eventType) || deltas.length > 0;
  const event = normalizeContinuityEvent({
    id: eventId,
    timestamp: now,
    type: eventType,
    characters: speakers,
    userVisibleSummary: summary,
    memoryImportance: ['conflict-boundary', 'relationship-friction', 'relationship-repair', 'relationship-pattern'].includes(eventType) ? 0.78 : eventType === 'design-critique' ? 0.58 : 0.36,
    relationshipDeltas: deltas,
    shouldPersist
  });
  if (!alreadyRecorded && (event.characters.length || event.userVisibleSummary)) {
    next.continuityEvents = normalizeContinuityEvents([...next.continuityEvents, event]);
    updateMemoryForEvent(next, event, perception);
  }
  const currentSocial = normalizeRoomSocialState(next.roomSocialState);
  const spoken = new Set(speakers);
  const suppressedSpeakers = (Array.isArray(socialImpulses) ? socialImpulses : [])
    .filter(impulse => !spoken.has(String(impulse.characterId || '').toLowerCase()) && Number(impulse.intensity || 0) >= 0.56)
    .map(impulse => impulse.characterId)
    .filter(Boolean)
    .slice(0, 5);
  const tensionTarget = ['relationship-friction', 'conflict-boundary'].includes(eventType)
    ? 0.72
    : eventType === 'relationship-pattern'
      ? Math.max(currentSocial.tension, 0.22)
      : eventType === 'relationship-repair'
        ? Math.max(0.08, currentSocial.tension - 0.08)
        : eventType === 'design-critique'
      ? Math.max(currentSocial.tension, 0.24)
      : Math.max(0.08, currentSocial.tension - 0.04);
  const warmthTarget = ['emotional-check-in', 'room-greeting', 'relationship-supported', 'relationship-repair'].includes(eventType)
    ? Math.min(1, currentSocial.warmth + 0.05)
    : ['relationship-friction', 'conflict-boundary'].includes(eventType)
      ? Math.max(0, currentSocial.warmth - 0.06)
      : currentSocial.warmth;
  next.roomSocialState = normalizeRoomSocialState({
    ...currentSocial,
    warmth: warmthTarget,
    tension: tensionTarget,
    chaos: perception.taskType === 'conflict' ? Math.max(currentSocial.chaos, 0.44) : Math.max(0.08, currentSocial.chaos - 0.03),
    momentum: visibleTurns.length ? Math.min(1, currentSocial.momentum + 0.08) : Math.max(0, currentSocial.momentum - 0.03),
    dominantMood: eventType === 'conflict-boundary'
      ? 'tense'
      : eventType === 'relationship-friction'
        ? 'tense'
        : eventType === 'relationship-repair'
          ? 'repairing'
          : eventType === 'relationship-supported'
            ? 'warm'
            : eventType === 'relationship-pattern'
              ? 'focused'
      : eventType === 'design-critique'
        ? 'sharp'
        : eventType === 'emotional-check-in' || eventType === 'room-greeting'
          ? 'warm'
          : eventType === 'planning-alignment' || eventType === 'pattern-failure'
            ? 'focused'
            : currentSocial.dominantMood,
    currentFloorHolder: speakers[speakers.length - 1] || currentSocial.currentFloorHolder,
    unresolvedSocialThreads: eventType === 'conflict-boundary'
      ? safeArray([...currentSocial.unresolvedSocialThreads, compact(perception.text || 'room tension', 90)], 8)
      : currentSocial.unresolvedSocialThreads,
    suppressedSpeakers
  });
  next.lastSocialImpulses = safeArray(socialImpulses, MEMORY_CAPS.lastSocialImpulses);
  next.expressiveHabitatV0 = reduceExpressiveHabitatState({
    previous: next.expressiveHabitatV0,
    perception,
    plan,
    turns: visibleTurns,
    relationshipMoment,
    eventType,
    continuityState: next,
    threadId: next.threadId || threadId,
    roomId: next.roomId || roomId,
    now
  });
  next.updatedAt = now;
  return normalizeCharacterContinuityState(next, { threadId: next.threadId || threadId, roomId: next.roomId || roomId });
}

function pressureLabelsForRelationship(relationship = {}) {
  const labels = [];
  if (Number(relationship.repairNeeded || 0) >= 0.2) labels.push('repair-needed');
  if (Number(relationship.irritation || 0) >= 0.2) labels.push('friction');
  if (Number(relationship.warmth || 0) >= 0.72) labels.push('warmth');
  if (Number(relationship.respect || 0) >= 0.72) labels.push('respect');
  if (Number(relationship.skepticism || 0) >= 0.34) labels.push('skepticism');
  if (Number(relationship.collaboration || 0) >= 0.62) labels.push('collaboration');
  if (Number(relationship.recentPressure || 0) >= 0.2) labels.push('recent-pressure');
  return labels.slice(0, 4);
}

function relationshipSummaryFor(id = '', relationship = {}, options = {}) {
  const name = characterDisplayName(id);
  const labels = pressureLabelsForRelationship(relationship);
  if (!labels.length && !options.force) return '';
  if (labels.includes('repair-needed') || labels.includes('friction')) {
    return compact(`${name} has some unresolved friction with the user; keep the tone direct and leave room for repair.`, 160);
  }
  if (labels.includes('skepticism')) {
    return compact(`${name} is skeptical after repeated unresolved failures; ask for evidence and keep the diagnosis concrete.`, 160);
  }
  if (labels.includes('collaboration')) {
    return compact(`${name} is in a collaborative posture with the user; translate the room into next steps.`, 160);
  }
  if (labels.includes('warmth')) {
    return compact(`${name} is warm toward the user and tends to soften tense moments without flattening the room.`, 160);
  }
  if (labels.includes('respect')) {
    return compact(`${name} respects the user's signal; let that create confidence without turning into flattery.`, 160);
  }
  return '';
}

function relationshipSummariesForAisha(continuityState = {}, options = {}) {
  const normalized = normalizeCharacterContinuityState(continuityState);
  const plannedSpeakerId = String(options.plannedSpeakerId || '').toLowerCase();
  const candidates = [];
  const addCandidate = (id, force = false) => {
    if (!CHARACTER_IDS.includes(id)) return;
    const relationship = relationshipFor(normalized, id, USER_ENTITY_ID);
    const labels = pressureLabelsForRelationship(relationship);
    const summary = relationshipSummaryFor(id, relationship, { force });
    if (!summary) return;
    const score = (id === plannedSpeakerId ? 1 : 0)
      + labels.length * 0.2
      + Number(relationship.repairNeeded || 0)
      + Number(relationship.recentPressure || 0)
      + Number(relationship.skepticism || 0) * 0.5;
    candidates.push({
      characterId: id,
      summary,
      pressureLabels: labels,
      plannedSpeaker: id === plannedSpeakerId,
      score
    });
  };
  if (plannedSpeakerId) addCandidate(plannedSpeakerId, true);
  CHARACTER_IDS.forEach(id => addCandidate(id));
  const seen = new Set();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter(item => {
      const key = `${item.characterId}:${item.summary}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MEMORY_CAPS.relationshipSummariesForAisha)
    .map(({ characterId, summary, pressureLabels, plannedSpeaker }) => ({
      characterId,
      summary: compact(summary, 160),
      pressureLabels: normalizeMemoryList(pressureLabels, { maxItems: 4, maxItemLength: 40 }),
      plannedSpeaker
    }));
}

function expressiveHabitatContextForAisha(continuityState = {}, options = {}) {
  const normalized = normalizeCharacterContinuityState(continuityState);
  const habitat = normalizeExpressiveHabitatState(normalized.expressiveHabitatV0);
  const plannedSpeakerId = String(options.plannedSpeakerId || '').toLowerCase();
  const plan = options.plan && typeof options.plan === 'object' ? options.plan : {};
  const pulses = CHARACTER_IDS.map(id => {
    const pulse = normalizePulseState(id, habitat.characterPulses[id], habitat.updatedAtTurn);
    return {
      characterId: id,
      displayName: characterDisplayName(id),
      label: safePulseDisplayLabel(pulse.visibleLabel || pulse.currentPulse, pulse.currentPulse)
    };
  }).slice(0, MEMORY_CAPS.expressivePulseSummary);
  const specialistGravitySummary = SPECIALIST_GRAVITY_IDS
    .map(id => {
      const item = habitat.specialistGravity[id] || {};
      const value = Number(item.value || 0);
      if (value <= 0) return null;
      const pulse = normalizePulseState(id, habitat.characterPulses[id], habitat.updatedAtTurn);
      return {
        characterId: id,
        displayName: characterDisplayName(id),
        status: value >= 2 ? 'ready' : 'building',
        label: safePulseDisplayLabel(pulse.visibleLabel || pulse.currentPulse, pulse.currentPulse)
      };
    })
    .filter(Boolean)
    .slice(0, MEMORY_CAPS.specialistGravitySummary);
  const authority = plan.intentFamily === 'aisha-takeover' ? 'takeover' : habitat.aishaAuthorityState;
  return {
    schemaVersion: EXPRESSIVE_SCHEMA_VERSION,
    roomMode: String(plan.intentFamily || options.roomMode || 'room'),
    roomMood: roomMoodLabel(habitat.roomMood),
    plannedSpeakerId,
    vanyaLeadStatus: 'Vanya is the lead social voice; she lands ordinary openings and defers to specialists when their domain is active.',
    aishaAuthorityState: authority,
    characterPulseSummary: pulses,
    specialistGravitySummary,
    expressionLevel: EXPRESSION_LEVEL_LABELS[habitat.expressionLevel] || EXPRESSION_LEVEL_LABELS[0],
    sideCommentAllowed: false,
    speakingConstraints: [
      'Only the planned speaker writes visible dialogue.',
      'Presence may be felt through posture; do not force extra speakers.',
      'Direct address stays with the addressed character.'
    ],
    forbiddenDrift: [
      'no raw pulse fields',
      'no relationship numbers',
      'no fake autonomy or consciousness claims',
      'no system/debug commentary'
    ],
    maxBubbleLength: 420
  };
}

function continuityPayloadForAisha(continuityState = {}, socialImpulses = [], options = {}) {
  const normalized = normalizeCharacterContinuityState(continuityState);
  const characterMemories = Object.fromEntries(
    CHARACTER_IDS.map(id => {
      const memory = normalizeCharacterMemory(id, normalized.characterMemories[id]);
      return [id, {
        characterId: memory.characterId,
        displayName: memory.displayName,
        stableTraits: memory.stableTraits,
        preferences: memory.preferences,
        dislikes: memory.dislikes,
        runningJokes: memory.runningJokes,
        projectAttachments: memory.projectAttachments,
        recentEmotionalNotes: memory.recentEmotionalNotes
      }];
    })
  );
  return {
    schemaVersion: normalized.schemaVersion,
    characterMemories,
    relationshipSummaries: relationshipSummariesForAisha(normalized, options),
    continuityEvents: normalizeContinuityEvents(normalized.continuityEvents)
      .filter(event => event.shouldPersist || Number(event.memoryImportance || 0) >= 0.5)
      .slice(-MEMORY_CAPS.recentContinuityEventsForAisha),
    roomSocialState: normalized.roomSocialState,
    socialImpulses: safeArray(socialImpulses.length ? socialImpulses : normalized.lastSocialImpulses, MEMORY_CAPS.lastSocialImpulses)
  };
}

module.exports = {
  SCHEMA_VERSION,
  MEMORY_CAPS,
  EXPRESSIVE_SCHEMA_VERSION,
  USER_ENTITY_ID,
  relationshipKey,
  normalizeMemoryList,
  createDefaultCharacterMemory,
  normalizeCharacterMemory,
  createDefaultRelationshipState,
  normalizeRelationshipState,
  normalizeRoomSocialState,
  normalizeExpressiveHabitatState,
  reduceExpressiveHabitatState,
  expressiveHabitatContextForAisha,
  safePulseLabel,
  safePulseDisplayLabel,
  roomMoodLabel,
  aishaTakeoverReason,
  normalizeCharacterContinuityState,
  calculateSocialImpulses,
  reduceCharacterContinuityState,
  continuityPayloadForAisha,
  continuityEventId,
  classifyRelationshipMoment,
  relationshipSummariesForAisha,
  isDesignCritique,
  isRepeatedFailure,
  isWarmCheckIn,
  isRunningJokeSignal
};
