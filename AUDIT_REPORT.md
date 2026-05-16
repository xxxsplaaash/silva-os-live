<!--
AUDIT REPORT GENERATED 2026-05-12
Scope: Silva Studios AI Division OS source audit in /Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755.
Method: Enumerated 581 project files outside dependency/build/report folders; read/scanned 566 text files totaling 1,768,115 lines. Binary assets and databases were inspected by path/type/size only, not decoded as source text.
Constraint: Audit only. No runtime app files were modified in this pass.
-->

# Silva Studios AI Division OS Audit Report

## Findings

[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/identity_vault_rescue_v1.css:24] — Hardcoded success green `#59e6a2` bypasses the shared Silva color tokens. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/identity_vault_rescue_v1.css:30] — Hardcoded alert pink `#ff8fa2` bypasses the shared Silva color tokens. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/identity_vault_rescue_v1.css:178] — Hardcoded gold `#d6bd61` creates a second gold system beside existing design variables. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/calendar_fullscreen_fix.css:258] — Hardcoded panel gradient colors `#121316` and `#090a0d` bypass the design system. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/v397_true_final_overhaul.css:69] — Hardcoded text color `#f3f3f3 !important` overrides the typography/color system. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [index.html:407] — Hardcoded green `#60d0a0` appears inline instead of using a semantic token. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [index.html:408] — Hardcoded mint `#4de29d` appears inline instead of using a semantic token. — [Severity: MEDIUM]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/prompt_generator_v3.css:101] — Transition duration uses `150ms`, inconsistent with the requested 200ms social-polish motion standard. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/prompt_generator_v3.css:456] — Transition duration uses `160ms`, creating motion inconsistency beside 150ms/180ms/200ms/300ms layers. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/calendar_fullscreen_fix.css:5] — Padding `34px 20px 88px 20px` does not align to the 8px grid. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/identity_vault_rescue_v1.css:7] — Gap `14px` does not align to the 8px spacing grid used elsewhere. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/identity_vault_rescue_v1.css:17] — Padding `7px 10px` is off-grid and inconsistent with nearby buttons. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/provider_control_center_v1.css:190] — Padding `7px 9px` is off-grid and visually inconsistent with the core controls. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/alpha_397a.css:198] — Page padding `24px 34px 62px` mixes grid-aligned and off-grid values. — [Severity: LOW]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/prompt_generator_v3.css:1891] — Magic `z-index:13000` is used without a defined z-index scale. — [Severity: HIGH]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/prompt_generator_v3.css:3876] — Magic `z-index:32000` competes with other overlay values and can cause modal layering drift. — [Severity: HIGH]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [assets/v399_polish_final.css:183] — Hovercard uses `z-index:99999 !important`, bypassing all overlay ordering rules. — [Severity: HIGH]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [index.html:500] — Modal stack uses `z-index:9999` while other overlays use 1000/5000/9000/11000/12000/13000. — [Severity: HIGH]
[CATEGORY 01: VISUAL INCONSISTENCIES] — [index.html:712] — Quickview uses `z-index:13000` while generator overlays use 19000/20000/30000/32000, creating unpredictable stacking. — [Severity: HIGH]

