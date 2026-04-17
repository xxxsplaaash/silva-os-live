
(function(){
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function norm(s){ return String(s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

  function byText(texts){
    const wanted = texts.map(norm);
    return qa('button,.btn').filter(el => wanted.includes(norm(el.textContent)));
  }

  function nearestSharedParent(elements){
    if (!elements.length) return null;
    function ancestors(el){
      const arr=[]; let n=el;
      while(n && n!==document.body){ arr.push(n); n=n.parentElement; }
      return arr;
    }
    const first = ancestors(elements[0]);
    for (const anc of first){
      if (elements.every(el => anc.contains(el))) return anc;
    }
    return null;
  }

  function wireOpenButtons(){
    const map = {
      'open home system': 'homes',
      'open assets vault': 'assets',
      'open gallery': 'gallery'
    };

    byText(Object.keys(map)).forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const target = map[norm(btn.textContent)];
        if (typeof window.nav === 'function') {
          window.nav(target);
          return;
        }
        const navEl = q(`[data-page="${target}"], [data-nav="${target}"], a[href="#${target}"]`);
        if (navEl) navEl.click();
      };
    });
  }

  function wireQuickModes(){
    const modeTexts = ['direction','consistency','prompt fix','asset gap check','content planning'];
    const modeButtons = byText(modeTexts);
    const modeLabel = qa('*').find(el => norm(el.textContent||'').startsWith('current mode:'));
    const modeInput = q('#pulse-mode, #studio-mode, [name="mode"], select[data-role="pulse-mode"]');

    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modeButtons.forEach(b => b.classList.remove('v397-mode-btn-active'));
        btn.classList.add('v397-mode-btn-active');

        const txt = norm(btn.textContent);
        const mapped = txt === 'content planning' ? 'planning'
                    : txt === 'asset gap check' ? 'assets'
                    : txt === 'prompt fix' ? 'prompt_fix'
                    : txt;

        if (modeInput) {
          modeInput.value = mapped;
          modeInput.dispatchEvent(new Event('change', { bubbles:true }));
          modeInput.dispatchEvent(new Event('input', { bubbles:true }));
        }

        if (modeLabel) {
          modeLabel.textContent = `Current mode: ${mapped.replace('_',' ')}`;
          modeLabel.classList.add('v397-mode-label');
        }

        window.__studioPulseMode = mapped;
      });
    });

    if (modeButtons.length && !modeButtons.some(b => b.classList.contains('v397-mode-btn-active'))) {
      const active = modeButtons.find(b => norm(b.textContent) === 'direction') || modeButtons[0];
      active.classList.add('v397-mode-btn-active');
    }
  }

  function fixPulseSpacing(){
    const quickButtons = byText(['direction','consistency','prompt fix','asset gap check','content planning']);
    const openButtons = byText(['open home system','open assets vault','open gallery']);

    const quickParent = nearestSharedParent(quickButtons);
    if (quickParent) {
      quickParent.classList.add('v397-quick-row');
      const card = quickParent.parentElement;
      if (card) card.classList.add('v397-quick-card');
    }

    const openParent = nearestSharedParent(openButtons);
    if (openParent) {
      openParent.classList.add('v397-open-row');
      const card = openParent.parentElement;
      if (card) card.classList.add('v397-consistency-card');
    }
  }

  async function hydratePromptLibrary(){
    const grid = q('#library-grid');
    if (!grid) return;

    const hasCards = grid.children.length > 0 && !/empty/i.test(grid.textContent || '');
    if (hasCards) return;

    try{
      if (typeof window.STATE === 'undefined') window.STATE = {};
      if (!Array.isArray(window.STATE.prompts)) window.STATE.prompts = [];

      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('prompts route unavailable');
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      if (items.length) {
        window.STATE.prompts = items;
        if (typeof window.renderLibrary === 'function') {
          window.renderLibrary();
          return;
        }
      }

      grid.innerHTML = '<div class="v397-empty-fix" style="grid-column:1/-1">Prompt Library is empty right now. Save generated kits or seed starter prompts so this page becomes useful.</div>';
    }catch(err){
      grid.innerHTML = '<div class="v397-empty-fix" style="grid-column:1/-1">Prompt Library is not hydrated yet. The page exists, but it still needs either saved prompts or a live /api/prompts feed.</div>';
    }
  }

  function hydrateCampaigns(){
    const grid = q('#campaigns-grid');
    if (!grid) return;
    if (grid.children.length > 0 && !/empty/i.test(grid.textContent || '')) return;

    if (!Array.isArray(window.CAMPAIGNS) || !window.CAMPAIGNS.length) {
      window.CAMPAIGNS = [
        { name:'JHB Presence Sprint', desc:'Sharper Johannesburg-coded post kits and cleaner local content direction.' },
        { name:'Prompt Quality Sprint', desc:'Tighten saved prompts into reusable gold-standard kits.' },
        { name:'Home Consistency Buildout', desc:'Add room, yard, and domestic anchors that make scenes feel continuous.' },
        { name:'Asset & Outfit Discipline', desc:'Keep outfit, prop, and signature-item references selective and useful.' }
      ];
    }

    if (typeof window.renderCampaigns === 'function') {
      window.renderCampaigns();
      return;
    }

    grid.innerHTML = window.CAMPAIGNS.map(c => `
      <div class="card">
        <div class="section-title" style="margin-bottom:8px">${c.name}</div>
        <div style="font-size:.75rem;color:rgba(255,255,255,.65);line-height:1.65">${c.desc}</div>
      </div>
    `).join('');
  }

  function explainMissingCounts(){
    const snapshot = qa('*').find(el => norm(el.textContent||'').includes('home refs:') && norm(el.textContent||'').includes('vehicle refs:'));
    if (!snapshot) return;
    snapshot.title = ''; snapshot.removeAttribute && snapshot.removeAttribute('title');
  }

  function run(){
    fixPulseSpacing();
    wireOpenButtons();
    wireQuickModes();
    hydratePromptLibrary();
    hydrateCampaigns();
    explainMissingCounts();
  }

  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  setTimeout(run, 250);
  setTimeout(run, 1000);
})();
