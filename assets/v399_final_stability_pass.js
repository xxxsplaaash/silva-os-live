(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}

  function scrollMainTop(){
    var main = qs('#main');
    if(main) main.scrollTop = 0;
    window.scrollTo(0,0);
  }

  function normalizeHomeClicks(){
    var page = qs('#page-homes');
    if(!page || page.dataset.v399FitClicks==='1') return;
    page.dataset.v399FitClicks='1';
    page.addEventListener('click', function(e){
      var btn = e.target.closest('.alpha-home-fixed-tab');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute('data-home-id');
      try{
        var key = 'silva_home_ui_v12';
        var ui = JSON.parse(localStorage.getItem(key) || '{}');
        ui.active = id;
        ui.view = 'focused';
        localStorage.setItem(key, JSON.stringify(ui));
      }catch(err){}
      if(typeof window.renderHomesV12 === 'function') raf(function(){ window.renderHomesV12(); });
    }, true);
  }

  function normalizeCharPills(){
    qsa('.char-mode-pill').forEach(function(el){
      var txt = (el.textContent || '').replace(/\s+/g,' ').trim();
      if(txt) el.setAttribute('aria-label', txt);
    });
  }

  function wrapNavScrollReset(){
    if(typeof window.nav !== 'function' || window.nav.__v399FitWrapped) return;
    var original = window.nav;
    var wrapped = function(){
      var out = original.apply(this, arguments);
      raf(function(){
        scrollMainTop();
        normalizeHomeClicks();
        normalizeCharPills();
      });
      return out;
    };
    wrapped.__v399FitWrapped = true;
    window.nav = wrapped;
  }

  function boot(){
    scrollMainTop();
    normalizeHomeClicks();
    normalizeCharPills();
    wrapNavScrollReset();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();


/* SILVA_SOURCE_FIX_RUNTIME */
(function(){
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function cleanupBadRuntime(){
    qsa('.silva-elite-glare,.silva-elite-ripple,.silva-text-pulse,.silva-stable-pulse').forEach(el => {
      if (el.classList.contains('silva-elite-glare') || el.classList.contains('silva-elite-ripple')) el.remove();
      else {
        el.classList.remove('silva-text-pulse');
        el.classList.remove('silva-stable-pulse');
      }
    });

    qsa('#silva-live-edit-btn,#silva-live-edit-backdrop,#silva-cloud-edit-btn,#silva-cloud-edit-backdrop').forEach(el => el.remove());

    qsa('#page-settings input,#page-settings textarea,#page-settings select,#page-aisha input,#page-aisha textarea,#page-aisha select,#page-leah input,#page-leah textarea,#page-leah select,#page-claudia input,#page-claudia textarea,#page-claudia select,#page-grok input,#page-grok textarea,#page-grok select,#page-vanya input,#page-vanya textarea,#page-vanya select').forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.zIndex = '4';
      if (el.disabled) el.disabled = false;
    });

    qsa('#page-settings input,#page-settings textarea').forEach(el => {
      const txt = (((el.closest('.card,div')||{}).textContent)||'') + ' ' + (el.placeholder||'');
      if (/api key|provider routing|primary text provider|primary image provider|fallback/i.test(txt)) {
        el.readOnly = true;
        if (!el.value) el.placeholder = 'Managed in Render environment';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupBadRuntime, { once:true });
  } else {
    cleanupBadRuntime();
  }

  const mo = new MutationObserver(() => cleanupBadRuntime());
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();


/* SILVA_ACTUAL_SOURCE_FIX_V2 */
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const IDS = ['aisha','leah','claudia','grok','vanya'];

  function removeBadInjectedUi(){
    qsa('#silva-live-edit-btn,#silva-live-edit-backdrop,#silva-cloud-edit-btn,#silva-cloud-edit-backdrop').forEach(el => el.remove());
    qsa('.silva-elite-glare,.silva-elite-ripple').forEach(el => el.remove());
    qsa('.silva-text-pulse,.silva-stable-pulse').forEach(el => {
      el.classList.remove('silva-text-pulse');
      el.classList.remove('silva-stable-pulse');
    });
  }

  function normalizeVersions(){
    qsa('body *').forEach(el => {
      if (el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      if (/v3\.9\.7a?/i.test(txt) || /v3\.9\.8/i.test(txt)) {
        el.textContent = txt.replace(/v3\.9\.7a?/ig, 'v3.9.9').replace(/v3\.9\.8/ig, 'v3.9.9');
      }
    });
  }

  function markTabRows(){
    IDS.forEach(id => {
      const page = qs('#page-' + id);
      if (!page) return;
      const firstTab = qs('.char-tab', page);
      if (firstTab && firstTab.parentElement) {
        firstTab.parentElement.classList.add('silva-char-tab-row');
      }
    });
  }

  function lockHostedProviderFields(){
    const page = qs('#page-settings');
    if (!page) return;

    qsa('input,textarea', page).forEach(el => {
      const wrapTxt = ((el.closest('.card,div') || {}).textContent || '') + ' ' + (el.placeholder || '');
      if (/api key|provider routing|primary text provider|primary image provider|fallback/i.test(wrapTxt)) {
        el.readOnly = true;
        if (!el.value) el.placeholder = 'Managed in Render environment';
      }
    });

    if (!qs('.silva-env-note', page)) {
      const note = document.createElement('div');
      note.className = 'silva-env-note';
      note.textContent = 'Hosted provider keys are managed in Render environment variables.';
      const mount = qs('.page-sub, .section-title, .card', page);
      if (mount && mount.parentNode) mount.parentNode.insertBefore(note, mount.nextSibling);
    }
  }

  async function fetchProfile(id){
    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('Failed to load profile');
    const json = await res.json();
    return (json && json.profile && json.profile.payload) || {};
  }

  async function saveProfile(id, payload){
    window.STATE = window.STATE || {};
    window.STATE.teamRecords = window.STATE.teamRecords || {};
    window.STATE.teamRecords[id] = Object.assign({}, window.STATE.teamRecords[id] || {}, payload);

    try {
      if (typeof window.saveState === 'function') window.saveState();
    } catch (_e) {}

    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save profile');
    return res.json();
  }

  function patchVisibleHero(page, payload){
    const nameEl = qs('h1,.char-name,.page-title,.hero-title', page);
    const roleEl = qs('.char-role,.hero-subtitle,.page-sub,.char-sub', page);
    if (nameEl && payload.name) nameEl.textContent = payload.name;
    if (roleEl && payload.role) roleEl.textContent = payload.role;
  }

  function mountInlineEditor(page, id){
    if (!page || qs('.silva-inline-editor', page)) return;

    const hero = qs('.char-hero', page) || qs('.page-title', page)?.parentElement || page.firstElementChild;
    if (!hero || !hero.parentNode) return;

    const card = document.createElement('div');
    card.className = 'silva-inline-editor card';
    card.innerHTML = `
      <div class="silva-inline-editor-head">
        <div class="section-title">Profile editor</div>
        <div class="silva-inline-editor-actions">
          <button type="button" class="btn btn-ghost silva-inline-toggle">Edit profile</button>
          <button type="button" class="btn btn-primary silva-inline-save">Save</button>
        </div>
      </div>
      <div class="silva-inline-editor-body">
        <div class="silva-inline-editor-grid">
          <label>Name<input type="text" class="silva-inline-name"></label>
          <label>Role<input type="text" class="silva-inline-role"></label>
          <label>Tone<input type="text" class="silva-inline-tone"></label>
          <label class="bio">Bio<textarea class="silva-inline-bio"></textarea></label>
        </div>
      </div>
    `;
    hero.parentNode.insertBefore(card, hero.nextSibling);

    const toggleBtn = qs('.silva-inline-toggle', card);
    const saveBtn = qs('.silva-inline-save', card);

    async function hydrate(){
      let payload = {};
      try {
        payload = await fetchProfile(id);
      } catch (_e) {
        payload = (((window.STATE || {}).teamRecords || {})[id]) || {};
      }

      qs('.silva-inline-name', card).value = payload.name || '';
      qs('.silva-inline-role', card).value = payload.role || '';
      qs('.silva-inline-tone', card).value = payload.tone || '';
      qs('.silva-inline-bio', card).value = payload.bio || '';
    }

    toggleBtn.addEventListener('click', async () => {
      card.classList.toggle('is-open');
      if (card.classList.contains('is-open')) await hydrate();
    });

    saveBtn.addEventListener('click', async () => {
      const payload = {
        name: qs('.silva-inline-name', card).value.trim(),
        role: qs('.silva-inline-role', card).value.trim(),
        tone: qs('.silva-inline-tone', card).value.trim(),
        bio: qs('.silva-inline-bio', card).value.trim()
      };
      try {
        await saveProfile(id, payload);
        patchVisibleHero(page, payload);
        alert('Profile saved.');
      } catch (err) {
        alert(err.message || 'Save failed');
      }
    });
  }

  function mountAllInlineEditors(){
    IDS.forEach(id => {
      const page = qs('#page-' + id);
      if (page) mountInlineEditor(page, id);
    });
  }

  function boot(){
    removeBadInjectedUi();
    normalizeVersions();
    markTabRows();
    lockHostedProviderFields();
    mountAllInlineEditors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  const mo = new MutationObserver(() => boot());
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();


/* SILVA_ACTUAL_SOURCE_FIX_V3 */
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const IDS = ['aisha','leah','claudia','grok','vanya'];

  function removeBadInjectedUi(){
    qsa('#silva-live-edit-btn,#silva-live-edit-backdrop,#silva-cloud-edit-btn,#silva-cloud-edit-backdrop').forEach(el => el.remove());
    qsa('.silva-elite-glare,.silva-elite-ripple').forEach(el => el.remove());
    qsa('.silva-text-pulse,.silva-stable-pulse').forEach(el => {
      el.classList.remove('silva-text-pulse');
      el.classList.remove('silva-stable-pulse');
    });
  }

  function normalizeVersions(){
    qsa('body *').forEach(el => {
      if (el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      if (/v3\.9\.7a?/i.test(txt) || /v3\.9\.8/i.test(txt)) {
        el.textContent = txt.replace(/v3\.9\.7a?/ig, 'v3.9.9').replace(/v3\.9\.8/ig, 'v3.9.9');
      }
    });
  }

  function markTabRows(){
    IDS.forEach(id => {
      const page = qs('#page-' + id);
      if (!page) return;
      const firstTab = qs('.char-tab', page);
      if (firstTab && firstTab.parentElement) {
        firstTab.parentElement.classList.add('silva-char-tab-row');
      }
    });
  }

  function lockHostedProviderFields(){
    const page = qs('#page-settings');
    if (!page) return;

    qsa('input,textarea', page).forEach(el => {
      const wrap = el.closest('.card,div');
      const txt = ((wrap && wrap.textContent) || '') + ' ' + (el.placeholder || '');
      if (/api key|provider routing|primary text provider|primary image provider|fallback/i.test(txt)) {
        el.readOnly = true;
        if (!el.value) el.placeholder = 'Managed in Render environment';
      }
    });

    if (!qs('.silva-env-note', page)) {
      const note = document.createElement('div');
      note.className = 'silva-env-note';
      note.textContent = 'Hosted provider keys are managed in Render environment variables.';
      const mount = qs('.page-sub, .section-title, .card', page);
      if (mount && mount.parentNode) mount.parentNode.insertBefore(note, mount.nextSibling);
    }
  }

  async function fetchProfile(id){
    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('Failed to load profile');
    const json = await res.json();
    return (json && json.profile && json.profile.payload) || {};
  }

  async function saveProfile(id, payload){
    window.STATE = window.STATE || {};
    window.STATE.teamRecords = window.STATE.teamRecords || {};
    window.STATE.teamRecords[id] = Object.assign({}, window.STATE.teamRecords[id] || {}, payload);

    try {
      if (typeof window.saveState === 'function') window.saveState();
    } catch (_e) {}

    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to save profile');
    return res.json();
  }

  function patchVisibleHero(page, payload){
    const nameEl = qs('h1,.char-name,.page-title,.hero-title', page);
    const roleEl = qs('.char-role,.hero-subtitle,.page-sub,.char-sub', page);
    if (nameEl && payload.name) nameEl.textContent = payload.name;
    if (roleEl && payload.role) roleEl.textContent = payload.role;
  }

  function mountInlineEditor(page, id){
    if (!page || qs('.silva-inline-editor', page)) return;

    const hero = qs('.char-hero', page) || qs('.page-title', page)?.parentElement || page.firstElementChild;
    if (!hero || !hero.parentNode) return;

    const card = document.createElement('div');
    card.className = 'silva-inline-editor card';
    card.innerHTML = `
      <div class="silva-inline-editor-head">
        <div class="section-title">Profile editor</div>
        <div class="silva-inline-editor-actions">
          <button type="button" class="btn btn-ghost silva-inline-toggle">Edit profile</button>
          <button type="button" class="btn btn-primary silva-inline-save">Save</button>
        </div>
      </div>
      <div class="silva-inline-editor-body">
        <div class="silva-inline-editor-grid">
          <label>Name<input type="text" class="silva-inline-name"></label>
          <label>Role<input type="text" class="silva-inline-role"></label>
          <label>Tone<input type="text" class="silva-inline-tone"></label>
          <label class="bio">Bio<textarea class="silva-inline-bio"></textarea></label>
        </div>
      </div>
    `;
    hero.parentNode.insertBefore(card, hero.nextSibling);

    const toggleBtn = qs('.silva-inline-toggle', card);
    const saveBtn = qs('.silva-inline-save', card);

    async function hydrate(){
      let payload = {};
      try {
        payload = await fetchProfile(id);
      } catch (_e) {
        payload = (((window.STATE || {}).teamRecords || {})[id]) || {};
      }

      qs('.silva-inline-name', card).value = payload.name || '';
      qs('.silva-inline-role', card).value = payload.role || '';
      qs('.silva-inline-tone', card).value = payload.tone || '';
      qs('.silva-inline-bio', card).value = payload.bio || '';
    }

    toggleBtn.addEventListener('click', async () => {
      card.classList.toggle('is-open');
      if (card.classList.contains('is-open')) await hydrate();
    });

    saveBtn.addEventListener('click', async () => {
      const payload = {
        name: qs('.silva-inline-name', card).value.trim(),
        role: qs('.silva-inline-role', card).value.trim(),
        tone: qs('.silva-inline-tone', card).value.trim(),
        bio: qs('.silva-inline-bio', card).value.trim()
      };
      try {
        await saveProfile(id, payload);
        patchVisibleHero(page, payload);
        alert('Profile saved.');
      } catch (err) {
        alert(err.message || 'Save failed');
      }
    });
  }

  function mountAllInlineEditors(){
    IDS.forEach(id => {
      const page = qs('#page-' + id);
      if (page) mountInlineEditor(page, id);
    });
  }

  function boot(){
    removeBadInjectedUi();
    normalizeVersions();
    markTabRows();
    lockHostedProviderFields();
    mountAllInlineEditors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  const mo = new MutationObserver(() => boot());
  mo.observe(document.documentElement, { childList:true, subtree:true });
})();
