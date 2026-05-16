const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'silva-provider-vault-test-'));
const PREVIOUS_VERTEX_UPLOAD_PATH = process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH;
process.env.SILVA_DB_PATH = path.join(TEST_DB_DIR, 'silva-provider-vault-test.db');
process.env.SILVA_PROVIDER_VAULT_KEY = 'provider-vault-test-key-that-never-touches-local-user-data';
process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH = path.join(TEST_DB_DIR, 'vertex-service-account.json');

test.after(() => {
  if (PREVIOUS_VERTEX_UPLOAD_PATH === undefined) delete process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH;
  else process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH = PREVIOUS_VERTEX_UPLOAD_PATH;
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

const providerCredentialsRouter = require('../routes/providerCredentials');
const imageModelsRouter = require('../routes/imageModels');
const imageGenerationRouter = require('../routes/imageGeneration');
const providers = require('../lib/imageGeneration/providers');
const {
  deleteProviderCredential,
  publicProviderStatus,
  resolveImageProviderEnv,
  saveProviderCredential
} = require('../lib/imageGeneration/providerVault');

async function withTestServer(fn) {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use('/api/provider-credentials', providerCredentialsRouter);
  app.use('/api/image-models', imageModelsRouter);
  app.use('/api/image-generation', imageGenerationRouter);
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function cleanupVault() {
  [
    'google.api_key',
    'google.vertex_service_account_path',
    'google.vertex_project_id',
    'google.vertex_location',
    'google.vertex_imagen_model',
    'google.vertex_gemini_fast_model',
    'google.vertex_gemini_pro_model',
    'openai.api_key',
    'openai.image_model',
    'fal.api_key',
    'fal.gpt_image_2_model',
    'fal.gpt_image_1_5_model',
    'fal.flux_2_pro_model',
    'fal.flux_2_max_model',
    'fal.seedream_text_model',
    'fal.seedream_edit_model',
    'fal.utility_edit_model',
    'google.vertex_claude_model',
    'replicate.gpt_image_2_model',
    'replicate.gpt_image_1_5_model',
    'replicate.api_token',
    'settings.usd_zar_rate',
    'studio_pulse.gemini_api_key'
  ].forEach(deleteProviderCredential);
}

test('provider credential status and saves never return raw keys', async () => {
  cleanupVault();
  await withTestServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/provider-credentials`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'fal',
        secretType: 'api_key',
        value: 'fal-test-secret-value'
      })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.credential.id, 'fal.api_key');
    assert.match(data.credential.maskedValue, /^fal-\.\.\./);
    assert.doesNotMatch(JSON.stringify(data), /fal-test-secret-value/);

    const status = await fetch(`${baseUrl}/api/provider-credentials/status`);
    assert.equal(status.status, 200);
    const statusData = await status.json();
    assert.equal(statusData.providers.some(item => item.id === 'fal' && item.configured), true);
    assert.equal(statusData.providers.some(item => item.id === 'openai'), false);
    assert.doesNotMatch(JSON.stringify(statusData), /fal-test-secret-value|OPENAI_API_KEY|GOOGLE_API_KEY|REPLICATE_API_TOKEN|FAL_KEY|GEMINI_API_KEY|service-account-secret/);
  });
  cleanupVault();
});

test('Vertex service-account path from vault overrides environment without restarting image generation route', async () => {
  cleanupVault();
  const keyPath = path.join(TEST_DB_DIR, 'vertex-service-account.json');
  fs.writeFileSync(keyPath, JSON.stringify({ type: 'service_account', project_id: 'test-project' }));
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  delete process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH;

  try {
    await withTestServer(async baseUrl => {
      const save = await fetch(`${baseUrl}/api/provider-credentials`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          secretType: 'service_account_path',
          value: keyPath
        })
      });
      assert.equal(save.status, 200);

      providers.ADAPTERS.google.generateImage = async (request, options = {}) => {
        assert.equal(options.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH, keyPath);
        assert.equal(options.env.VERTEX_PROJECT_ID, 'project-be35f944-1782-4f27-86f');
        return {
          ok: true,
          provider: 'google',
          modelId: request.modelId,
          providerModel: 'imagen-3.0-generate-001',
          images: [{ url: 'https://vertex.example/output.png' }],
          costEstimateUsd: 0.04,
          costEstimateZar: 0.74
        };
      };

      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'cheap_draft',
          prompt: 'A vault-routed silver studio render.'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.providerReadiness.configured, true);
      assert.equal(data.providerReadiness.source, 'vault');
      assert.doesNotMatch(JSON.stringify(data), new RegExp(keyPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.doesNotMatch(JSON.stringify(data), /test-project/);
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    if (previous.VERTEX_SERVICE_ACCOUNT_JSON_PATH === undefined) delete process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH;
    else process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = previous.VERTEX_SERVICE_ACCOUNT_JSON_PATH;
    cleanupVault();
  }
});

test('Google Vertex service-account JSON can be saved without exposing JSON contents', async () => {
  cleanupVault();
  const generatedPath = process.env.SILVA_VERTEX_SERVICE_ACCOUNT_UPLOAD_PATH;
  const serviceAccountJson = {
    type: 'service_account',
    project_id: 'json-project-id',
    private_key: '-----BEGIN PRIVATE KEY-----\\nunit-test-private-key\\n-----END PRIVATE KEY-----\\n',
    client_email: 'vertex-unit-test@json-project-id.iam.gserviceaccount.com',
    token_uri: 'https://oauth2.googleapis.com/token'
  };

  await withTestServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/provider-credentials`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        secretType: 'service_account_json',
        value: JSON.stringify(serviceAccountJson)
      })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    const serialized = JSON.stringify(data);
    assert.equal(data.ok, true);
    assert.equal(data.credential.id, 'google.vertex_service_account_path');
    assert.equal(data.credential.maskedValue, '.../vertex-service-account.json');
    assert.equal(data.status.providers.find(item => item.id === 'google').configured, true);
    assert.equal(data.status.providers.find(item => item.id === 'google').source, 'vault');
    assert.equal(data.status.settings.vertex.projectId.value, 'json-project-id');
    assert.equal(fs.existsSync(generatedPath), true);
    assert.equal(resolveImageProviderEnv({}).VERTEX_SERVICE_ACCOUNT_JSON_PATH, generatedPath);
    assert.doesNotMatch(serialized, /unit-test-private-key|vertex-unit-test@|BEGIN PRIVATE KEY|token_uri/);
    assert.doesNotMatch(serialized, new RegExp(generatedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  cleanupVault();
});

test('fal key from vault overrides environment without restarting image generation route', async () => {
  cleanupVault();
  const previous = {
    FAL_KEY: process.env.FAL_KEY
  };
  const originalFalGenerate = providers.ADAPTERS.fal.generateImage;
  delete process.env.FAL_KEY;

  try {
    await withTestServer(async baseUrl => {
      const save = await fetch(`${baseUrl}/api/provider-credentials`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider: 'fal',
          secretType: 'api_key',
          value: 'fal_vault_secret_for_generation'
        })
      });
      assert.equal(save.status, 200);

      providers.ADAPTERS.fal.generateImage = async (request, options = {}) => {
        assert.equal(options.env.FAL_KEY, 'fal_vault_secret_for_generation');
        return {
          ok: true,
          provider: 'fal',
          modelId: request.modelId,
          providerModel: 'openai/gpt-image-2',
          images: [{ url: 'https://fal.media/vault-output.png' }],
          costEstimateUsd: 0.12,
          costEstimateZar: 2.22
        };
      };

      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'complex_edit',
          preferredModel: 'openai/gpt-image-2',
          requiresEditing: true,
          prompt: 'A vault-routed GPT image edit.'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.provider, 'fal');
      assert.equal(data.providerReadiness.configured, true);
      assert.equal(data.providerReadiness.source, 'vault');
      assert.doesNotMatch(JSON.stringify(data), /fal_vault_secret_for_generation/);
    });
  } finally {
    providers.ADAPTERS.fal.generateImage = originalFalGenerate;
    if (previous.FAL_KEY === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = previous.FAL_KEY;
    cleanupVault();
  }
});


