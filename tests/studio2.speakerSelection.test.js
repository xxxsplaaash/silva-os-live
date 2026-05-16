const test = require('node:test');
const assert = require('node:assert/strict');

const { selectSpeakerForTurn } = require('../lib/studio2/v4/speakerSelection');
const { seedStudio2StateFromLegacy } = require('../lib/studio2/v4/legacyAdapter');

function baseState() {
  return seedStudio2StateFromLegacy({
    threadId: 't1',
    threadMeta: {},
    runtimeOverlay: {}
  });
}

test('studio2 speaker selection respects direct address', () => {
  const state = baseState();
  const selection = selectSpeakerForTurn({
    turnPlan: {
      lane: 'direct',
      intentFamily: 'followup',
      targetSpeakerId: 'grok'
    },
    currentTurn: 1,
    question: 'Grok, does this architecture hold?',
    detectedSignals: ['factual-contradiction'],
    state
  });
  assert.equal(selection.leadSpeakerId, 'grok');
});

test('studio2 speaker selection favors the right character pressure', () => {
  const state = baseState();
  let selection = selectSpeakerForTurn({
    turnPlan: { lane: 'room', intentFamily: 'critique', targetSpeakerId: null },
    currentTurn: 1,
    question: 'This feels generic. It needs texture.',
    detectedSignals: ['taste-signal'],
    state
  });
  assert.equal(selection.leadSpeakerId, 'leah');

  selection = selectSpeakerForTurn({
    turnPlan: { lane: 'room', intentFamily: 'followup', targetSpeakerId: null },
    currentTurn: 1,
    question: 'We can figure ownership later.',
    detectedSignals: ['commitment-made'],
    state
  });
  assert.equal(selection.leadSpeakerId, 'claudia');
});
