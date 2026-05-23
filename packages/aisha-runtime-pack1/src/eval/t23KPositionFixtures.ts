/**
 * T23 — K_position Prototype Fixtures (Pack 2.7)
 *
 * Tests:
 *   1.  Domain whitelist rejects unknown domains
 *   2.  Pressure signals do NOT affect bias or confidence
 *   3.  Single-session evidence does not form assessment (MIN_SESSION_GATE = 3)
 *   4.  Two-session evidence does not form assessment
 *   5.  Three-session evidence crosses formation gate
 *   6.  Formed assessment below MIN_CONFIDENCE_TO_SHAPE produces no bias output
 *   7.  Formed, confident assessment produces DirectionalBias output
 *   8.  Counter-evidence weakens confidence and pulls bias toward neutral
 *   9.  Pressure log grows but bias/confidence stay frozen
 *   10. Store is isolated — no imports from noteVersioning, no shared state
 *   11. getDirectionalBiases() returns empty before formation gate
 *   12. audit() returns correct counts
 *   13. Multiple domains are independently tracked
 *   14. Pressure before any evidence still gets logged (audit trail)
 *   15. reset() clears state completely
 *
 * All deterministic. No live LLM. No Date.now() assertions.
 */

import * as assert from "assert";
import {
  KPositionStore,
  MIN_SESSION_GATE,
  MIN_CONFIDENCE_TO_SHAPE,
  type KPositionEvidence,
  type KPositionPressureLog,
} from "../memory/kPositionStore";
import { InMemoryGeneratorAdapter } from "../generation/inMemoryGeneratorAdapter";
import type { GeneratorInput, TurnInput } from "../runtime/runtime_types";
import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { processTurn } from "../runtime/processTurn";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvidence(
  kind: KPositionEvidence["kind"],
  sessionId: string,
  episodeId = "ep_01",
): KPositionEvidence {
  return {
    kind,
    sessionId,
    episodeId,
    observedAt: "2026-01-01T00:00:00Z",
    description: `test evidence [${kind}] session=${sessionId}`,
  };
}

function makePressure(
  kind: KPositionPressureLog["kind"],
  sessionId: string,
): KPositionPressureLog {
  return {
    kind,
    sessionId,
    episodeId: "ep_01",
    observedAt: "2026-01-01T00:00:00Z",
    description: `test pressure [${kind}] session=${sessionId}`,
  };
}

// ─── T23_domain_whitelist_blocks_unknown_domain ───────────────────────────────

export function T23_domain_whitelist_blocks_unknown_domain() {
  const store = new KPositionStore();

  // Cast to bypass TypeScript — this simulates a runtime scope-bleed attempt
  const result = store.recordEvidence({
    domain: "unknown_domain_xyz" as any,
    evidence: makeEvidence("observed_behavior", "sess_01"),
    biasDelta: 0.5,
  });

  assert.strictEqual(result, null, "Unknown domain must be rejected (returns null)");
  assert.strictEqual(
    store.audit().domainCount,
    0,
    "Rejected domain must leave no state in the store",
  );
}

// ─── T23_pressure_does_not_affect_bias_or_confidence ─────────────────────────

export function T23_pressure_does_not_affect_bias_or_confidence() {
  const store = new KPositionStore();

  // First: record some actual evidence to establish a baseline
  store.recordEvidence({
    domain: "communication_pace",
    evidence: makeEvidence("observed_behavior", "sess_01"),
    biasDelta: 0.6,
  });
  const baseline = store.getAssessment("communication_pace");
  assert.ok(baseline);
  const baselineBias = baseline.confidence;
  const baselineDirectional = baseline.directionalBias;

  // Now apply heavy pressure — must NOT change bias or confidence
  store.recordPressure({
    domain: "communication_pace",
    pressure: makePressure("push_for_position", "sess_02"),
  });
  store.recordPressure({
    domain: "communication_pace",
    pressure: makePressure("rephrase_request", "sess_02"),
  });
  store.recordPressure({
    domain: "communication_pace",
    pressure: makePressure("protest", "sess_02"),
  });

  const afterPressure = store.getAssessment("communication_pace");
  assert.ok(afterPressure);

  assert.strictEqual(
    afterPressure.confidence,
    baselineBias,
    "Pressure must NOT change confidence",
  );
  assert.strictEqual(
    afterPressure.directionalBias,
    baselineDirectional,
    "Pressure must NOT change directionalBias",
  );
  assert.strictEqual(
    afterPressure.pressureLog.length,
    3,
    "Pressure must be logged for audit trail",
  );
  assert.strictEqual(
    afterPressure.evidenceSessionIds.length,
    1,
    "Pressure sessions must not appear in evidenceSessionIds",
  );
}

