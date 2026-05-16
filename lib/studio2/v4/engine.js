const { ACTIVE_CHARACTER_IDS } = require('./characters');
const { detectObservableSignals } = require('./signals');
const { runObservationPass } = require('./observation');
const { pickMemoryAnchors, summarizeTurnForThreadMemory, applyThreadMemoryUpdate } = require('./memory');
const { selectSpeakerForTurn } = require('./speakerSelection');
const { buildCharacterPrompt, buildRepairPrompt } = require('./promptBuilder');
const { validateGeneratedText, validateMessageEvents, buildSafeMinimalLine, buildDeterministicTurnLine, validateVoiceLibraryPresent } = require('./responseValidator');
const { resolveWorkflowContext } = require('./workflow');
const { planSpark } = require('./spark');
const { buildReflectionPatch } = require('./reflection');
const { clearHoldingAfterSpeak } = require('./holding');
const { consumeImpulse, selectEligibleImpulse } = require('./impulses');
const { updateRhythmState } = require('./rhythm');
const { seedStudio2StateFromLegacy, createDefaultThreadRuntime, createDefaultCharacterLiveState } = require('./legacyAdapter');

const DIRECT_NAME_MAP = {
  aisha: 'aisha',
  leah: 'leah',
  claudia: 'claudia',
  grok: 'grok',
  gerhard: 'grok',
  vanya: 'vanya'
};

function clip(text = '', max = 180) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function detectDirectTarget(question = '') {
  const q = String(question || '').trim().toLowerCase();
  for (const [needle, target] of Object.entries(DIRECT_NAME_MAP)) {
    if (new RegExp(`\\b${needle}\\b`).test(q)) return target;
  }
  return null;
}

function getLastRoomSpeakerMessage(recentMessages = []) {
  const items = Array.isArray(recentMessages) ? recentMessages.filter(Boolean) : [];
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index] || {};
    const speakerId = String(item.speakerId || item.speaker_id || '').trim().toLowerCase();
    const text = String(item.text || '').trim();
    if (!speakerId || speakerId === 'user' || !text) continue;
    return {
      speakerId,
      text
    };
  }
  return null;
}

