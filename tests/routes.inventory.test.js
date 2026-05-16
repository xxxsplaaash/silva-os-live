const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

const imageModelsRouter = require('../routes/imageModels');
const imageGenerationRouter = require('../routes/imageGeneration');
const providerCredentialsRouter = require('../routes/providerCredentials');
const stateRouter = require('../routes/state');
const studioRouter = require('../routes/studio');
const geminiLegacyRouter = require('../routes/geminiLegacy');
const generatorRouter = require('../routes/generator');
const aiRouter = require('../routes/ai');
const { router: directorRouter } = require('../routes/director');

async function withTestServer(fn) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.get('/health', (req, res) => res.json({ ok: true, providers: ['gemini'], database: 'sqlite' }));
  app.use('/api/image-models', imageModelsRouter);
  app.use('/api/image-generation', imageGenerationRouter);
  app.use('/api/provider-credentials', providerCredentialsRouter);
  app.use('/api/state', stateRouter);
  app.use('/api/studio', studioRouter);
  app.use('/api/gemini', geminiLegacyRouter);
  app.use('/api/generator', generatorRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/director', directorRouter);
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('core route inventory responds with safe shapes', async () => {
  await withTestServer(async baseUrl => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const models = await fetch(`${baseUrl}/api/image-models`);
    assert.equal(models.status, 200);
    const modelData = await models.json();
    assert.equal(modelData.ok, true);
    assert.ok(modelData.items.some(item => item.id === 'google/nano-banana-2'));

    const preview = await fetch(`${baseUrl}/api/image-models/route-preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'premium_final_render' })
    });
    assert.equal(preview.status, 200);
    assert.equal((await preview.json()).selectedModel.id, 'black-forest-labs/flux-2-pro');

    const state = await fetch(`${baseUrl}/api/state/pulse-room?debug=1`);
    assert.equal(state.status, 200);
    const stateData = await state.json();
    assert.equal(stateData.ok, true);
    assert.equal(Object.prototype.hasOwnProperty.call(stateData, 'activeThreadId'), true);

    const history = await fetch(`${baseUrl}/api/studio/history`);
    assert.equal(history.status, 200);
    assert.equal((await history.json()).ok, true);

    const providerStatus = await fetch(`${baseUrl}/api/provider-credentials/status`);
    assert.equal(providerStatus.status, 200);
    const providerStatusData = await providerStatus.json();
    assert.equal(providerStatusData.ok, true);
    assert.ok(providerStatusData.providers.some(item => item.id === 'google'));

    const generatorProfile = await fetch(`${baseUrl}/api/generator/profile`);
    assert.equal(generatorProfile.status, 200);
    const generatorProfileData = await generatorProfile.json();
    assert.equal(generatorProfileData.ok, true);
    assert.equal(generatorProfileData.schemaVersion, 'generator.profile.v1');

    const wardrobeItem = {
      id: `test_wardrobe_${Date.now()}`,
      characterId: 'test_character',
      name: 'Test black jacket',
      kind: 'uploaded',
      slot: 'jacket',
      palette: 'black',
      notes: 'single test garment',
      image: {
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        mimeType: 'image/png'
      }
    };
    const wardrobeSave = await fetch(`${baseUrl}/api/generator/wardrobe/test_character/item`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(wardrobeItem)
    });
    assert.equal(wardrobeSave.status, 200);
    const wardrobeSaveData = await wardrobeSave.json();
    assert.equal(wardrobeSaveData.ok, true);
    assert.equal(wardrobeSaveData.item.id, wardrobeItem.id);

    const wardrobeDelete = await fetch(`${baseUrl}/api/generator/wardrobe/test_character/item/${wardrobeItem.id}`, {
      method: 'DELETE'
    });
    assert.equal(wardrobeDelete.status, 200);
    assert.equal((await wardrobeDelete.json()).deleted, wardrobeItem.id);

    const generatorConcepts = await fetch(`${baseUrl}/api/generator/concepts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ character: 'Vanya Khumalo', location: 'Braamfontein', outfit: 'People Ops Black' })
    });
    assert.equal(generatorConcepts.status, 200);
    const generatorConceptData = await generatorConcepts.json();
    assert.equal(generatorConceptData.ok, true);
    assert.equal(generatorConceptData.items.length, 6);

    const shotCharacter = `test_history_${Date.now()}`;
    const shotRecord = {
      id: `shot_${shotCharacter}_001`,
      character: shotCharacter,
      dna: 'cafe.gold.med.50mm.sharp.stil.none',
      promptSnippet: 'Aisha in a cafe with exact identity refs',
      model: 'google/nano-banana-pro',
      costZAR: 1.48,
      status: 'generated',
      createdAt: new Date().toISOString(),
      recipe: {
        selectedModel: 'google/nano-banana-pro',
        scenePack: { locationId: 'cafe_braamfontein', lightingId: 'golden_am' }
      }
    };
    const shotSave = await fetch(`${baseUrl}/api/generator/shot-history`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ shot: shotRecord })
    });
    assert.equal(shotSave.status, 200);
    const shotSaveData = await shotSave.json();
    assert.equal(shotSaveData.ok, true);
    assert.equal(shotSaveData.shot.id, shotRecord.id);
    assert.ok(shotSaveData.history.length <= 200);
    assert.doesNotMatch(JSON.stringify(shotSaveData), /ANTHROPIC_API_KEY|GEMINI_API_KEY|sk-ant/i);

    const shotList = await fetch(`${baseUrl}/api/generator/shot-history?character=${shotCharacter}&status=generated&limit=20`);
    assert.equal(shotList.status, 200);
    const shotListData = await shotList.json();
    assert.equal(shotListData.ok, true);
    assert.equal(shotListData.history[0].id, shotRecord.id);

    const shotPatch = await fetch(`${baseUrl}/api/generator/shot-history/${shotRecord.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', failureType: 'identity_drift', failureNote: 'face changed' })
    });
    assert.equal(shotPatch.status, 200);
    const shotPatchData = await shotPatch.json();
    assert.equal(shotPatchData.ok, true);
    assert.equal(shotPatchData.shot.status, 'rejected');
    assert.equal(shotPatchData.shot.failureType, 'identity_drift');

    const actionSuggestions = await fetch(`${baseUrl}/api/ai/suggest-actions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        recipe: {
          character: { name: 'Aisha Motsepe' },
          scenePack: {
            location: 'Café — Braamfontein',
            mood: 'Sharp / Focused',
            lighting: 'Golden Hour (AM)'
          },
          wardrobePack: { name: 'Black fitted blazer' },
          selectedModel: 'google/nano-banana-pro'
        }
      })
    });
    assert.equal(actionSuggestions.status, 200);
    const actionSuggestionData = await actionSuggestions.json();
    assert.equal(actionSuggestionData.ok, true);
    assert.equal(actionSuggestionData.schemaVersion, 'ai.suggest-actions.v1');
    assert.equal(actionSuggestionData.items.length, 6);
    assert.ok(actionSuggestionData.items.every(item => item.action && item.title && item.reason));
    assert.doesNotMatch(JSON.stringify(actionSuggestionData), /ANTHROPIC_API_KEY|sk-ant/i);

    const missingAesthetic = await fetch(`${baseUrl}/api/ai/analyze-aesthetic-ref`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(missingAesthetic.status, 400);
    assert.equal((await missingAesthetic.json()).error, 'imageBase64 required');

    const previousAnthropicForAesthetic = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const aestheticPayload = {
        imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII='
      };
      const aestheticRef = await fetch(`${baseUrl}/api/ai/analyze-aesthetic-ref`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(aestheticPayload)
      });
      assert.equal(aestheticRef.status, 200);
      const aestheticRefData = await aestheticRef.json();
      assert.equal(aestheticRefData.ok, true);
      assert.equal(aestheticRefData.schemaVersion, 'ai.analyze-aesthetic.v1');
      assert.equal(aestheticRefData.source, 'local_fallback');
      assert.ok(Array.isArray(aestheticRefData.aesthetic.promptModifiers));
      assert.ok(Array.isArray(aestheticRefData.aesthetic.negativeModifiers));
      assert.doesNotMatch(JSON.stringify(aestheticRefData), /ANTHROPIC_API_KEY|GEMINI_API_KEY|sk-ant/i);

      const aestheticAlias = await fetch(`${baseUrl}/api/ai/analyze-aesthetic`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(aestheticPayload)
      });
      assert.equal(aestheticAlias.status, 200);
      assert.equal((await aestheticAlias.json()).schemaVersion, 'ai.analyze-aesthetic.v1');
    } finally {
      if (previousAnthropicForAesthetic) process.env.ANTHROPIC_API_KEY = previousAnthropicForAesthetic;
    }

    const emptyDirectorBrief = await fetch(`${baseUrl}/api/director/parse-brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brief: '' })
    });
    assert.equal(emptyDirectorBrief.status, 400);
    assert.equal((await emptyDirectorBrief.json()).error, 'brief required');

    const directorBrief = await fetch(`${baseUrl}/api/director/parse-brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        brief: 'Aisha, Sandton rooftop, golden hour, Spring campaign, three-quarter body',
        character: 'leah'
      })
    });
    assert.equal(directorBrief.status, 200);
    const directorBriefData = await directorBrief.json();
    assert.equal(directorBriefData.ok, true);
    assert.equal(directorBriefData.schemaVersion, 'director.parse-brief.v1');
    assert.equal(directorBriefData.parsedShot.fields.characterId, 'aisha');
    assert.equal(directorBriefData.parsedShot.fields.locationId, 'rooftop_jhb');
    assert.equal(directorBriefData.parsedShot.fields.lighting, 'golden_pm');
    assert.equal(directorBriefData.parsedShot.fields.campaignId, 'c5');
    assert.ok(directorBriefData.parsedShot.confidence >= 0.7);
    assert.doesNotMatch(JSON.stringify(directorBriefData), /ANTHROPIC_API_KEY|GEMINI_API_KEY|sk-ant/i);

    const fallbackDirectorBrief = await fetch(`${baseUrl}/api/director/parse-brief`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brief: 'make it moody in a glass lobby' })
    });
    assert.equal(fallbackDirectorBrief.status, 200);
    const fallbackDirectorBriefData = await fallbackDirectorBrief.json();
    assert.equal(fallbackDirectorBriefData.ok, true);
    assert.ok(fallbackDirectorBriefData.parsedShot.fields.locationId || fallbackDirectorBriefData.parsedShot.unspecified.includes('location'));
    assert.doesNotMatch(JSON.stringify(fallbackDirectorBriefData), /ANTHROPIC_API_KEY|GEMINI_API_KEY|sk-ant/i);

    const invalidImage = await fetch(`${baseUrl}/api/image-generation/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'cheap_draft', prompt: '' })
    });
    assert.equal(invalidImage.status, 400);
    const invalidImageData = await invalidImage.json();
    assert.equal(invalidImageData.ok, false);
    assert.equal(invalidImageData.error, 'prompt_required');
    assert.equal(invalidImageData.providerCallCount, 0);
    assert.match(invalidImageData.requestId, /^img_/);

    const legacyGeminiImage = await fetch(`${baseUrl}/api/gemini/image`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: '' })
    });
    assert.equal(legacyGeminiImage.status, 400);
    assert.equal((await legacyGeminiImage.json()).ok, false);

    const disabledLegacyGeminiImage = await fetch(`${baseUrl}/api/gemini/image`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'generate a test image' })
    });
    assert.equal(disabledLegacyGeminiImage.status, 410);
    const disabledLegacyGeminiImageData = await disabledLegacyGeminiImage.json();
    assert.equal(disabledLegacyGeminiImageData.ok, false);
    assert.equal(disabledLegacyGeminiImageData.error, 'legacy_ai_studio_image_disabled');
    assert.equal(disabledLegacyGeminiImageData.replacementEndpoint, '/api/image-generation/generate');

    const legacyGeminiText = await fetch(`${baseUrl}/api/gemini/text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: '' })
    });
    assert.equal(legacyGeminiText.status, 400);
    assert.equal((await legacyGeminiText.json()).ok, false);
  });
});

