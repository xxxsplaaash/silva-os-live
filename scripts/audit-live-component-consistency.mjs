#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// audit-live-component-consistency: validates the late live component consistency layer.
const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const componentCssRel = 'assets/component_consistency_system.css';
const componentCssPath = path.join(root, componentCssRel);
const reportPath = path.join(root, 'CONSISTENCY_AUDIT_REPORT.md');

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
  return [...html.matchAll(pattern)]
    .map((match) => cleanAssetPath(match[1]))
    .filter((asset) => asset && !/^https?:/i.test(asset))
    .filter((asset) => fs.existsSync(path.join(root, asset)));
}

function lineFor(text, needle) {
  const index = text.indexOf(needle);
  if (index < 0) return null;
  return text.slice(0, index).split(/\r?\n/).length;
}

function addFailure(failures, message) {
  failures.push(message);
}

function findLegacyFindings(file, patterns) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) return [];
  const text = fs.readFileSync(absolute, 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (pattern.re.test(line)) findings.push(`${file}:${index + 1}: ${pattern.label} :: ${line.trim().slice(0, 160)}`);
      pattern.re.lastIndex = 0;
    });
  });
  return findings;
}

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const failures = [];
const componentCssLinked = cssAssets.includes(componentCssRel);
const colorIndex = cssAssets.indexOf('assets/color_system.css');
const componentIndex = cssAssets.indexOf(componentCssRel);

if (!componentCssLinked) addFailure(failures, 'component consistency stylesheet is not linked from index.html');
if (colorIndex >= 0 && componentIndex >= 0 && componentIndex < colorIndex) {
  addFailure(failures, 'component consistency stylesheet must load after color_system.css');
}
if (!fs.existsSync(componentCssPath)) addFailure(failures, `${componentCssRel} is missing`);
if (!fs.existsSync(reportPath)) addFailure(failures, 'CONSISTENCY_AUDIT_REPORT.md is missing');

const componentCss = fs.existsSync(componentCssPath) ? fs.readFileSync(componentCssPath, 'utf8') : '';
const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';

const requiredCssNeedles = [
  '--component-select-height: 36px',
  '--component-button-primary-height: 44px',
  '--component-button-secondary-height: 36px',
  '--component-button-ghost-height: 32px',
  '--component-tag-height: 24px',
  '--component-status-dot-size: 7px',
  '--component-score-dot-size',
  'border: 1px solid var(--border-subtle)',
  'box-shadow: var(--component-select-focus-ring)',
  '.pg52-hidden-select',
  '.ui-btn--primary',
  '.ui-btn--secondary',
  '.ui-btn--ghost',
  '.pg3-ai-row .btn[onclick*="generateImageAndSaveFromGenerator"]',
  '.pg52-compat-dots',
  '.pg52-model-rating-dots',
  '.nav-char-dot',
  '.nav-label',
];

requiredCssNeedles.forEach((needle) => {
  if (!componentCss.includes(needle)) addFailure(failures, `component CSS missing ${needle}`);
});

[
  '01. Dropdown Selects',
  '02. Section Numbers',
  '03. Tags / Chips',
  '04. Nav Status Dots',
  '05. Nav Section Headers',
  '06. Buttons',
  '07. Panel Dividers',
  '08. Compatibility / Score Indicators',
  'Before',
  'After',
].forEach((needle) => {
  if (!report.includes(needle)) addFailure(failures, `consistency report missing ${needle}`);
});

const script = fs.readFileSync(path.join(root, 'assets/prompt_generator_v3.js'), 'utf8');
[
  'function componentScoreLabelFromDots',
  "return 'EXCELLENT'",
  "return 'GOOD'",
  "return 'MODERATE'",
  "return 'TENSION'",
  "return 'AVOID'",
  'var label = componentScoreLabelFromDots(dots)',
].forEach((needle) => {
  if (!script.includes(needle)) addFailure(failures, `prompt generator missing score normalization: ${needle}`);
});

const generateSaveSnippet = script.match(/<button class="[^"]+" onclick="generateImageAndSaveFromGenerator\(this\)"/g) || [];
if (generateSaveSnippet.some((item) => item.includes('btn-primary'))) {
  addFailure(failures, 'Generate + Save still uses primary button styling in prompt_generator_v3.js');
}
const htmlGenerateSaveSnippet = html.match(/<button class="[^"]+"[^>]*onclick="generateImageAndSaveFromGenerator\(this\)"[^>]*>/g) || [];
if (htmlGenerateSaveSnippet.some((item) => item.includes('btn-primary'))) {
  addFailure(failures, 'Generate + Save still appears as a primary button in index.html');
}

const legacyFindings = [
  ...findLegacyFindings('index.html', [
    { label: 'legacy primary/secondary button style', re: /\.btn-primary|\.btn-red|\.btn-ghost|wr-gen-btn/ },
    { label: 'legacy visible select', re: /class=["'][^"']*(gen-select|filter-select)/ },
    { label: 'legacy nav status dot', re: /nav-char-dot/ },
  ]),
  ...findLegacyFindings('assets/prompt_generator_v3.css', [
    { label: 'legacy generator select style', re: /pg52-cmd-select|pg38-select|pg52-action-select/ },
    { label: 'legacy chip/tag style', re: /pg3-chip|pg52-pill|pg52-route-tags|pg52-char-tags/ },
    { label: 'legacy compatibility dot style', re: /pg52-compat-dots|pg52-model-rating-dots/ },
    { label: 'legacy button style', re: /btn-primary|btn:not|pg52-generate-btn|pg52-btn-ghost/ },
  ]),
  ...findLegacyFindings('assets/provider_control_center_v1.css', [
    { label: 'legacy provider chip style', re: /pvc-chip/ },
  ]),
  ...findLegacyFindings('assets/identity_vault_rescue_v1.css', [
    { label: 'legacy vault action control style', re: /identity-vault-actions (select|button)/ },
  ]),
];

console.log('Live Component Consistency Audit');
console.log(`- Stylesheets checked: ${cssAssets.length}`);
console.log(`- Scripts checked: ${jsAssets.length}`);
console.log(`- Component stylesheet linked: ${componentCssLinked ? 'yes' : 'no'}`);
console.log(`- Component stylesheet line in index: ${lineFor(html, componentCssRel) || 'missing'}`);
console.log(`- Report file present: ${fs.existsSync(reportPath) ? 'yes' : 'no'}`);
console.log(`- Legacy component definitions documented/overridden: ${legacyFindings.length}`);
console.log(`- Consistency failures: ${failures.length}`);

if (legacyFindings.length) {
  console.log('\nLegacy selector samples covered by the component layer:');
  console.log(legacyFindings.slice(0, 60).join('\n'));
  if (legacyFindings.length > 60) console.log(`...and ${legacyFindings.length - 60} more`);
}

if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((failure) => console.log(`- ${failure}`));
  process.exitCode = 1;
}
