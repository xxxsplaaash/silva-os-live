const SPEAKERS = Object.freeze(['aisha', 'vanya', 'leah', 'claudia', 'grok']);
const ROOM_MOVES = Object.freeze(['anchor', 'challenge', 'redirect', 'defend', 'deflect', 'cool', 'escalate', 'observe']);
const STANCES = Object.freeze(['dominant', 'defensive', 'allied', 'dismissive', 'curious', 'silent']);
const INTERRUPTION_KINDS = Object.freeze(['status-cut', 'continuity-correction']);
const PAIR_MOVES = Object.freeze(['challenge', 'defense', 'redirect', 'alliance', 'interruption', 'silence']);
const DEFAULT_STATUS = Object.freeze({
  aisha: 72,
  vanya: 66,
  leah: 63,
  claudia: 61,
  grok: 64
});

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function boundedNumber(value, min = 0, max = 100, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function compact(value = '', max = 80) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function speakerId(value = '') {
  const id = compact(value, 40).toLowerCase();
  return SPEAKERS.includes(id) ? id : '';
}

function enumValue(value = '', allowed = [], fallback = '') {
  const clean = compact(value, 60).toLowerCase();
  return allowed.includes(clean) ? clean : fallback;
}

function safeStatus(value, fallback) {
  return clamp(Math.round(Number(value)), 0, 100) || fallback;
}

function normalizeSocialCues(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    roomMove: enumValue(source.roomMove, ROOM_MOVES, ''),
    tensionDelta: clamp(Math.round(Number(source.tensionDelta || 0) || 0), -12, 12),
    continuityDelta: clamp(Math.round(Number(source.continuityDelta || 0) || 0), -12, 12),
    speakerCues: (Array.isArray(source.speakerCues) ? source.speakerCues : [])
      .map(item => {
        const id = speakerId(item?.speakerId);
        if (!id) return null;
        const targetSpeakerId = speakerId(item?.targetSpeakerId);
        const allianceWith = speakerId(item?.allianceWith);
        const interruptionKind = enumValue(item?.interruptionKind, INTERRUPTION_KINDS, '');
        return {
          speakerId: id,
          ...(targetSpeakerId && targetSpeakerId !== id ? { targetSpeakerId } : {}),
          stance: enumValue(item?.stance, STANCES, 'curious'),
          statusDelta: clamp(Math.round(Number(item?.statusDelta || 0) || 0), -8, 8),
          ...(allianceWith && allianceWith !== id ? { allianceWith } : {}),
          ...(interruptionKind ? { interruptionKind } : {})
        };
      })
      .filter(Boolean)
      .slice(0, 5)
  };
}

function pairKey(a = '', b = '') {
  const pair = [speakerId(a), speakerId(b)].filter(Boolean).sort();
  return pair.length === 2 && pair[0] !== pair[1] ? pair.join(':') : '';
}

