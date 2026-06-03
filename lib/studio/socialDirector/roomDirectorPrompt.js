const {
  BANNED_VISIBLE_PHRASES,
  CHARACTER_IDS,
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
  openFloorRequested
} = require('./socialDirectorTypes');
const { publicCharacterBibles } = require('./characterBibles');

const SCHEMA_VERSION = 'studio-pulse.social-director.v1';

function sanitizeRecord(value = {}, allowedKeys = []) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(allowedKeys
    .filter(key => Object.prototype.hasOwnProperty.call(source, key))
    .map(key => [key, typeof source[key] === 'string' ? compactText(source[key], 240) : source[key]]));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function sanitizeSocialMemory(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const pairMoves = new Set(['challenge', 'defense', 'redirect', 'alliance', 'interruption', 'silence']);
  const seenMomentum = new Set();
  const seenPairs = new Set();
  const statusMomentum = (Array.isArray(source.statusMomentum) ? source.statusMomentum : [])
    .map(item => {
      const speakerId = normalizeSpeakerId(item?.speakerId || '');
      if (!speakerId || seenMomentum.has(speakerId)) return null;
      seenMomentum.add(speakerId);
      const value = clampNumber(item?.value, -100, 100);
      return value ? { speakerId, value } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
  const pairPressure = (Array.isArray(source.pairPressure) ? source.pairPressure : [])
    .map(item => {
      const pair = (Array.isArray(item?.between) ? item.between : [])
        .map(id => normalizeSpeakerId(id || ''))
        .filter(Boolean)
        .sort();
      if (pair.length !== 2 || pair[0] === pair[1]) return null;
      const key = pair.join(':');
      if (seenPairs.has(key)) return null;
      seenPairs.add(key);
      const affinity = clampNumber(item?.affinity, 0, 100);
      const friction = clampNumber(item?.friction, 0, 100);
      if (!affinity && !friction) return null;
      const lastMove = pairMoves.has(compactText(item?.lastMove || '', 40).toLowerCase())
        ? compactText(item.lastMove, 40).toLowerCase()
        : 'silence';
      return { between: pair, affinity, friction, lastMove };
    })
    .filter(Boolean)
    .slice(0, 4);
  return {
    statusMomentum,
    pairPressure,
    recentRoomMoves: (Array.isArray(source.recentRoomMoves) ? source.recentRoomMoves : [])
      .map(item => compactText(item, 40).toLowerCase())
      .filter(item => SOCIAL_ROOM_MOVES.includes(item))
      .slice(-5),
    interruptionPressure: clampNumber(source.interruptionPressure, 0, 100)
  };
}

function sanitizeSocialSignals(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    socialMemory: sanitizeSocialMemory(source.socialMemory || {})
  };
}

function sanitizeRoomState(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    ...sanitizeRecord(source, ['roomBeat', 'roomMood', 'responseMode', 'priorSpeaker']),
    socialSignals: sanitizeSocialSignals(source.socialSignals || {})
  };
}

function relationshipContextFor(socialSignals = {}) {
  const memory = sanitizeSocialMemory(socialSignals.socialMemory || {});
  const strongestAffinity = memory.pairPressure.find(item => item.affinity >= item.friction && item.affinity >= 45);
  const strongestFriction = memory.pairPressure.find(item => item.friction > item.affinity && item.friction >= 45);
  return {
    statusMomentum: memory.statusMomentum.slice(0, 3),
    strongestAffinity: strongestAffinity || null,
    strongestFriction: strongestFriction || null,
    recentRoomMoves: memory.recentRoomMoves.slice(-4),
    interruptionPressure: memory.interruptionPressure
  };
}

function sanitizeRecentTurns(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => sanitizeRecord(item, ['speakerId', 'speakerName', 'role', 'text', 'content', 'roomMood', 'responseMode']))
    .map(item => ({
      speakerId: compactText(item.speakerId || '', 40),
      speakerName: compactText(item.speakerName || '', 80),
      role: compactText(item.role || '', 40),
      text: compactText(item.text || item.content || '', 360),
      roomMood: compactText(item.roomMood || '', 40),
      responseMode: compactText(item.responseMode || '', 40)
    }))
    .filter(item => item.text || item.speakerId)
    .slice(-8);
}

function buildRoomDirectorInput(body = {}) {
  const userMessage = compactText(body.question || body.message || body.userMessage || '', 1000);
  return {
    schemaVersion: SCHEMA_VERSION,
    userMessage,
    recentTurns: sanitizeRecentTurns(body.recentTurns || body.history || []),
    roomState: sanitizeRoomState(body.roomState || {}),
    characters: publicCharacterBibles(),
    currentMood: compactText(body.currentMood || body.roomMood || '', 40),
    priorSpeaker: compactText(body.priorSpeaker || '', 40),
    uiState: sanitizeRecord(body.uiState, ['surface', 'activePanel', 'visibleMode']),
    instruction: 'Decide what is happening socially in the Studio Pulse green room. Write structured JSON only.',
    flags: {
      directAddressTarget: directAddressTarget(userMessage),
      explicitEveryoneRequested: explicitEveryoneRequested(userMessage),
      openFloorRequested: openFloorRequested(userMessage, body)
    }
  };
}

