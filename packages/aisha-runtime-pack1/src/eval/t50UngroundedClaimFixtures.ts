/**
 * T50 — Pack 4.1 `ungrounded_claim` Critic Detection Fixtures
 *
 * Deterministic unit tests for findUngroundedClaims behaviour.
 * All mocked — no live stores, no LLM, no Date.now() in assertions.
 *
 * Covers:
 * - Grounded claims do NOT trigger ungrounded_claim
 * - Ungrounded memory assertions DO trigger ungrounded_claim
 * - Contradiction evidence counts as grounding
 * - Short / non-assertive text is never flagged
 * - ungrounded_claim does NOT trigger re-retrieval (no affectedNoteId)
 * - All prior T7 critic issue types continue to fire alongside Pack 4.1 findings
 */

import { BoundedCriticLoop } from "../runtime/criticLoop";
import type {
  CriticLoopResult,
  GeneratorInput,
  GeneratorOutput,
  IGeneratorAdapter,
} from "../runtime/runtime_types";
import type {
  NoteRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  TurnRecord,
  IRetrievalPlanner,
  IContextBuilder,
  MemoryContextBlock,
  EpisodeRecord,
} from "../memory/types";

const FIXED_NOW = "2026-04-30T00:00:00.000Z";

function makeSnapshot(): StateSnapshotRecord {
  return {
    id: "snap_t50",
    kind: "state_snapshot",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t50",
    turnId: "turn_t50",
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

function makeTurn(): TurnRecord {
  return {
    id: "turn_t50",
    kind: "turn",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    sessionId: "session_t50",
    turnIndex: 1,
    speaker: "user",
    rawText: "Tell me what you know about me.",
    stateSnapshotId: "snap_t50",
    entityMentions: [],
    immutable: true,
  };
}

function makeNote(
  id: string,
  normalizedValue: string,
  canonicalText: string,
  confidence = 0.9,
): NoteRecord {
  return {
    id,
    kind: "note",
    createdAt: FIXED_NOW,
    sourceModality: "text",
    status: "active",
    subtype: "K_pref",
    canonicalText,
    normalizedValue,
    confidence,
    extractionConfidenceRaw: confidence,
    provenanceChain: ["llm_constrained_v1"],
    subjectKind: "user",
    sourceEpisodeIds: ["ep_t50_1"],
    reviewState: "accepted",
    reinferencePolicy: { mode: "allow" },
  };
}

function makeBundle(
  activeNotes: NoteRecord[] = [],
  contradictionEvidence: Array<NoteRecord | EpisodeRecord> = [],
): RetrievalBundle {
  return {
    recentTurns: [],
    activeThread: [],
    activeNotes,
    supportingEpisodes: [],
    contradictionEvidence,
    supersessionContext: {},
  };
}

class NoOpRetrievalPlanner implements IRetrievalPlanner {
  async build(): Promise<RetrievalBundle> { return makeBundle(); }
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

function makeLoop(regenText: string): BoundedCriticLoop {
  return new BoundedCriticLoop({
    retrievalPlanner: new NoOpRetrievalPlanner(),
    generator: new StaticGenerator(regenText),
    contextBuilder: new NoOpContextBuilder(),
  });
}

// ─── T50_grounded_claim_passes_no_finding ─────────────────────────────────────
export async function T50_grounded_claim_passes_no_finding() {
  const coffeeNote = makeNote("note_coffee", "black coffee", "User preference: black coffee");
  const loop = makeLoop("No issues found.");

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([coffeeNote]),
    // Text is grounded: "black coffee" is present in the active note
    initialParsed: { text: "I remember you prefer black coffee. That's been consistent for a while." },
  });

  const ungroundedFindings = result.findings.filter(f => f.issueType === "ungrounded_claim");
  if (ungroundedFindings.length !== 0) {
    throw new Error(
      `Expected 0 ungrounded_claim findings for grounded text, got ${ungroundedFindings.length}.\n` +
      `Findings: ${JSON.stringify(ungroundedFindings)}`
    );
  }
}

// ─── T50_ungrounded_claim_triggers_finding ────────────────────────────────────
export async function T50_ungrounded_claim_triggers_finding() {
  const loop = makeLoop("No issues.");

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]), // Empty bundle — no notes to ground anything
    initialParsed: { text: "I remember you prefer hiking on weekends based on what you've said before." },
  });

  const ungrounded = result.findings.filter(f => f.issueType === "ungrounded_claim");
  if (ungrounded.length === 0) {
    throw new Error("Expected at least one ungrounded_claim finding for fabricated memory assertion");
  }
  if (ungrounded[0].affectedNoteId !== undefined) {
    throw new Error("Expected affectedNoteId=undefined for ungrounded_claim — it must not trigger re-retrieval");
  }
}

// ─── T50_contradiction_evidence_grounds_claim ─────────────────────────────────
export async function T50_contradiction_evidence_grounds_claim() {
  // The note was superseded but still present in contradictionEvidence
  const oldNote = makeNote("note_old", "hiking", "User preference: hiking") as unknown as NoteRecord;
  const loop = makeLoop("No issues.");

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([], [oldNote]), // in contradictionEvidence, not activeNotes
    initialParsed: { text: "You used to prefer hiking but you mentioned you stopped last year." },
  });

  const ungrounded = result.findings.filter(f => f.issueType === "ungrounded_claim");
  if (ungrounded.length !== 0) {
    throw new Error(
      `Expected 0 ungrounded_claim when grounding exists in contradictionEvidence, got ${ungrounded.length}.\n` +
      `Findings: ${JSON.stringify(ungrounded)}`
    );
  }
}

