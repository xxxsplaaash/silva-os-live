# A.I.S.H.A. Pack 1.8 — Validated Baseline

**Tag:** `aisha-pack1-8-green`
**Date:** 2026-04-18
**Branch:** `pack1-8-extraction-coverage`
**Base:** `aisha-pack1-7-green`

## Scope

Pack 1.8 upgrades extraction coverage in the async note-extraction lane. It introduces three new extraction pattern groups to capture implied and behavior-described preference signals that were previously dropped, strictly in the async lane without altering or widening the hot path latency.

## New Invariants

- **Sentence-based Extraction Loop**: `extract()` processes turns sentence-by-sentence to allow multiple independent disjoint preference expressions while cleanly avoiding overlap mapping to generic patterns.
- **Pattern Groups**:
  - `Group A` (0.78 confidence): Explicit preference (e.g. "I love/hate")
  - `Group B` (0.72 confidence): Behavioral implied preference (e.g. "My go-to is", "I usually get")
  - `Group C` (0.74 confidence): Avoidance implied preference (e.g. "I avoid", "I gave up")
  - `Group D` (0.70 confidence): Behavior-described preference (e.g. "I go for [tea]") — tightly bounded to preference-domain entities
  - `Group E` (0.70 confidence): Profile traits/qualities
- **Coverage without Noise**: New pattern groups accurately capture implied traits without matching pure ephemeral chatter or non-domain behavior statements.
- **Hot-Path Purity**: Improvements execute entirely in the async (reconsolidation/extraction) lane. Hot path `processTurn` speed is unaffected.

## Files Changed

- `src/memory/noteExtractionSandbox.ts` — refactor `extract()` to sentence-iteration loop; introduced group B, C, D heuristic patterns and calibrated confidences down relative to direct explicit signal.
- `src/eval/t14ExtractionCoverageFixtures.ts` — [NEW] 18 deterministic fixtures proving behavioral, avoidance, behavior-desc patterns, deduplication logic, and overlap avoidance.
- `src/eval/runT14ExtractionCoverageFixtures.ts` — [NEW] test runner for T14.

## Test Results

| Suite | Passed | Failed |
|---|---|---|
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
| **Total** | **124** | **0** |
