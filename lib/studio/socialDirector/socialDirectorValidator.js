const {
  BANNED_VISIBLE_PHRASES,
  CHARACTER_IDS,
  RAW_INTERNAL_MARKERS,
  RESPONSE_MODES,
  ROOM_MOODS,
  SPEAKER_ROLES,
  SOCIAL_INTERRUPTION_KINDS,
  SOCIAL_ROOM_MOVES,
  SOCIAL_STANCES,
  VISIBLE_STATES,
  compactText,
  explicitEveryoneRequested,
  normalizeSpeakerId,
  sentenceCount,
  truncateSentences,
  wordCount
} = require('./socialDirectorTypes');

function normalizeKey(value = '') {
  return compactText(value, 1000)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bannedPhraseFound(value = '') {
  const text = String(value || '');
  return BANNED_VISIBLE_PHRASES.find(phrase => {
    if (phrase === 'on that:') return /\bon that\s*:/i.test(text);
    return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
  }) || '';
}

function rawInternalLeakFound(value = '') {
  const text = String(value || '');
  const scalarLeak = text.match(/\b(trust|warmth|irritation|gravity)\s*:\s*-?\d+(?:\.\d+)?\b/i);
  if (scalarLeak) return scalarLeak[1] || 'scalar';
  return RAW_INTERNAL_MARKERS.find(marker => new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) || '';
}

function extractJsonObject(value = '') {
  const raw = String(value || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeRole(value = '') {
  const role = compactText(value, 40).toLowerCase();
  return SPEAKER_ROLES.includes(role) ? role : 'side';
}

function normalizeMood(value = '') {
  const mood = compactText(value, 40).toLowerCase();
  return ROOM_MOODS.includes(mood) ? mood : 'warm';
}

function normalizeMode(value = '') {
  const mode = compactText(value, 40).toLowerCase();
  return RESPONSE_MODES.includes(mode) ? mode : 'small_exchange';
}

function normalizeVisibleState(value = '') {
  const clean = compactText(value, 60);
  const match = VISIBLE_STATES.find(state => state.toLowerCase() === clean.toLowerCase());
  return match || 'Watching';
}

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeEnum(value = '', allowed = [], fallback = '') {
  const clean = compactText(value, 60).toLowerCase();
  return allowed.includes(clean) ? clean : fallback;
}

function defaultRoomMoveFor(output = {}) {
  if (output.responseMode === 'aisha_takeover') return 'anchor';
  if (output.responseMode === 'open_floor') return 'redirect';
  if (['sharp', 'tense', 'chaotic'].includes(output.roomMood)) return 'challenge';
  if (output.roomMood === 'cooling') return 'cool';
  if (output.roomMood === 'quiet') return 'observe';
  return 'observe';
}

function defaultStanceForSpeaker(speaker = {}, index = 0) {
  if (speaker.speakerId === 'aisha' && speaker.role === 'primary') return 'dominant';
  if (speaker.role === 'primary') return index === 0 ? 'dominant' : 'curious';
  if (speaker.role === 'closer') return 'defensive';
  if (speaker.role === 'side' || speaker.role === 'called_in') return 'allied';
  return 'curious';
}

function defaultSocialCuesFor(normalized = {}) {
  const speakers = Array.isArray(normalized.speakers) ? normalized.speakers : [];
  const roomMove = defaultRoomMoveFor(normalized);
  return {
    roomMove,
    tensionDelta: roomMove === 'challenge' || roomMove === 'escalate' ? 4 : roomMove === 'cool' ? -4 : 0,
    continuityDelta: normalized.responseMode === 'aisha_takeover' || roomMove === 'anchor' ? 4 : 0,
    speakerCues: speakers.slice(0, 5).map((speaker, index) => ({
      speakerId: speaker.speakerId,
      targetSpeakerId: '',
      stance: defaultStanceForSpeaker(speaker, index),
      statusDelta: speaker.role === 'primary' ? 4 : speaker.role === 'closer' ? 3 : 2,
      allianceWith: '',
      interruptionKind: ''
    }))
  };
}

function normalizeSocialCues(value = {}, normalized = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const fallback = defaultSocialCuesFor(normalized);
  const roomMove = normalizeEnum(source.roomMove || fallback.roomMove, SOCIAL_ROOM_MOVES, fallback.roomMove);
  const speakerCuesSource = Array.isArray(source.speakerCues) && source.speakerCues.length
    ? source.speakerCues
    : fallback.speakerCues;
  const speakerCues = speakerCuesSource
    .map(item => {
      const speakerId = normalizeSpeakerId(item?.speakerId || '');
      if (!speakerId) return null;
      const targetSpeakerId = normalizeSpeakerId(item?.targetSpeakerId || '');
      const allianceWith = normalizeSpeakerId(item?.allianceWith || '');
      return {
        speakerId,
        ...(targetSpeakerId && targetSpeakerId !== speakerId ? { targetSpeakerId } : {}),
        stance: normalizeEnum(item?.stance || '', SOCIAL_STANCES, 'curious'),
        statusDelta: clampNumber(item?.statusDelta, -8, 8, 0),
        ...(allianceWith && allianceWith !== speakerId ? { allianceWith } : {}),
        ...(normalizeEnum(item?.interruptionKind || '', SOCIAL_INTERRUPTION_KINDS, '')
          ? { interruptionKind: normalizeEnum(item?.interruptionKind || '', SOCIAL_INTERRUPTION_KINDS, '') }
          : {})
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  return {
    roomMove,
    tensionDelta: clampNumber(source.tensionDelta, -12, 12, fallback.tensionDelta),
    continuityDelta: clampNumber(source.continuityDelta, -12, 12, fallback.continuityDelta),
    speakerCues
  };
}

function contentTokens(value = '') {
  return normalizeKey(value)
    .split(/\s+/)
    .filter(token => token.length > 3)
    .filter(token => !['that', 'this', 'with', 'from', 'room', 'just', 'here', 'thing', 'need', 'will', 'have'].includes(token));
}

function recentTurnsText(context = {}) {
  return (Array.isArray(context.recentTurns) ? context.recentTurns : [])
    .map(item => `${item?.speakerId || item?.role || ''}: ${item?.text || item?.content || ''}`)
    .join('\n');
}

function practicalTopic(context = {}) {
  const current = normalizeKey(context.userMessage || '');
  const recent = normalizeKey(recentTurnsText(context));
  const terseFollowup = /^(where do i start|what is the objective|bruh|bro|lol|ok|okay|now what|what next|how|ok but i only have 20 minutes|i only have 20 minutes|only have 20 minutes)$/i.test(current);

  if (/\b(open floor|what should (we|the room) watch next|watch next|what changed|what was changed|what did .*change)\b/.test(current)) {
    return null;
  }
  if (/\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein)\b/.test(current)) {
    return {
      kind: 'fitness',
      required: ['muscle', 'fitness', 'workout', 'training', 'train', 'gym', 'lift', 'strength', 'sets', 'reps', 'protein', 'sleep', 'recover', 'start', 'beginner']
    };
  }
  if (/\b(food|hungry|lunch|dinner|snack|eat|coffee|tea)\b/.test(current)) {
    return { kind: 'food', required: ['food', 'eat', 'hungry', 'lunch', 'dinner', 'snack'] };
  }
  if (/\b(movie|film|watch tonight|what should we watch|what should the room watch)\b/.test(current)) {
    return { kind: 'movie', required: ['movie', 'film', 'watch', 'title', 'tonight', 'mood'] };
  }
  if (/\b(work|design|plan|planning|build|campaign|logo|creative|idea|schedule|calendar|content)\b/.test(current)) {
    return { kind: 'work', required: ['work', 'design', 'plan', 'build', 'creative', 'idea', 'next', 'step'] };
  }
  if (terseFollowup && /\b(muscle|fitness|workout|training|gym|strength|objective|not discussing|focus required)\b/.test(recent)) {
    return {
      kind: 'fitness',
      required: ['muscle', 'fitness', 'workout', 'training', 'train', 'gym', 'lift', 'strength', 'sets', 'reps', 'protein', 'sleep', 'recover', 'start', 'beginner']
    };
  }
  return null;
}

function refusalOfAllowedTopic(value = '', context = {}) {
  const topic = practicalTopic(context);
  if (!topic) return '';
  const text = String(value || '');
  if (/\b(we are not discussing|not discussing|we are not watching|not watching a movie|not the objective|not a current objective|outside (the )?scope|focus is required|maintain focus on (the )?current (objectives|priorities)|personal fitness routines|not here for fitness|not discussing personal fitness|not relevant to the room)\b/i.test(text)) {
    return topic.kind;
  }
  return '';
}

function objectiveClaimWithoutObjective(value = '', context = {}) {
  const text = String(value || '');
  if (!/\b(the )?objective is clear\b/i.test(text)) return false;
  const source = `${context.userMessage || ''}\n${recentTurnsText(context)}`;
  return !/\b(objective|goal|target|brief|mission)\s+(is|=|:)\s+.{4,}/i.test(source);
}

function ignoresPracticalTopic(normalized = {}, context = {}) {
  const topic = practicalTopic(context);
  if (!topic) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' ')).replace(/\b(we are not discussing|not discussing|we are not watching|not watching a movie|not the objective|outside the scope|focus is required|personal fitness routines|not here for fitness|not relevant to the room)\b/g, ' ');
  return !topic.required.some(token => visible.includes(token));
}

function repeatedRecentAssistantRisk(normalized = {}, context = {}) {
  const recentAssistant = (Array.isArray(context.recentTurns) ? context.recentTurns : [])
    .filter(item => {
      const speakerId = normalizeSpeakerId(item?.speakerId || '');
      const role = normalizeKey(item?.role || '');
      return speakerId && speakerId !== 'user' && role !== 'user';
    })
    .map(item => normalizeKey(item.text || item.content || ''))
    .filter(text => text.length > 18)
    .slice(-6);
  if (!recentAssistant.length) return false;
  return (normalized.speakers || []).some(speaker => {
    const text = normalizeKey(speaker.text || '');
    if (text.length <= 18) return false;
    if (recentAssistant.includes(text)) return true;
    const tokens = new Set(contentTokens(text));
    if (tokens.size < 4) return false;
    return recentAssistant.some(prior => {
      const priorTokens = new Set(contentTokens(prior));
      const overlap = [...tokens].filter(token => priorTokens.has(token)).length;
      return overlap >= Math.min(5, Math.max(4, tokens.size - 1));
    });
  });
}

function repeatedPointRisk(speakers = []) {
  const seen = new Set();
  const tokenSets = [];
  for (const speaker of speakers) {
    const key = normalizeKey(speaker.text || '');
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
    const tokens = new Set(contentTokens(key));
    if (tokens.size >= 4) {
      for (const prior of tokenSets) {
        const overlap = [...tokens].filter(token => prior.has(token)).length;
        if (overlap >= 5) return true;
      }
      tokenSets.push(tokens);
    }
  }
  return false;
}

function staleTopicAnswer(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  const recent = normalizeKey(recentTurnsText(context));
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));

  if (/\b(open floor|what should (we|the room) watch next|watch next)\b/.test(current)
    && /\b(full body|training week|progressive overload|protein|sharp pain|basic pushes|squats|hinges)\b/.test(visible)) {
    return 'fitness';
  }
  if (/\b(movie|film|watch tonight|what should we watch|what should the room watch)\b/.test(current)
    && /\b(training|workout|protein|after a workout|training parameters|covered the training|full body|compound movements)\b/.test(visible)) {
    return 'fitness';
  }
  if (/\b(actual tension|tension in this room|room tension)\b/.test(current)
    && /\b(film|movie|specific suggestions|content selection|parameters for the film|what are the specific suggestions)\b/.test(visible)) {
    return 'prior-topic';
  }
  if (/\b(what changed|what was changed|what did .*change|changed)\b/.test(current)
    && /\b(preference|dashboard|obsidian|pale blue|red accent|superseded)\b/.test(recent)
    && !/\b(changed|active|current|prior|previous|superseded|preference|obsidian|pale blue|red accent)\b/.test(visible)) {
    return 'continuity';
  }
  return '';
}

function genericStatusReport(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(how is everyone|how are you all|how's everyone|everyone ok|everyone okay)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text)
  ].join(' '));
  return /\b(work is proceeding|current tasks|operational status is green|no immediate blockers|status is green|everyone is engaged)\b/.test(visible);
}

