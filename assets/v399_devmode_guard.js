(function () {
  'use strict';

  function syncDevFlag(page) {
    const body = document.body;
    if (!body) return;

    let open = false;

    if (page === 'dev' || page === 'admin') open = true;
    if (document.querySelector('#page-dev.active, #page-admin.active')) open = true;

    body.classList.toggle('silva-dev-open', open);
  }

  function patchNav() {
    if (typeof window.nav !== 'function' || window.nav.__devGuardWrapped) return;

    const original = window.nav;
    window.nav = function(page) {
      const out = original.apply(this, arguments);
      requestAnimationFrame(() => syncDevFlag(page));
      return out;
    };
    window.nav.__devGuardWrapped = true;
  }

  function boot() {
    patchNav();
    syncDevFlag();

    const mo = new MutationObserver(() => syncDevFlag());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
