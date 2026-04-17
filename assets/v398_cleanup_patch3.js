(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function normalizeHomeCards(){
    const page = qs('#page-home');
    if(!page) return;
    qsa('.cc-glass', page).forEach(el => el.classList.add('silva-aura-card'));
    const actions = qs('.cc-inline-actions', page);
    if(actions) actions.classList.add('silva-actions-stack');
    const modeInfo = qsa('.cc-side-card .small-note', page).find ? qsa('.cc-side-card .small-note', page).find(Boolean) : null;
    if(modeInfo && /Current mode:/i.test(modeInfo.textContent || '')) modeInfo.innerHTML = modeInfo.innerHTML.replace(/assets/i, '<strong>assets</strong>');
  }

  function buildKitMarkup(c1, c2, combo){
    const id1 = c1.identity || {};
    const id2 = c2.identity || {};
    const prompt = `Photorealistic portrait, two professionals in collaboration, ${c1.name} (${id1.age || 'adult'}, ${id1.skin || 'canonical skin'}, ${id1.hair || 'canonical hair'}) and ${c2.name} (${id2.age || 'adult'}, ${id2.skin || 'canonical skin'}, ${id2.hair || 'canonical hair'}), ${combo.setting}, ${combo.mood}, ${combo.activity}, editorial quality, natural interior or location lighting, genuine interaction not posed, identity fidelity, 1:1 square`;
    const neg = 'overly posed, stock photo feel, generic corporate energy, identity inconsistencies, wrong skin tone, weak reference fidelity, cheap styling';
    return `
      <div class="card mb14 silva-aura-card">
        <div class="section-title mb14">${esc(c1.name)} × ${esc(c2.name)} — Generated Kit</div>
        <div class="output-block">
          <div class="output-label">Image Prompt</div>
          <div class="output-text">${esc(prompt)}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent).then(()=>toast('Copied'))">Copy</button>
        </div>
        <div class="output-block"><div class="output-label">Negative Prompt</div><div class="output-text">${esc(neg)}</div></div>
        <div class="output-block"><div class="output-label">Caption</div><div class="output-text">${esc(combo.caption)}</div></div>
        <div class="output-block"><div class="output-label">LinkedIn Hook</div><div class="output-text">${esc(combo.liHook)}</div></div>
        <div class="output-block"><div class="output-label">Activity Context</div><div class="output-text">${esc(combo.activity)} · ${esc(combo.setting)}</div></div>
      </div>`;
  }

  function patchCrossCharGenerator(){
    if(!window.generateCrossChar || window.generateCrossChar.__v398cleanup3) return;
    const old = window.generateCrossChar;
    const combos = {
      aisha_claudia:{setting:'Sandton strategy table with premium tech workflow surfaces',mood:'cold review meeting, selective precision',activity:'auditing a campaign system and tightening standards',caption:'Precision makes the work breathe.',liHook:'When systems discipline meets aesthetic discipline, the output stops drifting.'},
      aisha_grok:{setting:'quiet Johannesburg tech office or studio control desk',mood:'systems review, low-noise intensity',activity:'reviewing automation output and quality flags together',caption:'Standards need an engine.',liHook:'A system is only useful when it can hold a visual standard without excuses.'},
      aisha_leah:{setting:'premium co-working table in Johannesburg',mood:'taste plus trend pressure, focused and exacting',activity:'refining a content direction before production',caption:'Taste gets sharper when the brief gets cleaner.',liHook:'Trend awareness is useless unless the standard stays controlled.'},
      aisha_vanya:{setting:'private review lounge or polished studio meeting corner',mood:'people + standards calibration',activity:'reviewing presentation tone, culture, and character fit',caption:'Culture still needs standards.',liHook:'Warmth works better when the system has a spine.'}
    };
    window.generateCrossChar = function(char1, char2){
      const key = [char1, char2].sort().join('_');
      if(!combos[key]) return old(char1, char2);
      const c1 = (window.getChar && window.getChar(char1)) || {};
      const c2 = (window.getChar && window.getChar(char2)) || {};
      const out = qs('#cross-char-output');
      if(out) out.innerHTML = buildKitMarkup(c1, c2, combos[key]);
    };
    window.generateCrossChar.__v398cleanup3 = true;
  }

  function enhanceCrossCharPage(){
    const page = qs('#page-crosschar');
    if(!page) return;
    const grid = qs('.grid3', page);
    if(!grid) return;
    qsa(':scope > .card', grid).forEach(card => {
      card.classList.add('silva-aura-card');
      card.style.borderImage = 'none';
      card.style.borderTop = '1px solid rgba(255,255,255,.06)';
    });
    if(grid.dataset.aishaInjected === '1') return;
    const extras = [
      {a:'aisha', b:'leah', title:'Aisha × Leah', desc:'Standards + trend intelligence. Taste gets sharpened.'},
      {a:'aisha', b:'claudia', title:'Aisha × Claudia', desc:'Review systems + delivery discipline. Clean pressure.'},
      {a:'aisha', b:'grok', title:'Aisha × Grok', desc:'Standards + infrastructure. Precision gets operational.'}
    ];
    extras.forEach(({a,b,title,desc}) => {
      const card = document.createElement('div');
      card.className = 'card card-sm silva-aura-card';
      card.innerHTML = `<div class="section-title" style="font-size:0.75rem;margin-bottom:8px">${esc(title)}</div><div style="font-size:0.72rem;color:var(--muted);margin-bottom:10px">${esc(desc)}</div><button class="btn btn-ghost btn-sm">Generate Kit</button>`;
      const btn = qs('button', card);
      if(btn) btn.onclick = function(){ window.generateCrossChar && window.generateCrossChar(a,b); };
      grid.appendChild(card);
    });
    grid.dataset.aishaInjected = '1';
  }

  function polishCharacterPage(){
    const page = qs('#page-aisha');
    if(!page) return;
    const hero = qs('.char-hero', page);
    if(hero) hero.classList.add('silva-aura-card');
    qsa('.char-panel', page).forEach(el => el.classList.add('silva-aura-card'));
  }

  function polishCards(){
    qsa('#page-assets .asset-card, #page-homes .alpha-home-fixed-slide, #page-homes .alpha-ref-lane, #page-gallery .gallery-card, #page-library .prompt-card').forEach(el => el.classList.add('silva-aura-card'));
  }

  function run(){
    normalizeHomeCards();
    patchCrossCharGenerator();
    enhanceCrossCharPage();
    polishCharacterPage();
    polishCards();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', function(){ setTimeout(run, 80); setTimeout(run, 260); setTimeout(run, 750); });
})();
