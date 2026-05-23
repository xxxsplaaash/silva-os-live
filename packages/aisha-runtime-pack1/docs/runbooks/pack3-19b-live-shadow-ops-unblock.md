# Pack 3.19b: Live Shadow Ops Unblock Runbook

**STATUS: LIVE PROMOTION REMAINS DENIED.**

This runbook defines the exact operational procedure required to unblock and retry Pack 3.19 (Live Shadow Session Collection).

## 1. Strict "Do Not Proceed" Conditions
**STOP AND DO NOT PROCEED IF ANY OF THE FOLLOWING ARE TRUE:**
- No live API key (`AISHA_GEMINI_API_KEY`) is securely available.
- No real session path / live web service entrypoint exists in the current environment.
- Only fixture or `InMemoryScenarioEnvironment` paths are available.
- No Operator Review Owner has been assigned to annotate the generated payloads.
- Shadow outputs are detected leaking into generator-visible fields (e.g., `activeNotes`, `contradictionEvidence`, `supportingEpisodes`).

## 2. Preflight Checks
Before attempting to retry live collection, the operator must verify the following:
1. **Branch Check**: You are on a valid, audited branch (e.g., `pack3-19-live-retry`).
2. **Tags Check**: Ensure all commits from Pack 3.11 through Pack 3.18 are present and validated.
3. **Environment Keys**: `AISHA_GEMINI_API_KEY` must be populated in the environment.
4. **Shadow Flags**: Both shadow flags must be explicitly exportable (`AISHA_SHADOW_ASSOCIATIVE=1`, `AISHA_SHADOW_TRACE=1`).
5. **Output Directory**: Ensure `artifacts/shadow_samples/pack3_19_live/` exists and is writable.

## 3. Requirements to Retry Pack 3.19
To execute a successful live shadow session collection, the environment must provide:
- **Required Live API Key:** `AISHA_GEMINI_API_KEY` mapped to a valid billing project.
- **Real Runtime Entrypoint:** `buildProductionRuntime` must be wired to real network stores or a live integration harness (not `InMemoryScenarioEnvironment`).
- **Shadow Sampling Flags:** Handled via environment variables.
- **Evidence Export Location:** `artifacts/shadow_samples/pack3_19_live/`
- **Annotation Owner:** A designated human operator to out-of-band review the JSON templates.
- **Stop Conditions:** If the runtime panics, latency degrades by >50ms, or shadow data mutates the live retrieval bundle, immediately kill the session and purge the store.
- **Success Criteria:** At least 10 valid, raw `ShadowAuditEntry` payloads collected securely, without live path mutation.

## 4. Retry Protocol & Exact Commands
Execute the following procedure to run the live collection:

```bash
# 1. Enable Both Shadow Lanes
export AISHA_SHADOW_ASSOCIATIVE=1
export AISHA_SHADOW_TRACE=1
export AISHA_GEMINI_API_KEY="<inject_secure_key>"

# 2. Run Live Sessions
# (Only execute this if the live entrypoint exists. Replace with actual live server start command)
npm run start:live-session-harness

# 3. Export Evidence & Generate Templates
# (Assuming a CLI utility or an admin endpoint triggers the export)
npm run shadow:export -- --outDir artifacts/shadow_samples/pack3_19_live/

# 4. Run Unannotated Pack 3.13 Report
npm run shadow:report -- --inDir artifacts/shadow_samples/pack3_19_live/

# 5. Disable Flags Afterward
unset AISHA_SHADOW_ASSOCIATIVE
unset AISHA_SHADOW_TRACE
unset AISHA_GEMINI_API_KEY
```

Once the above protocol completes, the Operator Review Owner must manually annotate the exported templates, after which the system can be evaluated against the Pack 3.11 promotion thresholds.
