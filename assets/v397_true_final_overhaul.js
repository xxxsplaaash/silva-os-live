
(function(){
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function ensureSidebarBadges(){
    const pairs = [
      ['[data-page="homes"], [data-nav="home"], a[href="#home"], a[href="#homes"]', 'count-home'],
      ['[data-page="world"], [data-nav="world"], a[href="#world"]', 'count-world'],
      ['[data-page="assets"], [data-nav="assets"], a[href="#assets"]', 'count-assets']
    ];
    pairs.forEach(([sel,id]) => {
      const host = q(sel);
      if (!host) return;
      let badge = q('#'+id, host);
      if (!badge) {
        badge = document.createElement('span');
        badge.id = id;
        badge.dataset.countBadge = '1';
        badge.className = 'nav-count-badge';
        badge.textContent = '0';
        host.appendChild(badge);
      }
    });
  }

  async function hydrateCounts(){
    try{
      const res = await fetch('/api/state/counts');
      if(!res.ok) return;
      const data = await res.json();
      const counts = data.counts || data;
      const map = {
        'count-home': counts.home ?? 0,
        'count-world': counts.world ?? 0,
        'count-assets': counts.assets ?? 0
      };
      Object.entries(map).forEach(([id,val]) => {
        const el = q('#'+id);
        if (el) el.textContent = String(val);
      });
    }catch(_){}
  }

  function updateVersionText(){
    qa('*').forEach(el => {
      if (el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      if (txt.includes('v3.9.7aa')) el.textContent = txt.replaceAll('v3.9.7aa','v3.9.7a');
      if (txt === 'Analytics + Obsession') el.textContent = 'Analytics';
      if (txt.startsWith('Obsession:')) el.textContent = txt.replace('Obsession:','Coverage:');
    });
  }

  function hideLegacyGhosts(){
    const ids = ['page-room','page-ai-comms','page-communications','legacy-room','legacy-chat','room-surface'];
    ids.forEach(id => {
      const el = q('#'+id);
      if (el) el.remove();
    });
    qa('[data-legacy-room],[data-legacy-chat],[class*="v396"]').forEach(el => {
      if (el.closest('#page-home')) el.remove();
    });
  }

  async function hydratePromptLibrary(){
    try{
      if (typeof window.STATE === 'undefined') window.STATE = {};
      if (!Array.isArray(window.STATE.prompts)) window.STATE.prompts = [];
      if (window.STATE.prompts.length) {
        if (typeof renderLibrary === 'function') renderLibrary();
        return;
      }

      const res = await fetch('/api/prompts');
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      if (items.length) {
        window.STATE.prompts = items;
        if (typeof renderLibrary === 'function') renderLibrary();
      } else {
        const grid = q('#library-grid');
        if (grid) {
          grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Your prompt library is empty right now. Save your best generator outputs here to build a real working library.</div>';
        }
      }
    }catch(err){
      const grid = q('#library-grid');
      if (grid && !grid.innerHTML.trim()) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Prompt Library could not hydrate from the current state.</div>';
      }
    }
  }

  function seedCampaignsIfEmpty(){
    if (!Array.isArray(window.CAMPAIGNS) || !window.CAMPAIGNS.length){
      window.CAMPAIGNS = [
        {name:'JHB Operator Week',desc:'Sharper city-grounded posts that make the team feel active, local, and credible.'},
        {name:'Founders / Work Presence',desc:'Desk, calls, meetings, systems, and premium operator energy without corporate blandness.'},
        {name:'Home Consistency Buildout',desc:'Use Home System references to make domestic scenes feel consistent and believable.'},
        {name:'Outfit & Asset Consistency',desc:'Push wardrobe and signature item consistency without forcing props into every generation.'},
        {name:'Gallery Drift Control',desc:'Review outputs, identify drift, and feed corrections back into prompts and references.'},
        {name:'Prompt Quality Sprint',desc:'Tighten saved prompts into reusable gold-standard building blocks.'}
      ];
    }
    if (typeof renderCampaigns === 'function') renderCampaigns();
    const grid = q('#campaigns-grid');
    if (grid && !grid.innerHTML.trim() && Array.isArray(window.CAMPAIGNS)) {
      grid.innerHTML = window.CAMPAIGNS.map(c => `<div class="card"><div class="section-title" style="margin-bottom:8px">${c.name}</div><div style="font-size:.75rem;color:var(--muted2);line-height:1.65">${c.desc}</div></div>`).join('');
    }
  }

  function fixStudioLinks(){
    qa('button,.btn').forEach(btn => {
      const txt = (btn.textContent || '').trim().toLowerCase();
      if (/open home system|open assets vault|open gallery/.test(txt)){
        btn.classList.add('btn-ghost');
      }
    });
  }

  function rebalanceGenerator(){
    const out = q('#gen-output-panel, #gen-output');
    if (!out) return;
    const txt = (out.textContent || '').trim().toLowerCase();
    if (!txt || /configure and generate your post kit|configure and generate|output will appear here/.test(txt)){
      out.classList.add('empty-state');
    } else {
      out.classList.remove('empty-state');
    }
  }

  function polish(){
    ensureSidebarBadges();
    updateVersionText();
    hideLegacyGhosts();
    fixStudioLinks();
    rebalanceGenerator();
    seedCampaignsIfEmpty();
    hydratePromptLibrary();
    hydrateCounts();
  }

  document.addEventListener('DOMContentLoaded', polish);
  window.addEventListener('load', polish);
  setTimeout(polish, 250);
  setTimeout(polish, 1200);
})();
