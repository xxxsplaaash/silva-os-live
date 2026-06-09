const {
  CHARACTER_IDS,
  compactText,
  directAddressTarget,
  explicitEveryoneRequested,
  openFloorRequested,
  normalizeSpeakerId
} = require('./socialDirectorTypes');

const SCHEMA_VERSION = 'studio-pulse.showcase-impulse-plan.v0.1';

function textOf(input = {}) {
  return compactText(input.userMessage || input.question || input.message || '', 1000);
}

function recentTextOf(input = {}) {
  const recent = (Array.isArray(input.recentTurns) ? input.recentTurns : [])
    .slice(-8)
    .map(item => compactText(item?.text || item?.content || '', 240))
    .join(' ');
  const references = (Array.isArray(input.references) ? input.references : Array.isArray(input.messageReferences) ? input.messageReferences : [])
    .slice(-4)
    .map(item => compactText(item?.text || item?.content || '', 240))
    .join(' ');
  return `${recent} ${references}`.toLowerCase();
}

function normalizedFollowupText(value = '') {
  return compactText(value, 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function terseFollowupRequested(text = '') {
  return /^(where do i start|what is the objective|bruh|bro|wtf|ok|okay|now what|what next|how|ok but i only have 20 minutes|i only have 20 minutes|only have 20 minutes)$/i.test(normalizedFollowupText(text));
}

function shortSessionFollowupRequested(text = '') {
  const clean = normalizedFollowupText(text);
  return /\b(20|twenty)\s+minutes?\b/.test(clean)
    && /\b(turn|make|convert|compress|that|this|it|version|short|shorter|only|limited)\b/.test(clean);
}

function referencedFollowupRequested(input = {}) {
  const text = textOf(input);
  const references = Array.isArray(input.references) ? input.references : Array.isArray(input.messageReferences) ? input.messageReferences : [];
  if (!references.length) return false;
  return /\b(turn|make|convert|compress|expand|show|use|same|that|this|referenced|version)\b/i.test(text);
}

function referencedSpeakerIds(input = {}) {
  const references = Array.isArray(input.references) ? input.references : Array.isArray(input.messageReferences) ? input.messageReferences : [];
  const seen = new Set();
  return references
    .map(item => normalizeSpeakerId(item?.speakerId || item?.speaker || ''))
    .filter(id => id && CHARACTER_IDS.includes(id))
    .filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function casualRoomCheckinRequested(text = '') {
  return /\b(how is everyone|how are you all|how is the room|how are we|hows everyone|hows the team|everyone ok|everyone okay)\b/i.test(text);
}

function hasRecentPracticalContext(input = {}) {
  const recent = recentTextOf(input);
  return /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|logo|design|landing page|website|movie|film|watch|netflix|series|show|social media|instagram|tiktok|caption|post)\b/i.test(recent);
}

const REACTION_TYPES = new Set(['sharp', 'funny', 'useful', 'too_much', 'more_like', 'less_like']);

function reactionSummaryFor(input = {}) {
  const source = input?.roomState?.socialSignals?.reactionSummary || {};
  const counts = source && typeof source === 'object' && !Array.isArray(source) ? source.counts || {} : {};
  const affinity = source && typeof source === 'object' && !Array.isArray(source) ? source.speakerAffinity || {} : {};
  const lastReaction = String(source?.lastReaction || '').trim().toLowerCase();
  const cleanReaction = REACTION_TYPES.has(lastReaction) ? lastReaction : '';
  const cleanAffinity = {};
  CHARACTER_IDS.forEach(id => {
    const value = Math.max(-30, Math.min(30, Math.round(Number(affinity?.[id] || 0) || 0)));
    if (value) cleanAffinity[id] = value;
  });
  return {
    counts: Object.fromEntries([...REACTION_TYPES].map(type => [
      type,
      Math.max(0, Math.min(50, Math.round(Number(counts?.[type] || 0) || 0)))
    ])),
    lastReaction: cleanReaction,
    lastSpeakerId: normalizeSpeakerId(source?.lastSpeakerId || ''),
    speakerAffinity: cleanAffinity
  };
}

function reactionNudgeFor(input = {}) {
  const summary = reactionSummaryFor(input);
  const liked = Object.entries(summary.speakerAffinity)
    .filter(([, value]) => value >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([speakerId]) => speakerId);
  const cooled = Object.entries(summary.speakerAffinity)
    .filter(([, value]) => value <= -4)
    .sort((a, b) => a[1] - b[1])
    .map(([speakerId]) => speakerId);
  return {
    lastReaction: summary.lastReaction,
    likedSpeakers: liked.slice(0, 2),
    cooledSpeakers: cooled.slice(0, 2),
    reduceIntensity: summary.lastReaction === 'too_much' || summary.lastReaction === 'less_like',
    raiseHumor: summary.lastReaction === 'funny',
    raisePractical: summary.lastReaction === 'useful',
    raiseSharpness: summary.lastReaction === 'sharp',
    repeatPermission: summary.lastReaction === 'more_like'
  };
}

function topicClassFor(input = {}) {
  const text = textOf(input).toLowerCase();
  if (directAddressTarget(text)) return 'direct';
  if (casualRoomCheckinRequested(text)) return 'banter';
  if (explicitEveryoneRequested(text)) return 'everyone';
  if (referencedFollowupRequested(input)) return 'reference-follow-up';
  if (/\b(contradict|contradicts|contradicted|contradiction|does not match|doesn't match|not what i said|wrong record|false memory|you said|earlier about|prior record|current record|what changed|never said)\b/i.test(text)) {
    return 'contradiction';
  }
  if (/\b(fake helpful|fake usefulness|sounded fake|sound fake|not useful|was that useful|useless|nonsense|bullshit|performative|empty answer|weak answer|generic answer)\b/i.test(text)) {
    return 'quality-challenge';
  }
  if (shortSessionFollowupRequested(text) && hasRecentPracticalContext(input)) return 'practical';
  if (terseFollowupRequested(text) && hasRecentPracticalContext(input)) return 'practical';
  if (/\b(stressed|stress|dumb|frustrated|annoyed|this sucks|bruh|bro|wtf|sad|scared|worried|overwhelmed|panic|anxious|grief|grieving|grieve|loss|lost someone|died|funeral|no advice|do not give advice|dont give advice)\b/i.test(text)) {
    return 'emotional';
  }
  if (/\b(repeating yourself|keep repeating|stop repeating|same answer|same thing again|you are looping|answer normally|respond normally|talk normally)\b/i.test(text)) {
    return 'practical';
  }
  if (/\b(?:actually\s+)?my\b.{0,80}\b(?:preference|style|claim|record)\b.{0,80}\b(?:is|was|changed|updated)\b/i.test(text)
    || /\b(?:preference|style|claim|record)\s+is\b/i.test(text)) {
    return 'practical';
  }
  if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta)\b/i.test(text)) {
    return 'food-choice';
  }
  if (/\b(muscles?|fitness|workout|gym|training|train|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally|build|bug|provider|timeout|python|pdf|code|parser|parse|movie|film|watch|netflix|series|show|disagreement|disagree)\b/i.test(text)) {
    return 'practical';
  }
  if (/\b(lol|lmao|haha|joking|joke|dramatic again|being dramatic|roast|banter|vibe check)\b/i.test(text)) {
    return 'banter';
  }
  if (/\b(write|rewrite|caption|copy|headline|hook|tagline|title|story|concept|idea|ideas|creative|make this sharper|sharper|more alive|less generic)\b/i.test(text)
    || /\b(logo|design|landing page|website|hero|brand|visual|social media|instagram|tiktok|caption|post)\b/i.test(text)) {
    return 'creative';
  }
  return 'normal';
}

function categoryFor(input = {}) {
  const topicClass = topicClassFor(input);
  if (topicClass === 'direct') return 'direct';
  if (topicClass === 'everyone') return 'everyone';
  if (topicClass === 'emotional') return 'emotional';
  if (['contradiction', 'quality-challenge', 'creative', 'reference-follow-up', 'food-choice', 'practical'].includes(topicClass)) return 'practical';
  if (topicClass === 'banter') return 'normal';
  const text = textOf(input).toLowerCase();
  if (directAddressTarget(text)) return 'direct';
  if (casualRoomCheckinRequested(text)) return 'normal';
  if (explicitEveryoneRequested(text)) return 'everyone';
  if (terseFollowupRequested(text) && hasRecentPracticalContext(input)) return 'practical';
  if (shortSessionFollowupRequested(text) && hasRecentPracticalContext(input)) return 'practical';
  if (referencedFollowupRequested(input) && hasRecentPracticalContext(input)) return 'practical';
  if (/\b(stressed|stress|dumb|frustrated|annoyed|this sucks|bruh|bro|wtf|sad|scared|worried|overwhelmed|panic|anxious|grief|grieving|grieve|loss|lost someone|died|funeral|no advice|do not give advice|dont give advice)\b/i.test(text)) {
    return 'emotional';
  }
  if (/\b(muscles?|fitness|workout|gym|training|train|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally|logo|design|landing page|website|build|bug|provider|timeout|python|pdf|script|code|parser|parse|movie|film|watch|netflix|series|show|social media|instagram|tiktok|caption|post|disagreement|disagree)\b/i.test(text)) {
    return 'practical';
  }
  if (openFloorRequested(text, input)) return 'normal';
  return 'normal';
}

function asksToCallSomeoneIn(input = {}) {
  const text = textOf(input);
  return /\b(call|bring|pull|invite)\b.{0,32}\b(someone|somebody|another|them|room|in)\b/i.test(text)
    || /\bcall someone in\b/i.test(text);
}

function speakerProfileFor(id = '') {
  const speakerId = normalizeSpeakerId(id);
  const profiles = {
    aisha: {
      role: 'anchor',
      socialObjective: 'hold the room to the actual claim and correct drift without warmth padding',
      lengthGuidance: 'one precise line, receipts before reassurance',
      visibleState: 'Anchoring',
      silenceReason: 'holding authority until the room needs correction'
    },
    vanya: {
      role: 'temperature-read',
      socialObjective: 'name the human pressure and keep the answer from becoming sterile',
      lengthGuidance: 'one warm, concrete line',
      visibleState: 'Reading the room',
      silenceReason: 'listening for the human signal before entering'
    },
    leah: {
      role: 'taste-pressure',
      socialObjective: 'apply sharp cultural taste pressure without becoming hostile',
      lengthGuidance: 'one clean cut, no lecture',
      visibleState: 'Holding critique',
      silenceReason: 'saving the taste cut until there is a useful edge'
    },
    claudia: {
      role: 'structure',
      socialObjective: 'turn the ask into a usable next move without checklist sludge',
      lengthGuidance: 'one operational line with an owner, constraint, or next action',
      visibleState: 'Tracking next steps',
      silenceReason: 'tracking structure without turning the exchange into a project plan'
    },
    grok: {
      role: 'premise-challenge',
      socialObjective: 'challenge the premise or pattern with dry self-aware absurdity',
      lengthGuidance: 'one diagnostic line, sharp but not insufferable',
      visibleState: 'Tracking',
      silenceReason: 'watching for the premise fault before interrupting'
    }
  };
  return profiles[speakerId] || profiles.vanya;
}

function selectedLineJobFor(speakerId = '', input = {}) {
  const id = normalizeSpeakerId(speakerId);
  const text = textOf(input).toLowerCase();
  if (/\b(actual tension|tension in this room|room tension)\b/i.test(text)) {
    const jobs = {
      aisha: 'anchor the room tension without turning it into diagnostics',
      vanya: 'name the human pressure or warmth-versus-usefulness tension directly',
      leah: 'name the taste, safe-choice, or consensus pressure in the room',
      claudia: 'name one concrete next move after the room tension is stated',
      grok: 'name the premise fault or dodge causing the room tension'
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  if (/\b(repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally)\b/i.test(text)) {
    const jobs = {
      aisha: 'acknowledge the loop once and reset the response standard',
      vanya: 'lower the social temperature and change the answer shape in one human line',
      leah: 'cut the stale performance pattern without adding cruelty',
      claudia: 'give one concrete next action and one checkable result without owner or handoff logistics',
      grok: 'name repetition as the fault line without defending the prior answer'
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  if (shortSessionFollowupRequested(text) && /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|sessions?)\b/i.test(recentTextOf(input))) {
    const jobs = {
      aisha: 'hold the record while the 20-minute workout gets answered',
      vanya: 'add one fresh human pressure line after Claudia; avoid recent mirror, first-round, clock, ego, and heroic-rebrand imagery',
      leah: 'stay quiet unless taste pressure would improve the practical answer',
      claudia: 'compress the referenced workout into a 20-minute timer plan using movement categories, not the prior starter list',
      grok: 'stay quiet unless there is a safety or premise fault'
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta)\b/i.test(text)) {
    const trainingAdjacent = /\b(training|workout|gym|lifting|lift|before|after|pre|post)\b/i.test(text);
    const jobs = trainingAdjacent ? {
      aisha: 'hold the record while the training-food choice gets answered',
      vanya: 'add human temperature after the food choice without generic nutrition advice',
      leah: 'stay quiet unless the food choice has a taste or status edge',
      claudia: 'name the training-food option first, with timing only if the user gave timing',
      grok: 'challenge only if the food choice ignores a useful constraint'
    } : {
      aisha: 'hold the record while the ordinary lunch choice gets answered',
      vanya: 'make lunch feel human with playful bite; use lunch, afternoon, or personality-test pressure, never movement or performance framing',
      leah: 'stay quiet unless taste would improve the lunch choice',
      claudia: 'open with named lunch options and one decision rule; use eggs, rice bowl, sandwich, leftovers, or water before any caveat',
      grok: 'stay quiet unless there is a premise fault in the lunch choice'
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  if (/\b(what changed|what was changed|what did .* change|difference|previous|superseded|old|original|earlier|used to|never said|did i say|did i ever say)\b/i.test(text)) {
    const jobs = {
      aisha: 'answer with Current record and Prior record from same-slot continuity evidence',
      claudia: 'keep the continuity receipt concise and do not invent process',
      grok: 'challenge any record mismatch with the evidence boundary',
      vanya: 'keep the correction socially clear without softening the receipt',
      leah: 'name the taste or style distinction only after the record is clear'
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  const beat = currentBeatLabel(input);
  if (beat) {
    const jobs = {
      aisha: `hold the record while the ${beat} gets answered`,
      vanya: `add human temperature to the ${beat} without taking over the practical line`,
      leah: `give a taste verdict or visual stake for the ${beat}`,
      claudia: `land the measurable structure, option, timer, or next move for the ${beat}`,
      grok: `name the premise fault or useful constraint inside the ${beat}`
    };
    return jobs[id] || speakerProfileFor(id).socialObjective;
  }
  return speakerProfileFor(id).socialObjective;
}

function currentDesignBeatLabel(input = {}) {
  const text = textOf(input).toLowerCase();
  if (/\blanding page\b/.test(text) && /\bhero\b/.test(text)) return 'landing page hero';
  if (/\blanding page\b/.test(text)) return 'landing page direction';
  if (/\bwebsite\b/.test(text) && /\bhero\b/.test(text)) return 'website hero';
  if (/\b(red pulse|red accent)\b/.test(text)) return 'red accent decision';
  if (/\b(logo|brand|visual|design)\b/.test(text)) return 'design decision';
  return '';
}

function currentPracticalBeatLabel(input = {}) {
  const text = textOf(input).toLowerCase();
  const recent = recentTextOf(input);
  const joined = `${text} ${recent}`;
  if (shortSessionFollowupRequested(text) && /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|sessions?)\b/i.test(joined)) {
    return '20-minute workout';
  }
  if (referencedFollowupRequested(input) && /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|sessions?)\b/i.test(joined)) {
    return 'referenced workout';
  }
  if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta)\b/i.test(text)) return 'food choice';
  if (/\b(plan|planning|schedule|tomorrow|today|next move|what should i do)\b/i.test(text)) return 'planning move';
  if (/\b(movie|film|watch|netflix|series|show)\b/i.test(text)) return 'watch choice';
  if (/\b(provider|timeout|bug|failing|error|broken|technical|python|pdf|script|code|parser|parse)\b/i.test(text)) return 'technical fault';
  if (/\b(social media|instagram|tiktok|caption|post|headline|hook|tagline|title|story|script|concept|copy)\b/i.test(text)) return 'creative line';
  return '';
}

function currentBeatLabel(input = {}) {
  return currentDesignBeatLabel(input) || currentPracticalBeatLabel(input);
}

function silenceReasonForBeat(speakerId = '', input = {}) {
  const beat = currentBeatLabel(input);
  if (!beat) return speakerProfileFor(speakerId).silenceReason;
  const reasons = {
    aisha: `holding the record while the ${beat} gets the useful voice`,
    vanya: `staying quiet because the ${beat} already has enough human pressure`,
    leah: `saving the sharper taste cut until the ${beat} needs another edge`,
    claudia: `holding structure until the ${beat} needs another measurable step`,
    grok: `watching for the premise fault inside the ${beat}`
  };
  return reasons[normalizeSpeakerId(speakerId)] || speakerProfileFor(speakerId).silenceReason;
}

function applyReactionSpeakerNudge(ids = [], category = 'normal', input = {}) {
  const nudge = reactionNudgeFor(input);
  let output = ids.slice();
  if (!output.length) return output;
  if (nudge.cooledSpeakers.length) {
    const minKept = category === 'normal' ? 2 : 1;
    const filtered = output.filter(id => !nudge.cooledSpeakers.includes(id));
    if (filtered.length >= minKept) output = filtered;
  }
  if (category === 'normal' && (nudge.raiseHumor || nudge.raiseSharpness)) {
    const preferred = nudge.raiseHumor ? ['leah', 'vanya', 'grok'] : ['leah', 'grok'];
    const candidate = preferred.find(id => !output.includes(id) && !nudge.cooledSpeakers.includes(id));
    if (candidate) output = [output[0], candidate, ...output.slice(1)].slice(0, 3);
  }
  if (category === 'practical' && nudge.raisePractical) {
    output = ['claudia', ...output.filter(id => id !== 'claudia')];
    if (nudge.likedSpeakers.includes('aisha') && !output.includes('aisha') && /\b(preference|changed|remember|record|claim|contradiction)\b/i.test(textOf(input))) {
      output = ['aisha', ...output.filter(id => id !== 'aisha')];
    }
  }
  for (const liked of nudge.likedSpeakers) {
    if (!output.includes(liked) || nudge.cooledSpeakers.includes(liked)) continue;
    const index = output.indexOf(liked);
    if (index > 0 && category !== 'practical') {
      output.splice(index, 1);
      output.splice(1, 0, liked);
    }
  }
  return output;
}

function orderedSpeakersFor(category = 'normal', input = {}) {
  const text = textOf(input);
  const topicClass = topicClassFor(input);
  const direct = normalizeSpeakerId(directAddressTarget(text));
  if (direct) {
    if (asksToCallSomeoneIn(input)) {
      const second = ['vanya', 'leah', 'claudia', 'grok', 'aisha'].find(id => id !== direct) || 'vanya';
      return [direct, second];
    }
    return [direct];
  }
  if (category === 'everyone') return ['aisha', 'vanya', 'leah', 'claudia', 'grok'];
  if (category === 'emotional') return applyReactionSpeakerNudge(['vanya', 'aisha'], category, input);
  if (category === 'practical') {
    if (topicClass === 'contradiction') return applyReactionSpeakerNudge(['aisha', 'grok'], category, input);
    if (topicClass === 'quality-challenge') return applyReactionSpeakerNudge(['grok', 'leah'], category, input);
    if (topicClass === 'reference-follow-up') {
      const referenced = referencedSpeakerIds(input).filter(id => id !== 'aisha');
      const isFitnessCompression = shortSessionFollowupRequested(text) && /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|sessions?)\b/i.test(recentTextOf(input));
      const first = isFitnessCompression
        ? 'claudia'
        : referenced[0] || (/caption|copy|headline|hook|tagline|title|story|script|concept|logo|design|brand|visual|sharper/i.test(text) ? 'leah' : 'claudia');
      const secondPool = isFitnessCompression
        ? ['vanya', ...referenced, 'grok', 'leah']
        : first === 'claudia' ? ['vanya', 'grok', 'leah'] : ['grok', 'claudia', 'vanya', 'leah'];
      const second = secondPool.find(id => id !== first) || 'vanya';
      return applyReactionSpeakerNudge([first, second], category, input);
    }
    if (topicClass === 'food-choice') return applyReactionSpeakerNudge(['claudia', 'vanya'], category, input);
    if (topicClass === 'creative') return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(?:actually\s+)?my\b.{0,80}\b(?:preference|style|claim|record)\b.{0,80}\b(?:is|was|changed|updated)\b/i.test(text)
      || /\b(?:preference|style|claim|record)\s+is\b/i.test(text)
      || /\b(remember|record|claim|contradiction|prior record|current record|what changed|never said)\b/i.test(text)) {
      return applyReactionSpeakerNudge(['aisha', 'claudia'], category, input);
    }
    if (/\b(logo|design|landing page|website|hero|brand|visual|creative)\b/i.test(text)) return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(social media|instagram|tiktok|caption|post|disagreement|disagree)\b/i.test(text)) return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(provider|timeout|bug|failing|error|broken|technical|python|pdf|script|code|parser|parse)\b/i.test(text)) return applyReactionSpeakerNudge(['grok', 'claudia'], category, input);
    if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally|workout|muscles?|gym|training|train)\b/i.test(text)) return applyReactionSpeakerNudge(['claudia', 'vanya'], category, input);
    if (/\b(movie|film|watch|netflix|series|show)\b/i.test(text)) return applyReactionSpeakerNudge(['leah', 'vanya'], category, input);
    return applyReactionSpeakerNudge(['claudia', 'vanya'], category, input);
  }
  if (topicClass === 'banter') return applyReactionSpeakerNudge(['vanya', 'leah'], category, input);
  if (openFloorRequested(text, input)) return applyReactionSpeakerNudge(['vanya', 'leah', 'claudia'], category, input);
  return applyReactionSpeakerNudge(['vanya', 'aisha', 'leah'], category, input);
}