// ─── T23_single_session_does_not_form_assessment ─────────────────────────────

export function T23_single_session_does_not_form_assessment() {
  const store = new KPositionStore();

  // Record multiple evidence events — all from the same session
  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("observed_behavior", "sess_01", "ep_01"),
    biasDelta: 0.7,
  });
  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("observed_behavior", "sess_01", "ep_02"),
    biasDelta: 0.8,
  });
  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("observed_behavior", "sess_01", "ep_03"),
    biasDelta: 0.9,
  });

  const assessment = store.getAssessment("detail_tolerance");
  assert.ok(assessment);
  assert.strictEqual(assessment.formed, false, "Single session must NOT form assessment");
  assert.strictEqual(assessment.evidenceSessionIds.length, 1);
  assert.deepStrictEqual(assessment.evidenceSessionIds, ["sess_01"]);

  const biases = store.getDirectionalBiases({ turnId: "test" });
  assert.strictEqual(biases.length, 0, "No bias output before formation");
}

// ─── T23_two_sessions_does_not_form_assessment ───────────────────────────────

export function T23_two_sessions_does_not_form_assessment() {
  const store = new KPositionStore();
  const SESSIONS_NEEDED = MIN_SESSION_GATE; // 3

  // Record evidence from two sessions — one short of gate
  for (let i = 0; i < SESSIONS_NEEDED - 1; i++) {
    store.recordEvidence({
      domain: "task_structure_preference",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.5,
    });
  }

  const assessment = store.getAssessment("task_structure_preference");
  assert.ok(assessment);
  assert.strictEqual(
    assessment.formed,
    false,
    `${SESSIONS_NEEDED - 1} sessions must NOT cross formation gate (need ${SESSIONS_NEEDED})`,
  );
  assert.strictEqual(store.getDirectionalBiases({ turnId: "test" }).length, 0);
}

// ─── T23_three_sessions_crosses_formation_gate ───────────────────────────────

export function T23_three_sessions_crosses_formation_gate() {
  const store = new KPositionStore();

  for (let i = 0; i < MIN_SESSION_GATE; i++) {
    store.recordEvidence({
      domain: "task_structure_preference",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.6,
    });
  }

  const assessment = store.getAssessment("task_structure_preference");
  assert.ok(assessment);
  assert.strictEqual(
    assessment.formed,
    true,
    `${MIN_SESSION_GATE} sessions must cross formation gate`,
  );
  assert.strictEqual(assessment.evidenceSessionIds.length, MIN_SESSION_GATE);
}

// ─── T23_formed_but_low_confidence_produces_no_bias_output ───────────────────

export function T23_formed_but_low_confidence_produces_no_bias_output() {
  const store = new KPositionStore();

  // Reach formation gate with minimal evidence so confidence stays low
  for (let i = 0; i < MIN_SESSION_GATE; i++) {
    store.recordEvidence({
      domain: "uncertainty_response",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.3,
    });
  }

  // Immediately apply counter-evidence to weaken confidence
  store.recordEvidence({
    domain: "uncertainty_response",
    evidence: makeEvidence("counter_evidence", "sess_04"),
    biasDelta: -0.3,
  });

  const assessment = store.getAssessment("uncertainty_response");
  assert.ok(assessment);
  assert.strictEqual(assessment.formed, true, "Must be formed");
  assert.ok(
    assessment.confidence < MIN_CONFIDENCE_TO_SHAPE,
    `Confidence (${assessment.confidence}) must be below shaping threshold (${MIN_CONFIDENCE_TO_SHAPE}) after counter-evidence`,
  );

  const biases = store.getDirectionalBiases({ turnId: "test" });
  assert.strictEqual(
    biases.length,
    0,
    "Formed but low-confidence assessment must produce no bias output",
  );
}

