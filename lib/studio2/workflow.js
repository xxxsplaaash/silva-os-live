const STUDIO2_WORKFLOW_ENABLED = process.env.STUDIO2_WORKFLOW_ENABLED === '1';

function resolveExplicitWorkflowContext({
  question = '',
  explicitIntent = '',
  attachments = [],
  commitRequested = false,
  confirmCommit = false
} = {}) {
  if (!STUDIO2_WORKFLOW_ENABLED) {
    return { allowed: false, lane: null, intent: '' };
  }
  const intent = String(explicitIntent || '').trim().toLowerCase();
  const q = String(question || '').trim().toLowerCase();
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (confirmCommit || commitRequested || intent === 'commit-plan') {
    return { allowed: true, lane: 'commit', intent: 'commit-plan' };
  }
  if (intent) {
    return { allowed: true, lane: 'workflow', intent };
  }
  if (hasAttachments && /\b(analy[sz]e|describe|extract|read|review)\b/.test(q)) {
    return { allowed: true, lane: 'workflow', intent: 'analyze-media' };
  }
  if (/\b(make a plan|plan this|stage this|turn this into|build a brief|draft a caption|write a caption|make an image|generate an image)\b/.test(q)) {
    return { allowed: true, lane: 'workflow', intent: 'explicit-workflow' };
  }
  return { allowed: false, lane: null, intent: '' };
}

module.exports = {
  resolveExplicitWorkflowContext
};
