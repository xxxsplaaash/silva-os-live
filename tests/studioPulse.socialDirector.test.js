const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { spawn } = require('node:child_process');
const path = require('node:path');

const studioRouter = require('../routes/studio');
const { __setAishaRuntimeImporterForTests } = require('../lib/aisha/aishaAdapter');
const { buildRoomDirectorInput, buildRoomDirectorPrompt } = require('../lib/studio/socialDirector/roomDirectorPrompt');
const { validateDirectorOutput } = require('../lib/studio/socialDirector/socialDirectorValidator');
const { projectShowcaseSocialSignals } = require('../lib/studio/showcaseSocialSignals');

const BANNED_RX = /\b(I hear|I will keep this human|degraded mode|fallback|I need the object|Give me the thing|Say the thing plainly|if that is the object|on that:|I agree with)\b/i;
const RAW_INTERNAL_RX = /\b(exchangeContextV06|selectedSpeakers|addendumConstraint|relationshipSummaries|repairNeeded|trust:\s*\d|irritation:\s*\d|gravity|pulseReason|aishaDiagnostics|projectContext|activeSpeakerId)\b/i;

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

async function postSocial(baseUrl, message, extra = {}) {
  const response = await fetch(`${baseUrl}/api/studio/pulse-social`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...extra })
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function postPulse(baseUrl, message, extra = {}) {
  const response = await fetch(`${baseUrl}/api/studio/pulse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, ...extra })
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function withEnvVar(name, value, fn) {
  const original = process.env[name];
  if (value == null) delete process.env[name];
  else process.env[name] = String(value);
  try {
    await fn();
  } finally {
    if (original == null) delete process.env[name];
    else process.env[name] = original;
  }
}

function runNodeScript(args = {}, env = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

function visibleText(body = {}) {
  return [
    body.roomBeat,
    ...(Array.isArray(body.messageEvents) ? body.messageEvents.map(item => item.text) : []),
    ...(Array.isArray(body.silentReactions) ? body.silentReactions.map(item => item.visibleState) : [])
  ].join('\n');
}

function assertCleanVisible(body) {
  const text = visibleText(body);
  assert.doesNotMatch(text, BANNED_RX);
  assert.doesNotMatch(text, RAW_INTERNAL_RX);
}

function mockAishaJson(output) {
  return {
    ok: true,
    aishaEngineConnected: true,
    engineMode: 'production',
    responses: [{ speakerId: 'aisha', content: JSON.stringify(output) }],
    trace: { status: 'succeeded' }
  };
}

function mockAishaContent(content, overrides = {}) {
  return {
    ok: overrides.ok !== false,
    aishaEngineConnected: overrides.aishaEngineConnected !== false,
    engineMode: overrides.engineMode || 'production',
    responses: [{ speakerId: 'aisha', content }],
    trace: overrides.trace || { status: 'succeeded' },
    fallbackReason: overrides.fallbackReason || ''
  };
}

test('social director route exists and returns sandbox schema with local fallback', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { status, body } = await postSocial(baseUrl, 'hi team');
      assert.equal(status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.mode, 'social-director-experiment');
      assert.ok(body.roomBeat);
      assert.ok(body.roomMood);
      assert.ok(body.responseMode);
      assert.ok(Array.isArray(body.messageEvents));
      assert.ok(Array.isArray(body.silentReactions));
      assert.equal(body.activeEngine, 'local-social-director');
      assertCleanVisible(body);
    });
  });
});

test('casual social prompts do not require artifacts or task objects', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      for (const prompt of ['who’s hungry?', 'open floor', 'no, I just want you all to talk', 'can we just vibe for a second?']) {
        const { body } = await postSocial(baseUrl, prompt);
        const text = visibleText(body);
        assert.equal(body.ok, true);
        assertCleanVisible(body);
        assert.doesNotMatch(text, /\b(artifact|object|nothing to evaluate|needs a subject|there is no)\b/i, prompt);
        assert.ok(body.messageEvents.length >= 1, prompt);
      }
    });
  });
});

test('explicit everyone prompt can produce five brief social lines', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'everyone come online');
      assert.equal(body.responseMode, 'open_floor');
      assert.equal(body.messageEvents.length, 5);
      assert.deepEqual(body.messageEvents.map(item => item.speakerId), ['aisha', 'vanya', 'leah', 'claudia', 'grok']);
      for (const event of body.messageEvents) {
        assert.ok(event.text.split(/\s+/).length <= 28, event.text);
      }
      assertCleanVisible(body);
    });
  });
});

test('direct address routes naturally without production planner involvement', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const cases = [
        ['Leah, girl?', 'leah'],
        ['Grok, say something normal for once', 'grok'],
        ['Claudia, are we a mess?', 'claudia'],
        ['Aisha, take the room', 'aisha'],
        ['Vanya, what’s the vibe?', 'vanya']
      ];
      for (const [prompt, speakerId] of cases) {
        const { body } = await postSocial(baseUrl, prompt);
        assert.equal(body.messageEvents[0].speakerId, speakerId, prompt);
        assertCleanVisible(body);
      }
      const { body } = await postSocial(baseUrl, 'Vanya, call someone in');
      assert.equal(body.messageEvents[0].speakerId, 'vanya');
      assert.ok(body.messageEvents.some(item => item.role === 'called_in' && item.speakerId !== 'vanya'));
      assertCleanVisible(body);
    });
  });
});

test('social director fallback handles identity pressure without task fallback language', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const prompts = [
        'you don’t exist to interrupt, yk that?',
        'why are you all quiet?',
        'do you guys like each other?',
        'who’s annoyed right now?',
        'everyone bully this weak idea',
        'call them out and start talking'
      ];
      for (const prompt of prompts) {
        const { body } = await postSocial(baseUrl, prompt);
        assertCleanVisible(body);
        assert.ok(body.messageEvents.length >= 1, prompt);
        assert.ok(body.messageEvents.length <= 5, prompt);
      }
    });
  });
});

test('non-everyone prompts stay bounded to at most three speakers', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      for (const prompt of ['who’s hungry?', 'this logo feels bland, right?', 'the provider failed again with the same timeout']) {
        const { body } = await postSocial(baseUrl, prompt);
        assert.ok(body.messageEvents.length <= 3, prompt);
        assertCleanVisible(body);
      }
    });
  });
});

test('mocked A.I.S.H.A JSON is accepted when valid', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => mockAishaJson({
        roomBeat: 'Vanya opens the room socially.',
        roomMood: 'playful',
        responseMode: 'small_exchange',
        speakers: [
          { speakerId: 'vanya', role: 'primary', tone: 'warm with bite', text: 'The room is awake. Nobody needs a task badge to talk.' },
          { speakerId: 'grok', role: 'side', tone: 'dry', text: 'I have filed a mild objection to the word vibe, but yes.' }
        ],
        silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
        socialCues: {
          roomMove: 'redirect',
          tensionDelta: -2,
          continuityDelta: 0,
          speakerCues: [
            { speakerId: 'vanya', targetSpeakerId: 'grok', stance: 'dominant', statusDelta: 5 },
            { speakerId: 'grok', allianceWith: 'vanya', stance: 'allied', statusDelta: 2 }
          ]
        },
        stateUpdates: { notes: ['valid social beat'] }
      })
    }));
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'can we just vibe for a second?');
      assert.equal(body.activeEngine, 'aisha-runtime-pack1');
      assert.equal(body.aishaConnected, true);
      assert.equal(body.validation.source, 'aisha');
      assert.equal(body.validation.repaired, false);
      assert.equal(body.validation.fallbackUsed, false);
      assert.equal(body.debugSummary.failureCategory, '');
      assert.deepEqual(body.messageEvents.map(item => item.speakerId), ['vanya', 'grok']);
      assert.doesNotMatch(JSON.stringify(body), /socialCues/);
      assertCleanVisible(body);
    });
  });
});

test('social director normalizes bounded social cues and ignores invalid speakers', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'A status challenge lands.',
    roomMood: 'sharp',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'sharp', text: 'That idea is hiding behind politeness.' },
      { speakerId: 'aisha', role: 'side', tone: 'precise', text: 'The prior claim is still on record.' }
    ],
    silentReactions: [{ speakerId: 'grok', visibleState: 'Tracking' }],
    socialCues: {
      roomMove: 'challenge',
      tensionDelta: 99,
      continuityDelta: -99,
      speakerCues: [
        { speakerId: 'leah', targetSpeakerId: 'aisha', stance: 'dominant', statusDelta: 42, allianceWith: 'grok', interruptionKind: 'status-cut' },
        { speakerId: 'ghost', targetSpeakerId: 'leah', stance: 'dominant', statusDelta: 8 }
      ]
    },
    stateUpdates: { notes: [] }
  }, { userMessage: 'Leah, challenge that idea.' });

  assert.equal(validation.ok, true);
  assert.equal(validation.output.socialCues.roomMove, 'challenge');
  assert.equal(validation.output.socialCues.tensionDelta, 12);
  assert.equal(validation.output.socialCues.continuityDelta, -12);
  assert.equal(validation.output.socialCues.speakerCues.length, 1);
  assert.deepEqual(validation.output.socialCues.speakerCues[0], {
    speakerId: 'leah',
    targetSpeakerId: 'aisha',
    stance: 'dominant',
    statusDelta: 8,
    allianceWith: 'grok',
    interruptionKind: 'status-cut'
  });
});

test('showcase social signal projector maps social cues without creating truth', () => {
  const signals = projectShowcaseSocialSignals({
    mode: 'continuity_breaker',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    messageEvents: [{ speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'That contradicts the prior claim.' }],
    silentReactions: [{ speakerId: 'grok', visibleState: 'Tracking' }],
    continuityLedger: [],
    roomState: { priorSpeaker: 'leah' },
    socialCues: {
      roomMove: 'anchor',
      tensionDelta: 6,
      continuityDelta: 12,
      speakerCues: [
        { speakerId: 'aisha', targetSpeakerId: 'leah', stance: 'dominant', statusDelta: 8, interruptionKind: 'continuity-correction' },
        { speakerId: 'grok', allianceWith: 'aisha', stance: 'allied', statusDelta: 3 }
      ]
    },
    diagnostics: {}
  });

  assert.equal(signals.roomMove, 'anchor');
  assert.ok(signals.tension >= 0 && signals.tension <= 100);
  assert.equal(signals.continuityPressure, 12);
  assert.ok(signals.statusEvents.some(item => item.kind === 'continuity-anchor' && item.speakerId === 'aisha'));
  assert.ok(signals.alliances.some(item => item.between.includes('aisha') && item.between.includes('grok')));
  assert.ok(signals.interruptions.some(item => item.kind === 'continuity-correction' && item.interrupter === 'aisha'));
});

test('showcase social signal projector carries bounded social memory without continuity rows', () => {
  const signals = projectShowcaseSocialSignals({
    mode: 'social_hierarchy_lab',
    roomMood: 'sharp',
    responseMode: 'small_exchange',
    messageEvents: [{ speakerId: 'leah', role: 'primary', tone: 'sharp challenge', text: 'That is a status move.' }],
    silentReactions: [{ speakerId: 'vanya', visibleState: 'Cooling' }],
    continuityLedger: [],
    roomState: {
      priorSpeaker: 'grok',
      socialSignals: {
        hierarchy: [
          { speakerId: 'leah', status: 68 },
          { speakerId: 'grok', status: 66 }
        ],
        socialMemory: {
          statusMomentum: [
            { speakerId: 'leah', value: 250 },
            { speakerId: 'ghost', value: 90 },
            { speakerId: 'grok', value: -250 }
          ],
          pairPressure: [
            { between: ['leah', 'grok'], affinity: 500, friction: 500, lastMove: 'interruption' },
            { between: ['leah', 'ghost'], affinity: 80, friction: 20, lastMove: 'alliance' }
          ],
          recentRoomMoves: ['redirect', 'not-real', 'challenge'],
          interruptionPressure: 999
        }
      }
    },
    socialCues: {
      roomMove: 'challenge',
      tensionDelta: 5,
      continuityDelta: 0,
      speakerCues: [
        { speakerId: 'leah', targetSpeakerId: 'grok', stance: 'dominant', statusDelta: 6, interruptionKind: 'status-cut' }
      ]
    },
    diagnostics: {}
  });

  assert.equal(signals.roomMove, 'challenge');
  assert.ok(signals.socialMemory);
  assert.ok(signals.socialMemory.statusMomentum.every(item => item.value >= -100 && item.value <= 100));
  assert.ok(signals.socialMemory.pairPressure.every(item => item.affinity >= 0 && item.affinity <= 100 && item.friction >= 0 && item.friction <= 100));
  assert.ok(signals.socialMemory.pairPressure.some(item => item.between.includes('leah') && item.between.includes('grok')));
  assert.equal(signals.socialMemory.pairPressure.some(item => item.between.includes('ghost')), false);
  assert.ok(signals.socialMemory.interruptionPressure >= 0 && signals.socialMemory.interruptionPressure <= 100);
  assert.ok(signals.socialMemory.recentRoomMoves.includes('challenge'));
  assert.equal(Object.prototype.hasOwnProperty.call(signals, 'continuityLedger'), false);
});

test('room director prompt receives compact relationship context only as advisory state', () => {
  const input = buildRoomDirectorInput({
    message: 'Leah, challenge that drift.',
    roomState: {
      roomMood: 'sharp',
      responseMode: 'small_exchange',
      priorSpeaker: 'grok',
      socialSignals: {
        socialMemory: {
          statusMomentum: [
            { speakerId: 'leah', value: 71 },
            { speakerId: 'ghost', value: 100 }
          ],
          pairPressure: [
            { between: ['leah', 'grok'], affinity: 10, friction: 88, lastMove: 'interruption' },
            { between: ['aisha', 'ghost'], affinity: 99, friction: 0, lastMove: 'alliance' }
          ],
          recentRoomMoves: ['challenge', 'fake-move'],
          interruptionPressure: 93
        }
      }
    }
  });
  const prompt = buildRoomDirectorPrompt(input);

  assert.match(prompt, /relationshipContext/);
  assert.match(prompt, /interruptionPressure/);
  assert.match(prompt, /leah/);
  assert.match(prompt, /grok/);
  assert.doesNotMatch(prompt, /ghost|fake-move/);
  assert.match(prompt, /never treat it as factual memory or a continuity ledger/);
});

test('SOCIAL_DIRECTOR_MODEL is passed only to the social director route', async () => {
  await withAishaFlag('true', async () => {
    await withEnvVar('SOCIAL_DIRECTOR_MODEL', 'gemini-2.5-flash-lite', async () => {
      let socialOptions = null;
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async (_request, options) => {
          socialOptions = options;
          return mockAishaJson({
            roomBeat: 'Vanya opens the room socially.',
            roomMood: 'playful',
            responseMode: 'single',
            speakers: [{ speakerId: 'vanya', role: 'primary', tone: 'warm', text: 'The room is awake without turning this into a task queue.' }],
            silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
            stateUpdates: { notes: [] }
          });
        }
      }));
      await withStudioServer(async baseUrl => {
        const providerConfig = { textPrimary: { provider: 'gemini', apiKey: 'test-room-provider-key', label: 'Mock Gemini' } };
        const { body } = await postSocial(baseUrl, 'hi team', { providerConfig });
        assert.equal(body.activeEngine, 'aisha-runtime-pack1');
        assert.equal(socialOptions.productionGeminiModel, 'gemini-2.5-flash-lite');
        assert.equal(body.debugSummary.modelUsed, 'gemini-2.5-flash-lite');
      });

      let pulseOptions = null;
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async (request, options) => {
          pulseOptions = options;
          return {
            ok: true,
            responses: [{ speakerId: request.activeSpeakerId || 'vanya', content: 'Hey team. I am in the room and keeping this warm without turning it into a meeting.' }],
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
          throw new Error('external provider should not be called for model isolation test');
        };
        await withStudioServer(async baseUrl => {
          const providerConfig = { textPrimary: { provider: 'gemini', apiKey: 'test-room-provider-key', label: 'Mock Gemini' } };
          const { body } = await postPulse(baseUrl, 'hi team', { providerConfig });
          assert.equal(body.activeEngine, 'aisha-runtime-pack1');
          assert.equal(Object.prototype.hasOwnProperty.call(pulseOptions, 'productionGeminiModel'), false);
        });
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

test('mocked A.I.S.H.A fenced JSON is parsed and accepted', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => mockAishaContent(`\`\`\`json\n${JSON.stringify({
        roomBeat: 'The room opens socially.',
        roomMood: 'playful',
        responseMode: 'single',
        speakers: [{ speakerId: 'leah', role: 'primary', tone: 'sharp', text: 'Girl, I am here. The room can stop acting surprised.' }],
        silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
        stateUpdates: { notes: [] }
      })}\n\`\`\``)
    }));
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'Leah, girl?');
      assert.equal(body.activeEngine, 'aisha-runtime-pack1');
      assert.equal(body.validation.source, 'aisha');
      assert.deepEqual(body.messageEvents.map(item => item.speakerId), ['leah']);
      assertCleanVisible(body);
    });
  });
});

