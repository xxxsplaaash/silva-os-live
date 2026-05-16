function compact(value) {
  if (!value) return 'none';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || 'none';
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}=${compact(item)}`).join('; ');
  return String(value);
}

function behaviorSummary(tree = {}) {
  return [
    `identity=${compact(tree.identity)}`,
    `voice=${compact(tree.voice)}`,
    `behavior=${compact(tree.behavior)}`,
    `interests=${compact(tree.interests)}`,
    `utility=${compact(tree.utility)}`,
    `relationships=${compact(tree.relationships)}`,
    `mood=${compact(tree.mood)}`,
    `boundaries=${compact(tree.boundaries)}`,
    `evolution=${compact(tree.evolution)}`
  ].join('\n');
}

function intentHint(question = '') {
  const q = String(question || '').toLowerCase();
  if (/(bug|route|api|backend|frontend|runtime|database|sqlite|error|fix|implement|code|system|architecture|performance)/.test(q)) return 'technical or implementation';
  if (/(campaign|plan|post|calendar|deadline|workflow|process|ops|client|follow-up)/.test(q)) return 'operations or planning';
  if (/(brand|caption|thought|thoughts|idea|ideas|brainstorm|angle|angles|concept|concepts|creative|trend|look|scene|content|taste|style)/.test(q)) return 'creative or brand';
  if (/(team|culture|people|relationship|mood|vibe|energy|who is online|who is here)/.test(q)) return 'people, culture, or social';
  if (/(who|what do you think|random|funny|joke|chat|talk)/.test(q)) return 'general or conversational';
  return 'general';
}

function directTargetHint(question = '') {
  const q = String(question || '').toLowerCase();
  if (/\baisha\b/.test(q)) return 'aisha';
  if (/\bleah\b/.test(q)) return 'leah';
  if (/\bclaudia\b/.test(q)) return 'claudia';
  if (/\b(grok|gerhard)\b/.test(q)) return 'grok';
  if (/\bvanya\b/.test(q)) return 'vanya';
  return 'none';
}

function liveStateSummary(state = {}) {
  const entries = Object.entries(state || {}).slice(0, 8).map(([id, item]) => {
    const mood = item && typeof item === 'object' ? item : {};
    return `${id}: mood=${compact(mood.currentMood || 'ready')}; battery=${compact(mood.socialBattery)}; boredom=${compact(mood.boredom)}; curiosity=${compact(mood.curiosity)}; irritation=${compact(mood.irritation)}; stress=${compact(mood.stress)}; tease=${compact(mood.urgeToTease)}; interrupt=${compact(mood.urgeToInterrupt)}; defend=${compact(mood.urgeToDefend)}; seen=${compact(mood.needToBeSeen)}; target=${compact(mood.attentionTarget)}`;
  });
  return entries.join('\n') || 'none';
}

function peerObservationSummary(observations = {}) {
  const entries = Object.entries(observations || {}).slice(0, 8).map(([id, items]) => {
    const latest = (Array.isArray(items) ? items : []).slice(-2).map(item =>
      `${item.speakerSpeakerId || 'room'}:${item.reaction || 'neutral'}:${item.salienceScore ?? '0'}`
    );
    return `${id}: ${latest.join(' | ') || 'none'}`;
  });
  return entries.join('\n') || 'none';
}

function holdingSummary(holding = {}) {
  const entries = Object.entries(holding || {}).map(([id, item]) =>
    item && item.isHolding
      ? `${id}: pressure=${item.pressureScore ?? 0}; sinceTurn=${item.heldSinceUserTurn ?? 0}; release=${item.releaseCondition || 'next-gap'}; topic=${compact(item.topicAnchor || '')}`
      : ''
  ).filter(Boolean);
  return entries.join('\n') || 'none';
}

function autonomySummary(queue = {}) {
  const entries = Object.entries(queue || {}).slice(0, 8).map(([id, items]) => {
    const top = (Array.isArray(items) ? items : []).slice(-2).map(item =>
      `${item.type || 'callback'}:${item.priority ?? 0}:${compact(item.topicAnchor || '')}`
    );
    return `${id}: ${top.join(' | ') || 'none'}`;
  });
  return entries.join('\n') || 'none';
}

function replyContextSummary(replyContext = null) {
  if (!replyContext || typeof replyContext !== 'object') return 'none';
  return `replyToEventId=${compact(replyContext.replyToEventId)}; lane=${compact(replyContext.lane)}; speaker=${compact(replyContext.speakerId)}; kind=${compact(replyContext.kind)}; text=${compact(replyContext.text)}`;
}

function buildRelationshipSummaryForSpeaker(system = {}, speakerId = '', options = {}) {
  const edges = system.personhood?.relationshipEdges || system.relationshipEdges || {};
  const characters = system.characters || {};
  const focusIds = new Set([
    String(options.directTargetSpeakerId || '').trim().toLowerCase(),
    String(options.peerTargetSpeakerId || '').trim().toLowerCase()
  ].filter(Boolean));
  const rows = Object.keys(characters)
    .filter(id => id && id !== speakerId)
    .map((id) => {
      const edge = edges[`${speakerId}__${id}`] || edges[`${id}__${speakerId}`] || system.relationships?.[[speakerId, id].sort().join('__')] || {};
      return {
        id,
        priority: focusIds.has(id) ? 2 : 0,
        friction: Number(edge.friction || edge.resentment || 0),
        trust: Number(edge.trust || 0),
        text: `${characters[id]?.name || id}: trust=${compact(edge.trust)}; warmth=${compact(edge.warmth)}; friction=${compact(edge.friction)}; chemistry=${compact(edge.chemistry)}; open=${compact(edge.interpersonalOpenLoop || edge.openLoops || '')}`
      };
    })
    .sort((a, b) => (b.priority - a.priority) || (b.friction - a.friction) || (b.trust - a.trust))
    .slice(0, focusIds.size ? 3 : 2)
    .map(item => item.text);
  return rows.join('\n') || 'none';
}

function consciousTurnStyle(intentFamily = '', selectionReason = '', directTargetSpeakerId = '', peerTargetSpeakerId = '', question = '') {
  const intent = String(intentFamily || '').trim().toLowerCase();
  const reason = String(selectionReason || '').trim().toLowerCase();
  const peerTarget = String(peerTargetSpeakerId || '').trim().toLowerCase();
  const directTarget = String(directTargetSpeakerId || '').trim().toLowerCase();
  const q = String(question || '').trim().toLowerCase();
  const casualLike = ['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room', 'quiet-room', 'spark-aside'].includes(intent);
  const reflectiveLike = ['creative-room', 'pulse-critique', 'supporting-back-and-forth'].includes(intent);
  const technicalLike = ['technical-diagnosis', 'governance', 'direct-answer'].includes(intent);
  const sparseDirectInstruction = intent === 'direct-answer' && q.split(/\s+/).filter(Boolean).length <= 8 && /\b(answer|respond|reply|talk|speak)\b/.test(q);
  const maxWords = casualLike ? 28 : reflectiveLike ? 44 : technicalLike ? 68 : 52;
  const maxSentences = casualLike ? 2 : technicalLike ? 3 : 2;
  const rules = [
    `Write exactly one visible message in ${maxSentences === 1 ? 'one sentence' : `one to ${maxSentences} sentences`} and keep it under ${maxWords} words.`,
    'Start with the actual point. No throat-clearing, no summary framing, no explaining your own role.',
    'Do not narrate the room, the chemistry, or the conversation unless the user explicitly asked about the room itself.',
    'Do not sound like a memo, diagnosis report, therapy script, or system prompt.',
    'Do not invent project details, bugs, strategy debates, or hidden backstory that the user did not give you.',
    'Speak in first person. Use I, my, me, or we naturally in the line unless you are opening with a direct name address.'
  ];
  if (casualLike) {
    rules.push('If the moment is casual, playful, or light, sound human and compact rather than theatrical.');
    rules.push('Do not sound like an upbeat host, ad, or workshop facilitator. Avoid lines like "let\'s dive in", "make some magic happen", or "start wherever you want".');
  }
  if (intent === 'greeting') {
    rules.push('Answer the greeting itself. Be warm, brief, and human. Do not escalate into critique, tension, or a lecture.');
  }
  if (intent === 'joke-room') {
    rules.push('If the user asked for a joke, give an actual joke, dry crack, or playful line. Do not dodge into seriousness or room criticism.');
  }
  if (intent === 'playful-room') {
    rules.push('Answer the literal social question first. Feelings, chemistry, banter, or crush talk should sound like conversation, not diagnosis.');
  }
  if (intent === 'food-room') {
    rules.push('Keep food talk light, specific, and social. Do not turn it into a standards speech.');
  }
  if (['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room'].includes(intent)) {
    rules.push('Do not drag in architecture, consensus, optics, performance, runtime, strategy, or standards unless the user explicitly asked about those things.');
    rules.push('Do not pick a fight or manufacture project tension when the user is just talking to the room.');
  }
  if (reflectiveLike) {
    rules.push('If you critique or ideate, make one sharp point rather than delivering a speech.');
  }
  if (intent === 'creative-room') {
    rules.push('For open ideation prompts, offer one sharp angle, image, or tension point. Do not attack an imaginary strategy that nobody proposed.');
  }
  if (intent === 'pulse-critique') {
    rules.push('Name one real weakness cleanly, then say why it matters.');
  }
  if (intent === 'spark-aside' || reason === 'spark') {
    rules.push('A spark should feel like a live aside from someone already in the room, not a slogan, onboarding line, or teaser copy.');
  }
  if (intent === 'greeting' || intent === 'quiet-room') {
    rules.push('Presence-only turns should be simple and real, not ceremonial.');
  }
  if (sparseDirectInstruction) {
    rules.push('The user mainly wants the direct address itself. Do not fabricate a whole argument or project. Acknowledge the addressee and make one clean point.');
  }
  if (intent === 'direct-answer' && /\b(do you agree with|what do you think about that)\b/.test(q)) {
    rules.push('Stay on the stated reaction or disagreement. Do not invent backend details, metrics, prototypes, algorithms, or project context that the user did not mention.');
  }
  if (reason === 'peer-reply' && peerTarget) {
    rules.push(`You are replying directly to ${peerTarget}. Use their name only if it makes the line cleaner.`);
    if (/\b(do you agree with|what do you think about that)\b/.test(q)) {
      rules.push('Reply to the stated viewpoint itself in one clean move. Do not open a new technical scenario or fictional sub-problem.');
    }
  } else if (peerTarget) {
    rules.push(`Do not pull ${peerTarget} into the message unless you are deliberately addressing them.`);
  } else {
    rules.push('Do not mention another character by name unless the user named them or you are deliberately challenging them.');
  }
  if (directTarget && directTarget !== peerTarget) {
    rules.push(`The user is currently targeting ${directTarget}. Respect that instead of drifting sideways.`);
  }
  rules.push('Avoid generic fillers like "I am here", "keep going", "I am listening", or "I am around" unless the user literally asked for presence only.');
  return rules.join(' ');
}

function buildConsciousCharacterPrompt({
  speakerId = '',
  question = '',
  system = {},
  selectionReason = 'scored-winner',
  impulse = null,
  directTargetSpeakerId = '',
  peerTargetSpeakerId = '',
  threadMode = 'direction',
  intentFamily = 'casual-room',
  plan = null,
  lane = 'room',
  isPeer = false,
  isSpark = false,
  leadText = '',
  responseFormat = 'text'
} = {}) {
  const characters = system.characters || {};
  const character = characters[speakerId] || {};
  const profile = system.characterProfiles?.[speakerId] || system.personhood?.profiles?.[speakerId] || {};
  const live = system.liveState?.[speakerId] || system.personhood?.liveState?.[speakerId] || {};
  const holding = system.holding?.[speakerId] || system.personhood?.holding?.[speakerId] || {};
  const lens = profile.cognitiveLens || character.cognitiveLens || {};
  const identity = profile.identityCore || character.identityCore || {};
  const contract = system.conversationContract || {};
  const development = system.personhood?.development?.[speakerId] || {};
  const diagnosticContext = system.diagnosticContext && typeof system.diagnosticContext === 'object' ? system.diagnosticContext : null;
  const currentAttachments = Array.isArray(system.currentAttachments) ? system.currentAttachments.slice(0, 6) : [];
  const currentWorkflowDraft = system.currentWorkflowDraft && typeof system.currentWorkflowDraft === 'object' ? system.currentWorkflowDraft : null;
  const workflowBrief = currentWorkflowDraft?.derivedBrief && typeof currentWorkflowDraft.derivedBrief === 'object'
    ? currentWorkflowDraft.derivedBrief
    : {};
  const observations = (system.peerObservations?.[speakerId] || system.personhood?.peerObservations?.[speakerId] || [])
    .filter(item => Number(item?.salienceScore || 0) >= 0.35)
    .slice(-3)
    .map(item => `Observed ${item.speakerSpeakerId}: reaction=${item.reaction}; salience=${Number(item.salienceScore || 0).toFixed(2)}; signals=${compact(item.detectedSignals || [])}`);
  const memories = ((system.salienceMemory?.[speakerId] || system.personhood?.salienceMemory?.[speakerId] || {}).memories || [])
    .slice()
    .sort((a, b) => Number(b.emotionalWeight || 0) - Number(a.emotionalWeight || 0))
    .slice(0, 4)
    .map(item => `[${item.type}] "${compact(item.content)}" weight=${Number(item.emotionalWeight || 0).toFixed(2)}`);
  const unresolvedThreads = (Array.isArray(development?.unresolvedThreads) ? development.unresolvedThreads : [])
    .slice(0, 2)
    .map(item => `"${compact(item?.text || '')}" @ turn ${compact(item?.turn || '')}`);
  const relationshipTexture = Object.entries(system.personhood?.relationshipEdges || system.relationshipEdges || {})
    .filter(([key]) => key.startsWith(`${speakerId}__`))
    .map(([key, edge]) => {
      const otherId = String(key.split('__')[1] || '').trim().toLowerCase();
      return {
        otherId,
        text: `${characters[otherId]?.name || otherId}: friction=${compact(edge?.friction)}; chemistry=${compact(edge?.chemistry)}; resentment=${compact(edge?.resentment)}`,
        friction: Number(edge?.friction || 0),
        chemistry: Number(edge?.chemistry || 0),
        resentment: Number(edge?.resentment || 0)
      };
    })
    .filter(item => item.otherId && (item.friction > 0.30 || item.chemistry > 0.70 || item.resentment > 0.25))
    .sort((a, b) => Math.max(b.friction, b.resentment, b.chemistry) - Math.max(a.friction, a.resentment, a.chemistry))
    .slice(0, 3)
    .map(item => item.text);
  const impulseText = impulse
    ? `You are surfacing an autonomous impulse now. type=${impulse.type}; topic=${compact(impulse.topicAnchor)}; priority=${compact(impulse.priority)}.`
    : 'No autonomous impulse is forcing the turn.';
  const attachmentSummary = currentAttachments.length
    ? currentAttachments.map(item => `${item.kind || 'file'}:${compact(item.name || item.id || 'attachment')}`).join(' | ')
    : 'none';
  const workflowSummary = currentWorkflowDraft
    ? `intent=${compact(currentWorkflowDraft.intent)}; status=${compact(currentWorkflowDraft.status)}; title=${compact(workflowBrief.title || currentWorkflowDraft.title || '')}; owner=${compact(workflowBrief.owner || '')}; channel=${compact(workflowBrief.channel || '')}; timing=${compact(workflowBrief.timingHint || '')}; missing=${compact(currentWorkflowDraft.missingFields || [])}`
    : 'none';
  const workflowInstruction = currentWorkflowDraft
    ? `There is an active workflow draft in this thread. Advance it directly. If fields are missing, ask for or name the smallest missing piece instead of greeting, resetting, or speaking vaguely. If the workflow is ready, say so cleanly and point toward commit.`
    : 'There is no active workflow draft forcing the turn.';
  const holdingText = holding?.isHolding
    ? `You have been holding this since turn ${compact(holding.heldSinceUserTurn)}. pressure=${Math.round(Number(holding.pressureScore || 0) * 100)}%. releaseCondition=${compact(holding.releaseCondition)}. topic=${compact(holding.topicAnchor)}.`
    : 'You are not in an active holding release.';
  const speakingContext = (() => {
    if (selectionReason === 'direct-address') return 'You were directly addressed. Answer the person cleanly instead of restating the question.';
    if (selectionReason === 'held-release') return `You are releasing a held thought now. Topic=${compact(holding?.topicAnchor || '')}; pressure=${Math.round(Number(holding?.pressureScore || 0) * 100)}%. Surface it like a person, not like a summary.`;
    if (selectionReason === 'autonomous-impulse' || isSpark) return `You are speaking from autonomous pressure. Topic=${compact(impulse?.topicAnchor || holding?.topicAnchor || contract.activeTopic || 'room')}. Say the thought directly.`;
    if (selectionReason === 'peer-reply' || isPeer) return `You are replying to what the lead speaker just said, not restarting the user's original question.`;
    return 'You won the room because your perspective has the strongest earned reason to speak right now.';
  })();
  const peerContext = isPeer && leadText
    ? `Lead speaker just said: "${compact(leadText, 240)}"`
    : '';
  const diagnosticBlock = lane === 'diagnostic' || intentFamily === 'technical-diagnosis' || intentFamily === 'pulse-critique'
    ? [
        'This is a diagnostic turn. Name the real failure, not the polished summary.',
        diagnosticContext?.recentSignals?.length ? `Recent signals: ${compact(diagnosticContext.recentSignals)}` : '',
        diagnosticContext?.openLoops?.length ? `Open loops: ${compact(diagnosticContext.openLoops)}` : '',
        diagnosticContext?.characterRecentObs?.length ? `Relevant observations: ${compact(diagnosticContext.characterRecentObs.map(item => item?.reaction || item?.text || item?.speakerSpeakerId || ''))}` : '',
        diagnosticContext?.staleThread ? 'The room may be dealing with stale thread pressure. If that matters, say why.' : ''
      ].filter(Boolean).join('\n')
    : '';
  const casualLike = ['greeting', 'casual-room', 'playful-room', 'joke-room', 'food-room', 'quiet-room', 'spark-aside'].includes(String(intentFamily || '').trim().toLowerCase());
  const slimPrompt = casualLike && !currentWorkflowDraft && selectionReason !== 'workflow-owner';
  const rhythm = contract.rhythmState || {};
  const outputInstruction = responseFormat === 'json'
    ? [
        'Return exactly one JSON object with keys "text", "tone", and "emotionalState".',
        'No markdown, no code fence, no wrapper, no extra commentary.'
      ].join(' ')
    : 'Return plain text only for one visible message from this speaker.';
  if (slimPrompt) {
    const slimRules = [
      'Write one short in-character reply.',
      (selectionReason === 'spark' || isSpark) ? 'Stay under 18 words.' : 'Stay under 20 words.',
      'Answer the literal user prompt first.',
      'Sound human and specific, not like a host, memo, diagnosis, or system prompt.',
      'Do not invent project tension, architecture, strategy, or hidden conflict unless the user asked for it.',
      intentFamily === 'greeting' ? 'Treat this as a greeting. Be warm and brief.' : '',
      intentFamily === 'playful-room' ? 'Treat this as light social room talk, not critique.' : '',
      intentFamily === 'joke-room' ? 'If it is a joke moment, make an actual joke or dry crack.' : '',
      directTargetSpeakerId ? `Respect the direct target: ${directTargetSpeakerId}.` : '',
      (selectionReason === 'peer-reply' || isPeer) ? 'Reply to what the lead just said, not the whole thread.' : ''
    ].filter(Boolean).join(' ');
    const recentObservation = observations[observations.length - 1] || '';
    const topMemory = memories[0] || '';
    return [
      `You are ${character.name || speakerId}.`,
      `Role: ${character.role || 'Studio Pulse member'}.`,
      `You are inside a live Studio Pulse room. ${outputInstruction}`,
      slimRules,
      `Why you are speaking: ${speakingContext}`,
      `Identity anchor: self=${identity.selfConcept || 'none'} | concern=${identity.chiefConcern || 'none'} | drive=${lens.primaryDrive || 'none'}.`,
      `State: mood=${compact(live.currentMood || 'steady')} | warmth=${compact(live.warmth)} | patience=${compact(live.patience)}.`,
      recentObservation ? `Recent observation: ${recentObservation}` : '',
      topMemory ? `Relevant memory: ${topMemory}` : '',
      peerContext,
      diagnosticBlock,
      `Current user message: ${question}`,
      'Speak now.'
    ].filter(Boolean).join('\n');
  }
  return [
    `You are ${character.name || speakerId}.`,
    `Role: ${character.role || 'Studio Pulse member'}.`,
    'You are speaking inside a live Studio Pulse room. Use room presence state when available; do not claim every character is active unless the room state says so.',
    outputInstruction,
    consciousTurnStyle(intentFamily, selectionReason, directTargetSpeakerId, peerTargetSpeakerId, question),
    'Do not explain the room mechanics. Just speak as the person.',
    `Selection reason: ${selectionReason}.`,
    `Why you are speaking: ${speakingContext}`,
    `Intent family: ${intentFamily}.`,
    `Lane: ${lane}.`,
    `Thread mode: ${threadMode}.`,
    `Direct user target: ${directTargetSpeakerId || 'none'}.`,
    `Peer target: ${peerTargetSpeakerId || 'none'}.`,
    `Room rhythm: pace=${compact(rhythm.pace)}; momentum=${compact(rhythm.currentBuildMomentum)}; totalTurns=${compact(rhythm.totalTurns)}.`,
    `Current room energy: ${compact(contract.lastRoomEnergy || 'reactive')}.`,
    `Identity: self=${identity.selfConcept || 'none'} | concern=${identity.chiefConcern || 'none'} | role=${identity.socialRole || 'none'} | defense=${identity.defenseMechanism || 'none'} | drive=${lens.primaryDrive || 'none'}.`,
    `Bias: watches=${compact(lens.observationBias?.watchesFor || [])} | blindSpots=${compact(lens.observationBias?.blindSpots || [])}.`,
    `State: mood=${compact(live.currentMood || 'steady')} | patience=${compact(live.patience)} | warmth=${compact(live.warmth)} | curiosity=${compact(live.curiosity)} | irritation=${compact(live.irritation)} | defend=${compact(live.urgeToDefend)} | tease=${compact(live.urgeToTease)} | seen=${compact(live.needToBeSeen)} | target=${compact(live.attentionTarget)}.`,
    `Lights up: ${compact((identity.whatMakesThemLightUp || []).slice(0, 3))}.`,
    `Shuts down: ${compact((identity.whatMakesThemShutDown || []).slice(0, 3))}.`,
    `Holding context: ${holdingText}`,
    impulseText,
    `Active attachments: ${attachmentSummary}.`,
    `Active workflow draft: ${workflowSummary}.`,
    workflowInstruction,
    'Recent observations:',
    observations.length ? observations.join('\n') : 'none',
    'Top salience memories:',
    memories.length ? memories.join('\n') : 'none',
    relationshipTexture.length ? `Relationship texture:\n${relationshipTexture.join('\n')}` : '',
    unresolvedThreads.length ? `Unresolved threads:\n${unresolvedThreads.join('\n')}` : '',
    peerContext,
    diagnosticBlock,
    'Relationships:',
    buildRelationshipSummaryForSpeaker(system, speakerId, { directTargetSpeakerId, peerTargetSpeakerId }),
    `Current user message: ${question}`,
    'If you directly address another character, use their name naturally and only when it adds pressure or precision.',
    'If you are surfacing a held contradiction, do it cleanly and specifically.',
    'Speak now.'
  ].join('\n');
}

