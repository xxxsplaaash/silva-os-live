
(function(){
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function ensureSidebarScroll(){
    const sidebar = q('#sidebar');
    if (!sidebar) return;
    sidebar.style.overflowY = 'auto';
    sidebar.style.overflowX = 'hidden';
    sidebar.style.maxHeight = '100vh';
  }

  function addCountBadges(){
    const targets = [
      ['[data-page="homes"], [data-nav="home"], a[href="#home"], a[href="#homes"]', 'count-home'],
      ['[data-page="world"], [data-nav="world"], a[href="#world"]', 'count-world'],
      ['[data-page="assets"], [data-nav="assets"], a[href="#assets"]', 'count-assets']
    ];
    targets.forEach(([selector, id]) => {
      const el = q(selector);
      if (!el) return;
      if (!q('#'+id, el)) {
        const span = document.createElement('span');
        span.id = id;
        span.dataset.countBadge = '1';
        span.textContent = '0';
        el.appendChild(span);
      }
    });
  }

  async function loadCounts(){
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
      Object.entries(map).forEach(([id, val]) => {
        const el = q('#'+id);
        if (el) el.textContent = String(val);
      });
    }catch(_){}
  }

  function hideGhostPages(){
    const ghostIds = ['page-room','page-ai-comms','page-communications','room-surface','room-feed','ai-room-feed','chat-room','legacy-room','legacy-chat'];
    ghostIds.forEach(id => {
      const el = q('#'+id);
      if (el) el.remove();
    });
    qa('[data-legacy-room],[data-legacy-chat]').forEach(el => el.remove());
    qa('[data-page],[data-nav],a[href^="#"]').forEach(el => {
      const target = el.getAttribute('data-page') || el.getAttribute('data-nav') || (el.getAttribute('href') || '').replace(/^#/,'');
      if (['room','communications','ai-comms','legacy-room','legacy-chat'].includes(target)) el.remove();
    });
  }

  function rebalanceGenerator(){
    const page = q('#page-generator');
    if (!page) return;
    const right = q('#gen-output-panel, #gen-output', page);
    if (right) {
      const txt = (right.textContent || '').trim().toLowerCase();
      if (!txt || /configure and generate|output will appear here|generate a full kit first/.test(txt)) {
        right.classList.add('empty-state');
      } else {
        right.classList.remove('empty-state');
      }
    }
    qa('button, .btn', page).forEach(btn => {
      const txt = (btn.textContent || '').trim().toLowerCase();
      if (/generate image/.test(txt)) btn.setAttribute('title','Generate with current provider');
      if (/generate \+ save/.test(txt)) btn.setAttribute('title','Generate then save directly to gallery');
      if (/improve caption/.test(txt)) btn.setAttribute('title','Polish the current caption starter');
    });
  }

  function versionSweep(){
    qa('*').forEach(el => {
      if (el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      if (txt.includes('v3.9.7aa')) el.textContent = txt.replaceAll('v3.9.7aa', 'v3.9.7a');
      if (txt === 'Analytics + Obsession') el.textContent = 'Analytics';
    });
  }

  function polish(){
    ensureSidebarScroll();
    addCountBadges();
    hideGhostPages();
    rebalanceGenerator();
    versionSweep();
    loadCounts();
  }

  document.addEventListener('DOMContentLoaded', polish);
  window.addEventListener('load', polish);
  setTimeout(polish, 250);
  setTimeout(polish, 1200);
})();
