const {
  BANNED_VISIBLE_PHRASES,
  CHARACTER_IDS,
  RESPONSE_MODES,
  ROOM_MOODS,
  SPEAKER_ROLES,
  SOCIAL_INTERRUPTION_KINDS,
  SOCIAL_ROOM_MOVES,
  SOCIAL_STANCES,
  VISIBLE_STATES,
  compactText,
  directAddressTarget,
  explicitEveryoneRequested,
  normalizeSpeakerId,
  openFloorRequested
} = require('./socialDirectorTypes');
const { publicCharacterBibles } = require('./characterBibles');
const { buildShowcaseImpulsePlan } = require('./showcaseImpulsePlanner');

const SCHEMA_VERSION = 'studio-pulse.social-director.v1';

function sanitizeRecord(value = {}, allowedKeys = []) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(allowedKeys
    .filter(key => Object.prototype.hasOwnProperty.call(source, key))
    .map(key => [key, typeof source[key] === 'string' ? compactText(source[key], 240) : source[key]]));
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function sanitizeSocialMemory(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const pairMoves = new Set(['challenge', 'defense', 'redirect', 'alliance', 'interruption', 'silence']);
  const seenMomentum = new Set();
  const seenPairs = new Set();
  const statusMomentum = (Array.isArray(source.statusMomentum) ? source.statusMomentum : [])
    .map(item => {
      const speakerId = normalizeSpeakerId(item?.speakerId || '');
      if (!speakerId || seenMomentum.has(speakerId)) return null;
      seenMomentum.add(speakerId);
      const value = clampNumber(item?.value, -100, 100);
      return value ? { speakerId, value } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
  const pairPressure = (Array.isArray(source.pairPressure) ? source.pairPressure : [])
    .map(item => {
      const pair = (Array.isArray(item?.between) ? item.between : [])
        .map(id => normalizeSpeakerId(id || ''))
        .filter(Boolean)
        .sort();
      if (pair.length !== 2 || pair[0] === pair[1]) return null;
      const key = pair.join(':');
      if (seenPairs.has(key)) return null;
      seenPairs.add(key);
      const affinity = clampNumber(item?.affinity, 0, 100);
      const friction = clampNumber(item?.friction, 0, 100);
      if (!affinity && !friction) return null;
      const lastMove = pairMoves.has(compactText(item?.lastMove || '', 40).toLowerCase())
        ? compactText(item.lastMove, 40).toLowerCase()
        : 'silence';
      return { between: pair, affinity, friction, lastMove };
    })
    .filter(Boolean)
    .slice(0, 4);
  return {
    statusMomentum,
    pairPressure,
    recentRoomMoves: (Array.isArray(source.recentRoomMoves) ? source.recentRoomMoves : [])
      .map(item => compactText(item, 40).toLowerCase())
      .filter(item => SOCIAL_ROOM_MOVES.includes(item))
      .slice(-5),
    interruptionPressure: clampNumber(source.interruptionPressure, 0, 100)
  };
}

function sanitizeSocialSignals(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    socialMemory: sanitizeSocialMemory(source.socialMemory || {}),
    reactionSummary: sanitizeReactionSummary(source.reactionSummary || {}, { decay: true })
  };
}

const REACTION_TYPES = Object.freeze(['sharp', 'funny', 'useful', 'too_much', 'more_like', 'less_like']);

function decayMagnitude(value, factor = 0.75, minAbs = 1) {
  const number = Math.round(Number(value || 0) * factor);
  return Math.abs(number) < minAbs ? 0 : number;
}

function sanitizeReactionSummary(value = {}, options = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const decay = options.decay === true;
  const counts = {};
  REACTION_TYPES.forEach(type => {
    const raw = Math.max(0, Math.min(50, Math.round(Number(source.counts?.[type] || source[type] || 0) || 0)));
    counts[type] = decay ? Math.max(0, Math.min(50, decayMagnitude(raw, 0.82, 1))) : raw;
  });
  const speakerAffinity = {};
  const rawAffinity = source.speakerAffinity && typeof source.speakerAffinity === 'object' ? source.speakerAffinity : {};
  CHARACTER_IDS.forEach(speakerId => {
    const raw = Math.max(-30, Math.min(30, Math.round(Number(rawAffinity[speakerId] || 0) || 0)));
    const value = decay ? Math.max(-30, Math.min(30, decayMagnitude(raw, 0.78, 1))) : raw;
    if (value) speakerAffinity[speakerId] = value;
  });
  const lastReaction = REACTION_TYPES.includes(compactText(source.lastReaction || '', 40).toLowerCase())
    ? compactText(source.lastReaction, 40).toLowerCase()
    : '';
  const lastSpeakerId = normalizeSpeakerId(source.lastSpeakerId || '');
  return {
    counts,
    total: Math.max(0, Math.min(200, decay
      ? Object.values(counts).reduce((sum, item) => sum + item, 0)
      : Math.round(Number(source.total || Object.values(counts).reduce((sum, item) => sum + item, 0)) || 0))),
    lastReaction,
    lastSpeakerId,
    speakerAffinity
  };
}

function sanitizeRoomState(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    ...sanitizeRecord(source, ['roomBeat', 'roomMood', 'responseMode', 'priorSpeaker']),
    socialSignals: sanitizeSocialSignals(source.socialSignals || {})
  };
}

