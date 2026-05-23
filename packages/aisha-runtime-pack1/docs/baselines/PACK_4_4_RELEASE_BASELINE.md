# Pack 4.4 Release Baseline

## Goal
Establish a formal regression matrix and baseline lock for the A.I.S.H.A. Pack 4 core architecture additions prior to operational ops unblock or any further functional arcs.

## Pack 4.1: Ungrounded Claim Critic
- **Behavior**: The `findUngroundedClaims` critic detects generative output that asserts facts about the user's state/preferences (e.g., "I remember") but lacks a grounding anchor in the retrieval bundle's `normalizedValue` or `canonicalText`.
- **Constraint**: This is a strict session-level finding (`affectedNoteId: undefined`). It explicitly prevents re-retrieval cycles to avoid infinite looping on fabricated memory.
- **Locked Evidence**: `t50UngroundedClaimFixtures.ts` (7/7 pass).

## Pack 4.2: Reconsolidation Signal Frequency Persistence
- **Behavior**: The `deriveGatedRetrievalSignals` logic mitigates reactive reconsolidation noise. Soft signals ("retrieved weak/stale note") increment a `reconsolidationSignalCount` but do not escalate to `needs_review` until reaching `SOFT_SIGNAL_ESCALATION_THRESHOLD` (2).
- **Constraint**: The `reconsolidationSignalCount` is a migration-safe optional field. Direct contradictions (`contradiction_sensitive_lower_support`) bypass this frequency gate and escalate immediately.
- **Locked Evidence**: `t51ReconsolidationFrequencyFixtures.ts` (7/7 pass).

## Pack 4.3: Architecture Decision
The architecture review established that Arc A (Critic) and Arc C (Reconsolidation Frequency) are complete. Arc B (Semantic Calibration Hardening) remains deferred due to lack of live session data. Pack 4.4 was selected to solidify this new architecture.

## Current State
- The system is baseline-locked at **Pack 4.4**.
- `runPack44ReleaseBaseline.ts` defines the definitive regression matrix.
- The interaction between the critic (Arc A) and reconsolidation (Arc C) has been formally evaluated via `t53Pack44CombinedInteractionFixtures.ts`.

## Allowed Next Steps
- **Pack 3.19 Live Shadow Ops Unblock**: Ops is authorized to retry live shadow evidence collection (Pack 3.19b runbook) using the hardened Pack 4.4 runtime.
- **Pack 4.5 Semantic State Calibration Hardening**: Only if live session data becomes available.

## Strictly Denied
- **No live shadow claims**: All tests remain deterministic. We do not claim live session data exists.
- **No retrieval promotion**: Associative and trace lanes remain shadowed.
- **No trace consumption promotion**: Traces must not enter the context window.
- **No product-facing behavior**: No UI/API endpoints for new features without architecture gates.

## Release Matrix Commands
To execute the definitive Pack 4.4 regression matrix, run:
```bash
npx tsx src/eval/runPack44ReleaseBaseline.ts
```
