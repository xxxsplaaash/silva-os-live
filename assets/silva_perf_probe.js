(function(){
  if (window.SilvaPerf) return;

  var enabled = /(?:\?|&)perf=1(?:&|$)/.test(window.location.search || '');
  try {
    enabled = enabled || localStorage.getItem('silva_perf_debug') === '1';
  } catch (_) {}

  var metrics = {
    enabled: enabled,
    startedAt: performance.now(),
    fetches: [],
    longTasks: [],
    owners: [],
    navs: [],
    counters: Object.create(null)
  };

  function now(){
    return Math.round(performance.now());
  }

  function inc(name, amount){
    var key = String(name || 'unknown');
    metrics.counters[key] = (metrics.counters[key] || 0) + (amount || 1);
  }

  function recordFetch(url, ms, ok, status){
    if (!/\/api\/(image-models|provider-credentials|image-generation|studio|state|planner)/.test(String(url || ''))) return;
    metrics.fetches.push({
      url: String(url || '').replace(/[?&](api[_-]?key|token|secret)=[^&]+/ig, '$1=[scrubbed]'),
      ms: Math.round(ms),
      ok: Boolean(ok),
      status: Number(status || 0),
      at: now()
    });
    if (metrics.fetches.length > 80) metrics.fetches.shift();
  }

  function snapshot(){
    var promptPerf = null;
    try {
      promptPerf = window.PromptGeneratorV3 && typeof window.PromptGeneratorV3.perfSnapshot === 'function'
        ? window.PromptGeneratorV3.perfSnapshot()
        : null;
    } catch (_) {}
    return {
      enabled: metrics.enabled,
      uptimeMs: Math.round(performance.now() - metrics.startedAt),
      fetches: metrics.fetches.slice(),
      longTasks: metrics.longTasks.slice(),
      owners: metrics.owners.slice(),
      navs: metrics.navs.slice(),
      counters: Object.assign({}, metrics.counters),
      promptGenerator: promptPerf,
      domNodes: document.getElementsByTagName('*').length
    };
  }

  if (enabled && window.fetch && !window.fetch.__silvaPerfWrapped) {
    var nativeFetch = window.fetch.bind(window);
    var wrappedFetch = function(input, init){
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var started = performance.now();
      return nativeFetch(input, init).then(function(response){
        recordFetch(url, performance.now() - started, response.ok, response.status);
        return response;
      }).catch(function(error){
        recordFetch(url, performance.now() - started, false, 0);
        throw error;
      });
    };
    wrappedFetch.__silvaPerfWrapped = true;
    window.fetch = wrappedFetch;
  }

  if (enabled && 'PerformanceObserver' in window) {
    try {
      var observer = new PerformanceObserver(function(list){
        list.getEntries().forEach(function(entry){
          metrics.longTasks.push({ name: entry.name || 'longtask', ms: Math.round(entry.duration), at: now() });
        });
        if (metrics.longTasks.length > 60) metrics.longTasks.splice(0, metrics.longTasks.length - 60);
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (_) {}
  }

  window.addEventListener('hashchange', function(){
    metrics.navs.push({ hash: window.location.hash || '#', at: now() });
    if (metrics.navs.length > 40) metrics.navs.shift();
  });

  window.addEventListener('silva:surface-owner', function(event){
    metrics.owners.push(Object.assign({ at: now() }, event.detail || {}));
    if (metrics.owners.length > 40) metrics.owners.shift();
  });

  window.SilvaPerf = {
    enabled: enabled,
    inc: inc,
    recordFetch: recordFetch,
    snapshot: snapshot
  };
})();
