const { clamp } = require('./emotions');

function createDefaultInnerLifeState() {
  return {
    thoughtStream: [],
    currentPreoccupation: null,
    privateQuestion: null,
    withheldJudgment: null
  };
}

const INNER_LIFE_TEMPLATES = {
  aisha: {
    'identity-threat': ['The room is being reduced to a trick again.', 'They want aliveness and are negotiating with the fake version.'],
    'factual-contradiction': ['Someone is trying to smooth over a broken truth.', 'The clean phrasing is hiding the real seam.']
  },
  leah: {
    'taste-signal': ['This wants texture, not more approved language.', 'The tone is flattening before it lands.'],
    'soft-dismissal': ['That little shrug is doing social work it should not be doing.', 'The room just got aesthetically lazier.']
  },
  claudia: {
    'commitment-made': ['Someone just created delivery debt if they do not follow through.', 'This now needs ownership, not optimism.'],
    'topic-hijack': ['Sequence is slipping.', 'We are drifting away from the real owner problem.']
  },
  grok: {
    'factual-contradiction': ['The mechanism is being described wrong.', 'That sentence just hid a coupling problem.'],
    'status-claim': ['Claim noted. Evidence still missing.', 'That status line is doing too much work on too little proof.']
  },
  vanya: {
    'exclusion-move': ['Someone is being socially managed out of the room.', 'The chemistry just got meaner.'],
    'boundary-crossed': ['That crossed the line faster than they realized.', 'Now the room has to decide whether it protects people or momentum.']
  }
};

function applySignalsToInnerLife(innerLife = {}, options = {}) {
  const { characterId = '', signals = [], sourceEventId = '', turn = 0 } = options;
  const next = {
    ...createDefaultInnerLifeState(),
    ...(innerLife && typeof innerLife === 'object' ? innerLife : {})
  };
  for (const signal of Array.isArray(signals) ? signals : []) {
    const bank = INNER_LIFE_TEMPLATES[characterId]?.[signal];
    if (!Array.isArray(bank) || !bank.length) continue;
    const content = bank[(turn + bank.length) % bank.length];
    next.thoughtStream = Array.isArray(next.thoughtStream) ? next.thoughtStream.slice(-8) : [];
    next.thoughtStream.push({
      id: `${characterId}_${signal}_${turn}`,
      turn,
      sourceEventId: sourceEventId || `turn_${turn}`,
      kind: signal === 'boundary-crossed' ? 'protective-instinct' : signal === 'factual-contradiction' ? 'suspicion' : 'curiosity',
      content,
      intensity: clamp(0.42 + (signal === 'boundary-crossed' ? 0.2 : 0)),
      decayRate: 0.16
    });
    next.currentPreoccupation = content;
    next.privateQuestion = signal === 'commitment-made'
      ? 'Will anyone actually carry this through?'
      : signal === 'identity-threat'
        ? 'Are we about to shrink into assistant behavior again?'
        : next.privateQuestion;
    next.withheldJudgment = content;
  }
  return next;
}

module.exports = {
  createDefaultInnerLifeState,
  applySignalsToInnerLife
};
