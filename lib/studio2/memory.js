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

function pickMemoryAnchors(threadMemory = {}, options = {}) {
  const limit = Math.max(1, Number(options.limit || 4));
  const anchors = [];
  if (threadMemory.summary) anchors.push({ type: 'summary', text: String(threadMemory.summary) });
  (threadMemory.openLoops || []).slice(0, limit).forEach(item => anchors.push({ type: 'open-loop', text: String(item) }));
  (threadMemory.unresolvedTensions || []).slice(0, limit).forEach(item => anchors.push({ type: 'tension', text: String(item) }));
  return anchors.slice(0, limit);
}

function applyTurnMemoryUpdate(threadMemory = {}, turnSummary = {}) {
  const next = {
    ...createEmptyThreadMemory(),
    ...(threadMemory && typeof threadMemory === 'object' ? threadMemory : {})
  };
  if (turnSummary.summary) next.summary = String(turnSummary.summary);
  if (Array.isArray(turnSummary.openLoops)) next.openLoops = turnSummary.openLoops.slice(0, 8);
  if (Array.isArray(turnSummary.unresolvedTensions)) next.unresolvedTensions = turnSummary.unresolvedTensions.slice(0, 8);
  if (Array.isArray(turnSummary.recentDecisions)) next.recentDecisions = turnSummary.recentDecisions.slice(0, 8);
  return next;
}

module.exports = {
  createEmptyThreadMemory,
  pickMemoryAnchors,
  applyTurnMemoryUpdate
};
