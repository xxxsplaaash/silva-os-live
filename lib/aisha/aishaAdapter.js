const {
  createAishaStudioPulseRequest,
  createDisconnectedAishaResponse,
  neutralStateEnvelope
} = require('./aishaTypes');

const AISHA_RUNTIME_PACKAGE = 'aisha-runtime-pack1';

let runtimeImporter = specifier => import(specifier);

function aishaEngineEnabled(env = process.env) {
  return String(env?.AISHA_ENGINE_ENABLED || '').trim().toLowerCase() === 'true';
}

function safeReason(reason = '') {
  const clean = String(reason || '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return clean.slice(0, 80) || 'aisha-runtime-failed';
}

function reasonForError(err) {
  const code = String(err?.code || '').trim();
  if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') return 'aisha-runtime-unavailable';
  return 'aisha-runtime-failed';
}

function summarizeAishaRequestShape(request = {}) {
  const recentMessages = Array.isArray(request.recentMessages) ? request.recentMessages : [];
  const characterStates = request.characterStates && typeof request.characterStates === 'object' ? request.characterStates : {};
  return {
    hasSessionId: !!String(request.sessionId || '').trim(),
    hasThreadId: !!String(request.threadId || '').trim(),
    hasRoomId: !!String(request.roomId || '').trim(),
    hasMessageText: !!String(request.messageText || '').trim(),
    hasLegacyMessage: !!String(request.message || '').trim(),
    messageTextLength: String(request.messageText || '').length,
    recentMessageCount: recentMessages.length,
    characterStateCount: Object.keys(characterStates).length,
    sourceModality: String(request.modalityMetadata?.sourceModality || '').trim(),
    sourceChannel: String(request.modalityMetadata?.sourceChannel || '').trim(),
    hasActiveSpeakerId: !!String(request.activeSpeakerId || request.modalityMetadata?.activeSpeakerId || '').trim()
  };
}

function baseDiagnostics(request = {}) {
  return {
    packageImportOk: false,
    processAishaRequestType: 'missing',
    requestShapeSummary: summarizeAishaRequestShape(request),
    responseOk: false,
    responseEngineMode: '',
    responseConnected: false,
    responseCount: 0,
    firstResponseHasContent: false,
    rejectionReason: ''
  };
}

function firstResponseHasContent(response = {}) {
  const first = Array.isArray(response.responses) ? response.responses[0] : null;
  return !!String(first?.content || first?.text || '').trim();
}

function attachAishaDiagnostics(response = {}, diagnostics = {}) {
  const safeDiagnostics = {
    ...baseDiagnostics(),
    ...diagnostics,
    requestShapeSummary: {
      ...summarizeAishaRequestShape(),
      ...(diagnostics.requestShapeSummary || {})
    }
  };
  return {
    ...response,
    diagnostics: safeDiagnostics,
    trace: {
      ...(response.trace && typeof response.trace === 'object' ? response.trace : {}),
      aishaDiagnostics: safeDiagnostics
    }
  };
}

function createUnavailableAishaResponse(request = {}, reason = 'aisha-runtime-failed', diagnostics = {}) {
  const rejectionReason = safeReason(reason);
  return createDisconnectedAishaResponse(request, {
    responses: [],
    trace: {
      status: 'failed',
      adapter: AISHA_RUNTIME_PACKAGE,
      reason: rejectionReason,
      aishaDiagnostics: {
        ...baseDiagnostics(request),
        ...diagnostics,
        rejectionReason
      }
    },
    engineMode: 'unavailable',
    aishaEngineConnected: false,
    confidence: 0,
    fallbackReason: rejectionReason,
    diagnostics: {
      ...baseDiagnostics(request),
      ...diagnostics,
      rejectionReason
    }
  });
}

function normalizeAishaResponse(response = {}, request = {}) {
  const source = response && typeof response === 'object' ? response : {};
  return {
    ok: source.ok !== false && source.aishaEngineConnected === true,
    responses: Array.isArray(source.responses) ? source.responses : [],
    memorySummary: {
      activeTruths: Array.isArray(source.memorySummary?.activeTruths) ? source.memorySummary.activeTruths : [],
      supersededTruths: Array.isArray(source.memorySummary?.supersededTruths) ? source.memorySummary.supersededTruths : [],
      memoryCandidates: Array.isArray(source.memorySummary?.memoryCandidates) ? source.memorySummary.memoryCandidates : [],
      sessionId: String(source.memorySummary?.sessionId || request.sessionId || 'studio-pulse-local-session')
    },
    stateEnvelope: source.stateEnvelope && typeof source.stateEnvelope === 'object'
      ? source.stateEnvelope
      : neutralStateEnvelope(),
    relationshipDeltas: Array.isArray(source.relationshipDeltas) ? source.relationshipDeltas : [],
    trace: source.trace && typeof source.trace === 'object'
      ? { ...source.trace, adapter: source.trace.adapter || AISHA_RUNTIME_PACKAGE }
      : { status: 'succeeded', adapter: AISHA_RUNTIME_PACKAGE },
    engineMode: String(source.engineMode || 'production').trim() || 'production',
    aishaEngineConnected: source.aishaEngineConnected === true,
    confidence: Number(source.confidence || 0) || 0,
    fallbackReason: String(source.fallbackReason || '').trim(),
    sourcePackage: AISHA_RUNTIME_PACKAGE
  };
}

async function callAishaEngine(input = {}) {
  const request = createAishaStudioPulseRequest(input);
  if (!aishaEngineEnabled()) {
    const diagnostics = {
      ...baseDiagnostics(request),
      rejectionReason: 'aisha-not-connected'
    };
    return attachAishaDiagnostics(createDisconnectedAishaResponse(request), diagnostics);
  }
  const diagnostics = baseDiagnostics(request);
  try {
    const runtime = await runtimeImporter(AISHA_RUNTIME_PACKAGE);
    diagnostics.packageImportOk = true;
    const processAishaRequest = runtime?.processAishaRequest || runtime?.default?.processAishaRequest;
    diagnostics.processAishaRequestType = typeof processAishaRequest;
    if (typeof processAishaRequest !== 'function') {
      return createUnavailableAishaResponse(request, 'aisha-runtime-missing-public-surface', diagnostics);
    }
    const response = normalizeAishaResponse(await processAishaRequest(request, { engineMode: 'production' }), request);
    diagnostics.responseOk = response.ok === true;
    diagnostics.responseEngineMode = String(response.engineMode || '');
    diagnostics.responseConnected = response.aishaEngineConnected === true;
    diagnostics.responseCount = Array.isArray(response.responses) ? response.responses.length : 0;
    diagnostics.firstResponseHasContent = firstResponseHasContent(response);
    const usability = getAishaResponseUsability(response);
    diagnostics.rejectionReason = usability.usable ? '' : usability.reason;
    return usability.usable
      ? attachAishaDiagnostics(response, diagnostics)
      : createUnavailableAishaResponse(request, usability.reason || 'aisha-runtime-unusable-response', diagnostics);
  } catch (err) {
    diagnostics.rejectionReason = reasonForError(err);
    return createUnavailableAishaResponse(request, diagnostics.rejectionReason, diagnostics);
  }
}

function getAishaResponseUsability(response = {}) {
  if (!response || typeof response !== 'object') return { usable: false, reason: 'missing-response' };
  if (response.aishaEngineConnected !== true) return { usable: false, reason: 'not-connected' };
  if (['mock', 'unavailable'].includes(String(response.engineMode || '').trim().toLowerCase())) {
    return { usable: false, reason: 'mock-or-unavailable-engine' };
  }
  const responses = Array.isArray(response.responses) ? response.responses : [];
  if (!responses.length) return { usable: false, reason: 'no-responses' };
  const hasContent = responses.some(item => String(item?.content || item?.text || '').trim());
  if (!hasContent) return { usable: false, reason: 'empty-response-content' };
  const hasNonMockContent = responses.some(item => {
    const content = String(item?.content || item?.text || '').trim();
    return content && content !== '[Mock A.I.S.H.A]';
  });
  if (!hasNonMockContent) return { usable: false, reason: 'mock-text-response' };
  return { usable: true, reason: '' };
}

function isUsableAishaResponse(response = {}) {
  return getAishaResponseUsability(response).usable;
}

function __setAishaRuntimeImporterForTests(importer) {
  runtimeImporter = typeof importer === 'function'
    ? importer
    : specifier => import(specifier);
}

module.exports = {
  callAishaEngine,
  isUsableAishaResponse,
  getAishaResponseUsability,
  __setAishaRuntimeImporterForTests
};
