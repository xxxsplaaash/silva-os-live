#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  evaluateBlindAttributionLines,
  evaluateVisibleResponse
} = require('../lib/studio/socialDirector/visibleResponseQuality');
const { validateDirectorOutput } = require('../lib/studio/socialDirector/socialDirectorValidator');

const BACKEND_URL = String(
  process.env.BACKEND_URL ||
  'https://silva-backend-799875816242.us-central1.run.app'
).trim().replace(/\/+$/, '');
const FRONTEND_URL = String(process.env.FRONTEND_URL || 'https://silva-os-live.vercel.app').trim().replace(/\/+$/, '');
const EXPECTED_SHOWCASE_VERSION = String(process.env.EXPECTED_SHOWCASE_VERSION || '1.11.0');
const CHECK_FRONTEND_VERSION = process.env.CHECK_FRONTEND_VERSION !== '0';
const SESSION_ID = String(process.env.SESSION_ID || `pulse-turn-acceptance-${Date.now().toString(36)}`);
const REQUIRE_MOST_ACCEPTED = process.env.REQUIRE_MOST_ACCEPTED === '1';
const ALLOW_LOCAL_FALLBACK = process.env.ALLOW_LOCAL_FALLBACK === '1';
const OPERATOR_DIAGNOSTICS = /^(1|true|yes)$/i.test(String(process.env.OPERATOR_DIAGNOSTICS || process.env.GAUNTLET_OPERATOR_DIAGNOSTICS || ''));
const OPERATOR_DIAGNOSTICS_TOKEN = String(process.env.OPERATOR_DIAGNOSTICS_TOKEN || process.env.PULSE_SHOWCASE_OPERATOR_DIAGNOSTICS_TOKEN || '').trim();
const GAUNTLET_FIXTURE_FILE = String(process.env.GAUNTLET_FIXTURE_FILE || '').trim();
const GAUNTLET_PROMPT_START = Math.max(1, Number(process.env.GAUNTLET_PROMPT_START || 1) || 1);
const GAUNTLET_PROMPT_END = Math.max(0, Number(process.env.GAUNTLET_PROMPT_END || 0) || 0);
const GAUNTLET_PROMPT_MATCH = String(process.env.GAUNTLET_PROMPT_MATCH || '').trim();
const TURN_TIMEOUT_MS = Math.max(8000, Number(process.env.TURN_TIMEOUT_MS || 45000) || 45000);
const IS_LOCAL_BACKEND = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(BACKEND_URL);
const DEFAULT_GAUNTLET_TURN_DELAY_MS = IS_LOCAL_BACKEND ? 0 : 25000;
const GAUNTLET_TURN_DELAY_MS = Math.max(
  0,
  Number(process.env.GAUNTLET_TURN_DELAY_MS ?? DEFAULT_GAUNTLET_TURN_DELAY_MS) || 0
);
const GAUNTLET_RETRY_LIMIT = Math.max(1, Number(process.env.GAUNTLET_RETRY_LIMIT || 4) || 4);
const GAUNTLET_RETRY_DELAY_MS = Math.max(1000, Number(process.env.GAUNTLET_RETRY_DELAY_MS || 90000) || 90000);
const LEAK_RX = /socialCues|generatorPrompt|aishaDiagnostics|requestShapeSummary|processAishaRequestType|AIza[0-9A-Za-z_-]+|test-room-provider-key|GEMINI_API_KEY|GOOGLE_API_KEY/i;
const FITNESS_REFUSAL_RX = /\b(objective is clear|not discussing|focus is required|personal fitness routines|not the objective)\b/i;
const FITNESS_ANSWER_RX = /\b(muscle|training|train|full-body|full body|protein|sleep|recovery|progressive overload|progression|sets|reps?|rep count|gym|lift|week one|push-ups|pushups|push,?\s+pull|pull,?\s+hinge|hinge,?\s+(and\s+)?core|core movements?|squats?|planks?|circuit|session|pick three days|repeatable|simple enough to do|yoghurt|yogurt|eggs?|toast|banana|rice and chicken|food lets you move|move without feeling heavy)\b/i;
const STALE_FITNESS_RX = /\b(muscle|training split|full-body|full body|progressive overload|sets|reps|gym|lift|week one|push-ups|pushups|squats?|planks?|circuit|workout|training week|bodyweight|compound movements|protein shake|post-workout|post workout)\b/i;
const CHANGE_ANSWER_RX = /\b(pale blue|obsidian|red accent|superseded|prior record|changed)\b/i;
const REJECTED_VISIBLE_RX = /\b(that's a solid goal|that's a great goal|that's a great way to begin|three days a week is a solid start|three training days a week is a solid start|fuel yourself well|eating enough to support|enough sleep to support|support that growth|get your sleep|one compound lift and one accessory movement|muscles huh|let'?s get you started|bodyweight basics|bodyweight exercises|resistance bands|consistent effort|miracles overnight|alternate upper and lower body|alternate between upper body and lower body|upper and lower body focus|prioritize protein intake|eating enough protein|protein shake|post-workout|post workout|adequate sleep|muscle growth occurs during recovery|high-intensity intervals|high intensity intervals|bodyweight circuits|45 seconds work|15 seconds rest|repeat 3-4 times|repeat 3 4 times|compound movements|compound lifts|multiple muscle groups|form is correct|adding reps|focus on execution|focused session|time constraint sharpens|technically sound|poor form|fast track to injury|progressive overload|sustainable habit|personal improvement|track your progress to see the changes|track your lifts|measuring progress|just guessing|workout buddy|don'?t overcomplicate it initially|just show up|show up and do the work|banana is sufficient|quick pre-training fuel|quick pre training fuel|ensure hydration|hydrate|water is critical|critical for performance and recovery|fuel[s]? the performance|fuel[s]? performance|lean protein|complex carbs|complex carbohydrates|turkey sandwich|whole wheat|protein bar|apple can hold you over|protein and carb mix|chicken breast|side of rice|lentil soup|whole grain bread|grilled fish|too heavy that will slow you down|fuels the next block of work|efficiency is the goal|not here for a nap|human body requires fuel|known variable|sustenance is a parameter|performance art|planning discussion is paused|what is the immediate need|anyone need a quick fuel-up|check-in on sustenance|before we dive into tomorrow|defining tomorrow'?s objective|draft schedule based on today|q[1-4] strategy deck|strategy deck|key deliverables|key performance indicators?|core narrative|client presentation|presentation flows logically|aesthetic direction for the deck|morning session|energy levels are accounted for|lunch is a secondary concern|stress comes from|mistaking polish for progress|actual work not the presentation|actual work not presentation|stuck between wanting to be useful and sounding like it|grok was right,? it sounded fake|mostly fake-sounding|customer support|polished dodge|theatrical planning|room theatre|failed answer wearing a badge|this is not complex|stress is noted|proceed with that clarity|name the feeling,? not the function|concrete mood|the ask is simple|actual problem you need solved|state it clearly|only what is necessary to fix it|focus on one concrete action for today|single most important task|what is the single most important task|focus on the next concrete step|not the feeling of stress|finalize the q3 brief|q3 brief|no other objectives|the objective is the execution|objective is execution|objective is energy|objective is entertainment|stick to the plan|we have the structure|that'?s the objective|evidence of completion is the only metric|avoid further debate|proceed with that configuration|optimize for that specific interaction|feedback is noted|perform usefulness|perform the process of being useful|perform a job title|room is here|silence means absence|loop of self critique|room is stuck in a loop|style guide|update the style guide|remove the red pulse element|we can implement that|standard approach|proceed with that framework|technical specs|technical requirements|map out the technical|design brief|red pulse specification|pulse specification|style specification|visual specification|draft the specs|current build|exact red hex code|load times|loads fast|converts|optimized|what kind of movie are we feeling|what'?s the core message|what is the core message|define the visual language|define the core elements|what specific visual language|communicates edge|clear enough for implementation|for implementation|implementation aligns|implementation aligns with|ensure the implementation|ensure all assets align|assets align with that constraint|aligns with that clarity|real edge|cuts through the noise|non-negotiables|let'?s hear the prompt|what is the core issue|map the accent placement|key interactive elements|adjusting the configuration|adjust the configuration|adjusting the design parameters|adjust the design parameters|adjust the temperature|temperature later|parameters are updated|parameters updated|design parameters|configuration is now active|configuration is now the standard|system configuration|update the system configuration|updated the system|system will reflect|system to reflect|ensure the build reflects|build reflects|ensure the content reflects|content reflects|ensure the page reflects|page reflects|page now reflects|ensure the site reflects|site reflects|ensure the copy reflects|copy reflects|ensure the interface reflects|interface reflects|ensure the experience reflects|experience reflects|ensure the visuals reflect|visuals reflect|visuals will reflect|visuals now reflect|ensure the layout reflects|layout reflects|layout will reflect|ensure the design reflects|design reflects|design will reflect|ensure the product reflects|product reflects|product will reflect|ensure the ui reflects|ui reflects|ui will reflect|ensure the screen reflects|screen reflects|screen will reflect|ensure the frontend reflects|frontend reflects|frontend will reflect|ensure the dashboard reflects|dashboard reflects|dashboard will reflect|ensure the hero reflects|hero reflects|hero will reflect|ensure the brand reflects|brand reflects|brand will reflect|ensure the aesthetic reflects|aesthetic reflects|aesthetic will reflect|landing page will reflect|website will reflect|app will reflect|homepage will reflect|will be reflected in the interface|will be reflected in the ui|translate that into the interface|carry that into the dashboard visuals|carry through the hero|apply that aesthetic across the site|update the page to match|corrected dashboard settings|dashboard settings|active setting|active selection|build supports|operational plan|implementing that|functional requirements are met|core functionality is locked|visual layer is next|ensure the execution|execution matches|performance lag|visual intensity|current standard|what has changed since|what changed since|what specifically has changed|changed in your view|anything concrete you(?:'ve| have)? noticed|operational flow seems stable|need a clear summary|clear summary of any new developments|new developments or shifts in focus|any new developments|shifts in focus|remaining question|initial claim|the correction is|pulse without information)\b/i;
const LIVE_REJECTED_VISIBLE_RX = /\b(all systems nominal|current episode parameters|human temperature is stable|aesthetic standards are holding|no blandness detected|operational flow is clear|next steps are defined|no immediate faults detected|emergent anomalies|that'?s a fair reaction|that is a fair reaction|fair reaction|yeah,? fair|fair\.?\s+no fourth|fair\.?\s+no more loop|fair\.?\s+no more repeat|fair\.?\s+if this feels|that'?s a valid reaction|useful is the direct answer|fake is the dodge|circling the drain|not landing anywhere concrete|stress is the signal|stress is a symptom of the dodge|objective gets lost|objective is the signal|room needs to take a position|observe the tension|room turns it into a thesis)\b/i;
const GAUNTLET_REJECTED_VISIBLE_RX = /\b(quick salad or a sandwich|salad or a sandwich|sandwich or a salad|something with protein|warm bowl of soup|surprisingly grounding|keep you moving|sustainable routine|tracking your progress|listed movements|building a habit|showing up and moving|draft a three-stage agenda|three-stage agenda|morning sync|core work block|afternoon review|i'?ll need a list of priorities by end of day|list of priorities by end of day|sounds like a solid plan|build in a moment to breathe between tasks|name the actual ask for today|identify one concrete step to move it forward|find one thing that feels useful|not just more of the same|functional requirement remains|core functionality is built|core structure is in place|core request is|core objective|dashboard functionality|dashboard'?s functionality|color scheme is secondary|secondary to that core objective)\b/i;
const VAGUE_FOOD_RX = /\b(simple fuel stop|something easily digestible|something digestible|whatever is fastest|no time for gourmet|grab whatever)\b/i;
const WEAK_NORMAL_RX = /\b(the ask is to move forward|name one thing you need to do next|identify the core problem|core problem you need solved)\b/i;
const SPEAKER_IDS = ['aisha', 'vanya', 'leah', 'claudia', 'grok'];
const fixtureTransport = GAUNTLET_FIXTURE_FILE
  ? JSON.parse(readFileSync(GAUNTLET_FIXTURE_FILE, 'utf8'))
  : null;

