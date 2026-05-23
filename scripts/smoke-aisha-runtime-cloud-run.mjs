const backendUrl = String(
  process.env.BACKEND_URL ||
  process.argv.find((arg) => /^https?:\/\//i.test(arg)) ||
  ''
).trim().replace(/\/+$/, '');

if (!backendUrl) {
  console.error('Set BACKEND_URL or pass the backend URL as the first URL argument.');
  process.exit(2);
}

function safePickStatus(status = {}) {
  return {
    ok: status.ok,
    aishaEngineEnabled: status.aishaEngineEnabled,
    aishaAttempted: status.aishaAttempted,
    aishaEngineConnected: status.aishaEngineConnected,
    aishaEngineMode: status.aishaEngineMode,
    activeEngine: status.activeEngine,
    fallbackReason: status.fallbackReason,
    runtimeCredentialProvided: status.runtimeCredentialProvided,
    runtimeCredentialSource: status.runtimeCredentialSource,
    runtimeTimeoutMs: status.runtimeTimeoutMs,
    modelUsed: status.modelUsed
  };
}

async function fetchJson(pathname) {
  const url = `${backendUrl}${pathname}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${pathname} returned non-JSON HTTP ${response.status}`);
  }
  return { httpStatus: response.status, json };
}

const health = await fetchJson('/health');
const status = await fetchJson('/api/studio/pulse/aisha-status');
const summary = {
  backendUrl,
  healthHttpStatus: health.httpStatus,
  healthOk: health.json?.ok === true,
  statusHttpStatus: status.httpStatus,
  ...safePickStatus(status.json || {})
};

console.log(JSON.stringify(summary, null, 2));

const connected = status.json?.aishaEngineConnected === true;
const runtimeUnavailable = String(status.json?.fallbackReason || '') === 'aisha-runtime-unavailable';

if (!connected || runtimeUnavailable) {
  console.error('A.I.S.H.A runtime smoke failed: Cloud Run is not connected to aisha-runtime-pack1.');
  process.exit(1);
}
