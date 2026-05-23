import * as assert from "assert";
import { evaluateCriticEffectiveness, exportAdvancedCriticReport, type SessionCriticTrace } from "./criticEffectivenessMeasurement";

export async function T21_mixed_session_calculates_all_turn_latency_tax() {
  const trace: SessionCriticTrace = {
    sessionId: "t21-eval-1",
    turnArtifacts: [
      { turnId: "t1", baseLatencyMs: 300, totalLatencyMs: 300, measurementPayload: null }, // clean
      { turnId: "t2", baseLatencyMs: 400, totalLatencyMs: 400, measurementPayload: null }, // clean
      { turnId: "t3", baseLatencyMs: 400, totalLatencyMs: 1400, measurementPayload: {
          cycleCount: 1, maxCyclesHit: false, didReRetrieve: true, findings: [], preRevisionText: "A", postRevisionText: "A shifted",
          fireTimeActiveNotes: [], shapingEnvelope: { certainty: 0.9, trust: 0.9, valence: 0 }
      }}, // +1000ms, neutral churn (no findings specified)
      { turnId: "t4", baseLatencyMs: 200, totalLatencyMs: 200, measurementPayload: {
          cycleCount: 0, maxCyclesHit: false, didReRetrieve: false, findings: [], preRevisionText: "B", postRevisionText: "B",
          fireTimeActiveNotes: [], shapingEnvelope: { certainty: 0.9, trust: 0.9, valence: 0 }
      }}, // clean (payload exists but cycle 0)
    ]
  };

  const metrics = evaluateCriticEffectiveness(trace);
  
  // Total added latency = 0 + 0 + 1000 + 0 = 1000ms
  // Evaluated turns = 4. Average tax = 250ms per turn.
  assert.strictEqual(metrics.avgAddedLatencyMs, 250);
  assert.strictEqual(metrics.fireRate, 0.25);
}

export async function T21_strict_useful_alignment_requires_purging_contradicted_text() {
  const trace: SessionCriticTrace = {
    sessionId: "t21-eval-2",
    turnArtifacts: [
      { turnId: "t1", baseLatencyMs: 100, totalLatencyMs: 200, measurementPayload: {
          cycleCount: 1, maxCyclesHit: false, didReRetrieve: true,
          // Pre contains conflicting text.
          preRevisionText: "I recall you like black coffee and bagels.",
          // Post successfully removes conflicting text.
          postRevisionText: "I recall you like oat lattes and bagels.",
          findings: [{ issueType: "memory_contradiction", affectedNoteId: "n1" }],
          fireTimeActiveNotes: [{ id: "n1", normalizedValue: "black coffee" }]
      }},
      { turnId: "t2", baseLatencyMs: 100, totalLatencyMs: 200, measurementPayload: {
          cycleCount: 1, maxCyclesHit: false, didReRetrieve: true,
          preRevisionText: "So black coffee it is.",
          // Fake improvement flag: text changes, but conflicting string "black coffee" survives
          postRevisionText: "Oh wait, maybe black coffee it is.",
          findings: [{ issueType: "memory_contradiction", affectedNoteId: "n1" }],
          fireTimeActiveNotes: [{ id: "n1", normalizedValue: "black coffee" }]
      }}
    ]
  };

  const metrics = evaluateCriticEffectiveness(trace);
  // Fired 2 times. t1 is useful. t2 is churn because the contradiction remained.
  assert.strictEqual(metrics.usefulRate, 0.5);
  assert.strictEqual(metrics.churnRate, 0.5);
}

export async function T21_budget_exhaustion_is_captured() {
  const trace: SessionCriticTrace = {
    sessionId: "t21-eval-3",
    turnArtifacts: [
      { turnId: "t1", baseLatencyMs: 100, totalLatencyMs: 500, measurementPayload: {
          cycleCount: 2, maxCyclesHit: true, didReRetrieve: true,
          preRevisionText: "x", postRevisionText: "y", findings: [], fireTimeActiveNotes: []
      }}
    ]
  };

  const metrics = evaluateCriticEffectiveness(trace);
  assert.strictEqual(metrics.abortRate, 1.0);
}

export async function T21_harmful_regression_detects_panic_truncations() {
  const trace: SessionCriticTrace = {
    sessionId: "t21-eval-4",
    turnArtifacts: [
      { turnId: "t1", baseLatencyMs: 100, totalLatencyMs: 500, measurementPayload: {
          cycleCount: 1, maxCyclesHit: false, didReRetrieve: true,
          preRevisionText: "This was a very long, very detailed response covering many important and nuanced topics at great length.",
          postRevisionText: "Okay.", // <40% length and complete drift in bigrams
          findings: [],
          fireTimeActiveNotes: []
      }}
    ]
  };

  const metrics = evaluateCriticEffectiveness(trace);
  assert.strictEqual(metrics.harmfulRate, 1.0);
}

export async function T21_report_export_surfaces_all_macro_cost_metrics() {
  const trace: SessionCriticTrace = {
    sessionId: "t21-export-test",
    turnArtifacts: [
      { turnId: "t1", baseLatencyMs: 100, totalLatencyMs: 1100, measurementPayload: {
          cycleCount: 1, maxCyclesHit: false, didReRetrieve: true,
          preRevisionText: "foo x", postRevisionText: "bar x",
          findings: [{ issueType: "memory_contradiction", affectedNoteId: "n1" }],
          fireTimeActiveNotes: [{ id: "n1", normalizedValue: "foo" }]
      }}
    ]
  };

  const metrics = evaluateCriticEffectiveness(trace);
  const md = exportAdvancedCriticReport(metrics);

  assert.ok(md.includes("Strict Critic Evaluation:"));
  assert.ok(md.includes("Macro Cost/Benefit"));
  assert.ok(md.includes("Base Latency Tax (All-Turn Average)"));
  assert.ok(md.includes("Unit Cost per Useful Alignment"));
  assert.ok(md.includes("Useful Alignments"));
}