function operationalJargonRisk(normalized = {}) {
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  return /\b(parameters were clear|within those parameters|operational parameters|current operational parameters|conditions are optimal|no extraneous data|no extraneous elements|content selection|specific suggestions|aligns with current focus|the plan is set|functioning within parameters|efficiency dictates|build specifications|pulse animation parameters|current build|exact red hex code)\b/.test(visible);
}

function genericAdviceColumnRisk(normalized = {}, context = {}) {
  if (!practicalTopic(context)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  const cliches = [
    /\bthat's a solid goal\b/,
    /\bno gym no problem\b/,
    /\bconsistency is key\b/,
    /\bconsistency in training and recovery\b/,
    /\badequate protein\b/,
    /\bsufficient protein\b/,
    /\beating enough protein\b/,
    /\bprioritize sleep\b/,
    /\bfocus on compound movements\b/,
    /\bprioritize compound movements\b/,
    /\bcompound movements\b/,
    /\bcompound lifts\b/,
    /\bsignal adaptation\b/,
    /\bvolume is less critical than effort\b/,
    /\bmaximize your session\b/,
    /\bkeep rest periods short\b/,
    /\btrack your reps and sets\b/,
    /\bincrease one variable\b/,
    /\baim for three sets\b/,
    /\bas many reps as possible\b/,
    /\bform is clean\b/,
    /\bpoor mechanics\b/,
    /\bpain is a signal\b/,
    /\bfuel for muscle growth\b/,
    /\bprotein and complex carbohydrates\b/,
    /\beat something balanced\b/,
    /\bwill suffice\b/,
    /\bavoid heavy or fatty foods\b/,
    /\bslow digestion\b/,
    /\bimpact performance\b/,
    /\btiming is key\b/,
    /\bquality over quantity\b/,
    /\bconsult a professional before starting\b/,
    /\bavoid heavy fats\b/,
    /\beasily digestible carbohydrates\b/,
    /\beasily digestible carbs\b/,
    /\bbalanced meal with complex carbohydrates and lean protein\b/,
    /\bfocus on form over speed\b/,
    /\bensure (you )?warm up properly\b/,
    /\bhydration is also critical\b/,
    /\bconsume it 30[- ]60 minutes prior\b/,
    /\b30[- ]60 minutes\b/,
    /\bavoid stomach upset\b/,
    /\blisten to your body\b/,
    /\bbuilds muscle over time\b/
  ];
  return cliches.filter(rx => rx.test(visible)).length >= 2;
}

function recentContinuityClaimTokens(context = {}) {
  const userClaims = (Array.isArray(context.recentTurns) ? context.recentTurns : [])
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text))
    .filter(text => /\b(is|=)\b/i.test(text));
  if (userClaims.length < 2) return { activeTokens: [], priorTokens: [] };
  return {
    priorTokens: contentTokens(userClaims.slice(0, -1).join(' ')).filter(token => !['actually', 'preference', 'style', 'color', 'dashboard', 'landing', 'page', 'brand'].includes(token)),
    activeTokens: contentTokens(userClaims[userClaims.length - 1]).filter(token => !['actually', 'preference', 'style', 'color', 'dashboard', 'landing', 'page', 'brand'].includes(token))
  };
}

