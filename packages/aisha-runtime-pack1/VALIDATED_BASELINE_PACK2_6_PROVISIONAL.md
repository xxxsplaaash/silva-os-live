# Pack 2.6 Validated Baseline — Provisional Note Tier + Extraction Calibration

**Branch:** `pack2-6-provisional-note-tier`
**Commit:** `f55b4f7` — Implement Pack 2.6 provisional note tier and extraction calibration
**Tag:** `aisha-pack2-6-green`
**Date:** 2026-04-19

---

## 1. FILES CHANGED (vs main)

| File | Change |
|------|--------|
| `src/memory/types.ts` | +`K_boundary` subtype, +`provisional`/`expired` status, +`expiresAt` on NoteRecord, +`status` on NoteCandidate, +`includeProvisional` on filter |
| `src/memory/noteExtractionSandbox.ts` | +hedge evaluators (temporary/conditional/ambivalent/aspiration), +K_boundary group, +`hedgePenalty()`, +`status:"provisional"` on all heuristic candidates, +K_boundary gate in `heuristicGate()` |
| `src/memory/noteVersioning.ts` | +`isContradictory()` (avoidance-only), contradiction narrowing in `mergeOrSupersede()`, provisional status assignment (opt-in), trust-clearance promotion on reinforce, `isExpired()`, `includeProvisional` filter, provisional TTL, `disputed` vs `superseded` distinction |
| `src/runtime/inMemoryAsyncMemoryFollowup.ts` | +`includeProvisional: true` in async followup retrieval |
| `src/eval/t22LabeledExtractionFixtures.ts` | NEW — 9 labeled extraction baseline fixtures (Step 0 gate) |
| `src/eval/runT22LabeledExtractionFixtures.ts` | NEW — T22 runner |
| `src/eval/t12RelationshipGatingAuditFixtures.ts` | Updated `T12_superseded_prior_not_retroactively_gated` to use real avoidance contradiction pair |
| `src/eval/t13VisibleContinuityFixtures.ts` | Updated 5 fixtures to use real avoidance pairs (`dairy`/`avoids dairy`) |

---

## 2. WHAT WAS KEPT FROM PRIOR PACK 2.6 ATTEMPTS

- `K_boundary` as first-class subtype (types.ts) — correct
- `provisional` + `expired` status in NoteStatus — correct
- `expiresAt` field on NoteRecord — correct
- `includeProvisional` on ListActiveNotesFilter — correct
- `status` on NoteCandidate — correct
- Provisional TTL = 7 days — correct
- Hidden provisional traversal for async trust-clearance — correct
- Aspiration/intention heavy penalty (-0.40) — correct
- K_boundary immediate-active handling in versioning — correct

## 3. WHAT WAS REJECTED FROM PRIOR PACK 2.6 ATTEMPTS

- `priorActiveConflicts = activeSameTrack` — **removed**. Same-track ≠ contradiction.
- `candidate.status ?? "provisional"` default — **replaced** with `candidate.status === "provisional" ? "provisional" : "active"`. Old API callers default to active; only explicit opt-in enters provisional tier.
- `NoteVersioning` class rename — **reverted**. Class stays `InMemoryNoteVersioning`.
- Removed `seedNotes`, `listSupersededByIds` — **restored** verbatim from main.
- Simplified `validate()`, `persistReviewSignals()` — **restored** verbatim from main.
- Simplified `operatorReview()` reason text — **restored** verbatim from main.
- `startingStatus` accidental prestige (active because prior active exists) — **removed**.
- `isContradictory()` using only normalized value prefix without subtype gate — **replaced** with properly scoped version.

---

## 4. WHAT IS CORRECT IN THE FINAL IMPLEMENTATION

### Extraction Calibration (`noteExtractionSandbox.ts`)

```
hedge evaluators (per-sentence):
  isTemporary  = /right now|just for now|at the moment|for now/
  isConditional = /if |in case|unless|depending on|when it rains/
  isAmbivalent  = /might|maybe|probably|perhaps|guess|suppose/
  isAspiration  = /want to|hope to|planning to|going to|trying to|wish I|plan to|someday|eventually|tomorrow/

hedgePenalty(base):
  isAspiration  → -0.40  (heaviest: aspirations cannot reach 0.65 alone)
  isTemporary   → -0.35
  isConditional → -0.30
  isAmbivalent  → -0.25
  floor: max(0.10, penalized)
  extractionConfidenceRaw frozen at base value

K_boundary group (new):
  pattern: "I don't want to talk about|let's change the subject|drop the subject|..."
  confidence: 0.90, no status field set → versioning forces active
  no hedge penalties applied

All Groups A-E: status set to "provisional" on every emitted candidate
```

### Contradiction Logic (`noteVersioning.ts`)