[CATEGORY 02: LAYOUT BREAKAGE] — [assets/final_polish_v397.css:137] — Grid columns require `minmax(340px)` plus `minmax(460px)`, guaranteeing overflow in narrow content areas. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/provider_control_center_v1.css:137] — Two-column layout keeps a `minmax(360px)` right column and can break under tablet widths. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/alpha_397a.css:340] — Home grid uses `minmax(390px,1fr)`, too wide for 320px/375px mobile viewports. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/alpha_397a.css:349] — Team grid uses `minmax(400px,1fr)`, too wide for mobile and narrow split panes. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/alpha_397a.css:687] — Aisha grid keeps a `minmax(360px)` side column that can force horizontal scroll. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:1119] — Generator grid requires `minmax(320px)` plus `minmax(560px)`, too wide for 768px without collapse pressure. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:1659] — Legacy generator grid requires `360px + 620px` columns and can reproduce the cramped right-rail layout. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:2202] — Three-column grid requires `300px + 420px + 420px`, causing overflow below desktop widths. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:2513] — Generator command grid requires `250px + 520px + 340px`, leaving no safe room for browser sidebars. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:2817] — Layout uses `minmax(170px,.28fr) minmax(760px,1.72fr)`, forcing an oversized center canvas. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:2863] — Three-column grid requires `270px + 620px + 360px`; this risks clipped controls at 1024px/1440px with sidebar present. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:5495] — Current V3 shell grid keeps `276px + 560px + 388px`, which exceeds many laptop content widths once the left OS sidebar is included. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:5754] — Later stability layer raises the center minimum to `720px`, reintroducing the right-rail squeeze previously reported. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:6095] — Result rail minimum reaches `460px-620px`, making the main desk fragile on 13-inch laptop widths. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:8139] — Another override requires `218px + 620px + 360px`, showing multiple competing layout definitions for the same generator surface. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:8145] — Alternate layout requires `210px + 560px + 500px`, prioritizing the result rail at the expense of main controls. — [Severity: HIGH]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:6388] — Shot history rows use a seven-column fixed grid, likely to truncate DNA/model/date text in narrow rails. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:7171] — Prompt anatomy footer grid uses `auto auto auto minmax(190px,1fr)`, risking button overflow in the right rail. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/calendar_fullscreen_fix.css:212] — Planner scroll container uses `overflow:auto !important` without a matching mobile momentum-scroll rule. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:1489] — Generator scroll container uses `overflow:auto` without `-webkit-overflow-scrolling: touch`. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:3172] — Drawer scroll container uses `overflow:auto` without `-webkit-overflow-scrolling: touch`. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/prompt_generator_v3.css:5328] — Invisible file input is positioned absolute over the full upload card and can obscure nested controls. — [Severity: MEDIUM]
[CATEGORY 02: LAYOUT BREAKAGE] — [assets/calendar_fullscreen_fix.css:14] — Planner page is capped at `max-width:980px !important`, inconsistent with the wide month-board screenshots and likely to fight container sizing. — [Severity: MEDIUM]

[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4664] — `state.generatorV5.shotMode` is updated in JS state while other code also reads `window.SS_GENERATOR_STATE.shotMode`, creating dual sources of truth. — [Severity: HIGH]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4800] — Control state is restored from hidden `script[data-pg38-value]` nodes, so DOM-embedded JSON can drift from `state.generatorV5`. — [Severity: HIGH]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4596] — Location select `innerHTML` is rebuilt during mode sync; custom/current values outside the new pool can be lost if preservation fails. — [Severity: MEDIUM]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4608] — Action select `innerHTML` is rebuilt during mode sync and can discard stale/valid user selections without a visible review step. — [Severity: MEDIUM]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4633] — Mode change clears AI action suggestions but does not preserve an explanation of why suggestions disappeared. — [Severity: LOW]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:4864] — Wardrobe closet state is stored in localStorage while active selection also lives in `state.generatorV5`, creating desync risk. — [Severity: MEDIUM]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:7494] — Shot history is stored in localStorage while backend history exists; failures can silently fork the user's history. — [Severity: HIGH]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/prompt_generator_v3.js:10898] — `applyGeneratorState()` is 207 lines and mutates controls, local state, route preview, DNA, and render state in one path, making partial updates likely. — [Severity: HIGH]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [index.html:6899] — Legacy `window.generateFullPrompt` patch writes a separate payload shape into `g-api-payload`, risking divergence from V3 router payload. — [Severity: HIGH]
[CATEGORY 03: STATE MANAGEMENT BUGS] — [assets/v399_identity_sync.js:83] — Profile autosave uses a timer and separate backend/local state without a visible conflict-resolution path. — [Severity: MEDIUM]

