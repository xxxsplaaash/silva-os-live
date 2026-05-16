const fs = require('fs');

const {
  getImageModel,
  estimateZar,
  modelSupportsRequest
} = require('../modelRegistry');
const {
  extractImageOutputs,
  getFetch,
  normalizeAspectRatio,
  normalizeReferenceImages,
  providerError,
  shouldIncludeRaw,
  uniqueImages
} = require('./utils');

const DEFAULT_VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
const DEFAULT_VERTEX_LOCATION = 'us-central1';
const DEFAULT_VERTEX_LOCATION_FALLBACKS = Object.freeze(['us-east4', 'europe-west9', 'global']);
const DEFAULT_VERTEX_IMAGEN_MODEL = 'imagen-3.0-generate-001';
const DEFAULT_VERTEX_GEMINI_FAST_MODEL = 'gemini-2.5-flash';
const DEFAULT_VERTEX_GEMINI_PRO_MODEL = 'gemini-2.5-pro';
const DEFAULT_VERTEX_GEMINI_IMAGE_FAST_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_VERTEX_GEMINI_IMAGE_PRO_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_VERTEX_CLAUDE_MODEL = 'claude-3-5-sonnet-v2@20241022';
const MAX_REMOTE_REFERENCE_BYTES = 8 * 1024 * 1024;

function resolveVertexConfig(env = process.env) {
  const keyFilename = String(env.VERTEX_SERVICE_ACCOUNT_JSON_PATH || env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  const authMode = String(env.VERTEX_AUTH_MODE || '').trim().toLowerCase();
  const useApplicationDefaultCredentials = authMode === 'adc' || authMode === 'application-default';
  if (!keyFilename && !useApplicationDefaultCredentials) {
    throw providerError(
      'MISSING_VERTEX_CREDENTIALS',
      'Missing Vertex AI credentials. Set VERTEX_SERVICE_ACCOUNT_JSON_PATH, GOOGLE_APPLICATION_CREDENTIALS, or VERTEX_AUTH_MODE=adc after running gcloud auth application-default login.',
      { providerAdapter: 'google', statusCode: 503 }
    );
  }
  if (keyFilename && !fs.existsSync(keyFilename)) {
    throw providerError(
      'MISSING_VERTEX_CREDENTIALS',
      'Vertex AI service-account JSON file was not found on this server.',
      { providerAdapter: 'google', statusCode: 503 }
    );
  }
  const location = String(env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION).trim() || DEFAULT_VERTEX_LOCATION;
  return {
    projectId: String(env.VERTEX_PROJECT_ID || DEFAULT_VERTEX_PROJECT_ID).trim() || DEFAULT_VERTEX_PROJECT_ID,
    location,
    locationFallbacks: parseVertexLocationFallbacks(env.VERTEX_LOCATION_FALLBACKS || env.VERTEX_REGION_FALLBACKS, location),
    keyFilename,
    useApplicationDefaultCredentials,
    imagenModel: String(env.VERTEX_IMAGEN_MODEL || DEFAULT_VERTEX_IMAGEN_MODEL).trim() || DEFAULT_VERTEX_IMAGEN_MODEL,
    geminiFastModel: String(env.VERTEX_GEMINI_FAST_MODEL || DEFAULT_VERTEX_GEMINI_FAST_MODEL).trim() || DEFAULT_VERTEX_GEMINI_FAST_MODEL,
    geminiProModel: String(env.VERTEX_GEMINI_PRO_MODEL || DEFAULT_VERTEX_GEMINI_PRO_MODEL).trim() || DEFAULT_VERTEX_GEMINI_PRO_MODEL
  };
}

function parseVertexLocationFallbacks(value, primaryLocation = DEFAULT_VERTEX_LOCATION) {
  const raw = String(value || '').trim()
    ? String(value).split(',')
    : DEFAULT_VERTEX_LOCATION_FALLBACKS;
  const seen = new Set([String(primaryLocation || '').trim()].filter(Boolean));
  return raw
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter(location => {
      if (seen.has(location)) return false;
      seen.add(location);
      return true;
    });
}

function vertexLocationConfigs(config, options = {}) {
  if (options.genAIClient || options.predictionClient || options.geminiModel || options.vertexAI) return [config];
  const locations = [config.location, ...(Array.isArray(config.locationFallbacks) ? config.locationFallbacks : [])]
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
  return locations.map(location => ({ ...config, location }));
}

function validateGoogleRequest(request = {}, env = process.env) {
  const model = getImageModel(request.modelId);
  if (!model) {
    throw providerError('UNKNOWN_MODEL', `Unknown image model: ${request.modelId || '<missing>'}`, {
      providerAdapter: 'google',
      statusCode: 400
    });
  }
  if (model.providerAdapter !== 'google') {
    throw providerError('PROVIDER_ADAPTER_MISMATCH', `${model.id} must use the ${model.providerAdapter} adapter, not google.`, {
      providerAdapter: 'google',
      expectedAdapter: model.providerAdapter,
      statusCode: 400
    });
  }
  if (!String(request.prompt || '').trim()) {
    throw providerError('INVALID_IMAGE_REQUEST', 'Image generation prompt is required.', {
      providerAdapter: 'google',
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
      providerAdapter: 'google',
      modelId: model.id,
      statusCode: 400
    });
  }
  return model;
}

function vertexEndpoint(config, modelName) {
  return `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${modelName}`;
}

function vertexApiEndpoint(location) {
  if (String(location || '').trim() === 'global') return 'aiplatform.googleapis.com';
  return `${location}-aiplatform.googleapis.com`;
}

function normalizeCandidateCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(4, Math.round(n)));
}

