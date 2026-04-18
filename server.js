const fs = require("fs");
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const promptsRouter = require('./routes/prompts');
const galleryRouter = require('./routes/gallery');
const plannerRouter = require('./routes/planner');
const stateRouter = require('./routes/state');
const studioRouter = require('./routes/studio');
const { db } = require('./db/sqlite');
const identityProfilesRoutes = require('./routes/identity_profiles');

dotenv.config();

const app = express();

// SILVA_PHASE1_PUBLIC_PREVIEW
const SILVA_PUBLIC_DIR = path.join(__dirname, 'public');
const SILVA_PUBLIC_INDEX = path.join(SILVA_PUBLIC_DIR, 'index.html');
const SILVA_LEGACY_INDEX = path.join(__dirname, 'index.html');

app.use('/app-static', express.static(SILVA_PUBLIC_DIR));

app.get('/app', (_req, res) => {
  res.sendFile(SILVA_PUBLIC_INDEX);
});

app.get(/^\/app\/.*$/, (_req, res) => {
  res.sendFile(SILVA_PUBLIC_INDEX);
});

app.get('/legacy', (_req, res) => {
  res.sendFile(SILVA_LEGACY_INDEX);
});

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    providers: ['gemini'],
    database: 'sqlite'
  });
});

app.use('/api/prompts', promptsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/planner', plannerRouter);
app.use('/api/state', stateRouter);
app.use('/api/studio', studioRouter);

// v3.9.5: chat experiment removed. Studio Pulse uses /api/studio/pulse for structured studio guidance.

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

app.post('/api/gemini/text', async (req, res) => {
  try {
    const { prompt } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'Prompt is required.' });
    }

    async function callGemini(modelName) {
      return fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        },
        45000
      );
    }

    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    let lastError = null;

    for (const modelName of models) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        let response;
        let data;

        try {
          response = await callGemini(modelName);
          data = await response.json();
        } catch (err) {
          if (err?.name === 'AbortError') {
            lastError = {
              model: modelName,
              attempt,
              error: 'Gemini request timed out after 45 seconds.'
            };
            continue;
          }
          throw err;
        }

        if (response.ok) {
          return res.json({
            ok: true,
            provider: 'gemini',
            model: modelName,
            attempt,
            data
          });
        }

        lastError = { model: modelName, attempt, data };

        if (response.status !== 503) {
          return res.status(response.status).json({
            ok: false,
            provider: 'gemini',
            model: modelName,
            attempt,
            error: data
          });
        }

        await sleep(attempt * 1500);
      }
    }

    return res.status(503).json({
      ok: false,
      error: 'Gemini is overloaded or timed out after retries.',
      details: lastError
    });
  } catch (error) {
    const msg =
      error?.name === 'AbortError'
        ? 'Gemini request timed out after 45 seconds.'
        : String(error);

    return res.status(500).json({ ok: false, error: msg });
  }
});

app.post('/api/gemini/image', async (req, res) => {
  try {
    const {
      prompt,
      character = '',
      campaign = '',
      provider = 'nanobanana',
      model = 'gemini-3-pro-image-preview',
      refs = []
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'Prompt is required.' });
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

    const allowedModels = new Set([
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview'
    ]);

    const fallbackOrder = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
      'gemini-3-pro-image-preview'
    ];

    const requestedModel = allowedModels.has(model) ? model : null;
    const modelChain = requestedModel
      ? [requestedModel, ...fallbackOrder.filter(m => m !== requestedModel)]
      : fallbackOrder;

    const attempts = [];

    for (const modelName of modelChain) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      let response;
      let data;

      try {
        response = await fetchWithTimeout(
          endpoint,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': process.env.GEMINI_API_KEY
            },
            body: JSON.stringify(requestBody)
          },
          60000
        );

        data = await response.json();
      } catch (err) {
        if (err?.name === 'AbortError') {
          attempts.push({
            model: modelName,
            ok: false,
            status: 504,
            error: 'Timed out after 60 seconds.'
          });
          continue;
        }

        attempts.push({
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
          provider,
          model: modelName,
          timestamp: new Date().toISOString(),
          prompt,
          character,
          campaign,
          usedRefs: imageParts.length
            ? imageParts.map((_, i) => (i === 0 ? 'face' : i === 1 ? 'body' : `ref_${i + 1}`))
            : [],
          imageData,
          text,
          raw: data,
          fallbackAttempts: attempts
        });
      }

      attempts.push({
        model: modelName,
        ok: false,
        status: response.status,
        error: data?.error?.message || 'Image generation failed',
        raw: data
      });

      if (response.status === 429 || response.status === 503) {
        await sleep(1500);
        continue;
      }

      if (response.ok && !imageData) {
        continue;
      }
    }

    const last = attempts[attempts.length - 1] || {};

    return res.status(last.status || 500).json({
      ok: false,
      provider,
      model: last.model || requestedModel || 'unknown',
      timestamp: new Date().toISOString(),
      prompt,
      character,
      campaign,
      usedRefs: imageParts.length
        ? imageParts.map((_, i) => (i === 0 ? 'face' : i === 1 ? 'body' : `ref_${i + 1}`))
        : [],
      imageData: null,
      text: '',
      error: last.error || 'All Gemini image models failed.',
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

process.on('SIGINT', () => {
  try { db.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { db.close(); } catch {}
  process.exit(0);
});

app.use('/api/identity', identityProfilesRoutes);

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
});
