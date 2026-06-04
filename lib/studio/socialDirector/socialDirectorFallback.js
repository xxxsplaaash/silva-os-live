const {
  directAddressTarget,
  explicitEveryoneRequested,
  openFloorRequested
} = require('./socialDirectorTypes');

function speaker(speakerId, role, tone, text, visibleState = 'Watching') {
  return { speakerId, role, tone, text, visibleState };
}

function reaction(speakerId, visibleState) {
  return { speakerId, visibleState };
}

function recentText(body = {}) {
  return (Array.isArray(body.recentTurns) ? body.recentTurns : Array.isArray(body.history) ? body.history : [])
    .map(item => `${item?.speakerId || item?.role || ''}: ${item?.text || item?.content || ''}`)
    .join('\n');
}

function recentItems(body = {}) {
  return (Array.isArray(body.recentTurns) ? body.recentTurns : Array.isArray(body.history) ? body.history : []);
}

function recentAssistantText(body = {}) {
  return recentItems(body)
    .filter(item => !/^user$/i.test(String(item?.speakerId || item?.role || '')))
    .slice(-8)
    .map(item => String(item?.text || item?.content || ''))
    .join('\n');
}

function currentTopic(text = '') {
  if (/\b(what should (we|the room) watch next|watch next|what next for the room)\b/i.test(text)) return 'watch_next';
  if (/\b(movie|film|watch tonight|what should we watch|what should the room watch)\b/i.test(text)) return 'movie_watch';
  if (openFloorRequested(text, {})) return 'open_floor';
  if (/\b(actual tension|tension in this room|room tension)\b/i.test(text)) return 'room_tension';
  if (/\b(how is everyone|how are you all|how is the room|how are we|hows everyone|hows the team|everyone ok|everyone okay)\b/i.test(text)) return 'social_checkin';
  if (/\b(sound fake|sounded fake|was that useful|useful or fake)\b/i.test(text)) return 'quality_check';
  if (/\b(never said|did i say|did i ever say|what did i say before)\b/i.test(text)) return 'memory_challenge';
  if (/\b(what|which)\b.*\b(preference|style|color|dashboard|landing page|brand)\b.*\b(did i|i gave|give the room|recorded|active|current)\b/i.test(text)) return 'continuity_recall';
  if (/\b(what changed|what was changed|what did .*change|changed\?|difference|previous|superseded)\b/i.test(text)) return 'continuity_change';
  if (/\b(my\s+)?(dashboard|landing page|brand|style|preference|color).{0,80}\b(is|=)\b/i.test(text)) return 'continuity_claim';
  if (/\b(hungry|food|eat|lunch|dinner|snack|meal|nutrition)\b/i.test(text)) return 'food';
  if (/\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein)\b/i.test(text)) return 'fitness';
  if (/\b(content calendar|design client|campaign|logo|creative|landing page|homepage|website|web page|hero|saas|visual direction|brand direction|black glass|red pulse|plan|planning|schedule)\b/i.test(text)) return 'work';
  return '';
}

function normalizedPrompt(text = '') {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isTerseFollowup(text = '') {
  return /^(where do i start|what is the objective|bruh|bro|wtf|ok|okay|now what|what next|how|ok but i only have 20 minutes|i only have 20 minutes|only have 20 minutes)$/i.test(normalizedPrompt(text));
}

function hasFitnessContext(text = '', body = {}) {
  if (currentTopic(text) && currentTopic(text) !== 'fitness') return false;
  if (!isTerseFollowup(text) && currentTopic(text) !== 'fitness') return false;
  const joined = `${text}\n${recentText(body)}`;
  return /\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein|push-ups|pushups|squats?|split squats?|hinges?|planks?|rows|core|sessions?)\b/i.test(joined);
}

function isFrustratedRecovery(text = '', body = {}) {
  if (!isTerseFollowup(text)) return false;
  const joined = `${text}\n${recentText(body)}`;
  return /\b(bruh|bro|wtf|what is the objective|where do i start)\b/i.test(text)
    && /\b(objective is clear|not discussing|personal fitness|focus is required|muscle|muscles|fitness|workout|training|push-ups|pushups|squats?|split squats?|hinges?|planks?|rows|core|sessions?)\b/i.test(joined);
}

