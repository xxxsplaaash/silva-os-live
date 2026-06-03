const {
  directAddressTarget,
  explicitEveryoneRequested,
  openFloorRequested
} = require('./socialDirectorTypes');

function speaker(speakerId, role, tone, text, visibleState = 'Watching') {
  return { speakerId, role, tone, text, visibleState };
}

function reaction(speakerId, visibleState) {
  return { speakerId, visibleState };
}

function recentText(body = {}) {
  return (Array.isArray(body.recentTurns) ? body.recentTurns : Array.isArray(body.history) ? body.history : [])
    .map(item => `${item?.speakerId || item?.role || ''}: ${item?.text || item?.content || ''}`)
    .join('\n');
}

function recentItems(body = {}) {
  return (Array.isArray(body.recentTurns) ? body.recentTurns : Array.isArray(body.history) ? body.history : []);
}

function recentAssistantText(body = {}) {
  return recentItems(body)
    .filter(item => !/^user$/i.test(String(item?.speakerId || item?.role || '')))
    .slice(-4)
    .map(item => String(item?.text || item?.content || ''))
    .join('\n');
}

function currentTopic(text = '') {
  if (openFloorRequested(text, {})) return 'open_floor';
  if (/\b(what should (we|the room) watch next|watch next|what next for the room)\b/i.test(text)) return 'watch_next';
  if (/\b(what changed|what was changed|what did .*change|changed\?|difference|previous|superseded|before)\b/i.test(text)) return 'continuity_change';
  if (/\b(hungry|food|eat|lunch|dinner|snack|meal|nutrition)\b/i.test(text)) return 'food';
  if (/\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein)\b/i.test(text)) return 'fitness';
  if (/\b(content calendar|design client|campaign|logo|creative|plan|planning|schedule)\b/i.test(text)) return 'work';
  return '';
}

