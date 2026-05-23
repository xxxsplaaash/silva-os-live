# Pack 3.11 — Retrieval Promotion Decision Memo

**Branch:** `pack3-11-retrieval-promotion-decision`  
**Date:** 2026-04-26  
**Status:** DECISION PENDING — awaiting sign-off before any implementation proceeds

---

## 1. Goal

Decide whether the associative retrieval lane (Pack 3.9) and/or the trace
consumption lane (Pack 3.10) should be promoted beyond research status, and if
so, define the exact bounded conditions, guardrails, and evidence requirements
that must be satisfied before any promotion is committed to the production
runtime.

This memo is the authoritative gate document. No code may be merged into the
production hot path from `src/research/` without a promotion decision recorded
here and approved.

---

## 2. Locked Inputs

| Pack | Status | Scope |
|---|---|---|
| 3.5e | LOCKED | Obedience tactics — prompt-level, not retrieval |
| 3.6 | LOCKED | Multi-session truth eval — metrics layer only |
| 3.7 | LOCKED | Relationship-gated note acceptance |
| 3.8 | LOCKED | Operator audit trail |
| 3.9 | LOCKED | Associative retrieval — research lane only |
| 3.10 | LOCKED | Trace consumption — research lane only |

**Current production retrieval path:** `SimpleRetrievalPlanner` in
`src/memory/retrievalPlanner.ts`. Unchanged by Packs 3.9 and 3.10. Neither
research module has any import from or into production runtime files.

---

## 3. What Pack 3.9 Proved

### Proven

- A BFS graph-walk over `NoteLinkRecord[]` can surface notes beyond the
  `MAX_ACTIVE_NOTES=8` / `MAX_THREAD_EPISODES=3` baseline window.
- The walk can be safely bounded at `MAX_HOPS=2` with `LINK_STRENGTH_DECAY=0.7`
  without combinatorial explosion in test fixtures.
- `supersedes` and `blocks_reinference_for` relations can be deterministically
  excluded from traversal so stale/blocked content is not resurfaced.
- Cross-episode diversity metrics (`crossEpisodeDiversityRate`,
  `crossEpisodeHitCount`) are computable without LLM judge.
- All 13 T39 fixtures pass deterministically.
- The module is fully isolated: zero imports in production runtime files.

### NOT Proved by Pack 3.9

- That associative hits have higher precision than baseline hits on real session data.
- That cross-episode diversity improves note recall vs. simple recency ranking.
- That the graph walk does not surface contradictory notes more aggressively than
  the baseline contradiction lane already does.
- That `LINK_STRENGTH_DECAY=0.7` and `MAX_HOPS=2` are calibrated correctly for
  real note graphs (vs. the micro-fixtures used in T39).
- That the Jaccard-based score (`confidence × decayedStrength`) correlates with
  actual retrieval usefulness at inference time.
- That adding associative hits to the system prompt does not cause prompt token
  budget overflow in edge cases (dense note graphs, many active episodes).
- Latency: no hot-path timing data was collected.

---

## 4. What Pack 3.10 Proved

### Proven

- Deterministic regex-based label extraction from `TurnRecord.rawText` can
  classify `contradiction_signal`, `preference_assertion`, `preference_negation`,
  `stale_note_context`, and `relationship_signal` without LLM.
- Token-level Jaccard overlap (`MIN_OVERLAP=0.08`) can match trace events to
  notes with enough signal to classify `supports | contradicts | ambiguous`.
- `runTraceConsumption()` correctly partitions a note pool into supported /
  contradicted / orphaned categories using trace evidence.
- The `reviewDisambiguationRate` metric can identify whether trace evidence
  resolves `needs_review` notes — a direct Pack 3.7 integration point.
- Delta metrics (`contradictionRecoveryDeltaVsBaseline`,
  `contradictionRecoveryDeltaVsAssociative`) enable isolated measurement of the
  trace lane's marginal contribution over the other two baselines.
