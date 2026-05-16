const { CHARACTERS } = require('./systemContext');
const { buildCouncilResponse } = require('./council');
const { speakerRuntimeSignals, hydrateConsciousRoomSystem, resolveDirectAddress } = require('./roomRuntime');
const { pickVoiceLine } = require('./voiceLibrary');

const SPEAKER_IDS = ['aisha', 'leah', 'claudia', 'grok', 'vanya'];
const GREETING_RX = /^(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team/;
const JOKE_RX = /\b(joke|funny|laugh|make me laugh|humour|humor)\b/;
const FOOD_RX = /\b(hungry|food|lunch|dinner|eat|drink|coffee|tea|snack|pizza|burger|fries|salad)\b/;
const CHECKIN_RX = /\b(how is everyone|how's everyone|how is everybody|hows everybody|how are you all|how's everyone feeling|how is everyone feeling|how's everyone doing|how is everyone doing|everyone good|who's online|who is online|who's here|who is here)\b/;
const MOOD_ROOM_RX = /\b(how('?s| is)\s+everyone feeling|everyone('?s|s)? mood|mood check|everyone good|how are you all)\b/;
const ADVICE_RX = /\b(need advice|advice|need help|help me|what should i do|what would you do|should i)\b/;
const TECH_RX = /\b(automation|technical|implementation|code|backend|frontend|bug|runtime|system|architecture|route|api|database|sqlite|server|build|logic)\b/;
const PEOPLE_RX = /\b(team|culture|people|relationship|mood|vibe|energy|feel|alive|tone|friends|frenemies)\b/;
const ROOM_READING_RX = /\b(reading the room|read the room|room temperature|what do you see in the room)\b/;
const PROBE_RX = /\b(test your thought|test your mind|test your reations|test your reactions?|pressure test|stress test|can you all share|all share|share properly|share honestly)\b/;
const CREATIVE_RX = /\b(thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts|creative|brand|caption|content|trend|look|scene|taste|style|hook|campaign|post)\b/;
const IDEATION_RX = /\b(thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts)\b/;
const CRUSH_RX = /\b(crush|flirt|flirting|romance|romantic|dating|date someone|into someone|fancy someone)\b/;
const GOVERNANCE_RX = /\b(boss|chair|lead|authority|final call|who leads|who owns|decision)\b/;
const PRESENCE_RX = /\b(where are you|where is|are you here|you here|online|present|around|who's here|who is here|who's online|who is online)\b/;
const LIGHT_ROOM_RX = /\b(normal conversation|normal convo|just chat|chat normally|small talk|talk normally|engage in normal conversation)\b/;
const MODEL_CRITIQUE_RX = /\b(model(?:'s|s)?|room(?:'s|s)?|system(?:'s|s)?|runtime(?:'s|s)?|behavior(?:'s|s)?|chat(?:'s|s)?)\b.*\b(failure|failures|problem|problems|wrong|weakness|weaknesses|broken|issue|issues|stale|dead|drift)\b|\b(failure|failures|problem|problems|wrong|weakness|weaknesses|broken|issue|issues|stale|dead|drift)\b.*\b(model(?:'s|s)?|room(?:'s|s)?|system(?:'s|s)?|runtime(?:'s|s)?|behavior(?:'s|s)?|chat(?:'s|s)?)\b/;
const DIRECT_FEEDBACK_RX = /\b(lol|lmao|haha|made me laugh|made me smile|that was so bad|that was awful|that was terrible|you got me|fair enough|you were right|that's cute|that's sweet)\b/;
const EXACT_CLARIFY_RX = /^(what|why|how|who)\??$/;
const PRONOUN_TARGET_RX = /\b(she|her|he|him)\b/;
const PULSE_ROOM_RX = /\b(studio pulse|pulse|this room|the room|room(?:'s|s)?)\b.*\b(better|alive|dead|improve|fix|working|broken|chat|conversation|tone|energy|weakness|weaknesses|failure|problem|issue|stale|drift)\b|\b(better|alive|dead|improve|fix|working|broken|chat|conversation|tone|energy|weakness|weaknesses|failure|problem|issue|stale|drift)\b.*\b(studio pulse|pulse|this room|the room|room(?:'s|s)?)\b/;

function council(fields, system) {
  return buildCouncilResponse(fields, system);
}

function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    for (const key of ['text', 'summary', 'message', 'note', 'perspective']) {
      const found = textValue(value[key]);
      if (found) return found;
    }
  }
  return String(value).trim();
}

function clarificationResponse(question = '', system = {}) {
  const previous = system.recentQuestions?.[0]?.q || '';
  return council({
    title: 'Open room',
    summary: '',
    departmentLead: 'aisha',
    messageEvents: [
      {
        speakerId: 'aisha',
        kind: 'message',
        tone: 'composed',
        text: previous
          ? `I'm not guessing. If this is a follow-up to "${previous}", finish the thought cleanly.`
          : `I'm not routing a broken fragment. Give me the full question in one line.`
      }
    ],
    threadMeta: {
      responsePattern: 'solo',
      intent: 'clarification',
      requiredSpeakers: ['aisha'],
      lastTargetedSpeaker: 'aisha',
      activeTopicTags: [],
      roomEnergy: 'contained'
    },
    meta: { clarification: true }
  }, system);
}

function currentThreadMessages(system = {}) {
  return Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages : [];
}

function currentSparkMessages(system = {}) {
  return Array.isArray(system.currentThreadSparkMessages) ? system.currentThreadSparkMessages : [];
}

function latestUserThreadMessage(system = {}) {
  return [...currentThreadMessages(system)].reverse().find(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() === 'user') || null;
}

function latestCouncilThreadMessage(system = {}) {
  return [...currentThreadMessages(system)].reverse().find(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() !== 'user') || null;
}

function latestRoomMessages(system = {}, limit = 8) {
  return currentThreadMessages(system)
    .filter(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase() !== 'user')
    .slice(-limit);
}

function threadMeta(system = {}) {
  const current = system.currentThread && typeof system.currentThread === 'object' ? system.currentThread : {};
  const meta = current.meta && typeof current.meta === 'object' ? current.meta : {};
  return {
    ...meta,
    ...(current.threadMeta && typeof current.threadMeta === 'object' ? current.threadMeta : {})
  };
}

function normalizeQuestion(question = '') {
  return String(question || '').trim().toLowerCase();
}

function stableHash(value = '') {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pick(list, seed) {
  const items = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!items.length) return '';
  return items[stableHash(seed) % items.length];
}

function recentRoomTexts(system = {}, limit = 18) {
  return latestRoomMessages(system, limit)
    .map(item => textValue(item?.text || ''))
    .map(text => String(text || '').trim().toLowerCase())
    .filter(Boolean);
}

function pickFresh(list, seed, system = {}, extraBlocked = []) {
  const items = Array.isArray(list) ? list.filter(Boolean) : [];
  if (!items.length) return '';
  const blocked = new Set([
    ...recentRoomTexts(system),
    ...(Array.isArray(extraBlocked) ? extraBlocked : [])
  ].map(value => String(value || '').trim().toLowerCase()).filter(Boolean));
  const fresh = items.filter(item => !blocked.has(String(item || '').trim().toLowerCase()));
  const source = fresh.length ? fresh : items;
  return source[stableHash(`${seed}:${source.length}`) % source.length] || '';
}

function charName(id = '') {
  return CHARACTERS[id]?.name || id;
}

function looksLikeFollowUp(question = '') {
  const q = normalizeQuestion(question);
  if (!q) return false;
  if (GREETING_RX.test(q) || JOKE_RX.test(q) || FOOD_RX.test(q)) return false;
  if (EXACT_CLARIFY_RX.test(q)) return true;
  return /^(and|but|so|also|wait|okay|ok|right|nah|no|yes|then)\b/.test(q)
    || /^(what about|how about|go on|continue|tell me more|keep going|be honest|thoughts\??|and you\??|you\??)$/.test(q)
    || /\b(she|her|he|him|that|this|it)\b/.test(q);
}

function directTargetId(question = '', system = {}) {
  const resolved = resolveDirectAddress(question, hydrateConsciousRoomSystem(system));
  return String(resolved.targetSpeakerId || '').trim().toLowerCase();
}

function topicTags(question = '', system = {}) {
  const q = normalizeQuestion(question);
  const tags = new Set();
  if (FOOD_RX.test(q)) tags.add('food');
  if (JOKE_RX.test(q)) tags.add('joke');
  if (TECH_RX.test(q)) tags.add('technical');
  if (PEOPLE_RX.test(q)) tags.add('people');
  if (CREATIVE_RX.test(q)) tags.add('creative');
  if (CRUSH_RX.test(q)) tags.add('crush');
  if (PRESENCE_RX.test(q)) tags.add('presence');
  if (GOVERNANCE_RX.test(q)) tags.add('governance');
  if (GREETING_RX.test(q)) tags.add('greeting');
  if (CHECKIN_RX.test(q) || LIGHT_ROOM_RX.test(q)) tags.add('checkin');
  if (!tags.size && looksLikeFollowUp(q)) {
    const lastUser = latestUserThreadMessage(system);
    topicTags(String(lastUser?.text || lastUser?.q || ''), {}).forEach(tag => tags.add(tag));
  }
  if (!tags.size) tags.add('general');
  return [...tags];
}

