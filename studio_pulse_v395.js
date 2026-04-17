
(function(){
  const css = `
  #sidebar{overflow-y:auto !important; overflow-x:hidden !important; max-height:100vh !important;}
  #sidebar::-webkit-scrollbar{width:8px !important;}
  #sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18) !important; border-radius:999px !important;}
  .nav-item[data-page="gallery"], .nav-item[data-page="homes"], .nav-item[data-page="analytics"]{display:flex !important;}
  `;
  const style = document.createElement('style');
  style.id = 'studio-pulse-v396-style';
  style.textContent = css;
  document.head.appendChild(style);
})();


(() => {
  'use strict';
  if (window.__STUDIO_PULSE_V395__) return;
  window.__STUDIO_PULSE_V395__ = true;
  window.__ROOM_SUBSYSTEM_LOCKED = true;

  const STORE_KEY = 'silva_studio_pulse_v395';
  const CHARS = {
    studio: { label: 'Studio', role: 'Silva OS' },
    leah: { label: 'Leah Mokoena', role: 'Content intelligence' },
    claudia: { label: 'Claudia Naidoo', role: 'Client systems' },
    grok: { label: 'Grok / Gerhard', role: 'Technical systems' },
    vanya: { label: 'Vanya Khumalo', role: 'People & culture' }
  };
  const DEFAULT = {
    mode: 'direction',
    history: [],
    lastResponse: null,
    lastMeta: null,
    homes: {},
    assetHints: {}
  };
  let pulseState = loadPulse();

  function byId(id){ return document.getElementById(id); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function loadPulse(){ try { return Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch(e){ return {...DEFAULT}; } }
  function savePulse(){ try { localStorage.setItem(STORE_KEY, JSON.stringify(pulseState)); } catch(e){} }

  function ensureState(){
    window.STATE = window.STATE || {};
    STATE.consistencyLab = STATE.consistencyLab || pulseState.homes || {};
    STATE.assetHints = STATE.assetHints || pulseState.assetHints || {};
  }

  function patchChrome(){
    const homeNav = document.querySelector('.nav-item[data-page="home"]');
    if (homeNav) homeNav.innerHTML = '<span class="nav-icon">⬡</span>Studio Pulse';
    const logoSub = document.querySelector('.logo-sub');
    if (logoSub) logoSub.textContent = 'AI Division OS · v3.9.7a';
    const footer = document.querySelector('.sidebar-footer div:last-child');
    if (footer) footer.textContent = 'v3.9.7a · Silva Studios AI Division';
  }

  function studioHomeMarkup(){
    const resp = pulseState.lastResponse;
    const lead = resp?.lead || 'studio';
    const support = resp?.supportingLead || '';
    const counts = consistencyCounts();
    return `
    <div class="cc-shell v395-shell">
      <div class="cc-column">
        <div class="cc-glass cc-side-card">
          <div class="cc-sub">Studio pulse</div><div class="small-note" style="margin-top:6px;color:var(--muted2);font-size:.7rem">Strategic guidance, continuity memory, and cleaner internal coordination</div>
          <div class="cc-title" style="font-size:1.15rem;margin-bottom:8px">Studio guidance</div>
          <div class="cc-copy" style="margin:0 0 16px 0">Prompt review, continuity pressure, asset awareness, and the next move that actually matters.</div>
          <div class="cc-chip-row">
            <span class="cc-chip">v3.9.7a</span>
            <span class="cc-chip">Prompt-first</span>
            <span class="cc-chip">Consistency-aware</span>
            <span class="cc-chip">Gallery central</span>
          </div>
        </div>
        <div class="cc-glass cc-side-card">
          <div class="cc-sub">Quick modes</div>
          <div class="cc-quickasks" style="margin-top:10px">
            <button data-mode="direction">Direction</button>
            <button data-mode="consistency">Consistency</button>
            <button data-mode="prompt">Prompt fix</button>
            <button data-mode="assets">Asset gap check</button>
            <button data-mode="content">Content planning</button>
          </div>
          <div class="small-note" style="margin-top:10px;color:var(--muted2);font-size:.72rem;line-height:1.6">Current mode: <strong>${esc(pulseState.mode)}</strong></div>
        </div>
        <div class="cc-glass cc-side-card">
          <div class="cc-sub">Consistency snapshot</div>
          <div class="cc-state-list" style="margin-top:10px">
            <div class="cc-state-item"><div class="b">Home refs: ${counts.home}<br>Outfit refs: ${counts.outfits}<br>Item refs: ${counts.items}<br>Vehicle refs: ${counts.vehicles}</div></div>
          </div>
          <div class="cc-inline-actions" style="margin-top:12px"><button class="btn btn-ghost btn-sm" id="sp-open-homes">Open Home System</button><button class="btn btn-ghost btn-sm" id="sp-open-assets">Open Assets Vault</button><button class="btn btn-ghost btn-sm" id="sp-open-gallery">Open Gallery</button></div>
        </div>
      </div>
      <div class="cc-column">
        <div class="cc-glass cc-lounge">
          <div class="cc-toolbar"><div class="cc-toolbar-left"><div class="cc-target">mode <strong>${esc(pulseState.mode)}</strong></div></div><div class="cc-toolbar-right"><button class="btn btn-ghost btn-sm" id="sp-clear">Clear response</button></div></div>
          <div class="ai-ask-box">
            <textarea id="sp-input" class="field-textarea cc-ask" placeholder="Ask the studio what to improve, what assets are missing, how to strengthen a prompt, or what to focus on next."></textarea>
            <div class="cc-quickasks" style="margin-bottom:12px">
              <button data-q="What should we focus on next to strengthen the app?">What should we focus on?</button>
              <button data-q="What consistency references are missing for the characters?">What refs are missing?</button>
              <button data-q="How can we improve the current prompt system without making it noisy?">Improve prompts</button>
              <button data-q="What should the Home System track to strengthen visual consistency?">Improve Home System</button>
            </div>
            <div class="flex items-center gap-12 flex-wrap"><button class="btn btn-primary" id="sp-send">Ask Studio Pulse</button><div class="cc-replying" id="sp-status"></div></div>
          </div>
          <div class="ai-helper-panel" style="margin-top:16px">
            <div class="output-label">Studio response</div><div class="small-note" style="margin:6px 0 10px;color:var(--muted2);font-size:.72rem">${esc((pulseState.lastMeta?.provider || 'studio') + (pulseState.lastMeta?.model ? ' · ' + pulseState.lastMeta.model : '') + (pulseState.lastMeta?.fallback ? ' · fallback' : '') + (pulseState.lastMeta?.resolvedFromHistory ? ' · context-resolved' : '') + (pulseState.lastMeta?.clarification ? ' · clarification' : ''))}</div>
            ${resp ? `
              <div class="output-text" id="sp-summary">${esc(resp.summary || '')}</div>
              <div class="grid2" style="margin-top:14px;gap:12px">
                <div class="card card-sm"><div class="output-label">Lead perspective</div><div class="text-sm text-silver"><strong>${esc(CHARS[lead]?.label || lead)}</strong><br>${esc(resp.leadPerspective || '')}</div></div>
                <div class="card card-sm"><div class="output-label">Supporting perspective</div><div class="text-sm text-silver">${support ? `<strong>${esc(CHARS[support]?.label || support)}</strong><br>${esc(resp.supportingPerspective || '')}` : 'None needed right now.'}</div></div>
              </div>
              <div class="grid2" style="margin-top:14px;gap:12px">
                <div class="card card-sm"><div class="output-label">Actions</div><div class="text-sm text-silver">${(resp.actions || []).map(x => '• ' + esc(x)).join('<br>') || '—'}</div></div>
                <div class="card card-sm"><div class="output-label">Consistency checks</div><div class="text-sm text-silver">${(resp.consistencyChecks || []).map(x => '• ' + esc(x)).join('<br>') || '—'}</div></div>
              </div>
              <div class="grid2" style="margin-top:14px;gap:12px">
                <div class="card card-sm"><div class="output-label">Suggested assets</div><div class="text-sm text-silver">${(resp.suggestedAssets || []).map(x => '• ' + esc(x)).join('<br>') || '—'}</div></div>
                <div class="card card-sm"><div class="output-label">Prompt ideas</div><div class="text-sm text-silver">${(resp.promptIdeas || []).map(x => '• ' + esc(x)).join('<br>') || '—'}</div></div>
              </div>
            ` : `<div class="cc-empty">Studio Pulse is ready. Ask one real thing and it will answer as a studio system, not a chat room.</div>`}
          </div>
        </div>
      </div>
      <div class="cc-column">
        <div class="cc-glass cc-side-card">
          <div class="cc-sub">Recent asks</div>
          <div class="cc-session">${(pulseState.history || []).slice(0,8).map(item => `<div class="cc-session-item"><span class="m">${esc(item.mode)} · ${esc(item.ts || '')}</span>${esc(item.q)}</div>`).join('') || '<div class="cc-session-item"><span class="m">ready</span>No recent asks.</div>'}</div>
        </div>
        <div class="cc-glass cc-side-card">
          <div class="cc-sub">Current standards</div>
          <div class="cc-state-list">
            <div class="cc-state-item"><div class="b">1. Prompt and image workflow first.</div></div>
            <div class="cc-state-item"><div class="b">2. Home System becomes a true consistency system.</div></div>
            <div class="cc-state-item"><div class="b">3. Item refs stay selective, never forced into every generation.</div></div>
            <div class="cc-state-item"><div class="b">4. Gallery stays central to review and drift tracking.</div></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function consistencyCounts(){
    ensureState();
    const profiles = pulseState.homes || {};
    let home=0, outfits=0, items=0, vehicles=0;
    Object.values(profiles).forEach((p) => {
      home += ['livingRoom','bedroom','kitchen','bathroom','workspace','exterior'].filter(k => p?.home?.[k]).length;
      outfits += Array.isArray(p?.outfits) ? p.outfits.filter(Boolean).length : 0;
      items += Object.entries(p?.items || {}).filter(([k,v]) => k !== 'car' && !!v).length;
      vehicles += p?.items?.car ? 1 : 0;
    });
    return { home, outfits, items, vehicles };
  }

  function renderStudioPulseHome(){
    patchChrome();
    const page = byId('page-home');
    if (!page) return;
    page.innerHTML = `<div class="page-title">Studio Pulse</div><div class="page-sub">Strategic guidance, system memory, review pressure, and continuity support.</div>${studioHomeMarkup()}`;
    bindStudioPulseHome();
  }

  
  function inferQuestionMode(question, currentMode){
    const q = String(question || '').toLowerCase().trim();
    if (!q) return currentMode || 'direction';
    if (/(who|smartest|coolest|trendiest|oldest|funniest|serious|focused|surname|how many characters)/.test(q)) return 'direction';
    if (/(home|room|outfit|car|phone|item|asset|reference|refs)/.test(q)) return 'assets';
    if (/(prompt|generator|caption)/.test(q)) return 'prompt';
    if (/(plan|content|campaign|post|calendar)/.test(q)) return 'content';
    return currentMode || 'direction';
  }

  function clientFallbackStudioPulse(question){
    return {
      title:'Studio response',
      summary:'Studio Pulse could not get a clean answer just now. Retry once or check that Gemini is connected.',
      lead:'studio',
      leadPerspective:'This should only appear when the request fails before the server returns a usable response.',
      supportingLead:'',
      supportingPerspective:'',
      actions:['Retry the question once.','Check that GEMINI_API_KEY is available in the local .env.'],
      consistencyChecks:['Do not rely on the client fallback for normal use.'],
      suggestedAssets:[],
      promptIdeas:[]
    };
  }
async function askStudioPulse(question){
    const status = byId('sp-status');
    const q = String(question || '').trim();
    if (!q) return;
    const requestMode = inferQuestionMode(q, pulseState.mode);
    if (status) status.textContent = 'Studio Pulse is thinking...';
    try {
      const res = await fetch('/api/studio/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, mode: requestMode, counts: consistencyCounts(), history: pulseState.history || [] })
      });
      const payload = await res.json();
      if (!payload?.ok) throw new Error(payload?.error || 'Studio Pulse failed.');
      const parsed = payload?.response || clientFallbackStudioPulse(q);
      pulseState.lastResponse = parsed;
      pulseState.lastMeta = {
        provider: payload?.provider || 'studio',
        model: payload?.model || '',
        fallback: !!payload?.fallback,
        clarification: !!payload?.clarification,
        resolvedFromHistory: !!payload?.resolvedFromHistory,
        mode: payload?.mode || requestMode
      };
      pulseState.history.unshift({
        q,
        mode: requestMode,
        ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }),
        summary: parsed?.summary || ''
      });
      pulseState.history = pulseState.history.slice(0, 20);
      savePulse();
      renderStudioPulseHome();
    } catch (e) {
      pulseState.lastResponse = clientFallbackStudioPulse(q);
      pulseState.lastMeta = { provider:'studio', model:'', fallback:true, clarification:false, resolvedFromHistory:false, mode: requestMode };
      pulseState.history.unshift({ q, mode: requestMode, ts: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }), summary: '' });
      pulseState.history = pulseState.history.slice(0, 20);
      savePulse();
      renderStudioPulseHome();
    }
    if (status) status.textContent = '';
  }

  function bindStudioPulseHome(){
    document.querySelectorAll('[data-mode]').forEach(btn => btn.onclick = () => { pulseState.mode = btn.getAttribute('data-mode') || 'direction'; savePulse(); renderStudioPulseHome(); });
    document.querySelectorAll('[data-q]').forEach(btn => btn.onclick = () => { const input = byId('sp-input'); if (input) { input.value = btn.getAttribute('data-q') || ''; input.focus(); } });
    const send = byId('sp-send'); if (send) send.onclick = () => { const input = byId('sp-input'); const q = String(input?.value || '').trim(); if (!q) return; input.value=''; askStudioPulse(q); };
    const input = byId('sp-input'); if (input) input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const q = String(input.value || '').trim(); if (!q) return; input.value=''; askStudioPulse(q); } };
    const clear = byId('sp-clear'); if (clear) clear.onclick = () => { pulseState.lastResponse = null; pulseState.lastMeta = null; savePulse(); renderStudioPulseHome(); };
    const openHomes = byId('sp-open-homes'); if (openHomes) openHomes.onclick = () => window.nav && window.nav('homes');
    const openAssets = byId('sp-open-assets'); if (openAssets) openAssets.onclick = () => window.nav && window.nav('assets');
    const openGallery = byId('sp-open-gallery'); if (openGallery) openGallery.onclick = () => window.nav && window.nav('gallery');
  }

  function ensureHomeSystemState(){
    ensureState();
    pulseState.homes = pulseState.homes || {};
    ['leah','claudia','grok','vanya'].forEach(id => {
      pulseState.homes[id] = pulseState.homes[id] || { home:{}, outfits:[null,null,null,null,null,null], items:{ phone:null, car:null, bag:null, laptop:null, keys:null, eyewear:null, signature:null }, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' };
    });
    savePulse();
  }

  function renderHomesV395(){
    ensureHomeSystemState();
    const page = byId('page-homes');
    if (!page) return;
    const filter = byId('home-char')?.value || 'all';
    const search = (byId('home-search')?.value || '').toLowerCase();
    const ids = ['leah','claudia','grok','vanya'].filter(id => (filter === 'all' || filter === id) && (!search || (id + ' ' + JSON.stringify(pulseState.homes[id] || {})).toLowerCase().includes(search)));
    page.innerHTML = `<div class="page-title">Home System</div><div class="page-sub">Residence, outfit, and item consistency. These references are available to the system when relevant. They are not forced into every generation.</div>
      <div class="planner-tip">Item references are optional anchors. A phone, car, bag, or home reference should only be used when the scene truly benefits from it.</div>
      <div class="filter-bar"><select class="filter-select" id="home-char"><option value="all">All Characters</option><option value="leah">Leah</option><option value="claudia">Claudia</option><option value="grok">Grok</option><option value="vanya">Vanya</option></select><input class="search-input" id="home-search" placeholder="Search consistency notes..."></div>
      <div class="home-grid" id="homes-grid">${ids.map(homeProfileCard).join('')}</div>`;
    byId('home-char').value = filter;
    byId('home-search').value = search;
    byId('home-char').onchange = renderHomesV395;
    byId('home-search').oninput = renderHomesV395;
  }

  function homeProfileCard(id){
    const c = (window.getChar && window.getChar(id)) || CHARS[id] || { name:id, role:'' };
    const p = pulseState.homes[id];
    return `<div class="home-card">
      <div class="home-head"><div><div class="home-title">${esc(c.name || c.label)}</div><div class="home-sub">${esc(c.role || '')}</div></div><span class="mode-indicator">Selective refs</span></div>
      <div class="home-body">
        <div class="home-row"><div class="home-key">Usage</div><div class="home-val">${esc(p.usageRule)}</div></div>
        <div class="section-title" style="font-size:.7rem;margin:14px 0 8px">Home / Exterior</div>
        <div class="home-slots home-slots-3">${slotHtml(id,'home','livingRoom','Living room')}${slotHtml(id,'home','bedroom','Bedroom')}${slotHtml(id,'home','workspace','Workspace')}${slotHtml(id,'home','kitchen','Kitchen')}${slotHtml(id,'home','bathroom','Bathroom')}${slotHtml(id,'home','exterior','Exterior')}</div>
        <div class="section-title" style="font-size:.7rem;margin:14px 0 8px">Outfit sets</div>
        <div class="home-slots home-slots-3">${[0,1,2,3,4,5].map(i => slotHtml(id,'outfit',String(i),'Outfit '+(i+1))).join('')}</div>
        <div class="section-title" style="font-size:.7rem;margin:14px 0 8px">Unique items</div>
        <div class="home-slots home-slots-3">${slotHtml(id,'item','phone','Phone')}${slotHtml(id,'item','car','Car')}${slotHtml(id,'item','bag','Bag')}${slotHtml(id,'item','laptop','Laptop')}${slotHtml(id,'item','keys','Keys')}${slotHtml(id,'item','signature','Signature item')}</div>
        <div class="gen-label" style="margin-top:12px">Consistency notes</div>
        <textarea class="asset-notes" id="cons-note-${id}" placeholder="What should the system know about these spaces, outfits, and objects?">${esc(p.notes || '')}</textarea>
        <div class="home-actions"><button class="btn btn-ghost btn-sm" onclick="window.saveConsistencyNotes('${id}')">Save notes</button><button class="btn btn-ghost btn-sm" onclick="window.copyConsistencySummary('${id}')">Copy summary</button></div>
      </div>
    </div>`;
  }

  function slotHtml(id, kind, key, label){
    const src = getSlot(id, kind, key);
    return `<div class="home-slot ${src ? 'has-img' : ''}" onclick="window.uploadConsistencyRef('${id}','${kind}','${key}')">${src ? `<img src="${src}">` : ''}<div class="home-slot-ph">${esc(label)}<br><span style="font-size:.58rem;opacity:.6">Click to upload</span></div></div>`;
  }

  function getSlot(id, kind, key){
    const p = pulseState.homes[id] || {};
    if (kind === 'home') return p.home?.[key] || '';
    if (kind === 'outfit') return p.outfits?.[Number(key)] || '';
    if (kind === 'item') return p.items?.[key] || '';
    return '';
  }

  function setSlot(id, kind, key, value){
    const p = pulseState.homes[id] || (pulseState.homes[id] = { home:{}, outfits:[null,null,null,null,null,null], items:{}, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.' });
    if (kind === 'home') { p.home = p.home || {}; p.home[key] = value; }
    if (kind === 'outfit') { p.outfits = p.outfits || [null,null,null,null,null,null]; p.outfits[Number(key)] = value; }
    if (kind === 'item') { p.items = p.items || {}; p.items[key] = value; }
    savePulse();
  }

  window.uploadConsistencyRef = function(id, kind, key){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { setSlot(id, kind, key, reader.result); renderHomesV395(); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  window.saveConsistencyNotes = function(id){
    const p = pulseState.homes[id];
    if (!p) return;
    const val = byId('cons-note-' + id)?.value || '';
    p.notes = val;
    savePulse();
    renderHomesV395();
  };

  window.copyConsistencySummary = function(id){
    const p = pulseState.homes[id];
    if (!p) return;
    const summary = [
      `Character: ${CHARS[id]?.label || id}`,
      `Usage rule: ${p.usageRule}`,
      `Home refs: ${Object.keys(p.home || {}).filter(k => p.home[k]).join(', ') || 'none'}`,
      `Outfit refs: ${(p.outfits || []).filter(Boolean).length}`,
      `Item refs: ${Object.keys(p.items || {}).filter(k => p.items[k]).join(', ') || 'none'}`,
      `Notes: ${p.notes || 'none'}`
    ].join('\n');
    navigator.clipboard.writeText(summary).then(() => { if (window.toast) toast('Consistency summary copied'); });
  };

  function patchGeneratorForConsistency(){
    if (window.__V395_GENERATOR_PATCHED) return;
    window.__V395_GENERATOR_PATCHED = true;
    const oldGenerate = window.generateFullKit;
    if (typeof oldGenerate !== 'function') return;
    window.generateFullKit = function(){
      oldGenerate();
      try {
        const panel = byId('gen-output-panel');
        const char = byId('g-char')?.value || 'leah';
        const profile = pulseState.homes[char] || {};
        const relevant = [
          profile.home?.workspace && 'workspace / interior ref',
          profile.home?.livingRoom && 'living room ref',
          profile.home?.exterior && 'exterior ref',
          (profile.outfits || []).filter(Boolean).length ? 'outfit set refs' : '',
          profile.items?.phone && 'phone ref (only if scene needs it)',
          profile.items?.car && 'car ref (only if scene needs it)',
          profile.items?.bag && 'bag ref',
          profile.items?.laptop && 'laptop ref'
        ].filter(Boolean);
        if (panel && !panel.querySelector('.v395-consistency-block')) {
          panel.insertAdjacentHTML('beforeend', `<div class="output-block v395-consistency-block"><div class="output-label">Selective consistency references</div><div class="output-text">${relevant.length ? esc(relevant.join(' · ')) : 'No extra consistency refs stored yet for this character.'}<br><br>Rule: use these only if the scene genuinely benefits from them. Do not force props into every generation.</div></div>`);
        }
      } catch (e) { console.warn(e); }
    };
  }

  function install(){
    patchChrome();
    ensureHomeSystemState();
    patchGeneratorForConsistency();

    // hard-disable old room/chat globals
    const noOp = function(){};
    window.__ROOM_SUBSYSTEM_LOCKED = true;
    window.RoomSubsystem = undefined;
    window.askRoom396 = noOp;
    window.askStudio = noOp;
    window.v393AskRoom = noOp;
    window.v393AskSelected = noOp;
    window.generateStudioConversation = noOp;
    window.refreshStudioPulse = noOp;
    window.localSelected = noOp;
    window.roomViaGemini396 = noOp;
    window.pushTone = noOp;
    window.pushTone393 = noOp;
    window.v396ResetThread = noOp;
    window.resetRoomThread = noOp;
    if (typeof window.buildEvent === 'function') window.buildEvent = function(){ return { type:'noop_v395', payload:{}, target:'studio' }; };

    // override home/homes renderers
    window.renderHomeComms = noOp;
    window.renderHome393 = renderStudioPulseHome;
    window.renderHome396 = renderStudioPulseHome;
    window.renderHomeAlive = renderStudioPulseHome;
    window.renderHome = renderStudioPulseHome;
    window.renderHomes = renderHomesV395;

    const oldNav = window.nav;
    if (typeof oldNav === 'function' && !window.__V395_NAV_WRAPPED) {
      window.__V395_NAV_WRAPPED = true;
      window.nav = function(page){
        const out = oldNav.call(this, page);
        if (page === 'home') setTimeout(renderStudioPulseHome, 0);
        if (page === 'homes') setTimeout(renderHomesV395, 0);
        return out;
      };
    }

    setTimeout(() => {
      try { if (document.getElementById('page-home')?.classList.contains('active')) renderStudioPulseHome(); } catch(e){}
      try { if (document.getElementById('page-homes')) renderHomesV395(); } catch(e){}
    }, 0);
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (document.getElementById('page-home')?.classList.contains('active')) renderStudioPulseHome();
        if (document.getElementById('page-homes')) renderHomesV395();
      }, 0);
    });
  }

  install();
})();
