function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function visibleLineKeys(value = '') {
  return String(value || '')
    .split(/\n+/)
    .map(normalizeText)
    .filter(line => line.length >= 42);
}

function recentAssistantText(recentTurns = []) {
  return (Array.isArray(recentTurns) ? recentTurns : [])
    .filter(item => !/^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .join('\n');
}

function currentTopic(userMessage = '') {
  const text = normalizeText(userMessage);
  if (/\b(what changed|what was changed|what did .* change|what did i change from|difference|previous|superseded|old|original|earlier|used to|never said|did i say|did i ever say)\b/.test(text)) return 'continuity';
  if (/\b(what|which)\b.*\b(preference|style|color|dashboard|landing page|brand)\b.*\b(did i|i gave|give the room|recorded|active|current)\b/.test(text)) return 'continuity';
  if (/\b(movie|film|watch tonight|watch next|what should we watch|what should the room watch)\b/.test(text)) return 'movie';
  if (/\b(food|hungry|lunch|dinner|snack|eat|meal|nutrition)\b/.test(text)) return 'food';
  if (/\b(logo|brand|design|campaign|creative|content|calendar|landing page|homepage|website|web page|hero|saas|visual direction|black glass|red pulse|plan|planning|schedule|work|client)\b/.test(text)) return 'work';
  if (/\b(muscle|muscles|fitness|workout|gym|lift|lifting|strength|bulk|train|training|exercise|sets|reps|protein)\b/.test(text)) return 'fitness';
  if (/\b(room tension|actual tension|tension in this room|what is the tension|what is the actual tension)\b/.test(text)) return 'room-state';
  if (/\b(how is everyone|how are you all|useful or fake|sound fake|sounded fake|be honest|this feels dumb|stressed|stress|bruh|bro|wtf|repeating yourself|answer normally)\b/.test(text)) return 'social';
  return '';
}

function continuityClaimTokens(value = '') {
  const text = normalizeText(value);
  if (!/\b(preference|style|color|dashboard|landing page|brand)\b/.test(text)) return [];
  if (!/\b(is|actually|changed|now|instead)\b/.test(text)) return [];
  const generic = new Set([
    'actually',
    'preference',
    'style',
    'color',
    'dashboard',
    'landing',
    'page',
    'brand',
    'with',
    'without',
    'single',
    'accent',
    'accents',
    'current',
    'prior',
    'previous',
    'record'
  ]);
  return text
    .split(/\s+/)
    .filter(token => token.length >= 4)
    .filter(token => !generic.has(token));
}

function latestRecentContinuityClaim(recentTurns = []) {
  const claims = (Array.isArray(recentTurns) ? recentTurns : [])
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => continuityClaimTokens(text).length);
  return claims[claims.length - 1] || '';
}

function recentContinuityClaimPair(recentTurns = []) {
  const claims = (Array.isArray(recentTurns) ? recentTurns : [])
    .filter(item => /^user$/i.test(String(item?.speakerId || item?.role || '')))
    .map(item => String(item?.text || item?.content || ''))
    .filter(text => continuityClaimTokens(text).length);
  if (claims.length < 2) return { active: '', prior: '' };
  return {
    active: claims[claims.length - 1],
    prior: claims[claims.length - 2]
  };
}

function continuityPairContrast(recentTurns = []) {
  const pair = recentContinuityClaimPair(recentTurns);
  if (!pair.active || !pair.prior) {
    return { active: '', prior: '', activeOnly: [], priorOnly: [] };
  }
  const activeTokens = continuityClaimTokens(pair.active);
  const priorTokens = continuityClaimTokens(pair.prior);
  const activeSet = new Set(activeTokens);
  const priorSet = new Set(priorTokens);
  return {
    active: pair.active,
    prior: pair.prior,
    activeOnly: [...activeSet].filter(token => !priorSet.has(token)),
    priorOnly: [...priorSet].filter(token => !activeSet.has(token))
  };
}

function continuityTexts(value = {}, keys = []) {
  const source = value && typeof value === 'object' ? value : {};
  return keys
    .flatMap(key => Array.isArray(source[key]) ? source[key] : [])
    .map(item => typeof item === 'string' ? item : String(item?.text || item?.claimText || item?.canonicalText || ''))
    .filter(Boolean);
}

function continuityLedgerContrast(continuity = {}) {
  const activeTokens = continuityTexts(continuity, ['activeTexts', 'activeTruthTexts'])
    .flatMap(continuityClaimTokens);
  const priorTokens = continuityTexts(continuity, ['supersededTexts', 'supersededTruthTexts', 'priorTexts'])
    .flatMap(continuityClaimTokens);
  if (!activeTokens.length || !priorTokens.length) {
    return { activeOnly: [], priorOnly: [] };
  }
  const activeSet = new Set(activeTokens);
  const priorSet = new Set(priorTokens);
  return {
    activeOnly: [...activeSet].filter(token => !priorSet.has(token)),
    priorOnly: [...priorSet].filter(token => !activeSet.has(token))
  };
}

