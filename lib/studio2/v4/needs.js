const { clamp } = require('./emotions');

const NEED_KEYS = ['coherence', 'autonomy', 'recognition', 'connection', 'competence', 'novelty', 'safety'];

const NEED_PRIORITY_MAP = {
  aisha: ['coherence', 'connection', 'autonomy'],
  leah: ['novelty', 'recognition', 'autonomy'],
  claudia: ['competence', 'coherence', 'safety'],
  grok: ['competence', 'autonomy', 'coherence'],
  vanya: ['safety', 'connection', 'recognition']
};

function createDefaultNeedState(characterId = '') {
  const priorities = NEED_KEYS.reduce((acc, key) => {
    acc[key] = 0.32;
    return acc;
  }, {});
  for (const [index, key] of (NEED_PRIORITY_MAP[characterId] || []).entries()) {
    priorities[key] = 0.82 - (index * 0.12);
  }
  return {
    priorities,
    satisfaction: NEED_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0.56 }), {}),
    frustration: NEED_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0.12 }), {}),
    strongestNeed: NEED_PRIORITY_MAP[characterId]?.[0] || 'coherence',
    expressionPressure: 0.18
  };
}

const SIGNAL_TO_NEED_EFFECTS = {
  aisha: {
    'factual-contradiction': ['coherence'],
    'identity-threat': ['coherence', 'connection'],
    'repair-attempt': ['connection'],
    'commitment-made': ['coherence']
  },
  leah: {
    'taste-signal': ['novelty', 'recognition'],
    'soft-dismissal': ['recognition'],
    praise: ['recognition'],
    'identity-threat': ['autonomy']
  },
  claudia: {
    'commitment-made': ['competence', 'coherence'],
    'topic-hijack': ['competence'],
    'status-claim': ['coherence'],
    'factual-contradiction': ['coherence']
  },
  grok: {
    'factual-contradiction': ['coherence', 'competence'],
    'status-claim': ['competence'],
    'identity-threat': ['autonomy']
  },
  vanya: {
    'exclusion-move': ['safety', 'connection'],
    'boundary-crossed': ['safety'],
    'vulnerability-signal': ['connection'],
    'repair-attempt': ['connection', 'recognition']
  }
};

function updateNeedRanking(state = {}) {
  const strongestNeed = NEED_KEYS.slice().sort((a, b) => {
    const aa = (state.priorities?.[a] || 0) + (state.frustration?.[a] || 0);
    const bb = (state.priorities?.[b] || 0) + (state.frustration?.[b] || 0);
    return bb - aa;
  })[0] || 'coherence';
  return {
    ...state,
    strongestNeed,
    expressionPressure: clamp(Math.max(
      state.expressionPressure || 0,
      state.frustration?.[strongestNeed] || 0
    ))
  };
}

function applySignalsToNeeds(needState = {}, options = {}) {
  const { characterId = '', signals = [] } = options;
  const next = {
    ...createDefaultNeedState(characterId),
    ...(needState && typeof needState === 'object' ? needState : {})
  };
  const effects = SIGNAL_TO_NEED_EFFECTS[characterId] || {};
  for (const signal of Array.isArray(signals) ? signals : []) {
    const keys = effects[signal] || [];
    for (const key of keys) {
      next.frustration[key] = clamp((next.frustration?.[key] || 0) + 0.14);
      next.satisfaction[key] = clamp((next.satisfaction?.[key] || 0) - 0.08);
    }
    if (signal === 'repair-attempt' || signal === 'praise') {
      for (const key of keys) {
        next.frustration[key] = clamp((next.frustration?.[key] || 0) - 0.16);
        next.satisfaction[key] = clamp((next.satisfaction?.[key] || 0) + 0.12);
      }
    }
  }
  return updateNeedRanking(next);
}

module.exports = {
  NEED_KEYS,
  NEED_PRIORITY_MAP,
  createDefaultNeedState,
  applySignalsToNeeds,
  updateNeedRanking
};
