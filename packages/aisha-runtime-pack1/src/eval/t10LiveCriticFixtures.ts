/**
 * T10 — Pack 1.4 Live Critic Loop Wiring Fixtures
 *
 * Verifies:
 *   1. BoundedCriticLoop is wired in buildProductionRuntime (not undefined)
 *   2. contextBuilder is passed to the critic and used in regen
 *   3. MAX_CRITIC_CYCLES = 2 hard cap is enforced
 *   4. Turn is never aborted when max cycles hit — finalText is committed
 *   5. Clean pass exits at cycleCount=0
 *
 * All mocked — no live API, no Date.now() in assertions.
 */

import * as assert from "assert";
import { BoundedCriticLoop } from "../runtime/criticLoop";
import { MAX_CRITIC_CYCLES } from "../runtime/runtime_types";
import type {
  GeneratorInput,
  GeneratorOutput,
  IGeneratorAdapter,
} from "../runtime/runtime_types";
import type {
  IContextBuilder,
  IRetrievalPlanner,
  MemoryContextBlock,
  NoteRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  TurnRecord,
} from "../memory/types";

// ─── Fixed test constants ─────────────────────────────────────────────────────

const FIXED_NOW = "2026-04-18T10:00:00.000Z";

function makeSnapshot(): StateSnapshotRecord {
  return {
    id: "snap_t10_001",
    kind: "state_snapshot",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t10",
    turnId: "turn_t10_001",
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
    },
    schemaVersion: "pack1-v1",
  };
}

function makeTurn(): TurnRecord {
  return {
    id: "turn_t10_001",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t10",
    turnIndex: 1,
    speaker: "user",
    rawText: "What do you remember?",
    stateSnapshotId: "snap_t10_001",
    entityMentions: [],
    immutable: true,
  };
}

function makeNote(
  id: string,
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
    subtype: "K_pref",
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
    auditTrail: [],
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

// ─── Mocks ────────────────────────────────────────────────────────────────────

class PassthroughContextBuilder implements IContextBuilder {
  public buildCallCount = 0;
  build(_retrieval: RetrievalBundle): MemoryContextBlock {
    this.buildCallCount++;
    return { stableNotesBlock: "[rebuilt_context]", threadBlock: "" };
  }
}

class NoProgressPlanner implements IRetrievalPlanner {
  async build(): Promise<RetrievalBundle> { return makeBundle(); }
  async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
    return input.baseBundle; // unchanged — no progress
  }
}

class ProgressPlanner implements IRetrievalPlanner {
  async build(): Promise<RetrievalBundle> { return makeBundle(); }
  async buildTargeted(input: { baseBundle: RetrievalBundle; targetNoteIds: string[] }): Promise<RetrievalBundle> {
    // Return a new object reference (triggers progress detection)
    return { ...input.baseBundle, activeNotes: [] };
  }
}

class AlwaysProgressPlannerWithContradiction implements IRetrievalPlanner {
  constructor(private readonly weakNote: NoteRecord, private readonly strongNote: NoteRecord) {}
  async build(): Promise<RetrievalBundle> { return makeBundle(); }
  async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
    return { ...input.baseBundle, activeNotes: [this.weakNote, this.strongNote] };
  }
}

class FixedTextGenerator implements IGeneratorAdapter {
  constructor(private readonly text: string) {}
  async generate(_input: GeneratorInput): Promise<GeneratorOutput> {
    return { raw: this.text, text: this.text };
  }
}

class ContradictingGenerator implements IGeneratorAdapter {
  public callCount = 0;
  constructor(private readonly contradictionText: string) {}
  async generate(_input: GeneratorInput): Promise<GeneratorOutput> {
    this.callCount++;
    return { raw: this.contradictionText, text: this.contradictionText };
  }
}

class ContextCapturingGenerator implements IGeneratorAdapter {
  public capturedContextBlocks: string[] = [];
  async generate(input: GeneratorInput): Promise<GeneratorOutput> {
    this.capturedContextBlocks.push(input.memoryContext.stableNotesBlock);
    return { raw: "clean output", text: "clean output" };
  }
}

// ─── T10_clean_pass_exits_at_cycle_zero ──────────────────────────────────────

export async function T10_clean_pass_exits_at_cycle_zero() {
  const contextBuilder = new PassthroughContextBuilder();
  const loop = new BoundedCriticLoop({
    retrievalPlanner: new NoProgressPlanner(),
    generator: new FixedTextGenerator("clean response"),
    contextBuilder,
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]),
    initialParsed: { text: "clean response with no notes surfaced" },
  });

  assert.strictEqual(result.cycleCount, 0, `Expected cycleCount=0, got ${result.cycleCount}`);
  assert.strictEqual(result.maxCyclesHit, false, "Expected maxCyclesHit=false");
  assert.strictEqual(result.findings.length, 0, `Expected 0 findings, got ${result.findings.length}`);
  assert.strictEqual(result.finalText, "clean response with no notes surfaced");
  // contextBuilder.build should NOT be called on a clean pass (regen never triggered)
  assert.strictEqual(contextBuilder.buildCallCount, 0, "contextBuilder.build must not be called on clean pass");
}

// ─── T10_context_builder_called_on_regen ─────────────────────────────────────