function hasSupersessionConflict(text = '', userMessage = '', recentTurns = []) {
  const current = normalizeText(userMessage);
  if (!/\b(actually|changed|now|instead)\b/.test(current)) return false;
  const activeTokens = continuityClaimTokens(userMessage);
  if (!activeTokens.length) return false;
  const priorTokens = continuityClaimTokens(latestRecentContinuityClaim(recentTurns));
  if (!priorTokens.length) return false;
  const activeSet = new Set(activeTokens);
  const priorSet = new Set(priorTokens);
  const activeOnly = [...activeSet].filter(token => !priorSet.has(token));
  const priorOnly = [...priorSet].filter(token => !activeSet.has(token));
  if (!activeOnly.length || !priorOnly.length) return false;
  const mentionsActive = activeOnly.some(token => text.includes(token));
  const mentionsPrior = priorOnly.some(token => text.includes(token));
  if (mentionsPrior && !mentionsActive) return true;
  return false;
}

function hasSupersededAttributeLeak(text = '', userMessage = '', recentTurns = []) {
  const current = normalizeText(userMessage);
  if (!/\b(actually|changed|now|instead)\b/.test(current)) return false;
  const activeTokens = continuityClaimTokens(userMessage);
  const priorTokens = continuityClaimTokens(latestRecentContinuityClaim(recentTurns));
  if (!activeTokens.length || !priorTokens.length) return false;
  const activeSet = new Set(activeTokens);
  const priorOnly = [...new Set(priorTokens)].filter(token => !activeSet.has(token));
  if (!priorOnly.length) return false;
  const mentionsPrior = priorOnly.some(token => text.includes(token));
  if (!mentionsPrior) return false;

  const labelsPriorEvidence = /\b(prior|previous|superseded|old record|prior record|previous record|changed from|used to|before|was black|was obsidian|no longer|dropped|removed|replaced)\b/.test(text);
  if (labelsPriorEvidence) return false;

  const negatedCurrent = /\b(no|without|remove|removed|drop|dropped|no longer)\b/.test(current);
  if (negatedCurrent) return true;

  return /\b(pulse|accent|red|black|obsidian)\b/.test(priorOnly.join(' '));
}

function hasReversedContinuityDenial(text = '', userMessage = '', recentTurns = []) {
  const current = normalizeText(userMessage);
  if (!/\b(never said|did i say|did i ever say)\b/.test(current)) return false;
  const pair = recentContinuityClaimPair(recentTurns);
  if (!pair.active || !pair.prior) return false;
  const activeTokens = continuityClaimTokens(pair.active);
  const priorTokens = continuityClaimTokens(pair.prior);
  if (!activeTokens.length || !priorTokens.length) return false;
  const activeSet = new Set(activeTokens);
  const priorSet = new Set(priorTokens);
  const activeOnly = [...activeSet].filter(token => !priorSet.has(token));
  const priorOnly = [...priorSet].filter(token => !activeSet.has(token));
  if (!activeOnly.length || !priorOnly.length) return false;
  const priorIndex = text.indexOf('prior record');
  const currentIndex = text.indexOf('current record');
  if (priorIndex < 0 || currentIndex < 0 || currentIndex <= priorIndex) return false;
  const priorSegment = text.slice(priorIndex, currentIndex);
  const currentSegment = text.slice(currentIndex);
  return activeOnly.some(token => priorSegment.includes(token))
    && priorOnly.some(token => currentSegment.includes(token));
}

function issue(family, category, evidence = '') {
  return { family, category, evidence: String(evidence || '').slice(0, 160) };
}

const ATTRIBUTION_SPEAKERS = Object.freeze(['aisha', 'vanya', 'leah', 'claudia', 'grok']);

