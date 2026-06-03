(function () {
  'use strict';

  var MODES = {
    social_hierarchy_lab: 'Room',
    continuity_breaker: 'Continuity'
  };
  var CHARACTER_COLORS = {
    aisha: 'var(--aisha)',
    vanya: 'var(--vanya)',
    leah: 'var(--leah)',
    claudia: 'var(--claudia)',
    grok: 'var(--grok)',
    user: 'var(--text)'
  };
  var CHARACTER_NAMES = {
    aisha: 'A.I.S.H.A',
    vanya: 'Vanya',
    leah: 'Leah',
    claudia: 'Claudia',
    grok: 'Grok',
    user: 'You'
  };
  var SESSION_KEY = 'studio_pulse_showcase_session_id';
  var STATE_KEY = 'studio_pulse_showcase_state';
  var SPEAKER_IDS = ['aisha', 'vanya', 'leah', 'claudia', 'grok'];
  var HELD_TURN_MESSAGE = 'The room held that turn. Try again in a moment.';
  var HELD_TURN_STATUSES = [403, 409, 429, 503];
  var MAX_USER_TEXT = 1500;
  var SHOWCASE_VERSION = '1.7.1';
  window.__PULSE_SHOWCASE_VERSION = SHOWCASE_VERSION;
  var EMBED_MODE = queryFlag('embed') === '1';
  var TRUSTED_PARENT_ORIGINS = [
    'https://silvastudios.co.za',
    'https://www.silvastudios.co.za',
    'http://localhost:3225',
    'http://127.0.0.1:3225'
  ];

  var state = {
    sessionId: readSessionId(),
    mode: 'social_hierarchy_lab',
    messages: [],
    ledger: [],
    presence: {},
    roomMood: 'focused',
    responseMode: 'single',
    tensionScore: 18,
    socialSignals: defaultSocialSignals(),
    turnRuntime: defaultTurnRuntime(),
    priorSpeaker: '',
    status: null,
    busy: false,
    forceScroll: false,
    embedMode: EMBED_MODE
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function queryFlag(name) {
    try {
      return new URLSearchParams(window.location.search || '').get(name) || '';
    } catch (err) {
      return '';
    }
  }

  function applyEmbedMode() {
    document.body.classList.toggle('is-pulse-embed', EMBED_MODE);
    var shell = document.querySelector('.pulse-shell');
    if (shell) shell.setAttribute('data-embed', EMBED_MODE ? '1' : '0');
  }

  function apiUrl(path) {
    var base = String(window.SILVA_API_BASE_URL || '').trim().replace(/\/+$/, '');
    return base + path;
  }

  function pulseError(message, status) {
    var err = new Error(message || HELD_TURN_MESSAGE);
    err.status = Number(status || 0) || 0;
    err.safeHeldTurn = HELD_TURN_STATUSES.includes(err.status);
    return err;
  }

  function isHeldTurnError(err) {
    return err && (err.safeHeldTurn === true || HELD_TURN_STATUSES.includes(Number(err.status || 0)));
  }

  async function apiJson(path, options) {
    var response = await fetch(apiUrl(path), Object.assign({
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    }, options || {}));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw pulseError(data.message || data.error || ('Request failed: ' + response.status), response.status);
    }
    return data;
  }

  function parseSseBlock(block) {
    var event = 'message';
    var data = [];
    String(block || '').split(/\r?\n/).forEach(function (line) {
      if (line.indexOf('event:') === 0) event = line.slice(6).trim() || event;
      if (line.indexOf('data:') === 0) data.push(line.slice(5).trim());
    });
    if (!data.length) return null;
    try {
      return { event: event, data: JSON.parse(data.join('\n')) };
    } catch (err) {
      return null;
    }
  }

  async function apiStream(path, options, onEvent) {
    if (!window.ReadableStream || !window.TextDecoder) throw new Error('Streaming is unavailable in this browser.');
    var response = await fetch(apiUrl(path), Object.assign({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      cache: 'no-store'
    }, options || {}));
    if (!response.ok) {
      var failure = await response.json().catch(function () { return {}; });
      throw pulseError(failure.message || failure.error || ('Request failed: ' + response.status), response.status);
    }
    if (!response.body || !response.body.getReader) throw new Error('Streaming body is unavailable.');
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        var block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        var parsed = parseSseBlock(block);
        if (parsed) onEvent(parsed.event, parsed.data);
        boundary = buffer.indexOf('\n\n');
      }
    }
    buffer += decoder.decode();
    var tail = parseSseBlock(buffer);
    if (tail) onEvent(tail.event, tail.data);
  }

  function defaultSocialSignals() {
    return {
      tension: 18,
      continuityPressure: 0,
      hierarchy: SPEAKER_IDS.map(function (id, index) {
        return {
          speakerId: id,
          rank: index + 1,
          status: Math.max(45, 72 - index * 4),
          delta: 0,
          visibleState: 'listening'
        };
      }),
      alliances: [],
      interruptions: [],
      roomMove: 'observe',
      statusEvents: [],
      socialMemory: {
        statusMomentum: [],
        pairPressure: [],
        recentRoomMoves: [],
        interruptionPressure: 0
      }
    };
  }

  function defaultTurnRuntime() {
    return {
      acceptedByPack1: false,
      qualityAccepted: false,
      repairedByRuntime: false,
      runtimeConnected: false,
      fallbackCategory: '',
      qualityFailureCategory: '',
      runtimePhase: 'preflight'
    };
  }

  function makeSessionId() {
    return 'pulse-showcase-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function readSessionId() {
    try {
      var stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return stored;
      var next = makeSessionId();
      sessionStorage.setItem(SESSION_KEY, next);
      return next;
    } catch (err) {
      return makeSessionId();
    }
  }

  function persistState() {
    try {
      sessionStorage.setItem(SESSION_KEY, state.sessionId);
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        mode: state.mode,
        messages: state.messages.slice(-30),
        ledger: state.ledger.slice(0, 16),
        presence: state.presence,
        roomMood: state.roomMood,
        responseMode: state.responseMode,
        tensionScore: state.tensionScore,
        socialSignals: state.socialSignals,
        turnRuntime: state.turnRuntime,
        priorSpeaker: state.priorSpeaker
      }));
    } catch (err) {}
  }

  function restoreState() {
    try {
      var raw = sessionStorage.getItem(STATE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && MODES[saved.mode]) state.mode = saved.mode;
      if (Array.isArray(saved.messages)) state.messages = saved.messages.slice(-30);
      if (Array.isArray(saved.ledger)) state.ledger = saved.ledger.slice(0, 16);
      if (saved.presence && typeof saved.presence === 'object') state.presence = saved.presence;
      if (saved.roomMood) state.roomMood = compact(saved.roomMood, 40) || state.roomMood;
      if (saved.responseMode) state.responseMode = compact(saved.responseMode, 40) || state.responseMode;
      if (Number.isFinite(Number(saved.tensionScore))) state.tensionScore = Math.max(0, Math.min(100, Number(saved.tensionScore)));
      if (saved.socialSignals && typeof saved.socialSignals === 'object') updateSocialSignals(saved.socialSignals);
      if (saved.turnRuntime && typeof saved.turnRuntime === 'object') updateTurnRuntime(saved.turnRuntime);
      if (saved.priorSpeaker) state.priorSpeaker = safeSpeakerId(saved.priorSpeaker);
    } catch (err) {}
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function compact(value, max) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max || 500);
  }

  function safeToken(value, fallback) {
    var token = String(value || fallback || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    return token || fallback || 'unknown';
  }

  function safeSpeakerId(value) {
    var id = safeToken(value, '');
    return SPEAKER_IDS.includes(id) ? id : '';
  }

  function boundedNumber(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizePairMove(value) {
    var move = safeToken(value, 'silence');
    return ['challenge', 'defense', 'redirect', 'alliance', 'interruption', 'silence'].includes(move) ? move : 'silence';
  }

  function normalizeOptionalRoomMove(value) {
    var move = safeToken(value, '');
    return ['anchor', 'challenge', 'redirect', 'defend', 'deflect', 'cool', 'escalate', 'observe'].includes(move) ? move : '';
  }

  function normalizeSocialMemory(value, fallbackValue) {
    var source = value && typeof value === 'object' ? value : {};
    var fallback = fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : {};
    var seenMomentum = {};
    var seenPairs = {};
    var momentumSource = Array.isArray(source.statusMomentum) ? source.statusMomentum : (Array.isArray(fallback.statusMomentum) ? fallback.statusMomentum : []);
    var pairSource = Array.isArray(source.pairPressure) ? source.pairPressure : (Array.isArray(fallback.pairPressure) ? fallback.pairPressure : []);
    var movesSource = Array.isArray(source.recentRoomMoves) ? source.recentRoomMoves : (Array.isArray(fallback.recentRoomMoves) ? fallback.recentRoomMoves : []);
    return {
      statusMomentum: momentumSource.map(function (item) {
        var id = safeSpeakerId(item && item.speakerId);
        if (!id || seenMomentum[id]) return null;
        seenMomentum[id] = true;
        var valueNumber = boundedNumber(item && item.value, -100, 100);
        return valueNumber ? { speakerId: id, value: valueNumber } : null;
      }).filter(Boolean).slice(0, 5),
      pairPressure: pairSource.map(function (item) {
        var between = Array.isArray(item && item.between) ? item.between.map(safeSpeakerId).filter(Boolean).sort() : [];
        if (between.length !== 2 || between[0] === between[1]) return null;
        var key = between.join(':');
        if (seenPairs[key]) return null;
        seenPairs[key] = true;
        var affinity = boundedNumber(item && item.affinity, 0, 100);
        var friction = boundedNumber(item && item.friction, 0, 100);
        if (!affinity && !friction) return null;
        return {
          between: between,
          affinity: affinity,
          friction: friction,
          lastMove: normalizePairMove(item && item.lastMove)
        };
      }).filter(Boolean).slice(0, 4),
      recentRoomMoves: movesSource.map(normalizeOptionalRoomMove).filter(Boolean).slice(-5),
      interruptionPressure: boundedNumber(
        source.interruptionPressure != null ? source.interruptionPressure : fallback.interruptionPressure,
        0,
        100
      )
    };
  }

  function ledgerStatus(value) {
    var status = safeToken(value, 'active');
    return ['active', 'superseded', 'disputed'].includes(status) ? status : 'active';
  }

  function ledgerSource(value) {
    var source = safeToken(value, 'showcase-session');
    return source === 'pack1-memory' ? 'pack1-memory' : 'showcase-session';
  }

  function isNearBottom(node) {
    if (!node) return true;
    return node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  }

  function continuityStats() {
    return state.ledger.reduce(function (acc, item) {
      var status = ledgerStatus(item.status);
      acc.total += 1;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { total: 0, active: 0, superseded: 0, disputed: 0 });
  }

  function computeTension(payload) {
    if (payload && payload.socialSignals && Number.isFinite(Number(payload.socialSignals.tension))) {
      return Math.max(0, Math.min(100, Math.round(Number(payload.socialSignals.tension))));
    }
    var mood = compact(payload && payload.roomMood || state.roomMood || '', 40).toLowerCase();
    var base = {
      calm: 10,
      focused: 24,
      playful: 30,
      sharp: 48,
      tense: 68,
      hostile: 82,
      fragile: 64
    }[mood] || 28;
    var stats = continuityStats();
    if (stats.superseded) base += 12;
    if (stats.disputed) base += 22;
    if (payload && payload.diagnostics && payload.diagnostics.fallbackUsed) base += 12;
    return Math.max(0, Math.min(100, base));
  }

  function updateSocialSignals(value) {
    var source = value && typeof value === 'object' ? value : {};
    var fallback = state.socialSignals || defaultSocialSignals();
    var nextTension = source.tension != null ? source.tension : (fallback.tension != null ? fallback.tension : 18);
    var nextPressure = source.continuityPressure != null ? source.continuityPressure : (fallback.continuityPressure != null ? fallback.continuityPressure : 0);
    state.socialSignals = {
      tension: Math.max(0, Math.min(100, Math.round(Number(nextTension) || 0))),
      continuityPressure: Math.max(0, Math.min(100, Math.round(Number(nextPressure) || 0))),
      hierarchy: (Array.isArray(source.hierarchy) ? source.hierarchy : fallback.hierarchy || [])
        .map(function (item, index) {
          var id = safeSpeakerId(item && item.speakerId);
          if (!id) return null;
          return {
            speakerId: id,
            rank: Math.max(1, Math.min(5, Math.round(Number(item.rank || index + 1) || index + 1))),
            status: Math.max(0, Math.min(100, Math.round(Number(item.status || 0) || 0))),
            delta: Math.max(-99, Math.min(99, Math.round(Number(item.delta || 0) || 0))),
            visibleState: compact(item.visibleState || 'listening', 40) || 'listening'
          };
        })
        .filter(Boolean)
        .slice(0, 5),
      alliances: (Array.isArray(source.alliances) ? source.alliances : [])
        .map(function (item) {
          var between = Array.isArray(item.between) ? item.between.map(safeSpeakerId).filter(Boolean) : [];
          if (between.length !== 2 || between[0] === between[1]) return null;
          var reason = safeToken(item.reason, 'agreement');
          if (!['agreement', 'shared-silence', 'continuity-anchor'].includes(reason)) reason = 'agreement';
          return {
            between: between,
            strength: Math.max(0, Math.min(1, Number(item.strength || 0) || 0)),
            reason: reason
          };
        })
        .filter(Boolean)
        .slice(0, 3),
      interruptions: (Array.isArray(source.interruptions) ? source.interruptions : [])
        .map(function (item) {
          var interrupter = safeSpeakerId(item.interrupter);
          var interrupted = safeSpeakerId(item.interrupted);
          if (!interrupter || !interrupted || interrupter === interrupted) return null;
          var kind = safeToken(item.kind, 'status-cut');
          if (!['status-cut', 'continuity-correction'].includes(kind)) kind = 'status-cut';
          return { interrupter: interrupter, interrupted: interrupted, kind: kind };
        })
        .filter(Boolean)
        .slice(0, 2),
      roomMove: normalizeRoomMove(source.roomMove || fallback.roomMove || 'observe'),
      statusEvents: (Array.isArray(source.statusEvents) ? source.statusEvents : [])
        .map(function (item) {
          var id = safeSpeakerId(item.speakerId);
          if (!id) return null;
          var target = safeSpeakerId(item.targetSpeakerId);
          var kind = normalizeStatusEventKind(item.kind);
          return {
            speakerId: id,
            targetSpeakerId: target || '',
            kind: kind,
            weight: Math.max(0, Math.min(100, Math.round(Number(item.weight || 0) || 0)))
          };
        })
        .filter(Boolean)
        .slice(0, 4),
      socialMemory: normalizeSocialMemory(source.socialMemory, fallback.socialMemory)
    };
    if (!state.socialSignals.hierarchy.length) state.socialSignals.hierarchy = defaultSocialSignals().hierarchy;
    state.tensionScore = state.socialSignals.tension;
  }

  function normalizeRoomMove(value) {
    var move = safeToken(value, 'observe');
    return ['anchor', 'challenge', 'redirect', 'defend', 'deflect', 'cool', 'escalate', 'observe'].includes(move) ? move : 'observe';
  }

  function normalizeStatusEventKind(value) {
    var kind = safeToken(value, 'redirect');
    return ['challenge', 'defense', 'redirect', 'status-gain', 'status-loss', 'continuity-anchor', 'cooling-silence'].includes(kind) ? kind : 'redirect';
  }

  function updatePresence(events, silentReactions) {
    var next = {};
    SPEAKER_IDS.forEach(function (id) {
      next[id] = state.presence[id] || 'listening';
    });
    (silentReactions || []).forEach(function (item) {
      var id = safeSpeakerId(item.speakerId);
      if (next[id]) next[id] = compact(item.visibleState || 'watching', 40) || 'watching';
    });
    (events || []).forEach(function (item) {
      var id = safeSpeakerId(item.speakerId);
      if (next[id]) next[id] = compact(item.visibleState || item.role || 'speaking', 40) || 'speaking';
    });
    state.presence = next;
  }

  function updateLedgerFromPayload(payload) {
    if (!Array.isArray(payload && payload.continuityLedger) || !payload.continuityLedger.length) return;
    state.ledger = payload.continuityLedger.slice(0, 16).map(function (item) {
      return {
        id: compact(item.id || item.text || '', 120),
        text: compact(item.text || item.canonicalText || '', 280),
        status: ledgerStatus(item.status),
        source: ledgerSource(item.source)
      };
    }).filter(function (item) { return item.text; });
  }

  function normalizeRuntimePhase(value) {
    var phase = safeToken(value, 'preflight');
    return phase === 'final' ? 'final' : 'preflight';
  }

  function updateTurnRuntime(source) {
    var data = source && typeof source === 'object' ? source : {};
    var category = compact(data.fallbackCategory || (data.diagnostics && data.diagnostics.fallbackCategory) || '', 80);
    var runtimeConnected = data.runtimeConnected === true
      || data.aishaEngineConnected === true
      || (data.diagnostics && data.diagnostics.runtimeConnected === true)
      || (state.status && state.status.aishaEngineConnected === true);
    state.turnRuntime = {
      acceptedByPack1: data.acceptedByPack1 === true || (data.diagnostics && data.diagnostics.acceptedByPack1 === true),
      qualityAccepted: data.qualityAccepted === true || (data.diagnostics && data.diagnostics.qualityAccepted === true),
      repairedByRuntime: data.repairedByRuntime === true || (data.diagnostics && data.diagnostics.repairedByRuntime === true),
      runtimeConnected: runtimeConnected,
      fallbackCategory: category,
      qualityFailureCategory: compact(data.qualityFailureCategory || (data.diagnostics && data.diagnostics.qualityFailureCategory) || '', 80),
      runtimePhase: normalizeRuntimePhase(data.runtimePhase || (data.diagnostics && data.diagnostics.runtimePhase))
    };
  }

  function turnFallbackLabel(turn, runtimeConnected) {
    if (!turn || !turn.fallbackCategory) return 'waiting';
    var category = safeToken(turn.fallbackCategory, '');
    if (!runtimeConnected) return 'Local fallback';
    if (/^(validator-rejected|schema-invalid|json-parse-failed|raw-prompt-stuffing|banned-phrase)/.test(category)) {
      return 'Runtime repaired answer';
    }
    if (/^(quality-rejected|allowed-topic-refusal|topic-ignored|recent-repeat-risk|false-objective-claim|takeover-for-ordinary-topic)/.test(category)) return 'Runtime repaired answer';
    return 'Fallback carried this turn';
  }

  function heldTurnMessage() {
    return HELD_TURN_MESSAGE;
  }

  function isPersistenceConnected(source) {
    var data = source || {};
    if (data.persistence && data.persistence.connected === true) return true;
    if (data.diagnostics && data.diagnostics.persistenceConnected === true) return true;
    if (data.aishaPersistenceConnected === true) return true;
    return false;
  }

  function persistenceMode(source) {
    var data = source || {};
    if (data.persistence && data.persistence.mode) return compact(data.persistence.mode, 32);
    if (data.aishaPersistenceMode) return compact(data.aishaPersistenceMode, 32);
    return isPersistenceConnected(data) ? 'postgres' : 'unknown';
  }

  function mergeGlobalStatusFromTurn(data) {
    var source = data && typeof data === 'object' ? data : {};
    var prior = state.status && typeof state.status === 'object' ? state.status : {};
    var priorConnected = prior.aishaEngineConnected === true;
    var runtimeConnected = source.runtimeConnected === true
      || source.aishaEngineConnected === true
      || (source.diagnostics && source.diagnostics.runtimeConnected === true)
      || priorConnected;
    var persistenceConnected = isPersistenceConnected(source) || isPersistenceConnected(prior);
    var priorEngine = compact(prior.activeEngine || '', 80);
    var nextEngine = compact(source.activeEngine || '', 80);
    if (priorConnected && nextEngine && nextEngine !== 'aisha-runtime-pack1') nextEngine = priorEngine || 'aisha-runtime-pack1';
    return {
      ok: prior.ok === true || source.ok === true,
      activeEngine: nextEngine || priorEngine || (runtimeConnected ? 'aisha-runtime-pack1' : 'local-room-intelligence'),
      aishaEngineConnected: runtimeConnected,
      persistence: {
        mode: (prior.persistence && prior.persistence.mode) || (source.persistence && source.persistence.mode) || persistenceMode(source) || 'postgres',
        connected: persistenceConnected,
        active: Boolean((source.persistence && source.persistence.active) || (prior.persistence && prior.persistence.active))
      },
      continuity: source.continuityProof || source.continuity || prior.continuity || null,
      lastTurn: source.lastTurn || prior.lastTurn || null,
      modeLabels: source.modeLabels || prior.modeLabels || MODES
    };
  }

  function parentTargetOrigin() {
    try {
      if (!document.referrer) return '';
      var origin = new URL(document.referrer).origin;
      return trustedParentOrigin(origin) ? origin : '';
    } catch (err) {
      return '';
    }
  }

  function parentEnvelope(type, payload) {
    return Object.assign({
      type: type,
      source: 'studio-pulse-showcase',
      version: SHOWCASE_VERSION,
      embed: EMBED_MODE,
      mode: state.mode
    }, payload || {});
  }

  function postParentEvent(type, payload) {
    try {
      var target = parentTargetOrigin();
      if (!target) return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(parentEnvelope(type, payload), target);
      }
    } catch (err) {}
  }

  function safeStatusPayload() {
    var status = state.status || {};
    return {
      activeEngine: compact(status.activeEngine || 'checking', 80),
      aishaEngineConnected: status.aishaEngineConnected === true,
      persistenceConnected: isPersistenceConnected(status),
      persistenceMode: persistenceMode(status),
      continuityActive: status.continuity && status.continuity.active === true,
      continuityRows: status.continuity ? Number(status.continuity.pack1Rows || 0) || 0 : 0,
      statusKnown: status.ok === true
    };
  }

  function safeTurnStatePayload(source) {
    var data = source && typeof source === 'object' ? source : {};
    var runtime = state.turnRuntime || defaultTurnRuntime();
    var status = state.status || {};
    return {
      runtimePhase: normalizeRuntimePhase(data.runtimePhase || runtime.runtimePhase),
      acceptedByPack1: data.acceptedByPack1 === true || (data.diagnostics && data.diagnostics.acceptedByPack1 === true) || runtime.acceptedByPack1 === true,
      qualityAccepted: data.qualityAccepted === true || (data.diagnostics && data.diagnostics.qualityAccepted === true) || runtime.qualityAccepted === true,
      repairedByRuntime: data.repairedByRuntime === true || (data.diagnostics && data.diagnostics.repairedByRuntime === true) || runtime.repairedByRuntime === true,
      runtimeConnected: data.runtimeConnected === true || data.aishaEngineConnected === true || (data.diagnostics && data.diagnostics.runtimeConnected === true) || runtime.runtimeConnected === true || status.aishaEngineConnected === true,
      fallbackCategory: compact(data.fallbackCategory || runtime.fallbackCategory || '', 80),
      qualityFailureCategory: compact(data.qualityFailureCategory || (data.diagnostics && data.diagnostics.qualityFailureCategory) || runtime.qualityFailureCategory || '', 80),
      activeEngine: compact(data.activeEngine || status.activeEngine || 'local-room-intelligence', 80),
      persistenceConnected: isPersistenceConnected(data) || isPersistenceConnected(status),
      roomMood: compact(data.roomMood || state.roomMood || 'focused', 40),
      responseMode: compact(data.responseMode || state.responseMode || 'single', 40),
      tension: Math.max(0, Math.min(100, Math.round(Number(state.socialSignals.tension || state.tensionScore || 0) || 0))),
      continuityPressure: Math.max(0, Math.min(100, Math.round(Number(state.socialSignals.continuityPressure || 0) || 0))),
      roomMove: normalizeRoomMove(state.socialSignals.roomMove || 'observe')
    };
  }

  function reportReady() {
    postParentEvent('PULSE_READY', {
      height: currentHeight(),
      statusKnown: !!(state.status && state.status.ok === true)
    });
  }

  function reportStatus() {
    postParentEvent('PULSE_STATUS', safeStatusPayload());
  }

  function reportTurnState(source) {
    postParentEvent('PULSE_TURN_STATE', safeTurnStatePayload(source));
  }

  function reportError(category, message) {
    postParentEvent('PULSE_ERROR', {
      category: compact(category || 'turn-held', 48),
      message: compact(message || HELD_TURN_MESSAGE, 120)
    });
  }

  function setMode(mode) {
    state.mode = MODES[mode] ? mode : 'social_hierarchy_lab';
    document.querySelector('.pulse-shell').dataset.mode = state.mode;
    document.querySelectorAll('.mode-button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    el.roomModeTitle.textContent = 'Open the room';
    if (el.modeChipValue) el.modeChipValue.textContent = MODES[state.mode];
    persistState();
    reportHeight();
    reportStatus();
  }

  function renderStatus() {
    var status = state.status || {};
    var connected = status.aishaEngineConnected === true;
    el.runtimeDot.className = 'runtime-dot ' + (connected ? 'connected' : 'offline');
    el.runtimeLabel.textContent = connected ? 'Pack 1 connected' : 'Local fallback';
    el.engineValue.textContent = friendlyEngineName(status.activeEngine);
    var persistenceState = status.persistence && status.persistence.connected ? 'Persistence connected' : 'pending';
    el.persistenceValue.textContent = status.persistence
      ? (status.persistence.mode + (persistenceState === 'Persistence connected' ? (status.persistence.active ? ' active' : ' connected') : ' pending'))
      : '--';
    var turn = state.turnRuntime || defaultTurnRuntime();
    var turnConnected = connected || turn.runtimeConnected === true;
    var turnClass = turn.repairedByRuntime
      ? 'repaired'
      : (turn.acceptedByPack1 && turn.qualityAccepted ? 'accepted' : (turn.fallbackCategory ? (turnConnected ? 'repaired' : 'fallback') : 'waiting'));
    var turnText = turn.repairedByRuntime
      ? 'Runtime repaired answer'
      : (turn.acceptedByPack1 && turn.qualityAccepted
      ? 'Room answer accepted'
      : turnFallbackLabel(turn, turnConnected));
    el.turnStateValue.className = 'turn-state-value ' + turnClass;
    el.turnStateValue.textContent = turnText;
    el.turnStateValue.title = turn.qualityFailureCategory || turn.fallbackCategory || turnText;
    if (el.turnChipValue) {
      el.turnChipValue.className = 'turn-chip-value ' + turnClass;
      el.turnChipValue.textContent = turnText;
      el.turnChipValue.title = turn.qualityFailureCategory || turn.fallbackCategory || turnText;
    }
    el.roomSignalValue.textContent = state.roomMood + ' / ' + state.responseMode;
    var stats = continuityStats();
    var proof = status.continuity || {};
    el.continuityValue.textContent = proof.active
      ? ('Pack 1 memory: ' + (proof.activeTruths || stats.active || 0) + ' active / ' + (proof.supersededTruths || stats.superseded || 0) + ' superseded')
      : (stats.total
        ? (stats.active + ' active, ' + stats.superseded + ' superseded, ' + stats.disputed + ' disputed')
        : 'Pack 1 memory waiting');
    el.sessionValue.textContent = friendlySessionId(state.sessionId);
    if (el.tensionFill) el.tensionFill.style.width = state.tensionScore + '%';
    if (el.continuityFill) el.continuityFill.style.width = (state.socialSignals.continuityPressure || 0) + '%';
    if (el.modeChipValue) el.modeChipValue.textContent = MODES[state.mode] || 'Room';
  }

  function speakerDot(id) {
    return '<span class="speaker-dot" style="background:' + (CHARACTER_COLORS[id] || 'var(--soft)') + '"></span>';
  }

  function speakerName(id) {
    return CHARACTER_NAMES[id] || id;
  }

  function speakerAccent(id) {
    return CHARACTER_COLORS[id] || 'var(--soft)';
  }

  function friendlyEngineName(value) {
    var engine = compact(value || '', 80);
    if (engine === 'aisha-runtime-pack1') return 'Pack 1 runtime';
    if (engine === 'local-room-intelligence') return 'Local room';
    return engine || '--';
  }

  function friendlySessionId(value) {
    var id = String(value || '').replace(/^pulse-showcase-/, '');
    return id.length > 13 ? id.slice(-13) : id || '--';
  }

  function setProcessingText(value) {
    if (!el.processingStatus) return;
    var text = compact(value || 'Room is reading the turn.', 120);
    var shine = el.processingStatus.querySelector('.processing-shine');
    if (shine) {
      shine.textContent = text;
    } else {
      el.processingStatus.textContent = text;
    }
  }

  function syncVisualState() {
    document.body.classList.toggle('has-room-messages', state.messages.length > 0);
  }

  function renderSocialSignals() {
    var signals = state.socialSignals || defaultSocialSignals();
    var socialMemory = normalizeSocialMemory(signals.socialMemory || {}, defaultSocialSignals().socialMemory);
    if (el.roomMoveValue) el.roomMoveValue.textContent = 'Room move: ' + normalizeRoomMove(signals.roomMove || 'observe');
    if (el.hierarchyList) {
      el.hierarchyList.innerHTML = (signals.hierarchy || []).map(function (item) {
        var id = safeSpeakerId(item.speakerId);
        var delta = Math.round(Number(item.delta || 0) || 0);
        var deltaClass = delta > 0 ? 'positive' : delta < 0 ? 'negative' : '';
        var deltaText = delta > 0 ? '+' + delta : String(delta);
        return [
          '<div class="hierarchy-item">',
          '<span class="hierarchy-rank">#' + escapeHtml(item.rank || '') + '</span>',
          '<span class="hierarchy-name">' + speakerDot(id) + escapeHtml(speakerName(id)) + '</span>',
          '<span class="hierarchy-score ' + deltaClass + '">' + escapeHtml(Math.round(Number(item.status || 0))) + ' ' + escapeHtml(deltaText) + '</span>',
          '<span class="hierarchy-bar" aria-hidden="true"><span style="width:' + Math.max(0, Math.min(100, Number(item.status || 0))) + '%"></span></span>',
          '</div>'
        ].join('');
      }).join('');
    }

    if (el.dynamicsList) {
      var rows = [];
      if (signals.roomMove) {
        rows.push('<div class="room-move-chip">Room move: ' + escapeHtml(normalizeRoomMove(signals.roomMove)) + '</div>');
      }
      (signals.statusEvents || []).slice(0, 4).forEach(function (item) {
        var target = item.targetSpeakerId ? (' → ' + speakerName(item.targetSpeakerId)) : '';
        rows.push(
          '<div class="dynamics-item status-event"><strong>' +
          escapeHtml(speakerName(item.speakerId)) +
          '</strong>' +
          escapeHtml(target) +
          ' · ' +
          escapeHtml(normalizeStatusEventKind(item.kind)) +
          ' <span>' +
          escapeHtml(Math.round(Number(item.weight || 0))) +
          '</span></div>'
        );
      });
      socialMemory.statusMomentum.slice(0, 3).forEach(function (item) {
        var sign = item.value > 0 ? '+' : '';
        rows.push(
          '<div class="dynamics-item social-memory-item"><strong>' +
          escapeHtml(speakerName(item.speakerId)) +
          '</strong> momentum ' +
          escapeHtml(sign + item.value) +
          '</div>'
        );
      });
      socialMemory.pairPressure.slice(0, 2).forEach(function (item) {
        var dominant = item.friction > item.affinity ? 'friction' : 'affinity';
        var value = dominant === 'friction' ? item.friction : item.affinity;
        rows.push(
          '<div class="dynamics-item pair-pressure pair-pressure-' + dominant + '"><strong>' +
          escapeHtml(speakerName(item.between[0])) +
          '</strong> / <strong>' +
          escapeHtml(speakerName(item.between[1])) +
          '</strong> ' +
          escapeHtml(dominant) +
          ' <span>' +
          escapeHtml(value) +
          '</span></div>'
        );
      });
      if (socialMemory.interruptionPressure) {
        rows.push(
          '<div class="dynamics-item interruption-pressure">Interruption pressure <span>' +
          escapeHtml(socialMemory.interruptionPressure) +
          '</span></div>'
        );
      }
      (signals.interruptions || []).forEach(function (item) {
        rows.push(
          '<div class="dynamics-item interruption"><strong>' +
          escapeHtml(speakerName(item.interrupter)) +
          '</strong> cut across ' +
          escapeHtml(speakerName(item.interrupted)) +
          ' (' + escapeHtml(item.kind) + ')</div>'
        );
      });
      (signals.alliances || []).forEach(function (item) {
        var between = Array.isArray(item.between) ? item.between : [];
        rows.push(
          '<div class="dynamics-item"><strong>' +
          escapeHtml(speakerName(between[0])) +
          '</strong> and <strong>' +
          escapeHtml(speakerName(between[1])) +
          '</strong> aligned: ' +
          escapeHtml(item.reason || 'agreement') +
          '</div>'
        );
      });
      el.dynamicsList.innerHTML = rows.length ? rows.slice(0, 7).join('') : '<div class="empty-state">No visible shifts yet.</div>';
    }
  }

  function renderMessages() {
    syncVisualState();
    var shouldStick = state.forceScroll || isNearBottom(el.feed);
    if (!state.messages.length) {
      el.feed.innerHTML = [
        '<div class="room-empty">',
        '<span class="empty-kicker">Open the room</span>',
        '<h3>Say what you need. The room will test it.</h3>',
        '<p>Room chat is live. Continuity and social pressure will appear after the first turn.</p>',
        '<div class="empty-presence" aria-label="Characters present">',
        SPEAKER_IDS.map(function (id) {
          return '<span>' + speakerDot(id) + escapeHtml(speakerName(id)) + '</span>';
        }).join(''),
        '</div>',
        '</div>'
      ].join('');
      state.forceScroll = false;
      return;
    }
    el.feed.innerHTML = state.messages.map(function (message) {
      var id = message.speakerId || 'user';
      var className = id === 'user' ? 'user' : 'character';
      var speakerToken = safeToken(id, 'unknown');
      return [
        '<article class="message ' + className + ' speaker-' + speakerToken + '" style="--speaker-color:' + speakerAccent(id) + '">',
        '<div class="message-head">',
        '<div class="speaker">' + speakerDot(id) + '<span>' + escapeHtml(message.speakerName || CHARACTER_NAMES[id] || id) + '</span></div>',
        '<div class="message-role">' + escapeHtml(message.role || '') + '</div>',
        '</div>',
        '<p class="message-text">' + escapeHtml(message.text || '') + '</p>',
        '</article>'
      ].join('');
    }).join('');
    if (shouldStick) el.feed.scrollTop = el.feed.scrollHeight;
    state.forceScroll = false;
  }

  function renderLedger() {
    el.ledger.innerHTML = state.ledger.length
      ? state.ledger.map(function (item) {
        var status = ledgerStatus(item.status);
        var source = ledgerSource(item.source);
        return [
          '<div class="ledger-item ledger-status-' + status + ' ledger-source-' + source + '">',
          '<div class="ledger-meta">',
          '<strong>' + escapeHtml(status.toUpperCase()) + '</strong>',
          '<em>' + escapeHtml(source) + '</em>',
          '</div>',
          '<span>' + escapeHtml(item.text || '') + '</span>',
          '</div>'
        ].join('');
      }).join('')
      : '<div class="empty-state">No continuity entries yet.</div>';
  }

  function renderPresence(events, silentReactions) {
    if (events || silentReactions) updatePresence(events || [], silentReactions || []);
    el.presence.innerHTML = SPEAKER_IDS.map(function (id) {
      var visibleState = compact(state.presence[id] || 'listening', 40);
      return [
        '<div class="presence-item presence-state-' + safeToken(visibleState, 'listening') + '">',
        '<span>' + speakerDot(id) + ' ' + escapeHtml(CHARACTER_NAMES[id]) + '</span>',
        '<span>' + escapeHtml(visibleState) + '</span>',
        '</div>'
      ].join('');
    }).join('');
  }

  function renderAll() {
    el.roomMood.textContent = 'Mood: ' + state.roomMood;
    el.responseMode.textContent = 'Mode: ' + state.responseMode;
    renderStatus();
    renderMessages();
    renderLedger();
    renderSocialSignals();
    renderPresence();
    el.charCount.textContent = (el.userText.value || '').length + '/' + MAX_USER_TEXT;
    reportHeight();
  }

  function setBusy(value) {
    state.busy = value === true;
    document.body.classList.toggle('is-busy', state.busy);
    el.send.disabled = state.busy;
    el.userText.disabled = state.busy;
    el.userText.setAttribute('aria-busy', state.busy ? 'true' : 'false');
    document.querySelectorAll('.mode-button, .reset-button').forEach(function (button) {
      button.disabled = state.busy;
    });
    if (el.processingStatus) el.processingStatus.setAttribute('aria-hidden', state.busy ? 'false' : 'true');
    reportHeight();
  }

  async function refreshStatus() {
    try {
      state.status = await apiJson('/api/studio/pulse-showcase/status');
      renderStatus();
      reportHeight();
      reportStatus();
    } catch (err) {
      state.status = {
        activeEngine: 'local-room-intelligence',
        aishaEngineConnected: false,
        persistence: { mode: 'memory', connected: false }
      };
      renderStatus();
      reportStatus();
    }
  }

  function isContinuityClaimMessage(message) {
    if (!message || !/^user$/i.test(String(message.speakerId || message.role || ''))) return false;
    var text = compact(message.text || '', 1500);
    return /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text)
      && /\b(is|=)\b/i.test(text);
  }

  function recentTurns() {
    var selected = [];
    var seen = {};
    function add(message) {
      if (!message) return;
      var key = [message.speakerId || '', message.role || '', message.text || ''].join('|');
      if (seen[key]) return;
      seen[key] = true;
      selected.push(message);
    }
    state.messages.filter(isContinuityClaimMessage).slice(-6).forEach(add);
    state.messages.slice(-16).forEach(add);
    return selected.slice(-18).map(function (message) {
      return {
        speakerId: message.speakerId,
        role: message.role || 'message',
        text: message.text
      };
    });
  }

  function turnRequestBody(text, priorSpeaker, priorRecentTurns) {
    return {
      sessionId: state.sessionId,
      mode: state.mode,
      userText: text,
      recentTurns: Array.isArray(priorRecentTurns) ? priorRecentTurns : recentTurns(),
      roomState: {
        roomMood: state.roomMood,
        responseMode: state.responseMode,
        priorSpeaker: priorSpeaker || state.priorSpeaker || '',
        socialSignals: state.socialSignals
      }
    };
  }

  function updatePriorSpeaker(events) {
    var visible = (Array.isArray(events) ? events : []).map(function (item) {
      return safeSpeakerId(item && item.speakerId);
    }).filter(Boolean);
    if (visible.length) state.priorSpeaker = visible[visible.length - 1];
  }

  function applyTurnPayload(payload, options) {
    var opts = options || {};
    state.sessionId = payload.sessionId || state.sessionId;
    state.status = mergeGlobalStatusFromTurn(payload);
    updateTurnRuntime(payload);
    state.roomMood = compact(payload.roomMood || 'focused', 40) || 'focused';
    state.responseMode = compact(payload.responseMode || 'single', 40) || 'single';
    el.roomMood.textContent = 'Mood: ' + state.roomMood;
    el.responseMode.textContent = 'Mode: ' + state.responseMode;
    if (!opts.messagesAlreadyRendered) {
      (payload.messageEvents || []).forEach(function (item) { state.messages.push(item); });
    }
    updateLedgerFromPayload(payload);
    updateSocialSignals(payload.socialSignals || { tension: computeTension(payload) });
    updatePriorSpeaker(payload.messageEvents || []);
    state.forceScroll = true;
    renderStatus();
    renderMessages();
    renderLedger();
    renderSocialSignals();
    renderPresence(payload.messageEvents || [], payload.silentReactions || []);
    persistState();
    reportTurnState(payload);
    reportHeight();
  }

  function handleStreamEvent(event, data, streamState) {
    streamState.touched = true;
    if (event === 'turn_start') {
      setProcessingText('Turn entered. Runtime is checking continuity.');
      return;
    }
    if (event === 'runtime_status') {
      state.status = mergeGlobalStatusFromTurn(data || {});
      updateTurnRuntime(data || {});
      renderStatus();
      setProcessingText(data && (data.repairedByRuntime || (data.diagnostics && data.diagnostics.repairedByRuntime))
        ? 'Runtime repaired the room answer.'
        : (data && data.acceptedByPack1 && (data.qualityAccepted || (data.diagnostics && data.diagnostics.qualityAccepted))
          ? 'Room answer accepted. The exchange is landing.'
          : (state.turnRuntime.runtimeConnected ? 'Runtime is repairing the turn shape.' : 'Runtime is holding a stable fallback path.')));
      reportTurnState(data || {});
      return;
    }
    if (event === 'processing') {
      setProcessingText(data.visibleState || data.stage || 'Room is reading the turn.');
      return;
    }
    if (event === 'social_signals') {
      updateSocialSignals(data || {});
      renderStatus();
      renderSocialSignals();
      setProcessingText('Social pressure mapped. Waiting for the voices.');
      return;
    }
    if (event === 'message') {
      streamState.messagesRendered = true;
      state.messages.push(data);
      updatePriorSpeaker([data]);
      state.forceScroll = true;
      renderMessages();
      renderPresence([data], []);
      setProcessingText('A voice landed. Reconciling the room state.');
      reportHeight();
      return;
    }
    if (event === 'silent_reaction') {
      renderPresence([], [data]);
      reportHeight();
      return;
    }
    if (event === 'ledger') {
      updateLedgerFromPayload({ continuityLedger: data.continuityLedger || [] });
      renderLedger();
      renderStatus();
      setProcessingText('Continuity ledger updated.');
      reportHeight();
      return;
    }
    if (event === 'final') {
      streamState.finalPayload = data;
      return;
    }
    if (event === 'error') {
      streamState.error = new Error(data.message || data.error || 'Stream failed');
    }
  }

  async function submitTurnPayload(body) {
    var streamState = { touched: false, messagesRendered: false, finalPayload: null, error: null };
    try {
      await apiStream('/api/studio/pulse-showcase/turn-stream', {
        body: JSON.stringify(body)
      }, function (event, data) {
        handleStreamEvent(event, data, streamState);
      });
      if (streamState.error) throw streamState.error;
      if (!streamState.finalPayload) throw new Error('Stream ended before final reconciliation.');
      applyTurnPayload(streamState.finalPayload, { messagesAlreadyRendered: streamState.messagesRendered });
      return;
    } catch (err) {
      if (isHeldTurnError(err)) throw err;
      setProcessingText('Stream unavailable. Using stable turn path.');
      var payload = await apiJson('/api/studio/pulse-showcase/turn', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      applyTurnPayload(payload, { messagesAlreadyRendered: streamState.messagesRendered });
    }
  }

  async function submitTurn(event) {
    event.preventDefault();
    if (state.busy) return;
    var text = compact(el.userText.value, MAX_USER_TEXT);
    if (!text) return;

    var priorSpeaker = state.priorSpeaker;
    var priorRecentTurns = recentTurns();
    setBusy(true);
    setProcessingText('Room is reading the turn.');
    state.messages.push({ speakerId: 'user', speakerName: 'You', role: 'user', text: text });
    state.forceScroll = true;
    el.userText.value = '';
    renderMessages();
    el.charCount.textContent = '0/' + MAX_USER_TEXT;
    persistState();

    try {
      await submitTurnPayload(turnRequestBody(text, priorSpeaker, priorRecentTurns));
    } catch (err) {
      state.messages.push({
        speakerId: 'aisha',
        speakerName: 'A.I.S.H.A',
        role: 'system',
        text: isHeldTurnError(err) ? (heldTurnMessage() + ' Your message is back in the composer.') : 'Runtime missed that turn. Your message is back in the composer.'
      });
      el.userText.value = text;
      el.charCount.textContent = text.length + '/' + MAX_USER_TEXT;
      reportError(isHeldTurnError(err) ? 'turn-held' : 'runtime-missed', isHeldTurnError(err) ? heldTurnMessage() : 'Runtime missed that turn. Your message is back in the composer.');
      state.forceScroll = true;
      renderMessages();
    } finally {
      setBusy(false);
      setProcessingText('Room is reading the turn.');
      el.userText.focus();
      reportHeight();
    }
  }

  function resetSession() {
    state.sessionId = makeSessionId();
    state.messages = [];
    state.ledger = [];
    state.presence = {};
    state.roomMood = 'focused';
    state.responseMode = 'single';
    state.tensionScore = 18;
    state.socialSignals = defaultSocialSignals();
    state.turnRuntime = defaultTurnRuntime();
    state.priorSpeaker = '';
    state.forceScroll = true;
    try {
      sessionStorage.setItem(SESSION_KEY, state.sessionId);
      sessionStorage.removeItem(STATE_KEY);
    } catch (err) {}
    renderAll();
    reportTurnState(defaultTurnRuntime());
  }

  function currentHeight() {
    return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0);
  }

  function reportHeight() {
    postParentEvent('PULSE_HEIGHT', {
      height: currentHeight()
    });
  }

  function trustedParentOrigin(origin) {
    return TRUSTED_PARENT_ORIGINS.includes(String(origin || '').trim());
  }

  function bind() {
    el.runtimeDot = $('runtime-dot');
    el.runtimeLabel = $('runtime-label');
    el.roomModeTitle = $('room-mode-title');
    el.roomMood = $('room-mood');
    el.responseMode = $('response-mode');
    el.modeChipValue = $('mode-chip-value');
    el.roomMoveValue = $('room-move-value');
    el.turnChipValue = $('turn-chip-value');
    el.feed = $('room-feed');
    el.form = $('room-form');
    el.userText = $('user-text');
    el.charCount = $('char-count');
    el.send = $('send-turn');
    el.processingStatus = $('processing-status');
    el.engineValue = $('engine-value');
    el.persistenceValue = $('persistence-value');
    el.turnStateValue = $('turn-state-value');
    el.roomSignalValue = $('room-signal-value');
    el.continuityValue = $('continuity-value');
    el.sessionValue = $('session-value');
    el.tensionFill = $('tension-fill');
    el.continuityFill = $('continuity-fill');
    el.hierarchyList = $('hierarchy-list');
    el.dynamicsList = $('dynamics-list');
    el.presence = $('presence-list');
    el.ledger = $('ledger-list');

    document.querySelectorAll('.mode-button').forEach(function (button) {
      button.addEventListener('click', function () { setMode(button.dataset.mode); });
    });
    $('reset-session').addEventListener('click', resetSession);
    el.form.addEventListener('submit', submitTurn);
    el.userText.addEventListener('input', function () {
      el.charCount.textContent = (el.userText.value || '').length + '/' + MAX_USER_TEXT;
    });
    window.addEventListener('resize', reportHeight);
    window.addEventListener('message', function (event) {
      if (!trustedParentOrigin(event.origin)) return;
      var data = event.data || {};
      if (data.type === 'PULSE_SET_MODE') setMode(data.mode);
      if (data.type === 'PULSE_RESET') resetSession();
      if (data.type === 'PULSE_PING') reportReady();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyEmbedMode();
    bind();
    restoreState();
    setMode(state.mode);
    renderAll();
    refreshStatus();
    reportReady();
  });
})();
