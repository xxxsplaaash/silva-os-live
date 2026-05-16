(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}
  function homeOwnerActive(){ return window.__SILVA_HOME_RENDERER_OWNER === 'renderHomesV12' || (window.renderHomes && window.renderHomes.__shelfFixV14); }

  function scrollMainTop(){
    var main = qs('#main');
    if(main) main.scrollTop = 0;
    window.scrollTo(0,0);
  }

  function normalizeHomeClicks(){
    if(homeOwnerActive()) return;
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
    if(homeOwnerActive()) return;
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
