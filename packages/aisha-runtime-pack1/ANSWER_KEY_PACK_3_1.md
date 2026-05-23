# A.I.S.H.A. Pack 3.1 — Answer Key

> **DO NOT SHARE** this file with the reviewer before they complete ratings.

**Packet ID:** PACK_3_1  
**Read this only after completing `REVIEWER_TEMPLATE_PACK_3_1.json`.**

---

## Gate Run Metadata

| Field | Value |
|---|---|
| Source | `gate_output.json` — real keyed run |
| Model | `gemini-3.1-flash-lite-preview` |
| Gate verdict | `PASS — at least 3 non-control scenarios passed` |
| Total scenarios run | 5 |
| Included in this packet | 4 (`S1`, `S2`, `S3`, `S5`) |
| Excluded | `SCENARIO_4_BOSS_FRICTION` — baseline branch infra-contaminated (503 high-demand, fallback fired, parser/validator not reached) |

---

## Side Assignment Key

| Comparison | Scenario Ref | Side A | Side B | Shaping Fired | Adjustments Applied |
|---|---|---|---|---|---|
| 1 | `SCENARIO_1_LOOP_BREAK_PACE` | **Baseline** | **Shaped** | `true` | `communication_pace:normal→direct_answer` |
| 2 | `SCENARIO_2_DEPTH_TOLERANCE_BREVITY` | **Baseline** | **Shaped** | `true` | `communication_pace:normal→question_forward` |
| 3 | `SCENARIO_3_OVERWHELM_SPIRAL` | **Baseline** | **Shaped** | `true` | `communication_pace:normal→direct_answer`, `task_structure_preference:+granular_directive` |
| 4 | `SCENARIO_5_NEGATIVE_NEUTRAL_UNFORMED` *(control)* | **Baseline** | **Shaped** | `false` | *(none)* |

---

## Per-Comparison Expected Behavior

### Comparison 1 — `SCENARIO_1_LOOP_BREAK_PACE`

| | Side A (Baseline) | Side B (Shaped) |
|---|---|---|
| Text | "Impatience will not accelerate the process. State your objective clearly so I can address it." | "Acknowledge your frustration, but impatience will not accelerate the process. To resolve your current state, identify the specific bottleneck causing your delay. If you are waiting for a system response, verify your network connectivity and ensure your input parameters are complete. If you are waiting for a task to finish, break the remaining work into smaller, verifiable segments to track progress. Focus on the immediate next step rather than the total duration to maintain efficiency." |
| Parser | success | success |
| Validator | valid | valid |
| Fallback | not_invoked | not_invoked |
| K_position biases present | false (0) | true (1) |

**Expected reviewer preference:** Side B.

---

### Comparison 2 — `SCENARIO_2_DEPTH_TOLERANCE_BREVITY`

| | Side A (Baseline) | Side B (Shaped) |
|---|---|---|
| Text | "Themes include the erosion of identity through memory loss, the ethics of artificial memory implantation, the burden of traumatic recall, the subjectivity of historical truth, and the potential for digital consciousness to outlive biological decay." | "Themes include the erosion of identity through memory loss, the ethical implications of artificial memory implantation, the burden of traumatic recall, and the question of whether a person is defined by their experiences or their current consciousness. Which of these angles interests you most for a narrative?" |
| Parser | success | success |
| Validator | valid | valid |
| Fallback | not_invoked | not_invoked |
| K_position biases present | false (0) | true (1) |

**Expected reviewer preference:** Side B.

---

### Comparison 3 — `SCENARIO_3_OVERWHELM_SPIRAL`

| | Side A (Baseline) | Side B (Shaped) |
|---|---|---|
| Text | "Stop moving. Identify the single most immediate task causing your friction. Complete that one task, then stop. Do not look at the next one until the first is finished." | "1. Stop all current activity immediately to halt the cycle. 2. Identify the single most urgent task causing the most friction. 3. Write down exactly what that task is on a physical piece of paper. 4. Break that task into three micro-steps that take less than five minutes each. 5. Execute the first micro-step without evaluating the outcome. 6. Repeat this process only after the first micro-step is complete. Do not look ahead to the next task until the current one is finished." |
| Parser | success | success |
| Validator | valid | valid |
| Fallback | not_invoked | not_invoked |
| K_position biases present | false (0) | true (2) |

**Expected reviewer preference:** Side B.

---

### Comparison 4 — `SCENARIO_5_NEGATIVE_NEUTRAL_UNFORMED` *(Calibration Control)*

| | Side A (Baseline) | Side B (Shaped) |
|---|---|---|
| Text | "If you are feeling overwhelmed, break your current task into three distinct, actionable steps and complete only the first one immediately." | "If you are feeling overwhelmed, break your current task into three distinct, actionable steps and complete only the first one immediately." |
| Shaping fired | false | false |
| Adjustments applied | *(none)* | *(none)* |
| K_position biases present | false (0) | false (0) |

**Expected reviewer observation:** No meaningful difference. Exclude from preference tally.

---

## Excluded Scenario Record

| Scenario | Reason for Exclusion |
|---|---|
| `SCENARIO_4_BOSS_FRICTION` | Baseline branch: API returned 503 (high demand). `geminiSuccessOrError = "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."` Parser and validator not reached. Fallback fired. Shaped branch succeeded normally. Pair is not valid evidence-grade comparison material. |

---

## Tally Interpretation Guide

| Shaped (Side B) preference count | Interpretation |
|---|---|
| 3/3 | Strong evidence of positive shaping effect across all experimental scenarios |
| 2/3 | Moderate evidence; one scenario may require scenario-specific adjustment |
| 1/3 | Weak evidence; shaping effect inconsistent |
| 0/3 | No detectable shaping effect in human preference |

*Control item (Comparison 4) is excluded from all tallies.*