- All 19 T40 fixtures pass deterministically.
- The module is fully isolated from Pack 3.9: no cross-imports between the two
  research lanes.

### NOT Proved by Pack 3.10

- That `MIN_OVERLAP=0.08` is the correct threshold. Below this, matches are
  dropped; above this, noise may be introduced. Calibration is unknown on real
  session data.
- That regex label extraction is sufficient for adversarial or ambiguous user
  phrasing (sarcasm, hedged negations, implicit preferences).
- That the `noisePrecisionLossRate` remains below an acceptable bound on
  real session data. The T40 fixtures used clean, stereotyped language.
- That trace consumption improves on the baseline retrieval planner's existing
  contradiction lane (`listContradictionEvidence`), which is already in production.
- That consuming turn-level trace logs creates acceptable read latency when
  session logs are long (e.g. 50+ turns).
- That episode-level trace events (from `EpisodeRecord.summary`) are reliable
  enough to drive note review disambiguation — the `summary` field is optional
  and not always populated.
- Whether trace evidence causes more correct note rejections or more false
  contradictions when trust is high.

---

## 5. What Remains Unproven (Both Lanes)

The following gaps apply to both Pack 3.9 and Pack 3.10 and **cannot be resolved
without live or near-live session data**:

1. **Real graph density.** All fixtures used 3–5 note micro-graphs. Real
   sessions may have 30–80 active notes and 100+ links, producing graph walk
   behavior that was never exercised.

2. **Prompt token budget impact.** Neither lane was evaluated against the
   `MAX_ACTIVE_NOTES=8` cap in the baseline planner. Associative hits added on
   top of 8 baseline notes could push the system prompt past the token budget
   without a merged cap.

3. **Interaction with Pack 3.7 gating.** Notes in `needs_review` or `rejected`
   states are currently excluded from `listActiveNotes`. If an associative walk
   reaches a gated note via a `supports` link, the current filter would silently
   drop it. This edge case was not tested.

4. **Hot-path latency.** No timing measurements exist for either lane. If either
   is introduced into the retrieval path, it must not exceed the latency SLO
   for `processTurn`.

5. **Contradiction amplification risk.** Both lanes could surface more
   contradicting notes than the production contradiction lane currently does.
   More is not always better: surfacing an unresolved contradiction on every turn
   can degrade generation quality.

6. **No operator tuning.** Neither `LINK_STRENGTH_DECAY`, `MAX_HOPS`,
   `MIN_OVERLAP_THRESHOLD`, nor label regexes have been calibrated against
   real data. They are reasonable first-order guesses.

---

## 6. Candidate Promotion Options

### Option A — No Promotion (Keep Research-Lane Only)
Both lanes remain in `src/research/`. No code from either module is imported
into production runtime paths. Current baseline (`SimpleRetrievalPlanner`)
remains the sole production retrieval strategy.

### Option B — Shadow-Mode Promotion (Associative Only)
Associative retrieval is wired into `processTurn` in a shadow path: it runs
alongside the baseline, its results are logged to the operator audit trail (Pack
3.8), but its output is **not** injected into the retrieval bundle passed to the
generator. Latency and real-data precision can be measured without affecting
generation.

### Option C — Shadow-Mode Promotion (Trace Only)
Same as Option B but for trace consumption. `extractTraceEvent` runs on
`recentTurns` already available in the retrieval bundle; matches are logged but
not used. Real `noisePrecisionLossRate` can be measured on live data.

### Option D — Shadow-Mode Promotion (Both Lanes, Independent)
Options B and C simultaneously. Required if the goal is to measure whether trace
and associative lanes provide complementary or redundant value before choosing
which (if either) to promote further.

### Option E — Limited Live-Path Promotion (Contradiction Lane Only)
Only associative hits with `traversedRelations = ["contradicts"]` (backward
traversal) are injected into the `contradictionEvidence` lane of the retrieval
bundle, replacing or supplementing `listContradictionEvidence`. This is the
narrowest possible production touch: it touches only the contradiction evidence
lane, not `activeNotes`.