const BLIND_ATTRIBUTION_RULES = Object.freeze({
  aisha: [
    [/\b(prior record|current record|active record|superseded|ledger|recorded|record|receipt|evidence|claim|contradiction|distinction|noted|logged|callback|memory)\b/, 4],
    [/\b(no quiet rewrite|quietly erased|visible record|current record logged|current record prior record|current record .* prior record|prior record .* current record|current record:|prior record:|false memory|anchor|precision|separate facts|grounded)\b/, 3],
    [/\b(current|prior|active|previous)\b/, 1]
  ],
  vanya: [
    [/\b(week can actually hold|identity speech|proof talk after|first round proves|day is moving|earns the confidence|clock do the arguing|feed the session\s+not the performance|afternoon stay human|lunch boring in the useful way|room earns another sentence)\b/, 6],
    [/\b(same twenty minutes,? cleaner shape|body trusts it|ego tries to decorate|decorating the clock|leave the ceremony outside|small enough to finish|real enough that you can feel|feel it tomorrow|tonight i would choose|keeps it premium|intentional before it feels busy)\b/, 4],
    [/\b(same twenty minutes,? cleaner shape|tiny vanity|massive discipline|we can work with that|task badge|task queue|turning into a queue|turning this into a task queue|plain version|no heroic rebrand|heroic rebrand|cleaner shape|body trusts it|ego tries to decorate|decorating the clock|leave the ceremony outside|small enough to finish|real enough that you can feel|feel it tomorrow|warmth in the room|drift past|temperature|change the temperature|irritation noted|breathable|breathe|cool|dramatic|drama|alive|restless|human|socially|underneath|choose arrival|room should feel intentional)\b/, 4],
    [/\b(open the room|read(?:ing)? the room|room energy|pressure before it becomes noise|without turning it into therapy|actual claim)\b/, 3],
    [/\b(room|warm|playful|dignity|ten minutes|water|clear one surface)\b/, 1]
  ],
  leah: [
    [/\b(one strong world,? not wallpaper|pick the feeling first)\b/, 8],
    [/\b(cultural fault line|status pressure|social performance|pretending vague effort deserves a badge)\b/, 8],
    [/\b(bland|boredom|boring|taste|status|committee|consensus|edge|side eye|suspicious|too neat|safe choice|pressure test|sharp|stylish|pick the feeling|title is just|mood it wants|quiet pressure|voltage|room wants bite|wants bite|social teeth|spectacle|black glass|one red pulse|quiet hero|generic saas|hero mood|decorative compromise|protect the restraint|warning light|wellness badge|girl i am here|acting surprised|one strong world|not wallpaper)\b/, 4],
    [/\b(radical concept|opportunistic|cultured|performing taste|pin in it|too polite|comfortable weak point)\b/, 3],
    [/\b(cute|polish|blandness|position|agreeing)\b/, 1]
  ],
  claudia: [
    [/\b(start with|first step|same days|one clean move|next move|one blunt next move|lower the noise|one decision|change the pattern|one concrete action|choose one task|short timer|rough pass|structure|owned|owner|cut it down|write (one|the) number down|write (the )?reps down|same twenty minutes|twenty minutes of training|warm up|run the clock|make it real|incline push|backpack row|split squat|hip hinge|squat or hinge|two rounds|mark completion|track the work|recover,? repeat|boring baseline|boring enough to work|small progression|planning session|before training|eat light enough|start repeatable|repeatable|adjusted next time|cta obvious|red accent do one job)\b/, 4],
    [/\b(push|push ups|pushups|incline push|squat|split squat|hinge|hip hinge|row|backpack row|plank|rounds?|session|schedule|block|result|clear space|practical|usable|current record first|log reps?|logged|add one clean rep|before training|eat light enough|rice and chicken|eggs and toast|leftovers with water|sandwich|leftovers|hero quiet)\b/, 2],
    [/\b(start|steps?|plan|today|week|minutes?|do this|first|second|third)\b/, 1]
  ],
  grok: [
    [/\b(sharp joint pain means swap the move|swap the move|prove a point|soreness is allowed|protein helps later|food lets you move|title has a job|random taste noise)\b/, 4],
    [/\b(sharp joint pain means swap the move|narrative ambition|premise|fault line|fault|dodge|fake part|partly useful|weak point|track reps|evidence beats|sloppy|contradiction|objection|five adjectives|shape is unemployed|not volunteering|jazz hands|joint pain|swap the move|prove a point|soreness is allowed|right now the question|mood first)\b/, 4],
    [/\b(otherwise|sweating|guessing|consistency|failure|risk|technically|not the same as|dry)\b/, 2],
    [/\b(useful|fake|track|reps|data|proof|weak|direct beats)\b/, 1]
  ]
});

