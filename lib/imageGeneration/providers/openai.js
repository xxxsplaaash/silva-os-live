const {
  getImageModel,
  estimateZar,
  modelSupportsRequest
} = require('../modelRegistry');
const {
  dataUrlToBlob,
  extractImageOutputs,
  fetchJson,
  getFetch,
  imageExtension,
  isQuotaLike,
  normalizeAspectRatio,
  normalizeReferenceImages,
  providerError,
  safeProviderMessage,
  shouldIncludeRaw,
  uniqueImages
} = require('./utils');

function resolveOpenAiApiKey(env = process.env) {
  const key = String(env.OPENAI_API_KEY || '').trim();
  if (!key) {
    throw providerError('MISSING_API_KEY', 'Missing OpenAI image API key. Set OPENAI_API_KEY.', {
      providerAdapter: 'openai',
      statusCode: 503
    });
  }
  return key;
}

function resolveOpenAiProviderModel(model, env = process.env) {
  const override = String(env.OPENAI_IMAGE_MODEL || '').trim();
  if (override) return override;
  if (model.id === 'openai/gpt-image-2') return 'gpt-image-1.5';
  return model.model || 'gpt-image-1.5';
}

function openAiSize(request = {}) {
  const resolution = String(request.resolution || '').trim();
  if (['1024x1024', '1536x1024', '1024x1536', 'auto'].includes(resolution)) return resolution;
  const aspect = normalizeAspectRatio(request.aspectRatio);
  if (aspect === '16:9' || aspect === '4:3') return '1536x1024';
  if (aspect === '9:16' || aspect === '3:4') return '1024x1536';
  return '1024x1024';
}

function openAiQuality(quality = '') {
  const normalized = String(quality || '').trim().toLowerCase();
  if (['ultra', 'premium', 'high'].includes(normalized)) return 'high';
  if (['utility', 'draft', 'low'].includes(normalized)) return 'low';
  if (['standard', 'medium'].includes(normalized)) return 'medium';
  return 'auto';
}

function validateOpenAiRequest(request = {}, env = process.env) {
  const model = getImageModel(request.modelId);
  if (!model) {
    throw providerError('UNKNOWN_MODEL', `Unknown image model: ${request.modelId || '<missing>'}`, {
      providerAdapter: 'openai',
      statusCode: 400
    });
  }
  if (model.providerAdapter !== 'openai') {
    throw providerError('PROVIDER_ADAPTER_MISMATCH', `${model.id} must use the ${model.providerAdapter} adapter, not openai.`, {
      providerAdapter: 'openai',
      expectedAdapter: model.providerAdapter,
      statusCode: 400
    });
  }
  if (!String(request.prompt || '').trim()) {
    throw providerError('INVALID_IMAGE_REQUEST', 'Image generation prompt is required.', {
      providerAdapter: 'openai',
      statusCode: 400
    });
  }
  const referenceCount = Array.isArray(request.referenceImages) ? request.referenceImages.length : 0;
  if (!modelSupportsRequest(model, {
    referenceCount,
    requiresEditing: Boolean(request.editMode),
    quality: request.quality
  })) {
    throw providerError('MODEL_CAPABILITY_MISMATCH', `${model.id} does not support the requested image inputs.`, {
      providerAdapter: 'openai',
      modelId: model.id,
      statusCode: 400
    });
  }
  resolveOpenAiApiKey(env);
  return model;
}

function buildOpenAiGenerationBody({ providerModel, request }) {
  return {
    model: providerModel,
    prompt: String(request.prompt || '').trim(),
    n: 1,
    size: openAiSize(request),
    quality: openAiQuality(request.quality),
    output_format: 'png'
  };
}

function buildOpenAiEditForm({ providerModel, request }) {
  const refs = normalizeReferenceImages(request.referenceImages);
  if (!refs.length) {
    throw providerError('REFERENCE_IMAGE_REQUIRED', 'OpenAI image editing requires at least one reference image.', {
      providerAdapter: 'openai',
      statusCode: 400
    });
  }
  const form = new FormData();
  form.append('model', providerModel);
  form.append('prompt', String(request.prompt || '').trim());
  form.append('n', '1');
  form.append('size', openAiSize(request));
  form.append('quality', openAiQuality(request.quality));
  form.append('output_format', 'png');
  refs.forEach((ref, index) => {
    if (!ref.data) {
      throw providerError('REFERENCE_IMAGE_FORMAT_UNSUPPORTED', 'OpenAI image editing references must be base64 data URLs.', {
        providerAdapter: 'openai',
        statusCode: 400
      });
    }
    form.append('image[]', dataUrlToBlob(ref), `reference_${index + 1}.${imageExtension(ref.mimeType)}`);
  });
  return form;
}

function normalizedResponse({ model, providerModel, request, images = [], rawProviderResponse = null }, env = process.env, options = {}) {
  const response = {
    ok: true,
    provider: 'openai',
    modelId: model.id,
    providerModel,
    images,
    costEstimateUsd: model.costEstimateUsd,
    costEstimateZar: estimateZar(model.costEstimateUsd, env)
  };
  if (rawProviderResponse && shouldIncludeRaw(env, options)) response.rawProviderResponse = rawProviderResponse;
  return response;
}

async function generateImage(request = {}, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = getFetch(options);
  const apiKey = resolveOpenAiApiKey(env);
  const model = validateOpenAiRequest(request, env);
  const providerModel = resolveOpenAiProviderModel(model, env);
  const hasReferences = Array.isArray(request.referenceImages) && request.referenceImages.length > 0;
  const endpoint = hasReferences || request.editMode
    ? 'https://api.openai.com/v1/images/edits'
    : 'https://api.openai.com/v1/images/generations';

  const body = hasReferences || request.editMode
    ? buildOpenAiEditForm({ providerModel, request })
    : JSON.stringify(buildOpenAiGenerationBody({ providerModel, request }));

  const headers = hasReferences || request.editMode
    ? { Authorization: `Bearer ${apiKey}` }
    : {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

  const { response, data } = await fetchJson(fetchImpl, endpoint, {
    method: 'POST',
    headers,
    body
  }, options.timeoutMs || 60000);

  const images = uniqueImages(extractImageOutputs(data?.data || data));
  if (response.ok && images.length) {
    return normalizedResponse({ model, providerModel, request, images, rawProviderResponse: data }, env, options);
  }

  const message = safeProviderMessage(data, 'OpenAI image generation failed.');
  throw providerError(isQuotaLike(response.status, message) ? 'PROVIDER_QUOTA_EXCEEDED' : 'PROVIDER_REQUEST_FAILED', message, {
    providerAdapter: 'openai',
    provider: 'openai',
    modelId: model.id,
    providerModel,
    statusCode: response.status || 502,
    quota: isQuotaLike(response.status, message)
  });
}

module.exports = {
  buildOpenAiEditForm,
  buildOpenAiGenerationBody,
  generateImage,
  normalizedResponse,
  openAiQuality,
  openAiSize,
  resolveOpenAiApiKey,
  resolveOpenAiProviderModel,
  validateOpenAiRequest
};
