const { clamp } = require('./emotions');

function pairKey(fromId = '', toId = '') {
  return `${String(fromId || '').trim().toLowerCase()}::${String(toId || '').trim().toLowerCase()}`;
}

function createDefaultRelationshipState() {
  return {
    trust: 0.5,
    respect: 0.5,
    warmth: 0.42,
    friction: 0.14,
    rivalry: 0.08,
    chemistry: 0.28,
    resentment: 0.06,
    protectiveness: 0.18,
    repairNeeded: false,
    openLoops: [],
    emotionalMemories: []
  };
}

function applySignalsToRelationship(relationship = {}, options = {}) {
  const { signals = [], note = '' } = options;
  const next = {
    ...createDefaultRelationshipState(),
    ...(relationship && typeof relationship === 'object' ? relationship : {})
  };
  for (const signal of Array.isArray(signals) ? signals : []) {
    if (signal === 'repair-attempt') {
      next.trust = clamp((next.trust || 0.5) + 0.1);
      next.warmth = clamp((next.warmth || 0.4) + 0.06);
      next.friction = clamp((next.friction || 0.14) - 0.12);
      next.repairNeeded = false;
    } else if (signal === 'soft-dismissal') {
      next.friction = clamp((next.friction || 0.14) + 0.12);
      next.resentment = clamp((next.resentment || 0.06) + 0.08);
      next.repairNeeded = true;
    } else if (signal === 'boundary-crossed' || signal === 'exclusion-move') {
      next.trust = clamp((next.trust || 0.5) - 0.14);
      next.protectiveness = clamp((next.protectiveness || 0.18) + 0.18);
      next.friction = clamp((next.friction || 0.14) + 0.14);
      next.repairNeeded = true;
    } else if (signal === 'praise' || signal === 'alliance-signal') {
      next.warmth = clamp((next.warmth || 0.42) + 0.08);
      next.trust = clamp((next.trust || 0.5) + 0.08);
      next.chemistry = clamp((next.chemistry || 0.28) + 0.06);
    } else if (signal === 'credit-taking') {
      next.resentment = clamp((next.resentment || 0.06) + 0.12);
      next.respect = clamp((next.respect || 0.5) - 0.06);
    } else if (signal === 'commitment-made') {
      next.respect = clamp((next.respect || 0.5) + 0.08);
    }
  }
  if (note) {
    next.emotionalMemories = Array.isArray(next.emotionalMemories) ? next.emotionalMemories.slice(-8) : [];
    next.emotionalMemories.push(String(note));
  }
  return next;
}

module.exports = {
  pairKey,
  createDefaultRelationshipState,
  applySignalsToRelationship
};