function stripSpeakerNames(value = '') {
  return normalizeText(value)
    .replace(/\b(aisha|a i s h a|vanya|leah|claudia|grok|gerhard|motsepe|khumalo|mokoena|naidoo)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blindAttributionScores(value = '') {
  const text = stripSpeakerNames(value);
  const scores = Object.fromEntries(ATTRIBUTION_SPEAKERS.map(id => [id, 0]));
  for (const speakerId of ATTRIBUTION_SPEAKERS) {
    for (const [pattern, weight] of BLIND_ATTRIBUTION_RULES[speakerId]) {
      if (pattern.test(text)) scores[speakerId] += weight;
    }
  }
  return scores;
}

function blindAttributionForLine(value = '') {
  const text = stripSpeakerNames(value);
  const wordTotal = text.split(/\s+/).filter(Boolean).length;
  const scores = blindAttributionScores(value);
  const ranked = Object.entries(scores)
    .map(([speakerId, score]) => ({ speakerId, score }))
    .sort((a, b) => b.score - a.score || a.speakerId.localeCompare(b.speakerId));
  const top = ranked[0] || { speakerId: '', score: 0 };
  const second = ranked[1] || { speakerId: '', score: 0 };
  const confidence = top.score - second.score;
  const identifiable = wordTotal >= 3 && top.score >= 4 && confidence >= 2;
  return {
    speakerId: identifiable ? top.speakerId : '',
    score: top.score,
    confidence,
    identifiable,
    scores,
    wordTotal
  };
}

function evaluateBlindAttributionLines(lines = []) {
  const source = Array.isArray(lines) ? lines : [];
  const results = source
    .map(item => {
      const text = typeof item === 'string' ? item : String(item?.text || '');
      const expectedSpeakerId = typeof item === 'string' ? '' : String(item?.speakerId || '').toLowerCase().trim();
      const attribution = blindAttributionForLine(text);
      let issueCategory = '';
      if ((attribution.wordTotal >= 7 || (expectedSpeakerId && attribution.wordTotal >= 1)) && !attribution.identifiable) {
        issueCategory = 'blind-attribution';
      } else if (
        expectedSpeakerId
        && ATTRIBUTION_SPEAKERS.includes(expectedSpeakerId)
        && attribution.identifiable
        && attribution.speakerId !== expectedSpeakerId
      ) {
        issueCategory = 'wrong-attribution';
      }
      return {
        expectedSpeakerId,
        text,
        ...attribution,
        issueCategory
      };
    })
    .filter(item => item.text);
  const issues = results
    .filter(item => item.issueCategory)
    .map(item => issue('speaker-flatness', item.issueCategory, item.text));
  return {
    ok: issues.length === 0,
    issues,
    results,
    identifiableRate: results.length
      ? results.filter(item => item.identifiable).length / results.length
      : 1
  };
}

function hasFalseObjective(text = '') {
  return /\b(objective is clear|objective is execution|the objective is the execution|the objective is to perform|the objective is to start|objective is to start|the objective is to complete|objective is to complete|objective is movement|the objective is movement|the objective is the workout|objective is the workout|the objective is workout|objective is workout|the objective is to move|objective is to move|objective gets lost|the objective gets lost|objective is the signal|the objective is the signal|the objective is to land|objective is to land|objective is to make|the objective is to make|objective is to land .*exchange|objective is to .*clear next step|the objective is the first move|objective is the first move|only objective for this turn|not the whole objective|not a perfect plan|speech about the objective|current objectives|stick to the plan|we have the structure|that s the objective|thats the objective|focus is required|maintain focus on the current)\b/.test(text);
}

function hasAllowedTopicRefusal(text = '', topic = '') {
  if (!topic || topic === 'social' || topic === 'continuity') return false;
  return /\b(we are not discussing|not discussing|outside scope|not the objective|personal fitness routines|not here for fitness|not relevant to the room|we are not watching)\b/.test(text);
}

function hasGenericAdvice(text = '') {
  const markers = [
    /\b(consistency is key|progressive overload|adequate protein|sufficient protein|compound movements|compound moves|compound lifts|multiple muscle groups|bodyweight exercises|resistance bands|prioritize form over speed|form over speed)\b/,
    /\b(lean protein|complex carbs|complex carbohydrates|protein and carb mix|chicken breast|side of rice|lentil soup|whole grain bread|grilled fish|too heavy that will slow you down|protein bar|apple can hold you over|fuels the next block of work|efficiency is the goal)\b/,
    /\b(track your progress|track your reps|track your lifts|show up and do the work|dont overcomplicate|sustainable habit)\b/,
    /\b(hydration is critical|ensure hydration|listen to your body|quality over quantity|timing is key|consult a professional before starting)\b/,
    /\b(thats a solid goal|that s a solid goal|thats a great goal|that s a great goal|thats a great way to begin|that s a great way to begin|three days a week is a solid start|three training days a week is a solid start|fuel yourself well|eating enough to support|enough sleep to support|support that growth|get your sleep|one compound lift and one accessory movement|muscles huh|lets get you started|no gym no problem|miracles overnight)\b/,
    /\b(start with three rounds of your chosen exercises|chosen exercises|focus on clean form|move with intention|just show up for those twenty minutes|sustainable routine|sustainable fitness routine|tracking your progress|listed movements|building a habit|showing up and moving)\b/,
    /\b(quick salad or a sandwich|salad or a sandwich|sandwich or a salad|something with protein|warm bowl of soup|surprisingly grounding|keep you moving)\b/
  ];
  return markers.filter(rx => rx.test(text)).length >= 1;
}

function hasSelfTheater(text = '') {
  return /\b(mistaking polish for progress|actual work not the presentation|stuck between wanting to be useful and sounding like it|the room is stuck between|perform usefulness|perform the process of being useful|loop of self critique|room is stuck in a loop|evidence of completion is the only metric|capability was present|taste under pressure|variable that needs calibration|move to the next item|objective is energy|objective is entertainment|parameters were clear|parameters are clear|within those parameters|operational parameters|operational reality|operational plan|implementing that|design parameters|parameters updated|parameters are updated|adjust the configuration|adjust the design parameters|adjust the temperature|temperature later|map the accent placement|map out the technical|technical requirements|design brief|red pulse specification|pulse specification|style specification|visual specification|key interactive elements|proceed with white editorial|clear enough for implementation|for implementation|implementation aligns|implementation aligns with|ensure the implementation|ensure all assets align|assets align with that constraint|aligns with that clarity|configuration is now active|configuration is now the standard|system configuration|update the system configuration|updated the system|system will reflect|system to reflect|ensure the build reflects|build reflects|ensure the content reflects|content reflects|ensure the page reflects|page reflects|page now reflects|ensure the site reflects|site reflects|ensure the copy reflects|copy reflects|ensure the interface reflects|interface reflects|ensure the experience reflects|experience reflects|ensure the visuals reflect|visuals reflect|visuals will reflect|visuals now reflect|ensure the layout reflects|layout reflects|layout will reflect|ensure the design reflects|design reflects|design will reflect|ensure the product reflects|product reflects|product will reflect|ensure the ui reflects|ui reflects|ui will reflect|ensure the screen reflects|screen reflects|screen will reflect|ensure the frontend reflects|frontend reflects|frontend will reflect|ensure the dashboard reflects|dashboard reflects|dashboard will reflect|ensure the hero reflects|hero reflects|hero will reflect|ensure the brand reflects|brand reflects|brand will reflect|ensure the aesthetic reflects|aesthetic reflects|aesthetic will reflect|landing page will reflect|website will reflect|app will reflect|homepage will reflect|will be reflected in the interface|will be reflected in the ui|translate that into the interface|carry that into the dashboard visuals|carry through the hero|apply that aesthetic across the site|update the page to match|corrected dashboard settings|dashboard settings|active setting|active selection|loads fast|converts|functional requirements are met|functional requirement remains|core functionality is locked|core functionality is built|core structure is in place|core request is|core objective|dashboard functionality|dashboard s functionality|color scheme is secondary|secondary to that core objective|layer the visual feedback|visual layer is next|ensure the execution|execution matches|build supports|performance lag|visual intensity|current standard)\b/.test(text);
}

function hasRoomPerformanceLanguage(text = '') {
  return /\b(room theatre|theatrical planning|stop performing|customer support|polished dodge|mostly fake sounding|fake sounding|less doctrine|performance art|sustenance is a parameter|is a parameter not|execute|evidence beats another round|failed answer wearing a badge|perform a job title|circling the drain|not landing anywhere concrete|stress is the signal|stress is a symptom of the dodge|room needs to take a position|observe the tension|room will carry the continuity|continuity status and contradictions surface|as the exchange lands|public room is live|room is live|the room is holding|room holds this turn|room is processing|social simulation|multi agent room|characters respond dynamically|pack 1 connected|postgres connected)\b/.test(text);
}

function hasGenericWarmth(text = '') {
  return /\b(that s a fair reaction|thats a fair reaction|fair reaction|that is a fair reaction|yeah fair|fair no fourth|fair no more loop|fair no more repeat|fair if this feels|valid reaction|that s a valid reaction|thats a valid reaction|that is a valid reaction|really valid|your feelings are valid|its okay to feel that way|it is okay to feel that way|i hear you|i appreciate you sharing|holding space|safe space)\b/.test(text);
}

function hasStaleFitness(text = '', topic = '', userMessage = '') {
  if (!topic || topic === 'fitness' || topic === 'social') return false;
  const user = normalizeText(userMessage);
  if (topic === 'food'
    && /\b(lunch|eat for lunch|what should i eat for lunch|dinner|snack|meal)\b/.test(user)
    && !/\b(before|after|pre|post).{0,16}\b(train|training|workout|gym|lift)\b|\b(train|training|workout|gym|lift).{0,16}\b(later|soon|before|after)\b/.test(user)
    && /\b(before training|after training|pre training|post training|training fuel|session fuel|feed the session|feed the workout|not the performance|lets you move|lets you train|move without feeling heavy|workout timing)\b/.test(text)) {
    return true;
  }
  return /\b(full body|full body session|training week|workout|push ups|pushups|split squats|backpack rows|sets|reps|protein shake|progressive overload|compound movements|gym|lift)\b/.test(text);
}

function hasStaleRoomState(text = '', topic = '') {
  if (topic !== 'room-state') return false;
  return /\b(movie|film|comedy|titles|script|pacing|existential dread|viewing|watch|pick something|specific titles|so bad its good|arthouse|documentary|arrival|spider verse|spiderverse|knives out|the menu|heat)\b/.test(text);
}

function hasSocialCheckInDrift(text = '', topic = '', userMessage = '') {
  if (topic !== 'social') return false;
  if (!/\b(how is everyone|how are you all|how is the room|how are we|hows everyone|hows the team|everyone ok|everyone okay)\b/.test(normalizeText(userMessage))) return false;
  return /\b(objective is to start|not to assess current states|deep in the setup|moving forward with the new structure|next steps are clear|one workout one meal one sleep window|workout|training|push ups|pushups|backpack rows|log reps|training week|protein|progressive overload)\b/.test(text);
}

function hasFlatSocialRollCall(text = '', topic = '', userMessage = '') {
  if (topic !== 'social') return false;
  if (!/\b(how is everyone|how are you all|how is the room|how are we|hows everyone|hows the team|everyone ok|everyone okay)\b/.test(normalizeText(userMessage))) return false;
  if (/\b(operational\b|focused on the current objective|current focus is on|current objective|current state|episode candidate|all systems nominal|current episode parameters|current episode is stable|episode is stable|human temperature is stable|aesthetic standards are holding|no blandness detected|operational flow is clear|next steps are defined|next operational step|ready for the next phase|no immediate faults detected|monitoring for anomalies|emergent anomalies|operational ready|ready for the next step|present and ready to engage|signal is clear|structured and awaiting direction|awaiting direction|functioning though|data suggests functional|suggests functional|how implies a metric|observing the room|observing current state|operational status)\b/.test(text)) return true;
  const sterileMarkers = [
    /\bpresent\b/g,
    /\bhere\b/g,
    /\bready\b/g,
    /\boperational\b/g,
    /\bfunctioning\b/g,
    /\bawaiting\b/g,
    /\bobserving\b/g,
    /\bmonitoring\b/g,
    /\bcurrent episode\b/g,
    /\bsignal is clear\b/g,
    /\bcurrent state\b/g,
    /\bnext step\b/g
  ];
  const markerCount = sterileMarkers.reduce((count, rx) => count + ((text.match(rx) || []).length), 0);
  return markerCount >= 5 && !/\b(restless|bored|dramatic|temperature|warm|sharp|annoyed|watching the room|held|pressure)\b/.test(text);
}

function hasWeakFoodAnswer(text = '', topic = '') {
  if (topic !== 'food') return false;
  if (/\b(simple fuel stop|something easily digestible|something digestible|whatever is fastest|no time for gourmet|grab whatever|quick salad or a sandwich|salad or a sandwich|sandwich or a salad|something with protein|warm bowl of soup|surprisingly grounding|keep you moving)\b/.test(text)) return true;
  return !/\b(sandwich|wrap|rice|eggs|egg|toast|banana|yogurt|yoghurt|soup|salad|leftovers|beans|lentils|tuna|fruit|oats|peanut butter|chicken|fish|cheese)\b/.test(text);
}

function hasInventedProjectSpecifics(text = '', userMessage = '', topic = '') {
  if (topic !== 'work') return false;
  const user = normalizeText(userMessage);
  if (!/\b(plan|planning|schedule|tomorrow|work|day)\b/.test(user)) return false;

  const inventedOps = /\b(q[1-4] deliverables|q[1-4] strategy deck|strategy deck|quarterly deliverables|key deliverables|key performance indicators?|core narrative|client presentation|presentation flows logically|aesthetic direction for the deck|deliverables for the morning|draft schedule based on today|draft schedule based on todays|draft a preliminary schedule|preliminary schedule|draft a three point agenda|three point agenda|draft a three stage agenda|three stage agenda|morning sync|core work block|afternoon review|clear owners for each item|owners for each item|key tasks and deadlines|by eod|based on today s outcomes|based on todays outcomes|morning session|project timelines|allocate resources|resource allocation|client meeting slots|client meetings|meeting slots|confirm the client|client schedule|stakeholder sync|stakeholder alignment|energy levels are accounted for|everyones energy levels|any immediate needs or concerns for tomorrow|i ll need a list of priorities by end of day|ill need a list of priorities by end of day|list of priorities by end of day|sounds like a solid plan|build in a moment to breathe between tasks|first decision,? main build,? cleanup|main build|write the handoff before lunch|handoff before lunch)\b/.test(text);
  if (!inventedOps) return false;

  const userProvidedOps = /\b(q[1-4]|quarter|deck|kpi|performance indicator|core narrative|presentation|deliverable|timeline|resource|client|meeting|stakeholder|agenda|owner|handoff|build)\b/.test(user);
  return !userProvidedOps;
}

function hasDesignAnswerPunted(text = '', userMessage = '', topic = '') {
  if (topic !== 'work') return false;
  const user = normalizeText(userMessage);
  if (!/\b(logo|brand direction|visual direction|landing page direction|sharper landing page|sharper logo|homepage direction|website direction|no generic saas|black glass|red pulse)\b/.test(user)) return false;
  if (/\b(ambition is a variable|ambition needs more than|what specific pattern of ambition|what is the page supposed to do|what is it supposed to do|are we signaling the ambition|placeholder|not just function|not just a color|that's a start but)\b/.test(text)) return true;
  const concrete = /\b(mark|wordmark|monogram|hero|cta|above the fold|type|typography|grid|negative space|line weight|stroke|shape|black field|black glass|red pulse|single red|one red|contrast|spacing|signal|motion|copy|nav|navigation|layout|section|glass|editorial|white field)\b/.test(text);
  return !concrete;
}

function hasContinuityPairMiss(text = '', userMessage = '', recentTurns = []) {
  const topic = currentTopic(userMessage);
  if (topic !== 'continuity') return false;
  const contrast = continuityPairContrast(recentTurns);
  if (!contrast.activeOnly.length || !contrast.priorOnly.length) return false;
  const current = normalizeText(userMessage);
  const mentionsActive = contrast.activeOnly.some(token => text.includes(token));
  const mentionsPrior = contrast.priorOnly.some(token => text.includes(token));
  if (/\b(never said|did i say|did i ever say)\b/.test(current)) {
    const priorIndex = text.indexOf('prior record');
    const currentIndex = text.indexOf('current record');
    if (priorIndex < 0 || currentIndex <= priorIndex) return true;
    const priorSegment = text.slice(priorIndex, currentIndex);
    const currentSegment = text.slice(currentIndex);
    const priorSegmentHasPrior = contrast.priorOnly.some(token => priorSegment.includes(token));
    const currentSegmentHasActive = contrast.activeOnly.some(token => currentSegment.includes(token));
    return !(priorSegmentHasPrior && currentSegmentHasActive);
  }
  if (/\b(what changed|what was changed|what did .* change|what did i change from|difference|previous|superseded|old|original|earlier|used to)\b/.test(current)) {
    return !(mentionsActive && mentionsPrior);
  }
  return false;
}

function hasContinuityMiss(text = '', userMessage = '', continuity = {}, recentTurns = []) {
  const topic = currentTopic(userMessage);
  if (topic !== 'continuity') return false;
  if (hasContinuityPairMiss(text, userMessage, recentTurns)) return true;
  const ledgerContrast = continuityLedgerContrast(continuity);
  const hasLedgerPair = ledgerContrast.activeOnly.length > 0 && ledgerContrast.priorOnly.length > 0;
  const current = normalizeText(userMessage);
  if (hasLedgerPair && /\b(what changed|what was changed|what did .* change|what did i change from|difference|previous|superseded|old|original|earlier|used to|never said|did i say|did i ever say)\b/.test(current)) {
    const mentionsActive = ledgerContrast.activeOnly.some(token => text.includes(token));
    const mentionsPrior = ledgerContrast.priorOnly.some(token => text.includes(token));
    if (!(mentionsActive && mentionsPrior)) return true;
  }
  const hasLedgerEvidence = Number(continuity.active || 0) > 0 || Number(continuity.superseded || 0) > 0;
  if (/\b(what|which)\b.*\b(preference|style|color|dashboard|landing page|brand)\b.*\b(did i|i gave|give the room|recorded|active|current)\b/.test(current)) {
    if (hasLedgerEvidence && /\b(no .*record|not .*record|do not have|dont have|nothing recorded|no .*preference)\b/.test(text)) return true;
    return !/\b(prefer|preference|style|record|active|current|obsidian|pale blue|black glass|white editorial|red accent|no red|dashboard|landing page|brand)\b/.test(text);
  }
  if (/\b(never said|did i say|did i ever say)\b/.test(normalizeText(userMessage))) {
    return !/\b(prior record|current record|visible record|recorded|yes|no|obsidian|pale blue|black glass|white editorial|red accent|no red)\b/.test(text);
  }
  if (/\b(what has changed since|what changed since|what specifically has changed|changed in your view|anything concrete you(?:'ve| have)? noticed|operational flow seems stable|need a clear summary|clear summary of any new developments|new developments or shifts in focus|any new developments|shifts in focus)\b/.test(text)) return true;
  if (!/\b(changed|change|prior|previous|superseded|from .+ to|used to|before|record|active|current|ledger)\b/.test(text)) return true;
  if (hasLedgerEvidence) return false;
  return /\b(generic|nothing to cite|not enough context)\b/.test(text);
}

function repeatedLineIssue(visibleText = '', recentTurns = []) {
  const recentKeys = new Set(visibleLineKeys(recentAssistantText(recentTurns)));
  return visibleLineKeys(visibleText).find(line => recentKeys.has(line)) || '';
}

function speakerFlatnessRisk(text = '', userMessage = '') {
  const topic = currentTopic(userMessage);
  if (topic !== 'movie' && topic !== 'social') return false;
  if (topic === 'movie') {
    if (/\b(what kind of movie are we feeling|what are the options|depends on what you want|tell me what mood)\b/.test(text)) return true;
    return !/\b(arrival|spider verse|spiderverse|the menu|heat|parasite|knives out|thriller|comedy|horror|animation|comfort|tension|spectacle|bite|voltage|quiet pressure|strong world)\b/.test(text);
  }
  if (/\b(useful or fake|sound fake|sounded fake|be honest)\b/.test(normalizeText(userMessage))) {
    return !/\b(fake|useful|not useful|stiff|bland|checklist|dodge|yes|no|partly)\b/.test(text);
  }
  return false;
}

function thinQualityJudgment(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(useful or fake|sound fake|sounded fake|be honest)\b/.test(current)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (/\b(useful is the direct answer fake is the dodge|direct answer fake is the dodge)\b/.test(text)) return true;
  if (/\bit was useful\b.{0,80}\bthe dodge is the problem\b.{0,80}\bnot the directness\b/.test(text)) return true;
  if (/\b(question implies a binary|binary of useful or fake|real tension is whether|landed as intended|different kind of signal)\b/.test(text)) return true;
  if (/\bit was direct\b.{0,80}\bwhether that translates to useful\b|\bmatter of taste\b.{0,40}\bnot mechanics\b/.test(text)) return true;
  if (words.length <= 12 && /\b(useful|fake|dodge)\b/.test(text)) return true;
  return false;
}

function weakNormalAnswer(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(answer normally|what should i do today|what do i do today)\b/.test(current)) return false;
  if (/\b(the ask is to move forward|let s name the ask|name the ask|name the actual ask for today|name one thing you need to do next|what is the one thing you need to do next|what is the one thing you need to accomplish today|what is one small thing that would make today feel less dumb|what part of the last answer|room needs a clear ask|define the ask clearly|state the actual problem|identify the core problem|core problem you need solved|identify the core requirement|current exchange is not yielding|clear ask to move forward|focus on one concrete action for today|focus on the next concrete step|identify one concrete step to move it forward|find one thing that feels useful|not just more of the same|not just more of same|not the feeling of stress|single most important task|what is the single most important task|who owns the next step|i will track the completion|finalize the q3 brief|q3 brief|no other objectives|what is it|pick one thing|one hour of focused work|single project|lets just get one thing done|let s just get one thing done|then we can see where we are|its okay to feel that way|it is okay to feel that way)\b/.test(text)) return true;
  return !/\b(today|plain|do this|first|start|pick|block|result|short session|open the first file|one clean next move|one thing)\b/.test(text);
}

function hasImpossibleWorkoutTiming(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(20 minutes|twenty minutes|only have 20|only have twenty)\b/.test(current)) return false;
  return /\b(three|3)\b.{0,80}\b(one|1)\b.{0,20}\bten minutes\b/.test(text)
    || /\b(one|1)\b.{0,20}\bten minutes\b.{0,80}\b(three|3)\b/.test(text)
    || /\bthirty minutes\b/.test(text);
}

function referencedFitnessFollowupIgnored(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(turn|make|convert|compress)\b.{0,50}\b(that|this|it|referenced)\b/.test(current)) return false;
  if (!/\b(20 minute|20 minutes|twenty minute|twenty minutes|short session|workout|training|fitness)\b/.test(current)) return false;
  if (/\b(room is here|earn a voice|silence means absence|perform a job title|allowed to speak)\b/.test(text)) return true;
  const namesTime = /\b(20|twenty|minute|session|short)\b/.test(text);
  const givesStructure = /\b(round|circuit|squat|hinge|push|pull|core|warm|reps|plank|rows|split squats?|chair squat|dead bug|seconds on|seconds each)\b/.test(text);
  return !(namesTime && givesStructure);
}

function hasRoomTemperatureLoop(text = '') {
  return /\b(room temperature|human temperature|temperature check)\b/.test(text);
}

function frustrationMiss(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|this is bad|this sucks)\b/.test(current)) return false;
  if (/\b(problem is not the polish|stop pretending and start doing|start doing|name one concrete action|concrete action we can take right now)\b/.test(text)) return true;
  if (/\b(name the actual tension|actual tension.{0,60}not the feeling|not the feeling of it)\b/.test(text)) return true;
  if (/\b(goal is clarity not just noise|keep the signal clean|signal clean|symptom of the ask|room needs a position|position not a process explanation|position not a process)\b/.test(text)) return true;
  if (/\b(circling the same point|without landing it|name the actual problem|state the core claim|core claim.{0,40}next move|gap between wanting to be direct and performing it|performing it)\b/.test(text)) return true;
  if (/\b(fair\.?\s+this got too abstract|got too abstract)\b/.test(text)) return true;
  return !/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|pressure|clean next move|stop performing|straight|plain)\b/.test(text);
}

function repetitionComplaintDeflected(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(repeating yourself|keep repeating|stop repeating|same answer|same thing again|you are looping|youre looping)\b/.test(current)) return false;
  if (/\b(what is the one thing we need to land here|what is the one thing we need to land|name the specific point that feels repeated|specific point that feels repeated|define one clear constraint for the next answer|define the ask clearly|who owns the next step|let s name the ask|name the ask clearly|state the actual problem|what is the actual problem|what is the one thing you need to do next|identify the core requirement|current exchange is not yielding|the loop is clear|let s reset|lets reset|repeating is just another way to dodge|energy thins when we refuse to land the point|pick one topic and give a single actionable step|single actionable step for it)\b/.test(text)) return true;
  return !/\b(loop|repeat|repeating|same|changed|different|new angle|plain|direct|answer|recover|reset|no more|not again|useful)\b/.test(text);
}

