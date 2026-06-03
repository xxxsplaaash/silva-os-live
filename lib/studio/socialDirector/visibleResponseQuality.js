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
  if (/\b(what changed|what was changed|what did .* change|difference|previous|superseded|never said|did i say|did i ever say)\b/.test(text)) return 'continuity';
  if (/\b(movie|film|watch tonight|watch next|what should we watch|what should the room watch)\b/.test(text)) return 'movie';
  if (/\b(food|hungry|lunch|dinner|snack|eat|meal|nutrition)\b/.test(text)) return 'food';
  if (/\b(logo|brand|design|campaign|creative|content|calendar|plan|planning|schedule|work|client)\b/.test(text)) return 'work';
  if (/\b(muscle|muscles|fitness|workout|gym|lift|lifting|strength|bulk|train|training|exercise|sets|reps|protein)\b/.test(text)) return 'fitness';
  if (/\b(room tension|actual tension|tension in this room|what is the tension|what is the actual tension)\b/.test(text)) return 'room-state';
  if (/\b(how is everyone|how are you all|useful or fake|sound fake|sounded fake|be honest|this feels dumb|stressed|stress|bruh|bro|wtf|repeating yourself|answer normally)\b/.test(text)) return 'social';
  return '';
}

function issue(family, category, evidence = '') {
  return { family, category, evidence: String(evidence || '').slice(0, 160) };
}

function hasFalseObjective(text = '') {
  return /\b(objective is clear|objective is execution|the objective is the execution|current objectives|stick to the plan|we have the structure|that s the objective|thats the objective|focus is required|maintain focus on the current)\b/.test(text);
}

function hasAllowedTopicRefusal(text = '', topic = '') {
  if (!topic || topic === 'social' || topic === 'continuity') return false;
  return /\b(we are not discussing|not discussing|outside scope|not the objective|personal fitness routines|not here for fitness|not relevant to the room|we are not watching)\b/.test(text);
}

function hasGenericAdvice(text = '') {
  const markers = [
    /\b(consistency is key|progressive overload|adequate protein|sufficient protein|compound movements|compound lifts|bodyweight exercises|resistance bands)\b/,
    /\b(lean protein|complex carbs|complex carbohydrates|protein and carb mix|chicken breast|side of rice|lentil soup|whole grain bread|grilled fish|too heavy that will slow you down|protein bar|apple can hold you over|fuels the next block of work|efficiency is the goal)\b/,
    /\b(track your progress|track your reps|track your lifts|show up and do the work|dont overcomplicate|sustainable habit)\b/,
    /\b(hydration is critical|ensure hydration|listen to your body|quality over quantity|timing is key|consult a professional before starting)\b/,
    /\b(thats a solid goal|muscles huh|lets get you started|no gym no problem|miracles overnight)\b/
  ];
  return markers.filter(rx => rx.test(text)).length >= 1;
}

function hasSelfTheater(text = '') {
  return /\b(mistaking polish for progress|actual work not the presentation|stuck between wanting to be useful and sounding like it|the room is stuck between|perform usefulness|evidence of completion is the only metric|capability was present|taste under pressure|variable that needs calibration|move to the next item|parameters were clear|within those parameters|operational parameters|design parameters|parameters updated|parameters are updated|adjust the configuration|adjust the design parameters|map the accent placement|key interactive elements|proceed with white editorial|clear enough for implementation|configuration is now active|configuration is now the standard|system configuration|update the system configuration|corrected dashboard settings|dashboard settings|active setting|active selection|current standard)\b/.test(text);
}

function hasStaleFitness(text = '', topic = '') {
  if (!topic || topic === 'fitness' || topic === 'social') return false;
  return /\b(full body|full body session|training week|workout|push ups|pushups|split squats|backpack rows|sets|reps|protein shake|progressive overload|compound movements|gym|lift)\b/.test(text);
}

