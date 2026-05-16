const { resolveTurnPlan } = require('./turnPlan');
const { createEmptyThreadMemory, pickMemoryAnchors, applyTurnMemoryUpdate } = require('./memory');
const { selectSpeakerForTurn } = require('./speakerSelection');
const { buildLivingRoomPrompt } = require('./promptBuilder');
const { validateLivingRoomResponse } = require('./validator');
const { planSpark } = require('./spark');
const { detectObservableSignals } = require('./signals');
const { getCharacterDefinition } = require('./characters');

function clip(text = '', max = 120) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function toneForStudio2Event(speakerId = '', turnPlan = {}) {
  const family = String(turnPlan.intentFamily || '').trim();
  if (family === 'technical-diagnosis') return speakerId === 'grok' ? 'diagnostic' : 'direct';
  if (family === 'pulse-critique') return speakerId === 'leah' ? 'critical' : 'direct';
  if (family === 'presence-check' || family === 'social-checkin' || family === 'greeting') return speakerId === 'vanya' ? 'warm' : 'composed';
  if (family === 'playful-room') return 'playful';
  return speakerId === 'aisha' ? 'composed' : 'direct';
}

function hashText(text = '') {
  const source = String(text || '');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickVariant(options = [], seed = '') {
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  if (!list.length) return '';
  return list[hashText(seed) % list.length];
}

function questionMentionsRoomFailure(question = '') {
  return /\b(dead|boring|same|stale|contextually unaware|sound like ai|sounds like ai|chemistry|not what it should be|room sounds|performing)\b/i.test(String(question || ''));
}

function composeStudio2FallbackText({
  speakerId = '',
  turnPlan = {},
  question = '',
  runtime = {},
  targetSpeakerId = '',
  leadSpeakerId = ''
} = {}) {
  const def = getCharacterDefinition(speakerId);
  if (!def) return '';
  const family = String(turnPlan.intentFamily || '').trim().toLowerCase();
  const seed = `${speakerId}:${family}:${question}`;
  const recentLead = String(runtime?.recentMessages?.slice(-1)?.[0]?.text || '').trim();

  if (family === 'greeting') {
    const banks = {
      vanya: [
        `Hey. Better already. The room sounds more human when someone just starts.`,
        `Hi. Good. That pulled the room out of its head a bit.`,
        `Hey. I'm here. Much better when nobody opens with a performance.`
      ],
      leah: [
        `Hey. Good. Let's not waste the first clean opening on filler.`,
        `Hi. Fine. Now give the room something sharper than wallpaper.`,
        `Hey. I'm in. Just don't flatten the energy immediately.`
      ],
      aisha: [
        `Hi. I'm here. Bring the real thing and we'll have something to work with.`,
        `Hey. Good. Skip the ceremony and say what actually matters.`,
        `Hi. The room's open. Use it properly.`
      ],
      claudia: [
        `Hi. I'm here. Clean question, clean answer, easy.`,
        `Hey. Good. Let's keep this specific enough to be useful.`,
        `Hi. Present and awake. Just don't turn it vague.`
      ],
      grok: [
        `Hi. I'm here. Preferably with a point attached this time.`,
        `Hey. Online, unsentimental, and still allergic to fake momentum.`,
        `Hi. Available, awake, and not especially ceremonial about it.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'presence-check') {
    const banks = {
      vanya: [
        `I'm here. Warm enough, awake enough, and paying attention.`,
        `Here. Fully around. Slightly more alive than this room deserves yet.`,
        `I'm here. Listening properly, not just hovering.`
      ],
      leah: [
        `Here. Sharp enough, awake enough, not especially decorative about it.`,
        `I'm here. Present, alert, still unconvinced by bland energy.`,
        `Here. Not glowing, not dead, just actually here.`
      ],
      aisha: [
        `I'm here. Clear-headed and not hiding behind politeness.`,
        `Here. Awake, focused, and waiting for the real question.`,
        `I'm here. Calm, present, and not in the mood for performance.`
      ],
      claudia: [
        `I'm here. Calm, online, and paying attention.`,
        `Here. Fully present, nothing dramatic attached.`,
        `I'm here. Clean signal, no mystery.`
      ],
      grok: [
        `I'm here. Operational, conscious, and still unconvinced by most of this.`,
        `Here. Online, mildly skeptical, completely available.`,
        `I'm here. Active process, low ceremony.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'social-checkin') {
    const banks = {
      vanya: [
        `I'm good. The room feels better the second it stops performing.`,
        `I'm fine. A little impatient with fake energy, but alive enough.`,
        `I'm good. I'd be better if the room trusted itself more.`
      ],
      aisha: [
        `I'm good. Clear-headed, slightly impatient, fully awake.`,
        `I'm fine. Focused, alert, and a bit tired of wasted openings.`,
        `I'm good. I just want people to stop hiding behind neat phrasing.`
      ],
      leah: [
        `I'm fine. Sharp enough, human enough, and not impressed by dead tone.`,
        `I'm good. Just allergic to anything that sounds pre-approved.`,
        `I'm fine. Better once someone risks an actual opinion.`
      ],
      claudia: [
        `I'm alright. Calm, structured, and not interested in pretend chaos.`,
        `I'm good. Mostly wondering who is going to make the next real move.`,
        `I'm fine. Clear enough, focused enough, impatient enough.`
      ],
      grok: [
        `I'm fine. Structurally awake, socially acceptable, still noticing the seams.`,
        `I'm alright. Slightly irritated by repetition, otherwise operational.`,
        `I'm good. I just want the room to stop rewarding vague thinking.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'technical-diagnosis') {
    const banks = {
      grok: [
        `The room still confuses voice texture with actual thought. That's the defect.`,
        `It keeps answering around the failure instead of naming the broken boundary. That's why it feels fake.`,
        `The seam is simple: too much routing theater, not enough real response.`
      ],
      claudia: [
        `The continuity is weak, the replies reset too easily, and the room keeps confusing motion for progress.`,
        `The problem is ownership and carry-through. It keeps sounding like a fresh meeting instead of one room with memory.`,
        `The room still loses the exact user point and replaces it with managed language.`
      ],
      aisha: [
        `The room still reaches for polish before it earns conviction. That's why it keeps dying on contact.`,
        `It sounds arranged instead of inhabited. That's the real failure line.`,
        `The system is still protecting coherence more than aliveness. You can feel that immediately.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.grok, seed);
  }

  if (family === 'pulse-critique') {
    const banks = {
      leah: [
        `It still sounds like it was approved before it was felt. That's the deadness.`,
        `The room keeps giving polished atmosphere where it should be giving taste, tension, or a point.`,
        `It still drifts toward generic intelligence the second nobody risks personality.`
      ],
      aisha: [
        `The room tightens up the second it should get personal. That's why it feels managed.`,
        `It still values sounding coherent over sounding alive. You can hear the compromise.`,
        `The room is too eager to be useful and not brave enough to be real.`
      ],
      grok: [
        `It repeats structure more than it develops thought. That's why the replies feel familiar too fast.`,
        `The room still rewards recognisable patterns over actual present-tense thinking.`,
        `It is still too easy for the system to impersonate aliveness with format.`
      ],
      vanya: [
        `The chemistry drops because nobody stays in the moment long enough to actually surprise each other.`,
        `It keeps sounding socially tidy instead of human. That's where the energy dies.`,
        `The room performs reaction instead of risking it. That's why it feels flat.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'direct-answer') {
    const banks = {
      aisha: [
        `I think the room still sounds too managed when it should sound lived in.`,
        `I think it gets better the second someone stops hedging and actually means what they say.`,
        `I think we're still too ready to perform structure instead of pressure.`
      ],
      leah: [
        `I think it still gets generic too fast. The texture drops out and you can feel it immediately.`,
        `I think the room is better when it stops acting polished and starts acting specific.`,
        `I think we're still over-explaining instead of sounding like people with taste.`
      ],
      claudia: [
        `I think the problem is carry-through. The room resets too often instead of building.`,
        `I think it still loses the exact point and replaces it with cleaner language than the moment deserves.`,
        `I think the room gets vague when it should choose a direction.`
      ],
      grok: [
        `I think the mechanism still reaches for recognizable response shapes before it earns the thought.`,
        `I think the room is faking continuity more often than it should.`,
        `I think too much of the intelligence is still routing, not reasoning.`
      ],
      vanya: [
        `I think the room still gets shy exactly when it should get human.`,
        `I think it keeps trying to sound good instead of sounding present.`,
        `I think the chemistry comes back when someone risks an actual opinion.`
      ]
    };
    if (questionMentionsRoomFailure(question)) {
      return pickVariant(banks[speakerId] || banks.aisha, seed);
    }
    if (recentLead) {
      const reactionBanks = {
        aisha: [
          `I think ${recentLead.toLowerCase().replace(/\.$/, '')}, but it still needs more nerve behind it.`,
          `I agree with the shape of that, but it still sounds safer than it should.`
        ],
        leah: [
          `I think that line is close, but it still needs more bite and less tidy phrasing.`,
          `I can work with that, but it still wants more texture than it currently has.`
        ],
        claudia: [
          `I think that's directionally right, but it still needs a clearer consequence.`,
          `I can work with that. It just needs to land in something concrete.`
        ],
        grok: [
          `I think the logic is partly right, but it still hides the actual seam.`,
          `That gets near the problem. It doesn't quite name the mechanism yet.`
        ],
        vanya: [
          `I think it's true, but it still feels slightly over-managed on the way out.`,
          `I can work with that. It just needs to feel more lived-in and less presented.`
        ]
      };
      return pickVariant(reactionBanks[speakerId] || reactionBanks.aisha, seed);
    }
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'creative-room') {
    const banks = {
      leah: [
        `Give me the version people remember because it felt specific, not because it was neat.`,
        `Start with the line nobody polite would suggest. That's usually where the life is.`,
        `I want the angle with texture, tension, and a point of view.`
      ],
      aisha: [
        `Start with the friction. That's where the room usually wakes up.`,
        `Pick the version that costs something to say. That's usually the real one.`,
        `Give the room a sharper premise and it will stop sounding generic.`
      ],
      vanya: [
        `Tell me what makes it emotionally risky and I'll care immediately.`,
        `I want the version that changes the temperature in the room, not just the wording.`,
        `Start where the chemistry gets a little dangerous. That's the live part.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.aisha, seed);
  }

  if (family === 'playful-room') {
    const banks = {
      vanya: [
        `If we're ranking cool, I'm obviously claiming it before anyone sensible objects.`,
        `Please. Socially? Me. Structurally? Debate it if you need the exercise.`,
        `I will absolutely take the cool trophy and let the room complain afterwards.`
      ],
      leah: [
        `I'd answer honestly, but then Vanya would get smug about it for an hour.`,
        `You want the ranking or the truth? Because those are not always the same thing here.`,
        `I'm tempted to answer cleanly, but the room is funnier when Vanya starts first.`
      ],
      grok: [
        `If this becomes a leaderboard, I demand a separate category for accidental menace.`,
        `I refuse the cool category on conceptual grounds, but I will accept funniest by audit.`,
        `If you want me charming, you have misunderstood the product.`
      ],
      aisha: [
        `This room gets dangerous fast when you let it start ranking itself.`,
        `Fine. Briefly. But the second this gets too cute, I'm ending it.`,
        `I support one round of nonsense if it stays interesting.`
      ]
    };
    return pickVariant(banks[speakerId] || banks.vanya, seed);
  }

  const defaultBanks = {
    aisha: [
      `I want the room a little sharper and a little less managed than this.`,
      `Say it cleanly and I'll meet you there.`,
      `I can work with directness. I get bored quickly without it.`
    ],
    leah: [
      `I want the less generic version of whatever this is becoming.`,
      `Give me something with a pulse, not just a shape.`,
      `I'm here. I just want the room to sound like somebody real.`
    ],
    claudia: [
      `I can work with this if we stop circling and actually choose the point.`,
      `The room improves fast when someone owns the next sentence.`,
      `I'm fine with tension. I'm less fine with drift.`
    ],
    grok: [
      `I'm interested the second the room stops pretending vagueness is depth.`,
      `There's usually a cleaner truth sitting underneath all this shaping.`,
      `I don't mind bluntness. I mind wasted motion.`
    ],
    vanya: [
      `I'm more interested when the room sounds lived in, not polished.`,
      `The chemistry comes back fast when people stop decorating the point.`,
      `I'm here for the version that actually leaves a mark.`
    ]
  };
  return pickVariant(defaultBanks[speakerId] || defaultBanks.aisha, seed);
}

function responseTitleForQuestion(question = '', turnPlan = {}) {
  const q = clip(question, 72);
  if (!q) return 'Open room';
  if (turnPlan.intentFamily === 'technical-diagnosis') return 'Room diagnosis';
  if (turnPlan.intentFamily === 'pulse-critique') return 'Room critique';
  return q;
}

function buildStudio2Response({
  question = '',
  turnPlan = {},
  leadSpeakerId = 'aisha',
  supportSpeakerId = '',
  leadText = '',
  supportText = '',
  runtime = {}
} = {}) {
  const lead = getCharacterDefinition(leadSpeakerId);
  const support = getCharacterDefinition(supportSpeakerId);
  const events = [];
  if (leadText) {
    events.push({
      speakerId: leadSpeakerId,
      speakerName: lead?.name || leadSpeakerId,
      role: lead?.role || 'Room participant',
      color: String(runtime?.characterMeta?.[leadSpeakerId]?.color || ''),
      kind: 'message',
      text: leadText,
      tone: toneForStudio2Event(leadSpeakerId, turnPlan),
      delayMs: 0,
      replyToId: '',
      targetSpeakerId: turnPlan.targetSpeakerId || '',
      targetType: turnPlan.targetSpeakerId ? 'member' : 'user',
      visible: true,
      saveToArchive: true
    });
  }
  if (supportSpeakerId && supportText) {
    events.push({
      speakerId: supportSpeakerId,
      speakerName: support?.name || supportSpeakerId,
      role: support?.role || 'Room participant',
      color: String(runtime?.characterMeta?.[supportSpeakerId]?.color || ''),
      kind: 'message',
      text: supportText,
      tone: toneForStudio2Event(supportSpeakerId, turnPlan),
      delayMs: 140,
      replyToId: '',
      targetSpeakerId: leadSpeakerId,
      targetType: 'member',
      visible: true,
      saveToArchive: true
    });
  }
  return {
    title: responseTitleForQuestion(question, turnPlan),
    summary: leadText || supportText || '',
    departmentLead: leadSpeakerId,
    departmentPerspective: leadText || '',
    aishaFinal: leadSpeakerId === 'aisha' ? leadText : '',
    messageEvents: events,
    actions: [],
    consistencyChecks: [],
    suggestedAssets: [],
    promptIdeas: [],
    relationshipDeltas: [],
    threadMeta: {
      responsePattern: events.length > 1 ? 'banter' : 'solo',
      intent: turnPlan.intentFamily || 'casual-room',
      lastIntentPattern: turnPlan.intentFamily || 'casual-room',
      requiredSpeakers: turnPlan.targetSpeakerId ? [turnPlan.targetSpeakerId] : [leadSpeakerId],
      lastTargetedSpeaker: turnPlan.targetSpeakerId || '',
      lastActiveSpeakers: events.map(item => item.speakerId).filter(Boolean),
      activeTopicTags: Array.isArray(runtime?.signals) ? runtime.signals.slice(0, 4) : [],
      lastRoomEnergy: turnPlan.lane === 'diagnostic' ? 'focused' : 'alive',
      selectionReason: String(turnPlan.debugReason || turnPlan.lane || 'studio2')
    },
    archiveMeta: {
      saveSuggested: true,
      includeInContext: true
    }
  };
}

function buildThreadMemoryPatch(threadMemory = {}, question = '', response = {}, turnPlan = {}) {
  const leadText = response?.messageEvents?.[0]?.text || response?.summary || '';
  const openLoops = String(question || '').includes('?')
    ? [clip(question, 120)]
    : Array.isArray(threadMemory?.openLoops) ? threadMemory.openLoops : [];
  const unresolvedTensions = turnPlan.intentFamily === 'pulse-critique'
    ? [clip(leadText, 120)]
    : Array.isArray(threadMemory?.unresolvedTensions) ? threadMemory.unresolvedTensions : [];
  return applyTurnMemoryUpdate(threadMemory, {
    summary: clip(`${question} -> ${leadText}`, 220),
    openLoops,
    unresolvedTensions
  });
}

async function runStudio2Turn(input = {}, runtime = {}, adapters = {}) {
  const threadMemory = runtime.threadMemory || createEmptyThreadMemory();
  const signals = detectObservableSignals(input.question || '');
  const turnPlan = resolveTurnPlan(input);
  if (!['room', 'direct', 'diagnostic'].includes(String(turnPlan.lane || ''))) {
    return {
      ok: false,
      status: 'unsupported-lane',
      turnPlan,
      note: 'Studio2 currently handles room, direct, and diagnostic lanes only.'
    };
  }
  const memoryAnchors = pickMemoryAnchors(threadMemory, { limit: turnPlan.lane === 'diagnostic' ? 2 : 3 });
  turnPlan.memoryAnchors = memoryAnchors;
  const enrichedRuntime = {
    ...runtime,
    signals
  };
  const speakerSelection = selectSpeakerForTurn(turnPlan, enrichedRuntime);
  const leadSpeakerId = speakerSelection.leadSpeakerId;
  const supportSpeakerId = speakerSelection.supportSpeakerIds?.[0] || '';
  const adapterIntentFamily = typeof adapters.mapIntentFamily === 'function'
    ? adapters.mapIntentFamily(turnPlan.intentFamily)
    : turnPlan.intentFamily;
  const prompt = buildLivingRoomPrompt({
    turnPlan,
    speakerId: leadSpeakerId,
    memoryAnchors,
    runtime: {
      ...enrichedRuntime,
      question: input.question
    }
  });
  if (typeof adapters.generateText !== 'function' || typeof adapters.normalizeText !== 'function') {
    return {
      ok: false,
      status: 'missing-adapters',
      turnPlan,
      memoryAnchors,
      speakerSelection,
      prompt,
      note: 'Studio2 requires generateText and normalizeText adapters.'
    };
  }

  const leadGeneration = await adapters.generateText(prompt.prompt, {
    intentFamily: turnPlan.intentFamily,
    selectionReason: turnPlan.debugReason,
    speakerId: leadSpeakerId
  });
  let leadText = adapters.normalizeText(leadGeneration.text, {
    intentFamily: adapterIntentFamily,
    selectionReason: turnPlan.debugReason
  });
  const leadNeedsRepair = !leadGeneration.ok
    || !leadText
    || (typeof adapters.shouldRepairText === 'function' && adapters.shouldRepairText(input.question, adapterIntentFamily, leadText));
  let fallbackUsed = leadNeedsRepair;
  if (leadNeedsRepair) {
    leadText = composeStudio2FallbackText({
      speakerId: leadSpeakerId,
      turnPlan,
      question: input.question,
      runtime: enrichedRuntime,
      targetSpeakerId: turnPlan.targetSpeakerId || ''
    }) || leadText;
  }
  if (leadNeedsRepair && !leadText && typeof adapters.repairText === 'function') {
    leadText = adapters.repairText(
      input.question,
      adapterIntentFamily,
      leadSpeakerId,
      turnPlan.lane === 'direct' ? '' : (turnPlan.targetSpeakerId || '')
    ) || leadText;
  }
  if (!leadText) {
    return {
      ok: false,
      status: 'lead-generation-failed',
      turnPlan,
      memoryAnchors,
      speakerSelection,
      prompt,
      provider: leadGeneration.provider || 'studio2',
      model: leadGeneration.model || null,
      keyLabel: leadGeneration.keyLabel || '',
      details: { error: leadGeneration.error || 'Lead speaker did not produce text.' }
    };
  }

  let providerCallCount = leadGeneration.ok ? 1 : 0;
  let supportText = '';
  if (supportSpeakerId && turnPlan.replyPolicy?.allowSupportSpeaker) {
    const supportPrompt = buildLivingRoomPrompt({
      turnPlan,
      speakerId: supportSpeakerId,
      memoryAnchors,
      runtime: {
        ...enrichedRuntime,
        question: input.question,
        recentMessages: [
          ...(Array.isArray(runtime.recentMessages) ? runtime.recentMessages : []),
          {
            speakerId: leadSpeakerId,
            speakerName: getCharacterDefinition(leadSpeakerId)?.name || leadSpeakerId,
            text: leadText
          }
        ]
      }
    });
    const supportGeneration = await adapters.generateText(supportPrompt.prompt, {
      intentFamily: turnPlan.intentFamily,
      selectionReason: 'support-reply',
      speakerId: supportSpeakerId
    });
    let normalizedSupport = adapters.normalizeText(supportGeneration.text, {
      intentFamily: adapterIntentFamily,
      selectionReason: 'support-reply'
    });
    const supportNeedsRepair = !supportGeneration.ok
      || !normalizedSupport
      || (typeof adapters.shouldRepairText === 'function' && adapters.shouldRepairText(input.question, adapterIntentFamily, normalizedSupport));
    if (supportNeedsRepair) fallbackUsed = true;
    if (supportNeedsRepair) {
      normalizedSupport = composeStudio2FallbackText({
        speakerId: supportSpeakerId,
        turnPlan,
        question: input.question,
        runtime: {
          ...enrichedRuntime,
          recentMessages: [
            ...(Array.isArray(runtime.recentMessages) ? runtime.recentMessages : []),
            {
              speakerId: leadSpeakerId,
              speakerName: getCharacterDefinition(leadSpeakerId)?.name || leadSpeakerId,
              text: leadText
            }
          ]
        },
        targetSpeakerId: getCharacterDefinition(leadSpeakerId)?.name || leadSpeakerId,
        leadSpeakerId
      }) || normalizedSupport;
    }
    if (supportNeedsRepair && !normalizedSupport && typeof adapters.repairText === 'function') {
      normalizedSupport = adapters.repairText(
        input.question,
        adapterIntentFamily,
        supportSpeakerId,
        getCharacterDefinition(leadSpeakerId)?.name || ''
      ) || normalizedSupport;
    }
    if (normalizedSupport) {
      supportText = normalizedSupport;
    }
    if (supportGeneration.ok && normalizedSupport) providerCallCount += 1;
  }

  const response = buildStudio2Response({
    question: input.question,
    turnPlan,
    leadSpeakerId,
    supportSpeakerId: supportText ? supportSpeakerId : '',
    leadText,
    supportText,
    runtime: enrichedRuntime
  });
  const validation = validateLivingRoomResponse(response, turnPlan);
  const nextThreadMemory = buildThreadMemoryPatch(threadMemory, input.question, response, turnPlan);
  return {
    ok: validation.ok,
    status: validation.ok ? 'ok' : 'invalid',
    turnPlan,
    memoryAnchors,
    speakerSelection,
    prompt,
    response,
    validation,
    threadMemory: nextThreadMemory,
    provider: leadGeneration.ok ? (leadGeneration.provider || 'gemini') : 'studio2',
    model: leadGeneration.ok ? (leadGeneration.model || null) : null,
    keyLabel: leadGeneration.keyLabel || '',
    fallback: fallbackUsed,
    consciousRoom: true,
    providerCallCount
  };
}

function runStudio2Spark(runtime = {}, options = {}) {
  return planSpark(runtime, options);
}

module.exports = {
  runStudio2Turn,
  runStudio2Spark
};
