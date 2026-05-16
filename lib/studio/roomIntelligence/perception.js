const { CHARACTER_IDS, normalizeCharacterId } = require('./characters');

const EVERYONE_RX = /\b(everyone|everybody|all of you|you all|team|whole room|each of you|all five)\b/i;
const STRICT_PRESENCE_RX = /\b(where is everyone|where is everybody|where is everyone else|who(?:'s|s| is) here|who(?:'s|s| is) online|who(?:'s|s| is) around|who(?:'s|s| is) present|who else is here|is anyone here|anyone here|anyone online|anyone around|room state|presence)\b/i;
const ROLL_CALL_RX = /\b(?:role call|roll call|sound off|everyone check in|who(?:'s|s| is) here|who(?:'s|s| is) online|who(?:'s|s| is) around|who(?:'s|s| is) present|who else is here|where is everyone|where is everybody|where is everyone else|anyone online|anyone here|anyone around)\b|^\s*everyone else\s*[?!.]*\s*$/i;
const SOCIAL_FOOD_RX = /\b(?:who\s+(?:here\s+)?likes?\s+pizza|anyone\s+likes?\s+pizza|pizza\??)\b/i;
const WELLBEING_RX = /\b(how is everyone|how are you all|how is the room|how are we|how'?s everyone|how'?s the team)\b/i;
const GREETING_RX = /^(hi|hello|hey|yo|hiya|sup)(\s+(team|everyone|everybody|room|all))?[!.?]*$/i;
const INSULT_RX = /\b(stupid|useless|trash|shit|fuck|fucking|idiot|moron|dumb|lazy|hate you|cunt|bitch|terrible|pathetic|garbage)\b/i;
const FACT_CHANGE_RX = /\b(remember this|remember that|from now on|actually|correction|update this|new fact|important fact|note this|for the record|going forward|change it to)\b/i;
const HONEST_OPINION_RX = /\b(honest opinion|be honest|real opinion|tell me honestly|honestly)\b/i;
const IGNORING_RX = /\b(ignore|ignoring|ignored|not answering|avoiding me)\b/i;
const QUESTION_RX = /\?|\b(who|what|when|where|why|how|which|can you|should i|do you)\b/i;
const META_ROOM_DESIGN_RX = /\b(studio pulse|room intelligence|room system|presence system|turn planner|room planner|state reducer|adapter|architecture|implementation|assistant cosplay|labels|fake characters?|generic characters?|generic assistant|why.*(?:fake|generic|same)|characters?.*(?:fake|generic|same)|ai behavior|system behavior|design of this room|why.*room.*(?:broken|wrong|fake))\b/i;

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function mentionedCharacters(message = '') {
  const q = normalizeText(message).toLowerCase();
  const found = new Set();
  q.split(/[^a-z0-9/]+/i).forEach(token => {
    const id = normalizeCharacterId(token);
    if (id) found.add(id);
  });
  if (/\bgrok\s*\/\s*gerhard\b/i.test(q)) found.add('grok');
  return [...found].filter(id => CHARACTER_IDS.includes(id));
}

function inferEmotionalTone(message = '') {
  const q = normalizeText(message).toLowerCase();
  if (INSULT_RX.test(q)) return 'hostile';
  if (/\b(please|thank you|thanks|appreciate)\b/.test(q)) return 'warm';
  if (/\b(lol|haha|joke|funny|tease)\b/.test(q)) return 'playful';
  if (/\b(annoyed|angry|frustrated|fed up|upset)\b/.test(q)) return 'frustrated';
  if (/\b(scared|worried|anxious|stressed)\b/.test(q)) return 'worried';
  return 'neutral';
}

function inferTaskType(message = '') {
  const q = normalizeText(message).toLowerCase();
  if (ROLL_CALL_RX.test(q)) return 'roll_call';
  if (STRICT_PRESENCE_RX.test(q)) return 'presence_check';
  if (WELLBEING_RX.test(q)) return 'room_wellbeing';
  if (GREETING_RX.test(q)) return 'greeting';
  if (FACT_CHANGE_RX.test(q)) return 'memory_update';
  if (INSULT_RX.test(q)) return 'conflict';
  if (EVERYONE_RX.test(q) && HONEST_OPINION_RX.test(q)) return 'group_opinion';
  if (SOCIAL_FOOD_RX.test(q)) return 'social_food';
  if (/\b(help me plan|plan(?:ning)?\b.*\bcampaign|next campaign|campaign plan)\b/.test(q)) return 'planning';
  if (/\b(code|bug|route|api|backend|frontend|system|performance|fix|implement)\b/.test(q)) return 'technical';
  if (/\b(idea|caption|creative|content|campaign|trend|concept|style|design|critique|logo|visual|brand|layout|composition)\b/.test(q)) return 'creative';
  return 'conversation';
}

