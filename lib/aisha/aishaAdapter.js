const {
  createAishaStudioPulseRequest,
  createDisconnectedAishaResponse
} = require('./aishaTypes');

async function callAishaEngine(input = {}) {
  const request = createAishaStudioPulseRequest(input);
  // TODO: replace mock with real processAishaRequest() call when the A.I.S.H.A
  // host package is linked and GEMINI_API_KEY/runtime deps are available.
  return createDisconnectedAishaResponse(request);
}

function isUsableAishaResponse(response = {}) {
  if (!response || typeof response !== 'object') return false;
  if (response.aishaEngineConnected !== true) return false;
  if (String(response.engineMode || '').trim().toLowerCase() === 'mock') return false;
  const responses = Array.isArray(response.responses) ? response.responses : [];
  return responses.some(item => {
    const content = String(item?.content || item?.text || '').trim();
    return content && content !== '[Mock A.I.S.H.A]';
  });
}

module.exports = {
  callAishaEngine,
  isUsableAishaResponse
};