[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:4391] — Quick Config search filters on every keystroke with no debounce, risking lag as cards/features grow. — [Severity: MEDIUM]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:9679] — Location picker opens and recalculates on every input event without debounce. — [Severity: MEDIUM]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:9788] — Root input handler reacts broadly to generator inputs, increasing re-entry risk during rapid typing. — [Severity: MEDIUM]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:9962] — Scene reference file upload accepts files but the nearby handler does not show a source-level size/type guard before processing. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:10014] — Aesthetic reference upload accepts files but does not expose an obvious pre-upload size/type rejection path in the handler. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [assets/identity_vault_rescue_v1.js:221] — Identity vault reads uploaded refs with `FileReader` without a visible size cap, risking huge base64 payloads in localStorage. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [index.html:4992] — Asset upload creates an unrestricted `image/*` input with no visible size validation before reading as data URL. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [index.html:5078] — Secondary asset upload repeats the unrestricted FileReader path. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [index.html:6797] — Workspace import reads a `.silva`/JSON file without an explicit file-size guard before parsing. — [Severity: MEDIUM]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:9212] — Legacy generator button calls `generateImageFromGenerator(this)` inline; if busy state is not set synchronously, double-clicks can fire duplicate generation attempts. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:12106] — Current final generate button uses inline onclick and duplicate render paths, increasing the chance of inconsistent disabled/re-entry behavior. — [Severity: HIGH]
[CATEGORY 04: INTERACTION GAPS] — [assets/prompt_generator_v3.js:3639] — Override back button is available as a plain button without disabled/dirty state when unsaved custom text exists. — [Severity: LOW]

[CATEGORY 05: FEEDBACK GAPS] — [assets/final_polish_v397.js:43] — Fetch failure is swallowed with an empty catch, so users receive no visible failure state. — [Severity: MEDIUM]
[CATEGORY 05: FEEDBACK GAPS] — [assets/surface_owners_v1.js:23] — Surface-owner write failure is swallowed with no user-visible or diagnostic feedback. — [Severity: LOW]
[CATEGORY 05: FEEDBACK GAPS] — [assets/provider_control_center_v1.js:666] — Async bootstrap catch is empty, hiding provider-shell load failures. — [Severity: HIGH]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:3180] — Provider status refresh catch is empty, hiding provider status request failure. — [Severity: MEDIUM]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:4508] — Director brief current-state build failure is swallowed, causing parse results to be based on incomplete context without warning. — [Severity: MEDIUM]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:7541] — Shot history restore/build failure is swallowed, risking a no-op reload with no user-visible explanation. — [Severity: HIGH]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:8363] — Clipboard copy failure for Smart Randomize seed is swallowed. — [Severity: LOW]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:11170] — Performance instrumentation failures are swallowed; useful audit telemetry can disappear silently. — [Severity: LOW]
[CATEGORY 05: FEEDBACK GAPS] — [assets/prompt_generator_v3.js:12243] — Prompt generation error logs to console but does not guarantee a persistent user-visible error state. — [Severity: MEDIUM]
[CATEGORY 05: FEEDBACK GAPS] — [index.html:2422] — State load/migration catch is empty, risking a blank/stale OS state without visible recovery. — [Severity: HIGH]
[CATEGORY 05: FEEDBACK GAPS] — [index.html:3217] — Backend state sync catch is empty, hiding state persistence failure from the operator. — [Severity: HIGH]