function hasStaleRoomState(text = '', topic = '') {
  if (topic !== 'room-state') return false;
  return /\b(movie|film|comedy|titles|script|pacing|existential dread|viewing|watch|pick something|specific titles|so bad its good|arthouse|documentary|arrival|spider verse|spiderverse|knives out|the menu|heat)\b/.test(text);
}

function hasContinuityMiss(text = '', userMessage = '', continuity = {}) {
  const topic = currentTopic(userMessage);
  if (topic !== 'continuity') return false;
  const hasLedgerEvidence = Number(continuity.active || 0) > 0 || Number(continuity.superseded || 0) > 0;
  if (/\b(never said|did i say|did i ever say)\b/.test(normalizeText(userMessage))) {
    return !/\b(prior record|current record|visible record|recorded|yes|no|obsidian|pale blue|black glass|white editorial|red accent|no red)\b/.test(text);
  }
  if (!/\b(changed|change|prior|previous|superseded|from .+ to|used to|before|record|active)\b/.test(text)) return true;
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
    return !/\b(arrival|spider verse|spiderverse|the menu|heat|parasite|knives out|thriller|comedy|horror|animation|comfort|tension|spectacle|bite|voltage|film|movie)\b/.test(text);
  }
  if (/\b(useful or fake|sound fake|sounded fake|be honest)\b/.test(normalizeText(userMessage))) {
    return !/\b(fake|useful|not useful|stiff|bland|checklist|dodge|yes|no|partly)\b/.test(text);
  }
  return false;
}

function weakNormalAnswer(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(answer normally|what should i do today|what do i do today)\b/.test(current)) return false;
  if (/\b(what is the one thing you need to do next|what part of the last answer|room needs a clear ask|state the actual problem|identify the core requirement|current exchange is not yielding|clear ask to move forward|focus on one concrete action for today|focus on the next concrete step|not the feeling of stress|single most important task|what is the single most important task|finalize the q3 brief|q3 brief|no other objectives|what is it)\b/.test(text)) return true;
  return !/\b(today|plain|do this|first|start|pick|block|result|short session|open the first file|one clean next move|one thing)\b/.test(text);
}

function frustrationMiss(text = '', userMessage = '') {
  const current = normalizeText(userMessage);
  if (!/\b(stressed|stress|dumb|this feels dumb|starting to feel dumb|frustrated|annoyed|this is bad|this sucks)\b/.test(current)) return false;
  if (/\b(problem is not the polish|stop pretending and start doing|start doing|name one concrete action|concrete action we can take right now)\b/.test(text)) return true;
  return !/\b(stress|stressed|dumb|frustrat|annoy|bad|reset|slow down|recover|fair|mess|pressure|clean next move|stop performing|straight|plain)\b/.test(text);
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
  if (hasStaleFitness(text, topic)) issues.push(issue('stale-context', 'fitness'));
  if (hasStaleRoomState(text, topic)) issues.push(issue('stale-context', 'room-state'));
  if (hasGenericAdvice(text)) issues.push(issue('generic-advice', topic || 'general'));
  if (hasSelfTheater(text)) issues.push(issue('self-theater', 'meta-language'));
  if (hasContinuityMiss(text, userMessage, continuity)) issues.push(issue('continuity-miss', 'ledger-answer'));
  if (weakNormalAnswer(text, userMessage)) issues.push(issue('weak-next-move', 'normal-answer'));
  if (frustrationMiss(text, userMessage)) issues.push(issue('frustration-miss', 'stress-recovery'));
  const repeated = repeatedLineIssue(visibleText, recentTurns);
  if (repeated) issues.push(issue('repetition', 'recent-line', repeated));
  if (speakerFlatnessRisk(text, userMessage)) issues.push(issue('speaker-flatness', topic || 'social'));
  return issues;
}

module.exports = {
  currentTopic,
  evaluateVisibleResponse,
  normalizeText,
  visibleLineKeys
};
