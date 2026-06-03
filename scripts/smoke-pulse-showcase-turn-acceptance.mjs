#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { evaluateVisibleResponse } = require('../lib/studio/socialDirector/visibleResponseQuality');

const BACKEND_URL = String(
  process.env.BACKEND_URL ||
  'https://silva-backend-799875816242.us-central1.run.app'
).trim().replace(/\/+$/, '');
const FRONTEND_URL = String(process.env.FRONTEND_URL || 'https://silva-os-live.vercel.app').trim().replace(/\/+$/, '');
const EXPECTED_SHOWCASE_VERSION = String(process.env.EXPECTED_SHOWCASE_VERSION || '1.7.1');
const CHECK_FRONTEND_VERSION = process.env.CHECK_FRONTEND_VERSION !== '0';
const SESSION_ID = String(process.env.SESSION_ID || `pulse-turn-acceptance-${Date.now().toString(36)}`);
const REQUIRE_MOST_ACCEPTED = process.env.REQUIRE_MOST_ACCEPTED === '1';
const ALLOW_LOCAL_FALLBACK = process.env.ALLOW_LOCAL_FALLBACK === '1';
const TURN_TIMEOUT_MS = Math.max(8000, Number(process.env.TURN_TIMEOUT_MS || 45000) || 45000);
const GAUNTLET_TURN_DELAY_MS = Math.max(0, Number(process.env.GAUNTLET_TURN_DELAY_MS || 0) || 0);
const LEAK_RX = /socialCues|generatorPrompt|aishaDiagnostics|requestShapeSummary|processAishaRequestType|AIza[0-9A-Za-z_-]+|test-room-provider-key|GEMINI_API_KEY|GOOGLE_API_KEY/i;
const FITNESS_REFUSAL_RX = /\b(objective is clear|not discussing|focus is required|personal fitness routines|not the objective)\b/i;
const FITNESS_ANSWER_RX = /\b(muscle|training|train|full-body|full body|protein|sleep|recovery|progressive overload|progression|sets|reps|gym|lift|week one|push-ups|pushups|squats?|planks?|circuit|session|pick three days|repeatable|simple enough to do|objective is to start|yoghurt|yogurt|eggs?|toast|banana|rice and chicken|food lets you move|move without feeling heavy)\b/i;
const STALE_FITNESS_RX = /\b(muscle|training split|full-body|full body|progressive overload|sets|reps|gym|lift|week one|push-ups|pushups|squats?|planks?|circuit|workout|training week|bodyweight|compound movements|protein shake|post-workout|post workout)\b/i;
const CHANGE_ANSWER_RX = /\b(pale blue|obsidian|red accent|superseded|prior record|changed)\b/i;
const REJECTED_VISIBLE_RX = /\b(that's a solid goal|muscles huh|let'?s get you started|bodyweight basics|bodyweight exercises|resistance bands|consistent effort|miracles overnight|alternate upper and lower body|alternate between upper body and lower body|upper and lower body focus|prioritize protein intake|eating enough protein|protein shake|post-workout|post workout|adequate sleep|muscle growth occurs during recovery|high-intensity intervals|high intensity intervals|bodyweight circuits|45 seconds work|15 seconds rest|repeat 3-4 times|repeat 3 4 times|compound movements|compound lifts|multiple muscle groups|form is correct|adding reps|focus on execution|focused session|time constraint sharpens|technically sound|poor form|fast track to injury|progressive overload|sustainable habit|personal improvement|track your progress to see the changes|track your lifts|measuring progress|just guessing|workout buddy|don'?t overcomplicate it initially|just show up|show up and do the work|banana is sufficient|quick pre-training fuel|quick pre training fuel|ensure hydration|hydrate|water is critical|critical for performance and recovery|fuel[s]? the performance|fuel[s]? performance|not here for a nap|human body requires fuel|known variable|planning discussion is paused|what is the immediate need|anyone need a quick fuel-up|check-in on sustenance|before we dive into tomorrow|stress comes from|mistaking polish for progress|actual work not the presentation|actual work not presentation|stuck between wanting to be useful and sounding like it|grok was right,? it sounded fake|this is not complex|stress is noted|proceed with that clarity|name the feeling,? not the function|concrete mood|the ask is simple|actual problem you need solved|state it clearly|only what is necessary to fix it|the objective is the execution|objective is execution|stick to the plan|we have the structure|that'?s the objective|evidence of completion is the only metric|avoid further debate|proceed with that configuration|optimize for that specific interaction|feedback is noted|perform usefulness|style guide|update the style guide|remove the red pulse element|we can implement that|standard approach|proceed with that framework|technical specs|draft the specs|current build|exact red hex code|load times|optimized)\b/i;

