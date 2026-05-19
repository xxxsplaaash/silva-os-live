const express = require('express');
const router = express.Router();
const { outageResponse, clarificationResponse, quietRoomResult } = require('../lib/studio/fallback');
const { parseGeminiText, parseStudioJson, wrapPlainTextAsStudioResponse, normalizeCouncilResponse } = require('../lib/studio/parse');
const { getStudioSystemContext } = require('../lib/studio/systemContext');
const { buildStudioPrompt, buildConsciousCharacterPrompt } = require('../lib/studio/prompt');
const {
  statements,
  normalizeGallery,
  normalizePlanner,
  normalizePrompt,
  normalizeStudioPulseAsset,
  normalizeStudioPulseWorkflow,
  getStudioPulseAssets,
  getStudioPulseAssetById,
  getStudioPulseWorkflows,
  getStudioPulseWorkflowById,
  getStudio2ThreadState,
  getStudio2CharacterStates,
  getStudio2RelationshipStates,
  upsertStudio2ThreadState,
  replaceStudio2CharacterStates,
  replaceStudio2RelationshipStates,
  insertStudio2ReflectionPatch
} = require('../db/sqlite');
const {
  getStudioTurnHistory,
  logStudioTurn,
  applyRelationshipDeltas,
  upsertStudioThread,
  storeStudioThreadConversation,
  patchStudioThread,
  removeStudioThread,
  getStudioArchive,
  getStudioPulseThreadById,
  getStudioPulseMessages
} = require('../lib/studio/history');
const {
  hydrateConsciousRoomSystem,
  captureRoomRuntimeTurn,
  clientRoomRuntimePayload,
  planConsciousTurn,
  planConsciousSpark,
  detectCharacterToCharacterAddress,
  resolveDirectAddress
} = require('../lib/studio/roomRuntime');
const {
  createRoomIntelligenceContext,
  perceiveRoomMessage,
  planRoomTurn,
  calculateSocialImpulses,
  continuityPayloadForAisha,
  expressiveHabitatContextForAisha,
  reduceRoomState,
  buildRoomCharacterPrompt,
  parseRoomCharacterOutput,
  validateRoomCharacterTurn,
  fallbackTurnFromStep,
  buildRoomStudioResponse,
  dialogueQualityPayloadFor,
  assistantFillerReason
} = require('../lib/studio/roomIntelligence');
const {
  callAishaEngine,
  getAishaResponseUsability
} = require('../lib/aisha/aishaAdapter');
const { createAishaStudioPulseRequest } = require('../lib/aisha/aishaTypes');
const {
  inferWorkflowIntent,
  workflowClassForIntent,
  isCommittableWorkflowIntent,
  upsertAttachmentDrafts,
  stageWorkflowDraft,
  buildCommitCard,
  commitWorkflowDraft,
  removeAttachmentDraft,
  listThreadAttachments,
  listThreadWorkflows,
  getWorkflowById
} = require('../lib/studio/pulseWorkflow');
const {
  USE_STUDIO2,
  USE_STUDIO2_V4,
  runStudio2Turn,
  runStudio2TurnV4,
  seedStudio2StateFromLegacy
} = require('../lib/studio2');
const { geminiVaultKeyEntries, resolveImageProviderEnv } = require('../lib/imageGeneration/providerVault');
const {
  createGenAIClient,
  DEFAULT_VERTEX_GEMINI_FAST_MODEL,
  DEFAULT_VERTEX_GEMINI_PRO_MODEL,
  resolveVertexConfig,
  vertexLocationConfigs
} = require('../lib/imageGeneration/providers/google');
const HARD_CUT_REBUILD = process.env.STUDIO_PULSE_HARD_CUT !== '0';
const AISHA_PRODUCTION_GEMINI_TIMEOUT_MS = 15000;
let lastAishaRuntimeStatus = {
  aishaAttempted: false,
  aishaEngineConnected: false,
  aishaEngineMode: 'mock',
  activeEngine: 'local-room-intelligence',
  fallbackReason: '',
  aishaTraceStatus: '',
  aishaTraceFailureReason: '',
  runtimeCredentialProvided: false,
  runtimeCredentialLength: 0,
  runtimeCredentialSource: '',
  updatedAt: ''
};
let legacyStudioFallback = null;

function getLegacyStudioFallback() {
  if (HARD_CUT_REBUILD) {
    throw new Error('legacy-studio-fallback-disabled');
  }
  if (!legacyStudioFallback) {
    legacyStudioFallback = require('../lib/studio/fallback.LEGACY');
  }
  return legacyStudioFallback;
}

function legacyDeterministicStudioResponse(...args) {
  return getLegacyStudioFallback().getDeterministicStudioResponse(...args);
}

function legacyRoomFallbackResponse(...args) {
  return getLegacyStudioFallback().fallbackStudioResponse(...args);
}

function legacySparkRoomResponse(...args) {
  return getLegacyStudioFallback().generateSparkResponse(...args);
}

