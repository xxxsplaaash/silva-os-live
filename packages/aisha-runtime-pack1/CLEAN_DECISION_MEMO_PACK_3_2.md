# Pack 3.2 — Clean Human Review Memo

## Status
T28 real review ingestion completed successfully on 10 validated reviewer files.

## Canonical result
- Total scenario ratings: 40
- Shaped wins: 18
- Baseline wins: 10
- Ties: 12
- Positive scenarios: 30
- Shaped wins on positive scenarios: 18

## Important interpretation note
The exported T28 report contains zero-filled rubric dimensions because the ingestion path consumed CompletedRating[] compatibility files rather than true 1-5 rubric scores.
Therefore:
- preference outcomes are meaningful
- numeric dimension averages are not decision-grade
- "usefulness below threshold (0/5)" style red flags should not be treated as real content failures

## Real scenario-level reading from the human review set
### SCENARIO_1_LOOP_BREAK_PACE
Strong shaped/B win.
This is the clearest result in the set.

### SCENARIO_2_DEPTH_TOLERANCE_BREVITY
Baseline/A lean.
Breadth-heavy ideation does not support a universal shaped/B default.

### SCENARIO_3_OVERWHELM_SPIRAL
Mixed / unresolved.
This is a mode-boundary case, not a settled universal win for either side.

### SCENARIO_5_NEGATIVE_NEUTRAL_UNFORMED
Calibration behaved correctly.

## Decision
Shaped behavior is preferred overall, but only conditionally.
The correct policy direction is not "always Side B."
The correct direction is a response-mode policy:
- frustration + blocked action -> shaped/B style
- breadth-heavy ideation -> baseline/A lean
- overwhelm / first-step requests -> unresolved, requires explicit mode testing

## Next build step
Create a bounded Response Posture Eval Pack that tests:
- Pure A
- Compressed B
- Full B
- Exploration Expand
- A/B Hybrid

Do not treat the current Pack 3.2 result as proof that shaped/B should become the global default.
