const { clamp } = require('./emotions');

function createDefaultRhythmState() {
  return {
    pace: 'moderate',
    consecutiveShortTurns: 0,
    consecutiveLongTurns: 0,
    lastLongPauseTurn: 0,
    currentBuildMomentum: 0.24,
    totalTurns: 0
  };
}

function updateRhythmState(rhythm = {}, options = {}) {
  const { messageText = '', currentTurn = 0 } = options;
  const next = {
    ...createDefaultRhythmState(),
    ...(rhythm && typeof rhythm === 'object' ? rhythm : {})
  };
  const length = String(messageText || '').trim().split(/\s+/).filter(Boolean).length;
  next.totalTurns = Math.max(Number(next.totalTurns || 0), currentTurn);
  if (length <= 8) {
    next.consecutiveShortTurns += 1;
    next.consecutiveLongTurns = 0;
  } else if (length >= 22) {
    next.consecutiveLongTurns += 1;
    next.consecutiveShortTurns = 0;
  } else {
    next.consecutiveShortTurns = 0;
    next.consecutiveLongTurns = 0;
  }
  next.currentBuildMomentum = clamp((next.currentBuildMomentum || 0.24) + (length >= 12 ? 0.06 : -0.02));
  if (next.consecutiveShortTurns >= 3) next.pace = 'rapid';
  else if (next.consecutiveLongTurns >= 2) next.pace = 'slow';
  else next.pace = 'moderate';
  return next;
}

module.exports = {
  createDefaultRhythmState,
  updateRhythmState
};