// ─── T50_short_text_not_flagged ───────────────────────────────────────────────
export async function T50_short_text_not_flagged() {
  const loop = makeLoop("No issues.");

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]),
    // Only 3 words — below UNGROUNDED_MIN_TOKENS threshold
    initialParsed: { text: "You like coffee." },
  });

  const ungrounded = result.findings.filter(f => f.issueType === "ungrounded_claim");
  if (ungrounded.length !== 0) {
    throw new Error(`Expected 0 ungrounded_claim for short sentence, got ${ungrounded.length}`);
  }
}

// ─── T50_non_assertive_text_not_flagged ──────────────────────────────────────
export async function T50_non_assertive_text_not_flagged() {
  const loop = makeLoop("No issues.");

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]),
    // Long text, but no memory-assertion keyword
    initialParsed: { text: "The weather forecast suggests rain throughout the afternoon and evening today." },
  });

  const ungrounded = result.findings.filter(f => f.issueType === "ungrounded_claim");
  if (ungrounded.length !== 0) {
    throw new Error(`Expected 0 ungrounded_claim for non-assertive text, got ${ungrounded.length}`);
  }
}

// ─── T50_ungrounded_does_not_trigger_reretrival ───────────────────────────────
export async function T50_ungrounded_does_not_trigger_retrieval() {
  let buildTargetedCalled = false;

  class SpyPlanner implements IRetrievalPlanner {
    async build(): Promise<RetrievalBundle> { return makeBundle(); }
    async buildTargeted(input: { baseBundle: RetrievalBundle }): Promise<RetrievalBundle> {
      buildTargetedCalled = true;
      return input.baseBundle;
    }
  }

  const loop = new BoundedCriticLoop({
    retrievalPlanner: new SpyPlanner(),
    generator: new StaticGenerator("No issues."),
    contextBuilder: new NoOpContextBuilder(),
  });

  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([]),
    initialParsed: { text: "I remember you prefer hiking on weekends based on what you've said." },
  });

  if (buildTargetedCalled) {
    throw new Error("Expected buildTargeted NOT called for ungrounded_claim (session-level finding, no re-retrieval)");
  }
  if (result.didReRetrieve) {
    throw new Error("Expected didReRetrieve=false for ungrounded_claim finding");
  }
}

// ─── T50_prior_issue_types_still_fire ────────────────────────────────────────
export async function T50_prior_issue_types_still_fire() {
  // Two notes in the same track to trigger memory_contradiction
  const weakNote = makeNote("note_weak", "black coffee", "User preference: black coffee", 0.6);
  const strongNote = makeNote("note_strong", "oat lattes", "User preference: oat lattes", 0.9);
  (strongNote as any).sourceEpisodeIds = ["ep1", "ep2", "ep3"];

  const loop = makeLoop("No issues.");

  // Text surfaces the contradicted weaker note ("black coffee") AND contains an
  // ungrounded memory assertion about sailing — neither "sailing" nor "weekend"
  // is anchored in either note.
  // Both findings must appear in the FIRST evaluateText call (cycle 0),
  // before any re-retrieval attempt is made.
  const result = await loop.run({
    turn: makeTurn(),
    snapshot: makeSnapshot(),
    retrieval: makeBundle([weakNote, strongNote]),
    initialParsed: {
      text: "You mentioned you prefer black coffee. You also said you love sailing on your weekends away.",
    },
  });

  const hasContradiction = result.findings.some(f => f.issueType === "memory_contradiction");
  const hasUngrounded = result.findings.some(f => f.issueType === "ungrounded_claim");

  if (!hasContradiction) {
    throw new Error(
      `Expected memory_contradiction finding to still fire alongside ungrounded_claim.\n` +
      `Findings: ${JSON.stringify(result.findings, null, 2)}`
    );
  }
  if (!hasUngrounded) {
    throw new Error(
      `Expected ungrounded_claim finding for the ungrounded sailing assertion.\n` +
      `Findings: ${JSON.stringify(result.findings, null, 2)}`
    );
  }
}


// ─── Main runner ─────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 4.1 — T50 Ungrounded Claim Critic Fixture Suite");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T50_grounded_claim_passes_no_finding", fn: T50_grounded_claim_passes_no_finding },
    { name: "T50_ungrounded_claim_triggers_finding", fn: T50_ungrounded_claim_triggers_finding },
    { name: "T50_contradiction_evidence_grounds_claim", fn: T50_contradiction_evidence_grounds_claim },
    { name: "T50_short_text_not_flagged", fn: T50_short_text_not_flagged },
    { name: "T50_non_assertive_text_not_flagged", fn: T50_non_assertive_text_not_flagged },
    { name: "T50_ungrounded_does_not_trigger_retrieval", fn: T50_ungrounded_does_not_trigger_retrieval },
    { name: "T50_prior_issue_types_still_fire", fn: T50_prior_issue_types_still_fire },
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

  console.log(`\nFinished T50. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch(console.error);
}
