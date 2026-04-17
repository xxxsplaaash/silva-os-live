const state = {
  page: 'home',
  config: null,
  summary: null,
  jobs: [],
  gallery: [],
  reviews: [],
  identities: [],
  planner: [],
  prompts: [],
  selectedGallery: null,
  commandOpen: false
};

const pages = [
  { id: 'home', label: 'Home' },
  { id: 'generator', label: 'Generator' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'review', label: 'Review' },
  { id: 'identity', label: 'Identity' },
  { id: 'planner', label: 'Planner' },
  { id: 'settings', label: 'Settings' }
];

const $ = (sel) => document.querySelector(sel);

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || response.statusText || 'Request failed');
  return data;
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function verdictClass(verdict = '') {
  return verdict === 'approve' ? 'review-good' : verdict === 'flag' ? 'review-flag' : 'review-bad';
}

function agentColor(id) {
  return state.config?.agents?.[id]?.color || '#c59bff';
}

function applySettings() {
  const s = state.config?.settings || {};
  document.documentElement.style.setProperty('--glow', s.auraEnabled === false ? 0 : s.glowIntensity ?? 0.18);
  document.documentElement.style.setProperty('--pulse', s.auraEnabled === false ? 0 : s.pulseIntensity ?? 0.42);
  document.documentElement.style.setProperty('--glass', s.glassStrength ?? 0.56);
  document.documentElement.style.setProperty('--reflection', s.reflectionLevel ?? 0.3);
  document.documentElement.style.setProperty('--hotspot', s.hotspotIntensity ?? 0.22);
}

function renderNav() {
  const nav = $('#nav');
  nav.innerHTML = pages.map(page => `
    <button class="nav-item ${state.page === page.id ? 'active' : ''}" data-page="${page.id}">
      <span class="row"><span class="nav-dot" style="background:${page.id === 'review' ? agentColor('aisha') : 'rgba(255,255,255,.35)'}"></span><span class="nav-label">${page.label}</span></span>
      <span class="muted">${page.id === 'generator' ? '⌥' : ''}</span>
    </button>
  `).join('');
}

function renderAgentCard() {
  const card = $('#agentCard');
  const aisha = state.config?.agents?.aisha;
  if (!aisha) return;
  card.innerHTML = `
    <div class="agent-hero">
      ${aisha.avatar ? `<img class="avatar" src="${aisha.avatar}" alt="Aisha" />` : `<div class="avatar"></div>`}
      <div class="agent-hero-copy">
        <h3>${aisha.displayName || aisha.name}</h3>
        <p>${aisha.role}</p>
      </div>
    </div>
    <div class="row" style="margin-top:12px;">
      <span class="tag">Gallery guardian</span>
      <span class="tag">Drift critic</span>
    </div>
  `;
}

function setPage(page) {
  state.page = page;
  renderNav();
  renderWorkspace();
}

function pageHeader(title, copy, actions = '') {
  $('#pageTitle').textContent = title;
  return `
    <section class="page-header">
      <div>
        <div class="eyebrow">Silva premium workspace</div>
        <h2>${title}</h2>
        <p>${copy}</p>
      </div>
      <div class="row">${actions}</div>
    </section>
  `;
}

