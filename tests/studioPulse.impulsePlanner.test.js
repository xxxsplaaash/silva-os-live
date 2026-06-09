const test = require('node:test');
const assert = require('node:assert/strict');

const { buildShowcaseImpulsePlan } = require('../lib/studio/socialDirector/showcaseImpulsePlanner');

test('showcase impulse planner gives exact no-content recovery turns concrete line jobs', () => {
  const tension = buildShowcaseImpulsePlan({
    userMessage: 'everyone, what is the actual tension in this room?',
    roomState: { roomMood: 'focused' }
  });
  assert.equal(tension.category, 'everyone');
  assert.ok(tension.selectedSpeakers.some(item => /room tension|human pressure|safe-choice|premise fault/i.test(item.lineJob)));
  assert.ok(tension.selectedSpeakers.every(item => item.lineJob && !/undefined|null/i.test(item.lineJob)));

  const repeat = buildShowcaseImpulsePlan({
    userMessage: 'you keep repeating yourself',
    roomState: { roomMood: 'focused' },
    recentTurns: [{ speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }]
  });
  assert.equal(repeat.category, 'practical');
  assert.deepEqual(repeat.speakerOrder, ['claudia', 'vanya']);
  assert.match(repeat.selectedSpeakers.find(item => item.speakerId === 'claudia').lineJob, /concrete next action|checkable result/i);
  assert.match(repeat.selectedSpeakers.find(item => item.speakerId === 'vanya').lineJob, /lower the social temperature|change the answer shape/i);
});

test('showcase impulse planner keeps Claudia first for Vanya-referenced 20-minute fitness compression', () => {
  const plan = buildShowcaseImpulsePlan({
    userMessage: 'turn that into a 20 minute version',
    references: [{
      speakerId: 'vanya',
      text: 'Start at home this week. Three short sessions; no heroic rebrand required.'
    }],
    recentTurns: [
      { speakerId: 'claudia', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank.' }
    ],
    roomState: { roomMood: 'focused' }
  });

  assert.equal(plan.category, 'practical');
  assert.deepEqual(plan.speakerOrder, ['claudia', 'vanya']);
  assert.match(plan.selectedSpeakers.find(item => item.speakerId === 'claudia').lineJob, /20-minute timer plan|movement categories|prior starter list/i);
  assert.match(plan.selectedSpeakers.find(item => item.speakerId === 'vanya').lineJob, /fresh human pressure|avoid recent mirror|first-round/i);
});

test('showcase impulse planner gives ordinary lunch distinct Claudia and Vanya line jobs', () => {
  const plan = buildShowcaseImpulsePlan({
    userMessage: 'quick help: what should I eat for lunch?',
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'claudia', role: 'assistant', text: 'Start this week with incline push-ups and backpack rows.' },
      { speakerId: 'vanya', role: 'assistant', text: 'Feed the session, not the performance.' }
    ],
    roomState: { roomMood: 'focused' }
  });

  assert.equal(plan.category, 'practical');
  assert.equal(plan.topicClass, 'food-choice');
  assert.deepEqual(plan.speakerOrder, ['claudia', 'vanya']);
  assert.match(plan.selectedSpeakers.find(item => item.speakerId === 'claudia').lineJob, /named lunch options|eggs|rice bowl|sandwich|leftovers/i);
  assert.match(plan.selectedSpeakers.find(item => item.speakerId === 'vanya').lineJob, /lunch|afternoon|personality-test/i);
  assert.match(plan.selectedSpeakers.find(item => item.speakerId === 'vanya').lineJob, /never movement or performance framing/i);
  assert.doesNotMatch(plan.selectedSpeakers.find(item => item.speakerId === 'vanya').lineJob, /\btraining-food\b/i);
});
