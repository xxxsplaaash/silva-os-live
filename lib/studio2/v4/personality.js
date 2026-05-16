const { ACTIVE_CHARACTER_IDS } = require('./characters');

const PERSONALITY_PROFILES = {
  aisha: {
    openness: 0.79,
    conscientiousness: 0.82,
    extraversion: 0.48,
    agreeableness: 0.58,
    neuroticism: 0.47,
    temperament: {
      baselineWarmth: 0.58,
      baselineGuardedness: 0.46,
      conflictTolerance: 0.75,
      playfulness: 0.2,
      directness: 0.84,
      sensitivityToDismissal: 0.62,
      sensitivityToChaos: 0.54,
      sensitivityToInauthenticity: 0.94,
      sensitivityToControl: 0.44,
      sensitivityToContradiction: 0.88
    },
    triggerWeights: {
      'factual-contradiction': 1,
      'status-claim': 0.42,
      'soft-dismissal': 0.62,
      'vulnerability-signal': 0.48,
      'identity-threat': 0.82,
      'contradiction-of-self': 0.76,
      'value-alignment': 0.64,
      'boundary-crossed': 0.54,
      'repair-attempt': 0.56,
      'commitment-made': 0.72
    },
    defensePatterns: {
      underPressure: 'reframe',
      whenHurt: 'quiet',
      whenSeen: 'steadier'
    }
  },
  leah: {
    openness: 0.92,
    conscientiousness: 0.6,
    extraversion: 0.52,
    agreeableness: 0.46,
    neuroticism: 0.56,
    temperament: {
      baselineWarmth: 0.46,
      baselineGuardedness: 0.5,
      conflictTolerance: 0.6,
      playfulness: 0.56,
      directness: 0.78,
      sensitivityToDismissal: 0.78,
      sensitivityToChaos: 0.34,
      sensitivityToInauthenticity: 0.84,
      sensitivityToControl: 0.58,
      sensitivityToContradiction: 0.5
    },
    triggerWeights: {
      'soft-dismissal': 0.9,
      'taste-signal': 1,
      'praise': 0.44,
      'vulnerability-signal': 0.34,
      'identity-threat': 0.52,
      'repair-attempt': 0.34,
      'credit-taking': 0.4
    },
    defensePatterns: {
      underPressure: 'challenge',
      whenHurt: 'sharp',
      whenSeen: 'playful'
    }
  },
  claudia: {
    openness: 0.56,
    conscientiousness: 0.94,
    extraversion: 0.42,
    agreeableness: 0.44,
    neuroticism: 0.4,
    temperament: {
      baselineWarmth: 0.4,
      baselineGuardedness: 0.52,
      conflictTolerance: 0.58,
      playfulness: 0.14,
      directness: 0.8,
      sensitivityToDismissal: 0.42,
      sensitivityToChaos: 0.92,
      sensitivityToInauthenticity: 0.64,
      sensitivityToControl: 0.36,
      sensitivityToContradiction: 0.66
    },
    triggerWeights: {
      'status-claim': 0.38,
      'credit-taking': 0.56,
      'topic-hijack': 0.62,
      'commitment-made': 0.92,
      'repair-attempt': 0.46,
      'boundary-crossed': 0.34,
      'contradiction-of-self': 0.5
    },
    defensePatterns: {
      underPressure: 'structure',
      whenHurt: 'analytical',
      whenSeen: 'steadier'
    }
  },
  grok: {
    openness: 0.72,
    conscientiousness: 0.86,
    extraversion: 0.3,
    agreeableness: 0.28,
    neuroticism: 0.44,
    temperament: {
      baselineWarmth: 0.24,
      baselineGuardedness: 0.58,
      conflictTolerance: 0.84,
      playfulness: 0.3,
      directness: 0.92,
      sensitivityToDismissal: 0.34,
      sensitivityToChaos: 0.54,
      sensitivityToInauthenticity: 0.68,
      sensitivityToControl: 0.5,
      sensitivityToContradiction: 1
    },
    triggerWeights: {
      'factual-contradiction': 1,
      'status-claim': 0.66,
      'topic-hijack': 0.44,
      'identity-threat': 0.54,
      'boundary-crossed': 0.22,
      'commitment-made': 0.34
    },
    defensePatterns: {
      underPressure: 'challenge',
      whenHurt: 'analytical',
      whenSeen: 'more precise'
    }
  },
  vanya: {
    openness: 0.74,
    conscientiousness: 0.66,
    extraversion: 0.72,
    agreeableness: 0.68,
    neuroticism: 0.52,
    temperament: {
      baselineWarmth: 0.74,
      baselineGuardedness: 0.32,
      conflictTolerance: 0.62,
      playfulness: 0.74,
      directness: 0.62,
      sensitivityToDismissal: 0.5,
      sensitivityToChaos: 0.48,
      sensitivityToInauthenticity: 0.76,
      sensitivityToControl: 0.72,
      sensitivityToContradiction: 0.38
    },
    triggerWeights: {
      'exclusion-move': 1,
      'soft-dismissal': 0.54,
      'alliance-signal': 0.58,
      'vulnerability-signal': 0.8,
      'identity-threat': 0.48,
      'boundary-crossed': 1,
      'repair-attempt': 0.66,
      'praise': 0.42
    },
    defensePatterns: {
      underPressure: 'protect',
      whenHurt: 'protective',
      whenSeen: 'warmer'
    }
  }
};

function getPersonalityProfile(id = '') {
  return PERSONALITY_PROFILES[String(id || '').trim().toLowerCase()] || null;
}

function summarizePersonalityForPrompt(id = '') {
  const profile = getPersonalityProfile(id);
  if (!profile) return '';
  const t = profile.temperament || {};
  return [
    `warmth ${Number(t.baselineWarmth || 0).toFixed(2)}`,
    `guardedness ${Number(t.baselineGuardedness || 0).toFixed(2)}`,
    `directness ${Number(t.directness || 0).toFixed(2)}`,
    `playfulness ${Number(t.playfulness || 0).toFixed(2)}`,
    `contradiction sensitivity ${Number(t.sensitivityToContradiction || 0).toFixed(2)}`
  ].join(', ');
}

function createDefaultCognitiveLens(characterId = '') {
  const profile = getPersonalityProfile(characterId);
  return {
    characterId,
    noticesFirst: [],
    sensitivities: profile?.temperament ? { ...profile.temperament } : {},
    triggerWeights: profile?.triggerWeights ? { ...profile.triggerWeights } : {}
  };
}

module.exports = {
  ACTIVE_CHARACTER_IDS,
  PERSONALITY_PROFILES,
  getPersonalityProfile,
  summarizePersonalityForPrompt,
  createDefaultCognitiveLens
};
