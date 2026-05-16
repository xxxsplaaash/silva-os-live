# AI Division v3 Execution Backlog

## Purpose

This backlog translates the v3 stabilization program into concrete execution tracks grounded in the current live runtime. It is designed to keep implementation surgical, reversible, and traceable.

This is not a rewrite plan. It is a controlled stabilization backlog for the live legacy shell.

## Working assumptions

- The live product remains the repo-root shell served at `/`.
- The runtime is currently owned primarily by:
  - `index.html`
  - `studio_pulse_v395.js`
  - `assets/shelf_fix_v10.js`
  - selected active stabilization layers under `assets/`
- The worktree is already dirty, so every task below must avoid reverting unrelated changes.
- `server.js` should remain untouched unless a later blocker proves route or backend mounting is part of the issue.

## Runtime owner map

### Core runtime shell

- `index.html`
  - base navigation
  - page shells
  - base `STATE`
  - base `loadState()` / `saveState()`
  - base `nav()`
  - generator, planner, gallery, assets, character page rendering

### Studio Pulse owner

- `studio_pulse_v395.js`
  - `page-home` ownership
  - Studio Pulse local state
  - `/api/studio/pulse` integration
  - legacy Home System ownership remnants that must stay bounded

### Home System / provider / settings owner

- `assets/shelf_fix_v10.js`
  - `renderHomesV12()`
  - Home System UI ownership
  - provider shell
  - settings shell

### Active stabilization / behavior layers

- `assets/v398_stability_patch.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/v399_legacy_solidify.js`
- `assets/v399_polish_final.js`
- `assets/v399_final_stability_pass.js`
- `assets/v399_touchup_pass3.js`
- `assets/v399_polish_pass4.js`

### Thin backend and persistence

- `routes/studio.js`
- `routes/prompts.js`
- `routes/gallery.js`
- `routes/planner.js`
- `routes/state.js`
- `db/sqlite.js`
- `db/init.sql`
- `lib/studio/systemContext.js`
- `lib/studio/prompt.js`
- `lib/studio/fallback.js`

## No-touch or avoid-by-default areas

These should stay untouched unless a backlog item explicitly requires them:

- `server.js`
- `public/index.html`
- `public/js/app.js`
- dormant legacy scripts not loaded by the live shell
- experimental/disconnected Supabase route path unless explicitly activated
- package metadata and lockfiles unless a real dependency change is required

## Owner lanes

Because this repo is effectively one live product with mixed concerns, execution should be assigned by responsibility lane, not by arbitrary file grouping.

### Lane A: Product boundary and information architecture

Owns:

- surface classification
- navigation hierarchy
- module maturity labeling
- core vs support vs system separation

### Lane B: Runtime and state discipline

Owns:

- source-of-truth policy
- state ownership
- artifact contracts
- persistence boundaries
- duplication removal

### Lane C: Studio Pulse

Owns:

- direction flow
- review pressure
- next-action logic
- operational summaries
- Studio Pulse prompt and backend context

### Lane D: Character, identity, and continuity

Owns:

- character profiles
- identity lock
- reference assets
- continuity/home context
- mode consequences

### Lane E: UX and shell discipline

Owns:

- component consistency
- visible hierarchy
- density reduction
- system/admin demotion
- runtime page ownership clarity

## Phase 0: Stabilization contract

### Objective

Lock scope and stop the live runtime from accumulating more ambiguity while stabilization is underway.

### Owner

Lane A + Lane B

### Primary files

- [AI_DIVISION_V3_STABILIZATION_PROGRAM.md](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/AI_DIVISION_V3_STABILIZATION_PROGRAM.md)
- [AI_DIVISION_V3_EXECUTION_BACKLOG.md](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/AI_DIVISION_V3_EXECUTION_BACKLOG.md)

### Tasks

1. Freeze the definition of `core`, `support`, `system`, and `experimental` surfaces.
2. Freeze the list of live owner files allowed to change during stabilization.
3. Freeze the list of avoid-by-default files.
4. Define acceptance criteria for “v3 stabilized.”

### Acceptance criteria

- There is a written contract for what v3 is allowed to solve.
- No new first-class module gets added without classification.
- Implementation can be evaluated against a stable scope.

## Phase 1: Product hierarchy reset

### Objective

Make the live product’s navigation and page hierarchy reflect real operational priority instead of historical patch order.

### Owner

Lane A + Lane E

### Primary files

- `index.html`
- `studio_pulse_v395.js`
- `assets/shelf_fix_v10.js`
- active nav-shaping stabilization layers if needed:
  - `assets/v398_stability_patch.js`
  - `assets/v399_legacy_polish_pass3.js`

