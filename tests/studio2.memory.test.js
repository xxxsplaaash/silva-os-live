const test = require('node:test');
const assert = require('node:assert/strict');

const { addSalienceMemory, createEmptyThreadMemory, applyThreadMemoryUpdate } = require('../lib/studio2/v4/memory');
const { reinforceBelief } = require('../lib/studio2/v4/development');

test('studio2 memory strengthens repeated salience memories and beliefs', () => {
  let memories = [];
  memories = addSalienceMemory(memories, {
    sourceEventId: 'evt_1',
    content: 'The room keeps sounding generic.',
    emotionalWeight: 0.5,
    turn: 1
  });
  memories = addSalienceMemory(memories, {
    sourceEventId: 'evt_2',
    content: 'The room keeps sounding generic.',
    emotionalWeight: 0.7,
    turn: 2
  });
  assert.equal(memories.length, 1);
  assert.equal(memories[0].mentionCount, 2);
  assert.ok(memories[0].emotionalWeight >= 0.7);

  let beliefs = [];
  beliefs = reinforceBelief(beliefs, 'Generic language kills the room.', { sourceEventId: 'evt_1', turn: 1 });
  beliefs = reinforceBelief(beliefs, 'Generic language kills the room.', { sourceEventId: 'evt_2', turn: 2 });
  assert.equal(beliefs.length, 1);
  assert.ok(beliefs[0].confidence > 0.48);

  const memory = applyThreadMemoryUpdate(createEmptyThreadMemory(), {
    summary: 'The room got more specific.',
    openLoops: ['Who owns the next move?']
  });
  assert.equal(memory.summary, 'The room got more specific.');
  assert.deepEqual(memory.openLoops, ['Who owns the next move?']);
});
