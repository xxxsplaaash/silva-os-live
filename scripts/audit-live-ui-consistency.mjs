import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const colorAuditPath = path.join(root, 'scripts', 'audit-live-color-system.mjs');

function cleanAssetPath(value) {
  return String(value || '')
    .replace(/^\.\//, '')
    .split('?')[0]
    .trim();
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

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const liveFiles = ['index.html', ...cssAssets, ...jsAssets];

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripAllowedTypographyBlocks(text, file) {
  const withoutRoot = text.replace(/:root\s*\{[\s\S]*?\}/g, '');
  if (!file.endsWith('.css')) return withoutRoot;
  return withoutRoot.replace(/\.type-[\w-]+(?:\s*,[\s\S]*?)?\s*\{[\s\S]*?\}/g, '');
}

const typographyViolations = [];
const zIndexViolations = [];
const rawTransitions = [];
const valueCounts = {
  colors: new Map(),
  radii: new Map(),
  spacing: new Map(),
};

function addCount(map, value, file, line) {
  const key = value.trim();
  if (!key) return;
  const current = map.get(key) || { count: 0, sample: `${file}:${line}` };
  current.count += 1;
  map.set(key, current);
}

for (const file of liveFiles) {
  const absolutePath = path.join(root, file);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const content = stripAllowedTypographyBlocks(stripComments(raw), file);
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const typography = line.match(/\b(font-size|font-weight|letter-spacing|line-height)\s*:\s*([^;]+);/);
    if (typography) {
      const value = typography[2].trim();
      if (!/^var\(--(type|weight|tracking|leading)-/.test(value)) {
        typographyViolations.push(`${file}:${lineNo}: ${typography[1]}: ${value}`);
      }
    }

    if (/\bfont\s*:\s*[^;]*(?:\d*\.\d+|\d+)\s*(?:rem|em|px)/.test(line)) {
      typographyViolations.push(`${file}:${lineNo}: font shorthand raw size`);
    }

    const z = line.match(/\bz-index\s*:\s*(-?\d+)/);
    if (z) {
      const value = Number(z[1]);
      if (value > 3 || value < -1) {
        zIndexViolations.push(`${file}:${lineNo}: z-index: ${value}`);
      }
    }

    const transition = line.match(/\btransition(?:-[\w-]+)?\s*:\s*([^;]+);/);
    if (transition) {
      const value = transition[1].trim();
      if (/(?:\d*\.\d+|\d+)(?:ms|s)\b/.test(value) && !/var\(--motion-/.test(value)) {
        rawTransitions.push(`${file}:${lineNo}: ${value}`);
      }
    }

    for (const match of line.matchAll(/#[0-9a-f]{3,8}|rgba?\([^)]*\)/gi)) {
      addCount(valueCounts.colors, match[0], file, lineNo);
    }
    for (const match of line.matchAll(/\bborder-radius\s*:\s*([^;]+)/gi)) {
      addCount(valueCounts.radii, match[1], file, lineNo);
    }
    for (const match of line.matchAll(/\b(?:margin|padding|gap|inset|top|right|bottom|left)\s*:\s*([^;]+)/gi)) {
      addCount(valueCounts.spacing, match[1], file, lineNo);
    }
  });
}

function topEntries(map, count = 10) {
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, count)
    .map(([value, info]) => `${info.count}x ${value} @ ${info.sample}`);
}

console.log('Live UI Consistency Audit');
console.log(`- Live files checked: ${liveFiles.length}`);
console.log(`- Stylesheets: ${cssAssets.length}`);
console.log(`- Scripts: ${jsAssets.length}`);
console.log(`- Raw typography violations: ${typographyViolations.length}`);
console.log(`- Magic z-index violations: ${zIndexViolations.length}`);
console.log(`- Raw transition declarations to continue tokenizing: ${rawTransitions.length}`);

if (typographyViolations.length) {
  console.log('\nTypography violations:');
  console.log(typographyViolations.slice(0, 80).join('\n'));
}

if (zIndexViolations.length) {
  console.log('\nMagic z-index violations:');
  console.log(zIndexViolations.slice(0, 80).join('\n'));
}

if (rawTransitions.length) {
  console.log('\nRaw transition samples:');
  console.log(rawTransitions.slice(0, 20).join('\n'));
}

console.log('\nTop repeated broad color-like samples (informational; delegated color audit is authoritative):');
console.log(topEntries(valueCounts.colors).join('\n') || 'none');
console.log('\nTop repeated radii:');
console.log(topEntries(valueCounts.radii).join('\n') || 'none');
console.log('\nTop repeated spacing values:');
console.log(topEntries(valueCounts.spacing).join('\n') || 'none');

if (fs.existsSync(colorAuditPath)) {
  console.log('\nDelegated color audit:');
  const colorAudit = spawnSync(process.execPath, [colorAuditPath], {
    cwd: root,
    encoding: 'utf8',
  });
  if (colorAudit.stdout.trim()) console.log(colorAudit.stdout.trim());
  if (colorAudit.stderr.trim()) console.error(colorAudit.stderr.trim());
  if (colorAudit.status) process.exitCode = colorAudit.status;
}

if (typographyViolations.length || zIndexViolations.length) {
  process.exitCode = 1;
}
