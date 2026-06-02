const BACKEND_URL = String(process.env.BACKEND_URL || 'https://silva-backend-799875816242.us-central1.run.app').replace(/\/+$/, '');
const LEAK_RX = /socialCues|generatorPrompt|aishaDiagnostics|requestShapeSummary|processAishaRequestType|AIza|test-room-provider-key/i;

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseSseEvents(text = '') {
  return String(text || '')
    .split(/\n\n+/)
    .map(block => {
      const lines = block.split(/\r?\n/);
      const event = (lines.find(line => line.startsWith('event:')) || '').slice(6).trim();
      const data = lines
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim())
        .join('\n');
      if (!event || !data) return null;
      try {
        return { event, data: JSON.parse(data) };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function ledgerHas(payload = {}, status = '', pattern = /./) {
  return (Array.isArray(payload.continuityLedger) ? payload.continuityLedger : [])
    .some(item => item.status === status && item.source === 'pack1-memory' && pattern.test(String(item.text || '')));
}

async function getStatus() {
  const response = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/status?refresh=1`, {
    headers: { accept: 'application/json' }
  });
  const body = await response.text();
  assertOk(response.ok, `status failed ${response.status}: ${body.slice(0, 300)}`);
  assertOk(!LEAK_RX.test(body), 'status leaked internal or secret-like fields');
  const data = JSON.parse(body);
  assertOk(data.activeEngine === 'aisha-runtime-pack1', `unexpected activeEngine ${data.activeEngine}`);
  assertOk(data.aishaEngineConnected === true, 'Pack 1 is not connected');
  assertOk(data.aishaEngineMode === 'production', `unexpected engine mode ${data.aishaEngineMode}`);
  assertOk(data.persistence?.connected === true, 'Postgres persistence is not connected');
  return data;
}

async function streamTurn(sessionId, userText, roomState = {}) {
  const response = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify({
      sessionId,
      mode: 'continuity_breaker',
      userText,
      roomState
    })
  });
  const text = await response.text();
  assertOk(response.status === 200, `stream failed ${response.status}: ${text.slice(0, 300)}`);
  assertOk(/text\/event-stream/i.test(response.headers.get('content-type') || ''), 'stream did not return text/event-stream');
  assertOk(!LEAK_RX.test(text), 'stream leaked internal or secret-like fields');
  const events = parseSseEvents(text);
  assertOk(events.some(item => item.event === 'turn_start'), 'stream missing turn_start');
  assertOk(events.some(item => item.event === 'runtime_status'), 'stream missing runtime_status');
  assertOk(events.some(item => item.event === 'social_signals'), 'stream missing social_signals');
  assertOk(events[events.length - 1]?.event === 'final', 'stream did not end in final');
  const final = events.find(item => item.event === 'final')?.data;
  assertOk(final?.ok === true, 'final payload was not ok');
  assertOk(final.activeEngine === 'aisha-runtime-pack1', `final activeEngine was ${final.activeEngine}`);
  assertOk(final.acceptedByPack1 === true, `Pack 1 did not accept turn: ${final.fallbackCategory || 'unknown'}`);
  assertOk(final.diagnostics?.persistenceConnected === true, 'final did not report persistence connected');
  assertOk(Number.isFinite(Number(final.socialSignals?.tension)), 'final missing bounded tension');
  assertOk(Number.isFinite(Number(final.socialSignals?.continuityPressure)), 'final missing bounded continuity pressure');
  assertOk(typeof final.socialSignals?.roomMove === 'string', 'final missing roomMove');
  assertOk(Array.isArray(final.socialSignals?.statusEvents), 'final missing statusEvents');
  return { events, final };
}

const sessionId = `pulse-showcase-live-${Date.now().toString(36)}`;
const status = await getStatus();
const first = await streamTurn(sessionId, 'My dashboard preference is obsidian with one red accent.');
await sleep(2000);
const recall = await streamTurn(sessionId, 'What dashboard preference did I give the room?', {
  priorSpeaker: first.final.messageEvents?.[0]?.speakerId || 'aisha',
  socialSignals: first.final.socialSignals
});
await sleep(2000);
const contradiction = await streamTurn(sessionId, 'Actually my dashboard preference is pale blue with no red accents.', {
  priorSpeaker: recall.final.messageEvents?.[0]?.speakerId || 'aisha',
  socialSignals: recall.final.socialSignals
});

assertOk(/obsidian|red accent/i.test(JSON.stringify(first.final)), 'first turn did not record the initial preference');
assertOk(/obsidian|red accent/i.test(JSON.stringify(recall.final)), 'recall turn did not reference the initial preference');
assertOk(ledgerHas(contradiction.final, 'active', /pale blue|no red/i), 'contradiction missing active Pack 1 ledger row');
assertOk(
  ledgerHas(contradiction.final, 'superseded', /obsidian|red accent/i)
    || ledgerHas(contradiction.final, 'disputed', /obsidian|red accent/i),
  'contradiction missing prior Pack 1 evidence'
);
assertOk(Number(contradiction.final.socialSignals.continuityPressure) > Number(first.final.socialSignals.continuityPressure || 0), 'continuity pressure did not rise on contradiction');

console.log(JSON.stringify({
  ok: true,
  backendUrl: BACKEND_URL,
  sessionId,
  status: {
    activeEngine: status.activeEngine,
    aishaEngineMode: status.aishaEngineMode,
    persistence: status.persistence
  },
  first: {
    acceptedByPack1: first.final.acceptedByPack1,
    roomMove: first.final.socialSignals.roomMove,
    continuityPressure: first.final.socialSignals.continuityPressure
  },
  recall: {
    acceptedByPack1: recall.final.acceptedByPack1,
    roomMove: recall.final.socialSignals.roomMove,
    continuityPressure: recall.final.socialSignals.continuityPressure
  },
  contradiction: {
    acceptedByPack1: contradiction.final.acceptedByPack1,
    roomMove: contradiction.final.socialSignals.roomMove,
    continuityPressure: contradiction.final.socialSignals.continuityPressure,
    ledger: contradiction.final.continuityLedger
  }
}, null, 2));