### Tasks

1. Reclassify live surfaces into:
   - `core`
   - `support`
   - `system`
2. Demote Team / Providers / Analytics / Dev/Admin out of flat parity with core workflow.
3. Collapse or relabel Workflow SOP / Ideas / Campaigns where they currently overstate separation.
4. Standardize the role of Studio Pulse as the primary direction surface.
5. Remove stale naming drift between “Command Center” and “Studio Pulse.”

### Acceptance criteria

- Core workflow surfaces are visually and structurally primary.
- Support and system surfaces are clearly secondary.
- A new operator can identify the main path without explanation.
- No nav item implies maturity it does not have.

### Risks

- Multiple active nav patchers may fight the new structure.
- Late-loaded patches may reinsert items unless neutralized cleanly.

## Phase 2: Source-of-truth contract

### Objective

Define authoritative ownership for the live product’s core artifacts.

### Owner

Lane B

### Primary files

- `index.html`
- `routes/state.js`
- `db/sqlite.js`
- `db/init.sql`
- `routes/prompts.js`
- `routes/gallery.js`
- `routes/planner.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/v399_legacy_solidify.js`

### Tasks

1. Define the v3 owner for:
   - prompts
   - outputs
   - planner items
   - character state
   - identity assets
   - continuity/home data
   - review events
2. Decide what remains local-first in v3 and what becomes persisted first.
3. Remove silent dual ownership where localStorage and runtime overlays both act as live truth.
4. Introduce explicit artifact contracts for anything the UI treats as durable.

### Acceptance criteria

- Every core artifact answers “where does this live?” clearly.
- The system can describe what is client-owned, db-owned, or mirrored.
- New stabilization work stops adding state ad hoc.

### Risks

- Existing runtime behavior depends on permissive local state merging.
- Tightening ownership too aggressively can break legacy assumptions.

## Phase 3: Workflow closure and lineage

### Objective

Turn the product from adjacent modules into one compounding workflow.

### Owner

Lane B + Lane C + Lane D

### Primary files

- `index.html`
- `routes/prompts.js`
- `routes/gallery.js`
- `routes/planner.js`
- `routes/state.js`
- `db/sqlite.js`
- `db/init.sql`

### Tasks

1. Introduce explicit prompt-to-output linkage.
2. Introduce explicit output-to-review linkage.
3. Introduce explicit review-to-planner and review-to-campaign implications.
4. Make output review influence future prompt or continuity decisions.
5. Surface lineage visibly in the relevant core pages.

### Acceptance criteria

- Prompts do not exist in isolation.
- Gallery items do not exist in isolation.
- Review becomes a real system object, not just visual interpretation.
- Planning is downstream from actual work history.

### Risks

- The current schema does not yet carry all relationship types.
- UI assumptions may need phased introduction rather than one cutover.

## Phase 4: Studio Pulse operating upgrade

### Objective

Make Studio Pulse the true operating surface for v3.

### Owner

Lane C

### Primary files

- `studio_pulse_v395.js`
- `routes/studio.js`
- `lib/studio/systemContext.js`
- `lib/studio/prompt.js`
- `lib/studio/fallback.js`
- `index.html`
- `assets/v399_legacy_polish_pass3.js`

### Tasks

1. Reframe Studio Pulse around:
   - direction
   - review pressure
   - next action
   - continuity warnings
   - work-state summary
2. Tie responses to real counts, review debt, and continuity coverage.
3. Reduce performative response patterns that are not grounded in system truth.
4. Make Studio Pulse route operators to the right page or action.

### Acceptance criteria

- Studio Pulse feels operational, not decorative.
- Operators can use it to decide what to do next.
- Backend context and frontend expectations align.

### Risks

- Prompt framing currently overstates system maturity in places.
- Current backend data context is still thin.

## Phase 5: Character, identity, and continuity hardening

### Objective

Turn the product’s strongest concept into consistent operational value.

### Owner

Lane D

### Primary files

- `index.html`
- `assets/v398_stability_patch.js`
- `assets/v399_legacy_solidify.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/shelf_fix_v10.js`

### Tasks

1. Make every character operationally consistent:
   - stable profile
   - identity locks
   - reference assets
   - continuity anchors
   - specialist role
2. Narrow Home System to environment and object continuity that improves output quality.
3. Make mode selections have real, traceable consequences.
4. Remove continuity clutter that does not help generation or review.

### Acceptance criteria

- Character modules feel useful, not ornamental.
- Identity lock reduces drift in real workflows.
- Continuity is selective and relevant, not noisy.

### Risks

