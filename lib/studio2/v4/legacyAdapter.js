const { ACTIVE_CHARACTER_IDS, getCharacterDefinition } = require('./characters');
const { createDefaultCognitiveLens, getPersonalityProfile } = require('./personality');
const { createDefaultEmotionalState } = require('./emotions');
const { createDefaultNeedState } = require('./needs');
const { createDefaultInnerLifeState } = require('./innerLife');
const { createDefaultDevelopmentState } = require('./development');
const { createDefaultHoldingState } = require('./holding');
const { createDefaultRhythmState } = require('./rhythm');
const { createDefaultRelationshipState, pairKey } = require('./relationships');
const { createEmptyThreadMemory } = require('./memory');

function createDefaultCharacterLiveState(characterId = '') {
  const def = getCharacterDefinition(characterId) || {};
  const profile = getPersonalityProfile(characterId) || {};
  return {
    peerObservationLog: [],
    salienceMemories: [],
    holdingState: createDefaultHoldingState(characterId),
    autonomousImpulseQueue: [],
    cognitiveLens: {
      ...createDefaultCognitiveLens(characterId),
      noticesFirst: Array.isArray(def.noticesFirst) ? def.noticesFirst.slice() : [],
      interruptionRules: Array.isArray(def.interruptionRules) ? def.interruptionRules.slice() : [],
      role: def.role || ''
    },
    development: createDefaultDevelopmentState(characterId),
    emotion: createDefaultEmotionalState(characterId),
    needs: createDefaultNeedState(characterId),
    innerLife: createDefaultInnerLifeState(),
    mood: 'steady',
    patience: 0.58,
    warmth: profile.temperament?.baselineWarmth || 0.5,
    irritability: 0.12
  };
}

function createDefaultThreadRuntime(seed = {}) {
  const threadMemory = seed.threadMemory && typeof seed.threadMemory === 'object'
    ? { ...createEmptyThreadMemory(), ...seed.threadMemory }
    : createEmptyThreadMemory();
  return {
    schemaVersion: 'studio2.v4',
    turnCounter: Number(seed.turnCounter || 0),
    threadMemory,
    rhythm: seed.rhythm && typeof seed.rhythm === 'object' ? { ...createDefaultRhythmState(), ...seed.rhythm } : createDefaultRhythmState(),
    roomTension: Number(seed.roomTension || 0) || 0,
    speakerCooldowns: seed.speakerCooldowns && typeof seed.speakerCooldowns === 'object' ? { ...seed.speakerCooldowns } : {},
    presence: seed.presence && typeof seed.presence === 'object' ? { ...seed.presence } : {},
    lastDecisionTrace: seed.lastDecisionTrace || null,
    sparkReadiness: seed.sparkReadiness && typeof seed.sparkReadiness === 'object' ? { ...seed.sparkReadiness } : {}
  };
}

function seedStudio2StateFromLegacy({ threadMeta = {}, runtimeOverlay = {}, threadId = '' } = {}) {
  const runtime = createDefaultThreadRuntime({
    threadMemory: threadMeta.threadMemory || {},
    rhythm: runtimeOverlay.personhood?.conversationRhythm || runtimeOverlay.conversationContract?.rhythmState || {},
    roomTension: runtimeOverlay.aiCommsCenter?.roomTone?.length ? 0.22 : 0,
    presence: runtimeOverlay.personhood?.presence || {}
  });
  const characters = {};
  for (const characterId of ACTIVE_CHARACTER_IDS) {
    const liveState = runtimeOverlay.personhood?.liveState?.[characterId] || {};
    const next = createDefaultCharacterLiveState(characterId);
    next.mood = String(liveState.currentMood || next.mood || 'steady');
    next.patience = Number(liveState.patience || next.patience || 0.58);
    next.warmth = Number(liveState.warmth || next.warmth || 0.5);
    next.irritability = Number(liveState.irritation || next.irritability || 0.12);
    characters[characterId] = next;
  }
  const relationships = {};
  for (const characterId of ACTIVE_CHARACTER_IDS) {
    relationships[pairKey(characterId, 'user')] = createDefaultRelationshipState();
  }
  return {
    threadId,
    runtime,
    characters,
    relationships
  };
}

module.exports = {
  createDefaultCharacterLiveState,
  createDefaultThreadRuntime,
  seedStudio2StateFromLegacy
};
