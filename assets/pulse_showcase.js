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

  var state = {
    sessionId: readSessionId(),
    mode: 'social_hierarchy_lab',
    messages: [],
    ledger: [],
    presence: {},
    roomMood: 'focused',
    responseMode: 'single',
    tensionScore: 18,
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
        tensionScore: state.tensionScore
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

  function updatePresence(events, silentReactions) {
    var next = {};
    ['aisha', 'vanya', 'leah', 'claudia', 'grok'].forEach(function (id) {
      next[id] = state.presence[id] || 'listening';
    });
    (silentReactions || []).forEach(function (item) {
      var id = safeToken(item.speakerId, '');
      if (next[id]) next[id] = compact(item.visibleState || 'watching', 40) || 'watching';
    });
    (events || []).forEach(function (item) {
      var id = safeToken(item.speakerId, '');
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
  }

  function speakerDot(id) {
    return '<span class="speaker-dot" style="background:' + (CHARACTER_COLORS[id] || 'var(--soft)') + '"></span>';
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
    var ids = ['aisha', 'vanya', 'leah', 'claudia', 'grok'];
    el.presence.innerHTML = ids.map(function (id) {
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

  async function submitTurn(event) {
    event.preventDefault();
    if (state.busy) return;
    var text = compact(el.userText.value, 500);
    if (!text) return;

    setBusy(true);
    state.messages.push({ speakerId: 'user', speakerName: 'You', role: 'user', text: text });
    state.forceScroll = true;
    el.userText.value = '';
    renderMessages();
    el.charCount.textContent = '0/500';
    persistState();

    try {
      var payload = await apiJson('/api/studio/pulse-showcase/turn', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: state.sessionId,
          mode: state.mode,
          userText: text,
          recentTurns: recentTurns(),
          roomState: {
            roomMood: el.roomMood.textContent.replace(/^Mood:\s*/i, ''),
            responseMode: el.responseMode.textContent.replace(/^Mode:\s*/i, '')
          }
        })
      });
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
      (payload.messageEvents || []).forEach(function (item) { state.messages.push(item); });
      updateLedgerFromPayload(payload);
      state.tensionScore = computeTension(payload);
      state.forceScroll = true;
      renderStatus();
      renderMessages();
      renderLedger();
      renderPresence(payload.messageEvents || [], payload.silentReactions || []);
      persistState();
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
