const { ACTIVE_CHARACTER_IDS, getCharacterDefinition } = require('./characters');

function scoreCharacterForTurn(characterId = '', turnPlan = {}, runtime = {}) {
  const def = getCharacterDefinition(characterId);
  if (!def) return -Infinity;
  if (turnPlan.targetSpeakerId && turnPlan.targetSpeakerId === characterId) return 100;
  const intent = String(turnPlan.intentFamily || '').trim().toLowerCase();
  const signalIds = Array.isArray(runtime?.signals) ? runtime.signals : [];
  const tension = Number(runtime?.roomTension || 0);

  let score = (def.style.directness * 100) * 0.18 + (def.style.warmth * 100) * 0.12 + tension * 10;

  if (turnPlan.lane === 'diagnostic') {
    if (characterId === 'grok') score += 40;
    if (characterId === 'claudia') score += 32;
    if (characterId === 'aisha') score += 18;
    if (signalIds.includes('vulnerability-signal') && characterId === 'vanya') score += 10;
  }

  if (turnPlan.lane === 'workflow' || turnPlan.lane === 'commit') {
    if (characterId === 'claudia') score += 34;
    if (characterId === 'aisha') score += 20;
    if (characterId === 'leah' && /image|caption|creative/i.test(String(turnPlan.workflowContext?.intent || ''))) score += 26;
  }

  if (intent === 'greeting' || intent === 'presence-check' || intent === 'social-checkin') {
    if (characterId === 'vanya') score += 26;
    if (characterId === 'leah') score += 18;
    if (characterId === 'aisha') score += 12;
    if (characterId === 'claudia') score += 8;
  }

  if (intent === 'pulse-critique') {
    if (characterId === 'aisha') score += 18;
    if (characterId === 'leah') score += 22;
    if (characterId === 'grok') score += 24;
  }

  if (intent === 'creative-room') {
    if (characterId === 'leah') score += 24;
    if (characterId === 'vanya') score += 14;
    if (characterId === 'aisha') score += 12;
  }

  if (intent === 'playful-room') {
    if (characterId === 'vanya') score += 24;
    if (characterId === 'leah') score += 16;
    if (characterId === 'grok') score += 10;
  }

  if (signalIds.includes('blame') || signalIds.includes('vulnerability-signal')) {
    if (characterId === 'vanya') score += 12;
    if (characterId === 'aisha') score += 10;
  }

  if (signalIds.includes('factual-contradiction')) {
    if (characterId === 'grok') score += 12;
    if (characterId === 'claudia') score += 8;
  }

  return score;
}

function selectSpeakerForTurn(turnPlan = {}, runtime = {}) {
  const candidates = (turnPlan.targetSpeakerId ? [turnPlan.targetSpeakerId] : ACTIVE_CHARACTER_IDS)
    .map(id => ({ id, score: scoreCharacterForTurn(id, turnPlan, runtime) }))
    .sort((a, b) => b.score - a.score);
  const lead = candidates[0]?.id || 'aisha';
  const support = turnPlan.replyPolicy?.allowSupportSpeaker
    ? (candidates.find(item => item.id !== lead)?.id || '')
    : '';
  return {
    leadSpeakerId: lead,
    supportSpeakerIds: support ? [support] : [],
    scoredCandidates: candidates
  };
}

module.exports = {
  selectSpeakerForTurn
};
