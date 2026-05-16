import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const reportPath = path.join(root, 'ASYNC_OPERATION_AUDIT.md');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

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

function lineNo(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function scanAsyncTokens(file, text) {
  const pattern = /\bfetch\s*\(|\basync\s+function\b|\basync\s*\(|\bawait\b|\.then\s*\(|\bXMLHttpRequest\b/g;
  return [...text.matchAll(pattern)].map((match) => ({
    file,
    line: lineNo(text, match.index),
    token: match[0],
  }));
}

const cssAssets = linkedAssets('css');
const jsAssets = linkedAssets('js');
const liveFiles = ['index.html', ...jsAssets];
const asyncHits = [];

for (const file of liveFiles) {
  asyncHits.push(...scanAsyncTokens(file, fs.readFileSync(path.join(root, file), 'utf8')));
}

const report = fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : '';
const missing = [];
const asyncLayerSource = fs.readFileSync(path.join(root, 'assets', 'async_feedback_system.js'), 'utf8');
const generatorSource = fs.readFileSync(path.join(root, 'assets', 'prompt_generator_v3.js'), 'utf8');
const allFeedbackSource = indexHtml + '\n' + asyncLayerSource + '\n' + generatorSource;

const requiredLinks = [
  ['async_feedback_system.js', /async_feedback_system\.js\?v=5255/],
  ['async_feedback_system.css', /async_feedback_system\.css\?v=5255/],
  ['window.showToast', /window\.showToast\s*=/],
  ['window.toast compatibility alias', /window\.toast\s*=/],
  ['SilvaAsyncFeedback helper', /window\.SilvaAsyncFeedback\s*=/],
  ['offline banner copy', /No internet connection — generation unavailable/],
  ['imageGeneration operation key', /imageGeneration/],
  ['wardrobe upload validation copy', /Upload failed\. File may be too large \(max 10MB\) or wrong format \(jpg\/png\/webp\)\./],
  ['director brief parse copy', /Couldn't parse brief\. Try being more specific about character, location, or lighting/],
  ['concept blast retry copy', /Suggestions unavailable\. Try again\./],
];

for (const [label, pattern] of requiredLinks) {
  if (!pattern.test(allFeedbackSource)) missing.push(label);
}

const requiredRegistry = [
  'imageGeneration',
  'generatorProfileLoad',
  'generatorModels',
  'providerStatus',
  'providerReadinessStore',
  'routePreview',
  'shotHistoryFetch',
  'shotHistoryPersist',
  'shotHistoryUpdate',
  'wardrobeUpload',
  'wardrobeSave',
  'directorBrief',
  'conceptBlast',
  'actionSuggestions',
  'Provider credential save',
  'Studio Pulse history',
  'Clipboard writes',
  'Prompt library durable actions',
  'Planner durable actions',
  'Workspace import/export',
];

for (const key of requiredRegistry) {
  if (!report.includes(key)) missing.push(`ASYNC_OPERATION_AUDIT.md entry: ${key}`);
}

const liveSource = liveFiles.map((file) => `${file}\n${fs.readFileSync(path.join(root, file), 'utf8')}`).join('\n');
const userFacingFetchCount = asyncHits.filter((hit) => /index\.html|prompt_generator_v3|provider_|studio_pulse/.test(hit.file)).length;

console.log('Live Async Feedback Audit');
console.log(`- Live scripts checked: ${jsAssets.length}`);
console.log(`- Live CSS files checked for layer load: ${cssAssets.length}`);
console.log(`- Async token hits in live graph: ${asyncHits.length}`);
console.log(`- User-facing async token hits: ${userFacingFetchCount}`);
console.log(`- Registry entries required: ${requiredRegistry.length}`);
console.log(`- Shared layer present: ${/async_feedback_system\.js\?v=5255/.test(indexHtml) && /async_feedback_system\.css\?v=5255/.test(indexHtml) ? 'yes' : 'no'}`);

const fetchRouteStillPresent = /\/api\/image-generation\/generate/.test(liveSource);
console.log(`- /api/image-generation/generate route unchanged: ${fetchRouteStillPresent ? 'yes' : 'no'}`);
if (!fetchRouteStillPresent) missing.push('/api/image-generation/generate route');

if (missing.length) {
  console.log('\nMissing async feedback coverage:');
  console.log(missing.map((item) => `- ${item}`).join('\n'));
  process.exitCode = 1;
}

if (process.env.SILVA_ASYNC_AUDIT_VERBOSE === '1') {
  console.log('\nAsync token samples:');
  console.log(asyncHits.slice(0, 120).map((hit) => `${hit.file}:${hit.line}: ${hit.token}`).join('\n'));
}
