const test = require('node:test');
const assert = require('node:assert/strict');

const { runStudio2TurnV4 } = require('../lib/studio2/v4/engine');
const { seedStudio2StateFromLegacy } = require('../lib/studio2/v4/legacyAdapter');

function makeSeed() {
  return {
    threadId: 'thread_smoke',
    threadState: seedStudio2StateFromLegacy({
      threadId: 'thread_smoke',
      threadMeta: {},
      runtimeOverlay: {}
    }),
    recentMessages: [],
    characterMeta: {}
  };
}

function providerStub(prompt, options = {}) {
  const speaker = String(options.speakerId || '').trim().toLowerCase();
  const base = {
    aisha: `We keep asking for a room and then selecting assistant habits. That's the contradiction.`,
    leah: `It still goes generic too fast. The texture falls out immediately.`,
    claudia: `If nobody owns the next move, the energy means nothing operationally.`,
    grok: `The architecture only holds if the route and the product truth stop disagreeing.`,
    vanya: `The human risk is that the room sounds managed instead of honestly alive.`
  };
  return {
    text: base[speaker] || `The room is here.`,
    provider: 'test-provider',
    model: 'stub-v1'
  };
}

test('studio2 smoke room turn produces canonical message events within budget', async () => {
  const result = await runStudio2TurnV4({
    question: 'hi team',
    explicitWorkflowIntent: '',
    attachments: [],
    commitRequested: false,
    confirmCommit: false
  }, makeSeed(), {
    generateText: providerStub
  });
  assert.equal(result.ok, true);
  assert.equal(result.lane, 'room');
  assert.ok(Array.isArray(result.response.messageEvents));
  assert.equal(result.response.messageEvents.length, 1);
  assert.ok(result.providerCallCount <= 2);
});

test('studio2 smoke direct and diagnostic turns select the right speaker', async () => {
  let result = await runStudio2TurnV4({
    question: 'Grok, does this architecture actually hold?',
    explicitWorkflowIntent: '',
    attachments: [],
    commitRequested: false,
    confirmCommit: false
  }, makeSeed(), {
    generateText: providerStub
  });
  assert.equal(result.targetSpeakerId, 'grok');
  assert.equal(result.response.messageEvents[0].speakerId, 'grok');

  result = await runStudio2TurnV4({
    question: 'what is wrong with this chat?',
    explicitWorkflowIntent: '',
    attachments: [],
    commitRequested: false,
    confirmCommit: false
  }, makeSeed(), {
    generateText: providerStub
  });
  assert.equal(result.lane, 'diagnostic');
  assert.equal(result.response.messageEvents[0].speakerId, 'grok');
});

test('studio2 smoke keeps workflow inactive unless explicit', async () => {
  const result = await runStudio2TurnV4({
    question: 'content has felt weird lately',
    explicitWorkflowIntent: '',
    attachments: [],
    commitRequested: false,
    confirmCommit: false
  }, makeSeed(), {
    generateText: providerStub
  });
  assert.equal(result.lane, 'room');
  assert.equal(result.workflowContext, null);
});

test('studio2 smoke treats short follow-up questions as replies to the last room speaker', async () => {
  const seed = makeSeed();
  seed.recentMessages = [
    { speakerId: 'user', text: 'okay... how is everyone doing' },
    { speakerId: 'leah', text: "I'm alright. A little skeptical, a little awake, and much better when the voice feels real." }
  ];
  const result = await runStudio2TurnV4({
    question: 'what answer?',
    explicitWorkflowIntent: '',
    attachments: [],
    commitRequested: false,
    confirmCommit: false
  }, seed, {
    generateText: providerStub
  });
  assert.equal(result.lane, 'direct');
  assert.equal(result.targetSpeakerId, 'leah');
  assert.equal(result.response.messageEvents[0].speakerId, 'leah');
  assert.match(result.response.messageEvents[0].text, /sounds owned|emotionally anonymous|real/i);
});