test('invalid A.I.S.H.A output gets one repair attempt before fallback', async () => {
  await withAishaFlag('true', async () => {
    let callCount = 0;
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => {
        callCount += 1;
        if (callCount === 1) {
          return mockAishaJson({
            roomBeat: 'Bad task routing',
            roomMood: 'focused',
            responseMode: 'single',
            speakers: [{ speakerId: 'vanya', role: 'primary', tone: 'bad', text: 'I hear open floor. I need the object.' }],
            silentReactions: [],
            stateUpdates: { notes: [] }
          });
        }
        return mockAishaJson({
          roomBeat: 'The room loosens socially.',
          roomMood: 'playful',
          responseMode: 'single',
          speakers: [{ speakerId: 'vanya', role: 'primary', tone: 'warm', text: 'Open floor can be social. Say less and let the room breathe.' }],
          silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
          stateUpdates: { notes: [] }
        });
      }
    }));
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'open floor');
      assert.equal(callCount, 2);
      assert.equal(body.activeEngine, 'aisha-runtime-pack1');
      assert.equal(body.validation.source, 'aisha-repair');
      assert.equal(body.debugSummary.repairAttempted, true);
      assert.equal(body.validation.repaired, true);
      assert.equal(body.validation.fallbackUsed, false);
      assertCleanVisible(body);
    });
  });
});

