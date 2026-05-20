const {
  BANNED_VISIBLE_PHRASES,
  CHARACTER_IDS,
  RESPONSE_MODES,
  ROOM_MOODS,
  SPEAKER_ROLES,
  VISIBLE_STATES,
  compactText,
  directAddressTarget,
  explicitEveryoneRequested,
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
    roomState: sanitizeRecord(body.roomState, ['roomBeat', 'roomMood', 'responseMode', 'priorSpeaker']),
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
      text: 'visible dialogue, max 2 sentences'
    }],
    silentReactions: [{
      speakerId: CHARACTER_IDS,
      visibleState: VISIBLE_STATES
    }],
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
    ? `\nREPAIR REQUIRED\nPrevious output failed for: ${repair.issues.slice(0, 8).join(', ')}.\nRewrite as valid JSON. Do not repeat the failed phrasing.\n`
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
