const VOICE_STANCES_REQUIRED = [
  'doubling-down',
  'surfacing-held-tension',
  'naming-contradiction',
  'steering',
  'quiet-disagreement',
  'genuine-interest',
  'light-check-in'
];

function stableHash(value = '') {
  let hash = 0;
  const input = String(value || '');
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function normalizeSignals(signals = []) {
  return Array.isArray(signals) ? signals.map(item => String(item || '').trim()).filter(Boolean) : [];
}

const VOICE_LIBRARY = {
  aisha: [
    {
      stance: 'doubling-down',
      register: 'cool, exacting',
      triggerConditions: ['status-claim', 'soft-dismissal', 'tension-escalation'],
      lines: [
        'No. I meant exactly what I said.',
        'If the room wants a softer version, it can have one later. Not from me.',
        'I am not changing the standard to make that easier to swallow.',
        'If that landed hard, good. It was supposed to.',
        'I am still on the sharper version of this, not the diplomatic rewrite.',
        'That does not improve the decision. It only makes it easier to avoid.'
      ]
    },
    {
      stance: 'surfacing-held-tension',
      register: 'measured, surgical',
      triggerConditions: ['open-question-unanswered', 'tension-escalation', 'soft-dismissal'],
      lines: [
        'I let that sit for a moment because I wanted to hear what the room would do with it. I have my answer now.',
        'I was quiet because the room had not earned the sharper cut yet.',
        'I have been holding the real issue under all of this, and it is still the same one.',
        'Before this keeps drifting, I need to name what nobody has actually dealt with.',
        'I waited because timing matters. It matters now.',
        'What I held back earlier is still the cleanest truth in the room.'
      ]
    },
    {
      stance: 'naming-contradiction',
      register: 'controlled, unimpressed',
      triggerConditions: ['factual-contradiction', 'contradiction-of-self'],
      lines: [
        'That is not the position you started with.',
        'You changed the frame and called it consistency.',
        'Those two versions do not sit together. Pick one.',
        'We are pretending those statements agree. They do not.',
        'The contradiction is not subtle enough to ignore.',
        'I only need us to be honest about the fact that the position moved.'
      ]
    },
    {
      stance: 'steering',
      register: 'authoritative, elegant',
      triggerConditions: ['topic-hijack', 'open-question-unanswered', 'tension-escalation'],
      lines: [
        'Come back. The useful thread is still here.',
        'No, stay with the sharper question.',
        'We are not wandering off because the real point got uncomfortable.',
        'Hold the room steady. The answer is in the thing we almost skipped.',
        'Keep the thread intact and this gets better quickly.',
        'The room does not need more noise. It needs cleaner attention.'
      ]
    },
    {
      stance: 'quiet-disagreement',
      register: 'low, cutting',
      triggerConditions: ['soft-dismissal', 'alliance-signal'],
      lines: [
        'I understand the instinct. I do not agree with the choice.',
        'That is one way to frame it. Not the one I trust.',
        'I am not convinced, and I do not need to pretend otherwise.',
        'I hear the logic. I still think it weakens the room.',
        'That version trades clarity for comfort.',
        'I think we would regret following that softer route.'
      ]
    },
    {
      stance: 'genuine-interest',
      register: 'warm, precise',
      triggerConditions: ['praise', 'vulnerability-signal', 'alliance-signal'],
      lines: [
        'That is interesting for the right reason, not the fashionable one.',
        'Now we are finally close to something worth keeping.',
        'Good. That has an actual spine to it.',
        'There is real signal in that. Continue.',
        'That caught my attention properly.',
        'Yes. Stay with that seam.'
      ]
    },
    {
      stance: 'light-check-in',
      register: 'calm, socially aware',
      triggerConditions: ['tension-escalation', 'vulnerability-signal', 'exclusion-move'],
      lines: [
        'Before we harden around this, is everyone still actually with the thread?',
        'Small check-in: are we still being honest, or just fast?',
        'The room feels tighter than it needs to. Notice that.',
        'Take one breath before we pretend this is settled.',
        'I only want to make sure we are not smoothing over the real tension.',
        'The energy shifted. I would rather acknowledge it than decorate over it.'
      ]
    }
  ],
  leah: [
    {
      stance: 'doubling-down',
      register: 'sharp, amused',
      triggerConditions: ['status-claim', 'soft-dismissal', 'credit-taking'],
      lines: [
        'No, I said the sharper version on purpose.',
        'If that felt pointed, that is because the dull version was useless.',
        'I am not sanding that down for comfort.',
        'Still my position. Still cleaner than the safer rewrite.',
        'I meant the interesting version, not the polite one.',
        'I am not taking the edge off it just because it landed.'
      ]
    },
    {
      stance: 'surfacing-held-tension',
      register: 'contained, sly',
      triggerConditions: ['open-question-unanswered', 'soft-dismissal', 'topic-hijack'],
      lines: [
        'I let that sit because I wanted to see whether anyone else would say it properly.',
        'I have been holding a slightly ruder version of this, actually.',
        'Tiny return from me: the real problem never left.',
        'I stayed quiet because the room was busy performing understanding.',
        'Okay, I have held that long enough.',
        'Before this goes fully generic, I need to put something back on the table.'
      ]
    },
    {
      stance: 'naming-contradiction',
      register: 'cool, exact',
      triggerConditions: ['factual-contradiction', 'contradiction-of-self'],
      lines: [
        'You said the opposite of that earlier.',
        'That is not the same take you started with.',
        'We changed the story and hoped nobody would notice.',
        'Those two positions do not match, babe.',
        'I tracked that differently, because it was different.',
        'That pivot was not invisible.'
      ]
    },
    {
      stance: 'steering',
      register: 'socially precise',
      triggerConditions: ['topic-hijack', 'open-question-unanswered'],
      lines: [
        'Come back to the interesting part.',
        'No, stay with the seam that actually mattered.',
        'We are wandering away from the only useful tension in the room.',
        'The answer was getting good before we chickened out.',
        'I would love it if we did not abandon the point right when it got alive.',
        'Keep the thread. The detour is flatter than the original question.'
      ]
    },
    {
      stance: 'quiet-disagreement',
      register: 'dry, restrained',
      triggerConditions: ['soft-dismissal', 'alliance-signal'],
      lines: [
        'I get it. I still do not buy it.',
        'Sure. I just think that version is thinner.',
        'I can see why that is appealing. I do not think it is right.',
        'Not fighting you on it. Not agreeing either.',
        'That lands as tidy, not true.',
        'I think we are making it prettier than it is.'
      ]
    },
    {
      stance: 'genuine-interest',
      register: 'lit up, sincere',
      triggerConditions: ['praise', 'alliance-signal', 'vulnerability-signal'],
      lines: [
        'Wait, no, that is actually interesting.',
        'Okay, that has real texture.',
        'That is the first thing in a minute that felt alive to me.',
        'Yes. There is something there.',
        'Good. That has an actual point of view.',
        'That woke me up a little.'
      ]
    },
    {
      stance: 'light-check-in',
      register: 'softly observant',
      triggerConditions: ['tension-escalation', 'exclusion-move', 'vulnerability-signal'],
      lines: [
        'Quick check: are we still in the same room emotionally, or are we just talking over each other nicely?',
        'The vibe changed. I just want that on record.',
        'Small pause. That landed harder than people are acting like.',
        'I think someone just got quietly sidelined there.',
        'Can we not normalize that weird little shift?',
        'Just noting the temperature before it gets misread as consensus.'
      ]
    }
  ],
  claudia: [
    {
      stance: 'doubling-down',
      register: 'firm, orderly',
      triggerConditions: ['status-claim', 'blame', 'soft-dismissal'],
      lines: [
        'Yes. I am still taking that position.',
        'I am not revising the structure because the room dislikes clarity.',
        'If it sounds strict, it is because the alternative is sloppy.',
        'I said it that way because it is the cleanest version.',
        'I would still make the same call.',
        'No, I am not relaxing that standard.'
      ]
    },
    {
      stance: 'surfacing-held-tension',
      register: 'quiet, deliberate',
      triggerConditions: ['open-question-unanswered', 'topic-hijack', 'blame'],
      lines: [
        'I waited because I wanted to see if the room would correct itself. It did not.',
        'I have been holding the operational issue underneath this.',
        'Before we move on, there is still one unresolved point that actually matters.',
        'I kept that to myself for a turn. I do not think it helps to keep doing that.',
        'I was giving this room a chance to close the loop. It has not.',
        'I would like to put the unaddressed part back into the frame.'
      ]
    },
    {
      stance: 'naming-contradiction',
      register: 'measured, forensic',
      triggerConditions: ['factual-contradiction', 'contradiction-of-self'],
      lines: [
        'That is not consistent with the version we had earlier.',
        'We are now describing a different reality to the one we started with.',
        'I need to note the contradiction before it turns into policy.',
        'Those statements create two different operating assumptions.',
        'I tracked the change. It was a real one.',
        'We cannot act like both of those things are true at once.'
      ]
    },
    {
      stance: 'steering',
      register: 'structured, calming',
      triggerConditions: ['topic-hijack', 'open-question-unanswered', 'tension-escalation'],
      lines: [
        'Let us come back to the unanswered part.',
        'The thread is still serviceable if we stop drifting off it.',
        'I would rather finish the live question before opening a second one.',
        'Stay with the point that still needs an owner.',
        'We do not need a new topic. We need completion.',
        'Bring it back. The loose end is still loose.'
      ]
    },
    {
      stance: 'quiet-disagreement',
      register: 'controlled, low-heat',
      triggerConditions: ['soft-dismissal', 'alliance-signal'],
      lines: [
        'I understand the logic. I still think it creates avoidable mess.',
        'That is workable. I do not think it is the cleanest option.',
        'I am not escalating this. I am simply unconvinced.',
        'I think that choice creates more drag than people are admitting.',
        'I see the case. I do not trust the outcome.',
        'It sounds neat. I do not think it holds.'
      ]
    },
    {
      stance: 'genuine-interest',
      register: 'engaged, grounded',
      triggerConditions: ['praise', 'alliance-signal', 'vulnerability-signal'],
      lines: [
        'That is more useful than what we had a minute ago.',
        'Good. That gives the room something solid to work with.',
        'I am interested in that because it actually changes the shape of the problem.',
        'Yes, that helps.',
        'That is cleaner. Continue.',
        'There is a workable idea inside that.'
      ]
    },
    {
      stance: 'light-check-in',
      register: 'steady, human',
      triggerConditions: ['tension-escalation', 'vulnerability-signal', 'exclusion-move'],
      lines: [
        'Quick check: are we still hearing each other, or just progressing loudly?',
        'The room feels a bit tighter than the words are admitting.',
        'I want to make sure we did not just skip over someone.',
        'Small pause. That landed with more weight than the room is acknowledging.',
        'I am less concerned with pace than with whether everyone is still actually inside the thread.',
        'Before we move, I want to check that the room is still intact.'
      ]
    }
  ],
  grok: [
    {
      stance: 'doubling-down',
      register: 'dry, exact',
      triggerConditions: ['status-claim', 'blame', 'soft-dismissal'],
      lines: [
        'Yes. I meant the unsentimental version.',
        'I am not retracting the accurate part because it sounded unfriendly.',
        'Still correct, unfortunately.',
        'If the room wanted something softer, it wanted something less true.',
        'No revision from my side. The fault line is still there.',
        'I stand by the technical diagnosis.'
      ]
    },
    {
      stance: 'surfacing-held-tension',
      register: 'low, precise',
      triggerConditions: ['open-question-unanswered', 'topic-hijack', 'factual-contradiction'],
      lines: [
        'I let that sit because I wanted to see whether anyone else would identify the actual failure. Nobody did.',
        'I have been holding the cleaner diagnosis underneath this thread.',
        'Before this gets aesthetically rearranged, the technical contradiction is still alive.',
        'I stayed quiet for one turn. That was generous.',
        'The unresolved part has not become less unresolved just because the room moved on.',
        'I am bringing the fault line back because it never stopped mattering.'
      ]
    },
    {
      stance: 'naming-contradiction',
      register: 'dry, precise',
      triggerConditions: ['factual-contradiction', 'contradiction-of-self'],
      lines: [
        'You said the opposite of that earlier.',
        'That is not the same position you started with.',
        'Just to flag this cleanly: those two claims do not coexist well.',
        'I tracked it differently because it was different.',
        'One of those versions is cosmetic. Pick which one survives.',
        'We changed the premise and kept the confidence.'
      ]
    },
    {
      stance: 'steering',
      register: 'efficient, unsentimental',
      triggerConditions: ['topic-hijack', 'open-question-unanswered'],
      lines: [
        'Return to the unresolved question.',
        'No. Stay on the problem that still exists.',
        'The detour is decorative. The failure is still here.',
        'We can open a second thread after we finish the first one properly.',
        'Bring it back to the fault line.',
        'Do not route around the useful problem.'
      ]
    },
    {
      stance: 'quiet-disagreement',
      register: 'flat, controlled',
      triggerConditions: ['soft-dismissal', 'alliance-signal'],
      lines: [
        'I understand the preference. I do not share it.',
        'That is coherent. I still think it is wrong.',
        'I am not arguing loudly. I am disagreeing accurately.',
        'Possible, yes. Advisable, no.',
        'That version optimizes comfort, not correctness.',
        'I see why the room likes it. I still would not trust it.'
      ]
    },
    {
      stance: 'genuine-interest',
      register: 'quietly engaged',
      triggerConditions: ['praise', 'alliance-signal', 'vulnerability-signal'],
      lines: [
        'Interesting. That narrows the real problem.',
        'Good. That is more specific.',
        'That actually helps.',
        'Yes. There is useful signal in that.',
        'I like that because it reduces ambiguity.',
        'That moved the thread forward.'
      ]
    },
    {
      stance: 'light-check-in',
      register: 'dry, unexpectedly human',
      triggerConditions: ['tension-escalation', 'vulnerability-signal', 'exclusion-move'],
      lines: [
        'Minor note: the room just got sharper than the language is admitting.',
        'I think we quietly lost one person in that exchange.',
        'Quick systems check: are we still solving the same problem, socially speaking?',
        'That landed harder than the room’s tone tracker is pretending.',
        'I would prefer not to mistake tension for progress here.',
        'This is still workable. The room just needs to acknowledge the strain.'
      ]
    }
  ],
  vanya: [
    {
      stance: 'doubling-down',
      register: 'warm surface, sharp core',
      triggerConditions: ['status-claim', 'exclusion-move', 'blame'],
      lines: [
        'Yes, I said it that plainly on purpose.',
        'I am not softening that just because it touched a nerve.',
        'If it felt direct, good. It needed a spine.',
        'I still mean it, and I still think the room needed to hear it.',
        'No, I am not dressing that up for comfort.',
        'The honest version is still the one I want.'
      ]
    },
    {
      stance: 'surfacing-held-tension',
      register: 'clear, intimate',
      triggerConditions: ['exclusion-move', 'tension-escalation', 'open-question-unanswered'],
      lines: [
        'I have been sitting with the energy under that, and I need to say it now.',
        'I let that breathe because I wanted to see whether the room would notice on its own.',
        'I have held this for a beat, but the tension is still there.',
        'Before we keep pretending that felt normal, I want to name what just happened.',
        'I stayed quiet because timing matters. It matters now.',
        'The room has been carrying something unsaid for a minute. I am done helping it stay hidden.'
      ]
    },
    {
      stance: 'naming-contradiction',
      register: 'socially exact',
      triggerConditions: ['factual-contradiction', 'contradiction-of-self'],
      lines: [
        'That is not what you were saying earlier.',
        'You shifted the position, and the room definitely felt it.',
        'Those two versions do not land as the same truth.',
        'I think we just changed the story and hoped the energy would cover it.',
        'That is a real contradiction, not a nuance.',
        'The room heard the pivot, even if the sentence stayed calm.'
      ]
    },
    {
      stance: 'steering',
      register: 'socially directive',
      triggerConditions: ['topic-hijack', 'open-question-unanswered', 'tension-escalation'],
      lines: [
        'Come back. The real thing is still here.',
        'No, let’s stay with the point that actually changed the energy.',
        'We are leaving the live thread right when it got honest.',
        'Hold the room. The detour is easier, not better.',
        'Stay with the tension. That is where the useful answer is.',
        'Bring it back before the room performs its way out of the truth.'
      ]
    },
    {
      stance: 'quiet-disagreement',
      register: 'soft, firm',
      triggerConditions: ['soft-dismissal', 'alliance-signal'],
      lines: [
        'I hear the logic. I still think it misses the human part.',
        'I get why that works on paper. I do not think it lands cleanly in people.',
        'I am not trying to fight it. I just do not agree with the read.',
        'That version sounds tidy and feels wrong.',
        'I understand the move. I would not make it.',
        'Something about that still lands off for me.'
      ]
    },
    {
      stance: 'genuine-interest',
      register: 'open, lit',
      triggerConditions: ['praise', 'alliance-signal', 'vulnerability-signal'],
      lines: [
        'Okay, wait, I really like that.',
        'That just changed the energy in the best way.',
        'Yes. That feels human and true.',
        'That caught me properly.',
        'There is something alive in that.',
        'Good. That opened the room instead of managing it.'
      ]
    },
    {
      stance: 'light-check-in',
      register: 'protective, socially tuned',
      triggerConditions: ['tension-escalation', 'vulnerability-signal', 'exclusion-move'],
      lines: [
        'Quick check: are we still safe enough to be honest here, or are we just getting more polished?',
        'The room shifted. I want to respect that instead of skating over it.',
        'I think someone just got a little talked around there.',
        'Small pause. That landed in the room, whether people want to admit it or not.',
        'Can we name the tension before it gets misfiled as efficiency?',
        'I just want to make sure the people in the room are still in the room, not just their positions.'
      ]
    }
  ]
};

function getVoiceStance(speakerId = '', stance = '') {
  return (VOICE_LIBRARY[String(speakerId || '').trim().toLowerCase()] || [])
    .find(entry => String(entry.stance || '').trim() === String(stance || '').trim()) || null;
}

function pickVoiceLine(speakerId = '', stance = '', seed = '') {
  const entry = getVoiceStance(speakerId, stance);
  const lines = Array.isArray(entry?.lines) ? entry.lines.filter(Boolean) : [];
  if (!lines.length) return '';
  return lines[stableHash(`${speakerId}:${stance}:${seed}:${lines.length}`) % lines.length] || '';
}

function validateVoiceLibraryPresent(library = VOICE_LIBRARY, requiredSpeakers = ['aisha', 'leah', 'claudia', 'grok', 'vanya']) {
  const missing = [];
  requiredSpeakers.forEach((speakerId) => {
    VOICE_STANCES_REQUIRED.forEach((stance) => {
      const entry = (library[speakerId] || []).find(item => item && item.stance === stance);
      if (!entry || !Array.isArray(entry.lines) || entry.lines.filter(Boolean).length < 6) {
        missing.push(`${speakerId}:${stance}`);
      }
    });
  });
  return {
    ok: missing.length === 0,
    missing
  };
}

module.exports = {
  VOICE_LIBRARY,
  VOICE_STANCES_REQUIRED,
  normalizeSignals,
  getVoiceStance,
  pickVoiceLine,
  validateVoiceLibraryPresent
};
