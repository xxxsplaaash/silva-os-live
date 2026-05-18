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
const IDENTITY_VAULT_RESCUE = path.join(ROOT, 'assets', 'identity_vault_rescue_v1.js');
const IDENTITY_VAULT_RESCUE_CSS = path.join(ROOT, 'assets', 'identity_vault_rescue_v1.css');
const PROVIDER_CONTROL_CENTER = path.join(ROOT, 'assets', 'provider_control_center_v1.js');
const PROVIDER_CONTROL_CENTER_CSS = path.join(ROOT, 'assets', 'provider_control_center_v1.css');
const PROVIDER_READINESS_STORE = path.join(ROOT, 'assets', 'provider_readiness_store_v1.js');
const SURFACE_OWNERS = path.join(ROOT, 'assets', 'surface_owners_v1.js');
const PERF_PROBE = path.join(ROOT, 'assets', 'silva_perf_probe.js');
const SHELF_FIX = path.join(ROOT, 'assets', 'shelf_fix_v10.js');
const CALENDAR_FULLSCREEN_FIX = path.join(ROOT, 'assets', 'calendar_fullscreen_fix.js');
const CALENDAR_FULLSCREEN_FIX_CSS = path.join(ROOT, 'assets', 'calendar_fullscreen_fix.css');
const LIVE_SURFACE_OWNER_MAP = path.join(ROOT, 'LIVE_SURFACE_OWNER_MAP.md');
const UI_CONSISTENCY_SYSTEM_CSS = path.join(ROOT, 'assets', 'ui_consistency_system.css');
const MOTION_AUDIT = path.join(ROOT, 'scripts', 'audit-live-motion-system.mjs');
const COLOR_SYSTEM_CSS = path.join(ROOT, 'assets', 'color_system.css');
const COLOR_AUDIT = path.join(ROOT, 'scripts', 'audit-live-color-system.mjs');
const COMPONENT_CONSISTENCY_CSS = path.join(ROOT, 'assets', 'component_consistency_system.css');
const COMPONENT_CONSISTENCY_AUDIT = path.join(ROOT, 'scripts', 'audit-live-component-consistency.mjs');
const COMPONENT_CONSISTENCY_REPORT = path.join(ROOT, 'CONSISTENCY_AUDIT_REPORT.md');
const ASYNC_FEEDBACK_JS = path.join(ROOT, 'assets', 'async_feedback_system.js');
const ASYNC_FEEDBACK_CSS = path.join(ROOT, 'assets', 'async_feedback_system.css');
const ASYNC_FEEDBACK_AUDIT = path.join(ROOT, 'scripts', 'audit-live-async-feedback.mjs');
const ASYNC_OPERATION_AUDIT = path.join(ROOT, 'ASYNC_OPERATION_AUDIT.md');
const STRESS_HARDENING_CSS = path.join(ROOT, 'assets', 'stress_hardening_system.css');
const IMAGE_GENERATION_ROUTE = path.join(ROOT, 'routes', 'imageGeneration.js');
const GENERATOR_ROUTE = path.join(ROOT, 'routes', 'generator.js');
const GENERATION_STATUS_STORE = path.join(ROOT, 'lib', 'imageGeneration', 'generationStatusStore.js');
const STUDIO_PULSE = path.join(ROOT, 'studio_pulse_v400.js');
const STUDIO_ROUTE = path.join(ROOT, 'routes', 'studio.js');
const STUDIO_ROOM_INTELLIGENCE = path.join(ROOT, 'lib', 'studio', 'roomIntelligence');

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

test('prompt library quarantines off-brand imports and uses Silva character seeds', () => {
  const html = readIndex();
  assert.match(html, /SILVA_CANONICAL_LIBRARY_PROMPTS/);
  assert.match(html, /SILVA_OFF_BRAND_PROMPT_PATTERNS/);
  assert.match(html, /isOffBrandPrompt/);
  assert.match(html, /visiblePromptLibraryItems/);
  assert.match(html, /sortPromptLibraryItems/);
  assert.match(html, /isSilvaCanonicalPrompt/);
  assert.match(html, /sanitizePromptLibraryState/);
  assert.match(html, /Off-brand imported\/demo prompt hidden from active Silva library/);
  assert.match(html, /Silva standard/);
  assert.match(html, /Show archived imports/);
  assert.match(html, /library-health-strip/);
  assert.match(html, /silva_aisha_sandton_rooftop_authority/);
  assert.match(html, /silva_vanya_people_ops_standards/);
  assert.match(html, /value="aisha">Aisha/);
  assert.match(html, /value="vanya">Vanya/);
  assert.match(html, /tag-aisha/);
  assert.match(html, /social\/editorial source photo/);
  assert.match(html, /no poster, no text on image/i);
});

test('identity vault rescue exposes role-based identity packs', () => {
  const html = readIndex();
  const vault = fs.readFileSync(IDENTITY_VAULT_RESCUE, 'utf8');
  const vaultCss = fs.readFileSync(IDENTITY_VAULT_RESCUE_CSS, 'utf8');
  assert.match(html, /identity_vault_rescue_v1\.js\?v=5236/);
  assert.match(vault, /Identity Pack Builder/);
  assert.match(vault, /Primary Face/);
  assert.match(vault, /Primary Body\/Build/);
  assert.match(vault, /Profile\/Side/);
  assert.match(vault, /Expression Closeups/);
  assert.match(vault, /Hair\/Texture/);
  assert.match(vault, /Approved Gold/);
  assert.match(vault, /Rejected\/Do Not Repeat/);
  assert.match(vault, /Sent to generation/);
  assert.match(vault, /identityPackRefsForCharacter/);
  assert.match(vault, /generationRefsForCharacter/);
  assert.match(vault, /window\.getCharacterVaultRefs/);
  assert.match(vault, /blockedForGeneration/);
  assert.match(vault, /Low resolution/);
  assert.match(vault, /Improve next/);
  assert.match(vaultCss, /identity-vault-card/);
  assert.match(vaultCss, /identity-vault-sent/);
});

test('generator UI uses the image router as canonical path', () => {
  const html = readIndex();
  const server = fs.readFileSync(SERVER, 'utf8');
  assert.match(html, /\/api\/image-models\/route-preview/);
  assert.match(html, /\/api\/image-generation\/generate/);
  assert.match(server, /\/api\/director/);
  assert.match(server, /routes\/director/);
  assert.match(html, /google\/nano-banana-2/);
  assert.match(html, /openai\/gpt-image-2/);
  assert.match(html, /black-forest-labs\/flux-2-pro/);
  assert.match(html, /fal\/qwen-image-2-edit/);
  assert.doesNotMatch(html, /SuperGrok \/ xAI/);
  assert.doesNotMatch(html, /Manual \/ Flow/);
  assert.doesNotMatch(html, /Replicate Image Hub/);
  assert.doesNotMatch(html, /REPLICATE_API_TOKEN/);
});

