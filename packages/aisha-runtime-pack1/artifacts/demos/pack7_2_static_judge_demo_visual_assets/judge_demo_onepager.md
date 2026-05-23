# A.I.S.H.A. Judge Demo: The Article 9 Heist

**What is A.I.S.H.A?**
A.I.S.H.A does not just remember what you said. She preserves what changed, why it changed, and what consequence follows.

## The Problem
You are inside a high-stakes heist for an objective known as **Article 9**. To maintain your cover, you’ve fed different stories to different NPCs.
- **Mertens** believes you were at the diplomatic dinner.
- **Mei** believes you were in the vault corridor.

Two NPCs can both be telling the truth, and that is the problem. If they meet, the auditor (**Beckett**) will detect the contradiction and your cover is blown. Burning a cover solves one problem while creating another.

## Why Normal Assistants Fail
A **normal assistant** gives generic advice. A system with **flat memory** remembers the last thing you said (Mei's story) but forgets the original lie (Mertens' story). A **naive RAG** system retrieves both stories but can't decide which one is currently "active," leading to hallucinated context.

## The A.I.S.H.A Solution
A.I.S.H.A flags the collision. Crucially, the system remembers the lie as evidence, not as current truth. 
The memory graph marks Mertens' belief as `superseded` history and Mei's belief as `active`. 
When A.I.S.H.A recommends your next move, it changes because the memory graph changed. The proof trace explicitly shows why A.I.S.H.A said what she said.

---
**Guardrails:**
*This is a static demo artifact. It is not runtime integrated, not live evidence, and not production ready. No retrieval promotion, no consciousness claim, no final Judge Mode, or no AMD live renderer is utilized.*
