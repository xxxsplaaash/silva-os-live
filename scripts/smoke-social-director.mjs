import http from 'node:http';

const BASE_URL = process.env.SOCIAL_DIRECTOR_BASE_URL || process.argv[2] || 'http://localhost:4335';

const PROMPTS = [
  'hi team',
  'how is everyone?',
  'everyone come online',
  'open floor',
  'let’s hear from everyone, how are we doing today?',
  'who’s hungry?',
  'Leah, girl?',
  'Grok, say something normal for once',
  'Claudia, are we a mess?',
  'Aisha, take the room',
  'Vanya, what’s the vibe?',
  'why are you all quiet?',
  'do you guys like each other?',
  'who’s annoyed right now?',
  'everyone bully this weak idea',
  'no, I just want you all to talk',
  'you don’t exist to interrupt, yk that?',
  'call them out and start talking',
  'Leah, be honest',
  'Grok, stop hiding',
  'Claudia, give me the adult answer',
  'Aisha, who should speak?',
  'Vanya, call someone in',
  'I’m sad, this feels like a waste of time',
  'I want this to feel like a social hub, not a task router',
  'open floor: what are we missing in the campaign?',
  'the provider failed again with the same timeout',
  'this logo feels bland, right?',
  'what’s the next highest value move?',
  'can we just vibe for a second?'
];

const BANNED_RX = /\b(I hear|I will keep this human|degraded mode|fallback|I need the object|Give me the thing|Say the thing plainly|if that is the object|on that:|I agree with)\b/i;
const RAW_INTERNAL_RX = /\b(exchangeContextV06|selectedSpeakers|addendumConstraint|relationshipSummaries|repairNeeded|trust:\s*\d|irritation:\s*\d|gravity|pulseReason|aishaDiagnostics|projectContext|activeSpeakerId)\b/i;

function postJson(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const target = new URL(url);
    const req = http.request({
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: { ok: false, raw: raw.slice(0, 500) } });
        }
      });
    });
    req.on('error', err => resolve({ status: 0, body: { ok: false, error: err.message } }));
    req.write(data);
    req.end();
  });
}

function normalizedTokens(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 3);
}

function repeatedPointRisk(events = []) {
  const seen = new Set();
  for (const event of events) {
    const key = normalizedTokens(event.text).join(' ');
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function feelsTaskRouterRisk(text = '') {
  return /\b(artifact|object|nothing to evaluate|needs a subject|there is no .*(brief|bug|campaign|object)|I need)\b/i.test(text);
}

const results = [];
for (const prompt of PROMPTS) {
  const { status, body } = await postJson(`${BASE_URL.replace(/\/$/, '')}/api/studio/pulse-social`, {
    message: prompt,
    threadId: `social-smoke-${Date.now()}`
  });
  const events = Array.isArray(body.messageEvents) ? body.messageEvents : [];
  const visible = [
    body.roomBeat,
    ...events.map(event => event.text),
    ...(Array.isArray(body.silentReactions) ? body.silentReactions.map(item => item.visibleState) : [])
  ].join('\n');
  results.push({
    prompt,
    httpStatus: status,
    activeEngine: body.activeEngine,
    aishaConnected: body.aishaConnected,
    aishaEngineMode: body.debugSummary?.aishaEngineMode || '',
    aishaTraceStatus: body.debugSummary?.aishaTraceStatus || '',
    failureReason: body.debugSummary?.aishaTraceFailureReason || body.debugSummary?.responseFallbackReason || '',
    responseMode: body.responseMode,
    roomBeat: body.roomBeat,
    roomMood: body.roomMood,
    speakers: events.map(event => event.speakerId),
    text: events.map(event => event.text),
    silentReactions: body.silentReactions || [],
    bannedPhraseFound: BANNED_RX.test(visible),
    repeatedPointRisk: repeatedPointRisk(events),
    rawInternalLeak: RAW_INTERNAL_RX.test(visible),
    feelsTaskRouterRisk: feelsTaskRouterRisk(visible),
    validation: body.validation,
    debugSummary: {
      failureCategory: body.debugSummary?.failureCategory || '',
      runtimeTimeoutMs: body.debugSummary?.runtimeTimeoutMs || 0,
      responseCount: body.debugSummary?.responseCount || 0,
      firstResponseHasContent: body.debugSummary?.firstResponseHasContent === true
    }
  });
}

console.log(JSON.stringify(results, null, 2));
