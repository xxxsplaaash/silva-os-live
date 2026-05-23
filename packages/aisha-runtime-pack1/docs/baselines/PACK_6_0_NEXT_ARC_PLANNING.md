# Pack 6.0 — Next Arc Planning Memo

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-04
**Branch**: `pack6-0-next-arc-planning`
**Status**: ACTIVE PLANNING

---

## 1. Current State & Blockers

With the successful closeout of the Pack 5 Continuity Demo, we must systematically evaluate the next legal arc for A.I.S.H.A.

**Current Architectural Posture**:
- **Pack 3**: Baseline-locked.
- **Pack 4**: Static-architecture-locked.
- **Pack 5**: Continuity-demo-locked. The deterministic proof is complete: stable truth established, truth updated, old truth superseded (not deleted) as history, new truth becomes active, and next-turn context utilizes the updated truth.

**Persistent Blockers**:
- **Live Ops Retry**: Remains blocked due to missing `GEMINI_API_KEY` and the absence of a real runtime/session entrypoint.
- **Retrieval Promotion**: Remains denied. Active, trace, associative, and hybrid lanes cannot be promoted to live status.
- **Semantic Calibration**: Remains data-gated pending real shadow collection or verified labeled datasets.

---

## 2. Candidate Arcs

We evaluate the following candidate arcs for implementation:

1. **Live Ops Retry / Real Shadow Collection**: High value, but strictly blocked by missing environment variables and session entrypoints.
2. **Semantic Calibration Planning**: Critical for production fidelity, but hopelessly data-gated without real session evidence.
3. **Product-Facing Continuity Demo UI Planning**: Safely packages the Pack 5 proof into an operator/stakeholder UI layer, using deterministic state without triggering live execution.
4. **Persistence / Release Hardening Planning**: High value, but premature before the continuity interaction loop is fully approved via demo.
5. **Further Memory/Retrieval Architecture Expansion**: Unsafe. Adding complexity before live shadow validation risks divergence from production constraints.

---

## 3. Recommended Direction

**Recommendation**: We strongly recommend **Product-Facing Continuity Demo UI Planning** as the next arc.

**Rationale**:
The Pack 5 continuity proof successfully validated the deterministic logic in isolation. It is now ready to be packaged into a non-runtime demo UI plan. This arc avoids all current blockers:
- It does not require live ops keys.
- It does not require semantic calibration data.
- It leverages the exact deterministic mechanism proven in Pack 5 without risking runtime regression or retrieval promotion.

---

## 4. Demo UI Proof Requirements

The resulting Demo UI design/plan must explicitly surface:
1. **Active truth**: The current, live belief held by A.I.S.H.A.
2. **Superseded historical truth**: The archived prior belief.
3. **Supersession link / provenance**: Visual representation of the transition from the old truth to the new truth.
4. **Next-turn behavior using updated truth**: Validation that context generation honors the updated active truth.
5. **Guardrails**: Explicit UI labels stating this is a deterministic proof, not live production evidence.

---

## 5. Forbidden Claims

The Demo UI plan must strictly adhere to the following forbidden claims. It must NOT claim:
- Production readiness
- Live evidence
- Retrieval promotion
- Consciousness
- Fully autonomous learning
- Semantic calibration

---

## 6. Next Implementation Steps

If approved, the first implementation pack (e.g., Pack 6.1) will strictly focus on non-runtime UI planning and specification documents for the continuity demo dashboard, governed by the constraints listed above.