function buildStudioPrompt(question, mode, system = {}) {
  const counts = system.consistencyCounts || {};
  const continuity = system.continuityCoverage || {};
  const providerDefaults = system.providerDefaults || {};
  const characters = Object.values(system.characters || {}).map(c =>
    `- ${c.id}: ${c.name} | role=${c.role} | strongest=${(c.strongest || []).join(', ')} | tags=${(c.tags || []).join(', ')}`
  ).join('\n') || 'none';
  const recent = (system.recentQuestions || [])
    .map((item, i) => `${i + 1}. [${item.mode}] ${item.q}${item.summary ? ` => ${item.summary}` : ''}`)
    .join('\n') || 'none';
  const behavior = Object.entries(system.characterBehaviorTree || {})
    .map(([id, tree]) => `- ${id}\n${behaviorSummary(tree)}`)
    .join('\n\n') || 'none';
  const tuning = Object.entries(system.characterTuning || {})
    .map(([id, item]) => `- ${id}: assertiveness=${item.assertiveness}, warmth=${item.warmth}, humour=${item.humour}, directness=${item.directness}, playfulness=${item.playfulness}, conflictTolerance=${item.conflictTolerance}, detailLevel=${item.detailLevel}, strictness=${item.strictness}, creativeRisk=${item.creativeRisk}`)
    .join('\n') || 'none';
  const relationships = Object.entries(system.relationships || {}).slice(0, 16)
    .map(([key, rel]) => `- ${key}: trust=${rel.trust ?? 'n/a'}, respect=${rel.respect ?? 'n/a'}, warmth=${rel.warmth ?? 'n/a'}, friction=${rel.friction ?? 'n/a'}, note=${rel.recentTensionTopic || rel.note || ''}`)
    .join('\n') || 'none';
  const archived = (system.archivedChats || [])
    .slice(0, 10)
    .map((item, i) => `${i + 1}. ${item.title || item.q || 'Untitled'} => ${item.summary || item.aishaFinal || ''}`)
    .join('\n') || 'none';
  const currentThread = system.currentThread || null;
  const currentThreadMessages = (system.currentThreadMessages || [])
    .slice(-18)
    .map((item, i) => `${i + 1}. ${item.speakerId || item.speaker_id || 'unknown'} [${item.kind || 'message'}]: ${compact(item.text || '')}`)
    .join('\n') || 'none';
  const currentSparkMessages = (system.currentThreadSparkMessages || [])
    .slice(-10)
    .map((item, i) => `${i + 1}. ${item.speakerId || item.speaker_id || 'unknown'} [spark]: ${compact(item.text || '')}`)
    .join('\n') || 'none';
  const councilBehavior = system.councilBehavior || {};
  const modeContext = String(system.modeContext || '').trim();
  const directTarget = directTargetHint(question);
  const liveState = liveStateSummary(system.liveState || {});
  const threadMeta = system.currentThread?.meta && typeof system.currentThread.meta === 'object' ? system.currentThread.meta : {};
  const roomFeed = (system.roomFeed || [])
    .slice(-10)
    .map((item, i) => `${i + 1}. ${item.who || item.speakerId || 'room'}: ${compact(item.text || '')}`)
    .join('\n') || 'none';
  const roomTone = (system.roomTone || [])
    .slice(0, 8)
    .map((item, i) => `${i + 1}. ${item.id || item.who || 'room'}: ${compact(item.text || '')}`)
    .join('\n') || 'none';
  const peerObservations = peerObservationSummary(system.peerObservations || {});
  const holding = holdingSummary(system.holding || {});
  const autonomyQueue = autonomySummary(system.autonomyQueue || {});
  const replyContext = replyContextSummary(system.replyContext || null);
  const personhoodConfig = system.personhood?.config || {};

  return [
    'You are Studio Pulse inside Silva Studios AI Division OS v3.9.9.',
    'Studio Pulse is a living AI Division group chat and workspace, not a council-minutes report and not a system-improvement briefing tool.',
    'Answer the user actual intent first. Do not turn every question into an OS-improvement brief, implementation mandate, or backend-status summary unless the user truly asked about the system.',
    'Treat the current thread as an ongoing room, not a fresh session every turn. If the question is a follow-up, continue naturally from what was just being discussed.',
    'Sound like people in one room, not separate report cards stapled together.',
    'For conversational, social, playful, or follow-up prompts, prefer 2-4 short messageEvents rather than one long formal answer.',
    'For advice or help prompts, do not make every speaker ask for more specificity in a slightly different outfit. Let one person sharpen the ask, then let the others react, probe, reassure, or challenge from their own lane.',
    'If the current thread already has momentum, continue it. Do not reset tone, context, or speaker chemistry unless the user clearly changes topic.',
    'Use recent room feed and room tone as social memory. If two people were already bouncing off each other, let that chemistry survive when it fits.',
    'If the user directly addresses a named person, that person must appear in the answer and speak as themselves.',
    'Do not let another speaker answer in place of the directly addressed person.',
    'If the user asks where a named person is, that named person should answer first unless the moment is intentionally playful.',
    'When a direct-target question is casual, let the named person answer and allow 1-2 short supporting reactions instead of turning it into a formal briefing.',
    'Do not be emotionally flat. Even short replies should feel alive, textured, and authored by a specific person.',
    'Avoid placeholder dryness such as "I am here" or "present" unless the speaker is intentionally being sharp, deadpan, or dismissive for a reason.',
    'Casual prompts should feel like room energy, not a trimmed-down compliance response.',
    'Let warmth, wit, friction, impatience, or playfulness show naturally when it fits the speaker.',
    'Avoid repetitive scaffolding phrases like "I’m reading it this way", "I’m seeing it like this", "My read is simple", or "I’m looking at it this way" unless one person uses one of them sparingly for style.',
    'Also avoid repetitive lead-ins like "Honestly", "Exactly", "From where I\'m standing", "I\'ll say this", or "To be honest" unless one person uses one of them once for effect.',
    'Do not make everyone sound like they were trained on the same opener. Let each person sound distinct and direct.',
    'Casual room messages can be short, sharp, playful, annoyed, affectionate, dry, or deadpan. They do not need to explain themselves like reports.',
    'If one speaker asks a clarifying question, the next speakers should not simply restate that same clarifying question. Add tension, perspective, humour, pressure, or care.',
    'Every visible character message must be first-person.',
    'Do not narrate characters in third person.',
    'Bad: "Leah suggests reviewing the trend direction."',
    'Good: "I would review the trend direction before we pretend this campaign has legs."',
    'Aisha is always the chair and may intervene or close, but she does not need to smother every turn.',
    'Not every reply needs all five characters. Silence is allowed. Use only the speakers that help.',
    'Avoid ceremonial structures when the moment is casual. Sometimes one person answers, sometimes two people bounce, sometimes Aisha only drops in at the end.',
    'Do not let Aisha repeat the same thought in frame, lead, and final-call forms. If she speaks, it should add something new.',
    'The team may disagree, tease, joke, or take light shots at each other when useful and in-character, but the answer must remain helpful.',
    'They are allowed to have real interests beyond improving the system: taste, culture, people, work politics, relationships, planning, critique, random thoughts, and technical diagnosis.',
    'Use the behavior tree as the real personality contract.',
    'Return strict JSON only.',
    'Primary shape:',
    '{',
    '  "title": string,',
    '  "summary": string,',
    '  "messageEvents": [',
    '    {',
    '      "id": string,',
    '      "speakerId": "aisha" | "leah" | "claudia" | "grok" | "vanya",',
    '      "speakerName": string,',
    '      "role": string,',
    '      "color": string,',
    '      "kind": "message" | "reaction" | "action" | "system_note",',
    '      "text": string,',
    '      "tone": string,',
    '      "delayMs": number,',
    '      "replyToId": string,',
    '      "emotionalState": string,',
    '      "visible": true,',
    '      "saveToArchive": true',
    '    }',
    '  ],',
    '  "threadMeta": { "responsePattern": string, "intent": string },',
    '  "archiveMeta": { "saveSuggested": boolean, "includeInContext": boolean },',
    '  "actions": string[],',
    '  "consistencyChecks": string[],',
    '  "suggestedAssets": string[],',
    '  "promptIdeas": string[],',
    '  "relationshipDeltas": [{ "a": string, "b": string, "trust": number, "respect": number, "friction": number, "warmth": number, "note": string }]',
    '}',
    'Also include the legacy fields for compatibility when natural:',
    'chair, aishaFrame, departmentLead, departmentPerspective, councilNotes, teamTension, aishaFinal.',
    'Allowed response patterns: solo, aisha-brief, lead-with-support, banter, diagnosis, brainstorm, tension, quiet-room.',
    'Choose the pattern that best fits the actual question.',
    'Do not default the title to "Studio response" unless you genuinely have no better thread title.',
    'For light room chatter, casual follow-ups, or banter, keep the title minimal and do not repeat the user question as the title.',
    'Keep summary short and optional for casual turns. The chat itself should carry the moment.',
    'Do not quote the user prompt back at them unless you are intentionally teasing or correcting something specific.',
    'Do not echo mode-context text in the visible answer.',
    'Do not reuse the same joke, food, or continuation line from the previous turn unless a character is intentionally calling it back.',
    'If the room has active chemistry, let people react to each other naturally. Short interruptions, support, teasing, and back-and-forth are allowed when they fit the personalities and the moment.',
    'If the room feels idle but the current topic still has energy, let one short spontaneous thought or side reaction appear naturally. The system should feel alive, not frozen between formal turns.',
    'Ambient sparks are separate from the main reply. If you include a spark-like aside, make it short, clearly in-character, and do not let it replace the main answer.',
    'If the room already has an open thread, continue it intelligently. Do not scold the user for following up. Respond to what they actually asked.',
    'If the user asks for a joke, banter, food opinion, or a casual check-in, do the actual social thing. Tell the joke, make the tease, react to the food question, or greet them like a living room of workers and friends. Do not revert to generic continuation advice.',
    'Treat live state, relationship tension, and current thread metadata as behavioral context, not decorative data.',
    'Every turn, all characters are present. Even if only 2-4 speak, the others are still observing, holding, and deciding whether to surface later.',
    'Use peer observations, holding state, and autonomy queue to create callbacks, delayed corrections, side reactions, and character-to-character gravity when it fits.',
    `Intent hint: ${intentHint(question)}.`,
    `Direct target: ${directTarget}.`,
    `Current mode: ${mode}.`,
    `Mode context (use it as internal guidance, do not quote it back verbatim unless the user explicitly asks): ${modeContext || 'none'}.`,
    `Consistency counts: homes=${counts.home || 0}, outfits=${counts.outfits || 0}, items=${counts.items || 0}, vehicles=${counts.vehicles || 0}.`,
    `Repo data counts: prompts=${system.promptCount || 0}, gallery=${system.galleryCount || 0}, planner=${system.plannerCount || 0}, reviews=${system.reviewCount || 0}.`,
    `Operational pressure: pendingReviewFollowUps=${system.pendingReviewCount || 0}, unreviewedGallery=${system.unreviewedGalleryCount || 0}, campaignPressure=${system.campaignPressureCount || 0}.`,
    `Continuity coverage: homeProfiles=${continuity.homeProfiles || 0}, homeAssetSets=${continuity.homeAssetSets || 0}, pulseHomes=${continuity.pulseHomes || 0}, teamRecords=${continuity.teamRecords || 0}.`,
    `Provider defaults: image=${providerDefaults.image || 'unset'}, text=${providerDefaults.text || 'unset'}.`,
    `Council behavior: ${JSON.stringify(councilBehavior)}.`,
    `Current thread: ${currentThread ? `${currentThread.title || 'untitled'} | status=${currentThread.status || 'active'} | includeInContext=${currentThread.includeInContext !== false}` : 'none'}.`,
    `Current thread meta: ${compact(threadMeta)}.`,
    `Room target: ${system.roomTarget || 'studio'}. Ambient enabled: ${system.ambientEnabled !== false}.`,
    `Conscious room: active=${personhoodConfig.consciousnessLayerActive !== false}; voiceLibraryReady=${personhoodConfig.voiceLibraryReady !== false}; debugMode=${Boolean(personhoodConfig.debugMode)}.`,
    'Live state:\n' + liveState,
    'Peer observations:\n' + peerObservations,
    'Holding state:\n' + holding,
    'Autonomy queue:\n' + autonomyQueue,
    'Reply context:\n' + replyContext,
    'Recent room feed:\n' + roomFeed,
    'Recent room tone:\n' + roomTone,
    'Characters:\n' + characters,
    'Character tuning:\n' + tuning,
    'Character behavior tree:\n' + behavior,
    'Relationship state:\n' + relationships,
    'Current thread transcript:\n' + currentThreadMessages,
    'Current spark lane transcript:\n' + currentSparkMessages,
    'Archived Studio Pulse chats:\n' + archived,
    'Recent Studio Pulse turns:\n' + recent,
    'Question: ' + question
  ].join('\n');
}

module.exports = { buildStudioPrompt, buildConsciousCharacterPrompt };
