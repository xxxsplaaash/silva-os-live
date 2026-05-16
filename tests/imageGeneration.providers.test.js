const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const google = require('../lib/imageGeneration/providers/google');
const fal = require('../lib/imageGeneration/providers/fal');

const SAMPLE_DATA_URL = 'data:image/png;base64,aGVsbG8=';
const GENERATED_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ';
const TEST_KEY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'silva-vertex-key-test-'));
const TEST_KEY_PATH = path.join(TEST_KEY_DIR, 'service-account.json');
fs.writeFileSync(TEST_KEY_PATH, JSON.stringify({ type: 'service_account', project_id: 'test-project' }));

test.after(() => {
  fs.rmSync(TEST_KEY_DIR, { recursive: true, force: true });
});

function vertexEnv(extra = {}) {
  return {
    VERTEX_PROJECT_ID: 'project-be35f944-1782-4f27-86f',
    VERTEX_LOCATION: 'us-central1',
    VERTEX_SERVICE_ACCOUNT_JSON_PATH: TEST_KEY_PATH,
    VERTEX_IMAGEN_MODEL: 'imagen-3.0-generate-001',
    USD_ZAR_RATE: '18',
    ...extra
  };
}

function falEnv(extra = {}) {
  return {
    FAL_KEY: 'secret_fal_key',
    USD_ZAR_RATE: '18',
    ...extra
  };
}

function mockAiPlatform() {
  return {
    helpers: {
      toValue: value => value,
      fromValue: value => value
    }
  };
}

function mockFalClient(calls, data = { images: [{ url: 'https://fal.media/output.png' }] }) {
  return {
    subscribe: async (endpoint, options) => {
      calls.push({ endpoint, options });
      return { data };
    }
  };
}

test('image providers produce safe missing-key errors', async () => {
  await assert.rejects(
    google.generateImage({ modelId: 'google/nano-banana-2', prompt: 'test' }, { env: {} }),
    err => err.code === 'MISSING_VERTEX_CREDENTIALS' && /VERTEX_SERVICE_ACCOUNT_JSON_PATH|GOOGLE_APPLICATION_CREDENTIALS|VERTEX_AUTH_MODE=adc/.test(err.message)
  );
  await assert.rejects(
    fal.generateImage({ modelId: 'openai/gpt-image-2', prompt: 'test' }, { env: {} }),
    err => err.code === 'MISSING_API_KEY' && /FAL_KEY/.test(err.message)
  );
  await assert.rejects(
    fal.generateImage({ modelId: 'black-forest-labs/flux-2-pro', prompt: 'test' }, { env: {} }),
    err => err.code === 'MISSING_API_KEY' && /FAL_KEY/.test(err.message)
  );
});

test('image providers reject adapter mismatches before any provider call', async () => {
  await assert.rejects(
    google.generateImage({ modelId: 'openai/gpt-image-2', prompt: 'test' }, { env: vertexEnv() }),
    err => err.code === 'PROVIDER_ADAPTER_MISMATCH' && err.expectedAdapter === 'fal'
  );
  await assert.rejects(
    fal.generateImage({ modelId: 'google/imagen-3-text-only', prompt: 'test' }, { env: falEnv() }),
    err => err.code === 'PROVIDER_ADAPTER_MISMATCH' && err.expectedAdapter === 'google'
  );
});

