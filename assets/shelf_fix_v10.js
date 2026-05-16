(function(){
  const PULSE_KEY = 'silva_studio_pulse_v395';
  const PROVIDER_KEY = 'silva_provider_shell_v12';
  const PROVIDER_BACKUP_KEY = 'silva_provider_shell_v12_backup';
  const HOME_UI_KEY = 'silva_home_ui_v14';
  const DEFAULT_CHARS = ['aisha','leah','claudia','grok','vanya'];
  const META = {
    aisha:{name:'Aisha Motsepe', role:'Chief Creative Officer', color:'var(--aisha, var(--color-hex-b8a8d8))'},
    leah:{name:'Leah Mokoena', role:'Content Intelligence & Trend Analyst', color:'var(--leah, var(--color-hex-e1b657))'},
    claudia:{name:'Claudia Naidoo', role:'Client Systems & Operations Specialist', color:'var(--claudia, var(--color-hex-8dc1ff))'},
    grok:{name:'Grok / Gerhard Ruan Kroukamp', role:'Technical Systems & Automation Specialist', color:'var(--grok, var(--color-hex-8ac49a))'},
    vanya:{name:'Vanya Khumalo', role:'People & Culture Lead · HR & Talent Ops', color:'var(--vanya, var(--color-hex-f1b2c8))'}
  };
  function qs(s,r=document){ return r.querySelector(s); }
  function qsa(s,r=document){ return Array.from(r.querySelectorAll(s)); }
  function navGroup(name){ return qs('#sidebar .nav-section[data-nav-group="' + name + '"]'); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }
  function textNorm(v){ return (v||'').replace(/\s+/g,' ').trim().toLowerCase(); }
  function toast(msg){ try{ if(window.toast) window.toast(msg); else if(window.showToast) window.showToast('info', msg); }catch(e){} }
  function saveStateMaybe(){ try{ window.saveState && window.saveState(); }catch(e){} }
  function loadJSON(key, fallback){ try{ return Object.assign({}, fallback, JSON.parse(localStorage.getItem(key)||'{}')||{}); }catch(e){ return Object.assign({}, fallback); } }
  function saveJSON(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }
  function loadHomeUI(){
    const ui = loadJSON(HOME_UI_KEY, {active:'aisha', view:'focused', search:'', collapsed:{}});
    ui.collapsed = ui.collapsed && typeof ui.collapsed === 'object' ? ui.collapsed : {};
    return ui;
  }
  function saveHomeUI(ui){ saveJSON(HOME_UI_KEY, ui); }
  function ensureHomeCollapseDefaults(ui, ids){
    ui.collapsed = ui.collapsed && typeof ui.collapsed === 'object' ? ui.collapsed : {};
    (ids || DEFAULT_CHARS).forEach(function(id){
      const defaults = { refs:false, usage:false, continuity:true, transport:true, prompts:true, outfits:true, items:true };
      Object.keys(defaults).forEach(function(key){
        const mapKey = sectionKey(id, key);
        if(!(mapKey in ui.collapsed)) ui.collapsed[mapKey] = defaults[key];
      });
    });
    return ui;
  }
  function ensureHomePolishStyle(){
    if(document.getElementById('silva-home-v15-style')) return;
    const style = document.createElement('style');
    style.id = 'silva-home-v15-style';
    style.textContent = `
      #page-homes{
        --home-accent: var(--aisha, var(--color-hex-b8a8d8));
        max-width: 1520px;
        margin: 0 auto;
        padding-bottom: 40px;
      }
      #page-homes .page-title{
        font-size: var(--type-3xl);
        letter-spacing: var(--tracking-tight);
        margin-bottom: 8px;
      }
      #page-homes .page-sub{
        max-width: 74ch;
        font-size: var(--type-base);
        line-height: var(--leading-loose);
        color: var(--muted2);
        margin-bottom: 16px;
      }
      #page-homes .alpha-home-fixed-toolbar{
        display:grid;
        grid-template-columns:auto minmax(260px, 1fr);
        gap:12px;
        align-items:center;
        margin: 0 0 16px;
      }
      #page-homes .alpha-home-fixed-toolbar .search-input{
        width:100%;
        max-width:none;
        min-height:48px;
        border-radius:16px;
        border:1px solid var(--color-white-a6);
        background:linear-gradient(180deg, var(--color-white-a4_5), var(--color-white-a2));
        box-shadow: inset 0 1px 0 var(--color-white-a3);
      }
      #page-homes .alpha-home-view-toggle{
        display:inline-flex;
        gap:8px;
        padding:4px;
        border-radius:18px;
        background:var(--color-white-a2_8);
        border:1px solid var(--color-white-a5);
      }
      #page-homes .alpha-home-view-toggle .btn{
        min-width:132px;
        border-radius:14px;
      }
      #page-homes .alpha-home-fixed-shell,
      #page-homes .alpha-home-fixed-carousel{
        border:none;
        background:none;
        box-shadow:none;
        padding:0;
      }
      #page-homes .alpha-home-fixed-topbar{
        margin-bottom:16px;
      }
      #page-homes .alpha-home-fixed-tabs{
        display:flex;
        gap:8px;
        overflow:auto;
        padding:2px 0 4px;
        scrollbar-width:none;
      }
      #page-homes .alpha-home-fixed-tabs::-webkit-scrollbar{display:none;}
      #page-homes .alpha-home-fixed-tab{
        min-width:220px;
        padding:12px 16px;
        border-radius:20px;
        border:1px solid var(--color-white-a5);
        background:linear-gradient(180deg, var(--color-white-a3), var(--color-white-a1_8));
        display:flex;
        gap:12px;
        align-items:flex-start;
        text-align:left;
        color:var(--white);
        transition:transform var(--motion-fast) ease, border-color var(--motion-fast) ease, background var(--motion-fast) ease, box-shadow var(--motion-fast) ease;
      }
      #page-homes .alpha-home-fixed-tab:hover{
        transform:translateY(-1px);
        border-color:var(--color-white-a8);
      }
      #page-homes .alpha-home-fixed-tab.active{
        border-color:color-mix(in srgb, var(--home-accent) 32%, var(--color-white-a8));
        background:linear-gradient(180deg, var(--color-white-a5_5), var(--color-white-a2));
        box-shadow:0 0 0 1px var(--color-white-a2), 0 22px 50px var(--color-black-a18);
      }
      #page-homes .alpha-home-menu-dot{
        width:8px;
        height:8px;
        border-radius:999px;
        margin-top:4px;
        box-shadow:0 0 0 5px var(--color-white-a2_5);
      }
      #page-homes .alpha-home-fixed-tab-copy strong{
        display:block;
        font-family:'Syne',sans-serif;
        font-size:var(--type-md);
        letter-spacing:var(--tracking-tight);
      }
      #page-homes .alpha-home-fixed-tab-copy span{
        display:block;
        margin-top:4px;
        font-size:var(--type-sm);
        line-height:var(--leading-normal);
        color:var(--muted2);
      }
      #page-homes .alpha-home-open-stage{
        --home-accent: var(--home-stage-accent, var(--aisha, var(--color-hex-b8a8d8)));
        position:relative;
        padding:24px;
        border-radius:30px;
        border:1px solid var(--color-white-a5);
        background:
          radial-gradient(circle at top right, color-mix(in srgb, var(--home-accent) 12%, var(--color-transparent)) 0, var(--color-transparent) 34%),
          linear-gradient(180deg, var(--color-white-a3_5), var(--color-white-a1_2));
        box-shadow:0 32px 72px var(--color-black-a18), inset 0 1px 0 var(--color-white-a3);
        overflow:hidden;
      }
      #page-homes .alpha-home-open-stage::before{
        content:"";
        position:absolute;
        inset:0;
        pointer-events:none;
        background:linear-gradient(135deg, var(--color-white-a3), var(--color-transparent) 36%, var(--color-transparent) 70%, var(--color-white-a1_8));
        opacity:.7;
      }
      #page-homes .alpha-home-card-head{
        position:relative;
        z-index:1;
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:16px;
        margin-bottom:16px;
      }
      #page-homes .alpha-home-card-copy{
        min-width:0;
        max-width:72ch;
      }
      #page-homes .alpha-home-kicker{
        display:inline-flex;
        align-items:center;
        gap:8px;
        margin-bottom:8px;
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-widest);
        text-transform:uppercase;
        font-family:'DM Mono',monospace;
        color:var(--muted);
      }
      #page-homes .alpha-home-kicker::before{
        content:"";
        width:8px;
        height:8px;
        border-radius:999px;
        background:var(--home-accent);
        box-shadow:0 0 18px color-mix(in srgb, var(--home-accent) 45%, var(--color-transparent));
      }
      #page-homes .home-title{
        font-family:'Syne',sans-serif;
        font-size:var(--type-3xl);
        line-height:var(--leading-tight);
        letter-spacing:var(--tracking-tight);
        color:var(--white);
      }
      #page-homes .home-sub{
        margin-top:8px;
        font-size:var(--type-base);
        color:var(--muted2);
      }
      #page-homes .alpha-home-lead{
        margin-top:12px;
        font-size:var(--type-base);
        line-height:var(--leading-loose);
        color:var(--silver);
        max-width:68ch;
      }
      #page-homes .alpha-home-card-tools{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        justify-content:flex-end;
        align-items:flex-start;
      }
      #page-homes .alpha-home-summary-band{
        position:relative;
        z-index:1;
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:12px;
        margin-bottom:20px;
      }
      #page-homes .alpha-home-summary-pill{
        padding:12px 16px;
        border-radius:18px;
        background:var(--color-white-a3);
        border:1px solid var(--color-white-a4_5);
        backdrop-filter: blur(8px);
      }
      #page-homes .alpha-home-summary-pill .k{
        display:block;
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-widest);
        text-transform:uppercase;
        font-family:'DM Mono',monospace;
        color:var(--muted);
        margin-bottom:8px;
      }
      #page-homes .alpha-home-summary-pill .v{
        font-size:var(--type-base);
        color:var(--white);
        line-height:var(--leading-normal);
      }
      #page-homes .alpha-home-visual-shell{
        position:relative;
        z-index:1;
        display:grid;
        grid-template-columns:minmax(0, 1fr) 300px;
        gap:16px;
        align-items:start;
      }
      #page-homes .alpha-home-ref-stage,
      #page-homes .alpha-home-quick-rail,
      #page-homes .alpha-home-admin-grid{
        display:flex;
        flex-direction:column;
        gap:12px;
        min-width:0;
      }
      #page-homes .alpha-home-admin-grid{
        position:relative;
        z-index:1;
        margin-top:12px;
      }
      #page-homes .alpha-home-panel{
        padding:16px;
        border-radius:20px;
        background:var(--color-white-a2_2);
        border:1px solid var(--color-white-a4_5);
      }
      #page-homes .alpha-home-panel-title{
        font-family:'Syne',sans-serif;
        font-size:var(--type-md);
        letter-spacing:var(--tracking-tight);
        color:var(--white);
        margin-bottom:8px;
      }
      #page-homes .alpha-home-panel-copy{
        font-size:var(--type-sm);
        line-height:var(--leading-loose);
        color:var(--muted2);
      }
      #page-homes .alpha-home-mini-list{
        display:flex;
        flex-direction:column;
        gap:8px;
        margin-top:8px;
      }
      #page-homes .alpha-home-mini-item{
        display:grid;
        grid-template-columns:92px minmax(0,1fr);
        gap:12px;
        align-items:start;
        font-size:var(--type-sm);
      }
      #page-homes .alpha-home-mini-item .k{
        font-family:'DM Mono',monospace;
        text-transform:uppercase;
        letter-spacing:var(--tracking-wider);
        color:var(--muted);
        font-size:var(--type-2xs);
        padding-top:4px;
      }
      #page-homes .alpha-home-mini-item .v{
        color:var(--silver);
        line-height:var(--leading-loose);
      }
      #page-homes .alpha-home-section{
        border:1px solid var(--color-white-a3_2);
        border-radius:20px;
        background:linear-gradient(180deg, var(--color-white-a2), var(--color-white-a1_2));
        overflow:hidden;
        box-shadow:inset 0 1px 0 var(--color-white-a2), 0 18px 40px var(--color-black-a8);
      }
      #page-homes .alpha-home-section-head{
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:12px 16px;
        cursor:pointer;
        background:var(--color-white-a1_4);
        border:none;
        box-shadow:none;
      }
      #page-homes .alpha-home-section:not(.collapsed) .alpha-home-section-head{
        background:var(--color-white-a2_2);
      }
      #page-homes .alpha-home-section-head strong{
        display:block;
        font-family:'Syne',sans-serif;
        font-size:var(--type-base);
        color:var(--white);
        letter-spacing:var(--tracking-tight);
      }
      #page-homes .alpha-home-section-meta{
        margin-top:4px;
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-wider);
        text-transform:uppercase;
        color:var(--muted);
        font-family:'DM Mono',monospace;
      }
      #page-homes .alpha-home-section-toggle{
        flex:0 0 auto;
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:8px 8px;
        border-radius:999px;
        border:1px solid var(--color-white-a4_5);
        background:var(--color-white-a3);
        font-size:var(--type-xs);
        color:var(--silver);
        font-family:'DM Mono',monospace;
        letter-spacing:var(--tracking-wider);
        text-transform:uppercase;
        opacity:.9;
      }
      #page-homes .alpha-home-section-toggle-icon{
        font-size:var(--type-sm);
        line-height:var(--leading-tight);
      }
      #page-homes .alpha-home-section-body{
        padding:12px 16px 16px;
      }
      #page-homes .alpha-home-section.collapsed .alpha-home-section-body{
        display:none;
      }
      #page-homes .alpha-home-field-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }
      #page-homes .alpha-home-field{
        display:flex;
        flex-direction:column;
        gap:8px;
        min-width:0;
      }
      #page-homes .alpha-home-field.wide{grid-column:1 / -1;}
      #page-homes .alpha-home-field label{
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-widest);
        text-transform:uppercase;
        font-family:'DM Mono',monospace;
        color:var(--muted);
      }
      #page-homes .alpha-home-field input,
      #page-homes .alpha-home-field textarea{
        width:100%;
        border-radius:15px;
        border:1px solid var(--color-white-a7_5);
        background:var(--color-white-a3_2);
        color:var(--white);
        padding:12px 12px;
        font:inherit;
        font-size:var(--type-sm);
        line-height:var(--leading-normal);
        outline:none;
        resize:vertical;
        transition:border-color var(--motion-fast) ease, box-shadow var(--motion-fast) ease, background var(--motion-fast) ease;
      }
      #page-homes .alpha-home-field textarea{min-height:100px;}
      #page-homes .alpha-home-field textarea.large{min-height:150px;}
      #page-homes .alpha-home-field input:focus,
      #page-homes .alpha-home-field textarea:focus{
        background:var(--color-white-a4);
        border-color:color-mix(in srgb, var(--home-accent) 32%, var(--color-white-a8));
        box-shadow:0 0 0 1px var(--color-white-a3), 0 0 32px color-mix(in srgb, var(--home-accent) 12%, var(--color-transparent));
      }
      #page-homes .alpha-home-actionbar{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        align-items:center;
        margin-top:12px;
      }
      #page-homes .alpha-home-note{
        font-size:var(--type-xs);
        color:var(--muted2);
        line-height:var(--leading-loose);
      }
      #page-homes .alpha-home-slots-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:8px;
      }
      #page-homes .home-slots{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      #page-homes .alpha-home-slots-outfits{
        grid-template-columns:repeat(6,minmax(0,1fr));
      }
      #page-homes .alpha-home-slots-items{
        grid-template-columns:repeat(6,minmax(0,1fr));
      }
      #page-homes .home-slot{
        position:relative;
        min-height:122px;
        border-radius:18px;
        border:1px dashed var(--color-white-a8);
        background:
          linear-gradient(180deg, var(--color-white-a1_6), var(--color-white-a2_8)),
          radial-gradient(circle at top, var(--color-white-a3), var(--color-transparent) 60%);
        overflow:hidden;
      }
      #page-homes .home-slot.has-img{
        border-style:solid;
        border-color:var(--color-white-a6);
      }
      #page-homes .home-slot img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }
      #page-homes .home-slot-ph{
        position:absolute;
        inset:auto 12px 12px 12px;
        font-size:var(--type-xs);
        line-height:var(--leading-normal);
        color:var(--silver);
        text-align:left;
      }
      #page-homes .alpha-home-ref-grid{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      #page-homes .alpha-home-ref-panel-title{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:8px;
      }
      #page-homes .alpha-home-ref-panel-title strong{
        font-family:'Syne',sans-serif;
        font-size:var(--type-md);
        color:var(--white);
        letter-spacing:var(--tracking-tight);
      }
      #page-homes .alpha-home-ref-panel-title span{
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-wider);
        text-transform:uppercase;
        font-family:'DM Mono',monospace;
        color:var(--muted);
      }
      #page-homes .alpha-home-compact-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:12px;
      }
      #page-homes .alpha-home-fixed-top{
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-end;
        margin-bottom:16px;
      }
      #page-homes .alpha-home-fixed-track{
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
        gap:16px;
        overflow:visible;
      }
      #page-homes .alpha-home-fixed-slide{
        padding:16px;
        border-radius:26px;
        border:1px solid var(--color-white-a4_5);
        background:var(--color-white-a2);
      }
      #page-homes .alpha-home-fixed-slide-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
      }
      #page-homes .alpha-home-fixed-slide-name{
        font-family:'Syne',sans-serif;
        font-size:var(--type-lg);
        letter-spacing:var(--tracking-tight);
        color:var(--white);
      }
      #page-homes .alpha-home-fixed-slide-sub{
        margin-top:4px;
        font-size:var(--type-sm);
        line-height:var(--leading-normal);
        color:var(--muted2);
      }
      #page-homes .alpha-home-fixed-slide-badge{
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-widest);
        text-transform:uppercase;
        color:var(--muted);
        font-family:'DM Mono',monospace;
      }
      #page-homes .alpha-home-fixed-slide-grid{
        display:flex;
        flex-direction:column;
        gap:12px;
      }
      #page-homes .alpha-home-preview-row{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
      }
      #page-homes .alpha-home-preview-cell{
        padding:12px;
        border-radius:16px;
        background:var(--color-white-a2_4);
        border:1px solid var(--color-white-a4);
      }
      #page-homes .alpha-home-preview-cell .k{
        display:block;
        margin-bottom:8px;
        font-size:var(--type-2xs);
        letter-spacing:var(--tracking-wider);
        text-transform:uppercase;
        font-family:'DM Mono',monospace;
        color:var(--muted);
      }
      #page-homes .alpha-home-preview-cell .v{
        font-size:var(--type-sm);
        line-height:var(--leading-normal);
        color:var(--silver);
      }
      @media (max-width: 1120px){
        #page-homes .alpha-home-summary-band{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        #page-homes .alpha-home-visual-shell{
          grid-template-columns:1fr;
        }
        #page-homes .alpha-home-slots-outfits,
        #page-homes .alpha-home-slots-items{
          grid-template-columns:repeat(3,minmax(0,1fr));
        }
      }
      @media (max-width: 820px){
        #page-homes .alpha-home-fixed-toolbar{
          grid-template-columns:1fr;
        }
        #page-homes .alpha-home-summary-band,
        #page-homes .alpha-home-field-grid,
        #page-homes .home-slots,
        #page-homes .alpha-home-slots-outfits,
        #page-homes .alpha-home-slots-items,
        #page-homes .alpha-home-preview-row,
        #page-homes .alpha-home-ref-grid,
        #page-homes .alpha-home-compact-grid{
          grid-template-columns:1fr;
        }
        #page-homes .alpha-home-card-head,
        #page-homes .alpha-home-fixed-top{
          flex-direction:column;
          align-items:stretch;
        }
        #page-homes .alpha-home-card-tools{
          justify-content:flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }
  function isPageActive(id){
    const page = qs('#page-' + id);
    return !!(page && page.classList.contains('active'));
  }
  function ensurePages(){
    const main=qs('#main'); if(!main) return;
    if(!qs('#page-settings', main)) main.insertAdjacentHTML('beforeend', `<section class="page" id="page-settings"></section>`);
    if(!qs('#page-providers', main)) main.insertAdjacentHTML('beforeend', `<section class="page" id="page-providers"></section>`);
    const system = navGroup('system');
    if(system && !qs('.nav-item[data-page="settings"]', system)){
      const anchor = qs('.nav-item[data-page="providers"]', system) || qs('.nav-item[data-page="dev"]', system);
      if(anchor) anchor.insertAdjacentHTML('afterend', `<div class="nav-item" data-page="settings"><span class="nav-icon">◌</span> Settings</div>`);
      else system.insertAdjacentHTML('beforeend', `<div class="nav-item" data-page="settings"><span class="nav-icon">◌</span> Settings</div>`);
    }
  }
  function activatePage(page){
    qsa('.page').forEach(p=>p.classList.remove('active'));
    qsa('.nav-item').forEach(n=>n.classList.remove('active'));
    const pg = qs('#page-'+page); if(pg) pg.classList.add('active');
    const ni = qs('.nav-item[data-page="'+page+'"]'); if(ni) ni.classList.add('active');
    window.scrollTo(0,0);
  }
  function patchNav(){
    if(window.__silvaV12NavPatched) return;
    const old = window.nav;
    window.nav = function(page){
      if(typeof old === 'function') old(page); else activatePage(page);
      if(page==='homes') setTimeout(function(){ renderHomesV12({force:true}); }, 10);
      if(page==='settings') setTimeout(renderSettingsV12, 10);
      if(page==='providers') setTimeout(renderProviderShellV12, 10);
      return true;
    };
    window.__silvaV12NavPatched = true;
  }
  function bindSidebar(){
    qsa('.nav-item[data-page="homes"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('homes'); });
    qsa('.nav-item[data-page="settings"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('settings'); });
    qsa('.nav-item[data-page="providers"]').forEach(el=>el.onclick=function(e){ e.preventDefault(); window.nav('providers'); });
  }
  function teamOrder(){
    try{
      const arr = Array.isArray(window.STATE?.ui?.teamSidebarOrder) ? window.STATE.ui.teamSidebarOrder.slice() : [];
      const out=[]; const seen = new Set();
      DEFAULT_CHARS.forEach(id=>{ if(!seen.has(id)){ out.push(id); seen.add(id);} });
      arr.forEach(id=>{ if(DEFAULT_CHARS.includes(id) && !seen.has(id)){ out.push(id); seen.add(id);} });
      return out;
    }catch(e){ return DEFAULT_CHARS.slice(); }
  }
  function getCharRecord(id){
    const rec = (window.STATE && STATE.teamRecords && STATE.teamRecords[id]) || {};
    const char = window.getChar ? window.getChar(id) : {};
    const meta = META[id] || {name:id, role:'', color:'var(--color-white-a70)'};
    return { name: rec.name || char.name || meta.name, role: rec.role || char.role || meta.role, color: meta.color };
  }
  function loadPulse(){
    try{
      const parsed = JSON.parse(localStorage.getItem(PULSE_KEY)||'{}') || {};
      return Object.assign({homes:{}}, parsed);
    }catch(e){ return {homes:{}}; }
  }
  function getHomeState(id){
    const pulse = loadPulse();
    const p = (pulse.homes && pulse.homes[id]) || {home:{}, outfits:[null,null,null,null,null,null], items:{}, notes:'', usageRule:'Use selectively when relevant to the prompt or scene. Never force these into every generation.'};
    p.home = p.home || {};
    p.outfits = Array.isArray(p.outfits) ? p.outfits : [null,null,null,null,null,null];
    p.items = p.items || {};
    return p;
  }
  function getLegacyHomeProfile(id){
    try{ return (window.STATE && STATE.homeProfiles && STATE.homeProfiles[id]) || {}; }catch(e){ return {}; }
  }
  function getLegacyHomeAssets(id){
    try{ return (window.STATE && STATE.homeAssets && STATE.homeAssets[id]) || {}; }catch(e){ return {}; }
  }
  function getLegacyTeamRecord(id){
    try{ return (window.STATE && STATE.teamRecords && STATE.teamRecords[id]) || {}; }catch(e){ return {}; }
  }
  function firstText(){
    for(let i=0;i<arguments.length;i+=1){
      const value = arguments[i];
      if(value == null) continue;
      const normalized = String(value).trim();
      if(normalized) return normalized;
    }
    return '';
  }
  function mergeHomeRefs(id){
    const pulse = getHomeState(id);
    const legacyAssets = getLegacyHomeAssets(id);
    return {
      livingRoom: pulse.home.livingRoom || legacyAssets.room || '',
      bedroom: pulse.home.bedroom || '',
      workspace: pulse.home.workspace || '',
      kitchen: pulse.home.kitchen || '',
      bathroom: pulse.home.bathroom || '',
      exterior: pulse.home.exterior || legacyAssets.yard || ''
    };
  }
  function getContinuityState(id){
    const pulse = getHomeState(id);
    const profile = getLegacyHomeProfile(id);
    const record = getLegacyTeamRecord(id);
    return {
      pulse: pulse,
      refs: mergeHomeRefs(id),
      environment: {
        neighborhood: firstText(profile.neighborhood, record.homeBase),
        building: firstText(profile.building),
        homeType: firstText(profile.homeType),
        mood: firstText(profile.homeMood),
        favoriteSpot: firstText(profile.favoriteSpot)
      },
      transport: {
        license: firstText(profile.driversLicense, record.driversLicense, '—'),
        drives: firstText(profile.drives, record.drives, '—'),
        vehicle: firstText(profile.vehicle, record.vehicle, '—'),
        parking: firstText(profile.parking, record.parking, '—'),
        commute: firstText(profile.commute, record.commute, '—')
      },
      prompts: {
        room: firstText(profile.roomPrompt),
        yard: firstText(profile.yardPrompt)
      },
      notes: {
        interior: firstText(profile.interiorNote),
        exterior: firstText(profile.yardNote),
        sourceLabel: firstText(profile.building),
        sourceUrl: firstText(profile.sourceUrl)
      }
    };
  }
  function sectionKey(id, key){ return id + ':' + key; }
  function isSectionCollapsed(ui, id, key){
    return Boolean(ui && ui.collapsed && ui.collapsed[sectionKey(id, key)]);
  }
  function fieldInput(id, key, label, value, opts){
    const options = opts || {};
    return `<div class="alpha-home-field${options.wide ? ' wide' : ''}"><label for="home-field-${id}-${key}">${esc(label)}</label><input id="home-field-${id}-${key}" value="${esc(firstText(value))}" placeholder="${esc(options.placeholder || '')}"></div>`;
  }
  function fieldTextarea(id, key, label, value, opts){
    const options = opts || {};
    return `<div class="alpha-home-field${options.wide ? ' wide' : ''}"><label for="home-field-${id}-${key}">${esc(label)}</label><textarea id="home-field-${id}-${key}" class="${options.large ? 'large' : ''}" placeholder="${esc(options.placeholder || '')}">${esc(firstText(value))}</textarea></div>`;
  }
  function collapsibleSection(id, key, title, meta, body, ui){
    const collapsed = isSectionCollapsed(ui, id, key);
    return `<div class="alpha-home-section ${collapsed ? 'collapsed' : ''}" data-home-section="${esc(key)}">`
      + `<button class="alpha-home-section-head" type="button" onclick="window.toggleHomeSection('${esc(id)}','${esc(key)}')">`
      + `<div><strong>${esc(title)}</strong>${meta ? `<div class="alpha-home-section-meta">${esc(meta)}</div>` : ''}</div>`
      + `<span class="alpha-home-section-toggle"><span class="alpha-home-section-toggle-icon">${collapsed ? '▸' : '▾'}</span><span>${collapsed ? 'Open' : 'Hide'}</span></span>`
      + `</button>`
      + `<div class="alpha-home-section-body">${body}</div>`
      + `</div>`;
  }
  function continuityRow(label, value){
    return `<div class="home-row"><div class="home-key">${esc(label)}</div><div class="home-val">${esc(firstText(value, '—'))}</div></div>`;
  }
  function continuityPrompt(label, value){
    return `<div class="home-row"><div class="home-key">${esc(label)}</div><div class="home-val">${esc(firstText(value, 'No continuity prompt locked yet.'))}</div></div>`;
  }
  function continuityPanel(id){
    const state = getContinuityState(id);
    const sourceHtml = state.notes.sourceUrl
      ? `<a class="source-link" target="_blank" rel="noreferrer" href="${esc(state.notes.sourceUrl)}">${esc(state.notes.sourceLabel || 'Open source anchor')}</a>`
      : 'Editable internal anchor';
    return `<div class="alpha-home-continuity">`
      + `<div class="alpha-home-section-title">Continuity anchors</div>`
      + continuityRow('Neighborhood', state.environment.neighborhood)
      + continuityRow('Building', state.environment.building)
      + continuityRow('Home type', state.environment.homeType)
      + continuityRow('Mood', state.environment.mood)
      + continuityRow('Favorite spot', state.environment.favoriteSpot)
      + `<div class="home-row"><div class="home-key">Source</div><div class="home-val">${sourceHtml}</div></div>`
      + `<div class="alpha-home-section-title">Transport / logistics</div>`
      + continuityRow('Licence', `${state.transport.license} · drives: ${state.transport.drives}`)
      + continuityRow('Vehicle', state.transport.vehicle)
      + continuityRow('Parking', state.transport.parking)
      + continuityRow('Commute', state.transport.commute)
      + `<div class="alpha-home-section-title">Repeat-use prompts</div>`
      + continuityPrompt('Room prompt', state.prompts.room)
      + continuityPrompt('Exterior prompt', state.prompts.yard)
      + continuityPrompt('Interior note', state.notes.interior)
      + continuityPrompt('Exterior note', state.notes.exterior)
      + `</div>`;
  }
  function saveConsistencyNotes(id){
    const pulse = loadPulse();
    pulse.homes = pulse.homes || {};
    pulse.homes[id] = pulse.homes[id] || getHomeState(id);
    const area = qs('#cons-note-'+id);
    pulse.homes[id].notes = area ? area.value : (pulse.homes[id].notes || '');
    try{ localStorage.setItem(PULSE_KEY, JSON.stringify(pulse)); }catch(e){}
    saveStateMaybe();
    toast('Consistency notes saved');
  }
  window.saveConsistencyNotes = saveConsistencyNotes;
  function copyConsistencySummary(id){
    const rec = getCharRecord(id), p = getHomeState(id);
    const summary = `${rec.name}\nUsage: ${p.usageRule || ''}\nHome: Living room, bedroom, workspace, kitchen, bathroom, exterior\nOutfits: 6 selectable outfit slots\nItems: phone, bag, laptop, car, keys, signature\nNotes: ${p.notes || ''}`;
    navigator.clipboard.writeText(summary).then(()=>toast('Consistency summary copied'));
  }
  window.copyConsistencySummary = copyConsistencySummary;
  function uploadHook(id, group, key){
    if(typeof window.uploadConsistencyRef === 'function') return `window.uploadConsistencyRef('${id}','${group}','${key}')`;
    if(typeof window.uploadHomeAsset === 'function' && group==='home') return `window.uploadHomeAsset('${id}','${key}')`;
    return `void(0)`;
  }
  function slot(src, label, onclick){
    return `<div class="home-slot ${src?'has-img':''}" onclick="${onclick}">${src?`<img src="${src}">`:''}<div class="home-slot-ph">${esc(label)}<br><span style="font-size:var(--type-2xs);opacity:.62">Click to upload</span></div></div>`;
  }
  function focusedDetailCard(id){
    const ui = ensureHomeCollapseDefaults(loadHomeUI(), [id]);
    const rec = getCharRecord(id);
    const p = getHomeState(id);
    const state = getContinuityState(id);
    const refs = state.refs;
    const coverageText = `${['livingRoom','bedroom','workspace','kitchen','bathroom','exterior'].filter(k => refs[k]).length} home refs · ${(p.outfits||[]).filter(Boolean).length} outfits · ${Object.keys(p.items||{}).filter(k => p.items[k]).length} items`;
    return `<div class="home-card alpha-home-open-stage" style="--home-stage-accent:${rec.color}">`
      + `<div class="alpha-home-card-head">`
      +   `<div class="alpha-home-card-copy">`
      +     `<div class="alpha-home-kicker">Home continuity system</div>`
      +     `<div class="home-title">${esc(rec.name)}</div>`
      +     `<div class="home-sub">${esc(rec.role)}</div>`
      +     `<div class="alpha-home-lead">Keep this page useful, selective, and grounded. The goal is not to stuff prompts with random décor. The goal is to preserve the spaces, habits, and objects that make ${esc(rec.name.split(' ')[0])} feel like the same person every time.</div>`
      +   `</div>`
      +   `<div class="alpha-home-card-tools"><span class="mode-indicator selective-chip" style="--orbit-color:${rec.color}">Selective refs</span><button class="btn btn-ghost btn-sm" type="button" onclick="window.copyConsistencySummary('${id}')">Copy summary</button><button class="btn btn-ghost btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}', true)">Sync state</button></div>`
      + `</div>`
      + `<div class="alpha-home-summary-band">`
      +   `<div class="alpha-home-summary-pill"><span class="k">Neighborhood</span><span class="v">${esc(firstText(state.environment.neighborhood, 'Editable'))}</span></div>`
      +   `<div class="alpha-home-summary-pill"><span class="k">Home type</span><span class="v">${esc(firstText(state.environment.homeType, 'Still open'))}</span></div>`
      +   `<div class="alpha-home-summary-pill"><span class="k">Commute</span><span class="v">${esc(firstText(state.transport.commute, 'Unspecified'))}</span></div>`
      +   `<div class="alpha-home-summary-pill"><span class="k">Coverage</span><span class="v">${esc(coverageText)}</span></div>`
      + `</div>`
      + `<div class="alpha-home-visual-shell">`
      +   `<div class="alpha-home-ref-stage">`
      +     `<div class="alpha-home-panel">`
      +       `<div class="alpha-home-ref-panel-title"><strong>Home / exterior refs</strong><span>first-look continuity</span></div>`
      +       `<div class="alpha-home-note" style="margin-bottom:12px">These are the first assets the page should surface. Keep them lean and useful.</div>`
      +       `<div class="alpha-home-ref-grid">`
      +         slot(refs.livingRoom||'', 'Living room', uploadHook(id,'home','livingRoom'))
      +         slot(refs.bedroom||'', 'Bedroom', uploadHook(id,'home','bedroom'))
      +         slot(refs.workspace||'', 'Workspace', uploadHook(id,'home','workspace'))
      +         slot(refs.kitchen||'', 'Kitchen', uploadHook(id,'home','kitchen'))
      +         slot(refs.bathroom||'', 'Bathroom', uploadHook(id,'home','bathroom'))
      +         slot(refs.exterior||'', 'Exterior', uploadHook(id,'home','exterior'))
      +       `</div>`
      +     `</div>`
      +     `<div class="alpha-home-compact-grid">`
      +       `<div class="alpha-home-panel">`
      +         `<div class="alpha-home-ref-panel-title"><strong>Outfit refs</strong><span>quick wardrobe lane</span></div>`
      +         `<div class="home-slots alpha-home-slots alpha-home-slots-outfits">`
      +           [0,1,2,3,4,5].map(i=>slot(p.outfits[i]||'', 'Outfit '+(i+1), uploadHook(id,'outfit',String(i)))).join('')
      +         `</div>`
      +       `</div>`
      +       `<div class="alpha-home-panel">`
      +         `<div class="alpha-home-ref-panel-title"><strong>Unique items</strong><span>repeat-use props</span></div>`
      +         `<div class="home-slots alpha-home-slots alpha-home-slots-items">`
      +           slot(p.items.phone||'', 'Phone', uploadHook(id,'item','phone'))
      +           slot(p.items.bag||'', 'Bag', uploadHook(id,'item','bag'))
      +           slot(p.items.laptop||'', 'Laptop', uploadHook(id,'item','laptop'))
      +           slot(p.items.car||'', 'Car', uploadHook(id,'item','car'))
      +           slot(p.items.keys||'', 'Keys', uploadHook(id,'item','keys'))
      +           slot(p.items.signature||'', 'Signature item', uploadHook(id,'item','signature'))
      +         `</div>`
      +       `</div>`
      +     `</div>`
      +     `<div class="alpha-home-admin-grid">`
      +       collapsibleSection(id, 'continuity', 'Continuity anchors', 'Editable identity-linked environment data', `<div class="alpha-home-field-grid">`
      +         fieldInput(id, 'neighborhood', 'Neighborhood', state.environment.neighborhood)
      +         fieldInput(id, 'building', 'Building', state.environment.building)
      +         fieldInput(id, 'homeType', 'Home type', state.environment.homeType)
      +         fieldInput(id, 'favoriteSpot', 'Favorite spot', state.environment.favoriteSpot)
      +         fieldTextarea(id, 'homeMood', 'Mood', state.environment.mood, {wide:true})
      +         fieldInput(id, 'sourceLabel', 'Source label', state.notes.sourceLabel)
      +         fieldInput(id, 'sourceUrl', 'Source URL', state.notes.sourceUrl || '', {wide:true, placeholder:'Optional external anchor URL'})
      +       `</div><div class="alpha-home-actionbar"><button class="btn btn-primary btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}')">Save anchors</button></div>`, ui)
      +       collapsibleSection(id, 'transport', 'Transport / logistics', 'Movement, access, and routine detail', `<div class="alpha-home-field-grid">`
      +         fieldInput(id, 'driversLicense', 'Licence', state.transport.license)
      +         fieldInput(id, 'drives', 'Drives', state.transport.drives)
      +         fieldInput(id, 'vehicle', 'Vehicle', state.transport.vehicle)
      +         fieldInput(id, 'parking', 'Parking', state.transport.parking)
      +         fieldInput(id, 'commute', 'Commute', state.transport.commute, {wide:true})
      +       `</div><div class="alpha-home-actionbar"><button class="btn btn-primary btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}')">Save transport</button></div>`, ui)
      +       collapsibleSection(id, 'prompts', 'Repeat-use prompts', 'Prompt anchors that should earn their way in', `<div class="alpha-home-field-grid">`
      +         fieldTextarea(id, 'roomPrompt', 'Room prompt', state.prompts.room, {wide:true, large:true})
      +         fieldTextarea(id, 'yardPrompt', 'Exterior prompt', state.prompts.yard, {wide:true, large:true})
      +         fieldTextarea(id, 'interiorNote', 'Interior note', state.notes.interior, {wide:true})
      +         fieldTextarea(id, 'yardNote', 'Exterior note', state.notes.exterior, {wide:true})
      +       `</div><div class="alpha-home-actionbar"><button class="btn btn-primary btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}')">Save prompts</button></div>`, ui)
      +     `</div>`
      +   `</div>`
      +   `<div class="alpha-home-quick-rail">`
      +     `<div class="alpha-home-panel">`
      +       `<div class="alpha-home-panel-title">Quick snapshot</div>`
      +       `<div class="alpha-home-mini-list">`
      +         `<div class="alpha-home-mini-item"><span class="k">Building</span><span class="v">${esc(firstText(state.environment.building, 'Not locked yet'))}</span></div>`
      +         `<div class="alpha-home-mini-item"><span class="k">Favorite spot</span><span class="v">${esc(firstText(state.environment.favoriteSpot, 'Still open'))}</span></div>`
      +         `<div class="alpha-home-mini-item"><span class="k">Vehicle</span><span class="v">${esc(firstText(state.transport.vehicle, 'None locked'))}</span></div>`
      +         `<div class="alpha-home-mini-item"><span class="k">Exterior note</span><span class="v">${esc(firstText(state.notes.exterior, 'No exterior note yet.'))}</span></div>`
      +       `</div>`
      +     `</div>`
      +     `<div class="alpha-home-panel">`
      +       continuityPanel(id)
      +     `</div>`
      +     `<div class="alpha-home-panel">`
      +       `<div class="alpha-home-panel-title">Usage rule</div>`
      +       `<div class="alpha-home-panel-copy">Short rule for when this continuity should matter.</div>`
      +       `<div style="margin-top:10px">${fieldTextarea(id, 'usageRule', 'Usage rule', p.usageRule || 'Use selectively when relevant to the prompt or scene. Never force these into every generation.', {wide:true, placeholder:'How the system should use these continuity anchors.'})}</div>`
      +       `<div class="alpha-home-actionbar"><button class="btn btn-primary btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}')">Save rule</button></div>`
      +     `</div>`
      +     `<div class="alpha-home-panel">`
      +       `<div class="alpha-home-panel-title">Consistency notes</div>`
      +       `<div style="margin-top:10px">${fieldTextarea(id, 'pulseNotes', 'Consistency notes', p.notes || '', {wide:true, placeholder:'Keep this concise and practical.'})}</div>`
      +       `<div class="alpha-home-actionbar"><button class="btn btn-primary btn-sm" type="button" onclick="window.saveFocusedHomeProfile('${id}')">Save notes</button></div>`
      +     `</div>`
      +   `</div>`
      + `</div>`
      + `</div>`;
  }
  function buildSlide(id){
    const rec = getCharRecord(id); const p = getHomeState(id); const state = getContinuityState(id); const refs = state.refs;
    return `<div class="alpha-home-fixed-slide" data-home-slide="${id}">`
      + `<div class="alpha-home-fixed-slide-head"><div><div class="alpha-home-fixed-slide-name">${esc(rec.name)}</div><div class="alpha-home-fixed-slide-sub">${esc(rec.role)} · A lighter comparison view for continuity, refs, and travel logic.</div></div><div class="alpha-home-fixed-slide-badge">Selective refs</div></div>`
      + `<div class="alpha-home-fixed-slide-grid">`
      +   `<div class="alpha-home-preview-row">`
      +     `<div class="alpha-home-preview-cell"><span class="k">Neighborhood</span><span class="v">${esc(firstText(state.environment.neighborhood, 'Still open'))}</span></div>`
      +     `<div class="alpha-home-preview-cell"><span class="k">Mood</span><span class="v">${esc(firstText(state.environment.mood, 'Not written yet'))}</span></div>`
      +     `<div class="alpha-home-preview-cell"><span class="k">Commute</span><span class="v">${esc(firstText(state.transport.commute, 'Unspecified'))}</span></div>`
      +   `</div>`
      +   `<div class="home-slots alpha-home-slots">`
      +     slot(refs.livingRoom||'', 'Living room', uploadHook(id,'home','livingRoom'))
      +     slot(refs.workspace||'', 'Workspace', uploadHook(id,'home','workspace'))
      +     slot(refs.exterior||'', 'Exterior', uploadHook(id,'home','exterior'))
      +     slot((p.outfits||[])[0]||'', 'Primary outfit', uploadHook(id,'outfit','0'))
      +   `</div>`
      +   `<div class="alpha-home-preview-row">`
      +     `<div class="alpha-home-preview-cell"><span class="k">Vehicle</span><span class="v">${esc(firstText(state.transport.vehicle, 'No lock yet'))}</span></div>`
      +     `<div class="alpha-home-preview-cell"><span class="k">Favorite spot</span><span class="v">${esc(firstText(state.environment.favoriteSpot, 'Still open'))}</span></div>`
      +     `<div class="alpha-home-preview-cell"><span class="k">Room prompt</span><span class="v">${esc(firstText(state.prompts.room, 'No room prompt yet.'))}</span></div>`
      +   `</div>`
      + `</div>`
      + `<div class="alpha-home-fixed-actions"><button class="btn btn-ghost btn-sm" type="button" onclick="window.__silvaOpenFocusedHome('${id}')">Open ${esc(rec.name.split(' ')[0])}</button></div>`
      + `</div>`;
  }
  function matchesHomeSearch(id, search){
    if(!search) return true;
    const rec = getCharRecord(id);
    const state = getContinuityState(id);
    const haystack = [
      rec.name,
      rec.role,
      state.pulse.notes,
      state.pulse.usageRule,
      state.environment.neighborhood,
      state.environment.building,
      state.environment.homeType,
      state.environment.mood,
      state.environment.favoriteSpot,
      state.transport.vehicle,
      state.transport.commute,
      state.prompts.room,
      state.prompts.yard,
      state.notes.interior,
      state.notes.exterior,
      Object.keys(state.refs || {}).join(' '),
      Object.keys(state.pulse.items || {}).join(' ')
    ].join(' ').toLowerCase();
    return haystack.includes(search);
  }
  function bindHomeSearch(page, ui){
    const search = qs('#home-search', page);
    if(!search) return;
    search.addEventListener('input', function(){
      const nextValue = this.value || '';
      clearTimeout(page.__silvaHomeSearchTimer);
      page.__silvaHomeSearchTimer = setTimeout(function(){
        ui.search = nextValue;
        saveJSON(HOME_UI_KEY, ui);
        renderHomesV12({force:true});
      }, 120);
    });
  }
  function fieldValue(id, key){
    const el = document.getElementById('home-field-' + id + '-' + key);
    return el ? String(el.value || '').trim() : '';
  }
  function persistFocusedHomeProfile(id){
    window.STATE = window.STATE || {};
    STATE.homeProfiles = STATE.homeProfiles || {};
    STATE.teamRecords = STATE.teamRecords || {};
    const profile = Object.assign({}, STATE.homeProfiles[id] || {});
    profile.neighborhood = fieldValue(id, 'neighborhood');
    profile.building = fieldValue(id, 'building');
    profile.homeType = fieldValue(id, 'homeType');
    profile.homeMood = fieldValue(id, 'homeMood');
    profile.favoriteSpot = fieldValue(id, 'favoriteSpot');
    profile.sourceUrl = fieldValue(id, 'sourceUrl');
    const sourceLabel = fieldValue(id, 'sourceLabel');
    if(sourceLabel) profile.sourceLabel = sourceLabel;
    profile.driversLicense = fieldValue(id, 'driversLicense');
    profile.drives = fieldValue(id, 'drives');
    profile.vehicle = fieldValue(id, 'vehicle');
    profile.parking = fieldValue(id, 'parking');
    profile.commute = fieldValue(id, 'commute');
    profile.roomPrompt = fieldValue(id, 'roomPrompt');
    profile.yardPrompt = fieldValue(id, 'yardPrompt');
    profile.interiorNote = fieldValue(id, 'interiorNote');
    profile.yardNote = fieldValue(id, 'yardNote');
    profile.usageRule = fieldValue(id, 'usageRule');
    profile.continuityNotes = fieldValue(id, 'pulseNotes');
    STATE.homeProfiles[id] = profile;
    STATE.teamRecords[id] = Object.assign({}, STATE.teamRecords[id] || {}, {
      driversLicense: profile.driversLicense,
      drives: profile.drives,
      vehicle: profile.vehicle,
      parking: profile.parking,
      homeBase: profile.neighborhood,
      commute: profile.commute
    });

    const pulse = loadPulse();
    pulse.homes = pulse.homes || {};
    pulse.homes[id] = pulse.homes[id] || getHomeState(id);
    pulse.homes[id].usageRule = profile.usageRule || pulse.homes[id].usageRule || '';
    pulse.homes[id].notes = profile.continuityNotes || '';
    try{ localStorage.setItem(PULSE_KEY, JSON.stringify(pulse)); }catch(e){}
    saveStateMaybe();
  }
  window.saveFocusedHomeProfile = function(id, silent){
    persistFocusedHomeProfile(id);
    if(isPageActive('homes')) renderHomesV12({force:true});
    if(window.renderTeamOps) try{ window.renderTeamOps(); }catch(e){}
    if(!silent) toast('Home continuity updated');
  };
  window.toggleHomeSection = function(id, key){
    const ui = loadHomeUI();
    ui.collapsed = ui.collapsed || {};
    const mapKey = sectionKey(id, key);
    ui.collapsed[mapKey] = !ui.collapsed[mapKey];
    saveHomeUI(ui);
    renderHomesV12({force:true});
  };
  function setFocusedHome(page, active){
    qsa('.alpha-home-fixed-tab', page).forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-home-id') === active));
    const detail = qs('.alpha-home-fixed-detailwrap', page);
    if(detail) detail.innerHTML = focusedDetailCard(active);
  }
  function renderHomesV12(opts){
    const page = qs('#page-homes'); if(!page) return;
    const options = opts === true ? {force:true} : (opts || {});
    if(!options.force && !isPageActive('homes')) return;
    const allIds = teamOrder();
    ensureHomePolishStyle();
    const ui = ensureHomeCollapseDefaults(loadHomeUI(), allIds);
    const searchVal = String(ui.search || '').trim().toLowerCase();
    const ids = allIds.filter(id => matchesHomeSearch(id, searchVal));
    const visibleIds = ids.length ? ids : allIds;
    let active = ui.active && visibleIds.includes(ui.active) ? ui.active : visibleIds[0];
    page.classList.add('alpha-home-v12-page');
    page.dataset.homeRenderer = 'renderHomesV12';
    page.innerHTML = `<div class="page-title">Home System</div>`
      + `<div class="page-sub">A cleaner continuity workspace for where each character lives, how they move, and which rooms, objects, and outfit anchors are worth carrying forward. Keep it selective. Keep it true. Keep it useful.</div>`
      + ``
      + `<div class="alpha-home-fixed-toolbar">`
      + `<div class="alpha-home-view-toggle"><button class="btn btn-ghost btn-sm ${ui.view==='focused'?'active-mode':''}" id="home-view-focused" type="button">Focused view</button><button class="btn btn-ghost btn-sm ${ui.view==='all'?'active-mode':''}" id="home-view-all" type="button">All team view</button></div>`
      + `<input class="search-input" id="home-search" placeholder="Search consistency notes..." value="${esc(ui.search || '')}">`
      + `</div>`
      + `<div class="alpha-home-fixed-focus alpha-home-system-shell ${ui.view==='all'?'hidden':''}" id="alpha-home-focused">`
      +   `<div class="alpha-home-fixed-shell v13-shell">`
      +     `<div class="alpha-home-fixed-topbar"><div class="alpha-home-fixed-tabs" id="alpha-home-fixed-tabs">` + visibleIds.map(function(id){ const rec=getCharRecord(id); return `<button class="alpha-home-fixed-tab ${id===active?'active':''}" data-home-id="${id}"><span class="alpha-home-menu-dot" style="background:${rec.color}"></span><span class="alpha-home-fixed-tab-copy"><strong>${esc(rec.name)}</strong><span>${esc(rec.role)}</span></span></button>`; }).join('') + `</div></div>`
      +     `<div class="alpha-home-fixed-detailwrap">${focusedDetailCard(active)}</div>`
      +   `</div>`
      + `</div>`
      + `<div class="alpha-home-fixed-carousel alpha-home-system-shell ${ui.view==='all'?'active':''}" id="alpha-home-carousel">`
      +   `<div class="alpha-home-fixed-top"><div><div class="section-title" style="margin-bottom:6px">All Team Refs</div><div class="alpha-settings-note">A calmer side-by-side sweep across each person’s most useful continuity anchors.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="home-slide-prev" type="button">← Prev</button><button class="btn btn-ghost btn-sm" id="home-slide-next" type="button">Next →</button></div></div>`
      +   `<div class="alpha-home-fixed-track" id="alpha-home-track">`+visibleIds.map(buildSlide).join('')+`</div>`
      + `</div>`;
    bindHomeSearch(page, ui);
    qsa('.alpha-home-fixed-tab', page).forEach(btn=>btn.addEventListener('click', function(){
      const nextId = btn.getAttribute('data-home-id');
      if(!nextId) return;
      ui.active = nextId;
      ui.view = 'focused';
      saveJSON(HOME_UI_KEY, ui);
      setFocusedHome(page, nextId);
    }));
    const focusBtn = qs('#home-view-focused', page), allBtn = qs('#home-view-all', page);
    if(focusBtn) focusBtn.onclick=function(){ ui.view='focused'; saveJSON(HOME_UI_KEY, ui); renderHomesV12({force:true}); };
    if(allBtn) allBtn.onclick=function(){ ui.view='all'; saveJSON(HOME_UI_KEY, ui); renderHomesV12({force:true}); };
    const track = qs('#alpha-home-track', page), prev = qs('#home-slide-prev', page), next = qs('#home-slide-next', page);
    if(prev && track) prev.onclick=()=>track.scrollBy({left:-track.clientWidth, behavior:'smooth'});
    if(next && track) next.onclick=()=>track.scrollBy({left:track.clientWidth, behavior:'smooth'});
    window.__silvaOpenFocusedHome = function(id){
      ui.active = id;
      ui.view = 'focused';
      saveJSON(HOME_UI_KEY, ui);
      renderHomesV12({force:true});
    };
  }
  function providerDefaults(){
    return {
      textPrimary:{provider:'supergrok', model:'', apiKey:''},
      imagePrimary:{provider:'nanobanana', model:'', apiKey:''},
      fallback1:{provider:'gemini', model:'', apiKey:''},
      fallback2:{provider:'manual', model:'', apiKey:''},
      pulseApiKeys:[],
      notes:'Keep production keys server-side when you wire the live backend. This page is your control surface for provider order, fallbacks, and quick switching.'
    };
  }
  function normalizeProviderEntry(entry, idx){
    const item = entry && typeof entry === 'object' ? entry : {};
    return {
      id: String(item.id || `provider-fallback-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,6)}`),
      label: String(item.label || item.name || `Fallback ${idx + 1}`),
      provider: String(item.provider || 'gemini'),
      model: String(item.model || 'gemini-2.5-flash'),
      apiKey: String(item.apiKey || ''),
      enabled: item.enabled !== false
    };
  }
  function normalizeProviders(raw){
    const cfg = Object.assign(providerDefaults(), raw || {});
    const migrated = [];
    [cfg.textPrimary, cfg.fallback1, cfg.fallback2].forEach((item, idx) => {
      if (!item || !item.apiKey || !String(item.provider || '').toLowerCase().includes('gemini')) return;
      migrated.push({
        label: idx === 0 ? 'Primary Gemini' : `Legacy fallback ${idx}`,
        provider: item.provider || 'gemini',
        model: item.model || 'gemini-2.5-flash',
        apiKey: '',
        enabled: true
      });
    });
    const seen = new Set();
    cfg.pulseApiKeys = [...(Array.isArray(cfg.pulseApiKeys) ? cfg.pulseApiKeys : []), ...migrated]
      .map(normalizeProviderEntry)
      .filter(item => {
        if (!item.apiKey) return true;
        const sig = `${item.provider}::${item.model}::${item.apiKey}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    return cfg;
  }
  function loadProviders(){
    const localCfg = loadJSON(PROVIDER_KEY, {});
    const backupCfg = loadJSON(PROVIDER_BACKUP_KEY, {});
    let stateCfg = {};
    try{ stateCfg = (window.STATE && STATE.providerSettings && typeof STATE.providerSettings === 'object') ? STATE.providerSettings : {}; }catch(e){}
    return normalizeProviders(Object.assign({}, stateCfg || {}, backupCfg || {}, localCfg || {}));
  }
  function scrubProviderSecrets(cfg){
    if (!cfg || typeof cfg !== 'object') return cfg;
    Object.keys(cfg).forEach(key => {
      if (/api.?key|token|secret/i.test(key)) cfg[key] = '';
      else if (cfg[key] && typeof cfg[key] === 'object') scrubProviderSecrets(cfg[key]);
    });
    return cfg;
  }
  function handoffProviderSurface(surface){
    if (!window.SilvaProviderControlCenter) return false;
    if (surface === 'providers' && typeof window.SilvaProviderControlCenter.renderProviderShell === 'function') {
      window.SilvaProviderControlCenter.renderProviderShell();
      return true;
    }
    if (surface === 'settings' && typeof window.SilvaProviderControlCenter.renderSettingsShell === 'function') {
      window.SilvaProviderControlCenter.renderSettingsShell();
      return true;
    }
    return false;
  }
  function saveProviders(obj){
    const cfg = scrubProviderSecrets(normalizeProviders(obj));
    saveJSON(PROVIDER_KEY, cfg);
    saveJSON(PROVIDER_BACKUP_KEY, cfg);
    try{
      window.STATE = window.STATE || {};
      STATE.providerSettings = Object.assign({}, STATE.providerSettings || {});
      STATE.providerSettings.defaultTextProvider = cfg.textPrimary.provider || 'supergrok';
      STATE.providerSettings.defaultImageProvider = cfg.imagePrimary.provider || 'nanobanana';
      STATE.providerSettings.textPrimary = scrubProviderSecrets(JSON.parse(JSON.stringify(cfg.textPrimary || {})));
      STATE.providerSettings.imagePrimary = scrubProviderSecrets(JSON.parse(JSON.stringify(cfg.imagePrimary || {})));
      STATE.providerSettings.fallback1 = scrubProviderSecrets(JSON.parse(JSON.stringify(cfg.fallback1 || {})));
      STATE.providerSettings.fallback2 = scrubProviderSecrets(JSON.parse(JSON.stringify(cfg.fallback2 || {})));
      STATE.providerSettings.pulseApiKeys = scrubProviderSecrets(JSON.parse(JSON.stringify(cfg.pulseApiKeys || [])));
      STATE.providerSettings.notes = String(cfg.notes || '');
    }catch(e){}
    saveStateMaybe();
    try{
      if (typeof window.syncStateToBackend === 'function' && window.location.protocol !== 'file:') {
        setTimeout(function(){ try { window.syncStateToBackend('settings_provider_shell'); } catch(e){} }, 40);
      }
    }catch(e){}
    toast('Provider shell saved');
  }
  function providerFallbackRow(prefix, item){
    const row = normalizeProviderEntry(item, 0);
    return `<div class="alpha-provider-card" data-provider-row="${esc(row.id)}"><div class="section-title">${esc(row.label || 'Fallback key')}</div><div class="alpha-provider-grid">`
      + `<div><div class="field-label">Label</div><input class="field-input" data-provider-field="label" value="${esc(row.label||'')}"></div>`
      + `<div><div class="field-label">Model</div><input class="field-input" data-provider-field="model" value="${esc(row.model||'')}" placeholder="gemini-2.5-flash"></div>`
      + `<div style="grid-column:1 / -1"><div class="field-label">API key</div><input class="field-input" data-provider-field="apiKey" value="" placeholder="Use Provider Control Center"></div>`
      + `<div><div class="field-label">Active</div><label class="alpha-settings-note" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input type="checkbox" data-provider-field="enabled"${row.enabled ? ' checked' : ''}> Use this key</label></div>`
      + `<div style="display:flex;align-items:flex-end;justify-content:flex-end"><button class="btn btn-ghost btn-sm" type="button" data-provider-remove="${esc(row.id)}">Remove</button></div>`
      + `</div></div>`;
  }
  function providerEditorHTML(cfg){
    function block(prefix,title,data){
      return `<div class="alpha-provider-card"><div class="section-title">${title}</div><div class="alpha-provider-grid">`
        + `<div><div class="field-label">Provider</div><input class="field-input" id="${prefix}-provider" value="${esc(data.provider||'')}"></div>`
        + `<div><div class="field-label">Model</div><input class="field-input" id="${prefix}-model" value="${esc(data.model||'')}"></div>`
        + `<div style="grid-column:1 / -1"><div class="field-label">API key</div><input class="field-input" id="${prefix}-key" value="" placeholder="Use Provider Control Center"></div>`
        + `</div></div>`;
    }
    const pulseKeys = (cfg.pulseApiKeys || []).map(item => providerFallbackRow('pulse', item)).join('');
    return `<div class="alpha-provider-stack">`
      + `<div class="alpha-provider-card"><div class="section-title">Provider routing</div><div class="alpha-settings-note">Add or edit your primary providers and fallback keys here. This is the place to switch models without digging through random files.</div></div>`
      + block('prov-text','Primary text provider', cfg.textPrimary)
      + block('prov-image','Primary image provider', cfg.imagePrimary)
      + block('prov-fallback1','Fallback 1', cfg.fallback1)
      + block('prov-fallback2','Fallback 2', cfg.fallback2)
      + `<div class="alpha-provider-card"><div class="section-title">Studio Pulse fallback keys</div><div class="alpha-settings-note">The Studio Pulse chat can cycle through multiple Gemini keys in order before falling back to the server \`.env\` key.</div><div id="provider-fallback-list">${pulseKeys || '<div class="alpha-settings-note" style="margin-top:10px">No extra Studio Pulse fallback keys saved yet.</div>'}</div><div class="alpha-provider-actions"><button class="btn btn-ghost" type="button" id="add-provider-fallback">Add fallback key</button></div></div>`
      + `<div class="alpha-provider-card"><div class="section-title">Notes</div><textarea class="field-textarea" id="prov-notes" style="min-height:110px">${esc(cfg.notes||'')}</textarea><div class="alpha-provider-actions"><button class="btn btn-primary" type="button" id="save-provider-shell">Save provider shell</button></div></div>`
      + `</div>`;
  }
  function collectProviderForm(root){
    function v(id){ return (qs('#'+id, root)||{}).value || ''; }
    const cfg = loadProviders();
    return {
      textPrimary:{provider:v('prov-text-provider').trim(), model:v('prov-text-model').trim(), apiKey:''},
      imagePrimary:{provider:v('prov-image-provider').trim(), model:v('prov-image-model').trim(), apiKey:''},
      fallback1:{provider:v('prov-fallback1-provider').trim(), model:v('prov-fallback1-model').trim(), apiKey:''},
      fallback2:{provider:v('prov-fallback2-provider').trim(), model:v('prov-fallback2-model').trim(), apiKey:''},
      pulseApiKeys:Array.from(qsa('[data-provider-row]', root)).map((row, index) => {
        const seed = (cfg.pulseApiKeys || [])[index] || {};
        const pick = (prop) => qs(`[data-provider-field="${prop}"]`, row);
        return normalizeProviderEntry({
          id: row.getAttribute('data-provider-row') || seed.id,
          label: pick('label')?.value || '',
          provider: 'gemini',
          model: pick('model')?.value || '',
          apiKey: '',
          enabled: !!pick('enabled')?.checked
        }, index);
      }).filter(item => item.apiKey || item.label || item.model),
      notes:v('prov-notes')
    };
  }
  function bindProviderEditor(root){
    const btn = qs('#save-provider-shell', root);
    if(btn) btn.onclick = function(){ saveProviders(collectProviderForm(root)); };
    const add = qs('#add-provider-fallback', root);
    if(add) add.onclick = function(){
      const cfg = loadProviders();
      cfg.pulseApiKeys = cfg.pulseApiKeys || [];
      cfg.pulseApiKeys.push(normalizeProviderEntry({ label:`Fallback ${cfg.pulseApiKeys.length + 1}`, provider:'gemini', model:'gemini-2.5-flash', apiKey:'', enabled:true }, cfg.pulseApiKeys.length));
      saveProviders(cfg);
      const rerender = root.id === 'page-settings' ? renderSettingsV12 : renderProviderShellV12;
      rerender();
    };
    qsa('[data-provider-remove]', root).forEach(btn => btn.onclick = function(){
      const id = btn.getAttribute('data-provider-remove');
      const cfg = loadProviders();
      cfg.pulseApiKeys = (cfg.pulseApiKeys || []).filter(item => String(item.id) !== String(id));
      saveProviders(cfg);
      const rerender = root.id === 'page-settings' ? renderSettingsV12 : renderProviderShellV12;
      rerender();
    });
  }
  function renderProviderShellV12(){
    const page = qs('#page-providers'); if(!page) return;
    if (handoffProviderSurface('providers')) return;
    const cfg = loadProviders();
    page.innerHTML = `<div class="page-title">Provider Shell</div><div class="page-sub">Primary + fallback routing, model switching, and API key management inside the system.</div><div class="alpha-provider-stack">${providerEditorHTML(cfg)}<div class="alpha-provider-card"><div class="section-title">Current defaults</div><div class="profile-item">Text: ${esc(cfg.textPrimary.provider||'—')}</div><div class="profile-item">Image: ${esc(cfg.imagePrimary.provider||'—')}</div><div class="profile-item">Fallback 1: ${esc(cfg.fallback1.provider||'—')}</div><div class="profile-item">Fallback 2: ${esc(cfg.fallback2.provider||'—')}</div><div class="profile-item">Studio Pulse key chain: ${(cfg.pulseApiKeys || []).filter(item => item.enabled && item.apiKey).length}</div></div></div>`;
    bindProviderEditor(page);
  }
  function renderSettingsV12(){
    const page = qs('#page-settings'); if(!page) return;
    if (handoffProviderSurface('settings')) return;
    const cfg = loadProviders();
    const homeCfg = loadJSON(HOME_UI_KEY, {view:'focused', active:'aisha', search:''});
    const pulseKeys = (cfg.pulseApiKeys || []).filter(item => item.enabled && item.apiKey).length;
    const primaryProviders = ['textPrimary','imagePrimary','fallback1','fallback2'].filter(key => cfg[key] && cfg[key].provider).length;
    page.innerHTML = `<div class="alpha-settings-shell"><div><div class="page-title">Settings</div><div class="page-sub">System controls, home defaults, provider routing, and the small decisions that keep V3 stable.</div></div><div class="alpha-settings-summary"><div class="alpha-settings-stat"><span class="k">Home default</span><span class="v">${esc((homeCfg.view || 'focused') === 'all' ? 'All team view' : 'Focused view')}</span><span class="s">The shell opens into the calmer continuity layout you save here.</span></div><div class="alpha-settings-stat"><span class="k">Provider routes</span><span class="v">${primaryProviders}</span><span class="s">Configured primary and fallback routes across text and image flows.</span></div><div class="alpha-settings-stat"><span class="k">Pulse key chain</span><span class="v">${pulseKeys}</span><span class="s">Extra Studio Pulse fallback keys ready before the server \`.env\` key.</span></div></div><div class="alpha-settings-grid"><div class="alpha-provider-card alpha-settings-home-card"><div class="section-title">Home System defaults</div><div><div class="field-label">Default view</div><select class="filter-select" id="settings-home-view"><option value="focused">Focused view</option><option value="all">All team view</option></select></div><div class="alpha-provider-actions"><button class="btn btn-ghost" id="settings-save-home" type="button">Save home settings</button></div><div class="alpha-settings-note-list"><div class="alpha-settings-note-item">Focused view keeps the selected ref surface clean and puts one character’s continuity first.</div><div class="alpha-settings-note-item">All team view turns Home System into a side-by-side sweep when you need comparison instead of depth.</div></div></div><div><div class="alpha-provider-card"><div class="section-title">Provider keys + fallbacks</div><div class="alpha-settings-note" style="margin-bottom:12px">This page stays practical: one place to tune live defaults, fallback chains, and provider notes without leaving the shell.</div>${providerEditorHTML(cfg)}</div></div></div></div>`;
    const sel = qs('#settings-home-view', page); if(sel) sel.value = homeCfg.view || 'focused';
    const saveHome = qs('#settings-save-home', page); if(saveHome) saveHome.onclick = function(){ homeCfg.view = sel.value; saveJSON(HOME_UI_KEY, homeCfg); toast('Home settings saved'); };
    bindProviderEditor(page);
  }
  function cleanGeneratorLayout(){
    const page = qs('#page-generator'); if(!page) return;
    qsa('.gen-grid', page).forEach(el=>{ el.classList.add('alpha-gen-fixed-grid'); });
    qsa('.gen-output, #gen-output-panel', page).forEach(el=>{ el.classList.add('alpha-gen-output-fix'); });
    qsa('*', page).forEach(el=>{
      if(textNorm(el.textContent)==='ai actions'){
        el.classList.add('alpha-gen-actions-title');
        const box = el.parentElement;
        if(box) box.classList.add('alpha-gen-actions-box');
      }
    });
  }
  window.renderHomesV12 = renderHomesV12;
  window.renderHomesV12.__shelfFixV14 = true;
  window.renderHomes = renderHomesV12;
  window.renderHomes.__shelfFixV14 = true;
  window.__SILVA_HOME_RENDERER_OWNER = 'renderHomesV12';
  window.openProviderShell = renderProviderShellV12;
  window.openSettingsShell = renderSettingsV12;
  window.renderProviderShellV12 = renderProviderShellV12;
  window.renderSettingsV12 = renderSettingsV12;

  function onReady(){
    ensurePages();
    patchNav();
    bindSidebar();
    cleanGeneratorLayout();
    const settingsPage = qs('#page-settings');
    const settingsActive = isPageActive('settings') || window.location.hash === '#settings';
    const providersActive = isPageActive('providers') || window.location.hash === '#providers';
    if(settingsPage && settingsActive && !textNorm(settingsPage.textContent || '')) renderSettingsV12();
    if(isPageActive('homes')) renderHomesV12({force:true});
    if(settingsActive) renderSettingsV12();
    if(providersActive) renderProviderShellV12();
  }
  window.addEventListener('load', function(){ setTimeout(onReady,100); setTimeout(onReady,500); setTimeout(onReady,1200); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) setTimeout(function(){ bindSidebar(); },150); });
})();
