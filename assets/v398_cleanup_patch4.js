(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function readJSON(key, fallback){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }catch(e){ return fallback; } }
  function writeJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }

  function rerenderCurrentContext(char){
    try{ if(window.renderAssets && qs('#page-assets.active')) window.renderAssets(); }catch(e){}
    try{ if(window.renderHomes && qs('#page-homes.active')) window.renderHomes(); }catch(e){}
    try{ if(window.renderCharPage && qs('#page-' + char + '.active')) window.renderCharPage(char); }catch(e){}
  }

  function syncAishaAvatarEverywhere(){
    const st = readJSON('silva_assets_aisha', {});
    const slot = qs('#aisha-avatar-slot');
    if(slot){
      slot.setAttribute('tabindex','0');
      slot.setAttribute('role','button');
      slot.setAttribute('title','Click to change Aisha profile image');
      if(st.face && !qs('img', slot)) slot.innerHTML = '<img src="'+st.face+'" alt="Aisha">';
    }
  }

  function patchUploadAsset(){
    if(!window.uploadAsset || window.uploadAsset.__v398cleanup4) return;
    window.uploadAsset = function(char, type){
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function(e){
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = function(ev){
          const st = readJSON('silva_assets_' + char, {});
          st[type] = ev.target.result;
          writeJSON('silva_assets_' + char, st);
          rerenderCurrentContext(char);
          if(char === 'aisha') syncAishaAvatarEverywhere();
          try{ if(window.toast) window.toast((type === 'face' ? 'Profile / face' : 'Body') + ' reference updated — ' + char); }catch(err){}
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };
    window.uploadAsset.__v398cleanup4 = true;
  }

  function bindAishaAvatarUpload(){
    const slot = qs('#aisha-avatar-slot');
    if(!slot || slot.dataset.uploadBound === '1') return;
    const trigger = function(e){
      if(e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if(window.uploadAsset) window.uploadAsset('aisha', 'face');
    };
    slot.addEventListener('click', trigger);
    slot.addEventListener('keydown', trigger);
    slot.dataset.uploadBound = '1';
  }

  function polishAishaSidebarItem(){
    const item = qs('#sidebar .nav-item[data-page="aisha"]');
    if(!item) return;
    item.classList.add('nav-item-aisha');
    item.setAttribute('title','Aisha profile');
  }

  function normalizeHomeButtons(){
    const page = qs('#page-home');
    if(!page) return;
    qsa('.cc-inline-actions .btn, .silva-actions-stack .btn', page).forEach(function(btn){
      btn.classList.add('btn-ghost');
    });
    qsa('.cc-side-card', page).forEach(function(card){ card.classList.add('silva-aura-card'); });
  }

  function normalizeCrossChar(){
    const page = qs('#page-crosschar');
    if(!page) return;
    qsa('.grid3 > .card', page).forEach(function(card){
      card.classList.add('silva-aura-card');
      card.style.borderImage = 'none';
      card.style.borderLeft = '1px solid var(--color-white-a6)';
      card.style.borderTop = '1px solid var(--color-white-a6)';
    });
  }

  function normalizeButtonsAndTabs(){
    qsa('.btn, .btn-ghost, .btn-primary, .copy-btn, .char-mode-pill, .char-tab, .preset-chip').forEach(function(el){
      el.classList.add('silva-ui-control');
    });
  }

  function run(){
    patchUploadAsset();
    syncAishaAvatarEverywhere();
    bindAishaAvatarUpload();
    polishAishaSidebarItem();
    normalizeHomeButtons();
    normalizeCrossChar();
    normalizeButtonsAndTabs();
  }
  function shouldRepeatRun(){
    var active = document.querySelector('.page.active');
    var id = active && active.id ? active.id : '';
    return /page-(homes|aisha|leah|claudia|grok|vanya|crosschar|assets)/.test(id);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', function(){
    [80, 260, 900].forEach(function(delay){
      setTimeout(function(){ if(shouldRepeatRun()) run(); }, delay);
    });
  });
})();
