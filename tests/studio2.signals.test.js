const test = require('node:test');
const assert = require('node:assert/strict');

const { detectObservableSignals, OBSERVABLE_SIGNALS } = require('../lib/studio2/v4/signals');

test('studio2 signals stay inside the closed set', () => {
  const signals = detectObservableSignals("Actually, the real issue is that this feels generic. Sorry, that was too far. I promise I'll fix it. I'm struggling.");
  for (const signal of signals) {
    assert.ok(OBSERVABLE_SIGNALS.includes(signal));
  }
  assert.ok(signals.includes('factual-contradiction'));
  assert.ok(signals.includes('taste-signal'));
  assert.ok(signals.includes('repair-attempt'));
  assert.ok(signals.includes('boundary-crossed'));
  assert.ok(signals.includes('commitment-made'));
  assert.ok(signals.includes('vulnerability-signal'));
});
