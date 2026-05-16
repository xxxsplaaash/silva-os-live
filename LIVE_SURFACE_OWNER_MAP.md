# Live Surface Owner Map

Last updated: 2026-05-09

## Root Shell
- Owner: `server.js` serves repo-root `index.html` from `/`.
- Static policy: `express.static(__dirname)` exposes root assets and scripts.
- Live Pulse bundle: `index.html` loads `studio_pulse_v400.js?v=4017`.
- Protected boundary: do not replace the shell or move to a new framework.

## Studio Pulse
- Live route: `POST /api/studio/pulse` in `routes/studio.js`.
- Default cutover gate: `STUDIO_PULSE_HARD_CUT !== '0'`.
- Default room engine: `lib/studio/roomRuntime.js`.
- Default prompt owner: `lib/studio/prompt.js`.
- Live fallback owner: `lib/studio/fallback.js`.
- Legacy authored fallback: `lib/studio/fallback.LEGACY.js`, rollback-only and lazy-loaded only when hard cut is explicitly disabled.
- Public output contract: `response.messageEvents`.
- Live lanes in this cut: `room`, `direct`, `diagnostic`, `spark`.
- Workflow/commit policy: offline in hard-cut mode.

## Pulse State
- Runtime overlay key: `runtime_overlay_room_v1`.
- Legacy overlay key: `runtime_overlay`, archival only for this room cut.
- Room state endpoint: `GET /api/state/pulse-room`.
- Browser boot policy: `studio_pulse_v400.js` uses `preparePulseLaunchState()` on load and clears saved active thread identity.
- Thread restore policy: previous threads are available through explicit history selection, not automatic boot resurrection.

## Image Routing
- Metadata: `GET /api/image-models`.
- Routing preview: `POST /api/image-models/route-preview`.
- Generation: `POST /api/image-generation/generate`.
- Legacy Google image route: `POST /api/gemini/image`, preserved only as a compatibility fallback.
- Registry owner: `lib/imageGeneration/modelRegistry.js`.
- Adapter owners:
  - Google Vertex AI: `lib/imageGeneration/providers/google.js`.
  - fal.ai image hub: `lib/imageGeneration/providers/fal.js`.
  - OpenAI direct: `lib/imageGeneration/providers/openai.js`, legacy/unused for image generation in this local setup.
  - Replicate: `lib/imageGeneration/providers/replicate.js`, legacy/non-live only.
- Hard provider rule: Google image models stay on Vertex AI. fal.ai handles GPT Image, FLUX, Seedream, Qwen utility edit, and every non-Google live image model.

## Generator And Provider UI
- Prompt Generator owner: `assets/prompt_generator_v3.js` + `assets/prompt_generator_v3.css`, loaded by root `index.html`.
- Live generator shell: `#prompt-generator-52-shell` owns the visible **Prompt Generator V3** production console. The `52` suffix is an internal compatibility owner only; older `#prompt-generator-51-shell`, `#prompt-generator-50-shell`, `#prompt-generator-40-shell`, and `#prompt-generator-38-shell` are compatibility/rollback shells only and must not be visible at the same time.
- Generator workflow: one shotboard canvas with a top command bar, left identity/reference rail, center shot canvas, right production rail, and model drawer hidden behind `Change route`.
- Generator reference policy: selected character, Assets Vault, Home System rooms, outfit slots, and item refs are compiled into `selectedReferencePack` / `identityPack` for `/api/image-generation/generate`.
- Provider Shell and Settings owner: `assets/provider_control_center_v1.js` + `assets/provider_control_center_v1.css`, loaded by root `index.html`.
- Runtime ownership guard: `assets/surface_owners_v1.js` exposes `window.SilvaSurfaceOwners` and records late owner claims for `generator`, `providers`, and `settings`.
- Optional browser perf probe: `assets/silva_perf_probe.js` exposes `window.SilvaPerf` only when `?perf=1` or `localStorage.silva_perf_debug=1` is enabled.
- Cache-bust policy: root `index.html` must bump these asset query strings after live UI changes.
- Visible provider groups: Google Vertex AI, fal.ai Image Hub, Studio Pulse Gemini, and compact Routing Settings.
- Google Vertex setup flow: paste/upload service-account JSON in the Provider Control Center, or use the advanced existing-path field; browser receives masked status only.
- Legacy provider shell in `assets/shelf_fix_v10.js` is not allowed to be the final visible owner for `#providers` or `#settings`; it must hand off to `window.SilvaProviderControlCenter` when present and must not persist raw keys.

## SQLite
- Database module: `db/sqlite.js`.
- Studio Pulse thread/message storage remains existing `studio_pulse_threads` and `studio_pulse_messages`.
- Studio2 v4 state tables are defined by `db/studio2_v4_migration.sql`.
- Local DB files are ignored by `.gitignore`.

## Setup And Test Commands
- Deterministic release setup: `npm run setup:all`.
- Local dev dependencies: `npm install`.
- Browser install: `npm run setup:browsers`.
- Node tests: `npm test`.
- Accessibility tests: `npm run test:a11y`.
- App start: `npm start`.

## Guardrails
- Default Pulse path must not eagerly import `fallback.LEGACY`.
- Default room/direct/diagnostic path must not call deterministic authored room writers.
- Default spark path must be provider-or-quiet.
- Root generator UI must call `/api/image-generation/generate`, not provider APIs directly.
- No API keys may be exposed in public model metadata or browser markup.
