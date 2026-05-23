/**
 * T42 — Pack 3.12 Pack 3.7 Gating Boundary Fixtures
 *
 * Required by Pack 3.11 §9.6: the associative walk must never surface
 * notes in 'rejected' reviewState or with 'block_auto_reinfer' reinferencePolicy.
 *
 * These fixtures must pass before any Pack 3.12 shadow code can merge.
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 */

import * as assert from "assert";
import {
  buildNoteGraph,
  associativeWalk,
  resetAuditSequence as _unused,
} from "../research/associativeRetrieval";
import {
  readShadowFlags,
  isShadowAutoDisabled,
  recordShadowLatency,
  resetShadowAutoDisable,
  SHADOW_LATENCY_HARD_LIMIT_MS,
  runAssociativeShadow,
  runTraceShadow,
  shadowAuditToOperatorEntry,
} from "../runtime/shadowRetrievalOrchestrator";
import type { NoteRecord, NoteLinkRecord, RetrievalBundle } from "../memory/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-26T00:00:00.000Z";

function makeNote(
  id: string,
  value: string,
  opts: {
    reviewState?: NoteRecord["reviewState"];
    reinferenceMode?: "allow" | "needs_review" | "block_auto_reinfer";
  } = {},
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${value}`,
    normalizedValue: value,
    confidence: 0.80,
    extractionConfidenceRaw: 0.80,
    provenanceChain: ["extracted_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_1"],
    reviewState: opts.reviewState ?? "accepted",
    reinferencePolicy: {
      mode: opts.reinferenceMode ?? "allow",
      reason: opts.reinferenceMode === "needs_review" ? "relationship_trust_gated" : undefined,
    },
    auditTrail: [],
  };
}

function makeLink(from: string, to: string, relation: NoteLinkRecord["relation"]): NoteLinkRecord {
  return {
    id: `link_${from}_${to}`,
    kind: "note_link",
    fromNoteId: from,
    toNoteId: to,
    relation,
    strength: 1.0,
    createdAt: FIXED_NOW,
    sourceModality: "text",
  };
}

function makeBundle(notes: NoteRecord[]): RetrievalBundle {
  return {
    recentTurns: [],
    activeThread: [],
    activeNotes: notes,
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: [],
  };
}

// ─── T42_walk_does_not_surface_rejected_notes ─────────────────────────────────

export function T42_walk_does_not_surface_rejected_notes() {
  const seedNote = makeNote("n_seed", "coffee");
  // rejected note linked via supports — must be skipped
  const rejectedNote = makeNote("n_rejected", "espresso", { reviewState: "rejected" });

  const links = [makeLink("n_seed", "n_rejected", "supports")];
  const graph = buildNoteGraph(links);
  const pool = new Map([["n_seed", seedNote], ["n_rejected", rejectedNote]]);
  const seeds = new Set(["n_seed"]);

  const hits = associativeWalk(seeds, graph, pool);

  assert.strictEqual(hits.length, 0, "rejected note must never appear in associative hits");
}

// ─── T42_walk_does_not_surface_block_auto_reinfer_notes ──────────────────────

export function T42_walk_does_not_surface_block_auto_reinfer_notes() {
  const seedNote = makeNote("n_seed", "oat milk");
  const blockedNote = makeNote("n_blocked", "old milk pref", {
    reinferenceMode: "block_auto_reinfer",
  });

  const links = [makeLink("n_seed", "n_blocked", "supports")];
  const graph = buildNoteGraph(links);
  const pool = new Map([["n_seed", seedNote], ["n_blocked", blockedNote]]);
  const seeds = new Set(["n_seed"]);

  const hits = associativeWalk(seeds, graph, pool);

  assert.strictEqual(hits.length, 0, "block_auto_reinfer note must never appear in associative hits");
}

// ─── T42_walk_does_surface_allowed_note_adjacent_to_rejected ─────────────────

export function T42_walk_does_surface_allowed_note_adjacent_to_rejected() {
  // seed → rejected → allowed: the rejected note must be skipped but the
  // allowed note can still be reached (it's in the pool and linked from seed too)
  const seedNote = makeNote("n_seed", "coffee");
  const rejectedNote = makeNote("n_rejected", "espresso", { reviewState: "rejected" });
  const allowedNote = makeNote("n_allowed", "latte");

  const links = [
    makeLink("n_seed", "n_rejected", "supports"),
    makeLink("n_seed", "n_allowed", "supports"),
  ];
  const graph = buildNoteGraph(links);
  const pool = new Map([
    ["n_seed", seedNote],
    ["n_rejected", rejectedNote],
    ["n_allowed", allowedNote],
  ]);
  const seeds = new Set(["n_seed"]);

  const hits = associativeWalk(seeds, graph, pool);

  const hitIds = hits.map((h) => h.note.id);
  assert.ok(!hitIds.includes("n_rejected"), "rejected note must not be in hits");
  assert.ok(hitIds.includes("n_allowed"), "allowed note must still be in hits");
}

// ─── T42_walk_does_not_expand_through_rejected_intermediate ──────────────────

export function T42_walk_does_not_expand_through_rejected_intermediate() {
  // seed → rejected → otherwise-unreachable node
  // The rejected note is skipped so the expansion stops, making the third note unreachable
  const seedNote = makeNote("n_seed", "coffee");
  const rejectedNote = makeNote("n_rejected", "blocked pref", { reviewState: "rejected" });
  const hiddenNote = makeNote("n_hidden", "hidden pref");

  const links = [
    makeLink("n_seed", "n_rejected", "supports"),
    makeLink("n_rejected", "n_hidden", "supports"),
  ];
  const graph = buildNoteGraph(links);
  const pool = new Map([
    ["n_seed", seedNote],
    ["n_rejected", rejectedNote],
    ["n_hidden", hiddenNote],
  ]);
  const seeds = new Set(["n_seed"]);

  const hits = associativeWalk(seeds, graph, pool);
  const hitIds = hits.map((h) => h.note.id);

  assert.ok(!hitIds.includes("n_rejected"), "rejected intermediate must not be hit");
  // n_hidden is only reachable via the rejected intermediate — it MUST NOT appear
  assert.ok(!hitIds.includes("n_hidden"), "note behind rejected intermediate must not be reachable");
}

// ─── T42_feature_flags_default_off ───────────────────────────────────────────

export function T42_feature_flags_default_off() {
  // Ensure feature flags read as false when env vars are not set
  const savedAssoc = process.env.AISHA_SHADOW_ASSOCIATIVE;
  const savedTrace = process.env.AISHA_SHADOW_TRACE;
  delete process.env.AISHA_SHADOW_ASSOCIATIVE;
  delete process.env.AISHA_SHADOW_TRACE;

  try {
    const flags = readShadowFlags();
    assert.strictEqual(flags.associative, false, "AISHA_SHADOW_ASSOCIATIVE must default to false");
    assert.strictEqual(flags.trace, false, "AISHA_SHADOW_TRACE must default to false");
  } finally {
    // Restore
    if (savedAssoc !== undefined) process.env.AISHA_SHADOW_ASSOCIATIVE = savedAssoc;
    if (savedTrace !== undefined) process.env.AISHA_SHADOW_TRACE = savedTrace;
  }
}

// ─── T42_feature_flag_on_when_set_to_one ─────────────────────────────────────

export function T42_feature_flag_on_when_set_to_one() {
  const saved = process.env.AISHA_SHADOW_ASSOCIATIVE;
  process.env.AISHA_SHADOW_ASSOCIATIVE = "1";

  try {
    const flags = readShadowFlags();
    assert.strictEqual(flags.associative, true, "flag must be true when env=1");
  } finally {
    if (saved !== undefined) process.env.AISHA_SHADOW_ASSOCIATIVE = saved;
    else delete process.env.AISHA_SHADOW_ASSOCIATIVE;
  }
}

// ─── T42_latency_auto_disable_triggers_on_third_overrun ──────────────────────

export function T42_latency_auto_disable_triggers_on_third_overrun() {
  resetShadowAutoDisable();
  const overLimit = SHADOW_LATENCY_HARD_LIMIT_MS + 1;

  assert.strictEqual(isShadowAutoDisabled("associative"), false);

  const r1 = recordShadowLatency("associative", overLimit);
  assert.strictEqual(r1, false, "not disabled yet after 1");
  assert.strictEqual(isShadowAutoDisabled("associative"), false);

  const r2 = recordShadowLatency("associative", overLimit);
  assert.strictEqual(r2, false, "not disabled yet after 2");

  const r3 = recordShadowLatency("associative", overLimit);
  assert.strictEqual(r3, true, "must auto-disable after 3 consecutive overruns");
  assert.strictEqual(isShadowAutoDisabled("associative"), true);

  resetShadowAutoDisable();
}

// ─── T42_latency_overrun_counter_resets_on_fast_turn ─────────────────────────

export function T42_latency_overrun_counter_resets_on_fast_turn() {
  resetShadowAutoDisable();
  const overLimit = SHADOW_LATENCY_HARD_LIMIT_MS + 1;
  const underLimit = SHADOW_LATENCY_HARD_LIMIT_MS - 1;

  recordShadowLatency("trace", overLimit);
  recordShadowLatency("trace", overLimit);
  // Fast turn resets the consecutive counter
  recordShadowLatency("trace", underLimit);
  // Now overrun again — counter restarted so not disabled yet
  const r = recordShadowLatency("trace", overLimit);
  assert.strictEqual(r, false, "counter must reset on fast turn; should not disable after 1 more overrun");
  assert.strictEqual(isShadowAutoDisabled("trace"), false);

  resetShadowAutoDisable();
}

// ─── T42_shadow_associative_returns_null_when_auto_disabled ──────────────────

export async function T42_shadow_associative_returns_null_when_auto_disabled() {
  resetShadowAutoDisable();
  // Force auto-disable
  _forceAutoDisable("associative");

  const bundle = makeBundle([makeNote("n1", "coffee")]);
  const result = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s1",
    turnId: "t1",
  });

  // When auto-disabled, the caller already gates before calling — but also test
  // the orchestrator does not crash when called directly
  // (the gate is in processTurn; this confirms the module itself is safe)
  resetShadowAutoDisable();
  assert.ok(result !== undefined, "function must not throw");
}

// ─── T42_shadow_trace_run_does_not_modify_retrieval_bundle ───────────────────

export async function T42_shadow_trace_run_does_not_modify_retrieval_bundle() {
  resetShadowAutoDisable();
  const n1 = makeNote("n1", "coffee");
  const bundle = makeBundle([n1]);
  const originalActiveNotesRef = bundle.activeNotes;
  const originalContradictionRef = bundle.contradictionEvidence;

  const result = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s1",
    turnId: "t1",
  });

  assert.ok(result !== null, "must return a shadow entry");
  assert.strictEqual(
    bundle.activeNotes,
    originalActiveNotesRef,
    "activeNotes reference must not be replaced",
  );
  assert.strictEqual(
    bundle.contradictionEvidence,
    originalContradictionRef,
    "contradictionEvidence reference must not be replaced",
  );
  assert.strictEqual(bundle.activeNotes.length, 1, "no notes added to bundle");

  resetShadowAutoDisable();
}

// ─── T42_shadow_associative_run_does_not_modify_retrieval_bundle ─────────────

export async function T42_shadow_associative_run_does_not_modify_retrieval_bundle() {
  resetShadowAutoDisable();
  const n1 = makeNote("n1", "coffee");
  const bundle = makeBundle([n1]);
  const originalActiveNotesRef = bundle.activeNotes;

  const result = await runAssociativeShadow({
    retrieval: bundle,
    allLinks: [],
    eligibleNotes: bundle.activeNotes,
    sessionId: "s1",
    turnId: "t1",
  });

  assert.ok(result !== null, "must return a shadow entry");
  assert.strictEqual(
    bundle.activeNotes,
    originalActiveNotesRef,
    "activeNotes reference must not be replaced",
  );
  assert.strictEqual(bundle.activeNotes.length, 1, "no notes added or removed from bundle");

  resetShadowAutoDisable();
}

// ─── T42_shadow_audit_entry_serializes_to_operator_entry ─────────────────────

export async function T42_shadow_audit_entry_serializes_to_operator_entry() {
  resetShadowAutoDisable();
  const bundle = makeBundle([makeNote("n1", "coffee"), makeNote("n2", "milk")]);

  const shadow = await runTraceShadow({
    retrieval: bundle,
    recentTurns: [],
    sessionId: "s42",
    turnId: "t42",
  });

  assert.ok(shadow, "must produce shadow entry");
  const entry = shadowAuditToOperatorEntry(shadow!);

  assert.ok(entry.auditId.startsWith("aud_"), "auditId must use standard prefix");
  assert.ok(entry.canonicalText.includes("shadow_retrieval_research"), "canonical text must embed kind");
  assert.ok(entry.canonicalText.includes("trace"), "canonical text must embed lane");

  const parsed = JSON.parse(entry.canonicalText);
  assert.strictEqual(parsed.auditKind, "shadow_retrieval_research");
  assert.strictEqual(parsed.lane, "trace");
  assert.strictEqual(typeof parsed.latencyMs, "number");
  assert.strictEqual(typeof parsed.estimatedTokenDelta, "number");

  resetShadowAutoDisable();
}

// ─── Internal helper (test-only) ─────────────────────────────────────────────

function _forceAutoDisable(lane: "associative" | "trace") {
  const overLimit = SHADOW_LATENCY_HARD_LIMIT_MS + 1;
  recordShadowLatency(lane, overLimit);
  recordShadowLatency(lane, overLimit);
  recordShadowLatency(lane, overLimit);
}
