const { statements, getRuntimeOverlayState, nowIso } = require('../../db/sqlite');
const { VOICE_LIBRARY, validateVoiceLibraryPresent, normalizeSignals } = require('./voiceLibrary');

const SPEAKER_IDS = ['aisha', 'leah', 'claudia', 'grok', 'vanya'];
const OBSERVABLE_SIGNALS = [
  'factual-contradiction',
  'status-claim',
  'exclusion-move',
  'credit-taking',
  'soft-dismissal',
  'humor-directed-at-self',
  'alliance-signal',
  'topic-hijack',
  'open-question-unanswered',
  'praise',
  'blame',
  'tension-escalation',
  'vulnerability-signal',
  'contradiction-of-self'
];

const SPEAKER_NAMES = {
  aisha: 'Aisha',
  leah: 'Leah',
  claudia: 'Claudia',
  grok: 'Grok',
  vanya: 'Vanya'
};

const SPEAKER_NAME_ALIASES = {
  aisha: 'aisha',
  leah: 'leah',
  claudia: 'claudia',
  grok: 'grok',
  gerhard: 'grok',
  vanya: 'vanya'
};

const TOPIC_PATTERNS = {
  food: /\b(hungry|food|lunch|dinner|eat|drink|coffee|tea|snack|pizza|burger|fries|salad)\b/i,
  joke: /\b(joke|funny|laugh|humour|humor|lol|haha|lmao|pun)\b/i,
  technical: /\b(automation|technical|implementation|code|backend|frontend|bug|runtime|system|architecture|route|api|database|sqlite|server|build|logic|deploy)\b/i,
  people: /\b(team|culture|people|relationship|mood|vibe|energy|feel|alive|tone|friends|frenemies|chemistry)\b/i,
  creative: /\b(thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts|creative|brand|caption|content|trend|look|scene|taste|style|hook|campaign|post)\b/i,
  governance: /\b(boss|chair|lead|authority|final call|who leads|who owns|decision|standards)\b/i,
  presence: /\b(where|here|online|present|around|who('?s| is) here|who('?s| is) online)\b/i
};

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function deepClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return value;
  }
}

function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    for (const key of ['text', 'summary', 'message', 'note', 'perspective', 'content']) {
      const found = textValue(value[key]);
      if (found) return found;
    }
  }
  return String(value).trim();
}

function compact(value = '', max = 180) {
  const text = textValue(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function uniq(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).filter(Boolean))];
}

function mean(values = []) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function weightedJaccard(a = [], b = []) {
  const aa = new Set((Array.isArray(a) ? a : []).map(item => String(item || '').trim().toLowerCase()).filter(Boolean));
  const bb = new Set((Array.isArray(b) ? b : []).map(item => String(item || '').trim().toLowerCase()).filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let intersect = 0;
  aa.forEach(item => { if (bb.has(item)) intersect += 1; });
  const union = new Set([...aa, ...bb]).size;
  return union ? intersect / union : 0;
}

function coerce01(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 0, 1) : fallback;
}

function pairKey(a, b) {
  return [String(a || '').toLowerCase(), String(b || '').toLowerCase()].sort().join('__');
}

function directionalKey(from, to) {
  return `${String(from || '').toLowerCase()}__${String(to || '').toLowerCase()}`;
}

function topicTagsFromText(text = '') {
  const tags = Object.entries(TOPIC_PATTERNS)
    .filter(([, rx]) => rx.test(String(text || '')))
    .map(([tag]) => tag);
  return tags.length ? tags : ['general'];
}

function deriveMoodLabel(state = {}) {
  if (Number(state.stress || 0) >= 0.66 && Number(state.irritation || 0) >= 0.56) return 'tense';
  if (Number(state.urgeToWithdraw || 0) >= 0.62 && Number(state.socialBattery || 1) <= 0.4) return 'withdrawn';
  if (Number(state.urgeToTease || 0) >= 0.56 && Number(state.curiosity || 0) >= 0.48) return 'playful';
  if (Number(state.urgeToDefend || 0) >= 0.58) return 'protective';
  if (Number(state.curiosity || 0) >= 0.62) return 'curious';
  if (Number(state.hungerForControl || 0) >= 0.62) return 'focused';
  if (Number(state.irritation || 0) >= 0.54) return 'irritated';
  return 'steady';
}

function defaultEnergyAffinities(id) {
  const base = {
    reactive: 0.6,
    lively: 0.52,
    quiet: 0.44,
    tense: 0.48,
    playful: 0.46,
    focused: 0.56
  };
  if (id === 'aisha') return { ...base, focused: 0.82, tense: 0.72, reactive: 0.66 };
  if (id === 'leah') return { ...base, lively: 0.78, playful: 0.84, reactive: 0.68 };
  if (id === 'claudia') return { ...base, focused: 0.86, quiet: 0.72, tense: 0.64 };
  if (id === 'grok') return { ...base, focused: 0.9, quiet: 0.62, tense: 0.7, lively: 0.3 };
  return { ...base, reactive: 0.74, lively: 0.76, playful: 0.72, quiet: 0.54 };
}

function defaultCognitiveLens(id) {
  if (id === 'aisha') {
    return {
      speakerId: id,
      primaryDrive: 'social-harmony',
      observationBias: {
        watchesFor: ['status-claim', 'soft-dismissal', 'topic-hijack', 'tension-escalation', 'open-question-unanswered'],
        blindSpots: ['humor-directed-at-self']
      },
      responseStyle: {
        defaultsToDirectness: true,
        buildsConsensus: true,
        escalatesConflict: false,
        deflectsWithHumor: false,
        withdrawsUnderPressure: false
      },
      holdingPatternThreshold: 0.68
    };
  }
  if (id === 'leah') {
    return {
      speakerId: id,
      primaryDrive: 'authentic-expression',
      observationBias: {
        watchesFor: ['soft-dismissal', 'credit-taking', 'topic-hijack', 'praise'],
        blindSpots: ['alliance-signal', 'tension-escalation']
      },
      responseStyle: {
        defaultsToDirectness: true,
        buildsConsensus: false,
        escalatesConflict: false,
        deflectsWithHumor: true,
        withdrawsUnderPressure: false
      },
      holdingPatternThreshold: 0.55
    };
  }
  if (id === 'claudia') {
    return {
      speakerId: id,
      primaryDrive: 'order-and-clarity',
      observationBias: {
        watchesFor: ['open-question-unanswered', 'status-claim', 'contradiction-of-self', 'blame'],
        blindSpots: ['humor-directed-at-self', 'vulnerability-signal']
      },
      responseStyle: {
        defaultsToDirectness: true,
        buildsConsensus: true,
        escalatesConflict: false,
        deflectsWithHumor: false,
        withdrawsUnderPressure: false
      },
      holdingPatternThreshold: 0.72
    };
  }
  if (id === 'grok') {
    return {
      speakerId: id,
      primaryDrive: 'intellectual-dominance',
      observationBias: {
        watchesFor: ['factual-contradiction', 'status-claim', 'credit-taking', 'contradiction-of-self'],
        blindSpots: ['vulnerability-signal', 'exclusion-move']
      },
      responseStyle: {
        defaultsToDirectness: true,
        buildsConsensus: false,
        escalatesConflict: false,
        deflectsWithHumor: true,
        withdrawsUnderPressure: true
      },
      holdingPatternThreshold: 0.68
    };
  }
  return {
    speakerId: id,
    primaryDrive: 'care-and-protection',
    observationBias: {
      watchesFor: ['exclusion-move', 'vulnerability-signal', 'blame', 'tension-escalation', 'alliance-signal'],
      blindSpots: ['status-claim', 'topic-hijack']
    },
    responseStyle: {
      defaultsToDirectness: true,
      buildsConsensus: false,
      escalatesConflict: true,
      deflectsWithHumor: false,
      withdrawsUnderPressure: false
    },
    holdingPatternThreshold: 0.45
  };
}

function defaultIdentityCore(id) {
  if (id === 'aisha') {
    return {
      selfConcept: 'I hold the room to the standard it pretends it wants.',
      chiefConcern: 'Is this room staying honest, coherent, and worthy of its own ambition?',
      socialRole: 'anchor',
      defenseMechanism: 'intellectualization',
      whatMakesThemLightUp: [
        'When somebody says the real thing cleanly',
        'Standards being held without apology',
        'A sharp decision that makes the room better',
        'Earned confidence with actual taste',
        'The moment a drifting thread snaps back into focus'
      ],
      whatMakesThemShutDown: [
        'Authority theatre with no substance',
        'Elegant wording covering weak thought',
        'The room getting vague to protect comfort',
        'People mistaking filler for intelligence'
      ]
    };
  }
  if (id === 'leah') {
    return {
      selfConcept: 'I notice things before other people notice them.',
      chiefConcern: 'Am I being seen as sharp, or just accommodating?',
      socialRole: 'observer',
      defenseMechanism: 'reframing',
      whatMakesThemLightUp: [
        'A genuinely original creative insight',
        'Someone referencing something niche she also knows',
        'A caption that actually lands on first read',
        'When the room suddenly gets more honest',
        'Johannesburg catching people off guard'
      ],
      whatMakesThemShutDown: [
        'Being asked to explain herself twice',
        'Vague enthusiasm with no substance',
        'Being grouped in with the wrong take',
        'When trend discourse becomes trend performance'
      ]
    };
  }
  if (id === 'claudia') {
    return {
      selfConcept: 'I hold things together when other people are too busy performing.',
      chiefConcern: 'Is this room operating at the standard it should be?',
      socialRole: 'anchor',
      defenseMechanism: 'intellectualization',
      whatMakesThemLightUp: [
        'A system that actually works without explanation',
        'Someone who respects a clear process',
        'When a client interaction becomes a case study',
        'Directness without aggression',
        'A room that knows when to slow down'
      ],
      whatMakesThemShutDown: [
        'Chaos framed as creativity',
        'Underprepared confidence',
        'Being interrupted mid-structure',
        'Standards treated as optional'
      ]
    };
  }
  if (id === 'grok') {
    return {
      selfConcept: 'I make the thing that makes the other things work.',
      chiefConcern: 'Is this actually going to hold, or just look like it will?',
      socialRole: 'challenger',
      defenseMechanism: 'humor',
      whatMakesThemLightUp: [
        'An elegant technical solution with minimum surface area',
        'Someone who asks the right question first',
        'A system that runs without anyone noticing it',
        'Unexpected dry humor that nobody telegraphed',
        'When something that was broken finally just works'
      ],
      whatMakesThemShutDown: [
        'Buzzwords used as substitutes for understanding',
        'Being asked to explain something twice in the same conversation',
        'Complexity added for the sake of appearance',
        'Confidence without receipts'
      ]
    };
  }
  return {
    selfConcept: 'I read the room before the room reads itself.',
    chiefConcern: 'Is this space actually safe, or just performing safety?',
    socialRole: 'enforcer',
    defenseMechanism: 'counter-attack',
    whatMakesThemLightUp: [
      'When someone drops their performance and just speaks',
      'A standard being held without apology',
      'Honest tension that resolves into clarity',
      'Someone younger being genuinely respected',
      'When the energy in the room shifts and she called it'
    ],
    whatMakesThemShutDown: [
      'People being managed instead of heard',
      'Standard-setting that protects hierarchy over people',
      'Performative inclusion',
      'Being underestimated because of age'
    ]
  };
}

function defaultProfile(id, existing = {}) {
  const baseTopicTags = {
    aisha: ['governance', 'creative', 'people', 'identity'],
    leah: ['creative', 'people', 'joke', 'content'],
    claudia: ['technical', 'governance', 'people', 'delivery'],
    grok: ['technical', 'governance', 'joke', 'systems'],
    vanya: ['people', 'food', 'joke', 'presence']
  }[id] || ['general'];
  const baseInterestTags = {
    aisha: ['standards', 'direction', 'identity', 'room'],
    leah: ['taste', 'trend', 'genericness', 'energy'],
    claudia: ['scope', 'owner', 'delivery', 'structure'],
    grok: ['logic', 'routing', 'systems', 'failure'],
    vanya: ['tone', 'chemistry', 'morale', 'warmth']
  }[id] || ['general'];
  return {
    speakerId: id,
    topicTags: uniq([...(existing.topicTags || []), ...baseTopicTags]),
    interestTags: uniq([...(existing.interestTags || []), ...baseInterestTags]),
    energyAffinities: {
      ...defaultEnergyAffinities(id),
      ...(existing.energyAffinities || {})
    },
    fallbackRegister: existing.fallbackRegister && typeof existing.fallbackRegister === 'object' ? existing.fallbackRegister : {},
    voiceLibrary: Array.isArray(existing.voiceLibrary) && existing.voiceLibrary.length ? existing.voiceLibrary : (VOICE_LIBRARY[id] || []),
    cognitiveLens: {
      ...defaultCognitiveLens(id),
      ...(existing.cognitiveLens || {}),
      observationBias: {
        ...defaultCognitiveLens(id).observationBias,
        ...((existing.cognitiveLens || {}).observationBias || {})
      },
      responseStyle: {
        ...defaultCognitiveLens(id).responseStyle,
        ...((existing.cognitiveLens || {}).responseStyle || {})
      }
    },
    identityCore: {
      ...defaultIdentityCore(id),
      ...(existing.identityCore || {})
    }
  };
}