[CATEGORY 06: ACCESSIBILITY FAILURES] — [index.html:172] — `.gen-select`, `.gen-input`, and related controls remove outline; replacement focus styles are incomplete across all variants. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [index.html:363] — Search input removes outline and depends on subtle border/box-shadow only. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [index.html:371] — Filter select removes outline and has minimal focus contrast. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [index.html:540] — Modal close button removes outline; only some modal controls receive `focus-visible` replacement. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/final_polish_v397.css:123] — Global inputs remove outline with `!important`, making keyboard focus fragile across old surfaces. — [Severity: HIGH]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/shelf_fix_v10.js:835] — Home upload slot renders an image without an `alt` attribute. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/alpha_397a.js:353] — Team avatar image is injected without an `alt` attribute. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/alpha_397a.js:945] — Reference quickview images are injected without `alt` text. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/alpha_397a.js:971] — Face/body lock preview images are injected without `alt` attributes. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/prompt_generator_v3.js:4316] — Quick Config cards are buttons with rich card content but no explicit `aria-label`, forcing screen readers through visual-only emoji/name layout. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/prompt_generator_v3.js:4341] — Quick Config modal close button says only `Close` but lacks modal-title association/focus-trap evidence at the source. — [Severity: MEDIUM]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/prompt_generator_v3.js:9579] — Custom location options use `role="option"` but source does not show a complete combobox/listbox relationship. — [Severity: HIGH]
[CATEGORY 06: ACCESSIBILITY FAILURES] — [assets/prompt_generator_v3.js:10868] — Horizontal model strip listens to scroll but lacks an obvious keyboard equivalent for strip navigation. — [Severity: MEDIUM]

[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/calendar_fullscreen_fix.js:43] — Planner heal runs on window resize without throttling/debounce. — [Severity: HIGH]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/calendar_fullscreen_fix.js:55] — Planner heal uses a timed rerender workaround after clicks, risking repeated full renders. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/final_polish_v397.js:90] — Polish pass runs delayed DOM sweeps with `setTimeout`, not event-owned updates. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/final_polish_v397.js:91] — Second delayed polish sweep repeats full DOM work one second after load. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/alpha_397a.js:761] — Home search rerenders immediately on every keystroke. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/alpha_397a.js:950] — Hovercard binds mouseenter/mousemove/mouseleave per element, which scales poorly as nav/card counts grow. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/v399_elite_makeup.js:85] — Hover animation tracks mousemove per enhanced element and may force frequent style recalculation. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/prompt_generator_v3.js:4391] — Quick Config filter queries and toggles card visibility on every input without debounce. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/prompt_generator_v3.js:9679] — Location input opens/rebuilds picker on every keystroke without debounce. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/prompt_generator_v3.js:11203] — Route preview debounce is timer-based and repeated across state changes; it should centralize invalidation and cancellation. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [assets/prompt_generator_v3.js:11342] — `buildKit()` is 450 lines and repeatedly gathers DOM/control/registry state, making live preview expensive and hard to cache safely. — [Severity: HIGH]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [index.html:5543] — `renderIdeas()` filters and rebuilds the full ideas grid on every search/filter change with a long inline template. — [Severity: MEDIUM]
[CATEGORY 07: PERFORMANCE PROBLEMS] — [index.html:6672] — Planner safe grid render is 68 lines and appears as another fallback path beside the canonical planner renderer. — [Severity: MEDIUM]

