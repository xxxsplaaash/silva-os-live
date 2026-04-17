(function(){
  'use strict';

  const qs = (s,r=document)=>r.querySelector(s);
  const qsa = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const raf = cb => window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb, 16);
  const hasFinePointer = window.matchMedia ? window.matchMedia('(pointer:fine)').matches : true;
  const prefersReduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const CHAR_META = {
    aisha:{name:'Aisha Motsepe', role:'Chief Creative Officer', color:'rgba(184,168,216,.98)'},
    leah:{name:'Leah Mokoena', role:'Content Intelligence & Trend Analyst', color:'rgba(212,164,74,.96)'},
    claudia:{name:'Claudia Naidoo', role:'Client Systems & Operations Specialist', color:'rgba(130,174,207,.98)'},
    grok:{name:'Grok / Gerhard', role:'Technical Systems & Automation Specialist', color:'rgba(114,150,114,.98)'},
    vanya:{name:'Vanya Khumalo', role:'People & Culture Lead · HR & Talent Ops', color:'rgba(240,184,198,.98)'}
  };

  const lerp = (a,b,t)=>a+(b-a)*t;

  function safeText(el, txt){ if(el) el.textContent = txt; }

  function ensureVersionText(){
    safeText(qs('.logo-sub'), 'AI Division OS · v3.9.9');
    const footer = qsa('.sidebar-footer div').pop();
    if(footer) footer.textContent = 'v3.9.9 · Silva Studios AI Division';
    document.title = 'Silva Studios — AI Division OS v3.9.9';
    const kicker = qs('.sr-kicker');
    if(kicker && /v3\.9\./i.test(kicker.textContent||'')) kicker.textContent = 'Studio Pulse · v3.9.9';
  }

  function ensureStateLayers(){
    qsa('.btn,.btn-primary,.btn-ghost,.copy-btn,.icon-btn,.wr-gen-btn,.nav-war-btn,.char-tab,.nav-item,.char-mode-pill,.preset-chip,.tag,.loc-char-tag').forEach(el=>{
      if(qs(':scope > .silva-state-layer', el)) return;
      const layer = document.createElement('span');
      layer.className = 'silva-state-layer';
      el.appendChild(layer);
    });
  }

  function ensureChipGlyphs(){
    qsa('.tag,.char-mode-pill,.loc-char-tag').forEach(el=>{
      if(qs(':scope > .silva-chip-glyph', el)) return;
      const glyph = document.createElement('span');
      glyph.className = 'silva-chip-glyph';
      glyph.setAttribute('aria-hidden','true');
      glyph.textContent = '✦';
      el.appendChild(glyph);
    });
  }

  function bindRipple(){
    if(document.body.dataset.v399RippleBound === '1') return;
    document.body.dataset.v399RippleBound = '1';
    document.addEventListener('mousedown', e=>{
      const target = e.target.closest('.btn,.btn-primary,.btn-ghost,.copy-btn,.icon-btn,.wr-gen-btn,.nav-war-btn,.char-tab,.nav-item,.char-mode-pill,.preset-chip');
      if(!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'silva-elite-ripple';
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      target.appendChild(ripple);
      setTimeout(()=>ripple.remove(), 700);
    }, { passive:true });
  }

  function ensureGlareLayers(root=document){
    qsa('.card,.prompt-card,.gallery-card,.cc-roster-card,.asset-card,.home-card', root).forEach(el=>{
      if(qs(':scope > .silva-elite-glare', el)) return;
      const glare = document.createElement('span');
      glare.className = 'silva-elite-glare';
      el.appendChild(glare);
    });
  }

  function bindGlare(root=document){
    if(!hasFinePointer || prefersReduced) return;
    qsa('.card,.prompt-card,.gallery-card,.cc-roster-card,.asset-card,.home-card', root).forEach(el=>{
      if(el.dataset.v399GlareBound === '1') return;
      el.dataset.v399GlareBound = '1';
      const glare = qs(':scope > .silva-elite-glare', el);
      if(!glare) return;
      let rect = null; let ticking = false; let mx = 0; let my = 0;
      const draw = ()=>{ ticking = false; glare.style.setProperty('--glare-x', mx + 'px'); glare.style.setProperty('--glare-y', my + 'px'); };
      el.addEventListener('mouseenter', ()=>{ rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', e=>{
        if(!rect) rect = el.getBoundingClientRect();
        mx = e.clientX - rect.left; my = e.clientY - rect.top;
        if(!ticking){ ticking = true; raf(draw); }
      }, { passive:true });
    });
  }

  class MagneticObject {
    constructor(el, pullStrength=0.3, is3D=false){
      this.el = el; this.pullStrength = pullStrength; this.is3D = is3D;
      this.bounds = null; this.targetX = 0; this.targetY = 0; this.currentX = 0; this.currentY = 0; this.isHovering = false;
      this.bind();
    }
    bind(){
      this.el.addEventListener('mouseenter', ()=>{ this.bounds = this.el.getBoundingClientRect(); this.isHovering = true; this.el.style.transition = 'none'; this.animate(); });
      this.el.addEventListener('mousemove', e=>{
        if(!this.bounds) return;
        const centerX = this.bounds.left + this.bounds.width / 2;
        const centerY = this.bounds.top + this.bounds.height / 2;
        this.targetX = (e.clientX - centerX) * this.pullStrength;
        this.targetY = (e.clientY - centerY) * this.pullStrength;
      }, { passive:true });
      this.el.addEventListener('mouseleave', ()=>{
        this.isHovering = false; this.targetX = 0; this.targetY = 0;
        this.el.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
        this.el.style.transform = 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg)';
      });
    }
    animate(){
      if(!this.isHovering) return;
      this.currentX = lerp(this.currentX, this.targetX, 0.15);
      this.currentY = lerp(this.currentY, this.targetY, 0.15);
      if(this.is3D){
        const rotX = -this.currentY * 0.4; const rotY = this.currentX * 0.4;
        this.el.style.transform = `translate3d(0,0,0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      } else {
        this.el.style.transform = `translate3d(${this.currentX}px, ${this.currentY}px, 0)`;
      }
      raf(()=>this.animate());
    }
  }

  function bindPhysics(root=document){
    if(prefersReduced) return;
    if(hasFinePointer){
      qsa('.btn-primary,.btn-red,.nav-war-btn,.wr-gen-btn', root).forEach(btn=>{
        if(btn.dataset.v399Magnet === '1') return;
        btn.dataset.v399Magnet = '1';
        new MagneticObject(btn, 0.24, false);
      });
      qsa('.card,.prompt-card,.cc-roster-card', root).forEach(card=>{
        if(card.dataset.v399Tilt === '1') return;
        card.dataset.v399Tilt = '1';
        card.classList.add('tilt-card');
        new MagneticObject(card, 0.05, true);
      });
    }
  }

  function interceptNav(){
    if(typeof window.nav !== 'function' || window.nav.__v399Wrapped) return;
    const originalNav = window.nav;
    const wrapped = function(page){
      originalNav(page);
      const root = document.documentElement;
      let c = '#e8001e', glow = 'rgba(232,0,30,0.18)', dim = 'rgba(232,0,30,0.10)';
      if(page === 'leah'){ c='#c9a040'; glow='rgba(201,160,64,0.18)'; dim='rgba(201,160,64,0.10)'; }
      else if(page === 'claudia'){ c='#82aecf'; glow='rgba(130,174,207,0.18)'; dim='rgba(130,174,207,0.10)'; }
      else if(page === 'grok'){ c='#729672'; glow='rgba(114,150,114,0.18)'; dim='rgba(114,150,114,0.10)'; }
      else if(page === 'vanya'){ c='#f0b8c6'; glow='rgba(240,184,198,0.18)'; dim='rgba(240,184,198,0.10)'; }
      else if(page === 'aisha'){ c='#b8a8d8'; glow='rgba(184,168,216,0.18)'; dim='rgba(184,168,216,0.10)'; }
      raf(()=>{
        root.style.setProperty('--red', c); root.style.setProperty('--red-glow', glow); root.style.setProperty('--red-dim', dim);
        applyLiveTextPulse();
      });
    };
    wrapped.__v399Wrapped = true;
    window.nav = wrapped;
  }

  function applyLiveTextPulse(){
    qsa('.silva-text-pulse').forEach(el=>el.classList.remove('silva-text-pulse'));
    qsa('#page-crosschar .grid3 > .card .section-title').forEach(el=>el && el.classList.add('silva-text-pulse'));
  }

  function observeAiText(){
    if(window.__v399AiObserverBound) return;
    window.__v399AiObserverBound = true;
    const targetSelector = '#studio-ask-output,.wr-output,.cc-feed,.cc-bubble .text,.ai-side-card';
    const observer = new MutationObserver(mutations=>{
      const touched = new Set();
      mutations.forEach(m=>{
        if((m.addedNodes && m.addedNodes.length) || m.type === 'characterData'){
          const t = m.target.nodeType === 3 ? m.target.parentElement : m.target;
          if(t) touched.add(t.closest('#studio-ask-output,.wr-output,.cc-feed,.cc-bubble .text,.ai-side-card') || t);
        }
      });
      touched.forEach(target=>{
        if(!target) return;
        target.classList.remove('silva-text-burn');
        void target.offsetWidth;
        target.classList.add('silva-text-burn');
      });
    });
    qsa(targetSelector).forEach(node=>observer.observe(node,{childList:true,subtree:true,characterData:true}));
  }

  function bindSidebarHoverCard(){
    let card = qs('#silva-char-hovercard');
    if(!card){
      card = document.createElement('div');
      card.id = 'silva-char-hovercard';
      card.innerHTML = '<div class="name"></div><div class="role"></div><div class="meta">character profile</div>';
      document.body.appendChild(card);
    }
    qsa('#sidebar [data-page="aisha"],#sidebar [data-page="leah"],#sidebar [data-page="claudia"],#sidebar [data-page="grok"],#sidebar [data-page="vanya"]').forEach(item=>{
      if(item.dataset.v399HovercardBound === '1') return;
      item.dataset.v399HovercardBound = '1';
      const page = item.getAttribute('data-page'); const meta = CHAR_META[page]; if(!meta) return;
      const show = e=>{
        qs('.name', card).textContent = meta.name; qs('.role', card).textContent = meta.role;
        card.style.borderColor = meta.color.replace('0.98','0.18').replace('0.96','0.18');
        card.classList.add('show');
        card.style.left = `${Math.min(window.innerWidth - 260, e.clientX + 12)}px`;
        card.style.top = `${Math.max(12, e.clientY - 18)}px`;
      };
      item.addEventListener('mouseenter', show);
      item.addEventListener('mousemove', e=>{ if(card.classList.contains('show')){ card.style.left = `${Math.min(window.innerWidth - 260, e.clientX + 12)}px`; card.style.top = `${Math.max(12, e.clientY - 18)}px`; } }, { passive:true });
      item.addEventListener('mouseleave', ()=> card.classList.remove('show'));
    });
  }

  function patchAishaAvatar(){
    const slot = qs('#aisha-avatar-slot'); if(!slot || slot.dataset.v399AvatarPatched === '1') return;
    slot.dataset.v399AvatarPatched = '1'; slot.removeAttribute('title'); slot.setAttribute('aria-label','Change Aisha photo'); slot.setAttribute('role','button'); slot.setAttribute('tabindex','0');
    let badge = qs('.silva-avatar-edit-label', slot);
    if(!badge){
      badge = document.createElement('span'); badge.className = 'silva-avatar-edit-label'; badge.textContent = 'Change';
      Object.assign(badge.style,{position:'absolute',left:'50%',bottom:'4px',transform:'translateX(-50%)',padding:'2px 6px',borderRadius:'999px',fontSize:'.52rem',fontFamily:'DM Mono, monospace',letterSpacing:'.08em',color:'#fff',background:'rgba(6,8,14,.76)',border:'1px solid rgba(255,255,255,.08)',pointerEvents:'none',opacity:'.94'});
      if(!slot.style.position) slot.style.position = 'relative'; slot.appendChild(badge);
    }
  }

  function bindDomObserver(){
    const main = qs('#main'); if(!main || window.__v399DomObserver) return;
    let queued = false;
    const run = ()=>{
      queued = false;
      ensureStateLayers(); ensureChipGlyphs(); ensureGlareLayers(main); bindGlare(main); bindPhysics(main); bindSidebarHoverCard(); patchAishaAvatar(); applyLiveTextPulse(); interceptNav(); ensureVersionText();
    };
    run();
    const observer = new MutationObserver(()=>{ if(queued) return; queued = true; raf(run); });
    observer.observe(main,{childList:true,subtree:true});
    window.__v399DomObserver = observer;
  }

  function boot(){
    ensureVersionText(); ensureStateLayers(); ensureChipGlyphs(); bindRipple(); ensureGlareLayers(); bindGlare(); bindPhysics(); bindSidebarHoverCard(); patchAishaAvatar(); applyLiveTextPulse(); interceptNav(); observeAiText(); bindDomObserver();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
