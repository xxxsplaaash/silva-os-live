const { CHARACTER_IDS } = require('./characters');
const { clamp01, createRoomIntelligenceState } = require('./state');
const { reduceCharacterContinuityState } = require('./continuity');

function applyDelta(value, delta, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value || 0) + Number(delta || 0)));
}

function topicFromText(text = '') {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 120 ? `${clean.slice(0, 117).trim()}...` : clean;
}

function reduceRoomState({
  previous = null,
  perception = {},
  plan = {},
  turns = [],
  socialImpulses = [],
  threadId = ''
} = {}) {
  const base = createRoomIntelligenceState({ previous, threadId });
  const now = new Date().toISOString();
  const next = {
    ...base,
    characterStates: { ...(base.characterStates || {}) },
    knownPresenceStatus: { ...(base.knownPresenceStatus || {}) },
    updatedAt: now
  };
  const visibleTurns = (Array.isArray(turns) ? turns : [])
    .filter(item => item && CHARACTER_IDS.includes(String(item.speakerId || '').toLowerCase()) && String(item.content || item.text || '').trim());

  visibleTurns.forEach(turn => {
    const speakerId = String(turn.speakerId || '').toLowerCase();
    const step = (Array.isArray(plan.steps) ? plan.steps : []).find(item => item.speakerId === speakerId) || {};
    const current = next.characterStates[speakerId] || {};
    const emotionalDelta = step.emotionalDelta || turn.emotionalDelta || {};
    const requestedPresence = String(
      step.presenceAfter
      || step.roomStateDelta?.presenceUpdates?.[speakerId]
      || turn.roomStateDelta?.presenceUpdates?.[speakerId]
      || current.presence
      || 'unknown'
    ).toLowerCase();
    const nextPresence = ['active', 'quiet', 'away', 'unknown'].includes(requestedPresence)
      ? requestedPresence
      : (current.presence || 'unknown');
    next.characterStates[speakerId] = {
      ...current,
      presence: current.presence === 'away' ? 'away' : nextPresence,
      mood: String(turn.emotionalState || step.tone || current.mood || 'steady'),
      attention: clamp01(applyDelta(current.attention, 0.08)),
      trustTowardUser: clamp01(applyDelta(current.trustTowardUser, emotionalDelta.trustTowardUser || 0)),
      irritation: clamp01(applyDelta(current.irritation, emotionalDelta.irritation || 0)),
      warmth: clamp01(applyDelta(current.warmth, emotionalDelta.warmth || 0)),
      energy: clamp01(applyDelta(current.energy, 0.04)),
      currentIntent: String(turn.responseIntent || step.responseIntent || current.currentIntent || 'message'),
      lastSpokeAt: now,
      shortTermMemorySummary: topicFromText(turn.content || turn.text || current.shortTermMemorySummary || '')
    };
    next.knownPresenceStatus[speakerId] = next.characterStates[speakerId].presence;
  });

  CHARACTER_IDS.forEach(id => {
    if (!visibleTurns.some(turn => String(turn.speakerId || '').toLowerCase() === id)) {
      const current = next.characterStates[id] || {};
      next.characterStates[id] = {
        ...current,
        attention: clamp01(applyDelta(current.attention, -0.02)),
        currentIntent: current.presence === 'quiet' ? 'listening' : current.currentIntent || 'listening'
      };
    }
  });

  const mergedDelta = (Array.isArray(plan.steps) ? plan.steps : [])
    .map(item => item.roomStateDelta || {})
    .reduce((acc, item) => ({ ...acc, ...item }), {});

  next.roomMood = String(mergedDelta.roomMood || next.roomMood || 'steady');
  next.currentTopic = String(mergedDelta.currentTopic || topicFromText(perception.text || next.currentTopic || ''));
  next.recentTension = clamp01(mergedDelta.recentTension != null ? mergedDelta.recentTension : (perception.conflictTension || next.recentTension || 0.12));
  next.lastSpeakerId = visibleTurns.length ? visibleTurns[visibleTurns.length - 1].speakerId : next.lastSpeakerId;
  next.recentCharacterTurns = [
    ...(Array.isArray(next.recentCharacterTurns) ? next.recentCharacterTurns : []),
    ...visibleTurns.map(turn => ({
      speakerId: turn.speakerId,
      responseIntent: turn.responseIntent || '',
      text: topicFromText(turn.content || turn.text || ''),
      at: now
    }))
  ].slice(-8);
  next.unresolvedQuestions = Array.isArray(next.unresolvedQuestions) ? next.unresolvedQuestions.slice(-6) : [];
  const memoryCandidates = visibleTurns.map(turn => turn.memoryCandidate).filter(Boolean);
  if (memoryCandidates.some(item => item.needsConfirmation)) {
    next.unresolvedQuestions = [
      ...next.unresolvedQuestions,
      {
        type: 'memory-confirmation',
        text: memoryCandidates.find(item => item.needsConfirmation)?.text || perception.text || '',
        createdAt: now
      }
    ].slice(-6);
  }
  next.activeCharacterIds = CHARACTER_IDS.filter(id => next.knownPresenceStatus[id] === 'active');
  next.inactiveCharacterIds = CHARACTER_IDS.filter(id => ['away', 'unknown'].includes(next.knownPresenceStatus[id]));
  next.characterContinuityV0 = reduceCharacterContinuityState({
    previous: base.characterContinuityV0,
    perception,
    plan,
    turns: visibleTurns,
    socialImpulses,
    threadId: next.threadId || threadId,
    roomId: next.roomId
  });
  return next;
}

module.exports = {
  reduceRoomState
};