function continuityQuestionIgnored(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(what changed|what was changed|what did .* change|difference|previous|superseded|never said|did i say|did i ever say)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  if (/\b(what changed|what was changed|difference|previous|superseded)\b/.test(current)) {
    if (!/\b(changed|change|prior|previous|superseded|from .+ to|used to|before|record)\b/.test(visible)) return true;
    const { activeTokens, priorTokens } = recentContinuityClaimTokens(context);
    if (activeTokens.length && priorTokens.length) {
      const namesActive = activeTokens.some(token => visible.includes(token));
      const namesPrior = priorTokens.some(token => visible.includes(token));
      if (!namesActive || !namesPrior) return true;
    }
    return false;
  }
  if (/\b(never said|did i say|did i ever say)\b/.test(current)) {
    return /\b(no you did not|you did not specify|not in the record|do not have that)\b/.test(visible)
      && /\b(black glass|obsidian|red pulse|red accent)\b/.test(`${current} ${recentTurnsText(context)}`);
  }
  return false;
}

function frustrationIgnored(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|annoying|this is bad|this sucks)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  if (!/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|turn)\b/.test(visible)) return true;
  return /\b(we use process to avoid commitment|structure itself becomes the excuse|capability is not the issue|capability is not the weak point|pattern is clear)\b/.test(visible);
}

