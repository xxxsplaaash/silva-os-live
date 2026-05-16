const { ACTIVE_CHARACTER_IDS } = require('./characters');
const { selectEligibleImpulse } = require('./impulses');

function planSpark(state = {}, options = {}) {
  const manual = options.manual === true;
  const currentTurn = Number(state.runtime?.turnCounter || 0);
  const candidates = ACTIVE_CHARACTER_IDS.map(id => {
    const character = state.characters?.[id] || {};
    const impulse = selectEligibleImpulse(character.autonomousImpulseQueue, currentTurn);
    const holdingPressure = Number(character.holdingState?.pressureScore || 0);
    return {
      speakerId: id,
      impulse,
      pressure: Math.max(holdingPressure, Number(impulse?.priority || 0))
    };
  }).sort((a, b) => b.pressure - a.pressure);
  const best = candidates[0] || null;
  if (!best || best.pressure < (manual ? 0.42 : 0.6)) {
    return {
      shouldSurface: false,
      quiet: true,
      reason: 'quiet-room',
      speakerId: null,
      impulse: null
    };
  }
  return {
    shouldSurface: true,
    quiet: false,
    reason: best.impulse ? `impulse:${best.impulse.type}` : 'held-pressure',
    speakerId: best.speakerId,
    impulse: best.impulse
  };
}

module.exports = {
  planSpark
};
