(() => {
  'use strict';
  if (window.__V399_LEGACY_POLISH_PASS3__) return;
  window.__V399_LEGACY_POLISH_PASS3__ = true;

  const VERSION = 'v3.9.9';
  const CHAR_IDS = ['aisha','leah','claudia','grok','vanya'];
  const HOME_CACHE = { key:'', html:'' };
  let homeDebounce = 0;
  let uiRefreshQueued = false;

  const MODE_EFFECTS = window.SILVA_MODE_EFFECTS || {
    aisha: {
      observing: 'Sharper audit language. More drift / identity checking before stylistic enthusiasm.',
      precise: 'Tighter wording, stricter prompt trimming, cleaner decisions, less flourish.',
      glacial: 'Cooler tone, fewer moves, more restraint, more review pressure before approval.',
      approving: 'Warmer green-light energy, easier sign-off when the output is already clean.',
      reviewing: 'More quality-control language, archive / drift / fix emphasis.'
    },
    leah: {
      sharp: 'More direct trend judgment and faster critique of what feels late or generic.',
      observant: 'More nuance, scene-reading, and subtle environmental detail.',
      amused: 'Softer edge with a slightly playful read of the same brief.',
      current: 'More platform-aware language and timelier references.',
      cooler: 'Cleaner, drier tone with less warmth and less overexplaining.'
    },
    claudia: {
      composed: 'Calm, premium, organized delivery language.',
      warm: 'Softer interpersonal tone without losing standards.',
      premium: 'More luxury-service vocabulary and polish pressure.',
      clear: 'Tighter structure, cleaner wording, less decoration.',
      firm: 'Stronger boundaries, clearer decisions, less negotiation.'
    },
    grok: {
      reserved: 'Minimal, dry, systems-first language.',
      dry: 'Even flatter delivery, slightly more sarcastic precision.',
      focused: 'More implementation detail and fewer decorative words.',
      analytical: 'More structure, cause/effect, and systems logic.',
      tired: 'Same intelligence, lower-energy delivery, still exact.'
    },
    vanya: {
      bratty: 'Sharper attitude, more playful pushback, still useful.',
      pretty: 'More polished softness and image awareness.',
      strict: 'Stronger standards, less tolerance for sloppy output.',
      'soft menace': 'Controlled sweetness with sharper quality pressure underneath.',
      'locked in': 'Most focused, least chatty, most execution-heavy.'
    }
  };

  function byId(id){ return document.getElementById(id); }
  function charColor(id){ return id === 'leah' ? 'var(--leah)' : id === 'claudia' ? 'var(--claudia)' : id === 'grok' ? 'var(--grok)' : id === 'vanya' ? (window.VANYA_COLOR || '#f0b8c6') : 'var(--silver)'; }
  function safeSave(){ try{ if(typeof window.saveState === 'function') window.saveState(); }catch(e){} }
  function toast(msg){ try{ if(typeof window.toast === 'function') window.toast(msg); }catch(e){} }
  function activePageId(){ return document.querySelector('.page.active')?.id || ''; }
  function isPageActive(id){ return activePageId() === 'page-' + id; }
  function getChar(id){ try{ return (window.getChar && window.getChar(id)) || (window.CHARS && window.CHARS[id]) || null; }catch(e){ return null; } }
  function getAsset(char){ try{ return JSON.parse(localStorage.getItem('silva_assets_' + char) || '{}') || {}; }catch(e){ return {}; } }
  function setAsset(char, patch){ const st = Object.assign({}, getAsset(char), patch || {}); try{ localStorage.setItem('silva_assets_' + char, JSON.stringify(st)); }catch(e){} return st; }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function ensureStructures(){
    window.STATE = window.STATE || {};
    STATE.currentModes = STATE.currentModes || {};
    STATE.teamRecords = STATE.teamRecords || {};
    STATE.homeProfiles = STATE.homeProfiles || {};
    if (!STATE.modeEffects) STATE.modeEffects = {};

    if (window.ensureV35State) { try{ window.ensureV35State(); }catch(e){} }
    if (window.ensureV3State) { try{ window.ensureV3State(); }catch(e){} }
    if (window.ensureCharacters) { try{ window.ensureCharacters(); }catch(e){} }

    const aisha = getChar('aisha');
    if (aisha) {
      aisha.name = 'Aisha Motsepe';
      if (STATE.teamRecords.aisha) STATE.teamRecords.aisha.name = 'Aisha Motsepe';
      if (Array.isArray(aisha.modes) && !aisha.modes.includes('reviewing')) aisha.modes.push('reviewing');
      if (!STATE.currentModes.aisha) STATE.currentModes.aisha = (aisha.modes && aisha.modes[0]) || 'observing';
    }

    const vanya = getChar('vanya');
    if (vanya) {
      vanya.name = 'Vanya Khumalo';
      vanya.role = vanya.role || 'People & Culture Lead · HR & Talent Ops';
      if (!Array.isArray(vanya.modes) || !vanya.modes.length) vanya.modes = ['bratty','pretty','strict','soft menace','locked in'];
      if (!STATE.currentModes.vanya) STATE.currentModes.vanya = vanya.modes[0];
    }

    CHAR_IDS.forEach(id => {
      const c = getChar(id);
      if (!c) return;
      if (!Array.isArray(c.modes) || !c.modes.length) c.modes = ['default'];
      if (!STATE.currentModes[id] || !c.modes.includes(STATE.currentModes[id])) STATE.currentModes[id] = c.modes[0];
      STATE.modeEffects[id] = STATE.modeEffects[id] || {};
      STATE.modeEffects[id].active = STATE.currentModes[id];
      STATE.modeEffects[id].note = modeNote(id, STATE.currentModes[id]);
      STATE.teamRecords[id] = STATE.teamRecords[id] || { name:c.name || id, role:c.role || '', city:c.city || '' };
      if (id === 'vanya') {
        STATE.teamRecords[id].name = 'Vanya Khumalo';
        STATE.teamRecords[id].role = STATE.teamRecords[id].role || 'People Ops / HR';
      }
    });
  }

  function modeNote(char, mode){
    return (MODE_EFFECTS[char] && MODE_EFFECTS[char][mode]) || `Active mode: ${mode}.`;
  }

  function normalizeVersionText(){
    if (window.applySilvaChromeVersion) window.applySilvaChromeVersion();
    document.querySelectorAll('.cc-chip, .small-note, .sidebar-footer, .page-sub, .mode-indicator, .label-xs, .home-sub, .asset-sub').forEach(el => {
      if (!el || !el.textContent) return;
      const text = el.textContent;
      if (/v3\.9\.[78]a?/i.test(text)) el.textContent = text.replace(/v3\.9\.[78]a?/ig, VERSION);
      if (/Aisha Ndlaba/i.test(el.textContent)) el.textContent = el.textContent.replace(/Aisha Ndlaba/ig, 'Aisha Motsepe');
    });
  }

  function applyModeNotes(){
    CHAR_IDS.forEach(id => {
      const page = byId('page-' + id);
      if (!page) return;
      const bar = page.querySelector('.char-mode-bar');
      if (!bar) return;
      let note = page.querySelector('.mode-effect-note');
      if (!note) {
        note = document.createElement('div');
        note.className = 'mode-effect-note';
        bar.insertAdjacentElement('afterend', note);
      }
      const mode = (STATE.currentModes && STATE.currentModes[id]) || (getChar(id)?.modes || [])[0] || 'default';
      note.innerHTML = `<span class="label">Live mode effect</span><strong>${esc(mode)}</strong> · ${esc(modeNote(id, mode))}`;
    });
  }

  function refreshHeroAvatar(char, avatar){
    const page = byId('page-' + char);
    const el = page && page.querySelector('.char-hero .char-avatar');
    if (!el) return;
    const face = avatar || getAsset(char).face || (STATE.teamRecords && STATE.teamRecords[char] && STATE.teamRecords[char].avatar) || '';
    const letter = (getChar(char)?.name || char || '?').trim().charAt(0).toUpperCase();
    el.classList.add('clickable-avatar');
    el.dataset.char = char;
    if (face) {
      el.classList.add('has-face-img');
      el.innerHTML = `<img src="${face}" alt="${esc(getChar(char)?.name || char)} avatar">`;
    } else {
      el.classList.remove('has-face-img');
      el.textContent = letter;
    }
    if (!el.__v399AvatarBound) {
      el.__v399AvatarBound = true;
      el.title = 'Click to change face image';
      el.addEventListener('click', evt => {
        evt.preventDefault();
        evt.stopPropagation();
        uploadFaceFromHero(char);
      });
    }
  }

  function wireHeroAvatars(){
    CHAR_IDS.forEach(id => refreshHeroAvatar(id));
  }

  function uploadFaceFromHero(char){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const face = reader.result;
        setAsset(char, { face });
        if (STATE.teamRecords && STATE.teamRecords[char]) STATE.teamRecords[char].avatar = face;
        safeSave();
        scheduleUiRefresh();
        if (isPageActive('assets') && typeof window.renderAssets === 'function') try{ window.renderAssets(); }catch(e){}
        if (isPageActive('home') && typeof window.renderHome === 'function') try{ window.renderHome(); }catch(e){}
        toast((getChar(char)?.name || char) + ' face image updated');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function scheduleUiRefresh(){
    if (uiRefreshQueued) return;
    uiRefreshQueued = true;
    requestAnimationFrame(() => {
      uiRefreshQueued = false;
      normalizeVersionText();
      ensureStructures();
      applyModeNotes();
      wireHeroAvatars();
      try{ syncStudioPulseChrome(); }catch(e){}
    });
  }

  function patchSetMode(){
    if (window.setMode && window.setMode.__v399Pass3) return;
    const old = window.setMode;
    window.setMode = function(char, mode){
      ensureStructures();
      STATE.currentModes[char] = mode;
      STATE.modeEffects[char] = STATE.modeEffects[char] || {};
      STATE.modeEffects[char].active = mode;
      STATE.modeEffects[char].note = modeNote(char, mode);
      safeSave();
      if (typeof old === 'function') old(char, mode);
      else {
        document.querySelectorAll(`.char-mode-pill[data-char="${char}"]`).forEach(p => p.classList.toggle('active-mode', p.dataset.mode === mode));
      }
      scheduleUiRefresh();
      if (isPageActive('assets') && typeof window.renderAssets === 'function') try{ window.renderAssets(); }catch(e){}
      if (isPageActive('home') && typeof window.renderHome === 'function') try{ window.renderHome(); }catch(e){}
      if (isPageActive('homes') && typeof window.renderHomes === 'function') try{ window.renderHomes({force:true}); }catch(e){}
      toast((getChar(char)?.name || char) + ' mode → ' + mode);
    };
    window.setMode.__v399Pass3 = true;
  }

  function patchFetchModeInfluence(){
    return;
  }

  function patchHomePerformance(){
    if (window.__SILVA_HOME_RENDERER_OWNER === 'renderHomesV12' || (window.renderHomes && window.renderHomes.__shelfFixV14)) return;
    if (window.renderHomes && window.renderHomes.__v399Pass3) return;
    const old = window.renderHomes;
    if (typeof old !== 'function') return;

    function homeKey(){
      const filter = (byId('home-char') && byId('home-char').value) || 'all';
      const search = (byId('home-search') && byId('home-search').value) || '';
      let summary = '';
      try {
        const hp = STATE.homeProfiles || {};
        const ha = STATE.homeAssets || {};
        summary = JSON.stringify({
          filter, search,
          profiles: Object.fromEntries(Object.entries(hp).map(([k,v]) => [k, [v.neighborhood,v.building,v.homeMood,v.favoriteSpot,v.vehicle,v.commute,v.roomPrompt,v.yardPrompt].join('|') ])),
          assets: Object.fromEntries(Object.entries(ha).map(([k,v]) => [k, Object.keys(v||{}).filter(x => !!v[x]).sort().join(',') ]))
        });
      } catch(e){ summary = filter + '|' + search; }
      return summary;
    }

    function postRender(){
      const grid = byId('homes-grid');
      if (!grid) return;
      grid.classList.add('fast-home-grid');
      grid.querySelectorAll('img').forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
        img.fetchPriority = 'low';
      });
      const search = byId('home-search');
      if (search && !search.__v399Debounced) {
        search.__v399Debounced = true;
        search.addEventListener('input', ev => {
          if (ev.__v399Synthetic) return;
          if (typeof search.oninput === 'function') search.oninput = null;
          clearTimeout(homeDebounce);
          homeDebounce = setTimeout(() => {
            HOME_CACHE.key = '';
            window.renderHomes();
          }, 120);
        });
      }
    }

    window.renderHomes = function(){
      const beforeKey = homeKey();
      old();
      const grid = byId('homes-grid');
      if (grid && HOME_CACHE.key === beforeKey && HOME_CACHE.html) {
        grid.innerHTML = HOME_CACHE.html;
      } else if (grid) {
        HOME_CACHE.key = beforeKey;
        HOME_CACHE.html = grid.innerHTML;
      }
      postRender();
      scheduleUiRefresh();
    };
    window.renderHomes.__v399Pass3 = true;

    if (typeof window.uploadHomeAsset === 'function' && !window.uploadHomeAsset.__v399Pass3) {
      const oldUpload = window.uploadHomeAsset;
      window.uploadHomeAsset = function(){ HOME_CACHE.key = ''; return oldUpload.apply(this, arguments); };
      window.uploadHomeAsset.__v399Pass3 = true;
    }
    if (typeof window.saveHomeProfile === 'function' && !window.saveHomeProfile.__v399Pass3) {
      const oldSave = window.saveHomeProfile;
      window.saveHomeProfile = function(){ HOME_CACHE.key = ''; const out = oldSave.apply(this, arguments); setTimeout(scheduleUiRefresh, 0); return out; };
      window.saveHomeProfile.__v399Pass3 = true;
    }
  }

  function syncStudioPulseChrome(){
    const page = byId('page-home');
    if (!page) return;
    if (window.applySilvaChromeVersion) window.applySilvaChromeVersion();
    const modeTarget = page.querySelector('.cc-target strong');
    if (modeTarget) {
      const aishaMode = (STATE.currentModes && STATE.currentModes.aisha) || 'observing';
      modeTarget.textContent = aishaMode;
    }
  }

  function patchRenderHomeCounts(){
    if (window.renderHome && window.renderHome.__v399CountsPass3) return;
    const old = window.renderHome;
    if (typeof old !== 'function') return;
    window.renderHome = function(){
      const out = old.apply(this, arguments);
      ['leah','claudia','grok','vanya'].forEach(id => {
        try {
          const el = byId(id + '-count');
          if (el) {
            const count = (STATE.prompts || []).filter(p => p.char === id).length;
            el.textContent = count + ' prompt' + (count !== 1 ? 's' : '');
          }
          if (typeof window.renderModePills === 'function' && byId(id + '-mode-bar')) window.renderModePills(id + '-mode-bar', id);
        } catch(e){}
      });
      scheduleUiRefresh();
      return out;
    };
    window.renderHome.__v399CountsPass3 = true;
  }

  function patchSaveHooks(){
    [['saveAssetNotes', true], ['saveTeamRecord', false]].forEach(([name]) => {
      if (typeof window[name] === 'function' && !window[name].__v399Pass3) {
        const old = window[name];
        window[name] = function(){ const out = old.apply(this, arguments); setTimeout(scheduleUiRefresh, 0); return out; };
        window[name].__v399Pass3 = true;
      }
    });
    if (typeof window.uploadAsset === 'function' && !window.uploadAsset.__v399Pass3) {
      const old = window.uploadAsset;
      window.uploadAsset = function(char, type){
        const wrapped = old.apply(this, arguments);
        setTimeout(() => { if (type === 'face') refreshHeroAvatar(char); scheduleUiRefresh(); }, 50);
        return wrapped;
      };
      window.uploadAsset.__v399Pass3 = true;
    }
  }

  function installObserver(){
    return;
  }

  function boot(){
    ensureStructures();
    normalizeVersionText();
    patchSetMode();
    patchFetchModeInfluence();
    patchHomePerformance();
    patchRenderHomeCounts();
    patchSaveHooks();
    applyModeNotes();
    wireHeroAvatars();
    syncStudioPulseChrome();
    installObserver();
    scheduleUiRefresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
