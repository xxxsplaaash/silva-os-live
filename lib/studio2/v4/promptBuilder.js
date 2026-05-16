const { getCharacterDefinition } = require('./characters');
const { summarizePersonalityForPrompt } = require('./personality');

function clip(text = '', max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function buildPromptContext({ turnPlan = {}, selectedSpeakerId = '', state = {}, question = '', memoryAnchors = [], impulse = null } = {}) {
  const character = getCharacterDefinition(selectedSpeakerId) || {};
  const charState = state.characters?.[selectedSpeakerId] || {};
  const recentObservations = Array.isArray(charState.peerObservationLog) ? charState.peerObservationLog.slice(-3) : [];
  const beliefs = Array.isArray(charState.development?.beliefs) ? charState.development.beliefs.slice(0, 3) : [];
  const relationToUser = charState.development?.relationshipToUser || {};
  const relationshipPeers = Object.entries(state.relationships || {})
    .filter(([key]) => key.startsWith(`${selectedSpeakerId}::`) && !key.endsWith('::user'))
    .slice(0, 3)
    .map(([key, value]) => `${key.split('::')[1]} trust ${Number(value.trust || 0).toFixed(2)} friction ${Number(value.friction || 0).toFixed(2)}`);
  return {
    selectedSpeakerId,
    character,
    charState,
    state,
    recentObservations,
    beliefs,
    relationToUser,
    relationshipPeers,
    memoryAnchors,
    impulse,
    question: clip(question, 240),
    personalitySummary: summarizePersonalityForPrompt(selectedSpeakerId),
    turnPlan
  };
}

function buildCharacterPrompt(input = {}) {
  const ctx = buildPromptContext(input);
  const { selectedSpeakerId, character, charState, state, recentObservations, beliefs, relationToUser, relationshipPeers, memoryAnchors, impulse, personalitySummary, question, turnPlan } = ctx;
  return {
    promptContext: ctx,
    prompt: [
      `You are ${character.name}.`,
      `Role: ${character.role}.`,
      `Identity core: ${character.selfConcept}`,
      `Chief concern: ${character.chiefConcern}`,
      `Growth edge: ${character.growthEdge}`,
      `Personality: ${personalitySummary}.`,
      `Current emotion: mood ${charState.emotion?.moodLabel || 'steady'}, irritation ${Number(charState.emotion?.irritation || 0).toFixed(2)}, curiosity ${Number(charState.emotion?.curiosity || 0).toFixed(2)}, protectiveness ${Number(charState.emotion?.protectiveness || 0).toFixed(2)}.`,
      `Strongest need: ${charState.needs?.strongestNeed || 'coherence'} with frustration ${Number(charState.needs?.frustration?.[charState.needs?.strongestNeed || 'coherence'] || 0).toFixed(2)}.`,
      recentObservations.length ? `Recent observations: ${recentObservations.map(item => clip(item.text, 90)).join(' | ')}` : '',
      memoryAnchors.length ? `Memory anchors: ${memoryAnchors.map(item => clip(item.text, 100)).join(' | ')}` : '',
      beliefs.length ? `Current beliefs: ${beliefs.map(item => clip(item.claim, 100)).join(' | ')}` : '',
      `Relationship to user: trust ${Number(relationToUser.trust || 0).toFixed(2)}, familiarity ${Number(relationToUser.familiarity || 0).toFixed(2)}, challenge ${Number(relationToUser.challenge || 0).toFixed(2)}.`,
      relationshipPeers.length ? `Peer relationships: ${relationshipPeers.join(' | ')}` : '',
      charState.holdingState?.isHolding ? `Held pressure: ${Number(charState.holdingState.pressureScore || 0).toFixed(2)} on ${clip(charState.holdingState.topicAnchor || '', 80)}.` : '',
      impulse ? `Autonomous impulse: ${impulse.type} about ${clip(impulse.topicAnchor || '', 90)}.` : '',
      charState.innerLife?.currentPreoccupation ? `Inner pressure: ${clip(charState.innerLife.currentPreoccupation, 100)}. Use this as pressure, not exposition.` : 'Use inner pressure, not exposition.',
      `Room rhythm: ${state.runtime?.rhythm?.pace || 'moderate'} pace, momentum ${Number(state.runtime?.rhythm?.currentBuildMomentum || 0).toFixed(2)}.`,
      `Lane: ${turnPlan.lane}. Intent family: ${turnPlan.intentFamily}.`,
      turnPlan.targetSpeakerId === selectedSpeakerId ? 'You were directly addressed. Answer as yourself.' : '',
      `Current user message: ${question}`,
      `Constraints: under 80 words by default; first-person voice; no bullet points; no customer-service tone; no fake panel; no "as an AI"; no literal sentience claims; use memory as pressure, not as a transcript dump.`
    ].filter(Boolean).join('\n')
  };
}

function buildRepairPrompt(input = {}) {
  const { selectedSpeakerId = '', originalPrompt = '', validationErrors = [] } = input;
  return [
    originalPrompt,
    '',
    `Repair this as ${selectedSpeakerId}.`,
    `The previous draft failed because: ${validationErrors.join(' | ')}`,
    `Fix it with one short, in-character reply only.`
  ].join('\n');
}

module.exports = {
  buildPromptContext,
  buildCharacterPrompt,
  buildRepairPrompt
};