[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:1440] — `setRankedLightingOptions()` is 51 lines, just over the requested function-size boundary and mixes ranking with DOM mutation. — [Severity: LOW]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:2306] — `getShotModeVoice()` is 98 lines and embeds large mode copy directly in logic instead of a data table. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:2405] — `compileShotModePromptSegments()` is 146 lines and centralizes many responsibilities in one compiler path. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:5600] — `referenceCandidatesForCurrent()` is 93 lines and mixes source discovery, role ranking, and filtering. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:5841] — `identityRiskAssessment()` is 109 lines and should be split into testable checks. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:6036] — `renderReferenceDock()` is 119 lines and mixes data gathering with markup rendering. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:7071] — `livePromptSegments()` is 116 lines and duplicates prompt-segment rules that should be declarative. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:7376] — `generateConceptBlast()` is 99 lines and mixes creative scoring, randomization, and UI-ready card output. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:8832] — `renderGeneratorShell52()` is 216 lines, making shell layout changes high risk. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:10173] — `ensureControls()` is 296 lines and owns too many init/sync behaviors. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:10898] — `applyGeneratorState()` is 207 lines and duplicates mode/control/state routing concerns. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:11342] — `buildKit()` is 450 lines, the largest active compiler seam and the highest-risk source of prompt regressions. — [Severity: CRITICAL]
[CATEGORY 08: CODE QUALITY ISSUES] — [index.html:3721] — Legacy `generateFullKit()` is 134 lines and overlaps with V3 prompt generation responsibilities. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [index.html:7298] — `generateGeminiImageRaw()` is 140 lines and mixes payload construction, network call, UI rendering, and history side effects. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [index.html:8135] — `generateImageFromGenerator()` is 102 lines and overlaps with V3 generation/preflight behavior. — [Severity: HIGH]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/provider_control_center_v1.js:24] — Production fallback writes user-visible status to `console.log` when toast is unavailable. — [Severity: LOW]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/v399_identity_sync.js:25] — Production identity sync logs active character state to console. — [Severity: LOW]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/v399_workspace_sync.js:39] — Production workspace sync logs successful saves to console. — [Severity: LOW]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:2306] — Mode prompt strings are hardcoded in compiler helpers and repeated semantically across moments/quick configs/negative packs. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:3100] — Inline `onclick="useRecommendedModelForShot()"` remains in generated markup, bypassing the delegated event style used elsewhere. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [assets/prompt_generator_v3.js:7217] — Inline copy button handlers are repeated for prompt anatomy rather than using a single delegated copy action. — [Severity: MEDIUM]
[CATEGORY 08: CODE QUALITY ISSUES] — [index.html:3799] — Prompt copy handler injects prompt text into inline `onclick`, increasing quoting/escaping risk and duplicating V3 copy behavior. — [Severity: HIGH]

## Prioritized Fix List For CRITICAL And HIGH Items

1. [CRITICAL] Split `assets/prompt_generator_v3.js:11342` `buildKit()` into smaller seams: control snapshot, identity/reference pack, scene/social compiler, negative compiler, contract builder, and router payload metadata.
2. [HIGH] Create a single V3 layout grid authority and remove/neutralize competing generator grid definitions at `assets/prompt_generator_v3.css:1119`, `:1659`, `:2202`, `:2513`, `:2817`, `:2863`, `:5495`, `:5754`, `:6095`, `:8139`, and `:8145`.
3. [HIGH] Define a z-index scale and replace magic overlay values at `assets/prompt_generator_v3.css:1891`, `:3876`, `assets/v399_polish_final.css:183`, `index.html:500`, and `index.html:712`.
4. [HIGH] Unify generator state ownership so `state.generatorV5`, `window.SS_GENERATOR_STATE`, hidden DOM JSON, localStorage, and legacy `index.html` payload patches cannot disagree.
5. [HIGH] Harden generation re-entry by routing all final generate buttons through one locked async path with immediate disabled state and no duplicate inline handlers.
6. [HIGH] Add file size/type validation before every FileReader path for identity refs, scene refs, aesthetic refs, assets, and workspace import.
7. [HIGH] Replace silent persistence/backend catches in `index.html` and `assets/prompt_generator_v3.js` with visible non-blocking errors or recoverable status banners.
8. [HIGH] Make custom listbox/combobox controls accessible, especially location picker roles at `assets/prompt_generator_v3.js:9579`.
9. [HIGH] Break apart `applyGeneratorState()`, `ensureControls()`, `renderGeneratorShell52()`, `identityRiskAssessment()`, `referenceCandidatesForCurrent()`, `compileShotModePromptSegments()`, and `generateConceptBlast()` before further feature expansion.
10. [HIGH] Remove legacy prompt/generation overlap in `index.html` so V3 owns prompt kit and final image generation contracts without parallel payload builders.
11. [HIGH] Debounce/throttle planner resize healing, quick config search, location search, and ideas search to reduce UI lag under heavy saved data.
12. [HIGH] Restore consistent keyboard focus visibility where global CSS removes outlines with `!important`.
