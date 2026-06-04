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
const { evaluateVisibleResponse } = require('./visibleResponseQuality');

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
  if (/\b(work|design|plan|planning|build|campaign|logo|creative|idea|schedule|calendar|content|landing page|homepage|website|web page|hero|saas|visual direction|brand direction|black glass|red pulse)\b/.test(current)) {
    return { kind: 'work', required: ['work', 'design', 'plan', 'build', 'creative', 'idea', 'next', 'step', 'landing', 'page', 'hero', 'website', 'brand', 'style', 'visual', 'black', 'red', 'pulse'] };
  }
  if (terseFollowup && /\b(muscle|muscles|fitness|workout|training|gym|strength|reps|sets|objective|not discussing|focus required)\b/.test(recent)) {
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
  if (/\b(the )?objective is (to complete|movement|the workout|workout|to move|the timer|the clock)\b/i.test(text)
    || /\bobjective is movement\b/i.test(text)
    || /\bnot a perfect plan\b/i.test(text)) {
    return true;
  }
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
    && /\b(film|movie|comedy|titles|script|pacing|existential dread|viewing|watch|pick something|so bad it s good|so bad its good|arthouse|documentary|arrival|spider verse|spiderverse|the menu|heat|knives out|specific suggestions|content selection|parameters for the film|what are the specific suggestions|consensus is clear|title follows|quiet intensity|strong world)\b/.test(visible)) {
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
  return /\b(work is proceeding|current tasks|operational status is green|no immediate blockers|status is green|all systems nominal|current focus is on|episode candidate|current episode parameters|current episode is stable|episode is stable|present and ready to engage|signal is clear|structured and awaiting direction|awaiting direction|functioning though|how implies a metric|human temperature is stable|aesthetic standards are holding|no blandness detected|operational flow is clear|next steps are defined|next operational step|ready for the next phase|data suggests functional|suggests functional|no immediate faults detected|emergent anomalies|everyone is engaged|tracking the workout|next steps are logged|incline push ups are logged|backpack rows|log reps|log the count|data is clear|data will be the only acceptable output|acceptable output now|execute the first move|no more discussion|the path is clear|excuses are not|objective is to start|not to assess current states|deep in the setup|moving forward with the new structure|next steps are clear|one workout one meal one sleep window)\b/.test(visible);
}

function foodAnswerDodged(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(lunch|what should i eat for lunch|eat for lunch)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  if (/\b(planning discussion is paused|what is the immediate need|anyone need a quick fuel|check in on sustenance|before we dive into tomorrow|defining tomorrow s objective|lunch is a secondary concern|secondary concern|simple fuel stop|something easily digestible|something digestible|whatever is fastest|no time for gourmet|grab whatever|quick salad or a sandwich|salad or a sandwich|sandwich or a salad|something with protein|warm bowl of soup|surprisingly grounding|keep you moving)\b/.test(visible)) return true;
  return !/\b(sandwich|wrap|rice|eggs|egg|toast|banana|yogurt|yoghurt|soup|salad|leftovers|beans|lentils|tuna|fruit|oats|peanut butter|chicken|fish|cheese)\b/.test(visible);
}

