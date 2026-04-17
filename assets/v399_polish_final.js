(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}

  function unwrapPulse(el){
    if(!el) return;
    var span = el.querySelector('.silva-text-sheen');
    if(!span) return;
    el.textContent = span.textContent || el.textContent || '';
  }

  function normalizeModePills(){
    qsa('.char-mode-pill').forEach(function(el){ unwrapPulse(el); });
  }

  function bindHomeTabs(){
    var page = qs('#page-homes');
    if(!page) return;
    var tabs = qs('#alpha-home-fixed-tabs', page);
    if(!tabs || tabs.dataset.v399Bound==='1') return;
    tabs.dataset.v399Bound='1';
    tabs.addEventListener('pointerdown', function(e){
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
      if(typeof window.renderHomes === 'function') raf(function(){ window.renderHomes(); });
    }, true);
  }

  function fixHomeCardText(){
    qsa('#page-homes .alpha-home-fixed-tab-copy strong').forEach(function(el){
      var txt = (el.textContent||'').trim();
      if(txt && !el.dataset.fullName) el.dataset.fullName = txt;
    });
  }

  function normalizeSidebarHover(){
    qsa('#sidebar .nav-item[data-page]').forEach(function(el){
      el.style.cursor = 'pointer';
      el.removeAttribute('title');
    });
  }

  function stableRun(){
    normalizeModePills();
    bindHomeTabs();
    fixHomeCardText();
    normalizeSidebarHover();
  }

  function wrapNav(){
    if(typeof window.nav !== 'function' || window.nav.__v399FinalPolish) return;
    var original = window.nav;
    var wrapped = function(){
      var out = original.apply(this, arguments);
      raf(stableRun);
      return out;
    };
    wrapped.__v399FinalPolish = true;
    window.nav = wrapped;
  }

  function boot(){ stableRun(); wrapNav(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