function renderHome() {
  const counts = state.summary?.counts || {};
  const jobs = state.jobs.slice(0, 4);
  const reviews = state.reviews.slice(0, 4);
  const aishaStatus = state.reviews.filter(r => r.reviewer_id === 'aisha').length;
  return `
    ${pageHeader('One command surface. Better judgment.', 'This is the high-control front door for Silva — less clutter, better hierarchy, and actual review discipline instead of dashboard sludge.', `<button class="btn btn-primary" data-jump="generator">Open Generator</button>`)}
    <div class="grid-two">
      <section class="panel panel-hero aura-primary">
        <div class="hero-kicker">Studio Pulse</div>
        <h3 class="section-title">Ask the studio something useful</h3>
        <div class="stack">
          <textarea class="textarea" id="studioQuestion" placeholder="What should Aisha focus on in the gallery right now?"></textarea>
          <div class="row">
            <select class="select" id="studioMode"><option value="direction">Direction</option><option value="prompt">Prompt</option><option value="consistency">Consistency</option><option value="assets">Assets</option></select>
            <button class="btn btn-primary" id="runStudioPulse">Run Studio Pulse</button>
          </div>
          <div class="item" id="studioPulseOutput">No sludge. Ask a direct question and the system will answer with roles, actions, and consistency checks.</div>
        </div>
      </section>
      <section class="grid-three">
        <div class="panel card"><div class="metric"><span class="metric-value">${counts.prompts || 0}</span><span class="metric-label">Prompt packs</span></div></div>
        <div class="panel card"><div class="metric"><span class="metric-value">${counts.gallery || 0}</span><span class="metric-label">Gallery outputs</span></div></div>
        <div class="panel card"><div class="metric"><span class="metric-value">${counts.reviews || 0}</span><span class="metric-label">Aisha reviews</span></div></div>
        <div class="panel card"><div class="metric"><span class="metric-value">${counts.jobs || 0}</span><span class="metric-label">Generation jobs</span></div></div>
        <div class="panel card"><div class="metric"><span class="metric-value">${counts.assets || 0}</span><span class="metric-label">Canonical assets</span></div></div>
        <div class="panel card"><div class="metric"><span class="metric-value">${aishaStatus}</span><span class="metric-label">Aisha-owned review actions</span></div></div>
      </section>
    </div>
    <div class="grid-two">
      <section class="panel card">
        <h3 class="section-title">Recent jobs</h3>
        <div class="list">
          ${jobs.length ? jobs.map(job => `<div class="item"><strong>${job.title || job.job_type}</strong><div class="job-status">${job.status}</div><div class="muted">${job.character_id || 'studio'} • ${formatDate(job.updated_at)}</div></div>`).join('') : '<div class="item">No generation jobs yet.</div>'}
        </div>
      </section>
      <section class="panel card">
        <h3 class="section-title">Recent review pressure</h3>
        <div class="list">
          ${reviews.length ? reviews.map(review => `<div class="item"><strong>${review.target_type} • <span class="${verdictClass(review.verdict)}">${review.verdict}</span></strong><div class="muted">score ${Math.round(review.score)} • ${formatDate(review.updated_at)}</div></div>`).join('') : '<div class="item">No review history yet.</div>'}
        </div>
      </section>
    </div>
  `;
}

function templateOptions() {
  return [
    ['manual', 'Manual'],
    ['tpl_mirror_selfie', 'Mirror Selfie'],
    ['tpl_home_day', 'Home Day'],
    ['tpl_reference_rebuild', 'Reference Rebuild']
  ].map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
}

function characterOptions(selected = 'aisha') {
  return Object.values(state.config?.agents || {}).map(agent => `<option value="${agent.id}" ${selected === agent.id ? 'selected' : ''}>${agent.displayName || agent.name}</option>`).join('');
}

