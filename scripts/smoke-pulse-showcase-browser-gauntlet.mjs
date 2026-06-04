#!/usr/bin/env node

import { chromium } from 'playwright';

const FRONTEND_URL = String(
  process.env.FRONTEND_URL ||
  'https://silva-os-live.vercel.app/pulse-showcase?embed=1&codex=browser-gauntlet'
).trim();
const TURN_TIMEOUT_MS = Math.max(15000, Number(process.env.TURN_TIMEOUT_MS || 60000) || 60000);
const IS_LOCAL_FRONTEND = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(FRONTEND_URL);
const DEFAULT_TURN_DELAY_MS = IS_LOCAL_FRONTEND ? 0 : 25000;
const TURN_DELAY_MS = Math.max(
  0,
  Number(process.env.BROWSER_GAUNTLET_TURN_DELAY_MS ?? DEFAULT_TURN_DELAY_MS) || 0
);
const LEGACY_TURN_RX = /\/api\/studio\/pulse(?:$|\?)/;
const LEAK_RX = /socialCues|generatorPrompt|aishaDiagnostics|requestShapeSummary|processAishaRequestType|AIza[0-9A-Za-z_-]+|GEMINI_API_KEY|GOOGLE_API_KEY|PRIVATE KEY/i;
const REJECTED_RX = /\b(objective is clear|not discussing|personal fitness routines|not the objective|focus is required|that's a solid goal|muscles huh|let'?s get you started|bodyweight basics|bodyweight exercises|eating enough protein|consistent effort|miracles overnight|track your lifts|measuring progress|just guessing|hydrate|workout buddy|don'?t overcomplicate it initially|just show up|show up and do the work|compound movements|multiple muscle groups|focused session|alternate between upper body and lower body|technically sound|poor form|fast track to injury|time constraint sharpens|current priorities|operational parameters|feedback is noted|perform usefulness|style guide|technical specs)\b/i;
const FITNESS_RX = /\b(muscle|training|train|workout|sets|reps|push|pull|squat|hinge|plank|sleep|recovery|week one)\b/i;

const SCENARIOS = [
  {
    prompt: 'LOL I WANNA GROW MY MUSCLES',
    mustMatch: FITNESS_RX
  },
  {
    prompt: 'ok but I only have 20 minutes',
    mustMatch: /\b(twenty minutes|20 minutes|three rounds|squat|push|pull|plank|reps|training)\b/i
  },
  {
    prompt: 'WHAT IS THE OBJECTIVE?',
    mustMatch: /\b(objective|muscle|training|food|sleep|reps|start|plan)\b/i
  },
  {
    prompt: 'BRUH...',
    mustMatch: /\b(no more loop|week one|today|start|training|plain|fair|reset|reps)\b/i
  },
  {
    prompt: 'new topic: what movie should we watch tonight?',
    mustMatch: /\b(Arrival|Spider-Verse|The Menu|movie|film|watch|thriller|comedy|horror|drama|voltage|bite)\b/i,
    mustNotMatch: FITNESS_RX
  },
  {
    prompt: 'you keep repeating yourself',
    mustMatch: /\b(repeat|loop|plain|normal|failed answer|turn in front)\b/i
  },
  {
    prompt: 'I am stressed and this is starting to feel dumb.',
    mustMatch: /\b(stress|stressed|dumb|reset|fair|next move|slow down|recover)\b/i
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function latestVisibleText(messages, fromIndex) {
  return messages.slice(fromIndex).map(item => item.text).join('\n');
}

async function waitForTurn(page, previousCount) {
  await page.waitForFunction((count) => {
    const send = document.querySelector('#send-turn');
    const input = document.querySelector('#user-text');
    const messages = document.querySelectorAll('.message');
    return messages.length > count && send && input && !send.disabled && !input.disabled;
  }, previousCount, { timeout: TURN_TIMEOUT_MS });
}

async function readMessages(page) {
  return page.evaluate(() => [...document.querySelectorAll('.message')].map((node) => ({
    speaker: node.querySelector('.speaker')?.textContent?.trim() || '',
    role: node.querySelector('.message-role')?.textContent?.trim() || '',
    text: node.querySelector('.message-text')?.textContent?.trim() || ''
  })));
}

async function readPageState(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth, body.scrollWidth - body.clientWidth),
      runtimeText: document.querySelector('#turn-state-value')?.textContent?.trim()
        || document.querySelector('#turn-chip-value')?.textContent?.trim()
        || document.body.innerText,
      bodyText: document.body.innerText
    };
  });
}

const browser = await chromium.launch({ headless: process.env.HEADLESS !== '0' });
try {
  const page = await browser.newPage({ viewport: { width: 420, height: 920 } });
  const requests = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/studio/pulse')) requests.push(url);
  });

  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 60000 });
  let state = await readPageState(page);
  assert(state.overflowX <= 2, `initial viewport has horizontal overflow ${state.overflowX}px`);
  assert(!LEAK_RX.test(state.bodyText), 'initial page leaked runtime internals or secret-like material');

  let messages = await readMessages(page);
  for (const scenario of SCENARIOS) {
    const previousCount = messages.length;
    await page.fill('#user-text', scenario.prompt);
    await page.click('#send-turn');
    await waitForTurn(page, previousCount);
    messages = await readMessages(page);
    state = await readPageState(page);
    const visible = latestVisibleText(messages, previousCount);

    assert(visible.trim(), `turn produced no visible text for "${scenario.prompt}"`);
    assert(!LEAK_RX.test(visible), `turn leaked runtime internals for "${scenario.prompt}": ${visible}`);
    assert(!REJECTED_RX.test(visible), `turn showed rejected room text for "${scenario.prompt}": ${visible}`);
    assert(scenario.mustMatch.test(visible), `turn missed expected visible behavior for "${scenario.prompt}": ${visible}`);
    if (scenario.mustNotMatch) {
      assert(!scenario.mustNotMatch.test(visible), `turn leaked stale prior-topic behavior for "${scenario.prompt}": ${visible}`);
    }
    assert(/Room answer accepted|Runtime repaired answer|Fallback carried this turn|Pack 1 connected|Local fallback/i.test(state.runtimeText), `runtime state missing after "${scenario.prompt}"`);
    assert(state.overflowX <= 2, `viewport overflow after "${scenario.prompt}": ${state.overflowX}px`);

    console.error(`\nUSER: ${scenario.prompt}`);
    for (const message of messages.slice(previousCount)) {
      console.error(`- ${message.speaker || 'Unknown'} [${message.role || 'message'}]: ${message.text}`);
    }
    if (TURN_DELAY_MS > 0) await sleep(TURN_DELAY_MS);
  }

  assert(requests.some(url => url.includes('/api/studio/pulse-showcase/turn-stream')), 'browser did not request /turn-stream');
  assert(!requests.some(url => LEGACY_TURN_RX.test(url)), 'browser requested legacy /api/studio/pulse');
  console.log(JSON.stringify({
    ok: true,
    frontendUrl: FRONTEND_URL,
    turns: SCENARIOS.length,
    messageCount: messages.length,
    streamRequests: requests.filter(url => url.includes('/api/studio/pulse-showcase/turn-stream')).length
  }, null, 2));
} finally {
  await browser.close();
}
