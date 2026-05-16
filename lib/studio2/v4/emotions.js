const { getPersonalityProfile } = require('./personality');

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function clampSigned(value, min = -1, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function moodLabelFromEmotion(state = {}) {
  const ranked = [
    ['irritated', state.irritation],
    ['protective', state.protectiveness],
    ['curious', state.curiosity],
    ['warm', state.affection],
    ['guarded', state.guardedness],
    ['tense', state.anger],
    ['steady', state.trust]
  ].sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  return ranked[0]?.[0] || 'steady';
}

function createDefaultEmotionalState(characterId = '') {
  const profile = getPersonalityProfile(characterId);
  const t = profile?.temperament || {};
  return {
    valence: clampSigned((t.baselineWarmth || 0.5) - (t.baselineGuardedness || 0.35)),
    arousal: clamp((t.directness || 0.5) * 0.55),
    dominance: clamp(t.directness || 0.5),
    trust: clamp((t.baselineWarmth || 0.5) * 0.8),
    joy: clamp((t.playfulness || 0.3) * 0.6),
    sadness: 0.08,
    anger: 0.1,
    fear: 0.08,
    curiosity: clamp((profile?.openness || 0.5) * 0.7),
    irritation: clamp((t.sensitivityToInauthenticity || 0.4) * 0.15),
    protectiveness: characterId === 'vanya' ? 0.34 : 0.18,
    affection: clamp((t.baselineWarmth || 0.5) * 0.7),
    guardedness: clamp(t.baselineGuardedness || 0.35),
    expressionPressure: 0.18,
    moodLabel: 'steady',
    emotionalResidue: []
  };
}

const SIGNAL_DELTAS = {
  praise: { joy: 0.12, affection: 0.08, trust: 0.06, valence: 0.08 },
  'soft-dismissal': { irritation: 0.16, guardedness: 0.14, valence: -0.08, expressionPressure: 0.08 },
  'vulnerability-signal': { protectiveness: 0.14, curiosity: 0.1, trust: 0.08, affection: 0.06 },
  'factual-contradiction': { irritation: 0.1, curiosity: 0.12, arousal: 0.08, expressionPressure: 0.1 },
  'boundary-crossed': { anger: 0.18, guardedness: 0.16, protectiveness: 0.14, arousal: 0.12, valence: -0.14 },
  'taste-signal': { curiosity: 0.14, arousal: 0.06, expressionPressure: 0.06 },
  'repair-attempt': { trust: 0.1, affection: 0.06, guardedness: -0.1, irritation: -0.08, valence: 0.08 },
  'commitment-made': { trust: 0.08, curiosity: 0.04, expressionPressure: 0.04 },
  'identity-threat': { guardedness: 0.18, anger: 0.08, expressionPressure: 0.12, valence: -0.14 },
  blame: { irritation: 0.12, guardedness: 0.08, arousal: 0.1, valence: -0.08 },
  'tension-escalation': { arousal: 0.14, anger: 0.1, guardedness: 0.08, expressionPressure: 0.1 }
};

function applySignalsToEmotion(emotion = {}, options = {}) {
  const { characterId = '', signals = [], sourceEventId = '', turn = 0 } = options;
  const next = {
    ...createDefaultEmotionalState(characterId),
    ...(emotion && typeof emotion === 'object' ? emotion : {})
  };
  for (const signal of Array.isArray(signals) ? signals : []) {
    const delta = SIGNAL_DELTAS[signal];
    if (!delta) continue;
    for (const [key, value] of Object.entries(delta)) {
      if (key === 'valence') next.valence = clampSigned((next.valence || 0) + value);
      else next[key] = clamp((next[key] || 0) + value);
    }
    next.emotionalResidue = Array.isArray(next.emotionalResidue) ? next.emotionalResidue.slice(-8) : [];
    next.emotionalResidue.push({
      sourceEventId: sourceEventId || `turn_${turn}`,
      label: signal,
      intensity: clamp((delta.expressionPressure || delta.irritation || delta.curiosity || 0.08) + 0.06),
      decayRate: 0.14,
      createdTurn: turn
    });
  }
  next.moodLabel = moodLabelFromEmotion(next);
  return next;
}

module.exports = {
  clamp,
  clampSigned,
  createDefaultEmotionalState,
  applySignalsToEmotion,
  moodLabelFromEmotion
};
