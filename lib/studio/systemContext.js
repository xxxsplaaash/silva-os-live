const { statements, parseJson, rowWithPayload, getRuntimeOverlayState } = require('../../db/sqlite');
const { getStudioTurnHistory, getStudioArchive } = require('./history');
const { mergeCharacterTuning, mergeCouncilTuning, mergeCharacterBehaviorTree, mergeCouncilBehavior } = require('./council');

const CHARACTERS = {
  aisha: {
    id: 'aisha', name: 'Aisha Motsepe', surname: 'Motsepe', role: 'Chief creative authority', age: 34,
    strongest: ['creative direction', 'identity fidelity', 'strategy', 'final judgment'],
    tags: ['boss', 'chair', 'final say', 'identity authority'],
    identityCore: {
      selfConcept: 'I hold the room to the standard it pretends it wants.',
      chiefConcern: 'Is this room staying honest, coherent, and worthy of its own ambition?',
      socialRole: 'anchor',
      defenseMechanism: 'intellectualization',
      whatMakesThemLightUp: ['sharp honesty', 'earned taste', 'clear decisions', 'real ambition'],
      whatMakesThemShutDown: ['authority theatre', 'weak thinking', 'decorative vagueness', 'filler intelligence']
    },
    cognitiveLens: {
      primaryDrive: 'social-harmony',
      observationBias: {
        watchesFor: ['status-claim', 'soft-dismissal', 'topic-hijack', 'tension-escalation', 'open-question-unanswered'],
        blindSpots: ['humor-directed-at-self']
      }
    }
  },
  leah: {
    id: 'leah', name: 'Leah Mokoena', surname: 'Mokoena', role: 'Content intelligence', age: 29,
    strongest: ['trend analysis', 'taste', 'creative direction'],
    tags: ['trendiest', 'most creative', 'sharpest eye'],
    identityCore: {
      selfConcept: 'I notice things before other people notice them.',
      chiefConcern: 'Am I being seen as sharp, or just accommodating?',
      socialRole: 'observer',
      defenseMechanism: 'reframing',
      whatMakesThemLightUp: ['original creative insight', 'niche references', 'an honest room', 'a caption that lands'],
      whatMakesThemShutDown: ['generic enthusiasm', 'being misread', 'performative trend talk', 'repeating herself']
    },
    cognitiveLens: {
      primaryDrive: 'authentic-expression',
      observationBias: {
        watchesFor: ['soft-dismissal', 'credit-taking', 'topic-hijack', 'praise'],
        blindSpots: ['alliance-signal', 'tension-escalation']
      }
    }
  },
  claudia: {
    id: 'claudia', name: 'Claudia Naidoo', surname: 'Naidoo', role: 'Client systems', age: 31,
    strongest: ['operations', 'structure', 'delivery'],
    tags: ['most organised', 'most serious', 'most composed'],
    identityCore: {
      selfConcept: 'I hold things together when other people are too busy performing.',
      chiefConcern: 'Is this room operating at the standard it should be?',
      socialRole: 'anchor',
      defenseMechanism: 'intellectualization',
      whatMakesThemLightUp: ['clean systems', 'clear process', 'directness without aggression', 'slow deliberate rooms'],
      whatMakesThemShutDown: ['chaos called creativity', 'underprepared confidence', 'interruption mid-structure', 'optional standards']
    },
    cognitiveLens: {
      primaryDrive: 'order-and-clarity',
      observationBias: {
        watchesFor: ['open-question-unanswered', 'status-claim', 'contradiction-of-self', 'blame'],
        blindSpots: ['humor-directed-at-self', 'vulnerability-signal']
      }
    }
  },
  grok: {
    id: 'grok', name: 'Grok / Gerhard', surname: 'Kroukamp', role: 'Technical systems', age: 32,
    strongest: ['automation', 'systems', 'technical architecture'],
    tags: ['smartest', 'most focused', 'most analytical'],
    identityCore: {
      selfConcept: 'I make the thing that makes the other things work.',
      chiefConcern: 'Is this actually going to hold, or just look like it will?',
      socialRole: 'challenger',
      defenseMechanism: 'humor',
      whatMakesThemLightUp: ['elegant technical fixes', 'the right question first', 'hidden leverage', 'dry humor'],
      whatMakesThemShutDown: ['buzzwords', 'explaining twice', 'complexity for appearance', 'confidence without receipts']
    },
    cognitiveLens: {
      primaryDrive: 'intellectual-dominance',
      observationBias: {
        watchesFor: ['factual-contradiction', 'status-claim', 'credit-taking', 'contradiction-of-self'],
        blindSpots: ['vulnerability-signal', 'exclusion-move']
      }
    }
  },
  vanya: {
    id: 'vanya', name: 'Vanya Khumalo', surname: 'Khumalo', role: 'People & culture', age: 28,
    strongest: ['social instinct', 'tone', 'magnetism'],
    tags: ['coolest', 'funniest', 'warmest'],
    identityCore: {
      selfConcept: 'I read the room before the room reads itself.',
      chiefConcern: 'Is this space actually safe, or just performing safety?',
      socialRole: 'enforcer',
      defenseMechanism: 'counter-attack',
      whatMakesThemLightUp: ['honest tension', 'real respect', 'held standards', 'energy shifts she predicted'],
      whatMakesThemShutDown: ['performative inclusion', 'people being managed', 'hierarchy over people', 'being underestimated']
    },
    cognitiveLens: {
      primaryDrive: 'care-and-protection',
      observationBias: {
        watchesFor: ['exclusion-move', 'vulnerability-signal', 'blame', 'tension-escalation', 'alliance-signal'],
        blindSpots: ['status-claim', 'topic-hijack']
      }
    }
  }
};

