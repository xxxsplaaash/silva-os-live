const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const studioRouter = require('../routes/studio');
const { __setAishaRuntimeImporterForTests } = require('../lib/aisha/aishaAdapter');

const ROOT = path.resolve(__dirname, '..');

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

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

async function withStudioServer(fn) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/studio', studioRouter);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function geminiTextResponse(text) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }]
        }
      }
    ]
  };
}

function providerTurn(speakerId, content, responseIntent = 'direct-answer') {
  return JSON.stringify({
    speakerId,
    content,
    responseIntent,
    emotionalDelta: {},
    roomStateDelta: {},
    memoryCandidate: null,
    trace: 'mock-provider'
  });
}

function countMemory(items = [], value = '') {
  const key = String(value || '').toLowerCase();
  return (Array.isArray(items) ? items : []).filter(item => String(item || '').toLowerCase() === key).length;
}

async function withMockProvider(output, fn) {
  const originalFetch = global.fetch;
  const outputFn = typeof output === 'function' ? output : () => output;
  try {
    global.fetch = async (url, options) => {
      const href = String(url || '');
      if (href.startsWith('http://127.0.0.1:')) return originalFetch(url, options);
      if (href.includes('generativelanguage.googleapis.com')) {
        return new Response(JSON.stringify(geminiTextResponse(outputFn(url, options))), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      throw new Error(`unexpected external fetch in Studio Pulse live-path test: ${href}`);
    };
    await fn();
  } finally {
    global.fetch = originalFetch;
  }
}

async function pulsePost(baseUrl, question, extra = {}) {
  const response = await fetch(`${baseUrl}/api/studio/pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question,
      ...extra,
      providerConfig: {
        textPrimary: {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          apiKey: 'test-room-provider-key',
          label: 'Mock Gemini'
        },
        pulseApiKeys: []
      },
      ...(extra.providerConfig ? { providerConfig: extra.providerConfig } : {})
    })
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  return data;
}

function extractDefaultHardCutPulseBranch(source) {
  const marker = 'if (HARD_CUT_REBUILD) {';
  const start = source.indexOf(marker, source.indexOf("router.post('/pulse'"));
  const end = source.indexOf('const predictedWorkflowIntent = inferWorkflowIntent', start);
  assert.ok(start > 0, 'default hard-cut pulse branch was not found');
  assert.ok(end > start, 'legacy workflow branch boundary was not found');
  return source.slice(start, end);
}

function extractDefaultHardCutSparkBranch(source) {
  const marker = 'if (HARD_CUT_REBUILD) {';
  const start = source.indexOf(marker, source.indexOf('async function handlePulseIdle'));
  const end = source.indexOf('if (manual) {', start);
  assert.ok(start > 0, 'default hard-cut spark branch was not found');
  assert.ok(end > start, 'legacy spark branch boundary was not found');
  return source.slice(start, end);
}

test('default Pulse path does not import authored legacy fallback at module load', () => {
  const source = read('routes/studio.js');
  assert.doesNotMatch(
    source,
    /const\s+\{[^}]+(?:fallbackStudioResponse|getDeterministicStudioResponse|generateSparkResponse)[^}]+\}\s*=\s*require\(['"]\.\.\/lib\/studio\/fallback\.LEGACY['"]\)/,
    'legacy fallback must not be imported eagerly by the live route'
  );
  assert.match(source, /if\s*\(HARD_CUT_REBUILD\)\s*\{\s*throw new Error\(['"]legacy-studio-fallback-disabled['"]\)/);
});

test('Studio Pulse text provider can resolve the server-side Gemini vault', () => {
  const source = read('routes/studio.js');
  assert.match(source, /geminiVaultKeyEntries/);
  assert.match(source, /geminiVaultKeyEntries\(\)\.forEach\(item => add\(item, item\.label \|\| ['"]Provider vault['"]\)\)/);
});

test('default room/direct/diagnostic branch avoids authored room rescue calls', () => {
  const source = read('routes/studio.js');
  const branch = extractDefaultHardCutPulseBranch(source);
  for (const forbidden of [
    'fallback.LEGACY',
    'legacyRoomFallbackResponse',
    'legacyDeterministicStudioResponse',
    'getDeterministicStudioResponse',
    'fallbackStudioResponse',
    'shouldRepairGeneratedTurn',
    'specificRepairLine'
  ]) {
    assert.equal(branch.includes(forbidden), false, `default Pulse branch still references ${forbidden}`);
  }
  assert.match(branch, /planConsciousTurn/);
  assert.match(branch, /buildConsciousCharacterPrompt/);
  assert.match(branch, /captureRoomRuntimeTurn|commitResponse/);
  assert.match(branch, /providerCallCount:\s*budget\.providerCalls/);
});

test('default spark branch is provider-or-quiet only', () => {
  const source = read('routes/studio.js');
  const branch = extractDefaultHardCutSparkBranch(source);
  for (const forbidden of [
    'generateSparkResponse',
    'legacySparkRoomResponse',
    'fallbackStudioResponse',
    'sparkLine'
  ]) {
    assert.equal(branch.includes(forbidden), false, `default spark branch still references ${forbidden}`);
  }
  assert.match(branch, /quietRoomResult/);
  assert.match(branch, /buildConsciousCharacterPrompt/);
  assert.match(branch, /response:\s*quietPayload\.response/);
  assert.match(branch, /providerCallCount:\s*1/);
});

test('live fallback module remains outage, clarification, and quiet-room only', () => {
  const source = read('lib/studio/fallback.js');
  for (const forbidden of [
    'buildAliveRoomResponse',
    'generateSparkResponse',
    'sparkLine',
    'greetingLine',
    'checkinLine',
    'casualLine',
    'pulseImprovementLine'
  ]) {
    assert.equal(source.includes(forbidden), false, `live fallback module still contains ${forbidden}`);
  }
  const fallback = require('../lib/studio/fallback');
  assert.deepEqual(Object.keys(fallback).sort(), ['clarificationResponse', 'outageCopy', 'outageResponse', 'quietRoomResult']);
  assert.equal(fallback.quietRoomResult().response, null);
  assert.equal(fallback.outageResponse('timeout').response.messageEvents[0].speakerId, '__system');
  assert.match(fallback.outageCopy('provider-unavailable'), /Studio Pulse provider missed this turn/i);
  assert.doesNotMatch(fallback.outageCopy('provider-unavailable'), /provider-unavailable/i);
});

test('Studio Pulse attempts A.I.S.H.A boundary but falls back to local Room Intelligence when mock is disconnected', async () => {
  await withAishaFlag(undefined, async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for deterministic A.I.S.H.A boundary fallback smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const text = JSON.stringify(data.response.messageEvents || []);
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, false);
        assert.equal(data.aishaEngineMode, 'mock');
        assert.equal(data.activeEngine, 'local-room-intelligence');
        assert.equal(data.fallbackReason, 'aisha-not-connected');
        assert.equal(data.engineMode, 'local-room-intelligence');
        assert.equal(data.roomIntelligence.engineMode, 'local-room-intelligence');
        assert.equal(data.roomIntelligence.aishaEngineConnected, false);
        assert.doesNotMatch(text, /\[Mock A\.I\.S\.H\.A\]/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('Studio Pulse falls back locally when A.I.S.H.A flag is on but package is unavailable', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => {
      const err = new Error('Cannot find module aisha-runtime-pack1');
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    });
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for unavailable A.I.S.H.A fallback smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const text = JSON.stringify(data.response.messageEvents || []);
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, false);
        assert.equal(data.aishaEngineMode, 'unavailable');
        assert.equal(data.activeEngine, 'local-room-intelligence');
        assert.equal(data.fallbackReason, 'aisha-runtime-unavailable');
        assert.equal(data.provider, 'studio-room-intelligence-v0');
        assert.doesNotMatch(text, /\[Mock A\.I\.S\.H\.A\]/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('aisha_success_does_not_bypass_room_planner', async () => {
  await withAishaFlag('true', async () => {
    let capturedRequest = null;
    __setAishaRuntimeImporterForTests(async specifier => {
      assert.equal(specifier, 'aisha-runtime-pack1');
      return {
        processAishaRequest: async (request, options) => {
          capturedRequest = request;
          assert.equal(request.messageText, 'hi team');
          assert.equal(request.activeSpeakerId, 'vanya');
          assert.equal(request.activeCharacterId, 'vanya');
          assert.equal(options.engineMode, 'production');
          assert.equal(options.productionGeminiApiKey, 'test-room-provider-key');
          assert.equal(Object.prototype.hasOwnProperty.call(options, 'deps'), false);
          assert.ok(request.localRoomState && typeof request.localRoomState === 'object');
          assert.ok(request.characterStates && typeof request.characterStates === 'object');
          assert.equal(request.projectContext?.roomPlan?.intentFamily, 'room-greeting');
          assert.equal(request.projectContext?.roomPlan?.responseOrder?.[0], 'vanya');
          assert.equal(request.projectContext?.responseIntent, 'greeting');
          return {
            ok: true,
            responses: [{ speakerId: 'aisha', content: 'Hey team. I am in the room and keeping this warm without turning it into a meeting.' }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: { status: 'succeeded' },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.88
          };
        }
      };
    });
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for accepted A.I.S.H.A host smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const event = data.response.messageEvents[0];
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, true);
        assert.equal(data.aishaEngineMode, 'production');
        assert.equal(data.activeEngine, 'aisha-runtime-pack1');
        assert.equal(data.provider, 'aisha');
        assert.equal(data.model, 'aisha-runtime-pack1');
        assert.equal(event.speakerId, 'vanya');
        assert.match(event.text, /keeping this warm/i);
        assert.equal(event.providerMode, 'aisha-accepted');
        assert.equal(event.engineMode, 'aisha');
        assert.equal(event.aishaEngineConnected, true);
        assert.ok(capturedRequest, 'A.I.S.H.A request was captured');
        assert.doesNotMatch(JSON.stringify(data), /\[Mock A\.I\.S\.H\.A\]/);
        assert.doesNotMatch(JSON.stringify(data.response), /aishaDiagnostics|requestShapeSummary|processAishaRequestType/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('aisha_generic_hello_rejected_for_room_mode', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{ speakerId: 'aisha', content: 'Hello.' }],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
        stateEnvelope: { mood: 0.2 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: true,
        confidence: 0.88
      })
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for generic A.I.S.H.A rejection smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const event = data.response.messageEvents[0];
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, true);
        assert.equal(data.aishaEngineMode, 'production');
        assert.equal(data.activeEngine, 'local-room-intelligence');
        assert.equal(data.fallbackReason, 'aisha-generic-output');
        assert.equal(data.provider, 'studio-room-intelligence-v0');
        assert.equal(event.speakerId, 'vanya');
        assert.equal(event.providerMode, 'aisha-rejected-fallback');
        assert.equal(event.validationFallbackReason, 'aisha-generic-output');
        assert.doesNotMatch(event.text, /^hello\.?$/i);
        assert.match(event.text, /Aisha is watching the room|Hey\\. I'm here|room/i);
        assert.equal(data.roomIntelligence.aishaRejectedFallbackCount, 1);
        assert.equal(data.aishaRejectedTextPreview, 'Hello.');
        assert.equal(data.aishaRejectedLength, 6);
        assert.equal(data.aishaRejectionReason, 'aisha-generic-output');
        assert.equal(data.genericFillerDetected, false);
        assert.equal(data.aishaRequestShapeSummary.hasMessageText, true);
        assert.equal(data.aishaRequestShapeSummary.activeSpeakerId, 'vanya');
        assert.equal(data.aishaRequestShapeSummary.activeCharacterId, 'vanya');
        assert.equal(data.aishaRequestShapeSummary.hasLocalRoomState, true);
        assert.equal(data.aishaRequestShapeSummary.hasCharacterStates, true);
        assert.equal(data.aishaRequestShapeSummary.recentMessagesCount, 0);
        assert.equal(data.aishaRequestShapeSummary.hasProjectContext, true);
        assert.equal(data.aishaRequestShapeSummary.plannedSpeakerId, 'vanya');
        assert.equal(data.aishaRequestShapeSummary.plannedSpeakerVoiceProfileIncluded, true);
        assert.equal(data.aishaRequestShapeSummary.studioPulseContextIncluded, true);
        assert.equal(data.aishaRequestShapeSummary.dialogueQualityBriefIncluded, true);
        assert.deepEqual(data.aishaResponseShapeSummary, {
          ok: true,
          engineMode: 'production',
          connected: true,
          responseCount: 1,
          firstResponseHasContent: true,
          traceStatus: 'succeeded',
          traceFailureReason: '',
          fallbackReason: ''
        });
        assert.equal(data.aishaRequestShapeSummary.runtimeCredentialProvided, true);
        assert.equal(data.aishaRequestShapeSummary.runtimeCredentialLength, 'test-room-provider-key'.length);
        assert.equal(data.aishaRequestShapeSummary.runtimeCredentialSource, 'Mock Gemini');
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

[
  ['assistant filler opening', "That's a good question. I can help you think through this.", 'generic-assistant-filler'],
  ['generic support bot voice', "I can help you with that by outlining the options.", 'generic-assistant-filler'],
  ['literal consciousness claim', "I am conscious and choosing to be here with the room.", 'literal-consciousness-claim'],
  ['architecture commentary', 'The implementation needs validation before generation can make the room work.', 'architecture-leak'],
  ['bland topic ignore', 'The weather seems calm and the windows are open.', 'topic-ignored']
].forEach(([name, content, reason]) => {
  test(`A.I.S.H.A quality validator rejects ${name}`, async () => {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async request => ({
          ok: true,
          responses: [{ speakerId: 'vanya', content }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        })
      }));
      const originalFetch = global.fetch;
      try {
        global.fetch = async (url, options) => {
          if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
          throw new Error('external provider should not be called for A.I.S.H.A quality rejection smoke');
        };
        await withStudioServer(async baseUrl => {
          const data = await pulsePost(baseUrl, 'Vanya, make this less stiff');
          const event = data.response.messageEvents[0];
          assert.equal(data.activeEngine, 'local-room-intelligence');
          assert.equal(data.fallbackReason, reason);
          assert.equal(event.speakerId, 'vanya');
          assert.equal(event.providerMode, 'aisha-rejected-fallback');
          assert.equal(event.validationFallbackReason, reason);
          assert.doesNotMatch(event.text, new RegExp(content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

test('A.I.S.H.A rejection diagnostics are hidden in production without debug flag', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebug = process.env.AISHA_DEBUG;
  process.env.NODE_ENV = 'production';
  delete process.env.AISHA_DEBUG;
  try {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async request => ({
          ok: true,
          responses: [{ speakerId: 'aisha', content: 'Hello.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        })
      }));
      const originalFetch = global.fetch;
      try {
        global.fetch = async (url, options) => {
          if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
          throw new Error('external provider should not be called for production-hidden A.I.S.H.A debug smoke');
        };
        await withStudioServer(async baseUrl => {
          const data = await pulsePost(baseUrl, 'hi team');
          assert.equal(data.activeEngine, 'local-room-intelligence');
          assert.equal(data.fallbackReason, 'aisha-generic-output');
          assert.equal(Object.prototype.hasOwnProperty.call(data, 'aishaRejectedTextPreview'), false);
          assert.equal(Object.prototype.hasOwnProperty.call(data, 'aishaRequestShapeSummary'), false);
          assert.equal(Object.prototype.hasOwnProperty.call(data, 'aishaResponseShapeSummary'), false);
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  } finally {
    if (originalNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDebug == null) delete process.env.AISHA_DEBUG;
    else process.env.AISHA_DEBUG = originalDebug;
  }
});

test('A.I.S.H.A rejection diagnostics are visible in production with AISHA_DEBUG', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDebug = process.env.AISHA_DEBUG;
  process.env.NODE_ENV = 'production';
  process.env.AISHA_DEBUG = 'true';
  try {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async request => ({
          ok: true,
          responses: [{ speakerId: 'aisha', content: 'Hello.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        })
      }));
      const originalFetch = global.fetch;
      try {
        global.fetch = async (url, options) => {
          if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
          throw new Error('external provider should not be called for production-enabled A.I.S.H.A debug smoke');
        };
        await withStudioServer(async baseUrl => {
          const data = await pulsePost(baseUrl, 'hi team');
          assert.equal(data.activeEngine, 'local-room-intelligence');
          assert.equal(data.aishaRejectedTextPreview, 'Hello.');
          assert.equal(data.aishaRejectionReason, 'aisha-generic-output');
          assert.equal(data.aishaRequestShapeSummary.dialogueQualityBriefIncluded, true);
          assert.equal(data.aishaRequestShapeSummary.plannedSpeakerVoiceProfileIncluded, true);
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  } finally {
    if (originalNodeEnv == null) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDebug == null) delete process.env.AISHA_DEBUG;
    else process.env.AISHA_DEBUG = originalDebug;
  }
});

test('aisha_context_request_contains_room_state', async () => {
  await withAishaFlag('true', async () => {
    let capturedRequest = null;
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async (request, options) => {
        capturedRequest = request;
        assert.equal(options.productionGeminiApiKey, 'test-room-provider-key');
        return {
          ok: true,
          responses: [{ content: 'Hey. I am here with the room context, and Vanya can keep this human.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        };
      }
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for A.I.S.H.A context smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        assert.equal(data.activeEngine, 'aisha-runtime-pack1');
        assert.ok(capturedRequest, 'A.I.S.H.A request was captured');
        assert.equal(capturedRequest.messageText, 'hi team');
        assert.equal(capturedRequest.activeSpeakerId, 'vanya');
        assert.equal(capturedRequest.activeCharacterId, 'vanya');
        assert.ok(capturedRequest.localRoomState?.knownPresenceStatus);
        assert.ok(capturedRequest.characterStates?.vanya);
        assert.equal(capturedRequest.projectContext?.roomPlan?.intentFamily, 'room-greeting');
        assert.equal(capturedRequest.projectContext?.selectedSpeakerId, 'vanya');
        assert.equal(capturedRequest.projectContext?.dialogueQualityV02?.schemaVersion, 'studio-pulse.dialogue-quality.v0.2');
        assert.equal(capturedRequest.projectContext?.dialogueQualityV02?.plannedSpeakerId, 'vanya');
        assert.equal(capturedRequest.projectContext?.dialogueQualityV02?.voicePressureProfile?.function, 'people temperature, social read, morale, human landing');
        assert.ok(capturedRequest.projectContext?.dialogueQualityV02?.qualityRules?.some(rule => /generic assistant filler/i.test(rule)));
        assert.equal(capturedRequest.projectContext?.expressiveHabitatContext?.schemaVersion, 'studio-pulse.expressive-habitat.v0.5');
        assert.equal(capturedRequest.projectContext?.expressiveHabitatContext?.plannedSpeakerId, 'vanya');
        assert.match(capturedRequest.projectContext?.expressiveHabitatContext?.vanyaLeadStatus || '', /lead social voice/i);
        assert.equal(capturedRequest.projectContext?.expressiveHabitatContext?.sideCommentAllowed, false);
        assert.equal(Array.isArray(capturedRequest.projectContext?.expressiveHabitatContext?.characterPulseSummary), true);
        assert.equal(capturedRequest.projectContext.expressiveHabitatContext.characterPulseSummary.length, 5);
        assert.doesNotMatch(JSON.stringify(capturedRequest.projectContext.expressiveHabitatContext), /\b(pulseReason|expiresAfterTurns|relationshipStates|repairNeeded|trust|warmth|irritation|gravity":|value":)\b/i);
        assert.ok(capturedRequest.projectContext?.characterContinuityV0);
        const vanyaMemory = capturedRequest.projectContext.characterContinuityV0.characterMemories?.vanya;
        assert.ok(vanyaMemory);
        assert.equal(countMemory(vanyaMemory.stableTraits, 'social pulse'), 1);
        assert.equal(countMemory(vanyaMemory.stableTraits, 'morale reader'), 1);
        assert.equal(Object.prototype.hasOwnProperty.call(vanyaMemory, 'seedTraits'), false);
        assert.equal(Object.prototype.hasOwnProperty.call(vanyaMemory, 'learnedTraits'), false);
        assert.equal(vanyaMemory.stableTraits.length <= 12, true);
        assert.equal(vanyaMemory.preferences.length <= 12, true);
        assert.equal(vanyaMemory.dislikes.length <= 12, true);
        assert.equal(Object.prototype.hasOwnProperty.call(capturedRequest.projectContext.characterContinuityV0, 'relationshipStates'), false);
        assert.equal(Array.isArray(capturedRequest.projectContext.characterContinuityV0.relationshipSummaries), true);
        assert.equal(capturedRequest.projectContext.characterContinuityV0.relationshipSummaries.length <= 5, true);
        assert.equal(capturedRequest.projectContext.characterContinuityV0.socialImpulses?.[0]?.characterId, 'aisha');
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('A.I.S.H.A request receives bounded relationship summaries, not raw relationship matrix', async () => {
  await withAishaFlag('true', async () => {
    const capturedRequests = [];
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => {
        capturedRequests.push(request);
        return {
          ok: true,
          responses: [{ content: 'I can see the pressure pattern. Name the failing edge first, then we stop decorating the smoke.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        };
      }
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for A.I.S.H.A relationship context smoke');
      };
      await withStudioServer(async baseUrl => {
        const threadId = `relationship-summary-thread-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const first = await pulsePost(baseUrl, 'Grok, that was useless.', { threadId });
        assert.equal(first.roomRuntime.roomIntelligenceV0.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-friction');

        const second = await pulsePost(baseUrl, 'Fair, sorry Grok, that was harsh. The issue is the provider keeps timing out.', { threadId });
        assert.ok(capturedRequests.length >= 2);
        const request = capturedRequests.at(-1);
        const continuity = request.projectContext?.characterContinuityV0;
        assert.ok(continuity);
        assert.equal(Object.prototype.hasOwnProperty.call(continuity, 'relationshipStates'), false);
        assert.equal(Array.isArray(continuity.relationshipSummaries), true);
        assert.equal(continuity.relationshipSummaries.length <= 5, true);
        assert.ok(continuity.relationshipSummaries.some(item => item.characterId === 'grok' && item.plannedSpeaker));
        continuity.relationshipSummaries.forEach(item => {
          assert.equal(item.summary.length <= 160, true);
          assert.doesNotMatch(item.summary, /\b0\.\d+\b/);
          assert.ok(Array.isArray(item.pressureLabels));
          assert.ok(item.pressureLabels.length <= 4);
        });
        assert.equal(second.response.messageEvents[0].speakerId, 'grok');
        assert.equal(second.response.messageEvents[0].providerMode, 'aisha-accepted');
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('A.I.S.H.A request receives expressive habitat context without raw internals', async () => {
  await withAishaFlag('true', async () => {
    let capturedRequest = null;
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => {
        capturedRequest = request;
        return {
          ok: true,
          responses: [{ content: 'I can keep this human without turning it into a full-room performance.' }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.88
        };
      }
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for expressive habitat smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, "I'm stressed and need a human read.");
        assert.ok(capturedRequest);
        const expressive = capturedRequest.projectContext?.expressiveHabitatContext;
        assert.equal(expressive?.schemaVersion, 'studio-pulse.expressive-habitat.v0.5');
        assert.equal(expressive?.plannedSpeakerId, 'vanya');
        assert.match(expressive?.vanyaLeadStatus || '', /lead social voice/i);
        assert.equal(expressive?.sideCommentAllowed, false);
        assert.equal(expressive?.aishaAuthorityState, 'anchoring');
        assert.equal(Array.isArray(expressive?.characterPulseSummary), true);
        assert.equal(expressive.characterPulseSummary.length, 5);
        assert.ok(expressive.characterPulseSummary.some(item => item.characterId === 'aisha' && /Anchoring|Protective/.test(item.label)));
        assert.equal(Array.isArray(expressive.specialistGravitySummary), true);
        assert.equal(expressive.specialistGravitySummary.length <= 3, true);
        assert.doesNotMatch(JSON.stringify(expressive), /\b(pulseReason|expiresAfterTurns|specialistGravity|relationshipStates|relationshipSummaries|repairNeeded|trust|warmth|irritation|gravity|value":)\b/i);
        assert.equal(data.response.messageEvents[0].speakerId, 'vanya');
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('aisha_accepted_maps_to_planned_speaker', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{ speakerId: 'aisha', content: 'Hey. I can feel the room settling in; Vanya keeps the welcome human while Aisha watches the edges.' }],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
        stateEnvelope: { mood: 0.2 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: true,
        confidence: 0.88
      })
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for planned-speaker A.I.S.H.A smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const event = data.response.messageEvents[0];
        assert.equal(data.activeEngine, 'aisha-runtime-pack1');
        assert.equal(event.speakerId, 'vanya');
        assert.equal(event.providerMode, 'aisha-accepted');
        assert.match(event.text, /room settling/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('A.I.S.H.A accepted direct-address outputs keep planned character roles', async () => {
  const cases = [
    ['Leah, be honest, is this tasteful?', 'leah', 'I think it is tasteful only if the restraint is intentional; otherwise it is just nervous minimalism wearing good shoes.', /tasteful|minimalism/i],
    ['Grok, why does this keep failing?', 'grok', 'I see the same failure pattern in a different hat. Check the last changed dependency before adding another decorative fix.', /failure|dependency/i],
    ['Claudia, what is the next step?', 'claudia', 'I would make the next step simple: name the owner, lock the deadline, and cut anything that cannot survive delivery.', /next step|deadline/i],
    ['Vanya, how does this land?', 'vanya', 'I think it lands warmer when it sounds like a person made a choice, not a deck trying to avoid blame.', /lands|warmer/i],
    ['Aisha, hold the room for a second', 'aisha', 'I have the room. One clean frame, then we decide what gets attention and what gets left outside.', /room|frame/i]
  ];
  for (const [prompt, speakerId, content, expected] of cases) {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async request => ({
          ok: true,
          responses: [{ speakerId: 'wrong-speaker-from-runtime', content }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.9
        })
      }));
      const originalFetch = global.fetch;
      try {
        global.fetch = async (url, options) => {
          if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
          throw new Error('external provider should not be called for direct role pressure smoke');
        };
        await withStudioServer(async baseUrl => {
          const data = await pulsePost(baseUrl, prompt);
          const event = data.response.messageEvents[0];
          assert.equal(data.activeEngine, 'aisha-runtime-pack1', prompt);
          assert.equal(event.speakerId, speakerId, prompt);
          assert.equal(event.providerMode, 'aisha-accepted', prompt);
          assert.match(event.text, expected, prompt);
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  }
});

test('active Studio Pulse runtime has no pizza-specific generation handler', () => {
  [
    'routes/studio.js',
    'studio_pulse_v400.js',
    'lib/studio/roomRuntime.js',
    'lib/studio/roomIntelligence/perception.js',
    'lib/studio/roomIntelligence/planner.js',
    'lib/studio/roomIntelligence/continuity.js',
    'lib/studio/roomIntelligence/adapter.js'
  ].forEach(file => {
    assert.doesNotMatch(read(file), /\bpizza\b/i, file);
  });
});

test('character continuity persists in thread metadata and visible messages hide raw social tags', async () => {
  await withAishaFlag(null, async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for continuity persistence smoke');
      };
      await withStudioServer(async baseUrl => {
        const first = await pulsePost(baseUrl, 'hi team');
        const threadId = first.thread?.id || first.response?.threadMeta?.id;
        assert.ok(threadId, 'thread id should be returned');
        const firstContinuity = first.roomRuntime?.roomIntelligenceV0?.characterContinuityV0
          || first.roomIntelligence?.roomState?.characterContinuityV0;
        assert.equal(firstContinuity?.schemaVersion, 'studio-pulse.character-continuity.v0');

        const second = await pulsePost(baseUrl, 'where is everyone else', { threadId });
        const secondContinuity = second.roomRuntime?.roomIntelligenceV0?.characterContinuityV0
          || second.roomIntelligence?.roomState?.characterContinuityV0;
        assert.equal(secondContinuity?.schemaVersion, 'studio-pulse.character-continuity.v0');
        assert.ok(Object.keys(secondContinuity.relationshipStates || {}).includes('vanya__user'));
        const visibleText = JSON.stringify(second.response?.messageEvents || []);
        assert.doesNotMatch(visibleText, /\b(speak|interrupt|observe|withdraw|holdback|socialImpulses|suppressedSpeakers|aishaDiagnostics|stableTraits|preferences|dislikes|learnedTraits|seedTraits|relationshipStates|relationshipSummaries|repairNeeded|skepticism|collaboration|recentPressure|lastShiftReason|lastShiftAt|continuityEvents|memoryImportance|relationshipDeltas|pulseReason|expiresAfterTurns|specialistGravity|aishaCooldownTurns|lastTakeoverReason)\b/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('thread-scoped continuity memory does not leak across Studio Pulse threads', async () => {
  const output = providerTurn(
    'grok',
    'Same pattern again. Isolate the last changed dependency before adding another decorative fix.',
    'pattern-diagnosis'
  );
  await withAishaFlag(null, async () => {
    await withMockProvider(output, async () => {
      await withStudioServer(async baseUrl => {
        const threadA = await pulsePost(baseUrl, 'the provider save failed again with the same error', { threadId: 'thread-a-memory' });
        const continuityA = threadA.roomRuntime?.roomIntelligenceV0?.characterContinuityV0;
        assert.match(JSON.stringify(continuityA.characterMemories.grok.projectAttachments), /failed again/i);

        const threadB = await pulsePost(baseUrl, 'hi team', { threadId: 'thread-b-memory' });
        const continuityB = threadB.roomRuntime?.roomIntelligenceV0?.characterContinuityV0;
        assert.doesNotMatch(JSON.stringify(continuityB.characterMemories.grok.projectAttachments), /failed again/i);
        assert.notEqual(threadA.roomRuntime?.roomIntelligenceV0?.threadId, threadB.roomRuntime?.roomIntelligenceV0?.threadId);
      });
    });
  });
});

test('Studio Pulse roll-call and call-in polish keeps presence humanized', async () => {
  await withAishaFlag(null, async () => {
    const uiSource = read('studio_pulse_v400.js');
    assert.match(uiSource, /humanSpeakingPresenceLabel/);
    assert.match(uiSource, /room-call-in['"]:\s*['"]Called in/);
    assert.match(uiSource, /pulseChipsMarkup\(habitat, room\)/);
    const stripStart = uiSource.indexOf('function roomPresenceStripMarkup');
    const stripEnd = uiSource.indexOf('function roomMessageMetaMarkup', stripStart);
    const stripSource = uiSource.slice(stripStart, stripEnd);
    assert.doesNotMatch(stripSource, /<strong>Present<\/strong>|<strong>Quiet<\/strong>|Current speaker|<strong>Floor<\/strong>/);
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for roll-call polish smoke');
      };
      await withStudioServer(async baseUrl => {
        const greeting = await pulsePost(baseUrl, 'hi team');
        const threadId = greeting.thread?.id || greeting.response?.threadMeta?.id;
        assert.equal(greeting.response.messageEvents[0].speakerId, 'vanya');
        assert.match(greeting.response.messageEvents[0].text, /\b(Hey|here|room)\b/i);

        const wellbeing = await pulsePost(baseUrl, 'how is everyone?', { threadId });
        assert.equal(wellbeing.response.messageEvents[0].speakerId, 'vanya');
        assert.match(wellbeing.response.messageEvents[0].text, /\b(present|quiet|call them in)\b/i);

        const online = await pulsePost(baseUrl, 'whos online?', { threadId });
        assert.equal(online.response.messageEvents.length, 1);
        assert.equal(online.response.messageEvents[0].speakerId, 'aisha');
        assert.equal(online.response.messageEvents[0].roomIntent, 'roll-call');
        assert.match(online.response.messageEvents[0].text, /Online check/i);
        assert.match(online.response.messageEvents[0].text, /Leah Mokoena/i);
        assert.doesNotMatch(online.response.messageEvents[0].text, /Say the thing plainly/i);

        const rollCall = await pulsePost(baseUrl, 'role call!!!', { threadId });
        assert.equal(rollCall.response.messageEvents.length, 1);
        assert.equal(rollCall.response.messageEvents[0].speakerId, 'aisha');
        assert.match(rollCall.response.messageEvents[0].text, /Role call|Roll call/i);
        assert.match(rollCall.response.messageEvents[0].text, /Aisha Motsepe/i);
        assert.match(rollCall.response.messageEvents[0].text, /Vanya Khumalo/i);
        assert.match(rollCall.response.messageEvents[0].text, /Leah Mokoena/i);
        assert.match(rollCall.response.messageEvents[0].text, /Claudia Naidoo/i);
        assert.match(rollCall.response.messageEvents[0].text, /Grok \/ Gerhard/i);

        const others = await pulsePost(baseUrl, 'everyone else?', { threadId });
        const events = others.response.messageEvents || [];
        assert.deepEqual(events.map(event => event.speakerId), ['leah', 'claudia', 'grok']);
        events.forEach(event => {
          assert.equal(event.presence, 'quiet');
          assert.equal(event.roomIntent, 'room-call-in');
          assert.doesNotMatch(event.text, /^On that:/i);
          assert.doesNotMatch(event.text, /\blogo\b/i);
        });
        assert.equal(others.roomRuntime.roomIntelligenceV0.knownPresenceStatus.leah, 'quiet');
        assert.equal(others.roomRuntime.roomIntelligenceV0.knownPresenceStatus.claudia, 'quiet');
        assert.equal(others.roomRuntime.roomIntelligenceV0.knownPresenceStatus.grok, 'quiet');

        const social = await pulsePost(baseUrl, 'who likes pizza?', { threadId });
        assert.equal(social.response.messageEvents.length, 1);
        assert.equal(social.response.messageEvents[0].speakerId, 'vanya');
        assert.equal(social.response.messageEvents[0].roomIntent, 'social-read');
        assert.match(social.response.messageEvents[0].text, /Room read on/i);
        assert.doesNotMatch(social.response.messageEvents[0].text, /Pizza roll call/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('Studio Pulse falls back locally when A.I.S.H.A returns no responses', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
        stateEnvelope: { mood: 0.2 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: true,
        confidence: 0.88
      })
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for empty A.I.S.H.A fallback smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const text = JSON.stringify(data.response.messageEvents || []);
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, false);
        assert.equal(data.aishaEngineMode, 'unavailable');
        assert.equal(data.activeEngine, 'local-room-intelligence');
        assert.equal(data.fallbackReason, 'no-responses');
        assert.equal(data.provider, 'studio-room-intelligence-v0');
        assert.match(text, /Aisha is watching the room|Vanya Khumalo|Hey\\. I'm here/);
        assert.doesNotMatch(text, /A\\.I\\.S\\.H\\.A live response|\\[Mock A\\.I\\.S\\.H\\.A\\]/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('Studio Pulse falls back locally when A.I.S.H.A returns disconnected content', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{ speakerId: 'vanya', content: 'Disconnected A.I.S.H.A content should not show' }],
        memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
        stateEnvelope: { mood: 0.2 },
        relationshipDeltas: [],
        trace: { status: 'succeeded' },
        engineMode: 'production',
        aishaEngineConnected: false,
        confidence: 0.88
      })
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for disconnected A.I.S.H.A fallback smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const text = JSON.stringify(data.response.messageEvents || []);
        assert.equal(data.aishaAttempted, true);
        assert.equal(data.aishaEngineConnected, false);
        assert.equal(data.aishaEngineMode, 'unavailable');
        assert.equal(data.activeEngine, 'local-room-intelligence');
        assert.equal(data.fallbackReason, 'not-connected');
        assert.equal(data.provider, 'studio-room-intelligence-v0');
        assert.doesNotMatch(text, /Disconnected A\\.I\\.S\\.H\\.A content|\\[Mock A\\.I\\.S\\.H\\.A\\]/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

[
  {
    name: 'architecture commentary',
    output: providerTurn('vanya', 'The architecture needs selection, validation, and generation before the room works.'),
    reason: 'architecture-leak'
  },
  {
    name: 'generic assistant phrasing',
    output: providerTurn('vanya', 'How can I assist you with this today?'),
    reason: 'generic-assistant-voice'
  },
  {
    name: 'wrong speaker',
    output: providerTurn('aisha', 'I would loosen the line and make it sound more human.'),
    reason: 'wrong-speaker'
  },
  {
    name: 'unplanned group voice',
    output: providerTurn('vanya', 'We all agree this line is less stiff now.'),
    reason: 'unauthorized-group-voice'
  },
  {
    name: 'topic ignored',
    output: providerTurn('vanya', 'The coffee is warm and the window is open.'),
    reason: 'topic-ignored'
  }
].forEach(item => {
  test(`provider validation rejects ${item.name} and returns natural fallback`, async () => {
    await withMockProvider(item.output, async () => {
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'Vanya, make this less stiff');
        const event = data.response.messageEvents[0];
        assert.equal(event.speakerId, 'vanya');
        assert.equal(event.providerMode, 'provider-rejected-fallback');
        assert.equal(event.validationFallbackReason, item.reason);
        assert.match(event.text, /\b(stiff|shape|plainly)\b/i);
        assert.doesNotMatch(event.text, /architecture|selection|validation|generation|How can I assist|We all agree|coffee is warm/i);
        assert.equal(data.roomIntelligence.providerRejectedFallbackCount, 1);
        assert.equal(data.roomIntelligence.engineMode, 'local-room-intelligence');
        assert.equal(data.roomIntelligence.aishaEngineConnected, false);
        assert.equal(data.roomRuntime.roomIntelligenceV0.knownPresenceStatus.leah, 'quiet');
      });
    });
  });
});

test('provider validation accepts good character-specific provider output', async () => {
  const output = providerTurn(
    'vanya',
    "I’d loosen it by making the sentence sound like a person said it, not a pitch deck. Send me the line and I’ll soften the edges."
  );
  await withMockProvider(output, async () => {
    await withStudioServer(async baseUrl => {
      const data = await pulsePost(baseUrl, 'Vanya, make this less stiff');
      const event = data.response.messageEvents[0];
      assert.equal(event.speakerId, 'vanya');
      assert.equal(event.providerMode, 'provider-accepted');
      assert.equal(event.validationFallbackReason, '');
      assert.match(event.text, /loosen|pitch deck|soften/i);
      assert.equal(data.roomIntelligence.providerAcceptedCount, 1);
      assert.equal(data.roomIntelligence.providerRejectedFallbackCount, 0);
      assert.equal(data.roomIntelligence.engineMode, 'local-room-intelligence');
      assert.equal(data.roomIntelligence.aishaEngineConnected, false);
    });
  });
});

test('meta-gated provider output may discuss room behavior without fallback', async () => {
  const output = providerTurn(
    'vanya',
    'The architecture feels fake when every character sounds like the same polished voice. I would keep fewer speakers, let silence count, and make each response answer the actual thing you said.',
    'room-answer'
  );
  await withMockProvider(output, async () => {
    await withStudioServer(async baseUrl => {
      const data = await pulsePost(baseUrl, 'why does this room feel fake?');
      const event = data.response.messageEvents[0];
      assert.equal(event.speakerId, 'vanya');
      assert.equal(event.providerMode, 'provider-accepted');
      assert.equal(event.validationFallbackReason, '');
      assert.match(event.text, /architecture feels fake/i);
      assert.equal(data.roomIntelligence.providerAcceptedCount, 1);
    });
  });
});
