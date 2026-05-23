# A.I.S.H.A. Pack 1.3 — Validated Baseline

**Tag:** `aisha-pack1-3-green`
**Date:** 2026-04-18
**Base:** `aisha-pack1-2-green`

## Scope

Pack 1.3 implements relationship-gated note acceptance and an operator-visible audit trail.

## Files Changed

- `src/memory/types.ts` — Added `AuditEvent` type; extended `NoteRecord` with `auditTrail: AuditEvent[]`; updated `INoteVersioning` with optional `context` on `mergeOrSupersede` and new `operatorReview` method.
- `src/memory/noteVersioning.ts` — Implemented trust-gated ingestion: `trust < 0` sets `reinferencePolicy.mode = "needs_review"` and appends `relationship_gated` audit event; implemented `operatorReview` with full audit trail and `reviewState` / `reinferencePolicy` transitions.
- `src/runtime/inMemoryAsyncMemoryFollowup.ts` — Added `ISnapshotStore` to deps; resolves `currentSnapshot` before extraction loop; passes `{ trust, caution }` from `expressiveEnvelope` to `mergeOrSupersede`.
- `src/runtime/processTurn.ts` — Propagates `input.timestamp` (or `clock.nowIso()` fallback) as `nowIso` throughout turn artifact construction and trace events.
- `src/runtime/runtime_types.ts` — Added optional `timestamp?: string` to `TurnInput`.
- `src/state/compoundStateEngine.ts` — Implemented time-gated 20% session-boundary decay: applied to `trust` and `tension` only when `sessionId` changes AND time gap exceeds 1 hour.
- `src/eval/inMemoryScenarioEnvironment.ts` — Passed `snapshotStore` to `InMemoryAsyncMemoryFollowup` constructor.
- `src/runtime/runtimeBuilder.ts` — Passed `snapshotStore` to `InMemoryAsyncMemoryFollowup` constructor in production builder.
- `src/eval/assertions.ts` — Included `fallbackReason` in `unexpected_fallback` assertion message.
- `src/eval/t9RelationshipGatingFixtures.ts` — [NEW] 4 deterministic fixtures: high-trust allow, low-trust soften, operator review flow, multi-session drift math.
- `src/eval/runT9RelationshipGatingFixtures.ts` — [NEW] Runner for T9 suite.

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T9 Relationship Gating | 4 | 0 |
| T61 Provenance & Memory-Strength | 7 | 0 |
| T7 Critic Loop | 7 | 0 |
| T8 Multi-Session Truth Metrics | 7 | 0 |
| Integration (T4, T5) | 2 | 0 |
| Default Fixtures | 13 | 0 |
| T6 Extraction | 3 | 0 |
| **Total** | **43** | **0** |

## Invariants Preserved

- No silent note deletion. Rejected notes transition to `reviewState: "rejected"` with `reinferencePolicy.mode: "block_auto_reinfer"`.
- No `Date.now()` in the sync retrieval path.
- No provenance mutation in retrieval.
- Audit trail is note-local only; not a general trace sink.
- Session-boundary decay is deterministic, capped (20%), and time-gated (> 1 hour gap required).
- Critic loop remains opt-in; not activated in this pack.
- All Pack 1.1 and Pack 1.2 regression suites green.
