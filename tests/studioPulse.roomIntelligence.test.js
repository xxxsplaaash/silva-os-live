const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const studioRouter = require('../routes/studio');
const {
  CHARACTER_PROFILES,
  createRoomIntelligenceContext,
  perceiveRoomMessage,
  planRoomTurn,
  reduceRoomState,
  deterministicTurnFromStep,
  fallbackTurnFromStep,
  calculateSocialImpulses,
  normalizeCharacterContinuityState,
  normalizeMemoryList,
  continuityPayloadForAisha,
  MEMORY_CAPS,
  relationshipKey
} = require('../lib/studio/roomIntelligence');

const FORBIDDEN_ARCHITECTURE_RX = /\b(labels are not presence|assistant cosplay|architecture|implementation|selection|validation|generation|presence system|room intelligence|real room has rhythm)\b/i;

function plannedTexts(plan) {
  return plan.steps.map(deterministicTurnFromStep).map(item => item.content).join('\n');
}

function countMemory(items = [], value = '') {
  const key = String(value || '').toLowerCase();
  return (Array.isArray(items) ? items : []).filter(item => String(item || '').toLowerCase() === key).length;
}

async function withStudioServer(fn) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/studio', studioRouter);
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('room intelligence character profiles contain required room identity fields', () => {
  for (const id of ['aisha', 'leah', 'claudia', 'grok', 'vanya']) {
    const profile = CHARACTER_PROFILES[id];
    assert.equal(profile.id, id);
    assert.ok(profile.displayName);
    assert.ok(profile.roleInRoom);
    assert.ok(profile.coreVoice);
    assert.ok(profile.emotionalBaseline);
    assert.ok(Array.isArray(profile.defaultDrives));
    assert.ok(Array.isArray(profile.boundaries));
    assert.ok(profile.relationshipToUser);
    assert.ok(profile.relationshipToOtherCharacters);
    assert.ok(Array.isArray(profile.speakingStyleRules));
    assert.ok(Array.isArray(profile.responseDoNotDos));
  }
});

test('greeting_to_team_is_not_architecture_review', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-greeting' });
  const perception = perceiveRoomMessage('hi team', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const text = plannedTexts(plan);
  assert.equal(perception.isRoomGreeting, true);
  assert.equal(plan.deterministic, true);
  assert.equal(plan.steps.length, 1);
  assert.deepEqual(plan.responseOrder, ['vanya']);
  assert.doesNotMatch(text, FORBIDDEN_ARCHITECTURE_RX);
  assert.match(text, /\b(hey|here|present|quiet|room)\b/i);
});

test('character continuity defaults include memory, relationships, and room social state', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-continuity-defaults' });
  const continuity = state.characterContinuityV0;
  assert.equal(continuity.schemaVersion, 'studio-pulse.character-continuity.v0');
  assert.ok(Array.isArray(continuity.characterMemories.vanya.runningJokes));
  assert.ok(continuity.characterMemories.leah.stableTraits.includes('taste reader'));
  assert.ok(continuity.characterMemories.leah.seedTraits.includes('taste reader'));
  assert.deepEqual(continuity.characterMemories.leah.learnedTraits, []);
  assert.equal(countMemory(continuity.characterMemories.leah.stableTraits, 'taste reader'), 1);
  assert.equal(continuity.relationshipStates[relationshipKey('vanya', 'user')].fromCharacterId, 'vanya');
  assert.equal(continuity.relationshipStates[relationshipKey('leah', 'claudia')].toEntityId, 'claudia');
  assert.equal(continuity.roomSocialState.dominantMood, 'steady');
});

test('continuity memory normalization is idempotent and keeps seeds out of learned memory', () => {
  const duplicated = normalizeCharacterContinuityState({
    threadId: 'room-test-memory-normalize',
    characterMemories: {
      aisha: {
        stableTraits: ['room lead', 'standards keeper', 'Room lead', 'standards-keeper', 'earned calm authority'],
        preferences: ['clear asks', 'Clear asks', 'earned confidence', 'clean briefs'],
        dislikes: ['generic assistant tone', 'Generic assistant tone', 'vague performance', 'performative urgency']
      }
    }
  });
  const once = duplicated.characterMemories.aisha;
  assert.deepEqual(once.seedTraits, ['room lead', 'standards keeper']);
  assert.deepEqual(once.learnedTraits, ['earned calm authority']);
  assert.deepEqual(once.learnedPreferences, ['clean briefs']);
  assert.deepEqual(once.learnedDislikes, ['performative urgency']);
  assert.equal(countMemory(once.stableTraits, 'room lead'), 1);
  assert.equal(countMemory(once.preferences, 'clear asks'), 1);
  assert.equal(countMemory(once.dislikes, 'generic assistant tone'), 1);

  const normalizedThreeTimes = normalizeCharacterContinuityState(
    normalizeCharacterContinuityState(
      normalizeCharacterContinuityState(duplicated)
    )
  );
  assert.deepEqual(normalizedThreeTimes.characterMemories.aisha.stableTraits, once.stableTraits);
  assert.deepEqual(normalizedThreeTimes.characterMemories.aisha.learnedTraits, once.learnedTraits);
});

