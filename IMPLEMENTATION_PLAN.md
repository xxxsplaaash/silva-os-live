# Silva OS Legacy Surgical Repair Plan

## Findings summary
- Live shell is repo-root `index.html`.
- Version text was written by multiple active layers.
- Character heroes were sourced from mixed static and injected DOM with no canonical structure.
- Avatar persistence path was already viable but presentation and hydration were inconsistent.
- Home System lag came from multiple renderer owners, duplicate handlers, and broad observers.
- Modes were partially wired but the main generator still did not use them meaningfully.
- Ghost artifacts came from active cleanup CSS pseudo-elements, not the base shell itself.

## Root causes
- No shared version source of truth.
- Patch-on-patch ownership for `page-homes`.
- Mixed profile markup sources plus Aisha-only styling.
- Global observer usage for problems that should have been handled by source-owner hooks.

## Risks
- `index.html` is huge and already had local modifications before this pass.
- `studio_pulse_v395.js` and `assets/shelf_fix_v10.js` sit on the critical path for Home and Studio Pulse.
- Late v399 polish files are loaded and can still interfere even when they are not the real owners.

## Exact fix order
1. Back up every touched file to `backups/surgical-20260421-215630/`.
2. Add shared shell helpers in `index.html`:
   - version source
   - chrome updater
   - mode-context helper
3. Route active version writers through the shared helper.
4. Normalize static and injected profile hero markup to shared wrappers.
5. Keep generic avatar click-to-change as the single live owner.
6. Make `assets/shelf_fix_v10.js::renderHomesV12()` the sole owner of `page-homes`.
7. Remove broad observer-driven rerender pressure from active live layers.
8. Use the shared mode helper in generator, War Room, API-mode injection, and profile mode notes.
9. Neutralize ghost pseudo-elements in the active cleanup CSS only.
10. Verify via parse checks, served-shell probes, and code-level behavior tracing.

## Rollback strategy
- Restore the backed-up file set from `backups/surgical-20260421-215630/`.
- Roll back file-by-file only; do not hard reset the worktree.
- Leave `server.js` and routing untouched in this pass.

## Files to modify
- `index.html`
- `studio_pulse_v395.js`
- `assets/shelf_fix_v10.js`
- `assets/v398_stability_patch.js`
- `assets/v399_legacy_solidify.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/v398_cleanup_patch3.css`
- `assets/v398_cleanup_patch5.css`
- `assets/v399_polish_final.js`
- `assets/v399_final_stability_pass.js`
- `assets/v399_touchup_pass3.js`
- `assets/v399_polish_pass4.js`

## Files to leave untouched
- `server.js`
- `public/index.html`
- `public/js/app.js`
- dormant non-loaded legacy files
- existing backup snapshots outside the surgical snapshot

## Verification plan
- Parse-check every edited JS file.
- Parse-check every inline script in `index.html`.
- Start the local server and fetch `/`.
- Confirm `/` still serves repo-root `index.html`.
- Confirm `/legacy` remains unmapped and `public/index.html` is still statically reachable.
- Confirm served HTML shows `v3.9.9` in title, logo subtext, footer, and active script stack.
- Confirm source markup for Aisha, Leah, Claudia, Grok, and Vanya uses the same hero wrapper structure.
- Confirm Home source owner is `renderHomesV12()` and late Home binders stand down when that owner is active.

## 2026-04-25 Provider Persistence And V3 Completion Slice

### Exact scope
1. Make Studio Pulse fallback keys durable across:
   - Pulse inline key panel
   - Provider Shell / Settings page
   - localhost refreshes
   - backend state export/summary
2. Eliminate the `file://` versus `localhost` runtime split for the live shell.
3. Refresh the V3 documents so they reflect the current real blockers instead of the earlier repair-only state.

### Files to modify in this slice
- `index.html`
- `studio_pulse_v395.js`
- `assets/shelf_fix_v10.js`
- `AUDIT_REPORT.md`
- `IMPLEMENTATION_PLAN.md`
- `CHANGELOG.md`
- `FINAL_VERIFICATION.md`

### Provider persistence plan
1. Read provider settings from:
   - live provider storage
   - backup provider storage
   - `STATE.providerSettings`
2. Save provider settings to:
   - primary provider localStorage
   - backup provider localStorage
   - `STATE.providerSettings`
   - immediate backend state sync when on localhost
