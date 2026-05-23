/**
 * T14 — Extraction Coverage Fixtures (Pack 1.8)
 *
 * Validates extended heuristic extraction patterns for implied/behavioral
 * preference signal in the async note-extraction lane.
 *
 * Scenarios:
 *   1.  behavioral: "my go-to is X" extracts K_pref
 *   2.  behavioral: "I usually get X" extracts K_pref
 *   3.  behavioral: "I typically have X" extracts K_pref
 *   4.  behavioral: "I always order X" extracts K_pref
 *   5.  behavioral: "I start my day with X" extracts K_pref
 *   6.  avoidance: "I avoid X" extracts K_pref avoids X
 *   7.  avoidance: "I stay away from X" extracts K_pref avoids X
 *   8.  avoidance: "I gave up X" extracts K_pref avoids X
 *   9.  behavior-described: "I go for X" extracts K_pref (if preference-domain)
 *   10. behavior-described: "I'll have X" with drink domain extracts K_pref
 *   11. gate passes on implied-only turn (no explicit preference signal)
 *   12. gate still rejects pure ephemeral chatter even with implied-adjacent words
 *   13. behavioral extraction confidence is calibrated below explicit (< 0.78)
 *   14. avoidance confidence calibration (≥ 0.70, ≤ 0.78)
 *   15. deduplication: same implied preference extracted twice → one candidate
 *   16. explicit preference pattern still works alongside new patterns
 *   17. behavior-described without preference-domain content is NOT extracted
 *   18. provenance chain correctly set per pattern group
 *
 * All deterministic. No LLM calls. No Date.now() assertions.
 */

import * as assert from "assert";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import type { EpisodeRecord, TurnRecord } from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FIXED_TS = "2026-04-18T00:00:00.000Z";
const sandbox = new SimpleNoteExtractionSandbox();

function makeTurn(text: string, overrides: Partial<TurnRecord> = {}): TurnRecord {
  return {
    id: "t1",
    kind: "turn",
    createdAt: FIXED_TS,
    sourceModality: "text",
    sessionId: "sess_t14",
    turnIndex: 0,
    speaker: "user",
    rawText: text,
    stateSnapshotId: "snap1",
    entityMentions: [],
    immutable: true,
    ...overrides,
  };
}

function makeEpisode(id = "ep_t14"): EpisodeRecord {
  return {
    id,
    kind: "episode",
    sessionId: "sess_t14",
    turnIds: ["t1"],
    threadId: "thread_t14",
    primaryModality: "text",
    createdAt: FIXED_TS,
    updatedAt: FIXED_TS,
  };
}

// ─── T14_behavioral_go_to_is ──────────────────────────────────────────────────

