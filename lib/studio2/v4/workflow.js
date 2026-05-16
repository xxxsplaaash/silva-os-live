const STUDIO2_V4_WORKFLOW_ENABLED = process.env.STUDIO2_V4_WORKFLOW_ENABLED === '1';

function resolveWorkflowContext({
  question = '',
  explicitIntent = '',
  attachments = [],
  commitRequested = false,
  confirmCommit = false
} = {}) {
  if (!STUDIO2_V4_WORKFLOW_ENABLED) {
    return { enabled: false, allowed: false, lane: null, intent: null };
  }
  const q = String(question || '').trim().toLowerCase();
  const intent = String(explicitIntent || '').trim().toLowerCase();
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (confirmCommit || commitRequested || intent === 'commit') {
    return { enabled: true, allowed: true, lane: 'commit', intent: 'commit' };
  }
  if (intent) return { enabled: true, allowed: true, lane: 'workflow', intent };
  if (hasAttachments && /\b(analy[sz]e|review|describe|extract|read)\b/.test(q)) {
    return { enabled: true, allowed: true, lane: 'workflow', intent: 'analyze-media' };
  }
  if (/\b(make a plan|stage this|commit this|implement this|turn this into)\b/.test(q)) {
    return { enabled: true, allowed: true, lane: 'workflow', intent: 'explicit-workflow' };
  }
  return { enabled: true, allowed: false, lane: null, intent: null };
}

module.exports = {
  STUDIO2_V4_WORKFLOW_ENABLED,
  resolveWorkflowContext
};