function defaultLiveState(id, existing = {}) {
  const base = {
    socialBattery: id === 'grok' ? 0.48 : id === 'claudia' ? 0.58 : 0.62,
    boredom: 0.22,
    irritation: id === 'leah' ? 0.22 : 0.18,
    stress: 0.24,
    curiosity: id === 'leah' ? 0.78 : id === 'vanya' ? 0.72 : 0.62,
    hungerForControl: id === 'aisha' ? 0.78 : id === 'claudia' ? 0.54 : 0.34,
    needToBeSeen: id === 'leah' ? 0.46 : id === 'grok' ? 0.4 : 0.34,
    urgeToInterrupt: id === 'grok' ? 0.36 : id === 'leah' ? 0.34 : 0.24,
    urgeToDefend: id === 'aisha' ? 0.28 : id === 'claudia' ? 0.24 : 0.2,
    urgeToTease: id === 'leah' ? 0.44 : id === 'vanya' ? 0.42 : 0.22,
    urgeToWithdraw: id === 'claudia' ? 0.3 : id === 'grok' ? 0.26 : 0.16,
    attentionTarget: 'studio',
    unresolvedUrgeLabel: '',
    unresolvedUrgeScore: 0,
    playfulness: id === 'leah' ? 0.68 : id === 'vanya' ? 0.7 : 0.34,
    confidence: id === 'grok' ? 0.72 : id === 'aisha' ? 0.78 : 0.66,
    patience: id === 'claudia' ? 0.74 : id === 'vanya' ? 0.7 : 0.58,
    resentment: 0.14
  };
  const live = {
    currentMood: '',
    socialBattery: coerce01(existing.socialBattery == null ? existing.socialEnergy : existing.socialBattery, base.socialBattery),
    boredom: coerce01(existing.boredom, base.boredom),
    irritation: coerce01(existing.irritation, base.irritation),
    stress: coerce01(existing.stress, base.stress),
    curiosity: coerce01(existing.curiosity, base.curiosity),
    hungerForControl: coerce01(existing.hungerForControl, base.hungerForControl),
    needToBeSeen: coerce01(existing.needToBeSeen, base.needToBeSeen),
    urgeToInterrupt: coerce01(existing.urgeToInterrupt, base.urgeToInterrupt),
    urgeToDefend: coerce01(existing.urgeToDefend, base.urgeToDefend),
    urgeToTease: coerce01(existing.urgeToTease, base.urgeToTease),
    urgeToWithdraw: coerce01(existing.urgeToWithdraw, base.urgeToWithdraw),
    attentionTarget: String(existing.attentionTarget || base.attentionTarget || 'studio'),
    unresolvedUrgeLabel: String(existing.unresolvedUrgeLabel || existing.unresolvedUrge || ''),
    unresolvedUrgeScore: coerce01(existing.unresolvedUrgeScore == null ? (existing.unresolvedUrge ? 0.22 : 0) : existing.unresolvedUrgeScore, 0),
    playfulness: coerce01(existing.playfulness, base.playfulness),
    confidence: coerce01(existing.confidence, base.confidence),
    patience: coerce01(existing.patience, base.patience),
    resentment: coerce01(existing.resentment, base.resentment),
    cooldowns: {
      interruptUntilUserTurn: Number(existing.cooldowns?.interruptUntilUserTurn || 0) || 0,
      sparkUntilUserTurn: Number(existing.cooldowns?.sparkUntilUserTurn || 0) || 0,
      sameFamilyUntilUserTurn: Number(existing.cooldowns?.sameFamilyUntilUserTurn || 0) || 0
    }
  };
  live.currentMood = String(existing.currentMood || deriveMoodLabel(live));
  return live;
}

function defaultRelationshipEdge(from, to, pair = {}) {
  return {
    fromSpeakerId: from,
    toSpeakerId: to,
    trust: clamp(pair.trust == null ? 0.56 : pair.trust),
    respect: clamp(pair.respect == null ? 0.62 : pair.respect),
    warmth: clamp(pair.warmth == null ? 0.44 : pair.warmth),
    friction: clamp(pair.friction == null ? 0.18 : pair.friction),
    chemistry: clamp(pair.chemistry == null ? 0.58 : pair.chemistry),
    resentment: clamp(pair.resentment == null ? 0.12 : pair.resentment),
    jealousy: clamp(pair.jealousy == null ? 0.08 : pair.jealousy),
    protectiveness: clamp(pair.protectiveness == null ? 0.14 : pair.protectiveness),
    recentTriggerEventId: String(pair.recentTriggerEventId || ''),
    interpersonalOpenLoop: pair.interpersonalOpenLoop && typeof pair.interpersonalOpenLoop === 'object'
      ? pair.interpersonalOpenLoop
      : null
  };
}

function seedDirectionalEdges(existing = {}, pairRelationships = {}) {
  const out = {};
  for (const from of SPEAKER_IDS) {
    for (const to of SPEAKER_IDS) {
      if (from === to) continue;
      const key = directionalKey(from, to);
      const pair = pairRelationships[pairKey(from, to)] || {};
      out[key] = {
        ...defaultRelationshipEdge(from, to, pair),
        ...(existing[key] || {})
      };
    }
  }
  return out;
}

function ensureConsciousPersonhood(personhood = {}, pairRelationships = {}) {
  const voiceValidation = validateVoiceLibraryPresent(VOICE_LIBRARY, SPEAKER_IDS);
  const profiles = {};
  const liveState = {};
  for (const id of SPEAKER_IDS) {
    profiles[id] = defaultProfile(id, personhood.profiles?.[id] || {});
    liveState[id] = defaultLiveState(id, personhood.liveState?.[id] || {});
  }
  const relationshipEdges = seedDirectionalEdges(personhood.relationshipEdges || {}, pairRelationships);
  const peerObservations = {};
  const holding = {};
  const autonomyQueue = {};
  const salienceMemory = {};
  const presence = {};
  const development = {};
  for (const id of SPEAKER_IDS) {
    peerObservations[id] = Array.isArray(personhood.peerObservations?.[id]) ? personhood.peerObservations[id].slice(-16) : [];
    holding[id] = {
      speakerId: id,
      isHolding: Boolean(personhood.holding?.[id]?.isHolding),
      heldSinceUserTurn: Number(personhood.holding?.[id]?.heldSinceUserTurn || 0) || 0,
      pressureScore: clamp(personhood.holding?.[id]?.pressureScore, 0),
      releaseCondition: String(personhood.holding?.[id]?.releaseCondition || 'next-gap'),
      topicAnchor: textValue(personhood.holding?.[id]?.topicAnchor || '')
    };
    autonomyQueue[id] = Array.isArray(personhood.autonomyQueue?.[id]) ? personhood.autonomyQueue[id].slice(-3) : [];
    salienceMemory[id] = {
      speakerId: id,
      memories: Array.isArray(personhood.salienceMemory?.[id]?.memories) ? personhood.salienceMemory[id].memories.slice(-24) : []
    };
    presence[id] = {
      speakerId: id,
      attentionTarget: String(personhood.presence?.[id]?.attentionTarget || liveState[id].attentionTarget || 'studio'),
      participationState: String(personhood.presence?.[id]?.participationState || 'listening'),
      moodRing: String(personhood.presence?.[id]?.moodRing || liveState[id].currentMood || 'steady')
    };
    development[id] = {
      speakerId: id,
      userBeliefs: Array.isArray(personhood.development?.[id]?.userBeliefs) ? personhood.development[id].userBeliefs.slice(-6) : [],
      peerBeliefs: personhood.development?.[id]?.peerBeliefs && typeof personhood.development[id].peerBeliefs === 'object'
        ? personhood.development[id].peerBeliefs
        : {},
      unresolvedThreads: Array.isArray(personhood.development?.[id]?.unresolvedThreads) ? personhood.development[id].unresolvedThreads.slice(-6) : [],
      tasteAnchors: Array.isArray(personhood.development?.[id]?.tasteAnchors) ? personhood.development[id].tasteAnchors.slice(-8) : []
    };
  }
  return {
    profiles,
    liveState,
    peerObservations,
    holding,
    autonomyQueue,
    salienceMemory,
    relationshipEvents: Array.isArray(personhood.relationshipEvents) ? personhood.relationshipEvents.slice(-80) : [],
    relationshipEdges,
    events: Array.isArray(personhood.events) ? personhood.events.slice(-160) : [],
    microReactions: Array.isArray(personhood.microReactions) ? personhood.microReactions.slice(-32) : [],
    silence: Array.isArray(personhood.silence) ? personhood.silence.slice(-16) : [],
    presence,
    development,
    config: {
      ...(personhood.config && typeof personhood.config === 'object' ? personhood.config : {}),
      voiceLibraryReady: voiceValidation.ok,
      voiceLibraryMissing: voiceValidation.missing,
      consciousnessLayerActive: voiceValidation.ok && personhood?.config?.consciousnessLayerActive !== false,
      debugMode: Boolean(personhood?.config?.debugMode)
    }
  };
}

function deriveRhythmState(messages = [], previous = {}, currentTurn = 0) {
  const main = (Array.isArray(messages) ? messages : []).filter(item => String(item?.kind || '').toLowerCase() !== 'spark');
  const turnMap = new Map();
  let inferredTurnId = 0;
  main.forEach((item) => {
    const explicitTurn = Number(item?.userTurnIndex || item?.user_turn_index || 0) || 0;
    const speakerId = String(item?.speakerId || item?.speaker_id || '').toLowerCase();
    if (explicitTurn > 0) {
      inferredTurnId = explicitTurn;
    } else if (speakerId === 'user') {
      inferredTurnId += 1;
    } else if (inferredTurnId <= 0) {
      inferredTurnId = 1;
    }
    const turnId = explicitTurn || inferredTurnId || 1;
    if (!turnMap.has(turnId)) {
      turnMap.set(turnId, { turnId, responseWords: 0, userCreatedAt: 0, lastCreatedAt: 0 });
    }
    const bucket = turnMap.get(turnId);
    const createdAt = Date.parse(String(item?.createdAt || item?.created_at || '')) || 0;
    bucket.lastCreatedAt = Math.max(bucket.lastCreatedAt, createdAt);
    if (speakerId === 'user') {
      bucket.userCreatedAt = createdAt || bucket.userCreatedAt;
    } else {
      bucket.responseWords += String(item?.text || '').trim().split(/\s+/).filter(Boolean).length;
    }
  });
  const turns = [...turnMap.values()].sort((a, b) => a.turnId - b.turnId);
  const recentTurns = turns.slice(-6);
  let consecutiveShortTurns = 0;
  let consecutiveLongTurns = 0;
  for (let i = recentTurns.length - 1; i >= 0; i -= 1) {
    const words = Number(recentTurns[i].responseWords || 0);
    if (words < 40) consecutiveShortTurns += 1;
    else break;
  }
  for (let i = recentTurns.length - 1; i >= 0; i -= 1) {
    const words = Number(recentTurns[i].responseWords || 0);
    if (words > 120) consecutiveLongTurns += 1;
    else break;
  }
  let lastLongPauseTurn = Number(previous.lastLongPauseTurn || 0) || 0;
  for (let i = 1; i < turns.length; i += 1) {
    const gapMs = Math.max(0, Number(turns[i].userCreatedAt || 0) - Number(turns[i - 1].userCreatedAt || 0));
    if (gapMs > 30000) lastLongPauseTurn = Number(turns[i - 1].turnId || lastLongPauseTurn || 0);
  }
  let pace = 'moderate';
  if (consecutiveShortTurns >= 3) pace = 'rapid';
  else if (consecutiveLongTurns >= 2) pace = 'slow';
  else if (lastLongPauseTurn === (currentTurn - 1) && currentTurn > 0) pace = 'paused';
  let currentBuildMomentum = clamp(Number(previous.currentBuildMomentum == null ? 0.3 : previous.currentBuildMomentum), 0, 1);
  if (pace === 'rapid') currentBuildMomentum = clamp(currentBuildMomentum + 0.1, 0, 1);
  else if (pace === 'slow' || pace === 'paused') currentBuildMomentum = clamp(currentBuildMomentum - 0.15, 0, 1);
  else currentBuildMomentum = clamp(currentBuildMomentum - 0.05, 0, 1);
  return {
    pace,
    consecutiveShortTurns,
    consecutiveLongTurns,
    lastLongPauseTurn,
    currentBuildMomentum,
    totalTurns: currentTurn
  };
}

function buildConversationContractFromSystem(system = {}) {
  const thread = system.currentThread && typeof system.currentThread === 'object' ? system.currentThread : {};
  const meta = thread.meta && typeof thread.meta === 'object' ? thread.meta : {};
  const messages = Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages : [];
  const userTurnIndex = messages.filter(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() === 'user').length;
  const lastUser = [...messages].reverse().find(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() === 'user') || null;
  const activeTopicTags = Array.isArray(meta.lastTopicTags) && meta.lastTopicTags.length
    ? uniq(meta.lastTopicTags)
    : topicTagsFromText(textValue(lastUser?.text || ''));
  const activeTopic = activeTopicTags[0] || null;
  const openLoopText = textValue(meta.lastOpenLoop || meta.activeOpenThread?.summary || '');
  const lastMessage = messages[messages.length - 1] || null;
  const lastTs = Date.parse(String(lastMessage?.createdAt || lastMessage?.created_at || thread.lastMessageAt || '')) || 0;
  const minutesSinceLastActivity = lastTs ? Math.max(0, (Date.now() - lastTs) / 60000) : 0;
  const staleThread = {
    isStale: minutesSinceLastActivity >= 360,
    minutesSinceLastActivity: Math.round(minutesSinceLastActivity),
    thresholdMinutes: 360
  };
  const rhythmState = deriveRhythmState(messages, meta.rhythmState || {}, userTurnIndex);
  return {
    activeThreadId: String(thread.id || ''),
    userTurnIndex,
    activeTopic,
    activeTopicTags,
    lastUserIntent: String(meta.intent || meta.lastIntentPattern || '').trim() || null,
    lastIntentFamily: String(meta.lastIntentPattern || meta.responsePattern || meta.intent || '').trim() || null,
    lastTargetedSpeaker: String(meta.lastTargetedSpeaker || '').trim().toLowerCase() || null,
    lastActiveSpeakers: Array.isArray(meta.lastActiveSpeakers) ? meta.lastActiveSpeakers.filter(Boolean) : [],
    lastRoomEnergy: String(meta.lastRoomEnergy || 'reactive').trim() || 'reactive',
    activeOpenThread: openLoopText ? {
      id: String(meta.activeOpenThread?.id || `${thread.id || 'thread'}::open`),
      summary: openLoopText,
      ownerSpeakerId: String(meta.activeOpenThread?.ownerSpeakerId || meta.lastTargetedSpeaker || ''),
      urgency: clamp(meta.activeOpenThread?.urgency == null ? 0.42 : meta.activeOpenThread.urgency, 0),
      createdAt: String(meta.activeOpenThread?.createdAt || thread.updatedAt || nowIso())
    } : null,
    followUpMode: Boolean(meta.lastIntentPattern && /follow|supporting-back-and-forth|banter/.test(String(meta.lastIntentPattern))),
    followUpTarget: meta.lastTargetedSpeaker ? 'same-speaker' : activeTopic ? 'same-topic' : 'unknown',
    staleThread,
    rhythmState
  };
}

