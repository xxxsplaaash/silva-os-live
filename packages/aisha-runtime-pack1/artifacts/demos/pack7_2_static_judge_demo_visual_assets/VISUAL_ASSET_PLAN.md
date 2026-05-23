# Pack 7.2 — Static Judge Demo Visual Asset Plan

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-05
**Branch**: `pack7-2-static-judge-demo-visual-assets`
**Status**: STATIC ARTIFACT

---

## 1. Plan Overview
This document specifies the visual asset production plan for the Judge-Facing Continuity Trial Experience, executing the requirements from Pack 7.1 (`docs/baselines/PACK_7_1_JUDGE_DEMO_EXPERIENCE_SPEC.md`). These assets are entirely static and disconnected from the runtime.

## 2. Visual Style Direction
- **Theme**: "Cold-clean" terminal aesthetic combined with a high-stakes heist dashboard.
- **Colors**: Deep slate backgrounds (#0f1115), high-contrast data points, distinct status colors (Green = Active Truth, Yellow/Amber = Superseded History, Red = Collision/Warning).
- **Typography**: Monospace for data payloads, sans-serif for UI chrome to distinguish system logic from user narrative.
- **Layout**: Split-pane. Left side: The Heist Scene and Narrative. Right side: The A.I.S.H.A. Memory Engine.

## 3. Frame List & Proof Objectives
The visual package consists of an ordered set of static frames.

- **Frame 01: Opening (Stable Truth)**: Proves A.I.S.H.A establishes a baseline active cover (Mertens believes player was at dinner).
- **Frame 02: Collision (Contradiction)**: Proves the system flags mutually exclusive beliefs when a contradictory cover is introduced (Mei believes player was in the corridor).
- **Frame 03: Proof Trace (Preservation)**: Proves A.I.S.H.A preserves the old lie (dinner) as superseded history while updating the active truth (corridor).
- **Frame 04: Comparison (Next-Turn Consequence)**: Proves the system uses the correct active truth for the next action, explicitly comparing this behavior against flat memory or naive RAG.

## 4. Required Visible Panels
Every frame must include representations of:
- Scene / Heist Board (NULL ALIBI / Article 9 framing)
- Command Input
- Current Active Cover / Truth
- NPC Belief States (Mertens and Mei)
- Collision Warning
- A.I.S.H.A Recommendation
- What Changed (Diff View)
- Proof Trace / Trail
- Guardrail Card

## 5. Salivate Moments & Copy Text (from Pack 7.1)
- "Two NPCs can both be telling the truth, and that is the problem."
- "The system remembers the lie as evidence, not as current truth."
- "The next move changes because the memory graph changed."
- "Burning a cover solves one problem while creating another."
- "The proof trace shows why A.I.S.H.A said what she said."

## 6. Strict Guardrails & What Must Not Be Implied
All visual assets must prominently feature a Guardrail Card stating:
- Static demo artifact
- Not runtime integrated
- Not live evidence
- Not production ready
- No retrieval promotion
- No consciousness claim
- No final Judge Mode
- No AMD live renderer

Visually, the UI must NOT imply that it is connected to a live server, fetching live data, or rendering live 3D AMD environments.
