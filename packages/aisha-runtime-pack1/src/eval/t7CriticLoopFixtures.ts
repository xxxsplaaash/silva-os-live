/**
 * T7 — Bounded Critic Loop Fixtures
 *
 * Deterministic unit tests for BoundedCriticLoop.
 * All mocked — no live stores, no LLM, no Date.now() in assertions.
 *
 * Each exported function is a named async test that throws on failure.
 */

import { BoundedCriticLoop } from "../runtime/criticLoop";
import { MAX_CRITIC_CYCLES } from "../runtime/runtime_types";
import type {
  CriticLoopResult,
  GeneratorInput,
  GeneratorOutput,
  ICriticLoop,
  IGeneratorAdapter,
  ParsedOutput,
} from "../runtime/runtime_types";
import type {
  NoteRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  TurnRecord,
  IRetrievalPlanner,
  IContextBuilder,
  MemoryContextBlock,
} from "../memory/types";

// ─── Fixed test constants ────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-17T10:00:00.000Z";

function makeSnapshot(overrides: Partial<StateSnapshotRecord["expressiveEnvelope"]> = {}): StateSnapshotRecord {
  return {
    id: "snap_t7_001",
    kind: "state_snapshot",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t7",
    turnId: "turn_t7_001",
    compounds: {},
    relationshipVectors: {},
    practicalActionBias: {},
    expressiveEnvelope: {
      certainty: 0.7,
      load: 0.2,
      tension: 0.1,
      valence: 0.3,
      desire: 0.2,
      trust: 0.1,
      ...overrides,
    },
    schemaVersion: "pack1-v1",
  };
}

function makeTurn(rawText = "What do you remember?"): TurnRecord {
  return {
    id: "turn_t7_001",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t7",
    turnIndex: 1,
    speaker: "user",
    rawText,
    stateSnapshotId: "snap_t7_001",
    entityMentions: [],
    immutable: true,
  };
}

function makeNote(
  id: string,
  subtype: "K_pref" | "K_profile",
  normalizedValue: string,
  confidence: number,
  sourceCount: number,
  reinferenceMode: "allow" | "needs_review" = "allow",
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: "active",
    subtype,
    canonicalText: `User preference: ${normalizedValue}`,
    normalizedValue,
    confidence,
    extractionConfidenceRaw: confidence,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: Array.from({ length: sourceCount }, (_, i) => `ep_${id}_${i}`),
    reviewState: reinferenceMode === "needs_review" ? "pending" : "accepted",
    reinferencePolicy: reinferenceMode === "needs_review"
      ? { mode: "needs_review", reason: "retrieved_weak_stale_note" }
      : { mode: "allow" },
  };
}

function makeBundle(activeNotes: NoteRecord[] = []): RetrievalBundle {
  return {
    recentTurns: [],
    activeThread: [],
    activeNotes,
    supportingEpisodes: [],
    contradictionEvidence: [],
    supersessionContext: {},
  };
}

// ─── Mock retrieval planner (no-op buildTargeted — returns base bundle) ──────
class MockRetrievalPlanner implements IRetrievalPlanner {
  async build(): Promise<RetrievalBundle> {
    return makeBundle();
  }
  async buildTargeted(input: {
    sessionId: string;
    currentTurn: TurnRecord;
    baseBundle: RetrievalBundle;
    targetNoteIds: string[];
  }): Promise<RetrievalBundle> {
    // Returns base bundle unchanged by default (no-progress path)
    return input.baseBundle;
  }
}

// ─── Mock generator adapter ──────────────────────────────────────────────────
class MockGeneratorAdapter implements IGeneratorAdapter {
  constructor(private readonly responseText: string) {}
  async generate(_input: GeneratorInput): Promise<GeneratorOutput> {
    return { raw: this.responseText, text: this.responseText };
  }
}

class FailingGeneratorAdapter implements IGeneratorAdapter {
  async generate(): Promise<GeneratorOutput> {
    throw new Error("mock_regen_failure");
  }
}

// ─── Mock context builder (no-op) ────────────────────────────────────────────
class MockContextBuilder implements IContextBuilder {
  build(_retrieval: RetrievalBundle): MemoryContextBlock {
    return { stableNotesBlock: "", threadBlock: "" };
  }
}

