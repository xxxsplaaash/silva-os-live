(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}

  function markStable(){ document.body.classList.add('silva-stable'); }

  function removeHeavyRuntimeArtifacts(){
    qsa('.silva-elite-glare,.silva-elite-ripple').forEach(el=>el.remove());
    qsa('[data-v399-glare-bound],[data-v399-magnet],[data-v399-tilt]').forEach(el=>{
      delete el.dataset.v399GlareBound;
      delete el.dataset.v399Magnet;
      delete el.dataset.v399Tilt;
    });
  }

  function applyLivePulse(){
    qsa('.silva-stable-pulse').forEach(el=>el.classList.remove('silva-stable-pulse'));
    qsa('#page-crosschar .grid3 > .card .section-title').forEach(el=>el.classList.add('silva-stable-pulse'));
    qsa('#page-crosschar .grid3 > .card .section-title').forEach(el=>el.classList.add('silva-stable-pulse'));
  }

  function fixAishaSidebarHover(){
    const item = qs('#sidebar .nav-item[data-page="aisha"]');
    if(!item) return;
    item.classList.add('alpha-orbit-target');
    item.style.cursor='pointer';
  }

  function fixAishaAvatarClick(){
    const slot = qs('#aisha-avatar-slot');
    if(!slot || slot.dataset.stableClickBound==='1') return;
    slot.dataset.stableClickBound='1';
    slot.removeAttribute('title');
    slot.style.cursor='pointer';
  }

  function afterNav(){ raf(()=>{ applyLivePulse(); fixAishaAvatarClick(); fixAishaSidebarHover(); }); }

  function wrapNav(){
    if(typeof window.nav !== 'function' || window.nav.__stableWrapped) return;
    const original = window.nav;
    const wrapped = function(){ const out = original.apply(this, arguments); afterNav(); return out; };
    wrapped.__stableWrapped = true;
    window.nav = wrapped;
  }

  function boot(){
    markStable();
    removeHeavyRuntimeArtifacts();
    applyLivePulse();
    fixAishaSidebarHover();
    fixAishaAvatarClick();
    wrapNav();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
