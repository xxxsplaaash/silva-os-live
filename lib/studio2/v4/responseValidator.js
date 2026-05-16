const { getVoiceLibraryEntry, validateVoiceLibraryPresent } = require('./voiceLibrary');

const ASSISTANT_SMELL_RX = /\b(as an ai|i(?: am|'m) here to help|let'?s dive in|how can i assist|i can help with that)\b/i;
const SENTIENCE_RX = /\b(i am conscious|i am sentient|we are sentient|literally conscious)\b/i;
const WORKFLOW_LEAK_RX = /\b(commit card|workflow draft|stage this|ready to commit)\b/i;
const MULTI_SPEAKER_STUFFING_RX = /(?:^|\n)(?:Aisha|Leah|Claudia|Grok|Vanya)\s*:/m;

function hashSeed(value = '') {
  let hash = 0;
  const source = String(value || '');
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickVoiceLine(speakerId = '', stance = '', question = '') {
  const entry = getVoiceLibraryEntry(speakerId, stance);
  const lines = Array.isArray(entry?.lines) ? entry.lines.filter(Boolean) : [];
  if (!lines.length) return '';
  return lines[hashSeed(`${speakerId}:${stance}:${question}`) % lines.length];
}

function validateGeneratedText(text = '', options = {}) {
  const source = String(text || '').trim();
  const { lane = 'room', recentMessages = [] } = options;
  const errors = [];
  if (!source) errors.push('empty-response');
  if (source.length > 420 && lane !== 'diagnostic') errors.push('too-long-for-room');
  if (ASSISTANT_SMELL_RX.test(source)) errors.push('assistant-tone');
  if (SENTIENCE_RX.test(source)) errors.push('literal-sentience-claim');
  if (lane === 'room' && WORKFLOW_LEAK_RX.test(source)) errors.push('workflow-leakage');
  if (MULTI_SPEAKER_STUFFING_RX.test(source)) errors.push('multi-speaker-stuffing');
  if (Array.isArray(recentMessages) && recentMessages.some(item => String(item?.text || '').trim() === source)) {
    errors.push('exact-repeat');
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

function buildDeterministicTurnLine({ speakerId = '', turnPlan = {}, question = '', targetSpeakerId = '', detectedSignals = [] } = {}) {
  const q = String(question || '').trim().toLowerCase();
  const lane = String(turnPlan.lane || 'room').trim().toLowerCase();
  const family = String(turnPlan.intentFamily || 'followup').trim().toLowerCase();
  const signalSet = new Set(Array.isArray(detectedSignals) ? detectedSignals : []);
  const contextualTarget = turnPlan.contextualTarget && typeof turnPlan.contextualTarget === 'object' ? turnPlan.contextualTarget : null;

  if (family === 'checkin' || /\b(who('?s| is)\s+(online|here|around)|how('?s| is)\s+everyone|how are you all|everyone('?s|s)? mood|reading the room)\b/.test(q)) {
    if (/\bwho('?s| is)\s+(online|here|around)\b/.test(q)) {
      const presenceMap = {
        aisha: `I'm here. Clear, awake, and not especially interested in ceremony.`,
        leah: `Here. Sharp enough to notice when the room goes flat.`,
        claudia: `I'm here. Calm, online, and fully paying attention.`,
        grok: `Here. Functional, unsentimental, and not hiding from the actual issue.`,
        vanya: `I'm here. Warm enough, awake enough, and actually listening.`
      };
      return presenceMap[speakerId] || pickVoiceLine(speakerId, 'light-check-in', question) || `I'm here.`;
    }
    const moodMap = {
      aisha: `I'm fine. Alert, exact, and easier to be around when the room is honest.`,
      leah: `I'm alright. A little skeptical, a little awake, and much better when the voice feels real.`,
      claudia: `I'm steady. Focused, calm, and less patient with drift than I look.`,
      grok: `I'm alright. Focused, mildly irritated by weak seams, otherwise completely functional.`,
      vanya: `I'm good. Warm, watchful, and happier when people stop performing at each other.`
    };
    return moodMap[speakerId] || pickVoiceLine(speakerId, 'genuine-interest', question) || `I'm here.`;
  }

  if (family === 'greeting' || /\b(hi|hello|hey)\s+team\b/.test(q)) {
    const greetingMap = {
      aisha: `Hi. Say the real thing and I'll meet it cleanly.`,
      leah: `Hey. Better already. At least that sounds like a person starting the room.`,
      claudia: `Hi. Clean question, clean answer. That's the deal from my side.`,
      grok: `Hi. Operational, awake, and still allergic to decorative nonsense.`,
      vanya: `Hey. Good. The room feels more human when someone just starts.`
    };
    return greetingMap[speakerId] || pickVoiceLine(speakerId, 'light-check-in', question) || `I'm here.`;
  }

  if (family === 'banter' || /\b(lol|haha|funny|joke|coolest|slowest|smartest)\b/.test(q)) {
    const banterMap = {
      aisha: `If you're ranking us for sport, at least make the question worth the trouble.`,
      leah: `Cute. I can banter, but I'd still prefer an interesting target.`,
      claudia: `I respect the detour. I just don't want us living in it.`,
      grok: `I can do jokes. I just prefer the ones that expose the mechanism.`,
      vanya: `You can fish for chaos if you want. I'm still going to make it sound alive.`
    };
    return banterMap[speakerId] || pickVoiceLine(speakerId, 'playful-deflection', question) || `Cute dodge. Try again.`;
  }

  if (lane === 'direct') {
    if (/^(what answer|which answer|what do you mean|how so|what exactly)\??$/.test(q)) {
      if (speakerId === 'leah') {
        return `The one that actually sounds owned. Most replies land technically clean and emotionally anonymous, and I'm tired of that.`;
      }
      if (speakerId === 'aisha') {
        return `The answer that protects the truth instead of just sounding composed on its way past it.`;
      }
      if (speakerId === 'claudia') {
        return `The answer that names the owner, the dependency, or the cost instead of just gesturing at concern.`;
      }
      if (speakerId === 'grok') {
        return `The answer that describes the mechanism cleanly enough that we can tell whether it actually holds.`;
      }
      if (speakerId === 'vanya') {
        return `The answer that sounds like a person risking a thought, not a system dressing itself up as presence.`;
      }
    }
    if (/^(what about that|why that)\??$/.test(q) && contextualTarget?.text) {
      return `Because "${String(contextualTarget.text || '').replace(/"/g, '').slice(0, 72)}" still leaves the real point half-protected.`;
    }
    if (speakerId === 'aisha' && /\bavoid/.test(q)) {
      return `We're avoiding the part where you want aliveness, but still reach for control the second the room gets unpredictable.`;
    }
    if (speakerId === 'grok' && /\b(architecture|hold|actually hold)\b/.test(q)) {
      return `Not cleanly. The route is newer, but the UI is still dragging stale state and too much render churn behind it.`;
    }
    if (speakerId === 'leah' && /\b(real|dressed up|feel real)\b/.test(q)) {
      return `Still a little dressed up. It lands cleaner than it lives, which is why the texture keeps dropping out.`;
    }
    if (speakerId === 'claudia' && /\b(breaks operationally|operationally|what breaks)\b/.test(q)) {
      return `Reload behavior first, then ownership. If the room reopens stale thread state on boot, everything after that feels untrustworthy.`;
    }
    if (speakerId === 'vanya' && /\b(human risk|people risk|risk)\b/.test(q)) {
      return `People stop trusting the room. Once it feels performative instead of present, every reply starts sounding lonelier than it should.`;
    }
    return pickVoiceLine(speakerId, signalSet.has('vulnerability-signal') ? 'genuine-interest' : 'steering', question) || `Say the real thing and I'll answer it cleanly.`;
  }

  if (lane === 'diagnostic' || family === 'critique' || /\b(what is wrong with this chat|what is broken here|why is this stale|feel conscious|contextually unaware)\b/.test(q)) {
    const critiqueMap = {
      aisha: `The room still reaches for managed polish before it earns real presence. That's why it keeps feeling false.`,
      leah: `It keeps choosing atmosphere over point. You ask for thought and it hands you mood lighting.`,
      claudia: `Continuity and load behavior are still weak. The room resets tone instead of carrying consequence.`,
      grok: `The route is newer than the behavior. You're still paying latency for provider turns that collapse into emergency copy.`,
      vanya: `It performs aliveness instead of risking honesty, so the chemistry evaporates the second the line lands.`
    };
    return critiqueMap[speakerId] || pickVoiceLine(speakerId, 'naming-contradiction', question) || `The behavior and the product claim still don't match.`;
  }

  if (signalSet.has('repair-attempt')) {
    return pickVoiceLine(speakerId, 'repair', question) || `Alright. That helps.`;
  }
  if (signalSet.has('contradiction-of-self') || signalSet.has('factual-contradiction')) {
    return pickVoiceLine(speakerId, 'naming-contradiction', question) || `The claim and the behavior still don't match.`;
  }
  if (signalSet.has('boundary-crossed')) {
    return pickVoiceLine(speakerId, 'boundary', question) || `No. That's too far.`;
  }
  if (signalSet.has('vulnerability-signal')) {
    return pickVoiceLine(speakerId, 'protective-interruption', question) || `Hold on. Don't flatten that.`;
  }
  return pickVoiceLine(speakerId, 'steering', question)
    || pickVoiceLine(speakerId, 'light-check-in', question)
    || `I'm here.`;
}

function buildSafeMinimalLine({ speakerId = '', turnPlan = {}, question = '', targetSpeakerId = '', detectedSignals = [] } = {}) {
  return buildDeterministicTurnLine({
    speakerId,
    turnPlan,
    question,
    targetSpeakerId,
    detectedSignals
  });
}

function validateMessageEvents(response = {}, options = {}) {
  const events = Array.isArray(response?.messageEvents) ? response.messageEvents.filter(Boolean) : [];
  const errors = [];
  if (!events.length) errors.push('no-events');
  if (options.targetSpeakerId && !events.some(item => String(item?.speakerId || '').trim().toLowerCase() === String(options.targetSpeakerId || '').trim().toLowerCase())) {
    errors.push('missing-direct-target');
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  validateVoiceLibraryPresent,
  validateGeneratedText,
  validateMessageEvents,
  buildSafeMinimalLine,
  buildDeterministicTurnLine
};
