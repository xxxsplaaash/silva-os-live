(function(){
  'use strict';

  var TOAST_TYPES = ['success', 'error', 'warning', 'info'];
  var AUTO_DISMISS = { success: 3000, info: 4000 };
  var MAX_TOASTS = 3;
  var state = {
    toasts: [],
    operations: {},
    throttles: {},
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false
  };

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function toastStack(){
    var stack = document.getElementById('silva-toast-stack');
    if (stack) return stack;
    stack = document.createElement('div');
    stack.id = 'silva-toast-stack';
    stack.className = 'silva-toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-relevant', 'additions removals');
    document.body.appendChild(stack);
    return stack;
  }

  function inferToastType(message, fallback){
    if (TOAST_TYPES.indexOf(fallback) >= 0) return fallback;
    var text = String(message || '').toLowerCase();
    if (/error|failed|failure|couldn.t|lost|unavailable|invalid|insufficient|rejected|timeout|too long|quota|malformed/.test(text)) return 'error';
    if (/warning|watch|offline|connection|fallback|using defaults|may have failed/.test(text)) return 'warning';
    if (/saved|copied|generated|approved|updated|synced|loaded|success|done|ready/.test(text)) return 'success';
    return 'info';
  }

  function toastTitle(type){
    if (type === 'success') return 'Success';
    if (type === 'error') return 'Action needed';
    if (type === 'warning') return 'Heads up';
    return 'Update';
  }

  function removeToast(id){
    var toast = document.querySelector('[data-silva-toast-id="' + id + '"]');
    state.toasts = state.toasts.filter(function(item){ return item.id !== id; });
    if (!toast) return;
    toast.classList.add('is-exiting');
    var done = function(event){
      if (event && event.target !== toast) return;
      toast.removeEventListener('animationend', done);
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    };
    toast.addEventListener('animationend', done);
  }

  function normalizeAction(action){
    if (!action || typeof action !== 'object') return null;
    if (!action.label || typeof action.handler !== 'function') return null;
    return action;
  }

  function showToast(type, message, action){
    if (TOAST_TYPES.indexOf(type) < 0) {
      action = normalizeAction(message) || normalizeAction(action);
      message = type;
      type = inferToastType(message);
    } else {
      action = normalizeAction(action);
    }
    message = String(message || '');
    if (!message.trim()) return null;
    var id = 'toast_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    var stack = toastStack();
    while (state.toasts.length >= MAX_TOASTS) removeToast(state.toasts[0].id);
    var node = document.createElement('article');
    node.className = 'silva-toast silva-toast--' + type;
    node.dataset.silvaToastId = id;
    node.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
    node.innerHTML = [
      '<div>',
        '<strong class="silva-toast-title type-field-label">' + esc(toastTitle(type)) + '</strong>',
        '<p class="silva-toast-message type-body">' + esc(message) + '</p>',
      '</div>',
      '<button class="silva-toast-close type-button" type="button" aria-label="Dismiss notification">×</button>',
      action ? '<div class="silva-toast-actions"><button class="silva-toast-action type-button" type="button">' + esc(action.label) + '</button></div>' : ''
    ].join('');
    node.querySelector('.silva-toast-close')?.addEventListener('click', function(){ removeToast(id); });
    node.querySelector('.silva-toast-action')?.addEventListener('click', function(event){
      event.preventDefault();
      try { action.handler(); } catch (err) { showToast('error', String(err && err.message || err || 'Action failed.')); }
      removeToast(id);
    });
    stack.appendChild(node);
    state.toasts.push({ id: id, type: type, message: message });
    if (AUTO_DISMISS[type]) window.setTimeout(function(){ removeToast(id); }, AUTO_DISMISS[type]);
    return id;
  }

  function operationEvent(key, status, detail){
    try {
      window.dispatchEvent(new CustomEvent('silva:async-state', {
        detail: Object.assign({ key: key, status: status }, detail || {})
      }));
    } catch (_) {}
  }

  function startOperation(key, meta){
    key = String(key || 'operation');
    var current = state.operations[key] || {};
    var operation = Object.assign({}, current, meta || {}, {
      key: key,
      status: 'loading',
      startedAt: Date.now(),
      endedAt: 0,
      error: null
    });
    state.operations[key] = operation;
    operationEvent(key, 'loading', operation);
    return operation;
  }

  function updateOperation(key, patch){
    key = String(key || 'operation');
    var operation = Object.assign({}, state.operations[key] || { key: key }, patch || {});
    state.operations[key] = operation;
    operationEvent(key, operation.status || 'update', operation);
    return operation;
  }

  function succeedOperation(key, meta){
    key = String(key || 'operation');
    var operation = Object.assign({}, state.operations[key] || { key: key }, meta || {}, {
      status: 'success',
      endedAt: Date.now(),
      error: null
    });
    state.operations[key] = operation;
    operationEvent(key, 'success', operation);
    return operation;
  }

  function failOperation(key, error, meta){
    key = String(key || 'operation');
    var classified = classifyError(error, meta || {});
    var operation = Object.assign({}, state.operations[key] || { key: key }, meta || {}, {
      status: 'error',
      endedAt: Date.now(),
      error: classified
    });
    state.operations[key] = operation;
    operationEvent(key, 'error', operation);
    return operation;
  }

  function endOperation(key){
    key = String(key || 'operation');
    if (!state.operations[key]) return null;
    state.operations[key].endedAt = Date.now();
    operationEvent(key, state.operations[key].status || 'idle', state.operations[key]);
    return state.operations[key];
  }

  function classifyError(error, context){
    context = context || {};
    var status = Number(error && (error.status || error.httpStatus || error.code) || context.status || 0);
    var rawMessage = String(
      (error && (error.message || error.error || error.reason)) ||
      (context && (context.message || context.error)) ||
      error ||
      ''
    );
    var text = rawMessage.toLowerCase();
    if (context.kind === 'malformed_prompt' || /quality score|malformed prompt|prompt error/.test(text)) {
      return { kind: 'malformed_prompt', message: 'Prompt error — quality score too low to generate. Review the prompt.' };
    }
    if (context.kind === 'invalid_refs' || /reference|ref|upload/.test(text) && /invalid|failed|missing|unusable/.test(text)) {
      return { kind: 'invalid_refs', message: 'One or more reference images failed to upload. Remove and retry.' };
    }
    if (context.kind === 'timeout' || error && error.name === 'AbortError' || /timeout|timed out|too long/.test(text)) {
      return { kind: 'timeout', message: 'Taking too long. The model may be busy.' };
    }
    if (status === 402 || status === 429 || /quota|credit|balance|insufficient|billing/.test(text)) {
      return { kind: 'quota', message: 'Google Credits balance insufficient. Check balance ↗' };
    }
    if (status === 503 || status === 502 || /unavailable|model.*busy|model.*down|not available|overloaded/.test(text)) {
      return { kind: 'model_unavailable', message: 'Nano Banana Pro is currently unavailable. Switch model?' };
    }
    if (!state.online || /network|failed to fetch|connection|offline|lost/.test(text)) {
      return { kind: 'network', message: 'Connection lost. Check your internet and try again.' };
    }
    return { kind: 'unknown', message: rawMessage || 'Something went wrong. Try again.' };
  }

  function toastThrottled(type, key, message, action, windowMs){
    key = String(key || message || type);
    var now = Date.now();
    var gap = Number(windowMs || 12000);
    if (state.throttles[key] && now - state.throttles[key] < gap) return null;
    state.throttles[key] = now;
    return showToast(type, message, action);
  }

  function withOperation(key, task, options){
    options = options || {};
    startOperation(key, options);
    if (options.loadingToast) showToast('info', options.loadingToast);
    return Promise.resolve()
      .then(task)
      .then(function(result){
        succeedOperation(key, { result: result });
        if (options.successToast) showToast('success', options.successToast);
        return result;
      })
      .catch(function(error){
        var op = failOperation(key, error, options);
        var action = options.retry ? { label: options.retryLabel || 'Retry', handler: options.retry } : null;
        showToast('error', op.error.message, action);
        throw error;
      });
  }

  function ensureOfflineBanner(){
    var banner = document.getElementById('silva-offline-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'silva-offline-banner';
    banner.className = 'silva-offline-banner type-body';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<strong>No internet connection — generation unavailable</strong>';
    var page = document.getElementById('page-generator');
    var command = document.querySelector('#prompt-generator-52-shell .pg52-command-bar');
    if (command && command.parentNode) command.parentNode.insertBefore(banner, command.nextSibling);
    else if (page) page.insertBefore(banner, page.firstChild);
    else document.body.appendChild(banner);
    return banner;
  }

  function generationButtons(){
    return Array.prototype.slice.call(document.querySelectorAll('.pg52-generate-btn, .pg40-primary-generate, button[onclick*="generateImageFromGenerator"]'));
  }

  function syncOfflineState(){
    var banner = ensureOfflineBanner();
    banner.classList.toggle('is-visible', !state.online);
    document.body.classList.toggle('is-offline', !state.online);
    generationButtons().forEach(function(button){
      if (!state.online) {
        if (!button.disabled) button.dataset.asyncWasEnabled = '1';
        button.disabled = true;
      } else if (button.dataset.asyncWasEnabled === '1') {
        button.disabled = false;
        delete button.dataset.asyncWasEnabled;
      }
    });
  }

  function setOnline(value){
    var wasOnline = state.online;
    state.online = Boolean(value);
    syncOfflineState();
    if (wasOnline && !state.online) {
      showToast('warning', 'No internet connection — generation unavailable');
      if (state.operations.imageGeneration && state.operations.imageGeneration.status === 'loading') {
        showToast('warning', 'Connection lost — generation may have failed');
      }
    } else if (!wasOnline && state.online) {
      showToast('success', 'Connection restored');
    }
  }

  function init(){
    toastStack();
    syncOfflineState();
    window.addEventListener('online', function(){ setOnline(true); });
    window.addEventListener('offline', function(){ setOnline(false); });
    var observer = new MutationObserver(function(){ if (!state.online) syncOfflineState(); });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  window.showToast = showToast;
  window.toast = function(message, action){
    return showToast(inferToastType(message), message, normalizeAction(action));
  };
  window.SilvaAsyncFeedback = {
    state: state,
    showToast: showToast,
    startOperation: startOperation,
    updateOperation: updateOperation,
    succeedOperation: succeedOperation,
    failOperation: failOperation,
    endOperation: endOperation,
    classifyError: classifyError,
    toastThrottled: toastThrottled,
    withOperation: withOperation,
    syncOfflineState: syncOfflineState,
    isOnline: function(){ return state.online; },
    getOperation: function(key){ return state.operations[String(key || '')] || null; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
