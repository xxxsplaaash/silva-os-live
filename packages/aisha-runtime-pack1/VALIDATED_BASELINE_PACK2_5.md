# A.I.S.H.A. Pack 2.5 — Validated Baseline

**Tag:** `aisha-pack2-5-green`
**Date:** `2026-04-18`
**Branch:** `pack2-5-critic-effectiveness-measurement`
**Base:** `aisha-pack2-4-green`

## Scope

Pack 2.5 adds bounded runtime-side critic measurement artifacts and a stricter offline evaluation layer so critic usefulness can be judged against real cost rather than assumed from text churn.

## Measurement Guarantees

- critic measurement artifacts are staged during `processTurn`
- artifact payload includes:
  - pre-revision text
  - post-revision text
  - cycle count
  - max-cycles-hit flag
  - re-retrieval flag
  - critic findings
  - fire-time active-note snapshot
  - shaping-envelope summary
- strict usefulness scoring operates against fire-time note state, not session-end mutation
- latency tax is averaged across all turns, not only fired turns
- report output remains bounded and deterministic

## Files Changed

- `src/runtime/runtime_types.ts` — added `critic_measurement` artifact kind
- `src/runtime/processTurn.ts` — stages bounded critic measurement payloads during critic completion
- `src/eval/criticEffectivenessMeasurement.ts` — strict offline evaluator for critic cost/benefit
- `src/eval/t21CriticEffectivenessFixtures.ts` — T21 fixture coverage for strict critic measurement
- `src/eval/runT21CriticEffectivenessFixtures.ts` — T21 runner

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T21 Strict Critic Measurement | 5 | 0 |
| T20 Review Queue Triage | 6 | 0 |
| T19 Archive Review Integration | 2 | 0 |
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
| **Total** | **155** | **0** |
