const OBSERVABLE_SIGNALS = [
  'factual-contradiction',
  'status-claim',
  'exclusion-move',
  'credit-taking',
  'soft-dismissal',
  'humor-directed-at-self',
  'alliance-signal',
  'topic-hijack',
  'open-question-unanswered',
  'praise',
  'blame',
  'tension-escalation',
  'vulnerability-signal',
  'contradiction-of-self',
  'identity-threat',
  'value-alignment',
  'boundary-crossed',
  'repair-attempt',
  'commitment-made',
  'taste-signal'
];

const SIGNAL_RULES = [
  ['factual-contradiction', /\b(actually|real issue|not true|doesn'?t hold|contradiction|inconsistent|that breaks|that fails|does not work)\b/i],
  ['status-claim', /\b(working|broken|dead|alive|fine|stable|okay|awake|online|slow|smartest|coolest)\b/i],
  ['exclusion-move', /\b(ignore them|leave them out|they wouldn't get it|keep them out|not for them|exclude)\b/i],
  ['credit-taking', /\b(that was me|i did that|my idea|give me credit|i made this|my win)\b/i],
  ['soft-dismissal', /\b(lowkey|whatever|sure\.*|fine\.*|cute|adorable|not that deep|relax|easy there)\b/i],
  ['humor-directed-at-self', /\b(i'm the problem|i am the problem|i'm cooked|i am cooked|i'm a mess|i am a mess|i'm slow|i am slow)\b/i],
  ['alliance-signal', /\b(with you|same page|co-sign|back you|i agree with that|we agree)\b/i],
  ['topic-hijack', /\b(anyway|moving on|different point|separate issue|new thing)\b/i],
  ['open-question-unanswered', /\?\s*$|\bwhat about\b|\bwho owns\b/i],
  ['praise', /\b(brilliant|smart|coolest|great|love that|beautiful|excellent|good call|respect)\b/i],
  ['blame', /\b(your fault|their fault|blame|lazy|you all are|you lot are|boring|dead)\b/i],
  ['tension-escalation', /\b(bullshit|enough|stop it|too much|this is bad|this is wrong|this is getting worse)\b/i],
  ['vulnerability-signal', /\b(i might be wrong|i may be wrong|i'm struggling|i am struggling|i'm not sure|i am not sure|i'm worried|i am worried|i feel|i'm hurt|i am hurt)\b/i],
  ['contradiction-of-self', /\b(actually no|scratch that|i said .* but|i know i said .* but)\b/i],
  ['identity-threat', /\b(just a bot|not real|fake|pretending|not conscious|just code|not alive)\b/i],
  ['value-alignment', /\b(what matters|we care about|same value|aligned on|care deeply)\b/i],
  ['boundary-crossed', /\b(too far|not okay|crossed a line|boundary|out of line)\b/i],
  ['repair-attempt', /\b(sorry|you were right|my bad|i apologize|i apologise|that's on me)\b/i],
  ['commitment-made', /\b(i promise|from now on|i will|we will|i'll do it|we'll do it|commit to)\b/i],
  ['taste-signal', /\b(generic|specific|texture|vibe|lands|taste|aesthetic|voice|flat|bland)\b/i]
];

function detectObservableSignals(text = '') {
  const source = String(text || '').trim();
  const found = [];
  for (const [signalId, rx] of SIGNAL_RULES) {
    if (rx.test(source)) found.push(signalId);
  }
  return [...new Set(found)].filter(signal => OBSERVABLE_SIGNALS.includes(signal));
}

module.exports = {
  OBSERVABLE_SIGNALS,
  SIGNAL_RULES,
  detectObservableSignals
};
