const {
  directAddressTarget,
  explicitEveryoneRequested,
  openFloorRequested
} = require('./socialDirectorTypes');

function speaker(speakerId, role, tone, text, visibleState = 'Watching') {
  return { speakerId, role, tone, text, visibleState };
}

function silenceReasonFor(speakerId = '', visibleState = '') {
  const state = String(visibleState || '').toLowerCase();
  const bySpeaker = {
    aisha: 'holding authority until the room needs correction',
    vanya: 'listening for the human signal before entering',
    leah: 'saving the taste cut until it has a useful edge',
    claudia: 'tracking structure without turning the exchange into a project plan',
    grok: 'watching for the premise fault before interrupting'
  };
  if (/failure/.test(state)) return 'tracking the failure pattern before adding a diagnosis';
  if (/aligned/.test(state)) return 'staying aligned because another voice already carried the useful move';
  if (/critique/.test(state)) return 'holding critique until the room needs sharper pressure';
  if (/next steps/.test(state)) return bySpeaker.claudia;
  if (/reading/.test(state)) return bySpeaker.vanya;
  if (/anchoring/.test(state)) return bySpeaker.aisha;
  if (/tracking/.test(state)) return bySpeaker.grok;
  return bySpeaker[speakerId] || 'quiet because this turn only needs the selected voices';
}

function reaction(speakerId, visibleState, reason = '') {
  return {
    speakerId,
    visibleState,
    reason: String(reason || '').trim() || silenceReasonFor(speakerId, visibleState)
  };
}

function recentText(body = {}) {
  return (Array.isArray(body.recentTurns) ? body.recentTurns : Array.isArray(body.history) ? body.history : [])
    .map(item => `${item?.speakerId || item?.role || ''}: ${item?.text || item?.content || ''}`)
    .join('\n');
}

function referencedText(body = {}) {
  return (Array.isArray(body.references) ? body.references : Array.isArray(body.messageReferences) ? body.messageReferences : [])
    .map(item => `${item?.speakerName || item?.speakerId || ''}: ${item?.text || item?.content || ''}`)
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

function freshLine(body = {}, candidates = []) {
  const recent = normalizedPrompt(recentAssistantText(body));
  return candidates.find(candidate => !recent.includes(normalizedPrompt(candidate))) || candidates[0] || '';
}

function currentTopic(text = '') {
  if (/\b(what should (we|the room) watch next|watch next|what next for the room)\b/i.test(text)) return 'watch_next';
  if (/\b(movie|film|watch tonight|what should we watch|what should the room watch)\b/i.test(text)) return 'movie_watch';
  if (openFloorRequested(text, {})) return 'open_floor';
  if (/\b(actual tension|tension in this room|room tension)\b/i.test(text)) return 'room_tension';
  if (/\b(how is everyone|how are you all|how is the room|how are we|hows everyone|hows the team|everyone ok|everyone okay)\b/i.test(text)) return 'social_checkin';
  if (/\b(sound fake|sounded fake|was that useful|useful or fake)\b/i.test(text)) return 'quality_check';
  if (/\b(never said|did i say|did i ever say|what did i say before)\b/i.test(text)) return 'memory_challenge';
  if (/\b(what was my|what did i used to want|what did i use to want|what did i previously want|what did i earlier want)\b.*\b(old|original|earlier|previous|prior|used to)?\s*(preference|style|color|dashboard|landing page|brand)\b/i.test(text)) return 'continuity_prior_recall';
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

function isShortSessionFollowup(text = '') {
  const clean = normalizedPrompt(text);
  return /\b(20|twenty)\s+minutes?\b/.test(clean)
    && /\b(turn|make|convert|compress|that|this|it|version|short|shorter|only|limited)\b/.test(clean);
}

function isReferencedFollowup(text = '', body = {}) {
  if (!referencedText(body)) return false;
  return /\b(turn|make|convert|compress|expand|show|use|same|that|this|referenced|version)\b/i.test(text);
}

function hasFitnessContext(text = '', body = {}) {
  if (currentTopic(text) && currentTopic(text) !== 'fitness') return false;
  const joined = `${text}\n${referencedText(body)}\n${recentText(body)}`;
  if (isReferencedFollowup(text, body) && /\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein|push-ups|pushups|squats?|split squats?|hinges?|planks?|rows|core|sessions?)\b/i.test(referencedText(body))) return true;
  if (isShortSessionFollowup(text) && /\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein|push-ups|pushups|squats?|split squats?|hinges?|planks?|rows|core|sessions?)\b/i.test(joined)) return true;
  if (!isTerseFollowup(text) && currentTopic(text) !== 'fitness') return false;
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
  if (/\b(no more loop|pick three training days|week one|boring enough to repeat|room energy, not a task queue|calendar first: monday|three repeatable training days|tiny vanity, massive discipline|week can actually hold|identity speech required|mark one number|beat that number by one)\b/i.test(recent)) return 'second';
  if (/\b(the objective is your actual ask: start building muscle|start with three full-body sessions a week|start at home this week|no heroic rebrand required|incline push-ups, backpack rows|split squats, hip hinges|twenty minutes is enough|three rounds: squat or hinge|recovered from rejected fitness refusal)\b/i.test(recent)) return 'first';
  return '';
}

