(function () {
  'use strict';

  const API_BASE = '/api/identity';
  let profileSaveTimer = null;

  function ensureState() {
    window.STATE = window.STATE || {};
    window.STATE.teamRecords = window.STATE.teamRecords || {};
    return window.STATE;
  }

  function getTeamRecords() {
    return ensureState().teamRecords || {};
  }

  function isKnownChar(id) {
    return !!(id && getTeamRecords()[id]);
  }

  function setActiveCharId(id) {
    if (isKnownChar(id)) {
      window.__activeCharId = id;
      window.__activeCharTs = Date.now();
      console.log('[identity-sync] active char =', id);
      return id;
    }
    return null;
  }

  function resolveActiveCharId(preferred) {
    if (isKnownChar(preferred)) return setActiveCharId(preferred);
    if (isKnownChar(window.__activeCharId)) return window.__activeCharId;
    return null;
  }

  async function fetchProfiles() {
    const res = await fetch(`${API_BASE}/profiles`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`profiles fetch failed: ${res.status}`);
    return res.json();
  }

  async function fetchProfile(id) {
    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
    return res.json();
  }

  async function saveProfile(id, payload) {
    const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) throw new Error(`profile save failed: ${res.status}`);
    return res.json();
  }

  function applyProfileToState(id, payload) {
    if (!id || !payload || typeof payload !== 'object') return;
    const state = ensureState();
    state.teamRecords[id] = Object.assign({}, state.teamRecords[id] || {}, payload);
  }

  async function hydrateProfiles() {
    try {
      const result = await fetchProfiles();
      const list = Array.isArray(result && result.profiles) ? result.profiles : [];
      list.forEach(item => {
        if (item && item.id && item.payload) applyProfileToState(item.id, item.payload);
      });
      console.log('[identity-sync] hydrated', list.length, 'profiles');
    } catch (err) {
      console.warn('[identity-sync] hydrate failed', err);
    }
  }

  function scheduleProfileSave(id, delay) {
    const charId = resolveActiveCharId(id);
    if (!charId) return;

    if (profileSaveTimer) clearTimeout(profileSaveTimer);
    profileSaveTimer = setTimeout(async () => {
      try {
        const payload = Object.assign({}, getTeamRecords()[charId] || {});
        await saveProfile(charId, payload);
        console.log('[identity-sync] autosaved', charId);
      } catch (err) {
        console.warn('[identity-sync] autosave failed', err);
      }
    }, delay || 700);
  }

  function bindCharTracking() {
    if (document.__identityCharTrackingBound) return;
    document.__identityCharTrackingBound = true;

    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-char-id],[data-char]');
      if (!el) return;
      const id =
        el.dataset.charId ||
        el.dataset.char ||
        el.getAttribute('data-char-id') ||
        el.getAttribute('data-char');
      if (id) setActiveCharId(id);
    }, true);
  }

  function patchRenderCharPage() {
    if (typeof window.renderCharPage !== 'function') return false;
    if (window.renderCharPage.__identityWrapped) return true;

    const original = window.renderCharPage;

    window.renderCharPage = function (id) {
      if (id) setActiveCharId(id);
      const out = original.apply(this, arguments);

      setTimeout(async () => {
        try {
          const charId = resolveActiveCharId(id);
          if (!charId) return;
          const result = await fetchProfile(charId);
          const payload = result && result.profile && result.profile.payload;
          if (payload && typeof payload === 'object') {
            applyProfileToState(charId, payload);
            original.call(window, charId);
          }
        } catch (err) {
          console.warn('[identity-sync] render hydrate failed', err);
        }
      }, 0);

      return out;
    };

    window.renderCharPage.__identityWrapped = true;
    return true;
  }

  function patchSaveState() {
    if (typeof window.saveState !== 'function') return false;
    if (window.saveState.__identityWrapped) return true;

    const original = window.saveState;

    window.saveState = function () {
      const out = original.apply(this, arguments);
      if (window.__activeCharId) scheduleProfileSave(window.__activeCharId);
      return out;
    };

    window.saveState.__identityWrapped = true;
    return true;
  }

  async function saveCurrentProfileCloud(id) {
    const charId = resolveActiveCharId(id);
    if (!charId) throw new Error('No active character id');
    const payload = Object.assign({}, getTeamRecords()[charId] || {});
    const result = await saveProfile(charId, payload);
    console.log('[identity-sync] saved', charId, result);
    return result;
  }

  window.IdentityCloud = {
    fetchProfiles,
    fetchProfile,
    saveProfile,
    hydrateProfiles,
    saveCurrentProfileCloud,
    resolveActiveCharId
  };

  window.setActiveCharId = setActiveCharId;

  function boot() {
    hydrateProfiles();
    bindCharTracking();

    const t = setInterval(() => {
      const a = patchRenderCharPage();
      const b = patchSaveState();
      if (a && b) clearInterval(t);
    }, 250);

    setTimeout(() => clearInterval(t), 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
