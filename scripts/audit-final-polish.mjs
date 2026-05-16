#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const failures = [];

function cleanAssetPath(value) {
  return String(value || '').replace(/^\.\//, '').split('?')[0].trim();
}

function linkedAssets(kind) {
  const pattern = kind === 'css'
    ? /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi
    : /<script[^>]+src=["']([^"']+)["']/gi;
  return [...indexHtml.matchAll(pattern)]
    .map((match) => cleanAssetPath(match[1]))
    .filter((asset) => asset && !/^https?:/i.test(asset))
    .filter((asset) => fs.existsSync(path.join(root, asset)));
}

function lineNo(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function stripComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function runAudit(script) {
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    cwd: root,
    encoding: 'utf8',
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  if (result.status) failures.push(`${script} exited ${result.status}`);
}

function fail(message) {
  failures.push(message);
}

function readLiveFile(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const liveFiles = ['index.html', ...cssAssets, ...jsAssets];

console.log('Final Polish Audit');
console.log(`- Live files checked: ${liveFiles.length}`);
console.log(`- Stylesheets checked: ${cssAssets.length}`);
console.log(`- Scripts checked: ${jsAssets.length}`);

[
  'scripts/audit-live-color-system.mjs',
  'scripts/audit-live-ui-consistency.mjs',
  'scripts/audit-live-spacing-grid.mjs',
  'scripts/audit-live-motion-system.mjs',
  'scripts/audit-live-component-consistency.mjs',
  'scripts/audit-live-async-feedback.mjs',
].forEach(runAudit);

const requiredCss = [
  'assets/typography_system.css',
  'assets/ui_consistency_system.css',
  'assets/color_system.css',
  'assets/component_consistency_system.css',
  'assets/async_feedback_system.css',
  'assets/mobile_layout_system.css',
  'assets/atmosphere_system.css',
  'assets/stress_hardening_system.css',
];
for (const asset of requiredCss) {
  if (!cssAssets.includes(asset)) fail(`Missing live CSS layer: ${asset}`);
}

const promptScriptMatch = indexHtml.match(/assets\/prompt_generator_v3\.js\?v=(\d+)/);
if (!promptScriptMatch) {
  fail('Prompt generator script is missing a cache-busted live link.');
} else if (Number(promptScriptMatch[1]) < 5259) {
  fail(`Prompt generator cache bust is stale: v=${promptScriptMatch[1]}`);
}

const mainGenerator = readLiveFile('assets/prompt_generator_v3.js');
if (!mainGenerator.startsWith('// FINAL POLISH QUESTION:')) {
  fail('assets/prompt_generator_v3.js is missing the required final polish top comment.');
}

if (!fs.existsSync(path.join(root, 'FINAL_POLISH_AUDIT.md'))) {
  fail('FINAL_POLISH_AUDIT.md is missing.');
}

const forbiddenFontPrimaries = new Set(['arial', 'helvetica', 'system-ui']);
const fontFailures = [];
for (const file of liveFiles) {
  const text = stripComments(readLiveFile(file));
  for (const match of text.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    const first = String(match[1] || '')
      .replace(/!important/g, '')
      .trim()
      .split(',')[0]
      .replace(/^['"]|['"]$/g, '')
      .trim()
      .toLowerCase();
    if (forbiddenFontPrimaries.has(first)) {
      fontFailures.push(`${file}:${lineNo(text, match.index)} ${match[0].trim()}`);
    }
  }
}
if (fontFailures.length) {
  fail(`Forbidden primary font stacks:\n${fontFailures.slice(0, 40).join('\n')}`);
}

const consoleLogFailures = [];
for (const file of ['index.html', ...jsAssets]) {
  const text = stripComments(readLiveFile(file));
  for (const match of text.matchAll(/console\.log\s*\(/g)) {
    consoleLogFailures.push(`${file}:${lineNo(text, match.index)}`);
  }
}
if (consoleLogFailures.length) {
  fail(`Production console.log calls remain:\n${consoleLogFailures.slice(0, 80).join('\n')}`);
}

const allowedCompatLabels = ['EXCELLENT', 'GOOD', 'MODERATE', 'TENSION', 'AVOID'];
for (const label of allowedCompatLabels) {
  if (!mainGenerator.includes(`'${label}'`) && !mainGenerator.includes(`>${label}<`)) {
    fail(`Compatibility label missing from generator: ${label}`);
  }
}

const compatibilityBadLabelFailures = [];
for (const file of liveFiles) {
  const text = stripComments(readLiveFile(file));
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!/(compat|score|dots|rating|meter|label)/i.test(line)) return;
    if (/(?:['"`>]|\\b)(?:OK|FINE)(?:['"`<]|\\b)/.test(line)) {
      compatibilityBadLabelFailures.push(`${file}:${index + 1} ${line.trim().slice(0, 180)}`);
    }
  });
}
if (compatibilityBadLabelFailures.length) {
  fail(`Non-standard compatibility labels found:\n${compatibilityBadLabelFailures.slice(0, 40).join('\n')}`);
}

console.log(`- Required final layers linked: ${requiredCss.every((asset) => cssAssets.includes(asset)) ? 'yes' : 'no'}`);
console.log(`- Prompt generator cache bust: ${promptScriptMatch ? `v${promptScriptMatch[1]}` : 'missing'}`);
console.log(`- Forbidden primary font stacks: ${fontFailures.length}`);
console.log(`- Production console.log calls: ${consoleLogFailures.length}`);
console.log(`- Compatibility label violations: ${compatibilityBadLabelFailures.length}`);

if (failures.length) {
  console.log('\nFinal polish failures:');
  failures.forEach((item) => console.log(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log('- Final polish gate: pass');
}
