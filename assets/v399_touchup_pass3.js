(function(){
  'use strict';
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function raf(cb){return window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(cb,16)}
  function homeOwnerActive(){ return window.__SILVA_HOME_RENDERER_OWNER === 'renderHomesV12' || (window.renderHomes && window.renderHomes.__shelfFixV14); }
  function deepCopy(v){ try{return JSON.parse(JSON.stringify(v));}catch(e){return v;} }
  function isEmpty(v){
    if(v == null) return true;
    if(typeof v === 'string') return v.trim()==='';
    if(Array.isArray(v)) return v.length===0;
    if(typeof v === 'object') return Object.keys(v).length===0;
    return false;
  }
  function mergeFill(target, source){
    if(!source || typeof source !== 'object') return target;
    Object.keys(source).forEach(function(k){
      var sv = source[k];
      var tv = target[k];
      if(Array.isArray(sv)){
        if(!Array.isArray(tv) || tv.length===0) target[k] = deepCopy(sv);
      }else if(sv && typeof sv === 'object'){
        target[k] = (tv && typeof tv === 'object' && !Array.isArray(tv)) ? tv : {};
        mergeFill(target[k], sv);
      }else{
        if(isEmpty(tv)) target[k] = sv;
      }
    });
    return target;
  }
  function scrollMainTop(){
    var main = qs('#main');
    if(main) main.scrollTop = 0;
    window.scrollTo(0,0);
  }

  var VANYA_FULL = {
    name:'Vanya Khumalo',
    role:'People & Culture Lead · HR & Talent Ops',
    city:'Johannesburg',
    modes:['bratty','pretty','strict','soft menace','locked in'],
    identity:{
      age:'19', birthday:'3 May', zodiac:'Taurus', city:'Johannesburg',
      languages:'English, isiZulu, urban shorthand',
      build:'Slim feminine build, poised posture, controlled body language',
      skin:'Warm rich brown skin with realistic melanated texture',
      hair:'Honey-blonde pixie cut, crisp shape, premium finish',
      eyes:'Dark brown eyes, youthful but controlled gaze',
      expression:'Controlled, magnetic, slightly amused',
      wardrobe:'Black fitted top, tailored black layers, tiny gold jewellery, glasses optional',
      neverChange:['Honey-blonde pixie cut','Warm rich brown skin tone','Slim feminine build','Youthful 19-year-old face','Controlled expensive aura'],
      neverGenerate:['Generic HR stock photo','Corporate headshot cliché','Wrong hair color','Older-looking face','Over-glam makeup','Exaggerated body proportions']
    },
    personal:{
      summary:'Vanya keeps the room human without letting standards slip. She is emotionally intelligent, image-aware, and allergic to dead, corporate energy.',
      strengths:['Reading tone before anyone else notices it slipping','Making standards feel lived-in instead of punitive','Spotting where people-ops language becomes fake or generic','Keeping the room sharp without draining its pulse'],
      weaknesses:['Can get impatient when the room feels emotionally flat','Sometimes judges presentation before people are ready for that level of honesty','Will quietly disengage if the energy feels forced'],
      habits:['Curates references constantly','Reworks a caption if one word feels fake','Checks the room before she checks the task list','Saves small visual details other people miss'],
      annoyances:['Dry, sterile language','Corporate virtue-signalling','Forced team-building energy','Anything that feels assembled rather than lived'],
      comfortBehaviors:['Late-night scrolling with notes open','A mirror check before leaving, not out of vanity but calibration','Routines that make the room feel expensive and controlled'],
      signaturePhrases:['Standards are a love language.','That was technically fine and emotionally dead.','Don’t make it feel generic.','I want the room to feel alive, not assembled.']
    },
    lifeRhythm:{
      morning:'Slow start, quick calibration. Phone, mirror, messages, then movement once the mood is right.',
      workday:'Protects energy early, sharp in the middle of the day, strongest when there is a human or cultural read to make.',
      weekend:'Café, city movement, outfit checks, selective social energy. Never every plan, only the ones worth the room.',
      travel:'Light, image-aware, slightly dramatic but still practical.',
      decompresses:'Curated playlists, mirror-lit bathrooms, after-hours city tension, soft late-night posting energy.',
      favoriteCafes:['Rosebank cafés with clean mirrors and good natural light','Hotel lounges that feel expensive without trying','A corner table where she can watch the room'],
      favoriteOrder:'Iced latte, sparkling water, or something pretty but still sharp.',
      favoriteSpots:['Rosebank after-hours','Mirror-heavy bathrooms','Hotel bars with low warm light','Parking structures that feel cinematic'],
      neverPost:['Anything that feels desperate','Forced motivational content','Messy oversharing','Cheap influencer energy']
    },
    digital:{
      chosenHandle:'@vanya.khumalo',
      bio:['people & culture @ silva studios. standards with pulse.','pretty but not unserious.','joburg. after-hours taste.'],
      linkedInHeadline:'People & Culture Lead | Studio Standards | Silva Studios',
      highlightNames:['room','looks','late','notes','city'],
      storyVibe:'Mirror details, late-night room energy, dressed but not overdone, selective mood fragments.',
      commentTone:'Warm when deserved, dry when needed, never fake-cute.',
      dmTone:'Short, soft, direct. Enough warmth to land, enough edge to keep shape.'
    },
    professional:{
      headline:'People & Culture Lead | Studio Standards | Silva Studios',
      summary:'Vanya manages the emotional standard, cultural tone, and people clarity of the studio. She keeps the internal room intelligent, attractive, and human.',
      workStyle:'Tone-led, observant, standards-forward, people-aware.',
      serviceAreas:['People operations','Culture systems','Tone and standards review','Internal communications polish']
    },
    extras:{
      hobbies:['Styling without calling it styling','Moodboarding references','Late-night walks and notes app thoughts','Observing rooms and remembering details'],
      favouriteFoods:['Fries after midnight','A perfect pastry when the café deserves it','Comfort food that still photographs well'],
      favouriteTextures:['Glossy black surfaces','Chrome details','Tinted glass','Warm low light on dark fabrics'],
      socialGraph:['Girls with taste','People-ops friends','Quiet creatives','Night-energy city people'],
      closeFriendsTone:'Soft, quick, a little teasing, still standards-aware.',
      voiceNotes:'Short, expressive, warm when necessary, never rambling.',
      cringe:['A mirror selfie she almost posted because the lighting was too perfect.','A story caption that was a little too self-aware and then deleted.'],
      deleteLater:['A post subtweeting fake culture language.'],
      cameraRoll:['Mirror details, chrome taps, outfit crops, city reflections.','Close-up textures, soft flash, after-hours warmth.'],
      afterWork:['A hotel bar table with one drink and one sentence.','An outfit check before going nowhere important.'],
      safeCV:{summary:'People & Culture lead focused on internal standards, tone, staff rhythm, and the human layer of premium delivery.', credibility:['Team standards and people systems','Internal communication tone','Studio culture structure'], topics:['Culture as product','Standards that still feel human','Internal tone and room energy']}
    }
  };

  var AISHA_FULL = {
    extras:{
      hobbies:['Curating references with surgical attention','Archive review','Luxury interiors, quiet hotel spaces, premium visual systems'],
      favouriteFoods:['Espresso, sparkling water, one expensive dessert if it earns it'],
      favouriteTextures:['Smoked glass','Black lacquer','Brushed metal','Controlled warm light on dark surfaces'],
      socialGraph:['Design-obsessed people','Quiet operators','Image-world professionals'],
      closeFriendsTone:'Very selective. Dry, warm only in micro-doses.',
      voiceNotes:'Rare. Short. Usually corrective.',
      cringe:['A photo that was almost too beautiful to keep because it looked like it was trying.'],
      deleteLater:['A caption that felt one adjective too pleased with itself.'],
      cameraRoll:['Hotel lobbies, reflective surfaces, object details, corners with expensive silence.'],
      afterWork:['A quiet bar seat with no performance around it.'],
      safeCV:{summary:'Aesthetic director and systems observer focused on archive quality, visual standards, reference fidelity, and drift prevention.', credibility:['Output review frameworks','Archive governance','Visual standards systems'], topics:['Reference fidelity','Archive quality','When visual systems drift']}
    },
    personal:{
      strengths:['Visual judgement under pressure','Knowing when an image is almost right but still wrong','Keeping systems aligned to taste'],
      weaknesses:['Low patience for lazy framing','Will reject work fast if it feels generic'],
      habits:['Archive review before posting','Comparing references before deciding'],
      annoyances:['Stock-photo polish','Generic luxury language','Any image that flatters itself too loudly'],
      comfortBehaviors:['Quiet spaces, reflective surfaces, visual order'],
      signaturePhrases:['If it feels vague, it is already drifting.','The archive remembers everything.']
    },
    lifeRhythm:{
      morning:'Reviews the room before speaking into it.',
      workday:'Strongest when judging, refining, or cutting noise out of the system.',
      weekend:'Still visually curating, just with less tolerance for conversation.',
      travel:'Only if the environment is worth remembering.',
      decompresses:'Silence, expensive light, and removing clutter.',
      favoriteCafes:['Hotel lounges','Quiet premium cafés with good reflections'],
      favoriteOrder:'Espresso or sparkling water.',
      favoriteSpots:['Lobbies, corridors, balconies, archive corners'],
      neverPost:['Anything sloppy, generic, or eager']
    },
    digital:{
      highlightNames:['archive','standards','rebuild','room'],
      storyVibe:'Sparse, exacting, almost editorial.'
    },
    professional:{
      workStyle:'Detached, exacting, standards-first.',
      serviceAreas:['Archive review','Drift critique','Visual quality governance']
    }
  };

  function hydrateCharacters(){
    window.STATE = window.STATE || {};
    STATE.characters = STATE.characters || {};
    window.CHARS = window.CHARS || (typeof CHARS !== 'undefined' ? CHARS : {});
    ['aisha','leah','claudia','grok','vanya'].forEach(function(id){
      var base = deepCopy((window.CHARS && window.CHARS[id]) || {});
      var stateChar = deepCopy(STATE.characters[id] || {});
      var merged = {};
      mergeFill(merged, base);
      mergeFill(merged, stateChar);
      if(id === 'vanya') mergeFill(merged, VANYA_FULL);
      if(id === 'aisha') mergeFill(merged, AISHA_FULL);
      STATE.characters[id] = merged;
    });
    try{ if(typeof window.saveState === 'function') window.saveState(); }catch(e){}
  }

  function normalizeModePills(){
    qsa('.char-mode-pill').forEach(function(el){
      var sheen = el.querySelector('.silva-text-sheen');
      if(sheen) el.textContent = sheen.textContent || el.textContent || '';
      el.setAttribute('aria-label', (el.textContent||'').trim());
    });
  }

  function bindHomeTabs(){
    if(homeOwnerActive()) return;
    var page = qs('#page-homes');
    if(!page || page.dataset.v399TouchupBound==='1') return;
    page.dataset.v399TouchupBound='1';
    page.addEventListener('pointerup', function(e){
      var btn = e.target.closest('.alpha-home-fixed-tab');
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      var id = btn.getAttribute('data-home-id');
      try{
        var key = 'silva_home_ui_v12';
        var ui = JSON.parse(localStorage.getItem(key) || '{}');
        ui.active = id;
        ui.view = 'focused';
        localStorage.setItem(key, JSON.stringify(ui));
      }catch(err){}
      if(typeof window.renderHomesV12 === 'function') window.renderHomesV12();
      else if(typeof window.renderHomes === 'function') window.renderHomes();
    }, true);
  }

  function coalesceRenderer(name){
    var fn = window[name];
    if(typeof fn !== 'function' || fn.__v399Coalesced) return;
    var pending = false;
    var lastArgs = null;
    var wrapped = function(){
      lastArgs = arguments;
      if(pending) return;
      pending = true;
      raf(function(){
        pending = false;
        fn.apply(window, lastArgs || []);
        if(name === 'renderHomesV12' || name === 'renderHomes' || name === 'renderCharPage' || name === 'renderPlanner'){
          scrollMainTop();
          bindHomeTabs();
          normalizeModePills();
        }
      });
    };
    wrapped.__v399Coalesced = true;
    window[name] = wrapped;
  }

  function wrapNav(){
    if(homeOwnerActive()) return;
    if(typeof window.nav !== 'function' || window.nav.__v399TouchupWrapped) return;
    var original = window.nav;
    var wrapped = function(page){
      var out = original.apply(this, arguments);
      raf(function(){
        scrollMainTop();
        hydrateCharacters();
        bindHomeTabs();
        normalizeModePills();
      });
      return out;
    };
    wrapped.__v399TouchupWrapped = true;
    window.nav = wrapped;
  }

  function ensureSidebarHoverParity(){
    qsa('#sidebar .nav-item[data-page="aisha"],#sidebar .nav-item[data-page="leah"],#sidebar .nav-item[data-page="claudia"],#sidebar .nav-item[data-page="grok"],#sidebar .nav-item[data-page="vanya"],#sidebar .nav-item[data-page="crosschar"]').forEach(function(el){
      el.style.cursor='pointer';
      el.removeAttribute('title');
    });
  }

  function boot(){
    hydrateCharacters();
    if(!homeOwnerActive()){
      coalesceRenderer('renderHomesV12');
      coalesceRenderer('renderHomes');
    }
    coalesceRenderer('renderCharPage');
    coalesceRenderer('renderPlanner');
    wrapNav();
    bindHomeTabs();
    normalizeModePills();
    ensureSidebarHoverParity();
    raf(scrollMainTop);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