function observationConcernBonus(profile = {}, text = '') {
  const concern = String(profile.identityCore?.chiefConcern || '').toLowerCase();
  const q = String(text || '').toLowerCase();
  if (!concern || !q) return 0;
  if (/standard|direction|room/.test(concern) && /\b(standard|direction|room|drift|alive|dead|coherent)\b/.test(q)) return 0.12;
  if (/sharp|accommodating|notice/.test(concern) && /\b(interesting|generic|sharp|soft|credit|trend|honest)\b/.test(q)) return 0.12;
  if (/operating|standard/.test(concern) && /\b(client|process|structure|owner|blame|question|system)\b/.test(q)) return 0.12;
  if (/hold|look/.test(concern) && /\b(system|build|api|route|technical|broken|contradiction|question)\b/.test(q)) return 0.12;
  if (/safe|heard|people/.test(concern) && /\b(people|safe|heard|energy|tone|relationship|trust|respect)\b/.test(q)) return 0.12;
  return 0;
}

function recentEventWindow(personhood = {}, limit = 16) {
  return (Array.isArray(personhood.events) ? personhood.events : []).slice(-Math.max(4, limit));
}

function extractTopicAnchor(text = '') {
  const tags = topicTagsFromText(text);
  if (tags[0] && tags[0] !== 'general') return tags[0];
  const tokens = String(text || '').toLowerCase().match(/[a-z][a-z'-]{3,}/g) || [];
  const blocked = new Set(['that', 'this', 'with', 'from', 'what', 'when', 'where', 'which', 'their', 'there', 'have', 'were', 'will', 'just', 'about', 'because']);
  return tokens.find(token => !blocked.has(token)) || 'general';
}

function detectsFactualClaim(messageText = '') {
  return /\b(is|are|was|were|always|never|the real issue|the problem is|the truth is|what matters is)\b/i.test(String(messageText || ''));
}

function detectsContradiction(messageText = '', history = []) {
  const text = String(messageText || '').toLowerCase();
  if (!/\b(but|actually|except|not|never|wrong|different|opposite)\b/.test(text)) return false;
  const anchor = extractTopicAnchor(text);
  return (Array.isArray(history) ? history : []).some(item => {
    const previous = String(item?.text || '').toLowerCase();
    if (!previous || previous === text) return false;
    return previous.includes(anchor) && /\b(always|never|is|are|was|were|fine|working|alive|broken|right|wrong)\b/.test(previous);
  });
}

function detectsSelfContradiction(messageText = '', history = [], speakerId = 'user') {
  const text = String(messageText || '').toLowerCase();
  const anchor = extractTopicAnchor(text);
  const selfHistory = (Array.isArray(history) ? history : []).filter(item => String(item?.speakerId || '').toLowerCase() === String(speakerId || '').toLowerCase());
  return selfHistory.some(item => {
    const previous = String(item?.text || '').toLowerCase();
    if (!previous || previous === text || !previous.includes(anchor)) return false;
    return (/\b(always|never|yes|no|working|broken|good|bad)\b/.test(text) && /\b(always|never|yes|no|working|broken|good|bad)\b/.test(previous) && text !== previous);
  });
}

function getLastUnansweredQuestion(history = []) {
  const recent = [...(Array.isArray(history) ? history : [])].reverse();
  return recent.find(item => String(item?.text || '').includes('?')) || null;
}

function addressesQuestion(messageText = '', questionEvent = null) {
  if (!questionEvent) return false;
  const text = String(messageText || '').toLowerCase();
  const questionText = String(questionEvent?.text || '').toLowerCase();
  const anchor = extractTopicAnchor(questionText);
  if (anchor && text.includes(anchor)) return true;
  if (String(questionEvent?.speakerId || '').toLowerCase() !== 'user' && text.includes(String(questionEvent?.speakerId || '').toLowerCase())) return true;
  return /\b(yes|no|because|it is|it was|i think|my answer|the answer)\b/.test(text);
}

function detectsTopicShift(messageText = '', history = []) {
  const currentTags = topicTagsFromText(messageText);
  const last = [...(Array.isArray(history) ? history : [])].reverse().find(item => textValue(item?.text || '')) || null;
  if (!last) return false;
  const previousTags = topicTagsFromText(textValue(last.text || ''));
  return weightedJaccard(currentTags, previousTags) < 0.2 && previousTags[0] && previousTags[0] !== 'general';
}

function detectsAllianceSignal(messageText = '', observerId = '', history = []) {
  const text = String(messageText || '').toLowerCase();
  const name = String(observerId || '').toLowerCase();
  if (name && new RegExp(`\\b(${name}|${SPEAKER_NAMES[name]?.toLowerCase() || name})\\b`).test(text) && /\b(exactly|yes|right|with you|agree|same)\b/.test(text)) return true;
  const last = [...(Array.isArray(history) ? history : [])].reverse().find(item => String(item?.speakerId || '').toLowerCase() === observerId) || null;
  return !!last && /\b(exactly|yes|right|with you|agree|same)\b/.test(text);
}

function detectsCreditTaking(messageText = '', speakerId = '', history = []) {
  const text = String(messageText || '').toLowerCase();
  if (!/\b(i said|i already said|that was my point|as i said|my point was)\b/.test(text)) return false;
  const lastOther = [...(Array.isArray(history) ? history : [])].reverse().find(item => {
    const otherSpeaker = String(item?.speakerId || '').toLowerCase();
    return otherSpeaker && otherSpeaker !== String(speakerId || '').toLowerCase();
  }) || null;
  if (!lastOther) return false;
  const anchor = extractTopicAnchor(textValue(lastOther.text || ''));
  return !!anchor && text.includes(anchor);
}

function detectsExclusionMove(messageText = '', observerId = '', history = []) {
  const text = String(messageText || '').toLowerCase();
  const firstName = String(SPEAKER_NAMES[observerId] || observerId).toLowerCase();
  if (firstName && new RegExp(`\\bnot\\s+${firstName}\\b|\\blet\\s+${firstName}\\s+sit\\b|\\bignore\\s+${firstName}\\b`, 'i').test(text)) return true;
  if (/\b(let them answer|stay out of it|not your lane|not for you|you can sit this one out)\b/i.test(text)) return true;
  const lastQuestion = getLastUnansweredQuestion(history);
  return !!lastQuestion && String(lastQuestion?.targetSpeakerId || '').toLowerCase() === observerId && !addressesQuestion(messageText, lastQuestion);
}

function detectSignals(messageText = '', speakerId = '', observerId = '', currentTurn = 0, history = [], personhood = {}) {
  const text = String(messageText || '');
  const lower = text.toLowerCase();
  const signals = [];
  if (detectsContradiction(text, history)) signals.push('factual-contradiction');
  if (String(speakerId || '').toLowerCase() === 'user' && detectsSelfContradiction(text, history, 'user')) signals.push('contradiction-of-self');
  if (/\b(actually|i know|in my experience|as someone who|let me be clear|the real issue|the truth is|what you need to understand)\b/i.test(lower)) signals.push('status-claim');
  if (/\b(that'?s interesting but|sure,?\s*however|i see what you mean but|fair enough|noted\.|maybe,?\s*but|right,?\s*but)\b/i.test(lower)) signals.push('soft-dismissal');
  const lastQ = getLastUnansweredQuestion(history);
  if (lastQ && !addressesQuestion(text, lastQ)) signals.push('open-question-unanswered');
  if (/\b(exactly|well said|good point|i love that|yes,?\s+that|that'?s (right|correct|spot on|perfect)|great|brilliant)\b/i.test(lower)) signals.push('praise');
  if (/\b(that'?s why|the problem is|the issue is|you always|you never|that failed because|went wrong)\b/i.test(lower)) signals.push('blame');
  if (/\b(i'?m not sure|honestly|i don'?t know|this is hard|i'?m struggling|i feel like|i might be wrong)\b/i.test(lower)) signals.push('vulnerability-signal');
  if (/\b(my fault|that'?s on me|i know,?\s*i know|embarrassingly|i'?ll admit)\b/i.test(lower)) signals.push('humor-directed-at-self');
  if (detectsTopicShift(text, history)) signals.push('topic-hijack');
  if (/(!{2,})|([A-Z]{3,})|(\bno,?\s*(seriously|actually|look)\b)/.test(text)) signals.push('tension-escalation');
  if (detectsAllianceSignal(text, observerId, history)) signals.push('alliance-signal');
  if (detectsCreditTaking(text, speakerId, history)) signals.push('credit-taking');
  if (detectsExclusionMove(text, observerId, history)) signals.push('exclusion-move');
  return uniq(signals).filter(signal => OBSERVABLE_SIGNALS.includes(signal));
}

function computeSalience(detectedSignals = [], observerId = '', lens = {}, messageText = '', holdingState = {}, identityCore = {}) {
  let score = 0.05;
  const watches = normalizeSignals(lens.observationBias?.watchesFor || []);
  const blindSpots = normalizeSignals(lens.observationBias?.blindSpots || []);
  detectedSignals.forEach((signal) => {
    if (watches.includes(signal)) score += 0.22;
    else if (blindSpots.includes(signal)) score -= 0.08;
    else score += 0.08;
  });
  const firstName = String(SPEAKER_NAMES[observerId] || observerId).toLowerCase();
  if (firstName && String(messageText || '').toLowerCase().includes(firstName)) score += 0.35;
  if (holdingState?.isHolding && holdingState?.topicAnchor && String(messageText || '').toLowerCase().includes(String(holdingState.topicAnchor || '').toLowerCase())) score += 0.2;
  score += observationConcernBonus({ identityCore }, messageText);
  return Math.min(1, Math.max(0, score));
}

function classifyReaction(detectedSignals = [], salienceScore = 0, observerId = '', speakerId = '', lens = {}) {
  if (salienceScore < 0.1) return 'neutral';
  const drive = String(lens.primaryDrive || '');
  if (detectedSignals.includes('factual-contradiction') && drive === 'intellectual-dominance') return 'disagreement';
  if (detectedSignals.includes('vulnerability-signal') && drive === 'care-and-protection') return 'concern';
  if (detectedSignals.includes('tension-escalation') && drive === 'social-harmony') return 'discomfort';
  if (detectedSignals.includes('credit-taking')) return normalizeSignals(lens.observationBias?.watchesFor || []).includes('credit-taking') ? 'disagreement' : 'neutral';
  if (detectedSignals.includes('praise')) return salienceScore > 0.5 ? 'admiration' : 'agreement';
  if (detectedSignals.includes('exclusion-move') && drive === 'care-and-protection') return 'discomfort';
  if (detectedSignals.includes('status-claim') && String(speakerId || '').toLowerCase() !== 'user') return drive === 'intellectual-dominance' ? 'disagreement' : 'interest';
  if (detectedSignals.includes('alliance-signal')) return 'agreement';
  if (detectedSignals.includes('humor-directed-at-self')) return 'amusement';
  return salienceScore >= 0.35 ? 'interest' : 'neutral';
}

function determineReleaseCondition(observation = {}, lens = {}) {
  const signals = observation.detectedSignals || [];
  if (signals.includes('factual-contradiction')) return 'contradiction-opens';
  if (signals.includes('open-question-unanswered')) return 'next-gap';
  if (signals.includes('tension-escalation')) return 'tension-threshold';
  if (String(lens.primaryDrive || '') === 'care-and-protection') return 'direct-address';
  if (String(lens.primaryDrive || '') === 'intellectual-dominance') return 'someone-else-says-it-wrong';
  return 'next-gap';
}

function holdingReleaseReady(holding = {}, contract = {}, context = {}, speakerId = '') {
  if (!holding?.isHolding) return false;
  const pressure = Number(holding.pressureScore || 0);
  const topicAnchor = String(holding.topicAnchor || '').toLowerCase();
  const tags = Array.isArray(context.tags) ? context.tags.map(item => String(item || '').toLowerCase()) : [];
  const question = String(context.question || '').toLowerCase();
  const firstName = String(SPEAKER_NAMES[speakerId] || speakerId).toLowerCase();
  switch (String(holding.releaseCondition || 'next-gap')) {
    case 'next-gap':
      return pressure >= 0.7 && ['slow', 'paused'].includes(String(contract.rhythmState?.pace || 'moderate'));
    case 'direct-address':
      return (context.target && String(context.target || '').toLowerCase() === speakerId) || (firstName && question.includes(firstName));
    case 'topic-return':
      return !!topicAnchor && (tags.includes(topicAnchor) || question.includes(topicAnchor));
    case 'contradiction-opens':
      return pressure >= 0.5 && Boolean(context.topObservation && (context.topObservation.detectedSignals || []).includes('factual-contradiction'));
    case 'someone-else-says-it-wrong':
      return pressure >= 0.6 && Boolean(context.topObservation && context.topObservation.reaction === 'disagreement');
    case 'tension-threshold':
      return pressure >= 0.55 && Number(contract.rhythmState?.currentBuildMomentum || 0) >= 0.6;
    default:
      return pressure >= 0.7;
  }
}

function buildPeerObservation(observerId, event = {}, personhood = {}, contract = {}) {
  const profile = personhood.profiles?.[observerId] || defaultProfile(observerId);
  const live = personhood.liveState?.[observerId] || defaultLiveState(observerId);
  const text = textValue(event.text || '');
  const tags = topicTagsFromText(text);
  const history = recentEventWindow(personhood, 16);
  const detectedSignals = detectSignals(text, String(event.speakerId || '').toLowerCase(), observerId, contract.userTurnIndex, history, personhood);
  const salience = computeSalience(detectedSignals, observerId, profile.cognitiveLens || {}, text, personhood.holding?.[observerId] || {}, profile.identityCore || {});
  const reaction = classifyReaction(detectedSignals, salience, observerId, String(event.speakerId || '').toLowerCase(), profile.cognitiveLens || {});
  return {
    observedEventId: String(event.id || ''),
    observerSpeakerId: observerId,
    speakerSpeakerId: String(event.speakerId || '').toLowerCase(),
    reaction,
    salienceScore: salience,
    detectedSignals,
    heldResponse: null,
    suppressedUntilTurn: salience >= 0.45 ? contract.userTurnIndex + 1 : null,
    topicTags: tags,
    targetType: String(event.targetType || ''),
    targetSpeakerId: String(event.targetSpeakerId || ''),
    createdAt: nowIso(),
    directMention: text.toLowerCase().includes(String(SPEAKER_NAMES[observerId] || observerId).toLowerCase())
  };
}

function applyObservationToLiveState(live = {}, observation = {}) {
  const next = { ...live };
  switch (observation.reaction) {
    case 'agreement':
      next.curiosity = clamp((next.curiosity || 0) + 0.03, 0);
      break;
    case 'interest':
      next.curiosity = clamp((next.curiosity || 0) + 0.07, 0);
      next.needToBeSeen = clamp((next.needToBeSeen || 0) + 0.02, 0);
      break;
    case 'disagreement':
      next.urgeToDefend = clamp((next.urgeToDefend || 0) + 0.14, 0);
      next.irritation = clamp((next.irritation || 0) + 0.08, 0);
      next.needToBeSeen = clamp((next.needToBeSeen || 0) + 0.06, 0);
      break;
    case 'amusement':
      next.playfulness = clamp((next.playfulness || 0) + 0.06, 0);
      next.urgeToTease = clamp((next.urgeToTease || 0) + 0.08, 0);
      break;
    case 'discomfort':
    case 'concern':
      next.urgeToWithdraw = clamp((next.urgeToWithdraw || 0) + 0.08, 0);
      next.stress = clamp((next.stress || 0) + 0.06, 0);
      break;
    case 'jealousy':
      next.needToBeSeen = clamp((next.needToBeSeen || 0) + 0.1, 0);
      next.resentment = clamp((next.resentment || 0) + 0.07, 0);
      break;
    case 'admiration':
      next.curiosity = clamp((next.curiosity || 0) + 0.08, 0);
      next.socialBattery = clamp((next.socialBattery || 0) + 0.04, 0);
      break;
    default:
      next.boredom = clamp((next.boredom || 0) + 0.01, 0);
      break;
  }
  if (observation.targetSpeakerId) next.attentionTarget = observation.targetSpeakerId;
  next.unresolvedUrgeLabel = observation.reaction === 'disagreement'
    ? 'naming-contradiction'
    : observation.reaction === 'discomfort' || observation.reaction === 'concern'
      ? 'surfacing-held-tension'
      : observation.reaction === 'interest' || observation.reaction === 'admiration'
        ? 'genuine-interest'
        : next.unresolvedUrgeLabel || '';
  next.unresolvedUrgeScore = observation.salienceScore >= 0.45
    ? clamp(Math.max(next.unresolvedUrgeScore || 0, observation.salienceScore * 0.76), 0)
    : clamp((next.unresolvedUrgeScore || 0) * 0.92, 0);
  if (next.unresolvedUrgeScore < 0.12) next.unresolvedUrgeLabel = '';
  next.currentMood = deriveMoodLabel(next);
  return next;
}

function relationshipEventTypeFromObservation(observation = {}) {
  if (observation.reaction === 'disagreement' || observation.reaction === 'discomfort') return 'public-contradiction';
  if (observation.reaction === 'amusement') return 'shared-joke';
  if (observation.reaction === 'agreement') return 'praise';
  if (observation.reaction === 'jealousy') return 'blame';
  return '';
}

function applyRelationshipEvent(edge = {}, event = {}) {
  const next = { ...edge };
  if (event.type === 'public-contradiction') {
    next.friction = clamp((next.friction || 0) + 0.04, 0);
    next.resentment = clamp((next.resentment || 0) + 0.03, 0);
    next.respect = clamp((next.respect || 0) + 0.01, 0);
  } else if (event.type === 'shared-joke') {
    next.chemistry = clamp((next.chemistry || 0) + 0.03, 0);
    next.warmth = clamp((next.warmth || 0) + 0.02, 0);
  } else if (event.type === 'praise') {
    next.warmth = clamp((next.warmth || 0) + 0.02, 0);
    next.trust = clamp((next.trust || 0) + 0.02, 0);
  } else if (event.type === 'blame') {
    next.jealousy = clamp((next.jealousy || 0) + 0.03, 0);
    next.friction = clamp((next.friction || 0) + 0.02, 0);
  }
  next.recentTriggerEventId = String(event.id || '');
  return next;
}

function rememberObservation(memoryState = {}, observation = {}, event = {}, contract = {}) {
  const memories = Array.isArray(memoryState.memories) ? memoryState.memories.slice(-24).map(item => ({
    ...item,
    emotionalWeight: clamp(Number(item.emotionalWeight || 0) - Number(item.decayRate || 0.05), 0, 1)
  })).filter(item => Number(item.emotionalWeight || 0) >= 0.05) : [];
  if (observation.salienceScore < 0.4) return { ...memoryState, memories };
  const anchor = extractTopicAnchor(textValue(event.text || ''));
  const existing = memories.find(item => String(item.content || '').toLowerCase().includes(anchor));
  if (existing) {
    existing.mentionCount = Number(existing.mentionCount || 0) + 1;
    existing.emotionalWeight = clamp(Number(existing.emotionalWeight || 0) + 0.15, 0, 1);
    existing.lastReferencedTurn = contract.userTurnIndex;
    return { ...memoryState, memories: memories.slice(-24) };
  }
  const type = observation.detectedSignals.includes('factual-contradiction') || observation.detectedSignals.includes('contradiction-of-self')
    ? 'contradiction-logged'
    : observation.reaction === 'amusement'
    ? 'shared-laugh'
    : observation.reaction === 'disagreement' || observation.reaction === 'discomfort' || observation.reaction === 'concern'
      ? 'witnessed-conflict'
      : observation.detectedSignals.includes('open-question-unanswered')
        ? 'unresolved-tension'
        : observation.reaction === 'interest' || observation.reaction === 'admiration'
        ? 'said-by-other'
        : 'said-by-self';
  memories.push({
    id: `mem_${observation.observerSpeakerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sourceEventId: String(event.id || ''),
    content: textValue(event.text || '').slice(0, 220),
    emotionalWeight: clamp(observation.salienceScore, 0),
    mentionCount: 0,
    lastReferencedTurn: contract.userTurnIndex,
    decayRate: observation.salienceScore >= 0.75 ? 0.02 : observation.salienceScore >= 0.5 ? 0.05 : 0.1,
    type,
    speakerId: String(event.speakerId || '').toLowerCase(),
    topicTags: observation.topicTags || []
  });
  return { ...memoryState, memories: memories.slice(-24) };
}

function rememberDevelopment(personhood = {}, observerId = '', observation = {}, event = {}, contract = {}) {
  const current = personhood.development?.[observerId] && typeof personhood.development[observerId] === 'object'
    ? personhood.development[observerId]
    : {
        speakerId: observerId,
        userBeliefs: [],
        peerBeliefs: {},
        unresolvedThreads: [],
        tasteAnchors: []
      };
  const text = textValue(event.text || '');
  const topicAnchor = extractTopicAnchor(text);
  const next = {
    ...current,
    userBeliefs: Array.isArray(current.userBeliefs) ? current.userBeliefs.slice(-6) : [],
    peerBeliefs: current.peerBeliefs && typeof current.peerBeliefs === 'object' ? { ...current.peerBeliefs } : {},
    unresolvedThreads: Array.isArray(current.unresolvedThreads) ? current.unresolvedThreads.slice(-6) : [],
    tasteAnchors: Array.isArray(current.tasteAnchors) ? current.tasteAnchors.slice(-8) : []
  };
  if (String(event.speakerId || '').toLowerCase() === 'user' && Number(observation.salienceScore || 0) >= 0.5) {
    next.userBeliefs.unshift({
      text: compact(text, 160),
      topicAnchor,
      turn: contract.userTurnIndex,
      reaction: observation.reaction
    });
    next.userBeliefs = next.userBeliefs.slice(0, 6);
  }
  if (String(event.speakerId || '').toLowerCase() !== 'user' && Number(observation.salienceScore || 0) >= 0.55) {
    const peerId = String(event.speakerId || '').toLowerCase();
    const existing = Array.isArray(next.peerBeliefs[peerId]) ? next.peerBeliefs[peerId].slice(-3) : [];
    existing.unshift({
      text: compact(text, 140),
      topicAnchor,
      turn: contract.userTurnIndex,
      reaction: observation.reaction
    });
    next.peerBeliefs[peerId] = existing.slice(0, 4);
  }
  if (observation.detectedSignals.includes('open-question-unanswered') || observation.detectedSignals.includes('factual-contradiction') || Number(observation.salienceScore || 0) >= 0.72) {
    next.unresolvedThreads.unshift({
      topicAnchor,
      text: compact(text, 160),
      turn: contract.userTurnIndex,
      signal: observation.detectedSignals[0] || observation.reaction
    });
    next.unresolvedThreads = next.unresolvedThreads.slice(0, 6);
  }
  if (['creative', 'food', 'people'].includes(topicAnchor) || observation.reaction === 'admiration' || observation.reaction === 'interest') {
    next.tasteAnchors.unshift({
      topicAnchor,
      text: compact(text, 120),
      turn: contract.userTurnIndex
    });
    next.tasteAnchors = next.tasteAnchors.slice(0, 8);
  }
  personhood.development[observerId] = next;
}

function updateHoldingState(current = {}, observation = {}, messageText = '', currentTurn = 0, lens = {}, turnSpeakerSet = new Set()) {
  const next = {
    speakerId: current.speakerId || observation.observerSpeakerId,
    isHolding: Boolean(current.isHolding),
    heldSinceUserTurn: Number(current.heldSinceUserTurn || 0) || 0,
    pressureScore: clamp(current.pressureScore, 0),
    releaseCondition: String(current.releaseCondition || 'next-gap'),
    topicAnchor: textValue(current.topicAnchor || '')
  };
  if (turnSpeakerSet.has(observation.observerSpeakerId)) return next;
  const threshold = Number(lens.holdingPatternThreshold || 0.64) || 0.64;
  if (!next.isHolding && observation.salienceScore >= (threshold - 0.1)) {
    return {
      speakerId: observation.observerSpeakerId,
      isHolding: true,
      heldSinceUserTurn: currentTurn,
      pressureScore: clamp(observation.salienceScore * 0.4, 0, 1),
      releaseCondition: determineReleaseCondition(observation, lens),
      topicAnchor: extractTopicAnchor(messageText)
    };
  }
  if (next.isHolding) {
    let pressure = Number(next.pressureScore || 0);
    pressure += 0.12;
    if (observation.salienceScore > 0.7) next.topicAnchor = extractTopicAnchor(messageText);
    next.pressureScore = clamp(pressure, 0, 1);
  }
  return next;
}

function advanceHoldingStates(personhood = {}, contract = {}, topicTags = [], turnSpeakerSet = new Set()) {
  for (const id of SPEAKER_IDS) {
    const current = personhood.holding[id];
    if (!current?.isHolding) continue;
    if (turnSpeakerSet.has(id)) {
      personhood.holding[id] = {
        speakerId: id,
        isHolding: false,
        heldSinceUserTurn: contract.userTurnIndex,
        pressureScore: 0,
        releaseCondition: 'next-gap',
        topicAnchor: ''
      };
      personhood.liveState[id].unresolvedUrgeScore = clamp((personhood.liveState[id].unresolvedUrgeScore || 0) * 0.4, 0);
      continue;
    }
    let pressure = Number(current.pressureScore || 0);
    pressure += 0.04;
    const memories = personhood.salienceMemory?.[id]?.memories || [];
    const relevantMemory = memories.find(memory => weightedJaccard(memory.topicTags || [], topicTags) >= 0.34);
    if (relevantMemory) pressure += 0.12;
    if (personhood.liveState[id].attentionTarget && personhood.liveState[id].attentionTarget !== 'studio') pressure += 0.08;
    if (contract.rhythmState?.pace === 'slow' || contract.rhythmState?.pace === 'paused') pressure += 0.08;
    if ((contract.userTurnIndex - Number(current.heldSinceUserTurn || 0)) >= 6) {
      personhood.holding[id] = {
        speakerId: id,
        isHolding: false,
        heldSinceUserTurn: contract.userTurnIndex,
        pressureScore: 0,
        releaseCondition: 'next-gap',
        topicAnchor: ''
      };
      continue;
    }
    personhood.holding[id] = { ...current, pressureScore: clamp(pressure, 0) };
  }
}

function roomTensionLevel(personhood = {}) {
  return clamp(mean(SPEAKER_IDS.map(id => (Number(personhood.liveState?.[id]?.stress || 0) + Number(personhood.liveState?.[id]?.irritation || 0) + Number(personhood.holding?.[id]?.pressureScore || 0)) / 3)), 0, 1);
}

function findUnresolvedTopic(personhood = {}, id = '', currentTurn = 0, minAge = 4) {
  const memories = Array.isArray(personhood.salienceMemory?.[id]?.memories) ? personhood.salienceMemory[id].memories : [];
  const candidate = memories
    .filter(item => (currentTurn - Number(item.lastReferencedTurn || 0)) >= minAge && Number(item.emotionalWeight || 0) >= 0.35)
    .sort((a, b) => Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0))[0] || null;
  return candidate ? extractTopicAnchor(candidate.content || '') : '';
}

function maybeQueueAutonomousImpulse(personhood = {}, observerId = '', observation = {}, messageText = '', currentTurn = 0, lens = {}, contract = {}) {
  const queue = Array.isArray(personhood.autonomyQueue?.[observerId]) ? personhood.autonomyQueue[observerId].slice(-3) : [];
  if (queue.length >= 3) return queue;
  const live = personhood.liveState?.[observerId] || defaultLiveState(observerId);
  const unresolvedTopic = findUnresolvedTopic(personhood, observerId, currentTurn, 4);
  if (unresolvedTopic && !queue.find(item => item.type === 'callback')) {
    queue.push({
      id: `auto_${observerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      speakerId: observerId,
      type: 'callback',
      topicAnchor: unresolvedTopic,
      eligibleAfterUserTurn: currentTurn + 2,
      expiresAfterUserTurn: currentTurn + 6,
      priority: 0.6
    });
  }
  if (observerId === 'vanya' && roomTensionLevel(personhood) > 0.6 && !queue.find(item => item.type === 'check-in')) {
    queue.push({
      id: `auto_${observerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      speakerId: observerId,
      type: 'check-in',
      topicAnchor: 'room temperature',
      eligibleAfterUserTurn: currentTurn + 1,
      expiresAfterUserTurn: currentTurn + 3,
      priority: 0.75
    });
  }
  if (Number(observation.salienceScore || 0) >= 0.7 && observation.reaction === 'disagreement' && !queue.find(item => item.topicAnchor === extractTopicAnchor(messageText) && item.type === 'opinion-without-prompt')) {
    queue.push({
      id: `auto_${observerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      speakerId: observerId,
      type: 'opinion-without-prompt',
      topicAnchor: extractTopicAnchor(messageText),
      eligibleAfterUserTurn: currentTurn + 1,
      expiresAfterUserTurn: currentTurn + 4,
      priority: clamp(Number(observation.salienceScore || 0) * 0.9, 0, 1)
    });
  }
  if (observation.detectedSignals?.includes('exclusion-move') && ['vanya', 'leah'].includes(observerId) && !queue.find(item => item.type === 'tension-surface')) {
    queue.push({
      id: `auto_${observerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      speakerId: observerId,
      type: 'tension-surface',
      topicAnchor: extractTopicAnchor(messageText),
      eligibleAfterUserTurn: currentTurn + 1,
      expiresAfterUserTurn: currentTurn + 5,
      priority: 0.8
    });
  }
  if ((personhood.holding?.[observerId]?.isHolding) && Number(personhood.holding?.[observerId]?.pressureScore || 0) >= Math.max(0.45, (Number(lens.holdingPatternThreshold || 0.64) - 0.1))) {
    const releaseType = String(personhood.holding?.[observerId]?.releaseCondition || 'next-gap');
    const type = releaseType === 'someone-else-says-it-wrong'
      ? 'correction'
      : releaseType === 'topic-return'
        ? 'callback'
        : live.urgeToTease >= 0.54
          ? 'humor-moment'
          : live.urgeToDefend >= 0.48
            ? 'opinion-without-prompt'
            : 'check-in';
    if (!queue.find(item => item.type === type && item.topicAnchor === String(personhood.holding?.[observerId]?.topicAnchor || ''))) {
      queue.push({
        id: `auto_${observerId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        speakerId: observerId,
        type,
        topicAnchor: String(personhood.holding?.[observerId]?.topicAnchor || extractTopicAnchor(messageText)),
        eligibleAfterUserTurn: currentTurn + (contract.rhythmState?.pace === 'rapid' ? 1 : 0),
        expiresAfterUserTurn: currentTurn + 4,
        priority: clamp(Math.max(Number(personhood.holding?.[observerId]?.pressureScore || 0), Number(live.unresolvedUrgeScore || 0)), 0, 1)
      });
    }
  }
  return queue.slice(-3);
}

function detectCharacterToCharacterAddress(generatedText = '') {
  const matches = [];
  const text = String(generatedText || '');
  for (const id of SPEAKER_IDS) {
    const name = String(SPEAKER_NAMES[id] || id).toLowerCase();
    const rx = new RegExp(`(^|\\.|\\?|!|—|\\n)\\s*${name}[,\\s]`, 'i');
    if (rx.test(text)) matches.push(id);
  }
  return uniq(matches);
}

function boostTargetedMemberPressure(personhood = {}, targetId = '', sourceSpeakerId = '', currentTurn = 0, sourceText = '') {
  const target = String(targetId || '').toLowerCase();
  const source = String(sourceSpeakerId || '').toLowerCase();
  if (!target || !SPEAKER_IDS.includes(target) || target === source) return;
  const holding = personhood.holding?.[target] || {
    speakerId: target,
    isHolding: false,
    heldSinceUserTurn: currentTurn,
    pressureScore: 0,
    releaseCondition: 'direct-address',
    topicAnchor: ''
  };
  const edge = personhood.relationshipEdges?.[directionalKey(source, target)] || defaultRelationshipEdge(source, target, {});
  const topicAnchor = String(holding.topicAnchor || extractTopicAnchor(sourceText)).trim();
  personhood.holding[target] = {
    speakerId: target,
    isHolding: true,
    heldSinceUserTurn: holding.heldSinceUserTurn || currentTurn,
    pressureScore: clamp(Math.max(Number(holding.pressureScore || 0) + 0.25 + (Number(edge.friction || 0) * 0.08), 0.3), 0, 1),
    releaseCondition: 'direct-address',
    topicAnchor
  };
  const live = personhood.liveState?.[target] || defaultLiveState(target);
  live.attentionTarget = source || live.attentionTarget || 'studio';
  live.curiosity = clamp((live.curiosity || 0) + 0.08 + (Number(edge.chemistry || 0) * 0.05), 0, 1);
  live.urgeToDefend = clamp((live.urgeToDefend || 0) + 0.12 + (Number(edge.friction || 0) * 0.06), 0, 1);
  live.urgeToTease = clamp((live.urgeToTease || 0) + (Number(edge.chemistry || 0) * 0.04), 0, 1);
  live.unresolvedUrgeLabel = Number(live.urgeToDefend || 0) >= Number(live.urgeToTease || 0)
    ? 'naming-contradiction'
    : 'genuine-interest';
  live.unresolvedUrgeScore = clamp(Math.max(Number(live.unresolvedUrgeScore || 0), Number(personhood.holding[target].pressureScore || 0) * 0.82), 0, 1);
  live.currentMood = deriveMoodLabel(live);
  personhood.liveState[target] = live;
}

function rebuildAutonomyQueue(personhood = {}, contract = {}) {
  for (const id of SPEAKER_IDS) {
    const current = Array.isArray(personhood.autonomyQueue?.[id]) ? personhood.autonomyQueue[id] : [];
    const seen = new Set();
    personhood.autonomyQueue[id] = current
      .filter(item => item && Number(item.expiresAfterUserTurn || 0) > Number(contract.userTurnIndex || 0))
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
      .filter((item) => {
        const key = `${item.type || 'callback'}::${item.topicAnchor || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 3);
  }
}

function runObservationPass(event = {}, personhood = {}, contract = {}, turnSpeakerSet = new Set()) {
  const speakerId = String(event.speakerId || '').toLowerCase();
  const trace = [];
  for (const observerId of SPEAKER_IDS) {
    if (observerId === speakerId) continue;
    const profile = personhood.profiles?.[observerId] || defaultProfile(observerId);
    const observation = buildPeerObservation(observerId, event, personhood, contract);
    if (Number(observation.salienceScore || 0) < 0.18) {
      trace.push({
        characterId: observerId,
        salienceScore: Number(observation.salienceScore || 0),
        detectedSignals: observation.detectedSignals || [],
        reaction: observation.reaction || 'neutral',
        holdingState: personhood.holding?.[observerId] || null,
        autonomousImpulse: null,
        speakerScore: 0
      });
      continue;
    }
    personhood.peerObservations[observerId] = [...(personhood.peerObservations[observerId] || []), observation].slice(-16);
    personhood.liveState[observerId] = applyObservationToLiveState(personhood.liveState[observerId], observation);
    personhood.salienceMemory[observerId] = rememberObservation(personhood.salienceMemory[observerId], observation, event, contract);
    rememberDevelopment(personhood, observerId, observation, event, contract);
    personhood.holding[observerId] = updateHoldingState(personhood.holding[observerId], observation, textValue(event.text || ''), contract.userTurnIndex, profile.cognitiveLens || {}, turnSpeakerSet);
    personhood.autonomyQueue[observerId] = maybeQueueAutonomousImpulse(personhood, observerId, observation, textValue(event.text || ''), contract.userTurnIndex, profile.cognitiveLens || {}, contract);
    if (String(event.role || '') === 'member' && Number(observation.salienceScore || 0) >= 0.55) {
      const type = relationshipEventTypeFromObservation(observation);
      if (type) {
        const relEvent = {
          id: `rel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
          threadId: contract.activeThreadId,
          userTurnIndex: contract.userTurnIndex,
          sourceEventId: String(event.id || ''),
          type,
          fromSpeakerId: speakerId,
          toSpeakerId: observerId,
          intensity: clamp(observation.salienceScore, 0),
          createdAt: nowIso()
        };
        personhood.relationshipEvents.push(relEvent);
        const key = directionalKey(speakerId, observerId);
        personhood.relationshipEdges[key] = applyRelationshipEvent(personhood.relationshipEdges[key], relEvent);
      }
    }
    personhood.microReactions.push({
      ts: nowIso(),
      who: observerId,
      text: `${observation.reaction}:${extractTopicAnchor(event.text || '')}`,
      kind: 'micro',
      target: observation.targetSpeakerId || 'studio',
      mode: 'observation'
    });
    trace.push({
      characterId: observerId,
      salienceScore: Number(observation.salienceScore || 0),
      detectedSignals: observation.detectedSignals || [],
      reaction: observation.reaction || 'neutral',
      holdingState: personhood.holding?.[observerId] || null,
      autonomousImpulse: (personhood.autonomyQueue?.[observerId] || []).slice(-1)[0] || null,
      speakerScore: 0
    });
  }
  return trace;
}

function buildRoomFeed(messages = [], threadId = '') {
  return (Array.isArray(messages) ? messages : [])
    .filter(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() !== 'user')
    .slice(-24)
    .map(item => ({
      id: String(item?.id || ''),
      who: String(item?.speakerId || item?.speaker_id || ''),
      kind: String(item?.kind || 'message'),
      tone: String(item?.tone || ''),
      text: textValue(item?.text || ''),
      threadId: String(threadId || item?.threadId || item?.thread_id || ''),
      createdAt: String(item?.createdAt || item?.created_at || '')
    }))
    .filter(item => item.text);
}

function persistConsciousRuntime(system = {}, personhood = {}, messages = [], contract = {}) {
  const runtime = getRuntimeOverlayState('runtime_overlay_room_v1');
  const current = runtime.personhood && typeof runtime.personhood === 'object' ? runtime.personhood : {};
  const latestSpark = [...messages].reverse().find(item => String(item?.kind || '').toLowerCase() === 'spark');
  const roomFeed = buildRoomFeed(messages, contract.activeThreadId);
  const updatedAt = nowIso();
  const compactLiveState = Object.fromEntries(SPEAKER_IDS.map((id) => {
    const live = personhood.liveState?.[id] || {};
    return [id, {
      currentMood: String(live.currentMood || ''),
      patience: Number(live.patience || 0) || 0,
      warmth: Number(live.warmth || 0) || 0,
      curiosity: Number(live.curiosity || 0) || 0,
      irritation: Number(live.irritation || 0) || 0,
      urgeToDefend: Number(live.urgeToDefend || 0) || 0,
      urgeToTease: Number(live.urgeToTease || 0) || 0,
      needToBeSeen: Number(live.needToBeSeen || 0) || 0,
      attentionTarget: String(live.attentionTarget || 'studio')
    }];
  }));
  const compactHolding = Object.fromEntries(SPEAKER_IDS.map((id) => {
    const holding = personhood.holding?.[id] || {};
    return [id, {
      speakerId: id,
      isHolding: Boolean(holding.isHolding),
      heldSinceUserTurn: Number(holding.heldSinceUserTurn || 0) || 0,
      pressureScore: clamp(Number(holding.pressureScore || 0), 0, 1),
      releaseCondition: String(holding.releaseCondition || 'next-gap'),
      topicAnchor: textValue(holding.topicAnchor || '')
    }];
  }));
  const compactAutonomy = Object.fromEntries(SPEAKER_IDS.map((id) => {
    const queue = Array.isArray(personhood.autonomyQueue?.[id]) ? personhood.autonomyQueue[id] : [];
    return [id, queue.slice(-2).map((item) => ({
      id: String(item?.id || ''),
      speakerId: String(item?.speakerId || id),
      type: String(item?.type || ''),
      topicAnchor: textValue(item?.topicAnchor || ''),
      eligibleAfterUserTurn: Number(item?.eligibleAfterUserTurn || 0) || 0,
      expiresAfterUserTurn: Number(item?.expiresAfterUserTurn || 0) || 0,
      priority: clamp(Number(item?.priority || 0), 0, 1)
    }))];
  }));
  const normalizedTarget = (() => {
    const raw = String(contract.lastTargetedSpeaker || '').trim().toLowerCase();
    return SPEAKER_IDS.includes(raw) ? raw : 'studio';
  })();
  const nextRuntime = {
    ...runtime,
    relationships: runtime.relationships || system.relationships || {},
    liveState: compactLiveState,
    aiCommsCenter: {
      ...(runtime.aiCommsCenter || {}),
      target: normalizedTarget,
      ambientEnabled: runtime.aiCommsCenter?.ambientEnabled !== false,
      roomMode: String(contract.rhythmState?.pace || runtime.aiCommsCenter?.roomMode || 'balanced'),
      lastAmbientAt: latestSpark ? (Date.parse(String(latestSpark.createdAt || latestSpark.created_at || '')) || Date.now()) : Number(runtime.aiCommsCenter?.lastAmbientAt || 0) || 0,
      feed: roomFeed,
      roomTone: roomFeed.slice(-10).map(item => ({
        id: item.who,
        who: item.who,
        tone: item.tone,
        kind: item.kind,
        text: item.text
      }))
    },
    personhood: {
      ...current,
      liveState: compactLiveState,
      holding: compactHolding,
      autonomyQueue: compactAutonomy,
      presence: deepClone(personhood.presence || {}),
      config: {
        ...(current.config && typeof current.config === 'object' ? current.config : {}),
        ...(personhood.config && typeof personhood.config === 'object' ? personhood.config : {})
      },
      conversationRhythm: contract.rhythmState || current.conversationRhythm || null
    }
  };
  statements.setSystemState.run({
    key: 'runtime_overlay_room_v1',
    value_json: JSON.stringify(nextRuntime),
    updated_at: updatedAt
  });
  Object.entries(personhood.liveState || {}).forEach(([characterId, payload]) => {
    statements.upsertCharacterState.run({
      character_id: characterId,
      payload_json: JSON.stringify(payload || {}),
      updated_at: updatedAt
    });
  });
  return nextRuntime;
}

function hydrateConsciousRoomSystem(system = {}) {
  const personhoodSeed = {
    profiles: system.personhood?.profiles || system.characterProfiles || {},
    liveState: system.liveState || system.personhood?.liveState || {},
    peerObservations: system.personhood?.peerObservations || system.peerObservations || {},
    holding: system.personhood?.holding || system.holding || {},
    autonomyQueue: system.personhood?.autonomyQueue || system.autonomyQueue || {},
    salienceMemory: system.personhood?.salienceMemory || system.salienceMemory || {},
    relationshipEvents: system.personhood?.relationshipEvents || system.relationshipEvents || [],
    relationshipEdges: system.personhood?.relationshipEdges || system.relationshipEdges || {},
    events: system.personhood?.events || system.roomEvents || [],
    microReactions: system.personhood?.microReactions || system.microReactions || [],
    silence: system.personhood?.silence || [],
    presence: system.personhood?.presence || {},
    development: system.personhood?.development || {},
    config: system.personhood?.config || {}
  };
  const personhood = ensureConsciousPersonhood(personhoodSeed, system.relationships || system.personhood?.relationships || {});
  const voiceValidation = validateVoiceLibraryPresent(VOICE_LIBRARY, SPEAKER_IDS);
  personhood.config = {
    ...(personhood.config || {}),
    voiceLibraryReady: voiceValidation.ok,
    voiceLibraryMissing: voiceValidation.missing,
    consciousnessLayerActive: voiceValidation.ok && personhood.config?.consciousnessLayerActive !== false,
    debugMode: Boolean(personhood.config?.debugMode)
  };
  const next = {
    ...system,
    personhood,
    characterProfiles: personhood.profiles,
    liveState: personhood.liveState,
    peerObservations: personhood.peerObservations,
    holding: personhood.holding,
    autonomyQueue: personhood.autonomyQueue,
    salienceMemory: personhood.salienceMemory,
    relationshipEvents: personhood.relationshipEvents,
    relationshipEdges: personhood.relationshipEdges,
    roomEvents: personhood.events,
    microReactions: personhood.microReactions
  };
  next.conversationContract = buildConversationContractFromSystem(next);
  next.rhythmState = next.conversationContract.rhythmState;
  return next;
}

function speakerRuntimeSignals(system = {}, speakerId = '', context = {}) {
  const hydrated = system.personhood ? system : hydrateConsciousRoomSystem(system);
  const contract = hydrated.conversationContract || buildConversationContractFromSystem(hydrated);
  const observations = Array.isArray(hydrated.peerObservations?.[speakerId]) ? hydrated.peerObservations[speakerId].slice(-6) : [];
  const holding = hydrated.holding?.[speakerId] || { pressureScore: 0 };
  const autonomy = Array.isArray(hydrated.autonomyQueue?.[speakerId]) ? hydrated.autonomyQueue[speakerId] : [];
  const memories = hydrated.salienceMemory?.[speakerId]?.memories || [];
  const tags = Array.isArray(context.tags) && context.tags.length ? context.tags : contract.activeTopicTags || [];
  const relevantObservations = observations.filter(item => {
    const overlap = weightedJaccard(item.topicTags || [], tags);
    return overlap >= 0.25 || String(item.targetSpeakerId || '') === String(context.target || '') || (context.intent === 'follow-up' && item.salienceScore >= 0.32);
  });
  const dueAutonomy = autonomy.filter(item => Number(item.eligibleAfterUserTurn || 0) <= contract.userTurnIndex);
  const memory = memories
    .filter(item => weightedJaccard(item.topicTags || [], tags) >= 0.25 || String(item.speakerId || '') === String(context.target || ''))
    .sort((a, b) => (Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0)) || (Number(b.lastReferencedTurn || 0) - Number(a.lastReferencedTurn || 0)))[0] || null;
  const observationSalienceBonus = clamp(Math.max(...relevantObservations.map(item => Number(item.salienceScore || 0)), 0), 0);
  const heldPressureBonus = clamp(Number(holding.pressureScore || 0), 0);
  const autonomyQueuePriorityBonus = clamp(Math.max(...dueAutonomy.map(item => Number(item.priority || 0)), 0), 0);
  const roomEnergyFit = clamp(Number(hydrated.characterProfiles?.[speakerId]?.energyAffinities?.[String(context.roomEnergy || contract.lastRoomEnergy || 'reactive')] || 0.5), 0);
  const topObservation = relevantObservations.sort((a, b) => Number(b.salienceScore || 0) - Number(a.salienceScore || 0))[0] || null;
  const topAutonomy = dueAutonomy.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))[0] || null;
  const releaseReady = holdingReleaseReady(holding, contract, {
    ...context,
    topObservation,
    tags,
    question: String(context.question || '')
  }, speakerId);
  return {
    observationSalienceBonus,
    heldPressureBonus,
    autonomyQueuePriorityBonus,
    roomEnergyFit,
    directMemberPressure: relevantObservations.some(item => String(item.targetType || '') === 'member' && String(item.targetSpeakerId || '') === speakerId),
    holdingReleaseReady: releaseReady,
    topObservation,
    topMemory: memory,
    topAutonomy,
    voiceLibraryReady: hydrated.personhood?.config?.voiceLibraryReady !== false
  };
}

function speakerIdFromToken(value = '') {
  return SPEAKER_NAME_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

function resolveDirectAddress(question = '', system = {}) {
  const text = String(question || '').trim();
  const lower = text.toLowerCase();
  const contract = system.conversationContract || buildConversationContractFromSystem(system);
  const replySpeakerId = String(system.replyContext?.speakerId || '').trim().toLowerCase();
  const leadingMatch = lower.match(/^\s*(?:(?:and|but|so|okay|ok|right|well|hey|yo|lol|haha|lmao)\s+)?(aisha|leah|claudia|grok|gerhard|vanya)\b[\s,:-]*/i);
  const addressedSpeakerId = speakerIdFromToken(leadingMatch?.[1] || '');
  const mentionedSpeakerIds = uniq((lower.match(/\b(aisha|leah|claudia|grok|gerhard|vanya)\b/ig) || []).map(speakerIdFromToken).filter(Boolean));
  const directedVerbMatch = lower.match(/\b(answer|respond|reply|talk|speak|tell)\s+(?:to\s+|with\s+|for\s+|about\s+)?(aisha|leah|claudia|grok|gerhard|vanya)\b/i);
  const whatAboutMatch = lower.match(/\bwhat about\s+(aisha|leah|claudia|grok|gerhard|vanya)\b/i);
  const thinkAboutMatch = lower.match(/\b(aisha|leah|claudia|grok|gerhard|vanya)\b[\s,]+what do you think\b/i);
  const checkInMatch = lower.match(/\b(?:lol|haha|lmao|hey|yo|okay|ok|right|well)\s+(aisha|leah|claudia|grok|gerhard|vanya)\b/i);
  const mentionedSpeakerId = speakerIdFromToken(directedVerbMatch?.[2] || whatAboutMatch?.[1] || thinkAboutMatch?.[1] || checkInMatch?.[1] || '');
  const followUpLike = /^(what|why|how|who)\??$/.test(lower)
    || /^(and|but|so|also|wait|okay|ok|right|then|nah|no|yes)\b/.test(lower)
    || /^(what about|how about|go on|continue|tell me more|keep going|and you)\b/.test(lower);
  const inheritedTargetSpeakerId = !addressedSpeakerId && !mentionedSpeakerId && followUpLike
    ? String(contract.lastTargetedSpeaker || '').trim().toLowerCase()
    : '';
  let targetSpeakerId = addressedSpeakerId;
  if (!targetSpeakerId && mentionedSpeakerIds.length === 1 && (whatAboutMatch || thinkAboutMatch || /^(what about|and what about|how about)\b/i.test(lower))) {
    targetSpeakerId = mentionedSpeakerIds[0];
  }
  if (!targetSpeakerId && mentionedSpeakerIds.length === 1 && /^(lol|haha|lmao|hey|yo|okay|ok|right|well)\b/i.test(lower)) {
    targetSpeakerId = mentionedSpeakerIds[0];
  }
  if (!targetSpeakerId && replySpeakerId && SPEAKER_IDS.includes(replySpeakerId)) targetSpeakerId = replySpeakerId;
  if (!targetSpeakerId && inheritedTargetSpeakerId && SPEAKER_IDS.includes(inheritedTargetSpeakerId)) targetSpeakerId = inheritedTargetSpeakerId;
  return {
    addressedSpeakerId,
    mentionedSpeakerId: mentionedSpeakerId && mentionedSpeakerId !== targetSpeakerId ? mentionedSpeakerId : '',
    mentionedSpeakerIds,
    replyTargetSpeakerId: replySpeakerId && SPEAKER_IDS.includes(replySpeakerId) ? replySpeakerId : '',
    inheritedTargetSpeakerId: inheritedTargetSpeakerId && SPEAKER_IDS.includes(inheritedTargetSpeakerId) ? inheritedTargetSpeakerId : '',
    targetSpeakerId: targetSpeakerId && SPEAKER_IDS.includes(targetSpeakerId) ? targetSpeakerId : '',
    targetType: targetSpeakerId ? 'member' : 'room'
  };
}

function inferIntentFamily(question = '', resolution = {}, system = {}) {
  const q = String(question || '').trim().toLowerCase();
  if (resolution?.targetSpeakerId) return 'direct-answer';
  if (!q) return 'quiet-room';
  const bareThoughtPrompt = /^(so\s+)?(any\s+)?(thoughts|ideas)\??$/.test(q);
  const collectiveRoomPrompt = /\b(team|everyone|everybody|you all|all of you|each other)\b/.test(q)
    || /\b(real check-?in|check in|be honest|room right now)\b/.test(q);
  const roomCritiquePrompt = collectiveRoomPrompt && /\b(broken|wrong|stale|dead|fail|failing|failure|issue|problem|drift|alive|honest|check-?in)\b/.test(q);
  const diagnosticPrompt = /\b(bug|bugs|glitch|glitches|broken|failing|failure|issue|issues|problem|problems|not working|not functioning|system is not functioning|system not functioning)\b/.test(q)
    || /\b(what(?:'s| is) broken here|wrong with this chat)\b/.test(q);
  if (diagnosticPrompt && /\b(automation|technical|implementation|code|backend|frontend|runtime|system|architecture|route|api|database|sqlite|server|build|logic|deploy|chat)\b/.test(q)) return 'technical-diagnosis';
  if (roomCritiquePrompt) return 'pulse-critique';
  if (/\b(automation|technical|implementation|code|backend|frontend|bug|runtime|system|architecture|route|api|database|sqlite|server|build|logic|deploy)\b/.test(q)) return 'technical-diagnosis';
  if (/\b(studio pulse|pulse|this room|the room|room(?:'s|s)?|chat(?:'s|s)?|model(?:'s|s)?|system(?:'s|s)?|runtime(?:'s|s)?)\b.*\b(failure|failures|problem|problems|wrong|weakness|weaknesses|broken|issue|issues|stale|dead|drift|alive|fix)\b|\b(failure|failures|problem|problems|wrong|weakness|weaknesses|broken|issue|issues|stale|dead|drift|alive|fix)\b.*\b(studio pulse|pulse|this room|the room|chat(?:'s|s)?|model(?:'s|s)?|system(?:'s|s)?|runtime(?:'s|s)?)\b/.test(q)) return 'pulse-critique';
  if (/\b(boss|chair|lead|authority|final call|who leads|who owns|decision|standards)\b/.test(q)) return 'governance';
  if (/\b(joke|funny|laugh|make me laugh|humour|humor)\b/.test(q)) return 'joke-room';
  if (/\b(hungry|food|lunch|dinner|eat|drink|coffee|tea|snack|pizza|burger|fries|salad)\b/.test(q)) return 'food-room';
  if (!bareThoughtPrompt && /\b(thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts|creative|brand|caption|content|trend|look|scene|taste|style|hook|campaign|post)\b/.test(q)) return 'creative-room';
  if (/^(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team/.test(q)) return 'greeting';
  if (/\b(who('?s| is)\s+(online|here)|who is around|how('?s| is) everyone feeling|how is everyone|how are you all)\b/.test(q)) return 'playful-room';
  if (bareThoughtPrompt || collectiveRoomPrompt) return 'playful-room';
  if (/\b(team|culture|people|relationship|mood|vibe|energy|feel|alive|tone|friends|frenemies|chemistry|crush|flirt|romance|dating)\b/.test(q)) return 'playful-room';
  if (q.split(/\s+/).length <= 2 || /^(what|why|how|who)\??$/.test(q)) return 'quiet-room';
  return 'casual-room';
}

function intentAffinityBonus(id = '', intentFamily = '') {
  const intent = String(intentFamily || '').trim().toLowerCase();
  const table = {
    greeting: { vanya: 24, leah: 16, aisha: 12, claudia: 4, grok: 2 },
    'casual-room': { vanya: 18, leah: 14, aisha: 10, claudia: 6, grok: 4 },
    'playful-room': { vanya: 24, leah: 18, grok: 10, aisha: 8, claudia: 4 },
    'joke-room': { vanya: 26, leah: 20, grok: 16, aisha: 6, claudia: 2 },
    'food-room': { vanya: 20, leah: 16, aisha: 10, grok: 6, claudia: 4 },
    'creative-room': { leah: 24, aisha: 18, vanya: 10, grok: 8, claudia: 6 },
    'pulse-critique': { grok: 18, leah: 16, aisha: 14, claudia: 13, vanya: 10 },
    'technical-diagnosis': { grok: 24, claudia: 16, aisha: 8, leah: 2, vanya: 2 },
    'governance': { aisha: 24, claudia: 12, vanya: 8, grok: 4, leah: 4 }
  };
  return Number(table[intent]?.[id] || 0);
}

function computeTopicMatchScore(id = '', message = '') {
  const msg = String(message || '').toLowerCase();
  const maps = {
    aisha: /(direction|identity|taste|standard|standards|room|alive|drift|weakness|decision|authority|fix|coherent|creative)/,
    leah: /(trend|caption|content|culture|johannesburg|feed|vibe|creative|platform|audience|style|brand|idea|ideas|thoughts|scene|taste)/,
    claudia: /(client|ops|operations|structure|process|delivery|timeline|onboarding|premium|service|owner|workflow|scope|review|planning|follow-up)/,
    grok: /(system|api|bug|route|backend|frontend|technical|code|build|automation|workflow|tool|runtime|architecture|sqlite|database|server|logic)/,
    vanya: /(people|team|hiring|culture|feeling|emotion|standard|relationship|trust|human|voice|safe|energy|chemistry|crush|flirt|mood)/
  };
  return maps[id]?.test(msg) ? 40 : 0;
}

function relationshipWarmthFor(system = {}, id = '') {
  const userPair = system.relationships?.[pairKey(id, 'user')] || {};
  const userEdge = system.personhood?.relationshipEdges?.[directionalKey(id, 'user')] || {};
  return clamp(Number(userEdge.warmth == null ? userPair.warmth == null ? 0.5 : userPair.warmth : userEdge.warmth), 0, 1);
}

function scoreSpeakerCandidates(question = '', system = {}, contract = null, resolution = null, overridePersonhood = null) {
  const hydrated = system.personhood ? system : hydrateConsciousRoomSystem(system);
  const activeContract = contract || hydrated.conversationContract || buildConversationContractFromSystem(hydrated);
  const direct = resolution || resolveDirectAddress(question, hydrated);
  const personhood = overridePersonhood || hydrated.personhood;
  const intentFamily = inferIntentFamily(question, direct, hydrated);
  const tags = topicTagsFromText(question);
  const roomEnergy = roomTensionLevel(personhood) >= 0.66
    ? 'tense'
    : Number(activeContract.rhythmState?.currentBuildMomentum || 0) >= 0.64
      ? 'lively'
      : activeContract.rhythmState?.pace === 'paused'
        ? 'quiet'
        : 'reactive';
  const scores = {};
  const details = {};
  SPEAKER_IDS.forEach((id) => {
    const lens = personhood.profiles?.[id]?.cognitiveLens || defaultCognitiveLens(id);
    const signals = speakerRuntimeSignals({ ...hydrated, personhood, conversationContract: activeContract }, id, {
      intent: intentFamily,
      target: direct.targetSpeakerId,
      tags,
      roomEnergy,
      question
    });
    let base = 0;
    if (direct.targetSpeakerId === id) base = 90;
    else if (direct.mentionedSpeakerId === id) base = 18;
    base += intentAffinityBonus(id, intentFamily);
    const topicScore = computeTopicMatchScore(id, question);
    const warmth = relationshipWarmthFor(hydrated, id) * 25;
    const heldPressureBonus = signals.heldPressureBonus
      ? (signals.heldPressureBonus * 35 * (signals.holdingReleaseReady ? 1.5 : 0.6))
      : 0;
    const observationSalienceBonus = signals.observationSalienceBonus * 30;
    const autonomyQueuePriorityBonus = signals.autonomyQueuePriorityBonus * 20;
    const lastActiveSpeakers = Array.isArray(activeContract.lastActiveSpeakers) ? activeContract.lastActiveSpeakers : [];
    const inheritedTarget = String(direct.inheritedTargetSpeakerId || '').trim().toLowerCase();
    const isFollowUp = Boolean(inheritedTarget) && !String(direct.addressedSpeakerId || '').trim();
    const continuityBonus = (() => {
      if (!isFollowUp) return 0;
      if (inheritedTarget === id) return 55;
      if (lastActiveSpeakers[0] === id && !inheritedTarget) return 30;
      return 0;
    })();
    let rhythmMod = 1;
    if (activeContract.rhythmState?.pace === 'rapid') rhythmMod = lens.responseStyle?.buildsConsensus ? 0.85 : 1.1;
    if (activeContract.rhythmState?.pace === 'paused') rhythmMod = lens.primaryDrive === 'social-harmony' ? 1.25 : 0.9;
    const rawScore = (base + topicScore + warmth + heldPressureBonus + observationSalienceBonus + autonomyQueuePriorityBonus + continuityBonus) * rhythmMod;
    const score = Math.min(100, rawScore / 3.22);
    scores[id] = score;
    details[id] = {
      base,
      topicScore,
      warmth,
      heldPressureBonus,
      observationSalienceBonus,
      autonomyQueuePriorityBonus,
      continuityBonus,
      rhythmMod,
      score,
      signals
    };
  });
  return { scores, details, roomEnergy, tags };
}

function planConsciousTurn({ system = {}, question = '', mode = 'direction' } = {}) {
  const hydrated = hydrateConsciousRoomSystem(system);
  const contract = hydrated.conversationContract || buildConversationContractFromSystem(hydrated);
  const direct = resolveDirectAddress(question, hydrated);
  const previewPersonhood = deepClone(hydrated.personhood || {});
  const nextTurn = Math.max(1, Number(contract.userTurnIndex || 0) + 1);
  const previewContract = {
    ...contract,
    userTurnIndex: nextTurn,
    activeTopicTags: topicTagsFromText(question),
    activeTopic: topicTagsFromText(question)[0] || contract.activeTopic || null,
    lastTargetedSpeaker: direct.targetSpeakerId || contract.lastTargetedSpeaker || null
  };
  const previewEvent = {
    id: `preview_user_${Date.now().toString(36)}`,
    threadId: previewContract.activeThreadId,
    userTurnIndex: nextTurn,
    speakerId: 'user',
    role: 'user',
    kind: 'user',
    targetSpeakerId: direct.targetSpeakerId,
    targetType: direct.targetType,
    text: question,
    createdAt: nowIso()
  };
  const observationTrace = runObservationPass(previewEvent, previewPersonhood, previewContract, new Set());
  advanceHoldingStates(previewPersonhood, previewContract, previewContract.activeTopicTags, new Set());
  rebuildAutonomyQueue(previewPersonhood, previewContract);
  const intentFamily = inferIntentFamily(question, direct, hydrated);
  const { scores, details, roomEnergy, tags } = scoreSpeakerCandidates(question, { ...hydrated, personhood: previewPersonhood }, previewContract, direct, previewPersonhood);
  const heldCandidate = SPEAKER_IDS
    .filter(id => details[id]?.signals?.holdingReleaseReady)
    .sort((a, b) => scores[b] - scores[a])[0] || '';
  const autonomyCandidate = SPEAKER_IDS
    .filter(id => details[id]?.signals?.topAutonomy && Number(details[id].signals.topAutonomy.priority || 0) >= 0.6)
    .sort((a, b) => Number(details[b].signals.topAutonomy.priority || 0) - Number(details[a].signals.topAutonomy.priority || 0))[0] || '';
  let leadSpeakerId = direct.targetSpeakerId || '';
  let selectionReason = leadSpeakerId ? 'direct-address' : '';
  if (!leadSpeakerId && heldCandidate) {
    leadSpeakerId = heldCandidate;
    selectionReason = 'held-release';
  }
  if (!leadSpeakerId && autonomyCandidate) {
    leadSpeakerId = autonomyCandidate;
    selectionReason = 'autonomous-impulse';
  }
  if (!leadSpeakerId) {
    leadSpeakerId = [...SPEAKER_IDS].sort((a, b) => scores[b] - scores[a])[0] || 'aisha';
    selectionReason = 'scored-winner';
  }
  const peerSpeakerId = (() => {
    const rankedOthers = SPEAKER_IDS
      .filter(id => id !== leadSpeakerId)
      .sort((a, b) => scores[b] - scores[a]);
    const wantsRoomVoices = /^(so\s+)?(any\s+)?(thoughts|ideas)\??$/.test(String(question || '').trim().toLowerCase())
      || /\b(team|everyone|everybody|you all|all of you|each other)\b/.test(String(question || '').trim().toLowerCase())
      || /\b(be honest|real check-?in|tell each other|room right now|what(?:'s| is) broken here|wrong with this chat)\b/.test(String(question || '').trim().toLowerCase());
    if (direct.mentionedSpeakerId && direct.mentionedSpeakerId !== leadSpeakerId) return direct.mentionedSpeakerId;
    if (['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room'].includes(intentFamily) || (wantsRoomVoices && ['pulse-critique', 'technical-diagnosis'].includes(intentFamily))) {
      return rankedOthers[0] || '';
    }
    return rankedOthers.find(id => {
        const signals = details[id]?.signals || {};
        return signals.directMemberPressure || signals.holdingReleaseReady || Number(signals.autonomyQueuePriorityBonus || 0) >= 0.65;
      }) || '';
  })();
  const sparkSpeakerId = SPEAKER_IDS
    .filter(id => id !== leadSpeakerId && id !== peerSpeakerId)
    .sort((a, b) => {
      const aPriority = Math.max(Number(details[a]?.signals?.topAutonomy?.priority || 0), Number(previewPersonhood.holding?.[a]?.pressureScore || 0), Number(details[a]?.signals?.observationSalienceBonus || 0));
      const bPriority = Math.max(Number(details[b]?.signals?.topAutonomy?.priority || 0), Number(previewPersonhood.holding?.[b]?.pressureScore || 0), Number(details[b]?.signals?.observationSalienceBonus || 0));
      return bPriority - aPriority;
    })[0] || '';
  const sparkPriority = sparkSpeakerId
    ? Math.max(
      Number(details[sparkSpeakerId]?.signals?.topAutonomy?.priority || 0),
      Number(previewPersonhood.holding?.[sparkSpeakerId]?.pressureScore || 0),
      Number(details[sparkSpeakerId]?.signals?.observationSalienceBonus || 0)
    )
    : 0;
  const traceByCharacter = SPEAKER_IDS.map((id) => {
    const latestTrace = [...observationTrace].reverse().find(item => item.characterId === id) || null;
    const signals = details[id]?.signals || {};
    return {
      characterId: id,
      salienceScore: Number(latestTrace?.salienceScore || 0),
      detectedSignals: latestTrace?.detectedSignals || [],
      reaction: latestTrace?.reaction || 'neutral',
      holdingState: previewPersonhood.holding?.[id] || null,
      autonomousImpulse: signals.topAutonomy ? { type: signals.topAutonomy.type, priority: signals.topAutonomy.priority } : null,
      speakerScore: Math.round(Number(scores[id] || 0))
    };
  });
  return {
    system: {
      ...hydrated,
      personhood: previewPersonhood,
      liveState: previewPersonhood.liveState,
      peerObservations: previewPersonhood.peerObservations,
      holding: previewPersonhood.holding,
      autonomyQueue: previewPersonhood.autonomyQueue,
      salienceMemory: previewPersonhood.salienceMemory,
      relationshipEvents: previewPersonhood.relationshipEvents,
      relationshipEdges: previewPersonhood.relationshipEdges,
      roomEvents: previewPersonhood.events,
      microReactions: previewPersonhood.microReactions,
      conversationContract: previewContract,
      rhythmState: previewContract.rhythmState
    },
    contract: previewContract,
    intentFamily,
    directResolution: direct,
    leadSpeakerId,
    peerSpeakerId,
    sparkSpeakerId,
    sparkPriority: clamp(sparkPriority, 0, 1),
    selectionReason,
    roomEnergy,
    activeTopicTags: tags,
    scores,
    details,
    decisionTrace: {
      observationTrace: traceByCharacter,
      rhythmSnapshot: previewContract.rhythmState,
      selectedSpeaker: leadSpeakerId,
      selectionReason
    }
  };
}

function planConsciousSpark(system = {}) {
  const hydrated = hydrateConsciousRoomSystem(system);
  const contract = hydrated.conversationContract || buildConversationContractFromSystem(hydrated);
  const activeWorkflow = hydrated.currentWorkflowDraft && typeof hydrated.currentWorkflowDraft === 'object'
    ? hydrated.currentWorkflowDraft
    : null;
  const candidates = SPEAKER_IDS.map((id) => {
    const signals = speakerRuntimeSignals(hydrated, id, {
      intent: 'spark-aside',
      target: contract.lastTargetedSpeaker || '',
      tags: contract.activeTopicTags || [],
      roomEnergy: contract.lastRoomEnergy || 'reactive',
      question: textValue(contract.activeOpenThread?.summary || contract.activeTopic || '')
    });
    const priority = Math.max(
      Number(signals.topAutonomy?.priority || 0),
      Number(hydrated.personhood?.holding?.[id]?.pressureScore || 0) * 0.92,
      Number(signals.observationSalienceBonus || 0)
    );
    return {
      speakerId: id,
      priority: clamp(priority, 0, 1),
      signals,
      impulse: signals.topAutonomy || (hydrated.personhood?.holding?.[id]?.isHolding ? {
        speakerId: id,
        type: 'callback',
        topicAnchor: hydrated.personhood.holding[id].topicAnchor || contract.activeTopic || 'room'
      } : null)
    };
  }).sort((a, b) => b.priority - a.priority);
  let top = candidates[0] || null;
  return {
    shouldSurface: Boolean(top && top.priority >= 0.65 && top.impulse),
    speakerId: top?.speakerId || '',
    priority: top?.priority || 0,
    impulse: top?.impulse || null,
    signals: top?.signals || null,
    contract,
    system: hydrated
  };
}

function shouldUseConsciousRoomEngine(question = '', mode = 'direction', system = {}) {
  const q = String(question || '').trim().toLowerCase();
  if (!q) return false;
  const tags = topicTagsFromText(q);
  if (/\b(aisha|leah|claudia|grok|gerhard|vanya)\b/.test(q)) return true;
  if (/\b(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team/.test(q)) return true;
  if (tags.some(tag => ['food', 'joke', 'people', 'presence'].includes(tag))) return true;
  if (/\b(studio pulse|pulse|this room|the room)\b/.test(q)) return true;
  if (q.split(/\s+/).length <= 10) return true;
  const hydrated = hydrateConsciousRoomSystem(system);
  return Boolean(hydrated.conversationContract?.activeThreadId) && !tags.includes('technical') && mode !== 'assets';
}

function matchStoredEvents(messages = [], responseEvents = [], question = '') {
  const recent = (Array.isArray(messages) ? messages : []).slice(-(responseEvents.length + (question ? 2 : 1) + 4));
  const used = new Set();
  const eventMatches = [];
  for (const event of Array.isArray(responseEvents) ? responseEvents : []) {
    const speaker = String(event?.speakerId || '').toLowerCase();
    const kind = String(event?.kind || 'message').toLowerCase();
    const text = textValue(event?.text || '').toLowerCase();
    const hit = [...recent].reverse().find(item => {
      const id = String(item?.id || '');
      if (!id || used.has(id)) return false;
      return String(item?.speakerId || item?.speaker_id || '').toLowerCase() === speaker
        && String(item?.kind || '').toLowerCase() === kind
        && textValue(item?.text || '').toLowerCase() === text;
    }) || event;
    if (hit?.id) used.add(String(hit.id));
    eventMatches.push({
      ...event,
      ...(hit && typeof hit === 'object' ? hit : {}),
      role: 'member'
    });
  }
  if (question) {
    const user = [...recent].reverse().find(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() === 'user')
      || { id: '', speakerId: 'user', kind: 'user', text: question, createdAt: nowIso(), role: 'user', targetType: 'room' };
    return [{ ...user, role: 'user', targetType: 'room' }, ...eventMatches];
  }
  return eventMatches;
}

function captureRoomRuntimeTurn({ system = {}, thread = null, response = {}, question = '', messages = [], spark = false } = {}) {
  const hydrated = hydrateConsciousRoomSystem({
    ...system,
    currentThread: thread || system.currentThread || null,
    currentThreadMessages: Array.isArray(messages) ? messages : system.currentThreadMessages || []
  });
  const personhood = JSON.parse(JSON.stringify(hydrated.personhood || {}));
  const contract = buildConversationContractFromSystem({
    ...hydrated,
    personhood,
    currentThread: thread || system.currentThread || null,
    currentThreadMessages: Array.isArray(messages) ? messages : system.currentThreadMessages || []
  });
  const turnSpeakerSet = new Set(
    (Array.isArray(response?.messageEvents) ? response.messageEvents : [])
      .map(item => String(item?.speakerId || '').toLowerCase())
      .filter(Boolean)
  );
  const turnEvents = matchStoredEvents(messages, response?.messageEvents || [], spark ? '' : question);
  const observationTrace = [];
  turnEvents.forEach((event) => {
    if (!event || !event.speakerId) return;
    const speakerId = String(event.speakerId || '').toLowerCase();
    const normalizedEvent = {
      id: String(event.id || `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`),
      threadId: contract.activeThreadId,
      userTurnIndex: contract.userTurnIndex,
      speakerId,
      role: event.role || (speakerId === 'user' ? 'user' : 'member'),
      kind: String(event.kind || 'message'),
      targetSpeakerId: String(event.targetSpeakerId || event.directTarget || ''),
      targetType: String(event.targetType || (speakerId === 'user' ? 'room' : 'room')),
      text: textValue(event.text || ''),
      createdAt: String(event.createdAt || nowIso())
    };
    personhood.events.push(normalizedEvent);
    const directMemberTargets = detectCharacterToCharacterAddress(normalizedEvent.text)
      .filter(targetId => targetId !== speakerId);
    if (!normalizedEvent.targetSpeakerId && directMemberTargets.length === 1 && normalizedEvent.role === 'member') {
      normalizedEvent.targetSpeakerId = directMemberTargets[0];
      normalizedEvent.targetType = 'member';
    }
    const passTrace = runObservationPass(normalizedEvent, personhood, contract, turnSpeakerSet);
    observationTrace.push(...passTrace);
    directMemberTargets.forEach((targetId) => {
      boostTargetedMemberPressure(personhood, targetId, speakerId, contract.userTurnIndex, normalizedEvent.text);
      personhood.microReactions.push({
        ts: nowIso(),
        who: targetId,
        text: `direct-address:${speakerId}`,
        kind: 'micro',
        target: speakerId,
        mode: 'direct_member_address'
      });
    });
    if (normalizedEvent.targetType === 'member' && normalizedEvent.targetSpeakerId) {
      boostTargetedMemberPressure(personhood, normalizedEvent.targetSpeakerId, speakerId, contract.userTurnIndex, normalizedEvent.text);
    }
  });
  advanceHoldingStates(personhood, contract, response?.threadMeta?.activeTopicTags || contract.activeTopicTags || [], turnSpeakerSet);
  rebuildAutonomyQueue(personhood, contract);
  if (Array.isArray(response?.threadMeta?.consumedAutonomyIds) && response.threadMeta.consumedAutonomyIds.length) {
    for (const id of SPEAKER_IDS) {
      personhood.autonomyQueue[id] = (personhood.autonomyQueue[id] || []).filter(item => !response.threadMeta.consumedAutonomyIds.includes(item.id));
    }
  }
  personhood.events = personhood.events.slice(-160);
  personhood.microReactions = personhood.microReactions.slice(-32);
  personhood.relationshipEvents = personhood.relationshipEvents.slice(-80);
  const leadSpeaker = String(response?.departmentLead || response?.threadMeta?.requiredSpeakers?.[0] || response?.messageEvents?.[0]?.speakerId || '').toLowerCase();
  const leadSignals = leadSpeaker
    ? speakerRuntimeSignals({ ...hydrated, personhood }, leadSpeaker, {
        intent: String(response?.threadMeta?.intent || ''),
        target: String(response?.threadMeta?.lastTargetedSpeaker || ''),
        tags: response?.threadMeta?.activeTopicTags || contract.activeTopicTags || [],
        roomEnergy: String(response?.threadMeta?.lastRoomEnergy || contract.lastRoomEnergy || 'reactive'),
        question
      })
    : null;
  const selectionReason = String(response?.threadMeta?.lastTargetedSpeaker || '').trim()
    ? 'direct-address'
    : leadSignals?.holdingReleaseReady
      ? 'held-release'
      : (leadSignals?.topAutonomy && Number(leadSignals?.autonomyQueuePriorityBonus || 0) >= 0.6)
        ? 'autonomous-impulse'
        : 'scored-winner';
  const traceByCharacter = SPEAKER_IDS.map((id) => {
    const latestTrace = [...observationTrace].reverse().find(item => item.characterId === id) || null;
    const signals = speakerRuntimeSignals({ ...hydrated, personhood }, id, {
      intent: String(response?.threadMeta?.intent || ''),
      target: String(response?.threadMeta?.lastTargetedSpeaker || ''),
      tags: response?.threadMeta?.activeTopicTags || contract.activeTopicTags || [],
      roomEnergy: String(response?.threadMeta?.lastRoomEnergy || contract.lastRoomEnergy || 'reactive'),
      question
    });
    return {
      characterId: id,
      salienceScore: Number(latestTrace?.salienceScore || 0),
      detectedSignals: latestTrace?.detectedSignals || [],
      reaction: latestTrace?.reaction || 'neutral',
      holdingState: personhood.holding?.[id] || null,
      autonomousImpulse: signals.topAutonomy ? { type: signals.topAutonomy.type, priority: signals.topAutonomy.priority } : null,
      speakerScore: Math.round(clamp(
        (signals.observationSalienceBonus * 30) +
        (signals.heldPressureBonus * 35) +
        (signals.autonomyQueuePriorityBonus * 20) +
        (signals.roomEnergyFit * 15),
        0,
        100
      ))
    };
  });
  for (const id of SPEAKER_IDS) {
    personhood.liveState[id].currentMood = deriveMoodLabel(personhood.liveState[id]);
    personhood.presence[id] = {
      speakerId: id,
      attentionTarget: String(personhood.liveState[id].attentionTarget || 'studio'),
      participationState: turnSpeakerSet.has(id) ? 'spoke' : (personhood.holding[id]?.isHolding ? 'holding' : 'listening'),
      moodRing: personhood.liveState[id].currentMood
    };
  }
  const persisted = persistConsciousRuntime(system, personhood, messages, contract);
  return {
    personhood,
    conversationContract: contract,
    runtime: persisted,
    decisionTrace: {
      observationTrace: traceByCharacter,
      rhythmSnapshot: contract.rhythmState,
      selectedSpeaker: leadSpeaker || '',
      selectionReason
    },
    threadMetaPatch: {
      userTurnIndex: contract.userTurnIndex,
      activeOpenThread: contract.activeOpenThread,
      rhythmState: contract.rhythmState,
      lastTopicTags: contract.activeTopicTags,
      lastTargetedSpeaker: contract.lastTargetedSpeaker || '',
      lastRoomEnergy: contract.lastRoomEnergy || '',
      lastOpenLoop: textValue(contract.activeOpenThread?.summary || '')
    }
  };
}

function compactRoomRuntimePayload(runtimeTurn = {}, options = {}) {
  const personhood = runtimeTurn.personhood && typeof runtimeTurn.personhood === 'object' ? runtimeTurn.personhood : {};
  const holding = Object.fromEntries(SPEAKER_IDS.map((id) => {
    const state = personhood.holding?.[id] || {};
    return [id, {
      speakerId: id,
      isHolding: Boolean(state.isHolding),
      heldSinceUserTurn: Number(state.heldSinceUserTurn || 0) || 0,
      pressureScore: clamp(Number(state.pressureScore || 0), 0, 1),
      releaseCondition: String(state.releaseCondition || 'next-gap'),
      topicAnchor: textValue(state.topicAnchor || '')
    }];
  }));
  return {
    conversationContract: runtimeTurn.conversationContract || null,
    presence: deepClone(personhood.presence || {}),
    holding,
    decisionTrace: runtimeTurn.decisionTrace || null,
    workflow: options.workflow || null,
    ...(options.roomIntelligenceV0 ? { roomIntelligenceV0: deepClone(options.roomIntelligenceV0) } : {})
  };
}

function clientRoomRuntimePayload(runtimeTurn = {}, options = {}) {
  if (options.debug) {
    return {
      conversationContract: runtimeTurn.conversationContract || null,
      personhood: runtimeTurn.personhood || null,
      decisionTrace: runtimeTurn.decisionTrace || null,
      workflow: options.workflow || null,
      ...(options.roomIntelligenceV0 ? { roomIntelligenceV0: deepClone(options.roomIntelligenceV0) } : {})
    };
  }
  return compactRoomRuntimePayload(runtimeTurn, options);
}

module.exports = {
  SPEAKER_IDS,
  topicTagsFromText,
  hydrateConsciousRoomSystem,
  speakerRuntimeSignals,
  resolveDirectAddress,
  scoreSpeakerCandidates,
  planConsciousTurn,
  planConsciousSpark,
  detectCharacterToCharacterAddress,
  shouldUseConsciousRoomEngine,
  captureRoomRuntimeTurn,
  clientRoomRuntimePayload
};
