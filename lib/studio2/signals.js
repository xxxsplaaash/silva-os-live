const SIGNAL_IDS = [
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
  'contradiction-of-self'
];

function detectObservableSignals(text = '') {
  const q = String(text || '').trim().toLowerCase();
  const signals = [];
  if (/\b(not working|broken|failing|wrong|issue|problem|bug)\b/.test(q)) signals.push('status-claim');
  if (/\bbut|however|actually|that is not true|that isn't true|contradiction\b/.test(q)) signals.push('factual-contradiction');
  if (/\bwe|they|you all\b/.test(q) && /\bblame|fault|lazy|dead|boring\b/.test(q)) signals.push('blame');
  if (/\bignore|exclude|left out|not listening\b/.test(q)) signals.push('exclusion-move');
  if (/\bpraise|beautiful|brilliant|smart|coolest|funniest\b/.test(q)) signals.push('praise');
  if (/\bfeel|mood|vibe|chemistry|energy|alive|dead\b/.test(q)) signals.push('vulnerability-signal');
  return signals;
}

module.exports = {
  SIGNAL_IDS,
  detectObservableSignals
};
