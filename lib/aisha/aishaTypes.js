const AISHA_HOST_CONTRACT = Object.freeze({
  source: 'antigravity',
  commit: 'a569440',
  publicSurface: 'src/host/index.ts',
  contract: 'src/host/studioPulseContract.ts',
  wrapper: 'processAishaRequest(request, { deps, engineMode })'
});

function text(value = '') {
  return String(value == null ? '' : value).trim();
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeRecentMessage(item = {}) {
  return {
    id: text(item.id || item.messageId || ''),
    speakerId: text(item.speakerId || item.speaker_id || item.role || ''),
    role: text(item.role || item.kind || ''),
    content: text(item.content || item.text || item.message || ''),
    createdAt: text(item.createdAt || item.ts || item.timestamp || '')
  };
}

function normalizeCharacterStates(states = {}) {
  return Object.fromEntries(
    Object.entries(plainObject(states)).map(([id, state]) => [text(id).toLowerCase(), {
      presence: text(state?.presence || ''),
      mood: text(state?.mood || ''),
      attention: Number(state?.attention || 0) || 0,
      trustTowardUser: Number(state?.trustTowardUser || 0) || 0,
      irritation: Number(state?.irritation || 0) || 0,
      warmth: Number(state?.warmth || 0) || 0,
      energy: Number(state?.energy || 0) || 0,
      currentIntent: text(state?.currentIntent || ''),
      lastSpokeAt: text(state?.lastSpokeAt || ''),
      shortTermMemorySummary: text(state?.shortTermMemorySummary || '')
    }])
  );
}

/**
 * Local copy of the Antigravity Studio Pulse host request shape.
 * This is only a boundary contract. It does not import or vendor A.I.S.H.A.
 */
function createAishaStudioPulseRequest(input = {}) {
  const threadId = text(input.threadId || input.roomId || '');
  const sessionId = text(input.sessionId || threadId || 'studio-pulse-local-session');
  const localRoomState = plainObject(input.localRoomState);
  return {
    sessionId,
    userId: text(input.userId || 'local-user'),
    threadId,
    roomId: text(input.roomId || threadId || 'studio-pulse-room'),
    activeCharacterId: text(input.activeCharacterId || ''),
    activeSpeakerId: text(input.activeSpeakerId || input.activeCharacterId || ''),
    message: text(input.message || ''),
    recentMessages: (Array.isArray(input.recentMessages) ? input.recentMessages : [])
      .map(normalizeRecentMessage)
      .filter(item => item.content || item.speakerId)
      .slice(-24),
    projectContext: plainObject(input.projectContext),
    localRoomState,
    characterStates: normalizeCharacterStates(input.characterStates || localRoomState.characterStates || {}),
    modality: {
      surface: 'studio-pulse',
      input: 'text',
      output: 'text',
      ...(plainObject(input.modality))
    },
    hostContract: AISHA_HOST_CONTRACT
  };
}

function neutralStateEnvelope() {
  return {
    mood: 0,
    tension: 0,
    continuity: 0,
    confidence: 0,
    activeTruths: [],
    supersededTruths: [],
    notes: []
  };
}

function createDisconnectedAishaResponse(request = {}, overrides = {}) {
  const sessionId = text(request.sessionId || overrides.sessionId || 'studio-pulse-local-session');
  return {
    ok: false,
    responses: [{ speakerId: text(request.activeSpeakerId || request.activeCharacterId || ''), content: '[Mock A.I.S.H.A]' }],
    memorySummary: {
      activeTruths: [],
      supersededTruths: [],
      memoryCandidates: [],
      sessionId
    },
    stateEnvelope: neutralStateEnvelope(),
    relationshipDeltas: [],
    trace: {
      status: 'succeeded',
      adapter: 'mock-aisha-boundary',
      contractCommit: AISHA_HOST_CONTRACT.commit,
      note: 'Mock boundary executed; real A.I.S.H.A host is not connected.'
    },
    engineMode: 'mock',
    aishaEngineConnected: false,
    confidence: 0,
    fallbackReason: 'aisha-not-connected',
    ...plainObject(overrides)
  };
}

module.exports = {
  AISHA_HOST_CONTRACT,
  createAishaStudioPulseRequest,
  createDisconnectedAishaResponse,
  neutralStateEnvelope
};