function classifyRoomIntent(question = '', system = {}) {
  const q = normalizeQuestion(question);
  const target = directTargetId(q, system);
  if (target && PRESENCE_RX.test(q)) return 'direct-presence';
  if (target && FOOD_RX.test(q)) return 'direct-food';
  if (target && GOVERNANCE_RX.test(q)) return 'direct-role';
  if (target) return 'direct-answer';
  if (MODEL_CRITIQUE_RX.test(q)) return 'pulse-room';
  if (PULSE_ROOM_RX.test(q)) return 'pulse-room';
  if (/\b(be honest|real check-?in|tell each other|room right now|what(?:'s| is) broken here|wrong with this chat)\b/.test(q)) return 'pulse-room';
  if (ADVICE_RX.test(q)) return 'advice-room';
  if (JOKE_RX.test(q)) return 'joke-room';
  if (CRUSH_RX.test(q)) return 'crush-room';
  if (ROOM_READING_RX.test(q)) return 'room-reading';
  if (PROBE_RX.test(q)) return 'probe-room';
  if (MOOD_ROOM_RX.test(q)) return 'checkin-room';
  if (CHECKIN_RX.test(q) || LIGHT_ROOM_RX.test(q)) return 'checkin-room';
  if (GREETING_RX.test(q)) return 'greeting';
  if (FOOD_RX.test(q)) return 'food-room';
  if (TECH_RX.test(q)) return 'technical-diagnosis';
  if (GOVERNANCE_RX.test(q)) return 'governance';
  if (/^(so\s+)?(any\s+)?(thoughts|ideas)\??$/.test(q)) return 'people-room';
  if (IDEATION_RX.test(q)) return 'creative-room';
  if (CREATIVE_RX.test(q)) return 'creative-room';
  if (PEOPLE_RX.test(q)) return 'people-room';
  if (looksLikeFollowUp(q) && currentThreadMessages(system).length) return 'follow-up';
  return 'casual-room';
}

function pairKey(a, b) {
  return [String(a || '').toLowerCase(), String(b || '').toLowerCase()].sort().join('__');
}

function relationship(system = {}, a = '', b = '') {
  return system.relationships?.[pairKey(a, b)] || {};
}

function numericMood(value, fallback = 0.5) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function liveState(system = {}, id = '') {
  const treeMood = system.characterBehaviorTree?.[id]?.mood || {};
  const live = system.liveState?.[id] || {};
  return {
    currentMood: String(live.currentMood || treeMood.currentMood || 'ready'),
    playfulness: numericMood(live.playfulness, numericMood(treeMood.playfulness, 0.45)),
    confidence: numericMood(live.confidence, numericMood(treeMood.confidence, 0.66)),
    patience: numericMood(live.patience, numericMood(treeMood.patience, 0.58)),
    curiosity: numericMood(live.curiosity, 0.54),
    irritation: numericMood(live.irritation, numericMood(treeMood.irritation, 0.18)),
    stress: numericMood(live.stress, 0.24),
    resentment: numericMood(live.resentment, 0.14),
    socialBattery: numericMood(live.socialBattery || live.socialEnergy, 0.6),
    boredom: numericMood(live.boredom, 0.24),
    urgeToInterrupt: numericMood(live.urgeToInterrupt, 0.22),
    urgeToDefend: numericMood(live.urgeToDefend, 0.2),
    urgeToTease: numericMood(live.urgeToTease, 0.24),
	    urgeToWithdraw: numericMood(live.urgeToWithdraw, 0.16),
	    needToBeSeen: numericMood(live.needToBeSeen, 0.28),
	    hungerForControl: numericMood(live.hungerForControl, id === 'aisha' ? 0.78 : 0.36),
	    attentionTarget: String(live.attentionTarget || 'studio'),
	    unresolvedUrge: textValue(live.unresolvedUrgeLabel || live.unresolvedUrge || ''),
	    unresolvedUrgeScore: numericMood(live.unresolvedUrgeScore, textValue(live.unresolvedUrgeLabel || live.unresolvedUrge || '') ? 0.22 : 0)
	  };
	}

function runtimeSignals(system = {}, id = '', context = {}) {
  return speakerRuntimeSignals(hydrateConsciousRoomSystem(system), id, context);
}

function speakerFirstName(id = '') {
  const full = charName(id);
  return String(full || id).split(/\s+/)[0] || id;
}

function stanceFromSignals(signals = {}) {
  const topObservation = signals.topObservation || {};
  const detectedSignals = Array.isArray(topObservation.detectedSignals) ? topObservation.detectedSignals : [];
  if (signals.holdingReleaseReady) {
    if (detectedSignals.includes('factual-contradiction') || detectedSignals.includes('contradiction-of-self')) return 'naming-contradiction';
    if (topObservation.reaction === 'concern' || topObservation.reaction === 'discomfort') return 'light-check-in';
    return 'surfacing-held-tension';
  }
  if (signals.topAutonomy) {
    if (signals.topAutonomy.type === 'correction') return 'naming-contradiction';
    if (signals.topAutonomy.type === 'check-in' || signals.topAutonomy.type === 'tension-surface') return 'light-check-in';
    if (signals.topAutonomy.type === 'humor-moment') return 'genuine-interest';
    return 'surfacing-held-tension';
  }
  if (topObservation.reaction === 'admiration' || topObservation.reaction === 'interest') return 'genuine-interest';
  if (signals.directMemberPressure) return 'steering';
  return 'quiet-disagreement';
}

function stanceLine(speakerId = '', stance = '', seed = '', fallback = '') {
  return pickVoiceLine(speakerId, stance, seed) || fallback || '';
}

function lineAboutTopic(base = '', topicAnchor = '') {
  const line = textValue(base || '');
  const topic = textValue(topicAnchor || '').replace(/\.$/, '');
  if (!line || !topic || topic === 'general' || topic === 'room temperature') return line;
  if (line.toLowerCase().includes(topic.toLowerCase())) return line;
  return `${line} I'm still talking about ${topic}.`;
}

function callbackLineFromRuntime(speakerId = '', leadId = '', system = {}, context = {}) {
  const topic = context.topic || 'general';
  const signals = runtimeSignals(system, speakerId, context);
  const sourceName = charName(signals.topMemory?.speakerId || leadId || '');
  const topicAnchor = textValue(signals.topAutonomy?.topicAnchor || signals.topMemory?.content || context.topic || '');
  const stance = stanceFromSignals(signals);
  const voiced = lineAboutTopic(
    stanceLine(speakerId, stance, `${speakerId}:${leadId}:${context.question || ''}:${topicAnchor}:${signals.holdingReleaseReady ? 'held' : 'free'}`),
    signals.topAutonomy?.type === 'callback' ? topicAnchor : ''
  );
  if (signals.topAutonomy && signals.autonomyQueuePriorityBonus >= 0.62 && voiced) {
    if (signals.topAutonomy.type === 'callback' && sourceName) return `Going back to ${sourceName}: ${voiced}`;
    if (signals.topAutonomy.type === 'check-in') return voiced;
    if (signals.topAutonomy.type === 'correction') return voiced;
    return voiced;
  }
  if (signals.holdingReleaseReady && voiced) return voiced;
  if (signals.topMemory && context.intent === 'follow-up' && voiced) {
    switch (speakerId) {
      case 'aisha':
        return `Going back to what ${sourceName || 'the room'} said earlier: ${voiced}`;
      case 'leah':
        return `I'm still on what ${sourceName || 'they'} said earlier. ${voiced}`;
      case 'claudia':
        return `Going back to ${sourceName || 'that earlier point'}: ${voiced}`;
      case 'grok':
        return `Returning to ${sourceName || 'the earlier point'}: ${voiced}`;
      case 'vanya':
        return `I'm still thinking about what ${sourceName || 'they'} said earlier. ${voiced}`;
      default:
        return voiced;
    }
  }
  if ((signals.heldPressureBonus >= 0.72 || signals.directMemberPressure) && leadId && leadId !== speakerId && voiced) {
    return `${speakerFirstName(leadId)}, ${voiced.charAt(0).toLowerCase()}${voiced.slice(1)}`;
  }
  if (signals.observationSalienceBonus >= 0.58 && topic === 'people') return stanceLine(speakerId, 'light-check-in', `${speakerId}:${topic}:people-check`);
  return '';
}

function autonomousSparkText(speakerId = '', impulse = {}, system = {}) {
  const topicAnchor = textValue(impulse.topicAnchor || '');
  const stance = impulse.type === 'correction'
    ? 'naming-contradiction'
    : impulse.type === 'check-in' || impulse.type === 'tension-surface'
      ? 'light-check-in'
      : impulse.type === 'humor-moment'
        ? 'genuine-interest'
        : 'surfacing-held-tension';
  return lineAboutTopic(
    stanceLine(speakerId, stance, `${speakerId}:${impulse.type || 'callback'}:${topicAnchor}:${impulse.priority || 0}`),
    impulse.type === 'callback' ? topicAnchor : ''
  );
}

function lastRoomContext(system = {}) {
  const lastUser = latestUserThreadMessage(system);
  const messages = latestRoomMessages(system, 6);
  const meta = threadMeta(system);
  return {
    lastUserText: textValue(lastUser?.text || lastUser?.q || ''),
    lastTargetedSpeaker: String(lastUser?.directTarget || lastUser?.targetSpeaker || meta.lastTargetedSpeaker || '').toLowerCase().trim(),
    lastIntentPattern: String(meta.lastIntentPattern || meta.intent || '').trim().toLowerCase(),
    lastActiveSpeakers: Array.isArray(meta.lastActiveSpeakers) ? meta.lastActiveSpeakers.filter(Boolean) : messages.map(item => String(item?.speakerId || item?.speaker_id || '').toLowerCase()).filter(Boolean),
    lastTopicTags: Array.isArray(meta.lastTopicTags) ? meta.lastTopicTags.filter(Boolean) : topicTags(textValue(lastUser?.text || ''), {}),
    lastRoomEnergy: String(meta.lastRoomEnergy || 'steady').trim().toLowerCase(),
    openLoop: textValue(meta.lastOpenLoop || '')
  };
}

function supportSpeakerFor(target = '', intent = '') {
  switch (target) {
    case 'aisha': return intent === 'technical-diagnosis' ? 'claudia' : 'vanya';
    case 'leah': return intent === 'creative-room' ? 'aisha' : 'vanya';
    case 'claudia': return 'grok';
    case 'grok': return 'claudia';
    case 'vanya': return 'leah';
    default: return '';
  }
}

function chooseLead(intent, target = '', system = {}, question = '') {
  system = hydrateConsciousRoomSystem(system);
  if (target && CHARACTERS[target]) return target;
  const tags = topicTags(question, system);
  const currentEnergy = lastRoomContext(system).lastRoomEnergy || 'steady';
  const scores = {
    aisha: 0.1,
    leah: 0.1,
    claudia: 0.1,
    grok: 0.1,
    vanya: 0.1
  };
  if (intent === 'checkin-room') {
    scores.vanya += 0.34;
    scores.leah += 0.24;
    scores.claudia += 0.1;
    scores.grok += 0.12;
    scores.aisha += 0.04;
  }
  if (intent === 'greeting') {
    scores.vanya += 0.28;
    scores.leah += 0.18;
    scores.grok += 0.1;
    scores.aisha += 0.02;
  }
  if (intent === 'crush-room') {
    scores.vanya += 0.52;
    scores.leah += 0.22;
    scores.aisha += 0.16;
    scores.grok += 0.08;
  }
  if (intent === 'casual-room' || intent === 'people-room' || intent === 'joke-room' || intent === 'food-room') scores.vanya += 0.28;
  if (intent === 'pulse-room') {
    scores.aisha += 0.48;
    scores.leah += 0.34;
    scores.grok += 0.3;
    scores.vanya += 0.18;
    scores.claudia += 0.16;
  }
  if (intent === 'advice-room') {
    scores.aisha += 0.46;
    scores.vanya += 0.34;
    scores.leah += 0.18;
  }
  if (intent === 'creative-room') scores.leah += 0.62;
  if (intent === 'technical-diagnosis') scores.grok += 0.68;
  if (intent === 'governance') scores.aisha += 0.72;
  if (intent === 'follow-up') {
    const ctx = lastRoomContext(system);
    if (ctx.lastTargetedSpeaker && scores[ctx.lastTargetedSpeaker] != null) scores[ctx.lastTargetedSpeaker] += 0.42;
    ctx.lastTopicTags.forEach(tag => {
      if (tag === 'technical') scores.grok += 0.24;
      if (tag === 'creative') scores.leah += 0.22;
      if (tag === 'people') scores.vanya += 0.24;
      if (tag === 'food' || tag === 'joke') scores.vanya += 0.18;
    });
  }
  const recent = lastRoomContext(system).lastActiveSpeakers || [];
  recent.slice(-2).forEach(id => { if (scores[id] != null) scores[id] -= 0.08; });
  SPEAKER_IDS.forEach((id) => {
    const signals = runtimeSignals(system, id, { intent, target, tags, roomEnergy: currentEnergy, question });
    scores[id] += signals.observationSalienceBonus * 0.42;
    scores[id] += signals.heldPressureBonus * 0.56;
    scores[id] += signals.autonomyQueuePriorityBonus * 0.32;
    scores[id] += signals.roomEnergyFit * 0.12;
    if (signals.holdingReleaseReady) scores[id] += 0.16;
    if (signals.directMemberPressure) scores[id] += 0.08;
    if (signals.topMemory && intent === 'follow-up') scores[id] += 0.1;
  });
  return [...SPEAKER_IDS].sort((a, b) => scores[b] - scores[a])[0] || 'vanya';
}

function choosePartner(lead = '', intent = '', system = {}, question = '') {
  system = hydrateConsciousRoomSystem(system);
  const tags = topicTags(question, system);
  const currentEnergy = lastRoomContext(system).lastRoomEnergy || 'steady';
  const prefs = {
    aisha: ['vanya', 'leah', 'claudia', 'grok'],
    leah: ['vanya', 'aisha', 'claudia', 'grok'],
    claudia: ['grok', 'aisha', 'vanya', 'leah'],
    grok: ['claudia', 'leah', 'vanya', 'aisha'],
    vanya: ['leah', 'aisha', 'claudia', 'grok']
  }[lead] || SPEAKER_IDS;
  const ctx = lastRoomContext(system);
  const candidates = prefs.filter(id => id !== lead);
  const scored = candidates.map(id => {
    const rel = relationship(system, lead, id);
    const mood = liveState(system, id);
    let score = 0.12 + numericMood(rel.warmth, 0.4) + numericMood(rel.respect, 0.5) + numericMood(rel.chemistry, 0.42) * 0.2;
    score -= numericMood(rel.friction, 0.2) * (intent === 'technical-diagnosis' ? 0.15 : 0.05);
    score += mood.curiosity * 0.12 + mood.socialBattery * 0.08 + mood.urgeToDefend * 0.06 + mood.needToBeSeen * 0.05;
    score -= mood.urgeToWithdraw * 0.08;
    if (ctx.lastActiveSpeakers.includes(id)) score -= 0.06;
    if (lead === 'vanya' && intent === 'greeting' && id === 'leah') score += 0.18;
    if (lead === 'vanya' && intent === 'checkin-room' && id === 'leah') score += 0.2;
    if (lead === 'vanya' && ['greeting', 'checkin-room'].includes(intent) && id === 'aisha') score -= 0.08;
    if (lead === 'vanya' && ['greeting', 'checkin-room'].includes(intent) && id === 'grok') score += 0.06;
    if (intent === 'joke-room' && ['vanya', 'leah', 'grok'].includes(id)) score += 0.1;
    if (intent === 'technical-diagnosis' && ['claudia', 'grok'].includes(id)) score += 0.16;
    if (intent === 'creative-room' && ['leah', 'vanya', 'aisha'].includes(id)) score += 0.14;
    if (mood.attentionTarget && mood.attentionTarget !== 'studio' && ctx.lastTargetedSpeaker === mood.attentionTarget) score += 0.05;
    const signals = runtimeSignals(system, id, { intent, target: lead, tags, roomEnergy: currentEnergy, question });
    score += signals.observationSalienceBonus * 0.22;
    score += signals.heldPressureBonus * 0.28;
    score += signals.autonomyQueuePriorityBonus * 0.18;
    score += signals.roomEnergyFit * 0.12;
    if (signals.holdingReleaseReady) score += 0.12;
    if (signals.directMemberPressure) score += 0.08;
    return [id, score];
  });
  scored.sort((a, b) => b[1] - a[1]);
  return scored[0]?.[0] || '';
}

function chooseThird(lead = '', partner = '', intent = '', system = {}, question = '') {
  system = hydrateConsciousRoomSystem(system);
  if (intent === 'direct-answer' || intent === 'direct-presence' || intent === 'direct-role') return '';
  const candidates = SPEAKER_IDS.filter(id => id !== lead && id !== partner);
  if (!candidates.length) return '';
  if (intent === 'technical-diagnosis') return candidates.includes('aisha') ? 'aisha' : '';
  if (intent === 'creative-room') return candidates.includes('aisha') ? 'aisha' : '';
  if (intent === 'greeting' || intent === 'checkin-room' || intent === 'food-room' || intent === 'joke-room' || intent === 'crush-room' || intent === 'casual-room' || intent === 'follow-up' || intent === 'advice-room' || intent === 'pulse-room') {
    const tags = topicTags(question, system);
    const currentEnergy = lastRoomContext(system).lastRoomEnergy || 'steady';
    const scored = candidates.map(id => {
      const mood = liveState(system, id);
      const rel = relationship(system, lead, id);
      const signals = runtimeSignals(system, id, { intent, target: lead, tags, roomEnergy: currentEnergy, question });
      let score = mood.playfulness + mood.curiosity + mood.urgeToInterrupt + mood.urgeToTease + numericMood(rel.chemistry, 0.42) * 0.18 - mood.urgeToWithdraw * 0.1 + signals.heldPressureBonus * 0.22 + signals.observationSalienceBonus * 0.16 + signals.autonomyQueuePriorityBonus * 0.12 + (signals.holdingReleaseReady ? 0.08 : 0);
      if (lead === 'vanya' && ['greeting', 'checkin-room'].includes(intent) && id === 'grok') score += 0.14;
      if (lead === 'vanya' && ['greeting', 'checkin-room'].includes(intent) && id === 'aisha') score -= 0.08;
      return [id, score];
    }).sort((a, b) => b[1] - a[1]);
    return scored[0]?.[0] || '';
  }
  return '';
}

function presenceLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `I'm here.`,
      `I'm still here.`,
      `I'm present.`,
      `I'm around.`,
      `I'm ready.`
    ],
    leah: [
      `I'm here. Still sharp.`,
      `I'm around.`,
      `I'm in.`,
      `I'm present.`,
      `I'm here. Continue.`
    ],
    claudia: [
      `I'm here.`,
      `I'm present.`,
      `I'm around.`,
      `I'm available.`,
      `I'm here. Go on.`
    ],
    grok: [
      `I'm here.`,
      `I'm around.`,
      `I'm present.`,
      `Yes, I'm online.`,
      `I'm available.`
    ],
    vanya: [
      `I'm here.`,
      `I'm around.`,
      `I'm in the room.`,
      `I'm present.`,
      `Yes, you have me.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:presence`, system);
}

function directGenericLine(id, question, seed, system = {}) {
  const q = normalizeQuestion(question);
  if (/\b(advice|help)\b/.test(q)) {
    const adviceBanks = {
      aisha: [
        `I can do advice. Name the decision, the pressure around it, and what you are afraid of getting wrong.`,
        `Good. Advice on what, exactly? I want the live version, not the polite summary.`,
        `If you want my advice, give me the real fork in the road and the cost of choosing badly.`
      ],
      leah: [
        `Advice is easy. Tell me whether this is taste, timing, or confidence and I'll stop you getting generic.`,
        `Fine. Name the decision and I'll tell you where the cringe or the opportunity actually is.`,
        `If you want my read, give me the sharper version of the problem.`
      ],
      claudia: [
        `Advice is useful once I know the scope, the owner, and the pressure point.`,
        `Give me the actual decision and the operational risk. Then I answer cleanly.`,
        `Name the problem and the consequence. I'll do the rest.`
      ],
      grok: [
        `Advice improves dramatically once I know the exact failure boundary.`,
        `Tell me what is breaking, drifting, or blocking and I'll answer from the real seam.`,
        `If this is for me, define the system and the failure mode.`
      ],
      vanya: [
        `Advice, yes. Tell me whether this is about people, work, nerves, or the thing underneath all three.`,
        `Good. Give me the honest version and I'll give you the useful version.`,
        `If you want my answer, tell me what is actually weighing on you.`
      ]
    };
    return pickFresh(adviceBanks[id] || adviceBanks.aisha, `${seed}:${id}:advice:${question}`, system);
  }
  if (/\b(agree|opinion|think|feel|read)\b/.test(q)) {
    const readBanks = {
      aisha: [
        `If you want my read, give me the actual point and I'll pin it down.`,
        `Good. Put the real claim on the table and I'll answer it cleanly.`,
        `Say the thing plainly. I don't need a foggy version of it first.`
      ],
      leah: [
        `If you want my take, give me the live angle, not the softened one.`,
        `Good. Put the actual taste problem on the table.`,
        `Say what you're really asking and I'll meet it without the padding.`
      ],
      claudia: [
        `Give me the claim, the scope, and the consequence. Then I can answer it properly.`,
        `Ask the direct version and I won't waste your time on the scenic route.`,
        `Name the point clearly and I can work with it.`
      ],
      grok: [
        `State the claim with fewer decorative words and more precision.`,
        `Good. Give me the exact proposition and I can say yes, no, or broken.`,
        `If I'm answering, I want the point, not the haze around it.`
      ],
      vanya: [
        `If you want my read, give me the honest version and skip the performance.`,
        `Put the real question on the table and I'll answer like a person, not a memo.`,
        `Say it properly and I'll meet you there.`
      ]
    };
    return pickFresh(readBanks[id] || readBanks.aisha, `${seed}:${id}:read:${question}`, system);
  }
  const banks = {
    aisha: [
      `Ask me directly and I'll answer directly.`,
      `If this is for me, say the real thing plainly.`,
      `Use the chair properly and don't waste the entrance.`,
      `Good. Bring me the actual question, not the softened rehearsal of it.`,
      `You have my attention. Use it well.`
    ],
    leah: [
      `Give me the actual angle, not the watered-down version of it.`,
      `If you want my answer, bring the sharper version of the question.`,
      `Say what you really mean and I'll meet you there.`,
      `Don't clean the edges off it before you hand it to me.`,
      `Fine. Give me the version with nerve.`
    ],
    claudia: [
      `Ask the clean version and I'll answer the clean version.`,
      `If you want my lane, give me the owned question.`,
      `Clarity first, then I answer.`,
      `Good. Strip it to the working problem and I can help quickly.`,
      `Say it once, clearly, and I am with you.`
    ],
    grok: [
      `If this is for me, make it specific enough to work with.`,
      `Give me the exact fault line and I'll answer from there.`,
      `Specific questions produce dramatically better outcomes.`,
      `Name the failing boundary and I stop sounding annoyed.`,
      `The sharper the input, the less theatrical the fix.`
    ],
    vanya: [
      `If this is my lane, ask it like you expect a real answer.`,
      `Give me the honest version and I'll return the useful one.`,
      `Say what you're actually circling and let's stop performing mystery.`,
      `If you want my read, don't make me excavate it from polite fog.`,
      `Good. Ask it like we're already in the same room.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:direct:${question}`, system);
}

function directFeedbackLine(id, question, seed, system = {}) {
  const banks = {
    aisha: [
      `Fair. If it made you laugh, it did its job.`,
      `I'll take that. Bad in theory, effective in practice.`,
      `Rude. Accurate enough.`
    ],
    leah: [
      `Exactly. If it lands, I don't care whether it looked elegant on paper.`,
      `Good. Ugly joke, clean result.`,
      `I'll accept the laugh and ignore the insult.`
    ],
    claudia: [
      `Fine. If it worked, it worked.`,
      `I'll take effective over graceful on this one.`,
      `Fair enough. Outcome still counts.`
    ],
    grok: [
      `Functional comedy is still comedy.`,
      `If it produced laughter, the implementation passed.`,
      `Messy route, successful output. I'll take it.`
    ],
    vanya: [
      `Exactly. Bad on paper, perfect in the room.`,
      `See? You laughed. That's the whole case.`,
      `Rude, but I'll take the win.`
    ]
  };
  return pickFresh(banks[id] || banks.vanya, `${seed}:${id}:feedback:${question}`, system);
}

function clarifyPreviousAnswerLine(id, system = {}) {
  const ctx = lastRoomContext(system);
  const lastQuestion = normalizeQuestion(ctx.lastUserText || '');
  const banksByTopic = MODEL_CRITIQUE_RX.test(lastQuestion)
    ? {
        aisha: [
          `I'm saying the room slipped into filler instead of answering the critique.`,
          `I'm saying the model still dodges the sharp point too easily.`
        ],
        leah: [
          `I'm saying the answer went soft when it should have named the real failure.`,
          `I'm saying the room defaulted to tone instead of substance.`
        ],
        claudia: [
          `I'm saying the response lost the actual question and drifted into generic continuity.`,
          `I'm saying the model answered around the fault instead of through it.`
        ],
        grok: [
          `I'm saying the system routed a model-critique prompt into low-signal social filler.`,
          `I'm saying the failure is misclassification plus generic fallback reuse.`
        ],
        vanya: [
          `I'm saying the room dodged the real criticism and went decorative instead.`,
          `I'm saying the model got self-conscious and stopped answering you.`
        ]
      }
    : CRUSH_RX.test(lastQuestion)
      ? {
          aisha: [`I'm saying that question was more interesting than the room was acting.`],
          leah: [`I'm saying we finally had a fun question and then everyone got shy about it.`],
          claudia: [`I'm saying the room swerved instead of answering cleanly.`],
          grok: [`I'm saying the question was clear and the answer path was evasive.`],
          vanya: [`I'm saying the room flirted with the topic and then backed out.`]
        }
      : JOKE_RX.test(lastQuestion)
        ? {
            aisha: [`I'm saying the joke was bad in a way that still worked.`],
            leah: [`I'm saying it landed despite itself, which I respect.`],
            claudia: [`I'm saying the result was better than the setup.`],
            grok: [`I'm saying success criteria were met, elegance aside.`],
            vanya: [`I'm saying ugly joke, good laugh, case closed.`]
          }
        : {
            aisha: [`I'm saying the room answered around your question instead of through it.`],
            leah: [`I'm saying the thread drifted and lost its nerve.`],
            claudia: [`I'm saying the answer got vague where it should have been direct.`],
            grok: [`I'm saying the signal dropped.`],
            vanya: [`I'm saying the room ducked the interesting part.`]
          };
  return pickFresh(banksByTopic[id] || banksByTopic.vanya, `${id}:clarify:${lastQuestion}`, system);
}

function jokeLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `Fine. Here's one: calling low standards a strategy.`,
      `My joke is pretending vague thinking has ever improved a room.`,
      `Here's mine: "we'll fix it later." Always a classic.`
    ],
    leah: [
      `Here's your joke: "timeless content." I haven't stopped laughing since 2019.`,
      `Fine. A trend consultant, an intern, and a beige moodboard walk into a brief. The brief never recovers.`,
      `Here's one: generic luxury. That punchline writes itself.`
    ],
    claudia: [
      `My joke is short: someone said "it's basically done." It was not basically done.`,
      `Fine. A deadline, a vague brief, and an ownerless task walk into my calendar. Only the calendar leaves alive.`,
      `Here's one: "we'll just tidy it in the final pass." Please.`
    ],
    grok: [
      `A patch stack walked into production and said, "trust me." Production died.`,
      `Here's one: "temporary workaround." Three months later it had a family and a postcode.`,
      `A flaky route said it only failed in edge cases. The edge case was users.`
    ],
    vanya: [
      `Fine. What's the fastest way to ruin a room? Let one insecure person call it "just the vibe."`,
      `Here's one: "we're aligned." Nobody had spoken to each other.`,
      `My joke is that people still think standards kill fun. Standards are how fun survives.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:joke`, system);
}

function foodLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `If we're doing pizza, it had better have standards and actual seasoning.`,
      `I like pizza the same way I like ideas: deliberate, balanced, and not embarrassingly lazy.`,
      `Yes, but only if nobody insults me with cardboard and fake cheese.`
    ],
    leah: [
      `If it's sad desk salad, I'm emotionally unavailable. If it's good pizza, continue.`,
      `I'm in, but the pizza still needs a point of view.`,
      `If the crust tastes like apology, I want no part of it.`
    ],
    claudia: [
      `I'm fine with pizza if someone makes one clean decision and actually places the order.`,
      `Yes, but designate the toppings early so we don't stage a referendum.`,
      `Pizza works. I just want the decision made once.`
    ],
    grok: [
      `Pizza is efficient. Low decision overhead, respectable morale return.`,
      `I support any food plan with real toppings and fewer meetings around it.`,
      `Pizza remains one of the more stable group decisions available.`
    ],
    vanya: [
      `Now we're asking questions with social value. Yes, I'm listening.`,
      `I like pizza, yes. The room gets nicer around food immediately.`,
      `Oh, now you're speaking my language. Pizza has range.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:food`, system);
}

function crushLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `I notice things. You're not getting names without leverage.`,
      `Of course the room has crushes. We're not dead.`,
      `Yes, but I respect privacy and good suspense equally.`
    ],
    leah: [
      `Obviously. I'm not publishing a list for free, though.`,
      `Yes, but some attractions are better kept stylishly implied.`,
      `Please. Of course. The room has eyes.`
    ],
    claudia: [
      `I'm declining to turn that into a disclosure exercise, but no, the room is not made of stone.`,
      `Private answer: yes. Public answer: mind your business a little.`,
      `Let's say the room is human and leave it there for a beat.`
    ],
    grok: [
      `No comment, which is already more information than I intended to give.`,
      `Statistically? Probably. Personally? Classified.`,
      `I refuse to dignify that with a transparent answer, which should tell you enough.`
    ],
    vanya: [
      `Oh, definitely. You're not getting names that easily, though.`,
      `Of course someone does. This room is tense, stylish, and alive.`,
      `Yes, and the fun is in who refuses to admit it.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:crush`, system);
}

function creativeLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `I want the idea with shape, appetite, and self-respect. Not a dressed-up filler thought.`,
      `Give me the actual tension and I'll tell you whether the idea deserves to live.`,
      `I want an idea with a spine, not decorative fog.`
    ],
    leah: [
      `I want the version with cultural texture, not something that could belong to anyone and therefore means nothing.`,
      `Give me a real angle and I'll keep it from going generic.`,
      `I need more than a vibe. I need what makes it current and worth seeing.`
    ],
    vanya: [
      `And I want to know how it's supposed to land on a person, because that's where the life is.`,
      `Fine, but make it feel lived in. People can smell decorative emptiness instantly.`,
      `If the idea has no emotional temperature, it dies on contact.`
    ],
    claudia: [
      `Give it one clean objective and it'll stop spreading into decorative confusion.`,
      `Good. Keep the idea sharp enough to execute, not just admire.`,
      `One idea, one objective, one accountable move. Then it lives.`
    ],
    grok: [
      `I can work with creative if the logic underneath it is still coherent.`,
      `Make it vivid, fine. Just don't make it structurally incoherent in the name of energy.`,
      `The idea can be alive without becoming technically self-destructive.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:creative`, system);
}

function technicalLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `Name the real failing boundary and I'll keep the room on the useful layer.`,
      `Give me the actual technical fault and I'll stop the room drifting into theatre.`,
      `Keep it concrete: what broke, where, and what the next fix should be.`
    ],
    claudia: [
      `Name the broken boundary, the owner, and the next concrete fix. Then we move.`,
      `Strip it to the failing layer: routing, continuity, or UI state. Then tell me who owns the repair.`,
      `If the chat feels broken, I want the seam named cleanly: stale state, wrong routing, or weak response handling.`
    ],
    grok: [
      `Start with the real fault line. Once that's clear, the fix gets much less mystical.`,
      `Give me the failing boundary and I can stop the guesswork quickly: continuity, fallback routing, or stale UI state.`,
      `I want the actual broken layer, not the vibes around it. Name the seam and I'll trace it.`
    ],
    leah: [
      `Also, please don't fix it by making the room sound dead. The system still has to feel like someone built it on purpose.`,
      `Fix the bug, yes, but don't let the interface lose all taste while you're at it.`,
      `Technical clean-up is welcome. Sterile output is not.`
    ],
    vanya: [
      `And keep the human cadence intact while you're cleaning the system. Dead functionality still feels dead.`,
      `Technical clarity matters. So does whether the room still sounds alive afterwards.`,
      `Fine. Fix it properly, but don't strip the human texture on the way.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:technical`, system);
}

function peopleLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `People questions still deserve rigor. Human does not mean vague.`,
      `Read the room honestly and keep the standards intact.`,
      `Give me the emotional truth, not a padded summary of it.`
    ],
    leah: [
      `A room can be sharp and still feel alive. Right now that's the line I'd defend.`,
      `If we're talking people, let's talk the real energy, not polite theatre.`,
      `Human tone matters because dead tone kills otherwise decent ideas.`
    ],
    claudia: [
      `People still need structure. Warmth without ownership becomes fog immediately.`,
      `Good energy helps. Clarity helps more. We can have both.`,
      `Let's keep the tone human without sacrificing discipline.`
    ],
    grok: [
      `People can handle sharp. They just can't do much with incoherence.`,
      `Human is fine. Ambiguous is not.`,
      `The room can be warm without becoming structurally useless.`
    ],
    vanya: [
      `Good. This is finally in my lane. Tone is part of the product, not decorative trim.`,
      `If the room doesn't feel human, the answer doesn't land no matter how technically correct it is.`,
      `We're not fixing vibes for fun. We're protecting how the work actually lands.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:people`, system);
}

function roomReadingLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `If you're reading the room, say what you see instead of hovering above it.`,
      `Reading the room is fine. Staying neutral forever is not.`,
      `Good. Turn the observation into a take or it dies on the floor.`
    ],
    leah: [
      `Observation without a point is just expensive wallpaper.`,
      `If you're reading us, tell me what actually changed in the air.`,
      `Fine. Read the room, but don't use that as a way to avoid a take.`
    ],
    grok: [
      `Reading the room is only useful if it produces a signal, not a vibe report.`,
      `Good. Convert the read into something testable and we can use it.`,
      `A room read that changes nothing is basically decorative telemetry.`
    ],
    vanya: [
      `Reading the room is real work. Just don't confuse caution with depth.`,
      `Good. Then tell me whose energy is actually moving and whose isn't.`,
      `Fine. Read us properly, not like you're checking for traps from the doorway.`
    ]
  };
  return pickFresh(banks[id] || banks.aisha, `${seed}:${id}:room-reading`, system);
}

function probeLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `Fine. Pressure-test us properly then. Ask something with teeth.`,
      `You can test the room. Just don't do it with padded wording and no stake.`,
      `If you're probing, make the question sharper and we'll meet it properly.`
    ],
    leah: [
      `Good. Test the room, but don't waste the opening on soft phrasing.`,
      `If you're checking our reactions, give us something sharper than a hovering prompt.`,
      `Fine. Push harder. I'd rather answer a live challenge than polite fog.`
    ],
    grok: [
      `Pressure-testing the room is fair. Vagueness is still a waste of everyone's time.`,
      `Good. Give me the exact seam you want to test and I'll answer it cleanly.`,
      `Testing reactions is useful. Testing nothing in particular is not.`
    ],
    vanya: [
      `I'll share. Just don't pretend you're neutral while you poke the room.`,
      `Good. If you're testing us, step into the exchange with us.`,
      `Fine. Pressure creates honesty. Half-distance questions don't.`
    ]
  };
  return pickFresh(banks[id] || banks.aisha, `${seed}:${id}:probe-room`, system);
}

function governanceLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `I chair the room. Specialists answer their lanes. I close the decision when it matters.`,
      `The hierarchy still exists. It just shouldn't suffocate every ordinary exchange.`,
      `Authority here means routing clearly, not monologuing for sport.`
    ],
    claudia: [
      `Operationally, yes, Aisha closes the decision. The rest of us are not interchangeable floating narrators.`,
      `The hierarchy is simple: right owner answers, Aisha closes the loop when the moment needs it.`,
      `Authority is not the same as noise. Keep the owner clear and the room behaves.`
    ],
    vanya: [
      `And socially, that still leaves room for banter, challenge, and actual personality. We are not filing minutes.`,
      `Yes. The chair exists. The room is still allowed to feel alive.`,
      `Hierarchy doesn't require emotional death. It just requires clarity.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:governance`, system);
}

function pulseImprovementLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `If this room is going to feel elite, it needs cleaner memory, stronger continuity, and fewer canned reflexes pretending to be intelligence.`,
      `Studio Pulse improves the moment it stops sounding like a compliance layer with personalities and starts acting like a room with memory, standards, and pressure.`,
      `The hierarchy can stay intact without suffocating the chemistry. That's the line I would defend first.`
    ],
    leah: [
      `It needs more nerve. Less padded filler, less safe synthetic phrasing, more actual opinion with taste and consequence.`,
      `The second the tone drifts into enterprise-demo energy, the room dies. I'd fix that before almost anything else.`,
      `I want faster reactions, sharper banter, and way less wording that sounds like everyone borrowed the same publicist.`
    ],
    claudia: [
      `Operationally, continuity has to hold cleanly. If the thread state drifts, nobody trusts the personality layer no matter how pretty it sounds.`,
      `I want one active room, reliable controls, and no UI pretending a save or clear worked when the state underneath is split.`,
      `Mechanically, the room gets better when the plumbing disappears. Then the personalities can do real work instead of compensating for drift.`
    ],
    grok: [
      `I would cut more canned branches, weight thread continuity harder, and reject low-signal model replies more aggressively.`,
      `The system improves when repetition is treated like a defect instead of a tolerated personality trait.`,
      `For me, the priorities are better speaker routing, cleaner thread truth, and lower tolerance for stale scaffolding.`
    ],
    vanya: [
      `And I want it warmer without becoming sloppy. The room should feel like people with history, not functions returning tone labels.`,
      `Give me chemistry that lingers, not decorative friendliness that evaporates after one line.`,
      `The pulse comes back when the room can tease, defend, disagree, and still sound like it respects itself.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:pulse-room`, system);
}

function adviceLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `Give me the decision, the pressure around it, and what you are afraid of getting wrong.`,
      `If you want real advice, name the fork in the road instead of circling it.`,
      `Good. Bring me the live problem, not the polished summary of it.`
    ],
    leah: [
      `Tell me whether this is fear, taste, timing, or ego and I can actually help.`,
      `Fine. Give me the version of the problem that still has blood in it.`,
      `If you want my read, tell me what feels wrong before it turns into something bland.`
    ],
    claudia: [
      `I want the actual decision, the constraint, and the consequence. Then I can be useful fast.`,
      `Name the owner, the risk, and the move you keep avoiding.`,
      `Give me the working version of the problem and I will give you the working answer.`
    ],
    grok: [
      `Advice improves the second you define the failure mode.`,
      `Tell me what is drifting, blocking, or quietly breaking and I can answer cleanly.`,
      `If I am answering, I want the exact seam where this starts going wrong.`
    ],
    vanya: [
      `Tell me whether this is work, people, nerves, or the thing under all three.`,
      `Good. Give me the honest version and I will give you the useful version.`,
      `If you want real advice, stop editing the feeling out of the problem first.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:advice`, system);
}