function recentShortSessionShape(body = {}) {
  const recent = recentAssistantText(body);
  if (/\b(twenty minutes is enough|twenty minutes of training|twenty minutes is a good target|20 minutes is a good target|focused session|rest periods short|three rounds: squat or hinge|do three rounds|two rounds of push, pull, hinge|push, pull, hinge, and core|warm up for three|log the lowest rep count|forty seconds on, twenty off|45 seconds on|15 seconds rest|repeat the circuit three times|one small circuit|clock honest|clock do the arguing)\b/i.test(recent)) return 'first';
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

function continuityClaimSubject(value = '') {
  const text = normalizedPrompt(value);
  const slotKinds = '(preference|style|color|direction|aesthetic)';
  const slotTargets = '(dashboard|landing page|homepage|website|brand|logo|style|color)';
  const userMatch = text.match(new RegExp(`\\bmy\\s+${slotTargets}\\s+${slotKinds}\\b`));
  if (userMatch) return `${userMatch[1]} ${userMatch[2]}`;
  const recordMatch = text.match(new RegExp(`\\b(?:user\\s+)?${slotTargets}\\s+${slotKinds}\\b`));
  if (recordMatch) return `${recordMatch[1]} ${recordMatch[2]}`;
  return '';
}

function continuitySubjectKind(...values) {
  const subject = values.map(value => continuityClaimSubject(value)).find(Boolean) || '';
  const text = normalizedPrompt(`${subject} ${values.filter(Boolean).join(' ')}`);
  if (/\bdashboard\b/.test(text)) return 'dashboard';
  if (/\blanding page|homepage|website|hero\b/.test(text)) return 'landing';
  if (/\bbrand|logo\b/.test(text)) return 'brand';
  return 'preference';
}

function continuityClaudiaLines(kind = 'preference', purpose = 'claim') {
  const lines = {
    claim: {
      landing: [
        'Landing page structure: one hero rule, one CTA check, comparison note only if it changes.',
        'Landing page structure: one page rule, one visible signal, comparison note only if it changes.'
      ],
      dashboard: [
        'Dashboard structure: one surface rule, one accent rule, comparison note only if it changes.',
        'Dashboard structure: one screen rule, one color rule, comparison note only if it changes.'
      ],
      brand: [
        'Brand structure: one mark rule, one contrast rule, comparison note only if it changes.',
        'Brand structure: one signal rule, one restraint rule, comparison note only if it changes.'
      ],
      preference: [
        'Preference structure: one current value, one comparison note if it changes.',
        'Preference structure: one active value, one comparison note if it changes.'
      ]
    },
    update: {
      landing: [
        'Landing page structure: current hero rule first; prior direction stays as contrast, not instruction.',
        'Landing page structure: current page rule leads; prior direction stays visible only as contrast.'
      ],
      dashboard: [
        'Dashboard structure: current surface rule first; prior accent rule stays visible only for comparison.',
        'Dashboard structure: current screen rule leads; prior value stays in the comparison column.'
      ],
      brand: [
        'Brand structure: current mark rule first; prior direction stays visible only for comparison.',
        'Brand structure: current signal rule leads; prior value stays in the comparison column.'
      ],
      preference: [
        'Preference structure: current value first; prior value stays visible only for comparison.',
        'Preference structure: current value leads; prior value stays in the comparison column.'
      ]
    },
    change: {
      landing: [
        'Change structure: prior hero direction, current hero direction, one rule going forward.',
        'Change structure: prior page rule, current page rule, one decision going forward.'
      ],
      dashboard: [
        'Change structure: prior dashboard value, current dashboard value, one rule going forward.',
        'Change structure: prior screen rule, current screen rule, one decision going forward.'
      ],
      brand: [
        'Change structure: prior brand signal, current brand signal, one rule going forward.',
        'Change structure: prior mark rule, current mark rule, one decision going forward.'
      ],
      preference: [
        'Change structure: prior value, current value, one rule going forward.',
        'Change structure: old value, current value, one decision going forward.'
      ]
    },
    prior: {
      landing: [
        'Archive structure: old landing-page direction first, current direction second; stop there.',
        'Archive structure: prior page style first, current page style second; stop there.'
      ],
      dashboard: [
        'Archive structure: old dashboard value first, current dashboard value second; stop there.',
        'Archive structure: prior dashboard rule first, current dashboard rule second; stop there.'
      ],
      brand: [
        'Archive structure: old brand signal first, current brand signal second; stop there.',
        'Archive structure: prior brand rule first, current brand rule second; stop there.'
      ],
      preference: [
        'Archive structure: old value first, current value second; stop there.',
        'Archive structure: prior value first, current value second; stop there.'
      ]
    }
  };
  return lines[purpose]?.[kind] || lines[purpose]?.preference || lines.claim.preference;
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

function presentContinuityTruthText(value = '') {
  return cleanClaimText(value)
    .replace(/^user\s+/i, '')
    .replace(/^dashboard preference:\s*/i, 'dashboard preference is ')
    .replace(/^landing page style:\s*/i, 'landing page style is ')
    .replace(/^brand preference:\s*/i, 'brand preference is ')
    .replace(/^style preference:\s*/i, 'style preference is ')
    .trim();
}

function visibleSessionChangeEvidence(body = {}) {
  const items = recentItems(body);
  const userClaims = items
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text))
    .filter(text => /\b(is|=)\b/i.test(text))
    .map(text => ({ text: cleanClaimText(text), subject: continuityClaimSubject(text) }))
    .filter(item => item.text);
  if (userClaims.length >= 2) {
    const active = userClaims[userClaims.length - 1];
    const prior = userClaims
      .slice(0, -1)
      .reverse()
      .find(item => item.subject && item.subject === active.subject && normalizedPrompt(item.text) !== normalizedPrompt(active.text));
    if (!prior) return { active: active.text, prior: '' };
    return {
      active: active.text,
      prior: prior.text
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
  const ledgerRows = Array.isArray(body.continuityLedger) ? body.continuityLedger : [];
  const ledgerActive = ledgerRows
    .filter(item => String(item?.status || '').toLowerCase() === 'active')
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .slice(0, 3);
  const ledgerSuperseded = ledgerRows
    .filter(item => /^(superseded|disputed)$/i.test(String(item?.status || '')))
    .map(item => ({ ...item, text: safeTruthText(item), status: String(item?.status || 'superseded').toLowerCase() }))
    .filter(item => item.text)
    .slice(0, 3);
  const active = (Array.isArray(summary.activeTruths) ? summary.activeTruths : [])
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .concat(ledgerActive)
    .slice(0, 3);
  const superseded = [
    ...(Array.isArray(summary.supersededTruths) ? summary.supersededTruths : []),
    ...active
      .filter(item => item.supersededPriorText)
      .map(item => ({ text: item.supersededPriorText, status: 'superseded' })),
    ...ledgerSuperseded
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
  const active = cleanRecordClaim(evidence.active[0]?.text) || presentContinuityTruthText(evidence.active[0]?.text) || visibleSession.active || '';
  const prior = cleanRecordClaim(evidence.superseded[0]?.text) || presentContinuityTruthText(evidence.superseded[0]?.text) || visibleSession.prior || '';
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
    const kind = continuitySubjectKind(active, prior);
    return {
      roomBeat: fromLedger
        ? 'A.I.S.H.A anchors the recorded change instead of letting the room drift.'
        : 'A.I.S.H.A anchors the visible session change without inventing ledger facts.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Changed: Prior record: ${prior}. Current record: ${active}. Current record now leads.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', freshLine(body, continuityClaudiaLines(kind, 'change')), 'Tracking next steps')
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

function continuityPriorRecallFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_prior_recall') return null;
  const pair = continuityPair(body);
  const active = pair.active || '';
  const prior = pair.prior || '';
  if (active && prior) {
    const kind = continuitySubjectKind(active, prior);
    return {
      roomBeat: pair.fromLedger
        ? 'A.I.S.H.A recalls the superseded Pack 1 record before naming the current one.'
        : 'A.I.S.H.A recalls the superseded visible-session record before naming the current one.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Old record: ${prior}. Current record: ${active}.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', freshLine(body, continuityClaudiaLines(kind, 'prior')), 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: [pair.fromLedger
        ? 'Prior preference recall answered from Pack 1 memory evidence.'
        : 'Prior preference recall answered from visible recent turns only.'] }
    };
  }
  if (prior) {
    return {
      roomBeat: 'A.I.S.H.A recalls the prior record without inventing an active replacement.',
      roomMood: 'focused',
      responseMode: 'single',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Old record: ${prior}. I do not have a current replacement attached here.`, 'Anchoring')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
      stateUpdates: { notes: ['Prior preference recall answered with prior evidence only.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A checks continuity and refuses to invent an old preference.',
    roomMood: 'quiet',
    responseMode: 'single',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', 'I do not have an old preference record to cite yet.', 'Anchoring')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
    stateUpdates: { notes: ['Prior preference recall requested without Pack 1 or visible evidence.'] }
  };
}

function priorVisibleContinuityClaim(body = {}, currentClaim = '') {
  const currentKey = normalizedPrompt(currentClaim);
  const currentSubject = continuityClaimSubject(currentClaim);
  const claims = recentItems(body)
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(item => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(item))
    .filter(item => /\b(is|=)\b/i.test(item))
    .map(item => ({ text: cleanClaimText(item), subject: continuityClaimSubject(item) }))
    .filter(item => !currentSubject || item.subject === currentSubject)
    .map(item => item.text)
    .filter(Boolean)
    .filter(item => normalizedPrompt(item) !== currentKey);
  return claims[claims.length - 1] || '';
}

function continuityClaimFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_claim') return null;
  const claim = cleanClaimText(text);
  const prior = priorVisibleContinuityClaim(body, claim);
  const isUpdate = prior && prior.toLowerCase() !== claim.toLowerCase();
  if (isUpdate) {
    const kind = continuitySubjectKind(claim, prior);
    return {
      roomBeat: 'A.I.S.H.A treats the new claim as an update, not a quiet overwrite.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Current record logged: ${claim}. Prior record remains ${prior}.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', freshLine(body, continuityClaudiaLines(kind, 'update')), 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: {
        notes: [
          `Active record: ${claim}.`,
          `Prior record: ${prior}.`
        ]
      }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A acknowledges the claim and keeps the room from overwriting it casually.',
    roomMood: 'focused',
    responseMode: 'small_exchange',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', `Current record logged: ${claim}.`, 'Anchoring'),
      speaker('claudia', 'side', 'dry practical', freshLine(body, continuityClaudiaLines(continuitySubjectKind(claim), 'claim')), 'Tracking next steps')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
    stateUpdates: { notes: [`Active record: ${claim}.`] }
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
        speaker('grok', 'side', 'dry diagnostic', 'Fault line: pretending the first line vanished is not the same as contradicting it.', 'Tracking')
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
        speaker('grok', 'side', 'dry diagnostic', 'Fault line: pretending the first line vanished is not the same as contradicting it.', 'Tracking')
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
      speaker('aisha', 'primary', 'clean authority', 'Present. Quietly checking the room for false certainty.', 'Anchoring'),
      speaker('vanya', 'called_in', 'warm social read', 'Reading the temperature before friendliness turns into a performance.', 'Reading the room'),
      speaker('leah', 'called_in', 'sharp playful', 'Present, opinionated, and legally distinct from boredom.', 'Holding critique'),
      speaker('claudia', 'called_in', 'dry practical', 'Tracking the useful thread before it wanders off in costume.', 'Tracking next steps'),
      speaker('grok', 'called_in', 'dry diagnostic', 'Listening. Suspicious of roll calls, but listening.', 'Tracking')
    ],
    silentReactions: [],
    stateUpdates: { notes: ['Explicit all-room social check-in.'] }
  };
}

function socialCheckinFallback(body = {}) {
  return {
    roomBeat: 'The room answers the check-in as social weather, not attendance.',
    roomMood: 'playful',
    responseMode: 'small_exchange',
    speakers: [
      speaker('vanya', 'primary', 'warm with bite', freshLine(body, [
        'Alive, slightly restless, and not pretending that counts as a strategy.',
        'The room is awake. Slightly dramatic, mostly useful.',
        'Present enough to notice when the answer starts wearing a uniform.'
      ]), 'Reading the room'),
      speaker('leah', 'side', 'sharp playful', freshLine(body, [
        'I am good. Suspicious of any check-in that turns into attendance, but good.',
        'Fine. If anyone starts saying "operational status," I am leaving spiritually.',
        'Still here. Still allergic to bland consensus.'
      ]), 'Holding critique'),
      speaker('claudia', 'closer', 'dry practical', freshLine(body, [
        'Stable enough. If the room gets noisy, I am cutting it down to one clean move.',
        'No crisis. No need for five status reports either.',
        'Good enough to continue. Better if we keep the next answer specific.'
      ]), 'Tracking next steps')
    ],
    silentReactions: [reaction('aisha', 'Anchoring'), reaction('grok', 'Watching')],
    stateUpdates: { notes: ['Casual room check-in answered without stale topic carryover or roll-call copy.'] }
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
          : 'The adult answer is: pick the next owned move, make it visible, and stop letting uncertainty sit untouched.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Direct Claudia social line.'] }
    };
  }
  if (/\b(sound fake|sounded fake|was that useful|useful or fake|be honest)\b/i.test(message)) {
    return {
      roomBeat: 'Grok names the quality failure instead of hiding behind structure.',
      roomMood: 'sharp',
      responseMode: 'single',
      speakers: [
        speaker('grok', 'primary', 'dry honest', 'Partly useful: it named the dodge. Fake part: it got abstract and stopped answering the person.', 'Tracking failure')
      ],
      silentReactions: [
        reaction('aisha', 'Anchoring'),
        reaction('vanya', 'Reading the room'),
        reaction('leah', 'Holding critique'),
        reaction('claudia', 'Tracking next steps')
      ],
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

  const priorRecallFallback = continuityPriorRecallFallback(text, body);
  if (priorRecallFallback) return priorRecallFallback;
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
          speaker('vanya', 'primary', 'host with taste', 'Tonight I would choose Heat for pressure, Everything Everywhere All at Once for wonder, or Knives Out for comfort with teeth.', 'Reading the room'),
          speaker('leah', 'side', 'sharp taste', 'Do not average the room. Pick the sharpest acceptable option and start before consensus sands it down.', 'Holding critique'),
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
        speaker('leah', 'side', 'sharp taste', 'Decision rule: if nobody wants subtitles, go animated; if dinner talk is already sharp, go darker.', 'Holding critique'),
        speaker('grok', 'closer', 'dry diagnostic', 'Three clean options means the premise is solved. Arguing longer is just random taste noise.', 'Tracking')
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
        speaker('vanya', 'primary', 'host with bite', 'Alive, but allergic to becoming a help desk. That is the wobble underneath.', 'Reading the room'),
        speaker('leah', 'side', 'sharp social', 'Taste problem, honestly: the safe choice is too neat. Take a position or the room goes bland.', 'Holding critique'),
        speaker('grok', 'closer', 'dry diagnostic', 'The weak point is the dodge. Direct beats impressive here.', 'Tracking failure')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Room tension named as social-quality pressure.'] }
    };
  }

  if (currentTopic(text) === 'social_checkin') return socialCheckinFallback(body);
  if (explicitEveryoneRequested(text)) return everyoneOnline();

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
          speaker('vanya', 'primary', 'warm reset', 'Fair catch. No task badge; first rep gets the floor now.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'One clean training move: ten minutes, write reps down, stop. Repeat tomorrow before adding anything.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'The premise fault is wanting certainty before motion.', 'Tracking')
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
          speaker('vanya', 'primary', 'warm reset', 'No slogan. Put ten minutes on the clock, move first, and let the proof talk after.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Action version: push, pull, legs; log reps, recover, repeat. Leave two reps in reserve.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'Good. That is specific enough to start.', 'Tracking')
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
          speaker('vanya', 'primary', 'warm reset', 'Start where the week can actually hold it: Monday, Wednesday, Friday; no identity speech required.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Two rounds: push, row, squat, hinge. Mark one number before you leave; next week beat that number by one.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'Premise check: if week one needs a manifesto, it is too big. Shrink it until action beats performance.', 'Tracking')
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
        speaker('vanya', 'primary', 'warm reset', 'The room dropped the thread; your actual ask is how to start building muscle without a gym.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'This week: incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down; next week add one rep or slow the lowering.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'Sharp joint pain means stop or swap the move. If there is injury or a medical condition, bring in a real professional.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Recovered from rejected fitness refusal; answered beginner muscle-building ask.'] }
    };
  }

  if (/\b(20 minutes?|twenty minutes?|only have \d+\s*minutes|limited time)\b/i.test(text) && hasFitnessContext(text, body)) {
    if (recentShortSessionShape(body)) {
      return {
        roomBeat: 'The room keeps the same time constraint but changes the actual plan shape.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm practical', 'Keep the body honest, not dramatic. Finish small; brag later.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Use a short timer: reverse lunges, pushups, towel rows, wall sit. Four rounds, count reps, stop.', 'Tracking next steps')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching'), reaction('grok', 'Tracking')],
        stateUpdates: { notes: ['Repeated short-session fitness follow-up varied; no durable memory fact created.'] }
      };
    }
    return {
      roomBeat: 'The room compresses the fitness plan into a realistic short session.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('claudia', 'primary', 'practical', 'Do three rounds: squat or hinge, push, pull, core. Forty seconds on, twenty off. Log one number so next week has a target.', 'Tracking next steps'),
        speaker('vanya', 'side', 'warm practical', 'Keep it human: twenty minutes, no victory speech until the towel is wet.', 'Reading the room')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching'), reaction('grok', 'Tracking')],
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
          speaker('vanya', 'primary', 'warm practical', 'Feed the session, not the performance. Small if training is close; bigger if you have time.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Before training: under an hour, banana and yoghurt; two hours, eggs and toast or rice and chicken.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'Protein helps later. Right now the question is whether the food lets you move without feeling heavy.', 'Tracking')
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
        speaker('vanya', 'primary', 'warm practical', 'Keep lunch boring in the useful way. Eat enough to move, then let the afternoon stay human.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'Start with one usable lunch: rice and chicken, eggs and toast, a solid sandwich, or leftovers with water. Choose the one you can actually make.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'Premise check: if lunch takes ten decisions, choose the easiest real meal and move on.', 'Tracking')
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
      roomBeat: 'The room lowers pressure around the stress and lands one reset.',
      roomMood: 'warm',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm specific', 'Fair. Breathe first; shrink the room to water, one clear surface, and ten minutes that do not need a speech.', 'Protective'),
        speaker('claudia', 'side', 'grounded practical', 'Start with a short timer: drink water, clear one surface, then stop; that is the whole reset.', 'Tracking next steps')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching'), reaction('grok', 'Watching')],
      stateUpdates: { notes: ['Emotional social beat.'] }
    };
  }

  if (/\b(repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally)\b/i.test(text)) {
    const wantsToday = /\b(today|what should i do|what do i do)\b/i.test(text);
    const recentUsedPlainVersion = /\bplain version\b/i.test(recentAssistantText(body));
    const recoverySpeakers = [
      speaker('vanya', 'primary', 'warm reset', wantsToday
        ? recentUsedPlainVersion
          ? 'Make the day smaller: pick one necessary thing, finish one twenty-minute pass, then let the body breathe.'
          : 'Plain version: make the day smaller. Pick one necessary thing, finish one twenty-minute pass, then let the body breathe.'
        : 'Plain version: the loop got loud. Breathe once; I will land one sentence at a time.', 'Reading the room'),
      speaker('claudia', 'side', 'dry practical', wantsToday
        ? 'One clean move today: start the necessary task, run twenty minutes, mark completion, then do one maintenance task.'
        : 'Next answer gets one concrete action, one plain sentence, and one measurable next move.', 'Tracking next steps')
    ];
    if (!wantsToday) {
      recoverySpeakers.push(speaker('grok', 'closer', 'dry diagnostic', 'Correct. Repetition is a premise fault: a failed answer with confidence. Cut it.', 'Tracking failure'));
    }
    return {
      roomBeat: 'The room stops defending the loop and gives a plain next move.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: recoverySpeakers,
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
        speaker('leah', 'primary', 'sharp taste', 'Taste check: Silva needs one severe mark, not a polite badge. Black field, white wordmark, one red signal that feels placed, not sprinkled.', 'Holding critique'),
        speaker('claudia', 'side', 'dry practical', 'One decision: simplify the mark, tighten spacing, and let the red accent do one job: pulse, cut, or warning.', 'Tracking next steps'),
        speaker('vanya', 'closer', 'social landing', 'That keeps it premium: quiet around the mark, one signal, no brand monologue.', 'Reading')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Creative/logo prompt answered with concrete brand direction.'] }
    };
  }

  if (/\b(content calendar|design client|plan tomorrow|planning tomorrow|help planning|campaign plan|schedule tomorrow|tomorrow)\b/i.test(text)) {
    return {
      roomBeat: 'The room accepts a planning pivot and drops stale prior-topic pressure.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('claudia', 'primary', 'dry practical', 'First step tomorrow: pick the three things that would make the day count, put the hardest one first, and leave a buffer.', 'Tracking next steps'),
        speaker('vanya', 'side', 'warm host', 'And leave one human buffer. A plan with no air is just a future argument.', 'Reading the room'),
        speaker('grok', 'closer', 'dry diagnostic', 'Premise check: if everything matters equally, nothing is planned. Rank the pain.', 'Tracking')
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
      speaker('vanya', 'primary', 'warm with bite', 'Hey. The room is here; nobody has to earn a voice before speaking.', 'Reading the room'),
      speaker('leah', 'side', 'playful sharp', 'Thank God. I was getting bored of pretending silence means absence.', 'Watching')
    ],
    silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
    stateUpdates: { notes: ['Default social director beat.'] }
  };
}

module.exports = {
  socialFallbackFor
};