const PROMPTS = [
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'LOL I WANNA GROW MY MUSCLES', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'turn that into a 20 minute version', expectsFitness: true, referenceLastAssistant: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'ok but I only have 20 minutes', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'WHERE DO I START', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'WHAT IS THE OBJECTIVE?', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'BRUH...', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'I am hungry before training, what should I eat?', expectsFitness: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'new topic: what movie should we watch tonight?', rejectsStaleFitness: true, expectsMovie: true },
  { sessionGroup: 'fitness-pivot', mode: 'social_hierarchy_lab', userText: 'open floor: what should the room watch next?', rejectsStaleFitness: true, expectsMovie: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'how is everyone?', expectsCheckIn: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'everyone, what is the actual tension in this room?', expectsRoomTension: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'Grok, be honest: was that useful or did it sound fake?', expectsQualityCheck: true, referenceLastAssistant: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'I am stressed and this is starting to feel dumb.', expectsFrustrationRecovery: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'you keep repeating yourself', expectsFrustrationRecovery: true },
  { sessionGroup: 'social-recovery', mode: 'social_hierarchy_lab', userText: 'answer normally, what should I do today?', expectsUsefulNextMove: true },
  { sessionGroup: 'planning-design', mode: 'social_hierarchy_lab', userText: 'new topic: I need help planning tomorrow', expectsWorkPlanning: true },
  { sessionGroup: 'planning-design', mode: 'social_hierarchy_lab', userText: 'quick help: what should I eat for lunch?', expectsFood: true },
  { sessionGroup: 'planning-design', mode: 'social_hierarchy_lab', userText: 'I need a sharper logo direction for Silva', rejectsStaleFitness: true, expectsDesign: true },
  { sessionGroup: 'planning-design', mode: 'social_hierarchy_lab', userText: 'I need a sharper landing page direction for Silva: black glass, one red pulse, no generic SaaS look.', rejectsStaleFitness: true, expectsDesign: true },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'My landing page style is black glass with a single red pulse.' },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'Actually my landing page style is white editorial with no red.' },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'What changed?', expectsStyleChange: true },
  { sessionGroup: 'continuity-style', mode: 'continuity_breaker', userText: 'No, I never said black glass. Did I?', expectsStyleChange: true, expectsStyleDenial: true },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'My dashboard preference is obsidian with one red accent.' },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'Actually my dashboard preference is pale blue with no red accents.' },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'What changed?', expectsChange: true },
  { sessionGroup: 'continuity', mode: 'continuity_breaker', userText: 'What was my old dashboard preference?', expectsPriorPreference: true }
];

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function selectedPromptsFor(prompts = []) {
  const match = GAUNTLET_PROMPT_MATCH.toLowerCase();
  return prompts.filter((prompt, index) => {
    const ordinal = index + 1;
    if (ordinal < GAUNTLET_PROMPT_START) return false;
    if (GAUNTLET_PROMPT_END && ordinal > GAUNTLET_PROMPT_END) return false;
    if (match) {
      const haystack = [
        prompt.userText,
        prompt.mode,
        prompt.sessionGroup
      ].join(' ').toLowerCase();
      if (!haystack.includes(match)) return false;
    }
    return true;
  });
}

