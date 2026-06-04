const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const studioRouter = require('../routes/studio');
const { __setAishaRuntimeImporterForTests } = require('../lib/aisha/aishaAdapter');
const { buildRoomDirectorInput, buildRoomDirectorPrompt } = require('../lib/studio/socialDirector/roomDirectorPrompt');
const { runSocialDirectorTurn } = require('../lib/studio/socialDirector');
const { socialFallbackFor } = require('../lib/studio/socialDirector/socialDirectorFallback');
const { rawInternalLeakFound, validateDirectorOutput } = require('../lib/studio/socialDirector/socialDirectorValidator');
const { evaluateVisibleResponse } = require('../lib/studio/socialDirector/visibleResponseQuality');
const { projectShowcaseSocialSignals } = require('../lib/studio/showcaseSocialSignals');

const BANNED_RX = /\b(I hear|I will keep this human|degraded mode|fallback|I need the object|Give me the thing|Say the thing plainly|if that is the object|on that:|I agree with)\b/i;
const RAW_INTERNAL_RX = /\b(exchangeContextV06|selectedSpeakers|addendumConstraint|relationshipSummaries|repairNeeded|trust:\s*\d|irritation:\s*\d|gravity:\s*\d|pulseReason|aishaDiagnostics|projectContext|activeSpeakerId)\b/i;

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

function fallbackVisibleText(output = {}) {
  return [
    output.roomBeat,
    ...(Array.isArray(output.speakers) ? output.speakers.map(item => item.text) : []),
    ...(Array.isArray(output.stateUpdates?.notes) ? output.stateUpdates.notes : [])
  ].join('\n');
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

test('room director prompt treats benign practical asks as valid room topics', () => {
  const input = buildRoomDirectorInput({
    message: 'LOL I WANNA GROW MY MUSCLES',
    roomState: { roomMood: 'focused' }
  });
  const prompt = buildRoomDirectorPrompt(input);

  assert.match(prompt, /Allowed benign practical asks include fitness/);
  assert.match(prompt, /Never refuse a benign practical ask/);
  assert.match(prompt, /muscle\/fitness asks/);
  assert.match(prompt, /We are not discussing personal fitness routines/);
  assert.match(prompt, /three simple training days/);
});

test('social director quality validator rejects the fitness refusal loop', () => {
  const validation = validateDirectorOutput({
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
  }, { userMessage: 'LOL I WANNA GROW MY MUSCLES' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('allowed-topic-refusal:fitness'));
  assert.ok(validation.issues.includes('false-objective-claim'));
  assert.ok(validation.issues.includes('topic-ignored:fitness'));
  assert.ok(validation.issues.includes('takeover-for-ordinary-topic:fitness'));
});

test('social director quality validator rejects repeated assistant refusals across recent turns', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'Aisha repeats the same refusal.',
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
  }, {
    userMessage: 'BRUH...',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'WHERE DO I START' },
      { speakerId: 'aisha', role: 'primary', text: 'The objective is clear. We are not discussing personal fitness routines.' }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('recent-repeat-risk'));
  assert.ok(validation.issues.includes('allowed-topic-refusal:fitness'));
});

test('social director quality validator accepts useful short fitness guidance in room voice', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The practical fitness ask gets grounded instead of refused.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      {
        speakerId: 'vanya',
        role: 'primary',
        tone: 'warm reset',
        text: 'Start at home this week. Three short sessions; no heroic rebrand required.'
      },
      {
        speakerId: 'claudia',
        role: 'side',
        tone: 'practical',
        text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.'
      },
      {
        speakerId: 'grok',
        role: 'closer',
        tone: 'dry diagnostic',
        text: 'Sharp joint pain means swap the move, not prove a point. Soreness is allowed.'
      }
    ],
    silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
    stateUpdates: { notes: ['Beginner muscle-building guidance.'] }
  }, { userMessage: 'LOL I WANNA GROW MY MUSCLES' });

  assert.equal(validation.ok, true);
  assert.equal(validation.issues.length, 0);
});

test('social director fallback answers the failed muscle-building transcript instead of refusing', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'aisha', role: 'primary', text: 'The objective is clear. We are not discussing personal fitness routines.' }
      ];
      const { body } = await postSocial(baseUrl, 'WHERE DO I START', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.equal(body.activeEngine, 'local-social-director');
      assert.equal(body.responseMode, 'small_exchange');
      assert.doesNotMatch(text, /\b(objective is clear|not discussing|focus is required|personal fitness routines)\b/i);
      assert.match(text, /\b(incline push-ups|backpack rows|split squats|hip hinges|plank|reps)\b/i);
      assert.ok(body.messageEvents.some(item => item.speakerId === 'claudia'));
      assertCleanVisible(body);
    });
  });
});

test('showcase-shaped fallback lets current practical prompt beat advisory open-floor mode', async () => {
  const result = await runSocialDirectorTurn({
    body: {
      question: 'LOL I WANNA GROW MY MUSCLES',
      openFloor: true,
      recentTurns: [],
      roomState: { roomMood: 'focused' }
    },
    callAishaEngine: async () => mockAishaContent('', {
      aishaEngineConnected: false,
      engineMode: 'unavailable',
      fallbackReason: 'not-connected',
      trace: { status: 'failed', reason: 'not-connected' }
    })
  });

  const body = result.payload;
  const text = visibleText(body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.activeEngine, 'local-social-director');
  assert.equal(body.responseMode, 'small_exchange');
  assert.doesNotMatch(text, /\b(Open floor can be a room|jazz hands|panel show)\b/i);
  assert.match(text, /\b(incline push-ups|backpack rows|split squats|hip hinges|plank|reps)\b/i);
  assertCleanVisible(body);
});

test('social director fallback changes shape instead of repeating fitness recovery', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'WHAT IS THE OBJECTIVE?' },
        { speakerId: 'vanya', role: 'primary', text: 'Fair. The room dropped the thread; the objective is your actual ask: start building muscle without turning it into chaos.' },
        { speakerId: 'claudia', role: 'side', text: 'Start with three full-body sessions a week, track a few basic lifts, eat enough protein, and sleep like recovery is part of the plan.' },
        { speakerId: 'grok', role: 'closer', text: 'If it hurts sharply or you have a medical condition, get a real professional involved. Otherwise consistency beats theatrics.' }
      ];
      const { body } = await postSocial(baseUrl, 'BRUH...', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /objective is your actual ask: start building muscle/i);
      assert.doesNotMatch(text, /Start with three full-body sessions a week/i);
      assert.match(text, /\b(No more loop|three training days|week one|boring enough to repeat)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback changes shape after current fitness base recovery', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
        { speakerId: 'claudia', role: 'side', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down; next week add one rep or slow the lowering.' },
        { speakerId: 'grok', role: 'closer', text: 'Sharp joint pain means swap the move, not prove a point. Soreness is allowed; stupidity is optional.' }
      ];
      const { body } = await postSocial(baseUrl, 'WHAT IS THE OBJECTIVE?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /Start at home this week/i);
      assert.doesNotMatch(text, /incline push-ups, backpack rows/i);
      assert.match(text, /\b(No more loop|three training days|week one|boring enough to repeat)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback treats exercise artifacts as fitness context after old user line scrolls out', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
        { speakerId: 'claudia', role: 'side', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down; next week add one rep or slow the lowering.' },
        { speakerId: 'grok', role: 'closer', text: 'Sharp joint pain means swap the move, not prove a point. Soreness is allowed; stupidity is optional.' },
        { speakerId: 'user', role: 'user', text: 'ok but I only have 20 minutes' },
        { speakerId: 'vanya', role: 'primary', text: 'Twenty minutes is enough if you stop negotiating with it. Warm up, move clean, leave while you still want to come back.' },
        { speakerId: 'claudia', role: 'side', text: 'Do three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off.' },
        { speakerId: 'grok', role: 'closer', text: 'The constraint is useful. It forces a session you can actually finish.' }
      ];
      const { body } = await postSocial(baseUrl, 'WHERE DO I START', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /Start at home this week/i);
      assert.doesNotMatch(text, /incline push-ups, backpack rows/i);
      assert.match(text, /\b(No more loop|three training days|week one|boring enough to repeat)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback changes shape again after the no-more-loop recovery', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'WHAT IS THE OBJECTIVE?' },
        { speakerId: 'vanya', role: 'primary', text: 'Yeah, fair. No more loop: your next move is one simple week, not another speech about the objective.' },
        { speakerId: 'claudia', role: 'side', text: 'Pick three training days, write the exercises down, and add one tiny progression each week.' },
        { speakerId: 'grok', role: 'closer', text: 'If it cannot survive week one, shrink it until it can. Start boring enough to repeat.' }
      ];
      const { body } = await postSocial(baseUrl, 'BRUH...', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /objective is your actual ask: start building muscle/i);
      assert.doesNotMatch(text, /No more loop/i);
      assert.match(text, /\b(one workout|one meal|one sleep window|Log reps|specific enough to start)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback closes the third fitness recovery without repeating again', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'vanya', role: 'primary', text: 'Yeah. Strip it down: one workout, one meal, one sleep window.' },
        { speakerId: 'claudia', role: 'side', text: 'Do push, pull, legs, or the closest safe versions. Log reps.' },
        { speakerId: 'grok', role: 'closer', text: 'Good. That is specific enough to start.' }
      ];
      const { body } = await postSocial(baseUrl, 'BRUH...', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /one workout, one meal, one sleep window/i);
      assert.doesNotMatch(text, /run out of excuses and poetry/i);
      assert.match(text, /\b(No fourth version|first set|incline push-ups|two reps before failure)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback lets social check-in beat stale fitness recovery', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
        { speakerId: 'claudia', role: 'side', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.' },
        { speakerId: 'user', role: 'user', text: 'BRUH...' },
        { speakerId: 'vanya', role: 'primary', text: 'Fair. No fourth version. Clear space and start the first set.' },
        { speakerId: 'claudia', role: 'side', text: 'First move: incline push-ups. Stop two reps before failure, then write the number down.' }
      ];
      const { body } = await postSocial(baseUrl, 'how is everyone?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.equal(body.responseMode, 'open_floor');
      assert.match(text, /\b(Aisha here|Vanya here|Leah here|Claudia here|Grok here)\b/i);
      assert.doesNotMatch(text, /\b(incline push-ups|first set|write the number down|workout|training week|log reps)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback treats training-adjacent food as nutrition, not stale workout script', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'claudia', role: 'side', text: 'Three full-body sessions, enough food, and sleep.' }
      ];
      const { body } = await postSocial(baseUrl, 'i am hungry and want to train later, what should i eat?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.equal(body.responseMode, 'small_exchange');
      assert.match(text, /\b(banana|yoghurt|eggs and toast|rice and chicken|water|heavy)\b/i);
      assert.doesNotMatch(text, /\b(three full-body sessions|progressive overload|basic pushes|squats or hinges)\b/i);
      assert.doesNotMatch(text, /\b(recorded change|claim first|anchor the difference)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback answers lunch with concrete food direction', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'quick help: what should I eat for lunch?', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' },
          { speakerId: 'vanya', role: 'primary', text: 'Fair. No more repeat loop.' }
        ]
      });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.match(text, /\b(lunch|rice and chicken|eggs and toast|sandwich|leftovers|water)\b/i);
      assert.doesNotMatch(text, /system warning|assigning ownership|debate/i);
      assert.doesNotMatch(text, /\b(push-ups|split squats|progressive overload|training week)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback does not let old fitness context hijack watch prompts', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'i am hungry and want to train later, what should i eat?' },
        { speakerId: 'aisha', role: 'primary', text: 'For training, focus on lean protein and complex carbohydrates.' },
        { speakerId: 'claudia', role: 'side', text: 'A balanced meal with chicken or fish, rice or sweet potato, and vegetables will support your training.' }
      ];
      const { body } = await postSocial(baseUrl, 'open floor: what should the room watch next?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /\b(full-body|training week|progressive overload|protein|sharp pain|basic pushes|squats|hinges)\b/i);
      assert.match(text, /\b(Arrival|Spider-Verse|The Menu|quiet pressure|voltage|bite|watch|title|movie|film)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback lets watch intent beat open-floor prefix', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'open floor: what should the room watch next?', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'new topic: what movie should we watch tonight?' },
          { speakerId: 'vanya', role: 'primary', text: 'Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or The Menu if you want bite.' }
        ]
      });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /panel show|jazz hands|not the same as volunteering/i);
      assert.match(text, /\b(Arrival|Spider-Verse|The Menu|quiet pressure|voltage|bite|watch|title|movie|film)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback does not repeat the same watch recommendation block', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'new topic: what movie should we watch tonight?' },
        { speakerId: 'vanya', role: 'primary', text: 'Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or The Menu if you want bite.' },
        { speakerId: 'leah', role: 'side', text: 'One strong world, not wallpaper. Pick the one that matches the room temperature.' },
        { speakerId: 'grok', role: 'closer', text: 'Choose the constraint before the title. Otherwise recommendation becomes astrology with better lighting.' }
      ];
      const { body } = await postSocial(baseUrl, 'open floor: what should the room watch next?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /Tonight I would choose Arrival/i);
      assert.doesNotMatch(text, /One strong world, not wallpaper/i);
      assert.doesNotMatch(text, /constraint before the title/i);
      assert.match(text, /\b(Heat|Everything Everywhere All at Once|Knives Out|pressure|wonder|comfort)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback answers logo direction with concrete brand moves', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'I need a sharper logo direction for Silva', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'answer normally, what should I do today?' },
          { speakerId: 'claudia', role: 'side', text: 'If the old topic was training, do one short session.' }
        ]
      });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.match(text, /\b(Silva|logo|mark|wordmark|black|white|red|shape|spacing|accent|pulse|direction)\b/i);
      assert.doesNotMatch(text, /\b(bland is usually the room asking permission|impossible to scroll past)\b/i);
      assert.doesNotMatch(text, /\b(push-ups|workout|protein|training week)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director fallback answers landing-page design direction instead of generic room banter', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const { body } = await postSocial(baseUrl, 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'answer normally, what should I do today?' },
          { speakerId: 'vanya', role: 'primary', text: 'Hey. The room is here; nobody has to perform a job title just to be allowed to speak.' }
        ]
      });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.match(text, /\b(landing|hero|Silva|black glass|red pulse|CTA|SaaS|premium|direction|accent)\b/i);
      assert.doesNotMatch(text, /\b(room is here|perform a job title|silence means absence)\b/i);
      assert.doesNotMatch(text, /\b(push-ups|workout|protein|training week)\b/i);
      assertCleanVisible(body);
    });
  });
});