function renderGenerator() {
  return `
    ${pageHeader('Generator cockpit', 'A controlled creation surface with templates, locks, live jobs, and Aisha review baked into the flow.')}
    <div class="grid-split">
      <section class="panel card stack">
        <div>
          <div class="eyebrow">Setup</div>
          <h3 class="section-title">Generate with structure</h3>
        </div>
        <input class="field" id="genTitle" placeholder="Title" />
        <select class="select" id="genCharacter">${characterOptions()}</select>
        <select class="select" id="genType"><option value="text">Text pack</option><option value="image">Image output</option></select>
        <select class="select" id="genTemplate">${templateOptions()}</select>
        <textarea class="textarea" id="genPrompt" placeholder="Describe the real scene, camera feel, intent, and constraints…"></textarea>
        <label class="item">Attach refs / locks
          <input class="field" id="genRefs" type="file" accept="image/*" multiple />
        </label>
        <div class="row">
          <button class="btn btn-primary" id="runGeneration">Generate</button>
          <button class="btn btn-ghost" id="reviewPrompt">Run past Aisha</button>
        </div>
      </section>
      <section class="panel card stack aura-primary">
        <div>
          <div class="eyebrow">Output</div>
          <h3 class="section-title">Result surface</h3>
        </div>
        <div id="generationOutput" class="item">Nothing generated yet. This surface should feel like a sealed instrument, not a sad form dump.</div>
      </section>
      <section class="panel card stack">
        <div>
          <div class="eyebrow">Live queue</div>
          <h3 class="section-title">Jobs</h3>
        </div>
        <div class="list" id="jobList">${state.jobs.slice(0, 8).map(job => `<div class="item"><strong>${job.title || job.job_type}</strong><div class="job-status">${job.status}</div><div class="muted">${job.provider || '—'} • ${formatDate(job.updated_at)}</div></div>`).join('') || '<div class="item">No jobs yet.</div>'}</div>
      </section>
    </div>
  `;
}

function renderGallery() {
  return `
    ${pageHeader('Gallery governance', 'Outputs now live with review pressure, provenance, and direct Aisha critique instead of floating around unjudged.')}
    <section class="panel card stack">
      <div class="row"><span class="tag">Click any item to inspect in the rail</span><span class="tag">Aisha runs strongest here</span></div>
      <div class="gallery-grid">
        ${state.gallery.length ? state.gallery.map(item => `
          <article class="panel gallery-card" data-gallery-id="${item.id}">
            <img class="gallery-image" src="${item.imgSrc || item.img_src}" alt="${item.title || 'Gallery item'}" />
            <div class="gallery-meta">
              <strong>${item.title || 'Untitled output'}</strong>
              <div class="muted">${item.char || item.char_id || 'studio'} • ${item.provider || '—'} • drift ${item.drift ?? 0}</div>
            </div>
          </article>
        `).join('') : '<div class="item">No gallery outputs yet.</div>'}
      </div>
    </section>
  `;
}

function renderReview() {
  const archive = state.archiveStatus || { totalGallery: 0, approved: 0, flagged: 0, rejected: 0, unreviewed: 0 };
  return `
    ${pageHeader('Review dashboard', 'Aisha now has a real review surface with archive pressure, verdict history, and critique tools.')}
    <div class="grid-two">
      <section class="panel card stack">
        <div class="grid-three">
          <div class="item"><strong>${archive.totalGallery}</strong><div class="muted">gallery total</div></div>
          <div class="item"><strong class="review-good">${archive.approved}</strong><div class="muted">approved</div></div>
          <div class="item"><strong class="review-flag">${archive.flagged}</strong><div class="muted">flagged</div></div>
          <div class="item"><strong class="review-bad">${archive.rejected}</strong><div class="muted">rejected</div></div>
          <div class="item"><strong>${archive.unreviewed}</strong><div class="muted">unreviewed</div></div>
        </div>
        <textarea class="textarea" id="critiqueInput" placeholder="Paste a prompt or notes and let Aisha rip it apart properly."></textarea>
        <div class="row"><button class="btn btn-primary" id="runStandaloneCritique">Critique</button></div>
        <div class="item" id="critiqueOutput">No critique yet.</div>
      </section>
      <section class="panel card stack">
        <h3 class="section-title">Recent review log</h3>
        <div class="list">${state.reviews.length ? state.reviews.slice(0, 12).map(review => `<div class="item"><strong>${review.target_type} • <span class="${verdictClass(review.verdict)}">${review.verdict}</span></strong><div class="muted">${Math.round(review.score)} • ${formatDate(review.updated_at)}</div></div>`).join('') : '<div class="item">No review events yet.</div>'}</div>
      </section>
    </div>
  `;
}

