const {
  getImageModel,
  estimateZar,
  modelSupportsRequest
} = require('../modelRegistry');
const {
  extractImageOutputs,
  fetchJson,
  getFetch,
  isQuotaLike,
  normalizeAspectRatio,
  normalizeReferenceImages,
  providerError,
  safeProviderMessage,
  shouldIncludeRaw,
  uniqueImages
} = require('./utils');

function resolveReplicateApiToken(env = process.env) {
  const token = String(env.REPLICATE_API_TOKEN || '').trim();
  if (!token) {
    throw providerError('MISSING_API_KEY', 'Missing Replicate API token. Set REPLICATE_API_TOKEN.', {
      providerAdapter: 'replicate',
      statusCode: 503
    });
  }
  return token;
}

function validateReplicateRequest(request = {}, env = process.env) {
  const model = getImageModel(request.modelId);
  if (!model) {
    throw providerError('UNKNOWN_MODEL', `Unknown image model: ${request.modelId || '<missing>'}`, {
      providerAdapter: 'replicate',
      statusCode: 400
    });
  }
  if (model.providerAdapter !== 'replicate') {
    throw providerError('PROVIDER_ADAPTER_MISMATCH', `${model.id} must use the ${model.providerAdapter} adapter, not replicate.`, {
      providerAdapter: 'replicate',
      expectedAdapter: model.providerAdapter,
      statusCode: 400
    });
  }
  if (!String(request.prompt || '').trim()) {
    throw providerError('INVALID_IMAGE_REQUEST', 'Image generation prompt is required.', {
      providerAdapter: 'replicate',
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
      providerAdapter: 'replicate',
      modelId: model.id,
      statusCode: 400
    });
  }
  resolveReplicateApiToken(env);
  return model;
}

function buildReplicateInput({ model, request }) {
  const refs = normalizeReferenceImages(request.referenceImages);
  const images = refs.map(ref => ref.url || ref.dataUrl).filter(Boolean);
  const aspectRatio = normalizeAspectRatio(request.aspectRatio) || '1:1';
  const prompt = String(request.prompt || '').trim();

  if (model.id === 'openai/gpt-image-2' || model.id === 'openai/gpt-image-1.5') {
    return {
      prompt,
      images,
      image: images[0],
      aspect_ratio: aspectRatio,
      output_format: 'png'
    };
  }

  if (model.id === 'prunaai/p-image-edit') {
    return {
      prompt,
      image: images[0],
      output_format: 'png'
    };
  }

  if (model.id === 'bytedance/seedream-5-lite') {
    return {
      prompt,
      images,
      aspect_ratio: aspectRatio,
      output_format: 'png'
    };
  }

  if (model.id.startsWith('black-forest-labs/flux-')) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: 'png',
      input_image: images[0]
    };
  }

  return {
    prompt,
    image: images[0],
    images,
    aspect_ratio: aspectRatio,
    output_format: 'png'
  };
}

function normalizedResponse({ model, request, images = [], rawProviderResponse = null }, env = process.env, options = {}) {
  const providerModel = resolveReplicateProviderModel(model, env);
  const response = {
    ok: true,
    provider: 'replicate',
    modelId: model.id,
    providerModel,
    images,
    costEstimateUsd: model.costEstimateUsd,
    costEstimateZar: estimateZar(model.costEstimateUsd, env)
  };
  if (rawProviderResponse && shouldIncludeRaw(env, options)) response.rawProviderResponse = rawProviderResponse;
  return response;
}

function resolveReplicateProviderModel(model, env = process.env) {
  if (model?.id === 'openai/gpt-image-2') {
    return String(env.REPLICATE_GPT_IMAGE_2_MODEL || '').trim() || model.model;
  }
  if (model?.id === 'openai/gpt-image-1.5') {
    return String(env.REPLICATE_GPT_IMAGE_1_5_MODEL || '').trim() || model.model;
  }
  return model?.model || '';
}

async function pollPrediction({ fetchImpl, token, prediction, timeoutMs }) {
  if (!prediction?.urls?.get || ['succeeded', 'failed', 'canceled'].includes(prediction?.status)) return prediction;
  const started = Date.now();
  let current = prediction;
  while (Date.now() - started < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    const { response, data } = await fetchJson(fetchImpl, current.urls.get, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }, timeoutMs);
    if (!response.ok) return data || current;
    current = data;
    if (['succeeded', 'failed', 'canceled'].includes(current?.status)) return current;
  }
  throw providerError('PROVIDER_TIMEOUT', 'Replicate prediction did not finish before timeout.', {
    providerAdapter: 'replicate',
    statusCode: 504
  });
}

async function generateImage(request = {}, options = {}) {
  const env = options.env || process.env;
  const fetchImpl = getFetch(options);
  const token = resolveReplicateApiToken(env);
  const model = validateReplicateRequest(request, env);
  const providerModel = resolveReplicateProviderModel(model, env);
  const endpoint = `https://api.replicate.com/v1/models/${providerModel}/predictions`;
  const input = buildReplicateInput({ model, request });
  const timeoutMs = options.timeoutMs || 90000;

  const { response, data } = await fetchJson(fetchImpl, endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: `wait=${Math.min(60, Math.max(1, Math.floor(timeoutMs / 1000)))}`
    },
    body: JSON.stringify({ input })
  }, timeoutMs);

  if (!response.ok) {
    const message = safeProviderMessage(data, 'Replicate image generation failed.');
    throw providerError(isQuotaLike(response.status, message) ? 'PROVIDER_QUOTA_EXCEEDED' : 'PROVIDER_REQUEST_FAILED', message, {
      providerAdapter: 'replicate',
      provider: 'replicate',
      modelId: model.id,
      providerModel,
      statusCode: response.status || 502,
      quota: isQuotaLike(response.status, message)
    });
  }

  const prediction = await pollPrediction({ fetchImpl, token, prediction: data, timeoutMs });
  if (['failed', 'canceled'].includes(prediction?.status)) {
    throw providerError('PROVIDER_REQUEST_FAILED', safeProviderMessage(prediction, 'Replicate prediction failed.'), {
      providerAdapter: 'replicate',
      provider: 'replicate',
      modelId: model.id,
      providerModel,
      statusCode: 502
    });
  }

  const images = uniqueImages(extractImageOutputs(prediction?.output || prediction));
  if (!images.length) {
    throw providerError('PROVIDER_EMPTY_OUTPUT', 'Replicate returned no image output.', {
      providerAdapter: 'replicate',
      provider: 'replicate',
      modelId: model.id,
      providerModel,
      statusCode: 502
    });
  }

  return normalizedResponse({ model, request, images, rawProviderResponse: prediction }, env, options);
}

module.exports = {
  buildReplicateInput,
  generateImage,
  normalizedResponse,
  pollPrediction,
  resolveReplicateProviderModel,
  resolveReplicateApiToken,
  validateReplicateRequest
};
