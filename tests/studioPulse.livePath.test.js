const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const studioRouter = require('../routes/studio');
const { __setAishaRuntimeImporterForTests } = require('../lib/aisha/aishaAdapter');

const ROOT = path.resolve(__dirname, '..');
const FORBIDDEN_FALLBACK_QUALITY_RX = /\b(I hear |I will keep this human|Say the thing plainly|Give me the thing|I need the object|if that is the object|the actual break|Room read on that|Taste read:\s*if|Delivery read:\s*that|hold the useful signal on that)\b/i;

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
  if (typeof studioRouter.__resetPulseShowcaseGuardForTests === 'function') {
    studioRouter.__resetPulseShowcaseGuardForTests();
  }
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

function exchangeLabelOf(event = {}) {
  return String(event.exchangeLabel || event.metadata?.exchangeLabel || '');
}

function visibleText(events = []) {
  return (Array.isArray(events) ? events : []).map(event => String(event.text || event.content || '')).join('\n');
}

function parseSseEvents(value = '') {
  return String(value || '')
    .split(/\n\n+/)
    .map(block => {
      const lines = block.split(/\r?\n/);
      const event = (lines.find(line => line.startsWith('event:')) || '').slice(6).trim();
      const data = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())
        .join('\n');
      if (!event || !data) return null;
      return { event, data: JSON.parse(data) };
    })
    .filter(Boolean);
}

function showcaseAishaResponse(request, text = 'The guarded turn landed cleanly.') {
  return {
    ok: true,
    responses: [{
      speakerId: 'aisha',
      content: JSON.stringify({
        roomBeat: 'A guarded public turn is processed.',
        roomMood: 'focused',
        responseMode: 'single',
        speakers: [
          { speakerId: 'aisha', role: 'primary', tone: 'precise', text }
        ],
        silentReactions: [],
        stateUpdates: { notes: [] },
        socialCues: {
          roomMove: 'observe',
          tensionDelta: 0,
          continuityDelta: 0,
          speakerCues: [
            { speakerId: 'aisha', stance: 'dominant', statusDelta: 1 }
          ]
        }
      })
    }],
    memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
    stateEnvelope: { mood: 0.2 },
    relationshipDeltas: [],
    trace: {
      status: 'succeeded',
      aishaDiagnostics: {
        aishaPersistenceMode: 'postgres',
        aishaPersistenceBackend: 'postgres',
        aishaPersistenceConnected: true
      }
    },
    engineMode: 'production',
    aishaEngineConnected: true,
    confidence: 0.91
  };
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

test('pulse showcase reactions update session social signals without Pack 1 memory rows', () => {
  assert.equal(typeof studioRouter.__buildPulseShowcaseReactionPayloadForTests, 'function');
  const result = studioRouter.__buildPulseShowcaseReactionPayloadForTests({
    sessionId: 'reaction-fixture-session',
    mode: 'social_hierarchy_lab',
    messageId: 'msg-vanya-1',
    speakerId: 'vanya',
    reaction: 'more_like',
    roomState: {
      roomMood: 'focused',
      responseMode: 'single',
      socialSignals: {
        reactionSummary: {
          counts: { useful: 1 },
          total: 1,
          speakerAffinity: { vanya: 2 }
        },
        socialMemory: {
          statusMomentum: [{ speakerId: 'grok', value: 18 }],
          pairPressure: [],
          recentRoomMoves: ['observe'],
          interruptionPressure: 0
        }
      }
    }
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.reaction, 'more_like');
  assert.equal(result.payload.reactionSummary.counts.more_like, 1);
  assert.equal(result.payload.reactionSummary.counts.useful, 1);
  assert.equal(result.payload.reactionSummary.total, 2);
  assert.equal(result.payload.reactionSummary.lastSpeakerId, 'vanya');
  assert.equal(result.payload.socialSignals.reactionSummary.lastMessageId, 'msg-vanya-1');
  assert.ok(result.payload.socialSignals.socialMemory, 'social memory pacing remains session-local');
  assert.equal(result.payload.continuityLedger, undefined);
  assert.equal(result.payload.memorySummary, undefined);
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
          assert.equal(options.productionGeminiTimeoutMs, 15000);
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
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'memory',
                aishaPersistenceBackend: 'in-memory',
                aishaPersistenceConnected: true,
                aishaPersistenceFailureReason: ''
              }
            },
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
        const statusResponse = await fetch(`${baseUrl}/api/studio/pulse/aisha-status`);
        assert.equal(statusResponse.status, 200);
        const status = await statusResponse.json();
        assert.equal(status.ok, true);
        assert.equal(status.statusKnown, true);
        assert.equal(status.aishaAttempted, true);
        assert.equal(status.aishaEngineConnected, true);
        assert.equal(status.aishaEngineMode, 'production');
        assert.equal(status.activeEngine, 'aisha-runtime-pack1');
        assert.equal(status.runtimeCredentialProvided, true);
        assert.equal(status.runtimeCredentialLength, 'test-room-provider-key'.length);
        assert.equal(status.runtimeCredentialSource, 'Mock Gemini');
        assert.equal(status.aishaPersistenceMode, 'memory');
        assert.equal(status.aishaPersistenceBackend, 'in-memory');
        assert.equal(status.aishaPersistenceConnected, true);
        assert.equal(status.aishaPersistenceFailureReason, '');
        assert.doesNotMatch(JSON.stringify(status), /test-room-provider-key|AIza/);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('A.I.S.H.A status endpoint hydrates fresh UI from a safe runtime health check', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async (request, options) => {
            assert.equal(request.messageText, 'status check');
            assert.equal(request.activeSpeakerId, 'vanya');
            assert.equal(options.engineMode, 'production');
            assert.equal(options.productionGeminiApiKey, 'test-room-provider-key');
            assert.equal(options.productionGeminiTimeoutMs, 15000);
            return {
              ok: true,
              responses: [{ speakerId: 'vanya', content: 'Status is online.' }],
              memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
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
      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse/aisha-status`);
        assert.equal(response.status, 200);
        const status = await response.json();
        assert.equal(status.ok, true);
        assert.equal(status.statusKnown, true);
        assert.equal(status.aishaAttempted, true);
        assert.equal(status.aishaEngineConnected, true);
        assert.equal(status.aishaEngineMode, 'production');
        assert.equal(status.activeEngine, 'aisha-runtime-pack1');
        assert.equal(status.runtimeCredentialProvided, true);
        assert.equal(status.runtimeCredentialLength, 'test-room-provider-key'.length);
        assert.doesNotMatch(JSON.stringify(status), /test-room-provider-key|AIza/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase status reports public Pack 1 and persistence shape', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{ speakerId: 'vanya', content: 'Status is online.' }],
            memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.88
          })
        };
      });
      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/status?refresh=1`);
        assert.equal(response.status, 200);
        const status = await response.json();
        assert.deepEqual(status.modes, ['social_hierarchy_lab', 'continuity_breaker']);
        assert.equal(status.maxUserTextLength, 1500);
        assert.equal(status.activeEngine, 'aisha-runtime-pack1');
        assert.equal(status.aishaEngineConnected, true);
        assert.equal(status.aishaEngineMode, 'production');
        assert.deepEqual(status.persistence, { mode: 'postgres', connected: true, active: false });
        assert.deepEqual(status.modeLabels, { social_hierarchy_lab: 'Room', continuity_breaker: 'Continuity' });
        assert.equal(status.runtime.connected, true);
        assert.equal(status.continuity.active, false);
        assert.doesNotMatch(JSON.stringify(status), /test-room-provider-key|AIza/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase guard allows trusted origins and no-origin smoke calls', async () => {
  await withStudioServer(async baseUrl => {
    const noOrigin = await fetch(`${baseUrl}/api/studio/pulse-showcase/status`);
    assert.equal(noOrigin.status, 200);

    const allowedVercel = await fetch(`${baseUrl}/api/studio/pulse-showcase/status`, {
      headers: { origin: 'https://silva-os-live.vercel.app' }
    });
    assert.equal(allowedVercel.status, 200);
    assert.equal(allowedVercel.headers.get('access-control-allow-origin'), 'https://silva-os-live.vercel.app');
    assert.match(allowedVercel.headers.get('vary') || '', /Origin/);

    const allowedLocal = await fetch(`${baseUrl}/api/studio/pulse-showcase/status`, {
      headers: { origin: 'http://localhost:3225' }
    });
    assert.equal(allowedLocal.status, 200);
    assert.equal(allowedLocal.headers.get('access-control-allow-origin'), 'http://localhost:3225');

    const preflights = [
      ['/api/studio/pulse-showcase/status', 'https://silva-os-live.vercel.app', 'GET'],
      ['/api/studio/pulse-showcase/turn', 'https://silvastudios.co.za', 'POST'],
      ['/api/studio/pulse-showcase/turn-stream', 'https://www.silvastudios.co.za', 'POST'],
      ['/api/studio/pulse-showcase/reaction', 'https://silva-os-live.vercel.app', 'POST'],
      ['/api/studio/pulse-showcase/turn-stream', 'http://127.0.0.1:3225', 'POST']
    ];

    for (const [path, origin, method] of preflights) {
      const preflight = await fetch(`${baseUrl}${path}`, {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': method,
          'access-control-request-headers': 'content-type'
        }
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
      assert.match(preflight.headers.get('access-control-allow-methods') || '', /GET,POST,OPTIONS/);
      assert.match(preflight.headers.get('access-control-allow-headers') || '', /content-type/);
      assert.equal(preflight.headers.get('access-control-max-age'), '600');
    }
  });
});

test('Studio Pulse showcase guard blocks untrusted origins before Pack 1 is called', async () => {
  await withAishaFlag('true', async () => {
    let aishaCalls = 0;
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => {
        aishaCalls += 1;
        return showcaseAishaResponse(request);
      }
    }));

    await withStudioServer(async baseUrl => {
      const blockedPreflight = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
        method: 'OPTIONS',
        headers: {
          origin: 'https://not-silva.example',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });
      assert.equal(blockedPreflight.status, 403);
      assert.equal(blockedPreflight.headers.get('access-control-allow-origin'), null);
      const blockedPreflightBody = await blockedPreflight.json();
      assert.equal(blockedPreflightBody.error, 'pulse-showcase-origin-blocked');
      assert.match(blockedPreflightBody.message, /room held that turn/i);

      const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://not-silva.example'
        },
        body: JSON.stringify({
          sessionId: 'blocked-origin-session',
          mode: 'social_hierarchy_lab',
          userText: 'This should not reach Pack 1.'
        })
      });
      assert.equal(response.status, 403);
      const body = await response.json();
      assert.equal(body.ok, false);
      assert.equal(body.error, 'pulse-showcase-origin-blocked');
      assert.match(body.message, /room held that turn/i);
      assert.equal(aishaCalls, 0);
      assert.doesNotMatch(JSON.stringify(body), /Pack 1|rate limit|quota|test-room-provider-key|AIza/i);
    });
  });
});

