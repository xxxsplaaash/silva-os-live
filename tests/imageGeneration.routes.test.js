const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'silva-image-routes-test-'));
process.env.SILVA_DB_PATH = path.join(TEST_DB_DIR, 'silva-image-routes-test.db');
process.env.SILVA_PROVIDER_VAULT_KEY = 'image-routes-vault-test-key-that-does-not-touch-local-user-data';

const imageModelsRouter = require('../routes/imageModels');
const imageGenerationRouter = require('../routes/imageGeneration');
const generatorRouter = require('../routes/generator');
const providers = require('../lib/imageGeneration/providers');

const TEST_KEY_PATH = path.join(TEST_DB_DIR, 'service-account.json');
fs.writeFileSync(TEST_KEY_PATH, JSON.stringify({ type: 'service_account', project_id: 'route-test' }));

test.after(() => {
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

async function withTestServer(fn) {
  const app = express();
  app.use(express.json());
  app.use('/api/image-models', imageModelsRouter);
  app.use('/api/image-generation', imageGenerationRouter);
  app.use('/api/generator', generatorRouter);
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('GET /api/image-models returns safe public registry data', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    FAL_KEY: process.env.FAL_KEY,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.FAL_KEY = 'route_fal_secret';
  process.env.USD_ZAR_RATE = '18.25';

  try {
    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-models`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.schemaVersion, 'image-routing.v1');
      assert.equal(data.items.length, 9);
      assert.ok(data.items.some(model => model.id === 'google/nano-banana-2'));
      assert.ok(data.items.some(model => model.id === 'google/nano-banana-pro'));
      const gptImage = data.items.find(model => model.id === 'openai/gpt-image-2');
      assert.equal(gptImage.providerAdapter, 'fal');
      assert.equal(gptImage.providerReadiness.providerAdapter, 'fal');
      assert.doesNotMatch(JSON.stringify(data), /route_fal_secret|route-test/);
      assert.doesNotMatch(JSON.stringify(data), new RegExp(TEST_KEY_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.ok(data.items.every(model => typeof model.providerAdapter === 'string'));
      assert.ok(data.items.every(model => typeof model.costEstimateZar === 'number'));
      assert.ok(data.items.every(model => Array.isArray(model.strengths)));
      assert.ok(data.items.every(model => Array.isArray(model.weaknesses)));
      assert.ok(data.items.every(model => Array.isArray(model.bestFor)));
      assert.ok(data.items.every(model => Array.isArray(model.avoidWhen)));
    });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-models/route-preview returns routing preview', async () => {
  await withTestServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/image-models/route-preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        intent: 'complex_edit',
        referenceCount: 1,
        requiresEditing: true,
        requiresTextRendering: true
      })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.selectedModel.id, 'google/nano-banana-pro');
    assert.equal(data.selectedModel.providerAdapter, 'google');
    assert.equal(data.selectedModel.providerReadiness.providerAdapter, 'google');
    assert.ok(Array.isArray(data.alternatives));
    assert.equal(data.referenceStrategy, 'google_direct_reference_images');
  });
});

test('POST /api/image-models/route-preview keeps references on Google credit lane', async () => {
  await withTestServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/image-models/route-preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        spendLane: 'google_credits',
        intent: 'cheap_draft',
        referenceCount: 2,
        requiresEditing: true
      })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.spendLane, 'google_credits');
    assert.equal(data.selectedModel.providerAdapter, 'google');
    assert.equal(data.selectedModel.id, 'google/nano-banana-pro');
    assert.equal(data.selectedModel.model, 'gemini-3-pro-image-preview');
    assert.equal(data.referenceStrategy, 'google_direct_reference_images');
    assert.equal(data.referenceMode, 'direct_reference_edit');
    assert.equal(data.exact_identity_capable, true);
    assert.equal(data.raw_photo_enforced, true);
    assert.equal(data.requires_identity_refs, true);
    assert.equal(data.routeWarnings.length, 0);
  });
});

test('POST /api/image-models/route-preview sends auto best identity references to Google direct refs first', async () => {
  await withTestServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/image-models/route-preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        spendLane: 'auto_best',
        intent: 'cheap_draft',
        preferredModel: 'google/nano-banana-2',
        referenceCount: 2,
        requiresEditing: true,
        realismMode: 'photo_identity_lock',
        referenceMode: 'direct_reference_edit',
        metadata: { character: 'vanya' }
      })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.spendLane, 'auto_best');
    assert.equal(data.selectedModel.id, 'google/nano-banana-2');
    assert.equal(data.selectedModel.providerAdapter, 'google');
    assert.equal(data.referenceStrategy, 'google_direct_reference_images');
    assert.equal(data.referenceMode, 'direct_reference_edit');
  });
});

test('POST /api/image-generation/generate returns normalized provider output', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async (request, options = {}) => {
      assert.equal(options.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH, TEST_KEY_PATH);
      return {
        ok: true,
        provider: 'google',
        modelId: request.modelId,
        providerModel: 'imagen-3.0-generate-001',
        images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
        costEstimateUsd: 0.04,
        costEstimateZar: 0.72
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'cheap_draft',
          prompt: 'A clean silver studio render.'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.selectedModel.id, 'google/nano-banana-2');
      assert.equal(data.provider, 'google');
      assert.equal(data.modelId, 'google/nano-banana-2');
      assert.equal(data.images.length, 1);
      assert.doesNotMatch(JSON.stringify(data), /route-test/);
      assert.doesNotMatch(JSON.stringify(data), new RegExp(TEST_KEY_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('image generation exposes resumable status by client generation id', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async request => {
      return {
        ok: true,
        provider: 'google',
        modelId: request.modelId,
        providerModel: 'gemini-3-pro-image-preview',
        images: [{ dataUrl: 'data:image/png;base64,c3RhdHVzLXJlY292ZXJ5' }],
        costEstimateUsd: 0.04,
        costEstimateZar: 0.72
      };
    };

    await withTestServer(async baseUrl => {
      const generationId = 'client_gen_status_test';
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientGenerationId: generationId,
          intent: 'cheap_draft',
          prompt: 'A clean status recovery render.',
          metadata: {
            clientGenerationId: generationId,
            character: 'leah',
            shotMode: 'selfie'
          }
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.generationId, generationId);

      const statusResponse = await fetch(`${baseUrl}/api/generator/generation-status/${generationId}`);
      assert.equal(statusResponse.status, 200);
      const status = await statusResponse.json();
      assert.equal(status.ok, true);
      assert.equal(status.schemaVersion, 'generator.generation-status.v1');
      assert.equal(status.status, 'complete');
      assert.equal(status.result.generationId, generationId);
      assert.equal(status.result.images.length, 1);

      const unknownResponse = await fetch(`${baseUrl}/api/generator/generation-status/missing_generation`);
      const unknown = await unknownResponse.json();
      assert.equal(unknown.status, 'unknown');
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate sends actual refs to Google direct-reference model', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  const originalGoogleReason = providers.ADAPTERS.google.reasonAboutImages;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.reasonAboutImages = async (request, options = {}) => {
      throw new Error('reasonAboutImages should not be called for Google direct-reference image routes');
    };
    providers.ADAPTERS.google.generateImage = async (request, options = {}) => {
      assert.equal(options.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH, TEST_KEY_PATH);
      assert.equal(request.modelId, 'google/nano-banana-pro');
      assert.equal(request.referenceImages.length, 2);
      assert.equal(request.referenceImages[0].label, 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE');
      assert.equal(request.referenceImages[1].label, 'FULL BODY / BUILD CONTACT SHEET REFERENCE');
      assert.match(request.prompt, /clean silver studio portrait/i);
      assert.match(request.negativePrompt, /cartoon/);
      assert.match(request.negativePrompt, /social media frame/);
      assert.match(request.negativePrompt, /generic face/);
      assert.equal(request.realismMode, 'photo_identity_lock');
      assert.equal(request.referenceMode, 'direct_reference_edit');
      assert.equal(request.candidateCount, 1);
      return {
        ok: true,
        provider: 'google',
        modelId: request.modelId,
        providerModel: 'gemini-3-pro-image-preview',
        images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
        costEstimateUsd: 0.08,
        costEstimateZar: 1.44
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'google_credits',
          intent: 'cheap_draft',
          prompt: 'A clean silver studio portrait.',
          referenceImages: [
            { type: 'face', label: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, dataUrl: 'data:image/png;base64,aGVsbG8=' },
            { type: 'body', label: 'FULL BODY / BUILD CONTACT SHEET REFERENCE', priority: 2, dataUrl: 'data:image/png;base64,d29ybGQ=' }
          ],
          requiresEditing: true,
          outputFormatMode: 'raw_photo'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.spendLane, 'google_credits');
      assert.equal(data.actualSpendProvider, 'google_cloud_vertex');
      assert.equal(data.referenceStrategy, 'google_direct_reference_images');
      assert.equal(data.referenceMode, 'direct_reference_edit');
      assert.equal(data.realismMode, 'photo_identity_lock');
      assert.equal(data.routeWarnings.length, 0);
      assert.equal(data.analysisProviderModel, null);
      assert.equal(data.providerCallCount, 1);
      assert.equal(data.outputFormatMode, 'raw_photo');
      assert.equal(data.identityMode, null);
      assert.equal(data.provider, 'google');
      assert.equal(data.modelId, 'google/nano-banana-pro');
      assert.equal(data.selectedModel.providerAdapter, 'google');
      assert.doesNotMatch(JSON.stringify(data), /route-test/);
      assert.doesNotMatch(JSON.stringify(data), new RegExp(TEST_KEY_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    providers.ADAPTERS.google.reasonAboutImages = originalGoogleReason;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate accepts labeled HTTP reference objects', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async request => {
      assert.equal(request.modelId, 'google/nano-banana-pro');
      assert.equal(request.referenceImages.length, 2);
      assert.equal(request.referenceImages[0].label, 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE');
      assert.equal(request.referenceImages[0].url, 'https://assets.example/face.png');
      assert.equal(request.referenceImages[1].label, 'FULL BODY / BUILD CONTACT SHEET REFERENCE');
      assert.equal(request.referenceImages[1].url, 'https://assets.example/body.png');
      return {
        ok: true,
        provider: 'google',
        modelId: request.modelId,
        providerModel: 'gemini-3-pro-image-preview',
        images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
        costEstimateUsd: 0.08,
        costEstimateZar: 1.44
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'google_credits',
          intent: 'cheap_draft',
          prompt: 'A clean raw final camera photograph.',
          referenceImages: [
            { type: 'face', label: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, url: 'https://assets.example/face.png' },
            { type: 'body', label: 'FULL BODY / BUILD CONTACT SHEET REFERENCE', priority: 2, url: 'https://assets.example/body.png' }
          ],
          requiresEditing: true,
          realismMode: 'photo_identity_lock',
          referenceMode: 'direct_reference_edit',
          outputFormatMode: 'raw_photo'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.referenceStrategy, 'google_direct_reference_images');
      assert.equal(data.providerCallCount, 1);
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate rejects unresolved vault placeholders before provider call', async () => {
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  let providerCalled = false;
  providers.ADAPTERS.google.generateImage = async () => {
    providerCalled = true;
    throw new Error('provider should not be called for unresolved vault refs');
  };

  try {
    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'google_credits',
          intent: 'cheap_draft',
          prompt: 'A clean raw final camera photograph.',
          referenceImages: [
            { type: 'face', label: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, dataUrl: 'vault:face' }
          ],
          requiresEditing: true,
          outputFormatMode: 'raw_photo'
        })
      });
      assert.equal(response.status, 400);
      const data = await response.json();
      assert.equal(data.ok, false);
      assert.equal(data.error, 'reference_image_unresolved');
      assert.match(data.message, /unresolved vault placeholder/i);
      assert.equal(providerCalled, false);
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
  }
});

test('POST /api/image-generation/generate returns identity QA for exact character mode', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  const originalGoogleReason = providers.ADAPTERS.google.reasonAboutImages;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async request => ({
      ok: true,
      provider: 'google',
      modelId: request.modelId,
      providerModel: 'gemini-3-pro-image-preview',
      images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
      costEstimateUsd: 0.08,
      costEstimateZar: 1.44,
      outputFormatMode: request.outputFormatMode,
      identityMode: request.identityMode
    });
    providers.ADAPTERS.google.reasonAboutImages = async request => {
      assert.equal(request.referenceImages.length, 3);
      assert.equal(request.referenceImages[0].label, 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE');
      assert.equal(request.referenceImages[1].label, 'FULL BODY / BUILD CONTACT SHEET REFERENCE');
      assert.equal(request.referenceImages[2].label, 'GENERATED OUTPUT TO COMPARE');
      return {
        providerModel: 'gemini-1.5-flash-002',
        text: '{"identityScore":42,"identityVerdict":"rejected","mismatchNotes":["jaw shape drift","hair texture changed"]}'
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'google_credits',
          intent: 'cheap_draft',
          prompt: 'A camera-real exact character portrait.',
          referenceImages: [
            { type: 'face', label: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, dataUrl: 'data:image/png;base64,aGVsbG8=' },
            { type: 'body', label: 'FULL BODY / BUILD CONTACT SHEET REFERENCE', priority: 2, dataUrl: 'data:image/png;base64,d29ybGQ=' }
          ],
          outputFormatMode: 'raw_photo',
          identityMode: 'exact_character',
          realismMode: 'photo_identity_lock'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.identityScore, 42);
      assert.equal(data.identityVerdict, 'mismatch_suspected');
      assert.equal(data.identityAccepted, false);
      assert.deepEqual(data.identityMismatchNotes, ['jaw shape drift', 'hair texture changed']);
      assert.deepEqual(data.identityQaEvidence, {});
      assert.equal(data.identityQaProviderModel, 'gemini-1.5-flash-002');
      assert.equal(data.providerCallCount, 2);
      assert.equal(data.outputFormatMode, 'raw_photo');
      assert.equal(data.identityMode, 'exact_character');
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    providers.ADAPTERS.google.reasonAboutImages = originalGoogleReason;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate downgrades high identity QA scores without evidence', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  const originalGoogleReason = providers.ADAPTERS.google.reasonAboutImages;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async request => ({
      ok: true,
      provider: 'google',
      modelId: request.modelId,
      providerModel: 'gemini-3-pro-image-preview',
      images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
      costEstimateUsd: 0.08,
      costEstimateZar: 1.44,
      outputFormatMode: request.outputFormatMode,
      identityMode: request.identityMode
    });
    providers.ADAPTERS.google.reasonAboutImages = async () => ({
      providerModel: 'gemini-1.5-flash-002',
      text: '{"identityScore":95,"identityVerdict":"looks_aligned","mismatchNotes":[]}'
    });

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'google_credits',
          prompt: 'A camera-real exact character portrait.',
          referenceImages: [
            { type: 'face', label: 'PRIMARY FACE CONTACT SHEET / IDENTITY REFERENCE', priority: 1, dataUrl: 'data:image/png;base64,aGVsbG8=' },
            { type: 'body', label: 'FULL BODY / BUILD CONTACT SHEET REFERENCE', priority: 2, dataUrl: 'data:image/png;base64,d29ybGQ=' }
          ],
          outputFormatMode: 'raw_photo',
          identityMode: 'exact_character',
          realismMode: 'photo_identity_lock'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.identityScore, 95);
      assert.equal(data.identityVerdict, 'uncertain');
      assert.equal(data.identityAccepted, null);
      assert.match(data.identityMismatchNotes.join(' '), /comparison evidence/i);
      assert.deepEqual(data.identityQaEvidence, {});
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    providers.ADAPTERS.google.reasonAboutImages = originalGoogleReason;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate calls fal adapter for GPT Image routes', async () => {
  const previous = {
    FAL_KEY: process.env.FAL_KEY,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalFalGenerate = providers.ADAPTERS.fal.generateImage;
  process.env.FAL_KEY = 'route_fal_secret';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.fal.generateImage = async (request, options = {}) => {
      assert.equal(options.env.FAL_KEY, 'route_fal_secret');
      assert.equal(request.modelId, 'openai/gpt-image-2');
      return {
        ok: true,
        provider: 'fal',
        modelId: request.modelId,
        providerModel: 'openai/gpt-image-2',
        images: [{ url: 'https://fal.media/route-gpt-image.png' }],
        costEstimateUsd: 0.12,
        costEstimateZar: 2.16
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'complex_edit',
          spendLane: 'fal_full_ai',
          preferredModel: 'openai/gpt-image-2',
          requiresEditing: true,
          prompt: 'A precise reference edit.'
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.provider, 'fal');
      assert.equal(data.modelId, 'openai/gpt-image-2');
      assert.equal(data.selectedModel.providerAdapter, 'fal');
      assert.equal(data.images[0].url, 'https://fal.media/route-gpt-image.png');
      assert.doesNotMatch(JSON.stringify(data), /route_fal_secret/);
    });
  } finally {
    providers.ADAPTERS.fal.generateImage = originalFalGenerate;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('POST /api/image-generation/generate auto best with identity refs stays on Google direct refs by default', async () => {
  const previous = {
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID,
    VERTEX_LOCATION: process.env.VERTEX_LOCATION,
    USD_ZAR_RATE: process.env.USD_ZAR_RATE
  };
  const originalGoogleGenerate = providers.ADAPTERS.google.generateImage;
  process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH = TEST_KEY_PATH;
  process.env.VERTEX_PROJECT_ID = 'project-be35f944-1782-4f27-86f';
  process.env.VERTEX_LOCATION = 'us-central1';
  process.env.USD_ZAR_RATE = '18';

  try {
    providers.ADAPTERS.google.generateImage = async (request, options = {}) => {
      assert.equal(options.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH, TEST_KEY_PATH);
      assert.equal(request.modelId, 'google/nano-banana-pro');
      assert.equal(request.referenceImages.length, 2);
      assert.equal(request.referenceMode, 'direct_reference_edit');
      assert.equal(request.realismMode, 'photo_identity_lock');
      assert.match(request.negativePrompt, /cartoon/);
      return {
        ok: true,
        provider: 'google',
        modelId: request.modelId,
        providerModel: 'gemini-3-pro-image-preview',
        images: [{ dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ' }],
        costEstimateUsd: 0.08,
        costEstimateZar: 1.44
      };
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/image-generation/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spendLane: 'auto_best',
          intent: 'cheap_draft',
          prompt: 'A camera-real final character portrait.',
          negativePrompt: 'cartoon, avatar, generic face',
          referenceImages: [
            'data:image/png;base64,aGVsbG8=',
            'data:image/png;base64,d29ybGQ='
          ],
          realismMode: 'photo_identity_lock',
          referenceMode: 'direct_reference_edit',
          metadata: { character: 'vanya' }
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.spendLane, 'auto_best');
      assert.equal(data.actualSpendProvider, 'google_cloud_vertex');
      assert.equal(data.referenceStrategy, 'google_direct_reference_images');
      assert.equal(data.referenceMode, 'direct_reference_edit');
      assert.equal(data.provider, 'google');
      assert.equal(data.modelId, 'google/nano-banana-pro');
      assert.ok(data.images[0].dataUrl);
      assert.doesNotMatch(JSON.stringify(data), /route-test/);
    });
  } finally {
    providers.ADAPTERS.google.generateImage = originalGoogleGenerate;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
