const express = require('express');
const {
  assertRegistryIntegrity,
  selectImageModel
} = require('../lib/imageGeneration/modelRegistry');
const { getProviderAdapter } = require('../lib/imageGeneration/providers');
const {
  publicProviderStatus,
  readinessForModel,
  resolveImageProviderEnv
} = require('../lib/imageGeneration/providerVault');
const {
  generationIdFromBody,
  markGenerationPending,
  markGenerationComplete,
  markGenerationFailed
} = require('../lib/imageGeneration/generationStatusStore');

const router = express.Router();

const MAX_PROMPT_CHARS = 12000;
const MAX_REFERENCE_IMAGES = 10;
const MAX_REFERENCE_CHARS = 7_500_000;
const SUPPORTED_ASPECT_RATIOS = new Set(['1:1', '4:5', '9:16', '16:9', 'portrait', 'landscape', 'square']);
const SPEND_LANES = new Set(['google_credits', 'fal_full_ai', 'auto_best']);
const REALISM_NEGATIVE_PROMPT = [
  'cartoon',
  'cartoonish',
  'anime',
  'illustration',
  'avatar',
  '3d render',
  'cgi',
  'plastic skin',
  'wax skin',
  'beauty filter',
  'generic face',
  'wrong face',
  'wrong age',
  'wrong skin tone',
  'wrong hair',
  'over-smoothed pores',
  'AI portrait look',
  'stock photo cliche',
  'unrealistic eyes',
  'warped hands',
  'extra fingers',
  'social media frame',
  'Instagram UI',
  'username',
  'caption text',
  'white border',
  'post template',
  'mockup',
  'poster',
  'graphic design',
  'watermark',
  'text in image',
  'phone screenshot',
  'UI chrome',
  'white card'
].join(', ');