test('ordinary Pulse room greeting uses natural room-intelligence fallback without provider outage', async () => {
  const previousGemini = process.env.GEMINI_API_KEY;
  const originalFetch = global.fetch;
  delete process.env.GEMINI_API_KEY;

  try {
    global.fetch = async (url, options) => {
      if (String(url).startsWith('http://127.0.0.1:')) {
        return originalFetch(url, options);
      }
      throw new Error('external network blocked in test');
    };

    await withTestServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/api/studio/pulse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          question: 'hi team',
          providerConfig: {
            textPrimary: { provider: 'gemini', model: '', apiKey: '' },
            pulseApiKeys: [],
            fallback1: { provider: '', model: '', apiKey: '' },
            fallback2: { provider: '', model: '', apiKey: '' }
          }
        })
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.ok, true);
      assert.equal(data.fallback, false);
      assert.equal(data.deterministic, true);
      assert.equal(data.lane, 'room');
      assert.equal(data.workflowContext, null);
      assert.equal(Number(data.providerCallCount || 0), 0);
      const events = data.response?.messageEvents || [];
      assert.equal(events.length, 1);
      assert.equal(events[0].speakerId, 'vanya');
      assert.match(events[0].text, /\b(hey|here|quiet|mystique)\b/i);
      assert.doesNotMatch(events[0].text, /provider-unavailable|provider timeout|provider invalid-output|Studio Pulse provider missed this turn/i);
      assert.doesNotMatch(events.map(event => event.text).join('\n'), /labels are not presence|assistant cosplay|architecture|implementation|selection|validation|generation|presence system|room intelligence|real room has rhythm/i);
    });
  } finally {
    global.fetch = originalFetch;
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
  }
});

test('route preview latency stays comfortably below interactive budget', async () => {
  await withTestServer(async baseUrl => {
    const started = performance.now();
    const response = await fetch(`${baseUrl}/api/image-models/route-preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'cheap_draft' })
    });
    const elapsed = performance.now() - started;
    assert.equal(response.status, 200);
    assert.ok(elapsed < 1000, `route preview took ${elapsed.toFixed(1)}ms`);
  });
});