function capFor(category = 'normal', input = {}) {
  const nudge = reactionNudgeFor(input);
  if (category === 'direct' && asksToCallSomeoneIn(input)) {
    return { minSpeakers: 2, maxSpeakers: 2, responderCapReason: 'direct call-in keeps the named character first and permits one invited voice' };
  }
  if (category === 'direct') return { minSpeakers: 1, maxSpeakers: 1, responderCapReason: 'direct address stays with the named character' };
  if (category === 'everyone') return { minSpeakers: 3, maxSpeakers: 5, responderCapReason: 'explicit everyone invitation allows up to five brief lines' };
  if (category === 'emotional') return { minSpeakers: 1, maxSpeakers: 2, responderCapReason: 'emotional or heavy turns need one to two grounded voices' };
  if (category === 'practical') return { minSpeakers: 1, maxSpeakers: nudge.reduceIntensity ? 1 : 2, responderCapReason: nudge.reduceIntensity ? 'reaction pressure reduced this practical turn to one useful voice' : 'practical turns need one to two useful voices' };
  return { minSpeakers: nudge.reduceIntensity ? 1 : 2, maxSpeakers: nudge.reduceIntensity ? 2 : 3, responderCapReason: nudge.reduceIntensity ? 'reaction pressure asked the room to reduce intensity' : 'normal social turns need two to three distinct voices at most' };
}

