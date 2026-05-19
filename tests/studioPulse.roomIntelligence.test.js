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
  normalizeExpressiveHabitatState,
  expressiveHabitatContextForAisha,
  safePulseLabel,
  safePulseDisplayLabel,
  roomMoodLabel,
  continuityPayloadForAisha,
  classifyRelationshipMoment,
  relationshipSummariesForAisha,
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
  assert.equal(continuity.expressiveHabitatV0.schemaVersion, 'studio-pulse.expressive-habitat.v0.5');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.vanya.currentPulse, 'Reading');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.aisha.visibleLabel, 'Anchoring');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.vanya.visibleLabel, 'Reading the room');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.claudia.currentPulse, 'Tracking');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.claudia.visibleLabel, 'Tracking next steps');
  assert.equal(continuity.expressiveHabitatV0.roomMood, 'neutral');
});

test('expressive habitat normalizes safe pulse labels and hides raw internals from context', () => {
  const continuity = normalizeCharacterContinuityState({
    expressiveHabitatV0: {
      roomMood: 'tense',
      aishaAuthorityState: 'takeover',
      characterPulses: {
        leah: { visibleLabel: 'Holding critique', pulseReason: 'internal taste pressure', expiresAfterTurns: 2 },
        grok: { visibleLabel: 'trust: 0.58', pulseReason: 'debug number' }
      },
      specialistGravity: {
        grok: { value: 99, topicAnchor: 'provider timeout', lastSignal: 'provider failed' }
      }
    }
  });
  assert.equal(safePulseLabel('Holding critique'), 'Holding critique');
  assert.equal(safePulseLabel('Tracking failure'), 'Tracking');
  assert.equal(safePulseDisplayLabel('Tracking failure'), 'Tracking failure');
  assert.equal(safePulseLabel('trust: 0.58'), 'Watching');
  assert.equal(roomMoodLabel('cooling'), 'Cooling');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.leah.visibleLabel, 'Holding critique');
  assert.equal(continuity.expressiveHabitatV0.characterPulses.grok.visibleLabel, 'Watching');
  assert.equal(continuity.expressiveHabitatV0.specialistGravity.grok.value, 3);

  const context = expressiveHabitatContextForAisha(continuity, {
    plannedSpeakerId: 'grok',
    plan: { intentFamily: 'technical-diagnosis' }
  });
  assert.equal(context.schemaVersion, 'studio-pulse.expressive-habitat.v0.5');
  assert.equal(context.plannedSpeakerId, 'grok');
  assert.equal(context.roomMood, 'Tense');
  assert.equal(context.sideCommentAllowed, false);
  assert.equal(context.characterPulseSummary.length, 5);
  assert.equal(context.specialistGravitySummary.length <= 3, true);
  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /\b(pulseReason|expiresAfterTurns|repairNeeded|trust|warmth|irritation|relationshipStates|value":|gravity":)\b/i);
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
  assert.equal(state.relationshipStates[relationshipKey('leah', 'user')].repairNeeded >= 0, true);
  assert.equal(state.relationshipStates[relationshipKey('leah', 'user')].repairNeeded <= 1, true);
  assert.equal(state.relationshipStates[relationshipKey('grok', 'user')].skepticism >= 0, true);
  assert.equal(state.relationshipStates[relationshipKey('grok', 'user')].skepticism <= 1, true);
  assert.equal(state.relationshipStates[relationshipKey('claudia', 'user')].collaboration >= 0, true);
  assert.equal(state.relationshipStates[relationshipKey('claudia', 'user')].collaboration <= 1, true);
  assert.equal(state.relationshipStates[relationshipKey('vanya', 'user')].recentPressure >= 0, true);
  assert.equal(state.relationshipStates[relationshipKey('vanya', 'user')].recentPressure <= 1, true);
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
  assert.deepEqual(plan.responseOrder, ['grok', 'claudia']);
  assert.equal(plan.exchangeMode, 'solo-plus-addendum');
  assert.equal(plan.addendumSpeakerId, 'claudia');
  assert.equal(plan.steps[0].exchangeRole, 'primary');
  assert.equal(plan.steps[1].exchangeRole, 'addendum');
  assert.equal(next.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-pattern');
  assert.match(next.characterContinuityV0.characterMemories.grok.projectAttachments.at(-1), /failed again/i);
  assert.ok(next.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')].skepticism > state.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')].skepticism);
  assert.ok(next.characterContinuityV0.relationshipStates[relationshipKey('claudia', 'user')].collaboration > state.characterContinuityV0.relationshipStates[relationshipKey('claudia', 'user')].collaboration);
});