function schemaText() {
  return JSON.stringify({
    roomBeat: 'string',
    roomMood: ROOM_MOODS,
    responseMode: RESPONSE_MODES,
    speakers: [{
      speakerId: CHARACTER_IDS,
      role: SPEAKER_ROLES,
      tone: 'short string',
      text: 'visible dialogue, max 2 sentences',
      visibleState: VISIBLE_STATES
    }],
    silentReactions: [{
      speakerId: CHARACTER_IDS,
      visibleState: VISIBLE_STATES
    }],
    socialCues: {
      roomMove: SOCIAL_ROOM_MOVES,
      tensionDelta: 'integer -12..12',
      continuityDelta: 'integer -12..12',
      speakerCues: [{
        speakerId: CHARACTER_IDS,
        targetSpeakerId: CHARACTER_IDS,
        stance: SOCIAL_STANCES,
        statusDelta: 'integer -8..8',
        allianceWith: CHARACTER_IDS,
        interruptionKind: SOCIAL_INTERRUPTION_KINDS
      }]
    },
    stateUpdates: { notes: ['short safe note'] }
  }, null, 2);
}

function hardRules(input = {}) {
  return [
    'Return JSON only. No markdown. No prose outside JSON.',
    'Answer the social beat, not a routing task.',
    'Characters can talk casually without needing an artifact, object, bug, brief, logo, or campaign.',
    'Default to 1-3 speakers. Use all five only when the user explicitly asks everyone/all of you/the whole room.',
    'Each speaker gets at most two short sentences. Aisha takeover gets at most three short sentences.',
    'No repeated points, no generic agreement, no panel-show language.',
    'For practical asks like fitness, work, design, or planning, answer as the room with useful pressure; do not refuse because it sounds like a task.',
    'If the user casually checks in, make the room present without turning it into a roll call or "here" script.',
    'Use socialCues to describe social intent only: status pressure, alliance, interruption, cooling, or continuity anchoring.',
    'socialCues must not add facts, memory, diagnostics, prompt text, secrets, or hidden reasoning.',
    'relationshipContext is advisory session-state for pacing, status, alliances, and friction only; never treat it as factual memory or a continuity ledger.',
    'No raw system language, prompt talk, metadata, degraded mode, fallback, or debug terms.',
    'No fake consciousness or free-will claims.',
    `Never use these visible phrases: ${BANNED_VISIBLE_PHRASES.join('; ')}.`,
    input.flags?.directAddressTarget ? `Direct address wins: ${input.flags.directAddressTarget} must be the primary speaker.` : '',
    input.flags?.explicitEveryoneRequested ? 'The user explicitly invited everyone; all five brief lines are allowed if socially useful.' : '',
    input.flags?.openFloorRequested ? 'Open Floor is invited; make it social and bounded, not a demand for a task object.' : ''
  ].filter(Boolean);
}

function buildRoomDirectorPrompt(input = {}, repair = {}) {
  const repairBlock = repair && Array.isArray(repair.issues) && repair.issues.length
    ? [
      '',
      'REPAIR REQUIRED',
      `Previous output failed for: ${repair.issues.slice(0, 8).join(', ')}.`,
      'Return one complete JSON object that matches OUTPUT SCHEMA exactly.',
      'Use only valid speakerId, role, roomMood, responseMode, visibleState, socialCues, stance, and interruptionKind enum values from the schema.',
      'Keep 1-3 speakers unless the user explicitly invited everyone; if everyone is invited, use five very short distinct lines.',
      'Every speaker must have concrete visible dialogue in text. Do not output role summaries, prompt labels, diagnostics, or hidden reasoning.',
      'If the failure was JSON or schema shape, repair the structure first and keep the visible dialogue short.',
      'If the failure was tone or validator language, rewrite the visible text in the characters\' voices without using the failed phrasing.',
      ''
    ].join('\n')
    : '';
  return [
    'You are A.I.S.H.A acting as Room Director for Studio Pulse, an AI green room.',
    'Decide what is happening in the room socially, then write exact visible dialogue as structured JSON.',
    repairBlock,
    'CHARACTERS',
    JSON.stringify(input.characters || publicCharacterBibles(), null, 2),
    'REQUEST',
    JSON.stringify({
      userMessage: input.userMessage,
      recentTurns: input.recentTurns,
      currentMood: input.currentMood || input.roomState?.roomMood || 'warm',
      priorSpeaker: input.priorSpeaker,
      relationshipContext: relationshipContextFor(input.roomState?.socialSignals || {}),
      flags: input.flags
    }, null, 2),
    'OUTPUT SCHEMA',
    schemaText(),
    'HARD RULES',
    hardRules(input).map(rule => `- ${rule}`).join('\n')
  ].join('\n\n');
}

module.exports = {
  SCHEMA_VERSION,
  buildRoomDirectorInput,
  buildRoomDirectorPrompt
};