function identityCard(item) {
  const locks = item.locks || [];
  const face = locks.find(lock => lock.kind === 'face');
  const body = locks.find(lock => lock.kind === 'body');
  const profile = item.profile;
  return `
    <article class="panel card stack">
      <div class="agent-hero">
        ${profile.avatar ? `<img class="avatar" src="${profile.avatar}" alt="${profile.name}" />` : '<div class="avatar"></div>'}
        <div class="agent-hero-copy"><h3>${profile.displayName || profile.name}</h3><p>${profile.role}</p></div>
      </div>
      <div class="row"><span class="tag">Face ${face?.src ? 'ready' : 'missing'}</span><span class="tag">Body ${body?.src ? 'ready' : 'missing'}</span><span class="tag">Assets ${item.assets?.length || 0}</span></div>
      <div class="item">${profile.bio || profile.personality}</div>
      <button class="btn btn-ghost" data-edit-character="${profile.id}">Edit ${profile.displayName || profile.name}</button>
    </article>
  `;
}

function renderIdentity() {
  return `
    ${pageHeader('Identity + locks', 'Canon profile, face/body locks, and asset continuity live here. This is where drift gets prevented instead of apologised for later.')}
    <section class="grid-three">
      ${state.identities.map(identityCard).join('')}
    </section>
    <section class="panel card stack" id="identityEditor"></section>
  `;
}

function renderPlanner() {
  return `
    ${pageHeader('Planner', 'Keep the queue tight. No loose fragments pretending to be a content system.')}
    <section class="panel card stack">
      <div class="list">${state.planner.length ? state.planner.map(item => `<div class="item"><strong>${item.title || 'Untitled plan'}</strong><div class="muted">${item.status || 'draft'} • ${item.char || item.char_id || 'studio'} • ${item.scheduledFor || item.scheduled_for || 'unscheduled'}</div></div>`).join('') : '<div class="item">No planner items yet.</div>'}</div>
    </section>
  `;
}

function renderSettings() {
  const s = state.config?.settings || {};
  return `
    ${pageHeader('Settings', 'The aura, motion, density, and layout controls belong here — restrained, persistent, and useful.')}
    <section class="grid-two">
      <div class="panel card stack">
        <label class="item">Aura enabled <input type="checkbox" id="setAuraEnabled" ${s.auraEnabled === false ? '' : 'checked'} /></label>
        <label class="item">Border pulse intensity <input type="range" min="0" max="1" step="0.01" value="${s.pulseIntensity ?? 0.42}" id="setPulse" /></label>
        <label class="item">Glow intensity <input type="range" min="0" max="0.35" step="0.01" value="${s.glowIntensity ?? 0.18}" id="setGlow" /></label>
        <label class="item">Glass strength <input type="range" min="0.2" max="0.9" step="0.01" value="${s.glassStrength ?? 0.56}" id="setGlass" /></label>
        <label class="item">Reflection <input type="range" min="0" max="0.7" step="0.01" value="${s.reflectionLevel ?? 0.3}" id="setReflection" /></label>
        <button class="btn btn-primary" id="saveSettings">Save settings</button>
      </div>
      <div class="panel card stack aura-primary">
        <h3 class="section-title">Silva aura discipline</h3>
        <p>70% glass surface, 20% border treatment, 10% glow. The border does the work. The pulse should never look like a medical emergency.</p>
        <div class="item">Use the trim on hero inputs, selected panels, review rails, and active states. Not every card. Not every stat. Not every chip.</div>
      </div>
    </section>
  `;
}

function renderWorkspace() {
  const workspace = $('#workspace');
  const map = {
    home: renderHome,
    generator: renderGenerator,
    gallery: renderGallery,
    review: renderReview,
    identity: renderIdentity,
    planner: renderPlanner,
    settings: renderSettings
  };
  workspace.innerHTML = map[state.page]?.() || renderHome();
  bindPageEvents();
}