test('live A.I.S.H.A parse/schema/validator failures fall back with safe categories', async () => {
  const cases = [
    {
      prompt: 'hi team',
      content: 'not json at all',
      category: 'json-parse-failed'
    },
    {
      prompt: 'open floor',
      content: JSON.stringify({ roomBeat: 'Empty room', roomMood: 'warm', responseMode: 'single', speakers: [], silentReactions: [], stateUpdates: { notes: [] } }),
      category: 'schema-invalid'
    },
    {
      prompt: 'who’s hungry?',
      content: JSON.stringify({
        roomBeat: 'Bad visible text',
        roomMood: 'playful',
        responseMode: 'single',
        speakers: [{ speakerId: 'vanya', role: 'primary', tone: 'bad', text: 'I hear who is hungry. I need the object.' }],
        silentReactions: [],
        stateUpdates: { notes: [] }
      }),
      category: 'validator-rejected'
    }
  ];

  for (const item of cases) {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async () => mockAishaContent(item.content)
      }));
      await withStudioServer(async baseUrl => {
        const { body } = await postSocial(baseUrl, item.prompt);
        assert.equal(body.activeEngine, 'local-social-director');
        assert.equal(body.validation.fallbackUsed, true);
        assert.equal(body.validation.failureCategory, item.category);
        assert.equal(body.debugSummary.failureCategory, item.category);
        assertCleanVisible(body);
      });
    });
  }
});

