const test = require('node:test');
const assert = require('node:assert/strict');

const { createDefaultRelationshipState, applySignalsToRelationship } = require('../lib/studio2/v4/relationships');

test('studio2 relationship repair lowers repairNeeded and soft dismissal raises friction', () => {
  const base = createDefaultRelationshipState();
  const sharper = applySignalsToRelationship(base, {
    signals: ['soft-dismissal'],
    note: 'dismissed'
  });
  assert.ok(sharper.friction > base.friction);
  assert.equal(sharper.repairNeeded, true);

  const repaired = applySignalsToRelationship(sharper, {
    signals: ['repair-attempt'],
    note: 'apology'
  });
  assert.ok(repaired.trust > sharper.trust);
  assert.equal(repaired.repairNeeded, false);
});
