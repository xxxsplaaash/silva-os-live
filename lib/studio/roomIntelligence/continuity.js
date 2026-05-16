const { CHARACTER_IDS, characterDisplayName } = require('./characters');

const USER_ENTITY_ID = 'user';
const SCHEMA_VERSION = 'studio-pulse.character-continuity.v0';

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

function safeArray(value, limit = 12) {
  return (Array.isArray(value) ? value : [])
    .map(item => (typeof item === 'string' ? item.trim() : item))
    .filter(Boolean)
    .slice(-limit);
}

function relationshipKey(fromCharacterId = '', toEntityId = '') {
  return `${String(fromCharacterId || '').toLowerCase()}__${String(toEntityId || '').toLowerCase()}`;
}

function createDefaultCharacterMemory(characterId = '') {
  const name = characterDisplayName(characterId);
  const defaults = {
    aisha: {
      stableTraits: ['room lead', 'standards keeper'],
      preferences: ['clear asks', 'earned confidence'],
      dislikes: ['vague performance', 'generic assistant tone']
    },
    leah: {
      stableTraits: ['taste reader', 'cultural critic'],
      preferences: ['specific references', 'fresh work'],
      dislikes: ['bland praise', 'trend cosplay']
    },
    claudia: {
      stableTraits: ['operations lead', 'delivery stabilizer'],
      preferences: ['owners', 'deadlines', 'clean scope'],
      dislikes: ['drift', 'unowned work']
    },
    grok: {
      stableTraits: ['diagnostic pattern reader', 'systems gremlin'],
      preferences: ['repeatable fixes', 'clean failure signals'],
      dislikes: ['fake fixes', 'mystery meat debugging']
    },
    vanya: {
      stableTraits: ['social pulse', 'morale reader'],
      preferences: ['human warmth', 'honest energy'],
      dislikes: ['flattened tone', 'performative care']
    }
  }[characterId] || {};
  return {
    characterId,
    displayName: name,
    stableTraits: safeArray(defaults.stableTraits, 10),
    preferences: safeArray(defaults.preferences, 10),
    dislikes: safeArray(defaults.dislikes, 10),
    runningJokes: [],
    projectAttachments: [],
    recentEmotionalNotes: []
  };
}

function normalizeCharacterMemory(characterId = '', input = {}) {
  const base = createDefaultCharacterMemory(characterId);
  const next = input && typeof input === 'object' ? input : {};
  return {
    ...base,
    ...next,
    characterId,
    displayName: String(next.displayName || base.displayName),
    stableTraits: safeArray([...(base.stableTraits || []), ...(next.stableTraits || [])], 16),
    preferences: safeArray([...(base.preferences || []), ...(next.preferences || [])], 16),
    dislikes: safeArray([...(base.dislikes || []), ...(next.dislikes || [])], 16),
    runningJokes: safeArray(next.runningJokes, 10),
    projectAttachments: safeArray(next.projectAttachments, 10),
    recentEmotionalNotes: safeArray(next.recentEmotionalNotes, 10)
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
    unresolvedSocialThreads: safeArray(next.unresolvedSocialThreads, 8),
    currentFloorHolder: String(next.currentFloorHolder || ''),
    suppressedSpeakers: safeArray(next.suppressedSpeakers, 5)
  };
}

function normalizeContinuityEvent(input = {}) {
  const next = input && typeof input === 'object' ? input : {};
  return {
    id: String(next.id || ''),
    timestamp: String(next.timestamp || ''),
    type: String(next.type || 'room-note'),
    characters: safeArray(next.characters, 5),
    userVisibleSummary: compact(next.userVisibleSummary || '', 180),
    memoryImportance: clamp01(next.memoryImportance, 0.3),
    relationshipDeltas: Array.isArray(next.relationshipDeltas) ? next.relationshipDeltas.slice(-8) : [],
    shouldPersist: next.shouldPersist !== false
  };
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
    continuityEvents: safeArray(prev.continuityEvents, 24).map(normalizeContinuityEvent).filter(item => item.id || item.userVisibleSummary),
    lastSocialImpulses: safeArray(prev.lastSocialImpulses, 10),
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
    } else if (eventType === 'emotional-check-in' || eventType === 'room-greeting') {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.04, trust: 0.01, protectiveness: id === 'vanya' || id === 'aisha' ? 0.02 : 0, reason: eventType });
    } else if (/\b(tease|joke|lol|haha)\b/i.test(perception.text || '')) {
      deltas.push({ fromCharacterId: id, toEntityId: USER_ENTITY_ID, warmth: 0.03, rivalry: 0.02, reason: 'teasing' });
    }
  });
  return deltas;
}

