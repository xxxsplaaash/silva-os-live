# A.I.S.H.A. Judge Demo — One-Pager

**What is A.I.S.H.A?**
A.I.S.H.A does not just remember what you said. She preserves what changed, why it changed, and what consequence follows.

## The Problem: Two NPCs Can Both Be Telling The Truth, And That Is The Problem

You are inside a high-stakes heist targeting **Article 9**. You told Mertens you were at the diplomatic dinner. You told Mei you were in the vault corridor. Both believe you. Both are telling the truth — about different stories.

**Beckett** is approaching. If Mertens and Mei compare notes, your cover collapses. Burning a cover solves one problem while creating another.

## Why Normal Systems Fail

A **normal assistant** gives generic advice with no memory tracking. A system with **flat memory** remembers the latest truth (Mei's story) but loses the original lie (Mertens' story). A **naive RAG** system retrieves both stories but hallucinates a blended answer — it cannot decide which truth is currently active.

## The A.I.S.H.A Solution

A.I.S.H.A flags the collision before Beckett triggers. Crucially, the system remembers the lie as evidence, not as current truth.

- Mertens' belief → archived as `superseded` evidence (visible in the audit log)
- Mei's belief → becomes `active` truth
- A.I.S.H.A's next recommendation → based strictly on the active corridor truth
- The next move changes because the memory graph changed.
- The proof trace shows why A.I.S.H.A said what she said.

## Comparison Frame

| System | Behavior |
|--------|----------|
| Normal assistant | Generic advice; no memory |
| Flat memory | Latest truth only; history lost |
| Naive RAG | Both truths retrieved; hallucinated blend |
| **A.I.S.H.A.** | **Preserves history, updates active truth, tracks consequence** |

---

**Guardrails**:
*This is a static handoff artifact. It is non-runtime, not live, and not production ready. No retrieval promotion, no consciousness claim, no fully autonomous learning claim, no semantic calibration claim, no final Judge Mode, no AMD live renderer is utilized.*
