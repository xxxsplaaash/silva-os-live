# Pack 8.0 — Next Arc Planning Memo

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-05
**Branch**: `pack8-0-next-arc-planning`
**Status**: ACTIVE PLANNING

---

## 1. Current State & Blockers

With the successful closeout of Pack 7 (Judge Demo Phase), we must evaluate the next legal arc. All prior closed arcs remain locked.

**Persistent Blockers**:
- **Live Ops Retry**: Remains blocked. Missing `GEMINI_API_KEY` and missing real runtime/session entrypoint. Cannot proceed.
- **Retrieval Promotion**: Remains denied. Active, trace, associative, and hybrid lanes cannot be promoted to live status.
- **Semantic Calibration**: Remains data-gated. No verified labeled shadow session datasets are available.
- **Runtime UI Integration**: Premature. No explicit implementation planning pack exists for wiring the UI layer into the execution loop. Attempting this now risks runtime regression.
- **Static HTML Frame Expansion**: Useful but secondary. Expanding the four storyboard frames into full HTML/CSS mockups is valuable, but it requires a handoff context first so external parties can actually receive and understand the artifacts.

---

## 2. Candidate Arcs

We evaluate the following candidate arcs for implementation:

1. **External Judge Demo Handoff Package**: Bundle all Pack 5–7 artifacts into a single, self-contained, distributable package for external judges, design teams, and stakeholders.
2. **Static HTML Frame Expansion**: Expand the Pack 7.2 storyboard frames into full static HTML/CSS mockups. Useful but secondary to handoff packaging.
3. **Runtime UI Integration Planning**: Wire the demo UI into the live runtime. Premature without explicit authorization.
4. **Live Ops Retry / Real Shadow Collection**: Blocked by environment. Cannot proceed.
5. **Semantic Calibration Planning With Labeled Data**: Data-gated. Cannot proceed.
6. **Pitch / Deck Artifact Planning**: A possible future artifact, but premature before the handoff package exists.
7. **Further Memory / Retrieval Architecture Expansion**: Unsafe without live shadow validation evidence.

---

## 3. Recommended Direction

**Recommendation**: **External Judge Demo Handoff Package**

**Rationale**:
Pack 7 produced a wealth of high-quality specification, scripting, and storyboarding artifacts. The most immediately impactful next step is to bundle these into a single, externally-distributable package. This arc:
- Does not require live ops keys.
- Does not require semantic calibration data.
- Does not require runtime wiring.
- Delivers the A.I.S.H.A. continuity proof and the NULL ALIBI judge-facing scenario to external judges and design teams in a clean, self-contained format they can open, review, and act on.
- Creates the foundation for pitch decks, design briefs, and external collaborations.

---

## 4. Required Handoff Package Contents

The handoff package must include:
1. **Top-level README**: Orientation guide explaining the package structure and how to navigate it.
2. **Judge demo one-pager**: The Pack 7.2 `judge_demo_onepager.md` narrative.
3. **Judge demo script**: The Pack 7.1 `JUDGE_DEMO_SCRIPT.md`.
4. **Storyboard JSON**: The Pack 7.1 `demo_storyboard.json`.
5. **Proof beats JSON**: The Pack 7.1 `proof_beats.json`.
6. **Visual asset plan**: The Pack 7.2 `VISUAL_ASSET_PLAN.md`.
7. **Static prototype references**: Links/references to the Pack 6.2 `prototype.html`.
8. **Guardrail/attestation file**: A standalone `ATTESTATION.md` listing all forbidden claims.
9. **Local viewing instructions**: Instructions for opening artifacts without a server or live dependencies.
10. **Source artifact index**: A machine-readable `artifact_index.json` cataloging all included assets.

---

## 5. Forbidden Claims

The handoff package must NOT claim:
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

## 6. Next Implementation Steps

If approved, the first implementation pack (Pack 8.1) will produce the external handoff package directory on branch `pack8-1-external-judge-demo-handoff`.
