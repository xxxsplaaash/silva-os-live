const { ACTIVE_CHARACTER_IDS } = require('./characters');
const { resolveExplicitWorkflowContext } = require('./workflow');

const DIRECT_NAME_MAP = {
  aisha: 'aisha',
  leah: 'leah',
  claudia: 'claudia',
  grok: 'grok',
  gerhard: 'grok',
  vanya: 'vanya'
};

const DIAGNOSTIC_RX = /\b(bug|broken|failing|not working|stale|issue|problem|wrong with this chat|what is broken here|system not functioning)\b/i;
const GREETING_RX = /\b(hi|hello|hey)\b/i;
const PRESENCE_RX = /\b(who(?:'s| is)\s+(?:online|here|around)|who is around)\b/i;
const CHECKIN_RX = /\b(how(?:'s| is)\s+everyone feeling|how(?:'re| are)\s+you all doing|how is everyone|everyone(?:'s|s)? mood|reading the room)\b/i;
const CRITIQUE_RX = /\b(dead|boring|contextually unaware|sound like ai|sounds like ai|chemistry|room right now|be honest|not what it should be|stops sounding like|performing aliveness)\b/i;
const BARE_THOUGHT_RX = /^(?:so\s+)?(?:any\s+)?(thoughts|ideas)\??$/i;
const PLAYFUL_RX = /\b(lol|haha|lmao|funniest|smartest|coolest|slowest|joke|funny|laugh)\b/i;

function detectDirectTarget(question = '') {
  const q = String(question || '').trim().toLowerCase();
  for (const [needle, id] of Object.entries(DIRECT_NAME_MAP)) {
    if (new RegExp(`\\b${needle}\\b`).test(q)) return id;
  }
  return '';
}

function resolveIntentFamily(question = '', lane = 'room') {
  const q = String(question || '').trim();
  if (lane === 'diagnostic') return 'technical-diagnosis';
  if (lane === 'workflow' || lane === 'commit') return 'planning';
  if (lane === 'spark') return 'spark-aside';
  if (lane === 'direct') return 'direct-answer';
  if (PRESENCE_RX.test(q)) return 'presence-check';
  if (CHECKIN_RX.test(q)) return 'social-checkin';
  if (GREETING_RX.test(q)) return 'greeting';
  if (CRITIQUE_RX.test(q)) return 'pulse-critique';
  if (PLAYFUL_RX.test(q)) return 'playful-room';
  if (BARE_THOUGHT_RX.test(q)) return 'creative-room';
  return 'casual-room';
}

function resolveTurnLane({
  question = '',
  explicitWorkflowIntent = '',
  attachments = [],
  commitRequested = false,
  confirmCommit = false,
  manualSpark = false
} = {}) {
  const q = String(question || '').trim().toLowerCase();
  if (manualSpark) return 'spark';
  const workflow = resolveExplicitWorkflowContext({ question, explicitIntent: explicitWorkflowIntent, attachments, commitRequested, confirmCommit });
  if (workflow.allowed) return workflow.lane;
  if (detectDirectTarget(q)) return 'direct';
  if (DIAGNOSTIC_RX.test(q)) return 'diagnostic';
  return 'room';
}

function resolveTurnPlan(input = {}) {
  const lane = resolveTurnLane(input);
  const targetSpeakerId = lane === 'direct' ? detectDirectTarget(input.question) : '';
  const workflow = resolveExplicitWorkflowContext({
    question: input.question,
    explicitIntent: input.explicitWorkflowIntent,
    attachments: input.attachments,
    commitRequested: input.commitRequested,
    confirmCommit: input.confirmCommit
  });
  const intentFamily = resolveIntentFamily(input.question, lane);
  const collectivePrompt = lane === 'room' && (
    PRESENCE_RX.test(input.question)
    || CHECKIN_RX.test(input.question)
    || /\b(team|everyone|everybody|you all|all of you)\b/i.test(String(input.question || ''))
  );
  const allowSupportSpeaker = lane === 'room' && collectivePrompt && ['greeting', 'presence-check', 'social-checkin'].includes(intentFamily);
  return {
    lane,
    intentFamily,
    targetSpeakerId: targetSpeakerId || null,
    activeSpeakers: targetSpeakerId ? [targetSpeakerId] : ACTIVE_CHARACTER_IDS.slice(),
    memoryAnchors: [],
    workflowContext: workflow.allowed ? workflow : null,
    replyPolicy: {
      maxVisibleEvents: allowSupportSpeaker ? 2 : 1,
      allowSupportSpeaker
    },
    collectivePrompt,
    requestedPresence: PRESENCE_RX.test(input.question),
    debugReason: `${lane}:${intentFamily}`
  };
}

module.exports = {
  detectDirectTarget,
  resolveIntentFamily,
  resolveTurnLane,
  resolveTurnPlan
};
