import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\((?:[^()]|\([^()]*\))*\)|(?<![-\w])(?:transparent|currentColor|white|black|red|green|blue|yellow|purple|orange|gray|grey)(?![-\w])/g;

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

function stripComments(text) {
  return String(text || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function rootRanges(cssText) {
  const ranges = [];
  const re = /:root\s*\{/g;
  let match;
  while ((match = re.exec(cssText))) {
    let depth = 0;
    for (let index = re.lastIndex - 1; index < cssText.length; index += 1) {
      if (cssText[index] === '{') depth += 1;
      if (cssText[index] === '}') {
        depth -= 1;
        if (depth === 0) {
          ranges.push([match.index, index + 1]);
          re.lastIndex = index + 1;
          break;
        }
      }
    }
  }
  return ranges;
}

function removeRootBlocks(cssText) {
  const ranges = rootRanges(cssText);
  let output = '';
  let cursor = 0;
  for (const [start, end] of ranges) {
    output += cssText.slice(cursor, start);
    cursor = end;
  }
  return output + cssText.slice(cursor);
}

function colorHits(value) {
  COLOR_PATTERN.lastIndex = 0;
  return [...String(value || '').matchAll(COLOR_PATTERN)].map((match) => match[0]);
}

function lineNo(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function addViolation(violations, file, line, value, context) {
  violations.push(`${file}:${line}: ${value} :: ${context.trim().slice(0, 220)}`);
}

function scanCssText(file, cssText, baseLine = 1) {
  const violations = [];
  const text = removeRootBlocks(stripComments(cssText));
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const currentLine = baseLine + index;
    for (const match of line.matchAll(/:\s*([^;{}]+);?/g)) {
      for (const hit of colorHits(match[1])) addViolation(violations, file, currentLine, hit, line);
    }
    for (const match of line.matchAll(/\b(?:fill|stroke|stop-color|flood-color|lighting-color)\s*=\s*(["'])([\s\S]*?)\1/g)) {
      for (const hit of colorHits(match[2])) addViolation(violations, file, currentLine, hit, line);
    }
  });
  return violations;
}

function scanStyleAttributes(file, text, baseLine = 1) {
  const violations = [];
  for (const match of text.matchAll(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/g)) {
    for (const hit of colorHits(match[2])) {
      addViolation(violations, file, baseLine + lineNo(text, match.index) - 1, hit, match[0]);
    }
  }
  return violations;
}

function scanColorAttributes(file, text, baseLine = 1) {
  const violations = [];
  for (const match of text.matchAll(/\b(?:fill|stroke|stop-color|flood-color|lighting-color)\s*=\s*(["'])([\s\S]*?)\1/g)) {
    for (const hit of colorHits(match[2])) {
      addViolation(violations, file, baseLine + lineNo(text, match.index) - 1, hit, match[0]);
    }
  }
  return violations;
}

function scanJsStyleAssignments(file, text) {
  const violations = [];
  const clean = stripComments(text);
  const patterns = [
    /\.style\.[\w$]+\s*=\s*(["'`])([\s\S]*?)\1/g,
    /\b(?:const|let|var)\s+\w*css\w*\s*=\s*`([\s\S]*?)`/gi,
    /\.textContent\s*=\s*`([\s\S]*?)`/g,
  ];
  for (const pattern of patterns) {
    for (const match of clean.matchAll(pattern)) {
      const payload = match[2] || match[1] || '';
      const payloadBase = lineNo(clean, match.index);
      if (payload.includes('{') || payload.includes(':') || pattern.source.includes('\\.style')) {
        violations.push(...scanCssText(file, payload, payloadBase));
      }
    }
  }
  violations.push(...scanStyleAttributes(file, clean));
  violations.push(...scanColorAttributes(file, clean));
  return violations;
}

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const violations = [];

for (const asset of cssAssets) {
  violations.push(...scanCssText(asset, fs.readFileSync(path.join(root, asset), 'utf8')));
}

for (const match of indexHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
  violations.push(...scanCssText('index.html', match[1], lineNo(indexHtml, match.index)));
}
violations.push(...scanStyleAttributes('index.html', indexHtml));
violations.push(...scanColorAttributes('index.html', indexHtml));

for (const asset of jsAssets) {
  violations.push(...scanJsStyleAssignments(asset, fs.readFileSync(path.join(root, asset), 'utf8')));
}

console.log('Live Color System Audit');
console.log(`- Stylesheets checked: ${cssAssets.length}`);
console.log(`- Scripts checked: ${jsAssets.length}`);
console.log(`- Hardcoded live color violations outside :root: ${violations.length}`);

if (violations.length) {
  console.log('\nViolations:');
  console.log(violations.slice(0, 200).join('\n'));
  if (violations.length > 200) console.log(`...and ${violations.length - 200} more`);
  process.exitCode = 1;
}
