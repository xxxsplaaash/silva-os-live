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
      outfitId: '',
      outfitOverride: '',
      shotAction: 'direct gaze, relaxed posture',
      cameraDistance: 'medium portrait',
      lens: '50mm natural perspective',
      movement: 'still but alive',
      props: '',
      selectedRefs: {},
      variationSeed: 0,
      conceptCards: [],
      locks: {
        identity: true,
        outfit: false,
        scene: false,
        camera: false,
        mood: false,
        props: false,
        location: false
      }
    }
  };

  var SHOT_ACTIONS = [
    'direct gaze, relaxed posture',
    'mid-step through the scene, face still clear',
    'seated with hands visible and expression controlled',
    'turning slightly toward camera after movement',
    'leaning near the environment, aware but not posed',
    'quiet pause before speaking, eyes present'
  ];
  var CAMERA_DISTANCES = ['tight portrait', 'medium portrait', 'three-quarter body', 'full body environmental', 'waist-up candid'];
  var LENS_CHOICES = ['35mm environmental realism', '50mm natural perspective', '85mm portrait compression', 'phone camera realism', 'editorial documentary lens'];
  var MOVEMENT_CHOICES = ['still but alive', 'walking naturally', 'hands adjusting jacket', 'looking off then back', 'turning through available light'];
  var PROP_CHOICES = ['', 'phone in hand', 'coffee cup', 'notebook', 'small tote bag', 'car keys', 'laptop sleeve'];

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
    if (store && typeof store.readinessForModel === 'function' && store.hasStatus && store.hasStatus()) {
      return store.readinessForModel(model);
    }
    var provider = (state.providerStatus?.providers || []).find(function(item){
      return item.providerAdapter === model.providerAdapter;
    });
    if (provider) {
      return {
        configured: Boolean(provider.configured),
        status: provider.status || (provider.configured ? 'ready' : 'missing key'),
        source: provider.source || 'missing',
        maskedValue: provider.maskedValue || '',
        lastCheckedAt: state.providerStatusLastCheckedAt || ''
      };
    }
    if (state.modelReadinessById[model.id]) return state.modelReadinessById[model.id];
    if (model.providerReadiness) return model.providerReadiness;
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
  function activateGeneratorHashRoute(){
    if (window.location.hash === '#generator' && typeof window.nav === 'function') {
      window.nav('generator');
      claimSurface({ mode: 'hash-route' });
      setTimeout(function(){
        ensureControls();
        renderEmptyPanel();
        renderModelIntelligence(false);
        refreshProviderReadiness({ force: true, reason: 'generator-hash-activation' })
          .then(function(){ return previewImageRouteFromGenerator({ force: true, refreshStatus: false }); })
          .catch(function(){});
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

  async function loadModels(){
    try {
      var result = await fetchJsonWithTimeout('/api/image-models', { cache: 'no-store' }, 6500);
      var res = result.res;
      var data = result.data;
      if (res.ok && Array.isArray(data.items) && data.items.length) {
        state.models = data.items;
        state.registryLoaded = true;
        mergeRouteReadiness({ items: data.items });
      }
    } catch (err) {
      state.registryLoaded = false;
    }
    populateModelSelect();
  }

  async function loadProviderStatus(options){
    options = options || {};
    var store = providerStore();
    state.providerStatusLoading = true;
    try {
      if (store && typeof store.fetchFresh === 'function') {
        var status = await store.fetchFresh({ force: Boolean(options.force), reason: options.reason || 'prompt-generator' });
        applyProviderStatus(status);
        return state.providerStatus;
      }
      var result = await fetchJsonWithTimeout('/api/provider-credentials/status', { cache: 'no-store' }, 6000);
      var res = result.res;
      var data = result.data;
      if (res.ok && data && data.ok !== false) applyProviderStatus(data);
    } catch (err) {
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
      'g-platform': [
        ['instagram', 'Instagram (Feed 1:1)'],
        ['carousel', 'Instagram Carousel'],
        ['story', 'Instagram Story (9:16)'],
        ['linkedin', 'LinkedIn'],
        ['reel', 'Reel / Short Video Thumb']
      ],
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
      'g-location': [
        ['cafe_braam', 'Café - Braamfontein'],
        ['cafe_rosebank', 'Café - Rosebank'],
        ['maboneng', 'Maboneng Precinct'],
        ['44stanley', '44 Stanley'],
        ['victoria_yards', 'Victoria Yards'],
        ['sandton_lobby', 'Sandton Hotel Lobby'],
        ['rooftop_jhb', 'JHB Rooftop'],
        ['street_jhb', 'City Street (JHB CBD)'],
        ['studio_desk', 'Studio / Clean Desk'],
        ['airport', 'OR Tambo Lounge'],
        ['gautrain', 'Gautrain Platform'],
        ['parkhurst', 'Parkhurst 4th Ave'],
        ['melville', 'Melville 7th St'],
        ['keyes', 'Keyes Design Corridor'],
        ['pretoria', 'Pretoria Tech Zone']
      ],
      'g-mood': [
        ['sharp', 'Sharp / Focused'],
        ['composed', 'Composed / Premium'],
        ['candid', 'Candid / Real'],
        ['pensive', 'Pensive / Thoughtful'],
        ['confident', 'Confident / Assured'],
        ['in_motion', 'In Motion / Transitional'],
        ['soft', 'Soft / Relaxed']
      ],
      'g-time': [
        ['golden_am', 'Golden Hour (AM)'],
        ['morning', 'Morning Light'],
        ['midday', 'Midday / Overcast'],
        ['late_afternoon', 'Late Afternoon'],
        ['golden_pm', 'Golden Hour (PM)'],
        ['blue_hour', 'Blue Hour / Dusk'],
        ['indoor_day', 'Indoor Daylight'],
        ['indoor_artificial', 'Indoor Artificial (Studio)']
      ],
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
    return (map[id] || []).map(function(item){
      return '<option value="' + esc(item[0]) + '">' + esc(item[1]) + '</option>';
    }).join('');
  }

  function capturedOptions(id, fallback){
    var old = $(id);
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

  function routeControlOptions(){
    return {
      spendLane: '<option value="google_credits">Google Credits - final refs</option><option value="fal_full_ai">fal.ai Final AI - direct refs</option><option value="auto_best">Auto Best - may switch lanes</option>',
      intent: '<option value="final_character">Character Final</option><option value="broll_final">B-roll Final</option><option value="object_product_final">Object/Product Final</option><option value="no_reference_scene">No-Reference Scene</option>',
      quality: '<option value="premium">Premium final</option><option value="ultra">Ultra final</option><option value="standard">Clean final</option><option value="utility">Utility final</option>',
      aspect: '<option value="1:1">1:1 square</option><option value="4:5">4:5 portrait</option><option value="9:16">9:16 story</option><option value="16:9">16:9 landscape</option>',
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
    return $('prompt-generator-51-shell') || $('prompt-generator-50-shell') || $('prompt-generator-40-shell') || $('prompt-generator-38-shell');
  }

  function activeShellSelector(){
    return '#prompt-generator-51-shell,#prompt-generator-50-shell,#prompt-generator-40-shell,#prompt-generator-38-shell';
  }

  function charKey(charId){
    return String(charId || $('g-char')?.value || 'leah').replace(/^grok.*$/i, 'grok').toLowerCase();
  }

  function normalizeClosetItem(item, index){
    item = item && typeof item === 'object' ? item : {};
    var id = String(item.id || item.name || ('outfit_' + index)).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || ('outfit_' + index);
    return {
      id: id,
      name: String(item.name || id.replace(/_/g, ' ')),
      category: String(item.category || 'custom'),
      palette: String(item.palette || 'black, graphite, clean neutrals'),
      garments: Array.isArray(item.garments) ? item.garments.map(String).filter(Boolean).slice(0, 8) : [],
      fit: String(item.fit || 'intentional and camera-real'),
      vibe: String(item.vibe || 'premium but human'),
      avoid: Array.isArray(item.avoid) ? item.avoid.map(String).filter(Boolean).slice(0, 8) : [],
      compatibleScenes: Array.isArray(item.compatibleScenes) ? item.compatibleScenes.map(String).filter(Boolean).slice(0, 8) : [],
      ref: item.ref || item.reference || item.dataUrl || item.url || ''
    };
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
      key: key,
      type: role,
      role: role,
      label: String(label),
      source: String(item.source || 'assets'),
      priority: Number(item.priority || (list.length + 1)),
      activeDefault: Boolean(item.activeDefault),
      preview: src
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
      var isFace = ref.type === 'face' || /face/i.test(String(ref.label || ''));
      var isBody = ref.type === 'body' || /body|build/i.test(String(ref.label || ''));
      addRefCandidate(out, {
        key: ref.key || index,
        role: isFace ? 'primary_face' : isBody ? 'primary_body' : (ref.type || 'identity_support'),
        label: isFace ? 'PRIMARY FACE TILE / IDENTITY AUTHORITY' : isBody ? 'PRIMARY BODY TILE / BUILD AUTHORITY' : (ref.label || 'SUPPORTING IDENTITY REFERENCE'),
        source: ref.source || 'assets_vault',
        priority: isFace ? 1 : isBody ? 2 : 10 + index,
        activeDefault: isFace || isBody,
        dataUrl: ref.dataUrl || '',
        url: ref.url || ref.preview || ''
      });
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
        activeDefault: true,
        url: wardrobe.reference,
        dataUrl: wardrobe.reference
      });
    }
    return out.sort(function(a, b){ return a.priority - b.priority; });
  }

  function isReferenceSelected(ref){
    var selected = state.generatorV5.selectedRefs || {};
    if (Object.prototype.hasOwnProperty.call(selected, ref.key)) return Boolean(selected[ref.key]);
    return Boolean(ref.activeDefault);
  }

  function activeReferencePack(){
    if (!checked('g-attach-refs', true)) return [];
    return referenceCandidatesForCurrent()
      .filter(isReferenceSelected)
      .map(function(ref, index){
        return Object.assign({}, ref, {
          priority: index + 1,
          referenceKind: ref.role || ref.type,
          active: true
        });
      });
  }

  function selectedReferencePackSummary(){
    var refs = activeReferencePack();
    return {
      version: 'reference-pack-v5.1',
      count: refs.length,
      roles: refs.map(function(ref){ return ref.role || ref.type; }),
      references: refs
    };
  }

  function renderReferenceDock(){
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
    return {
      version: 'scene-pack-v1',
      locationId: $('g-location')?.value || 'cafe_braam',
      location: optionText('g-location') || 'Johannesburg',
      action: $('g-shot-action')?.value || state.generatorV5.shotAction,
      cameraDistance: $('g-camera-distance')?.value || state.generatorV5.cameraDistance,
      lens: $('g-lens')?.value || state.generatorV5.lens,
      lighting: optionText('g-time') || 'natural light',
      mood: optionText('g-mood') || 'present',
      movement: $('g-movement')?.value || state.generatorV5.movement,
      props: $('g-props')?.value || state.generatorV5.props,
      platformCrop: getCurrentImageAspectRatio(),
      realismIntensity: $('g-realism')?.value || 'hyper'
    };
  }

  function generatorRecipe(kit){
    var wardrobePack = selectedWardrobePack();
    var scenePack = scenePackFromControls();
    var referencePack = selectedReferencePackSummary();
    return {
      version: 'prompt-contract-v5.1',
      jobType: kit?.route?.intent || getCurrentImageIntent(),
      characterId: $('g-char')?.value || 'leah',
      characterName: getCharSafe($('g-char')?.value || 'leah').name || $('g-char')?.value || 'Leah Mokoena',
      identityMode: kit?.refCount > 0 ? 'exact_character' : 'written_identity',
      spendLane: getCurrentImageSpendLane(),
      selectedModel: getCurrentImageModel(),
      referencePack: referencePack,
      homeSystemPack: homeSystemPack($('g-char')?.value || 'leah'),
      wardrobePack: wardrobePack,
      scenePack: scenePack,
      lockedFields: Object.assign({}, state.generatorV5.locks),
      variationSeed: state.generatorV5.variationSeed || 0,
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
      ]
    };
  }

  function optionList(items, current){
    return items.map(function(value){
      return '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(value) + '</option>';
    }).join('');
  }

  async function loadGeneratorProfile(){
    if (state.generatorProfileLoaded) return state.generatorProfile;
    try {
      var result = await fetchJsonWithTimeout('/api/generator/profile', { cache: 'no-store' }, 6500);
      if (result.res.ok && result.data && result.data.ok !== false) {
        state.generatorProfile = {
          closets: result.data.closets || {},
          sceneLibrary: result.data.sceneLibrary || {},
          presets: result.data.presets || {}
        };
      }
    } catch (_) {}
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
      }
      return result.data;
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  function randomFrom(items){
    return items[Math.floor(Math.random() * items.length)] || items[0] || '';
  }

  function locked(field){
    return Boolean(state.generatorV5.locks && state.generatorV5.locks[field]);
  }

  function applyRandomization(kind){
    var patch = {};
    if (kind === 'outfit' && !locked('outfit')) patch.outfitId = randomFrom(currentCloset()).id;
    if (kind === 'scene' && !locked('scene')) {
      patch.shotAction = randomFrom(SHOT_ACTIONS);
      patch.movement = randomFrom(MOVEMENT_CHOICES);
      patch.props = randomFrom(PROP_CHOICES);
      var locations = Array.prototype.slice.call($('g-location')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (locations.length && $('g-location')) $('g-location').value = randomFrom(locations);
    }
    if (kind === 'light' && !locked('mood')) {
      var lights = Array.prototype.slice.call($('g-time')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      var moods = Array.prototype.slice.call($('g-mood')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (lights.length && $('g-time')) $('g-time').value = randomFrom(lights);
      if (moods.length && $('g-mood')) $('g-mood').value = randomFrom(moods);
    }
    if (kind === 'camera' && !locked('camera')) {
      patch.cameraDistance = randomFrom(CAMERA_DISTANCES);
      patch.lens = randomFrom(LENS_CHOICES);
      var cameras = Array.prototype.slice.call($('g-camera')?.options || []).map(function(option){ return option.value; }).filter(Boolean);
      if (cameras.length && $('g-camera')) $('g-camera').value = randomFrom(cameras);
    }
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

  function renderConceptCards(){
    var wrap = $('pg50-concept-cards');
    if (!wrap) return;
    var items = state.generatorV5.conceptCards || [];
    wrap.innerHTML = items.length ? items.map(function(item){
      return [
        '<button type="button" class="pg50-concept-card" data-pg50-concept="' + esc(item.id) + '">',
          '<span>' + esc(item.title || 'Concept') + '</span>',
          '<strong>' + esc(item.action || item.scene || 'final shot') + '</strong>',
          '<small>' + esc(item.light || item.camera || 'camera-real') + '</small>',
        '</button>'
      ].join('');
    }).join('') : '<div class="pg50-empty-line">Generate six local concepts when you want new shot ideas. No image credits are spent.</div>';
    wrap.querySelectorAll('[data-pg50-concept]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var concept = (state.generatorV5.conceptCards || []).find(function(item){ return item.id === btn.getAttribute('data-pg50-concept'); });
        if (!concept) return;
        applyGeneratorState({
          shotAction: concept.action || state.generatorV5.shotAction,
          cameraDistance: concept.camera || state.generatorV5.cameraDistance,
          movement: concept.scene || state.generatorV5.movement
        }, { source: 'concept-card' });
      });
    });
  }

  async function generateConcepts(){
    var kit = buildKit();
    var wardrobe = selectedWardrobePack();
    var result = await fetchJsonWithTimeout('/api/generator/concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character: kit.character.name || kit.char,
        location: kit.loc.name || optionText('g-location'),
        outfit: wardrobe.name,
        mood: optionText('g-mood'),
        camera: scenePackFromControls().lens
      })
    }, 6500).catch(function(){ return null; });
    state.generatorV5.conceptCards = Array.isArray(result?.data?.items) ? result.data.items : [];
    renderConceptCards();
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
      '<section class="pg51-board" aria-label="Prompt Generator 5.1 shotboard">',
        '<header class="pg51-command-bar">',
          '<div class="pg51-brand">',
            '<div class="pg3-kicker">Prompt Generator 5.1</div>',
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
      '<section class="pg50-hero" aria-label="Prompt Generator 5.0 command">',
        '<div>',
          '<div class="pg3-kicker">Prompt Generator 5.1</div>',
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

  function ensureControls(){
    var page = $('page-generator');
    if (!page) return;
    claimSurface({ mode: 'generator-5.1' });
    var title = page.querySelector('.page-title');
    var sub = page.querySelector('.page-sub');
    if (title) title.textContent = 'Prompt Generator 5.1';
    if (sub) sub.textContent = 'Real shotboard console — character refs, Home System refs, wardrobe, route, final image.';

    if (!renderGeneratorShell51()) return;
    var shell = $('prompt-generator-51-shell');
    if (!shell || shell.dataset.bound === '1') return;
    shell.dataset.bound = '1';
    removeLegacyProviderControls();
    populateModelSelect();
    populateOutfitSelect();
    if ($('g-spend-lane') && !$('g-spend-lane').value) $('g-spend-lane').value = 'google_credits';
    syncCharacterAlias();
    ['g-char','g-platform','g-bucket','g-location','g-mood','g-time','g-posttype','g-mode','g-camera','g-spend-lane','g-route-intent','g-image-model','g-route-quality','g-image-aspect','g-realism','g-template','g-campaign','g-sa-texture','g-attach-refs','g-requires-text','g-outfit','g-outfit-override','g-shot-action','g-camera-distance','g-lens','g-movement','g-props','g-lock-outfit','g-lock-scene','g-lock-camera','g-lock-mood'].forEach(function(id){
      var el = $(id);
      if (!el) return;
      el.addEventListener(id === 'g-outfit-override' ? 'input' : 'change', function(){
        var patch = {};
        if (id === 'g-image-model') patch.modelId = getCurrentImageModel();
        if (id === 'g-spend-lane') patch.spendLane = getCurrentImageSpendLane();
        if (id === 'g-char') {
          syncCharacterAlias();
          populateOutfitSelect(true);
        }
        if (id === 'g-outfit') patch.outfitId = el.value;
        if (id === 'g-outfit-override') patch.outfitOverride = el.value;
        if (id === 'g-shot-action') patch.shotAction = el.value;
        if (id === 'g-camera-distance') patch.cameraDistance = el.value;
        if (id === 'g-lens') patch.lens = el.value;
        if (id === 'g-movement') patch.movement = el.value;
        if (id === 'g-props') patch.props = el.value;
        if (id === 'g-lock-outfit') patch.locks = { outfit: el.checked };
        if (id === 'g-lock-scene') patch.locks = { scene: el.checked };
        if (id === 'g-lock-camera') patch.locks = { camera: el.checked };
        if (id === 'g-lock-mood') patch.locks = { mood: el.checked };
        applyGeneratorState(patch, { source: id });
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
        else applyRandomization(kind);
      });
    });
    shell.addEventListener('change', function(event){
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
    renderIdentitySummary();
    renderReferenceDock();
    renderShotSummary();
    renderWardrobeCards();
    renderConceptCards();
    renderPromptPreview();
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
    if ($('prompt-generator-51-shell')) return activeReferencePack(charId).length;
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
    var wrap = $('pg50-identity-summary') || $('pg40-identity-summary') || $('pg38-identity-summary');
    if (!wrap) return;
    var refs = $('prompt-generator-51-shell') ? activeReferencePack() : identityRefsForCurrent();
    var face = refs.find(function(ref){ return ref.type === 'face' || /face/i.test(String(ref.label || '')); });
    var body = refs.find(function(ref){ return ref.type === 'body' || /body|build/i.test(String(ref.label || '')); });
    var exactSafe = Boolean(face);
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
    if ($('pg3-selected-cost')) $('pg3-selected-cost').textContent = zarCost(selected);
    renderModelSummary(selected, data);
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
    wrap.innerHTML = [
      '<div class="pg40-model-summary-main">',
        '<div><span>Selected model</span><strong>' + esc(selected.displayName) + '</strong></div>',
        '<div><span>Billing lane</span><strong>' + esc(spendLaneShort(ctx.spendLane)) + '</strong></div>',
        '<div><span>Cost estimate</span><strong>' + esc(zarCost(selected)) + '</strong></div>',
        '<div><span>Status</span><strong>' + esc(readinessLabel(selected)) + '</strong></div>',
      '</div>',
      '<div class="pg40-model-summary-note">' + esc(bestUseLine(selected)) + ' · ' + esc(providerChip(selected)) + (diverged ? ' · Router changed the preferred model.' : '') + '</div>'
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

  function modelCardHtml(model, selectedId, recommendedId, compact){
    return [
      '<div class="pg3-model-card pg40-model-card ' + (compact ? 'compact ' : '') + (model.id === selectedId ? 'selected ' : '') + (model.id === recommendedId ? 'recommended' : '') + '" role="button" tabindex="0" data-model-id="' + esc(model.id) + '">',
        '<div class="pg3-model-card-top">',
          '<div class="pg3-model-name">' + esc(model.displayName) + '</div>',
          '<span class="pg3-chip">' + esc(shortProviderChip(model)) + '</span>',
        '</div>',
        '<div class="pg3-model-meta">' + esc(bestUseLine(model)) + '</div>',
        '<div class="pg3-backend-note">' + esc(backendModelNote(model)) + '</div>',
        '<div class="pg3-chip-row"><span class="pg3-cost-pill">' + esc(zarCost(model)) + '</span><span class="pg3-readiness-pill ' + esc(readinessClass(model)) + '" data-model-readiness="' + esc(model.id) + '">' + esc(readinessLabel(model)) + '</span></div>',
        '<div class="pg3-chip-row">' + supportPills(model) + '</div>',
        '<div class="pg3-list"><strong>Use:</strong> ' + esc(list(model.bestFor, compact ? 1 : 2)) + '</div>',
        '<details class="pg3-model-details"><summary>Limits and best use</summary><div class="pg3-list"><strong>Weak:</strong> ' + esc(list(model.weaknesses, 3)) + '</div><div class="pg3-mini"><strong>Best:</strong> ' + esc(list(model.bestFor, 3)) + '</div><div class="pg3-mini"><strong>Avoid:</strong> ' + esc(list(model.avoidWhen, 2)) + '</div><div class="pg3-mini" data-model-source="' + esc(model.id) + '">' + esc((readinessForModel(model).source || 'missing')) + '</div></details>',
      '</div>'
    ].join('');
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

  function applyGeneratorState(patch, options){
    options = options || {};
    patch = patch || {};
    var modelId = patch.modelId || patch.id || '';
    if (modelId === 'prunaai/p-image-edit') modelId = 'fal/qwen-image-2-edit';
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
    if (patch.aspectRatio && $('g-image-aspect')) $('g-image-aspect').value = patch.aspectRatio;
    if (patch.outfitId) {
      state.generatorV5.outfitId = patch.outfitId;
      if ($('g-outfit')) $('g-outfit').value = patch.outfitId;
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'outfitOverride')) {
      state.generatorV5.outfitOverride = String(patch.outfitOverride || '');
      if ($('g-outfit-override') && $('g-outfit-override').value !== state.generatorV5.outfitOverride) $('g-outfit-override').value = state.generatorV5.outfitOverride;
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
      if ($(id) && $(id).value !== patch[key]) $(id).value = patch[key];
    });
    if (patch.variationSeed) state.generatorV5.variationSeed = patch.variationSeed;
    if (patch.locks && typeof patch.locks === 'object') {
      state.generatorV5.locks = Object.assign({}, state.generatorV5.locks, patch.locks);
    }
    if (patch.selectedRefs && typeof patch.selectedRefs === 'object') {
      state.generatorV5.selectedRefs = Object.assign({}, patch.selectedRefs);
    }
    [['g-lock-outfit','outfit'],['g-lock-scene','scene'],['g-lock-camera','camera'],['g-lock-mood','mood']].forEach(function(pair){
      if ($(pair[0])) $(pair[0]).checked = Boolean(state.generatorV5.locks[pair[1]]);
    });
    syncCharacterAlias();
    updateSpendNote();
    renderIdentitySummary();
    renderReferenceDock();
    populateOutfitSelect(false);
    renderWardrobeCards();
    renderShotSummary();
    renderConceptCards();
    state.routePreview = null;
    state.routePreviewKey = '';
    renderRoutePreview(null);
    updateModelBoardSelection();
    updateEmptyPanelRoute();
    renderPromptPreview();
    renderGeneratorAiActions();
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
    var recommendedId = currentRoutePreview()?.selectedModel?.id || selectedId;
    board.querySelectorAll('.pg3-model-card').forEach(function(card){
      var id = card.getAttribute('data-model-id');
      card.classList.toggle('selected', id === selectedId);
      card.classList.toggle('recommended', id === recommendedId);
    });
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

  function modelRailGroup(label, models, selectedId, recommendedId){
    if (!models.length) return '';
    return [
      '<section class="pg3-model-group" aria-label="' + esc(label) + '">',
        '<div class="pg3-model-group-title">' + esc(label) + '</div>',
        '<div class="pg3-model-strip" role="list" aria-label="' + esc(label) + ' model routes">',
          models.map(function(model){ return modelCardHtml(model, selectedId, recommendedId, true); }).join(''),
        '</div>',
      '</section>'
    ].join('');
  }

  function renderModelIntelligence(force){
    var board = $('g-model-intelligence');
    if (!board) return;
    try { window.SilvaPerf && window.SilvaPerf.inc('generator.modelBoard.renderAttempt'); } catch (_) {}
    var selectedId = getCurrentImageModel();
    var recommendedId = currentRoutePreview()?.selectedModel?.id || selectedId;
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
      '<div class="pg38-drawer-meta">',
        '<span class="pg3-chip">' + state.models.length + ' routes</span>',
        '<span class="pg3-chip">' + (state.registryLoaded ? 'live registry' : 'local fallback') + '</span>',
        '<span class="pg3-chip">details collapsed</span>',
      '</div>',
      '<div class="pg3-mini pg3-model-hint">Google credit routes stay separate from fal.ai final AI routes. Pick one card; every section updates through the same state path.</div>',
      modelRailGroup('Google Credits', googleModels, selectedId, recommendedId),
      modelRailGroup('fal.ai Final AI', fullAiModels, selectedId, recommendedId)
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
    ensureControls();
    if (options.force && options.refreshStatus !== false) {
      await loadProviderStatus({ force: true, reason: 'route-preview-refresh' });
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
      return null;
    }
  }

  function locationInfo(id){
    var loc = (window.JHB_LOCATIONS || []).find(function(item){ return item.id === id; });
    return loc || { id: id, name: optionText('g-location') || id || 'Johannesburg', prompt: 'grounded Johannesburg setting', mood: 'local texture', timeOfDay: 'flexible' };
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
    var time = $('g-time')?.value || 'golden_am';
    var postType = $('g-posttype')?.value || 'portrait';
    var mode = $('g-mode')?.value || 'work';
    var camera = $('g-camera')?.value || 'editorial';
    var realism = $('g-realism')?.value || 'hyper';
    var preset = $('g-template')?.value || 'portrait';
    var campaign = $('g-campaign')?.value || '';
    var c = getCharSafe(char);
    var id = c.identity || {};
    var loc = locationInfo(location);
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
    var activeRefs = activeReferencePack();
    var referencePack = selectedReferencePackSummary();
    var homePack = homeSystemPack(char);

    var cameraDesc = {
      editorial: 'editorial magazine realism with clean composition',
      documentary: 'documentary street realism with slight grain',
      cinematic: 'cinematic environmental portrait with controlled depth',
      portrait_lens: '85mm portrait realism with natural falloff',
      phone_real: 'phone-camera realism with social texture'
    }[camera] || 'editorial social realism';
    var timeDesc = {
      golden_am: 'warm low-angle morning light',
      morning: 'clean morning daylight',
      midday: 'soft overcast midday light',
      late_afternoon: 'warm late-afternoon directional light',
      golden_pm: 'rich golden-hour evening light',
      blue_hour: 'blue-hour dusk with city glow',
      indoor_day: 'window-led indoor daylight',
      indoor_artificial: 'controlled studio or office light'
    }[time] || optionText('g-time') || 'natural light';
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
      ? 'South African realism: grounded Johannesburg texture, believable skin undertones, real city light, subtle heat sheen, no global-generic stock energy.'
      : '';
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
      contract: 'PROMPT_CONTRACT_V5_1',
      jobType: jobType,
      outputFormat: 'raw_source_camera_photo_only',
      subject: jobType === 'final_character' ? (c.name || char) : outputUse,
      identityRefs: refCount ? activeRefs.map(function(ref){ return ref.label; }) : 'none',
      selectedRefs: activeRefs.map(function(ref){
        return { role: ref.role || ref.type, label: ref.label, source: ref.source, priority: ref.priority };
      }),
      homeSystemPack: {
        usageRule: homePack.usageRule,
        selectedRooms: activeRefs.filter(function(ref){ return /^home_/i.test(ref.role || ''); }).map(function(ref){ return ref.role; }),
        selectedItems: activeRefs.filter(function(ref){ return /^item_/i.test(ref.role || ''); }).map(function(ref){ return ref.role; })
      },
      scene: {
        location: loc.prompt || loc.name,
        action: scenePack.action,
        movement: scenePack.movement,
        props: scenePack.props
      },
      camera: {
        style: cameraDesc,
        distance: scenePack.cameraDistance,
        lens: scenePack.lens
      },
      lighting: scenePack.lighting || timeDesc,
      mood: scenePack.mood || moodDesc,
      realism: realismDesc + (saTexture ? '; ' + saTexture : ''),
      wardrobe: wardrobePack,
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
      ],
      aspectRatio: aspect
    };
    var recipe = {
      version: 'prompt-contract-v5.1',
      jobType: jobType,
      characterId: char,
      characterName: c.name || char,
      identityMode: refCount > 0 ? 'exact_character' : 'written_identity',
      spendLane: route.spendLane,
      selectedModel: model.id,
      referencePack: referencePack,
      homeSystemPack: homePack,
      wardrobePack: wardrobePack,
      scenePack: scenePack,
      lockedFields: Object.assign({}, state.generatorV5.locks),
      variationSeed: state.generatorV5.variationSeed || 0,
      outputFormat: 'raw_photo',
      promptContract: promptContract
    };
    var mainPrompt = [
      'PROMPT_CONTRACT_V5_1',
      'Generate one finished raw camera photograph. Do not make a mockup, rough concept, layout, poster, social post, screenshot, frame, or design.',
      refCount ? 'Reference authority: the supplied primary face/body refs win over every written descriptor. Match the exact person from the refs.' : 'Reference authority: no image refs attached; use written subject constraints only.',
      'Job type: ' + outputUse + '.',
      jobType === 'final_character' ? ('Subject: ' + (c.name || char) + '. Written identity support only: ' + identityLock + '.') : ('Subject: ' + outputUse + '.'),
      neverChange ? ('Never change for this character: ' + neverChange + '.') : '',
      'Scene: ' + (loc.prompt || loc.name) + '.',
      'Action: ' + scenePack.action + '. Movement: ' + scenePack.movement + (scenePack.props ? '. Props: ' + scenePack.props : '') + '.',
      'Shot: ' + presetDesc + ' / ' + optionText('g-posttype') + ' / ' + scenePack.cameraDistance + '.',
      'Expression and mood: ' + moodDesc + '.',
      'Camera and composition: ' + cameraDesc + ', ' + scenePack.lens + '.',
      'Lighting: ' + timeDesc + '.',
      'Realism: ' + realismDesc + (saTexture ? '. ' + saTexture : '') + '.',
      'Wardrobe: ' + wardrobePack.prompt + '.',
      'Forbidden pixels: no Instagram UI, username, caption text, white border, post frame, phone screenshot, poster, graphic design, watermark, or any readable text.',
      'Aspect ratio: ' + aspect + '.',
      'Return the clean source photo only.'
    ].filter(Boolean).join('\n');
    var negative = [
      Array.isArray(id.neverGenerate) ? id.neverGenerate.join(', ') : '',
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

    return {
      char: char,
      platform: platform,
      bucket: bucket,
      location: location,
      mood: mood,
      time: time,
      camera: camera,
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
      mainPrompt: mainPrompt,
      negative: negative,
      caption: caption,
      storyOverlay: storyOverlay,
      liHook: liHook,
      broll: broll,
      score: score,
      warnings: warnings,
      generatorRecipe: recipe,
      referencePack: referencePack,
      homeSystemPack: homePack,
      wardrobePack: wardrobePack,
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
        dataUrl: 'vault:face'
      },
      {
        type: 'primary_body',
        role: 'primary_body',
        label: 'PRIMARY BODY TILE / BUILD AUTHORITY',
        priority: 2,
        source: 'vault_or_canonical_body_tile',
        referenceKind: 'primary_body_tile',
        dataUrl: 'vault:body'
      }
    ].slice(0, kit.refCount || 0);
  }

  function routerPayload(kit){
    return {
      prompt: kit.mainPrompt,
      negativePrompt: kit.negative,
      referenceImages: referencePackPlaceholders(kit),
      identityPack: {
        version: 'identity-pack-v5.1',
        references: referencePackPlaceholders(kit)
      },
      generatorRecipe: kit.generatorRecipe,
      wardrobePack: kit.wardrobePack,
      scenePack: kit.scenePack,
      selectedReferencePack: kit.referencePack,
      homeSystemPack: kit.homeSystemPack,
      variationSeed: kit.generatorRecipe?.variationSeed || state.generatorV5.variationSeed || 0,
      lockedFields: kit.generatorRecipe?.lockedFields || state.generatorV5.locks,
      jobType: kit.route.intent,
      promptContractVersion: 'prompt-contract-v5.1',
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
      referencePackVersion: 'identity-pack-v5.1',
      strictNoFrame: true,
      candidateCount: 1,
      metadata: {
        source: 'prompt-generator-v5.1',
        character: kit.char,
        campaign: kit.campaign || null,
        platform: kit.platform,
        bucket: kit.bucket,
        promptScore: kit.score.total,
        generatorRecipe: kit.generatorRecipe,
        selectedReferencePack: kit.referencePack,
        homeSystemPack: kit.homeSystemPack,
        wardrobePack: kit.wardrobePack,
        scenePack: kit.scenePack
      }
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
    var shell51 = Boolean($('prompt-generator-51-shell'));
    var addKey = !readiness.configured ? '<button class="btn btn-ghost btn-sm" onclick="focusProviderSetup(\'' + esc(model.providerAdapter || '') + '\')">Add credential</button>' : '';
    var statusText = built
      ? 'Prompt contract built. Generate the final image when ready.'
      : ('Ready: ' + model.displayName + ' · ' + spendLaneShort(getCurrentImageSpendLane()) + ' · ' + readinessLabel(model) + '.');
    return [
      '<div class="pg40-action-stack" id="gen-ai-tools" role="region" aria-label="Final image actions">',
        '<div class="pg40-action-row">',
          '<button class="btn btn-ghost btn-sm" onclick="generateFullKit()">Build Prompt Kit</button>',
          '<button class="btn btn-ghost btn-sm" onclick="copyText(document.getElementById(\'out-main\')?.textContent || window._lastGenerated?.prompt || \'\',this)">Copy Prompt</button>',
          shell51 ? '' : '<button class="btn btn-primary btn-sm pg40-primary-generate" onclick="generateImageFromGenerator(this)"' + generationButtonAttrs(model) + '>Generate Final Image</button>',
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
          '<div class="pg3-kicker">Prompt Generator 5.0</div>',
          '<h3>' + esc(kit.character.name || kit.char) + ' / ' + esc(kit.loc.name || kit.location) + '</h3>',
        '</div>',
        '<span class="pg3-cost-pill">' + esc(zarCost(kit.model)) + '</span>',
      '</div>',
      '<div class="pg3-chip-row pg40-preview-chips">',
        '<span class="pg3-chip">' + esc(kit.platform) + '</span>',
        '<span class="pg3-chip">' + esc(kit.bucket) + '</span>',
        '<span class="pg3-chip">' + esc(providerChip(kit.model)) + '</span>',
        '<span class="pg3-chip">' + esc(kit.model.displayName) + '</span>',
      '<span class="pg3-chip">refs ' + esc(kit.refCount) + '</span>',
        '<span class="pg3-chip">home refs ' + esc((kit.referencePack?.roles || []).filter(function(role){ return /^home_/i.test(role); }).length) + '</span>',
      '</div>',
      warnings,
      actionBarHtml(kit, built),
      collapseBlock('Final Prompt + Negative Prompt', '<div class="pg40-prompt-text"><div class="output-block"><div class="output-label">Final Image Prompt</div><div class="output-text highlight" id="out-main">' + esc(kit.mainPrompt) + '</div></div><div class="output-block"><div class="output-label">Negative Prompt</div><div class="output-text" id="out-neg">' + esc(kit.negative) + '</div></div></div>', false, 'pg40-prompt-contract'),
      '<details class="pg3-collapse pg40-collapse"><summary><span>Identity proofing</span><span class="pg3-collapse-hint">expand</span></summary><div class="pg3-collapse-body">' + identityFidelityPanel(kit) + '</div></details>',
      collapseBlock('Prompt Quality Breakdown', scoreHtml(kit.score), false, 'pg3-quality-collapse'),
      collapseBlock('Prompt Anatomy', anatomyHtml, false, 'pg3-anatomy-collapse'),
      collapseBlock('Prompt Variants', variantCards(kit), false, 'pg3-variants-collapse'),
      collapseBlock('Router Payload Preview', '<div class="pg3-router-payload" id="g-api-payload">' + esc(JSON.stringify(routerPayload(kit), null, 2)) + '</div><button class="copy-btn" onclick="copyText(document.getElementById(\'g-api-payload\').textContent,this)">Copy router payload</button>', false, 'pg3-payload-collapse'),
      collapseBlock('Caption / Social Kit', socialHtml, false, 'pg3-social-collapse'),
    ].join('');
  }

  function renderPromptPreview(kit, options){
    var panel = outputStage();
    if (!panel) return;
    options = options || {};
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
          '<button class="btn btn-primary btn-sm" onclick="generateImageAndSaveFromGenerator(this)"' + generationButtonAttrs(selected) + '>Generate + Save</button>',
          addKey,
        '</div>',
        '<div class="output-text" id="ai-helper-output" style="min-height:38px;margin-top:10px">Route: ' + esc(selected.displayName) + ' · ' + esc(spendLaneLabel(getCurrentImageSpendLane())) + ' · ' + esc(readinessLabel(selected)) + '. Images still go through /api/image-generation/generate.</div>',
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
      lineageSource: 'prompt_generator_v5_1',
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
    renderModelIntelligence: renderModelIntelligence,
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
    }
  };
  window.generateFullKit = generateFullKit;
  window.renderGeneratorAiActions = renderGeneratorAiActions;
  window.previewImageRouteFromGenerator = previewImageRouteFromGenerator;
  window.schedulePreviewImageRouteFromGenerator = schedulePreviewImageRouteFromGenerator;
  window.applyGeneratorState = applyGeneratorState;
  window.generateShotboardConcepts = generateConcepts;
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

  async function init(){
    activateGeneratorHashRoute();
    await loadGeneratorProfile();
    ensureControls();
    await loadModels();
    await loadProviderStatus({ force: true, reason: 'prompt-generator-init' });
    populateModelSelect();
    renderEmptyPanel();
    renderModelIntelligence(true);
    schedulePreviewImageRouteFromGenerator(40);
    setTimeout(cleanupLateLegacyControls, 180);
    setTimeout(cleanupLateLegacyControls, 520);
    setTimeout(activateGeneratorHashRoute, 80);
    setTimeout(activateGeneratorHashRoute, 350);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
  window.addEventListener('hashchange', function(){ setTimeout(activateGeneratorHashRoute, 30); });
})();
