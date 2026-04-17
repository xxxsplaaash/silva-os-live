const { statements, parseJson, normalizeSessionLog } = require('../../db/sqlite');

function getStudioTurnHistory(limit = 12) {
  const rows = statements.getSessionLogs.all(Math.max(limit * 4, 40));
  const turns = [];
  for (const row of rows) {
    if (row.type !== 'studio_pulse_turn') continue;
    const payload = parseJson(row.payload_json, {});
    turns.push({
      id: row.id,
      ts: row.ts,
      q: String(payload.q || ''),
      effectiveQuestion: String(payload.effectiveQuestion || payload.q || ''),
      mode: String(payload.mode || 'direction'),
      summary: String(payload.summary || ''),
      lead: String(payload.lead || ''),
      fallback: !!payload.fallback,
      clarification: !!payload.clarification
    });
    if (turns.length >= limit) break;
  }
  return turns;
}

function logStudioTurn(input = {}) {
  statements.upsertSessionLog.run(normalizeSessionLog({
    type: 'studio_pulse_turn',
    ts: input.ts,
    payload: input
  }));
}

module.exports = { getStudioTurnHistory, logStudioTurn };