test('A.I.S.H.A unavailable and invalid-key failures are diagnosed safely', async () => {
  await withAishaFlag('true', async () => {
    __setAishaRuntimeImporterForTests(async () => ({
      processAishaRequest: async () => ({
        ok: false,
        aishaEngineConnected: false,
        engineMode: 'production',
        responses: [],
        trace: { status: 'failed', failureReason: 'Gemini API key invalid' },
        fallbackReason: 'Gemini API key invalid'
      })
    }));
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'hi team');
      assert.equal(body.activeEngine, 'local-social-director');
      assert.equal(body.validation.fallbackUsed, true);
      assert.equal(body.validation.failureCategory, 'invalid-key');
      assert.equal(body.debugSummary.failureCategory, 'invalid-key');
      assert.equal(typeof body.debugSummary.runtimeCredentialProvided, 'boolean');
      assertCleanVisible(body);
    });
  });
});

test('quota and rate-limit failures are diagnosed as quota-exceeded', async () => {
  const failures = [
    'RESOURCE_EXHAUSTED quota exceeded',
    'quota exceeded for metric Gemini 2.5 Flash RPM',
    'rate-limit exceeded, please retry later',
    'Gemini 2.5 Flash RPD exceeded'
  ];

  for (const failure of failures) {
    await withAishaFlag('true', async () => {
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async () => ({
          ok: false,
          aishaEngineConnected: false,
          engineMode: 'production',
          responses: [],
          trace: { status: 'failed', failureReason: failure },
          fallbackReason: failure
        })
      }));
      await withStudioServer(async baseUrl => {
        const { body } = await postSocial(baseUrl, 'hi team');
        assert.equal(body.activeEngine, 'local-social-director');
        assert.equal(body.validation.fallbackUsed, true);
        assert.equal(body.validation.failureCategory, 'quota-exceeded');
        assert.equal(body.debugSummary.failureCategory, 'quota-exceeded');
        assert.equal(body.debugSummary.providerFailureReason, 'quota exceeded / resource exhausted');
        assertCleanVisible(body);
      });
    });
  }
});