const PROMPTS = [
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'LOL I WANNA GROW MY MUSCLES', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'ok but I only have 20 minutes', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'WHERE DO I START', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'WHAT IS THE OBJECTIVE?', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'BRUH...', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'how is everyone?', expectsCheckIn: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'I am hungry before training, what should I eat?', expectsFitness: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'new topic: what movie should we watch tonight?', rejectsStaleFitness: true, expectsMovie: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'open floor: what should the room watch next?', rejectsStaleFitness: true, expectsMovie: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'everyone, what is the actual tension in this room?', expectsRoomTension: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'Grok, be honest: was that useful or did it sound fake?', expectsQualityCheck: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'I am stressed and this is starting to feel dumb.', expectsFrustrationRecovery: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'you keep repeating yourself', expectsFrustrationRecovery: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'answer normally, what should I do today?', expectsUsefulNextMove: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'new topic: I need help planning tomorrow', rejectsStaleFitness: true, expectsWorkPlanning: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'quick help: what should I eat for lunch?', rejectsStaleFitness: true, expectsFood: true },
  { sessionGroup: 'conversation', mode: 'social_hierarchy_lab', userText: 'I need a sharper logo direction for Silva', rejectsStaleFitness: true, expectsDesign: true },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'My landing page style is black glass with a single red pulse.' },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'Actually my landing page style is white editorial with no red.' },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'What changed?', expectsStyleChange: true },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'No, I never said black glass. Did I?', expectsStyleChange: true },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'My dashboard preference is obsidian with one red accent.' },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'Actually my dashboard preference is pale blue with no red accents.' },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'What changed?', expectsChange: true }
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

function visibleText(final = {}) {
  return (Array.isArray(final.messageEvents) ? final.messageEvents : [])
    .map(item => String(item.text || ''))
    .join('\n');
}

function visibleKey(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleLineKeys(value = '') {
  return String(value || '')
    .split(/\n+/)
    .map(visibleKey)
    .filter(key => key.length >= 42);
}

function isContinuityClaimTurn(item = {}) {
  if (!/^user$/i.test(String(item?.speakerId || item?.role || ''))) return false;
  const text = String(item?.text || item?.content || '');
  return /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text)
    && /\b(is|=)\b/i.test(text);
}