function renderRail(item = null) {
  const target = item || state.selectedGallery;
  const el = $('#railContent');
  if (!target) {
    el.innerHTML = `<div class="item">Choose a gallery item or run an Aisha critique and the rail will hold the judgment here.</div>`;
    return;
  }
  el.innerHTML = `
    ${target.imgSrc || target.img_src ? `<img class="gallery-image panel" src="${target.imgSrc || target.img_src}" alt="${target.title || 'Selected output'}" />` : ''}
    <div class="item"><strong>${target.title || 'Selected output'}</strong><div class="muted">${target.char || target.char_id || 'studio'} • ${target.provider || '—'} • ${target.model || '—'}</div></div>
    <button class="btn btn-primary" id="railCritique">Ask Aisha</button>
    <div class="item" id="railCritiqueOutput">No critique run yet.</div>
  `;
}

function renderCommandList(filter = '') {
  const list = $('#commandList');
  const items = pages.filter(p => p.label.toLowerCase().includes(filter.toLowerCase()));
  list.innerHTML = items.map(item => `<button class="nav-item ${state.page === item.id ? 'active' : ''}" data-page="${item.id}"><span class="nav-label">${item.label}</span></button>`).join('');
}

function toggleCommand(open = !state.commandOpen) {
  state.commandOpen = open;
  $('#commandPalette').hidden = !open;
  if (open) {
    $('#commandInput').value = '';
    renderCommandList('');
    setTimeout(() => $('#commandInput').focus(), 10);
  }
}

