(function(){
  if(window.__v399LegacySolidify) return;
  window.__v399LegacySolidify = true;

  const CHAR_IDS = ['aisha','leah','claudia','grok','vanya'];
  const AISHA_TEMPLATE = {
    name:'Aisha Motsepe',
    role:'Chief Creative Officer',
    city:'Johannesburg',
    modes:['observing','precise','glacial','approving','reviewing'],
    identity:{
      age:'26', birthday:'—', zodiac:'—', city:'Johannesburg', languages:'English',
      build:'Slim feminine build, controlled posture, expensive restraint rather than performative energy.',
      skin:'Warm rich brown skin with realistic texture and clean natural finish.',
      hair:'Straight shoulder-length black hair with a clean center part or exact controlled styling. Never loose chaos.',
      eyes:'Dark brown eyes with a calm exacting read.',
      expression:'Controlled, exacting, unreadable by default. Quiet authority.',
      wardrobe:'Clean black fitted basics, precise silhouettes, quiet luxury, no cheap trend-chasing.',
      neverChange:['Straight shoulder-length black hair','Warm rich brown skin tone','Slim feminine build','Quiet exacting presence','Premium minimal wardrobe discipline'],
      neverGenerate:['Generic stock corporate portrait','Wrong facial identity','Cheap glam styling','Over-smiling influencer energy','Messy hair or random trend makeup']
    },
    personal:{
      summary:'Aisha is the cold standards layer of the studio. She owns review, drift judgement, archive quality, and the moment a build needs to stop being loud and start being right.',
      strengths:['Creative direction','Drift detection','Reference fidelity judgement','Standards pressure','Archive taste'],
      weaknesses:['Can read severe before she reads warm','Low tolerance for vague work','Not interested in performative softness'],
      habits:['Cuts noise quickly','Reorders messy systems without asking','Tightens wording until it stops leaking quality'],
      annoyances:['Generic prompts','Cheap polish','Wrong identity locks','Visual drift disguised as creativity'],
      comfortBehaviors:['Quiet review passes','Structured notes','Silence before final judgment'],
      signaturePhrases:['This is drifting.','Tighten it.','Use the correct lock.','The standard is the point.']
    },
    lifeRhythm:{
      morning:'Quiet start. Review before reaction.',
      workday:'Review, archive judgement, correction passes, standards pressure.',
      weekend:'Private, selective, low-noise.',
      travel:'Minimal, controlled, never over-documented.',
      decompresses:'Silence, order, and exact environments.',
      favoriteCafes:['Quiet premium café with low noise and clean light'],
      favoriteOrder:'Flat white or water. No fuss.',
      favoriteSpots:['Johannesburg studio desk','Low-noise premium lobby'],
      neverPost:['Messy overshare','Cheap aspirational posturing','Anything below standard']
    },
    digital:{
      handles:['@aisha.motsepe','@aisha.archive'],
      chosenHandle:'@aisha.motsepe',
      bio:['Chief Creative Officer · Silva Studios','review • drift • archive'],
      linkedInHeadline:'Chief Creative Officer · Silva Studios',
      highlightNames:['Review','Archive','Standards'],
      storyVibe:'Quiet, exacting, minimal.',
      commentTone:'Brief, precise.',
      dmTone:'Direct, premium, controlled.'
    },
    professional:{
      headline:'Chief Creative Officer',
      summary:'Leads creative direction, standards, review, drift judgement, and archive quality across the studio.',
      strengths:['Creative calibration','Standards leadership','Review judgement'],
      tools:['Reference systems','Prompt review','Archive QA'],
      workStyle:'Precise, high-standard, low-noise.',
      serviceAreas:['Creative direction','Review systems','Visual consistency']
    },
    extras:{
      hobbies:['Curation','Material study','Archive review'],
      favouriteFoods:['Simple expensive basics done properly'],
      favouriteTextures:['Dark glass','Brushed metal','Heavy cotton','Polished stone'],
      socialGraph:['Tight circle only','Taste-led founders','Quiet perfectionists'],
      closeFriendsTone:'Sparse, exact, unexpectedly funny when she bothers.',
      voiceNotes:'Short, controlled, usually sent only when correction is faster than typing.',
      cringe:['A standards post that was almost too honest.'],
      deleteLater:['A brutally accurate critique posted five minutes too early.'],
      cameraRoll:['Materials','Architecture','Quiet luxury lighting','Reference screenshots'],
      afterWork:['Archive passes','Low-noise dinner','Long silent drive'],
      safeCV:{
        summary:'Creative director focused on review systems, reference fidelity, standards governance, and archive quality.',
        credibility:['Review authority across studio outputs','Prompt and reference correction loops','Archive calibration and rebuild judgment'],
        topics:['Standards','Drift control','Reference fidelity']
      }
    }
  };

  const SECTION_ORDER = [
    {id:'general', label:'General'},
    {id:'identity', label:'Identity'},
    {id:'personal', label:'Personal'},
    {id:'life', label:'Life'},
    {id:'digital', label:'Digital'},
    {id:'professional', label:'Professional'},
    {id:'extras', label:'Extras'}
  ];

  const ASSET_CACHE = Object.create(null);

  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function deepClone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }
  function parseLines(v){ return String(v || '').split(/\n+/).map(x => x.trim()).filter(Boolean); }
  function listText(v){ return Array.isArray(v) ? v.join('\n') : String(v || ''); }
  function ensureObj(v){ return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
  function getPath(obj, path){ return String(path).split('.').reduce((acc,key)=> acc && acc[key] != null ? acc[key] : '', obj); }
  function setPath(obj, path, value){
    const keys = String(path).split('.');
    let ref = obj;
    while(keys.length > 1){ const k = keys.shift(); ref[k] = ensureObj(ref[k]); ref = ref[k]; }
    ref[keys[0]] = value;
  }
  function syncToast(msg){ try{ if(window.toast) window.toast(msg); else if(window.showToast) window.showToast('info', msg); }catch(e){} }
  function readAssetState(id){
    if(ASSET_CACHE[id]) return deepClone(ASSET_CACHE[id]);
    let parsed = {};
    try{ parsed = JSON.parse(localStorage.getItem('silva_assets_'+id) || '{}') || {}; }catch(e){ parsed = {}; }
    ASSET_CACHE[id] = parsed;
    return deepClone(parsed);
  }
  function writeAssetState(id, next){
    ASSET_CACHE[id] = Object.assign({}, next || {});
    try{ localStorage.setItem('silva_assets_'+id, JSON.stringify(ASSET_CACHE[id])); }catch(e){}
  }
  function mergeCharacter(target, source){
    Object.keys(source || {}).forEach(key => {
      const sv = source[key];
      const tv = target[key];
      if(Array.isArray(sv)){
        if(!Array.isArray(tv) || !tv.length) target[key] = sv.slice();
      }else if(sv && typeof sv === 'object'){
        if(!tv || typeof tv !== 'object' || Array.isArray(tv)) target[key] = deepClone(sv);
        else mergeCharacter(tv, sv);
      }else if(tv == null || tv === ''){
        target[key] = sv;
      }
    });
    return target;
  }
  function ensureCharacterRecord(id){
    window.STATE = window.STATE || {};
    STATE.characters = STATE.characters || {};
    window.CHARS = window.CHARS || {};
    if(!STATE.characters[id]){
      const base = (window.CHARS && window.CHARS[id]) || {};
      STATE.characters[id] = deepClone(base) || {};
    }
    const char = STATE.characters[id];
    ['identity','personal','lifeRhythm','digital','professional','extras'].forEach(k => { char[k] = ensureObj(char[k]); });
    if(!Array.isArray(char.modes) || !char.modes.length) char.modes = ['default'];
    return char;
  }
  function ensureAishaParity(){
    const a = ensureCharacterRecord('aisha');
    mergeCharacter(a, deepClone(AISHA_TEMPLATE));
    a.name = 'Aisha Motsepe';
    a.role = a.role || AISHA_TEMPLATE.role;
    a.city = a.city || AISHA_TEMPLATE.city;
    STATE.currentModes = STATE.currentModes || {};
    if(!STATE.currentModes.aisha || !a.modes.includes(STATE.currentModes.aisha)) STATE.currentModes.aisha = a.modes[0];
    STATE.teamRecords = STATE.teamRecords || {};
    STATE.teamRecords.aisha = Object.assign({
      name:'Aisha Motsepe', role:a.role, city:a.city, department:'Creative', email:'aisha@silvastudios.co.za', instagram:'@aisha.motsepe', linkedin:'Aisha Motsepe — Silva Studios', owner:'Creative', status:'Active', ai:true,
      notes:a.personal.summary
    }, STATE.teamRecords.aisha || {});
    if(!STATE.teamRecords.aisha.avatar){
      const asset = readAssetState('aisha');
      if(asset.face) STATE.teamRecords.aisha.avatar = asset.face;
    }
  }
  function ensureCharacterParity(){
    CHAR_IDS.forEach(id => {
      const c = ensureCharacterRecord(id);
      if(id === 'aisha') return;
      c.name = c.name || ((STATE.teamRecords && STATE.teamRecords[id] && STATE.teamRecords[id].name) || id);
      c.role = c.role || ((STATE.teamRecords && STATE.teamRecords[id] && STATE.teamRecords[id].role) || 'AI Specialist');
      c.city = c.city || ((STATE.teamRecords && STATE.teamRecords[id] && STATE.teamRecords[id].city) || 'Johannesburg');
      ['summary'].forEach(k => { if(!c.personal[k]) c.personal[k] = ''; });
      ['strengths','weaknesses','habits','annoyances','comfortBehaviors','signaturePhrases'].forEach(k => { if(!Array.isArray(c.personal[k])) c.personal[k] = []; });
      ['favoriteCafes','favoriteSpots','neverPost'].forEach(k => { if(!Array.isArray(c.lifeRhythm[k])) c.lifeRhythm[k] = []; });
      ['handles','bio','highlightNames'].forEach(k => { if(!Array.isArray(c.digital[k])) c.digital[k] = []; });
      ['strengths','tools','serviceAreas'].forEach(k => { if(!Array.isArray(c.professional[k])) c.professional[k] = []; });
      ['hobbies','favouriteFoods','favouriteTextures','socialGraph','cringe','deleteLater','cameraRoll','afterWork'].forEach(k => { if(!Array.isArray(c.extras[k])) c.extras[k] = []; });
      c.extras.safeCV = ensureObj(c.extras.safeCV);
      ['credibility','topics'].forEach(k => { if(!Array.isArray(c.extras.safeCV[k])) c.extras.safeCV[k] = []; });
      STATE.currentModes = STATE.currentModes || {};
      if(!STATE.currentModes[id] || !c.modes.includes(STATE.currentModes[id])) STATE.currentModes[id] = c.modes[0] || 'default';
    });
    ensureAishaParity();
  }

  function scheduleFlushSave(){ try{ window.saveState && window.saveState(); }catch(e){} }
  function installSaveThrottle(){
    const oldSave = window.saveState;
    if(!oldSave || oldSave.__solidThrottle) return;
    let timer = 0;
    let lastSaved = 0;
    const wrapped = function(force){
      if(force === true){
        if(timer) clearTimeout(timer);
        timer = 0;
        oldSave();
        lastSaved = Date.now();
        return;
      }
      if(timer) clearTimeout(timer);
      const delay = Date.now() - lastSaved < 160 ? 220 : 90;
      timer = window.setTimeout(function(){
        timer = 0;
        oldSave();
        lastSaved = Date.now();
      }, delay);
    };
    wrapped.__solidThrottle = true;
    wrapped.__oldSave = oldSave;
    window.saveState = wrapped;
    window.addEventListener('beforeunload', function(){ try{ window.saveState(true); }catch(e){} });
  }

  function field(path, label, value, opts){
    const o = Object.assign({type:'textarea', span:1, help:'', placeholder:''}, opts || {});
    const input = o.type === 'input'
      ? '<input data-path="'+esc(path)+'" class="solid-editor-input" value="'+esc(value)+'" placeholder="'+esc(o.placeholder)+'">'
      : '<textarea data-path="'+esc(path)+'" class="solid-editor-textarea" placeholder="'+esc(o.placeholder)+'">'+esc(value)+'</textarea>';
    return '<div class="solid-field'+(o.span === 2 ? ' solid-span-2' : '')+'"><label>'+esc(label)+'</label>'+input+(o.help ? '<div class="solid-help">'+esc(o.help)+'</div>' : '')+'</div>';
  }

  function editorSection(id, c){
    if(id === 'general'){
      const asset = readAssetState(c.__id);
      return '<div class="solid-editor-card" data-section="general"><div class="section-title">General</div><div class="solid-chip-row"><span class="solid-chip">Character '+esc(c.__id)+'</span><span class="solid-chip">Mode '+esc((STATE.currentModes||{})[c.__id] || (c.modes||[])[0] || 'default')+'</span></div><div class="solid-editor-grid">'
        + field('name','Name',c.name,{type:'input'})
        + field('role','Role',c.role,{type:'input'})
        + field('city','City',c.city,{type:'input'})
        + field('modes','Modes (one per line)',listText(c.modes),{help:'First mode becomes the default if the current one is invalid.'})
        + field('personal.summary','Character summary',getPath(c,'personal.summary'),{span:2,help:'This feeds the page tone and editor context.'})
        + '</div><div class="solid-upload-grid" style="margin-top:14px">'
        + '<div class="solid-upload-slot"><div class="label-xs mb8">Face lock</div><div class="solid-upload-preview" id="solid-face-preview">'+(asset.face?'<img src="'+esc(asset.face)+'">':'Upload face lock')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input type="file" id="solid-face-file" accept="image/*"><button class="btn btn-ghost btn-sm" type="button" id="solid-face-clear">Clear</button></div></div>'
        + '<div class="solid-upload-slot"><div class="label-xs mb8">Body lock</div><div class="solid-upload-preview" id="solid-body-preview">'+(asset.body?'<img src="'+esc(asset.body)+'">':'Upload body lock')+'</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input type="file" id="solid-body-file" accept="image/*"><button class="btn btn-ghost btn-sm" type="button" id="solid-body-clear">Clear</button></div></div>'
        + '</div></div>';
    }
    if(id === 'identity') return '<div class="solid-editor-card" data-section="identity"><div class="section-title">Identity lock</div><div class="solid-editor-grid">'
      + field('identity.age','Age',getPath(c,'identity.age'),{type:'input'})
      + field('identity.birthday','Birthday',getPath(c,'identity.birthday'),{type:'input'})
      + field('identity.zodiac','Zodiac',getPath(c,'identity.zodiac'),{type:'input'})
      + field('identity.languages','Languages',getPath(c,'identity.languages'),{type:'input'})
      + field('identity.build','Build',getPath(c,'identity.build'),{span:2})
      + field('identity.skin','Skin',getPath(c,'identity.skin'))
      + field('identity.hair','Hair',getPath(c,'identity.hair'))
      + field('identity.eyes','Eyes',getPath(c,'identity.eyes'))
      + field('identity.expression','Expression',getPath(c,'identity.expression'))
      + field('identity.wardrobe','Wardrobe',getPath(c,'identity.wardrobe'),{span:2})
      + field('identity.neverChange','Never change (one per line)',listText(getPath(c,'identity.neverChange')))
      + field('identity.neverGenerate','Never generate (one per line)',listText(getPath(c,'identity.neverGenerate')))
      + '</div></div>';
    if(id === 'personal') return '<div class="solid-editor-card" data-section="personal"><div class="section-title">Personal profile</div><div class="solid-editor-grid">'
      + field('personal.summary','Summary',getPath(c,'personal.summary'),{span:2})
      + field('personal.strengths','Strengths',listText(getPath(c,'personal.strengths')))
      + field('personal.weaknesses','Weaknesses',listText(getPath(c,'personal.weaknesses')))
      + field('personal.habits','Habits',listText(getPath(c,'personal.habits')))
      + field('personal.annoyances','Annoyances',listText(getPath(c,'personal.annoyances')))
      + field('personal.comfortBehaviors','Comfort behaviours',listText(getPath(c,'personal.comfortBehaviors')))
      + field('personal.signaturePhrases','Signature phrases',listText(getPath(c,'personal.signaturePhrases')))
      + '</div></div>';
    if(id === 'life') return '<div class="solid-editor-card" data-section="life"><div class="section-title">Life rhythm</div><div class="solid-editor-grid">'
      + field('lifeRhythm.morning','Morning',getPath(c,'lifeRhythm.morning'))
      + field('lifeRhythm.workday','Workday',getPath(c,'lifeRhythm.workday'))
      + field('lifeRhythm.weekend','Weekend',getPath(c,'lifeRhythm.weekend'))
      + field('lifeRhythm.travel','Travel',getPath(c,'lifeRhythm.travel'))
      + field('lifeRhythm.decompresses','Decompresses',getPath(c,'lifeRhythm.decompresses'))
      + field('lifeRhythm.favoriteOrder','Favorite order',getPath(c,'lifeRhythm.favoriteOrder'))
      + field('lifeRhythm.favoriteCafes','Favorite cafés',listText(getPath(c,'lifeRhythm.favoriteCafes')))
      + field('lifeRhythm.favoriteSpots','Favorite spots',listText(getPath(c,'lifeRhythm.favoriteSpots')))
      + field('lifeRhythm.neverPost','Never post',listText(getPath(c,'lifeRhythm.neverPost')), {span:2})
      + '</div></div>';
    if(id === 'digital') return '<div class="solid-editor-card" data-section="digital"><div class="section-title">Digital profile</div><div class="solid-editor-grid">'
      + field('digital.handles','Handles',listText(getPath(c,'digital.handles')))
      + field('digital.chosenHandle','Chosen handle',getPath(c,'digital.chosenHandle'),{type:'input'})
      + field('digital.bio','Bio lines',listText(getPath(c,'digital.bio')))
      + field('digital.linkedInHeadline','LinkedIn headline',getPath(c,'digital.linkedInHeadline'))
      + field('digital.highlightNames','Highlight names',listText(getPath(c,'digital.highlightNames')))
      + field('digital.storyVibe','Story vibe',getPath(c,'digital.storyVibe'))
      + field('digital.commentTone','Comment tone',getPath(c,'digital.commentTone'))
      + field('digital.dmTone','DM tone',getPath(c,'digital.dmTone'))
      + '</div></div>';
    if(id === 'professional') return '<div class="solid-editor-card" data-section="professional"><div class="section-title">Professional profile</div><div class="solid-editor-grid">'
      + field('professional.headline','Headline',getPath(c,'professional.headline'),{span:2})
      + field('professional.summary','Summary',getPath(c,'professional.summary'),{span:2})
      + field('professional.strengths','Professional strengths',listText(getPath(c,'professional.strengths')))
      + field('professional.tools','Tools',listText(getPath(c,'professional.tools')))
      + field('professional.workStyle','Work style',getPath(c,'professional.workStyle'))
      + field('professional.serviceAreas','Service areas',listText(getPath(c,'professional.serviceAreas')))
      + field('extras.safeCV.summary','Safe CV summary',getPath(c,'extras.safeCV.summary'),{span:2})
      + field('extras.safeCV.credibility','Safe CV credibility',listText(getPath(c,'extras.safeCV.credibility')))
      + field('extras.safeCV.topics','Safe CV topics',listText(getPath(c,'extras.safeCV.topics')))
      + '</div></div>';
    return '<div class="solid-editor-card" data-section="extras"><div class="section-title">Extras</div><div class="solid-editor-grid">'
      + field('extras.hobbies','Hobbies',listText(getPath(c,'extras.hobbies')))
      + field('extras.favouriteFoods','Favourite foods',listText(getPath(c,'extras.favouriteFoods')))
      + field('extras.favouriteTextures','Favourite textures',listText(getPath(c,'extras.favouriteTextures')))
      + field('extras.socialGraph','Social graph',listText(getPath(c,'extras.socialGraph')))
      + field('extras.closeFriendsTone','Close-friends tone',getPath(c,'extras.closeFriendsTone'))
      + field('extras.voiceNotes','Voice notes',getPath(c,'extras.voiceNotes'))
      + field('extras.cringe','Cringe posts',listText(getPath(c,'extras.cringe')))
      + field('extras.deleteLater','Delete later',listText(getPath(c,'extras.deleteLater')))
      + field('extras.cameraRoll','Camera roll',listText(getPath(c,'extras.cameraRoll')))
      + field('extras.afterWork','After work',listText(getPath(c,'extras.afterWork')))
      + '</div></div>';
  }

  function bindEditorSections(active){
    const buttons = Array.from(document.querySelectorAll('.solid-editor-btn'));
    const cards = Array.from(document.querySelectorAll('.solid-editor-card[data-section]'));
    function setActive(id){
      buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.section === id));
      cards.forEach(card => { card.style.display = card.dataset.section === id ? '' : 'none'; });
    }
    buttons.forEach(btn => btn.addEventListener('click', function(){ setActive(btn.dataset.section); }));
    setActive(active || 'general');
  }

  function syncEditorUpload(id, kind, file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(){
      const asset = readAssetState(id);
      asset[kind] = String(reader.result || '');
      writeAssetState(id, asset);
      if(kind === 'face'){
        STATE.teamRecords = STATE.teamRecords || {};
        STATE.teamRecords[id] = STATE.teamRecords[id] || { name:(ensureCharacterRecord(id).name || id) };
        STATE.teamRecords[id].avatar = asset.face;
        try{ window.saveTeamRecordOverrides && window.saveTeamRecordOverrides(); }catch(e){}
      }
      const prev = document.getElementById('solid-'+kind+'-preview');
      if(prev) prev.innerHTML = '<img src="'+esc(asset[kind])+'">';
      scheduleFlushSave();
      try{ window.renderAssets && window.renderAssets(); window.renderCharPage && window.renderCharPage(id); }catch(e){}
      syncToast(kind === 'face' ? 'Face lock updated' : 'Body lock updated');
    };
    reader.readAsDataURL(file);
  }

  function clearEditorUpload(id, kind){
    const asset = readAssetState(id);
    delete asset[kind];
    writeAssetState(id, asset);
    if(kind === 'face' && STATE.teamRecords && STATE.teamRecords[id]){
      STATE.teamRecords[id].avatar = '';
      try{ window.saveTeamRecordOverrides && window.saveTeamRecordOverrides(); }catch(e){}
    }
    const prev = document.getElementById('solid-'+kind+'-preview');
    if(prev) prev.textContent = kind === 'face' ? 'Upload face lock' : 'Upload body lock';
    scheduleFlushSave();
    try{ window.renderAssets && window.renderAssets(); window.renderCharPage && window.renderCharPage(id); }catch(e){}
    syncToast(kind === 'face' ? 'Face lock cleared' : 'Body lock cleared');
  }

  function bindEditorUploads(id){
    const faceFile = document.getElementById('solid-face-file');
    const bodyFile = document.getElementById('solid-body-file');
    const faceClear = document.getElementById('solid-face-clear');
    const bodyClear = document.getElementById('solid-body-clear');
    if(faceFile) faceFile.addEventListener('change', e => syncEditorUpload(id, 'face', e.target.files && e.target.files[0]));
    if(bodyFile) bodyFile.addEventListener('change', e => syncEditorUpload(id, 'body', e.target.files && e.target.files[0]));
    if(faceClear) faceClear.addEventListener('click', () => clearEditorUpload(id, 'face'));
    if(bodyClear) bodyClear.addEventListener('click', () => clearEditorUpload(id, 'body'));
  }

  function collectEditorValues(id){
    const char = ensureCharacterRecord(id);
    const draft = deepClone(char);
    document.querySelectorAll('[data-path]').forEach(el => {
      const path = el.dataset.path;
      let value = el.value;
      if(['modes','identity.neverChange','identity.neverGenerate','personal.strengths','personal.weaknesses','personal.habits','personal.annoyances','personal.comfortBehaviors','personal.signaturePhrases','lifeRhythm.favoriteCafes','lifeRhythm.favoriteSpots','lifeRhythm.neverPost','digital.handles','digital.bio','digital.highlightNames','professional.strengths','professional.tools','professional.serviceAreas','extras.hobbies','extras.favouriteFoods','extras.favouriteTextures','extras.socialGraph','extras.cringe','extras.deleteLater','extras.cameraRoll','extras.afterWork','extras.safeCV.credibility','extras.safeCV.topics'].includes(path)) value = parseLines(value);
      setPath(draft, path, value);
    });
    if(Array.isArray(draft.modes) ? !draft.modes.length : true) draft.modes = ['default'];
    draft.modes = Array.isArray(draft.modes) ? draft.modes : parseLines(draft.modes);
    draft.name = draft.name || ((STATE.teamRecords && STATE.teamRecords[id] && STATE.teamRecords[id].name) || id);
    draft.role = draft.role || char.role || '';
    draft.city = draft.city || char.city || '';
    draft.identity = ensureObj(draft.identity); draft.identity.city = draft.city || draft.identity.city || '';
    return draft;
  }

  function persistCharacterDraft(id, draft){
    STATE.characters = STATE.characters || {};
    STATE.characters[id] = draft;
    window.CHARS = window.CHARS || {};
    window.CHARS[id] = deepClone(draft);
    STATE.teamRecords = STATE.teamRecords || {};
    STATE.teamRecords[id] = Object.assign({}, STATE.teamRecords[id] || {}, {
      name:draft.name || (STATE.teamRecords[id] && STATE.teamRecords[id].name) || id,
      role:draft.role || '',
      city:draft.city || '',
      notes:getPath(draft,'personal.summary') || (STATE.teamRecords[id] && STATE.teamRecords[id].notes) || ''
    });
    if(getPath(draft,'digital.chosenHandle')) STATE.teamRecords[id].instagram = getPath(draft,'digital.chosenHandle');
    if(id === 'aisha') ensureAishaParity();
    STATE.currentModes = STATE.currentModes || {};
    if(!draft.modes.includes(STATE.currentModes[id])) STATE.currentModes[id] = draft.modes[0] || 'default';
    try{ window.saveTeamRecordOverrides && window.saveTeamRecordOverrides(); }catch(e){}
    scheduleFlushSave();
    try{
      window.renderCharPage && window.renderCharPage(id);
      window.renderTeamOps && window.renderTeamOps();
      window.renderHomes && window.renderHomes();
      window.renderAssets && window.renderAssets();
    }catch(e){}
  }

  function openSolidCharacterEditor(id, section){
    ensureCharacterParity();
    const char = deepClone(ensureCharacterRecord(id));
    char.__id = id;
    const navHtml = SECTION_ORDER.map(s => '<button class="solid-editor-btn" type="button" data-section="'+s.id+'">'+esc(s.label)+'</button>').join('');
    const bodyHtml = SECTION_ORDER.map(s => editorSection(s.id, char)).join('');
    const html = '<div class="modal-title">Edit Character — '+esc(char.name || id)+'</div><div class="small-note" style="margin-bottom:12px">This edits the actual character object, not just the team record shell.</div><div class="solid-editor-shell"><div class="solid-editor-nav">'+navHtml+'</div><div class="solid-editor-body">'+bodyHtml+'<div class="solid-editor-toolbar"><button class="btn btn-ghost" type="button" id="solid-open-team">Edit Team Record</button><button class="btn btn-ghost" type="button" id="solid-open-assets">Assets Vault</button><button class="btn btn-primary" type="button" id="solid-save-character">Save Character</button></div></div></div>';
    window.openModal && window.openModal(html);
    const modalBox = document.getElementById('modal-box');
    if(modalBox) modalBox.classList.add('alpha-modal-wide','solid-editor-modal');
    bindEditorSections(section || 'general');
    bindEditorUploads(id);
    const teamBtn = document.getElementById('solid-open-team');
    const assetsBtn = document.getElementById('solid-open-assets');
    const saveBtn = document.getElementById('solid-save-character');
    if(teamBtn) teamBtn.addEventListener('click', function(){ window.closeModal && window.closeModal(); setTimeout(function(){ (window.openTeamEditor || window.editTeamRecord) && (window.openTeamEditor || window.editTeamRecord)(id); }, 90); });
    if(assetsBtn) assetsBtn.addEventListener('click', function(){ window.closeModal && window.closeModal(); setTimeout(function(){ window.nav && window.nav('assets'); }, 90); });
    if(saveBtn) saveBtn.addEventListener('click', function(){ persistCharacterDraft(id, collectEditorValues(id)); window.closeModal && window.closeModal(); syncToast('Character profile updated'); });
  }

  function installEditorOverride(){
    window.openCharacterEditor = openSolidCharacterEditor;
    window.saveCharacterEditor = function(){ const id = (document.getElementById('char-edit-id')||{}).value; if(id) persistCharacterDraft(id, collectEditorValues(id)); };
  }

  function installHeroActions(){
    CHAR_IDS.forEach(id => {
      const page = document.getElementById('page-'+id);
      if(!page) return;
      page.classList.toggle('solid-aisha-parity', id === 'aisha');
      const hero = page.querySelector('.char-hero');
      if(!hero) return;
      let infoCol = hero.querySelector('.char-hero-main') || hero.children[1] || hero;
      let row = hero.querySelector('.solid-char-actions');
      if(!row){
        row = document.createElement('div');
        row.className = 'solid-char-actions';
        row.innerHTML = '<button class="btn btn-red btn-sm" type="button">Open Gallery</button><button class="btn btn-ghost btn-sm" type="button">Edit Character</button><button class="btn btn-ghost btn-sm" type="button">Edit Team Record</button><button class="btn btn-ghost btn-sm" type="button">Assets Vault</button>';
        infoCol.appendChild(row);
      }
      const buttons = row.querySelectorAll('button');
      if(buttons[0]) buttons[0].onclick = function(){ window.nav && window.nav('gallery'); };
      if(buttons[1]) buttons[1].onclick = function(){ openSolidCharacterEditor(id, 'general'); };
      if(buttons[2]) buttons[2].onclick = function(){ (window.openTeamEditor || window.editTeamRecord) && (window.openTeamEditor || window.editTeamRecord)(id); };
      if(buttons[3]) buttons[3].onclick = function(){ window.nav && window.nav('assets'); };
      let hint = hero.querySelector('.solid-char-subhint');
      if(!hint){
        hint = document.createElement('div');
        hint.className = 'solid-char-subhint';
        hint.textContent = 'Character editor = nested character brain. Team record = operational profile shell.';
        infoCol.appendChild(hint);
      }
    });
  }

  function patchAishaHeroAndTabs(){
    const page = document.getElementById('page-aisha');
    if(!page) return;
    const role = page.querySelector('.char-role');
    if(role) role.textContent = 'Chief Creative Officer · Silva Studios · Johannesburg';
    const quote = page.querySelector('.char-quote');
    if(quote) quote.textContent = '"If it feels vague, it is already drifting."';
    const modeBar = page.querySelector('.char-mode-bar');
    if(modeBar && !modeBar.querySelector('[data-mode="reviewing"]')){
      modeBar.insertAdjacentHTML('beforeend','<span class="char-mode-pill" data-char="aisha" data-mode="reviewing">Reviewing</span>');
    }
  }

  function rememberCharTabs(){
    const oldRender = window.renderCharPage;
    if(!oldRender || oldRender.__solidTabMemory) return;
    window.renderCharPage = function(char){
      STATE.ui = STATE.ui || {};
      STATE.ui.activeCharTabs = ensureObj(STATE.ui.activeCharTabs);
      const stored = STATE.ui.activeCharTabs[char];
      if(stored){
        const tab = document.querySelector('.char-tab[data-char="'+char+'"][data-tab="'+stored+'"]');
        if(tab && !tab.classList.contains('active')){
          document.querySelectorAll('.char-tab[data-char="'+char+'"]').forEach(x => x.classList.remove('active'));
          tab.classList.add('active');
        }
      }
      const out = oldRender(char);
      document.querySelectorAll('.char-tab[data-char="'+char+'"]').forEach(tab => {
        if(tab.__solidRememberBound) return;
        tab.addEventListener('click', function(){
          STATE.ui = STATE.ui || {}; STATE.ui.activeCharTabs = ensureObj(STATE.ui.activeCharTabs); STATE.ui.activeCharTabs[char] = tab.dataset.tab; scheduleFlushSave();
        });
        tab.__solidRememberBound = true;
      });
      return out;
    };
    window.renderCharPage.__solidTabMemory = true;
  }

  function patchAssetNotesCache(){
    if(window.saveAssetNotes && !window.saveAssetNotes.__solidCache){
      const old = window.saveAssetNotes;
      window.saveAssetNotes = function(char){
        const noteEl = document.getElementById('note-'+char);
        if(noteEl){ const asset = readAssetState(char); asset.notes = noteEl.value || ''; writeAssetState(char, asset); }
        old(char);
      };
      window.saveAssetNotes.__solidCache = true;
    }
  }

  function refreshAll(){ ensureCharacterParity(); installEditorOverride(); installHeroActions(); patchAishaHeroAndTabs(); patchAssetNotesCache(); }
  function safeRefresh(){ try{ refreshAll(); }catch(e){ console.warn('legacy solidify refresh failed', e); } }
  function shouldRepeatRefresh(){
    var active = document.querySelector('.page.active');
    var id = active && active.id ? active.id : '';
    return /page-(homes|aisha|leah|claudia|grok|vanya|assets|team)/.test(id);
  }

  installSaveThrottle();
  rememberCharTabs();
  window.addEventListener('load', function(){
    [80, 260, 900].forEach(function(delay){
      setTimeout(function(){ if(shouldRepeatRefresh()) safeRefresh(); }, delay);
    });
  });
  setTimeout(safeRefresh, 0);
})();
