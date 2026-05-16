const express = require('express');
const { geminiVaultKeyEntries } = require('../lib/imageGeneration/providerVault');
const { getLatestSnapshotState, getRuntimeOverlayState } = require('../db/sqlite');

const router = express.Router();

// Legacy Gemini compatibility routes. The visible image generator uses /api/image-generation/generate.
const LEGACY_AI_STUDIO_IMAGE_ENABLED = process.env.ENABLE_LEGACY_AI_STUDIO_IMAGE === '1';

function legacyImageDisabledResponse() {
  return {
    ok: false,
    error: 'legacy_ai_studio_image_disabled',
    message: 'Legacy AI Studio image generation is disabled. Use /api/image-generation/generate so Google image work stays on Vertex AI / Google Cloud credits.',
    provider: 'legacy-ai-studio',
    replacementEndpoint: '/api/image-generation/generate'
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, {
    ...options,
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
}

function parseDataUrlImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (typeof part?.text === 'string') return part.text;
  }
  return '';
}

function extractGeminiImageData(data) {
  const walk = (node) => {
    if (!node) return null;

    if (typeof node === 'string') {
      const trimmed = node.replace(/\s+/g, '');
      if (trimmed.startsWith('data:image/')) return trimmed;
      if (trimmed.length > 500 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
        return 'data:image/png;base64,' + trimmed;
      }
      return null;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item);
        if (found) return found;
      }
      return null;
    }

    if (typeof node === 'object') {
      if (node.inlineData?.data) {
        return `data:${node.inlineData.mimeType || 'image/png'};base64,${node.inlineData.data}`;
      }
      if (node.inline_data?.data) {
        return `data:${node.inline_data.mime_type || 'image/png'};base64,${node.inline_data.data}`;
      }
      if (node.imageBytes) {
        return `data:${node.mimeType || 'image/png'};base64,${node.imageBytes}`;
      }
      if (node.b64_json) {
        return `data:image/png;base64,${node.b64_json}`;
      }
      for (const value of Object.values(node)) {
        const found = walk(value);
        if (found) return found;
      }
    }

    return null;
  };

  return walk(data);
}

function normalizeGoogleProvider(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'google') return 'gemini';
  return normalized;
}

function isImagenModel(modelName = '') {
  return String(modelName || '').trim().toLowerCase().startsWith('imagen-');
}

function imageProviderFromModel(modelName = '', fallbackProvider = 'nanobanana') {
  if (isImagenModel(modelName)) return 'imagen';
  const normalized = normalizeGoogleProvider(fallbackProvider);
  return normalized || 'nanobanana';
}

function dedupeImageKeyChain(entries = []) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(entries) ? entries : []) {
    const apiKey = String(item?.apiKey || '').trim();
    if (!apiKey) continue;
    const provider = normalizeGoogleProvider(item?.provider || 'gemini');
    const sig = apiKey;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({
      ...item,
      provider,
      apiKey
    });
  }
  return out;
}

function isHardImageQuotaFailure(status, errorMessage = '') {
  const text = String(errorMessage || '');
  if (Number(status) !== 429) return false;
  return /free_tier|limit:\s*0|quota exceeded/i.test(text);
}

function buildImagenRequestBody(prompt) {
  return {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1
    }
  };
}

function buildImageModelChain({ requestedModel = '', requestedProvider = '', keyModel = '' } = {}) {
  const allowedModels = new Set([
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview',
    'imagen-3.0-fast-generate-001',
    'imagen-3.0-generate-001'
  ]);
  const geminiFallbackOrder = [
    'gemini-2.5-flash-image',
    'gemini-3-pro-image-preview'
  ];
  const imagenFallbackOrder = [
    'imagen-3.0-fast-generate-001',
    'imagen-3.0-generate-001'
  ];
  const requested = String(requestedModel || '').trim();
  const hinted = String(keyModel || '').trim();
  const provider = normalizeGoogleProvider(requestedProvider);
  const prefersImagen = provider === 'imagen' || isImagenModel(requested) || isImagenModel(hinted);
  const primaryFallbacks = prefersImagen ? imagenFallbackOrder : geminiFallbackOrder;
  const secondaryFallbacks = prefersImagen ? geminiFallbackOrder : imagenFallbackOrder;
  const explicitRequested = provider === 'imagen' && requested && !isImagenModel(requested) ? '' : requested;
  return uniqueGeminiModels([
    explicitRequested,
    hinted,
    ...primaryFallbacks,
    ...secondaryFallbacks
  ].filter(modelName => allowedModels.has(String(modelName || '').trim())));
}

