(function(){
  const AISHA_FACE = 'assets/aisha_face.png';
  const AISHA_BODY = 'assets/aisha_body.png';
  const AISHA_COLOR = 'var(--aisha)';
  const AISHA_RECORD = {
    name:'Aisha Motsepe',
    role:'Chief Creative Officer',
    department:'Creative',
    city:'Johannesburg',
    email:'aisha@silvastudios.co.za',
    phone:'+27 xx xxx xxxx',
    instagram:'@aisha.motsepe',
    linkedin:'Aisha Motsepe — Silva Studios',
    status:'Active',
    owner:'Creative',
    notes:'Cold, exacting, anti-sludge. Owns review, drift, archive quality, and rebuild judgment.',
    ai:true,
    avatar:''
  };
  const AISHA_CHAR = {
    name:'Aisha Motsepe',
    role:'Chief Creative Officer',
    city:'Johannesburg',
    modes:['observing','precise','glacial','approving','reviewing'],
    identity:{
      age:'27', birthday:'—', zodiac:'—', city:'Johannesburg', languages:'English',
      build:'Slim feminine build with controlled elegant posture.',
      skin:'Warm brown skin with natural texture. No plastic smoothing.',
      hair:'Straight shoulder-length black hair or clean polished equivalent from canonical refs.',
      eyes:'Direct, calm, exacting gaze.',
      expression:'Controlled, cool, unreadable by default.',
      wardrobe:'Dark premium neutrals. Clean, expensive, precise.',
      neverChange:['Aisha face lock from canonical refs','Warm brown skin tone and realistic texture','Controlled premium presence','Cold exacting facial read','Slim realistic feminine build'],
      neverGenerate:['Generic corporate stock portrait','Cheap glam styling','Wrong facial identity','Over-smiling influencer energy','Plastic over-retouching']
    },
    personal:{
      summary:'Aisha is the standards layer of Silva Studios. She governs drift, archive quality, rebuild judgement, and prompt critique.',
      strengths:['Quality judgement','Drift detection','Reference fidelity','Prompt critique'],
      weaknesses:['Can feel severe','Low tolerance for vague work'],
      habits:['Cuts noise quickly','Pushes for cleaner standards'],
      annoyances:['Generic prompts','Visual drift','Unclear references'],
      signaturePhrases:['This is drifting.','Tighten it.','Reference fidelity is off.']
    },
    lifeRhythm:{
      morning:'Quiet review before anything noisy.',
      workday:'Review, drift checks, archive governance.',
      weekend:'Low-key, selective, private.',
      decompresses:'Silence, order, curation.',
      favoriteCafes:[], favoriteOrder:'—', favoriteSpots:['Johannesburg'], neverPost:['Messy overshare']
    },
    digital:{
      chosenHandle:'@aisha.motsepe', bio:['Chief Creative Officer · Silva Studios'], highlightNames:['Review','Archive','Standards'], storyVibe:'Quiet, exacting, controlled.', commentTone:'Brief, surgical.', linkedInHeadline:'Chief Creative Officer · Silva Studios', dmTone:'Direct, precise.'
    },
    professional:{
      headline:'Chief Creative Officer',
      summary:'Owns review, drift, archive quality, and rebuild judgement.',
      workStyle:'Exacting, standards-first, selective.',
      strengths:['Review systems','Drift judgement','Reference quality'],
      tools:['Prompt review','Archive systems'],
      serviceAreas:['Review','Archive','Rebuild']
    }
  };

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  function toastSafe(msg){ try{ if(window.toast) window.toast(msg); else if(window.showToast) window.showToast('info', msg); }catch(e){} }
  function saveMaybe(){ try{ window.saveState && window.saveState(); }catch(e){} }
  function readJSON(key, fallback={}){ try{ return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key)||'{}')||{}); }catch(e){ return Object.assign({}, fallback); } }
  function writeJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function isUsableAssetSrc(src){ return /^(data:image\/|assets\/|\/assets\/|https?:\/\/)/.test(String(src||'').trim()); }
  function assetDefaults(char){
    const fallback = {
      aisha:{ face:AISHA_FACE, body:AISHA_BODY },
      leah:{ face:(window.CANONICAL_REFS && CANONICAL_REFS.leah_face) || '', body:(window.CANONICAL_REFS && CANONICAL_REFS.leah_body) || '' },
      claudia:{ face:(window.CANONICAL_REFS && CANONICAL_REFS.claudia_face) || '', body:(window.CANONICAL_REFS && CANONICAL_REFS.claudia_body) || '' },
      grok:{ face:(window.CANONICAL_REFS && CANONICAL_REFS.grok_face) || '', body:(window.CANONICAL_REFS && CANONICAL_REFS.grok_body) || '' },
      vanya:{ face:window.VANYA_FACE || '', body:window.VANYA_BODY || '' }
    };
    return fallback[char] || { face:'', body:'' };
  }
  function normalizeAssetSrc(src, fallback){
    return isUsableAssetSrc(src) ? String(src).trim() : String(fallback || '').trim();
  }
  function renderHomesSafe(force){
    if(typeof window.renderHomes !== 'function') return;
    try{ window.renderHomes(force ? {force:true} : undefined); }catch(e){}
  }

  function ensureState(){
    window.STATE = window.STATE || {};
    STATE.teamRecords = STATE.teamRecords || {};
    STATE.characters = STATE.characters || {};
    STATE.currentModes = STATE.currentModes || {};
    STATE.ui = STATE.ui || {};
    STATE.teamRecords.aisha = Object.assign({}, AISHA_RECORD, STATE.teamRecords.aisha || {});
    if(!STATE.currentModes.aisha) STATE.currentModes.aisha = 'observing';
    STATE.characters.aisha = Object.assign({}, AISHA_CHAR, STATE.characters.aisha || {}, {
      name:'Aisha Motsepe', role:(STATE.teamRecords.aisha && STATE.teamRecords.aisha.role) || AISHA_CHAR.role, city:(STATE.teamRecords.aisha && STATE.teamRecords.aisha.city) || AISHA_CHAR.city
    });
    const order = Array.isArray(STATE.ui.teamSidebarOrder) ? STATE.ui.teamSidebarOrder.filter(Boolean) : [];
    const next = ['aisha'].concat(order.filter(id => id !== 'aisha'));
    ['leah','claudia','grok','vanya'].forEach(id => { if(!next.includes(id)) next.push(id); });
    STATE.ui.teamSidebarOrder = next;
    saveMaybe();
  }

  function seedAishaAssets(){
    const key='silva_assets_aisha';
    const st=readJSON(key, {face:AISHA_FACE, body:AISHA_BODY, notes:'Canonical locks: shoulder-length black hair, warm brown skin, slim realistic build, controlled premium presence.'});
    st.face = normalizeAssetSrc(st.face, AISHA_FACE);
    st.body = normalizeAssetSrc(st.body, AISHA_BODY);
    if(!st.notes) st.notes='Canonical locks: shoulder-length black hair, warm brown skin, slim realistic build, controlled premium presence.';
    writeJSON(key, st);
    try{ if(!localStorage.getItem('silva_avatar_aisha')) localStorage.setItem('silva_avatar_aisha', st.face); }catch(e){}
    ensureState();
    if(STATE.teamRecords.aisha && !STATE.teamRecords.aisha.avatar){
      STATE.teamRecords.aisha.avatar = st.face;
      saveMaybe();
    }
  }

  function ensureLogo(){
    const logo = qs('.logo-text');
    if(!logo) return;
    logo.innerHTML = '<span class="live-dot"></span><span class="logo-wordmark">Silva Studios</span>';
    if(window.applySilvaChromeVersion) window.applySilvaChromeVersion();
  }

  function ensureAishaNav(){
    const charSection = qs('#sidebar .nav-section[data-nav-group="characters"]') || qsa('#sidebar .nav-section')[1];
    if(!charSection) return;
    let a = qs('.nav-item[data-page="aisha"]', charSection);
    if(!a){
      a = document.createElement('div');
      a.className = 'nav-item';
      a.dataset.page = 'aisha';
      a.innerHTML = '<span class="nav-char-dot" style="background:'+AISHA_COLOR+'"></span> Aisha Motsepe';
      const firstChar = qs('.nav-item[data-page="leah"]', charSection) || qs('.nav-item[data-page="crosschar"]', charSection);
      charSection.insertBefore(a, firstChar || charSection.firstChild);
    }
    a.onclick = function(e){ e.preventDefault(); if(window.nav) window.nav('aisha'); };
  }

  function ensureAishaPage(){
    const main = qs('#main');
    if(!main || qs('#page-aisha')) return;
    const activeMode = ((window.STATE || {}).currentModes || {}).aisha || 'observing';
    const modeNote = window.getSilvaModeContext ? window.getSilvaModeContext('aisha',{includeLabel:false}) : 'Sharper audit language. More drift and identity checking before stylistic enthusiasm.';
    main.insertAdjacentHTML('beforeend',
      '<section class="page" id="page-aisha">'+
        '<div class="char-hero char-hero-aisha">'+
          '<div class="char-avatar clickable-avatar has-face-img" id="aisha-avatar-slot" data-char="aisha" title="Click to change face image" style="background:var(--color-rgba-184-168-216-0-12);color:'+AISHA_COLOR+'"><img src="'+AISHA_FACE+'" alt="Aisha Motsepe avatar"></div>'+
          '<div class="char-hero-main">'+
            '<div class="char-name">Aisha Motsepe</div>'+
            '<div class="char-role">Chief Creative Officer · Silva Studios · Johannesburg</div>'+
            '<div class="char-quote">“If it feels vague, it is already drifting.”</div>'+
            '<div class="char-mode-bar">'+
              '<span class="char-mode-pill active-mode" data-char="aisha" data-mode="observing">Observing</span>'+
              '<span class="char-mode-pill" data-char="aisha" data-mode="precise">Precise</span>'+
              '<span class="char-mode-pill" data-char="aisha" data-mode="glacial">Glacial</span>'+
              '<span class="char-mode-pill" data-char="aisha" data-mode="approving">Approving</span>'+
              '<span class="char-mode-pill" data-char="aisha" data-mode="reviewing">Reviewing</span>'+
            '</div>'+
            '<div class="mode-effect-note"><span class="label">Live mode effect</span><strong>'+esc(activeMode)+'</strong> · '+esc(modeNote)+'</div>'+
            '<div class="solid-char-actions"><button class="btn btn-red btn-sm" type="button">Open Gallery</button><button class="btn btn-ghost btn-sm" type="button">Edit Character</button><button class="btn btn-ghost btn-sm" type="button">Edit Team Record</button><button class="btn btn-ghost btn-sm" type="button">Assets Vault</button></div>'+
            '<div class="solid-char-subhint">Character editor = nested character brain. Team record = operational profile shell.</div>'+
          '</div>'+
          '<div class="char-hero-status"><div class="label-xs">Identity Status</div><div class="mode-indicator">🔒 LOCKED</div></div>'+
        '</div>'+
        '<div class="char-tabs">'+
          '<div class="char-tab active" data-char="aisha" data-tab="identity">Identity Lock</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="personal">Personal Profile</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="life">Life Rhythm</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="digital">Digital Profile</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="prompts">Prompts</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="captions">Captions</div>'+
          '<div class="char-tab" data-char="aisha" data-tab="professional">Professional</div>'+
        '</div>'+
        '<div id="aisha-tab-content"></div>'+
      '</section>'
    );
  }
  window.ensureAishaPage = ensureAishaPage;

  function patchNav(){
    if(!window.nav || window.nav.__v398Patched) return;
    const old = window.nav;
    window.nav = function(page){
      const out = old(page);
      if(page === 'aisha'){ try{ window.renderCharPage && window.renderCharPage('aisha'); }catch(e){} }
      if(page === 'assets'){ try{ window.renderAssets && window.renderAssets(); }catch(e){} }
      if(page === 'home'){ try{ patchHomeStats(); }catch(e){} }
      return out;
    };
    window.nav.__v398Patched = true;
  }

  function patchSelectors(){
    const targets = {
      'g-char':'Aisha Motsepe',
      'lib-char':'Aisha',
      'cap-char':'Aisha',
      'plan-char-filter':'Aisha',
      'gal-char':'Aisha',
      'saved-char':'Aisha',
      'ideas-char':'Aisha',
      'wr-char':'Aisha',
      'wr-g-char':'Aisha',
      'plan-char':'Aisha',
      'planner-char':'Aisha'
    };
    Object.entries(targets).forEach(([id,label]) => {
      const sel = document.getElementById(id);
      if(!sel || Array.from(sel.options||[]).some(o => o.value === 'aisha')) return;
      const opt = document.createElement('option');
      opt.value = 'aisha';
      opt.textContent = label;
      sel.appendChild(opt);
    });
  }

  function patchHomeStats(){
    const stat = document.getElementById('stat-chars');
    if(stat) stat.textContent = '5';
    const sub = qs('#page-home .page-sub');
    if(sub && !/Aisha/.test(sub.textContent || '')){
      sub.textContent = 'Silva Studios AI Division · Aisha · Leah · Claudia · Grok · Vanya · Johannesburg';
    }
  }

  function readPulse(){
    try{ return JSON.parse(localStorage.getItem('silva_studio_pulse_v395')||'{}') || {}; }catch(e){ return {}; }
  }
  function writePulse(p){ try{ localStorage.setItem('silva_studio_pulse_v395', JSON.stringify(p)); }catch(e){} }

  window.uploadConsistencyRef = function(id, kind, key){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(){
      const file = input.files && input.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        const pulse = readPulse();
        pulse.homes = pulse.homes || {};
        pulse.homes[id] = pulse.homes[id] || { home:{}, outfits:[null,null,null,null,null,null], items:{}, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' };
        const home = pulse.homes[id];
        home.home = home.home || {};
        home.outfits = Array.isArray(home.outfits) ? home.outfits : [null,null,null,null,null,null];
        home.items = home.items || {};
        if(kind === 'home') home.home[key] = reader.result;
        else if(kind === 'outfit') home.outfits[Number(key)] = reader.result;
        else if(kind === 'item') home.items[key] = reader.result;
        writePulse(pulse);
        renderHomesSafe(true);
        toastSafe('Reference updated');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  function patchRenderAssets(){
    const originalUpload = window.uploadAsset;
    const originalSave = window.saveAssetNotes;
    window.renderAssets = function(){
      ensureState();
      seedAishaAssets();
      const grid = qs('#assets-grid'); if(!grid) return;
      const chars = ['aisha','leah','claudia','grok','vanya'];
      grid.innerHTML = chars.map(function(char){
        const c = (window.getChar && window.getChar(char)) || STATE.characters[char] || STATE.teamRecords[char] || {name:char, role:''};
        const palette = {aisha:'var(--aisha, var(--color-hex-b8a8d8))', leah:'var(--leah)', claudia:'var(--claudia)', grok:'var(--grok)', vanya:'var(--vanya, var(--color-hex-f1b2c8))'};
        const charColor = palette[char] || 'var(--silver)';
        const st = readJSON('silva_assets_'+char, {});
        const fallback = assetDefaults(char);
        const faceSrc = normalizeAssetSrc(st.face, fallback.face);
        const bodySrc = normalizeAssetSrc(st.body, fallback.body);
        return '<div class="asset-card">'+
          '<div class="asset-card-head"><div><div class="asset-title" style="color:'+charColor+'">'+esc(c.name || char)+'</div><div class="asset-sub">'+esc(c.role || '')+'</div></div><span class="mode-indicator">'+esc((STATE.currentModes && STATE.currentModes[char]) || 'active')+' mode</span></div>'+
          '<div class="asset-body">'+
            '<div class="label-xs mb8">Reference Images</div>'+
            '<div class="asset-slots">'+
              '<div class="asset-slot'+(faceSrc?' has-img':'')+'" onclick="uploadAsset(\''+char+'\',\'face\')">'+(faceSrc?'<img src="'+esc(faceSrc)+'" data-fallback="'+esc(fallback.face||'')+'" onerror="this.onerror=null;this.src=this.dataset.fallback||\'\';">':'')+'<div class="asset-ph">Face Reference<br><span style="font-size:var(--type-2xs);opacity:0.6">Click to upload</span></div></div>'+
              '<div class="asset-slot'+(bodySrc?' has-img':'')+'" onclick="uploadAsset(\''+char+'\',\'body\')">'+(bodySrc?'<img src="'+esc(bodySrc)+'" data-fallback="'+esc(fallback.body||'')+'" onerror="this.onerror=null;this.src=this.dataset.fallback||\'\';">':'')+'<div class="asset-ph">Full Body Reference<br><span style="font-size:var(--type-2xs);opacity:0.6">Click to upload</span></div></div>'+
            '</div>'+
            '<div class="label-xs mb8">Identity Lock Notes</div>'+
            '<textarea class="asset-notes" id="note-'+char+'" placeholder="Notes on identity consistency for this character...">'+esc(st.notes||'')+'</textarea>'+
            '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">'+
              '<button class="btn btn-ghost btn-sm" onclick="saveAssetNotes(\''+char+'\')">Save Notes</button>'+
              '<button class="btn btn-ghost btn-sm" onclick="nav(\''+char+'\')">View Character</button>'+
            '</div>'+
            '<div style="margin-top:10px" class="label-xs">Never Change</div>'+
            '<ul class="never-list" style="margin-top:6px">'+((c.identity && c.identity.neverChange) || []).map(x => '<li>'+esc(x)+'</li>').join('')+'</ul>'+
          '</div>'+
        '</div>';
      }).join('');
    };
      
    if(typeof originalUpload === 'function') window.uploadAsset = originalUpload;
    if(typeof originalSave === 'function') window.saveAssetNotes = originalSave;
  }

  function syncAishaAvatar(){
    const st = readJSON('silva_assets_aisha', {});
    const faceSrc = normalizeAssetSrc(st.face, AISHA_FACE);
    const slot = document.getElementById('aisha-avatar-slot');
    if(slot && faceSrc){ slot.innerHTML = '<img src="'+faceSrc+'" alt="Aisha">'; }
    const hero = qs('.nav-item[data-page="aisha"] .nav-char-dot');
    if(hero) hero.style.background = AISHA_COLOR;
  }

  function rerenderIfNeeded(){
    patchSelectors();
    patchHomeStats();
    if(qs('#page-homes.active')) renderHomesSafe(true);
    if(qs('#page-assets.active')){ try{ window.renderAssets && window.renderAssets(); }catch(e){} }
    if(qs('#page-aisha.active')){ try{ window.renderCharPage && window.renderCharPage('aisha'); }catch(e){} }
    syncAishaAvatar();
  }

  function install(){
    ensureState();
    seedAishaAssets();
    ensureLogo();
    ensureAishaPage();
    ensureAishaNav();
    patchNav();
    patchSelectors();
    patchRenderAssets();
    patchHomeStats();
    syncAishaAvatar();
    if(!window.__v398InitialRenderDone){
      window.__v398InitialRenderDone = true;
      setTimeout(rerenderIfNeeded, 60);
      setTimeout(rerenderIfNeeded, 240);
      setTimeout(rerenderIfNeeded, 900);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.addEventListener('load', function(){ setTimeout(install, 50); setTimeout(rerenderIfNeeded, 150); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(rerenderIfNeeded, 80); });
})();