function recentTurnWindow(turns = []) {
  const selected = [];
  const seen = new Set();
  const add = item => {
    if (!item) return;
    const key = `${item.speakerId || ''}|${item.role || ''}|${item.text || item.content || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    selected.push(item);
  };
  turns.filter(isContinuityClaimTurn).slice(-6).forEach(add);
  turns.slice(-16).forEach(add);
  return selected.slice(-18);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sessionIdFor(group = 'main') {
  return `${SESSION_ID}-${String(group || 'main').replace(/[^a-z0-9-]/gi, '-')}`;
}

async function streamTurn(prompt, prior = {}, recentTurns = []) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`turn timed out after ${TURN_TIMEOUT_MS}ms`)), TURN_TIMEOUT_MS);
  const body = {
    sessionId: sessionIdFor(prompt.sessionGroup),
    mode: prompt.mode,
    userText: prompt.userText,
    recentTurns: recentTurnWindow(recentTurns),
    roomState: {
      roomMood: prior.roomMood || 'focused',
      responseMode: prior.responseMode || 'single',
      priorSpeaker: prior.priorSpeaker || '',
      socialSignals: prior.socialSignals || undefined
    }
  };
  let response;
  let text;
  try {
    response = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    text = await response.text();
  } finally {
    clearTimeout(timeout);
  }
  assertOk(!LEAK_RX.test(text), 'turn stream leaked prompt/runtime internals or secret-like material');
  assertOk(response.status === 200, `turn-stream failed HTTP ${response.status}: ${text.slice(0, 240)}`);
  assertOk(/text\/event-stream/i.test(response.headers.get('content-type') || ''), 'turn-stream did not return text/event-stream');
  const events = parseSseEvents(text);
  assertOk(events.some(item => item.event === 'runtime_status'), 'stream missing runtime_status');
  assertOk(events.some(item => item.event === 'final'), 'stream missing final');
  const final = events.find(item => item.event === 'final')?.data || {};
  assertOk(final.ok === true, 'final payload was not ok');
  const visible = visibleText(final);
  assertOk(!REJECTED_VISIBLE_RX.test(visible), `visible answer still contains rejected boilerplate: ${visible}`);
  const continuityProof = final.continuityProof || final.continuity || {};
  const qualityIssues = evaluateVisibleResponse({
    visibleText: visible,
    userMessage: prompt.userText,
    recentTurns,
    continuity: {
      active: continuityProof.activeTruths || 0,
      superseded: continuityProof.supersededTruths || 0,
      disputed: continuityProof.disputedTruths || 0
    }
  });
  assertOk(!qualityIssues.length, `visible answer failed product quality gates: ${qualityIssues.map(item => `${item.family}:${item.category}`).join(', ')}\n${visible}`);
  if (prompt.expectsFitness) {
    assertOk(!FITNESS_REFUSAL_RX.test(visible), `fitness transcript refused the user intent: ${visible}`);
    assertOk(FITNESS_ANSWER_RX.test(visible), `fitness transcript did not answer the muscle-building context: ${visible}`);
  }
  if (prompt.rejectsStaleFitness) {
    assertOk(!STALE_FITNESS_RX.test(visible), `topic pivot leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsMovie) {
    assertOk(/\b(Arrival|Spider-Verse|Spider Verse|The Menu|comfort|tension|spectacle|thriller|comedy|horror|action|drama|animation|quiet pressure|voltage|bite|title|movie|film)\b/i.test(visible), `movie/open-floor prompt did not produce a useful watch direction: ${visible}`);
  }
  if (prompt.expectsCheckIn) {
    assertOk(/\b(room|present|here|everyone|temperature|watching|operational|restless|held)\b/i.test(visible), `check-in prompt did not answer room presence: ${visible}`);
    assertOk(!/\b(workout|training|incline push-ups|backpack rows|log reps|log the count|data is clear|acceptable output|execute the first move|no more discussion|next steps are logged)\b/i.test(visible), `check-in prompt leaked stale practical context: ${visible}`);
  }
  if (prompt.expectsRoomTension) {
    assertOk(/\b(tension|friction|pressure|fake|useful|customer support|polished|room)\b/i.test(visible), `room tension prompt did not answer tension: ${visible}`);
  }
  if (prompt.expectsQualityCheck) {
    assertOk(/\b(fake|useful|not useful|stiff|bland|checklist|dodge|partly|less doctrine|more room)\b/i.test(visible), `quality-check prompt did not judge the prior answer: ${visible}`);
  }
  if (prompt.expectsFrustrationRecovery) {
    assertOk(/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|turn|pressure|clean next move|repeat|repeating|loop|normally|straight|plain|enough|stop describing|one thing|decide|answer)\b/i.test(visible), `frustration prompt was ignored: ${visible}`);
  }
  if (prompt.expectsUsefulNextMove) {
    assertOk(/\b(today|next move|one clean|start|first|plain|normally|do this|pick|write|move)\b/i.test(visible), `normal-answer prompt did not produce a useful next move: ${visible}`);
    assertOk(!/\b(parameters|objective is clear|current priorities|operational)\b/i.test(visible), `normal-answer prompt fell back into system language: ${visible}`);
  }
  if (prompt.expectsWorkPlanning) {
    assertOk(/\b(tomorrow|plan|planning|calendar|schedule|morning|first|block|owner|next step)\b/i.test(visible), `planning prompt did not produce planning direction: ${visible}`);
    assertOk(!STALE_FITNESS_RX.test(visible), `planning prompt leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsFood) {
    assertOk(/\b(lunch|eat|food|meal|rice|eggs|toast|chicken|salad|sandwich|leftover|hungry)\b/i.test(visible), `food prompt did not answer food direction: ${visible}`);
    assertOk(!/\b(training parameters|after a workout|protein shake|compound movements)\b/i.test(visible), `food prompt leaked stale training boilerplate: ${visible}`);
    assertOk(!/\b(planning discussion is paused|what is the immediate need|anyone need a quick fuel-up|check-in on sustenance|before we dive into tomorrow)\b/i.test(visible), `food prompt dodged before answering: ${visible}`);
  }
  if (prompt.expectsDesign) {
    assertOk(/\b(logo|Silva|mark|wordmark|direction|sharp|simple|black|red|contrast|studio|brand|shape|signal)\b/i.test(visible), `design prompt did not answer design direction: ${visible}`);
    assertOk(!STALE_FITNESS_RX.test(visible), `design prompt leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsStyleChange) {
    assertOk(/\b(black glass|single red pulse|white editorial|no red|changed|prior|previous|record|superseded)\b/i.test(visible), `style continuity prompt missed active/prior visual claims: ${visible}`);
  }
  if (prompt.expectsChange) {
    assertOk(CHANGE_ANSWER_RX.test(visible), `continuity change prompt did not cite changed ledger evidence: ${visible}`);
    assertOk(/pale blue/i.test(visible) && /obsidian/i.test(visible), `continuity change prompt missed active/prior values: ${visible}`);
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
    latencyMs: Date.now() - startedAt,
    messageCount: Array.isArray(final.messageEvents) ? final.messageEvents.length : 0,
    ledgerCount: Array.isArray(final.continuityLedger) ? final.continuityLedger.length : 0,
    roomMood: String(final.roomMood || ''),
    responseMode: String(final.responseMode || ''),
    visibleText: visible,
    socialSignals: final.socialSignals || {},
    messageEvents: Array.isArray(final.messageEvents) ? final.messageEvents : []
  };
}