function normalizeSocialMemory(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const momentumSeen = new Set();
  const pairSeen = new Set();
  const statusMomentum = (Array.isArray(source.statusMomentum) ? source.statusMomentum : [])
    .map(item => {
      const id = speakerId(item?.speakerId);
      if (!id || momentumSeen.has(id)) return null;
      momentumSeen.add(id);
      return {
        speakerId: id,
        value: boundedNumber(item?.value, -100, 100, 0)
      };
    })
    .filter(item => item && item.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || SPEAKERS.indexOf(a.speakerId) - SPEAKERS.indexOf(b.speakerId))
    .slice(0, 5);

  const pairPressure = (Array.isArray(source.pairPressure) ? source.pairPressure : [])
    .map(item => {
      const between = Array.isArray(item?.between) ? item.between.map(id => speakerId(id)).filter(Boolean) : [];
      const key = pairKey(between[0], between[1]);
      if (!key || pairSeen.has(key)) return null;
      pairSeen.add(key);
      const pair = key.split(':');
      const affinity = boundedNumber(item?.affinity, 0, 100, 0);
      const friction = boundedNumber(item?.friction, 0, 100, 0);
      if (!affinity && !friction) return null;
      return {
        between: pair,
        affinity,
        friction,
        lastMove: enumValue(item?.lastMove, PAIR_MOVES, 'silence')
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.max(b.affinity, b.friction) - Math.max(a.affinity, a.friction))
    .slice(0, 4);

  const recentRoomMoves = (Array.isArray(source.recentRoomMoves) ? source.recentRoomMoves : [])
    .map(item => enumValue(item, ROOM_MOVES, ''))
    .filter(Boolean)
    .slice(-5);

  return {
    statusMomentum,
    pairPressure,
    recentRoomMoves,
    interruptionPressure: boundedNumber(source.interruptionPressure, 0, 100, 0)
  };
}

function priorSocialMemory(roomState = {}) {
  return normalizeSocialMemory(roomState && typeof roomState === 'object'
    ? roomState.socialSignals?.socialMemory
    : {});
}

function priorHierarchy(roomState = {}) {
  const raw = roomState && typeof roomState === 'object' ? roomState.socialSignals?.hierarchy : null;
  const map = new Map();
  (Array.isArray(raw) ? raw : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    if (!id) return;
    map.set(id, safeStatus(item?.status, DEFAULT_STATUS[id]));
  });
  return map;
}

function moodBase(roomMood = '') {
  const mood = compact(roomMood, 40).toLowerCase();
  return {
    calm: 12,
    warm: 18,
    focused: 28,
    playful: 34,
    quiet: 22,
    cooling: 32,
    sharp: 52,
    tense: 70,
    chaotic: 76,
    hostile: 84,
    fragile: 66
  }[mood] ?? 30;
}

function visibleBySpeaker(messageEvents = [], silentReactions = []) {
  const visible = new Map(SPEAKERS.map(id => [id, 'listening']));
  (Array.isArray(silentReactions) ? silentReactions : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    if (id) visible.set(id, compact(item?.visibleState || 'watching', 60) || 'watching');
  });
  (Array.isArray(messageEvents) ? messageEvents : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    if (id) visible.set(id, compact(item?.visibleState || item?.role || 'speaking', 60) || 'speaking');
  });
  return visible;
}

function aishaIsIntentionallySilent(silentReactions = []) {
  return (Array.isArray(silentReactions) ? silentReactions : []).some(item => {
    if (speakerId(item?.speakerId) !== 'aisha') return false;
    const visibleState = compact(item?.visibleState || '', 80);
    const reason = compact(item?.reason || '', 180);
    return /\b(anchor|anchoring|authority|continuity|record)\b/i.test(visibleState)
      || /\b(holding authority|holding continuity|continuity anchor|intentionally silent|planned silence|quiet anchor|quiet by design|tracking the room|watching for the premise)\b/i.test(reason);
  });
}

function effectiveSocialCues(socialCues = {}, silentReactions = []) {
  const cues = normalizeSocialCues(socialCues);
  if (!aishaIsIntentionallySilent(silentReactions)) return cues;
  return {
    ...cues,
    speakerCues: cues.speakerCues.map(item => {
      if (item.speakerId !== 'aisha' || item.statusDelta >= 0) return item;
      return {
        ...item,
        stance: item.stance === 'dismissive' ? 'silent' : item.stance,
        statusDelta: 0
      };
    })
  };
}

function shouldApplyFallbackSocialPenalty(input = {}) {
  return input.diagnostics?.fallbackUsed && !aishaIsIntentionallySilent(input.silentReactions);
}

function ledgerStats(continuityLedger = []) {
  return (Array.isArray(continuityLedger) ? continuityLedger : []).reduce((acc, item) => {
    const status = compact(item?.status, 40).toLowerCase();
    const source = compact(item?.source, 40).toLowerCase();
    acc.total += 1;
    if (status === 'active') acc.active += 1;
    if (status === 'superseded') acc.superseded += 1;
    if (status === 'disputed') acc.disputed += 1;
    if (source === 'pack1-memory') acc.pack1 += 1;
    return acc;
  }, { total: 0, active: 0, superseded: 0, disputed: 0, pack1: 0 });
}

function roleDelta(role = '', index = 0) {
  const normalized = compact(role, 40).toLowerCase();
  const base = {
    primary: 9,
    called_in: 7,
    closer: 5,
    side: 4
  }[normalized] ?? 4;
  return Math.max(2, base - index);
}