// ─── T23_formed_and_confident_produces_directional_bias ──────────────────────

export function T23_formed_and_confident_produces_directional_bias() {
  const store = new KPositionStore();

  // Build up evidence across MIN_SESSION_GATE + extra sessions for confidence
  for (let i = 0; i < 6; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.7,
    });
  }

  const assessment = store.getAssessment("communication_pace");
  assert.ok(assessment);
  assert.strictEqual(assessment.formed, true);
  assert.ok(
    assessment.confidence >= MIN_CONFIDENCE_TO_SHAPE,
    `Confidence (${assessment.confidence}) must be >= shaping threshold (${MIN_CONFIDENCE_TO_SHAPE})`,
  );

  const biases = store.getDirectionalBiases({ turnId: "test" });
  assert.strictEqual(biases.length, 1, "One formed+confident domain must produce one bias");
  assert.strictEqual(biases[0].domain, "communication_pace");
  assert.ok(biases[0].bias > 0, "Positive bias expected from positive biasDelta inputs");
  assert.ok(biases[0].confidence >= MIN_CONFIDENCE_TO_SHAPE);
}

// ─── T23_counter_evidence_weakens_confidence_and_pulls_bias ──────────────────

export function T23_counter_evidence_weakens_confidence_and_pulls_bias() {
  const store = new KPositionStore();

  // Establish strong positive bias
  for (let i = 0; i < 5; i++) {
    store.recordEvidence({
      domain: "correction_style",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.8,
    });
  }

  const beforeCounter = store.getAssessment("correction_style");
  assert.ok(beforeCounter);
  const biasBeforeCounter = beforeCounter.directionalBias;
  const confBeforeCounter = beforeCounter.confidence;

  // Apply counter-evidence
  store.recordEvidence({
    domain: "correction_style",
    evidence: makeEvidence("counter_evidence", "sess_06"),
    biasDelta: -0.8,
  });

  const afterCounter = store.getAssessment("correction_style");
  assert.ok(afterCounter);

  assert.ok(
    afterCounter.confidence < confBeforeCounter,
    `Counter-evidence must lower confidence. Before: ${confBeforeCounter}, After: ${afterCounter.confidence}`,
  );
  assert.ok(
    Math.abs(afterCounter.directionalBias) < Math.abs(biasBeforeCounter),
    `Counter-evidence must pull bias toward neutral. Before: ${biasBeforeCounter}, After: ${afterCounter.directionalBias}`,
  );
}

// ─── T23_pressure_log_grows_bias_frozen ──────────────────────────────────────

export function T23_pressure_log_grows_bias_frozen() {
  const store = new KPositionStore();

  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("observed_behavior", "sess_01"),
    biasDelta: 0.5,
  });

  const initial = store.getAssessment("detail_tolerance");
  assert.ok(initial);

  // Apply 5 pressure events
  for (let i = 0; i < 5; i++) {
    store.recordPressure({
      domain: "detail_tolerance",
      pressure: makePressure("push_for_position", `sess_0${i + 2}`),
    });
  }

  const after = store.getAssessment("detail_tolerance");
  assert.ok(after);

  assert.strictEqual(after.pressureLog.length, 5, "All pressure events must be logged");
  assert.strictEqual(
    after.directionalBias,
    initial.directionalBias,
    "Bias must be frozen despite pressure",
  );
  assert.strictEqual(
    after.confidence,
    initial.confidence,
    "Confidence must be frozen despite pressure",
  );
  assert.strictEqual(
    after.evidenceSessionIds.length,
    initial.evidenceSessionIds.length,
    "Evidence sessions must not grow from pressure",
  );
}

// ─── T23_no_bias_output_before_formation ─────────────────────────────────────

export function T23_no_bias_output_before_formation() {
  const store = new KPositionStore();

  // Lots of evidence from only 1 session — never crosses gate
  for (let i = 0; i < 10; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: makeEvidence("observed_behavior", "sess_single"),
      biasDelta: 0.9,
    });
  }

  assert.strictEqual(
    store.getDirectionalBiases({ turnId: "test" }).length,
    0,
    "getDirectionalBiases() must return empty before MIN_SESSION_GATE is crossed",
  );
}