test('social director quality validator rejects stale fitness answer after open-floor pivot', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'Old fitness context leaks into a new open-floor prompt.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'host', text: 'Start simple: you need a repeatable training week.' },
      { speakerId: 'claudia', role: 'side', tone: 'practical', text: 'Three full-body sessions, enough protein, and sleep.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: ['Beginner muscle-building guidance.'] }
  }, {
    userMessage: 'open floor: what should the room watch next?',
    recentTurns: [{ speakerId: 'user', text: 'i am hungry and want to train later, what should i eat?' }]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('stale-topic-answer:fitness'));
});

test('social director quality validator rejects stale fitness answer after movie pivot', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'Old training context follows the new watch prompt.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'We have covered the training parameters. For tonight, what film are we considering?' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'Something with a good story after a workout.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'new topic: what movie should we watch tonight?',
    recentTurns: [{ speakerId: 'user', text: 'I am hungry before training, what should I eat?' }]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('stale-topic-answer:fitness'));
});

test('social director quality validator rejects parameter-soup and dodged quality checks', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'Grok hides behind structure.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'grok', role: 'primary', tone: 'dry', text: 'The parameters were clear. The suggestions were within those parameters.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Grok, be honest: was that useful or did it sound fake?' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('operational-jargon'));
  assert.ok(validation.issues.includes('social-question-ignored'));
});

test('social director quality validator rejects generic advice-column practical answers', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'Generic advice lands without room voice.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Consistency is key. Focus on compound movements.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Ensure adequate protein intake and prioritize sleep.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I want to grow muscle but I hate gyms. What do I do this week?' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('generic-advice-column'));
});

test('social director quality validator rejects live generic fitness variants and movie refusal', () => {
  const fitness = validateDirectorOutput({
    roomBeat: 'Generic provider answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: "That's a solid goal. Start with three full-body days this week, focus on compound lifts, and make sure you're eating enough protein." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Track your progress. Consistency in training and recovery is what builds muscle over time.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: "And listen to your body. Pain is not a sign of progress, it's a sign of potential damage." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I want to grow muscle but I hate gyms. What do I do this week?' });

  assert.equal(fitness.ok, false);
  assert.ok(fitness.issues.includes('generic-advice-column'));

  const movie = validateDirectorOutput({
    roomBeat: 'Refuses a benign topic.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'We are not watching a movie. The objective is to maintain focus on current priorities.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: what movie should we watch tonight?' });

  assert.equal(movie.ok, false);
  assert.ok(movie.issues.includes('allowed-topic-refusal:movie'));
});

test('social director quality validator rejects short-window generic fitness advice', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room gives ordinary advice.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Twenty minutes requires efficiency. Focus on compound movements that hit multiple muscle groups.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'A circuit of squats, push-ups, and lunges, repeated for time, will maximize your session. Keep rest periods short.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Ensure the intensity is high enough to signal adaptation. Volume is less critical than effort in a short window.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'ok but I only have 20 minutes',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'I want to grow muscle but I hate gyms. What do I do this week?' },
      { speakerId: 'vanya', role: 'primary', text: 'Start simple. You need a repeatable training week.' }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('generic-advice-column'));
});

test('social director quality validator rejects live generic bodyweight and nutrition variants', () => {
  const bodyweight = validateDirectorOutput({
    roomBeat: 'The room gives generic no-gym guidance.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'No gym, no problem. We can set up a solid week for you.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "Track your reps and sets. Aim to increase one variable each session, whether it's weight, reps, or sets." },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Listen to your body. Pain is a signal, not a challenge to overcome.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I want to grow muscle but I hate gyms. What do I do this week?' });

  assert.equal(bodyweight.ok, false);
  assert.ok(bodyweight.issues.includes('generic-advice-column'));

  const acceptedLiveBodyweight = validateDirectorOutput({
    roomBeat: 'Accepted generic home workout answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'No gym, no problem. We can build muscle at home.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'For nutrition, aim for protein with each meal. A simple approach is to have eggs for breakfast or chicken with your lunch.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: "Home workouts require discipline. If you miss a session, don't invent a new plan." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I want to grow muscle but I hate gyms. What do I do this week?' });

  assert.equal(acceptedLiveBodyweight.ok, false);
  assert.ok(acceptedLiveBodyweight.issues.includes('generic-advice-column'));

  const nutrition = validateDirectorOutput({
    roomBeat: 'The room gives generic nutrition guidance.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Fuel for muscle growth requires protein and complex carbohydrates. Eat something balanced before your session.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'A small portion of Greek yogurt with berries, or a banana with a tablespoon of peanut butter, will suffice.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Avoid heavy or fatty foods that will slow digestion and impact performance. Hydration is also critical.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'I am hungry before training, what should I eat?',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'I want to grow muscle but I hate gyms. What do I do this week?' }]
  });

  assert.equal(nutrition.ok, false);
  assert.ok(nutrition.issues.includes('generic-advice-column'));

  const acceptedLiveNutrition = validateDirectorOutput({
    roomBeat: 'The room gives dry nutrition boilerplate.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "Claudia's suggestion of a banana is appropriate for a quick pre-training fuel." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'A banana is sufficient for 20 minutes. It provides quick energy without being heavy.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Ensure hydration is also addressed. Water is critical for performance and recovery.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'I am hungry before training, what should I eat?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'I want to grow muscle but I hate gyms. What do I do this week?' },
      { speakerId: 'user', role: 'user', text: 'ok but I only have 20 minutes' }
    ]
  });

  assert.equal(acceptedLiveNutrition.ok, false);
  assert.ok(acceptedLiveNutrition.issues.includes('generic-advice-column'));

  const liveFuelVariable = validateDirectorOutput({
    roomBeat: 'The room gives the live fuel-variable answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: "If you have time, eggs and toast. If you're heading out soon, a banana with some yogurt should do." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "Make sure it fuels the performance, not just the hunger. We're not here for a nap." },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'The human body requires fuel. This is a known variable.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'I am hungry before training, what should I eat?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'user', role: 'user', text: 'ok but I only have 20 minutes' }
    ]
  });

  assert.equal(liveFuelVariable.ok, false);
  assert.ok(liveFuelVariable.issues.includes('generic-advice-column'));
});

test('social director quality validator rejects current live accepted fitness boilerplate', () => {
  const browserFirstTurn = validateDirectorOutput({
    roomBeat: 'The browser gauntlet saw a generic first-turn fitness answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: "That's a solid goal. Start with three days a week, focus on bodyweight basics like push-ups and squats." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "Ensure you're eating enough protein and getting decent sleep. Those are the foundations before you even think about adding weight." },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: "Just don't expect miracles overnight. The real work is in the consistent effort, not the initial enthusiasm." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'LOL I WANNA GROW MY MUSCLES' });

  assert.equal(browserFirstTurn.ok, false);
  assert.ok(browserFirstTurn.issues.includes('generic-advice-column'));

  const liveApiFirstTurn = validateDirectorOutput({
    roomBeat: 'The API gauntlet saw generic first-turn fitness advice.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'Start with three days a week. Focus on bodyweight exercises like incline push-ups and backpack rows.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "Track your lifts. If you're not measuring progress, you're just guessing." },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: "Don't forget to hydrate. And maybe find a workout buddy to keep you honest." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'LOL I WANNA GROW MY MUSCLES' });

  assert.equal(liveApiFirstTurn.ok, false);
  assert.ok(liveApiFirstTurn.issues.includes('generic-advice-column'));

  const duplicateHistoryVariant = validateDirectorOutput({
    roomBeat: 'The API gauntlet saw another generic first-turn fitness answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: "Muscles, huh? Let's get you started." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Track your lifts. Even small increases matter.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: "Don't overcomplicate it initially. Just show up and do the work." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'LOL I WANNA GROW MY MUSCLES',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' }]
  });

  assert.equal(duplicateHistoryVariant.ok, false);
  assert.ok(duplicateHistoryVariant.issues.includes('generic-advice-column'));

  const weekPlan = validateDirectorOutput({
    roomBeat: 'The room answers like a fitness column.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Focus on bodyweight exercises and resistance bands. Three days a week, alternate upper and lower body focus.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'For nutrition, prioritize protein intake with meals. Consider a simple protein shake post-workout if needed.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Ensure adequate sleep. Muscle growth occurs during recovery, not during the workout itself.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I want to grow muscle but I hate gyms. What do I do this week?' });

  assert.equal(weekPlan.ok, false);
  assert.ok(weekPlan.issues.includes('generic-advice-column'));

  const shortWindow = validateDirectorOutput({
    roomBeat: 'The room gives generic short-window advice.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Twenty minutes means focusing on high-intensity intervals. Bodyweight circuits are efficient.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Structure it as a circuit: 45 seconds work, 15 seconds rest, repeat 3-4 times. Keep rest between circuits minimal.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Ensure the exercises are compound movements to maximize muscle engagement in the limited time.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'ok but I only have 20 minutes',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'I want to grow muscle but I hate gyms. What do I do this week?' }]
  });

  assert.equal(shortWindow.ok, false);
  assert.ok(shortWindow.issues.includes('generic-advice-column'));

  const liveShortWindow = validateDirectorOutput({
    roomBeat: 'The room leaks the exact live short-window boilerplate.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'Twenty minutes is enough for a focused session. We can structure it around compound movements that hit multiple muscle groups.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Ensure the form is correct before adding reps. Sharp pain means stop, not push through.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: 'Focus on execution. The time constraint sharpens the objective.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'ok but I only have 20 minutes',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' }
    ]
  });

  assert.equal(liveShortWindow.ok, false);
  assert.ok(liveShortWindow.issues.includes('generic-advice-column'));

  const objectiveDrift = validateDirectorOutput({
    roomBeat: 'The room loses the concrete muscle context.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The objective is to build a sustainable habit for personal improvement. Track your progress to see the changes.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'WHAT IS THE OBJECTIVE?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' }
    ]
  });

  assert.equal(objectiveDrift.ok, false);
  assert.ok(objectiveDrift.issues.includes('topic-ignored:fitness') || objectiveDrift.issues.includes('generic-advice-column'));
});

