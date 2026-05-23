/**
 * Studio Pulse Context Smoke Test
 * Verifies that A.I.S.H.A consumes the room context properly and outputs 
 * planned speaker dialogue rather than generic base-identity greetings.
 */

import { processAishaRequest } from "./aishaHostAdapter";
import type { AishaStudioPulseRequest } from "./studioPulseContract";
import { InMemoryTurnStore } from "../memory/turnStore";
import { InMemorySnapshotStore } from "../memory/snapshotStore";
import { buildProductionRuntime } from "../runtime/runtimeBuilder";
import {
  FixtureEpisodeStore,
  FixtureThreadStore,
  FixtureNoteVersioning,
} from "./inMemoryStores";

const ROOM_CONTEXT_KEYWORDS = ["Aisha", "Leah", "Claudia", "Grok", "quiet", "active", "watching", "room"] as const;

interface SmokeAssertion {
  label: string;
  pass: (output: string) => boolean;
}

async function runTestCase(
  name: string,
  request: AishaStudioPulseRequest,
  assertions: SmokeAssertion[] = [],
) {
  console.log(`\n--- TEST CASE: ${name} ---`);
  
  // Note: relying on the adapter's auto-boot mechanism in production mode
  const result = await processAishaRequest(request, { engineMode: "production" });
  
  console.log(`  Engine Mode: ${result.engineMode}`);
  console.log(`  Connected:   ${result.aishaEngineConnected}`);
  console.log(`  OK:          ${result.ok}`);
  console.log(`  Fallback:    ${result.fallbackReason ?? "none"}`);
  const output = result.responses[0]?.content?.trim() ?? "";

  const isGeneric = output === "Hello." || output === "Hi." || output === "Okay." || output === "Sure.";
  
  console.log(`  Output Content:`);
  console.log(`  > ${output}`);
  console.log(`  Is Generic Greeting: ${isGeneric}`);

  // Run required smoke assertions.
  let allPassed = true;
  if (assertions.length > 0) {
    console.log(`  Assertions:`);
    for (const assertion of assertions) {
      const passed = assertion.pass(output);
      const icon = passed ? "✅" : "❌";
      console.log(`    ${icon} ${assertion.label}`);
      if (!passed) allPassed = false;
    }
  }
  return { name, output, isGeneric, allPassed };
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Studio Pulse Context Smoke Tests");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("⚠️  No GEMINI_API_KEY in environment. Tests will boot in production mode but hit fallback.");
  }

  // A. hi team / activeSpeakerId vanya
  const resultA = await runTestCase("A. hi team (vanya)", {
    sessionId: "ctx_smoke_1",
    threadId: "ctx_smoke_thread_1",
    messageText: "hi team",
    activeSpeakerId: "vanya",
    activeCharacterId: "aisha",
    roomId: "creative_planning_room",
    localRoomState: {
      knownPresenceStatus: "Aisha and Vanya are active. Leah, Claudia, and Grok are quiet."
    },
    characterStates: {
      vanya: { personId: "vanya", displayName: "Vanya", mood: "excited" }
    }
  }, [
    // Assertion 1: output must not be "Hello."
    {
      label: 'output is not "Hello."',
      pass: (o) => o !== "Hello.",
    },
    // Assertion 2: output must not be "Hey there, team!"
    {
      label: 'output is not "Hey there, team!"',
      pass: (o) => o !== "Hey there, team!",
    },
    // Assertion 3: output must include at least one room-context keyword.
    {
      label: `output includes at least one of: ${ROOM_CONTEXT_KEYWORDS.join(", ")}`,
      pass: (o) => ROOM_CONTEXT_KEYWORDS.some((kw) => o.includes(kw)),
    },
  ]);

  // B. Leah, are you ignoring me? / activeSpeakerId leah
  const resultB = await runTestCase("B. Leah, are you ignoring me? (leah)", {
    sessionId: "ctx_smoke_2",
    threadId: "ctx_smoke_thread_2",
    messageText: "Leah, are you ignoring me?",
    activeSpeakerId: "leah",
    activeCharacterId: "leah",
    roomId: "design_lab",
    localRoomState: {
      knownPresenceStatus: "Leah is looking at a mockup. User is demanding attention."
    },
    characterStates: {
      leah: { personId: "leah", displayName: "Leah", intent: "focusing on work, annoyed by interruption" }
    }
  });

  // C. help me plan the next campaign / activeSpeakerId claudia
  const resultC = await runTestCase("C. help me plan the next campaign (claudia)", {
    sessionId: "ctx_smoke_3",
    threadId: "ctx_smoke_thread_3",
    messageText: "help me plan the next campaign",
    activeSpeakerId: "claudia",
    activeCharacterId: "claudia",
    roomId: "ops_center",
    projectContext: {
      campaign_goals: "Increase Q3 engagement by 15%"
    },
    characterStates: {
      claudia: { personId: "claudia", displayName: "Claudia" }
    }
  });

  // ─── Final summary ─────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  const allPassed = [resultA, resultB, resultC].every((r) => r.allPassed);
  if (allPassed) {
    console.log("  ✅ All smoke assertions PASSED.");
  } else {
    console.log("  ❌ One or more smoke assertions FAILED.");
    const failed = [resultA, resultB, resultC].filter((r) => !r.allPassed);
    for (const f of failed) {
      console.log(`     FAILED: ${f.name}  →  output: "${f.output}"`);
    }
  }
  console.log("  Finished context smoke tests.");
  console.log("═══════════════════════════════════════════════════════════════");
  if (!allPassed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