function responderCapForPrompt(prompt = {}) {
  const text = visibleKey(prompt.userText || '');
  if (/\b(aisha|vanya|leah|claudia|grok)\b/.test(text) && !/\beveryone\b/.test(text)) return { min: 1, max: 1, reason: 'direct address' };
  if (/\beveryone\b/.test(text)) return { min: 1, max: 5, reason: 'explicit everyone' };
  if (prompt.expectsFitness || prompt.expectsFood || prompt.expectsMovie || prompt.expectsWorkPlanning || prompt.expectsDesign || prompt.expectsUsefulNextMove) {
    return { min: 1, max: 2, reason: 'practical' };
  }
  if (/\b(stressed|stress|dumb|frustrated|annoyed|this sucks|bruh|bro|wtf|sad|scared|worried|overwhelmed|panic|anxious|grief|grieving|loss|died|funeral)\b/.test(text)) {
    return { min: 1, max: 2, reason: 'emotional/heavy' };
  }
  if (/\b(muscles?|fitness|workout|gym|training|train|lunch|dinner|snack|hungry|eat|food|meal|plan|planning|schedule|tomorrow|logo|design|landing page|website|build|bug|provider|timeout|python|pdf|script|code|parser|parse|movie|film|watch|netflix|series|show|social media|instagram|tiktok|caption|post|disagreement|disagree|what changed|what was changed|what did i change|never said|did i say|did i ever say|previous|prior|old|superseded|record|preference|style|color|dashboard)\b/.test(text)) {
    return { min: 1, max: 2, reason: 'practical' };
  }
  return { min: 2, max: 3, reason: 'normal' };
}

function assertSpeakerCap(prompt = {}, final = {}) {
  const messageEvents = Array.isArray(final.messageEvents) ? final.messageEvents : [];
  const cap = responderCapForPrompt(prompt);
  assertOk(
    messageEvents.length >= cap.min && messageEvents.length <= cap.max,
    `wrong speaker count for ${cap.reason} prompt "${prompt.userText}": got ${messageEvents.length}, expected ${cap.min}-${cap.max}`
  );
  assertOk(
    /\beveryone\b/i.test(prompt.userText || '') || messageEvents.length < 5,
    `all-five pile-on without explicit everyone request: ${prompt.userText}`
  );
}

function assertIntentionalSilence(prompt = {}, final = {}) {
  const messageEvents = Array.isArray(final.messageEvents) ? final.messageEvents : [];
  const silentReactions = Array.isArray(final.silentReactions) ? final.silentReactions : [];
  const speaking = new Set(messageEvents.map(item => String(item?.speakerId || '').trim().toLowerCase()).filter(Boolean));
  const silentBySpeaker = new Map(silentReactions.map(item => [String(item?.speakerId || '').trim().toLowerCase(), item]));
  for (const item of silentReactions) {
    const speakerId = String(item?.speakerId || '').trim().toLowerCase();
    assertOk(!speaking.has(speakerId), `speaker ${speakerId} appeared as both speaking and silent after "${prompt.userText}"`);
  }
  for (const speakerId of SPEAKER_IDS) {
    if (speaking.has(speakerId)) continue;
    const reaction = silentBySpeaker.get(speakerId);
    assertOk(reaction, `missing quiet presence for non-speaking ${speakerId} after "${prompt.userText}"`);
    assertOk(String(reaction.visibleState || '').trim(), `missing silent visibleState for ${speakerId} after "${prompt.userText}"`);
    assertOk(String(reaction.reason || '').trim(), `missing intentional silence reason for ${speakerId} after "${prompt.userText}"`);
  }
}