test('Prompt Generator V3 production console is loaded, wardrobe-aware, and registry-aware', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');

  assert.match(html, /assets\/surface_owners_v1\.js\?v=1/);
  assert.match(html, /assets\/silva_perf_probe\.js\?v=1/);
  assert.match(html, /assets\/provider_readiness_store_v1\.js\?v=2/);
  assert.match(html, /assets\/identity_vault_rescue_v1\.js\?v=5236/);
  assert.match(html, /assets\/identity_vault_rescue_v1\.css\?v=5236/);
  assert.match(html, /assets\/prompt_generator_v3\.js\?v=5260/);
  assert.match(html, /assets\/prompt_generator_v3\.css\?v=5249/);
  assert.match(script, /Prompt Generator V3/);
  assert.doesNotMatch(script, /Prompt Generator 5\.[0-9]/);
  assert.match(script, /\/api\/image-models/);
  assert.match(script, /\/api\/image-models\/route-preview/);
  assert.match(script, /\/api\/provider-credentials\/status/);
  assert.match(script, /SilvaProviderReadiness/);
  assert.match(script, /refreshProviderReadiness/);
  assert.match(script, /mergeRouteReadiness/);
  assert.match(script, /pg3-readiness-banner/);
  assert.match(script, /renderGeneratorShell52/);
  assert.match(script, /applyGeneratorState/);
  assert.match(script, /DIRECTOR MODE/);
  assert.match(script, /DIRECT THE SHOT/);
  assert.match(script, /\/api\/director\/parse-brief/);
  assert.match(script, /directorBriefHtml/);
  assert.match(script, /initDirectorBrief/);
  assert.match(script, /runDirectorBrief/);
  assert.match(script, /applyDirectorParsedShot/);
  assert.match(script, /renderDirectorBriefResult/);
  assert.match(script, /highlightDirectorChangedFields/);
  assert.match(script, /Reading your brief/);
  assert.match(script, /Brief did not specify/);
  assert.match(script, /SHOT_MODES/);
  assert.match(script, /SHOT_MODE_ACTION_CATEGORIES/);
  assert.match(script, /pg52-shot-mode-selector/);
  assert.match(script, /SS_GENERATOR_STATE\.shotMode/);
  assert.match(script, /currentShotMode/);
  assert.match(script, /shotModeSelectorHtml/);
  assert.match(script, /initShotModeSelector/);
  assert.match(script, /shotModeSectionCopy/);
  assert.match(script, /shotModeLocationPool/);
  assert.match(script, /shotModeActionCategories/);
  assert.match(script, /shotModePromptVoice/);
  assert.match(script, /function getShotModeVoice/);
  assert.match(script, /function compileShotModePromptSegments/);
  assert.match(script, /shotModeQualityWeights/);
  assert.match(script, /SA_CULTURAL_MOMENTS/);
  assert.match(script, /saMomentStripHtml/);
  assert.match(script, /applySaMoment/);
  assert.match(script, /function saMomentAllowedShotModes/);
  assert.match(script, /function saMomentShotMode/);
  assert.match(script, /SA Moment loaded/);
  assert.match(script, /saMomentNegativeAdditions/);
  assert.match(script, /pg52-sa-moment-strip/);
  [
    'Kasi Kool',
    'Slay At The Garage',
    "allowedShotModes: ['selfie', 'mirror', 'vibes']",
    'Post-Workout',
    'Hair Day',
    'Sundowners',
    'Neighbourgoods Saturday',
    'Airport Departure',
    'The Night Out',
    'Braai Day',
    'Cape Town Summer',
    'Dressing Room Haul',
    'Morning Routine',
    'soweto_street_sunday',
    'petrol_station_sa',
    'gym_mirror_virgin_active',
    'nightclub_joburg',
    'morning_bed',
    'corporate, formal, Sandton energy',
    '[SA Moment - '
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in SA Moment quick select`));
  assert.match(script, /SOCIAL_LIGHTING_OPTIONS/);
  assert.match(script, /function lightingOptionRegistry/);
  assert.match(script, /function lightingOptionById/);
  assert.match(script, /function lightingOptionsForShotMode/);
  assert.match(script, /function lightingOptionsHtml/);
  assert.match(script, /function lightingPromptPhrase/);
  assert.match(script, /function socialLightingBoost/);
  assert.match(script, /function setRankedLightingOptions/);
  [
    'phone_natural_window',
    'phone_golden_afternoon',
    'overcast_soft_outdoor',
    'car_window_light',
    'beach_bright',
    'ring_light_glow',
    'club_neon_led',
    'bathroom_overhead',
    'restaurant_ambient',
    'gym_fluorescent',
    'market_morning_mixed',
    'forecourt_bright',
    'airport_terminal',
    'morning_bedroom',
    'flash_event',
    'natural window light, soft indoor daylight',
    'petrol station forecourt canopy light',
    'nightclub LED lighting, purple and pink and blue wash',
    'direct on-camera flash or phone flash',
    'Studio / Editorial',
    'Recommended Social Lighting'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in social lighting vocabulary`));
  assert.match(script, /SOCIAL_FINISH_TREATMENTS/);
  assert.match(script, /function socialFinishTreatmentById/);
  assert.match(script, /function currentSocialFinishTreatment/);
  assert.match(script, /function socialFinishTreatmentHtml/);
  assert.match(script, /function syncSocialFinishTreatment/);
  assert.match(script, /function setSocialFinishTreatment/);
  assert.match(script, /function socialFinishTreatmentPromptLine/);
  assert.match(script, /function socialFinishTreatmentNegativeAdditions/);
  assert.match(script, /pg52-social-finish-treatment/);
  assert.match(script, /data-pg52-finish-treatment/);
  [
    'NO FILTER',
    'WARM EDIT',
    'COOL EDIT',
    'MOODY B&W',
    'FILM GRAIN',
    'BRIGHT AIRY',
    'DARK MOODBOARD',
    'unedited phone dump',
    'VSCO warm preset',
    'cool blue shadows',
    'black and white photograph',
    '35mm film aesthetic',
    'bright airy edit',
    'dark moody edit',
    'heavy filter',
    'processed color grading',
    'colour photography',
    'colour cast'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in social finish treatment vocabulary`));
  assert.match(css, /pg52-social-finish/);
  assert.match(css, /pg52-social-finish-pill\.active/);
  assert.match(script, /AUTHENTICITY_CONTROLS/);
  assert.match(script, /CAPTION_ENERGY_RULES/);
  assert.match(script, /function authenticityState/);
  assert.match(script, /function authenticityDefaultsForMode/);
  assert.match(script, /function authenticityPackFromControls/);
  assert.match(script, /function authenticityControlsHtml/);
  assert.match(script, /function syncAuthenticityControls/);
  assert.match(script, /function setAuthenticityControl/);
  assert.match(script, /function authenticityPromptLines/);
  assert.match(script, /function authenticityNegativeAdditions/);
  assert.match(script, /function captionEnergyGuide/);
  assert.match(script, /function captionEnergyGuideHtml/);
  assert.match(script, /SS_GENERATOR_STATE\.authenticity/);
  [
    'Phone visible',
    'Environment bleeding in',
    'Not too polished',
    'Natural motion',
    'Locked for mirror selfies',
    'Caption Energy Guide',
    "This shot&apos;s energy",
    'Best post time for SA',
    'phone or phone case visible in frame',
    'real environment details visible in background or edges',
    'slightly imperfect framing',
    'slight natural movement',
    'perfectly composed',
    'professional composition',
    'captionEnergyGuide',
    'authenticityPack'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in authenticity engine`));
  assert.match(css, /pg52-authenticity/);
  assert.match(css, /pg52-authenticity-toggle\.active/);
  assert.match(css, /pg52-authenticity-toggle::after/);
  assert.match(css, /pg52-authenticity-guide/);
  assert.match(script, /QUICK_CONFIGS/);
  assert.match(script, /function quickConfigPickerHtml/);
  assert.match(script, /function openQuickConfigs/);
  assert.match(script, /function applyQuickConfig/);
  assert.match(script, /function filterQuickConfigs/);
  assert.match(script, /function syncQuickConfigBanner/);
  assert.match(script, /Find a content type\.\.\./);
  assert.match(script, /SA CLASSICS/);
  assert.match(script, /QUICK CONFIGS/);
  assert.match(script, /loaded — now pick your character and wardrobe/);
  [
    'FIT CHECK',
    'GRWM MORNING',
    'POST-WORKOUT',
    'CAR SELFIE',
    'PETROL STATION FLEX',
    'COFFEE SHOP WORK',
    'SUNDOWNERS',
    'NEIGHBOURGOODS SATURDAY',
    'mid-stride, coffee in hand, browsing stalls',
    'NIGHT OUT',
    'DINNER DRESSED',
    'KASI STREETS',
    'HAIR DAY',
    'NAIL POST',
    'BEACH SUMMER',
    'AIRPORT DEPARTURE',
    'BRAAI DAY',
    'DUMB SELFIE',
    'CANDID CAUGHT',
    'HOLIDAY POOL',
    'MATRIC / FORMAL',
    'petrol_station_sa',
    'car_interior_selfie',
    'coffee_shop_aesthetic',
    'matric_farewell',
    'home_bedroom_mirror',
    'data-pg52-quick-config',
    'data-pg52-open-quick-configs'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in quick-fire content type cards`));
  assert.match(css, /pg52-quick-config-picker/);
  assert.match(css, /pg52-quick-config-fade-in/);
  assert.match(css, /pg52-quick-config-slide-up/);
  assert.match(css, /pg52-quick-config-grid/);
  assert.match(css, /pg52-quick-config-card/);
  [
    'Selfie Mode',
    'Mirror Selfie',
    'Vibes Shot',
    'Editorial Shoot',
    'Candid & Fun',
    'Event Moment',
    'The fit today',
    "Where you're at",
    'The mirror',
    'The chaos',
    'The night',
    'Phone camera selfie, natural lighting, casual candid energy',
    'Mirror selfie photograph, phone visible in frame',
    'Candid unposed photograph, friend taking the picture',
    'Smartphone selfie photograph',
    'Candid photograph',
    'Lifestyle photography',
    'Event photography',
    'phone held by subject is visible in the mirror reflection',
    'mirror reflection photograph not direct photography',
    'realistic mirror reflection with slight reflection quality',
    'shot on iPhone or Samsung Galaxy',
    'real person not a model',
    'professional photography',
    'DSLR quality',
    'no phone visible',
    'not a mirror reflection',
    'AI perfect face',
    'not South African',
    'outdoor natural light only'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in shot mode selector`));
  assert.match(script, /anatomyLabels:\s*\{\s*camera:\s*'POSE',\s*mood:\s*'ENERGY'\s*\}/);
  assert.match(script, /anatomyLabels:\s*\{\s*camera:\s*'CAMERA',\s*mood:\s*'MOOD \+ ENERGY'\s*\}/);
  assert.match(script, /shotModeNegative\.join/);
  assert.match(css, /pg52-shot-mode-selector/);
  assert.match(css, /pg52-shot-mode-card\.active/);
  assert.match(css, /pg52-mode-title-crossfade/);
  assert.match(css, /pg52-sa-moment-strip/);
  assert.match(css, /pg52-sa-moment-tile/);
  assert.match(css, /pg52-sa-moment-tile\[aria-pressed="true"\]/);
  assert.match(css, /pg52-sa-moment-banner/);
  assert.match(script, /prompt-generator-52-shell/);
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
  assert.match(script, /pg52-console/);
  assert.match(script, /pg52-director-desk/);
  assert.match(script, /pg52-generator-owned/);
  assert.match(script, /pg52-workspace/);
  assert.match(script, /pg52-identity-rail/);
  assert.match(script, /pg52-shot-canvas/);
  assert.match(script, /pg52-output-rail/);
  assert.match(script, /Dress the shot/);
  assert.match(script, /Place, frame, light/);
  assert.match(script, /What enters the shot/);
  assert.match(script, /Home System/);
  assert.match(script, /Assets Vault/);
  assert.match(script, /Scene Refs/);
  assert.match(script, /Aesthetic Ref/);
  assert.match(script, /aestheticRefDockHtml/);
  assert.match(script, /initAestheticRefDock/);
  assert.match(script, /addAestheticRefFile/);
  assert.match(script, /analyzeAestheticRef/);
  assert.match(script, /renderAestheticResult/);
  assert.match(script, /applyAestheticToShot/);
  assert.match(script, /aestheticNegativeModifiers/);
  assert.match(script, /Drop an image whose aesthetic you want to match/);
  assert.match(script, /Upload aesthetic reference/);
  assert.match(script, /Analysing aesthetic/);
  assert.match(script, /APPLY TO THIS SHOT/);
  assert.match(script, /Aesthetic transfer:/);
  assert.match(script, /\/api\/ai\/analyze-aesthetic-ref/);
  assert.match(script, /sceneRefPriority/);
  assert.match(script, /sceneRefToCandidate/);
  assert.match(script, /renderSceneRefDock/);
  assert.match(script, /initSceneRefDock/);
  assert.match(script, /addSceneRefFile/);
  assert.match(script, /removeSceneRef/);
  assert.match(script, /updateSceneRef/);
  assert.match(script, /pullLocationIntelligence/);
  assert.match(script, /Drop an environment reference/);
  assert.match(script, /Upload a scene ref image/);
  assert.match(script, /Max 2 scene refs/);
  assert.match(script, /scene_environment/);
  assert.match(script, /SCENE REFERENCE/);
  assert.match(script, /user_scene_ref_upload/);
  assert.match(script, /Pull from location/);
  assert.match(script, /pg52-location-intel-text/);
  assert.match(script, /Blast 6 Concepts/);
  assert.doesNotMatch(script, /Get 6 ideas/);
  assert.match(script, /Smart Randomize/);
  assert.match(script, /Intelligent surprise, not noise/);
  assert.match(script, /SAFE/);
  assert.match(script, /BOLD/);
  assert.match(script, /CONCEPTUAL/);
  assert.match(script, /g-smart-randomize-seed/);
  assert.match(script, /pg52-smart-randomize-history/);
  assert.match(script, /g-lock-location/);
  assert.match(script, /g-lock-lighting/);
  assert.match(script, /g-lock-action/);
  assert.match(script, /g-lock-camera/);
  assert.match(script, /g-lock-mood/);
  assert.match(script, /g-lock-props/);
  assert.match(script, /smartRandomizeSnapshot/);
  assert.match(script, /restoreSmartRandomizeSnapshot/);
  assert.match(script, /seededRandom/);
  assert.match(script, /generateSmartRandomizePatch/);
  assert.match(script, /applySmartRandomize/);
  assert.match(script, /smartRandomizeBack/);
  assert.match(script, /smartRandomizeFromHistory/);
  assert.match(script, /smartRandomizeDna/);
  assert.match(script, /smartRandomize/);
  assert.match(script, /Stay in JHB/);
  assert.match(script, /Go International/);
  assert.match(script, /Go Conceptual\/Surreal/);
  assert.match(script, /Lock Location/);
  assert.match(script, /Lock Lighting/);
  assert.match(script, /Lock Wardrobe/);
  assert.match(script, /LOAD THIS SHOT/);
  assert.match(script, /\/api\/generator\/profile/);
  assert.match(script, /\/api\/generator\/wardrobe\/.*\/item/);
  assert.match(script, /pg3-output-stage/);
  assert.match(script, /SilvaSurfaceOwners\.claim\('generator'/);
  assert.match(script, /pg52-ref-dock/);
  assert.match(script, /pg52-status-region/);
  assert.match(script, /pg52-wardrobe-drawer/);
  assert.match(script, /pg52-wardrobe-file-input/);
  assert.match(script, /Save to wardrobe/);
  assert.match(script, /pg50-model-drawer/);
  assert.match(script, /Compare all routes/);
  assert.match(script, /MODEL_INTELLIGENCE_FALLBACKS/);
  assert.match(script, /modelIntelligence/);
  assert.match(script, /modelRatingDots/);
  assert.match(script, /modelShotRecommendationScore/);
  assert.match(script, /recommendedModelForCurrentShot/);
  assert.match(script, /modelPerformanceHistory/);
  assert.match(script, /modelIntelligenceCardHtml/);
  assert.match(script, /modelComparisonCardHtml/);
  assert.match(script, /Model recommendation/);
  assert.match(script, /Model recommended/);
  assert.doesNotMatch(script, /Recommended for this shot/);
  assert.match(script, /Use recommended/);
  assert.match(script, /BEST FOR/);
  assert.match(script, /WATCH FOR/);
  assert.match(script, /No history yet/);
  assert.match(script, /ID Lock/);
  assert.match(script, /Skin texture/);
  assert.match(script, /Background/);
  assert.match(script, /Creative range/);
  assert.match(script, /Best use case/);
  assert.match(script, /PLATFORM_INTELLIGENCE/);
  [
    'instagram_feed_square',
    'Instagram Feed - Square',
    'instagram_feed_portrait',
    'Instagram Feed - Portrait 4:5',
    'instagram_stories',
    'Instagram Stories / Reels',
    'linkedin_post',
    'LinkedIn Post',
    'linkedin_profile_banner',
    'LinkedIn Profile Banner',
    'tiktok_reels',
    'TikTok / Reels Cover',
    'twitter_x',
    'X (Twitter) Post',
    'website_hero',
    'Website Hero Banner',
    'email_header',
    'Email Header',
    'print_a4_portrait',
    'Print - A4 Portrait',
    'billboard_landscape',
    'Billboard / OOH Landscape',
    'safeZones',
    'platformCompositionPreviewHtml',
    'platformSafeZoneStyle',
    'syncPlatformIntelligence',
    'platformIntelligence'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in platform intelligence`));
  ['1.91:1', '4:1', '3:1', '1:1.41'].forEach((needle) => assert.ok(script.includes(needle), `${needle} aspect option should exist`));
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
  assert.match(script, /Generate Prompt/);
  assert.match(script, /generatePromptFromGenerator/);
  assert.match(script, /LOCATION_REGISTRY/);
  assert.match(script, /LOCATION_CATEGORIES/);
  assert.match(script, /locationOptionsHtml/);
  assert.match(script, /locationPickerHtml/);
  assert.match(script, /initLocationPicker/);
  assert.match(script, /pg52-location-picker/);
  assert.match(script, /Search or describe a location/);
  assert.match(script, /locationChanged/);
  assert.match(script, /custom_location_/);
  assert.ok((script.match(/loc\('/g) || []).length >= 60, 'location engine should define 60+ registry entries');
  [
    'Johannesburg',
    'South Africa Wide',
    'International / Aspirational',
    'Studio / Controlled Environments',
    'Conceptual / Surreal / Editorial',
    'Interior Environments',
    'SA Mirrors & Indoor Selfie Spots',
    'SA Street & Outdoors',
    'Food & Drink Moments',
    'Event & Night Out',
    'Travel & Airport',
    'Morning & Home Routine',
    'Johannesburg train station interior',
    'Cape Town V&A Waterfront',
    'Dubai financial district glass canyon',
    'All-white infinity cove',
    'Floating in soft grey fog (no ground visible)',
    'Hospital corridor (clinical white)'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in location engine`));
  assert.match(script, /function socialLoc/);
  assert.match(script, /modeAffinity/);
  assert.match(script, /function isSocialMediaLocation/);
  assert.match(script, /function socialLocationNegativeModifiers/);
  [
    'hotel_mirror_premium',
    'petrol_station_sa',
    'restaurant_table_joburg',
    'concert_venue',
    'or_tambo_international',
    'apartment_kitchen',
    'melrose_arch_evening',
    'durban_promenade'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in social location registry`));
  assert.match(script, /studio photograph',\s*'professional editorial',\s*'posed fashion shoot',\s*'stock photo',\s*'advertising photography',\s*'commercial product shot',\s*'overly lit',\s*'professional backdrop/);
  assert.match(script, /Vibe: /);
  assert.match(script, /activeShotModePromptVoice/);
  assert.doesNotMatch(script, /mainPrompt[\s\S]{0,900}loc\.vibe/);
  assert.match(script, /ACTION_CATEGORIES/);
  [
    'selfie_actions',
    'selfie_wide_angle_actions',
    'mirror_selfie_actions',
    'candid_actions',
    'vibes_actions',
    'event_actions',
    'SELFIE POSES',
    'MIRROR SELFIE POSES',
    'VIBES POSES',
    'CANDID & FUN POSES',
    'EVENT MOMENT POSES',
    'arm extended holding phone, front camera selfie, slight chin down, direct lens gaze',
    "wide angle held at arm's length, fisheye distortion at edges, full outfit visible, high energy",
    'mirror selfie, phone held at chest height, full outfit visible, direct eye contact with own reflection',
    'mid-laugh, eyes closed or crinkled, head thrown back slightly, genuine uncontrollable',
    'leaning against a wall, arms loose, looking away from camera at something specific',
    'on the dance floor, mid-move, arms raised, music in the body'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in social action vocabulary`));
  assert.match(script, /function shotModeActionLabel/);
  assert.match(script, /function modeSafeActionValue/);
  assert.match(script, /state\.generatorV5\.actionSuggestions = \[\]/);
  assert.match(css, /pg52-action-mode-label/);
  [
    'Still / Presence',
    'Movement / Energy',
    'Seated / Grounded',
    'Expressive / Emotional',
    'Fashion / Editorial',
    'Direct gaze, standing, full stillness - authority',
    'Walking toward camera, direct look - approach',
    'Seated cafe, hands around cup - focused relaxation',
    'Mid-laugh, genuine - real joy',
    'Adjusting collar or sleeve - garment focus'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in action engine`));
  assert.match(script, /actionOptionsHtml/);
  assert.match(script, /actionEngineHtml/);
  assert.match(script, /initActionEngine/);
  assert.match(script, /renderActionSuggestions/);
  assert.match(script, /ensureActionOption/);
  assert.match(script, /pg52-action-engine/);
  assert.match(script, /pg52-action-suggest-btn/);
  assert.match(script, /g-action-override/);
  assert.match(script, /g-time-override/);
  assert.match(script, /g-props-override/);
  assert.match(script, /g-mood-override/);
  assert.match(script, /g-scene-override/);
  assert.match(script, /shotOverrideFieldValue/);
  assert.match(script, /shotOverrideActive/);
  assert.match(script, /shotOverrideDisplayText/);
  assert.match(script, /shotOverrideDnaPart/);
  assert.match(script, /shotOverrideFieldHtml/);
  assert.match(script, /initShotOverrides/);
  assert.match(script, /syncShotOverrideUi/);
  assert.match(script, /SCENE OVERRIDE — Add or override anything/);
  assert.match(script, /Back to list/);
  assert.match(script, /custom/);
  assert.match(script, /\/api\/ai\/suggest-actions/);
  assert.match(script, /actionOverride/);
  assert.match(script, /actionSource/);
  assert.match(script, /g-shot-action/);
  assert.match(script, /scenePack\.overrides/);
  assert.match(script, /sceneOverride/);
  assert.match(script, /c:/);
  assert.match(script, /chipFieldHtml\('g-camera', 'Camera style'/);
  assert.doesNotMatch(script, /chipFieldHtml\('g-camera', 'Action/);
  assert.match(script, /CINEMATIC_AESTHETICS/);
  assert.match(script, /CINEMATIC_TREATMENTS/);
  [
    'CINEMATIC MODE',
    'Cinematic Reference',
    'g-cinematic-mode',
    'g-cinematic-aesthetic',
    'g-cinematic-aesthetic-custom',
    'g-cinematic-narrative',
    'g-cinematic-treatment',
    'Cinematography: Bradford Young (Selma/Arrival)',
    'Director: Beyoncé Lemonade',
    'Fashion film: Bottega Veneta',
    'Magazine: Dazed',
    'Film grain',
    'Anamorphic lens flare',
    'Bleach bypass',
    'Golden ratio composition',
    'Dutch angle'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in cinematic mode`));
  assert.match(script, /cinematicModeHtml/);
  assert.match(script, /initCinematicMode/);
  assert.match(script, /syncCinematicMode/);
  assert.match(script, /cinematicTreatmentToggle/);
  assert.match(script, /cinematicPromptLine/);
  assert.match(script, /cinematicPackFromControls/);
  assert.match(script, /cinematicPack/);
  assert.match(script, /Narrative frame/);
  assert.match(script, /Cinematic modifiers/);
  assert.match(script, /CHARACTER_SHOOT_PROFILES/);
  assert.match(script, /SA_VISUAL_INTELLIGENCE/);
  assert.match(script, /applyContextIntelligence/);
  assert.match(script, /rankedOptions/);
  assert.match(script, /generateConceptBlast/);
  assert.match(script, /conceptBlastLocationPool/);
  assert.match(script, /conceptBlastCardHtml/);
  assert.match(script, /applyConceptBlastCard/);
  assert.match(script, /data-pg52-shot-mode/);
  assert.match(script, /socialMediaLocation && normalizeList\(entry\.modeAffinity\)\.indexOf\(mode\) >= 0/);
  assert.match(script, /socialLightingBoost\(mode, loc, activeSaMomentPack\(\)\)/);
  assert.doesNotMatch(script, /\/bathroom\|mirror\|changing room\|mall changing\//);
  assert.match(script, /shotMode:\s*concept\.shotMode \|\| currentShotMode\(\)/);
  assert.match(script, /generateContextConcepts/);
  assert.match(script, /scorePromptQuality/);
  assert.match(script, /livePromptSegments/);
  assert.match(script, /livePromptPreviewHtml/);
  assert.match(script, /CHARACTER/);
  assert.match(script, /REFS ACTIVE/);
  assert.match(script, /WARDROBE/);
  assert.match(script, /SCENE/);
  assert.match(script, /CAMERA/);
  assert.match(script, /LIGHT/);
  assert.match(script, /MOOD \+ ENERGY/);
  assert.match(script, /AVOID/);
  assert.match(script, /Copy full prompt/);
  assert.match(script, /Copy negative prompt/);
  assert.match(script, /abbreviatePromptText/);
  assert.match(script, /referenceRoleSummary/);
  assert.match(script, /pg52-prompt-anatomy/);
  assert.match(script, /pg52-prompt-anatomy-quality/);
  assert.match(script, /pg52-prompt-anatomy-negative/);
  assert.match(script, /encodeShotDna/);
  assert.match(script, /decodeShotDna/);
  assert.match(script, /SHOT_MODE_DNA_CODES/);
  assert.match(script, /function shotModeDnaCode/);
  assert.match(script, /selfie:\s*'sf'/);
  assert.match(script, /mirror:\s*'mr'/);
  assert.match(script, /vibes:\s*'vb'/);
  assert.match(script, /candid:\s*'cn'/);
  assert.match(script, /event:\s*'ev'/);
  assert.match(script, /silva_generator_shot_history_v1/);
  assert.match(script, /generator_shot_history_v1/);
  assert.match(script, /\/api\/generator\/shot-history/);
  assert.match(script, /promptGeneratorEngineUpdateShotStatus/);
  assert.match(script, /promptGeneratorEnginePrepareVariation/);
  assert.match(script, /data-pg52-shot-history-toggle/);
  assert.match(script, /data-pg52-shot-id/);
  assert.match(script, /Restored from/);
  assert.match(script, /MAX_SHOT_HISTORY_ENTRIES|shotHistory/);
  assert.match(script, /wardrobeLocationCompatibility/);
  assert.match(script, /referenceWeightFor/);
  assert.match(script, /influenceHint/);
  assert.match(script, /locationIntelligence/);
  assert.match(script, /promptQuality/);
  assert.match(script, /shotDna/);
  assert.match(script, /pg52-compatibility-meter/);
  assert.match(script, /pg52-shot-history-panel/);
  assert.match(script, /pg52-prompt-quality/);
  assert.match(script, /pg52-live-preview/);
  assert.match(script, /pg52-ref-weight-slider/);
  assert.match(html, /function imageReferenceWeight/);
  assert.match(html, /influenceWeight/);
  assert.match(html, /influenceHint/);
  {
    const generateConceptsStart = script.indexOf('async function generateConcepts');
    const generateConceptsEnd = script.indexOf('function actionSuggestionKey', generateConceptsStart);
    const generateConceptsBody = script.slice(generateConceptsStart, generateConceptsEnd);
    assert.ok(generateConceptsStart > -1, 'active generateConcepts function should exist');
    assert.match(generateConceptsBody, /generateConceptBlast/);
    assert.doesNotMatch(generateConceptsBody, /\/api\/generator\/concepts/);
  }
  assert.ok(
    script.indexOf('id="pg52-image-result"') > -1 &&
      script.indexOf('id="pg52-image-result"') < script.indexOf('pg52-output-accordions'),
    'image result stage must sit above prompt accordions so generated images are visible'
  );
  assert.match(html, /function getImageResultOutput/);
  assert.match(html, /function collapsePromptAccordion/);
  assert.match(html, /function focusImageResultOutput/);
  assert.match(html, /function setImageGenerateBusy/);
  assert.match(html, /function openImageFocusReview/);
  assert.match(html, /pg52-result-mode/);
  assert.match(html, /pg52-result-image-frame/);
  assert.ok(
    html.indexOf('pg52-result-image-frame') > -1 &&
      html.indexOf('pg52-result-image-frame') < html.indexOf('Identity QA + refs'),
    'generated image markup must precede identity QA/details text'
  );
  assert.match(html, /imageUrl/);
  assert.match(script, /raw_photo/);
  assert.match(script, /exact_character/);
  assert.match(script, /PROMPT_CONTRACT_V5_2/);
  assert.match(script, /data-contract/);
  assert.doesNotMatch(script, /<span class="pg50-pill">PROMPT_CONTRACT_V5_2<\/span>/);
  assert.match(script, /prompt-contract-v5\.2/);
  assert.match(script, /generatorRecipe/);
  assert.match(script, /selectedReferencePack/);
  assert.match(script, /homeSystemPack/);
  assert.match(script, /reference-pack-v5\.2/);
  assert.match(script, /wardrobePack/);
  assert.match(script, /wardrobeImageRefs/);
  assert.match(script, /activeWardrobeIds/);
  assert.match(script, /compileWardrobeRefs/);
  assert.match(script, /WARDROBE REFERENCE/);
  assert.match(script, /character_wardrobe_upload/);
  assert.match(script, /\+ Add item/);
  assert.match(script, /scenePack/);
  assert.match(script, /variationSeed/);
  assert.match(script, /lockedFields/);
  assert.match(script, /PRIMARY FACE TILE \/ IDENTITY AUTHORITY/);
  assert.match(script, /PRIMARY BODY TILE \/ BUILD AUTHORITY/);
  assert.match(html, /function renderFinalImageResultHtml/);
  assert.match(html, /function generationPreflight/);
  assert.match(script, /function identityRiskAssessment/);
  assert.match(script, /function strictIdentityLockEnabled/);
  assert.match(script, /function refIsIdentitySupport/);
  assert.match(script, /function refIsRejectedDoNotRepeat/);
  assert.match(script, /function controlledStrictIdentityRefs/);
  assert.match(script, /Strict Identity Lock/);
  assert.match(script, /pg52-identity-lock-card/);
  assert.match(script, /Scene\/environment refs are excluded from Strict Lock payloads by default/);
  assert.match(script, /Extra support refs were capped to prevent identity dilution/);
  assert.match(script, /Identity ref quality warning/);
  assert.match(script, /strictIdentityAllowSceneRefs/);
  assert.match(html, /strictIdentityFilterRefs/);
  assert.match(html, /imageRefIsSceneEnvironment/);
  assert.match(html, /renderFaceBodyComparisonStrip/);
  assert.match(html, /renderIdentityDriftReasonsHtml/);
  assert.match(html, /Why this may drift/);
  assert.match(html, /Improve Identity Pack/);
  assert.match(html, /QA advisory only/);
  assert.match(html, /Identity comparison/);
  assert.match(html, /Identity QA: not verified/);
  assert.match(html, /function renderGenerationPreflightBlockedState/);
  assert.match(html, /Generation blocked before spend/);
  assert.match(html, /No credits were used/);
  assert.match(html, /modelSupportsDirectIdentityRefs/);
  assert.match(html, /The payload would not send a real face authority image/);
  assert.match(html, /The selected model route is not safe for direct exact-character reference generation/);
  assert.match(html, /function toggleManualIdentityApproval/);
  assert.match(html, /pg52-manual-identity-approval/);
  assert.match(html, /I manually compared the generated face\/body with the identity refs/);
  assert.doesNotMatch(html, /AI check: looks aligned/);
  assert.doesNotMatch(html, /return 'AI check: unchecked'/);
  assert.match(html, /✓ APPROVE THIS SHOT/);
  assert.match(html, /✗ REJECT/);
  assert.match(html, /± VARIATION/);
  assert.match(html, /identity_drift/);
  assert.match(html, /wrong_outfit/);
  assert.match(html, /wrong_background/);
  assert.match(html, /skin_texture/);
  assert.match(html, /framing/);
  assert.match(html, /function generateShotVariation/);
  assert.match(html, /function showGeneratedShotRejectForm/);
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
  assert.match(html, /const spendLane = snapshot\?\.spendLane \|\| getCurrentImageSpendLane\(\)/);
  assert.match(html, /negativePrompt:/);
  assert.match(html, /real reference images into Nano Banana/);
  assert.match(html, /document\.getElementById\("prompt-generator-52-shell"\).*document\.getElementById\("prompt-generator-51-shell"\).*document\.getElementById\("prompt-generator-50-shell"\).*document\.getElementById\("prompt-generator-40-shell"\)\) return/);
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

