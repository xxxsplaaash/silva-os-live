import {
  LlmNoteExtractionSandbox,
  SimpleNoteExtractionSandbox,
  TwoStageExtractionSandbox,
} from "../memory/noteExtractionSandbox";
import type { EpisodeRecord, TurnRecord } from "../memory/types";

let globalTurnIndex = 0;

function createMockEpisode(): EpisodeRecord {
  return {
    id: "ep_mock_fixed_id",
    kind: "episode",
    sessionId: "sess_fixture",
    threadId: "thread_fixture",
    startTurnId: "turn_0",
    endTurnId: "turn_1",
    turnIds: ["turn_0", "turn_1"],
    topicLabels: [],
    primaryModality: "text",
    modalityMix: ["text"],
    participantSpeakerIds: ["user_mock"],
    participantPersonIds: [],
    boundaryReason: { topicShift: false, surpriseDiscontinuity: false, score: 0 },
    createdAt: "2026-04-17T00:00:00.000Z",
    sourceModality: "text",
  };
}

function createMockTurn(text: string, speaker: "user" | "aisha" = "user"): TurnRecord {
  const tIndex = globalTurnIndex++;
  return {
    id: `turn_mock_${tIndex}`,
    kind: "turn",
    sessionId: "sess_fixture",
    turnIndex: tIndex,
    speaker,
    rawText: text,
    stateSnapshotId: "snap_mock_1",
    entityMentions: [],
    immutable: true,
    createdAt: "2026-04-17T00:00:00.000Z",
    sourceModality: "text",
  };
}

/**
 * T6_llm_extractor_contract_mocked
 * Validates the core LLM note extraction sandbox using a mocked LLM generate callback.
 * Asserts the handling of canonical types, filtering of invalid types,
 * and application of the default constraints (0.72 confidence and llm_constrained_v1).
 */
export async function T6_llm_extractor_contract_mocked() {
  const episode = createMockEpisode();
  const turns = [
    createMockTurn("I really love black coffee in the mornings."),
    createMockTurn("Understood.", "aisha"),
  ];

  const extractor = new LlmNoteExtractionSandbox({
    generate: async (_prompt: string) => {
      // Deterministic JSON payload
      return JSON.stringify({
        candidates: [
          {
            subtype: "K_pref",
            canonicalText: "User preference: black coffee in the mornings",
            // Intentionally omitting confidence/provenance to exercise system defaults
          },
          {
            subtype: "invalid_garbage_type", // Must be ignored
            canonicalText: "User likes stuff",
          },
          {
            subtype: "K_profile",
            canonicalText: "User profile: goes to the gym at 6am",
            confidence: 0.95,
            provenanceReason: "llm_explicit_override", // Must override system defaults
          },
        ],
      });
    },
  });

  const candidates = await extractor.extract(episode, turns);

  if (candidates.length !== 2) {
    throw new Error(`Expected exactly 2 valid candidates, got ${candidates.length}`);
  }

  const prefNote = candidates.find((c) => c.subtype === "K_pref");
  const profileNote = candidates.find((c) => c.subtype === "K_profile");

  if (!prefNote || !profileNote) {
    throw new Error("Missing expected canonical subtypes in LLM extraction output");
  }

  // Assert unsupplied fields fall back to approved Speed Doctrine defaults
  if (prefNote.confidence !== 0.72) {
    throw new Error(`Expected K_pref fallback confidence 0.72, got ${prefNote.confidence}`);
  }
  if (prefNote.provenanceReason !== "llm_constrained_v1") {
    throw new Error(
      `Expected K_pref fallback provenance llm_constrained_v1, got ${prefNote.provenanceReason}`,
    );
  }

  // Assert user explicitly supplied fields are preserved
  if (profileNote.confidence !== 0.95) {
    throw new Error(`Expected K_profile preserved confidence 0.95, got ${profileNote.confidence}`);
  }
  if (profileNote.provenanceReason !== "llm_explicit_override") {
    throw new Error(
      `Expected K_profile preserved provenance llm_explicit_override, got ${profileNote.provenanceReason}`,
    );
  }
}

/**
 * T6_extraction_gate_blocks_chatter
 * Asserts the TwoStageExtractionSandbox completely blocks the LLM invocation
 * if the heuristic gate detects only ephemeral chatter.
 */
export async function T6_extraction_gate_blocks_chatter() {
  const basicGate = new SimpleNoteExtractionSandbox();
  let llmCalled = false;

  const llmExtractor = new LlmNoteExtractionSandbox({
    generate: async () => {
      llmCalled = true;
      return JSON.stringify({ candidates: [] });
    },
  });

  const twoStage = new TwoStageExtractionSandbox(basicGate, llmExtractor);

  const episode = createMockEpisode();
  const turns = [
    createMockTurn("sounds good", "user"),
    createMockTurn("Okay.", "aisha"),
    createMockTurn("thanks", "user"),
  ];

  const candidates = await twoStage.extract(episode, turns);

  if (candidates.length !== 0) {
    throw new Error("Expected zero candidates extracted via chatter gate");
  }
  if (llmCalled) {
    throw new Error("Gate failed: permitted ephemeral chatter to invoke the expensive LLM");
  }
}

/**
 * T6_extraction_gate_passes_preference
 * Asserts the TwoStageExtractionSandbox properly delegates to the LLM invocation
 * when the heuristic gate detects viable preference/profile signals.
 */
export async function T6_extraction_gate_passes_preference() {
  const basicGate = new SimpleNoteExtractionSandbox();
  let llmCalled = false;

  const llmExtractor = new LlmNoteExtractionSandbox({
    generate: async () => {
      llmCalled = true;
      return JSON.stringify({
        candidates: [
          {
            subtype: "K_profile",
            canonicalText: "User profile: night owl",
            confidence: 0.9,
            provenanceReason: "llm_constrained_v1",
          },
        ],
      });
    },
  });

  const twoStage = new TwoStageExtractionSandbox(basicGate, llmExtractor);

  const episode = createMockEpisode();
  const turns = [createMockTurn("I usually stay up until 2am working.", "user")];

  const candidates = await twoStage.extract(episode, turns);

  if (!llmCalled) {
    throw new Error("Gate incorrectly blocked a valid K_profile candidate, LLM was NOT invoked");
  }
  if (candidates.length !== 1) {
    throw new Error("Expected 1 candidate extracted successfully via gate sequence");
  }
  if (candidates[0].subtype !== "K_profile") {
    throw new Error("Expected K_profile subtype successfully passed through gate");
  }
}
