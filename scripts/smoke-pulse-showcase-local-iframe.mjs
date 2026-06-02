#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(repoRoot, 'dist', 'vercel');
const PORT = Number(process.env.PULSE_SHOWCASE_LOCAL_PORT || 3225);
const ORIGIN = `http://localhost:${PORT}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function log(step, detail = '') {
  console.log(`ok - ${step}${detail ? `: ${detail}` : ''}`);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function finalPayload(body = {}) {
  return {
    ok: true,
    sessionId: String(body.sessionId || 'local-iframe-smoke-session'),
    mode: body.mode === 'continuity_breaker' ? 'continuity_breaker' : 'social_hierarchy_lab',
    activeEngine: 'aisha-runtime-pack1',
    aishaEngineConnected: true,
    roomMood: 'focused',
    responseMode: 'single',
    acceptedByPack1: true,
    fallbackCategory: '',
    runtimePhase: 'final',
    messageEvents: [{
      speakerId: 'aisha',
      speakerName: 'A.I.S.H.A',
      role: 'continuity',
      tone: 'direct',
      text: 'Pack 1 accepted the local iframe proof.',
      visibleState: 'anchoring'
    }],
    silentReactions: [{ speakerId: 'leah', visibleState: 'listening' }],
    continuityLedger: [{
      id: 'local-ledger-proof',
      text: 'Local iframe parent contract proof',
      status: 'active',
      source: 'pack1-memory'
    }],
    diagnostics: {
      fallbackUsed: false,
      traceStatus: 'succeeded',
      persistenceConnected: true
    },
    socialSignals: {
      tension: 22,
      continuityPressure: 38,
      hierarchy: [
        { speakerId: 'aisha', rank: 1, status: 78, delta: 4, visibleState: 'anchoring' },
        { speakerId: 'vanya', rank: 2, status: 68, delta: 0, visibleState: 'listening' }
      ],
      alliances: [],
      interruptions: [],
      roomMove: 'anchor',
      statusEvents: [{
        speakerId: 'aisha',
        kind: 'continuity-anchor',
        weight: 74
      }]
    }
  };
}

function sse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function wrapperHtml() {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Pulse iframe wrapper smoke</title></head>
<body style="margin:0">
  <iframe id="pulse" src="/pulse-showcase?embed=1" style="width:100%;height:900px;border:0"></iframe>
  <script>
    window.__pulseMessages = [];
    window.addEventListener('message', function (event) {
      window.__pulseMessages.push(event.data);
    });
  </script>
</body>
</html>`;
}

function serveShowcaseHtml(res) {
  const filePath = path.join(distRoot, 'pulse-showcase.html');
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(
    /window\.SILVA_API_BASE_URL=.*?;/,
    `window.SILVA_API_BASE_URL=${JSON.stringify(ORIGIN)};`
  );
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(html);
}

function createServerState() {
  return {
    requests: []
  };
}

