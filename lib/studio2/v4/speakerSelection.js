const { ACTIVE_CHARACTER_IDS, getCharacterDefinition } = require('./characters');
const { pairKey } = require('./relationships');
const { selectEligibleImpulse } = require('./impulses');

function scoreTopicMatch(characterId = '', question = '', signals = []) {
  const q = String(question || '').toLowerCase();
  if (!q) return 0;
  const signalSet = new Set(Array.isArray(signals) ? signals : []);
  if (characterId === 'grok' && (/\b(architecture|code|route|system|mechanism|runtime|bug|logic|hold)\b/i.test(q) || signalSet.has('factual-contradiction'))) return 0.32;
  if (characterId === 'leah' && (/\b(generic|texture|taste|voice|vibe|specific)\b/i.test(q) || signalSet.has('taste-signal'))) return 0.34;
  if (characterId === 'claudia' && /\b(owner|ownership|operational|delivery|sequence|sequence|process|breaks operationally)\b/i.test(q)) return 0.34;
  if (characterId === 'vanya' && (/\b(human|risk|alive|dead|room|energy|trust|safe|boundary)\b/i.test(q) || signalSet.has('boundary-crossed') || signalSet.has('exclusion-move'))) return 0.34;
  if (characterId === 'aisha' && /\b(avoiding|truth|coherence|real|honest|conscious|presentable)\b/i.test(q)) return 0.36;
  return 0.08;
}

function scoreSpeaker(characterId = '', options = {}) {
  const {
    turnPlan = {},
    currentTurn = 0,
    question = '',
    detectedSignals = [],
    state = {}
  } = options;
  const character = state.characters?.[characterId];
  const def = getCharacterDefinition(characterId);
  if (!character || !def) return { id: characterId, score: -Infinity };

  const directAddressBonus = turnPlan.targetSpeakerId === characterId ? 3.6 : 0;
  const topicMatchScore = scoreTopicMatch(characterId, question, detectedSignals);
  const heldPressureBonus = Number(character.holdingState?.pressureScore || 0) * 1.6;
  const impulse = selectEligibleImpulse(character.autonomousImpulseQueue, currentTurn);
  const impulseBonus = impulse ? Number(impulse.priority || 0) * 1.4 : 0;
  const emotionPressureBonus = Number(character.emotion?.expressionPressure || 0) * 1.1;
  const needFrustrationBonus = Number(character.needs?.frustration?.[character.needs?.strongestNeed || 'coherence'] || 0) * 1.2;
  const beliefRelevanceBonus = (Array.isArray(character.development?.beliefs) ? character.development.beliefs.length : 0) * 0.04;
  const identityPressureBonus = Number(character.development?.selfNarrative?.recentIdentityPressure || 0) * 0.9;
  const relationship = state.relationships?.[pairKey(characterId, 'user')] || {};
  const relationshipScore = (Number(relationship.trust || 0.5) * 0.22) + (Number(relationship.friction || 0.14) * 0.12) + (Number(relationship.chemistry || 0.2) * 0.1);
  const lastSpokeTurn = Number(state.runtime?.speakerCooldowns?.[characterId] || 0);
  const recentSpeakerPenalty = lastSpokeTurn > 0 ? Math.max(0, 1.2 - Math.min(1.2, (currentTurn - lastSpokeTurn) * 0.35)) : 0;
  const rhythm = state.runtime?.rhythm || {};
  const laneBonus = turnPlan.lane === 'diagnostic'
    ? (characterId === 'grok' ? 1.2 : characterId === 'aisha' ? 0.45 : characterId === 'claudia' ? 0.38 : 0)
    : 0;
  const intentBonus = ['greeting', 'checkin', 'banter'].includes(turnPlan.intentFamily)
    ? (characterId === 'vanya' ? 0.42 : characterId === 'leah' ? 0.22 : characterId === 'aisha' ? 0.16 : 0)
    : 0;
  const rhythmModifier = rhythm.pace === 'rapid'
    ? (def.id === 'vanya' || def.id === 'grok' ? 1.08 : 0.98)
    : rhythm.pace === 'slow'
      ? (def.id === 'aisha' || def.id === 'claudia' ? 1.08 : 0.97)
      : 1;

  const score = (
    directAddressBonus +
    topicMatchScore +
    relationshipScore +
    laneBonus +
    intentBonus +
    heldPressureBonus +
    impulseBonus +
    emotionPressureBonus +
    needFrustrationBonus +
    beliefRelevanceBonus +
    identityPressureBonus -
    recentSpeakerPenalty
  ) * rhythmModifier;

  return {
    id: characterId,
    score: Number(score.toFixed(4)),
    directAddressBonus,
    topicMatchScore,
    heldPressureBonus,
    impulseBonus,
    emotionPressureBonus,
    laneBonus,
    intentBonus,
    needFrustrationBonus,
    beliefRelevanceBonus,
    identityPressureBonus,
    recentSpeakerPenalty,
    rhythmModifier
  };
}

function selectSpeakerForTurn(options = {}) {
  const {
    turnPlan = {},
    currentTurn = 0,
    question = '',
    detectedSignals = [],
    state = {}
  } = options;
  const candidateIds = turnPlan.targetSpeakerId ? [turnPlan.targetSpeakerId] : ACTIVE_CHARACTER_IDS.slice();
  const scoredCandidates = candidateIds
    .map(id => scoreSpeaker(id, { turnPlan, currentTurn, question, detectedSignals, state }))
    .sort((a, b) => b.score - a.score);
  const leadSpeakerId = scoredCandidates[0]?.id || 'aisha';
  return {
    leadSpeakerId,
    scoredCandidates,
    activeSpeakers: [leadSpeakerId]
  };
}

module.exports = {
  scoreSpeaker,
  selectSpeakerForTurn
};
