(function () {
  'use strict';

  function flattenStudio() {
    document.querySelectorAll(
      '#page-home .card, #page-home .cc-side-card, #page-home .cc-center > .card, #page-home .cc-right > .card, #page-home .studio-response, #page-home .pulse-card, #page-home .btn, #page-home button, #page-studio .card, #page-studio .studio-response, #page-studio .pulse-card, #page-studio .btn, #page-studio button'
    ).forEach((el) => {
      el.classList.remove('tilt-card');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('will-change', 'auto', 'important');
      el.style.setProperty('backdrop-filter', 'none', 'important');
      el.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
    });

    document.querySelectorAll('#page-home .silva-elite-glare, #page-home .silva-elite-ripple, #page-studio .silva-elite-glare, #page-studio .silva-elite-ripple')
      .forEach((el) => el.remove());
  }

  function boot() {
    flattenStudio();

    if (typeof window.nav === 'function' && !window.nav.__studioFlattenWrapped) {
      const originalNav = window.nav;
      window.nav = function(page) {
        const out = originalNav.apply(this, arguments);
        requestAnimationFrame(flattenStudio);
        setTimeout(flattenStudio, 80);
        return out;
      };
      window.nav.__studioFlattenWrapped = true;
    }

    const mo = new MutationObserver(() => flattenStudio());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
