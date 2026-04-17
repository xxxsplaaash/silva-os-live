const express = require('express');
const router = express.Router();
const { getDeterministicStudioResponse, fallbackStudioResponse, clarificationResponse } = require('../lib/studio/fallback');
const { parseGeminiText, parseStudioJson, wrapPlainTextAsStudioResponse } = require('../lib/studio/parse');
const { getStudioSystemContext } = require('../lib/studio/systemContext');
const { buildStudioPrompt } = require('../lib/studio/prompt');
const { getStudioTurnHistory, logStudioTurn } = require('../lib/studio/history');

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); }
}

function looksIncompleteQuestion(q = '') {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return true;
  if (s.length < 8) return true;
  return /^(who|what|which|how|why|where|when)\s+is\s+the$/.test(s)
    || /\b(the|a|an|most|best|coolest|smartest|funniest|strongest|trendiest)\s*$/.test(s)
    || (/\?$/.test(s) === false && /^(who|what|which|how|why|where|when)\b/.test(s) && s.split(/\s+/).length < 4);
}

function resolveQuestion(question, recent = []) {
  const q = String(question || '').trim();
  if (!looksIncompleteQuestion(q)) return { effectiveQuestion: q, clarificationNeeded: false, resolvedFromHistory: false };
  const previous = recent.find(item => item?.q && String(item.q).trim().toLowerCase() !== q.toLowerCase());
  if (!previous) return { effectiveQuestion: q, clarificationNeeded: true, resolvedFromHistory: false };
  return { effectiveQuestion: `${previous.q} ${q}`.replace(/\s+/g, ' ').trim(), clarificationNeeded: false, resolvedFromHistory: true, previousQuestion: previous.q };
}

router.get('/history', (req, res) => {
  try { res.json({ ok: true, turns: getStudioTurnHistory(30) }); }
  catch (err) { res.status(500).json({ ok: false, error: String(err) }); }
});

router.post('/pulse', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  const mode = String(req.body?.mode || 'direction').trim() || 'direction';
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!question) return res.status(400).json({ ok: false, error: 'question is required' });

  const system = getStudioSystemContext(req.body?.counts || {}, history);
  const recent = system.recentQuestions || [];
  const resolution = resolveQuestion(question, recent);

  if (resolution.clarificationNeeded) {
    const response = clarificationResponse(question, system);
    logStudioTurn({ q: question, effectiveQuestion: question, mode, summary: response.summary, lead: response.lead, fallback: true, clarification: true });
    return res.json({ ok: true, mode, response, provider: 'studio', model: null, fallback: true, clarification: true, system });
  }

  const effectiveQuestion = resolution.effectiveQuestion;
  const deterministic = getDeterministicStudioResponse(effectiveQuestion, mode, system.consistencyCounts, system);
  if (deterministic) {
    logStudioTurn({ q: question, effectiveQuestion, mode, summary: deterministic.summary, lead: deterministic.lead, fallback: false, clarification: false, deterministic: true });
    return res.json({ ok: true, mode, response: deterministic, provider: 'studio', model: null, fallback: false, deterministic: true, system, resolvedFromHistory: resolution.resolvedFromHistory });
  }

  const prompt = buildStudioPrompt(effectiveQuestion, mode, system);
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  let lastError = null;

  if (!process.env.GEMINI_API_KEY) {
    const response = fallbackStudioResponse(system);
    logStudioTurn({ q: question, effectiveQuestion, mode, summary: response.summary, lead: response.lead, fallback: true, clarification: false });
    return res.json({ ok: true, mode, response, provider: 'studio', model: null, fallback: true, details: { error: 'Missing GEMINI_API_KEY' }, system, resolvedFromHistory: resolution.resolvedFromHistory });
  }

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          },
          30000
        );
        const data = await response.json();
        if (response.ok) {
          const rawText = parseGeminiText(data);
          const parsed = parseStudioJson(rawText) || wrapPlainTextAsStudioResponse(rawText) || fallbackStudioResponse(system);
          logStudioTurn({ q: question, effectiveQuestion, mode, summary: parsed.summary, lead: parsed.lead, fallback: false, clarification: false });
          return res.json({ ok: true, mode, response: parsed, provider: 'gemini', model: modelName, attempt, fallback: false, system, resolvedFromHistory: resolution.resolvedFromHistory });
        }
        lastError = { status: response.status, data, modelName, attempt };
        if (response.status === 503 || response.status === 429) { await sleep(1200 * attempt); continue; }
      } catch (err) {
        lastError = { error: String(err), modelName, attempt };
      }
    }
  }

  const response = fallbackStudioResponse(system);
  logStudioTurn({ q: question, effectiveQuestion, mode, summary: response.summary, lead: response.lead, fallback: true, clarification: false });
  return res.json({ ok: true, mode, response, provider: 'gemini', model: null, fallback: true, details: lastError, system, resolvedFromHistory: resolution.resolvedFromHistory });
});

module.exports = router;
