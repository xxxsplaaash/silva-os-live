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

function referencedFollowupRequested(input = {}) {
  const text = textOf(input);
  const references = Array.isArray(input.references) ? input.references : Array.isArray(input.messageReferences) ? input.messageReferences : [];
  if (!references.length) return false;
  return /\b(turn|make|convert|compress|expand|show|use|same|that|this|referenced|version)\b/i.test(text);
}

function hasRecentPracticalContext(input = {}) {
  const recent = recentTextOf(input);
  return /\b(muscles?|fitness|workout|gym|training|train|push-?ups?|rows?|squats?|hinges?|plank|reps?|sets?|lunch|dinner|snack|hungry|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|logo|design|landing page|website|movie|film|watch|netflix|series|show|social media|instagram|tiktok|caption|post)\b/i.test(recent);
}

function categoryFor(input = {}) {
  const text = textOf(input).toLowerCase();
  if (directAddressTarget(text)) return 'direct';
  if (explicitEveryoneRequested(text)) return 'everyone';
  if (terseFollowupRequested(text) && hasRecentPracticalContext(input)) return 'practical';
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

function orderedSpeakersFor(category = 'normal', input = {}) {
  const text = textOf(input);
  const direct = normalizeSpeakerId(directAddressTarget(text));
  if (direct) {
    if (asksToCallSomeoneIn(input)) {
      const second = ['vanya', 'leah', 'claudia', 'grok', 'aisha'].find(id => id !== direct) || 'vanya';
      return [direct, second];
    }
    return [direct];
  }
  if (category === 'everyone') return ['aisha', 'vanya', 'leah', 'claudia', 'grok'];
  if (category === 'emotional') return ['vanya', 'aisha'];
  if (category === 'practical') {
    if (/\b(logo|design|landing page|website|hero|brand|visual|creative)\b/i.test(text)) return ['leah', 'grok'];
    if (/\b(social media|instagram|tiktok|caption|post|disagreement|disagree)\b/i.test(text)) return ['leah', 'grok'];
    if (/\b(provider|timeout|bug|failing|error|broken|technical|python|pdf|script|code|parser|parse)\b/i.test(text)) return ['grok', 'claudia'];
    if (/\b(hungry|lunch|dinner|snack|eat|food|meal|cook|recipe|carbonara|pasta|plan|planning|schedule|tomorrow|today|next move|what should i do|answer normally|workout|muscles?|gym|training|train)\b/i.test(text)) return ['claudia', 'vanya'];
    if (/\b(movie|film|watch|netflix|series|show)\b/i.test(text)) return ['leah', 'vanya'];
    return ['claudia', 'vanya'];
  }
  if (openFloorRequested(text, input)) return ['vanya', 'leah', 'claudia'];
  return ['vanya', 'aisha', 'leah'];
}

function capFor(category = 'normal', input = {}) {
  if (category === 'direct' && asksToCallSomeoneIn(input)) {
    return { minSpeakers: 2, maxSpeakers: 2, responderCapReason: 'direct call-in keeps the named character first and permits one invited voice' };
  }
  if (category === 'direct') return { minSpeakers: 1, maxSpeakers: 1, responderCapReason: 'direct address stays with the named character' };
  if (category === 'everyone') return { minSpeakers: 3, maxSpeakers: 5, responderCapReason: 'explicit everyone invitation allows up to five brief lines' };
  if (category === 'emotional') return { minSpeakers: 1, maxSpeakers: 2, responderCapReason: 'emotional or heavy turns need one to two grounded voices' };
  if (category === 'practical') return { minSpeakers: 1, maxSpeakers: 2, responderCapReason: 'practical turns need one to two useful voices' };
  return { minSpeakers: 2, maxSpeakers: 3, responderCapReason: 'normal social turns need two to three distinct voices at most' };
}

function buildShowcaseImpulsePlan(input = {}) {
  const category = categoryFor(input);
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
        reason: profile.silenceReason
      };
    });
  return {
    schemaVersion: SCHEMA_VERSION,
    category,
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