function inferSocialIntent(message = '') {
  const q = normalizeText(message).toLowerCase();
  if (GREETING_RX.test(q)) return 'greeting_room';
  if (ROLL_CALL_RX.test(q)) return 'calling_room';
  if (STRICT_PRESENCE_RX.test(q)) return 'checking_presence';
  if (WELLBEING_RX.test(q)) return 'checking_wellbeing';
  if (EVERYONE_RX.test(q) && !GREETING_RX.test(q)) return 'inviting_room';
  if (SOCIAL_FOOD_RX.test(q)) return 'social_question';
  if (IGNORING_RX.test(q)) return 'seeking_acknowledgement';
  if (INSULT_RX.test(q)) return 'venting_or_attacking';
  if (FACT_CHANGE_RX.test(q)) return 'updating_context';
  return 'ordinary_exchange';
}

function inferTopicFocus(message = '') {
  const text = normalizeText(message);
  const lower = text.toLowerCase();
  if (/\blogo\b/.test(lower)) return 'logo';
  if (/\bcampaign\b/.test(lower)) return 'campaign';
  if (/\bcaption\b/.test(lower)) return 'caption';
  if (/\bpost\b/.test(lower)) return 'post';
  const match = lower.match(/\b(?:on|about|for)\s+(?:this|the|my|our)?\s*([a-z0-9][a-z0-9\s-]{1,60})/i);
  if (!match) return '';
  return match[1]
    .replace(/\b(honest opinion|be honest|everyone|everybody|you all|all of you)\b/gi, '')
    .replace(/[?.!,]+$/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
}

function perceiveRoomMessage(message = '', roomState = {}) {
  const text = normalizeText(message);
  const lower = text.toLowerCase();
  const requestedCharacterIds = mentionedCharacters(text);
  const isTeamGreeting = /^(hi|hello|hey|yo)\s+team\b/i.test(text);
  const isRoomGreeting = GREETING_RX.test(text);
  const addressesRoom = EVERYONE_RX.test(text) || !requestedCharacterIds.length;
  const taskType = inferTaskType(text);
  const asksRollCall = taskType === 'roll_call';
  const isPresenceQuery = taskType === 'presence_check' || asksRollCall;
  const asksAboutRoomWellbeing = taskType === 'room_wellbeing';
  const isConflict = taskType === 'conflict';
  const isFactChange = taskType === 'memory_update';
  const asksEveryone = EVERYONE_RX.test(text) && !isTeamGreeting && !isRoomGreeting && !asksAboutRoomWellbeing && !asksRollCall;
  const asksHonestOpinion = HONEST_OPINION_RX.test(text);
  const multipleCharactersShouldRespond = asksEveryone || (isConflict && !requestedCharacterIds.length);
  const questionType = isPresenceQuery
    ? 'presence'
    : QUESTION_RX.test(text)
      ? 'question'
      : isFactChange
        ? 'statement_update'
        : 'statement';

  return {
    text,
    lower,
    addressesRoom,
    requestedCharacterIds,
    emotionalTone: inferEmotionalTone(text),
    taskType,
    socialIntent: inferSocialIntent(text),
    conflictTension: isConflict ? 0.72 : roomState.recentTension || 0.12,
    questionType,
    asksAboutRoomState: isPresenceQuery,
    asksRollCall,
    asksAboutRoomWellbeing,
    isRoomGreeting,
    asksEveryone,
    asksHonestOpinion,
    asksIfIgnoring: IGNORING_RX.test(text),
    allowsMetaRoomTalk: META_ROOM_DESIGN_RX.test(text),
    topicFocus: inferTopicFocus(text),
    isFactChange,
    multipleCharactersShouldRespond
  };
}

module.exports = {
  perceiveRoomMessage,
  mentionedCharacters
};
