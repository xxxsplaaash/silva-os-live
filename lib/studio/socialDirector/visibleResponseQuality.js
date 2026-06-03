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
  if (/\b(how is everyone|how are you all|room tension|actual tension|useful or fake|sound fake|sounded fake|be honest|this feels dumb|stressed|stress|bruh|bro|wtf|repeating yourself|answer normally)\b/.test(text)) return 'social';
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
    /\b(track your progress|track your reps|track your lifts|show up and do the work|dont overcomplicate|sustainable habit)\b/,
    /\b(hydration is critical|ensure hydration|listen to your body|quality over quantity|timing is key|consult a professional before starting)\b/,
    /\b(thats a solid goal|muscles huh|lets get you started|no gym no problem|miracles overnight)\b/
  ];
  return markers.filter(rx => rx.test(text)).length >= 1;
}

function hasSelfTheater(text = '') {
  return /\b(mistaking polish for progress|actual work not the presentation|stuck between wanting to be useful and sounding like it|the room is stuck between|perform usefulness|evidence of completion is the only metric|capability was present|taste under pressure|variable that needs calibration|move to the next item|parameters were clear|within those parameters|operational parameters)\b/.test(text);
}

function hasStaleFitness(text = '', topic = '') {
  if (!topic || topic === 'fitness' || topic === 'social') return false;
  return /\b(full body|full body session|training week|workout|push ups|pushups|split squats|backpack rows|sets|reps|protein shake|progressive overload|compound movements|gym|lift)\b/.test(text);
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
  if (hasGenericAdvice(text)) issues.push(issue('generic-advice', topic || 'general'));
  if (hasSelfTheater(text)) issues.push(issue('self-theater', 'meta-language'));
  if (hasContinuityMiss(text, userMessage, continuity)) issues.push(issue('continuity-miss', 'ledger-answer'));
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
