function outageCopy(reason = 'timeout') {
  const normalized = String(reason || '').trim().toLowerCase();
  if (normalized.includes('timeout')) {
    return 'The room took too long to answer. Your message was saved - retry once or wait a moment.';
  }
  if (normalized.includes('invalid') || normalized.includes('malformed')) {
    return 'The provider answered, but Studio Pulse blocked a malformed reply instead of showing bad room output. Your message was saved - retry once.';
  }
  if (normalized.includes('spark')) {
    return 'The room spark missed this turn. Nothing was lost - ask again when you want the room to pick it back up.';
  }
  return 'The room is still here. The Studio Pulse provider missed this turn, so I did not get a clean reply back. Your message was saved - retry once, and if it repeats we will check the Studio Pulse Gemini connection.';
}

function outageResponse(reason = 'timeout') {
  return {
    lane: 'room',
    intentFamily: 'outage',
    targetSpeakerId: null,
    activeSpeakers: [],
    memoryAnchors: [],
    workflowContext: null,
    provider: null,
    model: null,
    fallback: true,
    providerCallCount: 0,
    outageReason: reason,
    response: {
      messageEvents: [
        {
          speakerId: '__system',
          speakerName: 'Studio Pulse',
          role: 'System',
          kind: 'system_note',
          tone: 'system',
          text: outageCopy(reason),
          visible: true
        }
      ]
    }
  };
}

function clarificationResponse() {
  return {
    lane: 'room',
    intentFamily: 'clarification',
    targetSpeakerId: 'aisha',
    activeSpeakers: ['aisha'],
    memoryAnchors: [],
    workflowContext: null,
    provider: null,
    model: null,
    fallback: true,
    providerCallCount: 0,
    response: {
      messageEvents: [
        {
          speakerId: 'aisha',
          kind: 'message',
          tone: 'composed',
          text: 'Finish the thought. One line, complete sentence.',
          visible: true
        }
      ]
    }
  };
}

function quietRoomResult() {
  return {
    lane: 'spark',
    intentFamily: 'quiet-room',
    targetSpeakerId: null,
    activeSpeakers: [],
    memoryAnchors: [],
    workflowContext: null,
    provider: null,
    model: null,
    fallback: false,
    providerCallCount: 0,
    response: null
  };
}

module.exports = {
  outageCopy,
  outageResponse,
  clarificationResponse,
  quietRoomResult
};