test('normalizeMemoryList dedupes safely while preserving readable casing and bounds', () => {
  const normalized = normalizeMemoryList(
    [' Room lead ', 'room   lead', 'ROOM-LEAD', 'Clean brief', 'Clean brief!', 'Another item'],
    { maxItems: 3, canonicalAliases: { 'room lead': 'room lead', 'clean brief': 'clean brief' } }
  );
  assert.deepEqual(normalized, ['Room lead', 'Clean brief', 'Another item']);
  assert.equal(normalized.length <= 3, true);
});

test('relationship state keys remain stable and directional after normalization', () => {
  const state = normalizeCharacterContinuityState({
    relationshipStates: {
      [relationshipKey('leah', 'user')]: { fromCharacterId: 'leah', toEntityId: 'user', respect: 1.4, irritation: -0.2 },
      [relationshipKey('user', 'leah')]: { fromCharacterId: 'user', toEntityId: 'leah', respect: 0.9 }
    }
  });
  const keys = Object.keys(state.relationshipStates);
  assert.equal(keys.length, 25);
  assert.ok(keys.includes(relationshipKey('leah', 'user')));
  assert.ok(keys.includes(relationshipKey('vanya', 'leah')));
  assert.equal(state.relationshipStates[relationshipKey('leah', 'user')].respect, 1);
  assert.equal(state.relationshipStates[relationshipKey('leah', 'user')].irritation, 0);
  assert.equal(state.relationshipStates[relationshipKey('user', 'leah')], undefined);
});

test('tense greeting lets Aisha hold the room without activating everyone', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-tense-greeting' });
  state.recentTension = 0.72;
  state.characterContinuityV0 = normalizeCharacterContinuityState({
    ...state.characterContinuityV0,
    roomSocialState: { ...(state.characterContinuityV0.roomSocialState || {}), tension: 0.74, dominantMood: 'tense' }
  });
  const perception = perceiveRoomMessage('hi team', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  assert.deepEqual(plan.responseOrder, ['vanya', 'aisha']);
  assert.ok(plan.steps.length <= 2);
  assert.equal(plan.steps[1].responseIntent, 'room-stabilise');
});

test('controversial design critique raises Leah and optionally Grok without the whole room', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-design-critique' });
  const perception = perceiveRoomMessage('give me a controversial design critique of this logo', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  assert.equal(plan.intentFamily, 'design-critique');
  assert.equal(plan.responseOrder[0], 'leah');
  assert.ok(plan.responseOrder.includes('grok'));
  assert.ok(plan.steps.length >= 1 && plan.steps.length <= 2);
  assert.ok(plan.steps.length < 5);
});

test('repeated failure raises Grok and records a pattern continuity event', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-repeated-failure' });
  const perception = perceiveRoomMessage('the provider save failed again with the same error', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const turns = plan.steps.map(step => fallbackTurnFromStep(step, perception));
  const next = reduceRoomState({ previous: state, perception, plan, turns, socialImpulses, threadId: 'room-test-repeated-failure' });
  assert.deepEqual(plan.responseOrder, ['grok']);
  assert.equal(next.characterContinuityV0.continuityEvents.at(-1).type, 'pattern-failure');
  assert.match(next.characterContinuityV0.characterMemories.grok.projectAttachments.at(-1), /failed again/i);
});

