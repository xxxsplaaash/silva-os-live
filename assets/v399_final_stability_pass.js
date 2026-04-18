(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}

  function scrollMainTop(){
    var main = qs('#main');
    if(main) main.scrollTop = 0;
    window.scrollTo(0,0);
  }

  function normalizeHomeClicks(){
    var page = qs('#page-homes');
    if(!page || page.dataset.v399FitClicks==='1') return;
    page.dataset.v399FitClicks='1';
    page.addEventListener('click', function(e){
      var btn = e.target.closest('.alpha-home-fixed-tab');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute('data-home-id');
      try{
        var key = 'silva_home_ui_v12';
        var ui = JSON.parse(localStorage.getItem(key) || '{}');
        ui.active = id;
        ui.view = 'focused';
        localStorage.setItem(key, JSON.stringify(ui));
      }catch(err){}
      if(typeof window.renderHomesV12 === 'function') raf(function(){ window.renderHomesV12(); });
    }, true);
  }

  function normalizeCharPills(){
    qsa('.char-mode-pill').forEach(function(el){
      var txt = (el.textContent || '').replace(/\s+/g,' ').trim();
      if(txt) el.setAttribute('aria-label', txt);
    });
  }

  function wrapNavScrollReset(){
    if(typeof window.nav !== 'function' || window.nav.__v399FitWrapped) return;
    var original = window.nav;
    var wrapped = function(){
      var out = original.apply(this, arguments);
      raf(function(){
        scrollMainTop();
        normalizeHomeClicks();
        normalizeCharPills();
      });
      return out;
    };
    wrapped.__v399FitWrapped = true;
    window.nav = wrapped;
  }

  function boot(){
    scrollMainTop();
    normalizeHomeClicks();
    normalizeCharPills();
    wrapNavScrollReset();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();


/* SILVA_SOURCE_FIX_RUNTIME */
(function(){
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function cleanupBadRuntime(){
    qsa('.silva-elite-glare,.silva-elite-ripple,.silva-text-pulse,.silva-stable-pulse').forEach(el => {
      if (el.classList.contains('silva-elite-glare') || el.classList.contains('silva-elite-ripple')) el.remove();
      else {
        el.classList.remove('silva-text-pulse');
        el.classList.remove('silva-stable-pulse');
      }
    });

    qsa('#silva-live-edit-btn,#silva-live-edit-backdrop,#silva-cloud-edit-btn,#silva-cloud-edit-backdrop').forEach(el => el.remove());

    qsa('#page-settings input,#page-settings textarea,#page-settings select,#page-aisha input,#page-aisha textarea,#page-aisha select,#page-leah input,#page-leah textarea,#page-leah select,#page-claudia input,#page-claudia textarea,#page-claudia select,#page-grok input,#page-grok textarea,#page-grok select,#page-vanya input,#page-vanya textarea,#page-vanya select').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.zIndex = '4';
      if (el.disabled) el.disabled = false;
    });

    qsa('#page-settings input,#page-settings textarea').forEach(el => {
      const txt = (((el.closest('.card,div')||{}).textContent)||'') + ' ' + (el.placeholder||'');
      if (/api key|provider routing|primary text provider|primary image provider|fallback/i.test(txt)) {
        el.readOnly = true;
        if (!el.value) el.placeholder = 'Managed in Render environment';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupBadRuntime, { once:true });
  } else {
    cleanupBadRuntime();
  }

  const mo = new MutationObserver(() => cleanupBadRuntime());
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();