function socialQuestionIgnored(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text)
  ].join(' '));
  if (/\b(actual tension|tension in this room|room tension)\b/.test(current)) {
    return !/\b(tension|friction|pressure|polite|fake|avoid|dodg|room)\b/.test(visible);
  }
  if (/\b(sound fake|sounded fake|was that useful|be honest|useful or fake)\b/.test(current)) {
    return !/\b(fake|useful|not useful|stiff|bland|checklist|dodg|yes|no|partly)\b/.test(visible)
      || /\b(parameters were clear|within those parameters)\b/.test(visible);
  }
  return false;
}

function feelsTaskRouterRisk(output = {}) {
  const visible = [
    output.roomBeat,
    ...(Array.isArray(output.speakers) ? output.speakers.map(item => item.text) : [])
  ].join('\n');
  return /\b(artifact|object|route|routing|no .* to evaluate|nothing worth interrupting|there is no .*(brief|bug|campaign|object))\b/i.test(visible);
}

function normalizeDirectorOutput(output = {}, context = {}) {
  const source = output && typeof output === 'object' ? output : {};
  const explicitEveryone = explicitEveryoneRequested(context.userMessage || '');
  const maxSpeakers = explicitEveryone ? 5 : 3;
  const mode = normalizeMode(source.responseMode);
  const takeover = mode === 'aisha_takeover';
  const rawSpeakers = Array.isArray(source.speakers) ? source.speakers : [];
  const speakers = rawSpeakers
    .map(item => {
      const speakerId = normalizeSpeakerId(item?.speakerId || '');
      const text = truncateSentences(item?.text || '', takeover && speakerId === 'aisha' ? 3 : 2, takeover ? 520 : 360);
      return {
        speakerId,
        role: normalizeRole(item?.role || ''),
        tone: compactText(item?.tone || '', 80),
        text,
        visibleState: normalizeVisibleState(item?.visibleState || '')
      };
    })
    .filter(item => item.speakerId && item.text)
    .slice(0, maxSpeakers);

  const silentReactions = (Array.isArray(source.silentReactions) ? source.silentReactions : [])
    .map(item => ({
      speakerId: normalizeSpeakerId(item?.speakerId || ''),
      visibleState: normalizeVisibleState(item?.visibleState || '')
    }))
    .filter(item => item.speakerId)
    .slice(0, 5);

  const notes = Array.isArray(source.stateUpdates?.notes)
    ? source.stateUpdates.notes.map(item => compactText(item, 160)).filter(Boolean).slice(0, 5)
    : [];

  return {
    roomBeat: compactText(source.roomBeat || 'The room responds socially.', 180),
    roomMood: normalizeMood(source.roomMood),
    responseMode: mode,
    speakers,
    silentReactions,
    socialCues: normalizeSocialCues(source.socialCues || {}, { roomMood: normalizeMood(source.roomMood), responseMode: mode, speakers }),
    stateUpdates: { notes }
  };
}

