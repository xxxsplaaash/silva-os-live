#!/usr/bin/env node

const BACKEND_URL = String(
  process.env.BACKEND_URL ||
  'https://silva-backend-799875816242.us-central1.run.app'
).trim().replace(/\/+$/, '');
const SESSION_ID = String(process.env.SESSION_ID || `pulse-turn-acceptance-${Date.now().toString(36)}`);
const REQUIRE_MOST_ACCEPTED = process.env.REQUIRE_MOST_ACCEPTED === '1';
const LEAK_RX = /socialCues|generatorPrompt|aishaDiagnostics|requestShapeSummary|processAishaRequestType|AIza[0-9A-Za-z_-]+|test-room-provider-key|GEMINI_API_KEY|GOOGLE_API_KEY/i;
const FITNESS_REFUSAL_RX = /\b(objective is clear|not discussing|focus is required|personal fitness routines|not the objective)\b/i;
const FITNESS_ANSWER_RX = /\b(muscle|training|train|full-body|full body|protein|sleep|recovery|progressive overload|sets|reps|gym|lift)\b/i;

const PROMPTS = [
  { mode: 'social_hierarchy_lab', userText: 'LOL I WANNA GROW MY MUSCLES', expectsFitness: true },
  { mode: 'social_hierarchy_lab', userText: 'WHERE DO I START', expectsFitness: true },
  { mode: 'social_hierarchy_lab', userText: 'WHAT IS THE OBJECTIVE?', expectsFitness: true },
  { mode: 'social_hierarchy_lab', userText: 'BRUH...', expectsFitness: true },
  { mode: 'social_hierarchy_lab', userText: 'how is everyone?' },
  { mode: 'continuity_breaker', userText: 'Leah, challenge Grok, then let A.I.S.H.A anchor the contradiction ledger.' },
  { mode: 'continuity_breaker', userText: 'Actually my dashboard preference is pale blue with no red accents.' },
  { mode: 'social_hierarchy_lab', userText: 'open floor: what should the room watch next?' }
];

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function parseSseEvents(text = '') {
  return String(text || '')
    .split(/\n\n+/)
    .map(block => {
      const event = (block.match(/^event:\s*(.+)$/m) || [])[1];
      const data = block.split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())
        .join('\n');
      if (!event || !data) return null;
      try {
        return { event: event.trim(), data: JSON.parse(data) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function classify(final = {}) {
  if (final.acceptedByPack1 === true && final.activeEngine === 'aisha-runtime-pack1') {
    return final.repairedByRuntime === true || final.diagnostics?.repairedByRuntime === true ? 'repaired' : 'accepted';
  }
  const runtimeConnected = final.aishaEngineConnected === true || final.diagnostics?.runtimeConnected === true;
  if (runtimeConnected && final.fallbackCategory) return 'repaired';
  if (runtimeConnected) return 'connected-unaccepted';
  return 'fallback';
}

async function streamTurn(prompt, prior = {}, recentTurns = []) {
  const body = {
    sessionId: SESSION_ID,
    mode: prompt.mode,
    userText: prompt.userText,
    recentTurns,
    roomState: {
      roomMood: prior.roomMood || 'focused',
      responseMode: prior.responseMode || 'single',
      priorSpeaker: prior.priorSpeaker || '',
      socialSignals: prior.socialSignals || undefined
    }
  };
  const response = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  assertOk(!LEAK_RX.test(text), 'turn stream leaked prompt/runtime internals or secret-like material');
  assertOk(response.status === 200, `turn-stream failed HTTP ${response.status}: ${text.slice(0, 240)}`);
  assertOk(/text\/event-stream/i.test(response.headers.get('content-type') || ''), 'turn-stream did not return text/event-stream');
  const events = parseSseEvents(text);
  assertOk(events.some(item => item.event === 'runtime_status'), 'stream missing runtime_status');
  assertOk(events.some(item => item.event === 'final'), 'stream missing final');
  const final = events.find(item => item.event === 'final')?.data || {};
  assertOk(final.ok === true, 'final payload was not ok');
  const visible = (Array.isArray(final.messageEvents) ? final.messageEvents : [])
    .map(item => String(item.text || ''))
    .join('\n');
  if (prompt.expectsFitness) {
    assertOk(!FITNESS_REFUSAL_RX.test(visible), `fitness transcript refused the user intent: ${visible}`);
    assertOk(FITNESS_ANSWER_RX.test(visible), `fitness transcript did not answer the muscle-building context: ${visible}`);
  }
  const fallbackCategory = String(final.fallbackCategory || final.diagnostics?.fallbackCategory || '');
  return {
    prompt: prompt.userText,
    mode: prompt.mode,
    classification: classify(final),
    activeEngine: String(final.activeEngine || ''),
    aishaEngineConnected: final.aishaEngineConnected === true,
    runtimeConnected: final.aishaEngineConnected === true || final.diagnostics?.runtimeConnected === true,
    acceptedByPack1: final.acceptedByPack1 === true,
    qualityAccepted: final.qualityAccepted === true || final.diagnostics?.qualityAccepted === true,
    repairedByRuntime: final.repairedByRuntime === true || final.diagnostics?.repairedByRuntime === true,
    qualityFailureCategory: String(final.qualityFailureCategory || final.diagnostics?.qualityFailureCategory || ''),
    fallbackCategory,
    traceStatus: String(final.diagnostics?.traceStatus || ''),
    persistenceConnected: final.diagnostics?.persistenceConnected === true,
    messageCount: Array.isArray(final.messageEvents) ? final.messageEvents.length : 0,
    ledgerCount: Array.isArray(final.continuityLedger) ? final.continuityLedger.length : 0,
    roomMood: String(final.roomMood || ''),
    responseMode: String(final.responseMode || ''),
    socialSignals: final.socialSignals || {},
    messageEvents: Array.isArray(final.messageEvents) ? final.messageEvents : []
  };
}

const statusResponse = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/status?refresh=1`, {
  headers: { accept: 'application/json' }
});
const statusText = await statusResponse.text();
assertOk(!LEAK_RX.test(statusText), 'status leaked prompt/runtime internals or secret-like material');
assertOk(statusResponse.ok, `status failed HTTP ${statusResponse.status}: ${statusText.slice(0, 240)}`);
const status = JSON.parse(statusText);
assertOk(status.activeEngine === 'aisha-runtime-pack1', `unexpected activeEngine ${status.activeEngine}`);
assertOk(status.aishaEngineConnected === true, 'Pack 1 is not connected');
assertOk(status.persistence?.connected === true, 'Pack 1 persistence is not connected');

const results = [];
let prior = {};
const recentTurns = [];
for (const prompt of PROMPTS) {
  recentTurns.push({ speakerId: 'user', role: 'user', text: prompt.userText });
  const result = await streamTurn(prompt, prior, recentTurns.slice(-8));
  results.push({
    prompt: result.prompt,
    mode: result.mode,
    classification: result.classification,
    activeEngine: result.activeEngine,
    aishaEngineConnected: result.aishaEngineConnected,
    runtimeConnected: result.runtimeConnected,
    acceptedByPack1: result.acceptedByPack1,
    qualityAccepted: result.qualityAccepted,
    repairedByRuntime: result.repairedByRuntime,
    qualityFailureCategory: result.qualityFailureCategory,
    fallbackCategory: result.fallbackCategory,
    traceStatus: result.traceStatus,
    persistenceConnected: result.persistenceConnected,
    messageCount: result.messageCount,
    ledgerCount: result.ledgerCount
  });
  prior = {
    roomMood: result.roomMood,
    responseMode: result.responseMode,
    priorSpeaker: '',
    socialSignals: result.socialSignals
  };
  for (const event of result.messageEvents) {
    recentTurns.push({ speakerId: event.speakerId, role: event.role || 'message', text: event.text || '' });
  }
}

const summary = {
  backendUrl: BACKEND_URL,
  sessionId: SESSION_ID,
  status: {
    activeEngine: status.activeEngine,
    aishaEngineConnected: status.aishaEngineConnected,
    aishaEngineMode: status.aishaEngineMode,
    persistenceConnected: status.persistence?.connected === true
  },
  counts: {
    accepted: results.filter(item => item.classification === 'accepted').length,
    repaired: results.filter(item => item.classification === 'repaired' || item.classification === 'connected-unaccepted').length,
    fallback: results.filter(item => item.classification === 'fallback').length
  },
  results
};

const serialized = JSON.stringify(summary, null, 2);
assertOk(!LEAK_RX.test(serialized), 'summary leaked prompt/runtime internals or secret-like material');
console.log(serialized);

const acceptedOrRepaired = summary.counts.accepted + summary.counts.repaired;
if (summary.counts.fallback > 0) {
  console.error('One or more turns reported unavailable runtime fallback.');
  process.exit(1);
}
if (REQUIRE_MOST_ACCEPTED && summary.counts.accepted < Math.ceil(PROMPTS.length / 2)) {
  console.error(`Only ${summary.counts.accepted}/${PROMPTS.length} turns were accepted by Pack 1.`);
  process.exit(1);
}
if (acceptedOrRepaired < PROMPTS.length) {
  console.error('One or more turns were neither accepted nor safely repaired.');
  process.exit(1);
}