function buildVertexImagenPredictRequest(request = {}, config = resolveVertexConfig()) {
  const aspectRatio = normalizeAspectRatio(request.aspectRatio);
  const parameters = { sampleCount: normalizeCandidateCount(request.candidateCount) };
  if (aspectRatio) parameters.aspectRatio = aspectRatio;
  if (String(request.negativePrompt || '').trim()) parameters.negativePrompt = String(request.negativePrompt).trim();
  if (request.resolution) parameters.outputOptions = { ...(parameters.outputOptions || {}), sampleImageSize: String(request.resolution) };
  return {
    endpoint: vertexEndpoint(config, config.imagenModel || DEFAULT_VERTEX_IMAGEN_MODEL),
    instances: [{ prompt: String(request.prompt || '').trim() }],
    parameters
  };
}

function isOptionalImagenParameterRejected(err) {
  const message = String(err?.message || err?.details || err?.causeMessage || '');
  return /negativePrompt|sampleCount|INVALID_ARGUMENT|Unknown name|Cannot find field|unsupported/i.test(message);
}

function toVertexValue(value, helpers) {
  return helpers && typeof helpers.toValue === 'function' ? helpers.toValue(value) : value;
}

function fromVertexValue(value, helpers) {
  if (!value || typeof value !== 'object') return value;
  if (helpers && typeof helpers.fromValue === 'function') {
    try { return helpers.fromValue(value); } catch (_) {}
  }
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'numberValue')) return value.numberValue;
  if (Object.prototype.hasOwnProperty.call(value, 'boolValue')) return value.boolValue;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (value.listValue?.values) return value.listValue.values.map(item => fromVertexValue(item, helpers));
  if (value.structValue?.fields) {
    return Object.fromEntries(Object.entries(value.structValue.fields).map(([key, item]) => [key, fromVertexValue(item, helpers)]));
  }
  return value;
}

function requireAiPlatform() {
  try {
    return require('@google-cloud/aiplatform');
  } catch (err) {
    throw providerError(
      'VERTEX_DEPENDENCY_MISSING',
      'Vertex AI image dependency is missing. Run npm install or npm run setup:all after updating dependencies.',
      { providerAdapter: 'google', statusCode: 500, causeMessage: String(err?.message || err) }
    );
  }
}

function requireVertexAI() {
  try {
    return require('@google-cloud/vertexai');
  } catch (err) {
    throw providerError(
      'VERTEX_DEPENDENCY_MISSING',
      'Vertex AI Gemini dependency is missing. Run npm install or npm run setup:all after updating dependencies.',
      { providerAdapter: 'google', statusCode: 500, causeMessage: String(err?.message || err) }
    );
  }
}