### Option F — Full Live-Path Promotion
One or both lanes are promoted to primary retrieval. **Excluded from
consideration in this memo** — unproven gaps in Sections 3, 4, and 5 make
this premature.

---

## 7. Decision Criteria

A lane may be promoted to **shadow mode** if all of the following are true:

- [ ] The module is import-safe: adding a shadow-mode call to `processTurn`
  does not modify any state, note record, or store.
- [ ] The shadow-mode call can be gated by a feature flag that defaults to OFF.
- [ ] The shadow-mode output is written only to the operator audit log (Pack 3.8
  `OperatorAuditEntry`), not injected into the retrieval bundle.
- [ ] The shadow call adds no more than **5ms** p99 latency to `processTurn`
  (measurable on the next 100 real sessions).
- [ ] The token budget of the retrieval bundle is provably unchanged
  (shadow output must not be serialized into the system prompt).

A lane may be promoted to **limited live-path** (contradiction lane injection
only) if all shadow-mode criteria above are satisfied AND:

- [ ] Shadow-mode data shows `contradictionRecoveryRate ≥ 0.80` on ≥ 20 real
  sessions with known contradictions.
- [ ] Shadow-mode data shows `noisePrecisionLossRate ≤ 0.25` on those same
  sessions.
- [ ] No prompt token budget overflow was observed during shadow mode.
- [ ] The Pack 3.7 gating edge case (associative walk reaching a
  `needs_review` / `rejected` note) has been explicitly handled and tested.
- [ ] An operator has reviewed at least 10 shadow-mode audit entries and
  confirmed the contradiction matches are accurate.

A lane may **not** be promoted to full live-path retrieval until limited
live-path criteria are met AND a separate Pack 3.12 decision gate is written.

---

## 8. Recommended Promotion Decision

**DECISION: Option D — Shadow-Mode Promotion of Both Lanes, Independent,
Feature-Flag-Gated, Defaulting OFF.**

Rationale:

1. Both lanes proved deterministic behavior in bounded fixtures. The next
   unknowns (real graph density, latency, noise on real data) cannot be resolved
   without running against real sessions.

2. Shadow mode is the minimal safe step that generates evidence to answer the
   open questions in Section 5 without affecting any user-visible behavior.

3. The two lanes must remain independently observable in shadow mode so their
   marginal contributions can be measured separately before any joint promotion
   is considered.

4. Trace-lane shadow mode is slightly higher priority because it can immediately
   measure `reviewDisambiguationRate` against Pack 3.7's `needs_review` notes —
   a direct operational question for the operator audit workflow.

5. Associative-lane shadow mode is lower priority because the production
   contradiction lane (`listContradictionEvidence`) already performs a similar
   function. If associative shadow data does not show ≥ 0.20 contradictionRecovery
   improvement over baseline, associative promotion is not justified.

**This decision does NOT approve:**
- Any injection into `activeNotes`, `supportingEpisodes`, or the generator prompt.
- Automatic promotion based on shadow-mode pass rate. A new Pack 3.12 decision
  gate is required before any live-path promotion.
- Hybrid or combined lane injection in the first shadow cycle.

---

## 9. Guardrails for Approved Shadow-Mode Promotion

The following constraints are **non-negotiable** for any Pack 3.12 implementation:

### 9.1 Feature Flag
```typescript
// In processTurn or retrieval bundle construction:
const SHADOW_ASSOCIATIVE = process.env.AISHA_SHADOW_ASSOCIATIVE === "1";
const SHADOW_TRACE = process.env.AISHA_SHADOW_TRACE === "1";
// Both default to OFF (false) in all environments.
```

### 9.2 Shadow Call Contract
- Shadow calls MUST be placed **after** the baseline `SimpleRetrievalPlanner.build()`
  completes and the retrieval bundle is finalized.
