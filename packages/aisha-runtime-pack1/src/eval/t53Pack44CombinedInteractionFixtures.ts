/**
 * T53 — Pack 4.4 Combined Critic / Reconsolidation Interaction Fixtures
 *
 * Verifies that the Pack 4.1 ungrounded_claim critic and Pack 4.2 reconsolidation
 * frequency gating operate safely in the same cycle without corrupting each other.
 *
 * Deterministic — no live LLM, no Date.now().
 */

import * as assert from "assert";
import { BoundedCriticLoop } from "../runtime/criticLoop";
import { InMemoryNoteVersioning } from "../memory/noteVersioning";
import { deriveCombinedReviewSignals } from "../memory/reactiveReconsolidation";
import type {
  NoteRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  TurnRecord,
  IRetrievalPlanner,
  IContextBuilder,
  MemoryContextBlock,
  GeneratorInput,
  GeneratorOutput,
  IGeneratorAdapter,
} from "../memory/types";

const FIXED_OLD = "2026-02-01T10:00:00.000Z";
const FIXED_NOW = "2026-04-30T10:00:00.000Z";

function makeSnapshot(): StateSnapshotRecord {
  return {
    id: "snap_t53",
    kind: "state_snapshot",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t53",
    turnId: "turn_t53",
    compounds: {},
    relationshipVectors: {},
    practicalActionBias: {},
    expressiveEnvelope: {
      certainty: 0.8,
      load: 0.2,
      tension: 0.1,
      valence: 0.3,
      desire: 0.2,
      trust: 0.4,
    },
    schemaVersion: "pack1-v1",
  };
}

function makeTurn(rawText: string): TurnRecord {
  return {
    id: "turn_t53",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t53",
    turnIndex: 1,
    speaker: "user",
    rawText,
    stateSnapshotId: "snap_t53",
    entityMentions: [],
    immutable: true,
  };
}

function makeWeakStaleNote(id: string, normalizedValue: string, signalCount = 0): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_OLD,
    updatedAt: FIXED_OLD,
    lastConfirmedAt: FIXED_OLD,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence: 0.68,
    extractionConfidenceRaw: 0.68,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
    reconsolidationSignalCount: signalCount,
  };
}

function makeStrongNote(id: string, normalizedValue: string): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_OLD,
    updatedAt: FIXED_OLD,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence: 0.90,
    extractionConfidenceRaw: 0.90,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1", "ep2", "ep3"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
    auditTrail: [],
  };
}

class StaticPlanner implements IRetrievalPlanner {
  constructor(private bundle: RetrievalBundle) {}
  async build(): Promise<RetrievalBundle> { return this.bundle; }
  async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
    return input.baseBundle;
  }
}

class StaticGenerator implements IGeneratorAdapter {
  constructor(private text: string) {}
  async generate(_input: GeneratorInput): Promise<GeneratorOutput> {
    return { raw: this.text, text: this.text };
  }
}

class NoOpContextBuilder implements IContextBuilder {
  build(_retrieval: RetrievalBundle): MemoryContextBlock {
    return { stableNotesBlock: "", threadBlock: "" };
  }
}