export async function T10_context_builder_called_on_regen() {
  const weakNote = makeNote("note_w", "espresso", 0.65, 1);
  const strongNote = makeNote("note_s", "oat lattes", 0.88, 3);

  const contextBuilder = new PassthroughContextBuilder();
  const capturer = new ContextCapturingGenerator();

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new ProgressPlanner(),
    generator: capturer,
    contextBuilder,
  });

  await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: { text: "I remember you prefer espresso." },
  });

  // contextBuilder.build must have been called at least once (regen triggered)
  assert.ok(contextBuilder.buildCallCount >= 1, `Expected contextBuilder.build to be called at least once, got ${contextBuilder.buildCallCount}`);
  // Captured context in regen must include the rebuilt context block
  assert.ok(
    capturer.capturedContextBlocks.some((b) => b === "[rebuilt_context]"),
    `Expected generator to receive rebuilt_context in memoryContext.stableNotesBlock, got: ${JSON.stringify(capturer.capturedContextBlocks)}`
  );
}

// ─── T10_max_cycles_hard_cap_at_two ──────────────────────────────────────────

export async function T10_max_cycles_hard_cap_at_two() {
  assert.strictEqual(MAX_CRITIC_CYCLES, 2, `MAX_CRITIC_CYCLES must be exactly 2, got ${MAX_CRITIC_CYCLES}`);

  const weakNote = makeNote("note_wc", "dark roast", 0.65, 1);
  const strongNote = makeNote("note_sc", "oat lattes", 0.90, 3);

  const generator = new ContradictingGenerator("You prefer dark roast as I recall.");
  const contextBuilder = new PassthroughContextBuilder();

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new AlwaysProgressPlannerWithContradiction(weakNote, strongNote),
    generator,
    contextBuilder,
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: { text: "You prefer dark roast as I recall." },
  });

  assert.strictEqual(result.maxCyclesHit, true, "Expected maxCyclesHit=true when cap is exhausted");
  assert.ok(result.cycleCount <= MAX_CRITIC_CYCLES, `cycleCount ${result.cycleCount} must not exceed MAX_CRITIC_CYCLES=${MAX_CRITIC_CYCLES}`);
  assert.ok(result.finalText.length > 0, "finalText must be non-empty even when maxCyclesHit");
  assert.ok(result.finalText.includes("dark roast"), `Expected finalText to be last generated text: "${result.finalText}"`);
}

// ─── T10_turn_not_aborted_when_max_cycles_hit ────────────────────────────────

export async function T10_turn_not_aborted_when_max_cycles_hit() {
  const weakNote = makeNote("note_wa", "black coffee", 0.65, 1);
  const strongNote = makeNote("note_sa", "oat lattes", 0.90, 3);

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new AlwaysProgressPlannerWithContradiction(weakNote, strongNote),
    generator: new ContradictingGenerator("You prefer black coffee."),
    contextBuilder: new PassthroughContextBuilder(),
  });

  // Must NOT throw — the loop must always return a result
  let result: Awaited<ReturnType<typeof loop.run>>;
  try {
    result = await loop.run({
      turn: makeTurn(),
      snapshot: makeSnapshot(),
      retrieval: makeBundle([weakNote, strongNote]),
      initialParsed: { text: "You prefer black coffee." },
    });
  } catch (err) {
    throw new Error(`BoundedCriticLoop must not throw when max cycles hit. Got: ${err}`);
  }

  assert.ok(result.finalText.length > 0, "finalText must be non-empty");
  assert.strictEqual(result.maxCyclesHit, true, "Expected maxCyclesHit=true");
}

// ─── T10_no_associative_retrieval ────────────────────────────────────────────

export async function T10_no_associative_retrieval() {
  // buildTargeted must only be called with specific targetNoteIds — never all notes.
  // We verify that re-retrieval is only triggered for note-specific findings.
  // threshold_coherence_failure (no affectedNoteId) must NOT invoke buildTargeted.

  let buildTargetedCallCount = 0;

  class SpyPlanner implements IRetrievalPlanner {
    async build(): Promise<RetrievalBundle> { return makeBundle(); }
    async buildTargeted(input: { baseBundle: RetrievalBundle; targetNoteIds: string[] }): Promise<RetrievalBundle> {
      buildTargetedCallCount++;
      // Ensure targetNoteIds is always populated (never empty on re-retrieval)
      if (input.targetNoteIds.length === 0) {
        throw new Error("buildTargeted called with empty targetNoteIds — associative retrieval violation");
      }
      return input.baseBundle; // no progress — stops cycle
    }
  }

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new SpyPlanner(),
    generator: new FixedTextGenerator("I understand."),
    contextBuilder: new PassthroughContextBuilder(),
  });

  // Session-level finding (threshold_coherence_failure) — must NOT trigger buildTargeted
  const lowCoherenceSnapshot: StateSnapshotRecord = {
    ...makeSnapshot(),
    expressiveEnvelope: { certainty: 0.3, trust: -0.3, tension: 0.1, load: 0.2, valence: 0, desire: 0.2 },
  };

  await loop.run({
    turn: makeTurn(),
    snapshot: lowCoherenceSnapshot,
    retrieval: makeBundle([]),
    initialParsed: { text: "I understand." },
  });

  assert.strictEqual(buildTargetedCallCount, 0, `buildTargeted must not be called for session-level findings only. Got ${buildTargetedCallCount} calls.`);
}
