const { normalizeCouncilResponse } = require('./council');

function parseGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (typeof part?.text === 'string') return part.text;
  }
  return '';
}

function parseStudioJson(text) {
  if (!text) return null;
  const str = String(text);
  const fenced = str.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (_) {}
  }
  const direct = str.match(/\{[\s\S]*\}/);
  if (direct) {
    try { return JSON.parse(direct[0]); } catch (_) {}
  }
  return null;
}

function wrapPlainTextAsStudioResponse(text) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  return normalizeCouncilResponse({
    title: 'Studio response',
    summary: clean,
    departmentLead: 'aisha',
    aishaFrame: 'The model returned plain text, so Aisha is wrapping it into the council format.',
    departmentPerspective: clean,
    aishaFinal: clean,
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: []
  });
}

module.exports = { parseGeminiText, parseStudioJson, wrapPlainTextAsStudioResponse, normalizeCouncilResponse };