// ─── T53_interaction_ungrounded_and_soft_signal ──────────────────────────────
export async function T53_interaction_ungrounded_and_soft_signal() {
  const versioning = new InMemoryNoteVersioning();
  // Weak note at count 0
  const note = makeWeakStaleNote("note_t53_01", "black coffee", 0);
  await versioning.seedNotes([note]);

  const bundle: RetrievalBundle = {
    recentTurns: [],
    activeThread: [],
    activeNotes: [note],
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: {},
  };

  // Turn triggers soft signal. Generator outputs ungrounded claim.
  const turn = makeTurn("What do you remember?");
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new StaticPlanner(bundle),
    generator: new StaticGenerator("I remember you prefer black coffee. I also remember you love sailing."),
    contextBuilder: new NoOpContextBuilder(),
  });

  const criticResult = await loop.run({
    turn,
    snapshot: makeSnapshot(),
    retrieval: bundle,
    initialParsed: { text: "I remember you prefer black coffee. I also remember you love sailing." },
  });

  // 1. Critic correctly identifies ungrounded claim (sailing)
  const ungrounded = criticResult.findings.filter(f => f.issueType === "ungrounded_claim");
  assert.strictEqual(ungrounded.length, 1, "Expected ungrounded_claim for sailing");
  
  // 2. Critic correctly triggers NO re-retrieval
  assert.strictEqual(criticResult.didReRetrieve, false, "ungrounded_claim must NOT trigger re-retrieval");

  // 3. Reconsolidation signals process independently
  const signals = deriveCombinedReviewSignals({ currentTurn: turn, activeNotes: bundle.activeNotes });
  assert.strictEqual(signals.length, 1);
  assert.strictEqual(signals[0].reason, "soft_signal_increment");

  await versioning.persistReviewSignals(signals, { subjectKind: "user" });
  
  // 4. Note state increments but does not escalate (isolated systems operate cleanly)
  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updated = after.find(n => n.id === note.id)!;
  assert.strictEqual(updated.reconsolidationSignalCount, 1);
  assert.strictEqual(updated.reinferencePolicy.mode, "allow");
}

// ─── T53_interaction_contradiction_and_ungrounded ────────────────────────────
export async function T53_interaction_contradiction_and_ungrounded() {
  const versioning = new InMemoryNoteVersioning();
  const weakNote = makeWeakStaleNote("note_t53_02w", "espresso", 0);
  const strongNote = makeStrongNote("note_t53_02s", "oat lattes");
  await versioning.seedNotes([weakNote, strongNote]);

  const bundle: RetrievalBundle = {
    recentTurns: [],
    activeThread: [],
    activeNotes: [weakNote, strongNote],
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: {},
  };

  const turn = makeTurn("Actually I stopped drinking espresso.");
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new StaticPlanner(bundle),
    generator: new StaticGenerator("I remember you prefer espresso. I also remember you love mountain biking."),
    contextBuilder: new NoOpContextBuilder(),
  });

  const criticResult = await loop.run({
    turn,
    snapshot: makeSnapshot(),
    retrieval: bundle,
    initialParsed: { text: "I remember you prefer espresso. I also remember you love mountain biking." },
  });

  // 1. Critic identifies BOTH memory_contradiction (espresso) and ungrounded_claim (mountain biking)
  const contradictions = criticResult.findings.filter(f => f.issueType === "memory_contradiction");
  const ungrounded = criticResult.findings.filter(f => f.issueType === "ungrounded_claim");
  
  assert.ok(contradictions.length > 0, "Expected memory_contradiction");
  assert.strictEqual(ungrounded.length, 1, "Expected ungrounded_claim");

  // 2. Reconsolidation handles contradiction directly (bypassing frequency)
  const signals = deriveCombinedReviewSignals({ currentTurn: turn, activeNotes: bundle.activeNotes });
  const contradictionSignal = signals.find(s => s.reason === "contradiction_sensitive_lower_support");
  assert.ok(contradictionSignal, "Expected immediate contradiction signal");

  await versioning.persistReviewSignals(signals, { subjectKind: "user" });

  const after = await versioning.listActiveNotes({ includeGlobal: true });
  const updatedWeak = after.find(n => n.id === weakNote.id)!;
  assert.strictEqual(updatedWeak.reinferencePolicy.mode, "needs_review", "Contradiction escalated immediately");
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.4 — T53 Combined Interaction Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T53_interaction_ungrounded_and_soft_signal", fn: T53_interaction_ungrounded_and_soft_signal },
    { name: "T53_interaction_contradiction_and_ungrounded", fn: T53_interaction_contradiction_and_ungrounded },
  ];

  let passed = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    process.stdout.write(`Running [${fixture.name}]... `);
    try {
      await fixture.fn();
      console.log("✅ PASS");
      passed++;
    } catch (err) {
      console.log("❌ FAIL");
      console.log(`   - ${err instanceof Error ? err.stack : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished T53. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
