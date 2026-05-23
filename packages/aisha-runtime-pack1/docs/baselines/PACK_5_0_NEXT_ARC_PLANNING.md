# Pack 5.0 Next Arc Planning Memo

## Goal
Decide the next major legal architectural arc after Pack 4 static closeout.

---

## Candidate Arcs

1. **Live Ops Unblock / Real Shadow Retry**
2. **Semantic Calibration Planning**
3. **Product-Facing Contradiction-Aware Continuity Demo Planning**
4. **Release Hardening / Persistence-Readiness Planning**
5. **Further Memory / Retrieval Architecture Expansion**

---

## Why Each Arc Is Blocked or Deprioritized

### Arc 1: Live Ops Unblock / Real Shadow Retry
- **Status: BLOCKED.**
- `GEMINI_API_KEY` is absent from the execution environment (confirmed Pack 4.5).
- No real runtime/session entrypoint exists in the repository.
- live ops blocked by missing live API key and missing real runtime/session entrypoint.
- Cannot proceed without operator environment provisioning.

### Arc 2: Semantic Calibration Planning
- **Status: DATA-GATED.**
- Expressive state calibration requires a real baseline from live sessions or clearly labeled synthetic evaluation data.
- semantic calibration is still data-gated: no verified evidence set exists.
- Planning is allowed only if the data source is clearly labeled.

### Arc 4: Release Hardening / Persistence-Readiness Planning
- **Status: DEFERRED.**
- The Pack 4.4 regression matrix already constitutes a strong release baseline.
- Hardening without a concrete deployment target would be speculative.

### Arc 5: Further Memory / Retrieval Architecture Expansion
- **Status: DENIED.**
- retrieval promotion remains denied. Associative, trace, and hybrid retrieval lanes remain permanently shadowed until live shadow evidence clears the defined success criteria.
- Expanding the retrieval architecture before those lanes are cleared would violate the baseline discipline.

---

## Recommended Next Arc: Arc 3 — Contradiction-Aware Continuity Demo Planning

### Rationale
Arc 3 is the strongest next product-proof move because:
- It requires no live session data.
- It requires no retrieval promotion.
- It is fully implementable with the deterministic Pack 4 baseline.
- It validates the end-to-end truthfulness loop (assertion → contradiction → update → continuity) that is A.I.S.H.A.'s core behavioral claim.
- It produces a tangible, demonstrable output for stakeholder review.

---

## What the Demo Must Prove

1. **User states a stable truth**: A.I.S.H.A. records and stores a high-confidence note about the user's preference/state.
2. **User later contradicts / updates that truth**: The contradiction is detected by the critic loop.
3. **A.I.S.H.A preserves old truth as linked history**: The prior note is archived, not deleted, and is reachable via its audit trail.
4. **A.I.S.H.A updates active truth**: A new, updated note is written with appropriate provenance linking back to the superseded version.
5. **A.I.S.H.A behaves correctly on the next relevant turn**: Subsequent generative output references the updated truth and does not resurface the stale, superseded claim.

---

## What the Demo Must NOT Claim

- Production readiness.
- live retrieval promotion or activation of shadow retrieval lanes.
- Consciousness or intentional belief-updating.
- Real live user evidence as proof.
- Fully autonomous learning capability.

---

## Next Legal Branch Guidance

- **First implementation pack after planning**: `pack5-1-continuity-demo-implementation`, authorized only after this planning memo is reviewed and approved.
- **Live ops retry branch**: `pack5-live-ops-retry` authorized only when environment unblocked.
- **Semantic calibration branch**: `pack5-semantic-calibration` authorized only when data source verified and labeled.