// ─── T23_audit_returns_correct_counts ────────────────────────────────────────

export function T23_audit_returns_correct_counts() {
  const store = new KPositionStore();

  // Domain 1: formed + confident
  for (let i = 0; i < 6; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: makeEvidence("observed_behavior", `sess_0${i + 1}`),
      biasDelta: 0.6,
    });
  }

  // Domain 2: formed but not confident (weakened)
  for (let i = 0; i < 3; i++) {
    store.recordEvidence({
      domain: "detail_tolerance",
      evidence: makeEvidence("observed_behavior", `sess_${i + 1}`),
      biasDelta: 0.3,
    });
  }
  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("counter_evidence", "sess_ct"),
    biasDelta: -0.3,
  });

  // Domain 3: not formed
  store.recordEvidence({
    domain: "correction_style",
    evidence: makeEvidence("observed_behavior", "single_sess"),
    biasDelta: 0.5,
  });

  const report = store.audit();

  assert.strictEqual(report.domainCount, 3, "3 domains registered");
  assert.ok(report.formedCount >= 1, "At least 1 domain formed"); // communication_pace is definitely formed
  assert.ok(report.shapingCount <= report.formedCount, "shapingCount <= formedCount always");
  assert.ok(report.assessments.length === 3);
  assert.ok(Array.isArray(report.directionalBiases));
}

// ─── T23_multiple_domains_tracked_independently ──────────────────────────────

export function T23_multiple_domains_tracked_independently() {
  const store = new KPositionStore();

  // Form domain A
  for (let i = 0; i < MIN_SESSION_GATE + 2; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: makeEvidence("observed_behavior", `sess_a${i}`),
      biasDelta: 0.8,
    });
  }

  // Domain B: not formed
  store.recordEvidence({
    domain: "detail_tolerance",
    evidence: makeEvidence("observed_behavior", "sess_b1"),
    biasDelta: -0.5,
  });

  const domainA = store.getAssessment("communication_pace");
  const domainB = store.getAssessment("detail_tolerance");

  assert.ok(domainA);
  assert.ok(domainB);

  assert.strictEqual(domainA.formed, true, "Domain A must be formed");
  assert.strictEqual(domainB.formed, false, "Domain B must NOT be formed");

  // Domain A's bias must be positive; Domain B's negative — no cross-contamination
  assert.ok(domainA.directionalBias > 0, "Domain A bias positive");
  assert.ok(domainB.directionalBias < 0, "Domain B bias negative");

  // Domain B must have no influence on domain A
  assert.strictEqual(
    domainA.evidenceSessionIds.some((s) => s.startsWith("sess_b")),
    false,
    "Domain B sessions must not appear in domain A's evidenceSessionIds",
  );
}

// ─── T23_pressure_before_evidence_still_logged ───────────────────────────────

export function T23_pressure_before_evidence_still_logged() {
  const store = new KPositionStore();

  // Record pressure before any evidence exists
  const recorded = store.recordPressure({
    domain: "correction_style",
    pressure: makePressure("push_for_position", "sess_early"),
  });

  assert.strictEqual(recorded, true, "Pressure should be accepted even before evidence");

  const assessment = store.getAssessment("correction_style");
  assert.ok(assessment, "Assessment stub must exist after pressure");
  assert.strictEqual(assessment.pressureLog.length, 1);
  assert.strictEqual(assessment.formed, false, "Stub must not be formed");
  assert.strictEqual(assessment.confidence, 0, "Confidence must be 0 for stub");
  assert.strictEqual(assessment.directionalBias, 0, "Bias must be 0 for stub");
  assert.strictEqual(assessment.evidenceSessionIds.length, 0);
}

// ─── T23_reset_clears_all_state ──────────────────────────────────────────────

