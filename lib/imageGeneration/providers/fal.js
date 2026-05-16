const { createFalClient } = require('@fal-ai/client');

const {
  getImageModel,
  estimateZar,
  modelSupportsRequest
} = require('../modelRegistry');
const {
  extractImageOutputs,
  isQuotaLike,
  normalizeAspectRatio,
  normalizeReferenceImages,
  providerError,
  safeProviderMessage,
  shouldIncludeRaw,
  uniqueImages
} = require('./utils');

function resolveFalApiKey(env = process.env) {
  const key = String(env.FAL_KEY || '').trim();
  if (!key) {
    throw providerError('MISSING_API_KEY', 'Missing fal.ai API key. Set FAL_KEY.', {
      providerAdapter: 'fal',
      statusCode: 503
    });
  }
  return key;
}

function validateFalRequest(request = {}, env = process.env) {
  const model = getImageModel(request.modelId);
  if (!model) {
    throw providerError('UNKNOWN_MODEL', `Unknown image model: ${request.modelId || '<missing>'}`, {
      providerAdapter: 'fal',
      statusCode: 400
    });
  }
  if (model.providerAdapter !== 'fal') {
    throw providerError('PROVIDER_ADAPTER_MISMATCH', `${model.id} must use the ${model.providerAdapter} adapter, not fal.`, {
      providerAdapter: 'fal',
      expectedAdapter: model.providerAdapter,
      statusCode: 400
    });
  }
  if (!String(request.prompt || '').trim()) {
    throw providerError('INVALID_IMAGE_REQUEST', 'Image generation prompt is required.', {
      providerAdapter: 'fal',
      statusCode: 400
    });
  }
  const referenceCount = Array.isArray(request.referenceImages) ? request.referenceImages.length : 0;
  if (model.id === 'fal/qwen-image-2-edit' && referenceCount < 1) {
    throw providerError('MODEL_CAPABILITY_MISMATCH', 'Qwen Image 2 Edit requires at least one reference image.', {
      providerAdapter: 'fal',
      modelId: model.id,
      statusCode: 400
    });
  }
  if (!modelSupportsRequest(model, {
    referenceCount,
    requiresEditing: Boolean(request.editMode),
    quality: request.quality
  })) {
    throw providerError('MODEL_CAPABILITY_MISMATCH', `${model.id} does not support the requested image inputs.`, {
      providerAdapter: 'fal',
      modelId: model.id,
      statusCode: 400
    });
  }
  resolveFalApiKey(env);
  return model;
}

function falImageSize(aspectRatio = '') {
  const normalized = normalizeAspectRatio(aspectRatio) || '1:1';
  if (normalized === '16:9') return 'landscape_16_9';
  if (normalized === '9:16') return 'portrait_16_9';
  if (normalized === '4:3') return 'landscape_4_3';
  if (normalized === '3:4' || normalized === '4:5') return 'portrait_4_3';
  return 'square_hd';
}

function referenceUrls(request = {}) {
  return normalizeReferenceImages(request.referenceImages)
    .map(ref => ref.url || ref.dataUrl)
    .filter(Boolean);
}

function resolveFalProviderModel(model, request = {}, env = process.env) {
  const refs = referenceUrls(request);
  const hasRefs = refs.length > 0;

  if (model?.id === 'openai/gpt-image-2') {
    const base = String(env.FAL_GPT_IMAGE_2_MODEL || '').trim() || model.model;
    return hasRefs && !base.endsWith('/edit') ? `${base}/edit` : base;
  }
  if (model?.id === 'openai/gpt-image-1.5') {
    const base = String(env.FAL_GPT_IMAGE_1_5_MODEL || '').trim() || model.model;
    return hasRefs && !base.endsWith('/edit') ? `${base}/edit` : base;
  }
  if (model?.id === 'black-forest-labs/flux-2-pro') {
    return String(env.FAL_FLUX_2_PRO_MODEL || '').trim() || model.model;
  }
  if (model?.id === 'black-forest-labs/flux-2-max') {
    return String(env.FAL_FLUX_2_MAX_MODEL || '').trim() || model.model;
  }
  if (model?.id === 'bytedance/seedream-5-lite') {
    return hasRefs
      ? (String(env.FAL_SEEDREAM_EDIT_MODEL || '').trim() || 'fal-ai/bytedance/seedream/v5/lite/edit')
      : (String(env.FAL_SEEDREAM_TEXT_MODEL || '').trim() || model.model);
  }
  if (model?.id === 'fal/qwen-image-2-edit') {
    return String(env.FAL_UTILITY_EDIT_MODEL || '').trim() || model.model;
  }
  return model?.model || '';
}