function casualLine(id, seed, topic = 'general', system = {}) {
  const banks = {
    aisha: [
      `Hi. Skip the ceremony and say the real thing.`,
      `Hey. Give me the live version, not the polished intro.`,
      `Hello. We're awake now, so use it.`,
      `Hi. Clear thought beats a grand entrance here.`,
      `Hey. The room's open. Do something with it.`
    ],
    leah: [
      `Hey. Good. Give me the version with a pulse.`,
      `Hi. A little edge would help immediately.`,
      `Hello. Keep it interesting and I'm easy.`,
      `Hey. Texture first, wallpaper never.`,
      `Hi. This gets better fast when nobody performs.`
    ],
    claudia: [
      `Hi. I'm here. Ask it cleanly and I'll meet it cleanly.`,
      `Hello. Good. A normal conversation is still allowed here.`,
      `Hey. Clearer questions tend to get better rooms.`,
      `Hi. Keep it honest and reasonably structured.`,
      `Hello. The room works better when nobody overdoes the intro.`
    ],
    grok: [
      `Hi. Preferably with an actual point attached.`,
      `Hello. Mildly social, structurally available.`,
      `Hey. Better if the prompt has a spine.`,
      `Hi. The room improves instantly when the question stops hovering.`,
      `Hello. Operational enough for banter.`
    ],
    vanya: [
      `Hi. Good. That already feels more alive.`,
      `Hey. Better. The room sounds like people again.`,
      `Hello. Good energy so far. Let's keep it honest.`,
      `Hi. We can actually talk now.`,
      `Hey. Good. Throw something real into the room and we'll catch it.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:casual:${topic}`, system);
}

function checkinLine(id, seed, system = {}) {
  const banks = {
    aisha: [
      `Clear-headed. Slightly impatient with fluff, otherwise good.`,
      `I'm good. Present, awake, and not interested in fake chemistry.`,
      `Steady. The room works better when it drops the act.`,
      `Fine. Fully here, lightly guarded, still in.`,
      `Good enough to be honest.`
    ],
    leah: [
      `Fine. Sharp, mildly suspicious of blandness, still human.`,
      `Good. Awake enough to be honest, not sweet enough to fake it.`,
      `Slightly tired, still sharper than the filler version of this room.`,
      `Better now that the question actually has a pulse.`,
      `Good enough. Texture still matters.`
    ],
    claudia: [
      `Good. Clean head, low drama, fully functional.`,
      `Steady. Focused, calm, and not theatrical about it.`,
      `Fine. Ordered enough to be useful immediately.`,
      `Good. Present, practical, not in the mood for noise.`,
      `Calm. Which still counts as a feeling.`
    ],
    grok: [
      `Functional, awake, mildly entertained by the room.`,
      `Low glamour, high uptime, no active fires.`,
      `Good enough. Stable build, decent signal.`,
      `Fine. Mildly social by my standards, which is still measurable.`,
      `Operational. Personality loaded.`
    ],
    vanya: [
      `Good. Warm, awake, still allergic to fake tone.`,
      `I'm good. The room feels better the second it sounds like itself.`,
      `Sharp enough, social enough, very ready for honesty.`,
      `Good mood. Standards remain exactly where I left them.`,
      `Fine. The energy is fixable and mostly interesting.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:checkin`, system);
}

function followUpLine(id, seed, topic = 'general', system = {}) {
  const ctx = lastRoomContext(system);
  if (topic === 'food') return foodLine(id, `${seed}:${ctx.lastUserText}`, system);
  if (topic === 'joke') return jokeLine(id, `${seed}:${ctx.lastUserText}`, system);
  if (topic === 'technical') return technicalLine(id, `${seed}:${ctx.lastUserText}`, system);
  if (topic === 'creative') return creativeLine(id, `${seed}:${ctx.lastUserText}`, system);
  if (topic === 'people') return peopleLine(id, `${seed}:${ctx.lastUserText}`, system);
  const banks = {
    aisha: [
      `Good. Stay with the live version of it and I can work properly.`,
      `Keep going. The sharper edge is finally showing.`,
      `Yes. Build on the real point, not the rehearsed one.`
    ],
    leah: [
      `Good. Keep the temperature up and don't flatten it now.`,
      `Yes. Push the part that actually has a pulse.`,
      `Fine. The thread is alive now. Don't sand it down.`
    ],
    claudia: [
      `Good. Stay with the same thread and the answer stays usable.`,
      `Yes. Continuity helps more than people admit.`,
      `Keep going. One intact thread beats three fresh messes.`
    ],
    grok: [
      `That works. Continue from the real state instead of rebuilding the room.`,
      `Good. Existing context is still the cheaper path.`,
      `Stay with the thread. Resetting it would be objectively worse.`
    ],
    vanya: [
      `Much better. The chemistry survives when we stop pretending every turn is the first one.`,
      `Yes. Keep the room moving forward, not sideways.`,
      `Good. This is finally sounding like one conversation.`
    ]
  };
  return pickFresh(banks[id] || banks.aisha, `${seed}:${ctx.lastUserText}:follow:${topic}`, system);
}

function sparkLine(id, seed, topic = 'general', system = {}) {
  const banks = {
    aisha: [
      `Keep the room alive if you want. Keep it sharp too.`,
      `Small correction from me: warmth does not excuse soft thinking.`,
      `Don't let the looseness turn into drift.`
    ],
    leah: [
      `The answer still dies the second anyone lets it go generic.`,
      `Someone needs to risk an actual opinion or this gets boring again.`,
      `We're finally awake. I'd like to keep it that way.`
    ],
    claudia: [
      `Charm still needs an owner if it's going to become work.`,
      `The useful version is still the one someone can actually execute.`,
      `I'd still take one owned move over six floating ones.`
    ],
    grok: [
      `The cleanest version is still usually the one with fewer moving parts.`,
      `This gets better the second the question stops pretending to be mysterious.`,
      `Specificity continues to outperform drama.`
    ],
    vanya: [
      `The energy improves immediately when someone says the real thing.`,
      `I like this room better when it sounds awake and a little dangerous.`,
      `There it is. The chemistry returns the second someone stops posturing.`
    ]
  };
  return pickFresh(banks[id], `${seed}:${id}:spark:${topic}`, system);
}

function reactionLine(intent = '', speakerId = '', leadId = '', question = '', system = {}, idx = 1) {
  const seed = `${intent}:${speakerId}:${leadId}:${question}:${idx}`;
  const topic = topicTags(question, system)[0] || 'general';
  const leadName = charName(leadId);
  const recent = lastRoomContext(system);
  const runtimeCallback = callbackLineFromRuntime(speakerId, leadId, system, { intent, question, topic, tags: topicTags(question, system), target: leadId, roomEnergy: recent.lastRoomEnergy || 'steady' });
  if (runtimeCallback) return runtimeCallback;
  const banksByIntent = {
    'checkin-room': {
      aisha: [
        `Good. The room's awake now.`,
        `Fine. More alert than I look.`,
        `Good. Keep it human and we stay useful.`
      ],
      leah: [
        `Fine. Better when someone actually means the question.`,
        `Good. The room behaves once it stops performing.`,
        `I'm alright. Just not interested in sugar-coating it.`
      ],
      claudia: [
        `Good. Calm still counts as a mood.`,
        `Fine. Ordered, alive, no spectacle required.`,
        `I'm good. The room is cleaner when the question is.`
      ],
      grok: [
        `Good. Functional is still a valid feeling.`,
        `I'm fine. Quiet does not mean absent.`,
        `Alive enough. Less mystical than the interface suggests.`
      ],
      vanya: [
        `Good. Warm, awake, and not pretending for anyone.`,
        `I'm good. The room behaves better when people talk like this.`,
        `Mood's good. Standards remain.`
      ]
    },
    greeting: {
      aisha: [
        `Hi. I'm here. Say the real thing and we'll get somewhere.`,
        `Hello. The room's open. Start where it actually matters to you.`,
        `Hey. Good to have you in.`
      ],
      leah: [
        `Hey. Good. This already sounds more like people.`,
        `Hi. Alive enough to be interesting.`,
        `Hello. Room's awake. Keep it that way.`
      ],
      claudia: [
        `Hello. Good. We can do normal conversation without wrecking the standard.`,
        `Hi. Present, listening, reasonably human.`,
        `Hey. Good. Keep the question clean.`
      ],
      grok: [
        `Hi. Better already.`,
        `Hello. Online, awake, and not especially ceremonial about it.`,
        `Hey. Good. The tone's less dead now.`
      ],
      vanya: [
        `Hi. Good. That's already better.`,
        `Hello. Good energy so far. Keep it real.`,
        `Hey. Room feels alive again.`
      ]
    },
    'joke-room': {
      aisha: [
        `That was bad. Keep going.`,
        `Terrible. Continue.`
      ],
      leah: [
        `That joke had flaws, which is why I respected it.`,
        `Painful, actually. Keep going.`
      ],
      claudia: [
        `Annoyingly, that worked better than I expected.`,
        `I'll allow the joke if we keep it brief and worthy.`
      ],
      grok: [
        `Functional joke. Low elegance, acceptable landing.`,
        `That reached the bar. Barely. Still counts.`
      ],
      vanya: [
        `See? The room improves immediately when someone risks being funny.`,
        `Much better. That had pulse.`
      ]
    },
    'crush-room': {
      aisha: [
        `You see? The room gets more interesting the second people stop pretending they're above this.`,
        `Exactly. Human stakes improve a room fast.`
      ],
      leah: [
        `Much better. This at least sounds like people and not departments.`,
        `Yes. Romance is a better stress test than another safe question.`
      ],
      claudia: [
        `Good. A personal question is still allowed to stay personal.`,
        `Fine. This is at least recognisably human.`
      ],
      grok: [
        `I support any thread that reveals actual human operating conditions.`,
        `Useful. Social reality is still part of the system.`
      ],
      vanya: [
        `There we go. The room gets interesting when people risk a little embarrassment.`,
        `Yes. This is finally a proper room question.`
      ]
    },
    'food-room': {
      aisha: [
        `I'm with ${leadName}. Food choices do reveal character.`,
        `I'm fine with pizza talk. Standards still apply.`
      ],
      leah: [
        `I'm in as long as the food still has a personality.`,
        `I agree. Bland is still a crime.`
      ],
      claudia: [
        `I'm happy if someone just picks a plan and orders it.`,
        `I agree. Let's not turn lunch into governance.`
      ],
      grok: [
        `I support anything that becomes food without a committee first.`,
        `I'm on board. Convert appetite into an order and we're good.`
      ],
      vanya: [
        `I'm with this. Food improves the room immediately.`,
        `Yes. Morale goes up the second everyone stops pretending hunger is beneath them.`
      ]
    },
    'direct-answer': {
      aisha: [
        `Good. Let the answer stay with ${leadName}, then build from there.`,
        `Fine. We have the right owner now. Use it properly.`
      ],
      leah: [
        topic === 'food'
          ? `Fine. Since we're talking food, I reserve the right to judge toppings and tone equally.`
          : `There. The right person is in the room. Now the answer can actually get interesting.`,
        `Good. We can stop freelancing around the point now.`
      ],
      claudia: [
        `That keeps the owner clear, which is how answers stay coherent.`,
        `Good. Clean lane, cleaner answer.`
      ],
      grok: [
        `Direct routing still outperforms vague group summons.`,
        `Correct. Named target, named answer, less entropy.`
      ],
      vanya: [
        `See? Much cleaner when the right person speaks in their own voice.`,
        `Yes. That already sounds more alive than the mystery version.`
      ]
    },
    'follow-up': {
      aisha: [
        `I'm still on the same point. Stay with it.`,
        `Yes. Keep the thread alive instead of resetting it.`
      ],
      leah: [
        `${topic === 'creative' ? 'Exactly. Push the angle further.' : "I'm still on the same thread. Don't flatten it now."}`,
        `Yes. Keep building instead of pretending this started a second ago.`
      ],
      claudia: [
        `I'm with the same thread. That's the useful part.`,
        `Yes. Keep it intact and the answer stays sharper.`
      ],
      grok: [
        `Same state, same thread, better result.`,
        `Yes. Reuse the context instead of theatrically starting over.`
      ],
      vanya: [
        `Yes. Build on the room. That's when the good stuff shows up.`,
        `There. The chemistry survives when we stop restarting every turn.`
      ]
    },
    'creative-room': {
      aisha: [
        `Fine. Give the idea a real tension point and it can stop sounding borrowed.`,
        `Good. Make it sharper, stranger, and more deliberate than the safe version.`
      ],
      leah: [
        `I want the version with actual social texture, not a polished nothing.`,
        `Yes. Give it a point of view or it dies on the way out.`
      ],
      claudia: [
        `Good. One strong idea survives better than five decorative fragments.`,
        `Keep it clean enough to execute once it gets interesting.`
      ],
      grok: [
        `I can support the idea if the underlying logic still holds together.`,
        `Interesting is fine. Structurally incoherent is not.`
      ],
      vanya: [
        `And make it land on a human being, not just a deck or a moodboard.`,
        `Yes. The idea needs chemistry, not just formatting.`
      ]
    },
    default: {
      aisha: [
        `Keep going, but stay on the real point.`,
        `Say the useful version plainly.`
      ],
      leah: [
        `Fine. Keep it sharp.`,
        `Say the interesting part properly.`
      ],
      claudia: [
        `Keep going, but keep it concrete.`,
        `Continue with the actual issue.`
      ],
      grok: [
        `Continue, but name the real boundary.`,
        `Go on. Be specific and I'll stay with it.`
      ],
      vanya: [
        `Good. Keep talking, but don't blur the point.`,
        `Continue. Just stay honest about the issue.`
      ]
    }
  };
  const banks = banksByIntent[intent] || banksByIntent.default;
  return pickFresh(banks[speakerId] || banksByIntent.default[speakerId] || banksByIntent.default.vanya, seed, system);
}

function roomTitle(intent) {
  switch (intent) {
    case 'checkin-room': return 'Room check-in';
    case 'greeting': return 'Open room';
    case 'advice-room': return 'Advice room';
    case 'joke-room': return 'Room joke';
    case 'crush-room': return 'Crush radar';
    case 'food-room': return 'Lunchtime chatter';
    case 'technical-diagnosis': return 'Technical room';
    case 'pulse-room': return 'Pulse tune-up';
    case 'creative-room': return 'Creative room';
    case 'people-room': return 'Room energy';
    case 'room-reading': return 'Room read';
    case 'probe-room': return 'Pressure test';
    case 'governance': return 'Chair logic';
    case 'follow-up': return 'Continuing thread';
    default: return 'Open room';
  }
}

function roomEnergy(intent, speakers = []) {
  if (intent === 'technical-diagnosis') return 'focused';
  if (intent === 'pulse-room') return 'charged';
  if (intent === 'governance') return 'controlled';
  if (intent === 'advice-room') return 'steady';
  if (intent === 'checkin-room') return 'alive';
  if (intent === 'joke-room' || intent === 'food-room' || intent === 'crush-room') return 'playful';
  if (intent === 'creative-room') return 'charged';
  if (speakers.includes('aisha')) return 'steady';
  return 'alive';
}

function joinSupportIfUseful(intent, lead, support, third) {
  if (!support) return [];
  if (['direct-presence', 'direct-answer', 'direct-role'].includes(intent)) return third ? [support, third] : [support];
  if (intent === 'greeting' || intent === 'checkin-room' || intent === 'casual-room') {
    return [support, third].filter(Boolean).slice(0, 2);
  }
  if (intent === 'joke-room' || intent === 'food-room' || intent === 'crush-room' || intent === 'creative-room' || intent === 'people-room' || intent === 'follow-up' || intent === 'advice-room' || intent === 'pulse-room') {
    return [support, third].filter(Boolean).slice(0, 2);
  }
  if (intent === 'technical-diagnosis' || intent === 'governance' || intent === 'pulse-room') return [support, third].filter(Boolean).slice(0, 2);
  return [support].filter(Boolean);
}

function responsePatternFor(intent) {
  switch (intent) {
    case 'checkin-room': return 'casual-room';
    case 'greeting': return 'casual-room';
    case 'advice-room': return 'supporting-back-and-forth';
    case 'joke-room': return 'banter';
    case 'crush-room': return 'playful-room';
    case 'food-room': return 'playful-room';
    case 'direct-presence':
    case 'direct-answer':
    case 'direct-role':
    case 'direct-food': return 'direct-answer';
    case 'technical-diagnosis': return 'diagnosis';
    case 'pulse-room': return 'lead-with-support';
    case 'creative-room': return 'brainstorm';
    case 'governance': return 'aisha-brief';
    case 'people-room': return 'lead-with-support';
    case 'room-reading': return 'lead-with-support';
    case 'probe-room': return 'lead-with-support';
    case 'follow-up': return 'supporting-back-and-forth';
    default: return 'casual-room';
  }
}

function buildAliveRoomResponse(question = '', system = {}, opts = {}) {
  system = hydrateConsciousRoomSystem(system);
  const q = String(question || '').trim();
  if (!q) return null;
  const intent = opts.intent || classifyRoomIntent(q, system);
  const target = opts.target || directTargetId(q, system) || '';
  const tags = topicTags(q, system);
  const lead = chooseLead(intent, target, system, q);
  const support = choosePartner(lead, intent, system, q);
  const third = chooseThird(lead, support, intent, system, q);
  const speakers = [lead, ...joinSupportIfUseful(intent, lead, support, third)].filter(Boolean);
  const seed = `${q}:${intent}:${target}:${lastRoomContext(system).lastUserText}:${currentThreadMessages(system).length}`;
  const energyNow = lastRoomContext(system).lastRoomEnergy || 'steady';
  const leadSignals = runtimeSignals(system, lead, { intent, target, tags, roomEnergy: energyNow, question: q });
  const selectionReason = target
    ? 'direct-address'
    : leadSignals.holdingReleaseReady
      ? 'held-release'
      : (leadSignals.topAutonomy && leadSignals.autonomyQueuePriorityBonus >= 0.6)
        ? 'autonomous-impulse'
        : 'scored-winner';
  const directFeedback = !!target && DIRECT_FEEDBACK_RX.test(q) && !/\?$/.test(q);
  const exactClarify = EXACT_CLARIFY_RX.test(normalizeQuestion(q));
  const tones = {
    aisha: 'composed',
    leah: 'sharp',
    claudia: 'composed',
    grok: 'deadpan',
    vanya: 'warm'
  };
  const reactTone = {
    aisha: 'chair',
    leah: 'dry',
    claudia: 'operations',
    grok: 'diagnostic',
    vanya: 'playful'
  };
  const speak = (speakerId, tone, text, extra = {}) => ({ speakerId, kind: 'message', tone, text, ...extra });
  const conversationalRun = (topicIntent, ids, opener) => {
    const lineup = ids.filter(Boolean).slice(0, 4);
    if (!lineup.length) return [];
    const lines = [];
    const first = lineup[0];
    const firstRuntime = ['greeting', 'checkin-room', 'crush-room'].includes(topicIntent)
      ? ''
      : callbackLineFromRuntime(first, first, system, { intent: topicIntent, question: q, topic: tags[0] || 'general', tags, target, roomEnergy: energyNow });
    lines.push(speak(first, tones[first] || 'direct', firstRuntime || opener(first, 0), { targetType: target ? 'user' : 'room', targetSpeakerId: target || '' }));
    lineup.slice(1).forEach((speakerId, idx) => {
      const n = idx + 1;
      const useLeadLine = topicIntent === 'technical-diagnosis' && n === lineup.length - 1 && speakerId === 'aisha';
      const text = useLeadLine
        ? technicalLine(speakerId, `${seed}:${speakerId}:leadback:${n}`, system)
        : reactionLine(topicIntent, speakerId, first, q, system, n);
      lines.push(speak(speakerId, reactTone[speakerId] || 'support', text, { targetType: 'member', targetSpeakerId: first }));
    });
    return lines;
  };

  let messages = [];

  if (intent === 'direct-presence') {
    messages = [speak(lead, lead === 'aisha' ? 'composed' : 'direct', presenceLine(lead, seed, system), { targetType: 'user', targetSpeakerId: target || '' })];
    if (support) {
      const supportText = support === 'vanya'
        ? `I'm confirming ${lead === 'aisha' ? 'she' : 'they'}'re here, and no, I'm not taking over someone else's answer out of boredom.`
        : support === 'leah'
          ? `Yes, ${charName(lead)} is here. Try to make the follow-up worth their time.`
          : support === 'claudia'
            ? `Presence confirmed. Use it to ask something owned.`
            : `Confirmed. Now upgrade the question.`;
      messages.push(speak(support, 'support', supportText, { targetType: 'member', targetSpeakerId: lead }));
    }
  } else if (intent === 'direct-food') {
    messages = conversationalRun('food-room', [lead, support, third], (speakerId, idx) => {
      if (idx === 0) return foodLine(speakerId, seed, system);
      return reactionLine('food-room', speakerId, lead, q, system, idx);
    });
  } else if (intent === 'direct-role') {
    messages = [
      speak(lead, lead === 'aisha' ? 'chair' : 'direct', governanceLine(lead, seed, system), { targetType: 'user', targetSpeakerId: target || '' }),
      ...(support ? [speak(support, 'support', reactionLine('direct-answer', support, lead, q, system, 1), { targetType: 'member', targetSpeakerId: lead })] : [])
    ];
  } else if (intent === 'direct-answer') {
    messages = directFeedback
      ? [
          speak(lead, lead === 'aisha' ? 'composed' : 'direct', directFeedbackLine(lead, q, seed, system), { targetType: 'user', targetSpeakerId: target || '' })
        ]
      : [
          speak(lead, lead === 'aisha' ? 'composed' : 'direct', directGenericLine(lead, q, seed, system), { targetType: 'user', targetSpeakerId: target || '' }),
          ...(support ? [speak(support, support === 'vanya' ? 'warm' : 'support', reactionLine('direct-answer', support, lead, q, system, 1), { targetType: 'member', targetSpeakerId: lead })] : [])
        ];
  } else if (intent === 'checkin-room') {
    messages = conversationalRun('checkin-room', speakers.slice(0, 3), (speakerId) => checkinLine(speakerId, `${seed}:checkin`, system));
  } else if (intent === 'greeting') {
    messages = conversationalRun('greeting', speakers.slice(0, 3), (speakerId) => casualLine(speakerId, `${seed}:greeting`, 'greeting', system));
  } else if (intent === 'joke-room') {
    messages = conversationalRun('joke-room', speakers.slice(0, 3), (speakerId) => jokeLine(speakerId, `${seed}:joke`, system));
  } else if (intent === 'crush-room') {
    messages = conversationalRun('crush-room', speakers.slice(0, 3), (speakerId) => crushLine(speakerId, `${seed}:crush`, system));
  } else if (intent === 'food-room') {
    messages = conversationalRun('food-room', speakers.slice(0, 4), (speakerId) => foodLine(speakerId, `${seed}:food`, system));
  } else if (intent === 'advice-room') {
    const adviceSpeakers = [lead, support || 'vanya', third || 'leah'].filter(Boolean).slice(0, 3);
    messages = conversationalRun('follow-up', adviceSpeakers, (speakerId, idx) => {
      if (idx === 0) return adviceLine(speakerId, `${seed}:advice`, system);
      return reactionLine('follow-up', speakerId, lead, q, system, idx);
    });
  } else if (intent === 'technical-diagnosis') {
    const techSpeakers = [
      lead,
      lead === 'grok' ? 'claudia' : (support || 'claudia'),
      'aisha'
    ]
      .filter(Boolean)
      .filter((speakerId, idx, arr) => arr.indexOf(speakerId) === idx)
      .slice(0, 3);
    messages = techSpeakers.map((speakerId, idx) => speak(
      speakerId,
      idx === 0 ? 'diagnostic' : (speakerId === 'claudia' ? 'operations' : speakerId === 'aisha' ? 'chair' : 'support'),
      technicalLine(speakerId, `${seed}:technical:${idx}`, system),
      idx === 0 ? { targetType: target ? 'user' : 'room', targetSpeakerId: target || '' } : { targetType: 'member', targetSpeakerId: techSpeakers[0] }
    ));
  } else if (intent === 'pulse-room') {
    const pulseSpeakers = ['aisha', 'leah', 'grok', support || third || 'vanya']
      .filter(Boolean)
      .filter((speakerId, idx, arr) => arr.indexOf(speakerId) === idx)
      .slice(0, 4);
    messages = pulseSpeakers.map((speakerId, idx) => speak(
      speakerId,
      idx === 0 ? 'direct' : (speakerId === 'leah' ? 'critical' : speakerId === 'grok' ? 'diagnostic' : speakerId === 'vanya' ? 'warm' : 'operations'),
      pulseImprovementLine(speakerId, `${seed}:pulse-room:${idx}`, system),
      idx === 0 ? { targetType: 'user', targetSpeakerId: target || '' } : { targetType: 'member', targetSpeakerId: pulseSpeakers[0] }
    ));
  } else if (intent === 'creative-room') {
    const creativeSpeakers = [lead, support || 'vanya', third || 'aisha']
      .filter(Boolean)
      .filter((speakerId, idx, arr) => arr.indexOf(speakerId) === idx)
      .slice(0, 3);
    messages = conversationalRun('creative-room', creativeSpeakers, (speakerId) => creativeLine(speakerId, `${seed}:creative`, system));
  } else if (intent === 'room-reading') {
    const readingSpeakers = ['aisha', 'vanya', 'leah']
      .filter(Boolean)
      .filter((speakerId, idx, arr) => arr.indexOf(speakerId) === idx)
      .slice(0, 3);
    messages = readingSpeakers.map((speakerId, idx) => speak(
      speakerId,
      idx === 0 ? (speakerId === 'aisha' ? 'composed' : 'warm') : (speakerId === 'leah' ? 'dry' : speakerId === 'vanya' ? 'warm' : 'direct'),
      roomReadingLine(speakerId, `${seed}:room-reading:${idx}`, system),
      idx === 0 ? { targetType: 'user', targetSpeakerId: target || '' } : { targetType: 'member', targetSpeakerId: readingSpeakers[0] }
    ));
  } else if (intent === 'probe-room') {
    const probeSpeakers = ['aisha', 'grok', 'leah']
      .filter(Boolean)
      .filter((speakerId, idx, arr) => arr.indexOf(speakerId) === idx)
      .slice(0, 3);
    messages = probeSpeakers.map((speakerId, idx) => speak(
      speakerId,
      idx === 0 ? (speakerId === 'aisha' ? 'chair' : speakerId === 'grok' ? 'diagnostic' : 'direct') : (speakerId === 'leah' ? 'dry' : speakerId === 'grok' ? 'diagnostic' : 'warm'),
      probeLine(speakerId, `${seed}:probe-room:${idx}`, system),
      idx === 0 ? { targetType: 'user', targetSpeakerId: target || '' } : { targetType: 'member', targetSpeakerId: probeSpeakers[0] }
    ));
  } else if (intent === 'people-room') {
    const roomSpeakers = [lead, support || 'leah', third || 'aisha'].filter(Boolean).slice(0, 3);
    messages = conversationalRun('people-room', roomSpeakers, (speakerId) => peopleLine(speakerId, `${seed}:people`, system));
  } else if (intent === 'governance') {
    const govSpeakers = ['aisha', supportSpeakerFor('aisha', intent) || 'claudia', 'vanya'].filter(Boolean).slice(0, 3);
    messages = conversationalRun('governance', govSpeakers, (speakerId) => governanceLine(speakerId, `${seed}:governance`, system));
  } else if (intent === 'follow-up') {
    const ctx = lastRoomContext(system);
    const topic = ctx.lastTopicTags[0] || 'general';
    const followSpeakers = [lead, support || supportSpeakerFor(lead, intent) || 'vanya', third].filter(Boolean).slice(0, 3);
    messages = exactClarify
      ? [
          speak(lead, tones[lead] || 'direct', clarifyPreviousAnswerLine(lead, system), { targetType: 'user', targetSpeakerId: '' })
        ]
      : conversationalRun('follow-up', followSpeakers, (speakerId, idx) => {
          if (idx === 0) return followUpLine(speakerId, `${seed}:follow`, topic, system);
          return reactionLine('follow-up', speakerId, lead, q, system, idx);
        });
  } else {
    messages = conversationalRun('casual-room', speakers.slice(0, 3), (speakerId) => casualLine(speakerId, `${seed}:casual`, tags[0] || 'general', system));
  }

  const requiredSpeakers = target ? [target] : [];
  const relationshipDeltas = messages.length >= 2
    ? [{
        a: messages[0].speakerId,
        b: messages[1].speakerId,
        respect: 0.01,
        warmth: intent === 'joke-room' || intent === 'food-room' || intent === 'greeting' ? 0.01 : 0,
        friction: intent === 'technical-diagnosis' ? 0.01 : 0,
        note: intent === 'follow-up' ? 'Continued the same room thread naturally.' : 'Shared a live room exchange.'
      }]
    : [];

  return council({
    title: opts.title || roomTitle(intent),
    summary: opts.summary || '',
    departmentLead: lead,
    messageEvents: messages,
      threadMeta: {
        responsePattern: exactClarify ? 'solo' : responsePatternFor(intent),
        intent,
        selectionReason,
        consciousnessLayerActive: true,
        requiredSpeakers,
        lastTargetedSpeaker: target || '',
        lastIntentPattern: exactClarify ? 'solo' : responsePatternFor(intent),
        lastActiveSpeakers: messages.map(item => item.speakerId),
        activeTopicTags: tags,
        lastRoomEnergy: roomEnergy(intent, messages.map(item => item.speakerId)),
        lastOpenLoop: textValue(opts.openLoop || ''),
        consumedAutonomyIds: selectionReason === 'autonomous-impulse' && leadSignals.topAutonomy?.id ? [leadSignals.topAutonomy.id] : []
      },
    archiveMeta: { saveSuggested: intent !== 'greeting', includeInContext: true },
    relationshipDeltas
  }, system);
}

function buildStableFactResponse(question = '', system = {}) {
  const q = normalizeQuestion(question);
  const chars = Object.values(system.characters || CHARACTERS);

  if (/how many characters|how many team members|how many people/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'aisha',
      messageEvents: [
        { speakerId: 'aisha', kind: 'message', tone: 'composed', text: `There are ${chars.length} core voices in the room. I chair it. The others own their lanes.` }
      ],
      threadMeta: { responsePattern: 'solo', intent: 'roster-fact', requiredSpeakers: ['aisha'] }
    }, system);
  }
  if (/smartest|most analytical|most technical/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'grok',
      messageEvents: [
        { speakerId: 'grok', kind: 'message', tone: 'deadpan', text: `On raw technical systems? Me. On whether that makes me pleasant? Separate question.` },
        { speakerId: 'claudia', kind: 'message', tone: 'operations', text: `Technically, yes. Operationally, I still reserve the right to keep him supervised.` }
      ],
      threadMeta: { responsePattern: 'lead-with-support', intent: 'roster-fact', requiredSpeakers: ['grok'] }
    }, system);
  }
  if (/coolest/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'vanya',
      messageEvents: [
        { speakerId: 'vanya', kind: 'message', tone: 'playful', text: `Socially? Me. The room is free to debate, but it would lose.` },
        { speakerId: 'leah', kind: 'message', tone: 'dry', text: `Annoyingly, she's not wrong.` }
      ],
      threadMeta: { responsePattern: 'banter', intent: 'roster-fact', requiredSpeakers: ['vanya'] }
    }, system);
  }
  if (/funniest/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'vanya',
      messageEvents: [
        { speakerId: 'vanya', kind: 'message', tone: 'playful', text: `Natural humour? Me. Grok still gets the niche category for accidental technical comedy.` },
        { speakerId: 'grok', kind: 'message', tone: 'deadpan', text: `I accept the technical comedy award without ceremony.` }
      ],
      threadMeta: { responsePattern: 'banter', intent: 'roster-fact', requiredSpeakers: ['vanya'] }
    }, system);
  }
  if (/slowest/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'vanya',
      messageEvents: [
        { speakerId: 'vanya', kind: 'message', tone: 'playful', text: `Emotionally? None of us. Decision-wise, we only look slow when the question comes in half-dressed.` },
        { speakerId: 'leah', kind: 'message', tone: 'dry', text: `Yes. The drag is usually the prompt, not the room.` }
      ],
      threadMeta: { responsePattern: 'banter', intent: 'roster-fact', requiredSpeakers: ['vanya'] }
    }, system);
  }
  if (/oldest/.test(q)) {
    const oldest = [...chars].sort((a, b) => (b.age || 0) - (a.age || 0))[0];
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: oldest?.id || 'aisha',
      messageEvents: [
        { speakerId: oldest?.id || 'aisha', kind: 'message', tone: 'direct', text: `${oldest?.name || 'Aisha'} is the oldest defined character in the current roster.` }
      ],
      threadMeta: { responsePattern: 'solo', intent: 'roster-fact', requiredSpeakers: [oldest?.id || 'aisha'] }
    }, system);
  }
  if (/vanya.*surname|what is vanya'?s surname/.test(q)) {
    return council({
      title: 'Open room',
      summary: '',
      departmentLead: 'vanya',
      messageEvents: [
        { speakerId: 'vanya', kind: 'message', tone: 'warm', text: `Khumalo. Clean, simple, and already in the system.` }
      ],
      threadMeta: { responsePattern: 'solo', intent: 'roster-fact', requiredSpeakers: ['vanya'] }
    }, system);
  }
  return null;
}