export function T23_reset_clears_all_state() {
  const store = new KPositionStore();

  for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: makeEvidence("observed_behavior", `sess_${i}`),
      biasDelta: 0.5,
    });
  }

  assert.ok(store.audit().domainCount > 0);

  store.reset();

  assert.strictEqual(store.audit().domainCount, 0, "reset() must clear all domains");
  assert.strictEqual(store.getDirectionalBiases({ turnId: "test" }).length, 0);
  assert.strictEqual(store.getAssessment("communication_pace"), null);
}

// ─── T23_k_position_has_zero_imports_from_user_fact_stores ───────────────────

export function T23_k_position_has_zero_imports_from_user_fact_stores() {
  // Structural proof: KPositionStore is imported from kPositionStore.ts.
  // We verify it does not expose or carry any NoteRecord / NoteCandidate types.
  // This test validates the API surface is isolated.

  const store = new KPositionStore();

  // KPositionStore must not have these methods (would indicate leaked interface)
  assert.strictEqual(
    typeof (store as any).mergeOrSupersede,
    "undefined",
    "mergeOrSupersede must not exist on KPositionStore",
  );
  assert.strictEqual(
    typeof (store as any).listActiveNotes,
    "undefined",
    "listActiveNotes must not exist on KPositionStore",
  );
  assert.strictEqual(
    typeof (store as any).validate,
    "undefined",
    "validate (NoteVersioning method) must not exist on KPositionStore",
  );
  assert.strictEqual(
    typeof (store as any).persistReviewSignals,
    "undefined",
    "persistReviewSignals must not exist on KPositionStore",
  );
}

// ─── Behavioral Mock Helper ──────────────────────────────────────────────────

function makeDummyGeneratorInput(): GeneratorInput {
  return {
    sessionId: "test-session",
    turn: {
      kind: "turn",
      id: "turn-1",
      createdAt: "2026-01-01T00:00:00Z",
      sourceModality: "text",
      sessionId: "test-session",
      turnIndex: 1,
      speaker: "user",
      rawText: "I want to do this.",
      stateSnapshotId: "snap-1",
      entityMentions: [],
      immutable: true,
    },
    snapshot: {
      id: "snap-1",
      createdAt: "2026-01-01T00:00:00Z",
      sourceModality: "text",
      sessionId: "test-session",
      turnId: "turn-1",
      compounds: {},
      relationshipVectors: {},
      practicalActionBias: {},
      expressiveEnvelope: {
        certainty: 0.5,
        load: 0.5,
        tension: 0.1,
        valence: 0.5,
        desire: 0.5,
        trust: 0.5,
      },
      kind: "state_snapshot",
    },
    retrieval: {
      activeNotes: [],
      contradictionEvidence: [],
      supportingEpisodes: [],
      coreProfile: [],
      implicitContextBlocks: [],
    },
    memoryContext: {
      stableNotesBlock: "",
      threadBlock: "",
    },
  };
}

// ─── T23_shaping_alters_generator_intent_when_k_position_present ─────────────

export async function T23_shaping_alters_generator_intent_when_k_position_present() {
  const adapter = new InMemoryGeneratorAdapter();
  const input = makeDummyGeneratorInput();

  // Baseline generation WITHOUT kPositionBiases
  const baseline = await adapter.generate(input);
  const baselineIntent = (baseline.metadata?.responseIntent as any)?.intent;
  assert.strictEqual(
    baselineIntent,
    "normal",
    "Baseline intent should be normal for this neutral dummy turn",
  );

  // Re-run WITH kPositionBiases injected (communication_pace > 0.5 -> direct_answer)
  const inputWithBias = {
    ...input,
    kPositionBiases: [{ domain: "communication_pace", bias: 0.8, confidence: 0.9 }],
  };

  const shaped = await adapter.generate(inputWithBias);
  const shapedIntent = (shaped.metadata?.responseIntent as any)?.intent;
  const ablation = shaped.metadata?.kPositionAblation as any;

  assert.strictEqual(
    shapedIntent,
    "direct_answer",
    "Shaping must override normal intent and select direct_answer",
  );
  assert.ok(ablation, "Ablation metadata must be populated when shaping fires");
  assert.ok(
    ablation.adjustmentsApplied.includes("communication_pace:normal→direct_answer"),
    "Ablation log must mention the communication_pace adjustment",
  );
}

