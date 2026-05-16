const { clamp } = require('./emotions');

function createDefaultHoldingState(characterId = '') {
  return {
    speakerId: characterId,
    isHolding: false,
    heldSinceUserTurn: 0,
    pressureScore: 0,
    releaseCondition: 'next-gap',
    topicAnchor: null
  };
}

function updateHoldingState(holding = {}, options = {}) {
  const {
    characterId = '',
    currentTurn = 0,
    targeted = false,
    signals = [],
    emotion = {},
    needs = {},
    question = ''
  } = options;
  const next = {
    ...createDefaultHoldingState(characterId),
    ...(holding && typeof holding === 'object' ? holding : {})
  };
  const signalPressure = (Array.isArray(signals) ? signals.length : 0) * 0.1;
  const emotionPressure = Number(emotion.expressionPressure || 0) * 0.4;
  const needPressure = Number(needs.expressionPressure || 0) * 0.4;
  const targetPressure = targeted ? 0.28 : 0;
  next.pressureScore = clamp(Math.max(next.pressureScore || 0, signalPressure + emotionPressure + needPressure + targetPressure));
  if (next.pressureScore >= 0.34) {
    next.isHolding = true;
    next.heldSinceUserTurn = next.heldSinceUserTurn || currentTurn;
    next.topicAnchor = String(question || '').trim().slice(0, 120) || next.topicAnchor || null;
    if (targeted) next.releaseCondition = 'direct-address';
    else if (signals.includes('factual-contradiction')) next.releaseCondition = 'someone-else-says-it-wrong';
    else if (signals.includes('boundary-crossed') || signals.includes('identity-threat')) next.releaseCondition = 'identity-pressure';
    else next.releaseCondition = 'next-gap';
  }
  return next;
}

function clearHoldingAfterSpeak(holding = {}, currentTurn = 0) {
  return {
    ...holding,
    isHolding: false,
    pressureScore: 0.08,
    heldSinceUserTurn: currentTurn,
    releaseCondition: 'next-gap'
  };
}

module.exports = {
  createDefaultHoldingState,
  updateHoldingState,
  clearHoldingAfterSpeak
};