function updateMemoryForEvent(state, event = {}, perception = {}) {
  const text = compact(perception.text || event.userVisibleSummary || '', 140);
  (event.characters || []).forEach(id => {
    const memory = state.characterMemories[id];
    if (!memory) return;
    if (event.type === 'pattern-failure' && id === 'grok') {
      memory.projectAttachments = safeArray([...memory.projectAttachments, text || 'Repeated failure pattern'], 10);
      memory.recentEmotionalNotes = safeArray([...memory.recentEmotionalNotes, 'Noted a repeated failure pattern.'], 10);
    } else if (event.type === 'design-critique' && id === 'leah') {
      memory.preferences = safeArray([...memory.preferences, 'design critique with receipts'], 16);
      memory.recentEmotionalNotes = safeArray([...memory.recentEmotionalNotes, 'Leaned in for a taste/critique read.'], 10);
    } else if (event.type === 'emotional-check-in' && id === 'vanya') {
      memory.recentEmotionalNotes = safeArray([...memory.recentEmotionalNotes, 'User asked for a warmer human read.'], 10);
    } else if (event.type === 'room-greeting' && id === 'vanya') {
      memory.runningJokes = safeArray([...memory.runningJokes, 'Grok treats silence like mystique.'], 10);
    }
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
  const deltas = relationshipDeltasFor({ eventType, turns: visibleTurns, perception })
    .map(delta => applyRelationshipDelta(next, delta, now))
    .filter(Boolean);
  const shouldPersist = !['room-greeting', 'room-turn'].includes(eventType) || deltas.length > 0;
  const event = normalizeContinuityEvent({
    id: `cont_${Date.now()}_${eventType}_${speakers.join('_') || 'room'}`,
    timestamp: now,
    type: eventType,
    characters: speakers,
    userVisibleSummary: compact(perception.text || eventType, 180),
    memoryImportance: eventType === 'conflict-boundary' || eventType === 'pattern-failure' ? 0.78 : eventType === 'design-critique' ? 0.58 : 0.36,
    relationshipDeltas: deltas,
    shouldPersist
  });
  if (event.characters.length || event.userVisibleSummary) {
    next.continuityEvents = safeArray([...next.continuityEvents, event], 24);
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
  next.lastSocialImpulses = safeArray(socialImpulses, 10);
  next.updatedAt = now;
  return next;
}

function continuityPayloadForAisha(continuityState = {}, socialImpulses = []) {
  const normalized = normalizeCharacterContinuityState(continuityState);
  return {
    schemaVersion: normalized.schemaVersion,
    characterMemories: normalized.characterMemories,
    relationshipStates: normalized.relationshipStates,
    continuityEvents: safeArray(normalized.continuityEvents, 12),
    roomSocialState: normalized.roomSocialState,
    socialImpulses: safeArray(socialImpulses.length ? socialImpulses : normalized.lastSocialImpulses, 10)
  };
}

module.exports = {
  SCHEMA_VERSION,
  USER_ENTITY_ID,
  relationshipKey,
  createDefaultCharacterMemory,
  normalizeCharacterMemory,
  createDefaultRelationshipState,
  normalizeRelationshipState,
  normalizeRoomSocialState,
  normalizeCharacterContinuityState,
  calculateSocialImpulses,
  reduceCharacterContinuityState,
  continuityPayloadForAisha,
  isDesignCritique,
  isRepeatedFailure,
  isWarmCheckIn
};