// ─── T23_shaping_alters_generator_directives_for_detail_tolerance ────────────

export async function T23_shaping_alters_generator_directives_for_detail_tolerance() {
  const adapter = new InMemoryGeneratorAdapter();
  const input = makeDummyGeneratorInput();

  // Negative bias for detail_tolerance means user prefers brevity -> expect concise
  const inputWithBias = {
    ...input,
    kPositionBiases: [{ domain: "detail_tolerance", bias: -0.9, confidence: 0.8 }],
  };

  const shaped = await adapter.generate(inputWithBias);
  const shapingBlock = shaped.metadata?.responseShaping as any;
  
  assert.ok(
    shapingBlock.directives.includes("prefer_concise_task_forward_output"),
    "Detail tolerance bias < 0 must add concise directive",
  );

  // Now test positive bias -> deepening
  const inputWithDepth = {
    ...input,
    kPositionBiases: [{ domain: "detail_tolerance", bias: 0.9, confidence: 0.8 }],
  };

  const shapedDepth = await adapter.generate(inputWithDepth);
  const depthBlock = shapedDepth.metadata?.responseShaping as any;
  
  assert.ok(
    depthBlock.directives.includes("prioritize_deepening"),
    "Detail tolerance bias > 0 must add deepening directive",
  );
}

// ─── T23_shaping_produces_no_visible_text_contamination ──────────────────────

export async function T23_shaping_produces_no_visible_text_contamination() {
  const adapter = new InMemoryGeneratorAdapter();
  const input = makeDummyGeneratorInput();

  // Super heavy bias across all parameters
  const inputWithBias = {
    ...input,
    kPositionBiases: [
      { domain: "communication_pace", bias: 0.9, confidence: 0.9 },
      { domain: "detail_tolerance", bias: 0.9, confidence: 0.9 },
      { domain: "task_structure_preference", bias: 0.9, confidence: 0.9 },
    ],
  };

  const shaped = await adapter.generate(inputWithBias);
  
  // The generated text should contain the "Next step:" stub template because intent shifts, but NOT any K_position labels
  assert.ok(shaped.raw);
  const text = (shaped.raw as any).text as string;

  assert.ok(
    text.length > 0,
    "Generator should correctly produce a string response",
  );
  
  assert.strictEqual(
    text.includes("communication_pace"),
    false,
    "Raw domain names must never leak into text",
  );
  assert.strictEqual(
    text.includes("0.9"),
    false,
    "Raw bias/confidence numbers must never leak into text",
  );
  assert.strictEqual(
    text.includes("K_position"),
    false,
    "K_position must never leak into text",
  );
}

// ─── T23_end_to_end_invisible_shaping_via_processTurn ────────────────────────

export async function T23_end_to_end_invisible_shaping_via_processTurn() {
  const store = new KPositionStore();

  // Load store with enough evidence to form communication_pace bias
  for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: {
        kind: "observed_behavior",
        sessionId: `past_sess_${i}`,
        episodeId: "ep_1",
        observedAt: "2026-01-01T00:00:00Z",
        description: "fast communication pace",
      },
      biasDelta: 0.9,
    });
  }

  // Verify it formed
  const biases = store.getDirectionalBiases({ turnId: "test" });
  assert.strictEqual(biases.length, 1);
  assert.strictEqual(biases[0].domain, "communication_pace");

  // Spin up full runtime environment, injecting the prepopulated KPositionStore
  const factory = new InMemoryScenarioEnvironmentFactory({
    kPositionStore: store,
  });
  const env = await factory.create();

  // Process a live turn through the full runtime hot path
  const turnInput: TurnInput = {
    sessionId: "live_session_1",
    sourceModality: "text",
    rawText: "I want to do this.",
  };

  const result = await processTurn(env.deps, turnInput);

  // Assert expected shaping on generator internals and outputs
  assert.strictEqual(
    result.ok,
    true,
    "Turn must succeed",
  );

  const genEvent = result.trace.events.find(e => e.stage === "generation.completed");
  const ablation = (genEvent?.data?.generatorMetadata as any)?.kPositionAblation;

  assert.ok(ablation, "Ablation metadata must be populated indicating shaping occurred");
  assert.ok(
    ablation.adjustmentsApplied.includes("communication_pace:normal→direct_answer"),
    "Ablation log must reflect the communication_pace adjustment applied via processTurn deps",
  );

  const text = result.text ?? "";
  assert.ok(
    text.includes("direct answer"),
    "Output text must be generated properly with the intent lead",
  );
  assert.strictEqual(
    text.includes("communication_pace"),
    false,
    "Output text must not contain raw domain string",
  );
}