- Shadow calls MUST NOT modify `bundle.activeNotes`, `bundle.contradictionEvidence`,
  `bundle.supportingEpisodes`, or any field passed to the generator.
- Shadow calls MUST NOT write to `noteVersioning`, `turnStore`, `threadStore`,
  or any persistent store.
- Shadow calls MUST be wrapped in `try/catch`; any exception must be silently
  swallowed and logged — never allowed to propagate to the caller.

### 9.3 Audit Log Output
Shadow results MUST be written to a `ShadowAuditEntry` in the Pack 3.8 operator
audit log with `auditKind: "shadow_retrieval_research"`. At minimum include:
- `lane: "associative" | "trace"`
- `baselineNoteCount`
- `shadowHitCount`
- `contradictionRecoveryRateEstimate` (if ground truth is available)
- `estimatedTokenDelta` (difference in serialized token count vs. baseline bundle)
- `latencyMs`

### 9.4 Hard Latency Gate
If any shadow call exceeds **15ms wall time** on three consecutive turns, the
feature flag for that lane must be automatically disabled and an error logged.
Shadow mode must not degrade hot-path p99 latency under any circumstance.

### 9.5 Token Budget Enforcement
Shadow-mode output must be serialized in a separate field that the generator
prompt template does not consume. Token count of `bundle.activeNotes` must not
increase as a result of shadow mode.

### 9.6 Pack 3.7 Gating Boundary
Before the shadow implementation merges, the associative walk must add an
explicit filter:
```typescript
// In associativeWalk:
if (note.reviewState === "rejected") continue;
if (note.reinferencePolicy.mode === "block_auto_reinfer") continue;
```
This filter must be tested with a dedicated T42 fixture before merge.

---

## 10. Evidence Required Before Any Live-Path Promotion (Pack 3.12 Gate)

The following must be in hand before a Pack 3.12 live-path promotion decision
can be written:

| Requirement | Lane | Threshold |
|---|---|---|
| `contradictionRecoveryRate` on real sessions | Both | ≥ 0.80 |
| `noisePrecisionLossRate` on real sessions | Both | ≤ 0.25 |
| Shadow p99 latency per turn | Both | ≤ 5ms |
| Zero prompt token budget overflows observed | Both | 0 overflows |
| Operator-reviewed shadow audit entries | Both | ≥ 10 reviewed |
| Pack 3.7 gating edge case handled + T42 test | Associative | 100% pass |
| `reviewDisambiguationRate` on `needs_review` notes | Trace | ≥ 0.50 |
| `traceUtilisationRate` on real sessions | Trace | ≥ 0.30 |
| Real note graph size during shadow run (for graph-density validation) | Associative | Logged |
| Episode summary population rate (for trace episode events) | Trace | Logged |

None of these can be satisfied in deterministic test fixtures. All require
real session data collected during shadow mode operation.

---

## 11. Non-Goals

The following are explicitly excluded from Pack 3.11 and from any Pack 3.12
that might follow:

- **Embeddings or vector similarity.** No embedding-based retrieval is being
  considered. The research lanes use structural links and token overlap only.
- **LLM-as-judge for promotion decisions.** All metrics must remain machine-readable.
- **Personality, posture, or obedience changes.** Pack 3.5e is locked. This
  decision memo does not touch it.
- **Associative retrieval for relationship context.** The lanes are scoped to
  note recall and contradiction recovery. Relationship-state retrieval is a
  separate concern (Pack 3.7).
- **Trace replay or re-execution.** Trace events are read-only evidence. No
  turn is re-processed as a result of trace consumption.
- **Automatic promotion based on fixture pass rate.** Passing T39 and T40 is
  necessary but not sufficient for production promotion. Real-data evidence is
  required.
- **Combined hybrid lane injection in the first shadow cycle.** Lanes must be
  measured independently before any joint promotion is evaluated.
- **Pack 3.12 scope definition in this memo.** Pack 3.12 is gated on shadow
  data that does not yet exist. Its scope will be defined when the shadow data
  is available.
