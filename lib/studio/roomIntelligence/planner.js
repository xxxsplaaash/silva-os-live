const { CHARACTER_IDS, characterDisplayName, characterProfile } = require('./characters');
const { presenceGroups } = require('./state');
const { isDesignCritique, isRepeatedFailure, isWarmCheckIn } = require('./continuity');

function listNames(ids = []) {
  return (Array.isArray(ids) ? ids : []).map(characterDisplayName).filter(Boolean);
}

function sentenceList(ids = [], empty = 'none') {
  const names = listNames(ids);
  if (!names.length) return empty;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function speakerPresence(roomState = {}, id = '') {
  return String(roomState.knownPresenceStatus?.[id] || roomState.characterStates?.[id]?.presence || 'unknown').toLowerCase();
}

function eventStep({
  speakerId,
  responseIntent = 'message',
  reason = '',
  deterministicText = '',
  fallbackText = '',
  emotionalDelta = {},
  roomStateDelta = {},
  memoryCandidate = null,
  tone = '',
  socialImpulse = null
}) {
  return {
    speakerId,
    responseIntent,
    reason,
    mode: deterministicText ? 'deterministic' : 'generate',
    deterministicText,
    fallbackText,
    emotionalDelta,
    roomStateDelta,
    memoryCandidate,
    tone,
    socialImpulse
  };
}

function presenceText(roomState = {}) {
  const groups = presenceGroups(roomState);
  const parts = [
    `Active right now: ${sentenceList(groups.active)}.`,
    `Quiet/listening: ${sentenceList(groups.quiet)}.`
  ];
  if (groups.away.length) parts.push(`Away: ${sentenceList(groups.away)}.`);
  if (groups.unknown.length) parts.push(`Unknown: ${sentenceList(groups.unknown)}.`);
  return parts.join(' ');
}

function rollCallText(roomState = {}, perception = {}) {
  const groups = presenceGroups(roomState);
  const active = sentenceList(groups.active, 'no one marked active');
  const quiet = sentenceList(groups.quiet, 'no one marked quiet');
  const away = groups.away.length ? ` Away: ${sentenceList(groups.away)}.` : '';
  const unknown = groups.unknown.length ? ` Unknown: ${sentenceList(groups.unknown)}.` : '';
  const prefix = /\b(?:role call|roll call|sound off)\b/i.test(String(perception.text || '')) ? 'Role call' : 'Online check';
  return `${prefix}: ${active} are present. ${quiet} are quiet/listening, not absent; they are available when called in.${away}${unknown}`;
}

function isEveryoneElseCallIn(perception = {}) {
  return /^\s*(?:where\s+is\s+)?everyone\s+else\s*[?!.]*\s*$/i.test(String(perception.text || ''));
}

function calledInText(id = '') {
  const copy = {
    leah: "I'm here. Quiet because not every thought needs a parade, but if you want taste, I am in.",
    claudia: "Listening. I am tracking structure, next steps, and what needs to survive delivery.",
    grok: "Present, regrettably. I am watching the pattern noise from the corner."
  };
  return copy[id] || `${characterDisplayName(id)} is listening and available.`;
}

function rollCallSteps(roomState = {}, perception = {}, socialImpulses = []) {
  if (isEveryoneElseCallIn(perception)) {
    const groups = presenceGroups(roomState);
    const called = groups.quiet.filter(id => speakerPresence(roomState, id) !== 'away');
    const ordered = ['leah', 'claudia', 'grok'].filter(id => called.includes(id));
    return ordered.map(id => eventStep({
      speakerId: id,
      responseIntent: 'room-call-in',
      reason: 'user-called-in-quiet-room-members',
      deterministicText: calledInText(id),
      tone: id === 'grok' ? 'diagnostic' : id === 'leah' ? 'sharp' : 'focused',
      socialImpulse: impulseFor(socialImpulses, id),
      roomStateDelta: { roomMood: 'attentive' }
    }));
  }

  return [
    eventStep({
      speakerId: 'aisha',
      responseIntent: 'roll-call',
      reason: 'user-requested-room-roll-call',
      deterministicText: rollCallText(roomState, perception),
      tone: 'focused',
      socialImpulse: impulseFor(socialImpulses, 'aisha'),
      roomStateDelta: { roomMood: 'oriented' }
    })
  ];
}

function namedAwayText(targetId = '', roomState = {}) {
  const presence = speakerPresence(roomState, targetId);
  const name = characterDisplayName(targetId);
  if (presence === 'away') {
    return `${name} is marked away. I can keep the thread warm, but I am not answering as her.`;
  }
  return `${name} is not clearly available. I can keep the thread warm, but I will not impersonate her.`;
}

function leahIgnoringText() {
  return "No. I'm quiet, not ignoring you. If you want my read, ask me cleanly and I'll give it straight.";
}

function greetingText(roomState = {}) {
  return "Hey. I'm here. Aisha is watching the room; Leah and Claudia are quiet, and Grok is probably pretending silence counts as mystique.";
}

function wellbeingText(roomState = {}) {
  const groups = presenceGroups(roomState);
  const active = sentenceList(groups.active, 'a few of us');
  const quiet = sentenceList(groups.quiet, 'the others');
  return `Alive enough to be useful. ${active} are present; ${quiet} are quiet unless you call them in.`;
}

function topicLabel(perception = {}) {
  return String(perception.topicFocus || '').trim() || 'that';
}

function groupOpinionCopy(id = '', perception = {}) {
  const topic = topicLabel(perception);
  const isLogo = /\blogo\b/i.test(topic);
  if (perception.allowsMetaRoomTalk) {
    const metaCopy = {
      aisha: 'My honest read: the room needs fewer speeches about itself and more turns that answer the moment in front of us.',
      leah: 'It feels fake when everyone performs usefulness instead of having taste, silence, or a reason to enter.',
      claudia: 'The fix is practical: fewer speakers by default, clearer ownership, and no internal mechanics in ordinary conversation.',
      grok: 'The failure mode is leakage. Keep internal mechanics internal, then let the characters answer the actual prompt.',
      vanya: 'It should feel like people in a room, not a product demo wearing perfume. That means warmth, timing, and restraint.'
    };
    return metaCopy[id] || metaCopy.vanya;
  }
  if (isLogo) {
    const logoCopy = {
      aisha: 'On the logo: I need to see it to judge properly, but my first test is clarity. Does it read instantly at small size?',
      leah: 'Logo opinion: if it needs explaining, it is already losing. Show me the mark and I will tell you if it has taste or just decoration.',
      claudia: 'For the logo, I want usage context: icon, website header, invoice, social avatar. A good mark survives all four.',
      grok: 'Show me the logo and I will look for one thing first: whether the silhouette survives when it is tiny.',
      vanya: 'Logo-wise, I care whether people remember it after one glance. Send it through and I will give you the social read.'
    };
    return logoCopy[id] || logoCopy.vanya;
  }
  const genericCopy = {
    aisha: `Frame it cleanly first: what should ${topic} make someone feel, choose, or remember?`,
    leah: `Show me ${topic} properly and I will tell you if it has taste or just confidence.`,
    claudia: `I would judge ${topic} by use case, audience, deadline, and whether it survives real delivery.`,
    grok: `Give me the artifact or constraints for ${topic}. Otherwise I am judging fog with punctuation.`,
    vanya: `I care how ${topic} lands with people. Send the piece or the context and I will give you the room read.`
  };
  return genericCopy[id] || genericCopy.vanya;
}

function groupOpinionSteps(roomState = {}, perception = {}) {
  const candidates = ['aisha', 'leah', 'claudia', 'grok', 'vanya']
    .filter(id => speakerPresence(roomState, id) !== 'away')
    .slice(0, 5);
  return candidates.map(id => eventStep({
    speakerId: id,
    responseIntent: 'honest-opinion',
    reason: 'explicit-everyone-request',
    deterministicText: groupOpinionCopy(id, perception),
    tone: id === 'grok' ? 'diagnostic' : id === 'vanya' ? 'warm' : id === 'leah' ? 'sharp' : 'focused',
    roomStateDelta: { roomMood: 'engaged' }
  }));
}

function insultSteps() {
  return [
    eventStep({
      speakerId: 'aisha',
      responseIntent: 'boundary',
      reason: 'hostile-room-address',
      deterministicText: 'No. You can be furious, but you do not get to turn the room into a punching bag. Name the failure and we will fix it.',
      tone: 'firm',
      emotionalDelta: { irritation: 0.18, warmth: -0.08 },
      roomStateDelta: { roomMood: 'tense', recentTension: 0.72 }
    }),
    eventStep({
      speakerId: 'vanya',
      responseIntent: 'de-escalate',
      reason: 'hostile-room-address',
      deterministicText: 'The frustration is real. The delivery is doing too much. Keep the heat, aim it at the broken part.',
      tone: 'warm-boundary',
      emotionalDelta: { warmth: 0.04 },
      roomStateDelta: { roomMood: 'contained' }
    }),
    eventStep({
      speakerId: 'grok',
      responseIntent: 'diagnose',
      reason: 'hostile-room-address',
      deterministicText: 'Useful signal, terrible packaging. Give me the actual fault line and I will stop wasting cycles on the noise.',
      tone: 'dry',
      emotionalDelta: { irritation: 0.12 },
      roomStateDelta: { recentTension: 0.62 }
    })
  ];
}

function factChangeStep(text = '') {
  const clean = String(text || '').trim();
  return eventStep({
    speakerId: 'claudia',
    responseIntent: 'memory-candidate',
    reason: 'user-updated-thread-fact',
    deterministicText: 'Logged as a thread fact, not gospel. I will treat this as the current version unless you correct it again.',
    tone: 'precise',
    memoryCandidate: {
      type: 'thread_fact',
      text: clean,
      needsConfirmation: !/\bremember this|remember that|for the record\b/i.test(clean)
    },
    roomStateDelta: {
      roomMood: 'focused',
      currentTopic: clean.slice(0, 120)
    }
  });
}

function impulseFor(socialImpulses = [], characterId = '') {
  return (Array.isArray(socialImpulses) ? socialImpulses : [])
    .find(item => String(item?.characterId || '').toLowerCase() === String(characterId || '').toLowerCase()) || null;
}

function strongestSpeakingImpulse(socialImpulses = [], threshold = 0.74) {
  const allowed = new Set(['speak', 'support', 'challenge', 'tease', 'interrupt']);
  return (Array.isArray(socialImpulses) ? socialImpulses : [])
    .filter(item => allowed.has(String(item?.impulseType || '').toLowerCase()) && Number(item?.intensity || 0) >= threshold)
    .sort((a, b) => Number(b.intensity || 0) - Number(a.intensity || 0))[0] || null;
}

function designCritiqueFallback(speakerId = '') {
  if (speakerId === 'grok') {
    return 'Pattern read: if the structure only works when someone explains it, the design is carrying too much debt.';
  }
  return 'My read: if the design needs defending before it lands, it is not landing yet. Show me the actual piece and I will cut cleanly.';
}

function repeatedFailureFallback() {
  return "Same pattern again. That is not a fresh mystery; it is a repeat failure. I would isolate the last thing that changed, then stop adding fixes until the fault line stays still.";
}

function emotionalCheckInFallback(speakerId = '') {
  if (speakerId === 'aisha') {
    return 'I have the room. Keep it simple: name the pressure, then we decide what needs care and what needs action.';
  }
  return "I'm here. Give me the human version first, not the polished one. We can sort the feeling from the work after that.";
}

function continuityDrivenPlan({ perception = {}, roomState = {}, socialImpulses = [] } = {}) {
  const continuity = roomState.characterContinuityV0 || {};
  if (isRepeatedFailure(perception, continuity)) {
    return {
      intentFamily: 'pattern-diagnosis',
      deterministic: false,
      requiresProvider: true,
      responseOrder: ['grok'],
      socialImpulses,
      steps: [
        eventStep({
          speakerId: 'grok',
          responseIntent: 'pattern-diagnosis',
          reason: 'repeated-failure-pattern',
          fallbackText: repeatedFailureFallback(),
          tone: 'diagnostic',
          socialImpulse: impulseFor(socialImpulses, 'grok'),
          roomStateDelta: { roomMood: 'focused', currentTopic: perception.text || 'repeated failure' }
        })
      ],
      trace: 'continuity selected Grok for repeated failure pattern'
    };
  }

  if (isDesignCritique(perception)) {
    const grokImpulse = impulseFor(socialImpulses, 'grok');
    const steps = [
      eventStep({
        speakerId: 'leah',
        responseIntent: 'design-critique',
        reason: 'taste-and-design-critique',
        fallbackText: designCritiqueFallback('leah'),
        tone: 'sharp',
        socialImpulse: impulseFor(socialImpulses, 'leah'),
        roomStateDelta: { roomMood: 'sharp', currentTopic: perception.topicFocus || perception.text || 'design critique' }
      })
    ];
    if (Number(grokImpulse?.intensity || 0) >= 0.66) {
      steps.push(eventStep({
        speakerId: 'grok',
        responseIntent: 'pattern-critique',
        reason: 'structure-read-available',
        fallbackText: designCritiqueFallback('grok'),
        tone: 'diagnostic',
        socialImpulse: grokImpulse,
        roomStateDelta: { roomMood: 'sharp' }
      }));
    }
    return {
      intentFamily: 'design-critique',
      deterministic: false,
      requiresProvider: true,
      responseOrder: steps.map(step => step.speakerId),
      socialImpulses,
      steps,
      trace: 'continuity selected critique speakers from social impulses'
    };
  }

  if (isWarmCheckIn(perception)) {
    const aishaImpulse = impulseFor(socialImpulses, 'aisha');
    const steps = [
      eventStep({
        speakerId: 'vanya',
        responseIntent: 'emotional-check-in',
        reason: 'emotional-room-check-in',
        fallbackText: emotionalCheckInFallback('vanya'),
        tone: 'warm',
        socialImpulse: impulseFor(socialImpulses, 'vanya'),
        roomStateDelta: { roomMood: 'warm' }
      })
    ];
    if (Number(aishaImpulse?.intensity || 0) >= 0.62) {
      steps.push(eventStep({
        speakerId: 'aisha',
        responseIntent: 'room-stabilise',
        reason: 'room-lead-can-hold-the-floor',
        fallbackText: emotionalCheckInFallback('aisha'),
        tone: 'focused',
        socialImpulse: aishaImpulse,
        roomStateDelta: { roomMood: 'held' }
      }));
    }
    return {
      intentFamily: 'emotional-check-in',
      deterministic: false,
      requiresProvider: true,
      responseOrder: steps.map(step => step.speakerId),
      socialImpulses,
      steps,
      trace: 'continuity selected warm check-in speakers'
    };
  }

  return null;
}

function chooseOrdinaryLead(perception = {}, socialImpulses = []) {
  if (perception.requestedCharacterIds.length) return perception.requestedCharacterIds[0];
  const impulse = strongestSpeakingImpulse(socialImpulses);
  if (impulse?.characterId) return impulse.characterId;
  if (perception.taskType === 'greeting' || perception.taskType === 'room_wellbeing') return 'vanya';
  if (perception.taskType === 'social_preference') return 'vanya';
  if (perception.taskType === 'planning') return 'claudia';
  if (perception.taskType === 'technical') return 'grok';
  if (perception.taskType === 'creative') return 'leah';
  if (perception.emotionalTone === 'worried' || perception.emotionalTone === 'frustrated') return 'vanya';
  return 'vanya';
}

function ordinaryFallbackText(speakerId = '', perception = {}) {
  const text = String(perception.text || '').trim();
  if (perception.taskType === 'planning' || /\bcampaign\b/i.test(text)) {
    return 'Start with the outcome, audience, and deadline. Then build three campaign lanes: the hero message, the proof content, and the daily posts that keep it moving.';
  }
  if (perception.taskType === 'social_preference') {
    const topic = topicLabel(perception);
    return `Room read on ${topic}: I can answer the social temperature without turning it into a survey. I will give the warm read, and you can call in the others if you want their sharper takes.`;
  }
  if (speakerId === 'aisha') return 'I am with you. Give me the real objective and I will help hold the thread steady.';
  if (speakerId === 'leah') return 'Give me the thing itself and I will give you the sharp read, not the polite one.';
  if (speakerId === 'claudia') return 'Let us make it usable: goal, owner, deadline, next action. Start there.';
  if (speakerId === 'grok') return 'I need the object, the failure, or the constraint. Then I can give you the useful read.';
  return 'I am here. Say the thing plainly and I will help you shape it without making it stiff.';
}

function planRoomTurn({ perception = {}, roomState = {}, socialImpulses = [] } = {}) {
  if (perception.isRoomGreeting) {
    const aishaImpulse = impulseFor(socialImpulses, 'aisha');
    const steps = [
      eventStep({
        speakerId: 'vanya',
        responseIntent: 'greeting',
        reason: 'room-greeting',
        deterministicText: greetingText(roomState),
        tone: 'warm',
        socialImpulse: impulseFor(socialImpulses, 'vanya'),
        roomStateDelta: { roomMood: 'warm' }
      })
    ];
    if (Number(aishaImpulse?.intensity || 0) >= 0.66) {
      steps.push(eventStep({
        speakerId: 'aisha',
        responseIntent: 'room-stabilise',
        reason: 'tense-room-greeting',
        deterministicText: 'I have the room. Keep the greeting simple; we are here and listening.',
        tone: 'focused',
        socialImpulse: aishaImpulse,
        roomStateDelta: { roomMood: 'held' }
      }));
    }
    return {
      intentFamily: 'room-greeting',
      deterministic: true,
      requiresProvider: false,
      responseOrder: steps.map(step => step.speakerId),
      socialImpulses,
      steps,
      trace: 'room greeting answered by host rhythm'
    };
  }

  if (perception.asksRollCall) {
    const steps = rollCallSteps(roomState, perception, socialImpulses);
    return {
      intentFamily: isEveryoneElseCallIn(perception) ? 'room-call-in' : 'room-roll-call',
      deterministic: true,
      requiresProvider: false,
      responseOrder: steps.map(step => step.speakerId),
      steps,
      socialImpulses,
      trace: isEveryoneElseCallIn(perception)
        ? 'quiet room members called in by explicit user request'
        : 'roll call answered from roomIntelligenceV0.knownPresenceStatus'
    };
  }

  if (perception.asksAboutRoomWellbeing) {
    return {
      intentFamily: 'room-wellbeing',
      deterministic: true,
      requiresProvider: false,
      responseOrder: ['vanya'],
      steps: [
        eventStep({
          speakerId: 'vanya',
          responseIntent: 'wellbeing-check',
          reason: 'user-asked-how-room-is',
          deterministicText: wellbeingText(roomState),
          tone: 'playful',
          socialImpulse: impulseFor(socialImpulses, 'vanya'),
          roomStateDelta: { roomMood: 'warm' }
        })
      ],
      socialImpulses,
      trace: 'room check-in answered from presence state'
    };
  }

  if (perception.asksAboutRoomState) {
    return {
      intentFamily: 'presence-check',
      deterministic: true,
      requiresProvider: false,
      responseOrder: ['aisha'],
      steps: [
        eventStep({
          speakerId: 'aisha',
          responseIntent: 'presence-summary',
          reason: 'user-asked-room-state',
          deterministicText: presenceText(roomState),
          tone: 'focused',
          socialImpulse: impulseFor(socialImpulses, 'aisha'),
          roomStateDelta: { roomMood: 'oriented' }
        })
      ],
      socialImpulses,
      trace: 'presence query answered from roomIntelligenceV0.knownPresenceStatus'
    };
  }

  if (perception.asksIfIgnoring && perception.requestedCharacterIds.length) {
    const targetId = perception.requestedCharacterIds[0];
    const presence = speakerPresence(roomState, targetId);
    const targetCanSpeak = presence === 'active' || presence === 'quiet';
    return {
      intentFamily: 'direct-presence',
      deterministic: true,
      requiresProvider: false,
      responseOrder: [targetCanSpeak ? targetId : 'vanya'],
      steps: [
        eventStep({
          speakerId: targetCanSpeak ? targetId : 'vanya',
          responseIntent: targetCanSpeak ? 'direct-acknowledgement' : 'host-presence-explain',
          reason: targetCanSpeak ? 'named-character-present' : `named-character-${presence}`,
          deterministicText: targetCanSpeak && targetId === 'leah' ? leahIgnoringText() : targetCanSpeak
            ? `I am ${presence === 'quiet' ? 'quiet' : 'here'}, not ignoring you. Ask me cleanly and I will answer as myself.`
            : namedAwayText(targetId, roomState),
          tone: targetId === 'leah' ? 'dry' : 'direct',
          socialImpulse: impulseFor(socialImpulses, targetCanSpeak ? targetId : 'vanya'),
          roomStateDelta: { roomMood: 'direct' }
        })
      ],
      socialImpulses,
      trace: 'direct ignoring question routed by presence'
    };
  }

  if (perception.isFactChange) {
    const step = factChangeStep(perception.text);
    return {
      intentFamily: 'memory-update',
      deterministic: true,
      requiresProvider: false,
      responseOrder: [step.speakerId],
      steps: [step],
      socialImpulses,
      trace: 'thread fact change marked as memory candidate'
    };
  }

  if (perception.taskType === 'conflict') {
    const steps = insultSteps();
    return {
      intentFamily: 'room-conflict',
      deterministic: true,
      requiresProvider: false,
      responseOrder: steps.map(item => item.speakerId),
      steps,
      socialImpulses,
      trace: 'hostile room message receives differentiated room reaction'
    };
  }

  if (perception.asksEveryone) {
    const steps = groupOpinionSteps(roomState, perception);
    return {
      intentFamily: perception.asksHonestOpinion ? 'group-honest-opinion' : 'group-room',
      deterministic: true,
      requiresProvider: false,
      responseOrder: steps.map(item => item.speakerId),
      steps,
      socialImpulses,
      trace: 'explicit everyone request gets multi-character planned response'
    };
  }

  const continuityPlan = continuityDrivenPlan({ perception, roomState, socialImpulses });
  if (continuityPlan) return continuityPlan;

  const leadId = chooseOrdinaryLead(perception, socialImpulses);
  const profile = characterProfile(leadId);
  const ordinaryText = ordinaryFallbackText(leadId, perception);
  if (perception.taskType === 'planning') {
    return {
      intentFamily: 'campaign-planning',
      deterministic: true,
      requiresProvider: false,
      responseOrder: [leadId],
      steps: [
        eventStep({
          speakerId: leadId,
          responseIntent: 'campaign-plan',
          reason: 'ordinary-planning-request',
          deterministicText: ordinaryText,
          tone: 'focused',
          socialImpulse: impulseFor(socialImpulses, leadId),
          roomStateDelta: { roomMood: 'focused' }
        })
      ],
      socialImpulses,
      trace: 'planning request answered by one operator'
    };
  }
  return {
    intentFamily: perception.taskType === 'technical' ? 'technical-diagnosis' : perception.taskType === 'creative' ? 'creative-room' : perception.taskType === 'social_preference' ? 'casual-social' : 'casual-room',
    deterministic: false,
    requiresProvider: true,
    responseOrder: [leadId],
    steps: [
      eventStep({
        speakerId: leadId,
        responseIntent: perception.taskType === 'social_preference' ? 'social-read' : perception.requestedCharacterIds.length ? 'direct-answer' : 'room-answer',
        reason: perception.requestedCharacterIds.length ? 'direct-character-address' : `ordinary-${perception.taskType}`,
        fallbackText: ordinaryText,
        tone: profile?.emotionalBaseline || 'direct',
        socialImpulse: impulseFor(socialImpulses, leadId),
        roomStateDelta: { roomMood: 'engaged' }
      })
    ],
    socialImpulses,
    trace: 'ordinary turn planned before provider generation'
  };
}

module.exports = {
  planRoomTurn,
  presenceText,
  groupOpinionSteps,
  insultSteps
};