function requireGoogleGenAI() {
  try {
    return require('@google/genai');
  } catch (err) {
    throw providerError(
      'VERTEX_DEPENDENCY_MISSING',
      'Google GenAI Vertex image dependency is missing. Run npm install or npm run setup:all after updating dependencies.',
      { providerAdapter: 'google', statusCode: 500, causeMessage: String(err?.message || err) }
    );
  }
}

function createPredictionClient(config, options = {}) {
  if (typeof options.createPredictionClient === 'function') return options.createPredictionClient(config, options);
  if (options.predictionClient) return options.predictionClient;
  const aiplatform = options.aiplatform || requireAiPlatform();
  const Client = aiplatform.v1?.PredictionServiceClient || aiplatform.PredictionServiceClient;
  if (!Client) {
    throw providerError('VERTEX_CLIENT_UNAVAILABLE', 'Vertex AI PredictionServiceClient is unavailable.', {
      providerAdapter: 'google',
      statusCode: 500
    });
  }
  const clientOptions = { apiEndpoint: vertexApiEndpoint(config.location) };
  if (config.keyFilename) clientOptions.keyFilename = config.keyFilename;
  return new Client(clientOptions);
}

function createGenAIClient(config, options = {}) {
  if (typeof options.createGenAIClient === 'function') return options.createGenAIClient(config, options);
  if (options.genAIClient) return options.genAIClient;
  const { GoogleGenAI } = options.googleGenAI || requireGoogleGenAI();
  if (!GoogleGenAI) {
    throw providerError('VERTEX_CLIENT_UNAVAILABLE', 'GoogleGenAI Vertex client is unavailable.', {
      providerAdapter: 'google',
      statusCode: 500
    });
  }
  const previous = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!previous && config.keyFilename) process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFilename;
  try {
    return new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location: config.location,
      ...(config.keyFilename ? { googleAuthOptions: { keyFilename: config.keyFilename } } : {})
    });
  } finally {
    if (!previous) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}

function createGeminiModel(config, modelName, options = {}) {
  if (typeof options.createGeminiModel === 'function') return options.createGeminiModel(config, modelName, options);
  if (options.geminiModel) return options.geminiModel;
  const { VertexAI } = options.vertexAI || requireVertexAI();
  if (!VertexAI) {
    throw providerError('VERTEX_CLIENT_UNAVAILABLE', 'VertexAI Gemini client is unavailable.', {
      providerAdapter: 'google',
      statusCode: 500
    });
  }
  const previous = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!previous && config.keyFilename) process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFilename;
  try {
    const googleAuthOptions = config.keyFilename ? { keyFilename: config.keyFilename } : undefined;
    const vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
      ...(googleAuthOptions ? { googleAuthOptions } : {})
    });
    return vertexAI.getGenerativeModel({ model: modelName });
  } finally {
    if (!previous) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}

function normalizedResponse({ model, providerModel, request, images = [], rawProviderResponse = null, vertexLocation = '', fallbackFromModelId = '', fallbackFromLocation = '', fallbackReason = '' }, env = process.env, options = {}) {
  const response = {
    ok: true,
    provider: 'google',
    modelId: model.id,
    providerModel,
    images,
    costEstimateUsd: model.costEstimateUsd,
    costEstimateZar: estimateZar(model.costEstimateUsd, env),
    outputFormatMode: request.outputFormatMode || null,
    identityMode: request.identityMode || null
  };
  if (vertexLocation) response.vertexLocation = vertexLocation;
  if (fallbackFromModelId) response.fallbackFromModelId = fallbackFromModelId;
  if (fallbackFromLocation) response.fallbackFromLocation = fallbackFromLocation;
  if (fallbackReason) response.fallbackReason = fallbackReason;
  if (rawProviderResponse && shouldIncludeRaw(env, options)) response.rawProviderResponse = rawProviderResponse;
  return response;
}

function isVertexPermissionDenied(err) {
  const code = String(err?.code || err?.status || '').trim();
  const message = String(err?.message || err?.details || err?.causeMessage || '');
  return code === '7' || /PERMISSION_DENIED|aiplatform\.endpoints\.predict|permission .*denied/i.test(message);
}

