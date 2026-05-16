# Generator Stress Test Report

Scope: live Silva OS generator stress-hardening pass for root `index.html`, `assets/prompt_generator_v3.js`, `routes/imageGeneration.js`, `routes/generator.js`, and the new stress/status support layer.

## FIXED IN THIS PASS

1. RAPID CHARACTER SWITCHING — Character selection is debounced by 150ms through `scheduleCharacterSelection()`, stale switch work is sequenced, and profile/ref updates only render after the latest pending character wins.

2. EXTREMELY LONG INPUT — Action override, scene override, and Director Brief now enforce visible limits and counters; prompt submission uses `truncatePromptForModelBudget()` so oversized user free text cannot blow past the router prompt limit.

3. UPLOAD 20 WARDROBE ITEMS IN A ROW — Wardrobe uploads now use `enqueueWardrobeUploads()` with max concurrency 2, queue position/status UI, per-file validation, and automatic optimized wardrobe item persistence.

4. RESIZE WHILE GENERATING — Generation state is stored in an immutable snapshot/job object and the UI re-syncs from that state, so viewport changes do not rebuild the prompt or interrupt progress state.

5. SWITCH SHOT MODES WHILE A GENERATION IS PENDING — `createGenerationJobSnapshot()` locks the prompt, shot mode, model, spend lane, refs, wardrobe, and route payload at click/queue time; retries and generation calls use the snapshot.

6. ZERO BUDGET REMAINING — Local budget guard now warns at 90%, blocks projected overspend/100%, disables the generation path before spend, and shows `Budget exhausted - update limit in settings.` with an Update Budget action.

7. ALL DROPDOWNS OPEN AT ONCE — `closeAllGeneratorDropdowns(except)` centralizes custom menu ownership, so opening the location picker closes chip popovers and opening a chip closes the location picker.

8. BACK/FORWARD BROWSER NAVIGATION — Dirty generator state arms a popstate guard and shows `Leave page? Your current configuration will be cleared.` with Stay/Leave instead of silently losing setup.

9. NETWORK FLUCTUATION DURING GENERATION — The image route now records pending/complete/failed status by client generation ID, and the frontend polls `GET /api/generator/generation-status/:id` every 5 seconds after network/timeout interruption.

10. LARGE WARDROBE/REF IMAGE UPLOAD — Uploaded images are optimized client-side before storage: face refs can use 512px, wardrobe refs use 768px, scene refs use 1024px, and the UI shows `Optimizing image...` during processing.

11. TWO TABS OPEN — A `storage` event listener watches generator/app state keys and shows `App updated in another tab. [Reload to sync]` instead of silently leaving stale state active.

12. COPY DNA STRING INTO A NEW SESSION — The live DNA area now includes a `Load from DNA` input that parses existing DNA strings, resolves exact IDs or unique prefixes, applies via `applyGeneratorState()`, and warns on ambiguous/unknown segments.

## REQUIRES BACKEND

- True external provider credit-balance enforcement still requires a provider/credits ledger. This pass enforces a local user budget from estimated ZAR cost and successful generated-shot spend.

## BACKLOG

- Full URL-addressable generator state restoration remains intentionally out of scope. The requested behavior is a safe leave/stay guard, not full browser history replay.

## Verification Targets

- Static: `node --check assets/prompt_generator_v3.js`, `node --check routes/imageGeneration.js`, `node --check routes/generator.js`, `node --test tests/frontend.static.test.js`.

- Backend: `tests/imageGeneration.routes.test.js` covers the resumable generation status route and unknown status behavior.

- Browser smoke: rapid character switching, long input limits, bulk wardrobe queue, resize during mocked generation, mode switch during pending generation, budget exhaustion, dropdown exclusivity, back guard, network recovery polling, cross-tab warning, and DNA loading.
