# Change Inventory

Last updated: 2026-05-06

This checkout still has a broad dirty worktree. Do not treat it as one coherent patch. Group changes before staging or reviewing.

## Current Hardening Pass
- `.gitignore`
- `README.md`
- `FINAL_VERIFICATION.md`
- `LIVE_SURFACE_OWNER_MAP.md`
- `CHANGE_INVENTORY.md`
- `routes/studio.js`
- `routes/state.js`
- `lib/studio/systemContext.js`
- `studio_pulse_v400.js`
- focused `index.html` edits for provider-shell copy, planner modal focus, and generator analytics safety
- `tests/studioPulse.livePath.test.js`
- `tests/state.static.test.js`
- `tests/routes.inventory.test.js`
- `tests/frontend.static.test.js`
- `tests/setupDeps.test.js`
- `tests/accessibility/overlay-keyboard.spec.cjs`
- `package.json`
- `package-lock.json`

## 2026-05-06 Stability / Performance Pass
- `assets/prompt_generator_v3.js`
- `assets/prompt_generator_v3.css`
- `assets/provider_control_center_v1.js`
- `assets/provider_control_center_v1.css`
- `routes/imageGeneration.js`
- `server.js`
- `index.html`
- `LIVE_SURFACE_OWNER_MAP.md`
- `CHANGE_INVENTORY.md`
- `tests/frontend.static.test.js`
- `tests/routes.inventory.test.js`
- `tests/accessibility/overlay-keyboard.spec.cjs`
- `FINAL_VERIFICATION.md`
- Purpose: protect live Generator/Provider ownership, reduce route-preview/provider-shell re-render jank, harden image route validation, scrub client-side provider secrets before sync, and record proof.

## 2026-05-06 Next Hardening Wave
- `assets/surface_owners_v1.js`
- `assets/silva_perf_probe.js`
- `assets/prompt_generator_v3.js`
- `assets/prompt_generator_v3.css`
- `assets/provider_control_center_v1.js`
- `assets/shelf_fix_v10.js`
- `routes/geminiLegacy.js`
- `server.js`
- `index.html`
- `tests/frontend.static.test.js`
- `tests/routes.inventory.test.js`
- `tests/accessibility/overlay-keyboard.spec.cjs`
- `LIVE_SURFACE_OWNER_MAP.md`
- `FINAL_VERIFICATION.md`
- Purpose: collapse live UI ownership ambiguity, demote old provider/settings writers, move legacy Gemini compatibility out of the main server entrypoint, add an optional client perf probe, and lock the Generator 3.4 workflow against route-preview/model-board jank while keeping all 8 image routes visible.

## Image Routing Work
- `lib/imageGeneration/`
- `routes/imageModels.js`
- `routes/imageGeneration.js`
- `IMAGE_MODEL_ROUTING.md`
- image routing tests under `tests/imageGeneration.*.test.js`
- generator-router hooks in root `index.html`
- server route mounts in `server.js`

## Pulse Rebuild Work
- `lib/studio/fallback.js`
- `lib/studio/fallback.LEGACY.js`
- `lib/studio/roomRuntime.js`
- `lib/studio/prompt.js`
- `lib/studio/parse.js`
- `lib/studio/history.js`
- `lib/studio/systemContext.js`
- `lib/studio/voiceLibrary.js`
- `lib/studio/pulseWorkflow.js`
- `lib/studio2/`
- `db/studio2_v4_migration.sql`
- Pulse docs: `STUDIO_PULSE_CURRENT_SYSTEM.md`, `STUDIO_PULSE_REBUILD_PLAN.md`, `STUDIO_PULSE_CHARACTER_SPEC.md`, `STUDIO_PULSE_TURN_MODEL.md`
- Studio2 tests under `tests/studio2.*`

## Setup And Accessibility Work
- `scripts/setup_deps.js`
- `scripts/setup_browsers.js`
- `Launch Silva OS.command`
- `playwright.config.js`
- `.runtime/deps.hash` generated locally and ignored
- accessibility overlay utilities and ARIA/focus edits in `index.html`
- `tests/accessibility/`

## Calendar And UI Patch Work
- `assets/calendar_fullscreen_fix.js`
- `assets/shelf_fix_v10.css`
- `assets/shelf_fix_v10.js`
- `assets/v398_*`
- `assets/v399_*`
- large root `index.html` shell changes outside the focused provider/Pulse/a11y areas

## Unknown Or Older Dirt
- audit/backlog docs created before this pass
- `probe.html`
- `sync_probe.html`
- older asset variants such as `assets/v399_legacy_*`, `assets/v399_polish_pass4.*`, `assets/v399_touchup_pass3.*`
- unrelated modified backend files not touched in this pass, including planner and DB migrations from earlier work

## Review Rule
- Stage by category, not by `git add .`.
- Do not revert unknown dirt without explicit confirmation.
- Treat `routes/studio.js`, `index.html`, `server.js`, `db/sqlite.js`, and `studio_pulse_v400.js` as high-risk owner files.
