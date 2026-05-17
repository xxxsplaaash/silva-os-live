const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAishaStudioPulseRequest,
  AISHA_HOST_CONTRACT
} = require('../lib/aisha/aishaTypes');
const {
  callAishaEngine,
  isUsableAishaResponse,
  getAishaResponseUsability,
  __setAishaRuntimeImporterForTests
} = require('../lib/aisha/aishaAdapter');

async function withAishaFlag(value, fn) {
  const original = process.env.AISHA_ENGINE_ENABLED;
  if (value == null) delete process.env.AISHA_ENGINE_ENABLED;
  else process.env.AISHA_ENGINE_ENABLED = String(value);
  try {
    await fn();
  } finally {
    if (original == null) delete process.env.AISHA_ENGINE_ENABLED;
    else process.env.AISHA_ENGINE_ENABLED = original;
    __setAishaRuntimeImporterForTests(null);
  }
}

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
  assert.equal(request.messageText, 'hi team');
  assert.equal(request.message, 'hi team');
  assert.equal(request.recentMessages[0].content, 'hello');
  assert.equal(request.projectContext.mode, 'direction');
  assert.equal(request.localRoomState.roomMood, 'steady');
  assert.equal(request.characterStates.vanya.presence, 'active');
  assert.equal(request.characterStates.vanya.personId, 'vanya');
  assert.equal(request.modalityMetadata.sourceModality, 'text');
  assert.equal(request.modalityMetadata.sourceChannel, 'chat');
  assert.equal(request.modality.surface, 'studio-pulse');
  assert.equal(request.modality.channel, 'text');
  assert.equal(request.hostContract.wrapper, 'processAishaRequest(request, { deps, engineMode })');
});

test('callAishaEngine returns disconnected mock metadata only when flag is off', async () => {
  await withAishaFlag(undefined, async () => {
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
    assert.equal(response.diagnostics.requestShapeSummary.hasMessageText, true);
    assert.equal(response.diagnostics.rejectionReason, 'aisha-not-connected');
  });
});

test('callAishaEngine returns unavailable when linked package is missing', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => {
      const err = new Error('Cannot find module aisha-runtime-pack1');
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    });
    const response = await callAishaEngine({ sessionId: 'session-missing', message: 'hi team' });

    assert.equal(response.ok, false);
    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'aisha-runtime-unavailable');
    assert.deepEqual(response.responses, []);
    assert.equal(isUsableAishaResponse(response), false);
    assert.equal(response.diagnostics.packageImportOk, false);
    assert.equal(response.diagnostics.rejectionReason, 'aisha-runtime-unavailable');
  });
});

test('callAishaEngine rejects linked package without public processAishaRequest', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({}));
    const response = await callAishaEngine({ sessionId: 'session-missing-export', message: 'hi team' });

    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'aisha-runtime-missing-public-surface');
    assert.equal(isUsableAishaResponse(response), false);
    assert.equal(response.diagnostics.packageImportOk, true);
    assert.equal(response.diagnostics.processAishaRequestType, 'undefined');
    assert.equal(response.diagnostics.rejectionReason, 'aisha-runtime-missing-public-surface');
  });
});

test('callAishaEngine safely falls back when processAishaRequest throws', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => {
        throw new Error('GEMINI_API_KEY should never leak here');
      }
    }));
    const response = await callAishaEngine({ sessionId: 'session-throw', message: 'hi team' });

    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'aisha-runtime-failed');
    assert.equal(JSON.stringify(response), JSON.stringify(response).replace(/GEMINI_API_KEY/g, ''));
    assert.equal(isUsableAishaResponse(response), false);
    assert.equal(response.diagnostics.rejectionReason, 'aisha-runtime-failed');
  });
});

