const express = require('express');
const {
  statements,
  migrateState,
  rowWithPayload,
  parseJson,
  getRuntimeOverlayState,
  normalizeReviewEvent,
  getStudioPulseThreads,
  getStudioPulseMessages,
  getStudioPulseAssets,
  getStudioPulseWorkflows
} = require('../db/sqlite');

const router = express.Router();

function stripExportRow(value) {
  if (Array.isArray(value)) return value.map(stripExportRow);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === '_row' || key === 'payload_json') continue;
    out[key] = stripExportRow(inner);
  }
  return out;
}

function buildArtifactOwners() {
  return {
    prompts: 'index.html::STATE.prompts -> sqlite.prompts',
    gallery: 'index.html::STATE.gallery -> sqlite.gallery_items',
    plannerPosts: 'index.html::STATE.plannerPosts -> sqlite.planner_posts',
    reviewEvents: 'index.html::STATE.reviewEvents -> sqlite.review_events',
    assetRefs: "localStorage['silva_assets_<char>'] -> latest state snapshot",
    teamRecords: 'index.html::STATE.teamRecords -> latest state snapshot',
    homeProfiles: 'index.html::STATE.homeProfiles -> latest state snapshot',
    homeAssets: 'index.html::STATE.homeAssets -> latest state snapshot',
    pulseHomes: "localStorage['silva_studio_pulse_v395'].homes -> latest state snapshot",
    providerSettings: 'index.html::STATE.providerSettings -> latest state snapshot',
    analytics: 'index.html::STATE.analytics -> latest state snapshot',
    currentModes: 'index.html::STATE.currentModes -> latest state snapshot',
    characterTuning: "localStorage['silva_studio_pulse_v395'].characterTuning -> latest state snapshot",
    councilTuning: "localStorage['silva_studio_pulse_v395'].councilTuning -> latest state snapshot",
    characterBehaviorTree: "localStorage['silva_studio_pulse_v395'].characterBehaviorTree -> latest state snapshot + system_state",
    councilBehavior: "localStorage['silva_studio_pulse_v395'].councilBehavior -> latest state snapshot + system_state",
    studioPulseChats: 'sqlite.session_logs[type=studio_pulse_turn]',
    studioPulseThreads: 'sqlite.studio_pulse_threads',
    studioPulseMessages: 'sqlite.studio_pulse_messages',
    relationships: 'sqlite.relationships + state.personhood.relationships',
    personhood: '/api/state/migrate state.personhood.liveState -> sqlite.character_state',
    personhoodProfiles: 'runtime_overlay.personhood.profiles',
    peerObservations: 'runtime_overlay.personhood.peerObservations',
    holding: 'runtime_overlay.personhood.holding',
    autonomyQueue: 'runtime_overlay.personhood.autonomyQueue',
    salienceMemory: 'runtime_overlay.personhood.salienceMemory',
    relationshipEvents: 'runtime_overlay.personhood.relationshipEvents',
    microReactions: 'runtime_overlay.personhood.microReactions'
  };
}