- Current data structures for characters and continuity are patch-grown.
- Aisha and injected character layers historically behave differently from the base pages.

## Phase 6: UI hierarchy and shell discipline

### Objective

Make the live shell look and behave like one deliberate product.

### Owner

Lane E

### Primary files

- `index.html`
- active loaded CSS layers under `assets/`
- active loaded UI stabilization layers under `assets/`

### Tasks

1. Standardize component hierarchy on core pages.
2. Remove density and decorative noise that hides primary work.
3. Demote system/admin visual prominence.
4. Reduce page-level ownership overlap.
5. Normalize behavior and layout where core surfaces still feel stitched together.

### Acceptance criteria

- Core pages feel calm and authoritative.
- Visual consistency reflects actual page priority.
- The shell reads as one product, not one base plus many overrides.

### Risks

- Cosmetic cleanup without ownership cleanup will not hold.
- Too much visual change at once can mask real structural regressions.

## File-level implementation tracks

## Track A: Core shell and navigation

### Files

- `index.html`
- `studio_pulse_v395.js`
- `assets/shelf_fix_v10.js`

### Responsibilities

- surface hierarchy
- page ownership
- nav logic
- shared runtime boundaries

### Notes

This is the highest-risk track because it affects the live shell directly. Changes here should be small, explicit, and verified immediately.

## Track B: Active stabilization layer cleanup

### Files

- `assets/v398_stability_patch.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/v399_legacy_solidify.js`
- `assets/v399_polish_final.js`
- `assets/v399_final_stability_pass.js`
- `assets/v399_touchup_pass3.js`
- `assets/v399_polish_pass4.js`

### Responsibilities

- neutralize duplicate owners
- remove decorative overrides that fight core ownership
- keep only the layers that still serve the stabilized product

### Notes

This track should be driven by owner clarity, not by age. A newer patch is not automatically better, and an older patch is not automatically dead.

## Track C: Artifact contracts and persistence

### Files

- `routes/prompts.js`
- `routes/gallery.js`
- `routes/planner.js`
- `routes/state.js`
- `db/sqlite.js`
- `db/init.sql`

### Responsibilities

- artifact ownership
- lineage storage
- export/migrate boundaries
- explicit persistence rules

### Notes

This is the track that turns v3 from “smart shell” into a compounding tool.

## Track D: Studio Pulse operating logic

### Files

- `studio_pulse_v395.js`
- `routes/studio.js`
- `lib/studio/systemContext.js`
- `lib/studio/prompt.js`
- `lib/studio/fallback.js`

### Responsibilities

- guidance quality
- next-action logic
- review awareness
- continuity awareness
- operator trust

### Notes

Studio Pulse should become more useful, not more theatrical.

## Track E: Character and continuity systems

### Files

- `index.html`
- `assets/v398_stability_patch.js`
- `assets/v399_legacy_solidify.js`
- `assets/v399_legacy_polish_pass3.js`
- `assets/shelf_fix_v10.js`

### Responsibilities

- identity lock
- mode behavior
- continuity support
- character consistency

### Notes

This is the most differentiated product track. It should be protected from casual bloat.

## Recommended first implementation slice

### Slice name

**Surface hierarchy and owner boundary pass**

### Why this first

This is the safest high-leverage first slice because it improves clarity without forcing an immediate data-model cutover. It also creates better conditions for every later stabilization task.

### Scope

1. Classify live surfaces into core, support, and system.
2. Demote system surfaces out of flat parity in the live nav.
3. Standardize Studio Pulse as the singular primary direction surface.
4. Neutralize obvious nav duplication or naming drift in active patch layers.

### Target files

- `index.html`
- `studio_pulse_v395.js`
- `assets/shelf_fix_v10.js`
- if required only after validation:
  - `assets/v398_stability_patch.js`
  - `assets/v399_legacy_polish_pass3.js`

### Do not include in slice 1

- schema redesign
- persistence migration
- deep Studio Pulse backend changes
- broad visual redesign
- Home System logic rewrite

### Slice 1 acceptance criteria

- The live nav reads as a deliberate product hierarchy.
- Studio Pulse is clearly the lead surface.
- Support and system areas no longer compete with primary work.
- No page is broken by the owner-boundary cleanup.

## Explicit stay-untouched list for the first slice

- `server.js`
- `routes/studio.js`
- `db/sqlite.js`
- `db/init.sql`
- `public/index.html`
- `public/js/app.js`

## Decision after backlog

The backlog is now concrete enough to begin implementation. The recommended next move is to execute the first slice only, verify it, then continue into the source-of-truth and workflow-closure tracks.
