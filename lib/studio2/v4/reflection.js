function buildReflectionPatch({ threadId = '', state = {}, recentMessages = [] } = {}) {
  return {
    id: `reflect_${threadId || 'thread'}_${Date.now().toString(36)}`,
    threadId,
    globalSummary: String(state.runtime?.threadMemory?.summary || ''),
    openLoops: Array.isArray(state.runtime?.threadMemory?.openLoops) ? state.runtime.threadMemory.openLoops.slice(0, 6) : [],
    characterPatches: Object.entries(state.characters || {}).map(([characterId, characterState]) => ({
      characterId,
      beliefsToAdd: Array.isArray(characterState.development?.beliefs) ? characterState.development.beliefs.slice(0, 2) : [],
      memoriesToStrengthen: Array.isArray(characterState.salienceMemories)
        ? characterState.salienceMemories.slice(0, 2).map(item => item.id)
        : [],
      developmentMoment: characterState.development?.developmentLog?.slice(-1)?.[0]?.summary || null,
      relationshipNotes: [],
      futureCallback: characterState.autonomousImpulseQueue?.slice(-1)?.[0]?.topicAnchor || null
    })),
    recentMessages: Array.isArray(recentMessages) ? recentMessages.slice(-6) : []
  };
}

module.exports = {
  buildReflectionPatch
};
