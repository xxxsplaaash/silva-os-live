# A.I.S.H.A. Pack 1.4 — Validated Baseline

**Tag:** `aisha-pack1-4-green`
**Date:** 2026-04-18
**Branch:** `pack1-4-live-critic`
**Base:** `move1-live-generator-green`

## Scope

Pack 1.4 activates the bounded critic loop on the live generator path in `buildProductionRuntime`.

## Invariants

- Critic runs sync, before `journal.commit()`
- `MAX_CRITIC_CYCLES = 2` hard cap — not configurable
- Targeted re-retrieval only — `targetNoteIds` always populated; `threshold_coherence_failure` never triggers `buildTargeted`
- Turn is never aborted when max cycles hit — `finalText` is always committed
- `contextBuilder.build(currentRetrieval)` is called for every regen cycle — never blank context
- No associative retrieval; no LLM extraction expansion
- `pack1-4-live-critic` does not touch `main` or `pack1-3`

## Files Changed

- `src/runtime/criticLoop.ts` — Added `IContextBuilder` to imports and `BoundedCriticLoopDeps`; replaced hardcoded empty `memoryContext` in regen with `contextBuilder.build(currentRetrieval)`.
- `src/runtime/runtimeBuilder.ts` — Imported `BoundedCriticLoop`; wired `criticLoop: new BoundedCriticLoop({ retrievalPlanner, generator, contextBuilder })` in `buildProductionRuntime`.
- `src/eval/t7CriticLoopFixtures.ts` — Added `MockContextBuilder`; added `contextBuilder` to all 6 `BoundedCriticLoop` instantiations.
- `src/eval/t10LiveCriticFixtures.ts` — [NEW] 5 fixtures: clean pass, contextBuilder called on regen, max cycles = 2, turn not aborted at cap, no associative retrieval.
- `src/eval/runT10LiveCriticFixtures.ts` — [NEW] Runner for T10 suite.

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T10 Live Critic Loop | 5 | 0 |
| T7 Critic Loop (regression) | 7 | 0 |
| T61 Provenance & Memory-Strength | 7 | 0 |
| T9 Relationship Gating | 4 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| T6 Extraction | 3 | 0 |
| Integration (T4, T5) | 2 | 0 |
| Default Fixtures | 13 | 0 |
| **Total** | **48** | **0** |