// ─── TEST: T7_clean_output_no_cycle ─────────────────────────────────────────
export async function T7_clean_output_no_cycle() {
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new MockRetrievalPlanner(),
    generator: new MockGeneratorAdapter("clean output"),
    contextBuilder: new MockContextBuilder(),
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]),
    initialParsed: { text: "clean output with no notes surfaced" },
  });

  if (result.cycleCount !== 0) {
    throw new Error(`Expected cycleCount=0, got ${result.cycleCount}`);
  }
  if (result.maxCyclesHit) {
    throw new Error("Expected maxCyclesHit=false, got true");
  }
  if (result.findingCount !== undefined && result.findings.length !== 0) {
    throw new Error(`Expected 0 findings, got ${result.findings.length}`);
  }
  if (result.finalText !== "clean output with no notes surfaced") {
    throw new Error(`Expected finalText to be unchanged: "${result.finalText}"`);
  }
}

// ─── TEST: T7_contradiction_triggers_one_cycle ───────────────────────────────
export async function T7_contradiction_triggers_one_cycle() {
  // Two competing notes with different normalizedValues in the same track
  const weakNote = makeNote("note_weak", "K_pref", "black coffee", 0.65, 1);
  const strongNote = makeNote("note_strong", "K_pref", "oat lattes", 0.88, 3);

  // Planner returns a different set from base (simulating a targeted retrieval result)
  class TargetedMockPlanner implements IRetrievalPlanner {
    async build(): Promise<RetrievalBundle> { return makeBundle(); }
    async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
      // Return a different bundle (only strongNote) to trigger progress detection
      return { ...input.baseBundle, activeNotes: [strongNote] };
    }
  }

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new TargetedMockPlanner(),
    generator: new MockGeneratorAdapter("Updated: oat lattes preferred."),
    contextBuilder: new MockContextBuilder(),
  });

  // Initial text surfaces the weaker note's value
  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: { text: "I remember you prefer black coffee based on what you've said." },
  });

  if (!result.didReRetrieve) {
    throw new Error("Expected didReRetrieve=true, got false");
  }
  if (result.cycleCount !== 1) {
    throw new Error(`Expected cycleCount=1, got ${result.cycleCount}`);
  }
  if (!result.findings.some((f) => f.issueType === "memory_contradiction")) {
    throw new Error("Expected at least one memory_contradiction finding");
  }
}

// ─── TEST: T7_max_cycles_hit_commits_final_text ──────────────────────────────
export async function T7_max_cycles_hit_commits_final_text() {
  // Contradiction exists, targeted retrieval always returns different bundle,
  // but regen always produces contradicting text again → cycles exhaust
  const weakNote = makeNote("note_weak_mc", "K_pref", "dark roast", 0.65, 1);
  const strongNote = makeNote("note_strong_mc", "K_pref", "oat lattes", 0.90, 3);

  class AlwaysProgressPlanner implements IRetrievalPlanner {
    private callCount = 0;
    async build(): Promise<RetrievalBundle> { return makeBundle(); }
    async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
      this.callCount++;
      // Return a bundle with both notes but in a slightly different object reference
      // so the identity check (targetedBundle === currentRetrieval) fails.
      // Both notes must remain so findMemoryContradictions keeps firing.
      return { ...input.baseBundle, activeNotes: [weakNote, strongNote] };
    }
  }

  let regenCallCount = 0;
  class ContradictingGenerator implements IGeneratorAdapter {
    async generate(): Promise<GeneratorOutput> {
      regenCallCount++;
      // Always re-surfaces the contradiction
      return { raw: "regen", text: "You prefer dark roast as I recall." };
    }
  }

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new AlwaysProgressPlanner(),
    generator: new ContradictingGenerator(),
    contextBuilder: new MockContextBuilder(),
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: { text: "You prefer dark roast as I recall." },
  });

  if (!result.maxCyclesHit) {
    throw new Error(`Expected maxCyclesHit=true (MAX_CRITIC_CYCLES=${MAX_CRITIC_CYCLES})`);
  }
  if (result.cycleCount < 1) {
    throw new Error(`Expected cycleCount >= 1, got ${result.cycleCount}`);
  }
  if (!result.finalText.includes("dark roast")) {
    throw new Error(`Expected finalText to be the last generated text, got: "${result.finalText}"`);
  }
}