function designAnswerPunted(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(logo|sharper logo|logo direction|brand direction|visual direction|landing page direction|sharper landing page|homepage direction|website direction|no generic saas|black glass|red pulse|sharper.*direction)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  const punts = /\b(what s the core message|what is the core message|what are the non negotiables|define the visual language|define the core elements|before we iterate|let s hear the prompt|what is the core issue|what are we trying to land|what message are we trying|what specific visual language|what specific pattern of ambition|what is the page supposed to do|what is it supposed to do|are we signaling the ambition|ambition is a variable|ambition needs more than|not just a color|not just function|that's a start but|communicates edge|needs to be clear enough|cuts through the noise|real edge)\b/.test(visible);
  const concrete = /\b(mark|wordmark|black|white|red|accent|pulse|shape|spacing|contrast|signal|field|badge|monogram|line weight|negative space|sharp serif|condensed|geometric|stroke|cut|warning|silhouette|hero|cta|above the fold|typography|grid|motion|navigation|layout|section|glass|editorial)\b/.test(visible);
  return punts || !concrete;
}

function operationalJargonTextRisk(text = '') {
  const visible = normalizeKey(text);
  if (/\b(draft schedule based on today|draft schedule based on todays|draft a preliminary schedule|preliminary schedule|draft a three point agenda|three point agenda|draft a three stage agenda|three stage agenda|morning sync|core work block|afternoon review|key tasks and deadlines|by eod|based on today s outcomes|based on todays outcomes|i ll need a list of priorities by end of day|ill need a list of priorities by end of day|list of priorities by end of day|sounds like a solid plan|build in a moment to breathe between tasks|q[1-4] strategy deck|strategy deck|key deliverables|key performance indicators?|core narrative|client presentation|presentation flows logically|aesthetic direction for the deck|morning session|energy levels are accounted for|everyones energy levels|any immediate needs or concerns for tomorrow|room theatre|theatrical planning|stop performing|customer support|polished dodge|mostly fake sounding|fake sounding|less doctrine|performance art|sustenance is a parameter|is a parameter not|execute|evidence beats another round|failed answer wearing a badge|perform a job title)\b/.test(visible)) return true;
  return /\b(parameters were clear|parameters are clear|within those parameters|operational parameters|current operational parameters|operational reality|operational plan|implementing that|conditions are optimal|no extraneous data|no extraneous elements|content selection|specific suggestions|aligns with current focus|the plan is set|functioning within parameters|efficiency dictates|build specifications|technical requirements|technical specifications|technical specs|draft the specs|adjust the specs|map out the technical|design brief|update the design brief|red pulse specification|pulse specification|style specification|visual specification|adjust the configuration|adjust the design parameters|adjust the temperature|temperature later|design parameters|parameters are updated|parameters updated|configuration is now active|configuration is now the standard|system configuration|update the system configuration|updated the system|system will reflect|system to reflect|ensure the build reflects|build reflects|ensure the content reflects|content reflects|ensure the page reflects|page reflects|page now reflects|ensure the site reflects|site reflects|ensure the copy reflects|copy reflects|ensure the interface reflects|interface reflects|ensure the experience reflects|experience reflects|ensure the visuals reflect|visuals reflect|visuals will reflect|visuals now reflect|ensure the layout reflects|layout reflects|layout will reflect|ensure the design reflects|design reflects|design will reflect|ensure the product reflects|product reflects|product will reflect|ensure the ui reflects|ui reflects|ui will reflect|ensure the screen reflects|screen reflects|screen will reflect|ensure the frontend reflects|frontend reflects|frontend will reflect|ensure the dashboard reflects|dashboard reflects|dashboard will reflect|ensure the hero reflects|hero reflects|hero will reflect|ensure the brand reflects|brand reflects|brand will reflect|ensure the aesthetic reflects|aesthetic reflects|aesthetic will reflect|landing page will reflect|website will reflect|app will reflect|homepage will reflect|will be reflected in the interface|will be reflected in the ui|translate that into the interface|carry that into the dashboard visuals|carry through the hero|apply that aesthetic across the site|update the page to match|corrected dashboard settings|dashboard settings|active setting|active selection|current standard|pulse animation parameters|load times|loads fast|converts|optimized|optimize for that specific interaction|proceed with that configuration|proceed with white editorial|clear enough for implementation|for implementation|implementation aligns|implementation aligns with|ensure the implementation|ensure all assets align|assets align with that constraint|aligns with that clarity|commit to the visual|current build|exact red hex code|we can implement that|standard approach|proceed with that framework|necessary warmth|ensure the content|functional requirements are met|functional requirement remains|core functionality is locked|core request is|core objective|dashboard functionality|dashboard s functionality|color scheme is secondary|secondary to that core objective|visual layer is next|ensure the execution|execution matches|capability was present|taste under pressure|variable that needs calibration|move to the next item|objective is execution|objective is energy|objective is entertainment|style guide|update the style guide|remove the red pulse element|map the accent placement|key interactive elements|current objectives|feedback is noted|perform usefulness|perform the process of being useful|loop of self critique|room is stuck in a loop|build supports|performance lag|visual intensity|evidence of completion is the only metric|avoid further debate)\b/.test(visible);
}

function operationalJargonRisk(normalized = {}) {
  return operationalJargonTextRisk([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
}

function rawVisibleText(source = {}) {
  const speakers = Array.isArray(source.speakers) ? source.speakers : [];
  const silent = Array.isArray(source.silentReactions) ? source.silentReactions : [];
  const notes = Array.isArray(source.stateUpdates?.notes) ? source.stateUpdates.notes : [];
  return [
    source.roomBeat || '',
    ...speakers.map(item => item?.text || ''),
    ...silent.map(item => item?.visibleState || ''),
    ...silent.map(item => item?.reason || ''),
    ...notes
  ].join('\n');
}

function voiceLockIssuesForSpeaker(speaker = {}, rawText = '') {
  const speakerId = normalizeSpeakerId(speaker.speakerId || '');
  if (!speakerId) return [];
  const visible = normalizeKey([speaker.text || '', rawText || ''].join(' '));
  const issues = [];
  const selfNames = {
    aisha: ['aisha', 'a i s h a'],
    vanya: ['vanya'],
    leah: ['leah'],
    claudia: ['claudia'],
    grok: ['grok', 'gerhard']
  };
  const selfPattern = selfNames[speakerId]?.length
    ? new RegExp(`\\b(${selfNames[speakerId].join('|')})\\b\\s+(outlined|said|says|thinks|would|will|can|is|was|keeps|wants|needs|suggested|named|gave|frames|anchors|tracks)\\b`)
    : null;

  if (selfPattern && selfPattern.test(visible)) {
    issues.push(`voice-lock:self-third-person:${speakerId}`);
  }

  if (/\b(i hear you|i appreciate you sharing|thank you for sharing|here to support|support your journey|journey with empathy|empathy and clarity|safe and supportive)\b/.test(visible)) {
    issues.push(`voice-lock:swappable-voice:${speakerId}`);
  }
  if (/\b(really valid|valid reaction|that's a valid reaction|that s a valid reaction|that's a fair reaction|that s a fair reaction|fair reaction|yeah fair|fair no fourth|fair no more loop|fair no more repeat|fair if this feels|feelings are valid|that sounds valid|appreciate you sharing|holding space|safe space|gentle reminder|you are seen|you are heard)\b/.test(visible)) {
    issues.push(`voice-lock:generic-warmth:${speakerId}`);
  }
  if (/\b(here comes my joke|here comes my sarcastic joke|sarcastic joke|to be funny|humorously speaking|insert joke|jokes aside|as a joke|with comedic timing|not to be funny but|funny line incoming)\b/.test(visible)) {
    issues.push(`voice-lock:announced-humor:${speakerId}`);
  }
  if (/\b(i understand how you feel|makes sense to feel|carrying a lot|process your feelings|your feelings are valid|safe space|hold space|emotional container|trauma informed|breathe through it|honor your experience)\b/.test(visible)) {
    issues.push(`voice-lock:therapy-voice:${speakerId}`);
  }

  if (speakerId === 'aisha'
    && /\b(a i s h a is|aisha is an artificial intelligence|i am an ai assistant|i am an artificial intelligence|ai assistant that helps|helps coordinate conversations|provide accurate information|process information quickly|reach a clearer answer|designed to facilitate|multi agent conversational|conversational coordination|as an ai system|as an artificial intelligence)\b/.test(visible)) {
    issues.push('voice-lock:wikipedia-aisha:aisha');
  }
  if (speakerId === 'leah'
    && /\b(this is trash|this is garbage|whoever approved|whoever made it should be embarrassed|no taste|idiot|stupid|embarrassing for you|delete it and apologize|ugly and worthless)\b/.test(visible)) {
    issues.push('voice-lock:hostile-leah:leah');
  }
  if (speakerId === 'claudia'
    && /\b(prioritized action item checklist|action item checklist|actionable next steps with a timeline|timeline and deliverables|define stakeholders|align deliverables|circle back|sync offline|project plan|milestone tracker|risk register|deliverable owners)\b/.test(visible)) {
    issues.push('voice-lock:project-manager-claudia:claudia');
  }
  if (speakerId === 'grok'
    && /\b(only rational mind|explain the flaw in tiny words|obviously everyone else|well actually|only i seem capable|as the genius|intellectual superior|beneath my intellect|i alone understand)\b/.test(visible)) {
    issues.push('voice-lock:insufferable-grok:grok');
  }

  return issues;
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
    /\bthat's a great goal\b/,
    /\bthat's a great way to begin\b/,
    /\bthree days a week is a solid start\b/,
    /\bthree training days a week is a solid start\b/,
    /\bfuel yourself well\b/,
    /\beating enough to support\b/,
    /\benough sleep to support\b/,
    /\bsupport that growth\b/,
    /\bget your sleep\b/,
    /\bone compound lift and one accessory movement\b/,
    /\bmuscles huh\b/,
    /\blet'?s get you started\b/,
    /\bno gym no problem\b/,
    /\bbuild muscle at home\b/,
    /\bbodyweight basics\b/,
    /\bbodyweight exercises\b/,
    /\bresistance bands\b/,
    /\bconsistent effort\b/,
    /\bmiracles overnight\b/,
    /\balternate upper and lower body\b/,
    /\balternate between upper body and lower body\b/,
    /\bupper and lower body focus\b/,
    /\bhome workouts require discipline\b/,
    /\bsustainable habit\b/,
    /\bpersonal improvement\b/,
    /\btrack your progress to see the changes\b/,
    /\bfocus on form\b/,
    /\bseven hours of sleep\b/,
    /\badequate sleep\b/,
    /\bmuscle growth occurs during recovery\b/,
    /\bcompromises recovery\b/,
    /\bprotein with each meal\b/,
    /\bprioritize protein intake\b/,
    /\bprotein shake\b/,
    /\bpost workout\b/,
    /\bpiece of fruit\b/,
    /\bhigh intensity intervals\b/,
    /\bbodyweight circuits\b/,
    /\b45 seconds work\b/,
    /\b15 seconds rest\b/,
    /\brepeat 3 4 times\b/,
    /\bbanana is sufficient\b/,
    /\bsufficient fuel\b/,
    /\bquick pre[- ]training fuel\b/,
    /\bensure hydration\b/,
    /\bhydrate\b/,
    /\bhydration is also addressed\b/,
    /\bwater is critical\b/,
    /\bcritical for performance and recovery\b/,
    /\bfor nutrition keep it simple\b/,
    /\bsomething balanced\b/,
    /\bsalad with protein\b/,
    /\bwrap should keep energy levels stable\b/,
    /\benergy levels stable\b/,
    /\bdon'?t forget to hydrate\b/,
    /\bdeep in planning\b/,
    /\bfocused session\b/,
    /\bmultiple muscle groups\b/,
    /\bform is correct\b/,
    /\badding reps\b/,
    /\bfocus on execution\b/,
    /\btime constraint sharpens\b/,
    /\btechnically sound\b/,
    /\bpoor form\b/,
    /\bfast track to injury\b/,
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
    /\btrack your lifts\b/,
    /\bmeasuring progress\b/,
    /\bjust guessing\b/,
    /\bworkout buddy\b/,
    /\bdon'?t overcomplicate it initially\b/,
    /\bjust show up\b/,
    /\bshow up and do the work\b/,
    /\bincrease one variable\b/,
    /\baim for three sets\b/,
    /\bas many reps as possible\b/,
    /\bprogressive overload\b/,
    /\bprogressive overload is the signal\b/,
    /\brepeatable training week\b/,
    /\bform is clean\b/,
    /\bpoor mechanics\b/,
    /\bpain is a signal\b/,
    /\bpain is not the metric\b/,
    /\bfuel for muscle growth\b/,
    /\bprotein and carb mix\b/,
    /\bchicken breast\b/,
    /\bside of rice\b/,
    /\blentil soup\b/,
    /\bwhole grain bread\b/,
    /\bgrilled fish\b/,
    /\btoo heavy that will slow you down\b/,
    /\bfuels the next block of work\b/,
    /\befficiency is the goal\b/,
    /\bcomplex carbohydrates\b/,
    /\bsomething balanced\b/,
    /\bsalad with protein\b/,
    /\benergy levels stable\b/,
    /\bdon'?t forget to hydrate\b/,
    /\bprotein and complex carbohydrates\b/,
    /\beat something balanced\b/,
    /\ba small portion\b/,
    /\bscoop of protein powder\b/,
    /\bsmall handful of almonds\b/,
    /\bgoal is fuel\b/,
    /\bfuel the performance\b/,
    /\bfuels the performance\b/,
    /\bfuel[s]? performance\b/,
    /\bnot here for a nap\b/,
    /\bhuman body requires fuel\b/,
    /\bknown variable\b/,
    /\bfuel not a feast\b/,
    /\btrack the effect\b/,
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
    /\bfocus on clean form\b/,
    /\bchosen exercises\b/,
    /\bmove with intention\b/,
    /\bsustainable routine\b/,
    /\btracking your progress\b/,
    /\blisted movements\b/,
    /\bbuilding a habit\b/,
    /\bshowing up and moving\b/,
    /\bquick salad or a sandwich\b/,
    /\bsalad or a sandwich\b/,
    /\bsandwich or a salad\b/,
    /\bsomething with protein\b/,
    /\bwarm bowl of soup\b/,
    /\bsurprisingly grounding\b/,
    /\bkeep you moving\b/,
    /\bensure (you )?warm up properly\b/,
    /\bhydration is also critical\b/,
    /\bconsume it 30[- ]60 minutes prior\b/,
    /\b30[- ]60 minutes\b/,
    /\bavoid stomach upset\b/,
    /\blisten to your body\b/,
    /\bbuilds muscle over time\b/
  ];
  const highRisk = [
    /\bprogressive overload is the signal\b/,
    /\bmuscles huh\b/,
    /\blet'?s get you started\b/,
    /\bno gym no problem\b/,
    /\bbanana is sufficient\b/,
    /\bwater is critical\b/,
    /\bcompromises recovery\b/,
    /\bprotein with each meal\b/,
    /\bhome workouts require discipline\b/,
    /\bsustainable habit\b/,
    /\bpersonal improvement\b/,
    /\btrack your progress to see the changes\b/,
    /\bshow up and do the work\b/,
    /\bbodyweight exercises\b/,
    /\bresistance bands\b/,
    /\bprioritize protein intake\b/,
    /\badequate sleep\b/,
    /\bmuscle growth occurs during recovery\b/,
    /\bhigh intensity intervals\b/,
    /\bbodyweight circuits\b/,
    /\bcompound movements\b/,
    /\bfuel for muscle growth\b/,
    /\bcomplex carbohydrates\b/,
    /\bscoop of protein powder\b/,
    /\bgoal is fuel\b/,
    /\bcapability was present\b/,
    /\bstart with three rounds of your chosen exercises\b/,
    /\bjust show up for those twenty minutes\b/,
    /\bsustainable routine\b/,
    /\btracking your progress\b/,
    /\blisted movements\b/,
    /\bbuilding a habit\b/,
    /\bshowing up and moving\b/,
    /\bquick salad or a sandwich\b/,
    /\bsomething with protein\b/
  ];
  return cliches.filter(rx => rx.test(visible)).length >= 2 || highRisk.some(rx => rx.test(visible));
}

function movieAnswerTooThin(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(movie|film|watch tonight|what should we watch|what should the room watch)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  const hasSpecificDirection = /\b(arrival|spider verse|spiderverse|the menu|dune|mad max|heat|parasite|knives out|comfort|tension|spectacle|thriller|comedy|horror|animation|quiet pressure|voltage|bite)\b/.test(visible);
  const puntsToUser = /\b(what are the options|pick the mood first|what options|what kind of movie are we feeling|depends on what you want|tell me what mood)\b/.test(visible);
  return !hasSpecificDirection || puntsToUser;
}

function recentContinuityClaimTokens(context = {}) {
  const userClaims = (Array.isArray(context.recentTurns) ? context.recentTurns : [])
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => /\b(preference|style|color|dashboard|landing page|brand)\b/i.test(text))
    .filter(text => /\b(is|=)\b/i.test(text));
  if (userClaims.length < 2) return { activeTokens: [], priorTokens: [] };
  const generic = new Set(['actually', 'preference', 'style', 'color', 'dashboard', 'landing', 'page', 'brand', 'accent', 'accents', 'single', 'one']);
  const priorRaw = contentTokens(userClaims.slice(0, -1).join(' ')).filter(token => !generic.has(token));
  const activeRaw = contentTokens(userClaims[userClaims.length - 1]).filter(token => !generic.has(token));
  const priorSet = new Set(priorRaw);
  const activeSet = new Set(activeRaw);
  return {
    priorTokens: priorRaw.filter(token => !activeSet.has(token)),
    activeTokens: activeRaw.filter(token => !priorSet.has(token))
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
    if (/\b(what has changed since|what changed since|what specifically has changed|changed in your view|anything concrete you(?:'ve| have)? noticed|operational flow seems stable|need a clear summary|clear summary of any new developments|new developments or shifts in focus|any new developments|shifts in focus)\b/.test(visible)) return true;
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
    const { activeTokens, priorTokens } = recentContinuityClaimTokens(context);
    if (activeTokens.length && priorTokens.length) {
      const namesActive = activeTokens.some(token => visible.includes(token));
      const namesPrior = priorTokens.some(token => visible.includes(token));
      if (!namesActive || !namesPrior) return true;
    }
    return /\b(no you did not|you did not specify|not in the record|do not have that)\b/.test(visible)
      && /\b(black glass|obsidian|red pulse|red accent)\b/.test(`${current} ${recentTurnsText(context)}`);
  }
  return false;
}

function frustrationIgnored(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  if (!/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|annoying|this is bad|this sucks|bruh|bro|wtf|repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally)\b/.test(current)) return false;
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text),
    ...(normalized.stateUpdates?.notes || [])
  ].join(' '));
  if (/\b(repeating yourself|keep repeating|stop repeating|answer normally|respond normally|talk normally)\b/.test(current)
    && /\b(the ask is simple|actual problem you need solved|state it clearly|address only what is necessary|what is the actual problem|only what is necessary to fix it|what is the one thing you need to do next|what is the one thing we need to land here|what is the one thing we need to land|name the specific point that feels repeated|specific point that feels repeated|define one clear constraint for the next answer|what part of the last answer|room needs a clear ask|let s name the ask|name the ask|define the ask clearly|who owns the next step|identify the core requirement|current exchange is not yielding)\b/.test(visible)) {
    return true;
  }
  if (/\b(answer normally|what should i do today|what do i do today)\b/.test(current)) {
    if (/\b(what is the one thing you need to do next|what is the one thing you need to accomplish today|what is one small thing that would make today feel less dumb|what part of the last answer|room needs a clear ask|let s name the ask|name the ask|state the actual problem|define the ask clearly|who owns the next step|i will track the completion|identify the core requirement|current exchange is not yielding|clear ask to move forward)\b/.test(visible)) return true;
    if (!/\b(today|plain|do this|first|start|pick|block|result|short session|open the first file|one clean next move|one thing)\b/.test(visible)) return true;
  }
  if (/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|this is bad|this sucks)\b/.test(current)
    && /\b(problem is not the polish|stop pretending and start doing|start doing|name one concrete action|concrete action we can take right now)\b/.test(visible)) {
    return true;
  }
  if (/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|this is bad|this sucks)\b/.test(current)
    && /\b(circling the same point|without landing it|name the actual problem|state the core claim|core claim.{0,40}next move|gap between wanting to be direct and performing it|performing it)\b/.test(visible)) {
    return true;
  }
  if (/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|this is bad|this sucks)\b/.test(current)
    && /\b(fair\.?\s+this got too abstract|got too abstract)\b/.test(visible)) {
    return true;
  }
  if (/\b(bruh|bro|wtf)\b/.test(current)
    && /\b(the objective is the execution|objective is the first move|the objective is the first move|objective is to start|the objective is to start|stick to the plan|we have the structure|that s the objective|thats the objective)\b/.test(visible)) {
    return true;
  }
  if (!/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|turn|repeat|loop|plain|normal|straight|answer)\b/.test(visible)) return true;
  return /\b(we use process to avoid commitment|structure itself becomes the excuse|capability is not the issue|capability is not the weak point|pattern is clear|stress comes from|mistaking polish for progress|actual work not the presentation|actual work not presentation|stuck between wanting to be useful and sounding like it|grok was right it sounded fake|this is not complex|name the feeling not the function|name the actual tension|actual tension.{0,60}not the feeling|not the feeling of it|concrete mood|stress is noted|proceed with that clarity|goal is clarity not just noise|keep the signal clean|signal clean|symptom of the ask|room needs a position|position not a process explanation|position not a process)\b/.test(visible);
}

