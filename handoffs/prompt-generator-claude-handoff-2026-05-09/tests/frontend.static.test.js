const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const SERVER = path.join(ROOT, 'server.js');
const GEMINI_LEGACY_ROUTE = path.join(ROOT, 'routes', 'geminiLegacy.js');
const PROMPT_GENERATOR_V3 = path.join(ROOT, 'assets', 'prompt_generator_v3.js');
const PROMPT_GENERATOR_V3_CSS = path.join(ROOT, 'assets', 'prompt_generator_v3.css');
const PROVIDER_CONTROL_CENTER = path.join(ROOT, 'assets', 'provider_control_center_v1.js');
const PROVIDER_CONTROL_CENTER_CSS = path.join(ROOT, 'assets', 'provider_control_center_v1.css');
const PROVIDER_READINESS_STORE = path.join(ROOT, 'assets', 'provider_readiness_store_v1.js');
const SURFACE_OWNERS = path.join(ROOT, 'assets', 'surface_owners_v1.js');
const PERF_PROBE = path.join(ROOT, 'assets', 'silva_perf_probe.js');
const SHELF_FIX = path.join(ROOT, 'assets', 'shelf_fix_v10.js');
const LIVE_SURFACE_OWNER_MAP = path.join(ROOT, 'LIVE_SURFACE_OWNER_MAP.md');

function readIndex() {
  return fs.readFileSync(INDEX, 'utf8');
}

function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(script => script.trim());
}

test('root index inline scripts parse', () => {
  const html = readIndex();
  const scripts = inlineScripts(html);
  assert.ok(scripts.length >= 1, 'expected at least one inline script');
  scripts.forEach((script, index) => {
    assert.doesNotThrow(() => {
      new vm.Script(script, { filename: `index.inline.${index + 1}.js` });
    }, `inline script ${index + 1} failed to parse`);
  });
});

test('generator UI uses the image router as canonical path', () => {
  const html = readIndex();
  assert.match(html, /\/api\/image-models\/route-preview/);
  assert.match(html, /\/api\/image-generation\/generate/);
  assert.match(html, /google\/nano-banana-2/);
  assert.match(html, /openai\/gpt-image-2/);
  assert.match(html, /black-forest-labs\/flux-2-pro/);
  assert.match(html, /fal\/qwen-image-2-edit/);
  assert.doesNotMatch(html, /SuperGrok \/ xAI/);
  assert.doesNotMatch(html, /Manual \/ Flow/);
  assert.doesNotMatch(html, /Replicate Image Hub/);
  assert.doesNotMatch(html, /REPLICATE_API_TOKEN/);
});