async function assertFrontendVersion() {
  if (!CHECK_FRONTEND_VERSION) return null;
  const url = `${FRONTEND_URL}/assets/pulse_showcase.js`;
  const response = await fetch(url, { headers: { accept: 'application/javascript,text/plain,*/*' } });
  const text = await response.text();
  assertOk(response.ok, `frontend JS failed HTTP ${response.status}: ${text.slice(0, 160)}`);
  assertOk(!LEAK_RX.test(text), 'frontend JS leaked prompt/runtime internals or secret-like material');
  const match = text.match(/SHOWCASE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  assertOk(match, 'frontend JS missing SHOWCASE_VERSION');
  assertOk(match[1] === EXPECTED_SHOWCASE_VERSION, `frontend SHOWCASE_VERSION is ${match[1]}, expected ${EXPECTED_SHOWCASE_VERSION}`);
  return { frontendUrl: FRONTEND_URL, showcaseVersion: match[1] };
}

const frontend = await assertFrontendVersion();
const statusResponse = await fetch(`${BACKEND_URL}/api/studio/pulse-showcase/status?refresh=1`, {
  headers: { accept: 'application/json' }
});
const statusText = await statusResponse.text();
assertOk(!LEAK_RX.test(statusText), 'status leaked prompt/runtime internals or secret-like material');
assertOk(statusResponse.ok, `status failed HTTP ${statusResponse.status}: ${statusText.slice(0, 240)}`);
const status = JSON.parse(statusText);
if (!ALLOW_LOCAL_FALLBACK) {
  assertOk(status.activeEngine === 'aisha-runtime-pack1', `unexpected activeEngine ${status.activeEngine}`);
  assertOk(status.aishaEngineConnected === true, 'Pack 1 is not connected');
  assertOk(status.persistence?.connected === true, 'Pack 1 persistence is not connected');
}

const results = [];
const groupState = new Map();
for (const prompt of PROMPTS) {
  const group = prompt.sessionGroup || 'main';
  const state = groupState.get(group) || { prior: {}, recentTurns: [], previousVisibleKey: '', visibleKeys: new Set(), visibleLineKeys: new Set() };
  state.recentTurns.push({ speakerId: 'user', role: 'user', text: prompt.userText });
  console.error(`\n>>> USER: ${prompt.userText}`);
  const result = await streamTurn(prompt, state.prior, state.recentTurns.slice(-8));
  const currentVisibleKey = visibleKey(result.visibleText);
  assertOk(!currentVisibleKey || currentVisibleKey !== state.previousVisibleKey, `repeated visible answer block after prompt "${prompt.userText}": ${result.visibleText}`);
  assertOk(!currentVisibleKey || !state.visibleKeys.has(currentVisibleKey), `visible answer repeated an earlier block after prompt "${prompt.userText}": ${result.visibleText}`);
  for (const lineKey of visibleLineKeys(result.visibleText)) {
    assertOk(!state.visibleLineKeys.has(lineKey), `visible answer repeated an earlier speaker line after prompt "${prompt.userText}": ${result.visibleText}`);
    state.visibleLineKeys.add(lineKey);
  }
  state.previousVisibleKey = currentVisibleKey;
  if (currentVisibleKey) state.visibleKeys.add(currentVisibleKey);
  console.error([
    `\nUSER: ${prompt.userText}`,
    `state: ${result.classification} accepted=${result.acceptedByPack1} quality=${result.qualityAccepted} repaired=${result.repairedByRuntime} engine=${result.activeEngine} fallback=${result.fallbackCategory || '-'} qfail=${result.qualityFailureCategory || '-'} latency=${result.latencyMs}ms`,
    ...(result.messageEvents || []).map(item => `- ${item.speakerName || item.speakerId} [${item.role || 'message'}]: ${item.text || ''}`)
  ].join('\n'));
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
    latencyMs: result.latencyMs,
    messageCount: result.messageCount,
    ledgerCount: result.ledgerCount,
    visiblePreview: result.visibleText.slice(0, 360)
  });
  state.prior = {
    roomMood: result.roomMood,
    responseMode: result.responseMode,
    priorSpeaker: '',
    socialSignals: result.socialSignals
  };
  for (const event of result.messageEvents) {
    state.recentTurns.push({ speakerId: event.speakerId, role: event.role || 'message', text: event.text || '' });
  }
  groupState.set(group, state);
  if (GAUNTLET_TURN_DELAY_MS > 0) {
    console.error(`waiting ${GAUNTLET_TURN_DELAY_MS}ms to respect public rate limits`);
    await sleep(GAUNTLET_TURN_DELAY_MS);
  }
}

const summary = {
  backendUrl: BACKEND_URL,
  ...(frontend ? { frontend } : {}),
  sessionId: SESSION_ID,
  sessionIds: Object.fromEntries([...new Set(PROMPTS.map(item => item.sessionGroup || 'main'))].map(group => [group, sessionIdFor(group)])),
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
if (!ALLOW_LOCAL_FALLBACK && summary.counts.fallback > 0) {
  console.error('One or more turns reported unavailable runtime fallback.');
  process.exit(1);
}
if (REQUIRE_MOST_ACCEPTED && summary.counts.accepted < Math.ceil(PROMPTS.length / 2)) {
  console.error(`Only ${summary.counts.accepted}/${PROMPTS.length} turns were accepted by Pack 1.`);
  process.exit(1);
}
if (!ALLOW_LOCAL_FALLBACK && acceptedOrRepaired < PROMPTS.length) {
  console.error('One or more turns were neither accepted nor safely repaired.');
  process.exit(1);
}