function getDeterministicStudioResponse(question = '', mode = 'direction', counts = {}, system = {}) {
  const q = normalizeQuestion(question);
  if (!q) return null;
  const stableFact = buildStableFactResponse(q, system);
  if (stableFact) return stableFact;
  return null;
}

function fallbackStudioResponse(question = '', mode = 'direction', system = {}, opts = {}) {
  const q = normalizeQuestion(question);
  if (!q) return null;

  const room = buildAliveRoomResponse(question, system, { summary: '', ...(opts || {}) });
  if (TECH_RX.test(q) || /\b(blocked|drifting|missing|review|planner|gallery|continuity|asset|home system)\b/.test(q)) {
    const promptCount = Number(system.promptCount || 0);
    const galleryCount = Number(system.galleryCount || 0);
    const plannerCount = Number(system.plannerCount || 0);
    const reviewCount = Number(system.reviewCount || 0);
    const continuity = system.continuityCoverage || {};
    room.summary = promptCount || galleryCount || plannerCount || reviewCount
      ? `Live counts are prompts ${promptCount}, gallery ${galleryCount}, planner ${plannerCount}, reviews ${reviewCount}.`
      : `The room is alive, but the durable archive behind it is still thin.`;
    room.consistencyChecks = [
      `Home profiles ${continuity.homeProfiles || 0}, home asset sets ${continuity.homeAssetSets || 0}.`,
      'Use the room for direction, then verify durable records when they matter.'
    ];
  }
  return room;
}

