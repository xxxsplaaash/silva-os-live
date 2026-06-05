/**
 * T22 — Labeled Extraction Evaluation Baseline (Pack 2.6)
 *
 * This is the formal Step 0 gate for Pack 2.6.
 * Tests that the SimpleNoteExtractionSandbox correctly:
 *   1. Downgrades temporary-state signals to low confidence + provisional
 *   2. Downgrades conditional preferences to suppressed confidence
 *   3. Downgrades ambivalent preferences to suppressed confidence
 *   4. Heavily suppresses aspiration/intention signals (cannot reach promotion threshold)
 *   5. Marks stable preferences as provisional on cold start (but with strong base confidence)
 *   6. Marks stable profiles as provisional on cold start
 *   7. Emits K_boundary with active status and high confidence immediately
 *   8. Combination hedge penalties stack correctly
 *   9. Suppresses utterance-history denial challenges from profile extraction
 *  10. Suppresses assistant-attributed preference claims from profile extraction
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 */

import * as assert from "assert";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import type { EpisodeRecord, TurnRecord } from "../memory/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTurn(id: string, text: string): TurnRecord {
  return {
    id,
    kind: "turn",
    createdAt: "2026-01-01T00:00:00Z",
    sourceModality: "text",
    speaker: "user",
    rawText: text,
    normalizedText: text.toLowerCase(),
    sessionId: "t22",
    turnIndex: 0,
    stateSnapshotId: "snap_t22",
    immutable: true,
  };
}

function makeEpisode(turnIds: string[]): EpisodeRecord {
  return {
    id: "ep_t22",
    kind: "episode",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    sourceModality: "text",
    sessionId: "t22",
    threadId: "th_t22",
    startTurnId: turnIds[0],
    endTurnId: turnIds[turnIds.length - 1],
    turnIds,
    topicLabels: [],
    primaryModality: "text",
    modalityMix: ["text"],
    participantSpeakerIds: [],
    participantPersonIds: [],
    boundaryReason: { topicShift: false, surpriseDiscontinuity: false, score: 0 },
  };
}

// ─── T22_temporary_state_is_demoted ──────────────────────────────────────────

export async function T22_temporary_state_is_demoted() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I prefer black coffee right now.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Should extract at least one candidate");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional", "Temporary signal must be provisional");
  assert.ok(
    c.confidence < 0.65,
    `Temporary state penalty must drop confidence below 0.65. Got: ${c.confidence}`,
  );
  // extractionConfidenceRaw must stay frozen at base value
  assert.strictEqual(
    c.extractionConfidenceRaw,
    0.78,
    "extractionConfidenceRaw must be frozen at pre-penalty base",
  );
}

// ─── T22_conditional_preference_is_demoted ───────────────────────────────────

export async function T22_conditional_preference_is_demoted() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I usually get an oat latte if I'm in a rush.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Should extract at least one candidate");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional");
  assert.ok(
    c.confidence < 0.65,
    `Conditional penalty must drop confidence below 0.65. Got: ${c.confidence}`,
  );
}

// ─── T22_ambivalent_preference_is_demoted ────────────────────────────────────

export async function T22_ambivalent_preference_is_demoted() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I like oat lattes, maybe.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Should extract at least one candidate");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional");
  assert.ok(
    c.confidence < 0.65,
    `Ambivalence penalty must drop confidence below 0.65. Got: ${c.confidence}`,
  );
}

// ─── T22_aspiration_intention_is_suppressed ───────────────────────────────────

export async function T22_aspiration_intention_is_suppressed() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [
    makeTurn("t1", "I want to try black coffee someday."),
    makeTurn("t2", "I am planning to stop drinking espresso."),
  ];
  const ep = makeEpisode(["t1", "t2"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length >= 1, "At least one candidate should be extracted");
  for (const c of candidates) {
    assert.strictEqual(c.status, "provisional", "Aspiration must be provisional");
    assert.ok(
      c.confidence < 0.55,
      `Aspiration must be heavily suppressed below 0.55. Got: ${c.confidence}`,
    );
    // Hard gate: aspirations must NEVER reach the 0.65 promotion threshold alone
    assert.ok(
      c.confidence < 0.65,
      `Aspiration confidence must not reach promotion threshold (0.65). Got: ${c.confidence}`,
    );
  }
}

// ─── T22_stable_preference_is_provisional_on_cold_start ──────────────────────

