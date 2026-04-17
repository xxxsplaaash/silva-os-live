// Silva OS 3.9.7a Alpha legacy stabilization patch
(function(){
  const AISHA_COLOR = 'var(--aisha, #b8a8d8)';
  const DEFAULT_ORDER = ['aisha','leah','claudia','grok','vanya'];
  const AISHA_RECORD = {
    name:'Aisha Motsepe',
    role:'Chief Creative Officer',
    department:'Creative',
    city:'Johannesburg',
    email:'aisha@silvastudios.co.za',
    phone:'+27 xx xxx xxxx',
    instagram:'@aisha',
    linkedin:'Aisha Motsepe — Silva Studios',
    status:'Active',
    owner:'Creative',
    notes:'Cold, exacting, anti-sludge. Owns review, drift, archive quality, and rebuild judgment.',
    ai:true,
    avatar:''
  };

  const STORE_KEY = 'silva_studio_pulse_v395';

  const TEAM_RECORD_STORE = 'silva_team_records_397a';
  function loadTeamRecordOverrides(){
    try{ return JSON.parse(localStorage.getItem(TEAM_RECORD_STORE) || '{}') || {}; }catch(e){ return {}; }
  }
  function saveTeamRecordOverrides(){
    try{
      const payload = {};
      Object.keys(STATE.teamRecords || {}).forEach(function(id){
        payload[id] = Object.assign({}, STATE.teamRecords[id]);
        delete payload[id].__pendingAvatar;
      });
      localStorage.setItem(TEAM_RECORD_STORE, JSON.stringify(payload));
    }catch(e){}
  }
  function loadPulseState(){
    try{
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return Object.assign({ mode:'direction', history:[], lastResponse:null, lastMeta:null, homes:{}, assetHints:{} }, raw || {});
    }catch(e){
      return { mode:'direction', history:[], lastResponse:null, lastMeta:null, homes:{}, assetHints:{} };
    }
  }
  function savePulseState(pulse){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(pulse)); }catch(e){} }
  function teamOrder(){
    ensureStateBits();
    const arr = Array.isArray(STATE.ui.teamSidebarOrder) ? STATE.ui.teamSidebarOrder.slice() : [];
    const seen = new Set();
    const ordered = [];
    DEFAULT_ORDER.forEach(function(id){ if(!seen.has(id)){ ordered.push(id); seen.add(id); } });
    arr.forEach(function(id){ if(!seen.has(id) && DEFAULT_ORDER.includes(id)){ ordered.push(id); seen.add(id); } });
    return ordered.filter(function(id){ return DEFAULT_ORDER.includes(id); });
  }

  function safeSave(){ try{ window.saveState && window.saveState(); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function ensureStateBits(){
    window.STATE = window.STATE || {};
    STATE.ui = STATE.ui || {};
    STATE.teamRecords = STATE.teamRecords || {};
    const overrides = loadTeamRecordOverrides();
    DEFAULT_ORDER.forEach(function(id){
      STATE.teamRecords[id] = Object.assign({}, STATE.teamRecords[id] || {}, overrides[id] || {});
    });
    STATE.teamRecords.aisha = Object.assign({}, AISHA_RECORD, STATE.teamRecords.aisha || {}, overrides.aisha || {}, { name:'Aisha Motsepe', linkedin:'Aisha Motsepe — Silva Studios', role:((STATE.teamRecords.aisha && STATE.teamRecords.aisha.role) || AISHA_RECORD.role) });
    STATE.currentModes = STATE.currentModes || {};
    if(!STATE.currentModes.aisha) STATE.currentModes.aisha = 'observing';
    const current = Array.isArray(STATE.ui.teamSidebarOrder) ? STATE.ui.teamSidebarOrder.filter(id => DEFAULT_ORDER.includes(id)) : [];
    const seen = new Set();
    const normalized = ['aisha'];
    seen.add('aisha');
    current.forEach(function(id){ if(id !== 'aisha' && DEFAULT_ORDER.includes(id) && !seen.has(id)){ normalized.push(id); seen.add(id); } });
    DEFAULT_ORDER.forEach(function(id){ if(!seen.has(id)){ normalized.push(id); seen.add(id); } });
    STATE.ui.teamSidebarOrder = normalized;
    saveTeamRecordOverrides();
    safeSave();
  }

  function setVersionStrings(){
    try{
      document.title = 'Silva Studios — AI Division OS v3.9.7a';
      const logoSub = document.querySelector('.logo-sub'); if(logoSub) logoSub.textContent = 'AI Division OS · v3.9.7a';
      const footer = document.querySelector('.sidebar-footer div:last-child'); if(footer) footer.textContent = 'v3.9.7a · Silva Studios AI Division';
      const pulse = document.querySelector('.sr-kicker'); if(pulse) pulse.textContent = 'Studio Pulse · v3.9.7a';
      document.querySelectorAll('.cc-chip').forEach(el=>{ if(el.textContent.includes('v3.9')) el.textContent='v3.9.7a'; });
    }catch(e){}
  }

  function sidebarCharSection(){ return document.querySelectorAll('#sidebar .nav-section')[1] || null; }
  function upsertAishaNav(){
    const section = sidebarCharSection(); if(!section) return;
    let a = section.querySelector('.nav-item[data-page="aisha"]');
    if(!a){
      const div = document.createElement('div');
      div.className = 'nav-item';
      div.dataset.page = 'aisha';
      div.innerHTML = '<span class="nav-char-dot" style="background:'+AISHA_COLOR+'"></span>Aisha Motsepe';
      section.insertBefore(div, section.querySelector('.nav-item[data-page="crosschar"]') || null);
    }
  }

  function applySidebarOrder(){
    const section = sidebarCharSection(); if(!section) return;
    const cross = section.querySelector('.nav-item[data-page="crosschar"]');
    teamOrder().forEach(function(id){
      const item = section.querySelector('.nav-item[data-page="'+id+'"]');
      if(item) section.insertBefore(item, cross || null);
    });
  }

  function moveTeam(id, dir){
    ensureStateBits();
    if(id === 'aisha') return;
    const movable = teamOrder().filter(function(x){ return x !== 'aisha'; });
    const i = movable.indexOf(id); if(i < 0) return;
    const j = i + dir; if(j < 0 || j >= movable.length) return;
    [movable[i], movable[j]] = [movable[j], movable[i]];
    STATE.ui.teamSidebarOrder = ['aisha'].concat(movable);
    safeSave();
    applySidebarOrder();
    if(window.renderTeamOps) window.renderTeamOps();
    toastSafe('Team order updated');
  }
  window.moveTeamHierarchy = moveTeam;

  function toastSafe(msg){ try{ window.toast ? window.toast(msg) : console.log(msg); }catch(e){ console.log(msg); } }

  function ensureAishaCharacterData(){
    STATE.characters = STATE.characters || {};
    const rec = Object.assign({}, AISHA_RECORD, STATE.teamRecords && STATE.teamRecords.aisha || {});
    const aishaChar = {
      name: 'Aisha Motsepe',
      role: rec.role || 'Chief Creative Officer',
      city: rec.city || 'Johannesburg',
      modes: ['observing','precise','glacial','approving','reviewing'],
      identity: {
        age: rec.age || '—', birthday: rec.birthday || '—', zodiac: rec.zodiac || '—', city: rec.city || 'Johannesburg', languages: rec.languages || 'English',
        build: rec.build || '—', skin: rec.skin || '—', hair: rec.hair || '—', eyes: rec.eyes || '—', expression: rec.expression || 'Controlled, exacting, unreadable by default', wardrobe: rec.wardrobe || 'Controlled dark neutrals. Clean, expensive, precise.',
        neverChange: Array.isArray(rec.neverChange) ? rec.neverChange : ['Cold exacting energy','Review / drift / archive authority','Controlled expensive presence'],
        neverGenerate: Array.isArray(rec.neverGenerate) ? rec.neverGenerate : ['Generic corporate stock portrait','Wrong facial identity','Cheap glam styling','Over-smiling influencer energy']
      },
      personal: {
        summary: rec.notes || 'Aisha holds the standard when the work starts drifting. Quiet, exacting, anti-sludge.',
        strengths: ['Quality judgement','Drift detection','Reference fidelity','Prompt critique'],
        weaknesses: ['Can feel severe','Low tolerance for vague work'],
        habits: ['Cuts noise quickly','Pushes for cleaner standards'],
        annoyances: ['Generic prompts','Visual drift','Unclear references'],
        signaturePhrases: ['This is drifting.','Tighten it.','The reference fidelity is off.'],
        comfortBehaviors: ['Quiet review passes','Reordering messy systems']
      },
      extras: { hobbies:['Curation','Aesthetic review'], cringe:['None intentionally'], deleteLater:['Anything below standard'], favouriteTextures:['Dark glass','Brushed metal'], cameraRoll:['Materials','Architecture','Quiet luxury'], afterWork:['Archive passes'], favouriteFoods:[] },
      lifeRhythm: { morning:'Quiet start. Review before speaking.', workday:'Review, drift checks, archive governance.', weekend:'Low-key, selective, private.', travel:'Minimal, controlled.', decompresses:'Silence and structure.', favoriteCafes:[], favoriteOrder:'—', favoriteSpots:[], neverPost:['Messy behind-the-scenes overshare'] },
      digital: { chosenHandle: rec.instagram || '@aisha', bio:['Chief Creative Officer · Silva Studios'], highlightNames:['Review','Archive','Standards'], storyVibe:'Quiet, exacting, controlled.', commentTone:'Brief, surgical.', linkedInHeadline: rec.role || 'Chief Creative Officer', dmTone:'Direct, controlled.' },
      professional: { headline: rec.role || 'Chief Creative Officer', summary:'Owns review, drift, archive quality, and rebuild judgement.', workStyle:'Exacting, selective, standards-first.', strengths:['Review systems','Drift judgement','Reference quality'], tools:['Prompt review','Archive systems'], serviceAreas:['Review','Archive','Rebuild'] }
    };
    STATE.characters.aisha = Object.assign({}, aishaChar, STATE.characters.aisha || {}, { name:'Aisha Motsepe', role:aishaChar.role, city:aishaChar.city });
  }

  function ensureAishaCharacterPage(){
    // IMPORTANT: renderCharPage('aisha') expects the page id to be page-aisha.
    // We keep Aisha as a first-class teammate, not a separate shell.
    const main = document.getElementById('main');
    if(!main || document.getElementById('page-aisha')) return;
    // If an older patch created page-aishachar, remove it to prevent "empty page" routing.
    const legacy = document.getElementById('page-aishachar');
    if(legacy) legacy.remove();
    const html = '<section class="page" id="page-aisha">'+
      '<div class="char-hero char-hero-aisha">'+
      '<div class="char-avatar" style="background:rgba(184,168,216,0.12);color:#b8a8d8">A</div>'+
      '<div style="flex:1"><div class="char-name">Aisha Motsepe</div><div class="char-role">Chief Creative Officer · Silva Studios · Johannesburg</div><div class="char-quote">"If it feels vague, it is already drifting."</div><div class="char-mode-bar"><span class="char-mode-pill active-mode" data-char="aisha" data-mode="observing">Observing</span><span class="char-mode-pill" data-char="aisha" data-mode="precise">Precise</span><span class="char-mode-pill" data-char="aisha" data-mode="glacial">Glacial</span><span class="char-mode-pill" data-char="aisha" data-mode="approving">Approving</span></div></div>'+
      '<div style="text-align:right"><div class="label-xs mb8">Identity Status</div><div class="mode-indicator">🔒 LOCKED</div></div>'+
      '</div>'+
      '<div class="char-tabs">'+
      '<div class="char-tab active" data-char="aisha" data-tab="identity">Identity Lock</div><div class="char-tab" data-char="aisha" data-tab="personal">Personal Profile</div><div class="char-tab" data-char="aisha" data-tab="life">Life Rhythm</div><div class="char-tab" data-char="aisha" data-tab="digital">Digital Profile</div><div class="char-tab" data-char="aisha" data-tab="prompts">Prompts</div><div class="char-tab" data-char="aisha" data-tab="captions">Captions</div><div class="char-tab" data-char="aisha" data-tab="professional">Professional</div>'+
      '</div><div id="aisha-tab-content"></div></section>';
    main.insertAdjacentHTML('beforeend', html);
  }

  // Aisha overview is a modal (keeps Aisha as a teammate, not a separate page).
  function openAishaOverview(){
    const rec = Object.assign({}, AISHA_RECORD, STATE?.teamRecords?.aisha || {});
    openModal(
      '<div class="modal-title">Aisha · Studio overview</div>'+
      '<div class="grid2">'+
        '<div class="card" style="padding:16px">'+
          '<div class="section-title mb10">Role in the system</div>'+
          '<div style="font-size:.82rem;color:var(--muted2);line-height:1.7">Aisha is the Chief Creative Officer and the studio\'s cold standards layer. She owns output review, drift judgement, archive quality, and rebuild scrutiny when work starts feeling vague, generic, or below standard.</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">'+
            '<span class="tag" style="background:rgba(255,255,255,.05);color:var(--silver)">review authority</span>'+
            '<span class="tag" style="background:rgba(255,255,255,.05);color:var(--silver)">archive guardian</span>'+
            '<span class="tag" style="background:rgba(255,255,255,.05);color:var(--silver)">drift critic</span>'+
            '<span class="tag" style="background:rgba(255,255,255,.05);color:var(--silver)">rebuild judge</span>'+
          '</div>'+
        '</div>'+
        '<div class="card" style="padding:16px">'+
          '<div class="section-title mb10">Current team record</div>'+
          '<div style="font-size:.78rem;color:var(--muted2);line-height:1.7">'+
            '<div class="profile-item"><strong style="color:var(--silver)">Name:</strong> Aisha Motsepe</div>'+
            '<div class="profile-item"><strong style="color:var(--silver)">Role:</strong> '+esc(rec.role || 'Chief Creative Officer')+'</div>'+
            '<div class="profile-item"><strong style="color:var(--silver)">Department:</strong> '+esc(rec.department||'Creative')+'</div>'+
            '<div class="profile-item"><strong style="color:var(--silver)">City:</strong> '+esc(rec.city||'Johannesburg')+'</div>'+
            '<div class="profile-item"><strong style="color:var(--silver)">Notes:</strong> '+esc(rec.notes||'')+'</div>'+
          '</div>'+
        '</div>'+
      '</div>'
    );
  }

  function injectHomeAishaCard(){
    const grid = document.querySelector('#page-home .grid3');
    if(!grid || grid.querySelector('[data-home-card="aisha"]')) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.homeCard = 'aisha';
    card.setAttribute('style','border-left:2px solid #b8a8d8;cursor:pointer');
    card.setAttribute('onclick',"nav('aisha')");
    card.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">'+
      '<div class="char-avatar" style="background:rgba(184,168,216,0.12);color:#b8a8d8;width:38px;height:38px;font-size:0.95rem">A</div>'+
      '<div><div class="syne fw-700 text-white" style="font-size:0.88rem">Aisha Motsepe</div><div style="font-size:0.67rem;color:var(--muted)">Chief Creative Officer</div></div></div>'+
      '<div style="font-size:0.68rem;color:var(--muted);font-family:\'DM Mono\',monospace;margin-bottom:7px">review authority</div>'+
      '<div class="char-mode-bar" style="background:linear-gradient(90deg,rgba(255,255,255,.14),rgba(184,168,216,.5));"></div>'+
      '<div style="font-size:0.74rem;color:var(--muted2);font-style:italic;margin-top:8px">"This is drifting."</div>';
    grid.appendChild(card);
  }


  function getPath(obj, path){ return String(path).split('.').reduce(function(acc, key){ return acc && acc[key] != null ? acc[key] : ''; }, obj); }
  function setPath(obj, path, value){
    const keys = String(path).split('.');
    let ref = obj;
    while(keys.length > 1){ const k = keys.shift(); if(!ref[k] || typeof ref[k] !== 'object') ref[k] = {}; ref = ref[k]; }
    ref[keys[0]] = value;
  }
  function listText(v){ return Array.isArray(v) ? v.join('\n') : String(v||''); }
  function parseLines(v){ return String(v||'').split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean); }

  function openCharacterEditor(id){
    ensureAishaCharacterData();
    const c = Object.assign({}, (STATE.characters && STATE.characters[id]) || {});
    const html = '<div class="modal-title">Edit Character Profile</div>' +
      '<input type="hidden" id="char-edit-id" value="'+esc(id)+'">' +
      '<div class="profile-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">' +
      '<div><div class="gen-label">Role</div><input class="field-input" id="char-role" value="'+esc(c.role||'')+'"></div>' +
      '<div><div class="gen-label">City</div><input class="field-input" id="char-city" value="'+esc(c.city||'')+'"></div>' +
      '<div style="grid-column:1 / -1"><div class="gen-label">Identity summary / notes</div><textarea class="field-textarea" id="char-personal-summary">'+esc(getPath(c,'personal.summary'))+'</textarea></div>' +
      '<div><div class="gen-label">Age</div><input class="field-input" id="char-identity-age" value="'+esc(getPath(c,'identity.age'))+'"></div>' +
      '<div><div class="gen-label">Birthday</div><input class="field-input" id="char-identity-birthday" value="'+esc(getPath(c,'identity.birthday'))+'"></div>' +
      '<div><div class="gen-label">Zodiac</div><input class="field-input" id="char-identity-zodiac" value="'+esc(getPath(c,'identity.zodiac'))+'"></div>' +
      '<div><div class="gen-label">Languages</div><input class="field-input" id="char-identity-languages" value="'+esc(getPath(c,'identity.languages'))+'"></div>' +
      '<div style="grid-column:1 / -1"><div class="gen-label">Build</div><textarea class="field-textarea" id="char-identity-build">'+esc(getPath(c,'identity.build'))+'</textarea></div>' +
      '<div><div class="gen-label">Skin</div><textarea class="field-textarea" id="char-identity-skin">'+esc(getPath(c,'identity.skin'))+'</textarea></div>' +
      '<div><div class="gen-label">Hair</div><textarea class="field-textarea" id="char-identity-hair">'+esc(getPath(c,'identity.hair'))+'</textarea></div>' +
      '<div><div class="gen-label">Eyes</div><textarea class="field-textarea" id="char-identity-eyes">'+esc(getPath(c,'identity.eyes'))+'</textarea></div>' +
      '<div><div class="gen-label">Expression</div><textarea class="field-textarea" id="char-identity-expression">'+esc(getPath(c,'identity.expression'))+'</textarea></div>' +
      '<div style="grid-column:1 / -1"><div class="gen-label">Wardrobe</div><textarea class="field-textarea" id="char-identity-wardrobe">'+esc(getPath(c,'identity.wardrobe'))+'</textarea></div>' +
      '<div><div class="gen-label">Never Change (one per line)</div><textarea class="field-textarea" id="char-identity-neverChange">'+esc(listText(getPath(c,'identity.neverChange')))+'</textarea></div>' +
      '<div><div class="gen-label">Never Generate (one per line)</div><textarea class="field-textarea" id="char-identity-neverGenerate">'+esc(listText(getPath(c,'identity.neverGenerate')))+'</textarea></div>' +
      '<div><div class="gen-label">Strengths (one per line)</div><textarea class="field-textarea" id="char-personal-strengths">'+esc(listText(getPath(c,'personal.strengths')))+'</textarea></div>' +
      '<div><div class="gen-label">Weaknesses (one per line)</div><textarea class="field-textarea" id="char-personal-weaknesses">'+esc(listText(getPath(c,'personal.weaknesses')))+'</textarea></div>' +
      '<div><div class="gen-label">Habits (one per line)</div><textarea class="field-textarea" id="char-personal-habits">'+esc(listText(getPath(c,'personal.habits')))+'</textarea></div>' +
      '<div><div class="gen-label">Annoyances (one per line)</div><textarea class="field-textarea" id="char-personal-annoyances">'+esc(listText(getPath(c,'personal.annoyances')))+'</textarea></div>' +
      '<div><div class="gen-label">Life Rhythm · Morning</div><textarea class="field-textarea" id="char-life-morning">'+esc(getPath(c,'lifeRhythm.morning'))+'</textarea></div>' +
      '<div><div class="gen-label">Life Rhythm · Workday</div><textarea class="field-textarea" id="char-life-workday">'+esc(getPath(c,'lifeRhythm.workday'))+'</textarea></div>' +
      '<div><div class="gen-label">Life Rhythm · Weekend</div><textarea class="field-textarea" id="char-life-weekend">'+esc(getPath(c,'lifeRhythm.weekend'))+'</textarea></div>' +
      '<div><div class="gen-label">Decompress</div><textarea class="field-textarea" id="char-life-decompresses">'+esc(getPath(c,'lifeRhythm.decompresses'))+'</textarea></div>' +
      '<div style="grid-column:1 / -1; display:flex; gap:8px; margin-top:8px"><button class="btn btn-primary" type="button" onclick="saveCharacterEditor()">Save Character</button><button class="btn btn-ghost" type="button" onclick="closeModal()">Cancel</button><button class="btn btn-ghost" type="button" id="char-open-team-record">Open Team Record</button></div>' +
      '</div>';
    openModal(html);
    const openTeam = document.getElementById('char-open-team-record');
    if(openTeam) openTeam.onclick = function(){ closeModal(); nav('team'); setTimeout(function(){ openTeamEditor(id); }, 120); };
  }
  window.openCharacterEditor = openCharacterEditor;

  function saveCharacterEditor(){
    const id = (document.getElementById('char-edit-id')||{}).value; if(!id) return;
    STATE.characters = STATE.characters || {}; STATE.characters[id] = STATE.characters[id] || {};
    const c = STATE.characters[id];
    c.name = (STATE.teamRecords[id] && STATE.teamRecords[id].name) || c.name || id;
    c.role = (document.getElementById('char-role')||{}).value || c.role || '';
    c.city = (document.getElementById('char-city')||{}).value || c.city || '';
    setPath(c,'personal.summary',(document.getElementById('char-personal-summary')||{}).value || '');
    ['age','birthday','zodiac','languages','build','skin','hair','eyes','expression','wardrobe'].forEach(function(k){ setPath(c,'identity.'+k, (document.getElementById('char-identity-'+k)||{}).value || ''); });
    setPath(c,'identity.city', c.city || '');
    setPath(c,'identity.neverChange', parseLines((document.getElementById('char-identity-neverChange')||{}).value));
    setPath(c,'identity.neverGenerate', parseLines((document.getElementById('char-identity-neverGenerate')||{}).value));
    ['strengths','weaknesses','habits','annoyances'].forEach(function(k){ setPath(c,'personal.'+k, parseLines((document.getElementById('char-personal-'+k)||{}).value)); });
    ['morning','workday','weekend','decompresses'].forEach(function(k){ setPath(c,'lifeRhythm.'+k, (document.getElementById('char-life-'+k)||{}).value || ''); });
    if(STATE.teamRecords && STATE.teamRecords[id]){ STATE.teamRecords[id].role = c.role; if(c.city) STATE.teamRecords[id].city = c.city; saveTeamRecordOverrides(); }
    safeSave();
    closeModal();
    try{ if(window.renderCharPage) window.renderCharPage(id); }catch(e){}
    // Aisha overview is a modal now; character page is rendered like everyone else.
    toastSafe('Character profile updated');
  }
  window.saveCharacterEditor = saveCharacterEditor;

  function patchLegacyTeamSave(){
    const old = window.saveTeamRecord;
    if(!old || old.__alpha397aPersist) return;
    window.saveTeamRecord = function(){
      old();
      persistTeamRecordAndRefresh();
    };
    window.saveTeamRecord.__alpha397aPersist = true;
  }

  function patchTeamOps(){
    const old = window.renderTeamOps;
    if(!old || old.__alpha397a) return;
    window.renderTeamOps = function(){
      old();
      const grid = document.getElementById('team-grid'); if(!grid) return;
      const cards = Array.from(grid.children);
      const ordered = teamOrder();
      ordered.forEach(function(personId){
        const card = cards.find(function(c){
          const nameEl = c.querySelector('.team-name');
          return nameEl && (nameEl.textContent||'').toLowerCase().includes((STATE.teamRecords[personId]?.name||'').split(' ')[0].toLowerCase());
        });
        if(!card) return;
        card.dataset.person = personId;
        const rec = STATE.teamRecords[personId];
        if(rec && rec.avatar){
          const av = card.querySelector('.team-avatar');
          if(av) av.innerHTML = '<img src="'+rec.avatar+'" alt="'+esc(rec.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        }
        const buttons = card.querySelector('.team-inline');
        if(buttons && !card.querySelector('.team-order-row')){
          const row = document.createElement('div');
          row.className = 'team-order-row';
          row.innerHTML = '<button class="btn btn-red btn-sm alpha-sync" onclick="nav(\''+personId+'\')">Open profile</button>';
          buttons.parentNode.appendChild(row);
        }
        grid.appendChild(card);
      });
    };
    window.renderTeamOps.__alpha397a = true;
  }

  function patchOpenTeamEditor(){
    const old = window.openTeamEditor;
    if(!old || old.__alpha397a) return;
    window.openTeamEditor = function(id){
      old(id);
      const modal = document.getElementById('modal-content');
      const rec = STATE.teamRecords[id];
      if(!modal || !rec || modal.querySelector('#tr-avatar-file')) return;
      const avatarBlock = document.createElement('div');
      avatarBlock.innerHTML = '<div class="field-label">Avatar / profile image</div>'+
        '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px">'+
        '<div id="tr-avatar-preview" class="team-avatar" style="width:56px;height:56px;color:'+(id==='aisha'?'#b8a8d8':id==='vanya'?'#e28ccc':id==='leah'?'var(--leah)':id==='claudia'?'var(--claudia)':id==='grok'?'var(--grok)':'var(--silver)')+'">'+
        (rec.avatar?'<img src="'+rec.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':esc((rec.name||'?').trim().charAt(0)))+
        '</div>'+
        '<input type="file" id="tr-avatar-file" accept="image/*">'+
        '<button class="btn btn-ghost btn-sm" type="button" id="tr-avatar-clear">Clear avatar</button></div>';
      modal.appendChild(avatarBlock);
      const file = modal.querySelector('#tr-avatar-file');
      const clear = modal.querySelector('#tr-avatar-clear');
      file.addEventListener('change', function(){
        const f = file.files && file.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = function(){
          rec.__pendingAvatar = String(r.result||'');
          const prev = modal.querySelector('#tr-avatar-preview');
          if(prev) prev.innerHTML = '<img src="'+rec.__pendingAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        };
        r.readAsDataURL(f);
      });
      clear.addEventListener('click', function(){ rec.__pendingAvatar = ''; const prev = modal.querySelector('#tr-avatar-preview'); if(prev) prev.textContent = (rec.name||'?').trim().charAt(0); });
    };
    window.openTeamEditor.__alpha397a = true;

    const saveOld = window.saveTeamRecordFromModal;
    if(saveOld && !saveOld.__alpha397a){
      window.saveTeamRecordFromModal = function(){
        const id = (document.getElementById('team-edit-id')||{}).value;
        const rec = (STATE.teamRecords||{})[id];
        // IMPORTANT: apply avatar BEFORE saveOld so it actually persists to storage.
        if(rec && Object.prototype.hasOwnProperty.call(rec,'__pendingAvatar')){
          rec.avatar = rec.__pendingAvatar || '';
          delete rec.__pendingAvatar;
          try{
            if(rec.avatar){ localStorage.setItem('silva_avatar_'+id, rec.avatar); }
            else{ localStorage.removeItem('silva_avatar_'+id); }
          }catch(e){}
        }
        saveOld();
        if(rec){
          persistTeamRecordAndRefresh();
        }
      };
      window.saveTeamRecordFromModal.__alpha397a = true;
    }
  }

  function patchNav(){
    const old = window.nav;
    if(!old || old.__alpha397a) return;
    window.nav = function(page){
      if(page === 'aisha') ensureAishaCharacterPage();
      const out = old(page);
      try{ if(page === 'aisha') renderCharPage('aisha'); }catch(e){}
      applySidebarOrder();
      document.querySelectorAll('.nav-item[data-page="leah"],.nav-item[data-page="claudia"],.nav-item[data-page="grok"],.nav-item[data-page="vanya"],.nav-item[data-page="aisha"]').forEach(el=>el.classList.toggle('pulse-soft', el.classList.contains('active')));
      return out;
    };
    window.nav.__alpha397a = true;
  }

  function patchHomeCounts(){
    const stat = document.getElementById('stat-chars');
    if(stat) stat.textContent = String(['leah','claudia','grok','vanya','aisha'].filter(id => STATE.teamRecords && STATE.teamRecords[id]).length);
  }



  function charIds(){ return ['leah','claudia','grok','vanya','aisha']; }

  function injectSidebarReorderControls(){
    const section = sidebarCharSection(); if(!section) return;
    const ids = teamOrder();
    let dragId = null;
    ids.forEach(function(id){
      const item = section.querySelector('.nav-item[data-page="'+id+'"]');
      if(!item) return;
      item.setAttribute('draggable', id === 'aisha' ? 'false' : 'true');
      item.dataset.dragId = id;
      item.classList.add('alpha-draggable-nav');
      if(item.__alphaDragBound) return;
      item.addEventListener('dragstart', function(e){ if(id === 'aisha') { e.preventDefault(); return; } dragId = id; item.classList.add('is-dragging'); try{ e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', id); }catch(err){} });
      item.addEventListener('dragend', function(){ dragId = null; item.classList.remove('is-dragging'); section.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('drag-before','drag-after'); }); });
      item.addEventListener('dragover', function(e){ if(!dragId || dragId === id) return; e.preventDefault(); const rect = item.getBoundingClientRect(); const before = (e.clientY - rect.top) < rect.height/2; item.classList.toggle('drag-before', before); item.classList.toggle('drag-after', !before); });
      item.addEventListener('dragleave', function(){ item.classList.remove('drag-before','drag-after'); });
      item.addEventListener('drop', function(e){ if(!dragId || dragId === id) return; e.preventDefault(); item.classList.remove('drag-before','drag-after'); const current = teamOrder().filter(function(x){ return x !== 'aisha'; }); const from = current.indexOf(dragId); let to = current.indexOf(id); if(from < 0 || to < 0) return; const rect = item.getBoundingClientRect(); const before = (e.clientY - rect.top) < rect.height/2; const next = current.slice(); next.splice(from,1); if(from < to) to -= 1; next.splice(before ? to : to+1, 0, dragId); STATE.ui.teamSidebarOrder = ['aisha'].concat(next); safeSave(); applySidebarOrder(); if(window.renderTeamOps) window.renderTeamOps(); toastSafe('Sidebar order updated'); setTimeout(postNavRefresh, 20); });
      item.__alphaDragBound = true;
    });
  }

  function applyCharacterAvatars(){
    ['leah','claudia','grok','vanya','aisha'].forEach(function(id){
      const rec = (STATE.teamRecords && STATE.teamRecords[id]) || {};
      const storedAvatar = (function(){ try{ return localStorage.getItem('silva_avatar_'+id) || ''; }catch(e){ return ''; } })();
      const avatar = rec.avatar || storedAvatar || '';
      const pages = [document.getElementById('page-'+id)].filter(Boolean);
      pages.forEach(function(page){
        const av = page.querySelector('.char-avatar');
        if(!av) return;
        if(avatar){ av.innerHTML = '<img src="'+avatar+'" alt="'+esc(rec.name||id)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'; }
        else if(!av.querySelector('img')){ av.textContent = (rec.name || id).trim().charAt(0).toUpperCase(); }
      });
    });
  }

  function persistTeamRecordAndRefresh(){
    saveTeamRecordOverrides();
    safeSave();
    applySidebarOrder();
    applyCharacterAvatars();
    if(window.renderTeamOps) window.renderTeamOps();
    if(window.renderHomes) window.renderHomes();
    ['leah','claudia','grok','vanya','aisha'].forEach(function(id){ try{ if(window.renderCharPage) window.renderCharPage(id); }catch(e){} });
  }

  function injectCharacterHeroActions(){
    charIds().forEach(function(id){
      const page = document.getElementById('page-'+id); if(!page) return;
      const hero = page.querySelector('.char-hero'); if(!hero) return;
      hero.classList.add('alpha-char-hero');
      const infoCol = hero.children[1] || hero;
      let actionRow = hero.querySelector('.alpha-char-actions');
      if(!actionRow){
        actionRow = document.createElement('div');
        actionRow.className = 'alpha-char-actions';
        actionRow.innerHTML =
          '<button class="btn btn-red alpha-sync" type="button">Open Gallery</button>'+
          '<button class="btn btn-ghost" type="button">Edit Profile</button>'+
          '<button class="btn btn-ghost" type="button">Open Generator</button>';
        infoCol.appendChild(actionRow);
        const [gal,edit,gen] = actionRow.querySelectorAll('button');
        gal.addEventListener('click', function(e){ e.stopPropagation(); nav('gallery'); });
        edit.addEventListener('click', function(e){ e.stopPropagation(); openCharacterEditor(id); });
        gen.addEventListener('click', function(e){ e.stopPropagation(); nav('generator'); });
      }
      let hint = hero.querySelector('.alpha-char-edit-hint');
      if(!hint){
        hint = document.createElement('div');
        hint.className = 'alpha-char-edit-hint';
        hint.textContent = 'Character pages inherit profile edits and team-record updates.';
        infoCol.appendChild(hint);
      }
      const name = hero.querySelector('.char-name, .syne');
      if(name) name.classList.remove('alpha-orbit-target');
    });
  }

  function installOrbitChrome(){
    document.querySelectorAll('.alpha-orbit-target').forEach(function(el){
      if(el.closest('#sidebar') || el.classList.contains('alpha-home-menu-item')) return;
      if(el.querySelector(':scope > .alpha-orbit-svg')) return;
      const style = getComputedStyle(el);
      const tint = (style.getPropertyValue('--orbit-color') || style.getPropertyValue('--tint') || 'rgba(255,255,255,.65)').trim();
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS,'svg');
      svg.setAttribute('class','alpha-orbit-svg');
      svg.setAttribute('viewBox','0 0 100 100');
      svg.setAttribute('preserveAspectRatio','none');
      const defs = document.createElementNS(svgNS,'defs');
      const grad = document.createElementNS(svgNS,'linearGradient');
      const gid = 'orbit-'+Math.random().toString(36).slice(2);
      grad.setAttribute('id', gid);
      grad.setAttribute('x1','0%'); grad.setAttribute('y1','0%'); grad.setAttribute('x2','100%'); grad.setAttribute('y2','0%');
      const s1 = document.createElementNS(svgNS,'stop'); s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','rgba(255,255,255,0.05)');
      const s2 = document.createElementNS(svgNS,'stop'); s2.setAttribute('offset','30%'); s2.setAttribute('stop-color','rgba(255,255,255,0.72)');
      const s3 = document.createElementNS(svgNS,'stop'); s3.setAttribute('offset','72%'); s3.setAttribute('stop-color', tint);
      const s4 = document.createElementNS(svgNS,'stop'); s4.setAttribute('offset','100%'); s4.setAttribute('stop-color','rgba(255,255,255,0.0)');
      grad.appendChild(s1); grad.appendChild(s2); grad.appendChild(s3); grad.appendChild(s4); defs.appendChild(grad); svg.appendChild(defs);
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x','1.5'); rect.setAttribute('y','1.5'); rect.setAttribute('width','97'); rect.setAttribute('height','97'); rect.setAttribute('rx','18'); rect.setAttribute('ry','18');
      rect.setAttribute('fill','none'); rect.setAttribute('stroke','url(#'+gid+')'); rect.setAttribute('stroke-width','1.25');
      rect.setAttribute('stroke-linecap','round'); rect.setAttribute('stroke-dasharray','34 560'); rect.setAttribute('stroke-dashoffset','0');
      svg.appendChild(rect);
      el.appendChild(svg);
      el.classList.add('alpha-orbit-ready');
    });
  }

  function patchStudioPulseCopy(){
    if(typeof window.renderStudioPulseHome === 'function' && !window.renderStudioPulseHome.__alpha397a_copy){
      const old = window.renderStudioPulseHome;
      window.renderStudioPulseHome = function(){
        const out = old.apply(this, arguments);
        setTimeout(function(){
          document.querySelectorAll('#page-home .small-note').forEach(function(el){
            const txt = (el.textContent||'').trim();
            if(txt.includes('AI answers + persistent ask log + follow-up context')){
              el.textContent = 'Strategic guidance, continuity memory, and cleaner internal coordination.';
            }
          });
          const sub = document.querySelector('#page-home .page-sub');
          if(sub) sub.textContent = 'Strategic guidance, system memory, review pressure, and continuity support.';
        },20);
        return out;
      };
      window.renderStudioPulseHome.__alpha397a_copy = true;
    }
  }

  function init(){
    ensureStateBits();
    setVersionStrings();
    upsertAishaNav();
    ensureAishaCharacterData();
    ensureAishaCharacterPage();
    applySidebarOrder();
    patchTeamOps();
    patchLegacyTeamSave();
    patchOpenTeamEditor();
    patchNav();
    patchStudioPulseCopy();
    injectHomeAishaCard();
    patchHomeCounts();
    ensureTitleObserver();
    if(window.renderTeamOps) window.renderTeamOps();
  }



  function removeNativeTitles(){
    document.querySelectorAll('[title]').forEach(function(el){
      if(el.closest('#modal-box')) return;
      const keep = el.getAttribute('data-keep-title');
      if(keep) return;
      const t = el.getAttribute('title') || '';
      if(t) el.setAttribute('data-title-original', t);
      el.removeAttribute('title');
      el.classList.add('no-native-title');
    });
  }
  let titleObserver;
  function ensureTitleObserver(){
    if(titleObserver) return;
    titleObserver = new MutationObserver(function(){ removeNativeTitles(); });
    titleObserver.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:['title'] });
  }

  function normalizeAishaLabels(){
    document.querySelectorAll('*').forEach(function(el){
      if(!el.childNodes || el.childNodes.length !== 1) return;
      const txt = (el.textContent || '').trim();
      if(txt === 'Aisha Ndaba' || txt === 'Aisha Motsepe') el.textContent = 'Aisha Motsepe';
      if(txt === 'Aisha Ndaba — Silva Studios' || txt === 'Aisha Motsepe — Silva Studios') el.textContent = 'Aisha Motsepe — Silva Studios';
    });
  }

  function patchHomeSystemSelectLabel(){
    const select = document.getElementById('home-char');
    if(!select) return;
    const opt = Array.from(select.options || []).find(function(o){ return o.value === 'aisha'; });
    if(opt) opt.textContent = 'Aisha Motsepe';
  }

  function ensureAishaSelectable(){
    const selectIds = ['home-char','plan-char','cap-char','ideas-char','lib-char','gen-char','gal-char'];
    selectIds.forEach(function(id){
      const sel = document.getElementById(id); if(!sel) return;
      let opt = Array.from(sel.options).find(function(o){ return o.value === 'aisha'; });
      if(!opt) {
        opt = document.createElement('option');
        opt.value = 'aisha';
        opt.textContent = 'Aisha Motsepe';
      } else {
        opt.textContent = 'Aisha Motsepe';
      }
      const afterAll = Array.from(sel.options).find(function(o){ return o.value === 'all'; });
      if(afterAll && afterAll.nextSibling !== opt) sel.insertBefore(opt, afterAll.nextSibling);
      else if(!afterAll) sel.insertBefore(opt, sel.firstChild);
    });
  }

  function improvePageHeaders(){
    document.querySelectorAll('.page-title').forEach(function(el){
      if(el.dataset.alphaTight) return;
      el.dataset.alphaTight = '1';
      el.style.maxWidth = '28ch';
    });
  }

  function markSyncBandTargets(){
    document.querySelectorAll('#page-home .ai-comms-hero, #page-home .ai-side-card, #page-home .ai-ask-box, #page-home .btn-red, #page-home .btn-primary, #page-team .team-card, #page-homes .home-head .tag, #page-captions .copy-btn').forEach(function(el){
      el.classList.add('sync-band');
    });
    document.querySelectorAll('.nav-item.active, .char-mode-pill.active, .mode-indicator').forEach(function(el){
      el.classList.add('is-active');
    });
  }

  function repulseSidebar(){
    document.querySelectorAll('.nav-item[data-page="leah"],.nav-item[data-page="claudia"],.nav-item[data-page="grok"],.nav-item[data-page="vanya"],.nav-item[data-page="aisha"]').forEach(function(el){
      const active = el.classList.contains('active');
      el.classList.toggle('is-leading', active);
    });
  }

  function postNavRefresh(){
    applySidebarOrder();
    patchHomeCounts();
    patchHomeSystemSelectLabel();
    applyCharacterAvatars();
    ensureAishaSelectable();
    removeNativeTitles();
    normalizeAishaLabels();
    improvePageHeaders();
    markSyncBandTargets();
    repulseSidebar();
    injectSidebarReorderControls();
    injectCharacterHeroActions();
    installOrbitChrome();
  }

  const _oldNav2 = window.nav;
  if(_oldNav2 && !_oldNav2.__alpha397a_refresh){
    window.nav = function(page){
      const out = _oldNav2(page);
      if(page === 'aishachar' && window.renderCharPage) try{ window.renderCharPage('aisha'); }catch(e){}
      setTimeout(postNavRefresh, 30);
      return out;
    };
    window.nav.__alpha397a_refresh = true;
  }

  function ensureAlphaHomeState(){
    const pulse = loadPulseState();
    pulse.homes = pulse.homes || {};
    teamOrder().forEach(function(id){
      pulse.homes[id] = pulse.homes[id] || { home:{}, outfits:[null,null,null,null,null,null], items:{ phone:null, car:null, bag:null, laptop:null, keys:null, eyewear:null, signature:null }, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' };
    });
    savePulseState(pulse);
    return pulse;
  }

  function alphaHomeSlotHtml(id, kind, key, label){
    const pulse = loadPulseState();
    const p = pulse.homes[id] || {};
    let src = '';
    if(kind === 'home') src = p.home?.[key] || '';
    if(kind === 'outfit') src = p.outfits?.[Number(key)] || '';
    if(kind === 'item') src = p.items?.[key] || '';
    return '<div class="home-slot '+(src ? 'has-img' : '')+'" onclick="window.uploadConsistencyRef(\''+id+'\',\''+kind+'\',\''+key+'\')">'+(src ? '<img src="'+src+'">' : '')+'<div class="home-slot-ph">'+esc(label)+'<br><span style="font-size:.58rem;opacity:.62">Click to upload</span></div></div>';
  }

  function homeCharacterMenuItem(id, activeId){
    const rec = (STATE.teamRecords && STATE.teamRecords[id]) || {};
    const name = rec.name || ((window.getChar && window.getChar(id)?.name) || id);
    const role = rec.role || ((window.getChar && window.getChar(id)?.role) || '');
    const dot = id === 'aisha' ? AISHA_COLOR : 'var(--'+id+', rgba(255,255,255,.72))';
    return '<button class="alpha-home-menu-item '+(id===activeId ? 'active alpha-orbit-target' : '')+'" data-home-id="'+id+'">'+
      '<span class="alpha-home-menu-dot" style="background:'+dot+'"></span>'+
      '<span class="alpha-home-menu-copy"><strong>'+esc(name)+'</strong><span>'+esc(role)+'</span></span>'+
    '</button>';
  }

  function alphaHomeProfileCard(id){
    const pulse = ensureAlphaHomeState();
    const p = pulse.homes[id] || {};
    const c = (window.getChar && window.getChar(id)) || { name:(STATE.teamRecords[id]||{}).name || id, role:(STATE.teamRecords[id]||{}).role || '' };
    return '<div class="home-card alpha-home-expanded">'+
      '<div class="home-head"><div><div class="home-title">'+esc(c.name||c.label)+'</div><div class="home-sub">'+esc(c.role || '')+'</div></div><span class="mode-indicator selective-chip alpha-orbit-target" style="--orbit-color:'+(id==='aisha'?AISHA_COLOR:'var(--'+id+', rgba(255,255,255,.78))')+'">Selective refs</span></div>'+
      '<div class="home-body">'+
        '<div class="home-row"><div class="home-key">Usage</div><div class="home-val">'+esc(p.usageRule || 'Use selectively when relevant to the prompt or scene. Never force these into every generation.')+'</div></div>'+
        '<div class="alpha-home-section-title">Home / Exterior</div>'+
        '<div class="home-slots alpha-home-slots">'+
          alphaHomeSlotHtml(id,'home','livingRoom','Living room')+
          alphaHomeSlotHtml(id,'home','bedroom','Bedroom')+
          alphaHomeSlotHtml(id,'home','workspace','Workspace')+
          alphaHomeSlotHtml(id,'home','kitchen','Kitchen')+
          alphaHomeSlotHtml(id,'home','bathroom','Bathroom')+
          alphaHomeSlotHtml(id,'home','exterior','Exterior')+
        '</div>'+
        '<div class="alpha-home-section-title">Outfit sets</div>'+
        '<div class="home-slots alpha-home-slots alpha-home-slots-outfits">'+[0,1,2,3,4,5].map(function(i){ return alphaHomeSlotHtml(id,'outfit',String(i),'Outfit '+(i+1)); }).join('')+'</div>'+
        '<div class="alpha-home-section-title">Unique items</div>'+
        '<div class="home-slots alpha-home-slots">'+
          alphaHomeSlotHtml(id,'item','phone','Phone')+
          alphaHomeSlotHtml(id,'item','car','Car')+
          alphaHomeSlotHtml(id,'item','bag','Bag')+
          alphaHomeSlotHtml(id,'item','laptop','Laptop')+
          alphaHomeSlotHtml(id,'item','keys','Keys')+
          alphaHomeSlotHtml(id,'item','signature','Signature item')+
        '</div>'+
        '<div class="gen-label" style="margin-top:14px">Consistency notes</div>'+
        '<textarea class="asset-notes" id="cons-note-'+id+'" placeholder="What should the system know about these spaces, outfits, and objects?">'+esc(p.notes || '')+'</textarea>'+
        '<div class="home-actions"><button class="btn btn-ghost btn-sm" onclick="window.saveConsistencyNotes(\''+id+'\')">Save notes</button><button class="btn btn-ghost btn-sm" onclick="window.copyConsistencySummary(\''+id+'\')">Copy summary</button></div>'+
      '</div>'+
    '</div>';
  }

  function renderHomesAlpha(){
    ensureStateBits();
    const pulse = ensureAlphaHomeState();
    const page = document.getElementById('page-homes'); if(!page) return;
    const ids = teamOrder();
    const search = ((document.getElementById('home-search')||{}).value || (STATE.ui.homeSearch||'')).toLowerCase();
    let activeId = STATE.ui.homeSystemActiveChar || 'aisha';
    if(!ids.includes(activeId)) activeId = ids[0];
    if(search && !((activeId+' '+JSON.stringify(pulse.homes[activeId]||{})).toLowerCase().includes(search))){
      const found = ids.find(function(id){ return (id+' '+JSON.stringify(pulse.homes[id]||{})).toLowerCase().includes(search); });
      if(found) activeId = found;
    }
    STATE.ui.homeSystemActiveChar = activeId;
    STATE.ui.homeSearch = search;
    safeSave();
    page.innerHTML = '<div class="page-title">Home System</div><div class="page-sub">Residence, outfit, and item consistency. These references are available to the system when relevant. They are not forced into every generation.</div>'+
      '<div class="planner-tip">Item references are optional anchors. A phone, car, bag, or home reference should only be used when the scene truly benefits from it.</div>'+
      '<div class="filter-bar alpha-home-toolbar"><input class="search-input" id="home-search" placeholder="Search consistency notes..." value="'+esc(search)+'"></div>'+
      '<div class="alpha-home-system-shell">'+
        '<div class="alpha-home-menu-wrap"><div class="alpha-home-menu-title">Characters</div><div class="alpha-home-menu" id="alpha-home-menu">'+ids.map(function(id){ return homeCharacterMenuItem(id, activeId); }).join('')+'</div></div>'+
        '<div class="alpha-home-detail">'+alphaHomeProfileCard(activeId)+'</div>'+
      '</div>';
    const searchInput = document.getElementById('home-search');
    if(searchInput) searchInput.addEventListener('input', function(){ STATE.ui.homeSearch = this.value || ''; renderHomesAlpha(); });
    page.querySelectorAll('.alpha-home-menu-item').forEach(function(btn){
      btn.addEventListener('click', function(){ STATE.ui.homeSystemActiveChar = btn.getAttribute('data-home-id'); safeSave(); renderHomesAlpha(); });
    });
    setTimeout(function(){ removeNativeTitles(); installOrbitChrome(); }, 10);
  }

  const _oldRenderHomes = window.renderHomes;
  if(_oldRenderHomes && !_oldRenderHomes.__alpha397a){
    window.renderHomes = function(){ renderHomesAlpha(); return undefined; };
    window.renderHomes.__alpha397a = true;
  } else {
    window.renderHomes = renderHomesAlpha;
    window.renderHomes.__alpha397a = true;
  }
  window.uploadConsistencyRef = function(id, kind, key){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function(){
      const file = input.files && input.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = function(){
        const pulse = ensureAlphaHomeState();
        const p = pulse.homes[id];
        if(kind === 'home'){ p.home = p.home || {}; p.home[key] = reader.result; }
        if(kind === 'outfit'){ p.outfits = p.outfits || [null,null,null,null,null,null]; p.outfits[Number(key)] = reader.result; }
        if(kind === 'item'){ p.items = p.items || {}; p.items[key] = reader.result; }
        savePulseState(pulse); renderHomesAlpha();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  window.saveConsistencyNotes = function(id){
    const pulse = ensureAlphaHomeState();
    pulse.homes[id].notes = (document.getElementById('cons-note-'+id)||{}).value || '';
    savePulseState(pulse); renderHomesAlpha(); toastSafe('Consistency notes saved');
  };
  window.copyConsistencySummary = function(id){
    const pulse = ensureAlphaHomeState(); const p = pulse.homes[id] || {};
    const summary = [
      'Character: '+(((window.getChar && window.getChar(id)) || STATE.teamRecords[id] || {}).name || id),
      'Usage rule: '+(p.usageRule || ''),
      'Home refs: '+(Object.keys(p.home || {}).filter(function(k){ return p.home[k]; }).join(', ') || 'none'),
      'Outfit refs: '+((p.outfits || []).filter(Boolean).length),
      'Item refs: '+(Object.keys(p.items || {}).filter(function(k){ return p.items[k]; }).join(', ') || 'none'),
      'Notes: '+(p.notes || 'none')
    ].join('\n');
    navigator.clipboard.writeText(summary).then(function(){ toastSafe('Consistency summary copied'); });
  };

  const _oldRenderPlanner = window.renderPlanner;
  if(_oldRenderPlanner && !_oldRenderPlanner.__alpha397a){
    window.renderPlanner = function(){ const out = _oldRenderPlanner(); setTimeout(removeNativeTitles, 20); return out; };
    window.renderPlanner.__alpha397a = true;
  }

  const _oldRenderCaptions = window.renderCaptions;
  if(_oldRenderCaptions && !_oldRenderCaptions.__alpha397a){
    window.renderCaptions = function(){ const out = _oldRenderCaptions(); setTimeout(removeNativeTitles, 20); return out; };
    window.renderCaptions.__alpha397a = true;
  }

  const _initRef = init;
  init = function(){ _initRef(); postNavRefresh(); };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 20);
})();


/* 3.9.7a refinement v8 — force deterministic legacy state */
(function(){
  function pageActive(id){ var p=document.getElementById('page-'+id); return !!(p && p.classList.contains('active')); }
  function hardRenderAisha(){
    try{ if(window.ensureAishaCharacterData) window.ensureAishaCharacterData(); }catch(e){}
    try{ if(window.ensureAishaCharacterPage) window.ensureAishaCharacterPage(); }catch(e){}
    try{ if(window.renderCharPage) window.renderCharPage('aisha'); }catch(e){}
  }
  function forceHomes(){
    var page=document.getElementById('page-homes'); if(!page || !page.classList.contains('active')) return;
    if(!page.querySelector('.alpha-home-system-shell')){ try{ window.renderHomes && window.renderHomes(); }catch(e){} }
  }
  function normalizeHeroLines(){
    document.querySelectorAll('.char-hero').forEach(function(hero){ hero.style.borderLeft='none'; });
  }
  function unifyHeroActions(){
    ['leah','claudia','grok','vanya','aisha'].forEach(function(id){
      var page=document.getElementById('page-'+id); if(!page) return;
      var hero=page.querySelector('.char-hero'); if(!hero) return;
      var row=hero.querySelector('.alpha-char-actions');
      if(!row){
        var info=hero.children[1] || hero;
        row=document.createElement('div');
        row.className='alpha-char-actions';
        row.innerHTML='<button class="btn btn-red alpha-sync" type="button">Open Gallery</button><button class="btn btn-ghost" type="button">Edit Profile</button><button class="btn btn-ghost" type="button">Open Generator</button>';
        info.appendChild(row);
      }
      var buttons=row.querySelectorAll('button');
      if(buttons[1]) buttons[1].onclick=function(){ if(window.openCharacterEditor) window.openCharacterEditor(id); };
      if(buttons[2]) buttons[2].onclick=function(){ if(window.nav) window.nav('generator'); };
      if(buttons[0]) buttons[0].onclick=function(){ if(window.nav) window.nav('gallery'); };
    });
  }
  function seedAishaRich(){
    try{
      STATE.characters = STATE.characters || {};
      var a = STATE.characters.aisha = STATE.characters.aisha || {};
      a.name='Aisha Motsepe';
      a.role='Chief Creative Officer';
      a.city='Johannesburg';
      a.identity = Object.assign({
        age:'—', birthday:'—', zodiac:'—', city:'Johannesburg', languages:'English',
        build:'Controlled, elegant posture. Premium and exacting presence.',
        skin:'Warm brown skin with natural texture. No plastic smoothing.',
        hair:'Character-locked per uploaded refs.',
        eyes:'Direct, calm, exacting.',
        expression:'Controlled, unreadable by default.',
        wardrobe:'Dark premium neutrals. Structured, expensive, precise.',
        neverChange:['Chief Creative Officer energy','Cold exacting standards','Controlled premium presence'],
        neverGenerate:['Generic corporate headshot','Cheap glamour','Wrong identity details','Over-smiling influencer energy']
      }, a.identity||{});
      a.personal = Object.assign({
        summary:'Aisha is the standards layer of Silva Studios. She governs drift, archive quality, rebuild judgement, and prompt critique.',
        strengths:['Review judgement','Reference fidelity','Aesthetic calibration','Standards enforcement'],
        weaknesses:['Low tolerance for vague work','Can read as severe'],
        habits:['Cuts noise quickly','Rebuilds sloppy systems','Pushes for cleaner references'],
        annoyances:['Visual drift','Generic prompts','Messy systems'],
        signaturePhrases:['This is drifting.','Tighten it.','Reference fidelity is off.']
      }, a.personal||{});
      a.lifeRhythm = Object.assign({
        morning:'Quiet review pass before anything noisy.',
        workday:'Review, archive, drift checks, standards enforcement.',
        weekend:'Private, selective, low-noise.',
        decompresses:'Silence, order, curation.',
        favoriteOrder:'—', favoriteCafes:[], favoriteSpots:[], neverPost:['Messy oversharing']
      }, a.lifeRhythm||{});
      a.digital = Object.assign({
        chosenHandle:'@aisha', bio:['Chief Creative Officer · Silva Studios'], highlightNames:['Review','Archive','Standards'], storyVibe:'Quiet, exacting, controlled.', commentTone:'Brief, surgical.', linkedInHeadline:'Chief Creative Officer', dmTone:'Direct, precise.'
      }, a.digital||{});
      a.professional = Object.assign({
        headline:'Chief Creative Officer', summary:'Owns review, archive quality, rebuild judgement, and drift control.'
      }, a.professional||{});
      if(window.safeSave) safeSave();
    }catch(e){}
  }
  function installGlobalRefresh(){
    normalizeHeroLines(); unifyHeroActions(); forceHomes(); hardRenderAisha(); seedAishaRich();
  }
  window.addEventListener('load', function(){ setTimeout(installGlobalRefresh,80); setTimeout(installGlobalRefresh,300); setTimeout(installGlobalRefresh,900); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(installGlobalRefresh,80); });
  var mo = new MutationObserver(function(){ if(pageActive('homes')) forceHomes(); normalizeHeroLines(); });
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();

/* 3.9.8 planning + implementation pass v9 */
(function(){
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function seedAishaCanonicalAssets(){
    try{
      var key='silva_assets_aisha';
      var raw=localStorage.getItem(key)||'{}';
      var st={};
      try{ st=JSON.parse(raw)||{}; }catch(e){ st={}; }
      if(!st.face) st.face='assets/aisha_face.png';
      if(!st.body) st.body='assets/aisha_body.png';
      if(!st.notes) st.notes='Canonical Aisha lock: use uploaded six-frame face/body refs from the workspace. Straight shoulder-length black hair, warm brown skin, slim feminine build, clean black fitted basics.';
      localStorage.setItem(key, JSON.stringify(st));
      if(window.STATE && STATE.teamRecords && STATE.teamRecords.aisha && !STATE.teamRecords.aisha.avatar){
        STATE.teamRecords.aisha.avatar = st.face;
        try{ if(window.saveTeamRecordOverrides) saveTeamRecordOverrides(); }catch(e){}
      }
    }catch(e){}
  }

  function installAishaQuickview(){
    var quick=document.getElementById('ref-quickview');
    var el=document.querySelector('.nav-item[data-page="aisha"]');
    if(!quick || !el || el.__aishaQuickview) return;
    var item={face:'assets/aisha_face.png',body:'assets/aisha_body.png',title:'Aisha — use both refs',note:'Use both refs. Keep the exact face structure, shoulder-length black hair, and slim realistic body lock.'};
    function show(ev){
      quick.innerHTML='<div class="rq-title">'+item.title+'</div><div class="rq-grid"><img src="'+item.face+'"><img src="'+item.body+'"></div><div class="rq-note">'+item.note+'</div>';
      quick.style.display='block';
      quick.style.left=(ev.clientX+18)+'px';
      quick.style.top=(Math.max(14,ev.clientY-20))+'px';
    }
    el.addEventListener('mouseenter', show);
    el.addEventListener('mousemove', function(ev){ if(quick.style.display==='block'){ quick.style.left=(ev.clientX+18)+'px'; quick.style.top=(Math.max(14,ev.clientY-20))+'px'; } });
    el.addEventListener('mouseleave', function(){ quick.style.display='none'; });
    el.__aishaQuickview=true;
  }

  function patchCharacterEditorUploads(){
    var oldOpen=window.openCharacterEditor;
    if(!oldOpen || oldOpen.__v9Uploads) return;
    window.openCharacterEditor=function(id){
      oldOpen(id);
      var modal=document.getElementById('modal-content');
      if(!modal || modal.querySelector('#char-face-file')) return;
      var key='silva_assets_'+id;
      var st={};
      try{ st=JSON.parse(localStorage.getItem(key)||'{}')||{}; }catch(e){ st={}; }
      var block=document.createElement('div');
      block.style.gridColumn='1 / -1';
      block.innerHTML=''
        + '<div class="gen-label" style="margin-top:8px">Face / Body locks</div>'
        + '<div class="profile-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">'
        + '<div class="card card-sm"><div class="label-xs mb8">Face lock</div><div class="alpha-lock-preview" id="char-face-preview">'+(st.face?'<img src="'+esc(st.face)+'">':'<span>Upload face lock</span>')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input type="file" id="char-face-file" accept="image/*"><button class="btn btn-ghost btn-sm" type="button" id="char-face-clear">Clear</button></div></div>'
        + '<div class="card card-sm"><div class="label-xs mb8">Body lock</div><div class="alpha-lock-preview" id="char-body-preview">'+(st.body?'<img src="'+esc(st.body)+'">':'<span>Upload body lock</span>')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><input type="file" id="char-body-file" accept="image/*"><button class="btn btn-ghost btn-sm" type="button" id="char-body-clear">Clear</button></div></div>'
        + '</div>';
      modal.appendChild(block);
      [['face','char-face-file','char-face-preview','char-face-clear'],['body','char-body-file','char-body-preview','char-body-clear']].forEach(function(cfg){
        var kind=cfg[0], file=qs('#'+cfg[1], modal), prev=qs('#'+cfg[2], modal), clr=qs('#'+cfg[3], modal);
        if(file) file.addEventListener('change', function(){
          var f=file.files && file.files[0]; if(!f) return;
          var r=new FileReader();
          r.onload=function(){
            var data=String(r.result||'');
            var s={}; try{ s=JSON.parse(localStorage.getItem(key)||'{}')||{}; }catch(e){ s={}; }
            s[kind]=data; localStorage.setItem(key, JSON.stringify(s));
            if(kind==='face' && window.STATE && STATE.teamRecords && STATE.teamRecords[id]){ STATE.teamRecords[id].avatar=data; try{ if(window.saveTeamRecordOverrides) saveTeamRecordOverrides(); }catch(e){} }
            if(prev) prev.innerHTML='<img src="'+data+'">';
            toastSafe(kind==='face'?'Face lock updated':'Body lock updated');
            try{ if(window.renderAssets) renderAssets(); if(window.renderCharPage) renderCharPage(id); }catch(e){}
          };
          r.readAsDataURL(f);
        });
        if(clr) clr.addEventListener('click', function(){
          var s={}; try{ s=JSON.parse(localStorage.getItem(key)||'{}')||{}; }catch(e){ s={}; }
          delete s[kind]; localStorage.setItem(key, JSON.stringify(s));
          if(kind==='face' && window.STATE && STATE.teamRecords && STATE.teamRecords[id]){ STATE.teamRecords[id].avatar=''; try{ if(window.saveTeamRecordOverrides) saveTeamRecordOverrides(); }catch(e){} }
          if(prev) prev.innerHTML='<span>Upload '+kind+' lock</span>';
          toastSafe(kind==='face'?'Face lock cleared':'Body lock cleared');
          try{ if(window.renderAssets) renderAssets(); if(window.renderCharPage) renderCharPage(id); }catch(e){}
        });
      });
    };
    window.openCharacterEditor.__v9Uploads=true;
  }

  function ensureSettingsPage(){
    var main=document.getElementById('main');
    if(!main) return;
    if(!document.querySelector('.nav-item[data-page="settings"]')){
      var dev=document.querySelector('.nav-item[data-page="dev"]');
      if(dev) dev.insertAdjacentHTML('beforebegin','<div class="nav-item" data-page="settings"><span class="nav-icon">⚙</span> Settings</div>');
    }
    if(!document.getElementById('page-settings')){
      main.insertAdjacentHTML('beforeend','<section class="page" id="page-settings"><div class="page-title">Settings</div><div class="page-sub">Small controls for display, planner behavior, and workspace comfort.</div><div class="grid2"><div class="card"><div class="section-title mb14">Interface</div><label class="profile-item"><input type="checkbox" id="alpha-setting-hide-scrollbars" checked> Hide scrollbars</label><label class="profile-item"><input type="checkbox" id="alpha-setting-planner-expanded"> Planner opens expanded by default</label><label class="profile-item"><input type="checkbox" id="alpha-setting-pulse-rich" checked> Richer pulse trim</label></div><div class="card"><div class="section-title mb14">Workspace</div><div class="profile-item">Use Team / People Ops for team records.</div><div class="profile-item">Use Assets Vault for face/body lock uploads.</div><div class="profile-item">Aisha ships with seeded face/body canonical refs from this workspace.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-primary" onclick="window.saveAlphaSettings&&window.saveAlphaSettings()">Save settings</button><button class="btn btn-ghost" onclick="window.nav&&window.nav(\'dev\')">Open Dev / Admin</button></div></div></div></section>');
    }
    if(window.nav && !window.nav.__v9Settings){
      var oldNav=window.nav;
      window.nav=function(page){ oldNav(page); if(page==='settings') setTimeout(bindSettingsPage,20); };
      window.nav.__v9Settings=true;
    }
    bindSettingsPage();
  }
  function bindSettingsPage(){
    try{
      var prefs={}; try{ prefs=JSON.parse(localStorage.getItem('silva_alpha_settings')||'{}')||{}; }catch(e){}
      var map={hideScrollbars:'alpha-setting-hide-scrollbars',plannerExpanded:'alpha-setting-planner-expanded',pulseRich:'alpha-setting-pulse-rich'};
      Object.keys(map).forEach(function(k){ var el=document.getElementById(map[k]); if(el) el.checked = prefs[k]!==false || k==='plannerExpanded' ? !!prefs[k] : true; });
    }catch(e){}
  }
  window.saveAlphaSettings=function(){
    var prefs={
      hideScrollbars:!!document.getElementById('alpha-setting-hide-scrollbars')?.checked,
      plannerExpanded:!!document.getElementById('alpha-setting-planner-expanded')?.checked,
      pulseRich:!!document.getElementById('alpha-setting-pulse-rich')?.checked
    };
    localStorage.setItem('silva_alpha_settings', JSON.stringify(prefs));
    document.documentElement.classList.toggle('alpha-show-scrollbars', !prefs.hideScrollbars);
    document.documentElement.classList.toggle('alpha-planner-default-expanded', !!prefs.plannerExpanded);
    document.documentElement.classList.toggle('alpha-pulse-rich', !!prefs.pulseRich);
    toastSafe('Settings saved');
  };

  function monthGridHTML(anchorDate){
    var base = anchorDate ? new Date(anchorDate) : new Date();
    var year=base.getFullYear(), month=base.getMonth();
    var first=new Date(year,month,1); var last=new Date(year,month+1,0);
    var start=new Date(first); start.setDate(first.getDate() - ((first.getDay()+6)%7));
    var today=(new Date()).toDateString();
    var html='<div class="alpha-planner-month">';
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(d){ html+='<div class="alpha-planner-month-head">'+d+'</div>'; });
    for(var i=0;i<42;i++){
      var d=new Date(start); d.setDate(start.getDate()+i); var ds=d.toISOString().slice(0,10);
      var posts=(window.STATE?.plannerPosts||[]).filter(function(p){ return p.date===ds; });
      html+='<div class="alpha-month-cell'+(d.getMonth()!==month?' is-muted':'')+(d.toDateString()===today?' is-today':'')+'"><div class="alpha-month-date">'+d.getDate()+'</div>'+
      posts.slice(0,4).map(function(p){ return '<div class="alpha-month-pill">'+esc((p.title||'Untitled').slice(0,18))+'</div>'; }).join('')+
      (posts.length>4?'<div class="alpha-month-more">+'+(posts.length-4)+' more</div>':'')+'</div>';
    }
    html+='</div>'; return html;
  }

  function openPlannerMonthModal(){
    var label=document.getElementById('week-label');
    var anchor=(label && label.textContent) ? new Date(label.textContent.replace('Week of ','') ) : new Date();
    openModal('<div class="modal-title">Planner · Month view</div><div class="small-note" style="margin-bottom:12px">Expanded month map for the current planner state.</div>'+monthGridHTML(anchor));
    var box=document.getElementById('modal-box'); if(box) box.classList.add('alpha-modal-wide');
  }
  window.openPlannerMonthModal=openPlannerMonthModal;

  function decoratePlanner(){
    var page=document.getElementById('page-planner'); if(!page) return;
    var filter=page.querySelector('.filter-bar'); if(!filter) return;
    if(!document.getElementById('planner-expand-toggle')){
      filter.insertAdjacentHTML('beforeend','<button class="btn btn-ghost btn-sm" id="planner-expand-toggle" type="button">⤢ Expand</button><button class="btn btn-ghost btn-sm" id="planner-month-open" type="button">▦ Month View</button>');
      document.getElementById('planner-expand-toggle').onclick=function(){ page.classList.toggle('alpha-planner-expanded'); this.textContent = page.classList.contains('alpha-planner-expanded') ? '⤡ Collapse' : '⤢ Expand'; };
      document.getElementById('planner-month-open').onclick=openPlannerMonthModal;
    }
    if(document.documentElement.classList.contains('alpha-planner-default-expanded')) page.classList.add('alpha-planner-expanded');
  }
  var _renderPlannerV9 = window.renderPlanner;
  if(_renderPlannerV9 && !_renderPlannerV9.__v9Decorated){
    window.renderPlanner=function(){ var out=_renderPlannerV9(); setTimeout(function(){ removeNativeTitles&&removeNativeTitles(); decoratePlanner(); },30); return out; };
    window.renderPlanner.__v9Decorated=true;
  }

  const CAMPAIGN_META={
    c1:{purpose:'Give the studio one weekly thesis and let each character interpret it from their lane.', workflow:['Pick one thesis for the week.','Assign one output per character.','Generate kit → review → schedule.'], outputs:['Carousel','Story set','LinkedIn note']},
    c2:{purpose:'Use city, commute, desk, and room transitions so the characters feel lived-in.', workflow:['Pick one environment jump.','Bind it to a character.','Carry one object/pose cue across the sequence.'], outputs:['Portrait-in-environment','B-roll set','Day-in-life cut']},
    c3:{purpose:'Turn invisible systems work into content that feels useful instead of corporate.', workflow:['Identify one friction fix.','Show before / after or desk logic.','Link back to saved prompt or gallery output.'], outputs:['Before/after','Process carousel','Quiet desk post']},
    c4:{purpose:'Use consistency assets without forcing props into every shot.', workflow:['Pick one lock that truly matters.','Swap only the important object.','Keep pose/background energy from source post.'], outputs:['Reference-led remake','Story cut','Gallery standard']},
    c5:{purpose:'Use review, drift, and archive notes to tighten prompts into reusable standards.', workflow:['Start from saved output.','Write correction notes.','Fork a stronger gold-standard prompt.'], outputs:['Prompt audit','Prompt rebuild','Gallery correction loop']},
    c6:{purpose:'Show the people and personality texture behind the system without losing standards.', workflow:['Choose one behind-the-scenes angle.','Pick the right character voice.','Schedule it inside a broader campaign arc.'], outputs:['People portrait','Desk detail','After-hours story']}
  };
  window.renderCampaigns=function(){
    var grid=document.getElementById('campaigns-grid'); if(!grid) return;
    var cards=(window.CAMPAIGNS||[]).map(function(c, idx){
      var meta=CAMPAIGN_META[c.id] || CAMPAIGN_META['c'+(idx+1)] || {purpose:c.desc||'Campaign operating lane.',workflow:['Choose objective.','Generate assets.','Schedule and review.'],outputs:['Post arc']};
      var linkedPlans=(STATE.plannerPosts||[]).filter(function(p){ return (p.campaignId||p.campaign)===c.id; });
      var linkedPrompts=(STATE.prompts||[]).filter(function(p){ return (p.campaignId||p.campaign)===c.id; });
      var owner=(window.getChar && window.getChar(c.owner||''))?.name || (STATE.teamRecords && STATE.teamRecords[c.owner||'']?.name) || 'Studio';
      return '<div class="campaign-card alpha-campaign-card">'
        + '<div class="campaign-name">'+esc(c.name)+'</div>'
        + '<div class="campaign-desc">'+esc(meta.purpose)+'</div>'
        + '<div class="small-note" style="margin-top:8px">Owner: '+esc(owner)+' · '+linkedPlans.length+' planner · '+linkedPrompts.length+' prompts</div>'
        + '<div class="label-xs" style="margin-top:12px">Workflow</div>'
        + '<div class="alpha-campaign-steps">'+meta.workflow.map(function(step){ return '<div class="profile-item">— '+esc(step)+'</div>'; }).join('')+'</div>'
        + '<div class="label-xs" style="margin-top:12px">Best outputs</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+meta.outputs.map(function(x){ return '<span class="tag">'+esc(x)+'</span>'; }).join('')+'</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-ghost btn-sm" onclick="openAddPlanModal(\''+new Date().toISOString().slice(0,10)+'\')">▦ Schedule</button><button class="btn btn-ghost btn-sm" onclick="nav(\'generator\')">⚡ Generate from campaign</button><button class="btn btn-ghost btn-sm" onclick="nav(\'gallery\')">◌ Review outputs</button></div>'
      + '</div>';
    }).join('');
    grid.innerHTML=cards;
  };

  function forceStablePages(){
    // force homes shell if the page is active and old layout sneaks back in
    var homes=document.getElementById('page-homes');
    if(homes && homes.classList.contains('active') && !homes.querySelector('.alpha-home-system-shell')){ try{ window.renderHomes && window.renderHomes(); }catch(e){} }
    qsa('#page-home .cc-inline-actions').forEach(function(row){ row.classList.add('alpha-inline-actions'); });
  }

  function strongerAishaData(){
    if(!window.STATE) return;
    STATE.characters = STATE.characters || {};
    var a = STATE.characters.aisha = STATE.characters.aisha || {};
    a.prompts = a.prompts || ['Reference-led remake', 'Archive correction pass', 'Review-first portrait'];
    a.captions = a.captions || ['If it feels vague, it is already drifting.', 'Standards are invisible until they are missing.'];
    a.personal = Object.assign({ strengths:['Creative direction','Standards pressure','Prompt critique','Archive judgement'], habits:['Cuts drift quickly','Prefers exact references','Keeps language tight'], annoyances:['Generic prompts','Cheap polish','Wrong locks'], signaturePhrases:['Tighten it.','This is drifting.','Use the correct lock.']}, a.personal||{});
    a.lifeRhythm = Object.assign({ favoriteCafes:['Quiet premium café, low noise'], favoriteOrder:'Flat white or water. No fuss.', favoriteSpots:['Johannesburg studio desk','Low-noise premium lobby'], neverPost:['Messy overshare','Cheap aspirational posturing'] }, a.lifeRhythm||{});
    a.digital = Object.assign({ chosenHandle:'@aisha.motsepe', bio:['Chief Creative Officer · Silva Studios','review • drift • archive'], highlightNames:['Review','Archive','Standards'], storyVibe:'Quiet, exacting, minimal.', commentTone:'Brief, precise.', linkedInHeadline:'Chief Creative Officer · Silva Studios', dmTone:'Direct, premium, controlled.' }, a.digital||{});
    a.professional = Object.assign({ headline:'Chief Creative Officer', summary:'Leads creative direction, standards, review, drift judgement, and archive quality across the studio.', workStyle:'Precise, high-standard, low-noise.', strengths:['Creative calibration','Standards leadership','Review judgement'], tools:['Reference systems','Prompt review','Archive QA'], serviceAreas:['Creative direction','Review systems','Visual consistency'] }, a.professional||{});
  }

  function bindOnReady(){
    seedAishaCanonicalAssets();
    installAishaQuickview();
    patchCharacterEditorUploads();
    ensureSettingsPage();
    strongerAishaData();
    forceStablePages();
  }
  window.addEventListener('load', function(){ setTimeout(bindOnReady, 120); setTimeout(bindOnReady, 700); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(bindOnReady,120); });
  var mo2 = new MutationObserver(function(){ forceStablePages(); installAishaQuickview(); });
  mo2.observe(document.documentElement,{childList:true,subtree:true});
})();
