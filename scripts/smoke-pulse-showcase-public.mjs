#!/usr/bin/env node

import { chromium } from 'playwright';

const FRONTEND_URL = String(process.env.FRONTEND_URL || 'https://silva-os-live.vercel.app/pulse-showcase?embed=1').trim();
const BACKEND_URL = String(process.env.BACKEND_URL || 'https://silva-backend-799875816242.us-central1.run.app').trim().replace(/\/+$/, '');
const EXPECTED_API_BASE = String(process.env.EXPECTED_API_BASE || BACKEND_URL).trim().replace(/\/+$/, '');
const TRUSTED_BROWSER_ORIGIN = 'https://silva-os-live.vercel.app';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function log(step, detail = '') {
  console.log(`ok - ${step}${detail ? `: ${detail}` : ''}`);
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  return { res, text };
}

async function fetchJson(url, options = {}) {
  const { res, text } = await fetchText(url, options);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${url} did not return JSON: ${text.slice(0, 160)}`);
  }
  return { res, json, text };
}

function parseSse(text) {
  return text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const event = { event: 'message', data: '' };
      const dataLines = [];
      for (const line of block.split(/\n/)) {
        if (line.startsWith('event:')) event.event = line.slice(6).trim();
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      event.data = dataLines.join('\n');
      return event;
    });
}

function assertNoPublicLeaks(label, text) {
  const blocked = [
    /EventSource\b/,
    /WebSocket\b/,
    /\bsocialCues\b/,
    /\bgeneratorPrompt\b/,
    /raw model/i,
    /model preview/i,
    /provider payload/i,
    /aishaDiagnostics\b/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  ];
  for (const pattern of blocked) {
    assert(!pattern.test(text), `${label} exposed blocked marker ${pattern}`);
  }
}

function resolveAssetUrl(html, pageUrl, fileName) {
  const pattern = new RegExp(`<(?:script|link)[^>]+(?:src|href)=["']([^"']*${fileName.replace('.', '\\.')}[^"']*)["']`, 'i');
  const match = html.match(pattern);
  assert(match, `${fileName} asset reference missing`);
  return new URL(match[1], pageUrl).href;
}