function requestId() {
  return `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function elapsedMs(startedAt) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function validationError(code, message, statusCode = 400) {
  const err = new Error(message);
  err.code = code;
  err.safeMessage = message;
  err.statusCode = statusCode;
  return err;
}

function normalizeSpendLane(value = '') {
  const lane = String(value || '').trim().toLowerCase();
  return SPEND_LANES.has(lane) ? lane : 'auto_best';
}

function preferredGoogleModelForRequest(body = {}) {
  const preferred = String(body.preferredModel || body.modelId || '').trim();
  const jobType = String(body.jobType || '').trim();
  if (preferred.startsWith('google/')) {
    if (referenceCountForBody(body) > 0 && preferred === 'google/imagen-4') return 'google/nano-banana-pro';
    if (referenceCountForBody(body) > 0 && preferred === 'google/imagen-3-text-only') return 'google/nano-banana-pro';
    return preferred;
  }
  if (referenceCountForBody(body) > 0 || body.requiresEditing || body.editMode) return 'google/nano-banana-pro';
  if (jobType === 'no_reference_scene' || String(body.intent || '').trim() === 'no_reference_scene') return 'google/imagen-3-text-only';
  if (jobType === 'broll_final' || jobType === 'object_product_final') return 'google/imagen-3-text-only';
  return String(body.intent || '').trim() === 'bulk_clean_generation' ? 'google/imagen-3-text-only' : 'google/nano-banana-pro';
}

function preferredFalModelForRequest(body = {}) {
  const preferred = String(body.preferredModel || body.modelId || '').trim();
  if (preferred && !preferred.startsWith('google/')) return preferred;
  const intent = String(body.jobType || body.intent || '').trim();
  if (intent === 'object_product_final' || intent === 'utility_edit') return 'fal/qwen-image-2-edit';
  if (intent === 'broll_final' || intent === 'multi_reference') return 'bytedance/seedream-5-lite';
  if (intent === 'no_reference_scene' || intent === 'premium_final_render') return 'black-forest-labs/flux-2-pro';
  if (intent === 'ultra_premium_final') return 'black-forest-labs/flux-2-max';
  return 'openai/gpt-image-2';
}

function referenceCountForBody(body = {}) {
  return Array.isArray(body.referenceImages) ? body.referenceImages.length : Number(body.referenceCount || 0);
}

function identityPackReferences(identityPack = {}) {
  if (!identityPack || typeof identityPack !== 'object') return [];
  if (Array.isArray(identityPack.references)) return identityPack.references;
  if (Array.isArray(identityPack.items)) return identityPack.items;
  return [
    identityPack.primaryFace,
    identityPack.primaryBody,
    ...(Array.isArray(identityPack.supportingRefs) ? identityPack.supportingRefs : []),
    identityPack.faceContactSheet,
    identityPack.bodyContactSheet
  ].filter(Boolean);
}

function normalizeBodyReferences(body = {}) {
  const packRefs = identityPackReferences(body.identityPack);
  if (!packRefs.length || (Array.isArray(body.referenceImages) && body.referenceImages.length)) return body;
  return {
    ...body,
    referenceImages: packRefs
  };
}

function referencePayloadValue(ref) {
  if (typeof ref === 'string') return ref;
  if (!ref || typeof ref !== 'object') return '';
  return String(ref.dataUrl || ref.imageData || ref.src || ref.url || ref.data || ref.vaultRef || ref.vaultReference || ref.vault || '');
}

function isDataUrlReference(value = '') {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(String(value || '').trim());
}

function isHttpReference(value = '') {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isVaultReference(value = '') {
  return /^vault:[a-z0-9_.:-]+$/i.test(String(value || '').trim());
}

function isValidReferencePayload(value = '') {
  const raw = String(value || '').trim();
  return isDataUrlReference(raw) || isHttpReference(raw) || isVaultReference(raw);
}

function isIdentityCriticalRequest(body = {}) {
  const referenceCount = referenceCountForBody(body);
  if (referenceCount < 1) return false;
  const referenceMode = String(body.referenceMode || '').trim();
  const realismMode = String(body.realismMode || '').trim();
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  const intent = String(body.intent || '').trim();
  return (
    referenceMode === 'direct_reference_edit' ||
    realismMode === 'photo_identity_lock' ||
    Boolean(metadata.character) ||
    intent === 'complex_edit' ||
    intent === 'final_character' ||
    intent === 'multi_reference'
  );
}

function routingInputForSpendLane(body = {}, spendLane = normalizeSpendLane(body.spendLane)) {
  const referenceCount = referenceCountForBody(body);
  const jobType = String(body.jobType || '').trim();
  const base = {
    intent: jobType || body.intent,
    referenceCount,
    requiresEditing: body.requiresEditing || Boolean(body.editMode),
    requiresTextRendering: body.requiresTextRendering,
    quality: body.quality,
    budgetTier: body.budgetTier,
    preferredModel: body.preferredModel || body.modelId
  };

  if (spendLane === 'google_credits') {
    return {
      ...base,
      preferredModel: preferredGoogleModelForRequest(body),
      budgetTier: body.budgetTier || 'google_credits'
    };
  }

  if (spendLane === 'fal_full_ai') {
    return {
      ...base,
      preferredModel: preferredFalModelForRequest(body),
      budgetTier: body.budgetTier || 'full_ai'
    };
  }

  if (spendLane === 'auto_best' && isIdentityCriticalRequest(body)) {
    const preferred = String(body.preferredModel || body.modelId || '').trim();
    return {
      ...base,
      intent: 'complex_edit',
      requiresEditing: true,
      quality: body.quality || 'premium',
      preferredModel: preferred && preferred.startsWith('google/') ? preferredGoogleModelForRequest(body) : 'google/nano-banana-pro',
      budgetTier: body.budgetTier || 'google_credits'
    };
  }

  return base;
}

function bodyForSelectedModelValidation(body = {}, selectedModel, spendLane) {
  return body;
}

function referenceStrategyFor(body = {}, selectedModel, spendLane) {
  const referenceCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : Number(body.referenceCount || 0);
  if (selectedModel?.providerAdapter === 'google' && referenceCount > 0 && selectedModel?.supportsImageToImage) {
    return 'google_direct_reference_images';
  }
  if (referenceCount > 0) return 'direct_reference_images';
  return 'text_to_image';
}

function actualSpendProviderFor(selectedModel, spendLane) {
  if (spendLane === 'google_credits') return 'google_cloud_vertex';
  if (spendLane === 'fal_full_ai') return 'fal_ai';
  if (selectedModel?.providerAdapter === 'google') return 'google_cloud_vertex';
  if (selectedModel?.providerAdapter === 'fal') return 'fal_ai';
  return selectedModel?.providerAdapter || 'image_router';
}

function buildReferenceAnalysisPrompt(body = {}) {
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
  return [
    'Analyze these reference images for final photoreal image generation.',
    'Return compact structured production notes. Do not write prose filler.',
    'Required sections: face geometry, age read, skin tone, hair, eyewear/jewelry, body/build/posture, wardrobe, realism texture, forbidden changes.',
    'Be strict about identity preservation and anti-cartoon realism. Do not invent names or private facts. Do not describe the file format.',
    metadata.character ? `Character route: ${metadata.character}.` : '',
    `Image prompt goal: ${String(body.prompt || '').trim()}`
  ].filter(Boolean).join('\n');
}

function appendReferenceAnalysisPrompt(prompt = '', analysis = '') {
  const clean = String(analysis || '').trim();
  if (!clean) return String(prompt || '').trim();
  return [
    String(prompt || '').trim(),
    '',
    'STRICT BEST-EFFORT IDENTITY LOCK FROM VERTEX VISUAL ANALYSIS:',
    clean,
    '',
    'Use the analysis above as the identity/reference lock. Generate a new photoreal image from text with Vertex Imagen. This is not direct reference editing, so do not redesign the face, age, skin tone, hair, build, posture, or character aura. Avoid stylization unless explicitly requested.'
  ].join('\n');
}

function mergeNegativePrompt(...parts) {
  const seen = new Set();
  return parts
    .flatMap(part => String(part || '').split(','))
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

function normalizeCandidateCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function referenceModeFor(body = {}, selectedModel, spendLane) {
  const strategy = referenceStrategyFor(body, selectedModel, spendLane);
  if (strategy === 'google_direct_reference_images') return 'direct_reference_edit';
  const explicit = String(body.referenceMode || '').trim();
  if (explicit) return explicit;
  if (strategy === 'direct_reference_images') return 'direct_reference_edit';
  return 'text_to_image';
}

function routeWarningsFor(body = {}, selectedModel, spendLane) {
  const warnings = [];
  const referenceCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : Number(body.referenceCount || 0);
  if (selectedModel?.id === 'google/imagen-3-text-only' && referenceCount > 0) {
    warnings.push('Imagen text-only does not accept reference images. Use Nano Banana Pro or Nano Banana 2 for Google direct references.');
  }
  if (referenceCount > 0 && !selectedModel?.supportsImageToImage) {
    warnings.push('Reference images require a direct-reference route. Imagen is no-reference only.');
  }
  if (spendLane === 'auto_best' && selectedModel?.providerAdapter !== 'google') {
    warnings.push('Auto Best selected a non-Google route and may leave Google Cloud credits.');
  }
  return warnings;
}

function validateBasicRequest(body = {}) {
  const prompt = String(body.prompt || '').trim();
  const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages : [];

  if (!prompt) {
    throw validationError('PROMPT_REQUIRED', 'Prompt is required before image generation.');
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw validationError('PROMPT_TOO_LONG', `Prompt is too long. Keep it under ${MAX_PROMPT_CHARS} characters.`, 413);
  }
  if (referenceImages.length > MAX_REFERENCE_IMAGES) {
    throw validationError('TOO_MANY_REFERENCE_IMAGES', `Too many reference images. Maximum supported by the router is ${MAX_REFERENCE_IMAGES}.`, 413);
  }
  for (const [index, ref] of referenceImages.entries()) {
    if (typeof ref !== 'string' && (!ref || typeof ref !== 'object')) {
      throw validationError('REFERENCE_IMAGE_INVALID', `Reference image ${index + 1} must be a string or labeled reference object.`);
    }
    const value = referencePayloadValue(ref);
    if (!value) {
      throw validationError('REFERENCE_IMAGE_INVALID', `Reference image ${index + 1} is missing dataUrl, imageData, url, data, or vaultRef.`);
    }
    if (isVaultReference(value)) {
      throw validationError('REFERENCE_IMAGE_UNRESOLVED', `Reference image ${index + 1} is an unresolved vault placeholder. Reload the generator or open Assets Vault so the browser can send the actual image data.`, 400);
    }
    if (!isValidReferencePayload(value)) {
      throw validationError('REFERENCE_IMAGE_INVALID', `Reference image ${index + 1} must resolve to a data URL or HTTP(S) image URL before generation.`);
    }
    if (value.length > MAX_REFERENCE_CHARS) {
      throw validationError('REFERENCE_IMAGE_TOO_LARGE', `Reference image ${index + 1} is too large for the router payload.`, 413);
    }
  }
  if (body.aspectRatio && !SUPPORTED_ASPECT_RATIOS.has(String(body.aspectRatio))) {
    throw validationError('ASPECT_RATIO_UNSUPPORTED', 'Unsupported aspect ratio for the image router.');
  }
}

function validateSelectedModelRequest(body = {}, selectedModel) {
  const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages : [];
  if (!selectedModel.supportsTextToImage && referenceImages.length === 0) {
    throw validationError('MODEL_CAPABILITY_MISMATCH', `${selectedModel.displayName} requires a reference image and cannot run text-to-image alone.`);
  }
  if (referenceImages.length > 0 && !selectedModel.supportsImageToImage) {
    throw validationError('MODEL_CAPABILITY_MISMATCH', `${selectedModel.displayName} does not support reference-image input.`);
  }
  if (referenceImages.length > 1 && !selectedModel.supportsMultiReference) {
    throw validationError('MODEL_CAPABILITY_MISMATCH', `${selectedModel.displayName} is not a multi-reference route.`);
  }
  if (referenceImages.length > Number(selectedModel.maxReferenceImages || 0)) {
    throw validationError('MODEL_CAPABILITY_MISMATCH', `${selectedModel.displayName} supports at most ${selectedModel.maxReferenceImages || 0} reference image(s).`);
  }
  if (body.requiresEditing && !selectedModel.supportsEditing) {
    throw validationError('MODEL_CAPABILITY_MISMATCH', `${selectedModel.displayName} does not support editing requests.`);
  }
}

function normalizedGenerationRequest(body = {}, selectedModel) {
  return {
    modelId: selectedModel.id,
    prompt: String(body.prompt || '').trim(),
    negativePrompt: String(body.negativePrompt || body.negPrompt || '').trim(),
    referenceImages: Array.isArray(body.referenceImages) ? body.referenceImages : [],
    aspectRatio: body.aspectRatio || null,
    resolution: body.resolution || null,
    quality: body.quality || selectedModel.qualityTier,
    realismMode: body.realismMode || null,
    referenceMode: body.referenceMode || null,
    outputFormatMode: body.outputFormatMode || null,
    identityMode: body.identityMode || null,
    strictNoFrame: Boolean(body.strictNoFrame),
    referencePackVersion: body.referencePackVersion || null,
    identityPackVersion: body.identityPack?.version || body.identityPackVersion || null,
    promptContractVersion: body.promptContractVersion || null,
    jobType: body.jobType || body.intent || null,
    generatorRecipe: body.generatorRecipe && typeof body.generatorRecipe === 'object' ? body.generatorRecipe : null,
    wardrobePack: body.wardrobePack && typeof body.wardrobePack === 'object' ? body.wardrobePack : null,
    scenePack: body.scenePack && typeof body.scenePack === 'object' ? body.scenePack : null,
    variationSeed: body.variationSeed || null,
    lockedFields: body.lockedFields && typeof body.lockedFields === 'object' ? body.lockedFields : null,
    candidateCount: normalizeCandidateCount(body.candidateCount),
    editMode: body.editMode || null,
    metadata: {
      ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      generatorRecipe: body.generatorRecipe && typeof body.generatorRecipe === 'object' ? body.generatorRecipe : undefined,
      wardrobePack: body.wardrobePack && typeof body.wardrobePack === 'object' ? body.wardrobePack : undefined,
      scenePack: body.scenePack && typeof body.scenePack === 'object' ? body.scenePack : undefined,
      variationSeed: body.variationSeed || undefined,
      lockedFields: body.lockedFields && typeof body.lockedFields === 'object' ? body.lockedFields : undefined,
      routedAt: new Date().toISOString()
    }
  };
}

function shouldRunIdentityQa(body = {}, providerResult = {}) {
  const identityMode = String(body.identityMode || '').trim();
  const refs = Array.isArray(body.referenceImages) ? body.referenceImages : [];
  const images = Array.isArray(providerResult.images) ? providerResult.images : [];
  return identityMode === 'exact_character' && refs.length > 0 && images.length > 0;
}

function buildIdentityQaPrompt(body = {}) {
  return [
    'Compare the generated image against the supplied character reference pack.',
    'Return one JSON object only: {"identityScore": number from 0 to 100, "identityVerdict": "looks_aligned" | "uncertain" | "mismatch_suspected", "mismatchNotes": string[], "evidence": {"face": string, "body": string, "skinTone": string, "hair": string}}.',
    'This is advisory QA only. Do not call the output accepted; the human reviewer decides whether it is gallery-ready.',
    'looks_aligned requires specific visible evidence against the face and body references. If you cannot cite concrete face/body evidence, return uncertain even when the image looks generally plausible.',
    'Use these conservative thresholds: looks_aligned is 90-100 with clear visual evidence, uncertain is 75-89, mismatch_suspected is below 75.',
    'Judge whether the face, age, skin tone, hair, eyewear, build, posture, and aura match the PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE and FULL BODY / BUILD CONTACT SHEET REFERENCE.',
    'Also flag if the generated image contains social-media UI, username, caption text, border, poster/mockup layout, watermark, or any frame inside the pixels.',
    `Original prompt: ${String(body.prompt || '').slice(0, 4000)}`
  ].join('\n');
}

function normalizeIdentityVerdict(verdict, score) {
  if (Number.isFinite(score)) {
    if (score >= 90) return 'looks_aligned';
    if (score >= 75) return 'uncertain';
    return 'mismatch_suspected';
  }
  const value = String(verdict || '').trim().toLowerCase();
  if (value === 'pass' || value === 'accepted' || value === 'looks_aligned') return 'looks_aligned';
  if (value === 'fail' || value === 'rejected' || value === 'mismatch_suspected') return 'mismatch_suspected';
  if (value === 'borderline' || value === 'uncertain') return 'uncertain';
  return 'unchecked';
}

function identityQaEvidenceFromParsed(parsed = {}) {
  const evidence = parsed.evidence || parsed.identityEvidence || parsed.comparisonEvidence || parsed.visualEvidence || null;
  if (Array.isArray(evidence)) return evidence.map(item => String(item || '').trim()).filter(Boolean).slice(0, 6);
  if (evidence && typeof evidence === 'object') {
    return Object.fromEntries(Object.entries(evidence)
      .map(([key, value]) => [key, String(value || '').trim()])
      .filter(([, value]) => value.length));
  }
  return {};
}

function identityQaHasSpecificEvidence(parsed = {}) {
  const evidence = identityQaEvidenceFromParsed(parsed);
  const values = Array.isArray(evidence) ? evidence : Object.values(evidence);
  const joined = values.join(' ').toLowerCase();
  const hasLongEvidence = values.some(value => String(value || '').trim().length >= 18);
  const mentionsComparison = /reference|generated|face|body|skin|hair|jaw|eyes|nose|mouth|build|posture|glasses/.test(joined);
  return hasLongEvidence && mentionsComparison;
}

function extractIdentityQa(text = '') {
  const raw = String(text || '').trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const score = Number(parsed.identityScore);
      const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
      let identityVerdict = normalizeIdentityVerdict(parsed.identityVerdict, normalizedScore);
      const evidence = identityQaEvidenceFromParsed(parsed);
      const hasEvidence = identityQaHasSpecificEvidence(parsed);
      if (identityVerdict === 'looks_aligned' && !hasEvidence) {
        identityVerdict = 'uncertain';
      }
      const parsedNotes = Array.isArray(parsed.mismatchNotes) ? parsed.mismatchNotes.map(item => String(item)).filter(Boolean).slice(0, 6) : [];
      const mismatchNotes = parsedNotes.length || hasEvidence
        ? parsedNotes
        : ['Identity QA did not include enough comparison evidence.'];
      return {
        identityScore: normalizedScore,
        identityVerdict,
        mismatchNotes,
        evidence
      };
    } catch (_) {}
  }
  return {
    identityScore: null,
    identityVerdict: raw ? 'uncertain' : 'unchecked',
    mismatchNotes: raw ? ['Identity QA returned malformed output: ' + raw.slice(0, 420)] : ['Identity QA returned no structured result.'],
    evidence: {}
  };
}

async function runIdentityQa({ adapter, body, providerResult, env }) {
  if (!shouldRunIdentityQa(body, providerResult) || typeof adapter.reasonAboutImages !== 'function') {
    return {
      identityScore: null,
      identityVerdict: shouldRunIdentityQa(body, providerResult) ? 'unchecked' : null,
      mismatchNotes: shouldRunIdentityQa(body, providerResult) ? ['Identity QA unavailable for this route.'] : [],
      evidence: {},
      providerModel: null
    };
  }
  const output = providerResult.images[0]?.dataUrl || providerResult.images[0]?.url || '';
  const referenceImages = [
    ...(Array.isArray(body.referenceImages) ? body.referenceImages : []),
    output ? { type: 'generated_output', label: 'GENERATED OUTPUT TO COMPARE', priority: 99, dataUrl: output, url: output } : null
  ].filter(Boolean);
  const result = await adapter.reasonAboutImages({
    prompt: buildIdentityQaPrompt(body),
    referenceImages
  }, { env });
  return {
    ...extractIdentityQa(result?.text || ''),
    providerModel: result?.providerModel || null
  };
}

function isVertexPermissionDenied(err) {
  const code = String(err?.code || err?.status || '').trim();
  const message = String(err?.message || err?.details || err?.causeMessage || '');
  return code === '7' || /PERMISSION_DENIED|aiplatform\.endpoints\.predict|permission .*denied/i.test(message);
}

function publicProviderError(err, routing, meta = {}) {
  const selectedModel = routing?.selectedModel || null;
  const env = resolveImageProviderEnv();
  const base = {
    ok: false,
    requestId: meta.requestId || null,
    durationMs: meta.durationMs ?? null,
    selectedModel,
    alternatives: routing?.alternatives || [],
    reasoning: routing?.reasoning || [],
    estimatedCostUsd: routing?.estimatedCostUsd ?? selectedModel?.costEstimateUsd ?? null,
    estimatedCostZar: routing?.estimatedCostZar ?? selectedModel?.costEstimateZar ?? null,
    provider: err?.provider || selectedModel?.providerAdapter || null,
    modelId: err?.modelId || selectedModel?.id || null,
    providerReadiness: selectedModel ? readinessForModel(selectedModel, env) : null,
    providerStatus: publicProviderStatus(env),
    providerCallCount: meta.providerCallCount || 0,
    spendLane: meta.spendLane || normalizeSpendLane(meta.spendLane),
    actualSpendProvider: meta.actualSpendProvider || actualSpendProviderFor(selectedModel, meta.spendLane),
    referenceStrategy: meta.referenceStrategy || null,
    referenceMode: meta.referenceMode || null,
    realismMode: meta.realismMode || null,
    outputFormatMode: meta.outputFormatMode || null,
    identityMode: meta.identityMode || null,
    routeWarnings: meta.routeWarnings || [],
    analysisProviderModel: meta.analysisProviderModel || null,
    images: []
  };

  if (err?.code === 'VERTEX_PERMISSION_DENIED' || isVertexPermissionDenied(err)) {
    return {
      statusCode: 403,
      body: {
        ...base,
        error: 'vertex_permission_denied',
        message: 'Google Vertex AI is configured, but this service account cannot run Imagen/Gemini predictions for the selected project and region. Grant Vertex AI prediction access, enable the Vertex AI API, and confirm the Imagen model is available in us-central1.'
      }
    };
  }

  if (err?.code === 'PROVIDER_NOT_IMPLEMENTED') {
    return {
      statusCode: 501,
      body: {
        ...base,
        error: 'image_provider_not_implemented',
        message: err.safeMessage || 'Selected image provider is not fully wired yet.'
      }
    };
  }

  if (err?.code === 'MISSING_API_KEY' || err?.code === 'MISSING_VERTEX_CREDENTIALS') {
    return {
      statusCode: 503,
      body: {
        ...base,
        error: err.code === 'MISSING_VERTEX_CREDENTIALS' ? 'missing_vertex_credentials' : 'missing_api_key',
        message: err.safeMessage || 'Image provider credential is missing.'
      }
    };
  }

  if (err?.code === 'VERTEX_MODEL_UNAVAILABLE') {
    return {
      statusCode: 404,
      body: {
        ...base,
        error: 'vertex_model_unavailable',
        message: err.safeMessage || 'The selected Vertex AI model is not available to this project and region. Pick an available Vertex model in Provider Control Center or use the default Gemini Flash route.'
      }
    };
  }

  return {
    statusCode: err?.statusCode || 400,
    body: {
      ...base,
      error: String(err?.code || 'image_generation_error').toLowerCase(),
      message: err?.safeMessage || err?.message || 'Image generation request failed.'
    }
  };
}

router.post('/generate', async (req, res) => {
  const startedAt = performance.now();
  const id = requestId();
  assertRegistryIntegrity();
  const body = normalizeBodyReferences(req.body || {});
  const generationId = generationIdFromBody(body, id);
  const env = resolveImageProviderEnv();
  const spendLane = normalizeSpendLane(body.spendLane);
  let routing = null;
  let providerCallCount = 0;
  let referenceStrategy = null;
  let referenceMode = null;
  let routeWarnings = [];
  let analysisProviderModel = null;

  markGenerationPending(generationId, {
    requestId: id,
    character: body.metadata?.character || body.character || '',
    shotMode: body.metadata?.shotMode || body.scenePack?.shotMode || '',
    modelId: body.preferredModel || body.modelId || ''
  });

  try {
    validateBasicRequest(body);
    routing = selectImageModel(routingInputForSpendLane(body, spendLane), env);
    validateSelectedModelRequest(bodyForSelectedModelValidation(body, routing.selectedModel, spendLane), routing.selectedModel);
  } catch (err) {
    const fallbackRouting = routing || { selectedModel: null, alternatives: [], reasoning: [] };
    const normalized = publicProviderError(err, fallbackRouting, {
      requestId: id,
      durationMs: elapsedMs(startedAt),
      providerCallCount: 0,
      spendLane,
      referenceStrategy,
      referenceMode,
      realismMode: body.realismMode || null,
      outputFormatMode: body.outputFormatMode || null,
      identityMode: body.identityMode || null,
      routeWarnings
    });
    const errorBody = {
      ...normalized.body,
      generationId
    };
    markGenerationFailed(generationId, errorBody);
    return res.status(normalized.statusCode).json(errorBody);
  }

  const selectedModel = routing.selectedModel;
  const providerReadiness = readinessForModel(selectedModel, env);
  const adapter = getProviderAdapter(selectedModel.providerAdapter);
  referenceStrategy = referenceStrategyFor(body, selectedModel, spendLane);
  referenceMode = referenceModeFor(body, selectedModel, spendLane);
  routeWarnings = routeWarningsFor(body, selectedModel, spendLane);
  if (!adapter) {
    const errorBody = {
      ok: false,
      generationId,
      requestId: id,
      durationMs: elapsedMs(startedAt),
      error: 'image_provider_adapter_missing',
      message: `No server adapter registered for ${selectedModel.providerAdapter}.`,
      selectedModel,
      alternatives: routing.alternatives,
      reasoning: routing.reasoning,
      estimatedCostUsd: routing.estimatedCostUsd,
      estimatedCostZar: routing.estimatedCostZar,
      providerReadiness,
      providerStatus: publicProviderStatus(env),
      spendLane,
      actualSpendProvider: actualSpendProviderFor(selectedModel, spendLane),
      referenceStrategy,
      referenceMode,
      realismMode: body.realismMode || null,
      outputFormatMode: body.outputFormatMode || null,
      identityMode: body.identityMode || null,
      routeWarnings,
      providerCallCount: 0,
      images: []
    };
    markGenerationFailed(generationId, errorBody);
    return res.status(500).json(errorBody);
  }

  try {
    const baseOutputMode = body.outputFormatMode || 'raw_photo';
    let generationBody = {
      ...body,
      outputFormatMode: baseOutputMode,
      identityMode: body.identityMode || null,
      strictNoFrame: body.strictNoFrame !== false,
      negativePrompt: mergeNegativePrompt(
        body.negativePrompt || body.negPrompt,
        (baseOutputMode === 'raw_photo' || body.strictNoFrame !== false || body.realismMode === 'photo_identity_lock' || referenceCountForBody(body) > 0) ? REALISM_NEGATIVE_PROMPT : ''
      )
    };
    if (referenceStrategy === 'vertex_vision_to_imagen_prompt') {
      if (typeof adapter.reasonAboutImages !== 'function') {
        throw validationError('REFERENCE_ANALYSIS_UNAVAILABLE', 'Google credit mode needs Vertex Gemini visual reasoning before Imagen generation.', 501);
      }
      const analysis = await adapter.reasonAboutImages({
        prompt: buildReferenceAnalysisPrompt(body),
        referenceImages: Array.isArray(body.referenceImages) ? body.referenceImages : []
      }, { env });
      providerCallCount += 1;
      analysisProviderModel = analysis?.providerModel || null;
      generationBody = {
        ...generationBody,
        prompt: appendReferenceAnalysisPrompt(body.prompt, analysis?.text || ''),
        negativePrompt: mergeNegativePrompt(generationBody.negativePrompt, REALISM_NEGATIVE_PROMPT),
        referenceImages: [],
        requiresEditing: false,
        editMode: null,
        realismMode: body.realismMode || 'photo_identity_lock',
        referenceMode,
        candidateCount: normalizeCandidateCount(body.candidateCount),
        metadata: {
          ...(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
          referenceStrategy,
          referenceMode,
          realismMode: body.realismMode || 'photo_identity_lock',
          analysisProviderModel
        }
      };
    } else if (selectedModel.providerAdapter === 'google') {
      generationBody = {
        ...generationBody,
        negativePrompt: mergeNegativePrompt(
          generationBody.negativePrompt,
          (body.realismMode === 'photo_identity_lock' || referenceStrategy === 'google_direct_reference_images') ? REALISM_NEGATIVE_PROMPT : ''
        ),
        referenceMode,
        realismMode: body.realismMode || (referenceStrategy === 'google_direct_reference_images' ? 'photo_identity_lock' : null),
        candidateCount: normalizeCandidateCount(body.candidateCount)
      };
    }

    const providerResult = await adapter.generateImage(normalizedGenerationRequest(generationBody, selectedModel), { env });
    providerCallCount += 1;
    let identityQa = null;
    if (shouldRunIdentityQa(generationBody, providerResult)) {
      try {
        identityQa = await runIdentityQa({ adapter, body: generationBody, providerResult, env });
        providerCallCount += 1;
      } catch (qaErr) {
        routeWarnings = [
          ...routeWarnings,
          'Identity QA could not run: ' + String(qaErr?.safeMessage || qaErr?.message || 'unknown QA error')
        ];
        identityQa = {
          identityScore: null,
          identityVerdict: 'unchecked',
          mismatchNotes: ['Identity QA failed safely. Judge the output against the shown refs before accepting.'],
          evidence: {},
          providerModel: null
        };
      }
    }
    const { rawProviderResponse, ...publicResult } = providerResult || {};
    const successBody = {
      ok: true,
      generationId,
      requestId: id,
      durationMs: elapsedMs(startedAt),
      selectedModel,
      alternatives: routing.alternatives,
      reasoning: routing.reasoning,
      providerReadiness,
      providerStatus: publicProviderStatus(env),
      spendLane,
      actualSpendProvider: actualSpendProviderFor(selectedModel, spendLane),
      referenceStrategy,
      referenceMode,
      realismMode: generationBody.realismMode || body.realismMode || null,
      outputFormatMode: generationBody.outputFormatMode || body.outputFormatMode || null,
      identityMode: generationBody.identityMode || body.identityMode || null,
      jobType: generationBody.jobType || body.jobType || body.intent || null,
      promptContractVersion: generationBody.promptContractVersion || body.promptContractVersion || null,
      generatorRecipe: generationBody.generatorRecipe || body.generatorRecipe || null,
      wardrobePack: generationBody.wardrobePack || body.wardrobePack || null,
      scenePack: generationBody.scenePack || body.scenePack || null,
      variationSeed: generationBody.variationSeed || body.variationSeed || null,
      lockedFields: generationBody.lockedFields || body.lockedFields || null,
      identityPackVersion: generationBody.identityPack?.version || body.identityPack?.version || body.identityPackVersion || body.referencePackVersion || null,
      routeWarnings,
      analysisProviderModel,
      identityScore: identityQa?.identityScore ?? null,
      identityVerdict: identityQa?.identityVerdict ?? null,
      identityAccepted: identityQa?.identityVerdict ? (identityQa.identityVerdict === 'mismatch_suspected' ? false : null) : null,
      identityMismatchNotes: identityQa?.mismatchNotes || [],
      identityQaEvidence: identityQa?.evidence || null,
      identityQaProviderModel: identityQa?.providerModel || null,
      providerCallCount,
      ...publicResult
    };
    markGenerationComplete(generationId, successBody);
    return res.json(successBody);
  } catch (err) {
    const normalized = publicProviderError(err, routing, {
      requestId: id,
      durationMs: elapsedMs(startedAt),
      providerCallCount: (err?.code === 'MISSING_API_KEY' || err?.code === 'MISSING_VERTEX_CREDENTIALS') ? providerCallCount : Math.max(providerCallCount, 1),
      spendLane,
      actualSpendProvider: actualSpendProviderFor(selectedModel, spendLane),
      referenceStrategy,
      referenceMode,
      realismMode: body.realismMode || null,
      outputFormatMode: body.outputFormatMode || null,
      identityMode: body.identityMode || null,
      routeWarnings,
      analysisProviderModel
    });
    const errorBody = {
      ...normalized.body,
      generationId
    };
    markGenerationFailed(generationId, errorBody);
    return res.status(normalized.statusCode).json(errorBody);
  }
});

module.exports = router;
module.exports._private = {
  appendReferenceAnalysisPrompt,
  buildReferenceAnalysisPrompt,
  mergeNegativePrompt,
  normalizeSpendLane,
  referenceModeFor,
  referenceStrategyFor,
  routeWarningsFor,
  routingInputForSpendLane
};
