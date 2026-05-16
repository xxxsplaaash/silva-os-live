const { ACTIVE_CHARACTER_IDS, getCharacterDefinition } = require('./characters');
const { detectObservableSignals } = require('./signals');
const { applySignalsToEmotion } = require('./emotions');
const { applySignalsToNeeds } = require('./needs');
const { applySignalsToInnerLife } = require('./innerLife');
const { applySignalsToDevelopment } = require('./development');
const { addSalienceMemory } = require('./memory');
const { applySignalsToRelationship, createDefaultRelationshipState, pairKey } = require('./relationships');
const { updateHoldingState } = require('./holding');
const { updateImpulseQueue } = require('./impulses');

function updatePublicStateFromEmotion(characterState = {}, characterId = '') {
  const def = getCharacterDefinition(characterId) || {};
  const warmthBase = def.id === 'vanya' ? 0.72 : def.id === 'grok' ? 0.24 : 0.48;
  return {
    ...characterState,
    mood: String(characterState.emotion?.moodLabel || 'steady'),
    patience: Math.max(0, Math.min(1, 0.7 - Number(characterState.emotion?.irritation || 0) * 0.4)),
    warmth: Math.max(0, Math.min(1, warmthBase + Number(characterState.emotion?.affection || 0) * 0.2 - Number(characterState.emotion?.guardedness || 0) * 0.18)),
    irritability: Math.max(0, Math.min(1, Number(characterState.emotion?.irritation || 0)))
  };
}

function runObservationPass(state = {}, {
  eventId = '',
  speakerId = '',
  messageText = '',
  currentTurn = 0,
  targetSpeakerId = '',
  history = []
} = {}) {
  const nextState = {
    runtime: state.runtime && typeof state.runtime === 'object' ? { ...state.runtime } : {},
    characters: state.characters && typeof state.characters === 'object' ? { ...state.characters } : {},
    relationships: state.relationships && typeof state.relationships === 'object' ? { ...state.relationships } : {}
  };
  const aggregateSignals = detectObservableSignals(messageText);
  const tensionLift = aggregateSignals.filter(signal => ['boundary-crossed', 'identity-threat', 'factual-contradiction', 'tension-escalation', 'exclusion-move'].includes(signal)).length * 0.08;
  nextState.runtime.roomTension = Math.max(0, Math.min(1, Number(nextState.runtime.roomTension || 0) + tensionLift));

  for (const characterId of ACTIVE_CHARACTER_IDS) {
    if (characterId === speakerId) continue;
    const current = nextState.characters[characterId];
    if (!current) continue;
    const signals = aggregateSignals.slice();
    const targeted = String(targetSpeakerId || '').trim().toLowerCase() === characterId;
    const peerObservationLog = Array.isArray(current.peerObservationLog) ? current.peerObservationLog.slice(-15) : [];
    peerObservationLog.push({
      eventId,
      turn: currentTurn,
      speakerId,
      text: String(messageText || '').trim().slice(0, 180),
      signals
    });
    const emotion = applySignalsToEmotion(current.emotion, {
      characterId,
      signals,
      sourceEventId: eventId,
      turn: currentTurn
    });
    const needs = applySignalsToNeeds(current.needs, {
      characterId,
      signals
    });
    const innerLife = applySignalsToInnerLife(current.innerLife, {
      characterId,
      signals,
      sourceEventId: eventId,
      turn: currentTurn
    });
    const development = applySignalsToDevelopment(current.development, {
      characterId,
      signals,
      sourceEventId: eventId,
      turn: currentTurn,
      question: messageText
    });
    const salienceMemories = addSalienceMemory(current.salienceMemories, {
      sourceEventId: eventId,
      content: String(messageText || '').trim().slice(0, 140),
      emotionalWeight: Math.max(0.34, signals.length * 0.12),
      turn: currentTurn,
      type: speakerId === 'user' ? 'said-by-other' : 'witnessed-conflict'
    });
    const holdingState = updateHoldingState(current.holdingState, {
      characterId,
      currentTurn,
      targeted,
      signals,
      emotion,
      needs,
      question: messageText
    });
    const autonomousImpulseQueue = updateImpulseQueue(current.autonomousImpulseQueue, {
      characterId,
      currentTurn,
      signals,
      holding: holdingState,
      emotion,
      needs
    });
    nextState.characters[characterId] = updatePublicStateFromEmotion({
      ...current,
      peerObservationLog,
      emotion,
      needs,
      innerLife,
      development,
      salienceMemories,
      holdingState,
      autonomousImpulseQueue
    }, characterId);

    const relationKey = pairKey(characterId, speakerId || 'room');
    nextState.relationships[relationKey] = applySignalsToRelationship(
      nextState.relationships[relationKey] || createDefaultRelationshipState(),
      {
        signals,
        note: `${characterId} observed ${speakerId || 'room'}: ${String(messageText || '').trim().slice(0, 96)}`
      }
    );
  }

  return {
    ...nextState,
    aggregateSignals,
    history
  };
}

module.exports = {
  runObservationPass
};
