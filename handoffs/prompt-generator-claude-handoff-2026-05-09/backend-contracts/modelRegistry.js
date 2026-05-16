const SCHEMA_VERSION = 'image-routing.v1';
const DEFAULT_USD_ZAR_RATE = 18.5;

const PROVIDER_ADAPTERS = Object.freeze(['google', 'openai', 'fal']);
const QUALITY_TIERS = Object.freeze(['utility', 'draft', 'standard', 'premium', 'ultra']);

const IMAGE_MODELS = Object.freeze([
  {
    id: 'google/nano-banana-2',
    displayName: 'Nano Banana 2',
    provider: 'Google Vertex AI',
    providerAdapter: 'google',
    model: 'gemini-2.5-flash-image',
    category: 'image-generation',
    qualityTier: 'standard',
    costEstimateUsd: 0.04,
    costBasis: 'approximate Vertex Gemini 2.5 Flash Image estimate; verify against Google Cloud billing',
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsMultiReference: true,
    supportsEditing: true,
    maxReferenceImages: 8,
    strengths: [
      'Fast Google-credit direct-reference route',
      'Vertex Gemini 2.5 Flash Image / Nano Banana route',
      'Multi-image fusion and character consistency',
      'Good speed-to-quality balance for final Google-credit runs',
      'Uses Google Cloud credits through Vertex auth'
    ],
    weaknesses: [
      'Less premium than Nano Banana Pro for final identity renders',
      'Preview image model availability can vary by project and region',
      'Requires Vertex AI project, region, and service-account or ADC auth'
    ],
    bestFor: [
      'Google Cloud credit-backed direct reference generations',
      'fast character finals with real references',
      'multi-reference fusion',
      'iterating before a final Pro render'
    ],
    avoidWhen: [
      'the final identity render needs the strongest Google model',
      'Vertex AI credentials are not configured'
    ],
    routingRoles: ['default', 'final_character', 'google_direct_reference', 'multi_reference', 'general']
  },
  {
    id: 'google/nano-banana-pro',
    displayName: 'Nano Banana Pro',
    provider: 'Google Vertex AI',
    providerAdapter: 'google',
    model: 'gemini-3-pro-image-preview',
    category: 'image-generation',
    qualityTier: 'ultra',
    costEstimateUsd: 0.08,
    costBasis: 'approximate Vertex Gemini 3 Pro Image preview estimate; verify against Google Cloud billing',
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsMultiReference: true,
    supportsEditing: true,
    maxReferenceImages: 10,
    strengths: [
      'Primary Google-credit final image route',
      'Direct reference-image input through Vertex Gemini Image',
      'Best Google lane for identity-critical character renders',
      'Stronger instruction following than the fast route',
      'Keeps spend on Google Cloud credits'
    ],
    weaknesses: [
      'Preview model availability can vary by project and region',
      'More expensive than Flash Image final runs',
      'Still needs realistic prompt constraints and clean references'
    ],
    bestFor: [
      'final character images with real references',
      'identity-preserving portraits',
      'premium Google-credit campaign visuals',
      'reference-heavy realistic renders'
    ],
    avoidWhen: [
      'the fast Google route is good enough',
      'Vertex Gemini Image preview is not available in the project',
      'fal.ai-only model behavior is specifically required'
    ],
    routingRoles: ['premium_google', 'google_direct_reference', 'multi_reference', 'complex_edit', 'premium_final_render']
  },
  {
    id: 'google/imagen-3-text-only',
    displayName: 'Imagen 3 Text-Only',
    provider: 'Google Vertex AI',
    providerAdapter: 'google',
    model: 'imagen-3.0-generate-001',
    category: 'image-generation',
    qualityTier: 'standard',
    costEstimateUsd: 0.04,
    costBasis: 'approximate Vertex AI Imagen 3 text-to-image estimate; no direct reference input in this route',
    supportsTextToImage: true,
    supportsImageToImage: false,
    supportsMultiReference: false,
    supportsEditing: false,
    maxReferenceImages: 0,
    strengths: [
      'Clean Google-credit text-to-image route',
      'Predictable bulk-style generation',
      'Useful when no identity references are attached'
    ],
    weaknesses: [
      'No direct reference-image input in this route',
      'Can drift or stylize character identity',
      'Not the default for realistic referenced people'
    ],
    bestFor: [
      'bulk clean generation',
      'simple no-reference final images',
      'Google Cloud credit-backed no-reference batches'
    ],
    avoidWhen: [
      'reference images are required',
      'identity preservation matters',
      'complex semantic edit is required',
      'premium final render is required'
    ],
    routingRoles: ['bulk_clean_generation', 'clean_text_to_image', 'legacy_imagen_text_only']
  },
  {
    id: 'openai/gpt-image-2',
    displayName: 'GPT Image 2',
    provider: 'OpenAI GPT Image via fal.ai',
    providerAdapter: 'fal',
    model: 'openai/gpt-image-2',
    category: 'image-generation',
    qualityTier: 'premium',
    costEstimateUsd: 0.12,
    costBasis: 'approximate fal.ai run estimate; final cost depends on size, quality, and edits',
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsMultiReference: true,
    supportsEditing: true,
    maxReferenceImages: 10,
    strengths: [
      'Complex instruction editing',
      'Semantic reference reasoning',
      'Preservation of important details',
      'Text and layout reasoning'
    ],
    weaknesses: [
      'Cost is less predictable',
      'Requires fal.ai API quota',
      'Not the leanest route for simple no-reference images'
    ],
    bestFor: [
      'complex edits',
      'semantic reference reasoning',
      'text/layout sensitive image work',
      'preservation-heavy transformations'
    ],
    avoidWhen: [
      'bulk no-reference generation is enough',
      'ultra-premium aesthetic render is the only goal'
    ],
    routingRoles: ['complex_edit', 'multi_reference', 'semantic_edit', 'text_rendering']
  },
  {
    id: 'openai/gpt-image-1.5',
    displayName: 'GPT Image 1.5',
    provider: 'OpenAI GPT Image via fal.ai',
    providerAdapter: 'fal',
    model: 'fal-ai/gpt-image-1.5',
    category: 'image-generation',
    qualityTier: 'standard',
    costEstimateUsd: 0.08,
    costBasis: 'approximate fal.ai run estimate; fallback route only',
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsMultiReference: true,
    supportsEditing: true,
    maxReferenceImages: 6,
    strengths: [
      'fal.ai-hosted GPT Image fallback route',
      'Useful for special feature compatibility',
      'Good instruction-following for edits'
    ],
    weaknesses: [
      'Requires fal.ai API quota',
      'Not the primary GPT Image route',
      'Use only when specifically needed or GPT Image 2 is unavailable'
    ],
    bestFor: [
      'fallback OpenAI image work',
      'special feature compatibility',
      'older prompt experiments'
    ],
    avoidWhen: [
      'GPT Image 2 is available',
      'a simple no-reference final is enough'
    ],
    routingRoles: ['fallback', 'special_feature']
  },
  {
    id: 'black-forest-labs/flux-2-pro',
    displayName: 'FLUX 2 Pro',
    provider: 'Black Forest Labs via fal.ai',
    providerAdapter: 'fal',
    model: 'fal-ai/flux-2-pro',
    category: 'image-generation',
    qualityTier: 'premium',
    costEstimateUsd: 0.08,
    costBasis: 'approximate fal.ai run estimate',
    supportsTextToImage: true,
    supportsImageToImage: false,
    supportsMultiReference: false,
    supportsEditing: false,
    maxReferenceImages: 0,
    strengths: [
      'Premium final render',
      'Cinematic aesthetic',
      'Strong lighting and realism',
      'High visual taste'
    ],
    weaknesses: [
      'More expensive than standard no-reference routes',
      'Text-to-image only in this fal.ai registry role'
    ],
    bestFor: [
      'premium final render',
      'cinematic realism',
      'marketing-grade hero visuals'
    ],
    avoidWhen: [
      'a lower-cost no-reference route is enough',
      'multi-reference reasoning is central',
      'reference-image editing is required'
    ],
    routingRoles: ['premium_final_render', 'complex_edit']
  },
  {
    id: 'black-forest-labs/flux-2-max',
    displayName: 'FLUX 2 Max',
    provider: 'Black Forest Labs via fal.ai',
    providerAdapter: 'fal',
    model: 'fal-ai/flux-2-max',
    category: 'image-generation',
    qualityTier: 'ultra',
    costEstimateUsd: 0.16,
    costBasis: 'approximate fal.ai run estimate; expensive final-only route',
    supportsTextToImage: true,
    supportsImageToImage: false,
    supportsMultiReference: false,
    supportsEditing: false,
    maxReferenceImages: 0,
    strengths: [
      'Ultra-premium final output',
      'Highest-fidelity route',
      'Strong realism and finish'
    ],
    weaknesses: [
      'Expensive',
      'Not appropriate for bulk runs',
      'Text-to-image only in this fal.ai registry role'
    ],
    bestFor: [
      'final-only hero images',
      'highest-fidelity cinematic renders',
      'premium production outputs'
    ],
    avoidWhen: [
      'bulk generation',
      'bulk generation',
      'budget-sensitive work'
    ],
    routingRoles: ['ultra_premium_final']
  },
  {
    id: 'bytedance/seedream-5-lite',
    displayName: 'Seedream 5 Lite',
    provider: 'ByteDance via fal.ai',
    providerAdapter: 'fal',
    model: 'fal-ai/bytedance/seedream/v5/lite/text-to-image',
    category: 'image-generation',
    qualityTier: 'standard',
    costEstimateUsd: 0.045,
    costBasis: 'approximate fal.ai run estimate',
    supportsTextToImage: true,
    supportsImageToImage: true,
    supportsMultiReference: true,
    supportsEditing: true,
    maxReferenceImages: 6,
    strengths: [
      'Mid-cost reasoning and editing',
      'Example-based editing',
      'Multi-image blending',
      'Useful fal.ai fallback when Vertex is not the right tool'
    ],
    weaknesses: [
      'Not the leanest utility edit',
      'Not the highest-fidelity final route'
    ],
    bestFor: [
      'mid-cost multi-reference edits',
      'example-based transformations',
      'reference blending'
    ],
    avoidWhen: [
      'simple utility edits are enough',
      'ultra-premium final finish is required'
    ],
    routingRoles: ['multi_reference', 'complex_edit', 'standard_edit']
  },
  {
    id: 'fal/qwen-image-2-edit',
    displayName: 'Qwen Image 2 Edit',
    provider: 'Qwen Image via fal.ai',
    providerAdapter: 'fal',
    model: 'fal-ai/qwen-image-2/edit',
    category: 'image-editing',
    qualityTier: 'utility',
    costEstimateUsd: 0.01,
    costBasis: 'approximate fal.ai run estimate',
    supportsTextToImage: false,
    supportsImageToImage: true,
    supportsMultiReference: false,
    supportsEditing: true,
    maxReferenceImages: 1,
    strengths: [
      'fal-native utility edit',
      'Fast reference-image transformations',
      'Good for low-risk iteration and cleanup'
    ],
    weaknesses: [
      'Not a final-render route',
      'Not suitable for multi-reference reasoning',
      'Requires a reference image'
    ],
    bestFor: [
      'utility edits',
      'preview transformations',
      'utility image-to-image experiments'
    ],
    avoidWhen: [
      'final render quality matters',
      'text-to-image generation is required',
      'multi-reference blending is required'
    ],
    routingRoles: ['utility_edit', 'object_product_final']
  }
]);

