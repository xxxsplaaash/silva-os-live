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
  if (/\b(?:actually\s+)?my\b.{0,80}\b(?:preference|style|claim|record)\b.{0,80}\b(?:is|was|changed|updated)\b/i.test(text)
    || /\b(?:preference|style|claim|record)\s+is\b/i.test(text)) {
    return 'practical';
  }
  if (/\b(muscles?|fitness|workout|gym|training|train|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|answer normally|build|bug|provider|timeout|python|pdf|code|parser|parse|movie|film|watch|netflix|series|show|disagreement|disagree)\b/i.test(text)) {
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
  if (['contradiction', 'quality-challenge', 'creative', 'reference-follow-up', 'practical'].includes(topicClass)) return 'practical';
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
  if (/\b(muscles?|fitness|workout|gym|training|train|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|answer normally|logo|design|landing page|website|build|bug|provider|timeout|python|pdf|script|code|parser|parse|movie|film|watch|netflix|series|show|social media|instagram|tiktok|caption|post|disagreement|disagree)\b/i.test(text)) {
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
      socialObjective: 'name the human temperature and keep the answer from becoming sterile',
      lengthGuidance: 'one warm, concrete line',
      visibleState: 'Reading the room',
      silenceReason: 'listening for emotional temperature before entering'
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

function currentDesignBeatLabel(input = {}) {
  const text = textOf(input).toLowerCase();
  if (/\blanding page\b/.test(text) && /\bhero\b/.test(text)) return 'landing page hero';
  if (/\blanding page\b/.test(text)) return 'landing page direction';
  if (/\bwebsite\b/.test(text) && /\bhero\b/.test(text)) return 'website hero';
  if (/\b(red pulse|red accent)\b/.test(text)) return 'red accent decision';
  if (/\b(logo|brand|visual|design)\b/.test(text)) return 'design decision';
  return '';
}

function silenceReasonForBeat(speakerId = '', input = {}) {
  const beat = currentDesignBeatLabel(input);
  if (!beat) return speakerProfileFor(speakerId).silenceReason;
  const reasons = {
    aisha: `holding the record while the ${beat} gets a taste call`,
    vanya: `staying quiet because the ${beat} needs visual pressure before room temperature`,
    leah: `saving the sharper taste cut until the ${beat} needs another edge`,
    claudia: `holding structure until the ${beat} has one visible decision`,
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
      const first = referenced[0] || (/caption|copy|headline|hook|tagline|title|story|script|concept|logo|design|brand|visual|sharper/i.test(text) ? 'leah' : 'claudia');
      const isFitnessCompression = shortSessionFollowupRequested(text) && /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|sessions?)\b/i.test(recentTextOf(input));
      const secondPool = isFitnessCompression
        ? ['claudia', 'vanya', 'grok', 'leah']
        : first === 'claudia' ? ['vanya', 'grok', 'leah'] : ['grok', 'claudia', 'vanya', 'leah'];
      const second = secondPool.find(id => id !== first) || 'vanya';
      return applyReactionSpeakerNudge([first, second], category, input);
    }
    if (topicClass === 'creative') return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(?:actually\s+)?my\b.{0,80}\b(?:preference|style|claim|record)\b.{0,80}\b(?:is|was|changed|updated)\b/i.test(text)
      || /\b(?:preference|style|claim|record)\s+is\b/i.test(text)
      || /\b(remember|record|claim|contradiction|prior record|current record|what changed|never said)\b/i.test(text)) {
      return applyReactionSpeakerNudge(['aisha', 'claudia'], category, input);
    }
    if (/\b(logo|design|landing page|website|hero|brand|visual|creative)\b/i.test(text)) return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(social media|instagram|tiktok|caption|post|disagreement|disagree)\b/i.test(text)) return applyReactionSpeakerNudge(['leah', 'grok'], category, input);
    if (/\b(provider|timeout|bug|failing|error|broken|technical|python|pdf|script|code|parser|parse)\b/i.test(text)) return applyReactionSpeakerNudge(['grok', 'claudia'], category, input);
    if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|answer normally|workout|muscles?|gym|training|train)\b/i.test(text)) return applyReactionSpeakerNudge(['claudia', 'vanya'], category, input);
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
