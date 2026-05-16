const test = require('node:test');
const assert = require('node:assert/strict');

const { createDefaultNeedState, applySignalsToNeeds } = require('../lib/studio2/v4/needs');

test('studio2 needs frustration increases expression pressure', () => {
  const base = createDefaultNeedState('claudia');
  const next = applySignalsToNeeds(base, {
    characterId: 'claudia',
    signals: ['topic-hijack', 'commitment-made', 'factual-contradiction']
  });
  assert.ok(next.expressionPressure >= base.expressionPressure);
  assert.ok(next.frustration.competence >= base.frustration.competence);
  assert.ok(next.strongestNeed);
});