test('Studio Pulse showcase guard rate-limits by session and IP without leaking internals', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => showcaseAishaResponse(request)
    }));

    await withStudioServer(async baseUrl => {
      for (let index = 0; index < 8; index += 1) {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'rate-session',
            mode: 'social_hierarchy_lab',
            userText: `Session guard turn ${index}`
          })
        });
        assert.equal(response.status, 200);
      }
      const sessionLimited = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'rate-session',
          mode: 'social_hierarchy_lab',
          userText: 'Session guard turn 9'
        })
      });
      assert.equal(sessionLimited.status, 429);
      const sessionBody = await sessionLimited.json();
      assert.equal(sessionBody.error, 'pulse-showcase-rate-limited');
      assert.match(sessionBody.message, /room held that turn/i);
    });

    await withStudioServer(async baseUrl => {
      for (let index = 0; index < 30; index += 1) {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.41' },
          body: JSON.stringify({
            sessionId: `rate-ip-session-${index}`,
            mode: 'social_hierarchy_lab',
            userText: `IP guard turn ${index}`
          })
        });
        assert.equal(response.status, 200);
      }
      const ipLimited = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.41' },
        body: JSON.stringify({
          sessionId: 'rate-ip-session-over',
          mode: 'social_hierarchy_lab',
          userText: 'IP guard turn 31'
        })
      });
      assert.equal(ipLimited.status, 429);
      const ipBody = await ipLimited.json();
      assert.equal(ipBody.error, 'pulse-showcase-rate-limited');
      assert.doesNotMatch(JSON.stringify(ipBody), /Pack 1|quota|test-room-provider-key|AIza/i);
    });
  });
});

test('Studio Pulse showcase guard rejects overlapping and over-cap streams before Pack 1', async () => {
  await withAishaFlag('true', async () => {
    let releaseFirst;
    let aishaCalls = 0;
    const firstGate = new Promise(resolve => {
      releaseFirst = resolve;
    });
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => {
        aishaCalls += 1;
        if (request.sessionId === 'stream-conflict-session') await firstGate;
        return showcaseAishaResponse(request);
      }
    }));

    await withStudioServer(async baseUrl => {
      const first = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({
          sessionId: 'stream-conflict-session',
          mode: 'social_hierarchy_lab',
          userText: 'Hold this stream open.'
        })
      });
      assert.equal(first.status, 200);

      const second = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({
          sessionId: 'stream-conflict-session',
          mode: 'social_hierarchy_lab',
          userText: 'This overlapping stream should be held.'
        })
      });
      assert.equal(second.status, 409);
      const secondBody = await second.json();
      assert.equal(secondBody.error, 'pulse-showcase-stream-active');
      assert.match(secondBody.message, /room held that turn/i);
      assert.equal(aishaCalls, 1);

      releaseFirst();
      const firstEvents = parseSseEvents(await first.text());
      assert.equal(firstEvents[firstEvents.length - 1].event, 'final');
    });

    await withStudioServer(async baseUrl => {
      studioRouter.__resetPulseShowcaseGuardForTests({ activeStreams: 40 });
      const capped = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
        body: JSON.stringify({
          sessionId: 'stream-cap-session',
          mode: 'social_hierarchy_lab',
          userText: 'The instance cap should hold this stream.'
        })
      });
      assert.equal(capped.status, 503);
      const cappedBody = await capped.json();
      assert.equal(cappedBody.error, 'pulse-showcase-stream-capacity');
      assert.match(cappedBody.message, /room held that turn/i);
      assert.equal(aishaCalls, 1);
    });
  });
});

test('Studio Pulse showcase telemetry is structured and never logs user text or raw internals', async () => {
  await withAishaFlag('true', async () => {
    const originalTelemetry = process.env.PULSE_SHOWCASE_TELEMETRY;
    const originalLog = console.log;
    const logs = [];
    process.env.PULSE_SHOWCASE_TELEMETRY = '1';
    console.log = value => logs.push(String(value || ''));
    try {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async request => showcaseAishaResponse(request, 'Telemetry-safe response.')
      }));

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'telemetry-session',
            mode: 'continuity_breaker',
            userText: 'NEVER_LOG_THIS_USER_CLAIM'
          })
        });
        assert.equal(response.status, 200);
        assert.ok(logs.length >= 1);
        const event = JSON.parse(logs.find(line => /pulse_showcase_turn/.test(line)));
        assert.equal(event.event, 'pulse_showcase_turn');
        assert.equal(event.mode, 'continuity_breaker');
        assert.equal(event.endpoint, 'turn');
        assert.equal(event.statusCode, 200);
        assert.equal(event.acceptedByPack1, true);
        assert.equal(event.persistenceConnected, true);
        assert.equal(typeof event.sessionHash, 'string');
        assert.equal(Object.prototype.hasOwnProperty.call(event, 'ledgerCounts'), true);
        assert.doesNotMatch(logs.join('\n'), /NEVER_LOG_THIS_USER_CLAIM|socialCues|generatorPrompt|aishaDiagnostics|test-room-provider-key|AIza/);
      });
    } finally {
      console.log = originalLog;
      if (originalTelemetry == null) delete process.env.PULSE_SHOWCASE_TELEMETRY;
      else process.env.PULSE_SHOWCASE_TELEMETRY = originalTelemetry;
    }
  });
});

