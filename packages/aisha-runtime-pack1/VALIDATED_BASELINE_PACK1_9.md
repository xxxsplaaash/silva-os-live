# A.I.S.H.A. Pack 1.9 — Validated Baseline

**Tag:** `aisha-pack1-9-green`
**Date:** `2026-04-18`
**Branch:** `pack1-9-real-session-eval`
**Base:** `aisha-pack1-8-green`

## Scope

Pack 1.9 implements a real-session evaluation layer and calibration scaffolding entirely offline without modifying or widening the live runtime hot paths.

## New Invariants

- **Session-Audit Schema**: maps retrieved operational data (`turns`, `notesBefore`, `notesAfter`) into proxy evaluation score metrics (`SessionCalibrationMetrics`)
- **Pure Computation Scaffolding**: heuristically models extraction recall proxy, note precision proxy, visible continuity proxy, gating appropriateness, and prompt-bloat evaluation outside the core loop logic
- **Markdown Export Automation**: generates inspectable offline state-audit reports for targeted session review
- **Strict Evaluator Separation**: does not invoke `generate()` or predictive LLM behavior, ensuring metrics run uniformly and fast against historical fixtures

## Files Added

- `src/eval/sessionAuditScorer.ts` — [NEW] metric calculation logic and schema
- `src/eval/t15RealSessionEvalFixtures.ts` — [NEW] deterministic validation scenarios for calibration proxy math
- `src/eval/runT15RealSessionEvalFixtures.ts` — [NEW] T15 runner

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T15 Real-Session Eval | 5 | 0 |
| T14 Extraction Coverage | 18 | 0 |
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
| **Total** | **129** | **0** |
