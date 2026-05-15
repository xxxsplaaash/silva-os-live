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

function createUnavailableAishaResponse(request = {}, reason = 'aisha-runtime-failed') {
  return createDisconnectedAishaResponse(request, {
    responses: [],
    trace: {
      status: 'failed',
      adapter: AISHA_RUNTIME_PACKAGE,
      reason: safeReason(reason)
    },
    engineMode: 'unavailable',
    aishaEngineConnected: false,
    confidence: 0,
    fallbackReason: safeReason(reason)
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
    return createDisconnectedAishaResponse(request);
  }
  try {
    const runtime = await runtimeImporter(AISHA_RUNTIME_PACKAGE);
    const processAishaRequest = runtime?.processAishaRequest || runtime?.default?.processAishaRequest;
    if (typeof processAishaRequest !== 'function') {
      return createUnavailableAishaResponse(request, 'aisha-runtime-missing-public-surface');
    }
    const response = normalizeAishaResponse(
      await processAishaRequest(request, { deps: {}, engineMode: 'production' }),
      request
    );
    return isUsableAishaResponse(response)
      ? response
      : createUnavailableAishaResponse(request, 'aisha-runtime-unusable-response');
  } catch (err) {
    return createUnavailableAishaResponse(request, reasonForError(err));
  }
}

function isUsableAishaResponse(response = {}) {
  if (!response || typeof response !== 'object') return false;
  if (response.aishaEngineConnected !== true) return false;
  if (['mock', 'unavailable'].includes(String(response.engineMode || '').trim().toLowerCase())) return false;
  const responses = Array.isArray(response.responses) ? response.responses : [];
  return responses.some(item => {
    const content = String(item?.content || item?.text || '').trim();
    return content && content !== '[Mock A.I.S.H.A]';
  });
}

function __setAishaRuntimeImporterForTests(importer) {
  runtimeImporter = typeof importer === 'function'
    ? importer
    : specifier => import(specifier);
}

module.exports = {
  callAishaEngine,
  isUsableAishaResponse,
  __setAishaRuntimeImporterForTests
};
