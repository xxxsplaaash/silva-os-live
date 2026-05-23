# A.I.S.H.A. Pack 1.6 — Validated Baseline

**Tag:** `aisha-pack1-6-green`
**Date:** 2026-04-18
**Branch:** `pack1-6-relationship-gating-audit`
**Base:** `aisha-pack1-5-green`

## Scope

Pack 1.6 extends relationship-gated note acceptance and formalizes operator audit trail coverage.

## New Invariants

- `trust < 0` OR `caution > 0.7` triggers soft gate → `needs_review` + audit event
- Gating reason is machine-readable: `relationship_trust_gated` or `relationship_caution_gated`
- When both conditions trigger, trust takes precedence in the stored reason
- `trust = 0` exactly → NOT gated (gate is strictly `< 0`)
- `caution = 0.7` exactly → NOT gated (caution gate is strictly `> 0.7`)
- `auditTrail` appends; no existing entry is overwritten
- `relationship_gated` audit event includes the numeric value that triggered gating
- `operator_approved` clears gating → `review_state: accepted, mode: allow`
- `operator_rejected` → `mode: block_auto_reinfer`; note is invisible to `listActiveNotes`
- Superseded prior note's `reinferencePolicy` is unaffected by the new note's gating context
- Reinforce path (same meaning) does not append audit events to existing note
- `deriveCombinedReviewSignals` deduplicates signals by note ID; contradiction signal wins over stale if both apply to the same note

## Bug Fixes Included

- **T5 `trustDecreased` non-determinism**: `integrationFixtures.ts` assertion changed to `trustLessThan: 0` to avoid non-deterministic snapshot ordering when turns share the same `createdAt` millisecond.
- **`deriveCombinedReviewSignals` duplicate signals**: contradiction and stale signals for the same note were both emitted; FixtureNoteVersioning would then overwrite the contradiction reason with the stale reason. Fixed by filtering stale signals whose note is already covered by a contradiction signal.

## Files Changed

- `src/memory/noteVersioning.ts` — caution-based gating (`caution > 0.7`); named threshold constants; `reinferencePolicy.reason` now distinguishes `relationship_trust_gated` from `relationship_caution_gated`; audit reason includes numeric value
- `src/memory/reactiveReconsolidation.ts` — `deriveCombinedReviewSignals` deduplicates by note ID; higher-priority contradiction signal excludes same note from stale signal list
- `src/eval/integrationFixtures.ts` — T5 assertion fixed: `trustDecreased` → `trustLessThan: 0`
- `src/eval/t12RelationshipGatingAuditFixtures.ts` — [NEW] 13 deterministic fixtures
- `src/eval/runT12RelationshipGatingAuditFixtures.ts` — [NEW] runner

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T12 Relationship Gating + Audit | 13 | 0 |
| T11 Persisted Reconsolidation | 7 | 0 |
| T10 Live Critic Loop | 5 | 0 |
| T9 Relationship Gating (existing) | 4 | 0 |
| T7 Critic Loop | 7 | 0 |
| T61 Provenance & Memory-Strength | 7 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| T6 Extraction | 3 | 0 |
| Integration (T4, T5) | 2 | 0 |
| Default Fixtures | 38 | 0 |
| **Total** | **63** | **0** |