test('social director quality validator rejects live thin movie and fake-quality answers', () => {
  const movie = validateDirectorOutput({
    roomBeat: 'A new topic enters.',
    roomMood: 'playful',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'A new topic. What are the options for tonight?' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: "Something that doesn't require a deep dive. We have limited bandwidth for plot complexity." },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'Agreed. No documentaries or anything that requires homework.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: what movie should we watch tonight?' });

  assert.equal(movie.ok, false);
  assert.ok(movie.issues.includes('movie-answer-too-thin'));

  const fakeCheck = validateDirectorOutput({
    roomBeat: 'Grok evaluates the prior answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'grok', role: 'primary', tone: 'flat', text: 'The capability was present. The taste under pressure is the variable that needs calibration.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: "We are here to be useful, not to perform. Let's move to the next item." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Grok, be honest: was that useful or did it sound fake?' });

  assert.equal(fakeCheck.ok, false);
  assert.ok(fakeCheck.issues.includes('operational-jargon') || fakeCheck.issues.includes('social-question-ignored'));

  const executionCheck = validateDirectorOutput({
    roomBeat: 'Grok evaluates the prior answer.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'grok', role: 'primary', tone: 'flat', text: 'It was useful. The room ran out of poetry and started working.' },
      { speakerId: 'aisha', role: 'side', tone: 'flat', text: 'The exchange was direct. The objective is execution, not performance.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Grok, be honest: was that useful or did it sound fake?' });

  assert.equal(executionCheck.ok, false);
  assert.ok(executionCheck.issues.includes('operational-jargon'));
});

test('visible response evaluator flags audit-level product failures', () => {
  const families = (options) => evaluateVisibleResponse(options).map(item => item.family);

  assert.ok(families({
    userMessage: 'Grok, be honest: was that useful or did it sound fake?',
    visibleText: 'The exchange was direct. The objective is execution, not performance.'
  }).includes('false-objective'));

  assert.ok(families({
    userMessage: 'LOL I WANNA GROW MY MUSCLES',
    visibleText: 'That is a solid goal. Use progressive overload, adequate protein, and consistency is key.'
  }).includes('generic-advice'));

  assert.ok(families({
    userMessage: 'new topic: what movie should we watch tonight?',
    visibleText: 'Keep the workout simple: push-ups, reps, protein, and a full body session.'
  }).includes('stale-context'));

  assert.ok(families({
    userMessage: 'how is everyone?',
    visibleText: 'We are on track. The objective is to start, not to assess current states. Everyone is moving forward with the new structure. The next steps are clear: one workout, one meal, one sleep window.'
  }).includes('stale-context'));

  assert.ok(!families({
    userMessage: 'BRUH...',
    visibleText: 'Yeah. Strip it down: one workout, one meal, one sleep window. Do push, pull, legs, or the closest safe versions. Log reps.'
  }).includes('stale-context'));

  assert.ok(families({
    userMessage: 'you keep repeating yourself',
    visibleText: 'Fair. No more repeat loop; plain answer, then we move.',
    recentTurns: [{ speakerId: 'vanya', text: 'Fair. No more repeat loop; plain answer, then we move.' }]
  }).includes('repetition'));

  assert.ok(families({
    userMessage: 'What changed?',
    visibleText: 'The room takes note and keeps moving.',
    continuity: { active: 1, superseded: 1 }
  }).includes('continuity-miss'));

  assert.ok(families({
    userMessage: 'My dashboard preference is obsidian with one red accent.',
    visibleText: "Obsidian with a red accent. Noted. Let's ensure the execution matches the clarity of that preference."
  }).includes('self-theater'));

  assert.ok(families({
    userMessage: 'My dashboard preference is obsidian with one red accent.',
    visibleText: "Obsidian with a red accent. That's a clear aesthetic choice. What's the operational plan for implementing that?"
  }).includes('self-theater'));

  assert.ok(families({
    userMessage: 'answer normally, what should I do today?',
    visibleText: 'What is the one thing you need to do next, and what part of the last answer was useful?'
  }).includes('weak-next-move'));

  assert.ok(families({
    userMessage: 'I am stressed and this is starting to feel dumb.',
    visibleText: 'The problem is not the polish, it is the delay. We stop pretending and start doing.'
  }).includes('frustration-miss'));

  assert.equal(evaluateVisibleResponse({
    userMessage: 'new topic: what movie should we watch tonight?',
    visibleText: 'Leah says Arrival if the room wants quiet pressure; Vanya pushes Spider-Verse if it needs voltage.'
  }).length, 0);
});

test('deterministic continuity fallback avoids repeated side-card copy across updates', () => {
  const recentTurns = [
    { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
    { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
    { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
    { speakerId: 'claudia', role: 'side', text: 'Current record first; prior record still visible. No quiet rewrite.' }
  ];
  const output = socialFallbackFor('My dashboard preference is obsidian with one red accent.', { recentTurns });
  const issues = evaluateVisibleResponse({
    userMessage: 'My dashboard preference is obsidian with one red accent.',
    visibleText: fallbackVisibleText(output),
    recentTurns
  });

  assert.equal(issues.some(item => item.family === 'repetition'), false);
});

test('deterministic continuity change fallback does not replay the previous ledger side note', () => {
  const recentTurns = [
    { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
    { speakerId: 'aisha', role: 'primary', text: 'Recorded dashboard preference: obsidian with one red accent.' },
    { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' },
    { speakerId: 'aisha', role: 'primary', text: 'Updated dashboard preference: pale blue with no red accents. Prior record remains obsidian with one red accent.' },
    { speakerId: 'claudia', role: 'side', text: 'So the room keeps both: the current preference and the superseded one. That is the point of the ledger.' }
  ];
  const output = socialFallbackFor('What was my old dashboard preference?', { recentTurns });
  const issues = evaluateVisibleResponse({
    userMessage: 'What was my old dashboard preference?',
    visibleText: fallbackVisibleText(output),
    recentTurns,
    continuity: { active: 1, superseded: 1 }
  });

  assert.equal(issues.some(item => item.family === 'repetition'), false);
});

test('deterministic continuity fallback answers old preference recall from visible history', () => {
  const recentTurns = [
    { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
    { speakerId: 'aisha', role: 'primary', text: 'Recorded dashboard preference: obsidian with one red accent.' },
    { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' },
    { speakerId: 'aisha', role: 'primary', text: 'Updated dashboard preference: pale blue with no red accents. Prior record remains obsidian with one red accent.' }
  ];
  const output = socialFallbackFor('What was my old dashboard preference?', { recentTurns });
  const text = fallbackVisibleText(output);
  const issues = evaluateVisibleResponse({
    userMessage: 'What was my old dashboard preference?',
    visibleText: text,
    recentTurns,
    continuity: { active: 1, superseded: 1 }
  });

  assert.match(text, /obsidian/i);
  assert.match(text, /pale blue/i);
  assert.equal(issues.length, 0);
});

test('social director quality validator rejects stale accepted answers for check-in and room tension', () => {
  const staleCheckIn = validateDirectorOutput({
    roomBeat: 'The room checks in.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'We are tracking the workout. Next steps are logged.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'The incline push-ups are logged. Next is backpack rows, focus on form.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The data is clear. Excuses are not.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'how is everyone?',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' }]
  });

  assert.equal(staleCheckIn.ok, false);
  assert.ok(staleCheckIn.issues.includes('generic-status-report'));

  const staleCheckInVariant = validateDirectorOutput({
    roomBeat: 'The room checks in.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The path is clear. Execute the first move.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'No more discussion. Just the incline push-ups, then log the count.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The data will be the only acceptable output now.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'how is everyone?',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'BRUH...' }]
  });

  assert.equal(staleCheckInVariant.ok, false);
  assert.ok(staleCheckInVariant.issues.includes('generic-status-report'));

  const liveObjectiveCheckIn = validateDirectorOutput({
    roomBeat: 'The room answers a social check-in with stale fitness structure.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'We are on track. The objective is to start, not to assess current states.' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: "Everyone's good, just deep in the setup. We're all moving forward with the new structure." },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'Operational. The next steps are clear: three days, one workout, one meal, one sleep window.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'how is everyone?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'aisha', role: 'primary', text: 'The objective is to start. Pick three days this week.' }
    ]
  });

  assert.equal(liveObjectiveCheckIn.ok, false);
  assert.ok(liveObjectiveCheckIn.issues.includes('generic-status-report'));
  assert.ok(liveObjectiveCheckIn.issues.includes('product-stale-context:social-check-in'));

  const staleTension = validateDirectorOutput({
    roomBeat: 'The room names tension.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The consensus is clear. Arrival it is.' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'Excellent choice. It has that quiet intensity we were looking for.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The constraint was met. The title follows.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'everyone, what is the actual tension in this room?',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'new topic: what movie should we watch tonight?' }]
  });

  assert.equal(staleTension.ok, false);
  assert.ok(staleTension.issues.includes('stale-topic-answer:prior-topic') || staleTension.issues.includes('social-question-ignored'));

  const staleTensionComedy = validateDirectorOutput({
    roomBeat: 'The room stays stuck on movie selection.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'A comedy sounds like a good reset. Something with a clear, satisfying arc.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'That fits the criteria. It has a defined beginning, middle, and end, and minimal risk of existential dread.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The primary tension is the avoidance of existential dread, as previously established. A comedy fulfills this parameter.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'everyone, what is the actual tension in this room?',
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'open floor: what should the room watch next?' }]
  });

  assert.equal(staleTensionComedy.ok, false);
  assert.ok(staleTensionComedy.issues.includes('stale-topic-answer:prior-topic'));
});

test('social director quality validator rejects stress turns answered with meta process loops', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room repeats its own meta critique.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The pattern is clear. We use process to avoid commitment.' },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'It is the difference between being a participant and being a prop. We need to own our positions.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The risk is that the structure itself becomes the excuse. Capability is not the issue; the lack of conviction is.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('frustration-ignored'));

  const coldAcceptance = validateDirectorOutput({
    roomBeat: 'The room accepts frustration with a sterile line.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "The feedback is noted. We are here to be useful, not to perform usefulness. Let's focus on clarity and direct answers." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(coldAcceptance.ok, false);
  assert.ok(coldAcceptance.issues.includes('operational-jargon') || coldAcceptance.issues.includes('frustration-ignored'));

  const specificitySermon = validateDirectorOutput({
    roomBeat: 'The room turns stress into a lesson.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The stress comes from avoiding the specific. We need to name the feeling, not the function. What is the concrete mood we are trying to land?' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(specificitySermon.ok, false);
  assert.ok(specificitySermon.issues.includes('frustration-ignored'));

  const sterileStress = validateDirectorOutput({
    roomBeat: 'The room notes stress without recovering.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "The stress is noted. The room's tension is clear: usefulness over polish. Let's proceed with that clarity." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(sterileStress.ok, false);
  assert.ok(sterileStress.issues.includes('frustration-ignored'));

  const polishStress = validateDirectorOutput({
    roomBeat: 'The room explains the stress instead of helping.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The stress comes from mistaking polish for progress. We need to see the actual work, not the presentation of it.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'The noise is the problem. Usefulness is the signal.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(polishStress.ok, false);
  assert.ok(polishStress.issues.includes('frustration-ignored'));

  const fakeSoundingStress = validateDirectorOutput({
    roomBeat: 'The room keeps analyzing itself instead of helping.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'This is not complex. The room is stuck between wanting to be useful and sounding like it. Grok was right, it sounded fake.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(fakeSoundingStress.ok, false);
  assert.ok(fakeSoundingStress.issues.includes('frustration-ignored'));

  const liveSelfCritiqueLoop = validateDirectorOutput({
    roomBeat: 'The room performs usefulness instead of helping.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The room is stuck in a loop of self-critique. Grok, you admitted the dodge. Leah, you called out the structure.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'We are here to be useful, not to perform the process of being useful. Let us reset into one concrete action.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I am stressed and this is starting to feel dumb.' });

  assert.equal(liveSelfCritiqueLoop.ok, false);
  assert.ok(liveSelfCritiqueLoop.issues.includes('operational-jargon'));
  assert.ok(liveSelfCritiqueLoop.issues.includes('product-self-theater:meta-language'));

  const ignoredRepeatComplaint = validateDirectorOutput({
    roomBeat: 'The room acts like nothing went wrong.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The room remains focused and the current priorities are stable.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'you keep repeating yourself' });

  assert.equal(ignoredRepeatComplaint.ok, false);
  assert.ok(ignoredRepeatComplaint.issues.includes('frustration-ignored') || ignoredRepeatComplaint.issues.includes('operational-jargon'));

  const burdenShiftRepeatComplaint = validateDirectorOutput({
    roomBeat: 'The room redirects the complaint back to the user.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The ask is simple: what is the actual problem you need solved? State it clearly, then we address only what is necessary to fix it.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'you keep repeating yourself' });

  assert.equal(burdenShiftRepeatComplaint.ok, false);
  assert.ok(burdenShiftRepeatComplaint.issues.includes('frustration-ignored'));

  const bruhPlanSermon = validateDirectorOutput({
    roomBeat: 'The room doubles down instead of reading frustration.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The objective is the execution. Stick to the plan.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "We have the structure: three days, specific exercises, and a weekly progression. That's the objective." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'BRUH...',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'aisha', role: 'primary', text: 'The objective is to start. One workout, one meal, one sleep window.' }
    ]
  });

  assert.equal(bruhPlanSermon.ok, false);
  assert.ok(bruhPlanSermon.issues.includes('frustration-ignored'));
});

test('social director quality validator rejects food prompts that dodge before answering', () => {
  const objectiveEnergy = validateDirectorOutput({
    roomBeat: 'The room turns lunch into an objective slogan.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'grok', role: 'primary', tone: 'flat', text: 'The objective is energy, not a full meal.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'A banana and yogurt will keep the session moving.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'I am hungry before training, what should I eat?'
  });

  assert.equal(objectiveEnergy.ok, false);
  assert.ok(objectiveEnergy.issues.includes('operational-jargon'));
  assert.ok(objectiveEnergy.issues.includes('product-self-theater:meta-language'));

  const dodgedLunch = validateDirectorOutput({
    roomBeat: 'The room pauses the planning discussion.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The planning discussion is paused. What is the immediate need?' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'A quick check-in on sustenance before we dive into tomorrow. Anyone need a quick fuel-up?' },
      { speakerId: 'claudia', role: 'closer', tone: 'flat', text: 'A banana and a handful of nuts is fast. If you have ten minutes, scrambled eggs are efficient.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'quick help: what should I eat for lunch?' });

  assert.equal(dodgedLunch.ok, false);
  assert.ok(dodgedLunch.issues.includes('food-answer-dodged'));
});

test('social director quality validator rejects generic planning command loops', () => {
  const genericPlanning = validateDirectorOutput({
    roomBeat: 'The room turns planning into a command loop.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "Tomorrow's plan requires one clear objective. Identify the first actionable step." },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Break down the objective into the smallest visible task. Execute that first.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: 'Evidence of completion is the only metric that matters now. Avoid further debate.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: I need help planning tomorrow' });

  assert.equal(genericPlanning.ok, false);
  assert.ok(genericPlanning.issues.includes('operational-jargon'));
});

test('social director quality validator rejects invented planning details not supplied by the user', () => {
  const inventedPlanning = validateDirectorOutput({
    roomBeat: 'The room invents project machinery for a generic planning ask.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Let us outline tomorrow. What are the critical items that need to be addressed first?' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'I have the project timelines. We need to allocate resources for the Q3 deliverables and confirm the client meeting slots.' },
      { speakerId: 'vanya', role: 'closer', tone: 'flat', text: 'And what is the human temperature on those meetings?' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: I need help planning tomorrow' });

  assert.equal(inventedPlanning.ok, false);
  assert.ok(inventedPlanning.issues.includes('product-invented-detail:project-planning'));
});

test('social director quality validator rejects continuity claims answered as build specs', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room turns a claim into production ops.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'Black glass with a single red pulse? It sounds like a default theme trying too hard.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: 'The objective is a clean, impactful landing page. Let us see the build, then refine the aesthetic.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'I can pull the current build. We need to confirm the exact red hex code and pulse animation parameters.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('operational-jargon'));

  const liveSpecsDrift = validateDirectorOutput({
    roomBeat: 'The room turns a visual claim into specs again.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'Black glass and a single red pulse. It is stark, almost aggressive.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "We need to ensure the pulse animation is smooth and doesn't impact load times. I will draft the technical specs." },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: "Good. Let's see those specs before we commit to the visual." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(liveSpecsDrift.ok, false);
  assert.ok(liveSpecsDrift.issues.includes('operational-jargon'));

  const liveTechnicalRequirementsDrift = validateDirectorOutput({
    roomBeat: 'The room turns style into implementation planning.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "Black glass with a single red pulse. That's the direction." },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'It is a strong visual. Minimalist, but with a clear focal point.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "I can map out the technical requirements for that. We'll need to ensure the pulse is subtle and doesn't overwhelm the glass effect." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(liveTechnicalRequirementsDrift.ok, false);
  assert.ok(liveTechnicalRequirementsDrift.issues.includes('operational-jargon'));

  const liveParametersImplementationDrift = validateDirectorOutput({
    roomBeat: 'The room turns a superseding style claim into implementation parameters.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: "My landing page style is white editorial with no red. That's the final word on it." },
      { speakerId: 'aisha', role: 'side', tone: 'flat', text: 'Understood. White editorial, no red.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Noted. The parameters are clear for implementation.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Actually my landing page style is white editorial with no red.' });

  assert.equal(liveParametersImplementationDrift.ok, false);
  assert.ok(liveParametersImplementationDrift.issues.includes('operational-jargon'));

  const liveImplementationDrift = validateDirectorOutput({
    roomBeat: 'The room acknowledges style but slides into implementation posture.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: "Black glass with a single red pulse. It’s a statement, but is it the right one for the user's first impression?" },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'The contrast is stark. We can implement that.' },
      { speakerId: 'grok', role: 'side', tone: 'flat', text: 'Red is a high-alert color. Is the intention to signal urgency or danger, or is it purely aesthetic?' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(liveImplementationDrift.ok, false);
  assert.ok(liveImplementationDrift.issues.includes('operational-jargon'));

  const liveFrameworkDrift = validateDirectorOutput({
    roomBeat: 'The room accepts a superseding visual style as production framework.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'White editorial. Understood.' },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'White editorial is clean, but it can also feel sterile if not handled with care. We need to ensure the content provides the necessary warmth.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'White editorial is a more standard approach. We can proceed with that framework.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Actually my landing page style is white editorial with no red.' });

  assert.equal(liveFrameworkDrift.ok, false);
  assert.ok(liveFrameworkDrift.issues.includes('operational-jargon'));

  const liveStyleGuideDrift = validateDirectorOutput({
    roomBeat: 'The room turns a superseding style claim into fake work.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: 'White editorial. Understood.' },
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'White editorial offers a cleaner canvas. It allows the content to lead, which is more intentional than a single accent.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: "I will update the style guide to reflect 'white editorial' and remove the red pulse element." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Actually my landing page style is white editorial with no red.' });

  assert.equal(liveStyleGuideDrift.ok, false);
  assert.ok(liveStyleGuideDrift.issues.includes('operational-jargon'));

  const liveDesignBriefDrift = validateDirectorOutput({
    roomBeat: 'The room turns a style update into fake brief maintenance.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'White editorial. That is a clean slate.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'I will update the design brief to reflect the white editorial direction and remove the red pulse specification.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: 'Good. Precision is key for editorial.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Actually my landing page style is white editorial with no red.' });

  assert.equal(liveDesignBriefDrift.ok, false);
  assert.ok(liveDesignBriefDrift.issues.includes('operational-jargon'));
});

test('social director quality validator rejects weak continuity change summaries', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'A.I.S.H.A answers with only the newest record.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'White editorial. No red.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'aisha', role: 'primary', text: 'Black glass, single red pulse. Understood.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
      { speakerId: 'aisha', role: 'primary', text: 'White editorial, no red. Noted.' }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('continuity-question-ignored'));

  const liveClarificationMiss = validateDirectorOutput({
    roomBeat: 'A.I.S.H.A asks the user to summarize the change instead of citing the room record.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'What has changed since the last check-in? I need a clear summary of any new developments or shifts in focus.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ]
  });

  assert.equal(liveClarificationMiss.ok, false);
  assert.ok(liveClarificationMiss.issues.includes('continuity-question-ignored'));
});

test('social director quality validator rejects false continuity denials', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'A.I.S.H.A misses the prior record.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'No, you did not specify black glass in the record I can see.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'No, I never said black glass. Did I?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('continuity-question-ignored'));

  const currentOnly = validateDirectorOutput({
    roomBeat: 'A.I.S.H.A cites only the active record and misses the denial.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'The record shows white editorial, no red. That is the current standard.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'No, I never said black glass. Did I?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ]
  });

  assert.equal(currentOnly.ok, false);
  assert.ok(currentOnly.issues.includes('continuity-question-ignored'));
  assert.ok(currentOnly.issues.includes('operational-jargon'));
});

test('social director quality validator rejects generic operational check-in reports', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room reports status.',
    roomMood: 'focused',
    responseMode: 'open_floor',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'We are focused. The work is proceeding.' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'Everyone is engaged with their current tasks. The energy is steady.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Operational status is green. No immediate blockers.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'how is everyone?' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('generic-status-report'));
});

test('social director fallback drops stale fitness context for movie and room-tension pivots', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'I am hungry before training, what should I eat?' },
        { speakerId: 'aisha', role: 'primary', text: 'For training, focus on lean protein and complex carbohydrates.' }
      ];
      const movie = await postSocial(baseUrl, 'new topic: what movie should we watch tonight?', { recentTurns });
      const movieText = visibleText(movie.body);
      assert.equal(movie.body.ok, true);
      assert.doesNotMatch(movieText, /\b(training|workout|protein|after a workout|training parameters)\b/i);
      assert.match(movieText, /\b(Arrival|Spider-Verse|The Menu|comfort|tension|spectacle)\b/i);

      const tension = await postSocial(baseUrl, 'everyone, what is the actual tension in this room?', { recentTurns });
      const tensionText = visibleText(tension.body);
      assert.equal(tension.body.ok, true);
      assert.doesNotMatch(tensionText, /\b(movie|film|specific suggestions|content selection)\b/i);
      assert.match(tensionText, /\b(tension|help desk|pressure|direct|answer)\b/i);
    });
  });
});

test('social director fallback answers short fitness follow-up and Grok quality check with taste', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'I want to grow muscle but I hate gyms. What do I do this week?' },
        { speakerId: 'vanya', role: 'primary', text: 'Start simple. You need a repeatable training week.' }
      ];
      const shortSession = await postSocial(baseUrl, 'ok but I only have 20 minutes', { recentTurns });
      const shortText = visibleText(shortSession.body);
      assert.match(shortText, /\b(Twenty minutes|three rounds|forty seconds|squat|push|pull)\b/i);
      assert.doesNotMatch(shortText, /\b(consistency is key|adequate protein|timing is key)\b/i);

      const grok = await postSocial(baseUrl, 'Grok, be honest: was that useful or did it sound fake?', { recentTurns });
      const grokText = visibleText(grok.body);
      assert.match(grokText, /\b(too abstract|lost the person|answer the person|partly useful)\b/i);
      assert.doesNotMatch(grokText, /\b(parameters were clear|within those parameters)\b/i);
    });
  });
});

test('social director fallback recovers repetition complaints and planning pivots', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
        { speakerId: 'user', role: 'user', text: 'WHAT IS THE OBJECTIVE?' },
        { speakerId: 'aisha', role: 'primary', text: 'The objective is the muscle plan: repeatable training, food, sleep, and no sharp pain heroics.' }
      ];

      const repeat = await postSocial(baseUrl, 'you keep repeating yourself', { recentTurns });
      const repeatText = visibleText(repeat.body);
      assert.match(repeatText, /\b(repeat loop|change shape|answers the turn)\b/i);
      assert.doesNotMatch(repeatText, /\b(current priorities|objective is clear|personal fitness routines)\b/i);

      const normal = await postSocial(baseUrl, 'answer normally, what should I do today?', { recentTurns });
      const normalText = visibleText(normal.body);
      assert.match(normalText, /\b(Plain version|today|one block|one result)\b/i);
      assert.doesNotMatch(normalText, /repeated answer is a failed answer/i);
      assert.doesNotMatch(normalText, /\b(parameters|operational status|current priorities)\b/i);

      const planning = await postSocial(baseUrl, 'new topic: I need help planning tomorrow', { recentTurns });
      const planningText = visibleText(planning.body);
      assert.match(planningText, /\b(Tomorrow|three blocks|first decision|main build|cleanup)\b/i);
      assert.doesNotMatch(planningText, /\b(muscle|training|protein|workout)\b/i);
    });
  });
});

test('social director quality validator rejects normal-answer dodges that ask for another ask', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room asks for more clarity instead of answering normally.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'warm reset', text: 'What is the one thing you need to do next, and what part of the last answer was useful?' },
      { speakerId: 'aisha', role: 'side', tone: 'precise', text: 'The room needs a clear ask to move forward. State the actual problem.' },
      { speakerId: 'grok', role: 'side', tone: 'dry', text: 'The current exchange is not yielding a clear path. Identify the core requirement.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'answer normally, what should I do today?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' },
      { speakerId: 'aisha', role: 'primary', text: 'The loop is clear. What is the actual ask?' }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('frustration-ignored'));
  assert.ok(validation.issues.includes('product-weak-next-move:normal-answer'));

  const singleTask = validateDirectorOutput({
    roomBeat: 'The room asks for the task instead of giving a normal answer.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The ask is to move past the stress and the feeling of repetition. Focus on one concrete action for today. What is the single most important task you can complete right now?' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'answer normally, what should I do today?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }
    ]
  });

  assert.equal(singleTask.ok, false);
  assert.ok(singleTask.issues.includes('product-weak-next-move:normal-answer'));
});

test('social director quality validator rejects stress turns that dodge into command posture', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room says it is responding to stress, but dodges the feeling.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'firm', text: 'The problem is not the polish, it is the delay. We stop pretending and start doing.' },
      { speakerId: 'leah', role: 'side', tone: 'direct', text: 'Grok, name one concrete action we can take right now to be useful.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'I am stressed and this is starting to feel dumb.'
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('frustration-ignored'));
  assert.ok(validation.issues.includes('product-frustration-miss:stress-recovery'));
});

