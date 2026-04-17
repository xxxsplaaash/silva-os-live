(function(){
  const PULSE_KEY = 'silva_studio_pulse_v395';
  const PROVIDER_KEY = 'silva_provider_shell_v12';
  const HOME_UI_KEY = 'silva_home_ui_v14';
  const DEFAULT_CHARS = ['aisha','leah','claudia','grok','vanya'];
  const META = {
    aisha:{name:'Aisha Motsepe', role:'Chief Creative Officer', color:'var(--aisha, #b8a8d8)'},
    leah:{name:'Leah Mokoena', role:'Content Intelligence & Trend Analyst', color:'var(--leah, #e1b657)'},
    claudia:{name:'Claudia Naidoo', role:'Client Systems & Operations Specialist', color:'var(--claudia, #8dc1ff)'},
    grok:{name:'Grok / Gerhard Ruan Kroukamp', role:'Technical Systems & Automation Specialist', color:'var(--grok, #8ac49a)'},
    vanya:{name:'Vanya Khumalo', role:'People & Culture Lead · HR & Talent Ops', color:'var(--vanya, #f1b2c8)'}
  };
  function qs(s,r=document){ return r.querySelector(s); }
  function qsa(s,r=document){ return Array.from(r.querySelectorAll(s)); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
  function textNorm(v){ return (v||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function toast(msg){ try{ window.toast ? window.toast(msg) : console.log(msg); }catch(e){ console.log(msg);} }
  function saveStateMaybe(){ try{ window.saveState && window.saveState(); }catch(e){} }
  function loadJSON(key, fallback){ try{ return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key)||'{}')||{}); }catch(e){ return Object.assign({}, fallback); } }
  function saveJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function ensurePages(){
    const main=qs('#main'); if(!main) return;
    if(!qs('#page-settings', main)) main.insertAdjacentHTML('beforeend', `<section class="page" id="page-settings"></section>`);
    if(!qs('#page-providers', main)) main.insertAdjacentHTML('beforeend', `<section class="page" id="page-providers"></section>`);
    if(!qs('.nav-item[data-page="settings"]')){
      const homes = qs('.nav-item[data-page="homes"]');
      if(homes) homes.insertAdjacentHTML('afterend', `<div class="nav-item" data-page="settings"><span class="nav-icon">◌</span> Settings</div>`);
    }
  }
  function activatePage(page){
    qsa('.page').forEach(p=>p.classList.remove('active'));
    qsa('.nav-item').forEach(n=>n.classList.remove('active'));
    const pg = qs('#page-'+page); if(pg) pg.classList.add('active');
    const ni = qs('.nav-item[data-page="'+page+'"]'); if(ni) ni.classList.add('active');
    window.scrollTo(0,0);
  }
  function patchNav(){
    if(window.__silvaV12NavPatched) return;
    const old = window.nav;
    window.nav = function(page){
      if(typeof old === 'function') old(page); else activatePage(page);
      if(page==='homes') setTimeout(renderHomesV12, 10);
      if(page==='settings') setTimeout(renderSettingsV12, 10);
      if(page==='providers') setTimeout(renderProviderShellV12, 10);
      return true;
    };
    window.__silvaV12NavPatched = true;
  }
  function bindSidebar(){
    qsa('.nav-item[data-page="homes"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('homes'); });
    qsa('.nav-item[data-page="settings"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('settings'); });
    qsa('.nav-item[data-page="providers"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('providers'); });
  }
  function teamOrder(){
    try{
      const arr = Array.isArray(window.STATE?.ui?.teamSidebarOrder) ? window.STATE.ui.teamSidebarOrder.slice() : [];
      const out=[]; const seen = new Set();
      DEFAULT_CHARS.forEach(id=>{ if(!seen.has(id)){ out.push(id); seen.add(id);} });
      arr.forEach(id=>{ if(DEFAULT_CHARS.includes(id) && !seen.has(id)){ out.push(id); seen.add(id);} });
      return out;
    }catch(e){ return DEFAULT_CHARS.slice(); }
  }
  function getCharRecord(id){
    const rec = (window.STATE && STATE.teamRecords && STATE.teamRecords[id]) || {};
    const rawChar = (typeof window.getChar === 'function') ? window.getChar(id) : null;
    const char = (rawChar && typeof rawChar === 'object') ? rawChar : {};
    const safeId = id == null ? 'unknown' : String(id);
    const meta = META[safeId] || {name:safeId, role:'', color:'rgba(255,255,255,.7)'};
    return {
      name: rec.name || char.name || meta.name,
      role: rec.role || char.role || meta.role,
      color: meta.color
    };
  }
  function loadPulse(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PULSE_KEY)||'{}') || {};
      return Object.assign({homes:{}}, parsed);
    }catch(e){ return {homes:{}}; }
  }
  function getHomeState(id){
    const pulse = loadPulse();
    const p = (pulse.homes && pulse.homes[id]) || {home:{}, outfits:[null,null,null,null,null,null], items:{}, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.'};
    p.home = p.home || {};
    p.outfits = Array.isArray(p.outfits) ? p.outfits : [null,null,null,null,null,null];
    p.items = p.items || {};
    return p;
  }
  function saveConsistencyNotes(id){
    const pulse = loadPulse();
    pulse.homes = pulse.homes || {};
    pulse.homes[id] = pulse.homes[id] || getHomeState(id);
    const area = qs('#cons-note-'+id);
    pulse.homes[id].notes = area ? area.value : (pulse.homes[id].notes || '');
    try{ localStorage.setItem(PULSE_KEY, JSON.stringify(pulse)); }catch(e){}
    toast('Consistency notes saved');
  }
  window.saveConsistencyNotes = saveConsistencyNotes;
  function copyConsistencySummary(id){
    const rec = getCharRecord(id), p = getHomeState(id);
    const summary = `${rec.name}\nUsage: ${p.usageRule || ''}\nHome: Living room, bedroom, workspace, kitchen, bathroom, exterior\nOutfits: 6 selectable outfit slots\nItems: phone, bag, laptop, car, keys, signature\nNotes: ${p.notes || ''}`;
    navigator.clipboard.writeText(summary).then(()=>toast('Consistency summary copied'));
  }
  window.copyConsistencySummary = copyConsistencySummary;
  function uploadHook(id, group, key){
    if(typeof window.uploadConsistencyRef === 'function') return `window.uploadConsistencyRef('${id}','${group}','${key}')`;
    if(typeof window.uploadHomeAsset === 'function' && group==='home') return `window.uploadHomeAsset('${id}','${key}')`;
    return `void(0)`;
  }
  function slot(src, label, onclick){
    return `<div class="home-slot ${src?'has-img':''}" onclick="${onclick}">${src?`<img src="${src}">`:''}<div class="home-slot-ph">${esc(label)}<br><span style="font-size:.58rem;opacity:.62">Click to upload</span></div></div>`;
  }
  function focusedDetailCard(id){
    const rec = getCharRecord(id); const p = getHomeState(id);
    return `<div class="home-card alpha-home-expanded">`
      + `<div class="home-head"><div><div class="home-title">${esc(rec.name)}</div><div class="home-sub">${esc(rec.role)}</div></div><span class="mode-indicator selective-chip" style="--orbit-color:${rec.color}">Selective refs</span></div>`
      + `<div class="home-body">`
      + `<div class="home-row"><div class="home-key">Usage</div><div class="home-val">${esc(p.usageRule||'Use selectively when relevant to the prompt or scene. Never force these into every generation.')}</div></div>`
      + `<div class="alpha-home-section-title">Home / Exterior</div>`
      + `<div class="home-slots alpha-home-slots">`
      + slot(p.home.livingRoom||'', 'Living room', uploadHook(id,'home','livingRoom'))
      + slot(p.home.bedroom||'', 'Bedroom', uploadHook(id,'home','bedroom'))
      + slot(p.home.workspace||'', 'Workspace', uploadHook(id,'home','workspace'))
      + slot(p.home.kitchen||'', 'Kitchen', uploadHook(id,'home','kitchen'))
      + slot(p.home.bathroom||'', 'Bathroom', uploadHook(id,'home','bathroom'))
      + slot(p.home.exterior||'', 'Exterior', uploadHook(id,'home','exterior'))
      + `</div>`
      + `<div class="alpha-home-section-title">Outfit sets</div>`
      + `<div class="home-slots alpha-home-slots alpha-home-slots-outfits">`
      + [0,1,2,3,4,5].map(i=>slot(p.outfits[i]||'', 'Outfit '+(i+1), uploadHook(id,'outfit',String(i)))).join('')
      + `</div>`
      + `<div class="alpha-home-section-title">Unique items</div>`
      + `<div class="home-slots alpha-home-slots">`
      + slot(p.items.phone||'', 'Phone', uploadHook(id,'item','phone'))
      + slot(p.items.bag||'', 'Bag', uploadHook(id,'item','bag'))
      + slot(p.items.laptop||'', 'Laptop', uploadHook(id,'item','laptop'))
      + slot(p.items.car||'', 'Car', uploadHook(id,'item','car'))
      + slot(p.items.keys||'', 'Keys', uploadHook(id,'item','keys'))
      + slot(p.items.signature||'', 'Signature item', uploadHook(id,'item','signature'))
      + `</div>`
      + `<div class="gen-label" style="margin-top:14px">Consistency notes</div>`
      + `<textarea class="asset-notes" id="cons-note-${id}">${esc(p.notes||'')}</textarea>`
      + `<div class="home-actions"><button class="btn btn-ghost btn-sm" onclick="window.saveConsistencyNotes('${id}')">Save notes</button><button class="btn btn-ghost btn-sm" onclick="window.copyConsistencySummary('${id}')">Copy summary</button></div>`
      + `</div></div>`;
  }
  function buildSlide(id){
    const rec = getCharRecord(id); const p = getHomeState(id);
    return `<div class="alpha-home-fixed-slide" data-home-slide="${id}">`
      + `<div class="alpha-home-fixed-slide-head"><div><div class="alpha-home-fixed-slide-name">${esc(rec.name)}</div><div class="alpha-home-fixed-slide-sub">${esc(rec.role)} · Slide left and right through each person’s selective ref lane.</div></div><div class="alpha-home-fixed-slide-badge">Selective refs</div></div>`
      + `<div class="alpha-home-fixed-slide-grid">`
      + `<div class="alpha-ref-lane"><div class="alpha-ref-lane-title">Home / Exterior</div><div class="alpha-home-slot-grid">`
      + slot(p.home.livingRoom||'', 'Living room', uploadHook(id,'home','livingRoom'))
      + slot(p.home.bedroom||'', 'Bedroom', uploadHook(id,'home','bedroom'))
      + slot(p.home.workspace||'', 'Workspace', uploadHook(id,'home','workspace'))
      + slot(p.home.kitchen||'', 'Kitchen', uploadHook(id,'home','kitchen'))
      + slot(p.home.bathroom||'', 'Bathroom', uploadHook(id,'home','bathroom'))
      + slot(p.home.exterior||'', 'Exterior', uploadHook(id,'home','exterior'))
      + `</div></div>`
      + `<div class="alpha-ref-lane"><div class="alpha-ref-lane-title">Outfit sets</div><div class="alpha-home-slot-grid alpha-outfits-grid">`
      + [0,1,2,3,4,5].map(i=>slot(p.outfits[i]||'', 'Outfit '+(i+1), uploadHook(id,'outfit',String(i)))).join('')
      + `</div></div>`
      + `<div class="alpha-ref-lane"><div class="alpha-ref-lane-title">Unique items</div><div class="alpha-home-slot-grid">`
      + slot(p.items.phone||'', 'Phone', uploadHook(id,'item','phone'))
      + slot(p.items.bag||'', 'Bag', uploadHook(id,'item','bag'))
      + slot(p.items.laptop||'', 'Laptop', uploadHook(id,'item','laptop'))
      + slot(p.items.car||'', 'Car', uploadHook(id,'item','car'))
      + slot(p.items.keys||'', 'Keys', uploadHook(id,'item','keys'))
      + slot(p.items.signature||'', 'Signature item', uploadHook(id,'item','signature'))
      + `</div></div>`
      + `</div>`
      + `<div class="alpha-home-fixed-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="window.__silvaOpenFocusedHome('${id}')">Open ${esc(rec.name.split(' ')[0])}</button></div>`
      + `</div>`;
  }
  function renderHomesV12(){
    const page = qs('#page-homes'); if(!page) return;
    const ids = teamOrder();
    const ui = loadJSON(HOME_UI_KEY, {active:'aisha', view:'focused', search:''});
    let active = ui.active && ids.includes(ui.active) ? ui.active : ids[0];
    const searchVal = ui.search || '';
    page.classList.add('alpha-home-v12-page');
    page.innerHTML = `<div class="page-title">Home System</div>`
      + `<div class="page-sub">Residence, outfit, and item consistency. These references are available when relevant. They are not forced into every generation.</div>`
      + ``
      + `<div class="alpha-home-fixed-toolbar">`
      + `<div class="alpha-home-view-toggle"><button class="btn btn-ghost btn-sm ${ui.view==='focused'?'active-mode':''}" id="home-view-focused" type="button">Focused View</button><button class="btn btn-ghost btn-sm ${ui.view==='all'?'active-mode':''}" id="home-view-all" type="button">All Team View</button></div>`
      + `<input class="search-input" id="home-search" placeholder="Search consistency notes..." value="${esc(searchVal)}">`
      + `</div>`
      + `<div class="alpha-home-fixed-focus alpha-home-system-shell ${ui.view==='all'?'hidden':''}" id="alpha-home-focused">`
      +   `<div class="alpha-home-fixed-shell v13-shell">`
      +     `<div class="alpha-home-fixed-topbar"><div class="alpha-home-fixed-tabs" id="alpha-home-fixed-tabs">` + ids.map(function(id){ const rec=getCharRecord(id); return `<button class="alpha-home-fixed-tab ${id===active?'active':''}" data-home-id="${id}"><span class="alpha-home-menu-dot" style="background:${rec.color}"></span><span class="alpha-home-fixed-tab-copy"><strong>${esc(rec.name)}</strong><span>${esc(rec.role)}</span></span></button>`; }).join('') + `</div></div>`
      +     `<div class="alpha-home-fixed-detailwrap">${focusedDetailCard(active)}</div>`
      +   `</div>`
      + `</div>`
      + `<div class="alpha-home-fixed-carousel alpha-home-system-shell ${ui.view==='all'?'active':''}" id="alpha-home-carousel">`
      +   `<div class="alpha-home-fixed-top"><div><div class="section-title" style="margin-bottom:6px">All Team Refs</div><div class="alpha-settings-note">Slide left and right across each character’s selected ref containers.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="home-slide-prev" type="button">← Prev</button><button class="btn btn-ghost btn-sm" id="home-slide-next" type="button">Next →</button></div></div>`
      +   `<div class="alpha-home-fixed-track" id="alpha-home-track">`+ids.map(buildSlide).join('')+`</div>`
      + `</div>`;
    qs('#home-search', page).addEventListener('input', function(){ ui.search=this.value||''; saveJSON(HOME_UI_KEY, ui); });
    qsa('.alpha-home-fixed-tab', page).forEach(btn=>btn.addEventListener('click', function(){ ui.active=btn.getAttribute('data-home-id'); ui.view='focused'; saveJSON(HOME_UI_KEY, ui); renderHomesV12(); }));
    const focusBtn = qs('#home-view-focused', page), allBtn = qs('#home-view-all', page);
    if(focusBtn) focusBtn.onclick=function(){ ui.view='focused'; saveJSON(HOME_UI_KEY, ui); renderHomesV12(); };
    if(allBtn) allBtn.onclick=function(){ ui.view='all'; saveJSON(HOME_UI_KEY, ui); renderHomesV12(); };
    const track = qs('#alpha-home-track', page), prev = qs('#home-slide-prev', page), next = qs('#home-slide-next', page);
    if(prev && track) prev.onclick=()=>track.scrollBy({left:-track.clientWidth, behavior:'smooth'});
    if(next && track) next.onclick=()=>track.scrollBy({left:track.clientWidth, behavior:'smooth'});
    window.__silvaOpenFocusedHome = function(id){ ui.active=id; ui.view='focused'; saveJSON(HOME_UI_KEY, ui); renderHomesV12(); };
  }
  function providerDefaults(){
    return {
      textPrimary:{provider:'supergrok', model:'', apiKey:''},
      imagePrimary:{provider:'nanobanana', model:'', apiKey:''},
      fallback1:{provider:'gemini', model:'', apiKey:''},
      fallback2:{provider:'manual', model:'', apiKey:''},
      notes:'Keep production keys server-side when you wire the live backend. This page is your control surface for provider order, fallbacks, and quick switching.'
    };
  }
  function loadProviders(){ return Object.assign(providerDefaults(), loadJSON(PROVIDER_KEY, providerDefaults())); }
  function saveProviders(obj){
    saveJSON(PROVIDER_KEY, obj);
    try{
      window.STATE = window.STATE || {};
      STATE.providerSettings = STATE.providerSettings || {};
      STATE.providerSettings.defaultTextProvider = obj.textPrimary.provider || 'supergrok';
      STATE.providerSettings.defaultImageProvider = obj.imagePrimary.provider || 'nanobanana';
    }catch(e){}
    saveStateMaybe();
    toast('Provider shell saved');
  }
  function providerEditorHTML(cfg){
    function block(prefix,title,data){
      return `<div class="alpha-provider-card"><div class="section-title">${title}</div><div class="alpha-provider-grid">`
        + `<div><div class="field-label">Provider</div><input class="field-input" id="${prefix}-provider" value="${esc(data.provider||'')}"></div>`
        + `<div><div class="field-label">Model</div><input class="field-input" id="${prefix}-model" value="${esc(data.model||'')}"></div>`
        + `<div style="grid-column:1 / -1"><div class="field-label">API key</div><input class="field-input" id="${prefix}-key" value="${esc(data.apiKey||'')}" placeholder="Paste key"></div>`
        + `</div></div>`;
    }
    return `<div class="alpha-provider-stack">`
      + `<div class="alpha-provider-card"><div class="section-title">Provider routing</div><div class="alpha-settings-note">Add or edit your primary providers and fallback keys here. This is the place to switch models without digging through random files.</div></div>`
      + block('prov-text','Primary text provider', cfg.textPrimary)
      + block('prov-image','Primary image provider', cfg.imagePrimary)
      + block('prov-fallback1','Fallback 1', cfg.fallback1)
      + block('prov-fallback2','Fallback 2', cfg.fallback2)
      + `<div class="alpha-provider-card"><div class="section-title">Notes</div><textarea class="field-textarea" id="prov-notes" style="min-height:110px">${esc(cfg.notes||'')}</textarea><div class="alpha-provider-actions"><button class="btn btn-primary" type="button" id="save-provider-shell">Save provider shell</button></div></div>`
      + `</div>`;
  }
  function collectProviderForm(root){
    function v(id){ return (qs('#'+id, root)||{}).value || ''; }
    return {
      textPrimary:{provider:v('prov-text-provider').trim(), model:v('prov-text-model').trim(), apiKey:v('prov-text-key')},
      imagePrimary:{provider:v('prov-image-provider').trim(), model:v('prov-image-model').trim(), apiKey:v('prov-image-key')},
      fallback1:{provider:v('prov-fallback1-provider').trim(), model:v('prov-fallback1-model').trim(), apiKey:v('prov-fallback1-key')},
      fallback2:{provider:v('prov-fallback2-provider').trim(), model:v('prov-fallback2-model').trim(), apiKey:v('prov-fallback2-key')},
      notes:v('prov-notes')
    };
  }
  function bindProviderEditor(root){ const btn = qs('#save-provider-shell', root); if(btn) btn.onclick = function(){ saveProviders(collectProviderForm(root)); }; }
  function renderProviderShellV12(){
    const page = qs('#page-providers'); if(!page) return;
    const cfg = loadProviders();
    page.innerHTML = `<div class="page-title">Provider Shell</div><div class="page-sub">Primary + fallback routing, model switching, and API key management inside the system.</div><div class="alpha-provider-stack">${providerEditorHTML(cfg)}<div class="alpha-provider-card"><div class="section-title">Current defaults</div><div class="profile-item">Text: ${esc(cfg.textPrimary.provider||'—')}</div><div class="profile-item">Image: ${esc(cfg.imagePrimary.provider||'—')}</div><div class="profile-item">Fallback 1: ${esc(cfg.fallback1.provider||'—')}</div><div class="profile-item">Fallback 2: ${esc(cfg.fallback2.provider||'—')}</div></div></div>`;
    bindProviderEditor(page);
  }
  function renderSettingsV12(){
    const page = qs('#page-settings'); if(!page) return;
    const cfg = loadProviders();
    const homeCfg = loadJSON(HOME_UI_KEY, {view:'focused', active:'aisha', search:''});
    page.innerHTML = `<div class="page-title">Settings</div><div class="page-sub">System controls, home defaults, and provider routing in one place.</div><div class="alpha-settings-grid"><div class="alpha-provider-card"><div class="section-title">Home System defaults</div><div><div class="field-label">Default view</div><select class="filter-select" id="settings-home-view"><option value="focused">Focused view</option><option value="all">All team view</option></select></div><div class="alpha-provider-actions"><button class="btn btn-ghost" id="settings-save-home" type="button">Save home settings</button></div><div class="alpha-settings-note" style="margin-top:12px">Focused view keeps the selected ref surface clean. All team view turns the page into a left/right comparison lane.</div></div><div><div class="alpha-provider-card"><div class="section-title">Provider keys + fallbacks</div>${providerEditorHTML(cfg)}</div></div></div>`;
    const sel = qs('#settings-home-view', page); if(sel) sel.value = homeCfg.view || 'focused';
    const saveHome = qs('#settings-save-home', page); if(saveHome) saveHome.onclick = function(){ homeCfg.view = sel.value; saveJSON(HOME_UI_KEY, homeCfg); toast('Home settings saved'); };
    bindProviderEditor(page);
  }
  function cleanGeneratorLayout(){
    const page = qs('#page-generator'); if(!page) return;
    qsa('.gen-grid', page).forEach(el=>{ el.classList.add('alpha-gen-fixed-grid'); });
    qsa('.gen-output, #gen-output-panel', page).forEach(el=>{ el.classList.add('alpha-gen-output-fix'); });
    qsa('*', page).forEach(el=>{
      if(textNorm(el.textContent)==='ai actions'){
        el.classList.add('alpha-gen-actions-title');
        const box = el.parentElement;
        if(box) box.classList.add('alpha-gen-actions-box');
      }
    });
  }
  window.renderHomes = renderHomesV12;
  window.renderHomes.__shelfFixV13 = true;
  window.openProviderShell = renderProviderShellV12;
  window.openSettingsShell = renderSettingsV12;

  function onReady(){
    ensurePages();
    patchNav();
    bindSidebar();
    cleanGeneratorLayout();
    if(qs('#page-homes')) renderHomesV12();
    if(qs('#page-settings')) renderSettingsV12();
    if(qs('#page-providers')) renderProviderShellV12();
  }
  window.addEventListener('load', function(){ setTimeout(onReady,100); setTimeout(onReady,500); setTimeout(onReady,1200); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(onReady,150); });
  new MutationObserver(function(){ setTimeout(onReady, 50); }).observe(document.documentElement,{childList:true,subtree:true});
})();
