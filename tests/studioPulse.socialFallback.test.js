const test = require('node:test');
const assert = require('node:assert/strict');

const { socialFallbackFor } = require('../lib/studio/socialDirector/socialDirectorFallback');

function fallbackVisibleText(output = {}) {
  return [
    output.roomBeat,
    ...(Array.isArray(output.speakers) ? output.speakers.map(item => item.text) : []),
    ...(Array.isArray(output.stateUpdates?.notes) ? output.stateUpdates.notes : [])
  ].join('\n');
}

test('social fallback repetition recovery does not invent project-manager ownership', () => {
  const fallback = socialFallbackFor('you keep repeating yourself', {
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'you keep repeating yourself' }
    ]
  });
  const text = fallbackVisibleText(fallback);

  assert.match(text, /loop got loud|concrete action|measurable next move/i);
  assert.doesNotMatch(text, /\bone owner\b|handoff|project logistics|team logistics/i);
});

test('social fallback names exact room tension instead of returning no-content', () => {
  const fallback = socialFallbackFor('everyone, what is the actual tension in this room?', {
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'everyone, what is the actual tension in this room?' }
    ]
  });
  const text = fallbackVisibleText(fallback);

  assert.match(text, /actual social tension|wobble|safe choice|dodge|social-quality pressure/i);
  assert.doesNotMatch(text, /\bno-content\b|no usable room response|objective is clear/i);
});