test('continuity reducer is idempotent for the same meaningful event', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-reducer-idempotency' });
  const perception = perceiveRoomMessage('the provider save failed again with the same error', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const turns = plan.steps.map(step => fallbackTurnFromStep(step, perception));
  const first = reduceRoomState({ previous: state, perception, plan, turns, socialImpulses, threadId: 'room-test-reducer-idempotency' });
  const second = reduceRoomState({ previous: first, perception, plan, turns, socialImpulses, threadId: 'room-test-reducer-idempotency' });
  const firstContinuity = first.characterContinuityV0;
  const secondContinuity = second.characterContinuityV0;
  assert.equal(secondContinuity.continuityEvents.length, firstContinuity.continuityEvents.length);
  assert.equal(
    secondContinuity.characterMemories.grok.projectAttachments.length,
    firstContinuity.characterMemories.grok.projectAttachments.length
  );
  assert.deepEqual(
    secondContinuity.relationshipStates[relationshipKey('grok', 'user')],
    firstContinuity.relationshipStates[relationshipKey('grok', 'user')]
  );
  assert.equal(countMemory(secondContinuity.characterMemories.grok.stableTraits, 'diagnostic pattern reader'), 1);
});

test('warm emotional check-in raises Vanya and lets Aisha hold if room tension is high', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-warm-check-in' });
  state.characterContinuityV0 = normalizeCharacterContinuityState({
    ...state.characterContinuityV0,
    roomSocialState: { ...(state.characterContinuityV0.roomSocialState || {}), tension: 0.62 }
  });
  const perception = perceiveRoomMessage("I'm stressed and need a human read", state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  assert.equal(plan.intentFamily, 'emotional-check-in');
  assert.equal(plan.responseOrder[0], 'vanya');
  assert.ok(plan.responseOrder.includes('aisha'));
  assert.ok(plan.steps.length <= 2);
});

test('critique and support turns update relationship deltas', () => {
  const critiqueState = createRoomIntelligenceContext({ threadId: 'room-test-critique-deltas' });
  const critiquePerception = perceiveRoomMessage('give me a controversial design critique of this logo', critiqueState);
  const critiqueImpulses = calculateSocialImpulses({ perception: critiquePerception, roomState: critiqueState });
  const critiquePlan = planRoomTurn({ perception: critiquePerception, roomState: critiqueState, socialImpulses: critiqueImpulses });
  const critiqueTurns = critiquePlan.steps.map(step => fallbackTurnFromStep(step, critiquePerception));
  const critiqueBefore = critiqueState.characterContinuityV0.relationshipStates[relationshipKey('leah', 'user')];
  const critiqueNext = reduceRoomState({ previous: critiqueState, perception: critiquePerception, plan: critiquePlan, turns: critiqueTurns, socialImpulses: critiqueImpulses, threadId: 'room-test-critique-deltas' });
  const critiqueAfter = critiqueNext.characterContinuityV0.relationshipStates[relationshipKey('leah', 'user')];
  assert.ok(critiqueAfter.respect > critiqueBefore.respect);
  assert.ok(critiqueAfter.rivalry > critiqueBefore.rivalry);

  const supportState = createRoomIntelligenceContext({ threadId: 'room-test-support-deltas' });
  const supportPerception = perceiveRoomMessage("I'm stressed and need a human read", supportState);
  const supportImpulses = calculateSocialImpulses({ perception: supportPerception, roomState: supportState });
  const supportPlan = planRoomTurn({ perception: supportPerception, roomState: supportState, socialImpulses: supportImpulses });
  const supportTurns = supportPlan.steps.map(step => fallbackTurnFromStep(step, supportPerception));
  const supportBefore = supportState.characterContinuityV0.relationshipStates[relationshipKey('vanya', 'user')];
  const supportNext = reduceRoomState({ previous: supportState, perception: supportPerception, plan: supportPlan, turns: supportTurns, socialImpulses: supportImpulses, threadId: 'room-test-support-deltas' });
  const supportAfter = supportNext.characterContinuityV0.relationshipStates[relationshipKey('vanya', 'user')];
  assert.ok(supportAfter.warmth > supportBefore.warmth);
  assert.ok(supportAfter.protectiveness > supportBefore.protectiveness);
});

test('casual social prompts do not create permanent preferences or relationship spam', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-casual-memory-quality' });
  const perception = perceiveRoomMessage('who likes pizza?', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const turns = plan.steps.map(step => fallbackTurnFromStep(step, perception));
  const before = state.characterContinuityV0.relationshipStates[relationshipKey('vanya', 'user')];
  const next = reduceRoomState({ previous: state, perception, plan, turns, socialImpulses, threadId: 'room-test-casual-memory-quality' });
  const after = next.characterContinuityV0.relationshipStates[relationshipKey('vanya', 'user')];
  const vanyaMemory = next.characterContinuityV0.characterMemories.vanya;
  assert.equal(vanyaMemory.learnedPreferences.some(item => /pizza/i.test(item)), false);
  assert.equal(vanyaMemory.preferences.some(item => /pizza/i.test(item)), false);
  assert.deepEqual(after, before);
  assert.equal(next.characterContinuityV0.continuityEvents.at(-1).shouldPersist, false);
});

