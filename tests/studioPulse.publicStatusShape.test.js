const test = require('node:test');
const assert = require('node:assert/strict');

const studioRouter = require('../routes/studio');

test('public A.I.S.H.A status strips credentials, persistence internals, and trace labels', () => {
  const status = studioRouter.__test.publicAishaStatus({
    aishaEngineConnected: true,
    aishaEngineMode: 'mock',
    activeEngine: 'aisha-runtime-pack1',
    updatedAt: '2026-06-05T19:29:11.992Z',
    runtimeCredentialProvided: true,
    runtimeCredentialLength: 39,
    runtimeCredentialSource: 'Mock Gemini',
    aishaPersistenceMode: 'postgres',
    aishaPersistenceBackend: 'postgres',
    aishaPersistenceConnected: true,
    aishaTraceStatus: 'accepted',
    aishaTraceFailureReason: 'none'
  });

  assert.deepEqual(Object.keys(status).sort(), [
    'activeEngine',
    'aishaConnected',
    'aishaEngineConnected',
    'aishaEngineMode',
    'engineMode',
    'ok',
    'updatedAt'
  ].sort());
  assert.equal(status.ok, true);
  assert.equal(status.aishaConnected, true);
  assert.equal(status.aishaEngineConnected, true);
  assert.equal(status.activeEngine, 'aisha-runtime-pack1');
  assert.equal(status.engineMode, 'production');
  assert.equal(status.aishaEngineMode, 'production');
  assert.equal(status.updatedAt, '2026-06-05T19:29:11.992Z');
  assert.doesNotMatch(JSON.stringify(status), /Mock Gemini|AIza|runtimeCredential|postgres|aishaPersistence|trace/i);
});

test('public A.I.S.H.A status reports local fallback without exposing backend details', () => {
  const status = studioRouter.__test.publicAishaStatus({
    aishaEngineConnected: false,
    aishaEngineMode: 'unavailable',
    activeEngine: 'local-room-intelligence',
    fallbackReason: 'missing-credentials',
    runtimeCredentialProvided: false,
    aishaPersistenceMode: 'memory',
    aishaPersistenceBackend: 'in-memory',
    aishaTraceStatus: 'failed'
  });

  assert.equal(status.ok, true);
  assert.equal(status.aishaConnected, false);
  assert.equal(status.aishaEngineConnected, false);
  assert.equal(status.activeEngine, 'local-room-intelligence');
  assert.equal(status.engineMode, 'unavailable');
  assert.equal(status.aishaEngineMode, 'unavailable');
  assert.equal(typeof status.updatedAt, 'string');
  assert.doesNotMatch(JSON.stringify(status), /runtimeCredential|aishaPersistence|in-memory|trace|missing-credentials/i);
});

test('public showcase status strips persistence backend mode while keeping connection signal', () => {
  const status = studioRouter.__test.publicPulseShowcaseStatus({
    aishaEngineConnected: true,
    aishaEngineMode: 'production',
    aishaPersistenceMode: 'postgres',
    aishaPersistenceBackend: 'postgres',
    aishaPersistenceConnected: true,
    aishaPersistenceFailureReason: 'postgres password rejected',
    aishaTraceStatus: 'accepted',
    runtimeCredentialSource: 'Mock Gemini'
  });

  assert.equal(status.ok, true);
  assert.equal(status.activeEngine, 'aisha-runtime-pack1');
  assert.equal(status.aishaEngineConnected, true);
  assert.deepEqual(status.persistence, { connected: true, active: false });
  assert.equal(Object.prototype.hasOwnProperty.call(status.persistence, 'mode'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(status.persistence, 'backend'), false);
  assert.doesNotMatch(JSON.stringify(status), /postgres|in-memory|unavailable|password|runtimeCredential|Mock Gemini|trace/i);
});