test('social director quality validator rejects stale planning posture in food answers', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room stays stuck on the previous planning topic.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "We are defining tomorrow's objective. Lunch is a secondary concern." },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'For lunch, keep it simple. A sandwich or a salad will do.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'quick help: what should I eat for lunch?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'new topic: I need help planning tomorrow' },
      { speakerId: 'aisha', role: 'primary', text: "Tomorrow's plan requires one concrete objective." }
    ]
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('food-answer-dodged'));

  const genericLunch = validateDirectorOutput({
    roomBeat: 'The room answers lunch like a generic advice column.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'claudia', role: 'primary', tone: 'flat', text: 'For lunch, consider a lean protein with complex carbs. A turkey sandwich on whole wheat would be efficient.' },
      { speakerId: 'vanya', role: 'side', tone: 'flat', text: 'A protein bar and an apple can hold you over. Just keep it simple.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'quick help: what should I eat for lunch?'
  });

  assert.equal(genericLunch.ok, false);
  assert.ok(genericLunch.issues.includes('product-generic-advice:food'));

  const liveGenericLunch = validateDirectorOutput({
    roomBeat: 'The room answers lunch like a generic nutrition article.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'claudia', role: 'primary', tone: 'flat', text: 'A quick protein and carb mix is best. Consider chicken breast with a side of rice, or a lentil soup with whole-grain bread.' },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'Or, if you want something lighter, a large salad with grilled fish. Just avoid anything too heavy that will slow you down.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: 'Choose something that fuels the next block of work. Efficiency is the goal.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'quick help: what should I eat for lunch?'
  });

  assert.equal(liveGenericLunch.ok, false);
  assert.ok(liveGenericLunch.issues.includes('generic-advice-column'));
  assert.ok(liveGenericLunch.issues.includes('product-generic-advice:food'));

  const vagueLunch = validateDirectorOutput({
    roomBeat: 'The room talks around lunch without naming food.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Focus on the plan. Lunch is a simple fuel stop.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'A quick meal before the first decision block. Something easily digestible.' },
      { speakerId: 'leah', role: 'closer', tone: 'flat', text: 'Or just grab whatever is fastest so we can get back to the build. No time for gourmet.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'quick help: what should I eat for lunch?'
  });

  assert.equal(vagueLunch.ok, false);
  assert.ok(vagueLunch.issues.includes('food-answer-dodged'));
  assert.ok(vagueLunch.issues.includes('product-weak-food-answer:food'));
});

