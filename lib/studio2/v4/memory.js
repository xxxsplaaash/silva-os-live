const { clamp } = require('./emotions');

function createEmptyThreadMemory() {
  return {
    summary: '',
    openLoops: [],
    unresolvedTensions: [],
    recentDecisions: [],
    userSignals: [],
    characterStances: {
      aisha: [],
      leah: [],
      claudia: [],
      grok: [],
      vanya: []
    }
  };
}

function createSalienceMemoryEntry(input = {}) {
  return {
    id: input.id || `${input.sourceEventId || 'event'}_${Math.random().toString(36).slice(2, 7)}`,
    sourceEventId: input.sourceEventId || '',
    content: String(input.content || '').trim(),
    emotionalWeight: clamp(input.emotionalWeight == null ? 0.42 : input.emotionalWeight),
    mentionCount: Number(input.mentionCount || 1) || 1,
    lastReferencedTurn: Number(input.lastReferencedTurn || input.turn || 0) || 0,
    decayRate: Number.isFinite(Number(input.decayRate)) ? Number(input.decayRate) : 0.12,
    type: input.type || 'said-by-other'
  };
}

function addSalienceMemory(memories = [], input = {}) {
  const list = Array.isArray(memories) ? memories.slice() : [];
  const content = String(input.content || '').trim();
  if (!content) return list;
  const existing = list.find(item => String(item?.content || '') === content);
  if (existing) {
    existing.mentionCount = Number(existing.mentionCount || 1) + 1;
    existing.lastReferencedTurn = Number(input.turn || existing.lastReferencedTurn || 0);
    existing.emotionalWeight = clamp(Math.max(Number(existing.emotionalWeight || 0), Number(input.emotionalWeight || 0.42)));
    return list.slice(-18);
  }
  list.push(createSalienceMemoryEntry(input));
  return list.slice(-18);
}

function pickMemoryAnchors(threadMemory = {}, characterState = {}, options = {}) {
  const limit = Math.max(1, Number(options.limit || 4));
  const anchors = [];
  if (threadMemory.summary) anchors.push({ type: 'summary', text: String(threadMemory.summary) });
  for (const item of (threadMemory.openLoops || []).slice(0, 2)) anchors.push({ type: 'open-loop', text: String(item) });
  for (const item of (threadMemory.unresolvedTensions || []).slice(0, 2)) anchors.push({ type: 'tension', text: String(item) });
  const memories = Array.isArray(characterState.salienceMemories) ? characterState.salienceMemories.slice() : [];
  memories
    .sort((a, b) => Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0))
    .slice(0, 2)
    .forEach(item => anchors.push({ type: 'salience-memory', text: String(item.content || '') }));
  const beliefs = Array.isArray(characterState.development?.beliefs) ? characterState.development.beliefs.slice(0, 2) : [];
  beliefs.forEach(item => anchors.push({ type: 'belief', text: String(item.claim || '') }));
  return anchors.filter(item => item.text).slice(0, limit);
}

function summarizeTurnForThreadMemory({ question = '', responseText = '', speakerId = '', signals = [] } = {}) {
  const summary = `${String(question || '').trim().slice(0, 90)} -> ${String(responseText || '').trim().slice(0, 90)}`.trim();
  const openLoops = [];
  const unresolvedTensions = [];
  if (Array.isArray(signals) && signals.includes('open-question-unanswered')) openLoops.push(String(question || '').trim().slice(0, 120));
  if (Array.isArray(signals) && (signals.includes('factual-contradiction') || signals.includes('identity-threat') || signals.includes('boundary-crossed'))) {
    unresolvedTensions.push(`${speakerId || 'room'} is still carrying pressure from: ${String(question || '').trim().slice(0, 100)}`);
  }
  return { summary, openLoops, unresolvedTensions };
}

function applyThreadMemoryUpdate(threadMemory = {}, patch = {}) {
  const next = {
    ...createEmptyThreadMemory(),
    ...(threadMemory && typeof threadMemory === 'object' ? threadMemory : {})
  };
  if (patch.summary) next.summary = String(patch.summary);
  if (Array.isArray(patch.openLoops) && patch.openLoops.length) {
    next.openLoops = [...new Set([...(next.openLoops || []), ...patch.openLoops.map(String)])].slice(-8);
  }
  if (Array.isArray(patch.unresolvedTensions) && patch.unresolvedTensions.length) {
    next.unresolvedTensions = [...new Set([...(next.unresolvedTensions || []), ...patch.unresolvedTensions.map(String)])].slice(-8);
  }
  if (Array.isArray(patch.userSignals) && patch.userSignals.length) {
    next.userSignals = [...new Set([...(next.userSignals || []), ...patch.userSignals.map(String)])].slice(-10);
  }
  return next;
}

module.exports = {
  createEmptyThreadMemory,
  createSalienceMemoryEntry,
  addSalienceMemory,
  pickMemoryAnchors,
  summarizeTurnForThreadMemory,
  applyThreadMemoryUpdate
};