function isVertexQuotaLike(err) {
  const code = String(err?.code || err?.status || '').trim();
  const message = String(err?.message || err?.details || err?.causeMessage || '');
  return code === '8' || code === '429' || /quota|rate.?limit|RESOURCE_EXHAUSTED|too many requests/i.test(message);
}

function isVertexModelUnavailable(err) {
  const code = String(err?.code || err?.status || '').trim();
  const message = String(err?.message || err?.details || err?.causeMessage || '');
  return code === '5'
    || code === '404'
    || code === 'VERTEX_MODEL_UNAVAILABLE'
    || /NOT_FOUND|Publisher Model .*was not found|valid model version|project does not have access|selected Vertex AI model is not available|model .*not available/i.test(message);
}

function normalizeVertexError(err, context = {}) {
  if (err && typeof err.code === 'string' && !isVertexModelUnavailable(err)) return err;
  if (isVertexModelUnavailable(err)) {
    return providerError('VERTEX_MODEL_UNAVAILABLE', 'The selected Vertex AI model is not available to this project and region. Use an available Vertex Gemini/Imagen model or update the model override.', {
      providerAdapter: 'google',
      provider: 'google',
      modelId: context.modelId || '',
      providerModel: context.providerModel || '',
      statusCode: 404,
      causeMessage: String(err?.message || err)
    });
  }
  if (isVertexPermissionDenied(err)) {
    return providerError('VERTEX_PERMISSION_DENIED', 'Google Vertex AI is configured, but the active Google credential cannot run predictions for this project, region, or model.', {
      providerAdapter: 'google',
      provider: 'google',
      modelId: context.modelId || '',
      providerModel: context.providerModel || '',
      statusCode: 403,
      causeMessage: String(err?.message || err)
    });
  }
  if (isVertexQuotaLike(err)) {
    return providerError('PROVIDER_QUOTA_EXCEEDED', 'Google Vertex AI quota or rate limit was reached.', {
      providerAdapter: 'google',
      provider: 'google',
      modelId: context.modelId || '',
      providerModel: context.providerModel || '',
      statusCode: 429,
      causeMessage: String(err?.message || err)
    });
  }
  return providerError('PROVIDER_REQUEST_FAILED', context.message || 'Vertex AI request failed.', {
    providerAdapter: 'google',
    provider: 'google',
    modelId: context.modelId || '',
    providerModel: context.providerModel || '',
    statusCode: 502,
    causeMessage: String(err?.message || err)
  });
}

async function callVertexImagen({ model, request, config, predictionClient, aiplatform, timeoutMs }) {
  const providerModel = config.imagenModel || model.model || DEFAULT_VERTEX_IMAGEN_MODEL;
  const requestBody = buildVertexImagenPredictRequest(request, { ...config, imagenModel: providerModel });
  const helpers = aiplatform?.helpers || requireAiPlatform().helpers;
  const sdkRequest = {
    endpoint: requestBody.endpoint,
    instances: requestBody.instances.map(item => toVertexValue(item, helpers)),
    parameters: toVertexValue(requestBody.parameters, helpers)
  };
  const [response] = await predictionClient.predict(sdkRequest, { timeout: timeoutMs || 60000 });
  const plain = {
    ...response,
    predictions: (response?.predictions || []).map(item => fromVertexValue(item, helpers))
  };
  const images = uniqueImages(extractImageOutputs(plain));
  if (!images.length) {
    throw providerError('PROVIDER_NO_IMAGE', 'Vertex Imagen returned no image output.', {
      providerAdapter: 'google',
      provider: 'google',
      modelId: model.id,
      providerModel,
      statusCode: 502
    });
  }
  return { providerModel, data: plain, images, vertexLocation: config.location };
}

function isGeminiImageModel(modelOrName = '') {
  const modelName = typeof modelOrName === 'string' ? modelOrName : String(modelOrName?.model || modelOrName?.id || '');
  return /gemini-.*image/i.test(modelName) || /nano-banana/i.test(modelName);
}

