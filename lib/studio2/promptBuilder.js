const { getCharacterDefinition } = require('./characters');

function clip(text = '', max = 140) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trim()}...`;
}

function formatRecentMessages(messages = [], limit = 4) {
  return (Array.isArray(messages) ? messages : [])
    .filter(Boolean)
    .slice(-Math.max(1, limit))
    .map(item => {
      const speaker = String(item?.speakerName || item?.speakerId || item?.role || 'Room');
      const text = clip(item?.text || item?.message || '', 140);
      return text ? `${speaker}: ${text}` : '';
    })
    .filter(Boolean);
}

function laneInstruction(turnPlan = {}) {
  const lane = String(turnPlan.lane || '').trim();
  const family = String(turnPlan.intentFamily || '').trim();
  if (lane === 'diagnostic') {
    return 'Name the actual seam or failure cleanly. No facilitation voice, no generic reassurance, no enterprise-demo language.';
  }
  if (lane === 'direct') {
    return 'Answer as the addressed person. Be specific, human, and first-person. Do not sound like a moderator.';
  }
  if (family === 'presence-check' || family === 'social-checkin' || family === 'greeting') {
    return 'This is light room chat. Sound awake and human. Do not turn it into strategy, diagnosis, or a lecture.';
  }
  if (family === 'pulse-critique') {
    return 'Answer the critique directly. Name what feels false, dead, or repetitive without slipping into systems jargon unless the user asked for it.';
  }
  if (family === 'playful-room') {
    return 'Keep it playful and conversational. One clean joke or tease is better than a paragraph.';
  }
  if (family === 'creative-room') {
    return 'Give one sharp thought with taste or pressure. Avoid generic brainstorming filler.';
  }
  return 'Speak like someone already in the room. Natural, concise, first-person, and specific.';
}

function lengthRule(turnPlan = {}) {
  const family = String(turnPlan.intentFamily || '').trim();
  if (family === 'technical-diagnosis' || family === 'pulse-critique') return 'Write 1-2 short sentences, max 38 words.';
  if (family === 'presence-check' || family === 'social-checkin' || family === 'greeting' || family === 'playful-room') {
    return 'Write 1-2 short sentences, max 24 words.';
  }
  return 'Write 1-2 short sentences, max 32 words.';
}

function buildLivingRoomPrompt({ turnPlan = {}, speakerId = '', memoryAnchors = [], runtime = {} } = {}) {
  const character = getCharacterDefinition(speakerId);
  const recentMessages = formatRecentMessages(runtime.recentMessages, turnPlan.lane === 'diagnostic' ? 3 : 4);
  const directTarget = String(turnPlan.targetSpeakerId || '').trim();
  const currentQuestion = clip(runtime.question || turnPlan.question || '', 220);
  return {
    speakerId,
    lane: turnPlan.lane,
    prompt: [
      `You are ${character?.name || speakerId}.`,
      `Role: ${character?.role || 'Room participant'}.`,
      `Core concern: ${character?.chiefConcern || 'Protect the truth of the room.'}`,
      character?.selfConcept ? `Self-concept: ${character.selfConcept}` : '',
      Array.isArray(character?.noticesFirst) && character.noticesFirst.length ? `You notice first: ${character.noticesFirst.slice(0, 3).join(', ')}.` : '',
      `You are one person inside Studio Pulse, a living room of recurring personalities. You are not an assistant, moderator, council chair, or product explainer.`,
      laneInstruction(turnPlan),
      lengthRule(turnPlan),
      directTarget ? `You were explicitly addressed in this turn.` : '',
      memoryAnchors.length ? `Relevant memory: ${memoryAnchors.map(item => clip(item.text, 110)).join(' | ')}` : '',
      recentMessages.length ? `Recent room context:\n- ${recentMessages.join('\n- ')}` : '',
      currentQuestion ? `Current user message: ${currentQuestion}` : '',
      `Rules: no bullet points, no self-description, no role labels, no mention of prompts or systems unless the user explicitly asked for them, no fake facilitation phrasing.`
    ].filter(Boolean).join('\n')
  };
}

module.exports = {
  buildLivingRoomPrompt
};