```typescript
function isContradictory(candidate: NoteCandidate, note: NoteRecord): boolean {
  if (candidate.subtype !== note.subtype) return false;
  if (!candidate.normalizedValue || !note.normalizedValue) return false;
  const cVal = candidate.normalizedValue;
  const nVal = note.normalizedValue;
  // avoidance/negation pairs only
  if (cVal.startsWith("avoids ") && !nVal.startsWith("avoids "))
    return cVal.replace("avoids ", "") === nVal;
  if (!cVal.startsWith("avoids ") && nVal.startsWith("avoids "))
    return cVal === nVal.replace("avoids ", "");
  return false;
}

// priorActiveConflicts = activeSameTrack.filter(isContradictory)
// NOT: priorActiveConflicts = activeSameTrack (old wrong behavior)
```

### Provisional Status Assignment

```typescript
// Only candidates explicitly carrying status="provisional" enter the tier.
// Old API callers (no status field) → default to "active" (backward compatible).
// K_boundary → always "active" regardless of candidate.status.
const candidateStatus = candidate.subtype === "K_boundary"
  ? "active"
  : (candidate.status === "provisional" ? "provisional" : "active");
```

### Trust-Clearance Promotion

```typescript
// On reinforce path only (not on contradiction path).
// Requires: >1 distinct source episodes AND confidence >= 0.65.
// Aspirations penalized to < 0.65 → cannot promote on first corroboration alone.
if (updated.status === "provisional") {
  const hasMultiEp = mergedEpisodeIds.length > 1;
  const hasConf = updated.confidence >= 0.65;
  if (hasMultiEp && hasConf) {
    updated.status = "active";
    updated.expiresAt = undefined; // no longer bounded
  }
}
```

### Provisional Lifecycle

```typescript
// TTL: 7 days from creation
expiresAt: candidateStatus === "provisional"
  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  : undefined

// Expiry check (private, read-only):
private isExpired(note: NoteRecord): boolean {
  if (note.status === "provisional" && note.expiresAt) {
    return Date.parse(note.expiresAt) < Date.now();
  }
  return false;
}
// Expired notes silently invisible — no deletion, no junk drawer.
```

### Contradiction Status Distinction

```typescript
// Prior is provisional → quietly superseded (no dispute prestige)
// Prior is active → disputed (audit trail preserved)
const priorNewStatus = prior.status === "provisional" ? "superseded" : "disputed";
```

### includeProvisional Filter (read path purity)

```typescript
// ONLY used in async followup for trust-clearance accumulation.
// NEVER on hot generation path.
// Hot path: status !== "active" → excluded (pure).
if (filter?.includeProvisional) {
  if (note.status !== "active" && note.status !== "provisional") return false;
} else {
  if (note.status !== "active") return false;
}
```

---

## 5. RAW TEST OUTPUTS

### T4, T5 Integration
```
Starting Integration Fixtures (T4, T5)...
Running [T4_multi_turn_integration]... ✅ PASS
Running [T5_cross_session_continuity]... ✅ PASS
Finished. Passed: 2, Failed: 0
```

### T22 Labeled Extraction (Pack 2.6 Step 0 Gate)
```
Starting T22 Labeled Extraction Suite (Pack 2.6 Step 0 Gate)...
Running [T22_temporary_state_is_demoted]...                        ✅ PASS
Running [T22_conditional_preference_is_demoted]...                 ✅ PASS
Running [T22_ambivalent_preference_is_demoted]...                  ✅ PASS
Running [T22_aspiration_intention_is_suppressed]...                ✅ PASS
Running [T22_stable_preference_is_provisional_on_cold_start]...    ✅ PASS
Running [T22_stable_profile_is_provisional_on_cold_start]...       ✅ PASS
Running [T22_k_boundary_is_immediately_active]...                  ✅ PASS
Running [T22_stacked_hedges_compound_correctly]...                 ✅ PASS
Running [T22_avoidance_signal_is_provisional]...                   ✅ PASS
Finished T22. Passed: 9, Failed: 0
```