function geminiImageModelFor(model) {
  if (model?.id === 'google/nano-banana-pro') return model.model || DEFAULT_VERTEX_GEMINI_IMAGE_PRO_MODEL;
  if (model?.id === 'google/nano-banana-2') return model.model || DEFAULT_VERTEX_GEMINI_IMAGE_FAST_MODEL;
  return model?.model || DEFAULT_VERTEX_GEMINI_IMAGE_FAST_MODEL;
}

function geminiImageFallbackModels(model) {
  const ids = [];
  if (model?.id === 'google/nano-banana-pro') ids.push('google/nano-banana-2');
  if (model?.id === 'google/nano-banana-2') ids.push('google/nano-banana-pro');
  return ids
    .map(id => getImageModel(id))
    .filter(Boolean)
    .filter(candidate => candidate.id !== model?.id);
}

function outputImageSize(resolution = '') {
  const value = String(resolution || '').trim().toUpperCase();
  if (['512', '1K', '2K', '4K'].includes(value)) return value;
  return undefined;
}

function buildGeminiImagePrompt(request = {}) {
  const prompt = String(request.prompt || '').trim();
  const negative = String(request.negativePrompt || '').trim();
  const realism = String(request.realismMode || '').trim();
  const outputMode = String(request.outputFormatMode || '').trim();
  const identityMode = String(request.identityMode || '').trim();
  const lines = [
    prompt,
    '',
    'FINAL IMAGE INSTRUCTIONS:',
    'Generate the final raw camera photograph now. Output the clean source photo only.',
    'Use the actual reference images directly as identity inputs, not as layout inspiration.',
    'The reference face is authoritative. If any written description conflicts with the face/body references, the references win.',
    'Do not invent a new face. Do not average the references into a generic person. Keep the same person from the identity pack.',
    'Preserve the referenced person/character exactly: face shape, age read, skin tone, hair, eyewear, build, posture, and aura.',
    identityMode === 'exact_character' ? 'Exact character mode is active: the generated person must match the primary face and body references, not merely resemble them.' : '',
    outputMode === 'raw_photo' ? 'Raw photo mode is active: no social-media interface, no phone screenshot, no post template, no white card, no border, no username, no caption text, no watermark, and no text rendered inside the image.' : '',
      'If the scene mentions Instagram, LinkedIn, Story, Reel, caption, handle, carousel, or post, treat that as output metadata only. Do not render a social media interface, platform UI, username, caption, border, phone screenshot, or text.',
    'Photorealistic documentary-camera output. Real skin texture, realistic pores, realistic lighting, no plastic finish.',
    realism === 'photo_identity_lock' ? 'Realism lock is active: no stylization unless the prompt explicitly asks for it.' : '',
    negative ? `Hard negative constraints: ${negative}.` : ''
  ].filter(Boolean);
  return lines.join('\n');
}

function referenceLabel(ref = {}, index = 0) {
  const fallback = index === 0
    ? 'PRIMARY FACE TILE / IDENTITY AUTHORITY'
    : index === 1
      ? 'PRIMARY BODY TILE / BUILD AUTHORITY'
      : `REFERENCE IMAGE ${index + 1}`;
  const label = String(ref.label || fallback).trim();
  const type = String(ref.type || '').trim();
  const source = String(ref.sourceName || ref.source || '').trim();
  const referenceKind = String(ref.referenceKind || '').trim();
  const role = /primary_face|face_tile/i.test(`${type} ${label} ${referenceKind}`)
    ? 'PRIMARY FACE TILE / IDENTITY AUTHORITY'
    : /primary_body|body_tile|body|build/i.test(`${type} ${label} ${referenceKind}`)
      ? 'PRIMARY BODY TILE / BUILD AUTHORITY'
      : /face/i.test(`${type} ${label}`)
        ? 'FACE CONTACT SHEET / SUPPORTING IDENTITY REFERENCE'
        : /body|build/i.test(`${type} ${label}`)
          ? 'BODY CONTACT SHEET / SUPPORTING BUILD REFERENCE'
      : label;
  return [
    `${role}:`,
    label && label !== role ? `originalLabel=${label}` : '',
    type ? `type=${type}` : '',
    source ? `source=${source}` : '',
    referenceKind ? `referenceKind=${referenceKind}` : '',
    /CONTACT SHEET/i.test(role)
      ? 'This is support context only. Do not copy this contact sheet as a layout.'
      : 'This is an authority image. Match this identity/build before obeying written style text.',
    'Use this reference only for identity/build/wardrobe guidance. Do not copy it as a frame, screenshot, collage, or social-media layout.'
  ].filter(Boolean).join(' ');
}

