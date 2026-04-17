(function () {
  'use strict';

  const STORAGE_KEY = 'silva_os_v2';
  let syncTimer = null;
  let bootHydrated = false;

  function hasMeaningfulState(state) {
    if (!state || typeof state !== 'object') return false;
    const keys = Object.keys(state);
    if (!keys.length) return false;
    if (keys.length === 1 && keys[0] === 'lastSeenAt') return false;
    return true;
  }

  async function fetchWorkspace() {
    const res = await fetch('/api/state/workspace', { cache: 'no-store' });
    if (!res.ok) throw new Error('Workspace fetch failed: ' + res.status);
    return res.json();
  }

  async function saveWorkspace(state) {
    const res = await fetch('/api/state/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state || {})
    });
    if (!res.ok) throw new Error('Workspace save failed: ' + res.status);
    return res.json();
  }

  function schedulePush(delay = 700) {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        if (!bootHydrated) return;
        if (!window.STATE || !hasMeaningfulState(window.STATE)) return;
        await saveWorkspace(window.STATE);
        console.log('[workspace-sync] saved');
      } catch (err) {
        console.error('[workspace-sync] save failed', err);
      }
    }, delay);
  }

  async function bootstrapWorkspace() {
    try {
      const result = await fetchWorkspace();
      const remoteState = result?.workspace?.state;

      if (remoteState && typeof remoteState === 'object' && Object.keys(remoteState).length) {
        window.STATE = Object.assign(window.STATE || {}, remoteState);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(window.STATE));
        } catch (e) {}
      }

      bootHydrated = true;
    } catch (err) {
      console.warn('[workspace-sync] bootstrap failed', err);
      bootHydrated = true;
    }
  }

  window.SilvaWorkspaceSync = {
    fetchWorkspace,
    saveWorkspace,
    schedulePush,
    bootstrapWorkspace
  };

  window.testWorkspaceSave = function () {
    window.STATE = window.STATE || {};
    window.STATE.__cloudTest = {
      ok: true,
      ts: new Date().toISOString()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(window.STATE));
    } catch (e) {}

    schedulePush(50);
  };
})();
