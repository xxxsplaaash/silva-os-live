# Pack 6.1 — Continuity Demo UI Planning

**System**: A.I.S.H.A. Runtime
**Date**: 2026-05-04
**Branch**: `pack6-1-continuity-demo-ui-planning`
**Status**: ACTIVE PLANNING

---

## 1. Demo Objective
To provide a visual, interactive product-facing UI that safely demonstrates A.I.S.H.A.'s core contradiction-aware continuity logic using the deterministic fixtures from Pack 5, proving truth migration works without relying on live inference or risking forbidden architectural claims.

## 2. Target Audience
Internal stakeholders, product managers, and engineering leads who need to verify that A.I.S.H.A. does not suffer from fact accumulation, but rather safely migrates and preserves truth over time.

## 3. User Story
As an operator, I want to step through a mock conversation timeline so that I can see exactly how A.I.S.H.A. detects a contradiction, archives the old belief, activates the new belief, and uses only the new belief in subsequent turns.

## 4. Demo Scene
The demo scene will use a split-pane layout:
- **Left Pane (The Timeline)**: A stepped list of simulated conversation turns.
- **Right Pane (The Memory State)**: A real-time visualization of the `InMemoryNoteVersioning` state as the timeline advances.

---

## 5. UI Panels / Sections

The UI plan must include the following specific panels in the Right Pane:

### Current Active Truth
Displays the notes that are currently `active` and will be injected into the next context window.

### Historical Truth / Superseded Memory
Displays notes that have been `superseded`. Crucially, this panel proves that A.I.S.H.A. migrates truth over time and that old truth is preserved instead of deleted.

### Supersession Link / Provenance
A visual indicator (e.g., an arrow or linked ID) showing exactly which old note was superseded by which new note, ensuring complete auditability.

### Next-Turn Continuity Check
A simulated prompt construction panel showing the exact context injected for the next turn, proving that next-turn behavior uses the updated active truth and mathematically excludes the superseded history.

### Guardrails / What This Does Not Prove
A persistent, high-visibility panel explicitly listing the forbidden claims to prevent demo misinterpretation.

---

## 6. Required Proof Trace Elements
The UI must explicitly render the following trace data to prove the Pack 5 continuity mechanics:
- **Active truth**: Visible slot values (e.g., `drink preference: oat lattes`).
- **Superseded historical truth**: Archived slot values (e.g., `drink preference: espresso`).
- **Supersession link / provenance**: Visual mapping (e.g., `note_v2 -> supersedes -> note_v1`).
- **Next-turn behavior using updated truth**: Context window payload.
- **Deterministic proof label**: A constant banner stating "Deterministic Fixture Data Only".

---

## 7. Required Stakeholder Copy Blocks
The UI must include the following educational copy blocks:
- "Normal assistants accumulate facts, leading to contradictory retrieval and prompt bloat."
- "A.I.S.H.A migrates truth over time using slot-aware supersession."
- "The old truth is preserved instead of deleted, ensuring an auditable history of the user's journey."
- "The next-turn behavior uses the updated active truth, completely preventing the AI from acting on stale data."

---

## 8. Success Criteria
The UI planning is successful if:
1. It translates the 5 steps of the Pack 5 demo into a clear, visual click-through experience.
2. It clearly differentiates between active and historical truth.
3. It includes all required guardrail labels.

## 9. Non-Goals
This spec is strictly for UI planning. We will NOT:
- Implement the UI code (React/HTML/CSS) in this pack.
- Wire the UI to live inference endpoints.
- Build a generic chat interface.

---

## 10. Strict Guardrails (Forbidden Claims)
This UI design, and any implementation derived from it, explicitly forbids claims of:
- **Production readiness**: This remains a deterministic simulation interface.
- **Live evidence**: All data must be fixture-seeded; no live user data is claimed.
- **Retrieval promotion**: Active, associative, hybrid, and trace lanes remain shadowed.
- **Consciousness**: The system acts on deterministic logic, making no cognitive claims.
- **Fully autonomous learning**: Contradictions require explicit candidate extraction pipelines.
- **Semantic calibration**: Calibration remains data-gated.
