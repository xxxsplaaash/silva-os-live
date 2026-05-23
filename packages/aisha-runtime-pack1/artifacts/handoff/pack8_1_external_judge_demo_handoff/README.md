# A.I.S.H.A. — External Judge Demo Handoff Package
## Pack 8.1 | NULL ALIBI / Article 9 Continuity Trial

**Status**: Static Handoff Artifact | Non-Runtime | Not Live | Not Production Ready

---

## What Is This?

This package contains the complete Judge-Facing Continuity Trial Experience specification for A.I.S.H.A. — a memory architecture system that preserves contradictions instead of overwriting them.

> **"A.I.S.H.A does not just remember what you said. She preserves what changed, why it changed, and what consequence follows."**

---

## 30-Second Summary

You are inside a heist. Your cover depends on two NPCs believing two different stories. When they compare notes, your alibi collapses. **A.I.S.H.A does not fix the lie by erasing it.** She preserves both beliefs, labels one as active and one as historical evidence, and recommends the next move based strictly on the updated truth.

---

## 90-Second Judge Explanation

Most AI memory systems fail under contradiction. They either keep the latest fact (losing history) or retrieve all facts (hallucinating a blend). A.I.S.H.A. uses contradiction-aware continuity:

1. **Stable truth established** — Mertens believes the dinner alibi.
2. **Contradiction introduced** — Mei is told a conflicting corridor alibi.
3. **Old truth preserved** — The dinner alibi is archived as superseded evidence, not deleted.
4. **Active truth updated** — The corridor alibi becomes the new active context.
5. **Supersession link visible** — The proof trace shows exactly what changed and why.
6. **Next-turn behavior correct** — A.I.S.H.A. recommends the next action using only the active corridor truth.
7. **Contradiction not flattened** — The history remains inspectable and auditable.

This is not a claim about production behavior. It is a deterministic proof run on fixture data.

---

## Regular-Person Explanation

You told two people two different things. Now they're walking into the same room. A normal AI forgets the first lie. A.I.S.H.A. keeps it — labeled as history, not as truth. She knows the difference between what happened, what changed, and what matters right now.

---

## NULL ALIBI / Article 9 Scenario

The scenario is set inside a high-stakes heist targeting **Article 9** — the critical objective the player must secure before time runs out.

- **Mertens** believes the player attended the diplomatic dinner at 21:00.
- **Mei** believes the player was in the vault corridor at 21:00.
- These beliefs are mutually exclusive.
- **Beckett** is the audit trigger: if Mertens and Mei compare notes, he detects the contradiction.
- **A.I.S.H.A** preserves both beliefs, flags the collision, and recommends an action without erasing history.

> NOTE: NULL ALIBI / Article 9 is demo-adjacent inspiration. It is not imported into the runtime.

---

## Comparison Frame

| System | Behavior |
|--------|----------|
| Normal assistant | Gives generic advice; no memory tracking |
| Flat memory | Remembers the latest truth; loses prior history |
| Naive RAG | Retrieves both truths; cannot distinguish active vs historical |
| **A.I.S.H.A.** | **Preserves history, updates active truth, tracks consequence** |

---

## Package Contents

| File | Description |
|------|-------------|
| `README.md` | This file |
| `JUDGE_DEMO_ONEPAGER.md` | Narrative one-pager for judges and stakeholders |
| `JUDGE_DEMO_SCRIPT.md` | Scene-by-scene narrative script |
| `GUARDRAIL_ATTESTATION.md` | Formal attestation of forbidden claims |
| `artifact_index.json` | Machine-readable index of all source artifacts |
| `handoff_manifest.json` | Handoff package metadata |

---

## Local Viewing Instructions

All files in this package are plain Markdown and JSON. No server required.
1. Open any `.md` file in a Markdown viewer, VS Code, or GitHub.
2. Open `.json` files in any text editor or JSON viewer.
3. The `prototype.html` referenced in artifact_index.json can be opened directly in any browser.

---

## Guardrails

**This is a static handoff artifact.** It is non-runtime, not live, and not production ready. See `GUARDRAIL_ATTESTATION.md` for the full list of forbidden claims.