test('environment fallback status is masked and delete makes vault status missing', () => {
  cleanupVault();
  const status = publicProviderStatus({
    FAL_KEY: 'env_fal_secret',
    USD_ZAR_RATE: '19.1'
  });
  const fal = status.providers.find(item => item.id === 'fal');
  assert.equal(fal.configured, true);
  assert.equal(fal.source, 'env');
  assert.equal(status.providers.some(item => item.id === 'openai'), false);
  assert.doesNotMatch(JSON.stringify(status), /env_fal_secret|FAL_KEY/);

  saveProviderCredential({ provider: 'fal', value: 'fal_vault_secret' });
  assert.equal(publicProviderStatus({}).providers.find(item => item.id === 'fal').configured, true);
  assert.equal(deleteProviderCredential('fal.api_key'), true);
  assert.equal(publicProviderStatus({}).providers.find(item => item.id === 'fal').configured, false);
  cleanupVault();
});

test('fal key controls GPT Image readiness without an OpenAI key', () => {
  cleanupVault();
  let status = publicProviderStatus({});
  assert.equal(status.providers.some(item => item.id === 'openai'), false);
  assert.equal(status.providers.find(item => item.id === 'fal').configured, false);

  saveProviderCredential({ provider: 'fal', value: 'fal_vault_secret_for_gpt' });
  status = publicProviderStatus({});
  const fal = status.providers.find(item => item.id === 'fal');
  assert.equal(fal.configured, true);
  assert.equal(fal.supportedModelIds.includes('openai/gpt-image-2'), true);
  assert.equal(fal.supportedModelIds.includes('openai/gpt-image-1.5'), true);

  assert.equal(deleteProviderCredential('fal.api_key'), true);
  status = publicProviderStatus({});
  assert.equal(status.providers.find(item => item.id === 'fal').configured, false);
  cleanupVault();
});
