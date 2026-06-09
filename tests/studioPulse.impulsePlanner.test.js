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