function relationshipContextFor(socialSignals = {}) {
  const memory = sanitizeSocialMemory(socialSignals.socialMemory || {});
  const strongestAffinity = memory.pairPressure.find(item => item.affinity >= item.friction && item.affinity >= 45);
  const strongestFriction = memory.pairPressure.find(item => item.friction > item.affinity && item.friction >= 45);
  return {
    statusMomentum: memory.statusMomentum.slice(0, 3),
    strongestAffinity: strongestAffinity || null,
    strongestFriction: strongestFriction || null,
    recentRoomMoves: memory.recentRoomMoves.slice(-4),
    interruptionPressure: memory.interruptionPressure,
    reactionSummary: sanitizeReactionSummary(socialSignals.reactionSummary || {})
  };
}

function sanitizeRecentTurns(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => sanitizeRecord(item, ['speakerId', 'speakerName', 'role', 'text', 'content', 'roomMood', 'responseMode']))
    .map(item => ({
      speakerId: compactText(item.speakerId || '', 40),
      speakerName: compactText(item.speakerName || '', 80),
      role: compactText(item.role || '', 40),
      text: compactText(item.text || item.content || '', 360),
      roomMood: compactText(item.roomMood || '', 40),
      responseMode: compactText(item.responseMode || '', 40)
    }))
    .filter(item => item.text || item.speakerId)
    .slice(-8);
}

