# A.I.S.H.A. Pack 1.5 — Validated Baseline

**Tag:** `aisha-pack1-5-green`
**Date:** 2026-04-18
**Branch:** `pack1-5-persisted-reconsolidation`
**Base:** `aisha-pack1-4-green`

## Scope

Pack 1.5 makes reactive note review signals durable across turns and sessions.

## Invariants

- Reconsolidation remains reactive: triggered by retrieval or contradiction, never predictive
- Retrieval/read path is pure: no store writes in sync retrieval, no Date.now() mutation in read path
- No silent note deletion: contradiction/supersession history preserved
- `lastReviewedAt` is set only by `persistReviewSignals`; never by the read path
- `deriveCombinedReviewSignals` is the single canonical derivation entry point in the followup
- Budget cap `MAX_RECONSOLIDATION_SIGNALS_PER_TURN = 2` enforced inside `deriveCombinedReviewSignals`
- Priority order preserved: `contradiction_sensitive_lower_support` > `retrieved_weak_stale_note`; lower-priority signal cannot downgrade a higher-priority persisted reason

## Files Changed

- `src/memory/types.ts` — Added `lastReviewedAt?: string` to `NoteRecord`.
- `src/memory/noteVersioning.ts` — Sets `lastReviewedAt: now()` in `persistReviewSignals` when a note transitions to `needs_review`; added `seedNotes()` for direct test seeding.
- `src/runtime/inMemoryAsyncMemoryFollowup.ts` — Replaced manual two-phase signal derivation with `deriveCombinedReviewSignals`; removed redundant `MAX_RECONSOLIDATION_SIGNALS_PER_TURN` re-declaration and `deriveRetrievalReviewSignals` manual budget loop. Contradiction widening logic preserved.
- `src/eval/t11PersistedReconsolidationFixtures.ts` — [NEW] 7 deterministic fixtures.
- `src/eval/runT11PersistedReconsolidationFixtures.ts` — [NEW] Runner.

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T11 Persisted Reconsolidation | 7 | 0 |
| T10 Live Critic Loop | 5 | 0 |
| T9 Relationship Gating | 4 | 0 |
| T7 Critic Loop | 7 | 0 |
| T61 Provenance & Memory-Strength | 7 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| T6 Extraction | 3 | 0 |
| Integration (T4, T5) | 2 | 0 |
| Default Fixtures | 13 | 0 |
| **Total** | **55** | **0** |