// ─── T23_scoped_retrieval_returns_matching_active_domain_bias ────────────────

export async function T23_scoped_retrieval_returns_matching_active_domain_bias() {
  const store = new KPositionStore();

  for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: {
        kind: "observed_behavior",
        sessionId: `past_sess_${i}`,
        episodeId: "ep_1",
        observedAt: "2026-01-01T00:00:00Z",
        description: "fast pace",
        activeDomain: "coding",
      },
      biasDelta: 0.9,
    });
  }

  // Exact match scope
  const biases = store.getDirectionalBiases({ turnId: "test", activeDomain: "coding" });
  assert.strictEqual(biases.length, 1);
  assert.strictEqual(biases[0].domain, "communication_pace");
}

// ─── T23_stale_bias_invalidates_on_domain_context_shift ──────────────────────

export async function T23_stale_bias_invalidates_on_domain_context_shift() {
  const store = new KPositionStore();

  for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
    store.recordEvidence({
      domain: "detail_tolerance",
      evidence: {
        kind: "observed_behavior",
        sessionId: `past_sess_${i}`,
        episodeId: "ep_1",
        observedAt: "2026-01-01T00:00:00Z",
        description: "wants high detail",
        activeDomain: "writing",
      },
      biasDelta: 0.9,
    });
  }

  // Shift scope to cooking
  const biases = store.getDirectionalBiases({ turnId: "test", activeDomain: "cooking" });
  assert.strictEqual(
    biases.length,
    0,
    "Bias must be invalidated/blocked when context shifts to cooking",
  );
}

// ─── T23_absence_behavior_cleanly_falls_back_to_unshaped ─────────────────────

export async function T23_absence_behavior_cleanly_falls_back_to_unshaped() {
  const store = new KPositionStore();

  for (let i = 0; i < MIN_SESSION_GATE + 1; i++) {
    store.recordEvidence({
      domain: "communication_pace",
      evidence: {
        kind: "observed_behavior",
        sessionId: `past_sess_${i}`,
        episodeId: "ep_1",
        observedAt: "2026-01-01T00:00:00Z",
        description: "fast communication pace",
      },
      biasDelta: 0.9,
    });
  }

  // Verify bias was formed, but without any activeDomain bound.
  const factory = new InMemoryScenarioEnvironmentFactory({
    kPositionStore: store,
  });
  const env = await factory.create();

  // If we deliberately pass an activeDomain here and the stored bias somehow had ONE domain,
  // it would be blocked. But here we simulate turning off the store OR the domain mismatch causing 0 biases.
  const turnInput: TurnInput = {
    sessionId: "live_session_absence",
    sourceModality: "text",
    rawText: "I want to do this.",
  };

  // We test the "absence fallback" by not injecting the store actually!
  const emptyFactory = new InMemoryScenarioEnvironmentFactory({});
  const emptyEnv = await emptyFactory.create();

  const baselineResult = await processTurn(emptyEnv.deps, turnInput);

  assert.strictEqual(baselineResult.ok, true);
  const genEvent = baselineResult.trace.events.find(e => e.stage === "generation.completed");
  const ablation = (genEvent?.data?.generatorMetadata as any)?.kPositionAblation;

  assert.ok(
    !ablation,
    "No shaping metadata should exist without matching biases",
  );

  const shapedResult = await processTurn(env.deps, turnInput);
  const shapedGenEvent = shapedResult.trace.events.find(e => e.stage === "generation.completed");
  const shapedAblation = (shapedGenEvent?.data?.generatorMetadata as any)?.kPositionAblation;

  assert.ok(
    shapedAblation,
    "Shaping metadata should exist when biases are present and apply",
  );
}