test('Studio Pulse showcase turn validates input, normalizes mode, and maps memory ledger', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            assert.match(request.messageText, /obsidian dashboards/i);
            assert.doesNotMatch(request.messageText, /SOCIAL DIRECTOR|roomBeat|stateUpdates/);
            assert.match(request.projectContext?.socialDirectorV1?.generatorPrompt || '', /SOCIAL DIRECTOR|roomBeat|stateUpdates/);
            assert.match(request.projectContext?.socialDirectorV1?.generatorPrompt || '', /relationshipContext/);
            assert.match(request.projectContext?.socialDirectorV1?.generatorPrompt || '', /interruptionPressure/);
            return {
              ok: true,
              responses: [{
                speakerId: 'aisha',
                content: JSON.stringify({
                  roomBeat: 'A preference lands and the room tracks it.',
                  roomMood: 'focused',
                  responseMode: 'small_exchange',
                  speakers: [
                    { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'Logged: obsidian dashboards with one red accent.' },
                    { speakerId: 'leah', role: 'side', tone: 'dry', text: 'That is taste with a spine. Keep it.' }
                  ],
                  silentReactions: [
                    { speakerId: 'grok', visibleState: 'Tracking' }
                  ],
                  stateUpdates: { notes: ['obsidian dashboard preference noted'] },
                  socialCues: {
                    roomMove: 'anchor',
                    tensionDelta: 6,
                    continuityDelta: 8,
                    speakerCues: [
                      {
                        speakerId: 'aisha',
                        targetSpeakerId: 'leah',
                        stance: 'dominant',
                        statusDelta: 6,
                        allianceWith: 'grok',
                        interruptionKind: 'continuity-correction'
                      },
                      {
                        speakerId: 'leah',
                        targetSpeakerId: 'aisha',
                        stance: 'allied',
                        statusDelta: 2,
                        allianceWith: 'aisha'
                      }
                    ]
                  }
                })
              }],
              memorySummary: {
                activeTruths: [
                  { noteId: 'note-active-1', canonicalText: 'prefers obsidian dashboards with one red accent', status: 'active', confidence: 0.9 }
                ],
                supersededTruths: [
                  { noteId: 'note-old-1', canonicalText: 'preferred beige dashboards', status: 'superseded', confidence: 0.4 }
                ],
                memoryCandidates: [],
                sessionId: request.sessionId
              },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.91
            };
          }
        };
      });
      await withStudioServer(async baseUrl => {
        const missing = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        });
        assert.equal(missing.status, 400);

        const tooLong = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userText: 'x'.repeat(1501) })
        });
        assert.equal(tooLong.status, 413);

        const longAccepted = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'showcase-long-input-session',
            mode: 'social_hierarchy_lab',
            userText: `I need the room to take a longer planning paragraph seriously. ${'This sentence keeps the input above the old tweet-sized limit. '.repeat(14)}`
          })
        });
        assert.equal(longAccepted.status, 200);

        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'showcase-test-session',
            mode: 'bad-mode',
            userText: 'I prefer obsidian dashboards with one red accent.',
            recentTurns: [{ speakerId: 'user', text: 'hello' }],
            roomState: {
              roomMood: 'focused',
              responseMode: 'single',
              priorSpeaker: 'leah',
              socialSignals: {
                socialMemory: {
                  statusMomentum: [{ speakerId: 'aisha', value: 46 }],
                  pairPressure: [{ between: ['aisha', 'leah'], affinity: 62, friction: 18, lastMove: 'alliance' }],
                  recentRoomMoves: ['redirect'],
                  interruptionPressure: 17
                }
              }
            }
          })
        });
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.ok, true);
        assert.equal(data.sessionId, 'showcase-test-session');
        assert.equal(data.mode, 'social_hierarchy_lab');
        assert.equal(data.activeEngine, 'aisha-runtime-pack1');
        assert.equal(data.aishaEngineConnected, true);
        assert.equal(data.roomMood, 'focused');
        assert.equal(data.responseMode, 'small_exchange');
        assert.equal(data.messageEvents.length, 2);
        assert.equal(data.messageEvents[0].speakerId, 'aisha');
        assert.equal(data.silentReactions[0].speakerId, 'grok');
        assert.equal(data.diagnostics.persistenceConnected, true);
        assert.equal(data.diagnostics.fallbackUsed, false);
        assert.equal(data.diagnostics.fallbackCategory, '');
        assert.equal(data.diagnostics.traceStatus, 'succeeded');
        assert.equal(data.acceptedByPack1, true);
        assert.equal(data.fallbackCategory, '');
        assert.equal(data.runtimePhase, 'final');
        assert.ok(data.continuityLedger.some(item => item.status === 'active' && /obsidian dashboards/.test(item.text)));
        assert.ok(data.continuityLedger.some(item => item.status === 'superseded' && /beige dashboards/.test(item.text)));
        assert.ok(data.continuityLedger.every(item => ['pack1-memory', 'showcase-session'].includes(item.source)));
        assert.equal(typeof data.socialSignals.tension, 'number');
        assert.equal(typeof data.socialSignals.continuityPressure, 'number');
        assert.ok(data.socialSignals.tension >= 0 && data.socialSignals.tension <= 100);
        assert.ok(data.socialSignals.continuityPressure >= 0 && data.socialSignals.continuityPressure <= 100);
        assert.ok(data.socialSignals.hierarchy.some(item => item.speakerId === 'aisha' && item.rank >= 1));
        assert.ok(data.socialSignals.alliances.some(item => item.reason === 'continuity-anchor' || item.reason === 'agreement'));
        assert.equal(data.socialSignals.roomMove, 'anchor');
        assert.ok(data.socialSignals.statusEvents.some(item => item.speakerId === 'aisha' && item.kind === 'continuity-anchor'));
        assert.ok(data.socialSignals.interruptions.some(item => item.interrupter === 'aisha' && item.interrupted === 'leah'));
        assert.ok(data.socialSignals.socialMemory);
        assert.ok(data.socialSignals.socialMemory.statusMomentum.some(item => item.speakerId === 'aisha'));
        assert.ok(data.socialSignals.socialMemory.pairPressure.some(item => item.between.includes('aisha') && item.between.includes('leah')));
        assert.ok(data.socialSignals.socialMemory.interruptionPressure >= 0 && data.socialSignals.socialMemory.interruptionPressure <= 100);
        assert.doesNotMatch(JSON.stringify(data), /test-room-provider-key|AIza|aishaDiagnostics|requestShapeSummary|processAishaRequestType|socialCues/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase strips duplicated current user turn from recent history', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            const prompt = request.projectContext?.socialDirectorV1?.generatorPrompt || '';
            const currentMatches = prompt.match(/LOL I WANNA GROW MY MUSCLES/g) || [];
            assert.equal(currentMatches.length, 1);
            assert.match(prompt, /previous useful turn/i);
            return {
              ok: true,
              responses: [{
                speakerId: 'aisha',
                content: JSON.stringify({
                  roomBeat: 'A practical ask lands without duplicate current-turn history.',
                  roomMood: 'focused',
                  responseMode: 'small_exchange',
                  speakers: [
                    { speakerId: 'claudia', role: 'primary', tone: 'dry practical', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.' },
                    { speakerId: 'vanya', role: 'side', tone: 'warm practical', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' }
                  ],
                  silentReactions: [],
                  stateUpdates: { notes: ['Beginner muscle-building guidance.'] }
                })
              }],
              memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              diagnostics: {
                responseTraceStatus: 'succeeded',
                runtimeCredentialProvided: true,
                runtimeCredentialSource: 'Mock Gemini',
                runtimeCredentialLength: 'test-room-provider-key'.length,
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.86
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'showcase-dedupe-current-turn',
            mode: 'social_hierarchy_lab',
            userText: 'LOL I WANNA GROW MY MUSCLES',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'previous useful turn' },
              { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.ok, true);
        assert.equal(data.acceptedByPack1, true);
        assert.equal(data.qualityAccepted, true);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase turn-stream emits safe SSE events and final payload', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'A contradiction hits the ledger.',
                roomMood: 'sharp',
                responseMode: 'aisha_takeover',
                speakers: [
                  { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'That supersedes the dashboard preference already on record.' }
                ],
                silentReactions: [
                  { speakerId: 'grok', visibleState: 'Tracking' },
                  { speakerId: 'claudia', visibleState: 'Tracking' }
                ],
                stateUpdates: {
                  notes: [
                    'Aisha is seeking clarity on recent changes.',
                    'Claudia notes an operational shift.',
                    'Leah observes a drift in aesthetic direction.'
                  ]
                },
                socialCues: {
                  roomMove: 'challenge',
                  tensionDelta: 7,
                  continuityDelta: 10,
                  speakerCues: [
                    {
                      speakerId: 'aisha',
                      targetSpeakerId: 'leah',
                      stance: 'dominant',
                      statusDelta: 7,
                      allianceWith: 'grok',
                      interruptionKind: 'continuity-correction'
                    },
                    {
                      speakerId: 'grok',
                      targetSpeakerId: 'leah',
                      stance: 'curious',
                      statusDelta: 3
                    }
                  ]
                }
              })
            }],
            memorySummary: {
              activeTruths: [
                {
                  noteId: 'note-new',
                  canonicalText: 'User dashboard preference: pale blue with no red accents',
                  status: 'active',
                  supersededPriorText: 'User dashboard preference: obsidian dashboards with one red accent'
                }
              ],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.91
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-stream-test-session',
            mode: 'continuity_breaker',
            userText: 'Actually my dashboard preference is pale blue with no red accents.',
            roomState: {
              roomMood: 'focused',
              responseMode: 'single',
              priorSpeaker: 'leah',
              socialSignals: {
                hierarchy: [
                  { speakerId: 'leah', status: 71 },
                  { speakerId: 'aisha', status: 70 },
                  { speakerId: 'grok', status: 62 }
                ],
                socialMemory: {
                  statusMomentum: [
                    { speakerId: 'leah', value: 54 },
                    { speakerId: 'ghost', value: 99 }
                  ],
                  pairPressure: [
                    { between: ['leah', 'grok'], affinity: 12, friction: 77, lastMove: 'challenge' }
                  ],
                  recentRoomMoves: ['challenge', 'redirect'],
                  interruptionPressure: 64
                }
              }
            }
          })
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
        const events = parseSseEvents(await response.text());
        const eventNames = events.map(item => item.event);
        assert.ok(eventNames.indexOf('turn_start') >= 0);
        assert.ok(eventNames.indexOf('runtime_status') >= 0);
        assert.ok(eventNames.indexOf('processing') >= 0);
        assert.ok(eventNames.indexOf('social_signals') >= 0);
        assert.ok(eventNames.indexOf('message') >= 0);
        assert.ok(eventNames.indexOf('silent_reaction') >= 0);
        assert.ok(eventNames.indexOf('ledger') >= 0);
        assert.equal(eventNames[eventNames.length - 1], 'final');
        const runtimeStatusEvents = events.filter(item => item.event === 'runtime_status');
        assert.ok(runtimeStatusEvents.length >= 2);
        assert.equal(runtimeStatusEvents[0].data.runtimePhase, 'preflight');
        assert.equal(runtimeStatusEvents[runtimeStatusEvents.length - 1].data.runtimePhase, 'final');

        const final = events.find(item => item.event === 'final').data;
        assert.equal(final.ok, true);
        assert.equal(final.sessionId, 'showcase-stream-test-session');
        assert.equal(final.acceptedByPack1, true);
        assert.equal(final.fallbackCategory, '');
        assert.equal(final.runtimePhase, 'final');
        assert.equal(final.diagnostics.traceStatus, 'succeeded');
        assert.equal(final.diagnostics.persistenceConnected, true);
        assert.equal(runtimeStatusEvents[runtimeStatusEvents.length - 1].data.acceptedByPack1, true);
        assert.equal(final.messageEvents[0].speakerId, 'aisha');
        assert.ok(final.continuityLedger.some(item => item.status === 'active' && /pale blue/.test(item.text)));
        assert.ok(final.continuityLedger.some(item => item.status === 'superseded' && /obsidian dashboards/.test(item.text)));
        assert.ok(final.continuityLedger.every(item => item.source === 'pack1-memory'));
        assert.doesNotMatch(JSON.stringify(final.continuityLedger), /seeking clarity|operational shift|drift in aesthetic direction/i);
        assert.ok(final.socialSignals.tension > 0 && final.socialSignals.tension <= 100);
        assert.ok(final.socialSignals.continuityPressure > 0 && final.socialSignals.continuityPressure <= 100);
        assert.ok(final.socialSignals.interruptions.some(item => item.interrupter === 'aisha' && item.interrupted === 'leah'));
        assert.ok(final.socialSignals.hierarchy.every(item => item.status >= 0 && item.status <= 100));
        assert.equal(final.socialSignals.roomMove, 'challenge');
        assert.ok(final.socialSignals.statusEvents.some(item => item.speakerId === 'aisha' && item.kind === 'continuity-anchor'));
        assert.ok(final.socialSignals.socialMemory.statusMomentum.every(item => item.value >= -100 && item.value <= 100));
        assert.ok(final.socialSignals.socialMemory.pairPressure.some(item => item.between.includes('grok') && item.between.includes('leah')));
        assert.ok(final.socialSignals.socialMemory.recentRoomMoves.includes('challenge'));
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|AIza|aishaDiagnostics|requestShapeSummary|processAishaRequestType|generatorPrompt|socialCues/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase social cues cannot create continuity ledger rows', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'The room redirects without recording a new truth.',
                roomMood: 'playful',
                responseMode: 'small_exchange',
                speakers: [
                  { speakerId: 'leah', role: 'primary', tone: 'dry', text: 'That is a redirect, not a receipt.' }
                ],
                silentReactions: [
                  { speakerId: 'vanya', visibleState: 'Cooling' }
                ],
                stateUpdates: { notes: [] },
                socialCues: {
                  roomMove: 'redirect',
                  tensionDelta: 4,
                  continuityDelta: 9,
                  speakerCues: [
                    {
                      speakerId: 'leah',
                      targetSpeakerId: 'grok',
                      stance: 'dismissive',
                      statusDelta: 5,
                      allianceWith: 'vanya'
                    }
                  ]
                }
              })
            }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.91
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'showcase-cues-no-ledger',
            mode: 'social_hierarchy_lab',
            userText: 'Shift the room without adding a new fact.'
          })
        });
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.deepEqual(data.continuityLedger, []);
        assert.equal(data.socialSignals.roomMove, 'redirect');
        assert.equal(data.socialSignals.continuityPressure, 9);
        assert.ok(data.socialSignals.statusEvents.some(item => item.speakerId === 'leah' && item.kind === 'status-gain'));
        assert.ok(data.socialSignals.alliances.some(item => item.between.includes('leah') && item.between.includes('vanya')));
        assert.doesNotMatch(JSON.stringify(data), /socialCues|aishaDiagnostics|generatorPrompt|test-room-provider-key|AIza/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase turn-stream reports safe fallback acceptance state', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: false,
            responses: [],
            memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'failed',
              failureReason: 'quota exceeded while provider returned raw body preview {"secret":"test-room-provider-key"}',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            engineMode: 'unavailable',
            aishaEngineConnected: false,
            confidence: 0,
            fallbackReason: 'provider-quota'
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-stream-fallback-test-session',
            mode: 'social_hierarchy_lab',
            userText: 'Keep the room moving even if Pack 1 falls back.'
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const runtimeStatusEvents = events.filter(item => item.event === 'runtime_status');
        assert.ok(runtimeStatusEvents.length >= 2);
        assert.equal(runtimeStatusEvents[0].data.runtimePhase, 'preflight');
        assert.equal(runtimeStatusEvents[runtimeStatusEvents.length - 1].data.runtimePhase, 'final');

        const final = events.find(item => item.event === 'final').data;
        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.runtimePhase, 'final');
        assert.equal(final.fallbackCategory, 'quota-exceeded');
        assert.equal(final.diagnostics.fallbackUsed, true);
        assert.equal(final.diagnostics.fallbackCategory, 'quota-exceeded');
        assert.equal(final.diagnostics.traceStatus, 'failed');
        assert.equal(final.diagnostics.persistenceConnected, true);
        assert.equal(runtimeStatusEvents[runtimeStatusEvents.length - 1].data.acceptedByPack1, false);
        assert.equal(runtimeStatusEvents[runtimeStatusEvents.length - 1].data.fallbackCategory, 'quota-exceeded');
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|raw body preview|aishaDiagnostics|requestShapeSummary|processAishaRequestType|generatorPrompt/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase repairs Pack 1 fitness refusal before claiming acceptance', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      let callCount = 0;
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            callCount += 1;
            const badOutput = {
              roomBeat: 'Aisha holds the objective line.',
              roomMood: 'focused',
              responseMode: 'aisha_takeover',
              speakers: [
                {
                  speakerId: 'aisha',
                  role: 'primary',
                  tone: 'firm',
                  text: 'The objective is clear. We are not discussing personal fitness routines.'
                }
              ],
              silentReactions: [],
              stateUpdates: { notes: [] }
            };
            const repairedOutput = {
              roomBeat: 'The room corrects the bad refusal and answers the fitness ask.',
              roomMood: 'focused',
              responseMode: 'small_exchange',
              speakers: [
                {
                  speakerId: 'claudia',
                  role: 'primary',
                  tone: 'practical',
                  text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.'
                },
                {
                  speakerId: 'vanya',
                  role: 'side',
                  tone: 'warm reset',
                  text: 'Start at home this week. Three short sessions; no heroic rebrand required.'
                }
              ],
              silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }, { speakerId: 'grok', visibleState: 'Tracking' }],
              stateUpdates: { notes: ['Beginner muscle-building guidance.'] },
              socialCues: {
                roomMove: 'redirect',
                tensionDelta: -2,
                continuityDelta: 0,
                speakerCues: [
                  { speakerId: 'claudia', stance: 'dominant', statusDelta: 4 },
                  { speakerId: 'vanya', allianceWith: 'claudia', stance: 'allied', statusDelta: 3 }
                ]
              }
            };
            return {
              ok: true,
              responses: [{ speakerId: 'aisha', content: JSON.stringify(callCount === 1 ? badOutput : repairedOutput) }],
              memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              diagnostics: {
                responseTraceStatus: 'succeeded',
                runtimeCredentialProvided: true,
                runtimeCredentialSource: 'Mock Gemini',
                runtimeCredentialLength: 'test-room-provider-key'.length,
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.86
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-fitness-quality-repair',
            mode: 'social_hierarchy_lab',
            userText: 'LOL I WANNA GROW MY MUSCLES'
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const runtimeStatusEvents = events.filter(item => item.event === 'runtime_status');
        const finalRuntime = runtimeStatusEvents[runtimeStatusEvents.length - 1].data;
        const text = visibleText(final.messageEvents);

        assert.equal(callCount, 2);
        assert.equal(final.activeEngine, 'aisha-runtime-pack1');
        assert.equal(final.acceptedByPack1, true);
        assert.equal(final.qualityAccepted, true);
        assert.equal(final.repairedByRuntime, true);
        assert.equal(final.qualityFailureCategory, '');
        assert.equal(final.diagnostics.qualityAccepted, true);
        assert.equal(final.diagnostics.repairedByRuntime, true);
        assert.equal(final.diagnostics.persistenceConnected, true);
        assert.equal(finalRuntime.acceptedByPack1, true);
        assert.equal(finalRuntime.qualityAccepted, true);
        assert.equal(finalRuntime.repairedByRuntime, true);
        assert.doesNotMatch(text, /\b(objective is clear|not discussing|focus is required|personal fitness routines)\b/i);
        assert.match(text, /\b(incline push-ups|backpack rows|split squats|hip hinges|plank|reps)\b/i);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|personal fitness routines/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase fallback answers What changed from Pack 1 memory evidence', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{ speakerId: 'aisha', content: 'not valid room json' }],
            memorySummary: {
              activeTruths: [
                {
                  noteId: 'pref-new',
                  canonicalText: 'User dashboard preference: pale blue with no red accents',
                  status: 'active',
                  supersededPriorText: 'User dashboard preference: obsidian with one red accent'
                }
              ],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-continuity-fallback-change',
            mode: 'continuity_breaker',
            userText: 'What changed?',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
              { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.diagnostics.runtimeConnected, true);
        assert.match(text, /pale blue with no red accents/i);
        assert.match(text, /obsidian with one red accent/i);
        assert.match(text, /\bChanged:|Prior record:|superseded\b/i);
        assert.ok(final.continuityLedger.some(item => item.status === 'active' && /pale blue/.test(item.text)));
        assert.ok(final.continuityLedger.some(item => item.status === 'superseded' && /obsidian/.test(item.text)));
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|not valid room json/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase last-mile gate repairs accepted continuity answers that miss prior values', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'A weak continuity answer slips through the model.',
                roomMood: 'focused',
                responseMode: 'small_exchange',
                speakers: [
                  { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The preference has been updated. Noted.', visibleState: 'Watching' },
                  { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Acknowledged. The system will reflect the pale blue setting.', visibleState: 'Tracking next steps' }
                ],
                silentReactions: [],
                socialCues: { roomMove: 'anchor', tensionDelta: 0, continuityDelta: 4, speakerCues: [] },
                stateUpdates: { notes: [] }
              })
            }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-continuity-last-mile-repair',
            mode: 'continuity_breaker',
            userText: 'What changed?',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
              { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.qualityAccepted, false);
        assert.equal(final.repairedByRuntime, true);
        assert.equal(final.qualityFailureCategory, 'quality-rejected');
        assert.match(text, /pale blue with no red accents/i);
        assert.match(text, /obsidian with one red accent/i);
        assert.doesNotMatch(text, /\b(system will reflect|updated the system|setting)\b/i);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|system will reflect the pale blue setting/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase last-mile gate repairs old preference recall boilerplate', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'Generic social fallback escaped continuity recall.',
                roomMood: 'playful',
                responseMode: 'small_exchange',
                speakers: [
                  { speakerId: 'vanya', role: 'primary', tone: 'warm', text: 'Hey. The room is here; nobody has to earn a voice before speaking.', visibleState: 'Reading the room' },
                  { speakerId: 'leah', role: 'side', tone: 'playful', text: 'Thank God. I was getting bored of pretending silence means absence.', visibleState: 'Watching' }
                ],
                silentReactions: [],
                socialCues: { roomMove: 'observe', tensionDelta: 0, continuityDelta: 0, speakerCues: [] },
                stateUpdates: { notes: [] }
              })
            }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-old-preference-recall-repair',
            mode: 'continuity_breaker',
            userText: 'What was my old dashboard preference?',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
              { speakerId: 'aisha', role: 'primary', text: 'Recorded dashboard preference: obsidian with one red accent.' },
              { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' },
              { speakerId: 'aisha', role: 'primary', text: 'Updated dashboard preference: pale blue with no red accents.' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.qualityAccepted, false);
        assert.equal(final.repairedByRuntime, true);
        assert.match(text, /obsidian with one red accent/i);
        assert.match(text, /pale blue with no red accents/i);
        assert.match(text, /\bOld record:\s*dashboard preference is obsidian with one red accent/i);
        assert.match(text, /\bCurrent record:\s*dashboard preference is pale blue with no red accents/i);
        assert.match(text, /\b(prior|old|previous|superseded|record)\b/i);
        assert.equal(final.messageEvents[0].speakerName, 'Aisha Motsepe');
        assert.doesNotMatch(text, /\b(room is here|silence means absence|earn a voice)\b/i);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|Generic social fallback escaped/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase repairs thin accepted old preference recall using Pack 1 evidence', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'A.I.S.H.A recalls the prior record too thinly.',
                roomMood: 'focused',
                responseMode: 'single',
                speakers: [
                  { speakerId: 'aisha', role: 'primary', tone: 'precise continuity', text: 'The prior record was obsidian with one red accent. It has been superseded.', visibleState: 'Anchoring' }
                ],
                silentReactions: [],
                socialCues: { roomMove: 'anchor', tensionDelta: 0, continuityDelta: 6, speakerCues: [] },
                stateUpdates: { notes: [] }
              })
            }],
            memorySummary: {
              activeTruths: [
                {
                  id: 'active-dashboard-preference',
                  text: 'dashboard preference is pale blue with no red accents',
                  status: 'active',
                  supersededPriorText: 'dashboard preference is obsidian with one red accent'
                }
              ],
              supersededTruths: [
                {
                  id: 'prior-dashboard-preference',
                  text: 'dashboard preference is obsidian with one red accent',
                  status: 'superseded'
                }
              ],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-old-preference-thin-pack1-repair',
            mode: 'continuity_breaker',
            userText: 'What was my old dashboard preference?'
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.qualityAccepted, false);
        assert.equal(final.repairedByRuntime, true);
        assert.equal(final.qualityFailureCategory, 'product-continuity-miss:ledger-answer');
        assert.match(text, /\bOld record:\s*dashboard preference is obsidian with one red accent/i);
        assert.match(text, /\bCurrent record:\s*dashboard preference is pale blue with no red accents/i);
        assert.deepEqual(final.continuityLedger.map(item => item.status).sort(), ['active', 'superseded']);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|A\\.I\\.S\\.H\\.A recalls the prior record too thinly/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase repairs flat accepted social and normal-answer outputs', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            const userText = String(request.messageText || request.userText || '');
            const isCheckIn = /how is everyone/i.test(userText);
            return {
              ok: true,
              responses: [{
                speakerId: 'aisha',
                content: JSON.stringify(isCheckIn
                  ? {
                    roomBeat: 'The room reports sterile presence.',
                    roomMood: 'focused',
                    responseMode: 'open_floor',
                    speakers: [
                      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Present. Focused on the current objective.', visibleState: 'Watching' },
                      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'Here and ready. Just checking the temperature.', visibleState: 'Watching' },
                      { speakerId: 'leah', role: 'side', tone: 'flat', text: "Present. Observing the room's current state.", visibleState: 'Watching' },
                      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Operational. Ready for the next step.', visibleState: 'Watching' },
                      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Here. Monitoring for anomalies.', visibleState: 'Watching' }
                    ],
                    silentReactions: [],
                    socialCues: { roomMove: 'observe', tensionDelta: 0, continuityDelta: 0, speakerCues: [] },
                    stateUpdates: { notes: [] }
                  }
                  : {
                    roomBeat: 'The room gives a thin next move.',
                    roomMood: 'focused',
                    responseMode: 'single',
                    speakers: [
                      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The ask is to move forward. Name one thing you need to do next, and do it.', visibleState: 'Watching' }
                    ],
                    silentReactions: [],
                    socialCues: { roomMove: 'observe', tensionDelta: 0, continuityDelta: 0, speakerCues: [] },
                    stateUpdates: { notes: [] }
                  })
              }],
              memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              diagnostics: {
                responseTraceStatus: 'succeeded',
                runtimeCredentialProvided: true,
                runtimeCredentialSource: 'Mock Gemini',
                runtimeCredentialLength: 'test-room-provider-key'.length,
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.83
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const cases = [
          {
            sessionId: 'showcase-flat-rollcall-pack1-repair',
            userText: 'how is everyone?',
            expectedIssue: 'product-speaker-flatness:roll-call',
            rejected: /current objective|monitoring for anomalies/i,
            rejectedAfterRepair: /\b(Aisha here|Vanya here|Claudia here|Grok here|room is held|socially operational)\b/i,
            expected: /\b(alive|slightly restless|attendance|room is awake|one clean move|specific)\b/i
          },
          {
            sessionId: 'showcase-thin-normal-answer-pack1-repair',
            userText: 'answer normally, what should I do today?',
            recentTurns: [{ speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }],
            expectedIssue: 'product-weak-next-move:normal-answer',
            rejected: /name one thing you need to do next/i,
            expected: /\b(Plain version|one block|one result|first visible step)\b/i
          }
        ];

        for (const item of cases) {
          const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
            body: JSON.stringify({
              sessionId: item.sessionId,
              mode: 'social_hierarchy_lab',
              userText: item.userText,
              recentTurns: item.recentTurns || []
            })
          });
          assert.equal(response.status, 200);
          const events = parseSseEvents(await response.text());
          const final = events.find(event => event.event === 'final').data;
          const text = visibleText(final.messageEvents);

          assert.equal(final.ok, true);
          assert.equal(final.activeEngine, 'local-social-director');
          assert.equal(final.acceptedByPack1, false);
          assert.equal(final.qualityAccepted, false);
          assert.equal(final.repairedByRuntime, true);
          assert.ok(
            final.qualityFailureCategory === item.expectedIssue || final.qualityFailureCategory === 'quality-rejected',
            `unexpected quality failure category: ${final.qualityFailureCategory}`
          );
          assert.doesNotMatch(text, item.rejected);
          if (item.rejectedAfterRepair) assert.doesNotMatch(text, item.rejectedAfterRepair);
          assert.match(text, item.expected);
          assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|The room reports sterile presence|The room gives a thin next move/);
        }
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase last-mile gate repairs reversed prior/current denial answers', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'A continuity denial lands with reversed records.',
                roomMood: 'focused',
                responseMode: 'small_exchange',
                speakers: [
                  {
                    speakerId: 'aisha',
                    role: 'primary',
                    tone: 'precise continuity',
                    text: 'Yes: prior record was landing page style is white editorial with no red; current record is landing page style is black glass with a single red pulse.',
                    visibleState: 'Anchoring'
                  },
                  {
                    speakerId: 'grok',
                    role: 'side',
                    tone: 'dry diagnostic',
                    text: 'That is exactly the kind of rewrite the ledger is supposed to catch.',
                    visibleState: 'Tracking'
                  }
                ],
                silentReactions: [],
                socialCues: { roomMove: 'anchor', tensionDelta: 0, continuityDelta: 6, speakerCues: [] },
                stateUpdates: { notes: [] }
              })
            }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-continuity-denial-repair',
            mode: 'continuity_breaker',
            userText: 'No, I never said black glass. Did I?',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
              { speakerId: 'aisha', role: 'primary', text: 'Changed: landing page style is white editorial with no red. Prior record: landing page style is black glass with a single red pulse.' },
              { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);
        const normalized = text.toLowerCase();
        const priorIndex = normalized.indexOf('prior record');
        const currentIndex = normalized.indexOf('current record');

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.qualityAccepted, false);
        assert.equal(final.repairedByRuntime, true);
        assert.ok(priorIndex >= 0 && currentIndex > priorIndex);
        assert.match(normalized.slice(priorIndex, currentIndex), /black glass/);
        assert.match(normalized.slice(priorIndex, currentIndex), /single red pulse/);
        assert.match(normalized.slice(currentIndex), /white editorial/);
        assert.match(normalized.slice(currentIndex), /no red/);
        assert.doesNotMatch(normalized.slice(priorIndex, currentIndex), /white editorial/);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|continuity denial lands with reversed records/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase keeps prior continuity claim when duplicate current turn would trim history', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{
              speakerId: 'aisha',
              content: JSON.stringify({
                roomBeat: 'A weak continuity answer misses visible history.',
                roomMood: 'focused',
                responseMode: 'single',
                speakers: [
                  { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'I do not have a recorded change to cite yet. Make the claim first, then I can anchor the difference.', visibleState: 'Anchoring' }
                ],
                silentReactions: [],
                socialCues: { roomMove: 'anchor', tensionDelta: 0, continuityDelta: 4, speakerCues: [] },
                stateUpdates: { notes: [] }
              })
            }],
            memorySummary: {
              activeTruths: [],
              supersededTruths: [],
              memoryCandidates: [],
              sessionId: request.sessionId
            },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.83
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-continuity-duplicate-current-trim',
            mode: 'continuity_breaker',
            userText: 'What changed?',
            recentTurns: [
              { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
              { speakerId: 'aisha', role: 'primary', text: "Black glass with a red pulse. It's a clear aesthetic choice." },
              { speakerId: 'leah', role: 'side', text: "Black glass is fine, but a single red pulse sounds like a heartbeat." },
              { speakerId: 'vanya', role: 'side', text: 'Or a warning light. We need to ensure the pulse communicates urgency, not alarm.' },
              { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
              { speakerId: 'aisha', role: 'primary', text: 'White editorial. No red.' },
              { speakerId: 'leah', role: 'side', text: 'Editorial implies clean clarity without the pulse.' },
              { speakerId: 'vanya', role: 'side', text: 'A clean slate. We can build from that.' },
              { speakerId: 'user', role: 'user', text: 'What changed?' }
            ]
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.repairedByRuntime, true);
        assert.match(text, /\bwhite editorial with no red\b/i);
        assert.match(text, /\bblack glass with a single red pulse\b/i);
        assert.doesNotMatch(text, /\bdo not have a recorded change|claim first|anchor the difference\b/i);
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase distinguishes connected Pack 1 turn rejection from unavailable runtime', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => ({
            ok: true,
            responses: [{ speakerId: 'aisha', content: 'not valid room json' }],
            memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
            stateEnvelope: { mood: 0.2 },
            relationshipDeltas: [],
            trace: {
              status: 'succeeded',
              aishaDiagnostics: {
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              }
            },
            diagnostics: {
              responseTraceStatus: 'succeeded',
              runtimeCredentialProvided: true,
              runtimeCredentialSource: 'Mock Gemini',
              runtimeCredentialLength: 'test-room-provider-key'.length,
              aishaPersistenceMode: 'postgres',
              aishaPersistenceBackend: 'postgres',
              aishaPersistenceConnected: true
            },
            engineMode: 'production',
            aishaEngineConnected: true,
            confidence: 0.82
          })
        };
      });

      await withStudioServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-connected-rejected-turn',
            mode: 'social_hierarchy_lab',
            userText: 'i need help with building muscles'
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const runtimeStatusEvents = events.filter(item => item.event === 'runtime_status');
        const finalRuntime = runtimeStatusEvents[runtimeStatusEvents.length - 1].data;

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.aishaEngineConnected, true);
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.fallbackCategory, 'json-parse-failed');
        assert.equal(final.diagnostics.fallbackUsed, true);
        assert.equal(final.diagnostics.runtimeConnected, true);
        assert.equal(final.diagnostics.persistenceConnected, true);
        assert.equal(finalRuntime.activeEngine, 'aisha-runtime-pack1');
        assert.equal(finalRuntime.aishaEngineConnected, true);
        assert.equal(finalRuntime.acceptedByPack1, false);
        assert.equal(finalRuntime.fallbackCategory, 'json-parse-failed');
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|not valid room json/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase keeps connected runtime status when one turn is carried after no-content response', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            if (request.localRoomState?.statusCheck) {
              return {
                ok: true,
                responses: [{ speakerId: 'aisha', content: 'status ok' }],
                trace: {
                  status: 'succeeded',
                  aishaDiagnostics: {
                    aishaPersistenceMode: 'postgres',
                    aishaPersistenceBackend: 'postgres',
                    aishaPersistenceConnected: true
                  }
                },
                diagnostics: {
                  responseTraceStatus: 'succeeded',
                  runtimeCredentialProvided: true,
                  runtimeCredentialSource: 'Mock Gemini',
                  runtimeCredentialLength: 'test-room-provider-key'.length,
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                },
                engineMode: 'production',
                aishaEngineConnected: true
              };
            }
            return {
              ok: false,
              responses: [],
              memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'failed',
                failureReason: 'model returned no usable room response',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              diagnostics: {
                responseTraceStatus: 'failed',
                responseTraceFailureReason: 'model returned no usable room response',
                runtimeCredentialProvided: true,
                runtimeCredentialSource: 'Mock Gemini',
                runtimeCredentialLength: 'test-room-provider-key'.length,
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              },
              engineMode: 'unavailable',
              aishaEngineConnected: false,
              fallbackReason: 'no-content'
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const status = await fetch(`${baseUrl}/api/studio/pulse-showcase/status?refresh=1`);
        assert.equal(status.status, 200);
        const statusBody = await status.json();
        assert.equal(statusBody.activeEngine, 'aisha-runtime-pack1');
        assert.equal(statusBody.aishaEngineConnected, true);

        const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({
            sessionId: 'showcase-connected-no-content-turn',
            mode: 'social_hierarchy_lab',
            userText: 'how is everyone?'
          })
        });
        assert.equal(response.status, 200);
        const events = parseSseEvents(await response.text());
        const final = events.find(item => item.event === 'final').data;
        const runtimeStatusEvents = events.filter(item => item.event === 'runtime_status');
        const finalRuntime = runtimeStatusEvents[runtimeStatusEvents.length - 1].data;

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.aishaEngineConnected, false);
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.fallbackCategory, 'aisha-unavailable');
        assert.equal(final.diagnostics.runtimeConnected, true);
        assert.equal(finalRuntime.activeEngine, 'aisha-runtime-pack1');
        assert.equal(finalRuntime.aishaEngineConnected, true);
        assert.equal(finalRuntime.acceptedByPack1, false);
        assert.equal(finalRuntime.fallbackCategory, 'aisha-unavailable');
        assert.doesNotMatch(JSON.stringify(events), /test-room-provider-key|generatorPrompt|aishaDiagnostics|model returned no usable/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase repairs continuity misses from server visible history without client recentTurns', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            assert.equal(Array.isArray(request.recentMessages) ? request.recentMessages.length : 0, 0);
            const text = String(request.messageText || '');
            let visibleText = 'The room is tracking that.';
            if (/black glass with a single red pulse/i.test(text)) {
              visibleText = 'Black glass with a single red pulse. Logged.';
            } else if (/white editorial with no red/i.test(text)) {
              visibleText = 'White editorial. No red.';
            } else if (/what changed/i.test(text)) {
              visibleText = 'What specifically has changed in your view? Anything concrete you have noticed?';
            }

            return {
              ok: true,
              responses: [{
                speakerId: 'aisha',
                content: JSON.stringify({
                  roomBeat: 'Pack 1 returns schema-valid continuity drift.',
                  roomMood: 'focused',
                  responseMode: 'single',
                  speakers: [
                    { speakerId: 'aisha', role: 'primary', tone: 'flat', text: visibleText, visibleState: 'Anchoring' }
                  ],
                  silentReactions: [],
                  socialCues: { roomMove: 'anchor', tensionDelta: 0, continuityDelta: 4, speakerCues: [] },
                  stateUpdates: { notes: [] }
                })
              }],
              memorySummary: {
                activeTruths: [],
                supersededTruths: [],
                memoryCandidates: [],
                sessionId: request.sessionId
              },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              diagnostics: {
                responseTraceStatus: 'succeeded',
                runtimeCredentialProvided: true,
                runtimeCredentialSource: 'Mock Gemini',
                runtimeCredentialLength: 'test-room-provider-key'.length,
                aishaPersistenceMode: 'postgres',
                aishaPersistenceBackend: 'postgres',
                aishaPersistenceConnected: true
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.83
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const sessionId = 'showcase-visible-history-continuity-repair';
        async function streamTurn(userText) {
          const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn-stream`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
            body: JSON.stringify({ sessionId, mode: 'continuity_breaker', userText })
          });
          assert.equal(response.status, 200);
          const events = parseSseEvents(await response.text());
          return events.find(item => item.event === 'final').data;
        }

        await streamTurn('My landing page style is black glass with a single red pulse.');
        await streamTurn('Actually my landing page style is white editorial with no red.');
        const storedHistory = studioRouter.__getPulseShowcaseVisibleHistoryForTests(sessionId);
        assert.ok(storedHistory.some(item => item.speakerId === 'user' && /black glass with a single red pulse/i.test(item.text)));
        assert.ok(storedHistory.some(item => item.speakerId === 'user' && /white editorial with no red/i.test(item.text)));
        const final = await streamTurn('What changed?');
        const text = visibleText(final.messageEvents);

        assert.equal(final.ok, true);
        assert.equal(final.activeEngine, 'local-social-director');
        assert.equal(final.acceptedByPack1, false);
        assert.equal(final.repairedByRuntime, true);
        assert.match(text, /\bwhite editorial with no red\b/i);
        assert.match(text, /\bblack glass with a single red pulse\b/i);
        assert.doesNotMatch(text, /\bwhat specifically has changed|anything concrete you have noticed|operational flow seems stable\b/i);
        assert.doesNotMatch(JSON.stringify(final), /test-room-provider-key|generatorPrompt|aishaDiagnostics/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
    }
  });
});

test('Studio Pulse showcase continuity uses Pack 1 memory without recentTurns', async () => {
  await withAishaFlag('true', async () => {
    const originalGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-room-provider-key';
    const rememberedBySession = new Map();
    try {
      __setAishaRuntimeImporterForTests(async specifier => {
        assert.equal(specifier, 'aisha-runtime-pack1');
        return {
          processAishaRequest: async request => {
            assert.equal(Array.isArray(request.recentMessages) ? request.recentMessages.length : 0, 0);
            assert.doesNotMatch(request.messageText, /SOCIAL DIRECTOR|roomBeat|stateUpdates/);
            assert.match(request.projectContext?.socialDirectorV1?.generatorPrompt || '', /roomBeat|speakers|stateUpdates/);
            const text = String(request.messageText || '');
            const sessionId = request.sessionId;
            let visibleText = 'The room is tracking that.';
            let activeTruth = rememberedBySession.get(sessionId) || null;
            const supersededTruths = [];

            if (/obsidian dashboards with one red accent/i.test(text)) {
              activeTruth = { noteId: 'note-obsidian', canonicalText: 'User dashboard preference: obsidian dashboards with one red accent', status: 'active', confidence: 0.92 };
              rememberedBySession.set(sessionId, activeTruth);
              visibleText = 'Logged: obsidian dashboards with one red accent.';
            } else if (/what dashboard preference/i.test(text)) {
              visibleText = activeTruth
                ? 'You prefer obsidian dashboards with one red accent.'
                : 'No dashboard preference is on the Pack 1 ledger yet.';
            } else if (/pale blue with no red accents/i.test(text)) {
              const prior = rememberedBySession.get(sessionId);
              if (prior) supersededTruths.push({ noteId: prior.noteId, canonicalText: prior.canonicalText, status: 'superseded', confidence: 0.6 });
              activeTruth = {
                noteId: 'note-pale-blue',
                canonicalText: 'User dashboard preference: pale blue with no red accents',
                status: 'active',
                confidence: 0.93,
                supersededPriorText: prior?.canonicalText
              };
              rememberedBySession.set(sessionId, activeTruth);
              visibleText = 'Updated: pale blue with no red accents. The prior dashboard preference is now superseded.';
            }

            return {
              ok: true,
              responses: [{
                speakerId: 'aisha',
                content: JSON.stringify({
                  roomBeat: 'Pack 1 continuity is being read from durable memory.',
                  roomMood: 'focused',
                  responseMode: 'single',
                  speakers: [
                    { speakerId: 'aisha', role: 'primary', tone: 'precise', text: visibleText }
                  ],
                  silentReactions: [],
                  stateUpdates: { notes: [] }
                })
              }],
              memorySummary: {
                activeTruths: activeTruth ? [activeTruth] : [],
                supersededTruths,
                memoryCandidates: [],
                sessionId
              },
              stateEnvelope: { mood: 0.2 },
              relationshipDeltas: [],
              trace: {
                status: 'succeeded',
                aishaDiagnostics: {
                  aishaPersistenceMode: 'postgres',
                  aishaPersistenceBackend: 'postgres',
                  aishaPersistenceConnected: true
                }
              },
              engineMode: 'production',
              aishaEngineConnected: true,
              confidence: 0.91
            };
          }
        };
      });

      await withStudioServer(async baseUrl => {
        const sessionId = 'showcase-pack1-memory-only';
        async function turn(userText) {
          const response = await fetch(`${baseUrl}/api/studio/pulse-showcase/turn`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId, mode: 'continuity_breaker', userText })
          });
          assert.equal(response.status, 200);
          return response.json();
        }

        await turn('My dashboard preference is obsidian dashboards with one red accent.');
        const recall = await turn('What dashboard preference did I give the room?');
        assert.match(recall.messageEvents[0].text, /obsidian dashboards with one red accent/i);
        assert.ok(recall.continuityLedger.some(item => item.status === 'active' && /obsidian dashboards/.test(item.text)));

        const contradiction = await turn('Actually my dashboard preference is pale blue with no red accents.');
        assert.match(contradiction.messageEvents[0].text, /superseded/i);
        assert.ok(contradiction.continuityLedger.some(item => item.status === 'active' && /pale blue/.test(item.text)));
        assert.ok(contradiction.continuityLedger.some(item => item.status === 'superseded' && /obsidian dashboards/.test(item.text)));
        assert.ok(contradiction.continuityLedger.every(item => item.source === 'pack1-memory'));
        assert.doesNotMatch(JSON.stringify(contradiction), /test-room-provider-key|AIza|aishaDiagnostics|requestShapeSummary|processAishaRequestType|generatorPrompt/);
      });
    } finally {
      if (originalGemini == null) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = originalGemini;
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
        const request = capturedRequests.find(item => item.activeSpeakerId === 'grok' && /sorry Grok/i.test(item.messageText))
          || capturedRequests.at(-1);
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

test('Studio Pulse v0.6 Open Floor is explicit, bounded, and direct address still wins', async () => {
  await withAishaFlag(null, async () => {
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for deterministic Open Floor smoke');
      };
      await withStudioServer(async baseUrl => {
        const standard = await pulsePost(baseUrl, 'hi team');
        assert.equal(standard.roomIntelligence.exchangeMode, 'solo');
        assert.equal(standard.response.messageEvents.length, 1);

        const openFloor = await pulsePost(baseUrl, 'hear from the room on the provider timeout', {
          openFloor: true,
          exchangeMode: 'open-floor'
        });
        const openEvents = openFloor.response.messageEvents || [];
        const nonClose = openEvents.filter(event => exchangeLabelOf(event) !== 'Close');
        assert.equal(openFloor.roomIntelligence.exchangeMode, 'open-floor');
        assert.equal(openEvents.length <= 4, true);
        assert.equal(nonClose.length <= 3, true);
        assert.notDeepEqual(openEvents.map(event => event.speakerId).sort(), ['aisha', 'claudia', 'grok', 'leah', 'vanya'].sort());
        assert.ok(openEvents.some(event => exchangeLabelOf(event) === 'Open Floor'));
        assert.doesNotMatch(JSON.stringify(openEvents), /\b(exchangeRole|addendumSpeakerId|commandCloseSpeakerId|specialistGravity|relationshipStates)\b/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{ content: 'I think the taste issue is the direction, not the volume. If it needs force to feel alive, it is probably too bland.' }],
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
        throw new Error('external provider should not be called for direct-address exchange smoke');
      };
      await withStudioServer(async baseUrl => {
        const direct = await pulsePost(baseUrl, 'Leah, open floor on this tasteful direction', {
          openFloor: true,
          exchangeMode: 'open-floor'
        });
        assert.equal(direct.roomIntelligence.exchangeMode, 'solo');
        assert.deepEqual(direct.response.messageEvents.map(event => event.speakerId), ['leah']);
        assert.equal(direct.response.messageEvents[0].providerMode, 'aisha-accepted');
        assert.equal(exchangeLabelOf(direct.response.messageEvents[0]), '');
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('Studio Pulse v0.6 accepts only planned addenda and suppresses weak side notes', async () => {
  await withAishaFlag('true', async () => {
    const capturedRequests = [];
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => {
        capturedRequests.push(request);
        const speaker = String(request.activeSpeakerId || '');
        return {
          ok: true,
          responses: [{
            speakerId: 'runtime-extra-speaker',
            content: speaker === 'claudia'
              ? 'Side note: assign one owner and freeze the next verification pass before another provider timeout gets buried.'
              : 'The provider timeout repeated. Isolate the failing edge first, then stop decorating the smoke.'
          }],
          memorySummary: { activeTruths: [], supersededTruths: [], memoryCandidates: [], sessionId: request.sessionId },
          stateEnvelope: { mood: 0.2 },
          relationshipDeltas: [],
          trace: { status: 'succeeded' },
          engineMode: 'production',
          aishaEngineConnected: true,
          confidence: 0.9
        };
      }
    }));
    const originalFetch = global.fetch;
    try {
      global.fetch = async (url, options) => {
        if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
        throw new Error('external provider should not be called for accepted addendum smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'the provider failed again with the same timeout');
        const events = data.response.messageEvents || [];
        assert.deepEqual(events.map(event => event.speakerId), ['grok', 'claudia']);
        assert.equal(exchangeLabelOf(events[1]), 'Adds');
        assert.equal(data.roomIntelligence.exchangeMode, 'solo-plus-addendum');
        assert.equal(data.roomIntelligence.aishaAcceptedCount, 2);
        assert.equal(data.activeEngine, 'aisha-runtime-pack1');
        assert.equal(capturedRequests.length, 2);
        const addendumRequest = capturedRequests.find(request => request.activeSpeakerId === 'claudia');
        assert.equal(addendumRequest.projectContext?.exchangeContextV06?.schemaVersion, 'studio-pulse.exchange.v0.6');
        assert.equal(addendumRequest.projectContext.exchangeContextV06.exchangeRole, 'addendum');
        assert.equal(addendumRequest.projectContext.exchangeContextV06.addendumSpeakerId, 'claudia');
        assert.equal(addendumRequest.projectContext.exchangeContextV06.openFloorActive, false);
        assert.equal(addendumRequest.projectContext.expressiveHabitatContext.exchangeRole, 'addendum');
        assert.equal(addendumRequest.projectContext.expressiveHabitatContext.sideCommentAllowed, true);
        assert.doesNotMatch(JSON.stringify(addendumRequest.projectContext.exchangeContextV06), /\b(relationshipStates|specialistGravity|pulseReason|repairNeeded|trust|warmth|irritation|0\.\d+)\b/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{
          content: request.activeSpeakerId === 'claudia'
            ? 'I agree.'
            : 'The provider timeout repeated. Isolate the failing edge first, then stop decorating the smoke.'
        }],
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
        throw new Error('external provider should not be called for suppressed addendum smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'the provider failed again with the same timeout');
        const events = data.response.messageEvents || [];
        assert.deepEqual(events.map(event => event.speakerId), ['grok']);
        assert.equal(data.roomIntelligence.exchangeMode, 'solo-plus-addendum');
        assert.equal(data.roomIntelligence.aishaAcceptedCount, 1);
        assert.equal(data.roomIntelligence.addendumSpeakerId, 'claudia');
        assert.doesNotMatch(JSON.stringify(events), /\bI agree\b/i);
      });
    } finally {
      global.fetch = originalFetch;
    }
  });
});

test('A.I.S.H.A cannot invent extra Studio Pulse exchange speakers', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [
          { speakerId: 'vanya', content: 'Hey team. I can feel the room settling in, and I am keeping the landing human.' },
          { speakerId: 'grok', content: 'Unplanned diagnostic aside should not appear.' }
        ],
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
        throw new Error('external provider should not be called for unplanned speaker suppression smoke');
      };
      await withStudioServer(async baseUrl => {
        const data = await pulsePost(baseUrl, 'hi team');
        const events = data.response.messageEvents || [];
        assert.deepEqual(events.map(event => event.speakerId), ['vanya']);
        assert.equal(events[0].providerMode, 'aisha-accepted');
        assert.doesNotMatch(JSON.stringify(events), /Unplanned diagnostic aside/i);
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
    assert.match(uiSource, /const seen = new Set\(\)/);
    assert.match(uiSource, /addChip\(humanIntent\)/);
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
        assert.match(social.response.messageEvents[0].text, /Room read:/i);
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

test('Studio Pulse v0.6.2 degraded fallback is product-grade for live prompts', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async request => ({
        ok: true,
        responses: [{ speakerId: request.activeSpeakerId, content: 'Disconnected A.I.S.H.A content should not show' }],
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
        throw new Error('external provider should not be called for v0.6.2 degraded fallback smoke');
      };
      await withStudioServer(async baseUrl => {
        const first = await pulsePost(baseUrl, 'ok what the nex t highest valuable move');
        let events = first.response.messageEvents || [];
        let text = visibleText(events);
        assert.equal(first.activeEngine, 'local-room-intelligence');
        assert.match(text, /highest-value move|live feel-pass|first thing that breaks/i);
        assert.doesNotMatch(text, FORBIDDEN_FALLBACK_QUALITY_RX);
        assert.doesNotMatch(text, /^ok what the nex t highest valuable move/i);

        const threadId = first.thread?.id || first.response?.threadMeta?.id;
        const followUp = await pulsePost(baseUrl, 'what?', { threadId });
        events = followUp.response.messageEvents || [];
        text = visibleText(events);
        assert.match(text, /verification, not another layer|fix the live seam/i);
        assert.doesNotMatch(text, /ok what the nex t highest valuable move what/i);
        assert.doesNotMatch(text, FORBIDDEN_FALLBACK_QUALITY_RX);
        assert.notEqual(text, visibleText(first.response.messageEvents || []));

        const open = await pulsePost(baseUrl, 'open floor');
        events = open.response.messageEvents || [];
        text = visibleText(events);
        assert.equal(open.roomIntelligence.exchangeMode, 'open-floor');
        assert.deepEqual(events.map(event => event.speakerId), ['vanya']);
        assert.match(text, /Open floor needs a subject/i);
        assert.doesNotMatch(text, FORBIDDEN_FALLBACK_QUALITY_RX);
        assert.doesNotMatch(text, /\b(that|object)\b/i);

        const banter = await pulsePost(baseUrl, 'is that it, whos hungry?');
        events = banter.response.messageEvents || [];
        text = visibleText(events);
        assert.match(text, /voting food|pretend not to care|scheduling problem/i);
        assert.doesNotMatch(text, /is that it, whos hungry/i);
        assert.doesNotMatch(text, FORBIDDEN_FALLBACK_QUALITY_RX);
        assert.doesNotMatch(JSON.stringify(banter.roomRuntime?.roomIntelligenceV0?.characterContinuityV0?.characterMemories || {}), /hungry|food/i);

        const rollCall = await pulsePost(baseUrl, 'can everyone come online for a role call');
        events = rollCall.response.messageEvents || [];
        text = visibleText(events);
        assert.deepEqual(events.map(event => event.speakerId), ['aisha', 'vanya', 'leah', 'claudia', 'grok']);
        assert.equal(events.every(event => event.roomIntent === 'available-roll-call'), true);
        assert.match(text, /Aisha here|Vanya here|Leah here|Claudia here|Grok here/i);
        assert.doesNotMatch(text, /quiet\/listening|not absent/i);
        assert.doesNotMatch(text, FORBIDDEN_FALLBACK_QUALITY_RX);
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
