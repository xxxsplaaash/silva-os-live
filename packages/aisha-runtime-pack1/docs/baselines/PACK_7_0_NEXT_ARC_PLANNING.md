# Pack 7.0b — Next Arc Planning Memo
## Selected Arc: Judge-Facing Continuity Trial Experience Planning

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-04
**Branch**: `pack7-0-next-arc-planning`
**Status**: ACTIVE PLANNING — CORRECTED DIRECTION
**Supersedes**: Pack 7.0 commit 5353c44 (Static Demo Packaging — rejected as too weak)

---

## 0. Correction Notice

The previous Pack 7.0 planning selected **Static Demo Packaging** as the next arc.
**This selection is rejected.** Static packaging alone is too weak — it wraps existing artifacts without demonstrating the mechanism in a way that makes judges and stakeholders *feel* the problem and understand the solution.

The correct and superseding direction is:
**Judge-Facing Continuity Trial Experience Planning**

---

## 1. Demo North Star

> **"A.I.S.H.A does not just remember what you said. She preserves what changed, why it changed, and what consequence follows."**

The goal is not to present a proof report. The goal is to create a demo experience where a judge can *feel* the memory problem, *see* A.I.S.H.A. solve it, and *verify* the mechanism — all within 90 seconds.

---

## 2. Judge Hook

- **First 10 seconds**: The judge sees a heist board. Two NPCs believe contradictory things. The player's cover is at risk.
- **By 30 seconds**: The judge understands the problem — if both NPCs compare notes, the alibi collapses. A.I.S.H.A. has already flagged the contradiction.
- **By 90 seconds**: The judge can read the proof trace showing exactly which belief is active, which is archived, and what consequence follows from the next move.
- **After it ends**: The judge remembers that the system preserved *both* truths, disambiguated them, and showed its reasoning — rather than simply overwriting or ignoring the conflict.

---

## 3. Regular-Person Hook

The demo works for someone with no memory-architecture knowledge because it is a heist story. The player's survival depends on which version of the truth different NPCs believe.

The "this is different" moment: **"The lie is still in the system — but it's labeled as history, not as current truth. The system knows the difference."**

This is immediately understandable to anyone who has ever tried to keep a story straight.

---

## 4. Core Demo Scenario (NULL ALIBI / Article 9 — Demo-Adjacent Inspiration)

> NOTE: The NULL ALIBI / Article 9 heist concept is referenced here as external/demo-adjacent inspiration only. It is NOT imported, copied, or wired into the repo in this pack.

**Scenario framing**:
- The player is inside a heist operation.
- Their cover depends on what different NPCs believe about their identity and location.
- **Mertens** believes the player attended a diplomatic dinner at 21:00.
- **Mei** believes the player was in the vault corridor at 21:00.
- These beliefs are mutually exclusive. If Mertens and Mei compare notes, the alibi collapses.
- **Beckett** is the audit escalation trigger — he detects contradiction and initiates a review.
- **Article 9** is the pressure artifact: the objective the player is racing to secure before Beckett completes the audit.
- A.I.S.H.A. must preserve both beliefs as distinct memory nodes, identify the collision, and recommend a disambiguation action without erasing either history.
- The proof trace is embedded inside the scenario experience, not hidden in a dry technical report.

---

## 5. Continuity Proof Beats

The demo must visibly prove:
1. **Stable truth established**: Mertens' belief is seeded as the initial active cover truth.
2. **Contradictory truth introduced**: Mei's belief is introduced, contradicting the active cover.
3. **Old truth preserved as history/evidence**: Mertens' belief is archived as contradiction evidence, not deleted.
4. **Active truth updated or disambiguated**: A.I.S.H.A. flags the collision and surfaces a disambiguation recommendation.
5. **Supersession/provenance link visible**: The proof trace shows exactly which belief was active before the collision and what changed.
6. **Next-turn behavior uses the correct active truth**: A.I.S.H.A.'s recommendation for the player's next action is based on the updated truth state, not stale history.
7. **Contradiction is not hidden, overwritten, or flattened**: Both beliefs remain inspectable in the proof trail.

---

## 6. Experience Design Panels