async function loadAll() {
  const [config, summary, gallery, reviews, identities, planner, prompts, jobs, archiveStatus] = await Promise.all([
    api('/api/config'),
    api('/api/state/summary'),
    api('/api/gallery'),
    api('/api/review'),
    api('/api/identity'),
    api('/api/planner'),
    api('/api/prompts'),
    api('/api/generation/jobs'),
    api('/api/review/aisha/archive-status')
  ]);
  state.config = config;
  state.summary = summary;
  state.gallery = gallery.items || [];
  state.reviews = reviews.items || [];
  state.identities = identities.items || [];
  state.planner = planner.items || [];
  state.prompts = prompts.items || [];
  state.jobs = jobs.items || [];
  state.archiveStatus = archiveStatus.item || null;
  applySettings();
  renderNav();
  renderAgentCard();
  renderWorkspace();
  renderRail();
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function bindPageEvents() {
  document.querySelectorAll('[data-page]').forEach(node => node.onclick = () => { setPage(node.dataset.page); toggleCommand(false); });
  document.querySelectorAll('[data-jump]').forEach(node => node.onclick = () => setPage(node.dataset.jump));

  if ($('#runStudioPulse')) {
    $('#runStudioPulse').onclick = async () => {
      const out = $('#studioPulseOutput');
      out.textContent = 'Thinking…';
      try {
        const data = await api('/api/studio/pulse', { method: 'POST', body: JSON.stringify({ question: $('#studioQuestion').value, mode: $('#studioMode').value }) });
        const r = data.response;
        out.innerHTML = `<strong>${r.summary}</strong><br/><span class="muted">Lead: ${r.lead}</span><br/><br/>${(r.actions || []).map(a => `• ${a}`).join('<br/>')}`;
      } catch (error) {
        out.textContent = error.message;
      }
    };
  }

  if ($('#runGeneration')) {
    $('#runGeneration').onclick = async () => {
      const type = $('#genType').value;
      const refsFiles = [...($('#genRefs').files || [])];
      const refs = await Promise.all(refsFiles.map(fileToDataUrl));
      const payload = {
        type,
        title: $('#genTitle').value,
        characterId: $('#genCharacter').value,
        templateId: $('#genTemplate').value,
        prompt: $('#genPrompt').value,
        refs
      };
      $('#generationOutput').textContent = 'Generating…';
      try {
        const data = await api('/api/generation/run', { method: 'POST', body: JSON.stringify(payload) });
        await loadAll();
        if (type === 'image') {
          $('#generationOutput').innerHTML = `<img class="gallery-image panel" src="${data.output.imgSrc || data.output.img_src}" alt="output" /><div class="item"><strong>${data.critique.summary}</strong><div class="muted">${data.critique.verdict} • ${Math.round(data.critique.score)}</div></div>`;
        } else {
          $('#generationOutput').innerHTML = `<div class="item"><strong>Saved prompt pack</strong><pre style="white-space:pre-wrap;color:var(--text-secondary);margin:12px 0 0;">${data.text || data.output.prompt || data.output.prompt_text || ''}</pre></div><div class="item"><strong>${data.critique.summary}</strong></div>`;
        }
      } catch (error) {
        $('#generationOutput').textContent = error.message;
      }
    };
  }

  if ($('#reviewPrompt')) {
    $('#reviewPrompt').onclick = async () => {
      const text = $('#genPrompt').value;
      const data = await api('/api/review/aisha/critique', { method: 'POST', body: JSON.stringify({ targetType: 'prompt', title: $('#genTitle').value || 'Generator draft', text }) });
      $('#generationOutput').innerHTML = `<div class="item"><strong>${data.item.summary}</strong><div class="muted">${data.item.verdict} • ${Math.round(data.item.score)}</div><br/>${data.item.suggestions.map(s => `• ${s}`).join('<br/>')}</div>`;
      await loadAll();
    };
  }

  document.querySelectorAll('[data-gallery-id]').forEach(node => node.onclick = () => {
    const item = state.gallery.find(g => g.id === node.dataset.galleryId);
    state.selectedGallery = item;
    $('#reviewRail').dataset.open = 'true';
    renderRail(item);
    bindRailEvents();
  });

  document.querySelectorAll('[data-edit-character]').forEach(node => node.onclick = () => renderIdentityEditor(node.dataset.editCharacter));

  if ($('#runStandaloneCritique')) {
    $('#runStandaloneCritique').onclick = async () => {
      const text = $('#critiqueInput').value;
      const data = await api('/api/review/aisha/critique', { method: 'POST', body: JSON.stringify({ targetType: 'prompt', title: 'Standalone critique', text }) });
      $('#critiqueOutput').innerHTML = `<strong>${data.item.summary}</strong><br/><span class="muted">${data.item.verdict} • ${Math.round(data.item.score)}</span><br/><br/>${data.item.suggestions.map(s => `• ${s}`).join('<br/>')}`;
      await loadAll();
    };
  }

  if ($('#saveSettings')) {
    $('#saveSettings').onclick = async () => {
      const payload = {
        auraEnabled: $('#setAuraEnabled').checked,
        pulseIntensity: Number($('#setPulse').value),
        glowIntensity: Number($('#setGlow').value),
        glassStrength: Number($('#setGlass').value),
        reflectionLevel: Number($('#setReflection').value)
      };
      const data = await api('/api/config/preferences', { method: 'PATCH', body: JSON.stringify(payload) });
      state.config.settings = data.settings;
      applySettings();
    };
  }
}

function bindRailEvents() {
  const critiqueBtn = $('#railCritique');
  if (critiqueBtn) {
    critiqueBtn.onclick = async () => {
      const item = state.selectedGallery;
      if (!item) return;
      const data = await api('/api/review/aisha/critique', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'gallery', targetId: item.id, title: item.title, text: `${item.title} ${item.provider || ''} ${item.model || ''}` })
      });
      $('#railCritiqueOutput').innerHTML = `<strong>${data.item.summary}</strong><br/><span class="muted">${data.item.verdict} • ${Math.round(data.item.score)}</span><br/><br/>${data.item.suggestions.map(s => `• ${s}`).join('<br/>')}`;
      loadAll();
    };
  }
}

