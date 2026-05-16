(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function raf(fn){ return window.requestAnimationFrame ? requestAnimationFrame(fn) : setTimeout(fn, 16); }
  function readJSON(key, fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } }
  function writeJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }

  const CHAR_META = {
    aisha:{label:'Aisha', color:'var(--color-rgba-184-168-216-98)', role:'Chief Creative Officer'},
    leah:{label:'Leah', color:'var(--color-rgba-208-165-82-96)', role:'Trend & Content'},
    claudia:{label:'Claudia', color:'var(--color-rgba-143-184-220-98)', role:'Client Systems'},
    grok:{label:'Grok', color:'var(--color-rgba-130-166-127-98)', role:'Systems'},
    vanya:{label:'Vanya', color:'var(--color-rgba-226-140-204-98)', role:'People & Culture'}
  };

  function ensureButtonTypes(){
    qsa('button:not([type])').forEach(function(btn){ btn.type = 'button'; });
  }

  function ensureCharacterHoverBoxes(){
    Object.keys(CHAR_META).forEach(function(id){
      const item = qs('#sidebar .nav-item[data-page="'+id+'"]');
      if(!item) return;
      item.classList.add('alpha-orbit-target');
      item.style.setProperty('--orbit-color', CHAR_META[id].color);
      item.style.cursor = 'pointer';
      item.removeAttribute('title');
      if(!qs('.nav-label-box', item)){
        const box = document.createElement('span');
        box.className = 'nav-label-box';
        box.innerHTML = '<span class="dot"></span><span>'+CHAR_META[id].label+' · '+CHAR_META[id].role+'</span>';
        item.appendChild(box);
      }
    });
    try{ if(window.installOrbitChrome) window.installOrbitChrome(); }catch(e){}
  }

  function syncAishaAvatar(){
    const st = readJSON('silva_assets_aisha', {});
    const slot = qs('#aisha-avatar-slot');
    if(!slot) return;
    slot.removeAttribute('title');
    slot.setAttribute('aria-label', 'Change Aisha profile image');
    slot.setAttribute('role', 'button');
    slot.setAttribute('tabindex', '0');
    if(st.face){
      slot.innerHTML = '<img src="'+st.face+'" alt="Aisha profile image">';
    }
  }

  function bindAishaAvatar(){
    const slot = qs('#aisha-avatar-slot');
    if(!slot || slot.dataset.v398Patch5Bound === '1') return;
    function openPicker(e){
      if(e){
        if(e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function(ev){
        const file = ev.target.files && ev.target.files[0];
        if(!file) return;
        const r = new FileReader();
        r.onload = function(loadEv){
          const st = readJSON('silva_assets_aisha', {});
          st.face = loadEv.target.result;
          writeJSON('silva_assets_aisha', st);
          try{
            if(window.STATE){
              window.STATE.teamRecords = window.STATE.teamRecords || {};
              window.STATE.teamRecords.aisha = window.STATE.teamRecords.aisha || {};
              window.STATE.teamRecords.aisha.avatar = loadEv.target.result;
              if(window.saveState) window.saveState();
            }
          }catch(err){}
          syncAishaAvatar();
          try{ if(window.renderCharPage && qs('#page-aisha.active')) window.renderCharPage('aisha'); }catch(err){}
          try{ if(window.toast) window.toast('Aisha profile image updated'); }catch(err){}
          setTimeout(function(){ syncAishaAvatar(); bindAishaAvatar(); }, 40);
        };
        r.readAsDataURL(file);
      }, { once:true });
      input.click();
    }
    slot.addEventListener('click', openPicker);
    slot.addEventListener('keydown', openPicker);
    slot.addEventListener('pointerdown', function(){ slot.classList.add('is-pressing'); });
    slot.addEventListener('pointerup', function(){ slot.classList.remove('is-pressing'); });
    slot.addEventListener('pointerleave', function(){ slot.classList.remove('is-pressing'); });
    slot.dataset.v398Patch5Bound = '1';
  }

  function polishHomeSystem(){
    const page = qs('#page-homes');
    if(!page) return;
    qsa('.alpha-home-fixed-tab, .team-card', page).forEach(function(el){
      el.classList.add('silva-aura-key');
      el.style.cursor = 'pointer';
    });
    const search = qs('#home-search', page);
    if(search) search.setAttribute('spellcheck', 'false');
    qsa('.search-input, .filter-select, textarea', page).forEach(function(el){ el.autocomplete = 'off'; });
  }

  function polishAishaPage(){
    const page = qs('#page-aisha');
    if(!page) return;
    qsa('.char-mode-pill, .char-tab', page).forEach(function(el){
      el.classList.add('silva-ui-control');
      el.style.cursor = 'pointer';
      el.setAttribute('tabindex', '0');
    });
  }

  function polishCrossChar(){
    const page = qs('#page-crosschar');
    if(!page) return;
    qsa('.grid3 > .card', page).forEach(function(card){
      card.classList.add('silva-aura-key');
    });
  }

  function alignCards(){
    qsa('.card, .prompt-card, .gallery-card, .asset-card, .home-card, .char-panel, .dev-box, .loc-card, .broll-card, .event-card').forEach(function(el){
      el.style.overflow = 'hidden';
    });
  }

  function softenLegacyTitles(){
    qsa('[title]').forEach(function(el){
      if(el.id === 'aisha-avatar-slot' || el.closest('#sidebar .nav-item[data-page]')) el.removeAttribute('title');
    });
  }



  function pulseifyElementText(el, variant){
    if(!el) return;
    var raw = (el.dataset && el.dataset.silvaPulseSource) ? el.dataset.silvaPulseSource : ((el.textContent||'').trim());
    if(!raw) return;
    if(el.children.length && !el.querySelector('.silva-text-sheen')) return;
    var safe = String(raw).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]; });
    el.dataset.silvaPulseSource = raw;
    el.innerHTML = '<span class="silva-text-sheen ' + (variant || 'silva-text-sheen--soft') + '">' + safe + '</span>';
  }

  function applySelectiveTextPulse(){
    qsa('#page-crosschar .grid3 > .card .section-title').forEach(function(el){
      pulseifyElementText(el, 'silva-text-sheen--soft');
    });
    qsa('.char-mode-pill.active-mode').forEach(function(el){
      el.classList.add('silva-pulse-pill');
      pulseifyElementText(el, 'silva-text-sheen--soft');
    });
    qsa('#studio-ask-output, #ai-helper-output, [id*="ready"], .cc-replying, .room-replying, .thinking-text, .studio-response .output-text').forEach(function(el){
      var txt = (el.dataset && el.dataset.silvaPulseSource) ? el.dataset.silvaPulseSource : ((el.textContent||'').trim());
      if(/\b(thinking|generating|critiquing|processing|saving|loading)\b/i.test(txt)){
        pulseifyElementText(el, 'silva-text-sheen--live');
      }
    });
    qsa('#page-home .toggle-chip.active, #page-home .quick-mode-chip.active, #page-home .quick-modes button.active').forEach(function(el){
      pulseifyElementText(el, 'silva-text-sheen--soft');
    });
  }

  function run(){
    ensureButtonTypes();
    ensureCharacterHoverBoxes();
    syncAishaAvatar();
    bindAishaAvatar();
    polishHomeSystem();
    polishAishaPage();
    polishCrossChar();
    alignCards();
    softenLegacyTitles();
    applySelectiveTextPulse();
  }

  function bootOnce(){
    run();
    if(window.__v398Cleanup5NavWrapped || typeof window.nav !== 'function') return;
    const originalNav = window.nav;
    window.nav = function(){
      const out = originalNav.apply(this, arguments);
      raf(run);
      return out;
    };
    window.__v398Cleanup5NavWrapped = true;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootOnce, { once:true });
  else bootOnce();
})();