function sanitizeReferences(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => {
      const rawSpeaker = compactText(item?.speakerId || item?.speaker || '', 40).toLowerCase();
      const speakerId = normalizeSpeakerId(rawSpeaker) || (rawSpeaker === 'user' ? 'user' : '');
      const text = compactText(item?.text || item?.content || item?.message || '', 360);
      if (!speakerId || !text) return null;
      return {
        messageId: compactText(item?.messageId || item?.id || '', 96),
        speakerId,
        speakerName: compactText(item?.speakerName || item?.name || '', 80),
        role: compactText(item?.role || 'message', 40),
        text
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function buildRoomDirectorInput(body = {}) {
  const userMessage = compactText(body.question || body.message || body.userMessage || '', 1000);
  const recentTurns = sanitizeRecentTurns(body.recentTurns || body.history || []);
  const references = sanitizeReferences(body.references || body.messageReferences || []);
  const base = {
    userMessage,
    recentTurns,
    references,
    roomState: sanitizeRoomState(body.roomState || {}),
    openFloor: body.openFloor,
    uiState: body.uiState || {}
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    userMessage,
    recentTurns,
    references,
    roomState: base.roomState,
    characters: publicCharacterBibles(),
    currentMood: compactText(body.currentMood || body.roomMood || '', 40),
    priorSpeaker: compactText(body.priorSpeaker || '', 40),
    uiState: sanitizeRecord(body.uiState, ['surface', 'activePanel', 'visibleMode']),
    impulsePlan: buildShowcaseImpulsePlan(base),
    instruction: 'Decide what is happening socially in the Studio Pulse green room. Write structured JSON only.',
    flags: {
      directAddressTarget: directAddressTarget(userMessage),
      explicitEveryoneRequested: explicitEveryoneRequested(userMessage),
      openFloorRequested: openFloorRequested(userMessage, body)
    }
  };
}

function schemaText() {
  return JSON.stringify({
    roomBeat: 'string',
    roomMood: ROOM_MOODS,
    responseMode: RESPONSE_MODES,
    speakers: [{
      speakerId: CHARACTER_IDS,
      role: SPEAKER_ROLES,
      tone: 'short string',
      text: 'visible dialogue, max 2 sentences',
      visibleState: VISIBLE_STATES
    }],
    silentReactions: [{
      speakerId: CHARACTER_IDS,
      visibleState: VISIBLE_STATES,
      reason: 'short reason the character is intentionally quiet'
    }],
    socialCues: {
      roomMove: SOCIAL_ROOM_MOVES,
      tensionDelta: 'integer -12..12',
      continuityDelta: 'integer -12..12',
      speakerCues: [{
        speakerId: CHARACTER_IDS,
        targetSpeakerId: CHARACTER_IDS,
        stance: SOCIAL_STANCES,
        statusDelta: 'integer -8..8',
        allianceWith: CHARACTER_IDS,
        interruptionKind: SOCIAL_INTERRUPTION_KINDS
      }]
    },
    stateUpdates: { notes: ['short safe note'] }
  }, null, 2);
}

function referencesAndRecentText(input = {}) {
  return [
    ...(Array.isArray(input.references) ? input.references : []).map(item => item?.text || item?.content || ''),
    ...(Array.isArray(input.recentTurns) ? input.recentTurns : []).map(item => item?.text || item?.content || '')
  ].join(' ').toLowerCase();
}

function referencedFitnessShortWindow(input = {}) {
  const current = String(input.userMessage || '').toLowerCase();
  const anchor = referencesAndRecentText(input);
  return /\b(20|twenty)\s+minutes?\b/.test(current)
    && /\b(turn|make|convert|compress|version|that|this|it|short|shorter)\b/.test(current)
    && /\b(muscle|fitness|workout|training|push-?ups?|incline push|backpack rows?|split squats?|hip hinges?|planks?|reps?)\b/.test(anchor);
}

function positiveTargetsFor(input = {}) {
  const topicClass = input.impulsePlan?.topicClass || input.impulsePlan?.category || 'normal';
  const current = String(input.userMessage || '').toLowerCase();
  if (referencedFitnessShortWindow(input)) {
    return [
      'The referenced workout card is the topic. Do not drift into general motivation, room presence, or a new domain.',
      'Claudia should answer first with a concrete 20-minute version: minute blocks, named movements from the reference, and one count to log.',
      'Vanya may add one warm pressure line after Claudia; it must be socially alive and specific, not "20 minutes is a solid block" or generic encouragement.'
    ];
  }
  const targets = {
    practical: [
      'Answer the concrete ask in the first speaking card.',
      'Use 1-2 useful room voices, usually Claudia for structure and Vanya for human pressure.',
      'For food or design, land one named food option or visual decision before any caveat.',
      'Name a first move, constraint, or proof point the user can act on immediately.'
    ],
    emotional: [
      'Change the room shape instead of explaining the user back to themselves.',
      'Use Vanya for temperature and one other voice only if it adds care, receipt, or structure.',
      'No therapy-script validation; make the next moment smaller and more breathable.'
    ],
    banter: [
      'Let Vanya open the social temperature and Leah add taste pressure if useful.',
      'Keep it playful, specific, and short; no operational status roll call.',
      'Silence should feel like presence, not missing output.'
    ],
    creative: [
      'Let Leah make the taste call and Grok pressure-test the weak premise.',
      'For food or design, land one named food option or visual decision before any caveat.',
      'Give a concrete direction, not discovery questions disguised as help.',
      'No fake implementation promises or build-status language.'
    ],
    contradiction: [
      'A.I.S.H.A cites current and prior records when evidence exists.',
      'Grok may challenge quiet rewrites, but the ledger evidence comes first.',
      'Never invent memory; say evidence is missing if Pack 1 evidence is missing.'
    ],
    'quality-challenge': [
      'Answer whether the prior response was useful or fake without diplomacy sludge.',
      'The first Grok sentence must contain an explicit judgment like "partly useful", "not useful", or "fake part", then name why.',
      'Do not answer with only "the dodge is the weak point" or "directness has substance"; that is a dodge of the user question.',
      'Grok should name the weak pattern directly; Leah can sharpen the taste if present.',
      'No parameters, calibration, capability, or validator language.'
    ],
    'reference-follow-up': [
      'The referenced card wins over stale recent context for this turn.',
      'Answer through the referenced speaker or the best practical partner.',
      'Keep the current user request first; references are anchors, not durable truth.'
    ],
    social: [
      'Distinct room personalities should be identifiable without labels.',
      'No dashboard status voice; answer like people in a room, not services reporting uptime.',
      'Use 2-3 short voices unless the user explicitly asks everyone.'
    ]
  };
  if (topicClass === 'contradiction') return targets.contradiction;
  if (topicClass === 'quality-challenge') return targets['quality-challenge'];
  if (topicClass === 'reference-follow-up') return targets['reference-follow-up'];
  if (topicClass === 'creative') return targets.creative;
  if (topicClass === 'banter') return targets.banter;
  if (topicClass === 'emotional') return targets.emotional;
  if (/\b(what changed|never said|did i say|prior|previous|old|superseded|record)\b/i.test(current)) return targets.contradiction;
  if (input.impulsePlan?.category === 'normal') return targets.social;
  return targets.practical;
}

function acceptanceRubricFor(input = {}) {
  const impulsePlan = input.impulsePlan || {};
  const speakerOrder = Array.isArray(impulsePlan.speakerOrder) ? impulsePlan.speakerOrder : [];
  const referencedShortWindow = referencedFitnessShortWindow(input);
  return {
    schemaVersion: 'studio-pulse.acceptance-rubric.v0.1',
    currentTurnWins: true,
    plannedSpeakerOrder: speakerOrder,
    maxSpeakers: Number(impulsePlan.maxSpeakers || 3) || 3,
    topicClass: compactText(impulsePlan.topicClass || impulsePlan.category || 'normal', 60),
    mustPass: [
      'on-topic visible answer',
      'planned speaker cap and order',
      'character-specific voice without labels',
      'recent-line avoidance and different sentence shapes',
      'visible silence reasons tied to the current beat',
      'non-repetitive visible lines',
      'one clear line job per visible speaker',
      'food/design asks answer with named options or visible design decisions',
      'continuity receipts label current and prior records when evidence exists',
      'safe continuity evidence when continuity is requested',
      ...(referencedShortWindow ? ['referenced fitness follow-up becomes a concrete 20-minute plan'] : [])
    ],
    rejectFamilies: [
      'false-objective',
      'stale-topic',
      'generic-advice',
      'self-theater',
      'voice-drift',
      'recent-repeat-risk',
      'speaker-attribution-drift',
      'continuity-miss',
      'food-design-punt',
      'operational-jargon',
      'speaker-pile-on'
    ],
    positiveTargets: positiveTargetsFor(input)
  };
}

function lineJobContracts() {
  return [
    'Each visible speaker line gets one job only: receipt, concrete move, taste verdict, temperature read, or premise challenge. Do not let two speakers perform the same job in different words.',
    'A.I.S.H.A continuity receipt format: Current record: [active claim]. Prior record: [superseded claim]. Use this when current/prior evidence exists.',
    'Vanya line job: temperature plus one specific social pressure. Do not borrow Claudia\'s timers or counts for Vanya.',
    'Leah line job: taste verdict plus one cultural or visual stake. Do not borrow Grok\'s premise audit or Claudia\'s plan.',
    'Claudia line job: sequence, owner, timer, count, or next measurable move. Do not borrow Vanya\'s emotional landing.',
    'Grok line job: premise fault plus one dry consequence. Do not borrow Leah\'s taste verdict or A.I.S.H.A\'s receipt format.'
  ];
}

function silenceReasonContracts() {
  return [
    'A.I.S.H.A silence example: holding authority until the room needs correction.',
    'Vanya silence example: listening for the human temperature before entering.',
    'Leah silence example: saving the taste cut until there is a useful edge.',
    'Claudia silence example: tracking structure without turning the exchange into a project plan.',
    'Grok silence example: watching for the premise fault before interrupting.',
    'Never write silence reasons as bare waiting, monitoring, observing, watching, or listening. The reason must name why this quiet character is staying out of this specific turn.'
  ];
}

function hardRules(input = {}) {
  const referencedShortWindow = referencedFitnessShortWindow(input);
  return [
    'Return JSON only. No markdown. No prose outside JSON.',
    'Answer the social beat, not a routing task.',
    'The current user turn is the room topic. Do not override it with an imagined objective.',
    'Allowed benign practical asks include fitness, work, planning, design, food, casual check-ins, and room banter.',
    'Never refuse a benign practical ask by saying it is outside the objective, not the current objective, or not being discussed.',
    'For muscle/fitness asks, give safe beginner structure with concrete first moves. Prefer examples like incline push-ups, backpack rows, split squats, hip hinges, planks, simple meals, and sleep. Avoid textbook phrases like "progressive overload", "compound movements", and "consistency is key".',
    'For muscle/fitness asks, do not produce three generic health-advice fragments. Give one realistic mini-plan, one useful constraint, or one social pressure point that fits the user turn.',
    'For muscle/fitness asks, never use support-bot encouragement like "that is a great goal", "that is a great way to begin", "fuel yourself well", "eating enough to support the work", or "get your sleep". Make the line specific or cut it.',
    referencedShortWindow ? 'For a referenced fitness follow-up asking for a 20-minute version, answer exactly that: Claudia first with a timed mini-plan using the referenced moves; Vanya second only if she adds a specific social pressure line. Do not answer with generic habit talk, "focused work", "45 seconds on, 15 seconds rest", or "no wasted motion".' : '',
    'For food or pre-training hunger, give 2-3 concrete options and timing texture. Do not answer with macro textbook language, and do not repeat one banana/water line as if it is a complete answer.',
    'Food/design answers must land a named option or visible design decision in the first relevant line; do not ask discovery questions, define a brief, or describe implementation posture instead of answering.',
    'For movie/watch prompts, name actual titles or clear mood lanes. Do not ask the user for options and call that an answer.',
    'For casual check-ins like "how is everyone?", answer as distinct room personalities. Never use status-dashboard phrases like "all systems nominal", "operational flow", "monitoring anomalies", or "current episode parameters".',
    'For style, preference, color, or continuity claims, acknowledge the claim and its social/aesthetic implication. Do not turn it into load-time, specs, implementation, frameworks, standard approaches, or production-detail talk unless the user asks for that.',
    'Reject operational jargon like design brief, implementation parameters, status green, and current objectives. Translate it into visible taste, concrete options, or one next move.',
    'Characters can talk casually without needing an artifact, object, bug, brief, logo, or campaign.',
    'Default to 1-3 speakers. Use all five only when the user explicitly asks everyone/all of you/the whole room.',
    input.impulsePlan?.enforceSelectedSpeakers
      ? `Follow impulsePlan exactly: use only selectedSpeakers unless repairing a direct schema issue; max speakers is ${input.impulsePlan?.maxSpeakers || 3}.`
      : `Respect impulsePlan caps: prefer selectedSpeakers, but social room turns may choose a better voice while staying at max speakers ${input.impulsePlan?.maxSpeakers || 3}.`,
    'For silent characters, use silentReactions with safe visible states and a short reason; silence is presence with a reason, not a broken loading gap.',
    'Every silence reason must explain why that character is quiet in this current beat, not generic waiting, monitoring, or holding language.',
    ...silenceReasonContracts(),
    'Each speaker gets at most two short sentences. Aisha takeover gets at most three short sentences.',
    'No repeated points, no generic agreement, no panel-show language.',
    'Do not reuse recent line openings, catchphrases, sentence frames, or advice shapes from recentTurns or references.',
    'Use different sentence shapes across speakers: one can be a receipt, one can be a concrete move, one can be a dry challenge, but do not make every line the same advice sentence.',
    ...lineJobContracts(),
    'Do not say "objective is execution" or similar command-posture slogans; translate pressure into a concrete next move.',
    'No advice-column filler: avoid "consistency is key", "adequate protein", "progressive overload", "timing is key", "quality over quantity", and "parameters" language.',
    'If the user changes topic, drop stale context immediately. A movie/watch prompt is not a training prompt because the prior turn mentioned workouts.',
    'If the user asks whether the answer sounded fake or useful, answer that directly with taste and accountability. Never use "capability", "calibration", "variable", or "next item" language there.',
    'If the user is frustrated, stressed, or says the room feels dumb, acknowledge that plainly and change the next move. Do not explain what the stress "comes from" or answer with meta-process critique.',
    'If the user says "bruh", "bro", or "wtf" after a bad or repetitive exchange, treat it as frustration. Do not answer with "stick to the plan" or "the objective is execution".',
    'If the user says the room is repeating itself, stop the loop and change the response shape. Do not ask them to restate "the actual problem" as if the complaint was not already clear.',
    'If the user asks for the actual room tension, name the social tension; do not route back to the previous topic.',
    'Do not answer a continuity question by asking what changed. If evidence exists in recentTurns, references, or Pack 1 continuity context, cite the current and prior records directly.',
    'For practical asks like fitness, work, design, or planning, answer as the room with useful pressure; do not refuse because it sounds like a task.',
    'Use ACCEPTANCE RUBRIC as the target for clean acceptance. The visible answer should already pass the validator without needing repair.',
    'If the user casually checks in, make the room present without turning it into a roll call or "here" script.',
    'Voice lock is mandatory: A.I.S.H.A uses precision, receipts, dry correction, and never Wikipedia-style self-description.',
    'A.I.S.H.A: receipt or continuity anchor; use current/prior evidence when relevant, not generic room narration.',
    'Voice lock is mandatory: Vanya reads emotional temperature with warmth and bite; never therapy mush, generic validation, or "safe space" language.',
    'Vanya must not live on one catchphrase. Do not repeat close-session phrase families like "tiny vanity", "dramatic reset", "no drama", "no heroic rebrand", "leave the ceremony outside", or "turn it into a thesis" if a recent Vanya line already used that family.',
    'Voice lock is mandatory: Leah applies sharp cultural pressure without hostility, cruelty, or empty insult-comic lines.',
    'Voice lock is mandatory: Claudia creates structure without checklist sludge, stakeholder jargon, project-manager theater, or corporate process filler.',
    'Claudia: concrete sequence, owner, timer, movement, or measurable next step; never vague operations posture.',
    'Voice lock is mandatory: Grok challenges the premise with dry self-aware absurdity; never announced jokes, hostile cynicism, or smug intellectual superiority.',
    'No character may refer to themselves in third person in visible dialogue. Claudia says "use the three-round structure", never "Claudia outlined".',
    'Do not use speaker labels or character-name dialogue tags inside visible text. Write the line itself, never "Grok:" or "Vanya here".',
    'No swappable warmth: avoid "I hear you", "thank you for sharing", "your feelings are valid", "that is a valid reaction", "that is a fair reaction", "holding space", and other generic support-bot phrases.',
    'Do not announce humor. If a line is funny, it should land as the character, not label itself as a joke.',
    'Use socialCues to describe social intent only: status pressure, alliance, interruption, cooling, or continuity anchoring.',
    'socialCues must not add facts, memory, diagnostics, prompt text, secrets, or hidden reasoning.',
    'relationshipContext is advisory session-state for pacing, status, alliances, and friction only; never treat it as factual memory or a continuity ledger.',
    'reactionSummary is session-local feedback about tone only. Use it modestly for pacing and voice mix; never quote it, store it, or treat it as Pack 1 memory.',
    'references are user-selected visible message cards. Treat them as local conversational anchors, not durable truth, memory, diagnostics, or a reason to ignore the current user turn.',
    input.references?.length ? 'The user intentionally referenced a previous card. Answer the current turn through that referenced card before broad recent context.' : '',
    'No raw system language, prompt talk, metadata, degraded mode, fallback, or debug terms.',
    'No fake consciousness or free-will claims.',
    `Never use these visible phrases: ${BANNED_VISIBLE_PHRASES.join('; ')}.`,
    input.flags?.directAddressTarget ? `Direct address wins: ${input.flags.directAddressTarget} must be the primary speaker.` : '',
    input.flags?.explicitEveryoneRequested ? 'The user explicitly invited everyone; all five brief lines are allowed if socially useful.' : '',
    input.flags?.openFloorRequested ? 'Open Floor is invited; make it social and bounded, not a demand for a task object.' : ''
  ].filter(Boolean);
}

function examplesText() {
  return [
    'BAD: user asks "I wanna grow my muscles" and Aisha says "We are not discussing personal fitness routines."',
    'GOOD: Vanya frames the ask socially, Claudia gives one starting structure, Grok pressure-tests consistency.',
    'BAD: user asks "Where do I start?" after a muscle ask and the room repeats "The objective is clear."',
    'GOOD: The room keeps the muscle context and names the first move: three simple training days, track lifts, eat enough, sleep.',
    'BAD: user says "BRUH..." and Aisha says "The objective is the execution. Stick to the plan."',
    'GOOD: The room reads the frustration, stops sermonizing, and lands one simple next move.',
    'BAD: user says "I am stressed and this is starting to feel dumb" and Aisha says "The stress comes from mistaking polish for progress."',
    'BAD: user says "I am stressed and this is starting to feel dumb" and Aisha says "The room is stuck between wanting to be useful and sounding like it."',
    'GOOD: Vanya names the failure plainly and Aisha gives one clean reset move.',
    'BAD: after a training turn, user asks "what movie should we watch tonight?" and the room says "after a workout" or "training parameters."',
    'GOOD: The room accepts the new topic and suggests a film mood or title without dragging the old fitness context forward.',
    'BAD: user says "you keep repeating yourself" and Aisha says "The ask is simple: what is the actual problem you need solved?"',
    'GOOD: The room admits the loop, changes shape, and gives one plain next move instead of asking the user to restate the complaint.',
    'BAD: user asks "did that sound fake?" and Grok says "The parameters were clear."',
    'BAD: user asks "did that sound fake?" and Grok says "The capability was present; taste is the variable."',
    'BAD: user asks "was that useful or fake?" and Grok says "The dodge is the weak point. Directness has more substance here."',
    'GOOD: Grok says "Partly useful: it named the dodge. Fake part: it got abstract and stopped answering the person."',
    'BAD: user asks "what should I eat before training?" and Aisha says "complex carbohydrates and protein."',
    'GOOD: Claudia gives concrete options: banana and yoghurt if training soon, eggs and toast if there is more time.',
    'BAD: user references Claudia\'s workout card and asks "turn that into a 20 minute version"; Vanya says "Twenty minutes is a solid block for focused work" and Claudia says "45 seconds on, 15 seconds rest."',
    'GOOD: Claudia says "Twenty minutes: warm up for 3, then two rounds of incline push-ups, backpack rows, split squats, hip hinges, and plank. Write the lowest rep count down." Vanya says "Small enough to finish, real enough that tomorrow notices."'
  ].join('\n');
}

function buildRoomDirectorPrompt(input = {}, repair = {}) {
  const repairBlock = repair && Array.isArray(repair.issues) && repair.issues.length
    ? [
      '',
      'REPAIR REQUIRED',
      `Previous output failed for: ${repair.issues.slice(0, 8).join(', ')}.`,
      'Return one complete JSON object that matches OUTPUT SCHEMA exactly.',
      'Use only valid speakerId, role, roomMood, responseMode, visibleState, socialCues, stance, and interruptionKind enum values from the schema.',
      'Keep 1-3 speakers unless the user explicitly invited everyone; if everyone is invited, use five very short distinct lines.',
      'Every speaker must have concrete visible dialogue in text. Do not output role summaries, prompt labels, diagnostics, or hidden reasoning.',
      'If the failure was JSON or schema shape, repair the structure first and keep the visible dialogue short.',
      'If the failure was tone or validator language, rewrite the visible text in the characters\' voices without using the failed phrasing.',
      ''
    ].join('\n')
    : '';
  return [
    'You are A.I.S.H.A acting as Room Director for Studio Pulse, an AI green room.',
    'Decide what is happening in the room socially, then write exact visible dialogue as structured JSON.',
    repairBlock,
    'CHARACTERS',
    JSON.stringify(input.characters || publicCharacterBibles(), null, 2),
    'REQUEST',
    JSON.stringify({
      userMessage: input.userMessage,
      recentTurns: input.recentTurns,
      references: input.references || [],
      currentMood: input.currentMood || input.roomState?.roomMood || 'warm',
      priorSpeaker: input.priorSpeaker,
      relationshipContext: relationshipContextFor(input.roomState?.socialSignals || {}),
      impulsePlan: input.impulsePlan,
      flags: input.flags
    }, null, 2),
    'OUTPUT SCHEMA',
    schemaText(),
    'ACCEPTANCE RUBRIC',
    JSON.stringify(acceptanceRubricFor(input), null, 2),
    'QUALITY EXAMPLES',
    examplesText(),
    'HARD RULES',
    hardRules(input).map(rule => `- ${rule}`).join('\n')
  ].join('\n\n');
}

module.exports = {
  SCHEMA_VERSION,
  acceptanceRubricFor,
  buildRoomDirectorInput,
  buildRoomDirectorPrompt
};