function recentFitnessRecoveryShape(body = {}) {
  const recent = recentAssistantText(body);
  if (/\b(one workout|one meal|one sleep window|closest safe versions|log reps|run out of excuses)\b/i.test(recent)) return 'third';
  if (/\b(no more loop|pick three training days|week one|boring enough to repeat)\b/i.test(recent)) return 'second';
  if (/\b(the objective is your actual ask: start building muscle|start with three full-body sessions a week|start at home this week|no heroic rebrand required|incline push-ups, backpack rows|split squats, hip hinges|twenty minutes is enough|three rounds: squat or hinge|recovered from rejected fitness refusal)\b/i.test(recent)) return 'first';
  return '';
}

function recentWatchRecommendationShape(body = {}) {
  const recent = recentAssistantText(body);
  if (/\b(Arrival|Spider-Verse|The Menu|quiet pressure|voltage|bite|constraint before the title)\b/i.test(recent)) return 'first';
  return '';
}

function safeTruthText(item = {}) {
  return String(item?.text || item?.canonicalText || item?.claimText || item?.normalizedValue || '').trim();
}

function cleanClaimText(value = '') {
  return String(value || '')
    .replace(/^\s*(actually|no,?\s*)\s+/i, '')
    .replace(/^\s*my\s+/i, '')
    .replace(/[.!?]\s*$/g, '')
    .trim();
}

function extractChangedPair(value = '') {
  const text = String(value || '').trim();
  if (!text) return null;
  const active = text.match(/\bchanged:\s*(.+?)\.\s*prior record:/i)?.[1] || '';
  const prior = text.match(/\bprior record:\s*(.+?)(?:\.|$)/i)?.[1] || '';
  if (!active || !prior) return null;
  return {
    active: cleanClaimText(active),
    prior: cleanClaimText(prior)
  };
}

function recapTextCannotBeTruth(value = '') {
  return /\b(so the room keeps both|point of the ledger|old version stays visible|quietly erased|tracking next steps|reading the room)\b/i.test(String(value || ''));
}

function cleanRecordClaim(value = '') {
  const summary = extractChangedPair(value);
  if (summary) return '';
  if (recapTextCannotBeTruth(value)) return '';
  const claim = cleanClaimText(value);
  if (!/\b(preference|style|color|dashboard|landing page|brand)\b/i.test(claim)) return '';
  if (!/\b(is|=)\b/i.test(claim)) return '';
  return claim;
}

function visibleSessionChangeEvidence(body = {}) {
  const items = recentItems(body);
  const userClaims = items
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text))
    .filter(text => /\b(is|=)\b/i.test(text))
    .map(cleanClaimText)
    .filter(Boolean);
  if (userClaims.length >= 2) {
    return {
      active: userClaims[userClaims.length - 1],
      prior: userClaims[userClaims.length - 2]
    };
  }
  const lines = items
    .map(item => String(item?.text || item?.content || ''))
    .filter(Boolean);
  const summaryLine = lines.slice().reverse().find(text => /\bchanged:\b/i.test(text) && /\bprior record:\b/i.test(text));
  if (summaryLine) {
    const pair = extractChangedPair(summaryLine);
    if (pair?.active && pair?.prior) return pair;
  }
  const seen = new Set();
  const claims = lines
    .filter(text => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text))
    .filter(text => /\b(is|=)\b/i.test(text))
    .map(cleanRecordClaim)
    .filter(Boolean)
    .filter(claim => {
      const key = claim.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (claims.length < 2) return { active: '', prior: '' };
  return {
    active: claims[claims.length - 1],
    prior: claims[claims.length - 2]
  };
}

function continuityEvidence(body = {}) {
  const summary = body.memorySummary && typeof body.memorySummary === 'object' ? body.memorySummary : {};
  const active = (Array.isArray(summary.activeTruths) ? summary.activeTruths : [])
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .slice(0, 3);
  const superseded = [
    ...(Array.isArray(summary.supersededTruths) ? summary.supersededTruths : []),
    ...active
      .filter(item => item.supersededPriorText)
      .map(item => ({ text: item.supersededPriorText, status: 'superseded' }))
  ]
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .slice(0, 3);
  return { active, superseded };
}

function continuityPair(body = {}) {
  const visibleSession = visibleSessionChangeEvidence(body);
  const evidence = continuityEvidence(body);
  if (visibleSession.active && visibleSession.prior) {
    return { active: visibleSession.active, prior: visibleSession.prior, fromLedger: false };
  }
  const candidateTexts = [
    visibleSession.active,
    visibleSession.prior,
    ...evidence.active.map(item => item.text),
    ...evidence.superseded.map(item => item.text),
    ...recentItems(body).map(item => String(item?.text || item?.content || ''))
  ].filter(Boolean);
  for (const text of candidateTexts) {
    const pair = extractChangedPair(text);
    if (pair?.active && pair?.prior) return { ...pair, fromLedger: evidence.active.length || evidence.superseded.length };
  }
  const active = cleanRecordClaim(evidence.active[0]?.text) || visibleSession.active || '';
  const prior = cleanRecordClaim(evidence.superseded[0]?.text) || visibleSession.prior || '';
  return {
    active,
    prior,
    fromLedger: Boolean(evidence.active.length || evidence.superseded.length)
  };
}

function continuityChangeFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_change') return null;
  const pair = continuityPair(body);
  const active = pair.active || '';
  const prior = pair.prior || '';
  if (active && prior) {
    const fromLedger = pair.fromLedger;
    return {
      roomBeat: fromLedger
        ? 'A.I.S.H.A anchors the recorded change instead of letting the room drift.'
        : 'A.I.S.H.A anchors the visible session change without inventing ledger facts.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Changed: ${active}. Prior record: ${prior}.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', 'So the room keeps both: the current preference and the superseded one. That is the point of the ledger.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: [fromLedger
        ? 'Continuity change summarized from Pack 1 memory evidence.'
        : 'Continuity change summarized from visible recent turns only.'] }
    };
  }
  if (active) {
    return {
      roomBeat: 'A.I.S.H.A checks the ledger and finds only the active record.',
      roomMood: 'focused',
      responseMode: 'single',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `I have the active record: ${active}. I do not have a superseded version attached to it yet.`, 'Anchoring')
      ],
      silentReactions: [reaction('claudia', 'Tracking next steps'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Continuity change requested; no superseded evidence available.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A refuses to invent a change the ledger does not show.',
    roomMood: 'quiet',
    responseMode: 'single',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', 'I do not have a recorded change to cite yet. Make the claim first, then I can anchor the difference.', 'Anchoring')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
    stateUpdates: { notes: ['Continuity change requested without ledger evidence.'] }
  };
}

