(function(){
  'use strict';
  function qs(s,r=document){ return r.querySelector(s); }
  function qsa(s,r=document){ return Array.from(r.querySelectorAll(s)); }
  function raf(cb){ return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16); }
  function homeOwnerActive(){ return window.__SILVA_HOME_RENDERER_OWNER === 'renderHomesV12' || (window.renderHomes && window.renderHomes.__shelfFixV14); }

  var renderPending = false;
  var lastHomeSwitch = 0;

  function setHomeActive(id){
    try{
      var key = 'silva_home_ui_v12';
      var ui = JSON.parse(localStorage.getItem(key) || '{}');
      if(ui.active === id && ui.view === 'focused') return false;
      ui.active = id;
      ui.view = 'focused';
      localStorage.setItem(key, JSON.stringify(ui));
      return true;
    }catch(e){ return true; }
  }

  function renderHomesSafely(){
    if(renderPending) return;
    renderPending = true;
    raf(function(){
      renderPending = false;
      if(typeof window.renderHomesV12 === 'function') window.renderHomesV12();
      else if(typeof window.renderHomes === 'function') window.renderHomes();
    });
  }

  function bindHomeTabsOnce(){
    if(homeOwnerActive()) return;
    var tabs = qs('#alpha-home-fixed-tabs');
    if(!tabs || tabs.dataset.v399Polish4Bound === '1') return;
    tabs.dataset.v399Polish4Bound = '1';

    function handle(e){
      var btn = e.target.closest('.alpha-home-fixed-tab');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      var now = Date.now();
      if(now - lastHomeSwitch < 140) return;
      lastHomeSwitch = now;
      var id = btn.getAttribute('data-home-id');
      if(setHomeActive(id)) renderHomesSafely();
    }

    tabs.addEventListener('pointerdown', handle, true);
    tabs.addEventListener('click', handle, true);
  }

  function repairModeLabels(){
    qsa('.char-mode-pill').forEach(function(el){
      var sheen = el.querySelector('.silva-text-sheen');
      if(sheen){
        var txt = (sheen.textContent || '').trim();
        if(txt) el.textContent = txt;
      }
      el.setAttribute('aria-label', (el.textContent || '').trim());
    });
  }

  function ensureScrollableTop(){
    var main = qs('#main');
    if(main && main.scrollTop > 8) main.scrollTop = 0;
  }

  function run(){
    bindHomeTabsOnce();
    repairModeLabels();
    ensureScrollableTop();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();

  if(!homeOwnerActive() && typeof window.nav === 'function' && !window.nav.__v399Polish4){
    var original = window.nav;
    window.nav = function(){
      var out = original.apply(this, arguments);
      raf(run);
      return out;
    };
    window.nav.__v399Polish4 = true;
  }
})();
