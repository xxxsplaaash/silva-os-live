/*
  Silva OS Runtime Performance Rescue V1
  Reduces legacy wrapper churn, avoids repeated heavy renders, and progressively paints large grids.
*/
(function(){
  'use strict';

  if (window.__silvaRuntimePerformanceRescueV1) return;
  window.__silvaRuntimePerformanceRescueV1 = true;

  function $(id){ return document.getElementById(id); }
  function qsa(selector, root){ return Array.from((root || document).querySelectorAll(selector)); }
  function raf(callback){ return window.requestAnimationFrame ? window.requestAnimationFrame(callback) : setTimeout(callback, 16); }
  function ric(callback){
    if (window.requestIdleCallback) return window.requestIdleCallback(callback, { timeout: 180 });
    return setTimeout(callback, 32);
  }
  function safe(fn){
    try { return fn(); } catch (_) { return undefined; }
  }
  function escHtml(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch];
    });
  }
  function cloneJson(value, fallback){
    try { return JSON.parse(JSON.stringify(value == null ? fallback : value)); } catch (_) { return fallback; }
  }
  function scrubClientSecrets(input){
    if (!input || typeof input !== 'object') return input;
    var output = Array.isArray(input) ? input.slice() : Object.assign({}, input);
    Object.keys(output).forEach(function(key){
      var value = output[key];
      if (/api.?key|token|secret/i.test(String(key))) {
        output[key] = '';
        return;
      }
      if (value && typeof value === 'object') output[key] = scrubClientSecrets(value);
    });
    return output;
  }
  function compactSessionLog(list){
    return (Array.isArray(list) ? list : []).slice(0, 12).map(function(item){
      return {
        id: item && item.id ? item.id : '',
        ts: item && item.ts ? item.ts : '',
        type: item && item.type ? item.type : '',
        meta: {}
      };
    });
  }
  function readPulseState(){
    try { return JSON.parse(localStorage.getItem('silva_studio_pulse_v395') || '{}') || {}; } catch (_) { return {}; }
  }
  function activePage(){
    var page = document.querySelector('.page.active');
    return page && page.id ? page.id.replace(/^page-/, '') : '';
  }
  function pageEl(page){
    return page ? $('page-' + page) : null;
  }
  function closeMobileNav(){
    document.body.classList.remove('silva-mobile-nav-open', 'pg52-mobile-nav-open');
    var btn = $('silva-mobile-nav-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Open navigation');
    }
    qsa('[data-pg52-mobile-nav-toggle]').forEach(function(toggle){
      toggle.setAttribute('aria-expanded', 'false');
    });
  }
  function activatePage(page){
    qsa('.page').forEach(function(node){ node.classList.remove('active'); });
    qsa('.nav-item').forEach(function(node){ node.classList.remove('active'); });
    var pageNode = pageEl(page);
    if (pageNode) pageNode.classList.add('active');
    var navItem = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (navItem) navItem.classList.add('active');
    var main = $('main');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function normalizeModePills(){
    qsa('.char-mode-pill').forEach(function(node){
      var sheen = node.querySelector('.silva-text-sheen');
      if (!sheen) return;
      node.textContent = sheen.textContent || node.textContent || '';
    });
  }
  function markLazyImages(root){
    qsa('img', root || document).forEach(function(img){
      if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
  }
  function ensurePerfStyle(){
    if ($('silva-runtime-performance-rescue-style')) return;
    var style = document.createElement('style');
    style.id = 'silva-runtime-performance-rescue-style';
    style.textContent = [
      '.page:not(.active){content-visibility:hidden;}',
      '#library-grid,#gallery-grid,#saved-grid,#assets-grid,#team-grid,#jhb-grid,#broll-grid,#events-grid{contain:layout style paint;}',
      '#library-grid .prompt-card,',
      '#gallery-grid .gallery-card,',
      '#saved-grid .prompt-card,',
      '#assets-grid .asset-card,',
      '#team-grid .team-card,',
      '#jhb-grid .loc-card,',
      '#broll-grid .broll-card,',
      '#events-grid .event-card{content-visibility:auto;contain-intrinsic-size:320px 360px;}'
    ].join('');
    document.head.appendChild(style);
  }
  function isProviderSurfaceActive(){
    return activePage() === 'providers' || activePage() === 'settings';
  }

  function postNavHousekeeping(page){
    closeMobileNav();
    if (page === 'home' && typeof window.patchHome === 'function') safe(function(){ window.patchHome(); });
    if (typeof window.updateObsessionLayer === 'function') safe(function(){ window.updateObsessionLayer(); });
    raf(function(){
      normalizeModePills();
      markLazyImages(pageEl(page) || document);
    });
  }

  var stabilizeToken = 0;
  function scheduleStabilize(page){
    var token = ++stabilizeToken;
    setTimeout(function(){
      if (token !== stabilizeToken) return;
      if (activePage() !== page) return;
      if (typeof window.pageHasPrimaryContent === 'function' && window.pageHasPrimaryContent(page)) return;
      safe(function(){ if (typeof window.ensureRuntimePageShell === 'function') window.ensureRuntimePageShell(page); });
      safe(function(){ if (typeof window.renderRuntimePage === 'function') window.renderRuntimePage(page); });
      raf(function(){ markLazyImages(pageEl(page) || document); });
    }, 96);
  }

  function installCanonicalNav(){
    if (window.nav && window.nav.__silvaPerfCanonical) return;
    window.__silvaSlowNav = window.nav;
    var recentNavs = Object.create(null);
    window.nav = function(page){
      page = String(page || '').trim();
      if (!page) return false;

      var stamp = Date.now();
      if (recentNavs[page] && stamp - recentNavs[page] < 120 && activePage() === page) return true;
      recentNavs[page] = stamp;

      safe(function(){ if (typeof window.ensureRuntimePageShell === 'function') window.ensureRuntimePageShell(page); });

      var target = pageEl(page);
      if (!target && typeof window.__silvaSlowNav === 'function') {
        return window.__silvaSlowNav(page);
      }

      activatePage(page);
      safe(function(){ if (typeof window.renderRuntimePage === 'function') window.renderRuntimePage(page); });
      postNavHousekeeping(page);
      scheduleStabilize(page);
      return true;
    };
    window.nav.__silvaPerfCanonical = true;
    if (typeof window.bindRuntimeNavItems === 'function') safe(function(){ window.bindRuntimeNavItems(); });
  }

  function installCriticalFinalizeGuard(){
    if (typeof window.finalizeCriticalRuntimePage !== 'function') return;
    if (window.finalizeCriticalRuntimePage.__silvaPerfGuarded) return;
    var original = window.finalizeCriticalRuntimePage;
    var lastRunAt = Object.create(null);
    window.finalizeCriticalRuntimePage = function(page){
      page = String(page || '');
      var current = Date.now();
      if (activePage() !== page) return;
      if (typeof window.pageHasPrimaryContent === 'function' && window.pageHasPrimaryContent(page)) return;
      if (lastRunAt[page] && current - lastRunAt[page] < 180) return;
      lastRunAt[page] = current;
      return original.apply(this, arguments);
    };
    window.finalizeCriticalRuntimePage.__silvaPerfGuarded = true;
  }

  function installCoalescedRenderer(name, options){
    options = options || {};
    var original = window[name];
    if (typeof original !== 'function' || original.__silvaPerfWrapped) return;

    var state = Object.create(null);
    var cooldownMs = Number(options.cooldownMs || 180);
    var keyFor = typeof options.keyFor === 'function'
      ? options.keyFor
      : function(){ return '__default'; };

    function entry(key){
      if (!state[key]) state[key] = { pending: false, lastRunAt: 0, lastResult: undefined, lastArgs: [] };
      return state[key];
    }

    var wrapped = function(){
      var args = Array.prototype.slice.call(arguments);
      var key = String(keyFor(args));
      var item = entry(key);
      var current = Date.now();
      item.lastArgs = args;

      if (item.pending) return item.lastResult;
      if (item.lastRunAt && current - item.lastRunAt < cooldownMs) return item.lastResult;

      item.pending = true;
      raf(function(){
        var latest = entry(key);
        latest.pending = false;
        latest.lastRunAt = Date.now();
        latest.lastResult = original.apply(window, latest.lastArgs || args);
        if (typeof options.after === 'function') safe(function(){ options.after(latest.lastArgs || args); });
      });
      return item.lastResult;
    };

    wrapped.__silvaPerfWrapped = true;
    wrapped.__silvaPerfOriginal = original;
    window[name] = wrapped;
  }

  function installProviderRenderer(){
    var original = window.renderProviderShellV12 || window.renderProviders || window.openProviderShell;
    if (typeof original !== 'function' || original.__silvaPerfProviderWrapped) return;

    var pending = false;
    var lastRunAt = 0;
    function wrapped(){
      var args = Array.prototype.slice.call(arguments);
      if (pending) return;
      if (lastRunAt && Date.now() - lastRunAt < 220) return;
      pending = true;
      raf(function(){
        pending = false;
        lastRunAt = Date.now();
        original.apply(window, args);
        markLazyImages(pageEl(activePage()) || document);
      });
    }

    wrapped.__silvaPerfProviderWrapped = true;
    wrapped.__silvaPerfOriginal = original;
    window.renderProviderShellV12 = wrapped;
    window.renderProviders = wrapped;
    window.openProviderShell = wrapped;
  }

  function progressiveInsert(grid, items, renderItem, options){
    options = options || {};
    var emptyHtml = options.emptyHtml || '';
    var initialChunk = Number(options.initialChunk || 18);
    var chunkSize = Number(options.chunkSize || 24);
    var token = (grid.__silvaPerfToken || 0) + 1;
    grid.__silvaPerfToken = token;

    if (!items.length) {
      grid.innerHTML = emptyHtml;
      return;
    }

    var firstHtml = items.slice(0, initialChunk).map(renderItem).join('');
    grid.innerHTML = firstHtml;
    markLazyImages(grid);

    var index = initialChunk;
    function pump(){
      if (grid.__silvaPerfToken !== token || !grid.isConnected) return;
      if (index >= items.length) return;
      var nextHtml = items.slice(index, index + chunkSize).map(renderItem).join('');
      grid.insertAdjacentHTML('beforeend', nextHtml);
      markLazyImages(grid);
      index += chunkSize;
      ric(pump);
    }

    ric(pump);
  }

  function installProgressiveLibrary(){
    if (typeof window.renderLibrary !== 'function' || window.renderLibrary.__silvaPerfProgressive) return;

    window.renderLibrary = function(){
      safe(function(){ if (typeof window.sanitizePromptLibraryState === 'function') window.sanitizePromptLibraryState(); });
      var search = (($('lib-search') || {}).value || '');
      var charF = (($('lib-char') || {}).value || 'all');
      var platF = (($('lib-platform') || {}).value || 'all');
      var sort = (($('lib-sort') || {}).value || 'newest');

      var prompts = typeof window.visiblePromptLibraryItems === 'function'
        ? window.visiblePromptLibraryItems(window.STATE.prompts, { includeArchived: window.SILVA_SHOW_ARCHIVED_IMPORTS })
        : (window.STATE.prompts || []).slice();

      if (charF !== 'all') prompts = prompts.filter(function(prompt){ return prompt.char === charF; });
      if (platF !== 'all') prompts = prompts.filter(function(prompt){ return prompt.platform === platF; });
      if (search && typeof window.silvaPromptTextForAudit === 'function') {
        var loweredSearch = search.toLowerCase();
        prompts = prompts.filter(function(prompt){
          return window.silvaPromptTextForAudit(prompt).toLowerCase().includes(loweredSearch);
        });
      }
      if (sort === 'saved') prompts = prompts.filter(function(prompt){ return prompt.saved || prompt.faved; });
      if (sort === 'tested') prompts = prompts.filter(function(prompt){ return prompt.tested; });
      if (sort === 'gold') prompts = prompts.filter(function(prompt){ return prompt.gold; });
      if (typeof window.sortPromptLibraryItems === 'function') prompts = window.sortPromptLibraryItems(prompts, sort);

      var grid = $('library-grid');
      if (!grid) return;
      grid.classList.add('silva-library-grid');
      if (typeof window.renderLibraryHealthStrip === 'function') window.renderLibraryHealthStrip(prompts.length);

      progressiveInsert(grid, prompts, function(prompt){
        return typeof window.promptCard === 'function' ? window.promptCard(prompt) : '';
      }, {
        emptyHtml: '<div class="library-empty-state">No active Silva prompts match this filter. Off-brand imports stay archived unless you explicitly show them.</div>',
        initialChunk: 12,
        chunkSize: 18
      });
    };

    window.renderLibrary.__silvaPerfProgressive = true;
  }

  function installProgressiveGallery(){
    if (typeof window.renderGallery !== 'function' || window.renderGallery.__silvaPerfProgressive) return;

    window.renderGallery = function(){
      var charF = (($('gal-char') || {}).value || 'all');
      var sort = (($('gal-sort') || {}).value || 'newest');
      var items = Array.isArray(window.STATE.gallery) ? window.STATE.gallery.slice() : [];

      if (charF !== 'all') items = items.filter(function(item){ return item.char === charF; });
      if (sort === 'drift_low') items.sort(function(a, b){ return (a.drift || 0) - (b.drift || 0); });
      if (sort === 'drift_high') items.sort(function(a, b){ return (b.drift || 0) - (a.drift || 0); });

      var grid = $('gallery-grid');
      if (!grid) return;

      progressiveInsert(grid, items, function(item){
        var drift = item.drift || 0;
        var driftClass = drift <= 1 ? 'drift-low' : drift <= 2 ? 'drift-med' : 'drift-high';
        var driftScore = drift <= 1 ? 'drift-0' : drift <= 2 ? 'drift-1' : 'drift-2';
        var charName = escHtml(safe(function(){ return window.getChar(item.char).name; }) || item.char);
        var title = escHtml(item.title || 'Untitled Output');
        var notes = item.driftNotes ? escHtml(item.driftNotes) : '';
        var dateLabel = escHtml(item.date || '—');
        return [
          '<div class="gallery-card">',
            '<div class="gallery-img-slot', item.imgSrc ? ' has-img' : '', '" onclick="attachGalleryImg(\'', String(item.id || '').replace(/'/g, '&#39;'), '\')">',
              item.imgSrc ? '<img src="' + item.imgSrc + '" alt="output" loading="lazy" decoding="async">' : '',
              '<span class="placeholder-text" style="text-align:center;padding:8px;line-height:var(--leading-normal);font-size:var(--type-xs)">Click to upload<br>output image</span>',
            '</div>',
            '<div class="gallery-info">',
              '<div style="font-size:var(--type-sm);color:var(--white);font-family:\'Syne\',sans-serif;font-weight:var(--weight-bold);margin-bottom:4px">', title, '</div>',
              '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">',
                '<span class="tag tag-', escHtml(item.char), '">', charName, '</span>',
                '<span class="drift-score-badge ', driftScore, '">Drift ', drift, '</span>',
              '</div>',
              notes ? '<div style="font-size:var(--type-xs);color:var(--muted);font-family:\'DM Mono\',monospace;line-height:var(--leading-normal);margin-bottom:4px">' + notes + '</div>' : '',
              '<div class="drift-bar"><div class="drift-fill ', driftClass, '" style="width:', Math.min((drift / 3) * 100, 100), '%"></div></div>',
              '<div style="font-size:var(--type-2xs);color:var(--muted);margin-top:4px;font-family:\'DM Mono\',monospace">', dateLabel, '</div>',
            '</div>',
          '</div>'
        ].join('');
      }, {
        emptyHtml: '<div style="color:var(--muted);font-size:var(--type-sm);padding:20px 0;grid-column:1/-1">No outputs logged yet. Generate something and log it here.</div>',
        initialChunk: 10,
        chunkSize: 16
      });
    };

    window.renderGallery.__silvaPerfProgressive = true;
  }

  function installRenderRescue(){
    installCoalescedRenderer('renderPlannerV35', { cooldownMs: 180 });
    installCoalescedRenderer('renderPlanner', { cooldownMs: 180 });
    installCoalescedRenderer('renderHomesV12', { cooldownMs: 220 });
    installCoalescedRenderer('renderHomes', { cooldownMs: 220 });
    installCoalescedRenderer('renderCharPage', {
      cooldownMs: 200,
      keyFor: function(args){ return args[0] || '__default'; },
      after: function(args){ markLazyImages(pageEl(args[0]) || document); }
    });
    installCoalescedRenderer('renderTeamOps', { cooldownMs: 180 });
    installCoalescedRenderer('renderAnalytics', { cooldownMs: 200 });
    installCoalescedRenderer('renderDevAdmin', { cooldownMs: 200 });
    installCoalescedRenderer('renderAssets', { cooldownMs: 180, after: function(){ markLazyImages($('assets-grid')); } });
    installCoalescedRenderer('renderSaved', { cooldownMs: 160 });
    installCoalescedRenderer('renderJHB', { cooldownMs: 160 });
    installCoalescedRenderer('renderBRoll', { cooldownMs: 160 });
    installCoalescedRenderer('renderEvents', { cooldownMs: 160 });
    installProviderRenderer();
  }

  function installStateSyncRescue(){
    if (typeof window.performStateSyncToBackend !== 'function') return;
    if (window.performStateSyncToBackend.__silvaPerfWrapped) return;

    var sync = window.__SILVA_BACKEND_STATE__ = window.__SILVA_BACKEND_STATE__ || {};
    var originalPerform = window.performStateSyncToBackend;
    var originalBuildPayload = typeof window.buildBackendStatePayload === 'function' ? window.buildBackendStatePayload : null;
    var originalSaveState = typeof window.saveState === 'function' ? window.saveState : null;
    var stateSyncTimer = null;
    var idleToken = null;
    var rescueBootAt = Date.now();
    sync.lastPayloadByMode = sync.lastPayloadByMode || { lean: '', full: '' };

    function clearIdleToken(){
      if (!idleToken) return;
      if (window.cancelIdleCallback && typeof idleToken === 'number') window.cancelIdleCallback(idleToken);
      else clearTimeout(idleToken);
      idleToken = null;
    }

    function leanPayload(){
      var state = window.STATE || {};
      var personhood = state.personhood && typeof state.personhood === 'object' ? state.personhood : {};
      var pulse = readPulseState();
      return {
        prompts: [],
        gallery: [],
        plannerPosts: [],
        reviewEvents: [],
        currentModes: cloneJson(state.currentModes || {}, {}),
        teamRecords: cloneJson(state.teamRecords || {}, {}),
        homeProfiles: cloneJson(state.homeProfiles || {}, {}),
        homeAssets: cloneJson(state.homeAssets || {}, {}),
        providerSettings: scrubClientSecrets(cloneJson(state.providerSettings || {}, {})),
        analytics: cloneJson(state.analytics || {}, {}),
        relationships: cloneJson(state.relationships || {}, {}),
        savedSearch: cloneJson(state.savedSearch || {}, {}),
        lastSeenAt: state.lastSeenAt || null,
        aiCommsCenter: {
          target: (((state.aiCommsCenter || {}).target) || 'studio'),
          ambientEnabled: ((state.aiCommsCenter || {}).ambientEnabled) !== false,
          lastAmbientAt: (((state.aiCommsCenter || {}).lastAmbientAt) || 0),
          feed: [],
          roomTone: []
        },
        personhood: {
          liveState: cloneJson(personhood.liveState || {}, {}),
          relationships: cloneJson(personhood.relationships || state.relationships || {}, {})
        },
        characters: cloneJson(((window.CHARS && Object.keys(window.CHARS || {}).length) ? window.CHARS : state.characters) || {}, {}),
        assetRefs: typeof window.collectAssetRefsForSync === 'function' ? window.collectAssetRefsForSync() : {},
        pulseHomes: {},
        characterTuning: cloneJson(pulse.characterTuning || {}, {}),
        councilTuning: cloneJson(pulse.councilTuning || {}, {}),
        characterBehaviorTree: cloneJson(pulse.characterBehaviorTree || {}, {}),
        councilBehavior: cloneJson(pulse.councilBehavior || {}, {}),
        sessionLog: compactSessionLog(state.sessionLog || []),
        _version: window.CURRENT_STATE_VERSION || 'runtime'
      };
    }

    function shouldRunFull(reason){
      return /manual|import|workspace|visibility_hidden|pagehide|beforeunload|full/i.test(String(reason || ''));
    }

    function skipAutomaticBootSync(reason){
      var safeReason = String(reason || '');
      return safeReason === 'boot' || safeReason === 'window_load';
    }

    async function performStateSyncPatched(reason){
      reason = String(reason || 'save');
      if (skipAutomaticBootSync(reason)) {
        sync.lastError = null;
        return { ok: true, skipped: 'recent-boot-sync' };
      }

      var mode = shouldRunFull(reason) ? 'full' : 'lean';
      var payload = (mode === 'full' && originalBuildPayload) ? originalBuildPayload() : leanPayload();
      var body = JSON.stringify({ source: 'live_runtime_' + reason, state: payload });

      if (sync.lastPayloadByMode[mode] === body) {
        sync.lastError = null;
        return { ok: true, skipped: 'unchanged-' + mode };
      }

      sync.lastPayloadByMode[mode] = body;

      var result = await fetch('/api/state/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      var data = await result.json().catch(function(){ return {}; });
      if (!result.ok) {
        sync.lastError = String(data && (data.error || data.message || result.status));
        throw new Error(sync.lastError);
      }
      sync.lastResult = data;
      sync.lastError = null;
      return data;
    }

    window.performStateSyncToBackend = function(reason){
      return originalPerform.__silvaPerfWrapped
        ? originalPerform(reason)
        : performStateSyncPatched(reason);
    };
    window.performStateSyncToBackend.__silvaPerfWrapped = true;

    window.scheduleBackendStateSync = function(reason){
      clearTimeout(stateSyncTimer);
      clearIdleToken();
      sync.lastReason = reason || 'save';
      stateSyncTimer = setTimeout(function(){
        clearIdleToken();
        idleToken = window.requestIdleCallback
          ? window.requestIdleCallback(function(){ window.performStateSyncToBackend(sync.lastReason); }, { timeout: 2200 })
          : setTimeout(function(){ window.performStateSyncToBackend(sync.lastReason); }, 320);
      }, 2600);
    };
    window.scheduleStateToBackend = window.scheduleBackendStateSync;
    window.syncStateToBackend = function(reason){
      clearTimeout(stateSyncTimer);
      clearIdleToken();
      return window.performStateSyncToBackend(reason || 'manual');
    };

    if (originalSaveState && !originalSaveState.__silvaPerfWrapped) {
      window.saveState = function(opts){
        var options = opts && typeof opts === 'object' ? Object.assign({}, opts) : {};
        var reason = String(options.reason || 'save');
        var startupQuietPeriod = (Date.now() - rescueBootAt) < 10000;
        var suppressSync = options.skipSync === true
          || (startupQuietPeriod && (reason === 'save' || reason === 'studio_pulse_save'));
        options.skipSync = true;
        var result = originalSaveState.call(this, options);
        if (!suppressSync) window.scheduleBackendStateSync(reason);
        return result;
      };
      window.saveState.__silvaPerfWrapped = true;
    }

    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) return;
      clearTimeout(stateSyncTimer);
      clearIdleToken();
      safe(function(){ window.performStateSyncToBackend('visibility_hidden'); });
    });
  }

  function boot(){
    ensurePerfStyle();
    installCriticalFinalizeGuard();
    installRenderRescue();
    installStateSyncRescue();
    installProgressiveLibrary();
    installProgressiveGallery();
    installCanonicalNav();
    markLazyImages(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
