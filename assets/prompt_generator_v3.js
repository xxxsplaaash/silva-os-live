// FINAL POLISH QUESTION:
// Best thing right now: the generator now feels like a real production console where mode-aware social intelligence, routing visibility, and the final CTA point at one clear creative job.
// Still bothers me most: the live app still depends on many legacy patch layers and late overrides, which works but makes future polish riskier than a consolidated shell.
(function(){
  if (window.__promptGeneratorV3) return;
  window.__promptGeneratorV3 = true;

  var DEFAULT_ZAR_RATE = 18.5;
  var OWNER_ID = 'assets/prompt_generator_v3.js';
  var MODEL_FALLBACKS = [
    {
      id: 'google/nano-banana-2',
      displayName: 'Nano Banana 2',
      provider: 'Google Vertex AI',
      providerAdapter: 'google',
      qualityTier: 'standard',
      costEstimateUsd: 0.04,
      costEstimateZar: 0.74,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultiReference: true,
      supportsEditing: true,
      maxReferenceImages: 8,
      strengths: ['Fast Google-credit direct-reference route', 'Runs on Vertex Gemini 2.5 Flash Image', 'Multi-image fusion', 'Good final-image speed'],
      weaknesses: ['Less premium than Nano Banana Pro', 'Preview model access can vary by project'],
      bestFor: ['fast direct-reference final images', 'Google Cloud credit-backed images', 'multi-reference iteration'],
      avoidWhen: ['final identity render needs the strongest Google route', 'Vertex credentials are missing'],
      routingRoles: ['final_character_fallback', 'google_direct_reference', 'general_final']
    },
    {
      id: 'google/nano-banana-pro',
      displayName: 'Nano Banana Pro',
      provider: 'Google Vertex AI',
      providerAdapter: 'google',
      qualityTier: 'ultra',
      costEstimateUsd: 0.08,
      costEstimateZar: 1.48,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultiReference: true,
      supportsEditing: true,
      maxReferenceImages: 10,
      strengths: ['Primary Google-credit final image route', 'Runs on Vertex Gemini 3 Pro Image Preview', 'Direct reference-image input', 'Best Google route for identity renders'],
      weaknesses: ['Preview model access can vary by project', 'More expensive than Flash Image'],
      bestFor: ['final character images with real references', 'identity-preserving portraits', 'premium Google-credit visuals'],
      avoidWhen: ['the fast Google route is explicitly preferred', 'fal.ai-only behavior is specifically required'],
      routingRoles: ['premium_google', 'google_direct_reference', 'multi_reference', 'complex_edit']
    },
    {
      id: 'google/imagen-3-text-only',
      displayName: 'Imagen 3 Text-Only',
      provider: 'Google Vertex AI',
      providerAdapter: 'google',
      qualityTier: 'standard',
      costEstimateUsd: 0.04,
      costEstimateZar: 0.74,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: false,
      supportsMultiReference: false,
      supportsEditing: false,
      maxReferenceImages: 0,
      strengths: ['Clean Google text-to-image route', 'Predictable bulk generation', 'No-reference Google credit usage'],
      weaknesses: ['No direct reference input', 'Can drift on character identity', 'Not the default final route'],
      bestFor: ['bulk clean generation', 'simple no-reference final images'],
      avoidWhen: ['references are required', 'identity preservation matters'],
      routingRoles: ['bulk_clean_generation', 'clean_text_to_image']
    },
    {
      id: 'openai/gpt-image-2',
      displayName: 'GPT Image 2',
      provider: 'OpenAI GPT Image via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'premium',
      costEstimateUsd: 0.12,
      costEstimateZar: 2.22,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultiReference: true,
      supportsEditing: true,
      maxReferenceImages: 10,
      strengths: ['Complex edits', 'Semantic reference reasoning', 'Preserves details', 'Text/layout reasoning'],
      weaknesses: ['Requires fal.ai quota', 'Overkill for simple no-reference images'],
      bestFor: ['complex edits', 'layout-sensitive work', 'preservation-heavy transformations'],
      avoidWhen: ['bulk no-reference generation is enough'],
      routingRoles: ['complex_edit', 'multi_reference', 'text_rendering']
    },
    {
      id: 'openai/gpt-image-1.5',
      displayName: 'GPT Image 1.5',
      provider: 'OpenAI GPT Image via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'standard',
      costEstimateUsd: 0.08,
      costEstimateZar: 1.48,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultiReference: true,
      supportsEditing: true,
      maxReferenceImages: 6,
      strengths: ['fal.ai-hosted GPT fallback', 'Special feature compatibility', 'Good edit following'],
      weaknesses: ['Requires fal.ai quota', 'Use only when needed'],
      bestFor: ['fallback GPT Image work', 'older prompt experiments'],
      avoidWhen: ['GPT Image 2 is available'],
      routingRoles: ['fallback', 'special_feature']
    },
    {
      id: 'black-forest-labs/flux-2-pro',
      displayName: 'FLUX 2 Pro',
      provider: 'Black Forest Labs via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'premium',
      costEstimateUsd: 0.08,
      costEstimateZar: 1.48,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: false,
      supportsMultiReference: false,
      supportsEditing: false,
      maxReferenceImages: 0,
      strengths: ['Premium final render', 'Cinematic aesthetic', 'Strong lighting', 'High visual taste'],
      weaknesses: ['Text-to-image only in this registry role', 'More expensive than no-reference bulk routes'],
      bestFor: ['premium final render', 'cinematic realism', 'hero visuals'],
      avoidWhen: ['a no-reference bulk route is enough', 'multi-reference reasoning is central'],
      routingRoles: ['premium_final_render', 'complex_edit']
    },
    {
      id: 'black-forest-labs/flux-2-max',
      displayName: 'FLUX 2 Max',
      provider: 'Black Forest Labs via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'ultra',
      costEstimateUsd: 0.16,
      costEstimateZar: 2.96,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: false,
      supportsMultiReference: false,
      supportsEditing: false,
      maxReferenceImages: 0,
      strengths: ['Ultra-premium finish', 'Highest fidelity', 'Strong realism'],
      weaknesses: ['Expensive', 'Not for bulk'],
      bestFor: ['final-only hero images', 'highest-fidelity production outputs'],
      avoidWhen: ['bulk generation'],
      routingRoles: ['ultra_premium_final']
    },
    {
      id: 'bytedance/seedream-5-lite',
      displayName: 'Seedream 5 Lite',
      provider: 'ByteDance via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'standard',
      costEstimateUsd: 0.045,
      costEstimateZar: 0.83,
      costEstimateZarApproximate: true,
      supportsTextToImage: true,
      supportsImageToImage: true,
      supportsMultiReference: true,
      supportsEditing: true,
      maxReferenceImages: 6,
      strengths: ['Mid-cost editing', 'Example-based edits', 'Multi-image blending'],
      weaknesses: ['Not the leanest utility edit', 'Not highest final finish'],
      bestFor: ['mid-cost multi-reference edits', 'reference blending'],
      avoidWhen: ['simple utility edit is enough', 'ultra final finish is required'],
      routingRoles: ['multi_reference', 'complex_edit', 'standard_edit']
    },
    {
      id: 'fal/qwen-image-2-edit',
      displayName: 'Qwen Image 2 Edit',
      provider: 'Qwen Image via fal.ai',
      providerAdapter: 'fal',
      qualityTier: 'utility',
      costEstimateUsd: 0.01,
      costEstimateZar: 0.19,
      costEstimateZarApproximate: true,
      supportsTextToImage: false,
      supportsImageToImage: true,
      supportsMultiReference: false,
      supportsEditing: true,
      maxReferenceImages: 1,
      strengths: ['fal-native utility edit', 'Fast preview transformations', 'Low-risk iteration'],
      weaknesses: ['Not final render', 'Not text-to-image', 'No multi-reference reasoning'],
      bestFor: ['utility edits', 'preview transformations'],
      avoidWhen: ['final quality matters', 'text-to-image generation is required'],
      routingRoles: ['utility_edit', 'reference_utility']
    }
  ];
  var MODEL_INTELLIGENCE_FALLBACKS = {
    'google/nano-banana-2': { notIdealFor: ['ultra-final identity renders', 'complex surreal backgrounds'], skinTonePerformance: 'strong - reliable on melanin-rich skin when identity refs are clean', identityLockStrength: 4, backgroundRealism: 3, creativeRange: 3, speedRating: 'fast', costZAR: 0.74, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Best fast-pass route for referenced character iterations before a Pro final.', warningNote: 'Use Nano Banana Pro when identity fidelity is the deciding factor.' },
    'google/nano-banana-pro': { notIdealFor: ['very complex backgrounds without scene refs', 'surreal/conceptual exploration without identity refs', 'cheap bulk drafts'], skinTonePerformance: 'excellent - particularly strong on melanin-rich skin with direct references', identityLockStrength: 5, backgroundRealism: 3, creativeRange: 3, speedRating: 'medium', costZAR: 1.48, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Best default final route for Aisha, Leah, Claudia, and Vanya when identity refs are active.', warningNote: 'Complex environments benefit from scene refs or a FLUX route.' },
    'google/imagen-3-text-only': { notIdealFor: ['identity-locked character shots', 'direct reference workflows', 'precise wardrobe matching'], skinTonePerformance: 'moderate - useful for no-ref scenes, weaker for exact character skin fidelity', identityLockStrength: 2, backgroundRealism: 4, creativeRange: 5, speedRating: 'fast', costZAR: 0.74, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Best Google-credit option for no-reference scene concepts and environment exploration.', warningNote: 'Do not use for exact character work with refs.' },
    'openai/gpt-image-2': { notIdealFor: ['cheap bulk drafts', 'simple no-ref images', 'Google-credit-only spend lanes'], skinTonePerformance: 'strong - good semantic preservation when refs and constraints are explicit', identityLockStrength: 4, backgroundRealism: 4, creativeRange: 4, speedRating: 'slow', costZAR: 2.22, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Best fal.ai route when semantic edits, text/layout reasoning, or complex reference intent matters.', warningNote: 'Costs more and should be reserved for complex instructions.' },
    'openai/gpt-image-1.5': { notIdealFor: ['primary final renders', 'lowest-cost drafts'], skinTonePerformance: 'good - usable fallback with explicit skin and identity constraints', identityLockStrength: 3, backgroundRealism: 3, creativeRange: 3, speedRating: 'medium', costZAR: 1.48, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Fallback GPT Image route for older experiments and special compatibility.', warningNote: 'Prefer GPT Image 2 for new complex image work.' },
    'black-forest-labs/flux-2-pro': { notIdealFor: ['direct reference-image identity lock', 'multi-reference character matching', 'utility edits'], skinTonePerformance: 'strong - tasteful realism, but exact identity depends on written constraints', identityLockStrength: 4, backgroundRealism: 5, creativeRange: 4, speedRating: 'medium', costZAR: 1.48, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Best for complex environments, cinematic architecture, and no-ref hero scenes.', warningNote: 'This registry route is text-to-image only; use Google or GPT routes for direct identity refs.' },
    'black-forest-labs/flux-2-max': { notIdealFor: ['budget-sensitive runs', 'bulk iteration', 'direct reference-image identity lock'], skinTonePerformance: 'strong - premium realism with careful prompt constraints', identityLockStrength: 4, backgroundRealism: 5, creativeRange: 5, speedRating: 'slow', costZAR: 2.96, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Highest-fidelity no-ref final route for polished cinematic hero images.', warningNote: 'Expensive final-only route; avoid for iteration.' },
    'bytedance/seedream-5-lite': { notIdealFor: ['ultra-premium final finish', 'lowest-risk exact identity finals'], skinTonePerformance: 'good - practical multi-reference fallback with explicit constraints', identityLockStrength: 3, backgroundRealism: 3, creativeRange: 4, speedRating: 'medium', costZAR: 0.83, requiresRefs: false, supportsNegativePrompt: true, characterNote: 'Useful middle route for multi-reference blending when Google is not the right lane.', warningNote: 'Not the strongest identity or highest-finish route.' },
    'fal/qwen-image-2-edit': { notIdealFor: ['text-to-image generation', 'final character renders', 'multi-reference blending'], skinTonePerformance: 'limited - utility edit route, not a final identity model', identityLockStrength: 2, backgroundRealism: 2, creativeRange: 2, speedRating: 'fast', costZAR: 0.19, requiresRefs: true, supportsNegativePrompt: true, characterNote: 'Best for quick image-to-image utility edits, not final character creation.', warningNote: 'Requires a reference image and supports only one reference in this route.' }
  };
  MODEL_FALLBACKS = MODEL_FALLBACKS.map(function(model){
    return Object.assign({}, model, MODEL_INTELLIGENCE_FALLBACKS[model.id] || {});
  });

  var state = {
    models: MODEL_FALLBACKS.slice(),
    routePreview: null,
    routePreviewKey: '',
    routePreviewError: '',
    routePreviewLoading: false,
    previewSeq: 0,
    previewTimer: null,
    previewAbort: null,
    modelBoardKey: '',
    modelBoardRenderCount: 0,
    modelStripScrollLeft: 0,
    registryLoaded: false,
    providerStatus: null,
    providerStatusLastCheckedAt: '',
    providerStatusLoading: false,
    modelReadinessById: {},
    modelDrawerOpen: false,
    lastRouteRenderKey: '',
    generatorProfile: {
      closets: {},
      sceneLibrary: {},
      presets: {}
    },
    generatorProfileLoaded: false,
    generatorV5: {
      shotMode: 'editorial',
      outfitId: '',
      outfitOverride: '',
      shotAction: 'direct gaze, relaxed posture',
      actionOverride: '',
      socialFinishTreatment: '',
      authenticity: {},
      quickConfig: { activeId: '', name: '', loadedAt: 0, category: '', saTag: '' },
      shotOverrides: { action: '', lighting: '', props: '', mood: '' },
      sceneOverride: '',
      actionSuggestion: null,
      actionSuggestions: [],
      actionSuggestLoading: false,
      actionSuggestError: '',
      actionSuggestionCache: {},
      cinematicMode: false,
      cinematicAesthetic: 'barry_jenkins_moonlight',
      cinematicAestheticCustom: '',
      cinematicNarrative: '',
      cinematicTreatments: [],
      cameraDistance: 'medium portrait',
      lens: '50mm natural perspective',
      movement: 'still but alive',
      props: '',
      selectedRefs: {},
      referenceWeights: {},
      strictIdentityLock: true,
      strictIdentityAllowSceneRefs: false,
      customLocations: {},
      sceneRefs: [],
      locationIntelText: '',
      sceneRefStatus: '',
      sceneRefStatusError: false,
      aestheticRef: {
        id: '',
        dataUrl: '',
        fileName: '',
        status: '',
        error: '',
        aesthetic: null,
        applied: false
      },
      aestheticNegativeModifiers: [],
      activeWardrobeRefs: [],
      wardrobeFormOpen: false,
      wardrobeEditingId: '',
      reviewDrawerOpen: false,
      variationSeed: 0,
      conceptCards: [],
      conceptBlast: {
        filter: 'all',
        locks: { location: false, lighting: false, wardrobe: false },
        cards: [],
        open: false
      },
      smartRandomize: {
        mode: 'safe',
        seed: '',
        previousSnapshot: null,
        history: [],
        axisLocks: {
          location: false,
          lighting: false,
          action: false,
          camera: false,
          mood: false,
          props: false
        }
      },
      shotHistory: [],
      shotHistoryLoaded: false,
      shotHistoryOpen: false,
      shotHistoryStatus: '',
      currentShotHistoryId: '',
      lastMotionShotStatus: null,
      restoredShotNotice: '',
      generationJob: null,
      budget: {
        limitZar: null,
        spentZar: 0,
        warningDismissedAt: 0
      },
      uploadQueue: {
        items: [],
        active: 0,
        completed: 0,
        failed: 0
      },
      crossTabDirty: false,
      navigationGuard: {
        armed: false,
        dirty: false,
        leaving: false
      },
      inputLimits: {
        actionOverride: 200,
        sceneOverride: 500,
        directorBrief: 360
      },
      characterSwitch: {
        pendingId: '',
        seq: 0,
        loading: false,
        error: ''
      },
      dnaLoad: {
        value: '',
        status: '',
        error: ''
      },
      directorBrief: {
        text: '',
        loading: false,
        result: null,
        error: '',
        unspecified: [],
        targetShotCount: null
      },
      saMoment: {
        activeId: '',
        name: '',
        loadedAt: 0,
        promptAddition: '',
        negativeAddition: '',
        note: '',
        wardrobeNote: ''
      },
      locks: {
        identity: true,
        outfit: false,
        scene: false,
        lighting: false,
        action: false,
        camera: false,
        mood: false,
        props: false,
        location: false
      }
    }
  };
  window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, {
    shotMode: state.generatorV5.shotMode,
    socialFinishTreatment: state.generatorV5.socialFinishTreatment,
    authenticity: Object.assign({}, state.generatorV5.authenticity || {})
  });
  window.SS_GENERATOR_STATE.authenticity = Object.assign({}, state.generatorV5.authenticity || {});

  function onMotionEndOnce(element, callback){
    if (!element || typeof callback !== 'function') return;
    var done = false;
    function finish(event){
      if (event && event.target !== element) return;
      if (done) return;
      done = true;
      element.removeEventListener('animationend', finish);
      element.removeEventListener('transitionend', finish);
      callback(event || null);
    }
    element.addEventListener('animationend', finish);
    element.addEventListener('transitionend', finish);
  }

  function restartTransientClass(element, className, options){
    if (!element || !className || !element.classList) return element;
    options = options || {};
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    if (options.remove !== false) {
      onMotionEndOnce(element, function(){
        element.classList.remove(className);
        if (typeof options.after === 'function') options.after(element);
      });
    }
    return element;
  }

  function pulseControl(element){
    return restartTransientClass(element, 'is-value-pulsing');
  }

  function markRepopulating(element){
    return restartTransientClass(element, 'is-repopulating');
  }

  var characterSwitchTimer = null;
  var characterSwitchAbort = null;
  var stressRefreshTimer = null;
  var navigationGuardModal = null;
  var wardrobeUploadQueueRunning = false;

  function deepCloneSafe(value){
    try {
      if (typeof structuredClone === 'function') return structuredClone(value);
    } catch (_) {}
    try {
      return JSON.parse(JSON.stringify(value || null));
    } catch (_) {
      return value || null;
    }
  }

  function inputLimitFor(key){
    var limits = state.generatorV5.inputLimits || {};
    return Number(limits[key]) || (key === 'sceneOverride' ? 500 : key === 'directorBrief' ? 360 : 200);
  }

  function trimLimitedText(value, key){
    return String(value || '').slice(0, inputLimitFor(key));
  }

  function updateCounterText(id, value, max){
    var counter = $(id);
    if (counter) counter.textContent = String(String(value || '').length) + '/' + String(max || 0);
  }

  function scheduleStressRefresh(){
    clearTimeout(stressRefreshTimer);
    stressRefreshTimer = setTimeout(function(){
      refreshShotOverrideOutputs();
    }, 120);
  }

  function truncatePromptForModelBudget(prompt, maxChars){
    maxChars = Number(maxChars || 11800);
    var text = String(prompt || '');
    if (text.length <= maxChars) return text;
    var keepHead = Math.max(1000, Math.round(maxChars * 0.72));
    var keepTail = Math.max(500, maxChars - keepHead - 120);
    return [
      text.slice(0, keepHead).trim(),
      '[TRUNCATED: user free-text scene/action detail shortened to fit the model request limit]',
      text.slice(Math.max(0, text.length - keepTail)).trim()
    ].join('\n\n').slice(0, maxChars);
  }

  function markGeneratorDirty(reason){
    var guard = state.generatorV5.navigationGuard || {};
    guard.dirty = true;
    guard.reason = reason || guard.reason || 'generator-change';
    state.generatorV5.navigationGuard = guard;
    armGeneratorNavigationGuard();
  }

  function stressBannerHtml(id, kind, message, actionLabel, actionAttr){
    return [
      '<div class="pg52-stress-banner pg52-stress-banner--' + esc(kind || 'info') + '" id="' + esc(id) + '" role="status">',
        '<span>' + esc(message || '') + '</span>',
        actionLabel ? '<button type="button" class="pg52-btn-ghost pg52-btn-sm" ' + actionAttr + '>' + esc(actionLabel) + '</button>' : '',
      '</div>'
    ].join('');
  }

  function ensureStressBanner(id, kind, message, actionLabel, actionAttr){
    var shell = $('prompt-generator-52-shell') || $('page-generator') || document.body;
    if (!shell) return null;
    var existing = $(id);
    var html = stressBannerHtml(id, kind, message, actionLabel, actionAttr || '');
    if (existing) {
      existing.outerHTML = html;
      return $(id);
    }
    var command = shell.querySelector('.pg52-command-bar, .pg52-command-shell, .pg52-shell-head');
    if (command && command.insertAdjacentHTML) command.insertAdjacentHTML('afterend', html);
    else shell.insertAdjacentHTML('afterbegin', html);
    return $(id);
  }

  function removeStressBanner(id){
    var existing = $(id);
    if (existing) existing.remove();
  }

  function budgetState(){
    var budget = state.generatorV5.budget || {};
    if (!Number.isFinite(Number(budget.spentZar))) budget.spentZar = 0;
    if (budget.limitZar != null && budget.limitZar !== '') {
      var limit = Number(budget.limitZar);
      budget.limitZar = Number.isFinite(limit) && limit > 0 ? limit : null;
    } else {
      budget.limitZar = null;
    }
    state.generatorV5.budget = budget;
    return budget;
  }

  function costEstimateForGeneration(){
    var model = modelById(getCurrentImageModel());
    var cost = Number(model?.costEstimateZar ?? model?.costZar ?? 0);
    if (Number.isFinite(cost) && cost > 0) return cost;
    var text = $('pg52-route-cost-num')?.getAttribute('data-pg52-cost-value') || $('pg3-selected-cost')?.textContent || '';
    var parsed = Number(String(text || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function syncBudgetGuardUi(){
    var budget = budgetState();
    var estimate = costEstimateForGeneration();
    if (!budget.limitZar) {
      removeStressBanner('pg52-budget-guard-banner');
      return;
    }
    var spent = Number(budget.spentZar || 0);
    var projected = spent + estimate;
    if (spent >= budget.limitZar || projected > budget.limitZar) {
      ensureStressBanner(
        'pg52-budget-guard-banner',
        'error',
        'Budget exhausted - update limit in settings.',
        'Update budget',
        'data-pg52-update-budget'
      );
    } else if (projected >= budget.limitZar * 0.9) {
      ensureStressBanner(
        'pg52-budget-guard-banner',
        'warning',
        'Budget warning: this shot will push the session past 90% of the limit.',
        'Update budget',
        'data-pg52-update-budget'
      );
    } else {
      removeStressBanner('pg52-budget-guard-banner');
    }
  }

  function openBudgetLimitPrompt(){
    var budget = budgetState();
    var current = budget.limitZar ? String(budget.limitZar) : '';
    var value = window.prompt('Set generation budget limit in Rands', current);
    if (value == null) return;
    var next = Number(String(value).replace(/[^0-9.]/g, ''));
    budget.limitZar = Number.isFinite(next) && next > 0 ? Number(next.toFixed(2)) : null;
    budget.warningDismissedAt = 0;
    syncBudgetGuardUi();
    notifyAsync('success', budget.limitZar ? ('Budget limit set to R' + budget.limitZar.toFixed(2)) : 'Budget limit cleared.');
  }

  function generationBudgetPreflight(snapshot){
    var budget = budgetState();
    var estimate = Number(snapshot?.budgetEstimateZar ?? costEstimateForGeneration() ?? 0);
    if (!budget.limitZar) return { ok: true, warning: '' };
    var spent = Number(budget.spentZar || 0);
    var projected = spent + estimate;
    if (spent >= budget.limitZar || projected > budget.limitZar) {
      var message = 'Budget exhausted - update limit in settings.';
      ensureStressBanner('pg52-budget-guard-banner', 'error', message, 'Update budget', 'data-pg52-update-budget');
      return { ok: false, code: 'budget_exhausted', message: message };
    }
    if (projected >= budget.limitZar * 0.9) {
      ensureStressBanner('pg52-budget-guard-banner', 'warning', 'Budget warning: this shot will push the session past 90% of the limit.', 'Update budget', 'data-pg52-update-budget');
      notifyAsync('warning', 'Budget warning: this shot will push the session past 90% of the limit.');
    }
    return { ok: true, warning: '' };
  }

  function recordGenerationBudgetSpend(snapshot, result){
    var budget = budgetState();
    var cost = Number(result?.estimatedCostZar ?? result?.costEstimateZar ?? snapshot?.budgetEstimateZar ?? costEstimateForGeneration() ?? 0);
    if (!Number.isFinite(cost) || cost <= 0) return;
    budget.spentZar = Number((Number(budget.spentZar || 0) + cost).toFixed(2));
    syncBudgetGuardUi();
  }

  function createGenerationJobSnapshot(input){
    input = input || {};
    var ctx = input.ctx || (typeof window.getGeneratorContext === 'function' ? window.getGeneratorContext() : {});
    var prompt = truncatePromptForModelBudget(input.prompt || ctx.mainPrompt || window._lastGenerated?.prompt || '');
    var id = 'gen_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    var lastGenerated = deepCloneSafe(window._lastGenerated || {});
    var model = input.model || getCurrentImageModel();
    var snapshot = {
      id: id,
      generationId: id,
      createdAt: new Date().toISOString(),
      saveMode: Boolean(input.saveMode),
      shotMode: currentShotMode(),
      character: ctx.char || $('g-char')?.value || 'leah',
      campaign: ctx.campaign || $('g-campaign')?.value || '',
      model: model,
      spendLane: getCurrentImageSpendLane(),
      useRefs: input.useRefs ?? (checked('g-attach-refs', true)),
      prompt: prompt,
      negPrompt: input.negPrompt || window._lastGenerated?.negPrompt || $('out-neg')?.textContent || '',
      ctx: deepCloneSafe(ctx || {}),
      lastGenerated: lastGenerated,
      routePayload: deepCloneSafe(lastGenerated?.routerPayload || {}),
      generatorRecipe: deepCloneSafe(lastGenerated?.generatorRecipe || lastGenerated?.routerPayload?.generatorRecipe || {}),
      budgetEstimateZar: costEstimateForGeneration()
    };
    state.generatorV5.generationJob = snapshot;
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, {
      shotMode: snapshot.shotMode,
      generationJob: {
        id: snapshot.id,
        shotMode: snapshot.shotMode,
        character: snapshot.character,
        model: snapshot.model,
        createdAt: snapshot.createdAt
      }
    });
    return snapshot;
  }

  function scheduleCharacterSelection(characterId){
    var next = charKey(characterId || 'leah');
    clearTimeout(characterSwitchTimer);
    if (characterSwitchAbort) characterSwitchAbort.abort();
    characterSwitchAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var seq = (state.generatorV5.characterSwitch.seq || 0) + 1;
    state.generatorV5.characterSwitch = {
      pendingId: next,
      seq: seq,
      loading: true,
      error: ''
    };
    startAsyncOperation('characterSwitch', { character: next });
    characterSwitchTimer = setTimeout(function(){
      if (state.generatorV5.characterSwitch.seq !== seq) return;
      applyGeneratorState({ characterId: next }, { source: 'g-char-debounced', silentDirty: false });
      state.generatorV5.characterSwitch.loading = false;
      succeedAsyncOperation('characterSwitch', { character: next });
    }, 150);
  }

  function showNavigationGuardModal(){
    if (navigationGuardModal) return;
    navigationGuardModal = document.createElement('div');
    navigationGuardModal.className = 'pg52-nav-guard-modal';
    navigationGuardModal.setAttribute('role', 'dialog');
    navigationGuardModal.setAttribute('aria-modal', 'true');
    navigationGuardModal.innerHTML = [
      '<div class="pg52-nav-guard-card">',
        '<span class="pg52-t-micro">Unsaved generator setup</span>',
        '<strong>Leave page?</strong>',
        '<p>Your current configuration will be cleared.</p>',
        '<div class="pg52-nav-guard-actions">',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-nav-stay>Stay</button>',
          '<button class="pg52-btn pg52-btn-sm" type="button" data-pg52-nav-leave>Leave</button>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(navigationGuardModal);
    navigationGuardModal.querySelector('[data-pg52-nav-stay]')?.focus();
  }

  function closeNavigationGuardModal(){
    if (navigationGuardModal) navigationGuardModal.remove();
    navigationGuardModal = null;
  }

  function armGeneratorNavigationGuard(){
    var guard = state.generatorV5.navigationGuard || {};
    if (guard.armed || guard.leaving || !window.history || !window.history.pushState) {
      state.generatorV5.navigationGuard = guard;
      return;
    }
    try {
      window.history.pushState({ pg52GeneratorGuard: true }, '', window.location.href);
      guard.armed = true;
      state.generatorV5.navigationGuard = guard;
    } catch (_) {}
  }

  function handleGeneratorPopState(event){
    var guard = state.generatorV5.navigationGuard || {};
    if (!guard.dirty || guard.leaving) return;
    try { window.history.pushState({ pg52GeneratorGuard: true }, '', window.location.href); } catch (_) {}
    showNavigationGuardModal();
  }

  function handleCrossTabStorage(event){
    var key = String(event.key || '');
    if (!/silva|generator|wardrobe|shot|profile|state/i.test(key)) return;
    if (event.storageArea !== window.localStorage) return;
    state.generatorV5.crossTabDirty = true;
    ensureStressBanner(
      'pg52-cross-tab-banner',
      'warning',
      'App updated in another tab.',
      'Reload to sync',
      'data-pg52-reload-sync'
    );
  }

  function initStressHardening(shell){
    if (window.__pg52StressHardeningBound) {
      syncBudgetGuardUi();
      return;
    }
    window.__pg52StressHardeningBound = true;
    window.addEventListener('popstate', handleGeneratorPopState);
    window.addEventListener('storage', handleCrossTabStorage);
    window.addEventListener('resize', function(){
      var job = state.generatorV5.generationJob;
      if (job && job.status === 'loading') {
        document.body.classList.add('pg52-generation-resize-safe');
        syncBudgetGuardUi();
      }
    }, { passive: true });
    document.addEventListener('click', function(event){
      if (event.target && event.target.closest && event.target.closest('[data-pg52-nav-stay]')) {
        closeNavigationGuardModal();
        return;
      }
      if (event.target && event.target.closest && event.target.closest('[data-pg52-nav-leave]')) {
        var guard = state.generatorV5.navigationGuard || {};
        guard.leaving = true;
        state.generatorV5.navigationGuard = guard;
        closeNavigationGuardModal();
        try { window.history.back(); } catch (_) {}
        return;
      }
      if (event.target && event.target.closest && event.target.closest('[data-pg52-reload-sync]')) {
        window.location.reload();
        return;
      }
      if (event.target && event.target.closest && event.target.closest('[data-pg52-update-budget]')) {
        openBudgetLimitPrompt();
      }
    });
    syncBudgetGuardUi();
  }

  function markPressed(element){
    return restartTransientClass(element, 'is-pressed');
  }

  function markCharacterSwitch(){
    var shell = document.getElementById('prompt-generator-52-shell') || document.getElementById('page-generator');
    if (shell) restartTransientClass(shell, 'is-character-switching');
    var name = document.getElementById('pg52-char-display');
    if (name) restartTransientClass(name, 'is-title-entering');
    cascadeRefReveal(document.getElementById('pg52-ref-grid'));
    cascadeRefReveal(document.getElementById('pg52-ref-candidates'));
  }

  function cascadeRefReveal(root){
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.pg52-ref-tile,.pg52-ref-candidate,.pg52-result-ref,.pg52-result-identity-card').forEach(function(node, index){
      node.style.setProperty('--pg52-ref-index', String(Math.min(index, 6)));
      restartTransientClass(node, 'is-ref-revealing');
    });
  }

  var ACTION_CATEGORIES = [
    {
      id: 'still_presence',
      label: 'Still / Presence',
      actions: [
        'Direct gaze, standing, full stillness - authority',
        'Direct gaze, seated, hands visible - conversational authority',
        'Profile, standing, looking away - editorial distance',
        'Three-quarter turn, chin slightly down - introspective',
        'Arms crossed, direct gaze - controlled power',
        'Hand on hip, slight lean - grounded confidence',
        'Looking down at something off-frame - thinking',
        'Eyes closed, head tilted back slightly - release moment',
        'Over-shoulder glance, mid-turn - caught in motion',
        'Leaning against wall, arms loose - ease and ownership'
      ]
    },
    {
      id: 'movement_energy',
      label: 'Movement / Energy',
      actions: [
        'Mid-stride, one foot forward - arriving',
        'Walking toward camera, direct look - approach',
        'Walking away from camera, looking back - departure',
        'Running hand along wall or surface while walking - tactile motion',
        'Turning to face camera from profile - the reveal',
        'Stepping out of shadow into light - emergence',
        'Hair mid-movement - environmental energy',
        'Jacket over shoulder, walking - post-meeting exit',
        'Phone to ear, moving - executive in motion',
        'Looking down at phone while walking - contemporary candid'
      ]
    },
    {
      id: 'seated_grounded',
      label: 'Seated / Grounded',
      actions: [
        'Seated at desk, looking up at camera - workspace authority',
        'Seated cafe, hands around cup - focused relaxation',
        'Seated cross-legged on floor - informal authority',
        'Leaning forward over table, engaged - intensity',
        'Reclined in chair, one arm draped - ownership of space',
        'Seated on steps, elbows on knees - approachable power',
        'Standing behind chair, hands on back - boardroom presence',
        'Seated sideways, one shoulder toward camera - quiet editorial control'
      ]
    },
    {
      id: 'expressive_emotional',
      label: 'Expressive / Emotional',
      actions: [
        'Mid-laugh, genuine - real joy',
        'Slight smile, not performing it - quiet confidence',
        'Intense eye contact, no smile - focus and presence',
        'Looking off-frame, something caught attention - curiosity',
        'Speaking mid-sentence, hands in motion - active thought',
        'Exhaling, slight head down - decompression',
        'Surprised upward glance - reactive',
        'Skeptical half-smile - intelligence'
      ]
    },
    {
      id: 'fashion_editorial',
      label: 'Fashion / Editorial',
      actions: [
        'Posing with hand in hair - fashion reference',
        'Adjusting collar or sleeve - garment focus',
        'Holding jacket open - wardrobe reveal',
        'Full body, hands at sides - fashion editorial standing',
        'Seated with one leg extended - long line editorial',
        'Crouching low to ground - unexpected angle',
        'Standing on elevated surface, step or ledge - height emphasis',
        'Shot from very low angle looking up - dominance',
        'Shot from above, looking straight up into camera - vulnerability and trust'
      ]
    }
  ];
  var SHOT_ACTIONS = ACTION_CATEGORIES.reduce(function(out, group){ return out.concat(group.actions || []); }, []);
  var SHOT_MODE_ACTION_CATEGORIES = {
    selfie: [
      { id: 'selfie_actions', label: 'Phone Selfie', actions: [
        'arm extended holding phone, front camera selfie, slight chin down, direct lens gaze',
        'arm extended at slight upward angle, wide angle selfie distortion, chin tucked, energy',
        'selfie with one hand, other hand on hip or waist, three-quarter body visible',
        'low angle selfie — phone below face looking up, dramatic angle, confident expression',
        'high angle selfie — phone held above and forward, slight downward look, flattering',
        'close crop selfie — face only, phone barely out of frame, eyes close to lens',
        'selfie mid-laugh — eyes crinkled, genuine unposed joy, phone in frame',
        'sunglasses selfie — glasses on or held up, squint against sun, summer energy',
        'two-finger peace sign or hand gesture selfie — playful, not serious',
        'looking away selfie — profile or three-quarter to camera, pretending not to know photo is being taken',
        'multiple selfie attempt — mid-pose adjustment, not fully settled, real energy'
      ] },
      { id: 'selfie_wide_angle_actions', label: 'Wide Angle / High Angle Selfies', actions: [
        "wide angle held at arm's length, fisheye distortion at edges, full outfit visible, high energy",
        'overhead high angle looking straight up into phone camera, lying down or standing below, unusual perspective',
        'ultra-wide held at hip level pointing up, bold low angle distortion, sky or ceiling behind'
      ] }
    ],
    mirror: [
      { id: 'mirror_selfie_actions', label: 'Mirror Selfie Poses', actions: [
        'mirror selfie, phone held at chest height, full outfit visible, direct eye contact with own reflection',
        'mirror selfie, phone held to side of face, tilted head, checking the outfit',
        'mirror selfie, phone below face, looking down slightly, more of the outfit visible',
        'mirror selfie, phone lifted high, side angle, showing the silhouette from an angle',
        'mirror selfie, looking away from mirror at something off frame, candid discovered moment',
        'mirror selfie, adjusting an item of clothing with free hand, mid-adjustment',
        "mirror selfie, half-smile, slight head tilt, 'I know I look good' energy",
        'bathroom counter mirror selfie, leaning forward on counter, face closer to mirror',
        'gym mirror selfie, one arm flexed, showing fit, post-workout stance',
        'changing room mirror, multiple angles showing, shopping energy',
        'mirror selfie, phone covers part of face intentionally, artistic framing',
        'mirror selfie, doing silly face or expression, no seriousness, just fun'
      ] }
    ],
    vibes: [
      { id: 'vibes_actions', label: 'Vibes Shot Actions', actions: [
        'leaning against a wall, arms loose, looking away from camera at something specific',
        'sitting on steps or kerb, elbows on knees, street-level',
        'standing with coffee cup in both hands, looking at it or into distance',
        'bag on one shoulder, walking past camera, glance back at lens',
        'phone in hand looking at it, caught between checking phone and living life',
        'sunglasses on, hands in pockets, low effort but intentional',
        'leaning on car door or bonnet, casual ownership of space',
        'sitting on wall or fence, legs dangling, relaxed',
        'buying food at a market stall, mid-transaction, looking at produce',
        'mid-stride, not posing, just walking through the environment',
        'standing at railing or overlook, looking at the view, back to camera',
        'sitting at a café table, drink in hand, looking out window'
      ] }
    ],
    editorial: ACTION_CATEGORIES,
    candid: [
      { id: 'candid_actions', label: 'Candid & Fun Actions', actions: [
        'mid-laugh, eyes closed or crinkled, head thrown back slightly, genuine uncontrollable',
        'side-laugh, turned to someone off-frame, caught in the moment',
        'caught unaware, just looked up from phone, natural surprised expression',
        'talking, mid-sentence with hands, animated gesture, total candid',
        'eating or drinking, food/drink item visible, casual restaurant or outdoor',
        'looking at something off frame with curiosity, not at camera at all',
        'reacting to something funny, shock-laugh face, surprised',
        'low-key bored but styled, resting on hand, looking to the side',
        "side-eye to camera, knowing look, 'are you filming me' energy",
        'dumb selfie face — exaggerated expression, tongue out or silly face, not trying',
        'fake serious face — extremely straight face but obviously funny context',
        'mid-dance move, arm up, slight blur acceptable, energy over perfection',
        "candid group hug, faces squished together, friends — even if we generate one person, the energy of 'group exists'",
        'hiding face behind hands or object, peeking through',
        'lying on grass/floor, looking up at sky, head on ground, top-down perspective from phone',
        'running away from camera, look back over shoulder, laughing',
        'jumping or mid-air, playful energy, movement blur is fine'
      ] }
    ],
    event: [
      { id: 'event_actions', label: 'Event Moment Actions', actions: [
        'on the dance floor, mid-move, arms raised, music in the body',
        "at event, posed for friend's camera, group of dressed-up friends behind",
        'holding a drink at an event, speaking to someone off-frame',
        'event arriving — stepping in through a venue entrance, dressed and ready',
        'event selfie, venue visible behind, gassed up and ready',
        'event candid, caught between conversations, natural face',
        'end-of-night energy — shoes in hand, slight dishevelment, good tired',
        'phone up filming the stage or DJ, arm raised, crowd around'
      ] }
    ]
  };
  var SHOT_MODES = {
    selfie: {
      id: 'selfie',
      icon: '📸',
      label: 'Selfie Mode',
      shortLabel: 'Selfie',
      sectionTitles: ['The fit today', "Where you're at", 'The vibe'],
      defaultLocationId: 'cafe_braam',
      defaultAction: 'arm extended holding phone, front camera selfie, slight chin down, direct lens gaze',
      defaultLighting: 'phone_natural_window',
      defaultCameraDistance: 'tight portrait',
      defaultLens: 'phone camera realism',
      defaultCameraStyle: 'phone_real',
      promptVoice: 'Phone camera selfie, natural lighting, casual candid energy. Shot on smartphone, authentic not staged.',
      locationKeywords: ['cafe', 'street', 'office', 'desk', 'hotel_suite', 'parking', 'kitchen', 'gym', 'transit', 'airport', 'gautrain', 'nightclub', 'parkhurst', 'melville'],
      lightingBoost: ['phone_natural_window', 'phone_golden_afternoon', 'car_window_light', 'morning_bedroom', 'overcast_soft_outdoor']
    },
    mirror: {
      id: 'mirror',
      icon: '🪞',
      label: 'Mirror Selfie',
      shortLabel: 'Mirror',
      sectionTitles: ['The outfit', 'The mirror', 'The energy'],
      defaultLocationId: 'mirror_wall_studio',
      defaultAction: 'mirror selfie, phone held at chest height, full outfit visible, direct eye contact with own reflection',
      defaultLighting: 'phone_natural_window',
      defaultCameraDistance: 'full body environmental',
      defaultLens: 'phone camera realism',
      defaultCameraStyle: 'phone_real',
      promptVoice: 'Mirror selfie photograph, phone visible in frame, reflection. Natural bathroom, room, gym, or hotel lighting.',
      locationKeywords: ['mirror', 'hotel_suite', 'gym', 'bathroom', 'bed', 'nightclub', 'parking', 'studio', 'fabric_backdrop'],
      lightingBoost: ['phone_natural_window', 'ring_light_glow', 'bathroom_overhead', 'gym_fluorescent', 'club_neon_led']
    },
    vibes: {
      id: 'vibes',
      icon: '📍',
      label: 'Vibes Shot',
      shortLabel: 'Vibes',
      sectionTitles: ["What you're wearing", "Where you're going", 'The moment'],
      defaultLocationId: 'maboneng',
      defaultAction: 'leaning against a wall, arms loose, looking away from camera at something specific',
      defaultLighting: 'golden_pm',
      defaultCameraDistance: 'three-quarter body',
      defaultLens: '50mm natural perspective',
      defaultCameraStyle: 'documentary',
      promptVoice: 'Lifestyle photograph, golden ratio rule of thirds, editorial Instagram energy. Real moment, not a shoot.',
      locationKeywords: ['cafe', 'street', 'rooftop', 'beach', 'restaurant', 'park', 'gallery', 'transit', 'precinct', 'waterfront', 'melrose', 'maboneng', 'rosebank'],
      lightingBoost: ['phone_golden_afternoon', 'overcast_soft_outdoor', 'restaurant_ambient', 'market_morning_mixed', 'forecourt_bright', 'airport_terminal', 'beach_bright']
    },
    editorial: {
      id: 'editorial',
      icon: '🎭',
      label: 'Editorial Shoot',
      shortLabel: 'Editorial',
      sectionTitles: ['Dress the shot', 'Place, frame, light', 'What enters the shot'],
      defaultLocationId: 'cafe_braam',
      defaultAction: 'Direct gaze, standing, full stillness - authority',
      defaultLighting: 'golden_am',
      defaultCameraDistance: 'medium portrait',
      defaultLens: '50mm natural perspective',
      defaultCameraStyle: 'editorial',
      promptVoice: 'Ultra-realistic professional photograph. Editorial social source image with controlled identity, wardrobe, scene, and camera.',
      locationKeywords: [],
      lightingBoost: ['golden_am', 'golden_pm', 'late_afternoon', 'indoor_day']
    },
    candid: {
      id: 'candid',
      icon: '😂',
      label: 'Candid & Fun',
      shortLabel: 'Candid',
      sectionTitles: ['Outfit if relevant', 'The scene', 'The chaos'],
      defaultLocationId: 'street_jhb',
      defaultAction: 'mid-laugh, eyes closed or crinkled, head thrown back slightly, genuine uncontrollable',
      defaultLighting: 'late_afternoon',
      defaultCameraDistance: 'waist-up candid',
      defaultLens: 'phone camera realism',
      defaultCameraStyle: 'phone_real',
      promptVoice: 'Candid unposed photograph, friend taking the picture, caught in the moment. Documentary real energy, not aware of camera.',
      locationKeywords: ['street', 'cafe', 'home', 'office', 'restaurant', 'nightclub', 'event', 'market', 'park', 'transit', 'kitchen', 'gym', 'rooftop'],
      lightingBoost: ['overcast_soft_outdoor', 'market_morning_mixed', 'flash_event', 'restaurant_ambient', 'phone_golden_afternoon']
    },
    event: {
      id: 'event',
      icon: '🎉',
      label: 'Event Moment',
      shortLabel: 'Event',
      sectionTitles: ['Event outfit', 'The venue', 'The night'],
      defaultLocationId: 'nightclub_edge',
      defaultAction: 'on the dance floor, mid-move, arms raised, music in the body',
      defaultLighting: 'club_neon_led',
      defaultCameraDistance: 'three-quarter body',
      defaultLens: '50mm natural perspective',
      defaultCameraStyle: 'documentary',
      promptVoice: 'Event-night social photograph, venue atmosphere visible, real flash-or-practical-light energy. The subject belongs in the moment.',
      locationKeywords: ['event', 'venue', 'nightclub', 'restaurant', 'church', 'gallery', 'conference', 'hotel', 'rooftop', 'lobby', 'atrium', 'evening'],
      lightingBoost: ['club_neon_led', 'flash_event', 'restaurant_ambient', 'ring_light_glow', 'airport_terminal']
    }
  };
  var SHOT_MODE_DNA_CODES = {
    selfie: 'sf',
    mirror: 'mr',
    vibes: 'vb',
    candid: 'cn',
    event: 'ev'
  };
  var SOCIAL_LIGHTING_OPTIONS = [
    {
      id: 'phone_natural_window',
      label: 'Window Light — Natural',
      promptPhrase: 'natural window light, soft indoor daylight, no artificial light, phone camera white balance, clean natural colour',
      bestFor: ['selfie', 'mirror', 'morning_routine'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'phone_golden_afternoon',
      label: 'Afternoon Sun — Phone',
      promptPhrase: 'bright afternoon sun through window or outdoor, phone camera response to direct afternoon light, slight warm overexposure feel, golden SA afternoon',
      bestFor: ['selfie', 'vibes', 'outdoor'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'overcast_soft_outdoor',
      label: 'Overcast Soft — Outdoor',
      promptPhrase: 'overcast South African sky, soft even light, no hard shadows, clean skin tones, Joburg winter or cloudy day',
      bestFor: ['selfie', 'vibes', 'street'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'car_window_light',
      label: 'In The Car — Window Light',
      promptPhrase: 'car window natural light, interior shadow on one side, bright natural light from driver or passenger window, SA suburban outside',
      bestFor: ['selfie', 'car_selfie'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'beach_bright',
      label: 'Beach Bright — SA Summer',
      promptPhrase: 'bright SA beach sun, high UV, slight overexposure on skin, ocean sparkle behind, summer heat haze',
      bestFor: ['vibes', 'cape_town_summer'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'ring_light_glow',
      label: 'Ring Light — Warm',
      promptPhrase: 'ring light catch in eyes, warm circular catchlight, salon or vanity or content creator light quality, slightly flat but warm',
      bestFor: ['mirror', 'nail_salon', 'hair_salon'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'club_neon_led',
      label: 'Club LED — Coloured',
      promptPhrase: 'nightclub LED lighting, purple and pink and blue wash, dark with coloured accent light, club photography aesthetic, neon glow on skin',
      bestFor: ['event', 'nightclub'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'bathroom_overhead',
      label: 'Bathroom Overhead Strip',
      promptPhrase: 'overhead bathroom strip light, slight harsh overhead quality, white tile reflection, typical bathroom mirror light, raw and real',
      bestFor: ['mirror'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'restaurant_ambient',
      label: 'Restaurant Ambient — Warm',
      promptPhrase: 'warm restaurant ambient light, candles or warm Edison bulbs, intimate dinner light, golden skin tones, upmarket SA restaurant quality',
      bestFor: ['vibes', 'event', 'restaurant'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'gym_fluorescent',
      label: 'Gym Overhead — Fluorescent',
      promptPhrase: 'overhead fluorescent gym light, slightly harsh, clean bright exposure, rubber floor reflection, Virgin Active aesthetic',
      bestFor: ['mirror', 'gym'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'market_morning_mixed',
      label: 'Market Morning — Mixed Natural',
      promptPhrase: 'outdoor market morning light, mix of open sky and market stall canopy, dappled natural, Joburg morning clear light',
      bestFor: ['vibes', 'candid', 'market'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'forecourt_bright',
      label: 'Petrol Station Forecourt',
      promptPhrase: 'petrol station forecourt canopy light, bright overhead fluorescent mixed with natural light at forecourt edges, high contrast real',
      bestFor: ['vibes', 'petrol_station'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'airport_terminal',
      label: 'Airport Terminal',
      promptPhrase: 'airport terminal light, mix of skylight and artificial overhead, clinical clean, travel tired but fresh',
      bestFor: ['vibes', 'travel'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'morning_bedroom',
      label: 'Morning — Curtain Filtered',
      promptPhrase: 'morning light through curtains, warm soft filter, gentle directional, bedroom warm colour, pre-day calm',
      bestFor: ['selfie', 'morning_routine'],
      group: 'Social / Phone + Venue'
    },
    {
      id: 'flash_event',
      label: 'Event Flash — Direct',
      promptPhrase: 'direct on-camera flash or phone flash, slight overexposed foreground, dark background, party photography aesthetic, direct flat light, event candid quality',
      bestFor: ['event', 'candid'],
      group: 'Social / Phone + Venue'
    }
  ];
  var EDITORIAL_LIGHTING_OPTIONS = [
    {
      id: 'golden_am',
      label: 'Golden Hour (AM)',
      promptPhrase: 'warm low-angle morning golden hour, soft directional sunlight, natural premium skin tone glow',
      bestFor: ['editorial', 'vibes', 'outdoor'],
      group: 'Natural / Editorial'
    },
    {
      id: 'morning',
      label: 'Morning Light',
      promptPhrase: 'clean morning daylight, soft fresh shadows, clear natural colour, early-day realism',
      bestFor: ['editorial', 'selfie', 'morning_routine'],
      group: 'Natural / Editorial'
    },
    {
      id: 'midday',
      label: 'Midday / Overcast',
      promptPhrase: 'soft overcast or controlled midday light, even exposure, gentle shadow control',
      bestFor: ['editorial', 'street', 'vibes'],
      group: 'Natural / Editorial'
    },
    {
      id: 'late_afternoon',
      label: 'Late Afternoon',
      promptPhrase: 'late afternoon natural light, warm side light, lived-in real-world shadows',
      bestFor: ['editorial', 'vibes', 'candid'],
      group: 'Natural / Editorial'
    },
    {
      id: 'golden_pm',
      label: 'Golden Hour (PM)',
      promptPhrase: 'evening golden hour, rich warm backlight, African sunset glow, cinematic natural warmth',
      bestFor: ['editorial', 'vibes', 'sundowners'],
      group: 'Natural / Editorial'
    },
    {
      id: 'blue_hour',
      label: 'Blue Hour / Dusk',
      promptPhrase: 'blue hour dusk light, cool ambient city atmosphere, practical lights beginning to glow',
      bestFor: ['editorial', 'event', 'night'],
      group: 'Natural / Editorial'
    },
    {
      id: 'indoor_day',
      label: 'Indoor Daylight',
      promptPhrase: 'indoor daylight, window spill, natural room light, practical interior realism',
      bestFor: ['editorial', 'mirror', 'selfie'],
      group: 'Natural / Editorial'
    },
    {
      id: 'indoor_artificial',
      label: 'Indoor Artificial (Studio)',
      promptPhrase: 'controlled indoor artificial light, clean key light, professional exposure control',
      bestFor: ['editorial', 'studio'],
      group: 'Studio / Editorial'
    }
  ];
  var LIGHTING_OPTION_ALIASES = {
    afternoon_warm: 'phone_golden_afternoon',
    afternoon_warm_outdoor: 'phone_golden_afternoon',
    forecourt_overhead: 'forecourt_bright',
    club_led_coloured: 'club_neon_led',
    airport_terminal_mixed: 'airport_terminal',
    natural_morning_window: 'morning_bedroom',
    beach_bright_summer: 'beach_bright',
    morning_natural_overcast: 'market_morning_mixed',
    gym_overhead: 'gym_fluorescent',
    store_flattering: 'indoor_artificial'
  };
  var SOCIAL_FINISH_TREATMENTS = [
    {
      id: 'no_filter',
      label: 'NO FILTER',
      promptAddition: 'unedited phone dump, no filter, straight out of phone, raw real colors, authentic unprocessed look',
      negativeAdditions: ['heavy filter', 'preset', 'edited', 'processed color grading']
    },
    {
      id: 'warm_edit',
      label: 'WARM EDIT',
      promptAddition: 'warm edited photo, VSCO warm preset, lifted shadows, warm tones, amber highlights, summer-warm color grade, golden skin tones, slightly overexposed in a good way',
      negativeAdditions: []
    },
    {
      id: 'cool_edit',
      label: 'COOL EDIT',
      promptAddition: 'cool edited photo, slightly desaturated, cool blue shadows, crisp and modern edit, controlled muted palette, clean cool tones',
      negativeAdditions: []
    },
    {
      id: 'moody_bw',
      label: 'MOODY B&W',
      promptAddition: 'black and white photograph, high contrast monochrome, dramatic black and white, rich blacks, South African documentary B&W quality',
      negativeAdditions: ['colour photography', 'colour cast']
    },
    {
      id: 'film_grain',
      label: 'FILM GRAIN',
      promptAddition: 'film grain texture, analogue film photograph look, 35mm film aesthetic, slight colour shift, grain texture visible, kodak portra or fujifilm quality',
      negativeAdditions: []
    },
    {
      id: 'bright_airy',
      label: 'BRIGHT AIRY',
      promptAddition: 'bright airy edit, lifted exposure, clean whites, soft pastel tones, lifestyle photography brightness, open shadows, fresh light quality',
      negativeAdditions: []
    },
    {
      id: 'dark_moodboard',
      label: 'DARK MOODBOARD',
      promptAddition: 'dark moody edit, crushed blacks, deep shadows, rich dark atmosphere, editorial dark aesthetic, contrast pushed, shadows dominant',
      negativeAdditions: []
    }
  ];
  var AUTHENTICITY_CONTROLS = [
    {
      key: 'phoneVisible',
      icon: '📱',
      label: 'Phone visible',
      promptPhrase: 'phone or phone case visible in frame, smartphone screen-face visible, typical phone photography selfie artifact',
      negativeAdditions: []
    },
    {
      key: 'environmentBleed',
      icon: '🌿',
      label: 'Environment bleeding in',
      promptPhrase: 'real environment details visible in background or edges - plants, furniture, street elements, people passing, real life context. Not a clean isolated subject. The world is present.',
      negativeAdditions: [],
      removePositivePhrases: ['clean background', 'isolated subject']
    },
    {
      key: 'notTooPolished',
      icon: '✨',
      label: 'Not too polished',
      promptPhrase: 'slightly imperfect framing, not perfectly centered, natural composition not rule of thirds, real person taking this not a photographer, slight off-center or tilted energy - the kind of photo that gets 50k likes because it looks real not because it looks perfect',
      negativeAdditions: ['perfectly composed', 'rule of thirds', 'professional composition', 'centered subject', 'too perfect', 'editorial framing']
    },
    {
      key: 'naturalMotion',
      icon: '🌀',
      label: 'Natural motion',
      promptPhrase: 'slight natural movement, hair or fabric moving naturally, genuine in-motion quality, not completely static, the energy of a real moment, not a still life',
      negativeAdditions: []
    }
  ];
  var CAPTION_ENERGY_RULES = [
    {
      id: 'petrol_station_flex',
      locations: ['petrol_station_sa'],
      moments: ['slay_at_the_garage'],
      quickConfigs: ['petrol_station_flex'],
      modes: ['selfie', 'vibes', 'candid'],
      energy: 'Dressed up somewhere ordinary - the SA internet flex where the joke is that it still looks expensive.',
      captionIdea: "Pulled up like the garage was on the itinerary.",
      platform: 'IG Feed + Stories',
      bestPostTime: '8-10pm weekdays, 12-2pm Saturday'
    },
    {
      id: 'sundowners_rooftop',
      locations: ['rooftop_bar_sunset', 'melrose_arch_evening'],
      moments: ['sundowners'],
      quickConfigs: ['sundowners'],
      modes: ['vibes', 'event'],
      energy: 'Late golden hour after work - quiet flex, earned calm, city behind you.',
      captionIdea: "Soft life, but make it believable.",
      platform: 'IG Feed + Stories',
      bestPostTime: '7-9pm weekdays, 5-7pm Sunday'
    },
    {
      id: 'morning_routine',
      locations: ['morning_bed', 'dressing_table_vanity', 'apartment_kitchen'],
      moments: ['morning_routine'],
      quickConfigs: ['grwm_morning'],
      modes: ['selfie', 'mirror', 'vibes'],
      energy: 'Morning before the day becomes public - soft, real, slightly put together but not staged.',
      captionIdea: "Not always this put-together, but today we try.",
      platform: 'Stories + IG Feed',
      bestPostTime: '7-9am weekdays, 9-11am Sunday'
    },
    {
      id: 'night_out',
      locations: ['nightclub_joburg', 'club_bathroom_mirror', 'concert_venue', 'afropunk_joburg'],
      moments: ['the_night_out'],
      quickConfigs: ['night_out'],
      modes: ['event', 'candid', 'mirror'],
      energy: 'The night has started - dressed, loud, alive, slightly chaotic in the right way.',
      captionIdea: "Proof that I left the house.",
      platform: 'Stories first, Feed if the frame hits',
      bestPostTime: '9pm-12am Friday/Saturday, recap post 12-2pm Sunday'
    },
    {
      id: 'gym_post_workout',
      locations: ['gym_mirror_virgin_active'],
      moments: ['post_workout'],
      quickConfigs: ['post_workout'],
      modes: ['mirror', 'selfie'],
      energy: 'Earned confidence - real post-workout check, not a fitness campaign.',
      captionIdea: "Did the thing. Barely, but still.",
      platform: 'Stories + Close Friends energy',
      bestPostTime: '6-8am or 6-8pm weekdays'
    },
    {
      id: 'market_weekend',
      locations: ['neighbourgoods_market', 'rosebank_rooftop_market', '44_stanley_courtyard'],
      moments: ['neighbourgoods_saturday'],
      quickConfigs: ['neighbourgoods_saturday'],
      modes: ['vibes', 'candid'],
      energy: 'Saturday roaming - coffee, people, little plans, Joburg creative class outside.',
      captionIdea: "Saturday was soft on me.",
      platform: 'Carousel + Stories',
      bestPostTime: '12-2pm Saturday, 6-8pm Sunday recap'
    },
    {
      id: 'airport_departure',
      locations: ['or_tambo_international', 'airport_lounge'],
      moments: ['airport_departure'],
      quickConfigs: ['airport_departure'],
      modes: ['vibes', 'selfie'],
      energy: 'Going somewhere - travel is the flex, but keep it candid and in motion.',
      captionIdea: "Gate found. Personality pending.",
      platform: 'Stories + IG Feed',
      bestPostTime: '6-9am travel morning, 7-9pm arrival recap'
    },
    {
      id: 'default_social',
      locations: [],
      moments: [],
      quickConfigs: [],
      modes: ['selfie', 'mirror', 'vibes', 'candid', 'event'],
      energy: 'Real-life social source photo - present, casual, believable, not trying too hard.',
      captionIdea: "This was the moment.",
      platform: 'IG Feed + Stories',
      bestPostTime: '8-10pm weekdays, 12-2pm Saturday'
    }
  ];

  function socialFinishTreatmentById(id){
    var value = String(id || '').trim().toLowerCase();
    return SOCIAL_FINISH_TREATMENTS.find(function(item){ return item.id === value; }) || SOCIAL_FINISH_TREATMENTS[0];
  }

  function currentSocialFinishTreatment(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'editorial') return null;
    var external = window.SS_GENERATOR_STATE && window.SS_GENERATOR_STATE.socialFinishTreatment;
    var current = String(state.generatorV5.socialFinishTreatment || external || '').trim();
    var treatment = socialFinishTreatmentById(current || 'no_filter');
    state.generatorV5.socialFinishTreatment = treatment.id;
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, { socialFinishTreatment: treatment.id });
    return treatment;
  }

  function socialFinishTreatmentPack(mode){
    var treatment = currentSocialFinishTreatment(mode);
    if (!treatment) return null;
    return {
      id: treatment.id,
      label: treatment.label,
      promptAddition: treatment.promptAddition,
      negativeAdditions: normalizeList(treatment.negativeAdditions || [])
    };
  }

  function socialFinishTreatmentPromptLine(mode){
    var pack = socialFinishTreatmentPack(mode);
    return pack ? pack.promptAddition : '';
  }

  function socialFinishTreatmentNegativeAdditions(mode){
    var pack = socialFinishTreatmentPack(mode);
    return pack ? normalizeList(pack.negativeAdditions || []) : [];
  }

  function socialFinishTreatmentHtml(){
    var mode = currentShotMode();
    var pack = currentSocialFinishTreatment(mode);
    var hidden = mode === 'editorial';
    return [
      '<section class="pg52-social-finish ' + (hidden ? 'is-hidden' : '') + '" id="pg52-social-finish-treatment" ' + (hidden ? 'hidden' : '') + '>',
        '<div class="pg52-social-finish-head">',
          '<span>Finish / Treatment</span>',
          '<strong>' + esc(pack?.label || 'NO FILTER') + '</strong>',
        '</div>',
        '<div class="pg52-social-finish-pills" role="group" aria-label="Social finish treatment">',
          SOCIAL_FINISH_TREATMENTS.map(function(item){
            var selected = pack && pack.id === item.id;
            return '<button class="pg52-social-finish-pill ' + (selected ? 'active' : '') + '" type="button" data-pg52-finish-treatment="' + esc(item.id) + '" aria-pressed="' + (selected ? 'true' : 'false') + '">' + esc(item.label) + '</button>';
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function syncSocialFinishTreatment(){
    var wrap = $('pg52-social-finish-treatment');
    var mode = currentShotMode();
    var hidden = mode === 'editorial';
    var pack = currentSocialFinishTreatment(mode);
    if (!wrap) return;
    wrap.hidden = hidden;
    wrap.classList.toggle('is-hidden', hidden);
    var head = wrap.querySelector('.pg52-social-finish-head strong');
    if (head) head.textContent = pack?.label || 'NO FILTER';
    wrap.querySelectorAll('[data-pg52-finish-treatment]').forEach(function(btn){
      var selected = Boolean(pack && btn.getAttribute('data-pg52-finish-treatment') === pack.id);
      var wasSelected = btn.classList.contains('active');
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected && !wasSelected) restartTransientClass(btn, 'is-value-pulsing');
    });
  }

  function setSocialFinishTreatment(id){
    var treatment = socialFinishTreatmentById(id || 'no_filter');
    state.generatorV5.socialFinishTreatment = treatment.id;
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, { socialFinishTreatment: treatment.id });
    syncSocialFinishTreatment();
    renderPromptPreview();
    renderShotSummary();
    renderRoutePreview(null);
    renderIdentityLockCard();
    schedulePreviewImageRouteFromGenerator();
  }

  function authenticityDefaultsForMode(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    var social = mode !== 'editorial';
    return {
      phoneVisible: mode === 'selfie' || mode === 'mirror',
      environmentBleed: social,
      notTooPolished: social,
      naturalMotion: mode === 'vibes' || mode === 'candid' || mode === 'event'
    };
  }

  function authenticityState(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    var defaults = authenticityDefaultsForMode(mode);
    var stored = state.generatorV5.authenticity || {};
    var merged = Object.assign({}, defaults);
    AUTHENTICITY_CONTROLS.forEach(function(control){
      if (Object.prototype.hasOwnProperty.call(stored, control.key)) merged[control.key] = Boolean(stored[control.key]);
    });
    if (mode === 'mirror') merged.phoneVisible = true;
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, {
      authenticity: Object.assign({}, merged)
    });
    window.SS_GENERATOR_STATE.authenticity = Object.assign({}, merged);
    return merged;
  }

  function activeAuthenticityControls(mode){
    var values = authenticityState(mode);
    return AUTHENTICITY_CONTROLS.filter(function(control){ return Boolean(values[control.key]); });
  }

  function authenticityPromptLines(pack){
    if (!pack || !pack.enabled) return [];
    if (Array.isArray(pack.promptLines) && pack.promptLines.length) return normalizeList(pack.promptLines);
    return normalizeList((pack.activeControls || []).map(function(control){ return control.promptPhrase; }));
  }

  function authenticityNegativeAdditions(pack){
    if (!pack || !pack.enabled) return [];
    return uniqueList(pack.activeControls.reduce(function(out, control){
      return out.concat(normalizeList(control.negativeAdditions || []));
    }, []));
  }

  function authenticityRemovePositivePhrases(pack){
    if (!pack || !pack.enabled) return [];
    return uniqueList(pack.activeControls.reduce(function(out, control){
      return out.concat(normalizeList(control.removePositivePhrases || []));
    }, []));
  }

  function stripAuthenticityContradictions(value, pack){
    var text = String(value || '');
    authenticityRemovePositivePhrases(pack).forEach(function(phrase){
      var escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp('\\b' + escaped + '\\b', 'ig'), '').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
    });
    return text;
  }

  function authenticityPackFromControls(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'editorial') {
      return {
        enabled: false,
        mode: mode,
        values: authenticityState(mode),
        active: [],
        promptLines: [],
        negativeAdditions: [],
        locked: []
      };
    }
    var values = authenticityState(mode);
    var activeControls = activeAuthenticityControls(mode);
    var pack = {
      enabled: true,
      mode: mode,
      values: Object.assign({}, values),
      active: activeControls.map(function(control){ return control.key; }),
      activeLabels: activeControls.map(function(control){ return control.label; }),
      activeControls: activeControls.map(function(control){
        return {
          key: control.key,
          icon: control.icon,
          label: control.label,
          promptPhrase: control.promptPhrase,
          negativeAdditions: normalizeList(control.negativeAdditions || []),
          removePositivePhrases: normalizeList(control.removePositivePhrases || [])
        };
      }),
      locked: mode === 'mirror' ? ['phoneVisible'] : []
    };
    pack.promptLines = authenticityPromptLines(pack);
    pack.negativeAdditions = authenticityNegativeAdditions(pack);
    pack.removePositivePhrases = authenticityRemovePositivePhrases(pack);
    return pack;
  }

  function captionEnergyRuleMatches(rule, scenePack){
    scenePack = scenePack || {};
    var mode = normalizeShotMode(scenePack.shotMode || currentShotMode());
    var locationId = scenePack.locationId || $('g-location')?.value || '';
    var saMomentId = scenePack.saMoment?.id || scenePack.saMoment?.activeId || state.generatorV5.saMoment?.activeId || '';
    var quickConfigId = scenePack.quickConfig?.id || scenePack.quickConfig?.activeId || state.generatorV5.quickConfig?.activeId || '';
    var score = 0;
    if (rule.quickConfigs && rule.quickConfigs.includes(quickConfigId)) score += 8;
    if (rule.moments && rule.moments.includes(saMomentId)) score += 7;
    if (rule.locations && rule.locations.includes(locationId)) score += 5;
    if (rule.modes && rule.modes.includes(mode)) score += 2;
    return score;
  }

  function captionEnergyGuide(scenePack){
    scenePack = scenePack || {};
    var bestRule = CAPTION_ENERGY_RULES.reduce(function(best, rule){
      var score = captionEnergyRuleMatches(rule, scenePack);
      if (!best || score > best.score) return { rule: rule, score: score };
      return best;
    }, null);
    if (!bestRule || bestRule.score <= 0) {
      bestRule = { rule: CAPTION_ENERGY_RULES.find(function(rule){ return rule.id === 'default_social'; }) || CAPTION_ENERGY_RULES[0], score: 0 };
    }
    var platformIntel = scenePack.platformIntelligence || currentPlatformIntelligence();
    var rule = bestRule.rule || {};
    return {
      source: rule.id || 'default_social',
      energy: rule.energy || 'Real-life social source photo - present, casual, believable, not trying too hard.',
      captionIdea: rule.captionIdea || 'This was the moment.',
      platform: rule.platform || (platformIntel?.label || 'IG Feed + Stories'),
      bestPostTime: rule.bestPostTime || '8-10pm weekdays, 12-2pm Saturday'
    };
  }

  function captionEnergyGuideHtml(scenePack){
    var guide = captionEnergyGuide(scenePack);
    return [
      '<aside class="pg52-authenticity-guide" data-pg52-caption-energy-guide aria-label="Caption Energy Guide">',
        '<div class="pg52-authenticity-guide-head">',
          '<span>Caption Energy Guide</span>',
          '<strong>Suggestions only</strong>',
        '</div>',
        '<p><b>This shot&apos;s energy:</b> ' + esc(guide.energy) + '</p>',
        '<p><b>Caption idea:</b> &ldquo;' + esc(guide.captionIdea) + '&rdquo;</p>',
        '<p><b>Platform:</b> ' + esc(guide.platform) + '</p>',
        '<p><b>Best post time for SA:</b> ' + esc(guide.bestPostTime) + '</p>',
      '</aside>'
    ].join('');
  }

  function authenticityControlsHtml(){
    var mode = currentShotMode();
    var hidden = mode === 'editorial';
    var pack = authenticityPackFromControls(mode);
    var values = pack.values || authenticityState(mode);
    return [
      '<section class="pg52-authenticity ' + (hidden ? 'is-hidden' : '') + '" id="pg52-authenticity-engine" ' + (hidden ? 'hidden' : '') + '>',
        '<div class="pg52-authenticity-head">',
          '<span>AUTHENTICITY</span>',
          '<strong>' + esc(pack.activeLabels && pack.activeLabels.length ? pack.activeLabels.join(' · ') : 'Social realism') + '</strong>',
        '</div>',
        '<div class="pg52-authenticity-toggles" role="group" aria-label="Authenticity controls">',
          AUTHENTICITY_CONTROLS.map(function(control){
            var active = Boolean(values[control.key]);
            var locked = mode === 'mirror' && control.key === 'phoneVisible';
            return [
              '<button class="pg52-authenticity-toggle ' + (active ? 'active ' : '') + (locked ? 'locked' : '') + '" type="button" data-pg52-authenticity="' + esc(control.key) + '" aria-pressed="' + (active ? 'true' : 'false') + '" ' + (locked ? 'disabled aria-disabled="true" title="Locked for mirror selfies"' : '') + '>',
                '<span aria-hidden="true">' + esc(control.icon || '') + '</span>',
                '<strong>' + esc(control.label) + '</strong>',
                locked ? '<em>Locked for mirror selfies</em>' : '',
              '</button>'
            ].join('');
          }).join(''),
        '</div>',
        captionEnergyGuideHtml(scenePackFromControlsSafe()),
      '</section>'
    ].join('');
  }

  function scenePackFromControlsSafe(){
    try { return scenePackFromControls(); } catch (_) { return { shotMode: currentShotMode(), locationId: $('g-location')?.value || '' }; }
  }

  function syncAuthenticityControls(){
    var wrap = $('pg52-authenticity-engine');
    if (!wrap) return;
    var mode = currentShotMode();
    var hidden = mode === 'editorial';
    var pack = authenticityPackFromControls(mode);
    var values = pack.values || {};
    wrap.hidden = hidden;
    wrap.classList.toggle('is-hidden', hidden);
    var head = wrap.querySelector('.pg52-authenticity-head strong');
    if (head) head.textContent = pack.activeLabels && pack.activeLabels.length ? pack.activeLabels.join(' · ') : 'Social realism';
    wrap.querySelectorAll('[data-pg52-authenticity]').forEach(function(btn){
      var key = btn.getAttribute('data-pg52-authenticity') || '';
      var active = Boolean(values[key]);
      var locked = mode === 'mirror' && key === 'phoneVisible';
      var wasActive = btn.classList.contains('active');
      btn.classList.toggle('active', active);
      btn.classList.toggle('locked', locked);
      btn.disabled = locked;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (active !== wasActive) restartTransientClass(btn, 'is-value-pulsing');
      if (locked) {
        btn.setAttribute('aria-disabled', 'true');
        btn.setAttribute('title', 'Locked for mirror selfies');
        if (!btn.querySelector('em')) btn.insertAdjacentHTML('beforeend', '<em>Locked for mirror selfies</em>');
      } else {
        btn.removeAttribute('aria-disabled');
        btn.removeAttribute('title');
        var lockedCopy = btn.querySelector('em');
        if (lockedCopy) lockedCopy.remove();
      }
    });
    var guide = wrap.querySelector('[data-pg52-caption-energy-guide]');
    if (guide) guide.outerHTML = captionEnergyGuideHtml(scenePackFromControlsSafe());
  }

  function setAuthenticityControl(key, value){
    var control = AUTHENTICITY_CONTROLS.find(function(item){ return item.key === key; });
    if (!control) return;
    var mode = currentShotMode();
    if (mode === 'mirror' && key === 'phoneVisible') {
      syncAuthenticityControls();
      return;
    }
    var store = state.generatorV5.authenticity || {};
    store[key] = Boolean(value);
    state.generatorV5.authenticity = store;
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, {
      authenticity: Object.assign({}, authenticityState(mode))
    });
    syncAuthenticityControls();
    renderPromptPreview();
    renderShotSummary();
    renderRoutePreview(null);
    renderIdentityLockCard();
    schedulePreviewImageRouteFromGenerator();
  }

  function normalizeLightingId(id){
    var raw = String(id || '').trim();
    if (!raw) return '';
    return LIGHTING_OPTION_ALIASES[raw] || raw;
  }

  function lightingOptionRegistry(){
    var registry = {};
    EDITORIAL_LIGHTING_OPTIONS.concat(SOCIAL_LIGHTING_OPTIONS).forEach(function(option){
      registry[option.id] = Object.assign({}, option, {
        bestFor: normalizeList(option.bestFor || []),
        group: option.group || 'Lighting'
      });
    });
    Object.keys(LIGHTING_OPTION_ALIASES).forEach(function(alias){
      var target = LIGHTING_OPTION_ALIASES[alias];
      if (registry[target]) registry[alias] = Object.assign({}, registry[target], { alias: alias, id: target });
    });
    return registry;
  }

  function lightingOptionById(id){
    var normalized = normalizeLightingId(id);
    if (!normalized) return null;
    return lightingOptionRegistry()[normalized] || null;
  }

  function lightingPromptPhrase(id){
    var option = lightingOptionById(id);
    return option ? (option.promptPhrase || option.label || option.id) : '';
  }

  function lightingLocationTokens(location){
    var loc = location || resolveLocationRegistry($('g-location')?.value || '') || {};
    return normalizeList([
      loc.id,
      loc.category,
      loc.region,
      loc.vibe,
      loc.lightQuality,
      loc.environment,
      loc.name
    ].join(' ').split(/[\s,;/_-]+/));
  }

  function socialLightingBoost(mode, location, saMoment){
    mode = normalizeShotMode(mode || currentShotMode());
    var loc = location || resolveLocationRegistry($('g-location')?.value || '') || {};
    var ids = [];
    var modeBoost = {
      selfie: ['phone_natural_window', 'phone_golden_afternoon', 'car_window_light', 'morning_bedroom', 'overcast_soft_outdoor'],
      mirror: ['phone_natural_window', 'ring_light_glow', 'bathroom_overhead', 'gym_fluorescent', 'club_neon_led'],
      vibes: ['phone_golden_afternoon', 'overcast_soft_outdoor', 'restaurant_ambient', 'market_morning_mixed', 'forecourt_bright', 'airport_terminal', 'beach_bright'],
      candid: ['overcast_soft_outdoor', 'market_morning_mixed', 'flash_event', 'restaurant_ambient', 'phone_golden_afternoon'],
      event: ['club_neon_led', 'flash_event', 'restaurant_ambient', 'ring_light_glow', 'airport_terminal']
    };
    ids = ids.concat(modeBoost[mode] || []);
    var haystack = [
      loc.id || '',
      loc.name || '',
      loc.category || '',
      loc.vibe || '',
      loc.lightQuality || '',
      normalizeList(loc.promptModifiers || []).join(' '),
      saMoment?.id || '',
      saMoment?.name || ''
    ].join(' ').toLowerCase();
    [
      [/car|vehicle|pre-outing/, 'car_window_light'],
      [/petrol|forecourt|garage|pump|shell|bp/, 'forecourt_bright'],
      [/gym|workout|virgin active|planet fitness/, 'gym_fluorescent'],
      [/club|nightclub|dance|dj|night out|venue/, 'club_neon_led'],
      [/flash|event|wedding|concert|afropunk|matric/, 'flash_event'],
      [/restaurant|dinner|candle|edison|ambient/, 'restaurant_ambient'],
      [/market|neighbourgoods|stall|braamfontein/, 'market_morning_mixed'],
      [/airport|terminal|departure|lounge|travel/, 'airport_terminal'],
      [/beach|camps bay|ocean|summer|coastal|durban/, 'beach_bright'],
      [/morning|bed|bedroom|curtain|routine|grwm/, 'morning_bedroom'],
      [/salon|hair|nail|vanity|ring light/, 'ring_light_glow'],
      [/bathroom|changing room|mall changing|hotel mirror|suite mirror|vanity mirror/, 'bathroom_overhead'],
      [/rooftop|sunset|sundowner|golden/, 'phone_golden_afternoon']
    ].forEach(function(pair){
      if (pair[0].test(haystack)) ids.unshift(pair[1]);
    });
    if (saMoment?.lightingId) ids.unshift(normalizeLightingId(saMoment.lightingId));
    return uniqueList(ids.map(normalizeLightingId).filter(Boolean));
  }

  function lightingOptionsForShotMode(mode, location){
    mode = normalizeShotMode(mode || currentShotMode());
    var loc = location || resolveLocationRegistry($('g-location')?.value || '') || {};
    var current = normalizeLightingId($('g-time')?.value || state.generatorV5.time || shotModeMeta(mode).defaultLighting || '');
    var isSocialMode = mode !== 'editorial';
    var socialLoc = isSocialMediaLocation(loc);
    var social = SOCIAL_LIGHTING_OPTIONS.map(function(option){ return Object.assign({}, option); });
    var editorial = EDITORIAL_LIGHTING_OPTIONS.map(function(option){ return Object.assign({}, option); });
    if (!isSocialMode && !socialLoc) {
      var base = editorial.slice();
      var selectedSocial = social.find(function(option){ return option.id === current; });
      if (selectedSocial) base.push(selectedSocial);
      return base;
    }
    var boosts = socialLightingBoost(mode, loc, activeSaMomentPack());
    var boosted = [];
    boosts.forEach(function(id){
      var found = social.find(function(option){ return option.id === id; }) || editorial.find(function(option){ return option.id === id; });
      if (found && !boosted.some(function(option){ return option.id === found.id; })) boosted.push(Object.assign({}, found, { group: 'Recommended Social Lighting' }));
    });
    social.forEach(function(option){
      if (!boosted.some(function(item){ return item.id === option.id; })) boosted.push(option);
    });
    editorial.forEach(function(option){
      if (!boosted.some(function(item){ return item.id === option.id; })) boosted.push(option);
    });
    var selectedKnown = lightingOptionById(current);
    if (selectedKnown && !boosted.some(function(option){ return option.id === selectedKnown.id; })) boosted.unshift(selectedKnown);
    return boosted;
  }

  function lightingOptionsHtml(mode, current){
    var activeMode = normalizeShotMode(mode || currentShotMode());
    var currentId = normalizeLightingId(current || $('g-time')?.value || state.generatorV5.time || shotModeMeta(activeMode).defaultLighting || '');
    var options = lightingOptionsForShotMode(activeMode);
    var byGroup = {};
    options.forEach(function(option){
      var group = option.group || 'Lighting';
      if (!byGroup[group]) byGroup[group] = [];
      if (!byGroup[group].some(function(item){ return item.id === option.id; })) byGroup[group].push(option);
    });
    var order = activeMode === 'editorial'
      ? ['Natural / Editorial', 'Studio / Editorial', 'Recommended Social Lighting', 'Social / Phone + Venue']
      : ['Recommended Social Lighting', 'Social / Phone + Venue', 'Natural / Editorial', 'Studio / Editorial'];
    Object.keys(byGroup).forEach(function(group){ if (order.indexOf(group) === -1) order.push(group); });
    return order.map(function(group){
      var items = byGroup[group] || [];
      if (!items.length) return '';
      return '<optgroup label="' + esc(group) + '">' + items.map(function(option){
        return '<option value="' + esc(option.id) + '"' + (option.id === currentId ? ' selected' : '') + '>' + esc(option.label || option.id) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function syncLightingOptionsForShotMode(preferred){
    var select = $('g-time');
    if (!select) return;
    var mode = currentShotMode();
    var current = normalizeLightingId(preferred || select.value || state.generatorV5.time || shotModeMeta(mode).defaultLighting || 'golden_am');
    select.innerHTML = lightingOptionsHtml(mode, current);
    if (!Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) {
      var entry = lightingOptionById(current);
      if (entry) select.appendChild(new Option(entry.label || current, entry.id));
    }
    if (Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) {
      select.value = current;
    }
    state.generatorV5.time = select.value || current;
    markRepopulating(select);
    pulseControl(select);
  }

  function setRankedLightingOptions(recommendedIds, avoidIds, reasons, location){
    var select = $('g-time');
    if (!select) return;
    var mode = currentShotMode();
    var current = normalizeLightingId(select.value || state.generatorV5.time || shotModeMeta(mode).defaultLighting || '');
    var recommended = uniqueList(normalizeList(recommendedIds || []).map(normalizeLightingId).filter(Boolean));
    var avoid = uniqueList(normalizeList(avoidIds || []).map(normalizeLightingId).filter(Boolean));
    var options = lightingOptionsForShotMode(mode, location);
    recommended.forEach(function(id){
      var entry = lightingOptionById(id);
      if (entry && !options.some(function(option){ return option.id === entry.id; })) options.unshift(Object.assign({}, entry, { group: 'Recommended Social Lighting' }));
    });
    var score = function(option){
      if (recommended.indexOf(option.id) >= 0) return 1000 - recommended.indexOf(option.id);
      if (avoid.indexOf(option.id) >= 0) return -1000 + avoid.indexOf(option.id);
      if (mode !== 'editorial' && option.group === 'Studio / Editorial') return -50;
      if (mode !== 'editorial' && option.group === 'Natural / Editorial') return 10;
      if (mode !== 'editorial') return 100;
      if (option.group === 'Natural / Editorial') return 100;
      if (option.group === 'Studio / Editorial') return 80;
      return 20;
    };
    options = options.slice().sort(function(a, b){
      var diff = score(b) - score(a);
      if (diff) return diff;
      return (a.label || a.id).localeCompare(b.label || b.id);
    });
    var grouped = {};
    options.forEach(function(option){
      var group = recommended.indexOf(option.id) >= 0 ? 'Recommended Social Lighting' : (option.group || 'Lighting');
      if (!grouped[group]) grouped[group] = [];
      if (!grouped[group].some(function(item){ return item.id === option.id; })) grouped[group].push(option);
    });
    var order = mode === 'editorial'
      ? ['Natural / Editorial', 'Studio / Editorial', 'Recommended Social Lighting', 'Social / Phone + Venue']
      : ['Recommended Social Lighting', 'Social / Phone + Venue', 'Natural / Editorial', 'Studio / Editorial'];
    Object.keys(grouped).forEach(function(group){ if (order.indexOf(group) === -1) order.push(group); });
    select.innerHTML = order.map(function(group){
      var items = grouped[group] || [];
      if (!items.length) return '';
      return '<optgroup label="' + esc(group) + '">' + items.map(function(option){
        return '<option value="' + esc(option.id) + '">' + esc(option.label || option.id) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    if (current && Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) {
      select.value = current;
    } else if (recommended.length && Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === recommended[0]; })) {
      select.value = recommended[0];
    }
    state.generatorV5.time = select.value || current;
    markRepopulating(select);
  }
  var SA_CULTURAL_MOMENTS = [
    {
      id: 'kasi_kool',
      index: 1,
      name: 'Kasi Kool',
      icon: '🏘️',
      shotMode: 'vibes',
      locationId: 'soweto_street_sunday',
      lightingId: 'phone_golden_afternoon',
      lightingOverride: '',
      action: 'leaning against a wall, arms loose, looking away - total ease',
      moodId: 'confident',
      moodOverride: 'effortless cool, cultural roots, unbothered',
      promptAddition: 'South African township aesthetic, kasi cool energy, organic street style, not trying too hard, cultural confidence, real Joburg roots',
      negativeAddition: 'corporate, formal, Sandton energy, trying hard, overdressed for context'
    },
    {
      id: 'slay_at_the_garage',
      index: 2,
      name: 'Slay At The Garage',
      icon: '⛽',
      shotMode: 'vibes',
      allowedShotModes: ['selfie', 'mirror', 'vibes'],
      locationId: 'petrol_station_sa',
      lightingId: 'forecourt_bright',
      lightingOverride: '',
      action: 'leaning on car at the pump, dressed to impress, totally unbothered',
      moodId: 'confident',
      moodOverride: 'SA internet classic, ironic glam, completely comfortable',
      promptAddition: 'SA petrol station selfie culture, glamorous outfit at a mundane location, the quintessential South African flex, BP or Shell branding faintly visible, completely overdressed for the location and not caring',
      negativeAddition: '',
      note: 'This is a genuine SA social media institution. It needs to look real.'
    },
    {
      id: 'post_workout',
      index: 3,
      name: 'Post-Workout',
      icon: '💪',
      shotMode: 'mirror',
      locationId: 'gym_mirror_virgin_active',
      lightingId: 'gym_fluorescent',
      lightingOverride: '',
      action: 'gym mirror selfie, phone held at shoulder height, slight pump in arms, satisfied face',
      moodId: 'candid',
      moodOverride: 'earned it, no makeup or minimal, real',
      wardrobeNote: 'activewear - fitted gym wear, SA gym culture',
      promptAddition: 'post-workout gym selfie, activewear, slight sweat or flush acceptable, Virgin Active or Planet Fitness gym aesthetic, real post-gym energy, not a fitness model shoot',
      negativeAddition: ''
    },
    {
      id: 'hair_day',
      index: 4,
      name: 'Hair Day',
      icon: '💇🏾',
      shotMode: 'mirror',
      locationId: 'hair_salon_mirror',
      lightingId: 'ring_light_glow',
      lightingOverride: '',
      action: 'sitting in salon chair, looking at camera through salon mirror, fresh hair reveal',
      moodId: 'confident',
      moodOverride: 'the big reveal, new hair energy, transformation',
      promptAddition: 'South African hair salon, fresh braids or relaxer or natural styling, salon chair, mirror, styling tools in background, the hair reveal content moment',
      negativeAddition: ''
    },
    {
      id: 'sundowners',
      index: 5,
      name: 'Sundowners',
      icon: '🌅',
      shotMode: 'vibes',
      locationId: 'rooftop_bar_sunset',
      lightingId: 'golden_pm',
      lightingOverride: '',
      action: 'cocktail glass in hand, looking out at the sunset over Johannesburg or Cape Town',
      moodId: 'soft',
      moodOverride: 'earned this, week is done, golden hour grateful',
      promptAddition: 'Johannesburg or Cape Town rooftop sundowners, cocktail in hand, city skyline behind, African golden hour, after-work premium, SA aspirational lifestyle',
      negativeAddition: ''
    },
    {
      id: 'neighbourgoods_saturday',
      index: 6,
      name: 'Neighbourgoods Saturday',
      icon: '🏪',
      shotMode: 'vibes',
      locationId: 'neighbourgoods_market',
      lightingId: 'market_morning_mixed',
      lightingOverride: '',
      action: 'walking through market, coffee cup in hand, browsing stalls',
      moodId: 'candid',
      moodOverride: 'Saturday free, creative class, Braamfontein cool',
      promptAddition: 'Braamfontein Saturday market culture, creative Johannesburg, eclectic crowd, morning coffee in hand, market stalls and art, the Joburg creative class on their day off',
      negativeAddition: ''
    },
    {
      id: 'airport_departure',
      index: 7,
      name: 'Airport Departure',
      icon: '✈️',
      shotMode: 'vibes',
      locationId: 'or_tambo_international',
      lightingId: 'airport_terminal',
      lightingOverride: '',
      action: 'walking through departures with luggage, looking at camera, travel energy',
      moodId: 'in_motion',
      moodOverride: 'going somewhere, grown and going, travel is the flex',
      promptAddition: 'OR Tambo International Airport Johannesburg, departures hall, trolley or carry-on luggage, travel outfit, about to go somewhere exciting, SA passport holder going international, the travel post',
      negativeAddition: ''
    },
    {
      id: 'the_night_out',
      index: 8,
      name: 'The Night Out',
      icon: '🌙',
      shotMode: 'event',
      locationId: 'nightclub_joburg',
      lightingId: 'club_neon_led',
      lightingOverride: '',
      action: 'on the dance floor, arms raised, dressed up, mid-move',
      moodId: 'in_motion',
      moodOverride: 'the night is alive, music in the body, dressed and ready',
      promptAddition: 'Johannesburg nightclub night out, Konka or Tembisa or Sandton club energy, LED lighting and bass, dressed for the night, Black South African nightlife culture',
      negativeAddition: ''
    },
    {
      id: 'braai_day',
      index: 9,
      name: 'Braai Day',
      icon: '🔥',
      shotMode: 'candid',
      locationId: 'braai_garden',
      lightingId: 'phone_golden_afternoon',
      lightingOverride: '',
      action: 'standing next to braai, tongs in hand or cold drink, relaxed',
      moodId: 'candid',
      moodOverride: 'Sunday braai, SA institution, at ease in culture',
      promptAddition: 'South African backyard braai, Weber or open drum braai, smoke rising, garden, SA braai culture institution, cold drink or braai tongs, complete ease in a South African cultural ritual',
      negativeAddition: ''
    },
    {
      id: 'cape_town_summer',
      index: 10,
      name: 'Cape Town Summer',
      icon: '🌊',
      shotMode: 'vibes',
      locationId: 'capetown_camps_bay',
      lightingId: 'beach_bright',
      lightingOverride: '',
      action: 'on beach, sunglasses, looking out at Atlantic Ocean',
      moodId: 'confident',
      moodOverride: 'Cape Town summer flex, mountain and sea, beautiful South Africa',
      promptAddition: 'Camps Bay beach Cape Town summer, Atlantic Ocean, Twelve Apostles mountains, summer holiday, the Cape Town summer content moment, aspirational SA coastal life',
      negativeAddition: ''
    },
    {
      id: 'dressing_room_haul',
      index: 11,
      name: 'Dressing Room Haul',
      icon: '🛍️',
      shotMode: 'mirror',
      locationId: 'mall_changing_room',
      lightingId: 'indoor_artificial',
      lightingOverride: 'store flattering changing-room light',
      action: 'mirror selfie in changing room, tags still on outfit, one hand showing the garment',
      moodId: 'confident',
      moodOverride: "haul content, this one's a yes, shopping culture",
      promptAddition: 'retail store changing room, mirror selfie, outfit with tags possibly visible, shopping bags on hook behind, SA mall culture, the fashion haul content moment',
      negativeAddition: ''
    },
    {
      id: 'morning_routine',
      index: 12,
      name: 'Morning Routine',
      icon: '☀️',
      shotMode: 'selfie',
      locationId: 'morning_bed',
      lightingId: 'morning_bedroom',
      lightingOverride: '',
      action: 'just woken up, natural face, morning light, phone up',
      moodId: 'soft',
      moodOverride: 'no filter, real morning, GRWM energy start',
      promptAddition: 'morning routine content, natural morning light, just-woken face, authentic no-filter energy, linen and pillows, the real morning content that performs',
      negativeAddition: ''
    }
  ];
  var QUICK_CONFIGS = [
    { id: 'fit_check', name: 'FIT CHECK', icon: '🪞', description: 'Mirror selfie. Outfit on. Full length. This is the fit.', category: 'selfie', shotMode: 'mirror', locationId: 'home_bedroom_mirror', lightingId: 'phone_natural_window', action: 'mirror selfie, phone held at chest height, full outfit visible, direct eye contact with own reflection', moodId: 'confident', cameraDistance: 'full body environmental', socialFinishTreatment: 'no_filter' },
    { id: 'grwm_morning', name: 'GRWM MORNING', icon: '☀️', description: 'Morning routine. Getting ready. The process.', category: 'selfie', shotMode: 'selfie', locationId: 'dressing_table_vanity', lightingId: 'morning_bedroom', action: 'selfie with one hand, other hand on hip or waist, three-quarter body visible', moodId: 'soft', cameraDistance: 'waist-up candid', socialFinishTreatment: 'no_filter' },
    { id: 'post_workout', name: 'POST-WORKOUT', icon: '💪', description: 'Gym mirror. Earned it. The post-workout check.', category: 'selfie', saTag: 'EVERGREEN', shotMode: 'mirror', locationId: 'gym_mirror_virgin_active', lightingId: 'gym_fluorescent', action: 'gym mirror selfie, one arm flexed, showing fit, post-workout stance', moodId: 'candid', cameraDistance: 'three-quarter body', socialFinishTreatment: 'no_filter' },
    { id: 'car_selfie', name: 'CAR SELFIE', icon: '🚗', description: 'In the car. About to go somewhere. SA classic.', category: 'selfie', saTag: 'SA CLASSIC', shotMode: 'selfie', locationId: 'car_interior_selfie', lightingId: 'car_window_light', action: 'arm extended holding phone, front camera selfie, slight chin down, direct lens gaze', moodId: 'candid', cameraDistance: 'tight portrait', socialFinishTreatment: 'no_filter' },
    { id: 'petrol_station_flex', name: 'PETROL STATION FLEX', icon: '⛽', description: 'Dressed up at the garage. The ultimate SA internet moment.', category: 'sa_classics', saTag: 'SA ICON', shotMode: 'selfie', locationId: 'petrol_station_sa', lightingId: 'forecourt_bright', action: 'leaning on car at the pump, dressed to impress, totally unbothered', moodId: 'confident', cameraDistance: 'three-quarter body', socialFinishTreatment: 'no_filter' },
    { id: 'coffee_shop_work', name: 'COFFEE SHOP WORK', icon: '☕', description: 'Aesthetic café. Laptop or coffee. Doing the thing.', category: 'vibes', shotMode: 'vibes', locationId: 'coffee_shop_aesthetic', lightingId: 'phone_natural_window', action: 'sitting at a café table, drink in hand, looking out window', moodId: 'candid', cameraDistance: 'waist-up candid', socialFinishTreatment: 'no_filter' },
    { id: 'sundowners', name: 'SUNDOWNERS', icon: '🌅', description: 'Rooftop. Cocktail. Golden hour Joburg or Cape Town.', category: 'vibes', saTag: 'EVERGREEN', shotMode: 'vibes', locationId: 'rooftop_bar_sunset', lightingId: 'golden_pm', action: 'cocktail glass in hand, looking out at the sunset over Johannesburg or Cape Town', moodId: 'soft', cameraDistance: 'three-quarter body', socialFinishTreatment: 'warm_edit' },
    { id: 'neighbourgoods_saturday', name: 'NEIGHBOURGOODS SATURDAY', icon: '🏪', description: 'Saturday market. Coffee in hand. Braamfontein.', category: 'sa_classics', saTag: 'JOBURG SPECIFIC', shotMode: 'vibes', locationId: 'neighbourgoods_market', lightingId: 'market_morning_mixed', action: 'mid-stride, coffee in hand, browsing stalls', moodId: 'candid', cameraDistance: 'waist-up candid', socialFinishTreatment: 'no_filter' },
    { id: 'night_out', name: 'NIGHT OUT', icon: '🌙', description: "Event / club. Dressed. Ready. It's a night.", category: 'events', shotMode: 'event', locationId: 'nightclub_joburg', lightingId: 'club_neon_led', action: 'on the dance floor, mid-move, arms raised, music in the body', moodId: 'in_motion', cameraDistance: 'three-quarter body', socialFinishTreatment: 'dark_moodboard' },
    { id: 'dinner_dressed', name: 'DINNER DRESSED', icon: '🍽️', description: 'Restaurant table. Dressed up. The dinner post.', category: 'events', shotMode: 'event', locationId: 'restaurant_table_joburg', lightingId: 'restaurant_ambient', action: 'holding a drink at an event, speaking to someone off-frame', moodId: 'confident', cameraDistance: 'waist-up candid', socialFinishTreatment: 'warm_edit' },
    { id: 'kasi_streets', name: 'KASI STREETS', icon: '🏘️', description: 'Township street. Real SA. Cultural confidence.', category: 'sa_classics', saTag: 'CULTURAL', shotMode: 'vibes', locationId: 'soweto_street_sunday', lightingId: 'phone_golden_afternoon', action: 'leaning against a wall, arms loose, looking away from camera at something specific', moodId: 'confident', cameraDistance: 'three-quarter body', socialFinishTreatment: 'no_filter' },
    { id: 'hair_day', name: 'HAIR DAY', icon: '💇🏾', description: 'Salon chair. Fresh hair. The reveal.', category: 'selfie', saTag: 'EVERGREEN', shotMode: 'selfie', locationId: 'hair_salon_mirror', lightingId: 'ring_light_glow', action: 'sitting in salon chair, looking at camera through salon mirror, fresh hair reveal', moodId: 'confident', cameraDistance: 'waist-up candid', socialFinishTreatment: 'no_filter' },
    { id: 'nail_post', name: 'NAIL POST', icon: '💅', description: 'Ring light. Fresh nails. The close-up flex.', category: 'selfie', saTag: 'EVERGREEN', shotMode: 'selfie', locationId: 'nail_salon_vanity', lightingId: 'ring_light_glow', action: 'close crop selfie — face only, phone barely out of frame, eyes close to lens', moodId: 'confident', cameraDistance: 'tight portrait', socialFinishTreatment: 'bright_airy' },
    { id: 'beach_summer', name: 'BEACH SUMMER', icon: '🌊', description: 'Cape Town summer. Beach. Atlantic. Vibes.', category: 'vibes', saTag: 'CAPE TOWN', shotMode: 'vibes', locationId: 'capetown_camps_bay', lightingId: 'beach_bright', action: 'on beach, sunglasses, looking out at Atlantic Ocean', moodId: 'confident', cameraDistance: 'full body environmental', socialFinishTreatment: 'bright_airy' },
    { id: 'airport_departure', name: 'AIRPORT DEPARTURE', icon: '✈️', description: 'OR Tambo. Luggage. On the way. Travel content.', category: 'vibes', saTag: 'ASPIRATIONAL', shotMode: 'vibes', locationId: 'or_tambo_international', lightingId: 'airport_terminal', action: 'walking through departures with luggage, looking at camera, travel energy', moodId: 'in_motion', cameraDistance: 'three-quarter body', socialFinishTreatment: 'no_filter' },
    { id: 'braai_day', name: 'BRAAI DAY', icon: '🔥', description: 'Garden. Braai. Cold drink. The Sunday ritual.', category: 'sa_classics', saTag: 'SA ICON', shotMode: 'vibes', locationId: 'braai_garden', lightingId: 'phone_golden_afternoon', action: 'standing next to braai, tongs in hand or cold drink, relaxed', moodId: 'candid', cameraDistance: 'three-quarter body', socialFinishTreatment: 'no_filter' },
    { id: 'dumb_selfie', name: 'DUMB SELFIE', icon: '😂', description: 'Silly face. No context. Just the vibes.', category: 'selfie', shotMode: 'candid', locationId: '', lightingId: '', action: 'dumb selfie face — exaggerated expression, tongue out or silly face, not trying', moodId: 'candid', cameraDistance: 'tight portrait', socialFinishTreatment: 'no_filter' },
    { id: 'candid_caught', name: 'CANDID CAUGHT', icon: '📸', description: "Friend took the photo. You didn't know. Looks amazing.", category: 'vibes', shotMode: 'candid', locationId: '', lightingId: 'overcast_soft_outdoor', action: 'mid-laugh, eyes closed or crinkled, head thrown back slightly, genuine uncontrollable', moodId: 'candid', cameraDistance: 'waist-up candid', socialFinishTreatment: 'no_filter' },
    { id: 'holiday_pool', name: 'HOLIDAY POOL', icon: '🏊', description: 'Villa pool. Summer. Franschhoek or Zanzibar or wherever.', category: 'vibes', shotMode: 'vibes', locationId: 'holiday_villa_pool', lightingId: 'beach_bright', action: 'sitting on wall or fence, legs dangling, relaxed', moodId: 'soft', cameraDistance: 'full body environmental', socialFinishTreatment: 'bright_airy' },
    { id: 'matric_formal', name: 'MATRIC / FORMAL', icon: '🎓', description: 'The occasion. Dressed up properly. The milestone post.', category: 'events', saTag: 'MILESTONE', shotMode: 'event', locationId: 'matric_farewell', lightingId: 'golden_pm', action: 'event arriving — stepping in through a venue entrance, dressed and ready', moodId: 'confident', cameraDistance: 'full body environmental', socialFinishTreatment: 'warm_edit' }
  ];
  var CINEMATIC_AESTHETICS = [
    { id: 'barry_jenkins_moonlight', label: 'Cinematography: Barry Jenkins (Moonlight) - warm dark skin tones, shallow focus, intimate', modifiers: ['warm dark skin tones', 'shallow focus', 'intimate close emotional framing', 'soft color separation', 'skin held with tenderness and depth'] },
    { id: 'roger_deakins_scale', label: 'Cinematography: Roger Deakins (1917/Blade Runner 2049) - epic scale, controlled light', modifiers: ['epic controlled scale', 'precise motivated light', 'architectural negative space', 'disciplined cinematic composition', 'clean atmospheric depth'] },
    { id: 'bradford_young_texture', label: 'Cinematography: Bradford Young (Selma/Arrival) - grain, African-American skin texture mastery', modifiers: ['grain', 'skin texture mastery', 'warm underexposure', 'documentary intimacy', 'shot on film', 'rich dark skin held with tonal accuracy'] },
    { id: 'gordon_willis_shadow', label: 'Cinematography: Gordon Willis (The Godfather) - dramatic shadow, authority, darkness as power', modifiers: ['dramatic shadow', 'darkness as power', 'authoritative low key lighting', 'controlled underexposure', 'faces emerging from shadow'] },
    { id: 'ellen_kuras_documentary', label: 'Cinematography: Ellen Kuras - soft feminine documentary warmth', modifiers: ['soft documentary warmth', 'feminine observational camera', 'human handheld intimacy', 'natural available light', 'gentle emotional realism'] },
    { id: 'beyonce_lemonade', label: 'Director: Beyoncé Lemonade - Black Southern Gothic, fashion, power and vulnerability', modifiers: ['Black Southern Gothic', 'fashion power and vulnerability', 'ritualized emotional framing', 'poetic cultural symbolism', 'commanding feminine presence'] },
    { id: 'rihanna_savage_fenty', label: 'Director: Rihanna Savage x Fenty - corporate Black excellence, studio precision', modifiers: ['corporate Black excellence', 'studio precision', 'luxury performance energy', 'controlled body confidence', 'premium inclusive fashion spectacle'] },
    { id: 'afrobeats_lagos', label: 'Music video: Afrobeats aesthetic - Lagos energy, vibrant, street luxury', modifiers: ['Lagos energy', 'vibrant street luxury', 'music-video movement', 'warm saturated color', 'confident urban rhythm'] },
    { id: 'netflix_africa_doc', label: 'Documentary: Netflix Africa - landscape epic, authentic texture, golden hour Africa', modifiers: ['landscape epic', 'authentic African texture', 'golden hour Africa', 'documentary scale', 'real environmental atmosphere'] },
    { id: 'dior_campaign', label: 'Fashion film: Dior campaign - French luxury, pristine, one subject in space', modifiers: ['French luxury restraint', 'pristine fashion film space', 'one subject in elegant negative space', 'polished couture atmosphere', 'refined quiet composition'] },
    { id: 'prada_campaign', label: 'Fashion film: Prada campaign - strange beauty, intellectual fashion', modifiers: ['strange beauty', 'intellectual fashion tension', 'unexpected visual logic', 'cool editorial distance', 'slightly surreal luxury'] },
    { id: 'bottega_veneta_quiet', label: 'Fashion film: Bottega Veneta - quiet luxury, no logo, texture and material', modifiers: ['quiet luxury', 'no-logo material focus', 'texture and craft', 'soft wealth signals', 'restrained premium styling'] },
    { id: 'vogue_africa', label: 'Magazine: Vogue Africa - cultural pride, editorial authority', modifiers: ['cultural pride', 'editorial authority', 'African fashion prestige', 'formal visual confidence', 'heritage and modernity in balance'] },
    { id: 'id_raw_energy', label: 'Magazine: i-D - raw energy, direct gaze, stripped back', modifiers: ['raw youth energy', 'direct gaze', 'stripped back portrait language', 'anti-polish confidence', 'graphic editorial simplicity'] },
    { id: 'dazed_experimental', label: 'Magazine: Dazed - experimental, unexpected angle, high concept', modifiers: ['experimental high concept', 'unexpected camera angle', 'fashion strangeness', 'youth culture edge', 'conceptual editorial tension'] }
  ];
  var CINEMATIC_TREATMENTS = [
    { id: 'film_grain', label: 'Film grain', terms: ['visible film grain', 'analog texture'] },
    { id: 'anamorphic_lens_flare', label: 'Anamorphic lens flare', terms: ['anamorphic lens flare', 'wide cinematic glass artifacts'] },
    { id: 'teal_orange_grade', label: 'Teal and orange grade', terms: ['teal and orange color grade'] },
    { id: 'bleach_bypass', label: 'Bleach bypass', terms: ['bleach bypass contrast', 'silver-retention film finish'] },
    { id: 'desaturated', label: 'Desaturated', terms: ['desaturated color palette'] },
    { id: 'high_contrast', label: 'High contrast', terms: ['high contrast lighting'] },
    { id: 'crushed_blacks', label: 'Crushed blacks', terms: ['crushed blacks', 'deep shadow floor'] },
    { id: 'warm_amber_grade', label: 'Warm amber grade', terms: ['warm amber grade'] },
    { id: 'cool_blue_grade', label: 'Cool blue grade', terms: ['cool blue grade'] },
    { id: 'golden_ratio', label: 'Golden ratio composition', terms: ['golden ratio composition'] },
    { id: 'rule_of_thirds', label: 'Rule of thirds', terms: ['rule of thirds composition'] },
    { id: 'centered_subject', label: 'Centered subject', terms: ['centered subject composition'] },
    { id: 'dutch_angle', label: 'Dutch angle', terms: ['Dutch angle'] },
    { id: 'extreme_depth', label: 'Extreme depth of field', terms: ['extreme depth of field'] }
  ];
  var PLATFORM_INTELLIGENCE = {
    instagram_feed_square: {
      label: 'Instagram Feed - Square',
      aspectRatio: '1:1',
      focalPointGuidance: 'Subject centered or upper-center. No important content near edges.',
      compositionStyle: 'Clean, immediate, no ambiguity about subject',
      safeZones: { top: 0.05, bottom: 0.15, left: 0.05, right: 0.05 },
      promptModifiers: ['square composition', 'subject prominent', 'no cropped limbs at frame edge'],
      negativeModifiers: ['landscape composition', 'wide establishing shot']
    },
    instagram_feed_portrait: {
      label: 'Instagram Feed - Portrait 4:5',
      aspectRatio: '4:5',
      focalPointGuidance: 'Upper two-thirds. Room for bottom safe zone.',
      compositionStyle: 'Vertical feed composition with strong subject read',
      safeZones: { top: 0.05, bottom: 0.16, left: 0.05, right: 0.05 },
      promptModifiers: ['portrait orientation', '4:5 ratio', 'subject in upper two-thirds'],
      negativeModifiers: ['wide establishing shot', 'subject low in frame']
    },
    instagram_stories: {
      label: 'Instagram Stories / Reels',
      aspectRatio: '9:16',
      focalPointGuidance: 'Center vertical strip. Safe zones top and bottom for UI.',
      compositionStyle: 'Vertical story frame with clear top and bottom breathing room',
      safeZones: { top: 0.15, bottom: 0.20, left: 0.06, right: 0.06 },
      promptModifiers: ['vertical 9:16', 'subject in center vertical third', 'clear negative space top and bottom'],
      negativeModifiers: ['landscape', 'horizontal composition', 'subject near top or bottom edge']
    },
    linkedin_post: {
      label: 'LinkedIn Post',
      aspectRatio: '1.91:1',
      focalPointGuidance: 'Left-center or center. Professional, not casual.',
      compositionStyle: 'Professional landscape composition with readable business context',
      safeZones: { top: 0.06, bottom: 0.10, left: 0.08, right: 0.08 },
      promptModifiers: ['professional environment', 'business-ready composition', 'landscape orientation'],
      negativeModifiers: ['nightlife context', 'overly casual staging', 'portrait-only composition']
    },
    linkedin_profile_banner: {
      label: 'LinkedIn Profile Banner',
      aspectRatio: '4:1',
      focalPointGuidance: 'Right side is safer because the profile image overlaps left. Environmental or abstract.',
      compositionStyle: 'Ultra-wide banner with clean left-side profile overlap safety',
      safeZones: { top: 0.08, bottom: 0.08, left: 0.28, right: 0.04 },
      promptModifiers: ['ultra-wide landscape banner composition', 'subject right of center or environmental only', 'clean left side for profile image overlap'],
      negativeModifiers: ['tight portrait crop', 'center-only face crop', 'important detail on left edge']
    },
    tiktok_reels: {
      label: 'TikTok / Reels Cover',
      aspectRatio: '9:16',
      focalPointGuidance: 'Energy in the upper 60%. Lower 40% safe zone for text overlay.',
      compositionStyle: 'High-energy vertical cover with room for overlay copy',
      safeZones: { top: 0.10, bottom: 0.40, left: 0.06, right: 0.06 },
      promptModifiers: ['high energy vertical composition', 'dynamic action or expression', 'upper frame prominence'],
      negativeModifiers: ['horizontal composition', 'low-energy static crop', 'subject hidden by lower text area']
    },
    twitter_x: {
      label: 'X (Twitter) Post',
      aspectRatio: '16:9',
      focalPointGuidance: 'Center-left or center. Keep staging simple for fast-feed scanning.',
      compositionStyle: 'Clean simple landscape image that reads at small display size',
      safeZones: { top: 0.06, bottom: 0.08, left: 0.06, right: 0.06 },
      promptModifiers: ['landscape composition', 'clean simple staging', 'high contrast for small display'],
      negativeModifiers: ['busy cluttered composition', 'low contrast small-display image']
    },
    website_hero: {
      label: 'Website Hero Banner',
      aspectRatio: '16:9',
      focalPointGuidance: 'Right side or center. Left side often carries text overlay.',
      compositionStyle: 'Cinematic hero image with protected left third for copy',
      safeZones: { top: 0.06, bottom: 0.08, left: 0.34, right: 0.04 },
      promptModifiers: ['cinematic landscape', 'subject right of center', 'clean left third for text overlay'],
      negativeModifiers: ['busy left third', 'portrait-only composition', 'edge-cropped subject']
    },
    email_header: {
      label: 'Email Header',
      aspectRatio: '3:1',
      focalPointGuidance: 'Center. Clean. Readable at small size.',
      compositionStyle: 'Slim header crop with minimal clutter and clear contrast',
      safeZones: { top: 0.10, bottom: 0.10, left: 0.08, right: 0.08 },
      promptModifiers: ['clean centered composition', 'minimal clutter', 'high contrast', 'readable small'],
      negativeModifiers: ['busy detailed background', 'tiny face', 'low contrast header']
    },
    print_a4_portrait: {
      label: 'Print - A4 Portrait',
      aspectRatio: '1:1.41',
      focalPointGuidance: 'Upper-center portrait composition with print-safe margins.',
      compositionStyle: 'High-resolution portrait page composition with full subject clarity',
      safeZones: { top: 0.06, bottom: 0.08, left: 0.07, right: 0.07 },
      promptModifiers: ['portrait orientation', 'high resolution composition', 'print-quality detail'],
      negativeModifiers: ['low-resolution social crop', 'wide banner composition']
    },
    billboard_landscape: {
      label: 'Billboard / OOH Landscape',
      aspectRatio: '4:1',
      focalPointGuidance: 'Center or right. Massive scale means face must be large and clear.',
      compositionStyle: 'Bold ultra-wide public-facing image with simple staging',
      safeZones: { top: 0.08, bottom: 0.10, left: 0.08, right: 0.08 },
      promptModifiers: ['billboard scale composition', 'subject prominent', 'clean bold staging', 'readable at distance'],
      negativeModifiers: ['small subject lost in environment', 'fine detail dependent composition', 'cluttered background']
    }
  };
  var PLATFORM_ALIASES = {
    instagram: 'instagram_feed_square',
    carousel: 'instagram_feed_portrait',
    story: 'instagram_stories',
    linkedin: 'linkedin_post',
    reel: 'tiktok_reels'
  };

  function canonicalPlatformId(id){
    id = String(id || '').trim();
    return PLATFORM_ALIASES[id] || id || 'instagram_feed_square';
  }

  function platformIntelligenceById(id){
    var canonical = canonicalPlatformId(id);
    var item = PLATFORM_INTELLIGENCE[canonical] || PLATFORM_INTELLIGENCE.instagram_feed_square;
    return Object.assign({ id: canonical }, item || {});
  }

  function currentPlatformIntelligence(){
    return platformIntelligenceById($('g-platform')?.value || 'instagram_feed_square');
  }

  function platformOptionsHtml(currentValue){
    var current = canonicalPlatformId(currentValue || $('g-platform')?.value || 'instagram_feed_square');
    var options = Object.keys(PLATFORM_INTELLIGENCE).map(function(id){
      var item = platformIntelligenceById(id);
      return '<option value="' + esc(id) + '"' + (id === current ? ' selected' : '') + '>' + esc(item.label) + '</option>';
    }).join('');
    var legacy = Object.keys(PLATFORM_ALIASES).map(function(alias){
      var mapped = platformIntelligenceById(alias);
      return '<option value="' + esc(alias) + '"' + (alias === currentValue ? ' selected' : '') + '>Legacy: ' + esc(mapped.label) + '</option>';
    }).join('');
    return options + '<optgroup label="Legacy aliases">' + legacy + '</optgroup>';
  }

  function platformAspectCss(aspect){
    var value = String(aspect || '1:1').trim();
    var parts = value.split(':').map(function(part){ return Number(part); });
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] + ' / ' + parts[1];
    return '1 / 1';
  }

  function platformSafeZoneStyle(safeZones){
    safeZones = safeZones || {};
    function pct(value){ return Math.max(0, Math.min(90, Number(value || 0) * 100)).toFixed(1) + '%'; }
    return [
      '--pg52-safe-top:' + pct(safeZones.top) + ';',
      '--pg52-safe-bottom:' + pct(safeZones.bottom) + ';',
      '--pg52-safe-left:' + pct(safeZones.left) + ';',
      '--pg52-safe-right:' + pct(safeZones.right) + ';'
    ].join('');
  }

  function platformSafeZoneSummary(intel){
    var safe = intel?.safeZones || {};
    var parts = [];
    if (safe.top) parts.push('top ' + Math.round(safe.top * 100) + '%');
    if (safe.bottom) parts.push('bottom ' + Math.round(safe.bottom * 100) + '%');
    if (safe.left) parts.push('left ' + Math.round(safe.left * 100) + '%');
    if (safe.right) parts.push('right ' + Math.round(safe.right * 100) + '%');
    return parts.length ? 'Safe zone: ' + parts.join(' · ') : 'No special safe-zone constraints';
  }

  function platformIntelligencePayload(intel){
    intel = intel || currentPlatformIntelligence();
    return {
      id: intel.id,
      label: intel.label,
      aspectRatio: intel.aspectRatio,
      focalPointGuidance: intel.focalPointGuidance || '',
      compositionStyle: intel.compositionStyle || '',
      safeZones: Object.assign({}, intel.safeZones || {}),
      selectedAspectRatio: intel.selectedAspectRatio || getCurrentImageAspectRatio(),
      promptModifiers: normalizeList(intel.promptModifiers || []),
      negativeModifiers: normalizeList(intel.negativeModifiers || [])
    };
  }

  function platformCompositionPreviewHtml(){
    var intel = currentPlatformIntelligence();
    var safeStyle = platformSafeZoneStyle(intel.safeZones);
    var aspectStyle = 'aspect-ratio:' + platformAspectCss(intel.aspectRatio) + ';' + safeStyle;
    return [
      '<aside class="pg52-platform-preview" id="pg52-platform-preview" aria-live="polite">',
        '<div class="pg52-platform-preview-copy">',
          '<span class="pg52-t-micro">Platform Composition Preview</span>',
          '<strong>' + esc(intel.label || 'Platform') + ' · ' + esc(intel.aspectRatio || '1:1') + '</strong>',
          '<p>' + esc(intel.focalPointGuidance || 'Keep the subject clearly readable for the selected destination.') + '</p>',
          '<div class="pg52-platform-preview-tags">',
            '<span>' + esc(intel.compositionStyle || 'Composition guide') + '</span>',
            '<span>' + esc(platformSafeZoneSummary(intel)) + '</span>',
          '</div>',
        '</div>',
        '<div class="pg52-platform-preview-frame-wrap">',
          '<div class="pg52-platform-preview-frame" style="' + esc(aspectStyle) + '">',
            '<div class="pg52-platform-preview-safe pg52-platform-preview-safe--top"></div>',
            '<div class="pg52-platform-preview-safe pg52-platform-preview-safe--bottom"></div>',
            '<div class="pg52-platform-preview-safe pg52-platform-preview-safe--left"></div>',
            '<div class="pg52-platform-preview-safe pg52-platform-preview-safe--right"></div>',
            '<div class="pg52-platform-preview-subject"><span>subject</span></div>',
          '</div>',
        '</div>',
      '</aside>'
    ].join('');
  }

  function renderPlatformCompositionPreview(){
    var wrap = $('pg52-platform-preview');
    if (!wrap) return;
    var temp = document.createElement('div');
    temp.innerHTML = platformCompositionPreviewHtml();
    var next = temp.firstElementChild;
    if (next) wrap.replaceWith(next);
  }

  function syncPlatformIntelligence(options){
    options = options || {};
    var select = $('g-platform');
    var aspect = $('g-image-aspect');
    var intel = currentPlatformIntelligence();
    if (aspect && intel.aspectRatio && options.skipAspect !== true) aspect.value = intel.aspectRatio;
    renderPlatformCompositionPreview();
    if (options.refresh) {
      syncChipLabels($('prompt-generator-52-shell') || document);
      renderPromptPreview();
      renderRoutePreview(null);
      schedulePreviewImageRouteFromGenerator();
    }
    if (select && select.value && PLATFORM_ALIASES[select.value]) select.dataset.platformAliasFor = PLATFORM_ALIASES[select.value];
  }

  var CAMERA_DISTANCES = ['tight portrait', 'medium portrait', 'three-quarter body', 'full body environmental', 'waist-up candid'];
  var LENS_CHOICES = ['35mm environmental realism', '50mm natural perspective', '85mm portrait compression', 'phone camera realism', 'editorial documentary lens'];
  var MOVEMENT_CHOICES = ['still but alive', 'walking naturally', 'hands adjusting jacket', 'looking off then back', 'turning through available light'];
  var PROP_CHOICES = ['', 'phone in hand', 'coffee cup', 'notebook', 'small tote bag', 'car keys', 'laptop sleeve'];

  var SA_VISUAL_INTELLIGENCE = {
    region: 'johannesburg',
    lightQuality: {
      altitudeMeters: 1753,
      note: 'High altitude Johannesburg light is sharper, warmer, and more directional than coastal or European overcast.',
      promptModifier: 'high altitude Johannesburg light, sharp warm directionality, real South African ambient texture'
    },
    skinToneIntelligence: {
      defaultModifiers: [
        'rich melanin captured with natural texture',
        'warm directional light revealing skin depth',
        'no beauty filter or skin smoothing',
        'SA texture realism, real skin and real light response'
      ],
      avoidAlways: ['lightened skin', 'skin smoothing', 'generic AI face drift', 'beauty filter softening']
    },
    culturalContext: {
      braamfontein: 'Creative district - art, education, fashion, and young Black professional class.',
      sandton: 'Financial district - executive polish, premium architecture, controlled aspiration.',
      maboneng: 'Art district - curated street realism, warm brick, galleries, and texture.',
      soweto: 'Community-anchored township energy - warm, powerful, real, never tourism-filtered.',
      rosebank: 'Premium culture and business district - composed, gallery-aware, polished but human.'
    }
  };

  var LOCATION_CATEGORIES = [
    { id: 'johannesburg', code: 'A', label: 'Johannesburg' },
    { id: 'south_africa', code: 'B', label: 'South Africa Wide' },
    { id: 'international', code: 'C', label: 'International / Aspirational' },
    { id: 'studio', code: 'D', label: 'Studio / Controlled Environments' },
    { id: 'conceptual', code: 'E', label: 'Conceptual / Surreal / Editorial' },
    { id: 'interior', code: 'F', label: 'Interior Environments' },
    { id: 'social_mirrors', code: 'G', label: 'SA Mirrors & Indoor Selfie Spots' },
    { id: 'social_street', code: 'H', label: 'SA Street & Outdoors' },
    { id: 'social_food', code: 'I', label: 'Food & Drink Moments' },
    { id: 'social_event', code: 'J', label: 'Event & Night Out' },
    { id: 'social_travel', code: 'K', label: 'Travel & Airport' },
    { id: 'social_home', code: 'L', label: 'Morning & Home Routine' }
  ];

  function locationCategory(categoryId){
    return LOCATION_CATEGORIES.find(function(item){ return item.id === categoryId; }) || LOCATION_CATEGORIES[0];
  }

  function loc(id, name, categoryId, environment, region, depthCharacter, lightQuality, moodNatural, promptModifiers, extra){
    var category = locationCategory(categoryId);
    return Object.assign({
      id: id,
      name: name,
      category: category.label,
      categoryId: category.id,
      categoryCode: category.code,
      environment: environment,
      region: region,
      lightQuality: lightQuality,
      depthCharacter: depthCharacter,
      moodNatural: moodNatural || [],
      promptModifiers: promptModifiers || []
    }, extra || {});
  }

  function socialLoc(id, name, categoryId, environment, region, lightQuality, promptModifiers, vibe, modeAffinity, extra){
    extra = Object.assign({}, extra || {});
    var depthCharacter = extra.depthCharacter || (environment === 'interior' ? 'Close social interior depth' : 'Lived-in social environment depth');
    var moodNatural = extra.moodNatural || ['candid', 'soft', 'confident'];
    return loc(id, name, categoryId, environment, region, depthCharacter, lightQuality, moodNatural, promptModifiers, Object.assign({}, extra, {
      modeAffinity: normalizeList(modeAffinity),
      vibe: vibe || '',
      socialMediaLocation: true
    }));
  }

  var LOCATION_REGISTRY = {
    cafe_braam: loc('cafe_braam', 'Cafe - Braamfontein', 'johannesburg', 'interior', 'Johannesburg', 'Compressed interior depth', 'warm diffused window light with interior spill', ['sharp', 'composed', 'candid'], ['warm window light spilling onto subject', 'soft interior background bokeh', 'Johannesburg cafe atmosphere', 'real interior depth, not studio background'], { district: 'braamfontein', subType: 'cafe', bestLighting: ['golden_am', 'morning', 'late_afternoon'], avoidLighting: ['midday', 'indoor_artificial'], suggestedDistance: ['medium portrait', 'waist-up candid', 'tight portrait'], avoidDistance: ['full body environmental'], props: ['coffee cup', 'laptop sleeve', 'notebook', 'phone in hand'], actionAffinity: ['seated with hands visible and expression controlled', 'quiet pause before speaking, eyes present', 'direct gaze, relaxed posture'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.braamfontein }),
    cafe_rosebank: loc('cafe_rosebank', 'Cafe - Rosebank', 'johannesburg', 'interior', 'Johannesburg', 'Premium interior depth', 'clean premium cafe daylight through large windows', ['composed', 'sharp', 'soft'], ['premium Rosebank cafe context', 'clean interior light', 'polished Johannesburg lifestyle texture'], { district: 'rosebank', subType: 'cafe', bestLighting: ['morning', 'golden_pm', 'indoor_day'], suggestedDistance: ['medium portrait', 'waist-up candid', 'three-quarter body'], props: ['coffee cup', 'notebook', 'small tote bag'], actionAffinity: ['seated with hands visible and expression controlled', 'leaning near the environment, aware but not posed', 'direct gaze, relaxed posture'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.rosebank }),
    maboneng: loc('maboneng', 'Maboneng Precinct', 'johannesburg', 'exterior', 'Johannesburg', 'Street depth', 'warm brick bounce and street light', ['candid', 'confident', 'in_motion'], ['Maboneng art district texture', 'warm brick and mural context', 'curated Johannesburg street realism'], { district: 'maboneng', subType: 'art_district', bestLighting: ['morning', 'golden_pm', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'], props: ['phone in hand', 'small tote bag'], actionAffinity: ['mid-step through the scene, face still clear', 'leaning near the environment, aware but not posed', 'turning slightly toward camera after movement'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.maboneng }),
    '44stanley': loc('44stanley', '44 Stanley', 'johannesburg', 'exterior', 'Johannesburg', 'Courtyard depth', 'filtered courtyard daylight through steel and glass', ['candid', 'soft', 'sharp'], ['industrial courtyard texture', 'weekend Johannesburg creative precinct', 'filtered light through steel and glass'], { district: 'milpark', subType: 'market_precinct', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['coffee cup', 'small tote bag', 'phone in hand'], actionAffinity: ['leaning near the environment, aware but not posed', 'direct gaze, relaxed posture', 'mid-step through the scene, face still clear'] }),
    victoria_yards: loc('victoria_yards', 'Victoria Yards', 'johannesburg', 'exterior', 'Johannesburg', 'Industrial courtyard depth', 'organic courtyard light and industrial bounce', ['pensive', 'candid', 'sharp'], ['repurposed industrial creative space', 'organic plantings and courtyard light', 'artist-adjacent Johannesburg atmosphere'], { district: 'lorentzville', subType: 'creative_yard', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'medium portrait'], props: ['notebook', 'phone in hand'], actionAffinity: ['quiet pause before speaking, eyes present', 'leaning near the environment, aware but not posed', 'turning slightly toward camera after movement'] }),
    sandton_lobby: loc('sandton_lobby', 'Sandton Hotel Lobby', 'johannesburg', 'interior', 'Johannesburg', 'Premium architectural depth', 'controlled premium lobby light with atrium spill', ['composed', 'confident', 'sharp'], ['premium Sandton interior', 'polished reflective surfaces', 'controlled architectural lines', 'executive Johannesburg presence'], { district: 'sandton', subType: 'hotel_lobby', bestLighting: ['morning', 'indoor_day', 'late_afternoon'], avoidLighting: ['blue_hour'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'], avoidDistance: ['tight portrait'], props: ['small tote bag', 'phone in hand', 'laptop sleeve'], actionAffinity: ['direct gaze, relaxed posture', 'turning slightly toward camera after movement', 'leaning near the environment, aware but not posed'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.sandton }),
    rooftop_jhb: loc('rooftop_jhb', 'JHB Rooftop', 'johannesburg', 'exterior', 'Johannesburg', 'Deep skyline depth', 'expansive directional sky light', ['confident', 'composed', 'in_motion'], ['Johannesburg skyline visible behind subject', 'directional golden-hour light from horizon', 'warm African golden hour tone', 'premium exterior architectural context'], { district: 'sandton', subType: 'rooftop', bestLighting: ['golden_pm', 'blue_hour', 'late_afternoon'], avoidLighting: ['midday', 'indoor_artificial'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'], avoidDistance: ['tight portrait'], props: ['phone in hand', 'small tote bag', 'car keys'], actionAffinity: ['mid-step through the scene, face still clear', 'turning slightly toward camera after movement', 'direct gaze, relaxed posture'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.sandton }),
    street_jhb: loc('street_jhb', 'City Street (JHB CBD)', 'johannesburg', 'exterior', 'Johannesburg', 'Urban street canyon depth', 'hard urban directional light', ['candid', 'in_motion', 'sharp'], ['real Johannesburg street texture', 'concrete and glass city depth', 'documentary street realism'], { district: 'cbd', subType: 'street', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'], avoidDistance: ['tight portrait'], props: ['phone in hand', 'small tote bag'], actionAffinity: ['mid-step through the scene, face still clear', 'turning slightly toward camera after movement', 'leaning near the environment, aware but not posed'] }),
    studio_desk: loc('studio_desk', 'Studio / Clean Desk', 'johannesburg', 'studio', 'Johannesburg', 'Controlled shallow depth', 'controlled clean studio light', ['sharp', 'composed', 'pensive'], ['clean studio desk context', 'controlled dark-surface workspace', 'professional production-console atmosphere'], { district: 'studio', subType: 'studio', bestLighting: ['indoor_day', 'morning', 'indoor_artificial'], avoidLighting: ['blue_hour'], suggestedDistance: ['medium portrait', 'tight portrait', 'waist-up candid'], avoidDistance: ['full body environmental'], props: ['laptop sleeve', 'notebook', 'phone in hand'], actionAffinity: ['direct gaze, relaxed posture', 'seated with hands visible and expression controlled', 'quiet pause before speaking, eyes present'] }),
    airport: loc('airport', 'OR Tambo Lounge', 'johannesburg', 'interior', 'Johannesburg', 'Transit interior depth', 'airport window daylight with practical spill', ['composed', 'candid', 'sharp'], ['OR Tambo professional travel context', 'modern airport interior', 'purposeful transit energy'], { district: 'kempton_park', subType: 'transit_lounge', bestLighting: ['morning', 'midday', 'indoor_day'], avoidLighting: ['golden_pm'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['laptop sleeve', 'phone in hand', 'small tote bag'], actionAffinity: ['mid-step through the scene, face still clear', 'seated with hands visible and expression controlled', 'direct gaze, relaxed posture'] }),
    gautrain: loc('gautrain', 'Gautrain Platform', 'johannesburg', 'interior', 'Johannesburg', 'Transit platform depth', 'clean transit light and motion', ['in_motion', 'candid', 'sharp'], ['Gautrain Johannesburg station context', 'modern South African rail infrastructure', 'real commuter movement'], { district: 'transit', subType: 'transit', bestLighting: ['morning', 'late_afternoon', 'indoor_day'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'], props: ['phone in hand', 'small tote bag'], actionAffinity: ['mid-step through the scene, face still clear', 'turning slightly toward camera after movement', 'walking naturally'] }),
    parkhurst: loc('parkhurst', 'Parkhurst 4th Ave', 'johannesburg', 'exterior', 'Johannesburg', 'Neighbourhood street depth', 'filtered residential cafe light', ['soft', 'candid', 'composed'], ['Parkhurst tree-lined weekend cafe texture', 'warm filtered suburban light', 'relaxed premium Johannesburg energy'], { district: 'parkhurst', subType: 'neighborhood_cafe', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['medium portrait', 'waist-up candid', 'three-quarter body'], props: ['coffee cup', 'small tote bag'], actionAffinity: ['direct gaze, relaxed posture', 'leaning near the environment, aware but not posed', 'seated with hands visible and expression controlled'] }),
    melville: loc('melville', 'Melville 7th St', 'johannesburg', 'exterior', 'Johannesburg', 'Bohemian street depth', 'late-afternoon warm street spill', ['candid', 'pensive', 'soft'], ['Melville lived-in cafe strip', 'bohemian Johannesburg street texture', 'warm end-of-day energy'], { district: 'melville', subType: 'bohemian_street', bestLighting: ['late_afternoon', 'golden_pm', 'blue_hour'], avoidLighting: ['midday'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'], props: ['coffee cup', 'phone in hand'], actionAffinity: ['quiet pause before speaking, eyes present', 'mid-step through the scene, face still clear', 'leaning near the environment, aware but not posed'] }),
    keyes: loc('keyes', 'Keyes Design Corridor', 'johannesburg', 'interior', 'Johannesburg', 'Gallery corridor depth', 'gallery side light and warm accent spill', ['composed', 'pensive', 'sharp'], ['Keyes Art Mile gallery texture', 'architectural corridor depth', 'quiet cultural authority'], { district: 'rosebank', subType: 'gallery', bestLighting: ['late_afternoon', 'blue_hour', 'indoor_day'], avoidLighting: ['midday'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'], props: ['phone in hand', 'small tote bag'], actionAffinity: ['quiet pause before speaking, eyes present', 'direct gaze, relaxed posture', 'leaning near the environment, aware but not posed'] }),
    pretoria: loc('pretoria', 'Pretoria Tech Zone', 'johannesburg', 'interior', 'Pretoria', 'Functional office depth', 'functional clean interior daylight', ['sharp', 'composed', 'candid'], ['Pretoria tech workspace', 'functional clean desk atmosphere', 'systems-builder realism'], { district: 'pretoria', subType: 'tech_office', bestLighting: ['indoor_day', 'late_afternoon', 'morning'], avoidLighting: ['golden_pm'], suggestedDistance: ['medium portrait', 'waist-up candid', 'tight portrait'], props: ['laptop sleeve', 'phone in hand', 'notebook'], actionAffinity: ['seated with hands visible and expression controlled', 'direct gaze, relaxed posture', 'quiet pause before speaking, eyes present'] }),

    jhb_train_station: loc('jhb_train_station', 'Johannesburg train station interior', 'johannesburg', 'interior', 'Johannesburg', 'Grand transit hall depth', 'overhead station light with gritty architectural shadow', ['candid', 'in_motion', 'sharp'], ['Johannesburg train station interior', 'historic transit scale', 'real commuter atmosphere'], { district: 'cbd', subType: 'train_station', bestLighting: ['indoor_day', 'morning', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'], props: ['phone in hand', 'small tote bag'] }),
    parktown_mansion: loc('parktown_mansion', 'Parktown mansion exterior', 'johannesburg', 'exterior', 'Johannesburg', 'Heritage garden depth', 'old-stone exterior light with tree filter', ['composed', 'pensive', 'soft'], ['Parktown heritage mansion exterior', 'old Johannesburg stone and garden texture', 'controlled legacy wealth atmosphere'], { district: 'parktown', subType: 'heritage_house', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    melrose_arch_evening: socialLoc('melrose_arch_evening', 'Melrose Arch Evening', 'social_street', 'exterior', 'Johannesburg', 'warm amber ambient evening light', ['Melrose Arch piazza', 'evening', 'warm amber ambient light', 'upmarket Johannesburg', 'restaurants open', 'dressed for dinner'], 'dinner out, elevated casual, Joburg nightlife', ['selfie', 'vibes', 'candid'], { district: 'melrose_arch', subType: 'premium_precinct', bestLighting: ['blue_hour', 'golden_pm', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'medium portrait', 'waist-up candid'], props: ['phone in hand', 'small tote bag'] }),
    newtown_arts: loc('newtown_arts', 'Newtown arts district', 'johannesburg', 'exterior', 'Johannesburg', 'Raw arts district depth', 'hard city light over brick, signage, and public art', ['candid', 'in_motion', 'sharp'], ['Newtown arts district', 'brick, signage, theatre and public-art texture', 'raw Johannesburg creative energy'], { district: 'newtown', subType: 'arts_district', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'] }),
    soweto_corner: loc('soweto_corner', 'Soweto street corner', 'johannesburg', 'exterior', 'Johannesburg', 'Community street depth', 'warm township street light with real community texture', ['candid', 'confident', 'soft'], ['Soweto street corner', 'warm community-anchored street realism', 'authentic South African neighbourhood energy'], { district: 'soweto', subType: 'street_corner', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.soweto }),
    diepsloot_market_edge: loc('diepsloot_market_edge', 'Diepsloot informal market edge', 'johannesburg', 'exterior', 'Johannesburg', 'Layered market edge depth', 'direct sun, shade cloth, dust, and market bounce', ['candid', 'in_motion', 'sharp'], ['Diepsloot informal market edge', 'real market texture without poverty styling', 'warm human South African street detail'], { district: 'diepsloot', subType: 'market_edge', bestLighting: ['morning', 'late_afternoon'], avoidLighting: ['midday'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    cbd_water_towers: loc('cbd_water_towers', 'Joburg CBD rooftop water towers', 'johannesburg', 'exterior', 'Johannesburg', 'Deep rooftop industrial depth', 'high-altitude rooftop light around water towers', ['confident', 'sharp', 'in_motion'], ['Joburg CBD rooftop water towers', 'industrial rooftop silhouette', 'high-altitude city light'], { district: 'cbd', subType: 'rooftop', bestLighting: ['golden_pm', 'blue_hour', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    constitutional_court_gardens: loc('constitutional_court_gardens', 'Constitutional Court gardens', 'johannesburg', 'exterior', 'Johannesburg', 'Civic garden depth', 'soft garden light against civic architecture', ['composed', 'pensive', 'sharp'], ['Constitutional Court gardens', 'civic architecture with planted texture', 'quiet South African institutional gravity'], { district: 'braamfontein', subType: 'civic_garden', bestLighting: ['morning', 'late_afternoon', 'midday'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    mine_dump_grass: loc('mine_dump_grass', 'Mine dump golden grass exterior', 'johannesburg', 'exterior', 'Johannesburg', 'Open golden grass depth', 'dry highveld grass and mine-dump glare', ['pensive', 'confident', 'soft'], ['mine dump golden grass exterior', 'dry highveld grass', 'Johannesburg mining landscape memory'], { district: 'south_jhb', subType: 'mine_dump', bestLighting: ['golden_pm', 'late_afternoon', 'golden_am'], avoidLighting: ['midday'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    sandton_convention_atrium: loc('sandton_convention_atrium', 'Sandton Convention Centre atrium', 'johannesburg', 'interior', 'Johannesburg', 'Corporate atrium depth', 'large atrium daylight and premium practicals', ['composed', 'confident', 'sharp'], ['Sandton Convention Centre atrium', 'large corporate interior scale', 'conference-ready premium energy'], { district: 'sandton', subType: 'atrium', bestLighting: ['indoor_day', 'morning', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    rosebank_rooftop_pool: loc('rosebank_rooftop_pool', 'Rosebank rooftop pool', 'johannesburg', 'exterior', 'Johannesburg', 'Poolside skyline depth', 'water reflection and rooftop daylight', ['confident', 'soft', 'composed'], ['Rosebank rooftop pool', 'water reflection and city view', 'premium lifestyle without resort cliche'], { district: 'rosebank', subType: 'rooftop_pool', bestLighting: ['golden_pm', 'blue_hour', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    fourways_estate_gates: loc('fourways_estate_gates', 'Fourways luxury estate gates', 'johannesburg', 'exterior', 'Johannesburg', 'Gated estate approach depth', 'suburban premium driveway light', ['composed', 'confident', 'soft'], ['Fourways luxury estate gates', 'premium suburban security architecture', 'controlled private-estate arrival'], { district: 'fourways', subType: 'estate_gates', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    cradle_rock_formations: loc('cradle_rock_formations', 'Cradle of Humankind rock formations', 'johannesburg', 'exterior', 'Gauteng', 'Ancient rock landscape depth', 'dry earth, rock, and open sky light', ['pensive', 'confident', 'soft'], ['Cradle of Humankind rock formations', 'ancient highveld landscape', 'earth-toned archaeological texture'], { district: 'cradle_of_humankind', subType: 'rock_formations', bestLighting: ['golden_am', 'golden_pm', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    magaliesberg_cliff: loc('magaliesberg_cliff', 'Magaliesberg mountain cliff edge', 'johannesburg', 'exterior', 'Gauteng', 'Extreme landscape depth', 'mountain edge light and broad valley air', ['confident', 'pensive', 'in_motion'], ['Magaliesberg mountain cliff edge', 'wide valley depth', 'South African mountain light'], { district: 'magaliesberg', subType: 'cliff_edge', bestLighting: ['golden_am', 'golden_pm', 'blue_hour'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    hartbeespoort_jetty: loc('hartbeespoort_jetty', 'Hartbeespoort dam jetty', 'johannesburg', 'exterior', 'North West', 'Water horizon depth', 'dam water reflection with mountain background', ['soft', 'pensive', 'confident'], ['Hartbeespoort dam jetty', 'water reflection and mountain horizon', 'quiet weekend escape atmosphere'], { district: 'hartbeespoort', subType: 'dam_jetty', bestLighting: ['golden_am', 'golden_pm', 'blue_hour'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),

    cape_town_waterfront: loc('cape_town_waterfront', 'Cape Town V&A Waterfront', 'south_africa', 'exterior', 'Cape Town', 'Harbour and mountain depth', 'coastal harbour light with Table Mountain air', ['confident', 'candid', 'composed'], ['Cape Town V&A Waterfront', 'harbour texture and mountain-backed light', 'premium coastal South African context'], { subType: 'harbour', bestLighting: ['golden_pm', 'late_afternoon', 'morning'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    clifton_blue_hour: loc('clifton_blue_hour', 'Clifton beach at blue hour', 'south_africa', 'exterior', 'Cape Town', 'Ocean horizon depth', 'cool blue-hour beach light against pale sand', ['soft', 'pensive', 'confident'], ['Clifton beach at blue hour', 'Atlantic ocean dusk gradient', 'premium coastal stillness'], { subType: 'beach', bestLighting: ['blue_hour', 'golden_pm'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    bo_kaap_street: loc('bo_kaap_street', 'Cape Malay Bo-Kaap street', 'south_africa', 'exterior', 'Cape Town', 'Colourful street depth', 'bright painted walls with strong Cape daylight', ['candid', 'confident', 'sharp'], ['Cape Malay Bo-Kaap street', 'colourful heritage walls', 'Cape Malay architectural context'], { subType: 'heritage_street', bestLighting: ['morning', 'late_afternoon', 'midday'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'] }),
    winelands_cellar: loc('winelands_cellar', 'Winelands estate cellar', 'south_africa', 'interior', 'Western Cape', 'Stone cellar depth', 'cool cellar light with warm wood and stone', ['composed', 'pensive', 'soft'], ['Winelands estate cellar', 'stone, barrel, and warm wood texture', 'premium Western Cape estate atmosphere'], { subType: 'wine_cellar', bestLighting: ['indoor_day', 'late_afternoon', 'morning'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    durban_promenade: socialLoc('durban_promenade', 'Durban North Beach Promenade', 'social_street', 'exterior', 'Durban', 'warm humid beachfront haze', ['Durban North Beach promenade', 'Indian Ocean', 'surfers', 'warm Durban humidity and haze', 'diverse SA beachfront energy'], 'Durban beach, warm, coastal SA, different energy to CT', ['selfie', 'vibes', 'candid'], { subType: 'beachfront_promenade', bestLighting: ['golden_am', 'morning', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    durban_indian_market: loc('durban_indian_market', 'Durban Indian market interior', 'south_africa', 'interior', 'Durban', 'Dense market interior depth', 'spice-market practical light and saturated colour', ['candid', 'sharp', 'in_motion'], ['Durban Indian market interior', 'spice colours and dense market detail', 'South African Indian cultural texture'], { subType: 'market_interior', bestLighting: ['indoor_day', 'morning', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'] }),
    kruger_bushveld_dawn: loc('kruger_bushveld_dawn', 'Kruger bushveld edge at dawn', 'south_africa', 'exterior', 'Mpumalanga', 'Bushveld horizon depth', 'low dawn light through dry bushveld', ['pensive', 'soft', 'confident'], ['Kruger bushveld edge at dawn', 'low African dawn light', 'dry bushveld and acacia edge'], { subType: 'bushveld', bestLighting: ['golden_am', 'morning'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    drakensberg_overlook: loc('drakensberg_overlook', 'Drakensberg cliff overlook', 'south_africa', 'exterior', 'KwaZulu-Natal', 'Massive mountain depth', 'clear mountain light and dramatic cliff shadow', ['confident', 'pensive', 'in_motion'], ['Drakensberg cliff overlook', 'massive mountain backdrop', 'clear South African alpine light'], { subType: 'cliff_overlook', bestLighting: ['golden_am', 'late_afternoon', 'golden_pm'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    karoo_horizon: loc('karoo_horizon', 'Karoo plains infinite horizon', 'south_africa', 'exterior', 'Karoo', 'Infinite horizon depth', 'dry open Karoo light and long shadows', ['pensive', 'soft', 'confident'], ['Karoo plains infinite horizon', 'dry open landscape and long shadows', 'quiet South African interior vastness'], { subType: 'desert_plain', bestLighting: ['golden_am', 'golden_pm', 'late_afternoon'], avoidLighting: ['midday'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    pe_lighthouse: loc('pe_lighthouse', 'Port Elizabeth lighthouse', 'south_africa', 'exterior', 'Gqeberha', 'Coastal landmark depth', 'windy coastal light around lighthouse architecture', ['candid', 'soft', 'pensive'], ['Port Elizabeth lighthouse', 'windy Eastern Cape coastal texture', 'lighthouse landmark depth'], { subType: 'lighthouse', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    hermanus_clifftop: loc('hermanus_clifftop', 'Hermanus clifftop walk', 'south_africa', 'exterior', 'Western Cape', 'Cliff and ocean depth', 'coastal cliff light with ocean haze', ['pensive', 'soft', 'candid'], ['Hermanus clifftop walk', 'ocean cliff path and coastal air', 'quiet Western Cape seaside drama'], { subType: 'clifftop_walk', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    stellenbosch_courtyard: loc('stellenbosch_courtyard', 'Stellenbosch university courtyard', 'south_africa', 'exterior', 'Stellenbosch', 'Campus courtyard depth', 'oak-filtered university courtyard light', ['composed', 'candid', 'sharp'], ['Stellenbosch university courtyard', 'oak trees, Cape Dutch edges, campus texture', 'academic South African calm'], { subType: 'university_courtyard', bestLighting: ['morning', 'late_afternoon', 'midday'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),

    dubai_financial_canyon: loc('dubai_financial_canyon', 'Dubai financial district glass canyon', 'international', 'exterior', 'Dubai', 'Glass canyon depth', 'reflected desert sun between glass towers', ['confident', 'composed', 'sharp'], ['Dubai financial district glass canyon', 'mirrored towers and controlled luxury', 'aspirational international business energy'], { subType: 'financial_district', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    london_mayfair_townhouse: loc('london_mayfair_townhouse', 'London Mayfair townhouse exterior', 'international', 'exterior', 'London', 'Townhouse street depth', 'soft London townhouse light', ['composed', 'pensive', 'soft'], ['London Mayfair townhouse exterior', 'heritage wealth architecture', 'quiet international polish'], { subType: 'townhouse', bestLighting: ['morning', 'midday', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    paris_haussmann_balcony: loc('paris_haussmann_balcony', 'Paris Haussmann balcony', 'international', 'exterior', 'Paris', 'Balcony city depth', 'soft European balcony light', ['composed', 'soft', 'pensive'], ['Paris Haussmann balcony', 'wrought iron and pale stone', 'editorial European apartment energy'], { subType: 'balcony', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['medium portrait', 'waist-up candid', 'three-quarter body'] }),
    ny_rooftop_water_tower: loc('ny_rooftop_water_tower', 'New York rooftop water tower silhouette', 'international', 'exterior', 'New York', 'Rooftop skyline depth', 'backlit skyline and water-tower silhouette', ['confident', 'pensive', 'sharp'], ['New York rooftop water tower silhouette', 'urban rooftop silhouette', 'cinematic city-backdrop energy'], { subType: 'rooftop', bestLighting: ['golden_pm', 'blue_hour', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    tokyo_neon_corridor: loc('tokyo_neon_corridor', 'Tokyo neon corridor', 'international', 'exterior', 'Tokyo', 'Neon corridor depth', 'neon practicals and wet pavement glow', ['in_motion', 'sharp', 'candid'], ['Tokyo neon corridor', 'neon signage and reflective street light', 'dense night-city editorial atmosphere'], { subType: 'neon_corridor', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    lagos_island_rooftop: loc('lagos_island_rooftop', 'Lagos Island rooftop', 'international', 'exterior', 'Lagos', 'Humid skyline depth', 'warm humid rooftop city light', ['confident', 'candid', 'sharp'], ['Lagos Island rooftop', 'humid skyline and West African city energy', 'premium African urban power'], { subType: 'rooftop', bestLighting: ['golden_pm', 'late_afternoon', 'blue_hour'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    nairobi_westlands_tower: loc('nairobi_westlands_tower', 'Nairobi Westlands office tower', 'international', 'interior', 'Nairobi', 'Office tower depth', 'East African office daylight and skyline glass', ['composed', 'confident', 'sharp'], ['Nairobi Westlands office tower', 'glass tower and city-business context', 'East African professional polish'], { subType: 'office_tower', bestLighting: ['indoor_day', 'morning', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    milan_fashion_street: loc('milan_fashion_street', 'Milan fashion district street', 'international', 'exterior', 'Milan', 'Luxury street depth', 'soft Italian street light on stone and glass', ['composed', 'confident', 'candid'], ['Milan fashion district street', 'luxury storefront rhythm', 'international fashion-editor street context'], { subType: 'fashion_district', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    berlin_brutalist_stairwell: loc('berlin_brutalist_stairwell', 'Berlin brutalist stairwell', 'international', 'interior', 'Berlin', 'Concrete stairwell depth', 'cool concrete light and hard shadow', ['sharp', 'pensive', 'composed'], ['Berlin brutalist stairwell', 'raw concrete geometry', 'hard editorial architecture'], { subType: 'brutalist_stairwell', bestLighting: ['indoor_day', 'late_afternoon', 'indoor_artificial'], suggestedDistance: ['three-quarter body', 'medium portrait', 'waist-up candid'] }),
    lagos_lekki_beach: loc('lagos_lekki_beach', 'Lagos Lekki beach', 'international', 'exterior', 'Lagos', 'Beach horizon depth', 'humid Atlantic beach light', ['soft', 'candid', 'confident'], ['Lagos Lekki beach', 'Atlantic beach haze and warm air', 'West African coastal ease'], { subType: 'beach', bestLighting: ['golden_am', 'golden_pm', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    accra_new_city_glass: loc('accra_new_city_glass', 'Accra new city glass exterior', 'international', 'exterior', 'Accra', 'Glass exterior depth', 'tropical urban daylight on new glass architecture', ['confident', 'composed', 'sharp'], ['Accra new city glass exterior', 'new African city glass architecture', 'bright tropical executive energy'], { subType: 'glass_exterior', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),

    studio_white_cove: loc('studio_white_cove', 'All-white infinity cove', 'studio', 'studio', 'Studio', 'Seamless controlled depth', 'clean high-key studio wrap light', ['sharp', 'composed', 'soft'], ['all-white infinity cove', 'seamless high-key studio', 'clean controlled commercial light'], { subType: 'infinity_cove', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    studio_black_void: loc('studio_black_void', 'All-black void studio', 'studio', 'studio', 'Studio', 'Void depth', 'black negative space with controlled edge light', ['sharp', 'pensive', 'confident'], ['all-black void studio', 'controlled negative space', 'edge-lit subject separation'], { subType: 'black_void', bestLighting: ['indoor_artificial'], suggestedDistance: ['medium portrait', 'three-quarter body', 'tight portrait'] }),
    concrete_bunker: loc('concrete_bunker', 'Concrete bunker industrial', 'studio', 'studio', 'Studio', 'Industrial concrete depth', 'cool hard light over concrete surfaces', ['sharp', 'pensive', 'composed'], ['concrete bunker industrial', 'raw concrete texture', 'controlled industrial editorial setting'], { subType: 'industrial_bunker', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    skylight_warehouse: loc('skylight_warehouse', 'Warehouse with north-facing skylights', 'studio', 'studio', 'Studio', 'Large warehouse depth', 'soft skylight from high north-facing windows', ['candid', 'sharp', 'composed'], ['warehouse with north-facing skylights', 'large industrial volume', 'soft overhead skylight without beauty flattening'], { subType: 'warehouse', bestLighting: ['indoor_day', 'morning', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    gel_cyclorama: loc('gel_cyclorama', 'Cyclorama with coloured gel wash', 'studio', 'studio', 'Studio', 'Seamless colour depth', 'controlled gel wash with clean shadow falloff', ['confident', 'sharp', 'soft'], ['cyclorama with coloured gel wash', 'controlled colour atmosphere', 'editorial studio light design'], { subType: 'cyclorama', bestLighting: ['indoor_artificial'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    cream_fabric_backdrop: loc('cream_fabric_backdrop', 'Fabric backdrop - cream', 'studio', 'studio', 'Studio', 'Soft backdrop depth', 'soft cream fabric bounce and gentle shadow', ['soft', 'composed', 'pensive'], ['cream fabric backdrop', 'soft folded textile texture', 'warm editorial portrait studio'], { subType: 'fabric_backdrop', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['medium portrait', 'tight portrait', 'waist-up candid'] }),
    terracotta_fabric_backdrop: loc('terracotta_fabric_backdrop', 'Fabric backdrop - terracotta', 'studio', 'studio', 'Studio', 'Warm backdrop depth', 'warm terracotta textile bounce', ['composed', 'soft', 'confident'], ['terracotta fabric backdrop', 'warm earth-tone textile texture', 'skin-flattering controlled studio warmth'], { subType: 'fabric_backdrop', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['medium portrait', 'tight portrait', 'waist-up candid'] }),
    mirror_wall_studio: loc('mirror_wall_studio', 'Mirror wall studio', 'studio', 'studio', 'Studio', 'Reflective studio depth', 'mirror reflections with controlled side light', ['sharp', 'confident', 'in_motion'], ['mirror wall studio', 'reflections and body-line rhythm', 'controlled fashion-studio geometry'], { subType: 'mirror_wall', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    greenhouse_interior: loc('greenhouse_interior', 'Greenhouse interior', 'studio', 'interior', 'Studio', 'Plant-filled glass depth', 'greenhouse daylight through glass and leaves', ['soft', 'candid', 'pensive'], ['greenhouse interior', 'glasshouse plant texture', 'diffused botanical daylight'], { subType: 'greenhouse', bestLighting: ['morning', 'indoor_day', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    tall_library: loc('tall_library', 'Library with tall shelving', 'studio', 'interior', 'Studio', 'Tall shelf depth', 'warm reading-room light and vertical shelving', ['pensive', 'composed', 'sharp'], ['library with tall shelving', 'vertical book stacks and warm practicals', 'intellectual editorial atmosphere'], { subType: 'library', bestLighting: ['indoor_day', 'indoor_artificial', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'], props: ['notebook', 'phone in hand'] }),

    grey_fog_float: loc('grey_fog_float', 'Floating in soft grey fog (no ground visible)', 'conceptual', 'conceptual', 'Conceptual', 'No-ground surreal depth', 'soft omnidirectional grey fog light', ['pensive', 'soft', 'composed'], ['floating in soft grey fog', 'no visible ground plane', 'surreal editorial isolation'], { subType: 'fog', bestLighting: ['indoor_artificial', 'blue_hour'], suggestedDistance: ['medium portrait', 'full body environmental', 'three-quarter body'] }),
    shallow_clear_water: loc('shallow_clear_water', 'Submerged in shallow clear water (waist depth)', 'conceptual', 'conceptual', 'Conceptual', 'Water-surface depth', 'clear water caustics and soft overhead light', ['pensive', 'soft', 'confident'], ['submerged in shallow clear water at waist depth', 'water refraction and skin-real texture', 'surreal fashion-photo stillness'], { subType: 'water', bestLighting: ['morning', 'indoor_artificial', 'golden_am'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'] }),
    savanna_tall_grass: loc('savanna_tall_grass', 'Standing in tall golden grass (chest height, African savanna)', 'conceptual', 'exterior', 'Conceptual Africa', 'Chest-height grass depth', 'golden grass light and warm savanna haze', ['soft', 'pensive', 'confident'], ['standing in tall golden grass', 'chest-height African savanna grass', 'warm backlit field texture'], { subType: 'savanna_grass', bestLighting: ['golden_pm', 'golden_am', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    hanging_fabrics_wind: loc('hanging_fabrics_wind', 'Surrounded by hanging fabrics in wind', 'conceptual', 'conceptual', 'Conceptual', 'Layered fabric depth', 'moving textile shadows and controlled side light', ['in_motion', 'soft', 'confident'], ['surrounded by hanging fabrics in wind', 'fabric layers moving around subject', 'editorial motion and textile energy'], { subType: 'fabric_motion', bestLighting: ['indoor_artificial', 'late_afternoon'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    overhead_shaft_dark: loc('overhead_shaft_dark', 'Lit by single overhead shaft of light (everything else dark)', 'conceptual', 'conceptual', 'Conceptual', 'Black void with vertical light', 'single overhead shaft against darkness', ['sharp', 'pensive', 'composed'], ['single overhead shaft of light', 'everything else falls into dark', 'dramatic chiaroscuro editorial portrait'], { subType: 'shaft_light', bestLighting: ['indoor_artificial'], avoidLighting: ['midday'], suggestedDistance: ['medium portrait', 'tight portrait', 'three-quarter body'] }),
    city_rain_street: loc('city_rain_street', 'Standing in rain on city street', 'conceptual', 'exterior', 'Conceptual City', 'Wet street depth', 'rain reflections and city practicals', ['pensive', 'in_motion', 'sharp'], ['standing in rain on city street', 'wet pavement reflections', 'cinematic urban rain atmosphere'], { subType: 'rain_street', bestLighting: ['blue_hour', 'indoor_artificial', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'medium portrait', 'waist-up candid'] }),
    sunset_gradient_silhouette: loc('sunset_gradient_silhouette', 'Silhouette against sunset gradient', 'conceptual', 'exterior', 'Conceptual', 'Flat horizon silhouette depth', 'backlit sunset gradient with subject silhouette edge', ['pensive', 'confident', 'soft'], ['silhouette against sunset gradient', 'clean edge light and colour gradient sky', 'minimal editorial shape language'], { subType: 'silhouette', bestLighting: ['golden_pm', 'blue_hour'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    industrial_flame_backlight: loc('industrial_flame_backlight', 'Backlit by industrial flame', 'conceptual', 'conceptual', 'Conceptual', 'Fire-lit industrial depth', 'orange flame backlight with smoke and hard rim light', ['confident', 'sharp', 'in_motion'], ['backlit by industrial flame', 'orange rim light and smoke texture', 'dangerous editorial industrial energy'], { subType: 'flame', bestLighting: ['indoor_artificial', 'blue_hour'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    ice_frost_environment: loc('ice_frost_environment', 'Ice and frost environment', 'conceptual', 'conceptual', 'Conceptual', 'Cold reflective depth', 'cool blue-white frost light', ['pensive', 'sharp', 'soft'], ['ice and frost environment', 'cold reflective surfaces', 'breath and frost atmosphere'], { subType: 'ice', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['medium portrait', 'three-quarter body', 'full body environmental'] }),
    desert_dune_ridge: loc('desert_dune_ridge', 'Desert sand dune ridge', 'conceptual', 'exterior', 'Conceptual Desert', 'Dune horizon depth', 'low desert light over sand ridge', ['pensive', 'confident', 'soft'], ['desert sand dune ridge', 'clean sand horizon and long shadows', 'minimal hot landscape editorial'], { subType: 'desert_dune', bestLighting: ['golden_am', 'golden_pm', 'late_afternoon'], avoidLighting: ['midday'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),

    hospital_corridor: loc('hospital_corridor', 'Hospital corridor (clinical white)', 'interior', 'interior', 'Interior', 'Long clinical corridor depth', 'flat clinical white fluorescent light', ['sharp', 'pensive', 'composed'], ['hospital corridor clinical white', 'long sterile corridor', 'controlled institutional tension'], { subType: 'hospital_corridor', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    hotel_suite_window: loc('hotel_suite_window', 'Luxury hotel suite - bed and window light', 'interior', 'interior', 'Interior', 'Suite window depth', 'soft luxury-suite window light', ['soft', 'composed', 'pensive'], ['luxury hotel suite with bed and window light', 'soft linen and city-window glow', 'private premium lifestyle interior'], { subType: 'hotel_suite', bestLighting: ['morning', 'late_afternoon', 'indoor_day'], suggestedDistance: ['medium portrait', 'waist-up candid', 'three-quarter body'] }),
    church_pew_light: loc('church_pew_light', 'Church interior - pew light', 'interior', 'interior', 'Interior', 'Long pew and aisle depth', 'stained-glass or doorway pew light', ['pensive', 'soft', 'composed'], ['church interior pew light', 'long pew rows and quiet spiritual depth', 'soft directional sacred interior light'], { subType: 'church', bestLighting: ['morning', 'late_afternoon', 'indoor_day'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),
    government_marble_corridor: loc('government_marble_corridor', 'Government building marble corridor', 'interior', 'interior', 'Interior', 'Formal corridor depth', 'cool marble bounce and institutional light', ['composed', 'sharp', 'pensive'], ['government building marble corridor', 'formal institutional architecture', 'controlled civic power atmosphere'], { subType: 'government_corridor', bestLighting: ['indoor_day', 'indoor_artificial'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    parking_green_fluorescent: loc('parking_green_fluorescent', 'Underground parking structure - green fluorescent', 'interior', 'interior', 'Interior', 'Concrete parking depth', 'green fluorescent practical light', ['sharp', 'in_motion', 'pensive'], ['underground parking structure', 'green fluorescent cast and concrete depth', 'cinematic basement realism'], { subType: 'parking', bestLighting: ['indoor_artificial'], suggestedDistance: ['three-quarter body', 'medium portrait', 'full body environmental'] }),
    rooftop_restaurant_view: loc('rooftop_restaurant_view', 'Rooftop restaurant with city view', 'interior', 'interior', 'Interior', 'Restaurant city-view depth', 'mixed warm practicals and city-window light', ['composed', 'confident', 'soft'], ['rooftop restaurant with city view', 'warm practicals and skyline glass', 'premium dinner-hour atmosphere'], { subType: 'rooftop_restaurant', bestLighting: ['blue_hour', 'golden_pm', 'indoor_day'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'], props: ['coffee cup', 'phone in hand', 'small tote bag'] }),
    chef_kitchen: loc('chef_kitchen', 'Kitchen - professional chef kitchen', 'interior', 'interior', 'Interior', 'Professional kitchen depth', 'stainless kitchen light and practical highlights', ['sharp', 'candid', 'in_motion'], ['professional chef kitchen', 'stainless steel and working kitchen detail', 'real production-kitchen atmosphere'], { subType: 'chef_kitchen', bestLighting: ['indoor_day', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'] }),
    gym_mirrors: loc('gym_mirrors', 'Gym - mirrors and rubber floor', 'interior', 'interior', 'Interior', 'Mirror gym depth', 'hard gym practical light and mirror reflections', ['in_motion', 'sharp', 'confident'], ['gym with mirrors and rubber floor', 'mirror reflections and training-floor texture', 'controlled athletic interior'], { subType: 'gym', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'] }),
    spa_steam: loc('spa_steam', 'Spa - low light warm steam', 'interior', 'interior', 'Interior', 'Steam-soft shallow depth', 'low warm spa light through steam', ['soft', 'pensive', 'composed'], ['spa low light warm steam', 'soft steam diffusion and warm practicals', 'calm wellness interior'], { subType: 'spa', bestLighting: ['indoor_artificial', 'late_afternoon'], suggestedDistance: ['medium portrait', 'tight portrait', 'waist-up candid'] }),
    nightclub_edge: loc('nightclub_edge', 'Nightclub - dance floor edge', 'interior', 'interior', 'Interior', 'Dark dance-floor edge depth', 'coloured practicals and nightclub shadow', ['in_motion', 'confident', 'sharp'], ['nightclub dance floor edge', 'coloured practical light and dark background', 'nightlife energy without chaos'], { subType: 'nightclub', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    pool_underwater_edge: loc('pool_underwater_edge', 'Swimming pool underwater edge', 'interior', 'conceptual', 'Interior', 'Water-edge refractive depth', 'pool caustics and underwater-edge refraction', ['soft', 'pensive', 'confident'], ['swimming pool underwater edge', 'clear water refraction and tile texture', 'surreal lifestyle-water boundary'], { subType: 'pool_edge', bestLighting: ['morning', 'indoor_day', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'] }),
    white_gallery_spotlight: loc('white_gallery_spotlight', 'Art gallery - white walls and spotlight', 'interior', 'interior', 'Interior', 'White wall gallery depth', 'spotlight on white gallery walls', ['composed', 'sharp', 'pensive'], ['art gallery white walls and spotlight', 'controlled artwork-adjacent negative space', 'quiet cultural editorial frame'], { subType: 'art_gallery', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['medium portrait', 'three-quarter body', 'waist-up candid'] }),

    pretoria_tech: { id: 'pretoria_tech', aliasOf: 'pretoria' }
  };

  Object.assign(LOCATION_REGISTRY, {
    hotel_mirror_premium: socialLoc('hotel_mirror_premium', 'Hotel Mirror - Premium Suite', 'social_mirrors', 'interior', 'South Africa', 'warm vanity light from large backlit mirror', ['luxury hotel bathroom', 'large backlit mirror', 'warm vanity light', 'marble surfaces'], 'overnight stay energy, travel flex, elevated', ['mirror', 'selfie'], { subType: 'hotel_mirror', bestLighting: ['indoor_artificial', 'indoor_day', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['phone in hand'] }),
    gym_mirror_virgin_active: socialLoc('gym_mirror_virgin_active', 'Gym Mirror - Virgin Active', 'social_mirrors', 'interior', 'South Africa', 'fluorescent overhead gym light and mirror reflection', ['gym mirror selfie', 'gym equipment visible in reflection', 'fluorescent overhead light', 'rubber floor'], 'post-workout, fit check, athlete energy', ['mirror', 'selfie'], { subType: 'gym_mirror', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'], props: ['phone in hand'] }),
    mall_changing_room: socialLoc('mall_changing_room', 'Mall Changing Room Mirror', 'social_mirrors', 'interior', 'South Africa', 'flattering retail store lighting', ['retail changing room', 'three-panel mirror', 'flattering store lighting', 'shopping bags on floor hook'], "shopping haul, trying things on, 'got it'", ['mirror', 'selfie'], { subType: 'changing_room', bestLighting: ['indoor_artificial'], suggestedDistance: ['full body environmental', 'three-quarter body', 'waist-up candid'], props: ['small tote bag', 'phone in hand'] }),
    home_bedroom_mirror: socialLoc('home_bedroom_mirror', 'Home Bedroom Mirror', 'social_mirrors', 'interior', 'South Africa', 'natural bedroom window light from the side', ['bedroom full-length mirror', 'natural window light from the side', 'personal room visible in background', 'casual home setting'], 'GRWM, casual, real, before going out', ['mirror', 'selfie'], { subType: 'bedroom_mirror', bestLighting: ['morning', 'indoor_day', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'waist-up candid'], props: ['phone in hand'] }),
    office_bathroom_mirror: socialLoc('office_bathroom_mirror', 'Work Bathroom Mirror', 'social_mirrors', 'interior', 'South Africa', 'clean overhead strip lighting in corporate bathroom', ['corporate office bathroom', 'clean white tiles', 'overhead strip lighting', 'professional outfit check'], 'quick check before the meeting, corporate, polished', ['mirror', 'selfie'], { subType: 'office_bathroom', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['phone in hand'] }),
    club_bathroom_mirror: socialLoc('club_bathroom_mirror', 'Nightclub Bathroom Mirror', 'social_mirrors', 'interior', 'South Africa', 'neon or warm pink accent mirror lighting', ['nightclub bathroom', 'neon or warm pink accent lighting', 'LED mirror', 'dressed up', 'night out energy'], 'night out, pre-dance floor, gassed up', ['mirror', 'selfie'], { subType: 'club_bathroom', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['phone in hand'] }),
    nail_salon_vanity: socialLoc('nail_salon_vanity', 'Nail Salon Vanity', 'social_mirrors', 'interior', 'South Africa', 'ring light glow with salon practicals', ['nail salon interior', 'ring light glow', 'nails freshly done', 'polish bottles visible in background'], 'nail day, pamper, treat yourself', ['mirror', 'selfie'], { subType: 'nail_salon', bestLighting: ['indoor_artificial', 'indoor_day'], suggestedDistance: ['tight portrait', 'waist-up candid', 'medium portrait'], props: ['phone in hand'] }),
    hair_salon_mirror: socialLoc('hair_salon_mirror', 'Hair Salon Mirror', 'social_mirrors', 'interior', 'South Africa', 'salon mirror light and warm practicals', ['SA hair salon', 'styling mirror', 'chair', 'hair tools visible', 'Johannesburg township or Sandton salon aesthetic'], 'hair day, fresh, the reveal', ['mirror', 'selfie'], { subType: 'hair_salon', bestLighting: ['indoor_artificial', 'indoor_day', 'late_afternoon'], suggestedDistance: ['tight portrait', 'waist-up candid', 'medium portrait'], props: ['phone in hand'] }),

    petrol_station_sa: socialLoc('petrol_station_sa', 'South African Petrol Station', 'social_street', 'exterior', 'South Africa', 'bright petrol forecourt canopy light', ['South African petrol station forecourt', 'BP or Shell canopy', 'bright forecourt lighting', 'dressed up incongruously'], 'SA internet classic, glam at the garage, ironic flex', ['selfie', 'vibes', 'candid'], { subType: 'petrol_station', note: 'This is a genuine SA social media trope. Dress well, pose at a petrol station. Leaning on car by the pumps.', bestLighting: ['blue_hour', 'indoor_artificial', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'], props: ['phone in hand', 'car keys'] }),
    car_interior_selfie: socialLoc('car_interior_selfie', 'In the Car - Pre-Outing', 'social_street', 'interior', 'South Africa', 'warm side window light inside car', ['car interior', 'seatbelt on', 'steering wheel visible', 'warm window light', 'dressed up', 'sunglasses', 'Johannesburg suburb or highway background outside window'], 'on the way, car selfie, the pre-outing classic', ['selfie', 'vibes', 'candid'], { subType: 'car_interior', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['tight portrait', 'waist-up candid', 'medium portrait'], props: ['phone in hand'] }),
    neighbourgoods_market: socialLoc('neighbourgoods_market', 'Neighbourgoods Market - Braamfontein', 'social_street', 'exterior', 'Johannesburg', 'natural Saturday morning market light', ['Braamfontein Saturday market', 'outdoor stalls', 'eclectic crowd', 'Joburg creative energy', 'natural morning light', 'street food and colour'], 'Saturday market culture, Joburg creative class, weekend energy', ['selfie', 'vibes', 'candid'], { district: 'braamfontein', subType: 'market', bestLighting: ['morning', 'golden_am', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'], props: ['coffee cup', 'phone in hand'] }),
    maboneng_street: socialLoc('maboneng_street', 'Maboneng Street - Sunday', 'social_street', 'exterior', 'Johannesburg', 'warm street light with mural colour bounce', ['Maboneng inner-city street', 'colourful murals', 'pan-African weekend energy', 'outdoor dining', 'art everywhere'], 'Sunday in Maboneng, artsy, free, cultural', ['selfie', 'vibes', 'candid'], { district: 'maboneng', subType: 'street', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'] }),
    '44_stanley_courtyard': socialLoc('44_stanley_courtyard', '44 Stanley Courtyard', 'social_street', 'exterior', 'Johannesburg', 'filtered courtyard daylight through industrial architecture', ['44 Stanley courtyard', 'Milpark Johannesburg', 'industrial-creative architecture', 'weekend crowd', 'artisanal coffee energy'], 'creative professional class, artisan food, Joburg indie', ['selfie', 'vibes', 'candid'], { district: 'milpark', subType: 'courtyard', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['coffee cup', 'small tote bag'] }),
    sandton_city_entrance: socialLoc('sandton_city_entrance', 'Sandton City Entrance', 'social_street', 'exterior', 'Johannesburg', 'polished mall exterior daylight', ['Sandton City mall entrance', 'North Johannesburg premium retail', 'shoppers', 'polished suburban SA affluence', 'outdoor mall walkway'], 'Sandton everything, premium SA lifestyle', ['selfie', 'vibes', 'candid'], { district: 'sandton', subType: 'mall_entrance', bestLighting: ['late_afternoon', 'morning', 'indoor_day'], suggestedDistance: ['three-quarter body', 'full body environmental', 'medium portrait'], props: ['small tote bag', 'phone in hand'] }),
    mall_of_africa_atrium: socialLoc('mall_of_africa_atrium', 'Mall of Africa Atrium', 'social_street', 'interior', 'Midrand', 'large atrium skylight and mall practicals', ['Mall of Africa atrium', 'Midrand', 'massive indoor mall', 'skylight', 'premium SA shopping destination'], 'big mall energy, weekend shop, dressed well', ['selfie', 'vibes', 'candid'], { subType: 'mall_atrium', bestLighting: ['indoor_day', 'morning', 'indoor_artificial'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'], props: ['small tote bag', 'phone in hand'] }),
    joburg_cbd_street: socialLoc('joburg_cbd_street', 'Joburg CBD Street - Rush Hour', 'social_street', 'exterior', 'Johannesburg', 'hard city street light with taxi-rank life', ['Johannesburg CBD pavement', 'pedestrians', 'vendors', 'city energy', 'tall buildings', 'taxi rank adjacent', 'authentic Joburg chaos and life'], 'real city energy, Joburg authentic, not sanitised', ['selfie', 'vibes', 'candid'], { district: 'cbd', subType: 'rush_hour_street', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'full body environmental'] }),
    soweto_street_sunday: socialLoc('soweto_street_sunday', 'Soweto Street - Sunday Afternoon', 'social_street', 'exterior', 'Johannesburg', 'warm Sunday afternoon street light', ['Soweto street', 'Sunday afternoon', 'community energy', 'South African township architecture', 'warm afternoon light', 'cultural pride'], 'roots, cultural pride, authentic SA', ['selfie', 'vibes', 'candid'], { district: 'soweto', subType: 'sunday_street', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'], saContext: SA_VISUAL_INTELLIGENCE.culturalContext.soweto }),
    parkhurst_4th_ave: socialLoc('parkhurst_4th_ave', 'Parkhurst 4th Avenue', 'social_street', 'exterior', 'Johannesburg', 'leafy suburban filtered daylight', ['Parkhurst 4th Avenue', 'Johannesburg', 'leafy suburban street', 'outdoor restaurant tables', 'weekend brunchers', 'suburban SA affluence'], 'Sunday brunch, Parkhurst, suburban Joburg creative class', ['selfie', 'vibes', 'candid'], { district: 'parkhurst', subType: 'brunch_street', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['coffee cup', 'small tote bag'] }),
    rosebank_rooftop_market: socialLoc('rosebank_rooftop_market', 'Rosebank Rooftop Market Sunday', 'social_street', 'exterior', 'Johannesburg', 'open rooftop Sunday market daylight', ['Rosebank rooftop Sunday market', 'outdoor', 'Joburg skyline distant', 'craft stalls', 'weekend dressed'], 'Sunday market, rooftop Joburg, casual elevated', ['selfie', 'vibes', 'candid'], { district: 'rosebank', subType: 'rooftop_market', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['three-quarter body', 'waist-up candid', 'full body environmental'] }),
    capetown_camps_bay: socialLoc('capetown_camps_bay', 'Camps Bay Beach Cape Town', 'social_street', 'exterior', 'Cape Town', 'bright Atlantic beach light with mountain bounce', ['Camps Bay beach', 'Cape Town', 'Twelve Apostles mountains behind', 'Atlantic Ocean', 'summer holiday', 'beautiful people', 'beach flex'], 'Cape Town summer, beach flex, mountain sea combo', ['selfie', 'vibes', 'candid'], { subType: 'beach', bestLighting: ['golden_pm', 'golden_am', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    capetown_kloof_street: socialLoc('capetown_kloof_street', 'Kloof Street Cape Town', 'social_street', 'exterior', 'Cape Town', 'Cape Town street daylight with mountain air', ['Kloof Street Gardens Cape Town', 'trendy walkable street', 'cafes and boutiques', 'Cape Town creative class', 'mountain backdrop'], 'Cape Town coolest street, coffee and shopping', ['selfie', 'vibes', 'candid'], { subType: 'street', bestLighting: ['morning', 'late_afternoon', 'golden_pm'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),

    restaurant_table_joburg: socialLoc('restaurant_table_joburg', 'Joburg Restaurant Table', 'social_food', 'interior', 'Johannesburg', 'warm ambient dining practicals', ['upmarket Johannesburg restaurant interior', 'ambient dining light', 'food on table', 'glasses', 'SA dining affluence - Marble or Nox energy'], 'dinner, wining and dining, Joburg food scene', ['vibes', 'candid', 'selfie'], { subType: 'restaurant_table', bestLighting: ['indoor_artificial', 'blue_hour', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'medium portrait', 'tight portrait'], props: ['coffee cup', 'phone in hand'] }),
    coffee_shop_aesthetic: socialLoc('coffee_shop_aesthetic', 'Aesthetic Coffee Shop - Working', 'social_food', 'interior', 'South Africa', 'ambient natural coffee-shop window light', ['aesthetic South African coffee shop', 'laptop open', 'coffee cup', 'ambient natural window light', 'tiled floor', 'exposed brick or terrazzo'], 'doing the work, coffee shop office, hustle', ['vibes', 'candid', 'selfie'], { subType: 'coffee_shop', bestLighting: ['morning', 'indoor_day', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'medium portrait', 'tight portrait'], props: ['coffee cup', 'laptop sleeve'] }),
    braai_garden: socialLoc('braai_garden', 'SA Braai - Garden', 'social_food', 'exterior', 'South Africa', 'warm backyard weekend afternoon light with smoke', ['South African backyard braai', 'garden', 'smoke from the braai', 'casual outdoor SA socialising', 'weekend afternoon', 'cold drink in hand'], 'braai culture, SA weekend, real life, no filter energy', ['vibes', 'candid', 'selfie'], { subType: 'braai_garden', bestLighting: ['late_afternoon', 'golden_pm', 'morning'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    rooftop_bar_sunset: socialLoc('rooftop_bar_sunset', 'Rooftop Bar - Sunset', 'social_food', 'exterior', 'South Africa', 'sunset rooftop bar light with city practicals', ['Johannesburg or Cape Town rooftop bar', 'cocktail glass', 'sunset behind', 'city lights beginning to appear', 'dressed for the evening', 'golden hour'], 'after-work drinks, sundowners, Joburg or CT sunset', ['vibes', 'candid', 'selfie'], { subType: 'rooftop_bar', bestLighting: ['golden_pm', 'blue_hour', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),

    concert_venue: socialLoc('concert_venue', 'Concert / Live Event Venue', 'social_event', 'interior', 'South Africa', 'stage lights and crowd spill', ['live event venue', 'stage lights', 'crowd behind', 'dressed up', 'SA music event energy - Afropunk or Cotton Fest or standard live show'], 'night out, music event, crowd energy', ['event'], { subType: 'concert_venue', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    nightclub_joburg: socialLoc('nightclub_joburg', 'Joburg Nightclub', 'social_event', 'interior', 'Johannesburg', 'dark LED nightclub colour and practicals', ['Johannesburg nightclub interior', 'LED lighting', 'dark with color', 'dressed up', 'club energy', 'people dancing in background', 'Joburg nightlife - Konka or Marble Bar energy'], 'club night, dressed to the nines, night culture Joburg', ['event'], { subType: 'nightclub', bestLighting: ['blue_hour', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'] }),
    wedding_reception: socialLoc('wedding_reception', 'Wedding Reception', 'social_event', 'interior', 'South Africa', 'warm fairy lights and formal reception practicals', ['South African wedding reception', 'formal event', 'floral arrangements', 'fairy lights', 'dressed in wedding guest attire', 'beautiful and celebratory'], 'wedding guest, dressed up, celebration', ['event'], { subType: 'wedding_reception', bestLighting: ['indoor_artificial', 'blue_hour', 'late_afternoon'], suggestedDistance: ['three-quarter body', 'medium portrait', 'waist-up candid'] }),
    matric_farewell: socialLoc('matric_farewell', 'Matric Farewell / Formal', 'social_event', 'exterior', 'South Africa', 'formal pre-event garden or venue entrance light', ['South African matric farewell', 'formal gown or suit', 'outdoor pre-event photo', 'parents garden or venue entrance', 'milestone energy'], 'SA matric farewell, milestone, dressed beautifully', ['event'], { subType: 'matric_farewell', bestLighting: ['golden_pm', 'late_afternoon', 'blue_hour'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),
    afropunk_joburg: socialLoc('afropunk_joburg', 'Afropunk Johannesburg', 'social_event', 'exterior', 'Johannesburg', 'Jozi festival daylight and stage-colour spill', ['Afropunk Johannesburg festival', 'bold creative fashion', 'pan-African energy', 'festival crowd', 'Jozi summer heat', 'creative Black excellence'], 'festival mode, maximum creative expression, cultural pride', ['event'], { subType: 'festival', bestLighting: ['late_afternoon', 'golden_pm', 'blue_hour'], suggestedDistance: ['three-quarter body', 'full body environmental', 'waist-up candid'] }),

    or_tambo_international: socialLoc('or_tambo_international', 'OR Tambo International Airport', 'social_travel', 'interior', 'Johannesburg', 'airport terminal daylight and overhead practicals', ['OR Tambo International Airport Johannesburg', 'departures terminal', 'luggage', 'travel outfit', 'airport energy', 'about to go somewhere'], 'travel flex, holiday incoming, airport departure', ['vibes', 'selfie'], { subType: 'airport_departures', bestLighting: ['indoor_day', 'morning', 'indoor_artificial'], suggestedDistance: ['waist-up candid', 'three-quarter body', 'medium portrait'], props: ['small tote bag', 'phone in hand'] }),
    airport_lounge: socialLoc('airport_lounge', 'Airport Lounge', 'social_travel', 'interior', 'South Africa', 'soft lounge seating light with tarmac windows', ['premium airport lounge', 'soft seating', 'floor-to-ceiling windows onto tarmac', 'travel elevated', 'lounge access energy'], 'lounge access, premium travel, above economy', ['vibes', 'selfie'], { subType: 'airport_lounge', bestLighting: ['indoor_day', 'morning', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'], props: ['coffee cup', 'phone in hand'] }),
    holiday_villa_pool: socialLoc('holiday_villa_pool', 'Holiday Villa Pool', 'social_travel', 'exterior', 'South Africa', 'private villa pool daylight', ['private villa pool', 'holiday', 'sun lounger or pool edge', 'South African luxury holiday destination - Franschhoek or Hermanus or Zanzibar'], 'holiday mode, pool, villa, deserved luxury', ['vibes', 'selfie'], { subType: 'villa_pool', bestLighting: ['morning', 'golden_pm', 'late_afternoon'], suggestedDistance: ['full body environmental', 'three-quarter body', 'medium portrait'] }),

    morning_bed: socialLoc('morning_bed', 'Morning - Still In Bed', 'social_home', 'interior', 'South Africa', 'soft morning window light through curtains', ['morning', 'bed', 'natural window light coming through curtains', 'fresh faced', 'linen', 'bedroom environment', 'pre-day energy'], 'morning post, real, fresh, GRWM opening', ['selfie', 'mirror', 'vibes'], { subType: 'bedroom_morning', bestLighting: ['morning', 'golden_am', 'indoor_day'], suggestedDistance: ['tight portrait', 'waist-up candid', 'medium portrait'] }),
    dressing_table_vanity: socialLoc('dressing_table_vanity', 'Dressing Table - Getting Ready', 'social_home', 'interior', 'South Africa', 'ring light or soft window vanity light', ['dressing table with mirror', 'makeup products', 'ring light or window light', 'getting ready energy', 'personal space'], 'GRWM, getting ready, self-care morning', ['selfie', 'mirror', 'vibes'], { subType: 'dressing_table', bestLighting: ['morning', 'indoor_day', 'indoor_artificial'], suggestedDistance: ['tight portrait', 'waist-up candid', 'medium portrait'], props: ['phone in hand'] }),
    apartment_kitchen: socialLoc('apartment_kitchen', 'Home Kitchen - Modern Joburg Flat', 'social_home', 'interior', 'Johannesburg', 'modern apartment morning kitchen light', ['modern Johannesburg apartment kitchen', 'kitchen island', 'marble or concrete counters', 'morning light', 'living the SA millennial life'], 'home life, cooking, real living space', ['selfie', 'mirror', 'vibes'], { subType: 'apartment_kitchen', bestLighting: ['morning', 'indoor_day', 'late_afternoon'], suggestedDistance: ['waist-up candid', 'medium portrait', 'three-quarter body'] })
  });

  function locationEntries(){
    return Object.keys(LOCATION_REGISTRY)
      .map(function(key){ return LOCATION_REGISTRY[key]; })
      .filter(function(entry){ return entry && !entry.aliasOf; })
      .map(normalizeLocationEntry)
      .sort(function(a, b){
        if (a.categoryCode !== b.categoryCode) return a.categoryCode.localeCompare(b.categoryCode);
        return a.name.localeCompare(b.name);
      });
  }

  function locationOptionsHtml(){
    return shotModeLocationEntries(currentShotMode()).map(function(entry){
      return '<option value="' + esc(entry.id) + '" data-category="' + esc(entry.categoryId || '') + '">' + esc(entry.name) + '</option>';
    }).join('');
  }

  function isCustomLocationId(value){
    return /^custom_location_/.test(String(value || ''));
  }

  function slugifyLocation(value){
    var slug = String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 54);
    return slug || 'manual';
  }

  function titleCase(value){
    return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, function(ch){ return ch.toUpperCase(); });
  }

  function defaultLocationLighting(entry){
    var text = [entry.lightQuality, entry.name, entry.subType].join(' ').toLowerCase();
    if (/blue hour|neon|night|club|rain|evening|dusk/.test(text)) return ['blue_hour', 'golden_pm', 'indoor_artificial'];
    if (/dawn|morning/.test(text)) return ['golden_am', 'morning', 'late_afternoon'];
    if (entry.environment === 'studio' || /studio|void|cove|cyclorama|gel/.test(text)) return ['indoor_artificial', 'indoor_day'];
    if (entry.environment === 'interior') return ['indoor_day', 'morning', 'late_afternoon'];
    if (entry.environment === 'conceptual') return ['indoor_artificial', 'blue_hour', 'golden_pm'];
    return ['golden_pm', 'late_afternoon', 'morning'];
  }

  function defaultLocationDistance(entry){
    var depth = String(entry.depthCharacter || '').toLowerCase();
    if (/deep|skyline|horizon|mountain|landscape|infinite|warehouse|atrium|rooftop|full/.test(depth)) return ['full body environmental', 'three-quarter body', 'medium portrait'];
    if (/shallow|compressed|portrait|void|corridor/.test(depth)) return ['medium portrait', 'waist-up candid', 'tight portrait'];
    if (entry.environment === 'interior') return ['medium portrait', 'waist-up candid', 'three-quarter body'];
    return ['three-quarter body', 'medium portrait', 'full body environmental'];
  }

  function normalizeLocationEntry(entry){
    entry = entry || {};
    var bestLighting = normalizeList(entry.bestLighting || entry.light?.bestTimes || defaultLocationLighting(entry));
    var avoidLighting = normalizeList(entry.avoidLighting || entry.light?.avoid || []);
    var suggestedDistance = normalizeList(entry.suggestedDistance || entry.depth?.suggestedDistance || defaultLocationDistance(entry));
    var avoidDistance = normalizeList(entry.avoidDistance || entry.depth?.avoid || []);
    var bestMoods = normalizeList(entry.bestMoods || entry.moodNatural || entry.mood?.natural || ['composed', 'sharp']);
    var avoidMoods = normalizeList(entry.avoidMoods || entry.mood?.avoid || []);
    var modeAffinity = normalizeList(entry.modeAffinity);
    var normalized = Object.assign({}, entry, {
      category: entry.category || locationCategory(entry.categoryId || 'johannesburg').label,
      categoryId: entry.categoryId || 'johannesburg',
      categoryCode: entry.categoryCode || locationCategory(entry.categoryId || 'johannesburg').code,
      region: entry.region || 'Johannesburg',
      environment: entry.environment || 'exterior',
      lightQuality: entry.lightQuality || entry.light?.characteristicQuality || 'available light',
      depthCharacter: entry.depthCharacter || entry.depth?.reason || 'Flexible depth',
      moodNatural: bestMoods,
      promptModifiers: normalizeList(entry.promptModifiers),
      bestLighting: bestLighting,
      avoidLighting: avoidLighting,
      suggestedDistance: suggestedDistance,
      avoidDistance: avoidDistance,
      bestMoods: bestMoods,
      avoidMoods: avoidMoods,
      props: normalizeList(entry.props),
      actionAffinity: normalizeList(entry.actionAffinity),
      modeAffinity: modeAffinity,
      vibe: entry.vibe || '',
      socialMediaLocation: Boolean(entry.socialMediaLocation || modeAffinity.length)
    });
    normalized.light = Object.assign({}, entry.light || {}, {
      bestTimes: bestLighting,
      avoid: avoidLighting,
      characteristicQuality: normalized.lightQuality
    });
    normalized.depth = Object.assign({}, entry.depth || {}, {
      suggestedDistance: suggestedDistance,
      avoid: avoidDistance,
      reason: normalized.depthCharacter
    });
    normalized.mood = Object.assign({}, entry.mood || {}, {
      natural: bestMoods,
      avoid: avoidMoods,
      reason: (entry.mood && entry.mood.reason) || normalized.moodNatural.join(', ')
    });
    return normalized;
  }

  function isSocialMediaLocation(loc){
    loc = loc || {};
    return Boolean(loc.socialMediaLocation || normalizeList(loc.modeAffinity).some(function(mode){
      return ['selfie', 'mirror', 'vibes', 'candid', 'event'].indexOf(mode) >= 0;
    }));
  }

  function socialLocationNegativeModifiers(){
    return [
      'studio photograph',
      'professional editorial',
      'posed fashion shoot',
      'stock photo',
      'advertising photography',
      'commercial product shot',
      'overly lit',
      'professional backdrop'
    ];
  }

  function socialShotModePromptVoice(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'editorial') {
      return 'Realistic social source photograph, authentic lived-in social media moment, not a professional editorial shoot. Natural camera feel, believable environment, casual source-photo energy.';
    }
    return shotModePromptVoice(mode);
  }

  function getShotModeVoice(mode){
    mode = normalizeShotMode(mode || (window.SS_GENERATOR_STATE && window.SS_GENERATOR_STATE.shotMode) || currentShotMode());
    var voices = {
      selfie: {
        id: 'selfie',
        promptPrefix: 'Smartphone selfie photograph',
        structure: 'Smartphone selfie photograph, character identity line, action or pose, location prompt modifiers, natural phone-camera lighting, outfit, authentic candid moment, shot on iPhone or Samsung Galaxy, real person not a model, documentary social media photography.',
        negativeAdditions: [
          'professional photography',
          'studio lighting',
          'editorial fashion shoot',
          'DSLR quality',
          'depth of field blur',
          'professional photographer',
          'posed advertising content',
          'artificial studio light',
          'stock photo look',
          'obviously AI generated',
          'uncanny valley',
          'too perfect',
          'overly polished'
        ],
        anatomyLabels: { camera: 'POSE', mood: 'ENERGY' }
      },
      mirror: {
        id: 'mirror',
        promptPrefix: 'Mirror selfie photograph',
        structure: 'Mirror selfie photograph, phone visible in reflection, character identity line, mirror type and location, mirror selfie pose, full outfit visible in mirror reflection, room environment, ambient light quality, authentic social media mirror selfie.',
        negativeAdditions: [
          'professional editorial',
          'no phone visible',
          'direct camera shot',
          'not a mirror reflection',
          'studio setup',
          'overly posed',
          'fashion shoot',
          'professional lighting rig'
        ],
        anatomyLabels: { camera: 'POSE', mood: 'ENERGY' }
      },
      candid: {
        id: 'candid',
        promptPrefix: 'Candid photograph',
        structure: 'Candid photograph, friend or bystander took this photo, character identity line, candid action, full real environment, natural environment light, outfit, completely unposed moment, documentary photography, authentic South African life.',
        negativeAdditions: [
          'posed',
          'looking directly at camera with model expression',
          'editorial fashion',
          'studio',
          'professional shoot',
          'advertising',
          'stock photo',
          'perfect lighting',
          'too composed',
          'AI perfect face'
        ],
        anatomyLabels: { camera: 'POSE', mood: 'ENERGY' }
      },
      vibes: {
        id: 'vibes',
        promptPrefix: 'Lifestyle photography',
        structure: 'Lifestyle photography, character identity line, vibes action, South African location with cultural context, time of day and lighting, outfit, golden ratio composition, social media lifestyle photography, editorial Instagram aesthetic, real person in real environment.',
        negativeAdditions: [
          'overly posed',
          'studio',
          'advertising',
          'commercial shoot',
          'stock photography',
          'generic background',
          'not South African'
        ],
        anatomyLabels: { camera: 'POSE', mood: 'ENERGY' }
      },
      event: {
        id: 'event',
        promptPrefix: 'Event photography',
        structure: 'Event photography, character identity line, event action, venue with energy description, venue lights or dance floor lights, evening or event outfit, real night out in South Africa, flash or available venue light, authentic social nightlife photography.',
        negativeAdditions: [
          'daytime',
          'casual setting',
          'outdoor natural light only',
          'studio',
          'editorial',
          'grey background',
          'professional shoot'
        ],
        anatomyLabels: { camera: 'POSE', mood: 'ENERGY' }
      },
      editorial: {
        id: 'editorial',
        promptPrefix: shotModePromptVoice('editorial'),
        structure: 'Ultra-realistic professional photograph with controlled identity, wardrobe, scene, camera, lighting, platform composition, and production-quality editorial realism.',
        negativeAdditions: [],
        anatomyLabels: { camera: 'CAMERA', mood: 'MOOD + ENERGY' }
      }
    };
    return voices[mode] || voices.editorial;
  }

  function compileShotModePromptSegments(context){
    context = context || {};
    var voice = context.voice || getShotModeVoice(context.shotMode);
    var mode = voice.id || normalizeShotMode(context.shotMode || currentShotMode());
    var scenePack = context.scenePack || {};
    var loc = context.loc || {};
    var wardrobePack = context.wardrobePack || {};
    var identityLine = context.jobType === 'final_character'
      ? [context.characterName || context.char || 'Character', context.identityLock].filter(Boolean).join(', ')
      : (context.outputUse || 'final photograph');
    var locationLine = [
      context.cinematicScenePrefix ? String(context.cinematicScenePrefix).replace(/\s+$/g, '') : '',
      loc.prompt || loc.name || scenePack.location || optionText('g-location') || 'selected location',
      promptTextList(context.locationModifiers || [])
    ].filter(Boolean).join('. ');
    var authenticityPack = scenePack.authenticityPack || authenticityPackFromControls(mode);
    locationLine = stripAuthenticityContradictions(locationLine, authenticityPack);
    var lightingLine = scenePack.lightingPromptPhrase || context.timeDesc || scenePack.lighting || lightingPromptPhrase(scenePack.lightingId || $('g-time')?.value) || optionText('g-time') || 'natural light';
    var finishLine = mode === 'editorial' ? '' : (scenePack.socialFinishTreatment?.promptAddition || socialFinishTreatmentPromptLine(mode));
    var authenticityLine = mode === 'editorial' ? '' : promptTextList(authenticityPromptLines(authenticityPack));
    var outfitLine = wardrobePack.prompt || wardrobePack.override || '';
    var eventVenueLine = [loc.name || scenePack.location, loc.vibe || loc.saContext || loc.lightQuality].filter(Boolean).join(' - ');
    eventVenueLine = stripAuthenticityContradictions(eventVenueLine, authenticityPack);
    var modeLine;

    if (mode === 'selfie') {
      modeLine = [
        voice.promptPrefix,
        identityLine,
        scenePack.action,
        locationLine,
        lightingLine + ' - natural phone camera language',
        outfitLine,
        'natural real light',
        'phone camera quality aesthetic',
        'authentic candid moment',
        authenticityLine,
        'shot on iPhone or Samsung Galaxy',
        'real person not a model',
        'documentary social media photography'
      ].filter(Boolean).join(', ') + '.';
    } else if (mode === 'mirror') {
      modeLine = [
        voice.promptPrefix,
        'phone visible in reflection',
        identityLine,
        loc.name || scenePack.location || 'mirror location',
        scenePack.action,
        outfitLine ? outfitLine + ' - full body visible in mirror reflection' : 'full body visible in mirror reflection',
        locationLine,
        lightingLine,
        'authentic real moment',
        'social media mirror selfie',
        authenticityLine,
        'shot on smartphone',
        'reflection shows phone being held',
        'real background environment visible in mirror',
        'phone held by subject is visible in the mirror reflection',
        'mirror reflection photograph not direct photography',
        'realistic mirror reflection with slight reflection quality'
      ].filter(Boolean).join(', ') + '.';
    } else if (mode === 'candid') {
      modeLine = [
        voice.promptPrefix,
        'friend or bystander took this photo',
        identityLine,
        scenePack.action,
        locationLine,
        lightingLine + ' - natural environment light',
        outfitLine,
        'completely unposed moment',
        'subject not performing for camera',
        'documentary photography',
        authenticityLine,
        'real life captured',
        'not a shoot',
        'natural expressions',
        'authentic South African life'
      ].filter(Boolean).join(', ') + '.';
    } else if (mode === 'vibes') {
      modeLine = [
        voice.promptPrefix,
        identityLine,
        scenePack.action,
        locationLine,
        lightingLine,
        outfitLine,
        authenticityPack?.values?.notTooPolished ? 'loose real-life composition' : 'golden ratio composition',
        'social media lifestyle photography',
        authenticityLine,
        'editorial Instagram aesthetic',
        'real person in real environment',
        'not a professional shoot but looks amazing anyway',
        'South African lifestyle content',
        'authentic cultural moment'
      ].filter(Boolean).join(', ') + '.';
    } else if (mode === 'event') {
      modeLine = [
        voice.promptPrefix,
        identityLine,
        scenePack.action,
        eventVenueLine || locationLine,
        lightingLine + ' - event lighting, venue lights, dance floor lights or available flash',
        outfitLine ? outfitLine + ' - evening/event wear' : 'evening/event wear',
        'real night out in South Africa',
        'event photography aesthetic',
        authenticityLine,
        'flash or available venue light',
        'dressed for the occasion',
        'authentic social nightlife photography'
      ].filter(Boolean).join(', ') + '.';
    } else {
      modeLine = context.activeShotModePromptVoice || voice.promptPrefix || shotModePromptVoice('editorial');
    }

    return [
      modeLine,
      'Generate one finished raw camera photograph. Do not make a mockup, rough concept, layout, poster, social post, screenshot, frame, or design.',
      context.refCount ? 'Reference authority: the supplied primary face/body refs win over every written descriptor. Match the exact person from the refs.' : 'Reference authority: no image refs attached; use written subject constraints only.',
      context.referenceInfluenceLine,
      stripAuthenticityContradictions(context.socialRealismLine, authenticityPack),
      context.wardrobeImageRefs && context.wardrobeImageRefs.length ? 'Wardrobe authority: use the supplied WARDROBE REFERENCE images for clothing, silhouette, palette, fabric, and accessories where visible.' : '',
      context.characterProfileLine,
      'Job type: ' + (context.outputUse || 'final photograph') + '.',
      context.jobType === 'final_character' ? ('Subject: ' + (context.characterName || context.char || 'Character') + '. Written identity support only: ' + (context.identityLock || 'current character identity') + '.') : ('Subject: ' + (context.outputUse || 'final photograph') + '.'),
      context.neverChange ? ('Never change for this character: ' + context.neverChange + '.') : '',
      mode === 'editorial' ? ('Scene: ' + (context.cinematicScenePrefix || '') + (loc.prompt || loc.name || 'selected location') + '.') : '',
      stripAuthenticityContradictions(context.locationIntelLine, authenticityPack),
      context.locationReferenceText ? 'Visible location reference notes: ' + String(context.locationReferenceText).replace(/\s*\n+\s*/g, ' ') + '.' : '',
      context.cinematicLine,
      context.aestheticPromptLine,
      'Action: ' + (scenePack.action || 'natural pose') + '. Movement: ' + (scenePack.movement || 'natural movement') + (scenePack.props ? '. Props: ' + scenePack.props : '') + '.',
      scenePack.sceneOverride ? 'Scene override: ' + scenePack.sceneOverride : '',
      'Shot: ' + (context.presetDesc || 'source photo') + ' / ' + (context.postTypeText || optionText('g-posttype') || 'portrait') + ' / ' + (scenePack.cameraDistance || 'natural frame') + '.',
      'Expression and mood: ' + (scenePack.mood || context.moodDesc || 'natural expression') + (finishLine ? '. Finish / treatment: ' + finishLine : '') + (authenticityLine ? '. Authenticity: ' + authenticityLine : '') + '.',
      'Camera and composition: ' + (context.cameraDesc || 'camera-real composition') + ', ' + (scenePack.lens || optionText('g-lens') || 'natural lens') + '.' + (context.cinematicTreatmentLine || ''),
      stripAuthenticityContradictions(context.platformCompositionLine, authenticityPack),
      'Lighting: ' + (scenePack.lightingPromptPhrase || scenePack.lighting || context.timeDesc || 'natural light') + '.',
      'Realism: ' + (context.realismDesc || 'clean realism') + (context.saTexture ? '. ' + context.saTexture : '') + '.',
      'Regional visual intelligence: ' + (context.saRegionLine || SA_VISUAL_INTELLIGENCE.lightQuality.promptModifier) + '.',
      'Wardrobe: ' + (wardrobePack.prompt || 'current wardrobe') + (context.wardrobeImageRefs && context.wardrobeImageRefs.length ? '. Visual wardrobe refs are authoritative for clothing details.' : '') + '.',
      'Forbidden pixels: no Instagram UI, username, caption text, white border, post frame, phone screenshot, poster, graphic design, watermark, or any readable text.',
      'Aspect ratio: ' + (context.aspect || getCurrentImageAspectRatio()) + '.',
      'Return the clean source photo only.'
    ].filter(Boolean);
  }

  var CHARACTER_SHOOT_PROFILES = {
    aisha: {
      id: 'aisha',
      name: 'Aisha Motsepe',
      title: 'Chief Creative Officer',
      energy: 'commanding_presence',
      defaultPosture: 'direct, grounded, not posed',
      strengthAngles: ['direct gaze, relaxed posture', 'turning slightly toward camera after movement', 'seated with hands visible and expression controlled'],
      weakAngles: ['profile only', 'looking down submissive'],
      naturalEnvironments: ['rooftop_jhb', 'sandton_lobby', 'studio_desk', 'street_jhb'],
      lightingAffinity: { excellent: ['golden_pm', 'midday', 'indoor_day'], good: ['golden_am', 'blue_hour'], avoid: ['indoor_artificial'], skinNote: 'Rich warm brown skin needs directional light and visible texture; avoid flat beauty light.' },
      wardrobeAffinity: { naturalStyles: ['structured_tailoring', 'luxury_minimalism', 'bold_monochrome'], avoidStyles: ['overly_casual', 'busy_prints'] },
      alwaysInclude: ['SA texture and heat realism', 'warm rich brown skin with natural texture', 'clean natural finish, not beauty-filter smoothed'],
      neverInclude: ['generic AI face', 'lightened or smoothed skin', 'beauty filter drift']
    },
    leah: {
      id: 'leah',
      name: 'Leah Mokoena',
      title: 'Content Intelligence & Trend Analyst',
      energy: 'observant_city_intelligence',
      defaultPosture: 'relaxed, exact, street-real',
      strengthAngles: ['direct gaze, relaxed posture', 'quiet pause before speaking, eyes present', 'leaning near the environment, aware but not posed'],
      weakAngles: ['overly posed influencer smile'],
      naturalEnvironments: ['cafe_braam', 'maboneng', '44stanley', 'victoria_yards', 'gautrain'],
      lightingAffinity: { excellent: ['golden_am', 'late_afternoon', 'indoor_day'], good: ['morning', 'golden_pm'], avoid: ['indoor_artificial'], skinNote: 'Deep brown skin reads best with warm side light, cafe window spill, and no smoothing.' },
      wardrobeAffinity: { naturalStyles: ['tonal_black', 'street_real_layers', 'clean_denim'], avoidStyles: ['fake_luxury', 'overly_corporate'] },
      alwaysInclude: ['deep brown skin with natural texture', 'street-real Johannesburg intelligence', 'not influencer-glam'],
      neverInclude: ['generic stock smile', 'cheap glam styling', 'skin lightening']
    },
    claudia: {
      id: 'claudia',
      name: 'Claudia Naidoo',
      title: 'Operations Lead',
      energy: 'polished_operational_calm',
      defaultPosture: 'composed, exacting, warm but controlled',
      strengthAngles: ['direct gaze, relaxed posture', 'seated with hands visible and expression controlled', 'quiet pause before speaking, eyes present'],
      weakAngles: ['messy casual performance'],
      naturalEnvironments: ['sandton_lobby', 'cafe_rosebank', 'keyes', 'parkhurst', 'studio_desk'],
      lightingAffinity: { excellent: ['morning', 'indoor_day', 'golden_pm'], good: ['late_afternoon'], avoid: ['blue_hour'], skinNote: 'Warm medium-brown skin and sleek hair benefit from clean side light and controlled highlights.' },
      wardrobeAffinity: { naturalStyles: ['quiet_luxury', 'tailored_neutrals', 'premium_minimal'], avoidStyles: ['messy_layers'] },
      alwaysInclude: ['warm medium-brown skin with luminous natural texture', 'polished operational authority', 'premium restraint'],
      neverInclude: ['cold corporate stock look', 'over-retouched skin', 'messy styling']
    },
    grok: {
      id: 'grok',
      name: 'Grok / Gerhard',
      title: 'Systems Brain',
      energy: 'dry_focused_builder',
      defaultPosture: 'functional, understated, exact',
      strengthAngles: ['seated with hands visible and expression controlled', 'quiet pause before speaking, eyes present', 'mid-step through the scene, face still clear'],
      weakAngles: ['fashion spectacle'],
      naturalEnvironments: ['pretoria', 'studio_desk', 'gautrain', 'airport'],
      lightingAffinity: { excellent: ['indoor_day', 'late_afternoon', 'blue_hour'], good: ['morning'], avoid: ['golden_pm'], skinNote: 'Keep light functional and human, not fashion-lit.' },
      wardrobeAffinity: { naturalStyles: ['technical_minimal', 'dark_layers'], avoidStyles: ['bright_fashion'] },
      alwaysInclude: ['functional Pretoria/JHB realism', 'understated technical presence'],
      neverInclude: ['fashion spectacle', 'over-styled editorial glam']
    },
    vanya: {
      id: 'vanya',
      name: 'Vanya Khumalo',
      title: 'People & Culture Lead',
      energy: 'young_premium_authority',
      defaultPosture: 'soft but strict, stylish, composed',
      strengthAngles: ['direct gaze, relaxed posture', 'turning slightly toward camera after movement', 'leaning near the environment, aware but not posed'],
      weakAngles: ['generic HR stock smile'],
      naturalEnvironments: ['studio_desk', 'cafe_rosebank', 'keyes', 'sandton_lobby'],
      lightingAffinity: { excellent: ['indoor_day', 'golden_pm', 'late_afternoon'], good: ['morning'], avoid: ['midday'], skinNote: 'Warm brown skin and short hair need clean directional light and real texture.' },
      wardrobeAffinity: { naturalStyles: ['black_fitted', 'small_gold_details', 'clean_layers'], avoidStyles: ['corporate_bland'] },
      alwaysInclude: ['youthful premium authority', 'warm brown skin with natural texture', 'people-ops edge without stock HR energy'],
      neverInclude: ['generic HR seminar', 'fake office smile', 'over-retouched skin']
    }
  };

  var CHARACTER_CLOSET_SEEDS = {
    aisha: [
      { id: 'signature_control', name: 'Signature Control', category: 'work', palette: 'black, bone, warm gold', garments: ['structured black blazer', 'clean wide-leg trousers', 'quiet gold jewelry'], fit: 'tailored but not stiff', vibe: 'creative authority', avoid: ['loud logos', 'cheap corporate styling'] },
      { id: 'studio_sharp', name: 'Studio Sharp', category: 'studio', palette: 'charcoal, white, silver', garments: ['crisp oversized shirt', 'dark tailored pants', 'minimal earrings'], fit: 'clean architectural lines', vibe: 'taste director' },
      { id: 'soft_power', name: 'Soft Power', category: 'personal', palette: 'cream, graphite, soft brown', garments: ['fine-knit top', 'long coat', 'simple leather shoes'], fit: 'soft but controlled', vibe: 'calm premium' }
    ],
    leah: [
      { id: 'trend_analyst_black', name: 'Trend Analyst Black', category: 'work', palette: 'tonal black, grey, silver', garments: ['slightly oversized black tee', 'soft black trousers', 'clean sneakers'], fit: 'relaxed but intentional', vibe: 'current, observant, not overdone', avoid: ['flashy luxury', 'stale influencer styling'] },
      { id: 'braam_cafe_layer', name: 'Braam Cafe Layer', category: 'city', palette: 'black, washed denim, muted cream', garments: ['cropped jacket', 'dark jeans', 'simple chain'], fit: 'street-real and grounded', vibe: 'city intelligence' },
      { id: 'soweto_weekend', name: 'Soweto Weekend', category: 'personal', palette: 'warm neutrals, charcoal, gold', garments: ['ribbed knit top', 'wide-leg pants', 'light jacket'], fit: 'comfortable with edge', vibe: 'local and alive' }
    ],
    claudia: [
      { id: 'sandton_quiet_luxury', name: 'Sandton Quiet Luxury', category: 'work', palette: 'taupe, ivory, espresso', garments: ['soft tailored blouse', 'high-waist trousers', 'delicate watch'], fit: 'polished and precise', vibe: 'client-ready calm', avoid: ['messy layers', 'loud trend pieces'] },
      { id: 'operations_silk', name: 'Operations Silk', category: 'premium', palette: 'cream, black, muted gold', garments: ['silk shirt', 'clean cigarette pants', 'low heel'], fit: 'elegant restraint', vibe: 'premium process' },
      { id: 'balcony_neutral', name: 'Balcony Neutral', category: 'personal', palette: 'soft beige, white, pale wood', garments: ['fine cardigan', 'straight-leg trousers', 'minimal jewelry'], fit: 'comfortable luxury', vibe: 'controlled warmth' }
    ],
    grok: [
      { id: 'technical_minimal', name: 'Technical Minimal', category: 'work', palette: 'black, grey, olive', garments: ['plain dark overshirt', 'black tee', 'straight utility pants'], fit: 'functional and understated', vibe: 'quiet systems brain', avoid: ['fashion spectacle', 'bright colors'] },
      { id: 'menlyn_night_shift', name: 'Menlyn Night Shift', category: 'technical', palette: 'charcoal, muted green, dark denim', garments: ['zip jacket', 'dark denim', 'plain sneakers'], fit: 'compact and practical', vibe: 'late build energy' },
      { id: 'coffee_debug', name: 'Coffee Debug', category: 'personal', palette: 'washed black, grey, white', garments: ['hoodie under clean jacket', 'simple tee', 'work bag'], fit: 'low-effort but neat', vibe: 'dry and focused' }
    ],
    vanya: [
      { id: 'people_ops_black', name: 'People Ops Black', category: 'work', palette: 'black, chrome, tiny gold', garments: ['fitted black top', 'tailored black layers', 'tiny gold jewelry', 'glasses optional'], fit: 'sharp, slim, controlled', vibe: 'young premium authority', avoid: ['corporate blandness', 'cheap clubwear'] },
      { id: 'rosebank_afterhours', name: 'Rosebank Afterhours', category: 'city', palette: 'black, soft pink, chrome', garments: ['sleek cropped jacket', 'black skirt or trousers', 'small shoulder bag'], fit: 'image-aware but real', vibe: 'night-city confidence' },
      { id: 'culture_daylight', name: 'Culture Daylight', category: 'personal', palette: 'white, denim, black accents', garments: ['clean white tee', 'dark denim', 'light jacket', 'simple necklace'], fit: 'relaxed but styled', vibe: 'human, warm, still exact' }
    ]
  };

  function $(id){ return document.getElementById(id); }
  function claimSurface(meta){
    try {
      if (window.SilvaSurfaceOwners) {
        window.SilvaSurfaceOwners.claim('generator', OWNER_ID, meta || {});
      }
    } catch (_) {}
  }
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }
  function list(items, count){
    return (Array.isArray(items) ? items : []).filter(Boolean).slice(0, count || 3).join(', ');
  }
  function number(value, fallback){
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function getCharSafe(id){
    return (typeof window.getChar === 'function' ? window.getChar(id) : null) || {};
  }
  function modelById(id){
    var canonical = id === 'prunaai/p-image-edit' ? 'fal/qwen-image-2-edit' : (id === 'google/imagen-4' ? 'google/imagen-3-text-only' : id);
    var found = state.models.find(function(model){ return model.id === canonical; });
    return found || state.models[0] || MODEL_FALLBACKS[0];
  }
  function zarCost(model){
    if (!model) return 'R-';
    var hasZar = model.costEstimateZar !== null && model.costEstimateZar !== undefined && model.costEstimateZar !== '';
    var zar = hasZar ? Number(model.costEstimateZar) : NaN;
    var approximate = Boolean(model.costEstimateZarApproximate);
    if (!Number.isFinite(zar) && Number.isFinite(Number(model.costEstimateUsd))) {
      zar = Number((Number(model.costEstimateUsd) * DEFAULT_ZAR_RATE).toFixed(2));
      approximate = true;
    }
    return Number.isFinite(zar) ? ('R' + zar.toFixed(2) + (approximate ? ' approx' : '')) : 'R-';
  }
  function parseCostDisplay(cost){
    var label = String(cost || 'R-').replace(/\s+/g, ' ').trim() || 'R-';
    var approximate = /\bapprox\b/i.test(label);
    var amount = label.replace(/\bapprox\b/i, '').trim() || 'R-';
    var currency = amount.charAt(0) === 'R' ? 'R' : '';
    var value = currency ? amount.slice(1) : amount;
    return {
      label: label,
      currency: currency || 'R',
      value: value || '-',
      approximate: approximate
    };
  }
  function costDisplayHtml(cost){
    var parsed = parseCostDisplay(cost);
    return [
      '<span class="pg52-cost-display" aria-label="' + esc(parsed.label) + '">',
        '<span class="pg52-cost-currency">' + esc(parsed.currency) + '</span>',
        '<span class="pg52-cost-value">' + esc(parsed.value) + '</span>',
        '<span class="pg52-cost-approx">' + esc(parsed.approximate ? 'approx' : 'estimate') + '</span>',
      '</span>'
    ].join('');
  }
  function setCostDisplay(element, cost){
    if (!element) return;
    var label = String(cost || 'R-').replace(/\s+/g, ' ').trim() || 'R-';
    var previous = element.getAttribute('data-pg52-cost-value') || '';
    element.setAttribute('data-pg52-cost-value', label);
    element.innerHTML = costDisplayHtml(label);
    if (previous && previous !== label) restartTransientClass(element, 'is-cost-changing');
  }
  function usdCost(model){
    return Number.isFinite(Number(model && model.costEstimateUsd)) ? ('$' + Number(model.costEstimateUsd).toFixed(3)) : '$-';
  }
  function providerChip(model){
    if (!model) return 'Image router';
    if (model.providerAdapter === 'google') return 'Google Vertex AI';
    if (model.providerAdapter === 'fal') return 'fal.ai';
    return model.providerAdapter || 'router';
  }
  function shortProviderChip(model){
    if (!model) return 'router';
    if (model.providerAdapter === 'google') return 'Google';
    if (model.providerAdapter === 'fal') return 'fal.ai';
    return model.providerAdapter || 'router';
  }
  function spendLaneForModel(modelOrId){
    var model = typeof modelOrId === 'string' ? modelById(modelOrId) : modelOrId;
    return model && model.providerAdapter === 'fal' ? 'fal_full_ai' : 'google_credits';
  }
  function getCurrentImageSpendLane(){
    return $('g-spend-lane')?.value || 'auto_best';
  }
  function spendLaneLabel(value){
    var lane = String(value || getCurrentImageSpendLane());
    if (lane === 'fal_full_ai') return 'Using fal.ai final-image billing';
    if (lane === 'auto_best') return 'Auto Best: Google direct refs first, fal.ai only when chosen';
    return 'Using Google Cloud credits with direct reference images';
  }
  function spendLaneShort(value){
    var lane = String(value || getCurrentImageSpendLane());
    if (lane === 'fal_full_ai') return 'fal.ai direct refs';
    if (lane === 'auto_best') return 'Best final';
    return 'Google credits';
  }
  function referenceStrategyLabel(strategy){
    if (strategy === 'google_direct_reference_images') return 'Google direct-reference generation: actual reference images are sent into Nano Banana / Vertex Gemini Image.';
    if (strategy === 'vertex_vision_to_imagen_prompt') return 'Legacy Imagen text-only fallback: references become text notes and can drift. Use Nano Banana Pro instead.';
    if (strategy === 'direct_reference_images') return 'Direct reference-image generation: references are sent into the selected model.';
    return 'Final text-to-image generation';
  }
  function backendModelNote(model){
    if (!model) return '';
    if (model.id === 'google/nano-banana-2') return 'Runs on Vertex Gemini 2.5 Flash Image';
    if (model.id === 'google/nano-banana-pro') return 'Runs on Vertex Gemini 3 Pro Image Preview';
    if (model.id === 'google/imagen-3-text-only' || model.id === 'google/imagen-4') return 'Legacy no-reference Imagen 3 text-to-image';
    if (model.providerAdapter === 'fal') return 'Runs through fal.ai';
    return model.model ? ('Backend: ' + model.model) : '';
  }
  function bestUseLine(model){
    return list(model && model.bestFor, 1) || list(model && model.routingRoles, 1) || 'image route';
  }
  function modelOptionLabel(model){
    return [
      model.displayName,
      shortProviderChip(model),
      zarCost(model),
      readinessLabel(model)
    ].filter(Boolean).join(' - ');
  }
  function providerStore(){
    return window.SilvaProviderReadiness || null;
  }
  function providerReadyHintForModel(model){
    if (!model) return null;
    try {
      var hints = JSON.parse(localStorage.getItem('silva_provider_readiness_hint_v1') || '{}') || {};
      var hint = hints[model.providerAdapter] || hints[model.provider] || null;
      if (!hint || !hint.configured) return null;
      var ts = Date.parse(hint.updatedAt || '');
      if (Number.isFinite(ts) && Date.now() - ts > 300000) return null;
      return {
        configured: true,
        status: 'ready',
        source: hint.source || 'vault',
        maskedValue: hint.maskedValue || '',
        providerId: model.providerAdapter || '',
        updatedAt: hint.updatedAt || '',
        lastCheckedAt: hint.updatedAt || '',
        readinessHinted: true
      };
    } catch (_) {
      return null;
    }
  }
  function applyProviderStatus(status){
    if (!status || status.ok === false) return state.providerStatus;
    state.providerStatus = status;
    state.providerStatusLastCheckedAt = status.lastCheckedAt || new Date().toISOString();
    return state.providerStatus;
  }
  function mergeRouteReadiness(payload){
    var store = providerStore();
    if (store && typeof store.mergeModelReadiness === 'function') {
      state.modelReadinessById = store.mergeModelReadiness(payload) || {};
      return state.modelReadinessById;
    }
    var models = [];
    if (payload?.selectedModel) models.push(payload.selectedModel);
    if (Array.isArray(payload?.alternatives)) models = models.concat(payload.alternatives);
    if (Array.isArray(payload?.items)) models = models.concat(payload.items);
    models.forEach(function(model){
      if (model?.id && model.providerReadiness) state.modelReadinessById[model.id] = model.providerReadiness;
    });
    return state.modelReadinessById;
  }
  function readinessForModel(model){
    if (!model) return { configured: false, status: 'missing key', source: 'missing' };
    var store = providerStore();
    var readyHint = providerReadyHintForModel(model);
    if (store && typeof store.readinessForModel === 'function' && store.hasStatus && store.hasStatus()) {
      var storeReadiness = store.readinessForModel(model);
      var routeReadiness = state.modelReadinessById[model.id] || model.providerReadiness || null;
      if (readyHint && (!storeReadiness || !storeReadiness.configured)) return readyHint;
      if (routeReadiness && routeReadiness.configured && (!storeReadiness || !storeReadiness.configured)) return routeReadiness;
      return storeReadiness;
    }
    var provider = (state.providerStatus?.providers || []).find(function(item){
      return item.providerAdapter === model.providerAdapter;
    });
    var mapped = state.modelReadinessById[model.id] || model.providerReadiness || null;
    if (readyHint && (!provider || !provider.configured)) return readyHint;
    if (mapped && mapped.configured && (!provider || !provider.configured)) return mapped;
    if (provider) {
      return {
        configured: Boolean(provider.configured),
        status: provider.status || (provider.configured ? 'ready' : 'missing key'),
        source: provider.source || 'missing',
        maskedValue: provider.maskedValue || '',
        lastCheckedAt: state.providerStatusLastCheckedAt || ''
      };
    }
    if (mapped) return mapped;
    if (store && typeof store.readinessForModel === 'function') return store.readinessForModel(model);
    if (state.providerStatusLoading) return { configured: false, status: 'refreshing status', source: 'checking' };
    return { configured: false, status: 'missing key', source: 'missing' };
  }
  function readinessLabel(model){
    var readiness = readinessForModel(model);
    if (/refreshing|checking/i.test(String(readiness.status || readiness.source || ''))) return 'refreshing status';
    if (!readiness.configured) return readiness.status || 'missing key';
    if (/quota/i.test(String(readiness.status || ''))) return 'quota risk';
    return readiness.status || 'ready';
  }
  function readinessClass(model){
    return readinessForModel(model).configured ? 'ready' : 'missing';
  }
  function intentForModel(modelId){
    if (modelId === 'google/imagen-3-text-only' || modelId === 'google/imagen-4') return 'no_reference_scene';
    if (modelId === 'black-forest-labs/flux-2-pro' || modelId === 'black-forest-labs/flux-2-max') return 'no_reference_scene';
    if (modelId === 'fal/qwen-image-2-edit' || modelId === 'prunaai/p-image-edit') return 'object_product_final';
    return 'final_character';
  }
  function qualityForModel(modelId){
    var model = modelById(modelId);
    return model.qualityTier || 'standard';
  }
  function routeLabel(model){
    return model ? (model.displayName + ' - ' + providerChip(model) + ' - ' + zarCost(model)) : 'Image router';
  }
  function routeSummaryModel(kind){
    var models = state.models.slice();
    var ctx = routeContext();
    var compatible = models.filter(function(model){
      return modelWarnings(model, ctx).length === 0;
    });
    if (kind === 'cheapest') {
      return (compatible.length ? compatible : models).slice().sort(function(a, b){
        return number(a.costEstimateUsd, 999) - number(b.costEstimateUsd, 999);
      })[0];
    }
    if (kind === 'premium') {
      return modelById('black-forest-labs/flux-2-pro')
        || compatible.find(function(model){ return model.id === 'black-forest-labs/flux-2-pro'; })
        || compatible.find(function(model){ return model.qualityTier === 'premium'; })
        || activeRoutedModel();
    }
    if (kind === 'utility') {
      return compatible.find(function(model){ return model.id === 'fal/qwen-image-2-edit'; })
        || compatible.find(function(model){ return model.qualityTier === 'utility'; })
        || modelById('fal/qwen-image-2-edit');
    }
    return activeRoutedModel();
  }
  function routeSnapshotItems(selected){
    var items = [
      { label: 'Router selected', model: selected || activeRoutedModel(), active: true },
      { label: 'Lean compatible', model: routeSummaryModel('cheapest') },
      { label: 'Premium final', model: routeSummaryModel('premium') },
      { label: 'Utility/edit option', model: routeSummaryModel('utility') }
    ];
    var seen = {};
    return items.filter(function(item){
      if (!item.model || !item.model.id || seen[item.model.id]) return false;
      seen[item.model.id] = true;
      return true;
    });
  }
  function routePreviewKey(ctx){
    ctx = ctx || routeContext();
    return [
      ctx.modelId,
      ctx.spendLane,
      ctx.intent,
      ctx.referenceCount,
      ctx.requiresEditing ? 1 : 0,
      ctx.requiresTextRendering ? 1 : 0,
      ctx.quality,
      ctx.budgetTier
    ].join('|');
  }
  function currentRoutePreview(){
    var ctx = routeContext();
    return state.routePreview && state.routePreviewKey === routePreviewKey(ctx) ? state.routePreview : null;
  }

  function clampModelRating(value, fallback){
    var n = Number(value);
    if (!Number.isFinite(n)) n = Number(fallback || 3);
    return Math.max(1, Math.min(5, Math.round(n)));
  }

  function modelIntelligence(model){
    model = model || {};
    var fallback = MODEL_INTELLIGENCE_FALLBACKS[model.id] || {};
    return {
      bestFor: normalizeList(model.bestFor || fallback.bestFor || model.strengths || []),
      notIdealFor: normalizeList(model.notIdealFor || fallback.notIdealFor || model.avoidWhen || model.weaknesses || []),
      skinTonePerformance: model.skinTonePerformance || fallback.skinTonePerformance || 'No skin-tone performance note yet.',
      identityLockStrength: clampModelRating(model.identityLockStrength, fallback.identityLockStrength || 3),
      backgroundRealism: clampModelRating(model.backgroundRealism, fallback.backgroundRealism || 3),
      creativeRange: clampModelRating(model.creativeRange, fallback.creativeRange || 3),
      speedRating: model.speedRating || fallback.speedRating || 'medium',
      costZAR: Number(model.costZAR || fallback.costZAR || model.costEstimateZar || 0),
      requiresRefs: Boolean(model.requiresRefs ?? fallback.requiresRefs),
      supportsNegativePrompt: Boolean(model.supportsNegativePrompt ?? fallback.supportsNegativePrompt),
      characterNote: model.characterNote || fallback.characterNote || '',
      warningNote: model.warningNote || fallback.warningNote || ''
    };
  }

  function modelSkinToneRating(model){
    var note = modelIntelligence(model).skinTonePerformance.toLowerCase();
    if (/excellent|particularly strong|mastery/.test(note)) return 5;
    if (/strong|reliable|good semantic/.test(note)) return 4;
    if (/good|moderate|usable/.test(note)) return 3;
    if (/limited|weak|utility/.test(note)) return 2;
    return 3;
  }

  function modelRatingLabel(value){
    return componentScoreLabelFromDots(value);
  }

  function componentScoreLabelFromDots(value){
    value = clampModelRating(value, 3);
    if (value >= 5) return 'EXCELLENT';
    if (value >= 4) return 'GOOD';
    if (value >= 3) return 'MODERATE';
    if (value >= 2) return 'TENSION';
    return 'AVOID';
  }

  function modelRatingDots(value){
    value = clampModelRating(value, 3);
    var dots = [];
    for (var i = 1; i <= 5; i += 1) {
      dots.push('<span class="' + (i <= value ? 'on' : '') + '"></span>');
    }
    return '<span class="pg52-model-rating-dots" aria-label="' + esc(value + ' out of 5') + '">' + dots.join('') + '</span>';
  }

  function modelMetricHtml(label, value){
    value = clampModelRating(value, 3);
    return [
      '<div class="pg52-model-metric">',
        '<span>' + esc(label) + '</span>',
        modelRatingDots(value),
        '<strong>' + esc(modelRatingLabel(value)) + '</strong>',
      '</div>'
    ].join('');
  }

  function modelRecommendationContext(){
    var charId = $('g-char')?.value || 'leah';
    var charProfile = characterShootProfile(charId) || {};
    var char = getCharSafe(charId) || {};
    var refsEnabled = checked('g-attach-refs', true);
    var identityRefCount = refsEnabled ? Math.min(2, identityRefsForCurrent().length || 0) : 0;
    var wardrobeRefCount = refsEnabled ? activeWardrobeIds().length : 0;
    var sceneRefs = refsEnabled ? ((state.generatorV5.sceneRefs || []).length) : 0;
    var refCount = identityRefCount + wardrobeRefCount + sceneRefs;
    var scene = {};
    try { scene = scenePackFromControls(); } catch (_) { scene = {}; }
    var location = resolveLocationRegistry(scene.locationId || $('g-location')?.value || '');
    var cinematic = scene.cinematicPack || {};
    try {
      if (!cinematic.enabled) cinematic = cinematicPackFromControls();
    } catch (_) {}
    var skinText = [
      charProfile.skinTone,
      charProfile.realisticTextureNote,
      charProfile.lightingAffinity?.skin_note,
      char.identity?.skin,
      char.identity?.texture
    ].filter(Boolean).join(' ').toLowerCase();
    var warmRichSkin = /warm|rich|brown|melanin|dark|medium-dark|skin|texture/.test(skinText);
    var locationCategory = String(location.category || '').toLowerCase();
    var locationName = String(location.name || scene.location || '').toLowerCase();
    var locationRegion = String(location.region || '').toLowerCase();
    var locationEnvironment = String(location.environment || '').toLowerCase();
    var conceptual = locationCategory === 'conceptual' || /surreal|fog|submerged|flame|frost|desert|floating/.test(locationName) || Boolean(cinematic.enabled);
    var complexLocation = /architecture|atrium|rooftop|district|station|market|lobby|gallery|corridor|glass|city|tower|waterfront|interior|exterior/.test(locationName + ' ' + locationRegion + ' ' + locationEnvironment);
    var identityCritical = identityRefCount > 0 || wardrobeRefCount > 0 || sceneRefs > 0;
    return {
      charId: charId,
      charName: char.name || optionText('g-char') || charId,
      charProfile: charProfile,
      refs: [],
      refCount: refCount,
      identityRefCount: identityRefCount,
      wardrobeRefCount: wardrobeRefCount,
      sceneRefs: sceneRefs,
      warmRichSkin: warmRichSkin,
      location: location,
      scene: scene,
      conceptual: conceptual,
      complexLocation: complexLocation,
      identityCritical: identityCritical
    };
  }

  function modelSupportsRecommendationContext(model, ctx){
    if (!model) return false;
    if (ctx.refCount > 0 && !model.supportsImageToImage && model.id !== 'google/imagen-3-text-only') return false;
    if (model.id === 'fal/qwen-image-2-edit' && ctx.refCount === 0) return false;
    return true;
  }

  function modelShotRecommendationScore(model, ctx){
    model = model || {};
    ctx = ctx || modelRecommendationContext();
    var intel = modelIntelligence(model);
    var score = 0;
    score += intel.identityLockStrength * (ctx.identityCritical ? 6 : 2);
    score += modelSkinToneRating(model) * (ctx.warmRichSkin ? 5 : 2);
    score += intel.backgroundRealism * (ctx.complexLocation || ctx.sceneRefs ? 5 : 2);
    score += intel.creativeRange * (ctx.conceptual ? 6 : 2);
    score += model.providerAdapter === 'google' && getCurrentImageSpendLane() === 'google_credits' ? 8 : 0;
    score += model.id === getCurrentImageModel() ? 1 : 0;
    if (ctx.refCount > 2 && model.id === 'google/nano-banana-pro') score += 30;
    if (ctx.refCount > 0 && model.supportsImageToImage) score += 12;
    if (ctx.refCount > 0 && !model.supportsImageToImage && model.id !== 'google/imagen-3-text-only') score -= 30;
    if (ctx.conceptual && ctx.refCount === 0 && model.id === 'google/imagen-3-text-only') score += 32;
    if (ctx.conceptual && ctx.refCount === 0 && model.id === 'black-forest-labs/flux-2-max') score += 22;
    if (ctx.complexLocation && ctx.refCount === 0 && model.id === 'black-forest-labs/flux-2-pro') score += 30;
    if (ctx.complexLocation && ctx.refCount === 0 && model.id === 'black-forest-labs/flux-2-max') score += 24;
    if (ctx.sceneRefs && (model.id === 'openai/gpt-image-2' || model.id === 'bytedance/seedream-5-lite')) score += 12;
    if (model.id === 'fal/qwen-image-2-edit') score -= ctx.refCount > 0 ? 18 : 45;
    if (intel.requiresRefs && ctx.refCount === 0) score -= 30;
    if (!modelSupportsRecommendationContext(model, ctx)) score -= 50;
    return score;
  }

  function recommendedModelForCurrentShot(ctx){
    ctx = ctx || modelRecommendationContext();
    var models = state.models.length ? state.models : MODEL_FALLBACKS;
    var ranked = models
      .map(function(model){ return { model: model, score: modelShotRecommendationScore(model, ctx) }; })
      .sort(function(a, b){ return b.score - a.score; });
    return ranked[0] || { model: activeRoutedModel() || modelById(getCurrentImageModel()), score: 0 };
  }

  function normalizeIdentityScore100(value){
    var score = Number(value);
    if (!Number.isFinite(score)) return null;
    if (score <= 1) score *= 100;
    return Math.max(0, Math.min(100, score));
  }

  function modelPerformanceHistory(model, charId){
    model = model || {};
    charId = charId || $('g-char')?.value || 'leah';
    var shots = [];
    try { shots = loadShotHistory(charId) || []; } catch (_) { shots = []; }
    var matching = shots.filter(function(shot){ return String(shot.model || '') === String(model.id || ''); });
    if (!matching.length) return { count: 0, label: 'No history yet', preferred: false, averageIdentityScore: null };
    var scored = matching
      .map(function(shot){ return normalizeIdentityScore100(shot.result?.identityScore); })
      .filter(function(score){ return score !== null; });
    var average = scored.length ? scored.reduce(function(sum, score){ return sum + score; }, 0) / scored.length : null;
    var approved = matching.filter(function(shot){ return shot.result?.approved === true; }).length;
    var preferred = matching.length >= 3 && approved / matching.length >= 0.66;
    return {
      count: matching.length,
      approved: approved,
      averageIdentityScore: average,
      preferred: preferred,
      label: average !== null
        ? Math.round(average) + '% avg identity score - ' + matching.length + ' shots' + (preferred ? ' - PREFERRED' : '')
        : matching.length + ' shots - no identity score yet'
    };
  }

  function modelWatchFor(model, ctx){
    var intel = modelIntelligence(model);
    var notes = [];
    if (ctx?.complexLocation && intel.backgroundRealism < 4) notes.push('complex backgrounds - consider adding a scene reference image');
    if (ctx?.refCount > 2 && intel.identityLockStrength < 4) notes.push('multi-reference identity lock');
    if (ctx?.conceptual && intel.creativeRange < 4) notes.push('surreal/conceptual range');
    if (intel.warningNote) notes.push(intel.warningNote);
    if (!notes.length) notes = intel.notIdealFor.slice(0, 2);
    return notes.filter(Boolean).slice(0, 2);
  }

  function modelRecommendationBadge(model, recommendedId, selectedId){
    var badges = [];
    if (model && model.id === recommendedId) badges.push('<span class="pg52-model-badge pg52-model-badge--recommended">Model recommended</span>');
    if (model && model.id === selectedId) badges.push('<span class="pg52-model-badge pg52-model-badge--selected">Selected</span>');
    return badges.join('');
  }

  function modelIntelligenceCardHtml(model, data){
    model = model || activeRoutedModel();
    if (!model) return '';
    var ctx = modelRecommendationContext();
    var intel = modelIntelligence(model);
    var recommendation = recommendedModelForCurrentShot(ctx);
    var recommended = recommendation.model || model;
    var history = modelPerformanceHistory(model, ctx.charId);
    var bestFor = intel.bestFor.slice(0, 3).join(', ') || bestUseLine(model);
    var watchFor = modelWatchFor(model, ctx).join(' - ') || 'No major watch-outs for this setup.';
    return [
      '<div class="pg52-model-intel">',
        '<div class="pg52-model-intel-head">',
          '<span>Model recommendation</span>',
          recommended.id === model.id
            ? '<strong>' + esc(model.displayName || model.id) + '</strong>'
            : '<button class="pg52-model-use-recommended" type="button" onclick="useRecommendedModelForShot()">Use recommended: ' + esc(recommended.displayName || recommended.id) + '</button>',
        '</div>',
        '<div class="pg52-model-metrics">',
          modelMetricHtml('Identity lock', intel.identityLockStrength),
          modelMetricHtml('Skin texture', modelSkinToneRating(model)),
          modelMetricHtml('Background', intel.backgroundRealism),
          modelMetricHtml('Creative range', intel.creativeRange),
        '</div>',
        '<div class="pg52-model-guidance"><span>BEST FOR</span><strong>' + esc(bestFor) + '</strong></div>',
        '<div class="pg52-model-guidance pg52-model-guidance--watch"><span>WATCH FOR</span><strong>' + esc(watchFor) + '</strong></div>',
        '<div class="pg52-model-history"><span>' + esc(ctx.charName) + ' performance history</span><strong>' + esc(history.label) + '</strong></div>',
      '</div>'
    ].join('');
  }

  function useRecommendedModelForShot(){
    var recommendation = recommendedModelForCurrentShot();
    if (recommendation?.model?.id) selectImageModelRoute(recommendation.model.id);
  }

  function activeRoutedModel(){
    return currentRoutePreview()?.selectedModel || routeContext().selectedModel;
  }
  function routeDivergence(data, ctx){
    var selected = data?.selectedModel;
    var preferred = ctx?.selectedModel || modelById(getCurrentImageModel());
    return Boolean(selected && preferred && selected.id !== preferred.id);
  }
  function focusProviderSetup(adapter){
    window.__focusProviderAdapter = adapter || '';
    if (typeof window.nav === 'function') window.nav('providers');
    setTimeout(function(){
      try {
        window.dispatchEvent(new CustomEvent('silva:focus-provider', { detail: { providerAdapter: adapter || '' } }));
      } catch (_) {}
    }, 120);
  }

  function switchToFalDirectRefs(){
    var target = modelById('openai/gpt-image-2') || modelById('bytedance/seedream-5-lite');
    if ($('g-spend-lane')) $('g-spend-lane').value = 'fal_full_ai';
    if (target && $('g-image-model')) $('g-image-model').value = target.id;
    if ($('g-route-intent')) $('g-route-intent').value = 'final_character';
    if ($('g-route-quality')) $('g-route-quality').value = 'premium';
    updateSpendNote();
    applyRouteState(target ? target.id : getCurrentImageModel(), { source: 'fal-direct-ref-opt-in', keepSpendLane: true });
  }

  function recommendedFinalModelForLane(lane){
    lane = String(lane || getCurrentImageSpendLane());
    var refs = getReferenceCount($('g-char')?.value || 'leah');
    var currentIntent = $('g-route-intent')?.value || '';
    if (lane === 'fal_full_ai') return currentIntent === 'object_product_final' ? 'fal/qwen-image-2-edit' : 'openai/gpt-image-2';
    if (lane === 'google_credits') {
      if (refs > 0) return 'google/nano-banana-pro';
      if (currentIntent === 'no_reference_scene' || currentIntent === 'broll_final' || currentIntent === 'object_product_final') return 'google/imagen-3-text-only';
      return 'google/nano-banana-pro';
    }
    if (refs > 0) return 'google/nano-banana-pro';
    return currentIntent === 'no_reference_scene' ? 'google/imagen-3-text-only' : 'google/nano-banana-pro';
  }

  function applySpendLaneRouteDefaults(lane){
    var targetId = recommendedFinalModelForLane(lane);
    var target = modelById(targetId);
    if (!target || !$('g-image-model')) return;
    $('g-image-model').value = target.id;
    if ($('g-route-intent')) $('g-route-intent').value = intentForModel(target.id);
    if ($('g-route-quality')) $('g-route-quality').value = target.providerAdapter === 'fal' ? 'premium' : qualityForModel(target.id);
  }
  var generatorHashActivationTimer = 0;
  var generatorHashActivationAt = 0;
  var generatorInitPromise = null;
  var generatorInitComplete = false;
  var generatorWarmAt = 0;
  var generatorActivationTimer = 0;
  function generatorPageIsActive(){
    return Boolean(document.querySelector('#page-generator.active')) || window.location.hash === '#generator';
  }
  function scheduleInitialGeneratorPreview(){
    clearTimeout(state.previewTimer);
    var runPreview = function(){
      if (!generatorPageIsActive()) return;
      previewImageRouteFromGenerator({ force: false, refreshStatus: false }).catch(function(){});
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runPreview, { timeout: 1200 });
      return;
    }
    state.previewTimer = setTimeout(runPreview, 280);
  }
  function refreshGeneratorSurfaceAfterStatus(){
    populateModelSelect();
    renderRoutePreview(state.routePreview);
    renderModelIntelligence(false);
    updateModelBoardReadiness();
    updateEmptyPanelRoute();
    renderGeneratorAiActions();
  }
  function warmGeneratorActiveSurface(reason, force){
    if (!generatorPageIsActive()) return;
    var now = Date.now();
    if (!force && generatorWarmAt && (now - generatorWarmAt) < 1200 && (state.routePreview || state.routePreviewLoading)) return;
    generatorWarmAt = now;
    ensureControls();
    renderEmptyPanel();
    renderModelIntelligence(false);
    fetchShotHistory({ character: $('g-char')?.value || 'leah', limit: 20 });
    loadProviderStatus({ force: Boolean(force), reason: reason || 'prompt-generator-active', timeoutMs: force ? 1200 : 900 })
      .catch(function(){ return null; })
      .finally(function(){
        refreshGeneratorSurfaceAfterStatus();
        scheduleInitialGeneratorPreview();
      });
  }
  function queueGeneratorBoot(reason, force){
    clearTimeout(generatorActivationTimer);
    generatorActivationTimer = setTimeout(function(){
      if (!generatorPageIsActive()) return;
      if (generatorInitPromise && !generatorInitComplete) return;
      init(reason).then(function(){ warmGeneratorActiveSurface(reason, force); }).catch(function(){});
    }, 0);
  }
  function observeGeneratorActivation(){
    var page = $('page-generator');
    if (!page || page.dataset.pg52Observed === '1') return;
    var observer = new MutationObserver(function(){
      if (page.classList.contains('active')) queueGeneratorBoot('generator-page-active', false);
    });
    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
    page.dataset.pg52Observed = '1';
  }
  function activateGeneratorHashRoute(){
    if (window.location.hash === '#generator' && typeof window.nav === 'function') {
      var pageActive = !!document.querySelector('#page-generator.active');
      if (!pageActive) window.nav('generator');
      if (pageActive && (Date.now() - generatorHashActivationAt) < 1400) return;
      generatorHashActivationAt = Date.now();
      claimSurface({ mode: 'hash-route' });
      clearTimeout(generatorHashActivationTimer);
      generatorHashActivationTimer = setTimeout(function(){
        ensureControls();
        renderEmptyPanel();
        renderModelIntelligence(false);
        if (!generatorInitComplete) return;
        warmGeneratorActiveSurface('generator-hash-activation', false);
      }, 0);
    }
  }
  function optionText(id){
    var el = $(id);
    if (!el || el.selectedIndex < 0) return '';
    return el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value;
  }
  function checked(id, fallback){
    var el = $(id);
    return el ? Boolean(el.checked) : Boolean(fallback);
  }
  async function fetchJsonWithTimeout(url, options, timeoutMs){
    options = options || {};
    timeoutMs = timeoutMs || 6500;
    var controller = options.controller || new AbortController();
    var timeout = setTimeout(function(){ controller.abort(); }, timeoutMs);
    try {
      var res = await fetch(url, Object.assign({}, options, { controller: undefined, signal: controller.signal }));
      var data = await res.json().catch(function(){ return {}; });
      return { res: res, data: data };
    } finally {
      clearTimeout(timeout);
    }
  }

  function asyncFeedback(){
    return window.SilvaAsyncFeedback || null;
  }

  function notifyAsync(type, message, action){
    if (typeof window.showToast === 'function') return window.showToast(type, message, action);
    if (typeof window.toast === 'function') return window.toast(message);
    return null;
  }

  function startAsyncOperation(key, meta){
    return asyncFeedback()?.startOperation(key, meta || {});
  }

  function succeedAsyncOperation(key, meta){
    return asyncFeedback()?.succeedOperation(key, meta || {});
  }

  function failAsyncOperation(key, error, meta){
    return asyncFeedback()?.failOperation(key, error, meta || {});
  }

  function throttledAsyncWarning(key, message){
    var feedback = asyncFeedback();
    if (feedback && typeof feedback.toastThrottled === 'function') {
      return feedback.toastThrottled('warning', key, message);
    }
    return notifyAsync('warning', message);
  }

  async function loadModels(){
    startAsyncOperation('generatorModels', { background: true });
    try {
      var result = await fetchJsonWithTimeout('/api/image-models', { cache: 'no-store' }, 6500);
      var res = result.res;
      var data = result.data;
      if (res.ok && Array.isArray(data.items) && data.items.length) {
        state.models = data.items;
        state.registryLoaded = true;
        mergeRouteReadiness({ items: data.items });
        succeedAsyncOperation('generatorModels', { count: data.items.length });
      }
    } catch (err) {
      state.registryLoaded = false;
      failAsyncOperation('generatorModels', err, { background: true });
      throttledAsyncWarning('generatorModels', 'Model list unavailable. Using cached defaults.');
    }
    populateModelSelect();
  }

  async function loadProviderStatus(options){
    options = options || {};
    var store = providerStore();
    state.providerStatusLoading = true;
    startAsyncOperation('providerStatus', { background: true, reason: options.reason || 'prompt-generator' });
    try {
      if (store && typeof store.fetchFresh === 'function') {
        var status = await store.fetchFresh({ force: Boolean(options.force), reason: options.reason || 'prompt-generator', timeoutMs: options.timeoutMs || 6500 });
        applyProviderStatus(status);
        succeedAsyncOperation('providerStatus', { status: status });
        return state.providerStatus;
      }
      var result = await fetchJsonWithTimeout('/api/provider-credentials/status', { cache: 'no-store' }, options.timeoutMs || 6000);
      var res = result.res;
      var data = result.data;
      if (res.ok && data && data.ok !== false) {
        applyProviderStatus(data);
        succeedAsyncOperation('providerStatus', { status: data });
      }
    } catch (err) {
      failAsyncOperation('providerStatus', err, { background: true });
      throttledAsyncWarning('providerStatus', 'Provider readiness unavailable. Routes may use cached status.');
    } finally {
      state.providerStatusLoading = false;
    }
    return state.providerStatus;
  }

  async function refreshProviderReadiness(options){
    options = options || {};
    await loadProviderStatus({ force: Boolean(options.force), reason: options.reason || 'prompt-generator-refresh' });
    populateModelSelect();
    renderRoutePreview(state.routePreview);
    renderModelIntelligence(false);
    updateModelBoardReadiness();
    updateEmptyPanelRoute();
    renderGeneratorAiActions();
    return state.providerStatus;
  }

  function removeLegacyControl(id){
    document.querySelectorAll('#' + id).forEach(function(el){
      if (el.closest('#prompt-generator-v3-route-deck')) return;
      if (el.closest('#prompt-generator-52-shell')) return;
      if (el.closest('#prompt-generator-51-shell')) return;
      if (el.closest('#prompt-generator-50-shell')) return;
      if (el.closest('#prompt-generator-40-shell')) return;
      if (el.closest('#prompt-generator-38-shell')) return;
      var prev = el.previousElementSibling;
      if (prev && prev.classList && prev.classList.contains('gen-label')) prev.remove();
      el.remove();
    });
  }

  function removeLegacyProviderControls(){
    removeLegacyControl('g-provider');
    removeLegacyControl('g-realism');
    removeLegacyControl('g-template');
    removeLegacyControl('g-campaign');
    document.querySelectorAll('#g-sa-texture,#g-attach-refs').forEach(function(input){
      if (input.closest('#prompt-generator-v3-route-deck')) return;
      if (input.closest('#prompt-generator-52-shell')) return;
      if (input.closest('#prompt-generator-51-shell')) return;
      if (input.closest('#prompt-generator-50-shell')) return;
      if (input.closest('#prompt-generator-40-shell')) return;
      if (input.closest('#prompt-generator-38-shell')) return;
      var row = input.closest('div');
      if (row) row.remove();
    });
    var oldTools = $('gen-ai-tools');
    if (oldTools && !oldTools.closest(activeShellSelector())) oldTools.remove();
  }

  function cleanupLateLegacyControls(){
    removeLegacyProviderControls();
    renderGeneratorAiActions();
  }

  function campaignOptions(){
    var current = '';
    var items = Array.isArray(window.CAMPAIGNS) ? window.CAMPAIGNS : [];
    return '<option value="">No campaign</option>' + items.map(function(campaign){
      return '<option value="' + esc(campaign.id) + '"' + (campaign.id === current ? ' selected' : '') + '>' + esc(campaign.name) + '</option>';
    }).join('');
  }

  function fallbackOptions(id){
    var map = {
      'g-char': [
        ['leah', 'Leah Mokoena'],
        ['claudia', 'Claudia Naidoo'],
        ['grok', 'Grok (Gerhard Kroukamp)'],
        ['aisha', 'Aisha Motsepe'],
        ['vanya', 'Vanya Khumalo']
      ],
      'g-platform': null,
      'g-bucket': [
        ['lifestyle', 'Lifestyle / Urban'],
        ['thought', 'Thought Leadership'],
        ['ditl', 'Day in the Life'],
        ['bts', 'Behind the Scenes'],
        ['systems', 'Systems / Process'],
        ['collab', 'Collaboration'],
        ['personal', 'Personal / Soft'],
        ['transit', 'In Transit'],
        ['event', 'Event / Activity']
      ],
      'g-location': null,
      'g-mood': [
        ['sharp', 'Sharp / Focused'],
        ['composed', 'Composed / Premium'],
        ['candid', 'Candid / Real'],
        ['pensive', 'Pensive / Thoughtful'],
        ['confident', 'Confident / Assured'],
        ['in_motion', 'In Motion / Transitional'],
        ['soft', 'Soft / Relaxed']
      ],
      'g-time': null,
      'g-posttype': [
        ['portrait', 'Portrait / Hero Shot'],
        ['portrait_env', 'Portrait in Environment'],
        ['action', 'Action / Mid-task'],
        ['candid', 'Candid / Natural'],
        ['broll_detail', 'B-Roll Detail'],
        ['mixed_kit', 'Mixed Portrait + B-Roll Kit']
      ],
      'g-mode': [
        ['work', 'Work'],
        ['personal', 'Personal'],
        ['hybrid', 'Hybrid']
      ],
      'g-camera': [
        ['editorial', 'Editorial / Magazine'],
        ['documentary', 'Documentary / Street'],
        ['cinematic', 'Cinematic / Wide Lens'],
        ['portrait_lens', 'Portrait Lens (85mm f/1.4)'],
        ['phone_real', 'Phone / Real']
      ]
    };
    if (id === 'g-location') return locationOptionsHtml();
    if (id === 'g-platform') return platformOptionsHtml();
    if (id === 'g-time') return lightingOptionsHtml(currentShotMode(), $('g-time')?.value || state.generatorV5.time || shotModeMeta(currentShotMode()).defaultLighting);
    return (map[id] || []).map(function(item){
      return '<option value="' + esc(item[0]) + '">' + esc(item[1]) + '</option>';
    }).join('');
  }

  function capturedOptions(id, fallback){
    var old = $(id);
    if (id === 'g-location') {
      var registryOptions = locationOptionsHtml();
      if (old && isCustomLocationId(old.value)) {
        var customLabel = old.options[old.selectedIndex]?.text || old.value;
        state.generatorV5.customLocations[old.value] = customLabel;
        return registryOptions + '<option value="' + esc(old.value) + '">' + esc(customLabel) + '</option>';
      }
      return registryOptions;
    }
    if (id === 'g-platform') return platformOptionsHtml(old?.value);
    if (id === 'g-time') return lightingOptionsHtml(currentShotMode(), old?.value || state.generatorV5.time || shotModeMeta(currentShotMode()).defaultLighting);
    var base = old && old.options && old.options.length ? old.innerHTML : '';
    var extra = fallback || fallbackOptions(id);
    if (!base) return extra;
    var seen = {};
    Array.prototype.slice.call(old.options || []).forEach(function(option){ seen[option.value] = true; });
    var temp = document.createElement('select');
    temp.innerHTML = extra;
    var mergedExtra = Array.prototype.slice.call(temp.options || []).filter(function(option){ return !seen[option.value]; }).map(function(option){
      return '<option value="' + esc(option.value) + '">' + esc(option.text) + '</option>';
    }).join('');
    return base + mergedExtra;
  }

  function fieldHtml(id, label, options, wide){
    var old = $(id);
    var value = old ? old.value : '';
    return [
      '<label class="pg38-field ' + (wide ? 'wide' : '') + '" for="' + esc(id) + '">',
        '<span>' + esc(label) + '</span>',
        '<select class="pg38-select" id="' + esc(id) + '" data-pg38-control="' + esc(id) + '">' + options + '</select>',
      '</label>',
      value ? '<script type="application/json" data-pg38-value="' + esc(id) + '">' + esc(JSON.stringify(value)) + '</script>' : ''
    ].join('');
  }

  function simpleFieldHtml(id, label, options, wide){
    return [
      '<label class="pg38-field ' + (wide ? 'wide' : '') + '" for="' + esc(id) + '">',
        '<span>' + esc(label) + '</span>',
        '<select class="pg38-select" id="' + esc(id) + '" data-pg38-control="' + esc(id) + '">' + options + '</select>',
      '</label>'
    ].join('');
  }

  function checkboxHtml(id, label, checkedDefault){
    return '<label class="pg38-toggle"><input type="checkbox" id="' + esc(id) + '" data-pg38-control="' + esc(id) + '"' + (checked(id, checkedDefault) ? ' checked' : '') + '> <span>' + esc(label) + '</span></label>';
  }

  function generateArrowSvg(size){
    size = size || 14;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="var(--color-current)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function commandFieldHtml(id, label, options, wide){
    var old = $(id);
    var value = old ? old.value : '';
    return [
      '<div class="pg52-cmd-field ' + (wide ? 'wide' : '') + '" data-pg52-command-field="' + esc(id) + '">',
        '<span class="pg52-t-micro">' + esc(label) + '</span>',
        '<select id="' + esc(id) + '" class="pg52-cmd-select ' + (wide ? 'pg52-cmd-select--wide' : '') + '" data-pg38-control="' + esc(id) + '">' + options + '</select>',
      '</div>',
      value ? '<script type="application/json" data-pg38-value="' + esc(id) + '">' + esc(JSON.stringify(value)) + '</script>' : ''
    ].join('');
  }

  function mobileNavButtonHtml(){
    return '<button class="pg52-mobile-nav-button" type="button" data-pg52-mobile-nav-toggle aria-label="Open navigation" aria-expanded="false"><span aria-hidden="true">☰</span></button>';
  }

  function mobileRoutePromptControlsHtml(){
    return [
      '<div class="pg52-mobile-output-controls" aria-label="Mobile route and prompt controls">',
        '<button class="pg52-btn-ghost pg52-btn-sm pg52-mobile-route-toggle" type="button" data-pg52-mobile-route-toggle aria-expanded="false" aria-controls="g-route-preview">Route + model</button>',
        '<button class="pg52-btn-ghost pg52-btn-sm pg52-mobile-prompt-toggle" type="button" data-pg52-mobile-prompt-open aria-controls="pg52-mobile-prompt-sheet">View prompt</button>',
      '</div>'
    ].join('');
  }

  function mobileUtilitySheetsHtml(){
    return [
      '<div class="pg52-mobile-nav-backdrop" id="pg52-mobile-nav-backdrop" data-pg52-mobile-nav-close hidden></div>',
      '<div class="pg52-mobile-prompt-sheet" id="pg52-mobile-prompt-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="pg52-mobile-prompt-title">',
        '<div class="pg52-mobile-sheet-head">',
          '<div><span class="pg52-t-micro">Prompt</span><strong id="pg52-mobile-prompt-title">Live prompt anatomy</strong></div>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-mobile-prompt-close>Close</button>',
        '</div>',
        '<div class="pg52-mobile-prompt-body" id="pg52-mobile-prompt-body"></div>',
        '<div class="pg52-mobile-sheet-actions">',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-mobile-copy="prompt">Copy prompt</button>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-mobile-copy="negative">Copy negative</button>',
        '</div>',
      '</div>',
      '<div class="pg52-mobile-session-sheet" id="pg52-mobile-session-sheet" hidden role="dialog" aria-modal="true" aria-labelledby="pg52-mobile-session-title">',
        '<div class="pg52-mobile-sheet-head">',
          '<div><span class="pg52-t-micro">Session</span><strong id="pg52-mobile-session-title">Current shots</strong></div>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-mobile-session-close>Close</button>',
        '</div>',
        '<div class="pg52-mobile-session-body" id="pg52-mobile-session-body"></div>',
      '</div>'
    ].join('');
  }

  function selectTextFromOptions(id, options, fallback){
    var old = $(id);
    if (old && old.selectedIndex >= 0 && old.options[old.selectedIndex]) return old.options[old.selectedIndex].text || old.value || fallback || '';
    var tmp = document.createElement('select');
    tmp.innerHTML = options || '';
    return tmp.options[0]?.text || fallback || '';
  }

  function locationLabelForValue(value, fallback){
    var id = String(value || '');
    if (isCustomLocationId(id)) return state.generatorV5.customLocations[id] || optionTextForValue('g-location', id) || fallback || id;
    var entry = LOCATION_REGISTRY[id];
    if (entry && entry.aliasOf) entry = LOCATION_REGISTRY[entry.aliasOf] || entry;
    return entry?.name || optionTextForValue('g-location', id) || fallback || id;
  }

  function ensureCustomLocationOption(text, preferredId){
    var label = String(text || '').replace(/\s+/g, ' ').trim();
    if (!label) return '';
    var select = $('g-location');
    var id = preferredId || ('custom_location_' + slugifyLocation(label));
    state.generatorV5.customLocations[id] = label;
    if (select && !Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === id; })) {
      select.appendChild(new Option(label, id));
    }
    return id;
  }

  function locationPickerHtml(id, label, options, wide){
    var value = $(id)?.value || '';
    var display = value ? locationLabelForValue(value, selectTextFromOptions(id, options, '')) : selectTextFromOptions(id, options, '');
    return [
      '<div class="pg52-chip-group pg52-location-group ' + (wide ? 'wide' : '') + '">',
        '<div class="pg52-field-lock-row"><span class="pg52-t-micro">' + esc(label) + '</span>' + axisLockButtonHtml('location', 'Location') + '</div>',
        '<div class="pg52-location-picker" id="pg52-location-picker">',
          '<button class="pg52-location-mobile-close" type="button" data-pg52-location-close aria-label="Close location picker">Close</button>',
          '<input class="pg52-location-input" id="pg52-location-search" type="text" value="' + esc(display) + '" placeholder="Search or describe a location..." autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="pg52-location-menu">',
          '<div class="pg52-location-context-tag" id="pg52-location-context-tag" aria-live="polite"></div>',
          '<div class="pg52-location-menu" id="pg52-location-menu" role="listbox" hidden></div>',
        '</div>',
        '<select id="' + esc(id) + '" class="pg52-hidden-select" data-pg38-control="' + esc(id) + '">' + options + '</select>',
      '</div>',
      value ? '<script type="application/json" data-pg38-value="' + esc(id) + '">' + esc(JSON.stringify(value)) + '</script>' : ''
    ].join('');
  }

  function smartRandomizeState(){
    var smart = state.generatorV5.smartRandomize || {};
    smart.mode = smart.mode || 'safe';
    smart.axisLocks = Object.assign({
      location: false,
      lighting: false,
      action: false,
      camera: false,
      mood: false,
      props: false
    }, smart.axisLocks || {});
    smart.history = Array.isArray(smart.history) ? smart.history.slice(0, 5) : [];
    state.generatorV5.smartRandomize = smart;
    return smart;
  }

  function axisLocked(axis){
    var smart = smartRandomizeState();
    return Boolean(smart.axisLocks && smart.axisLocks[axis]) || Boolean(state.generatorV5.locks && state.generatorV5.locks[axis]);
  }

  function axisLockButtonHtml(axis, label){
    var lockedNow = axisLocked(axis);
    var id = 'g-lock-' + axis;
    return '<button id="' + esc(id) + '" class="pg52-axis-lock' + (lockedNow ? ' locked' : '') + '" type="button" data-pg52-axis-lock="' + esc(axis) + '" aria-pressed="' + (lockedNow ? 'true' : 'false') + '" title="Lock ' + esc(label || axis) + ' when smart randomizing">' + (lockedNow ? 'Locked' : 'Lock') + '</button>';
  }

  function smartRandomizeHtml(){
    var smart = smartRandomizeState();
    var seed = smart.seed || state.generatorV5.variationSeed || '';
    var modes = [
      ['safe', 'SAFE'],
      ['bold', 'BOLD'],
      ['conceptual', 'CONCEPTUAL']
    ];
    return [
      '<section class="pg52-smart-randomize" id="pg52-smart-randomize" aria-label="Smart Randomize">',
        '<div class="pg52-smart-randomize-head">',
          '<div><span class="pg52-t-micro">Smart Randomize</span><strong>Intelligent surprise, not noise</strong></div>',
          '<div class="pg52-smart-mode" role="radiogroup" aria-label="Creative bias mode">',
            modes.map(function(mode){
              var checked = smart.mode === mode[0];
              return '<label class="pg52-smart-mode-pill' + (checked ? ' selected' : '') + '"><input type="radio" name="g-smart-randomize-mode" value="' + esc(mode[0]) + '"' + (checked ? ' checked' : '') + '> ' + esc(mode[1]) + '</label>';
            }).join(''),
          '</div>',
        '</div>',
        '<div class="pg52-smart-randomize-controls">',
          '<button class="pg52-btn pg52-btn-sm" type="button" id="pg52-smart-randomize-btn" data-pg52-smart-randomize>Smart Randomize</button>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" id="pg52-randomize-again-btn" data-pg52-smart-randomize-again>Randomize again</button>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" id="pg52-randomize-back-btn" data-pg52-smart-randomize-back' + (smart.previousSnapshot ? '' : ' disabled') + '>Back</button>',
          '<label class="pg52-smart-seed" for="g-smart-randomize-seed"><span>Seed</span><input id="g-smart-randomize-seed" type="text" inputmode="numeric" value="' + esc(seed) + '" placeholder="47829"><button type="button" id="pg52-smart-seed-copy" data-pg52-copy-smart-seed>Copy</button></label>',
        '</div>',
        '<div class="pg52-smart-lock-summary" id="pg52-smart-lock-summary">' + smartLockSummaryHtml() + '</div>',
        '<div class="pg52-smart-history" id="pg52-smart-randomize-history">' + smartRandomizeHistoryHtml() + '</div>',
      '</section>'
    ].join('');
  }

  function smartLockSummaryHtml(){
    var locks = smartRandomizeState().axisLocks || {};
    var lockedAxes = ['location','lighting','action','camera','mood','props'].filter(function(axis){ return locks[axis]; });
    return lockedAxes.length ? ('Locked: ' + lockedAxes.map(titleCase).join(' · ')) : 'Identity, refs, campaign, and selected wardrobe stay protected.';
  }

  function smartRandomizeHistoryHtml(){
    var history = smartRandomizeState().history || [];
    if (!history.length) return '<span class="pg52-smart-history-empty">Recent randomized DNA will appear here.</span>';
    return history.map(function(item){
      return '<button type="button" class="pg52-smart-history-chip" data-pg52-smart-history="' + esc(item.id) + '" title="Restore seed ' + esc(item.seed) + '">' + esc(item.dna || item.seed || 'randomized') + '</button>';
    }).join('');
  }

  var SHOT_OVERRIDE_CONFIG = {
    action: {
      key: 'action',
      label: 'Action',
      selectId: 'g-shot-action',
      inputId: 'g-action-override',
      placeholder: 'Describe any action, pose, or scenario.',
      max: 200
    },
    lighting: {
      key: 'lighting',
      label: 'Lighting',
      selectId: 'g-time',
      inputId: 'g-time-override',
      placeholder: 'e.g. late afternoon slant through blinds',
      max: 200
    },
    props: {
      key: 'props',
      label: 'Props',
      selectId: 'g-props',
      inputId: 'g-props-override',
      placeholder: 'e.g. folded newspaper, brass key, cracked phone screen',
      max: 200
    },
    mood: {
      key: 'mood',
      label: 'Mood',
      selectId: 'g-mood',
      inputId: 'g-mood-override',
      placeholder: 'e.g. calm after a difficult win',
      max: 200
    }
  };

  function shotOverridesState(){
    var overrides = state.generatorV5.shotOverrides || {};
    Object.keys(SHOT_OVERRIDE_CONFIG).forEach(function(key){
      overrides[key] = String(overrides[key] || '').slice(0, SHOT_OVERRIDE_CONFIG[key].max || 200);
    });
    if (!overrides.action && state.generatorV5.actionOverride) overrides.action = String(state.generatorV5.actionOverride || '').slice(0, 200);
    state.generatorV5.actionOverride = overrides.action || '';
    state.generatorV5.shotOverrides = overrides;
    return overrides;
  }

  function shotOverrideFieldValue(key){
    var cfg = SHOT_OVERRIDE_CONFIG[key];
    if (!cfg) return '';
    var input = $(cfg.inputId);
    var raw = input ? input.value : shotOverridesState()[key];
    return String(raw || '').trim().slice(0, cfg.max || 200);
  }

  function shotOverrideActive(key){
    return Boolean(shotOverrideFieldValue(key));
  }

  function shotOverrideDisplayText(key){
    var cfg = SHOT_OVERRIDE_CONFIG[key];
    if (!cfg) return '';
    var override = shotOverrideFieldValue(key);
    if (override) return override;
    return optionText(cfg.selectId) || optionTextForValue(cfg.selectId, $(cfg.selectId)?.value || '') || '';
  }

  function shotOverrideDnaPart(key, fallback){
    var value = shotOverrideFieldValue(key);
    if (!value) return fallback;
    var slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
    return slug ? 'c:' + slug : fallback;
  }

  function setShotOverrideValue(key, value){
    var cfg = SHOT_OVERRIDE_CONFIG[key];
    if (!cfg) return;
    var overrides = shotOverridesState();
    var trimmed = String(value || '').slice(0, cfg.max || 200);
    overrides[key] = trimmed;
    if (key === 'action') state.generatorV5.actionOverride = trimmed;
    var input = $(cfg.inputId);
    if (input && input.value !== trimmed) input.value = trimmed;
    syncShotOverrideUi(key);
  }

  function shotOverrideInputHtml(cfg){
    var value = shotOverrideFieldValue(cfg.key);
    var active = Boolean(value);
    return [
      '<div class="pg52-override-custom" data-pg52-override-custom="' + esc(cfg.key) + '"' + (active ? '' : ' hidden') + '>',
        '<div class="pg52-override-toolbar">',
          '<button class="pg52-override-back" type="button" data-pg52-override-back="' + esc(cfg.key) + '">← Back to list</button>',
          '<span class="pg52-custom-tag">custom</span>',
        '</div>',
        '<label class="pg52-override-input-wrap" for="' + esc(cfg.inputId) + '">',
          '<input id="' + esc(cfg.inputId) + '" class="pg52-override-input" data-pg52-override-input="' + esc(cfg.key) + '" type="text" maxlength="' + esc(String(cfg.max || 200)) + '" value="' + esc(value) + '" placeholder="' + esc(cfg.placeholder || 'Write a custom value...') + '">',
          '<span class="pg52-override-counter" id="' + esc(cfg.inputId + '-counter') + '">' + esc(String(value.length)) + '/' + esc(String(cfg.max || 200)) + '</span>',
        '</label>',
      '</div>'
    ].join('');
  }

  function shotOverrideFieldHtml(config, normalHtml){
    var cfg = typeof config === 'string' ? SHOT_OVERRIDE_CONFIG[config] : config;
    if (!cfg) return normalHtml || '';
    var active = shotOverrideActive(cfg.key);
    var lock = cfg.lockAxis ? axisLockButtonHtml(cfg.lockAxis, cfg.lockLabel || cfg.label || cfg.key) : '';
    return [
      '<div class="pg52-chip-group pg52-shot-override-field ' + esc(cfg.extraClass || '') + ' ' + (cfg.wide ? 'wide' : '') + '" data-pg52-override-key="' + esc(cfg.key) + '" data-pg52-override-active="' + (active ? 'true' : 'false') + '">',
        '<div class="pg52-override-label-row">',
          '<span class="pg52-t-micro">' + esc(cfg.label || cfg.key) + '</span>',
          lock,
          '<button class="pg52-override-edit" type="button" data-pg52-override-edit="' + esc(cfg.key) + '" aria-label="Write custom ' + esc(cfg.label || cfg.key) + '">✎</button>',
        '</div>',
        '<div class="pg52-override-normal">' + (normalHtml || '') + '</div>',
        shotOverrideInputHtml(cfg),
      '</div>'
    ].join('');
  }

  function chipControlHtml(id, options){
    var value = $(id)?.value || '';
    return [
      '<button class="pg52-chip" data-pg52-chip="' + esc(id) + '" type="button" aria-expanded="false">',
        '<span class="pg52-chip-value">' + esc(selectTextFromOptions(id, options, id)) + '</span>',
        '<svg class="pg52-chip-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 4l3 3 3-3" stroke="var(--color-current)" stroke-width="1.4" stroke-linecap="round"/></svg>',
      '</button>',
      '<select id="' + esc(id) + '" class="pg52-hidden-select" data-pg38-control="' + esc(id) + '">' + options + '</select>',
      value ? '<script type="application/json" data-pg38-value="' + esc(id) + '">' + esc(JSON.stringify(value)) + '</script>' : ''
    ].join('');
  }

  function actionEngineHtml(){
    var value = $('g-shot-action')?.value || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()) || SHOT_ACTIONS[0] || '';
    var normal = [
      '<div class="pg52-action-engine-body">',
        '<div class="pg52-action-mode-label" id="pg52-action-mode-label">' + esc(shotModeActionLabel(currentShotMode())) + '</div>',
        '<select id="g-shot-action" class="pg52-action-select" data-pg38-control="g-shot-action">' + actionOptionsHtml(value) + '</select>',
        '<button class="pg52-btn-ghost pg52-btn-sm pg52-action-suggest-btn" type="button" id="pg52-action-suggest-btn">Suggest actions for this shot</button>',
        '<div class="pg52-action-suggestions" id="pg52-action-suggestions" aria-live="polite"></div>',
      '</div>'
    ].join('');
    return shotOverrideFieldHtml(Object.assign({}, SHOT_OVERRIDE_CONFIG.action, { wide: true, extraClass: 'pg52-action-engine', lockAxis: 'action', lockLabel: 'Action' }), normal);
  }

  function cinematicAestheticById(id){
    return CINEMATIC_AESTHETICS.find(function(item){ return item.id === id; }) || null;
  }

  function cinematicTreatmentById(id){
    return CINEMATIC_TREATMENTS.find(function(item){ return item.id === id; }) || null;
  }

  function cinematicOptionsHtml(current){
    current = current || state.generatorV5.cinematicAesthetic || 'barry_jenkins_moonlight';
    return CINEMATIC_AESTHETICS.map(function(item){
      return '<option value="' + esc(item.id) + '"' + (item.id === current ? ' selected' : '') + '>' + esc(item.label) + '</option>';
    }).join('') + '<option value="custom"' + (current === 'custom' ? ' selected' : '') + '>Free text: Describe a cinematic aesthetic...</option>';
  }

  function cinematicPackFromControls(){
    var modeEl = $('g-cinematic-mode');
    var enabled = modeEl ? Boolean(modeEl.checked) : Boolean(state.generatorV5.cinematicMode);
    var aestheticId = $('g-cinematic-aesthetic')?.value || state.generatorV5.cinematicAesthetic || 'barry_jenkins_moonlight';
    var customAesthetic = String($('g-cinematic-aesthetic-custom')?.value || state.generatorV5.cinematicAestheticCustom || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    var narrative = String($('g-cinematic-narrative')?.value || state.generatorV5.cinematicNarrative || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    var checkedTreatmentIds = Array.prototype.slice.call(document.querySelectorAll('input[name="g-cinematic-treatment"]:checked')).map(function(input){ return input.value; });
    var treatmentIds = checkedTreatmentIds.length ? checkedTreatmentIds : (state.generatorV5.cinematicTreatments || []);
    treatmentIds = uniqueList(treatmentIds).slice(0, 3);
    var aesthetic = aestheticId === 'custom' ? null : cinematicAestheticById(aestheticId);
    var aestheticLabel = aestheticId === 'custom' ? customAesthetic : (aesthetic?.label || '');
    var treatmentItems = treatmentIds.map(cinematicTreatmentById).filter(Boolean);
    var treatmentTerms = uniqueList(treatmentItems.reduce(function(out, item){ return out.concat(item.terms || []); }, []));
    var promptModifiers = uniqueList((aesthetic?.modifiers || []).concat(aestheticId === 'custom' && customAesthetic ? [customAesthetic] : []).concat(treatmentTerms));
    return {
      enabled: Boolean(enabled),
      aestheticId: enabled ? aestheticId : '',
      aestheticLabel: enabled ? aestheticLabel : '',
      customAesthetic: enabled && aestheticId === 'custom' ? customAesthetic : '',
      narrative: enabled ? narrative : '',
      treatmentIds: enabled ? treatmentIds : [],
      treatments: enabled ? treatmentItems.map(function(item){ return { id: item.id, label: item.label, terms: item.terms || [] }; }) : [],
      treatmentLabels: enabled ? treatmentItems.map(function(item){ return item.label; }) : [],
      promptModifiers: enabled ? promptModifiers : [],
      treatmentTerms: enabled ? treatmentTerms : []
    };
  }

  function cinematicPromptLine(pack){
    pack = pack || cinematicPackFromControls();
    if (!pack.enabled) return '';
    var parts = [];
    if (pack.aestheticLabel) parts.push('Aesthetic reference: ' + pack.aestheticLabel + '.');
    if (pack.narrative) parts.push('Narrative frame: ' + pack.narrative + '.');
    if (pack.promptModifiers && pack.promptModifiers.length) parts.push('Cinematic modifiers: ' + pack.promptModifiers.join(', ') + '.');
    if (pack.treatmentLabels && pack.treatmentLabels.length) parts.push('Visual treatments: ' + pack.treatmentLabels.join(', ') + '.');
    return parts.join(' ');
  }

  function cinematicModeHtml(){
    var enabled = Boolean(state.generatorV5.cinematicMode);
    var aesthetic = state.generatorV5.cinematicAesthetic || 'barry_jenkins_moonlight';
    var custom = state.generatorV5.cinematicAestheticCustom || '';
    var narrative = state.generatorV5.cinematicNarrative || '';
    var selectedTreatments = state.generatorV5.cinematicTreatments || [];
    return [
      '<div class="pg52-cinematic-shell" id="pg52-cinematic-shell">',
        '<label class="pg52-cinematic-toggle">',
          '<input type="checkbox" id="g-cinematic-mode" data-pg38-control="g-cinematic-mode"' + (enabled ? ' checked' : '') + '>',
          '<span>CINEMATIC MODE</span>',
          '<small>Layer film, fashion film, music video, or documentary language on top of this shot.</small>',
        '</label>',
        '<div class="pg52-cinematic-panel" id="pg52-cinematic-panel"' + (enabled ? '' : ' hidden') + '>',
          '<div class="pg52-cinematic-head"><span class="pg52-t-micro">Cinematic Reference</span><strong>Frame language</strong></div>',
          '<div class="pg52-cinematic-grid">',
            '<label class="pg52-cinematic-field" for="g-cinematic-aesthetic"><span class="pg52-t-micro">Film / director aesthetic</span><select id="g-cinematic-aesthetic" class="pg52-cinematic-select">' + cinematicOptionsHtml(aesthetic) + '</select></label>',
            '<label class="pg52-cinematic-field pg52-cinematic-custom" for="g-cinematic-aesthetic-custom"' + (aesthetic === 'custom' ? '' : ' hidden') + '><span class="pg52-t-micro">Custom aesthetic</span><input id="g-cinematic-aesthetic-custom" class="pg52-cinematic-input" type="text" maxlength="160" value="' + esc(custom) + '" placeholder="Describe a cinematic aesthetic..."></label>',
          '</div>',
          '<label class="pg52-cinematic-field pg52-cinematic-story" for="g-cinematic-narrative">',
            '<span class="pg52-t-micro">What is the story in this frame?</span>',
            '<textarea id="g-cinematic-narrative" class="pg52-cinematic-textarea" maxlength="200" rows="2" placeholder="She&#39;s leaving the boardroom after winning the negotiation. Tired but victorious.">' + esc(narrative) + '</textarea>',
            '<span class="pg52-cinematic-counter" id="pg52-cinematic-counter">' + esc(String(narrative).length) + '/200</span>',
          '</label>',
          '<div class="pg52-cinematic-tags" id="pg52-cinematic-tags">',
            '<div class="pg52-cinematic-tags-head"><span class="pg52-t-micro">Visual treatment</span><em id="pg52-cinematic-treatment-limit">Pick 1-3</em></div>',
            '<div class="pg52-cinematic-tag-grid">',
              CINEMATIC_TREATMENTS.map(function(item){
                var checked = selectedTreatments.includes(item.id);
                return '<label class="pg52-cinematic-tag' + (checked ? ' selected' : '') + '"><input type="checkbox" name="g-cinematic-treatment" value="' + esc(item.id) + '"' + (checked ? ' checked' : '') + '><span>' + esc(item.label) + '</span></label>';
              }).join(''),
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function sceneOverrideValue(){
    var input = $('g-scene-override');
    return String(input ? input.value : state.generatorV5.sceneOverride || '').trim().slice(0, 500);
  }

  function sceneOverrideHtml(){
    var value = sceneOverrideValue();
    return [
      '<label class="pg52-scene-override" for="g-scene-override">',
        '<span class="pg52-t-micro">SCENE OVERRIDE — Add or override anything</span>',
        '<textarea id="g-scene-override" class="pg52-scene-override-textarea" data-pg52-scene-override rows="3" maxlength="500" placeholder="Add anything the controls above don&#39;t cover. This appends directly to the scene prompt.">' + esc(value) + '</textarea>',
        '<span class="pg52-scene-override-counter" id="pg52-scene-override-counter">' + esc(String(value.length)) + '/500</span>',
      '</label>'
    ].join('');
  }

  function aestheticTransferPack(){
    var ref = aestheticRefState();
    if (!ref.applied || !ref.aesthetic) return { enabled: false };
    return {
      enabled: true,
      id: ref.id || '',
      fileName: ref.fileName || '',
      source: 'aesthetic_ref_analysis',
      aesthetic: ref.aesthetic,
      promptModifiers: normalizeList(ref.aesthetic.promptModifiers || []),
      negativeModifiers: aestheticNegativeModifiers(),
      thumbnailDataUrl: ref.dataUrl || ''
    };
  }

  function directorBriefState(){
    var brief = state.generatorV5.directorBrief || {};
    state.generatorV5.directorBrief = Object.assign({
      text: '',
      loading: false,
      result: null,
      error: '',
      unspecified: [],
      targetShotCount: null
    }, brief);
    return state.generatorV5.directorBrief;
  }

  function directorBriefHtml(){
    var brief = directorBriefState();
    var isOpen = Boolean(brief.loading || brief.result || brief.error || brief.text);
    return [
      '<section class="pg52-director-brief" id="pg52-director-brief" aria-label="Director brief mode">',
        '<details class="pg52-director-brief-details"' + (isOpen ? ' open' : '') + '>',
          '<summary class="pg52-director-brief-summary">',
            '<span class="pg52-t-micro">DIRECTOR MODE</span>',
            '<strong>Type one brief to auto-configure this shot</strong>',
            '<em>optional</em>',
          '</summary>',
          '<form id="pg52-director-brief-form" class="pg52-director-brief-form">',
          '<div class="pg52-director-brief-row">',
              '<input id="g-director-brief" class="pg52-director-brief-input" type="text" value="' + esc(brief.text || '') + '" maxlength="360" placeholder="Aisha, Sandton rooftop, golden hour, Spring campaign" autocomplete="off">',
              '<button id="pg52-director-brief-submit" class="pg52-director-brief-btn" type="submit">DIRECT THE SHOT</button>',
            '</div>',
            '<div class="pg52-director-brief-meta"><span id="g-director-brief-counter">' + esc(String((brief.text || '').length)) + '/360</span></div>',
            '<div class="pg52-director-brief-result" id="pg52-director-brief-result" aria-live="polite"></div>',
          '</form>',
        '</details>',
      '</section>'
    ].join('');
  }

  function workflowStripHtml(){
    return [
      '<nav class="pg52-workflow-strip" aria-label="Prompt Generator V3 workflow">',
        '<a href="#pg52-wardrobe-section"><span>01</span>Wardrobe</a>',
        '<a href="#pg52-scene-section"><span>02</span>Scene</a>',
        '<a href="#pg52-scene-refs-section"><span>03</span>Refs</a>',
        '<a href="#g-route-preview"><span>04</span>Route</a>',
        '<a href="#pg52-image-result"><span>05</span>Review</a>',
      '</nav>'
    ].join('');
  }

  function openCreativeTools(focusTarget){
    var tools = $('pg52-creative-tools');
    if (!tools) return;
    var target = creativeToolFromTarget(focusTarget);
    tools.open = true;
    tools.setAttribute('data-pg52-active-tool', target);
    syncCreativeToolsTabs();
  }

  function creativeToolFromTarget(target){
    var key = String(target || '').toLowerCase();
    if (/random|smart/.test(key)) return 'randomize';
    if (/cinematic/.test(key)) return 'cinematic';
    if (/platform|composition/.test(key)) return 'platform';
    if (/override|scene-note|freeform/.test(key)) return 'scene-override';
    if (/prompt|anatomy/.test(key)) return 'prompt-anatomy';
    return 'concepts';
  }

  function creativeToolsTabsHtml(){
    var tabs = [
      ['concepts', 'Concepts'],
      ['randomize', 'Randomize'],
      ['cinematic', 'Cinematic'],
      ['platform', 'Platform'],
      ['scene-override', 'Scene Override'],
      ['prompt-anatomy', 'Prompt Anatomy']
    ];
    return '<div class="pg52-creative-tabs" role="tablist" aria-label="Creative tools">' + tabs.map(function(tab){
      return '<button class="pg52-creative-tab" type="button" role="tab" data-pg52-tool-tab="' + esc(tab[0]) + '">' + esc(tab[1]) + '</button>';
    }).join('') + '</div>';
  }

  function creativeToolPanelHtml(id, html){
    return '<section class="pg52-creative-tool-panel" data-pg52-tool-panel="' + esc(id) + '" role="tabpanel">' + html + '</section>';
  }

  function syncCreativeToolsTabs(){
    var tools = $('pg52-creative-tools');
    if (!tools) return;
    var active = creativeToolFromTarget(tools.getAttribute('data-pg52-active-tool') || 'concepts');
    tools.setAttribute('data-pg52-active-tool', active);
    tools.querySelectorAll('[data-pg52-tool-tab]').forEach(function(tab){
      var selected = tab.getAttribute('data-pg52-tool-tab') === active;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    tools.querySelectorAll('[data-pg52-tool-panel]').forEach(function(panel){
      panel.hidden = panel.getAttribute('data-pg52-tool-panel') !== active;
    });
  }

  function directorFieldLabel(field){
    return {
      character: 'character',
      characterId: 'character',
      location: 'location',
      locationId: 'location',
      lighting: 'lighting',
      shotAction: 'action',
      action: 'action',
      moodId: 'mood',
      cameraDistance: 'camera distance',
      movement: 'movement',
      props: 'props',
      campaignId: 'campaign',
      cameraStyle: 'camera style',
      sceneOverride: 'scene override',
      targetShotCount: 'shot count'
    }[field] || String(field || '').replace(/([A-Z])/g, ' $1').toLowerCase();
  }

  function renderDirectorBriefResult(){
    var brief = directorBriefState();
    var wrap = $('pg52-director-brief-result');
    var input = $('g-director-brief');
    var button = $('pg52-director-brief-submit');
    var shell = $('pg52-director-brief');
    if (input && input.value !== (brief.text || '')) input.value = brief.text || '';
    if (button) {
      button.disabled = Boolean(brief.loading);
      button.textContent = brief.loading ? 'Reading your brief...' : 'DIRECT THE SHOT';
    }
    if (shell) {
      shell.classList.toggle('is-loading', Boolean(brief.loading));
      shell.classList.toggle('has-error', Boolean(brief.error));
    }
    if (!wrap) return;
    if (brief.loading) {
      wrap.innerHTML = '<span class="pg52-director-status">Reading your brief...</span>';
      return;
    }
    if (brief.error) {
      wrap.innerHTML = '<span class="pg52-director-status pg52-director-status--error">' + esc(brief.error) + '</span>';
      return;
    }
    var result = brief.result || null;
    if (!result) {
      wrap.innerHTML = '<span class="pg52-director-status">No brief applied yet. This only configures controls; it will not generate an image.</span>';
      return;
    }
    var missing = (result.unspecified || brief.unspecified || []).map(directorFieldLabel).filter(Boolean);
    var matched = Array.isArray(result.matched) ? result.matched.slice(0, 5) : [];
    wrap.innerHTML = [
      '<div class="pg52-director-summary">',
        '<strong>' + esc(result.summary || 'Brief applied.') + '</strong>',
        '<span>Confidence ' + esc(Math.round((Number(result.confidence) || 0) * 100)) + '%</span>',
        result.targetShotCount ? '<span>Target ' + esc(result.targetShotCount) + ' shot' + (Number(result.targetShotCount) === 1 ? '' : 's') + '</span>' : '',
      '</div>',
      matched.length ? '<div class="pg52-director-matches">' + matched.map(function(item){
        return '<span>' + esc(item.label || 'Set') + ': ' + esc(item.text || item.value || '') + '</span>';
      }).join('') + '</div>' : '',
      missing.length ? '<div class="pg52-director-hints">' + missing.slice(0, 5).map(function(field){
        return '<span>Brief did not specify ' + esc(field) + ' - set manually</span>';
      }).join('') + '</div>' : ''
    ].join('');
  }

  function directorChangedControlIds(fields){
    var ids = [];
    Object.keys(fields || {}).forEach(function(key){
      var mapped = {
        characterId: 'g-char',
        locationId: 'g-location',
        customLocationText: 'g-location',
        lighting: 'g-time',
        shotAction: 'g-shot-action',
        moodId: 'g-mood',
        cameraDistance: 'g-camera-distance',
        movement: 'g-movement',
        props: 'g-props',
        campaignId: 'g-campaign',
        cameraStyle: 'g-camera',
        sceneOverride: 'g-scene-override'
      }[key];
      if (mapped && !ids.includes(mapped)) ids.push(mapped);
    });
    return ids;
  }

  function highlightDirectorChangedFields(fields){
    directorChangedControlIds(fields).forEach(function(id){
      var el = $(id);
      if (!el) return;
      var target = el.closest('.pg52-chip-group,.pg52-cmd-field,.pg52-production-settings,.pg52-action-engine') || el;
      restartTransientClass(target, 'pg52-brief-changed');
    });
  }

  function applyDirectorParsedShot(parsedShot){
    var fields = parsedShot?.fields || {};
    var patch = {
      directorBrief: {
        confidence: parsedShot?.confidence || 0,
        summary: parsedShot?.summary || '',
        targetShotCount: parsedShot?.targetShotCount || null,
        matched: parsedShot?.matched || []
      }
    };
    if (fields.characterId) patch.characterId = fields.characterId;
    if (fields.locationId) {
      patch.locationId = fields.locationId;
      patch.location = fields.customLocationText || fields.locationName || '';
      patch.locationName = fields.customLocationText || fields.locationName || '';
    } else if (fields.customLocationText) {
      patch.locationId = 'custom_location_' + String(fields.customLocationText).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      patch.location = fields.customLocationText;
      patch.locationName = fields.customLocationText;
    }
    if (fields.lighting) patch.lighting = fields.lighting;
    if (fields.shotAction) {
      patch.shotAction = fields.shotAction;
      patch.actionSuggestion = null;
      patch.actionOverride = '';
    }
    if (fields.moodId) patch.moodId = fields.moodId;
    if (fields.cameraDistance) patch.cameraDistance = fields.cameraDistance;
    if (fields.movement) patch.movement = fields.movement;
    if (Object.prototype.hasOwnProperty.call(fields, 'props')) patch.props = fields.props;
    if (fields.campaignId) patch.campaignId = fields.campaignId;
    if (fields.cameraStyle) patch.cameraStyle = fields.cameraStyle;
    if (fields.sceneOverride) patch.sceneOverride = fields.sceneOverride;
    if (parsedShot?.targetShotCount) patch.targetShotCount = parsedShot.targetShotCount;
    applyGeneratorState(patch, { source: 'director-brief' });
    highlightDirectorChangedFields(fields);
  }

  function saMomentState(){
    var current = state.generatorV5.saMoment || {};
    state.generatorV5.saMoment = Object.assign({
      activeId: '',
      name: '',
      loadedAt: 0,
      promptAddition: '',
      negativeAddition: '',
      note: '',
      wardrobeNote: ''
    }, current);
    return state.generatorV5.saMoment;
  }

  function saMomentById(id){
    return SA_CULTURAL_MOMENTS.find(function(moment){ return moment.id === id; }) || null;
  }

  function saMomentAllowedShotModes(moment){
    moment = moment || {};
    var modes = normalizeList(moment.allowedShotModes || moment.modeAffinity || []);
    if (!modes.length && moment.shotMode) modes = [moment.shotMode];
    modes = modes.map(normalizeShotMode).filter(Boolean);
    return modes.length ? uniqueList(modes) : ['vibes'];
  }

  function saMomentShotMode(moment, requestedMode){
    moment = moment || {};
    var current = normalizeShotMode(requestedMode || currentShotMode());
    var allowed = saMomentAllowedShotModes(moment);
    if (allowed.indexOf(current) >= 0) return current;
    return normalizeShotMode(moment.shotMode || allowed[0] || 'vibes');
  }

  function activeSaMomentPack(){
    var active = saMomentState();
    var moment = saMomentById(active.activeId);
    if (!moment) return null;
    return {
      id: moment.id,
      name: moment.name,
      icon: moment.icon,
      shotMode: active.shotMode || moment.shotMode,
      allowedShotModes: saMomentAllowedShotModes(moment),
      locationId: moment.locationId,
      lightingId: moment.lightingId,
      lightingOverride: moment.lightingOverride || '',
      action: moment.action,
      moodId: moment.moodId,
      moodOverride: moment.moodOverride || '',
      wardrobeNote: moment.wardrobeNote || active.wardrobeNote || '',
      promptAddition: moment.promptAddition || active.promptAddition || '',
      negativeAddition: moment.negativeAddition || active.negativeAddition || '',
      note: moment.note || active.note || '',
      loadedAt: active.loadedAt || 0
    };
  }

  function saMomentNegativeAdditions(){
    var pack = activeSaMomentPack();
    return pack && pack.negativeAddition ? [pack.negativeAddition] : [];
  }

  function saMomentSceneOverrideBlock(moment){
    if (!moment) return '';
    var lines = [
      '[SA Moment - ' + moment.name + ']',
      moment.promptAddition || ''
    ];
    if (moment.wardrobeNote) lines.push('Wardrobe note: ' + moment.wardrobeNote);
    if (moment.note) lines.push('Context note: ' + moment.note);
    lines.push('[/SA Moment]');
    return lines.filter(Boolean).join('\n');
  }

  function stripSaMomentSceneOverride(value){
    return String(value || '').replace(/\s*\[SA Moment - [^\]]+\][\s\S]*?\[\/SA Moment\]\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function mergeSaMomentSceneOverride(current, moment){
    var preserved = stripSaMomentSceneOverride(current);
    var block = saMomentSceneOverrideBlock(moment);
    if (!block) return preserved.slice(0, 500);
    if (block.length >= 500) return block.slice(0, 500);
    var room = 500 - block.length - 2;
    var kept = preserved ? preserved.slice(0, Math.max(0, room)).trim() : '';
    return [kept, block].filter(Boolean).join('\n\n').slice(0, 500);
  }

  function safeSelectValue(id, preferred, fallback){
    if (id === 'g-time') {
      var preferredLighting = normalizeLightingId(preferred);
      var fallbackLighting = normalizeLightingId(fallback);
      if (preferredLighting && lightingOptionById(preferredLighting)) return preferredLighting;
      if (fallbackLighting && lightingOptionById(fallbackLighting)) return fallbackLighting;
    }
    if (preferred && selectValueExists(id, preferred)) return preferred;
    if (fallback && selectValueExists(id, fallback)) return fallback;
    var select = $(id);
    return select?.options?.[0]?.value || fallback || preferred || '';
  }

  function ensureKnownLocationOption(id){
    var select = $('g-location');
    if (!select || !id || isCustomLocationId(id)) return;
    if (Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === id; })) return;
    var loc = resolveLocationRegistry(id);
    if (loc && loc.name) select.appendChild(new Option(loc.name, id));
  }

  function saMomentTileHtml(moment){
    var active = saMomentState().activeId === moment.id;
    return [
      '<button class="pg52-sa-moment-tile' + (active ? ' active' : '') + '" type="button" data-pg52-sa-moment="' + esc(moment.id) + '" aria-pressed="' + (active ? 'true' : 'false') + '">',
        '<span class="pg52-sa-moment-icon" aria-hidden="true">' + esc(moment.icon || '') + '</span>',
        '<span class="pg52-sa-moment-index">Moment ' + String(moment.index).padStart(2, '0') + '</span>',
        '<strong>' + esc(moment.name) + '</strong>',
        '<small>' + esc(shotModeMeta(moment.shotMode).shortLabel || shotModeMeta(moment.shotMode).label) + ' · ' + esc(locationLabelForValue(moment.locationId, moment.locationId)) + '</small>',
      '</button>'
    ].join('');
  }

  function saMomentStripHtml(){
    var pack = activeSaMomentPack();
    return [
      '<section class="pg52-sa-moment-strip" id="pg52-sa-moment-strip" aria-label="SA Moment quick select">',
        '<div class="pg52-sa-moment-head">',
          '<div><span class="pg52-t-micro">SA Moment</span><strong>Load a real cultural content setup</strong></div>',
          '<small>Starting points only. Every field stays editable.</small>',
        '</div>',
        '<div class="pg52-sa-moment-scroll" role="list">',
          SA_CULTURAL_MOMENTS.map(saMomentTileHtml).join(''),
        '</div>',
        '<div class="pg52-sa-moment-banner" id="pg52-sa-moment-banner" aria-live="polite"' + (pack ? '' : ' hidden') + '>',
          pack ? 'SA Moment loaded: ' + esc(pack.name) + ' — adjust anything you need' : '',
        '</div>',
      '</section>'
    ].join('');
  }

  function syncSaMomentStrip(){
    var strip = $('pg52-sa-moment-strip');
    if (!strip) return;
    var active = saMomentState().activeId;
    strip.querySelectorAll('[data-pg52-sa-moment]').forEach(function(tile){
      var selected = tile.getAttribute('data-pg52-sa-moment') === active;
      tile.classList.toggle('active', selected);
      tile.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    var banner = $('pg52-sa-moment-banner');
    var pack = activeSaMomentPack();
    if (banner) {
      banner.hidden = !pack;
      banner.textContent = pack ? ('SA Moment loaded: ' + pack.name + ' — adjust anything you need') : '';
    }
  }

  function highlightSaMomentChangedFields(){
    highlightDirectorChangedFields({
      locationId: true,
      lighting: true,
      shotAction: true,
      moodId: true,
      sceneOverride: true
    });
  }

  function applySaMoment(momentId){
    var moment = saMomentById(momentId);
    if (!moment) return;
    var loc = resolveLocationRegistry(moment.locationId);
    var nextShotMode = saMomentShotMode(moment);
    var lighting = safeSelectValue('g-time', moment.lightingId, 'late_afternoon');
    var mood = safeSelectValue('g-mood', moment.moodId, 'candid');
    var shotOverrides = {
      action: '',
      lighting: moment.lightingOverride || '',
      mood: moment.moodOverride || ''
    };
    var patch = {
      shotMode: nextShotMode,
      lighting: lighting,
      moodId: mood,
      shotAction: moment.action,
      actionSuggestion: null,
      actionOverride: '',
      shotOverrides: shotOverrides,
      sceneOverride: mergeSaMomentSceneOverride(sceneOverrideValue(), moment),
      saMoment: {
        activeId: moment.id,
        name: moment.name,
        shotMode: nextShotMode,
        loadedAt: Date.now(),
        promptAddition: moment.promptAddition || '',
        negativeAddition: moment.negativeAddition || '',
        note: moment.note || '',
        wardrobeNote: moment.wardrobeNote || ''
      }
    };
    if (loc && !loc.custom) {
      patch.locationId = moment.locationId;
      patch.locationName = loc.name || moment.locationId;
    }
    applyGeneratorState(patch, { source: 'sa-moment' });
    if (loc && !loc.custom) ensureKnownLocationOption(moment.locationId);
    syncSaMomentStrip();
    highlightSaMomentChangedFields();
  }

  function quickConfigState(){
    var current = state.generatorV5.quickConfig || {};
    state.generatorV5.quickConfig = Object.assign({
      activeId: '',
      name: '',
      loadedAt: 0,
      category: '',
      saTag: ''
    }, current);
    return state.generatorV5.quickConfig;
  }

  function quickConfigById(id){
    return QUICK_CONFIGS.find(function(config){ return config.id === id; }) || null;
  }

  function activeQuickConfigPack(){
    var active = quickConfigState();
    var config = quickConfigById(active.activeId);
    if (!config) return null;
    return {
      id: config.id,
      name: config.name,
      icon: config.icon,
      category: config.category,
      saTag: config.saTag || '',
      shotMode: config.shotMode,
      locationId: config.locationId || '',
      lightingId: config.lightingId || '',
      action: config.action || '',
      moodId: config.moodId || '',
      cameraDistance: config.cameraDistance || '',
      socialFinishTreatment: config.socialFinishTreatment || '',
      loadedAt: active.loadedAt || 0
    };
  }

  function quickConfigButtonHtml(){
    var pack = activeQuickConfigPack();
    return [
      '<section class="pg52-quick-config-entry" id="pg52-quick-config-entry" aria-label="Quick Configs">',
        '<button class="pg52-quick-config-open" type="button" data-pg52-open-quick-configs>',
          '<span class="pg52-t-micro">QUICK CONFIGS</span>',
          '<strong>One-tap social content setups</strong>',
          '<em>20 presets</em>',
        '</button>',
        '<div class="pg52-quick-config-banner" id="pg52-quick-config-banner" aria-live="polite"' + (pack ? '' : ' hidden') + '>',
          pack ? esc(pack.name + ' loaded — now pick your character and wardrobe') : '',
        '</div>',
      '</section>'
    ].join('');
  }

  function quickConfigCardHtml(config){
    return [
      '<button class="pg52-quick-config-card" type="button" data-pg52-quick-config="' + esc(config.id) + '" data-pg52-category="' + esc(config.category || '') + '" data-pg52-sa-tag="' + esc(config.saTag || '') + '">',
        '<span class="pg52-quick-config-icon" aria-hidden="true">' + esc(config.icon || '') + '</span>',
        '<strong>' + esc(config.name) + '</strong>',
        '<small>' + esc(config.description || '') + '</small>',
        config.saTag ? '<em>' + esc(config.saTag) + '</em>' : '',
      '</button>'
    ].join('');
  }

  function quickConfigPickerHtml(){
    var categories = [
      ['all', 'ALL'],
      ['selfie', 'SELFIE'],
      ['vibes', 'VIBES'],
      ['events', 'EVENTS'],
      ['sa_classics', 'SA CLASSICS']
    ];
    return [
      '<section class="pg52-quick-config-picker" aria-label="Quick Config picker">',
        '<div class="pg52-quick-config-picker-head">',
          '<div>',
            '<span class="pg52-t-micro">QUICK CONFIGS</span>',
            '<h2>Pick the content type first</h2>',
            '<p>One tap configures mode, location, pose, lighting, and finish. You can still edit every field after.</p>',
          '</div>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-close-quick-configs>Close</button>',
        '</div>',
        '<label class="pg52-quick-config-search">',
          '<span class="sr-only">Find a content type...</span>',
          '<input type="search" data-pg52-quick-config-search placeholder="Find a content type..." autocomplete="off">',
        '</label>',
        '<div class="pg52-quick-config-cats" role="tablist" aria-label="Quick Config categories">',
          categories.map(function(item, index){
            return '<button class="pg52-quick-config-cat ' + (index === 0 ? 'active' : '') + '" type="button" data-pg52-quick-category="' + esc(item[0]) + '" aria-pressed="' + (index === 0 ? 'true' : 'false') + '">' + esc(item[1]) + '</button>';
          }).join(''),
        '</div>',
        '<div class="pg52-quick-config-count" data-pg52-quick-count>' + QUICK_CONFIGS.length + ' content types</div>',
        '<div class="pg52-quick-config-grid">',
          QUICK_CONFIGS.map(quickConfigCardHtml).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function filterQuickConfigs(category){
    var picker = document.querySelector('.pg52-quick-config-picker');
    if (!picker) return;
    if (category) {
      picker.querySelectorAll('[data-pg52-quick-category]').forEach(function(btn){
        var active = btn.getAttribute('data-pg52-quick-category') === category;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
    var activeCategory = picker.querySelector('[data-pg52-quick-category].active')?.getAttribute('data-pg52-quick-category') || 'all';
    var query = String(picker.querySelector('[data-pg52-quick-config-search]')?.value || '').trim().toLowerCase();
    var visible = 0;
    picker.querySelectorAll('[data-pg52-quick-config]').forEach(function(card){
      var categoryMatch = activeCategory === 'all'
        || card.getAttribute('data-pg52-category') === activeCategory
        || (activeCategory === 'sa_classics' && card.getAttribute('data-pg52-sa-tag'));
      var haystack = String(card.textContent || '').toLowerCase();
      var searchMatch = !query || haystack.indexOf(query) !== -1;
      var show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) visible += 1;
    });
    var count = picker.querySelector('[data-pg52-quick-count]');
    if (count) count.textContent = visible + ' content type' + (visible === 1 ? '' : 's');
  }

  function bindQuickConfigPicker(){
    var picker = document.querySelector('.pg52-quick-config-picker');
    if (!picker) return;
    var search = picker.querySelector('[data-pg52-quick-config-search]');
    if (search) search.addEventListener('input', function(){ filterQuickConfigs(); });
    picker.querySelectorAll('[data-pg52-quick-category]').forEach(function(btn){
      btn.addEventListener('click', function(){ filterQuickConfigs(btn.getAttribute('data-pg52-quick-category') || 'all'); });
    });
    picker.querySelectorAll('[data-pg52-quick-config]').forEach(function(card){
      card.addEventListener('click', function(){
        applyQuickConfig(card.getAttribute('data-pg52-quick-config') || '');
      });
    });
    picker.querySelectorAll('[data-pg52-close-quick-configs]').forEach(function(btn){
      btn.addEventListener('click', closeQuickConfigs);
    });
    if (search && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function(){ search.focus({ preventScroll: true }); });
    } else if (search) {
      search.focus({ preventScroll: true });
    }
  }

  function openQuickConfigs(){
    if (typeof openModal !== 'function') return;
    openModal(quickConfigPickerHtml());
    bindQuickConfigPicker();
    filterQuickConfigs('all');
  }

  function closeQuickConfigs(){
    if (typeof closeModal === 'function') closeModal();
  }

  function quickConfigSceneOverrideBlock(config){
    if (!config) return '';
    return [
      '[Quick Config - ' + config.name + ']',
      config.description || '',
      config.locationId ? '' : 'Location intentionally left as current selection.',
      '[/Quick Config]'
    ].filter(Boolean).join('\n');
  }

  function stripQuickConfigSceneOverride(value){
    return String(value || '').replace(/\s*\[Quick Config - [^\]]+\][\s\S]*?\[\/Quick Config\]\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function syncQuickConfigBanner(){
    var banner = $('pg52-quick-config-banner');
    var pack = activeQuickConfigPack();
    if (banner) {
      banner.hidden = !pack;
      banner.textContent = pack ? (pack.name + ' loaded — now pick your character and wardrobe') : '';
    }
  }

  function highlightQuickConfigChangedFields(){
    highlightDirectorChangedFields({
      locationId: true,
      lighting: true,
      shotAction: true,
      moodId: true,
      cameraDistance: true
    });
  }

  function applyQuickConfig(configId){
    var config = quickConfigById(configId);
    if (!config) return;
    var loc = config.locationId ? resolveLocationRegistry(config.locationId) : null;
    var cleanedSceneOverride = stripQuickConfigSceneOverride(stripSaMomentSceneOverride(sceneOverrideValue()));
    var fallbackBlock = config.locationId && !loc ? quickConfigSceneOverrideBlock(config) : '';
    var patch = {
      shotMode: config.shotMode || 'vibes',
      shotAction: config.action || shotModeDefaultAction(config.shotMode || 'vibes'),
      actionSuggestion: null,
      actionOverride: '',
      shotOverrides: { action: '', lighting: '', props: '', mood: '' },
      sceneOverride: [cleanedSceneOverride, fallbackBlock].filter(Boolean).join('\n\n').slice(0, 500),
      quickConfig: {
        activeId: config.id,
        name: config.name,
        loadedAt: Date.now(),
        category: config.category || '',
        saTag: config.saTag || ''
      },
      saMoment: {
        activeId: '',
        name: '',
        loadedAt: 0,
        promptAddition: '',
        negativeAddition: '',
        note: '',
        wardrobeNote: ''
      }
    };
    if (config.locationId && loc && !loc.custom) {
      patch.locationId = config.locationId;
      patch.locationName = loc.name || config.locationId;
    }
    if (config.lightingId) patch.lighting = normalizeLightingId(config.lightingId);
    if (config.moodId) patch.moodId = config.moodId;
    if (config.cameraDistance) patch.cameraDistance = config.cameraDistance;
    if (config.socialFinishTreatment) patch.socialFinishTreatment = config.socialFinishTreatment;
    applyGeneratorState(patch, { source: 'quick-config' });
    closeQuickConfigs();
    syncQuickConfigBanner();
    highlightQuickConfigChangedFields();
  }

  async function runDirectorBrief(){
    var brief = directorBriefState();
    var input = $('g-director-brief');
    var text = String(input?.value || '').replace(/\s+/g, ' ').trim();
    brief.text = text;
    brief.error = '';
    if (!text) {
      brief.error = 'Write a short brief first.';
      renderDirectorBriefResult();
      return;
    }
    brief.loading = true;
    if (input) input.classList.add('pg52-field-reading');
    startAsyncOperation('directorBrief', { character: $('g-char')?.value || '' });
    wardrobeStatus('Reading your brief...');
    renderDirectorBriefResult();
    var currentState = null;
    try { currentState = generatorRecipe(buildKit()); } catch (_) {}
    try {
      var result = await fetchJsonWithTimeout('/api/director/parse-brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief: text,
          character: $('g-char')?.value || '',
          currentState: currentState
        })
      }, 9000);
      if (!result.res.ok || !result.data || result.data.ok === false) {
        throw new Error(result.data?.error || result.data?.message || 'Director brief could not be parsed.');
      }
      brief.loading = false;
      brief.result = result.data.parsedShot || null;
      brief.unspecified = brief.result?.unspecified || [];
      brief.targetShotCount = brief.result?.targetShotCount || null;
      applyDirectorParsedShot(brief.result || {});
      renderDirectorBriefResult();
      succeedAsyncOperation('directorBrief', { result: brief.result });
      notifyAsync('success', 'Director brief applied.');
      ['g-location','g-time','g-mood','g-shot-action'].forEach(function(id){
        var el = $(id);
        if (el) el.classList.add('pg52-brief-changed');
      });
    } catch (err) {
      brief.loading = false;
      brief.error = "Couldn't parse brief. Try being more specific about character, location, or lighting";
      failAsyncOperation('directorBrief', err);
      notifyAsync('error', brief.error);
      renderDirectorBriefResult();
    } finally {
      if (input) input.classList.remove('pg52-field-reading');
    }
  }

  function shotModeSelectorHtml(){
    var active = currentShotMode();
    return [
      '<section class="pg52-shot-mode-selector" id="pg52-shot-mode-selector" aria-label="Shot mode selector">',
        '<div class="pg52-shot-mode-head">',
          '<span class="pg52-t-micro">Shot mode</span>',
          '<strong>' + esc(shotModeMeta(active).label) + '</strong>',
          '<small>Choose the workflow before building the shot.</small>',
        '</div>',
        '<div class="pg52-shot-mode-scroll" role="list">',
          Object.keys(SHOT_MODES).map(function(key){
            var mode = SHOT_MODES[key];
            var selected = key === active;
            return [
              '<button class="pg52-shot-mode-card ' + (selected ? 'active' : '') + '" type="button" role="listitem" data-pg52-shot-mode="' + esc(key) + '" aria-pressed="' + (selected ? 'true' : 'false') + '">',
                '<span class="pg52-shot-mode-icon" aria-hidden="true">' + esc(mode.icon || '') + '</span>',
                '<strong>' + esc(mode.shortLabel || mode.label) + '</strong>',
                '<small>' + esc(mode.label) + '</small>',
              '</button>'
            ].join('');
          }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function crossfadeModeTitle(element, text){
    if (!element || element.textContent === text) return;
    element.classList.add('pg52-mode-title-crossfade', 'is-title-exiting');
    onMotionEndOnce(element, function(){
      element.textContent = text;
      element.classList.remove('is-title-exiting');
      restartTransientClass(element, 'is-title-entering', {
        after: function(){ element.classList.remove('pg52-mode-title-crossfade'); }
      });
    });
  }

  function syncShotModeSelector(){
    var mode = syncShotModeGlobal();
    var wrap = $('pg52-shot-mode-selector');
    if (wrap) {
      var head = wrap.querySelector('.pg52-shot-mode-head strong');
      if (head) crossfadeModeTitle(head, shotModeMeta(mode).label);
      wrap.querySelectorAll('[data-pg52-shot-mode]').forEach(function(card){
        var selected = card.getAttribute('data-pg52-shot-mode') === mode;
        card.classList.toggle('active', selected);
        card.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
    }
    var copy = shotModeSectionCopy(mode);
    var wardrobeTitle = document.querySelector('[data-pg52-mode-title="wardrobe"]');
    var sceneTitle = document.querySelector('[data-pg52-mode-title="scene"]');
    var refsTitle = document.querySelector('[data-pg52-mode-title="refs"]');
    crossfadeModeTitle(wardrobeTitle, copy.wardrobe);
    crossfadeModeTitle(sceneTitle, copy.scene);
    crossfadeModeTitle(refsTitle, copy.refs);
  }

  function syncLocationOptionsForShotMode(){
    var select = $('g-location');
    if (!select) return;
    var current = select.value || shotModeMeta(currentShotMode()).defaultLocationId || 'cafe_braam';
    var label = locationLabelForValue(current, optionText('g-location') || current);
    select.innerHTML = locationOptionsHtml();
    if (current && !Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) {
      select.appendChild(new Option(label || current, current));
    }
    select.value = current;
    markRepopulating(select);
    pulseControl(select);
    syncLocationPickerFromSelect();
  }

  function syncActionOptionsForShotMode(){
    var select = $('g-shot-action');
    if (!select) return;
    var current = modeSafeActionValue(select.value || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()));
    select.innerHTML = actionOptionsHtml(current, {});
    if (Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) {
      select.value = current;
    }
    state.generatorV5.shotAction = select.value || current || shotModeDefaultAction(currentShotMode());
    markRepopulating(select);
    pulseControl(select);
    var label = $('pg52-action-mode-label');
    if (label) label.textContent = shotModeActionLabel(currentShotMode());
    syncActionEngine();
  }

  function applyShotModeDefaults(mode, previousMode){
    mode = normalizeShotMode(mode);
    previousMode = normalizeShotMode(previousMode || 'editorial');
    var meta = shotModeMeta(mode);
    var prev = shotModeMeta(previousMode);
    var currentLocation = $('g-location')?.value || '';
    var canMoveLocation = currentLocation && !isCustomLocationId(currentLocation) && (currentLocation === prev.defaultLocationId || (previousMode === 'editorial' && currentLocation === 'cafe_braam'));
    if (canMoveLocation && meta.defaultLocationId && $('g-location')) {
      $('g-location').value = meta.defaultLocationId;
      syncLocationOptionsForShotMode();
    }
    var currentAction = $('g-shot-action')?.value || state.generatorV5.shotAction || '';
    var legacyDefaultAction = 'direct gaze, relaxed posture';
    var canMoveAction = !shotOverrideFieldValue('action') && (!currentAction || currentAction === prev.defaultAction || currentAction === legacyDefaultAction || currentAction === SHOT_ACTIONS[0]);
    if ((mode !== previousMode || canMoveAction) && $('g-shot-action')) {
      state.generatorV5.actionSuggestion = null;
      state.generatorV5.actionSuggestions = [];
      state.generatorV5.actionSuggestError = '';
      var nextAction = shotModeDefaultAction(mode);
      ensureActionOption(nextAction, 'Shot mode');
      $('g-shot-action').value = nextAction;
      state.generatorV5.shotAction = nextAction;
    }
    var currentLight = $('g-time')?.value || '';
    if ($('g-time')) {
      var normalizedLight = normalizeLightingId(currentLight);
      var shouldMoveLight = !normalizedLight || normalizedLight === normalizeLightingId(prev.defaultLighting) || normalizedLight === 'golden_am';
      syncLightingOptionsForShotMode(shouldMoveLight ? meta.defaultLighting : normalizedLight);
      if (shouldMoveLight) $('g-time').value = normalizeLightingId(meta.defaultLighting) || normalizedLight;
      state.generatorV5.time = $('g-time').value || normalizeLightingId(meta.defaultLighting) || normalizedLight;
    }
    if ($('g-camera-distance') && ($('g-camera-distance').value === prev.defaultCameraDistance || $('g-camera-distance').value === 'medium portrait')) {
      $('g-camera-distance').value = meta.defaultCameraDistance || $('g-camera-distance').value;
      state.generatorV5.cameraDistance = $('g-camera-distance').value;
    }
    if ($('g-lens') && ($('g-lens').value === prev.defaultLens || $('g-lens').value === '50mm natural perspective')) {
      $('g-lens').value = meta.defaultLens || $('g-lens').value;
      state.generatorV5.lens = $('g-lens').value;
    }
    if ($('g-camera') && ($('g-camera').value === prev.defaultCameraStyle || $('g-camera').value === 'editorial')) $('g-camera').value = meta.defaultCameraStyle || $('g-camera').value;
  }

  function setShotMode(mode, options){
    options = options || {};
    var next = normalizeShotMode(mode);
    var previous = currentShotMode();
    state.generatorV5.shotMode = next;
    syncShotModeGlobal();
    syncLocationOptionsForShotMode();
    syncActionOptionsForShotMode();
    syncLightingOptionsForShotMode();
    if (options.defaults !== false) applyShotModeDefaults(next, previous);
    syncSocialFinishTreatment();
    syncAuthenticityControls();
    applyContextIntelligence();
    syncShotModeSelector();
    renderContextIntelligence();
    renderShotSummary();
    renderConceptCards();
    renderRoutePreview(null);
    renderIdentityLockCard();
    renderPromptPreview();
    schedulePreviewImageRouteFromGenerator();
  }

  function initShotModeSelector(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    syncShotModeSelector();
    syncLocationOptionsForShotMode();
    syncActionOptionsForShotMode();
    syncLightingOptionsForShotMode();
    syncSocialFinishTreatment();
    syncAuthenticityControls();
    if (window.__pg52ShotModeSelectorBound) return;
    window.__pg52ShotModeSelectorBound = true;
    root.addEventListener('click', function(event){
      var card = event.target && event.target.closest && event.target.closest('[data-pg52-shot-mode]');
      if (!card) return;
      event.preventDefault();
      setShotMode(card.getAttribute('data-pg52-shot-mode') || 'editorial');
    });
  }

  function chipFieldHtml(id, label, options, wide){
    if (id === 'g-location') return locationPickerHtml(id, label, options, wide);
    if (id === 'g-shot-action') return actionEngineHtml();
    var overrideKey = id === 'g-time' ? 'lighting' : id === 'g-props' ? 'props' : id === 'g-mood' ? 'mood' : '';
    if (overrideKey) {
      return shotOverrideFieldHtml(Object.assign({}, SHOT_OVERRIDE_CONFIG[overrideKey], { label: label, wide: wide, lockAxis: overrideKey, lockLabel: label }), chipControlHtml(id, options));
    }
    var lock = id === 'g-camera-distance' ? axisLockButtonHtml('camera', 'Camera') : '';
    var value = $(id)?.value || '';
    return [
      '<div class="pg52-chip-group ' + (wide ? 'wide' : '') + '">',
        '<div class="pg52-field-lock-row"><span class="pg52-t-micro">' + esc(label) + '</span>' + lock + '</div>',
        chipControlHtml(id, options),
      '</div>',
    ].join('');
  }

  function textOverrideHtml(){
    return [
      '<div class="pg52-outfit-text-row">',
        '<button class="pg52-text-toggle" id="pg52-outfit-text-toggle" type="button" aria-expanded="false">',
          '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7.5 3l3 3-3 3" stroke="var(--color-current)" stroke-width="1.4" stroke-linecap="round"/></svg>',
          'Or describe the look instead',
        '</button>',
        '<div class="pg52-outfit-input-wrap" id="pg52-outfit-input-wrap" hidden>',
          '<input id="g-outfit-override" class="pg52-input" data-pg38-control="g-outfit-override" type="text" placeholder="e.g. fitted black blazer, high-waisted trousers, clean heel" autocomplete="off">',
          '<span class="pg52-input-hint">This text can override selected wardrobe images for this shot.</span>',
        '</div>',
      '</div>'
    ].join('');
  }

  function wardrobeDrawerHtml(){
    return [
      '<div class="pg52-drawer-backdrop" id="pg52-wardrobe-backdrop" hidden></div>',
      '<div class="pg52-wardrobe-drawer" id="pg52-wardrobe-drawer" hidden role="dialog" aria-modal="true" aria-labelledby="pg52-drawer-title">',
        '<div class="pg52-drawer-handle"></div>',
        '<div class="pg52-drawer-head">',
          '<h3 class="pg52-t-subtitle" id="pg52-drawer-title">Add to wardrobe</h3>',
          '<button class="pg52-drawer-close" type="button" id="pg52-drawer-close" aria-label="Close" data-pg52-close-wardrobe>×</button>',
        '</div>',
        '<div class="pg52-drawer-body">',
          '<div class="pg52-upload-zone" id="pg52-upload-zone">',
            '<input type="file" accept="image/*" id="pg52-wardrobe-file-input" class="pg52-file-input" aria-label="Upload clothing image" multiple>',
            '<div class="pg52-upload-preview" id="pg52-upload-preview" hidden><img id="pg52-upload-preview-img" alt="Upload preview"></div>',
            '<div class="pg52-upload-prompt" id="pg52-upload-prompt">',
              '<div class="pg52-upload-icon">↑</div>',
              '<p>Drop a clothing photo here<br>or click to browse</p>',
              '<span class="pg52-t-micro">Full outfit sets, individual pieces, shoes, bags, accessories</span>',
            '</div>',
          '</div>',
          '<div class="pg52-upload-queue" id="pg52-upload-queue" aria-live="polite"></div>',
          '<div class="pg52-drawer-fields">',
            '<div class="pg52-field-group"><label class="pg52-t-micro" for="pg52-wardrobe-name">Name *</label><input class="pg52-input" id="pg52-wardrobe-name" type="text" placeholder="e.g. Black fitted blazer" maxlength="80"></div>',
            '<div class="pg52-field-group"><span class="pg52-t-micro">Kind</span><div class="pg52-kind-pills">',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="clothing_set"> Full outfit</label>',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="clothing_item" checked> Item</label>',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="shoes"> Shoes</label>',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="bag"> Bag</label>',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="accessory"> Accessory</label>',
              '<label class="pg52-kind-pill"><input type="radio" name="pg52-wardrobe-kind" value="jewelry"> Jewellery</label>',
            '</div></div>',
            '<div class="pg52-field-group"><label class="pg52-t-micro" for="pg52-wardrobe-notes">Notes for the model <span>(optional)</span></label><input class="pg52-input" id="pg52-wardrobe-notes" type="text" placeholder="e.g. Ignore background. Focus on collar detail." maxlength="140"></div>',
            '<input type="hidden" id="pg52-wardrobe-slot" value="clothing_item">',
            '<input type="hidden" id="pg52-wardrobe-palette" value="">',
            '<input type="hidden" id="pg52-wardrobe-tags" value="">',
            '<div class="pg52-drawer-footer">',
              '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-close-wardrobe>Cancel</button>',
              '<button class="pg52-btn pg52-btn-sm" type="button" id="pg52-wardrobe-save-btn" disabled>Save to wardrobe</button>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function accordionHtml(id, label, body){
    return [
      '<div class="pg52-accordion" id="' + esc(id) + '">',
        '<button class="pg52-accordion-head" type="button" aria-expanded="false">',
          '<span>' + esc(label) + '</span>',
          '<svg class="pg52-acc-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 5l3 3 3-3" stroke="var(--color-current)" stroke-width="1.4" stroke-linecap="round"/></svg>',
        '</button>',
        '<div class="pg52-accordion-body" hidden>' + (body || '') + '</div>',
      '</div>'
    ].join('');
  }

  function routeControlOptions(){
    return {
      spendLane: '<option value="google_credits">Google Credits - final refs</option><option value="fal_full_ai">fal.ai Final AI - direct refs</option><option value="auto_best">Auto Best - may switch lanes</option>',
      intent: '<option value="final_character">Character Final</option><option value="broll_final">B-roll Final</option><option value="object_product_final">Object/Product Final</option><option value="no_reference_scene">No-Reference Scene</option>',
      quality: '<option value="premium">Premium final</option><option value="ultra">Ultra final</option><option value="standard">Clean final</option><option value="utility">Utility final</option>',
      aspect: '<option value="1:1">1:1 square</option><option value="4:5">4:5 portrait</option><option value="9:16">9:16 vertical</option><option value="16:9">16:9 landscape</option><option value="1.91:1">1.91:1 LinkedIn post</option><option value="4:1">4:1 banner / OOH</option><option value="3:1">3:1 email header</option><option value="1:1.41">1:1.41 A4 portrait</option>',
      realism: '<option value="hyper">Hyper-real skin + camera realism</option><option value="phone">Phone realism / social grain</option><option value="editorial">Editorial tension / premium polish</option><option value="standard">Standard realism</option>',
      template: '<option value="portrait">Portrait lock</option><option value="mixed">Mixed portrait + B-roll</option><option value="people">People Ops / records</option><option value="city">City-to-desk</option><option value="campaign">Campaign hero</option>'
    };
  }

  function restoreCapturedValues(root){
    root.querySelectorAll('script[data-pg38-value]').forEach(function(node){
      var id = node.getAttribute('data-pg38-value');
      var el = $(id);
      try {
        var value = JSON.parse(node.textContent || '""');
        if (el && value) el.value = value;
      } catch (_) {}
      node.remove();
    });
  }

  function activeShell(){
    return $('prompt-generator-52-shell') || $('prompt-generator-51-shell') || $('prompt-generator-50-shell') || $('prompt-generator-40-shell') || $('prompt-generator-38-shell');
  }

  function activeShellSelector(){
    return '#prompt-generator-52-shell,#prompt-generator-51-shell,#prompt-generator-50-shell,#prompt-generator-40-shell,#prompt-generator-38-shell';
  }

  function charKey(charId){
    return String(charId || $('g-char')?.value || 'leah').replace(/^grok.*$/i, 'grok').toLowerCase();
  }

  function normalizeClosetItem(item, index){
    item = item && typeof item === 'object' ? item : {};
    var id = String(item.id || item.name || ('outfit_' + index)).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || ('outfit_' + index);
    var image = item.image && typeof item.image === 'object' ? item.image : {};
    var imageDataUrl = image.dataUrl || item.dataUrl || item.ref || item.reference || '';
    var imageUrl = image.url || item.url || '';
    var notes = item.notes || item.garmentNotes || item.description || '';
    return {
      id: id,
      characterId: charKey(item.characterId || $('g-char')?.value || 'leah'),
      name: String(item.name || id.replace(/_/g, ' ')),
      category: String(item.category || 'custom'),
      kind: String(item.kind || item.category || 'outfit'),
      slot: String(item.slot || item.kind || 'look'),
      palette: String(item.palette || 'black, graphite, clean neutrals'),
      garments: Array.isArray(item.garments) ? item.garments.map(String).filter(Boolean).slice(0, 8) : [],
      fit: String(item.fit || 'intentional and camera-real'),
      vibe: String(item.vibe || 'premium but human'),
      avoid: Array.isArray(item.avoid) ? item.avoid.map(String).filter(Boolean).slice(0, 8) : [],
      compatibleScenes: Array.isArray(item.compatibleScenes) ? item.compatibleScenes.map(String).filter(Boolean).slice(0, 8) : [],
      tags: Array.isArray(item.tags) ? item.tags.map(String).filter(Boolean).slice(0, 12) : [],
      notes: String(notes || ''),
      image: {
        dataUrl: imageDataUrl,
        url: imageUrl,
        mimeType: image.mimeType || (String(imageDataUrl).match(/^data:([^;]+);/) || [])[1] || '',
        width: Number(image.width || 0),
        height: Number(image.height || 0)
      },
      sourceType: item.sourceType || (imageDataUrl || imageUrl ? 'character_wardrobe_upload' : 'seeded_text'),
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || '',
      ref: imageDataUrl || imageUrl || ''
    };
  }

  function closetCacheKey(){
    return 'silva_generator_closets_v1';
  }

  function cacheClosets(){
    try { localStorage.setItem(closetCacheKey(), JSON.stringify(profileClosets())); } catch (_) {}
  }

  function hydrateClosetsFromCache(){
    if (state.generatorProfileLoaded) return;
    var cached = readLocalJson(closetCacheKey(), null);
    if (cached && typeof cached === 'object') {
      state.generatorProfile.closets = Object.assign({}, cached, state.generatorProfile.closets || {});
    }
  }

  function hasWardrobeImage(item){
    return Boolean(item && (item.ref || item.image?.dataUrl || item.image?.url));
  }

  function activeWardrobeIds(){
    return Array.isArray(state.generatorV5.activeWardrobeRefs) ? state.generatorV5.activeWardrobeRefs.slice() : [];
  }

  function activeWardrobeItems(){
    var ids = activeWardrobeIds();
    if (!ids.length) return [];
    var closet = currentCloset();
    return ids.map(function(id){ return closet.find(function(item){ return item.id === id; }); }).filter(Boolean);
  }

  function compileWardrobeRefs(){
    return activeWardrobeItems()
      .filter(hasWardrobeImage)
      .map(function(item, index){
        var dataUrl = item.image?.dataUrl || item.ref || '';
        var url = item.image?.url || (/^https?:\/\//i.test(String(item.ref || '')) ? item.ref : '');
        var weight = referenceWeightFor({ key: 'wardrobe_upload_' + item.id, role: 'wardrobe', itemId: item.id, label: item.name });
        return {
          type: 'image',
          role: 'wardrobe',
          referenceKind: 'wardrobe_upload',
          label: 'WARDROBE REFERENCE ' + (index + 1) + ' / ' + String(item.name || 'uploaded clothing').toUpperCase(),
          source: 'character_wardrobe_upload',
          itemId: item.id,
          name: item.name,
          slot: item.slot,
          kind: item.kind,
          priority: 50 + index,
          weight: weight / 100,
          influenceWeight: weight,
          influenceHint: influenceHintForWeight(weight),
          dataUrl: /^data:image\//i.test(String(dataUrl)) ? dataUrl : '',
          url: url
        };
      });
  }

  function sceneRefPriority(weight){
    weight = String(weight || 'medium').toLowerCase();
    if (weight === 'low') return 20;
    if (weight === 'high') return 55;
    return 35;
  }

  function sceneRefWeightIndex(weight){
    weight = String(weight || 'medium').toLowerCase();
    if (weight === 'low') return 0;
    if (weight === 'high') return 2;
    return 1;
  }

  function sceneRefWeightFromIndex(index){
    var n = Number(index);
    if (n <= 0) return 'low';
    if (n >= 2) return 'high';
    return 'medium';
  }

  function sceneRefWeightCopy(weight){
    weight = String(weight || 'medium').toLowerCase();
    if (weight === 'low') return 'Low - general mood only, don\'t copy literally';
    if (weight === 'high') return 'High - match as closely as possible';
    return 'Medium - match the aesthetic';
  }

  function activeSceneRefs(){
    return (Array.isArray(state.generatorV5.sceneRefs) ? state.generatorV5.sceneRefs : [])
      .filter(function(ref){ return ref && /^data:image\//i.test(String(ref.dataUrl || '')); })
      .slice(0, 2);
  }

  function sceneRefToCandidate(ref){
    var label = String(ref && ref.label || '').trim() || 'environment reference';
    var weight = String(ref && ref.weight || 'medium').toLowerCase();
    return {
      id: ref.id,
      key: ref.id,
      type: 'image',
      role: 'scene_environment',
      referenceKind: 'scene_environment_upload',
      label: 'SCENE REFERENCE — ' + label,
      priority: sceneRefPriority(weight),
      dataUrl: ref.dataUrl,
      source: 'user_scene_ref_upload',
      activeDefault: true,
      sceneRefWeight: weight,
      notes: sceneRefWeightCopy(weight)
    };
  }

  function compileSceneRefs(){
    return activeSceneRefs().map(sceneRefToCandidate);
  }

  function isSceneRefFile(file){
    if (!file) return false;
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    return /^(image\/jpeg|image\/jpg|image\/png|image\/webp)$/.test(type) || /\.(jpe?g|png|webp)$/.test(name);
  }

  function setSceneRefStatus(message, isError){
    state.generatorV5.sceneRefStatus = String(message || '');
    state.generatorV5.sceneRefStatusError = Boolean(isError);
    var status = $('pg52-scene-ref-status');
    if (status) {
      status.textContent = state.generatorV5.sceneRefStatus;
      status.classList.toggle('error', Boolean(isError));
      status.hidden = !state.generatorV5.sceneRefStatus;
    }
  }

  function locationIntelTextValue(){
    return String($('pg52-location-intel-text')?.value || state.generatorV5.locationIntelText || '').trim();
  }

  function locationIntelligenceDraft(loc){
    loc = loc || resolveLocationRegistry($('g-location')?.value || 'cafe_braam') || {};
    var promptModifiers = normalizeList(loc.promptModifiers);
    var moodNatural = normalizeList(loc.moodNatural || loc.mood?.natural);
    var lines = [
      'Location intelligence: ' + (loc.name || optionText('g-location') || 'Selected location'),
      'Context: ' + [loc.environment, loc.region, loc.depthCharacter].filter(Boolean).join(' · '),
      loc.lightQuality ? 'Light: ' + loc.lightQuality : '',
      moodNatural.length ? 'Natural mood: ' + moodNatural.join(', ') : '',
      promptModifiers.length ? 'Prompt modifiers: ' + promptModifiers.join(', ') : '',
      loc.depth?.reason ? 'Composition note: ' + loc.depth.reason : '',
      loc.light?.characteristicQuality ? 'Lighting note: ' + loc.light.characteristicQuality : '',
      loc.saContext ? 'SA context: ' + loc.saContext : ''
    ];
    return lines.filter(Boolean).join('\n');
  }

  function sceneRefCardHtml(ref){
    var label = String(ref.label || '');
    var weight = String(ref.weight || 'medium').toLowerCase();
    return [
      '<article class="pg52-scene-ref-card" data-pg52-scene-ref-id="' + esc(ref.id) + '">',
        '<div class="pg52-scene-ref-thumb"><img src="' + esc(ref.dataUrl) + '" alt="' + esc(label || 'Scene reference') + '"></div>',
        '<label class="pg52-scene-ref-field">',
          '<span class="pg52-t-micro">Label this ref...</span>',
          '<input class="pg52-scene-ref-label" data-pg52-scene-ref-label="' + esc(ref.id) + '" value="' + esc(label) + '" placeholder="lighting reference" maxlength="80">',
        '</label>',
        '<label class="pg52-scene-ref-field pg52-scene-ref-weight-field">',
          '<span class="pg52-t-micro">Weight</span>',
          '<input class="pg52-scene-ref-weight" data-pg52-scene-ref-weight="' + esc(ref.id) + '" type="range" min="0" max="2" step="1" value="' + esc(sceneRefWeightIndex(weight)) + '" aria-label="Scene reference weight">',
          '<span class="pg52-scene-ref-weight-copy" data-pg52-scene-ref-weight-copy="' + esc(ref.id) + '">' + esc(sceneRefWeightCopy(weight)) + '</span>',
        '</label>',
        '<button class="pg52-scene-ref-remove" data-pg52-scene-ref-remove="' + esc(ref.id) + '" type="button">Remove</button>',
      '</article>'
    ].join('');
  }

  function renderSceneRefDock(){
    var refs = activeSceneRefs();
    var maxed = refs.length >= 2;
    var loc = resolveLocationRegistry($('g-location')?.value || 'cafe_braam') || {};
    var canPullLocation = loc && !loc.custom && loc.id;
    var status = state.generatorV5.sceneRefStatus || '';
    var intelText = locationIntelTextValue();
    return [
      '<div class="pg52-scene-ref-shell" id="pg52-scene-ref-shell">',
        '<div class="pg52-scene-ref-toolbar">',
          '<label class="pg52-scene-ref-drop ' + (maxed ? 'disabled' : '') + '" data-pg52-scene-ref-drop>',
            '<input id="pg52-scene-ref-file" class="pg52-scene-ref-file" type="file" accept="image/jpeg,image/png,image/webp" ' + (maxed ? 'disabled' : '') + '>',
            '<span class="pg52-scene-ref-plus">+</span>',
            '<strong>Drop an environment reference</strong>',
            '<small>Upload a scene ref image · jpg/png/webp · Max 2 scene refs</small>',
          '</label>',
          '<div class="pg52-scene-ref-intel">',
            '<div class="pg52-scene-ref-intel-head">',
              '<span class="pg52-t-micro">Location intelligence notes</span>',
              canPullLocation ? '<button class="pg52-btn-ghost pg52-btn-sm" id="pg52-pull-location-intel" data-pg52-pull-location-intel type="button">Pull from location</button>' : '',
            '</div>',
            '<textarea id="pg52-location-intel-text" class="pg52-scene-ref-intel-text" rows="4" placeholder="Pull from location or write what the environment, lighting, architecture, and palette should do.">' + esc(intelText) + '</textarea>',
          '</div>',
        '</div>',
        '<div class="pg52-scene-ref-status ' + (state.generatorV5.sceneRefStatusError ? 'error' : '') + '" id="pg52-scene-ref-status" ' + (status ? '' : 'hidden') + '>' + esc(status) + '</div>',
        '<div class="pg52-scene-ref-cards">',
          refs.length ? refs.map(sceneRefCardHtml).join('') : '<div class="pg52-scene-ref-empty">No environment refs yet. Add up to two refs for lighting, palette, architecture, or mood.</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function refreshSceneRefViews(renderDock){
    if (renderDock) renderReferenceDock();
    renderPromptPreview();
    renderRoutePreview(null);
    schedulePreviewImageRouteFromGenerator();
  }

  function addSceneRefFile(file){
    if (!isSceneRefFile(file)) {
      setSceneRefStatus('Scene refs accept jpg, png, or webp images only.', true);
      return Promise.resolve(false);
    }
    var refs = activeSceneRefs();
    if (refs.length >= 2) {
      setSceneRefStatus('Max 2 scene refs. Remove one before adding another.', true);
      return Promise.resolve(false);
    }
    setSceneRefStatus('Optimizing image...', false);
    return optimizeImageFile(file, 'scene').then(function(dataUrl){
      var id = 'scene_ref_' + Date.now() + '_' + Math.random().toString(16).slice(2, 7);
      var label = String(file.name || '').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80);
      state.generatorV5.sceneRefs = refs.concat({
        id: id,
        label: label,
        weight: 'medium',
        dataUrl: dataUrl,
        createdAt: new Date().toISOString()
      }).slice(0, 2);
      setSceneRefStatus('Scene reference added to the generation queue.', false);
      refreshSceneRefViews(true);
      return true;
    }).catch(function(err){
      setSceneRefStatus(String(err?.message || err || 'Scene ref upload failed.'), true);
      return false;
    });
  }

  function removeSceneRef(id){
    state.generatorV5.sceneRefs = activeSceneRefs().filter(function(ref){ return ref.id !== id; });
    if (state.generatorV5.referenceWeights) delete state.generatorV5.referenceWeights[id];
    setSceneRefStatus('Scene reference removed.', false);
    refreshSceneRefViews(true);
  }

  function updateSceneRef(id, patch, options){
    options = options || {};
    state.generatorV5.sceneRefs = activeSceneRefs().map(function(ref){
      if (ref.id !== id) return ref;
      return Object.assign({}, ref, patch || {});
    });
    var updated = activeSceneRefs().find(function(ref){ return ref.id === id; });
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'weight')) {
      var copy = document.querySelector('[data-pg52-scene-ref-weight-copy="' + String(id || '').replace(/"/g, '\\"') + '"]');
      if (copy && updated) copy.textContent = sceneRefWeightCopy(updated.weight);
    }
    refreshSceneRefViews(Boolean(options.render));
  }

  function pullLocationIntelligence(){
    var loc = resolveLocationRegistry($('g-location')?.value || 'cafe_braam');
    if (!loc || loc.custom) {
      setSceneRefStatus('Choose a known registry location before pulling intelligence.', true);
      return;
    }
    state.generatorV5.locationIntelText = locationIntelligenceDraft(loc);
    var textarea = $('pg52-location-intel-text');
    if (textarea) textarea.value = state.generatorV5.locationIntelText;
    setSceneRefStatus('Location intelligence pulled into editable scene notes.', false);
    refreshSceneRefViews(false);
  }

  function aestheticRefState(){
    var ref = state.generatorV5.aestheticRef || {};
    state.generatorV5.aestheticRef = Object.assign({
      id: '',
      dataUrl: '',
      fileName: '',
      status: '',
      error: '',
      aesthetic: null,
      applied: false
    }, ref);
    return state.generatorV5.aestheticRef;
  }

  function aestheticNegativeModifiers(){
    return normalizeList(state.generatorV5.aestheticNegativeModifiers || []);
  }

  function isAestheticRefFile(file){
    if (!file) return false;
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    return /^(image\/jpeg|image\/jpg|image\/png|image\/webp)$/.test(type) || /\.(jpe?g|png|webp)$/.test(name);
  }

  function setAestheticRefStatus(status, error){
    var ref = aestheticRefState();
    ref.status = String(status || '');
    ref.error = String(error || '');
  }

  function compressImageDataUrl(dataUrl, maxEdge, quality){
    maxEdge = maxEdge || 1400;
    quality = quality || 0.82;
    dataUrl = String(dataUrl || '');
    if (!/^data:image\//i.test(dataUrl) || dataUrl.length < 5200000) return Promise.resolve(dataUrl);
    return new Promise(function(resolve){
      try {
        var img = new Image();
        img.onload = function(){
          try {
            var scale = Math.min(1, maxEdge / Math.max(img.width || maxEdge, img.height || maxEdge));
            var canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round((img.width || maxEdge) * scale));
            canvas.height = Math.max(1, Math.round((img.height || maxEdge) * scale));
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            var compressed = canvas.toDataURL('image/jpeg', quality);
            resolve(compressed && compressed.length < dataUrl.length ? compressed : dataUrl);
          } catch {
            resolve(dataUrl);
          }
        };
        img.onerror = function(){ resolve(dataUrl); };
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  }

  function aestheticSummaryRow(label, value){
    return value ? '<div class="pg52-aesthetic-ref-row"><span>' + esc(label) + '</span><p>' + esc(value) + '</p></div>' : '';
  }

  function renderAestheticResult(){
    var source = state.generatorV5.refSource || 'home';
    if (source === 'aesthetic') renderReferenceDock();
    renderPromptPreview();
    renderRoutePreview(null);
    schedulePreviewImageRouteFromGenerator();
  }

  function aestheticResultCardHtml(ref){
    var aesthetic = ref.aesthetic || null;
    if (!aesthetic) return '';
    return [
      '<article class="pg52-aesthetic-ref-result" id="pg52-aesthetic-ref-result">',
        '<div class="pg52-aesthetic-ref-result-head">',
          '<span class="pg52-t-micro">Aesthetic extracted</span>',
          '<strong>' + esc(aesthetic.aestheticLabel || 'editorial') + '</strong>',
        '</div>',
        aestheticSummaryRow('Lighting', aesthetic.lighting),
        aestheticSummaryRow('Palette', aesthetic.colorPalette),
        aestheticSummaryRow('Mood', aesthetic.mood),
        aestheticSummaryRow('Camera', aesthetic.cameraStyle),
        aestheticSummaryRow('Environment', aesthetic.environment),
        '<div class="pg52-aesthetic-ref-mods">',
          '<span class="pg52-t-micro">Prompt modifiers</span>',
          '<p>' + esc(normalizeList(aesthetic.promptModifiers || []).join(' · ')) + '</p>',
        '</div>',
        '<div class="pg52-aesthetic-ref-actions">',
          '<button class="pg52-btn pg52-btn-sm" type="button" data-pg52-apply-aesthetic>APPLY TO THIS SHOT</button>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-discard-aesthetic>Discard</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  function aestheticRefDockHtml(){
    var ref = aestheticRefState();
    var busy = ref.status === 'analysing';
    return [
      '<div class="pg52-aesthetic-ref-shell" id="pg52-aesthetic-ref-shell">',
        '<div class="pg52-aesthetic-ref-top">',
          '<label class="pg52-aesthetic-ref-drop ' + (busy ? 'disabled' : '') + '" data-pg52-aesthetic-drop>',
            '<input id="pg52-aesthetic-ref-file" class="pg52-aesthetic-ref-file" type="file" accept="image/jpeg,image/png,image/webp" ' + (busy ? 'disabled' : '') + '>',
            '<span class="pg52-aesthetic-ref-plus">+</span>',
            '<strong>Drop an image whose aesthetic you want to match</strong>',
            '<small>Upload aesthetic reference · jpg/png/webp · text transfer only</small>',
          '</label>',
          ref.dataUrl ? [
            '<div class="pg52-aesthetic-ref-preview">',
              '<img src="' + esc(ref.dataUrl) + '" alt="' + esc(ref.fileName || 'Aesthetic reference') + '">',
              '<div><span class="pg52-t-micro">Aesthetic ref</span><strong>' + esc(ref.fileName || 'Uploaded reference') + '</strong><em>' + esc(ref.applied ? 'Applied to shot' : (busy ? 'Analysing aesthetic...' : 'Ready')) + '</em></div>',
            '</div>'
          ].join('') : '',
        '</div>',
        busy ? '<div class="pg52-aesthetic-ref-loading"><span class="pg52-gen-scan"></span><strong>Analysing aesthetic...</strong></div>' : '',
        ref.error ? '<div class="pg52-aesthetic-ref-status error">' + esc(ref.error) + '</div>' : '',
        (!busy && ref.status && !ref.error && !ref.aesthetic) ? '<div class="pg52-aesthetic-ref-status">' + esc(ref.status) + '</div>' : '',
        aestheticResultCardHtml(ref),
        !ref.dataUrl ? '<div class="pg52-aesthetic-ref-empty">Use this for a campaign image, film still, mood board, palette, lighting reference, or photo whose visual language you want to transfer.</div>' : '',
      '</div>'
    ].join('');
  }

  function addAestheticRefFile(file){
    if (!isAestheticRefFile(file)) {
      state.generatorV5.aestheticRef = Object.assign({}, aestheticRefState(), {
        status: '',
        error: 'Aesthetic refs accept jpg, png, or webp images only.'
      });
      renderAestheticResult();
      return Promise.resolve(false);
    }
    return fileToDataUrl(file).then(function(dataUrl){
      return compressImageDataUrl(dataUrl).then(function(finalDataUrl){
        state.generatorV5.aestheticRef = {
          id: 'aesthetic_ref_' + Date.now(),
          dataUrl: finalDataUrl,
          fileName: String(file.name || 'aesthetic reference').slice(0, 120),
          status: 'analysing',
          error: '',
          aesthetic: null,
          applied: false
        };
        state.generatorV5.aestheticNegativeModifiers = [];
        renderAestheticResult();
        return analyzeAestheticRef();
      });
    }).catch(function(err){
      state.generatorV5.aestheticRef = Object.assign({}, aestheticRefState(), {
        status: '',
        error: String(err?.message || err || 'Aesthetic reference upload failed.')
      });
      renderAestheticResult();
      return false;
    });
  }

  function analyzeAestheticRef(){
    var ref = aestheticRefState();
    if (!ref.dataUrl) return Promise.resolve(false);
    setAestheticRefStatus('analysing', '');
    renderAestheticResult();
    return fetchJsonWithTimeout('/api/ai/analyze-aesthetic-ref', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64: ref.dataUrl })
    }, 14000).then(function(result){
      if (!result.res.ok || !result.data?.ok || !result.data.aesthetic) {
        throw new Error(result.data?.error || 'Aesthetic analysis failed.');
      }
      ref = aestheticRefState();
      ref.status = 'ready';
      ref.error = '';
      ref.aesthetic = result.data.aesthetic;
      ref.source = result.data.source || 'unknown';
      ref.applied = false;
      renderAestheticResult();
      return true;
    }).catch(function(err){
      ref = aestheticRefState();
      ref.status = '';
      ref.error = String(err?.message || err || 'Aesthetic analysis failed.');
      renderAestheticResult();
      return false;
    });
  }

  function selectValueExists(id, value){
    var select = $(id);
    if (!select || value == null) return false;
    return Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === value; });
  }

  function firstAestheticMatch(text, rules){
    text = String(text || '').toLowerCase();
    var match = (rules || []).find(function(rule){ return rule[0].test(text); });
    return match ? match[1] : '';
  }

  function aestheticControlPatch(aesthetic){
    var text = [
      aesthetic?.lighting,
      aesthetic?.colorPalette,
      aesthetic?.mood,
      aesthetic?.cameraStyle,
      aesthetic?.environment,
      aesthetic?.aestheticLabel,
      normalizeList(aesthetic?.promptModifiers || []).join(' ')
    ].join(' ').toLowerCase();
    var patch = {};
    var lighting = firstAestheticMatch(text, [
      [/blue hour|dusk|night|neon|cool blue/, 'blue_hour'],
      [/morning|dawn|sunrise/, 'golden_am'],
      [/overcast|cloud|soft diffused|diffuse daylight/, 'midday'],
      [/studio|flash|spotlight|artificial|gel|controlled light/, 'indoor_artificial'],
      [/window|interior daylight|indoor daylight/, 'indoor_day'],
      [/afternoon|sunset|golden|amber|warm directional/, 'golden_pm']
    ]);
    var mood = firstAestheticMatch(text, [
      [/quiet authority|composed|controlled|restraint/, 'composed'],
      [/sharp|intense|focus|direct/, 'sharp'],
      [/candid|documentary|observational|real/, 'candid'],
      [/pensive|introspective|melancholy|stillness/, 'pensive'],
      [/confident|power|authority|bold/, 'confident'],
      [/movement|energy|dynamic|motion/, 'in_motion'],
      [/soft|gentle|tender|warmth/, 'soft']
    ]);
    var distance = firstAestheticMatch(text, [
      [/tight|close-up|close portrait/, 'tight portrait'],
      [/full body|environmental|wide subject/, 'full body environmental'],
      [/three-quarter|3\/4|three quarter/, 'three-quarter body'],
      [/waist|half body/, 'waist-up candid'],
      [/medium portrait|portrait/, 'medium portrait']
    ]);
    var lens = firstAestheticMatch(text, [
      [/35mm|wide|environmental/, '35mm environmental realism'],
      [/85mm|portrait compression|compressed/, '85mm portrait compression'],
      [/phone|mobile|real feed/, 'phone camera realism'],
      [/documentary|raw|observational/, 'editorial documentary lens'],
      [/50mm|natural perspective|medium portrait/, '50mm natural perspective']
    ]);
    var cameraStyle = firstAestheticMatch(text, [
      [/cinematic|film|anamorphic/, 'cinematic'],
      [/documentary|raw|observational/, 'documentary'],
      [/phone|mobile|real feed/, 'phone_real'],
      [/portrait lens|85mm|compression/, 'portrait_lens'],
      [/editorial|fashion|campaign|commercial/, 'editorial']
    ]);
    if (selectValueExists('g-time', lighting)) patch.lighting = lighting;
    if (selectValueExists('g-mood', mood)) patch.moodId = mood;
    if (selectValueExists('g-camera-distance', distance)) patch.cameraDistance = distance;
    if (selectValueExists('g-lens', lens)) patch.lens = lens;
    if (selectValueExists('g-camera', cameraStyle)) patch.cameraStyle = cameraStyle;
    return patch;
  }

  function aestheticTransferBlock(aesthetic){
    var modifiers = normalizeList(aesthetic?.promptModifiers || []).slice(0, 6);
    return modifiers.length ? 'Aesthetic transfer:\n' + modifiers.map(function(item){ return '- ' + item; }).join('\n') : '';
  }

  function removeAestheticTransferBlock(text){
    return String(text || '').replace(/\n*\s*Aesthetic transfer:\s*(?:\n\s*-\s*[^\n]+)+/ig, '').trim();
  }

  function applyAestheticToShot(){
    var ref = aestheticRefState();
    var aesthetic = ref.aesthetic;
    if (!aesthetic) {
      ref.error = 'Upload and analyse an aesthetic reference before applying it.';
      renderAestheticResult();
      return;
    }
    var patch = aestheticControlPatch(aesthetic);
    var currentScene = removeAestheticTransferBlock(sceneOverrideValue());
    var transferBlock = aestheticTransferBlock(aesthetic);
    patch.sceneOverride = [currentScene, transferBlock].filter(Boolean).join('\n\n').slice(0, 500);
    ref.applied = true;
    ref.status = 'applied';
    ref.error = '';
    state.generatorV5.aestheticNegativeModifiers = normalizeList(aesthetic.negativeModifiers || []).slice(0, 5);
    applyGeneratorState(patch, { source: 'aesthetic-transfer' });
    ['g-time','g-mood','g-camera-distance','g-lens','g-camera','g-scene-override'].forEach(function(id){
      var target = $(id)?.closest?.('.pg52-chip-group') || $(id);
      if (!target) return;
      restartTransientClass(target, 'pg52-brief-changed');
    });
    renderAestheticResult();
  }

  function discardAestheticRef(){
    var cleanedScene = removeAestheticTransferBlock(sceneOverrideValue());
    state.generatorV5.aestheticRef = {
      id: '',
      dataUrl: '',
      fileName: '',
      status: '',
      error: '',
      aesthetic: null,
      applied: false
    };
    state.generatorV5.aestheticNegativeModifiers = [];
    applyGeneratorState({ sceneOverride: cleanedScene }, { source: 'aesthetic-discard' });
    renderAestheticResult();
  }

  function selectedWardrobeIdSet(){
    var set = {};
    activeWardrobeIds().forEach(function(id){ set[id] = true; });
    return set;
  }

  function profileClosets(){
    return (state.generatorProfile && typeof state.generatorProfile.closets === 'object' && state.generatorProfile.closets) || {};
  }

  function closetForCharacter(charId){
    var key = charKey(charId);
    var seeded = (CHARACTER_CLOSET_SEEDS[key] || CHARACTER_CLOSET_SEEDS.leah || []).map(normalizeClosetItem);
    var saved = Array.isArray(profileClosets()[key]) ? profileClosets()[key].map(normalizeClosetItem) : [];
    var seen = {};
    return saved.concat(seeded).filter(function(item){
      if (!item || !item.id || seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    });
  }

  function currentCloset(){
    return closetForCharacter($('g-char')?.value || 'leah');
  }

  function selectedOutfitId(){
    var current = $('g-outfit')?.value || state.generatorV5.outfitId || '';
    var closet = currentCloset();
    if (!closet.some(function(item){ return item.id === current; })) current = closet[0]?.id || '';
    return current;
  }

  function selectedWardrobePack(){
    var closet = currentCloset();
    var selected = closet.find(function(item){ return item.id === selectedOutfitId(); }) || closet[0] || normalizeClosetItem({});
    var override = String($('g-outfit-override')?.value || state.generatorV5.outfitOverride || '').trim();
    return {
      version: 'wardrobe-pack-v1',
      id: selected.id,
      name: selected.name,
      category: selected.category,
      palette: selected.palette,
      garments: selected.garments,
      fit: selected.fit,
      vibe: selected.vibe,
      avoid: selected.avoid,
      compatibleScenes: selected.compatibleScenes,
      reference: selected.ref || '',
      activeImageRefs: activeWardrobeItems().map(function(item){
        return {
          id: item.id,
          name: item.name,
          slot: item.slot,
          source: item.sourceType || 'character_wardrobe_upload',
          hasImage: hasWardrobeImage(item)
        };
      }),
      override: override,
      prompt: override || [
        selected.name + ': ' + (selected.garments || []).join(', '),
        'palette ' + selected.palette,
        'fit ' + selected.fit,
        'vibe ' + selected.vibe,
        selected.avoid && selected.avoid.length ? 'avoid ' + selected.avoid.join(', ') : ''
      ].filter(Boolean).join('; ')
    };
  }

  function readLocalJson(key, fallback){
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function imageSrcKind(src){
    src = String(src || '').trim();
    if (!src) return '';
    if (/^data:image\//i.test(src)) return 'dataUrl';
    if (/^(https?:|\/|\.\/|\.\.\/|assets\/|public\/|blob:)/i.test(src)) return 'url';
    if (/^vault:/i.test(src)) return 'vault';
    return '';
  }

  function addRefCandidate(list, item){
    if (!item) return;
    var src = item.dataUrl || item.url || item.preview || item.ref || '';
    var kind = imageSrcKind(src);
    if (!kind) return;
    var role = String(item.role || item.type || 'supporting_ref').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'supporting_ref';
    var label = item.label || role.replace(/_/g, ' ').toUpperCase();
    var key = [charKey(), role, item.key || item.source || list.length].join(':').toLowerCase().replace(/[^a-z0-9:_-]+/g, '_');
    var ref = {
      id: item.id || item.itemId || item.key || key,
      key: key,
      type: item.type === 'image' ? 'image' : role,
      role: role,
      label: String(label),
      source: String(item.source || 'assets'),
      priority: Number(item.priority || (list.length + 1)),
      activeDefault: Boolean(item.activeDefault),
      preview: src,
      referenceKind: item.referenceKind || role,
      itemId: item.itemId || '',
      name: item.name || '',
      notes: item.notes || '',
      sceneRefWeight: item.sceneRefWeight || '',
      weight: item.weight,
      influenceWeight: item.influenceWeight,
      influenceHint: item.influenceHint
    };
    if (kind === 'dataUrl') ref.dataUrl = src;
    else if (kind === 'url') ref.url = src;
    else ref.dataUrl = src;
    list.push(ref);
  }

  function homeStateForCharacter(charId){
    var key = charKey(charId);
    var pulse = readLocalJson('silva_studio_pulse_v395', { homes: {} }) || { homes: {} };
    var home = (pulse.homes && pulse.homes[key]) || {};
    var legacyAssets = (window.STATE && STATE.homeAssets && STATE.homeAssets[key]) || {};
    var profile = (window.STATE && STATE.homeProfiles && STATE.homeProfiles[key]) || {};
    home.home = home.home || {};
    home.outfits = Array.isArray(home.outfits) ? home.outfits : [];
    home.items = home.items || {};
    return { key: key, home: home, legacyAssets: legacyAssets, profile: profile };
  }

  function homeSystemPack(charId){
    var stateForChar = homeStateForCharacter(charId);
    var h = stateForChar.home.home || {};
    var legacy = stateForChar.legacyAssets || {};
    return {
      version: 'home-system-pack-v1',
      characterId: stateForChar.key,
      usageRule: stateForChar.home.usageRule || 'Use selectively when relevant to the final shot. Do not force every home asset into every image.',
      notes: stateForChar.home.notes || '',
      rooms: {
        livingRoom: h.livingRoom || legacy.room || '',
        bedroom: h.bedroom || '',
        workspace: h.workspace || '',
        kitchen: h.kitchen || '',
        bathroom: h.bathroom || '',
        exterior: h.exterior || legacy.yard || ''
      },
      outfits: (stateForChar.home.outfits || []).filter(Boolean),
      items: Object.assign({}, stateForChar.home.items || {})
    };
  }

  function referenceCandidatesForCurrent(){
    var char = $('g-char')?.value || 'leah';
    var out = [];
    var identityRefs = identityRefsForCurrent();
    identityRefs.forEach(function(ref, index){
      if (refIsRejectedDoNotRepeat(ref)) return;
      var isFace = refIsPrimaryFace(ref);
      var isBody = refIsPrimaryBody(ref);
      var isSupport = refIsIdentitySupport(ref);
      addRefCandidate(out, {
        key: ref.key || index,
        role: isFace ? 'primary_face' : isBody ? 'primary_body' : (ref.role || ref.type || 'identity_support'),
        label: isFace ? 'PRIMARY FACE TILE / IDENTITY AUTHORITY' : isBody ? 'PRIMARY BODY TILE / BUILD AUTHORITY' : (ref.label || (isSupport ? 'CONTROLLED IDENTITY SUPPORT REFERENCE' : 'SUPPORTING REFERENCE')),
        source: ref.source || 'assets_vault',
        priority: Number(ref.priority || (isFace ? 1 : isBody ? 2 : isSupport ? 10 + index : 60 + index)),
        activeDefault: Boolean(isFace || isBody || ref.activeDefault),
        identityRole: ref.identityRole || '',
        blockedForGeneration: Boolean(ref.blockedForGeneration),
        qualityWarnings: Array.isArray(ref.qualityWarnings) ? ref.qualityWarnings : [],
        width: ref.width || 0,
        height: ref.height || 0,
        dataUrl: ref.dataUrl || '',
        url: ref.url || ref.preview || '',
        preview: ref.preview || ref.dataUrl || ref.url || ''
      });
    });

    compileSceneRefs().forEach(function(ref){
      addRefCandidate(out, ref);
    });

    var homePack = homeSystemPack(char);
    Object.entries(homePack.rooms || {}).forEach(function(pair, index){
      var name = pair[0];
      var src = pair[1];
      addRefCandidate(out, {
        key: 'home_' + name,
        role: 'home_' + name,
        label: ('HOME ' + name.replace(/([A-Z])/g, ' $1') + ' REFERENCE').toUpperCase(),
        source: 'home_system',
        priority: 30 + index,
        activeDefault: false,
        url: src,
        dataUrl: src
      });
    });
    (homePack.outfits || []).forEach(function(src, index){
      addRefCandidate(out, {
        key: 'home_outfit_' + index,
        role: 'outfit_reference',
        label: 'HOME SYSTEM OUTFIT SLOT ' + (index + 1),
        source: 'home_system',
        priority: 20 + index,
        activeDefault: false,
        url: src,
        dataUrl: src
      });
    });
    Object.entries(homePack.items || {}).forEach(function(pair, index){
      addRefCandidate(out, {
        key: 'item_' + pair[0],
        role: 'item_' + pair[0],
        label: ('ITEM / PROP ' + pair[0]).toUpperCase(),
        source: 'home_system',
        priority: 40 + index,
        activeDefault: false,
        url: pair[1],
        dataUrl: pair[1]
      });
    });

    var wardrobe = selectedWardrobePack();
    if (wardrobe.reference) {
      addRefCandidate(out, {
        key: 'wardrobe_' + wardrobe.id,
        role: 'wardrobe_reference',
        label: 'ACTIVE OUTFIT / WARDROBE REFERENCE',
        source: 'wardrobe_pack',
        priority: 18,
        activeDefault: false,
        url: wardrobe.reference,
        dataUrl: wardrobe.reference
      });
    }
    compileWardrobeRefs().forEach(function(ref, index){
      addRefCandidate(out, Object.assign({}, ref, {
        key: 'wardrobe_upload_' + ref.itemId,
        priority: 22 + index,
        activeDefault: true
      }));
    });
    return out.sort(function(a, b){ return a.priority - b.priority; });
  }

  function isReferenceSelected(ref){
    var selected = state.generatorV5.selectedRefs || {};
    if (Object.prototype.hasOwnProperty.call(selected, ref.key)) return Boolean(selected[ref.key]);
    return Boolean(ref.activeDefault);
  }

  function strictIdentityLockEnabled(){
    var intent = getCurrentImageIntent();
    return state.generatorV5.strictIdentityLock !== false && String(intent || 'final_character') === 'final_character';
  }

  function referenceRoleText(ref){
    return String((ref && (ref.role || ref.type || ref.referenceKind || ref.label)) || '').toLowerCase();
  }

  function referenceSourceText(ref){
    return String((ref && (ref.dataUrl || ref.url || ref.preview || ref.sourceUrl)) || '').trim();
  }

  function refIsPrimaryFace(ref){
    var role = referenceRoleText(ref);
    var label = String(ref && ref.label || '');
    var identityRole = String(ref && ref.identityRole || '').toLowerCase();
    return identityRole === 'primary_face'
      || role === 'face'
      || role === 'primary_face'
      || /face_contact_sheet/.test(role)
      || /^primary face/i.test(label)
      || /PRIMARY FACE/.test(label);
  }

  function refIsPrimaryBody(ref){
    var role = referenceRoleText(ref);
    var label = String(ref && ref.label || '');
    var identityRole = String(ref && ref.identityRole || '').toLowerCase();
    return identityRole === 'primary_body'
      || role === 'body'
      || role === 'primary_body'
      || /body_contact_sheet/.test(role)
      || /^full body/i.test(label)
      || /PRIMARY BODY|BODY\/BUILD|FULL BODY/.test(label);
  }

  function refIsWardrobe(ref){
    return /wardrobe|outfit|clothing/.test(referenceRoleText(ref)) || /wardrobe/i.test(String(ref && ref.source || ''));
  }

  function refIsIdentitySupport(ref){
    var text = [referenceRoleText(ref), ref && ref.identityRole, ref && ref.referenceKind, ref && ref.label].join(' ').toLowerCase();
    return /identity_support|profile_side|expression_closeups|hair_texture|identity_profile|identity_expression|identity_texture|approved_identity_output|approved_gold/.test(text);
  }

  function refIsRejectedDoNotRepeat(ref){
    var text = [referenceRoleText(ref), ref && ref.identityRole, ref && ref.referenceKind, ref && ref.label, ref && ref.source].join(' ').toLowerCase();
    return Boolean(ref && ref.blockedForGeneration) || /rejected_do_not_repeat|negative_identity_example|do not repeat|rejected output/.test(text);
  }

  function refIsSceneEnvironment(ref){
    var text = [referenceRoleText(ref), ref && ref.source, ref && ref.label].join(' ').toLowerCase();
    return /scene_environment|scene ref|environment|user_scene_ref_upload/.test(text);
  }

  function refHasUsableSource(ref){
    var src = referenceSourceText(ref);
    if (!src || /^vault:/i.test(src)) return false;
    return /^(data:image\/|https?:\/\/|blob:|\.?\/?assets\/|\/assets\/)/i.test(src);
  }

  function strictIdentityPriority(ref, index){
    if (refIsPrimaryFace(ref)) return 1;
    if (refIsPrimaryBody(ref)) return 2;
    if (refIsIdentitySupport(ref)) return 10 + index;
    if (refIsWardrobe(ref)) return 20 + index;
    if (/identity/.test(referenceRoleText(ref))) return 40 + index;
    return 80 + index;
  }

  function sortStrictIdentityRefs(refs){
    return (Array.isArray(refs) ? refs : []).slice().sort(function(a, b){
      var pa = strictIdentityPriority(a, 0);
      var pb = strictIdentityPriority(b, 0);
      if (pa !== pb) return pa - pb;
      return Number(a.priority || 99) - Number(b.priority || 99);
    });
  }

  function controlledStrictIdentityRefs(refs){
    refs = sortStrictIdentityRefs((Array.isArray(refs) ? refs : []).filter(function(ref){ return !refIsRejectedDoNotRepeat(ref); }));
    var face = refs.filter(refIsPrimaryFace).slice(0, 1);
    var body = refs.filter(refIsPrimaryBody).slice(0, 1);
    var support = refs.filter(function(ref){ return !refIsPrimaryFace(ref) && !refIsPrimaryBody(ref) && refIsIdentitySupport(ref); }).slice(0, 4);
    var wardrobe = refs.filter(function(ref){ return !refIsPrimaryFace(ref) && !refIsPrimaryBody(ref) && refIsWardrobe(ref); }).slice(0, 2);
    var other = refs.filter(function(ref){ return !refIsPrimaryFace(ref) && !refIsPrimaryBody(ref) && !refIsIdentitySupport(ref) && !refIsWardrobe(ref); }).slice(0, 1);
    return face.concat(body, support, wardrobe, other);
  }

  function activeReferencePack(){
    if (!checked('g-attach-refs', true)) return [];
    var strict = strictIdentityLockEnabled();
    var selected = referenceCandidatesForCurrent().filter(isReferenceSelected);
    selected = selected.filter(function(ref){ return !refIsRejectedDoNotRepeat(ref); });
    if (strict && !state.generatorV5.strictIdentityAllowSceneRefs) {
      selected = selected.filter(function(ref){ return !refIsSceneEnvironment(ref); });
    }
    if (strict) selected = controlledStrictIdentityRefs(selected);
    return selected
      .map(function(ref, index){
        var weight = referenceWeightFor(ref);
        return Object.assign({}, ref, {
          priority: strict ? strictIdentityPriority(ref, index) : (ref.role === 'scene_environment' ? ref.priority : index + 1),
          referenceKind: ref.role || ref.type,
          active: true,
          weight: weight / 100,
          influenceWeight: weight,
          influenceHint: influenceHintForWeight(weight)
        });
      });
  }

  function routeSupportsStrictIdentityRefs(model, refCount){
    model = model || activeRoutedModel();
    if (!model || !model.supportsImageToImage) return false;
    if (Number(refCount || 0) > 1 && !model.supportsMultiReference) return false;
    var maxRefs = number(model.maxReferenceImages, 0);
    if (maxRefs && Number(refCount || 0) > maxRefs) return false;
    var route = currentRoutePreview();
    var strategy = String(route?.referenceStrategy || '').toLowerCase();
    if (strategy && /text_to_image|no_reference/.test(strategy)) return false;
    if (model.providerAdapter === 'google' && refCount > 0 && strategy && strategy !== 'google_direct_reference_images') return false;
    return true;
  }

  function identityQaStatusForCard(){
    var raw = window._lastImageRouteResult?.routeResult || {};
    var verdict = String(raw.identityVerdict || '').toLowerCase();
    var score = normalizeIdentityScore100(raw.identityScore);
    var hasEvidence = Boolean(raw.identityQaProviderModel || raw.identityQaChecked || raw.identityQaSource || raw.identityComparison);
    if ((verdict === 'looks_aligned' || verdict === 'pass') && hasEvidence && (!Number.isFinite(score) || score >= 90)) {
      return { label: 'Verified by QA', state: 'ready' };
    }
    if (verdict === 'mismatch_suspected' || raw.identityAccepted === false || (Number.isFinite(score) && score < 75)) {
      return { label: 'QA mismatch suspected', state: 'blocked' };
    }
    if (raw.identityVerdict || Number.isFinite(score)) return { label: 'QA not verified', state: 'review' };
    return { label: 'QA not verified', state: 'muted' };
  }

  function identityRiskAssessment(){
    var refsEnabled = checked('g-attach-refs', true);
    var refs = activeReferencePack();
    var allSelected = referenceCandidatesForCurrent().filter(isReferenceSelected);
    var face = refs.find(refIsPrimaryFace);
    var body = refs.find(refIsPrimaryBody);
    var riskyRefs = allSelected.filter(refIsSceneEnvironment);
    var selectedRejected = allSelected.filter(refIsRejectedDoNotRepeat);
    var supportRefs = refs.filter(function(ref){ return refIsIdentitySupport(ref) && !refIsPrimaryFace(ref) && !refIsPrimaryBody(ref); });
    var selectedIdentitySupport = allSelected.filter(function(ref){ return refIsIdentitySupport(ref) && !refIsPrimaryFace(ref) && !refIsPrimaryBody(ref); });
    var qualityWarnings = refs.reduce(function(acc, ref){
      if (Array.isArray(ref.qualityWarnings)) {
        ref.qualityWarnings.forEach(function(warning){
          if (warning && acc.indexOf(warning) < 0) acc.push(warning);
        });
      }
      return acc;
    }, []);
    var unresolved = refs.filter(function(ref){ return !refHasUsableSource(ref); });
    var routeModel = activeRoutedModel();
    var strict = strictIdentityLockEnabled();
    var exact = String(getCurrentImageIntent() || '') === 'final_character';
    var routeSupports = routeSupportsStrictIdentityRefs(routeModel, refs.length);
    var payloadOrderSafe = identityPayloadOrderSafe(refs);
    var issues = [];
    var fixes = [];
    var warnings = [];

    if (!strict) {
      issues.push('Strict Identity Lock is off for a final character shot.');
      fixes.push('Keep Strict Lock on when the image must match the selected face and body.');
    }
    if (!exact) {
      issues.push('The route intent is not exact final character mode.');
      fixes.push('Set Job to Character Final before spending credits on identity-critical output.');
    }
    if (!refsEnabled) {
      issues.push('Identity references are switched off.');
      fixes.push('Turn on Include refs so the face/body authorities are sent.');
    }
    if (!face) {
      issues.push('Primary face reference is missing from the outgoing reference pack.');
      fixes.push('Keep the face ref active or repair the character face tile.');
    } else if (!refHasUsableSource(face)) {
      issues.push('Primary face reference is not resolvable.');
      fixes.push('Repair the face ref so it resolves to an asset URL or base64 image.');
    }
    if (!body) {
      issues.push('Primary body/build reference is missing from the outgoing reference pack.');
      fixes.push('Keep the body ref active or repair the body/build tile.');
    } else if (!refHasUsableSource(body)) {
      issues.push('Primary body/build reference is not resolvable.');
      fixes.push('Repair the body ref so it resolves to an asset URL or base64 image.');
    }
    if (unresolved.length) {
      issues.push('The outgoing pack still contains unresolved reference placeholders.');
      fixes.push('Rebuild the prompt or repair missing refs before generation.');
    }
    if (strict && refs.length >= 2 && !payloadOrderSafe) {
      issues.push('The outgoing strict identity payload is not face-first and body-second.');
      fixes.push('Rebuild the reference pack so primary face and primary body are the first two images.');
    }
    if (!routeSupports) {
      issues.push('The selected route is not safe for strict direct-reference identity generation.');
      fixes.push('Use Nano Banana Pro / Google direct reference images or another multi-reference route.');
    }
    if (selectedRejected.length) {
      warnings.push('Rejected / do-not-repeat examples are stored for memory only and are never sent to generation.');
    }
    if (riskyRefs.length && strict && !state.generatorV5.strictIdentityAllowSceneRefs) {
      warnings.push('Scene/environment refs are excluded from Strict Lock payloads by default. Use location text or scene notes instead.');
    }
    if (!supportRefs.length && face && body) {
      warnings.push('Identity pack has only primary face/body. Add Profile/Side or Expression Closeups if this character keeps drifting.');
    }
    if (selectedIdentitySupport.length > supportRefs.length) {
      warnings.push('Extra support refs were capped to prevent identity dilution. Face/body stay first.');
    }
    if (qualityWarnings.length) {
      warnings.push('Identity ref quality warning: ' + qualityWarnings[0]);
    }

    var qa = identityQaStatusForCard();
    var status = issues.length ? 'blocked' : (warnings.length ? 'review' : 'ready');
    return {
      ok: !issues.length,
      strict: strict,
      exactCharacter: exact,
      status: status,
      label: issues.length ? 'Blocked' : (warnings.length ? 'Needs review' : 'Ready'),
      modeLabel: 'Strict Identity Lock',
      issues: issues,
      fixes: fixes,
      warnings: warnings,
      refs: refs,
      refCount: refs.length,
      faceRef: face || null,
      bodyRef: body || null,
      riskyRefs: riskyRefs,
      supportRefs: supportRefs,
      selectedIdentitySupport: selectedIdentitySupport,
      qualityWarnings: qualityWarnings,
      unresolvedRefs: unresolved,
      payloadOrderSafe: payloadOrderSafe,
      routeSupportsDirectRefs: routeSupports,
      selectedModel: routeModel,
      qaStatus: qa
    };
  }

  function identityCheckRow(label, ok, note){
    return '<div class="pg52-identity-lock-check ' + (ok ? 'ok' : 'bad') + '"><span></span><strong>' + esc(label) + '</strong><em>' + esc(note || (ok ? 'ready' : 'blocked')) + '</em></div>';
  }

  function identityPayloadOrderSafe(refs){
    refs = Array.isArray(refs) ? refs : [];
    return refs.length >= 2 && refIsPrimaryFace(refs[0]) && refIsPrimaryBody(refs[1]);
  }

  function identityPayloadPreviewItems(refs){
    return (Array.isArray(refs) ? refs : []).slice(0, 6).map(function(ref, index){
      var role = refIsPrimaryFace(ref) ? 'Face authority' : refIsPrimaryBody(ref) ? 'Body authority' : refIsWardrobe(ref) ? 'Wardrobe ref' : 'Support ref';
      var usable = refHasUsableSource(ref);
      return [
        '<li class="' + (usable ? 'ready' : 'blocked') + '">',
          '<span>' + esc(String(index + 1).padStart(2, '0')) + '</span>',
          '<strong>' + esc(role) + '</strong>',
          '<em>' + esc((ref && (ref.name || ref.label || ref.role || ref.type)) || 'reference') + '</em>',
          '<b>' + esc(usable ? 'ready' : 'unresolved') + '</b>',
        '</li>'
      ].join('');
    }).join('');
  }

  function identityPayloadPreviewHtml(assessment){
    var refs = assessment?.refs || [];
    var safeOrder = identityPayloadOrderSafe(refs);
    var items = identityPayloadPreviewItems(refs);
    return [
      '<div class="pg52-identity-payload-preview ' + (safeOrder ? 'ready' : 'blocked') + '">',
        '<div><span>Outgoing identity payload</span><strong>Identity Payload Preview</strong><em>' + esc(safeOrder ? 'face first, body second, wardrobe after' : 'face/body order needs repair') + '</em></div>',
        items ? '<ol>' + items + '</ol>' : '<p>No outgoing refs are ready yet.</p>',
      '</div>'
    ].join('');
  }

  function identityRiskStatusHtml(assessment){
    assessment = assessment || identityRiskAssessment();
    var stateClass = assessment.status === 'ready' ? 'ready' : (assessment.status === 'blocked' ? 'blocked' : 'review');
    var qaClass = assessment.qaStatus?.state === 'ready' ? 'ready' : (assessment.qaStatus?.state === 'blocked' ? 'blocked' : 'review');
    var issueHtml = assessment.issues.length
      ? '<div class="pg52-identity-lock-alert"><strong>Generation blocked before credits.</strong><span>' + esc(assessment.issues[0]) + '</span><em>' + esc(assessment.fixes[0] || 'Fix identity refs or route selection first.') + '</em></div>'
      : '';
    var warningHtml = assessment.warnings.length
      ? '<div class="pg52-identity-lock-note">' + esc(assessment.warnings[0]) + '</div>'
      : '<div class="pg52-identity-lock-note">Face/body refs dominate. Wardrobe follows. Aesthetic refs stay text-only.</div>';
    return [
      '<div class="pg52-identity-lock-head">',
        '<div><span class="pg52-t-micro">Identity Lock</span><strong>' + esc(assessment.modeLabel) + '</strong></div>',
        '<span class="pg52-identity-lock-pill ' + stateClass + '">' + esc(assessment.label) + '</span>',
      '</div>',
      '<div class="pg52-identity-lock-grid">',
        identityCheckRow('Face ref', Boolean(assessment.faceRef && refHasUsableSource(assessment.faceRef)), assessment.faceRef ? 'present' : 'missing'),
        identityCheckRow('Body ref', Boolean(assessment.bodyRef && refHasUsableSource(assessment.bodyRef)), assessment.bodyRef ? 'present' : 'missing'),
        identityCheckRow('Direct-ref route', Boolean(assessment.routeSupportsDirectRefs), assessment.selectedModel?.displayName || 'route'),
        identityCheckRow('Exact character', Boolean(assessment.exactCharacter && assessment.strict), assessment.refCount + ' refs'),
      '</div>',
      identityPayloadPreviewHtml(assessment),
      '<div class="pg52-identity-lock-qa ' + qaClass + '"><span>QA status</span><strong>' + esc(assessment.qaStatus?.label || 'QA not verified') + '</strong></div>',
      '<div class="pg52-identity-score-wrap">' + identityScoreCircleHtml(latestIdentityScore()) + '</div>',
      issueHtml,
      warningHtml
    ].join('');
  }

  function renderIdentityLockCard(){
    var card = $('pg52-identity-lock-card');
    if (!card) return;
    try {
      card.innerHTML = identityRiskStatusHtml(identityRiskAssessment());
    } catch (err) {
      card.innerHTML = '<div class="pg52-identity-lock-alert"><strong>Identity Lock unavailable.</strong><span>Refresh the generator and rebuild the prompt before spending credits.</span></div>';
      console.warn('Identity lock card render failed', err);
    }
  }

  function selectedReferencePackSummary(){
    var refs = activeReferencePack();
    return {
      version: 'reference-pack-v5.2',
      count: refs.length,
      roles: refs.map(function(ref){ return ref.role || ref.type; }),
      references: refs
    };
  }

  function renderReferenceDock(){
    var candidateGrid = $('pg52-ref-candidates');
    var dock = $('pg52-ref-dock');
    if (candidateGrid || dock) {
      var refs52 = referenceCandidatesForCurrent();
      var active52 = activeReferencePack();
      var source = state.generatorV5.refSource || 'home';
      if (source === 'aesthetic') {
        if (candidateGrid) candidateGrid.innerHTML = aestheticRefDockHtml();
        if ($('pg52-ref-dock-counts')) {
          var activeParts = [];
          var identityCount = active52.filter(function(ref){ return /face|body|identity/i.test(ref.role || ref.type || ''); }).length;
          var wardrobeCount = active52.filter(function(ref){ return /wardrobe/i.test(ref.role || ''); }).length;
          var sceneCount = active52.filter(function(ref){ return ref.role === 'scene_environment'; }).length;
          if (identityCount) activeParts.push(identityCount + ' identity');
          if (wardrobeCount) activeParts.push(wardrobeCount + ' wardrobe');
          if (sceneCount) activeParts.push(sceneCount + ' scene');
          $('pg52-ref-dock-counts').textContent = activeParts.length ? activeParts.join(' · ') : '0 refs';
        }
        if ($('pg52-ref-dock-tray')) {
          $('pg52-ref-dock-tray').innerHTML = active52.map(function(ref){
            var src = ref.preview || ref.dataUrl || ref.url || '';
            var weight = referenceWeightFor(ref);
            return src ? [
              '<div class="pg52-ref-weight-control">',
                '<div class="pg52-dock-ref-thumb" data-role="' + esc(ref.role || ref.type || 'ref') + '"><img src="' + esc(src) + '" alt="' + esc(ref.label || 'reference') + '"></div>',
                '<label class="pg52-ref-weight-slider-wrap">',
                  '<input type="range" min="10" max="100" step="5" value="' + esc(weight) + '" class="pg52-ref-weight-slider" data-pg52-ref-weight="' + esc(ref.key || ref.itemId || ref.label || '') + '" aria-label="' + esc((ref.role || ref.type || 'Reference') + ' influence weight') + '">',
                  '<span class="pg52-ref-weight-value">' + esc(weight) + '%</span>',
                '</label>',
              '</div>'
            ].join('') : '';
          }).join('');
        }
        cascadeRefReveal(candidateGrid);
        cascadeRefReveal($('pg52-ref-dock-tray'));
        return;
      }
      var visibleRefs = refs52.filter(function(ref){
        if (source === 'scene') return ref.role === 'scene_environment';
        if (source === 'assets') return !/^home_/i.test(ref.role || '') && !/wardrobe|item_|outfit/i.test(ref.role || '');
        return /^home_/i.test(ref.role || '') || /wardrobe|item_|outfit/i.test(ref.role || '');
      });
      if (!visibleRefs.length) visibleRefs = refs52;
      if (candidateGrid) {
        candidateGrid.innerHTML = source === 'scene' ? renderSceneRefDock() : visibleRefs.length ? visibleRefs.map(function(ref){
          var selected = isReferenceSelected(ref);
          var src = ref.preview || ref.dataUrl || ref.url || '';
          return [
            '<label class="pg52-ref-candidate ' + (selected ? 'selected' : '') + '">',
              '<input type="checkbox" data-pg51-ref-toggle="' + esc(ref.key) + '"' + (selected ? ' checked' : '') + '>',
              src ? '<img src="' + esc(src) + '" alt="' + esc(ref.label) + '">' : '<span class="pg52-ref-placeholder"></span>',
              '<span class="pg52-ref-candidate-label">' + esc(ref.role || ref.type || 'ref') + '</span>',
            '</label>'
          ].join('');
        }).join('') : '<div class="pg52-ref-empty">No Home System or Assets refs found for this character yet.</div>';
      }
      if ($('pg52-ref-dock-counts')) {
        var counts = {};
        active52.forEach(function(ref){
          var role = /face|body|identity/i.test(ref.role || ref.type || '') ? 'identity' : /wardrobe/i.test(ref.role || '') ? 'wardrobe' : /^home_|item_|outfit/i.test(ref.role || '') ? 'scene' : 'support';
          counts[role] = (counts[role] || 0) + 1;
        });
        var parts = Object.keys(counts).map(function(key){ return counts[key] + ' ' + key; });
        $('pg52-ref-dock-counts').textContent = parts.length ? parts.join(' · ') : '0 refs';
      }
      if ($('pg52-ref-dock-tray')) {
        $('pg52-ref-dock-tray').innerHTML = active52.map(function(ref){
          var src = ref.preview || ref.dataUrl || ref.url || '';
          var weight = referenceWeightFor(ref);
          return src ? [
            '<div class="pg52-ref-weight-control">',
              '<div class="pg52-dock-ref-thumb" data-role="' + esc(ref.role || ref.type || 'ref') + '"><img src="' + esc(src) + '" alt="' + esc(ref.label || 'reference') + '"></div>',
              '<label class="pg52-ref-weight-slider-wrap">',
                '<input type="range" min="10" max="100" step="5" value="' + esc(weight) + '" class="pg52-ref-weight-slider" data-pg52-ref-weight="' + esc(ref.key || ref.itemId || ref.label || '') + '" aria-label="' + esc((ref.role || ref.type || 'Reference') + ' influence weight') + '">',
                '<span class="pg52-ref-weight-value">' + esc(weight) + '%</span>',
              '</label>',
            '</div>'
          ].join('') : '';
        }).join('');
      }
      cascadeRefReveal(candidateGrid);
      cascadeRefReveal($('pg52-ref-dock-tray'));
      return;
    }
    var wrap = $('pg51-reference-dock');
    if (!wrap) return;
    var refs = referenceCandidatesForCurrent();
    var active = activeReferencePack();
    var groups = [
      ['Identity', refs.filter(function(ref){ return /face|body|identity/i.test(ref.role || ref.type || ref.label); })],
      ['Home + room', refs.filter(function(ref){ return /^home_/i.test(ref.role || ''); })],
      ['Outfit + items', refs.filter(function(ref){ return /outfit|wardrobe|item_/i.test(ref.role || ''); })]
    ];
    wrap.innerHTML = [
      '<div class="pg51-ref-head">',
        '<span class="pg3-readiness-pill ' + (active.length ? 'ready' : 'missing') + '">' + esc(active.length ? (active.length + ' active refs') : 'no refs active') + '</span>',
        '<button class="btn btn-ghost btn-sm" type="button" onclick="nav(\'homes\')">Home System</button>',
        '<button class="btn btn-ghost btn-sm" type="button" onclick="nav(\'assets\')">Assets Vault</button>',
      '</div>',
      groups.map(function(group){
        var items = group[1];
        if (!items.length) return '';
        return [
          '<section class="pg51-ref-group">',
            '<div class="pg51-ref-group-title">' + esc(group[0]) + '</div>',
            '<div class="pg51-ref-list">',
              items.map(function(ref){
                var selected = isReferenceSelected(ref);
                return [
                  '<label class="pg51-ref-token ' + (selected ? 'active' : '') + '">',
                    '<input type="checkbox" data-pg51-ref-toggle="' + esc(ref.key) + '"' + (selected ? ' checked' : '') + '>',
                    ref.preview ? '<img src="' + esc(ref.preview) + '" alt="' + esc(ref.label) + '">' : '<span class="pg51-ref-ph"></span>',
                    '<span><strong>' + esc(ref.label) + '</strong><em>' + esc(ref.source || 'reference') + '</em></span>',
                  '</label>'
                ].join('');
              }).join(''),
            '</div>',
          '</section>'
        ].join('');
      }).join('') || '<div class="pg3-warning">No usable Home/Assets references found yet. Open Assets Vault or Home System to add them.</div>'
    ].join('');
  }

  function renderShotSummary(){
    var wrap = $('pg51-shot-summary');
    if (!wrap) return;
    var kit;
    try { kit = buildKit(); } catch (_) { kit = null; }
    var wardrobe = selectedWardrobePack();
    var scene = scenePackFromControls();
    var route = routeContext();
    var model = activeRoutedModel();
    wrap.innerHTML = [
      '<div class="pg51-shot-title">' + esc((kit?.character?.name || getCharSafe($('g-char')?.value).name || optionText('g-char') || 'Character') + ' in ' + (scene.location || optionText('g-location') || 'the selected scene')) + '</div>',
      '<div class="pg51-shot-tags">',
        '<span>' + esc(wardrobe.name || 'wardrobe') + '</span>',
        '<span>' + esc(scene.action || 'action') + '</span>',
        '<span>' + esc(scene.cameraDistance || 'camera') + '</span>',
        '<span>' + esc(scene.lighting || 'light') + '</span>',
        '<span>' + esc(model?.displayName || route.modelId) + '</span>',
      '</div>'
    ].join('');
  }

  function outfitOptionsHtml(){
    return currentCloset().map(function(item){
      return '<option value="' + esc(item.id) + '">' + esc(item.name) + ' · ' + esc(item.category || 'wardrobe') + '</option>';
    }).join('');
  }

  function scenePackFromControls(){
    var curatedAction = $('g-shot-action')?.value || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()) || SHOT_ACTIONS[0] || '';
    var overrides = {
      action: shotOverrideFieldValue('action'),
      lighting: shotOverrideFieldValue('lighting'),
      props: shotOverrideFieldValue('props'),
      mood: shotOverrideFieldValue('mood')
    };
    var actionOverride = overrides.action;
    var finalAction = actionOverride || curatedAction;
    var cinematicPack = cinematicPackFromControls();
    var aestheticTransfer = aestheticTransferPack();
    var sceneOverride = sceneOverrideValue();
    var platformIntel = platformIntelligencePayload(currentPlatformIntelligence());
    var currentAspect = getCurrentImageAspectRatio();
    var shotMode = currentShotMode();
    var locationId = $('g-location')?.value || 'cafe_braam';
    var loc = resolveLocationRegistry(locationId) || {};
    var socialLocation = isSocialMediaLocation(loc);
    var shotModeVoice = getShotModeVoice(shotMode);
    var activeShotModePromptVoice = shotMode === 'editorial' && socialLocation ? socialShotModePromptVoice(shotMode) : shotModeVoice.promptPrefix;
    var saMoment = activeSaMomentPack();
    var quickConfig = activeQuickConfigPack();
    var lightingId = normalizeLightingId($('g-time')?.value || state.generatorV5.time || shotModeMeta(shotMode).defaultLighting || 'golden_am');
    var lightingEntry = lightingOptionById(lightingId);
    var lightingLabel = lightingEntry?.label || optionText('g-time') || lightingId || 'natural light';
    var lightingPhrase = lightingPromptPhrase(lightingId) || lightingLabel;
    var socialFinish = socialFinishTreatmentPack(shotMode);
    var authenticityPack = authenticityPackFromControls(shotMode);
    platformIntel.selectedAspectRatio = currentAspect;
    var scenePack = {
      version: 'scene-pack-v1',
      shotMode: shotMode,
      shotModeLabel: shotModeMeta(shotMode).label,
      shotModePromptVoice: activeShotModePromptVoice,
      socialMediaLocation: socialLocation,
      locationVibe: loc.vibe || '',
      locationId: locationId,
      location: optionText('g-location') || 'Johannesburg',
      action: finalAction,
      actionSource: selectedActionSource(curatedAction, actionOverride),
      actionOverride: actionOverride,
      curatedAction: curatedAction,
      cameraDistance: $('g-camera-distance')?.value || state.generatorV5.cameraDistance,
      lens: $('g-lens')?.value || state.generatorV5.lens,
      lightingId: lightingId,
      lightingLabel: lightingLabel,
      lightingPromptPhrase: overrides.lighting || lightingPhrase,
      lightingRegistryEntry: lightingEntry ? {
        id: lightingEntry.id,
        label: lightingEntry.label,
        promptPhrase: lightingEntry.promptPhrase,
        bestFor: normalizeList(lightingEntry.bestFor || []),
        group: lightingEntry.group || ''
      } : null,
      lighting: overrides.lighting || lightingLabel,
      locationReferenceText: locationIntelTextValue(),
      moodId: $('g-mood')?.value || state.generatorV5.mood || 'sharp',
      mood: overrides.mood || optionText('g-mood') || 'present',
      movement: $('g-movement')?.value || state.generatorV5.movement,
      props: overrides.props || $('g-props')?.value || state.generatorV5.props,
      overrides: overrides,
      sceneOverride: sceneOverride,
      platformCrop: currentAspect,
      platformIntelligence: platformIntel,
      authenticityPack: authenticityPack,
      captionEnergyGuide: null,
      realismIntensity: $('g-realism')?.value || 'hyper'
    };
    scenePack.captionEnergyGuide = shotMode === 'editorial' ? null : captionEnergyGuide(scenePack);
    if (socialFinish) scenePack.socialFinishTreatment = socialFinish;
    if (quickConfig) scenePack.quickConfig = quickConfig;
    if (saMoment) scenePack.saMoment = saMoment;
    if (cinematicPack.enabled) scenePack.cinematicPack = cinematicPack;
    if (aestheticTransfer.enabled) scenePack.aestheticTransfer = aestheticTransfer;
    return scenePack;
  }

  function generatorRecipe(kit){
    var wardrobePack = selectedWardrobePack();
    var wardrobeImageRefs = compileWardrobeRefs();
    var scenePack = scenePackFromControls();
    var aestheticTransfer = scenePack.aestheticTransfer || aestheticTransferPack();
    var aestheticNegative = aestheticTransfer.enabled ? normalizeList(aestheticTransfer.negativeModifiers || []) : aestheticNegativeModifiers();
    var shotModeVoice = getShotModeVoice(scenePack.shotMode || currentShotMode());
    var shotModeNegative = normalizeList(shotModeVoice.negativeAdditions || []);
    var socialFinishNegative = socialFinishTreatmentNegativeAdditions(scenePack.shotMode || currentShotMode());
    var authenticityPack = scenePack.authenticityPack || authenticityPackFromControls(scenePack.shotMode || currentShotMode());
    var authenticityNegative = authenticityNegativeAdditions(authenticityPack);
    var saMoment = scenePack.saMoment || activeSaMomentPack();
    var quickConfig = scenePack.quickConfig || activeQuickConfigPack();
    var saMomentNegative = normalizeList(saMomentNegativeAdditions());
    var referencePack = selectedReferencePackSummary();
    var recipe = {
      version: 'prompt-contract-v5.2',
      jobType: kit?.route?.intent || getCurrentImageIntent(),
      characterId: $('g-char')?.value || 'leah',
      characterName: getCharSafe($('g-char')?.value || 'leah').name || $('g-char')?.value || 'Leah Mokoena',
      identityMode: kit?.refCount > 0 ? 'exact_character' : 'written_identity',
      spendLane: getCurrentImageSpendLane(),
      selectedModel: getCurrentImageModel(),
      referencePack: referencePack,
      homeSystemPack: homeSystemPack($('g-char')?.value || 'leah'),
      wardrobePack: wardrobePack,
      wardrobeImageRefs: compileWardrobeRefs(),
      activeWardrobeIds: activeWardrobeIds(),
      wardrobeTextOverride: wardrobePack.override || '',
      scenePack: scenePack,
      shotMode: scenePack.shotMode || currentShotMode(),
      shotModePromptVoice: scenePack.shotModePromptVoice || shotModePromptVoice(),
      shotModeCompilerVoice: shotModeVoice,
      locationReferenceText: scenePack.locationReferenceText || '',
      authenticityPack: authenticityPack,
      captionEnergyGuide: (scenePack.shotMode || currentShotMode()) === 'editorial' ? null : (scenePack.captionEnergyGuide || captionEnergyGuide(scenePack)),
      lockedFields: Object.assign({}, state.generatorV5.locks),
      variationSeed: state.generatorV5.variationSeed || 0,
      smartRandomize: state.generatorV5.smartRandomize ? {
        seed: state.generatorV5.smartRandomize.seed || String(state.generatorV5.variationSeed || ''),
        mode: state.generatorV5.smartRandomize.mode || 'safe',
        locks: Object.assign({}, state.generatorV5.smartRandomize.axisLocks || {}),
        dna: ''
      } : null,
      outputFormat: 'raw_photo',
      mustNotRender: [
        'social media frame',
        'Instagram UI',
        'username',
        'caption text',
        'white border',
        'phone screenshot',
        'poster',
        'watermark',
        'cartoon',
        'illustration',
        'avatar',
        'generic AI face',
        'beauty-filter drift'
      ].concat(aestheticNegative, shotModeNegative, authenticityNegative)
    };
    if (scenePack.socialFinishTreatment) recipe.socialFinishTreatment = scenePack.socialFinishTreatment;
    if (quickConfig) recipe.quickConfig = quickConfig;
    recipe.mustNotRender = normalizeList(recipe.mustNotRender).concat(socialFinishNegative);
    if (saMoment) recipe.saMoment = saMoment;
    recipe.mustNotRender = normalizeList(recipe.mustNotRender).concat(saMomentNegative);
    if (scenePack.cinematicPack) recipe.cinematicPack = scenePack.cinematicPack;
    if (aestheticTransfer.enabled) recipe.aestheticTransfer = {
      source: aestheticTransfer.source,
      fileName: aestheticTransfer.fileName,
      aesthetic: aestheticTransfer.aesthetic,
      promptModifiers: normalizeList(aestheticTransfer.promptModifiers || []),
      negativeModifiers: aestheticNegative
    };
    if (recipe.smartRandomize) recipe.smartRandomize.dna = encodeShotDna(recipe);
    return recipe;
  }

  function socialSourceRealismGuidance(scenePack, platformIntel, shootProfile){
    var platformLabel = platformIntel?.label || optionText('g-platform') || 'social destination';
    var action = scenePack?.action || optionText('g-shot-action') || 'a natural in-between moment';
    var posture = shootProfile?.defaultPosture || 'grounded, not over-posed';
    return [
      'Real social source photo: raw camera capture for later posting, not a rendered app post.',
      'The frame should feel like a believable behind-the-feed photograph with natural lens limits, imperfect human timing, and no design overlay.',
      'Platform target: ' + platformLabel + '; compose for the destination while keeping the image itself clean.',
      'Human moment: ' + action + '; posture stays ' + posture + '.'
    ].join(' ');
  }

  function optionList(items, current){
    return items.map(function(value){
      return '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(value) + '</option>';
    }).join('');
  }

  function actionCategoryFor(value){
    value = String(value || '');
    return allActionCategories().find(function(group){ return (group.actions || []).includes(value); }) || null;
  }

  function currentModeSuggestionActions(){
    return normalizeList((state.generatorV5.actionSuggestions || []).map(function(item){ return item.action; }));
  }

  function modeSafeActionValue(value){
    var current = String(value || '').trim();
    var modeActions = shotModeActions(currentShotMode());
    var suggestionActions = currentModeSuggestionActions();
    var loadedActions = normalizeList([
      activeQuickConfigPack()?.action,
      activeSaMomentPack()?.action
    ]);
    if (!current || (modeActions.length && !modeActions.includes(current) && !suggestionActions.includes(current) && !loadedActions.includes(current))) {
      current = shotModeDefaultAction(currentShotMode()) || modeActions[0] || SHOT_ACTIONS[0] || '';
    }
    return current;
  }

  function actionOptionsHtml(current, ranks){
    current = modeSafeActionValue(current || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()) || SHOT_ACTIONS[0] || '');
    ranks = ranks || {};
    var groups = shotModeActionCategories(currentShotMode());
    var html = groups.map(function(group){
      return [
        '<optgroup label="' + esc(group.label) + '">',
          (group.actions || []).map(function(action){
            var meta = ranks[action] || {};
            return '<option value="' + esc(action) + '"' + (action === current ? ' selected' : '') + ' data-pg52-rank="' + esc(meta.rank || '') + '" data-pg52-reason="' + esc(meta.reason || '') + '">' + esc(action) + '</option>';
          }).join(''),
        '</optgroup>'
      ].join('');
    }).join('');
    var suggestionActions = currentModeSuggestionActions().filter(function(action){
      return !actionCategoryFor(action);
    });
    if (suggestionActions.length) {
      html += '<optgroup label="AI Suggested">' + suggestionActions.map(function(action){
        return '<option value="' + esc(action) + '"' + (action === current ? ' selected' : '') + ' data-pg52-rank="recommended">' + esc(action) + '</option>';
      }).join('') + '</optgroup>';
    }
    if (current && !shotModeActions(currentShotMode()).includes(current) && !suggestionActions.includes(current)) {
      html += '<optgroup label="Current"><option value="' + esc(current) + '" selected>' + esc(current) + '</option></optgroup>';
    }
    return html;
  }

  function ensureActionOption(action, label){
    var select = $('g-shot-action');
    action = String(action || '').trim();
    if (!select || !action) return;
    if (Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === action; })) return;
    var group = select.querySelector('optgroup[label="AI Suggested"]') || document.createElement('optgroup');
    if (!group.parentElement) {
      group.setAttribute('label', label || 'AI Suggested');
      select.appendChild(group);
    }
    group.appendChild(new Option(action, action));
  }

  function selectedActionSource(selectedAction, override){
    if (String(override || '').trim()) return 'free_text';
    var suggestion = state.generatorV5.actionSuggestion;
    if (suggestion && suggestion.action === selectedAction) return 'ai_suggest';
    return actionCategoryFor(selectedAction) ? 'curated' : 'custom_select';
  }

  function normalizeList(items){
    return (Array.isArray(items) ? items : []).map(String).filter(Boolean);
  }

  function uniqueList(items){
    var seen = {};
    return normalizeList(items).filter(function(item){
      var key = item.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function normalizeShotMode(value){
    var mode = String(value || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    return SHOT_MODES[mode] ? mode : 'editorial';
  }

  function currentShotMode(){
    var external = window.SS_GENERATOR_STATE && window.SS_GENERATOR_STATE.shotMode;
    var mode = normalizeShotMode(state.generatorV5.shotMode || external || 'editorial');
    state.generatorV5.shotMode = mode;
    return mode;
  }

  function syncShotModeGlobal(){
    var mode = currentShotMode();
    window.SS_GENERATOR_STATE = Object.assign({}, window.SS_GENERATOR_STATE || {}, {
      shotMode: mode,
      socialFinishTreatment: state.generatorV5.socialFinishTreatment || (mode === 'editorial' ? '' : 'no_filter')
    });
    return mode;
  }

  function shotModeMeta(mode){
    return SHOT_MODES[normalizeShotMode(mode || currentShotMode())] || SHOT_MODES.editorial;
  }

  function shotModeSectionCopy(mode){
    var titles = shotModeMeta(mode).sectionTitles || SHOT_MODES.editorial.sectionTitles;
    return {
      wardrobe: titles[0] || 'Dress the shot',
      scene: titles[1] || 'Place, frame, light',
      refs: titles[2] || 'What enters the shot'
    };
  }

  function shotModePromptVoice(mode){
    return shotModeMeta(mode).promptVoice || SHOT_MODES.editorial.promptVoice;
  }

  function shotModeDnaCode(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    return SHOT_MODE_DNA_CODES[mode] || '';
  }

  function shotModeQualityWeights(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'selfie' || mode === 'mirror') {
      return { mode: mode, authenticity: true, locationLabel: 'Authenticity + phone realism', locationMax: 20, wardrobeMax: 15, actionLabel: 'Pose believability', lightMax: 15 };
    }
    if (mode === 'candid') {
      return { mode: mode, candid: true, actionLabel: 'Real moment', actionMax: 20, locationMax: 15, wardrobeMax: 15, lightMax: 15 };
    }
    if (mode === 'event') {
      return { mode: mode, event: true, locationLabel: 'Venue environment', locationMax: 25, wardrobeMax: 15, actionMax: 10, lightMax: 15 };
    }
    return { mode: 'editorial', locationLabel: 'Location context', locationMax: 20, wardrobeMax: 20, actionLabel: 'Action specificity', actionMax: 15, lightMax: 10 };
  }

  function shotModeActionCategories(mode){
    var meta = SHOT_MODE_ACTION_CATEGORIES[normalizeShotMode(mode || currentShotMode())];
    return Array.isArray(meta) && meta.length ? meta : ACTION_CATEGORIES;
  }

  function shotModeActions(mode){
    return shotModeActionCategories(mode).reduce(function(out, group){ return out.concat(group.actions || []); }, []);
  }

  function allActionCategories(){
    var groups = ACTION_CATEGORIES.slice();
    Object.keys(SHOT_MODE_ACTION_CATEGORIES || {}).forEach(function(key){
      (SHOT_MODE_ACTION_CATEGORIES[key] || []).forEach(function(group){
        if (!groups.some(function(existing){ return existing.id === group.id; })) groups.push(group);
      });
    });
    return groups;
  }

  function shotModeDefaultAction(mode){
    var meta = shotModeMeta(mode);
    return meta.defaultAction || (shotModeActions(mode)[0]) || SHOT_ACTIONS[0] || 'direct gaze, relaxed posture';
  }

  function shotModeActionLabel(mode){
    mode = normalizeShotMode(mode || currentShotMode());
    return {
      selfie: 'SELFIE POSES',
      mirror: 'MIRROR SELFIE POSES',
      vibes: 'VIBES POSES',
      editorial: 'EDITORIAL POSES',
      candid: 'CANDID & FUN POSES',
      event: 'EVENT MOMENT POSES'
    }[mode] || 'POSES';
  }

  function shotModeLocationMatches(entry, mode){
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'editorial') return true;
    entry = entry || {};
    var meta = shotModeMeta(mode);
    var affinity = normalizeList(entry.modeAffinity);
    if (affinity.indexOf(mode) >= 0) return true;
    var text = [
      entry.id,
      entry.name,
      entry.categoryId,
      entry.category,
      entry.environment,
      entry.region,
      entry.subType,
      entry.depthCharacter,
      entry.lightQuality,
      affinity.join(' '),
      entry.vibe,
      (entry.promptModifiers || []).join(' ')
    ].join(' ').toLowerCase();
    return (meta.locationKeywords || []).some(function(keyword){
      return keyword && text.indexOf(String(keyword).toLowerCase()) >= 0;
    });
  }

  function shotModeLocationEntries(mode){
    var entries = locationEntries();
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode === 'editorial') return entries;
    var filtered = entries.filter(function(entry){ return shotModeLocationMatches(entry, mode); });
    return filtered.length ? filtered : entries;
  }

  function shotModeLightingBoost(mode){
    return normalizeList(shotModeMeta(mode).lightingBoost || []);
  }

  function resolveLocationRegistry(id){
    var key = String(id || '').trim();
    var found = LOCATION_REGISTRY[key] || null;
    if (found && found.aliasOf) found = LOCATION_REGISTRY[found.aliasOf] || found;
    if (found) return normalizeLocationEntry(Object.assign({}, found, { id: key }));
    if (isCustomLocationId(key)) {
      var customName = state.generatorV5.customLocations[key] || optionTextForValue('g-location', key) || key.replace(/^custom_location_/, '').replace(/_/g, ' ');
      return {
        id: key,
        name: customName,
        category: 'Custom',
        categoryId: 'custom',
        categoryCode: 'Z',
        custom: true,
        environment: 'custom',
        region: 'Freeform',
        lightQuality: 'Manual location',
        depthCharacter: 'Manual location',
        moodNatural: [],
        promptModifiers: [],
        bestLighting: [],
        avoidLighting: [],
        suggestedDistance: [],
        avoidDistance: [],
        bestMoods: [],
        avoidMoods: [],
        props: [],
        actionAffinity: [],
        light: { bestTimes: [], avoid: [], characteristicQuality: 'Manual location' },
        depth: { suggestedDistance: [], avoid: [], reason: 'Manual location' },
        mood: { natural: [], avoid: [], reason: 'Manual location' }
      };
    }
    var legacy = (window.JHB_LOCATIONS || []).find(function(item){ return item.id === key; }) || null;
    if (!legacy) return null;
    var district = String(legacy.zone || legacy.id || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    var isInterior = /cafe|office|hotel|lobby|studio|airport|transit|gallery/i.test(String(legacy.type || legacy.name || ''));
    return normalizeLocationEntry({
      id: legacy.id,
      name: legacy.name,
      category: 'Johannesburg',
      categoryId: 'johannesburg',
      categoryCode: 'A',
      region: 'johannesburg',
      district: district,
      environment: isInterior ? 'interior' : 'exterior',
      subType: legacy.type || 'location',
      light: {
        bestTimes: /golden|afternoon|evening/i.test(legacy.timeOfDay || '') ? ['late_afternoon', 'golden_pm'] : ['morning', 'indoor_day'],
        avoid: [],
        naturalSource: isInterior ? 'available_interior_light' : 'open_sky',
        characteristicQuality: legacy.timeOfDay || 'flexible Johannesburg light'
      },
      depth: {
        suggestedDistance: /rooftop|street|precinct|yard/i.test(legacy.type || legacy.name || '') ? ['three-quarter body', 'full body environmental', 'waist-up candid'] : ['medium portrait', 'waist-up candid', 'tight portrait'],
        avoid: []
      },
      mood: { natural: ['sharp', 'candid', 'composed'], avoid: [] },
      actionAffinity: ['direct gaze, relaxed posture', 'mid-step through the scene, face still clear', 'quiet pause before speaking, eyes present'],
      props: /cafe|coffee/i.test(legacy.name || legacy.uses || '') ? ['coffee cup', 'notebook', 'phone in hand'] : ['phone in hand', 'small tote bag'],
      sceneNotes: legacy.uses || '',
      saContext: SA_VISUAL_INTELLIGENCE.culturalContext[district] || 'Johannesburg local context.',
      promptModifiers: [legacy.prompt || legacy.name || 'Johannesburg setting'].filter(Boolean)
    });
  }

  function characterShootProfile(charId){
    var key = charKey(charId || $('g-char')?.value || 'leah');
    var profile = CHARACTER_SHOOT_PROFILES[key] || null;
    if (profile) return profile;
    var c = getCharSafe(key);
    return {
      id: key,
      name: c.name || key,
      title: c.role || c.title || '',
      energy: 'character_exactness',
      defaultPosture: 'natural, exact, camera-real',
      strengthAngles: ['direct gaze, relaxed posture', 'quiet pause before speaking, eyes present'],
      weakAngles: [],
      naturalEnvironments: ['studio_desk', 'cafe_braam'],
      lightingAffinity: { excellent: ['indoor_day', 'golden_am'], good: ['morning', 'late_afternoon'], avoid: [] },
      wardrobeAffinity: { naturalStyles: [], avoidStyles: [] },
      alwaysInclude: ['exact identity match', 'natural skin texture'],
      neverInclude: ['generic AI face', 'beauty filter drift']
    };
  }

  function referenceDefaultWeight(ref){
    if (Number.isFinite(Number(ref && ref.influenceWeight))) return Number(ref.influenceWeight);
    if (Number.isFinite(Number(ref && ref.weight))) return Number(ref.weight) <= 1 ? Math.round(Number(ref.weight) * 100) : Number(ref.weight);
    var role = String(ref && (ref.role || ref.type || ref.referenceKind) || '').toLowerCase();
    if (/primary_face|face/.test(role)) return 95;
    if (/primary_body|body|build/.test(role)) return 75;
    if (/wardrobe|outfit/.test(role)) return 85;
    if (/home|item|prop|scene/.test(role)) return 55;
    return 60;
  }

  function referenceWeightFor(ref){
    var key = ref && (ref.key || ref.itemId || ref.id || ref.label);
    var value = key ? Number((state.generatorV5.referenceWeights || {})[key]) : NaN;
    if (!Number.isFinite(value)) value = referenceDefaultWeight(ref);
    return Math.max(10, Math.min(100, Math.round(value)));
  }

  function influenceHintForWeight(weight){
    var n = Number(weight) || 60;
    if (n >= 90) return 'strict identity/reference authority';
    if (n >= 70) return 'strong reference guide';
    if (n >= 40) return 'visible guide reference';
    return 'loose support reference';
  }

  function referenceInfluencePromptLine(refs){
    var parts = (Array.isArray(refs) ? refs : [])
      .filter(function(ref){ return ref && (ref.label || ref.role || ref.type); })
      .slice(0, 8)
      .map(function(ref){
        var weight = referenceWeightFor(ref);
        return (ref.role || ref.type || ref.label) + ' ' + weight + '% (' + influenceHintForWeight(weight) + ')';
      });
    return parts.length ? 'Reference influence weights: ' + parts.join('; ') + '.' : '';
  }

  function optionTextForValue(id, value){
    var select = $(id);
    var match = Array.prototype.slice.call(select?.options || []).find(function(option){ return option.value === value; });
    return match ? match.text : String(value || '');
  }

  function optionObjectsFor(id, fallbackValues){
    var select = $(id);
    var options = Array.prototype.slice.call(select?.options || []);
    if (!options.length) {
      options = normalizeList(fallbackValues).map(function(value){ return { value: value, text: value }; });
    }
    return options.map(function(option){
      return {
        value: option.value,
        text: option.text || option.value,
        rank: option.getAttribute ? option.getAttribute('data-pg52-rank') || '' : '',
        reason: option.getAttribute ? option.getAttribute('data-pg52-reason') || '' : ''
      };
    });
  }

  function rankedOptions(options, recommended, avoid, reasons){
    recommended = uniqueList(recommended);
    avoid = uniqueList(avoid);
    reasons = reasons || {};
    var recSet = {};
    var avoidSet = {};
    recommended.forEach(function(value, index){ recSet[String(value)] = index + 1; });
    avoid.forEach(function(value){ avoidSet[String(value)] = true; });
    var seenValues = {};
    var values = options.map(function(item){ return item.value; }).concat(recommended).map(function(value){ return String(value == null ? '' : value); }).filter(function(value){
      var key = value.toLowerCase();
      if (seenValues[key]) return false;
      seenValues[key] = true;
      return true;
    });
    return values.map(function(value){
      var existing = options.find(function(item){ return item.value === value; }) || {};
      var rank = recSet[value] ? 'recommended' : (avoidSet[value] ? 'avoid' : 'neutral');
      return {
        value: value,
        text: existing.text || value || 'No prop',
        rank: rank,
        reason: reasons[value] || (rank === 'recommended' ? 'Recommended for current character, location, and wardrobe.' : rank === 'avoid' ? 'Available, but weaker for this setup.' : '')
      };
    }).sort(function(a, b){
      function order(item){
        if (item.rank === 'recommended') return 0;
        if (item.rank === 'neutral') return 1;
        return 2;
      }
      var ao = order(a);
      var bo = order(b);
      if (ao !== bo) return ao - bo;
      var ai = recommended.indexOf(a.value);
      var bi = recommended.indexOf(b.value);
      if (ai !== bi && (ai >= 0 || bi >= 0)) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      return a.text.localeCompare(b.text);
    });
  }

  function setRankedOptions(id, options){
    var select = $(id);
    if (!select) return;
    var current = select.value;
    select.innerHTML = options.map(function(item){
      return '<option value="' + esc(item.value) + '" data-pg52-rank="' + esc(item.rank || '') + '" data-pg52-reason="' + esc(item.reason || '') + '">' + esc(item.text || item.value) + '</option>';
    }).join('');
    if (options.some(function(item){ return item.value === current; })) select.value = current;
    markRepopulating(select);
  }

  function setRankedActionOptions(recommended, avoid, reasons){
    var select = $('g-shot-action');
    if (!select) return;
    var current = modeSafeActionValue(select.value || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()) || SHOT_ACTIONS[0] || '');
    recommended = uniqueList(recommended);
    avoid = uniqueList(avoid);
    reasons = reasons || {};
    var rankMap = {};
    shotModeActions(currentShotMode()).forEach(function(action){
      var rank = recommended.includes(action) ? 'recommended' : (avoid.includes(action) ? 'avoid' : 'neutral');
      rankMap[action] = {
        rank: rank,
        reason: reasons[action] || (rank === 'recommended' ? 'Recommended for the current character, location, and wardrobe.' : rank === 'avoid' ? 'Available, but weaker for this setup.' : '')
      };
    });
    select.innerHTML = actionOptionsHtml(current, rankMap);
    select.value = current;
    state.generatorV5.shotAction = select.value || current;
    markRepopulating(select);
  }

  function wardrobeLocationCompatibility(){
    var locationId = $('g-location')?.value || 'cafe_braam';
    var loc = resolveLocationRegistry(locationId) || {};
    var active = activeWardrobeItems();
    var outfit = active[0] || currentCloset().find(function(item){ return item.id === selectedOutfitId(); }) || null;
    var score = 68;
    var note = 'Wardrobe and scene are workable; refine light and framing.';
    var wardrobeText = [outfit?.name, outfit?.palette, outfit?.vibe, outfit?.kind, outfit?.notes].filter(Boolean).join(' ').toLowerCase();
    var env = String(loc.environment || '').toLowerCase();
    var sub = String(loc.subType || loc.type || '').toLowerCase();
    if (/blazer|tailor|structured|premium|minimal|black|luxury|formal/.test(wardrobeText) && /interior|hotel|cafe|studio|gallery/.test(env + ' ' + sub)) {
      score = 88;
      note = 'Structured wardrobe reads strongly in premium interiors and controlled light.';
    } else if (/tee|casual|denim|street|weekend/.test(wardrobeText) && /street|precinct|yard|rooftop|exterior/.test(env + ' ' + sub)) {
      score = 84;
      note = 'Casual/street wardrobe fits an exterior Johannesburg environment.';
    } else if (/skirt|dress|heel|bag|jewelry|jewellery/.test(wardrobeText) && /hotel|gallery|cafe|lobby/.test(sub)) {
      score = 82;
      note = 'The outfit has enough detail for a composed interior editorial frame.';
    } else if (/formal|structured|blazer/.test(wardrobeText) && /gautrain|airport|transit/.test(sub)) {
      score = 72;
      note = 'Formalwear works here if the shot feels purposeful, not staged.';
    } else if (/formal|structured|luxury/.test(wardrobeText) && /market|street|yard/.test(sub)) {
      score = 52;
      note = 'Formal wardrobe may fight this raw location. Use tighter framing or switch to a premium interior.';
    }
    var dots = Math.max(1, Math.min(5, Math.round(score / 20)));
    var label = componentScoreLabelFromDots(dots);
    return {
      score: score,
      label: label,
      note: note,
      dots: dots,
      wardrobeName: outfit?.name || 'Selected wardrobe',
      locationName: loc.name || optionText('g-location') || locationId
    };
  }

  function renderLocationContextTag(loc){
    var tag = $('pg52-location-context-tag');
    if (!tag) return;
    loc = loc || resolveLocationRegistry($('g-location')?.value || 'cafe_braam') || {};
    if (loc.custom) {
      tag.textContent = 'Custom · Freeform · Manual location';
      tag.setAttribute('title', loc.name || 'Custom location');
      return;
    }
    var parts = [
      titleCase(loc.environment || 'location'),
      loc.region || 'Unknown region',
      loc.depthCharacter || loc.depth?.reason || 'Flexible depth'
    ];
    var base = parts.filter(Boolean).join(' · ');
    tag.innerHTML = esc(base) + (loc.vibe ? '<span class="pg52-location-vibe">Vibe: ' + esc(loc.vibe) + '</span>' : '');
    tag.setAttribute('title', [loc.lightQuality || loc.light?.characteristicQuality || '', loc.vibe ? 'Vibe: ' + loc.vibe : ''].filter(Boolean).join(' | '));
  }

  function applyContextIntelligence(){
    var loc = resolveLocationRegistry($('g-location')?.value || 'cafe_braam') || {};
    var profile = characterShootProfile($('g-char')?.value || 'leah');
    var mode = currentShotMode();
    var modeMeta = shotModeMeta(mode);
    var saMoment = activeSaMomentPack();
    if (loc.custom) {
      setRankedLightingOptions(socialLightingBoost(mode, loc, saMoment).concat(shotModeLightingBoost(mode)), [], {}, loc);
      setRankedOptions('g-camera-distance', rankedOptions(optionObjectsFor('g-camera-distance', CAMERA_DISTANCES), [], [], {}));
      setRankedOptions('g-mood', rankedOptions(optionObjectsFor('g-mood'), [], [], {}));
      setRankedActionOptions([modeMeta.defaultAction].filter(Boolean), [], {});
      setRankedOptions('g-props', rankedOptions(optionObjectsFor('g-props', PROP_CHOICES), [], [], {}));
      setRankedOptions('g-lens', rankedOptions(optionObjectsFor('g-lens', LENS_CHOICES), [], [], {}));
      syncChipLabels($('prompt-generator-52-shell') || document);
      syncActionEngine();
      renderLocationContextTag(loc);
      return;
    }
    var lightRec = uniqueList(
      socialLightingBoost(mode, loc, saMoment)
        .concat(shotModeLightingBoost(mode))
        .concat(loc.light?.bestTimes || [])
        .concat(profile.lightingAffinity?.excellent || [])
        .concat(profile.lightingAffinity?.good || [])
    );
    var lightAvoid = uniqueList((loc.light?.avoid || []).concat(profile.lightingAffinity?.avoid || []).map(normalizeLightingId));
    var lightReasons = {};
    if (lightRec[0]) lightReasons[normalizeLightingId(lightRec[0])] = loc.light?.characteristicQuality || profile.lightingAffinity?.skinNote || lightingPromptPhrase(lightRec[0]) || '';
    setRankedLightingOptions(lightRec, lightAvoid, lightReasons, loc);

    setRankedOptions('g-camera-distance', rankedOptions(optionObjectsFor('g-camera-distance', CAMERA_DISTANCES), loc.depth?.suggestedDistance || [], loc.depth?.avoid || [], {}));
    setRankedOptions('g-mood', rankedOptions(optionObjectsFor('g-mood'), loc.mood?.natural || [], loc.mood?.avoid || [], {}));
    setRankedActionOptions(uniqueList([modeMeta.defaultAction].concat(loc.actionAffinity || [], profile.strengthAngles || [])), profile.weakAngles || [], {});
    setRankedOptions('g-props', rankedOptions(optionObjectsFor('g-props', PROP_CHOICES), loc.props || [], [], {}));
    var lensRec = /selfie|mirror|candid/.test(mode) ? ['phone camera realism', '50mm natural perspective', 'editorial documentary lens'] : (loc.environment === 'exterior' ? ['35mm environmental realism', '50mm natural perspective', 'editorial documentary lens'] : ['50mm natural perspective', '85mm portrait compression', 'phone camera realism']);
    setRankedOptions('g-lens', rankedOptions(optionObjectsFor('g-lens', LENS_CHOICES), lensRec, [], {}));
    syncChipLabels($('prompt-generator-52-shell') || document);
    syncActionEngine();
    renderLocationContextTag(loc);
  }

  function dnaPillHtml(dna, previousDna){
    var current = String(dna || '').split('.').filter(Boolean);
    var previous = String(previousDna || '').split('.').filter(Boolean);
    if (!current.length) return '<span class="pg52-dna-pill"><span class="pg52-dna-segment">no-dna</span></span>';
    return [
      '<span class="pg52-dna-pill" aria-label="Shot DNA ' + esc(current.join(' dot ')) + '">',
        current.map(function(segment, index){
          var changed = previous.length && previous[index] !== segment ? ' is-dna-segment-changed' : '';
          var sep = index ? '<span class="pg52-dna-separator">·</span>' : '';
          return sep + '<span class="pg52-dna-segment' + changed + '">' + esc(segment) + '</span>';
        }).join(''),
      '</span>'
    ].join('');
  }

  function dnaLoadHtml(){
    var dna = state.generatorV5.dnaLoad || {};
    return [
      '<form class="pg52-dna-load" id="pg52-dna-load-form" data-pg52-dna-load-form>',
        '<label class="sr-only" for="pg52-dna-load-input">Load from DNA</label>',
        '<input id="pg52-dna-load-input" class="pg52-dna-load-input" type="text" value="' + esc(dna.value || '') + '" placeholder="Load from DNA" autocomplete="off">',
        '<button class="pg52-btn-ghost pg52-btn-sm" type="submit">Load</button>',
        dna.status ? '<span class="pg52-dna-load-status">' + esc(dna.status) + '</span>' : '',
        dna.error ? '<span class="pg52-dna-load-error">' + esc(dna.error) + '</span>' : '',
      '</form>'
    ].join('');
  }

  function normalizeDnaHint(value){
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function resolveDnaHintFromValues(hint, values){
    var clean = normalizeDnaHint(hint);
    if (!clean) return { value: '', warning: '' };
    var entries = (values || []).map(function(value){ return String(value || ''); }).filter(Boolean);
    var exact = entries.find(function(value){ return normalizeDnaHint(value) === clean; });
    if (exact) return { value: exact, warning: '' };
    var matches = entries.filter(function(value){ return normalizeDnaHint(value).indexOf(clean) === 0; });
    if (matches.length === 1) return { value: matches[0], warning: '' };
    if (matches.length > 1) return { value: matches[0], warning: 'Ambiguous DNA segment "' + hint + '" resolved to ' + matches[0] + '.' };
    return { value: '', warning: 'DNA segment "' + hint + '" was not recognized.' };
  }

  function resolveDnaPatch(dnaString){
    var decoded = decodeShotDna(dnaString);
    var warnings = [];
    var patch = {};
    if (decoded.shotModeHint) patch.shotMode = decoded.shotModeHint;
    var location = resolveDnaHintFromValues(decoded.locationHint, locationEntries().map(function(entry){ return entry.id; }));
    if (location.value) patch.locationId = location.value;
    if (location.warning) warnings.push(location.warning);
    var lighting = resolveDnaHintFromValues(decoded.lightingHint, lightingOptionRegistry().map(function(entry){ return entry.id; }));
    if (lighting.value) patch.lighting = lighting.value;
    if (lighting.warning) warnings.push(lighting.warning);
    var distance = resolveDnaHintFromValues(decoded.distanceHint, optionValuesFor('g-camera-distance', CAMERA_DISTANCES));
    if (distance.value) patch.cameraDistance = distance.value;
    if (distance.warning) warnings.push(distance.warning);
    var lensValue = String(decoded.lensHint || '');
    if (lensValue) {
      var lens = (optionValuesFor('g-lens', LENS_CHOICES) || []).find(function(value){ return String(value).toLowerCase().indexOf(lensValue.toLowerCase()) >= 0; });
      if (lens) patch.lens = lens;
      else warnings.push('DNA lens "' + lensValue + '" was not recognized.');
    }
    if (/^c:/i.test(decoded.moodHint || '')) {
      patch.shotOverrides = Object.assign({}, patch.shotOverrides, { mood: decoded.moodHint.slice(2) });
    } else {
      var mood = resolveDnaHintFromValues(decoded.moodHint, optionValuesFor('g-mood'));
      if (mood.value) patch.moodId = mood.value;
      if (mood.warning) warnings.push(mood.warning);
    }
    if (/^c:/i.test(decoded.movementHint || '')) {
      patch.shotOverrides = Object.assign({}, patch.shotOverrides, { action: decoded.movementHint.slice(2) });
    } else {
      var movement = resolveDnaHintFromValues(decoded.movementHint, optionValuesFor('g-movement', MOVEMENT_CHOICES).concat(optionValuesFor('g-shot-action', SHOT_ACTIONS)));
      if (movement.value) {
        if (optionValuesFor('g-shot-action', SHOT_ACTIONS).indexOf(movement.value) >= 0) patch.shotAction = movement.value;
        else patch.movement = movement.value;
      }
      if (movement.warning) warnings.push(movement.warning);
    }
    if (/^c:/i.test(decoded.propsHint || '')) {
      patch.shotOverrides = Object.assign({}, patch.shotOverrides, { props: decoded.propsHint.slice(2) });
    } else {
      var props = resolveDnaHintFromValues(decoded.propsHint, optionValuesFor('g-props', PROP_CHOICES));
      if (props.value) patch.props = props.value;
      if (props.warning) warnings.push(props.warning);
    }
    return { patch: patch, warnings: warnings, decoded: decoded };
  }

  function loadShotFromDna(dnaString){
    var value = String(dnaString || $('pg52-dna-load-input')?.value || '').trim();
    var stateDna = state.generatorV5.dnaLoad || {};
    stateDna.value = value;
    stateDna.status = '';
    stateDna.error = '';
    state.generatorV5.dnaLoad = stateDna;
    if (!value) {
      stateDna.error = 'Paste a DNA string first.';
      renderPromptPreview();
      return false;
    }
    var resolved = resolveDnaPatch(value);
    if (!Object.keys(resolved.patch || {}).length) {
      stateDna.error = 'DNA could not be mapped to this generator.';
      renderPromptPreview();
      return false;
    }
    applyGeneratorState(resolved.patch, { source: 'dna-load' });
    stateDna.status = resolved.warnings.length ? ('Loaded with warnings: ' + resolved.warnings.slice(0, 2).join(' ')) : 'DNA loaded.';
    stateDna.error = '';
    state.generatorV5.dnaLoad = stateDna;
    notifyAsync(resolved.warnings.length ? 'warning' : 'success', stateDna.status);
    renderPromptPreview();
    return true;
  }

  function compatDotsSvgHtml(dots, label){
    dots = Math.max(0, Math.min(5, Number(dots) || 0));
    var normalizedLabel = componentScoreLabelFromDots(dots || 1);
    var circles = [];
    for (var index = 0; index < 5; index += 1) {
      circles.push([
        '<svg class="pg52-compat-dot-svg ' + (index < dots ? 'is-active' : 'is-inactive') + '" style="--pg52-dot-index:' + esc(index) + '" viewBox="0 0 8 8" aria-hidden="true" focusable="false">',
          '<circle cx="4" cy="4" r="3.5"></circle>',
        '</svg>'
      ].join(''));
    }
    return [
      '<span class="pg52-compat-dot-svg-wrap" aria-hidden="true">',
        circles.join(''),
      '</span>',
      '<b>' + esc(normalizedLabel || label || 'MODERATE') + '</b>'
    ].join('');
  }

  function latestIdentityScore(){
    var raw = window._lastImageRouteResult?.routeResult?.identityScore ?? window._lastImageRouteResult?.identityScore ?? currentShotRecord()?.result?.identityScore;
    return normalizeIdentityScore100(raw);
  }

  function identityScoreCircleHtml(score){
    var normalized = normalizeIdentityScore100(score);
    if (normalized === null) {
      return [
        '<div class="pg52-identity-score-card is-unverified">',
          '<div class="pg52-identity-score-circle is-unverified" aria-label="Identity score not verified">',
            '<strong>--</strong>',
          '</div>',
          '<div><span>identity score</span><em>not verified yet</em></div>',
        '</div>'
      ].join('');
    }
    var rounded = Math.round(normalized);
    var band = rounded >= 78 ? 'high' : (rounded >= 58 ? 'mid' : 'low');
    return [
      '<div class="pg52-identity-score-card is-' + esc(band) + '">',
        '<div class="pg52-identity-score-circle is-' + esc(band) + '" style="--pg52-identity-offset:' + esc(100 - rounded) + '" aria-label="Identity score ' + esc(rounded) + ' percent">',
          '<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false">',
            '<circle class="pg52-identity-score-bg" cx="18" cy="18" r="15.9155"></circle>',
            '<circle class="pg52-identity-score-value" cx="18" cy="18" r="15.9155"></circle>',
          '</svg>',
          '<strong>' + esc(rounded) + '</strong>',
        '</div>',
        '<div><span>identity score</span><em>' + esc(band === 'high' ? 'locked strong' : band === 'mid' ? 'review after render' : 'needs proofing') + '</em></div>',
      '</div>'
    ].join('');
  }

  function lockedBadgeHtml(label){
    return [
      '<span class="pg52-badge pg52-badge--locked">',
        '<svg class="pg52-lock-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false">',
          '<rect x="2.5" y="5" width="7" height="5" rx="1.2" fill="none" stroke-width="1.2"></rect>',
          '<path d="M4 5V3.8C4 2.6 4.8 2 6 2s2 .6 2 1.8V5" fill="none" stroke-width="1.2" stroke-linecap="round"></path>',
        '</svg>',
        '<span>' + esc(label || 'LOCKED') + '</span>',
      '</span>'
    ].join('');
  }

  function markPromptCompiling(target){
    if (!target) return;
    restartTransientClass(target, 'is-compiling');
    target.querySelectorAll && target.querySelectorAll('#out-main,#out-neg,.pg52-raw-prompt-block > div,.pg52-live-segment p').forEach(function(node){
      restartTransientClass(node, 'is-compiling');
    });
  }

  function characterHasRecentActivity(charId){
    var cutoff = Date.now() - 24 * 60 * 60 * 1000;
    var shots = [];
    try { shots = loadShotHistory(charId) || []; } catch (_) { shots = []; }
    return shots.some(function(shot){
      var stamp = Date.parse(shot.generatedAt || shot.createdAt || shot.updatedAt || shot.timestamp || '');
      return Number.isFinite(stamp) && stamp >= cutoff;
    });
  }

  function syncCharacterActivityDots(){
    ['aisha','leah','claudia','grok','vanya'].forEach(function(id){
      var dot = document.querySelector('#sidebar .nav-item[data-page="' + id + '"] .nav-char-dot');
      if (!dot) return;
      dot.classList.toggle('has-recent-activity', characterHasRecentActivity(id));
    });
  }

  function renderContextIntelligence(){
    var wrap = $('pg52-compatibility-meter');
    if (!wrap) return;
    var loc = resolveLocationRegistry($('g-location')?.value || 'cafe_braam') || {};
    var profile = characterShootProfile($('g-char')?.value || 'leah');
    var compat = wardrobeLocationCompatibility();
    function compact(text, max){
      text = String(text || '').replace(/\s+/g, ' ').trim();
      max = max || 96;
      return text.length > max ? text.slice(0, max - 3).trim() + '...' : text;
    }
    var fullHint = [
      loc.light?.characteristicQuality,
      profile.lightingAffinity?.skinNote
    ].filter(Boolean).join(' ');
    wrap.className = 'pg52-compatibility-meter pg52-compat-meter--' + String(compat.label || 'good').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    wrap.setAttribute('title', fullHint || compat.note || '');
    wrap.innerHTML = [
      '<div class="pg52-compat-main">',
        '<span class="pg52-t-micro">Wardrobe x Scene</span>',
        '<strong>' + esc(compact(compat.wardrobeName, 44)) + '</strong>',
        '<small>' + esc(compact(compat.locationName, 36)) + '</small>',
      '</div>',
      '<div class="pg52-compat-score" aria-label="Compatibility ' + esc(compat.score) + ' out of 100">',
        compatDotsSvgHtml(compat.dots, compat.label),
      '</div>',
      '<div class="pg52-compat-note">' + esc(compact(compat.note, 112)) + '</div>',
      fullHint ? '<div class="pg52-compat-hint">' + esc(compact(fullHint, 112)) + '</div>' : ''
    ].join('');
    restartTransientClass(wrap, 'is-compat-recalculating');
  }

  function encodeShotDna(recipe){
    recipe = recipe || {};
    var scene = recipe.scenePack || {};
    var overrides = scene.overrides || {};
    var modeCode = shotModeDnaCode(scene.shotMode || recipe.shotMode || recipe.shotModeId || '');
    function part(value, len, fallback){
      return String(value || fallback || 'none').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, len || 4) || fallback || 'none';
    }
    function customPart(key, fallback){
      var raw = overrides[key] || '';
      if (!raw) return fallback;
      var slug = part(raw, 18, '');
      return slug ? 'c:' + slug : fallback;
    }
    var lens = String(scene.lens || '').match(/(\d+)mm/);
    var pieces = [
      part(scene.locationId, 5, 'loc'),
      customPart('lighting', part(scene.lightingId || scene.lighting, 4, 'lite')),
      part(scene.cameraDistance, 3, 'mid'),
      (lens ? lens[1] : '50') + 'mm',
      customPart('mood', part(scene.moodId || scene.mood, 4, 'mood')),
      customPart('action', part(scene.movement, 4, 'stil')),
      customPart('props', part(scene.props, 4, 'none'))
    ];
    if (modeCode) pieces.unshift(modeCode);
    return pieces.join('.');
  }

  function decodeShotDna(dnaString){
    var parts = String(dnaString || '').split('.');
    var modeByCode = Object.keys(SHOT_MODE_DNA_CODES).reduce(function(out, mode){
      out[SHOT_MODE_DNA_CODES[mode]] = mode;
      return out;
    }, {});
    var modeHint = modeByCode[parts[0]] || '';
    if (modeHint) parts = parts.slice(1);
    return {
      shotModeHint: modeHint,
      locationHint: parts[0] || '',
      lightingHint: parts[1] || '',
      distanceHint: parts[2] || '',
      lensHint: parts[3] || '',
      moodHint: parts[4] || '',
      movementHint: parts[5] || '',
      propsHint: parts[6] || ''
    };
  }

  function promptQualityLabel(total){
    if (total >= 85) return { grade: 'A', label: 'Excellent' };
    if (total >= 70) return { grade: 'B', label: 'Good' };
    if (total >= 55) return { grade: 'C', label: 'Fair' };
    return { grade: 'D', label: 'Weak' };
  }

  function scorePromptQuality(recipe, model){
    recipe = recipe || {};
    var refs = recipe.referencePack || {};
    var scene = recipe.scenePack || {};
    var wardrobe = recipe.wardrobePack || {};
    var loc = resolveLocationRegistry(scene.locationId) || {};
    var modeWeights = shotModeQualityWeights(scene.shotMode || recipe.shotMode || currentShotMode());
    var refCount = Number(refs.count || 0);
    var breakdown = [];
    breakdown.push({ label: 'Identity refs', score: Math.min(refCount * 10, 25), max: 25, note: refCount + ' refs attached' });
    var wScore = 0;
    if ((wardrobe.activeImageRefs || []).length || (recipe.wardrobeImageRefs || []).length) wScore += 12;
    if ((wardrobe.garments || []).length > 2) wScore += 5;
    if (wardrobe.override) wScore += 3;
    breakdown.push({ label: 'Wardrobe specificity', score: Math.min(wScore, modeWeights.wardrobeMax || 20), max: modeWeights.wardrobeMax || 20, note: wardrobe.name || 'wardrobe selected' });
    var lScore = loc.id ? 15 : 5;
    if ((loc.promptModifiers || []).length > 2) lScore += 5;
    if (modeWeights.authenticity && /phone|selfie|mirror/i.test([scene.lens, scene.action, scene.shotModePromptVoice].join(' '))) lScore += 5;
    if (modeWeights.event && /venue|night|event|restaurant|gallery|hotel|club/i.test([loc.name, loc.subType, loc.promptModifiers].join(' '))) lScore += 5;
    breakdown.push({ label: modeWeights.locationLabel || 'Location context', score: Math.min(lScore, modeWeights.locationMax || 20), max: modeWeights.locationMax || 20, note: loc.name || scene.location || 'location' });
    var aScore = scene.action ? 10 : 0;
    if (String(scene.action || '').length > 24) aScore = 15;
    if (modeWeights.candid && /candid|laugh|friend|caught|unposed|reacting|talking/i.test(scene.action || '')) aScore += 5;
    breakdown.push({ label: modeWeights.actionLabel || 'Action specificity', score: Math.min(aScore, modeWeights.actionMax || 15), max: modeWeights.actionMax || 15, note: scene.action || 'missing action' });
    var lightMoodScore = (scene.lighting ? 5 : 0) + (scene.mood ? 5 : 0);
    if ((modeWeights.authenticity || modeWeights.candid || modeWeights.event) && scene.lighting) lightMoodScore += 5;
    breakdown.push({ label: 'Lighting + mood', score: Math.min(lightMoodScore, modeWeights.lightMax || 10), max: modeWeights.lightMax || 10, note: [scene.lighting, scene.mood].filter(Boolean).join(' / ') });
    var routeScore = model && model.supportsMultiReference && refCount > 1 ? 10 : (model && model.supportsTextToImage ? 5 : 0);
    breakdown.push({ label: 'Route match', score: routeScore, max: 10, note: model?.displayName || 'selected model' });
    var total = breakdown.reduce(function(sum, item){ return sum + item.score; }, 0);
    return Object.assign({ total: total, max: 100, breakdown: breakdown }, promptQualityLabel(total));
  }

  function promptQualityHtml(score){
    score = score || promptQualityLabel(0);
    var breakdown = score.breakdown || [];
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function(){
        var detail = $('pg52-prompt-quality-detail');
        if (detail) restartTransientClass(detail, 'is-score-updating');
      });
    }
    return [
      '<div class="pg52-quality-top"><strong>Prompt quality: ' + esc(score.grade || 'D') + ' - ' + esc(score.total || 0) + '/100</strong><span>' + esc(score.label || 'Weak') + '</span></div>',
      '<div class="pg52-quality-bars">',
        breakdown.map(function(item){
          var pct = Math.max(0, Math.min(100, Math.round((item.score / item.max) * 100)));
          return '<div class="pg52-quality-row"><span>' + esc(item.label) + '</span><b>' + esc(item.score) + '/' + esc(item.max) + '</b><i style="--pg52-q:' + pct + '%"></i><em>' + esc(item.note || '') + '</em></div>';
        }).join(''),
      '</div>'
    ].join('');
  }

  function promptTextList(items){
    return normalizeList(items)
      .map(function(item){ return String(item || '').trim(); })
      .filter(Boolean)
      .join(', ');
  }

  function promptSentence(parts){
    return normalizeList(parts)
      .map(function(part){ return String(part || '').trim().replace(/\s+/g, ' '); })
      .filter(Boolean)
      .join('. ');
  }

  function abbreviatePromptText(text, max){
    text = String(text || '').replace(/\s+/g, ' ').trim();
    max = Number(max) || 80;
    return text.length > max ? text.slice(0, max).trim().replace(/[,\s.]+$/g, '') + '...' : text;
  }

  function referenceRoleSummary(refs){
    refs = Array.isArray(refs) ? refs : [];
    if (!refs.length) return 'Written identity only - no direct reference images active.';
    var faceCount = refs.filter(function(ref){ return /face/i.test(ref.role || ref.label || ''); }).length;
    var bodyCount = refs.filter(function(ref){ return /body|build/i.test(ref.role || ref.label || ''); }).length;
    var wardrobeNames = refs
      .filter(function(ref){ return /wardrobe/i.test(ref.role || ref.label || ref.referenceKind || ''); })
      .map(function(ref){ return ref.name || ref.itemName || String(ref.label || '').replace(/^WARDROBE REFERENCE\s*\d*\s*\/?\s*/i, '').toLowerCase(); })
      .filter(Boolean)
      .slice(0, 3);
    var sceneCount = refs.filter(function(ref){ return ref.role === 'scene_environment'; }).length;
    var pieces = [];
    if (faceCount) pieces.push('face: primary');
    if (bodyCount) pieces.push('body: primary');
    if (wardrobeNames.length) pieces.push('wardrobe: ' + wardrobeNames.join(', '));
    if (sceneCount) pieces.push('scene refs: ' + sceneCount);
    if (!pieces.length) pieces = refs.slice(0, 4).map(function(ref){ return ref.role || ref.label || 'reference'; });
    return refs.length + ' direct reference image' + (refs.length === 1 ? '' : 's') + ' - ' + pieces.join('; ') + '.';
  }

  function livePromptQuality(kit){
    var quality = kit?.engineQuality || kit?.generatorRecipe?.promptQuality || scorePromptQuality(kit?.generatorRecipe || {}, kit?.model);
    return Object.assign({ grade: 'D', total: 0, max: 100, label: 'Weak' }, quality || {});
  }

  function livePromptSegments(kit){
    var recipe = kit?.generatorRecipe || {};
    var scene = recipe.scenePack || kit?.scenePack || {};
    var wardrobe = recipe.wardrobePack || kit?.wardrobePack || {};
    var refs = recipe.referencePack || kit?.referencePack || {};
    var refList = Array.isArray(refs.references) ? refs.references : activeReferencePack();
    var loc = resolveLocationRegistry(scene.locationId || kit?.location) || kit?.loc || {};
    var profile = characterShootProfile(recipe.characterId || kit?.char);
    var cinematic = scene.cinematicPack || recipe.cinematicPack || {};
    var aestheticTransfer = scene.aestheticTransfer || recipe.aestheticTransfer || {};
    var authenticity = scene.authenticityPack || recipe.authenticityPack || {};
    var platformIntel = scene.platformIntelligence || recipe.platformIntelligence || platformIntelligencePayload(platformIntelligenceById(kit?.platform || $('g-platform')?.value || 'instagram_feed_square'));
    var mode = shotModeMeta(scene.shotMode || recipe.shotMode || kit?.shotMode || currentShotMode());
    var modeVoice = getShotModeVoice(mode.id);
    var anatomyLabels = modeVoice.anatomyLabels || { camera: 'CAMERA', mood: 'MOOD + ENERGY' };
    var socialAnatomy = mode.id !== 'editorial';
    var lightingNote = scene.lightingPromptPhrase || lightingPromptPhrase(scene.lightingId || $('g-time')?.value) || loc.lightQuality || loc.light?.characteristicQuality || (checked('g-sa-texture', true) ? SA_VISUAL_INTELLIGENCE.lightQuality.promptModifier : '');
    var platformLabel = platformIntel.label || optionText('g-platform') || kit?.platform || '';
    var aspectLabel = scene.platformCrop || getCurrentImageAspectRatio();
    var wardrobeText = wardrobe.override || wardrobe.prompt || [
      wardrobe.name,
      promptTextList(wardrobe.garments),
      wardrobe.palette ? 'palette ' + wardrobe.palette : '',
      wardrobe.fit ? 'fit ' + wardrobe.fit : '',
      wardrobe.vibe ? 'vibe ' + wardrobe.vibe : ''
    ].filter(Boolean).join('; ');
    var sceneText = promptSentence([
      'Shot mode: ' + mode.label + '. ' + (scene.shotModePromptVoice || recipe.shotModePromptVoice || mode.promptVoice || ''),
      loc.name || scene.location || optionText('g-location') || 'Location',
      scene.action || optionText('g-shot-action'),
      promptTextList(loc.promptModifiers || []),
      scene.locationReferenceText,
      scene.sceneOverride,
      aestheticTransfer.enabled ? promptTextList(aestheticTransfer.promptModifiers || []) : ''
    ]);
    var moodText = promptSentence([
      [scene.mood || optionText('g-mood'), scene.movement || optionText('g-movement')].filter(Boolean).join(', '),
      socialAnatomy && scene.socialFinishTreatment ? ('Finish: ' + scene.socialFinishTreatment.label + ' - ' + scene.socialFinishTreatment.promptAddition) : '',
      socialAnatomy && authenticity.enabled ? ('Authenticity: ' + promptTextList(authenticity.promptLines || authenticityPromptLines(authenticity))) : '',
      cinematic.enabled ? promptSentence([
        cinematic.narrative,
        cinematic.aestheticLabel,
        promptTextList(cinematic.treatmentLabels || cinematic.treatments || [])
      ]) : ''
    ]);
    var negative = String(kit?.negative || '').trim();
    return [
      {
        key: 'character',
        label: 'CHARACTER',
        text: promptSentence([
          [recipe.characterName || profile.name || 'Character', profile.title, profile.defaultPosture].filter(Boolean).join(', '),
          promptTextList(profile.alwaysInclude || [])
        ]),
        tone: 'character'
      },
      {
        key: 'refs',
        label: 'REFS ACTIVE',
        text: referenceRoleSummary(refList),
        tone: 'refs'
      },
      {
        key: 'wardrobe',
        label: 'WARDROBE',
        text: wardrobeText || 'Camera-real styling from current wardrobe state.',
        tone: 'wardrobe'
      },
      {
        key: 'scene',
        label: 'SCENE',
        text: sceneText || 'Scene is waiting for location and action choices.',
        tone: 'scene'
      },
      {
        key: 'camera',
        label: anatomyLabels.camera || 'CAMERA',
        text: promptSentence(socialAnatomy ? [
          scene.action || optionText('g-shot-action'),
          modeVoice.promptPrefix || scene.shotModePromptVoice || '',
          [scene.cameraDistance || optionText('g-camera-distance'), scene.lens || optionText('g-lens')].filter(Boolean).join(', '),
          platformLabel ? 'Destination: ' + platformLabel + (aspectLabel ? ' / ' + aspectLabel : '') : '',
          platformIntel.focalPointGuidance || ''
        ] : [
          [scene.cameraDistance || optionText('g-camera-distance'), scene.lens || optionText('g-lens')].filter(Boolean).join(', '),
          platformLabel ? 'Destination: ' + platformLabel + (aspectLabel ? ' / ' + aspectLabel : '') : '',
          platformIntel.focalPointGuidance || '',
          promptTextList(platformIntel.promptModifiers || [])
        ]),
        tone: 'camera'
      },
      {
        key: 'light',
        label: 'LIGHT',
        text: promptSentence([
          scene.lightingLabel || scene.lighting || optionText('g-time'),
          lightingNote
        ]),
        tone: 'light'
      },
      {
        key: 'mood',
        label: anatomyLabels.mood || 'MOOD + ENERGY',
        text: moodText || 'Mood and movement follow the selected shot controls.',
        tone: 'mood'
      },
      {
        key: 'negative',
        label: 'AVOID',
        text: abbreviatePromptText(negative, 80),
        fullText: negative,
        tone: 'negative',
        expandable: true
      }
    ].filter(function(item){ return item.text && item.text.replace(/[.\s,-]/g, ''); });
  }

  function promptAnatomySegmentHtml(segment){
    if (segment.expandable) {
      return [
        '<details class="pg52-live-segment pg52-prompt-anatomy-segment pg52-prompt-anatomy-negative tone-' + esc(segment.tone) + '" data-prompt-segment="' + esc(segment.key) + '">',
          '<summary>',
            '<span>' + esc(segment.label) + '</span>',
            '<p>' + esc(segment.text) + '</p>',
            '<em>expand</em>',
          '</summary>',
          '<div class="pg52-prompt-anatomy-negative-full">' + esc(segment.fullText || segment.text) + '</div>',
        '</details>'
      ].join('');
    }
    return [
      '<article class="pg52-live-segment pg52-prompt-anatomy-segment tone-' + esc(segment.tone) + '" data-prompt-segment="' + esc(segment.key) + '">',
        '<span>' + esc(segment.label) + '</span>',
        '<p>' + esc(segment.text) + '</p>',
      '</article>'
    ].join('');
  }

  function livePromptPreviewHtml(kit){
    var segments = livePromptSegments(kit);
    var quality = livePromptQuality(kit);
    var dna = kit.generatorRecipe?.shotDna || '';
    var previousDna = state.generatorV5.lastRenderedDna || '';
    state.generatorV5.lastRenderedDna = dna;
    return [
      '<section class="pg52-live-preview pg52-prompt-anatomy" id="pg52-live-preview">',
        '<div class="pg52-live-preview-head pg52-prompt-anatomy-head">',
          '<div><span class="pg52-t-micro">Live prompt anatomy</span>' + dnaPillHtml(dna, previousDna) + dnaLoadHtml() + '</div>',
          '<div class="pg52-prompt-anatomy-actions">',
            '<button type="button" class="pg52-btn-ghost pg52-btn-sm" onclick="copyText(document.getElementById(\'out-main\')?.textContent || window._lastGenerated?.prompt || \'\',this)">Copy full prompt</button>',
            '<button type="button" class="pg52-btn-ghost pg52-btn-sm" onclick="copyText(document.getElementById(\'out-neg\')?.textContent || window._lastGenerated?.negPrompt || \'\',this)">Copy negative prompt</button>',
          '</div>',
        '</div>',
        '<div class="pg52-live-segments pg52-prompt-anatomy-segments">',
          segments.map(promptAnatomySegmentHtml).join(''),
        '</div>',
        '<div class="pg52-prompt-anatomy-quality">Prompt quality: ' + esc(quality.grade || 'D') + ' — ' + esc(quality.total || 0) + '/' + esc(quality.max || 100) + '<span>' + esc(quality.label || '') + '</span></div>',
      '</section>'
    ].join('');
  }

  function conceptBlastState(){
    var blast = state.generatorV5.conceptBlast || {};
    blast.filter = blast.filter || 'all';
    blast.locks = Object.assign({ location: false, lighting: false, wardrobe: false }, blast.locks || {});
    blast.cards = Array.isArray(blast.cards) ? blast.cards : [];
    blast.open = Boolean(blast.open);
    state.generatorV5.conceptBlast = blast;
    return blast;
  }

  function conceptBlastLocationPool(filter, modeOverride){
    filter = filter || conceptBlastState().filter || 'all';
    var mode = normalizeShotMode(modeOverride || currentShotMode());
    var baseEntries = filter === 'all' ? shotModeLocationEntries(mode) : locationEntries();
    var entries = baseEntries.filter(function(entry){ return entry && entry.id && !entry.aliasOf && !entry.custom; });
    if (filter === 'all' && mode !== 'editorial') {
      var directSocial = entries.filter(function(entry){
        return entry.socialMediaLocation && normalizeList(entry.modeAffinity).indexOf(mode) >= 0;
      });
      if (directSocial.length >= 6) {
        entries = directSocial;
      } else {
        var socialFallback = entries.filter(function(entry){
          return entry.socialMediaLocation && shotModeLocationMatches(entry, mode);
        });
        if (socialFallback.length >= 6) entries = socialFallback;
      }
    }
    if (filter === 'all') {
      var grouped = (LOCATION_CATEGORIES || []).map(function(category){
        return entries.filter(function(entry){ return entry.categoryId === category.id; });
      }).filter(function(group){ return group.length; });
      var interleaved = [];
      var round = 0;
      while (interleaved.length < entries.length) {
        var added = false;
        grouped.forEach(function(group){
          if (group[round]) {
            interleaved.push(group[round]);
            added = true;
          }
        });
        if (!added) break;
        round += 1;
      }
      entries = interleaved.length ? interleaved : entries;
    }
    if (filter === 'jhb') entries = entries.filter(function(entry){ return entry.categoryId === 'johannesburg'; });
    if (filter === 'international') entries = entries.filter(function(entry){ return entry.categoryId === 'international'; });
    if (filter === 'conceptual') entries = entries.filter(function(entry){ return entry.categoryId === 'conceptual'; });
    return entries.length ? entries : locationEntries().filter(function(entry){ return entry && entry.id && !entry.aliasOf; });
  }

  function conceptActionByGroup(groupIndex, fallbackIndex, mode){
    mode = normalizeShotMode(mode || currentShotMode());
    var groups = shotModeActionCategories(mode);
    var group = groups[groupIndex % groups.length] || groups[0] || ACTION_CATEGORIES[0];
    var actions = group.actions || shotModeActions(mode);
    return actions[fallbackIndex % actions.length] || shotModeDefaultAction(mode) || 'direct gaze, relaxed posture';
  }

  function conceptLightingAt(index, loc, lockedValue, mode){
    if (lockedValue) return lockedValue;
    mode = normalizeShotMode(mode || currentShotMode());
    if (mode !== 'editorial') {
      var socialCycle = uniqueList(socialLightingBoost(mode, loc, activeSaMomentPack())
        .concat(shotModeMeta(mode).lightingBoost || [])
        .concat(SOCIAL_LIGHTING_OPTIONS.filter(function(option){
          return normalizeList(option.bestFor).indexOf(mode) >= 0;
        }).map(function(option){ return option.id; }))
        .concat(normalizeList(loc && (loc.bestLighting || loc.light?.bestTimes))))
        .map(normalizeLightingId)
        .filter(function(id){ return id && lightingOptionById(id); });
      if (socialCycle.length) return socialCycle[index % socialCycle.length];
    }
    var cycle = [
      'golden_pm',
      'midday',
      'blue_hour',
      'indoor_artificial',
      'golden_am',
      'indoor_day'
    ];
    var preferred = normalizeList(loc && (loc.bestLighting || loc.light?.bestTimes));
    return preferred[index % preferred.length] || cycle[index % cycle.length];
  }

  function conceptMoodAt(index, loc, profile){
    var profileMoods = normalizeList(profile?.naturalMoods || profile?.moodSpectrum || []);
    var locMoods = normalizeList(loc && (loc.bestMoods || loc.moodNatural || loc.mood?.natural));
    var cycle = ['sharp', 'composed', 'candid', 'pensive', 'confident', 'soft'];
    return locMoods[index % locMoods.length] || profileMoods[index % profileMoods.length] || cycle[index % cycle.length];
  }

  function conceptCameraAt(index, loc){
    var cycle = ['tight portrait', 'medium portrait', 'three-quarter body', 'full body environmental', 'waist-up candid', 'full body environmental'];
    var suggested = normalizeList(loc && (loc.suggestedDistance || loc.depth?.suggestedDistance));
    return suggested[index % suggested.length] || cycle[index % cycle.length];
  }

  function conceptLensAt(index, cameraDistance){
    if (/tight|portrait/i.test(cameraDistance || '') && index % 2 === 0) return '85mm portrait compression';
    if (/full|environmental|low/i.test(cameraDistance || '')) return '35mm environmental realism';
    if (/waist|three/i.test(cameraDistance || '')) return '50mm natural perspective';
    return ['50mm natural perspective', '85mm portrait compression', '35mm environmental realism', 'phone camera realism'][index % 4];
  }

  function conceptTitleAt(index, loc, action, aesthetic){
    var titles = ['The Departure', 'The Hold', 'The Arrival', 'The Proof', 'The Cutaway', 'The Reveal'];
    if (/walking away|departure/i.test(action || '')) return 'The Departure';
    if (/turning|reveal|over-shoulder/i.test(action || '')) return 'The Reveal';
    if (/seated|desk|table/i.test(action || '')) return 'The Table Read';
    if (/fog|water|flame|frost|dune|silhouette/i.test(loc?.id || loc?.name || '')) return 'The ' + aesthetic;
    return titles[index % titles.length];
  }

  function conceptIdentityRiskLabel(card){
    if (!strictIdentityLockEnabled()) return 'Identity risk: strict lock off';
    if (/conceptual|surreal|fog|water|flame|frost|dune/i.test([card.locationCategory, card.locationName, card.vibe].join(' '))) {
      return 'Identity risk: medium - keep refs dominant';
    }
    return 'Identity risk: low - strict refs preserved';
  }

  function conceptSocialRealismLabel(card){
    var text = [card.locationName, card.action, card.cameraDistance, card.vibe].join(' ');
    if (/fog|submerged|flame|frost|dune|surreal|conceptual/i.test(text)) return 'Social realism: stylized, still raw-photo';
    if (/phone|walking|seated|cafe|office|street|portrait/i.test(text)) return 'Social realism: strong';
    return 'Social realism: source-photo ready';
  }

  function conceptDnaFor(card){
    var recipe = {
      scenePack: {
        shotMode: card.shotMode || currentShotMode(),
        locationId: card.locationId,
        lightingId: card.lightingId,
        cameraDistance: card.cameraDistance,
        lens: card.lens,
        moodId: card.moodId,
        movement: card.movement,
        props: card.props
      }
    };
    return encodeShotDna(recipe);
  }

  function generateConceptBlast(recipe, options){
    recipe = recipe || {};
    options = options || {};
    var blast = conceptBlastState();
    var filter = options.filter || blast.filter || 'all';
    var locks = Object.assign({}, blast.locks || {}, options.locks || {});
    var scene = recipe.scenePack || scenePackFromControls();
    var mode = normalizeShotMode(scene.shotMode || recipe.shotMode || currentShotMode());
    var profile = characterShootProfile(recipe.characterId || $('g-char')?.value || 'leah');
    var wardrobe = recipe.wardrobePack || selectedWardrobePack();
    var campaign = $('g-campaign')?.value || recipe.campaign || '';
    var currentLocation = resolveLocationRegistry(scene.locationId || $('g-location')?.value || 'cafe_braam') || conceptBlastLocationPool(filter, mode)[0];
    var pool = locks.location && currentLocation ? [currentLocation] : conceptBlastLocationPool(filter, mode);
    var activeWardrobe = activeWardrobeIds();
    var aesthetics = ['Editorial', 'Documentary', 'Cinematic', 'Commercial', 'Conceptual', 'Fashion Film'];
    var vibePairs = ['Editorial · Cinematic', 'Documentary · Real', 'Cinematic · Blue hour', 'Commercial · Premium', 'Conceptual · Surreal', 'Fashion Film · Material'];
    var movementCycle = ['still but alive', 'walking naturally', 'turning through available light', 'hands adjusting jacket', 'looking off then back', 'still but alive'];
    var propsCycle = ['', 'phone in hand', 'coffee cup', 'small tote bag', 'notebook', scene.props || ''];
    var cards = [];
    for (var i = 0; i < 6; i += 1) {
      var loc = pool[i % pool.length] || currentLocation || {};
      var lightingId = conceptLightingAt(i, loc, locks.lighting ? (scene.lightingId || $('g-time')?.value || '') : '', mode);
      var moodId = conceptMoodAt(i, loc, profile);
      var cameraDistance = conceptCameraAt(i, loc);
      var action = conceptActionByGroup(i % shotModeActionCategories(mode).length, i + (profile.energy === 'commanding_presence' ? 1 : 0), mode);
      var aesthetic = aesthetics[i % aesthetics.length];
      var card = {
        id: 'concept_blast_' + filter + '_' + i + '_' + String(loc.id || 'loc').replace(/[^a-z0-9_]+/gi, '_'),
        index: i + 1,
        shotMode: mode,
        shotModeLabel: shotModeMeta(mode).label,
        title: '',
        locationId: loc.id || scene.locationId || $('g-location')?.value || '',
        locationName: loc.name || scene.location || optionText('g-location') || 'Selected location',
        locationCategory: loc.categoryId || loc.category || '',
        lightingId: lightingId,
        lightingLabel: optionTextForValue('g-time', lightingId) || lightingId,
        action: action,
        cameraDistance: cameraDistance,
        lens: conceptLensAt(i, cameraDistance),
        moodId: moodId,
        moodLabel: optionTextForValue('g-mood', moodId) || moodId,
        movement: movementCycle[i % movementCycle.length],
        props: normalizeList(loc.props)[0] || propsCycle[i % propsCycle.length] || '',
        aesthetic: aesthetic,
        vibe: vibePairs[i % vibePairs.length],
        why: [
          loc.region || loc.category || 'Location',
          loc.depthCharacter || '',
          wardrobe.name ? ('wardrobe: ' + wardrobe.name) : '',
          campaign ? ('campaign: ' + campaign) : ''
        ].filter(Boolean).join(' · '),
        wardrobeId: locks.wardrobe ? selectedOutfitId() : '',
        activeWardrobeRefs: locks.wardrobe ? activeWardrobe.slice() : []
      };
      card.title = conceptTitleAt(i, loc, action, aesthetic);
      card.dna = conceptDnaFor(card);
      card.identityRisk = conceptIdentityRiskLabel(card);
      card.socialRealism = conceptSocialRealismLabel(card);
      cards.push(card);
    }
    if (!locks.location) {
      var seen = {};
      cards = cards.filter(function(card){
        if (seen[card.locationId]) return false;
        seen[card.locationId] = true;
        return true;
      });
      var idx = 0;
      while (cards.length < 6 && pool.length) {
        var locExtra = pool[(cards.length + idx) % pool.length];
        idx += 1;
        if (!locExtra || seen[locExtra.id]) continue;
        var clone = Object.assign({}, cards[cards.length % Math.max(cards.length, 1)] || {});
        clone.id = 'concept_blast_extra_' + filter + '_' + cards.length + '_' + locExtra.id;
        clone.index = cards.length + 1;
        clone.shotMode = mode;
        clone.shotModeLabel = shotModeMeta(mode).label;
        clone.locationId = locExtra.id;
        clone.locationName = locExtra.name;
        clone.locationCategory = locExtra.categoryId || locExtra.category || '';
        clone.why = [locExtra.region, locExtra.depthCharacter, wardrobe.name ? ('wardrobe: ' + wardrobe.name) : ''].filter(Boolean).join(' · ');
        clone.dna = conceptDnaFor(clone);
        clone.identityRisk = conceptIdentityRiskLabel(clone);
        clone.socialRealism = conceptSocialRealismLabel(clone);
        seen[locExtra.id] = true;
        cards.push(clone);
      }
    }
    return cards.slice(0, 6).map(function(card, index){
      card.index = index + 1;
      card.shotMode = normalizeShotMode(card.shotMode || mode);
      card.shotModeLabel = shotModeMeta(card.shotMode).label;
      card.dna = conceptDnaFor(card);
      card.identityRisk = card.identityRisk || conceptIdentityRiskLabel(card);
      card.socialRealism = card.socialRealism || conceptSocialRealismLabel(card);
      return card;
    });
  }

  function generateContextConcepts(recipe){
    return generateConceptBlast(recipe, conceptBlastState());
  }

  function shotHistoryKey(){
    return 'silva_generator_shot_history_v1';
  }

  function backendShotHistoryKey(){
    return 'generator_shot_history_v1';
  }

  function shotHistoryLocal(){
    var all = readLocalJson(shotHistoryKey(), []);
    return Array.isArray(all) ? all.filter(function(item){ return item && typeof item === 'object'; }) : [];
  }

  function writeShotHistoryLocal(history){
    try { localStorage.setItem(shotHistoryKey(), JSON.stringify((Array.isArray(history) ? history : []).slice(0, 200))); } catch (_) {}
  }

  function mergeShotHistory(existing, incoming){
    var byId = {};
    var merged = [];
    (Array.isArray(incoming) ? incoming : []).concat(Array.isArray(existing) ? existing : []).forEach(function(item){
      if (!item || !item.id || byId[item.id]) return;
      byId[item.id] = true;
      merged.push(item);
    });
    return merged.sort(function(a, b){
      return String(b.createdAt || b.generatedAt || '').localeCompare(String(a.createdAt || a.generatedAt || ''));
    }).slice(0, 200);
  }

  function loadShotHistory(charId){
    var all = state.generatorV5.shotHistoryLoaded ? state.generatorV5.shotHistory : shotHistoryLocal();
    if (!Array.isArray(all)) return [];
    return all.filter(function(item){ return !charId || item.character === charKey(charId); });
  }

  function stableImageUrl(src){
    src = String(src || '').trim();
    return /^data:image\//i.test(src) ? '' : src;
  }

  function modelCostZarNumber(model){
    model = model || modelById(getCurrentImageModel());
    var value = Number(model.costZAR ?? model.costEstimateZar ?? 0);
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }

  function shotHistoryId(charId){
    var suffix = (window.crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : (Date.now() + '_' + Math.random().toString(36).slice(2, 8));
    return 'shot_' + charKey(charId) + '_' + suffix;
  }

  function currentShotRecord(){
    var id = state.generatorV5.currentShotHistoryId || window._lastImageRouteResult?.shotHistoryId || '';
    if (!id) return null;
    return loadShotHistory().find(function(item){ return item && item.id === id; }) || null;
  }

  function saveShotHistoryRecord(routeResult, meta){
    meta = meta || {};
    var kit = null;
    try { kit = buildKit(); } catch (_) {}
    var recipe = kit?.generatorRecipe || window._lastGenerated?.generatorRecipe || {};
    var imageUrl = stableImageUrl(routeResult?.imageUrl || routeResult?.url || routeResult?.images?.[0]?.url || meta.imageData || routeResult?.imageData || '');
    var model = modelById(routeResult?.modelId || routeResult?.model || recipe.selectedModel || getCurrentImageModel());
    var createdAt = new Date().toISOString();
    var character = charKey(meta.character || recipe.characterId || $('g-char')?.value || 'leah');
    var record = {
      id: shotHistoryId(character),
      character: character,
      createdAt: createdAt,
      generatedAt: createdAt,
      dna: recipe.shotDna || encodeShotDna(recipe),
      promptSnippet: String(meta.prompt || kit?.mainPrompt || window._lastGenerated?.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      model: model.id || routeResult?.modelId || routeResult?.model || recipe.selectedModel || getCurrentImageModel(),
      costZAR: modelCostZarNumber(model),
      status: 'generated',
      refsUsed: (meta.referencePack || routeResult?.metadata?.referencePack || []).map(function(ref){ return ref.role || ref.type || ref.label || 'ref'; }),
      recipe: recipe,
      scenePack: recipe.scenePack || {},
      activeWardrobeIds: recipe.activeWardrobeIds || activeWardrobeIds(),
      seed: recipe.variationSeed || state.generatorV5.variationSeed || 0,
      result: {
        imageUrl: imageUrl,
        approved: null,
        rejectionReason: null,
        identityScore: routeResult?.identityScore ?? null,
        approvedAt: null,
        approvedBy: 'human',
        savedToGallery: false
      },
      notes: ''
    };
    state.generatorV5.currentShotHistoryId = record.id;
    state.generatorV5.shotHistory = mergeShotHistory(state.generatorV5.shotHistoryLoaded ? state.generatorV5.shotHistory : shotHistoryLocal(), [record]);
    state.generatorV5.shotHistoryLoaded = true;
    writeShotHistoryLocal(state.generatorV5.shotHistory);
    renderShotHistoryPanel();
    syncCharacterActivityDots();
    persistShotHistoryRecord(record);
    return record;
  }

  async function fetchShotHistory(options){
    options = options || {};
    var params = new URLSearchParams();
    if (options.character) params.set('character', charKey(options.character));
    if (options.status) params.set('status', options.status);
    params.set('limit', String(options.limit || 20));
    startAsyncOperation('shotHistoryFetch', { background: true, character: options.character || '' });
    try {
      var result = await fetchJsonWithTimeout('/api/generator/shot-history?' + params.toString(), { cache: 'no-store' }, 6500);
      if (result.res.ok && result.data && Array.isArray(result.data.history)) {
        state.generatorV5.shotHistory = mergeShotHistory(shotHistoryLocal(), result.data.history);
        state.generatorV5.shotHistoryLoaded = true;
        state.generatorV5.shotHistoryStatus = '';
        writeShotHistoryLocal(state.generatorV5.shotHistory);
        renderShotHistoryPanel();
        syncCharacterActivityDots();
        succeedAsyncOperation('shotHistoryFetch', { count: state.generatorV5.shotHistory.length });
        return state.generatorV5.shotHistory;
      }
      throw new Error(result.data?.message || 'Shot history unavailable');
    } catch (err) {
      state.generatorV5.shotHistory = mergeShotHistory(state.generatorV5.shotHistory, shotHistoryLocal());
      state.generatorV5.shotHistoryLoaded = true;
      state.generatorV5.shotHistoryStatus = 'Offline history cache active.';
      renderShotHistoryPanel();
      failAsyncOperation('shotHistoryFetch', err, { background: true });
      throttledAsyncWarning('shotHistoryFetch', 'Shot history unavailable. Offline history cache active.');
      return state.generatorV5.shotHistory;
    }
  }

  async function persistShotHistoryRecord(record){
    startAsyncOperation('shotHistoryPersist', { background: true, id: record && record.id });
    try {
      var result = await fetchJsonWithTimeout('/api/generator/shot-history', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ shot: record })
      }, 6500);
      if (result.res.ok && result.data && Array.isArray(result.data.history)) {
        state.generatorV5.shotHistory = mergeShotHistory(shotHistoryLocal(), result.data.history);
        state.generatorV5.shotHistoryStatus = '';
        writeShotHistoryLocal(state.generatorV5.shotHistory);
        renderShotHistoryPanel();
        succeedAsyncOperation('shotHistoryPersist', { id: record && record.id });
      } else {
        throw new Error(result.data?.message || 'Shot history save failed');
      }
    } catch (err) {
      state.generatorV5.shotHistoryStatus = 'Saved locally. Backend shot history will sync when available.';
      renderShotHistoryPanel();
      failAsyncOperation('shotHistoryPersist', err, { background: true });
      throttledAsyncWarning('shotHistoryPersist', 'Shot saved locally. Backend sync will retry when available.');
    }
  }

  async function updateShotHistoryStatus(id, patch){
    id = String(id || state.generatorV5.currentShotHistoryId || '').trim();
    if (!id) return null;
    patch = patch || {};
    var current = loadShotHistory().find(function(item){ return item && item.id === id; }) || {};
    var updated = Object.assign({}, current, patch, { id: id, updatedAt: new Date().toISOString() });
    if (updated.status === 'approved') {
      updated.result = Object.assign({}, updated.result || {}, { approved: true, approvedAt: updated.approvedAt || new Date().toISOString() });
    } else if (updated.status === 'rejected') {
      updated.result = Object.assign({}, updated.result || {}, { approved: false, rejectionReason: updated.failureType || updated.failureNote || 'rejected' });
    }
    state.generatorV5.lastMotionShotStatus = updated.status ? { id: id, status: updated.status } : null;
    state.generatorV5.shotHistory = mergeShotHistory(loadShotHistory(), [updated]);
    writeShotHistoryLocal(state.generatorV5.shotHistory);
    renderShotHistoryPanel();
    startAsyncOperation('shotHistoryUpdate', { background: true, id: id, status: updated.status || '' });
    try {
      var result = await fetchJsonWithTimeout('/api/generator/shot-history/' + encodeURIComponent(id), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch)
      }, 6500);
      if (result.res.ok && result.data && Array.isArray(result.data.history)) {
        state.generatorV5.shotHistory = mergeShotHistory(shotHistoryLocal(), result.data.history);
        state.generatorV5.shotHistoryStatus = '';
        writeShotHistoryLocal(state.generatorV5.shotHistory);
        renderShotHistoryPanel();
        succeedAsyncOperation('shotHistoryUpdate', { id: id, status: updated.status || '' });
        return result.data.shot || updated;
      }
      throw new Error(result.data?.message || 'Shot history update failed');
    } catch (err) {
      state.generatorV5.shotHistoryStatus = 'Review saved locally. Backend update did not complete.';
      renderShotHistoryPanel();
      failAsyncOperation('shotHistoryUpdate', err, { background: true });
      throttledAsyncWarning('shotHistoryUpdate', 'Review saved locally. Backend update did not complete.');
      return updated;
    }
  }

  function shotHistoryStatusLabel(shot){
    return shot.status === 'approved' ? 'approved' : shot.status === 'rejected' ? 'rejected' : 'generated';
  }

  function shotHistoryDate(shot){
    var date = new Date(shot.createdAt || shot.generatedAt || Date.now());
    if (Number.isNaN(date.getTime())) return 'recent';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function characterInitials(charId){
    var name = getCharSafe(charId).name || String(charId || 'shot').replace(/_/g, ' ');
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function(part){ return part.charAt(0).toUpperCase(); }).join('') || 'S';
  }

  function renderShotHistoryPanel(){
    var wrap = $('pg52-shot-history-panel');
    if (!wrap) return;
    var charId = $('g-char')?.value || 'leah';
    var shots = loadShotHistory(charId).slice(0, 20);
    var open = Boolean(state.generatorV5.shotHistoryOpen);
    wrap.hidden = false;
    wrap.classList.toggle('pg52-shot-history-panel--collapsed', !open);
    wrap.innerHTML = [
      '<div class="pg52-shot-history-head">',
        '<button class="pg52-shot-history-toggle" type="button" data-pg52-shot-history-toggle aria-expanded="' + (open ? 'true' : 'false') + '">',
          '<span class="pg52-t-micro">Shot History</span><strong>' + esc(shots.length) + ' recent</strong>',
        '</button>',
        '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-refresh-shot-history>Refresh</button>',
      '</div>',
      state.generatorV5.restoredShotNotice ? '<div class="pg52-shot-history-restored">' + esc(state.generatorV5.restoredShotNotice) + '</div>' : '',
      state.generatorV5.shotHistoryStatus ? '<div class="pg52-shot-history-status">' + esc(state.generatorV5.shotHistoryStatus) + '</div>' : '',
      '<div class="pg52-shot-history-strip" ' + (open ? '' : 'hidden') + '>',
        shots.length ? '' : '<div class="pg52-shot-history-empty">No generated shots recorded for this character yet.</div>',
        shots.map(function(shot){
          var status = shotHistoryStatusLabel(shot);
          var motion = state.generatorV5.lastMotionShotStatus;
          var motionClass = motion && motion.id === shot.id && (motion.status === 'approved' || motion.status === 'rejected') ? ' is-' + motion.status : '';
          return [
            '<button class="pg52-shot-memory-card pg52-shot-history-row' + motionClass + '" type="button" data-pg52-shot-id="' + esc(shot.id || '') + '" title="Reload shot: ' + esc(shot.dna || '') + '">',
              '<span class="pg52-shot-status-dot pg52-shot-status-dot--' + esc(status) + '"></span>',
              '<span class="pg52-shot-avatar">' + esc(characterInitials(shot.character || charId)) + '</span>',
              '<b>' + esc(shot.dna || 'shot.dna') + '</b>',
              '<span>' + esc(shot.model || 'model') + '</span>',
              '<span>R' + esc(Number(shot.costZAR || 0).toFixed(2)) + '</span>',
              '<time>' + esc(shotHistoryDate(shot)) + '</time>',
              '<em>↺ Reload</em>',
            '</button>'
          ].join('');
        }).join(''),
      '</div>'
    ].join('');
  }

  function restoreShotHistoryRecord(shot){
    if (!shot) return;
    var recipe = shot.recipe || {};
    var scene = recipe.scenePack || shot.scenePack || {};
    var cinematic = scene.cinematicPack || {};
    if (cinematic && typeof cinematic === 'object') {
      state.generatorV5.cinematicMode = Boolean(cinematic.enabled);
      state.generatorV5.cinematicAesthetic = cinematic.aestheticId || state.generatorV5.cinematicAesthetic;
      state.generatorV5.cinematicAestheticCustom = cinematic.customAesthetic || '';
      state.generatorV5.cinematicNarrative = cinematic.narrative || '';
      state.generatorV5.cinematicTreatments = Array.isArray(cinematic.treatments) ? cinematic.treatments.slice(0, 3) : [];
    }
    applyGeneratorState({
      shotMode: scene.shotMode || recipe.shotMode || state.generatorV5.shotMode || 'editorial',
      modelId: recipe.selectedModel || shot.model || '',
      spendLane: recipe.spendLane || '',
      locationId: scene.locationId || '',
      location: scene.location || '',
      lighting: scene.lightingId || '',
      moodId: scene.moodId || '',
      shotAction: scene.curatedAction || scene.action || state.generatorV5.shotAction,
      actionOverride: scene.actionOverride || scene.overrides?.action || '',
      cameraDistance: scene.cameraDistance || state.generatorV5.cameraDistance,
      lens: scene.lens || state.generatorV5.lens,
      movement: scene.movement || state.generatorV5.movement,
      props: scene.props || state.generatorV5.props,
      cameraStyle: scene.cameraStyle || '',
      socialFinishTreatment: scene.socialFinishTreatment?.id || recipe.socialFinishTreatment?.id || '',
      shotOverrides: scene.overrides || {},
      sceneOverride: scene.sceneOverride || '',
      activeWardrobeRefs: recipe.activeWardrobeIds || shot.activeWardrobeIds || state.generatorV5.activeWardrobeRefs,
      sceneRefs: recipe.sceneRefs || state.generatorV5.sceneRefs,
      locationIntelText: recipe.locationReferenceText || scene.locationReferenceText || '',
      variationSeed: recipe.variationSeed || shot.seed || state.generatorV5.variationSeed || 0
    }, { source: 'shot-history-reload' });
    state.generatorV5.currentShotHistoryId = shot.id || '';
    state.generatorV5.restoredShotNotice = 'Restored from ' + shotHistoryDate(shot) + '. Adjust anything, then regenerate.';
    renderShotHistoryPanel();
  }

  function prepareShotVariation(){
    var shot = currentShotRecord();
    if (shot) restoreShotHistoryRecord(shot);
    var seed = Date.now() % 100000;
    state.generatorV5.variationSeed = seed;
    if (state.generatorV5.smartRandomize) state.generatorV5.smartRandomize.seed = String(seed);
    renderShotHistoryPanel();
    renderPromptPreview();
    renderRoutePreview(null);
    schedulePreviewImageRouteFromGenerator();
    return seed;
  }

  async function loadGeneratorProfile(){
    if (state.generatorProfileLoaded) return state.generatorProfile;
    hydrateClosetsFromCache();
    state.generatorProfileLoading = true;
    state.generatorProfileError = '';
    startAsyncOperation('generatorProfileLoad', { background: true, character: $('g-char')?.value || 'leah' });
    try {
      var result = await fetchJsonWithTimeout('/api/generator/profile', { cache: 'no-store' }, 6500);
      if (result.res.ok && result.data && result.data.ok !== false) {
        state.generatorProfile = {
          closets: result.data.closets || {},
          sceneLibrary: result.data.sceneLibrary || {},
          presets: result.data.presets || {}
        };
        cacheClosets();
        succeedAsyncOperation('generatorProfileLoad', { profile: state.generatorProfile });
      }
    } catch (err) {
      state.generatorProfileError = "Couldn't load profile. Using defaults.";
      failAsyncOperation('generatorProfileLoad', err, { background: true });
      throttledAsyncWarning('generatorProfileLoad', state.generatorProfileError);
    } finally {
      state.generatorProfileLoading = false;
    }
    state.generatorProfileLoaded = true;
    return state.generatorProfile;
  }

  async function saveGeneratorProfilePatch(patch){
    patch = patch || {};
    try {
      var body = Object.assign({}, state.generatorProfile || {}, patch);
      var result = await fetchJsonWithTimeout('/api/generator/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }, 6500);
      if (result.res.ok && result.data) {
        state.generatorProfile = {
          closets: result.data.closets || body.closets || {},
          sceneLibrary: result.data.sceneLibrary || body.sceneLibrary || {},
          presets: result.data.presets || body.presets || {}
        };
        state.generatorProfileLoaded = true;
        cacheClosets();
      }
      return result.data;
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  function wardrobeStatus(message, isError){
    var node = $('pg52-wardrobe-status') || $('ai-helper-output');
    if (!node) return;
    node.textContent = message || '';
    node.className = 'pg52-status-line ' + (isError ? 'error' : 'ok');
  }

  function fileToDataUrl(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(String(reader.result || '')); };
      reader.onerror = function(){ reject(reader.error || new Error('Could not read file')); };
      reader.readAsDataURL(file);
    });
  }

  function validateWardrobeUploadFile(file){
    var message = 'Upload failed. File may be too large (max 10MB) or wrong format (jpg/png/webp).';
    if (!file) return { ok: false, message: message };
    var type = String(file.type || '').toLowerCase();
    var name = String(file.name || '').toLowerCase();
    var validType = /image\/(jpeg|jpg|png|webp)/.test(type) || /\.(jpe?g|png|webp)$/.test(name);
    var validSize = Number(file.size || 0) <= 10 * 1024 * 1024;
    return { ok: Boolean(validType && validSize), message: message };
  }

  function imageRoleMaxSide(role){
    role = String(role || '').toLowerCase();
    if (role === 'face') return 512;
    if (role === 'scene') return 1024;
    if (role === 'aesthetic') return 1024;
    return 768;
  }

  async function optimizeImageFile(file, role){
    var validation = validateWardrobeUploadFile(file);
    if (!validation.ok) throw new Error(validation.message);
    var dataUrl = await fileToDataUrl(file);
    var maxSide = imageRoleMaxSide(role || 'wardrobe');
    return compressDataUrl(dataUrl, maxSide, 0.82);
  }

  function setWardrobeUploadState(status, message, progress){
    var zone = $('pg52-upload-zone');
    if (!zone) return;
    zone.classList.toggle('is-uploading', status === 'loading');
    zone.classList.toggle('is-upload-error', status === 'error');
    zone.classList.toggle('is-async-success-flash', status === 'success');
    zone.style.setProperty('--pg52-upload-progress', Math.max(0, Math.min(100, Number(progress || 0))) + '%');
    var bar = zone.querySelector('.pg52-upload-progress');
    if (status === 'idle') {
      if (bar) bar.remove();
    } else if (!bar) {
      bar = document.createElement('div');
      bar.className = 'pg52-upload-progress';
      zone.appendChild(bar);
    }
    if (message) wardrobeStatus(message, status === 'error');
  }

  async function acceptWardrobeUploadFile(file){
    var validation = validateWardrobeUploadFile(file);
    if (!validation.ok) {
      setWardrobeUploadState('error', validation.message, 0);
      notifyAsync('error', validation.message);
      throw new Error(validation.message);
    }
    startAsyncOperation('wardrobeUpload', { fileName: file.name || '' });
    setWardrobeUploadState('loading', 'Reading wardrobe image...', 20);
    try {
      setWardrobeUploadState('loading', 'Optimizing image...', 45);
      var dataUrl = await optimizeImageFile(file, 'wardrobe');
      setWardrobeUploadState('loading', 'Preparing wardrobe preview...', 78);
      state.generatorV5.wardrobeUploadDataUrl = dataUrl;
      if ($('pg52-upload-preview-img')) $('pg52-upload-preview-img').src = dataUrl;
      if ($('pg52-upload-preview')) $('pg52-upload-preview').hidden = false;
      if ($('pg52-upload-prompt')) $('pg52-upload-prompt').hidden = true;
      if ($('pg52-wardrobe-name') && !$('pg52-wardrobe-name').value) $('pg52-wardrobe-name').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      updateWardrobeSaveReady();
      setWardrobeUploadState('success', 'Wardrobe image ready.', 100);
      succeedAsyncOperation('wardrobeUpload', { fileName: file.name || '' });
      return dataUrl;
    } catch (err) {
      setWardrobeUploadState('error', validation.message, 0);
      failAsyncOperation('wardrobeUpload', err, { message: validation.message });
      notifyAsync('error', validation.message);
      throw err;
    }
  }

  function compressDataUrl(dataUrl, maxSide, quality){
    maxSide = maxSide || 1180;
    quality = quality || 0.82;
    return new Promise(function(resolve){
      if (!/^data:image\//i.test(String(dataUrl || ''))) return resolve(dataUrl);
      var img = new Image();
      img.onload = function(){
        var scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
        var width = Math.max(1, Math.round((img.width || maxSide) * scale));
        var height = Math.max(1, Math.round((img.height || maxSide) * scale));
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        var mime = /^data:image\/png/i.test(dataUrl) ? 'image/png' : 'image/jpeg';
        var output = mime === 'image/png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
        resolve(output);
      };
      img.onerror = function(){ resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  function uploadQueueState(){
    var queue = state.generatorV5.uploadQueue || {};
    queue.items = Array.isArray(queue.items) ? queue.items : [];
    queue.active = Number(queue.active || 0);
    queue.completed = Number(queue.completed || 0);
    queue.failed = Number(queue.failed || 0);
    state.generatorV5.uploadQueue = queue;
    return queue;
  }

  function renderWardrobeUploadQueue(){
    var wrap = $('pg52-upload-queue');
    if (!wrap) return;
    var queue = uploadQueueState();
    if (!queue.items.length) {
      wrap.innerHTML = '';
      wrap.hidden = true;
      return;
    }
    wrap.hidden = false;
    wrap.innerHTML = queue.items.slice(0, 20).map(function(item, index){
      var label = item.status === 'waiting' ? ('Queued #' + (index + 1)) : titleCase(item.status || 'queued');
      return [
        '<div class="pg52-upload-queue-item ' + esc(item.status || 'waiting') + '">',
          '<span>' + esc(item.name || 'Wardrobe image') + '</span>',
          '<small>' + esc(label) + '</small>',
        '</div>'
      ].join('');
    }).join('');
  }

  function wardrobeItemFromQueuedFile(file, dataUrl){
    var baseName = String(file?.name || 'Uploaded outfit').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 80) || 'Uploaded outfit';
    var kindInput = document.querySelector('input[name="pg52-wardrobe-kind"]:checked');
    var kind = String(kindInput?.value || $('pg52-wardrobe-slot')?.value || 'clothing_item').trim() || 'clothing_item';
    return normalizeClosetItem({
      id: 'wardrobe_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      characterId: charKey($('g-char')?.value || 'leah'),
      name: baseName,
      kind: kind,
      slot: String($('pg52-wardrobe-slot')?.value || kind || 'look'),
      category: String($('pg52-wardrobe-slot')?.value || kind || 'look'),
      palette: String($('pg52-wardrobe-palette')?.value || '').trim() || 'camera-real palette',
      garments: String($('pg52-wardrobe-notes')?.value || '').trim() ? [String($('pg52-wardrobe-notes')?.value || '').trim()] : [],
      fit: 'match the wardrobe reference image exactly where visible',
      vibe: 'real, wearable, character-appropriate',
      tags: String($('pg52-wardrobe-tags')?.value || '').split(',').map(function(tag){ return tag.trim(); }).filter(Boolean),
      notes: String($('pg52-wardrobe-notes')?.value || '').trim(),
      sourceType: 'character_wardrobe_bulk_upload',
      image: {
        dataUrl: dataUrl,
        mimeType: (String(dataUrl).match(/^data:([^;]+);/) || [])[1] || ''
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function processWardrobeUploadQueueItem(item){
    item.status = 'optimizing';
    renderWardrobeUploadQueue();
    var dataUrl = await optimizeImageFile(item.file, 'wardrobe');
    item.status = 'saving';
    renderWardrobeUploadQueue();
    var wardrobeItem = wardrobeItemFromQueuedFile(item.file, dataUrl);
    await persistWardrobeItem(wardrobeItem);
    var ids = activeWardrobeIds();
    if (!ids.includes(wardrobeItem.id)) ids.unshift(wardrobeItem.id);
    state.generatorV5.activeWardrobeRefs = ids.slice(0, 6);
    item.status = 'done';
    item.itemId = wardrobeItem.id;
    uploadQueueState().completed += 1;
  }

  function pumpWardrobeUploadQueue(){
    if (wardrobeUploadQueueRunning) return;
    wardrobeUploadQueueRunning = true;
    var queue = uploadQueueState();
    function next(){
      queue = uploadQueueState();
      while (queue.active < 2) {
        var item = queue.items.find(function(entry){ return entry.status === 'waiting'; });
        if (!item) break;
        queue.active += 1;
        processWardrobeUploadQueueItem(item).catch(function(err){
          item.status = 'error';
          item.error = String(err?.message || err || 'Upload failed.');
          queue.failed += 1;
          notifyAsync('error', item.error);
        }).finally(function(){
          queue.active = Math.max(0, queue.active - 1);
          renderWardrobeUploadQueue();
          renderWardrobeCards();
          renderWardrobeLibrary();
          renderReferenceDock();
          updateWardrobeSaveReady();
          if (queue.items.some(function(entry){ return entry.status === 'waiting'; })) {
            next();
          } else {
            wardrobeUploadQueueRunning = false;
            wardrobeStatus(queue.failed ? 'Wardrobe upload queue finished with errors.' : 'Wardrobe upload queue complete.', Boolean(queue.failed));
            notifyAsync(queue.failed ? 'warning' : 'success', queue.failed ? 'Some wardrobe uploads failed.' : 'Wardrobe upload queue complete.');
          }
        });
      }
      renderWardrobeUploadQueue();
    }
    next();
  }

  function enqueueWardrobeUploads(files){
    files = Array.prototype.slice.call(files || []).filter(Boolean);
    if (!files.length) return;
    var queue = uploadQueueState();
    files.forEach(function(file){
      queue.items.push({
        id: 'upload_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        name: file.name || 'Wardrobe image',
        file: file,
        status: 'waiting',
        createdAt: Date.now()
      });
    });
    wardrobeStatus('Queued ' + files.length + ' wardrobe upload' + (files.length === 1 ? '' : 's') + '. Max 2 process at once.');
    renderWardrobeUploadQueue();
    pumpWardrobeUploadQueue();
  }

  function wardrobeItemFromForm(dataUrl){
    var charId = charKey($('g-char')?.value || 'leah');
    var name = String($('pg52-wardrobe-name')?.value || '').trim() || 'Uploaded outfit';
    var kindInput = document.querySelector('input[name="pg52-wardrobe-kind"]:checked');
    var kind = String(kindInput?.value || $('pg52-wardrobe-slot')?.value || 'clothing_item').trim() || 'clothing_item';
    var slot = String($('pg52-wardrobe-slot')?.value || kind || 'look').trim() || 'look';
    var tags = String($('pg52-wardrobe-tags')?.value || '').split(',').map(function(tag){ return tag.trim(); }).filter(Boolean);
    var notes = String($('pg52-wardrobe-notes')?.value || '').trim();
    var id = state.generatorV5.wardrobeEditingId || ('wardrobe_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7));
    var existing = currentCloset().find(function(item){ return item.id === id; }) || {};
    var imageDataUrl = dataUrl || state.generatorV5.wardrobeUploadDataUrl || existing.image?.dataUrl || existing.ref || '';
    return normalizeClosetItem({
      id: id,
      characterId: charId,
      name: name,
      kind: kind,
      slot: slot,
      category: slot,
      palette: String($('pg52-wardrobe-palette')?.value || existing.palette || '').trim() || 'camera-real palette',
      garments: notes ? [notes] : (existing.garments || []),
      fit: existing.fit || 'match the wardrobe reference image exactly where visible',
      vibe: existing.vibe || 'real, wearable, character-appropriate',
      tags: tags,
      notes: notes,
      sourceType: 'character_wardrobe_upload',
      image: {
        dataUrl: imageDataUrl,
        url: existing.image?.url || '',
        mimeType: (String(imageDataUrl).match(/^data:([^;]+);/) || [])[1] || existing.image?.mimeType || ''
      },
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  async function persistWardrobeItem(item){
    var characterId = charKey(item.characterId || $('g-char')?.value || 'leah');
    try {
      var result = await fetchJsonWithTimeout('/api/generator/wardrobe/' + encodeURIComponent(characterId) + '/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      }, 9000);
      if (!result.res.ok || result.data?.ok === false) throw new Error(result.data?.message || 'Wardrobe save failed');
      state.generatorProfile.closets = result.data.closets || state.generatorProfile.closets || {};
      cacheClosets();
      return result.data;
    } catch (err) {
      var closets = Object.assign({}, profileClosets());
      var list = Array.isArray(closets[characterId]) ? closets[characterId].slice() : [];
      var idx = list.findIndex(function(existing){ return existing.id === item.id; });
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
      closets[characterId] = list;
      state.generatorProfile.closets = closets;
      cacheClosets();
      await saveGeneratorProfilePatch({ closets: closets });
      return { ok: true, offlineFallback: true, item: item, closets: closets };
    }
  }

  async function deleteWardrobeItem(itemId){
    var characterId = charKey($('g-char')?.value || 'leah');
    try {
      var result = await fetchJsonWithTimeout('/api/generator/wardrobe/' + encodeURIComponent(characterId) + '/item/' + encodeURIComponent(itemId), { method: 'DELETE' }, 9000);
      if (!result.res.ok || result.data?.ok === false) throw new Error(result.data?.message || 'Wardrobe delete failed');
      state.generatorProfile.closets = result.data.closets || state.generatorProfile.closets || {};
    } catch (_) {
      var closets = Object.assign({}, profileClosets());
      closets[characterId] = (closets[characterId] || []).filter(function(item){ return item.id !== itemId; });
      state.generatorProfile.closets = closets;
      await saveGeneratorProfilePatch({ closets: closets });
    }
    state.generatorV5.activeWardrobeRefs = activeWardrobeIds().filter(function(id){ return id !== itemId; });
    cacheClosets();
    applyGeneratorState({}, { source: 'wardrobe-delete' });
  }

  async function saveWardrobeFromForm(){
    var file = $('pg52-wardrobe-file-input')?.files?.[0] || $('pg52-wardrobe-file')?.files?.[0] || null;
    var saveButton = $('pg52-wardrobe-save-btn');
    if (file) {
      var validation = validateWardrobeUploadFile(file);
      if (!validation.ok) {
        setWardrobeUploadState('error', validation.message, 0);
        notifyAsync('error', validation.message);
        throw new Error(validation.message);
      }
    }
    startAsyncOperation('wardrobeSave', { character: $('g-char')?.value || 'leah' });
    var savedOk = false;
    if (saveButton) {
      saveButton.classList.add('is-async-loading');
      saveButton.disabled = true;
    }
    wardrobeStatus(file ? 'Compressing wardrobe image...' : 'Saving wardrobe item...');
    var dataUrl = '';
    try {
      if (file) {
        setWardrobeUploadState('loading', 'Optimizing image...', 45);
        dataUrl = await optimizeImageFile(file, 'wardrobe');
        setWardrobeUploadState('loading', 'Saving wardrobe item...', 82);
      }
      var item = wardrobeItemFromForm(dataUrl);
      await persistWardrobeItem(item);
      var ids = activeWardrobeIds();
      if (!ids.includes(item.id)) ids.unshift(item.id);
      state.generatorV5.activeWardrobeRefs = ids.slice(0, 6);
      state.generatorV5.wardrobeFormOpen = false;
      state.generatorV5.wardrobeEditingId = '';
      state.generatorV5.wardrobeUploadDataUrl = '';
      applyGeneratorState({}, { source: 'wardrobe-save' });
      closeWardrobeForm();
      wardrobeStatus('Saved to this character wardrobe.');
      succeedAsyncOperation('wardrobeSave', { itemId: item.id });
      notifyAsync('success', 'Saved to this character wardrobe.');
      savedOk = true;
    } catch (err) {
      failAsyncOperation('wardrobeSave', err);
      notifyAsync('error', "Couldn't save. Changes held locally. Retry", {
        label: 'Retry',
        handler: function(){ saveWardrobeFromForm().catch(function(){}); }
      });
      throw err;
    } finally {
      if (saveButton) {
        saveButton.classList.remove('is-async-loading');
        saveButton.disabled = false;
        if (savedOk) saveButton.classList.add('pg52-async-success-flash');
      }
    }
  }

  function openWardrobeForm(itemId){
    var item = itemId ? currentCloset().find(function(entry){ return entry.id === itemId; }) : null;
    state.generatorV5.wardrobeFormOpen = true;
    state.generatorV5.wardrobeEditingId = item?.id || '';
    state.generatorV5.wardrobeUploadDataUrl = item?.image?.dataUrl || item?.ref || '';
    var drawer = $('pg52-wardrobe-drawer');
    var backdrop = $('pg52-wardrobe-backdrop');
    if (drawer && backdrop) {
      drawer.hidden = false;
      backdrop.hidden = false;
      requestAnimationFrame(function(){
        drawer.classList.add('open');
        backdrop.classList.add('open');
      });
      document.body.style.overflow = 'hidden';
    } else {
      renderWardrobeLibrary();
    }
    if (item) {
      if ($('pg52-wardrobe-name')) $('pg52-wardrobe-name').value = item.name || '';
      if ($('pg52-wardrobe-slot')) $('pg52-wardrobe-slot').value = item.slot || item.category || 'look';
      var kind = item.kind || item.slot || 'clothing_item';
      document.querySelectorAll('input[name="pg52-wardrobe-kind"]').forEach(function(input){
        if (input.value === kind) input.checked = true;
      });
      if ($('pg52-wardrobe-palette')) $('pg52-wardrobe-palette').value = item.palette || '';
      if ($('pg52-wardrobe-tags')) $('pg52-wardrobe-tags').value = (item.tags || []).join(', ');
      if ($('pg52-wardrobe-notes')) $('pg52-wardrobe-notes').value = item.notes || (item.garments || []).join(', ');
      if ($('pg52-upload-preview-img') && state.generatorV5.wardrobeUploadDataUrl) {
        $('pg52-upload-preview-img').src = state.generatorV5.wardrobeUploadDataUrl;
        if ($('pg52-upload-preview')) $('pg52-upload-preview').hidden = false;
        if ($('pg52-upload-prompt')) $('pg52-upload-prompt').hidden = true;
      }
    } else {
      resetWardrobeFormUi();
    }
    updateWardrobeSaveReady();
    $('pg52-wardrobe-name')?.focus();
  }

  function closeWardrobeForm(){
    state.generatorV5.wardrobeFormOpen = false;
    state.generatorV5.wardrobeEditingId = '';
    state.generatorV5.wardrobeUploadDataUrl = '';
    var drawer = $('pg52-wardrobe-drawer');
    var backdrop = $('pg52-wardrobe-backdrop');
    if (drawer && backdrop) {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      onMotionEndOnce(drawer, function(){
        drawer.hidden = true;
        backdrop.hidden = true;
      });
      document.body.style.overflow = '';
    }
    resetWardrobeFormUi();
    renderWardrobeLibrary();
  }

  function resetWardrobeFormUi(){
    if ($('pg52-wardrobe-name')) $('pg52-wardrobe-name').value = '';
    if ($('pg52-wardrobe-notes')) $('pg52-wardrobe-notes').value = '';
    if ($('pg52-wardrobe-file-input')) $('pg52-wardrobe-file-input').value = '';
    if ($('pg52-upload-preview-img')) $('pg52-upload-preview-img').removeAttribute('src');
    if ($('pg52-upload-preview')) $('pg52-upload-preview').hidden = true;
    if ($('pg52-upload-prompt')) $('pg52-upload-prompt').hidden = false;
    updateWardrobeSaveReady();
  }

  function updateWardrobeSaveReady(){
    var btn = $('pg52-wardrobe-save-btn');
    if (!btn) return;
    var hasName = Boolean(String($('pg52-wardrobe-name')?.value || '').trim());
    var hasImage = Boolean(state.generatorV5.wardrobeUploadDataUrl || $('pg52-wardrobe-file-input')?.files?.[0] || state.generatorV5.wardrobeEditingId);
    btn.disabled = !(hasName && hasImage);
  }

  function randomFrom(items){
    return items[Math.floor(Math.random() * items.length)] || items[0] || '';
  }

  function locked(field){
    return Boolean(state.generatorV5.locks && state.generatorV5.locks[field]);
  }

  function smartSeedValue(input){
    var raw = String(input || '').trim();
    if (/^\d+$/.test(raw)) return Math.max(1, Math.min(999999999, Number(raw)));
    if (!raw) return Math.floor(10000 + Math.random() * 89999);
    var hash = 2166136261;
    for (var i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0) || 1;
  }

  function seededRandom(seed){
    var t = smartSeedValue(seed) >>> 0;
    return function(){
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function optionValuesFor(id, fallbackValues){
    var values = optionObjectsFor(id, fallbackValues).map(function(item){ return item.value; });
    return uniqueList(values).filter(function(value){ return value != null; });
  }

  function smartWeightedPick(items, rng, scoreFn){
    items = (Array.isArray(items) ? items : []).filter(Boolean);
    if (!items.length) return '';
    var weighted = items.map(function(item){
      var score = Number(scoreFn ? scoreFn(item) : 1);
      return { item: item, weight: Math.max(1, Math.round(score || 1)) };
    });
    var total = weighted.reduce(function(sum, item){ return sum + item.weight; }, 0);
    var roll = rng() * total;
    for (var i = 0; i < weighted.length; i += 1) {
      roll -= weighted[i].weight;
      if (roll <= 0) return weighted[i].item;
    }
    return weighted[weighted.length - 1].item;
  }

  function smartRandomizeSnapshot(){
    var scene = scenePackFromControls();
    return {
      shotMode: scene.shotMode || currentShotMode(),
      locationId: scene.locationId,
      location: scene.location,
      lighting: scene.lightingId,
      moodId: scene.moodId,
      shotAction: scene.curatedAction || scene.action,
      cameraDistance: scene.cameraDistance,
      lens: scene.lens,
      cameraStyle: $('g-camera')?.value || '',
      movement: scene.movement,
      props: $('g-props')?.value || state.generatorV5.props || '',
      shotOverrides: Object.assign({}, shotOverridesState()),
      actionOverride: state.generatorV5.actionOverride || '',
      actionSuggestion: state.generatorV5.actionSuggestion || null,
      sceneOverride: state.generatorV5.sceneOverride || '',
      activeWardrobeRefs: activeWardrobeIds(),
      selectedRefs: Object.assign({}, state.generatorV5.selectedRefs || {}),
      locks: Object.assign({}, state.generatorV5.locks || {}),
      smartRandomize: {
        mode: smartRandomizeState().mode,
        seed: smartRandomizeState().seed,
        axisLocks: Object.assign({}, smartRandomizeState().axisLocks || {})
      },
      variationSeed: state.generatorV5.variationSeed || 0
    };
  }

  function restoreSmartRandomizeSnapshot(snapshot, source){
    if (!snapshot) return;
    applyGeneratorState({
      shotMode: snapshot.shotMode || state.generatorV5.shotMode || 'editorial',
      locationId: snapshot.locationId,
      location: snapshot.location,
      lighting: snapshot.lighting,
      moodId: snapshot.moodId,
      shotAction: snapshot.shotAction,
      cameraDistance: snapshot.cameraDistance,
      lens: snapshot.lens,
      cameraStyle: snapshot.cameraStyle,
      movement: snapshot.movement,
      props: snapshot.props,
      shotOverrides: snapshot.shotOverrides || {},
      actionOverride: snapshot.actionOverride || '',
      actionSuggestion: snapshot.actionSuggestion || null,
      sceneOverride: snapshot.sceneOverride || '',
      selectedRefs: snapshot.selectedRefs || {},
      activeWardrobeRefs: snapshot.activeWardrobeRefs || [],
      locks: snapshot.locks || {},
      variationSeed: snapshot.variationSeed || 0
    }, { source: source || 'smart-randomize-restore' });
    if (snapshot.smartRandomize) {
      var smart = smartRandomizeState();
      smart.mode = snapshot.smartRandomize.mode || smart.mode;
      smart.seed = snapshot.smartRandomize.seed || smart.seed;
      smart.axisLocks = Object.assign({}, smart.axisLocks || {}, snapshot.smartRandomize.axisLocks || {});
      syncSmartRandomizeUi();
    }
  }

  function smartWardrobeText(){
    var items = activeWardrobeItems();
    if (!items.length) {
      var selected = currentCloset().find(function(item){ return item.id === selectedOutfitId(); });
      if (selected) items = [selected];
    }
    return items.map(function(item){
      return [item.name, item.kind, item.category, item.palette, item.vibe, item.notes, normalizeList(item.tags).join(' ')].filter(Boolean).join(' ');
    }).join(' ').toLowerCase();
  }

  function locationIsIntimate(loc){
    var text = [loc?.name, loc?.subType, loc?.depthCharacter, loc?.environment].join(' ').toLowerCase();
    return /cafe|suite|hotel|library|spa|church|corridor|desk|lobby|interior|compressed|shallow/.test(text);
  }

  function formalWardrobeMismatch(loc, wardrobeText){
    var locText = [loc?.name, loc?.subType, loc?.categoryId, loc?.environment].join(' ').toLowerCase();
    var formal = /formal|tailor|tailored|blazer|suit|structured|luxury|premium|heel|jewel|jewellery|dress|skirt/.test(wardrobeText || '');
    return formal && /gym|beach|market|informal|pool|water|club|nightclub/.test(locText);
  }

  function smartLocationPool(mode){
    var entries = (mode === 'conceptual' ? locationEntries() : shotModeLocationEntries(currentShotMode())).filter(function(loc){ return loc && !loc.aliasOf && !loc.custom; });
    if (mode === 'conceptual') return entries.filter(function(loc){ return loc.categoryId === 'conceptual'; });
    if (mode === 'safe') return entries.filter(function(loc){ return loc.categoryId !== 'conceptual'; });
    return entries;
  }

  function smartLocationScore(loc, context){
    var mode = context.mode || 'safe';
    var score = 60;
    var profile = context.profile || {};
    var wardrobeText = context.wardrobeText || '';
    if (normalizeList(profile.naturalEnvironments).includes(loc.id)) score += 22;
    if (normalizeList(profile.avoidEnvironments).includes(loc.id)) score -= mode === 'bold' ? 12 : 30;
    if (formalWardrobeMismatch(loc, wardrobeText)) score -= mode === 'bold' ? 12 : 42;
    if (/formal|tailor|blazer|structured|luxury|premium/.test(wardrobeText) && /interior|hotel|lobby|gallery|studio|boardroom|financial|atrium/.test([loc.environment, loc.subType, loc.name].join(' ').toLowerCase())) score += 24;
    if (/tee|denim|casual|street|sport/.test(wardrobeText) && /street|rooftop|exterior|precinct|market/.test([loc.environment, loc.subType, loc.name].join(' ').toLowerCase())) score += 16;
    if (mode === 'conceptual') score += loc.categoryId === 'conceptual' ? 50 : -40;
    if (mode === 'bold') score += loc.categoryId === 'international' || loc.categoryId === 'conceptual' ? 18 : 0;
    return Math.max(4, score);
  }

  function smartLightingScore(value, loc, mode){
    var rec = uniqueList(loc?.bestLighting || loc?.light?.bestTimes || defaultLocationLighting(loc || {}));
    var avoid = uniqueList(loc?.avoidLighting || loc?.light?.avoid || []);
    var env = String(loc?.environment || '').toLowerCase();
    var score = rec.includes(value) ? 82 : 42;
    if (avoid.includes(value)) score -= mode === 'bold' ? 15 : 38;
    if (env === 'exterior' && /indoor_artificial|indoor_day/.test(value)) score -= mode === 'conceptual' ? 6 : 34;
    if ((env === 'studio' || env === 'conceptual') && /indoor_artificial|blue_hour|golden_pm/.test(value)) score += 18;
    if (mode === 'bold' && /blue_hour|midday|indoor_artificial/.test(value)) score += 18;
    if (mode === 'safe' && /golden|morning|late_afternoon|indoor_day/.test(value)) score += 12;
    return Math.max(2, score);
  }

  function smartCameraScore(value, loc, mode){
    var rec = uniqueList(loc?.suggestedDistance || loc?.depth?.suggestedDistance || defaultLocationDistance(loc || {}));
    var avoid = uniqueList(loc?.avoidDistance || loc?.depth?.avoid || []);
    var score = rec.includes(value) ? 82 : 44;
    if (avoid.includes(value)) score -= mode === 'bold' ? 8 : 34;
    if (locationIsIntimate(loc) && /full body environmental/.test(value)) score -= mode === 'bold' ? 6 : 36;
    if (mode === 'conceptual' && /full body|three-quarter|waist/.test(value)) score += 15;
    return Math.max(3, score);
  }

  function smartMoodScore(value, loc, profile, mode){
    var rec = uniqueList((loc?.bestMoods || loc?.moodNatural || loc?.mood?.natural || []).concat(profile?.naturalMoods || profile?.moodSpectrum || []));
    var avoid = uniqueList(loc?.avoidMoods || loc?.mood?.avoid || []);
    var score = rec.includes(value) ? 82 : 46;
    if (avoid.includes(value)) score -= mode === 'bold' ? 10 : 32;
    if (mode === 'bold' && /confident|in_motion|sharp/.test(value)) score += 16;
    if (mode === 'conceptual' && /pensive|soft|confident|sharp/.test(value)) score += 18;
    return Math.max(4, score);
  }

  function smartActionScore(action, loc, mood, mode){
    var text = String(action || '').toLowerCase();
    var locAffinity = normalizeList(loc?.actionAffinity || []);
    var score = locAffinity.includes(action) ? 86 : 46;
    if (/pensive|soft|composed/.test(mood || '') && /running|walking toward|phone to ear|hair mid|mid-laugh|bold|dominance/.test(text)) score -= mode === 'bold' ? 8 : 30;
    if (/confident|in_motion|sharp/.test(mood || '') && /mid-stride|walking|turning|direct gaze|adjusting|full body/.test(text)) score += 18;
    if (locationIsIntimate(loc) && /running|full body|elevated surface|low angle/.test(text)) score -= mode === 'bold' ? 4 : 24;
    if (mode === 'conceptual' && /silhouette|eyes closed|crouching|above|low angle|release|wind|shadow|emergence/.test(text)) score += 28;
    return Math.max(3, score);
  }

  function smartPropsScore(value, loc, mode){
    var rec = uniqueList(loc?.props || []);
    if (!value) return mode === 'safe' ? 68 : 34;
    var score = rec.includes(value) ? 86 : 42;
    if (mode === 'conceptual' && !rec.includes(value)) score -= 14;
    return Math.max(4, score);
  }

  function generateSmartRandomizePatch(seed, mode, locks){
    mode = mode || smartRandomizeState().mode || 'safe';
    locks = Object.assign({}, smartRandomizeState().axisLocks || {}, locks || {});
    var rng = seededRandom(seed);
    var current = smartRandomizeSnapshot();
    var profile = characterShootProfile($('g-char')?.value || 'leah');
    var wardrobeText = smartWardrobeText();
    var context = { mode: mode, profile: profile, wardrobeText: wardrobeText };
    var currentLoc = resolveLocationRegistry(current.locationId) || {};
    var loc = locks.location ? currentLoc : smartWeightedPick(smartLocationPool(mode), rng, function(item){ return smartLocationScore(item, context); });
    loc = loc || currentLoc;
    var lightingValues = optionValuesFor('g-time');
    var moodValues = optionValuesFor('g-mood');
    var cameraValues = optionValuesFor('g-camera-distance', CAMERA_DISTANCES);
    var lensValues = optionValuesFor('g-lens', LENS_CHOICES);
    var propsValues = optionValuesFor('g-props', PROP_CHOICES);
    var movementValues = optionValuesFor('g-movement', MOVEMENT_CHOICES);
    var cameraStyleValues = optionValuesFor('g-camera');
    var lighting = locks.lighting ? current.lighting : smartWeightedPick(lightingValues, rng, function(value){ return smartLightingScore(value, loc, mode); });
    var mood = locks.mood ? current.moodId : smartWeightedPick(moodValues, rng, function(value){ return smartMoodScore(value, loc, profile, mode); });
    var cameraDistance = locks.camera ? current.cameraDistance : smartWeightedPick(cameraValues, rng, function(value){ return smartCameraScore(value, loc, mode); });
    var modeActions = shotModeActions(currentShotMode());
    var action = locks.action ? current.shotAction : smartWeightedPick(modeActions.length ? modeActions : SHOT_ACTIONS, rng, function(value){ return smartActionScore(value, loc, mood, mode); });
    var props = locks.props ? current.props : smartWeightedPick(propsValues, rng, function(value){ return smartPropsScore(value, loc, mode); });
    var lens = locks.camera ? current.lens : smartWeightedPick(lensValues, rng, function(value){
      if (/tight|portrait/i.test(cameraDistance || '') && /85mm|50mm/.test(value)) return 82;
      if (/full|environmental/i.test(cameraDistance || '') && /35mm|documentary/.test(value)) return 84;
      return 42;
    });
    var cameraStyle = locks.camera ? current.cameraStyle : smartWeightedPick(cameraStyleValues, rng, function(value){
      if (mode === 'conceptual' && /cinematic|editorial/.test(value)) return 88;
      if (mode === 'safe' && /editorial|documentary|phone_real/.test(value)) return 74;
      return 45;
    });
    var movement = locks.action ? current.movement : smartWeightedPick(movementValues, rng, function(value){
      if (/walking|turning|hands/.test(value) && /in_motion|confident|sharp/.test(mood || '')) return 84;
      if (/still/.test(value) && /pensive|soft|composed/.test(mood || '')) return 82;
      return 46;
    });
    var clearOverrides = {};
    if (!locks.action) clearOverrides.action = '';
    if (!locks.lighting) clearOverrides.lighting = '';
    if (!locks.mood) clearOverrides.mood = '';
    if (!locks.props) clearOverrides.props = '';
    var patch = {
      locationId: locks.location ? current.locationId : loc.id,
      location: locks.location ? current.location : loc.name,
      lighting: lighting,
      moodId: mood,
      shotAction: action,
      cameraDistance: cameraDistance,
      lens: lens,
      cameraStyle: cameraStyle,
      movement: movement,
      props: props,
      actionSuggestion: null,
      variationSeed: smartSeedValue(seed),
      smartRandomize: {
        seed: String(smartSeedValue(seed)),
        mode: mode,
        locks: Object.assign({}, locks)
      }
    };
    if (Object.keys(clearOverrides).length) patch.shotOverrides = clearOverrides;
    return patch;
  }

  function smartRandomizeDna(snapshotOrPatch){
    var item = snapshotOrPatch || smartRandomizeSnapshot();
    var scenePack = {
      locationId: item.locationId,
      lightingId: item.lighting,
      cameraDistance: item.cameraDistance,
      lens: item.lens,
      moodId: item.moodId,
      movement: item.movement,
      props: item.props,
      overrides: item.shotOverrides || {}
    };
    return encodeShotDna({ scenePack: scenePack });
  }

  function pushSmartRandomizeHistory(seed, patch){
    var smart = smartRandomizeState();
    var snapshot = smartRandomizeSnapshot();
    var item = {
      id: 'smart_rand_' + seed + '_' + Date.now(),
      seed: String(seed),
      mode: smart.mode,
      dna: smartRandomizeDna(snapshot),
      snapshot: snapshot,
      patch: patch || null
    };
    smart.history = [item].concat(smart.history || []).slice(0, 5);
  }

  function applySmartRandomize(seedInput){
    var smart = smartRandomizeState();
    var seed = smartSeedValue(seedInput || $('g-smart-randomize-seed')?.value || '');
    smart.previousSnapshot = smartRandomizeSnapshot();
    smart.seed = String(seed);
    var patch = generateSmartRandomizePatch(seed, smart.mode, smart.axisLocks);
    applyGeneratorState(patch, { source: 'smart-randomize' });
    pushSmartRandomizeHistory(seed, patch);
    syncSmartRandomizeUi();
  }

  function smartRandomizeBack(){
    var smart = smartRandomizeState();
    if (!smart.previousSnapshot) return;
    var restore = smart.previousSnapshot;
    smart.previousSnapshot = null;
    restoreSmartRandomizeSnapshot(restore, 'smart-randomize-back');
    syncSmartRandomizeUi();
  }

  function smartRandomizeFromHistory(id){
    var smart = smartRandomizeState();
    var item = (smart.history || []).find(function(entry){ return entry.id === id; });
    if (!item) return;
    smart.previousSnapshot = smartRandomizeSnapshot();
    restoreSmartRandomizeSnapshot(item.snapshot, 'smart-randomize-history');
    smart.seed = String(item.seed || '');
    smart.mode = item.mode || smart.mode;
    syncSmartRandomizeUi();
  }

  function copySmartSeed(){
    var seed = String(smartRandomizeState().seed || state.generatorV5.variationSeed || $('g-smart-randomize-seed')?.value || '').trim();
    if (!seed) return;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(seed).catch(function(){});
  }

  function setAxisLock(axis, value){
    var smart = smartRandomizeState();
    smart.axisLocks[axis] = Boolean(value);
    state.generatorV5.locks = Object.assign({}, state.generatorV5.locks || {}, { [axis]: Boolean(value) });
    if (axis === 'camera') state.generatorV5.locks.camera = Boolean(value);
    if (axis === 'mood') state.generatorV5.locks.mood = Boolean(value);
    syncSmartRandomizeUi();
  }

  function syncSmartRandomizeUi(){
    var smart = smartRandomizeState();
    var shell = $('prompt-generator-52-shell') || document;
    var seedInput = $('g-smart-randomize-seed');
    if (seedInput && document.activeElement !== seedInput) seedInput.value = smart.seed || state.generatorV5.variationSeed || '';
    shell.querySelectorAll('[name="g-smart-randomize-mode"]').forEach(function(input){
      input.checked = input.value === smart.mode;
      var pill = input.closest('.pg52-smart-mode-pill');
      if (pill) pill.classList.toggle('selected', input.checked);
    });
    shell.querySelectorAll('[data-pg52-axis-lock]').forEach(function(btn){
      var axis = btn.getAttribute('data-pg52-axis-lock');
      var isLocked = axisLocked(axis);
      btn.classList.toggle('locked', isLocked);
      btn.setAttribute('aria-pressed', isLocked ? 'true' : 'false');
      btn.textContent = isLocked ? 'Locked' : 'Lock';
    });
    if ($('pg52-randomize-back-btn')) $('pg52-randomize-back-btn').disabled = !smart.previousSnapshot;
    if ($('pg52-smart-lock-summary')) $('pg52-smart-lock-summary').textContent = smartLockSummaryHtml();
    if ($('pg52-smart-randomize-history')) $('pg52-smart-randomize-history').innerHTML = smartRandomizeHistoryHtml();
  }

  function initSmartRandomize(root){
    root = root || document;
    root.querySelectorAll('[name="g-smart-randomize-mode"]').forEach(function(input){
      input.addEventListener('change', function(){
        if (!input.checked) return;
        smartRandomizeState().mode = input.value || 'safe';
        syncSmartRandomizeUi();
      });
    });
    var seedInput = $('g-smart-randomize-seed');
    if (seedInput) {
      seedInput.addEventListener('keydown', function(event){
        if (event.key === 'Enter') {
          event.preventDefault();
          applySmartRandomize(seedInput.value);
        }
      });
    }
    syncSmartRandomizeUi();
  }

  function applyRandomization(kind){
    if (kind === 'scene' || kind === 'smart') {
      applySmartRandomize();
      return;
    }
    var patch = {};
    var clearOverrides = {};
    if (kind === 'outfit' && !locked('outfit')) patch.outfitId = randomFrom(currentCloset()).id;
    if (kind === 'scene' && !locked('scene')) {
      patch.shotAction = randomFrom(shotModeActions(currentShotMode()).length ? shotModeActions(currentShotMode()) : SHOT_ACTIONS);
      patch.movement = randomFrom(MOVEMENT_CHOICES);
      patch.props = randomFrom(PROP_CHOICES);
      clearOverrides.action = '';
      clearOverrides.props = '';
      var locations = Array.prototype.slice.call($('g-location')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (locations.length && $('g-location')) $('g-location').value = randomFrom(locations);
    }
    if (kind === 'light' && !locked('mood')) {
      var lights = Array.prototype.slice.call($('g-time')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      var moods = Array.prototype.slice.call($('g-mood')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (lights.length && $('g-time')) $('g-time').value = randomFrom(lights);
      if (moods.length && $('g-mood')) $('g-mood').value = randomFrom(moods);
      clearOverrides.lighting = '';
      clearOverrides.mood = '';
    }
    if (kind === 'camera' && !locked('camera')) {
      patch.cameraDistance = randomFrom(CAMERA_DISTANCES);
      patch.lens = randomFrom(LENS_CHOICES);
      var cameras = Array.prototype.slice.call($('g-camera')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (cameras.length && $('g-camera')) $('g-camera').value = randomFrom(cameras);
    }
    if (Object.keys(clearOverrides).length) patch.shotOverrides = clearOverrides;
    patch.variationSeed = Date.now();
    applyGeneratorState(patch, { source: 'randomize-' + kind });
  }

  function renderWardrobeCards(){
    var wrap = $('pg50-wardrobe-cards');
    if (!wrap) return;
    var selected = selectedOutfitId();
    wrap.innerHTML = currentCloset().map(function(item){
      return [
        '<button type="button" class="pg50-outfit-card ' + (item.id === selected ? 'selected' : '') + '" data-pg50-outfit="' + esc(item.id) + '">',
          '<span>' + esc(item.category || 'look') + '</span>',
          '<strong>' + esc(item.name) + '</strong>',
          '<em>' + esc(item.palette || 'clean neutrals') + '</em>',
          '<small>' + esc((item.garments || []).slice(0, 3).join(' · ') || item.vibe || 'camera-real styling') + '</small>',
        '</button>'
      ].join('');
    }).join('');
    wrap.querySelectorAll('[data-pg50-outfit]').forEach(function(btn){
      btn.addEventListener('click', function(){
        applyGeneratorState({ outfitId: btn.getAttribute('data-pg50-outfit') }, { source: 'outfit-card' });
      });
    });
  }

  function wardrobeCardHtml(item){
    var selected = selectedWardrobeIdSet()[item.id];
    var img = item.image?.dataUrl || item.image?.url || item.ref || '';
    var hasImage = hasWardrobeImage(item);
    return [
      '<article class="pg52-wardrobe-card ' + (selected ? 'selected' : '') + (hasImage ? ' has-image' : ' text-only') + '" data-pg52-wardrobe-card="' + esc(item.id) + '">',
        '<button type="button" class="pg52-wardrobe-select" data-pg52-wardrobe-toggle="' + esc(item.id) + '" aria-pressed="' + (selected ? 'true' : 'false') + '">',
          hasImage ? '<img src="' + esc(img) + '" alt="' + esc(item.name) + '">' : '<span class="pg52-fabric-swatch"></span>',
          '<span><strong>' + esc(item.name) + '</strong><em>' + esc((item.slot || item.category || 'look') + (hasImage ? ' · image ref' : ' · text style')) + '</em></span>',
        '</button>',
        '<div class="pg52-wardrobe-meta">' + esc((item.palette || '').slice(0, 80)) + '</div>',
        '<div class="pg52-wardrobe-actions">',
          hasImage ? '<span class="pg52-mini-pill">visual ref</span>' : '<span class="pg52-mini-pill muted">text only</span>',
          '<button type="button" class="pg52-link-btn" data-pg52-wardrobe-edit="' + esc(item.id) + '">Edit</button>',
          item.sourceType === 'character_wardrobe_upload' ? '<button type="button" class="pg52-link-btn danger" data-pg52-wardrobe-delete="' + esc(item.id) + '">Delete</button>' : '',
        '</div>',
      '</article>'
    ].join('');
  }

  function wardrobeFormHtml(){
    if (!state.generatorV5.wardrobeFormOpen) {
      return '<button type="button" class="pg52-upload-launch" data-pg52-open-wardrobe>+ Add item</button>';
    }
    return [
      '<form class="pg52-wardrobe-form" id="pg52-wardrobe-form">',
        '<div class="pg52-form-head">',
          '<strong>' + (state.generatorV5.wardrobeEditingId ? 'Edit wardrobe item' : 'Save clothing to this character') + '</strong>',
          '<button type="button" class="pg52-link-btn" data-pg52-close-wardrobe>Close</button>',
        '</div>',
        '<label class="pg38-field wide" for="pg52-wardrobe-file"><span>Clothing image / full outfit set</span><input id="pg52-wardrobe-file" class="pg38-select" type="file" accept="image/*"></label>',
        '<div class="pg52-form-grid">',
          '<label class="pg38-field" for="pg52-wardrobe-name"><span>Name</span><input id="pg52-wardrobe-name" class="pg38-select" placeholder="e.g. Black cropped blazer set"></label>',
          '<label class="pg38-field" for="pg52-wardrobe-slot"><span>Slot</span><select id="pg52-wardrobe-slot" class="pg38-select"><option value="outfit_set">Full outfit set</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="jacket">Jacket</option><option value="shoes">Shoes</option><option value="accessory">Accessory</option><option value="bag">Bag</option><option value="look">Look</option></select></label>',
          '<label class="pg38-field" for="pg52-wardrobe-palette"><span>Palette</span><input id="pg52-wardrobe-palette" class="pg38-select" placeholder="black, cream, gold"></label>',
          '<label class="pg38-field" for="pg52-wardrobe-tags"><span>Tags</span><input id="pg52-wardrobe-tags" class="pg38-select" placeholder="work, cafe, soft luxury"></label>',
          '<label class="pg38-field wide" for="pg52-wardrobe-notes"><span>Garment notes</span><input id="pg52-wardrobe-notes" class="pg38-select" placeholder="fabric, fit, silhouette, what must be preserved"></label>',
        '</div>',
        '<div class="pg52-form-actions">',
          '<button type="submit" class="btn btn-primary btn-sm">Save to wardrobe</button>',
          '<button type="button" class="btn btn-ghost btn-sm" data-pg52-close-wardrobe>Cancel</button>',
        '</div>',
      '</form>'
    ].join('');
  }

  function renderWardrobeLibrary(){
    var grid = $('pg52-wardrobe-grid');
    var closet = currentCloset();
    var uploaded = closet.filter(function(item){ return item.sourceType === 'character_wardrobe_upload'; });
    var seeded = closet.filter(function(item){ return item.sourceType !== 'character_wardrobe_upload'; });
    if (grid) {
      var visual = closet.filter(function(item){ return hasWardrobeImage(item); });
      if (!visual.length) {
        grid.innerHTML = [
          '<div class="pg52-wardrobe-empty">',
            '<div class="pg52-wardrobe-empty-icon">+</div>',
            '<p><strong>Start wardrobe</strong><span>No saved clothing refs yet. Upload one piece or a full look.</span></p>',
            '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-open-wardrobe>+ Upload first item</button>',
          '</div>'
        ].join('');
        return;
      }
      grid.innerHTML = visual.map(function(item){
        var selected = selectedWardrobeIdSet()[item.id];
        var src = item.image?.dataUrl || item.image?.url || item.ref || '';
        return [
          '<article class="pg52-wardrobe-tile ' + (selected ? 'selected' : '') + '" data-pg52-wardrobe-toggle="' + esc(item.id) + '" tabindex="0" role="button" aria-pressed="' + (selected ? 'true' : 'false') + '">',
            '<img src="' + esc(src) + '" alt="' + esc(item.name) + '" loading="lazy">',
            '<div class="pg52-tile-label">' + esc(item.name) + '</div>',
            '<div class="pg52-tile-hover">',
              '<div class="pg52-tile-hover-actions">',
                '<button class="pg52-tile-action" type="button" data-pg52-wardrobe-toggle="' + esc(item.id) + '">' + (selected ? 'Remove' : 'Use') + '</button>',
                item.sourceType === 'character_wardrobe_upload' ? '<button class="pg52-tile-action" type="button" data-pg52-wardrobe-delete="' + esc(item.id) + '">Delete</button>' : '',
              '</div>',
            '</div>',
          '</article>'
        ].join('');
      }).join('');
      return;
    }
    var wrap = $('pg52-wardrobe-library');
    if (!wrap) return;
    wrap.innerHTML = [
      '<div class="pg52-wardrobe-toolbar">',
        '<div><strong>Character wardrobe</strong><span>' + esc(uploaded.length + ' saved visual items · ' + activeWardrobeIds().length + ' active') + '</span></div>',
        wardrobeFormHtml(),
      '</div>',
      '<div id="pg52-wardrobe-status" class="pg52-status-line"></div>',
      uploaded.length ? '<div class="pg52-wardrobe-grid">' + uploaded.map(wardrobeCardHtml).join('') + '</div>' : '<div class="pg52-empty-wardrobe">Upload a clothing item, full outfit set, bag, shoe, or accessory. Saved images become real wardrobe refs for this character.</div>',
      '<details class="pg52-seeded-closet"><summary>Text-only outfit ideas</summary><div class="pg52-wardrobe-grid text-only">' + seeded.map(wardrobeCardHtml).join('') + '</div></details>'
    ].join('');
  }

  function renderConceptCards(){
    var wrap = $('pg50-concept-cards');
    if (!wrap) return;
    var blast = conceptBlastState();
    var items = blast.cards || state.generatorV5.conceptCards || [];
    var bodyHtml = '';
    if (blast.loading) {
      bodyHtml = '<div class="pg52-concept-skeleton-grid">' + [0, 1, 2, 3, 4, 5].map(function(){ return '<div class="pg52-concept-skeleton-card"></div>'; }).join('') + '</div>';
    } else if (blast.error) {
      bodyHtml = '<div class="pg52-concept-error"><span class="pg52-t-micro">Suggestions unavailable</span><p>' + esc(blast.error) + '</p><button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-concept-blast-run>Retry</button></div>';
    } else if (items.length) {
      bodyHtml = '<div class="pg52-concept-blast-grid">' + items.map(conceptBlastCardHtml).join('') + '</div>';
    } else {
      bodyHtml = '<div class="pg52-concept-blast-empty">Choose a filter or lock an axis, then blast six production-ready shot directions.</div>';
    }
    wrap.innerHTML = [
      '<section class="pg52-concept-blast-panel ' + (blast.open ? 'open' : '') + '" id="pg52-concept-blast-panel">',
        '<div class="pg52-concept-blast-head">',
          '<div><span class="pg52-t-micro">Concept Blast</span><strong>Six loadable shot configurations</strong></div>',
          '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-concept-blast-run>Blast 6 Concepts</button>',
        '</div>',
        '<div class="pg52-concept-blast-controls" aria-label="Concept Blast controls">',
          '<div class="pg52-concept-blast-pill-row" role="group" aria-label="Concept location filter">',
            conceptBlastFilterButton('all', 'All locations', blast.filter === 'all'),
            conceptBlastFilterButton('jhb', 'Stay in JHB', blast.filter === 'jhb'),
            conceptBlastFilterButton('international', 'Go International', blast.filter === 'international'),
            conceptBlastFilterButton('conceptual', 'Go Conceptual/Surreal', blast.filter === 'conceptual'),
          '</div>',
          '<div class="pg52-concept-blast-pill-row locks" role="group" aria-label="Concept lock axes">',
            conceptBlastLockButton('location', 'Lock Location', blast.locks.location),
            conceptBlastLockButton('lighting', 'Lock Lighting', blast.locks.lighting),
            conceptBlastLockButton('wardrobe', 'Lock Wardrobe', blast.locks.wardrobe),
          '</div>',
        '</div>',
        bodyHtml,
      '</section>'
    ].join('');
  }

  function conceptBlastFilterButton(value, label, active){
    return '<button class="pg52-concept-blast-pill ' + (active ? 'active' : '') + '" type="button" data-pg52-concept-filter="' + esc(value) + '">' + esc(label) + '</button>';
  }

  function conceptBlastLockButton(value, label, active){
    return '<button class="pg52-concept-blast-pill lock ' + (active ? 'active' : '') + '" type="button" data-pg52-concept-lock="' + esc(value) + '">' + esc(label) + '</button>';
  }

  function conceptBlastRow(label, value){
    return '<div class="pg52-concept-blast-row"><span>' + esc(label) + '</span><b>' + esc(value || '—') + '</b></div>';
  }

  function conceptBlastCardHtml(item){
    return [
      '<article class="pg52-concept-blast-card" data-pg52-concept-card="' + esc(item.id) + '" data-pg52-location-id="' + esc(item.locationId || '') + '" data-pg52-location-category="' + esc(item.locationCategory || '') + '" data-pg52-shot-mode="' + esc(item.shotMode || currentShotMode()) + '">',
        '<header><span>Concept ' + String(item.index || 1).padStart(2, '0') + '</span><strong>' + esc(item.title || 'Shot direction') + '</strong></header>',
        '<div class="pg52-concept-blast-recipe">',
          conceptBlastRow('Mode', item.shotModeLabel || shotModeMeta(item.shotMode || currentShotMode()).label),
          conceptBlastRow('Location', item.locationName),
          conceptBlastRow('Light', item.lightingLabel),
          conceptBlastRow('Action', item.action),
          conceptBlastRow('Camera', item.cameraDistance),
          conceptBlastRow('Mood', item.moodLabel),
          conceptBlastRow('Vibe', item.vibe || item.aesthetic),
        '</div>',
        '<div class="pg52-concept-blast-dna"><span>DNA</span><code>' + esc(item.dna || '') + '</code></div>',
        '<div class="pg52-concept-blast-badges">',
          '<span>' + esc(item.identityRisk || 'Identity risk: strict refs preserved') + '</span>',
          '<span>' + esc(item.socialRealism || 'Social realism: source-photo ready') + '</span>',
        '</div>',
        item.why ? '<p class="pg52-concept-blast-why">' + esc(item.why) + '</p>' : '',
        '<button class="pg52-concept-blast-load" type="button" data-pg52-load-concept="' + esc(item.id) + '">LOAD THIS SHOT</button>',
      '</article>'
    ].join('');
  }

  function applyConceptBlastCard(conceptId){
    var blast = conceptBlastState();
    var concept = (blast.cards || state.generatorV5.conceptCards || []).find(function(item){ return item.id === conceptId; });
    if (!concept) return;
    var patch = {
      shotMode: concept.shotMode || currentShotMode(),
      locationId: concept.locationId,
      locationName: concept.locationName,
      shotAction: concept.action || state.generatorV5.shotAction,
      cameraDistance: concept.cameraDistance || state.generatorV5.cameraDistance,
      lens: concept.lens || state.generatorV5.lens,
      movement: concept.movement || state.generatorV5.movement,
      props: Object.prototype.hasOwnProperty.call(concept, 'props') ? concept.props : state.generatorV5.props,
      lighting: concept.lightingId || '',
      moodId: concept.moodId || '',
      actionSuggestion: null,
      actionOverride: '',
      shotOverrides: { action: '', lighting: '', props: '', mood: '' },
      sceneOverride: ''
    };
    if (Array.isArray(concept.activeWardrobeRefs) && concept.activeWardrobeRefs.length) patch.activeWardrobeRefs = concept.activeWardrobeRefs;
    if (concept.wardrobeId) patch.outfitId = concept.wardrobeId;
    blast.open = false;
    blast.cards = [];
    state.generatorV5.conceptCards = [];
    applyGeneratorState(patch, { source: 'concept-blast-card' });
  }

  async function generateConcepts(){
    openCreativeTools('concepts');
    var blast = conceptBlastState();
    blast.open = true;
    blast.loading = true;
    blast.error = '';
    blast.cards = [];
    state.generatorV5.conceptCards = [];
    renderConceptCards();
    startAsyncOperation('conceptBlast', { shotMode: currentShotMode() });
    try {
      await new Promise(function(resolve){ requestAnimationFrame(resolve); });
      var kit = buildKit();
      blast.cards = generateConceptBlast(kit.generatorRecipe, { filter: blast.filter, locks: blast.locks });
      state.generatorV5.conceptCards = blast.cards.slice();
      succeedAsyncOperation('conceptBlast', { count: blast.cards.length });
      notifyAsync('success', 'Concept Blast ready.');
    } catch (err) {
      blast.error = 'Suggestions unavailable. Try again.';
      failAsyncOperation('conceptBlast', err);
      notifyAsync('error', blast.error, { label: 'Retry', handler: generateConcepts });
    } finally {
      blast.loading = false;
    }
    renderConceptCards();
  }

  function actionSuggestionKey(recipe){
    recipe = recipe || generatorRecipe(buildKit());
    var scene = recipe.scenePack || {};
    var wardrobe = recipe.wardrobePack || {};
    return [
      recipe.characterId || $('g-char')?.value || '',
      scene.locationId || $('g-location')?.value || '',
      scene.moodId || $('g-mood')?.value || '',
      scene.lightingId || $('g-time')?.value || '',
      wardrobe.name || wardrobe.override || '',
      getCurrentImageModel()
    ].join('|');
  }

  function localActionSuggestions(recipe){
    recipe = recipe || generatorRecipe(buildKit());
    var scene = recipe.scenePack || {};
    var wardrobe = recipe.wardrobePack || {};
    var loc = resolveLocationRegistry(scene.locationId) || {};
    var interior = /interior|studio/.test(String(loc.environment || ''));
    var movement = /exterior|street|rooftop|promenade|beach/.test(String(loc.environment + ' ' + loc.subType).toLowerCase());
    var garment = String(wardrobe.name || wardrobe.override || wardrobe.garments || '').toLowerCase();
    var pool = [];
    if (interior) {
      pool = pool.concat([
        'Direct gaze, seated, hands visible - conversational authority',
        'Seated at desk, looking up at camera - workspace authority',
        'Leaning forward over table, engaged - intensity',
        'Standing behind chair, hands on back - boardroom presence'
      ]);
    }
    if (movement) {
      pool = pool.concat([
        'Mid-stride, one foot forward - arriving',
        'Walking toward camera, direct look - approach',
        'Turning to face camera from profile - the reveal',
        'Running hand along wall or surface while walking - tactile motion'
      ]);
    }
    if (/jacket|blazer|collar|shirt|wardrobe|skirt|dress|fashion/.test(garment)) {
      pool = pool.concat([
        'Adjusting collar or sleeve - garment focus',
        'Holding jacket open - wardrobe reveal',
        'Full body, hands at sides - fashion editorial standing'
      ]);
    }
    pool = pool.concat([
      'Slight smile, not performing it - quiet confidence',
      'Intense eye contact, no smile - focus and presence',
      'Over-shoulder glance, mid-turn - caught in motion',
      'Hand on hip, slight lean - grounded confidence',
      'Looking off-frame, something caught attention - curiosity'
    ]);
    var seen = {};
    return pool.filter(function(action){
      if (seen[action]) return false;
      seen[action] = true;
      return true;
    }).slice(0, 6).map(function(action, index){
      return {
        id: 'local_action_' + index,
        title: action.split(' - ')[1] || action.split(',')[0] || 'Action',
        action: action,
        reason: 'Fits ' + (scene.location || optionText('g-location') || 'this location') + ' with ' + (scene.mood || optionText('g-mood') || 'the current mood') + '.',
        category: actionCategoryFor(action)?.label || 'Contextual'
      };
    });
  }

  function renderActionSuggestions(){
    var wrap = $('pg52-action-suggestions');
    if (!wrap) return;
    if (state.generatorV5.actionSuggestLoading) {
      wrap.innerHTML = '<div class="pg52-action-loading">Reading shot context...</div>';
      return;
    }
    var error = state.generatorV5.actionSuggestError || '';
    var items = state.generatorV5.actionSuggestions || [];
    wrap.innerHTML = [
      error ? '<div class="pg52-action-error">' + esc(error) + '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-action-retry>Retry</button></div>' : '',
      items.length ? items.map(function(item){
        var selected = state.generatorV5.actionSuggestion && state.generatorV5.actionSuggestion.action === item.action;
        return [
          '<button type="button" class="pg52-action-card ' + (selected ? 'selected' : '') + '" data-pg52-action-suggestion="' + esc(item.id) + '">',
            '<span>' + esc(item.category || 'Suggested') + '</span>',
            '<strong>' + esc(item.title || 'Action') + '</strong>',
            '<small>' + esc(item.action || '') + '</small>',
            item.reason ? '<em>' + esc(item.reason) + '</em>' : '',
          '</button>'
        ].join('');
      }).join('') : ''
    ].join('');
    wrap.querySelectorAll('[data-pg52-action-suggestion]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var item = (state.generatorV5.actionSuggestions || []).find(function(candidate){ return candidate.id === btn.getAttribute('data-pg52-action-suggestion'); });
        if (!item || !item.action) return;
        ensureActionOption(item.action, 'AI Suggested');
        applyGeneratorState({
          shotAction: item.action,
          actionSuggestion: item,
          actionOverride: '',
          shotOverrides: { action: '' }
        }, { source: 'action-suggestion' });
      });
    });
    wrap.querySelectorAll('[data-pg52-action-retry]').forEach(function(btn){
      btn.addEventListener('click', function(){ suggestActionsForCurrentShot(); });
    });
  }

  function syncActionEngine(){
    var select = $('g-shot-action');
    if (select) {
      var current = modeSafeActionValue(select.value || state.generatorV5.shotAction || shotModeDefaultAction(currentShotMode()) || SHOT_ACTIONS[0] || '');
      if (!select.options.length) select.innerHTML = actionOptionsHtml(current);
      if (!Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === current; })) ensureActionOption(current, 'Current');
      select.value = current;
      state.generatorV5.shotAction = current;
    }
    var label = $('pg52-action-mode-label');
    if (label) label.textContent = shotModeActionLabel(currentShotMode());
    var input = $('g-action-override');
    var actionOverride = shotOverridesState().action || '';
    if (input && input.value !== actionOverride) input.value = actionOverride;
    syncShotOverrideUi('action');
    renderActionSuggestions();
  }

  async function suggestActionsForCurrentShot(){
    var button = $('pg52-action-suggest-btn');
    var recipe = generatorRecipe(buildKit());
    var key = actionSuggestionKey(recipe);
    var cached = state.generatorV5.actionSuggestionCache[key];
    if (cached && Date.now() - cached.at < 60000) {
      state.generatorV5.actionSuggestions = cached.items.slice();
      state.generatorV5.actionSuggestError = '';
      renderActionSuggestions();
      return;
    }
    state.generatorV5.actionSuggestLoading = true;
    state.generatorV5.actionSuggestError = '';
    if (button) button.disabled = true;
    renderActionSuggestions();
    startAsyncOperation('actionSuggestions', { background: false });
    try {
      var result = await fetchJsonWithTimeout('/api/ai/suggest-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: recipe })
      }, 9000);
      var items = Array.isArray(result?.data?.items) ? result.data.items : [];
      if (!items.length) items = localActionSuggestions(recipe);
      state.generatorV5.actionSuggestions = items.slice(0, 6);
      state.generatorV5.actionSuggestionCache[key] = { at: Date.now(), items: state.generatorV5.actionSuggestions.slice() };
      succeedAsyncOperation('actionSuggestions', { count: state.generatorV5.actionSuggestions.length });
    } catch (err) {
      state.generatorV5.actionSuggestions = localActionSuggestions(recipe);
      state.generatorV5.actionSuggestError = 'Using local action suggestions. AI route was unavailable.';
      failAsyncOperation('actionSuggestions', err);
      notifyAsync('warning', 'Suggestions unavailable. Try again.');
    } finally {
      state.generatorV5.actionSuggestLoading = false;
      if (button) button.disabled = false;
      renderActionSuggestions();
    }
  }

  function renderGeneratorShell52(){
    var page = $('page-generator');
    if (!page) return false;
    var existing = $('prompt-generator-52-shell');
    if (existing) return true;

    ['prompt-generator-51-shell','prompt-generator-50-shell','prompt-generator-40-shell','prompt-generator-38-shell'].forEach(function(id){
      var old = $(id);
      if (old) old.remove();
    });
    var grid = page.querySelector('.gen-grid');
    var lock = $('gen-lock-warning');
    var controls = routeControlOptions();
    var modeCopy = shotModeSectionCopy(currentShotMode());
    var shell = document.createElement('div');
    shell.id = 'prompt-generator-52-shell';
    shell.className = 'pg52-console pg52-director-desk';
    shell.setAttribute('data-contract', 'PROMPT_CONTRACT_V5_2');
    shell.innerHTML = [
      '<section class="pg52-shell" aria-label="Prompt Generator V3 production console">',
        '<header class="pg52-command-bar">',
          mobileNavButtonHtml(),
          '<div class="pg52-brand-mark"><span class="pg52-t-micro">Prompt Generator V3</span></div>',
          '<div class="pg52-command-selects">',
            commandFieldHtml('g-char', 'Character', capturedOptions('g-char')),
            '<input type="hidden" id="g-character" value="' + esc($('g-char')?.value || 'leah') + '">',
            commandFieldHtml('g-route-intent', 'Job', controls.intent),
            commandFieldHtml('g-spend-lane', 'Spend', controls.spendLane),
            commandFieldHtml('g-image-model', 'Model', '', true),
          '</div>',
          '<div class="pg52-cmd-cost" id="pg3-selected-cost">R-</div>',
          '<button class="pg52-generate-btn pg52-generate-btn--compact" type="button" onclick="generateImageFromGenerator(this)">Generate ' + generateArrowSvg(14) + '</button>',
        '</header>',
        workflowStripHtml(),
        '<div class="pg52-workspace">',
          '<aside class="pg52-identity-rail" aria-label="Character identity and active references">',
            '<div class="pg52-identity-card">',
              '<div class="pg52-identity-card-top">',
                '<div><div class="pg52-t-micro">Character</div><div class="pg52-char-name pg52-t-subtitle" id="pg52-char-display">Character</div></div>',
                lockedBadgeHtml('LOCKED'),
              '</div>',
              '<div class="pg52-char-tags" id="pg52-char-tags"></div>',
            '</div>',
            '<div class="pg52-profile-inline-state" id="pg52-profile-inline-state" hidden></div>',
            '<div class="pg52-ref-grid" id="pg52-ref-grid"></div>',
            '<label class="pg52-refs-toggle">',
              '<input type="checkbox" id="g-attach-refs" data-pg38-control="g-attach-refs" checked>',
              '<div class="pg52-toggle-track"><div class="pg52-toggle-thumb"></div></div>',
              '<span class="pg52-t-label">Include refs</span>',
            '</label>',
            '<div class="pg52-readiness-row" id="pg52-readiness-row" title="">',
              '<div class="pg52-readiness-dot" id="pg52-readiness-dot"></div>',
              '<span class="pg52-readiness-label" id="pg52-readiness-label">checking refs</span>',
            '</div>',
            '<div class="pg52-readiness-detail" id="pg52-readiness-detail" hidden></div>',
            '<div id="pg50-identity-summary" hidden></div>',
          '</aside>',
          '<main class="pg52-shot-canvas" aria-label="Wardrobe and shot builder">',
            shotModeSelectorHtml(),
            quickConfigButtonHtml(),
            saMomentStripHtml(),
            directorBriefHtml(),
            '<section class="pg52-shot-history-panel" id="pg52-shot-history-panel" hidden></section>',
            '<section class="pg52-canvas-section" id="pg52-wardrobe-section">',
              '<div class="pg52-section-head">',
                '<div class="pg52-step-num">01</div>',
                '<div class="pg52-section-title-group"><span class="pg52-t-label">Wardrobe</span><h3 class="pg52-t-title" data-pg52-mode-title="wardrobe">' + esc(modeCopy.wardrobe) + '</h3></div>',
                '<div class="pg52-section-actions"><button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg52-open-wardrobe>+ Add item</button></div>',
              '</div>',
              '<select id="g-outfit" class="pg52-hidden-select" data-pg38-control="g-outfit">' + outfitOptionsHtml() + '</select>',
              '<div class="pg52-wardrobe-grid" id="pg52-wardrobe-grid"></div>',
              '<div id="pg50-wardrobe-cards" hidden></div>',
              textOverrideHtml(),
            '</section>',
            '<section class="pg52-canvas-section" id="pg52-scene-section">',
              '<div class="pg52-section-head">',
                '<div class="pg52-step-num">02</div>',
                '<div class="pg52-section-title-group"><span class="pg52-t-label">Scene + Camera</span><h3 class="pg52-t-title" data-pg52-mode-title="scene">' + esc(modeCopy.scene) + '</h3></div>',
                '<div class="pg52-section-actions">',
                  '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg50-randomize="concepts">Blast 6 Concepts</button>',
                  '<button class="pg52-btn-ghost pg52-btn-sm" type="button" data-pg50-randomize="scene">Smart Randomize</button>',
                '</div>',
              '</div>',
              '<div class="pg52-chip-grid" id="pg52-chip-grid">',
                chipFieldHtml('g-location', 'Location', capturedOptions('g-location'), true),
                chipFieldHtml('g-shot-action', 'Action', optionList(SHOT_ACTIONS, state.generatorV5.shotAction)),
                chipFieldHtml('g-camera-distance', 'Distance', optionList(CAMERA_DISTANCES, state.generatorV5.cameraDistance)),
                chipFieldHtml('g-lens', 'Lens', optionList(LENS_CHOICES, state.generatorV5.lens)),
                chipFieldHtml('g-time', 'Lighting', capturedOptions('g-time')),
                chipFieldHtml('g-mood', 'Mood', capturedOptions('g-mood')),
                chipFieldHtml('g-movement', 'Movement', optionList(MOVEMENT_CHOICES, state.generatorV5.movement)),
                chipFieldHtml('g-props', 'Props', optionList(PROP_CHOICES, state.generatorV5.props)),
              '</div>',
              socialFinishTreatmentHtml(),
              authenticityControlsHtml(),
              '<div class="pg52-compatibility-meter" id="pg52-compatibility-meter" aria-live="polite"></div>',
              '<details class="pg52-creative-tools" id="pg52-creative-tools" data-pg52-active-tool="concepts">',
                '<summary class="pg52-creative-tools-summary">',
                  '<span class="pg52-t-micro">Creative tools</span>',
                  '<strong>Concepts, randomize, cinematic, platform, scene notes</strong>',
                  '<em>open when needed</em>',
                '</summary>',
                '<div class="pg52-creative-tools-body">',
                  creativeToolsTabsHtml(),
                  '<div class="pg52-creative-tool-panels">',
                    creativeToolPanelHtml('concepts', '<div class="pg50-concepts pg52-concepts" id="pg50-concept-cards"></div>'),
                    creativeToolPanelHtml('randomize', smartRandomizeHtml()),
                    creativeToolPanelHtml('cinematic', cinematicModeHtml()),
                    creativeToolPanelHtml('platform', platformCompositionPreviewHtml()),
                    creativeToolPanelHtml('scene-override', sceneOverrideHtml()),
                    creativeToolPanelHtml('prompt-anatomy', '<div class="pg52-creative-anatomy-note"><span class="pg52-t-micro">Live prompt anatomy</span><p>The full segmented prompt view lives in the right rail. Keeping it there prevents this desk from turning into a scroll trap.</p><button class="pg52-btn-ghost pg52-btn-sm" type="button" onclick="document.getElementById(&quot;pg52-acc-prompt&quot;)?.setAttribute(&quot;open&quot;,&quot;open&quot;)">Open right-rail anatomy</button></div>'),
                  '</div>',
                '</div>',
              '</details>',
              '<div class="pg52-lock-row pg52-lock-row--legacy" hidden>',
                '<input type="checkbox" id="g-lock-outfit">',
                '<input type="checkbox" id="g-lock-scene">',
              '</div>',
              '<details class="pg52-production-settings">',
                '<summary class="pg52-production-settings-toggle">Production settings</summary>',
                '<div class="pg52-production-settings-grid">',
                  chipFieldHtml('g-platform', 'Platform', capturedOptions('g-platform')),
                  chipFieldHtml('g-bucket', 'Content', capturedOptions('g-bucket')),
                  chipFieldHtml('g-posttype', 'Shot type', capturedOptions('g-posttype')),
                  chipFieldHtml('g-mode', 'Mode', capturedOptions('g-mode')),
                  chipFieldHtml('g-camera', 'Camera style', capturedOptions('g-camera'), true),
                  chipFieldHtml('g-route-quality', 'Quality', controls.quality),
                  chipFieldHtml('g-image-aspect', 'Shape', controls.aspect),
                  chipFieldHtml('g-realism', 'Realism', controls.realism),
                  chipFieldHtml('g-template', 'Prompt preset', controls.template),
                  chipFieldHtml('g-campaign', 'Campaign', campaignOptions(), true),
                  '<label class="pg52-prod-check"><input type="checkbox" id="g-sa-texture" data-pg38-control="g-sa-texture" checked> SA texture + heat realism</label>',
                  '<label class="pg52-prod-check"><input type="checkbox" id="g-requires-text" data-pg38-control="g-requires-text"> Text/layout rendering required</label>',
                '</div>',
              '</details>',
            '</section>',
            '<section class="pg52-canvas-section" id="pg52-scene-refs-section">',
              '<div class="pg52-section-head">',
                '<div class="pg52-step-num">03</div>',
                '<div class="pg52-section-title-group"><span class="pg52-t-label">Scene Refs</span><h3 class="pg52-t-title" data-pg52-mode-title="refs">' + esc(modeCopy.refs) + '</h3></div>',
                '<div class="pg52-ref-source-tabs" id="pg52-ref-source-tabs">',
                  '<button class="pg52-source-tab active" data-pg52-source="home" type="button">Home System</button>',
                  '<button class="pg52-source-tab" data-pg52-source="assets" type="button">Assets Vault</button>',
                  '<button class="pg52-source-tab" data-pg52-source="scene" type="button">Scene Refs</button>',
                  '<button class="pg52-source-tab" data-pg52-source="aesthetic" type="button">Aesthetic Ref</button>',
                '</div>',
              '</div>',
              '<div class="pg52-ref-candidates" id="pg52-ref-candidates"></div>',
              '<div class="pg52-ref-dock" id="pg52-ref-dock">',
                '<button class="pg52-ref-dock-bar" id="pg52-ref-dock-toggle" type="button" aria-expanded="false">',
                  '<div class="pg52-ref-dock-counts" id="pg52-ref-dock-counts">0 refs</div>',
                  '<span class="pg52-ref-dock-label">Refs queued for generation</span>',
                  '<svg class="pg52-dock-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 5l3 3 3-3" stroke="var(--color-current)" stroke-width="1.4" stroke-linecap="round"/></svg>',
                '</button>',
                '<div class="pg52-ref-dock-tray" id="pg52-ref-dock-tray" hidden></div>',
              '</div>',
            '</section>',
          '</main>',
          '<aside class="pg52-output-rail" id="gen-output-panel" aria-label="Route and final output">',
            '<div class="pg52-route-card" id="g-route-preview">',
              '<div class="pg52-route-skeleton" id="pg52-route-skeleton">',
                '<div class="pg52-skeleton-line pg52-skeleton-line--short"></div>',
                '<div class="pg52-skeleton-line"></div>',
                '<div class="pg52-skeleton-line pg52-skeleton-line--med"></div>',
              '</div>',
              '<div class="pg52-route-content" id="pg52-route-content" hidden>',
                '<div class="pg52-route-top">',
                  '<div><div class="pg52-t-micro">Route</div><div class="pg52-route-model pg52-t-subtitle" id="pg52-route-model-name">Nano Banana Pro</div><div class="pg52-route-provider pg52-t-micro" id="pg52-route-provider">Google Vertex AI</div></div>',
                  '<div class="pg52-route-cost-block"><div class="pg52-cost-num" id="pg52-route-cost-num">R-</div><div class="pg52-readiness-inline" id="pg52-route-readiness"><div class="pg52-readiness-dot pg52-readiness-dot--ready"></div><span>ready</span></div></div>',
                '</div>',
                '<div class="pg52-route-reason" id="pg52-route-reason"></div>',
                '<div class="pg52-route-tags" id="pg52-route-tags"></div>',
                '<div class="pg52-model-intelligence-card" id="pg52-model-intelligence-card"></div>',
                '<details class="pg52-quality-summary" id="pg52-prompt-quality"><summary><span id="pg52-prompt-quality-pill">Prompt quality: checking</span></summary><div id="pg52-prompt-quality-detail"></div></details>',
                '<div class="pg52-route-actions">',
                  '<button class="pg52-btn-ghost pg52-btn-sm" id="pg50-model-drawer-toggle" type="button" aria-expanded="false" aria-controls="pg50-model-drawer">Compare all routes</button>',
                  '<button class="pg52-route-details-btn" type="button" id="pg52-route-details-btn" aria-expanded="false">Route details + alternatives</button>',
                '</div>',
                '<div class="pg52-route-details" id="pg52-route-details" hidden>',
                  '<div id="pg50-model-summary"></div>',
                '</div>',
              '</div>',
            '</div>',
            '<div class="pg52-identity-lock-card" id="pg52-identity-lock-card" aria-live="polite"></div>',
            '<button class="pg52-generate-btn pg52-generate-btn--full" type="button" onclick="generateImageFromGenerator(this)">Generate Final Image ' + generateArrowSvg(16) + '</button>',
            '<div class="pg52-prompt-actions" aria-label="Prompt-only actions">',
              '<button class="pg52-btn-ghost pg52-btn-sm" type="button" onclick="generatePromptFromGenerator(this)">Generate Prompt</button>',
              '<button class="pg52-btn-ghost pg52-btn-sm" type="button" onclick="copyText(document.getElementById(\'out-main\')?.textContent || window._lastGenerated?.prompt || \'\', this)">Copy Prompt</button>',
            '</div>',
            mobileRoutePromptControlsHtml(),
            '<div class="pg52-image-result pg52-result-stage" id="pg52-image-result" hidden aria-live="polite" aria-label="Generated image review stage"></div>',
            '<div class="pg52-output-accordions">',
              accordionHtml('pg52-acc-prompt', 'Final prompt', '<div class="pg3-output-stage pg52-output-stage" id="pg3-output-stage"></div><div id="gen-ai-tools" class="pg52-status-region"><div id="ai-helper-output" class="pg52-status-line">Ready.</div></div>'),
              accordionHtml('pg52-acc-identity', 'Identity proofing'),
              accordionHtml('pg52-acc-quality', 'Prompt quality'),
              accordionHtml('pg52-acc-anatomy', 'Prompt anatomy'),
              accordionHtml('pg52-acc-variants', 'Prompt variants'),
              accordionHtml('pg52-acc-caption', 'Caption / social kit'),
            '</div>',
          '</aside>',
        '</div>',
        '<div class="pg50-model-drawer pg52-model-drawer" id="pg50-model-drawer" hidden tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pg50-model-drawer-title">',
          '<div class="pg50-drawer-head"><div><div class="pg3-kicker">Model Drawer</div><h3 id="pg50-model-drawer-title">All final image routes</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg50-close-drawer>Close</button></div>',
          '<div class="pg3-model-board pg50-model-board" id="g-model-intelligence"></div>',
        '</div>',
        wardrobeDrawerHtml(),
        mobileUtilitySheetsHtml(),
      '</section>'
    ].join('');

    if (grid) {
      grid.replaceWith(shell);
    } else if (lock && lock.parentNode) {
      lock.insertAdjacentElement('afterend', shell);
    } else {
      page.appendChild(shell);
    }
    restoreCapturedValues(shell);
    return true;
  }

  function renderGeneratorShell51(){
    var page = $('page-generator');
    if (!page) return false;
    var existing = $('prompt-generator-51-shell');
    if (existing) return true;

    ['prompt-generator-50-shell','prompt-generator-40-shell','prompt-generator-38-shell'].forEach(function(id){
      var old = $(id);
      if (old) old.remove();
    });
    var grid = page.querySelector('.gen-grid');
    var lock = $('gen-lock-warning');
    var controls = routeControlOptions();
    var shell = document.createElement('div');
    shell.id = 'prompt-generator-51-shell';
    shell.className = 'pg51-console';
    shell.innerHTML = [
      '<section class="pg51-board" aria-label="Prompt Generator V3 shotboard">',
        '<header class="pg51-command-bar">',
          '<div class="pg51-brand">',
            '<div class="pg3-kicker">Prompt Generator V3</div>',
            '<h2>Final shotboard</h2>',
            '<p>Choose the person, select real refs, shape the shot, then generate one final image. Randomization is local until you click generate.</p>',
          '</div>',
          '<div class="pg51-command-fields">',
            fieldHtml('g-char', 'Character', capturedOptions('g-char')),
            '<input type="hidden" id="g-character" value="' + esc($('g-char')?.value || 'leah') + '">',
            simpleFieldHtml('g-route-intent', 'Job', controls.intent),
            simpleFieldHtml('g-spend-lane', 'Spend lane', controls.spendLane),
            simpleFieldHtml('g-image-model', 'Model', ''),
            '<button class="btn btn-primary pg51-generate" type="button" onclick="generateImageFromGenerator(this)">Generate Final Image</button>',
          '</div>',
        '</header>',
        '<div class="pg51-workspace">',
          '<aside class="pg51-identity-rail" aria-label="Identity and active references">',
            '<div class="pg51-panel pg51-person-panel">',
              '<div class="pg51-panel-head"><div><div class="pg3-kicker">Character + Identity</div><h3>Identity rail</h3></div><span class="pg50-pill">locked</span></div>',
              '<div id="pg51-shot-summary" class="pg51-shot-summary"></div>',
              '<div class="pg51-toggle-row">' + checkboxHtml('g-attach-refs', 'Use selected refs', true) + '</div>',
              '<div id="pg50-identity-summary"></div>',
            '</div>',
            '<div class="pg51-panel pg51-ref-panel">',
              '<div class="pg51-panel-head"><div><div class="pg3-kicker">Reference Pack</div><h3>Pick what enters the shot</h3></div></div>',
              '<div id="pg51-reference-dock"></div>',
            '</div>',
          '</aside>',
          '<main class="pg51-shot-canvas" aria-label="Shot canvas">',
            '<section class="pg51-canvas-hero">',
              '<div>',
                '<div class="pg3-kicker">Shot Canvas</div>',
                '<h3>Wardrobe, place, action, camera.</h3>',
                '<p>These controls shape the final pixels. Lock what must stay; randomize the rest without spending image credits.</p>',
              '</div>',
              '<div class="pg51-random-actions">',
                '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="outfit">Swap outfit</button>',
                '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="scene">Randomize scene</button>',
                '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="camera">Change camera</button>',
                '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="light">Change light</button>',
                '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="concepts">Generate 6 concepts</button>',
              '</div>',
            '</section>',
            '<section class="pg51-shot-section">',
              '<div class="pg51-section-title"><span>01</span><strong>Wardrobe</strong></div>',
              '<div class="pg51-grid two">',
                simpleFieldHtml('g-outfit', 'Selected outfit', outfitOptionsHtml(), true),
                '<label class="pg38-field wide" for="g-outfit-override"><span>One-off outfit override</span><input class="pg38-select" id="g-outfit-override" data-pg38-control="g-outfit-override" placeholder="Optional: specific look, item, fabric, palette, or Home System outfit ref"></label>',
              '</div>',
              '<div class="pg50-outfit-strip pg51-card-strip" id="pg50-wardrobe-cards"></div>',
            '</section>',
            '<section class="pg51-shot-section">',
              '<div class="pg51-section-title"><span>02</span><strong>Scene + camera</strong></div>',
              '<div class="pg51-grid">',
                fieldHtml('g-location', 'Location', capturedOptions('g-location')),
                '<label class="pg38-field" for="g-shot-action"><span>Action / pose</span><select class="pg38-select" id="g-shot-action" data-pg38-control="g-shot-action">' + optionList(SHOT_ACTIONS, state.generatorV5.shotAction) + '</select></label>',
                '<label class="pg38-field" for="g-camera-distance"><span>Distance</span><select class="pg38-select" id="g-camera-distance" data-pg38-control="g-camera-distance">' + optionList(CAMERA_DISTANCES, state.generatorV5.cameraDistance) + '</select></label>',
                '<label class="pg38-field" for="g-lens"><span>Lens</span><select class="pg38-select" id="g-lens" data-pg38-control="g-lens">' + optionList(LENS_CHOICES, state.generatorV5.lens) + '</select></label>',
                fieldHtml('g-time', 'Lighting', capturedOptions('g-time')),
                fieldHtml('g-mood', 'Mood', capturedOptions('g-mood')),
                '<label class="pg38-field" for="g-movement"><span>Movement</span><select class="pg38-select" id="g-movement" data-pg38-control="g-movement">' + optionList(MOVEMENT_CHOICES, state.generatorV5.movement) + '</select></label>',
                '<label class="pg38-field" for="g-props"><span>Props / item cue</span><select class="pg38-select" id="g-props" data-pg38-control="g-props">' + optionList(PROP_CHOICES, state.generatorV5.props) + '</select></label>',
              '</div>',
              '<div class="pg50-lock-row pg51-lock-row" aria-label="Lock randomization fields">',
                '<label><input type="checkbox" id="g-lock-outfit"> Lock outfit</label>',
                '<label><input type="checkbox" id="g-lock-scene"> Lock scene</label>',
                '<label><input type="checkbox" id="g-lock-camera"> Lock camera</label>',
                '<label><input type="checkbox" id="g-lock-mood"> Lock mood/light</label>',
              '</div>',
              '<div class="pg50-concepts pg51-concepts" id="pg50-concept-cards"></div>',
            '</section>',
            '<details class="pg51-advanced">',
              '<summary>Advanced production controls</summary>',
              '<div class="pg51-grid">',
                fieldHtml('g-platform', 'Crop / platform', capturedOptions('g-platform')),
                fieldHtml('g-bucket', 'Content type', capturedOptions('g-bucket')),
                fieldHtml('g-posttype', 'Shot type', capturedOptions('g-posttype')),
                fieldHtml('g-mode', 'Mode', capturedOptions('g-mode')),
                fieldHtml('g-camera', 'Camera style', capturedOptions('g-camera')),
                simpleFieldHtml('g-route-quality', 'Quality', controls.quality),
                simpleFieldHtml('g-image-aspect', 'Shape', controls.aspect),
                simpleFieldHtml('g-realism', 'Realism', controls.realism),
                simpleFieldHtml('g-template', 'Prompt preset', controls.template),
                simpleFieldHtml('g-campaign', 'Campaign', campaignOptions()),
                checkboxHtml('g-sa-texture', 'SA texture + heat realism', true),
                checkboxHtml('g-requires-text', 'Text/layout rendering required', false),
              '</div>',
            '</details>',
          '</main>',
          '<aside class="pg51-production-rail" id="gen-output-panel" aria-label="Route, prompt, and output">',
            '<section class="pg51-panel pg51-route-panel">',
              '<div class="pg51-panel-head"><div><div class="pg3-kicker">Route Summary</div><h3>Spend, model, readiness</h3></div><span class="pg50-cost" id="pg3-selected-cost">R-</span></div>',
              '<div class="pg50-route-summary pg51-route-summary" id="g-route-preview">Route will update from the live router.</div>',
              '<div class="pg50-model-summary pg51-model-summary" id="pg50-model-summary"></div>',
              '<button class="btn btn-ghost btn-sm" id="pg50-model-drawer-toggle" type="button" aria-expanded="false" aria-controls="pg50-model-drawer">Change route</button>',
              '<div class="pg50-model-drawer pg51-model-drawer" id="pg50-model-drawer" hidden tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pg50-model-drawer-title">',
                '<div class="pg50-drawer-head"><div><div class="pg3-kicker">Model Drawer</div><h3 id="pg50-model-drawer-title">All final routes</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg50-close-drawer>Close</button></div>',
                '<div class="pg3-model-board pg50-model-board" id="g-model-intelligence"></div>',
              '</div>',
            '</section>',
            '<section class="pg51-panel pg51-output-panel">',
              '<div class="pg51-panel-head"><div><div class="pg3-kicker">Final Output</div><h3>Prompt, status, review</h3></div><span class="pg50-pill">PROMPT_CONTRACT_V5_1</span></div>',
              '<div class="pg3-output-stage pg51-output-stage" id="pg3-output-stage"></div>',
            '</section>',
          '</aside>',
        '</div>',
      '</section>'
    ].join('');

    if (grid) {
      grid.replaceWith(shell);
    } else if (lock && lock.parentNode) {
      lock.insertAdjacentElement('afterend', shell);
    } else {
      page.appendChild(shell);
    }
    restoreCapturedValues(shell);
    return true;
  }

  function renderGeneratorShell50(){
    var page = $('page-generator');
    if (!page) return false;
    var existing = $('prompt-generator-50-shell');
    if (existing) return true;

    var old40 = $('prompt-generator-40-shell');
    var old38 = $('prompt-generator-38-shell');
    if (old40) old40.remove();
    if (old38) old38.remove();
    var grid = page.querySelector('.gen-grid');
    var lock = $('gen-lock-warning');
    var controls = routeControlOptions();
    var shell = document.createElement('div');
    shell.id = 'prompt-generator-50-shell';
    shell.className = 'pg50-console';
    shell.innerHTML = [
      '<section class="pg50-hero" aria-label="Prompt Generator V3 command">',
        '<div>',
          '<div class="pg3-kicker">Prompt Generator V3</div>',
          '<h2>Living shotboard console</h2>',
          '<p>Pick the character, lock the refs, style the wardrobe, build the shot, then generate one final image. Randomize ideas without spending image credits.</p>',
        '</div>',
        '<div class="pg50-hero-actions">',
          '<button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="concepts">Generate 6 concepts</button>',
          '<button class="btn btn-primary btn-sm" type="button" onclick="generateImageFromGenerator(this)">Generate Final Image</button>',
        '</div>',
      '</section>',
      '<div class="pg50-zones">',
        '<aside class="pg50-zone pg50-character-zone" aria-label="Character and identity">',
          '<section class="pg50-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Character + Identity</div><h3>Choose the person</h3></div><span class="pg50-pill">identity locked</span></div>',
            '<div class="pg50-form-grid">',
              fieldHtml('g-char', 'Character', capturedOptions('g-char'), true),
              '<input type="hidden" id="g-character" value="' + esc($('g-char')?.value || 'leah') + '">',
              fieldHtml('g-platform', 'Crop / platform', capturedOptions('g-platform')),
              fieldHtml('g-bucket', 'Content type', capturedOptions('g-bucket')),
              fieldHtml('g-location', 'Location', capturedOptions('g-location'), true),
            '</div>',
          '</section>',
          '<section class="pg50-card pg50-identity-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Identity Lock</div><h3>Face and body refs</h3></div>' + checkboxHtml('g-attach-refs', 'Use vault refs', true) + '</div>',
            '<div id="pg50-identity-summary"></div>',
            '<button class="btn btn-ghost btn-sm" type="button" onclick="nav(\'assets\')">Open Assets Vault</button>',
          '</section>',
        '</aside>',
        '<main class="pg50-zone pg50-shot-zone" aria-label="Wardrobe and shot builder">',
          '<section class="pg50-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Wardrobe + Shot Builder</div><h3>Dress the character</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="outfit">Swap outfit</button></div>',
            '<div class="pg50-form-grid">',
              simpleFieldHtml('g-outfit', 'Selected outfit', outfitOptionsHtml(), true),
              '<label class="pg38-field wide" for="g-outfit-override"><span>One-off outfit override</span><input class="pg38-select" id="g-outfit-override" data-pg38-control="g-outfit-override" placeholder="Optional: describe a specific outfit for this shot"></label>',
            '</div>',
            '<div class="pg50-outfit-strip" id="pg50-wardrobe-cards"></div>',
          '</section>',
          '<section class="pg50-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Shotboard</div><h3>Build the shot</h3></div><div class="pg50-inline-actions"><button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="scene">Randomize scene</button><button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="camera">Change camera</button><button class="btn btn-ghost btn-sm" type="button" data-pg50-randomize="light">Change light</button></div></div>',
            '<div class="pg50-form-grid">',
              '<label class="pg38-field wide" for="g-shot-action"><span>Action</span><select class="pg38-select" id="g-shot-action" data-pg38-control="g-shot-action">' + optionList(SHOT_ACTIONS, state.generatorV5.shotAction) + '</select></label>',
              '<label class="pg38-field" for="g-camera-distance"><span>Camera distance</span><select class="pg38-select" id="g-camera-distance" data-pg38-control="g-camera-distance">' + optionList(CAMERA_DISTANCES, state.generatorV5.cameraDistance) + '</select></label>',
              '<label class="pg38-field" for="g-lens"><span>Lens</span><select class="pg38-select" id="g-lens" data-pg38-control="g-lens">' + optionList(LENS_CHOICES, state.generatorV5.lens) + '</select></label>',
              fieldHtml('g-mood', 'Mood', capturedOptions('g-mood')),
              fieldHtml('g-time', 'Light', capturedOptions('g-time')),
              fieldHtml('g-posttype', 'Shot type', capturedOptions('g-posttype')),
              fieldHtml('g-mode', 'Mode', capturedOptions('g-mode')),
              fieldHtml('g-camera', 'Camera style', capturedOptions('g-camera')),
              '<label class="pg38-field" for="g-movement"><span>Movement</span><select class="pg38-select" id="g-movement" data-pg38-control="g-movement">' + optionList(MOVEMENT_CHOICES, state.generatorV5.movement) + '</select></label>',
              '<label class="pg38-field" for="g-props"><span>Props</span><select class="pg38-select" id="g-props" data-pg38-control="g-props">' + optionList(PROP_CHOICES, state.generatorV5.props) + '</select></label>',
            '</div>',
            '<div class="pg50-lock-row" aria-label="Lock randomization fields">',
              '<label><input type="checkbox" id="g-lock-outfit"> Lock outfit</label>',
              '<label><input type="checkbox" id="g-lock-scene"> Lock scene</label>',
              '<label><input type="checkbox" id="g-lock-camera"> Lock camera</label>',
              '<label><input type="checkbox" id="g-lock-mood"> Lock mood/light</label>',
            '</div>',
            '<div class="pg50-concepts" id="pg50-concept-cards"></div>',
            '<details class="pg50-advanced">',
              '<summary>Advanced production controls</summary>',
              '<div class="pg50-form-grid">',
                simpleFieldHtml('g-realism', 'Realism', controls.realism),
                simpleFieldHtml('g-template', 'Prompt preset', controls.template),
                simpleFieldHtml('g-campaign', 'Campaign', campaignOptions(), true),
                checkboxHtml('g-sa-texture', 'SA texture + heat realism', true),
                checkboxHtml('g-requires-text', 'Text/layout rendering required', false),
              '</div>',
            '</details>',
          '</section>',
        '</main>',
        '<aside class="pg50-zone pg50-route-zone" id="gen-output-panel" aria-label="Final route and output review">',
          '<section class="pg50-card pg50-route-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Final Route</div><h3>Spend, model, readiness</h3></div><span class="pg50-cost" id="pg3-selected-cost">R-</span></div>',
            '<div class="pg50-form-grid pg50-route-controls">',
              simpleFieldHtml('g-spend-lane', 'Spend source', controls.spendLane),
              simpleFieldHtml('g-route-intent', 'Job type', controls.intent),
              simpleFieldHtml('g-image-model', 'Selected model', ''),
              simpleFieldHtml('g-route-quality', 'Quality', controls.quality),
              simpleFieldHtml('g-image-aspect', 'Shape', controls.aspect),
            '</div>',
            '<div class="pg50-route-summary" id="g-route-preview">Route will update from the live router.</div>',
            '<div class="pg50-model-summary" id="pg50-model-summary"></div>',
            '<button class="btn btn-ghost btn-sm" id="pg50-model-drawer-toggle" type="button" aria-expanded="false" aria-controls="pg50-model-drawer">Change route / compare models</button>',
            '<div class="pg50-model-drawer" id="pg50-model-drawer" hidden tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pg50-model-drawer-title">',
              '<div class="pg50-drawer-head"><div><div class="pg3-kicker">Model Drawer</div><h3 id="pg50-model-drawer-title">All live final routes</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg50-close-drawer>Close</button></div>',
              '<div class="pg3-model-board pg50-model-board" id="g-model-intelligence"></div>',
            '</div>',
          '</section>',
          '<section class="pg50-card pg50-output-card">',
            '<div class="pg50-card-head"><div><div class="pg3-kicker">Final Output</div><h3>Prompt + result</h3></div><span class="pg50-pill">PROMPT_CONTRACT_V5</span></div>',
            '<div class="pg3-output-stage pg50-output-stage" id="pg3-output-stage"></div>',
          '</section>',
        '</aside>',
      '</div>'
    ].join('');

    if (grid) {
      grid.replaceWith(shell);
    } else if (lock && lock.parentNode) {
      lock.insertAdjacentElement('afterend', shell);
    } else {
      page.appendChild(shell);
    }
    restoreCapturedValues(shell);
    return true;
  }

  function renderGeneratorShell40(){
    var page = $('page-generator');
    if (!page) return false;
    var existing = $('prompt-generator-40-shell');
    if (existing) return true;

    var oldShell = $('prompt-generator-38-shell');
    if (oldShell) oldShell.remove();
    var grid = page.querySelector('.gen-grid');
    var lock = $('gen-lock-warning');
    var controls = routeControlOptions();
    var shell = document.createElement('div');
    shell.id = 'prompt-generator-40-shell';
    shell.className = 'pg40-console';
    shell.innerHTML = [
      '<section class="pg40-command-bar" aria-label="Prompt Generator 4.0 command bar">',
        '<div class="pg40-command-copy">',
          '<div class="pg3-kicker">Prompt Generator 4.0</div>',
          '<h2>Final image console</h2>',
          '<p>One clean workflow: setup the brief, confirm the route, generate the final image. Advanced prompt and model details stay tucked away until you ask for them.</p>',
        '</div>',
        '<div class="pg40-command-meta" id="pg40-command-meta">',
          '<span class="pg40-meta-pill">final-first</span>',
          '<span class="pg40-meta-pill">raw_photo</span>',
          '<span class="pg40-meta-pill">exact_character</span>',
        '</div>',
      '</section>',
      '<div class="pg40-grid">',
        '<div class="pg40-setup-zone" aria-label="Setup">',
          '<section class="pg40-card pg40-brief-card" aria-labelledby="pg40-brief-title">',
            '<div class="pg40-card-head">',
              '<div><div class="pg3-kicker">Setup</div><h2 id="pg40-brief-title">Creative brief</h2></div>',
              '<span class="pg40-pill">brief</span>',
            '</div>',
            '<div class="pg40-brief-grid">',
              fieldHtml('g-char', 'Character', capturedOptions('g-char'), true),
              '<input type="hidden" id="g-character" value="' + esc($('g-char')?.value || 'leah') + '">',
              fieldHtml('g-platform', 'Platform', capturedOptions('g-platform')),
              fieldHtml('g-bucket', 'Content type', capturedOptions('g-bucket')),
              fieldHtml('g-location', 'Location', capturedOptions('g-location'), true),
              fieldHtml('g-mood', 'Mood', capturedOptions('g-mood')),
              fieldHtml('g-time', 'Light', capturedOptions('g-time')),
              fieldHtml('g-posttype', 'Shot type', capturedOptions('g-posttype')),
              fieldHtml('g-mode', 'Mode', capturedOptions('g-mode')),
              fieldHtml('g-camera', 'Camera style', capturedOptions('g-camera'), true),
            '</div>',
            '<details class="pg40-advanced">',
              '<summary>Advanced production locks</summary>',
              '<div class="pg40-brief-grid">',
                simpleFieldHtml('g-realism', 'Realism', controls.realism),
                simpleFieldHtml('g-template', 'Prompt preset', controls.template),
                simpleFieldHtml('g-campaign', 'Campaign', campaignOptions(), true),
                checkboxHtml('g-sa-texture', 'SA texture + heat realism', true),
                checkboxHtml('g-requires-text', 'Text/layout rendering required', false),
              '</div>',
            '</details>',
          '</section>',
          '<section class="pg40-card pg40-identity-card" aria-labelledby="pg40-identity-title">',
            '<div class="pg40-card-head">',
              '<div><div class="pg3-kicker">Setup</div><h2 id="pg40-identity-title">Identity pack</h2></div>',
              checkboxHtml('g-attach-refs', 'Use vault refs', true),
            '</div>',
            '<div id="pg40-identity-summary"></div>',
            '<button class="btn btn-ghost btn-sm pg40-vault-btn" type="button" onclick="nav(\'assets\')">Open Assets Vault</button>',
          '</section>',
        '</div>',
        '<div class="pg40-output-zone" id="gen-output-panel" aria-label="Route and final output">',
          '<section class="pg40-card pg40-route-card" aria-labelledby="pg40-route-title">',
            '<div class="pg40-card-head">',
              '<div><div class="pg3-kicker">Route</div><h2 id="pg40-route-title">Route summary</h2></div>',
              '<span class="pg40-pill pg40-cost-pill" id="pg3-selected-cost">R-</span>',
            '</div>',
            '<div class="pg40-route-controls" aria-label="Compact route controls">',
              simpleFieldHtml('g-spend-lane', 'Spend source', controls.spendLane),
              simpleFieldHtml('g-route-intent', 'Job type', controls.intent),
              simpleFieldHtml('g-image-model', 'Selected model', ''),
              simpleFieldHtml('g-route-quality', 'Quality', controls.quality),
              simpleFieldHtml('g-image-aspect', 'Shape', controls.aspect),
            '</div>',
            '<div class="pg40-route-status" id="g-route-preview">Choose a brief. The route card will update from one shared state path.</div>',
            '<div class="pg40-model-summary" id="pg40-model-summary"></div>',
            '<button class="btn btn-ghost btn-sm pg40-compare-btn" id="pg40-model-drawer-toggle" type="button" aria-expanded="false" aria-controls="pg40-model-drawer">Change route</button>',
            '<div class="pg40-model-drawer" id="pg40-model-drawer" hidden tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="pg40-model-drawer-title">',
              '<div class="pg40-drawer-head"><div><div class="pg3-kicker">Model Drawer</div><h3 id="pg40-model-drawer-title">Choose a production route</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg40-close-drawer>Close</button></div>',
              '<p class="pg40-drawer-note">Google Credits are for direct-reference character work and no-ref scenes. fal.ai stays available for advanced alternate routes.</p>',
              '<div class="pg3-model-board pg40-model-board" id="g-model-intelligence"></div>',
            '</div>',
          '</section>',
          '<section class="pg40-card pg40-prompt-card" aria-labelledby="pg40-prompt-title">',
            '<div class="pg40-card-head">',
              '<div><div class="pg3-kicker">Final Output</div><h2 id="pg40-prompt-title">Prompt contract preview</h2></div>',
              '<span class="pg40-pill">raw_photo</span>',
            '</div>',
            '<div class="pg3-output-stage pg40-output-stage" id="pg3-output-stage"></div>',
          '</section>',
        '</div>',
      '</div>'
    ].join('');

    if (grid) {
      grid.replaceWith(shell);
    } else if (lock && lock.parentNode) {
      lock.insertAdjacentElement('afterend', shell);
    } else {
      page.appendChild(shell);
    }
    restoreCapturedValues(shell);
    return true;
  }

  function renderGeneratorShell38(){
    var page = $('page-generator');
    if (!page) return false;
    var existing = $('prompt-generator-38-shell');
    if (existing) return true;

    var grid = page.querySelector('.gen-grid');
    var lock = $('gen-lock-warning');
    var controls = routeControlOptions();
    var shell = document.createElement('div');
    shell.id = 'prompt-generator-38-shell';
    shell.className = 'pg38-console';
    shell.innerHTML = [
      '<div class="pg38-left">',
        '<section class="pg38-card pg38-brief-card" aria-labelledby="pg38-brief-title">',
          '<div class="pg38-card-head">',
            '<div><div class="pg3-kicker">Brief Studio</div><h2 id="pg38-brief-title">The photograph brief</h2></div>',
            '<span class="pg38-pill">final-first</span>',
          '</div>',
          '<div class="pg38-brief-grid">',
            fieldHtml('g-char', 'Character', capturedOptions('g-char'), true),
            '<input type="hidden" id="g-character" value="' + esc($('g-char')?.value || 'leah') + '">',
            fieldHtml('g-platform', 'Platform', capturedOptions('g-platform')),
            fieldHtml('g-bucket', 'Content type', capturedOptions('g-bucket')),
            fieldHtml('g-location', 'Location', capturedOptions('g-location'), true),
            fieldHtml('g-mood', 'Mood', capturedOptions('g-mood')),
            fieldHtml('g-time', 'Light', capturedOptions('g-time')),
            fieldHtml('g-posttype', 'Shot type', capturedOptions('g-posttype')),
            fieldHtml('g-mode', 'Mode', capturedOptions('g-mode')),
            fieldHtml('g-camera', 'Camera style', capturedOptions('g-camera'), true),
          '</div>',
          '<details class="pg38-advanced">',
            '<summary>Advanced production locks</summary>',
            '<div class="pg38-brief-grid">',
              simpleFieldHtml('g-realism', 'Realism', controls.realism),
              simpleFieldHtml('g-template', 'Prompt preset', controls.template),
              simpleFieldHtml('g-campaign', 'Campaign', campaignOptions(), true),
              checkboxHtml('g-sa-texture', 'SA texture + heat realism', true),
              checkboxHtml('g-requires-text', 'Text/layout rendering required', false),
            '</div>',
          '</details>',
        '</section>',
        '<section class="pg38-card pg38-identity-card" aria-labelledby="pg38-identity-title">',
          '<div class="pg38-card-head">',
            '<div><div class="pg3-kicker">Identity Lock</div><h2 id="pg38-identity-title">Face and body refs</h2></div>',
            checkboxHtml('g-attach-refs', 'Use vault refs', true),
          '</div>',
          '<div id="pg38-identity-summary"></div>',
          '<button class="btn btn-ghost btn-sm pg38-vault-btn" type="button" onclick="nav(\'assets\')">Open Assets Vault</button>',
        '</section>',
      '</div>',
      '<div class="pg38-right" id="gen-output-panel">',
        '<section class="pg38-card pg38-route-card" aria-labelledby="pg38-route-title">',
          '<div class="pg38-card-head">',
            '<div><div class="pg3-kicker">Route Card</div><h2 id="pg38-route-title">Spend, model, readiness</h2></div>',
            '<span class="pg38-pill" id="pg3-selected-cost">R-</span>',
          '</div>',
          '<div class="pg38-route-controls">',
            simpleFieldHtml('g-spend-lane', 'Spend source', controls.spendLane),
            simpleFieldHtml('g-route-intent', 'Production intent', controls.intent),
            simpleFieldHtml('g-image-model', 'Selected model', ''),
            simpleFieldHtml('g-route-quality', 'Quality', controls.quality),
            simpleFieldHtml('g-image-aspect', 'Shape', controls.aspect),
          '</div>',
          '<div class="pg38-route-copy" id="pg3-spend-note">Google Credits sends actual refs into Nano Banana Pro / Vertex Gemini Image.</div>',
          '<div class="pg38-route-status" id="g-route-preview">Choose a brief. The route card will update from one state path.</div>',
          '<div class="pg38-model-summary" id="pg38-model-summary"></div>',
          '<button class="btn btn-ghost btn-sm pg38-compare-btn" id="pg38-model-drawer-toggle" type="button" aria-expanded="false" aria-controls="pg38-model-drawer">Compare models</button>',
          '<div class="pg38-model-drawer" id="pg38-model-drawer" hidden tabindex="-1">',
            '<div class="pg38-drawer-head"><div><div class="pg3-kicker">Model Drawer</div><h3>Pick a route without cluttering the workflow</h3></div><button class="btn btn-ghost btn-sm" type="button" data-pg38-close-drawer>Close</button></div>',
            '<div class="pg3-model-board pg38-model-board" id="g-model-intelligence"></div>',
          '</div>',
        '</section>',
        '<section class="pg38-card pg38-prompt-card" aria-labelledby="pg38-prompt-title">',
          '<div class="pg38-card-head">',
            '<div><div class="pg3-kicker">Final Prompt Preview</div><h2 id="pg38-prompt-title">Raw photo contract</h2></div>',
            '<span class="pg38-pill">raw_photo</span>',
          '</div>',
          '<div class="pg3-output-stage" id="pg3-output-stage"></div>',
        '</section>',
      '</div>'
    ].join('');

    if (grid) {
      grid.replaceWith(shell);
    } else if (lock && lock.parentNode) {
      lock.insertAdjacentElement('afterend', shell);
    } else {
      page.appendChild(shell);
    }
    restoreCapturedValues(shell);
    return true;
  }

  function outputStage(){
    return $('pg3-output-stage') || $('gen-output-panel');
  }

  function syncChipLabels(root){
    (root || document).querySelectorAll('.pg52-chip[data-pg52-chip]').forEach(function(chip){
      var select = $(chip.getAttribute('data-pg52-chip'));
      var label = chip.querySelector('.pg52-chip-value');
      if (select && label) label.textContent = select.options[select.selectedIndex]?.text || select.value || label.textContent;
    });
  }

  function closeChipPopover(){
    var existing = document.querySelector('.pg52-chip-popover');
    if (existing) existing.remove();
    document.querySelectorAll('.pg52-chip[aria-expanded="true"]').forEach(function(chip){ chip.setAttribute('aria-expanded', 'false'); });
  }

  function closeAllGeneratorDropdowns(except){
    var keep = String(except || '');
    if (keep !== 'chip') closeChipPopover();
    if (keep !== 'location') closeLocationPicker();
    document.querySelectorAll('[data-pg52-dropdown-open="true"]').forEach(function(node){
      if (!keep || node.getAttribute('data-pg52-dropdown-kind') !== keep) {
        node.setAttribute('data-pg52-dropdown-open', 'false');
      }
    });
  }

  function highlightLocationMatch(text, query){
    text = String(text || '');
    query = String(query || '').trim();
    if (!query) return esc(text);
    var lower = text.toLowerCase();
    var q = query.toLowerCase();
    var idx = lower.indexOf(q);
    if (idx < 0) return esc(text);
    return esc(text.slice(0, idx)) + '<mark>' + esc(text.slice(idx, idx + query.length)) + '</mark>' + esc(text.slice(idx + query.length));
  }

  function locationMatches(entry, query){
    query = String(query || '').trim().toLowerCase();
    if (!query) return true;
    return [
      entry.name,
      entry.category,
      entry.region,
      entry.environment,
      entry.depthCharacter,
      entry.lightQuality,
      entry.vibe,
      (entry.modeAffinity || []).join(' '),
      (entry.promptModifiers || []).join(' ')
    ].join(' ').toLowerCase().indexOf(query) >= 0;
  }

  function renderLocationPickerMenu(query){
    var menu = $('pg52-location-menu');
    if (!menu) return;
    query = String(query || '').trim();
    var matches = shotModeLocationEntries(currentShotMode()).filter(function(entry){ return locationMatches(entry, query); });
    var html = [
      '<button class="pg52-location-option pg52-location-custom" type="button" data-pg52-location-custom="1">',
        '<span class="pg52-location-option-kicker">Custom</span>',
        '<strong>' + esc(query || 'Type any location') + '</strong>',
        '<small>' + esc(query ? 'Use typed location with no registry intelligence' : 'Search registry or describe somewhere new') + '</small>',
      '</button>'
    ];
    LOCATION_CATEGORIES.forEach(function(category){
      var group = matches.filter(function(entry){ return entry.categoryId === category.id; });
      if (!group.length) return;
      html.push('<div class="pg52-location-group-label">' + esc(category.code + ' - ' + category.label) + '</div>');
      group.forEach(function(entry){
        html.push([
          '<button class="pg52-location-option" type="button" role="option" data-pg52-location-value="' + esc(entry.id) + '">',
            '<span class="pg52-location-option-kicker">' + esc(titleCase(entry.environment) + ' · ' + entry.region) + '</span>',
            '<strong>' + highlightLocationMatch(entry.name, query) + '</strong>',
            '<small>' + esc(entry.depthCharacter + ' · ' + entry.lightQuality) + '</small>',
          '</button>'
        ].join(''));
      });
    });
    if (!matches.length && query) {
      html.push('<div class="pg52-location-no-match">No registry match. Press Enter to use this as a custom location.</div>');
    }
    menu.innerHTML = html.join('');
    state.locationPickerActiveIndex = 0;
    setActiveLocationMenuOption(0);
  }

  function locationMenuOptions(){
    return Array.prototype.slice.call(($('pg52-location-menu') || document).querySelectorAll('[data-pg52-location-value], [data-pg52-location-custom]'));
  }

  function setActiveLocationMenuOption(index){
    var options = locationMenuOptions();
    if (!options.length) return;
    var next = Math.max(0, Math.min(options.length - 1, index));
    state.locationPickerActiveIndex = next;
    options.forEach(function(option, i){ option.classList.toggle('active', i === next); });
    if (options[next] && typeof options[next].scrollIntoView === 'function') {
      options[next].scrollIntoView({ block: 'nearest' });
    }
  }

  function syncLocationPickerFromSelect(){
    var input = $('pg52-location-search');
    var select = $('g-location');
    if (!input || !select) return;
    input.value = locationLabelForValue(select.value, optionText('g-location') || 'Cafe - Braamfontein');
    renderLocationContextTag(resolveLocationRegistry(select.value));
  }

  function closeLocationPicker(){
    var menu = $('pg52-location-menu');
    var input = $('pg52-location-search');
    if (menu) menu.hidden = true;
    if (input) input.setAttribute('aria-expanded', 'false');
    var picker = $('pg52-location-picker');
    if (picker) picker.setAttribute('data-pg52-dropdown-open', 'false');
    document.body.classList.remove('pg52-mobile-location-open');
  }

  function openLocationPicker(){
    var menu = $('pg52-location-menu');
    var input = $('pg52-location-search');
    if (!menu || !input) return;
    closeAllGeneratorDropdowns('location');
    renderLocationPickerMenu(input.value);
    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    var picker = $('pg52-location-picker');
    if (picker) {
      picker.setAttribute('data-pg52-dropdown-kind', 'location');
      picker.setAttribute('data-pg52-dropdown-open', 'true');
    }
    document.body.classList.add('pg52-mobile-location-open');
  }

  function commitLocationSelection(value, label, custom){
    var select = $('g-location');
    if (!select) return;
    var nextValue = value;
    var nextLabel = String(label || '').replace(/\s+/g, ' ').trim();
    if (custom) {
      if (!nextLabel) return;
      nextValue = ensureCustomLocationOption(nextLabel, isCustomLocationId(value) ? value : '');
    } else if (!Array.prototype.slice.call(select.options || []).some(function(option){ return option.value === nextValue; })) {
      var entry = resolveLocationRegistry(nextValue);
      if (entry) select.appendChild(new Option(entry.name || nextLabel || nextValue, nextValue));
    }
    select.value = nextValue;
    syncLocationPickerFromSelect();
    closeLocationPicker();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function dispatchLocationChanged(){
    var select = $('g-location');
    if (!select) return;
    var entry = resolveLocationRegistry(select.value);
    try {
      select.dispatchEvent(new CustomEvent('locationChanged', {
        bubbles: true,
        detail: {
          id: select.value,
          name: entry?.name || optionText('g-location') || select.value,
          custom: Boolean(entry?.custom),
          entry: entry?.custom ? null : entry
        }
      }));
    } catch (_) {}
  }

  function initLocationPicker(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    var input = root.querySelector('#pg52-location-search');
    var menu = root.querySelector('#pg52-location-menu');
    if (!input || !menu) return;
    syncLocationPickerFromSelect();
    if (window.__pg52LocationPickerBound) return;
    window.__pg52LocationPickerBound = true;

    input.addEventListener('focus', openLocationPicker);
    input.addEventListener('input', function(){ openLocationPicker(); });
    input.addEventListener('keydown', function(event){
      var options = locationMenuOptions();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openLocationPicker();
        setActiveLocationMenuOption((state.locationPickerActiveIndex || 0) + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveLocationMenuOption((state.locationPickerActiveIndex || 0) - 1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (menu.hidden) openLocationPicker();
        var active = options[state.locationPickerActiveIndex || 0];
        if (active && active.hasAttribute('data-pg52-location-value')) {
          var id = active.getAttribute('data-pg52-location-value');
          commitLocationSelection(id, locationLabelForValue(id), false);
        } else {
          commitLocationSelection('', input.value, true);
        }
      } else if (event.key === 'Escape') {
        closeLocationPicker();
        syncLocationPickerFromSelect();
      }
    });

    document.addEventListener('click', function(event){
      var target = event.target;
      if (!target || !target.closest || !target.closest('#pg52-location-picker')) {
        closeLocationPicker();
        return;
      }
      if (target.closest('[data-pg52-location-close]')) {
        closeLocationPicker();
        syncLocationPickerFromSelect();
        return;
      }
      var known = target.closest('[data-pg52-location-value]');
      if (known) {
        commitLocationSelection(known.getAttribute('data-pg52-location-value'), known.querySelector('strong')?.textContent || '', false);
        return;
      }
      var custom = target.closest('[data-pg52-location-custom]');
      if (custom) commitLocationSelection('', input.value, true);
    });
  }

  function refreshShotOverrideOutputs(){
    renderPromptPreview();
    renderShotSummary();
    renderRoutePreview(null);
    schedulePreviewImageRouteFromGenerator();
  }

  function syncShotOverrideUi(key){
    var keys = key ? [key] : Object.keys(SHOT_OVERRIDE_CONFIG);
    keys.forEach(function(itemKey){
      var cfg = SHOT_OVERRIDE_CONFIG[itemKey];
      if (!cfg) return;
      var overrides = shotOverridesState();
      var input = $(cfg.inputId);
      if (input && input.value !== (overrides[itemKey] || '')) input.value = overrides[itemKey] || '';
      var value = shotOverrideFieldValue(itemKey);
      overrides[itemKey] = value;
      if (itemKey === 'action') state.generatorV5.actionOverride = value;
      var container = document.querySelector('[data-pg52-override-key="' + itemKey + '"]');
      if (container) container.setAttribute('data-pg52-override-active', value ? 'true' : 'false');
      var custom = document.querySelector('[data-pg52-override-custom="' + itemKey + '"]');
      if (custom) custom.hidden = !value;
      var counter = $(cfg.inputId + '-counter');
      if (counter) counter.textContent = value.length + '/' + (cfg.max || 200);
    });
  }

  function activateShotOverride(key){
    var cfg = SHOT_OVERRIDE_CONFIG[key];
    if (!cfg) return;
    var current = shotOverrideFieldValue(key) || shotOverrideDisplayText(key);
    setShotOverrideValue(key, current);
    var input = $(cfg.inputId);
    if (input) {
      input.focus();
      input.select();
    }
    refreshShotOverrideOutputs();
  }

  function clearShotOverride(key, silent){
    setShotOverrideValue(key, '');
    if (!silent) refreshShotOverrideOutputs();
  }

  function initShotOverrides(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    syncShotOverrideUi();
    var sceneInput = root.querySelector('#g-scene-override');
    if (sceneInput && sceneInput.value !== (state.generatorV5.sceneOverride || '')) sceneInput.value = state.generatorV5.sceneOverride || '';
    var sceneCounter = $('pg52-scene-override-counter');
    if (sceneCounter) sceneCounter.textContent = String((sceneInput?.value || state.generatorV5.sceneOverride || '').length) + '/500';
    if (window.__pg52ShotOverridesBound) return;
    window.__pg52ShotOverridesBound = true;
    root.addEventListener('click', function(event){
      var edit = event.target.closest && event.target.closest('[data-pg52-override-edit]');
      if (edit) {
        event.preventDefault();
        activateShotOverride(edit.getAttribute('data-pg52-override-edit'));
        return;
      }
      var back = event.target.closest && event.target.closest('[data-pg52-override-back]');
      if (back) {
        event.preventDefault();
        clearShotOverride(back.getAttribute('data-pg52-override-back'));
      }
    });
    root.addEventListener('input', function(event){
      var input = event.target.closest && event.target.closest('[data-pg52-override-input]');
      if (input) {
        var key = input.getAttribute('data-pg52-override-input');
        var cfg = SHOT_OVERRIDE_CONFIG[key];
        var value = String(input.value || '').slice(0, cfg?.max || 200);
        if (input.value !== value) input.value = value;
        setShotOverrideValue(key, value);
        scheduleStressRefresh();
        return;
      }
      var scene = event.target.closest && event.target.closest('[data-pg52-scene-override]');
      if (scene) {
        var sceneMax = inputLimitFor('sceneOverride');
        var sceneValue = String(scene.value || '').slice(0, sceneMax);
        if (scene.value !== sceneValue) scene.value = sceneValue;
        state.generatorV5.sceneOverride = sceneValue;
        updateCounterText('pg52-scene-override-counter', sceneValue, sceneMax);
        scheduleStressRefresh();
      }
    });
  }

  function initDirectorBrief(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    renderDirectorBriefResult();
    if (window.__pg52DirectorBriefBound) return;
    window.__pg52DirectorBriefBound = true;
    root.addEventListener('submit', function(event){
      if (!event.target || event.target.id !== 'pg52-director-brief-form') return;
      event.preventDefault();
      runDirectorBrief();
    });
    root.addEventListener('input', function(event){
      if (!event.target || event.target.id !== 'g-director-brief') return;
      var max = inputLimitFor('directorBrief');
      var value = String(event.target.value || '').slice(0, max);
      if (event.target.value !== value) event.target.value = value;
      directorBriefState().text = value;
      updateCounterText('g-director-brief-counter', value, max);
    });
  }

  function initActionEngine(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    var select = root.querySelector('#g-shot-action');
    var button = root.querySelector('#pg52-action-suggest-btn');
    syncActionEngine();
    if (window.__pg52ActionEngineBound) return;
    window.__pg52ActionEngineBound = true;
    if (select) {
      select.addEventListener('change', function(){
        state.generatorV5.actionSuggestion = null;
        state.generatorV5.shotAction = select.value;
        renderActionSuggestions();
      });
    }
    if (button) {
      button.addEventListener('click', function(){
        suggestActionsForCurrentShot().catch(function(err){
          state.generatorV5.actionSuggestLoading = false;
          state.generatorV5.actionSuggestError = String(err?.message || err || 'Could not suggest actions.');
          renderActionSuggestions();
        });
      });
    }
  }

  function cinematicTreatmentToggle(input){
    if (!input) return;
    var checked = Array.prototype.slice.call(document.querySelectorAll('input[name="g-cinematic-treatment"]:checked'));
    var limit = $('pg52-cinematic-treatment-limit');
    if (checked.length > 3) {
      input.checked = false;
      if (limit) limit.textContent = 'Pick 1-3 only';
    } else if (limit) {
      limit.textContent = checked.length ? (checked.length + '/3 selected') : 'Pick 1-3';
    }
  }

  function syncCinematicMode(){
    var mode = $('g-cinematic-mode');
    var panel = $('pg52-cinematic-panel');
    var select = $('g-cinematic-aesthetic');
    var customWrap = document.querySelector('#page-generator .pg52-cinematic-custom');
    var custom = $('g-cinematic-aesthetic-custom');
    var narrative = $('g-cinematic-narrative');
    var counter = $('pg52-cinematic-counter');
    var enabled = Boolean(state.generatorV5.cinematicMode);
    if (mode && mode.checked !== enabled) mode.checked = enabled;
    if (panel) panel.hidden = !enabled;
    if (select && select.value !== state.generatorV5.cinematicAesthetic) select.value = state.generatorV5.cinematicAesthetic || 'barry_jenkins_moonlight';
    if (custom && custom.value !== state.generatorV5.cinematicAestheticCustom) custom.value = state.generatorV5.cinematicAestheticCustom || '';
    if (narrative && narrative.value !== state.generatorV5.cinematicNarrative) narrative.value = state.generatorV5.cinematicNarrative || '';
    if (customWrap) customWrap.hidden = (select?.value || state.generatorV5.cinematicAesthetic) !== 'custom';
    if (counter) counter.textContent = String((narrative?.value || state.generatorV5.cinematicNarrative || '').length) + '/200';
    document.querySelectorAll('input[name="g-cinematic-treatment"]').forEach(function(input){
      var active = (state.generatorV5.cinematicTreatments || []).includes(input.value);
      if (input.checked !== active) input.checked = active;
      input.closest('.pg52-cinematic-tag')?.classList.toggle('selected', active);
    });
    var limit = $('pg52-cinematic-treatment-limit');
    var treatmentCount = (state.generatorV5.cinematicTreatments || []).length;
    if (limit) limit.textContent = treatmentCount ? (treatmentCount + '/3 selected') : 'Pick 1-3';
  }

  function captureCinematicStateFromControls(){
    var selectedTreatments = Array.prototype.slice.call(document.querySelectorAll('input[name="g-cinematic-treatment"]:checked')).map(function(input){ return input.value; }).slice(0, 3);
    state.generatorV5.cinematicMode = Boolean($('g-cinematic-mode')?.checked);
    state.generatorV5.cinematicAesthetic = $('g-cinematic-aesthetic')?.value || state.generatorV5.cinematicAesthetic || 'barry_jenkins_moonlight';
    state.generatorV5.cinematicAestheticCustom = String($('g-cinematic-aesthetic-custom')?.value || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    state.generatorV5.cinematicNarrative = String($('g-cinematic-narrative')?.value || '').slice(0, 200);
    state.generatorV5.cinematicTreatments = uniqueList(selectedTreatments).slice(0, 3);
  }

  function refreshCinematicMode(){
    captureCinematicStateFromControls();
    syncCinematicMode();
    renderPromptPreview();
    renderShotSummary();
    renderRoutePreview(null);
    schedulePreviewImageRouteFromGenerator();
  }

  function initCinematicMode(shell){
    var root = shell || $('prompt-generator-52-shell') || document;
    var mode = root.querySelector('#g-cinematic-mode');
    var select = root.querySelector('#g-cinematic-aesthetic');
    var custom = root.querySelector('#g-cinematic-aesthetic-custom');
    var narrative = root.querySelector('#g-cinematic-narrative');
    syncCinematicMode();
    if (window.__pg52CinematicModeBound) return;
    window.__pg52CinematicModeBound = true;
    if (mode) mode.addEventListener('change', refreshCinematicMode);
    if (select) select.addEventListener('change', refreshCinematicMode);
    if (custom) custom.addEventListener('input', refreshCinematicMode);
    if (narrative) narrative.addEventListener('input', refreshCinematicMode);
    root.querySelectorAll('input[name="g-cinematic-treatment"]').forEach(function(input){
      input.addEventListener('change', function(){
        cinematicTreatmentToggle(input);
        refreshCinematicMode();
      });
    });
  }

  function initSceneRefDock(shell){
    shell = shell || $('prompt-generator-52-shell') || document;
    if (window.__pg52SceneRefDockBound) return;
    window.__pg52SceneRefDockBound = true;

    shell.addEventListener('click', function(event){
      var pull = event.target && event.target.closest && event.target.closest('[data-pg52-pull-location-intel]');
      if (pull) {
        event.preventDefault();
        pullLocationIntelligence();
        return;
      }
      var remove = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-remove]');
      if (remove) {
        event.preventDefault();
        removeSceneRef(remove.getAttribute('data-pg52-scene-ref-remove'));
      }
    });

    shell.addEventListener('input', function(event){
      var label = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-label]');
      if (label) {
        updateSceneRef(label.getAttribute('data-pg52-scene-ref-label'), { label: label.value.slice(0, 80) }, { render: false });
        return;
      }
      if (event.target && event.target.id === 'pg52-location-intel-text') {
        state.generatorV5.locationIntelText = event.target.value;
        refreshSceneRefViews(false);
      }
    });

    shell.addEventListener('change', function(event){
      if (event.target && event.target.id === 'pg52-scene-ref-file') {
        var file = event.target.files && event.target.files[0];
        if (file) addSceneRefFile(file);
        event.target.value = '';
        return;
      }
      var weight = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-weight]');
      if (weight) {
        updateSceneRef(weight.getAttribute('data-pg52-scene-ref-weight'), { weight: sceneRefWeightFromIndex(weight.value) }, { render: false });
      }
    });

    shell.addEventListener('dragover', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-drop]');
      if (!drop || drop.classList.contains('disabled')) return;
      event.preventDefault();
      drop.classList.add('drag-over');
    });
    shell.addEventListener('dragleave', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-drop]');
      if (drop) drop.classList.remove('drag-over');
    });
    shell.addEventListener('drop', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-scene-ref-drop]');
      if (!drop || drop.classList.contains('disabled')) return;
      event.preventDefault();
      drop.classList.remove('drag-over');
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) addSceneRefFile(file);
    });
  }

  function initAestheticRefDock(shell){
    shell = shell || $('prompt-generator-52-shell') || document;
    if (window.__pg52AestheticRefDockBound) return;
    window.__pg52AestheticRefDockBound = true;

    shell.addEventListener('click', function(event){
      var apply = event.target && event.target.closest && event.target.closest('[data-pg52-apply-aesthetic]');
      if (apply) {
        event.preventDefault();
        applyAestheticToShot();
        return;
      }
      var discard = event.target && event.target.closest && event.target.closest('[data-pg52-discard-aesthetic]');
      if (discard) {
        event.preventDefault();
        discardAestheticRef();
      }
    });

    shell.addEventListener('change', function(event){
      if (event.target && event.target.id === 'pg52-aesthetic-ref-file') {
        var file = event.target.files && event.target.files[0];
        if (file) addAestheticRefFile(file);
        event.target.value = '';
      }
    });

    shell.addEventListener('dragover', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-aesthetic-drop]');
      if (!drop || drop.classList.contains('disabled')) return;
      event.preventDefault();
      drop.classList.add('drag-over');
    });
    shell.addEventListener('dragleave', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-aesthetic-drop]');
      if (drop) drop.classList.remove('drag-over');
    });
    shell.addEventListener('drop', function(event){
      var drop = event.target && event.target.closest && event.target.closest('[data-pg52-aesthetic-drop]');
      if (!drop || drop.classList.contains('disabled')) return;
      event.preventDefault();
      drop.classList.remove('drag-over');
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) addAestheticRefFile(file);
    });
  }

  function initChipSelectors(){
    if (window.__pg52ChipSelectorsBound) {
      syncChipLabels($('prompt-generator-52-shell') || document);
      return;
    }
    window.__pg52ChipSelectorsBound = true;
    document.addEventListener('click', function(event){
      var chip = event.target && event.target.closest && event.target.closest('.pg52-chip[data-pg52-chip]');
      if (!chip) {
        if (!event.target.closest || !event.target.closest('.pg52-chip-popover')) closeChipPopover();
        return;
      }
      var select = $(chip.getAttribute('data-pg52-chip'));
      if (!select) return;
      if (chip.getAttribute('aria-expanded') === 'true') {
        closeChipPopover();
        return;
      }
      closeAllGeneratorDropdowns('chip');
      chip.setAttribute('aria-expanded', 'true');
      var pop = document.createElement('div');
      pop.className = 'pg52-chip-popover';
      pop.innerHTML = Array.prototype.slice.call(select.options || []).map(function(opt){
        var rank = opt.getAttribute('data-pg52-rank') || 'neutral';
        var reason = opt.getAttribute('data-pg52-reason') || '';
        var label = opt.text || opt.value;
        return [
          '<button class="pg52-pop-option ' + esc(rank) + ' ' + (opt.value === select.value ? 'selected' : '') + '" type="button" data-value="' + esc(opt.value) + '" data-label="' + esc(label) + '" title="' + esc(reason) + '">',
            '<span class="pg52-pop-main">' + esc(label) + '</span>',
            rank === 'recommended' ? '<span class="pg52-pop-rank">recommended</span>' : '',
            rank === 'avoid' ? '<span class="pg52-pop-rank">watch</span>' : '',
            reason ? '<small>' + esc(reason) + '</small>' : '',
          '</button>'
        ].join('');
      }).join('');
      pop.querySelectorAll('.pg52-pop-option').forEach(function(btn){
        btn.addEventListener('click', function(event2){
          event2.stopPropagation();
          select.value = btn.getAttribute('data-value');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          chip.querySelector('.pg52-chip-value').textContent = btn.getAttribute('data-label') || btn.textContent;
          closeChipPopover();
        });
      });
      var rect = chip.getBoundingClientRect();
      pop.style.top = Math.round(rect.bottom + 6) + 'px';
      pop.style.left = Math.round(rect.left) + 'px';
      pop.style.minWidth = Math.max(rect.width, 180) + 'px';
      document.body.appendChild(pop);
    });
    document.addEventListener('keydown', function(event){
      if (event.key === 'Escape') closeChipPopover();
    });
  }

  function initPg52Interactions(shell){
    if (!shell || shell.dataset.pg52Interactions === '1') return;
    shell.dataset.pg52Interactions = '1';
    shell.querySelectorAll('.pg52-accordion-head').forEach(function(btn){
      btn.addEventListener('click', function(){
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        var body = btn.parentElement && btn.parentElement.querySelector('.pg52-accordion-body');
        if (body) body.hidden = expanded;
      });
    });
    var routeDetails = $('pg52-route-details-btn');
    if (routeDetails) routeDetails.addEventListener('click', function(){
      var expanded = routeDetails.getAttribute('aria-expanded') === 'true';
      routeDetails.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if ($('pg52-route-details')) $('pg52-route-details').hidden = expanded;
    });
    var dockToggle = $('pg52-ref-dock-toggle');
    if (dockToggle) dockToggle.addEventListener('click', function(){
      var expanded = dockToggle.getAttribute('aria-expanded') === 'true';
      dockToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if ($('pg52-ref-dock-tray')) $('pg52-ref-dock-tray').hidden = expanded;
    });
    shell.querySelectorAll('.pg52-source-tab').forEach(function(tab){
      tab.addEventListener('click', function(){
        shell.querySelectorAll('.pg52-source-tab').forEach(function(node){ node.classList.remove('active'); });
        tab.classList.add('active');
        state.generatorV5.refSource = tab.getAttribute('data-pg52-source') || 'home';
        renderReferenceDock();
      });
    });
    var textToggle = $('pg52-outfit-text-toggle');
    if (textToggle) textToggle.addEventListener('click', function(){
      var wrap = $('pg52-outfit-input-wrap');
      if (!wrap) return;
      var open = textToggle.getAttribute('aria-expanded') === 'true';
      textToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      wrap.hidden = open;
      if (!open) $('g-outfit-override')?.focus();
    });
    var fileInput = $('pg52-wardrobe-file-input');
    if (fileInput) fileInput.addEventListener('change', function(){
      var files = Array.prototype.slice.call(fileInput.files || []);
      if (!files.length) return;
      if (files.length > 1) {
        enqueueWardrobeUploads(files);
        fileInput.value = '';
        return;
      }
      acceptWardrobeUploadFile(files[0]).catch(function(){ fileInput.value = ''; });
    });
    var uploadZone = $('pg52-upload-zone');
    if (uploadZone) {
      uploadZone.addEventListener('dragover', function(event){ event.preventDefault(); uploadZone.classList.add('drag-over'); });
      uploadZone.addEventListener('dragleave', function(){ uploadZone.classList.remove('drag-over'); });
      uploadZone.addEventListener('drop', function(event){
        event.preventDefault();
        uploadZone.classList.remove('drag-over');
        var files = Array.prototype.slice.call(event.dataTransfer && event.dataTransfer.files || []);
        if (!files.length) return;
        if (files.length > 1) enqueueWardrobeUploads(files);
        else acceptWardrobeUploadFile(files[0]).catch(function(){});
      });
    }
    $('pg52-wardrobe-name')?.addEventListener('input', updateWardrobeSaveReady);
    $('pg52-wardrobe-save-btn')?.addEventListener('click', function(){
      saveWardrobeFromForm().catch(function(err){ wardrobeStatus(String(err?.message || err || 'Wardrobe save failed'), true); });
    });
  }

  function ensureControls(){
    var page = $('page-generator');
    if (!page) return;
    claimSurface({ mode: 'generator-5.2' });
    page.classList.add('pg52-generator-owned');
    var title = page.querySelector('.page-title');
    var sub = page.querySelector('.page-sub');
    if (title) title.textContent = 'Prompt Generator V3';
    if (sub) sub.textContent = 'Production console — identity refs, Home System refs, wardrobe uploads, shot canvas, final image.';

    if (!renderGeneratorShell52()) return;
    var shell = $('prompt-generator-52-shell');
    if (!shell || shell.dataset.bound === '1') return;
    shell.dataset.bound = '1';
    removeLegacyProviderControls();
    initChipSelectors();
    initShotModeSelector(shell);
    initLocationPicker(shell);
    initActionEngine(shell);
    initShotOverrides(shell);
    initDirectorBrief(shell);
    initCinematicMode(shell);
    initSceneRefDock(shell);
    initAestheticRefDock(shell);
    initSmartRandomize(shell);
    initPg52Interactions(shell);
    initMobileGeneratorShell(shell);
    initStressHardening(shell);
    syncCreativeToolsTabs();
    renderIdentityLockCard();
    populateModelSelect();
    populateOutfitSelect();
    if ($('g-spend-lane') && !$('g-spend-lane').value) $('g-spend-lane').value = 'google_credits';
    syncCharacterAlias();
    ['g-char','g-platform','g-bucket','g-location','g-mood','g-time','g-posttype','g-mode','g-camera','g-spend-lane','g-route-intent','g-image-model','g-route-quality','g-image-aspect','g-realism','g-template','g-campaign','g-sa-texture','g-attach-refs','g-requires-text','g-outfit','g-outfit-override','g-shot-action','g-camera-distance','g-lens','g-movement','g-props','g-lock-outfit','g-lock-scene'].forEach(function(id){
      var el = $(id);
      if (!el) return;
      el.addEventListener(id === 'g-outfit-override' ? 'input' : 'change', function(){
        var patch = {};
        if (id === 'g-image-model') patch.modelId = getCurrentImageModel();
        if (id === 'g-spend-lane') patch.spendLane = getCurrentImageSpendLane();
        if (id === 'g-char') {
          syncCharacterAlias();
          scheduleCharacterSelection(el.value);
          return;
        }
        if (id === 'g-platform') syncPlatformIntelligence({ refresh: false });
        if (id === 'g-time') {
          var normalizedLighting = normalizeLightingId(el.value);
          if (normalizedLighting !== el.value) {
            syncLightingOptionsForShotMode(normalizedLighting);
            el.value = normalizedLighting;
          }
          patch.lighting = normalizedLighting;
        }
        if (id === 'g-outfit') patch.outfitId = el.value;
        if (id === 'g-outfit-override') patch.outfitOverride = el.value;
        if (id === 'g-shot-action') {
          patch.shotAction = el.value;
          patch.actionSuggestion = null;
        }
        if (id === 'g-camera-distance') patch.cameraDistance = el.value;
        if (id === 'g-lens') patch.lens = el.value;
        if (id === 'g-movement') patch.movement = el.value;
        if (id === 'g-props') patch.props = el.value;
        if (id === 'g-lock-outfit') patch.locks = { outfit: el.checked };
        if (id === 'g-lock-scene') patch.locks = { scene: el.checked };
        if (id === 'g-lock-camera') patch.locks = { camera: el.checked };
        if (id === 'g-lock-mood') patch.locks = { mood: el.checked };
        applyGeneratorState(patch, { source: id });
        if (id === 'g-location') {
          syncLocationPickerFromSelect();
          dispatchLocationChanged();
        }
      });
    });
    var toggle = $('pg50-model-drawer-toggle');
    if (toggle) toggle.addEventListener('click', function(){ setModelDrawerOpen(!state.modelDrawerOpen, toggle); });
    shell.querySelectorAll('[data-pg50-close-drawer]').forEach(function(btn){
      btn.addEventListener('click', function(){ setModelDrawerOpen(false, $('pg50-model-drawer-toggle')); });
    });
    shell.querySelectorAll('[data-pg50-randomize]').forEach(function(btn){
      btn.addEventListener('click', function(){
	      var kind = btn.getAttribute('data-pg50-randomize');
	      if (kind === 'concepts') generateConcepts();
	      else {
          if (kind === 'scene') openCreativeTools('randomize');
          applyRandomization(kind);
        }
	    });
	  });
	  shell.addEventListener('click', function(event){
	    var creativeTab = event.target && event.target.closest && event.target.closest('[data-pg52-tool-tab]');
	    if (creativeTab) {
	      openCreativeTools(creativeTab.getAttribute('data-pg52-tool-tab'));
	      return;
	    }
	    var saMomentTile = event.target && event.target.closest && event.target.closest('[data-pg52-sa-moment]');
	    if (saMomentTile) {
	      applySaMoment(saMomentTile.getAttribute('data-pg52-sa-moment'));
	      return;
	    }
	    var quickConfigBtn = event.target && event.target.closest && event.target.closest('[data-pg52-open-quick-configs]');
	    if (quickConfigBtn) {
	      openQuickConfigs();
	      return;
	    }
	    var finishPill = event.target && event.target.closest && event.target.closest('[data-pg52-finish-treatment]');
	    if (finishPill) {
	      setSocialFinishTreatment(finishPill.getAttribute('data-pg52-finish-treatment') || 'no_filter');
	      return;
	    }
	    var authenticityToggle = event.target && event.target.closest && event.target.closest('[data-pg52-authenticity]');
	    if (authenticityToggle) {
	      var key = authenticityToggle.getAttribute('data-pg52-authenticity') || '';
	      if (!authenticityToggle.disabled) setAuthenticityControl(key, authenticityToggle.getAttribute('aria-pressed') !== 'true');
	      return;
	    }
	    var axisLock = event.target && event.target.closest && event.target.closest('[data-pg52-axis-lock]');
	    if (axisLock) {
	      var axis = axisLock.getAttribute('data-pg52-axis-lock');
	      setAxisLock(axis, !axisLocked(axis));
	      return;
	    }
	    var smartRun = event.target && event.target.closest && event.target.closest('[data-pg52-smart-randomize]');
	    if (smartRun) {
        openCreativeTools('randomize');
	      applySmartRandomize();
	      return;
	    }
	    var smartAgain = event.target && event.target.closest && event.target.closest('[data-pg52-smart-randomize-again]');
	    if (smartAgain) {
        openCreativeTools('randomize');
	      applySmartRandomize('');
	      return;
	    }
	    var smartBack = event.target && event.target.closest && event.target.closest('[data-pg52-smart-randomize-back]');
	    if (smartBack) {
	      smartRandomizeBack();
	      return;
	    }
	    var copySeed = event.target && event.target.closest && event.target.closest('[data-pg52-copy-smart-seed]');
	    if (copySeed) {
	      copySmartSeed();
	      return;
	    }
	    var historyChip = event.target && event.target.closest && event.target.closest('[data-pg52-smart-history]');
	    if (historyChip) {
	      smartRandomizeFromHistory(historyChip.getAttribute('data-pg52-smart-history'));
	      return;
	    }
	    var blastRun = event.target && event.target.closest && event.target.closest('[data-pg52-concept-blast-run]');
	    if (blastRun) {
        openCreativeTools('concepts');
	      generateConcepts();
	      return;
	    }
	    var blastFilter = event.target && event.target.closest && event.target.closest('[data-pg52-concept-filter]');
	    if (blastFilter) {
	      var blast = conceptBlastState();
	      blast.filter = blastFilter.getAttribute('data-pg52-concept-filter') || 'all';
	      if (blast.open && blast.cards.length) {
	        var kitForBlast = buildKit();
	        blast.cards = generateConceptBlast(kitForBlast.generatorRecipe, { filter: blast.filter, locks: blast.locks });
	        state.generatorV5.conceptCards = blast.cards.slice();
	      }
	      renderConceptCards();
	      return;
	    }
	    var blastLock = event.target && event.target.closest && event.target.closest('[data-pg52-concept-lock]');
	    if (blastLock) {
	      var axis = blastLock.getAttribute('data-pg52-concept-lock');
	      var blastState = conceptBlastState();
	      blastState.locks[axis] = !blastState.locks[axis];
	      if (blastState.open && blastState.cards.length) {
	        var kitForLockedBlast = buildKit();
	        blastState.cards = generateConceptBlast(kitForLockedBlast.generatorRecipe, { filter: blastState.filter, locks: blastState.locks });
	        state.generatorV5.conceptCards = blastState.cards.slice();
	      }
	      renderConceptCards();
	      return;
	    }
	    var loadConcept = event.target && event.target.closest && event.target.closest('[data-pg52-load-concept]');
	    if (loadConcept) {
	      applyConceptBlastCard(loadConcept.getAttribute('data-pg52-load-concept'));
	      return;
	    }
	    var open = event.target && event.target.closest && event.target.closest('[data-pg52-open-wardrobe]');
	    if (open) {
        openWardrobeForm('');
        return;
      }
      var close = event.target && event.target.closest && event.target.closest('[data-pg52-close-wardrobe]');
      if (close) {
        closeWardrobeForm();
        return;
      }
      var edit = event.target && event.target.closest && event.target.closest('[data-pg52-wardrobe-edit]');
      if (edit) {
        openWardrobeForm(edit.getAttribute('data-pg52-wardrobe-edit'));
        return;
      }
      var del = event.target && event.target.closest && event.target.closest('[data-pg52-wardrobe-delete]');
      if (del) {
        deleteWardrobeItem(del.getAttribute('data-pg52-wardrobe-delete'));
        return;
      }
      var toggleWardrobe = event.target && event.target.closest && event.target.closest('[data-pg52-wardrobe-toggle]');
      if (toggleWardrobe) {
        var id = toggleWardrobe.getAttribute('data-pg52-wardrobe-toggle');
        var ids = activeWardrobeIds();
        ids = ids.includes(id) ? ids.filter(function(item){ return item !== id; }) : ids.concat(id);
        applyGeneratorState({ activeWardrobeRefs: ids }, { source: 'wardrobe-toggle' });
        return;
      }
      var shotHistoryToggle = event.target && event.target.closest && event.target.closest('[data-pg52-shot-history-toggle]');
      if (shotHistoryToggle) {
        state.generatorV5.shotHistoryOpen = !state.generatorV5.shotHistoryOpen;
        renderShotHistoryPanel();
        if (state.generatorV5.shotHistoryOpen) fetchShotHistory({ character: $('g-char')?.value || 'leah', limit: 20 });
        return;
      }
      var shotHistoryRefresh = event.target && event.target.closest && event.target.closest('[data-pg52-refresh-shot-history]');
      if (shotHistoryRefresh) {
        fetchShotHistory({ character: $('g-char')?.value || 'leah', limit: 20 });
        return;
      }
      var shotHistoryReload = event.target && event.target.closest && event.target.closest('[data-pg52-shot-id]');
      if (shotHistoryReload) {
        var shotId = shotHistoryReload.getAttribute('data-pg52-shot-id');
        var shotById = loadShotHistory().find(function(item){ return item && item.id === shotId; });
        restoreShotHistoryRecord(shotById);
        return;
      }
      var shotMemory = event.target && event.target.closest && event.target.closest('[data-pg52-shot-dna]');
      if (shotMemory) {
        var dna = shotMemory.getAttribute('data-pg52-shot-dna');
        var shot = loadShotHistory($('g-char')?.value || 'leah').find(function(item){ return item.dna === dna; });
        var recipe = shot?.recipe || {};
        var scene = recipe.scenePack || {};
        applyGeneratorState({
          locationId: scene.locationId || '',
          lighting: scene.lightingId || '',
          moodId: scene.moodId || '',
          shotAction: scene.action || state.generatorV5.shotAction,
          cameraDistance: scene.cameraDistance || state.generatorV5.cameraDistance,
          lens: scene.lens || state.generatorV5.lens,
          movement: scene.movement || state.generatorV5.movement,
          props: scene.props || state.generatorV5.props,
          activeWardrobeRefs: recipe.activeWardrobeIds || state.generatorV5.activeWardrobeRefs
        }, { source: 'shot-dna-memory' });
      }
    });
    shell.addEventListener('submit', function(event){
      if (event.target && event.target.matches && event.target.matches('[data-pg52-dna-load-form]')) {
        event.preventDefault();
        loadShotFromDna();
        return;
      }
      if (event.target && event.target.id === 'pg52-wardrobe-form') {
        event.preventDefault();
        saveWardrobeFromForm().catch(function(err){ wardrobeStatus(String(err?.message || err || 'Wardrobe save failed'), true); });
      }
    });
    shell.addEventListener('change', function(event){
      var weightTarget = event.target && event.target.closest && event.target.closest('[data-pg52-ref-weight]');
      if (weightTarget) {
        var weightKey = weightTarget.getAttribute('data-pg52-ref-weight');
        if (!weightKey) return;
        state.generatorV5.referenceWeights = Object.assign({}, state.generatorV5.referenceWeights || {});
        state.generatorV5.referenceWeights[weightKey] = Number(weightTarget.value) || referenceDefaultWeight({});
        renderReferenceDock();
        renderPromptPreview();
        renderRoutePreview(null);
        schedulePreviewImageRouteFromGenerator();
        return;
      }
      var target = event.target && event.target.closest && event.target.closest('[data-pg51-ref-toggle]');
      if (!target) return;
      var key = target.getAttribute('data-pg51-ref-toggle');
      if (!key) return;
      var refs = Object.assign({}, state.generatorV5.selectedRefs || {});
      refs[key] = Boolean(target.checked);
      applyGeneratorState({ selectedRefs: refs }, { source: 'reference-pack' });
    });
    document.addEventListener('keydown', function(event){
      if (event.key === 'Escape' && state.modelDrawerOpen) setModelDrawerOpen(false, $('pg50-model-drawer-toggle'));
    });
    updateSpendNote();
    applyContextIntelligence();
    syncPlatformIntelligence({ refresh: false });
    renderIdentitySummary();
    renderReferenceDock();
    renderContextIntelligence();
    renderShotHistoryPanel();
    renderShotSummary();
    renderPlatformCompositionPreview();
    renderWardrobeCards();
    renderWardrobeLibrary();
    renderConceptCards();
    syncSaMomentStrip();
    renderPromptPreview();
    syncChipLabels(shell);
  }

  function populateModelSelect(){
    var select = $('g-image-model');
    if (!select) return;
    var current = select.value || recommendedFinalModelForLane(getCurrentImageSpendLane());
    select.innerHTML = state.models.map(function(model){
      return '<option value="' + esc(model.id) + '">' + esc(modelOptionLabel(model)) + '</option>';
    }).join('');
    select.value = state.models.some(function(model){ return model.id === current; }) ? current : recommendedFinalModelForLane(getCurrentImageSpendLane());
    if (getCurrentImageSpendLane() === 'auto_best') applySpendLaneRouteDefaults('auto_best');
    if ($('g-route-intent')) $('g-route-intent').value = intentForModel(select.value);
    if ($('g-route-quality')) $('g-route-quality').value = qualityForModel(select.value);
  }

  function populateOutfitSelect(forceDefault){
    var select = $('g-outfit');
    if (!select) return;
    var current = forceDefault ? '' : (select.value || state.generatorV5.outfitId || '');
    var closet = currentCloset();
    select.innerHTML = outfitOptionsHtml();
    if (!closet.some(function(item){ return item.id === current; })) current = closet[0]?.id || '';
    select.value = current;
    state.generatorV5.outfitId = current;
    renderWardrobeCards();
  }

  function getReferenceCount(charId){
    if (!checked('g-attach-refs', true)) return 0;
    if ($('prompt-generator-52-shell') || $('prompt-generator-51-shell')) return activeReferencePack(charId).length;
    if (typeof window.getCharacterVaultRefs === 'function') {
      return window.getCharacterVaultRefs(charId || $('g-char')?.value || '').length;
    }
    try {
      var st = JSON.parse(localStorage.getItem('silva_assets_' + (charId || $('g-char')?.value || '')) || '{}');
      return ['face','body'].filter(function(key){ return typeof st[key] === 'string' && st[key]; }).length;
    } catch (err) {
      return 0;
    }
  }

  function syncCharacterAlias(){
    var alias = $('g-character');
    if (alias) alias.value = $('g-char')?.value || alias.value || 'leah';
  }

  function identityRefsForCurrent(){
    if (!checked('g-attach-refs', true)) return [];
    try {
      return typeof window.getCharacterVaultRefs === 'function' ? window.getCharacterVaultRefs($('g-char')?.value || 'leah') : [];
    } catch (_) {
      return [];
    }
  }

  function renderIdentitySummary(){
    var refs = ($('prompt-generator-52-shell') || $('prompt-generator-51-shell')) ? activeReferencePack() : identityRefsForCurrent();
    var face = refs.find(function(ref){ return ref.type === 'face' || /face/i.test(String(ref.label || '')); });
    var body = refs.find(function(ref){ return ref.type === 'body' || /body|build/i.test(String(ref.label || '')); });
    var exactSafe = Boolean(face);
    var char = getCharSafe($('g-char')?.value || 'leah');
    if ($('pg52-char-display')) $('pg52-char-display').textContent = char.name || optionText('g-char') || 'Character';
    if ($('pg52-profile-inline-state')) {
      var profileState = $('pg52-profile-inline-state');
      profileState.hidden = !(state.generatorProfileLoading || state.generatorProfileError);
      profileState.className = 'pg52-profile-inline-state ' + (state.generatorProfileLoading ? 'is-loading' : 'is-error');
      profileState.textContent = state.generatorProfileLoading ? 'Loading character profile...' : (state.generatorProfileError || '');
    }
    if ($('pg52-char-tags')) {
      var tags = [
        char.role || char.title || '',
        char.identity?.skin || char.identity?.tone || '',
        activeRoutedModel()?.displayName || 'Nano Banana Pro'
      ].filter(Boolean).slice(0, 4);
      $('pg52-char-tags').innerHTML = tags.map(function(tag){ return '<span>' + esc(tag) + '</span>'; }).join('');
    }
    if ($('pg52-ref-grid')) {
      var tiles = [face, body].filter(Boolean).map(function(ref){
        var src = ref.preview || ref.dataUrl || ref.url || '';
        var label = /body|build/i.test(ref.label || ref.role || ref.type || '') ? 'Body' : 'Face';
        return [
          '<div class="pg52-ref-tile">',
            src ? '<img src="' + esc(src) + '" alt="' + esc(ref.label || label + ' reference') + '">' : '<div class="pg52-ref-placeholder"></div>',
            '<div class="pg52-ref-tile-label">' + esc(label) + '</div>',
          '</div>'
        ].join('');
      }).join('');
      $('pg52-ref-grid').innerHTML = tiles || '<div class="pg52-ref-empty">Add face/body refs in Assets Vault.</div>';
      cascadeRefReveal($('pg52-ref-grid'));
    }
    if ($('pg52-readiness-dot')) {
      var count = refs.length;
      var stateName = count >= 2 ? 'ready' : count === 1 ? 'partial' : 'none';
      $('pg52-readiness-dot').className = 'pg52-readiness-dot pg52-readiness-dot--' + stateName;
      $('pg52-readiness-label').textContent = stateName === 'ready' ? 'exact_character_ready' : stateName === 'partial' ? '1 ref active' : 'no refs attached';
      var detail = count + ' labeled ref' + (count === 1 ? '' : 's') + ' will be sent with this generation.';
      if ($('pg52-readiness-row')) $('pg52-readiness-row').title = detail;
      if ($('pg52-readiness-detail')) $('pg52-readiness-detail').textContent = detail;
    }
    syncCharacterActivityDots();
    var wrap = $('pg50-identity-summary') || $('pg40-identity-summary') || $('pg38-identity-summary');
    if (!wrap) return;
    var cards = [face, body].filter(Boolean).map(function(ref){
      var preview = ref.preview || ref.dataUrl || ref.url || '';
      return [
        '<div class="pg40-ref-mini">',
          preview ? '<img src="' + esc(preview) + '" alt="' + esc(ref.label || ref.type || 'reference') + '">' : '<div class="pg3-ref-empty">No preview</div>',
          '<div><strong>' + esc(ref.type === 'face' ? 'Face lock' : ref.type === 'body' ? 'Body lock' : 'Reference') + '</strong><span>' + esc(ref.source || 'vault') + '</span></div>',
        '</div>'
      ].join('');
    }).join('');
    wrap.innerHTML = [
      '<div class="pg40-identity-status">',
        '<span class="pg3-readiness-pill ' + (exactSafe ? 'ready' : 'missing') + '">' + (exactSafe ? 'exact_character ready' : 'face ref missing') + '</span>',
        '<span class="pg40-muted">' + esc(refs.length) + ' labeled refs will be sent when enabled</span>',
      '</div>',
      '<div class="pg40-ref-grid">' + (cards || '<div class="pg3-warning">No face/body refs found. Add identity references before judging exact character fidelity.</div>') + '</div>'
    ].join('');
  }

  function getCurrentImageModel(){
    return $('g-image-model')?.value || 'google/nano-banana-pro';
  }
  function getCurrentImageIntent(modelId){
    return $('g-route-intent')?.value || intentForModel(modelId || getCurrentImageModel());
  }
  function getCurrentImageQuality(modelId){
    return $('g-route-quality')?.value || qualityForModel(modelId || getCurrentImageModel());
  }
  function getCurrentImageAspectRatio(){
    return $('g-image-aspect')?.value || '1:1';
  }
  function updateSpendNote(){
    var note = $('pg3-spend-note');
    if (!note) return;
    var lane = getCurrentImageSpendLane();
    var refs = routeContext().referenceCount;
    note.textContent = lane === 'google_credits' && refs > 0
      ? 'Google Credits: actual refs go into Nano Banana Pro / Vertex Gemini Image for direct-reference final generation.'
      : lane === 'auto_best' && refs > 0
      ? 'Auto Best: references detected, so the route prefers Google direct-reference Nano Banana Pro first.'
      : spendLaneLabel(lane);
  }

  function supportPills(model){
    var items = [
      ['Text', model.supportsTextToImage],
      ['Refs', model.supportsImageToImage],
      ['Multi-ref', model.supportsMultiReference],
      ['Edit', model.supportsEditing],
      ['Max refs ' + number(model.maxReferenceImages, 0), true]
    ];
    return items.map(function(item){
      return '<span class="pg3-support-pill ' + (item[1] ? 'ok' : 'no') + '">' + esc(item[0]) + '</span>';
    }).join('');
  }

  function modelWarnings(model, ctx){
    var warnings = [];
    if (!model) return warnings;
    var legacyImagen = model.id === 'google/imagen-3-text-only' || model.id === 'google/imagen-4';
    if (ctx.referenceCount > 0 && legacyImagen) warnings.push('Imagen text-only cannot use actual references. Switch to Nano Banana Pro for Google direct refs.');
    if (ctx.referenceCount > 0 && !model.supportsImageToImage) warnings.push('This model does not support reference-image input.');
    if (ctx.referenceCount > 1 && !model.supportsMultiReference) warnings.push('This model is weak for multi-reference identity work.');
    if (ctx.referenceCount > number(model.maxReferenceImages, 0)) warnings.push('Reference count exceeds this model limit.');
    if (ctx.requiresEditing && !model.supportsEditing) warnings.push('Editing is required but this model is not an edit route.');
    if (ctx.requiresTextRendering && !String(model.id || '').startsWith('openai/')) warnings.push('Text/layout rendering usually belongs on the GPT Image route.');
    if ((ctx.intent === 'broll_final' || ctx.intent === 'object_product_final' || ctx.intent === 'no_reference_scene') && ctx.referenceCount === 0 && ['premium','ultra'].includes(model.qualityTier)) warnings.push('This route is premium-priced for a no-reference asset.');
    if (ctx.intent === 'final_character' && !model.supportsImageToImage && ctx.referenceCount > 0) warnings.push('Character finals with refs require a direct-reference model.');
    return warnings;
  }

  function routeContext(){
    var modelId = getCurrentImageModel();
    var charId = $('g-char')?.value || 'leah';
    var referenceCount = getReferenceCount(charId);
    var spendLane = getCurrentImageSpendLane();
    var selectedModel = modelById(modelId);
    if (spendLane === 'auto_best' && referenceCount > 0 && selectedModel?.providerAdapter === 'google') {
      modelId = 'google/nano-banana-pro';
      selectedModel = modelById(modelId);
    }
    return {
      modelId: modelId,
      selectedModel: selectedModel,
      spendLane: spendLane,
      intent: getCurrentImageIntent(modelId),
      referenceCount: referenceCount,
      requiresEditing: referenceCount > 0 || modelId === 'fal/qwen-image-2-edit' || modelId === 'prunaai/p-image-edit',
      requiresTextRendering: checked('g-requires-text', modelId === 'openai/gpt-image-2'),
      quality: spendLane === 'auto_best' && referenceCount > 0 ? 'premium' : getCurrentImageQuality(modelId),
      budgetTier: spendLane === 'google_credits' ? 'google_credits' : ((modelId === 'google/imagen-3-text-only' || modelId === 'google/imagen-4' || modelId === 'fal/qwen-image-2-edit' || modelId === 'prunaai/p-image-edit') ? 'lean_final' : 'full_final')
    };
  }

  function renderRoutePreview(data, error){
    var preview = $('g-route-preview');
    if (!preview) return;
    var ctx = routeContext();
    data = data || currentRoutePreview();
    var selected = (data && data.selectedModel) || ctx.selectedModel;
    var preferred = ctx.selectedModel;
    var diverged = routeDivergence(data, ctx);
    var readiness = readinessForModel(selected);
    var warnings = modelWarnings(selected, ctx);
    var strategy = data?.referenceStrategy || (ctx.spendLane === 'google_credits' && selected.providerAdapter === 'google' && ctx.referenceCount > 0 ? 'google_direct_reference_images' : (ctx.referenceCount > 0 ? 'direct_reference_images' : 'text_to_image'));
    var checkedAt = readiness.lastCheckedAt || state.providerStatusLastCheckedAt || state.providerStatus?.lastCheckedAt || 'not checked yet';
    if (!readiness.configured && readinessLabel(selected) === 'refreshing status') {
      warnings.unshift('Refreshing provider status from the server vault before calling this route.');
    } else if (!readiness.configured) {
      warnings.unshift(providerChip(selected) + ' is missing a server-side provider credential. Add it in Provider Control Center before generation.');
    }
    var reasoning = data && Array.isArray(data.reasoning) ? data.reasoning : [state.routePreviewLoading ? 'Checking the live router without rebuilding the model board.' : 'Using local model registry until the backend route preview responds.'];
    var alternatives = data && Array.isArray(data.alternatives) ? data.alternatives : state.models.filter(function(model){ return model.id !== selected.id; }).slice(0, 3);
    var googleDirectRefs = ctx.spendLane === 'google_credits' && selected.providerAdapter === 'google' && ctx.referenceCount > 0;
    setCostDisplay($('pg3-selected-cost'), zarCost(selected));
    syncMobileCostLabels();
    renderModelSummary(selected, data);
    if ($('pg52-route-content')) {
      if ($('pg52-route-skeleton')) $('pg52-route-skeleton').hidden = true;
      $('pg52-route-content').hidden = false;
      if ($('pg52-route-model-name')) $('pg52-route-model-name').textContent = selected.displayName || selected.id || 'Selected route';
      if ($('pg52-route-provider')) $('pg52-route-provider').textContent = providerChip(selected) + (backendModelNote(selected) ? ' · ' + backendModelNote(selected) : '');
      setCostDisplay($('pg52-route-cost-num'), zarCost(selected));
      syncMobileCostLabels();
      if ($('pg52-route-readiness')) {
        $('pg52-route-readiness').innerHTML = '<div class="pg52-readiness-dot pg52-readiness-dot--' + esc(readiness.configured ? 'ready' : 'none') + '"></div><span>' + esc(readinessLabel(selected)) + '</span>';
      }
      var sentence = googleDirectRefs
        ? 'Using Google Cloud credits with direct reference images via ' + selected.displayName + '.'
        : ctx.referenceCount > 0
        ? spendLaneLabel(ctx.spendLane) + ' with labeled references via ' + selected.displayName + '.'
        : spendLaneLabel(ctx.spendLane) + ' for a no-reference final image via ' + selected.displayName + '.';
      if (readiness.configured) sentence = 'Ready to generate. ' + sentence;
      if ($('pg52-route-reason')) $('pg52-route-reason').textContent = sentence;
      if ($('pg52-route-tags')) {
        var routeTags = [
          spendLaneShort(ctx.spendLane),
          ctx.intent.replace(/_/g, ' '),
          ctx.referenceCount ? ('refs ' + ctx.referenceCount) : 'no refs',
          readiness.configured ? 'ready' : 'setup needed'
        ];
        $('pg52-route-tags').innerHTML = routeTags.map(function(tag){ return '<span>' + esc(tag) + '</span>'; }).join('');
      }
      if ($('pg52-model-intelligence-card')) {
        $('pg52-model-intelligence-card').innerHTML = modelIntelligenceCardHtml(selected, data);
      }
      renderIdentityLockCard();
      try {
        var kitForQuality = buildKit();
        var quality = kitForQuality.generatorRecipe?.promptQuality || scorePromptQuality(kitForQuality.generatorRecipe, selected);
        if ($('pg52-prompt-quality-pill')) {
          $('pg52-prompt-quality-pill').textContent = 'Prompt quality: ' + quality.grade + ' - ' + quality.total + '/100';
        }
        if ($('pg52-prompt-quality-detail')) $('pg52-prompt-quality-detail').innerHTML = promptQualityHtml(quality);
      } catch (_) {}
      var details = $('pg52-route-details');
      if (details) {
        var summary = $('pg50-model-summary')?.outerHTML || '';
        details.innerHTML = [
          '<div id="pg50-model-summary">' + ($('pg50-model-summary')?.innerHTML || '') + '</div>',
          warnings.length ? '<div class="pg3-warning">' + esc(warnings.join(' ')) + '</div>' : '',
          '<div class="pg3-soft-note">' + esc(referenceStrategyLabel(strategy)) + '</div>',
          googleDirectRefs ? '<button class="pg52-btn-ghost pg52-btn-sm" type="button" onclick="switchToFalDirectRefs()">Use fal.ai direct refs instead</button>' : '',
          !readiness.configured ? '<button class="pg52-btn-ghost pg52-btn-sm" type="button" onclick="focusProviderSetup(\'' + esc(selected.providerAdapter || '') + '\')">Add provider credential</button>' : ''
        ].join('');
      }
      if (error && $('ai-helper-output')) $('ai-helper-output').textContent = error;
      return;
    }
    preview.innerHTML = [
      '<div class="pg38-status-head">',
        '<div>',
          '<div class="pg38-route-sentence">' + esc(spendLaneLabel(ctx.spendLane)) + ' via ' + esc(selected.displayName) + '.</div>',
          '<div class="pg3-mini">' + esc(backendModelNote(selected)) + '</div>',
        '</div>',
        '<div class="pg38-route-price">',
          '<span class="pg3-cost-pill">' + esc(zarCost(selected)) + '</span>',
          '<span class="pg3-readiness-pill ' + esc(readinessClass(selected)) + '">' + esc(readinessLabel(selected)) + '</span>',
        '</div>',
      '</div>',
      '<div class="pg38-route-facts">',
        '<span><strong>Intent</strong> ' + esc(ctx.intent.replace(/_/g, ' ')) + '</span>',
        '<span><strong>Preferred</strong> ' + esc(preferred.displayName) + '</span>',
        '<span><strong>Selected</strong> ' + esc(selected.displayName) + '</span>',
        '<span><strong>Refs</strong> ' + esc(ctx.referenceCount) + '</span>',
      '</div>',
      '<div class="pg3-readiness-banner ' + esc(readinessClass(selected)) + '">',
        '<span>' + esc(readiness.configured ? ('Ready to generate · ' + spendLaneLabel(ctx.spendLane)) : readinessLabel(selected)) + '</span>',
        '<span>' + esc(providerChip(selected)) + ' · source ' + esc(readiness.source || 'missing') + '</span>',
        '<span>Last checked ' + esc(checkedAt) + '</span>',
      '</div>',
      '<div class="pg3-soft-note">' + esc(referenceStrategyLabel(strategy)) + (ctx.spendLane === 'auto_best' && selected.providerAdapter !== preferred.providerAdapter ? ' · Auto changed provider lane.' : '') + '</div>',
      '<details class="pg3-router-details">',
        '<summary>Why this route + alternatives</summary>',
        diverged ? '<div class="pg3-soft-note"><strong>Preferred:</strong> ' + esc(preferred.displayName) + ' · <strong>Router selected:</strong> ' + esc(selected.displayName) + '</div>' : '',
        '<div class="pg3-chip-row">',
          '<span class="pg3-chip">' + esc(usdCost(selected)) + '</span>',
          '<span class="pg3-chip">' + (diverged ? 'router selected' : 'preferred model') + '</span>',
          '<span class="pg3-chip">source: ' + esc(readiness.source || 'missing') + '</span>',
        '</div>',
        '<div class="pg3-list"><strong>Why:</strong> ' + esc(reasoning.join(' ')) + '</div>',
        alternatives.length ? '<div class="pg3-list"><strong>Alternatives:</strong> ' + esc(alternatives.map(function(model){ return model.displayName + ' (' + zarCost(model) + ')'; }).join(' | ')) + '</div>' : '',
      '</details>',
      warnings.length ? '<div class="pg3-warning">' + esc(warnings.join(' ')) + '</div>' : '',
      googleDirectRefs ? '<button class="btn btn-ghost btn-sm pg3-provider-setup" type="button" onclick="switchToFalDirectRefs()">Use fal.ai direct refs instead</button>' : '',
      diverged ? '<button class="btn btn-ghost btn-sm pg3-provider-setup" type="button" onclick="useRouterSelectedModel()">Use router route</button>' : '',
      !readiness.configured ? '<button class="btn btn-ghost btn-sm pg3-provider-setup" type="button" onclick="focusProviderSetup(\'' + esc(selected.providerAdapter || '') + '\')">Add provider credential</button>' : '',
      error ? '<div class="pg3-warning">' + esc(error) + '</div>' : ''
    ].join('');
  }

  function renderModelSummary(model, data){
    var wrap = $('pg50-model-summary') || $('pg40-model-summary') || $('pg38-model-summary');
    if (!wrap) return;
    model = model || activeRoutedModel();
    if (!model) return;
    var ctx = routeContext();
    var selected = data?.selectedModel || model;
    var diverged = selected && model && selected.id !== model.id;
    var intel = modelIntelligence(selected);
    wrap.innerHTML = [
      '<div class="pg40-model-summary-main">',
        '<div><span>Selected model</span><strong>' + esc(selected.displayName) + '</strong></div>',
        '<div><span>Billing lane</span><strong>' + esc(spendLaneShort(ctx.spendLane)) + '</strong></div>',
        '<div><span>Cost estimate</span><strong>' + esc(zarCost(selected)) + '</strong></div>',
        '<div><span>Status</span><strong>' + esc(readinessLabel(selected)) + '</strong></div>',
      '</div>',
      '<div class="pg40-model-summary-note">Best for: ' + esc(intel.bestFor.slice(0, 3).join(', ') || bestUseLine(selected)) + ' · ' + esc(providerChip(selected)) + (diverged ? ' · Router changed the preferred model.' : '') + '</div>'
    ].join('');
  }

  function snapshotPill(label, model, active){
    if (!model) return '';
    var readiness = readinessForModel(model);
    return [
      '<button class="pg3-snapshot-pill ' + (active ? 'active ' : '') + readinessClass(model) + '" type="button" data-route-snapshot-model="' + esc(model.id) + '">',
        '<span>' + esc(label) + '</span>',
        '<strong>' + esc(model.displayName) + '</strong>',
        '<em>' + esc(shortProviderChip(model)) + ' · ' + esc(zarCost(model)) + ' · ' + esc(readinessLabel(model)) + '</em>',
      '</button>'
    ].join('');
  }

  function renderRouteSnapshot(selected, data){
    var wrap = $('pg3-route-snapshot');
    if (!wrap) return;
    selected = selected || activeRoutedModel();
    var diverged = routeDivergence(data || currentRoutePreview(), routeContext());
    wrap.innerHTML = routeSnapshotItems(selected).map(function(item){
      return snapshotPill(item.label, item.model, item.active || (item.model && selected && item.model.id === selected.id));
    }).concat([
      diverged ? '<button class="btn btn-ghost btn-sm" type="button" onclick="useRouterSelectedModel()">Use router route</button>' : ''
    ]).join('');
    wrap.querySelectorAll('[data-route-snapshot-model]').forEach(function(btn){
      btn.addEventListener('click', function(){
        selectImageModelRoute(btn.getAttribute('data-route-snapshot-model'));
      });
    });
  }

  function modelComparisonCardHtml(model, selectedId, recommendedId, compact, ctx){
    var intel = modelIntelligence(model);
    var readiness = readinessForModel(model);
    var bestUse = intel.bestFor[0] || bestUseLine(model);
    var watch = modelWatchFor(model, ctx || modelRecommendationContext()).join(' - ') || list(intel.notIdealFor, 1);
    return [
      '<div class="pg3-model-card pg40-model-card pg52-model-comparison-card ' + (compact ? 'compact ' : '') + (model.id === selectedId ? 'selected ' : '') + (model.id === recommendedId ? 'recommended' : '') + '" role="button" tabindex="0" data-model-id="' + esc(model.id) + '">',
        '<div class="pg3-model-card-top">',
          '<div class="pg3-model-name">' + esc(model.displayName) + '</div>',
          '<span class="pg3-chip">' + esc(shortProviderChip(model)) + '</span>',
        '</div>',
        '<div class="pg52-model-card-badges">' + modelRecommendationBadge(model, recommendedId, selectedId) + '</div>',
        '<div class="pg3-model-meta">' + esc(bestUse) + '</div>',
        '<div class="pg3-backend-note">' + esc(backendModelNote(model)) + '</div>',
        '<div class="pg52-model-compare-grid">',
          '<div><span>ID Lock</span>' + modelRatingDots(intel.identityLockStrength) + '</div>',
          '<div><span>Skin</span>' + modelRatingDots(modelSkinToneRating(model)) + '</div>',
          '<div><span>BG</span>' + modelRatingDots(intel.backgroundRealism) + '</div>',
          '<div><span>Creative</span>' + modelRatingDots(intel.creativeRange) + '</div>',
        '</div>',
        '<div class="pg52-model-best-use"><span>Best use case</span><strong>' + esc(bestUse) + '</strong></div>',
        '<div class="pg3-chip-row"><span class="pg3-cost-pill">' + esc(zarCost(model)) + '</span><span class="pg3-readiness-pill ' + esc(readinessClass(model)) + '" data-model-readiness="' + esc(model.id) + '">' + esc(readinessLabel(model)) + '</span></div>',
        '<div class="pg3-chip-row">' + supportPills(model) + '</div>',
        '<details class="pg3-model-details"><summary>Limits and best use</summary><div class="pg3-list"><strong>Watch:</strong> ' + esc(watch) + '</div><div class="pg3-mini"><strong>Best:</strong> ' + esc(list(intel.bestFor, 3)) + '</div><div class="pg3-mini"><strong>Not ideal:</strong> ' + esc(list(intel.notIdealFor, 3)) + '</div><div class="pg3-mini"><strong>Skin:</strong> ' + esc(intel.skinTonePerformance) + '</div><div class="pg3-mini" data-model-source="' + esc(model.id) + '">' + esc((readiness.source || 'missing')) + '</div></details>',
      '</div>'
    ].join('');
  }

  function modelCardHtml(model, selectedId, recommendedId, compact, ctx){
    return modelComparisonCardHtml(model, selectedId, recommendedId, compact, ctx);
  }

  function bindModelCards(board){
    board.querySelectorAll('.pg3-model-card').forEach(function(card){
      function choose(event){
        if (event.target && event.target.closest && event.target.closest('summary,details')) return;
        var id = card.getAttribute('data-model-id');
        selectImageModelRoute(id);
      }
      card.addEventListener('click', choose);
      card.addEventListener('keydown', function(event){
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          choose(event);
        }
      });
    });
    board.querySelectorAll('.pg3-model-strip').forEach(function(strip){
      strip.scrollLeft = state.modelStripScrollLeft || 0;
      strip.addEventListener('scroll', function(){ state.modelStripScrollLeft = strip.scrollLeft; }, { passive: true });
    });
    board.querySelectorAll('[data-model-slide]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var strip = board.querySelector('.pg3-model-strip');
        if (!strip) return;
        var dir = Number(btn.getAttribute('data-model-slide')) || 1;
        strip.scrollBy({ left: dir * Math.max(260, Math.round(strip.clientWidth * 0.72)), behavior: 'smooth' });
      });
    });
  }

  function setModelDrawerOpen(open, restoreTarget){
    var drawer = $('pg50-model-drawer') || $('pg40-model-drawer') || $('pg38-model-drawer');
    var toggle = $('pg50-model-drawer-toggle') || $('pg40-model-drawer-toggle') || $('pg38-model-drawer-toggle');
    if (!drawer) return;
    state.modelDrawerOpen = Boolean(open);
    drawer.hidden = !state.modelDrawerOpen;
    if (toggle) toggle.setAttribute('aria-expanded', state.modelDrawerOpen ? 'true' : 'false');
    if (state.modelDrawerOpen) {
      renderModelIntelligence(false);
      setTimeout(function(){
        var selectedCard = drawer.querySelector('.pg3-model-card.selected') || drawer.querySelector('.pg3-model-card');
        if (selectedCard && typeof selectedCard.focus === 'function') selectedCard.focus();
      }, 0);
    } else if (restoreTarget && typeof restoreTarget.focus === 'function') {
      restoreTarget.focus();
    }
  }

  function setMobileNavOpen(open){
    var next = Boolean(open);
    document.body.classList.toggle('pg52-mobile-nav-open', next);
    var backdrop = $('pg52-mobile-nav-backdrop');
    if (backdrop) backdrop.hidden = !next;
    document.querySelectorAll('[data-pg52-mobile-nav-toggle]').forEach(function(btn){
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      btn.setAttribute('aria-label', next ? 'Close navigation' : 'Open navigation');
    });
  }

  function syncMobileCostLabels(){
    var cost = $('pg52-route-cost-num')?.getAttribute('data-pg52-cost-value') || $('pg3-selected-cost')?.getAttribute('data-pg52-cost-value') || $('pg52-route-cost-num')?.textContent || $('pg3-selected-cost')?.textContent || 'R-';
    document.querySelectorAll('.pg52-generate-btn--full').forEach(function(btn){
      btn.setAttribute('data-pg52-cost', cost);
      btn.setAttribute('aria-label', 'Generate Final Image - ' + cost);
    });
  }

  function mobilePromptSheetContentHtml(){
    try {
      var kit = buildKit();
      var quality = livePromptQuality(kit);
      var rawPrompt = kit.mainPrompt || window._lastGenerated?.prompt || $('out-main')?.textContent || '';
      var rawNegative = kit.negative || window._lastGenerated?.negPrompt || $('out-neg')?.textContent || '';
      var dna = kit.generatorRecipe?.shotDna || '';
      var previousDna = state.generatorV5.lastRenderedMobileDna || '';
      state.generatorV5.lastRenderedMobileDna = dna;
      return [
        '<div class="pg52-mobile-prompt-dna">' + dnaPillHtml(dna, previousDna) + dnaLoadHtml() + '</div>',
        '<div class="pg52-mobile-prompt-segments">' + livePromptSegments(kit).map(promptAnatomySegmentHtml).join('') + '</div>',
        '<div class="pg52-mobile-prompt-quality">Prompt quality: ' + esc(quality.grade || 'D') + ' - ' + esc(quality.total || 0) + '/' + esc(quality.max || 100) + '</div>',
        '<details class="pg52-mobile-prompt-raw" open><summary>Final prompt</summary><pre>' + esc(rawPrompt) + '</pre></details>',
        '<details class="pg52-mobile-prompt-raw"><summary>Negative prompt</summary><pre>' + esc(rawNegative) + '</pre></details>'
      ].join('');
    } catch (err) {
      return '<div class="pg3-warning">Prompt preview is not ready yet. Adjust the shot controls and try again.</div>';
    }
  }

  function setMobilePromptSheetOpen(open){
    var sheet = $('pg52-mobile-prompt-sheet');
    if (!sheet) return;
    var next = Boolean(open);
    if (next) {
      renderPromptPreview();
      var body = $('pg52-mobile-prompt-body');
      if (body) body.innerHTML = mobilePromptSheetContentHtml();
    }
    sheet.hidden = !next;
    document.body.classList.toggle('pg52-mobile-prompt-open', next);
    if (next) sheet.querySelector('[data-pg52-mobile-prompt-close]')?.focus();
  }

  function setMobileRouteOpen(open){
    var next = Boolean(open);
    document.body.classList.toggle('pg52-mobile-route-open', next);
    document.querySelectorAll('[data-pg52-mobile-route-toggle]').forEach(function(btn){
      btn.setAttribute('aria-expanded', next ? 'true' : 'false');
      btn.textContent = next ? 'Hide route + model' : 'Route + model';
    });
  }

  function mobileSessionBodyHtml(){
    var char = $('g-char')?.value || 'leah';
    var shots = [];
    try { shots = loadShotHistory(char).slice(0, 12); } catch (_) { shots = []; }
    if (!shots.length) {
      return '<div class="pg52-mobile-session-empty">No generated shots in this session yet. Build the shot, then generate when ready.</div>';
    }
    return shots.map(function(shot, index){
      var label = shot.dna || shot.title || ('Shot ' + (index + 1));
      var status = shot.reviewStatus || shot.status || 'pending';
      return [
        '<button class="pg52-mobile-session-shot" type="button" data-pg52-shot-id="' + esc(shot.id || '') + '">',
          shot.imageData || shot.imageUrl ? '<img src="' + esc(shot.imageData || shot.imageUrl) + '" alt="Session shot preview" loading="lazy">' : '<span class="pg52-mobile-session-thumb">' + esc(String(index + 1)) + '</span>',
          '<span><strong>' + esc(label) + '</strong><em>' + esc(status) + '</em></span>',
        '</button>'
      ].join('');
    }).join('');
  }

  function setMobileSessionSheetOpen(open){
    var sheet = $('pg52-mobile-session-sheet');
    if (!sheet) return;
    var next = Boolean(open);
    if (next && $('pg52-mobile-session-body')) $('pg52-mobile-session-body').innerHTML = mobileSessionBodyHtml();
    sheet.hidden = !next;
    document.body.classList.toggle('pg52-mobile-session-open', next);
    if (next) sheet.querySelector('[data-pg52-mobile-session-close]')?.focus();
  }

  function copyMobilePrompt(kind, trigger){
    var kit;
    try { kit = buildKit(); } catch (_) { kit = null; }
    var text = kind === 'negative'
      ? (kit?.negative || window._lastGenerated?.negPrompt || $('out-neg')?.textContent || '')
      : (kit?.mainPrompt || window._lastGenerated?.prompt || $('out-main')?.textContent || '');
    if (typeof copyText === 'function') copyText(text, trigger);
  }

  function initMobileGeneratorShell(shell){
    if (!shell || window.__pg52MobileShellBound) return;
    window.__pg52MobileShellBound = true;
    syncMobileCostLabels();
    shell.addEventListener('click', function(event){
      var nav = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-nav-toggle]');
      if (nav) {
        event.preventDefault();
        setMobileNavOpen(!document.body.classList.contains('pg52-mobile-nav-open'));
        return;
      }
      var navClose = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-nav-close]');
      if (navClose) {
        event.preventDefault();
        setMobileNavOpen(false);
        return;
      }
      var route = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-route-toggle]');
      if (route) {
        event.preventDefault();
        setMobileRouteOpen(!document.body.classList.contains('pg52-mobile-route-open'));
        return;
      }
      var promptOpen = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-prompt-open]');
      if (promptOpen) {
        event.preventDefault();
        setMobilePromptSheetOpen(true);
        return;
      }
      var promptClose = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-prompt-close]');
      if (promptClose) {
        event.preventDefault();
        setMobilePromptSheetOpen(false);
        return;
      }
      var sessionClose = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-session-close]');
      if (sessionClose) {
        event.preventDefault();
        setMobileSessionSheetOpen(false);
        return;
      }
      var copy = event.target && event.target.closest && event.target.closest('[data-pg52-mobile-copy]');
      if (copy) {
        event.preventDefault();
        copyMobilePrompt(copy.getAttribute('data-pg52-mobile-copy'), copy);
      }
    });
    document.addEventListener('keydown', function(event){
      if (event.key !== 'Escape') return;
      setMobileNavOpen(false);
      setMobilePromptSheetOpen(false);
      setMobileRouteOpen(false);
      setMobileSessionSheetOpen(false);
      closeLocationPicker();
    });
    document.addEventListener('click', function(event){
      var status = event.target && event.target.closest && event.target.closest('.status-bar');
      if (!status || !document.getElementById('page-generator')?.classList.contains('active')) return;
      if (!window.matchMedia || !window.matchMedia('(max-width: 767px)').matches) return;
      event.preventDefault();
      setMobileSessionSheetOpen(true);
    });
  }

  function applyGeneratorState(patch, options){
    options = options || {};
    patch = patch || {};
    if (options.silentDirty !== true && Object.keys(patch).length) markGeneratorDirty(options.source || 'generator-state');
    var modelId = patch.modelId || patch.id || '';
    var locationPatched = Boolean(patch.locationId);
    var previousChar = $('g-char')?.value || '';
    var nextCharForMotion = patch.characterId ? charKey(patch.characterId) : previousChar;
    var characterChanged = Boolean(patch.characterId && nextCharForMotion && nextCharForMotion !== previousChar);
    if (modelId === 'prunaai/p-image-edit') modelId = 'fal/qwen-image-2-edit';
    if (patch.shotMode) {
      state.generatorV5.shotMode = normalizeShotMode(patch.shotMode);
      syncShotModeGlobal();
      syncShotModeSelector();
      syncLocationOptionsForShotMode();
      syncActionOptionsForShotMode();
      syncLightingOptionsForShotMode(patch.lighting);
      syncSocialFinishTreatment();
      syncAuthenticityControls();
    }
    if (patch.characterId && $('g-char')) {
      var nextChar = charKey(patch.characterId);
      if (Array.prototype.slice.call($('g-char').options || []).some(function(option){ return option.value === nextChar; })) {
        $('g-char').value = nextChar;
        if ($('g-character')) $('g-character').value = nextChar;
        state.generatorV5.outfitId = '';
        state.generatorV5.activeWardrobeRefs = [];
      }
    }
    if (patch.spendLane && $('g-spend-lane')) $('g-spend-lane').value = patch.spendLane;
    if (modelId && $('g-image-model')) {
      $('g-image-model').value = modelId;
      if ($('g-spend-lane') && options.keepSpendLane !== true && !patch.spendLane) $('g-spend-lane').value = spendLaneForModel(modelId);
      if ($('g-route-intent')) $('g-route-intent').value = intentForModel(modelId);
      if ($('g-route-quality')) $('g-route-quality').value = qualityForModel(modelId);
    } else if (patch.spendLane) {
      applySpendLaneRouteDefaults(patch.spendLane);
    }
    if (patch.intent && $('g-route-intent')) $('g-route-intent').value = patch.intent;
    if (patch.quality && $('g-route-quality')) $('g-route-quality').value = patch.quality;
    if ((patch.platformId || patch.platform) && $('g-platform')) {
      var nextPlatform = patch.platformId || patch.platform;
      if (!Array.prototype.slice.call($('g-platform').options || []).some(function(option){ return option.value === nextPlatform; })) {
        $('g-platform').appendChild(new Option(nextPlatform, nextPlatform));
      }
      $('g-platform').value = nextPlatform;
      syncPlatformIntelligence({ refresh: false });
    }
    if (patch.aspectRatio && $('g-image-aspect')) $('g-image-aspect').value = patch.aspectRatio;
    if (patch.campaignId && $('g-campaign')) {
      if (!Array.prototype.slice.call($('g-campaign').options || []).some(function(option){ return option.value === patch.campaignId; })) {
        $('g-campaign').appendChild(new Option(patch.campaignName || patch.campaignId, patch.campaignId));
      }
      $('g-campaign').value = patch.campaignId;
    }
    if (patch.locationId && $('g-location')) {
      if (isCustomLocationId(patch.locationId)) ensureCustomLocationOption(patch.location || patch.locationName || patch.locationId.replace(/^custom_location_/, '').replace(/_/g, ' '), patch.locationId);
      else ensureKnownLocationOption(patch.locationId);
      $('g-location').value = patch.locationId;
      syncLightingOptionsForShotMode(patch.lighting);
    }
    if (patch.lighting && $('g-time')) {
      var nextLighting = normalizeLightingId(patch.lighting);
      syncLightingOptionsForShotMode(nextLighting);
      $('g-time').value = nextLighting;
      state.generatorV5.time = nextLighting;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'socialFinishTreatment') && patch.socialFinishTreatment) {
      state.generatorV5.socialFinishTreatment = socialFinishTreatmentById(patch.socialFinishTreatment).id;
      syncSocialFinishTreatment();
    }
    if (patch.authenticity && typeof patch.authenticity === 'object') {
      state.generatorV5.authenticity = Object.assign({}, state.generatorV5.authenticity || {}, patch.authenticity);
      syncAuthenticityControls();
    }
    if (patch.moodId && $('g-mood')) $('g-mood').value = patch.moodId;
    if (patch.outfitId) {
      state.generatorV5.outfitId = patch.outfitId;
      if ($('g-outfit')) $('g-outfit').value = patch.outfitId;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'outfitOverride')) {
      state.generatorV5.outfitOverride = String(patch.outfitOverride || '');
      if ($('g-outfit-override') && $('g-outfit-override').value !== state.generatorV5.outfitOverride) $('g-outfit-override').value = state.generatorV5.outfitOverride;
    }
    if (patch.shotOverrides && typeof patch.shotOverrides === 'object') {
      var overrides = shotOverridesState();
      Object.keys(patch.shotOverrides).forEach(function(key){
        if (!SHOT_OVERRIDE_CONFIG[key]) return;
        overrides[key] = String(patch.shotOverrides[key] || '').slice(0, SHOT_OVERRIDE_CONFIG[key].max || 200);
        if (key === 'action') state.generatorV5.actionOverride = overrides[key];
        var input = $(SHOT_OVERRIDE_CONFIG[key].inputId);
        if (input && input.value !== overrides[key]) input.value = overrides[key];
      });
      syncShotOverrideUi();
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'sceneOverride')) {
      state.generatorV5.sceneOverride = String(patch.sceneOverride || '').slice(0, 500);
      if ($('g-scene-override') && $('g-scene-override').value !== state.generatorV5.sceneOverride) $('g-scene-override').value = state.generatorV5.sceneOverride;
      var sceneCounter = $('pg52-scene-override-counter');
      if (sceneCounter) sceneCounter.textContent = state.generatorV5.sceneOverride.length + '/500';
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'actionOverride')) {
      state.generatorV5.actionOverride = String(patch.actionOverride || '').slice(0, 200);
      shotOverridesState().action = state.generatorV5.actionOverride;
      if ($('g-action-override') && $('g-action-override').value !== state.generatorV5.actionOverride) $('g-action-override').value = state.generatorV5.actionOverride;
      syncShotOverrideUi('action');
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'actionSuggestion')) {
      state.generatorV5.actionSuggestion = patch.actionSuggestion || null;
    }
    ['shotAction','cameraDistance','lens','movement','props'].forEach(function(key){
      if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
      state.generatorV5[key] = patch[key];
      var id = {
        shotAction: 'g-shot-action',
        cameraDistance: 'g-camera-distance',
        lens: 'g-lens',
        movement: 'g-movement',
        props: 'g-props'
      }[key];
      if (key === 'shotAction') ensureActionOption(patch[key], actionCategoryFor(patch[key]) ? 'Curated' : 'Current');
      if ($(id) && $(id).value !== patch[key]) $(id).value = patch[key];
    });
    if (Object.prototype.hasOwnProperty.call(patch, 'cameraStyle') && $('g-camera')) $('g-camera').value = patch.cameraStyle || $('g-camera').value;
    if (patch.variationSeed) state.generatorV5.variationSeed = patch.variationSeed;
    if (Object.prototype.hasOwnProperty.call(patch, 'targetShotCount')) {
      directorBriefState().targetShotCount = patch.targetShotCount || null;
    }
    if (patch.directorBrief && typeof patch.directorBrief === 'object') {
      state.generatorV5.directorBrief = Object.assign({}, directorBriefState(), {
        result: patch.directorBrief,
        error: '',
        loading: false,
        unspecified: patch.directorBrief.unspecified || [],
        targetShotCount: patch.directorBrief.targetShotCount || patch.targetShotCount || null
      });
    }
    if (patch.saMoment && typeof patch.saMoment === 'object') {
      state.generatorV5.saMoment = Object.assign({}, saMomentState(), patch.saMoment);
    }
    if (patch.quickConfig && typeof patch.quickConfig === 'object') {
      state.generatorV5.quickConfig = Object.assign({}, quickConfigState(), patch.quickConfig);
    }
    if (patch.smartRandomize && typeof patch.smartRandomize === 'object') {
      var smart = smartRandomizeState();
      smart.seed = String(patch.smartRandomize.seed || patch.variationSeed || smart.seed || '');
      smart.mode = patch.smartRandomize.mode || smart.mode || 'safe';
      smart.axisLocks = Object.assign({}, smart.axisLocks || {}, patch.smartRandomize.locks || {});
    }
    if (patch.locks && typeof patch.locks === 'object') {
      state.generatorV5.locks = Object.assign({}, state.generatorV5.locks, patch.locks);
    }
    if (patch.selectedRefs && typeof patch.selectedRefs === 'object') {
      state.generatorV5.selectedRefs = Object.assign({}, patch.selectedRefs);
    }
    if (Array.isArray(patch.activeWardrobeRefs)) {
      state.generatorV5.activeWardrobeRefs = patch.activeWardrobeRefs.slice(0, 8);
    }
    if (Array.isArray(patch.sceneRefs)) {
      state.generatorV5.sceneRefs = patch.sceneRefs.slice(0, 2);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'locationIntelText')) {
      state.generatorV5.locationIntelText = String(patch.locationIntelText || '');
      if ($('pg52-location-intel-text') && $('pg52-location-intel-text').value !== state.generatorV5.locationIntelText) {
        $('pg52-location-intel-text').value = state.generatorV5.locationIntelText;
      }
    }
    [['g-lock-outfit','outfit'],['g-lock-scene','scene'],['g-lock-camera','camera'],['g-lock-mood','mood'],['g-lock-location','location'],['g-lock-lighting','lighting'],['g-lock-action','action'],['g-lock-props','props']].forEach(function(pair){
      var lockEl = $(pair[0]);
      if (!lockEl) return;
      var isLocked = Boolean(state.generatorV5.locks[pair[1]]);
      if ('checked' in lockEl) lockEl.checked = isLocked;
      lockEl.classList?.toggle('locked', isLocked);
      if (lockEl.setAttribute) lockEl.setAttribute('aria-pressed', isLocked ? 'true' : 'false');
    });
    syncCharacterAlias();
    updateSpendNote();
    renderIdentitySummary();
    if (characterChanged) markCharacterSwitch();
    renderReferenceDock();
    populateOutfitSelect(false);
    renderWardrobeCards();
    renderWardrobeLibrary();
    applyContextIntelligence();
    syncShotModeSelector();
    syncSocialFinishTreatment();
    syncAuthenticityControls();
    renderPlatformCompositionPreview();
    syncLocationPickerFromSelect();
    renderContextIntelligence();
    renderShotHistoryPanel();
    renderShotSummary();
    renderConceptCards();
    syncChipLabels($('prompt-generator-52-shell') || document);
    syncActionEngine();
    syncShotOverrideUi();
    syncSaMomentStrip();
    syncQuickConfigBanner();
    syncCinematicMode();
    syncSmartRandomizeUi();
    if (locationPatched) dispatchLocationChanged();
    state.routePreview = null;
    state.routePreviewKey = '';
    renderRoutePreview(null);
    renderIdentityLockCard();
    updateModelBoardSelection();
    updateEmptyPanelRoute();
    renderPromptPreview();
    renderGeneratorAiActions();
    renderDirectorBriefResult();
    syncBudgetGuardUi();
    [
      patch.locationId ? 'g-location' : '',
      patch.lighting ? 'g-time' : '',
      patch.moodId ? 'g-mood' : '',
      patch.shotAction ? 'g-shot-action' : '',
      patch.cameraDistance ? 'g-camera-distance' : '',
      patch.lens ? 'g-lens' : '',
      patch.movement ? 'g-movement' : '',
      patch.props ? 'g-props' : '',
      patch.cameraStyle ? 'g-camera' : '',
      patch.platformId || patch.platform ? 'g-platform' : '',
      patch.aspectRatio ? 'g-image-aspect' : '',
      patch.sceneOverride ? 'g-scene-override' : ''
    ].filter(Boolean).forEach(function(id){ pulseControl($(id)); });
    if (options.schedule !== false) schedulePreviewImageRouteFromGenerator();
  }

  function applyRouteState(id, options){
    applyGeneratorState({ modelId: id }, options || {});
  }

  function selectImageModelRoute(id, skipPreview){
    applyRouteState(id, { schedule: !skipPreview, source: 'model-card' });
  }

  function useRouterSelectedModel(){
    var routed = currentRoutePreview()?.selectedModel;
    if (routed && routed.id) selectImageModelRoute(routed.id);
  }

  function updateModelBoardSelection(){
    var board = $('g-model-intelligence');
    if (!board) return;
    var selectedId = getCurrentImageModel();
    var recommendedId = recommendedModelForCurrentShot().model?.id || currentRoutePreview()?.selectedModel?.id || selectedId;
    board.querySelectorAll('.pg3-model-card').forEach(function(card){
      var id = card.getAttribute('data-model-id');
      card.classList.toggle('selected', id === selectedId);
      card.classList.toggle('recommended', id === recommendedId);
      var badges = card.querySelector('.pg52-model-card-badges');
      if (badges) badges.innerHTML = modelRecommendationBadge(modelById(id), recommendedId, selectedId);
    });
    var rec = board.querySelector('[data-model-recommendation-label]');
    var recommendedModel = modelById(recommendedId);
    if (rec && recommendedModel) rec.textContent = 'Model recommended: ' + (recommendedModel.displayName || recommendedModel.id);
  }

  function updateModelBoardReadiness(){
    var board = $('g-model-intelligence');
    if (!board) return;
    state.models.forEach(function(model){
      var pill = board.querySelector('[data-model-readiness="' + model.id + '"]');
      if (pill) {
        pill.className = 'pg3-readiness-pill ' + readinessClass(model);
        pill.textContent = readinessLabel(model);
      }
      var source = board.querySelector('[data-model-source="' + model.id + '"]');
      if (source) {
        var readiness = readinessForModel(model);
        source.textContent = (readiness.configured ? 'ready' : readinessLabel(model)) + ' · ' + (readiness.source || 'missing');
      }
    });
    var selected = activeRoutedModel();
    if (selected) renderGeneratorAiActions();
  }

  function modelRailGroup(label, models, selectedId, recommendedId, ctx){
    if (!models.length) return '';
    return [
      '<section class="pg3-model-group" aria-label="' + esc(label) + '">',
        '<div class="pg3-model-group-title">' + esc(label) + '</div>',
        '<div class="pg52-model-comparison-grid" role="list" aria-label="' + esc(label) + ' model routes">',
          models.map(function(model){ return modelCardHtml(model, selectedId, recommendedId, true, ctx); }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function renderModelIntelligence(force){
    var board = $('g-model-intelligence');
    if (!board) return;
    try { window.SilvaPerf && window.SilvaPerf.inc('generator.modelBoard.renderAttempt'); } catch (_) {}
    var selectedId = getCurrentImageModel();
    var recommendationContext = modelRecommendationContext();
    var recommendation = recommendedModelForCurrentShot(recommendationContext);
    var recommendedId = recommendation.model?.id || currentRoutePreview()?.selectedModel?.id || selectedId;
    var key = state.models.map(function(model){ return [model.id, readinessLabel(model), zarCost(model), providerChip(model)].join(':'); }).join('|') + '|' + (state.registryLoaded ? 'live' : 'fallback');
    if (!force && state.modelBoardKey === key && board.children.length) {
      updateModelBoardSelection();
      return;
    }
    var previousScroll = state.modelStripScrollLeft || board.querySelector('.pg3-model-strip')?.scrollLeft || 0;
    state.modelBoardKey = key;
    state.modelBoardRenderCount += 1;
    try { window.SilvaPerf && window.SilvaPerf.inc('generator.modelBoard.rebuild'); } catch (_) {}
    var googleModels = state.models.filter(function(model){ return model.providerAdapter === 'google'; });
    var fullAiModels = state.models.filter(function(model){ return model.providerAdapter !== 'google'; });
    board.innerHTML = [
      '<div class="pg38-drawer-meta pg52-model-compare-head">',
        '<span class="pg3-chip">' + state.models.length + ' routes</span>',
        '<span class="pg3-chip">' + (state.registryLoaded ? 'live registry' : 'local fallback') + '</span>',
        '<span class="pg52-model-badge pg52-model-badge--recommended" data-model-recommendation-label>Model recommended: ' + esc(recommendation.model?.displayName || recommendation.model?.id || 'none') + '</span>',
      '</div>',
      '<div class="pg3-mini pg3-model-hint">Compare all routes by ID lock, skin texture, background realism, creative range, cost, and readiness. Pick one card; every section updates through the same state path.</div>',
      modelRailGroup('Google Credits', googleModels, selectedId, recommendedId, recommendationContext),
      modelRailGroup('fal.ai Final AI', fullAiModels, selectedId, recommendedId, recommendationContext)
    ].join('');
    state.modelStripScrollLeft = previousScroll;
    bindModelCards(board);
    updateModelBoardSelection();
  }

  function schedulePreviewImageRouteFromGenerator(delay){
    clearTimeout(state.previewTimer);
    state.previewTimer = setTimeout(function(){ previewImageRouteFromGenerator(); }, typeof delay === 'number' ? delay : 180);
  }

  async function previewImageRouteFromGenerator(options){
    options = options || {};
    if (!options.force && !generatorPageIsActive()) return state.routePreview;
    if (options.force) clearTimeout(state.previewTimer);
    ensureControls();
    if (options.force && options.refreshStatus !== false) {
      await Promise.race([
        loadProviderStatus({ force: true, reason: 'route-preview-refresh', timeoutMs: 500 }).catch(function(){ return null; }),
        new Promise(function(resolve){ setTimeout(resolve, 650); })
      ]);
      populateModelSelect();
      updateModelBoardReadiness();
    }
    var ctx = routeContext();
    var key = routePreviewKey(ctx);
    if (!options.force && state.routePreview && state.routePreviewKey === key) {
      renderRoutePreview(state.routePreview);
      updateModelBoardSelection();
      updateEmptyPanelRoute();
      return state.routePreview;
    }
    var seq = ++state.previewSeq;
    try { window.SilvaPerf && window.SilvaPerf.inc('generator.routePreview.request'); } catch (_) {}
    if (state.previewAbort) {
      try { state.previewAbort.abort(); } catch (_) {}
    }
    var controller = new AbortController();
    state.previewAbort = controller;
    state.routePreviewLoading = true;
    state.routePreviewError = '';
    startAsyncOperation('routePreview', { background: true, model: ctx.modelId || '' });
    renderRoutePreview(null);
    updateModelBoardSelection();
    updateEmptyPanelRoute();
    try {
      var result = await fetchJsonWithTimeout('/api/image-models/route-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        controller: controller,
        body: JSON.stringify({
          intent: ctx.intent,
          referenceCount: ctx.referenceCount,
          requiresEditing: ctx.requiresEditing,
          requiresTextRendering: ctx.requiresTextRendering,
          quality: ctx.quality,
          budgetTier: ctx.budgetTier,
          preferredModel: ctx.modelId,
          spendLane: ctx.spendLane,
          realismMode: 'photo_identity_lock',
          referenceMode: ctx.referenceCount > 0 ? 'direct_reference_edit' : 'text_to_image',
          outputFormatMode: 'raw_photo',
          identityMode: ctx.referenceCount > 0 ? 'exact_character' : 'written_identity',
          strictNoFrame: true
        })
      }, 6500);
      var res = result.res;
      var data = result.data;
      if (!res.ok || !data || !data.selectedModel) throw new Error(data?.message || data?.error || 'route preview failed');
      if (seq !== state.previewSeq) return null;
      if (state.previewAbort === controller) state.previewAbort = null;
      state.routePreview = data;
      state.routePreviewKey = key;
      state.routePreviewError = '';
      state.routePreviewLoading = false;
      mergeRouteReadiness(data);
      populateModelSelect();
      renderRoutePreview(data);
      updateModelBoardReadiness();
      updateModelBoardSelection();
      updateEmptyPanelRoute();
      renderGeneratorAiActions();
      succeedAsyncOperation('routePreview', { selectedModel: data.selectedModel });
      return data;
    } catch (err) {
      if (seq !== state.previewSeq) return null;
      if (state.previewAbort === controller) state.previewAbort = null;
      state.routePreviewLoading = false;
      state.routePreviewError = err?.name === 'AbortError'
        ? 'Route preview timed out. The generator kept your current route and did not rebuild the model board.'
        : 'Route preview unavailable. The generator is using local registry metadata until the backend responds.';
      renderRoutePreview(null, state.routePreviewError);
      updateModelBoardSelection();
      updateEmptyPanelRoute();
      renderGeneratorAiActions();
      failAsyncOperation('routePreview', err, { background: true });
      throttledAsyncWarning('routePreview', state.routePreviewError);
      return null;
    }
  }

  function locationInfo(id){
    var intel = resolveLocationRegistry(id);
    if (intel) {
      var legacy = (window.JHB_LOCATIONS || []).find(function(item){ return item.id === id; }) || {};
      return Object.assign({}, legacy, intel, {
        prompt: legacy.prompt || intel.prompt || (intel.promptModifiers || []).join(', ') || intel.name,
        mood: legacy.mood || (intel.mood?.natural || []).join(', ') || 'local texture',
        timeOfDay: legacy.timeOfDay || (intel.light?.bestTimes || []).join(', ') || 'flexible'
      });
    }
    return { id: id, name: optionText('g-location') || id || 'Johannesburg', prompt: 'grounded Johannesburg setting', mood: 'local texture', timeOfDay: 'flexible' };
  }

  function captionFor(char, platform, fallback){
    var caps = (window.CAPTIONS_DB || []).filter(function(cap){
      return cap.char === char && (cap.platform === platform || cap.platform === 'instagram' || cap.platform === 'linkedin');
    });
    return caps[0]?.text || fallback;
  }

  function linkedinFor(char, bucket, fallback){
    var cap = (window.CAPTIONS_DB || []).find(function(item){ return item.char === char && item.platform === 'linkedin'; });
    return cap?.liHook || cap?.text || fallback || (char + ' on ' + String(bucket || 'content').replace(/_/g, ' '));
  }

  function brollFor(char){
    return ((window.BROLL_DATA || [])
      .filter(function(item){ return (item.chars || []).includes(char); })
      .slice(0, 3)
      .map(function(item){ return item.title; })
      .join(' | ')) || 'hands, texture, environment detail';
  }

  function promptScore(parts, warnings){
    var checks = [
      ['Identity Lock', parts.identityFields >= 4],
      ['Scene Specificity', Boolean(parts.locationPrompt && parts.locationPrompt.length > 18)],
      ['Camera/Lighting', Boolean(parts.camera && parts.time)],
      ['Local Texture', Boolean(parts.saTexture)],
      ['Reference Strategy', parts.refs === 0 || parts.modelSupportsRefs],
      ['Negative Prompt', Boolean(parts.negative && parts.negative.length > 80)],
      ['Platform Fit', Boolean(parts.aspect)],
      ['Model Fit', !warnings.length]
    ];
    var passed = checks.filter(function(item){ return item[1]; }).length;
    return {
      total: Math.round((passed / checks.length) * 100),
      checks: checks
    };
  }

  function buildKit(){
    var char = $('g-char')?.value || 'leah';
    var platform = $('g-platform')?.value || 'instagram';
    var bucket = $('g-bucket')?.value || 'lifestyle';
    var location = $('g-location')?.value || 'cafe_braam';
    var mood = $('g-mood')?.value || 'sharp';
    var time = normalizeLightingId($('g-time')?.value || state.generatorV5.time || 'golden_am');
    var postType = $('g-posttype')?.value || 'portrait';
    var mode = $('g-mode')?.value || 'work';
    var camera = $('g-camera')?.value || 'editorial';
    var realism = $('g-realism')?.value || 'hyper';
    var preset = $('g-template')?.value || 'portrait';
    var campaign = $('g-campaign')?.value || '';
    var shotMode = currentShotMode();
    var c = getCharSafe(char);
    var id = c.identity || {};
    var loc = locationInfo(location);
    var shootProfile = characterShootProfile(char);
    var locationModifiers = normalizeList(loc.promptModifiers);
    var socialLocation = isSocialMediaLocation(loc);
    var shotModeVoice = getShotModeVoice(shotMode);
    var activeShotModePromptVoice = shotMode === 'editorial' && socialLocation ? socialShotModePromptVoice(shotMode) : shotModeVoice.promptPrefix;
    var shotModeNegative = normalizeList(shotModeVoice.negativeAdditions || []);
    var socialNegative = socialLocation ? socialLocationNegativeModifiers() : [];
    var saMoment = activeSaMomentPack();
    var saMomentNegative = normalizeList(saMomentNegativeAdditions());
    var saRegionLine = SA_VISUAL_INTELLIGENCE.lightQuality.promptModifier;
    var route = routeContext();
    var model = activeRoutedModel();
    route.selectedModel = model;
    route.modelId = model.id;
    var refCount = route.referenceCount;
    var currentMode = (window.STATE && STATE.currentModes && STATE.currentModes[char]) || mode;
    var campaignObj = (window.CAMPAIGNS || []).find(function(item){ return item.id === campaign; }) || null;
    var jobType = route.intent || 'final_character';
    var wardrobePack = selectedWardrobePack();
    var scenePack = scenePackFromControls();
    var quickConfig = scenePack.quickConfig || activeQuickConfigPack();
    var authenticityPack = scenePack.authenticityPack || authenticityPackFromControls(shotMode);
    var authenticityNegative = authenticityNegativeAdditions(authenticityPack);
    scenePack.shotMode = shotMode;
    scenePack.shotModeLabel = shotModeMeta(shotMode).label;
    scenePack.shotModePromptVoice = activeShotModePromptVoice;
    scenePack.socialMediaLocation = socialLocation;
    scenePack.locationVibe = loc.vibe || '';
    scenePack.authenticityPack = authenticityPack;
    scenePack.captionEnergyGuide = shotMode === 'editorial' ? null : (scenePack.captionEnergyGuide || captionEnergyGuide(scenePack));
    var platformIntel = platformIntelligencePayload(scenePack.platformIntelligence || platformIntelligenceById(platform));
    scenePack.platformIntelligence = platformIntel;
    var cinematicPack = scenePack.cinematicPack || cinematicPackFromControls();
    var aestheticTransfer = scenePack.aestheticTransfer || aestheticTransferPack();
    var locationReferenceText = String(scenePack.locationReferenceText || state.generatorV5.locationIntelText || '').trim();
    var activeRefs = activeReferencePack();
    var wardrobeImageRefs = compileWardrobeRefs();
    var referencePack = selectedReferencePackSummary();
    var homePack = homeSystemPack(char);

    var cameraDesc = {
      editorial: 'editorial magazine realism with clean composition',
      documentary: 'documentary street realism with slight grain',
      cinematic: 'cinematic environmental portrait with controlled depth',
      portrait_lens: '85mm portrait realism with natural falloff',
      phone_real: 'phone-camera realism with social texture'
    }[camera] || 'editorial social realism';
    var timeDesc = scenePack.lightingPromptPhrase || lightingPromptPhrase(time) || optionText('g-time') || 'natural light';
    var moodDesc = {
      sharp: 'sharp, alert, locked-in expression',
      composed: 'composed premium control',
      candid: 'mid-moment candid realism',
      pensive: 'thoughtful, slightly off-camera',
      confident: 'direct assured gaze',
      in_motion: 'purposeful mid-movement',
      soft: 'relaxed, open, still premium'
    }[mood] || optionText('g-mood') || 'natural expression';
    var realismDesc = {
      hyper: 'visible pores, believable shadows, realistic undertones, subtle asymmetry',
      phone: 'phone-camera softness, slight compression, real feed energy',
      editorial: 'premium finish, clean polish, visual tension',
      standard: 'clean realism, premium but neutral'
    }[realism] || 'clean realism';
    var presetDesc = {
      portrait: 'hero portrait with exact identity lock',
      mixed: 'mixed portrait and B-roll post kit',
      people: 'people ops and internal standards angle',
      city: 'city-to-desk movement and atmosphere',
      campaign: 'campaign hero with stronger cover logic'
    }[preset] || 'hero portrait';
    var aspect = getCurrentImageAspectRatio();
    var platformPromptModifiers = normalizeList(platformIntel.promptModifiers || []);
    var platformNegative = normalizeList(platformIntel.negativeModifiers || []);
    platformIntel.selectedAspectRatio = scenePack.platformCrop || aspect;
    var platformCompositionLine = platformIntel.label
      ? 'Platform composition: ' + platformIntel.label + ' (' + (platformIntel.selectedAspectRatio || platformIntel.aspectRatio || aspect) + '). ' + [platformIntel.focalPointGuidance, platformIntel.compositionStyle, platformPromptModifiers.join(', ')].filter(Boolean).join(' ')
      : '';
    var socialRealismLine = socialSourceRealismGuidance(scenePack, platformIntel, shootProfile);
    var roleLine = char === 'grok' ? 'South African Afrikaans man' : 'South African woman';
    var identityFields = [id.age, id.skin, id.hair, id.eyes].filter(Boolean);
    var identityLock = [
      (id.age ? id.age + '-year-old' : ''),
      roleLine,
      id.skin,
      id.hair,
      id.eyes,
      id.build,
      id.wardrobe
    ].filter(Boolean).join(', ');
    var neverChange = Array.isArray(id.neverChange) ? id.neverChange.join(' | ') : '';
    var saTexture = checked('g-sa-texture', true)
      ? 'South African realism: grounded Johannesburg texture, believable skin undertones, real city light, subtle heat sheen, no global-generic stock energy. ' + SA_VISUAL_INTELLIGENCE.skinToneIntelligence.defaultModifiers.join(', ') + '.'
      : '';
    var characterProfileLine = normalizeList(shootProfile.alwaysInclude).length
      ? 'Character shoot profile: ' + shootProfile.defaultPosture + '. ' + shootProfile.alwaysInclude.join(', ') + '.'
      : '';
    var locationIntelLine = locationModifiers.length
      ? 'Location intelligence: ' + locationModifiers.join(', ') + '. ' + (loc.saContext || '') + '.'
      : '';
    var cinematicLine = cinematicPromptLine(cinematicPack);
    var cinematicScenePrefix = cinematicPack.enabled && cinematicPack.narrative ? ('Narrative frame: ' + cinematicPack.narrative + '. ') : '';
    var cinematicTreatmentLine = cinematicPack.enabled && cinematicPack.treatmentTerms && cinematicPack.treatmentTerms.length
      ? ' Visual treatment: ' + cinematicPack.treatmentTerms.join(', ') + '.'
      : '';
    var aestheticPromptModifiers = aestheticTransfer.enabled ? normalizeList(aestheticTransfer.promptModifiers || []) : [];
    var aestheticNegative = aestheticTransfer.enabled ? normalizeList(aestheticTransfer.negativeModifiers || []) : aestheticNegativeModifiers();
    var aestheticPromptLine = aestheticPromptModifiers.length
      ? 'Aesthetic transfer: ' + aestheticPromptModifiers.join(', ') + '.'
      : '';
    var socialFinishNegative = socialFinishTreatmentNegativeAdditions(shotMode);
    var referenceInstruction = refCount
      ? 'Use the attached identity pack as the highest authority. Primary face and body refs override all written text.'
      : 'No references are attached. Use the written identity and scene contract only.';
    var outputUse = {
      final_character: 'final character photograph',
      broll_final: 'final b-roll photograph',
      object_product_final: 'final object/product photograph',
      no_reference_scene: 'final no-reference scene photograph'
    }[jobType] || 'final photograph';
    var promptContract = {
      contract: 'PROMPT_CONTRACT_V5_2',
      jobType: jobType,
      outputFormat: 'raw_source_camera_photo_only',
      shotMode: {
        id: shotMode,
        label: shotModeMeta(shotMode).label,
        promptVoice: activeShotModePromptVoice,
        promptPrefix: shotModeVoice.promptPrefix,
        structure: shotModeVoice.structure
      },
      socialRealismGuidance: socialRealismLine,
      subject: jobType === 'final_character' ? (c.name || char) : outputUse,
      identityRefs: refCount ? activeRefs.map(function(ref){ return ref.label; }) : 'none',
      selectedRefs: activeRefs.map(function(ref){
        var weight = referenceWeightFor(ref);
        return { role: ref.role || ref.type, label: ref.label, source: ref.source, priority: ref.priority, weight: weight / 100, influenceHint: influenceHintForWeight(weight) };
      }),
      homeSystemPack: {
        usageRule: homePack.usageRule,
        selectedRooms: activeRefs.filter(function(ref){ return /^home_/i.test(ref.role || ''); }).map(function(ref){ return ref.role; }),
        selectedItems: activeRefs.filter(function(ref){ return /^item_/i.test(ref.role || ''); }).map(function(ref){ return ref.role; })
      },
      scene: {
        shotMode: shotMode,
        location: loc.prompt || loc.name,
        locationReferenceText: locationReferenceText,
        action: scenePack.action,
        movement: scenePack.movement,
        props: scenePack.props,
        lightingId: scenePack.lightingId,
        lightingLabel: scenePack.lightingLabel || scenePack.lighting,
        lightingPromptPhrase: scenePack.lightingPromptPhrase || timeDesc,
        lightingRegistryEntry: scenePack.lightingRegistryEntry || null,
        socialFinishTreatment: scenePack.socialFinishTreatment || null,
        authenticityPack: authenticityPack,
        captionEnergyGuide: scenePack.captionEnergyGuide || null,
        quickConfig: quickConfig || null,
        overrides: scenePack.overrides || {},
        sceneOverride: scenePack.sceneOverride || ''
      },
      camera: {
        style: cameraDesc,
        distance: scenePack.cameraDistance,
        lens: scenePack.lens
      },
      platformIntelligence: platformIntel,
      lighting: scenePack.lightingPromptPhrase || scenePack.lighting || timeDesc,
      lightingRegistryEntry: scenePack.lightingRegistryEntry || null,
      mood: scenePack.mood || moodDesc,
      realism: realismDesc + (saTexture ? '; ' + saTexture : ''),
      wardrobe: wardrobePack,
      locationIntelligence: {
        id: loc.id || location,
        name: loc.name || scenePack.location || '',
        category: loc.category || '',
        region: loc.region || '',
        custom: Boolean(loc.custom),
        environment: loc.environment || '',
        subType: loc.subType || loc.type || '',
        lightQuality: loc.lightQuality || '',
        depthCharacter: loc.depthCharacter || '',
        moodNatural: loc.moodNatural || [],
        bestTimes: loc.light?.bestTimes || [],
        avoidTimes: loc.light?.avoid || [],
        suggestedDistance: loc.depth?.suggestedDistance || [],
        promptModifiers: locationModifiers,
        modeAffinity: loc.modeAffinity || [],
        vibe: loc.vibe || '',
        socialMediaLocation: socialLocation,
        saContext: loc.saContext || '',
        editableLocationReferenceText: locationReferenceText
      },
      characterShootProfile: {
        id: shootProfile.id,
        energy: shootProfile.energy,
        defaultPosture: shootProfile.defaultPosture,
        alwaysInclude: shootProfile.alwaysInclude || [],
        neverInclude: shootProfile.neverInclude || [],
        lightingAffinity: shootProfile.lightingAffinity || {}
      },
      wardrobeImageRefs: wardrobeImageRefs.map(function(ref){
        var weight = referenceWeightFor(ref);
        return { role: ref.role, label: ref.label, source: ref.source, itemId: ref.itemId, priority: ref.priority, weight: weight / 100, influenceHint: influenceHintForWeight(weight) };
      }),
      mustPreserve: [
        refCount ? 'the actual reference face and body, not a similar replacement' : 'the written character identity',
        'face shape',
        'age read',
        'skin tone',
        'hair',
        'eyewear or jewelry when present',
        'body/build/posture',
        'natural asymmetry and real skin texture'
      ],
      mustNotRender: [
        'social media frame',
        'Instagram UI',
        'username',
        'caption text',
        'white border',
        'post template',
        'phone screenshot',
        'poster',
        'watermark',
        'cartoon',
        'illustration',
        'avatar',
        'beauty-filter drift',
        'generic AI face'
      ].concat(aestheticNegative, platformNegative, socialNegative, shotModeNegative, saMomentNegative, socialFinishNegative, authenticityNegative),
      authenticityPack: authenticityPack,
      captionEnergyGuide: scenePack.captionEnergyGuide || null,
      aestheticTransfer: aestheticTransfer.enabled ? {
        source: aestheticTransfer.source,
        fileName: aestheticTransfer.fileName,
        aesthetic: aestheticTransfer.aesthetic,
        promptModifiers: aestheticPromptModifiers,
        negativeModifiers: aestheticNegative
      } : null,
      aspectRatio: aspect
    };
    if (cinematicPack.enabled) {
      promptContract.cinematicReference = cinematicPack;
      promptContract.scene.cinematicReference = {
        aesthetic: cinematicPack.aestheticLabel,
        narrative: cinematicPack.narrative,
        treatments: cinematicPack.treatmentLabels,
        promptModifiers: cinematicPack.promptModifiers
      };
    }
    var recipe = {
      version: 'prompt-contract-v5.2',
      jobType: jobType,
      characterId: char,
      characterName: c.name || char,
      identityMode: refCount > 0 ? 'exact_character' : 'written_identity',
      spendLane: route.spendLane,
      selectedModel: model.id,
      referencePack: referencePack,
      homeSystemPack: homePack,
      wardrobePack: wardrobePack,
      wardrobeImageRefs: wardrobeImageRefs,
      activeWardrobeIds: activeWardrobeIds(),
      wardrobeTextOverride: wardrobePack.override || '',
      scenePack: scenePack,
      shotMode: shotMode,
      shotModePromptVoice: activeShotModePromptVoice,
      shotModeCompilerVoice: shotModeVoice,
      lockedFields: Object.assign({}, state.generatorV5.locks),
      variationSeed: state.generatorV5.variationSeed || 0,
      smartRandomize: state.generatorV5.smartRandomize ? {
        seed: state.generatorV5.smartRandomize.seed || String(state.generatorV5.variationSeed || ''),
        mode: state.generatorV5.smartRandomize.mode || 'safe',
        locks: Object.assign({}, state.generatorV5.smartRandomize.axisLocks || {}),
        dna: ''
      } : null,
      outputFormat: 'raw_photo',
      locationIntelligence: promptContract.locationIntelligence,
      platformIntelligence: platformIntel,
      locationReferenceText: locationReferenceText,
      characterShootProfile: promptContract.characterShootProfile,
      compatibility: wardrobeLocationCompatibility(),
      shotDna: '',
      promptQuality: null,
      socialRealismGuidance: socialRealismLine,
      socialFinishTreatment: scenePack.socialFinishTreatment || null,
      authenticityPack: authenticityPack,
      captionEnergyGuide: scenePack.captionEnergyGuide || null,
      quickConfig: quickConfig || null,
      promptContract: promptContract
    };
    if (quickConfig) {
      promptContract.quickConfig = quickConfig;
      promptContract.scene.quickConfig = quickConfig;
    }
    if (saMoment) {
      promptContract.saMoment = saMoment;
      promptContract.scene.saMoment = saMoment;
      recipe.saMoment = saMoment;
    }
    if (scenePack.socialFinishTreatment) promptContract.socialFinishTreatment = scenePack.socialFinishTreatment;
    if (authenticityPack) promptContract.authenticityPack = authenticityPack;
    if (cinematicPack.enabled) recipe.cinematicPack = cinematicPack;
    if (aestheticTransfer.enabled) recipe.aestheticTransfer = promptContract.aestheticTransfer;
    recipe.shotDna = encodeShotDna(recipe);
    if (recipe.smartRandomize) recipe.smartRandomize.dna = recipe.shotDna;
    var referenceInfluenceLine = referenceInfluencePromptLine(activeRefs.concat(wardrobeImageRefs));
    var mainPrompt = compileShotModePromptSegments({
      voice: shotModeVoice,
      shotMode: shotMode,
      activeShotModePromptVoice: activeShotModePromptVoice,
      char: char,
      characterName: c.name || char,
      jobType: jobType,
      outputUse: outputUse,
      identityLock: identityLock,
      neverChange: neverChange,
      refCount: refCount,
      referenceInfluenceLine: referenceInfluenceLine,
      socialRealismLine: socialRealismLine,
      wardrobeImageRefs: wardrobeImageRefs,
      characterProfileLine: characterProfileLine,
      loc: loc,
      locationModifiers: locationModifiers,
      locationIntelLine: locationIntelLine,
      locationReferenceText: locationReferenceText,
      cinematicScenePrefix: cinematicScenePrefix,
      cinematicLine: cinematicLine,
      cinematicTreatmentLine: cinematicTreatmentLine,
      aestheticPromptLine: aestheticPromptLine,
      scenePack: scenePack,
      presetDesc: presetDesc,
      postTypeText: optionText('g-posttype'),
      cameraDesc: cameraDesc,
      platformCompositionLine: platformCompositionLine,
      timeDesc: timeDesc,
      moodDesc: moodDesc,
      realismDesc: realismDesc,
      saTexture: saTexture,
      saRegionLine: saRegionLine,
      wardrobePack: wardrobePack,
      aspect: aspect
    }).join('\n');
    var negative = [
      Array.isArray(id.neverGenerate) ? id.neverGenerate.join(', ') : '',
      normalizeList(shootProfile.neverInclude).join(', '),
      aestheticNegative.join(', '),
      platformNegative.join(', '),
      socialNegative.join(', '),
      shotModeNegative.join(', '),
      saMomentNegative.join(', '),
      socialFinishNegative.join(', '),
      authenticityNegative.join(', '),
      SA_VISUAL_INTELLIGENCE.skinToneIntelligence.avoidAlways.join(', '),
      'cartoon, cartoonish, anime, illustration, avatar, 3d render, cgi, plastic skin texture, wax skin, beauty filter, generic face, wrong face, wrong age appearance, wrong skin tone, wrong hair, inconsistent face, generic stock photo feel, fake luxury, over-smoothed pores, AI artifact look, lazy symmetry, extra fingers, warped hands, social media frame, Instagram UI, username, caption text, white border, post template, mockup, poster, graphic design, watermark, text in image, phone screenshot, UI chrome, unreadable text, off-brand styling'
    ].filter(Boolean).join(', ');
    var caption = captionFor(char, platform, (c.name || char) + ' in ' + (loc.name || 'Johannesburg') + '.');
    var storyOverlay = mode === 'personal' ? 'off duty. still exact.' : mode === 'hybrid' ? 'between city and system.' : 'this still has to hold.';
    var liHook = linkedinFor(char, bucket, (c.name || char) + ' on ' + bucket);
    var broll = brollFor(char);
    var warnings = modelWarnings(model, route);
    var score = promptScore({
      identityFields: identityFields.length,
      locationPrompt: loc.prompt || loc.name,
      camera: cameraDesc,
      time: timeDesc,
      saTexture: saTexture,
      refs: refCount,
      modelSupportsRefs: Boolean(model.supportsImageToImage),
      negative: negative,
      aspect: aspect
    }, warnings);
    var engineQuality = scorePromptQuality(recipe, model);
    recipe.promptQuality = engineQuality;
    promptContract.promptQuality = engineQuality;
    promptContract.compatibility = recipe.compatibility;
    promptContract.shotDna = recipe.shotDna;

    return {
      char: char,
      platform: platform,
      bucket: bucket,
      location: location,
      mood: mood,
      time: time,
      camera: camera,
      shotMode: shotMode,
      campaign: campaign,
      campaignObj: campaignObj,
      loc: loc,
      character: c,
      identity: id,
      currentMode: currentMode,
      model: model,
      route: route,
      refCount: refCount,
      identityLock: identityLock,
      neverChange: neverChange,
      referenceInstruction: referenceInstruction,
      promptContract: promptContract,
      prompt: mainPrompt,
      mainPrompt: mainPrompt,
      negative: negative,
      caption: caption,
      storyOverlay: storyOverlay,
      liHook: liHook,
      broll: broll,
      score: score,
      engineQuality: engineQuality,
      warnings: warnings,
      generatorRecipe: recipe,
      referencePack: referencePack,
      homeSystemPack: homePack,
      wardrobePack: wardrobePack,
      wardrobeImageRefs: wardrobeImageRefs,
      scenePack: scenePack,
      anatomy: [
        ['Core Prompt', mainPrompt],
        ['Prompt Contract', JSON.stringify(promptContract, null, 2)],
        ['Identity Lock', identityLock + (neverChange ? '\nNever change: ' + neverChange : '')],
        ['Scene / Location', (loc.name || location) + '\n' + (loc.prompt || '')],
        ['Composition', presetDesc + ' / ' + optionText('g-posttype') + ' / ' + aspect],
        ['Camera / Lighting', cameraDesc + '\n' + timeDesc],
        ['Texture / Realism', realismDesc + (saTexture ? '\n' + saTexture : '')],
        ['Reference Strategy', referenceInstruction + ' Refs attached: ' + refCount + '.'],
        ['Negative Prompt', negative],
        ['Caption', caption],
        ['Story Overlay', storyOverlay],
        ['LinkedIn Hook', liHook],
        ['B-roll Pairing', broll]
      ]
    };
  }

  function referencePackPlaceholders(kit){
    if (!checked('g-attach-refs', true) || !kit.refCount) return [];
    var refs = activeReferencePack();
    if (refs.length) return refs;
    return [
      {
        type: 'primary_face',
        role: 'primary_face',
        label: 'PRIMARY FACE TILE / IDENTITY AUTHORITY',
        priority: 1,
        source: 'vault_or_canonical_face_tile',
        referenceKind: 'primary_face_tile',
        dataUrl: 'vault:face',
        weight: 0.95,
        influenceWeight: 95,
        influenceHint: influenceHintForWeight(95)
      },
      {
        type: 'primary_body',
        role: 'primary_body',
        label: 'PRIMARY BODY TILE / BUILD AUTHORITY',
        priority: 2,
        source: 'vault_or_canonical_body_tile',
        referenceKind: 'primary_body_tile',
        dataUrl: 'vault:body',
        weight: 0.75,
        influenceWeight: 75,
        influenceHint: influenceHintForWeight(75)
      }
    ].slice(0, kit.refCount || 0);
  }

  function routerPayload(kit){
    return {
      prompt: kit.mainPrompt,
      negativePrompt: kit.negative,
      referenceImages: referencePackPlaceholders(kit),
      identityPack: {
        version: 'identity-pack-v5.2',
        references: referencePackPlaceholders(kit)
      },
      generatorRecipe: kit.generatorRecipe,
      wardrobePack: kit.wardrobePack,
      wardrobeImageRefs: kit.wardrobeImageRefs || compileWardrobeRefs(),
      wardrobeTextOverride: kit.wardrobePack?.override || '',
      activeWardrobeIds: activeWardrobeIds(),
      scenePack: kit.scenePack,
      selectedReferencePack: kit.referencePack,
      homeSystemPack: kit.homeSystemPack,
      variationSeed: kit.generatorRecipe?.variationSeed || state.generatorV5.variationSeed || 0,
      lockedFields: kit.generatorRecipe?.lockedFields || state.generatorV5.locks,
      jobType: kit.route.intent,
      promptContractVersion: 'prompt-contract-v5.2',
      intent: kit.route.intent,
      quality: kit.route.quality,
      spendLane: kit.route.spendLane,
      preferredModel: kit.model.id,
      requiresEditing: kit.route.requiresEditing,
      requiresTextRendering: kit.route.requiresTextRendering,
      aspectRatio: getCurrentImageAspectRatio(),
      realismMode: 'photo_identity_lock',
      referenceMode: kit.refCount > 0 ? 'direct_reference_edit' : 'text_to_image',
      outputFormatMode: 'raw_photo',
      identityMode: kit.refCount > 0 ? 'exact_character' : 'written_identity',
      referencePackVersion: 'identity-pack-v5.2',
      strictNoFrame: true,
      candidateCount: 1,
      metadata: Object.assign({
        source: 'prompt-generator-v5.2',
        character: kit.char,
        shotMode: kit.shotMode || kit.generatorRecipe?.shotMode || currentShotMode(),
        campaign: kit.campaign || null,
        platform: kit.platform,
        bucket: kit.bucket,
        promptScore: kit.score.total,
        promptQuality: kit.generatorRecipe?.promptQuality || kit.engineQuality || null,
        shotDna: kit.generatorRecipe?.shotDna || '',
        smartRandomize: kit.generatorRecipe?.smartRandomize || null,
        compatibility: kit.generatorRecipe?.compatibility || null,
        locationIntelligence: kit.generatorRecipe?.locationIntelligence || null,
        platformIntelligence: kit.generatorRecipe?.platformIntelligence || kit.scenePack?.platformIntelligence || null,
        quickConfig: kit.generatorRecipe?.quickConfig || kit.scenePack?.quickConfig || null,
        saMoment: kit.generatorRecipe?.saMoment || kit.scenePack?.saMoment || null,
        socialFinishTreatment: kit.generatorRecipe?.socialFinishTreatment || kit.scenePack?.socialFinishTreatment || null,
        authenticityPack: kit.generatorRecipe?.authenticityPack || kit.scenePack?.authenticityPack || null,
        captionEnergyGuide: kit.generatorRecipe?.captionEnergyGuide || kit.scenePack?.captionEnergyGuide || null,
        generatorRecipe: kit.generatorRecipe,
        selectedReferencePack: kit.referencePack,
        homeSystemPack: kit.homeSystemPack,
        wardrobePack: kit.wardrobePack,
        wardrobeImageRefs: kit.wardrobeImageRefs || compileWardrobeRefs(),
        activeWardrobeIds: activeWardrobeIds(),
        scenePack: kit.scenePack,
        aestheticTransfer: kit.generatorRecipe?.aestheticTransfer || null
      }, kit.generatorRecipe?.cinematicPack ? { cinematicPack: kit.generatorRecipe.cinematicPack } : {})
    };
  }

  function variantCards(kit){
    var googleModel = kit.refCount ? modelById('google/nano-banana-pro') : modelById('google/imagen-3-text-only');
    var editModel = kit.refCount > 1 ? modelById('openai/gpt-image-2') : modelById('bytedance/seedream-5-lite');
    var finalModel = kit.route.quality === 'ultra' ? modelById('black-forest-labs/flux-2-max') : modelById('black-forest-labs/flux-2-pro');
    var variants = [
      ['Google Final Route', googleModel, 'Use this as the primary Google-credit final output route.', kit.mainPrompt],
      ['Reference / Edit Route', editModel, 'Use this when identity preservation or semantic edit reasoning matters.', kit.referenceInstruction + ' ' + kit.mainPrompt],
      ['Premium Final Route', finalModel, 'Use this for the final production-quality render.', kit.mainPrompt + ' Push lighting, finish, realism, and composition to final-campaign quality.']
    ];
    return '<div class="pg3-variant-grid">' + variants.map(function(item){
      return [
        '<div class="pg3-variant-card">',
          '<div class="pg3-output-label">' + esc(item[0]) + '</div>',
          '<div class="pg3-model-name">' + esc(item[1].displayName) + '</div>',
          '<div class="pg3-model-meta">' + esc(providerChip(item[1])) + ' / ' + esc(zarCost(item[1])) + '</div>',
          '<div class="pg3-mini">' + esc(item[2]) + '</div>',
          '<details class="pg3-inline-collapse"><summary>Read full variant prompt</summary><div class="pg3-output-text" style="margin-top:8px">' + esc(item[3]) + '</div></details>',
          '<button class="copy-btn" onclick="copyText(this.previousElementSibling.querySelector(\'.pg3-output-text\').textContent,this)">Copy variant</button>',
        '</div>'
      ].join('');
    }).join('') + '</div>';
  }

  function scoreHtml(score){
    return [
      '<div class="pg3-score-wrap">',
        '<div class="pg3-score" style="--score:' + esc(score.total) + '"><span>' + esc(score.total) + '</span></div>',
        '<div><div class="pg3-kicker">Prompt quality score</div><div class="pg3-route-title">' + (score.total >= 88 ? 'Production ready' : score.total >= 72 ? 'Good, check warnings' : 'Needs tightening') + '</div><div class="pg3-mini">Identity, scene, references, platform, and selected model are checked before generation.</div></div>',
      '</div>',
      '<div class="pg3-score-grid">',
        score.checks.map(function(item){
          return '<div class="pg3-score-item ' + (item[1] ? 'ok' : 'warn') + '"><div class="pg3-output-label">' + esc(item[0]) + '</div><div class="pg3-mini">' + (item[1] ? 'ready' : 'needs attention') + '</div></div>';
        }).join(''),
      '</div>'
    ].join('');
  }

  function collapseBlock(label, content, open, className){
    return [
      '<details class="pg3-collapse ' + esc(className || '') + '"' + (open ? ' open' : '') + '>',
        '<summary><span>' + esc(label) + '</span><span class="pg3-collapse-hint">expand</span></summary>',
        '<div class="pg3-collapse-body">' + content + '</div>',
      '</details>'
    ].join('');
  }

  function generationButtonAttrs(model){
    var readiness = readinessForModel(model || activeRoutedModel());
    if (readiness.configured) return '';
    return ' disabled aria-disabled="true" title="Add the server-side ' + esc(providerChip(model || activeRoutedModel())) + ' key before generating images."';
  }

  function identityFidelityPanel(kit){
    var refs = activeReferencePack();
    if (!refs.length) {
      try {
        refs = typeof window.getCharacterVaultRefs === 'function' ? window.getCharacterVaultRefs(kit.char) : [];
      } catch (_) {
        refs = [];
      }
    }
    var refCards = refs.slice(0, 5).map(function(ref, index){
      var label = ref.label || (index === 0 ? 'PRIMARY FACE TILE / IDENTITY AUTHORITY' : index === 1 ? 'PRIMARY BODY TILE / BUILD AUTHORITY' : ('REFERENCE ' + (index + 1)));
      return [
        '<div class="pg3-ref-card">',
          (ref.preview || ref.dataUrl || ref.url) ? '<img src="' + esc(ref.preview || ref.dataUrl || ref.url) + '" alt="' + esc(label) + '">' : '<div class="pg3-ref-empty">No preview</div>',
          '<div class="pg3-ref-meta"><strong>' + esc(label) + '</strong><span>' + esc(ref.type || 'reference') + ' · ' + esc(ref.source || 'vault') + '</span></div>',
        '</div>'
      ].join('');
    }).join('');
    var exactSafe = refs.some(function(ref){ return ref.type === 'face' || /face/i.test(String(ref.label || '')); });
    return [
      '<section class="pg3-identity-panel" aria-label="Identity Fidelity">',
        '<div class="pg3-card-head">',
          '<div><div class="pg3-kicker">Identity Fidelity</div><div class="pg3-route-title">' + (exactSafe ? 'Exact-character refs are loaded' : 'Face reference missing') + '</div></div>',
          '<span class="pg3-readiness-pill ' + (exactSafe ? 'ready' : 'missing') + '">' + (exactSafe ? 'exact_character' : 'needs face ref') + '</span>',
        '</div>',
        '<div class="pg3-soft-note">These labeled references are what the backend sends to the model. Social captions and overlays stay metadata only; the pixels must be a raw photo.</div>',
        '<div class="pg3-ref-strip">' + (refCards || '<div class="pg3-warning">No identity references found. Upload face/body refs in Assets Vault before judging identity fidelity.</div>') + '</div>',
      '</section>'
    ].join('');
  }

  function actionBarHtml(kit, built){
    var model = kit?.model || activeRoutedModel();
    var readiness = readinessForModel(model);
    var shellOwned = Boolean($('prompt-generator-52-shell') || $('prompt-generator-51-shell'));
    var addKey = !readiness.configured ? '<button class="btn btn-ghost btn-sm" onclick="focusProviderSetup(\'' + esc(model.providerAdapter || '') + '\')">Add credential</button>' : '';
    var statusText = built
      ? 'Prompt contract built. Generate the final image when ready.'
      : ('Ready: ' + model.displayName + ' · ' + spendLaneShort(getCurrentImageSpendLane()) + ' · ' + readinessLabel(model) + '.');
    if ($('prompt-generator-52-shell')) {
      return [
        '<div class="pg52-status-region" id="gen-ai-tools" role="region" aria-label="Generator status">',
          '<div class="pg52-status-line" id="ai-helper-output">' + esc(statusText) + '</div>',
        '</div>'
      ].join('');
    }
    return [
      '<div class="pg40-action-stack" id="gen-ai-tools" role="region" aria-label="Final image actions">',
        '<div class="pg40-action-row">',
          '<button class="btn btn-ghost btn-sm" onclick="generateFullKit()">Build Prompt Kit</button>',
          '<button class="btn btn-ghost btn-sm" onclick="copyText(document.getElementById(\'out-main\')?.textContent || window._lastGenerated?.prompt || \'\',this)">Copy Prompt</button>',
          shellOwned ? '' : '<button class="btn btn-primary btn-sm pg40-primary-generate" onclick="generateImageFromGenerator(this)"' + generationButtonAttrs(model) + '>Generate Final Image</button>',
          '<button class="btn btn-ghost btn-sm" onclick="generateImageAndSaveFromGenerator(this)"' + generationButtonAttrs(model) + '>Generate + Save</button>',
          addKey,
        '</div>',
        '<div class="output-text pg40-status-panel" id="ai-helper-output">' + esc(statusText) + '</div>',
      '</div>',
    ].join('');
  }

  function promptPreviewHtml(kit, built){
    var warnings = kit.warnings.length ? '<div class="pg3-warning">' + esc(kit.warnings.join(' ')) + '</div>' : '';
    var anatomyHtml = '<div class="pg3-anatomy-grid">' + kit.anatomy.map(function(item){
      return '<div class="pg3-anatomy-card"><div class="pg3-output-label">' + esc(item[0]) + '</div><div class="pg3-output-text">' + esc(item[1]) + '</div></div>';
    }).join('') + '</div>';
    var socialHtml = [
      '<div class="output-block"><div class="output-label">Caption</div><div class="output-text" id="out-cap">' + esc(kit.caption) + '</div><button class="copy-btn" onclick="copyText(this.previousElementSibling.textContent,this)">Copy caption</button></div>',
      '<div class="output-block"><div class="output-label">Story Overlay</div><div class="output-text" id="out-story">' + esc(kit.storyOverlay) + '</div></div>',
      '<div class="output-block"><div class="output-label">LinkedIn Hook</div><div class="output-text">' + esc(kit.liHook) + '</div></div>',
      '<div class="output-block"><div class="output-label">B-roll Pairing</div><div class="output-text">' + esc(kit.broll) + '</div></div>'
    ].join('');
    return [
      '<div class="pg40-preview-head">',
        '<div>',
          '<div class="pg3-kicker">Prompt Generator V3</div>',
          '<h3>' + esc(kit.character.name || kit.char) + ' / ' + esc(kit.loc.name || kit.location) + '</h3>',
        '</div>',
        '<span class="pg3-cost-pill">' + costDisplayHtml(zarCost(kit.model)) + '</span>',
      '</div>',
      '<div class="pg3-chip-row pg40-preview-chips">',
        '<span class="pg3-chip">' + esc(kit.platform) + '</span>',
        '<span class="pg3-chip">' + esc(kit.bucket) + '</span>',
        '<span class="pg3-chip">' + esc(providerChip(kit.model)) + '</span>',
        '<span class="pg3-chip">' + esc(kit.model.displayName) + '</span>',
      '<span class="pg3-chip">refs ' + esc(kit.refCount) + '</span>',
        '<span class="pg3-chip">home refs ' + esc((kit.referencePack?.roles || []).filter(function(role){ return /^home_/i.test(role); }).length) + '</span>',
      '</div>',
      livePromptPreviewHtml(kit),
      warnings,
      $('prompt-generator-52-shell') ? [
        '<details class="pg52-final-text-details">',
          '<summary><span>Final text prompt</span><span>expand</span></summary>',
          '<div class="pg52-raw-prompt-grid">',
            '<div class="pg52-raw-prompt-block"><span>Final image prompt</span><div id="out-main">' + esc(kit.mainPrompt) + '</div></div>',
            '<div class="pg52-raw-prompt-block pg52-raw-prompt-block--negative"><span>Negative prompt</span><div id="out-neg">' + esc(kit.negative) + '</div></div>',
          '</div>',
        '</details>'
      ].join('') : actionBarHtml(kit, built),
      $('prompt-generator-52-shell') ? '' : [
      collapseBlock('Final Prompt + Negative Prompt', '<div class="pg40-prompt-text"><div class="output-block"><div class="output-label">Final Image Prompt</div><div class="output-text highlight" id="out-main">' + esc(kit.mainPrompt) + '</div></div><div class="output-block"><div class="output-label">Negative Prompt</div><div class="output-text" id="out-neg">' + esc(kit.negative) + '</div></div></div>', Boolean(built), 'pg40-prompt-contract'),
      '<details class="pg3-collapse pg40-collapse"><summary><span>Identity proofing</span><span class="pg3-collapse-hint">expand</span></summary><div class="pg3-collapse-body">' + identityFidelityPanel(kit) + '</div></details>',
      collapseBlock('Prompt Quality Breakdown', promptQualityHtml(kit.engineQuality || kit.generatorRecipe?.promptQuality) + scoreHtml(kit.score), false, 'pg3-quality-collapse'),
      collapseBlock('Prompt Anatomy', anatomyHtml, false, 'pg3-anatomy-collapse'),
      collapseBlock('Prompt Variants', variantCards(kit), false, 'pg3-variants-collapse'),
      collapseBlock('Router Payload Preview', '<div class="pg3-router-payload" id="g-api-payload">' + esc(JSON.stringify(routerPayload(kit), null, 2)) + '</div><button class="copy-btn" onclick="copyText(document.getElementById(\'g-api-payload\').textContent,this)">Copy router payload</button>', false, 'pg3-payload-collapse'),
      collapseBlock('Caption / Social Kit', socialHtml, false, 'pg3-social-collapse'),
      ].join(''),
    ].join('');
  }

  function renderPromptPreview(kit, options){
    var panel = outputStage();
    if (!panel) return;
    options = options || {};
    markPromptCompiling(panel);
    try {
      kit = kit || buildKit();
      panel.innerHTML = promptPreviewHtml(kit, Boolean(options.built));
    } catch (err) {
      panel.innerHTML = '<div class="pg3-warning">Prompt preview could not render yet. Check the brief controls and try again.</div>';
    }
  }

  function renderKit(kit){
    var panel = outputStage();
    if (!panel) return;
    renderPromptPreview(kit, { built: true });
  }

  function renderGeneratorAiActions(){
    if (activeShell()) {
      var status = $('ai-helper-output');
      if (status && status.querySelector && status.querySelector('.pg3-image-result, .pg39-result-shell, .pg39-final-review, .pg40-result-shell, .pg40-final-review')) return;
      var slot40 = $('gen-ai-tools');
      if (!slot40) return;
      try {
        var kit38 = buildKit();
        document.querySelectorAll('#ai-helper-output').forEach(function(node){
          if (node !== status && !node.closest('#gen-ai-tools')) node.remove();
        });
        slot40.outerHTML = actionBarHtml(kit38, Boolean(window._lastGenerated));
      } catch (_) {}
      return;
    }
    var slot = $('gen-ai-tools');
    var panel = outputStage();
    if (!slot && panel) {
      panel.insertAdjacentHTML('beforeend', '<div id="gen-ai-tools"></div>');
      slot = $('gen-ai-tools');
    }
    if (!slot) return;
    if (window._lastGenerated) {
      slot.innerHTML = '';
      return;
    }
    var selected = activeRoutedModel();
    var readiness = readinessForModel(selected);
    var addKey = !readiness.configured ? '<button class="btn btn-ghost btn-sm" onclick="focusProviderSetup(\'' + esc(selected.providerAdapter || '') + '\')">Add credential</button>' : '';
    slot.innerHTML = [
      '<div class="pg3-action-bar" role="region" aria-labelledby="gen-ai-tools-title">',
        '<div class="output-label" id="gen-ai-tools-title">One action bar</div>',
        '<div class="pg3-ai-row">',
          '<button class="btn btn-ghost btn-sm" onclick="generateFullKit()">Build Prompt Kit</button>',
          '<button class="btn btn-ghost btn-sm" disabled aria-disabled="true" title="Build the prompt kit first">Copy Prompt</button>',
          '<button class="btn btn-primary btn-sm" onclick="generateImageFromGenerator(this)"' + generationButtonAttrs(selected) + '>Generate Final Image</button>',
          '<button class="btn btn-ghost btn-sm" onclick="generateImageAndSaveFromGenerator(this)"' + generationButtonAttrs(selected) + '>Generate + Save</button>',
          addKey,
        '</div>',
        '<div class="output-text" id="ai-helper-output" style="min-height:38px;margin-top:8px">Route: ' + esc(selected.displayName) + ' · ' + esc(spendLaneLabel(getCurrentImageSpendLane())) + ' · ' + esc(readinessLabel(selected)) + '. Images still go through /api/image-generation/generate.</div>',
      '</div>'
    ].join('');
  }

  function emptyRouteHtml(model){
    var readiness = readinessForModel(model);
    var checkedAt = readiness.lastCheckedAt || state.providerStatusLastCheckedAt || state.providerStatus?.lastCheckedAt || 'not checked yet';
    return [
      '<div class="pg3-chip-row" id="pg3-empty-route-chips">',
        '<span class="pg3-chip">' + esc(providerChip(model)) + '</span>',
        '<span class="pg3-chip">' + esc(spendLaneShort(getCurrentImageSpendLane())) + '</span>',
        '<span class="pg3-readiness-pill ' + esc(readinessClass(model)) + '">' + esc(readinessLabel(model)) + '</span>',
        '<span class="pg3-cost-pill">' + esc(zarCost(model)) + '</span>',
        '<span class="pg3-chip">' + esc(model.displayName) + '</span>',
      '</div>',
      '<div class="pg3-next-step" id="pg3-empty-next-step">' + esc(readiness.configured ? 'Provider route is configured. Next: Generate Final Image, or open the prompt kit only if you want to inspect it first.' : (readinessLabel(model) === 'refreshing status' ? 'Refreshing the server vault status for ' + providerChip(model) + '.' : 'Missing setup: add the server-side key for ' + providerChip(model) + ' before generating an image.')) + '<br><span class="pg3-mini">Last checked ' + esc(checkedAt) + '</span></div>'
    ].join('');
  }

  function updateEmptyPanelRoute(){
    var routeWrap = $('pg3-empty-route-wrap');
    if (!routeWrap) {
      renderModelSummary(activeRoutedModel(), currentRoutePreview());
      return;
    }
    routeWrap.innerHTML = emptyRouteHtml(activeRoutedModel());
  }

  function renderEmptyPanel(){
    var panel = outputStage();
    if (!panel) return;
    if (activeShell()) {
      renderPromptPreview();
      return;
    }
    if (window._lastGenerated) return;
    var selected = activeRoutedModel();
    panel.innerHTML = [
      '<div class="pg3-empty">',
        '<div class="pg3-kicker">Final photo stage</div>',
        '<div class="pg3-empty-title">Ready for one-click raw photo generation.</div>',
        '<div class="pg3-output-text" style="margin-top:10px">Brief, identity refs, spend lane, model, and readiness are set above. Generate the raw final photograph directly; prompt anatomy stays optional.</div>',
        '<div id="pg3-empty-route-wrap">' + emptyRouteHtml(selected) + '</div>',
        '<div id="gen-ai-tools"></div>',
      '</div>'
    ].join('');
    renderGeneratorAiActions();
  }

  function generateFullKit(){
    ensureControls();
    var kit = buildKit();
    renderKit(kit);
    renderIdentityLockCard();
    window._lastGenerated = {
      id: 'gen_' + Date.now(),
      v3: true,
      char: kit.char,
      platform: kit.platform,
      bucket: kit.bucket,
      title: (kit.character.name || kit.char) + ' - ' + (kit.loc.name || kit.location) + ' (' + kit.bucket + ')',
      prompt: kit.mainPrompt,
      negPrompt: kit.negative,
      caption: kit.caption,
      liHook: kit.liHook,
      story: kit.storyOverlay,
      location: kit.location,
      mood: kit.mood,
      time: kit.time,
      camera: kit.camera,
      modelId: kit.model.id,
      selectedModelId: kit.model.id,
      provider: kit.model.providerAdapter,
      providerModel: kit.model.model || kit.model.id,
      promptScore: kit.score.total,
      routerPayload: routerPayload(kit),
      generatorRecipe: kit.generatorRecipe,
      selectedReferencePack: kit.referencePack,
      homeSystemPack: kit.homeSystemPack,
      wardrobePack: kit.wardrobePack,
      scenePack: kit.scenePack,
      wardrobeImageRefs: kit.wardrobeImageRefs,
      variationSeed: kit.generatorRecipe?.variationSeed || 0,
      lockedFields: kit.generatorRecipe?.lockedFields || {},
      campaign: kit.campaign || '',
      campaignId: kit.campaign || '',
      tags: [kit.bucket, kit.platform, kit.char, kit.model.id],
      saved: false,
      faved: false,
      tested: false,
      gold: false,
      drift: null,
      notes: '',
      lineageSource: 'prompt_generator_v5_2',
      createdAt: new Date().toISOString()
    };
    renderGeneratorAiActions();
    schedulePreviewImageRouteFromGenerator(80);
    if (window.STATE) {
      STATE.analytics = STATE.analytics || {};
      STATE.analytics.promptRuns = (STATE.analytics.promptRuns || 0) + 1;
      STATE.analytics.providerRuns = STATE.analytics.providerRuns || {};
      STATE.analytics.providerRuns[kit.model.id] = (STATE.analytics.providerRuns[kit.model.id] || 0) + 1;
      STATE.analytics.providerLast = kit.model.id;
      if (typeof window.saveState === 'function') window.saveState();
    }
    if (typeof window.updateObsessionLayer === 'function') window.updateObsessionLayer();
  }

  function openPromptAccordion(){
    var acc = $('pg52-acc-prompt');
    if (!acc) return;
    var head = acc.querySelector('.pg52-accordion-head');
    var body = acc.querySelector('.pg52-accordion-body');
    if (head) head.setAttribute('aria-expanded', 'true');
    if (body) body.hidden = false;
  }

  function generatePromptFromGenerator(btn){
    var original = btn ? btn.textContent : '';
    try {
      generateFullKit();
      openPromptAccordion();
      var status = $('ai-helper-output');
      if (status) status.textContent = 'Prompt generated. No image credits spent.';
      if (btn) {
        btn.textContent = 'Prompt Ready';
        restartTransientClass(btn, 'is-complete', {
          after: function(){ btn.textContent = original || 'Generate Prompt'; }
        });
      }
    } catch (err) {
      var helper = $('ai-helper-output');
      if (helper) helper.textContent = 'Prompt generation failed.';
      console.error(err);
    }
  }

  function getGeneratorContext(){
    return {
      char: $('g-char')?.value || window._lastGenerated?.char || 'leah',
      platform: $('g-platform')?.value || window._lastGenerated?.platform || '',
      bucket: $('g-bucket')?.value || window._lastGenerated?.bucket || '',
      campaign: $('g-campaign')?.value || window._lastGenerated?.campaign || '',
      setting: optionText('g-location') || window._lastGenerated?.location || '',
      location: $('g-location')?.value || window._lastGenerated?.location || '',
      mood: $('g-mood')?.value || window._lastGenerated?.mood || '',
      time: $('g-time')?.value || window._lastGenerated?.time || '',
      frames: optionText('g-posttype') || '',
      camera: $('g-camera')?.value || window._lastGenerated?.camera || '',
      wardrobe: getCharSafe($('g-char')?.value || window._lastGenerated?.char || 'leah').identity?.wardrobe || '',
      mainPrompt: $('out-main')?.textContent?.trim() || window._lastGenerated?.prompt || '',
      currentCaption: $('out-cap')?.textContent?.trim() || window._lastGenerated?.caption || '',
      currentStory: $('out-story')?.textContent?.trim() || window._lastGenerated?.story || ''
    };
  }

  function selectedImageRouteLabel(modelId){
    return routeLabel(modelById(modelId || getCurrentImageModel()));
  }

  window.PromptGeneratorV3 = {
    loadModels: loadModels,
    loadProviderStatus: loadProviderStatus,
    preview: previewImageRouteFromGenerator,
    schedulePreview: schedulePreviewImageRouteFromGenerator,
    buildKit: buildKit,
    routerPayload: routerPayload,
    compileWardrobeRefs: compileWardrobeRefs,
    activeWardrobeItems: activeWardrobeItems,
    locationRegistry: function(){ return Object.assign({}, LOCATION_REGISTRY); },
    characterShootProfile: characterShootProfile,
    generateConceptBlast: generateConceptBlast,
    conceptBlastLocationPool: conceptBlastLocationPool,
    conceptBlastCardHtml: conceptBlastCardHtml,
    applyConceptBlastCard: applyConceptBlastCard,
    generateContextConcepts: generateContextConcepts,
    generateSmartRandomizePatch: generateSmartRandomizePatch,
    applySmartRandomize: applySmartRandomize,
    smartRandomizeBack: smartRandomizeBack,
    smartRandomizeSnapshot: smartRandomizeSnapshot,
    restoreSmartRandomizeSnapshot: restoreSmartRandomizeSnapshot,
    smartRandomizeDna: smartRandomizeDna,
    seededRandom: seededRandom,
    scorePromptQuality: scorePromptQuality,
    normalizeIdentityScore100: normalizeIdentityScore100,
    socialSourceRealismGuidance: socialSourceRealismGuidance,
    strictIdentityLockEnabled: strictIdentityLockEnabled,
    identityRiskAssessment: identityRiskAssessment,
    identityPayloadOrderSafe: identityPayloadOrderSafe,
    renderIdentityLockCard: renderIdentityLockCard,
    encodeShotDna: encodeShotDna,
    decodeShotDna: decodeShotDna,
    dnaLoadHtml: dnaLoadHtml,
    loadShotFromDna: loadShotFromDna,
    resolveDnaPatch: resolveDnaPatch,
    closeAllGeneratorDropdowns: closeAllGeneratorDropdowns,
    createGenerationJobSnapshot: createGenerationJobSnapshot,
    generationBudgetPreflight: generationBudgetPreflight,
    recordGenerationBudgetSpend: recordGenerationBudgetSpend,
    budgetState: budgetState,
    openBudgetLimitPrompt: openBudgetLimitPrompt,
    optimizeImageFile: optimizeImageFile,
    enqueueWardrobeUploads: enqueueWardrobeUploads,
    scheduleCharacterSelection: scheduleCharacterSelection,
    backendShotHistoryKey: backendShotHistoryKey,
    loadShotHistory: loadShotHistory,
    fetchShotHistory: fetchShotHistory,
    recordShotHistory: saveShotHistoryRecord,
    updateShotHistoryStatus: updateShotHistoryStatus,
    restoreShotHistoryRecord: restoreShotHistoryRecord,
    prepareShotVariation: prepareShotVariation,
    platformIntelligenceById: platformIntelligenceById,
    currentPlatformIntelligence: currentPlatformIntelligence,
    platformCompositionPreviewHtml: platformCompositionPreviewHtml,
    renderPlatformCompositionPreview: renderPlatformCompositionPreview,
    syncPlatformIntelligence: syncPlatformIntelligence,
    currentShotMode: currentShotMode,
    shotModeSelectorHtml: shotModeSelectorHtml,
    initShotModeSelector: initShotModeSelector,
    shotModeSectionCopy: shotModeSectionCopy,
    shotModeLocationPool: function(mode){ return shotModeLocationEntries(mode).slice(); },
    shotModeActionCategories: shotModeActionCategories,
    shotModePromptVoice: shotModePromptVoice,
    shotModeQualityWeights: shotModeQualityWeights,
    quickConfigs: function(){ return QUICK_CONFIGS.slice(); },
    quickConfigPickerHtml: quickConfigPickerHtml,
    openQuickConfigs: openQuickConfigs,
    closeQuickConfigs: closeQuickConfigs,
    filterQuickConfigs: filterQuickConfigs,
    applyQuickConfig: applyQuickConfig,
    syncQuickConfigBanner: syncQuickConfigBanner,
    saMoments: function(){ return SA_CULTURAL_MOMENTS.slice(); },
    saMomentStripHtml: saMomentStripHtml,
    applySaMoment: applySaMoment,
    saMomentNegativeAdditions: saMomentNegativeAdditions,
    lightingRegistry: lightingOptionRegistry,
    lightingOptionById: lightingOptionById,
    lightingPromptPhrase: lightingPromptPhrase,
    lightingOptionsForShotMode: lightingOptionsForShotMode,
    setRankedLightingOptions: setRankedLightingOptions,
    socialFinishTreatments: function(){ return SOCIAL_FINISH_TREATMENTS.slice(); },
    socialFinishTreatmentById: socialFinishTreatmentById,
    currentSocialFinishTreatment: currentSocialFinishTreatment,
    socialFinishTreatmentHtml: socialFinishTreatmentHtml,
    syncSocialFinishTreatment: syncSocialFinishTreatment,
    setSocialFinishTreatment: setSocialFinishTreatment,
    socialFinishTreatmentPromptLine: socialFinishTreatmentPromptLine,
    socialFinishTreatmentNegativeAdditions: socialFinishTreatmentNegativeAdditions,
    authenticityControls: function(){ return AUTHENTICITY_CONTROLS.slice(); },
    captionEnergyRules: function(){ return CAPTION_ENERGY_RULES.slice(); },
    authenticityState: authenticityState,
    authenticityDefaultsForMode: authenticityDefaultsForMode,
    authenticityPackFromControls: authenticityPackFromControls,
    authenticityControlsHtml: authenticityControlsHtml,
    syncAuthenticityControls: syncAuthenticityControls,
    setAuthenticityControl: setAuthenticityControl,
    authenticityPromptLines: authenticityPromptLines,
    authenticityNegativeAdditions: authenticityNegativeAdditions,
    captionEnergyGuide: captionEnergyGuide,
    captionEnergyGuideHtml: captionEnergyGuideHtml,
    livePromptSegments: livePromptSegments,
    renderModelIntelligence: renderModelIntelligence,
    modelIntelligence: modelIntelligence,
    modelRatingDots: modelRatingDots,
    modelShotRecommendationScore: modelShotRecommendationScore,
    recommendedModelForCurrentShot: recommendedModelForCurrentShot,
    modelPerformanceHistory: modelPerformanceHistory,
    modelIntelligenceCardHtml: modelIntelligenceCardHtml,
    modelComparisonCardHtml: modelComparisonCardHtml,
    runDirectorBrief: runDirectorBrief,
    applyDirectorParsedShot: applyDirectorParsedShot,
    renderDirectorBriefResult: renderDirectorBriefResult,
    analyzeAestheticRef: analyzeAestheticRef,
    applyAestheticToShot: applyAestheticToShot,
    aestheticNegativeModifiers: aestheticNegativeModifiers,
    applyGeneratorState: applyGeneratorState,
    loadGeneratorProfile: loadGeneratorProfile,
    generateConcepts: generateConcepts,
    models: function(){ return state.models.slice(); },
    perfSnapshot: function(){
      return {
        modelBoardRenderCount: state.modelBoardRenderCount,
        routePreviewKey: state.routePreviewKey,
        routePreviewLoading: state.routePreviewLoading,
        modelStripScrollLeft: state.modelStripScrollLeft
      };
    },
    motion: {
      restartTransientClass: restartTransientClass,
      pulseControl: pulseControl,
      markRepopulating: markRepopulating,
      markPressed: markPressed,
      cascadeRefReveal: cascadeRefReveal
    }
  };
  window.generateFullKit = generateFullKit;
  window.generatePromptFromGenerator = generatePromptFromGenerator;
  window.renderGeneratorAiActions = renderGeneratorAiActions;
  window.previewImageRouteFromGenerator = previewImageRouteFromGenerator;
  window.schedulePreviewImageRouteFromGenerator = schedulePreviewImageRouteFromGenerator;
  window.applyGeneratorState = applyGeneratorState;
  window.applySaMomentFromGenerator = applySaMoment;
  window.runDirectorBriefFromGenerator = runDirectorBrief;
  window.generateShotboardConcepts = generateConcepts;
  window.promptGeneratorEngineRecordShot = saveShotHistoryRecord;
  window.promptGeneratorEngineCreateGenerationSnapshot = createGenerationJobSnapshot;
  window.promptGeneratorEngineBudgetPreflight = generationBudgetPreflight;
  window.promptGeneratorEngineRecordBudgetSpend = recordGenerationBudgetSpend;
  window.promptGeneratorEngineFetchShotHistory = fetchShotHistory;
  window.promptGeneratorEngineUpdateShotStatus = updateShotHistoryStatus;
  window.promptGeneratorEnginePrepareVariation = prepareShotVariation;
  window.useRecommendedModelForShot = useRecommendedModelForShot;
  window.saveWardrobeFromGenerator = saveWardrobeFromForm;
  window.useRouterSelectedModel = useRouterSelectedModel;
  window.switchToFalDirectRefs = switchToFalDirectRefs;
  window.focusProviderSetup = focusProviderSetup;
  window.getCurrentImageModel = getCurrentImageModel;
  window.getCurrentImageIntent = getCurrentImageIntent;
  window.getCurrentImageQuality = getCurrentImageQuality;
  window.getCurrentImageAspectRatio = getCurrentImageAspectRatio;
  window.getCurrentImageSpendLane = getCurrentImageSpendLane;
  window.getGeneratorContext = getGeneratorContext;
  window.selectedImageRouteLabel = selectedImageRouteLabel;

  async function init(reason){
    if (generatorInitPromise) return generatorInitPromise;
    generatorInitPromise = (async function(){
      observeGeneratorActivation();
      activateGeneratorHashRoute();
      ensureControls();
      renderEmptyPanel();
      renderModelIntelligence(false);
      await Promise.all([
        loadGeneratorProfile(),
        loadModels()
      ]);
      populateModelSelect();
      populateOutfitSelect(false);
      renderWardrobeCards();
      renderWardrobeLibrary();
      renderModelIntelligence(true);
      generatorInitComplete = true;
      refreshGeneratorSurfaceAfterStatus();
      setTimeout(cleanupLateLegacyControls, 180);
      setTimeout(cleanupLateLegacyControls, 520);
      return true;
    })();
    return generatorInitPromise;
  }

  window.addEventListener('silva:provider-status', function(event){
    if (event && event.detail) {
      applyProviderStatus(event.detail);
      populateModelSelect();
      renderRoutePreview(state.routePreview);
      renderModelIntelligence(false);
      updateModelBoardReadiness();
      updateEmptyPanelRoute();
      renderGeneratorAiActions();
      renderEmptyPanel();
    }
  });

  function bootGeneratorWhenReady(){
    observeGeneratorActivation();
    if (generatorPageIsActive()) queueGeneratorBoot('generator-initial-active', true);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGeneratorWhenReady);
  } else {
    setTimeout(bootGeneratorWhenReady, 0);
  }
  window.addEventListener('hashchange', function(){
    setTimeout(function(){
      activateGeneratorHashRoute();
      if (window.location.hash === '#generator') queueGeneratorBoot('generator-hashchange', false);
    }, 30);
  });
})();
