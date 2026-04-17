
// Silva OS v3.9.7a Final Polish JS
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

  function softenWhiteButtons(){
    qa('button, .btn, .copy-btn, .wr-gen-btn').forEach(btn => {
      if (!btn.dataset.polished) btn.dataset.polished = '1';
      const txt = (btn.textContent || '').trim();
      if (/generate image/i.test(txt)) btn.setAttribute('title', 'Generate with current provider');
      if (/generate \+ save/i.test(txt)) btn.setAttribute('title', 'Generate then save directly to gallery');
    });
  }

  function ensureGalleryVisible(){
    const candidates = qa('[data-page="gallery"], [data-nav="gallery"], a[href="#gallery"]');
    candidates.forEach(el => { el.style.display = ''; });
  }

  async function loadCounts(){
    try {
      const res = await fetch('/api/state/counts');
      if (!res.ok) return;
      const data = await res.json();
      const map = {
        '#count-home': data.home ?? data.counts?.home,
        '#count-world': data.world ?? data.counts?.world,
        '#count-assets': data.assets ?? data.counts?.assets
      };
      Object.entries(map).forEach(([sel, val]) => {
        const el = q(sel);
        if (el && val != null) el.textContent = String(val);
      });
    } catch (_) {}
  }

  function rebalanceGenerator(){
    const page = q('#page-generator');
    if (!page) return;
    const rightPanel = q('#gen-output-panel, #gen-output', page);
    if (rightPanel) {
      const text = (rightPanel.textContent || '').trim().toLowerCase();
      if (text.includes('configure and generate your post kit') || text.includes('output will appear here')) {
        rightPanel.classList.add('empty-state');
      } else {
        rightPanel.classList.remove('empty-state');
      }
    }
  }

  function addNavBadgesIfMissing(){
    const map = [
      ['[data-page="homes"], [data-nav="home"]', 'count-home'],
      ['[data-page="world"], [data-nav="world"]', 'count-world'],
      ['[data-page="assets"], [data-nav="assets"]', 'count-assets']
    ];
    map.forEach(([selector, id]) => {
      const el = q(selector);
      if (!el) return;
      if (!q('#'+id, el)) {
        const badge = document.createElement('span');
        badge.id = id;
        badge.dataset.countBadge = '1';
        badge.textContent = '0';
        el.appendChild(badge);
      }
    });
  }

  function polish(){
    ensureSidebarScroll();
    softenWhiteButtons();
    ensureGalleryVisible();
    addNavBadgesIfMissing();
    rebalanceGenerator();
    loadCounts();
  }

  document.addEventListener('DOMContentLoaded', polish);
  window.addEventListener('load', polish);
  setTimeout(polish, 250);
  setTimeout(polish, 1000);
})();