export async function T14_behavioral_go_to_is() {
  const episode = makeEpisode();
  const turns = [makeTurn("My go-to is oat lattes.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("oat latte"),
  );
  assert.ok(found, `Expected K_pref for "oat lattes" from "my go-to is".\nGot: ${JSON.stringify(candidates)}`);
  assert.strictEqual(found.provenanceChain[0], "heuristic_behavioral_pattern");
}

// ─── T14_behavioral_usually_get ──────────────────────────────────────────────

export async function T14_behavioral_usually_get() {
  const episode = makeEpisode();
  const turns = [makeTurn("I usually get a cappuccino.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("cappuccino"),
  );
  assert.ok(found, `Expected K_pref for "cappuccino" from "I usually get".\nGot: ${JSON.stringify(candidates)}`);
  assert.strictEqual(found.provenanceChain[0], "heuristic_behavioral_pattern");
}

// ─── T14_behavioral_typically_have ───────────────────────────────────────────

export async function T14_behavioral_typically_have() {
  const episode = makeEpisode();
  const turns = [makeTurn("I typically have green tea in the afternoons.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("green tea"),
  );
  assert.ok(found, `Expected K_pref for "green tea" from "I typically have".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_behavioral_always_order ─────────────────────────────────────────────

export async function T14_behavioral_always_order() {
  const episode = makeEpisode();
  const turns = [makeTurn("I always order a flat white when I'm there.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("flat white"),
  );
  assert.ok(found, `Expected K_pref for "flat white" from "I always order".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_behavioral_start_my_day_with ────────────────────────────────────────

export async function T14_behavioral_start_my_day_with() {
  const episode = makeEpisode();
  const turns = [makeTurn("I start my day with black coffee.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("black coffee"),
  );
  assert.ok(found, `Expected K_pref for "black coffee" from "I start my day with".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_avoidance_i_avoid ────────────────────────────────────────────────────

export async function T14_avoidance_i_avoid() {
  const episode = makeEpisode();
  const turns = [makeTurn("I avoid dairy these days.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" &&
    c.canonicalText.toLowerCase().includes("avoids") &&
    c.canonicalText.toLowerCase().includes("dairy"),
  );
  assert.ok(found, `Expected K_pref avoids dairy from "I avoid".\nGot: ${JSON.stringify(candidates)}`);
  assert.strictEqual(found.provenanceChain[0], "heuristic_avoidance_pattern");
}

// ─── T14_avoidance_stay_away_from ────────────────────────────────────────────

export async function T14_avoidance_stay_away_from() {
  const episode = makeEpisode();
  const turns = [makeTurn("I stay away from gluten now.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("avoids"),
  );
  assert.ok(found, `Expected K_pref avoids from "I stay away from".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_avoidance_gave_up ────────────────────────────────────────────────────

export async function T14_avoidance_gave_up() {
  const episode = makeEpisode();
  const turns = [makeTurn("I gave up espresso shots a while back.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("avoids"),
  );
  assert.ok(found, `Expected K_pref avoids from "I gave up".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_behavior_described_go_for_drink ─────────────────────────────────────

export async function T14_behavior_described_go_for_drink() {
  const episode = makeEpisode();
  const turns = [makeTurn("I go for tea every time.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("tea"),
  );
  assert.ok(found, `Expected K_pref for tea from "I go for tea".\nGot: ${JSON.stringify(candidates)}`);
  assert.strictEqual(found.provenanceChain[0], "heuristic_behavior_described_pattern");
}

// ─── T14_behavior_described_ill_have_coffee ──────────────────────────────────

export async function T14_behavior_described_ill_have_coffee() {
  const episode = makeEpisode();
  const turns = [makeTurn("I'll have coffee.")];
  const candidates = await sandbox.extract(episode, turns);

  const found = candidates.find((c) =>
    c.subtype === "K_pref" && c.canonicalText.toLowerCase().includes("coffee"),
  );
  assert.ok(found, `Expected K_pref for coffee from "I'll have coffee".\nGot: ${JSON.stringify(candidates)}`);
}

// ─── T14_gate_passes_implied_only ────────────────────────────────────────────

export async function T14_gate_passes_implied_only() {
  const episode = makeEpisode();
  const turns = [makeTurn("My go-to is black coffee.")];
  const gate = sandbox.heuristicGate(episode, turns);

  assert.ok(
    gate.pass,
    `Expected heuristic gate to pass on implied preference turn ("My go-to is black coffee").\nGot: ${JSON.stringify(gate)}`,
  );
  assert.ok(
    gate.reasons.includes("implied_preference_signal"),
    `Expected reasons to include "implied_preference_signal".\nGot: ${JSON.stringify(gate.reasons)}`,
  );
}

// ─── T14_gate_rejects_pure_ephemeral_chatter ─────────────────────────────────

export async function T14_gate_rejects_pure_ephemeral_chatter() {
  const episode = makeEpisode();
  const turns = [makeTurn("ok"), makeTurn("cool"), makeTurn("thanks")].map(
    (t, i) => ({ ...t, id: `t_ephem_${i}` }),
  );
  const gate = sandbox.heuristicGate(episode, turns);

  assert.ok(
    !gate.pass,
    `Expected heuristic gate to reject pure ephemeral chatter.\nGot: ${JSON.stringify(gate)}`,
  );
}

// ─── T14_behavioral_confidence_below_explicit ────────────────────────────────

export async function T14_behavioral_confidence_below_explicit() {
  const episode = makeEpisode();
  const turns = [makeTurn("I usually get a flat white.")];
  const candidates = await sandbox.extract(episode, turns);

  const behavioral = candidates.find((c) =>
    c.provenanceChain[0] === "heuristic_behavioral_pattern",
  );
  assert.ok(behavioral, `Expected a behavioral pattern candidate.\nGot: ${JSON.stringify(candidates)}`);
  assert.ok(
    behavioral.confidence < 0.78,
    `Behavioral pattern confidence must be < 0.78 (explicit baseline). Got ${behavioral.confidence}`,
  );
  assert.ok(
    behavioral.confidence >= 0.65,
    `Behavioral pattern confidence must be >= 0.65 (joint gate minimum). Got ${behavioral.confidence}`,
  );
}

// ─── T14_avoidance_confidence_calibration ────────────────────────────────────

export async function T14_avoidance_confidence_calibration() {
  const episode = makeEpisode();
  const turns = [makeTurn("I avoid sugar.")];
  const candidates = await sandbox.extract(episode, turns);

  const avoidance = candidates.find((c) =>
    c.provenanceChain[0] === "heuristic_avoidance_pattern",
  );
  assert.ok(avoidance, `Expected an avoidance pattern candidate.\nGot: ${JSON.stringify(candidates)}`);
  assert.ok(
    avoidance.confidence >= 0.70 && avoidance.confidence <= 0.78,
    `Avoidance pattern confidence must be in [0.70, 0.78]. Got ${avoidance.confidence}`,
  );
}

// ─── T14_deduplication_same_implied_twice ────────────────────────────────────

export async function T14_deduplication_same_implied_twice() {
  const episode = makeEpisode();
  // Two turns saying the same thing in two different implied patterns
  const turns = [
    makeTurn("My go-to is oat lattes.", { id: "t1" }),
    makeTurn("I usually get oat lattes.", { id: "t2" }),
  ];
  const candidates = await sandbox.extract(episode, turns);

  const oatLatteCandidates = candidates.filter((c) =>
    c.canonicalText.toLowerCase().includes("oat latte"),
  );

  assert.ok(
    oatLatteCandidates.length <= 1,
    `Expected deduplication to collapse duplicate "oat latte" candidates. Got ${oatLatteCandidates.length}: ${JSON.stringify(oatLatteCandidates)}`,
  );
}

// ─── T14_explicit_still_works_alongside_new ──────────────────────────────────

export async function T14_explicit_still_works_alongside_new() {
  const episode = makeEpisode();
  const turns = [
    makeTurn("I love oat lattes. My go-to is a flat white when I'm in a hurry.", { id: "t1" }),
  ];
  const candidates = await sandbox.extract(episode, turns);

  const explicit = candidates.find((c) =>
    c.provenanceChain[0] === "heuristic_preference_pattern" &&
    c.canonicalText.toLowerCase().includes("oat latte"),
  );
  const behavioral = candidates.find((c) =>
    c.provenanceChain[0] === "heuristic_behavioral_pattern" &&
    c.canonicalText.toLowerCase().includes("flat white"),
  );

  assert.ok(
    explicit,
    `Expected explicit preference candidate for "oat lattes".\nGot: ${JSON.stringify(candidates)}`,
  );
  assert.ok(
    behavioral,
    `Expected behavioral preference candidate for "flat white".\nGot: ${JSON.stringify(candidates)}`,
  );
}

// ─── T14_behavior_described_non_domain_not_extracted ─────────────────────────

export async function T14_behavior_described_non_domain_not_extracted() {
  // "I'll get the report done" — matches I'll get but NOT preference-domain → should not extract
  const episode = makeEpisode();
  const turns = [makeTurn("I'll get the report done by tomorrow.")];
  const candidates = await sandbox.extract(episode, turns);

  const behaviorDesc = candidates.find((c) =>
    c.provenanceChain[0] === "heuristic_behavior_described_pattern",
  );

  assert.ok(
    !behaviorDesc,
    `Expected non-domain behavior-described text NOT to produce a K_pref candidate.\nGot: ${JSON.stringify(candidates)}`,
  );
}

// ─── T14_provenance_chain_per_group ──────────────────────────────────────────

export async function T14_provenance_chain_per_group() {
  const episode = makeEpisode();

  // One turn that exercises all four pattern groups
  const turns = [
    makeTurn("I love espresso. My go-to is oat milk. I avoid sugar. I'll go for tea.", { id: "t1" }),
  ];
  const candidates = await sandbox.extract(episode, turns);

  const hasExplicit = candidates.some((c) => c.provenanceChain[0] === "heuristic_preference_pattern");
  const hasBehavioral = candidates.some((c) => c.provenanceChain[0] === "heuristic_behavioral_pattern");
  const hasAvoidance = candidates.some((c) => c.provenanceChain[0] === "heuristic_avoidance_pattern");
  const hasBehaviorDesc = candidates.some((c) => c.provenanceChain[0] === "heuristic_behavior_described_pattern");

  assert.ok(hasExplicit, `Expected heuristic_preference_pattern provenance. Got: ${JSON.stringify(candidates.map((c) => c.provenanceChain))}`);
  assert.ok(hasBehavioral, `Expected heuristic_behavioral_pattern provenance. Got: ${JSON.stringify(candidates.map((c) => c.provenanceChain))}`);
  assert.ok(hasAvoidance, `Expected heuristic_avoidance_pattern provenance. Got: ${JSON.stringify(candidates.map((c) => c.provenanceChain))}`);
  assert.ok(hasBehaviorDesc, `Expected heuristic_behavior_described_pattern provenance. Got: ${JSON.stringify(candidates.map((c) => c.provenanceChain))}`);
}
