#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

function stripQuery(value) {
  return String(value || '').split('?')[0].replace(/^\.\//, '');
}

function linkedFiles(kind) {
  const pattern = kind === 'css'
    ? /<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["']/g
    : /<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/g;
  return [...html.matchAll(pattern)]
    .map(match => stripQuery(match[1]))
    .filter(Boolean)
    .map(rel => path.join(root, rel))
    .filter(file => fs.existsSync(file));
}

const cssFiles = linkedFiles('css');
const jsFiles = linkedFiles('js');
const liveFiles = [indexPath, ...cssFiles, ...jsFiles];
const styleChunks = [{ file: indexPath, text: html }];
cssFiles.forEach(file => styleChunks.push({ file, text: fs.readFileSync(file, 'utf8') }));

const tokenSource = fs.readFileSync(path.join(root, 'assets/ui_consistency_system.css'), 'utf8');
const requiredTokens = [
  '--duration-instant',
  '--duration-fast',
  '--duration-medium',
  '--duration-slow',
  '--duration-crawl',
  '--ease-out',
  '--ease-in',
  '--ease-inout',
  '--ease-spring',
  '--ease-linear'
];

const missingTokens = requiredTokens.filter(token => !tokenSource.includes(token));

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

const timeLiteral = /(?<![\w-])(?:\d*\.\d+|\d+)(?:ms|s)\b/g;
const allowedTimeLiteralContext = /(@keyframes|\/\*|--duration-|--motion-|--stagger-|--toast-duration)/;
const declarationPattern = /\b(?:transition|transition-duration|transition-delay|animation|animation-duration|animation-delay)\s*:\s*([^;{}]+)/g;
const violations = [];

for (const chunk of styleChunks) {
  const clean = stripComments(chunk.text);
  for (const match of clean.matchAll(declarationPattern)) {
    const value = match[1] || '';
    const declaration = match[0] || '';
    if (!timeLiteral.test(value)) {
      timeLiteral.lastIndex = 0;
      continue;
    }
    timeLiteral.lastIndex = 0;
    const rawTimes = [...value.matchAll(timeLiteral)].map(item => item[0]);
    const isTokenized = rawTimes.length === 0 || rawTimes.every(() => /var\(--(?:duration|motion|stagger|toast-duration)/.test(value) || /calc\(var\(--(?:duration|motion|stagger|toast-duration)/.test(value));
    if (!isTokenized && !allowedTimeLiteralContext.test(declaration)) {
      const before = clean.slice(0, match.index);
      const line = before.split('\n').length;
      violations.push({
        file: path.relative(root, chunk.file),
        line,
        declaration: declaration.trim()
      });
    }
    timeLiteral.lastIndex = 0;
  }
}

const jsTimerPattern = /setTimeout\s*\(/g;
const animationTimerViolations = [];
const animationTimerNeedles = [
  'classList.remove',
  'classList.add',
  'style.transform',
  'style.opacity',
  'is-complete',
  'is-generating',
  'is-approved',
  'is-rejected',
  'pg52-brief-changed',
  'pg52-mode-title-crossfade',
  'Prompt Ready',
  'Done — View result'
];
const allowedAnimationTimerSnippets = [
  'showToast',
  'Copied',
  'dataset.copyLabel',
  'copyText',
  'navigator.clipboard',
  'hashchange',
  'setTimeout(init',
  'requestAnimationFrame',
  'fetchJsonWithTimeout',
  'controller.abort',
  'previewTimer',
  'route-preview-refresh',
  'activateGeneratorHashRoute',
  'cleanupLateLegacyControls',
  'focusProviderSetup'
];
const timerAuditFiles = [
  indexPath,
  path.join(root, 'assets/prompt_generator_v3.js')
].filter(file => fs.existsSync(file));

for (const file of timerAuditFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(jsTimerPattern)) {
    const start = Math.max(0, match.index - 140);
    const end = Math.min(text.length, match.index + 220);
    const context = text.slice(start, end);
    if (!animationTimerNeedles.some(snippet => context.includes(snippet))) continue;
    if (allowedAnimationTimerSnippets.some(snippet => context.includes(snippet))) continue;
    const line = text.slice(0, match.index).split('\n').length;
    animationTimerViolations.push({
      file: path.relative(root, file),
      line,
      context: context.replace(/\s+/g, ' ').trim().slice(0, 220)
    });
  }
}

console.log(`Live files checked: ${liveFiles.length}`);
console.log(`Stylesheets: ${cssFiles.length}`);
console.log(`Scripts: ${jsFiles.length}`);
console.log(`Required motion tokens missing: ${missingTokens.length}`);
console.log(`Raw motion duration declarations: ${violations.length}`);
console.log(`Potential animation-only setTimeout calls: ${animationTimerViolations.length}`);

if (missingTokens.length) {
  console.log('\nMissing tokens:');
  missingTokens.forEach(token => console.log(`- ${token}`));
}

if (violations.length) {
  console.log('\nRaw motion declarations:');
  violations.slice(0, 80).forEach(item => console.log(`- ${item.file}:${item.line} ${item.declaration}`));
}

if (animationTimerViolations.length) {
  console.log('\nPotential animation timer violations:');
  animationTimerViolations.slice(0, 80).forEach(item => console.log(`- ${item.file}:${item.line} ${item.context}`));
}

if (missingTokens.length || violations.length || animationTimerViolations.length) {
  process.exitCode = 1;
}