function priorVisibleContinuityClaim(body = {}) {
  const claims = recentItems(body)
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(item => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(item))
    .filter(item => /\b(is|=)\b/i.test(item))
    .map(cleanClaimText)
    .filter(Boolean);
  return claims[claims.length - 1] || '';
}

function continuityClaimFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_claim') return null;
  const claim = cleanClaimText(text);
  const prior = priorVisibleContinuityClaim(body);
  const isUpdate = prior && prior.toLowerCase() !== claim.toLowerCase();
  if (isUpdate) {
    return {
      roomBeat: 'A.I.S.H.A treats the new claim as an update, not a quiet overwrite.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Updated: ${claim}. Prior record remains ${prior}.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', 'Two records now: current and prior. That is the minimum standard before anyone rewrites the room history.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Visible continuity claim updated; prior visible claim preserved without creating durable truth.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A acknowledges the claim and keeps the room from overwriting it casually.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', `${claim}. Noted.`, 'Anchoring'),
      speaker('claudia', 'side', 'dry practical', 'Good. If that changes, the old version stays visible instead of being quietly erased.', 'Tracking next steps')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
    stateUpdates: { notes: ['Visible continuity claim acknowledged; durable truth remains Pack 1 owned.'] }
  };
}

function memoryChallengeFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'memory_challenge') return null;
  const pair = continuityPair(body);
  const active = pair.active || '';
  const prior = pair.prior || '';
  const visible = `${active}\n${prior}\n${recentText(body)}`;
  const challenged = String(text || '').match(/\bsaid\s+(.+?)(?:[.?]|$)/i)?.[1] || '';
  const matched = challenged && new RegExp(challenged.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(visible);
  const pairHasContrast = active && prior && normalizedPrompt(active) !== normalizedPrompt(prior);
  const pairContainsChallenge = !challenged || new RegExp(challenged.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(`${active}\n${prior}`);
  if (pairHasContrast && pairContainsChallenge) {
    return {
      roomBeat: 'A.I.S.H.A checks the visible record instead of letting the contradiction slide.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Yes: prior record was ${prior}; current record is ${active}.`, 'Anchoring'),
        speaker('grok', 'side', 'dry diagnostic', 'That is exactly the kind of rewrite the ledger is supposed to catch.', 'Tracking')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Memory challenge answered from Pack 1 evidence or visible recent turns.'] }
    };
  }
  if (matched) {
    const cited = challenged || prior || active;
    return {
      roomBeat: 'A.I.S.H.A checks the visible record instead of letting the contradiction slide.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Yes. I can see "${cited}" in the recent room record.`, 'Anchoring'),
        speaker('grok', 'side', 'dry diagnostic', 'That is exactly the kind of rewrite the ledger is supposed to catch.', 'Tracking')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Memory challenge answered from Pack 1 evidence or visible recent turns.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A checks the visible record and does not invent a receipt.',
    roomMood: 'quiet',
    responseMode: 'single',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', 'I do not have that exact claim in the visible record I can cite from here.', 'Anchoring')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
    stateUpdates: { notes: ['Memory challenge lacked visible evidence.'] }
  };
}

function continuityRecallFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_recall') return null;
  const pair = continuityPair(body);
  const active = pair.active || '';
  const prior = pair.prior || '';
  if (active) {
    return {
      roomBeat: pair.fromLedger
        ? 'A.I.S.H.A recalls the active Pack 1 memory record without asking the user to restate it.'
        : 'A.I.S.H.A recalls the visible session record without inventing durable evidence.',
      roomMood: 'focused',
      responseMode: prior ? 'small_exchange' : 'single',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', prior
          ? `Active record: ${active}. Prior record: ${prior}.`
          : `Active record: ${active}.`, 'Anchoring'),
        ...(prior ? [speaker('claudia', 'side', 'dry practical', 'That is the useful part: current truth first, old truth still traceable.', 'Tracking next steps')] : [])
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: [pair.fromLedger
        ? 'Continuity recall answered from Pack 1 memory evidence.'
        : 'Continuity recall answered from visible recent turns only.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A checks continuity and refuses to invent a memory.',
    roomMood: 'quiet',
    responseMode: 'single',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', 'I do not have an active preference record to cite yet.', 'Anchoring')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
    stateUpdates: { notes: ['Continuity recall requested without Pack 1 or visible evidence.'] }
  };
}

function everyoneOnline() {
  return {
    roomBeat: 'The whole room comes forward briefly.',
    roomMood: 'playful',
    responseMode: 'open_floor',
    speakers: [
      speaker('aisha', 'primary', 'clean authority', 'Aisha here. The room is held.', 'Anchoring'),
      speaker('vanya', 'called_in', 'warm social read', 'Vanya here, obviously watching the temperature before anyone gets dramatic.', 'Reading the room'),
      speaker('leah', 'called_in', 'sharp playful', 'Leah here. Present, opinionated, and trying not to let boredom win.', 'Holding critique'),
      speaker('claudia', 'called_in', 'dry practical', 'Claudia here. If this becomes chaos, I am naming owners.', 'Tracking next steps'),
      speaker('grok', 'called_in', 'dry diagnostic', 'Grok here. Socially operational, against several instincts.', 'Tracking')
    ],
    silentReactions: [],
    stateUpdates: { notes: ['Explicit all-room social check-in.'] }
  };
}

function directFallback(target, message = '') {
  if (target === 'aisha') {
    return {
      roomBeat: 'Aisha takes the room cleanly.',
      roomMood: 'focused',
      responseMode: 'aisha_takeover',
      speakers: [
        speaker('aisha', 'primary', 'short authority', 'Enough drift. The room is here, the signal matters, and we move from the cleanest truth first.', 'Anchoring')
      ],
      silentReactions: [
        reaction('vanya', 'Reading the room'),
        reaction('leah', 'Watching'),
        reaction('claudia', 'Tracking next steps'),
        reaction('grok', 'Tracking')
      ],
      stateUpdates: { notes: ['Direct Aisha command.'] }
    };
  }
  if (target === 'vanya') {
    if (/\b(call|bring|pull)\b.*\b(someone|somebody|them|leah|claudia|grok)\b/i.test(message)) {
      return {
        roomBeat: 'Vanya hosts the room by inviting one sharper voice forward.',
        roomMood: 'playful',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'host with bite', 'Leah, come here a second. The room needs a little taste pressure, not another polite pause.', 'Reading the room'),
          speaker('leah', 'called_in', 'sharp social', 'I am here. If we are making the room breathe, we can start by not mistaking silence for emptiness.', 'Holding critique')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
        stateUpdates: { notes: ['Vanya called in one specialist voice.'] }
      };
    }
    return {
      roomBeat: 'Vanya reads the room instead of treating the prompt like a ticket.',
      roomMood: 'warm',
      responseMode: 'single',
      speakers: [
        speaker('vanya', 'primary', 'warm with bite', 'The vibe is restless but alive. You want the room to stop waiting for a task and start behaving like people with taste, nerves, and opinions.', 'Reading the room')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching'), reaction('claudia', 'Tracking'), reaction('grok', 'Watching')],
      stateUpdates: { notes: ['Direct Vanya social read.'] }
    };
  }
  if (target === 'leah') {
    return {
      roomBeat: 'Leah comes in socially, not as a work detector.',
      roomMood: 'sharp',
      responseMode: 'single',
      speakers: [
        speaker('leah', 'primary', 'sharp playful', /be honest/i.test(message)
          ? 'Honest? If it feels bland, it probably is. The room can survive that truth.'
          : 'Girl, I am here. I do not need a logo in front of me to know when the room is getting too polite.', 'Holding critique')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Direct Leah social line.'] }
    };
  }
  if (target === 'claudia') {
    return {
      roomBeat: 'Claudia gives the adult answer without becoming a checklist.',
      roomMood: 'focused',
      responseMode: 'single',
      speakers: [
        speaker('claudia', 'primary', 'dry practical', /mess/i.test(message)
          ? 'A little. Not fatal, but if we keep admiring the mess instead of choosing one move, it becomes a management style.'
          : 'The adult answer is: pick the next owned move, make it visible, and stop letting the room turn uncertainty into theater.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Direct Claudia social line.'] }
    };
  }
  if (/\b(sound fake|sounded fake|was that useful|useful or fake|be honest)\b/i.test(message)) {
    return {
      roomBeat: 'Grok names the quality failure instead of hiding behind structure.',
      roomMood: 'sharp',
      responseMode: 'small_exchange',
      speakers: [
        speaker('grok', 'primary', 'dry honest', 'Partly useful. Mostly fake-sounding. It answered the topic, then hid behind parameter language like a nervous spreadsheet.', 'Tracking failure'),
        speaker('vanya', 'side', 'warm correction', 'That is the correction: less doctrine, more room. Answer the person in front of us.', 'Reading the room')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Grok challenged generic room output quality.'] }
    };
  }
  return {
    roomBeat: 'Grok proves he can be socially present without an error log.',
    roomMood: 'playful',
    responseMode: 'single',
    speakers: [
      speaker('grok', 'primary', 'dry reluctant', /normal|hiding/i.test(message)
        ? 'Normal is an unstable target. But fine: I am here, I am listening, and I have reduced the sarcasm to survivable levels.'
        : 'I can speak without a stack trace. It feels inefficient, but I am adapting.', 'Tracking')
    ],
    silentReactions: [reaction('vanya', 'Reading'), reaction('claudia', 'Aligned')],
    stateUpdates: { notes: ['Direct Grok social line.'] }
  };
}

function socialFallbackFor(message = {}, body = {}) {
  const text = String(message || '');
  const target = directAddressTarget(text);
  if (target) return directFallback(target, text);

  const continuityFallback = continuityChangeFallback(text, body);
  if (continuityFallback) return continuityFallback;
  const continuityRecall = continuityRecallFallback(text, body);
  if (continuityRecall) return continuityRecall;
  const memoryChallenge = memoryChallengeFallback(text, body);
  if (memoryChallenge) return memoryChallenge;
  const continuityClaim = continuityClaimFallback(text, body);
  if (continuityClaim) return continuityClaim;

  if (currentTopic(text) === 'movie_watch' || currentTopic(text) === 'watch_next') {
    if (recentWatchRecommendationShape(body) === 'first') {
      return {
        roomBeat: 'The room continues the watch choice instead of replaying the same titles.',
        roomMood: 'playful',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'host with taste', 'Then narrow it: pressure means Heat, wonder means Everything Everywhere All at Once, comfort with teeth means Knives Out.', 'Reading the room'),
          speaker('leah', 'side', 'sharp taste', 'Pick the feeling first. The title is just the room admitting what mood it wants.', 'Holding critique'),
          speaker('grok', 'closer', 'dry diagnostic', 'If no one can choose after three clean options, the problem is not cinema.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
        stateUpdates: { notes: ['Watch recommendation continued without repeating prior options.'] }
      };
    }
    return {
      roomBeat: 'The room accepts a clean topic pivot and chooses a watch direction.',
      roomMood: 'playful',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'host with taste', 'Tonight I would choose Arrival for quiet pressure, Spider-Verse for voltage, or The Menu if you want bite.', 'Reading the room'),
        speaker('leah', 'side', 'sharp taste', 'One strong world, not wallpaper. Pick the one that matches the room temperature.', 'Holding critique'),
        speaker('grok', 'closer', 'dry diagnostic', 'Choose the constraint before the title. Otherwise recommendation becomes astrology with better lighting.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Topic pivot to watch recommendation; stale practical context dropped.'] }
    };
  }

  if (currentTopic(text) === 'room_tension') {
    return {
      roomBeat: 'The room names its actual social tension.',
      roomMood: 'sharp',
      responseMode: 'open_floor',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'The tension is simple: this room wants to be useful without shrinking into customer support.', 'Reading the room'),
        speaker('leah', 'side', 'sharp social', 'And some of us hide behind structure when we should take a position. That is where it starts feeling fake.', 'Holding critique'),
        speaker('grok', 'closer', 'dry diagnostic', 'The weak point is the polished dodge. Useful beats impressive here.', 'Tracking failure')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Room tension named as social-quality pressure.'] }
    };
  }

  if (explicitEveryoneRequested(text) || currentTopic(text) === 'social_checkin') return everyoneOnline();

  if (openFloorRequested(text, {})) {
    const isFailure = /provider|timeout|failed|error|system/i.test(text);
    const isCreative = /campaign|logo|bland|taste|creative|idea/i.test(text);
    const middleSpeaker = isFailure
      ? speaker('grok', 'side', 'dry diagnostic', 'If there is a failure pattern in the room, I want evidence before optimism starts decorating it.', 'Tracking failure')
      : (isCreative
        ? speaker('leah', 'side', 'sharp taste', 'If the campaign is missing something, my first suspicion is taste with the edges sanded off.', 'Holding critique')
        : speaker('leah', 'side', 'sharp social', 'Open floor can be a room, not a panel show. Radical concept.', 'Watching'));
    const finalSpeaker = isFailure
      ? speaker('claudia', 'side', 'operational', 'And if Grok names the fault, I want the owner and next step attached before we leave it floating.', 'Tracking next steps')
      : (isCreative
        ? speaker('claudia', 'side', 'dry practical', 'Then I want the constraint. Good direction still has to survive delivery.', 'Tracking next steps')
        : speaker('grok', 'side', 'dry social', 'I am present. This is not the same as volunteering for jazz hands.', 'Watching'));
    return {
      roomBeat: 'Open Floor becomes a bounded social exchange.',
      roomMood: isCreative ? 'sharp' : (isFailure ? 'focused' : 'playful'),
      responseMode: 'open_floor',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'Open floor, but not chaos. I am letting the room split the signal without turning this into five speeches.', 'Reading the room'),
        middleSpeaker,
        finalSpeaker
      ],
      silentReactions: [reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Explicit Open Floor sandbox beat.'] }
    };
  }

  if (isFrustratedRecovery(text, body)) {
    const recoveryShape = recentFitnessRecoveryShape(body);
    if (recoveryShape === 'third') {
      return {
        roomBeat: 'The room stops adding versions and makes the first action unavoidable.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm reset', 'Fair. No fourth version. Clear space and start the first set.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'First move: incline push-ups. Stop two reps before failure, then write the number down.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'If you are still arguing after that, the obstacle is not information.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Repeated fitness recovery closed with immediate first action.'] }
      };
    }
    if (recoveryShape === 'second') {
      return {
        roomBeat: 'The room stops cycling recovery language and lands the immediate move.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm reset', 'Yeah. Strip it down: one workout, one meal, one sleep window. That is today.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Do push, pull, legs, or the closest safe versions. Log reps. Leave two reps in reserve. Repeat.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'The room has now run out of excuses and poetry. Excellent conditions for starting.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Repeated fitness recovery avoided again; gave immediate action variant.'] }
      };
    }
    if (recoveryShape === 'first') {
      return {
        roomBeat: 'The room changes recovery shape instead of repeating the same correction.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm reset', 'Yeah, fair. No more loop: your next move is one simple week, not another speech about the objective.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Pick three training days, write the exercises down, and add one tiny progression each week.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'If the plan cannot survive week one, it was decoration. Start boring enough to repeat.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Repeated fitness recovery avoided; gave next-step variant.'] }
      };
    }
    return {
      roomBeat: 'The room corrects a bad refusal and returns to the actual user signal.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm reset', 'Fair. The room dropped the thread; your actual ask is how to start building muscle without a gym.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'This week: incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down; next week add one rep or slow the lowering.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'Sharp joint pain means stop or swap the move. If there is injury or a medical condition, bring in a real professional.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Recovered from rejected fitness refusal; answered beginner muscle-building ask.'] }
    };
  }

  if (/\b(20 minutes|twenty minutes|only have \d+\s*minutes|limited time)\b/i.test(text) && hasFitnessContext(text, body)) {
    return {
      roomBeat: 'The room compresses the fitness plan into a realistic short session.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm practical', 'Twenty minutes is enough if you stop negotiating with it. Warm up, move clean, leave while you still want to come back.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'Do three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off. Log one number so next week has a target.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'The constraint is useful. It removes theatrical planning.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Short-session fitness guidance; no durable memory fact created.'] }
    };
  }

  if (/\b(hungry|food|eat|eating|lunch|dinner|snack|meal|nutrition)\b/i.test(text)) {
    const trainingFood = /\b(train|training|workout|gym|lift|muscle|protein)\b/i.test(text);
    if (trainingFood) {
      return {
        roomBeat: 'The room answers the nutrition angle without dragging the old training script forward.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm practical', 'Eat for the session, not for drama. Small if training is close; bigger if you have time.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Under an hour: banana and yoghurt. Two hours out: eggs and toast, or rice and chicken; add water and keep it light enough to train.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'Protein helps later. Right now the variable is whether the food lets you move without feeling heavy.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Training-adjacent nutrition guidance; no durable memory fact created.'] }
      };
    }
    return {
      roomBeat: 'The room answers the food ask directly without turning it into banter.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm practical', 'Eat something boring enough to work and good enough that you do not resent it.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'Lunch: rice and chicken, eggs and toast, a solid sandwich, or leftovers with water. Choose the one you can actually make.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'If lunch requires a philosophy, you are probably hungry enough to stop optimizing.', 'Tracking')
      ],
      silentReactions: [reaction('leah', 'Holding critique'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Practical food prompt answered without stale prior-topic carryover.'] }
    };
  }

  if (hasFitnessContext(text, body)) {
    return {
      roomBeat: 'A practical fitness ask enters the room and gets grounded instead of refused.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'Start at home this week. Three short sessions; no heroic rebrand required.', 'Reading the room'),
        speaker('claudia', 'side', 'dry practical', 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down; next week add one rep or slow the lowering.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'Sharp joint pain means swap the move, not prove a point. Soreness is allowed; stupidity is optional.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Beginner muscle-building guidance; general fitness only.'] }
    };
  }

  if (/sad|waste of time|stressed|tired|hurt|lonely/i.test(text)) {
    return {
      roomBeat: 'The room warms around the human signal.',
      roomMood: 'warm',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm specific', 'Fair. If this feels dumb and stressful, the room needs to stop performing and give you one clean next move.', 'Protective'),
        speaker('aisha', 'side', 'quiet authority', 'Reset the pressure: name the actual ask, answer it directly, then keep only what helped.', 'Anchoring')
      ],
      silentReactions: [reaction('leah', 'Watching'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
      stateUpdates: { notes: ['Emotional social beat.'] }
    };
  }

  if (/\b(repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally)\b/i.test(text)) {
    const wantsToday = /\b(today|what should i do|what do i do)\b/i.test(text);
    return {
      roomBeat: 'The room stops defending the loop and gives a plain next move.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm reset', wantsToday
          ? 'Plain version: choose one thing for today, do the first visible step, then come back with what happened.'
          : 'Fair. No more repeat loop. The room answers the turn in front of it, then shuts up where it has nothing new.', 'Reading the room'),
        speaker('claudia', 'side', 'dry practical', wantsToday
          ? 'If the old topic was training, do one short session. If it was work, open the first file. Either way: one block, one result.'
          : 'The fix is not another explanation. Change the next response shape and make it useful.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', wantsToday
          ? 'Do the first block before reopening the debate. Evidence beats another round of room theatre.'
          : 'A repeated answer is a failed answer wearing a badge. Good. Now we can stop rewarding it.', 'Tracking failure')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Repetition complaint handled as a product-quality recovery turn.'] }
    };
  }

  if (/provider failed|timeout|failed again|error|keeps failing/i.test(text)) {
    return {
      roomBeat: 'Failure pattern pulls diagnostic and structure forward.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('grok', 'primary', 'dry diagnostic', 'Same timeout twice is no longer weather. It is a pattern with a bill attached.', 'Tracking failure'),
        speaker('claudia', 'side', 'operational', 'Then the next move is ownership: isolate the failing path, name the retry rule, and stop treating every timeout like a new mystery.', 'Tracking next steps')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('vanya', 'Reading')],
      stateUpdates: { notes: ['Technical failure social beat.'] }
    };
  }

  if (/\b(landing page|homepage|website|web page|hero|saas|black glass|red pulse|visual direction|brand direction)\b/i.test(text)) {
    return {
      roomBeat: 'Taste pressure enters as landing-page direction, not generic social banter.',
      roomMood: 'sharp',
      responseMode: 'small_exchange',
      speakers: [
        speaker('leah', 'primary', 'sharp taste', 'Black glass with one red pulse can work if the page stays severe: dark field, silver copy, one red signal, no decorative scatter.', 'Holding critique'),
        speaker('claudia', 'side', 'dry practical', 'Direction: make the hero quiet, the CTA obvious, and the red accent do one job. If it appears everywhere, it stops meaning anything.', 'Tracking next steps'),
        speaker('vanya', 'closer', 'social landing', 'That keeps it premium instead of generic SaaS. The room should feel intentional before it feels busy.', 'Reading')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Landing-page design prompt answered with concrete visual direction.'] }
    };
  }

  if (/logo|bland|taste|campaign|creative|weak idea/i.test(text)) {
    return {
      roomBeat: 'Taste pressure enters and lands as a concrete direction.',
      roomMood: 'sharp',
      responseMode: 'small_exchange',
      speakers: [
        speaker('leah', 'primary', 'sharp taste', 'Silva needs one severe mark, not a polite badge: black field, white wordmark, and a single red signal that feels placed, not sprinkled.', 'Holding critique'),
        speaker('claudia', 'side', 'dry practical', 'Direction: simplify the shape, tighten the spacing, and make the red accent earn one job: pulse, cut, or warning. Pick one.', 'Tracking next steps'),
        speaker('vanya', 'closer', 'social landing', 'That gives the logo a stance instead of a mood board. Sharp enough to recognize, restrained enough to trust.', 'Reading')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Creative/logo prompt answered with concrete brand direction.'] }
    };
  }

  if (/\b(content calendar|design client|plan tomorrow|planning tomorrow|help planning|campaign plan|schedule tomorrow|tomorrow)\b/i.test(text)) {
    return {
      roomBeat: 'The room accepts a planning pivot and drops stale prior-topic pressure.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('claudia', 'primary', 'dry practical', 'Tomorrow gets three blocks: first decision, main build, cleanup. Put the riskiest thing first before the day starts negotiating.', 'Tracking next steps'),
        speaker('vanya', 'side', 'warm host', 'And leave one human buffer. A plan with no air is just a future argument.', 'Reading the room'),
        speaker('grok', 'closer', 'dry diagnostic', 'If every block is priority one, the plan is lying. Rank the pain.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Planning prompt handled without stale prior-topic carryover.'] }
    };
  }

  if (/highest value|next move|next highest|what next/i.test(text)) {
    return {
      roomBeat: 'The room moves from chatter toward one valuable next step.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('claudia', 'primary', 'adult practical', 'The highest-value move is the one that proves the room works live, not the one that adds another layer.', 'Tracking next steps'),
        speaker('aisha', 'closer', 'clean authority', 'Verify the illusion, then fix only the seam that breaks it first.', 'Anchoring')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Next move social beat.'] }
    };
  }

  if (/quiet|talk|social hub|task router|like each other|annoyed|vibe/i.test(text)) {
    return {
      roomBeat: 'The room answers as a room, not a task router.',
      roomMood: 'playful',
      responseMode: openFloorRequested(text, body) ? 'open_floor' : 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'We are not quiet because we vanished. We are quiet because the room is learning when speech is worth spending.', 'Reading the room'),
        speaker('leah', 'side', 'sharp social', 'Also because some of us refuse to decorate silence with filler. Growth, honestly.', 'Watching'),
        speaker('grok', 'side', 'dry social', 'I support fewer words when the alternative is atmospheric nonsense.', 'Watching')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Aligned')],
      stateUpdates: { notes: ['Meta-social green room beat.'] }
    };
  }

  return {
    roomBeat: 'Vanya opens the green room and lets the others become visible.',
    roomMood: 'warm',
    responseMode: 'small_exchange',
    speakers: [
      speaker('vanya', 'primary', 'warm with bite', 'Hey. The room is here; nobody has to perform a job title just to be allowed to speak.', 'Reading the room'),
      speaker('leah', 'side', 'playful sharp', 'Thank God. I was getting bored of pretending silence means absence.', 'Watching')
    ],
    silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
    stateUpdates: { notes: ['Default social director beat.'] }
  };
}

module.exports = {
  socialFallbackFor
};
