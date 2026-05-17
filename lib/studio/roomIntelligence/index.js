const { CHARACTER_IDS, CHARACTER_PROFILES } = require('./characters');
const { createRoomIntelligenceState } = require('./state');
const { perceiveRoomMessage } = require('./perception');
const { planRoomTurn } = require('./planner');
const { reduceRoomState } = require('./reducer');
const {
  buildRoomCharacterPrompt,
  parseRoomCharacterOutput,
  validateRoomCharacterTurn,
  fallbackTurnFromStep,
  hasForbiddenArchitecturePhrases,
  deterministicTurnFromStep,
  buildRoomStudioResponse
} = require('./adapter');
const {
  normalizeCharacterContinuityState,
  calculateSocialImpulses,
  reduceCharacterContinuityState,
  continuityPayloadForAisha,
  relationshipKey
} = require('./continuity');
const {
  dialogueQualityPayloadFor,
  voicePressureProfileFor,
  assistantFillerReason,
  literalConsciousnessReason
} = require('./dialogueQuality');

function previousRoomIntelligenceState(system = {}) {
  const metaState = system.currentThread?.meta?.roomRuntimeState?.roomIntelligenceV0;
  if (metaState && typeof metaState === 'object') return metaState;
  const runtimeState = system.roomRuntimeState?.roomIntelligenceV0;
  if (runtimeState && typeof runtimeState === 'object') return runtimeState;
  return null;
}

function createRoomIntelligenceContext({
  system = {},
  threadId = '',
  messages = []
} = {}) {
  return createRoomIntelligenceState({
    threadId,
    previous: previousRoomIntelligenceState(system),
    messages
  });
}

module.exports = {
  CHARACTER_IDS,
  CHARACTER_PROFILES,
  createRoomIntelligenceContext,
  previousRoomIntelligenceState,
  perceiveRoomMessage,
  planRoomTurn,
  reduceRoomState,
  buildRoomCharacterPrompt,
  parseRoomCharacterOutput,
  validateRoomCharacterTurn,
  fallbackTurnFromStep,
  hasForbiddenArchitecturePhrases,
  deterministicTurnFromStep,
  buildRoomStudioResponse,
  normalizeCharacterContinuityState,
  calculateSocialImpulses,
  reduceCharacterContinuityState,
  continuityPayloadForAisha,
  relationshipKey,
  dialogueQualityPayloadFor,
  voicePressureProfileFor,
  assistantFillerReason,
  literalConsciousnessReason
};
