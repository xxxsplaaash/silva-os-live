# Pack 4.0 Architecture Planning Memo

**Author:** Antigravity AI (Pack 4.0 planning turn)
**Date:** 2026-04-29
**Branch:** `pack4-0-architecture-planning`
**Status:** PLANNING ONLY — no runtime changes in this pack.

---

## 1. Goal

Define the highest-leverage architecture arc for Pack 4 after Pack 3 closeout, without reopening Pack 3 work, without promoting shadow retrieval, and without introducing speculative systems.

---

## 2. Locked Pack 3 Baseline Summary

| Layer | State |
| :--- | :--- |
| Deterministic memory (notes, episodes, threads) | LIVE — production-grade |
| Critic loop (bounded, re-retrieval, 2-cycle cap) | LIVE — wired in `buildProductionRuntime` |
| Reactive reconsolidation | LIVE — per-turn signal detection |
| Operator audit trail | LIVE — `auditTrail` array on `NoteRecord` |
| Associative retrieval | RESEARCH ONLY — shadow instrumented, not promoted |
| Trace consumption | RESEARCH ONLY — shadow instrumented, not promoted |
| Shadow evidence collection pipeline | COMPLETE — blocked pending live ops |
| `kPositionStore` | OPTIONAL at composition root — not wired in production |

---

## 3. What Pack 4 Must Not Reopen

- Shadow retrieval promotion (associative or trace) — requires live ops evidence first.
- Shadow instrumentation architecture (Packs 3.12–3.18) — locked.
- Pack 3 memory schema or `NoteRecord` fields — frozen.
- Speculative consciousness, neuroscience, or philosophical state models.
- Any product-facing features driven by unreviewed note data.

---

## 4. Candidate Pack 4 Arcs

### Arc A: Critic Loop Maturity
**What:** Implement the reserved `ungrounded_claim` critic issue type. Extend `evaluateText` to detect factual claims in generator output that lack a `sourceEpisodeId`-anchored note in the retrieval bundle. Harden the cycle-cap strategy (currently hard-coded to 2). Add targeted re-retrieval fallback when no note IDs are implicated.

**Leverage:** High. The critic loop runs on every production turn. Fixing `ungrounded_claim` closes the most significant known gap in the existing evaluation loop. No new infrastructure required.

**Risk:** Requires careful scoping of what counts as "grounded." Over-triggering will inflate critic cycle latency.

---

### Arc B: Semantic State Translation Hardening
**What:** The `CompoundStateEngine` and `PostureRouter` currently consume a `RegexSignalClassifier`. The `expressiveEnvelope` fields (`certainty`, `trust`, `valence`) drive the critic's `threshold_coherence_failure` check and the prompt's affective tone. The signal classifier is entirely regex-based and has no persistence or calibration across turns.

Hardening would: (1) replace regex signals with a per-session calibrated signal model using existing `calibrationSandbox.ts`; (2) persist `expressiveEnvelope` deltas in `StateSnapshotRecord` for turn-to-turn coherence; (3) close the gap where a single low-certainty turn can produce a critic finding even when the session trend is stable.

**Leverage:** Medium. Fixes silent misclassification in long sessions. The calibration sandbox already exists but is unused at runtime.

**Risk:** Calibration requires real session data to tune. Signals may regress if calibration parameters are set incorrectly. Needs evaluation fixtures before prod use.

---

### Arc C: Reconsolidation Persistence
**What:** `reactiveReconsolidation.ts` generates `PersistedReviewSignal` arrays per turn. These signals flag stale and contradicted notes. Currently the signals are passed into `INoteVersioning.persistReviewSignals`, but there is no cross-session aggregation or storage of how many times a note has been signaled. A note can accumulate 20 signals over 20 turns and still be flagged identically each time.

Hardening would: add a signal frequency count to `NoteRecord` (a lightweight `signalCount: number` field), gate note demotion thresholds to prevent false positives from single-turn noise, and add a `reviewSignalStore` to `ProcessTurnDeps`.

**Leverage:** Medium. Prevents compounding note instability from noisy reconsolidation in long sessions. Required before reconsolidation is trustworthy at scale.

**Risk:** Schema change to `NoteRecord`. Must be migration-safe (default `signalCount: 0`). Needs backward compat audit.

---

### Arc D: Operational Release Baseline
**What:** Produce a minimal production deployment baseline: Docker image, environment spec, health check endpoint, and a live smoke test that confirms the runtime processes a turn without error. No new feature work.

**Leverage:** Medium. Required before any real user traffic. Currently there is no deployment spec.

**Risk:** Low technical risk. High coordination overhead. Does not advance research capability.

---