function buildRuntimeOverlaySummary(runtime = {}) {
  const teamRecords = runtime.teamRecords || {};
  const homeProfiles = runtime.homeProfiles || {};
  const homeAssets = runtime.homeAssets || {};
  const pulseHomes = runtime.pulseHomes || {};
  const assetRefs = runtime.assetRefs || {};
  const providerSettings = runtime.providerSettings || {};
  const currentModes = runtime.currentModes || {};
  const characterTuning = runtime.characterTuning || {};
  const councilTuning = runtime.councilTuning || {};
  const characterBehaviorTree = runtime.characterBehaviorTree || {};
  const councilBehavior = runtime.councilBehavior || {};
  const runtimeRelationships = runtime.relationships || {};
  const personhood = runtime.personhood || {};
  const dbRelationships = statements.getRelationships.all().length;
  const studioPulseChats = statements.getSessionLogs.all(240).filter(row => row.type === 'studio_pulse_turn').length;
  const studioPulseThreads = getStudioPulseThreads(120);
  const activeThread = studioPulseThreads.find(item => item.status === 'active') || studioPulseThreads[0] || null;
  const activeThreadMessages = activeThread ? getStudioPulseMessages(activeThread.id).slice(-180) : [];
  const pulseApiKeys = Array.isArray(providerSettings.pulseApiKeys) ? providerSettings.pulseApiKeys : [];
  const pulseContinuityProfiles = Object.values(pulseHomes).filter(item => item && typeof item === 'object' && ((item.notes && String(item.notes).trim()) || (item.usageRule && String(item.usageRule).trim()) || Object.keys(item.home || {}).some(key => item.home[key]) || Object.keys(item.items || {}).some(key => item.items[key]) || (Array.isArray(item.outfits) && item.outfits.some(Boolean)))).length;
  const pulseHomeAssetSets = Object.values(pulseHomes).filter(item => item && typeof item === 'object' && (Object.keys(item.home || {}).some(key => item.home[key]) || Object.keys(item.items || {}).some(key => item.items[key]) || (Array.isArray(item.outfits) && item.outfits.some(Boolean)))).length;
  const threadStatuses = studioPulseThreads.reduce((acc, item) => {
    const key = String(item.status || 'active');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    assetRefs: Object.values(assetRefs).filter(item => item && typeof item === 'object' && Object.keys(item).some(key => item[key])).length,
    teamRecords: Object.keys(teamRecords).length,
    homeProfiles: Math.max(Object.keys(homeProfiles).length, pulseContinuityProfiles),
    homeAssetSets: Math.max(Object.values(homeAssets).filter(item => item && typeof item === 'object' && Object.keys(item).some(key => item[key])).length, pulseHomeAssetSets),
    pulseHomes: Object.keys(pulseHomes).length,
    currentModes: Object.keys(currentModes).length,
    characterTuning: Object.keys(characterTuning).length,
    councilTuningConfigured: Object.keys(councilTuning).length > 0,
    characterBehaviorTree: Object.keys(characterBehaviorTree).length,
    councilBehaviorConfigured: Object.keys(councilBehavior).length > 0,
    relationshipPairs: Math.max(Object.keys(runtimeRelationships).length, dbRelationships),
    studioPulseChats,
    studioPulseThreads: studioPulseThreads.length,
    studioPulseThreadStatus: threadStatuses,
    studioPulseSparkMessages: activeThreadMessages.filter(item => String(item?.kind || '').toLowerCase() === 'spark').length,
    roomFeedEntries: Array.isArray(runtime.aiCommsCenter?.feed) ? runtime.aiCommsCenter.feed.length : 0,
    roomToneEntries: Array.isArray(runtime.aiCommsCenter?.roomTone) ? runtime.aiCommsCenter.roomTone.length : 0,
    personhoodProfiles: Object.keys(personhood.profiles || {}).length,
    peerObservations: Object.values(personhood.peerObservations || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
    holdingStates: Object.values(personhood.holding || {}).filter(item => item && item.isHolding).length,
    autonomyQueueItems: Object.values(personhood.autonomyQueue || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
    salienceMemoryEntries: Object.values(personhood.salienceMemory || {}).reduce((sum, entry) => sum + (Array.isArray(entry?.memories) ? entry.memories.length : 0), 0),
    relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.length : 0,
    microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.length : 0,
    studioPulseAssets: Number(statements.countStudioPulseAssets.get()?.count || 0) || 0,
    studioPulseWorkflows: Number(statements.countStudioPulseWorkflows.get()?.count || 0) || 0,
    consciousnessLayerActive: personhood.config?.consciousnessLayerActive !== false,
    voiceLibraryReady: personhood.config?.voiceLibraryReady !== false,
    pulseApiKeys: pulseApiKeys.length,
    activePulseApiKeys: pulseApiKeys.filter(item => item && item.enabled !== false && item.apiKey).length,
    providerConfigured: Boolean(providerSettings.defaultImageProvider || providerSettings.defaultTextProvider),
    providerDefaults: {
      image: providerSettings.defaultImageProvider || '',
      text: providerSettings.defaultTextProvider || ''
    }
  };
}

const PULSE_SPEAKER_IDS = new Set(['studio', 'aisha', 'leah', 'claudia', 'grok', 'vanya', 'user']);

function normalizePulseTarget(value) {
  const target = String(value || '').trim().toLowerCase();
  return PULSE_SPEAKER_IDS.has(target) && target !== 'user' ? target : 'studio';
}

function normalizePulseThreadId(value) {
  const id = String(value || '').trim();
  if (!id) return '';
  return PULSE_SPEAKER_IDS.has(id.toLowerCase()) ? '' : id;
}

function resolveActivePulseThread(runtime = {}, options = {}) {
  const threads = getStudioPulseThreads(120);
  const runtimeThreadId = normalizePulseThreadId(runtime.aiCommsCenter?.activeThreadId || '');
  const fallbackToThreads = options.fallbackToThreads !== false;
  const activeThread = threads.find(item => String(item.id || '') === runtimeThreadId)
    || (fallbackToThreads
      ? (threads.find(item => String(item.status || '').trim().toLowerCase() === 'active') || threads[0] || null)
      : null);
  return {
    threads,
    activeThread,
    activeThreadId: String(activeThread?.id || (fallbackToThreads ? runtimeThreadId : '') || '')
  };
}

function compactPulseAttachmentSummary(attachments = []) {
  const list = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  return {
    count: list.length,
    kinds: [...new Set(list.map(item => String(item?.kind || '').trim().toLowerCase()).filter(Boolean))].slice(0, 6),
    sources: [...new Set(list.map(item => String(item?.source || '').trim().toLowerCase()).filter(Boolean))].slice(0, 6),
    latestCreatedAt: list.reduce((latest, item) => {
      const current = Date.parse(String(item?.createdAt || '')) || 0;
      return current > latest ? current : latest;
    }, 0) || 0
  };
}

function compactPulseWorkflowSummary(workflow) {
  if (!workflow || typeof workflow !== 'object') return null;
  const commitCard = workflow.commitCard && typeof workflow.commitCard === 'object' ? workflow.commitCard : null;
  const brief = workflow.derivedBrief && typeof workflow.derivedBrief === 'object' ? workflow.derivedBrief : {};
  return {
    id: String(workflow.id || ''),
    intent: String(workflow.intent || 'room-chat'),
    status: String(workflow.status || 'draft'),
    ownerSpeakerId: String(brief.owner || workflow.createdBy || 'aisha').trim().toLowerCase() || 'aisha',
    title: String(brief.title || workflow.title || workflow.intent || 'workflow'),
    ready: commitCard ? commitCard.ready === true : String(workflow.status || '').trim().toLowerCase() === 'ready_to_commit',
    missingFields: commitCard && Array.isArray(commitCard.missingFields) ? commitCard.missingFields.filter(Boolean) : [],
    actionCount: commitCard && Array.isArray(commitCard.actions) ? commitCard.actions.filter(Boolean).length : 0,
    updatedAt: String(workflow.updatedAt || '')
  };
}

function buildPulseCharacterPayload(personhood = {}, id, options = {}) {
  const debug = options.debug === true;
  const live = personhood.liveState?.[id] || {};
  const holding = personhood.holding?.[id] || null;
  const observations = Array.isArray(personhood.peerObservations?.[id]) ? personhood.peerObservations[id].slice(-4) : [];
  const memories = Array.isArray(personhood.salienceMemory?.[id]?.memories)
    ? [...personhood.salienceMemory[id].memories].sort((a, b) => Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0)).slice(0, 3)
    : [];
  const payload = {
    holdingState: holding,
    recentObservations: observations,
    topMemories: memories,
    autonomousQueue: Array.isArray(personhood.autonomyQueue?.[id]) ? personhood.autonomyQueue[id].slice(0, 3) : [],
    liveScores: {
      mood: live.currentMood,
      patience: live.patience,
      warmth: live.warmth,
      curiosity: live.curiosity,
      irritation: live.irritation,
      urgeToDefend: live.urgeToDefend,
      urgeToTease: live.urgeToTease,
      needToBeSeen: live.needToBeSeen
    }
  };
  if (debug) payload.liveState = live;
  return payload;
}

function buildPulseRoomDebugPayload(personhood = {}) {
  return {
    presence: personhood.presence && typeof personhood.presence === 'object' ? personhood.presence : {},
    relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.slice(-16) : [],
    relationshipEdges: personhood.relationshipEdges && typeof personhood.relationshipEdges === 'object' ? personhood.relationshipEdges : {},
    microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.slice(-12) : [],
    voiceLibraryMissing: personhood.config?.voiceLibraryMissing || []
  };
}

router.get('/export', (req, res) => {
  const prompts = statements.getPrompts.all().map(rowWithPayload).map(stripExportRow);
  const gallery = statements.getGallery.all().map(rowWithPayload).map(stripExportRow);
  const plannerPosts = statements.getPlanner.all().map(rowWithPayload).map(stripExportRow);
  const reviewEvents = statements.getReviewEvents.all().map(rowWithPayload).map(stripExportRow);
  const runtime = getRuntimeOverlayState();
  const sessionLog = statements.getSessionLogs.all(140).map(row => ({
    id: row.id,
    type: row.type,
    ts: row.ts,
    meta: parseJson(row.payload_json, {})
  }));
  const studioPulseChats = sessionLog.filter(item => item.type === 'studio_pulse_turn');
  const studioPulseThreads = getStudioPulseThreads(80).map(thread => ({
    id: thread.id,
    title: thread.title,
    status: thread.status,
    pinned: !!thread.pinned,
    includeInContext: thread.includeInContext !== false,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastMessageAt: thread.lastMessageAt,
    meta: parseJson(thread.meta_json, thread.meta || {})
  }));
  const activeThread = studioPulseThreads.find(item => item.status === 'active') || studioPulseThreads[0] || null;
  const studioPulseMessages = activeThread ? getStudioPulseMessages(activeThread.id).slice(-120) : [];
  const studioPulseSparkMessages = studioPulseMessages.filter(item => String(item?.kind || '').toLowerCase() === 'spark');

  const characterState = {};
  for (const row of statements.getCharacterStates.all()) {
    characterState[row.character_id] = parseJson(row.payload_json, {});
  }

  const relationships = {};
  for (const row of statements.getRelationships.all()) {
    relationships[row.pair_key] = parseJson(row.payload_json, {});
  }

  res.json({
    ok: true,
    state: {
      prompts,
      gallery,
      plannerPosts,
      reviewEvents,
      assetRefs: runtime.assetRefs,
      sessionLog,
      studioPulseChats,
      studioPulseThreads,
      studioPulseMessages,
      studioPulseSparkMessages,
      currentModes: runtime.currentModes,
      characterTuning: runtime.characterTuning,
      councilTuning: runtime.councilTuning,
      characterBehaviorTree: runtime.characterBehaviorTree,
      councilBehavior: runtime.councilBehavior,
      relationships,
      teamRecords: runtime.teamRecords,
      homeProfiles: runtime.homeProfiles,
      homeAssets: runtime.homeAssets,
      pulseHomes: runtime.pulseHomes,
      providerSettings: runtime.providerSettings,
      analytics: runtime.analytics,
      aiCommsCenter: runtime.aiCommsCenter,
      characters: runtime.characters,
      savedSearch: runtime.savedSearch,
      lastSeenAt: runtime.lastSeenAt,
      personhood: {
        liveState: characterState,
        relationships,
        profiles: runtime.personhood?.profiles || {},
        events: runtime.personhood?.events || [],
        microReactions: runtime.personhood?.microReactions || [],
        peerObservations: runtime.personhood?.peerObservations || {},
        holding: runtime.personhood?.holding || {},
        autonomyQueue: runtime.personhood?.autonomyQueue || {},
        salienceMemory: runtime.personhood?.salienceMemory || {},
        relationshipEvents: runtime.personhood?.relationshipEvents || [],
        relationshipEdges: runtime.personhood?.relationshipEdges || {},
        presence: runtime.personhood?.presence || {},
        silence: runtime.personhood?.silence || [],
        config: runtime.personhood?.config || {}
      }
    },
    artifacts: {
      owners: buildArtifactOwners(),
      runtimeOverlay: buildRuntimeOverlaySummary(runtime)
    }
  });
});

router.post('/migrate', (req, res) => {
  const source = req.body?.source || 'frontend_localStorage';
  const state = req.body?.state;

  if (!state || typeof state !== 'object') {
    return res.status(400).json({ ok: false, error: 'A state object is required.' });
  }

  const result = migrateState(state, source);
  res.status(201).json({ ok: true, ...result });
});

router.post('/reviews', (req, res) => {
  const normalized = normalizeReviewEvent(req.body || {});
  statements.upsertReviewEvent.run(normalized);
  const row = statements.getReviewEventById.get(normalized.id);
  res.status(201).json({ ok: true, item: rowWithPayload(row) });
});

router.patch('/reviews/:id', (req, res) => {
  const existing = statements.getReviewEventById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Review event not found.' });
  const merged = { ...rowWithPayload(existing), ...req.body, id: req.params.id };
  const normalized = normalizeReviewEvent(merged);
  statements.upsertReviewEvent.run(normalized);
  const row = statements.getReviewEventById.get(req.params.id);
  res.json({ ok: true, item: rowWithPayload(row) });
});

router.get('/summary', (req, res) => {
  const lastMigration = statements.getSystemState.get('last_migration');
  const runtime = getRuntimeOverlayState();
  res.json({
    ok: true,
    counts: {
      prompts: statements.getPrompts.all().length,
      gallery: statements.getGallery.all().length,
      plannerPosts: statements.getPlanner.all().length,
      reviewEvents: statements.getReviewEvents.all().length,
      characterState: statements.getCharacterStates.all().length,
      relationships: statements.getRelationships.all().length,
      studioPulseChats: statements.getSessionLogs.all(500).filter(row => row.type === 'studio_pulse_turn').length,
      studioPulseThreads: getStudioPulseThreads(120).length,
      personhoodProfiles: Object.keys(runtime.personhood?.profiles || {}).length,
      peerObservations: Object.values(runtime.personhood?.peerObservations || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
      holdingStates: Object.values(runtime.personhood?.holding || {}).filter(item => item && item.isHolding).length,
      autonomyQueueItems: Object.values(runtime.personhood?.autonomyQueue || {}).reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0),
      salienceMemoryEntries: Object.values(runtime.personhood?.salienceMemory || {}).reduce((sum, entry) => sum + (Array.isArray(entry?.memories) ? entry.memories.length : 0), 0),
      relationshipEvents: Array.isArray(runtime.personhood?.relationshipEvents) ? runtime.personhood.relationshipEvents.length : 0,
      studioPulseAssets: Number(statements.countStudioPulseAssets.get()?.count || 0) || 0,
      studioPulseWorkflows: Number(statements.countStudioPulseWorkflows.get()?.count || 0) || 0,
      studioPulseSparkMessages: (() => {
        const activeThread = getStudioPulseThreads(120).find(item => item.status === 'active') || getStudioPulseThreads(120)[0] || null;
        return activeThread ? getStudioPulseMessages(activeThread.id).filter(item => String(item?.kind || '').toLowerCase() === 'spark').length : 0;
      })()
    },
    runtimeOverlay: buildRuntimeOverlaySummary(runtime),
    artifacts: {
      owners: buildArtifactOwners()
    },
    lastMigration: lastMigration ? parseJson(lastMigration.value_json, {}) : null
  });
});

router.get('/pulse-room', (req, res) => {
  const runtime = getRuntimeOverlayState('runtime_overlay_room_v1');
  const debug = String(req.query?.debug || '').trim() === '1';
  const runtimePersonhood = runtime.personhood && typeof runtime.personhood === 'object' ? runtime.personhood : {};
  const { activeThread, activeThreadId } = resolveActivePulseThread(runtime, { fallbackToThreads: false });
  const threadRuntimeState = activeThread?.meta?.roomRuntimeState && typeof activeThread.meta.roomRuntimeState === 'object'
    ? activeThread.meta.roomRuntimeState
    : {};
  const personhood = debug && threadRuntimeState.personhood && typeof threadRuntimeState.personhood === 'object'
    ? threadRuntimeState.personhood
    : runtimePersonhood;
  const attachments = activeThreadId ? getStudioPulseAssets(activeThreadId) : [];
  const workflows = activeThreadId ? getStudioPulseWorkflows(activeThreadId) : [];
  const activeWorkflow = workflows.find(item => !['committed', 'commit_failed'].includes(String(item?.status || '').trim().toLowerCase())) || null;
  const rhythm = (() => {
    if (personhood.conversationRhythm && typeof personhood.conversationRhythm === 'object') {
      return personhood.conversationRhythm;
    }
    if (threadRuntimeState.conversationContract?.rhythmState && typeof threadRuntimeState.conversationContract.rhythmState === 'object') {
      return threadRuntimeState.conversationContract.rhythmState;
    }
    if (runtime.conversationContract?.rhythmState && typeof runtime.conversationContract.rhythmState === 'object') {
      return runtime.conversationContract.rhythmState;
    }
    return {
      pace: String(runtime.aiCommsCenter?.roomMode || 'moderate'),
      consecutiveShortTurns: 0,
      consecutiveLongTurns: 0,
      lastLongPauseTurn: 0,
      currentBuildMomentum: 0.3,
      totalTurns: 0
    };
  })();
  const charIds = [...new Set([
    ...Object.keys(personhood.liveState || {}),
    ...Object.keys(personhood.presence || {}),
    'aisha',
    'leah',
    'claudia',
    'grok',
    'vanya'
  ])].filter(Boolean);
  const characters = charIds.reduce((acc, id) => {
    acc[id] = buildPulseCharacterPayload(personhood, id, { debug });
    return acc;
  }, {});

  const payload = {
    ok: true,
    rhythm,
    target: normalizePulseTarget(runtime.aiCommsCenter?.target || 'studio'),
    activeThreadId,
    thread: activeThread ? {
      id: String(activeThread.id || ''),
      title: String(activeThread.title || ''),
      status: String(activeThread.status || 'active'),
      includeInContext: activeThread.includeInContext !== false,
      updatedAt: String(activeThread.updatedAt || activeThread.updated_at || '')
    } : null,
    consciousness: {
      voiceLibraryReady: personhood.config?.voiceLibraryReady !== false,
      consciousnessLayerActive: personhood.config?.consciousnessLayerActive !== false,
      debugMode: Boolean(personhood.config?.debugMode),
      voiceLibraryMissing: personhood.config?.voiceLibraryMissing || []
    },
    characters,
    attachmentSummary: compactPulseAttachmentSummary(attachments),
    workflowSummary: compactPulseWorkflowSummary(activeWorkflow)
  };

  if (debug) {
    payload.attachments = attachments;
    payload.workflows = workflows;
    payload.activeWorkflow = activeWorkflow;
    payload.debug = buildPulseRoomDebugPayload(personhood);
  }

  res.json(payload);
});

module.exports = router;
