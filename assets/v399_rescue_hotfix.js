(function(){
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const IDS=['aisha','leah','claudia','grok','vanya'];

  function unlockInputs(){
    qsa('#page-settings input, #page-settings textarea, #page-settings select').forEach((el)=>{
      el.removeAttribute('disabled');
      el.style.pointerEvents='auto';
      el.style.zIndex='4';
    });

    const providerFields = qsa('#page-settings input, #page-settings textarea').filter((el)=>{
      const wrap = el.closest('.card,.profile-item,div');
      const txt = ((wrap && wrap.textContent) || '') + ' ' + (el.placeholder || '');
      return /api key|provider routing|primary text provider|primary image provider|fallback/i.test(txt);
    });

    providerFields.forEach((el)=>{
      el.value='';
      el.setAttribute('readonly','readonly');
      el.placeholder='Managed in Render environment';
      el.title='Server-managed on hosted app';
    });

    if(qs('#page-settings') && !qs('.silva-env-note', qs('#page-settings'))){
      const note=document.createElement('div');
      note.className='silva-env-note';
      note.textContent='Hosted provider keys are managed in Render environment variables.';
      const mount=qs('#page-settings .page-sub, #page-settings .section-title, #page-settings .card');
      if(mount && mount.parentNode) mount.parentNode.insertBefore(note, mount.nextSibling);
    }
  }

  function inferActiveCharId(){
    if(window.__activeCharId && IDS.includes(String(window.__activeCharId))) return String(window.__activeCharId);

    const activeNav = qs('#sidebar .nav-item.active');
    const txt = (activeNav?.textContent || '').toLowerCase();

    if(txt.includes('aisha')) return 'aisha';
    if(txt.includes('leah')) return 'leah';
    if(txt.includes('claudia')) return 'claudia';
    if(txt.includes('grok')) return 'grok';
    if(txt.includes('vanya')) return 'vanya';

    const page = qs('.page.active')?.id || '';
    for (const id of IDS) {
      if(page.includes(id)) return id;
    }
    return null;
  }

  async function fetchProfile(id){
    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id));
    if(!res.ok) throw new Error('Failed to load profile');
    const json = await res.json();
    return (json && json.profile && json.profile.payload) || {};
  }

  async function saveProfile(id, payload){
    window.STATE = window.STATE || {};
    window.STATE.teamRecords = window.STATE.teamRecords || {};
    window.STATE.teamRecords[id] = Object.assign({}, window.STATE.teamRecords[id] || {}, payload);

    try{
      if(typeof window.saveState === 'function') window.saveState();
    }catch(_){}

    const res = await fetch('/api/identity/profile/' + encodeURIComponent(id), {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!res.ok) throw new Error('Failed to save profile');
    return res.json();
  }

  function ensureEditor(){
    if(qs('#silva-cloud-edit-backdrop')) return;

    const backdrop=document.createElement('div');
    backdrop.id='silva-cloud-edit-backdrop';
    backdrop.className='silva-cloud-edit-backdrop';
    backdrop.hidden=true;
    backdrop.innerHTML = `
      <div class="silva-cloud-edit-panel">
        <h3>Edit active profile</h3>
        <div class="silva-cloud-edit-grid">
          <label>Name<input id="silva-cloud-name" type="text"></label>
          <label>Role<input id="silva-cloud-role" type="text"></label>
          <label>Tone<input id="silva-cloud-tone" type="text"></label>
          <label>Bio<textarea id="silva-cloud-bio"></textarea></label>
        </div>
        <div class="silva-cloud-edit-actions">
          <button type="button" class="btn btn-ghost" id="silva-cloud-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="silva-cloud-save">Save profile</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    qs('#silva-cloud-cancel', backdrop).addEventListener('click', ()=> backdrop.hidden = true);
    backdrop.addEventListener('click', (e)=>{ if(e.target === backdrop) backdrop.hidden = true; });

    qs('#silva-cloud-save', backdrop).addEventListener('click', async ()=>{
      const id = backdrop.dataset.charId;
      if(!id) return;
      const payload = {
        name: qs('#silva-cloud-name', backdrop).value.trim(),
        role: qs('#silva-cloud-role', backdrop).value.trim(),
        tone: qs('#silva-cloud-tone', backdrop).value.trim(),
        bio: qs('#silva-cloud-bio', backdrop).value.trim()
      };
      try{
        await saveProfile(id, payload);
        backdrop.hidden = true;
        alert('Profile saved to cloud.');
        location.reload();
      }catch(err){
        alert(err.message || 'Save failed');
      }
    });
  }

  async function openEditor(){
    const id = inferActiveCharId() || prompt('Which profile do you want to edit? aisha / leah / claudia / grok / vanya');
    if(!id || !IDS.includes(String(id).toLowerCase())) return;
    ensureEditor();
    const backdrop = qs('#silva-cloud-edit-backdrop');
    const safeId = String(id).toLowerCase();
    backdrop.dataset.charId = safeId;

    let payload = {};
    try{
      payload = await fetchProfile(safeId);
    }catch(_){
      payload = (((window.STATE || {}).teamRecords || {})[safeId]) || {};
    }

    qs('#silva-cloud-name', backdrop).value = payload.name || '';
    qs('#silva-cloud-role', backdrop).value = payload.role || '';
    qs('#silva-cloud-tone', backdrop).value = payload.tone || '';
    qs('#silva-cloud-bio', backdrop).value = payload.bio || '';
    backdrop.hidden = false;
  }

  function ensureButton(){
    let btn = qs('#silva-cloud-edit-btn');
    if(!btn){
      btn = document.createElement('button');
      btn.id='silva-cloud-edit-btn';
      btn.className='silva-cloud-edit-btn';
      btn.type='button';
      btn.textContent='Edit active profile';
      btn.addEventListener('click', openEditor);
      document.body.appendChild(btn);
    }
    btn.hidden = false;
  }

  function boot(){
    unlockInputs();
    ensureButton();
  }

  window.openSilvaProfileEditor = openEditor;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  } else {
    boot();
  }

  const mo = new MutationObserver(()=> boot());
  mo.observe(document.documentElement, {subtree:true, childList:true});
})();
