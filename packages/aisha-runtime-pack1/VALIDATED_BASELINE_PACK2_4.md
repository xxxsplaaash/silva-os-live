# A.I.S.H.A. Pack 2.4 — Validated Baseline

**Tag:** `aisha-pack2-4-green`
**Date:** 2026-04-18
**Branch:** `pack2-4-review-queue-triage`
**Base:** `aisha-pack2-3-green`

## Scope

Pack 2.4 prevents the review queue from becoming a graveyard. Instead of accumulating every `needs_review` note in a single undifferentiated stack, it deterministically routes notes into exactly one of three bins based on explicit evidence criteria:

- **auto_confirm**: safe to bless without human eyes
- **auto_expire**: safe to archive without human eyes
- **genuine_review**: genuinely ambiguous or high-risk; stays for operator

Remaining genuine_review items are sorted high → medium → low priority so operators work up the stack.

## Triage Rules

### auto_expire (checked first — cannot silently destroy history)
1. `reviewState === "rejected"` — explicit prior operator rejection → `operator_rejected`
2. `reinferencePolicy.reason === "retrieved_weak_stale_note"` AND `confidence < 0.60` AND `sourceEpisodeIds.length <= 1` → `single_episode_weak_stale`

### auto_confirm (checked second — cannot silently bless bad notes)
1. `reinferencePolicy.reason !== "contradiction_sensitive_lower_support"` — contradiction-flagged notes are never auto-confirmed
2. `reviewState !== "rejected"` — previously rejected notes cannot be re-blessed automatically
3. `sourceEpisodeIds.length >= 2` — must have independent corroboration
4. `confidence >= 0.80` — above the certainty floor
5. No active competitor note on the same `subtype + subjectKind` track — uncontested truth only

### genuine_review priority
- **high**: `contradiction_sensitive_lower_support` or `status === "disputed"`
- **medium**: `sourceEpisodeIds.length >= 2` or relationship-gated reason
- **low**: everything else

## Files Changed

- `src/eval/reviewQueueTriage.ts` — [NEW] Core deterministic three-bin triage engine with priority assignment and markdown report surfacing.
- `src/eval/t20ReviewQueueTriageFixtures.ts` — [NEW] 6 fixtures covering each bin boundary, competitor blocking, and mixed queue counting.
- `src/eval/runT20ReviewQueueTriageFixtures.ts` — [NEW] T20 runner.

## Test Results

| Suite | Passed | Failed |
|---|---|---|
| T20 Review Queue Triage | 6 | 0 |
| Default Evaluated Packages | 144 | 0 |
| **Total** | **150** | **0** |
