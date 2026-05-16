import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

const BEFORE_DISTINCT_PX_VALUES = 205;
const BEFORE_TRUE_RHYTHM_VALUES = [
  '-60px', '-14px', '-2px', '-1px', '1px', '2px', '2.5px', '3px',
  '5px', '6px', '7px', '9px', '11px', '13px', '14px', '15px',
  '17px', '18px', '19px', '22px', '26px', '28px', '30px', '34px',
  '36px', '38px', '39px', '42px', '44px', '46px', '54px', '58px',
  '60px', '66px', '74px', '75px', '76px', '78px', '86px', '88px',
  '90px', '91px', '92px', '94px',
];

const APPROVED_SCALE = new Set([0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]);
const SPECIAL_EXCEPTIONS = new Set([10, 52, 56, 72, 200, 220, 240]);
const HAIRLINE_LIMIT = 2;

const RHYTHM_PROPS = new Set([
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-block', 'margin-inline', 'margin-block-start', 'margin-block-end',
  'margin-inline-start', 'margin-inline-end',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-block', 'padding-inline', 'padding-block-start', 'padding-block-end',
  'padding-inline-start', 'padding-inline-end',
  'gap', 'row-gap', 'column-gap',
  'inset', 'inset-block', 'inset-inline', 'inset-block-start', 'inset-block-end',
  'inset-inline-start', 'inset-inline-end',
  'top', 'right', 'bottom', 'left',
  'scroll-padding', 'scroll-padding-top', 'scroll-padding-right', 'scroll-padding-bottom', 'scroll-padding-left',
  'scroll-margin', 'scroll-margin-top', 'scroll-margin-right', 'scroll-margin-bottom', 'scroll-margin-left',
]);

const SMALL_DIMENSION_PROPS = new Set([
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'flex-basis',
]);

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

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function addMapCount(map, key, sample) {
  const current = map.get(key) || { count: 0, sample };
  current.count += 1;
  map.set(key, current);
}

function isApprovedValue(n) {
  const abs = Math.abs(n);
  if (n === 0) return true;
  if (abs > 0 && abs <= HAIRLINE_LIMIT) return true;
  return APPROVED_SCALE.has(abs) || SPECIAL_EXCEPTIONS.has(abs);
}

function shouldCheckProperty(prop, abs) {
  if (RHYTHM_PROPS.has(prop)) return true;
  if (SMALL_DIMENSION_PROPS.has(prop)) return abs <= 96;
  return false;
}

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const liveFiles = ['index.html', ...cssAssets, ...jsAssets];
const declarationPattern = /(^|[;{}\n])\s*([a-zA-Z-]+)\s*:\s*([^;{}]+)/g;
const pxPattern = /-?\d*\.?\d+px\b/g;

const approvedValues = new Map();
const hairlineValues = new Map();
const exceptionValues = new Map();
const protectedGeometryValues = new Map();
const violations = [];

for (const file of liveFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  let declaration;
  while ((declaration = declarationPattern.exec(text))) {
    const prop = declaration[2];
    const value = declaration[3];
    const line = lineNumber(text, declaration.index);
    for (const px of value.match(pxPattern) || []) {
      const numberValue = Number.parseFloat(px);
      const abs = Math.abs(numberValue);
      const sample = `${file}:${line} ${prop}: ${value.trim().slice(0, 100)}`;
      if (!shouldCheckProperty(prop, abs)) {
        if (SMALL_DIMENSION_PROPS.has(prop) && abs > 96) {
          addMapCount(protectedGeometryValues, px, sample);
        }
        continue;
      }

      if (abs > 0 && abs <= HAIRLINE_LIMIT) {
        addMapCount(hairlineValues, px, sample);
        continue;
      }

      if (SPECIAL_EXCEPTIONS.has(abs)) {
        addMapCount(exceptionValues, px, sample);
        continue;
      }

      if (isApprovedValue(numberValue)) {
        addMapCount(approvedValues, px, sample);
      } else {
        violations.push(`${sample} -> ${px}`);
      }
    }
  }
}

function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]));
}

function formatEntries(map) {
  return sortedEntries(map)
    .map(([value, info]) => `${value}:${info.count}`)
    .join(', ') || 'none';
}

console.log('Live Spacing Grid Audit');
console.log(`- Live files checked: ${liveFiles.length}`);
console.log(`- Stylesheets: ${cssAssets.length}`);
console.log(`- Scripts: ${jsAssets.length}`);
console.log(`- Before broad distinct px values: ${BEFORE_DISTINCT_PX_VALUES}`);
console.log(`- Before true rhythm violation values: ${BEFORE_TRUE_RHYTHM_VALUES.length}`);
console.log(`- Current approved rhythm values: ${approvedValues.size} (${formatEntries(approvedValues)})`);
console.log(`- Hairline values intentionally exempted: ${hairlineValues.size} (${formatEntries(hairlineValues)})`);
console.log(`- Component exceptions present: ${exceptionValues.size} (${formatEntries(exceptionValues)})`);
console.log(`- Protected structural geometry values skipped: ${protectedGeometryValues.size}`);
console.log(`- Off-grid rhythm violations: ${violations.length}`);

if (violations.length) {
  console.log('\nSpacing violations:');
  console.log(violations.slice(0, 120).join('\n'));
  process.exitCode = 1;
}