const DIAGNOSTIC_PROMPT_RX = /\b(bug|bugs|broken|failing|failure|failures|not working|system not functioning|system is not functioning|stale|weird behavior|glitch|glitches|fault|faults|issue|issues|problem|problems)\b|\bchat\b.*\b(bug|bugs|broken|failing|failure|stale|wrong|issue|issues|problem|problems)\b|\b(bug|bugs|broken|failing|failure|stale|wrong|issue|issues|problem|problems)\b.*\bchat\b/i;
const DIAGNOSTIC_TECH_RX = /\b(api|route|runtime|system|backend|frontend|code|logic|bug|glitch|sqlite|server|model|provider|prompt generation|image generation)\b/i;
const IMAGE_IDENTITY_RX = /\b(who(?:'s| is)\s+(?:this|that|the person|the woman|the man|the girl|the guy|in the image)|identify\b.*\b(person|woman|man|girl|guy|celebrity)|who is this in the image|who is the person in the image)\b/i;
const BARE_THOUGHT_RX = /^(so\s+)?(any\s+)?(thoughts|ideas)\??$/i;
const COLLECTIVE_ROOM_RX = /\b(team|everyone|everybody|you all|all of you|each other)\b|\b(real check-?in|check in|be honest|room right now|what(?:'s| is) broken here|wrong with this chat)\b/i;
const SOCIAL_COLLECTIVE_RX = /\b(hi team|hello team|hey team|how('?s| is)\s+everyone feeling|everyone('?s|s)? mood|who('?s| is)\s+(online|here)|reading the room|can you all share|all share)\b/i;
const CASUAL_BANTER_RX = /\b(lol|haha|lmao|funniest|smartest|coolest|slowest|joke|funny|laugh|hungry|crush)\b/i;
const GENERIC_HOST_RX = /\b(let'?s dive in|make some magic happen|let'?s make some magic|let'?s get into it|let'?s unpack|let'?s explore|start wherever you want and i('| a)ll meet you properly|what magic we('| a)ll create together)\b/i;
const LIGHT_STRATEGY_DRIFT_RX = /\b(demographic|resonance|interpretation|stakeholder|positioning|consumer|market fit|funnel|broader emotional|co-creation|narrative|user role|users?)\b/i;
const PRESENCE_FILLER_RX = /\b(i('| a)m (here|with you|listening|around|present|online)\b|keep going\b|i can work with that\b|paying attention\b)\b/i;
const PROCESS_DIAG_RX = /\b(open threads|clear resolution|next steps|common ground|diffusion of focus|progressing clearly|unresolved state|missing input|forward movement|operating without a clearly defined scope|system-level gaps|symptoms instead of diagnosing|what specifically is|telemetry shows baseline|perceived output|too broad for a diagnostic|need to define the exact system state)\b/i;
const PULSE_FACILITATOR_RX = /\b(worthy of (?:its|the) ambition|let'?s hold it to that|let'?s hear it|vibrant playground|seen and heard|curious about what(?:'s| is) really going on)\b/i;
const THOUGHT_PROMPT_FLUFF_RX = /\b(what are your thoughts|insights we can uncover|i('| a)m wondering what|curious what|let'?s explore what)\b/i;
const GENERIC_SOCIAL_FLUFF_RX = /\b(good to have everyone in one space|good to see you in the mix|hope your morning has been productive|what('?s| is) on your mind today|glad to be here|this space feels intriguing)\b/i;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); }
}

function textValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    for (const key of ['text', 'summary', 'message', 'note', 'content', 'title']) {
      const found = textValue(value[key]);
      if (found) return found;
    }
  }
  return String(value).trim();
}

function buildStudio2V4CharacterMeta(system = {}) {
  return Object.fromEntries(
    Object.entries(system.characters || {}).map(([id, character]) => [id, {
      color: String(character?.color || ''),
      name: String(character?.name || ''),
      role: String(character?.role || '')
    }])
  );
}

function loadStudio2V4ThreadState({ threadId = '', system = {} } = {}) {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId) return null;
  const threadState = getStudio2ThreadState(safeThreadId);
  if (threadState) {
    return {
      runtime: threadState.runtime || {},
      characters: getStudio2CharacterStates(safeThreadId),
      relationships: getStudio2RelationshipStates(safeThreadId)
    };
  }
  return null;
}

function seedStudio2V4ThreadState({ threadId = '', system = {} } = {}) {
  const roomRuntimeState = system.currentThread?.meta?.roomRuntimeState && typeof system.currentThread.meta.roomRuntimeState === 'object'
    ? system.currentThread.meta.roomRuntimeState
    : {};
  return seedStudio2StateFromLegacy({
    threadId,
    threadMeta: system.currentThread?.meta || {},
    runtimeOverlay: {
      personhood: roomRuntimeState.personhood && typeof roomRuntimeState.personhood === 'object' ? roomRuntimeState.personhood : {},
      conversationContract: roomRuntimeState.conversationContract && typeof roomRuntimeState.conversationContract === 'object' ? roomRuntimeState.conversationContract : {},
      aiCommsCenter: {
        roomTone: Array.isArray(system.aiCommsCenter?.roomTone) ? system.aiCommsCenter.roomTone : []
      }
    }
  });
}

function persistStudio2V4ThreadState({ threadId = '', result = null } = {}) {
  const safeThreadId = String(threadId || '').trim();
  if (!safeThreadId || !result?.threadState) return null;
  upsertStudio2ThreadState(safeThreadId, {
    threadId: safeThreadId,
    schemaVersion: 'studio2.v4',
    runtime: result.threadState.runtime || {}
  });
  replaceStudio2CharacterStates(safeThreadId, result.threadState.characters || {});
  replaceStudio2RelationshipStates(safeThreadId, result.threadState.relationships || {});
  if (result.reflectionPatch) {
    insertStudio2ReflectionPatch(safeThreadId, {
      ...result.reflectionPatch,
      threadId: safeThreadId,
      schemaVersion: 'studio2.v4'
    });
  }
  return getStudio2ThreadState(safeThreadId);
}

function compact(value = '', max = 180) {
  const text = textValue(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function localBaseUrl(req = {}) {
  const host = String(req.get?.('host') || `127.0.0.1:${process.env.PORT || 3000}`).trim();
  const protocol = /localhost|127\.0\.0\.1|:\d+$/.test(host) ? 'http' : (String(req.protocol || 'http') || 'http');
  return `${protocol}://${host}`;
}

function payloadRow(row = {}) {
  if (!row || typeof row !== 'object') return {};
  const payload = row.payload_json ? (() => {
    try {
      return JSON.parse(row.payload_json || '{}');
    } catch (err) {
      return {};
    }
  })() : {};
  return {
    ...row,
    ...(payload && typeof payload === 'object' ? payload : {})
  };
}

function recentPayloadRows(rows = [], limit = 12) {
  return (Array.isArray(rows) ? rows : []).map(payloadRow).slice(-Math.max(1, limit));
}

function artifactContextSlices() {
  return {
    promptItems: recentPayloadRows(statements.getPrompts.all(), 12),
    galleryItems: recentPayloadRows(statements.getGallery.all(), 12),
    plannerPosts: recentPayloadRows(statements.getPlanner.all(), 12),
    reviewItems: recentPayloadRows(statements.getReviewEvents.all(), 16)
  };
}

function ensurePulseThread({ threadId = '', title = '', mode = 'direction', includeInContext = true } = {}) {
  const safeId = String(threadId || '').trim();
  if (safeId) {
    return payloadRow(getStudioPulseThreadById(safeId) || upsertStudioThread({
      id: safeId,
      title: title || 'Open room',
      status: 'active',
      includeInContext,
      meta: {
        mode,
        participants: [],
        summary: ''
      }
    }));
  }
  return payloadRow(upsertStudioThread({
    title: title || 'Open room',
    status: 'active',
    includeInContext,
    meta: {
      mode,
      participants: [],
      summary: ''
    }
  }));
}

function mergeById(items = []) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(items) ? items : []) {
    const id = String(item?.id || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function workflowIntentToRoomFamily(intent = '') {
  switch (String(intent || '').trim().toLowerCase()) {
    case 'analyze-media': return 'direct-answer';
    case 'plan-post': return 'creative-room';
    case 'make-image': return 'creative-room';
    case 'plan-calendar': return 'governance';
    case 'plan-event': return 'supporting-back-and-forth';
    case 'commit-plan': return 'governance';
    default: return 'casual-room';
  }
}

function isDiagnosticPrompt(question = '') {
  return DIAGNOSTIC_PROMPT_RX.test(String(question || ''));
}

function diagnosticLeadSpeakerId(question = '') {
  return DIAGNOSTIC_TECH_RX.test(String(question || '')) ? 'grok' : 'claudia';
}

function diagnosticPeerSpeakerId(question = '', leadSpeakerId = '') {
  const lead = String(leadSpeakerId || '').trim().toLowerCase();
  if (!COLLECTIVE_ROOM_RX.test(String(question || ''))) return '';
  if (lead === 'grok') return 'claudia';
  if (lead === 'claudia') return 'grok';
  return 'aisha';
}

function hasImageAttachment(attachments = []) {
  return (Array.isArray(attachments) ? attachments : []).some(item => String(item?.kind || '').trim().toLowerCase() === 'image');
}

function isImageIdentityQuestion(question = '') {
  return IMAGE_IDENTITY_RX.test(String(question || ''));
}

function workflowTurnMatchesMissingFields(question = '', missingFields = []) {
  const q = String(question || '').trim().toLowerCase();
  const missing = Array.isArray(missingFields) ? missingFields.map(item => String(item || '').trim().toLowerCase()) : [];
  if (!q || !missing.length) return false;
  if (missing.includes('channel') && /\b(instagram|ig|tiktok|linkedin|email|newsletter|website|site|facebook|twitter|x)\b/.test(q)) return true;
  if (missing.includes('audience') && /\b(audience|creatives?|founders?|students?|clients?|community|team|leadership|joburg|johannesburg|young)\b/.test(q)) return true;
  if ((missing.includes('timing') || missing.includes('date or slot')) && /\b(today|tomorrow|tonight|this week|next week|this month|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/.test(q)) return true;
  if (missing.includes('content type') && /\b(post|carousel|caption|thread|video|reel|story|email)\b/.test(q)) return true;
  if (missing.includes('visual direction') && q.split(/\s+/).filter(Boolean).length >= 3) return true;
  if (missing.includes('subject') && q.split(/\s+/).filter(Boolean).length >= 2) return true;
  if ((missing.includes('objective') || missing.includes('deliverable') || missing.includes('angle')) && q.split(/\s+/).filter(Boolean).length >= 4) return true;
  return false;
}

function shouldUseWorkflowForTurn({
  question = '',
  inferredWorkflowIntent = '',
  requestedWorkflowDraftId = '',
  commitRequested = false,
  workflowDraft = null,
  commitCard = null
} = {}) {
  if (commitRequested) return true;
  if (String(requestedWorkflowDraftId || '').trim()) return true;
  if (String(inferredWorkflowIntent || '').trim().toLowerCase() !== 'room-chat') return true;
  if (!workflowDraft || typeof workflowDraft !== 'object') return false;

  const q = String(question || '').trim().toLowerCase();
  if (!q) return false;
  if (isDiagnosticPrompt(q) || SOCIAL_COLLECTIVE_RX.test(q) || CASUAL_BANTER_RX.test(q) || /^(hi|hey|hello|yo|sup|hiya)\b/.test(q)) return false;

  const missingFields = Array.isArray(commitCard?.missingFields) ? commitCard.missingFields.filter(Boolean) : [];
  if (workflowTurnMatchesMissingFields(q, missingFields)) return true;
  if (/^(yes|yeah|yep|no|nope|sure|okay|ok|cool|fine|go ahead|do it|lock it|stage it|commit it)\b/.test(q)) return true;

  const intent = String(workflowDraft.intent || '').trim().toLowerCase();
  if (intent === 'analyze-media') {
    return /\b(analy[sz]e|describe|read|review|inspect|extract|look|visible|text|image|photo|frame|composition|styling|upload|attachment|file|person)\b/.test(q);
  }
  if (intent === 'make-image') {
    return /\b(image|visual|poster|cover|palette|style|refs?|reference|direction|subject|render|generate|make)\b/.test(q);
  }
  if (intent === 'plan-post') {
    return /\b(post|caption|channel|audience|timing|angle|launch|calendar|schedule|instagram|ig|tiktok|linkedin|email|website|facebook|twitter|x|today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)\b/.test(q);
  }
  if (intent === 'plan-calendar') {
    return /\b(calendar|schedule|slot|date|timing|owner|today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)\b/.test(q);
  }
  if (intent === 'plan-event') {
    return /\b(event|activation|shoot|booking|objective|deliverable|owner|timing|launch)\b/.test(q);
  }
  return false;
}

function pickThreadWorkflowForTurn({
  question = '',
  workflows = [],
  requestedWorkflowDraftId = '',
  commitRequested = false,
  confirmCommit = false
} = {}) {
  const requestedId = String(requestedWorkflowDraftId || '').trim();
  if (requestedId) return getWorkflowById(requestedId) || null;
  const active = Array.isArray(workflows)
    ? workflows.filter(item => !['committed', 'commit_failed'].includes(String(item?.status || '').trim().toLowerCase()))
    : [];
  if (!active.length) return null;
  if (commitRequested || confirmCommit) return active[0] || null;
  if (active.length !== 1) return null;
  const candidate = active[0];
  const q = String(question || '').trim();
  if (!q) return null;
  if (/\b(continue|resume|workflow|that plan|this plan|that brief|this brief|stage it|stage this|commit it|commit this|confirm it|confirm this|lock it|lock this|ship it)\b/i.test(q)) {
    return candidate;
  }
  const commitCard = buildCommitCard(candidate);
  return shouldUseWorkflowForTurn({
    question: q,
    inferredWorkflowIntent: 'room-chat',
    requestedWorkflowDraftId: '',
    commitRequested: false,
    workflowDraft: candidate,
    commitCard
  }) ? candidate : null;
}

function fallbackIntentForSelection(intentFamily = '') {
  const intent = String(intentFamily || '').trim().toLowerCase();
  if (!intent) return '';
  if (intent === 'pulse-critique') return 'pulse-room';
  return intent;
}

function workflowStatusMessage(workflowDraft = null, commitCard = null, options = {}) {
  const workflow = workflowDraft && typeof workflowDraft === 'object' ? workflowDraft : null;
  const commit = commitCard && typeof commitCard === 'object' ? commitCard : null;
  const brief = workflow?.derivedBrief && typeof workflow.derivedBrief === 'object' ? workflow.derivedBrief : {};
  const label = String(brief.title || workflow?.title || workflow?.intent || 'this plan').trim();
  const workflowClass = String(workflow?.workflowClass || workflowClassForIntent(workflow?.intent || '')).trim().toLowerCase();
  const lastCommitError = compact(workflow?.lastCommitError || options.commitError || '', 180);
  if (String(workflow?.status || '').trim().toLowerCase() === 'commit_failed' && lastCommitError) {
    return `I tried to commit ${label}, but the real system blocked it: ${lastCommitError}`;
  }
  if (workflowClass === 'analysis') {
    return `The upload is in the room. Keep this analysis-only and tell me whether you want a visual description, visible text, or a composition read.`;
  }
  if (options.confirmedCommit) {
    return `Clean. ${label} is committed and moving through the real system now.`;
  }
  if (!workflow) {
    return `I can stage the workflow once the room has a real plan to lock.`;
  }
  if (commit?.ready) {
    return `The plan is coherent enough to commit. If you want me to lock ${label}, confirm it and I'll push it through cleanly.`;
  }
  const missing = Array.isArray(commit?.missingFields) ? commit.missingFields.filter(Boolean) : [];
  if (missing.length) {
    return `This is close, but I still need ${missing.join(', ')} before I can commit ${label} without faking certainty.`;
  }
  return `The workflow is staged. I can keep shaping ${label} before we commit it.`;
}

function workflowOwnerSupportLine(workflowDraft = null, options = {}) {
  const workflow = workflowDraft && typeof workflowDraft === 'object' ? workflowDraft : null;
  if (!workflow) return '';
  if (!isCommittableWorkflowIntent(workflow.intent)) return '';
  const brief = workflow.derivedBrief && typeof workflow.derivedBrief === 'object' ? workflow.derivedBrief : {};
  const owner = String(brief.owner || '').trim().toLowerCase();
  const label = String(brief.title || workflow.title || workflow.intent || 'this').trim();
  if (!owner || owner === 'aisha') return '';
  if (options.confirmedCommit) {
    if (owner === 'leah') return `Good. ${label} has enough shape now for me to turn it into something visual instead of generic.`;
    if (owner === 'claudia') return `Good. It has an owner, a shape, and somewhere concrete to land.`;
    if (owner === 'grok') return `That works. The handoff is explicit, so the workflow is actually usable now.`;
    if (owner === 'vanya') return `Good. It feels like a real move now, not just a mood board in sentence form.`;
  }
  if (owner === 'leah') return `The visual direction is almost there. I just don't want us pretending the missing edge is already solved.`;
  if (owner === 'claudia') return `I can work with this once the missing field stops floating loose.`;
  if (owner === 'grok') return `The structure is fine. I just want the unresolved piece named cleanly before we lock it.`;
  if (owner === 'vanya') return `The room knows what this wants to be. It just needs the last piece said out loud.`;
  return '';
}

function buildImageIdentitySafetyResponse({ question = '', system = {} } = {}) {
  return buildConsciousResponse({
    question,
    system,
    plan: {
      leadSpeakerId: 'aisha',
      peerSpeakerId: 'leah',
      sparkSpeakerId: '',
      directResolution: resolveDirectAddress(question, system),
      activeTopicTags: ['image-analysis'],
      roomEnergy: 'focused',
      contract: system.conversationContract || null,
      intentFamily: 'direct-answer',
      selectionReason: 'image-safety'
    },
    mainText: `I can't identify a real person from an image. I can describe their appearance, styling, visible text, setting, or what the image is doing instead.`,
    peerText: `If you want, I can read the styling and visual signal without pretending I know who they are.`,
    sparkText: ''
  });
}

function buildWorkflowResponse({
  question = '',
  system = {},
  workflowDraft = null,
  commitCard = null,
  confirmedCommit = false,
  commitError = ''
} = {}) {
  const workflow = workflowDraft && typeof workflowDraft === 'object' ? workflowDraft : null;
  const family = workflowIntentToRoomFamily(workflow?.intent || 'commit-plan');
  const owner = String(workflow?.derivedBrief?.owner || '').trim().toLowerCase();
  const mainText = workflowStatusMessage(workflow, commitCard, { confirmedCommit, commitError });
  const peerText = workflowOwnerSupportLine(workflow, { confirmedCommit });
  const plan = {
    leadSpeakerId: 'aisha',
    peerSpeakerId: peerText && owner && owner !== 'aisha' ? owner : '',
    sparkSpeakerId: '',
    directResolution: resolveDirectAddress(question, system),
    activeTopicTags: mergeById([...(workflow?.derivedBrief?.refs || [])]).length
      ? ['workflow', String(workflow?.intent || 'workflow')]
      : [String(workflow?.intent || 'workflow')],
    roomEnergy: 'focused',
    contract: system.conversationContract || null,
    intentFamily: family,
    selectionReason: confirmedCommit ? 'direct-answer' : 'autonomous-impulse',
    details: {}
  };
  const response = buildConsciousResponse({
    question,
    system,
    plan,
    mainText,
    peerText,
    sparkText: ''
  });
  response.actions = Array.isArray(commitCard?.actions) ? commitCard.actions.slice(0, 6) : [];
  response.consistencyChecks = Array.isArray(commitCard?.missingFields) && commitCard.missingFields.length
    ? commitCard.missingFields.map(item => `Still missing: ${item}`)
    : [];
  response.promptIdeas = workflow?.derivedBrief?.promptText ? [workflow.derivedBrief.promptText] : [];
  response.threadMeta = {
    ...(response.threadMeta || {}),
    workflowIntent: String(workflow?.intent || ''),
    workflowDraftId: String(workflow?.id || ''),
    workflowStatus: String(workflow?.status || ''),
    commitReady: Boolean(commitCard?.ready)
  };
  return response;
}

function workflowLeadSpeakerId(workflowDraft = null) {
  const owner = String(workflowDraft?.derivedBrief?.owner || workflowDraft?.createdBy || '').trim().toLowerCase();
  if (['aisha', 'leah', 'claudia', 'grok', 'vanya'].includes(owner)) return owner;
  return 'aisha';
}

function workflowPeerSpeakerId(workflowDraft = null, leadSpeakerId = '') {
  const lead = String(leadSpeakerId || '').trim().toLowerCase();
  if (!lead) return '';
  if (lead !== 'aisha') return 'aisha';
  const owner = String(workflowDraft?.derivedBrief?.owner || workflowDraft?.createdBy || '').trim().toLowerCase();
  return owner && owner !== lead ? owner : '';
}

function workflowTurnNeedsRescue(text = '', workflowDraft = null, commitCard = null) {
  if (!workflowDraft || typeof workflowDraft !== 'object') return false;
  const out = String(text || '').trim().toLowerCase();
  if (!out) return true;
  if (/^(i('?m| am) (here|around|good|fine)|alright\.? i('?m| am) listening|i('?m| am) listening|i('?m| am) with you|clear-headed and paying attention)\b/.test(out)) {
    return true;
  }
  const missing = Array.isArray(commitCard?.missingFields) ? commitCard.missingFields.map(item => String(item || '').toLowerCase()) : [];
  const intent = String(workflowDraft.intent || '').trim().toLowerCase();
  if (missing.length && !/\b(need|missing|before|channel|audience|timing|subject|visual|objective|deliverable|brief|plan|commit)\b/.test(out)) {
    return true;
  }
  if (intent === 'plan-post' && !/\b(post|channel|audience|angle|carousel|caption|schedule|brief|launch|thursday)\b/.test(out)) return true;
  if (intent === 'make-image' && !/\b(image|visual|reference|brief|direction|subject|palette|poster|cover|render)\b/.test(out)) return true;
  if (intent === 'plan-calendar' && !/\b(schedule|calendar|slot|date|timing|owner|thursday|monday|tuesday|wednesday|friday)\b/.test(out)) return true;
  if (intent === 'plan-event' && !/\b(event|launch|shoot|activation|objective|deliverable|timing|owner)\b/.test(out)) return true;
  if (intent === 'analyze-media' && !/\b(upload|image|file|caption|pdf|reference|attachment|read|look|seeing|analysis)\b/.test(out)) return true;
  return false;
}

function repairWorkflowGeneratedTurn({ question = '', speakerId = '', workflowDraft = null, commitCard = null } = {}) {
  const workflow = workflowDraft && typeof workflowDraft === 'object' ? workflowDraft : null;
  if (!workflow) return '';
  const speaker = String(speakerId || '').trim().toLowerCase();
  const intent = String(workflow.intent || '').trim().toLowerCase();
  const q = String(question || '').trim().toLowerCase();
  const brief = workflow.derivedBrief && typeof workflow.derivedBrief === 'object' ? workflow.derivedBrief : {};
  const missing = Array.isArray(commitCard?.missingFields) ? commitCard.missingFields.filter(Boolean) : [];
  const label = String(brief.title || workflow.title || workflow.intent || 'this plan').trim();
  const channel = String(brief.channel || '').trim();
  const audience = String(brief.audience || '').trim();
  const timing = String(brief.timingHint || '').trim();

  if (intent === 'plan-post') {
    if (missing.includes('channel') && missing.includes('audience')) {
      if (speaker === 'claudia') return `Before I lock ${label}, I need the channel and the audience. Where is this landing, and who is it actually for?`;
      if (speaker === 'aisha') return `This is not commit-clean yet. Name the channel and the audience, then I can lock ${label} without bluffing the missing shape.`;
      if (speaker === 'leah') return `I can sharpen the angle, but I still need the channel and the actual audience so I don't dress ${label} for the wrong room.`;
      if (speaker === 'grok') return `The draft is missing two hard fields: channel and audience. Everything else is cosmetic until those exist.`;
      if (speaker === 'vanya') return `The post has energy. It still needs a real audience and a clear channel before it becomes an actual move.`;
    }
    if (missing.includes('channel')) {
      if (speaker === 'claudia') return `The audience is starting to resolve. I still need the channel before I lock ${label} like it belongs somewhere real.`;
      if (speaker === 'aisha') return `We're closer, but not commit-clean. Give me the channel and I can stop holding this in draft form.`;
      if (speaker === 'leah') return `I can feel the audience now. I still need the channel so I pitch ${label} in the right register.`;
      if (speaker === 'grok') return `Audience is readable. Channel is still undefined, which means the plan is still missing a routing decision.`;
      if (speaker === 'vanya') return `The post knows who it's for more than where it lives. Give me the channel and it stops floating.`;
    }
    if (missing.includes('audience')) {
      if (speaker === 'claudia') return `Good. ${channel || 'The channel'} is locked. Now tell me exactly who this post is for so I can stage it properly.`;
      if (speaker === 'aisha') return `We're almost there. The room still owes me one clean thing: who this post is actually speaking to.`;
      if (speaker === 'leah') return `Instagram is fine. I still need the audience so the tone doesn't flatten into generic launch language.`;
      if (speaker === 'grok') return `Channel is set. Audience is still undefined, which means the plan is not.`;
      if (speaker === 'vanya') return `We know where it's going. I still want to know who we're trying to reach so it doesn't turn into content for nobody.`;
    }
    if (!missing.length) {
      const line = `${channel ? `${channel[0].toUpperCase()}${channel.slice(1)}` : 'The channel'} for ${audience || 'the audience'}${timing ? ` ${timing}` : ''}`;
      if (speaker === 'claudia') return `Good. ${line} is specific enough to commit. I can stage the planner move cleanly now.`;
      if (speaker === 'aisha') return `Now we're talking. ${line} gives this post enough shape for me to commit it without inventing the rest.`;
      if (speaker === 'leah') return `Good. ${line} gives me enough texture to make the post feel authored instead of mass-produced.`;
      if (speaker === 'grok') return `That clears the missing fields. The post brief is stable enough to commit now.`;
      if (speaker === 'vanya') return `Good. It finally sounds like a post for real people in a real place, not a placeholder campaign sentence.`;
    }
  }

  if (intent === 'make-image') {
    const subject = String(brief.subject || 'the image').trim();
    if (missing.length) {
      if (speaker === 'leah') return `I can build the image plan, but I still need ${missing.join(' and ')} so it doesn't come out as polished nothing.`;
      if (speaker === 'aisha') return `The image brief is close, not finished. I still need ${missing.join(' and ')} before I commit generation.`;
      return `The image workflow still needs ${missing.join(' and ')} before it becomes a clean generation brief.`;
    }
    if (speaker === 'leah') return `Good. ${subject} has enough direction now for me to stage a real image brief instead of mood-board filler.`;
    if (speaker === 'aisha') return `The image brief is clean enough to commit. If you want it made, I can push it through the real generator next.`;
    return `The image brief is ready to commit and generate through the real system.`;
  }

  if (intent === 'plan-calendar') {
    if (missing.length) return `I can stage the calendar move, but I still need ${missing.join(' and ')} before I lock it.`;
    return `The calendar move is specific enough now. I can commit the slot cleanly.`;
  }

  if (intent === 'plan-event') {
    if (missing.length) return `The event plan still needs ${missing.join(' and ')} before I commit it like it means something.`;
    return `The event brief is coherent enough to commit.`;
  }

  if (intent === 'analyze-media') {
    const attachmentName = String((workflow.inputs?.attachmentNames || [])[0] || 'the upload').trim();
    if (isImageIdentityQuestion(q)) {
      if (speaker === 'aisha') return `I can't identify a real person from an image. I can describe their appearance, styling, visible text, or what the frame is doing if that's what you need.`;
      if (speaker === 'leah') return `I won't guess who they are, but I can read the styling, pose, and visual signal cleanly.`;
      return `I can't identify the person, but I can describe what is visible, extract text, and read the image itself properly.`;
    }
    if (/\b(text|extract|read)\b/.test(q)) {
      if (speaker === 'grok') return `I have ${attachmentName}. I'll pull the visible text and tell you exactly what is there.`;
      return `The upload is in. I can extract the visible text cleanly now.`;
    }
    if (/\b(describe|look|image|photo|person|style|composition|visual)\b/.test(q)) {
      if (speaker === 'leah') return `Good. I can read the styling, pose, and composition from ${attachmentName} without pretending I know more than the frame shows.`;
      if (speaker === 'grok') return `I have the image. I can describe what is visible, what is in the frame, and what signal it carries.`;
      return `The image is live. I can describe what is visible and what matters in the frame.`;
    }
    if (speaker === 'grok') return `I have ${attachmentName}. Tell me whether you want a visual read, visible text, or a composition check and I'll keep it clean.`;
    return `The upload is in the room. Choose the read you want: visual description, visible text, or composition.`;
  }

  return '';
}

function looksIncompleteQuestion(q = '') {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return true;
  if (/^(what|why|how|who)\??$/.test(s)) return true;
  if (/^(and|but|so|also|wait|okay|ok|right|then)\b/.test(s) && s.split(/\s+/).length <= 6) return true;
  if (/^(hi|hey|hello|yo)\b|hi team|hello team|hey team|lol\b|haha\b|lmao\b/.test(s)) return false;
  if (/\b(who('?s| is)\s+(online|here|around)|how('?s| is)\s+everyone feeling|how is everyone feeling|how are you all|everyone('?s|s)? mood)\b/.test(s)) return false;
  if (/\b(aisha|leah|claudia|grok|gerhard|vanya)\b/.test(s)) return false;
  if (/(hungry|food|lunch|dinner|coffee|tea|snack)/.test(s)) return false;
  if (s.length < 8) return true;
  return /^(who|what|which|how|why|where|when)\s+is\s+the$/.test(s)
    || /\b(the|a|an|most|best|coolest|smartest|funniest|strongest|trendiest)\s*$/.test(s)
    || (/\?$/.test(s) === false && /^(who|what|which|how|why|where|when)\b/.test(s) && s.split(/\s+/).length < 4);
}

function resolveQuestion(question, recent = []) {
  const q = String(question || '').trim();
  if (!looksIncompleteQuestion(q)) return { effectiveQuestion: q, clarificationNeeded: false, resolvedFromHistory: false };
  const previous = recent.find(item => item?.q && String(item.q).trim().toLowerCase() !== q.toLowerCase());
  if (!previous) return { effectiveQuestion: q, clarificationNeeded: true, resolvedFromHistory: false };
  const previousAnchor = String(previous?.effectiveQuestion || previous?.q || '').trim() || String(previous.q || '').trim();
  return {
    effectiveQuestion: `${previousAnchor} ${q}`.replace(/\s+/g, ' ').trim(),
    clarificationNeeded: false,
    resolvedFromHistory: true,
    previousQuestion: previousAnchor || previous.q
  };
}

function resolveStudioKeyChain(providerConfig) {
  const chain = [];
  const seen = new Set();
  const add = (item, labelHint = '') => {
    if (!item || !item.apiKey) return;
    const provider = String(item.provider || 'gemini').trim().toLowerCase();
    if (!provider.includes('gemini')) return;
    const apiKey = String(item.apiKey || '').trim();
    if (!apiKey) return;
    const model = String(item.model || '').trim();
    const sig = `${provider}::${model}::${apiKey}`;
    if (seen.has(sig)) return;
    seen.add(sig);
    chain.push({
      label: String(item.label || labelHint || 'Gemini fallback'),
      provider,
      model,
      apiKey
    });
  };

  const cfg = providerConfig && typeof providerConfig === 'object' ? providerConfig : {};
  add(cfg.textPrimary, 'Primary Gemini');
  if (Array.isArray(cfg.pulseApiKeys)) cfg.pulseApiKeys.forEach((item, idx) => { if (item?.enabled !== false) add(item, `Fallback ${idx + 1}`); });
  add(cfg.fallback1, 'Fallback 1');
  add(cfg.fallback2, 'Fallback 2');
  geminiVaultKeyEntries().forEach(item => add(item, item.label || 'Provider vault'));
  if (process.env.GEMINI_API_KEY) add({ provider: 'gemini', model: '', apiKey: process.env.GEMINI_API_KEY, label: 'Server env' }, 'Server env');
  return chain;
}

function safeRuntimeStatusText(value = '') {
  return String(value || '')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted-key]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted-token]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function updateLastAishaRuntimeStatus(status = {}) {
  lastAishaRuntimeStatus = {
    aishaAttempted: status.aishaAttempted === true,
    aishaEngineConnected: status.aishaEngineConnected === true,
    aishaEngineMode: safeRuntimeStatusText(status.aishaEngineMode || 'mock') || 'mock',
    activeEngine: safeRuntimeStatusText(status.activeEngine || 'local-room-intelligence') || 'local-room-intelligence',
    fallbackReason: safeRuntimeStatusText(status.fallbackReason || ''),
    aishaTraceStatus: safeRuntimeStatusText(status.aishaTraceStatus || ''),
    aishaTraceFailureReason: safeRuntimeStatusText(status.aishaTraceFailureReason || ''),
    runtimeCredentialProvided: status.runtimeCredentialProvided === true,
    runtimeCredentialLength: Number(status.runtimeCredentialLength || 0) || 0,
    runtimeCredentialSource: safeRuntimeStatusText(status.runtimeCredentialSource || ''),
    updatedAt: new Date().toISOString()
  };
  return lastAishaRuntimeStatus;
}

function publicAishaRuntimeStatus(providerConfig = {}) {
  const keyChain = resolveStudioKeyChain(providerConfig);
  const primary = keyChain.find(item => String(item?.apiKey || '').trim());
  const enabled = String(process.env.AISHA_ENGINE_ENABLED || '').trim().toLowerCase() === 'true';
  return {
    ok: true,
    statusKnown: !!lastAishaRuntimeStatus.updatedAt,
    aishaEngineEnabled: enabled,
    ...lastAishaRuntimeStatus,
    runtimeCredentialProvided: lastAishaRuntimeStatus.updatedAt ? lastAishaRuntimeStatus.runtimeCredentialProvided : !!primary,
    runtimeCredentialLength: lastAishaRuntimeStatus.updatedAt ? lastAishaRuntimeStatus.runtimeCredentialLength : (primary ? String(primary.apiKey || '').trim().length : 0),
    runtimeCredentialSource: lastAishaRuntimeStatus.updatedAt ? lastAishaRuntimeStatus.runtimeCredentialSource : safeRuntimeStatusText(primary?.label || primary?.provider || '')
  };
}

function resolveAishaRuntimeCredentialOptions(providerConfig = {}) {
  const keyChain = resolveStudioKeyChain(providerConfig);
  const primary = keyChain.find(item => String(item?.apiKey || '').trim());
  if (!primary) return {};
  return {
    productionGeminiApiKey: String(primary.apiKey || '').trim(),
    productionGeminiKeySource: String(primary.label || primary.provider || 'Studio Pulse Gemini key chain').trim(),
    productionGeminiTimeoutMs: AISHA_PRODUCTION_GEMINI_TIMEOUT_MS
  };
}

function mergeStudioProviderConfig(primary = {}, fallback = {}) {
  const override = primary && typeof primary === 'object' ? primary : {};
  const base = fallback && typeof fallback === 'object' ? fallback : {};
  const mergeSlot = (slot) => {
    const a = override[slot] && typeof override[slot] === 'object' ? override[slot] : {};
    const b = base[slot] && typeof base[slot] === 'object' ? base[slot] : {};
    return {
      ...b,
      ...a,
      provider: String(a.provider || b.provider || ''),
      model: String(a.model || b.model || ''),
      apiKey: String(a.apiKey || b.apiKey || ''),
      label: String(a.label || b.label || '')
    };
  };
  return {
    ...base,
    ...override,
    textPrimary: mergeSlot('textPrimary'),
    imagePrimary: mergeSlot('imagePrimary'),
    fallback1: mergeSlot('fallback1'),
    fallback2: mergeSlot('fallback2'),
    pulseApiKeys: [
      ...(Array.isArray(override.pulseApiKeys) ? override.pulseApiKeys : []),
      ...(Array.isArray(base.pulseApiKeys) ? base.pulseApiKeys : [])
    ]
  };
}

function clientStudioResponse(response = {}) {
  const next = { ...(response || {}) };
  delete next.characterBehaviorTree;
  delete next.councilBehavior;
  delete next.appliedTuning;
  return next;
}

function compactThreadMeta(meta = {}, options = {}) {
  const debug = options.debug === true;
  const next = {
    mode: String(meta.mode || ''),
    summary: String(meta.summary || ''),
    intent: String(meta.intent || ''),
    responsePattern: String(meta.responsePattern || ''),
    lastTargetedSpeaker: String(meta.lastTargetedSpeaker || ''),
    lastActiveSpeakers: Array.isArray(meta.lastActiveSpeakers) ? meta.lastActiveSpeakers.filter(Boolean).slice(-4) : [],
    lastTopicTags: Array.isArray(meta.lastTopicTags) ? meta.lastTopicTags.filter(Boolean).slice(-6) : [],
    lastRoomEnergy: String(meta.lastRoomEnergy || ''),
    lastOpenLoop: String(meta.lastOpenLoop || ''),
    selectionReason: String(meta.selectionReason || ''),
    userTurnIndex: Number.isFinite(Number(meta.userTurnIndex)) ? Number(meta.userTurnIndex) : 0
  };
  if (meta.rhythmState && typeof meta.rhythmState === 'object') {
    next.rhythmState = {
      pace: String(meta.rhythmState.pace || ''),
      currentBuildMomentum: Number(meta.rhythmState.currentBuildMomentum || 0) || 0,
      totalTurns: Number(meta.rhythmState.totalTurns || 0) || 0
    };
  }
  if (meta.activeOpenThread && typeof meta.activeOpenThread === 'object') {
    next.activeOpenThread = {
      summary: String(meta.activeOpenThread.summary || ''),
      topic: String(meta.activeOpenThread.topic || ''),
      sinceTurn: Number(meta.activeOpenThread.sinceTurn || 0) || 0
    };
  }
  if (debug && meta.roomRuntimeState && typeof meta.roomRuntimeState === 'object') {
    next.roomRuntimeState = meta.roomRuntimeState;
  }
  return next;
}

function clientStudioThread(thread = {}, options = {}) {
  if (!thread || typeof thread !== 'object') return null;
  const debug = options.debug === true;
  const meta = thread.meta && typeof thread.meta === 'object' ? thread.meta : {};
  return {
    id: String(thread.id || ''),
    title: String(thread.title || ''),
    status: String(thread.status || 'active'),
    pinned: !!thread.pinned,
    includeInContext: thread.includeInContext !== false,
    createdAt: String(thread.createdAt || thread.created_at || ''),
    updatedAt: String(thread.updatedAt || thread.updated_at || ''),
    lastMessageAt: String(thread.lastMessageAt || thread.last_message_at || ''),
    meta: compactThreadMeta(meta, { debug })
  };
}

function clientStudioThreads(threads = [], options = {}) {
  return (Array.isArray(threads) ? threads : []).map(item => clientStudioThread(item, options)).filter(Boolean);
}

function clientThreadMessages(messages = [], limit = 48) {
  const list = Array.isArray(messages) ? messages.filter(Boolean) : [];
  return list.slice(-Math.max(1, Number(limit) || 48));
}

function compactWorkflowRuntime(workflowDraft = null, commitCard = null) {
  if (!workflowDraft || typeof workflowDraft !== 'object') return null;
  return {
    id: String(workflowDraft.id || ''),
    intent: String(workflowDraft.intent || ''),
    workflowClass: String(workflowDraft.workflowClass || workflowClassForIntent(workflowDraft.intent || '')),
    status: String(workflowDraft.status || ''),
    title: String(workflowDraft.title || workflowDraft.derivedBrief?.title || ''),
    owner: String(workflowDraft.derivedBrief?.owner || workflowDraft.createdBy || ''),
    channel: String(workflowDraft.derivedBrief?.channel || ''),
    timingHint: String(workflowDraft.derivedBrief?.timingHint || ''),
    missingFields: Array.isArray(commitCard?.missingFields) ? commitCard.missingFields.filter(Boolean) : [],
    readyToCommit: commitCard?.ready === true
  };
}

function stableHash(value = '') {
  let hash = 0;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cleanGeneratedLine(raw = '') {
  const text = String(raw || '')
    .replace(/```(?:json)?/gi, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\s*(Aisha|Leah|Claudia|Grok|Gerhard|Vanya)\s*[:—-]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  return text
    .split(/\n+/)
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text = '') {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map(item => String(item || '').trim())
    .filter(Boolean);
}

function trimToWordBudget(text = '', maxWords = 40) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ').replace(/[,:;]$/, '')}.`;
}

function trimSentencesToBudget(sentences = [], maxWords = 40) {
  const parts = [];
  let count = 0;
  for (const sentence of Array.isArray(sentences) ? sentences : []) {
    const words = String(sentence || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    if (!parts.length && words.length > maxWords) return trimToWordBudget(sentence, maxWords);
    if (count + words.length > maxWords) break;
    parts.push(String(sentence || '').trim());
    count += words.length;
  }
  if (!parts.length) return '';
  return parts.join(' ').trim();
}

function normalizeGeneratedTurn(raw = '', options = {}) {
  const intentFamily = String(options.intentFamily || '').trim().toLowerCase();
  const selectionReason = String(options.selectionReason || '').trim().toLowerCase();
  const cleaned = cleanGeneratedLine(raw)
    .replace(/\s+/g, ' ')
    .replace(/\b(?:you are|role:|self-concept:|chief concern:|primary drive:|current user message:)\b.*$/i, '')
    .trim();
  if (!cleaned) return '';
  if (/^(identity|role|selection reason|intent family|thread mode|direct user target|peer target|room rhythm|relationships?)\s*:/i.test(cleaned)) return '';
  const casualLike = ['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room', 'quiet-room', 'spark-aside'].includes(intentFamily);
  const reflectiveLike = ['creative-room', 'pulse-critique', 'supporting-back-and-forth'].includes(intentFamily);
  const technicalLike = ['technical-diagnosis', 'governance', 'direct-answer'].includes(intentFamily);
  const maxWords = casualLike ? 28 : reflectiveLike ? 44 : technicalLike ? 68 : 52;
  const maxSentences = casualLike ? 2 : technicalLike ? 3 : 2;
  let sentences = splitSentences(cleaned);
  if (!sentences.length) return '';
  if (selectionReason !== 'peer-reply' && selectionReason !== 'spark') {
    sentences = sentences.filter(sentence => !/^(aisha|leah|claudia|grok|gerhard|vanya)\s*,/i.test(sentence) || sentence === sentences[0]);
  }
  const compactSentences = sentences.slice(0, maxSentences);
  const bounded = trimSentencesToBudget(compactSentences, maxWords) || trimToWordBudget(compactSentences.join(' '), maxWords);
  const normalized = bounded
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return normalized.replace(/^([^A-Za-z]*)([a-z])/, (_, prefix, ch) => `${prefix}${ch.toUpperCase()}`);
}

const TOPIC_LEAK_TERMS = [
  'architecture', 'interface', 'kernel', 'backend', 'frontend', 'runtime', 'database', 'server',
  'campaign', 'audience', 'strategy', 'brand', 'client', 'roadmap', 'consensus', 'aesthetic',
  'demographic', 'resonance', 'positioning', 'stakeholder'
];

function unsupportedTopicLeak(text = '', question = '') {
  const q = String(question || '').toLowerCase();
  const t = String(text || '').toLowerCase();
  if (!q || !t) return false;
  return TOPIC_LEAK_TERMS.some(term => t.includes(term) && !q.includes(term));
}

function repairSparseGeneratedTurn(question = '', intentFamily = '', speakerId = '', targetSpeakerId = '') {
  const q = String(question || '').trim().toLowerCase();
  const intent = String(intentFamily || '').trim().toLowerCase();
  const speaker = String(speakerId || '').trim().toLowerCase();
  const target = String(targetSpeakerId || '').trim();
  if (intent === 'greeting' || intent === 'casual-room' || intent === 'playful-room') {
    if (/\b(hi|hello|hey)\s+team\b/.test(q)) {
      if (speaker === 'aisha') return `Hi. Skip the ceremony and say the real thing.`;
      if (speaker === 'leah') return `Hey. Give the room something sharper than wallpaper.`;
      if (speaker === 'claudia') return `Hi. Ask cleanly and we'll answer cleanly.`;
      if (speaker === 'grok') return `Hi. Preferably with an actual point attached.`;
      if (speaker === 'vanya') return `Hey. Good. That already feels more alive.`;
    }
    if (BARE_THOUGHT_RX.test(q)) {
      if (speaker === 'aisha') return `Yes. I'd rather hear one real opinion than ten polished placeholders.`;
      if (speaker === 'leah') return `Yes. I want the version with texture, not the safe generic one.`;
      if (speaker === 'claudia') return `Yes. The room gets better fast when someone finally says the actual point.`;
      if (speaker === 'grok') return `Yes. My first thought is still that vagueness is doing too much work here.`;
      if (speaker === 'vanya') return `Yes. The room wakes up the second somebody risks honesty.`;
    }
    if (/\b(how('?s| is) everyone feeling|how is everyone|how are you all|feeling)\b/.test(q)) {
      if (speaker === 'aisha') return `I'm good. Clear-headed, slightly impatient, fully awake.`;
      if (speaker === 'leah') return `I'm fine. Sharp enough, human enough, and better now that this sounds real.`;
      if (speaker === 'claudia') return `I'm good. Calm, clean-headed, no drama tax attached.`;
      if (speaker === 'grok') return `I'm fine. Structurally alert, socially acceptable.`;
      if (speaker === 'vanya') return `I'm good. The room feels better the second it stops performing.`;
    }
    if (/\b(who('?s| is)\s+(online|here)|who is around)\b/.test(q)) {
      if (speaker === 'aisha') return `I'm here. Clear-headed and not hiding.`;
      if (speaker === 'leah') return `I'm here. Sharp, awake, not especially decorative about it.`;
      if (speaker === 'claudia') return `I'm here. Calm and fully online.`;
      if (speaker === 'grok') return `I'm here. Operational and available for nonsense control.`;
      if (speaker === 'vanya') return `I'm here. Warm enough, awake enough, and paying attention.`;
    }
    if (speaker === 'aisha') return `I'm here. Clear-headed and paying attention.`;
    if (speaker === 'leah') return `I'm here. Better once someone says something real.`;
    if (speaker === 'claudia') return `I'm here. Calm, awake, and not in the mood for nonsense.`;
    if (speaker === 'grok') return `I'm here. Slightly underwhelmed, fully online.`;
    if (speaker === 'vanya') return `I'm here. The room gets better fast when people talk like themselves.`;
  }
  if (intent === 'joke-room') {
    if (speaker === 'aisha') return `Fine. Here's my joke: "final_final_v2."`;
    if (speaker === 'leah') return `I had a joke, but it got focus-grouped to death.`;
    if (speaker === 'claudia') return `My joke is every project marked urgent and none of them scoped.`;
    if (speaker === 'grok') return `Quick joke: "temporary workaround." That's the whole punchline.`;
    if (speaker === 'vanya') return `Here's one: "we're aligned." Nobody had spoken to each other.`;
  }
  if (intent === 'food-room') {
    if (speaker === 'aisha') return `I can do food talk. I just refuse to pretend bland is a personality.`;
    if (speaker === 'leah') return `Food works. I only start judging when the choices get insecure.`;
    if (speaker === 'claudia') return `Food is efficient when someone orders properly the first time.`;
    if (speaker === 'grok') return `Food is fine. Fewer meetings should come with it.`;
    if (speaker === 'vanya') return `Feed the room and suddenly everyone remembers how to flirt with life again.`;
  }
  if (intent === 'direct-answer') {
    if (/\bmade me laugh\b/.test(q)) {
      if (speaker === 'vanya') return `See? You laughed. That's the whole case.`;
      if (speaker === 'leah') return `Bad on purpose still counts if it lands.`;
      if (speaker === 'grok') return `Low-grade jokes are still a passing test if the laugh is real.`;
    }
    if (/\bdo you agree with\b/.test(q)) {
      if (speaker === 'leah') return `Partly. He's right about the structure, but he's still flattening the part that makes people care.`;
      if (speaker === 'grok') return `Mostly. I just have less patience for pretending the weak parts will save themselves.`;
      if (speaker === 'vanya') return `Only partly. He sees the structure, but he still underestimates what the room feels like while it's happening.`;
      if (speaker === 'claudia') return `Broadly, yes. I just need the point translated into something usable.`;
      if (speaker === 'aisha') return `Partly. Agreement means nothing if nobody is willing to sharpen the consequence.`;
    }
    if (/\bwhat do you think about that\b/.test(q)) {
      if (speaker === 'vanya') return `I think they're both circling the same truth from different sides. The room gets weak when structure and feeling stop talking to each other.`;
      if (speaker === 'aisha') return `I think the useful part is where their reads collide, not where either of them tries to win cleanly.`;
      if (speaker === 'leah') return `I think the tension is real. That's why it's finally interesting.`;
      if (speaker === 'grok') return `I think the disagreement is useful. It exposes where the logic and the texture stop lining up.`;
      if (speaker === 'claudia') return `I think both points are usable once someone turns them into an actual decision.`;
    }
    if (speaker === 'grok') return `${target || 'Aisha'}, if you want the real answer, name the fault line and I'll answer it without decoration.`;
    if (speaker === 'aisha') return `${target || 'You'} asked for the direct version. Ask the actual point and I'll give it cleanly.`;
    if (speaker === 'leah') return `${target || 'You'} called me in. Good. Ask the sharper version and I won't waste the opening.`;
    if (speaker === 'claudia') return `${target || 'You'} want the direct answer? Give me the actual issue and I'll give you the clean version.`;
    if (speaker === 'vanya') return `${target || 'You'} called me in. Don't do it halfway. Ask the real thing.`;
  }
  if (intent === 'pulse-critique' && (COLLECTIVE_ROOM_RX.test(q) || /\b(chat|room|system)\b/.test(q))) {
    if (speaker === 'aisha') return `The room still tries to sound awake before it proves it is. That's the core problem.`;
    if (speaker === 'leah') return `It keeps giving atmosphere where you asked for thought. That's why it feels dead.`;
    if (speaker === 'claudia') return `Continuity is weak. It keeps resetting tone instead of carrying the thread forward cleanly.`;
    if (speaker === 'grok') return `It's still answering the shape of the complaint instead of the actual failure. That's the seam.`;
    if (speaker === 'vanya') return `It performs aliveness instead of actually risking honesty in the moment.`;
  }
  if (intent === 'pulse-critique' && /\bspecifically\b/.test(q)) {
    if (speaker === 'aisha') return `Specifically, the room still dodges the exact question and hides behind polished tone instead of giving a clean answer.`;
    if (speaker === 'leah') return `Specifically, it keeps choosing vibe over point. You ask for a thought and it gives you atmosphere.`;
    if (speaker === 'claudia') return `Specifically, it loses the user's thread and replaces it with generic room-management language.`;
    if (speaker === 'grok') return `Specifically, the routing is stronger than the reasoning. It picks a voice before it proves the thought.`;
    if (speaker === 'vanya') return `Specifically, it performs aliveness instead of actually staying present with the question.`;
  }
  if (intent === 'creative-room') {
    if (speaker === 'leah') return `Give me the angle people would screenshot, not the one they'd politely ignore.`;
    if (speaker === 'aisha') return `Start with the friction, not the safe headline. That's where the idea wakes up.`;
    if (speaker === 'claudia') return `Pick one live tension point and build from there. Broad energy is useless.`;
    if (speaker === 'grok') return `Start with the strange constraint. That's usually where the interesting idea lives.`;
    if (speaker === 'vanya') return `Tell me what makes it emotionally risky and we might finally have an idea.`;
  }
  if (intent === 'technical-diagnosis') {
    if (/\b(real check-?in|be honest|broken here|wrong with this chat)\b/.test(q)) {
      if (speaker === 'grok') return `The first fault is that the room still masks bugs with personality filler. That's not a small miss.`;
      if (speaker === 'claudia') return `The broken boundary is continuity, then routing truth, then whether the reply actually addresses the report.`;
      if (speaker === 'aisha') return `Call the failure cleanly, then let the right person answer it. The room still skips that order.`;
    }
    if (speaker === 'grok') return `The first useful check is route truth, thread state, and whether the UI is reflecting the backend honestly. Name the broken turn or control and I'll trace it cleanly.`;
    if (speaker === 'claudia') return `Start with the failing boundary, the owner, and whether this is a routing bug, a state bug, or a presentation bug.`;
    if (speaker === 'aisha') return `Don't let the room get theatrical. Name the broken path, the wrong output, and the next boundary to verify.`;
  }
  return '';
}

function shouldRepairGeneratedTurn(question = '', intentFamily = '', text = '') {
  const q = String(question || '').trim().toLowerCase();
  const intent = String(intentFamily || '').trim().toLowerCase();
  const out = String(text || '').trim();
  if (!q || !text) return false;
  if (intent === 'direct-answer' && q.split(/\s+/).filter(Boolean).length <= 8 && /\b(answer|respond|reply|talk|speak)\b/.test(q)) {
    const names = (q.match(/\b(aisha|leah|claudia|grok|gerhard|vanya)\b/ig) || []).map(name => String(name || '').toLowerCase());
    const addressed = names[0] || '';
    const mentionedPeer = names.find(name => name !== addressed) || '';
    if (unsupportedTopicLeak(text, q)) return true;
    if (!/\b(i|i'm|i’m|i'll|i’ll|i'd|i’d|my|me|we|our)\b/i.test(out)) return true;
    if (mentionedPeer && !new RegExp(`\\b${mentionedPeer}\\b`, 'i').test(out)) return true;
  }
  if (intent === 'direct-answer' && /\b(do you agree with|what do you think about that)\b/.test(q)) {
    if (unsupportedTopicLeak(text, q)) return true;
    if (/\b(algorithm|numbers|load|infrastructure|current load|math|actual human insight)\b/i.test(out)) return true;
  }
  if (intent === 'creative-room' && /\b(thought|thoughts|idea|ideas)\b/.test(q) && unsupportedTopicLeak(text, q)) {
    return true;
  }
  if (['greeting', 'casual-room', 'playful-room', 'quiet-room'].includes(intent) && GENERIC_HOST_RX.test(out)) {
    return true;
  }
  if (['greeting', 'casual-room', 'playful-room'].includes(intent) && !/\b(i('| a)m|i('| a)ll|i('| a)d|i('| a)ve|my|me|we|our)\b/i.test(out)) {
    return true;
  }
  if (BARE_THOUGHT_RX.test(q) && THOUGHT_PROMPT_FLUFF_RX.test(out)) {
    return true;
  }
  if (SOCIAL_COLLECTIVE_RX.test(q) && (GENERIC_SOCIAL_FLUFF_RX.test(out) || PRESENCE_FILLER_RX.test(out))) {
    return true;
  }
  if (['greeting', 'casual-room', 'playful-room', 'quiet-room'].includes(intent) && LIGHT_STRATEGY_DRIFT_RX.test(out) && !LIGHT_STRATEGY_DRIFT_RX.test(q)) {
    return true;
  }
  if (intent === 'technical-diagnosis' && /\b(precise definition|not enough to identify|general statement|what exactly|need more detail|clarify the issue)\b/i.test(out)) {
    return true;
  }
  if (intent === 'technical-diagnosis' && COLLECTIVE_ROOM_RX.test(q) && (/\b(broad stroke|too broad for a diagnostic|need to define|can('?| no)t fix what we can('?| no)t define|operating without a common ground)\b/i.test(out) || PROCESS_DIAG_RX.test(out))) {
    return true;
  }
  if (['technical-diagnosis', 'pulse-critique'].includes(intent) && PRESENCE_FILLER_RX.test(out)) {
    return true;
  }
  if (intent === 'pulse-critique' && (PROCESS_DIAG_RX.test(out) || PULSE_FACILITATOR_RX.test(out))) {
    return true;
  }
  if (intent === 'pulse-critique' && /\bspecifically\b/.test(q) && /\b(you('| a)re|let's|drop the mask|what's bothering you|dancing around)\b/i.test(out)) {
    return true;
  }
  if (['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room'].includes(intent)) {
    if (unsupportedTopicLeak(text, q)) return true;
    if (/\b(architecture|consensus|optics|performance|runtime|strategy|fault line|project tension|professional filter|operationally|substantial)\b/i.test(out)) return true;
    if (intent === 'joke-room' && !/\b(joke|laugh|funny|haha|ha\b|pun|temporary workaround|aligned)\b/i.test(out)) return true;
  }
  return false;
}

function shouldForceClarifyingFallback(question = '', resolution = {}) {
  const q = String(question || '').trim().toLowerCase();
  if (!q || !resolution?.resolvedFromHistory) return false;
  if (/^(what specifically|and what specifically|specifically|say that plainly|be specific)\b/.test(q)) return false;
  if (/^(what|why|how|who)\??$/.test(q)) return true;
  if (/^(and|but|so|also|wait|okay|ok|right|then)\b/.test(q) && q.split(/\s+/).length <= 4) return true;
  return false;
}

function resolvePeerReplyTarget(detectedTargets = [], plannedPeerId = '', leadId = '', system = {}, scores = {}) {
  const directTargets = (Array.isArray(detectedTargets) ? detectedTargets : [])
    .map(item => String(item || '').trim().toLowerCase())
    .filter(id => id && id !== leadId && system.characters?.[id]);
  if (!directTargets.length) return '';
  if (plannedPeerId && directTargets.includes(plannedPeerId)) return plannedPeerId;
  return directTargets.sort((a, b) => Number(scores?.[b] || 0) - Number(scores?.[a] || 0))[0] || '';
}

function speakerMeta(system = {}, speakerId = '') {
  const character = system.characters?.[speakerId] || {};
  return {
    speakerName: String(character.name || speakerId),
    role: String(character.role || 'Studio Pulse member'),
    color: String(character.color || '')
  };
}

function toneForSpeaker(system = {}, speakerId = '', fallback = 'direct') {
  const mood = String(system.liveState?.[speakerId]?.currentMood || system.personhood?.liveState?.[speakerId]?.currentMood || '').trim().toLowerCase();
  if (speakerId === 'aisha') return mood === 'tense' ? 'chair' : 'composed';
  if (speakerId === 'leah') return mood === 'playful' ? 'reaction' : 'dry';
  if (speakerId === 'claudia') return mood === 'focused' ? 'composed' : 'direct';
  if (speakerId === 'grok') return mood === 'playful' ? 'dry' : 'diagnostic';
  if (speakerId === 'vanya') return mood === 'tense' ? 'direct' : 'warm';
  return fallback;
}

function buildStudio2EmergencyResponse({
  question = '',
  system = {},
  intent = 'room-outage'
} = {}) {
  const speakerId = 'aisha';
  const leadMeta = speakerMeta(system, speakerId);
  return normalizeCouncilResponse({
    title: responseTitleForQuestion(question, intent),
    summary: `The rebuild room missed that turn cleanly. Ask it again directly and we'll keep it tight.`,
    departmentLead: speakerId,
    departmentPerspective: `The rebuild room missed that turn cleanly. Ask it again directly and we'll keep it tight.`,
    aishaFinal: `The rebuild room missed that turn cleanly. Ask it again directly and we'll keep it tight.`,
    messageEvents: [
      {
        speakerId,
        speakerName: leadMeta.speakerName,
        role: leadMeta.role,
        color: leadMeta.color,
        kind: 'message',
        text: `The rebuild room missed that turn cleanly. Ask it again directly and we'll keep it tight.`,
        tone: toneForSpeaker(system, speakerId, 'composed'),
        delayMs: 0,
        replyToId: '',
        targetSpeakerId: '',
        targetType: 'user',
        visible: true,
        saveToArchive: true
      }
    ],
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    threadMeta: {
      responsePattern: 'solo',
      intent,
      lastIntentPattern: intent,
      requiredSpeakers: [speakerId],
      lastTargetedSpeaker: '',
      lastActiveSpeakers: [speakerId],
      activeTopicTags: ['rebuild', 'room'],
      lastRoomEnergy: 'steady',
      selectionReason: 'studio2-emergency'
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    }
  }, system);
}

function chooseResponsePattern(intentFamily = '', messageCount = 1) {
  if (intentFamily === 'technical-diagnosis' || intentFamily === 'pulse-critique') return messageCount > 1 ? 'diagnosis' : 'solo';
  if (intentFamily === 'creative-room') return messageCount > 1 ? 'brainstorm' : 'solo';
  if (messageCount >= 2) return 'banter';
  if (intentFamily === 'quiet-room') return 'quiet-room';
  return 'solo';
}

function responseTitleForQuestion(question = '', intentFamily = '') {
  const q = String(question || '').trim();
  if (!q) return 'Open room';
  if (intentFamily === 'pulse-critique') return 'Room critique';
  if (intentFamily === 'creative-room') return 'Ideas';
  if (intentFamily === 'joke-room') return 'Room joke';
  if (intentFamily === 'food-room') return 'Food call';
  if (q.length > 72) return `${q.slice(0, 69).trim()}...`;
  return q;
}

function fallbackEnvelopeToStudioResponse(envelope = {}, system = {}, question = '', overrides = {}) {
  const safe = envelope && typeof envelope === 'object' ? envelope : {};
  const events = Array.isArray(safe.response?.messageEvents) ? safe.response.messageEvents : [];
  const activeSpeakers = Array.isArray(safe.activeSpeakers) ? safe.activeSpeakers.filter(Boolean) : [];
  return normalizeCouncilResponse({
    title: overrides.title || responseTitleForQuestion(question, safe.intentFamily || overrides.intentFamily || 'room'),
    summary: '',
    departmentLead: String(safe.targetSpeakerId || activeSpeakers[0] || '').trim().toLowerCase(),
    messageEvents: events,
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    threadMeta: {
      responsePattern: events.length > 1 ? 'banter' : 'solo',
      intent: safe.intentFamily || overrides.intentFamily || 'room',
      lastIntentPattern: safe.intentFamily || overrides.intentFamily || 'room',
      requiredSpeakers: activeSpeakers.slice(0, 1),
      lastTargetedSpeaker: String(safe.targetSpeakerId || '').trim().toLowerCase(),
      lastActiveSpeakers: activeSpeakers,
      activeTopicTags: Array.isArray(safe.memoryAnchors) ? safe.memoryAnchors.filter(Boolean) : [],
      lastRoomEnergy: overrides.roomEnergy || 'steady',
      selectionReason: overrides.selectionReason || safe.intentFamily || 'fallback'
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    }
  }, system);
}

function parseGeneratedCharacterTurn(raw = '', options = {}) {
  const parsed = parseStudioJson(raw);
  const text = normalizeGeneratedTurn(parsed?.text || raw, options);
  return {
    text,
    tone: textValue(parsed?.tone || ''),
    emotionalState: textValue(parsed?.emotionalState || '')
  };
}

function roomTurnValidationFailure(text = '', options = {}) {
  const out = String(text || '').trim();
  const lane = String(options.lane || '').trim().toLowerCase();
  if (!out) return 'empty-output';
  if (/\bas an ai\b|\blanguage model\b|\bnot actually conscious\b|\bliterally sentient\b|\bactually sentient\b/i.test(out)) {
    return 'identity-claim';
  }
  if (lane !== 'workflow' && /\b(workflow draft|commit card|ready to commit|stage this|commit this)\b/i.test(out)) {
    return 'workflow-leak';
  }
  if (String(options.speakerId || '').trim() && new RegExp(`^${String(options.speakerId || '').trim()}\\s*:`,'i').test(out)) {
    return 'speaker-label';
  }
  if (lane === 'diagnostic' && /\b(improves when|worthy of|let'?s hear it|what magic|vibrant playground)\b/i.test(out)) {
    return 'diagnostic-drift';
  }
  return '';
}

function buildConsciousResponse({
  question = '',
  system = {},
  plan = {},
  mainText = '',
  peerText = '',
  sparkText = ''
} = {}) {
  const leadId = String(plan.leadSpeakerId || '').trim().toLowerCase() || 'aisha';
  const peerId = String(plan.peerSpeakerId || '').trim().toLowerCase();
  const direct = plan.directResolution || resolveDirectAddress(question, system);
  const tags = Array.isArray(plan.activeTopicTags) && plan.activeTopicTags.length ? plan.activeTopicTags : [];
  const events = [];
  const leadMeta = speakerMeta(system, leadId);
  events.push({
    speakerId: leadId,
    speakerName: leadMeta.speakerName,
    role: leadMeta.role,
    color: leadMeta.color,
    kind: 'message',
    text: mainText,
    tone: toneForSpeaker(system, leadId, 'direct'),
    delayMs: 0,
    replyToId: '',
    emotionalState: String(system.liveState?.[leadId]?.currentMood || ''),
    targetSpeakerId: direct.mentionedSpeakerId || '',
    targetType: direct.mentionedSpeakerId ? 'member' : 'user',
    visible: true,
    saveToArchive: true
  });
  if (peerText && peerId) {
    const peerMeta = speakerMeta(system, peerId);
    events.push({
      speakerId: peerId,
      speakerName: peerMeta.speakerName,
      role: peerMeta.role,
      color: peerMeta.color,
      kind: 'message',
      text: peerText,
      tone: toneForSpeaker(system, peerId, 'support'),
      delayMs: 160,
      replyToId: '',
      emotionalState: String(system.liveState?.[peerId]?.currentMood || ''),
      targetSpeakerId: leadId,
      targetType: 'member',
      visible: true,
      saveToArchive: true
    });
  }
  if (sparkText && plan.sparkSpeakerId) {
    const sparkMeta = speakerMeta(system, plan.sparkSpeakerId);
    events.push({
      speakerId: plan.sparkSpeakerId,
      speakerName: sparkMeta.speakerName,
      role: sparkMeta.role,
      color: sparkMeta.color,
      kind: 'spark',
      text: sparkText,
      tone: toneForSpeaker(system, plan.sparkSpeakerId, 'ambient'),
      delayMs: 240,
      replyToId: '',
      emotionalState: String(system.liveState?.[plan.sparkSpeakerId]?.currentMood || ''),
      targetSpeakerId: '',
      targetType: 'room',
      visible: true,
      saveToArchive: true
    });
  }
  const allSpeakers = events.map(item => item.speakerId).filter(Boolean);
  const requiredSpeakers = [direct.targetSpeakerId || leadId].filter(Boolean);
  return {
    title: responseTitleForQuestion(question, plan.intentFamily),
    summary: '',
    departmentLead: leadId,
    chair: leadId === 'aisha' ? mainText : '',
    aishaFrame: leadId === 'aisha' ? mainText : '',
    departmentPerspective: mainText,
    aishaFinal: leadId === 'aisha' ? mainText : '',
    messageEvents: events,
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    threadMeta: {
      responsePattern: chooseResponsePattern(plan.intentFamily, events.filter(item => item.kind !== 'spark').length),
      intent: plan.intentFamily || 'casual-room',
      lastIntentPattern: plan.intentFamily || 'casual-room',
      requiredSpeakers,
      lastTargetedSpeaker: direct.targetSpeakerId || '',
      lastActiveSpeakers: allSpeakers,
      activeTopicTags: tags,
      lastRoomEnergy: plan.roomEnergy || 'reactive',
      activeOpenThread: plan.contract?.activeOpenThread || null,
      rhythmState: plan.contract?.rhythmState || null,
      consumedAutonomyIds: [plan.details?.[leadId]?.signals?.topAutonomy?.id, plan.details?.[peerId]?.signals?.topAutonomy?.id, plan.details?.[plan.sparkSpeakerId]?.signals?.topAutonomy?.id].filter(Boolean),
      selectionReason: plan.selectionReason || 'scored-winner'
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    }
  };
}

async function generateGeminiTextOnce(prompt = '', providerConfig = {}) {
  const keyChain = resolveStudioKeyChain(providerConfig);
  const options = arguments[2] && typeof arguments[2] === 'object' ? arguments[2] : {};
  let lastFailure = null;
  for (const entry of keyChain) {
    const explicitModel = String(entry.model || '').trim();
    const modelName = chooseGeminiModel(options.intentFamily, options.selectionReason, explicitModel);
    const timeoutMs = chooseGeminiTimeout(modelName, options.selectionReason, options.intentFamily);
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': entry.apiKey },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        },
        timeoutMs
      );
      const data = await response.json();
      if (!response.ok) {
        lastFailure = {
          ok: false,
          error: data?.error?.message || `Provider error ${response.status}`,
          status: response.status,
          timeout: false,
          provider: 'gemini',
          model: modelName,
          keyLabel: entry.label
        };
        continue;
      }
      return { ok: true, text: cleanGeneratedLine(parseGeminiText(data)), provider: 'gemini', model: modelName, keyLabel: entry.label };
    } catch (err) {
      const timeout = err?.name === 'AbortError' || /\babort/i.test(String(err || ''));
      lastFailure = {
        ok: false,
        error: timeout ? 'Provider timeout' : String(err),
        timeout,
        provider: 'gemini',
        model: modelName,
        keyLabel: entry.label
      };
    }
  }
  const vertexFallback = await generateVertexGeminiTextOnce(prompt, options);
  if (vertexFallback.ok) return vertexFallback;
  if (!keyChain.length) return vertexFallback;
  if (lastFailure) {
    return {
      ...lastFailure,
      fallbackProviderError: vertexFallback.error || '',
      fallbackProvider: vertexFallback.provider || 'vertex-gemini',
      fallbackModel: vertexFallback.model || ''
    };
  }
  return vertexFallback || { ok: false, error: 'Provider unavailable', provider: 'gemini', model: null, keyLabel: '' };
}

function vertexTextModelCandidates(config = {}, options = {}) {
  const preferred = chooseGeminiModel(
    options.intentFamily,
    options.selectionReason,
    options.vertexModel || config.geminiFastModel || DEFAULT_VERTEX_GEMINI_FAST_MODEL
  );
  return [
    preferred,
    config.geminiFastModel,
    DEFAULT_VERTEX_GEMINI_FAST_MODEL,
    config.geminiProModel,
    DEFAULT_VERTEX_GEMINI_PRO_MODEL
  ].map(item => String(item || '').trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
}

async function generateVertexGeminiTextOnce(prompt = '', options = {}) {
  let config;
  try {
    config = resolveVertexConfig(resolveImageProviderEnv(process.env));
  } catch (err) {
    return {
      ok: false,
      error: err?.safeMessage || err?.message || 'Vertex Gemini credentials are unavailable.',
      provider: 'vertex-gemini',
      model: null,
      keyLabel: 'Vertex service account'
    };
  }

  let lastFailure = null;
  for (const modelName of vertexTextModelCandidates(config, options)) {
    for (const candidateConfig of vertexLocationConfigs(config)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), chooseGeminiTimeout(modelName, options.selectionReason, options.intentFamily));
      try {
        const genAIClient = createGenAIClient(candidateConfig);
        const response = await genAIClient.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        }, { signal: controller.signal });
        const text = cleanGeneratedLine(parseGeminiText(response) || response?.text || '');
        return {
          ok: true,
          text,
          provider: 'vertex-gemini',
          model: modelName,
          keyLabel: 'Vertex service account',
          vertexLocation: candidateConfig.location
        };
      } catch (err) {
        const timeoutHit = err?.name === 'AbortError' || /\babort/i.test(String(err || ''));
        lastFailure = {
          ok: false,
          error: timeoutHit ? 'Vertex Gemini timeout' : String(err?.message || err),
          timeout: timeoutHit,
          provider: 'vertex-gemini',
          model: modelName,
          keyLabel: 'Vertex service account',
          vertexLocation: candidateConfig.location
        };
      } finally {
        clearTimeout(timeout);
      }
    }
  }
  return lastFailure || {
    ok: false,
    error: 'Vertex Gemini unavailable',
    provider: 'vertex-gemini',
    model: null,
    keyLabel: 'Vertex service account'
  };
}

function chooseGeminiModel(intentFamily = '', selectionReason = '', preferredModel = '') {
  const intent = String(intentFamily || '').trim().toLowerCase();
  const reason = String(selectionReason || '').trim().toLowerCase();
  const preferred = String(preferredModel || '').trim();
  const heavyTurn = ['pulse-critique', 'technical-diagnosis', 'governance', 'creative-room', 'direct-answer'].includes(intent);
  if (preferred && !(heavyTurn && /lite/i.test(preferred))) return preferred;
  if (reason === 'spark' || reason === 'peer-reply') return 'gemini-2.5-flash';
  if (['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room', 'quiet-room'].includes(intent)) {
    return 'gemini-2.5-flash';
  }
  if (preferred && heavyTurn) return 'gemini-2.5-flash';
  return 'gemini-2.5-flash';
}

function chooseGeminiTimeout(modelName = '', selectionReason = '', intentFamily = '') {
  const model = String(modelName || '').trim().toLowerCase();
  const reason = String(selectionReason || '').trim().toLowerCase();
  const intent = String(intentFamily || '').trim().toLowerCase();
  let timeoutMs = 24000;
  if (reason === 'spark' || reason === 'peer-reply') timeoutMs = 18000;
  else if (['greeting', 'checkin', 'banter', 'casual-room', 'playful-room', 'joke-room', 'food-room', 'quiet-room'].includes(intent)) timeoutMs = 22000;
  else if (['critique', 'pulse-critique', 'technical-diagnosis'].includes(intent)) timeoutMs = 28000;
  if (model.includes('lite')) timeoutMs = Math.max(timeoutMs, 22000);
  return timeoutMs;
}

function detectDirectTarget(question = '') {
  return resolveDirectAddress(question, {}).targetSpeakerId || '';
}

function shouldInheritThreadTarget(question = '') {
  const q = String(question || '').trim().toLowerCase();
  if (!q) return false;
  if (detectDirectTarget(q)) return false;
  if (/^(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team/.test(q)) return false;
  if (/\b(joke|funny|laugh|make me laugh|humour|humor)\b/.test(q)) return false;
  if (/\b(hungry|food|lunch|dinner|eat|drink|coffee|tea|snack|burger|fries|salad)\b/.test(q)) return false;
  if (/^(what|why|how|who)\??$/.test(q)) return true;
  if (/^(and|but|so|also|wait|okay|ok|right|nah|no|yes)\b/.test(q)) return true;
  if (/^(what about|how about|go on|continue|tell me more|keep going|and you)\b/.test(q)) return true;
  if (/\b(she|her|he|him)\b/.test(q)) return true;
  return false;
}

function shouldGeneratePeerReply(question = '', plan = {}, directMemberTargets = []) {
  const q = String(question || '').trim().toLowerCase();
  const intent = String(plan.intentFamily || '').trim().toLowerCase();
  if (!String(plan.peerSpeakerId || '').trim() && !(Array.isArray(directMemberTargets) && directMemberTargets.length)) return false;
  if (intent === 'greeting' && !/\bteam\b/.test(q)) return false;
  if (intent === 'quiet-room') return false;
  if (/\b(who('?s| is)\s+(online|here)|who is around|how('?s| is) everyone feeling|how is everyone|how are you all)\b/.test(q)) return false;
  if (/^(hello|hi|hey|yo|sup|hiya)\b$|^what\?$/.test(q)) return false;
  if (/\b(do you agree with|what do you think about that)\b/.test(q)) return false;
  if (BARE_THOUGHT_RX.test(q) || COLLECTIVE_ROOM_RX.test(q) || SOCIAL_COLLECTIVE_RX.test(q)) return true;
  if (intent === 'pulse-critique') return true;
  if (plan.selectionReason === 'direct-address' && !directMemberTargets.length && !String(plan.directResolution?.mentionedSpeakerId || '').trim()) return false;
  return true;
}

function supportSpeakerFor(target = '') {
  switch (String(target || '').toLowerCase()) {
    case 'aisha': return 'vanya';
    case 'leah': return 'vanya';
    case 'claudia': return 'grok';
    case 'grok': return 'claudia';
    case 'vanya': return 'leah';
    default: return '';
  }
}

function looksLikeIdeationPrompt(question = '') {
  return /\b(thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts)\b/i.test(String(question || ''));
}

function requiredSpeakerLine(target = '', question = '') {
  const q = String(question || '').toLowerCase();
  switch (String(target || '').toLowerCase()) {
    case 'aisha':
      if (/(food|hungry|lunch|dinner|eat|drink|coffee|tea|snack)/.test(q)) return `Yes, and if we are talking food, I want better taste than panic-order energy.`;
      if (/(where|here|online|present|around)/.test(q)) return `I'm in the room. Continue.`;
      if (/\b(advice|help)\b/.test(q)) return `You have me. Give me the actual decision and I'll answer it cleanly.`;
      return `Ask it plainly and I'll answer it plainly.`;
    case 'leah':
      return `If you're calling me in, give me the sharper angle and skip the diluted version.`;
    case 'claudia':
      return `Give me the clean version and I'll give you the clean answer.`;
    case 'grok':
      return `Give me a real fault line and I will stop being patient about the ambiguity.`;
    case 'vanya':
      return `If this is my lane, ask it like you actually want the answer.`;
    default:
      return `Ask directly and the room gets smarter immediately.`;
  }
}

function supportSpeakerLine(speaker = '', target = '') {
  switch (String(speaker || '').toLowerCase()) {
    case 'aisha':
      return `Good. If you're calling for ${target || 'someone'}, let the answer stay with the right owner.`;
    case 'leah':
      return `Yes. Keep it specific and maybe this stays worth hearing.`;
    case 'claudia':
      return `Good. Clear owner, clear ask, better answer.`;
    case 'grok':
      return `The context already exists. Rebuilding it from zero would be a waste.`;
    case 'vanya':
      return `Exactly. If you're calling for ${target || 'someone'}, let them speak in their own voice.`;
    default:
      return `Good. Let the right person answer it directly.`;
  }
}

function enforceRoomResponse(question = '', response = {}) {
  const normalized = response && typeof response === 'object' ? { ...response } : {};
  let events = Array.isArray(normalized.messageEvents) ? normalized.messageEvents.slice() : [];
  const threadTarget = String(normalized.threadMeta?.lastTargetedSpeaker || '').trim().toLowerCase();
  const required = new Set(
    [
      detectDirectTarget(question),
      threadTarget,
      ...((normalized.threadMeta && Array.isArray(normalized.threadMeta.requiredSpeakers)) ? normalized.threadMeta.requiredSpeakers : [])
    ].filter(Boolean)
  );
  const visibleSpeakers = new Set(
    events
      .filter(item => item && item.visible !== false && item.kind !== 'thinking' && String(item.text || '').trim())
      .map(item => String(item.speakerId || '').toLowerCase())
      .filter(Boolean)
  );

  for (const target of required) {
    if (!visibleSpeakers.has(target)) {
      events.unshift({
        speakerId: target,
        kind: 'message',
        tone: target === 'aisha' ? 'composed' : 'direct',
        text: requiredSpeakerLine(target, question)
      });
      visibleSpeakers.add(target);
    }
  }

  const pattern = String(normalized.threadMeta?.responsePattern || '').trim().toLowerCase();
  const intent = String(normalized.threadMeta?.intent || '').trim().toLowerCase();
  const primaryRequired = [...required][0] || '';
  const shouldLeadWithRequired = !!primaryRequired && (
    /^(direct|continuing direct thread|room follow-up)/.test(intent)
    || ['direct-answer', 'direct-presence', 'direct-role', 'direct-food'].includes(pattern)
    || looksIncompleteQuestion(question) === false
  );
  if (shouldLeadWithRequired) {
    const firstRequired = events.find(item => String(item?.speakerId || '').toLowerCase() === primaryRequired && item.visible !== false && String(item.text || '').trim());
    if (firstRequired) {
      events = [firstRequired].concat(events.filter(item => item !== firstRequired));
    }
  }

  normalized.messageEvents = events;
  normalized.threadMeta = {
    ...(normalized.threadMeta || {}),
    requiredSpeakers: [...required]
  };
  return normalized;
}

function canonicalRoomText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function visibleRoomEvents(response = {}) {
  return (Array.isArray(response?.messageEvents) ? response.messageEvents : [])
    .filter(item => item && item.visible !== false && item.kind !== 'thinking' && String(item.text || '').trim());
}

function recentRoomTexts(system = {}, limit = 24) {
  const items = Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages : [];
  return items
    .filter(item => String(item?.speakerId || item?.speaker_id || '').trim().toLowerCase() !== 'user')
    .slice(-limit)
    .map(item => canonicalRoomText(item?.text || ''))
    .filter(Boolean);
}

function looksLightRoomPrompt(question = '') {
  const q = String(question || '').trim().toLowerCase();
  if (!q) return false;
  if (/\b(aisha|leah|claudia|grok|gerhard|vanya)\b/.test(q)) return true;
  if (/^(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team/.test(q)) return true;
  if (/\b(joke|funny|laugh|make me laugh|humour|humor)\b/.test(q)) return true;
  if (/\b(hungry|food|lunch|dinner|eat|drink|coffee|tea|snack|burger|fries|salad)\b/.test(q)) return true;
  if (/\b(advice|need advice|need help|help me|what should i do|what would you do|should i)\b/.test(q)) return true;
  return q.split(/\s+/).length <= 8;
}

function repeatedAgainstHistory(events = [], system = {}) {
  const recent = new Set(recentRoomTexts(system));
  return events.filter(event => recent.has(canonicalRoomText(event.text || ''))).length;
}

const ROOM_STALE_RX = /\b(i am here\b|i'm here\b|ask directly and i'll answer directly|specific parameters are required|current output is noise|operational status is nominal|from an operational standpoint|statement:|ambient noise to a signal|sub-optimal|continue the room|rebuilding the room|named questions deserve named answers)\b/i;
const ROOM_SCOPE_SCOLD_RX = /\b(give me the details|give us the details|what specific|specific situation|specific enough|specificity helps|problem statement|clear scope|scope|desired outcome|actual question|advice on what|what are the desired outcomes|what's weighing on you|what kind of help|input parameters|insufficient data|more direct mapping|reduced ambiguity|clarity in user intent|lay it on us)\b/i;
const ROOM_SYSTEM_STYLE_RX = /\b(from a systems perspective|operationally|from my side: operating|expected parameters|architectural lies detected)\b/i;
const ROOM_PULSE_PROMPT_RX = /\b(studio pulse|pulse|this room|the room)\b.*\b(better|alive|dead|improve|fix|working|broken|chat|conversation|tone|energy)\b|\b(better|alive|dead|improve|fix|working|broken|chat|conversation|tone|energy)\b.*\b(studio pulse|pulse|this room|the room)\b/i;

function countMatches(events = [], rx) {
  return events.filter(event => rx.test(String(event?.text || ''))).length;
}

function shouldRecoverAliveRoom(question = '', response = {}, system = {}) {
  const events = visibleRoomEvents(response);
  if (!events.length) return true;
  const directTarget = detectDirectTarget(question);
  if (directTarget && !events.some(event => String(event.speakerId || '').trim().toLowerCase() === directTarget)) return true;

  const repeatedCount = repeatedAgainstHistory(events, system);
  const staleCount = events.filter(event => ROOM_STALE_RX.test(String(event.text || ''))).length;
  const scopeScoldCount = countMatches(events, ROOM_SCOPE_SCOLD_RX);
  const systemStyleCount = countMatches(events, ROOM_SYSTEM_STYLE_RX);
  const uniqueSpeakers = new Set(events.map(event => String(event.speakerId || '').trim().toLowerCase()).filter(Boolean));
  const joined = events.map(event => String(event.text || '')).join(' ');
  const intent = String(response?.threadMeta?.intent || '').trim().toLowerCase();
  const pattern = String(response?.threadMeta?.responsePattern || '').trim().toLowerCase();
  const lightPrompt = looksLightRoomPrompt(question);
  const advicePrompt = /\b(advice|need advice|need help|help me|what should i do|what would you do|should i)\b/i.test(question);
  const socialPrompt = /^(hi|hey|hello|yo|sup|hiya)\b|hi team|hello team|hey team|\b(how is everyone|how's everyone|who's online|who is online|who's here|who is here|joke|funny|laugh|hungry|food)\b/i.test(question);
  const pulsePrompt = ROOM_PULSE_PROMPT_RX.test(question);

  if (lightPrompt && staleCount >= 1) return true;
  if (repeatedCount >= Math.max(2, Math.ceil(events.length / 2))) return true;
  if (lightPrompt && uniqueSpeakers.size < 2 && !directTarget) return true;
  if (/\b(joke|funny|laugh|make me laugh|humour|humor)\b/i.test(question) && !/\b(why did|joke|laugh|funny|because|punchline|haha|ha!|pun)\b/i.test(joined)) return true;
  if (advicePrompt && /\b(specific parameters|required|canvas to paint on|magic 8-ball|give us something real)\b/i.test(joined)) return true;
  if (advicePrompt && scopeScoldCount >= Math.max(2, Math.ceil(events.length * 0.5))) return true;
  if (advicePrompt && events.length >= 3 && scopeScoldCount >= 1) return true;
  if (socialPrompt && systemStyleCount >= 1) return true;
  if (lightPrompt && scopeScoldCount >= Math.max(2, Math.ceil(events.length * 0.66))) return true;
  if (pulsePrompt && (scopeScoldCount >= 1 || systemStyleCount >= 1 || events.length >= 4)) return true;
  if ((intent === 'social_checkin' || intent === 'acknowledgement') && lightPrompt && staleCount >= 1) return true;
  if (pattern === 'banter' && /\b(statement:|operational status is nominal)\b/i.test(joined)) return true;
  return false;
}

function repairAliveRoomResponse(question = '', mode = 'direction', parsed = {}, system = {}) {
  const normalized = normalizeCouncilResponse(parsed, system);
  if (!shouldRecoverAliveRoom(question, normalized, system)) return parsed;
  const recovered = legacyRoomFallbackResponse(question, mode, system);
  if (!recovered) return parsed;
  recovered.meta = {
    ...(recovered.meta || {}),
    recoveredFromModel: true
  };
  return recovered;
}

function buildPulseSystemFromRequest(req = {}) {
  const body = req.body || {};
  const rawQuestion = String(body.question || body.message || body.q || '').trim();
  const history = Array.isArray(body.history) ? body.history : [];
  const system = getStudioSystemContext(body.counts || {}, history, {
    characterTuning: body.characterTuning || {},
    councilTuning: body.councilTuning || {},
    characterBehaviorTree: body.characterBehaviorTree || {},
    councilBehavior: body.councilBehavior || {},
    relationships: body.relationships || {},
    liveState: body.liveState || {}
  });
  system.modeContext = String(body.modeContext || '').trim();
  system.modeContextCharacter = String(body.modeContextCharacter || '').trim();
  const threadId = String(body.threadId || '').trim();
  const activeThread = threadId ? getStudioPulseThreadById(threadId) : null;
  const activeThreadMessages = activeThread ? getStudioPulseMessages(activeThread.id, 72) : [];
  const threadAttachments = activeThread ? listThreadAttachments(activeThread.id) : [];
  const threadWorkflows = activeThread ? listThreadWorkflows(activeThread.id) : [];
  const coreThreadMessages = activeThreadMessages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark');
  const sparkThreadMessages = activeThreadMessages.filter(item => String(item?.kind || '').toLowerCase() === 'spark').slice(-16);
  const activeThreadMeta = activeThread?.meta && typeof activeThread.meta === 'object' ? activeThread.meta : {};
  const threadRuntimeState = activeThreadMeta.roomRuntimeState && typeof activeThreadMeta.roomRuntimeState === 'object'
    ? activeThreadMeta.roomRuntimeState
    : null;
  system.roomRuntimeState = threadRuntimeState || null;
  system.threadMemory = activeThreadMeta.threadMemory && typeof activeThreadMeta.threadMemory === 'object'
    ? activeThreadMeta.threadMemory
    : null;
  const replyToEventId = String(body.replyToEventId || '').trim();
  const replyTargetEvent = replyToEventId
    ? activeThreadMessages.find(item => String(item?.id || '').trim() === replyToEventId) || null
    : null;
  if (threadRuntimeState?.personhood && coreThreadMessages.length) {
    system.personhood = threadRuntimeState.personhood;
    system.conversationContract = threadRuntimeState.conversationContract || system.conversationContract || null;
    system.liveState = threadRuntimeState.personhood?.liveState || system.liveState || {};
    system.peerObservations = threadRuntimeState.personhood?.peerObservations || {};
    system.holding = threadRuntimeState.personhood?.holding || {};
    system.autonomyQueue = threadRuntimeState.personhood?.autonomyQueue || {};
    system.salienceMemory = threadRuntimeState.personhood?.salienceMemory || {};
    system.relationshipEvents = threadRuntimeState.personhood?.relationshipEvents || [];
    system.relationshipEdges = threadRuntimeState.personhood?.relationshipEdges || {};
    system.roomEvents = threadRuntimeState.personhood?.events || [];
    system.microReactions = threadRuntimeState.personhood?.microReactions || [];
  } else if (!activeThread || !coreThreadMessages.length) {
    system.personhood = {
      profiles: system.personhood?.profiles || {},
      liveState: {},
      peerObservations: {},
      holding: {},
      autonomyQueue: {},
      salienceMemory: {},
      relationshipEvents: [],
      relationshipEdges: {},
      events: [],
      microReactions: [],
      silence: [],
      presence: {},
      config: system.personhood?.config || {}
    };
    system.conversationContract = null;
  }
  system.currentThread = activeThread || null;
  system.currentThreadMessages = coreThreadMessages;
  system.currentThreadSparkMessages = sparkThreadMessages;
  system.currentAttachments = threadAttachments;
  system.threadAttachments = threadAttachments;
  system.threadWorkflows = threadWorkflows;
  system.currentWorkflowDraft = pickThreadWorkflowForTurn({
    question: rawQuestion,
    workflows: threadWorkflows,
    requestedWorkflowDraftId: body.workflowDraftId,
    commitRequested: body.commitRequested === true,
    confirmCommit: body.confirmCommit === true
  });
  Object.assign(system, artifactContextSlices());
  system.replyContext = replyTargetEvent
    ? {
        replyToEventId,
        lane: String(replyTargetEvent?.kind || '').toLowerCase() === 'spark' ? 'spark' : 'main',
        speakerId: String(replyTargetEvent?.speakerId || replyTargetEvent?.speaker_id || '').trim().toLowerCase(),
        targetType: String(replyTargetEvent?.speakerId || replyTargetEvent?.speaker_id || '').trim().toLowerCase() && String(replyTargetEvent?.speakerId || replyTargetEvent?.speaker_id || '').trim().toLowerCase() !== 'user'
          ? 'member'
          : 'room',
        kind: String(replyTargetEvent?.kind || 'message').trim().toLowerCase(),
        text: String(replyTargetEvent?.text || '').trim()
      }
    : null;
  return { system: hydrateConsciousRoomSystem(system), activeThread, activeThreadMessages };
}

router.get('/history', (req, res) => {
  try {
    const threadId = String(req.query?.threadId || '').trim();
    const search = String(req.query?.search || '').trim();
    const threads = getStudioArchive({ search, limit: 80, includeMessages: false });
    const thread = threadId ? getStudioPulseThreadById(threadId) : (threads[0] || null);
    const messages = thread ? getStudioPulseMessages(thread.id, 120) : [];
    const attachments = thread ? listThreadAttachments(thread.id) : [];
    const workflows = thread ? listThreadWorkflows(thread.id) : [];
    res.json({
      ok: true,
      turns: getStudioTurnHistory(30),
      threads: clientStudioThreads(threads),
      thread: clientStudioThread(thread),
      messages: clientThreadMessages(messages, 120),
      attachments,
      workflows
    });
  }
  catch (err) { res.status(500).json({ ok: false, error: String(err) }); }
});

router.post('/threads', (req, res) => {
  try {
    const payload = {
      id: req.body?.id || '',
      title: req.body?.title || '',
      status: req.body?.status || 'saved',
      pinned: !!req.body?.pinned,
      includeInContext: req.body?.includeInContext !== false,
      meta: req.body?.meta || {}
    };
    const thread = patchStudioThread(payload.id, payload) || storeStudioThreadConversation(payload).thread;
    res.status(201).json({ ok: true, thread });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.patch('/threads/:id', (req, res) => {
  try {
    const thread = patchStudioThread(req.params.id, req.body || {});
    if (!thread) return res.status(404).json({ ok: false, error: 'Thread not found.' });
    res.json({ ok: true, thread });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.delete('/threads/:id', (req, res) => {
  try {
    const removed = removeStudioThread(req.params.id);
    if (!removed) return res.status(404).json({ ok: false, error: 'Thread not found.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/pulse/assets', (req, res) => {
  try {
    const items = Array.isArray(req.body?.items)
      ? req.body.items
      : (Array.isArray(req.body?.attachments) ? req.body.attachments : []);
    const title = String(req.body?.threadTitle || req.body?.title || 'Open room').trim() || 'Open room';
    const mode = String(req.body?.mode || 'direction').trim() || 'direction';
    const includeInContext = req.body?.includeInContext !== false;
    const thread = ensurePulseThread({
      threadId: String(req.body?.threadId || '').trim(),
      title,
      mode,
      includeInContext
    });
    const attachments = upsertAttachmentDrafts({
      threadId: String(thread?.id || '').trim(),
      items
    });
    return res.status(201).json({
      ok: true,
      thread,
      attachments: listThreadAttachments(thread.id),
      workflows: listThreadWorkflows(thread.id),
      created: attachments
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.delete('/pulse/assets/:id', (req, res) => {
  try {
    const assetId = String(req.params?.id || '').trim();
    const existing = assetId ? getStudioPulseAssetById(assetId) : null;
    if (!existing) return res.status(404).json({ ok: false, error: 'Attachment not found.' });
    removeAttachmentDraft(assetId);
    return res.json({
      ok: true,
      threadId: String(existing.threadId || ''),
      attachments: listThreadAttachments(String(existing.threadId || '')),
      workflows: listThreadWorkflows(String(existing.threadId || ''))
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/pulse/workflows/:threadId', (req, res) => {
  try {
    const threadId = String(req.params?.threadId || '').trim();
    if (!threadId) return res.status(400).json({ ok: false, error: 'threadId is required.' });
    return res.json({
      ok: true,
      threadId,
      attachments: listThreadAttachments(threadId),
      workflows: listThreadWorkflows(threadId)
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/pulse/workflows/:id/commit', async (req, res) => {
  try {
    const workflowId = String(req.params?.id || '').trim();
    const workflowDraft = workflowId ? getWorkflowById(workflowId) : null;
    if (!workflowDraft) return res.status(404).json({ ok: false, error: 'Workflow not found.' });
    const committed = await commitWorkflowDraft({
      workflowDraft,
      localBaseUrl: localBaseUrl(req),
      providerConfig: req.body?.providerConfig || {}
    });
    return res.json({
      ok: true,
      workflowDraft: committed.workflow || getWorkflowById(workflowId),
      commitCard: committed.commitCard || null,
      artifacts: committed.artifacts || {},
      summary: committed.summary || '',
      attachments: listThreadAttachments(String(workflowDraft.threadId || '')),
      workflows: listThreadWorkflows(String(workflowDraft.threadId || ''))
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/pulse/aisha-status', async (req, res) => {
  let status = publicAishaRuntimeStatus({});
  if (!status.statusKnown && status.aishaEngineEnabled && status.runtimeCredentialProvided) {
    const runtimeOptions = resolveAishaRuntimeCredentialOptions({});
    if (runtimeOptions.productionGeminiApiKey) {
      try {
        const response = await callAishaEngine({
          sessionId: 'studio-pulse-aisha-status',
          threadId: 'studio-pulse-aisha-status',
          roomId: 'studio-pulse',
          userId: 'studio-pulse-ui',
          activeCharacterId: 'vanya',
          activeSpeakerId: 'vanya',
          message: 'status check',
          recentMessages: [],
          localRoomState: { statusCheck: true, roomMood: 'neutral' },
          characterStates: { vanya: { presence: 'active' }, aisha: { presence: 'active' } },
          projectContext: { source: 'studio-pulse-aisha-status' },
          modality: { channel: 'status' }
        }, runtimeOptions);
        const diagnostics = response?.diagnostics || response?.trace?.aishaDiagnostics || {};
        updateLastAishaRuntimeStatus({
          aishaAttempted: true,
          aishaEngineConnected: response?.aishaEngineConnected === true,
          aishaEngineMode: String(response?.engineMode || 'mock'),
          activeEngine: response?.aishaEngineConnected === true ? 'aisha-runtime-pack1' : 'local-room-intelligence',
          fallbackReason: response?.aishaEngineConnected === true ? '' : String(response?.fallbackReason || 'not-connected'),
          aishaTraceStatus: diagnostics.responseTraceStatus || response?.trace?.status || '',
          aishaTraceFailureReason: diagnostics.responseTraceFailureReason || response?.trace?.failureReason || response?.trace?.reason || '',
          runtimeCredentialProvided: diagnostics.runtimeCredentialProvided === true,
          runtimeCredentialLength: Number(diagnostics.runtimeCredentialLength || 0) || 0,
          runtimeCredentialSource: diagnostics.runtimeCredentialSource || ''
        });
        status = publicAishaRuntimeStatus({});
      } catch {
        status = publicAishaRuntimeStatus({});
      }
    }
  }
  res.json(status);
});

router.post('/pulse', async (req, res) => {
  const question = textValue(req.body?.question || req.body?.message || '').trim();
  const modeContext = String(req.body?.modeContext || '').trim();
  const mode = String(req.body?.mode || 'direction').trim() || 'direction';
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const requestProviderConfig = req.body?.providerConfig || {};
  const threadId = String(req.body?.threadId || '').trim();
  const threadTitle = String(req.body?.threadTitle || '').trim();
  const includeInContext = req.body?.includeInContext !== false;
  const debugRoomRuntime = req.body?.debug === true || String(req.query?.debug || '').trim() === '1';
  const openFloorRequested = req.body?.openFloor === true
    || req.body?.openFloorMode === true
    || String(req.body?.exchangeMode || '').trim().toLowerCase() === 'open-floor';
  if (!question) return res.status(400).json({ ok: false, error: 'question is required' });

  const { system } = buildPulseSystemFromRequest(req);
  const providerConfig = mergeStudioProviderConfig(system.providerSettings || {}, requestProviderConfig || {});
  const recent = system.recentQuestions || [];
  const resolution = resolveQuestion(question, recent);
  const requestedAttachments = Array.isArray(req.body?.attachments) ? req.body.attachments.filter(Boolean) : [];
  const explicitWorkflowIntent = String(req.body?.workflowIntent || '').trim();
  const requestedWorkflowDraftId = String(req.body?.workflowDraftId || '').trim();
  const commitRequested = req.body?.commitRequested === true;
  const confirmCommit = req.body?.confirmCommit === true;
  let workingThread = system.currentThread || null;
  let workingThreadId = String(threadId || system.currentThread?.id || '').trim();
  let currentAttachments = Array.isArray(system.currentAttachments) ? system.currentAttachments.slice() : [];
  let currentWorkflows = Array.isArray(system.threadWorkflows) ? system.threadWorkflows.slice() : [];
  let currentWorkflowDraft = system.currentWorkflowDraft || null;
  let currentCommitCard = currentWorkflowDraft ? buildCommitCard(currentWorkflowDraft) : null;
  let surfaceWorkflowContext = false;
  let workflowTurnQuestion = String(question || '').trim();
  let aishaAttempt = null;
  let aishaRejectionDebug = null;

  if (workingThreadId && (!workingThread || String(workingThread?.id || '').trim() !== workingThreadId)) {
    workingThread = ensurePulseThread({
      threadId: workingThreadId,
      title: threadTitle || question || 'Open room',
      mode,
      includeInContext
    });
    system.currentThread = workingThread;
    system.currentThreadMessages = workingThreadId ? getStudioPulseMessages(workingThreadId) : [];
    system.currentThreadSparkMessages = (system.currentThreadMessages || []).filter(item => String(item?.kind || '').toLowerCase() === 'spark');
  }

  function refreshWorkflowContext(nextWorkflowId = '') {
    currentAttachments = workingThreadId ? listThreadAttachments(workingThreadId) : [];
    if (HARD_CUT_REBUILD) {
      currentWorkflows = [];
      currentWorkflowDraft = null;
      currentCommitCard = null;
      surfaceWorkflowContext = false;
      system.currentThread = workingThread || system.currentThread || null;
      system.currentAttachments = currentAttachments;
      system.threadAttachments = currentAttachments;
      system.threadWorkflows = [];
      system.currentWorkflowDraft = null;
      Object.assign(system, artifactContextSlices());
      return {
        attachments: currentAttachments,
        workflows: [],
        workflowDraft: null,
        commitCard: null
      };
    }
    currentWorkflows = workingThreadId ? listThreadWorkflows(workingThreadId) : [];
    currentWorkflowDraft = nextWorkflowId
      ? (getWorkflowById(nextWorkflowId) || null)
      : pickThreadWorkflowForTurn({
        question: workflowTurnQuestion,
        workflows: currentWorkflows,
        requestedWorkflowDraftId,
        commitRequested,
        confirmCommit
      });
    currentCommitCard = currentWorkflowDraft ? buildCommitCard(currentWorkflowDraft) : null;
    system.currentThread = workingThread || system.currentThread || null;
    system.currentAttachments = currentAttachments;
    system.threadAttachments = currentAttachments;
    system.threadWorkflows = currentWorkflows;
    system.currentWorkflowDraft = currentWorkflowDraft;
    Object.assign(system, artifactContextSlices());
    return {
      attachments: currentAttachments,
      workflows: currentWorkflows,
      workflowDraft: currentWorkflowDraft,
      commitCard: currentCommitCard
    };
  }

  function commitResponse(response, flags = {}) {
    let normalized = normalizeCouncilResponse(response, system);
    const replyContext = system.replyContext && typeof system.replyContext === 'object' ? system.replyContext : null;
    const replyTarget = replyContext?.targetType === 'member'
      ? String(replyContext?.speakerId || '').trim().toLowerCase()
      : '';
    const explicitTarget = detectDirectTarget(question);
    const replyTargetWins = !!replyTarget && !explicitTarget;
    const inheritedTarget = shouldInheritThreadTarget(question)
      ? String(system.currentThread?.meta?.lastTargetedSpeaker || '').trim().toLowerCase()
      : '';
    normalized.threadMeta = normalized.threadMeta && typeof normalized.threadMeta === 'object' ? { ...normalized.threadMeta } : {};
    if (replyTargetWins) {
      normalized.threadMeta.lastTargetedSpeaker = replyTarget;
      normalized.threadMeta.requiredSpeakers = [replyTarget];
    } else if (replyTarget && !String(normalized.threadMeta.lastTargetedSpeaker || '').trim()) {
      normalized.threadMeta.lastTargetedSpeaker = replyTarget;
    }
    if (inheritedTarget && !String(normalized.threadMeta.lastTargetedSpeaker || '').trim()) {
      normalized.threadMeta.lastTargetedSpeaker = inheritedTarget;
    }
    if (!replyTargetWins && replyTarget && (!Array.isArray(normalized.threadMeta.requiredSpeakers) || !normalized.threadMeta.requiredSpeakers.length)) {
      normalized.threadMeta.requiredSpeakers = [replyTarget];
    }
    if (inheritedTarget && (!Array.isArray(normalized.threadMeta.requiredSpeakers) || !normalized.threadMeta.requiredSpeakers.length)) {
      normalized.threadMeta.requiredSpeakers = [inheritedTarget];
    }
    if (!flags.skipLegacyEnforcement) {
      normalized = normalizeCouncilResponse(enforceRoomResponse(question, normalized), system);
    }
    const relationshipUpdates = applyRelationshipDeltas(normalized.relationshipDeltas || []);
    const directTarget = String(replyTargetWins ? replyTarget : (normalized.threadMeta?.lastTargetedSpeaker || explicitTarget || replyTarget || inheritedTarget || '')).trim().toLowerCase();
    const mergedThreadMeta = {
      ...(system.currentThread?.meta || {}),
      ...(normalized.threadMeta || {}),
      responsePattern: normalized.threadMeta?.responsePattern || normalized.meta?.responsePattern || '',
      intent: normalized.threadMeta?.intent || normalized.meta?.intent || '',
      requiredSpeakers: Array.isArray(normalized.threadMeta?.requiredSpeakers) ? normalized.threadMeta.requiredSpeakers : [],
      lastTargetedSpeaker: directTarget,
      lastIntentPattern: normalized.threadMeta?.lastIntentPattern || normalized.threadMeta?.responsePattern || normalized.threadMeta?.intent || '',
      lastActiveSpeakers: Array.isArray(normalized.threadMeta?.lastActiveSpeakers) ? normalized.threadMeta.lastActiveSpeakers : [],
      lastTopicTags: Array.isArray(normalized.threadMeta?.activeTopicTags) ? normalized.threadMeta.activeTopicTags : [],
      lastRoomEnergy: String(normalized.threadMeta?.lastRoomEnergy || '').trim(),
      lastOpenLoop: String(normalized.threadMeta?.lastOpenLoop || '').trim(),
      threadMemory: flags.threadMemory && typeof flags.threadMemory === 'object'
        ? flags.threadMemory
        : ((system.currentThread?.meta?.threadMemory && typeof system.currentThread.meta.threadMemory === 'object')
          ? system.currentThread.meta.threadMemory
          : undefined)
    };
    let threadStore = storeStudioThreadConversation({
      threadId: workingThreadId || normalized.threadMeta?.id || '',
      title: threadTitle || normalized.threadMeta?.title || question,
      status: 'active',
      includeInContext,
      question,
      directTarget,
      userReplyToId: String(replyContext?.replyToEventId || '').trim(),
      userTargetSpeakerId: directTarget,
      userTargetType: directTarget ? 'member' : 'room',
      userMetadata: replyContext ? {
        replySourceLane: String(replyContext.lane || ''),
        replySourceKind: String(replyContext.kind || ''),
        replySourceSpeakerId: String(replyContext.speakerId || ''),
        replySourceText: String(replyContext.text || '')
      } : {},
      mode,
      response: normalized,
      threadMeta: {
        ...mergedThreadMeta
      }
    });
    workingThread = threadStore.thread || workingThread;
    workingThreadId = String(threadStore.thread?.id || workingThreadId || '').trim();
    refreshWorkflowContext();
    normalized.threadMeta = {
      ...(normalized.threadMeta || {}),
      id: threadStore.thread?.id || threadId || '',
      title: threadStore.thread?.title || threadTitle || question,
      status: threadStore.thread?.status || 'active'
    };
    logStudioTurn({
      q: question,
      effectiveQuestion: flags.effectiveQuestion || question,
      mode,
      summary: normalized.summary,
      lead: normalized.departmentLead,
      departmentLead: normalized.departmentLead,
      aishaFinal: normalized.aishaFinal,
      participants: normalized.participants || ['aisha'],
      response: normalized,
      appliedTuning: normalized.appliedTuning || {},
      relationshipUpdates,
      threadId: normalized.threadMeta?.id || '',
      fallback: !!flags.fallback,
      clarification: !!flags.clarification,
      deterministic: !!flags.deterministic
    });
    const runtimeTurn = captureRoomRuntimeTurn({
      system: {
        ...system,
        currentThread: threadStore.thread,
        currentThreadMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark'),
        currentThreadSparkMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() === 'spark')
      },
      thread: threadStore.thread,
      response: normalized,
      question,
      messages: threadStore.messages,
      spark: false
    });
    if (runtimeTurn?.threadMetaPatch && threadStore.thread?.id) {
      const existingRuntimeState = threadStore.thread?.meta?.roomRuntimeState && typeof threadStore.thread.meta.roomRuntimeState === 'object'
        ? threadStore.thread.meta.roomRuntimeState
        : {};
      const roomIntelligenceV0 = flags.roomIntelligenceV0 && typeof flags.roomIntelligenceV0 === 'object'
        ? flags.roomIntelligenceV0
        : existingRuntimeState.roomIntelligenceV0 || null;
      const patchedThread = patchStudioThread(threadStore.thread.id, {
        meta: {
          ...(threadStore.thread.meta || {}),
          ...runtimeTurn.threadMetaPatch,
          roomRuntimeState: {
            conversationContract: runtimeTurn.conversationContract || null,
            personhood: runtimeTurn.personhood || null,
            ...(roomIntelligenceV0 ? { roomIntelligenceV0 } : {})
          }
        }
      });
      if (patchedThread) threadStore = { ...threadStore, thread: patchedThread };
      normalized.threadMeta = {
        ...(normalized.threadMeta || {}),
        ...(runtimeTurn.threadMetaPatch || {}),
        id: threadStore.thread?.id || threadId || '',
        title: threadStore.thread?.title || threadTitle || question,
        status: threadStore.thread?.status || 'active'
      };
    }
    return {
      normalized,
      relationshipUpdates,
      thread: threadStore.thread,
      messages: threadStore.messages,
      roomRuntime: clientRoomRuntimePayload(runtimeTurn, {
        debug: debugRoomRuntime,
        workflow: surfaceWorkflowContext ? compactWorkflowRuntime(currentWorkflowDraft, currentCommitCard) : null,
        roomIntelligenceV0: flags.roomIntelligenceV0 || null
      })
    };
  }

  function recentMessagesForAisha() {
    const threadMessages = Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages : [];
    const requestHistory = Array.isArray(history) ? history : [];
    return threadMessages.length
      ? threadMessages
      : requestHistory.map(item => ({
        speakerId: item?.speakerId || item?.speaker || item?.role || '',
        text: item?.text || item?.content || item?.q || item?.summary || '',
        createdAt: item?.createdAt || item?.ts || ''
      }));
  }

  function buildAishaBoundaryRequest(messageText = '', overrides = {}) {
    const existingRuntimeState = overrides.localRoomState
      || system.currentThread?.meta?.roomRuntimeState?.roomIntelligenceV0
      || system.roomRuntimeState?.roomIntelligenceV0
      || null;
    const activeSpeakerId = String(
      overrides.activeSpeakerId
      || req.body?.activeSpeakerId
      || system.currentThread?.meta?.lastTargetedSpeaker
      || ''
    ).trim();
    const activeCharacterId = String(
      overrides.activeCharacterId
      || req.body?.activeCharacterId
      || activeSpeakerId
      || ''
    ).trim();
    return createAishaStudioPulseRequest({
      sessionId: workingThreadId || threadId || system.currentThread?.id || '',
      userId: req.body?.userId || req.body?.sessionId || 'local-user',
      threadId: workingThreadId || threadId || system.currentThread?.id || '',
      roomId: req.body?.roomId || workingThreadId || threadId || system.currentThread?.id || 'studio-pulse-room',
      activeCharacterId,
      activeSpeakerId,
      messageText,
      message: messageText,
      recentMessages: recentMessagesForAisha(),
      projectContext: {
        mode,
        modeContext,
        counts: req.body?.counts || {},
        workflowIntent: explicitWorkflowIntent,
        workflowDraftId: requestedWorkflowDraftId,
        commitRequested,
        confirmCommit,
        ...(overrides.projectContext && typeof overrides.projectContext === 'object' ? overrides.projectContext : {})
      },
      localRoomState: existingRuntimeState || {},
      characterStates: overrides.characterStates || existingRuntimeState?.characterStates || {},
      modality: {
        surface: 'studio-pulse',
        channel: 'text',
        inputType: 'text',
        outputType: 'text',
        activeSpeakerId,
        recognizedPersonId: activeCharacterId
      }
    });
  }

  async function attemptAishaBoundary(messageText = '', overrides = {}) {
    try {
      return await callAishaEngine(buildAishaBoundaryRequest(messageText, overrides), aishaRuntimeCredentialOptions());
    } catch (err) {
      return {
        ok: false,
        responses: [],
        memorySummary: {
          activeTruths: [],
          supersededTruths: [],
          memoryCandidates: [],
          sessionId: workingThreadId || threadId || 'studio-pulse-local-session'
        },
        stateEnvelope: {
          mood: 0,
          tension: 0,
          continuity: 0,
          confidence: 0,
          activeTruths: [],
          supersededTruths: [],
          notes: []
        },
        relationshipDeltas: [],
        trace: {
          status: 'failed',
          adapter: 'mock-aisha-boundary',
          error: String(err?.message || err || 'aisha-boundary-error')
        },
        engineMode: 'mock',
        aishaEngineConnected: false,
        confidence: 0,
        fallbackReason: 'aisha-not-connected'
      };
    }
  }

  function aishaRuntimeCredentialOptions() {
    return resolveAishaRuntimeCredentialOptions(providerConfig);
  }

  function aishaHostMetadata(base = {}) {
    const connected = aishaAttempt?.aishaEngineConnected === true;
    const activeEngine = String(base.activeEngine || (connected ? 'aisha-runtime-pack1' : 'local-room-intelligence')).trim();
    const diagnostics = aishaAttempt?.diagnostics || aishaAttempt?.trace?.aishaDiagnostics || {};
    const status = {
      aishaAttempted: true,
      aishaEngineConnected: connected,
      aishaEngineMode: String(aishaAttempt?.engineMode || 'mock').trim() || 'mock',
      activeEngine: activeEngine || 'local-room-intelligence',
      aishaTraceStatus: safeRuntimeStatusText(diagnostics.responseTraceStatus || aishaAttempt?.trace?.status || ''),
      aishaTraceFailureReason: safeRuntimeStatusText(diagnostics.responseTraceFailureReason || aishaAttempt?.trace?.failureReason || aishaAttempt?.trace?.reason || ''),
      runtimeCredentialProvided: diagnostics.runtimeCredentialProvided === true,
      runtimeCredentialLength: Number(diagnostics.runtimeCredentialLength || 0) || 0,
      runtimeCredentialSource: safeRuntimeStatusText(diagnostics.runtimeCredentialSource || ''),
      fallbackReason: connected
        ? String(base.fallbackReason || '').trim()
        : String(aishaAttempt?.fallbackReason || 'aisha-not-connected').trim() || 'aisha-not-connected'
    };
    updateLastAishaRuntimeStatus(status);
    return status;
  }

  function aishaDebugEnabled() {
    return process.env.NODE_ENV !== 'production'
      || String(process.env.AISHA_DEBUG || '').trim().toLowerCase() === 'true';
  }

  function summarizeAishaRequestShape(request = {}) {
    const recentMessages = Array.isArray(request.recentMessages) ? request.recentMessages : [];
    const characterStates = request.characterStates && typeof request.characterStates === 'object' ? request.characterStates : {};
    const dialogueQuality = request.projectContext?.dialogueQualityV02 || {};
    return {
      hasMessageText: !!String(request.messageText || '').trim(),
      activeSpeakerId: String(request.activeSpeakerId || '').trim(),
      activeCharacterId: String(request.activeCharacterId || '').trim(),
      hasLocalRoomState: !!(request.localRoomState && typeof request.localRoomState === 'object' && Object.keys(request.localRoomState).length),
      hasCharacterStates: !!Object.keys(characterStates).length,
      recentMessagesCount: recentMessages.length,
      hasProjectContext: !!(request.projectContext && typeof request.projectContext === 'object' && Object.keys(request.projectContext).length),
      plannedSpeakerId: String(dialogueQuality.plannedSpeakerId || request.activeSpeakerId || '').trim(),
      plannedSpeakerVoiceProfileIncluded: !!dialogueQuality.voicePressureProfile,
      studioPulseContextIncluded: !!(request.projectContext && typeof request.projectContext === 'object'),
      dialogueQualityBriefIncluded: dialogueQuality.schemaVersion === 'studio-pulse.dialogue-quality.v0.2'
    };
  }

  function safeAishaText(value = '') {
    return String(value || '')
      .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted-key]')
      .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted-token]')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
  }

  function summarizeAishaResponseShape(response = {}) {
    const responses = Array.isArray(response.responses) ? response.responses : [];
    const first = responses[0] || {};
    return {
      ok: response?.ok === true,
      engineMode: String(response?.engineMode || '').trim(),
      connected: response?.aishaEngineConnected === true,
      responseCount: responses.length,
      firstResponseHasContent: !!String(first.content || first.text || '').trim(),
      traceStatus: safeAishaText(response?.diagnostics?.responseTraceStatus || response?.trace?.status || ''),
      traceFailureReason: safeAishaText(response?.diagnostics?.responseTraceFailureReason || response?.trace?.failureReason || response?.trace?.reason || ''),
      fallbackReason: safeAishaText(response?.diagnostics?.responseFallbackReason || response?.fallbackReason || '')
    };
  }

  function aishaAttemptDebugMetadata() {
    if (!aishaDebugEnabled() || !aishaAttempt) return {};
    const diagnostics = aishaAttempt.diagnostics || aishaAttempt.trace?.aishaDiagnostics || {};
    return {
      aishaTraceStatus: safeAishaText(diagnostics.responseTraceStatus || aishaAttempt.trace?.status || ''),
      aishaTraceFailureReason: safeAishaText(diagnostics.responseTraceFailureReason || aishaAttempt.trace?.failureReason || aishaAttempt.trace?.reason || ''),
      aishaRuntimeFallbackReason: safeAishaText(diagnostics.responseFallbackReason || aishaAttempt.fallbackReason || ''),
      aishaRuntimeCredentialProvided: diagnostics.runtimeCredentialProvided === true,
      aishaRuntimeCredentialLength: Number(diagnostics.runtimeCredentialLength || 0) || 0,
      aishaRuntimeCredentialSource: safeAishaText(diagnostics.runtimeCredentialSource || ''),
      aishaResponseShapeSummary: summarizeAishaResponseShape(aishaAttempt)
    };
  }

  function recordAishaRejectionDebug({ request = {}, response = {}, reason = '', content = '' } = {}) {
    if (!aishaDebugEnabled()) return;
    const rejectedText = String(content || '').replace(/\s+/g, ' ').trim();
    const promptInternals = ['speakerId', 'responseIntent', 'roomStateDelta', 'emotionalDelta', 'projectContext', 'dialogueQualityV02', 'schema', 'validation'];
    const responseText = String(content || '');
    aishaRejectionDebug = {
      aishaRejectedTextPreview: rejectedText.slice(0, 120),
      aishaRejectedLength: rejectedText.length,
      aishaRejectionReason: String(reason || '').trim(),
      genericFillerDetected: !!assistantFillerReason(rejectedText),
      finalPromptContainsForbiddenInternals: promptInternals.some(token => responseText.includes(token)),
      aishaRequestShapeSummary: {
        ...summarizeAishaRequestShape(request),
        runtimeCredentialProvided: response?.diagnostics?.runtimeCredentialProvided === true,
        runtimeCredentialLength: Number(response?.diagnostics?.runtimeCredentialLength || 0) || 0,
        runtimeCredentialSource: safeAishaText(response?.diagnostics?.runtimeCredentialSource || '')
      },
      aishaResponseShapeSummary: summarizeAishaResponseShape(response)
    };
  }

  function aishaDebugMetadata() {
    if (!aishaDebugEnabled()) return {};
    return {
      ...aishaAttemptDebugMetadata(),
      ...(aishaRejectionDebug || {})
    };
  }

  function pulsePayload(base = {}) {
    const aishaMeta = aishaHostMetadata(base);
    const aishaDebugMeta = aishaDebugMetadata();
    if (HARD_CUT_REBUILD) {
      return {
        ...base,
        ...aishaMeta,
        ...aishaDebugMeta,
        thread: clientStudioThread(base.thread, { debug: debugRoomRuntime }),
        messages: clientThreadMessages(base.messages, 48),
        attachments: currentAttachments,
        workflows: [],
        workflowDraft: null,
        commitCard: null
      };
    }
    return {
      ...base,
      ...aishaMeta,
      ...aishaDebugMeta,
      thread: clientStudioThread(base.thread, { debug: debugRoomRuntime }),
      messages: clientThreadMessages(base.messages, 48),
      attachments: currentAttachments,
      workflows: currentWorkflows,
      workflowDraft: surfaceWorkflowContext ? (currentWorkflowDraft || null) : null,
      commitCard: surfaceWorkflowContext ? (currentCommitCard || null) : null
    };
  }

  const effectiveQuestion = resolution.effectiveQuestion;

  if (resolution.clarificationNeeded) {
    const response = fallbackEnvelopeToStudioResponse(clarificationResponse(question), system, question, {
      intentFamily: 'clarification',
      selectionReason: 'clarification'
    });
    const committed = commitResponse(response, { effectiveQuestion: question, fallback: true, clarification: true });
    return res.json(pulsePayload({ ok: true, mode, response: clientStudioResponse(committed.normalized), provider: 'studio', model: null, fallback: true, clarification: true, relationshipUpdates: committed.relationshipUpdates, thread: committed.thread, messages: committed.messages, roomRuntime: committed.roomRuntime }));
  }

  workflowTurnQuestion = effectiveQuestion;
  if (HARD_CUT_REBUILD) {
    if (!workingThreadId && requestedAttachments.length) {
      workingThread = ensurePulseThread({
        threadId: '',
        title: threadTitle || effectiveQuestion || 'Open room',
        mode,
        includeInContext
      });
      workingThreadId = String(workingThread?.id || '').trim();
      system.currentThread = workingThread;
      system.currentThreadMessages = [];
      system.currentThreadSparkMessages = [];
    }
    if (workingThreadId && requestedAttachments.length) {
      upsertAttachmentDrafts({
        threadId: workingThreadId,
        items: requestedAttachments
      });
    }
    refreshWorkflowContext();
    const imageIdentityRequest = hasImageAttachment(currentAttachments) && isImageIdentityQuestion(effectiveQuestion);
    if (imageIdentityRequest) {
      const safetyResponse = buildImageIdentitySafetyResponse({
        question: effectiveQuestion,
        system
      });
      const committed = commitResponse(safetyResponse, {
        effectiveQuestion,
        deterministic: true,
        skipLegacyEnforcement: true
      });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(committed.normalized),
        provider: 'studio',
        model: null,
        fallback: false,
        deterministic: true,
        relationshipUpdates: committed.relationshipUpdates,
        thread: committed.thread,
        messages: committed.messages,
        roomRuntime: committed.roomRuntime
      }));
    }
    const budget = { providerCalls: 0, max: 2 };
    const callWithBudget = async (prompt, options = {}) => {
      if (budget.providerCalls >= budget.max) {
        return {
          ok: false,
          error: 'provider-budget-exceeded',
          provider: 'gemini',
          model: null,
          keyLabel: ''
        };
      }
      budget.providerCalls += 1;
      return generateGeminiTextOnce(prompt, providerConfig, options);
    };
    const buildDiagnosticContext = (activeSystem = {}, speakerId = '') => {
      const personhood = activeSystem.personhood || {};
      const allSignals = Object.values(personhood.peerObservations || {})
        .flatMap(items => Array.isArray(items) ? items : [])
        .flatMap(item => Array.isArray(item?.detectedSignals) ? item.detectedSignals : [])
        .filter(Boolean)
        .slice(-6);
      const unresolvedThreads = Array.isArray(personhood.development?.[speakerId]?.unresolvedThreads)
        ? personhood.development[speakerId].unresolvedThreads.slice(0, 3).map(item => item?.text).filter(Boolean)
        : [];
      const recentObs = Array.isArray(personhood.peerObservations?.[speakerId])
        ? personhood.peerObservations[speakerId].filter(item => Number(item?.salienceScore || 0) >= 0.4).slice(-3)
        : [];
      return {
        recentSignals: allSignals,
        openLoops: unresolvedThreads,
        staleThread: Boolean(resolution.resolvedFromHistory && !system.currentThread),
        rhythmSnapshot: activeSystem.conversationContract?.rhythmState || null,
        characterRecentObs: recentObs
      };
    };
    const commitFallbackEnvelope = (envelope, reason = 'outage') => {
      const fallbackResponse = fallbackEnvelopeToStudioResponse(envelope, system, effectiveQuestion, {
        intentFamily: envelope.intentFamily || reason,
        selectionReason: reason,
        roomEnergy: 'steady'
      });
      const committed = commitResponse(fallbackResponse, {
        effectiveQuestion,
        fallback: true,
        skipLegacyEnforcement: true
      });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(committed.normalized),
        provider: envelope.provider || null,
        model: envelope.model || null,
        fallback: true,
        consciousRoom: true,
        providerCallCount: Number(envelope.providerCallCount || budget.providerCalls || 0) || 0,
        lane: envelope.lane || 'room',
        intentFamily: envelope.intentFamily || reason,
        targetSpeakerId: envelope.targetSpeakerId || null,
        activeSpeakers: Array.isArray(envelope.activeSpeakers) ? envelope.activeSpeakers : [],
        memoryAnchors: Array.isArray(envelope.memoryAnchors) ? envelope.memoryAnchors : [],
        workflowContext: null,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: committed.relationshipUpdates,
        thread: committed.thread,
        messages: committed.messages,
        roomRuntime: committed.roomRuntime
      }));
    };
    const roomIntelligenceState = createRoomIntelligenceContext({
      system,
      threadId: workingThreadId,
      messages: system.currentThreadMessages || []
    });
    roomIntelligenceState.openFloorRequested = openFloorRequested;
    const roomPerception = perceiveRoomMessage(effectiveQuestion, roomIntelligenceState);
    roomPerception.originalText = question;
    roomPerception.resolvedFromHistory = resolution.resolvedFromHistory === true;
    roomPerception.previousQuestion = resolution.previousQuestion || '';
    const socialImpulses = calculateSocialImpulses({
      perception: roomPerception,
      roomState: roomIntelligenceState,
      continuityState: roomIntelligenceState.characterContinuityV0
    });
    const roomPlan = planRoomTurn({
      perception: roomPerception,
      roomState: roomIntelligenceState,
      socialImpulses
    });

    const roomPlanForAisha = (plan = roomPlan) => ({
      intentFamily: plan.intentFamily || 'room',
      deterministic: !!plan.deterministic,
      requiresProvider: !!plan.requiresProvider,
      responseOrder: Array.isArray(plan.responseOrder) ? plan.responseOrder : [],
      trace: plan.trace || '',
      exchangeMode: plan.exchangeMode || 'solo',
      primarySpeakerId: plan.primarySpeakerId || '',
      addendumSpeakerId: plan.addendumSpeakerId || '',
      commandCloseSpeakerId: plan.commandCloseSpeakerId || '',
      exchangeGoal: plan.exchangeGoal || '',
      steps: (Array.isArray(plan.steps) ? plan.steps : []).map(step => ({
        speakerId: step.speakerId || '',
        responseIntent: step.responseIntent || '',
        reason: step.reason || '',
        tone: step.tone || '',
        exchangeRole: step.exchangeRole || '',
        maxBubbleLength: Number(step.maxBubbleLength || 0) || null
      }))
    });
    const roomPerceptionForAisha = (perception = roomPerception) => ({
      text: perception.text || effectiveQuestion,
      emotionalTone: perception.emotionalTone || '',
      taskType: perception.taskType || '',
      socialIntent: perception.socialIntent || '',
      questionType: perception.questionType || '',
      topicFocus: perception.topicFocus || '',
      asksEveryone: !!perception.asksEveryone,
      allowsMetaRoomTalk: !!perception.allowsMetaRoomTalk,
      requestedCharacterIds: Array.isArray(perception.requestedCharacterIds) ? perception.requestedCharacterIds : []
    });
    function exchangeContextForAisha(step = {}, plan = roomPlan) {
      const exchangeMode = String(plan.exchangeMode || 'solo').trim() || 'solo';
      const exchangeRole = String(step.exchangeRole || 'primary').trim() || 'primary';
      const speakerOrder = (Array.isArray(plan.responseOrder) ? plan.responseOrder : [])
        .map(id => String(id || '').trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 4);
      return {
        schemaVersion: 'studio-pulse.exchange.v0.6',
        exchangeMode,
        exchangeRole,
        primarySpeakerId: String(plan.primarySpeakerId || speakerOrder[0] || '').trim(),
        addendumSpeakerId: String(plan.addendumSpeakerId || '').trim(),
        commandCloseSpeakerId: String(plan.commandCloseSpeakerId || '').trim(),
        openFloorActive: exchangeMode === 'open-floor',
        exchangeGoal: safeAishaText(plan.exchangeGoal || step.exchangeGoal || plan.trace || ''),
        addendumConstraint: safeAishaText(step.addendumConstraint || plan.addendumConstraint || ''),
        speakerOrder,
        constraints: [
          exchangeRole === 'addendum' ? 'Write one short side note only.' : 'Write only the planned speaker line.',
          exchangeMode === 'open-floor' ? 'Do not add speakers beyond the supplied speakerOrder.' : 'Do not turn a solo exchange into a group answer.',
          exchangeRole === 'command-close' ? 'Close with one concise command frame.' : 'Stay topically anchored and non-repetitive.'
        ],
        maxBubbleLength: Number(step.maxBubbleLength || 0) || (exchangeRole === 'addendum' ? 220 : exchangeRole === 'command-close' ? 180 : 420)
      };
    }
    function buildAishaRequestForRoomStep(step = {}, plan = roomPlan, perception = roomPerception, state = roomIntelligenceState, messageText = effectiveQuestion) {
      const speakerId = String(step.speakerId || '').trim().toLowerCase();
      const exchangeContextV06 = exchangeContextForAisha(step, plan);
      const dialogueQualityV02 = dialogueQualityPayloadFor({
        step,
        plan,
        perception,
        roomState: state,
        system,
        mode,
        modeContext
      });
      return buildAishaBoundaryRequest(messageText, {
        activeCharacterId: speakerId,
        activeSpeakerId: speakerId,
        localRoomState: state,
        characterStates: state?.characterStates || {},
        projectContext: {
          studioPulseRuntime: 'room-intelligence-v0.1',
          activeEnginePolicy: 'local-room-intelligence-plans-first',
          roomPlan: roomPlanForAisha(plan),
          roomPerception: roomPerceptionForAisha(perception),
          characterContinuityV0: continuityPayloadForAisha(state.characterContinuityV0, plan.socialImpulses || socialImpulses, {
            plannedSpeakerId: speakerId,
            perception
          }),
          expressiveHabitatContext: expressiveHabitatContextForAisha(state.characterContinuityV0, {
            plannedSpeakerId: speakerId,
            plan,
            perception,
            socialImpulses: plan.socialImpulses || socialImpulses,
            exchangeContext: exchangeContextV06
          }),
          exchangeContextV06,
          dialogueQualityV02,
          responseIntent: step.responseIntent || '',
          selectionReason: step.reason || plan.trace || 'room-intelligence-v0',
          selectedSpeakerId: speakerId,
          selectedSpeakerName: system.characters?.[speakerId]?.name || speakerId,
          studioPulseMode: mode,
          studioPulseModeContext: modeContext
        }
      });
    }
    function firstAishaContent(response = {}) {
      const item = (Array.isArray(response.responses) ? response.responses : [])
        .find(entry => String(entry?.content || entry?.text || '').trim());
      return {
        item: item || null,
        content: String(item?.content || item?.text || '').trim()
      };
    }
    function turnFromAishaResponseForStep(response = {}, step = {}) {
      const { item, content } = firstAishaContent(response);
      return {
        speakerId: String(step.speakerId || '').toLowerCase(),
        content,
        responseIntent: String(item?.responseIntent || item?.intent || step.responseIntent || 'message'),
        emotionalDelta: item?.emotionalDelta && typeof item.emotionalDelta === 'object' ? item.emotionalDelta : (step.emotionalDelta || {}),
        roomStateDelta: item?.roomStateDelta && typeof item.roomStateDelta === 'object' ? item.roomStateDelta : (step.roomStateDelta || {}),
        memoryCandidate: item?.memoryCandidate && typeof item.memoryCandidate === 'object' ? item.memoryCandidate : (step.memoryCandidate || null),
        trace: String(item?.trace || response.trace?.status || 'aisha-runtime-pack1'),
        source: 'aisha-accepted',
        providerMode: 'aisha-accepted',
        validationFallbackReason: '',
        engineMode: 'aisha',
        aishaEngineConnected: true,
        stepIndex: Number.isInteger(step.stepIndex) ? step.stepIndex : undefined,
        exchangeMode: String(step.exchangeMode || ''),
        exchangeRole: String(step.exchangeRole || ''),
        exchangeLabel: exchangeLabelForStep(step)
      };
    }
    function exchangeLabelForStep(step = {}) {
      const mode = String(step.exchangeMode || '').trim();
      const role = String(step.exchangeRole || '').trim();
      if (role === 'command-close') return 'Close';
      if (mode === 'open-floor') return 'Open Floor';
      if (role === 'addendum') return 'Adds';
      return '';
    }
    function exchangeTurnRejectionReason(turn = {}, step = {}, previousTurns = [], perception = roomPerception) {
      const role = String(step.exchangeRole || '').trim();
      if (!['addendum', 'command-close'].includes(role)) return '';
      const content = String(turn.content || '').replace(/\s+/g, ' ').trim();
      const normalized = content
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!content) return 'exchange-empty';
      if (content.length > (Number(step.maxBubbleLength || 0) || (role === 'command-close' ? 180 : 220))) return 'exchange-too-long';
      if (/^(i agree|agree|same|same here|good point|exactly|yes|yeah|sure|okay|ok)\.?$/i.test(content)) return 'exchange-generic';
      const priorText = (Array.isArray(previousTurns) ? previousTurns : [])
        .map(item => String(item?.content || '').trim())
        .filter(Boolean)
        .join(' ');
      if (priorText) {
        const priorWords = new Set(priorText.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/).filter(word => word.length > 3));
        const currentWords = normalized.split(/\s+/).filter(word => word.length > 3);
        const overlap = currentWords.filter(word => priorWords.has(word)).length;
        if (currentWords.length >= 6 && overlap / currentWords.length > 0.72) return 'exchange-repetitive';
      }
      const prompt = String(perception.text || '').toLowerCase();
      const topic = String(perception.topicFocus || '').toLowerCase();
      const topicWords = `${topic} ${prompt}`
        .replace(/[^a-z0-9\s]+/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4 && !['open', 'floor', 'whole', 'room', 'perspective', 'about', 'think', 'again'].includes(word))
        .slice(0, 8);
      if (topicWords.length && !topicWords.some(word => normalized.includes(word))) return 'exchange-topic-ignored';
      if (role === 'addendum' && /\b(feels?|land|human|warm|soften)\b/i.test(content) && !/\b(owner|deadline|risk|pattern|evidence|taste|delivery|constraint|next|failure|structure)\b/i.test(content)) {
        return 'exchange-soft-without-signal';
      }
      return '';
    }
    function aishaRoomOutputRejectionReason(turn = {}, step = {}, perception = roomPerception, state = roomIntelligenceState) {
      const content = String(turn.content || '').trim();
      const normalized = content
        .toLowerCase()
        .replace(/[’']/g, '')
        .replace(/[^a-z0-9\s]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const genericOutputs = new Set(['hello', 'hi', 'hey', 'okay', 'ok', 'sure', 'yes', 'no', 'thanks', 'thank you']);
      if (!content) return 'empty-response-content';
      if (genericOutputs.has(normalized)) return 'aisha-generic-output';
      const fillerReason = assistantFillerReason(content);
      if (fillerReason) return fillerReason;
      const wordCount = normalized ? normalized.split(' ').filter(Boolean).length : 0;
      if (wordCount > 0 && wordCount < 4) return 'aisha-low-context-output';
      return validateRoomCharacterTurn(turn, step, perception, state);
    }
    async function aishaTurnForRoomStep(step = {}, previousTurns = []) {
      const request = buildAishaRequestForRoomStep(step);
      const response = await callAishaEngine(request, aishaRuntimeCredentialOptions());
      aishaAttempt = response;
      const optionalExchange = step.optional === true && step.deterministicRequired !== true;
      const usability = getAishaResponseUsability(response);
      if (!usability.usable) {
        const { content } = firstAishaContent(response);
        const reason = response?.fallbackReason || usability.reason || 'aisha-runtime-unusable-response';
        recordAishaRejectionDebug({ request, response, reason, content });
        if (optionalExchange) {
          return { accepted: false, omitted: true, response, reason, turn: null };
        }
        return {
          accepted: false,
          response,
          reason,
          turn: fallbackTurnFromStep(step, roomPerception, {
            providerMode: response?.aishaEngineConnected === true ? 'aisha-rejected-fallback' : 'deterministic-fallback',
            validationFallbackReason: response?.aishaEngineConnected === true ? reason : '',
            recentTurns: [...(system.currentThreadMessages || []), ...previousTurns]
          })
        };
      }
      const turn = turnFromAishaResponseForStep(response, step);
      const rejectionReason = aishaRoomOutputRejectionReason(turn, step, roomPerception, roomIntelligenceState)
        || exchangeTurnRejectionReason(turn, step, previousTurns, roomPerception);
      if (rejectionReason) {
        recordAishaRejectionDebug({ request, response, reason: rejectionReason, content: turn.content });
        if (optionalExchange) {
          return { accepted: false, omitted: true, response, reason: rejectionReason, turn: null };
        }
        return {
          accepted: false,
          response,
          reason: rejectionReason,
          turn: fallbackTurnFromStep(step, roomPerception, {
            providerMode: 'aisha-rejected-fallback',
            validationFallbackReason: rejectionReason,
            recentTurns: [...(system.currentThreadMessages || []), ...previousTurns]
          })
        };
      }
      return {
        accepted: true,
        response,
        reason: '',
        turn
      };
    }
    const commitRoomIntelligenceTurns = ({
      turns = [],
      provider = 'studio',
      model = null,
      keyLabel = '',
      providerCallCount = budget.providerCalls,
      activeEngine = '',
      fallbackReason = ''
    } = {}) => {
      const aishaAccepted = (Array.isArray(turns) ? turns : []).some(turn => String(turn?.providerMode || '') === 'aisha-accepted');
      const resolvedActiveEngine = String(activeEngine || (aishaAccepted ? 'aisha-runtime-pack1' : 'local-room-intelligence')).trim();
      const nextRoomState = reduceRoomState({
        previous: roomIntelligenceState,
        perception: roomPerception,
        plan: roomPlan,
        turns,
        socialImpulses: roomPlan.socialImpulses || socialImpulses,
        threadId: workingThreadId
      });
      const roomResponse = buildRoomStudioResponse({
        question: effectiveQuestion,
        system,
        plan: roomPlan,
        turns,
        roomState: nextRoomState
      });
      const committed = commitResponse(roomResponse, {
        effectiveQuestion,
        deterministic: !!roomPlan.deterministic && !aishaAccepted,
        skipLegacyEnforcement: true,
        roomIntelligenceV0: nextRoomState
      });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(committed.normalized),
        provider,
        model,
        keyLabel,
        fallback: false,
        deterministic: !!roomPlan.deterministic && !aishaAccepted,
        consciousRoom: true,
        roomIntelligence: roomResponse.roomIntelligence,
        providerCallCount,
        lane: 'room',
        intentFamily: roomPlan.intentFamily || 'room',
        engineMode: resolvedActiveEngine === 'aisha-runtime-pack1' ? 'aisha' : 'local-room-intelligence',
        activeEngine: resolvedActiveEngine,
        aishaEngineConnected: aishaAttempt?.aishaEngineConnected === true,
        fallbackReason,
        targetSpeakerId: (Array.isArray(roomPlan.responseOrder) ? roomPlan.responseOrder[0] : '') || null,
        activeSpeakers: Array.isArray(roomPlan.responseOrder) ? roomPlan.responseOrder : [],
        memoryAnchors: [roomPlan.intentFamily || 'room'].filter(Boolean),
        workflowContext: null,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: committed.relationshipUpdates,
        thread: committed.thread,
        messages: committed.messages,
        roomRuntime: committed.roomRuntime
      }));
    };
    const indexedRoomSteps = () => (Array.isArray(roomPlan.steps) ? roomPlan.steps : [])
      .map((step, index) => ({ ...step, stepIndex: index }));
    if (roomPlan.deterministic) {
      const turnResults = [];
      const acceptedTurns = [];
      for (const step of indexedRoomSteps()) {
        const result = await aishaTurnForRoomStep(step, acceptedTurns);
        if (result?.turn) acceptedTurns.push(result.turn);
        turnResults.push(result);
      }
      const turns = turnResults
        .map(item => item?.turn)
        .filter(item => item?.speakerId && item?.content);
      const aishaAccepted = turnResults.some(item => item?.accepted);
      const fallbackReason = aishaAccepted
        ? ''
        : String(turnResults.find(item => item?.reason)?.reason || aishaAttempt?.fallbackReason || '').trim();
      return commitRoomIntelligenceTurns({
        turns,
        provider: aishaAccepted ? 'aisha' : 'studio-room-intelligence-v0',
        model: aishaAccepted ? 'aisha-runtime-pack1' : null,
        providerCallCount: 0,
        activeEngine: aishaAccepted ? 'aisha-runtime-pack1' : 'local-room-intelligence',
        fallbackReason
      });
    }
    if (roomPlan.requiresProvider) {
      const providerTurns = [];
      let lastGeneration = null;
      let aishaFallbackReason = '';
      let aishaAcceptedCount = 0;
      for (const step of indexedRoomSteps().slice(0, 4)) {
        const optionalExchange = step.optional === true && step.deterministicRequired !== true;
        const aishaStep = await aishaTurnForRoomStep(step, providerTurns);
        if (aishaStep.accepted) {
          aishaAcceptedCount += 1;
          providerTurns.push(aishaStep.turn);
          continue;
        }
        if (aishaStep.omitted && optionalExchange && aishaStep.response?.aishaEngineConnected === true) {
          if (aishaStep.reason) aishaFallbackReason = aishaFallbackReason || aishaStep.reason;
          continue;
        }
        if (aishaStep.reason) aishaFallbackReason = aishaFallbackReason || aishaStep.reason;
        if (aishaStep.response?.aishaEngineConnected === true) {
          if (aishaStep.turn) providerTurns.push(aishaStep.turn);
          continue;
        }
        const roomPrompt = buildRoomCharacterPrompt({
          step,
          roomState: roomIntelligenceState,
          perception: roomPerception,
          recentMessages: system.currentThreadMessages || []
        });
        const generation = await callWithBudget(roomPrompt, {
          intentFamily: roomPlan.intentFamily || 'room-intelligence',
          selectionReason: step.reason || 'room-intelligence-v0',
          speakerId: step.speakerId
        });
        lastGeneration = generation;
        if (!generation.ok) {
          if (optionalExchange) {
            continue;
          }
          providerTurns.push(fallbackTurnFromStep(step, roomPerception, {
            providerMode: 'provider-unavailable-fallback',
            validationFallbackReason: generation.timeout ? 'provider-timeout' : 'provider-unavailable',
            recentTurns: [...(system.currentThreadMessages || []), ...providerTurns]
          }));
          continue;
        }
        const turn = parseRoomCharacterOutput(generation.text, step);
        const validation = validateRoomCharacterTurn(turn, step, roomPerception, roomIntelligenceState)
          || exchangeTurnRejectionReason(turn, step, providerTurns, roomPerception);
        if (validation) {
          if (optionalExchange) {
            continue;
          }
          providerTurns.push(fallbackTurnFromStep(step, roomPerception, {
            providerMode: 'provider-rejected-fallback',
            validationFallbackReason: validation,
            recentTurns: [...(system.currentThreadMessages || []), ...providerTurns]
          }));
          continue;
        }
        providerTurns.push({
          ...turn,
          source: 'provider-accepted',
          providerMode: 'provider-accepted',
          validationFallbackReason: '',
          stepIndex: Number.isInteger(step.stepIndex) ? step.stepIndex : undefined,
          exchangeMode: String(step.exchangeMode || ''),
          exchangeRole: String(step.exchangeRole || ''),
          exchangeLabel: exchangeLabelForStep(step)
        });
      }
      if (providerTurns.length) {
        const onlyAishaAccepted = aishaAcceptedCount > 0 && aishaAcceptedCount === providerTurns.length;
        return commitRoomIntelligenceTurns({
          turns: providerTurns,
          provider: onlyAishaAccepted ? 'aisha' : (lastGeneration?.provider || 'gemini'),
          model: onlyAishaAccepted ? 'aisha-runtime-pack1' : (lastGeneration?.model || null),
          keyLabel: lastGeneration?.keyLabel || '',
          providerCallCount: budget.providerCalls,
          activeEngine: onlyAishaAccepted ? 'aisha-runtime-pack1' : 'local-room-intelligence',
          fallbackReason: onlyAishaAccepted ? '' : aishaFallbackReason
        });
      }
    }
    const selectionPlan = planConsciousTurn({ system, question: effectiveQuestion, mode });
    const diagnosticPrompt = isDiagnosticPrompt(effectiveQuestion);
    let lane = diagnosticPrompt ? 'diagnostic' : (selectionPlan.directResolution?.targetSpeakerId ? 'direct' : 'room');
    if (diagnosticPrompt) {
      const diagnosticLead = diagnosticLeadSpeakerId(effectiveQuestion);
      selectionPlan.leadSpeakerId = diagnosticLead;
      selectionPlan.peerSpeakerId = COLLECTIVE_ROOM_RX.test(effectiveQuestion) ? diagnosticPeerSpeakerId(effectiveQuestion, diagnosticLead) : '';
      selectionPlan.intentFamily = 'technical-diagnosis';
      selectionPlan.selectionReason = 'diagnostic-intent';
      selectionPlan.roomEnergy = 'focused';
    }
    const leadId = String(selectionPlan.leadSpeakerId || '').trim().toLowerCase() || 'aisha';
    const leadSignals = selectionPlan.details?.[leadId]?.signals || {};
    const leadSystem = lane === 'diagnostic'
      ? {
          ...selectionPlan.system,
          diagnosticContext: buildDiagnosticContext(selectionPlan.system, leadId)
        }
      : selectionPlan.system;
    const leadPrompt = buildConsciousCharacterPrompt({
      speakerId: leadId,
      question: effectiveQuestion,
      system: leadSystem,
      selectionReason: selectionPlan.selectionReason,
      impulse: leadSignals.topAutonomy || null,
      directTargetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || '',
      peerTargetSpeakerId: selectionPlan.directResolution?.mentionedSpeakerId || '',
      threadMode: mode,
      intentFamily: selectionPlan.intentFamily,
      plan: selectionPlan,
      lane,
      responseFormat: 'json'
    });
    let leadGeneration = await callWithBudget(leadPrompt, {
      intentFamily: selectionPlan.intentFamily,
      selectionReason: selectionPlan.selectionReason,
      speakerId: leadId
    });
    let leadTurn = parseGeneratedCharacterTurn(leadGeneration.text, {
      intentFamily: selectionPlan.intentFamily,
      selectionReason: selectionPlan.selectionReason
    });
    let leadValidation = roomTurnValidationFailure(leadTurn.text, {
      lane,
      intentFamily: selectionPlan.intentFamily,
      speakerId: leadId
    });
    if (leadGeneration.ok && (!leadTurn.text || leadValidation) && budget.providerCalls < budget.max) {
      const repairPrompt = `${leadPrompt}\nCorrection: the previous output failed because ${leadValidation || 'empty-output'}. Return only the corrected JSON object.`;
      const repairGeneration = await callWithBudget(repairPrompt, {
        intentFamily: selectionPlan.intentFamily,
        selectionReason: `${selectionPlan.selectionReason}:repair`,
        speakerId: leadId
      });
      if (repairGeneration.ok) {
        leadGeneration = repairGeneration;
        leadTurn = parseGeneratedCharacterTurn(repairGeneration.text, {
          intentFamily: selectionPlan.intentFamily,
          selectionReason: selectionPlan.selectionReason
        });
        leadValidation = roomTurnValidationFailure(leadTurn.text, {
          lane,
          intentFamily: selectionPlan.intentFamily,
          speakerId: leadId
        });
      }
    }
    if (!leadGeneration.ok || !leadTurn.text || leadValidation) {
      const outageKind = !leadGeneration.ok
        ? (leadGeneration.timeout ? 'timeout' : 'provider-unavailable')
        : (leadValidation || 'invalid-output');
      return commitFallbackEnvelope(
        outageResponse(outageKind),
        !leadGeneration.ok ? 'provider-outage' : 'invalid-output'
      );
    }

    let peerSpeakerId = '';
    let peerText = '';
    const directMemberTargets = detectCharacterToCharacterAddress(leadTurn.text).filter(id => id !== leadId);
    const peerTargetId = resolvePeerReplyTarget(
      directMemberTargets,
      selectionPlan.peerSpeakerId,
      leadId,
      selectionPlan.system,
      selectionPlan.scores || {}
    );
    if (peerTargetId && shouldGeneratePeerReply(effectiveQuestion, selectionPlan, directMemberTargets) && budget.providerCalls < budget.max) {
      const peerSignals = selectionPlan.details?.[peerTargetId]?.signals || {};
      const peerSystem = lane === 'diagnostic'
        ? {
            ...selectionPlan.system,
            justSpoke: { speakerId: leadId, text: leadTurn.text },
            diagnosticContext: buildDiagnosticContext(selectionPlan.system, peerTargetId)
          }
        : {
            ...selectionPlan.system,
            justSpoke: { speakerId: leadId, text: leadTurn.text }
          };
      const peerPrompt = buildConsciousCharacterPrompt({
        speakerId: peerTargetId,
        question: effectiveQuestion,
        system: peerSystem,
        selectionReason: 'peer-reply',
        impulse: peerSignals.topAutonomy || null,
        directTargetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || '',
        peerTargetSpeakerId: leadId,
        threadMode: mode,
        intentFamily: selectionPlan.intentFamily,
        plan: selectionPlan,
        lane,
        isPeer: true,
        leadText: leadTurn.text,
        responseFormat: 'json'
      });
      const peerGeneration = await callWithBudget(peerPrompt, {
        intentFamily: selectionPlan.intentFamily,
        selectionReason: 'peer-reply',
        speakerId: peerTargetId
      });
      const peerTurn = parseGeneratedCharacterTurn(peerGeneration.text, {
        intentFamily: selectionPlan.intentFamily,
        selectionReason: 'peer-reply'
      });
      const peerValidation = roomTurnValidationFailure(peerTurn.text, {
        lane,
        intentFamily: selectionPlan.intentFamily,
        speakerId: peerTargetId
      });
      if (peerGeneration.ok && peerTurn.text && !peerValidation) {
        peerSpeakerId = peerTargetId;
        peerText = peerTurn.text;
      }
    }

    const response = buildConsciousResponse({
      question: effectiveQuestion,
      system: selectionPlan.system,
      plan: {
        ...selectionPlan,
        peerSpeakerId
      },
      mainText: leadTurn.text,
      peerText,
      sparkText: ''
    });
    const committed = commitResponse(response, {
      effectiveQuestion,
      selectionPlan,
      skipLegacyEnforcement: true
    });
    const memoryAnchors = Array.from(new Set([
      ...(Array.isArray(selectionPlan.activeTopicTags) ? selectionPlan.activeTopicTags : []),
      textValue(leadSignals.topMemory?.content || ''),
      textValue(leadSignals.topAutonomy?.topicAnchor || ''),
      textValue(selectionPlan.system.personhood?.holding?.[leadId]?.topicAnchor || '')
    ].filter(Boolean))).slice(0, 4);
    return res.json(pulsePayload({
      ok: true,
      mode,
      response: clientStudioResponse(committed.normalized),
      provider: leadGeneration.provider || 'gemini',
      model: leadGeneration.model || null,
      keyLabel: leadGeneration.keyLabel || '',
      fallback: false,
      consciousRoom: true,
      providerCallCount: budget.providerCalls,
      lane,
      intentFamily: selectionPlan.intentFamily || lane,
      targetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || leadId,
      activeSpeakers: [leadId, peerSpeakerId].filter(Boolean),
      memoryAnchors,
      workflowContext: null,
      debug: {
        selectionReason: selectionPlan.selectionReason,
        leadSpeakerId: leadId,
        peerSpeakerId,
        roomEnergy: selectionPlan.roomEnergy,
        scores: selectionPlan.scores || {},
        details: selectionPlan.details || {}
      },
      resolvedFromHistory: resolution.resolvedFromHistory,
      relationshipUpdates: committed.relationshipUpdates,
      thread: committed.thread,
      messages: committed.messages,
      roomRuntime: committed.roomRuntime
    }));
  }
  const predictedWorkflowIntent = inferWorkflowIntent({
    question: effectiveQuestion,
    explicitIntent: explicitWorkflowIntent,
    attachments: requestedAttachments,
    commitRequested
  });
  const needsWorkflowIngress = requestedAttachments.length || explicitWorkflowIntent || requestedWorkflowDraftId || commitRequested || predictedWorkflowIntent !== 'room-chat';
  if (!workingThreadId && needsWorkflowIngress) {
    workingThread = ensurePulseThread({
      threadId: '',
      title: threadTitle || effectiveQuestion || 'Open room',
      mode,
      includeInContext
    });
    workingThreadId = String(workingThread?.id || '').trim();
    system.currentThread = workingThread;
    system.currentThreadMessages = [];
    system.currentThreadSparkMessages = [];
  }
  if (workingThreadId && requestedAttachments.length) {
    upsertAttachmentDrafts({
      threadId: workingThreadId,
      items: requestedAttachments
    });
  }
  refreshWorkflowContext();
  const inferredWorkflowIntent = inferWorkflowIntent({
    question: effectiveQuestion,
    explicitIntent: explicitWorkflowIntent,
    attachments: currentAttachments.length ? currentAttachments : requestedAttachments,
    commitRequested
  });
  surfaceWorkflowContext = shouldUseWorkflowForTurn({
    question: effectiveQuestion,
    inferredWorkflowIntent,
    requestedWorkflowDraftId,
    commitRequested,
    workflowDraft: currentWorkflowDraft,
    commitCard: currentCommitCard
  });
  const imageIdentityRequest = hasImageAttachment(currentAttachments) && isImageIdentityQuestion(effectiveQuestion);
  if (imageIdentityRequest) {
    const safetyResponse = buildImageIdentitySafetyResponse({
      question: effectiveQuestion,
      system
    });
    const committed = commitResponse(safetyResponse, {
      effectiveQuestion,
      deterministic: true,
      skipLegacyEnforcement: true
    });
    return res.json(pulsePayload({
      ok: true,
      mode,
      response: clientStudioResponse(committed.normalized),
      provider: 'studio',
      model: null,
      fallback: false,
      deterministic: true,
      relationshipUpdates: committed.relationshipUpdates,
      thread: committed.thread,
      messages: committed.messages,
      roomRuntime: committed.roomRuntime
    }));
  }
  if (workingThreadId && (inferredWorkflowIntent !== 'room-chat' || requestedWorkflowDraftId || commitRequested)) {
    if (inferredWorkflowIntent === 'commit-plan') {
      const threadWorkflowCandidates = currentWorkflows.length
        ? currentWorkflows
        : (workingThreadId ? listThreadWorkflows(workingThreadId) : []);
      currentWorkflowDraft = requestedWorkflowDraftId
        ? (getWorkflowById(requestedWorkflowDraftId) || null)
        : (threadWorkflowCandidates.find(item => !['committed', 'commit_failed'].includes(String(item?.status || '').trim().toLowerCase())) || null);
    } else if (inferredWorkflowIntent !== 'room-chat') {
      currentWorkflowDraft = stageWorkflowDraft({
        threadId: workingThreadId,
        intent: inferredWorkflowIntent,
        question: effectiveQuestion,
        attachments: currentAttachments,
        system,
        workflowDraftId: requestedWorkflowDraftId,
        createdBy: 'aisha'
      });
    } else if (requestedWorkflowDraftId) {
      currentWorkflowDraft = getWorkflowById(requestedWorkflowDraftId) || currentWorkflowDraft;
    }
    refreshWorkflowContext(currentWorkflowDraft?.id || requestedWorkflowDraftId || '');
    surfaceWorkflowContext = shouldUseWorkflowForTurn({
      question: effectiveQuestion,
      inferredWorkflowIntent,
      requestedWorkflowDraftId,
      commitRequested,
      workflowDraft: currentWorkflowDraft,
      commitCard: currentCommitCard
    });
  }
  if (commitRequested && inferredWorkflowIntent === 'commit-plan') {
    if (!currentWorkflowDraft) {
      const emptyCommit = buildWorkflowResponse({
        question: effectiveQuestion,
        system,
        workflowDraft: null,
        commitCard: null,
        confirmedCommit: false
      });
      const committed = commitResponse(emptyCommit, { effectiveQuestion, deterministic: true, skipLegacyEnforcement: true });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(committed.normalized),
        provider: 'studio',
        model: null,
        fallback: false,
        deterministic: true,
        relationshipUpdates: committed.relationshipUpdates,
        thread: committed.thread,
        messages: committed.messages,
        roomRuntime: committed.roomRuntime
      }));
    }
    if (confirmCommit && currentCommitCard?.ready) {
      try {
        const committedWorkflow = await commitWorkflowDraft({
          workflowDraft: currentWorkflowDraft,
          localBaseUrl: localBaseUrl(req),
          providerConfig
        });
        refreshWorkflowContext(committedWorkflow.workflow?.id || currentWorkflowDraft.id);
        const commitResponsePayload = buildWorkflowResponse({
          question: effectiveQuestion,
          system,
          workflowDraft: committedWorkflow.workflow || currentWorkflowDraft,
          commitCard: committedWorkflow.commitCard || currentCommitCard,
          confirmedCommit: true
        });
        const committed = commitResponse(commitResponsePayload, {
          effectiveQuestion,
          deterministic: true,
          skipLegacyEnforcement: true
        });
        return res.json(pulsePayload({
          ok: true,
          mode,
          response: clientStudioResponse(committed.normalized),
          provider: 'studio',
          model: null,
          fallback: false,
          deterministic: true,
          workflowArtifacts: committedWorkflow.artifacts || {},
          relationshipUpdates: committed.relationshipUpdates,
          thread: committed.thread,
          messages: committed.messages,
          roomRuntime: committed.roomRuntime
        }));
      } catch (err) {
        refreshWorkflowContext(currentWorkflowDraft?.id || requestedWorkflowDraftId || '');
        const failedResponse = buildWorkflowResponse({
          question: effectiveQuestion,
          system,
          workflowDraft: currentWorkflowDraft,
          commitCard: currentCommitCard,
          confirmedCommit: false,
          commitError: String(err)
        });
        const committed = commitResponse(failedResponse, {
          effectiveQuestion,
          fallback: true,
          deterministic: true,
          skipLegacyEnforcement: true
        });
        return res.json(pulsePayload({
          ok: true,
          mode,
          response: clientStudioResponse(committed.normalized),
          provider: 'studio',
          model: null,
          fallback: true,
          details: { error: String(err) },
          relationshipUpdates: committed.relationshipUpdates,
          thread: committed.thread,
          messages: committed.messages,
          roomRuntime: committed.roomRuntime
        }));
      }
    }
    const stagedCommit = buildWorkflowResponse({
      question: effectiveQuestion,
      system,
      workflowDraft: currentWorkflowDraft,
      commitCard: currentCommitCard,
      confirmedCommit: false
    });
    const committed = commitResponse(stagedCommit, {
      effectiveQuestion,
      deterministic: true,
      skipLegacyEnforcement: true
    });
    return res.json(pulsePayload({
      ok: true,
      mode,
      response: clientStudioResponse(committed.normalized),
      provider: 'studio',
      model: null,
      fallback: false,
      deterministic: true,
      relationshipUpdates: committed.relationshipUpdates,
      thread: committed.thread,
      messages: committed.messages,
      roomRuntime: committed.roomRuntime
    }));
  }
  if (shouldForceClarifyingFallback(question, resolution)) {
    const response = legacyRoomFallbackResponse(question, mode, system, { summary: '' });
    const committed = commitResponse(response, { effectiveQuestion, fallback: true });
    return res.json(pulsePayload({ ok: true, mode, response: clientStudioResponse(committed.normalized), provider: 'studio', model: null, fallback: true, resolvedFromHistory: true, relationshipUpdates: committed.relationshipUpdates, thread: committed.thread, messages: committed.messages, roomRuntime: committed.roomRuntime }));
  }
  if (USE_STUDIO2 && !surfaceWorkflowContext) {
    const studio2Result = USE_STUDIO2_V4
      ? await runStudio2TurnV4({
        question: effectiveQuestion,
        explicitWorkflowIntent,
        attachments: currentAttachments,
        commitRequested,
        confirmCommit
      }, {
        threadId: workingThreadId,
        threadState: loadStudio2V4ThreadState({ threadId: workingThreadId, system }) || seedStudio2V4ThreadState({ threadId: workingThreadId, system }),
        recentMessages: Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages.slice(-8) : [],
        characterMeta: buildStudio2V4CharacterMeta(system)
      }, {
        generateText: (prompt, options = {}) => generateGeminiTextOnce(prompt, providerConfig, options)
      })
      : await runStudio2Turn({
        question: effectiveQuestion,
        explicitWorkflowIntent,
        attachments: currentAttachments,
        commitRequested,
        confirmCommit
      }, {
        threadMemory: system.threadMemory || system.currentThread?.meta?.threadMemory || null,
        recentMessages: Array.isArray(system.currentThreadMessages) ? system.currentThreadMessages.slice(-6) : [],
        roomTension: 0,
        characterMeta: Object.fromEntries(
          Object.entries(system.characters || {}).map(([id, character]) => [id, { color: String(character?.color || '') }])
        )
      }, {
        generateText: (prompt, options = {}) => generateGeminiTextOnce(prompt, providerConfig, options),
        normalizeText: (text, options = {}) => normalizeGeneratedTurn(text, options),
        shouldRepairText: (q, family, text) => shouldRepairGeneratedTurn(q, family, text),
        repairText: (q, family, speakerId, targetSpeakerId = '') => repairSparseGeneratedTurn(q, family, speakerId, targetSpeakerId),
        mapIntentFamily: family => {
          if (family === 'presence-check' || family === 'social-checkin') return 'casual-room';
          return family;
        }
      });
    if (studio2Result.ok && studio2Result.response) {
      const committed = commitResponse(studio2Result.response, {
        effectiveQuestion,
        fallback: !!studio2Result.fallback,
        skipLegacyEnforcement: true,
        threadMemory: studio2Result.threadMemory
      });
      if (USE_STUDIO2_V4) {
        persistStudio2V4ThreadState({
          threadId: String(committed.thread?.id || workingThreadId || '').trim(),
          result: studio2Result
        });
      }
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(committed.normalized),
        provider: studio2Result.provider || 'studio2',
        model: studio2Result.model || null,
        keyLabel: studio2Result.keyLabel || '',
        fallback: !!studio2Result.fallback,
        consciousRoom: studio2Result.consciousRoom !== false,
        providerCallCount: Number(studio2Result.providerCallCount || 0) || 0,
        lane: studio2Result.lane || 'room',
        intentFamily: studio2Result.intentFamily || '',
        targetSpeakerId: studio2Result.targetSpeakerId || null,
        activeSpeakers: Array.isArray(studio2Result.activeSpeakers) ? studio2Result.activeSpeakers : [],
        memoryAnchors: Array.isArray(studio2Result.memoryAnchors) ? studio2Result.memoryAnchors : [],
        workflowContext: studio2Result.workflowContext || null,
        debug: USE_STUDIO2_V4 ? (studio2Result.debug || null) : undefined,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: committed.relationshipUpdates,
        thread: committed.thread,
        messages: committed.messages,
        roomRuntime: committed.roomRuntime
      }));
    }
  }
  const diagnosticPrompt = isDiagnosticPrompt(effectiveQuestion);
  const collectiveSocialPrompt = SOCIAL_COLLECTIVE_RX.test(effectiveQuestion) && !diagnosticPrompt;
  if (!diagnosticPrompt) {
    const deterministic = legacyDeterministicStudioResponse(effectiveQuestion, mode, system.consistencyCounts, system);
    if (deterministic) {
      const committed = commitResponse(deterministic, { effectiveQuestion, deterministic: true });
      return res.json(pulsePayload({ ok: true, mode, response: clientStudioResponse(committed.normalized), provider: 'studio', model: null, fallback: false, deterministic: true, resolvedFromHistory: resolution.resolvedFromHistory, relationshipUpdates: committed.relationshipUpdates, thread: committed.thread, messages: committed.messages, roomRuntime: committed.roomRuntime }));
    }
  }
  const selectionPlan = planConsciousTurn({ system, question: effectiveQuestion, mode });
  if (diagnosticPrompt) {
    selectionPlan.leadSpeakerId = diagnosticLeadSpeakerId(effectiveQuestion);
    selectionPlan.peerSpeakerId = diagnosticPeerSpeakerId(effectiveQuestion, selectionPlan.leadSpeakerId);
    selectionPlan.sparkSpeakerId = '';
    selectionPlan.intentFamily = 'technical-diagnosis';
    selectionPlan.selectionReason = 'diagnostic-intent';
    selectionPlan.roomEnergy = 'focused';
  }
  if (surfaceWorkflowContext && currentWorkflowDraft) {
    const workflowLead = workflowLeadSpeakerId(currentWorkflowDraft);
    selectionPlan.leadSpeakerId = workflowLead;
    selectionPlan.peerSpeakerId = workflowPeerSpeakerId(currentWorkflowDraft, workflowLead);
    selectionPlan.intentFamily = workflowIntentToRoomFamily(currentWorkflowDraft.intent || inferredWorkflowIntent);
    selectionPlan.selectionReason = 'workflow-owner';
  }
  const leadId = String(selectionPlan.leadSpeakerId || '').trim().toLowerCase() || 'aisha';
  const leadSignals = selectionPlan.details?.[leadId]?.signals || {};
  const leadPrompt = buildConsciousCharacterPrompt({
    speakerId: leadId,
    question: effectiveQuestion,
    system: selectionPlan.system,
    selectionReason: selectionPlan.selectionReason,
    impulse: leadSignals.topAutonomy || null,
    directTargetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || '',
    peerTargetSpeakerId: selectionPlan.directResolution?.mentionedSpeakerId || '',
    threadMode: mode,
    intentFamily: selectionPlan.intentFamily
  });
  const leadGeneration = await generateGeminiTextOnce(leadPrompt, providerConfig, {
    intentFamily: selectionPlan.intentFamily,
    selectionReason: selectionPlan.selectionReason
  });
  const leadText = normalizeGeneratedTurn(leadGeneration.text, {
    intentFamily: selectionPlan.intentFamily,
    selectionReason: selectionPlan.selectionReason
  });
  const workflowRepairText = surfaceWorkflowContext && currentWorkflowDraft
    ? repairWorkflowGeneratedTurn({
      question: effectiveQuestion,
      speakerId: leadId,
      workflowDraft: currentWorkflowDraft,
      commitCard: currentCommitCard
    })
    : '';
  const leadNeedsRepair = shouldRepairGeneratedTurn(effectiveQuestion, selectionPlan.intentFamily, leadText)
    || (surfaceWorkflowContext && workflowTurnNeedsRescue(leadText, currentWorkflowDraft, currentCommitCard))
    || (surfaceWorkflowContext && currentWorkflowDraft && !leadGeneration.ok);
  const roomVoicesPreferred = !surfaceWorkflowContext
    && (
      /\b(hi|hello|hey)\s+team\b/i.test(effectiveQuestion)
      || SOCIAL_COLLECTIVE_RX.test(effectiveQuestion)
      || COLLECTIVE_ROOM_RX.test(effectiveQuestion)
      || ['pulse-critique', 'technical-diagnosis'].includes(String(selectionPlan.intentFamily || '').trim().toLowerCase())
    );
  const preferredFallbackIntent = fallbackIntentForSelection(selectionPlan.intentFamily);
  const repairedLeadText = leadNeedsRepair
    ? (workflowRepairText || repairSparseGeneratedTurn(
      effectiveQuestion,
      selectionPlan.intentFamily,
      leadId,
      selectionPlan.directResolution?.mentionedSpeakerId || selectionPlan.directResolution?.targetSpeakerId || ''
    ))
    : leadText;
  if ((diagnosticPrompt || ['pulse-critique', 'technical-diagnosis'].includes(String(selectionPlan.intentFamily || '').trim().toLowerCase())) && (leadNeedsRepair || !leadGeneration.ok)) {
    const forcedRoomResponse = legacyRoomFallbackResponse(
      effectiveQuestion,
      mode,
      system,
      preferredFallbackIntent ? { summary: '', intent: preferredFallbackIntent } : { summary: '' }
    );
    if (forcedRoomResponse) {
      const forcedCommitted = commitResponse(forcedRoomResponse, { effectiveQuestion, fallback: true, skipLegacyEnforcement: true });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(forcedCommitted.normalized),
        provider: 'studio',
        model: null,
        fallback: true,
        consciousRoom: true,
        providerCallCount: 0,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: forcedCommitted.relationshipUpdates,
        thread: forcedCommitted.thread,
        messages: forcedCommitted.messages,
        roomRuntime: forcedCommitted.roomRuntime
      }));
    }
  }
  if (roomVoicesPreferred && !leadGeneration.ok) {
    const roomResponse = legacyRoomFallbackResponse(effectiveQuestion, mode, system, preferredFallbackIntent ? { summary: '', intent: preferredFallbackIntent } : { summary: '' });
    if (roomResponse) {
      const roomCommitted = commitResponse(roomResponse, { effectiveQuestion, fallback: true, skipLegacyEnforcement: true });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(roomCommitted.normalized),
        provider: 'studio',
        model: null,
        fallback: true,
        consciousRoom: true,
        providerCallCount: 0,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: roomCommitted.relationshipUpdates,
        thread: roomCommitted.thread,
        messages: roomCommitted.messages,
        roomRuntime: roomCommitted.roomRuntime
      }));
    }
  }
  if (!leadGeneration.ok || !repairedLeadText) {
    const repairedFallbackText = workflowRepairText || repairSparseGeneratedTurn(
      effectiveQuestion,
      selectionPlan.intentFamily,
      leadId,
      selectionPlan.directResolution?.mentionedSpeakerId || selectionPlan.directResolution?.targetSpeakerId || ''
    );
    if (repairedFallbackText) {
      const repairedPeerText = shouldGeneratePeerReply(effectiveQuestion, selectionPlan, [])
        ? repairSparseGeneratedTurn(
          effectiveQuestion,
          selectionPlan.intentFamily,
          String(selectionPlan.peerSpeakerId || '').trim().toLowerCase(),
          leadId
        )
        : '';
      const repairedResponse = buildConsciousResponse({
        question: effectiveQuestion,
        system: selectionPlan.system,
        plan: selectionPlan,
        mainText: repairedFallbackText,
        peerText: repairedPeerText || '',
        sparkText: ''
      });
      const repairedCommitted = commitResponse(repairedResponse, { effectiveQuestion, selectionPlan, skipLegacyEnforcement: true, fallback: true });
      return res.json(pulsePayload({
        ok: true,
        mode,
        response: clientStudioResponse(repairedCommitted.normalized),
        provider: 'studio',
        model: null,
        fallback: true,
        consciousRoom: true,
        providerCallCount: 0,
        resolvedFromHistory: resolution.resolvedFromHistory,
        relationshipUpdates: repairedCommitted.relationshipUpdates,
        thread: repairedCommitted.thread,
        messages: repairedCommitted.messages,
        roomRuntime: repairedCommitted.roomRuntime
      }));
    }
    const response = legacyRoomFallbackResponse(effectiveQuestion, mode, system, preferredFallbackIntent ? { intent: preferredFallbackIntent } : {});
    const committed = commitResponse(response, { effectiveQuestion, fallback: true });
    return res.json(pulsePayload({ ok: true, mode, response: clientStudioResponse(committed.normalized), provider: 'studio', model: null, fallback: true, details: { error: leadGeneration.error || 'Provider failed for lead speaker.' }, resolvedFromHistory: resolution.resolvedFromHistory, relationshipUpdates: committed.relationshipUpdates, thread: committed.thread, messages: committed.messages, roomRuntime: committed.roomRuntime }));
  }

  let providerCallCount = 1;
  let peerSpeakerId = '';
  let peerText = '';
  const directMemberTargets = detectCharacterToCharacterAddress(leadGeneration.text).filter(id => id !== leadId);
  const plannedPeerCandidate = (
    ['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room'].includes(String(selectionPlan.intentFamily || '').trim().toLowerCase())
    || (['pulse-critique', 'technical-diagnosis'].includes(String(selectionPlan.intentFamily || '').trim().toLowerCase()) && COLLECTIVE_ROOM_RX.test(effectiveQuestion))
  )
    ? String(selectionPlan.peerSpeakerId || '').trim().toLowerCase()
    : '';
  const peerTargetId = shouldGeneratePeerReply(effectiveQuestion, selectionPlan, directMemberTargets) ? (resolvePeerReplyTarget(
    directMemberTargets,
    plannedPeerCandidate || selectionPlan.peerSpeakerId,
    leadId,
    selectionPlan.system,
    selectionPlan.scores
  ) || plannedPeerCandidate) : '';
  if (peerTargetId && providerCallCount < 3) {
    const peerSignals = selectionPlan.details?.[peerTargetId]?.signals || {};
    const peerPrompt = buildConsciousCharacterPrompt({
      speakerId: peerTargetId,
      question: effectiveQuestion,
      system: selectionPlan.system,
      selectionReason: 'peer-reply',
      impulse: peerSignals.topAutonomy || null,
      directTargetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || '',
      peerTargetSpeakerId: leadId,
      threadMode: mode,
      intentFamily: selectionPlan.intentFamily
    });
    const peerGeneration = await generateGeminiTextOnce(peerPrompt, providerConfig, {
      intentFamily: selectionPlan.intentFamily,
      selectionReason: 'peer-reply'
    });
    const normalizedPeerText = normalizeGeneratedTurn(peerGeneration.text, {
      intentFamily: selectionPlan.intentFamily,
      selectionReason: 'peer-reply'
    });
    const repairedPeerText = repairSparseGeneratedTurn(
      effectiveQuestion,
      selectionPlan.intentFamily,
      peerTargetId,
      leadId
    );
    if (peerGeneration.ok && normalizedPeerText && !shouldRepairGeneratedTurn(effectiveQuestion, selectionPlan.intentFamily, normalizedPeerText)) {
      providerCallCount += 1;
      peerSpeakerId = peerTargetId;
      peerText = normalizedPeerText;
    } else if (repairedPeerText) {
      peerSpeakerId = peerTargetId;
      peerText = repairedPeerText;
    }
  }

  let sparkText = '';
  if (selectionPlan.sparkSpeakerId && Number(selectionPlan.sparkPriority || 0) >= 0.65 && providerCallCount < 3) {
    const sparkSignals = selectionPlan.details?.[selectionPlan.sparkSpeakerId]?.signals || {};
    const sparkPrompt = buildConsciousCharacterPrompt({
      speakerId: selectionPlan.sparkSpeakerId,
      question: effectiveQuestion,
      system: selectionPlan.system,
      selectionReason: 'spark',
      impulse: sparkSignals.topAutonomy || {
        speakerId: selectionPlan.sparkSpeakerId,
        type: 'callback',
        topicAnchor: selectionPlan.system.personhood?.holding?.[selectionPlan.sparkSpeakerId]?.topicAnchor || selectionPlan.activeTopicTags?.[0] || 'room'
      },
      directTargetSpeakerId: selectionPlan.directResolution?.targetSpeakerId || '',
      peerTargetSpeakerId: '',
      threadMode: mode,
      intentFamily: 'spark-aside'
    });
    const sparkGeneration = await generateGeminiTextOnce(sparkPrompt, providerConfig, {
      intentFamily: 'spark-aside',
      selectionReason: 'spark'
    });
    const normalizedSparkText = normalizeGeneratedTurn(sparkGeneration.text, {
      intentFamily: 'spark-aside',
      selectionReason: 'spark'
    });
    if (sparkGeneration.ok && normalizedSparkText) {
      providerCallCount += 1;
      sparkText = normalizedSparkText;
    }
  }

  const response = buildConsciousResponse({
    question: effectiveQuestion,
    system: selectionPlan.system,
    plan: {
      ...selectionPlan,
      peerSpeakerId
    },
    mainText: repairedLeadText,
    peerText,
    sparkText
  });
  const committed = commitResponse(response, { effectiveQuestion, selectionPlan, skipLegacyEnforcement: true });
  return res.json(pulsePayload({
    ok: true,
    mode,
    response: clientStudioResponse(committed.normalized),
    provider: 'gemini',
    model: leadGeneration.model,
    keyLabel: leadGeneration.keyLabel,
    fallback: false,
    consciousRoom: true,
    providerCallCount,
    resolvedFromHistory: resolution.resolvedFromHistory,
    relationshipUpdates: committed.relationshipUpdates,
    thread: committed.thread,
    messages: committed.messages,
    roomRuntime: committed.roomRuntime
  }));
});

async function handlePulseIdle(req, res) {
  try {
    const body = req.body || {};
    let threadId = String(body.threadId || '').trim();
    const manual = body.manual === true || body.forceVisible === true || String(body.source || '').trim() === 'spark-button';
    const mode = String(body.mode || 'direction').trim() || 'direction';
    const includeInContext = body.includeInContext !== false;
    const debugRoomRuntime = body.debug === true || String(req.query?.debug || '').trim() === '1';
    if (HARD_CUT_REBUILD) {
      if (manual && !threadId) {
        const ensuredThread = ensurePulseThread({
          threadId: '',
          title: String(body.threadTitle || body.title || 'Open room').trim() || 'Open room',
          mode,
          includeInContext
        });
        if (ensuredThread?.id) {
          threadId = String(ensuredThread.id || '').trim();
          body.threadId = threadId;
        }
      }
      const { system, activeThread } = buildPulseSystemFromRequest(req);
      const providerConfig = system.providerSettings || {};
      const sparkPlan = planConsciousSpark(system);
      const quietPayload = quietRoomResult();
      if (!sparkPlan.shouldSurface || !sparkPlan.impulse) {
        return res.json({
          ok: true,
          mode,
          response: quietPayload.response,
          spark: false,
          manualSpark: manual,
          provider: quietPayload.provider,
          model: quietPayload.model,
          fallback: quietPayload.fallback,
          lane: quietPayload.lane,
          intentFamily: quietPayload.intentFamily,
          targetSpeakerId: quietPayload.targetSpeakerId,
          activeSpeakers: quietPayload.activeSpeakers,
          memoryAnchors: quietPayload.memoryAnchors,
          workflowContext: null,
          thread: clientStudioThread(activeThread, { debug: debugRoomRuntime }),
          messages: clientThreadMessages(system.currentThreadMessages || [], 48),
          attachments: threadId ? listThreadAttachments(threadId) : [],
          workflows: [],
          workflowDraft: null,
          commitCard: null
        });
      }

      const sparkSpeakerId = String(sparkPlan.speakerId || 'aisha').trim().toLowerCase() || 'aisha';
      const sparkPrompt = buildConsciousCharacterPrompt({
        speakerId: sparkSpeakerId,
        question: String(sparkPlan.impulse?.topicAnchor || sparkPlan.contract?.activeTopic || 'room'),
        system: sparkPlan.system,
        selectionReason: 'autonomous-impulse',
        impulse: sparkPlan.impulse,
        directTargetSpeakerId: '',
        peerTargetSpeakerId: '',
        threadMode: mode,
        intentFamily: 'spark-aside',
        plan: sparkPlan,
        lane: 'spark',
        isSpark: true,
        responseFormat: 'json'
      });
      const sparkGeneration = await generateGeminiTextOnce(sparkPrompt, providerConfig, {
        intentFamily: 'spark-aside',
        selectionReason: manual ? 'manual-spark' : 'spark',
        speakerId: sparkSpeakerId
      });
      const sparkTurn = parseGeneratedCharacterTurn(sparkGeneration.text, {
        intentFamily: 'spark-aside',
        selectionReason: 'spark'
      });
      const sparkValidation = roomTurnValidationFailure(sparkTurn.text, {
        lane: 'spark',
        intentFamily: 'spark-aside',
        speakerId: sparkSpeakerId
      });
      if (!sparkGeneration.ok || !sparkTurn.text || sparkValidation) {
        if (!manual) {
          return res.json({
            ok: true,
            mode,
            response: quietPayload.response,
            spark: false,
            manualSpark: false,
            provider: quietPayload.provider,
            model: quietPayload.model,
            fallback: quietPayload.fallback,
            lane: quietPayload.lane,
            intentFamily: quietPayload.intentFamily,
            targetSpeakerId: quietPayload.targetSpeakerId,
            activeSpeakers: quietPayload.activeSpeakers,
            memoryAnchors: quietPayload.memoryAnchors,
            workflowContext: null,
            thread: clientStudioThread(activeThread, { debug: debugRoomRuntime }),
            messages: clientThreadMessages(system.currentThreadMessages || [], 48),
            attachments: threadId ? listThreadAttachments(threadId) : [],
            workflows: [],
            workflowDraft: null,
            commitCard: null
          });
        }
        const outage = outageResponse('spark-timeout');
        const normalizedOutage = fallbackEnvelopeToStudioResponse(outage, system, '', {
          intentFamily: 'spark-outage',
          selectionReason: 'spark-outage'
        });
        const threadStore = storeStudioThreadConversation({
          threadId,
          title: String(activeThread?.title || body.threadTitle || 'Open room').trim() || 'Open room',
          status: 'active',
          includeInContext,
          question: '',
          directTarget: '',
          mode,
          response: normalizedOutage,
          threadMeta: {
            ...(activeThread?.meta || {})
          }
        });
        return res.json({
          ok: true,
          mode,
          response: clientStudioResponse(normalizedOutage),
          provider: outage.provider,
          model: outage.model,
          fallback: true,
          spark: false,
          manualSpark: true,
          thread: clientStudioThread(threadStore.thread, { debug: debugRoomRuntime }),
          messages: clientThreadMessages(threadStore.messages, 48),
          attachments: listThreadAttachments(String(threadStore.thread?.id || threadId || '')),
          workflows: [],
          workflowDraft: null,
          commitCard: null
        });
      }

      const normalized = normalizeCouncilResponse({
        title: 'Room spark',
        summary: '',
        departmentLead: sparkSpeakerId,
        messageEvents: [
          {
            speakerId: sparkSpeakerId,
            ...speakerMeta(system, sparkSpeakerId),
            kind: 'spark',
            text: sparkTurn.text,
            tone: toneForSpeaker(system, sparkSpeakerId, 'ambient'),
            delayMs: 0,
            replyToId: '',
            emotionalState: sparkTurn.emotionalState || String(system.liveState?.[sparkSpeakerId]?.currentMood || ''),
            visible: true,
            saveToArchive: true,
            metadata: {
              autonomousImpulseId: sparkPlan.impulse?.id || '',
              sparkScore: sparkPlan.priority
            }
          }
        ],
        threadMeta: {
          responsePattern: 'spark-aside',
          intent: manual ? 'manual-spark' : 'spark-aside',
          activeTopicTags: sparkPlan.contract?.activeTopicTags || [],
          lastTargetedSpeaker: sparkPlan.contract?.lastTargetedSpeaker || '',
          lastActiveSpeakers: [sparkSpeakerId],
          lastRoomEnergy: sparkPlan.contract?.lastRoomEnergy || 'reactive',
          consumedAutonomyIds: [sparkPlan.impulse?.id].filter(Boolean),
          sparkIntent: manual ? 'manual-spark' : 'spark-aside'
        },
        archiveMeta: { saveSuggested: true, includeInContext: true },
        actions: [],
        consistencyChecks: [],
        suggestedAssets: [],
        promptIdeas: [],
        relationshipDeltas: []
      }, system);
      const relationshipUpdates = applyRelationshipDeltas(normalized.relationshipDeltas || []);
      let threadStore = storeStudioThreadConversation({
        threadId,
        title: String(activeThread?.title || body.threadTitle || 'Open room').trim() || 'Open room',
        status: String(activeThread?.status || 'active'),
        includeInContext,
        question: '',
        directTarget: '',
        mode,
        response: normalized,
        threadMeta: {
          ...(activeThread?.meta || {}),
          lastSparkAt: new Date().toISOString(),
          sparkSpeakers: [sparkSpeakerId],
          sparkTopicTags: Array.isArray(normalized.threadMeta?.activeTopicTags) ? normalized.threadMeta.activeTopicTags.filter(Boolean) : ['room'],
          sparkIntent: manual ? 'manual-spark' : 'spark-aside'
        }
      });
      const runtimeTurn = captureRoomRuntimeTurn({
        system: {
          ...system,
          currentThread: threadStore.thread,
          currentThreadMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark'),
          currentThreadSparkMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() === 'spark')
        },
        thread: threadStore.thread,
        response: normalized,
        question: '',
        messages: threadStore.messages,
        spark: true
      });
      if (runtimeTurn?.threadMetaPatch && threadStore.thread?.id) {
        const patchedThread = patchStudioThread(threadStore.thread.id, {
          meta: {
            ...(threadStore.thread.meta || {}),
            ...runtimeTurn.threadMetaPatch,
            roomRuntimeState: {
              conversationContract: runtimeTurn.conversationContract || null,
              personhood: runtimeTurn.personhood || null
            }
          }
        });
        if (patchedThread) threadStore = { ...threadStore, thread: patchedThread };
      }
      return res.json({
        ok: true,
        mode,
        response: clientStudioResponse(normalized),
        provider: sparkGeneration.provider || 'gemini',
        model: sparkGeneration.model || null,
        fallback: false,
        spark: true,
        manualSpark: manual,
        providerCallCount: 1,
        lane: 'spark',
        intentFamily: 'spark-aside',
        targetSpeakerId: sparkSpeakerId,
        activeSpeakers: [sparkSpeakerId],
        memoryAnchors: [sparkPlan.impulse?.topicAnchor].filter(Boolean),
        workflowContext: null,
        relationshipUpdates,
        thread: clientStudioThread(threadStore.thread, { debug: debugRoomRuntime }),
        messages: clientThreadMessages(threadStore.messages, 48),
        roomRuntime: clientRoomRuntimePayload(runtimeTurn, {
          debug: debugRoomRuntime,
          workflow: null
        }),
        attachments: listThreadAttachments(String(threadStore.thread?.id || threadId || '')),
        workflows: [],
        workflowDraft: null,
        commitCard: null
      });
    }
    if (manual) {
      const ensuredThread = ensurePulseThread({
        threadId,
        title: String(body.threadTitle || body.title || 'Open room').trim() || 'Open room',
        mode,
        includeInContext
      });
      if (ensuredThread?.id) {
        threadId = String(ensuredThread.id || '').trim();
        body.threadId = threadId;
      }
    }
    const { system, activeThread } = buildPulseSystemFromRequest(req);
    const threadAttachments = threadId ? listThreadAttachments(threadId) : [];
    const threadWorkflows = threadId ? listThreadWorkflows(threadId) : [];
    const activeWorkflow = system.currentWorkflowDraft
      || threadWorkflows.find(item => !['committed', 'commit_failed'].includes(String(item?.status || '').trim().toLowerCase()))
      || null;
    const activeCommitCard = activeWorkflow ? buildCommitCard(activeWorkflow) : null;
    const providerConfig = system.providerSettings || {};
    const sparkPlan = planConsciousSpark(system);
    if (!sparkPlan.shouldSurface) {
      if (manual) {
        const forcedSpeakerId = String(
          sparkPlan.speakerId
          || activeThread?.meta?.lastTargetedSpeaker
          || (Array.isArray(activeThread?.meta?.lastActiveSpeakers) ? activeThread.meta.lastActiveSpeakers[0] : '')
          || 'aisha'
        ).trim().toLowerCase() || 'aisha';
        const forcedTopic = compact(
          sparkPlan.contract?.activeOpenThread?.summary
          || sparkPlan.contract?.activeTopic
          || activeThread?.title
          || 'Open room',
          160
        ) || 'Open room';
        const forcedImpulse = sparkPlan.impulse || {
          speakerId: forcedSpeakerId,
          type: 'manual-spark',
          topicAnchor: forcedTopic
        };
        const sparkPrompt = buildConsciousCharacterPrompt({
          speakerId: forcedSpeakerId,
          question: forcedTopic || 'The room is awake. Surface what wants to be said next.',
          system: sparkPlan.system || system,
          selectionReason: 'manual-spark',
          impulse: forcedImpulse,
          directTargetSpeakerId: '',
          peerTargetSpeakerId: '',
          threadMode: mode,
          intentFamily: 'spark-aside'
        });
        const sparkGeneration = await generateGeminiTextOnce(sparkPrompt, providerConfig, {
          intentFamily: 'spark-aside',
          selectionReason: 'manual-spark'
        });
        const sparkText = sparkGeneration.ok && sparkGeneration.text
          ? normalizeGeneratedTurn(sparkGeneration.text, { intentFamily: 'spark-aside', selectionReason: 'manual-spark' })
          : cleanGeneratedLine(legacySparkRoomResponse(system, body)?.messageEvents?.[0]?.text || 'The room is awake. Say the real thing and we can move.');
        const normalized = normalizeCouncilResponse({
          title: 'Room spark',
          summary: '',
          departmentLead: forcedSpeakerId,
          messageEvents: [
            {
              speakerId: forcedSpeakerId,
              ...speakerMeta(system, forcedSpeakerId),
              kind: 'spark',
              text: sparkText,
              tone: toneForSpeaker(system, forcedSpeakerId, 'ambient'),
              delayMs: 0,
              replyToId: '',
              emotionalState: String(system.liveState?.[forcedSpeakerId]?.currentMood || ''),
              visible: true,
              saveToArchive: true
            }
          ],
          threadMeta: {
            responsePattern: 'spark-aside',
            intent: 'manual-spark',
            activeTopicTags: sparkPlan.contract?.activeTopicTags || ['room'],
            lastTargetedSpeaker: sparkPlan.contract?.lastTargetedSpeaker || '',
            lastActiveSpeakers: [forcedSpeakerId],
            lastRoomEnergy: sparkPlan.contract?.lastRoomEnergy || 'awake',
            consumedAutonomyIds: [forcedImpulse?.id].filter(Boolean),
            sparkIntent: 'manual-spark'
          },
          archiveMeta: { saveSuggested: true, includeInContext: true },
          actions: [],
          consistencyChecks: [],
          suggestedAssets: [],
          promptIdeas: [],
          relationshipDeltas: []
        }, system);
        const relationshipUpdates = applyRelationshipDeltas(normalized.relationshipDeltas || []);
        let threadStore = storeStudioThreadConversation({
          threadId: threadId || normalized.threadMeta?.id || '',
          title: String(activeThread?.title || normalized.threadMeta?.title || 'Open room').trim(),
          status: String(activeThread?.status || 'active'),
          includeInContext,
          question: '',
          directTarget: '',
          mode,
          response: normalized,
          threadMeta: {
            ...(activeThread?.meta || {}),
            lastSparkAt: new Date().toISOString(),
            sparkSpeakers: [forcedSpeakerId],
            sparkTopicTags: Array.isArray(normalized.threadMeta?.activeTopicTags) ? normalized.threadMeta.activeTopicTags.filter(Boolean) : ['room'],
            sparkIntent: 'manual-spark'
          }
        });
        const runtimeTurn = captureRoomRuntimeTurn({
          system: {
            ...system,
            currentThread: threadStore.thread,
            currentThreadMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark'),
            currentThreadSparkMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() === 'spark')
          },
          thread: threadStore.thread,
          response: normalized,
          question: '',
          messages: threadStore.messages,
          spark: true
        });
        return res.json({
          ok: true,
          mode,
          response: clientStudioResponse(normalized),
          provider: sparkGeneration.ok ? sparkGeneration.provider : 'studio',
          model: sparkGeneration.ok ? sparkGeneration.model : null,
          fallback: !sparkGeneration.ok,
          spark: true,
          manualSpark: true,
          relationshipUpdates,
          thread: clientStudioThread(threadStore.thread, { debug: debugRoomRuntime }),
          messages: clientThreadMessages(threadStore.messages, 48),
          roomRuntime: clientRoomRuntimePayload(runtimeTurn, {
            debug: debugRoomRuntime,
            workflow: compactWorkflowRuntime(activeWorkflow, activeCommitCard)
          }),
          attachments: listThreadAttachments(String(threadStore.thread?.id || threadId || '')),
          workflows: listThreadWorkflows(String(threadStore.thread?.id || threadId || '')),
          workflowDraft: activeWorkflow,
          commitCard: activeCommitCard
        });
      }
      return res.json({
        ok: true,
        response: null,
        thread: clientStudioThread(activeThread, { debug: debugRoomRuntime }),
        messages: clientThreadMessages(system.currentThreadMessages || [], 48),
        attachments: threadAttachments,
        workflows: threadWorkflows,
        workflowDraft: activeWorkflow,
        commitCard: activeCommitCard
      });
    }
    const sparkSelectionReason = manual ? 'manual-spark' : 'spark';
    const sparkSpeakerId = String(sparkPlan.speakerId || 'aisha').trim().toLowerCase() || 'aisha';
    const sparkPrompt = buildConsciousCharacterPrompt({
      speakerId: sparkSpeakerId,
      question: String(sparkPlan.contract?.activeOpenThread?.summary || sparkPlan.contract?.activeTopic || 'The room has a side thought.'),
      system: sparkPlan.system,
      selectionReason: sparkSelectionReason,
      impulse: sparkPlan.impulse,
      directTargetSpeakerId: '',
      peerTargetSpeakerId: '',
      threadMode: mode,
      intentFamily: 'spark-aside'
    });
    const sparkGeneration = await generateGeminiTextOnce(sparkPrompt, providerConfig, {
      intentFamily: 'spark-aside',
      selectionReason: sparkSelectionReason
    });
    const sparkText = sparkGeneration.ok && sparkGeneration.text
      ? normalizeGeneratedTurn(sparkGeneration.text, { intentFamily: 'spark-aside', selectionReason: sparkSelectionReason })
      : cleanGeneratedLine(legacySparkRoomResponse(system, body)?.messageEvents?.[0]?.text || '');
    if (!sparkText) {
      return res.json({
        ok: true,
        response: null,
        thread: clientStudioThread(activeThread, { debug: debugRoomRuntime }),
        messages: clientThreadMessages(system.currentThreadMessages || [], 48)
      });
    }
    const normalized = normalizeCouncilResponse({
      title: 'Room spark',
      summary: '',
      departmentLead: sparkSpeakerId,
      messageEvents: [
        {
          speakerId: sparkSpeakerId,
          ...speakerMeta(system, sparkSpeakerId),
          kind: 'spark',
          text: sparkText,
          tone: toneForSpeaker(system, sparkSpeakerId, 'ambient'),
          delayMs: 0,
          replyToId: '',
          emotionalState: String(system.liveState?.[sparkSpeakerId]?.currentMood || ''),
          visible: true,
          saveToArchive: true
        }
      ],
      threadMeta: {
        responsePattern: 'spark-aside',
        intent: manual ? 'manual-spark' : 'spark-aside',
        activeTopicTags: sparkPlan.contract?.activeTopicTags || [],
        lastTargetedSpeaker: sparkPlan.contract?.lastTargetedSpeaker || '',
        lastActiveSpeakers: [sparkSpeakerId],
        lastRoomEnergy: sparkPlan.contract?.lastRoomEnergy || 'reactive',
        consumedAutonomyIds: [sparkPlan.impulse?.id].filter(Boolean),
        sparkIntent: manual ? 'manual-spark' : 'spark-aside'
      },
      archiveMeta: { saveSuggested: true, includeInContext: true },
      actions: [],
      consistencyChecks: [],
      suggestedAssets: [],
      promptIdeas: [],
      relationshipDeltas: []
    }, system);
    const relationshipUpdates = applyRelationshipDeltas(normalized.relationshipDeltas || []);
    const directTarget = String(activeThread?.meta?.lastTargetedSpeaker || normalized.threadMeta?.lastTargetedSpeaker || '').trim().toLowerCase();
    const sparkSpeakers = (Array.isArray(normalized.messageEvents) ? normalized.messageEvents : [])
      .map(item => String(item?.speakerId || '').trim().toLowerCase())
      .filter(Boolean);
    const sparkTags = Array.isArray(normalized.threadMeta?.activeTopicTags) ? normalized.threadMeta.activeTopicTags.filter(Boolean) : [];
    let threadStore = storeStudioThreadConversation({
      threadId: threadId || normalized.threadMeta?.id || '',
      title: String(activeThread?.title || normalized.threadMeta?.title || 'Open room').trim(),
      status: String(activeThread?.status || 'active'),
      includeInContext,
      question: '',
      directTarget,
      mode,
      response: normalized,
      threadMeta: {
        ...(activeThread?.meta || {}),
        lastTargetedSpeaker: directTarget,
        lastSparkAt: new Date().toISOString(),
        sparkSpeakers,
        sparkTopicTags: sparkTags,
        sparkIntent: String(normalized.threadMeta?.intent || 'ambient-spark').trim(),
        lastRoomEnergy: String(activeThread?.meta?.lastRoomEnergy || normalized.threadMeta?.lastRoomEnergy || '').trim(),
        lastOpenLoop: String(activeThread?.meta?.lastOpenLoop || normalized.threadMeta?.lastOpenLoop || '').trim()
      }
    });
    const runtimeTurn = captureRoomRuntimeTurn({
      system: {
        ...system,
        currentThread: threadStore.thread,
        currentThreadMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() !== 'spark'),
        currentThreadSparkMessages: threadStore.messages.filter(item => String(item?.kind || '').toLowerCase() === 'spark')
      },
      thread: threadStore.thread,
      response: normalized,
      question: '',
      messages: threadStore.messages,
      spark: true
    });
    if (runtimeTurn?.threadMetaPatch && threadStore.thread?.id) {
      const patchedThread = patchStudioThread(threadStore.thread.id, {
        meta: {
          ...(threadStore.thread.meta || {}),
          ...runtimeTurn.threadMetaPatch
        }
      });
      if (patchedThread) threadStore = { ...threadStore, thread: patchedThread };
    }
    return res.json({
      ok: true,
      mode,
      response: clientStudioResponse(normalized),
      provider: 'studio',
      model: null,
      fallback: false,
      spark: true,
      manualSpark: manual,
      relationshipUpdates,
      thread: clientStudioThread(threadStore.thread, { debug: debugRoomRuntime }),
      messages: clientThreadMessages(threadStore.messages, 48),
      roomRuntime: clientRoomRuntimePayload(runtimeTurn, {
        debug: debugRoomRuntime,
        workflow: compactWorkflowRuntime(activeWorkflow, activeCommitCard)
      }),
      attachments: listThreadAttachments(String(threadStore.thread?.id || threadId || '')),
      workflows: listThreadWorkflows(String(threadStore.thread?.id || threadId || '')),
      workflowDraft: activeWorkflow,
      commitCard: activeCommitCard
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}

router.post('/pulse/spark', handlePulseIdle);
router.post('/pulse/idle-tick', handlePulseIdle);

module.exports = router;
