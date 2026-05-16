(function(){
  if (window.__providerControlCenterV1) return;
  window.__providerControlCenterV1 = true;

  var STATUS_URL = '/api/provider-credentials/status';
  var SAVE_URL = '/api/provider-credentials';
  var LEGACY_KEYS = ['silva_provider_shell_v12', 'silva_provider_shell_v12_backup'];
  var HOME_UI_KEY = 'silva_home_ui_v14';
  var READY_HINT_KEY = 'silva_provider_readiness_hint_v1';
  var cache = { status: null, loadedAt: 0 };
  var providerMessages = {};
  var pendingFocusProvider = '';
  var booted = false;
  var renderSeq = { full: 0, settings: 0 };
  var OWNER_ID = 'assets/provider_control_center_v1.js';
  var providerDraftValues = {};

  function $(id){ return document.getElementById(id); }
  function qsa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }
  function toast(message){
    try {
      if (typeof window.showToast === 'function') window.showToast('info', message);
      else if (window.toast) window.toast(message);
    } catch (_) {}
  }
  function claimSurface(surface, meta){
    try {
      if (window.SilvaSurfaceOwners) {
        window.SilvaSurfaceOwners.claim(surface, OWNER_ID, meta || {});
      }
    } catch (_) {}
  }
  function loadJSON(key, fallback){
    try { return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key) || '{}') || {}); } catch (_) { return Object.assign({}, fallback); }
  }
  function saveJSON(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function scrubObjectSecrets(obj){
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach(function(key){
      if (/api.?key|token|secret/i.test(key)) {
        obj[key] = '';
      } else if (obj[key] && typeof obj[key] === 'object') {
        scrubObjectSecrets(obj[key]);
      }
    });
    return obj;
  }
  function scrubLegacyProviderSecrets(){
    LEGACY_KEYS.forEach(function(key){
      try { localStorage.removeItem(key); } catch (_) {}
    });
    try {
      if (window.STATE && STATE.providerSettings && typeof STATE.providerSettings === 'object') {
        scrubObjectSecrets(STATE.providerSettings);
        STATE.providerSettings.defaultImageProvider = STATE.providerSettings.defaultImageProvider || 'google/nano-banana-2';
        STATE.providerSettings.defaultTextProvider = STATE.providerSettings.defaultTextProvider || 'gemini';
      }
    } catch (_) {}
  }
  function fallbackStatus(){
    return {
      ok: true,
      lastCheckedAt: '',
      providers: [
        { id: 'google', displayName: 'Google Vertex AI', providerAdapter: 'google', configured: false, status: 'checking vault', source: 'checking', supportedModelIds: ['google/nano-banana-2', 'google/nano-banana-pro', 'google/imagen-3-text-only'] },
        { id: 'fal', displayName: 'fal.ai Image Hub', providerAdapter: 'fal', configured: false, status: 'checking vault', source: 'checking', supportedModelIds: ['openai/gpt-image-2', 'openai/gpt-image-1.5', 'black-forest-labs/flux-2-pro', 'black-forest-labs/flux-2-max', 'bytedance/seedream-5-lite', 'fal/qwen-image-2-edit'] },
        { id: 'studio-gemini', displayName: 'Studio Pulse Gemini', providerAdapter: 'google', configured: false, status: 'checking vault', source: 'checking', supportedModelIds: ['gemini text'] }
      ],
      settings: { usdZarRate: { source: 'approximate-default', value: 18.5, defaultValue: '18.5' } }
    };
  }
  function providerStatusById(status, id){
    var found = (status?.providers || []).find(function(item){ return item.id === id; });
    if (found) return found;
    return (fallbackStatus().providers || []).find(function(item){ return item.id === id; }) || { id: id };
  }
  function displayStatus(){
    var status = providerStore()?.get?.() || cache.status || null;
    return status && Array.isArray(status.providers) && status.providers.length ? status : fallbackStatus();
  }
  function providerStore(){
    return window.SilvaProviderReadiness || null;
  }
  function rememberProviderReadyHint(providerId, details){
    providerId = String(providerId || '').trim();
    if (!providerId) return;
    details = details || {};
    try {
      var hints = JSON.parse(localStorage.getItem(READY_HINT_KEY) || '{}') || {};
      var providerAdapter = details.providerAdapter || (providerId === 'fal' ? 'fal' : providerId === 'google' ? 'google' : providerId);
      var hint = {
        configured: true,
        status: 'ready',
        source: details.source || 'vault',
        maskedValue: details.maskedValue || '',
        updatedAt: new Date().toISOString()
      };
      hints[providerId] = hint;
      if (providerAdapter) hints[providerAdapter] = Object.assign({}, hint);
      localStorage.setItem(READY_HINT_KEY, JSON.stringify(hints));
    } catch (_) {}
  }
  function publishStatus(status, meta){
    var store = providerStore();
    if (store && typeof store.updateFromStatus === 'function') {
      cache.status = store.updateFromStatus(status, meta || { source: 'provider-control-center' });
      cache.loadedAt = Date.now();
      return cache.status;
    }
    cache.status = status || cache.status;
    cache.loadedAt = Date.now();
    try { window.dispatchEvent(new CustomEvent('silva:provider-status', { detail: cache.status })); } catch (_) {}
    return cache.status;
  }
  function captureDraftValues(root){
    var drafts = Object.keys(providerDraftValues).map(function(selector){
      return { selector: selector, value: providerDraftValues[selector] };
    });
    var seen = {};
    drafts.forEach(function(draft){ seen[draft.selector] = true; });
    qsa('[data-provider-input], [data-provider-json], [data-provider-path], #pvc-fal-gpt2-model, #pvc-fal-gpt15-model, #pvc-fal-flux-pro-model, #pvc-fal-flux-max-model, #pvc-fal-seedream-text-model, #pvc-fal-seedream-edit-model, #pvc-fal-utility-edit-model, #pvc-usd-zar-rate', root).forEach(function(input){
      if (!input || typeof input.value === 'undefined' || !input.value) return;
      var selector = '';
      if (input.hasAttribute('data-provider-input')) selector = '[data-provider-input="' + input.getAttribute('data-provider-input') + '"]';
      else if (input.hasAttribute('data-provider-json')) selector = '[data-provider-json="' + input.getAttribute('data-provider-json') + '"]';
      else if (input.hasAttribute('data-provider-path')) selector = '[data-provider-path="' + input.getAttribute('data-provider-path') + '"]';
      else if (input.id) selector = '#' + input.id;
      if (selector) {
        providerDraftValues[selector] = input.value;
        if (seen[selector]) {
          drafts = drafts.map(function(draft){ return draft.selector === selector ? { selector: selector, value: input.value } : draft; });
        } else {
          seen[selector] = true;
          drafts.push({ selector: selector, value: input.value });
        }
      }
    });
    return drafts;
  }
  function restoreDraftValues(root, drafts){
    (drafts || []).forEach(function(draft){
      var input = root.querySelector(draft.selector);
      if (input && !input.value) input.value = draft.value;
    });
  }
  function selectorForDraftInput(input){
    if (!input) return '';
    if (input.hasAttribute('data-provider-input')) return '[data-provider-input="' + input.getAttribute('data-provider-input') + '"]';
    if (input.hasAttribute('data-provider-json')) return '[data-provider-json="' + input.getAttribute('data-provider-json') + '"]';
    if (input.hasAttribute('data-provider-path')) return '[data-provider-path="' + input.getAttribute('data-provider-path') + '"]';
    return input.id ? '#' + input.id : '';
  }
  function rememberDraftInput(input){
    var selector = selectorForDraftInput(input);
    if (!selector) return;
    var value = typeof input.value === 'undefined' ? '' : input.value;
    if (value) providerDraftValues[selector] = value;
    else delete providerDraftValues[selector];
  }
  function clearProviderDraft(provider){
    ['[data-provider-input="' + provider + '"]', '[data-provider-json="' + provider + '"]', '[data-provider-path="' + provider + '"]'].forEach(function(selector){
      delete providerDraftValues[selector];
    });
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
  function activeProviderRoot(){
    var providersPage = $('page-providers');
    var settingsPage = $('page-settings');
    if (providersPage && providersPage.classList.contains('active') && $('provider-wrap')) return $('provider-wrap');
    if (settingsPage && settingsPage.classList.contains('active') && $('settings-provider-wrap')) return $('settings-provider-wrap');
    return document;
  }
  function focusProviderCard(providerId, root){
    providerId = providerId || pendingFocusProvider;
    root = root || activeProviderRoot();
    if (!providerId) return;
    var card = root.querySelector('[data-provider="' + providerId + '"], [data-provider-settings="' + providerId + '"]');
    if (!card) return;
    card.classList.add('pvc-focus-card');
    try { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    var input = card.querySelector('[data-provider-input="' + providerId + '"]');
    if (input && typeof input.focus === 'function') setTimeout(function(){ input.focus(); }, 180);
    setTimeout(function(){ card.classList.remove('pvc-focus-card'); }, 1800);
    pendingFocusProvider = '';
  }
  async function fetchStatus(force){
    var store = providerStore();
    if (store && typeof store.fetchFresh === 'function') {
      var status = await store.fetchFresh({ force: Boolean(force), reason: force ? 'provider-control-force' : 'provider-control' });
      cache.status = status;
      cache.loadedAt = Date.now();
      return status;
    }
    if (!force && cache.status && Date.now() - cache.loadedAt < 5000) return cache.status;
    var result = await fetchJsonWithTimeout(STATUS_URL, { cache: 'no-store' }, 6000);
    var res = result.res;
    var data = result.data;
    if (!res.ok || !data || data.ok === false) throw new Error(data?.message || 'Provider status unavailable');
    return publishStatus(data, { source: force ? 'provider-control-force' : 'provider-control' });
  }
  async function saveCredential(payload){
    var result = await fetchJsonWithTimeout(SAVE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 9000);
    var res = result.res;
    var data = result.data;
    if (!res.ok || data.ok === false) throw new Error(data?.message || data?.error || 'Credential save failed');
    rememberProviderReadyHint(payload.provider, {
      providerAdapter: payload.provider === 'fal' ? 'fal' : payload.provider === 'google' ? 'google' : payload.provider,
      source: 'vault',
      maskedValue: payload.provider === 'fal' ? 'fal_...saved' : ''
    });
    if (providerStore()) {
      providerStore().rememberConfiguredProvider?.(payload.provider, {
        providerAdapter: payload.provider === 'fal' ? 'fal' : payload.provider === 'google' ? 'google' : payload.provider,
        source: 'vault',
        maskedValue: payload.provider === 'fal' ? 'fal_...saved' : ''
      });
      providerStore().invalidate();
    }
    publishStatus(data.status || null, { source: 'credential-save' });
    return data;
  }
  async function deleteCredential(id){
    var result = await fetchJsonWithTimeout(SAVE_URL + '/' + encodeURIComponent(id), { method: 'DELETE' }, 9000);
    var res = result.res;
    var data = result.data;
    if (!res.ok || data.ok === false) throw new Error(data?.message || data?.error || 'Credential remove failed');
    if (providerStore()) {
      providerStore().forgetConfiguredProvider?.(id.split('.')[0]);
      providerStore().invalidate();
    }
    publishStatus(data.status || null, { source: 'credential-remove' });
    return data;
  }
  function credentialChip(item){
    var configured = !!item.configured;
    return '<span class="pvc-chip ' + (configured ? 'ready' : 'missing') + '">' + esc(configured ? 'configured' : 'missing key') + '</span>'
      + '<span class="pvc-chip">' + esc(item.source || 'missing') + '</span>'
      + (item.maskedValue ? '<span class="pvc-chip masked">' + esc(item.maskedValue) + '</span>' : '');
  }
  function providerCard(provider, options){
    options = options || {};
    var message = providerMessages[provider.id] || '';
    var providerAttr = options.settingsCard ? 'data-provider-settings' : 'data-provider';
    return [
      '<section class="pvc-card" ' + providerAttr + '="' + esc(provider.id) + '">',
        '<div class="pvc-card-head">',
          '<div>',
            '<div class="pvc-kicker">' + esc(provider.providerAdapter || 'provider') + '</div>',
            '<h3>' + esc(provider.displayName || provider.id) + '</h3>',
          '</div>',
          '<div class="pvc-status">' + credentialChip(provider) + '</div>',
        '</div>',
        '<p class="pvc-copy">' + esc(options.copy || 'Server-side key storage. The browser can replace the key, but never reads it back.') + '</p>',
        '<div class="pvc-model-list">' + esc((provider.supportedModelIds || []).join(' · ')) + '</div>',
        options.jsonUpload ? [
          '<div class="pvc-json-upload" data-provider-json-panel="' + esc(provider.id) + '">',
            '<div class="pvc-upload-head"><strong>' + esc(options.jsonTitle || 'Paste or upload JSON key') + '</strong><span>' + esc(options.jsonHint || 'Saved server-side; never stored in browser state.') + '</span></div>',
            '<textarea class="field-input pvc-json-input" rows="5" spellcheck="false" data-provider-json="' + esc(provider.id) + '" placeholder="' + esc(options.jsonPlaceholder || 'Paste service-account JSON here') + '"></textarea>',
            '<div class="pvc-upload-actions">',
              '<label class="btn btn-ghost btn-sm pvc-file-label">Choose JSON file<input type="file" accept=".json,application/json" data-provider-file="' + esc(provider.id) + '"></label>',
              '<button class="btn btn-primary btn-sm" type="button" data-provider-save-json="' + esc(provider.id) + '">' + esc(options.jsonSaveLabel || 'Save JSON key') + '</button>',
            '</div>',
          '</div>'
        ].join('') : '',
        '<div class="pvc-field-row">',
          '<label><span>' + esc(options.inputLabel || 'Paste / replace credential') + '</span><input class="field-input pvc-secret-input" type="' + esc(options.inputType || 'password') + '" autocomplete="off" data-provider-input="' + esc(provider.id) + '" placeholder="' + esc(options.placeholder || 'Paste API key') + '"></label>',
          '<button class="btn btn-primary btn-sm" type="button" data-provider-save="' + esc(provider.id) + '">' + esc(options.saveLabel || 'Save key') + '</button>',
          '<button class="btn btn-ghost btn-sm" type="button" data-provider-remove="' + esc(provider.credentialId || '') + '">Remove</button>',
          '<button class="btn btn-ghost btn-sm" type="button" data-provider-test="' + esc(provider.id) + '">Route check</button>',
        '</div>',
        '<div class="pvc-result" data-provider-result="' + esc(provider.id) + '">' + esc(message || (provider.configured ? 'Saved in server vault. Source: ' + (provider.source || 'vault') + (provider.updatedAt ? ' · updated ' + provider.updatedAt : '') : 'No key saved yet. Paste a key and save it to the server vault.')) + '</div>',
      '</section>'
    ].join('');
  }
  function freshnessLine(status){
    var checked = status?.lastCheckedAt || new Date().toISOString();
    var ready = (status?.providers || []).filter(function(item){ return item.configured; }).length;
    var total = (status?.providers || []).length || 0;
    return '<div class="pvc-freshness"><span>' + esc(ready + '/' + total + ' providers configured') + '</span><span>Last checked ' + esc(checked) + '</span><span>Server vault is the source of truth</span></div>';
  }
  function settingsCard(status){
    var gpt2 = status?.settings?.falGptImage2Model || {};
    var gpt15 = status?.settings?.falGptImage15Model || {};
    var fluxPro = status?.settings?.falFlux2ProModel || {};
    var fluxMax = status?.settings?.falFlux2MaxModel || {};
    var seedreamText = status?.settings?.falSeedreamTextModel || {};
    var seedreamEdit = status?.settings?.falSeedreamEditModel || {};
    var utilityEdit = status?.settings?.falUtilityEditModel || {};
    var rate = status?.settings?.usdZarRate || {};
    var vertex = status?.settings?.vertex || {};
    return [
      '<section class="pvc-card pvc-settings-card">',
        '<div class="pvc-card-head"><div><div class="pvc-kicker">routing settings</div><h3>Vertex models, fal endpoints + rand pricing</h3></div><span class="pvc-chip">' + esc(rate.source || 'approximate-default') + '</span></div>',
        '<div class="pvc-field-grid">',
          '<label><span>Vertex project ID</span><input class="field-input" id="pvc-vertex-project-id" value="' + esc(vertex.projectId?.value || '') + '" placeholder="' + esc(vertex.projectId?.defaultValue || 'project-be35f944-1782-4f27-86f') + '"></label>',
          '<label><span>Vertex location</span><input class="field-input" id="pvc-vertex-location" value="' + esc(vertex.location?.value || '') + '" placeholder="' + esc(vertex.location?.defaultValue || 'us-central1') + '"></label>',
          '<label><span>Vertex Imagen model</span><input class="field-input" id="pvc-vertex-imagen-model" value="' + esc(vertex.imagenModel?.value || '') + '" placeholder="' + esc(vertex.imagenModel?.defaultValue || 'imagen-3.0-generate-001') + '"></label>',
          '<label><span>Vertex Gemini fast model</span><input class="field-input" id="pvc-vertex-gemini-fast-model" value="' + esc(vertex.geminiFastModel?.value || '') + '" placeholder="' + esc(vertex.geminiFastModel?.defaultValue || 'gemini-2.5-flash') + '"></label>',
          '<label><span>Vertex Gemini pro model</span><input class="field-input" id="pvc-vertex-gemini-pro-model" value="' + esc(vertex.geminiProModel?.value || '') + '" placeholder="' + esc(vertex.geminiProModel?.defaultValue || 'gemini-2.5-pro') + '"></label>',
          '<label><span>Vertex Claude Model Garden model</span><input class="field-input" id="pvc-vertex-claude-model" value="' + esc(vertex.claudeModel?.value || '') + '" placeholder="' + esc(vertex.claudeModel?.defaultValue || 'claude-3-5-sonnet-v2@20241022') + '"></label>',
          '<label><span>fal GPT Image 2 endpoint</span><input class="field-input" id="pvc-fal-gpt2-model" value="' + esc(gpt2.value || '') + '" placeholder="' + esc(gpt2.defaultValue || 'openai/gpt-image-2') + '"></label>',
          '<label><span>fal GPT Image 1.5 endpoint</span><input class="field-input" id="pvc-fal-gpt15-model" value="' + esc(gpt15.value || '') + '" placeholder="' + esc(gpt15.defaultValue || 'fal-ai/gpt-image-1.5') + '"></label>',
          '<label><span>fal FLUX 2 Pro endpoint</span><input class="field-input" id="pvc-fal-flux-pro-model" value="' + esc(fluxPro.value || '') + '" placeholder="' + esc(fluxPro.defaultValue || 'fal-ai/flux-2-pro') + '"></label>',
          '<label><span>fal FLUX 2 Max endpoint</span><input class="field-input" id="pvc-fal-flux-max-model" value="' + esc(fluxMax.value || '') + '" placeholder="' + esc(fluxMax.defaultValue || 'fal-ai/flux-2-max') + '"></label>',
          '<label><span>fal Seedream text endpoint</span><input class="field-input" id="pvc-fal-seedream-text-model" value="' + esc(seedreamText.value || '') + '" placeholder="' + esc(seedreamText.defaultValue || 'fal-ai/bytedance/seedream/v5/lite/text-to-image') + '"></label>',
          '<label><span>fal Seedream edit endpoint</span><input class="field-input" id="pvc-fal-seedream-edit-model" value="' + esc(seedreamEdit.value || '') + '" placeholder="' + esc(seedreamEdit.defaultValue || 'fal-ai/bytedance/seedream/v5/lite/edit') + '"></label>',
          '<label><span>fal utility edit endpoint</span><input class="field-input" id="pvc-fal-utility-edit-model" value="' + esc(utilityEdit.value || '') + '" placeholder="' + esc(utilityEdit.defaultValue || 'fal-ai/qwen-image-2/edit') + '"></label>',
          '<label><span>USD to ZAR display rate</span><input class="field-input" id="pvc-usd-zar-rate" value="' + esc(rate.value || '') + '" placeholder="18.5"></label>',
        '</div>',
        '<div class="pvc-actions"><button class="btn btn-primary btn-sm" id="pvc-save-vertex-settings" type="button">Save Vertex settings</button><button class="btn btn-ghost btn-sm" id="pvc-save-fal-settings" type="button">Save fal endpoints</button><button class="btn btn-ghost btn-sm" id="pvc-save-rate" type="button">Save rand rate</button><button class="btn btn-ghost btn-sm" data-provider-remove="fal.gpt_image_2_model" type="button">Remove GPT 2 endpoint</button><button class="btn btn-ghost btn-sm" data-provider-remove="fal.gpt_image_1_5_model" type="button">Remove GPT 1.5 endpoint</button><button class="btn btn-ghost btn-sm" data-provider-remove="settings.usd_zar_rate" type="button">Use approximate rate</button></div>',
      '</section>'
    ].join('');
  }
  function homeSettingsBlock(){
    var home = loadJSON(HOME_UI_KEY, { view: 'focused' });
    return [
      '<section class="pvc-card pvc-home-card">',
        '<div class="pvc-card-head"><div><div class="pvc-kicker">settings</div><h3>Home System defaults</h3></div></div>',
        '<div class="pvc-field-grid"><label><span>Default view</span><select class="filter-select" id="pvc-home-view"><option value="focused">Focused view</option><option value="all">All team view</option></select></label></div>',
        '<div class="pvc-actions"><button class="btn btn-ghost btn-sm" id="pvc-save-home" type="button">Save home settings</button></div>',
      '</section>'
    ].join('');
  }
  function shellHtml(status, includeHome){
    var google = providerStatusById(status, 'google');
    var fal = providerStatusById(status, 'fal');
    var pulse = providerStatusById(status, 'studio-gemini');
    return [
      '<div class="pvc-shell">',
        '<header class="pvc-hero">',
          '<div><div class="pvc-kicker">AI Provider Control Center</div><h2>Vertex and fal keys stay server-side. Routes stay honest.</h2><p>Google Vertex AI handles Nano Banana Pro / Nano Banana 2 direct-reference image generation through Gemini Image models. Imagen 3 stays available only as a no-reference text-to-image fallback. fal.ai Image Hub handles GPT Image, FLUX, Seedream, Qwen Image 2 Edit, and non-Google image routes.</p></div>',
          '<button class="btn btn-ghost btn-sm" id="pvc-refresh-status" type="button">Refresh status</button>',
        '</header>',
        '<div class="pvc-status-row">',
          [google, fal, pulse].map(function(item){ return '<div class="pvc-status-card"><span>' + esc(item.displayName || item.id) + '</span>' + credentialChip(item) + '</div>'; }).join(''),
        '</div>',
        freshnessLine(status),
        '<div class="pvc-grid">',
          '<div class="pvc-main-stack">',
            providerCard(google, { inputLabel: 'Advanced: existing JSON file path on this Mac/server', inputType: 'text', saveLabel: 'Save path', placeholder: '/absolute/path/service-account.json', copy: 'Used by Nano Banana Pro, Nano Banana 2, legacy Imagen text-only, and Gemini reasoning through Google Cloud Vertex AI. Simple mode: paste or upload the JSON key below and Silva will save it server-side for you.', jsonUpload: true, jsonTitle: 'Simple setup: paste or upload your Google service-account JSON', jsonHint: 'You do not need to know a file path. Silva writes the JSON into .runtime and stores only that generated path in the vault.', jsonPlaceholder: '{\\n  \"type\": \"service_account\",\\n  \"project_id\": \"project-be35f944-1782-4f27-86f\",\\n  ...\\n}' }),
            providerCard(fal, { placeholder: 'FAL_KEY', copy: 'Used by GPT Image 2, GPT Image 1.5, FLUX, Seedream, Qwen Image 2 Edit, and every non-Google image route.' }),
            providerCard(pulse, { placeholder: 'Gemini key for Studio Pulse', copy: 'Optional Studio Pulse Gemini key. Stored in the same vault pattern, masked in the browser.' }),
          '</div>',
          '<aside class="pvc-side-stack">',
            settingsCard(status),
            includeHome ? homeSettingsBlock() : '',
            '<section class="pvc-card"><div class="pvc-kicker">public contract</div><div class="pvc-code">GET /api/provider-credentials/status\nPOST /api/provider-credentials\nDELETE /api/provider-credentials/:id\nPOST /api/image-generation/generate</div><p class="pvc-copy">Responses return masked status only. Raw provider secrets never come back to the browser.</p></section>',
          '</aside>',
        '</div>',
      '</div>'
    ].join('');
  }
  function settingsHtml(status){
    var google = providerStatusById(status, 'google');
    var fal = providerStatusById(status, 'fal');
    var pulse = providerStatusById(status, 'studio-gemini');
    return [
      '<div class="pvc-shell pvc-settings-shell">',
        '<header class="pvc-hero pvc-hero-compact">',
          '<div><div class="pvc-kicker">Provider settings</div><h2>Compact vault controls.</h2><p>Google Credits use Vertex AI direct-reference Gemini Image models for Nano Banana Pro / Nano Banana 2. Paste or upload the service-account JSON, or use an advanced existing file path. GPT Image and every non-Google image route use fal.ai. Studio Pulse Gemini stays separate.</p></div>',
          '<button class="btn btn-ghost btn-sm" id="pvc-refresh-status" type="button">Refresh status</button>',
        '</header>',
        '<div class="pvc-status-row">',
          [google, fal, pulse].map(function(item){ return '<div class="pvc-status-card"><span>' + esc(item.displayName || item.id) + '</span>' + credentialChip(item) + '</div>'; }).join(''),
        '</div>',
        freshnessLine(status),
        '<div class="pvc-compact-grid">',
          settingsCard(status),
          providerCard(fal, { settingsCard: true, placeholder: 'FAL_KEY', copy: 'Image hub for GPT Image 2, GPT Image 1.5, FLUX, Seedream, Qwen Image 2 Edit, and non-Google routes.' }),
          providerCard(google, { settingsCard: true, inputLabel: 'Advanced: existing JSON file path on this Mac/server', inputType: 'text', saveLabel: 'Save path', placeholder: '/absolute/path/service-account.json', copy: 'Google Vertex AI powers Nano Banana Pro / Nano Banana 2 direct-reference generation, legacy Imagen text-only, and Gemini reasoning. Paste/upload the service-account JSON if you do not know a path.', jsonUpload: true, jsonTitle: 'Simple setup: paste or upload your Google service-account JSON', jsonHint: 'Silva writes it to .runtime and stores the generated path in the server vault.' }),
          providerCard(pulse, { settingsCard: true, placeholder: 'Gemini key for Studio Pulse', copy: 'Optional Studio Pulse Gemini key. Stored server-side and masked in the browser.' }),
          homeSettingsBlock(),
        '</div>',
      '</div>'
    ].join('');
  }
  function rerenderRoot(root, includeHome, force){
    if (root && root.id === 'settings-provider-wrap') return renderSettingsInto(root, force);
    return renderInto(root, includeHome, force);
  }
  async function handleProviderSaveButton(btn, root, includeHome){
    if (!btn || btn.disabled) return;
    root = root || btn.closest('#provider-wrap, #settings-provider-wrap') || activeProviderRoot();
    includeHome = typeof includeHome === 'boolean' ? includeHome : root?.id !== 'settings-provider-wrap';
    var provider = btn.getAttribute('data-provider-save');
    var input = root.querySelector('[data-provider-input="' + provider + '"]');
    var value = input ? input.value.trim() : '';
    if (!value) return toast('Paste a key first');
    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = 'Saving...';
    try {
      await saveCredential({
        provider: provider,
        value: value,
        secretType: provider === 'fal' ? 'api_key' : (provider === 'google' ? 'service_account_path' : 'api_key')
      });
      if (input) input.value = '';
      clearProviderDraft(provider);
      providerMessages[provider] = 'Saved to the server vault. Generator readiness will refresh automatically.';
      toast('Provider key saved to server vault');
      rerenderRoot(root, includeHome, false);
    } catch (err) {
      providerMessages[provider] = 'Save failed: ' + (err.message || 'could not write to the server vault');
      toast(err.message || 'Save failed');
      var result = root.querySelector('[data-provider-result="' + provider + '"]');
      if (result) result.textContent = providerMessages[provider];
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
  function bind(root, includeHome){
    qsa('[data-provider-input], [data-provider-json], [data-provider-path], #pvc-fal-gpt2-model, #pvc-fal-gpt15-model, #pvc-fal-flux-pro-model, #pvc-fal-flux-max-model, #pvc-fal-seedream-text-model, #pvc-fal-seedream-edit-model, #pvc-fal-utility-edit-model, #pvc-usd-zar-rate', root).forEach(function(input){
      input.addEventListener('input', function(){ rememberDraftInput(input); });
      input.addEventListener('change', function(){ rememberDraftInput(input); });
    });
    qsa('[data-provider-file]', root).forEach(function(input){
      input.onchange = function(){
        var provider = input.getAttribute('data-provider-file');
        var file = input.files && input.files[0];
        var target = root.querySelector('[data-provider-json="' + provider + '"]');
        if (!file || !target) return;
        var reader = new FileReader();
        reader.onload = function(){ target.value = String(reader.result || '').trim(); };
        reader.onerror = function(){ toast('Could not read that JSON file'); };
        reader.readAsText(file);
      };
    });
    qsa('[data-provider-save-json]', root).forEach(function(btn){
      btn.onclick = async function(){
        var provider = btn.getAttribute('data-provider-save-json');
        var textarea = root.querySelector('[data-provider-json="' + provider + '"]');
        var value = textarea ? textarea.value.trim() : '';
        if (!value) return toast('Paste or choose the JSON key first');
        btn.disabled = true;
        var originalText = btn.textContent;
        btn.textContent = 'Saving JSON...';
        try {
          await saveCredential({
            provider: provider,
            secretType: 'service_account_json',
            value: value
          });
          if (textarea) textarea.value = '';
          clearProviderDraft(provider);
          var file = root.querySelector('[data-provider-file="' + provider + '"]');
          if (file) file.value = '';
          providerMessages[provider] = 'JSON key saved server-side. Vertex now uses the generated .runtime path.';
          toast('Google Vertex JSON key saved');
          rerenderRoot(root, includeHome, false);
        } catch (err) {
          providerMessages[provider] = 'JSON save failed: ' + (err.message || 'invalid service-account JSON');
          toast(err.message || 'JSON save failed');
          var result = root.querySelector('[data-provider-result="' + provider + '"]');
          if (result) result.textContent = providerMessages[provider];
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      };
    });
    qsa('[data-provider-save]', root).forEach(function(btn){
      btn.dataset.pvcBound = '1';
      btn.onclick = async function(){
        await handleProviderSaveButton(btn, root, includeHome);
      };
    });
    qsa('[data-provider-remove]', root).forEach(function(btn){
      btn.onclick = async function(){
        var id = btn.getAttribute('data-provider-remove');
        if (!id) return;
        btn.disabled = true;
        try {
          await deleteCredential(id);
          var provider = id.split('.')[0];
          providerMessages[provider] = 'Removed from server vault. Dependent routes now require setup again.';
          toast('Provider credential removed');
          rerenderRoot(root, includeHome, true);
        } catch (err) {
          toast(err.message || 'Remove failed');
        } finally {
          btn.disabled = false;
        }
      };
    });
    qsa('[data-provider-test]', root).forEach(function(btn){
      btn.onclick = async function(){
        var provider = btn.getAttribute('data-provider-test');
        var resultEl = root.querySelector('[data-provider-result="' + provider + '"]');
        if (resultEl) resultEl.textContent = 'Checking route metadata...';
        var intent = provider === 'fal' ? 'complex_edit' : 'cheap_draft';
        try {
          var routeResult = await fetchJsonWithTimeout('/api/image-models/route-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intent: intent })
          }, 6000);
          var data = routeResult.data;
          var readiness = data?.selectedModel?.providerReadiness;
          if (window.SilvaProviderReadiness) window.SilvaProviderReadiness.mergeModelReadiness(data);
          if (resultEl) resultEl.textContent = (data.selectedModel?.displayName || 'Route') + ': ' + (readiness?.status || 'unknown');
        } catch (err) {
          if (resultEl) resultEl.textContent = 'Route check unavailable';
        }
      };
    });
    var refresh = root.querySelector('#pvc-refresh-status');
    if (refresh) refresh.onclick = function(){ rerenderRoot(root, includeHome, true); };
    var vertexBtn = root.querySelector('#pvc-save-vertex-settings');
    if (vertexBtn) vertexBtn.onclick = async function(){
      var fields = [
        ['vertex_project_id', root.querySelector('#pvc-vertex-project-id')?.value.trim()],
        ['vertex_location', root.querySelector('#pvc-vertex-location')?.value.trim()],
        ['vertex_imagen_model', root.querySelector('#pvc-vertex-imagen-model')?.value.trim()],
        ['vertex_gemini_fast_model', root.querySelector('#pvc-vertex-gemini-fast-model')?.value.trim()],
        ['vertex_gemini_pro_model', root.querySelector('#pvc-vertex-gemini-pro-model')?.value.trim()],
        ['vertex_claude_model', root.querySelector('#pvc-vertex-claude-model')?.value.trim()]
      ].filter(function(item){ return item[1]; });
      if (!fields.length) return toast('Enter at least one Vertex setting first');
      for (var i = 0; i < fields.length; i += 1) {
        await saveCredential({ provider: 'google', secretType: fields[i][0], value: fields[i][1] });
      }
      providerMessages.google = 'Vertex AI routing settings saved.';
      toast('Vertex AI settings saved');
      rerenderRoot(root, includeHome, true);
    };
    var falBtn = root.querySelector('#pvc-save-fal-settings');
    if (falBtn) falBtn.onclick = async function(){
      var fields = [
        ['gpt_image_2_model', root.querySelector('#pvc-fal-gpt2-model')?.value.trim()],
        ['gpt_image_1_5_model', root.querySelector('#pvc-fal-gpt15-model')?.value.trim()],
        ['flux_2_pro_model', root.querySelector('#pvc-fal-flux-pro-model')?.value.trim()],
        ['flux_2_max_model', root.querySelector('#pvc-fal-flux-max-model')?.value.trim()],
        ['seedream_text_model', root.querySelector('#pvc-fal-seedream-text-model')?.value.trim()],
        ['seedream_edit_model', root.querySelector('#pvc-fal-seedream-edit-model')?.value.trim()],
        ['utility_edit_model', root.querySelector('#pvc-fal-utility-edit-model')?.value.trim()]
      ].filter(function(item){ return item[1]; });
      if (!fields.length) return toast('Enter at least one fal endpoint first');
      for (var i = 0; i < fields.length; i += 1) {
        await saveCredential({ provider: 'fal', secretType: fields[i][0], value: fields[i][1] });
      }
      providerMessages.fal = 'fal.ai endpoint overrides saved to the server vault.';
      toast('fal.ai endpoint overrides saved');
      rerenderRoot(root, includeHome, true);
    };
    var rateBtn = root.querySelector('#pvc-save-rate');
    if (rateBtn) rateBtn.onclick = async function(){
      var value = root.querySelector('#pvc-usd-zar-rate')?.value.trim();
      if (!value) return toast('Enter a rand rate first');
      await saveCredential({ provider: 'settings', secretType: 'usd_zar_rate', value: value });
      providerMessages.settings = 'Rand display rate saved.';
      toast('Rand rate saved');
      rerenderRoot(root, includeHome, true);
    };
    var homeSelect = root.querySelector('#pvc-home-view');
    if (homeSelect) homeSelect.value = loadJSON(HOME_UI_KEY, { view: 'focused' }).view || 'focused';
    var saveHome = root.querySelector('#pvc-save-home');
    if (saveHome) saveHome.onclick = function(){
      var home = loadJSON(HOME_UI_KEY, { view: 'focused' });
      home.view = homeSelect?.value || 'focused';
      saveJSON(HOME_UI_KEY, home);
      toast('Home settings saved');
    };
  }
  async function renderInto(root, includeHome, force){
    if (!root) return;
    try { window.SilvaPerf && window.SilvaPerf.inc('provider.render.full'); } catch (_) {}
    var seq = ++renderSeq.full;
    var active = document.activeElement;
    var activeProvider = active?.getAttribute?.('data-provider-input') || '';
    var activeId = active?.id || '';
    var scrollTop = root.scrollTop || 0;
    scrubLegacyProviderSecrets();
    if (!root.querySelector('.pvc-shell')) {
      root.innerHTML = shellHtml(displayStatus(), includeHome);
      bind(root, includeHome);
    }
    root.classList.add('pvc-refreshing');
    try {
      var status = await fetchStatus(force);
      if (seq !== renderSeq.full) return;
      var drafts = captureDraftValues(root);
      root.innerHTML = shellHtml(status, includeHome);
      bind(root, includeHome);
      restoreDraftValues(root, drafts);
      focusProviderCard(pendingFocusProvider, root);
      if (!pendingFocusProvider && activeProvider) {
        var input = root.querySelector('[data-provider-input="' + activeProvider + '"]');
        if (input) setTimeout(function(){ input.focus(); }, 0);
      } else if (!pendingFocusProvider && activeId) {
        var node = root.querySelector('#' + activeId);
        if (node && typeof node.focus === 'function') setTimeout(function(){ node.focus(); }, 0);
      }
      root.scrollTop = scrollTop;
      publishStatus(status, { source: force ? 'provider-render-force' : 'provider-render' });
    } catch (err) {
      if (seq !== renderSeq.full) return;
      var message = err?.name === 'AbortError' ? 'Provider status timed out. Check the local server and retry.' : (err.message || 'Could not load provider status');
      root.innerHTML = '<div class="pvc-shell"><section class="pvc-card pvc-error-card"><div class="pvc-kicker">Provider Control Center</div><h3>Status unavailable</h3><p class="pvc-copy">' + esc(message) + '</p><button class="btn btn-ghost btn-sm" type="button" id="pvc-retry-status">Retry status</button></section></div>';
      var retry = root.querySelector('#pvc-retry-status');
      if (retry) retry.onclick = function(){ renderInto(root, includeHome, true); };
    } finally {
      root.classList.remove('pvc-refreshing');
    }
  }
  function renderProviderShell(){
    var page = $('page-providers');
    if (!page) return;
    claimSurface('providers', { mode: 'full-control-center' });
    if (window.location.hash === '#settings') {
      setTimeout(renderSettingsShell, 0);
      return;
    }
    if (window.location.hash === '#providers' || (!window.location.hash && page.classList.contains('active'))) {
      document.querySelectorAll('.page').forEach(function(item){ item.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(item){ item.classList.remove('active'); });
      page.classList.add('active');
      document.querySelector('.nav-item[data-page="providers"]')?.classList.add('active');
    }
    if (!$('provider-wrap') || !page.querySelector('.page-title') || /Provider Layer Shell/i.test(page.querySelector('.page-title')?.textContent || '')) {
      page.innerHTML = '<div class="page-title">Provider Control Center</div><div class="page-sub">Server-side provider vault and image routing readiness.</div><div id="provider-wrap"></div>';
    } else {
      var title = page.querySelector('.page-title');
      var sub = page.querySelector('.page-sub');
      if (title) title.textContent = 'Provider Control Center';
      if (sub) sub.textContent = 'Server-side provider vault and image routing readiness.';
    }
    var root = $('provider-wrap');
    if (root) {
      if (root.__pvcRenderPending) return;
      root.className = '';
      var pending = renderInto(root, false, false);
      root.__pvcRenderPending = pending;
      Promise.resolve(pending).finally(function(){
        if (root.__pvcRenderPending === pending) root.__pvcRenderPending = null;
      });
    }
  }
  function renderSettingsShell(){
    var page = $('page-settings');
    if (!page) return;
    claimSurface('settings', { mode: 'compact-provider-settings' });
    if (window.location.hash === '#providers') {
      setTimeout(renderProviderShell, 0);
      return;
    }
    if (window.location.hash === '#settings' || (!window.location.hash && page.classList.contains('active'))) {
      document.querySelectorAll('.page').forEach(function(item){ item.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(item){ item.classList.remove('active'); });
      page.classList.add('active');
      document.querySelector('.nav-item[data-page="settings"]')?.classList.add('active');
    }
    if (!$('settings-provider-wrap') || !page.querySelector('.page-title')) {
      page.innerHTML = '<div class="page-title">Settings</div><div class="page-sub">Home defaults and server-side provider vault.</div><div id="settings-provider-wrap"></div>';
    } else {
      var title = page.querySelector('.page-title');
      var sub = page.querySelector('.page-sub');
      if (title) title.textContent = 'Settings';
      if (sub) sub.textContent = 'Home defaults and server-side provider vault.';
    }
    var root = $('settings-provider-wrap');
    if (!root) return;
    if (root.__pvcRenderPending) return;
    root.className = '';
    var pending = renderSettingsInto(root, false);
    root.__pvcRenderPending = pending;
    Promise.resolve(pending).finally(function(){
      if (root.__pvcRenderPending === pending) root.__pvcRenderPending = null;
    });
  }
  async function renderSettingsInto(root, force){
    if (!root) return;
    try { window.SilvaPerf && window.SilvaPerf.inc('provider.render.settings'); } catch (_) {}
    var seq = ++renderSeq.settings;
    scrubLegacyProviderSecrets();
    if (!root.querySelector('.pvc-shell')) {
      root.innerHTML = settingsHtml(displayStatus());
      bind(root, true);
    }
    root.classList.add('pvc-refreshing');
    try {
      var status = await fetchStatus(force);
      if (seq !== renderSeq.settings) return;
      var drafts = captureDraftValues(root);
      root.innerHTML = settingsHtml(status);
      bind(root, true);
      restoreDraftValues(root, drafts);
      focusProviderCard(pendingFocusProvider, root);
      publishStatus(status, { source: force ? 'settings-render-force' : 'settings-render' });
    } catch (err) {
      if (seq !== renderSeq.settings) return;
      var message = err?.name === 'AbortError' ? 'Provider status timed out. Check the local server and retry.' : (err.message || 'Could not load provider status');
      root.innerHTML = '<div class="pvc-shell"><section class="pvc-card pvc-error-card"><div class="pvc-kicker">Provider Control Center</div><h3>Status unavailable</h3><p class="pvc-copy">' + esc(message) + '</p><button class="btn btn-ghost btn-sm" type="button" id="pvc-retry-status">Retry status</button></section></div>';
      var retry = root.querySelector('#pvc-retry-status');
      if (retry) retry.onclick = function(){ renderSettingsInto(root, true); };
    } finally {
      root.classList.remove('pvc-refreshing');
    }
  }
  window.SilvaProviderControlCenter = {
    fetchStatus: fetchStatus,
    renderProviderShell: renderProviderShell,
    renderSettingsShell: renderSettingsShell,
    scrubLegacyProviderSecrets: scrubLegacyProviderSecrets
  };
  window.renderProviderShellV12 = renderProviderShell;
  window.renderSettingsV12 = renderSettingsShell;
  window.openProviderShell = renderProviderShell;
  window.openSettingsShell = renderSettingsShell;
  window.renderProviders = renderProviderShell;

  function isActive(id){
    var page = $(id);
    return page && page.classList.contains('active');
  }
  function shouldWarmStatusOnBoot(){
    var hash = String(window.location.hash || '').replace('#', '');
    if (hash === 'providers' || hash === 'settings') return true;
    return isActive('page-providers') || isActive('page-settings');
  }
  function activateProviderHashRoute(){
    var hash = String(window.location.hash || '').replace('#', '');
    if ((hash === 'providers' || hash === 'settings') && typeof window.nav === 'function') {
      window.nav(hash);
      setTimeout(function(){
        if (hash === 'providers') renderProviderShell();
        if (hash === 'settings') renderSettingsShell();
      }, 0);
    }
  }
  function patchProviderNavigationOwner(){
    if (typeof window.nav !== 'function' || window.nav.__providerControlCenterOwner) return;
    var previousNav = window.nav;
    window.nav = function(page){
      previousNav(page);
      if (page === 'providers') setTimeout(renderProviderShell, 0);
      if (page === 'settings') setTimeout(renderSettingsShell, 0);
    };
    window.nav.__providerControlCenterOwner = true;
  }
  function init(){
    scrubLegacyProviderSecrets();
    patchProviderNavigationOwner();
    if (booted) {
      activateProviderHashRoute();
      return;
    }
    booted = true;
    if (isActive('page-providers')) renderProviderShell();
    if (isActive('page-settings')) renderSettingsShell();
    if (shouldWarmStatusOnBoot()) {
      fetchStatus(false).then(function(status){
        publishStatus(status, { source: 'provider-boot' });
      }).catch(function(){});
    }
    setTimeout(activateProviderHashRoute, 80);
    setTimeout(activateProviderHashRoute, 350);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);
  document.addEventListener('click', function(event){
    var btn = event.target && event.target.closest ? event.target.closest('[data-provider-save]') : null;
    if (!btn || btn.dataset.pvcBound === '1') return;
    event.preventDefault();
    handleProviderSaveButton(btn);
  });
  window.addEventListener('load', function(){ setTimeout(init, 300); });
  window.addEventListener('hashchange', function(){ setTimeout(activateProviderHashRoute, 30); });
  window.addEventListener('silva:focus-provider', function(event){
    pendingFocusProvider = event?.detail?.providerAdapter || window.__focusProviderAdapter || '';
    focusProviderCard(pendingFocusProvider);
  });
})();