test('google adapter builds Vertex Imagen request and normalizes output', async () => {
  const calls = [];
  const result = await google.generateImage({
    modelId: 'google/imagen-3-text-only',
    prompt: 'make it cinematic',
    aspectRatio: '1:1',
    negativePrompt: 'cartoon, plastic skin',
    candidateCount: 2
  }, {
    env: vertexEnv(),
    aiplatform: mockAiPlatform(),
    predictionClient: {
      predict: async (body, options) => {
        calls.push({ body, options });
        return [{ predictions: [{ bytesBase64Encoded: GENERATED_DATA, mimeType: 'image/png' }] }];
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'google');
  assert.equal(result.modelId, 'google/imagen-3-text-only');
  assert.equal(result.providerModel, 'imagen-3.0-generate-001');
  assert.match(calls[0].body.endpoint, /projects\/project-be35f944-1782-4f27-86f\/locations\/us-central1\/publishers\/google\/models\/imagen-3\.0-generate-001$/);
  assert.equal(calls[0].body.instances[0].prompt, 'make it cinematic');
  assert.equal(calls[0].body.parameters.aspectRatio, '1:1');
  assert.equal(calls[0].body.parameters.negativePrompt, 'cartoon, plastic skin');
  assert.equal(calls[0].body.parameters.sampleCount, 2);
  assert.equal(result.images[0].dataUrl, `data:image/png;base64,${GENERATED_DATA}`);
  assert.doesNotMatch(JSON.stringify(result), /service-account|test-project/);
});

test('google adapter sends actual reference images to Vertex Gemini Image models', async () => {
  const calls = [];
  const result = await google.generateImage({
    modelId: 'google/nano-banana-pro',
    prompt: 'camera-real final portrait, preserve identity',
    referenceImages: [SAMPLE_DATA_URL],
    aspectRatio: '1:1',
    negativePrompt: 'cartoon, plastic skin',
    candidateCount: 1,
    realismMode: 'photo_identity_lock',
    referenceMode: 'direct_reference_edit'
  }, {
    env: vertexEnv(),
    genAIClient: {
      models: {
        generateContent: async params => {
          calls.push(params);
          return {
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'ok' },
                    { inlineData: { mimeType: 'image/png', data: GENERATED_DATA } }
                  ]
                }
              }
            ]
          };
        }
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'google');
  assert.equal(result.modelId, 'google/nano-banana-pro');
  assert.equal(result.providerModel, 'gemini-3-pro-image-preview');
  assert.equal(calls[0].model, 'gemini-3-pro-image-preview');
  assert.match(calls[0].contents[0].parts[0].text, /IDENTITY AUTHORITY CONTRACT/);
  assert.match(calls[0].contents[0].parts[0].text, /references win/);
  assert.match(calls[0].contents[0].parts[1].text, /PRIMARY FACE TILE/);
  assert.match(calls[0].contents[0].parts[1].text, /Do not copy it as a frame/);
  assert.equal(calls[0].contents[0].parts[2].inlineData.data, 'aGVsbG8=');
  assert.match(calls[0].contents[0].parts.at(-1).text, /actual reference images/i);
  assert.match(calls[0].contents[0].parts.at(-1).text, /reference face is authoritative/i);
  assert.match(calls[0].contents[0].parts.at(-1).text, /Output the clean source photo only/);
  assert.match(calls[0].contents[0].parts.at(-1).text, /Do not render a social media interface/);
  assert.match(calls[0].contents[0].parts.at(-1).text, /Hard negative constraints: cartoon, plastic skin/);
  assert.deepEqual(calls[0].config.responseModalities, ['TEXT', 'IMAGE']);
  assert.equal(calls[0].config.imageConfig.aspectRatio, '1:1');
  assert.equal(result.images[0].dataUrl, `data:image/png;base64,${GENERATED_DATA}`);
  assert.doesNotMatch(JSON.stringify(result), /service-account|test-project/);
});

test('google adapter falls back from unavailable Nano Banana Pro to Nano Banana 2 direct refs', async () => {
  const calls = [];
  const result = await google.generateImage({
    modelId: 'google/nano-banana-pro',
    prompt: 'camera-real final portrait, preserve identity',
    referenceImages: [SAMPLE_DATA_URL],
    aspectRatio: '1:1',
    negativePrompt: 'cartoon, plastic skin',
    candidateCount: 1,
    realismMode: 'photo_identity_lock',
    referenceMode: 'direct_reference_edit'
  }, {
    env: vertexEnv(),
    genAIClient: {
      models: {
        generateContent: async params => {
          calls.push(params);
          if (params.model === 'gemini-3-pro-image-preview') {
            const err = new Error('The selected Vertex AI model is not available to this project and region.');
            throw err;
          }
          return {
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'ok' },
                    { inlineData: { mimeType: 'image/png', data: GENERATED_DATA } }
                  ]
                }
              }
            ]
          };
        }
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'google');
  assert.equal(result.modelId, 'google/nano-banana-2');
  assert.equal(result.providerModel, 'gemini-2.5-flash-image');
  assert.equal(result.fallbackFromModelId, 'google/nano-banana-pro');
  assert.equal(result.fallbackReason, 'vertex_model_unavailable');
  assert.deepEqual(calls.map(call => call.model), ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image']);
  assert.match(calls[1].contents[0].parts[0].text, /IDENTITY AUTHORITY CONTRACT/);
  assert.match(calls[1].contents[0].parts[1].text, /PRIMARY FACE TILE/);
  assert.equal(calls[1].contents[0].parts[2].inlineData.data, 'aGVsbG8=');
  assert.match(calls[1].contents[0].parts.at(-1).text, /actual reference images/i);
  assert.equal(result.images[0].dataUrl, `data:image/png;base64,${GENERATED_DATA}`);
});