async function checkFrontend() {
  const { res, text: html } = await fetchText(FRONTEND_URL, {
    headers: { 'cache-control': 'no-cache' }
  });
  assert(res.ok, `frontend returned ${res.status}`);
  const csp = res.headers.get('content-security-policy') || '';
  assert(/frame-ancestors/i.test(csp), 'frontend CSP frame-ancestors header missing');
  assert(csp.includes('https://silvastudios.co.za'), 'CSP missing silvastudios.co.za');
  assert(csp.includes('https://www.silvastudios.co.za'), 'CSP missing www.silvastudios.co.za');
  assert(html.includes('window.SILVA_API_BASE_URL='), 'injected window.SILVA_API_BASE_URL missing');
  assert(html.includes(EXPECTED_API_BASE), `frontend API base did not include ${EXPECTED_API_BASE}`);
  assert(/assets\/pulse_showcase\.css/.test(html), 'showcase CSS reference missing');
  assert(/assets\/pulse_showcase\.js/.test(html), 'showcase JS reference missing');
  assertNoPublicLeaks('showcase html', html);

  const jsUrl = resolveAssetUrl(html, res.url || FRONTEND_URL, 'pulse_showcase.js');
  const cssUrl = resolveAssetUrl(html, res.url || FRONTEND_URL, 'pulse_showcase.css');
  const [{ res: jsRes, text: js }, { res: cssRes, text: css }] = await Promise.all([
    fetchText(jsUrl, { headers: { 'cache-control': 'no-cache' } }),
    fetchText(cssUrl, { headers: { 'cache-control': 'no-cache' } })
  ]);
  assert(jsRes.ok, `showcase JS returned ${jsRes.status}`);
  assert(cssRes.ok, `showcase CSS returned ${cssRes.status}`);
  assert(js.includes('/api/studio/pulse-showcase/turn-stream'), 'public JS missing turn-stream path');
  assert(js.includes('/api/studio/pulse-showcase/turn'), 'public JS missing non-stream fallback path');
  assert(!/api\/studio\/pulse['"`)]/.test(js), 'public JS still calls legacy /api/studio/pulse turn path');
  ['PULSE_READY', 'PULSE_HEIGHT', 'PULSE_STATUS', 'PULSE_TURN_STATE', 'PULSE_ERROR'].forEach((name) => {
    assert(js.includes(name), `${name} message missing from public JS`);
  });
  assert(js.includes('is-pulse-embed'), 'embed body class missing from public JS');
  assert(!/return ['"]\*['"]/.test(js), 'public JS still has wildcard parent target fallback');
  assert(!/postMessage\([^;]+,\s*['"]\*['"]/.test(js), 'public JS still posts parent messages to wildcard target');
  assert(css.includes('body.is-pulse-embed'), 'embed CSS missing');
  assertNoPublicLeaks('showcase js', js);
  log('frontend page, CSP, injected API base, stream client, and public assets');
}

async function checkCorsPreflight() {
  const preflights = [
    ['/api/studio/pulse-showcase/status', 'https://silva-os-live.vercel.app', 'GET'],
    ['/api/studio/pulse-showcase/turn', 'https://silvastudios.co.za', 'POST'],
    ['/api/studio/pulse-showcase/turn-stream', 'https://www.silvastudios.co.za', 'POST']
  ];

  for (const [path, origin, method] of preflights) {
    const { res, text } = await fetchText(`${BACKEND_URL}${path}`, {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': method,
        'access-control-request-headers': 'content-type'
      }
    });
    assert(res.status === 204, `${path} preflight for ${origin} returned ${res.status}: ${text.slice(0, 120)}`);
    assert(res.headers.get('access-control-allow-origin') === origin, `${path} preflight did not echo ${origin}`);
    assert(/GET,POST,OPTIONS/i.test(res.headers.get('access-control-allow-methods') || ''), `${path} preflight methods missing`);
    assert(/content-type/i.test(res.headers.get('access-control-allow-headers') || ''), `${path} preflight headers missing content-type`);
  }

  const { res: blockedRes, json: blockedJson } = await fetchJson(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://not-silva.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    }
  });
  assert(blockedRes.status === 403, `blocked preflight returned ${blockedRes.status}`);
  assert(blockedRes.headers.get('access-control-allow-origin') === null, 'blocked preflight exposed CORS allow-origin');
  assert(blockedJson && blockedJson.error === 'pulse-showcase-origin-blocked', 'blocked preflight did not return safe origin error');
  assert(/room held that turn/i.test(blockedJson.message || ''), 'blocked preflight did not return held-turn copy');
  assertNoPublicLeaks('blocked preflight', JSON.stringify(blockedJson));
  log('backend CORS preflight', 'trusted origins pass and blocked origin is safe');
}

async function checkBackendStatus() {
  const { res, json } = await fetchJson(`${BACKEND_URL}/api/studio/pulse-showcase/status`, {
    headers: { origin: TRUSTED_BROWSER_ORIGIN }
  });
  assert(res.ok, `showcase status returned ${res.status}`);
  assert(json && json.ok === true, 'showcase status ok flag missing');
  assert(json.activeEngine === 'aisha-runtime-pack1', `activeEngine was ${json.activeEngine}`);
  assert(json.aishaEngineMode === 'production' || json.aishaEngineConnected === true, 'A.I.S.H.A production/connected status missing');
  assert(json.persistence && json.persistence.connected === true, 'Pack 1 persistence is not connected');
  log('backend showcase status', `${json.activeEngine}, persistence connected`);
}

async function checkStreamFinal() {
  const sessionId = `v143-public-smoke-${Date.now()}`;
  const payload = {
    sessionId,
    mode: 'continuity_breaker',
    userText: 'My dashboard preference is obsidian with one red accent.',
    roomState: {
      roomMood: 'focused',
      responseMode: 'single'
    }
  };
  const { res, text } = await fetchText(`${BACKEND_URL}/api/studio/pulse-showcase/turn-stream`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: TRUSTED_BROWSER_ORIGIN
    },
    body: JSON.stringify(payload)
  });
  assert(res.ok, `turn stream returned ${res.status}: ${text.slice(0, 180)}`);
  assert(/text\/event-stream/i.test(res.headers.get('content-type') || ''), 'turn stream content-type was not text/event-stream');
  assertNoPublicLeaks('turn stream', text);
  const events = parseSse(text);
  const finalEvent = events.find((event) => event.event === 'final');
  assert(finalEvent, 'turn stream did not include event: final');
  const finalPayload = JSON.parse(finalEvent.data);
  assert(finalPayload && finalPayload.ok === true, 'final payload ok flag missing');
  assert(Array.isArray(finalPayload.messageEvents), 'final payload messageEvents missing');
  assert(Array.isArray(finalPayload.continuityLedger), 'final payload continuityLedger missing');
  assert(finalPayload.socialSignals && typeof finalPayload.socialSignals === 'object', 'final payload socialSignals missing');
  assert(Number(finalPayload.socialSignals.tension) >= 0 && Number(finalPayload.socialSignals.tension) <= 100, 'socialSignals tension out of bounds');
  log('backend stream final', `${events.length} SSE events`);
}

async function checkViewport(width, height, label) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 45000 });
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth),
        embedMode: body.classList.contains('is-pulse-embed'),
        readyText: document.body.innerText.includes('Studio Pulse')
      };
    });
    assert(result.readyText, `${label} did not render Studio Pulse text`);
    assert(result.embedMode, `${label} did not enable embed mode`);
    assert(result.overflowX <= 2, `${label} horizontal overflow ${result.overflowX}px`);
    log(`${label} viewport`, `${width}x${height}`);
  } finally {
    await browser.close();
  }
}

