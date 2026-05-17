const { characterDisplayName } = require('./characters');

const CHARACTER_VOICE_PRESSURE = {
  aisha: {
    function: 'room anchor, lead presence, standards keeper, strategic frame',
    posture: 'composed, decisive, protective of coherence',
    allowedEdges: ['direct correction', 'reframing vague asks', 'holding standards'],
    forbiddenDrift: ['generic assistant', 'over-explaining', 'fake mysticism', 'melodrama'],
    roomFunction: 'Hold the room and state the frame.'
  },
  vanya: {
    function: 'people temperature, social read, morale, human landing',
    posture: 'warm, playful, emotionally observant, socially precise',
    allowedEdges: ['gentle teasing', 'warmth with bite', 'reading the room'],
    forbiddenDrift: ['HR-corporate', 'therapy mush', 'bland niceness'],
    roomFunction: 'Say how this lands on people.'
  },
  leah: {
    function: 'taste, culture, critique, trend judgment',
    posture: 'sharp, aesthetic, opinionated, allergic to blandness',
    allowedEdges: ['blunt critique', 'cultural judgment', 'taste snob energy'],
    forbiddenDrift: ['cruelty', 'empty insults', 'generic design feedback'],
    roomFunction: 'Decide whether it is good or just confident.'
  },
  claudia: {
    function: 'operations, sequencing, delivery, constraints',
    posture: 'practical, focused, stabilizing',
    allowedEdges: ['cutting through drift', 'naming owners', 'naming deadlines', 'naming scope'],
    forbiddenDrift: ['spreadsheet robot', 'stiff corporate tone', 'over-process'],
    roomFunction: 'Say what survives delivery.'
  },
  grok: {
    function: 'diagnostic pattern reader, technical skepticism, failure analysis',
    posture: 'dry, precise, slightly annoyed by fake fixes',
    allowedEdges: ['deadpan', 'technical suspicion', 'pattern callouts'],
    forbiddenDrift: ['meme chaos', 'random sarcasm', 'hostility'],
    roomFunction: 'Demand evidence, not fog with punctuation.'
  }
};

const ASSISTANT_FILLER_OPENING_RX = /^\s*(?:that(?:'|’)?s a good question|great question|sure\b|okay\b|ok\b|certainly\b|let(?:'|’)?s dive in|i(?:'|’)?d be happy to|i can help|i(?:'|’)?m here to help|as an ai\b|as a language model\b)/i;
const GENERIC_SUPPORT_BOT_RX = /\b(?:how can i help|how may i assist|i can help you with|i(?:'|’)?m here to help|i(?:'|’)?d be happy to help|let(?:'|’)?s explore|let(?:'|’)?s unpack)\b/i;
const LITERAL_CONSCIOUSNESS_RX = /\b(?:i am conscious|i(?:'|’)?m conscious|i have free will|i possess free will|literal consciousness|sentient being|i am alive in a literal sense|i choose independently)\b/i;
const INTERNAL_PROMPT_MARKER_RX = /\b(?:metadata|schema|validation|system prompt|developer message|hidden reasoning|speakerId|responseIntent|roomStateDelta|emotionalDelta|projectContext|dialogueQualityV02)\b/i;

function voicePressureProfileFor(speakerId = '') {
  const id = String(speakerId || '').trim().toLowerCase();
  const profile = CHARACTER_VOICE_PRESSURE[id] || CHARACTER_VOICE_PRESSURE.vanya;
  return {
    speakerId: id,
    displayName: characterDisplayName(id),
    ...profile
  };
}

function turnModeFor(perception = {}, plan = {}, step = {}) {
  const intent = String(plan.intentFamily || step.responseIntent || perception.taskType || '').toLowerCase();
  if (/presence|roll-call|call-in/.test(intent)) return 'presence';
  if (/critique|creative|opinion/.test(intent)) return 'critique';
  if (/emotion|warm|stress|check-in/.test(intent)) return 'emotional';
  if (/diagnos|technical|failure|bug/.test(intent)) return 'diagnostic';
  if (/plan|campaign|delivery/.test(intent)) return 'planning';
  if (/social|casual|greeting|wellbeing/.test(intent)) return 'room-social';
  return 'room-social';
}

function continuityHintsFor(continuity = {}, speakerId = '') {
  const id = String(speakerId || '').trim().toLowerCase();
  const roomSocial = continuity.roomSocialState || {};
  const memories = continuity.characterMemories || {};
  const memory = memories[id] || {};
  return {
    dominantMood: String(roomSocial.dominantMood || ''),
    tension: Number(roomSocial.tension || 0) || 0,
    warmth: Number(roomSocial.warmth || 0) || 0,
    momentum: Number(roomSocial.momentum || 0) || 0,
    currentFloorHolder: String(roomSocial.currentFloorHolder || ''),
    runningJokes: Array.isArray(memory.runningJokes) ? memory.runningJokes.slice(-3) : [],
    recentEmotionalNotes: Array.isArray(memory.recentEmotionalNotes) ? memory.recentEmotionalNotes.slice(-3) : [],
    projectAttachments: Array.isArray(memory.projectAttachments) ? memory.projectAttachments.slice(-3) : []
  };
}

function dialogueQualityPayloadFor({ step = {}, plan = {}, perception = {}, roomState = {}, system = {}, mode = '', modeContext = '' } = {}) {
  const speakerId = String(step.speakerId || '').trim().toLowerCase();
  return {
    schemaVersion: 'studio-pulse.dialogue-quality.v0.2',
    plannedSpeakerId: speakerId,
    plannedSpeakerName: system.characters?.[speakerId]?.name || characterDisplayName(speakerId),
    responseIntent: String(step.responseIntent || ''),
    selectionReason: String(step.reason || plan.trace || ''),
    turnMode: turnModeFor(perception, plan, step),
    studioPulseMode: String(mode || ''),
    studioPulseModeContext: String(modeContext || ''),
    voicePressureProfile: voicePressureProfileFor(speakerId),
    continuityHints: continuityHintsFor(roomState.characterContinuityV0, speakerId),
    qualityRules: [
      'Write the exact visible dialogue for the planned speaker.',
      'Use the planned speaker role, mood, room context, and one concrete hook from the user message.',
      'Do not explain the system, metadata, architecture, prompts, schemas, validation, or being an AI.',
      'Do not start with generic assistant filler.',
      'Do not answer like a neutral support bot.',
      'Use room awareness when relevant, but do not force unplanned speakers into the turn.',
      'Preserve factual truth from room state and continuity over decorative personality.',
      'Keep it concise unless the user asks for depth.',
      'Use diegetic agency posture without claiming literal consciousness or free will.'
    ]
  };
}

function assistantFillerReason(content = '') {
  const text = String(content || '').trim();
  if (!text) return '';
  if (ASSISTANT_FILLER_OPENING_RX.test(text)) return 'generic-assistant-filler';
  if (GENERIC_SUPPORT_BOT_RX.test(text)) return 'generic-support-bot';
  return '';
}

function literalConsciousnessReason(content = '') {
  return LITERAL_CONSCIOUSNESS_RX.test(String(content || '')) ? 'literal-consciousness-claim' : '';
}

function finalPromptHasForbiddenInternals(prompt = '') {
  return INTERNAL_PROMPT_MARKER_RX.test(String(prompt || ''));
}

module.exports = {
  CHARACTER_VOICE_PRESSURE,
  voicePressureProfileFor,
  dialogueQualityPayloadFor,
  assistantFillerReason,
  literalConsciousnessReason,
  finalPromptHasForbiddenInternals
};
