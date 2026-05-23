# Pack 4.3 Architecture Review & Next-Arc Decision

## Goal
Summarise the outcomes of the first two implementation arcs in Pack 4, review remaining deferred work, and select the next immediate architectural arc for A.I.S.H.A.

## Pack 4 Accomplishments

### Pack 4.1: Ungrounded Claim Critic
- **Implementation**: Added deterministic `ungrounded_claim` detection in the bounded critic loop (`findUngroundedClaims`).
- **Mechanism**: Splits output into sentences, filters for memory-assertion patterns (e.g. "I remember", "you prefer"), and flags sentences >= 4 tokens that lack a grounding anchor (substring match on `normalizedValue` or `canonicalText`) in the retrieval bundle.
- **Runtime Impact**: This is a pure session-level finding. It explicitly triggers **no re-retrieval** cycles (no `affectedNoteId`), preventing infinite loops on fabricated text.
- **Status**: Complete, conservative, deterministic.

### Pack 4.2: Reconsolidation Signal Frequency Persistence
- **Implementation**: Added frequency-gated escalation for reactive reconsolidation.
- **Mechanism**: Introduced an optional, migration-safe `reconsolidationSignalCount` field on `NoteRecord`. Soft signals ("stale/weak") now emit `soft_signal_increment` until they reach `SOFT_SIGNAL_ESCALATION_THRESHOLD` (2). On the second signal, they emit `retrieved_weak_stale_note` to trigger a `needs_review` escalation.
- **Runtime Impact**: Prevents "review storms" from isolated noise, requiring repeated observed soft signals before escalation. Direct contradictions bypass this gate and escalate immediately via contradiction bypass.
- **Status**: Complete, bounded, mathematically stable.

## Deferred Items
The following architectural gaps remain from Pack 3 and Pack 4.0 planning:
1. **Semantic State Calibration Hardening**: Deferred (Pack 4.0 Arc B) due to the lack of live session data for calibration baselines.
2. **Live Shadow Retrieval Promotion**: Denied and blocked (Pack 3.19b) pending live API key and operational entrypoints.
3. **Operational Live Retry**: Pack 3.19 live shadow sample collection runbook requires execution.
4. **Product-Facing Demo Work**: Feature-level UX work remains gated behind architectural maturity.

## Candidate Next Arcs
1. **Pack 4.4 Semantic State Calibration Hardening**: Finalize the expressive envelope tracking logic. (Blocked: requires live baseline data).
2. **Pack 4.4 Critic/Reconsolidation Interaction Eval**: Construct a holistic evaluation suite measuring how ungrounded_claim and reconsolidation frequency gating behave together in multi-turn generative scenarios.
3. **Pack 4.4 Release Baseline / Regression Matrix**: Solidify the entire Pack 4 architecture with a formal regression matrix and system-wide stress test prior to Ops unblock.
4. **Pack 4.4 Product-Facing Continuity Demo Planning**: Design the UI/UX layer for displaying critic findings to operators. (Blocked: premature, violates text-first mandate).

## Recommended Next Arc
**Recommendation**: Proceed with **Pack 4.4 Release Baseline / Regression Matrix**.
With two major new behaviors introduced (critic claim detection, frequency-gated memory), the system must be formally stressed as a holistic unit before moving into operational ops-retry mode or further functional arcs.

## Explicit Non-Goals
This architecture review explicitly enforces the following constraints moving forward:
- **No retrieval promotion**: Associative and trace lanes remain shadowed and denied.
- **No trace consumption promotion**: Traces must not enter the context window.
- **No live shadow claims**: All tests must remain deterministic; do not claim live session data exists.
- **No product-facing behavior**: Do not build UI, APIs, or demonstrations without an explicit architecture gate.