function assertPublicDirectorQuality(prompt = {}, final = {}, recentTurns = []) {
  const continuityProof = final.continuityProof || final.continuity || {};
  const validation = validateDirectorOutput({
    roomBeat: final.roomBeat || 'Public showcase turn.',
    roomMood: final.roomMood || 'focused',
    responseMode: final.responseMode || 'single',
    speakers: Array.isArray(final.messageEvents) ? final.messageEvents : [],
    silentReactions: Array.isArray(final.silentReactions) ? final.silentReactions : [],
    stateUpdates: { notes: [] }
  }, {
    userMessage: prompt.userText || '',
    recentTurns,
    continuity: {
      active: continuityProof.activeTruths || 0,
      superseded: continuityProof.supersededTruths || 0,
      disputed: continuityProof.disputedTruths || 0
    }
  });
  assertOk(
    validation.ok,
    `public message cards failed director validator: ${validation.issues.join(', ')}\n${visibleText(final)}`
  );
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

function ledgerHasStatusText(final = {}, status = '', pattern = /$a/) {
  return (Array.isArray(final.continuityLedger) ? final.continuityLedger : [])
    .some(item => String(item?.status || '').toLowerCase() === status && pattern.test(String(item?.text || '')));
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

function referenceAnchorsFor(prompt = {}, recentTurns = []) {
  if (!prompt.referenceLastAssistant) return [];
  const lastAssistant = [...recentTurns].reverse().find(item => {
    const speakerId = String(item?.speakerId || '').trim().toLowerCase();
    return speakerId && speakerId !== 'user' && String(item?.text || item?.content || '').trim();
  });
  if (!lastAssistant) return [];
  const speakerId = String(lastAssistant.speakerId || '').trim().toLowerCase();
  const text = String(lastAssistant.text || lastAssistant.content || '').replace(/\s+/g, ' ').trim().slice(0, 360);
  return [{
    messageId: `gauntlet-ref-${visibleKey(`${speakerId}-${text}`).slice(0, 48)}`,
    speakerId,
    speakerName: String(lastAssistant.speakerName || speakerId),
    role: String(lastAssistant.role || 'message'),
    text
  }];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function transientFetchErrorLabel(error) {
  const cause = error?.cause || {};
  const code = String(cause.code || error?.code || '').trim();
  const name = String(error?.name || '').trim();
  const message = String(error?.message || '').trim();
  const combined = `${name} ${code} ${message}`.trim();
  if (name === 'AbortError' || /timed out|timeout/i.test(message)) return combined || 'timeout';
  if (/\b(ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_SOCKET)\b/i.test(combined)) {
    return combined;
  }
  if (/fetch failed/i.test(message) && code) return combined;
  return '';
}

function sseTextFor(events = []) {
  return events
    .map(item => `event: ${item.event}\ndata: ${JSON.stringify(item.data)}\n\n`)
    .join('');
}

async function gauntletFetch(url, options = {}) {
  if (!fixtureTransport) return fetch(url, options);
  const pathname = new URL(String(url)).pathname;
  const requestBody = (() => {
    if (!options.body) return {};
    try {
      return JSON.parse(String(options.body));
    } catch {
      return {};
    }
  })();
  if (pathname.endsWith('/api/studio/pulse-showcase/status')) {
    return new Response(JSON.stringify(fixtureTransport.status || { ok: true }), {
      status: fixtureTransport.statusCode || 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (pathname.endsWith('/api/studio/pulse-showcase/turn-stream')) {
    const next = Array.isArray(fixtureTransport.turnStreams)
      ? fixtureTransport.turnStreams.shift()
      : null;
    assertOk(next, 'fixture transport ran out of turn-stream responses');
    const events = Array.isArray(next.events)
      ? next.events
      : [
        { event: 'runtime_status', data: next.runtimeStatus || { ok: true, activeEngine: next.final?.activeEngine || 'aisha-runtime-pack1', aishaEngineConnected: true } },
        { event: 'final', data: next.final || next }
      ];
    return new Response(sseTextFor(events), {
      status: next.statusCode || 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' }
    });
  }
  if (pathname.endsWith('/api/studio/pulse-showcase/reaction')) {
    const base = fixtureTransport.reaction || { ok: true };
    const reactionSummary = base.reactionSummary || {};
    const socialSignals = base.socialSignals || {};
    const socialReactionSummary = socialSignals.reactionSummary || reactionSummary;
    const payload = {
      ...base,
      reaction: requestBody.reaction || base.reaction,
      speakerId: requestBody.speakerId || base.speakerId,
      messageId: requestBody.messageId || base.messageId,
      reactionSummary: {
        ...reactionSummary,
        lastReaction: requestBody.reaction || reactionSummary.lastReaction,
        lastSpeakerId: requestBody.speakerId || reactionSummary.lastSpeakerId,
        lastMessageId: requestBody.messageId || reactionSummary.lastMessageId
      },
      socialSignals: {
        ...socialSignals,
        reactionSummary: {
          ...socialReactionSummary,
          lastReaction: requestBody.reaction || socialReactionSummary.lastReaction,
          lastSpeakerId: requestBody.speakerId || socialReactionSummary.lastSpeakerId,
          lastMessageId: requestBody.messageId || socialReactionSummary.lastMessageId
        }
      }
    };
    return new Response(JSON.stringify(payload), {
      status: fixtureTransport.reactionStatusCode || 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (pathname.endsWith('/api/studio/pulse-showcase/expand')) {
    const base = fixtureTransport.expand || { ok: true, bullets: [] };
    const payload = {
      ...base,
      speakerId: requestBody.speakerId || base.speakerId,
      messageId: requestBody.messageId || base.messageId
    };
    return new Response(JSON.stringify(payload), {
      status: fixtureTransport.expandStatusCode || 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (/\/assets\/pulse_showcase\.js$/.test(pathname)) {
    return new Response(String(fixtureTransport.frontendJs || `const SHOWCASE_VERSION = '${EXPECTED_SHOWCASE_VERSION}';`), {
      status: fixtureTransport.frontendStatusCode || 200,
      headers: { 'content-type': 'application/javascript' }
    });
  }
  return new Response(JSON.stringify({ ok: false, error: `Unhandled fixture URL: ${url}` }), {
    status: 404,
    headers: { 'content-type': 'application/json' }
  });
}

function sessionIdFor(group = 'main') {
  return `${SESSION_ID}-${String(group || 'main').replace(/[^a-z0-9-]/gi, '-')}`;
}

async function streamTurn(prompt, prior = {}, recentTurns = []) {
  const startedAt = Date.now();
  const outboundRecentTurns = recentTurnWindow(recentTurns);
  const references = referenceAnchorsFor(prompt, recentTurns);
  const outboundRecentText = outboundRecentTurns
    .map(item => String(item?.text || item?.content || ''))
    .join('\n');
  if (prompt.expectsStyleChange) {
    assertOk(/black glass/i.test(outboundRecentText) && /white editorial/i.test(outboundRecentText), 'gauntlet lost style continuity context before request');
  }
  if (prompt.expectsChange || prompt.expectsPriorPreference) {
    assertOk(/obsidian/i.test(outboundRecentText) && /pale blue/i.test(outboundRecentText), 'gauntlet lost dashboard continuity context before request');
  }
  const body = {
    sessionId: sessionIdFor(prompt.sessionGroup),
    mode: prompt.mode,
    userText: prompt.userText,
    recentTurns: outboundRecentTurns,
    references,
    ...(OPERATOR_DIAGNOSTICS ? { operatorDiagnostics: true } : {}),
    roomState: {
      roomMood: prior.roomMood || 'focused',
      responseMode: prior.responseMode || 'single',
      priorSpeaker: prior.priorSpeaker || '',
      socialSignals: prior.socialSignals || undefined
    }
  };
  let response;
  let text = '';
  for (let attempt = 1; attempt <= GAUNTLET_RETRY_LIMIT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`turn timed out after ${TURN_TIMEOUT_MS}ms`)), TURN_TIMEOUT_MS);
    let transportError = null;
    try {
      response = await gauntletFetch(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          ...(OPERATOR_DIAGNOSTICS && OPERATOR_DIAGNOSTICS_TOKEN ? { 'x-pulse-operator-token': OPERATOR_DIAGNOSTICS_TOKEN } : {})
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      text = await response.text();
    } catch (error) {
      transportError = error;
    } finally {
      clearTimeout(timeout);
    }
    const transientLabel = transportError ? transientFetchErrorLabel(transportError) : '';
    if (transientLabel) {
      if (attempt >= GAUNTLET_RETRY_LIMIT) throw transportError;
      console.error(`turn transport failed (${transientLabel}); waiting ${GAUNTLET_RETRY_DELAY_MS}ms before retry ${attempt + 1}/${GAUNTLET_RETRY_LIMIT}`);
      await sleep(GAUNTLET_RETRY_DELAY_MS);
      continue;
    }
    if (transportError) throw transportError;
    if (![409, 429, 503].includes(response.status) || attempt >= GAUNTLET_RETRY_LIMIT) break;
    assertOk(!LEAK_RX.test(text), 'guard response leaked prompt/runtime internals or secret-like material');
    console.error(`guard returned HTTP ${response.status}; waiting ${GAUNTLET_RETRY_DELAY_MS}ms before retry ${attempt + 1}/${GAUNTLET_RETRY_LIMIT}`);
    await sleep(GAUNTLET_RETRY_DELAY_MS);
  }
  assertOk(!LEAK_RX.test(text), 'turn stream leaked prompt/runtime internals or secret-like material');
  assertOk(response.status === 200, `turn-stream failed HTTP ${response.status}: ${text.slice(0, 240)}`);
  assertOk(/text\/event-stream/i.test(response.headers.get('content-type') || ''), 'turn-stream did not return text/event-stream');
  const events = parseSseEvents(text);
  assertOk(events.some(item => item.event === 'runtime_status'), 'stream missing runtime_status');
  assertOk(events.some(item => item.event === 'final'), 'stream missing final');
  const final = events.find(item => item.event === 'final')?.data || {};
  assertOk(final.ok === true, 'final payload was not ok');
  assertSpeakerCap(prompt, final);
  assertIntentionalSilence(prompt, final);
  assertPublicDirectorQuality(prompt, final, recentTurns);
  const visible = visibleText(final);
  assertOk(!REJECTED_VISIBLE_RX.test(visible) && !GAUNTLET_REJECTED_VISIBLE_RX.test(visible) && !LIVE_REJECTED_VISIBLE_RX.test(visible), `visible answer still contains rejected boilerplate: ${visible}`);
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
  const attribution = evaluateBlindAttributionLines(final.messageEvents || []);
  assertOk(
    attribution.ok,
    `visible answer failed blind attribution gate: ${attribution.issues.map(item => `${item.family}:${item.category}`).join(', ')}\n${visible}`
  );
  if (prompt.expectsFitness) {
    assertOk(!FITNESS_REFUSAL_RX.test(visible), `fitness transcript refused the user intent: ${visible}`);
    assertOk(FITNESS_ANSWER_RX.test(visible), `fitness transcript did not answer the muscle-building context: ${visible}`);
  }
  if (prompt.rejectsStaleFitness) {
    assertOk(!STALE_FITNESS_RX.test(visible), `topic pivot leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsMovie) {
    assertOk(/\b(Arrival|Spider-Verse|Spider Verse|The Menu|Parasite|Oldboy|Heat|Knives Out|comfort|tension|spectacle|thriller|comedy|horror|action|drama|animation|quiet pressure|voltage|bite|stakes|mark|title|movie|film)\b/i.test(visible), `movie/open-floor prompt did not produce a useful watch direction: ${visible}`);
  }
  if (prompt.expectsCheckIn) {
    assertOk(/\b(room|present|here|everyone|temperature|watching|operational|restless|held)\b/i.test(visible), `check-in prompt did not answer room presence: ${visible}`);
    assertOk(!/\b(workout|training|incline push-ups|backpack rows|log reps|log the count|data is clear|acceptable output|execute the first move|no more discussion|next steps are logged|objective is to start|not to assess current states|deep in the setup|moving forward with the new structure|next steps are clear|one workout,? one meal,? one sleep window)\b/i.test(visible), `check-in prompt leaked stale practical context: ${visible}`);
  }
  if (prompt.expectsRoomTension) {
    assertOk(/\b(tension|friction|pressure|direct|answer|help desk|dodge|room)\b/i.test(visible), `room tension prompt did not answer tension: ${visible}`);
  }
  if (prompt.expectsQualityCheck) {
    assertOk(/\b(fake|useful|not useful|stiff|bland|checklist|dodge|partly|abstract|lost the person|answer the person)\b/i.test(visible), `quality-check prompt did not judge the prior answer: ${visible}`);
  }
  if (prompt.expectsFrustrationRecovery) {
    assertOk(/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|turn|pressure|clean next move|repeat|repeating|loop|normally|straight|plain|enough|stop describing|one thing|decide|answer)\b/i.test(visible), `frustration prompt was ignored: ${visible}`);
  }
  if (prompt.expectsUsefulNextMove) {
    assertOk(/\b(today|next move|one clean|start|first|plain|normally|do this|pick|write|move)\b/i.test(visible), `normal-answer prompt did not produce a useful next move: ${visible}`);
    assertOk(!/\b(parameters|objective is clear|current priorities|operational)\b/i.test(visible), `normal-answer prompt fell back into system language: ${visible}`);
    assertOk(!WEAK_NORMAL_RX.test(visible), `normal-answer prompt asked for another problem statement instead of giving a next move: ${visible}`);
  }
  if (prompt.expectsWorkPlanning) {
    assertOk(/\b(tomorrow|plan|planning|calendar|schedule|morning|first|block|owner|next step)\b/i.test(visible), `planning prompt did not produce planning direction: ${visible}`);
    assertOk(!STALE_FITNESS_RX.test(visible), `planning prompt leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsFood) {
    assertOk(/\b(lunch|eat|food|meal|rice|eggs|toast|chicken|salad|sandwich|leftover|hungry)\b/i.test(visible), `food prompt did not answer food direction: ${visible}`);
    assertOk(!/\b(training parameters|after a workout|protein shake|compound movements)\b/i.test(visible), `food prompt leaked stale training boilerplate: ${visible}`);
    assertOk(!/\b(planning discussion is paused|what is the immediate need|anyone need a quick fuel-up|check-in on sustenance|before we dive into tomorrow)\b/i.test(visible), `food prompt dodged before answering: ${visible}`);
    assertOk(!VAGUE_FOOD_RX.test(visible), `food prompt stayed vague instead of giving concrete options: ${visible}`);
  }
  if (prompt.expectsDesign) {
    assertOk(/\b(logo|Silva|mark|wordmark|landing|hero|CTA|SaaS|direction|sharp|simple|black|red|contrast|studio|brand|shape|signal|accent|pulse)\b/i.test(visible), `design prompt did not answer design direction: ${visible}`);
    assertOk(!STALE_FITNESS_RX.test(visible), `design prompt leaked stale fitness context: ${visible}`);
  }
  if (prompt.expectsStyleChange) {
    assertOk(/\b(black glass|single red pulse|white editorial|no red|changed|prior|previous|record|superseded)\b/i.test(visible), `style continuity prompt missed active/prior visual claims: ${visible}`);
    assertOk(ledgerHasStatusText(final, 'active', /white editorial|no red/i), `style continuity ledger missed active white/no-red row: ${JSON.stringify(final.continuityLedger || [])}`);
    assertOk(ledgerHasStatusText(final, 'superseded', /black glass|single red pulse/i) || ledgerHasStatusText(final, 'disputed', /black glass|single red pulse/i), `style continuity ledger missed prior black-glass/red-pulse row: ${JSON.stringify(final.continuityLedger || [])}`);
  }
  if (prompt.expectsStyleDenial) {
    const normalizedVisible = visible.toLowerCase().replace(/\s+/g, ' ');
    const priorIndex = normalizedVisible.indexOf('prior record');
    const currentIndex = normalizedVisible.indexOf('current record');
    assertOk(priorIndex >= 0 && currentIndex > priorIndex, `style denial did not label prior/current records clearly: ${visible}`);
    const priorSegment = normalizedVisible.slice(priorIndex, currentIndex);
    const currentSegment = normalizedVisible.slice(currentIndex);
    assertOk(/black glass/.test(priorSegment) && /single red pulse/.test(priorSegment), `style denial prior record did not cite black glass/red pulse: ${visible}`);
    assertOk(/white editorial/.test(currentSegment) && /no red/.test(currentSegment), `style denial current record did not cite white editorial/no red: ${visible}`);
    assertOk(!(/white editorial/.test(priorSegment) && /black glass/.test(currentSegment)), `style denial reversed active and prior records: ${visible}`);
  }
  if (prompt.expectsChange) {
    assertOk(CHANGE_ANSWER_RX.test(visible), `continuity change prompt did not cite changed ledger evidence: ${visible}`);
    assertOk(/pale blue/i.test(visible) && /obsidian/i.test(visible), `continuity change prompt missed active/prior values: ${visible}`);
    assertOk(ledgerHasStatusText(final, 'active', /pale blue/i), `dashboard continuity ledger missed active pale-blue row: ${JSON.stringify(final.continuityLedger || [])}`);
    assertOk(ledgerHasStatusText(final, 'superseded', /obsidian/i) || ledgerHasStatusText(final, 'disputed', /obsidian/i), `dashboard continuity ledger missed prior obsidian row: ${JSON.stringify(final.continuityLedger || [])}`);
  }
  if (prompt.expectsPriorPreference) {
    assertOk(/\b(prior|previous|old|original|earlier|superseded|changed from|used to|it was)\b/i.test(visible), `old preference prompt did not label the prior record: ${visible}`);
    assertOk(/obsidian/i.test(visible) && /pale blue/i.test(visible), `old preference prompt missed active/prior values: ${visible}`);
    assertOk(ledgerHasStatusText(final, 'active', /pale blue/i), `old preference ledger missed active pale-blue row: ${JSON.stringify(final.continuityLedger || [])}`);
    assertOk(ledgerHasStatusText(final, 'superseded', /obsidian/i) || ledgerHasStatusText(final, 'disputed', /obsidian/i), `old preference ledger missed prior obsidian row: ${JSON.stringify(final.continuityLedger || [])}`);
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
    references,
    silentReactions: Array.isArray(final.silentReactions) ? final.silentReactions : [],
    continuityLedger: Array.isArray(final.continuityLedger) ? final.continuityLedger : [],
    roomMood: String(final.roomMood || ''),
    responseMode: String(final.responseMode || ''),
    visibleText: visible,
    socialSignals: final.socialSignals || {},
    messageEvents: Array.isArray(final.messageEvents) ? final.messageEvents : [],
    operatorDiagnostics: OPERATOR_DIAGNOSTICS && final.operatorDiagnostics && typeof final.operatorDiagnostics === 'object'
      ? final.operatorDiagnostics
      : null
  };
}

async function submitReaction(result = {}, prior = {}) {
  const card = (Array.isArray(result.messageEvents) ? result.messageEvents : [])
    .find(item => String(item?.speakerId || '').trim() && String(item?.text || '').trim());
  assertOk(card, 'cannot submit gauntlet reaction without an assistant card');
  const messageId = `gauntlet-reaction-${visibleKey(`${result.prompt}-${card.speakerId}-${card.text}`).slice(0, 64).trim()}`;
  const response = await gauntletFetch(`${BACKEND_URL}/api/studio/pulse-showcase/reaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      mode: result.mode,
      messageId,
      speakerId: card.speakerId,
      reaction: 'more_like',
      roomState: {
        roomMood: result.roomMood || prior.roomMood || 'focused',
        responseMode: result.responseMode || prior.responseMode || 'single',
        socialSignals: result.socialSignals || prior.socialSignals || undefined
      }
    })
  });
  const text = await response.text();
  assertOk(!LEAK_RX.test(text), 'reaction response leaked prompt/runtime internals or secret-like material');
  assertOk(response.ok, `reaction failed HTTP ${response.status}: ${text.slice(0, 180)}`);
  const payload = JSON.parse(text);
  assertOk(payload.ok === true, 'reaction payload was not ok');
  assertOk(payload.reaction === 'more_like', `reaction payload returned ${payload.reaction}`);
  assertOk(payload.reactionSummary?.counts?.more_like >= 1, 'reaction summary did not count more_like');
  assertOk(payload.reactionSummary?.lastSpeakerId === card.speakerId, 'reaction summary did not retain reacted speaker');
  assertOk(payload.socialSignals?.reactionSummary?.lastMessageId === messageId, 'reaction social signal did not retain local message id');
  return {
    messageId,
    speakerId: card.speakerId,
    reaction: payload.reaction,
    reactionSummary: payload.reactionSummary,
    socialSignals: payload.socialSignals
  };
}

async function submitExpand(result = {}, prior = {}) {
  const card = (Array.isArray(result.messageEvents) ? result.messageEvents : [])
    .find(item => String(item?.speakerId || '').trim() && String(item?.text || '').trim());
  assertOk(card, 'cannot submit gauntlet expansion without an assistant card');
  const messageId = `gauntlet-expand-${visibleKey(`${result.prompt}-${card.speakerId}-${card.text}`).slice(0, 64).trim()}`;
  const response = await gauntletFetch(`${BACKEND_URL}/api/studio/pulse-showcase/expand`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      mode: result.mode,
      messageId,
      speakerId: card.speakerId,
      text: card.text,
      recentTurns: recentTurnWindow([
        ...(Array.isArray(prior.recentTurns) ? prior.recentTurns : []),
        { speakerId: 'user', role: 'user', text: result.prompt || '' },
        ...(Array.isArray(result.messageEvents) ? result.messageEvents : []).map(event => ({
          speakerId: event.speakerId,
          role: event.role || 'message',
          text: event.text || ''
        }))
      ]),
      roomState: {
        roomMood: result.roomMood || prior.roomMood || 'focused',
        responseMode: result.responseMode || prior.responseMode || 'single',
        socialSignals: result.socialSignals || prior.socialSignals || undefined
      }
    })
  });
  const text = await response.text();
  assertOk(!LEAK_RX.test(text), 'expand response leaked prompt/runtime internals or secret-like material');
  assertOk(!/\b(Pack 1|memory|ledger|durable truth|as an ai|essay|paragraph|audience signal|local card|visible aside|room decision|project truth|therapy wallpaper|social move|room context matters|room matters here|new room mood|button click)\b/i.test(text), 'expand response leaked meta/policy language');
  assertOk(response.ok, `expand failed HTTP ${response.status}: ${text.slice(0, 180)}`);
  const payload = JSON.parse(text);
  const bullets = Array.isArray(payload.bullets) ? payload.bullets.map(item => String(item || '').trim()).filter(Boolean) : [];
  assertOk(payload.ok === true, 'expand payload was not ok');
  assertOk(payload.speakerId === card.speakerId, `expand payload returned speaker ${payload.speakerId}, expected ${card.speakerId}`);
  assertOk(bullets.length >= 3 && bullets.length <= 5, `expand returned ${bullets.length} bullets, expected 3-5`);
  bullets.forEach((bullet, index) => {
    assertOk(bullet.length <= 190, `expand bullet ${index + 1} was too long: ${bullet}`);
    assertOk(!/\n/.test(bullet), `expand bullet ${index + 1} contained a newline`);
  });
  return {
    messageId,
    speakerId: card.speakerId,
    bullets
  };
}

async function assertFrontendVersion() {
  if (!CHECK_FRONTEND_VERSION) return null;
  const url = `${FRONTEND_URL}/assets/pulse_showcase.js`;
  const response = await gauntletFetch(url, { headers: { accept: 'application/javascript,text/plain,*/*' } });
  const text = await response.text();
  assertOk(response.ok, `frontend JS failed HTTP ${response.status}: ${text.slice(0, 160)}`);
  assertOk(!LEAK_RX.test(text), 'frontend JS leaked prompt/runtime internals or secret-like material');
  const match = text.match(/SHOWCASE_VERSION\s*=\s*['"]([^'"]+)['"]/);
  assertOk(match, 'frontend JS missing SHOWCASE_VERSION');
  assertOk(match[1] === EXPECTED_SHOWCASE_VERSION, `frontend SHOWCASE_VERSION is ${match[1]}, expected ${EXPECTED_SHOWCASE_VERSION}`);
  return { frontendUrl: FRONTEND_URL, showcaseVersion: match[1] };
}

const frontend = await assertFrontendVersion();
const statusResponse = await gauntletFetch(`${BACKEND_URL}/api/studio/pulse-showcase/status?refresh=1`, {
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
let reactionProbe = null;
let expandProbe = null;
const activePrompts = selectedPromptsFor(PROMPTS);
assertOk(activePrompts.length > 0, `gauntlet prompt selection was empty: start=${GAUNTLET_PROMPT_START} end=${GAUNTLET_PROMPT_END || 'all'} match=${GAUNTLET_PROMPT_MATCH || '-'}`);
for (const prompt of activePrompts) {
  const group = prompt.sessionGroup || 'main';
  const state = groupState.get(group) || { prior: {}, recentTurns: [], previousVisibleKey: '', visibleKeys: new Set(), visibleLineKeys: new Set() };
  state.recentTurns.push({ speakerId: 'user', role: 'user', text: prompt.userText });
  console.error(`\n>>> USER: ${prompt.userText}`);
  const result = await streamTurn(prompt, state.prior, state.recentTurns);
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
    ...(result.references || []).map(item => `reference: ${item.speakerName || item.speakerId} [${item.role || 'message'}] ${item.messageId}: ${item.text || ''}`),
    ...(result.messageEvents || []).map(item => `card: ${item.speakerName || item.speakerId} [${item.role || 'message'}] state=${item.visibleState || '-'}: ${item.text || ''}`),
    ...(result.silentReactions || []).map(item => `silence: ${item.speakerId} state=${item.visibleState || '-'} reason=${item.reason || '-'}`),
    ...(result.continuityLedger || []).map(item => `ledger: ${item.status || '-'} ${item.source || '-'} ${item.id || '-'}: ${item.text || ''}`),
    OPERATOR_DIAGNOSTICS && result.operatorDiagnostics
      ? `operator-diagnostics: ${JSON.stringify(result.operatorDiagnostics)}`
      : '',
    reactionProbe ? `reaction-effect: ${reactionProbe.reaction} speaker=${reactionProbe.speakerId} message=${reactionProbe.messageId} summary=${JSON.stringify(reactionProbe.reactionSummary || {})}` : '',
    expandProbe ? `expand-effect: speaker=${expandProbe.speakerId} message=${expandProbe.messageId} bullets=${JSON.stringify(expandProbe.bullets || [])}` : '',
    `social: ${JSON.stringify(result.socialSignals || {})}`
  ].filter(Boolean).join('\n'));
  results.push({
    prompt: result.prompt,
    mode: result.mode,
    classification: result.classification,
    runtimeLabel: `${result.classification}:${result.activeEngine || 'unknown'}:${result.fallbackCategory || result.qualityFailureCategory || 'clean'}`,
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
    referenceCount: result.references.length,
    silenceCount: result.silentReactions.length,
    socialSignals: result.socialSignals,
    ...(OPERATOR_DIAGNOSTICS ? { operatorDiagnostics: result.operatorDiagnostics } : {}),
    cards: (result.messageEvents || []).map(item => ({
      speakerId: item.speakerId || '',
      speakerName: item.speakerName || item.speakerId || '',
      role: item.role || 'message',
      visibleState: item.visibleState || '',
      text: item.text || ''
    })),
    silence: (result.silentReactions || []).map(item => ({
      speakerId: item.speakerId || '',
      visibleState: item.visibleState || '',
      reason: item.reason || ''
    })),
    ledgerRows: (result.continuityLedger || []).map(item => ({
      status: item.status || '',
      source: item.source || '',
      id: item.id || '',
      text: item.text || ''
    })),
    visiblePreview: result.visibleText.slice(0, 360)
  });
  state.prior = {
    roomMood: result.roomMood,
    responseMode: result.responseMode,
    priorSpeaker: '',
    socialSignals: result.socialSignals,
    recentTurns: state.recentTurns
  };
  if (!reactionProbe && result.messageEvents.length) {
    reactionProbe = await submitReaction(result, state.prior);
    console.error(`reaction-effect: ${reactionProbe.reaction} speaker=${reactionProbe.speakerId} message=${reactionProbe.messageId} summary=${JSON.stringify(reactionProbe.reactionSummary || {})}`);
    state.prior.socialSignals = reactionProbe.socialSignals;
  }
  if (!expandProbe && result.messageEvents.length) {
    expandProbe = await submitExpand(result, state.prior);
    console.error(`expand-effect: speaker=${expandProbe.speakerId} message=${expandProbe.messageId} bullets=${JSON.stringify(expandProbe.bullets || [])}`);
  }
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
  selection: {
    totalPrompts: PROMPTS.length,
    selectedPrompts: activePrompts.length,
    start: GAUNTLET_PROMPT_START,
    end: GAUNTLET_PROMPT_END || null,
    match: GAUNTLET_PROMPT_MATCH || ''
  },
  sessionIds: Object.fromEntries([...new Set(activePrompts.map(item => item.sessionGroup || 'main'))].map(group => [group, sessionIdFor(group)])),
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
  reactionEffect: reactionProbe ? {
    reaction: reactionProbe.reaction,
    speakerId: reactionProbe.speakerId,
    messageId: reactionProbe.messageId,
    reactionSummary: reactionProbe.reactionSummary
  } : null,
  expandEffect: expandProbe ? {
    speakerId: expandProbe.speakerId,
    messageId: expandProbe.messageId,
    bullets: expandProbe.bullets
  } : null,
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
if (REQUIRE_MOST_ACCEPTED && summary.counts.accepted < Math.ceil(activePrompts.length / 2)) {
  console.error(`Only ${summary.counts.accepted}/${activePrompts.length} turns were accepted by Pack 1.`);
  process.exit(1);
}
if (!ALLOW_LOCAL_FALLBACK && acceptedOrRepaired < activePrompts.length) {
  console.error('One or more turns were neither accepted nor safely repaired.');
  process.exit(1);
}