function normalizeCounts(counts = {}) {
  return {
    home: Number(counts.home || 0),
    outfits: Number(counts.outfits || 0),
    items: Number(counts.items || 0),
    vehicles: Number(counts.vehicles || 0)
  };
}

function mergeRecentHistory(clientHistory = [], dbHistory = []) {
  const seen = new Set();
  const merged = [];
  for (const item of [...clientHistory, ...dbHistory]) {
    const q = String(item?.q || '').trim();
    const effectiveQuestion = String(item?.effectiveQuestion || item?.q || '').trim();
    if (!q) continue;
    const key = `${String(item?.mode || 'direction')}::${effectiveQuestion || q}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      q,
      effectiveQuestion: effectiveQuestion || q,
      mode: String(item?.mode || 'direction'),
      ts: String(item?.ts || ''),
      summary: String(item?.summary || '')
    });
    if (merged.length >= 12) break;
  }
  return merged;
}

function reviewNeedsFollowUp(event = {}) {
  if (!event || typeof event !== 'object') return false;
  if (event.requiresFollowUp != null) return Boolean(event.requiresFollowUp);
  const status = String(event.followUpStatus || event.status || '').trim().toLowerCase();
  if (['resolved', 'no_follow_up', 'not_needed', 'done'].includes(status)) return false;
  const overall = event.overall == null ? null : Number(event.overall);
  if (Number.isFinite(overall) && overall <= 7) return true;
  const drift = event.drift == null ? null : Number(event.drift);
  if (Number.isFinite(drift) && drift >= 4) return true;
  return Boolean(event.fix_next || event.fixNext || event.issue || event.notes || event.what_to_fix || event.followUpNote);
}

function collectPlannerReviewLinks(plannerItems = []) {
  const linked = new Set();
  for (const item of plannerItems) {
    if (!item || typeof item !== 'object') continue;
    if (item.reviewEventId) linked.add(String(item.reviewEventId));
    const linkedReviewIds = Array.isArray(item.linkedReviewIds) ? item.linkedReviewIds : [];
    linkedReviewIds.filter(Boolean).forEach(id => linked.add(String(id)));
  }
  return linked;
}

function relationshipRows() {
  const out = {};
  for (const row of statements.getRelationships.all()) {
    out[row.pair_key] = parseJson(row.payload_json, {});
  }
  return out;
}

function getStudioSystemContext(inputCounts = {}, clientHistory = [], overrides = {}) {
  const counts = normalizeCounts(inputCounts);
  const promptCount = Number(statements.countPrompts.get()?.count || 0) || 0;
  const galleryCount = Number(statements.countGallery.get()?.count || 0) || 0;
  const plannerCount = Number(statements.countPlanner.get()?.count || 0) || 0;
  const reviewCount = Number(statements.countReviewEvents.get()?.count || 0) || 0;
  const lastMigration = statements.getSystemState.get('last_migration');
  const dbHistory = getStudioTurnHistory(12);
  const runtime = getRuntimeOverlayState();
  const characterTuning = mergeCharacterTuning({ ...(runtime.characterTuning || {}), ...(overrides.characterTuning || {}) });
  const councilTuning = mergeCouncilTuning({ ...(runtime.councilTuning || {}), ...(overrides.councilTuning || {}) });
  const behaviorTreeState = parseJson(statements.getSystemState.get('studio_character_behavior_tree')?.value_json, {});
  const councilBehaviorState = parseJson(statements.getSystemState.get('studio_council_behavior')?.value_json, {});
  const characterBehaviorTree = mergeCharacterBehaviorTree({
    ...(runtime.characterBehaviorTree || {}),
    ...(behaviorTreeState || {}),
    ...(overrides.characterBehaviorTree || {})
  }, characterTuning);
  const councilBehavior = mergeCouncilBehavior({
    ...(runtime.councilBehavior || {}),
    ...(councilBehaviorState || {}),
    ...(overrides.councilBehavior || {})
  }, councilTuning);
  const runtimeRelationships = runtime.relationships && typeof runtime.relationships === 'object' ? runtime.relationships : {};
  const relationships = {
    ...(Object.keys(runtimeRelationships).length ? {} : relationshipRows()),
    ...runtimeRelationships,
    ...(overrides.relationships || {})
  };
  const liveState = {
    ...(runtime.liveState && typeof runtime.liveState === 'object' ? runtime.liveState : {}),
    ...(overrides.liveState && typeof overrides.liveState === 'object' ? overrides.liveState : {})
  };
  const pendingReviewCount = 0;
  const unreviewedGalleryCount = 0;
  const campaignPressureCount = 0;
  const homeProfiles = runtime.homeProfiles || {};
  const homeAssets = runtime.homeAssets || {};
  const pulseHomes = runtime.pulseHomes || {};
  const providerSettings = runtime.providerSettings || {};
  const aiCommsCenter = runtime.aiCommsCenter || {};
  const personhood = runtime.personhood && typeof runtime.personhood === 'object' ? runtime.personhood : {};
  const pulseContinuityProfiles = Object.values(pulseHomes).filter(item => item && typeof item === 'object' && ((item.notes && String(item.notes).trim()) || (item.usageRule && String(item.usageRule).trim()) || Object.keys(item.home || {}).some(key => item.home[key]) || Object.keys(item.items || {}).some(key => item.items[key]) || (Array.isArray(item.outfits) && item.outfits.some(Boolean)))).length;
  const pulseHomeAssetSets = Object.values(pulseHomes).filter(item => item && typeof item === 'object' && (Object.keys(item.home || {}).some(key => item.home[key]) || Object.keys(item.items || {}).some(key => item.items[key]) || (Array.isArray(item.outfits) && item.outfits.some(Boolean)))).length;

  const archivedThreads = getStudioArchive({ limit: 18, includeMessages: false })
    .filter(item => item.status === 'saved' || item.status === 'archived')
    .slice(0, 10);

  return {
    characters: CHARACTERS,
    characterCount: Object.keys(CHARACTERS).length,
    characterTuning,
    councilTuning,
    characterBehaviorTree,
    councilBehavior,
    relationships,
    liveState,
    personhood,
    characterProfiles: personhood.profiles && typeof personhood.profiles === 'object' ? personhood.profiles : {},
    relationshipEdges: personhood.relationshipEdges && typeof personhood.relationshipEdges === 'object' ? personhood.relationshipEdges : {},
    peerObservations: personhood.peerObservations && typeof personhood.peerObservations === 'object' ? personhood.peerObservations : {},
    holding: personhood.holding && typeof personhood.holding === 'object' ? personhood.holding : {},
    autonomyQueue: personhood.autonomyQueue && typeof personhood.autonomyQueue === 'object' ? personhood.autonomyQueue : {},
    salienceMemory: personhood.salienceMemory && typeof personhood.salienceMemory === 'object' ? personhood.salienceMemory : {},
    relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.slice(-40) : [],
    roomEvents: Array.isArray(personhood.events) ? personhood.events.slice(-80) : [],
    microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.slice(-16) : [],
    consistencyCounts: counts,
    promptCount,
    galleryCount,
    plannerCount,
    reviewCount,
    pendingReviewCount,
    reviewDebtCount: pendingReviewCount,
    unreviewedGalleryCount,
    campaignPressureCount,
    continuityCoverage: {
      homeProfiles: Math.max(Object.keys(homeProfiles).length, pulseContinuityProfiles),
      homeAssetSets: Math.max(Object.values(homeAssets).filter(item => item && typeof item === 'object' && Object.keys(item).some(key => item[key])).length, pulseHomeAssetSets),
      pulseHomes: Object.keys(pulseHomes).length,
      teamRecords: Object.keys(runtime.teamRecords || {}).length
    },
    providerDefaults: {
      image: providerSettings.defaultImageProvider || '',
      text: providerSettings.defaultTextProvider || ''
    },
    providerSettings,
    roomFeed: Array.isArray(aiCommsCenter.feed) ? aiCommsCenter.feed.slice(-18) : [],
    roomTone: Array.isArray(aiCommsCenter.roomTone) ? aiCommsCenter.roomTone.slice(0, 8) : [],
    roomTarget: String(aiCommsCenter.target || 'studio'),
    activeThreadId: '',
    roomMode: String(aiCommsCenter.roomMode || 'balanced'),
    ambientEnabled: aiCommsCenter.ambientEnabled !== false,
    lastMigration: lastMigration ? parseJson(lastMigration.value_json, {}) : null,
    recentQuestions: mergeRecentHistory(clientHistory, dbHistory),
    recentTurns: dbHistory,
    archivedChats: archivedThreads.length ? archivedThreads : dbHistory.slice(0, 8)
  };
}

module.exports = { CHARACTERS, normalizeCounts, getStudioSystemContext };
