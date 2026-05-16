const { clamp } = require('./emotions');
const { getCharacterDefinition } = require('./characters');

function createDefaultDevelopmentState(characterId = '') {
  const character = getCharacterDefinition(characterId) || {};
  return {
    selfNarrative: {
      longArc: `${character.name || characterId} is learning to stay vivid without surrendering standards.`,
      coreWound: character.coreWound || '',
      growthEdge: character.growthEdge || '',
      attachmentStyle: characterId === 'vanya' ? 'protective-secure' : characterId === 'grok' ? 'guarded-analytic' : 'earned-secure',
      currentSelfImage: character.selfConcept || '',
      recentIdentityPressure: 0.14
    },
    beliefs: [],
    preferences: [],
    relationshipToUser: {
      trust: 0.52,
      familiarity: 0.22,
      intimacy: 0.16,
      challenge: 0.22,
      repairNeeded: false,
      lastRepairTurn: 0
    },
    developmentLog: []
  };
}

function reinforceBelief(beliefs = [], claim = '', options = {}) {
  const { sourceEventId = '', turn = 0, emotionalValence = 0 } = options;
  const list = Array.isArray(beliefs) ? beliefs.slice() : [];
  const existing = list.find(item => String(item?.claim || '') === String(claim || ''));
  if (existing) {
    existing.confidence = clamp((existing.confidence || 0.4) + 0.12);
    existing.evidenceCount = Number(existing.evidenceCount || 1) + 1;
    existing.lastTestedTurn = turn;
    return list;
  }
  list.push({
    id: `${turn}_${list.length}_${Math.random().toString(36).slice(2, 6)}`,
    claim,
    confidence: 0.48,
    emotionalValence,
    sourceEventId,
    lastTestedTurn: turn,
    evidenceCount: 1,
    stability: 'plastic'
  });
  return list.slice(-16);
}

function applySignalsToDevelopment(development = {}, options = {}) {
  const { characterId = '', signals = [], sourceEventId = '', turn = 0, question = '' } = options;
  const next = {
    ...createDefaultDevelopmentState(characterId),
    ...(development && typeof development === 'object' ? development : {})
  };
  for (const signal of Array.isArray(signals) ? signals : []) {
    if (signal === 'identity-threat') {
      next.selfNarrative.recentIdentityPressure = clamp((next.selfNarrative.recentIdentityPressure || 0.14) + 0.16);
      next.beliefs = reinforceBelief(next.beliefs, 'The user wants real aliveness, not assistant theater.', { sourceEventId, turn, emotionalValence: -0.08 });
    } else if (signal === 'repair-attempt') {
      next.relationshipToUser.repairNeeded = false;
      next.relationshipToUser.lastRepairTurn = turn;
      next.relationshipToUser.trust = clamp((next.relationshipToUser.trust || 0.5) + 0.08);
    } else if (signal === 'commitment-made') {
      next.beliefs = reinforceBelief(next.beliefs, 'Promises in this room should return later and be tested.', { sourceEventId, turn, emotionalValence: 0.12 });
    } else if (signal === 'taste-signal' && characterId === 'leah') {
      next.beliefs = reinforceBelief(next.beliefs, 'Generic language is one of the fastest ways to kill the room.', { sourceEventId, turn, emotionalValence: -0.04 });
    } else if (signal === 'factual-contradiction' && characterId === 'grok') {
      next.beliefs = reinforceBelief(next.beliefs, 'Mechanism truth matters more than narrative convenience.', { sourceEventId, turn, emotionalValence: 0.04 });
    }
  }
  if (String(question || '').trim()) {
    next.relationshipToUser.familiarity = clamp((next.relationshipToUser.familiarity || 0.2) + 0.02);
  }
  next.developmentLog = Array.isArray(next.developmentLog) ? next.developmentLog.slice(-20) : [];
  if (signals.length) {
    next.developmentLog.push({
      id: `${characterId}_${turn}_${signals[0] || 'moment'}`,
      turn,
      sourceEventId,
      summary: `${characterId} registered ${signals.join(', ')}.`,
      effect: `Identity pressure ${Number(next.selfNarrative.recentIdentityPressure || 0).toFixed(2)}`,
      identityPressure: next.selfNarrative.recentIdentityPressure || 0
    });
  }
  return next;
}

module.exports = {
  createDefaultDevelopmentState,
  reinforceBelief,
  applySignalsToDevelopment
};
