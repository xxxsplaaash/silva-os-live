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
  unresolvedSocialThreads: 8,
  suppressedSpeakers: 5
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

function compact(value = '', max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
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
  if (/\b(again|still|keeps|repeated|same problem|same issue|same error|failed again|broke again|broken again|not working again)\b/.test(text)) {
    return true;
  }
  return safeArray(continuityState.continuityEvents, 24)
    .some(event => event.type === 'pattern-failure' && /fail|broke|error|not working/i.test(event.userVisibleSummary || ''));
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
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (perception.asksEveryone) {
    CHARACTER_IDS.forEach(id => {
      impulses[id] = makeImpulse(id, id === 'vanya' ? 'support' : id === 'leah' || id === 'grok' ? 'challenge' : 'speak', 0.82, 'explicit-room-invitation', perception, USER_ENTITY_ID);
    });
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (perception.taskType === 'conflict') {
    impulses.aisha = makeImpulse('aisha', 'challenge', 0.94, 'room-boundary-needed', perception, USER_ENTITY_ID);
    impulses.vanya = makeImpulse('vanya', 'support', 0.82, 'de-escalate-with-warmth', perception, USER_ENTITY_ID);
    impulses.grok = makeImpulse('grok', 'challenge', 0.76, 'diagnose-hostile-signal', perception, USER_ENTITY_ID);
    impulses.leah = makeImpulse('leah', 'withdraw', 0.58, 'heat-without-useful-brief', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (perception.taskType === 'greeting') {
    impulses.vanya = makeImpulse('vanya', 'speak', 0.86, 'warm-room-entry', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', social.tension >= 0.62 || roomState.recentTension >= 0.62 ? 'support' : 'observe', social.tension >= 0.62 ? 0.68 : 0.42, 'room-lead-holding-shape', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (perception.taskType === 'planning') {
    impulses.claudia = makeImpulse('claudia', 'speak', 0.9, 'planning-needs-operations-owner', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', 'observe', 0.48, 'authority-available-if-scope-drifts', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (isRepeatedFailure(perception, continuity)) {
    impulses.grok = makeImpulse('grok', 'speak', 0.94, 'repeated-failure-pattern', perception, USER_ENTITY_ID);
    impulses.claudia = makeImpulse('claudia', 'observe', 0.56, 'delivery-risk-visible', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (isDesignCritique(perception)) {
    impulses.leah = makeImpulse('leah', 'challenge', 0.9, 'taste-and-design-critique', perception, USER_ENTITY_ID);
    impulses.grok = makeImpulse('grok', 'challenge', /\b(pattern|structure|system|logo|layout)\b/i.test(perception.text || perception.topicFocus || '') ? 0.7 : 0.5, 'structure-read-available', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (isWarmCheckIn(perception)) {
    impulses.vanya = makeImpulse('vanya', 'support', 0.88, 'emotional-room-check-in', perception, USER_ENTITY_ID);
    impulses.aisha = makeImpulse('aisha', social.tension >= 0.5 || perception.emotionalTone === 'worried' ? 'support' : 'observe', social.tension >= 0.5 ? 0.66 : 0.54, 'room-lead-can-hold-the-floor', perception, USER_ENTITY_ID);
    return CHARACTER_IDS.map(id => impulses[id]);
  }

  if (perception.taskType === 'technical') {
    impulses.grok = makeImpulse('grok', 'speak', 0.84, 'technical-diagnosis-needed', perception, USER_ENTITY_ID);
  } else if (perception.taskType === 'creative') {
    impulses.leah = makeImpulse('leah', 'speak', 0.8, 'creative-taste-needed', perception, USER_ENTITY_ID);
  }
  return CHARACTER_IDS.map(id => impulses[id]);
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
    lastMeaningfulInteraction: now
  };
  state.relationshipStates[key] = next;
  return { ...delta, fromCharacterId: from, toEntityId: to };
}

function eventTypeFor(perception = {}, plan = {}) {
  if (perception.taskType === 'conflict') return 'conflict-boundary';
  if (isRepeatedFailure(perception, plan.continuityState || {})) return 'pattern-failure';
  if (isRunningJokeSignal(perception, plan.continuityState || {})) return 'running-joke';
  if (isDesignCritique(perception)) return 'design-critique';
  if (perception.taskType === 'planning') return 'planning-alignment';
  if (isWarmCheckIn(perception)) return 'emotional-check-in';
  if (perception.taskType === 'greeting') return 'room-greeting';
  if (perception.asksEveryone) return 'room-opinion';
  return 'room-turn';
}

function relationshipDeltasFor({ eventType = '', turns = [], perception = {} } = {}) {
  const speakers = (Array.isArray(turns) ? turns : []).map(turn => String(turn.speakerId || '').toLowerCase()).filter(id => CHARACTER_IDS.includes(id));
  const deltas = [];
  speakers.forEach(id => {
    if (eventType === 'conflict-boundary') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, irritation: 0.08, warmth: -0.03, trust: -0.01, respect: 0.02, reason: 'conflict-boundary' });
    } else if (eventType === 'design-critique') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, respect: 0.03, rivalry: id === 'leah' ? 0.03 : 0.01, reason: 'design-critique' });
    } else if (eventType === 'planning-alignment') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, respect: 0.03, trust: 0.02, reason: 'planning-alignment' });
    } else if (eventType === 'emotional-check-in') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.04, trust: 0.01, protectiveness: id === 'vanya' || id === 'aisha' ? 0.02 : 0, reason: eventType });
    } else if (eventType === 'running-joke') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.03, rivalry: 0.02, reason: 'teasing' });
    }
  });
  return deltas;
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
    if (event.type === 'pattern-failure' && id === 'grok') {
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
    : relationshipDeltasFor({ eventType, turns: visibleTurns, perception })
      .map(delta => applyRelationshipDelta(next, delta, now))
      .filter(Boolean);
  const meaningfulEventTypes = new Set([
    'conflict-boundary',
    'pattern-failure',
    'running-joke',
    'design-critique',
    'planning-alignment',
    'emotional-check-in'
  ]);
  const shouldPersist = meaningfulEventTypes.has(eventType) || deltas.length > 0;
  const event = normalizeContinuityEvent({
    id: eventId,
    timestamp: now,
    type: eventType,
    characters: speakers,
    userVisibleSummary: summary,
    memoryImportance: eventType === 'conflict-boundary' || eventType === 'pattern-failure' ? 0.78 : eventType === 'design-critique' ? 0.58 : 0.36,
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
  const tensionTarget = perception.taskType === 'conflict'
    ? 0.72
    : eventType === 'design-critique'
      ? Math.max(currentSocial.tension, 0.24)
      : Math.max(0.08, currentSocial.tension - 0.04);
  const warmthTarget = eventType === 'emotional-check-in' || eventType === 'room-greeting'
    ? Math.min(1, currentSocial.warmth + 0.05)
    : eventType === 'conflict-boundary'
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
  next.updatedAt = now;
  return normalizeCharacterContinuityState(next, { threadId: next.threadId || threadId, roomId: next.roomId || roomId });
}

function continuityPayloadForAisha(continuityState = {}, socialImpulses = []) {
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
    relationshipStates: normalized.relationshipStates,
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
  USER_ENTITY_ID,
  relationshipKey,
  normalizeMemoryList,
  createDefaultCharacterMemory,
  normalizeCharacterMemory,
  createDefaultRelationshipState,
  normalizeRelationshipState,
  normalizeRoomSocialState,
  normalizeCharacterContinuityState,
  calculateSocialImpulses,
  reduceCharacterContinuityState,
  continuityPayloadForAisha,
  continuityEventId,
  isDesignCritique,
  isRepeatedFailure,
  isWarmCheckIn,
  isRunningJokeSignal
};
