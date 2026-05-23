# A.I.S.H.A. Pack 1.7 — Validated Baseline

**Tag:** `aisha-pack1-7-green`
**Date:** `2026-04-18`
**Branch:** `pack1-7-visible-continuity`
**Base:** `aisha-pack1-6-green`

## Scope

Pack 1.7 surfaces supersession continuity legibly in retrieved context. When a note
supersedes a prior truth, the rendered prompt block shows a bounded "was: <prior text>"
annotation inline. Superseded truth is preserved, not deleted. No store writes in the
read/render path.

## New Invariants

- `RetrievalBundle.supersessionContext: Record<string, string>` — populated by retrieval planner, empty when no links exist
- `INoteVersioning.listSupersededByIds(noteIds)` — pure read; returns `{[activeNoteId]: canonicalText}` for notes with `supersedes` links
- On context render, each active note with a supersession entry shows a `  > was: <sanitized prior text>` line
- The "was:" line is bounded by `MAX_NOTE_TEXT_LENGTH` (180 chars); no history essay
- Reinforce (same-meaning merge) does NOT create a `supersedes` link → no "was:" shown
- Source truth (active note `canonicalText`) is never modified by supersession context rendering
- Stale annotation (`|STALE`) and "was:" line can coexist on the same note
- `supersessionContext` is propagated through `overlayRetrievalBundle` unchanged
- `buildTargeted` inherits `supersessionContext` from base bundle via spread

## Files Changed

- `src/memory/types.ts` — `supersessionContext` on `RetrievalBundle`; `supersededPriorText` on `StableNoteView`; `listSupersededByIds` on `INoteVersioning`
- `src/memory/noteVersioning.ts` — `listSupersededByIds` implementation (pure read via `linksById`)
- `src/memory/contextBuilder.ts` — read `supersessionContext` from bundle; render `> was:` inline
- `src/memory/retrievalPlanner.ts` — call `listSupersededByIds` in `build()`, include in bundle
- `src/eval/inMemoryScenarioEnvironment.ts` — `listSupersededByIds` and `operatorReview` in `FixtureNoteVersioning`
- `src/runtime/processTurn.ts` — pass `supersessionContext` through `overlayRetrievalBundle`
- `src/eval/t61ProvenanceFixtures.ts` — add `supersessionContext: {}` to literal bundle objects
- `src/eval/t7CriticLoopFixtures.ts` — add `supersessionContext: {}` to `makeBundle`
- `src/eval/t10LiveCriticFixtures.ts` — add `supersessionContext: {}` to `makeBundle`
- `src/eval/t13VisibleContinuityFixtures.ts` — [NEW] 13 deterministic fixtures
- `src/eval/runT13VisibleContinuityFixtures.ts` — [NEW] runner

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T13 Visible Continuity | 13 | 0 |
| T12 Relationship Gating + Audit | 13 | 0 |
| T11 Persisted Reconsolidation | 7 | 0 |
| T10 Live Critic Loop | 5 | 0 |
| T9 Relationship Gating | 4 | 0 |
| T7 Critic Loop | 7 | 0 |
| T61 Provenance & Memory-Strength | 7 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| T6 Extraction | 3 | 0 |
| Integration (T4, T5) | 2 | 0 |
| Default Fixtures | 38 | 0 |
| **Total** | **76** | **0** |
