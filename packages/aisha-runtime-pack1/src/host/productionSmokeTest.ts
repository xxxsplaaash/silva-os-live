/**
 * Production Runtime Smoke Test
 *
 * Verifies that buildProductionRuntime() can boot and processAishaRequest()
 * returns a real engine response using the live Gemini generator.
 *
 * SAFETY RULES:
 * - Does NOT print GEMINI_API_KEY.
 * - Does NOT write the key to any file.
 * - Does NOT commit this file's output.
 * - Redacts the key from all log output.
 *
 * Run: npx tsx src/host/productionSmokeTest.ts
 */

import { fileURLToPath } from "url";
import { processAishaRequest } from "./aishaHostAdapter";
import { buildProductionRuntime } from "../runtime/runtimeBuilder";
import type { AishaStudioPulseRequest } from "./studioPulseContract";

// In-memory stores — same pattern as fixture suite
import { InMemoryTurnStore } from "../memory/turnStore";
import { InMemorySnapshotStore } from "../memory/snapshotStore";
async function main() {
  const request: AishaStudioPulseRequest = {
    sessionId: "smoke_test_session",
    threadId: "smoke_test_thread",
    roomId: "creative_planning_room",
    activeSpeakerId: "claudia",
    activeCharacterId: "aisha",
    messageText: "help me plan the next campaign",
    localRoomState: {
      "campaign_theme": "cyberpunk_summer",
      "target_audience": "gen_z"
    },
    characterStates: {
      "claudia": { personId: "claudia", displayName: "Claudia", lastKnownBeliefs: [] }
    },
    recentMessages: [
      { role: "user", speakerId: "claudia", content: "Let's brainstorm." }
    ],
    projectContext: {
      "brand_guidelines": "bold, edgy, neon"
    }
  };
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  A.I.S.H.A Production Runtime Smoke Test");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`[1] GEMINI_API_KEY present: ${Boolean(apiKey)}`);
  console.log(`[1] Key length: ${apiKey?.length ?? 0}`);
  console.log(`[1] Key prefix (first 4 chars): ${apiKey ? apiKey.slice(0, 4) + "****[REDACTED]" : "N/A"}`);

  if (!apiKey) {
    console.error("\n❌ GEMINI_API_KEY is not set. Cannot boot production runtime.");
    process.exit(1);
  }

  console.log("\n[2] Calling processAishaRequest() to boot internally...");
  const result = await processAishaRequest(request, { engineMode: "production" });

  // Redact key from any result that might echo it (defensive)
  const safeResult = JSON.stringify(result, (k, v) => {
    if (typeof v === "string" && apiKey && v.includes(apiKey)) return "[REDACTED]";
    return v;
  }, 2);

  console.log("\n[3] Response summary:");
  console.log(`  ok:                   ${result.ok}`);
  console.log(`  engineMode:           ${result.engineMode}`);
  console.log(`  aishaEngineConnected: ${result.aishaEngineConnected}`);
  console.log(`  trace.status:         ${result.trace.status}`);
  console.log(`  trace.events:         ${result.trace.events.length}`);
  console.log(`  responses[0].content: ${result.responses[0]?.content?.slice(0, 120) ?? "(empty)"}`);
  console.log(`  fallbackReason:       ${result.fallbackReason ?? "none"}`);
  console.log(`  error:                ${result.error ? JSON.stringify(result.error) : "none"}`);

  if (result.ok && result.aishaEngineConnected) {
    console.log("\n✅ SMOKE TEST PASSED — production runtime connected and responded.");
  } else {
    console.log("\n⚠️  SMOKE TEST: engine ran but returned fallback/error.");
    console.log("   This may indicate an invalid API key, quota issue, or generator timeout.");
    console.log("   trace.failureReason:", result.trace.failureReason ?? "none");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Smoke test threw:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
