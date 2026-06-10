const test = require('node:test');
const assert = require('node:assert/strict');

const { runSocialDirectorTurn } = require('../lib/studio/socialDirector/socialDirector');

function mockAishaJson(output) {
  return {
    aishaEngineConnected: true,
    engineMode: 'production',
    responses: [{ content: JSON.stringify(output) }],
    diagnostics: {
      responseTraceStatus: 'succeeded',
      aishaPersistenceBackend: 'postgres',
      aishaPersistenceConnected: true
    }
  };
}

function validFitnessOutput() {
  return {
    roomBeat: 'The practical ask needs a bounded first session.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      {
        speakerId: 'claudia',
        role: 'primary',
        tone: 'practical',
        text: 'Twenty minutes: squat, hinge, push, pull, core. Forty seconds on, twenty off, then write the reps down.',
        visibleState: 'Setting the timer'
      },
      {
        speakerId: 'vanya',
        role: 'side',
        tone: 'warm practical',
        text: 'Small enough to finish, real enough that tomorrow notices.',
        visibleState: 'Keeping it human'
      }
    ],
    silentReactions: [
      { speakerId: 'aisha', visibleState: 'Holding', reason: 'A.I.S.H.A holds authority until a correction is needed.' },
      { speakerId: 'leah', visibleState: 'Watching taste', reason: 'Leah saves the taste cut until the plan gets decorative.' },
      { speakerId: 'grok', visibleState: 'Checking the premise', reason: 'Grok watches for the premise fault before interrupting.' }
    ],
    stateUpdates: { notes: [] }
  };
}

test('social director enriches clean first-attempt diagnostics at the envelope layer', async () => {
  const result = await runSocialDirectorTurn({
    body: {
      question: 'LOL I WANNA GROW MY MUSCLES',
      roomState: { roomMood: 'focused' }
    },
    callAishaEngine: async () => mockAishaJson(validFitnessOutput())
  });

  const validation = result.payload.validation;
  assert.equal(result.payload.activeEngine, 'aisha-runtime-pack1');
  assert.equal(result.payload.qualityAccepted, true);
  assert.equal(result.payload.repairedByRuntime, false);
  assert.equal(validation.firstAttemptStatus, 'parsed');
  assert.equal(validation.firstAttemptAccepted, true);
  assert.equal(validation.firstAttemptCategory, '');
  assert.equal(validation.firstAttemptIssueCount, 0);
  assert.deepEqual(validation.firstAttemptIssues, []);
  assert.equal(validation.firstAttemptResponseMode, 'small_exchange');
  assert.deepEqual(validation.firstAttemptSpeakerOrder, ['claudia', 'vanya']);
  assert.equal(validation.repairAttemptStatus, '');
  assert.equal(validation.repairAttemptAccepted, false);
  assert.deepEqual(validation.repairAttemptIssues, []);
});

test('social director enriches first-vs-repair diagnostics when repair accepts', async () => {
  let calls = 0;
  const result = await runSocialDirectorTurn({
    body: {
      question: 'turn that into a 20 minute version',
      roomState: { roomMood: 'focused' },
      references: [{
        speakerId: 'claudia',
        speakerName: 'Claudia',
        role: 'side',
        text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down.'
      }],
      recentTurns: [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' }
      ]
    },
    callAishaEngine: async () => {
      calls += 1;
      if (calls === 1) {
        return mockAishaJson({
          roomBeat: 'The first answer dodges the referenced fitness request.',
          roomMood: 'focused',
          responseMode: 'single',
          speakers: [
            {
              speakerId: 'vanya',
              role: 'primary',
              tone: 'generic',
              text: 'Twenty minutes is a solid block for focused work.',
              visibleState: 'Softening'
            }
          ],
          silentReactions: [],
          stateUpdates: { notes: [] }
        });
      }
      return mockAishaJson(validFitnessOutput());
    }
  });

  const validation = result.payload.validation;
  assert.equal(calls, 2);
  assert.equal(result.payload.activeEngine, 'aisha-runtime-pack1');
  assert.equal(result.payload.qualityAccepted, true);
  assert.equal(result.payload.repairedByRuntime, true);
  assert.equal(validation.firstAttemptStatus, 'parsed');
  assert.equal(validation.firstAttemptAccepted, false);
  assert.equal(validation.firstAttemptCategory, 'quality-rejected');
  assert.ok(validation.firstAttemptIssueCount > 0);
  assert.ok(validation.firstAttemptIssues.includes('product-topic-ignored:referenced-fitness'));
  assert.equal(validation.firstAttemptResponseMode, 'single');
  assert.deepEqual(validation.firstAttemptSpeakerOrder, ['vanya']);
  assert.equal(validation.repairAttemptStatus, 'parsed');
  assert.equal(validation.repairAttemptAccepted, true);
  assert.equal(validation.repairAttemptCategory, '');
  assert.deepEqual(validation.repairAttemptIssues, []);
  assert.equal(validation.repairAttemptResponseMode, 'small_exchange');
  assert.deepEqual(validation.repairAttemptSpeakerOrder, ['claudia', 'vanya']);
});

test('social director exposes Vanya-referenced 20-minute first-attempt drift before repair', async () => {
  let calls = 0;
  const result = await runSocialDirectorTurn({
    body: {
      question: 'turn that into a 20 minute version',
      roomState: { roomMood: 'focused' },
      references: [{
        speakerId: 'vanya',
        speakerName: 'Vanya',
        role: 'primary',
        text: 'Start at home this week. Three short sessions; no heroic rebrand required.'
      }],
      recentTurns: [
        { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
        {
          speakerId: 'claudia',
          role: 'side',
          text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down.'
        }
      ]
    },
    callAishaEngine: async () => {
      calls += 1;
      if (calls === 1) {
        return mockAishaJson({
          roomBeat: 'The first answer treats Vanya as the whole answer.',
          roomMood: 'focused',
          responseMode: 'single',
          speakers: [
            {
              speakerId: 'vanya',
              role: 'primary',
              tone: 'warm',
              text: 'Twenty minutes is a solid block for focused work.',
              visibleState: 'Pushing'
            }
          ],
          silentReactions: [],
          stateUpdates: { notes: [] }
        });
      }
      return mockAishaJson(validFitnessOutput());
    }
  });

  const validation = result.payload.validation;
  assert.equal(calls, 2);
  assert.equal(result.payload.qualityAccepted, true);
  assert.equal(result.payload.repairedByRuntime, true);
  assert.equal(validation.firstAttemptCategory, 'quality-rejected');
  assert.ok(validation.firstAttemptIssues.includes('product-topic-ignored:referenced-fitness'));
  assert.deepEqual(validation.firstAttemptSpeakerOrder, ['vanya']);
  assert.equal(validation.repairAttemptAccepted, true);
  assert.deepEqual(validation.repairAttemptSpeakerOrder, ['claudia', 'vanya']);
});