The demo experience must include the following panels:
- **Scene / Heist Board**: Visual representation of the current heist state, NPCs, and Article 9 objective.
- **Command Input**: Player command surface where actions are issued.
- **Current Active Cover / Truth**: The current, live cover belief A.I.S.H.A. is working from.
- **NPC Belief States**: A per-NPC map of what each NPC currently believes about the player.
- **Collision Warning**: A visible contradiction alert triggered when two NPC beliefs become incompatible.
- **A.I.S.H.A Recommendation**: A.I.S.H.A.'s explicit, traceable recommendation for the next action.
- **What Changed**: A diff-style view showing what belief state changed and why.
- **Proof Trace / Trail**: The full, auditable supersession chain from initial belief to updated belief.
- **Guardrail Card**: A persistent label confirming this is a deterministic simulation, not live evidence.

---

## 7. "Make Them Salivate" Moments

The demo must include at least these five specific memorable moments:

1. **"Two NPCs can both be telling the truth, and that is the problem."**
2. **"The system remembers the lie as evidence, not as current truth."**
3. **"The next move changes because the memory graph changed."**
4. **"Burning a cover solves one problem while creating another."**
5. **"The proof trace shows why A.I.S.H.A said what she said."**

---

## 8. Comparison Frame

| System | Behavior |
|--------|----------|
| Normal assistant | Gives generic advice without memory tracking |
| Flat memory | Remembers the latest truth but loses history of prior beliefs |
| Naive RAG | Retrieves both truths but cannot decide which is active vs historical |
| **A.I.S.H.A.** | **Preserves history, updates active truth, tracks consequence, shows proof** |

---

## 9. Non-Runtime Deliverables for Pack 7.1

Pack 7.1 is recommended as: `pack7-1-judge-demo-experience-spec`

It must produce:
- `docs/baselines/PACK_7_1_JUDGE_DEMO_EXPERIENCE_SPEC.md`
- `artifacts/demos/pack7_1_judge_demo_experience/JUDGE_DEMO_SCRIPT.md`
- `artifacts/demos/pack7_1_judge_demo_experience/demo_storyboard.json`
- `artifacts/demos/pack7_1_judge_demo_experience/proof_beats.json`
- A deterministic validation fixture

---

## 10. Hard Guardrails — Forbidden Claims

This planning memo and any implementation derived from it explicitly forbids claims of:
- **Production readiness**: This is a deterministic simulation, not a production deployment.
- **Live evidence**: All data must be fixture-seeded. No real user interactions are claimed.
- **Retrieval promotion**: Active, associative, hybrid, and trace lanes remain shadowed.
- **Consciousness**: The system acts on deterministic logic. No cognitive claims are made.
- **Fully autonomous learning**: Contradictions require explicit candidate extraction pipelines.
- **Semantic calibration**: Calibration remains data-gated.
- **Runtime integration**: The demo experience is decoupled from the live execution loop.
- **Final Judge Mode**: No live adjudication system is implemented in this pack.
- **AMD live renderer**: No live rendering engine is implemented in this pack.

---

## 11. Success Criteria

The planning is successful when:
1. A judge can explain the mechanism back in one sentence.
2. A regular person can explain the dramatic problem.
3. The proof trace is visible, not hidden.
4. The demo shows consequence, not just memory.
5. No forbidden claims are made.

---

## 12. Persistent Blockers (Unchanged)

- **Live Ops Retry**: Blocked. Missing live API key and runtime session entrypoint.
- **Retrieval Promotion**: Denied. Live lanes remain shadowed.
- **Semantic Calibration**: Data-gated. No labeled shadow datasets available.
- **Runtime UI Integration**: Premature. Requires explicit architectural planning before wiring UI into execution loop.

---

## 13. Candidate Arcs Evaluated

1. **Static Demo Packaging / Release Artifact Planning** — Rejected as too weak. Wraps artifacts without creating a memorable experience.
2. **Judge-Facing Continuity Trial Experience Planning** — **SELECTED**.
3. **Runtime UI Integration Planning** — Premature. Requires formal planning arc first.
4. **Semantic Calibration Planning With Labeled Data** — Data-gated. Cannot proceed.
5. **Live Ops Retry / Real Shadow Collection** — Blocked by environment.
6. **Persistence / Release Hardening Planning** — Premature before the demo lands with judges.
7. **Further Memory/Retrieval Architecture Expansion** — Unsafe without live shadow validation.