function renderIdentityEditor(characterId = 'aisha') {
  const identity = state.identities.find(item => item.profile.id === characterId);
  if (!identity) return;
  const host = $('#identityEditor');
  host.innerHTML = `
    <div class="page-header"><div><div class="eyebrow">Editor</div><h2>Edit ${identity.profile.displayName || identity.profile.name}</h2><p>Role, avatar, notes, and face/body locks should be easy to update without wrecking continuity.</p></div></div>
    <div class="grid-two">
      <div class="stack">
        <input class="field" id="editDisplayName" value="${identity.profile.displayName || identity.profile.name}" placeholder="Display name" />
        <input class="field" id="editRole" value="${identity.profile.role}" placeholder="Role" />
        <textarea class="textarea" id="editBio">${identity.profile.bio || ''}</textarea>
        <label class="item">Avatar <input class="field" id="editAvatar" type="file" accept="image/*" /></label>
        <div class="row"><button class="btn btn-primary" id="saveProfileBtn">Save profile</button></div>
      </div>
      <div class="stack">
        <label class="item">Face lock <input class="field" id="faceLock" type="file" accept="image/*" /></label>
        <label class="item">Body lock <input class="field" id="bodyLock" type="file" accept="image/*" /></label>
        <label class="item">Quick asset title <input class="field" id="assetTitle" placeholder="Signature phone / room / bag" /></label>
        <label class="item">Quick asset image <input class="field" id="assetImage" type="file" accept="image/*" /></label>
        <div class="row"><button class="btn btn-ghost" id="saveLocksBtn">Save locks + asset</button></div>
      </div>
    </div>
  `;
  $('#saveProfileBtn').onclick = async () => {
    const avatarFile = $('#editAvatar').files?.[0];
    const payload = {
      displayName: $('#editDisplayName').value,
      role: $('#editRole').value,
      bio: $('#editBio').value
    };
    if (avatarFile) payload.avatar = await fileToDataUrl(avatarFile);
    await api(`/api/identity/${characterId}/profile`, { method: 'PATCH', body: JSON.stringify(payload) });
    await loadAll();
    renderIdentityEditor(characterId);
  };
  $('#saveLocksBtn').onclick = async () => {
    const faceFile = $('#faceLock').files?.[0];
    const bodyFile = $('#bodyLock').files?.[0];
    const assetFile = $('#assetImage').files?.[0];
    if (faceFile) await api(`/api/identity/${characterId}/locks/face`, { method: 'POST', body: JSON.stringify({ src: await fileToDataUrl(faceFile), label: 'Face lock' }) });
    if (bodyFile) await api(`/api/identity/${characterId}/locks/body`, { method: 'POST', body: JSON.stringify({ src: await fileToDataUrl(bodyFile), label: 'Body lock' }) });
    if (assetFile && $('#assetTitle').value.trim()) await api(`/api/identity/${characterId}/assets`, { method: 'POST', body: JSON.stringify({ title: $('#assetTitle').value, kind: 'signature', src: await fileToDataUrl(assetFile), tags: ['canonical'] }) });
    await loadAll();
    renderIdentityEditor(characterId);
  };
}

function bindGlobalEvents() {
  $('#openRail').onclick = () => { $('#reviewRail').dataset.open = 'true'; };
  $('#closeRail').onclick = () => { $('#reviewRail').dataset.open = 'false'; };
  $('#commandToggle').onclick = () => toggleCommand(true);
  $('#commandBackdrop').onclick = () => toggleCommand(false);
  $('#commandInput').oninput = (e) => renderCommandList(e.target.value || '');
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggleCommand(true);
    }
    if (event.key === 'Escape') {
      toggleCommand(false);
      $('#reviewRail').dataset.open = 'false';
    }
  });
}

bindGlobalEvents();
loadAll().catch(error => {
  $('#workspace').innerHTML = `<section class="panel card"><strong>App boot failed.</strong><p>${error.message}</p></section>`;
});
