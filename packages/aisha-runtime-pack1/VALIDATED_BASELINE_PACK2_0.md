# A.I.S.H.A. Pack 2.0 — Validated Baseline

**Tag:** `aisha-pack2-0-green`
**Date:** `2026-04-18`
**Branch:** `pack2-0-confidence-calibration`
**Base:** `aisha-pack1-9-green`

## Scope

Pack 2.0 implements a real confidence calibration pass. It introduces explicit evidence-aware and status-aware confidence scoring logic decoupled from storage, feeds that into render-time display, and validates all calibration decisions through the Pack 1.9 session-audit scaffolding.

## Calibration Design

Evidence-bonus formula: `calibratedConfidence = extractionConfidenceRaw + evidenceBonus - statusPenalty`

- `evidenceBonus = min(0.15, (sourceEpisodeIds.length - 1) * 0.05)` — rewards repeated independent corroboration
- `statusPenalty` is reason-specific, not a generic decay:
  - `contradiction_sensitive_lower_support` → `-0.20` (heavy: user has directly contradicted this via turn-language)
  - `retrieved_weak_stale_note` → `-0.15` (moderate: time drift without reaffirmation)
  - `relationship_trust_gated` / `relationship_caution_gated` → `-0.10` (operator-bounded gate)
  - generic `needs_review` fallback → `-0.15`

Render-time: notes with `calibratedConfidence < 0.65` emit `|UNCERTAIN`. Superseded prior text emits `> superseded:`.

This design ensures:
- A 3-episode strongly confirmed note (`0.93 raw`) renders at `1.00`
- A contradiction-tagged note (`0.78 raw`) renders at `0.58` and emits `|UNCERTAIN`
- A stale note (`0.76 raw`) renders at `0.61` and emits `|UNCERTAIN`
- A well-evidenced implied preference (`0.72 raw`, 3 episodes) renders at `0.82` — no penalty without cause

## Files Changed

- `src/memory/calibrationSandbox.ts` — [NEW] Pure `calculateCalibratedConfidence()` and `isNoteUncertain()`. No I/O, no `Date.now()`. Read-path safe.
- `src/memory/contextBuilder.ts` — Integrated calibrated confidence and `|UNCERTAIN` into `toStableNoteViews()`; uses `> superseded:` label.
- `src/memory/reactiveReconsolidation.ts` — Updated threshold constants to tighter calibration: stale→7d, weak→0.76, retrieval penalty→0.15, contradiction penalty→0.20.
- `src/eval/t16CalibrationFixtures.ts` — [NEW] 4 fixtures proving evidence bonus math, stale uncertainty triggering, contradiction penalty, and Pack 1.9 audit alignment.
- `src/eval/runT16CalibrationFixtures.ts` — [NEW] T16 runner.
- `src/eval/t13VisibleContinuityFixtures.ts` — Updated assertions to `> superseded:` to match new render label.
- `src/eval/defaultFixtures.ts` — Updated 4 confidence-in-output assertions to calibrated values (0.78→0.88, 0.76→0.86, 0.93→1.00).

## Test Results

| Suite | Passed | Failed |
|---|---|---|
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
| **Total** | **133** | **0** |