function shouldTreatAsFollowup(question = '') {
  const q = String(question || '').trim().toLowerCase();
  if (!q) return false;
  if (detectDirectTarget(q)) return false;
  if (/^(hi|hello|hey|yo|sup)\b/.test(q)) return false;
  if (/\b(who('?s| is)\s+(online|here|around)|how('?s| is)\s+everyone|how are you all|everyone('?s|s)? mood)\b/.test(q)) return false;
  if (/^(what answer|what do you mean|which answer|how so|why that|what point|what exactly|say more|go on|explain|what about that)\??$/.test(q)) return true;
  if (/^(what|why|how|which)\b/.test(q) && q.split(/\s+/).length <= 4) return true;
  return false;
}

function resolveContextualTarget(question = '', recentMessages = []) {
  if (!shouldTreatAsFollowup(question)) return null;
  return getLastRoomSpeakerMessage(recentMessages);
}

function resolveLane(input = {}) {
  const workflow = resolveWorkflowContext({
    question: input.question,
    explicitIntent: input.explicitWorkflowIntent,
    attachments: input.attachments,
    commitRequested: input.commitRequested,
    confirmCommit: input.confirmCommit
  });
  if (input.manualSpark === true) return { lane: 'spark', workflowContext: null };
  if (workflow.allowed) return { lane: workflow.lane, workflowContext: workflow };
  if (detectDirectTarget(input.question)) return { lane: 'direct', workflowContext: null };
  if (/\b(architecture|bug|broken|route|system|runtime|logic|actual failure)\b|what is wrong with this chat|what is broken here/i.test(String(input.question || ''))) {
    return { lane: 'diagnostic', workflowContext: null };
  }
  return { lane: 'room', workflowContext: null };
}

function resolveIntentFamily(question = '', lane = 'room') {
  const q = String(question || '').trim();
  if (lane === 'diagnostic') return 'critique';
  if (lane === 'workflow') return 'planning';
  if (lane === 'commit') return 'planning';
  if (lane === 'spark') return 'followup';
  if (/\b(who(?:'s| is)\s+(online|here|around)|hi team|hello team|hey team)\b/i.test(q)) return 'greeting';
  if (/\b(how(?:'s| is)\s+everyone|how(?: are|'re)\s+you all|everyone('?s|s)? mood|reading the room)\b/i.test(q)) return 'checkin';
  if (/\b(lol|haha|joke|funny|coolest|slowest|smartest)\b/i.test(q)) return 'banter';
  if (/\b(dead|stale|boring|contextually unaware|sounds like ai|feel conscious)\b/i.test(q)) return 'critique';
  return lane === 'direct' ? 'followup' : 'followup';
}

function buildTurnPlan(input = {}) {
  const laneResolution = resolveLane(input);
  const explicitTargetSpeakerId = detectDirectTarget(input.question);
  const contextualTarget = laneResolution.lane === 'room'
    ? resolveContextualTarget(input.question, input.recentMessages || [])
    : null;
  const targetSpeakerId = laneResolution.lane === 'direct'
    ? explicitTargetSpeakerId
    : (contextualTarget?.speakerId || null);
  const lane = explicitTargetSpeakerId
    ? laneResolution.lane
    : (contextualTarget?.speakerId ? 'direct' : laneResolution.lane);
  return {
    lane,
    intentFamily: resolveIntentFamily(input.question, lane),
    targetSpeakerId,
    activeSpeakers: targetSpeakerId ? [targetSpeakerId] : ACTIVE_CHARACTER_IDS.slice(),
    workflowContext: laneResolution.workflowContext,
    memoryAnchors: [],
    contextualTarget,
    replyPolicy: {
      maxVisibleEvents: 1,
      allowSupportSpeaker: false
    }
  };
}

function shouldUseDeterministicFastPath(turnPlan = {}) {
  const lane = String(turnPlan.lane || '').trim().toLowerCase();
  const family = String(turnPlan.intentFamily || '').trim().toLowerCase();
  return lane === 'direct'
    || lane === 'diagnostic'
    || ['greeting', 'checkin', 'banter'].includes(family);
}

function responseTitleForQuestion(question = '', lane = 'room') {
  const q = clip(question, 72);
  if (!q) return 'Open room';
  if (lane === 'diagnostic') return 'Room diagnosis';
  if (lane === 'direct') return q;
  return q;
}

function buildLegacyCompatibleResponse({
  question = '',
  turnPlan = {},
  speakerId = 'aisha',
  speakerName = '',
  speakerRole = '',
  speakerColor = '',
  tone = 'steady',
  text = ''
} = {}) {
  return {
    title: responseTitleForQuestion(question, turnPlan.lane),
    summary: text,
    departmentLead: speakerId,
    departmentPerspective: text,
    aishaFinal: speakerId === 'aisha' ? text : '',
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    threadMeta: {
      responsePattern: 'solo',
      intent: turnPlan.intentFamily || 'followup',
      lastIntentPattern: turnPlan.intentFamily || 'followup',
      requiredSpeakers: turnPlan.targetSpeakerId ? [turnPlan.targetSpeakerId] : [speakerId],
      lastTargetedSpeaker: turnPlan.targetSpeakerId || '',
      lastActiveSpeakers: [speakerId],
      activeTopicTags: [],
      lastRoomEnergy: turnPlan.lane === 'diagnostic' ? 'focused' : 'alive',
      selectionReason: `studio2.v4:${turnPlan.lane}`
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    },
    messageEvents: [{
      id: `studio2_v4_${speakerId}_${Date.now().toString(36)}`,
      speakerId,
      speakerName,
      role: speakerRole,
      color: speakerColor,
      kind: turnPlan.lane === 'spark' ? 'spark' : 'message',
      text,
      tone,
      delayMs: 0,
      replyToId: '',
      emotionalState: '',
      targetSpeakerId: turnPlan.targetSpeakerId || '',
      targetType: turnPlan.targetSpeakerId ? 'member' : 'room',
      directTarget: turnPlan.targetSpeakerId || '',
      label: '',
      metadata: {
        lane: turnPlan.lane,
        intentFamily: turnPlan.intentFamily
      },
      visible: true,
      saveToArchive: true
    }]
  };
}

function initializeState(seed = {}) {
  const base = seed.threadState && typeof seed.threadState === 'object'
    ? {
      runtime: seed.threadState.runtime || createDefaultThreadRuntime(seed.threadState.runtime || {}),
      characters: seed.threadState.characters || {},
      relationships: seed.threadState.relationships || {}
    }
    : seedStudio2StateFromLegacy(seed.legacy || {});
  for (const characterId of ACTIVE_CHARACTER_IDS) {
    if (!base.characters[characterId]) base.characters[characterId] = createDefaultCharacterLiveState(characterId);
  }
  base.runtime = base.runtime && typeof base.runtime === 'object' ? base.runtime : createDefaultThreadRuntime();
  base.relationships = base.relationships && typeof base.relationships === 'object' ? base.relationships : {};
  return base;
}

async function runStudio2TurnV4(input = {}, seed = {}, adapters = {}) {
  const voiceGate = validateVoiceLibraryPresent();
  const state = initializeState(seed);
  const currentTurn = Number(state.runtime.turnCounter || 0) + 1;
  state.runtime.turnCounter = currentTurn;

  const turnPlan = buildTurnPlan({
    ...input,
    recentMessages: seed.recentMessages || []
  });
  const userSignals = detectObservableSignals(input.question);
  let observedState = runObservationPass(state, {
    eventId: `user_${currentTurn}`,
    speakerId: 'user',
    messageText: input.question,
    currentTurn,
    targetSpeakerId: turnPlan.targetSpeakerId || '',
    history: seed.recentMessages || []
  });

  if (turnPlan.lane === 'spark') {
    const sparkPlan = planSpark(observedState, { manual: input.manualSpark === true });
    if (!sparkPlan.shouldSurface) {
      observedState.runtime.sparkReadiness = { quiet: true, reason: sparkPlan.reason };
      return {
        ok: true,
        lane: 'spark',
        intentFamily: 'followup',
        targetSpeakerId: null,
        activeSpeakers: [],
        memoryAnchors: [],
        workflowContext: null,
        response: null,
        provider: null,
        model: null,
        fallback: false,
        providerCallCount: 0,
        threadState: observedState,
        threadMemory: observedState.runtime.threadMemory,
        debug: {
          lane: 'spark',
          selectedSpeaker: null,
          scoredCandidates: [],
          detectedSignals: userSignals,
          sparkReason: sparkPlan.reason
        }
      };
    }
  }

  if (turnPlan.lane === 'workflow' || turnPlan.lane === 'commit') {
    return {
      ok: true,
      lane: turnPlan.lane,
      intentFamily: turnPlan.intentFamily,
      targetSpeakerId: turnPlan.targetSpeakerId,
      activeSpeakers: [],
      memoryAnchors: [],
      workflowContext: turnPlan.workflowContext,
      response: {
        messageEvents: []
      },
      provider: null,
      model: null,
      fallback: false,
      providerCallCount: 0,
      threadState: observedState,
      threadMemory: observedState.runtime.threadMemory,
      debug: {
        lane: turnPlan.lane,
        selectedSpeaker: null,
        scoredCandidates: [],
        detectedSignals: userSignals,
        workflowDisabled: true
      }
    };
  }

  const selection = selectSpeakerForTurn({
    turnPlan,
    currentTurn,
    question: input.question,
    detectedSignals: userSignals,
    state: observedState
  });
  const selectedSpeakerId = selection.leadSpeakerId || 'aisha';
  const selectedCharacter = observedState.characters[selectedSpeakerId];
  const impulse = selectEligibleImpulse(selectedCharacter.autonomousImpulseQueue, currentTurn);
  const memoryAnchors = pickMemoryAnchors(
    observedState.runtime.threadMemory,
    selectedCharacter,
    { limit: 4 }
  );
  const providerPrompt = buildCharacterPrompt({
    turnPlan,
    selectedSpeakerId,
    state: observedState,
    question: input.question,
    memoryAnchors,
    impulse
  });

  let providerCallCount = 0;
  let generatedText = '';
  let provider = 'studio2.v4';
  let model = null;
  let fallback = false;
  const localFastPath = shouldUseDeterministicFastPath(turnPlan);

  if (localFastPath) {
    generatedText = buildDeterministicTurnLine({
      speakerId: selectedSpeakerId,
      turnPlan,
      question: input.question,
      targetSpeakerId: turnPlan.targetSpeakerId || '',
      detectedSignals: userSignals
    });
    provider = 'studio2.v4.local';
  } else if (voiceGate.ok && typeof adapters.generateText === 'function') {
    const generated = await adapters.generateText(providerPrompt.prompt, {
      lane: turnPlan.lane,
      speakerId: selectedSpeakerId,
      intentFamily: turnPlan.intentFamily
    });
    providerCallCount += 1;
    if (generated && typeof generated === 'object') {
      provider = generated.provider || provider;
      model = generated.model || null;
      generatedText = generated.ok === false
        ? ''
        : clip(String(generated.text || ''), turnPlan.lane === 'diagnostic' ? 240 : 180);
    } else {
      generatedText = clip(String(generated || ''), turnPlan.lane === 'diagnostic' ? 240 : 180);
    }
  }

  let validation = validateGeneratedText(generatedText, {
    lane: turnPlan.lane,
    recentMessages: seed.recentMessages || []
  });

  if (!validation.ok && providerCallCount < 2 && typeof adapters.generateText === 'function' && generatedText) {
    const repaired = await adapters.generateText(buildRepairPrompt({
      selectedSpeakerId,
      originalPrompt: providerPrompt.prompt,
      validationErrors: validation.errors
    }), {
      lane: turnPlan.lane,
      speakerId: selectedSpeakerId,
      intentFamily: turnPlan.intentFamily,
      repair: true
    });
    providerCallCount += 1;
    if (repaired && typeof repaired === 'object') {
      provider = repaired.provider || provider;
      model = repaired.model || model;
      generatedText = repaired.ok === false
        ? ''
        : clip(String(repaired.text || ''), turnPlan.lane === 'diagnostic' ? 240 : 180);
    } else {
      generatedText = clip(String(repaired || ''), turnPlan.lane === 'diagnostic' ? 240 : 180);
    }
    validation = validateGeneratedText(generatedText, {
      lane: turnPlan.lane,
      recentMessages: seed.recentMessages || []
    });
  }

  if (!voiceGate.ok || !validation.ok) {
    generatedText = buildSafeMinimalLine({
      speakerId: selectedSpeakerId,
      turnPlan,
      question: input.question,
      targetSpeakerId: turnPlan.targetSpeakerId || '',
      detectedSignals: userSignals
    });
    fallback = true;
    provider = 'studio2.v4.local';
    model = null;
  }

  const response = buildLegacyCompatibleResponse({
    question: input.question,
    turnPlan,
    speakerId: selectedSpeakerId,
    speakerName: seed.characterMeta?.[selectedSpeakerId]?.name || '',
    speakerRole: seed.characterMeta?.[selectedSpeakerId]?.role || '',
    speakerColor: seed.characterMeta?.[selectedSpeakerId]?.color || '',
    tone: selectedCharacter.mood || 'steady',
    text: generatedText
  });

  const eventValidation = validateMessageEvents(response, {
    targetSpeakerId: turnPlan.targetSpeakerId
  });
  if (!eventValidation.ok) {
    const safeText = buildSafeMinimalLine({
      speakerId: selectedSpeakerId,
      turnPlan,
      question: input.question,
      targetSpeakerId: turnPlan.targetSpeakerId || '',
      detectedSignals: userSignals
    });
    const safeResponse = buildLegacyCompatibleResponse({
      question: input.question,
      turnPlan,
      speakerId: selectedSpeakerId,
      speakerName: seed.characterMeta?.[selectedSpeakerId]?.name || '',
      speakerRole: seed.characterMeta?.[selectedSpeakerId]?.role || '',
      speakerColor: seed.characterMeta?.[selectedSpeakerId]?.color || '',
      tone: selectedCharacter.mood || 'steady',
      text: safeText
    });
    response.title = safeResponse.title;
    response.summary = safeResponse.summary;
    response.departmentLead = safeResponse.departmentLead;
    response.departmentPerspective = safeResponse.departmentPerspective;
    response.aishaFinal = safeResponse.aishaFinal;
    response.actions = safeResponse.actions;
    response.consistencyChecks = safeResponse.consistencyChecks;
    response.suggestedAssets = safeResponse.suggestedAssets;
    response.promptIdeas = safeResponse.promptIdeas;
    response.relationshipDeltas = safeResponse.relationshipDeltas;
    response.threadMeta = safeResponse.threadMeta;
    response.archiveMeta = safeResponse.archiveMeta;
    response.messageEvents = safeResponse.messageEvents;
    response.messageEvents[0].metadata.recovered = true;
    fallback = true;
  }

  observedState = runObservationPass(observedState, {
    eventId: response.messageEvents[0].id,
    speakerId: selectedSpeakerId,
    messageText: response.messageEvents[0].text,
    currentTurn,
    targetSpeakerId: turnPlan.targetSpeakerId || '',
    history: seed.recentMessages || []
  });

  const speakerState = observedState.characters[selectedSpeakerId];
  observedState.characters[selectedSpeakerId] = {
    ...speakerState,
    holdingState: clearHoldingAfterSpeak(speakerState.holdingState, currentTurn),
    autonomousImpulseQueue: impulse ? consumeImpulse(speakerState.autonomousImpulseQueue, impulse.id) : speakerState.autonomousImpulseQueue,
    development: {
      ...speakerState.development,
      relationshipToUser: {
        ...speakerState.development.relationshipToUser,
        familiarity: Math.min(1, Number(speakerState.development.relationshipToUser?.familiarity || 0) + 0.04)
      }
    }
  };
  observedState.runtime.speakerCooldowns = {
    ...(observedState.runtime.speakerCooldowns || {}),
    [selectedSpeakerId]: currentTurn
  };
  observedState.runtime.rhythm = updateRhythmState(observedState.runtime.rhythm, {
    messageText: response.messageEvents[0].text,
    currentTurn
  });
  const threadMemoryPatch = summarizeTurnForThreadMemory({
    question: input.question,
    responseText: response.messageEvents[0].text,
    speakerId: selectedSpeakerId,
    signals: userSignals
  });
  observedState.runtime.threadMemory = applyThreadMemoryUpdate(observedState.runtime.threadMemory, {
    ...threadMemoryPatch,
    userSignals
  });
  observedState.runtime.lastDecisionTrace = {
    lane: turnPlan.lane,
    selectedSpeaker: selectedSpeakerId,
    scoredCandidates: selection.scoredCandidates,
    detectedSignals: userSignals
  };
  observedState.runtime.sparkReadiness = planSpark(observedState, { manual: false });

  return {
    ok: true,
    lane: turnPlan.lane,
    intentFamily: turnPlan.intentFamily,
    targetSpeakerId: turnPlan.targetSpeakerId,
    activeSpeakers: selection.activeSpeakers,
    memoryAnchors,
    workflowContext: turnPlan.workflowContext,
    response,
    provider,
    model,
    fallback,
    providerCallCount,
    threadState: observedState,
    threadMemory: observedState.runtime.threadMemory,
    reflectionPatch: buildReflectionPatch({
      threadId: seed.threadId || '',
      state: observedState,
      recentMessages: seed.recentMessages || []
    }),
    debug: {
      lane: turnPlan.lane,
      selectedSpeaker: selectedSpeakerId,
      scoredCandidates: selection.scoredCandidates,
      detectedSignals: userSignals,
      strongestNeed: selectedCharacter.needs?.strongestNeed || 'coherence',
      emotionSnapshot: selectedCharacter.emotion,
      memoryAnchors,
      currentPreoccupation: selectedCharacter.innerLife?.currentPreoccupation || null,
      holdingState: selectedCharacter.holdingState,
      impulse: impulse || null,
      voiceLibraryReady: voiceGate.ok,
      voiceLibraryMissing: voiceGate.missing
    }
  };
}

module.exports = {
  buildTurnPlan,
  runStudio2TurnV4
};