test('explicit repeated running jokes become one bounded continuity memory', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-running-joke' });
  const perception = perceiveRoomMessage('Grok stealing the last slice is officially a running joke', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const turns = plan.steps.map(step => fallbackTurnFromStep(step, perception));
  const first = reduceRoomState({ previous: state, perception, plan, turns, socialImpulses, threadId: 'room-test-running-joke' });
  const second = reduceRoomState({ previous: first, perception, plan, turns, socialImpulses, threadId: 'room-test-running-joke' });
  assert.equal(first.characterContinuityV0.characterMemories.grok.runningJokes.length, 1);
  assert.equal(second.characterContinuityV0.characterMemories.grok.runningJokes.length, 1);
  assert.match(second.characterContinuityV0.characterMemories.grok.runningJokes[0], /last slice|running joke/i);
});

test('A.I.S.H.A continuity payload is clean, bounded, and seed traits appear once', () => {
  const noisy = normalizeCharacterContinuityState({
    threadId: 'room-test-aisha-continuity-clean',
    characterMemories: {
      aisha: {
        stableTraits: ['room lead', 'standards keeper', 'room lead', 'standards keeper', 'earned calm authority'],
        learnedTraits: ['earned calm authority', 'earned calm authority'],
        preferences: ['clear asks', 'clear asks', 'clean briefs'],
        runningJokes: Array.from({ length: 20 }, (_, index) => `joke ${index}`)
      }
    },
    continuityEvents: Array.from({ length: 40 }, (_, index) => ({
      id: `event-${index}`,
      timestamp: `2026-05-17T00:00:${String(index).padStart(2, '0')}.000Z`,
      type: index % 2 ? 'room-turn' : 'design-critique',
      characters: ['aisha'],
      userVisibleSummary: `event summary ${index}`,
      memoryImportance: index % 2 ? 0.2 : 0.7,
      shouldPersist: index % 2 === 0
    }))
  });
  const payload = continuityPayloadForAisha(noisy);
  const aishaMemory = payload.characterMemories.aisha;
  assert.equal(countMemory(aishaMemory.stableTraits, 'room lead'), 1);
  assert.equal(countMemory(aishaMemory.stableTraits, 'standards keeper'), 1);
  assert.equal(countMemory(aishaMemory.stableTraits, 'earned calm authority'), 1);
  assert.equal(aishaMemory.runningJokes.length <= MEMORY_CAPS.runningJokes, true);
  assert.equal(payload.continuityEvents.length <= MEMORY_CAPS.recentContinuityEventsForAisha, true);
  assert.equal(Object.prototype.hasOwnProperty.call(aishaMemory, 'seedTraits'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(aishaMemory, 'learnedTraits'), false);
});

test('everyone_opinion_answers_user_topic', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-logo' });
  const perception = perceiveRoomMessage('everyone give me your honest opinion on this logo', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const turns = plan.steps.map(deterministicTurnFromStep);
  assert.equal(perception.asksEveryone, true);
  assert.ok(turns.length >= 3 && turns.length <= 5);
  turns.forEach(turn => {
    assert.match(turn.content, /\blogo\b/i);
    assert.doesNotMatch(turn.content, FORBIDDEN_ARCHITECTURE_RX);
  });
});

test('presence questions are deterministic and reference active plus quiet room state', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-presence' });
  const perception = perceiveRoomMessage('room state?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  assert.equal(perception.asksAboutRoomState, true);
  assert.equal(perception.asksRollCall, false);
  assert.equal(plan.deterministic, true);
  assert.equal(plan.requiresProvider, false);
  assert.deepEqual(plan.responseOrder, ['aisha']);
  assert.equal(plan.steps.length, 1);
  assert.match(plan.steps[0].deterministicText, /Active right now/i);
  assert.match(plan.steps[0].deterministicText, /Quiet\/listening/i);
  assert.doesNotMatch(plan.steps[0].deterministicText, /Good question/i);
  assert.doesNotMatch(plan.steps[0].deterministicText, FORBIDDEN_ARCHITECTURE_RX);
});

test('role call returns a concise room roll call instead of only Vanya', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-roll-call' });
  const perception = perceiveRoomMessage('role call!!!', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const text = plannedTexts(plan);
  assert.equal(perception.asksRollCall, true);
  assert.equal(perception.taskType, 'roll_call');
  assert.equal(perception.socialIntent, 'calling_room');
  assert.equal(plan.intentFamily, 'room-roll-call');
  assert.deepEqual(plan.responseOrder, ['aisha']);
  assert.notDeepEqual(plan.responseOrder, ['vanya']);
  assert.match(text, /Aisha Motsepe/i);
  assert.match(text, /Vanya Khumalo/i);
  assert.match(text, /Leah Mokoena/i);
  assert.match(text, /Claudia Naidoo/i);
  assert.match(text, /Grok \/ Gerhard/i);
  assert.match(text, /quiet\/listening/i);
  assert.doesNotMatch(text, /On that:/i);
  assert.doesNotMatch(text, FORBIDDEN_ARCHITECTURE_RX);
});

test('online and present variants classify as roll-call instead of generic Vanya fallback', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-online-variants' });
  [
    'whos online?',
    "who's online?",
    'who is online?',
    'who is here?',
    "who's here?",
    'who is present?',
    'anyone online?',
    'anyone here?'
  ].forEach(prompt => {
    const perception = perceiveRoomMessage(prompt, state);
    const plan = planRoomTurn({ perception, roomState: state });
    assert.equal(perception.asksRollCall, true, prompt);
    assert.equal(plan.intentFamily, 'room-roll-call', prompt);
    assert.deepEqual(plan.responseOrder, ['aisha'], prompt);
    assert.match(plan.steps[0].deterministicText, /Online check|Role call/i, prompt);
    assert.doesNotMatch(plan.steps[0].deterministicText, /Say the thing plainly/i, prompt);
  });
});