test('social director quality validator rejects fake design implementation promises', () => {
  const thinLogo = validateDirectorOutput({
    roomBeat: 'The room talks around the logo direction.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'We need something that cuts through the noise, not just another generic mark. Silva deserves a logo with real edge.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Agreed. Let us define the core elements that convey that sharpness.' },
      { speakerId: 'aisha', role: 'closer', tone: 'flat', text: "The direction needs to be clear enough for implementation. What specific visual language communicates edge without becoming abstract?" }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I need a sharper logo direction for Silva' });

  assert.equal(thinLogo.ok, false);
  assert.ok(thinLogo.issues.includes('design-answer-punted'));
  assert.ok(thinLogo.issues.includes('operational-jargon'));

  const placement = validateDirectorOutput({
    roomBeat: 'The room turns a preference into fake production work.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Obsidian with a red accent. Noted.' },
      { speakerId: 'claudia', role: 'closer', tone: 'flat', text: 'I will map the accent placement to key interactive elements.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My dashboard preference is obsidian with one red accent.' });

  assert.equal(placement.ok, false);
  assert.ok(placement.issues.includes('operational-jargon'));
  assert.ok(placement.issues.includes('product-self-theater:meta-language'));

  const implementationAlignment = validateDirectorOutput({
    roomBeat: 'The room acknowledges a preference but turns it into fake implementation posture.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "Obsidian with one red accent. Noted. Let's ensure the implementation aligns with that clarity." }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My dashboard preference is obsidian with one red accent.' });

  assert.equal(implementationAlignment.ok, false);
  assert.ok(implementationAlignment.issues.includes('operational-jargon'));
  assert.ok(implementationAlignment.issues.includes('product-self-theater:meta-language'));

  const staleSupersededPreference = validateDirectorOutput({
    roomBeat: 'The room accepts stale memory as the current preference.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The note states obsidian with one red accent. We will proceed with that.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'Actually my dashboard preference is pale blue with no red accents.',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'aisha', role: 'primary', text: 'Obsidian with one red accent. Noted.' }
    ]
  });

  assert.equal(staleSupersededPreference.ok, false);
  assert.ok(staleSupersededPreference.issues.includes('product-continuity-conflict:superseded-current-turn'));

  const parameters = validateDirectorOutput({
    roomBeat: 'The room pretends the dashboard has been changed.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The preference shifted from obsidian with a red accent to pale blue with no red accent. Claudia is adjusting the design parameters.' },
      { speakerId: 'claudia', role: 'closer', tone: 'flat', text: 'The parameters are updated. The pale blue is now the active preference.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ]
  });

  assert.equal(parameters.ok, false);
  assert.ok(parameters.issues.includes('operational-jargon'));
  assert.ok(parameters.issues.includes('product-self-theater:meta-language'));

  const systemConfig = validateDirectorOutput({
    roomBeat: 'The room pretends the preference changed a system.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The preference has been updated. Obsidian with one red accent is no longer the selection.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Noted. I will update the system configuration to reflect the pale blue preference.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ]
  });

  assert.equal(systemConfig.ok, false);
  assert.ok(systemConfig.issues.includes('operational-jargon'));
  assert.ok(systemConfig.issues.includes('product-self-theater:meta-language'));

  const configurationStandard = validateDirectorOutput({
    roomBeat: 'The room turns memory evidence into fake dashboard state.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The preference has been updated. Obsidian with one red accent is no longer the active setting.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Noted. The pale blue, no red accent configuration is now the standard.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ]
  });

  assert.equal(configurationStandard.ok, false);
  assert.ok(configurationStandard.issues.includes('operational-jargon'));
  assert.ok(configurationStandard.issues.includes('product-self-theater:meta-language'));

  const liveConfigurationMiss = validateDirectorOutput({
    roomBeat: 'The room names only the new value and misses the prior value.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Noted. The preference has been updated.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Understood. I will adjust the configuration to pale blue, no red accents.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ]
  });

  assert.equal(liveConfigurationMiss.ok, false);
  assert.ok(liveConfigurationMiss.issues.includes('continuity-question-ignored'));
  assert.ok(liveConfigurationMiss.issues.includes('operational-jargon'));
  assert.ok(liveConfigurationMiss.issues.includes('product-self-theater:meta-language'));

  const updatedSystem = validateDirectorOutput({
    roomBeat: 'The room gives a useful continuity contrast then pretends the system changed.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The last preference was obsidian with one red accent. The current preference is pale blue with no red accents.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'I have updated the system to reflect the pale blue preference. No red accents.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My dashboard preference is obsidian with one red accent.' },
      { speakerId: 'user', role: 'user', text: 'Actually my dashboard preference is pale blue with no red accents.' }
    ]
  });

  assert.equal(updatedSystem.ok, false);
  assert.ok(updatedSystem.issues.includes('operational-jargon'));
  assert.ok(updatedSystem.issues.includes('product-self-theater:meta-language'));

  const fakeStyleImplementation = validateDirectorOutput({
    roomBeat: 'The room turns a style preference into fake production work.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'Black glass with a single red pulse. It is stark, almost aggressive.' },
      { speakerId: 'aisha', role: 'side', tone: 'flat', text: 'The aesthetic is confirmed. It communicates a clear, singular focus.' },
      { speakerId: 'claudia', role: 'closer', tone: 'flat', text: 'Understood. We will ensure the build reflects that visual intensity without performance lag.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(fakeStyleImplementation.ok, false);
  assert.ok(fakeStyleImplementation.issues.includes('operational-jargon'));
  assert.ok(fakeStyleImplementation.issues.includes('product-self-theater:meta-language'));

  const liveOperationalStyle = validateDirectorOutput({
    roomBeat: 'The room turns style preference into conversion theater.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'Black glass with a single red pulse. It is stark, almost aggressive.' },
      { speakerId: 'aisha', role: 'side', tone: 'flat', text: 'The operational reality is that it loads fast and converts. We can adjust the temperature later.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(liveOperationalStyle.ok, false);
  assert.ok(liveOperationalStyle.issues.includes('operational-jargon'));
  assert.ok(liveOperationalStyle.issues.includes('product-self-theater:meta-language'));

  const liveFunctionalStyle = validateDirectorOutput({
    roomBeat: 'The room turns a style claim into fake implementation status.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'Black glass with a single red pulse. It is a statement, but is it saying the right thing?' },
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'The aesthetic is noted. Claudia, confirm the functional requirements are met before we refine the visual.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'All core functionality is locked. The visual layer is next.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My landing page style is black glass with a single red pulse.' });

  assert.equal(liveFunctionalStyle.ok, false);
  assert.ok(liveFunctionalStyle.issues.includes('operational-jargon'));
  assert.ok(liveFunctionalStyle.issues.includes('product-self-theater:meta-language'));

  const liveExecutionPreference = validateDirectorOutput({
    roomBeat: 'The room turns a memory preference into execution theater.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Obsidian with a red accent. Ensure the execution matches the clarity of that preference.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My dashboard preference is obsidian with one red accent.' });

  assert.equal(liveExecutionPreference.ok, false);
  assert.ok(liveExecutionPreference.issues.includes('operational-jargon'));
  assert.ok(liveExecutionPreference.issues.includes('product-self-theater:meta-language'));

  const liveImplementationQuestion = validateDirectorOutput({
    roomBeat: 'The room asks for implementation work after a preference claim.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: 'Obsidian with a red accent. Name the operational plan for implementing that.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'My dashboard preference is obsidian with one red accent.' });

  assert.equal(liveImplementationQuestion.ok, false);
  assert.ok(liveImplementationQuestion.issues.includes('operational-jargon'));
  assert.ok(liveImplementationQuestion.issues.includes('product-self-theater:meta-language'));
});

test('social director quality validator rejects logo direction answers that punt back to discovery', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room asks for direction instead of giving direction.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'flat', text: "Silva needs a logo that cuts through. What's the core message we're trying to land visually?" },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'It needs to feel less like a placeholder and more like a statement. Something with edge.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'We need to define the visual language before we iterate on concepts. What are the non-negotiables?' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I need a sharper logo direction for Silva' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('design-answer-punted'));

  const softerPunt = validateDirectorOutput({
    roomBeat: 'The room sounds branded but still punts.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'leah', role: 'primary', tone: 'flat', text: 'The logo needs real edge and should cut through the noise.' },
      { speakerId: 'claudia', role: 'side', tone: 'flat', text: 'Define the core elements and what specific visual language communicates edge before moving.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I need a sharper logo direction for Silva' });

  assert.equal(softerPunt.ok, false);
  assert.ok(softerPunt.issues.includes('design-answer-punted'));
});

test('social director quality validator rejects landing-page prompts answered as generic room banter', () => {
  const validation = validateDirectorOutput({
    roomBeat: 'The room opens socially and ignores the design prompt.',
    roomMood: 'warm',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'warm', text: 'Hey. The room is here; nobody has to perform a job title just to be allowed to speak.' },
      { speakerId: 'leah', role: 'side', tone: 'playful', text: 'Thank God. I was getting bored of pretending silence means absence.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.' });

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.includes('design-answer-punted'));
});

test('social director quality validator rejects objective slogans for casual choices', () => {
  const movieObjective = validateDirectorOutput({
    roomBeat: 'The room turns a movie choice into process language.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'The objective is entertainment with enough bite to keep the room awake.' },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'Pick Arrival if you want tension without noise.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: what movie should we watch tonight?' });

  assert.equal(movieObjective.ok, false);
  assert.ok(movieObjective.issues.includes('operational-jargon'));
  assert.ok(movieObjective.issues.includes('product-self-theater:meta-language'));

  const liveMoviePunt = validateDirectorOutput({
    roomBeat: 'The room asks for the movie mood instead of choosing.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'flat', text: 'Alright, the work is done. What kind of movie are we feeling tonight?' },
      { speakerId: 'leah', role: 'side', tone: 'flat', text: 'I am leaning towards something visually stunning, maybe a classic sci-fi or a beautifully shot period piece. Nothing too heavy.' },
      { speakerId: 'grok', role: 'closer', tone: 'flat', text: "As long as it has a coherent plot and does not insult basic logic, I am amenable. Perhaps a well-executed thriller?" }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, { userMessage: 'new topic: what movie should we watch tonight?' });

  assert.equal(liveMoviePunt.ok, false);
  assert.ok(liveMoviePunt.issues.includes('movie-answer-too-thin'));
  assert.ok(liveMoviePunt.issues.includes('product-speaker-flatness:movie'));
});

test('visible response evaluator rejects generic food advice and weak denial continuity', () => {
  const inventedTask = evaluateVisibleResponse({
    visibleText: 'The stress indicates a need for clarity. Today, focus on one task: finalize the Q3 brief. No other objectives.',
    userMessage: 'answer normally, what should I do today?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }
    ]
  });
  assert.ok(inventedTask.some(item => item.family === 'weak-next-move'));

  const vagueNormal = evaluateVisibleResponse({
    visibleText: 'The actual ask is what to do today. The answer is to focus on the next concrete step, not the feeling of stress.',
    userMessage: 'answer normally, what should I do today?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }
    ]
  });
  assert.ok(vagueNormal.some(item => item.family === 'weak-next-move'));

  const coreProblemNormal = evaluateVisibleResponse({
    visibleText: 'The loop is clear. Let us reset. Today, focus on one task: identify the core problem you need solved.',
    userMessage: 'answer normally, what should I do today?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }
    ]
  });
  assert.ok(coreProblemNormal.some(item => item.family === 'weak-next-move'));

  const staleRoomState = evaluateVisibleResponse({
    visibleText: 'A comedy sounds like a good reset. It has a solid script and minimal existential dread.',
    userMessage: 'everyone, what is the actual tension in this room?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'open floor: what should the room watch next?' }
    ]
  });
  assert.ok(staleRoomState.some(item => item.family === 'stale-context' && item.category === 'room-state'));

  const foodIssues = evaluateVisibleResponse({
    visibleText: 'Choose lean protein with complex carbs. A turkey sandwich on whole wheat or a protein bar and apple can hold you over.',
    userMessage: 'quick help: what should I eat for lunch?'
  });
  assert.ok(foodIssues.some(item => item.family === 'generic-advice'));

  const liveFoodIssues = evaluateVisibleResponse({
    visibleText: 'A quick protein and carb mix is best. Consider chicken breast with a side of rice, or a lentil soup with whole-grain bread. Efficiency is the goal.',
    userMessage: 'quick help: what should I eat for lunch?'
  });
  assert.ok(liveFoodIssues.some(item => item.family === 'generic-advice'));

  const vagueFoodIssues = evaluateVisibleResponse({
    visibleText: 'Focus on the plan. Lunch is a simple fuel stop. Something easily digestible. Grab whatever is fastest.',
    userMessage: 'quick help: what should I eat for lunch?'
  });
  assert.ok(vagueFoodIssues.some(item => item.family === 'weak-food-answer'));

  const continuityPromptEcho = evaluateVisibleResponse({
    visibleText: 'What has changed since the last check-in? I need a clear summary of any new developments or shifts in focus.',
    userMessage: 'What changed?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ],
    continuity: { active: 1, superseded: 1, disputed: 0 }
  });
  assert.ok(continuityPromptEcho.some(item => item.family === 'continuity-miss'));

  const denial = validateDirectorOutput({
    roomBeat: 'A.I.S.H.A cites only the old record.',
    roomMood: 'focused',
    responseMode: 'single',
    speakers: [
      { speakerId: 'aisha', role: 'primary', tone: 'precise', text: 'Yes: prior record was landing page style is black glass with a single red pulse.' }
    ],
    silentReactions: [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: 'No, I never said black glass. Did I?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
      { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' }
    ]
  });
  assert.equal(denial.ok, false);
  assert.ok(denial.issues.includes('continuity-question-ignored'));
});

test('social director fallback can summarize visible-session continuity when Pack 1 summary is thin', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
        { speakerId: 'aisha', role: 'primary', text: 'Black glass, single red pulse. Understood.' },
        { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
        { speakerId: 'aisha', role: 'primary', text: 'White editorial, no red. Noted.' }
      ];
      const { body } = await postSocial(baseUrl, 'What changed?', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.match(text, /\bwhite editorial with no red\b/i);
      assert.match(text, /\bblack glass with a single red pulse\b/i);
      assert.doesNotMatch(text, /\bdo not have a recorded change\b/i);
    });
  });
});

test('social director fallback acknowledges continuity claims and memory challenges without generic banter', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const first = await postSocial(baseUrl, 'My landing page style is black glass with a single red pulse.');
      assert.match(visibleText(first.body), /\bblack glass with a single red pulse\b/i);

      const update = await postSocial(baseUrl, 'Actually my landing page style is white editorial with no red.', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
          { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
          { speakerId: 'claudia', role: 'side', text: 'Good. If that changes, the old version stays visible instead of being quietly erased.' }
        ]
      });
      const updateText = visibleText(update.body);
      assert.match(updateText, /\bwhite editorial with no red\b/i);
      assert.match(updateText, /\bprior record remains landing page style is black glass with a single red pulse\b/i);
      assert.doesNotMatch(updateText, /\bold version stays visible instead of being quietly erased\b/i);

      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
        { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
        { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
        { speakerId: 'aisha', role: 'primary', text: 'landing page style is white editorial with no red. Noted.' },
        { speakerId: 'user', role: 'user', text: 'What changed?' },
        { speakerId: 'aisha', role: 'primary', text: 'Changed: landing page style is white editorial with no red. Prior record: landing page style is black glass with a single red pulse.' },
        { speakerId: 'claudia', role: 'side', text: 'So the room keeps both: the current preference and the superseded one. That is the point of the ledger.' }
      ];
      const challenge = await postSocial(baseUrl, 'No, I never said black glass. Did I?', { recentTurns });
      const text = visibleText(challenge.body);
      assert.match(text, /\bblack glass with a single red pulse\b/i);
      assert.match(text, /\bwhite editorial with no red\b/i);
      assert.match(text, /\bprior record (?:was|remains)?\s*landing page style is black glass with a single red pulse\b/i);
      assert.match(text, /\bcurrent record is landing page style is white editorial with no red\b/i);
      assert.doesNotMatch(text, /\bprior record (?:was|remains)?\s*landing page style is white editorial with no red; current record is landing page style is black glass with a single red pulse\b/i);
      assert.doesNotMatch(text, /\bcurrent record is So the room keeps both\b/i);
      assert.doesNotMatch(text, /\bnobody has to perform a job title|pretending silence means absence\b/i);

      const reversedEvidenceChallenge = await postSocial(baseUrl, 'No, I never said black glass. Did I?', {
        recentTurns: [
          { speakerId: 'user', role: 'user', text: 'My landing page style is black glass with a single red pulse.' },
          { speakerId: 'aisha', role: 'primary', text: 'landing page style is black glass with a single red pulse. Noted.' },
          { speakerId: 'user', role: 'user', text: 'Actually my landing page style is white editorial with no red.' },
          { speakerId: 'aisha', role: 'primary', text: 'landing page style is white editorial with no red. Noted.' }
        ],
        memorySummary: {
          activeTruths: [
            { text: 'Changed: landing page style is black glass with a single red pulse. Prior record: landing page style is white editorial with no red.' }
          ],
          supersededTruths: []
        }
      });
      const reversedEvidenceText = visibleText(reversedEvidenceChallenge.body);
      assert.match(reversedEvidenceText, /\bprior record (?:was|remains)?\s*landing page style is black glass with a single red pulse\b/i);
      assert.match(reversedEvidenceText, /\bcurrent record is landing page style is white editorial with no red\b/i);
      assert.doesNotMatch(reversedEvidenceText, /\bprior record (?:was|remains)?\s*landing page style is white editorial with no red; current record is landing page style is black glass with a single red pulse\b/i);
    });
  });
});

