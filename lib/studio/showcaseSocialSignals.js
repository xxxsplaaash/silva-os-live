const SPEAKERS = Object.freeze(['aisha', 'vanya', 'leah', 'claudia', 'grok']);
const ROOM_MOVES = Object.freeze(['anchor', 'challenge', 'redirect', 'defend', 'deflect', 'cool', 'escalate', 'observe']);
const STANCES = Object.freeze(['dominant', 'defensive', 'allied', 'dismissive', 'curious', 'silent']);
const INTERRUPTION_KINDS = Object.freeze(['status-cut', 'continuity-correction']);
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

  const cues = normalizeSocialCues(socialCues);
  cues.speakerCues.forEach(item => {
    deltas.set(item.speakerId, (deltas.get(item.speakerId) || 0) + item.statusDelta);
  });

  if (stats.pack1) deltas.set('aisha', (deltas.get('aisha') || 0) + 5);
  if (stats.superseded || stats.disputed) deltas.set('grok', (deltas.get('grok') || 0) + 3);
  if (mode === 'continuity_breaker') deltas.set('aisha', (deltas.get('aisha') || 0) + 2);
  if (responseMode === 'open_floor') deltas.set('vanya', (deltas.get('vanya') || 0) + 2);
  if (diagnostics?.fallbackUsed) deltas.set('aisha', (deltas.get('aisha') || 0) - 4);

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

function buildAlliances({ messageEvents = [], silentReactions = [], continuityLedger = [], socialCues = {} } = {}) {
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

  const cues = normalizeSocialCues(socialCues);
  cues.speakerCues.forEach(item => {
    if (item.allianceWith) add([item.speakerId, item.allianceWith], item.stance === 'allied' ? 0.72 : 0.52, 'agreement');
  });

  return alliances.slice(0, 3);
}

function buildInterruptions({ roomState = {}, responseMode = '', messageEvents = [], continuityLedger = [], socialCues = {} } = {}) {
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

  const cues = normalizeSocialCues(socialCues);
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
  const cueMove = normalizeSocialCues(input.socialCues).roomMove;
  if (cueMove) return cueMove;
  if (stats.superseded || stats.disputed || input.responseMode === 'aisha_takeover') return 'anchor';
  if (input.responseMode === 'open_floor') return 'redirect';
  if (input.diagnostics?.fallbackUsed) return 'deflect';
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
  const cues = normalizeSocialCues(input.socialCues);
  return cues.speakerCues
    .map(cue => ({
      speakerId: cue.speakerId,
      ...(cue.targetSpeakerId ? { targetSpeakerId: cue.targetSpeakerId } : {}),
      kind: statusEventKind(cue),
      weight: Math.round(clamp(48 + Math.abs(cue.statusDelta) * 6 + (cue.interruptionKind ? 16 : 0), 0, 100))
    }))
    .slice(0, 4);
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
      + (input.diagnostics?.fallbackUsed ? 10 : 0),
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

  return {
    tension: Math.round(tension),
    continuityPressure: Math.round(continuityPressure),
    hierarchy: buildHierarchy(input),
    alliances: buildAlliances(input),
    interruptions: buildInterruptions(input),
    roomMove: derivedRoomMove(input, stats),
    statusEvents: buildStatusEvents(input)
  };
}

module.exports = {
  projectShowcaseSocialSignals
};
