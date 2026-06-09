const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRoomDirectorInput,
  buildRoomDirectorPrompt
} = require('../lib/studio/socialDirector/roomDirectorPrompt');

test('room director repair prompt tells Pack 1 how to recover room-tension no-content turns', () => {
  const input = buildRoomDirectorInput({
    message: 'everyone, what is the actual tension in this room?',
    recentTurns: [
      { speakerId: 'user', text: 'everyone, what is the actual tension in this room?' }
    ],
    roomState: { roomMood: 'sharp' }
  });
  const prompt = buildRoomDirectorPrompt(input, { issues: ['no-content'] });

  assert.match(prompt, /Room-tension no-content repair/);
  assert.match(prompt, /name the actual room pressure, friction, dodge, or safe-choice problem/i);
  assert.match(prompt, /do not return diagnostics, operational status, or silence-only output/i);
});

test('room director repair prompt tells Pack 1 how to recover repetition no-content turns', () => {
  const input = buildRoomDirectorInput({
    message: 'you keep repeating yourself',
    recentTurns: [
      { speakerId: 'user', text: 'you keep repeating yourself' }
    ],
    roomState: { roomMood: 'focused' }
  });
  const prompt = buildRoomDirectorPrompt(input, { issues: ['no-content'] });

  assert.match(prompt, /Repetition-complaint no-content repair/);
  assert.match(prompt, /acknowledge the loop once, change the response shape/i);
  assert.match(prompt, /Do not invent owner\/handoff logistics/i);
  assert.match(prompt, /or defend the prior answer/i);
});