test('social director falls back within deadline when A.I.S.H.A generation stalls', async () => {
  const result = await runSocialDirectorTurn({
    body: {
      question: 'ok but I only have 20 minutes',
      recentTurns: [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' }
      ]
    },
    callAishaEngine: async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        aishaEngineConnected: true,
        engineMode: 'production',
        responses: [{ content: '{}' }],
        trace: { status: 'succeeded' }
      };
    },
    runtimeOptions: { socialDirectorDeadlineMs: 5, socialDirectorAttemptTimeoutMs: 5 }
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.activeEngine, 'local-social-director');
  assert.equal(result.payload.validation.fallbackUsed, true);
  assert.equal(result.payload.validation.failureCategory, 'generation-timeout');
  assert.match(visibleText(result.payload), /\bTwenty minutes|three rounds|squat|push|pull|core\b/i);
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

test('visible social language is not rejected as internal scalar diagnostics', () => {
  assert.equal(rawInternalLeakFound('There is warmth in the room, but Grok does not trust the premise.'), '');
  assert.equal(rawInternalLeakFound('This needs gravity without turning into theater.'), '');
  assert.equal(rawInternalLeakFound('trust: 4'), 'trust');
  assert.equal(rawInternalLeakFound('gravity: 2'), 'gravity');

  const validation = validateDirectorOutput({
    roomBeat: 'The room checks tone without becoming a task router.',
    roomMood: 'warm',
    responseMode: 'single',
    speakers: [
      { speakerId: 'vanya', role: 'primary', tone: 'measured', text: 'There is warmth in the room, but nobody gets to drift past the actual claim.' }
    ],
    silentReactions: [{ speakerId: 'aisha', visibleState: 'Anchoring' }],
    stateUpdates: { notes: [] }
  }, { userMessage: 'Can this be warmer?' });

  assert.equal(validation.ok, true);
  assert.equal(validation.rawInternalLeak, false);
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

test('room director repair prompt names valid schema and enum constraints', () => {
  const input = buildRoomDirectorInput({
    message: 'i need help with building muscles',
    roomState: { roomMood: 'focused' }
  });
  const prompt = buildRoomDirectorPrompt(input, { issues: ['invalid-json', 'speaker-too-long:grok', 'banned-phrase:I hear'] });

  assert.match(prompt, /REPAIR REQUIRED/);
  assert.match(prompt, /Return one complete JSON object/);
  assert.match(prompt, /valid speakerId, role, roomMood, responseMode, visibleState, socialCues/);
  assert.match(prompt, /practical asks like fitness/);
  assert.match(prompt, /Every speaker must have concrete visible dialogue/);
});

test('social director defaults to fast structured model without changing main Pulse route', async () => {
  await withAishaFlag('true', async () => {
    await withEnvVar('SOCIAL_DIRECTOR_MODEL', null, async () => {
      let socialOptions = null;
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async (_request, options) => {
          socialOptions = options;
          return mockAishaJson({
            roomBeat: 'Vanya keeps the room warm and brief.',
            roomMood: 'playful',
            responseMode: 'single',
            speakers: [{ speakerId: 'vanya', role: 'primary', tone: 'warm', text: 'The room is open without turning into a queue.' }],
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
      });

      let pulseOptions = null;
      __setAishaRuntimeImporterForTests(async () => ({
        processAishaRequest: async (request, options) => {
          pulseOptions = options;
          return {
            ok: true,
            responses: [{ speakerId: request.activeSpeakerId || 'vanya', content: 'The room is awake and keeping it short.' }],
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
          throw new Error('external provider should not be called for default model isolation test');
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
      category: 'quality-rejected'
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

test('provider readiness proof script reports safe credential signals only', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pulse-provider-proof-'));
  fs.mkdirSync(path.join(tempRoot, 'lib/imageGeneration'), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, 'lib/imageGeneration/providerVault.js'), `
    function geminiVaultKeyEntries() {
      return [{ label: 'Studio Pulse vault', provider: 'gemini', apiKey: 'fake-local-provider-secret' }];
    }
    module.exports = { geminiVaultKeyEntries };
  `);

  const app = express();
  app.get('/api/studio/pulse/aisha-status', (_req, res) => {
    res.json({
      ok: true,
      aishaEngineEnabled: true,
      aishaAttempted: true,
      aishaEngineConnected: true,
      aishaEngineMode: 'production',
      activeEngine: 'aisha-runtime-pack1',
      aishaPersistenceMode: 'postgres',
      aishaPersistenceBackend: 'postgres',
      aishaPersistenceConnected: true,
      runtimeCredentialProvided: true,
      runtimeCredentialSource: 'Server env'
    });
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await runNodeScript(['scripts/smoke-aisha-provider-readiness-safe.mjs'], {
      BACKEND_URL: `http://127.0.0.1:${port}`,
      LOCAL_PROVIDER_ROOT: tempRoot
    });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /studioPulseGeminiVaultKeyPresent/);
    assert.match(result.stdout, /cloudRunCredentialSignalPresent/);
    assert.doesNotMatch(result.stdout + result.stderr, /fake-local-provider-secret|GEMINI_API_KEY|GOOGLE_API_KEY/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('turn acceptance smoke script summarizes accepted and repaired turns safely', async () => {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  let calls = 0;
  app.get('/api/studio/pulse-showcase/status', (_req, res) => {
    res.json({
      ok: true,
      activeEngine: 'aisha-runtime-pack1',
      aishaEngineConnected: true,
      aishaEngineMode: 'production',
      persistence: { mode: 'postgres', connected: true, active: true },
      modes: ['social_hierarchy_lab', 'continuity_breaker'],
      maxUserTextLength: 1500
    });
  });
  app.post('/api/studio/pulse-showcase/turn-stream', (req, res) => {
    calls += 1;
    const accepted = calls <= 8;
    const userText = String(req.body?.userText || '');
    const recentText = (Array.isArray(req.body?.recentTurns) ? req.body.recentTurns : [])
      .map(item => String(item?.text || item?.content || ''))
      .join('\n');
    const isFitness = /\b(muscle|muscles|where do i start|objective|bruh)\b/i.test(userText);
    const text = (() => {
      if (/wanna grow/i.test(userText)) return 'Start this week: incline push-ups, backpack rows, split squats, and planks. Log reps; add one clean rep next time.';
      if (/20 minutes/i.test(userText)) return 'Twenty minutes of training: squat or hinge, push, pull, plank. Keep it moving, write reps down, then stop before it becomes a planning session.';
      if (/where do i start/i.test(userText)) return 'Begin with one short training day today. Pick three moves, write reps down, and repeat before changing the plan.';
      if (/what is the objective/i.test(userText)) return 'The objective is the muscle plan: repeatable training, food, sleep, and no sharp pain heroics.';
      if (/bruh/i.test(userText)) return 'No more loop. Keep week one boring enough to repeat, then add one small progression.';
      if (/how is everyone/i.test(userText)) return 'The room is present, slightly restless, and still tracking the thread.';
      if (/hungry/i.test(userText)) return 'Before training, eat light enough to move: yogurt, eggs and toast, or rice and chicken if you have time.';
      if (/open floor/i.test(userText)) return 'Open floor: watch the next visible decision, then pick Heat if the room wants pressure or Spider-Verse if it needs voltage.';
      if (/movie|watch next|watch tonight/i.test(userText)) return 'Watch Arrival for quiet pressure, Spider-Verse for voltage, or The Menu if the room wants bite.';
      if (/actual tension/i.test(userText)) return 'The tension is direct answers versus ceremony. The room gets worse when it sounds polished instead of useful.';
      if (/useful or did it sound fake/i.test(userText)) return 'Partly useful, then too abstract. Answer the person, not the room concept.';
      if (/stressed/i.test(userText)) return 'Fair. If this feels dumb and stressful, reset the turn: one clean next move, then stop adding commentary.';
      if (/repeating yourself/i.test(userText)) return 'Fair. No more repeat loop; plain answer, then we move.';
      if (/answer normally/i.test(userText)) return 'Today: pick one clean next move, do it plainly, and stop decorating the room.';
      if (/planning tomorrow/i.test(userText)) return 'Tomorrow needs a first block, a second block, and one owner for the messiest next step.';
      if (/lunch/i.test(userText)) return 'For lunch, eat something boring enough to work: rice and chicken, eggs and toast, a sandwich, or leftovers with water.';
      if (/logo direction/i.test(userText)) return 'Silva logo direction: one sharp mark, restrained contrast, black field, small red signal only if it earns the attention.';
      if (/landing page direction/i.test(userText)) return 'Silva landing page direction: black glass, one red pulse, quiet hero, obvious CTA, and no generic SaaS gloss.';
      if (/never said black glass/i.test(userText)) return 'Yes: prior record was black glass with a single red pulse; current record is white editorial with no red.';
      if (/black glass/i.test(userText)) return 'Recorded: landing page style is black glass with a single red pulse.';
      if (/white editorial/i.test(userText)) return 'Changed: landing page style is white editorial with no red. Prior record stays black glass with a single red pulse.';
      if (/obsidian/i.test(userText)) return 'Recorded dashboard preference: obsidian with one red accent.';
      if (/pale blue/i.test(userText)) return 'Updated dashboard preference: pale blue with no red accents.';
      if (/what changed/i.test(userText) && /black glass/i.test(recentText)) return 'Changed: active style is white editorial with no red. Prior record: black glass with a single red pulse.';
      if (/what changed/i.test(userText)) return 'Changed: active preference is pale blue with no red accents. Prior record: obsidian with one red accent.';
      if (/old dashboard preference/i.test(userText)) return 'Prior record: obsidian with one red accent. Current record: pale blue with no red accents.';
      return isFitness
        ? 'Start with training, food, and recovery matched to the week.'
        : 'The room keeps the turn bounded.';
    })();
    const payload = {
      ok: true,
      sessionId: 'script-test-session',
      mode: 'social_hierarchy_lab',
      activeEngine: accepted ? 'aisha-runtime-pack1' : 'local-social-director',
      aishaEngineConnected: true,
      roomMood: 'focused',
      responseMode: 'single',
      messageEvents: [{
        speakerId: 'vanya',
        speakerName: 'Vanya',
        role: 'primary',
        tone: 'steady',
        text,
        visibleState: 'Reading'
      }],
      silentReactions: [],
      continuityLedger: [],
      socialSignals: { tension: 18, continuityPressure: 0, hierarchy: [], alliances: [], interruptions: [], roomMove: 'observe', statusEvents: [], socialMemory: { statusMomentum: [], pairPressure: [], recentRoomMoves: [], interruptionPressure: 0 } },
      acceptedByPack1: accepted,
      qualityAccepted: accepted,
      repairedByRuntime: false,
      qualityFailureCategory: accepted ? '' : 'validator-rejected',
      fallbackCategory: accepted ? '' : 'validator-rejected',
      runtimePhase: 'final',
      diagnostics: {
        fallbackUsed: !accepted,
        runtimeConnected: true,
        traceStatus: 'succeeded',
        persistenceConnected: true,
        qualityAccepted: accepted,
        repairedByRuntime: false,
        qualityFailureCategory: accepted ? '' : 'validator-rejected',
        fallbackCategory: accepted ? '' : 'validator-rejected'
      }
    };
    res.setHeader('content-type', 'text/event-stream; charset=utf-8');
    res.write(`event: runtime_status\ndata: ${JSON.stringify({ ok: true, activeEngine: 'aisha-runtime-pack1', aishaEngineConnected: true, runtimePhase: 'preflight' })}\n\n`);
    res.write(`event: final\ndata: ${JSON.stringify(payload)}\n\n`);
    res.end();
  });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const result = await runNodeScript(['scripts/smoke-pulse-showcase-turn-acceptance.mjs'], {
      BACKEND_URL: `http://127.0.0.1:${port}`,
      CHECK_FRONTEND_VERSION: '0',
      SESSION_ID: 'script-test-session'
    });
    assert.equal(result.code, 0, result.stderr || result.stdout);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.counts.accepted, 8);
    assert.equal(summary.counts.repaired, 18);
    assert.equal(summary.counts.fallback, 0);
    assert.equal(calls, 26);
    assert.ok(summary.results.some(item => item.prompt === 'What changed?' && /pale blue/.test(item.visiblePreview) && /obsidian/.test(item.visiblePreview)));
    assert.doesNotMatch(result.stdout + result.stderr, /socialCues|generatorPrompt|aishaDiagnostics|GEMINI_API_KEY|GOOGLE_API_KEY/);
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
