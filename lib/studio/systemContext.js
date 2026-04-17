const { statements, parseJson } = require('../../db/sqlite');
const { getStudioTurnHistory } = require('./history');

const CHARACTERS = {
  leah: {
    id: 'leah', name: 'Leah Mokoena', surname: 'Mokoena', role: 'Content intelligence', age: 29,
    strongest: ['trend analysis', 'taste', 'creative direction'],
    tags: ['trendiest', 'most creative', 'sharpest eye']
  },
  claudia: {
    id: 'claudia', name: 'Claudia Naidoo', surname: 'Naidoo', role: 'Client systems', age: 31,
    strongest: ['operations', 'structure', 'delivery'],
    tags: ['most organised', 'most serious', 'most composed']
  },
  grok: {
    id: 'grok', name: 'Grok / Gerhard', surname: 'Kroukamp', role: 'Technical systems', age: 32,
    strongest: ['automation', 'systems', 'technical architecture'],
    tags: ['smartest', 'most focused', 'most analytical']
  },
  vanya: {
    id: 'vanya', name: 'Vanya Khumalo', surname: 'Khumalo', role: 'People & culture', age: 28,
    strongest: ['social instinct', 'tone', 'magnetism'],
    tags: ['coolest', 'funniest', 'warmest']
  }
};

function normalizeCounts(counts = {}) {
  return {
    home: Number(counts.home || 0),
    outfits: Number(counts.outfits || 0),
    items: Number(counts.items || 0),
    vehicles: Number(counts.vehicles || 0)
  };
}

function mergeRecentHistory(clientHistory = [], dbHistory = []) {
  const seen = new Set();
  const merged = [];
  for (const item of [...clientHistory, ...dbHistory]) {
    const q = String(item?.q || '').trim();
    if (!q) continue;
    const key = `${String(item?.mode || 'direction')}::${q}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      q,
      mode: String(item?.mode || 'direction'),
      ts: String(item?.ts || ''),
      summary: String(item?.summary || '')
    });
    if (merged.length >= 12) break;
  }
  return merged;
}

function getStudioSystemContext(inputCounts = {}, clientHistory = []) {
  const counts = normalizeCounts(inputCounts);
  const promptRows = statements.getPrompts.all();
  const galleryRows = statements.getGallery.all();
  const plannerRows = statements.getPlanner.all();
  const lastMigration = statements.getSystemState.get('last_migration');
  const dbHistory = getStudioTurnHistory(12);

  return {
    characters: CHARACTERS,
    characterCount: Object.keys(CHARACTERS).length,
    consistencyCounts: counts,
    promptCount: promptRows.length,
    galleryCount: galleryRows.length,
    plannerCount: plannerRows.length,
    lastMigration: lastMigration ? parseJson(lastMigration.value_json, {}) : null,
    recentQuestions: mergeRecentHistory(clientHistory, dbHistory),
    recentTurns: dbHistory
  };
}

module.exports = { CHARACTERS, normalizeCounts, getStudioSystemContext };