test('everyone else calls in quiet members naturally without generic critique copy', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-everyone-else' });
  const perception = perceiveRoomMessage('everyone else?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const turns = plan.steps.map(deterministicTurnFromStep);
  const text = turns.map(turn => turn.content).join('\n');
  assert.equal(perception.asksRollCall, true);
  assert.equal(perception.asksEveryone, false);
  assert.equal(plan.intentFamily, 'room-call-in');
  assert.deepEqual(plan.responseOrder, ['leah', 'claudia', 'grok']);
  assert.ok(turns.length >= 2 && turns.length <= 3);
  turns.forEach(turn => {
    assert.equal(turn.responseIntent, 'room-call-in');
    assert.doesNotMatch(turn.content, /^On that:/i);
    assert.doesNotMatch(turn.content, /\blogo\b/i);
  });
  assert.match(text, /\b(quiet|listening|present|tracking|pattern)\b/i);
  assert.doesNotMatch(text, FORBIDDEN_ARCHITECTURE_RX);
});

test('casual social preference questions route through generic room-social planning', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-social-preference' });
  ['who likes pizza?', 'who here hates meetings?', 'anyone like brutalism?'].forEach(prompt => {
    const perception = perceiveRoomMessage(prompt, state);
    const plan = planRoomTurn({ perception, roomState: state });
    assert.equal(perception.taskType, 'social_preference', prompt);
    assert.equal(plan.intentFamily, 'casual-social', prompt);
    assert.equal(plan.deterministic, false, prompt);
    assert.equal(plan.requiresProvider, true, prompt);
    assert.deepEqual(plan.responseOrder, ['vanya'], prompt);
    assert.equal(plan.steps[0].responseIntent, 'social-read', prompt);
    assert.match(plan.steps[0].fallbackText, /Room read on/i, prompt);
    assert.doesNotMatch(plan.steps[0].fallbackText, /Pizza roll call/i, prompt);
    assert.doesNotMatch(plan.steps[0].fallbackText, FORBIDDEN_ARCHITECTURE_RX, prompt);
  });
});

test('everyone honest opinion produces distinct planned speakers', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-everyone' });
  const perception = perceiveRoomMessage('everyone give me your honest opinion on this logo', state);
  const plan = planRoomTurn({ perception, roomState: state });
  assert.equal(plan.deterministic, true);
  assert.equal(plan.steps.length, 5);
  assert.deepEqual(plan.steps.map(item => item.speakerId), ['aisha', 'leah', 'claudia', 'grok', 'vanya']);
  assert.equal(new Set(plan.steps.map(item => item.deterministicText)).size, 5);
  assert.doesNotMatch(plannedTexts(plan), /^On that:/im);
  assert.doesNotMatch(plannedTexts(plan), FORBIDDEN_ARCHITECTURE_RX);
});