test('live motion system is tokenized and generator exposes motion state hooks', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');
  const uiCss = fs.readFileSync(UI_CONSISTENCY_SYSTEM_CSS, 'utf8');
  const motionAudit = fs.readFileSync(MOTION_AUDIT, 'utf8');

  assert.match(html, /assets\/ui_consistency_system\.css\?v=5252/);
  [
    '--duration-instant: 80ms',
    '--duration-fast: 150ms',
    '--duration-medium: 220ms',
    '--duration-slow: 350ms',
    '--duration-crawl: 500ms',
    '--ease-spring',
    '--motion-fast: var(--duration-fast)',
    '--brand-rgb',
    '--identity-rgb'
  ].forEach((needle) => assert.ok(uiCss.includes(needle), `${needle} should exist in motion tokens`));
  [
    'onMotionEndOnce',
    'restartTransientClass',
    'markRepopulating',
    'markCharacterSwitch',
    'is-repopulating',
    'is-value-pulsing',
    'is-character-switching',
    'is-compat-recalculating',
    'is-score-updating'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in generator motion hooks`));
  [
    'pg52GenerateSweep',
    'pg52GenerateComplete',
    'pg52ResultDrawerIn',
    'pg52ApproveFlash',
    'pg52RejectFlash',
    'pg52BeadGenerate',
    'pg52RefCascade',
    'pg52ToggleRipple',
    'pg52QuickConfigFadeIn',
    'var(--duration-crawl)',
    'var(--ease-spring)'
  ].forEach((needle) => assert.ok(css.includes(needle), `${needle} should exist in generator motion CSS`));
  assert.match(html, /Generating — '\s*\+\s*imageGenerationProgressValue\s*\+\s*'%'/);
  assert.match(html, /Done — View result ↓/);
  assert.match(html, /startImageGenerateProgress/);
  assert.match(html, /setInterval\(\(\) =>/);
  assert.match(motionAudit, /Raw motion duration declarations/);
  assert.match(motionAudit, /Potential animation-only setTimeout calls/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.js\?v=5248/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.css\?v=5248/);
});

test('live color system enforces variable-backed rendered colors', () => {
  const html = readIndex();
  const colorCss = fs.readFileSync(COLOR_SYSTEM_CSS, 'utf8');
  const colorAudit = fs.readFileSync(COLOR_AUDIT, 'utf8');
  const uiAudit = fs.readFileSync(path.join(ROOT, 'scripts', 'audit-live-ui-consistency.mjs'), 'utf8');

  assert.match(html, /assets\/color_system\.css\?v=5253/);
  [
    '--bg-0:   #0a0a0c',
    '--red-500:    #e8333a',
    '--green-500:  #2ecc7a',
    '--amber-500:  #f0a030',
    '--blue-500:   #4878f0',
    '--gold-500:   #c89830',
    '--purple-500: #7860e8',
    '--color-brand:        var(--red-500)',
    '--bg-primary:    var(--bg-1)',
    '--text-primary:   var(--text-0)',
    '--bg: var(--bg-0)',
    '--surface: var(--bg-1)',
    '--white: var(--text-primary)',
    '--red-glow-color',
    '--color-transparent: transparent',
    '--color-current: currentColor',
    '--color-review-warning'
  ].forEach((needle) => assert.ok(colorCss.includes(needle), `${needle} should exist in live color system`));

  [
    'COLOR_PATTERN',
    'linkedAssets',
    'removeRootBlocks',
    'scanCssText',
    'scanJsStyleAssignments',
    'Hardcoded live color violations outside :root'
  ].forEach((needle) => assert.ok(colorAudit.includes(needle), `${needle} should exist in color audit`));

  assert.match(uiAudit, /audit-live-color-system\.mjs/);
  assert.doesNotMatch(html, /rgba\(\$\{r\.char/);
  assert.doesNotMatch(fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8'), /var\(--color-white\) balance/);
});

test('live component consistency layer normalizes repeated UI jobs', () => {
  const html = readIndex();
  const css = fs.readFileSync(COMPONENT_CONSISTENCY_CSS, 'utf8');
  const audit = fs.readFileSync(COMPONENT_CONSISTENCY_AUDIT, 'utf8');
  const report = fs.readFileSync(COMPONENT_CONSISTENCY_REPORT, 'utf8');
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');

  assert.match(html, /assets\/component_consistency_system\.css\?v=5254/);
  assert.ok(
    html.indexOf('assets/color_system.css?v=5253') < html.indexOf('assets/component_consistency_system.css?v=5254'),
    'component consistency layer should load after the color layer'
  );
  [
    '--component-select-height: 36px',
    '--component-button-primary-height: 44px',
    '--component-button-secondary-height: 36px',
    '--component-button-ghost-height: 32px',
    '--component-tag-height: 24px',
    '--component-status-dot-size: 7px',
    'border: 1px solid var(--border-subtle)',
    'box-shadow: var(--component-select-focus-ring)',
    '.ui-btn--primary',
    '.ui-btn--secondary',
    '.ui-btn--ghost',
    '.pg3-ai-row .btn[onclick*="generateImageAndSaveFromGenerator"]',
    '.pg52-compat-dots',
    '.pg52-model-rating-dots',
    '.nav-char-dot',
    '.nav-label'
  ].forEach((needle) => assert.ok(css.includes(needle), `${needle} should exist in component consistency CSS`));
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
    'After'
  ].forEach((needle) => assert.ok(report.includes(needle), `${needle} should exist in consistency audit report`));
  [
    'audit-live-component-consistency',
    'component consistency stylesheet',
    'Legacy component definitions documented/overridden',
    'CONSISTENCY_AUDIT_REPORT.md'
  ].forEach((needle) => assert.ok(audit.includes(needle), `${needle} should exist in component consistency audit`));
  [
    'function componentScoreLabelFromDots',
    "return 'EXCELLENT'",
    "return 'GOOD'",
    "return 'MODERATE'",
    "return 'TENSION'",
    "return 'AVOID'",
    'var label = componentScoreLabelFromDots(dots)'
  ].forEach((needle) => assert.ok(script.includes(needle), `${needle} should exist in score normalization`));
  assert.doesNotMatch(script, /btn btn-primary btn-sm" onclick="generateImageAndSaveFromGenerator/);
  assert.doesNotMatch(html, /btn btn-primary btn-sm" onclick="generateImageAndSaveFromGenerator/);
});

test('content planner uses indexed month board with collapsed overflow drawer', () => {
  const html = readIndex();
  const css = fs.readFileSync(CALENDAR_FULLSCREEN_FIX_CSS, 'utf8');
  const js = fs.readFileSync(CALENDAR_FULLSCREEN_FIX, 'utf8');

  assert.match(html, /calendar_fullscreen_fix\.css\?v=plannerfull4/);
  assert.match(html, /calendar_fullscreen_fix\.js\?v=plannerfull4/);
  assert.match(html, /plannerCalendarRescueVersion/);
  assert.match(html, /STATE\.plannerView='month'/);
  assert.match(html, /buildPlannerIndex/);
  assert.match(html, /groupPlannerPostsForDisplay/);
  assert.match(html, /renderPlannerMonthBoard/);
  assert.match(html, /renderPlannerWeekAgenda/);
  assert.match(html, /openPlannerDayDrawer/);
  assert.match(html, /renderPlannerOverflowSummary/);
  assert.match(html, /Review follow-ups/);
  assert.match(html, /planner-more-btn/);
  assert.match(html, /planner-day-drawer/);
  assert.match(html, /planner-day-scroll/);
  assert.match(html, /window\.__silvaCanonicalRenderPlanner/);
  assert.match(html, /window\.renderPlanner = window\.__silvaCanonicalRenderPlanner/);
  assert.match(css, /planner-month-board/);
  assert.match(css, /planner-week-agenda/);
  assert.match(css, /planner-drawer-panel/);
  assert.match(css, /overflow:auto/);
  assert.match(js, /planner-month-board/);
  assert.match(js, /planner-week-agenda/);
});

test('Prompt Generator V3 avoids route-preview rerender stutter', () => {
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

test('Prompt Generator V3 visual layer is visible, collapsed where needed, and red is restrained', () => {
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');
  const providerCss = fs.readFileSync(PROVIDER_CONTROL_CENTER_CSS, 'utf8');
  assert.match(script, /Prompt Quality Breakdown/);
  assert.match(script, /Prompt Anatomy/);
  assert.match(script, /Router Payload Preview/);
  assert.match(script, /Caption \/ Social Kit/);
  assert.match(script, /pg50-model-drawer/);
  assert.match(script, /pg52-command-selects/);
  assert.match(script, /workflowStripHtml/);
  assert.match(script, /pg52-workflow-strip/);
  assert.match(script, /pg52-creative-tools/);
  assert.match(script, /data-pg52-tool-tab/);
  assert.match(script, /data-pg52-tool-panel/);
  assert.match(script, /Concepts/);
  assert.match(script, /Randomize/);
  assert.match(script, /Cinematic/);
  assert.match(script, /Platform/);
  assert.match(script, /Scene Override/);
  assert.match(script, /Prompt Anatomy/);
  assert.match(script, /openCreativeTools/);
  assert.match(script, /pg52-workspace/);
  assert.match(script, /pg52-identity-rail/);
  assert.match(script, /pg52-shot-canvas/);
  assert.match(script, /pg52-output-rail/);
  assert.match(script, /initChipSelectors/);
  assert.doesNotMatch(script, /Compare model routes/);
  assert.match(css, /pg52-console/);
  assert.match(css, /pg52-director-desk/);
  assert.match(css, /pg52-director-brief/);
  assert.match(css, /pg52-director-brief-input/);
  assert.match(css, /pg52-director-summary/);
  assert.match(css, /pg52-brief-changed/);
  assert.match(css, /pg52-generator-owned/);
  assert.match(css, /pg52-workspace/);
  assert.match(css, /pg52-identity-rail/);
  assert.match(css, /pg52-shot-canvas/);
  assert.match(css, /pg52-ref-candidate/);
  assert.match(css, /pg52-ref-dock/);
  assert.match(css, /pg52-scene-ref-shell/);
  assert.match(css, /pg52-scene-ref-drop/);
  assert.match(css, /pg52-scene-ref-card/);
  assert.match(css, /pg52-scene-ref-intel-text/);
  assert.match(css, /pg52-aesthetic-ref-shell/);
  assert.match(css, /pg52-aesthetic-ref-drop/);
  assert.match(css, /pg52-aesthetic-ref-preview/);
  assert.match(css, /pg52-aesthetic-ref-result/);
  assert.match(css, /pg52-wardrobe-grid/);
  assert.match(css, /pg52-wardrobe-tile/);
  assert.match(css, /pg52-wardrobe-drawer/);
  assert.match(css, /pg50-model-drawer/);
  assert.match(css, /pg50-model-board/);
  assert.match(css, /pg52-model-intel/);
  assert.match(css, /pg52-model-rating-dots/);
  assert.match(css, /pg52-model-comparison-grid/);
  assert.match(css, /pg52-model-comparison-card/);
  assert.match(css, /pg52-model-badge--recommended/);
  assert.match(css, /pg52-model-use-recommended/);
  assert.match(css, /pg50-outfit-card/);
  assert.match(css, /pg52-concept-card/);
  assert.match(css, /pg52-concept-blast-panel/);
  assert.match(css, /pg52-concept-blast-card/);
  assert.match(css, /pg52-concept-blast-load/);
  assert.match(css, /Emergency stability layer/);
  assert.match(css, /Human usability layer/);
  assert.match(css, /pg52-workflow-strip/);
  assert.match(css, /pg52-creative-tools/);
  assert.match(css, /core controls first/);
  assert.match(css, /repeat\(auto-fit,\s*minmax\(min\(100%, 260px\), 1fr\)\)/);
  assert.match(css, /pg52-manual-identity-review/);
  assert.match(css, /pg52-preflight-blocked/);
  assert.match(css, /pg52-identity-lock-card/);
  assert.match(css, /pg52-identity-lock-check/);
  assert.match(css, /pg52-identity-lock-qa/);
  assert.match(css, /pg52-creative-tabs/);
  assert.match(css, /pg52-creative-tool-panel/);
  assert.match(css, /pg52-result-identity-compare/);
  assert.match(css, /scrollbar-gutter:\s*stable/);
  assert.match(css, /pg52-smart-randomize/);
  assert.match(css, /pg52-smart-mode/);
  assert.match(css, /pg52-axis-lock/);
  assert.match(css, /pg52-smart-seed/);
  assert.match(css, /pg52-smart-history/);
  assert.match(css, /pg52-chip-popover/);
  assert.match(css, /pg52-location-picker/);
  assert.match(css, /pg52-location-input/);
  assert.match(css, /pg52-location-menu/);
  assert.match(css, /pg52-location-context-tag/);
  assert.match(css, /pg52-action-engine/);
  assert.match(css, /pg52-action-select/);
  assert.match(css, /pg52-action-suggest-btn/);
  assert.match(css, /pg52-action-card/);
  assert.match(css, /pg52-action-override/);
  assert.match(css, /pg52-shot-override-field/);
  assert.match(css, /pg52-override-edit/);
  assert.match(css, /pg52-override-back/);
  assert.match(css, /pg52-custom-tag/);
  assert.match(css, /pg52-scene-override/);
  assert.match(css, /pg52-cinematic-shell/);
  assert.match(css, /pg52-cinematic-toggle/);
  assert.match(css, /pg52-cinematic-panel/);
  assert.match(css, /pg52-cinematic-select/);
  assert.match(css, /pg52-cinematic-tag/);
  assert.match(css, /pg52-prompt-actions/);
  assert.match(css, /pg52-image-result--active/);
  assert.match(css, /pg52-result-mode/);
  assert.match(css, /pg52-result-stage/);
  assert.match(css, /pg52-result-toolbar/);
  assert.match(css, /pg52-compatibility-meter/);
  assert.match(css, /pg52-shot-history-panel/);
  assert.match(css, /pg52-quality-summary/);
  assert.match(css, /pg52-live-preview/);
  assert.match(css, /pg52-prompt-anatomy/);
  assert.match(css, /pg52-prompt-anatomy-segment/);
  assert.match(css, /pg52-prompt-anatomy-actions/);
  assert.match(css, /pg52-prompt-anatomy-quality/);
  assert.match(css, /pg52-prompt-anatomy-negative/);
  assert.match(css, /pg52-platform-preview/);
  assert.match(css, /pg52-platform-preview-frame/);
  assert.match(css, /pg52-platform-preview-safe/);
  assert.match(css, /pg52-platform-preview-subject/);
  assert.match(css, /tone-character/);
  assert.match(css, /tone-negative/);
  assert.match(css, /pg52-ref-weight-slider/);
  assert.match(css, /pg52-focus-review/);
  assert.doesNotMatch(css, /pg52-output-rail::-webkit-scrollbar\s*\{[^}]*display:\s*none/i);
  assert.doesNotMatch(css, /pg52-output-rail[^}]*scrollbar-width:\s*none/i);
  assert.match(css, /pg52-generating-state/);
  assert.match(css, /pg3-sticky-actions/);
  assert.match(css, /pg3-image-result/);
  assert.match(css, /pg3-image-compare/);
  assert.match(css, /pg40-final-review/);
  assert.match(css, /pg40-review-grid/);
  assert.match(css, /pg3-final-photo/);
  assert.match(css, /pg3-ref-strip/);
  assert.match(css, /btn\.btn-primary:hover/);
  assert.match(css, /color:\s*var\(--color-hex-070a0f\)\s*!important/);
  assert.match(css, /btn:not\(\.btn-primary\):hover/);
  assert.match(css, /color:\s*var\(--color-white\)\s*!important/);
  assert.match(css, /--pg3-danger/);
  assert.match(css, /--pg52-blue:\s*var\(--red, var\(--color-hex-e8001e\)\)/);
  assert.doesNotMatch(css, /#4f8cff/i);
  assert.doesNotMatch(css, /#6ba3ff/i);
  assert.doesNotMatch(css, /#7b6cf0/i);
  assert.doesNotMatch(css, /rgba\(79,140,255/i);
  assert.doesNotMatch(css, /rgba\(79,\s*140,\s*255/i);
  assert.doesNotMatch(providerCss, /#4f8cff/i);
  assert.doesNotMatch(providerCss, /#6ba3ff/i);
  assert.doesNotMatch(providerCss, /#7b6cf0/i);
  assert.doesNotMatch(css, /background:\s*conic-gradient\(var\(--red\)/);
});

test('Provider Control Center is loaded and does not persist raw provider keys client-side', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROVIDER_CONTROL_CENTER, 'utf8');
  const css = fs.readFileSync(PROVIDER_CONTROL_CENTER_CSS, 'utf8');

  const readinessStore = fs.readFileSync(PROVIDER_READINESS_STORE, 'utf8');
  assert.match(html, /assets\/provider_control_center_v1\.js\?v=3508/);
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

test('live async feedback layer covers user-visible async operations', () => {
  const html = readIndex();
  const asyncJs = fs.readFileSync(ASYNC_FEEDBACK_JS, 'utf8');
  const asyncCss = fs.readFileSync(ASYNC_FEEDBACK_CSS, 'utf8');
  const generator = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const providerStore = fs.readFileSync(PROVIDER_READINESS_STORE, 'utf8');
  const auditScript = fs.readFileSync(ASYNC_FEEDBACK_AUDIT, 'utf8');
  const auditReport = fs.readFileSync(ASYNC_OPERATION_AUDIT, 'utf8');

  assert.match(html, /assets\/async_feedback_system\.css\?v=5255/);
  assert.match(html, /assets\/async_feedback_system\.js\?v=5255/);
  assert.ok(
    html.indexOf('assets/v399_toast_elite.js?v=3992') < html.indexOf('assets/async_feedback_system.js?v=5255')
      && html.indexOf('assets/async_feedback_system.js?v=5255') < html.indexOf('assets/provider_readiness_store_v1.js?v=2'),
    'async feedback should load after legacy toast and before provider/generator scripts'
  );
  assert.match(asyncJs, /window\.showToast\s*=\s*showToast/);
  assert.match(asyncJs, /window\.toast\s*=/);
  assert.match(asyncJs, /window\.SilvaAsyncFeedback\s*=/);
  assert.match(asyncJs, /maxVisible|MAX_TOASTS/);
  assert.match(asyncJs, /No internet connection — generation unavailable/);
  assert.match(asyncJs, /Connection lost — generation may have failed/);
  assert.match(asyncJs, /Connection lost\. Check your internet and try again\./);
  assert.match(asyncJs, /Google Credits balance insufficient\. Check balance ↗/);
  assert.match(asyncJs, /Nano Banana Pro is currently unavailable\. Switch model\?/);
  assert.match(asyncJs, /Taking too long\. The model may be busy\./);
  assert.match(asyncJs, /One or more reference images failed to upload\. Remove and retry\./);
  assert.match(asyncJs, /Prompt error — quality score too low to generate\. Review the prompt\./);
  assert.match(asyncCss, /silva-toast-stack/);
  assert.match(asyncCss, /silva-offline-banner/);
  assert.match(asyncCss, /pg52-generate-btn\.is-generating/);
  assert.match(asyncCss, /pg52-upload-progress/);
  assert.match(html, /signal:\s*meta\.signal/);
  assert.match(html, /feedback\?\.startOperation\('imageGeneration'/);
  assert.match(html, /imageGenerationAbortController/);
  assert.match(html, /90000/);
  assert.match(html, /renderImageErrorState\(classified\.message/);
  assert.match(generator, /function validateWardrobeUploadFile/);
  assert.match(generator, /Upload failed\. File may be too large \(max 10MB\) or wrong format \(jpg\/png\/webp\)\./);
  assert.match(generator, /function acceptWardrobeUploadFile/);
  assert.match(generator, /startAsyncOperation\('wardrobeSave'/);
  assert.match(generator, /Couldn't save\. Changes held locally\. Retry/);
  assert.match(generator, /startAsyncOperation\('directorBrief'/);
  assert.match(generator, /Reading your brief\.\.\./);
  assert.match(generator, /Couldn't parse brief\. Try being more specific about character, location, or lighting/);
  assert.match(generator, /pg52-concept-skeleton-grid/);
  assert.match(generator, /startAsyncOperation\('conceptBlast'/);
  assert.match(generator, /Suggestions unavailable\. Try again\./);
  assert.match(generator, /startAsyncOperation\('actionSuggestions'/);
  assert.match(generator, /startAsyncOperation\('routePreview'/);
  assert.match(providerStore, /providerReadinessStore/);
  assert.match(auditScript, /Live Async Feedback Audit/);
  assert.match(auditReport, /imageGeneration/);
  assert.match(auditReport, /Provider credential save/);
  assert.match(auditReport, /Studio Pulse history/);
  assert.match(auditReport, /Prompt library durable actions/);
  assert.match(auditReport, /Planner durable actions/);
  assert.match(auditReport, /Workspace import\/export/);
  assert.match(html, /\/api\/image-generation\/generate/);
});

test('Prompt Generator stress hardening guards edge-case user flows', () => {
  const html = readIndex();
  const generator = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const stressCss = fs.readFileSync(STRESS_HARDENING_CSS, 'utf8');
  const imageRoute = fs.readFileSync(IMAGE_GENERATION_ROUTE, 'utf8');
  const generatorRoute = fs.readFileSync(GENERATOR_ROUTE, 'utf8');
  const statusStore = fs.readFileSync(GENERATION_STATUS_STORE, 'utf8');

  assert.match(html, /assets\/stress_hardening_system\.css\?v=5258/);
  assert.match(html, /assets\/prompt_generator_v3\.js\?v=5260/);
  assert.match(html, /clientGenerationId/);
  assert.match(html, /\/api\/generator\/generation-status\//);
  assert.match(html, /createGenerationJobSnapshot|promptGeneratorEngineCreateGenerationSnapshot/);
  assert.match(html, /promptGeneratorEngineBudgetPreflight/);
  assert.match(html, /promptGeneratorEngineRecordBudgetSpend/);
  assert.match(generator, /function scheduleCharacterSelection/);
  assert.match(generator, /setTimeout\(function\(\)\{[\s\S]*\},\s*150\)/);
  assert.match(generator, /function truncatePromptForModelBudget/);
  assert.match(generator, /g-director-brief-counter/);
  assert.match(generator, /function enqueueWardrobeUploads/);
  assert.match(generator, /queue\.active < 2/);
  assert.match(generator, /function optimizeImageFile/);
  assert.match(generator, /if \(role === 'face'\) return 512/);
  assert.match(generator, /if \(role === 'scene'\) return 1024/);
  assert.match(generator, /return 768/);
  assert.match(generator, /Budget exhausted - update limit in settings\./);
  assert.match(generator, /function closeAllGeneratorDropdowns/);
  assert.match(generator, /Leave page\?/);
  assert.match(generator, /Your current configuration will be cleared\./);
  assert.match(generator, /App updated in another tab\./);
  assert.match(generator, /function loadShotFromDna/);
  assert.match(generator, /Load from DNA/);
  assert.match(generator, /window\.promptGeneratorEngineCreateGenerationSnapshot/);
  assert.match(generator, /window\.promptGeneratorEngineBudgetPreflight/);
  assert.match(imageRoute, /markGenerationPending/);
  assert.match(imageRoute, /markGenerationComplete/);
  assert.match(imageRoute, /markGenerationFailed/);
  assert.match(generatorRoute, /\/generation-status\/:id/);
  assert.match(statusStore, /MAX_GENERATION_STATUSES/);
  assert.match(statusStore, /STATUS_TTL_MS/);
  assert.match(statusStore, /getGenerationStatus/);
  assert.match(stressCss, /pg52-stress-banner/);
  assert.match(stressCss, /pg52-upload-queue/);
  assert.match(stressCss, /pg52-dna-load/);
  assert.match(stressCss, /pg52-nav-guard-modal/);
  assert.match(html, /\/api\/image-generation\/generate/);
  assert.match(generator, /g-action-override/);
  assert.match(generator, /g-scene-override/);
  assert.match(generator, /g-director-brief/);
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

test('Studio Pulse Room Intelligence v0 is wired without becoming a global OS layer', () => {
  const studio = fs.readFileSync(STUDIO_PULSE, 'utf8');
  const route = fs.readFileSync(STUDIO_ROUTE, 'utf8');
  const characters = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'characters.js'), 'utf8');
  const state = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'state.js'), 'utf8');
  const perception = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'perception.js'), 'utf8');
  const planner = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'planner.js'), 'utf8');
  const reducer = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'reducer.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'adapter.js'), 'utf8');
  const dialogueQuality = fs.readFileSync(path.join(STUDIO_ROOM_INTELLIGENCE, 'dialogueQuality.js'), 'utf8');
  const aishaAdapter = fs.readFileSync(path.join(ROOT, 'lib', 'aisha', 'aishaAdapter.js'), 'utf8');
  const aishaTypes = fs.readFileSync(path.join(ROOT, 'lib', 'aisha', 'aishaTypes.js'), 'utf8');

  assert.match(characters, /roleInRoom/);
  assert.match(characters, /relationshipToOtherCharacters/);
  assert.match(characters, /responseDoNotDos/);
  assert.match(state, /roomIntelligenceV0|room-intelligence\.v0|studio-pulse\.room-intelligence\.v0/);
  assert.match(state, /aisha:\s*'active'/);
  assert.match(state, /leah:\s*'quiet'/);
  assert.match(perception, /PRESENCE_RX/);
  assert.match(perception, /INSULT_RX/);
  assert.match(perception, /FACT_CHANGE_RX/);
  assert.match(planner, /presenceText/);
  assert.match(planner, /Quiet\/listening/);
  assert.match(planner, /leahIgnoringText/);
  assert.match(planner, /groupOpinionSteps/);
  assert.match(planner, /insultSteps/);
  assert.match(perception, /OPEN_FLOOR_RX/);
  assert.match(planner, /exchangeMode/);
  assert.match(planner, /solo-plus-addendum/);
  assert.match(planner, /open-floor/);
  assert.match(reducer, /memory-confirmation/);
  assert.match(adapter, /buildRoomCharacterPrompt/);
  assert.match(adapter, /do not answer as a generic assistant/i);
  assert.match(dialogueQuality, /studio-pulse\.dialogue-quality\.v0\.2/);
  assert.match(dialogueQuality, /assistantFillerReason/);
  assert.match(dialogueQuality, /literal-consciousness-claim/);
  assert.match(route, /createRoomIntelligenceContext/);
  assert.match(route, /planRoomTurn/);
  assert.match(route, /dialogueQualityV02/);
  assert.match(route, /studio-room-intelligence-v0/);
  assert.match(route, /roomIntelligenceV0/);
  assert.match(route, /callAishaEngine/);
  assert.match(route, /exchangeContextV06/);
  assert.match(route, /openFloorRequested/);
  assert.match(route, /activeEngine[\s\S]{0,220}local-room-intelligence/);
  assert.match(route, /fallbackReason:\s*['"]aisha-not-connected['"]/);
  assert.match(aishaAdapter, /callAishaEngine/);
  assert.match(aishaAdapter, /processAishaRequest/);
  assert.match(aishaAdapter, /aisha-runtime-pack1/);
  assert.match(aishaAdapter, /AISHA_ENGINE_ENABLED/);
  assert.match(aishaAdapter, /engineMode:\s*['"]production['"]/);
  assert.doesNotMatch(aishaAdapter, /\bprocessTurn\b/);
  assert.doesNotMatch(aishaAdapter, /\bruntimeBuilder\b/);
  assert.doesNotMatch(aishaAdapter, /\bmemoryStore|memoryStores|memoryStores\b/);
  assert.match(aishaAdapter, /aishaEngineConnected:\s*false|createDisconnectedAishaResponse/);
  assert.match(aishaTypes, /a569440/);
  assert.match(aishaTypes, /\[Mock A\.I\.S\.H\.A\]/);
  assert.match(studio, /sp-room-presence/);
  assert.match(studio, /roomPresenceStripMarkup/);
  assert.match(studio, /sp-room-msg-meta/);
  assert.match(studio, /sp-open-floor/);
  assert.match(studio, /exchangeLabel/);
  assert.match(studio, /Open Floor/);
  assert.match(studio, /Adds/);
  assert.match(studio, /Active Engine/);
  assert.match(studio, /A\.I\.S\.H\.A/);
  assert.match(studio, /Not connected/);
  assert.doesNotMatch(route, /A\.I\.S\.H\.A\s+global/i);
});

test('Prompt Generator V3 rescue pass protects identity trust and laptop layout', () => {
  const html = readIndex();
  const script = fs.readFileSync(PROMPT_GENERATOR_V3, 'utf8');
  const css = fs.readFileSync(PROMPT_GENERATOR_V3_CSS, 'utf8');

  assert.match(script, /function normalizeIdentityScore100/);
  assert.match(script, /Math\.round\(average\) \+ '% avg identity score/);
  assert.doesNotMatch(script, /Math\.round\(average \* 100\) \+ '% avg identity score/);
  assert.match(script, /function identityPayloadOrderSafe/);
  assert.match(script, /Identity Payload Preview/);
  assert.match(script, /face first, body second, wardrobe after/);
  assert.match(script, /The outgoing strict identity payload is not face-first and body-second/);
  assert.match(html, /The strict identity payload is not ordered face-first and body-second/);
  assert.match(html, /Scene\/environment image refs are still in the strict identity payload/);
  assert.match(script, /function socialSourceRealismGuidance/);
  assert.match(script, /Real social source photo: raw camera capture for later posting/);
  assert.match(script, /Social realism: source-photo ready/);
  assert.match(script, /Identity risk: low - strict refs preserved/);
  assert.match(css, /pg52-identity-payload-preview/);
  assert.match(css, /@media \(max-width: 1480px\) and \(min-width: 1321px\)/);
  assert.match(css, /@media \(max-width: 1320px\)/);
  assert.match(css, /@media \(max-width: 1320px\) and \(min-width: 1081px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(188px,\s*214px\)\s*minmax\(500px,\s*1fr\)\s*minmax\(312px,\s*352px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(176px,\s*205px\)\s*minmax\(430px,\s*1fr\)\s*minmax\(286px,\s*322px\)/);
  assert.match(css, /pg52-route-card \.pg52-model-intelligence-card[\s\S]*display:\s*none/);
  assert.match(css, /pg52-route-card \.pg52-model-guidance[\s\S]*display:\s*none/);
  assert.match(css, /pg52-concept-blast-badges/);
  assert.match(css, /max-height:\s*min\(46vh,\s*520px\)/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.js\?v=5232/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.css\?v=5232/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.js\?v=5233/);
  assert.doesNotMatch(html, /assets\/prompt_generator_v3\.css\?v=5233/);
});