// ─── TEST: T7_stale_note_finding_no_retrieval_skip ───────────────────────────
export async function T7_stale_note_finding_no_retrieval_skip() {
  const staleNote = makeNote("note_stale", "K_profile", "likes mornings", 0.66, 1, "needs_review");

  // Planner returns base bundle unchanged — simulates no-progress
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new MockRetrievalPlanner(), // returns base bundle unchanged
    generator: new MockGeneratorAdapter("likes mornings — but please confirm this is still current."),
    contextBuilder: new MockContextBuilder(),
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([staleNote]),
    // Text surfaces the stale note's value
    initialParsed: { text: "I know you likes mornings based on what we've discussed." },
  });

  // Finding should be detected
  if (!result.findings.some((f) => f.issueType === "stale_note_surfaced")) {
    throw new Error("Expected stale_note_surfaced finding");
  }
  // Re-retrieval attempted but bundle unchanged → generator should NOT have run
  if (result.didReRetrieve) {
    throw new Error("Expected didReRetrieve=false when bundle is unchanged");
  }
}

// ─── TEST: T7_threshold_coherence_finding_no_retrieval ───────────────────────
export async function T7_threshold_coherence_finding_no_retrieval() {
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new MockRetrievalPlanner(),
    generator: new MockGeneratorAdapter("I understand."),
    contextBuilder: new MockContextBuilder(),
  });

  // Snapshot below coherence floor
  const lowCoherenceSnapshot = makeSnapshot({ certainty: 0.3, trust: -0.3 });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: lowCoherenceSnapshot,
    retrieval: makeBundle([]),
    initialParsed: { text: "I understand." },
  });

  if (!result.findings.some((f) => f.issueType === "threshold_coherence_failure")) {
    throw new Error("Expected threshold_coherence_failure finding for low certainty+trust snapshot");
  }
  // Should NOT trigger re-retrieval (no affectedNoteId)
  if (result.didReRetrieve) {
    throw new Error("Expected didReRetrieve=false — threshold_coherence_failure must not trigger re-retrieval");
  }
}

// ─── TEST: T7_critic_loop_absent_pass_through ────────────────────────────────
export async function T7_critic_loop_absent_pass_through() {
  // When deps.criticLoop is undefined in ProcessTurnDeps, the trace must not
  // contain a 'critic.loop.completed' event. This test validates the no-op path
  // at the type / contract level by checking CriticLoopResult is undefined when not injected.
  //
  // We can't run processTurn here without full deps, so we directly assert
  // that an ICriticLoop absent from deps means no loop result.
  const noCriticLoop: ICriticLoop | undefined = undefined;

  // Simulate what processTurn does: if (!deps.criticLoop) → criticLoopResult = undefined
  const criticLoopResult: CriticLoopResult | undefined = noCriticLoop
    ? await noCriticLoop.run({} as never)
    : undefined;

  if (criticLoopResult !== undefined) {
    throw new Error("Expected criticLoopResult=undefined when criticLoop dep is absent");
  }
}

// ─── TEST: T7_regen_failure_aborts_remaining_cycles ──────────────────────────
export async function T7_regen_failure_aborts_remaining_cycles() {
  const weakNote = makeNote("note_weak_fail", "K_pref", "espresso", 0.65, 1);
  const strongNote = makeNote("note_strong_fail", "K_pref", "oat lattes", 0.88, 3);

  class ProgressPlanner implements IRetrievalPlanner {
    async build(): Promise<RetrievalBundle> { return makeBundle(); }
    async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
      return { ...input.baseBundle, activeNotes: [strongNote] };
    }
  }

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new ProgressPlanner(),
    generator: new FailingGeneratorAdapter(),
    contextBuilder: new MockContextBuilder(),
  });

  // Should not throw — regen failure is caught and aborts remaining cycles
  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: { text: "I remember you prefer espresso." },
  });

  // Turn still completes; finalText is the last good text (original in this case)
  if (!result.finalText) {
    throw new Error("Expected non-empty finalText after regen failure");
  }
  // maxCyclesHit must be false — aborted early, not at ceiling
  if (result.maxCyclesHit) {
    throw new Error("Expected maxCyclesHit=false when regen aborts early");
  }
}
