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

test('room director first-attempt prompt gives Pack 1 concrete room-tension examples', () => {
  const input = buildRoomDirectorInput({
    message: 'everyone, what is the actual tension in this room?',
    recentTurns: [
      { speakerId: 'user', text: 'everyone, what is the actual tension in this room?' }
    ],
    roomState: { roomMood: 'sharp' }
  });
  const prompt = buildRoomDirectorPrompt(input);

  assert.match(prompt, /BAD: user asks "everyone, what is the actual tension in this room\?"/);
  assert.match(prompt, /returns empty speakers, silent-only cards, diagnostics, or old-topic advice/i);
  assert.match(prompt, /GOOD: Vanya says "The tension is that everyone wants to sound useful before anyone names the dodge\."/);
  assert.match(prompt, /Leah says "Safe consensus is trying to pass itself off as taste\."/);
  assert.match(prompt, /Grok says "The premise fault is pretending the room is aligned when it is avoiding a position\."/);
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

test('room director first-attempt prompt makes repeat complaints acknowledge the loop before action', () => {
  const input = buildRoomDirectorInput({
    message: 'you keep repeating yourself',
    recentTurns: [
      { speakerId: 'user', text: 'I am stressed and this is starting to feel dumb.' },
      { speakerId: 'vanya', text: 'Fair. Breathe first; shrink the room to water, one clear surface, and ten minutes that do not need a speech.' },
      { speakerId: 'user', text: 'you keep repeating yourself' }
    ],
    roomState: { roomMood: 'focused' }
  });
  const prompt = buildRoomDirectorPrompt(input);

  assert.match(prompt, /The repeat complaint is the topic/i);
  assert.match(prompt, /Acknowledge the loop once before giving any action/i);
  assert.match(prompt, /Do not answer with only a timer, water, clear-surface reset, generic today plan, or stress-recovery line/i);
  assert.match(prompt, /first visible speaker must acknowledge the loop, repetition, or same-answer failure/i);
  assert.match(prompt, /BAD: user says "you keep repeating yourself" and Claudia says "First step: close the noisy tab/i);
  assert.match(prompt, /GOOD: Vanya says "Plain version: the loop got loud/i);
});
