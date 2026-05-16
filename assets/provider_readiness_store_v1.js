(function(){
  if (window.SilvaProviderReadiness) return;

  var STATUS_URL = '/api/provider-credentials/status';
  var DEFAULT_TTL_MS = 30000;
  var READY_HINT_KEY = 'silva_provider_readiness_hint_v1';
  var state = {
    status: null,
    loadedAt: 0,
    pending: null,
    modelReadinessById: {},
    listeners: []
  };

  function clone(value){
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function nowIso(){
    try { return new Date().toISOString(); } catch (_) { return ''; }
  }

  function readReadyHints(){
    try {
      var raw = JSON.parse(localStorage.getItem(READY_HINT_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function writeReadyHints(hints){
    try { localStorage.setItem(READY_HINT_KEY, JSON.stringify(hints || {})); } catch (_) {}
  }

  function recentHint(hint){
    if (!hint || !hint.configured) return false;
    var ts = Date.parse(hint.updatedAt || '');
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts < 300000;
  }

  function hintForProvider(provider){
    var hints = readReadyHints();
    return hints[provider?.id] || hints[provider?.providerAdapter] || null;
  }

  async function fetchJsonWithTimeout(url, options, timeoutMs){
    options = options || {};
    timeoutMs = timeoutMs || 6500;
    var controller = new AbortController();
    var timeout = setTimeout(function(){ controller.abort(); }, timeoutMs);
    try {
      var res = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      var data = await res.json().catch(function(){ return {}; });
      return { res: res, data: data };
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeStatus(status, meta){
    if (!status || status.ok === false) return null;
    meta = meta || {};
    var previousProviders = state.status && Array.isArray(state.status.providers) ? state.status.providers : [];
    var preserveRecentConfigured = meta.source !== 'credential-remove' && Date.now() - state.loadedAt < 30000;
    var next = Object.assign({}, status);
    next.providers = Array.isArray(next.providers) ? next.providers.map(function(provider){
      var normalized = Object.assign({}, provider, {
        configured: Boolean(provider.configured),
        status: provider.status || (provider.configured ? 'ready' : 'missing key'),
        source: provider.source || (provider.configured ? 'vault' : 'missing')
      });
      var previous = previousProviders.find(function(item){
        return (item.id && item.id === normalized.id) || (item.providerAdapter && item.providerAdapter === normalized.providerAdapter);
      });
      var hint = hintForProvider(normalized);
      if (
        recentHint(hint) &&
        !normalized.configured &&
        /missing/i.test(String(normalized.status || normalized.source || ''))
      ) {
        return Object.assign({}, normalized, {
          configured: true,
          status: 'ready',
          source: hint.source || 'vault',
          maskedValue: hint.maskedValue || normalized.maskedValue || '',
          readinessHinted: true,
          lastCheckedAt: next.lastCheckedAt || nowIso()
        });
      }
      if (
        preserveRecentConfigured &&
        previous && previous.configured &&
        !normalized.configured &&
        /missing/i.test(String(normalized.status || normalized.source || ''))
      ) {
        return Object.assign({}, previous, {
          staleGuarded: true,
          lastCheckedAt: next.lastCheckedAt || previous.lastCheckedAt || nowIso()
        });
      }
      return normalized;
    }) : [];
    next.lastCheckedAt = next.lastCheckedAt || nowIso();
    next.ok = next.ok !== false;
    return next;
  }

  function emit(status, meta){
    var detail = status || state.status;
    if (!detail) return;
    try {
      window.dispatchEvent(new CustomEvent('silva:provider-status', {
        detail: Object.assign({}, detail, { meta: meta || {} })
      }));
    } catch (_) {}
    state.listeners.slice().forEach(function(listener){
      try { listener(detail, meta || {}); } catch (_) {}
    });
  }

  function updateFromStatus(status, meta){
    var next = normalizeStatus(status, meta);
    if (!next) return state.status;
    state.status = next;
    state.loadedAt = Date.now();
    emit(state.status, meta || { source: 'manual-update' });
    return state.status;
  }

  async function fetchFresh(options){
    options = options || {};
    var force = Boolean(options.force);
    if (!force && state.status && Date.now() - state.loadedAt < DEFAULT_TTL_MS) return state.status;
    if (state.pending && !force) return state.pending;
    if (window.SilvaAsyncFeedback) {
      window.SilvaAsyncFeedback.startOperation('providerReadinessStore', { background: true, reason: options.reason || 'fetch' });
    }
    state.pending = fetchJsonWithTimeout(STATUS_URL, { cache: 'no-store' }, options.timeoutMs || 6500)
      .then(function(result){
        if (!result.res.ok || !result.data || result.data.ok === false) {
          throw new Error(result.data?.message || result.data?.error || 'Provider status unavailable');
        }
        var status = updateFromStatus(result.data, { source: options.reason || 'fetch' });
        if (window.SilvaAsyncFeedback) window.SilvaAsyncFeedback.succeedOperation('providerReadinessStore', { status: status });
        return status;
      })
      .catch(function(err){
        if (window.SilvaAsyncFeedback) {
          window.SilvaAsyncFeedback.failOperation('providerReadinessStore', err, { background: true });
          window.SilvaAsyncFeedback.toastThrottled('warning', 'providerReadinessStore', 'Provider readiness unavailable. Routes may use cached status.');
        }
        throw err;
      })
      .finally(function(){ state.pending = null; });
    return state.pending;
  }

  function invalidate(){
    state.loadedAt = 0;
  }

  function rememberConfiguredProvider(providerId, details){
    providerId = String(providerId || '').trim();
    if (!providerId) return;
    details = details || {};
    var providerAdapter = details.providerAdapter || providerId;
    var hints = readReadyHints();
    hints[providerId] = {
      configured: true,
      status: 'ready',
      source: details.source || 'vault',
      maskedValue: details.maskedValue || '',
      updatedAt: nowIso()
    };
    if (providerAdapter) hints[providerAdapter] = Object.assign({}, hints[providerId]);
    writeReadyHints(hints);
    var readyProvider = {
      id: providerId,
      displayName: details.displayName || providerId,
      providerAdapter: providerAdapter,
      configured: true,
      status: 'ready',
      source: details.source || 'vault',
      maskedValue: details.maskedValue || '',
      readinessHinted: true,
      lastCheckedAt: hints[providerId].updatedAt
    };
    var current = state.status && Array.isArray(state.status.providers) ? clone(state.status) : {
      ok: true,
      lastCheckedAt: hints[providerId].updatedAt,
      providers: [],
      settings: {}
    };
    var exactIndex = current.providers.findIndex(function(item){ return item.id === providerId; });
    if (exactIndex >= 0) current.providers[exactIndex] = Object.assign({}, current.providers[exactIndex], readyProvider);
    else current.providers.push(readyProvider);
    current.lastCheckedAt = hints[providerId].updatedAt;
    updateFromStatus(current, { source: 'credential-save-hint' });
  }

  function forgetConfiguredProvider(providerId){
    providerId = String(providerId || '').trim();
    if (!providerId) return;
    var hints = readReadyHints();
    delete hints[providerId];
    writeReadyHints(hints);
  }

  function providerForAdapter(adapter){
    var providers = state.status && Array.isArray(state.status.providers) ? state.status.providers : [];
    return providers.find(function(provider){ return provider.providerAdapter === adapter; })
      || providers.find(function(provider){ return provider.id === adapter; })
      || null;
  }

  function readinessForModel(model){
    if (!model) return { configured: false, status: 'missing key', source: 'missing' };
    var mapped = state.modelReadinessById[model.id];
    var provider = providerForAdapter(model.providerAdapter);
    var modelReadiness = model.providerReadiness || null;
    var hint = hintForProvider({
      id: model.providerAdapter,
      providerAdapter: model.providerAdapter
    });
    if (recentHint(hint) && (!provider || !provider.configured)) {
      return {
        configured: true,
        status: 'ready',
        source: hint.source || 'vault',
        maskedValue: hint.maskedValue || '',
        providerId: model.providerAdapter || '',
        updatedAt: hint.updatedAt || '',
        lastCheckedAt: state.status?.lastCheckedAt || hint.updatedAt || '',
        readinessHinted: true
      };
    }
    if (modelReadiness && modelReadiness.configured && (!provider || !provider.configured)) {
      return modelReadiness;
    }
    if (mapped && mapped.configured && (!provider || !provider.configured)) {
      return mapped;
    }
    if (provider) {
      return {
        configured: Boolean(provider.configured),
        status: provider.status || (provider.configured ? 'ready' : 'missing key'),
        source: provider.source || (provider.configured ? 'vault' : 'missing'),
        maskedValue: provider.maskedValue || '',
        providerId: provider.id || '',
        updatedAt: provider.updatedAt || '',
        lastCheckedAt: state.status?.lastCheckedAt || ''
      };
    }
    if (mapped) return mapped;
    if (modelReadiness) return modelReadiness;
    return { configured: false, status: 'missing key', source: 'missing' };
  }

  function mergeModelReadiness(payload){
    var models = [];
    if (Array.isArray(payload)) models = payload;
    else if (payload && typeof payload === 'object') {
      if (payload.selectedModel) models.push(payload.selectedModel);
      if (Array.isArray(payload.alternatives)) models = models.concat(payload.alternatives);
      if (Array.isArray(payload.items)) models = models.concat(payload.items);
    }
    models.forEach(function(model){
      if (model && model.id && model.providerReadiness) {
        state.modelReadinessById[model.id] = Object.assign({}, model.providerReadiness);
      }
    });
    return clone(state.modelReadinessById);
  }

  function subscribe(listener){
    if (typeof listener !== 'function') return function(){};
    state.listeners.push(listener);
    return function(){
      state.listeners = state.listeners.filter(function(item){ return item !== listener; });
    };
  }

  window.SilvaProviderReadiness = {
    fetchFresh: fetchFresh,
    get: function(){ return state.status; },
    hasStatus: function(){ return Boolean(state.status); },
    invalidate: invalidate,
    updateFromStatus: updateFromStatus,
    mergeModelReadiness: mergeModelReadiness,
    readinessForModel: readinessForModel,
    providerForAdapter: providerForAdapter,
    subscribe: subscribe,
    rememberConfiguredProvider: rememberConfiguredProvider,
    forgetConfiguredProvider: forgetConfiguredProvider,
    snapshot: function(){
      return {
        status: clone(state.status),
        loadedAt: state.loadedAt,
        modelReadinessById: clone(state.modelReadinessById)
      };
    }
  };
})();