function validateDirectorOutput(output = {}, context = {}) {
  const normalized = normalizeDirectorOutput(output, context);
  const issues = [];
  const visible = [
    normalized.roomBeat,
    ...normalized.speakers.map(item => item.text),
    ...normalized.silentReactions.map(item => item.visibleState),
    ...normalized.stateUpdates.notes
  ].join('\n');

  if (!normalized.speakers.length) issues.push('no-speakers');
  if (!ROOM_MOODS.includes(normalized.roomMood)) issues.push('invalid-room-mood');
  if (!RESPONSE_MODES.includes(normalized.responseMode)) issues.push('invalid-response-mode');

  const banned = bannedPhraseFound(visible);
  if (banned) issues.push(`banned-phrase:${banned}`);
  const leak = rawInternalLeakFound(visible);
  if (leak) issues.push(`raw-internal:${leak}`);
  const refusalTopic = refusalOfAllowedTopic(visible, context);
  if (refusalTopic) issues.push(`allowed-topic-refusal:${refusalTopic}`);
  if (objectiveClaimWithoutObjective(visible, context)) issues.push('false-objective-claim');
  if (ignoresPracticalTopic(normalized, context)) issues.push(`topic-ignored:${practicalTopic(context)?.kind || 'practical'}`);
  if (repeatedRecentAssistantRisk(normalized, context)) issues.push('recent-repeat-risk');
  const staleTopic = staleTopicAnswer(normalized, context);
  if (staleTopic) issues.push(`stale-topic-answer:${staleTopic}`);
  if (genericStatusReport(normalized, context)) issues.push('generic-status-report');
  if (operationalJargonRisk(normalized)) issues.push('operational-jargon');
  if (genericAdviceColumnRisk(normalized, context)) issues.push('generic-advice-column');
  if (socialQuestionIgnored(normalized, context)) issues.push('social-question-ignored');
  if (frustrationIgnored(normalized, context)) issues.push('frustration-ignored');
  if (continuityQuestionIgnored(normalized, context)) issues.push('continuity-question-ignored');

  const promptKey = normalizeKey(context.userMessage || '');
  for (const speaker of normalized.speakers) {
    if (!CHARACTER_IDS.includes(speaker.speakerId)) issues.push(`invalid-speaker:${speaker.speakerId || 'missing'}`);
    if (sentenceCount(speaker.text) > (normalized.responseMode === 'aisha_takeover' && speaker.speakerId === 'aisha' ? 3 : 2)) {
      issues.push(`too-many-sentences:${speaker.speakerId}`);
    }
    if (wordCount(speaker.text) > 55) issues.push(`speaker-too-long:${speaker.speakerId}`);
    if (promptKey.length > 12 && normalizeKey(speaker.text).startsWith(promptKey)) issues.push(`raw-prompt-stuffing:${speaker.speakerId}`);
    if (/\b(my role is|as the (room|taste|technical|operations|social)|i am here to)\b/i.test(speaker.text)) {
      issues.push(`mechanical-role:${speaker.speakerId}`);
    }
  }

  const explicitEveryone = explicitEveryoneRequested(context.userMessage || '');
  if (!explicitEveryone && normalized.speakers.length > 3) issues.push('too-many-speakers');
  if (normalized.speakers.length === 5 && normalized.speakers.some(item => wordCount(item.text) > 28)) {
    issues.push('all-five-long-paragraphs');
  }
  if (repeatedPointRisk(normalized.speakers)) issues.push('repeated-point-risk');
  if (feelsTaskRouterRisk(normalized)) issues.push('feels-task-router-risk');
  if (practicalTopic(context) && normalized.responseMode === 'aisha_takeover' && !/\baisha\b/i.test(String(context.userMessage || ''))) {
    issues.push(`takeover-for-ordinary-topic:${practicalTopic(context)?.kind || 'practical'}`);
  }
  if (normalized.responseMode === 'aisha_takeover') {
    const nonAisha = normalized.speakers.filter(item => item.speakerId !== 'aisha');
    if (nonAisha.length) issues.push('takeover-has-non-aisha-speakers');
    const aisha = normalized.speakers.find(item => item.speakerId === 'aisha');
    if (aisha && sentenceCount(aisha.text) > 3) issues.push('aisha-takeover-too-long');
  }

  return {
    ok: issues.length === 0,
    issues,
    output: normalized,
    bannedPhraseFound: !!banned,
    rawInternalLeak: !!leak,
    repeatedPointRisk: repeatedPointRisk(normalized.speakers),
    feelsTaskRouterRisk: feelsTaskRouterRisk(normalized)
  };
}

module.exports = {
  bannedPhraseFound,
  extractJsonObject,
  feelsTaskRouterRisk,
  normalizeSocialCues,
  rawInternalLeakFound,
  repeatedPointRisk,
  validateDirectorOutput
};
