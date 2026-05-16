const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateGeneratedText,
  validateMessageEvents,
  validateVoiceLibraryPresent
} = require('../lib/studio2/v4/responseValidator');

test('studio2 validation rejects assistant smell and workflow leakage', () => {
  const result = validateGeneratedText('As an AI, I can help with that workflow draft.', {
    lane: 'room',
    recentMessages: []
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('assistant-tone'));
  assert.ok(result.errors.includes('workflow-leakage'));
});

test('studio2 validation catches missing direct target and voice library is complete', () => {
  const eventCheck = validateMessageEvents({
    messageEvents: [{ speakerId: 'aisha', text: 'Hi.' }]
  }, {
    targetSpeakerId: 'grok'
  });
  assert.equal(eventCheck.ok, false);
  assert.ok(eventCheck.errors.includes('missing-direct-target'));

  const gate = validateVoiceLibraryPresent();
  assert.equal(gate.ok, true);
});
