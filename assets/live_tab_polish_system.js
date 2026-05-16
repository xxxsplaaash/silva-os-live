/*
  Silva OS Live Tab Polish System
  Adds global mobile navigation affordances and small no-contract UI helpers.
*/
(function(){
  if (window.__silvaLiveTabPolish) return;
  window.__silvaLiveTabPolish = true;

  function $(id){ return document.getElementById(id); }

  function ensureMobileNav(){
    if (!$('silva-mobile-nav-toggle')) {
      var btn = document.createElement('button');
      btn.id = 'silva-mobile-nav-toggle';
      btn.className = 'silva-mobile-nav-toggle';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open navigation');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span aria-hidden="true">☰</span>';
      document.body.appendChild(btn);
    }
    if (!$('silva-mobile-nav-backdrop')) {
      var backdrop = document.createElement('div');
      backdrop.id = 'silva-mobile-nav-backdrop';
      backdrop.className = 'silva-mobile-nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }
  }

  function isOpen(){
    return document.body.classList.contains('silva-mobile-nav-open') || document.body.classList.contains('pg52-mobile-nav-open');
  }

  function setOpen(next){
    document.body.classList.toggle('silva-mobile-nav-open', !!next);
    document.body.classList.toggle('pg52-mobile-nav-open', !!next);
    var btn = $('silva-mobile-nav-toggle');
    if (btn) {
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      btn.setAttribute('aria-label', next ? 'Close navigation' : 'Open navigation');
    }
    document.querySelectorAll('[data-pg52-mobile-nav-toggle]').forEach(function(pgBtn){
      pgBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
    });
  }

  function closeOnNavClick(event){
    var item = event.target && event.target.closest && event.target.closest('#sidebar .nav-item');
    if (!item) return;
    if (window.matchMedia && window.matchMedia('(max-width: 1199px)').matches) {
      setOpen(false);
    }
  }

  function normalizeActivePage(){
    var active = document.querySelector('.page.active');
    if (!active) return;
    active.setAttribute('data-silva-tab-polished', 'true');
  }

  function ensureRuntimePolishStyle(){
    if ($('silva-live-tab-runtime-polish-style')) return;
    var style = document.createElement('style');
    style.id = 'silva-live-tab-runtime-polish-style';
    style.textContent = [
      '#page-homes .alpha-home-fixed-tab-copy strong,',
      '#page-homes .alpha-home-menu-item strong,',
      '#page-homes .home-title,',
      '#page-homes .home-head strong{',
      'display:block!important;',
      'height:auto!important;',
      'min-height:0!important;',
      'max-height:none!important;',
      'overflow:visible!important;',
      'white-space:normal!important;',
      'line-height:var(--leading-normal)!important;',
      'overflow-wrap:anywhere!important;',
      '}',
      '@media (max-width: 767px){',
      '#page-dev .dev-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:var(--space-4)!important;}',
      '#page-dev .dev-box{width:auto!important;max-width:100%!important;box-sizing:border-box!important;margin-inline:0!important;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  document.addEventListener('click', function(event){
    var toggle = event.target && event.target.closest && event.target.closest('#silva-mobile-nav-toggle, [data-pg52-mobile-nav-toggle]');
    if (toggle) {
      event.preventDefault();
      setOpen(!isOpen());
      return;
    }
    if (event.target && event.target.closest && event.target.closest('#silva-mobile-nav-backdrop, [data-pg52-mobile-nav-close]')) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    closeOnNavClick(event);
  }, true);

  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape' && isOpen()) setOpen(false);
  });

  window.addEventListener('resize', function(){
    if (window.matchMedia && !window.matchMedia('(max-width: 1199px)').matches) setOpen(false);
  });

  document.addEventListener('DOMContentLoaded', function(){
    ensureMobileNav();
    ensureRuntimePolishStyle();
    normalizeActivePage();
  });

  ensureMobileNav();
  ensureRuntimePolishStyle();
  normalizeActivePage();
})();