function buildHierarchy({
  mode = 'social_hierarchy_lab',
  roomMood = '',
  responseMode = '',
  messageEvents = [],
  silentReactions = [],
  continuityLedger = [],
  socialCues = {},
  roomState = {},
  diagnostics = {}
} = {}) {
  const previous = priorHierarchy(roomState);
  const visible = visibleBySpeaker(messageEvents, silentReactions);
  const stats = ledgerStats(continuityLedger);
  const deltas = new Map(SPEAKERS.map(id => [id, 0]));

  (Array.isArray(messageEvents) ? messageEvents : []).forEach((item, index) => {
    const id = speakerId(item?.speakerId);
    if (!id) return;
    deltas.set(id, (deltas.get(id) || 0) + roleDelta(item?.role, index));
    if (/direct|precise|grounded|challenge|skeptic/i.test(`${item?.tone || ''} ${item?.visibleState || ''}`)) {
      deltas.set(id, (deltas.get(id) || 0) + 2);
    }
  });

  (Array.isArray(silentReactions) ? silentReactions : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    if (!id) return;
    const state = compact(item?.visibleState, 80);
    if (/\b(anchor|tracking|aligned|watching)\b/i.test(state)) {
      deltas.set(id, (deltas.get(id) || 0) + 1);
    }
  });

  const cues = effectiveSocialCues(socialCues, silentReactions);
  cues.speakerCues.forEach(item => {
    deltas.set(item.speakerId, (deltas.get(item.speakerId) || 0) + item.statusDelta);
  });

  priorSocialMemory(roomState).statusMomentum.forEach(item => {
    deltas.set(item.speakerId, (deltas.get(item.speakerId) || 0) + boundedNumber(item.value / 22, -5, 5, 0));
  });

  if (stats.pack1) deltas.set('aisha', (deltas.get('aisha') || 0) + 5);
  if (stats.superseded || stats.disputed) deltas.set('grok', (deltas.get('grok') || 0) + 3);
  if (mode === 'continuity_breaker') deltas.set('aisha', (deltas.get('aisha') || 0) + 2);
  if (responseMode === 'open_floor') deltas.set('vanya', (deltas.get('vanya') || 0) + 2);
  if (diagnostics?.fallbackUsed && !aishaIsIntentionallySilent(silentReactions)) {
    deltas.set('aisha', (deltas.get('aisha') || 0) - 4);
  }

  const rows = SPEAKERS.map(id => {
    const previousStatus = previous.get(id) ?? DEFAULT_STATUS[id];
    const delta = clamp(deltas.get(id) || 0, -10, 12);
    const status = clamp(previousStatus + delta, 0, 100);
    return {
      speakerId: id,
      rank: 0,
      status,
      delta,
      visibleState: visible.get(id) || 'listening'
    };
  }).sort((a, b) => b.status - a.status || SPEAKERS.indexOf(a.speakerId) - SPEAKERS.indexOf(b.speakerId));

  rows.forEach((item, index) => {
    item.rank = index + 1;
    item.status = Math.round(item.status);
    item.delta = Math.round(item.delta);
  });

  return rows;
}

function buildAlliances({ messageEvents = [], silentReactions = [], continuityLedger = [], socialCues = {}, roomState = {} } = {}) {
  const alliances = [];
  const add = (between, strength, reason) => {
    const pair = between.map(id => speakerId(id));
    if (!pair[0] || !pair[1] || pair[0] === pair[1]) return;
    const key = pair.slice().sort().join(':');
    if (alliances.some(item => item.between.slice().sort().join(':') === key)) return;
    alliances.push({ between: pair, strength: clamp(strength, 0, 1), reason });
  };

  const speakers = (Array.isArray(messageEvents) ? messageEvents : []).map(item => speakerId(item?.speakerId)).filter(Boolean);
  if (speakers.length >= 2) add([speakers[0], speakers[1]], 0.56, 'agreement');

  const silenceGroups = new Map();
  (Array.isArray(silentReactions) ? silentReactions : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    const state = compact(item?.visibleState, 30).toLowerCase();
    if (!id || !state) return;
    const group = state.includes('track') ? 'tracking' : state.includes('align') ? 'aligned' : state.includes('watch') ? 'watching' : '';
    if (!group) return;
    silenceGroups.set(group, [...(silenceGroups.get(group) || []), id]);
  });
  for (const ids of silenceGroups.values()) {
    if (ids.length >= 2) add([ids[0], ids[1]], 0.42, 'shared-silence');
  }

  const hasPack1Memory = (Array.isArray(continuityLedger) ? continuityLedger : [])
    .some(item => compact(item?.source, 40).toLowerCase() === 'pack1-memory');
  const continuityPartner = [...new Set([...speakers, ...(Array.isArray(silentReactions) ? silentReactions : []).map(item => speakerId(item?.speakerId)).filter(Boolean)])]
    .find(id => id && id !== 'aisha');
  if (hasPack1Memory && continuityPartner) add(['aisha', continuityPartner], 0.68, 'continuity-anchor');

  const cues = effectiveSocialCues(socialCues, silentReactions);
  cues.speakerCues.forEach(item => {
    if (item.allianceWith) add([item.speakerId, item.allianceWith], item.stance === 'allied' ? 0.72 : 0.52, 'agreement');
  });

  priorSocialMemory(roomState).pairPressure.forEach(item => {
    if (item.affinity < 60 || item.affinity < item.friction + 8) return;
    add(item.between, item.affinity / 100, item.lastMove === 'silence' ? 'shared-silence' : 'agreement');
  });

  return alliances.slice(0, 3);
}