function buildShowcaseImpulsePlan(input = {}) {
  const category = categoryFor(input);
  const topicClass = topicClassFor(input);
  const cap = capFor(category, input);
  const selectedIds = orderedSpeakersFor(category, input).slice(0, cap.maxSpeakers);
  const selected = selectedIds.map((speakerId, index) => {
    const profile = speakerProfileFor(speakerId);
    return {
      speakerId,
      order: index + 1,
      role: index === 0 ? 'primary' : category === 'everyone' || category === 'direct' ? 'called_in' : 'side',
      socialObjective: profile.socialObjective,
      lineJob: selectedLineJobFor(speakerId, input),
      lengthGuidance: profile.lengthGuidance
    };
  });
  const selectedSet = new Set(selectedIds);
  const silentReactions = CHARACTER_IDS
    .filter(id => !selectedSet.has(id))
    .map(speakerId => {
      const profile = speakerProfileFor(speakerId);
      return {
        speakerId,
        visibleState: profile.visibleState,
        reason: silenceReasonForBeat(speakerId, input)
      };
    });
  return {
    schemaVersion: SCHEMA_VERSION,
    category,
    topicClass,
    reactionNudge: reactionNudgeFor(input),
    selectedSpeakers: selected,
    speakerOrder: selectedIds,
    minSpeakers: cap.minSpeakers,
    maxSpeakers: cap.maxSpeakers,
    responderCapReason: cap.responderCapReason,
    enforceSelectedSpeakers: category === 'practical' || category === 'direct' || category === 'emotional',
    intentionalSilence: silentReactions
  };
}

module.exports = {
  SCHEMA_VERSION,
  buildShowcaseImpulsePlan
};