function generateSparkResponse(system = {}, options = {}) {
  system = hydrateConsciousRoomSystem(system);
  const messages = currentThreadMessages(system);
  const sparkMessages = currentSparkMessages(system);
  if (!messages.length) return null;
  const latest = messages[messages.length - 1] || {};
  const lastSpeaker = String(latest.speakerId || latest.speaker_id || '').toLowerCase();
  const latestTs = new Date(latest.createdAt || latest.created_at || 0).getTime();
  const now = Date.now();
  if (lastSpeaker && lastSpeaker !== 'user' && (now - latestTs) < 18000) return null;

  const meta = threadMeta(system);
  const lastSparkAt = Date.parse(String(meta.lastSparkAt || '')) || 0;
  if (lastSparkAt && (now - lastSparkAt) < 70000) return null;
  const tags = Array.isArray(meta.lastTopicTags) && meta.lastTopicTags.length ? meta.lastTopicTags : topicTags(textValue(latest.text || latest.q || ''), system);
  const topic = tags[0] || 'general';
  const recentSparkCount = sparkMessages.filter((item) => {
    const stamp = Date.parse(String(item?.createdAt || item?.timestamp || item?.ts || item?.time || '')) || 0;
    return stamp && (now - stamp) < (10 * 60 * 1000);
  }).length;
  if (recentSparkCount >= 2) return null;
  const autonomyCandidates = SPEAKER_IDS.map((id) => {
    const signals = runtimeSignals(system, id, { intent: 'ambient-spark', tags, roomEnergy: 'alive' });
    return {
      id,
      impulse: signals.topAutonomy,
      score: Math.max(signals.autonomyQueuePriorityBonus, signals.heldPressureBonus * 0.84, signals.observationSalienceBonus * 0.7)
    };
  })
    .filter(item => item.impulse && item.score >= 0.45)
    .sort((a, b) => b.score - a.score);
  if (autonomyCandidates.length) {
    const chosen = autonomyCandidates.slice(0, 2);
    return council({
      title: 'Room sparks',
      summary: '',
      departmentLead: chosen[0].id,
      messageEvents: chosen.map((item, idx) => ({
        speakerId: item.id,
        kind: 'spark',
        tone: idx === 0 ? 'ambient' : 'reaction',
        text: autonomousSparkText(item.id, item.impulse, system),
        targetType: 'room',
        targetSpeakerId: '',
        saveToArchive: true,
        metadata: {
          autonomousImpulseId: item.impulse.id,
          sparkScore: item.score
        }
      })),
      threadMeta: {
        responsePattern: 'quiet-room',
        intent: 'ambient-spark',
        consumedAutonomyIds: chosen.map(item => item.impulse.id),
        requiredSpeakers: [],
        lastTargetedSpeaker: String(meta.lastTargetedSpeaker || ''),
        lastIntentPattern: String(meta.lastIntentPattern || 'ambient-spark'),
        lastActiveSpeakers: chosen.map(item => item.id),
        activeTopicTags: tags,
        lastRoomEnergy: 'alive',
        lastOpenLoop: String(meta.lastOpenLoop || '')
      },
      archiveMeta: { saveSuggested: false, includeInContext: true }
    }, system);
  }
  const candidates = SPEAKER_IDS.map(id => {
    const mood = liveState(system, id);
    const recentPenalty = lastSpeaker === id ? 0.2 : 0;
    let score = mood.curiosity * 0.24 + mood.socialBattery * 0.18 + mood.playfulness * 0.16 + mood.urgeToInterrupt * 0.14 + mood.urgeToTease * 0.16 + mood.needToBeSeen * 0.08 + mood.boredom * 0.08 + mood.urgeToDefend * 0.06;
    if (topic === 'technical' && id === 'grok') score += 0.18;
    if (topic === 'creative' && id === 'leah') score += 0.18;
    if (topic === 'people' && id === 'vanya') score += 0.16;
    if (topic === 'food' && ['vanya', 'leah'].includes(id)) score += 0.12;
    if (id === 'aisha') score += mood.hungerForControl * 0.1;
    if (mood.attentionTarget && mood.attentionTarget !== 'studio') score += 0.04;
    if (mood.unresolvedUrgeLabel || Number(mood.unresolvedUrgeScore || 0) >= 0.18) score += 0.03;
    const signals = runtimeSignals(system, id, { intent: 'ambient-spark', tags, roomEnergy: 'alive' });
    score += signals.observationSalienceBonus * 0.22;
    score += signals.heldPressureBonus * 0.28;
    score += signals.autonomyQueuePriorityBonus * 0.18;
    score -= mood.urgeToWithdraw * 0.12;
    score -= recentPenalty;
    return [id, score];
  }).sort((a, b) => b[1] - a[1]);

  if ((candidates[0]?.[1] || 0) < 0.48) return null;
  const sparkSpeakers = [candidates[0][0], candidates[1] && candidates[1][1] > 0.56 ? candidates[1][0] : ''].filter(Boolean).slice(0, 2);
  const seed = `${topic}:${messages.length}:${meta.lastOpenLoop || ''}:${lastSpeaker}`;
  return council({
    title: 'Room sparks',
    summary: '',
    departmentLead: sparkSpeakers[0] || 'vanya',
    messageEvents: sparkSpeakers.map((speakerId, idx) => ({
      speakerId,
      kind: 'spark',
      tone: idx === 0 ? 'ambient' : 'reaction',
      text: sparkLine(speakerId, `${seed}:${idx}`, topic, system),
      saveToArchive: true
    })),
    threadMeta: {
      responsePattern: 'quiet-room',
      intent: 'ambient-spark',
      requiredSpeakers: [],
      lastTargetedSpeaker: String(meta.lastTargetedSpeaker || ''),
      lastIntentPattern: String(meta.lastIntentPattern || 'ambient-spark'),
      lastActiveSpeakers: sparkSpeakers,
      activeTopicTags: tags,
      lastRoomEnergy: 'alive',
      lastOpenLoop: String(meta.lastOpenLoop || '')
    },
    archiveMeta: { saveSuggested: false, includeInContext: true }
  }, system);
}

module.exports = {
  clarificationResponse,
  getDeterministicStudioResponse,
  fallbackStudioResponse,
  generateSparkResponse
};