const MODEL_ALIASES = Object.freeze({
  'google/imagen-4': 'google/imagen-3-text-only',
  'prunaai/p-image-edit': 'fal/qwen-image-2-edit'
});

const MODEL_BY_ID = new Map(IMAGE_MODELS.map(model => [model.id, model]));

function canonicalModelId(id = '') {
  const raw = String(id || '').trim();
  return MODEL_ALIASES[raw] || raw;
}

function parseUsdZarRate(env = process.env) {
  const parsed = Number.parseFloat(String(env.USD_ZAR_RATE || '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function estimateZar(usd, env = process.env) {
  const rate = parseUsdZarRate(env) || DEFAULT_USD_ZAR_RATE;
  if (!rate || !Number.isFinite(Number(usd))) return null;
  return Number((Number(usd) * rate).toFixed(2));
}

function isZarEstimateApproximate(env = process.env) {
  return !parseUsdZarRate(env);
}

function clonePublicModel(model, env = process.env) {
  if (!model) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: model.id,
    displayName: model.displayName,
    provider: model.provider,
    providerAdapter: model.providerAdapter,
    model: model.model,
    category: model.category,
    qualityTier: model.qualityTier,
    costEstimateUsd: model.costEstimateUsd,
    costEstimateZar: estimateZar(model.costEstimateUsd, env),
    costEstimateZarApproximate: isZarEstimateApproximate(env),
    usdZarRateUsed: parseUsdZarRate(env) || DEFAULT_USD_ZAR_RATE,
    costBasis: model.costBasis,
    supportsTextToImage: Boolean(model.supportsTextToImage),
    supportsImageToImage: Boolean(model.supportsImageToImage),
    supportsMultiReference: Boolean(model.supportsMultiReference),
    supportsEditing: Boolean(model.supportsEditing),
    maxReferenceImages: Number(model.maxReferenceImages || 0),
    strengths: [...(model.strengths || [])],
    weaknesses: [...(model.weaknesses || [])],
    bestFor: [...(model.bestFor || [])],
    avoidWhen: [...(model.avoidWhen || [])],
    routingRoles: [...(model.routingRoles || [])]
  };
}

function listImageModels() {
  return IMAGE_MODELS.map(model => ({ ...model }));
}

function listPublicImageModels(env = process.env) {
  return IMAGE_MODELS.map(model => clonePublicModel(model, env));
}

function getImageModel(id) {
  const model = MODEL_BY_ID.get(canonicalModelId(id));
  return model ? { ...model } : null;
}

function getPublicImageModel(id, env = process.env) {
  return clonePublicModel(MODEL_BY_ID.get(canonicalModelId(id)), env);
}

function getProviderAdapterForModel(id) {
  const model = MODEL_BY_ID.get(canonicalModelId(id));
  return model?.providerAdapter || null;
}

function normalizeRoutingRequest(input = {}) {
  const referenceCount = Math.max(0, Number.parseInt(input.referenceCount || 0, 10) || 0);
  return {
    intent: String(input.intent || 'final_character').trim().toLowerCase(),
    referenceCount,
    requiresEditing: Boolean(input.requiresEditing),
    requiresTextRendering: Boolean(input.requiresTextRendering),
    quality: String(input.quality || '').trim().toLowerCase(),
    budgetTier: String(input.budgetTier || '').trim().toLowerCase(),
    preferredModel: canonicalModelId(input.preferredModel || '')
  };
}

function modelSupportsRequest(model, request = {}) {
  if (!model) return false;
  const normalized = normalizeRoutingRequest(request);

  if (normalized.referenceCount > 0) {
    if (normalized.referenceCount > 1 && !model.supportsMultiReference) return false;
    if (!model.supportsImageToImage) return false;
    if (Number(model.maxReferenceImages || 0) < normalized.referenceCount) return false;
  }

  if (normalized.requiresEditing && !model.supportsEditing) return false;

  const textToImageOnly = normalized.referenceCount === 0 && !normalized.requiresEditing;
  if (textToImageOnly && !model.supportsTextToImage) return false;

  return true;
}

function priorityForRequest(request = {}) {
  const normalized = normalizeRoutingRequest(request);

  if (normalized.intent === 'final_character') {
    return normalized.budgetTier === 'fal_full_ai'
      ? ['openai/gpt-image-2', 'bytedance/seedream-5-lite', 'openai/gpt-image-1.5']
      : ['google/nano-banana-pro', 'google/nano-banana-2', 'openai/gpt-image-2', 'bytedance/seedream-5-lite'];
  }

  if (normalized.intent === 'broll_final' || normalized.intent === 'object_product_final') {
    return normalized.referenceCount > 0 || normalized.requiresEditing
      ? ['google/nano-banana-pro', 'google/nano-banana-2', 'bytedance/seedream-5-lite', 'openai/gpt-image-2']
      : ['google/imagen-3-text-only', 'google/nano-banana-2', 'black-forest-labs/flux-2-pro'];
  }

  if (normalized.intent === 'no_reference_scene') {
    return normalized.referenceCount > 0 || normalized.requiresEditing
      ? ['google/nano-banana-pro', 'google/nano-banana-2']
      : ['google/imagen-3-text-only', 'black-forest-labs/flux-2-pro', 'google/nano-banana-2'];
  }

  if (normalized.intent === 'ultra_premium_final' || normalized.quality === 'ultra') {
    return [
      'black-forest-labs/flux-2-max',
      'black-forest-labs/flux-2-pro',
      'openai/gpt-image-2'
    ];
  }

  if (normalized.intent === 'premium_final_render' || normalized.quality === 'premium') {
    if ((normalized.referenceCount > 0 || normalized.requiresEditing) && normalized.budgetTier === 'google_credits') {
      return [
        'google/nano-banana-pro',
        'google/nano-banana-2',
        'openai/gpt-image-2',
        'bytedance/seedream-5-lite',
        'black-forest-labs/flux-2-pro'
      ];
    }
    return [
      'black-forest-labs/flux-2-pro',
      'black-forest-labs/flux-2-max',
      'openai/gpt-image-2'
    ];
  }

  if (normalized.intent === 'utility_edit') {
    return [
      'fal/qwen-image-2-edit',
      'google/nano-banana-2',
      'bytedance/seedream-5-lite',
      'openai/gpt-image-2'
    ];
  }

  if (normalized.intent === 'complex_edit' || normalized.requiresTextRendering) {
    if (normalized.referenceCount > 0 && normalized.budgetTier === 'google_credits') {
      return [
        'google/nano-banana-pro',
        'google/nano-banana-2',
        'openai/gpt-image-2',
        'bytedance/seedream-5-lite'
      ];
    }
    return [
      'openai/gpt-image-2',
      'bytedance/seedream-5-lite',
      'black-forest-labs/flux-2-pro',
      'openai/gpt-image-1.5'
    ];
  }

  if (normalized.intent === 'multi_reference' || normalized.referenceCount > 1) {
    if (normalized.budgetTier === 'google_credits') {
      return [
        'google/nano-banana-pro',
        'google/nano-banana-2',
        'bytedance/seedream-5-lite',
        'openai/gpt-image-2'
      ];
    }
    return [
      'bytedance/seedream-5-lite',
      'openai/gpt-image-2',
      'openai/gpt-image-1.5',
      'fal/qwen-image-2-edit'
    ];
  }

  if (normalized.intent === 'bulk_clean_generation') {
    return normalized.referenceCount > 0 || normalized.requiresEditing
      ? ['google/nano-banana-pro', 'google/nano-banana-2', 'bytedance/seedream-5-lite', 'openai/gpt-image-2', 'fal/qwen-image-2-edit']
      : ['google/imagen-3-text-only', 'google/nano-banana-2', 'black-forest-labs/flux-2-pro'];
  }

  if (normalized.intent === 'cheap_draft') {
    if (normalized.referenceCount > 0 && normalized.budgetTier === 'google_credits') {
      return ['google/nano-banana-pro', 'google/nano-banana-2', 'bytedance/seedream-5-lite', 'openai/gpt-image-2'];
    }
    if (normalized.requiresEditing && normalized.referenceCount <= 1 && ['cheap', 'low', 'lowest', 'utility'].includes(normalized.budgetTier)) {
      return ['fal/qwen-image-2-edit', 'bytedance/seedream-5-lite', 'openai/gpt-image-2'];
    }
    if (normalized.referenceCount > 0 || normalized.requiresEditing) {
      return ['fal/qwen-image-2-edit', 'bytedance/seedream-5-lite', 'openai/gpt-image-2'];
    }
    if (['cheap', 'low', 'lowest', 'bulk'].includes(normalized.budgetTier)) {
      return ['google/imagen-3-text-only', 'google/nano-banana-2', 'fal/qwen-image-2-edit'];
    }
    return ['google/nano-banana-2', 'google/imagen-3-text-only', 'fal/qwen-image-2-edit'];
  }

  return ['google/nano-banana-2', 'google/nano-banana-pro', 'google/imagen-3-text-only', 'openai/gpt-image-2', 'black-forest-labs/flux-2-pro'];
}

function buildCandidateList(request = {}) {
  const priorityIds = priorityForRequest(request);
  const seen = new Set();
  const ordered = [];

  for (const id of priorityIds) {
    const model = MODEL_BY_ID.get(id);
    if (model && !seen.has(id)) {
      ordered.push(model);
      seen.add(id);
    }
  }

  for (const model of IMAGE_MODELS) {
    if (!seen.has(model.id)) ordered.push(model);
  }

  return ordered.filter(model => modelSupportsRequest(model, request));
}

function selectImageModel(input = {}, env = process.env) {
  const request = normalizeRoutingRequest(input);
  const reasoning = [];

  if (request.preferredModel) {
    const preferred = MODEL_BY_ID.get(request.preferredModel);
    if (preferred && modelSupportsRequest(preferred, request)) {
      const aliased = request.preferredModel !== String(input.preferredModel || '').trim();
      reasoning.push(aliased
        ? `Deprecated preferred model ${input.preferredModel} was mapped to ${preferred.id}.`
        : `Preferred model ${preferred.id} supports this request and was selected.`);
      const alternatives = buildCandidateList(request)
        .filter(model => model.id !== preferred.id)
        .slice(0, 3)
        .map(model => clonePublicModel(model, env));
      return {
        selectedModel: clonePublicModel(preferred, env),
        alternatives,
        reasoning,
        estimatedCostUsd: preferred.costEstimateUsd,
        estimatedCostZar: estimateZar(preferred.costEstimateUsd, env)
      };
    }
    if (!preferred) {
      reasoning.push(`Preferred model ${request.preferredModel} is not registered; selected the closest valid route.`);
    } else {
      reasoning.push(`Preferred model ${preferred.id} does not support the requested inputs; selected the closest valid route.`);
    }
  }

  const candidates = buildCandidateList(request);
  const selected = candidates[0] || IMAGE_MODELS[0];
  const alternatives = candidates
    .filter(model => model.id !== selected.id)
    .slice(0, 3)
    .map(model => clonePublicModel(model, env));

  reasoning.push(`Intent ${request.intent || 'final_character'} routed to ${selected.id}.`);
  if (request.referenceCount > 1) reasoning.push('Multi-reference support was required.');
  if (request.requiresEditing) reasoning.push('Editing support was required.');
  if (request.requiresTextRendering) reasoning.push('Text/layout reasoning was requested.');
  if (request.quality) reasoning.push(`Quality preference: ${request.quality}.`);
  if (request.budgetTier) reasoning.push(`Budget tier: ${request.budgetTier}.`);

  return {
    selectedModel: clonePublicModel(selected, env),
    alternatives,
    reasoning,
    estimatedCostUsd: selected.costEstimateUsd,
    estimatedCostZar: estimateZar(selected.costEstimateUsd, env)
  };
}

function assertRegistryIntegrity() {
  for (const model of IMAGE_MODELS) {
    if (!model.id || !model.displayName || !model.model) {
      throw new Error(`Invalid image model registry entry: ${model.id || '<missing id>'}`);
    }
    if (!PROVIDER_ADAPTERS.includes(model.providerAdapter)) {
      throw new Error(`Invalid provider adapter for ${model.id}`);
    }
    if (!QUALITY_TIERS.includes(model.qualityTier)) {
      throw new Error(`Invalid quality tier for ${model.id}`);
    }
    if (model.id.startsWith('google/') && model.providerAdapter !== 'google') {
      throw new Error(`Google model ${model.id} must use the google adapter.`);
    }
    if (!model.id.startsWith('google/') && model.providerAdapter !== 'fal') {
      throw new Error(`Non-Google image model ${model.id} must use the fal adapter.`);
    }
  }
  return true;
}

module.exports = {
  SCHEMA_VERSION,
  PROVIDER_ADAPTERS,
  QUALITY_TIERS,
  IMAGE_MODELS,
  assertRegistryIntegrity,
  estimateZar,
  getImageModel,
  getProviderAdapterForModel,
  getPublicImageModel,
  listImageModels,
  listPublicImageModels,
  modelSupportsRequest,
  normalizeRoutingRequest,
  selectImageModel
};