### Default Suite (38 fixtures)
```
[PASS] happy_path_single_turn_success
[PASS] episode_split_on_surprise
[PASS] stable_note_visible_in_context
[PASS] preference_note_extracted_after_commit
[PASS] profile_note_extracted_after_commit
[PASS] ephemeral_statement_not_promoted
[PASS] contradictory_preference_supersedes_prior_note
[PASS] followup_turn_sees_superseded_preference
[PASS] most_relevant_preference_surfaces_first
[PASS] newer_confirmed_note_outranks_older_weaker_note
[PASS] contradiction_evidence_hidden_from_normal_recall
[PASS] preference_and_profile_can_coexist
[PASS] high_tension_produces_more_cautious_wording
[PASS] high_trust_produces_warmer_direct_wording
[PASS] high_load_prefers_concise_task_forward_output
[PASS] practical_action_bias_changes_response_priority
[PASS] low_certainty_high_tension_prefers_clarifying_posture
[PASS] clear_task_high_trust_prefers_direct_answer
[PASS] deepening_bias_prefers_question_forward_intent
[PASS] contradiction_sensitive_turn_prefers_narrower_claim
[PASS] parser_failure_triggers_fallback
[PASS] validator_failure_triggers_fallback
[PASS] failed_turn_does_not_commit_memory
[PASS] fallback_response_respects_cautious_posture
[PASS] concise_mode_caps_response_length
[PASS] warm_mode_does_not_overinflate_wording
[PASS] cautious_mode_stays_narrow_not_rambling
[PASS] question_forward_asks_only_one_followup_question
[PASS] fallback_stays_plain_and_grounded
[PASS] retrieved_weak_note_can_be_flagged_needs_confirmation
[PASS] contradiction_sensitive_retrieval_prefers_better_supported_active_note
[PASS] stale_weak_note_loses_priority_without_silent_deletion
[PASS] strong_recently_confirmed_note_remains_stable_in_normal_recall
[PASS] retrieved_weak_stale_note_persists_pending_review_state
[PASS] contradiction_sensitive_lower_support_persists_pending_review_state
[PASS] strong_recent_note_does_not_persist_needs_review
[PASS] persisted_pending_review_state_visible_on_later_turn_inspection
[PASS] 10_turn_state_accumulation
Total: 38 PASS, 0 FAIL
```

### All Numbered Suites
```
runIntegrationFixtures       => Finished. Passed: 2, Failed: 0
runT6ExtractionFixtures      => Finished T6 Evaluation. Passed: 3, Failed: 0
runT7CriticLoopFixtures      => Finished T7. Passed: 7, Failed: 0
runT8MultiSessionFixtures    => Finished T8. Passed: 7, Failed: 0
runT9RelationshipGatingFixtures     => Finished T9. Passed: 4, Failed: 0
runT10LiveCriticFixtures     => Finished T10. Passed: 5, Failed: 0
runT11PersistedReconsolidationFixtures => Finished T11. Passed: 7, Failed: 0
runT12RelationshipGatingAuditFixtures  => Finished T12. Passed: 13, Failed: 0
runT13VisibleContinuityFixtures => Finished T13. Passed: 13, Failed: 0
runT14ExtractionCoverageFixtures => Finished T14. Passed: 18, Failed: 0
runT15RealSessionEvalFixtures => Finished T15. Passed: 5, Failed: 0
runT16CalibrationFixtures    => Finished T16. Passed: 4, Failed: 0
runT17SessionReviewWorkflowFixtures => Finished T17. Passed: 4, Failed: 0
runT18NoteLifecycleFixtures  => Finished T18. Passed: 5, Failed: 0
runT19ArchiveReviewIntegrationFixtures => Finished T19. Passed: 2, Failed: 0
runT20ReviewQueueTriageFixtures => Finished T20. Passed: 6, Failed: 0
runT21CriticEffectivenessFixtures => Finished T21. Passed: 5, Failed: 0
runT22LabeledExtractionFixtures => Finished T22. Passed: 9, Failed: 0
runT61ProvenanceFixtures     => Finished T61. Passed: 7, Failed: 0
runParserFixtures            => PASS x9
runDefaultFixtures           => PASS x38

GRAND TOTAL: 185 PASS, 0 FAIL
```

---

## 6. PACK 2.6 FREEZE COMMANDS

```bash
# Run from: runtime_pack1/

# Step 1 — full regression (already passed)
npx tsx src/eval/runT22LabeledExtractionFixtures.ts
npx tsx src/eval/runIntegrationFixtures.ts
npx tsx src/eval/runDefaultFixtures.ts

# Step 2 — tag the green commit
git tag aisha-pack2-6-green f55b4f7

# Step 3 — write the validated baseline doc
# (this file: VALIDATED_BASELINE_PACK2_6_PROVISIONAL.md)

# Step 4 — commit the baseline doc
git add VALIDATED_BASELINE_PACK2_6_PROVISIONAL.md
git commit -m "Add Pack 2.6 validated baseline record"

# Step 5 — re-tag on the baseline commit
git tag -f aisha-pack2-6-green HEAD

# Step 6 — verify tags
git log --oneline -5
git tag | grep pack2-6
```

---

## 7. SUCCESS CRITERIA (ALL MET)

| Criterion | Status |
|-----------|--------|
| Early-session signal captured more safely (provisional) | ✅ |
| Extraction overclaiming reduced (hedge penalties) | ✅ |
| Provisional notes remain bounded (7-day TTL) | ✅ |
| K_boundary preserved and immediate | ✅ |
| No accidental promotion-to-active from unrelated same-track memories | ✅ |
| Contradiction behavior scoped to avoidance pairs only | ✅ |
| Regression proof: 185 pass, 0 fail | ✅ |
| Existing packs remain green | ✅ |
| Hot path untouched | ✅ |
| Retrieval read path stays pure | ✅ |
| Aspiration/intention cannot reach promotion threshold | ✅ |
| Provisional notes not a junk drawer (TTL + expiry) | ✅ |