function buildReferenceAuthorityBlock(request = {}, refs = []) {
  const identityMode = String(request.identityMode || '').trim();
  return [
    'IDENTITY AUTHORITY CONTRACT:',
    'You are receiving the real identity pack before the final prompt.',
    'The first face tile is the highest authority. Match that face before every written description.',
    'The first body/build tile is the second authority. Match build, posture, proportions, and physical presence.',
    'Contact sheets are support only. Extract identity facts; never reproduce the sheet, grid, frame, or layout.',
    'Use the scene prompt only to place this exact person into a new raw camera photograph.',
    'If the written character description, location, outfit, or mood conflicts with the reference images, the references win; preserve the reference images first.',
    'If a reference is a collage or contact sheet, read all tiles as the same person and extract the consistent identity. Do not reproduce the collage layout.',
    identityMode === 'exact_character' ? 'Acceptance bar: the output must be recognizable as the exact same character, not a similar-looking replacement.' : '',
    `Reference count: ${refs.length}.`
  ].filter(Boolean).join('\n');
}

async function fetchReferenceAsInlineData(ref, options = {}) {
  if (ref.data) {
    return {
      inlineData: {
        mimeType: ref.mimeType || 'image/png',
        data: ref.data
      }
    };
  }
  const url = String(ref.url || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw providerError('REFERENCE_IMAGE_FORMAT_UNSUPPORTED', 'Google direct-reference image generation needs data URLs or fetchable HTTP(S) reference URLs.', {
      providerAdapter: 'google',
      statusCode: 400
    });
  }
  const fetchImpl = getFetch(options);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw providerError('REFERENCE_IMAGE_FETCH_FAILED', 'A reference image URL could not be fetched by the server.', {
      providerAdapter: 'google',
      statusCode: 400
    });
  }
  const contentType = String(response.headers?.get?.('content-type') || 'image/png').split(';')[0].trim() || 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_REMOTE_REFERENCE_BYTES) {
    throw providerError('REFERENCE_IMAGE_TOO_LARGE', 'A reference image URL is too large for the Google direct-reference route.', {
      providerAdapter: 'google',
      statusCode: 413
    });
  }
  return {
    inlineData: {
      mimeType: contentType,
      data: buffer.toString('base64')
    }
  };
}

async function buildGeminiImageParts(request = {}, options = {}) {
  const parts = [];
  const refs = normalizeReferenceImages(request.referenceImages);
  if (refs.length) {
    parts.push({ text: buildReferenceAuthorityBlock(request, refs) });
  }
  for (const [index, ref] of refs.entries()) {
    parts.push({ text: referenceLabel(ref, index) });
    parts.push(await fetchReferenceAsInlineData(ref, options));
  }
  parts.push({ text: buildGeminiImagePrompt(request) });
  return parts;
}

function geminiImageConfig(request = {}) {
  const aspectRatio = normalizeAspectRatio(request.aspectRatio);
  const imageSize = outputImageSize(request.resolution);
  const imageConfig = {};
  if (aspectRatio) imageConfig.aspectRatio = aspectRatio;
  if (imageSize) imageConfig.imageSize = imageSize;
  imageConfig.outputMimeType = 'image/png';
  return {
    responseModalities: ['TEXT', 'IMAGE'],
    candidateCount: normalizeCandidateCount(request.candidateCount),
    ...(Object.keys(imageConfig).length ? { imageConfig } : {})
  };
}

