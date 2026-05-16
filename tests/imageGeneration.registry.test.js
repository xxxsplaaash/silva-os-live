const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertRegistryIntegrity,
  getProviderAdapterForModel,
  listImageModels,
  listPublicImageModels
} = require('../lib/imageGeneration/modelRegistry');

test('image model registry exports the requested initial models', () => {
  assert.equal(assertRegistryIntegrity(), true);
  const ids = listImageModels().map(model => model.id).sort();
  assert.deepEqual(ids, [
    'black-forest-labs/flux-2-max',
    'black-forest-labs/flux-2-pro',
    'bytedance/seedream-5-lite',
    'fal/qwen-image-2-edit',
    'google/imagen-3-text-only',
    'google/nano-banana-2',
    'google/nano-banana-pro',
    'openai/gpt-image-1.5',
    'openai/gpt-image-2'
  ]);
});

test('image model registry follows the hard provider adapter rule', () => {
  for (const model of listImageModels()) {
    if (model.id.startsWith('google/')) {
      assert.equal(model.providerAdapter, 'google');
      assert.equal(getProviderAdapterForModel(model.id), 'google');
    } else {
      assert.equal(model.providerAdapter, 'fal');
      assert.equal(getProviderAdapterForModel(model.id), 'fal');
    }
  }
  assert.equal(getProviderAdapterForModel('prunaai/p-image-edit'), 'fal');
});

test('public image model metadata does not expose secrets', () => {
  const env = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: '/tmp/vertex_secret_value.json',
    VERTEX_PROJECT_ID: 'vertex_secret_project',
    FAL_KEY: 'fal_secret_value',
    USD_ZAR_RATE: '18.5'
  };
  const publicModels = listPublicImageModels(env);
  const serialized = JSON.stringify(publicModels);
  assert.ok(publicModels.every(model => model.schemaVersion === 'image-routing.v1'));
  assert.ok(publicModels.every(model => typeof model.costEstimateZar === 'number'));
  assert.doesNotMatch(serialized, /vertex_secret_value|vertex_secret_project|fal_secret_value/);
  const googleModel = publicModels.find(model => model.id === 'google/nano-banana-2');
  assert.match(googleModel.provider, /Vertex AI/);
  assert.equal(googleModel.model, 'gemini-2.5-flash-image');
  assert.equal(googleModel.supportsImageToImage, true);
  const proModel = publicModels.find(model => model.id === 'google/nano-banana-pro');
  assert.equal(proModel.model, 'gemini-3-pro-image-preview');
  assert.equal(proModel.supportsMultiReference, true);
  const imagenTextOnly = publicModels.find(model => model.id === 'google/imagen-3-text-only');
  assert.equal(imagenTextOnly.supportsImageToImage, false);
  const gptImage = publicModels.find(model => model.id === 'openai/gpt-image-2');
  assert.equal(gptImage.providerAdapter, 'fal');
  assert.match(gptImage.provider, /fal\.ai/);
});

test('public image model metadata includes full UI decision support and ZAR fallback estimates', () => {
  const previous = process.env.USD_ZAR_RATE;
  delete process.env.USD_ZAR_RATE;

  try {
    const publicModels = listPublicImageModels(process.env);
    assert.ok(publicModels.every(model => typeof model.costEstimateZar === 'number'));
    assert.ok(publicModels.every(model => model.costEstimateZarApproximate === true));
    assert.ok(publicModels.every(model => typeof model.usdZarRateUsed === 'number'));
    assert.ok(publicModels.every(model => Array.isArray(model.strengths) && model.strengths.length > 0));
    assert.ok(publicModels.every(model => Array.isArray(model.weaknesses) && model.weaknesses.length > 0));
    assert.ok(publicModels.every(model => Array.isArray(model.bestFor) && model.bestFor.length > 0));
    assert.ok(publicModels.every(model => Array.isArray(model.notIdealFor) && model.notIdealFor.length > 0));
    assert.ok(publicModels.every(model => Array.isArray(model.avoidWhen) && model.avoidWhen.length > 0));
    assert.ok(publicModels.every(model => typeof model.supportsTextToImage === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.supportsImageToImage === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.supportsMultiReference === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.supportsEditing === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.skinTonePerformance === 'string' && model.skinTonePerformance.length > 0));
    for (const field of ['identityLockStrength', 'backgroundRealism', 'creativeRange']) {
      assert.ok(publicModels.every(model => Number.isInteger(model[field]) && model[field] >= 1 && model[field] <= 5), `${field} must be a 1-5 rating`);
    }
    assert.ok(publicModels.every(model => ['fast', 'medium', 'slow'].includes(model.speedRating)));
    assert.ok(publicModels.every(model => typeof model.costZAR === 'number' && model.costZAR > 0));
    assert.ok(publicModels.every(model => typeof model.requiresRefs === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.supportsNegativePrompt === 'boolean'));
    assert.ok(publicModels.every(model => typeof model.characterNote === 'string'));
    assert.ok(publicModels.every(model => model.warningNote === null || typeof model.warningNote === 'string'));
    const nanoPro = publicModels.find(model => model.id === 'google/nano-banana-pro');
    assert.equal(nanoPro.identityLockStrength, 5);
    assert.match(nanoPro.skinTonePerformance, /excellent/i);
    const fluxPro = publicModels.find(model => model.id === 'black-forest-labs/flux-2-pro');
    assert.equal(fluxPro.backgroundRealism, 5);
    const imagen = publicModels.find(model => model.id === 'google/imagen-3-text-only');
    assert.equal(imagen.creativeRange, 5);
  } finally {
    if (previous === undefined) delete process.env.USD_ZAR_RATE;
    else process.env.USD_ZAR_RATE = previous;
  }
});