function normalizedProviderSettings(providerConfig = {}) {
  return providerConfig && typeof providerConfig === 'object' ? providerConfig : {};
}

function providerSettingsHasGeminiKey(providerConfig = {}) {
  const cfg = normalizedProviderSettings(providerConfig);
  const directKeys = [
    String(cfg.textPrimary?.apiKey || '').trim(),
    String(cfg.imagePrimary?.apiKey || '').trim(),
    String(cfg.fallback1?.apiKey || '').trim(),
    String(cfg.fallback2?.apiKey || '').trim()
  ].filter(Boolean);
  if (directKeys.length) return true;
  return Array.isArray(cfg.pulseApiKeys)
    && cfg.pulseApiKeys.some(item => item?.enabled !== false && String(item?.apiKey || '').trim());
}

function mergeProviderSettings(primary = {}, fallback = {}) {
  const override = normalizedProviderSettings(primary);
  const base = normalizedProviderSettings(fallback);
  const chooseList = (a, b) => {
    const aa = Array.isArray(a) ? a.filter(Boolean) : [];
    const bb = Array.isArray(b) ? b.filter(Boolean) : [];
    return aa.length ? aa : bb;
  };
  return {
    ...base,
    ...override,
    textPrimary: { ...(base.textPrimary || {}), ...(override.textPrimary || {}) },
    imagePrimary: { ...(base.imagePrimary || {}), ...(override.imagePrimary || {}) },
    fallback1: { ...(base.fallback1 || {}), ...(override.fallback1 || {}) },
    fallback2: { ...(base.fallback2 || {}), ...(override.fallback2 || {}) },
    pulseApiKeys: chooseList(override.pulseApiKeys, base.pulseApiKeys)
  };
}

function getLiveProviderSettings() {
  const runtimeSettings = normalizedProviderSettings(getRuntimeOverlayState()?.providerSettings || {});
  if (providerSettingsHasGeminiKey(runtimeSettings)) return runtimeSettings;
  const snapshotSettings = normalizedProviderSettings(getLatestSnapshotState()?.providerSettings || {});
  if (providerSettingsHasGeminiKey(snapshotSettings)) return snapshotSettings;
  return mergeProviderSettings(runtimeSettings, snapshotSettings);
}

function effectiveGeminiProviderSettings(providerConfig = {}) {
  return mergeProviderSettings(providerConfig, getLiveProviderSettings());
}

