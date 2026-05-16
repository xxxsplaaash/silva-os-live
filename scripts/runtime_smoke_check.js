#!/usr/bin/env node
const { spawnSync } = require('child_process');

const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const probeUrl = process.argv[2] || process.env.SILVA_PROBE_URL || 'http://localhost:3225/probe.html';
const criticalPages = ['home', 'homes', 'workflow', 'ideas', 'campaigns', 'aisha', 'leah', 'claudia', 'grok', 'vanya', 'team', 'providers', 'analytics', 'dev', 'settings'];
const characterPages = ['aisha', 'leah', 'claudia', 'grok', 'vanya'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function decodeEntities(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractJsonBlocks(text) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (start === -1) {
      if (ch === '{') {
        start = i;
        depth = 1;
        inString = false;
        escape = false;
      }
      continue;
    }

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;

    if (depth === 0) {
      blocks.push(text.slice(start, i + 1));
      start = -1;
    }
  }

  return blocks;
}

function assertPage(report, page, expectActive = false) {
  const payload = report.pages && report.pages[page];
  if (!payload || !payload.exists) fail(`[runtime-smoke] ${report.label}: ${page} shell missing`);
  if ((payload.textLen || 0) <= 0) fail(`[runtime-smoke] ${report.label}: ${page} text empty`);
  if ((payload.primaryMatches || 0) <= 0) fail(`[runtime-smoke] ${report.label}: ${page} primary content missing`);
  if (expectActive && !payload.active) fail(`[runtime-smoke] ${report.label}: ${page} did not become active`);
  if (page === 'homes' && expectActive) {
    if ((payload.homeContinuityRows || 0) < 8) fail(`[runtime-smoke] ${report.label}: homes continuity anchors missing`);
  }
  if (characterPages.includes(page)) {
    if (!payload.heroActions) fail(`[runtime-smoke] ${report.label}: ${page} hero actions missing`);
    if (!payload.heroHint) fail(`[runtime-smoke] ${report.label}: ${page} hero subhint missing`);
    if (!payload.heroModeNote) fail(`[runtime-smoke] ${report.label}: ${page} mode note missing`);
    if (expectActive && !payload.heroAvatarImg) fail(`[runtime-smoke] ${report.label}: ${page} avatar image missing`);
    const tabReports = payload.tabReports || {};
    ['identity','personal','life','digital','prompts','captions','professional'].forEach(tab => {
      const tabPayload = tabReports[tab];
      if (!tabPayload) fail(`[runtime-smoke] ${report.label}: ${page} ${tab} tab missing`);
      if (tabPayload.error) fail(`[runtime-smoke] ${report.label}: ${page} ${tab} tab errored: ${tabPayload.error}`);
      if ((tabPayload.textLen || 0) <= 0) fail(`[runtime-smoke] ${report.label}: ${page} ${tab} tab empty`);
      if ((tabPayload.cards || 0) <= 0 && !['prompts','captions'].includes(tab)) fail(`[runtime-smoke] ${report.label}: ${page} ${tab} tab structure missing`);
    });
  }
}

const chrome = spawnSync(
  chromePath,
  ['--headless=new', '--disable-gpu', '--virtual-time-budget=20000', '--dump-dom', probeUrl],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 * 8 }
);

if (chrome.error) fail(`[runtime-smoke] failed to launch Chrome: ${chrome.error.message}`);
if (chrome.status !== 0) fail(`[runtime-smoke] Chrome exited with code ${chrome.status}\n${chrome.stderr || ''}`);

const preMatch = chrome.stdout.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!preMatch) fail('[runtime-smoke] probe output missing <pre id="out"> block');

const decoded = decodeEntities(preMatch[1]);
const reports = extractJsonBlocks(decoded).map(block => JSON.parse(block));
if (!reports.length) fail('[runtime-smoke] no JSON reports found in probe output');

const reportByLabel = new Map(reports.map(report => [report.label, report]));
const afterWarm = reportByLabel.get('after warm');
if (!afterWarm) fail('[runtime-smoke] missing "after warm" report');

criticalPages.forEach(page => assertPage(afterWarm, page, false));

criticalPages.forEach(page => {
  const label = `after ${page}`;
  const report = reportByLabel.get(label);
  if (!report) fail(`[runtime-smoke] missing "${label}" report`);
  assertPage(report, page, true);
});

console.log(JSON.stringify({
  ok: true,
  probeUrl,
  checkedPages: criticalPages.length,
  verified: ['after warm', ...criticalPages.map(page => `after ${page}`)]
}, null, 2));