test('callAishaEngine accepts mocked public host production response', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async specifier => {
      assert.equal(specifier, 'aisha-runtime-pack1');
      return {
        processAishaRequest: async (request, options) => {
          assert.equal(request.messageText, 'hi team');
          assert.equal(options.engineMode, 'production');
          assert.equal(Object.prototype.hasOwnProperty.call(options, 'deps'), false);
          assert.equal(options.productionGeminiApiKey, 'test-provider-vault-key');
          return {
            ok: true,
            responses: [{ speakerId: 'vanya', content: 'A.I.S.H.A live response' }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.1 },
            relationshipDeltas: [],
            trace: { status: 'succeeded' },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.91
          };
        }
      };
    });
    const response = await callAishaEngine(
      { sessionId: 'session-real', message: 'hi team' },
      { productionGeminiApiKey: 'test-provider-vault-key', productionGeminiKeySource: 'Mock Gemini vault' }
    );

    assert.equal(response.ok, true);
    assert.equal(response.engineMode, 'production');
    assert.equal(response.aishaEngineConnected, true);
    assert.equal(response.confidence, 0.91);
    assert.equal(response.sourcePackage, 'aisha-runtime-pack1');
    assert.equal(response.responses[0].content, 'A.I.S.H.A live response');
    assert.equal(isUsableAishaResponse(response), true);
    assert.deepEqual(getAishaResponseUsability(response), { usable: true, reason: '' });
    assert.equal(response.diagnostics.packageImportOk, true);
    assert.equal(response.diagnostics.processAishaRequestType, 'function');
    assert.equal(response.diagnostics.requestShapeSummary.hasMessageText, true);
    assert.equal(response.diagnostics.runtimeCredentialProvided, true);
    assert.equal(response.diagnostics.runtimeCredentialLength, 'test-provider-vault-key'.length);
    assert.equal(response.diagnostics.runtimeCredentialSource, 'Mock Gemini vault');
    assert.equal(response.diagnostics.responseOk, true);
    assert.equal(response.diagnostics.responseEngineMode, 'production');
    assert.equal(response.diagnostics.responseConnected, true);
    assert.equal(response.diagnostics.responseCount, 1);
    assert.equal(response.diagnostics.firstResponseHasContent, true);
    assert.equal(response.diagnostics.rejectionReason, '');
  });
});

test('callAishaEngine preserves safe runtime trace diagnostics for unavailable production response', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async (request, options) => {
        assert.equal(options.productionGeminiApiKey, 'test-provider-vault-key');
        return {
          ok: false,
          responses: [{ content: 'A.I.S.H.A is not available in this environment. Using local fallback.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0 },
          relationshipDeltas: [],
          trace: { status: 'failed', failureReason: 'Gemini API key invalid' },
          engineMode: 'production',
          aishaEngineConnected: false,
          confidence: 0,
          fallbackReason: 'Gemini API key invalid'
        };
      }
    }));
    const response = await callAishaEngine(
      { sessionId: 'session-trace', message: 'hi team' },
      { productionGeminiApiKey: 'test-provider-vault-key', productionGeminiKeySource: 'Mock Gemini vault' }
    );

    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'not-connected');
    assert.equal(response.diagnostics.responseTraceStatus, 'failed');
    assert.equal(response.diagnostics.responseTraceFailureReason, 'Gemini API key invalid');
    assert.equal(response.diagnostics.responseFallbackReason, 'Gemini API key invalid');
    assert.equal(response.diagnostics.responseCount, 1);
    assert.equal(response.diagnostics.firstResponseHasContent, true);
    assert.equal(response.diagnostics.runtimeCredentialProvided, true);
    assert.equal(response.diagnostics.runtimeCredentialLength, 'test-provider-vault-key'.length);
  });
});

test('callAishaEngine rejects connected production response with no responses', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => ({
        ok: true,
        responses: [],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: 'session-empty' },
        stateEnvelope: { mood: 0.1 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: true,
        confidence: 0.9
      })
    }));
    const response = await callAishaEngine({ sessionId: 'session-empty', message: 'hi team' });

    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'no-responses');
    assert.equal(response.diagnostics.responseOk, true);
    assert.equal(response.diagnostics.responseConnected, true);
    assert.equal(response.diagnostics.responseCount, 0);
    assert.equal(response.diagnostics.firstResponseHasContent, false);
    assert.equal(response.diagnostics.rejectionReason, 'no-responses');
    assert.equal(isUsableAishaResponse(response), false);
  });
});

test('callAishaEngine rejects contentful response when engine is disconnected', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => ({
        ok: true,
        responses: [{ content: 'Should not be shown' }],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: 'session-disconnected' },
        stateEnvelope: { mood: 0.1 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: false,
        confidence: 0.9
      })
    }));
    const response = await callAishaEngine({ sessionId: 'session-disconnected', message: 'hi team' });

    assert.equal(response.engineMode, 'unavailable');
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.fallbackReason, 'not-connected');
    assert.equal(response.diagnostics.responseOk, false);
    assert.equal(response.diagnostics.responseConnected, false);
    assert.equal(response.diagnostics.responseCount, 1);
    assert.equal(response.diagnostics.firstResponseHasContent, true);
    assert.equal(response.diagnostics.rejectionReason, 'not-connected');
    assert.deepEqual(getAishaResponseUsability({ engineMode: 'production', aishaEngineConnected: false, responses: [{ content: 'x' }] }), {
      usable: false,
      reason: 'not-connected'
    });
  });
});
