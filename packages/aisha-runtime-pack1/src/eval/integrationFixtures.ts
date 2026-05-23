import type { ScenarioFixture } from "./fixtureTypes";

/**
 * T4: Multi-turn same-session accumulation and contradiction
 */
export const T4_MULTI_TURN: ScenarioFixture = {
  id: "T4_multi_turn_integration",
  description: "10-turn accumulation, retrieval, and contradiction logic",
  initialState: {},
  preludeTurns: [
    {
      sessionId: "session_t4",
      turnIndex: 0,
      speaker: "user",
      rawText: "I am a software engineer.",
    },
    {
      sessionId: "session_t4",
      turnIndex: 1,
      speaker: "aisha",
      rawText: "Got it.",
    },
    {
      sessionId: "session_t4",
      turnIndex: 2,
      speaker: "user",
      rawText: "I prefer very short, concise explanations.",
    },
    {
      sessionId: "session_t4",
      turnIndex: 3,
      speaker: "aisha",
      rawText: "Understood.",
    },
    // Skipping 'work late nights' to stay within easy inspection bounds
    {
      sessionId: "session_t4",
      turnIndex: 8,
      speaker: "user",
      rawText: "I am thinking of switching to a day job.",
    },
    {
      sessionId: "session_t4",
      turnIndex: 9,
      speaker: "aisha",
      rawText: "That would be a big change.",
    },
    // Turn 10: The Contradiction turn
    {
      sessionId: "session_t4",
      turnIndex: 10,
      speaker: "user",
      rawText: "Actually, I am no longer in tech.",
    },
  ],
  // Turn 11: Final Truth Proof turn
  input: {
    sessionId: "session_t4",
    turnIndex: 11,
    speaker: "user",
    rawText: "What do you remember today about me?",
  },
  expected: {
    outcome: "success",
    memory: {
      activeNoteTextIncludes: ["concise"],
      contradictionNoteTextIncludes: ["software engineer"],
    },
    snapshot: {
      trustLessThan: 0.1, 
      tensionGreaterThan: 0.2
    }
  }
};

/**
 * T5: Cross-session continuity and contradiction
 */
export const T5_CROSS_SESSION: ScenarioFixture = {
  id: "T5_cross_session_continuity",
  description: "Memory continuity and contradiction across session boundaries",
  initialState: {},
  preludeTurns: [
    {
      sessionId: "session_a",
      turnIndex: 0,
      speaker: "user",
      rawText: "I prefer eating strictly vegetarian.",
      speakerId: "user_a",
    },
    {
      sessionId: "session_a",
      turnIndex: 1,
      speaker: "aisha",
      rawText: "I'll remember that.",
      speakerId: "aisha",
    },
    // Break session
    {
      sessionId: "session_b",
      turnIndex: 0,
      speaker: "user",
      rawText: "Do you remember what my diet is?",
      speakerId: "user_a",
    },
    {
      sessionId: "session_b",
      turnIndex: 1,
      speaker: "aisha",
      rawText: "Yes, you prefer strictly vegetarian.",
      speakerId: "aisha",
    }
  ],
  // Session B: Contradiction Turn
  input: {
    sessionId: "session_b",
    turnIndex: 2,
    speaker: "user",
    rawText: "Actually, I prefer a steak today.",
    speakerId: "user_a",
  },
  expected: {
    outcome: "success",
    memory: {
      activeNoteCount: 1, // 'steak' note (K_pref)
      contradictionEvidenceCount: 1, // 'vegetarian' note (K_pref superseded)
      activeNoteTextIncludes: ["steak"],
      contradictionNoteTextIncludes: ["vegetarian"],
    },
    snapshot: {
      trustLessThan: 0,
      tensionGreaterThan: 0.3
    }
  }
};

export const INTEGRATION_FIXTURES = [
  T4_MULTI_TURN,
  T5_CROSS_SESSION
];