async function checkBrowserStreamingTurn() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 420, height: 920 } });
    const requests = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/studio/pulse')) requests.push(url);
    });
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 45000 });
    await page.fill('#user-text', 'My dashboard preference is obsidian with one red accent.');
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/studio/pulse-showcase/turn-stream') && response.status() === 200, { timeout: 45000 }),
      page.click('#send-turn')
    ]);
    await page.waitForFunction(() => {
      const text = document.body.innerText || '';
      return text.includes('Room answer accepted')
        || text.includes('Runtime repaired answer')
        || text.includes('Fallback carried this turn');
    }, null, { timeout: 45000 });
    const result = await page.evaluate(() => ({
      hasLedger: Boolean(document.querySelector('#ledger-list')),
      hasDynamics: Boolean(document.querySelector('#dynamics-list')),
      text: document.body.innerText.slice(0, 2000)
    }));
    assert(requests.some((url) => url.includes('/api/studio/pulse-showcase/turn-stream')), 'browser did not request turn-stream');
    assert(!requests.some((url) => /\/api\/studio\/pulse(?:$|\?)/.test(url)), 'browser requested legacy /api/studio/pulse');
    assert(result.hasLedger, 'browser did not render ledger panel');
    assert(result.hasDynamics, 'browser did not render social dynamics panel');
    log('browser streaming turn', 'turn-stream requested and UI reconciled');
  } finally {
    await browser.close();
  }
}

await checkFrontend();
await checkCorsPreflight();
await checkBackendStatus();
await checkStreamFinal();
await checkViewport(1440, 980, 'desktop embed');
await checkViewport(390, 844, 'mobile embed');
await checkBrowserStreamingTurn();

console.log('Studio Pulse public streaming launch smoke passed.');
