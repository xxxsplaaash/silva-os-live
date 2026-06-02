(function () {
  'use strict';

  var MODES = {
    social_hierarchy_lab: 'Social Hierarchy Lab',
    continuity_breaker: 'Continuity Breaker'
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
    priorSpeaker: '',
    status: null,
    busy: false,
    forceScroll: false
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function apiUrl(path) {
    var base = String(window.SILVA_API_BASE_URL || '').trim().replace(/\/+$/, '');
    return base + path;
  }

  async function apiJson(path, options) {
    var response = await fetch(apiUrl(path), Object.assign({
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    }, options || {}));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(data.error || data.message || ('Request failed: ' + response.status));
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
      throw new Error(failure.error || failure.message || ('Request failed: ' + response.status));
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
      interruptions: []
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
        .slice(0, 2)
    };
    if (!state.socialSignals.hierarchy.length) state.socialSignals.hierarchy = defaultSocialSignals().hierarchy;
    state.tensionScore = state.socialSignals.tension;
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

  function setMode(mode) {
    state.mode = MODES[mode] ? mode : 'social_hierarchy_lab';
    document.querySelector('.pulse-shell').dataset.mode = state.mode;
    document.querySelectorAll('.mode-button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.mode === state.mode);
    });
    el.roomModeTitle.textContent = MODES[state.mode];
    persistState();
    reportHeight();
  }

  function renderStatus() {
    var status = state.status || {};
    var connected = status.aishaEngineConnected === true;
    el.runtimeDot.className = 'runtime-dot ' + (connected ? 'connected' : 'offline');
    el.runtimeLabel.textContent = connected ? 'Pack 1 connected' : 'Local fallback';
    el.engineValue.textContent = status.activeEngine || '--';
    el.persistenceValue.textContent = status.persistence
      ? (status.persistence.mode + (status.persistence.connected ? ' connected' : ' pending'))
      : '--';
    el.roomSignalValue.textContent = state.roomMood + ' / ' + state.responseMode;
    var stats = continuityStats();
    el.continuityValue.textContent = stats.total
      ? (stats.active + ' active, ' + stats.superseded + ' superseded, ' + stats.disputed + ' disputed')
      : 'waiting';
    el.sessionValue.textContent = state.sessionId.slice(0, 32);
    if (el.tensionFill) el.tensionFill.style.width = state.tensionScore + '%';
    if (el.continuityFill) el.continuityFill.style.width = (state.socialSignals.continuityPressure || 0) + '%';
  }

  function speakerDot(id) {
    return '<span class="speaker-dot" style="background:' + (CHARACTER_COLORS[id] || 'var(--soft)') + '"></span>';
  }

  function speakerName(id) {
    return CHARACTER_NAMES[id] || id;
  }

  function renderSocialSignals() {
    var signals = state.socialSignals || defaultSocialSignals();
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
      el.dynamicsList.innerHTML = rows.length ? rows.slice(0, 4).join('') : '<div class="empty-state">No visible shifts yet.</div>';
    }
  }

  function renderMessages() {
    var shouldStick = state.forceScroll || isNearBottom(el.feed);
    if (!state.messages.length) {
      el.feed.innerHTML = '<div class="empty-state">The room is waiting for the first turn.</div>';
      state.forceScroll = false;
      return;
    }
    el.feed.innerHTML = state.messages.map(function (message) {
      var id = message.speakerId || 'user';
      return [
        '<article class="message ' + (id === 'user' ? 'user' : 'character') + '">',
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
    el.charCount.textContent = (el.userText.value || '').length + '/500';
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
    } catch (err) {
      state.status = {
        activeEngine: 'local-room-intelligence',
        aishaEngineConnected: false,
        persistence: { mode: 'memory', connected: false }
      };
      renderStatus();
    }
  }

  function recentTurns() {
    return state.messages.slice(-8).map(function (message) {
      return {
        speakerId: message.speakerId,
        role: message.role || 'message',
        text: message.text
      };
    });
  }

  function turnRequestBody(text, priorSpeaker) {
    return {
      sessionId: state.sessionId,
      mode: state.mode,
      userText: text,
      recentTurns: recentTurns(),
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
    state.status = {
      activeEngine: payload.activeEngine,
      aishaEngineConnected: payload.aishaEngineConnected,
      persistence: {
        mode: state.status && state.status.persistence ? state.status.persistence.mode : 'postgres',
        connected: !!(payload.diagnostics && payload.diagnostics.persistenceConnected)
      }
    };
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
  }

  function handleStreamEvent(event, data, streamState) {
    streamState.touched = true;
    if (event === 'turn_start') {
      if (el.processingStatus) el.processingStatus.textContent = 'Turn accepted by the room.';
      return;
    }
    if (event === 'runtime_status') {
      state.status = data || state.status;
      renderStatus();
      return;
    }
    if (event === 'processing') {
      if (el.processingStatus) el.processingStatus.textContent = compact(data.visibleState || data.stage || 'Room is processing the turn.', 120);
      return;
    }
    if (event === 'social_signals') {
      updateSocialSignals(data || {});
      renderStatus();
      renderSocialSignals();
      return;
    }
    if (event === 'message') {
      streamState.messagesRendered = true;
      state.messages.push(data);
      updatePriorSpeaker([data]);
      state.forceScroll = true;
      renderMessages();
      renderPresence([data], []);
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
      if (el.processingStatus) el.processingStatus.textContent = 'Stream unavailable. Using stable turn path.';
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
    var text = compact(el.userText.value, 500);
    if (!text) return;

    var priorSpeaker = state.priorSpeaker;
    setBusy(true);
    if (el.processingStatus) el.processingStatus.textContent = 'Room is processing the turn.';
    state.messages.push({ speakerId: 'user', speakerName: 'You', role: 'user', text: text });
    state.forceScroll = true;
    el.userText.value = '';
    renderMessages();
    el.charCount.textContent = '0/500';
    persistState();

    try {
      await submitTurnPayload(turnRequestBody(text, priorSpeaker));
    } catch (err) {
      state.messages.push({
        speakerId: 'aisha',
        speakerName: 'A.I.S.H.A',
        role: 'system',
        text: 'Runtime missed that turn. The local room remains available.'
      });
      state.forceScroll = true;
      renderMessages();
    } finally {
      setBusy(false);
      if (el.processingStatus) el.processingStatus.textContent = 'Room is processing the turn.';
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
    state.priorSpeaker = '';
    state.forceScroll = true;
    try {
      sessionStorage.setItem(SESSION_KEY, state.sessionId);
      sessionStorage.removeItem(STATE_KEY);
    } catch (err) {}
    renderAll();
  }

  function reportHeight() {
    try {
      window.parent.postMessage({
        type: 'PULSE_HEIGHT',
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0)
      }, '*');
    } catch (err) {}
  }

  function trustedParentOrigin(origin) {
    return [
      'https://silvastudios.co.za',
      'https://www.silvastudios.co.za',
      'http://localhost:3225',
      'http://127.0.0.1:3225'
    ].includes(String(origin || '').trim());
  }

  function bind() {
    el.runtimeDot = $('runtime-dot');
    el.runtimeLabel = $('runtime-label');
    el.roomModeTitle = $('room-mode-title');
    el.roomMood = $('room-mood');
    el.responseMode = $('response-mode');
    el.feed = $('room-feed');
    el.form = $('room-form');
    el.userText = $('user-text');
    el.charCount = $('char-count');
    el.send = $('send-turn');
    el.processingStatus = $('processing-status');
    el.engineValue = $('engine-value');
    el.persistenceValue = $('persistence-value');
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
      el.charCount.textContent = (el.userText.value || '').length + '/500';
    });
    window.addEventListener('resize', reportHeight);
    window.addEventListener('message', function (event) {
      if (!trustedParentOrigin(event.origin)) return;
      var data = event.data || {};
      if (data.type === 'PULSE_SET_MODE') setMode(data.mode);
      if (data.type === 'PULSE_RESET') resetSession();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bind();
    restoreState();
    setMode(state.mode);
    renderAll();
    refreshStatus();
  });
})();
