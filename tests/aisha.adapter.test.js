const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAishaStudioPulseRequest,
  AISHA_HOST_CONTRACT
} = require('../lib/aisha/aishaTypes');
const {
  callAishaEngine,
  isUsableAishaResponse
} = require('../lib/aisha/aishaAdapter');

test('A.I.S.H.A local contract copy keeps the Antigravity host shape', () => {
  const request = createAishaStudioPulseRequest({
    sessionId: 'session-1',
    userId: 'user-1',
    threadId: 'thread-1',
    roomId: 'room-1',
    activeCharacterId: 'vanya',
    activeSpeakerId: 'vanya',
    message: 'hi team',
    recentMessages: [{ speakerId: 'user', text: 'hello' }],
    projectContext: { mode: 'direction' },
    localRoomState: { roomMood: 'steady' },
    characterStates: { vanya: { presence: 'active', mood: 'warm', warmth: 0.8 } },
    modality: { channel: 'text' }
  });

  assert.equal(AISHA_HOST_CONTRACT.commit, 'a569440');
  assert.equal(request.sessionId, 'session-1');
  assert.equal(request.userId, 'user-1');
  assert.equal(request.threadId, 'thread-1');
  assert.equal(request.roomId, 'room-1');
  assert.equal(request.activeCharacterId, 'vanya');
  assert.equal(request.activeSpeakerId, 'vanya');
  assert.equal(request.message, 'hi team');
  assert.equal(request.recentMessages[0].content, 'hello');
  assert.equal(request.projectContext.mode, 'direction');
  assert.equal(request.localRoomState.roomMood, 'steady');
  assert.equal(request.characterStates.vanya.presence, 'active');
  assert.equal(request.modality.surface, 'studio-pulse');
  assert.equal(request.modality.channel, 'text');
  assert.equal(request.hostContract.wrapper, 'processAishaRequest(request, { deps, engineMode })');
});

test('callAishaEngine returns disconnected mock metadata only', async () => {
  const response = await callAishaEngine({
    sessionId: 'session-2',
    threadId: 'thread-2',
    activeSpeakerId: 'aisha',
    message: 'hi team'
  });

  assert.equal(response.ok, false);
  assert.equal(response.engineMode, 'mock');
  assert.equal(response.aishaEngineConnected, false);
  assert.equal(response.confidence, 0);
  assert.equal(response.fallbackReason, 'aisha-not-connected');
  assert.equal(response.trace.status, 'succeeded');
  assert.equal(response.memorySummary.sessionId, 'session-2');
  assert.deepEqual(response.memorySummary.activeTruths, []);
  assert.deepEqual(response.memorySummary.supersededTruths, []);
  assert.deepEqual(response.memorySummary.memoryCandidates, []);
  assert.deepEqual(response.relationshipDeltas, []);
  assert.equal(response.responses[0].content, '[Mock A.I.S.H.A]');
  assert.equal(isUsableAishaResponse(response), false);
});