async function callVertexGeminiImage({ model, request, config, genAIClient, timeoutMs, options = {} }) {
  const providerModel = geminiImageModelFor(model);
  const parts = await buildGeminiImageParts(request, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs || 90000);
  try {
    const response = await genAIClient.models.generateContent({
      model: providerModel,
      contents: [{ role: 'user', parts }],
      config: geminiImageConfig(request)
    }, { signal: controller.signal });
    const images = uniqueImages(extractImageOutputs(response));
    if (!images.length) {
      throw providerError('PROVIDER_NO_IMAGE', 'Vertex Gemini Image returned no image output.', {
        providerAdapter: 'google',
        provider: 'google',
        modelId: model.id,
        providerModel,
        statusCode: 502
      });
    }
    return { providerModel, data: response, images, vertexLocation: config.location };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw providerError('PROVIDER_TIMEOUT', 'Vertex Gemini Image request timed out.', {
        providerAdapter: 'google',
        provider: 'google',
        modelId: model.id,
        providerModel,
        statusCode: 504
      });
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateImage(request = {}, options = {}) {
  const env = options.env || process.env;
  const model = validateGoogleRequest(request, env);
  const config = resolveVertexConfig(env);

  try {
    if (isGeminiImageModel(model)) {
      const modelCandidates = [model, ...geminiImageFallbackModels(model)];
      const locationCandidates = vertexLocationConfigs(config, options);
      let lastErr = null;
      for (const candidateModel of modelCandidates) {
        for (const candidateConfig of locationCandidates) {
          try {
            const genAIClient = createGenAIClient(candidateConfig, options);
            const result = await callVertexGeminiImage({
              model: candidateModel,
              request: {
                ...request,
                modelId: candidateModel.id
              },
              config: candidateConfig,
              genAIClient,
              timeoutMs: options.timeoutMs || 90000,
              options
            });
            return normalizedResponse({
              model: candidateModel,
              providerModel: result.providerModel,
              request,
              images: result.images,
              rawProviderResponse: result.data,
              vertexLocation: result.vertexLocation,
              fallbackFromModelId: candidateModel.id !== model.id ? model.id : '',
              fallbackFromLocation: candidateConfig.location !== config.location ? config.location : '',
              fallbackReason: (candidateModel.id !== model.id || candidateConfig.location !== config.location) ? 'vertex_model_unavailable' : ''
            }, env, options);
          } catch (fallbackErr) {
            lastErr = fallbackErr;
            if (!isVertexModelUnavailable(fallbackErr)) throw fallbackErr;
          }
        }
      }
      throw lastErr;
    }

    const aiplatform = options.aiplatform || requireAiPlatform();
    let lastImagenErr = null;
    for (const candidateConfig of vertexLocationConfigs(config, options)) {
      try {
        const predictionClient = createPredictionClient(candidateConfig, { ...options, aiplatform });
        const result = await callVertexImagen({
          model,
          request,
          config: candidateConfig,
          predictionClient,
          aiplatform,
          timeoutMs: options.timeoutMs || 60000
        });
        return normalizedResponse({
          model,
          providerModel: result.providerModel,
          request,
          images: result.images,
          rawProviderResponse: result.data,
          vertexLocation: result.vertexLocation,
          fallbackFromLocation: candidateConfig.location !== config.location ? config.location : '',
          fallbackReason: candidateConfig.location !== config.location ? 'vertex_model_unavailable' : ''
        }, env, options);
      } catch (imagenErr) {
        lastImagenErr = imagenErr;
        if (!isVertexModelUnavailable(imagenErr)) throw imagenErr;
      }
    }
    throw lastImagenErr;
  } catch (err) {
    if (!isGeminiImageModel(model) && request.negativePrompt && isOptionalImagenParameterRejected(err)) {
      try {
        const aiplatform = options.aiplatform || requireAiPlatform();
        const predictionClient = createPredictionClient(config, { ...options, aiplatform });
        const retryRequest = { ...request, negativePrompt: '' };
        const result = await callVertexImagen({
          model,
          request: retryRequest,
          config,
          predictionClient,
          aiplatform,
          timeoutMs: options.timeoutMs || 60000
        });
        return normalizedResponse({
          model,
          providerModel: result.providerModel,
          request: retryRequest,
          images: result.images,
          rawProviderResponse: result.data
        }, env, options);
      } catch (retryErr) {
        throw normalizeVertexError(retryErr, {
          message: 'Vertex Imagen request failed.',
          modelId: model.id,
          providerModel: config.imagenModel
        });
      }
    }
    throw normalizeVertexError(err, {
      message: isGeminiImageModel(model) ? 'Vertex Gemini Image request failed.' : 'Vertex Imagen request failed.',
      modelId: model.id,
      providerModel: isGeminiImageModel(model) ? geminiImageModelFor(model) : config.imagenModel
    });
  }
}

function buildGeminiVisionParts(request = {}) {
  const parts = [];
  normalizeReferenceImages(request.referenceImages).forEach((ref, index) => {
    if (!ref.data) {
      throw providerError('REFERENCE_IMAGE_FORMAT_UNSUPPORTED', 'Vertex Gemini visual reasoning references must be base64 data URLs.', {
        providerAdapter: 'google',
        statusCode: 400
      });
    }
    parts.push({ text: referenceLabel(ref, index) });
    parts.push({
      inlineData: {
        mimeType: ref.mimeType || 'image/png',
        data: ref.data
      }
    });
  });
  parts.push({ text: String(request.prompt || '').trim() });
  return parts;
}

function geminiVisionModelCandidates(request = {}, config = resolveVertexConfig(), options = {}) {
  const preferred = String(request.model || options.model || config.geminiFastModel || DEFAULT_VERTEX_GEMINI_FAST_MODEL).trim();
  return [
    preferred,
    config.geminiFastModel,
    DEFAULT_VERTEX_GEMINI_FAST_MODEL,
    config.geminiProModel,
    DEFAULT_VERTEX_GEMINI_PRO_MODEL
  ].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
}

async function reasonAboutImages(request = {}, options = {}) {
  const env = options.env || process.env;
  const config = resolveVertexConfig(env);
  const parts = buildGeminiVisionParts(request);
  let lastError = null;
  for (const modelName of geminiVisionModelCandidates(request, config, options)) {
    for (const candidateConfig of vertexLocationConfigs(config, options)) {
      try {
        const model = createGeminiModel(candidateConfig, modelName, options);
        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const response = result?.response || result;
        const text = typeof response?.text === 'function'
          ? response.text()
          : String(response?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '');
        return {
          ok: true,
          provider: 'google',
          providerModel: modelName,
          vertexLocation: candidateConfig.location,
          text,
          rawProviderResponse: shouldIncludeRaw(env, options) ? response : undefined
        };
      } catch (err) {
        const normalized = normalizeVertexError(err, {
          message: 'Vertex Gemini visual reasoning request failed.',
          modelId: request.modelId || 'google/vertex-gemini-vision',
          providerModel: modelName
        });
        lastError = normalized;
        if (normalized.code === 'VERTEX_MODEL_UNAVAILABLE') continue;
        throw normalized;
      }
    }
  }
  throw lastError || providerError('VERTEX_MODEL_UNAVAILABLE', 'No Vertex Gemini visual reasoning model is available for this project and region.', {
    providerAdapter: 'google',
    provider: 'google',
    modelId: request.modelId || 'google/vertex-gemini-vision',
    providerModel: '',
    statusCode: 404
  });
}

module.exports = {
  DEFAULT_VERTEX_PROJECT_ID,
  DEFAULT_VERTEX_LOCATION,
  DEFAULT_VERTEX_LOCATION_FALLBACKS,
  DEFAULT_VERTEX_IMAGEN_MODEL,
  DEFAULT_VERTEX_GEMINI_FAST_MODEL,
  DEFAULT_VERTEX_GEMINI_PRO_MODEL,
  DEFAULT_VERTEX_GEMINI_IMAGE_FAST_MODEL,
  DEFAULT_VERTEX_GEMINI_IMAGE_PRO_MODEL,
  DEFAULT_VERTEX_CLAUDE_MODEL,
  buildGeminiImageParts,
  buildGeminiImagePrompt,
  buildGeminiVisionParts,
  buildVertexImagenPredictRequest,
  callVertexGeminiImage,
  createGenAIClient,
  geminiVisionModelCandidates,
  generateImage,
  geminiImageConfig,
  isOptionalImagenParameterRejected,
  isGeminiImageModel,
  normalizedResponse,
  normalizeCandidateCount,
  normalizeVertexError,
  parseVertexLocationFallbacks,
  reasonAboutImages,
  resolveVertexConfig,
  vertexLocationConfigs,
  validateGoogleRequest,
  geminiImageFallbackModels
};
