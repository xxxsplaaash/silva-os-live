# Pack 7.1 — Judge-Facing Demo Experience Spec

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-04
**Branch**: `pack7-1-judge-demo-experience-spec`
**Status**: ACTIVE PLANNING

---

## 1. Demo North Star

> **"A.I.S.H.A does not just remember what you said. She preserves what changed, why it changed, and what consequence follows."**

---

## 2. Scenario Summary

**Demo-Adjacent Inspiration: NULL ALIBI / Article 9**

The player is inside a heist. Their cover identity relies on maintaining a consistent alibi with different NPCs.
- **Mertens** believes the player was at a diplomatic dinner at 21:00.
- **Mei** believes the player was in the vault corridor at 21:00.
These beliefs are incompatible. If Mertens and Mei meet, **Beckett** (the auditor) detects the contradiction and triggers an alarm.
To secure **Article 9** (the pressure artifact), the player must manage these beliefs. A.I.S.H.A preserves both beliefs, identifies the collision before it happens, and recommends an action without erasing the history of the lie.

---

## 3. Judge Demo Timeline

- **First 10 seconds**: The judge sees the Heist Board. Mertens and Mei hold conflicting beliefs. The cover is fragile.
- **First 30 seconds**: The judge understands the problem. Beckett is approaching. A contradiction will blow the cover. A.I.S.H.A flags the collision.
- **First 90 seconds**: The judge sees the proof trace: the active truth is separated from the historical lie, and the next-turn behavior prevents disaster by acting on the updated truth.
- **Closing remembered moment**: The judge realizes the lie wasn't deleted; it was preserved as auditable evidence.

---

## 4. Regular-Person Demo Timeline

- **Plain-English emotional hook**: You told two people two different things, and now they are walking into the same room.
- **"This is different" moment**: A.I.S.H.A doesn't just forget the first lie. She keeps it as evidence, but stops you from using it again.
- **Closing takeaway**: The AI knows the difference between what happened, what changed, and what matters right now.

---

## 5. Required Experience Panels

The demo experience must visually surface these panels:
- **Scene / Heist Board**: Current location, NPCs, and Article 9 status.
- **Command Input**: Text entry for player action.
- **Current Active Cover / Truth**: The live, injected context A.I.S.H.A uses.
- **NPC Belief States**: Graph of what Mertens and Mei believe.
- **Collision Warning**: Visual alert when beliefs contradict.
- **A.I.S.H.A Recommendation**: Suggested action to avoid Beckett's audit.
- **What Changed**: Diff showing old belief archiving and new belief activating.
- **Proof Trace / Trail**: Full provenance history of the cover.
- **Guardrail Card**: Persistent label denying live/production status.

---

## 6. Continuity Proof Beats

1. **Stable truth established**: Mertens believes the dinner alibi.
2. **Contradictory truth introduced**: Mei is told the corridor alibi.
3. **Old truth preserved as history/evidence**: The dinner alibi is not deleted; it is marked as superseded evidence.
4. **Active truth updated or disambiguated**: The corridor alibi becomes active.
5. **Supersession/provenance link visible**: Trace shows the exact contradiction match.
6. **Next-turn behavior uses correct active truth**: A.I.S.H.A advises based strictly on the active corridor alibi.
7. **Contradiction is not hidden, overwritten, or flattened**: History remains accessible in the audit log.

---

## 7. Comparison Frame

| System | Behavior |
|--------|----------|
| **Normal assistant** | Gives generic advice, ignoring the timeline of lies. |
| **Flat memory** | Remembers the latest truth but loses the history of prior covers. |
| **Naive RAG** | Retrieves both truths but cannot decide which is active vs historical, causing hallucination. |
| **A.I.S.H.A** | Preserves history, updates active truth, tracks consequence. |

---

## 8. "Make Them Salivate" Moments

1. **"Two NPCs can both be telling the truth, and that is the problem."**
2. **"The system remembers the lie as evidence, not as current truth."**
3. **"The next move changes because the memory graph changed."**
4. **"Burning a cover solves one problem while creating another."**
5. **"The proof trace shows why A.I.S.H.A said what she said."**

---

## 9. Hard Guardrails (Forbidden Claims)

This demo experience explicitly forbids claims of:
- Production readiness
- Live evidence
- Retrieval promotion
- Consciousness
- Fully autonomous learning
- Semantic calibration
- Runtime integration
- Final Judge Mode
- AMD live renderer

---

## 10. Next Legal Branch Guidance
Proceed with static visual asset production or `pack7-2-judge-demo-assets`. No runtime behavior may be altered.