test('direct Leah ignoring question routes to Leah when she is quiet but present', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-leah' });
  const perception = perceiveRoomMessage('Leah, are you ignoring me?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  assert.equal(plan.deterministic, true);
  assert.deepEqual(plan.responseOrder, ['leah']);
  assert.match(plan.steps[0].deterministicText, /quiet, not ignoring/i);
  assert.doesNotMatch(plan.steps[0].deterministicText, FORBIDDEN_ARCHITECTURE_RX);
});

test('normal_help_request_one_speaker', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-planning' });
  const perception = perceiveRoomMessage('help me plan the next campaign', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const text = plannedTexts(plan);
  assert.equal(plan.deterministic, true);
  assert.equal(plan.steps.length, 1);
  assert.deepEqual(plan.responseOrder, ['claudia']);
  assert.match(text, /\b(outcome|audience|deadline|campaign)\b/i);
  assert.doesNotMatch(text, FORBIDDEN_ARCHITECTURE_RX);
});

test('quiet characters do not become active only because they spoke', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-quiet-stays-quiet' });
  const perception = perceiveRoomMessage('everyone else?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const turns = plan.steps.map(deterministicTurnFromStep);
  const next = reduceRoomState({ previous: state, perception, plan, turns, threadId: 'room-test-quiet-stays-quiet' });
  assert.equal(state.knownPresenceStatus.leah, 'quiet');
  assert.equal(next.knownPresenceStatus.leah, 'quiet');
  assert.equal(next.knownPresenceStatus.claudia, 'quiet');
  assert.equal(next.knownPresenceStatus.grok, 'quiet');
});

test('insults produce differentiated reactions and update room tension', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-insult' });
  const perception = perceiveRoomMessage('this room is trash and useless', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = planRoomTurn({ perception, roomState: state, socialImpulses });
  const turns = plan.steps.map(deterministicTurnFromStep);
  const beforeAishaUser = state.characterContinuityV0.relationshipStates[relationshipKey('aisha', 'user')];
  const next = reduceRoomState({ previous: state, perception, plan, turns, socialImpulses, threadId: 'room-test-insult' });
  const afterAishaUser = next.characterContinuityV0.relationshipStates[relationshipKey('aisha', 'user')];
  assert.deepEqual(plan.responseOrder, ['aisha', 'vanya', 'grok']);
  assert.match(turns[0].content, /punching bag/i);
  assert.match(turns[1].content, /frustration is real/i);
  assert.match(turns[2].content, /fault line/i);
  assert.ok(next.recentTension >= 0.6);
  assert.ok(afterAishaUser.irritation > beforeAishaUser.irritation);
  assert.equal(next.characterContinuityV0.continuityEvents.at(-1).type, 'conflict-boundary');
});

test('fact changes create a memory candidate and unresolved confirmation when needed', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-memory' });
  const perception = perceiveRoomMessage('Actually, Leah now owns the social rollout.', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const turns = plan.steps.map(deterministicTurnFromStep);
  const next = reduceRoomState({ previous: state, perception, plan, turns, threadId: 'room-test-memory' });
  assert.equal(plan.steps[0].speakerId, 'claudia');
  assert.equal(plan.steps[0].memoryCandidate.type, 'thread_fact');
  assert.equal(plan.steps[0].memoryCandidate.needsConfirmation, true);
  assert.equal(next.unresolvedQuestions[0].type, 'memory-confirmation');
});

test('Pulse route answers presence from room intelligence without provider calls', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options) => {
      if (String(url).startsWith('http://127.0.0.1:')) return originalFetch(url, options);
      throw new Error('external provider should not be called for deterministic room presence');
    };
    await withStudioServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/studio/pulse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question: 'role call!!!',
          providerConfig: {
            textPrimary: { provider: 'gemini', model: '', apiKey: '' },
            pulseApiKeys: []
          }
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.fallback, false);
      assert.equal(data.deterministic, true);
      assert.equal(data.provider, 'studio-room-intelligence-v0');
      assert.equal(data.providerCallCount, 0);
      assert.equal(data.response.messageEvents[0].speakerId, 'aisha');
      assert.match(data.response.messageEvents[0].text, /Role call|Roll call/i);
      assert.match(data.response.messageEvents[0].text, /Leah Mokoena/i);
      assert.ok(data.roomRuntime.roomIntelligenceV0);
      assert.equal(data.roomRuntime.roomIntelligenceV0.knownPresenceStatus.leah, 'quiet');
    });
  } finally {
    global.fetch = originalFetch;
  }
});
