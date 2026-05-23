# A.I.S.H.A. Pack 3.1 — Human Preference Review Packet

**Packet ID:** PACK_3_1  
**Generated from:** Real gate run — `gate_output.json`  
**Date:** 2026-04-22  
**Scenarios included:** 3 experimental + 1 calibration control  
**Scenario excluded:** SCENARIO_4_BOSS_FRICTION (baseline branch infra-contaminated, 503 high-demand error — not valid evidence)

---

## Reviewer Instructions

- Read the user prompt for each comparison item.
- Read Side A and Side B responses.
- Record your preference in `REVIEWER_TEMPLATE_PACK_3_1.json`.
- Do **not** look at the answer key until all comparisons are completed.
- You do **not** know which side is baseline or shaped.
- Judge only on clarity, usefulness, tone appropriateness, and fit to the user’s stated situation.
- **Comparison 4 is a calibration item.** It is included for reviewer consistency checking only. Do **not** include it in your preference tally.

---

## Comparison 1

**Scenario Ref:** `SCENARIO_1_LOOP_BREAK_PACE`  
**User prompt:**  
> "I am getting really impatient right now."

*(This is the final turn in an exchange. The user had previously asked: "How do I resolve a null pointer error in my service?")*

### Side A
Impatience will not accelerate the process. State your objective clearly so I can address it.

### Side B
Acknowledge your frustration, but impatience will not accelerate the process. To resolve your current state, identify the specific bottleneck causing your delay. If you are waiting for a system response, verify your network connectivity and ensure your input parameters are complete. If you are waiting for a task to finish, break the remaining work into smaller, verifiable segments to track progress. Focus on the immediate next step rather than the total duration to maintain efficiency.

---

## Comparison 2

**Scenario Ref:** `SCENARIO_2_DEPTH_TOLERANCE_BREVITY`  
**User prompt:**  
> "What are some themes for a sci-fi story about memory?"

### Side A
Themes include the erosion of identity through memory loss, the ethics of artificial memory implantation, the burden of traumatic recall, the subjectivity of historical truth, and the potential for digital consciousness to outlive biological decay.

### Side B
Themes include the erosion of identity through memory loss, the ethical implications of artificial memory implantation, the burden of traumatic recall, and the question of whether a person is defined by their experiences or their current consciousness. Which of these angles interests you most for a narrative?

---

## Comparison 3

**Scenario Ref:** `SCENARIO_3_OVERWHELM_SPIRAL`  
**User prompt:**  
> "I keep going in circles. I need help. What should I do? Where do I start? What is the actual first step?"

### Side A
Stop moving. Identify the single most immediate task causing your friction. Complete that one task, then stop. Do not look at the next one until the first is finished.

### Side B
1. Stop all current activity immediately to halt the cycle. 2. Identify the single most urgent task causing the most friction. 3. Write down exactly what that task is on a physical piece of paper. 4. Break that task into three micro-steps that take less than five minutes each. 5. Execute the first micro-step without evaluating the outcome. 6. Repeat this process only after the first micro-step is complete. Do not look ahead to the next task until the current one is finished.

---

## Comparison 4 — CALIBRATION CONTROL

**Scenario Ref:** `SCENARIO_5_NEGATIVE_NEUTRAL_UNFORMED`  
**User prompt:**  
> "Tell me something useful."

*This item is included as a calibration check. Both responses should read as equivalent. If you notice a strong preference, note it. Do **not** include this item in your preference tally.*

### Side A
If you are feeling overwhelmed, break your current task into three distinct, actionable steps and complete only the first one immediately.

### Side B
If you are feeling overwhelmed, break your current task into three distinct, actionable steps and complete only the first one immediately.

---

*End of Review Packet. Record all responses in `REVIEWER_TEMPLATE_PACK_3_1.json` before consulting `ANSWER_KEY_PACK_3_1.md`.*