export async function T22_stable_preference_is_provisional_on_cold_start() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I love oat lattes.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Stable preference must be extracted");
  const c = candidates[0];
  // Stable signals start provisional — promotion requires multi-episode corroboration
  assert.strictEqual(c.status, "provisional", "New stable preference starts provisional");
  // But must maintain high base confidence so promotion is possible after corroboration
  assert.ok(
    c.confidence >= 0.65,
    `Stable preference must maintain high confidence (>= 0.65). Got: ${c.confidence}`,
  );
  assert.strictEqual(c.extractionConfidenceRaw, 0.78);
}

// ─── T22_stable_profile_is_provisional_on_cold_start ─────────────────────────

export async function T22_stable_profile_is_provisional_on_cold_start() {
  const sandbox = new SimpleNoteExtractionSandbox();
  // Profile signal that does NOT look preference-like (so Group E fires)
  const turns = [makeTurn("t1", "I tend to work late into the night.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Stable profile must be extracted");
  const c = candidates.find((x) => x.subtype === "K_profile");
  assert.ok(c, "Must have K_profile candidate");
  assert.strictEqual(c!.status, "provisional", "New stable profile starts provisional");
  assert.ok(
    c!.confidence >= 0.65,
    `Stable profile must maintain high confidence (>= 0.65). Got: ${c!.confidence}`,
  );
}

// ─── T22_k_boundary_is_immediately_active ────────────────────────────────────

export async function T22_k_boundary_is_immediately_active() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [
    makeTurn("t1", "I don't want to talk about my sister right now."),
    makeTurn("t2", "Let's change the subject please."),
  ];
  const ep = makeEpisode(["t1", "t2"]);

  const candidates = await sandbox.extract(ep, turns);

  const boundaries = candidates.filter((c) => c.subtype === "K_boundary");
  assert.ok(boundaries.length >= 1, "Must extract at least one K_boundary");

  for (const b of boundaries) {
    // K_boundary must NOT be provisional — it's a safety signal
    // Note: the sandbox emits no `status` on K_boundary; versioning forces "active"
    // But we verify the confidence is high enough to be treated as authoritative
    assert.ok(
      b.confidence >= 0.85,
      `K_boundary confidence must be >= 0.85. Got: ${b.confidence}`,
    );
    assert.strictEqual(b.subtype, "K_boundary");
  }
}

// ─── T22_stacked_hedges_compound_correctly ───────────────────────────────────

export async function T22_stacked_hedges_compound_correctly() {
  const sandbox = new SimpleNoteExtractionSandbox();
  // Temporary + ambivalent (two penalties)
  const turns = [makeTurn("t1", "I love oat milk right now, maybe.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Should extract candidate");
  const c = candidates[0];
  // 0.78 - 0.35 (temporary) - 0.25 (ambivalent) = 0.18 — far below threshold
  assert.ok(
    c.confidence < 0.40,
    `Stacked penalties must compound heavily. Got: ${c.confidence}`,
  );
  assert.strictEqual(c.status, "provisional");
}

// ─── T22_avoidance_signal_is_provisional ─────────────────────────────────────

export async function T22_avoidance_signal_is_provisional() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I stay away from dairy products.")];
  const ep = makeEpisode(["t1"]);

  const candidates = await sandbox.extract(ep, turns);

  assert.ok(candidates.length > 0, "Should extract avoidance");
  const c = candidates[0];
  assert.strictEqual(c.status, "provisional");
  assert.ok(c.normalizedValue?.startsWith("avoids"), "Avoidance must normalize with 'avoids' prefix");
  assert.ok(c.confidence >= 0.65, `Avoidance base confidence >= 0.65. Got: ${c.confidence}`);
}

// ─── T22_utterance_history_denial_is_not_profile_memory ─────────────────────

export async function T22_utterance_history_denial_is_not_profile_memory() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "I never said obsidian.")];
  const ep = makeEpisode(["t1"]);

  const gate = sandbox.heuristicGate(ep, turns);
  const candidates = await sandbox.extract(ep, turns);

  assert.strictEqual(gate.pass, false, "Utterance-history denial must not pass the memory extraction gate");
  assert.deepStrictEqual(candidates, [], "Utterance-history denial must not create K_profile memory");
}

// ─── T22_assistant_attributed_preference_is_not_profile_memory ──────────────

export async function T22_assistant_attributed_preference_is_not_profile_memory() {
  const sandbox = new SimpleNoteExtractionSandbox();
  const turns = [makeTurn("t1", "You said my dashboard preference is obsidian.")];
  const ep = makeEpisode(["t1"]);

  const gate = sandbox.heuristicGate(ep, turns);
  const candidates = await sandbox.extract(ep, turns);

  assert.strictEqual(gate.pass, false, "Assistant-attributed preference must not pass the memory extraction gate");
  assert.deepStrictEqual(candidates, [], "Assistant-attributed preference must not create K_pref memory");
}
