# AI Division v3 Artifact Contract

This contract freezes live ownership for the current legacy shell so stabilization work stops adding parallel truths.

## Core rule

For v3, the repo-root legacy runtime remains the live owner. Persistence may mirror or export state, but it must not silently replace the runtime truth during normal shell operation unless the runtime explicitly hydrates from it.

## Artifact owners

### Prompts
- Live owner: `STATE.prompts` in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: backend prompt routes and state export
- Rule: frontend runtime owns active prompt state; backend mirrors and exports it

### Outputs / gallery items
- Live owner: `STATE.gallery` in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: gallery routes and state export
- Rule: gallery items must keep prompt and review lineage fields when present

### Review events
- Live owner: `STATE.reviewEvents` in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: `review_events` in [db/init.sql](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/db/init.sql) via [db/sqlite.js](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/db/sqlite.js)
- Rule: review events are first-class lineage objects, not nested feedback blobs

### Planner items
- Live owner: `STATE.plannerPosts` in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: planner routes and state export
- Rule: planner items may carry `reviewEventId`, `promptId`, `campaignId`, and gallery linkage; they are downstream planning objects, not free-floating notes

### Campaigns
- Live owner: `CAMPAIGNS` plus linked planner/prompt/review counts in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: runtime-defined in v3; exported as contract metadata rather than a first-class DB table
- Rule: campaigns are live containers until a stronger persisted contract is introduced; lineage counts must be derived from prompts/planner/reviews, not duplicated ad hoc

### Character state
- Live owner: runtime character identity data in `CHARS`, plus `STATE.teamRecords`, `STATE.currentModes`, and profile-tab state in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Persistence path: latest v3 state snapshot plus optional `personhood.liveState` mirror in [routes/state.js](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/routes/state.js)
- Rule: late patches may seed missing defaults, but must not silently downgrade hydrated runtime truth once the shell has loaded

### Avatar / reference assets
- Live owner: `localStorage['silva_assets_<char>']` plus `STATE.teamRecords[char].avatar`
- Supporting render path: assets/profile rendering in [index.html](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/index.html)
- Export path: latest v3 state snapshot mirrored as `assetRefs` by [/api/state/export](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/routes/state.js)
- Rule: local asset payload is the active visual reference owner; team-record avatar mirrors the selected face reference for display consistency

### Continuity / Home System data
- Live owner: `localStorage['silva_studio_pulse_v395']` and `STATE.homeAssets` / `STATE.homeProfiles` runtime usage
- Primary UI owner: [assets/shelf_fix_v10.js](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/assets/shelf_fix_v10.js)
- Rule: Home System should carry selective continuity anchors only; it is not a second character dossier

### Provider settings
- Live owner: `localStorage['silva_provider_shell_v12']`
- Primary UI owner: [assets/shelf_fix_v10.js](/Users/splaaash/Downloads/work399_hotfix_emergency_before_recover_20260421-183755/assets/shelf_fix_v10.js)
- Export path: latest v3 state snapshot mirrored by `/api/state/export` and `/api/state/summary`
- Rule: provider settings remain shell-local in v3, but export/summary must report the same defaults the frontend is using

## Hydration and merge rules

- Runtime shell state loads first and remains the active interaction layer.
- Persistence/export routes must reflect the same artifact names used by the frontend.
- Export/summary endpoints may read the latest migrated snapshot for runtime-only overlays, but first-class persisted artifacts still come from the DB tables.
- Seeders may add missing defaults, but must not overwrite newer populated objects with older defaults.
- Review, planner, prompt, and campaign linkage fields must be additive and traceable, not recalculated destructively.

## Current non-goals

- This does not make v3 cloud-native.
- This does not make SQLite the sole live owner for every artifact.
- This does not replace the legacy shell with v4 contracts yet.
