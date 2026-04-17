(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function hardenShell(){
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const main = qs('#main');
    const sidebar = qs('#sidebar');
    if(main){ main.style.overflowY = 'auto'; main.style.overflowX = 'hidden'; }
    if(sidebar){ sidebar.style.overflowY = 'auto'; }
  }

  function tuneNavState(){
    qsa('#sidebar .nav-item').forEach(function(item){
      item.setAttribute('tabindex','0');
    });
    const logo = qs('.logo-wordmark');
    if(logo) logo.textContent = 'Silva Studios';
  }

  function patchHomeShell(){
    const page = qs('#page-home');
    if(!page) return;
    const title = qs('.page-title', page);
    if(title && /AI Communications Centre/i.test(title.textContent||'')) title.textContent = 'Studio Pulse';
    const sub = qs('.page-sub', page);
    if(sub && /Gemini-guided/i.test(sub.textContent||'')) sub.textContent = 'Strategic guidance, continuity memory, cleaner internal coordination, and the next move that actually matters.';
  }

  function patchAishaVisuals(){
    const item = qs('#sidebar .nav-item[data-page="aisha"]');
    if(item){ item.classList.add('nav-item-aisha'); }
    const avatar = qs('#aisha-avatar-slot');
    if(avatar && !avatar.getAttribute('aria-label')) avatar.setAttribute('aria-label','Aisha avatar');
  }

  function run(){
    hardenShell();
    tuneNavState();
    patchHomeShell();
    patchAishaVisuals();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', function(){ setTimeout(run, 60); setTimeout(run, 240); });
})();