function resolveGeminiKeyChain(providerConfig = {}, primarySlots = [], allowedProviderList = ['', 'gemini', 'google', 'nanobanana']) {
  const chain = [];
  const seen = new Set();
  const allowedProviders = new Set((Array.isArray(allowedProviderList) ? allowedProviderList : ['', 'gemini', 'google', 'nanobanana']).map(item => normalizeGoogleProvider(item)));
  const add = (item, labelHint = '') => {
    const apiKey = String(item?.apiKey || '').trim();
    if (!apiKey) return;
    const provider = normalizeGoogleProvider(item?.provider || 'gemini');
    if (!allowedProviders.has(provider)) return;
    const model = String(item?.model || '').trim();
    const sig = `${provider}::${model}::${apiKey}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    chain.push({
      label: String(item?.label || labelHint || 'Gemini image'),
      provider,
      model,
      apiKey
    });
  };

  const cfg = effectiveGeminiProviderSettings(providerConfig);
  const labels = {
    textPrimary: 'Primary text',
    imagePrimary: 'Primary image',
    fallback1: 'Fallback 1',
    fallback2: 'Fallback 2'
  };
  primarySlots.forEach(slot => add(cfg[slot], labels[slot] || slot));
  if (Array.isArray(cfg.pulseApiKeys)) cfg.pulseApiKeys.forEach((item, idx) => { if (item?.enabled !== false) add(item, `Fallback ${idx + 1}`); });
  ['fallback1', 'fallback2', 'textPrimary', 'imagePrimary'].forEach(slot => {
    if (primarySlots.includes(slot)) return;
    add(cfg[slot], labels[slot] || slot);
  });
  geminiVaultKeyEntries().forEach(item => add(item, item.label || 'Provider vault'));
  if (process.env.GOOGLE_API_KEY) add({ provider: 'gemini', model: '', apiKey: process.env.GOOGLE_API_KEY, label: 'Server env Google' }, 'Server env Google');
  if (process.env.GEMINI_API_KEY) add({ provider: 'gemini', model: '', apiKey: process.env.GEMINI_API_KEY, label: 'Server env' }, 'Server env');
  return chain;
}

function resolveGeminiTextKeyChain(providerConfig = {}) {
  return resolveGeminiKeyChain(providerConfig, ['textPrimary'], ['', 'gemini', 'google', 'nanobanana']);
}

function resolveGeminiImageKeyChain(providerConfig = {}) {
  return resolveGeminiKeyChain(providerConfig, ['imagePrimary'], ['', 'gemini', 'google', 'nanobanana', 'imagen']);
}

function uniqueGeminiModels(models = []) {
  const out = [];
  const seen = new Set();
  for (const model of models) {
    const value = String(model || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

router.post('/text', async (req, res) => {
  try {
    const { prompt, providerConfig = {} } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'Prompt is required.' });
    }

    const keyChain = resolveGeminiTextKeyChain(providerConfig);
    if (!keyChain.length) {
      return res.status(500).json({
        ok: false,
        provider: 'gemini',
        error: 'Missing Gemini text API key.'
      });
    }

    async function callGemini(modelName, apiKey) {
      return fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        },
        45000
      );
    }

    const defaultModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let lastError = null;
    const attempts = [];

    for (const keyEntry of keyChain) {
      const models = uniqueGeminiModels([keyEntry.model, ...defaultModels]);
      let authFailure = false;
      for (const modelName of models) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          let response;
          let data;

          try {
            response = await callGemini(modelName, keyEntry.apiKey);
            data = await response.json();
          } catch (err) {
            if (err?.name === 'AbortError') {
              lastError = {
                keyLabel: keyEntry.label,
                model: modelName,
                attempt,
                error: 'Gemini request timed out after 45 seconds.'
              };
              attempts.push(lastError);
              continue;
            }
            throw err;
          }

          if (response.ok) {
            return res.json({
              ok: true,
              provider: 'gemini',
              keyLabel: keyEntry.label,
              model: modelName,
              attempt,
              data
            });
          }

          const errorMessage = data?.error?.message || `Provider error ${response.status}`;
          lastError = {
            keyLabel: keyEntry.label,
            model: modelName,
            attempt,
            status: response.status,
            error: errorMessage
          };
          attempts.push(lastError);

          authFailure = response.status === 400
            || response.status === 401
            || response.status === 403
            || /api key|permission|credential|unauth/i.test(errorMessage);
          if (authFailure) break;

          if (response.status === 503 || response.status === 429) {
            await sleep(attempt * 1500);
            continue;
          }
          break;
        }
        if (authFailure) break;
      }
    }

    return res.status(lastError?.status || 503).json({
      ok: false,
      provider: 'gemini',
      error: lastError?.error || 'Gemini is overloaded or timed out after retries.',
      details: lastError,
      attempts
    });
  } catch (error) {
    const msg =
      error?.name === 'AbortError'
        ? 'Gemini request timed out after 45 seconds.'
        : String(error);

    return res.status(500).json({ ok: false, error: msg });
  }
});

router.post('/image', async (req, res) => {
  try {
    const {
      prompt,
      character = '',
      campaign = '',
      provider = 'nanobanana',
      model = 'gemini-3-pro-image-preview',
      refs = [],
      providerConfig = {}
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'Prompt is required.' });
    }

    if (!LEGACY_AI_STUDIO_IMAGE_ENABLED) {
      return res.status(410).json(legacyImageDisabledResponse());
    }

    const imageParts = (Array.isArray(refs) ? refs : [])
      .map(parseDataUrlImage)
      .filter(Boolean)
      .map(img => ({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      }));

    const parts = [...imageParts, { text: prompt }];
    const requestBody = {
      contents: [{ parts }]
    };

    const attempts = [];
    const requestedModel = String(model || '').trim();
    const usedRefLabels = imageParts.length
      ? imageParts.map((_, i) => (i === 0 ? 'face' : i === 1 ? 'body' : `ref_${i + 1}`))
      : [];
    const keyChain = dedupeImageKeyChain(resolveGeminiImageKeyChain(providerConfig));
    if (!keyChain.length) {
      return res.status(500).json({
        ok: false,
        provider,
        model: requestedModel || 'unknown',
        timestamp: new Date().toISOString(),
        prompt,
        character,
        campaign,
        usedRefs: usedRefLabels,
        imageData: null,
        text: '',
        error: 'Missing Gemini image API key.',
        raw: null,
        fallbackAttempts: attempts
      });
    }

    for (const keyEntry of keyChain) {
      const modelChain = buildImageModelChain({
        requestedModel,
        requestedProvider: provider,
        keyModel: keyEntry.model
      });
      let skipFurtherGeminiForKey = false;
      for (const modelName of modelChain) {
        if (skipFurtherGeminiForKey && !isImagenModel(modelName)) continue;
        const useImagen = isImagenModel(modelName);
        const actualProvider = imageProviderFromModel(modelName, keyEntry.provider || provider);
        const endpoint = useImagen
          ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`
          : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
        const requestPayload = useImagen ? buildImagenRequestBody(prompt) : requestBody;

        let response;
        let data;

        try {
          response = await fetchWithTimeout(
            endpoint,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': keyEntry.apiKey
              },
              body: JSON.stringify(requestPayload)
            },
            60000
          );

          data = await response.json();
        } catch (err) {
          if (err?.name === 'AbortError') {
            attempts.push({
              keyLabel: keyEntry.label,
              provider: actualProvider,
              model: modelName,
              ok: false,
              status: 504,
              error: 'Timed out after 60 seconds.'
            });
            continue;
          }

          attempts.push({
            keyLabel: keyEntry.label,
            provider: actualProvider,
            model: modelName,
            ok: false,
            status: 500,
            error: String(err)
          });
          continue;
        }

        const imageData = extractGeminiImageData(data);
        const text = extractGeminiText(data);

        if (response.ok && imageData) {
          return res.json({
            ok: true,
            provider: actualProvider,
            keyLabel: keyEntry.label,
            model: modelName,
            timestamp: new Date().toISOString(),
            prompt,
            character,
            campaign,
            usedRefs: useImagen ? [] : usedRefLabels,
            imageData,
            text,
            raw: data,
            fallbackAttempts: attempts
          });
        }

        attempts.push({
          keyLabel: keyEntry.label,
          provider: actualProvider,
          model: modelName,
          ok: false,
          status: response.status,
          error: data?.error?.message || 'Image generation failed',
          raw: data
        });

        const imageError = data?.error?.message || 'Image generation failed';
        const imagenPaidTierOnly = /only available on paid plans/i.test(String(imageError || ''));
        if (!useImagen && isHardImageQuotaFailure(response.status, imageError)) {
          skipFurtherGeminiForKey = true;
          continue;
        }
        if (useImagen && (isHardImageQuotaFailure(response.status, imageError) || imagenPaidTierOnly)) {
          break;
        }

        if (response.status === 429 || response.status === 503) {
          await sleep(1500);
          continue;
        }

        if (response.ok && !imageData) {
          continue;
        }
      }
    }

    const last = attempts[attempts.length - 1] || {};
    const quotaLikelyFreeTier = attempts.some(item => isHardImageQuotaFailure(item?.status, item?.error)) && attempts.some(item => isImagenModel(item?.model));
    const finalError = quotaLikelyFreeTier
      ? `${last.error || 'All Google image models failed.'} Imagen models on the Gemini API are currently paid-tier only, so this key likely needs a paid Google AI plan for Imagen fallback to work.`
      : (last.error || 'All Google image models failed.');

    return res.status(last.status || 500).json({
      ok: false,
      provider: last.provider || provider,
      model: last.model || requestedModel || 'unknown',
      timestamp: new Date().toISOString(),
      prompt,
      character,
      campaign,
      usedRefs: usedRefLabels,
      imageData: null,
      text: '',
      error: finalError,
      raw: last.raw || null,
      fallbackAttempts: attempts
    });
  } catch (error) {
    const msg =
      error?.name === 'AbortError'
        ? 'Gemini image request timed out after 60 seconds.'
        : String(error);

    return res.status(500).json({
      ok: false,
      provider: 'nanobanana',
      error: msg
    });
  }
});

module.exports = router;
