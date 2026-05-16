const test = require('node:test');
const assert = require('node:assert/strict');

const { createDefaultEmotionalState, applySignalsToEmotion } = require('../lib/studio2/v4/emotions');

test('studio2 emotions update deterministically from signals', () => {
  const base = createDefaultEmotionalState('vanya');
  const next = applySignalsToEmotion(base, {
    characterId: 'vanya',
    signals: ['boundary-crossed', 'vulnerability-signal'],
    sourceEventId: 'evt_1',
    turn: 1
  });
  assert.ok(next.protectiveness > base.protectiveness);
  assert.ok(next.guardedness > base.guardedness);
  assert.ok(next.anger > base.anger);
  assert.equal(typeof next.moodLabel, 'string');
  assert.ok(Array.isArray(next.emotionalResidue));
});
