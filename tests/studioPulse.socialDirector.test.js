const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const studioRouter = require('../routes/studio');
const { __setAishaRuntimeImporterForTests } = require('../lib/aisha/aishaAdapter');

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
        stateUpdates: { notes: ['valid social beat'] }
      })
    }));
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'can we just vibe for a second?');
      assert.equal(body.activeEngine, 'aisha-runtime-pack1');
      assert.equal(body.aishaConnected, true);
      assert.equal(body.validation.source, 'aisha');
      assert.deepEqual(body.messageEvents.map(item => item.speakerId), ['vanya', 'grok']);
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
      assertCleanVisible(body);
    });
  });
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