function buildInterruptions({ roomState = {}, responseMode = '', messageEvents = [], silentReactions = [], continuityLedger = [], socialCues = {} } = {}) {
  const interruptions = [];
  const priorSpeaker = speakerId(roomState?.priorSpeaker || roomState?.lastSpeaker || '');
  const speakers = (Array.isArray(messageEvents) ? messageEvents : []).map(item => speakerId(item?.speakerId)).filter(Boolean);
  const first = speakers[0] || '';
  const stats = ledgerStats(continuityLedger);

  if ((stats.superseded || stats.disputed) && ['aisha', 'grok'].includes(first) && priorSpeaker && priorSpeaker !== first) {
    interruptions.push({
      interrupter: first,
      interrupted: priorSpeaker,
      kind: 'continuity-correction'
    });
  }

  if (responseMode === 'aisha_takeover' && priorSpeaker && priorSpeaker !== 'aisha') {
    interruptions.push({
      interrupter: 'aisha',
      interrupted: priorSpeaker,
      kind: stats.superseded || stats.disputed ? 'continuity-correction' : 'status-cut'
    });
  } else if (first && priorSpeaker && priorSpeaker !== first && speakers.length >= 2) {
    interruptions.push({
      interrupter: first,
      interrupted: priorSpeaker,
      kind: 'status-cut'
    });
  }

  const cues = effectiveSocialCues(socialCues, silentReactions);
  cues.speakerCues.forEach(item => {
    if (!item.interruptionKind || !item.targetSpeakerId || item.targetSpeakerId === item.speakerId) return;
    interruptions.push({
      interrupter: item.speakerId,
      interrupted: item.targetSpeakerId,
      kind: item.interruptionKind
    });
  });

  const seen = new Set();
  return interruptions.filter(item => {
    const key = `${item.interrupter}:${item.interrupted}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 2);
}

function derivedRoomMove(input = {}, stats = ledgerStats(input.continuityLedger)) {
  const cueMove = effectiveSocialCues(input.socialCues, input.silentReactions).roomMove;
  if (cueMove) return cueMove;
  if (stats.superseded || stats.disputed || input.responseMode === 'aisha_takeover') return 'anchor';
  if (input.responseMode === 'open_floor') return 'redirect';
  if (shouldApplyFallbackSocialPenalty(input)) return 'deflect';
  if (['sharp', 'tense', 'chaotic'].includes(compact(input.roomMood, 40).toLowerCase())) return 'challenge';
  if (compact(input.roomMood, 40).toLowerCase() === 'cooling') return 'cool';
  return 'observe';
}

function statusEventKind(cue = {}) {
  if (cue.interruptionKind === 'continuity-correction') return 'continuity-anchor';
  if (cue.statusDelta > 0) return 'status-gain';
  if (cue.statusDelta < 0) return 'status-loss';
  if (cue.stance === 'dominant' || cue.stance === 'dismissive') return 'challenge';
  if (cue.stance === 'defensive' || cue.stance === 'allied') return 'defense';
  if (cue.stance === 'silent') return 'cooling-silence';
  return 'redirect';
}

function buildStatusEvents(input = {}) {
  const cues = effectiveSocialCues(input.socialCues, input.silentReactions);
  const events = cues.speakerCues
    .map(cue => ({
      speakerId: cue.speakerId,
      ...(cue.targetSpeakerId ? { targetSpeakerId: cue.targetSpeakerId } : {}),
      kind: statusEventKind(cue),
      weight: Math.round(clamp(48 + Math.abs(cue.statusDelta) * 6 + (cue.interruptionKind ? 16 : 0), 0, 100))
    }));

  const memory = priorSocialMemory(input.roomState);
  if (events.length < 4) {
    const strongestFriction = memory.pairPressure.find(item => item.friction >= 60 && item.friction >= item.affinity + 8);
    if (strongestFriction) {
      events.push({
        speakerId: strongestFriction.between[0],
        targetSpeakerId: strongestFriction.between[1],
        kind: 'challenge',
        weight: boundedNumber(strongestFriction.friction, 0, 100, 0)
      });
    }
  }
  if (events.length < 4) {
    const strongestMomentum = memory.statusMomentum.find(item => Math.abs(item.value) >= 35);
    if (strongestMomentum) {
      events.push({
        speakerId: strongestMomentum.speakerId,
        kind: strongestMomentum.value > 0 ? 'status-gain' : 'status-loss',
        weight: boundedNumber(Math.abs(strongestMomentum.value), 0, 100, 0)
      });
    }
  }

  const seen = new Set();
  return events.filter(item => {
    const key = `${item.speakerId}:${item.targetSpeakerId || ''}:${item.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function projectShowcaseSocialSignals(input = {}) {
  const stats = ledgerStats(input.continuityLedger);
  const cues = normalizeSocialCues(input.socialCues);
  const tension = clamp(
    moodBase(input.roomMood)
      + (input.responseMode === 'open_floor' ? 6 : 0)
      + (input.responseMode === 'aisha_takeover' ? 10 : 0)
      + (stats.superseded * 10)
      + (stats.disputed * 18)
      + cues.tensionDelta
      + (shouldApplyFallbackSocialPenalty(input) ? 10 : 0),
    0,
    100
  );
  const continuityPressure = clamp(
    (stats.pack1 ? 18 : 0)
      + (stats.active * 8)
      + (stats.superseded * 18)
      + (stats.disputed * 24)
      + cues.continuityDelta,
    0,
    100
  );
  const hierarchy = buildHierarchy(input);
  const alliances = buildAlliances(input);
  const interruptions = buildInterruptions(input);
  const roomMove = derivedRoomMove(input, stats);
  const statusEvents = buildStatusEvents(input);
  const projected = {
    tension: Math.round(tension),
    continuityPressure: Math.round(continuityPressure),
    hierarchy,
    alliances,
    interruptions,
    roomMove,
    statusEvents
  };

  return {
    ...projected,
    socialMemory: deriveSocialMemory(input, projected)
  };
}

function statusEventMomentum(event = {}) {
  const weight = boundedNumber(event.weight, 0, 100, 0);
  const positive = {
    'status-gain': 0.38,
    defense: 0.24,
    'continuity-anchor': 0.2,
    redirect: 0.1,
    'cooling-silence': 0.04
  }[event.kind] || 0;
  const negative = {
    'status-loss': -0.38,
    challenge: -0.18
  }[event.kind] || 0;
  return Math.round(weight * (positive || negative));
}

function pairContributionForStatusEvent(event = {}) {
  const weight = boundedNumber(event.weight, 0, 100, 0);
  if (event.kind === 'challenge' || event.kind === 'status-loss') {
    return { affinity: 0, friction: Math.round(weight * 0.32), lastMove: 'challenge' };
  }
  if (event.kind === 'continuity-anchor') {
    return { affinity: 0, friction: Math.round(weight * 0.26), lastMove: 'challenge' };
  }
  if (event.kind === 'defense' || event.kind === 'status-gain') {
    return { affinity: Math.round(weight * 0.24), friction: 0, lastMove: 'defense' };
  }
  if (event.kind === 'redirect') {
    return { affinity: 5, friction: 7, lastMove: 'redirect' };
  }
  return { affinity: 0, friction: 0, lastMove: 'silence' };
}

function deriveSocialMemory(input = {}, projected = {}) {
  const previous = priorSocialMemory(input.roomState);
  const momentum = new Map(SPEAKERS.map(id => [id, 0]));
  previous.statusMomentum.forEach(item => {
    momentum.set(item.speakerId, boundedNumber(item.value * 0.62, -100, 100, 0));
  });
  (Array.isArray(projected.hierarchy) ? projected.hierarchy : []).forEach(item => {
    const id = speakerId(item?.speakerId);
    if (!id) return;
    momentum.set(id, (momentum.get(id) || 0) + boundedNumber((item.delta || 0) * 4, -36, 36, 0));
  });
  (Array.isArray(projected.statusEvents) ? projected.statusEvents : []).forEach(event => {
    const id = speakerId(event?.speakerId);
    if (!id) return;
    const shift = statusEventMomentum(event);
    momentum.set(id, (momentum.get(id) || 0) + shift);
    const target = speakerId(event?.targetSpeakerId);
    if (target && ['challenge', 'status-loss', 'continuity-anchor'].includes(event.kind)) {
      momentum.set(target, (momentum.get(target) || 0) - Math.max(5, Math.round(Math.abs(shift) * 0.55)));
    }
  });
  if (input.diagnostics?.fallbackUsed && !aishaIsIntentionallySilent(input.silentReactions)) {
    momentum.set('aisha', (momentum.get('aisha') || 0) - 12);
  }

  const pairs = new Map();
  const addPair = (a, b, affinityDelta = 0, frictionDelta = 0, lastMove = 'silence') => {
    const key = pairKey(a, b);
    if (!key) return;
    const current = pairs.get(key) || { between: key.split(':'), affinity: 0, friction: 0, lastMove: 'silence' };
    current.affinity = boundedNumber(current.affinity + affinityDelta, 0, 100, 0);
    current.friction = boundedNumber(current.friction + frictionDelta, 0, 100, 0);
    current.lastMove = enumValue(lastMove, PAIR_MOVES, current.lastMove || 'silence');
    pairs.set(key, current);
  };

  previous.pairPressure.forEach(item => {
    addPair(item.between[0], item.between[1], Math.round(item.affinity * 0.68), Math.round(item.friction * 0.72), item.lastMove);
  });
  (Array.isArray(projected.alliances) ? projected.alliances : []).forEach(item => {
    const between = Array.isArray(item?.between) ? item.between : [];
    addPair(between[0], between[1], Math.round((Number(item?.strength || 0) || 0) * 34), -8, item.reason === 'shared-silence' ? 'silence' : 'alliance');
  });
  (Array.isArray(projected.interruptions) ? projected.interruptions : []).forEach(item => {
    addPair(item?.interrupter, item?.interrupted, 0, item?.kind === 'continuity-correction' ? 36 : 30, 'interruption');
  });
  (Array.isArray(projected.statusEvents) ? projected.statusEvents : []).forEach(event => {
    const target = speakerId(event?.targetSpeakerId);
    if (!target) return;
    const contribution = pairContributionForStatusEvent(event);
    addPair(event.speakerId, target, contribution.affinity, contribution.friction, contribution.lastMove);
  });

  const visibleSpeakers = (Array.isArray(input.messageEvents) ? input.messageEvents : []).map(item => speakerId(item?.speakerId)).filter(Boolean);
  if (visibleSpeakers.length >= 2) addPair(visibleSpeakers[0], visibleSpeakers[1], 8, 0, 'alliance');
  if (projected.roomMove === 'cool') {
    pairs.forEach(item => {
      item.friction = boundedNumber(item.friction - 12, 0, 100, 0);
      item.lastMove = item.lastMove === 'interruption' ? 'redirect' : item.lastMove;
    });
  }
  if (projected.roomMove === 'redirect') {
    pairs.forEach(item => {
      item.friction = boundedNumber(item.friction - 4, 0, 100, 0);
    });
  }

  const recentRoomMoves = [
    ...previous.recentRoomMoves,
    enumValue(projected.roomMove, ROOM_MOVES, 'observe')
  ].filter(Boolean).slice(-5);
  const interruptionPressure = boundedNumber(
    previous.interruptionPressure * 0.56
      + (Array.isArray(projected.interruptions) ? projected.interruptions.length : 0) * 28
      + (projected.statusEvents || []).filter(item => ['challenge', 'continuity-anchor'].includes(item.kind)).length * 8
      + (projected.roomMove === 'escalate' || projected.roomMove === 'challenge' ? 12 : 0)
      + (projected.roomMove === 'cool' ? -14 : 0)
      + (projected.tension >= 65 ? 8 : 0),
    0,
    100,
    0
  );

  return normalizeSocialMemory({
    statusMomentum: SPEAKERS.map(id => ({
      speakerId: id,
      value: boundedNumber(momentum.get(id) || 0, -100, 100, 0)
    })),
    pairPressure: [...pairs.values()].filter(item => item.affinity || item.friction),
    recentRoomMoves,
    interruptionPressure
  });
}

module.exports = {
  projectShowcaseSocialSignals
};