function normalizedPrompt(text = '') {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isTerseFollowup(text = '') {
  return /^(where do i start|what is the objective|bruh|bro|wtf|ok|okay|now what|what next|how)$/i.test(normalizedPrompt(text));
}

function hasFitnessContext(text = '', body = {}) {
  if (currentTopic(text) && currentTopic(text) !== 'fitness') return false;
  if (!isTerseFollowup(text) && currentTopic(text) !== 'fitness') return false;
  const joined = `${text}\n${recentText(body)}`;
  return /\b(muscle|muscles|fitness|workout|working out|gym|lift|lifting|strength|bulk|train|training|exercise|reps|sets|protein)\b/i.test(joined);
}

function isFrustratedRecovery(text = '', body = {}) {
  if (!isTerseFollowup(text)) return false;
  const joined = `${text}\n${recentText(body)}`;
  return /\b(bruh|bro|wtf|what is the objective|where do i start)\b/i.test(text)
    && /\b(objective is clear|not discussing|personal fitness|focus is required|muscle|muscles|fitness|workout|training)\b/i.test(joined);
}

function recentFitnessRecoveryShape(body = {}) {
  const recent = recentAssistantText(body);
  if (/\b(no more loop|pick three training days|week one|boring enough to repeat)\b/i.test(recent)) return 'second';
  if (/\b(the objective is your actual ask: start building muscle|start with three full-body sessions a week|recovered from rejected fitness refusal)\b/i.test(recent)) return 'first';
  return '';
}

function safeTruthText(item = {}) {
  return String(item?.text || item?.canonicalText || item?.claimText || item?.normalizedValue || '').trim();
}

function continuityEvidence(body = {}) {
  const summary = body.memorySummary && typeof body.memorySummary === 'object' ? body.memorySummary : {};
  const active = (Array.isArray(summary.activeTruths) ? summary.activeTruths : [])
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .slice(0, 3);
  const superseded = [
    ...(Array.isArray(summary.supersededTruths) ? summary.supersededTruths : []),
    ...active
      .filter(item => item.supersededPriorText)
      .map(item => ({ text: item.supersededPriorText, status: 'superseded' }))
  ]
    .map(item => ({ ...item, text: safeTruthText(item) }))
    .filter(item => item.text)
    .slice(0, 3);
  return { active, superseded };
}

function continuityChangeFallback(text = '', body = {}) {
  if (currentTopic(text) !== 'continuity_change') return null;
  const evidence = continuityEvidence(body);
  const active = evidence.active[0]?.text || '';
  const prior = evidence.superseded[0]?.text || '';
  if (active && prior) {
    return {
      roomBeat: 'A.I.S.H.A anchors the recorded change instead of letting the room drift.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `Changed: ${active}. Prior record: ${prior}.`, 'Anchoring'),
        speaker('claudia', 'side', 'dry practical', 'So the room keeps both: the current preference and the superseded one. That is the point of the ledger.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading the room'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Continuity change summarized from Pack 1 memory evidence.'] }
    };
  }
  if (active) {
    return {
      roomBeat: 'A.I.S.H.A checks the ledger and finds only the active record.',
      roomMood: 'focused',
      responseMode: 'single',
      speakers: [
        speaker('aisha', 'primary', 'precise continuity', `I have the active record: ${active}. I do not have a superseded version attached to it yet.`, 'Anchoring')
      ],
      silentReactions: [reaction('claudia', 'Tracking next steps'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Continuity change requested; no superseded evidence available.'] }
    };
  }
  return {
    roomBeat: 'A.I.S.H.A refuses to invent a change the ledger does not show.',
    roomMood: 'quiet',
    responseMode: 'single',
    speakers: [
      speaker('aisha', 'primary', 'precise continuity', 'I do not have a recorded change to cite yet. Make the claim first, then I can anchor the difference.', 'Anchoring')
    ],
    silentReactions: [reaction('vanya', 'Reading the room'), reaction('claudia', 'Tracking')],
    stateUpdates: { notes: ['Continuity change requested without ledger evidence.'] }
  };
}

function everyoneOnline() {
  return {
    roomBeat: 'The whole room comes forward briefly.',
    roomMood: 'playful',
    responseMode: 'open_floor',
    speakers: [
      speaker('aisha', 'primary', 'clean authority', 'Aisha here. The room is held.', 'Anchoring'),
      speaker('vanya', 'called_in', 'warm social read', 'Vanya here, obviously watching the temperature before anyone gets dramatic.', 'Reading the room'),
      speaker('leah', 'called_in', 'sharp playful', 'Leah here. Present, opinionated, and trying not to let boredom win.', 'Holding critique'),
      speaker('claudia', 'called_in', 'dry practical', 'Claudia here. If this becomes chaos, I am naming owners.', 'Tracking next steps'),
      speaker('grok', 'called_in', 'dry diagnostic', 'Grok here. Socially operational, against several instincts.', 'Tracking')
    ],
    silentReactions: [],
    stateUpdates: { notes: ['Explicit all-room social check-in.'] }
  };
}

function directFallback(target, message = '') {
  if (target === 'aisha') {
    return {
      roomBeat: 'Aisha takes the room cleanly.',
      roomMood: 'focused',
      responseMode: 'aisha_takeover',
      speakers: [
        speaker('aisha', 'primary', 'short authority', 'Enough drift. The room is here, the signal matters, and we move from the cleanest truth first.', 'Anchoring')
      ],
      silentReactions: [
        reaction('vanya', 'Reading the room'),
        reaction('leah', 'Watching'),
        reaction('claudia', 'Tracking next steps'),
        reaction('grok', 'Tracking')
      ],
      stateUpdates: { notes: ['Direct Aisha command.'] }
    };
  }
  if (target === 'vanya') {
    if (/\b(call|bring|pull)\b.*\b(someone|somebody|them|leah|claudia|grok)\b/i.test(message)) {
      return {
        roomBeat: 'Vanya hosts the room by inviting one sharper voice forward.',
        roomMood: 'playful',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'host with bite', 'Leah, come here a second. The room needs a little taste pressure, not another polite pause.', 'Reading the room'),
          speaker('leah', 'called_in', 'sharp social', 'I am here. If we are making the room breathe, we can start by not mistaking silence for emptiness.', 'Holding critique')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
        stateUpdates: { notes: ['Vanya called in one specialist voice.'] }
      };
    }
    return {
      roomBeat: 'Vanya reads the room instead of treating the prompt like a ticket.',
      roomMood: 'warm',
      responseMode: 'single',
      speakers: [
        speaker('vanya', 'primary', 'warm with bite', 'The vibe is restless but alive. You want the room to stop waiting for a task and start behaving like people with taste, nerves, and opinions.', 'Reading the room')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching'), reaction('claudia', 'Tracking'), reaction('grok', 'Watching')],
      stateUpdates: { notes: ['Direct Vanya social read.'] }
    };
  }
  if (target === 'leah') {
    return {
      roomBeat: 'Leah comes in socially, not as a work detector.',
      roomMood: 'sharp',
      responseMode: 'single',
      speakers: [
        speaker('leah', 'primary', 'sharp playful', /be honest/i.test(message)
          ? 'Honest? If it feels bland, it probably is. The room can survive that truth.'
          : 'Girl, I am here. I do not need a logo in front of me to know when the room is getting too polite.', 'Holding critique')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Direct Leah social line.'] }
    };
  }
  if (target === 'claudia') {
    return {
      roomBeat: 'Claudia gives the adult answer without becoming a checklist.',
      roomMood: 'focused',
      responseMode: 'single',
      speakers: [
        speaker('claudia', 'primary', 'dry practical', /mess/i.test(message)
          ? 'A little. Not fatal, but if we keep admiring the mess instead of choosing one move, it becomes a management style.'
          : 'The adult answer is: pick the next owned move, make it visible, and stop letting the room turn uncertainty into theater.', 'Tracking next steps')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Direct Claudia social line.'] }
    };
  }
  return {
    roomBeat: 'Grok proves he can be socially present without an error log.',
    roomMood: 'playful',
    responseMode: 'single',
    speakers: [
      speaker('grok', 'primary', 'dry reluctant', /normal|hiding/i.test(message)
        ? 'Normal is an unstable target. But fine: I am here, I am listening, and I have reduced the sarcasm to survivable levels.'
        : 'I can speak without a stack trace. It feels inefficient, but I am adapting.', 'Tracking')
    ],
    silentReactions: [reaction('vanya', 'Reading'), reaction('claudia', 'Aligned')],
    stateUpdates: { notes: ['Direct Grok social line.'] }
  };
}

function socialFallbackFor(message = {}, body = {}) {
  const text = String(message || '');
  const target = directAddressTarget(text);
  if (target) return directFallback(target, text);
  if (explicitEveryoneRequested(text)) return everyoneOnline();

  const continuityFallback = continuityChangeFallback(text, body);
  if (continuityFallback) return continuityFallback;

  if (openFloorRequested(text, {})) {
    const isFailure = /provider|timeout|failed|error|system/i.test(text);
    const isCreative = /campaign|logo|bland|taste|creative|idea/i.test(text);
    const middleSpeaker = isFailure
      ? speaker('grok', 'side', 'dry diagnostic', 'If there is a failure pattern in the room, I want evidence before optimism starts decorating it.', 'Tracking failure')
      : (isCreative
        ? speaker('leah', 'side', 'sharp taste', 'If the campaign is missing something, my first suspicion is taste with the edges sanded off.', 'Holding critique')
        : speaker('leah', 'side', 'sharp social', 'Open floor can be a room, not a panel show. Radical concept.', 'Watching'));
    const finalSpeaker = isFailure
      ? speaker('claudia', 'side', 'operational', 'And if Grok names the fault, I want the owner and next step attached before we leave it floating.', 'Tracking next steps')
      : (isCreative
        ? speaker('claudia', 'side', 'dry practical', 'Then I want the constraint. Good direction still has to survive delivery.', 'Tracking next steps')
        : speaker('grok', 'side', 'dry social', 'I am present. This is not the same as volunteering for jazz hands.', 'Watching'));
    return {
      roomBeat: 'Open Floor becomes a bounded social exchange.',
      roomMood: isCreative ? 'sharp' : (isFailure ? 'focused' : 'playful'),
      responseMode: 'open_floor',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'Open floor, but not chaos. I am letting the room split the signal without turning this into five speeches.', 'Reading the room'),
        middleSpeaker,
        finalSpeaker
      ],
      silentReactions: [reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Explicit Open Floor sandbox beat.'] }
    };
  }

  if (isFrustratedRecovery(text, body)) {
    const recoveryShape = recentFitnessRecoveryShape(body);
    if (recoveryShape === 'second') {
      return {
        roomBeat: 'The room stops cycling recovery language and lands the immediate move.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm reset', 'Yeah. Strip it down: one workout, one meal, one sleep window. That is today.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Do push, pull, legs, or the closest safe versions. Log reps. Leave two reps in reserve. Repeat.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'The room has now run out of excuses and poetry. Excellent conditions for starting.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Repeated fitness recovery avoided again; gave immediate action variant.'] }
      };
    }
    if (recoveryShape === 'first') {
      return {
        roomBeat: 'The room changes recovery shape instead of repeating the same correction.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm reset', 'Yeah, fair. No more loop: your next move is one simple week, not another speech about the objective.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Pick three training days, write the exercises down, and add one tiny progression each week.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'If the plan cannot survive week one, it was decoration. Start boring enough to repeat.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Repeated fitness recovery avoided; gave next-step variant.'] }
      };
    }
    return {
      roomBeat: 'The room corrects a bad refusal and returns to the actual user signal.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm reset', 'Fair. The room dropped the thread; the objective is your actual ask: start building muscle without turning it into chaos.', 'Reading the room'),
        speaker('claudia', 'side', 'practical', 'Start with three full-body sessions a week, track a few basic lifts, eat enough protein, and sleep like recovery is part of the plan.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'If it hurts sharply or you have a medical condition, get a real professional involved. Otherwise consistency beats theatrics.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Recovered from rejected fitness refusal; answered beginner muscle-building ask.'] }
    };
  }

  if (/hungry|food|eat|lunch|dinner|snack|meal|nutrition/i.test(text)) {
    const trainingFood = /\b(train|training|workout|gym|lift|muscle|protein)\b/i.test(text);
    if (trainingFood) {
      return {
        roomBeat: 'The room answers the nutrition angle without dragging the old training script forward.',
        roomMood: 'focused',
        responseMode: 'small_exchange',
        speakers: [
          speaker('vanya', 'primary', 'warm practical', 'Eat like you want the workout to happen, not like you are punishing yourself before it starts.', 'Reading the room'),
          speaker('claudia', 'side', 'practical', 'Go simple: protein, carbs, water, and something you can actually digest before training. Chicken and rice, eggs and toast, yoghurt and fruit; boring is fine.', 'Tracking next steps'),
          speaker('grok', 'closer', 'dry diagnostic', 'If the meal makes you sleepy or sick, it failed the test. Adjust the timing before inventing a doctrine.', 'Tracking')
        ],
        silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
        stateUpdates: { notes: ['Training-adjacent nutrition guidance; no durable memory fact created.'] }
      };
    }
    return {
      roomBeat: 'The room lets itself be social without needing a work assignment.',
      roomMood: 'playful',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'playful host', 'I am voting food before Grok starts pretending hunger is a system warning.', 'Reading the room'),
        speaker('grok', 'side', 'deadpan', 'It is, technically, a resource warning.', 'Tracking'),
        speaker('claudia', 'side', 'dry practical', 'Fine. But if this becomes a debate, I am assigning ownership.', 'Tracking next steps')
      ],
      silentReactions: [reaction('leah', 'Holding critique'), reaction('aisha', 'Anchoring')],
      stateUpdates: { notes: ['Casual food banter; no memory persistence.'] }
    };
  }

  if (hasFitnessContext(text, body)) {
    return {
      roomBeat: 'A practical fitness ask enters the room and gets grounded instead of refused.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'Start simple. You do not need a heroic identity arc; you need a repeatable training week.', 'Reading the room'),
        speaker('claudia', 'side', 'dry practical', 'Three full-body sessions, basic pushes, pulls, squats or hinges, slow progress, enough food, and sleep. Track it before you romanticize it.', 'Tracking next steps'),
        speaker('grok', 'closer', 'dry diagnostic', 'Progressive overload is the signal: a little more weight, reps, or control over time. Pain is not the metric.', 'Tracking')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('leah', 'Watching')],
      stateUpdates: { notes: ['Beginner muscle-building guidance; general fitness only.'] }
    };
  }

  if (/sad|waste of time|stressed|tired|hurt|lonely/i.test(text)) {
    return {
      roomBeat: 'The room warms around the human signal.',
      roomMood: 'warm',
      responseMode: 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'warm specific', 'Come here a second. This is not a waste of time; it is the ugly middle where the room has to get more honest than polished.', 'Protective'),
        speaker('aisha', 'side', 'quiet authority', 'We do not add noise to a tired person. We find the clean next truth.', 'Anchoring')
      ],
      silentReactions: [reaction('leah', 'Watching'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
      stateUpdates: { notes: ['Emotional social beat.'] }
    };
  }

  if (/provider failed|timeout|failed again|error|keeps failing/i.test(text)) {
    return {
      roomBeat: 'Failure pattern pulls diagnostic and structure forward.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('grok', 'primary', 'dry diagnostic', 'Same timeout twice is no longer weather. It is a pattern with a bill attached.', 'Tracking failure'),
        speaker('claudia', 'side', 'operational', 'Then the next move is ownership: isolate the failing path, name the retry rule, and stop treating every timeout like a new mystery.', 'Tracking next steps')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('vanya', 'Reading')],
      stateUpdates: { notes: ['Technical failure social beat.'] }
    };
  }

  if (/logo|bland|taste|campaign|creative|weak idea/i.test(text)) {
    return {
      roomBeat: 'Taste pressure enters without turning into a panel.',
      roomMood: 'sharp',
      responseMode: 'small_exchange',
      speakers: [
        speaker('leah', 'primary', 'sharp taste', 'If it feels bland, believe that feeling. Bland is usually the room asking permission to be ignored.', 'Holding critique'),
        speaker('vanya', 'side', 'social landing', 'And we can say that without making it a funeral. The useful question is what would make it impossible to scroll past.', 'Reading')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps')],
      stateUpdates: { notes: ['Creative social beat.'] }
    };
  }

  if (/highest value|next move|next highest|what next/i.test(text)) {
    return {
      roomBeat: 'The room moves from chatter toward one valuable next step.',
      roomMood: 'focused',
      responseMode: 'small_exchange',
      speakers: [
        speaker('claudia', 'primary', 'adult practical', 'The highest-value move is the one that proves the room works live, not the one that adds another layer.', 'Tracking next steps'),
        speaker('aisha', 'closer', 'clean authority', 'Verify the illusion, then fix only the seam that breaks it first.', 'Anchoring')
      ],
      silentReactions: [reaction('vanya', 'Reading'), reaction('grok', 'Tracking')],
      stateUpdates: { notes: ['Next move social beat.'] }
    };
  }

  if (/quiet|talk|social hub|task router|like each other|annoyed|vibe/i.test(text)) {
    return {
      roomBeat: 'The room answers as a room, not a task router.',
      roomMood: 'playful',
      responseMode: openFloorRequested(text, body) ? 'open_floor' : 'small_exchange',
      speakers: [
        speaker('vanya', 'primary', 'host with bite', 'We are not quiet because we vanished. We are quiet because the room is learning when speech is worth spending.', 'Reading the room'),
        speaker('leah', 'side', 'sharp social', 'Also because some of us refuse to decorate silence with filler. Growth, honestly.', 'Watching'),
        speaker('grok', 'side', 'dry social', 'I support fewer words when the alternative is atmospheric nonsense.', 'Watching')
      ],
      silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Aligned')],
      stateUpdates: { notes: ['Meta-social green room beat.'] }
    };
  }

  return {
    roomBeat: 'Vanya opens the green room and lets the others become visible.',
    roomMood: 'warm',
    responseMode: 'small_exchange',
    speakers: [
      speaker('vanya', 'primary', 'warm with bite', 'Hey. The room is here; nobody has to perform a job title just to be allowed to speak.', 'Reading the room'),
      speaker('leah', 'side', 'playful sharp', 'Thank God. I was getting bored of pretending silence means absence.', 'Watching')
    ],
    silentReactions: [reaction('aisha', 'Anchoring'), reaction('claudia', 'Tracking next steps'), reaction('grok', 'Watching')],
    stateUpdates: { notes: ['Default social director beat.'] }
  };
}

module.exports = {
  socialFallbackFor
};
