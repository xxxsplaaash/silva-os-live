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

test('social fallback compresses live short-session starter wording without repeating it', () => {
  const body = {
    references: [
      {
        speakerId: 'claudia',
        speakerName: 'Claudia Naidoo',
        text: 'First step: set a timer for twenty minutes. Focus on three rounds of incline push-ups, backpack rows, and split squats.'
      }
    ],
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'claudia', role: 'primary', text: 'First step: set a timer for twenty minutes. Focus on three rounds of incline push-ups, backpack rows, and split squats.' },
      { speakerId: 'vanya', role: 'side', text: 'Make the week human first; the mirror can join once the reps exist.' }
    ]
  };
  const fallback = socialFallbackFor('turn that into a 20 minute version', body);
  const text = fallbackVisibleText(fallback);

  assert.match(text, /Run two rounds: squat, push, row, hinge, plank/i);
  assert.match(text, /Stop at twenty minutes and write the count/i);
  assert.doesNotMatch(text, /three rounds of incline push-ups, backpack rows, and split squats/i);
  assert.doesNotMatch(text, /Make it socially impossible to negotiate/i);
});

test('social fallback changes objective recovery shape across full visible history', () => {
  const body = {
    recentTurns: [
      { speakerId: 'user', role: 'user', text: 'LOL I WANNA GROW MY MUSCLES' },
      { speakerId: 'claudia', role: 'primary', text: 'First step: set a twenty-minute timer for four blocks: push or pull, legs, hinge, core. Write the lowest rep count before you stop.' },
      { speakerId: 'vanya', role: 'side', text: 'Make the week human first; the mirror can join once the reps exist.' },
      { speakerId: 'user', role: 'user', text: 'turn that into a 20 minute version' },
      { speakerId: 'claudia', role: 'primary', text: 'Twenty minutes: 3 to warm up, 12 for squats, wall push-ups, towel rows, and glute bridges, 5 for plank. Record total reps.' },
      { speakerId: 'vanya', role: 'side', text: 'Make it socially impossible to negotiate: twenty minutes, then proof.' },
      { speakerId: 'user', role: 'user', text: 'ok but I only have 20 minutes' },
      { speakerId: 'claudia', role: 'side', text: 'Use a short timer: reverse lunges, pushups, towel rows, wall sit. Four rounds, count reps, stop.' },
      { speakerId: 'vanya', role: 'primary', text: 'Keep the body honest, not dramatic. Finish small; brag later.' },
      { speakerId: 'user', role: 'user', text: 'WHERE DO I START' },
      { speakerId: 'claudia', role: 'side', text: 'Two rounds: push, row, squat, hinge. Mark one number before you leave; next week beat that number by one.' },
      { speakerId: 'vanya', role: 'primary', text: 'Start where the week can actually hold it: Monday, Wednesday, Friday; no identity speech required.' }
    ]
  };
  const fallback = socialFallbackFor('WHAT IS THE OBJECTIVE?', body);
  const text = fallbackVisibleText(fallback);

  assert.match(text, /Action version: push, pull, legs; log reps, recover, repeat/i);
  assert.match(text, /Premise check: specific beats motivational fog/i);
  assert.doesNotMatch(text, /First step: set a twenty-minute timer for four blocks/i);
  assert.doesNotMatch(text, /Start where the week can actually hold it/i);
  assert.doesNotMatch(text, /objective is clear|personal fitness routines/i);
});