test('Prompt Generator 5.1 real shotboard layer is loaded and registry-aware', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');

  assert.match(html, /assets\/surface_owners_v1\.js\?v=1/);
  assert.match(html, /assets\/silva_perf_probe\.js\?v=1/);
  assert.match(html, /assets\/provider_readiness_store_v1\.js\?v=1/);
  assert.match(html, /assets\/prompt_generator_v3\.js\?v=5100/);
  assert.match(html, /assets\/prompt_generator_v3\.css\?v=5100/);
  assert.match(script, /Prompt Generator 5\.1/);
  assert.match(script, /\/api\/image-models/);
  assert.match(script, /\/api\/image-models\/route-preview/);
  assert.match(script, /\/api\/provider-credentials\/status/);
  assert.match(script, /SilvaProviderReadiness/);
  assert.match(script, /refreshProviderReadiness/);
  assert.match(script, /mergeRouteReadiness/);
  assert.match(script, /pg3-readiness-banner/);
  assert.match(script, /renderGeneratorShell51/);
  assert.match(script, /applyGeneratorState/);
  assert.match(script, /prompt-generator-51-shell/);
  assert.match(script, /google\/nano-banana-2/);
  assert.match(script, /google\/nano-banana-pro/);
  assert.match(script, /google\/imagen-3-text-only/);
  assert.match(script, /openai\/gpt-image-2/);
  assert.match(script, /openai\/gpt-image-1\.5/);
  assert.match(script, /black-forest-labs\/flux-2-pro/);
  assert.match(script, /black-forest-labs\/flux-2-max/);
  assert.match(script, /bytedance\/seedream-5-lite/);
  assert.match(script, /fal\/qwen-image-2-edit/);
  assert.match(script, /Nano Banana 2/);
  assert.match(script, /Nano Banana Pro/);
  assert.match(script, /Imagen 3 Text-Only/);
  assert.match(script, /Qwen Image 2 Edit/);
  assert.match(script, /Strengths|strengths/i);
  assert.match(script, /weaknesses/i);
  assert.match(script, /bestFor|Best:/);
  assert.match(script, /zarCost|Rands|R-/i);
  assert.match(script, /removeLegacyProviderControls/);
  assert.match(script, /schedulePreviewImageRouteFromGenerator/);
  assert.match(script, /AbortController/);
  assert.match(script, /fetchJsonWithTimeout/);
  assert.match(script, /perfSnapshot/);
  assert.match(script, /routePreviewKey/);
  assert.match(script, /pg3-collapse/);
  assert.match(script, /Use router route/);
  assert.match(script, /pg51-console/);
  assert.match(script, /Final shotboard/);
  assert.match(script, /Shot Canvas/);
  assert.match(script, /Reference Pack/);
  assert.match(script, /Home System/);
  assert.match(script, /Assets Vault/);
  assert.match(script, /Generate 6 concepts/);
  assert.match(script, /\/api\/generator\/profile/);
  assert.match(script, /\/api\/generator\/concepts/);
  assert.match(script, /pg3-output-stage/);
  assert.match(script, /SilvaSurfaceOwners\.claim\('generator'/);
  assert.match(script, /Identity rail/);
  assert.match(script, /Pick what enters the shot/);
  assert.match(script, /Route Summary/);
  assert.match(script, /Prompt, status, review/);
  assert.match(script, /pg50-model-drawer/);
  assert.match(script, /Change route/);
  assert.doesNotMatch(script, /Route cockpit/);
  assert.doesNotMatch(script, /'<section class="pg3-model-rail"/);
  assert.match(script, /Spend source/);
  assert.match(script, /google_credits/);
  assert.match(script, /fal_full_ai/);
  assert.match(script, /Google Credits sends actual refs into Nano Banana Pro/);
  assert.match(script, /route prefers Google direct-reference Nano Banana Pro first/);
  assert.match(script, /Using Google Cloud credits/);
  assert.match(script, /Google Credits - final refs/);
  assert.match(script, /google_direct_reference_images/);
  assert.match(script, /Generate Final Image/);
  assert.match(script, /raw_photo/);
  assert.match(script, /exact_character/);
  assert.match(script, /PROMPT_CONTRACT_V5_1/);
  assert.match(script, /prompt-contract-v5\.1/);
  assert.match(script, /generatorRecipe/);
  assert.match(script, /selectedReferencePack/);
  assert.match(script, /homeSystemPack/);
  assert.match(script, /reference-pack-v5\.1/);
  assert.match(script, /wardrobePack/);
  assert.match(script, /scenePack/);
  assert.match(script, /variationSeed/);
  assert.match(script, /lockedFields/);
  assert.match(script, /PRIMARY FACE TILE \/ IDENTITY AUTHORITY/);
  assert.match(script, /PRIMARY BODY TILE \/ BUILD AUTHORITY/);
  assert.match(html, /function renderFinalImageResultHtml/);
  assert.match(html, /Final Photo Review/);
  assert.match(html, /identityAccepted/);
  assert.match(html, /saveRejectedImageToGallery/);
  assert.match(script, /pg3-identity-panel/);
  assert.match(script, /Forbidden pixels: no Instagram UI/);
  assert.match(script, /switchToFalDirectRefs/);
  assert.match(script, /photo_identity_lock/);
  assert.match(script, /negativePrompt/);
  assert.match(script, /Google Credits/);
  assert.match(script, /fal\.ai Final AI/);
  assert.match(script, /fal\/qwen-image-2-edit/);
  assert.match(script, /generationButtonAttrs/);
  assert.match(html, /function getImageActionOutput/);
  assert.match(html, /Generate Final Image/);
  assert.match(html, /outputFormatMode:\s*'raw_photo'/);
  assert.match(html, /identityMode:\s*refs\.length \? 'exact_character'/);
  assert.match(html, /PRIMARY FACE TILE \/ IDENTITY AUTHORITY/);
  assert.match(html, /buildFinalIdentityPackRefs/);
  assert.match(html, /const spendLane = getCurrentImageSpendLane\(\)/);
  assert.match(html, /negativePrompt:/);
  assert.match(html, /real reference images into Nano Banana/);
  assert.match(html, /document\.getElementById\("prompt-generator-51-shell"\).*document\.getElementById\("prompt-generator-50-shell"\).*document\.getElementById\("prompt-generator-40-shell"\)\) return/);
  assert.doesNotMatch(html, /Generate a photorealistic [^'"]*post/);
  assert.doesNotMatch(script, /Generate a photorealistic [^'"]*post/);
  assert.doesNotMatch(html, /const helper = document\.getElementById\('ai-helper-output'\);\s*const ctx = getGeneratorContext\(\);\s*const prompt = ctx\.mainPrompt;\s*if \(!prompt\) \{ helper\.textContent/s);
  assert.match(script, /grid\.replaceWith\(shell\)/);
  assert.doesNotMatch(script, /btn\.insertAdjacentHTML\('beforebegin', \[\s*'<div class="pg3-route-deck"/);
  assert.doesNotMatch(script, /Router says/i);
  assert.match(script, /window\.location\.hash === '#generator'/);
  assert.match(script, /addEventListener\('hashchange'.*activateGeneratorHashRoute/s);
  assert.doesNotMatch(script, /SuperGrok \/ xAI/);
  assert.doesNotMatch(script, /Manual \/ Flow/);
  assert.match(css, /pg3-model-card/);
});

test('Prompt Generator 5.1 avoids route-preview rerender stutter', () => {
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const previewStart = script.indexOf('async function previewImageRouteFromGenerator');
  const previewEnd = script.indexOf('function locationInfo', previewStart);
  const boardStart = script.indexOf('function renderModelIntelligence');
  const boardEnd = script.indexOf('function schedulePreviewImageRouteFromGenerator', boardStart);
  assert.ok(previewStart > -1 && previewEnd > previewStart, 'preview function should be present');
  const previewBody = script.slice(previewStart, previewEnd);
  const boardBody = script.slice(boardStart, boardEnd);
  assert.match(previewBody, /state\.previewSeq/);
  assert.match(previewBody, /state\.routePreviewKey/);
  assert.match(previewBody, /state\.previewAbort/);
  assert.doesNotMatch(previewBody, /renderModelIntelligence\(/, 'route preview must not rebuild model cards');
  assert.doesNotMatch(boardBody, /selectedId \+ '\|'/, 'model board cache key must not include selected model');
  assert.doesNotMatch(boardBody, /recommendedId \+ '\|'/, 'model board cache key must not include recommended model');
});

test('Prompt Generator 5.1 visual layer is visible, collapsed where needed, and red is restrained', () => {
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');
  const providerCss = fs.readFileSync(PROVIDER_CONTROL_CENTER_CSS, 'utf8');
  assert.match(script, /Prompt Quality Breakdown/);
  assert.match(script, /Prompt Anatomy/);
  assert.match(script, /Router Payload Preview/);
  assert.match(script, /Caption \/ Social Kit/);
  assert.match(script, /pg50-model-drawer/);
  assert.match(script, /pg51-command-fields/);
  assert.match(script, /pg51-workspace/);
  assert.match(script, /pg51-shot-canvas/);
  assert.match(script, /pg40-action-stack/);
  assert.doesNotMatch(script, /Compare model routes/);
  assert.match(css, /pg51-console/);
  assert.match(css, /pg51-workspace/);
  assert.match(css, /pg51-shot-canvas/);
  assert.match(css, /pg51-ref-token/);
  assert.match(css, /pg50-model-drawer/);
  assert.match(css, /pg50-model-board/);
  assert.match(css, /pg50-outfit-card/);
  assert.match(css, /pg50-concept-card/);
  assert.match(css, /pg40-action-stack/);
  assert.match(css, /pg3-sticky-actions/);
  assert.match(css, /pg3-image-result/);
  assert.match(css, /pg3-image-compare/);
  assert.match(css, /pg40-final-review/);
  assert.match(css, /pg40-review-grid/);
  assert.match(css, /pg3-final-photo/);
  assert.match(css, /pg3-ref-strip/);
  assert.match(css, /btn\.btn-primary:hover/);
  assert.match(css, /color:\s*#070a0f\s*!important/);
  assert.match(css, /btn:not\(\.btn-primary\):hover/);
  assert.match(css, /color:\s*#ffffff\s*!important/);
  assert.match(css, /--pg3-danger/);
  assert.doesNotMatch(css, /rgba\(232,0,30/);
  assert.doesNotMatch(providerCss, /rgba\(232,0,30/);
  assert.doesNotMatch(css, /background:\s*conic-gradient\(var\(--red\)/);
});

test('Provider Control Center is loaded and does not persist raw provider keys client-side', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROVIDER_CONTROL_CENTER, 'utf8');
  const css = fs.readFileSync(PROVIDER_CONTROL_CENTER_CSS, 'utf8');

  const readinessStore = fs.readFileSync(PROVIDER_READINESS_STORE, 'utf8');
  assert.match(html, /assets\/provider_control_center_v1\.js\?v=3502/);
  assert.match(html, /assets\/provider_control_center_v1\.css\?v=3500/);
  assert.match(readinessStore, /window\.SilvaProviderReadiness/);
  assert.match(readinessStore, /fetchFresh/);
  assert.match(readinessStore, /mergeModelReadiness/);
  assert.match(readinessStore, /readinessForModel/);
  assert.match(script, /AI Provider Control Center/);
  assert.match(script, /\/api\/provider-credentials\/status/);
  assert.match(script, /\/api\/provider-credentials/);
  assert.match(script, /Google Vertex AI/);
  assert.match(script, /Nano Banana Pro \/ Nano Banana 2 direct-reference image generation/);
  assert.match(script, /Imagen 3 stays available only as a no-reference text-to-image fallback/);
  assert.match(script, /Used by Nano Banana Pro, Nano Banana 2, legacy Imagen text-only, and Gemini reasoning/);
  assert.match(script, /fal\.ai Image Hub handles GPT Image/);
  assert.match(script, /fal\.ai Image Hub/);
  assert.match(script, /GPT Image 2/);
  assert.match(script, /GPT Image 1\.5/);
  assert.match(script, /Qwen Image 2 Edit/);
  assert.match(script, /scrubLegacyProviderSecrets/);
  assert.match(script, /fetchJsonWithTimeout/);
  assert.match(script, /renderSettingsInto/);
  assert.match(script, /Provider Control Center/);
  assert.match(script, /providerMessages/);
  assert.match(script, /publishStatus/);
  assert.match(script, /SilvaSurfaceOwners\.claim/);
  assert.match(script, /data-provider-save-json/);
  assert.match(script, /data-provider-json/);
  assert.match(script, /service_account_json/);
  assert.match(script, /Simple setup: paste or upload your Google service-account JSON/);
  assert.match(script, /You do not need to know a file path/);
  assert.ok(
    script.indexOf("providerCard(fal") > -1
      && script.indexOf("providerCard(pulse") > script.indexOf("providerCard(fal")
      && script.indexOf("'<aside class=\"pvc-side-stack\">'") > script.indexOf("providerCard(pulse"),
    'Studio Pulse Gemini should stay under fal.ai in the Provider Shell main stack'
  );
  assert.match(css, /pvc-json-upload/);
  assert.match(css, /pvc-json-input/);
  assert.doesNotMatch(script, /Direct OpenAI/);
  assert.doesNotMatch(script, /Replicate Image Hub/);
  assert.doesNotMatch(script, /SuperGrok \/ xAI/);
  assert.doesNotMatch(script, /Manual \/ Flow/);
  assert.doesNotMatch(script, /STATE\.providerSettings\.[a-zA-Z0-9_]+\.apiKey\s*=/);
  assert.doesNotMatch(script, /localStorage\.setItem\([^)]*provider/i);
  assert.match(css, /pvc-shell/);
  assert.match(css, /pvc-freshness/);
});

test('live surface ownership and perf probe are present', () => {
  const ownerScript = fs.readFileSync(SURFACE_OWNERS, 'utf8');
  const perfScript = fs.readFileSync(PERF_PROBE, 'utf8');
  assert.match(ownerScript, /window\.SilvaSurfaceOwners/);
  assert.match(ownerScript, /claim:\s*claim/);
  assert.match(ownerScript, /snapshot:\s*snapshot/);
  assert.match(perfScript, /window\.SilvaPerf/);
  assert.match(perfScript, /silva_perf_debug/);
  assert.match(perfScript, /longtask/);
  assert.match(perfScript, /image-models\|provider-credentials\|image-generation/);
});

test('legacy provider shell is demoted and scrubs secrets', () => {
  const script = fs.readFileSync(SHELF_FIX, 'utf8');
  assert.match(script, /handoffProviderSurface/);
  assert.match(script, /SilvaProviderControlCenter\.renderProviderShell/);
  assert.match(script, /SilvaProviderControlCenter\.renderSettingsShell/);
  assert.match(script, /scrubProviderSecrets/);
  assert.doesNotMatch(script, /STATE\.providerSettings\.[a-zA-Z0-9_]+\.apiKey\s*=/);
  assert.doesNotMatch(script, /apiKey:\s*v\('prov-[^']+-key'\)/);
});

test('live owner map reflects fal.ai image truth and late UI ownership', () => {
  const doc = fs.readFileSync(LIVE_SURFACE_OWNER_MAP, 'utf8');
  assert.match(doc, /Prompt Generator owner: `assets\/prompt_generator_v3\.js`/);
  assert.match(doc, /Provider Shell and Settings owner: `assets\/provider_control_center_v1\.js`/);
  assert.match(doc, /fal\.ai handles GPT Image, FLUX, Seedream, Qwen utility edit, and every non-Google live image model/);
  assert.doesNotMatch(doc, /Google and OpenAI image models must not route through Replicate/);
  assert.doesNotMatch(doc, /Replicate Image Hub/);
});

test('backend state sync scrubs client-side provider secrets', () => {
  const html = readIndex();
  assert.match(html, /function scrubSilvaClientSecrets/);
  assert.match(html, /providerSettings: stripSilvaSyncArtifacts\(scrubSilvaClientSecrets/);
  assert.match(html, /if\(key === 'providerSettings'\) STATE\[key\] = scrubSilvaClientSecrets/);
});

test('provider settings copy reflects Vertex and fal.ai provider split', () => {
  const html = readIndex();
  assert.match(html, /Google reference generation uses Vertex AI Nano Banana Pro \/ Nano Banana 2 with a service-account JSON key saved server-side/);
  assert.match(html, /Imagen 3 is no-reference text-only fallback/);
  assert.match(html, /Google Vertex AI · Nano Banana Pro \/ Nano Banana 2 direct reference generation/);
  assert.match(html, /GPT Image, FLUX, Seedream, Qwen utility edit, and non-Google image routes use fal\.ai/);
  assert.match(html, /Do not route Google image models through fal\.ai/);
  assert.match(html, /disabled legacy AI Studio image route/);
  assert.doesNotMatch(html, /OpenAI image models use the direct OpenAI key/);
  assert.doesNotMatch(html, /Do not route Google or OpenAI image models through Replicate/);
  assert.doesNotMatch(html, /Replicate handles GPT Image/);
  assert.doesNotMatch(html, /REPLICATE_API_TOKEN/);
  assert.doesNotMatch(html, /Google\/Nano Banana\/Imagen use the direct Google key/);
  assert.doesNotMatch(html, /Nano Banana \/ Gemini image generation via backend proxy/);
  assert.doesNotMatch(html, /legacy Google fallback only/i);
  assert.doesNotMatch(html, /fetch\(['"]\/api\/gemini\/image['"]/);
  assert.doesNotMatch(html, /gemini-3\.1-flash-image-preview/);
  assert.doesNotMatch(html, /imagen-4\.0-/);
  assert.doesNotMatch(html, /Backend wiring still needed for live SuperGrok \/ Nano Banana generation/);
});

test('legacy Gemini routes are isolated out of the main server entrypoint', () => {
  const server = fs.readFileSync(SERVER, 'utf8');
  assert.match(server, /require\('\.\/routes\/geminiLegacy'\)/);
  assert.match(server, /app\.use\('\/api\/gemini', geminiLegacyRouter\)/);
  assert.doesNotMatch(server, /app\.post\('\/api\/gemini\/image'/);
  assert.doesNotMatch(server, /app\.post\('\/api\/gemini\/text'/);
});

test('legacy AI Studio image endpoint is disabled and cannot reintroduce prepay fallbacks by default', () => {
  const route = fs.readFileSync(GEMINI_LEGACY_ROUTE, 'utf8');
  assert.match(route, /ENABLE_LEGACY_AI_STUDIO_IMAGE/);
  assert.match(route, /legacy_ai_studio_image_disabled/);
  assert.match(route, /replacementEndpoint:\s*'\/api\/image-generation\/generate'/);
  assert.doesNotMatch(route, /gemini-3\.1-flash-image-preview/);
  assert.doesNotMatch(route, /imagen-4\.0-/);
});

test('public shell does not contain secret literals from the environment', () => {
  const html = readIndex();
  for (const value of [
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.REPLICATE_API_TOKEN,
    process.env.FAL_KEY,
    process.env.VERTEX_SERVICE_ACCOUNT_JSON_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  ].filter(Boolean)) {
    assert.equal(html.includes(value), false, 'root HTML contains an API key value');
  }
});
