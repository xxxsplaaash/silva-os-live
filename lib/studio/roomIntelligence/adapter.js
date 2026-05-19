const { CHARACTER_IDS, CHARACTER_PROFILES, characterDisplayName, characterRole } = require('./characters');
const { assistantFillerReason, literalConsciousnessReason } = require('./dialogueQuality');

const FORBIDDEN_NON_META_RX = /\b(labels are not presence|assistant cosplay|architecture|implementation|selection|validation|generation|presence system|room intelligence|real room has rhythm)\b/i;
const GENERIC_ASSISTANT_RX = /\b(as an ai|as a language model|ai language model|i am an ai|i'?m an ai|how can i assist|how may i assist|how can i help|i(?:'|’)?m here to help with|i am here to help with)\b/i;
const INTERNAL_METADATA_RX = /\b(speakerId|responseIntent|roomStateDelta|emotionalDelta|memoryCandidate|roomIntent|providerMode|validationFallbackReason|engineMode|aishaEngineConnected|roomIntelligenceV0)\b|```json|\{[\s\S]*"speakerId"/i;
const UNPLANNED_GROUP_VOICE_RX = /\b(we all|all of us|all five|everyone here|everyone in the room|the whole room|speaking for everyone)\b.*\b(think|agree|feel|know|say|are|is)\b/i;
const BAD_VISIBLE_FALLBACK_RX = /\b(I hear |I will keep this human|Say the thing plainly|Give me the thing|I need the object|if that is the object|the actual break)\b/i;
const PLACEHOLDER_OPEN_FLOOR_RX = /\b(Room read on that|Taste read:\s*if|Delivery read:\s*that|Diagnostic read:\s*I am checking whether that|hold the useful signal on that)\b/i;
const UNSUPPORTED_THAT_RX = /\b(on that:|that is the object|if that|the object)\b/i;

function compact(value = '', max = 320) {
  const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function fallbackSubject(perception = {}) {
  const topic = String(perception.topicFocus || '').trim();
  const raw = topic && topic !== 'that' ? topic : String(perception.originalText || perception.text || '').trim();
  const cleaned = raw
    .replace(/^\s*(aisha|vanya|leah|claudia|grok|gerhard)\s*[,:\-]\s*/i, '')
    .replace(/\bnex\s+t\b/ig, 'next')
    .replace(/^why\s+does\s+this\s+keep\b/i, 'this keeps')
    .replace(/^what\s+is\s+(?:the\s+)?actual\s+/i, 'the ')
    .replace(/^what\s+is\s+/i, '')
    .replace(/^(why|how)\s+/i, '')
    .replace(/\b(can you|could you|please|really)\b/gi, '')
    .replace(/^(is|does|do|did|can|could|should)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;:]+$/g, '')
    .trim();
  return compact(cleaned || 'the failure in front of us', 92);
}

function normalizedLine(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function visibleFallbackQualityIssue(content = '', perception = {}, options = {}) {
  const text = String(content || '').trim();
  if (!text) return 'empty-fallback';
  if (BAD_VISIBLE_FALLBACK_RX.test(text)) return 'banned-fallback-phrase';
  if (PLACEHOLDER_OPEN_FLOOR_RX.test(text)) return 'open-floor-placeholder';
  if (GENERIC_ASSISTANT_RX.test(text) || assistantFillerReason(text)) return 'generic-assistant-filler';
  const topic = String(perception.topicFocus || '').trim();
  if ((!topic || topic === 'that') && UNSUPPORTED_THAT_RX.test(text)) return 'unsupported-placeholder-referent';
  const original = normalizedLine(perception.originalText || perception.text || '');
  if (original && original.length >= 8) {
    const currentText = normalizedLine(text);
    if (currentText === original || currentText.startsWith(`${original}.`) || currentText.startsWith(`${original},`)) {
      return 'raw-prompt-stuffing';
    }
  }
  const recentTurns = Array.isArray(options.recentTurns) ? options.recentTurns : [];
  const current = normalizedLine(text);
  if (current && recentTurns.some(item => {
    const prior = normalizedLine(item?.content || item?.text || item?.message || '');
    return prior && prior === current;
  })) return 'repeated-fallback-line';
  return '';
}

function deterministicTurnFromStep(step = {}) {
  return {
    speakerId: String(step.speakerId || '').toLowerCase(),
    content: String(step.deterministicText || '').trim(),
    responseIntent: String(step.responseIntent || ''),
    emotionalDelta: step.emotionalDelta || {},
    roomStateDelta: step.roomStateDelta || {},
    memoryCandidate: step.memoryCandidate || null,
    trace: String(step.reason || 'deterministic'),
    source: 'deterministic-fallback',
    providerMode: 'deterministic-fallback',
    validationFallbackReason: '',
    stepIndex: Number.isInteger(step.stepIndex) ? step.stepIndex : undefined,
    exchangeMode: String(step.exchangeMode || ''),
    exchangeRole: String(step.exchangeRole || ''),
    exchangeLabel: safeExchangeLabel(step.exchangeMode, step.exchangeRole)
  };
}

function fallbackLineForSpeaker(speakerId = '', perception = {}) {
  const text = String(perception.originalText || perception.text || '').trim();
  const subject = fallbackSubject(perception);
  const previous = String(perception.previousQuestion || '').trim();
  if (/^(what|what\?|huh|wait what)\s*[?.!]*$/i.test(text)) {
    if (/\b(highest|valuable|next move|next most valuable|move)\b/i.test(previous)) {
      return 'I mean the next move is verification, not another layer. The room is showing fallback behavior, so we fix the live seam before adding anything else.';
    }
    return 'I mean we should narrow the subject first: decision, bug, creative piece, or next move. Then the room can answer without guessing.';
  }
  if (/\b(nex\s*t|next).{0,24}\b(highest|valuable|value|move)\b|\b(highest|most).{0,24}\bvaluable.{0,24}\bmove\b/i.test(text)) {
    return 'The highest-value move is not another feature. It is a clean live feel-pass with A.I.S.H.A connected or honestly degraded, then one narrow fix for the first thing that breaks the illusion.';
  }
  if (/\b(hungry|lunch|dinner|snack|coffee|chit\s*chat|banter)\b/i.test(text)) {
    return 'Mostly, yes. Also, I am voting food, Grok will pretend not to care, and Claudia would like us to choose before this becomes a scheduling problem.';
  }
  if (/\bless stiff\b|\bmake this\b.*\bstiff\b|\bnot so stiff\b/i.test(text)) {
    return 'Keep the shape, lose the stiffness: say it like a person with a point, not a caption trying to pass inspection.';
  }
  if (/\bcampaign\b/i.test(text) || perception.taskType === 'planning') {
    return `Start with ${subject}: name the outcome, owner, deadline, and the next action that can be checked. Then cut anything that is not helping the work move.`;
  }
  if (/\blogo\b/i.test(text)) {
    if (speakerId === 'leah') return 'Show me the logo and I will tell you if it has taste or just decoration.';
    if (speakerId === 'claudia') return 'For the logo, I want to see it in use: avatar, header, invoice, and one social post.';
    if (speakerId === 'grok') return 'Show me the logo. I want to know if the silhouette still works when it is tiny.';
    if (speakerId === 'aisha') return 'Show me the logo and I will check whether it reads clearly before it tries to be clever.';
    return 'Send the logo through. I want to see if people would actually remember it after one glance.';
  }
  if (speakerId === 'aisha') return `I have the frame: ${subject}. Keep it narrow, decide what matters, and do not let the room drift into performance.`;
  if (speakerId === 'leah') return `If the issue is ${subject}, the answer cannot be another polished status paragraph. Find the weak taste call, name it, and make the work less bland.`;
  if (speakerId === 'claudia') {
    const lead = /\b(next\s+fix|actual\s+next\s+fix)\b/i.test(subject) ? 'Next fix' : `Next fix for ${subject}`;
    return `${lead}: pick the owner, define the failing checkpoint, and make the next action small enough to verify before anyone adds more scope.`;
  }
  if (speakerId === 'grok') return `The failure is already visible: ${subject}. Capture the exact turn where it breaks, compare the request state to the response events, and patch that seam first.`;
  return 'Let us keep the degraded mode useful: name the decision, bug, creative piece, or next move, and I will land the response without turning the room into a template.';
}

function safeFallbackLineForSpeaker(speakerId = '') {
  if (speakerId === 'aisha') return 'One clean frame: choose the subject, then keep the answer narrow enough to act on.';
  if (speakerId === 'leah') return 'Bring the creative piece into view and I will judge the taste, not the fog around it.';
  if (speakerId === 'claudia') return 'Name the decision or constraint and I will turn it into the next accountable move.';
  if (speakerId === 'grok') return 'Name the failure path and I will diagnose the seam that is actually breaking.';
  return 'Give the room a decision, bug, creative piece, or next move, and I will keep the fallback useful instead of generic.';
}

function repairFallbackTurnContent(content = '', { speakerId = '', perception = {}, options = {} } = {}) {
  if (!visibleFallbackQualityIssue(content, perception, options)) return String(content || '').trim();
  const repaired = fallbackLineForSpeaker(speakerId, perception);
  if (!visibleFallbackQualityIssue(repaired, perception, options)) return repaired;
  return safeFallbackLineForSpeaker(speakerId);
}

function fallbackTurnFromStep(step = {}, perception = {}, options = {}) {
  const speakerId = String(step.speakerId || '').toLowerCase();
  const source = String(options.providerMode || options.source || 'natural-fallback').trim() || 'natural-fallback';
  const validationFallbackReason = String(options.validationFallbackReason || options.reason || '').trim();
  const plannedContent = String(step.fallbackText || step.deterministicText || fallbackLineForSpeaker(speakerId, perception)).trim();
  return {
    speakerId,
    content: repairFallbackTurnContent(plannedContent, { speakerId, perception, options }),
    responseIntent: String(step.responseIntent || 'message'),
    emotionalDelta: step.emotionalDelta || {},
    roomStateDelta: step.roomStateDelta || {},
    memoryCandidate: step.memoryCandidate || null,
    trace: `natural-fallback:${validationFallbackReason || step.reason || 'planned-turn'}`,
    source,
    providerMode: source,
    validationFallbackReason,
    stepIndex: Number.isInteger(step.stepIndex) ? step.stepIndex : undefined,
    exchangeMode: String(step.exchangeMode || ''),
    exchangeRole: String(step.exchangeRole || ''),
    exchangeLabel: safeExchangeLabel(step.exchangeMode, step.exchangeRole)
  };
}

function safeExchangeLabel(exchangeMode = '', exchangeRole = '') {
  const mode = String(exchangeMode || '').trim();
  const role = String(exchangeRole || '').trim();
  if (role === 'command-close') return 'Close';
  if (mode === 'open-floor') return 'Open Floor';
  if (role === 'addendum') return 'Adds';
  return '';
}

function roomStateBrief(roomState = {}) {
  const presence = roomState.knownPresenceStatus || {};
  return [
    `mood=${roomState.roomMood || 'steady'}`,
    `topic=${roomState.currentTopic || 'none'}`,
    `lastSpeaker=${roomState.lastSpeakerId || 'none'}`,
    `presence=${Object.entries(presence).map(([id, status]) => `${id}:${status}`).join(', ')}`
  ].join('; ');
}

function recentMessagesBrief(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-10)
    .map(item => `${item.speakerId || item.speaker_id || 'unknown'}: ${compact(item.text || '', 180)}`)
    .join('\n') || 'none';
}

function buildRoomCharacterPrompt({
  step = {},
  roomState = {},
  perception = {},
  recentMessages = []
} = {}) {
  const speakerId = String(step.speakerId || '').toLowerCase();
  const profile = CHARACTER_PROFILES[speakerId] || {};
  const characterState = roomState.characterStates?.[speakerId] || {};
  return [
    `You are ${profile.displayName || speakerId}.`,
    `Room role: ${profile.roleInRoom || 'Studio Pulse participant'}.`,
    `Core voice: ${profile.coreVoice || 'distinct, in-character, concise'}.`,
    `Emotional baseline: ${profile.emotionalBaseline || 'steady'}.`,
    `Default drives: ${(profile.defaultDrives || []).join(', ') || 'none'}.`,
    `Boundaries: ${(profile.boundaries || []).join(', ') || 'none'}.`,
    `Relationship to user: ${profile.relationshipToUser || 'present and useful'}.`,
    `Speaking rules: ${(profile.speakingStyleRules || []).join('; ') || 'first person, concise'}.`,
    `Do not do: ${(profile.responseDoNotDos || []).join('; ') || 'do not sound generic'}.`,
    `Your current state: presence=${characterState.presence || 'unknown'}; mood=${characterState.mood || 'steady'}; attention=${characterState.attention}; warmth=${characterState.warmth}; irritation=${characterState.irritation}; energy=${characterState.energy}; intent=${characterState.currentIntent || 'message'}.`,
    `Room state: ${roomStateBrief(roomState)}.`,
    `Why you speak now: ${step.reason || 'planned room turn'}.`,
    `Response intent: ${step.responseIntent || 'message'}.`,
    `Exchange mode: ${step.exchangeMode || 'solo'}.`,
    `Exchange role: ${step.exchangeRole || 'primary'}.`,
    step.exchangeRole === 'addendum'
      ? `Addendum constraint: ${step.addendumConstraint || 'one short non-repeating side note only'}`
      : '',
    step.exchangeRole === 'command-close'
      ? 'Command close constraint: one concise Aisha close; no new speaker, no lecture.'
      : '',
    step.maxBubbleLength ? `Max visible bubble length: ${step.maxBubbleLength} characters.` : '',
    `Meta/system design talk allowed: ${perception.allowsMetaRoomTalk ? 'yes' : 'no'}.`,
    `User emotional tone: ${perception.emotionalTone || 'neutral'}.`,
    `Recent messages:\n${recentMessagesBrief(recentMessages)}`,
    `Current user message: ${perception.text || ''}`,
    'Return strict JSON only with keys: speakerId, content, responseIntent, emotionalDelta, roomStateDelta, memoryCandidate, trace.',
    `speakerId must be exactly "${speakerId}".`,
    'Write one visible message only. Use first person. Answer the actual user message in-world.',
    'Do not answer as a generic assistant. Do not speak for other characters unless your plan says presence-summary or host-presence-explain. Do not claim consciousness.',
    perception.allowsMetaRoomTalk
      ? 'The user is asking about Studio Pulse behavior, so you may discuss the room design briefly if useful.'
      : 'The user is not asking about Studio Pulse design. Do not mention architecture, implementation, selection, validation, generation, labels, presence systems, assistant cosplay, or Room Intelligence.'
  ].join('\n');
}

function parseRoomCharacterOutput(raw = '', fallbackStep = {}) {
  const text = String(raw || '').trim();
  let parsed = null;
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    try { parsed = JSON.parse(fenced[1]); } catch (err) {}
  }
  if (!parsed) {
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { parsed = JSON.parse(objectMatch[0]); } catch (err) {}
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return {
      speakerId: fallbackStep.speakerId,
      content: compact(text, 600),
      responseIntent: fallbackStep.responseIntent || 'message',
      emotionalDelta: {},
      roomStateDelta: {},
      memoryCandidate: null,
      trace: 'plain-text-provider-output'
    };
  }
  return {
    speakerId: String(parsed.speakerId || fallbackStep.speakerId || '').toLowerCase(),
    content: String(parsed.content || parsed.text || '').trim(),
    responseIntent: String(parsed.responseIntent || fallbackStep.responseIntent || 'message'),
    emotionalDelta: parsed.emotionalDelta && typeof parsed.emotionalDelta === 'object' ? parsed.emotionalDelta : {},
    roomStateDelta: parsed.roomStateDelta && typeof parsed.roomStateDelta === 'object' ? parsed.roomStateDelta : {},
    memoryCandidate: parsed.memoryCandidate && typeof parsed.memoryCandidate === 'object' ? parsed.memoryCandidate : null,
    trace: String(parsed.trace || 'provider-json')
  };
}

function hasForbiddenArchitecturePhrases(text = '') {
  return FORBIDDEN_NON_META_RX.test(String(text || ''));
}

function stepAllowsGroupVoice(step = {}, perception = {}) {
  if (perception.asksEveryone) return true;
  return new Set(['presence-summary', 'host-presence-explain', 'wellbeing-check', 'greeting']).has(String(step.responseIntent || '').trim());
}

function speaksForUnplannedGroup(content = '', step = {}, perception = {}) {
  if (stepAllowsGroupVoice(step, perception)) return false;
  return UNPLANNED_GROUP_VOICE_RX.test(String(content || ''));
}

function claimsUnavailablePresence(content = '', roomState = {}) {
  const text = String(content || '');
  const status = roomState.knownPresenceStatus || {};
  const statuses = CHARACTER_IDS.map(id => String(status[id] || roomState.characterStates?.[id]?.presence || 'unknown').toLowerCase());
  const notAllActive = statuses.some(item => item !== 'active');
  if (notAllActive && /\b(everyone|everybody|all of us|all five)\s+(?:is|are|isn'?t|aren'?t|re|'re)?\s*(?:here|present|active|online|available|accounted for)\b/i.test(text)) {
    return true;
  }
  return CHARACTER_IDS.some(id => {
    const presence = String(status[id] || roomState.characterStates?.[id]?.presence || 'unknown').toLowerCase();
    const display = characterDisplayName(id).split(/\s+/)[0] || id;
    const nameRx = new RegExp(`\\b(${id}|${display})\\b`, 'i');
    if (!nameRx.test(text)) return false;
    if (presence !== 'active' && new RegExp(`\\b(${id}|${display})\\b[^.?!]{0,60}\\b(active|online)\\b`, 'i').test(text)) return true;
    if (['away', 'unknown'].includes(presence) && new RegExp(`\\b(${id}|${display})\\b[^.?!]{0,60}\\b(here|present|available)\\b`, 'i').test(text)) return true;
    return false;
  });
}

function ignoresPromptTopic(content = '', perception = {}, step = {}) {
  const text = String(content || '').toLowerCase();
  const prompt = String(perception.text || '').toLowerCase();
  const topic = String(perception.topicFocus || '').toLowerCase();
  if (perception.allowsMetaRoomTalk) {
    return !/\b(fake|room|character|speaker|voice|turn|response|feels?|generic|stiff|human|timing)\b/i.test(text);
  }
  if (topic === 'logo' || /\blogo\b/i.test(prompt)) {
    return !/\b(logo|mark|wordmark|brand|identity|symbol|show me|send it|see it|tiny|small size)\b/i.test(content);
  }
  if (perception.taskType === 'planning' || /\bcampaign\b/i.test(prompt)) {
    return !/\b(campaign|plan|audience|deadline|outcome|rollout|message|content|next step|lane)\b/i.test(content);
  }
  if (/\bless stiff\b|\bmake this\b.*\bstiff\b|\bnot so stiff\b/i.test(prompt)) {
    return !/\b(stiff|loosen|less|warmer|human|natural|rewrite|line|copy|tone|shape|soften|person|pitch deck)\b/i.test(content);
  }
  if (String(step.responseIntent || '') === 'direct-answer' && perception.requestedCharacterIds?.length) {
    return !/\b(i|me|my)\b/i.test(content);
  }
  return false;
}

function validateRoomCharacterTurn(turn = {}, step = {}, perception = {}, roomState = {}) {
  const expected = String(step.speakerId || '').toLowerCase();
  const actual = String(turn.speakerId || '').toLowerCase();
  const content = String(turn.content || '').trim();
  if (!expected || actual !== expected) return 'wrong-speaker';
  if (!content) return 'empty-content';
  if (GENERIC_ASSISTANT_RX.test(content)) return 'generic-assistant-voice';
  const fillerReason = assistantFillerReason(content);
  if (fillerReason) return fillerReason;
  const consciousnessReason = literalConsciousnessReason(content);
  if (consciousnessReason) return consciousnessReason;
  if (INTERNAL_METADATA_RX.test(content)) return 'metadata-leak';
  if (!perception.allowsMetaRoomTalk && hasForbiddenArchitecturePhrases(content)) return 'architecture-leak';
  if (speaksForUnplannedGroup(content, step, perception)) return 'unauthorized-group-voice';
  if (claimsUnavailablePresence(content, roomState)) return 'unavailable-presence-claim';
  if (ignoresPromptTopic(content, perception, step)) return 'topic-ignored';
  if (content.length > 900) return 'too-long';
  return '';
}

function eventFromTurn(turn = {}, step = {}, system = {}) {
  const speakerId = String(turn.speakerId || step.speakerId || '').toLowerCase();
  const existing = system.characters?.[speakerId] || {};
  return {
    speakerId,
    speakerName: existing.name || characterDisplayName(speakerId),
    role: existing.role || characterRole(speakerId),
    color: existing.color || '',
    kind: 'message',
    text: String(turn.content || '').trim(),
    tone: String(step.tone || turn.responseIntent || 'direct'),
    delayMs: 0,
    replyToId: '',
    emotionalState: String(turn.responseIntent || step.responseIntent || ''),
    roomIntent: String(turn.responseIntent || step.responseIntent || ''),
    presence: String(system.roomIntelligenceV0?.characterStates?.[speakerId]?.presence || ''),
    providerMode: String(turn.providerMode || turn.source || ''),
    validationFallbackReason: String(turn.validationFallbackReason || ''),
    engineMode: String(turn.engineMode || 'local-room-intelligence'),
    aishaEngineConnected: turn.aishaEngineConnected === true,
    exchangeLabel: safeExchangeLabel(turn.exchangeMode || step.exchangeMode, turn.exchangeRole || step.exchangeRole) || String(turn.exchangeLabel || ''),
    metadata: {
      roomIntent: String(turn.responseIntent || step.responseIntent || ''),
      presence: String(system.roomIntelligenceV0?.characterStates?.[speakerId]?.presence || ''),
      providerMode: String(turn.providerMode || turn.source || ''),
      validationFallbackReason: String(turn.validationFallbackReason || ''),
      engineMode: String(turn.engineMode || 'local-room-intelligence'),
      aishaEngineConnected: turn.aishaEngineConnected === true,
      exchangeLabel: safeExchangeLabel(turn.exchangeMode || step.exchangeMode, turn.exchangeRole || step.exchangeRole) || String(turn.exchangeLabel || '')
    },
    trace: String(turn.trace || step.reason || ''),
    visible: true,
    saveToArchive: true
  };
}

function buildRoomStudioResponse({
  question = '',
  system = {},
  plan = {},
  turns = [],
  roomState = null
} = {}) {
  const visibleTurns = (Array.isArray(turns) ? turns : []).filter(item => String(item?.content || '').trim());
  const plannedSteps = Array.isArray(plan.steps) ? plan.steps : [];
  const events = visibleTurns.map((turn, index) => ({
    ...eventFromTurn(turn, plannedSteps[Number.isInteger(turn.stepIndex) ? turn.stepIndex : index] || {}, { ...system, roomIntelligenceV0: roomState }),
    delayMs: index * 140
  }));
  const activeSpeakers = events.map(item => item.speakerId).filter(Boolean);
  const providerModes = visibleTurns.map(turn => String(turn.providerMode || turn.source || '').trim()).filter(Boolean);
  return {
    title: 'Open room',
    summary: '',
    departmentLead: activeSpeakers[0] || 'vanya',
    departmentPerspective: events[0]?.text || '',
    aishaFinal: '',
    messageEvents: events,
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    roomIntelligence: {
      schemaVersion: 'studio-pulse.room-intelligence.v0',
      engineMode: 'local-room-intelligence',
      aishaEngineConnected: false,
      intentFamily: plan.intentFamily || '',
      responseOrder: Array.isArray(plan.responseOrder) ? plan.responseOrder : activeSpeakers,
      trace: plan.trace || '',
      deterministic: !!plan.deterministic,
      exchangeMode: String(plan.exchangeMode || ''),
      primarySpeakerId: String(plan.primarySpeakerId || ''),
      addendumSpeakerId: String(plan.addendumSpeakerId || ''),
      commandCloseSpeakerId: String(plan.commandCloseSpeakerId || ''),
      providerModes,
      providerAcceptedCount: providerModes.filter(item => item === 'provider-accepted').length,
      providerRejectedFallbackCount: providerModes.filter(item => item === 'provider-rejected-fallback').length,
      providerUnavailableFallbackCount: providerModes.filter(item => item === 'provider-unavailable-fallback').length,
      aishaAcceptedCount: providerModes.filter(item => item === 'aisha-accepted').length,
      aishaRejectedFallbackCount: providerModes.filter(item => item === 'aisha-rejected-fallback').length,
      continuity: roomState?.characterContinuityV0 ? {
        schemaVersion: roomState.characterContinuityV0.schemaVersion || 'studio-pulse.character-continuity.v0',
        dominantMood: roomState.characterContinuityV0.roomSocialState?.dominantMood || '',
        currentFloorHolder: roomState.characterContinuityV0.roomSocialState?.currentFloorHolder || '',
        eventCount: Array.isArray(roomState.characterContinuityV0.continuityEvents) ? roomState.characterContinuityV0.continuityEvents.length : 0
      } : null,
      roomState
    },
    threadMeta: {
      responsePattern: events.length > 1 ? 'room-multi' : 'solo',
      exchangeMode: String(plan.exchangeMode || ''),
      intent: plan.intentFamily || 'room-intelligence',
      lastIntentPattern: plan.intentFamily || 'room-intelligence',
      requiredSpeakers: activeSpeakers,
      lastTargetedSpeaker: activeSpeakers[0] || '',
      lastActiveSpeakers: activeSpeakers,
      activeTopicTags: [plan.intentFamily || 'room'].filter(Boolean),
      lastRoomEnergy: roomState?.roomMood || 'steady',
      roomIntelligenceV0: roomState,
      engineMode: 'local-room-intelligence',
      aishaEngineConnected: false,
      selectionReason: plan.trace || 'room-intelligence-v0'
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    }
  };
}

module.exports = {
  buildRoomCharacterPrompt,
  parseRoomCharacterOutput,
  validateRoomCharacterTurn,
  fallbackTurnFromStep,
  hasForbiddenArchitecturePhrases,
  speaksForUnplannedGroup,
  claimsUnavailablePresence,
  ignoresPromptTopic,
  deterministicTurnFromStep,
  buildRoomStudioResponse
};