function promptWithNegativePrompt(request = {}) {
  const prompt = String(request.prompt || '').trim();
  const negative = String(request.negativePrompt || request.negPrompt || '').trim();
  return [
    prompt,
    request.outputFormatMode === 'raw_photo'
      ? 'Output the clean raw camera photograph only. Do not render a social media interface, Instagram UI, username, caption, border, post template, phone screenshot, poster, watermark, or any text in the image.'
      : '',
    '',
    negative ? `Hard negative constraints: ${negative}.` : ''
  ].filter(Boolean).join('\n');
}

function buildFalInput({ model, request }) {
  const prompt = promptWithNegativePrompt(request);
  const imageUrls = referenceUrls(request);
  const imageSize = falImageSize(request.aspectRatio);
  const input = {
    prompt,
    image_size: imageSize,
    num_images: 1,
    output_format: 'png'
  };

  if (model.id === 'openai/gpt-image-2' || model.id === 'openai/gpt-image-1.5') {
    if (imageUrls.length) input.image_urls = imageUrls;
    input.quality = request.quality || model.qualityTier || 'standard';
    return input;
  }

  if (model.id === 'bytedance/seedream-5-lite') {
    if (imageUrls.length) input.image_urls = imageUrls;
    return input;
  }

  if (model.id === 'fal/qwen-image-2-edit') {
    input.image_urls = imageUrls;
    return input;
  }

  return input;
}

function normalizedResponse({ model, request, images = [], rawProviderResponse = null }, env = process.env, options = {}) {
  const providerModel = resolveFalProviderModel(model, request, env);
  const response = {
    ok: true,
    provider: 'fal',
    modelId: model.id,
    providerModel,
    images,
    costEstimateUsd: model.costEstimateUsd,
    costEstimateZar: estimateZar(model.costEstimateUsd, env),
    outputFormatMode: request.outputFormatMode || null,
    identityMode: request.identityMode || null
  };
  if (rawProviderResponse && shouldIncludeRaw(env, options)) response.rawProviderResponse = rawProviderResponse;
  return response;
}

function getFalClient(token, options = {}) {
  if (options.falClient) return options.falClient;
  return createFalClient({ credentials: token });
}

async function generateImage(request = {}, options = {}) {
  const env = options.env || process.env;
  const token = resolveFalApiKey(env);
  const model = validateFalRequest(request, env);
  const providerModel = resolveFalProviderModel(model, request, env);
  const input = buildFalInput({ model, request });
  const client = getFalClient(token, options);

  try {
    const result = await client.subscribe(providerModel, {
      input,
      logs: false
    });
    const data = result?.data || result || {};
    const images = uniqueImages(extractImageOutputs(data.images || data.image || data.output || data));
    if (!images.length) {
      throw providerError('PROVIDER_EMPTY_OUTPUT', 'fal.ai returned no image output.', {
        providerAdapter: 'fal',
        provider: 'fal',
        modelId: model.id,
        providerModel,
        statusCode: 502
      });
    }
    return normalizedResponse({ model, request, images, rawProviderResponse: result }, env, options);
  } catch (err) {
    if (err?.code) throw err;
    const statusCode = Number(err?.status || err?.statusCode || err?.response?.status || 502);
    const message = safeProviderMessage(err, err?.message || 'fal.ai image generation failed.');
    throw providerError(isQuotaLike(statusCode, message) ? 'PROVIDER_QUOTA_EXCEEDED' : 'PROVIDER_REQUEST_FAILED', message, {
      providerAdapter: 'fal',
      provider: 'fal',
      modelId: model.id,
      providerModel,
      statusCode,
      quota: isQuotaLike(statusCode, message)
    });
  }
}

module.exports = {
  buildFalInput,
  falImageSize,
  generateImage,
  normalizedResponse,
  promptWithNegativePrompt,
  referenceUrls,
  resolveFalApiKey,
  resolveFalProviderModel,
  validateFalRequest
};
