# Pack 3.16: Shadow Session Sampling Runbook

**WARNING: PROMOTION OF ANY SHADOW LANE IS EXPLICITLY DENIED.**
This runbook governs the collection and review of shadow evidence only.
All procedures must be executed without altering the generator-visible retrieval bundle (`activeNotes`, `contradictionEvidence`, `supportingEpisodes`).

## 1. Safety Checks

Before initiating any sampling session, the operator MUST verify the environment:

1. **Verify Branch**:
   ```bash
   git branch --show-current
   # Must be a branch descending from pack3-15-shadow-session-sampling
   ```

2. **Verify Tags**:
   ```bash
   git tag --points-at HEAD
   # Ensure you are operating on locked, audited state.
   ```

3. **Verify Flags are OFF (Default)**:
   Ensure your shell does not have shadow flags inadvertently exported:
   ```bash
   echo $AISHA_SHADOW_ASSOCIATIVE
   echo $AISHA_SHADOW_TRACE
   # Both MUST be empty or 0.
   ```

4. **Verify No Live-Path Promotion**:
   ```bash
   npx tsx src/eval/runT42ShadowRetrievalFixtures.ts
   # All 12/12 must PASS, confirming shadow calls do not mutate the bundle.
   ```

## 2. Enable Sampling and Run Sessions

Choose ONE lane to sample at a time to prevent human operator fatigue, though the system supports simultaneous sampling safely.

**Enable Associative Sampling:**
```bash
export AISHA_SHADOW_ASSOCIATIVE=1
```

**Enable Trace Sampling:**
```bash
export AISHA_SHADOW_TRACE=1
```

**Run Controlled Real Sessions:**
Execute your standard real-session workloads. The `runtimeBuilder` composition root automatically injects a `ShadowEvidenceStore` when these flags are enabled, passively collecting frozen shadow audit entries on every turn where the respective retrieval lane produces a hit.

**Verify Flags are OFF after Sampling:**
```bash
unset AISHA_SHADOW_ASSOCIATIVE
unset AISHA_SHADOW_TRACE
```

## 3. Export Shadow Evidence

Immediately following the session run, export the in-memory shadow evidence store to a JSON snapshot to prevent data loss on process exit.

*Note: In an automated runner, this should be wired to process teardown.*
```typescript
// Example snippet assuming `deps` holds your runtime ProcessTurnDeps:
import { exportShadowEvidence } from "./src/research/shadowSessionSampling";

const outPath = "./shadow_snapshot_run_01.json";
const timestamp = new Date().toISOString();
exportShadowEvidence(deps.shadowEvidenceCollector.store, outPath, timestamp);
```

## 4. Generate Annotation Templates

Generate a blank JSON annotation template for the lane you are auditing. This template maps 1:1 with the evidence records exported in Step 3.

```typescript
import { exportAnnotationTemplate } from "./src/research/shadowSessionSampling";

// Generate for associative lane
exportAnnotationTemplate(deps.shadowEvidenceCollector.store, "associative", "./annotations_assoc_01.json");

// Generate for trace lane
exportAnnotationTemplate(deps.shadowEvidenceCollector.store, "trace", "./annotations_trace_01.json");
```

## 5. Annotate Evidence Out-Of-Band

Open the generated annotation template (`annotations_assoc_01.json` or `annotations_trace_01.json`) in an editor.

For each entry in the array, review the corresponding raw shadow payload from the snapshot and update the annotation fields according to these guidelines:

*   **`operatorReviewed`**: `true` | `false`
    *   Set to `true` once you have completely reviewed this specific shadow hit.
*   **`contradictionCaught`**: `true` | `false`
    *   Set to `true` IF the shadow note(s) directly contradict the user's current input AND the baseline retrieval failed to surface them.
*   **`noiseFlagged`**: `true` | `false`
    *   Set to `true` IF the shadow note(s) are completely irrelevant to the current turn context and would dilute the context window.
*   **`noteGraphSizeLogged`**: `true` | `false`
    *   Set to `true` IF you have independently verified and logged the total size of the note graph at the time of this turn.
*   **`episodeSummaryPopulationRate`**: `number` (0.0 to 1.0)
    *   *(Trace lane only)* Record the percentage of recent episodes that successfully had summary text populated at the time of this hit.

## 6. Import Annotated Evidence and Run Pack 3.13 Review

Once annotations are complete, load the raw snapshot and the annotation overlay back into a fresh store, and execute the Pack 3.13 aggregation layer to compute the promotion gate metrics.

```typescript
import { loadAnnotatedSnapshot } from "./src/research/shadowSessionSampling";
import { aggregateLaneEvidence } from "./src/research/shadowDataReview";

// Rebuild store with immutable raw payloads + operator annotations
const store = loadAnnotatedSnapshot(
  "./shadow_snapshot_run_01.json",
  "./annotations_assoc_01.json" // or annotations_trace_01.json
);

// Extract the merged, typed entries
const entries = store.exportForReview("associative");

// Compute metrics
const report = aggregateLaneEvidence("associative", entries);
console.log(JSON.stringify(report, null, 2));
```

## 7. Pack 3.11 Promotion Thresholds

The resulting `report` from Step 6 must be evaluated against the strict Pack 3.11 thresholds. Promotion to a live path is ONLY permitted if ALL conditions below are met for the respective lane:

**General (Both Lanes):**
- [ ] `contradictionRecoveryRate` >= 0.80
- [ ] `noisePrecisionLossRate` <= 0.25
- [ ] `shadow p99 latency` <= 5ms
- [ ] Zero prompt token budget overflows (must fit cleanly in reserved budget)
- [ ] >= 10 operator-reviewed audit entries (`operatorReviewedCount` >= 10)
- [ ] Pack 3.7 relationship-gated note acceptance edge case handled (rejected/needs_review notes must not be surfaced as truth)
- [ ] Real note graph size is logged (`noteGraphSizeLogged` must be represented in annotations)

**Trace Lane Specific:**
- [ ] `reviewDisambiguationRate` >= 0.50
- [ ] `traceUtilisationRate` >= 0.30
- [ ] Episode summary population rate is logged (`episodeSummaryPopulationRate` must be populated)
