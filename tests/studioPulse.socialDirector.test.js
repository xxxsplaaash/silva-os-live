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
const { rawInternalLeakFound, validateDirectorOutput } = require('../lib/studio/socialDirector/socialDirectorValidator');
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

test('social director fallback changes shape again after the no-more-loop recovery', async () => {
  await withAishaFlag('false', async () => {
    await withStudioServer(async baseUrl => {
      const recentTurns = [
        { speakerId: 'user', role: 'user', text: 'WHAT IS THE OBJECTIVE?' },
        { speakerId: 'vanya', role: 'primary', text: 'Yeah, fair. No more loop: your next move is one simple week, not another speech about the objective.' },
        { speakerId: 'claudia', role: 'side', text: 'Pick three training days, write the exercises down, and add one tiny progression each week.' },
        { speakerId: 'grok', role: 'closer', text: 'If the plan cannot survive week one, it was decoration. Start boring enough to repeat.' }
      ];
      const { body } = await postSocial(baseUrl, 'BRUH...', { recentTurns });
      const text = visibleText(body);

      assert.equal(body.ok, true);
      assert.doesNotMatch(text, /objective is your actual ask: start building muscle/i);
      assert.doesNotMatch(text, /No more loop/i);
      assert.match(text, /\b(one workout|one meal|one sleep window|Log reps|run out of excuses)\b/i);
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

test('social director fallback does not let old fitness context hijack open floor', async () => {
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
      assert.equal(body.responseMode, 'open_floor');
      assert.doesNotMatch(text, /\b(full-body|training week|progressive overload|protein|sharp pain|basic pushes|squats|hinges)\b/i);
      assert.match(text, /\b(Open floor|panel show|room)\b/i);
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
      assert.match(tensionText, /\b(tension|customer support|taste|pressure|fake)\b/i);
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
      assert.match(grokText, /\b(fake-sounding|parameter language|less doctrine|more room)\b/i);
      assert.doesNotMatch(grokText, /\b(parameters were clear|within those parameters)\b/i);
    });
  });
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

      const recentTurns = [
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
      assert.doesNotMatch(text, /\bcurrent record is So the room keeps both\b/i);
      assert.doesNotMatch(text, /\bnobody has to perform a job title|pretending silence means absence\b/i);
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
      persistence: { mode: 'postgres', connected: true },
      modes: ['social_hierarchy_lab', 'continuity_breaker'],
      maxUserTextLength: 500
    });
  });
  app.post('/api/studio/pulse-showcase/turn-stream', (req, res) => {
    calls += 1;
    const accepted = calls <= 4;
    const userText = String(req.body?.userText || '');
    const isFitness = /\b(muscle|muscles|where do i start|objective|bruh)\b/i.test(userText);
    const text = (() => {
      if (/wanna grow/i.test(userText)) return 'Start with three full-body training days, enough protein, sleep, and slow progressive overload.';
      if (/where do i start/i.test(userText)) return 'Begin with three training days this week and track the lifts before adding volume.';
      if (/what is the objective/i.test(userText)) return 'The objective is the muscle plan: repeatable training, food, sleep, and no sharp pain heroics.';
      if (/bruh/i.test(userText)) return 'No more loop. Keep week one boring enough to repeat, then add one small progression.';
      if (/how is everyone/i.test(userText)) return 'The room is present, slightly restless, and still tracking the thread.';
      if (/hungry/i.test(userText)) return 'Eat something steady: protein, carbs, water, and enough time before training.';
      if (/obsidian/i.test(userText)) return 'Recorded dashboard preference: obsidian with one red accent.';
      if (/pale blue/i.test(userText)) return 'Updated dashboard preference: pale blue with no red accents.';
      if (/what changed/i.test(userText)) return 'Changed: active preference is pale blue with no red accents. Prior record: obsidian with one red accent.';
      if (/open floor/i.test(userText)) return 'Open floor, but not chaos. The room should watch the next visible decision.';
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
    assert.equal(summary.counts.accepted, 4);
    assert.equal(summary.counts.repaired, 6);
    assert.equal(summary.counts.fallback, 0);
    assert.equal(calls, 10);
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