test('expressive pulses can change without forcing speech', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-expressive-no-speech' });
  const perception = perceiveRoomMessage('the provider failed again with the same timeout', state);
  const socialImpulses = calculateSocialImpulses({ perception, roomState: state });
  const plan = { intentFamily: 'ambient-signal', deterministic: true, requiresProvider: false, responseOrder: [], steps: [], socialImpulses };
  const next = reduceRoomState({ previous: state, perception, plan, turns: [], socialImpulses, threadId: 'room-test-expressive-no-speech' });
  const habitat = next.characterContinuityV0.expressiveHabitatV0;
  assert.equal(habitat.roomMood, 'elevated');
  assert.equal(habitat.characterPulses.grok.visibleLabel, 'Tracking failure');
  assert.equal(habitat.characterPulses.claudia.visibleLabel, 'Tracking next steps');
  assert.equal(habitat.expressionLevel >= 3, true);
  assert.deepEqual(plan.responseOrder, []);
});

test('expressive pulse expiry, gravity cap, decay, and reset stay bounded', () => {
  let state = createRoomIntelligenceContext({ threadId: 'room-test-expressive-gravity' });
  state.characterContinuityV0 = normalizeCharacterContinuityState({
    ...state.characterContinuityV0,
    expressiveHabitatV0: {
      ...state.characterContinuityV0.expressiveHabitatV0,
      characterPulses: {
        ...state.characterContinuityV0.expressiveHabitatV0.characterPulses,
        leah: { visibleLabel: 'Holding critique', currentPulse: 'Holding critique', expiresAfterTurns: 1 }
      }
    }
  });
  const neutral = perceiveRoomMessage('hi team', state);
  state = reduceRoomState({
    previous: state,
    perception: neutral,
    plan: { intentFamily: 'ambient', steps: [], responseOrder: [] },
    turns: [],
    socialImpulses: [],
    threadId: 'room-test-expressive-gravity'
  });
  assert.equal(state.characterContinuityV0.expressiveHabitatV0.characterPulses.leah.visibleLabel, 'Watching');

  const leahProgression = [];
  for (const text of [
    'the creative direction is bland',
    'the brand copy is still bland',
    'the visual taste is collapsing'
  ]) {
    const perception = perceiveRoomMessage(text, state);
    state = reduceRoomState({
      previous: state,
      perception,
      plan: { intentFamily: 'ambient-creative', steps: [], responseOrder: [] },
      turns: [],
      socialImpulses: [],
      threadId: 'room-test-expressive-gravity'
    });
    leahProgression.push({
      value: state.characterContinuityV0.expressiveHabitatV0.specialistGravity.leah.value,
      pulse: state.characterContinuityV0.expressiveHabitatV0.characterPulses.leah.visibleLabel
    });
  }
  let habitat = state.characterContinuityV0.expressiveHabitatV0;
  assert.deepEqual(leahProgression, [
    { value: 1, pulse: 'Holding critique' },
    { value: 2, pulse: 'Ready' },
    { value: 3, pulse: 'Ready' }
  ]);
  assert.equal(habitat.specialistGravity.leah.value <= 3, true);
  assert.equal(habitat.characterPulses.leah.visibleLabel, 'Ready');

  const shifted = perceiveRoomMessage('the budget handoff is a different topic', state);
  state = reduceRoomState({
    previous: state,
    perception: shifted,
    plan: { intentFamily: 'ambient-shift', steps: [], responseOrder: [] },
    turns: [],
    socialImpulses: [],
    threadId: 'room-test-expressive-gravity'
  });
  assert.ok(state.characterContinuityV0.expressiveHabitatV0.specialistGravity.leah.value < habitat.specialistGravity.leah.value);

  const critique = perceiveRoomMessage('Leah, be honest, is this tasteful?', state);
  const impulses = calculateSocialImpulses({ perception: critique, roomState: state });
  const plan = planRoomTurn({ perception: critique, roomState: state, socialImpulses: impulses });
  const turns = plan.steps.map(step => fallbackTurnFromStep(step, critique));
  state = reduceRoomState({ previous: state, perception: critique, plan, turns, socialImpulses: impulses, threadId: 'room-test-expressive-gravity' });
  assert.equal(plan.responseOrder[0], 'leah');
  assert.equal(state.characterContinuityV0.expressiveHabitatV0.specialistGravity.leah.value, 0);
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

test('relationship dynamics handle friction, repair, support, and repeated failure with bounded deltas', () => {
  const frictionState = createRoomIntelligenceContext({ threadId: 'room-test-relationship-friction' });
  const frictionPerception = perceiveRoomMessage('Grok, that was useless.', frictionState);
  const frictionImpulses = calculateSocialImpulses({ perception: frictionPerception, roomState: frictionState });
  const frictionPlan = planRoomTurn({ perception: frictionPerception, roomState: frictionState, socialImpulses: frictionImpulses });
  const frictionTurns = frictionPlan.steps.map(step => fallbackTurnFromStep(step, frictionPerception));
  const beforeGrok = frictionState.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')];
  const afterFrictionState = reduceRoomState({ previous: frictionState, perception: frictionPerception, plan: frictionPlan, turns: frictionTurns, socialImpulses: frictionImpulses, threadId: 'room-test-relationship-friction' });
  const afterFrictionGrok = afterFrictionState.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')];
  assert.equal(classifyRelationshipMoment({ perception: frictionPerception, plan: frictionPlan, turns: frictionTurns }).type, 'dismissal');
  assert.equal(afterFrictionState.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-friction');
  assert.ok(afterFrictionGrok.irritation > beforeGrok.irritation);
  assert.ok(afterFrictionGrok.repairNeeded > beforeGrok.repairNeeded);
  assert.ok(afterFrictionGrok.recentPressure > beforeGrok.recentPressure);
  assert.ok(afterFrictionState.characterContinuityV0.roomSocialState.tension > frictionState.characterContinuityV0.roomSocialState.tension);

  const repairPerception = perceiveRoomMessage('Fair, sorry Grok, that was harsh. The issue is the provider keeps timing out.', afterFrictionState);
  const repairImpulses = calculateSocialImpulses({ perception: repairPerception, roomState: afterFrictionState });
  const repairPlan = planRoomTurn({ perception: repairPerception, roomState: afterFrictionState, socialImpulses: repairImpulses });
  const repairTurns = repairPlan.steps.map(step => fallbackTurnFromStep(step, repairPerception));
  const afterRepairState = reduceRoomState({ previous: afterFrictionState, perception: repairPerception, plan: repairPlan, turns: repairTurns, socialImpulses: repairImpulses, threadId: 'room-test-relationship-friction' });
  const afterRepairGrok = afterRepairState.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')];
  assert.equal(afterRepairState.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-repair');
  assert.ok(afterRepairGrok.irritation < afterFrictionGrok.irritation);
  assert.ok(afterRepairGrok.repairNeeded < afterFrictionGrok.repairNeeded);
  assert.ok(afterRepairGrok.trust > afterFrictionGrok.trust);
  assert.ok(afterRepairGrok.warmth > afterFrictionGrok.warmth);
  assert.ok(afterRepairGrok.skepticism >= afterFrictionGrok.skepticism);
  assert.equal(afterRepairGrok.lastShiftReason, 'specific-repair');

  const supportState = createRoomIntelligenceContext({ threadId: 'room-test-relationship-support' });
  const supportPerception = perceiveRoomMessage('Leah is right, the bland version has no taste.', supportState);
  const supportImpulses = calculateSocialImpulses({ perception: supportPerception, roomState: supportState });
  const supportPlan = planRoomTurn({ perception: supportPerception, roomState: supportState, socialImpulses: supportImpulses });
  const supportTurns = supportPlan.steps.map(step => fallbackTurnFromStep(step, supportPerception));
  const beforeLeah = supportState.characterContinuityV0.relationshipStates[relationshipKey('leah', 'user')];
  const afterSupportState = reduceRoomState({ previous: supportState, perception: supportPerception, plan: supportPlan, turns: supportTurns, socialImpulses: supportImpulses, threadId: 'room-test-relationship-support' });
  const afterLeah = afterSupportState.characterContinuityV0.relationshipStates[relationshipKey('leah', 'user')];
  assert.equal(afterSupportState.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-supported');
  assert.deepEqual(supportPlan.responseOrder, ['leah']);
  assert.ok(afterLeah.respect > beforeLeah.respect);
  assert.ok(afterLeah.trust > beforeLeah.trust);
  assert.ok(supportPlan.steps.length < 5);

  const failureState = createRoomIntelligenceContext({ threadId: 'room-test-relationship-pattern' });
  const failurePerception = perceiveRoomMessage('The provider failed again with the same timeout.', failureState);
  const failureImpulses = calculateSocialImpulses({ perception: failurePerception, roomState: failureState });
  const failurePlan = planRoomTurn({ perception: failurePerception, roomState: failureState, socialImpulses: failureImpulses });
  const failureTurns = failurePlan.steps.map(step => fallbackTurnFromStep(step, failurePerception));
  const beforeFailureGrok = failureState.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')];
  const beforeFailureClaudia = failureState.characterContinuityV0.relationshipStates[relationshipKey('claudia', 'user')];
  const afterFailureState = reduceRoomState({ previous: failureState, perception: failurePerception, plan: failurePlan, turns: failureTurns, socialImpulses: failureImpulses, threadId: 'room-test-relationship-pattern' });
  const afterFailureGrok = afterFailureState.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')];
  const afterFailureClaudia = afterFailureState.characterContinuityV0.relationshipStates[relationshipKey('claudia', 'user')];
  assert.equal(afterFailureState.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-pattern');
  assert.ok(afterFailureGrok.skepticism > beforeFailureGrok.skepticism);
  assert.ok(afterFailureClaudia.collaboration > beforeFailureClaudia.collaboration);
  assert.equal(afterFailureGrok.trust, beforeFailureGrok.trust);
  assert.equal(afterFailureGrok.warmth, beforeFailureGrok.warmth);
});

test('relationship pressure influences impulses without overriding direct address or activating everyone', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-relationship-pressure' });
  state.characterContinuityV0 = normalizeCharacterContinuityState({
    ...state.characterContinuityV0,
    relationshipStates: {
      ...state.characterContinuityV0.relationshipStates,
      [relationshipKey('grok', 'user')]: {
        ...state.characterContinuityV0.relationshipStates[relationshipKey('grok', 'user')],
        skepticism: 0.88,
        recentPressure: 0.48
      },
      [relationshipKey('leah', 'user')]: {
        ...state.characterContinuityV0.relationshipStates[relationshipKey('leah', 'user')],
        repairNeeded: 0.72,
        irritation: 0.5
      }
    }
  });

  const failurePerception = perceiveRoomMessage('the provider failed again with the same timeout', state);
  const failureImpulses = calculateSocialImpulses({ perception: failurePerception, roomState: state });
  const grokImpulse = failureImpulses.find(impulse => impulse.characterId === 'grok');
  assert.equal(grokImpulse.impulseType, 'speak');
  assert.ok(grokImpulse.intensity > 0.94);
  assert.match(grokImpulse.reason, /skepticism|repeated-failure/i);

  const directPerception = perceiveRoomMessage('Claudia, what is the next step?', state);
  const directImpulses = calculateSocialImpulses({ perception: directPerception, roomState: state });
  const directPlan = planRoomTurn({ perception: directPerception, roomState: state, socialImpulses: directImpulses });
  assert.deepEqual(directPlan.responseOrder, ['claudia']);
  assert.equal(directPlan.steps.length, 1);
});

test('direct-address conflict wins while Aisha takeover stays rare and cooled down', () => {
  const directState = createRoomIntelligenceContext({ threadId: 'room-test-direct-conflict-wins' });
  const directPerception = perceiveRoomMessage('Grok, that was useless.', directState);
  const directImpulses = calculateSocialImpulses({ perception: directPerception, roomState: directState });
  const directPlan = planRoomTurn({ perception: directPerception, roomState: directState, socialImpulses: directImpulses });
  assert.equal(directPlan.intentFamily, 'direct-conflict');
  assert.deepEqual(directPlan.responseOrder, ['grok']);
  assert.match(directPlan.steps[0].deterministicText, /What broke/i);

  const driftState = createRoomIntelligenceContext({ threadId: 'room-test-aisha-takeover' });
  const driftPerception = perceiveRoomMessage('we are drifting and losing the thread', driftState);
  const driftImpulses = calculateSocialImpulses({ perception: driftPerception, roomState: driftState });
  const driftPlan = planRoomTurn({ perception: driftPerception, roomState: driftState, socialImpulses: driftImpulses });
  assert.notEqual(driftPlan.intentFamily, 'aisha-takeover');
  const stagedTurns = driftPlan.steps.map(step => fallbackTurnFromStep(step, driftPerception));
  const afterStaging = reduceRoomState({ previous: driftState, perception: driftPerception, plan: driftPlan, turns: stagedTurns, socialImpulses: driftImpulses, threadId: 'room-test-aisha-takeover' });
  assert.equal(afterStaging.characterContinuityV0.expressiveHabitatV0.aishaAuthorityState, 'ready');
  assert.equal(afterStaging.characterContinuityV0.expressiveHabitatV0.characterPulses.aisha.visibleLabel, 'Ready');

  const readyImpulses = calculateSocialImpulses({ perception: driftPerception, roomState: afterStaging });
  const readyPlan = planRoomTurn({ perception: driftPerception, roomState: afterStaging, socialImpulses: readyImpulses });
  assert.equal(readyPlan.intentFamily, 'aisha-takeover');
  assert.deepEqual(readyPlan.responseOrder, ['aisha']);
  assert.doesNotMatch(readyPlan.steps[0].deterministicText, /let me step in/i);
  const turns = readyPlan.steps.map(step => fallbackTurnFromStep(step, driftPerception));
  const afterTakeover = reduceRoomState({ previous: afterStaging, perception: driftPerception, plan: readyPlan, turns, socialImpulses: readyImpulses, threadId: 'room-test-aisha-takeover' });
  assert.equal(afterTakeover.characterContinuityV0.expressiveHabitatV0.aishaAuthorityState, 'anchoring');
  assert.ok(afterTakeover.characterContinuityV0.expressiveHabitatV0.aishaCooldownTurns > 0);

  const repeatImpulses = calculateSocialImpulses({ perception: driftPerception, roomState: afterTakeover });
  const repeatPlan = planRoomTurn({ perception: driftPerception, roomState: afterTakeover, socialImpulses: repeatImpulses });
  assert.notEqual(repeatPlan.intentFamily, 'aisha-takeover');
});

test('expressive room mood tracks tension, cooling, stress, and repeated failure', () => {
  const frictionState = createRoomIntelligenceContext({ threadId: 'room-test-expressive-mood' });
  const frictionPerception = perceiveRoomMessage('Grok, that was useless.', frictionState);
  const frictionImpulses = calculateSocialImpulses({ perception: frictionPerception, roomState: frictionState });
  const frictionPlan = planRoomTurn({ perception: frictionPerception, roomState: frictionState, socialImpulses: frictionImpulses });
  const afterFriction = reduceRoomState({
    previous: frictionState,
    perception: frictionPerception,
    plan: frictionPlan,
    turns: frictionPlan.steps.map(step => fallbackTurnFromStep(step, frictionPerception)),
    socialImpulses: frictionImpulses,
    threadId: 'room-test-expressive-mood'
  });
  assert.equal(afterFriction.characterContinuityV0.expressiveHabitatV0.roomMood, 'tense');
  assert.equal(afterFriction.characterContinuityV0.expressiveHabitatV0.characterPulses.vanya.visibleLabel, 'Protective');

  const repairPerception = perceiveRoomMessage('Fair, sorry Grok. The provider keeps timing out.', afterFriction);
  const repairImpulses = calculateSocialImpulses({ perception: repairPerception, roomState: afterFriction });
  const repairPlan = planRoomTurn({ perception: repairPerception, roomState: afterFriction, socialImpulses: repairImpulses });
  const afterRepair = reduceRoomState({
    previous: afterFriction,
    perception: repairPerception,
    plan: repairPlan,
    turns: repairPlan.steps.map(step => fallbackTurnFromStep(step, repairPerception)),
    socialImpulses: repairImpulses,
    threadId: 'room-test-expressive-mood'
  });
  assert.equal(afterRepair.characterContinuityV0.expressiveHabitatV0.roomMood, 'cooling');
  assert.equal(afterRepair.characterContinuityV0.expressiveHabitatV0.characterPulses.grok.visibleLabel, 'Tracking failure');
  assert.equal(afterRepair.characterContinuityV0.expressiveHabitatV0.characterPulses.claudia.visibleLabel, 'Tracking next steps');

  const stressState = createRoomIntelligenceContext({ threadId: 'room-test-expressive-stress' });
  const stressPerception = perceiveRoomMessage("I'm stressed and need a human read.", stressState);
  const stressImpulses = calculateSocialImpulses({ perception: stressPerception, roomState: stressState });
  const stressPlan = planRoomTurn({ perception: stressPerception, roomState: stressState, socialImpulses: stressImpulses });
  const afterStress = reduceRoomState({
    previous: stressState,
    perception: stressPerception,
    plan: stressPlan,
    turns: stressPlan.steps.map(step => fallbackTurnFromStep(step, stressPerception)),
    socialImpulses: stressImpulses,
    threadId: 'room-test-expressive-stress'
  });
  assert.equal(afterStress.characterContinuityV0.expressiveHabitatV0.roomMood, 'warm');
  assert.equal(afterStress.characterContinuityV0.expressiveHabitatV0.characterPulses.aisha.visibleLabel, 'Protective');
});

test('relationship summaries for A.I.S.H.A are concise, bounded, and not a raw numeric matrix', () => {
  const state = normalizeCharacterContinuityState({
    threadId: 'room-test-relationship-summaries',
    relationshipStates: {
      [relationshipKey('grok', 'user')]: {
        fromCharacterId: 'grok',
        toEntityId: 'user',
        irritation: 0.42,
        repairNeeded: 0.52,
        skepticism: 0.7,
        recentPressure: 0.62
      },
      [relationshipKey('vanya', 'user')]: {
        fromCharacterId: 'vanya',
        toEntityId: 'user',
        warmth: 0.82,
        protectiveness: 0.6
      }
    }
  });
  const summaries = relationshipSummariesForAisha(state, { plannedSpeakerId: 'grok' });
  assert.ok(summaries.length >= 1);
  assert.ok(summaries.length <= MEMORY_CAPS.relationshipSummariesForAisha);
  assert.equal(summaries[0].characterId, 'grok');
  summaries.forEach(item => {
    assert.equal(item.summary.length <= 160, true);
    assert.doesNotMatch(item.summary, /\b0\.\d+\b/);
    assert.ok(Array.isArray(item.pressureLabels));
    assert.ok(item.pressureLabels.length <= 4);
  });
  const payload = continuityPayloadForAisha(state, [], { plannedSpeakerId: 'grok' });
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'relationshipStates'), false);
  assert.equal(payload.relationshipSummaries.length <= MEMORY_CAPS.relationshipSummariesForAisha, true);
  assert.doesNotMatch(JSON.stringify(payload.relationshipSummaries), /\b0\.\d+\b/);
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
  assert.equal(Array.isArray(payload.relationshipSummaries), true);
  assert.equal(payload.relationshipSummaries.length <= MEMORY_CAPS.relationshipSummariesForAisha, true);
  assert.equal(Object.prototype.hasOwnProperty.call(payload, 'relationshipStates'), false);
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

test('explicit Open Floor stays bounded and does not replace ordinary everyone routing', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-open-floor' });
  const perception = perceiveRoomMessage('open floor: what do you all think about brutalism?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const nonCloseSteps = plan.steps.filter(step => step.exchangeRole !== 'command-close');
  assert.equal(perception.asksOpenFloor, true);
  assert.equal(perception.asksEveryone, false);
  assert.equal(plan.intentFamily, 'open-floor');
  assert.equal(plan.exchangeMode, 'open-floor');
  assert.ok(nonCloseSteps.length <= 3);
  assert.ok(plan.steps.length <= 4);
  assert.ok(plan.responseOrder.includes('vanya'));
  assert.equal(plan.commandCloseSpeakerId, 'aisha');
  assert.ok(plan.steps.some(step => step.exchangeRole === 'command-close'));
  assert.notDeepEqual(plan.responseOrder, ['aisha', 'leah', 'claudia', 'grok', 'vanya']);

  const teamWeighIn = perceiveRoomMessage('team, weigh in on this campaign direction', state);
  const teamWeighInPlan = planRoomTurn({ perception: teamWeighIn, roomState: state });
  assert.equal(teamWeighIn.asksOpenFloor, true);
  assert.equal(teamWeighIn.asksEveryone, false);
  assert.equal(teamWeighInPlan.intentFamily, 'open-floor');
  assert.equal(teamWeighInPlan.exchangeMode, 'open-floor');
  assert.ok(teamWeighInPlan.steps.filter(step => step.exchangeRole !== 'command-close').length <= 3);

  const everyone = perceiveRoomMessage('everyone give me your honest opinion on this logo', state);
  const everyonePlan = planRoomTurn({ perception: everyone, roomState: state });
  assert.equal(everyone.asksOpenFloor, false);
  assert.equal(everyone.asksEveryone, true);
  assert.equal(everyonePlan.intentFamily, 'group-honest-opinion');
});

test('direct address wins over Open Floor language', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-open-floor-direct' });
  const perception = perceiveRoomMessage('Leah, open floor on this design direction', state);
  const plan = planRoomTurn({ perception, roomState: state });
  assert.equal(perception.asksOpenFloor, true);
  assert.deepEqual(perception.requestedCharacterIds, ['leah']);
  assert.notEqual(plan.intentFamily, 'open-floor');
  assert.deepEqual(plan.responseOrder, ['leah']);
  assert.equal(plan.exchangeMode, 'solo');
});

test('addendum and Aisha close cooldowns suppress repeat side entries', () => {
  let state = createRoomIntelligenceContext({ threadId: 'room-test-exchange-cooldown' });
  const failure = perceiveRoomMessage('the provider failed again with the same timeout', state);
  let impulses = calculateSocialImpulses({ perception: failure, roomState: state });
  let plan = planRoomTurn({ perception: failure, roomState: state, socialImpulses: impulses });
  assert.equal(plan.exchangeMode, 'solo-plus-addendum');
  assert.equal(plan.addendumSpeakerId, 'claudia');
  state = reduceRoomState({
    previous: state,
    perception: failure,
    plan,
    turns: plan.steps.map(step => fallbackTurnFromStep(step, failure)),
    socialImpulses: impulses,
    threadId: 'room-test-exchange-cooldown'
  });
  assert.equal(state.characterContinuityV0.exchangeStateV06.addendumCooldownTurns, 1);

  impulses = calculateSocialImpulses({ perception: failure, roomState: state });
  plan = planRoomTurn({ perception: failure, roomState: state, socialImpulses: impulses });
  assert.equal(plan.exchangeMode, 'solo');
  assert.deepEqual(plan.responseOrder, ['grok']);

  const open = perceiveRoomMessage('hear from the room on the provider timeout', state);
  let openPlan = planRoomTurn({ perception: open, roomState: state });
  assert.equal(openPlan.exchangeMode, 'open-floor');
  assert.ok(openPlan.steps.some(step => step.exchangeRole === 'command-close'));
  state = reduceRoomState({
    previous: state,
    perception: open,
    plan: openPlan,
    turns: openPlan.steps.map(step => fallbackTurnFromStep(step, open)),
    socialImpulses: [],
    threadId: 'room-test-exchange-cooldown'
  });
  assert.ok(state.characterContinuityV0.exchangeStateV06.aishaCloseCooldownTurns > 0);
  openPlan = planRoomTurn({ perception: open, roomState: state });
  assert.equal(openPlan.steps.some(step => step.exchangeRole === 'command-close'), false);
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

test('provider-unavailable direct fallback stays anchored to the user problem', () => {
  const state = createRoomIntelligenceContext({ threadId: 'room-test-direct-fallback' });
  const perception = perceiveRoomMessage('Grok, why does this keep falling apart after five messages?', state);
  const plan = planRoomTurn({ perception, roomState: state });
  const turn = fallbackTurnFromStep(plan.steps[0], perception, { providerMode: 'provider-unavailable-fallback' });
  assert.equal(plan.intentFamily, 'direct-answer');
  assert.equal(turn.speakerId, 'grok');
  assert.doesNotMatch(turn.content, /I need the object|Give me the thing|Say the thing plainly/i);
  assert.match(turn.content, /falling apart after five messages|exact turn|response events|patch that seam/i);
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
  assert.equal(next.characterContinuityV0.continuityEvents.at(-1).type, 'relationship-friction');
  assert.ok(afterAishaUser.repairNeeded > beforeAishaUser.repairNeeded);
  assert.ok(afterAishaUser.recentPressure > beforeAishaUser.recentPressure);
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
