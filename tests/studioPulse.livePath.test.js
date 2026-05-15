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

async function pulsePost(baseUrl, question) {
  const response = await fetch(`${baseUrl}/api/studio/pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      question,
      providerConfig: {
        textPrimary: {
          provider: 'gemini',
          model: 'gemini-2.0-flash',
          apiKey: 'test-room-provider-key',
          label: 'Mock Gemini'
        },
        pulseApiKeys: []
      }
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

test('Studio Pulse can activate mocked public A.I.S.H.A host response when flag is on', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async specifier => {
      assert.equal(specifier, 'aisha-runtime-pack1');
      return {
        processAishaRequest: async request => ({
          responses: [{ speakerId: 'vanya', content: `A.I.S.H.A heard "${request.message}" and returned through the public host.` }],
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
        })
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
        assert.match(event.text, /public host/);
        assert.doesNotMatch(JSON.stringify(data), /\[Mock A\.I\.S\.H\.A\]/);
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