3. Keep Pulse request-time behavior unchanged:
   - Studio Pulse still sends `providerConfig: loadProviderShell()`
   - backend still tries active Pulse keys in order

### Runtime split plan
1. Detect `file:///.../index.html` boot.
2. Redirect that shell to `http://127.0.0.1:3225/` so the live app does not fork into a second fake runtime with different storage.

### Remaining true V3 blockers after this slice
- real persisted `gallery` depth
- real persisted `plannerPosts` depth
- real persisted `reviewEvents` depth
- Aisha missing from durable `character_state`
- final Home System continuity-anchor exit verification

## 2026-04-25 Durable Recovery And Exit Slice

### Exact scope
1. Repair the backend migration payload so `personhood.liveState` is never empty when the app knows about the five live characters.
2. Fix the open-council/runtime room-order arrays so Aisha is included everywhere the live room is enumerated.
3. Create a labeled durable recovery baseline for gallery, planner, and review artifacts when prompt corpus exists but the artifact arrays are still empty.
4. Restore Home System continuity-anchor row structure inside the cleaned layout so the exit smoke path can validate it again.
5. Refresh the final V3 verification docs with the new actual counts and remaining risks.

### Files to modify in this slice
- `index.html`
- `assets/shelf_fix_v10.js`
- `AUDIT_REPORT.md`
- `IMPLEMENTATION_PLAN.md`
- `CHANGELOG.md`
- `FINAL_VERIFICATION.md`

### Execution order
1. Back up the touched files to `backups/surgical-20260425-160500-v3-blockers/`.
2. Add payload helpers in `index.html`:
   - `buildSilvaSeedLiveState(payload)`
   - `seedSilvaRecoveryArtifacts(payload)`
3. Route `buildBackendStatePayload()` through those helpers before migration.
4. Patch all remaining live room-order arrays to include `aisha`.
5. Restore `.alpha-home-continuity .home-row` output inside `assets/shelf_fix_v10.js`.
6. Run a direct SQLite recovery migration once so the repaired payload logic actually lands non-thin durable records.
7. Re-measure counts and update the verification documents honestly.

### Rollback strategy
- Restore the file backups from `backups/surgical-20260425-160500-v3-blockers/`.
- Remove the recovery-seed rows from SQLite by filtering `lineageSource = legacy_recovery_seed` if the user wants to roll the baseline back out.

### Expected exit condition after this slice
- `gallery`, `plannerPosts`, and `reviewEvents` are no longer zero.
- Aisha exists in durable `character_state`.
- Home System source emits continuity rows again.
- Final V3 still requires a live localhost/browser pass to mark the runtime barrier fully complete.

## 2026-04-25 Studio Pulse Final Stabilization Slice

### Exact scope
1. Restore one coherent message visual language in the open council workspace.
2. Make the thread behave like a locked chat lane instead of a mixed response panel/page scroll.
3. Reduce stiff room-meta behavior for lighter social turns.
4. Keep one active thread path coherent by committing finished sequence messages back into the same thread store.
5. Preserve route compatibility and avoid a shell rewrite.

### Files to modify in this slice
- `studio_pulse_v395.js`
- `routes/studio.js`
- `lib/studio/prompt.js`
- `lib/studio/fallback.js`
- `CHANGELOG.md`
- `FINAL_VERIFICATION.md`
- `AUDIT_REPORT.md`
- `index.html`

### Execution order
1. Back up the live Pulse files to `backups/surgical-20260425-211405-pulse-final-stabilize/`.
2. Unify character message rendering around the better pulse-spine shell.
3. Rebuild the thread stage into:
   - internal scroll lane
   - fixed composer dock
4. Move the thinking indicator inline and remove the detached status note.
5. Commit completed sequence messages into the same thread state used for history.
6. Reduce response header/meta noise for casual / banter turns.
7. Trim heavy tuning/tree payload from normal `/api/studio/pulse` frontend responses.
8. Cache-bust the live Pulse bundle in `index.html`.

### Expected result
- Character messages visually match one another again.
- The thread feels like a room conversation instead of mixed UI metaphors.
- Casual prompts can produce a lighter, livelier team chat.
- Refresh/load continuity is less fragile because live and committed thread content use the same store.
