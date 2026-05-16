(() => {
  const VERSION = 'v3.9.9';

  const PAGES = [
    { id: 'studio', label: 'Studio Pulse', group: 'Core' },
    { id: 'generator', label: 'Prompt Generator', group: 'Core' },
    { id: 'library', label: 'Prompt Library', group: 'Core' },
    { id: 'captions', label: 'Caption Engine', group: 'Core' },
    { id: 'planner', label: 'Content Planner', group: 'Core' },
    { id: 'workflow', label: 'Workflow SOP', group: 'Core' },
    { id: 'ideas', label: 'Content Ideas', group: 'Core' },
    { id: 'campaigns', label: 'Campaigns', group: 'Core' },
    { id: 'home', label: 'Home System', group: 'Consistency' },
    { id: 'characters', label: 'Character System', group: 'Consistency' },
    { id: 'crosschar', label: 'Cross-Character', group: 'Consistency' },
    { id: 'jhb', label: 'JHB Location Bank', group: 'Consistency' },
    { id: 'broll', label: 'B-Roll Engine', group: 'Consistency' },
    { id: 'gallery', label: 'Gallery', group: 'Review' },
    { id: 'assets', label: 'Assets Vault', group: 'Review' },
    { id: 'settings', label: 'Settings', group: 'System' },
    { id: 'dev', label: 'Dev / Admin', group: 'System' }
  ];

  const DESCRIPTIONS = {
    studio: 'Silva’s command surface. This remains Studio Pulse — not a new product. Phase 2 rebuild happens here after runtime cutover is stable.',
    generator: 'Prompt Generator stays as a core module. This preview keeps the product structure intact while the old runtime is retired.',
    library: 'Prompt Library remains part of Silva and will later be wired into real CRUD and linkage.',
    captions: 'Caption Engine stays. Later rebuild will connect caption outputs to prompts, planner, and campaigns.',
    planner: 'Content Planner stays. Later rebuild will restore relational links to prompts and campaigns.',
    workflow: 'Workflow SOP stays. This preview preserves the module instead of morphing the system into something else.',
    ideas: 'Content Ideas stays. Later this becomes promotable into prompts, planner items, and campaigns.',
    campaigns: 'Campaigns stays as the container for linked creative work.',
    home: 'Home System stays. Later rebuild will make character refs, outfits, items, and notes real cloud-backed data.',
    characters: 'Character System stays. Later rebuild will convert static profile pages into real editable records.',
    crosschar: 'Cross-Character remains part of the consistency layer.',
    jhb: 'JHB Location Bank remains part of Silva’s context system.',
    broll: 'B-Roll Engine remains part of Silva’s creative system.',
    gallery: 'Gallery remains. Later rebuild will make provenance and output review first-class.',
    assets: 'Assets Vault remains. Later rebuild will connect it to real image storage and slot bindings.',
    settings: 'Settings remains. Later rebuild will split hosted user settings from read-only server-managed provider settings.',
    dev: 'Dev / Admin remains. Later rebuild will make sync health, version, and debug tools visible.'
  };

  const navEl = document.getElementById('silva-nav');
  const hostEl = document.getElementById('page-host');
  const titleEl = document.getElementById('page-title');

  function currentPage() {
    const raw = (location.hash || '#studio').slice(1).trim();
    return PAGES.find(p => p.id === raw)?.id || 'studio';
  }

  function setVersion() {
    document.querySelectorAll('[data-silva-version]').forEach(el => {
      el.textContent = VERSION;
    });
  }

  function renderNav(activeId) {
    navEl.innerHTML = PAGES.map(p => `
      <button class="nav-item ${p.id === activeId ? 'active' : ''}" data-page="${p.id}">
        ${p.label}
      </button>
    `).join('');

    navEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        location.hash = btn.dataset.page;
      });
    });
  }

  function renderPage(id) {
    const page = PAGES.find(p => p.id === id) || PAGES[0];
    titleEl.textContent = page.label;

    hostEl.innerHTML = `
      <div class="page-template">
        <section class="card hero-card">
          <div class="kicker">${page.group}</div>
          <h2>${page.label}</h2>
          <p>${DESCRIPTIONS[id] || ''}</p>
          <div class="module-chip-row">
            <span class="module-chip">Silva preserved</span>
            <span class="module-chip">Public runtime phase 1</span>
            <span class="module-chip">No product morph</span>
          </div>
        </section>

        <section class="grid grid-2">
          <div class="card panel">
            <div class="section-title">What this phase does</div>
            <div class="list">
              <div class="list-item">Cuts runtime responsibility away from the legacy monolith.</div>
              <div class="list-item">Creates one version source: ${VERSION}.</div>
              <div class="list-item">Preserves Silva’s module map without turning it into a different app.</div>
            </div>
          </div>

          <div class="card panel">
            <div class="section-title">Status</div>
            <div class="list">
              <div class="list-item"><span class="status-flag">phase 1</span> Public shell preview active.</div>
              <div class="list-item"><span class="status-flag">next</span> Studio Pulse rebuild.</div>
              <div class="list-item"><span class="status-flag">then</span> Character system rebuild.</div>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  function render() {
    const id = currentPage();
    setVersion();
    renderNav(id);
    renderPage(id);
  }

  window.addEventListener('hashchange', render);
  render();
})();
