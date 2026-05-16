const { clamp } = require('./emotions');

function createDefaultImpulseQueue() {
  return [];
}

function updateImpulseQueue(queue = [], options = {}) {
  const {
    characterId = '',
    currentTurn = 0,
    signals = [],
    holding = {},
    emotion = {},
    needs = {}
  } = options;
  const next = Array.isArray(queue) ? queue.slice(-6) : [];
  const pressure = Math.max(
    Number(holding.pressureScore || 0),
    Number(emotion.expressionPressure || 0),
    Number(needs.expressionPressure || 0)
  );
  if (pressure < 0.42) return next;
  const type = signals.includes('boundary-crossed') ? 'boundary'
    : signals.includes('repair-attempt') ? 'repair'
    : signals.includes('factual-contradiction') ? 'correction'
    : signals.includes('open-question-unanswered') ? 'open-question'
    : 'opinion-without-prompt';
  const topicAnchor = String(holding.topicAnchor || '').trim() || String(signals[0] || 'room pressure');
  const id = `${characterId}_${type}_${currentTurn}`;
  if (next.some(item => item.id === id)) return next;
  next.push({
    id,
    speakerId: characterId,
    type,
    topicAnchor,
    eligibleAfterUserTurn: currentTurn,
    expiresAfterUserTurn: currentTurn + 4,
    priority: clamp(pressure + (signals.includes('boundary-crossed') ? 0.18 : 0))
  });
  return next.slice(-8);
}

function selectEligibleImpulse(queue = [], currentTurn = 0) {
  return (Array.isArray(queue) ? queue : [])
    .filter(item => Number(item.eligibleAfterUserTurn || 0) <= currentTurn && Number(item.expiresAfterUserTurn || 0) >= currentTurn)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0] || null;
}

function consumeImpulse(queue = [], impulseId = '') {
  return (Array.isArray(queue) ? queue : []).filter(item => String(item?.id || '') !== String(impulseId || ''));
}

module.exports = {
  createDefaultImpulseQueue,
  updateImpulseQueue,
  selectEligibleImpulse,
  consumeImpulse
};
