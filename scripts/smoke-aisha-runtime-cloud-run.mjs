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
  const connected = status.aishaConnected === true || status.aishaEngineConnected === true;
  const engineMode = String(status.engineMode || status.aishaEngineMode || '');
  return {
    ok: status.ok,
    aishaConnected: connected,
    aishaEngineConnected: connected,
    engineMode,
    aishaEngineMode: engineMode,
    activeEngine: status.activeEngine,
    updatedAt: status.updatedAt,
    persistence: status.persistence || null
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
const showcase = await fetchJson('/api/studio/pulse-showcase/status?refresh=1');
const summary = {
  backendUrl,
  healthHttpStatus: health.httpStatus,
  healthOk: health.json?.ok === true,
  statusHttpStatus: status.httpStatus,
  ...safePickStatus(status.json || {}),
  showcaseHttpStatus: showcase.httpStatus,
  showcasePersistence: showcase.json?.persistence || null
};

console.log(JSON.stringify(summary, null, 2));

const connected = status.json?.aishaConnected === true || status.json?.aishaEngineConnected === true;
const runtimeUnavailable = status.json?.activeEngine !== 'aisha-runtime-pack1';

if (!connected || runtimeUnavailable) {
  console.error('A.I.S.H.A runtime smoke failed: Cloud Run is not connected to aisha-runtime-pack1.');
  process.exit(1);
}