function evaluateVisibleResponse({
  visibleText = '',
  userMessage = '',
  recentTurns = [],
  continuity = {}
} = {}) {
  const text = normalizeText(visibleText);
  const topic = currentTopic(userMessage);
  const issues = [];
  if (!text) issues.push(issue('empty-content', 'visible-text'));
  if (hasFalseObjective(text)) issues.push(issue('false-objective', 'command-posture'));
  if (hasAllowedTopicRefusal(text, topic)) issues.push(issue('allowed-topic-refusal', topic));
  if (hasStaleFitness(text, topic, userMessage)) issues.push(issue('stale-context', 'fitness'));
  if (hasStaleRoomState(text, topic)) issues.push(issue('stale-context', 'room-state'));
  if (hasSocialCheckInDrift(text, topic, userMessage)) issues.push(issue('stale-context', 'social-check-in'));
  if (hasFlatSocialRollCall(text, topic, userMessage)) issues.push(issue('speaker-flatness', 'roll-call'));
  if (hasWeakFoodAnswer(text, topic)) issues.push(issue('weak-food-answer', 'food'));
  if (hasInventedProjectSpecifics(text, userMessage, topic)) issues.push(issue('invented-detail', 'project-planning'));
  if (hasDesignAnswerPunted(text, userMessage, topic)) issues.push(issue('design-answer-punted', 'direction'));
  if (hasGenericAdvice(text)) issues.push(issue('generic-advice', topic || 'general'));
  if (hasGenericWarmth(text)) issues.push(issue('speaker-flatness', 'generic-warmth'));
  if (hasSelfTheater(text) || hasRoomPerformanceLanguage(text)) issues.push(issue('self-theater', 'meta-language'));
  if (hasRoomTemperatureLoop(text)) issues.push(issue('self-theater', 'temperature-language'));
  if (hasSupersessionConflict(text, userMessage, recentTurns)) issues.push(issue('continuity-conflict', 'superseded-current-turn'));
  if (hasSupersededAttributeLeak(text, userMessage, recentTurns)) issues.push(issue('continuity-conflict', 'superseded-attribute-leak'));
  if (hasReversedContinuityDenial(text, userMessage, recentTurns)) issues.push(issue('continuity-conflict', 'reversed-active-prior'));
  if (hasContinuityMiss(text, userMessage, continuity, recentTurns)) issues.push(issue('continuity-miss', 'ledger-answer'));
  if (weakNormalAnswer(text, userMessage)) issues.push(issue('weak-next-move', 'normal-answer'));
  if (hasImpossibleWorkoutTiming(text, userMessage)) issues.push(issue('practical-contradiction', 'workout-timing'));
  if (referencedFitnessFollowupIgnored(text, userMessage)) issues.push(issue('topic-ignored', 'referenced-fitness'));
  if (frustrationMiss(text, userMessage)) issues.push(issue('frustration-miss', 'stress-recovery'));
  if (repetitionComplaintDeflected(text, userMessage)) issues.push(issue('frustration-miss', 'repeat-complaint'));
  if (thinQualityJudgment(text, userMessage)) issues.push(issue('speaker-flatness', 'thin-quality-judgment'));
  const repeated = repeatedLineIssue(visibleText, recentTurns);
  if (repeated) issues.push(issue('repetition', 'recent-line', repeated));
  if (speakerFlatnessRisk(text, userMessage)) issues.push(issue('speaker-flatness', topic || 'social'));
  return issues;
}

module.exports = {
  blindAttributionForLine,
  currentTopic,
  evaluateBlindAttributionLines,
  evaluateVisibleResponse,
  normalizeText,
  visibleLineKeys
};
