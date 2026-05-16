const MAX_GENERATION_STATUSES = 120;
const STATUS_TTL_MS = 45 * 60 * 1000;

const statuses = new Map();

function cleanId(value = '') {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 140);
}

function pruneStatuses(now = Date.now()) {
  for (const [id, status] of statuses.entries()) {
    if (!status || now - Number(status.updatedAtMs || status.createdAtMs || 0) > STATUS_TTL_MS) {
      statuses.delete(id);
    }
  }
  if (statuses.size <= MAX_GENERATION_STATUSES) return;
  const staleFirst = Array.from(statuses.entries()).sort((a, b) => {
    return Number(a[1]?.updatedAtMs || 0) - Number(b[1]?.updatedAtMs || 0);
  });
  while (statuses.size > MAX_GENERATION_STATUSES && staleFirst.length) {
    statuses.delete(staleFirst.shift()[0]);
  }
}

function generationIdFromBody(body = {}, fallback = '') {
  const metadata = body && typeof body.metadata === 'object' ? body.metadata : {};
  return cleanId(
    body.clientGenerationId ||
    body.generationId ||
    metadata.clientGenerationId ||
    metadata.generationId ||
    fallback
  );
}

function writeStatus(id, patch = {}) {
  const clean = cleanId(id);
  if (!clean) return null;
  const now = Date.now();
  pruneStatuses(now);
  const existing = statuses.get(clean) || {};
  const next = {
    ...existing,
    id: clean,
    createdAtMs: existing.createdAtMs || now,
    updatedAtMs: now,
    updatedAt: new Date(now).toISOString(),
    ...patch
  };
  statuses.set(clean, next);
  return next;
}

function markGenerationPending(id, meta = {}) {
  return writeStatus(id, {
    status: 'pending',
    ok: null,
    startedAt: new Date().toISOString(),
    requestId: meta.requestId || null,
    character: meta.character || null,
    shotMode: meta.shotMode || null,
    modelId: meta.modelId || meta.preferredModel || null,
    result: null,
    error: null
  });
}

function markGenerationComplete(id, result = {}) {
  return writeStatus(id || result.generationId || result.requestId, {
    status: 'complete',
    ok: true,
    completedAt: new Date().toISOString(),
    requestId: result.requestId || null,
    modelId: result.modelId || result.selectedModel?.id || null,
    result,
    error: null
  });
}

function markGenerationFailed(id, error = {}) {
  const publicError = {
    ok: false,
    error: String(error.error || error.code || 'generation_failed'),
    message: String(error.message || error.safeMessage || 'Image generation failed.'),
    statusCode: Number(error.statusCode || error.status || 500),
    requestId: error.requestId || null
  };
  return writeStatus(id || publicError.requestId, {
    status: 'failed',
    ok: false,
    failedAt: new Date().toISOString(),
    requestId: publicError.requestId || null,
    result: null,
    error: publicError
  });
}

function getGenerationStatus(id) {
  pruneStatuses();
  const clean = cleanId(id);
  if (!clean || !statuses.has(clean)) {
    return {
      ok: true,
      id: clean,
      status: 'unknown',
      result: null,
      error: null
    };
  }
  const status = statuses.get(clean);
  return {
    ok: true,
    id: clean,
    status: status.status || 'unknown',
    requestId: status.requestId || null,
    updatedAt: status.updatedAt || null,
    startedAt: status.startedAt || null,
    completedAt: status.completedAt || null,
    failedAt: status.failedAt || null,
    result: status.result || null,
    error: status.error || null
  };
}

function clearGenerationStatuses() {
  statuses.clear();
}

module.exports = {
  generationIdFromBody,
  markGenerationPending,
  markGenerationComplete,
  markGenerationFailed,
  getGenerationStatus,
  clearGenerationStatuses,
  _private: {
    cleanId,
    pruneStatuses,
    statuses
  }
};