### Arc E: Product-Facing Continuity Demo
**What:** Build a thin web UI that sends turns through the runtime and displays the structured output: state envelope, active notes surfaced, critic findings, and turn text. Research/demo only.

**Leverage:** Low. Useful for stakeholder demonstration but adds no production safety or capability.

**Risk:** Scope creep. UI will diverge from the engine unless maintained. Not the right priority immediately after a research-phase closeout.

---

## 5. Decision Criteria

| Criterion | Weight |
| :--- | :--- |
| Closes an existing known gap in live production turns | High |
| Requires no new infrastructure | High |
| Builds on already-existing locked components | High |
| Adds measurable safety or correctness to outputs | High |
| Requires live data to validate | Medium (acceptable if fixtures cover it) |
| Introduces new schema fields | Low (acceptable if migration-safe) |
| Requires live ops | Disqualifying for Pack 4.1 start |

---

## 6. Recommended Pack 4 Direction

**Primary arc: Arc A (Critic Loop Maturity) + Arc C (Reconsolidation Persistence)**

These two arcs are not in conflict. They share no overlapping code paths. Both can be sequenced as separate implementation packs within Pack 4 without risking each other.

**Rationale:**

- `ungrounded_claim` is the only reserved critic issue type not yet implemented. It is low-risk (returns empty findings today, so enabling it is strictly additive), high-value (reduces fabrication risk in generator output), and self-contained within `criticLoop.ts` and `evaluateText`.
- Reconsolidation persistence prevents a real failure mode: noisy per-turn signals that repeatedly flag healthy notes as stale in multi-session contexts. The fix is contained to `reactiveReconsolidation.ts`, a lightweight `NoteRecord` field addition, and a new fixture suite.

**Secondary arc (deferred, after Pack 4.1 and 4.2):** Arc B (Semantic State Translation Hardening). The calibration sandbox exists but needs real session data to tune safely. Defer until we have evidence from at least one real session run.

**Explicitly deferred:** Arc D (Deployment baseline) and Arc E (Demo UI). These are ops/product tasks that should be planned separately from the architecture pack sequence.

---

## 7. First Implementation Pack After Planning

**Pack 4.1 — `ungrounded_claim` Critic Issue Implementation**
- Branch: `pack4-1-ungrounded-claim-critic`
- Scope:
  1. Define what "grounded" means: a claim is grounded if the note bundle contains at least one `active` note whose `normalizedValue` or `canonicalText` is a substring match (case-insensitive, normalized) of the claim phrase extracted from the generator output.
  2. Implement `findUngroundedClaims(parsedText, retrieval)` inside `criticLoop.ts`.
  3. Wire it into `evaluateText` behind the existing try/catch guard.
  4. Do NOT trigger re-retrieval from `ungrounded_claim` findings (no note ID is implicated; it is a session-level finding only).
  5. Add T50 deterministic fixtures covering: clean grounded output, ungrounded claim detection, and critic cycle behavior when only `ungrounded_claim` fires.

**Pack 4.2 — Reconsolidation Signal Frequency Persistence**
- Branch: `pack4-2-reconsolidation-signal-frequency`
- Scope:
  1. Add `signalCount?: number` to `NoteRecord` (default: 0).
  2. Modify `reactiveReconsolidation` to increment signal count on each flag.
  3. Gate demotion signals: skip emitting a `PersistedReviewSignal` for a note that has been signaled fewer than N consecutive turns (proposed: N=2, configurable).
  4. Add T51 fixtures covering: first-signal suppression, threshold-crossing promotion, and cross-turn persistence.

---

## 8. Risks / Known Gaps

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| `findUngroundedClaims` over-triggers on short, vague output text | Medium | Threshold on claim phrase length (>= 4 tokens); fixture coverage before prod |
| `signalCount` schema change breaks existing `NoteRecord` fixtures | Low | Default `signalCount: 0` is additive; existing fixture data omits the field safely |
| Calibration sandbox (Arc B) mis-tunes in low-data environments | Medium | Keep arc B deferred until live session volume is available |
| `kPositionStore` remains unwired in production | Low | Acceptable until Arc B or retrieval promotion is unblocked |
| Shadow retrieval stays off-path indefinitely | Accepted | Not a Pack 4 concern; re-evaluate after live ops evidence exists |

---

## 9. Non-Goals

- Do NOT promote associative or trace retrieval in Pack 4.
- Do NOT reopen Pack 3 shadow infrastructure.
- Do NOT implement a product-facing UI or deployment pipeline in Pack 4.1 or 4.2.
- Do NOT add speculative cognitive or neuroscience-inspired models.
- Do NOT treat this memo as a promotion authorization for any shadow evidence.
- Do NOT implement Arc B (state translation hardening) until session calibration data exists.