function socialQuestionIgnored(normalized = {}, context = {}) {
  const current = normalizeKey(context.userMessage || '');
  const visible = normalizeKey([
    normalized.roomBeat,
    ...(normalized.speakers || []).map(item => item.text)
  ].join(' '));
  const speakerVisible = normalizeKey((normalized.speakers || []).map(item => item.text).join(' '));
  if (/\b(actual tension|tension in this room|room tension)\b/.test(current)) {
    return !/\b(tension|friction|pressure|polite|fake|avoid|dodg|room)\b/.test(speakerVisible || visible);
  }
  if (/\b(sound fake|sounded fake|was that useful|be honest|useful or fake)\b/.test(current)) {
    return !/\b(fake|useful|not useful|stiff|bland|checklist|dodg|yes|no|partly)\b/.test(visible)
      || /\b(parameters were clear|within those parameters|capability was present|taste under pressure|variable that needs calibration|move to the next item)\b/.test(visible);
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
  const plannedMax = Number(context.impulsePlan?.maxSpeakers || 0);
  const maxSpeakers = plannedMax > 0 ? Math.min(5, plannedMax) : explicitEveryone ? 5 : 3;
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
      visibleState: normalizeVisibleState(item?.visibleState || ''),
      reason: compactText(item?.reason || '', 140)
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
  const rawVisible = rawVisibleText(output);
  const visible = [
    normalized.roomBeat,
    ...normalized.speakers.map(item => item.text),
    ...normalized.silentReactions.map(item => item.visibleState),
    ...normalized.silentReactions.map(item => item.reason),
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
  if (foodAnswerDodged(normalized, context)) issues.push('food-answer-dodged');
  if (designAnswerPunted(normalized, context)) issues.push('design-answer-punted');
  if (operationalJargonRisk(normalized) || operationalJargonTextRisk(rawVisible)) issues.push('operational-jargon');
  if (genericAdviceColumnRisk(normalized, context)) issues.push('generic-advice-column');
  if (movieAnswerTooThin(normalized, context)) issues.push('movie-answer-too-thin');
  if (socialQuestionIgnored(normalized, context)) issues.push('social-question-ignored');
  if (frustrationIgnored(normalized, context)) issues.push('frustration-ignored');
  if (continuityQuestionIgnored(normalized, context)) issues.push('continuity-question-ignored');
  evaluateVisibleResponse({
    visibleText: visible,
    userMessage: context.userMessage || '',
    recentTurns: context.recentTurns || [],
    continuity: context.continuity || {}
  }).forEach(item => {
    issues.push(`product-${item.family}${item.category ? `:${item.category}` : ''}`);
  });
  evaluateVisibleResponse({
    visibleText: rawVisible,
    userMessage: context.userMessage || '',
    recentTurns: context.recentTurns || [],
    continuity: context.continuity || {}
  }).forEach(item => {
    const issue = `product-${item.family}${item.category ? `:${item.category}` : ''}`;
    if (!issues.includes(issue)) issues.push(issue);
  });

  const promptKey = normalizeKey(context.userMessage || '');
  for (const [index, speaker] of normalized.speakers.entries()) {
    if (!CHARACTER_IDS.includes(speaker.speakerId)) issues.push(`invalid-speaker:${speaker.speakerId || 'missing'}`);
    if (sentenceCount(speaker.text) > (normalized.responseMode === 'aisha_takeover' && speaker.speakerId === 'aisha' ? 3 : 2)) {
      issues.push(`too-many-sentences:${speaker.speakerId}`);
    }
    if (wordCount(speaker.text) > 55) issues.push(`speaker-too-long:${speaker.speakerId}`);
    if (promptKey.length > 12 && normalizeKey(speaker.text).startsWith(promptKey)) issues.push(`raw-prompt-stuffing:${speaker.speakerId}`);
    if (/\b(my role is|as the (room|taste|technical|operations|social)|i am here to)\b/i.test(speaker.text)) {
      issues.push(`mechanical-role:${speaker.speakerId}`);
    }
    const rawSpeakerText = Array.isArray(output?.speakers) ? output.speakers[index]?.text || '' : '';
    for (const issue of voiceLockIssuesForSpeaker(speaker, rawSpeakerText)) {
      if (!issues.includes(issue)) issues.push(issue);
    }
  }

  const explicitEveryone = explicitEveryoneRequested(context.userMessage || '');
  const plannedMax = Number(context.impulsePlan?.maxSpeakers || 0);
  const rawSpeakerCount = Array.isArray(output?.speakers) ? output.speakers.filter(item => normalizeSpeakerId(item?.speakerId || '') && compactText(item?.text || '', 20)).length : 0;
  if (plannedMax > 0 && rawSpeakerCount > plannedMax) issues.push(`impulse-plan-too-many-speakers:${plannedMax}`);
  if (!explicitEveryone && normalized.speakers.length > 3) issues.push('too-many-speakers');
  const plannedSpeakerIds = Array.isArray(context.impulsePlan?.selectedSpeakers)
    ? context.impulsePlan.selectedSpeakers.map(item => normalizeSpeakerId(item?.speakerId || '')).filter(Boolean)
    : [];
  if (context.impulsePlan?.enforceSelectedSpeakers === true && plannedSpeakerIds.length) {
    const plannedSet = new Set(plannedSpeakerIds);
    const rawSpeakerIds = (Array.isArray(output?.speakers) ? output.speakers : [])
      .map(item => normalizeSpeakerId(item?.speakerId || ''))
      .filter(Boolean);
    const unplanned = rawSpeakerIds.find(id => !plannedSet.has(id));
    if (unplanned) issues.push(`impulse-plan-unplanned-speaker:${unplanned}`);
    const plannedSlice = plannedSpeakerIds.slice(0, rawSpeakerIds.length);
    if (rawSpeakerIds.length > 1 && rawSpeakerIds.every(id => plannedSet.has(id)) && rawSpeakerIds.some((id, index) => id !== plannedSlice[index])) {
      issues.push(`impulse-plan-wrong-order:${plannedSpeakerIds.join('>')}`);
    }
  }
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
