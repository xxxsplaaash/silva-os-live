# A.I.S.H.A. Pack 2.2 — Validated Baseline

**Tag:** `aisha-pack2-2-green`
**Date:** `2026-04-18`
**Branch:** `pack2-2-note-lifecycle-policy`
**Base:** `aisha-pack2-1-green`

## Scope

Pack 2.2 introduces deterministic note lifecycle transitions and offline archive policy so the note store can grow without polluting active retrieval, review flow, or operator visibility.

## Lifecycle Policy Thresholds

Archive rules are evaluated against the immutable `updatedAt` fallback sequence:

- **SUPERSEDED: 30 days** — preserves near-term continuity history, then archives cold superseded notes
- **REJECTED: 7 days** — preserves short operator audit window, then archives explicitly rejected notes
- **STALE_NEEDS_REVIEW: 21 days** — archives long-unresolved notes stuck in `needs_review`

## Bounded Archive Behavior

Archived notes remain auditable through offline export and do not silently disappear, but they no longer clutter active operations or normal live-context behavior.

## Files Changed

- `src/memory/noteLifecyclePolicy.ts` — [NEW] deterministic archive-eligibility rules and archive manifest export
- `src/eval/t18NoteLifecycleFixtures.ts` — [NEW] lifecycle boundary and manifest tests
- `src/eval/runT18NoteLifecycleFixtures.ts` — [NEW] T18 runner

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T18 Note Lifecycle | 5 | 0 |
| T17 Session Review | 4 | 0 |
| T16 Calibration | 4 | 0 |
| T15 Real-Session Eval | 5 | 0 |
| T14 Extraction Coverage | 18 | 0 |
| T13 Visible Continuity | 13 | 0 |
| T12 Relationship Gating + Audit | 13 | 0 |
| T11 Persisted Reconsolidation | 7 | 0 |
| T10 Live Critic Loop | 5 | 0 |
| T9 Relationship Gating | 4 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| T7 Critic Loop | 7 | 0 |
| T61 Provenance | 7 | 0 |
| T6 Extraction | 3 | 0 |
| Integration | 2 | 0 |
| Default Fixtures | 38 | 0 |
| **Total** | **142** | **0** |