test('google adapter tries Vertex region fallback before downgrading Nano Banana model', async () => {
  const calls = [];
  const result = await google.generateImage({
    modelId: 'google/nano-banana-pro',
    prompt: 'camera-real final portrait, preserve identity',
    referenceImages: [SAMPLE_DATA_URL],
    aspectRatio: '1:1',
    negativePrompt: 'cartoon, plastic skin',
    candidateCount: 1,
    realismMode: 'photo_identity_lock',
    referenceMode: 'direct_reference_edit'
  }, {
    env: vertexEnv({ VERTEX_LOCATION_FALLBACKS: 'us-east4,europe-west9' }),
    createGenAIClient: config => ({
      models: {
        generateContent: async params => {
          calls.push({ location: config.location, model: params.model });
          if (config.location === 'us-central1') {
            throw new Error('The selected Vertex AI model is not available to this project and region.');
          }
          return {
            candidates: [
              {
                content: {
                  parts: [
                    { text: 'ok' },
                    { inlineData: { mimeType: 'image/png', data: GENERATED_DATA } }
                  ]
                }
              }
            ]
          };
        }
      }
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelId, 'google/nano-banana-pro');
  assert.equal(result.providerModel, 'gemini-3-pro-image-preview');
  assert.equal(result.vertexLocation, 'us-east4');
  assert.equal(result.fallbackFromLocation, 'us-central1');
  assert.equal(result.fallbackReason, 'vertex_model_unavailable');
  assert.equal(result.fallbackFromModelId, undefined);
  assert.deepEqual(calls, [
    { location: 'us-central1', model: 'gemini-3-pro-image-preview' },
    { location: 'us-east4', model: 'gemini-3-pro-image-preview' }
  ]);
  assert.equal(result.images[0].dataUrl, `data:image/png;base64,${GENERATED_DATA}`);
});

test('google adapter retries without optional negative prompt if Imagen rejects it', async () => {
  const calls = [];
  const result = await google.generateImage({
    modelId: 'google/imagen-3-text-only',
    prompt: 'make it real',
    negativePrompt: 'cartoon'
  }, {
    env: vertexEnv(),
    aiplatform: mockAiPlatform(),
    predictionClient: {
      predict: async body => {
        calls.push(body);
        if (calls.length === 1) {
          const err = new Error('3 INVALID_ARGUMENT: Unknown name "negativePrompt"');
          err.code = 3;
          throw err;
        }
        return [{ predictions: [{ bytesBase64Encoded: GENERATED_DATA, mimeType: 'image/png' }] }];
      }
    }
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].parameters.negativePrompt, 'cartoon');
  assert.equal(calls[1].parameters.negativePrompt, undefined);
});

test('google adapter maps Vertex permission failures to safe actionable errors', async () => {
  await assert.rejects(
    google.generateImage({
      modelId: 'google/imagen-3-text-only',
      prompt: 'permission check'
    }, {
      env: vertexEnv(),
      aiplatform: mockAiPlatform(),
      predictionClient: {
        predict: async () => {
          const err = new Error("7 PERMISSION_DENIED: Permission 'aiplatform.endpoints.predict' denied");
          err.code = 7;
          throw err;
        }
      }
    }),
    err => {
      assert.equal(err.code, 'VERTEX_PERMISSION_DENIED');
      assert.equal(err.statusCode, 403);
      assert.match(err.safeMessage, /active Google credential cannot run predictions/);
      assert.doesNotMatch(JSON.stringify(err), new RegExp(TEST_KEY_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      return true;
    }
  );
});

test('google adapter exposes Vertex Gemini visual reasoning parts', async () => {
  const parts = google.buildGeminiVisionParts({
    prompt: 'read the reference',
    referenceImages: [SAMPLE_DATA_URL]
  });
  assert.match(parts[0].text, /PRIMARY FACE TILE/);
  assert.equal(parts[1].inlineData.data, 'aGVsbG8=');
  assert.equal(parts[2].text, 'read the reference');
});

test('google visual reasoning falls forward when configured Gemini model is unavailable', async () => {
  const requestedModels = [];
  const result = await google.reasonAboutImages({
    prompt: 'read the reference',
    referenceImages: [SAMPLE_DATA_URL]
  }, {
    env: vertexEnv({ VERTEX_GEMINI_FAST_MODEL: 'gemini-1.5-flash-002' }),
    vertexAI: {
      VertexAI: class {
        getGenerativeModel({ model }) {
          requestedModels.push(model);
          return {
            generateContent: async () => {
              if (model === 'gemini-1.5-flash-002') {
                const err = new Error('404 NOT_FOUND: Publisher Model was not found or your project does not have access.');
                err.code = 404;
                throw err;
              }
              return { response: { text: () => 'fallback vision analysis' } };
            }
          };
        }
      }
    }
  });
  assert.deepEqual(requestedModels.slice(0, 2), ['gemini-1.5-flash-002', 'gemini-2.5-flash']);
  assert.equal(result.providerModel, 'gemini-2.5-flash');
  assert.equal(result.text, 'fallback vision analysis');
});

test('fal adapter routes app-facing GPT Image 2 to configured fal endpoint', async () => {
  const calls = [];
  const result = await fal.generateImage({
    modelId: 'openai/gpt-image-2',
    prompt: 'editorial studio portrait',
    aspectRatio: 'portrait',
    quality: 'premium'
  }, {
    env: falEnv({ FAL_GPT_IMAGE_2_MODEL: 'custom/openai-gpt-image-2' }),
    falClient: mockFalClient(calls, { images: [{ url: 'https://fal.media/gpt-image-2.png' }] })
  });

  assert.equal(result.ok, true);
  assert.equal(result.modelId, 'openai/gpt-image-2');
  assert.equal(result.provider, 'fal');
  assert.equal(result.providerModel, 'custom/openai-gpt-image-2');
  assert.equal(calls[0].endpoint, 'custom/openai-gpt-image-2');
  assert.equal(calls[0].options.input.prompt, 'editorial studio portrait');
  assert.equal(calls[0].options.input.image_size, 'portrait_16_9');
  assert.equal(calls[0].options.input.output_format, 'png');
  assert.equal(calls[0].options.input.quality, 'premium');
  assert.equal(result.images[0].url, 'https://fal.media/gpt-image-2.png');
  assert.doesNotMatch(JSON.stringify(result), /secret_fal_key/);
});

test('fal GPT Image route switches to edit endpoint and includes reference URLs', async () => {
  const calls = [];
  const result = await fal.generateImage({
    modelId: 'openai/gpt-image-1.5',
    prompt: 'combine the references',
    referenceImages: [SAMPLE_DATA_URL]
  }, {
    env: falEnv(),
    falClient: mockFalClient(calls, { images: [{ url: 'https://fal.media/gpt-image-15.png' }] })
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].endpoint, 'fal-ai/gpt-image-1.5/edit');
  assert.deepEqual(calls[0].options.input.image_urls, [SAMPLE_DATA_URL]);
  assert.equal(result.images.length, 1);
});

test('fal adapter appends negative prompt as hard constraints', async () => {
  const calls = [];
  await fal.generateImage({
    modelId: 'openai/gpt-image-2',
    prompt: 'camera-real final portrait',
    negativePrompt: 'cartoon, avatar, plastic skin',
    referenceImages: [SAMPLE_DATA_URL],
    outputFormatMode: 'raw_photo'
  }, {
    env: falEnv(),
    falClient: mockFalClient(calls, { images: [{ url: 'https://fal.media/negative-guard.png' }] })
  });

  assert.equal(calls[0].endpoint, 'openai/gpt-image-2/edit');
  assert.match(calls[0].options.input.prompt, /camera-real final portrait/);
  assert.match(calls[0].options.input.prompt, /clean raw camera photograph/);
  assert.match(calls[0].options.input.prompt, /Do not render a social media interface/);
  assert.match(calls[0].options.input.prompt, /Hard negative constraints: cartoon, avatar, plastic skin/);
  assert.doesNotMatch(calls[0].options.input.prompt, /secret_fal_key/);
});

test('fal Seedream uses text and edit endpoints according to references', async () => {
  const textCalls = [];
  await fal.generateImage({
    modelId: 'bytedance/seedream-5-lite',
    prompt: 'new scene',
    aspectRatio: '16:9'
  }, {
    env: falEnv(),
    falClient: mockFalClient(textCalls)
  });
  assert.equal(textCalls[0].endpoint, 'fal-ai/bytedance/seedream/v5/lite/text-to-image');
  assert.equal(textCalls[0].options.input.image_size, 'landscape_16_9');

  const editCalls = [];
  await fal.generateImage({
    modelId: 'bytedance/seedream-5-lite',
    prompt: 'blend the references',
    referenceImages: [SAMPLE_DATA_URL, 'https://assets.example/ref.png']
  }, {
    env: falEnv(),
    falClient: mockFalClient(editCalls)
  });
  assert.equal(editCalls[0].endpoint, 'fal-ai/bytedance/seedream/v5/lite/edit');
  assert.deepEqual(editCalls[0].options.input.image_urls, [SAMPLE_DATA_URL, 'https://assets.example/ref.png']);
});

test('fal adapter maps FLUX text input and normalizes URL output', async () => {
  const calls = [];
  const result = await fal.generateImage({
    modelId: 'black-forest-labs/flux-2-pro',
    prompt: 'premium final render',
    aspectRatio: '16:9'
  }, {
    env: falEnv(),
    falClient: mockFalClient(calls, { images: [{ url: 'https://fal.media/flux-output.png' }] })
  });

  assert.equal(result.ok, true);
  assert.equal(result.provider, 'fal');
  assert.equal(result.providerModel, 'fal-ai/flux-2-pro');
  assert.equal(calls[0].endpoint, 'fal-ai/flux-2-pro');
  assert.equal(calls[0].options.input.aspect_ratio, undefined);
  assert.equal(calls[0].options.input.image_size, 'landscape_16_9');
  assert.equal(result.images[0].url, 'https://fal.media/flux-output.png');
  assert.doesNotMatch(JSON.stringify(result), /secret_fal_key/);
});

test('fal Qwen utility edit requires a reference and maps image URLs', async () => {
  await assert.rejects(
    fal.generateImage({ modelId: 'fal/qwen-image-2-edit', prompt: 'clean it up' }, {
      env: falEnv(),
      falClient: mockFalClient([])
    }),
    err => err.code === 'MODEL_CAPABILITY_MISMATCH' && /requires at least one reference/.test(err.message)
  );

  const calls = [];
  const result = await fal.generateImage({
    modelId: 'fal/qwen-image-2-edit',
    prompt: 'clean it up',
    referenceImages: [SAMPLE_DATA_URL]
  }, {
    env: falEnv({ FAL_UTILITY_EDIT_MODEL: 'custom/qwen-edit' }),
    falClient: mockFalClient(calls, { images: [{ url: 'https://fal.media/qwen-edit.png' }] })
  });

  assert.equal(result.ok, true);
  assert.equal(result.providerModel, 'custom/qwen-edit');
  assert.equal(calls[0].endpoint, 'custom/qwen-edit');
  assert.deepEqual(calls[0].options.input.image_urls, [SAMPLE_DATA_URL]);
  assert.equal(result.images[0].url, 'https://fal.media/qwen-edit.png');
});

test('provider quota errors are safe and do not leak key values', async () => {
  await assert.rejects(
    fal.generateImage({ modelId: 'openai/gpt-image-2', prompt: 'test' }, {
      env: falEnv(),
      falClient: {
        subscribe: async () => {
          const err = new Error('Rate limit reached');
          err.status = 429;
          throw err;
        }
      }
    }),
    err => {
      assert.equal(err.code, 'PROVIDER_QUOTA_EXCEEDED');
      assert.equal(err.statusCode, 429);
      assert.doesNotMatch(JSON.stringify(err), /secret_fal_key/);
      return true;
    }
  );
});

test('unsupported reference count rejects before provider fetch', async () => {
  let called = false;
  await assert.rejects(
    google.generateImage({
      modelId: 'google/nano-banana-2',
      prompt: 'too many refs',
      referenceImages: new Array(20).fill(SAMPLE_DATA_URL)
    }, {
      env: vertexEnv(),
      fetchImpl: async () => {
        called = true;
        return {};
      }
    }),
    err => err.code === 'MODEL_CAPABILITY_MISMATCH'
  );
  assert.equal(called, false);
});
