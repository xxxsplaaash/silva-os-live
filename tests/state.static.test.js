const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

test('Pulse room state endpoint reads only the room v1 overlay', () => {
  const source = read('routes/state.js');
  const start = source.indexOf("router.get('/pulse-room'");
  assert.ok(start > 0, 'pulse-room route not found');
  const end = source.indexOf('module.exports', start);
  const route = source.slice(start, end);
  assert.match(route, /getRuntimeOverlayState\(['"]runtime_overlay_room_v1['"]\)/);
  assert.doesNotMatch(route, /getRuntimeOverlayState\(['"]runtime_overlay['"]\)/);
  assert.match(route, /resolveActivePulseThread\(runtime,\s*\{\s*fallbackToThreads:\s*false\s*\}\)/);
});

test('Pulse runtime persistence writes room v1 overlay and not legacy runtime overlay', () => {
  const source = read('lib/studio/roomRuntime.js');
  const start = source.indexOf('function persistConsciousRuntime');
  assert.ok(start > 0, 'persistConsciousRuntime not found');
  const end = source.indexOf('function captureRoomRuntimeTurn', start);
  const fn = source.slice(start, end);
  assert.match(fn, /runtime_overlay_room_v1/);
  assert.doesNotMatch(fn, /key:\s*['"]runtime_overlay['"]/);
  assert.doesNotMatch(fn, /activeThreadId:\s*String\(contract\.activeThreadId/);
});

test('Studio Pulse v400 boots to a clean room instead of restoring saved active thread', () => {
  const source = read('studio_pulse_v400.js');
  const start = source.indexOf('function loadPulse');
  assert.ok(start > 0, 'loadPulse not found');
  const end = source.indexOf('function providerDefaults', start);
  const loadPulse = source.slice(start, end);
  assert.match(loadPulse, /preparePulseLaunchState\(primary\)/);
  assert.doesNotMatch(loadPulse, /return normalizePulseState\(primary\)/);

  const bridgeStart = source.indexOf('function bridgePulseHomesIntoState');
  assert.ok(bridgeStart > 0, 'bridgePulseHomesIntoState not found');
  const bridgeEnd = source.indexOf('function flushPulseGlobalState', bridgeStart);
  const bridge = source.slice(bridgeStart, bridgeEnd);
  assert.match(bridge, /delete STATE\.aiCommsCenter\.activeThreadId/);
  assert.doesNotMatch(bridge, /STATE\.aiCommsCenter\.activeThreadId\s*=/);
});