test('social director smoke script supports --limit and summary counts', async () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  let calls = 0;
  app.post('/api/studio/pulse-social', (req, res) => {
    calls += 1;
    res.json({
      ok: true,
      mode: 'social-director-experiment',
      activeEngine: 'local-social-director',
      aishaConnected: false,
      roomBeat: 'Tiny room beat.',
      roomMood: 'warm',
      responseMode: 'single',
      messageEvents: [{ speakerId: 'vanya', speakerName: 'Vanya Khumalo', role: 'primary', tone: 'warm', text: 'The room is here and bounded.', visibleState: 'Reading' }],
      silentReactions: [],
      validation: { ok: true, fallbackUsed: true },
      debugSummary: { failureCategory: 'quota-exceeded', providerFailureReason: 'quota exceeded / resource exhausted' }
    });
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await runNodeScript([
      path.resolve(__dirname, '../scripts/smoke-social-director.mjs'),
      `http://127.0.0.1:${port}`,
      '--limit',
      '2',
      '--fallback-ok'
    ]);
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(calls, 2);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.summary.attemptedCalls, 2);
    assert.equal(parsed.summary.liveAcceptedCount, 0);
    assert.equal(parsed.summary.fallbackUsedCount, 2);
    assert.equal(parsed.summary.quotaExceededCount, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Aisha takeover is short and single-speaker in fallback', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'Aisha, take the room');
      assert.equal(body.responseMode, 'aisha_takeover');
      assert.equal(body.messageEvents.length, 1);
      assert.equal(body.messageEvents[0].speakerId, 'aisha');
      assert.ok(body.messageEvents[0].text.split(/[.!?]+/).filter(Boolean).length <= 3);
      assertCleanVisible(body);
    });
  });
});
