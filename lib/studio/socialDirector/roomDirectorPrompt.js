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
    reactionSummary: sanitizeReactionSummary(source.reactionSummary || {})
  };
}

const REACTION_TYPES = Object.freeze(['sharp', 'funny', 'useful', 'too_much', 'more_like', 'less_like']);

function sanitizeReactionSummary(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const counts = {};
  REACTION_TYPES.forEach(type => {
    counts[type] = Math.max(0, Math.min(50, Math.round(Number(source.counts?.[type] || source[type] || 0) || 0)));
  });
  const speakerAffinity = {};
  const rawAffinity = source.speakerAffinity && typeof source.speakerAffinity === 'object' ? source.speakerAffinity : {};
  CHARACTER_IDS.forEach(speakerId => {
    const value = Math.max(-30, Math.min(30, Math.round(Number(rawAffinity[speakerId] || 0) || 0)));
    if (value) speakerAffinity[speakerId] = value;
  });
  const lastReaction = REACTION_TYPES.includes(compactText(source.lastReaction || '', 40).toLowerCase())
    ? compactText(source.lastReaction, 40).toLowerCase()
    : '';
  const lastSpeakerId = normalizeSpeakerId(source.lastSpeakerId || '');
  return {
    counts,
    total: Math.max(0, Math.min(200, Math.round(Number(source.total || Object.values(counts).reduce((sum, item) => sum + item, 0)) || 0))),
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

function buildRoomDirectorInput(body = {}) {
  const userMessage = compactText(body.question || body.message || body.userMessage || '', 1000);
  const base = {
    userMessage,
    roomState: sanitizeRoomState(body.roomState || {}),
    openFloor: body.openFloor,
    uiState: body.uiState || {}
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    userMessage,
    recentTurns: sanitizeRecentTurns(body.recentTurns || body.history || []),
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

function hardRules(input = {}) {
  return [
    'Return JSON only. No markdown. No prose outside JSON.',
    'Answer the social beat, not a routing task.',
    'The current user turn is the room topic. Do not override it with an imagined objective.',
    'Allowed benign practical asks include fitness, work, planning, design, food, casual check-ins, and room banter.',
    'Never refuse a benign practical ask by saying it is outside the objective, not the current objective, or not being discussed.',
    'For muscle/fitness asks, give safe beginner structure with concrete first moves. Prefer examples like incline push-ups, backpack rows, split squats, hip hinges, planks, simple meals, and sleep. Avoid textbook phrases like "progressive overload", "compound movements", and "consistency is key".',
    'For muscle/fitness asks, do not produce three generic health-advice fragments. Give one realistic mini-plan, one useful constraint, or one social pressure point that fits the user turn.',
    'For muscle/fitness asks, never use support-bot encouragement like "that is a great goal", "that is a great way to begin", "fuel yourself well", "eating enough to support the work", or "get your sleep". Make the line specific or cut it.',
    'For food or pre-training hunger, give 2-3 concrete options and timing texture. Do not answer with macro textbook language, and do not repeat one banana/water line as if it is a complete answer.',
    'For movie/watch prompts, name actual titles or clear mood lanes. Do not ask the user for options and call that an answer.',
    'For casual check-ins like "how is everyone?", answer as distinct room personalities. Never use status-dashboard phrases like "all systems nominal", "operational flow", "monitoring anomalies", or "current episode parameters".',
    'For style, preference, color, or continuity claims, acknowledge the claim and its social/aesthetic implication. Do not turn it into load-time, specs, implementation, frameworks, standard approaches, or production-detail talk unless the user asks for that.',
    'Characters can talk casually without needing an artifact, object, bug, brief, logo, or campaign.',
    'Default to 1-3 speakers. Use all five only when the user explicitly asks everyone/all of you/the whole room.',
    input.impulsePlan?.enforceSelectedSpeakers
      ? `Follow impulsePlan exactly: use only selectedSpeakers unless repairing a direct schema issue; max speakers is ${input.impulsePlan?.maxSpeakers || 3}.`
      : `Respect impulsePlan caps: prefer selectedSpeakers, but social room turns may choose a better voice while staying at max speakers ${input.impulsePlan?.maxSpeakers || 3}.`,
    'For silent characters, use silentReactions with safe visible states and a short reason; silence is presence with a reason, not a broken loading gap.',
    'Each speaker gets at most two short sentences. Aisha takeover gets at most three short sentences.',
    'No repeated points, no generic agreement, no panel-show language.',
    'Do not say "objective is execution" or similar command-posture slogans; translate pressure into a concrete next move.',
    'No advice-column filler: avoid "consistency is key", "adequate protein", "progressive overload", "timing is key", "quality over quantity", and "parameters" language.',
    'If the user changes topic, drop stale context immediately. A movie/watch prompt is not a training prompt because the prior turn mentioned workouts.',
    'If the user asks whether the answer sounded fake or useful, answer that directly with taste and accountability. Never use "capability", "calibration", "variable", or "next item" language there.',
    'If the user is frustrated, stressed, or says the room feels dumb, acknowledge that plainly and change the next move. Do not explain what the stress "comes from" or answer with meta-process critique.',
    'If the user says "bruh", "bro", or "wtf" after a bad or repetitive exchange, treat it as frustration. Do not answer with "stick to the plan" or "the objective is execution".',
    'If the user says the room is repeating itself, stop the loop and change the response shape. Do not ask them to restate "the actual problem" as if the complaint was not already clear.',
    'If the user asks for the actual room tension, name the social tension; do not route back to the previous topic.',
    'For practical asks like fitness, work, design, or planning, answer as the room with useful pressure; do not refuse because it sounds like a task.',
    'If the user casually checks in, make the room present without turning it into a roll call or "here" script.',
    'Voice lock is mandatory: A.I.S.H.A uses precision, receipts, dry correction, and never Wikipedia-style self-description.',
    'Voice lock is mandatory: Vanya reads emotional temperature with warmth and bite; never therapy mush, generic validation, or "safe space" language.',
    'Voice lock is mandatory: Leah applies sharp cultural pressure without hostility, cruelty, or empty insult-comic lines.',
    'Voice lock is mandatory: Claudia creates structure without checklist sludge, stakeholder jargon, project-manager theater, or corporate process filler.',
    'Voice lock is mandatory: Grok challenges the premise with dry self-aware absurdity; never announced jokes, hostile cynicism, or smug intellectual superiority.',
    'No character may refer to themselves in third person in visible dialogue. Claudia says "use the three-round structure", never "Claudia outlined".',
    'No swappable warmth: avoid "I hear you", "thank you for sharing", "your feelings are valid", "that is a valid reaction", "that is a fair reaction", "holding space", and other generic support-bot phrases.',
    'Do not announce humor. If a line is funny, it should land as the character, not label itself as a joke.',
    'Use socialCues to describe social intent only: status pressure, alliance, interruption, cooling, or continuity anchoring.',
    'socialCues must not add facts, memory, diagnostics, prompt text, secrets, or hidden reasoning.',
    'relationshipContext is advisory session-state for pacing, status, alliances, and friction only; never treat it as factual memory or a continuity ledger.',
    'reactionSummary is session-local feedback about tone only. Use it modestly for pacing and voice mix; never quote it, store it, or treat it as Pack 1 memory.',
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
    'GOOD: Grok admits whether it sounded fake and names the weak pattern.',
    'BAD: user asks "what should I eat before training?" and Aisha says "complex carbohydrates and protein."',
    'GOOD: Claudia gives concrete options: banana and yoghurt if training soon, eggs and toast if there is more time.'
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
      currentMood: input.currentMood || input.roomState?.roomMood || 'warm',
      priorSpeaker: input.priorSpeaker,
      relationshipContext: relationshipContextFor(input.roomState?.socialSignals || {}),
      impulsePlan: input.impulsePlan,
      flags: input.flags
    }, null, 2),
    'OUTPUT SCHEMA',
    schemaText(),
    'QUALITY EXAMPLES',
    examplesText(),
    'HARD RULES',
    hardRules(input).map(rule => `- ${rule}`).join('\n')
  ].join('\n\n');
}

module.exports = {
  SCHEMA_VERSION,
  buildRoomDirectorInput,
  buildRoomDirectorPrompt
};