function createServer(state) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', ORIGIN);
    state.requests.push({ method: req.method, path: url.pathname });

    if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/studio/pulse-showcase/')) {
      res.writeHead(204, {
        'access-control-allow-origin': ORIGIN,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type,accept',
        'access-control-max-age': '600'
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/studio/pulse-showcase/status') {
      json(res, 200, {
        ok: true,
        activeEngine: 'aisha-runtime-pack1',
        aishaEngineConnected: true,
        aishaEngineMode: 'production',
        persistence: { mode: 'postgres', connected: true },
        modes: ['social_hierarchy_lab', 'continuity_breaker'],
        maxUserTextLength: 500
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/studio/pulse-showcase/turn-stream') {
      const body = await readBody(req);
      const payload = finalPayload(body);
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive'
      });
      sse(res, 'turn_start', { sessionId: payload.sessionId, mode: payload.mode });
      sse(res, 'runtime_status', { ...payload, runtimePhase: 'preflight', acceptedByPack1: false });
      sse(res, 'processing', { visibleState: 'Room is processing the turn.' });
      sse(res, 'social_signals', payload.socialSignals);
      sse(res, 'message', payload.messageEvents[0]);
      sse(res, 'silent_reaction', payload.silentReactions[0]);
      sse(res, 'ledger', { continuityLedger: payload.continuityLedger });
      sse(res, 'runtime_status', payload);
      sse(res, 'final', payload);
      res.end();
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/studio/pulse-showcase/turn') {
      const body = await readBody(req);
      json(res, 200, finalPayload(body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/__pulse-wrapper') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      });
      res.end(wrapperHtml());
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/pulse-showcase' || url.pathname === '/pulse-showcase.html')) {
      serveShowcaseHtml(res);
      return;
    }

    const requestedPath = url.pathname === '/' ? '/pulse-showcase.html' : decodeURIComponent(url.pathname);
    const filePath = path.resolve(distRoot, requestedPath.replace(/^\/+/, ''));
    if (!filePath.startsWith(distRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'content-type': mimeType(filePath),
      'cache-control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function runBrowserProof(state) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 430, height: 920 } });
    await page.goto(`${ORIGIN}/__pulse-wrapper`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const iframe = await page.waitForSelector('#pulse', { timeout: 15_000 });
    const frame = await iframe.contentFrame();
    await frame.waitForSelector('#user-text', { timeout: 15_000 });

    await page.waitForFunction(() => {
      const types = window.__pulseMessages.map(item => item && item.type);
      return types.includes('PULSE_READY') && types.includes('PULSE_HEIGHT') && types.includes('PULSE_STATUS');
    }, null, { timeout: 15_000 });

    await page.evaluate(origin => {
      document.querySelector('#pulse').contentWindow.postMessage({
        type: 'PULSE_SET_MODE',
        mode: 'continuity_breaker'
      }, origin);
    }, ORIGIN);
    await frame.waitForFunction(() => document.querySelector('.pulse-shell')?.dataset.mode === 'continuity_breaker', null, { timeout: 10_000 });

    await page.evaluate(origin => {
      document.querySelector('#pulse').contentWindow.postMessage({ type: 'PULSE_RESET' }, origin);
    }, ORIGIN);
    await page.waitForFunction(() => window.__pulseMessages.some(item => item && item.type === 'PULSE_TURN_STATE'), null, { timeout: 10_000 });

    await frame.fill('#user-text', 'local iframe proof should not leave the iframe');
    await Promise.all([
      frame.waitForFunction(() => document.body.innerText.includes('Pack 1 accepted'), null, { timeout: 20_000 }),
      frame.click('#send-turn')
    ]);

    const result = await page.evaluate(() => {
      const messages = window.__pulseMessages || [];
      const types = messages.map(item => item && item.type).filter(Boolean);
      return {
        types,
        payloadText: JSON.stringify(messages),
        heightCount: types.filter(type => type === 'PULSE_HEIGHT').length,
        turnStateCount: types.filter(type => type === 'PULSE_TURN_STATE').length,
        statusCount: types.filter(type => type === 'PULSE_STATUS').length
      };
    });

    const requestedPaths = state.requests.map(item => `${item.method} ${item.path}`);
    assert(result.types.includes('PULSE_READY'), 'PULSE_READY was not posted');
    assert(result.types.includes('PULSE_HEIGHT'), 'PULSE_HEIGHT was not posted');
    assert(result.types.includes('PULSE_STATUS'), 'PULSE_STATUS was not posted');
    assert(result.types.includes('PULSE_TURN_STATE'), 'PULSE_TURN_STATE was not posted');
    assert(result.heightCount >= 2, `expected multiple PULSE_HEIGHT messages, saw ${result.heightCount}`);
    assert(result.turnStateCount >= 2, `expected reset and final PULSE_TURN_STATE messages, saw ${result.turnStateCount}`);
    assert(requestedPaths.some(path => path === 'POST /api/studio/pulse-showcase/turn-stream'), 'iframe did not request turn-stream');
    assert(!requestedPaths.some(path => path === 'POST /api/studio/pulse'), 'iframe requested legacy /api/studio/pulse');
    assert(!/local iframe proof should not leave the iframe/i.test(result.payloadText), 'parent messages leaked user text');
    assert(!/generatorPrompt|socialCues|provider payload|AIza|PRIVATE KEY/i.test(result.payloadText), 'parent messages leaked internal data');
    log('local iframe parent messages', `${result.types.length} safe messages`);
  } finally {
    await browser.close();
  }
}

if (!fs.existsSync(path.join(distRoot, 'pulse-showcase.html'))) {
  throw new Error('dist/vercel/pulse-showcase.html missing. Run npm run build:vercel first.');
}

const state = createServerState();
const server = createServer(state);

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(PORT, '127.0.0.1', resolve);
});

try {
  await runBrowserProof(state);
  console.log('Studio Pulse local iframe smoke passed.');
} finally {
  await new Promise(resolve => server.close(resolve));
}
