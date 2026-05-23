# Pack 5.1 — Contradiction-Aware Continuity Demo

## What This Proves
This demo provides deterministic proof of the A.I.S.H.A. continuity loop:

| Step | Scenario | Result |
|------|----------|--------|
| 1 | User states a stable truth: `"drink preference: espresso"` | Note created, status: `active` |
| 2 | User contradicts/updates truth: `"drink preference: oat lattes"` | Old note → `superseded`; new note → `active`; `supersedes` link written |
| 3 | Inspect old truth | Old note retrievable via `listContradictionEvidence()` — not deleted |
| 4 | Inspect active truth | Only new note appears in `listActiveNotes()` |
| 5 | Simulate next relevant turn | Active note context contains updated truth; old truth absent from retrieval source |

## Constraints Enforced
- **No retrieval promotion**: Demo uses only `InMemoryNoteVersioning`. No live lanes.
- **No live evidence**: All notes are seeded fixtures with deterministic IDs.
- **No LLM-as-judge**: All assertions are `assert.strictEqual` / `assert.ok`.
- **No production readiness claim**: This is a deterministic scenario proof only.

## Mechanism
Contradiction detection is triggered by `isContradictory()` in `noteVersioning.ts`:
- A colon-keyed slot mutation (`"drink preference: X"` vs `"drink preference: Y"`) fires the contradiction check.
- On contradiction, `mergeOrSupersede()` writes the new note as `active`, transitions the prior to `superseded`/`disputed`, and records a `supersedes` link.
- `listContradictionEvidence()` surfaces all `superseded`/`disputed` notes for operator audit.

## Artifact Evidence
All 7 T58 fixtures pass as of Pack 5.1 on branch `pack5-1-continuity-demo-implementation`.

```
T58_step1_initial_active_note                  ✅ PASS
T58_step2_contradiction_supersedes_old_truth   ✅ PASS
T58_step3_old_truth_preserved_as_history       ✅ PASS
T58_step4_new_truth_is_active                  ✅ PASS
T58_step5_next_turn_uses_new_active_truth      ✅ PASS
T58_no_retrieval_promotion_claimed             ✅ PASS
T58_no_live_evidence_claimed                   ✅ PASS
Finished T58. Passed: 7, Failed: 0
```
