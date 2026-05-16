const express = require('express');
const {
  assertRegistryIntegrity,
  listPublicImageModels,
  selectImageModel
} = require('../lib/imageGeneration/modelRegistry');
const {
  publicProviderStatus,
  readinessForModel,
  resolveImageProviderEnv
} = require('../lib/imageGeneration/providerVault');
const {
  normalizeSpendLane,
  referenceModeFor,
  referenceStrategyFor,
  routeWarningsFor,
  routingInputForSpendLane
} = require('./imageGeneration')._private;

const router = express.Router();

router.get('/', (req, res) => {
  assertRegistryIntegrity();
  const env = resolveImageProviderEnv();
  const providerStatus = publicProviderStatus(env);
  res.json({
    ok: true,
    schemaVersion: 'image-routing.v1',
    providerStatus,
    items: listPublicImageModels(env).map(model => ({
      ...model,
      providerReadiness: readinessForModel(model, env)
    }))
  });
});

router.post('/route-preview', (req, res) => {
  assertRegistryIntegrity();
  const env = resolveImageProviderEnv();
  const body = req.body || {};
  const spendLane = normalizeSpendLane(body.spendLane);
  const withReadiness = model => model ? ({
    ...model,
    providerReadiness: readinessForModel(model, env)
  }) : model;
  const preview = selectImageModel(routingInputForSpendLane(body, spendLane), env);
  const selected = withReadiness(preview.selectedModel);
  const referenceCount = Array.isArray(body.referenceImages) ? body.referenceImages.length : Number(body.referenceCount || 0);
  const exactIdentityCapable = Boolean(selected?.supportsImageToImage && selected?.supportsMultiReference && selected?.id !== 'google/imagen-3-text-only');
  res.json({
    ok: true,
    ...preview,
    selectedModel: selected,
    alternatives: (preview.alternatives || []).map(withReadiness),
    spendLane,
    actualSpendProvider: selected?.providerAdapter === 'google' ? 'google_cloud_vertex' : selected?.providerAdapter === 'fal' ? 'fal_ai' : selected?.providerAdapter || 'image_router',
    referenceStrategy: referenceStrategyFor(body, selected, spendLane),
    referenceMode: referenceModeFor(body, selected, spendLane),
    exact_identity_capable: exactIdentityCapable,
    raw_photo_enforced: true,
    requires_identity_refs: Boolean(referenceCount > 0 || body.identityMode === 'exact_character'),
    routeWarnings: routeWarningsFor(body, selected, spendLane),
    providerStatus: publicProviderStatus(env)
  });
});

module.exports = router;
