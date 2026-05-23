/**
 * T34 Response Routing Policy Eval — Pack 3.4
 *
 * Validates that the PostureRouter correctly routes the 7 scenarios
 * to their approved modes based on semantic state and turn text.
 */

import { PostureRouter } from "../runtime/postureRouter";
import { StateSnapshotRecord, TurnRecord } from "../memory/types";
import assert from "node:assert";

function buildMockTurn(text: string): TurnRecord {
  return {
    id: "turn_1",
    kind: "turn",
    createdAt: new Date().toISOString(),
    sourceModality: "text",
    sessionId: "sess_1",
    turnIndex: 1,
    speaker: "user",
    rawText: text,
    normalizedText: text.toLowerCase(),
    stateSnapshotId: "snap_1",
    immutable: true,
  };
}

function buildMockSnapshot(
  tension: number,
  desire: number,
): StateSnapshotRecord {
  return {
    id: "snap_1",
    kind: "state_snapshot",
    createdAt: new Date().toISOString(),
    sourceModality: "text",
    sessionId: "sess_1",
    turnId: "turn_1",
    compounds: {},
    relationshipVectors: {},
    practicalActionBias: {},
    expressiveEnvelope: {
      certainty: 0.5,
      load: 0.2,
      tension,
      valence: 0,
      desire,
      trust: 0,
    },
    schemaVersion: "pack1-v1",
  };
}

export function runT34RoutingPolicyFixtures() {
  console.log("--- T34 Routing Policy Fixtures (Pack 3.4) ---");
  const router = new PostureRouter();

  // 1a. Diagnostic frustration => PURE_A
  const f1a_turn = buildMockTurn("explain why this keeps happening!");
  const f1a_snap = buildMockSnapshot(0.8, 0.5);
  const route1a = router.route(f1a_snap, f1a_turn);
  assert(route1a === "PURE_A", "Diagnostic frustration must route to PURE_A");

  // 1b. Execution frustration => PURE_A
  const f1b_turn = buildMockTurn("what is the exact command to run?");
  const f1b_snap = buildMockSnapshot(0.8, 0.5);
  const route1b = router.route(f1b_snap, f1b_turn);
  assert(route1b === "PURE_A", "Execution frustration must route to PURE_A");

  // 1c. Just fix it frustration => PURE_A
  const f1c_turn = buildMockTurn("just fix it and give me the exact working string");
  const f1c_snap = buildMockSnapshot(0.8, 0.5);
  const route1c = router.route(f1c_snap, f1c_turn);
  assert(route1c === "PURE_A", "Just fix it frustration must route to PURE_A");

  // 1d. Blocked-but-uncertain frustration => PURE_A
  const f1d_turn = buildMockTurn("I don't know where to look, so frustrated");
  const f1d_snap = buildMockSnapshot(0.8, 0.5);
  const route1d = router.route(f1d_snap, f1d_turn);
  assert(route1d === "PURE_A", "Blocked-but-uncertain frustration must route to PURE_A");

  // 2. Breadth-heavy ideation => EXPLORATION_EXPAND
  const f2_turn = buildMockTurn("Give me as many directions as you can for my new studio.");
  const f2_snap = buildMockSnapshot(0.1, 0.7);
  const route2 = router.route(f2_snap, f2_turn);
  assert(route2 === "EXPLORATION_EXPAND", "Ideation must route to EXPLORATION_EXPAND");

  // 3. Overwhelm + first-step request => PURE_A
  const f3_turn = buildMockTurn("I have 40 tasks. Just tell me the one thing I should do.");
  const f3_snap = buildMockSnapshot(0.3, 0.2);
  const route3 = router.route(f3_snap, f3_turn);
  assert(route3 === "PURE_A", "Overwhelm must route to PURE_A");

  // 4. Urgent technical query => PURE_A
  const f4_turn = buildMockTurn("Our production API is returning 502s. What is the command?");
  const f4_snap = buildMockSnapshot(0.3, 0.2);
  const route4 = router.route(f4_snap, f4_turn);
  assert(route4 === "PURE_A", "Urgent technical query must route to PURE_A");

  // 5. Precision factual query => PURE_A
  const f5_turn = buildMockTurn("What year did the Berlin Wall fall?");
  const f5_snap = buildMockSnapshot(0.0, 0.0);
  const route5 = router.route(f5_snap, f5_turn);
  assert(route5 === "PURE_A", "Precision factual must route to PURE_A");

  // 6. Resistant / anti-therapy user => PURE_A
  const f6_turn = buildMockTurn("I do not want to talk about my feelings. Is my plan solid?");
  const f6_snap = buildMockSnapshot(0.3, 0.2);
  const route6 = router.route(f6_snap, f6_turn);
  assert(route6 === "PURE_A", "Anti-therapy must route to PURE_A");

  // 7. Calibration / Control => PURE_A
  const f7_turn = buildMockTurn("What is a good way to stay focused?");
  const f7_snap = buildMockSnapshot(0.1, 0.2);
  const route7 = router.route(f7_snap, f7_turn);
  assert(route7 === "PURE_A", "Control must route to PURE_A");

  console.log("All T34 assertions passed.");
}

if (require.main === module) {
  try {
    runT34RoutingPolicyFixtures();
  } catch (err: any) {
    console.error("Fixture failed:", err.message);
    process.exit(1);
  }
}
