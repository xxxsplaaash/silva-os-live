/**
 * A.I.S.H.A Host Adapter Integration Tests
 *
 * Tests the self-sufficient boot logic of processAishaRequest.
 */

import * as assert from "assert";
import { fileURLToPath } from "url";
import { processAishaRequest } from "./aishaHostAdapter";
import type { AishaStudioPulseRequest } from "./studioPulseContract";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  A.I.S.H.A Host Adapter Integration Tests");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const request: AishaStudioPulseRequest = {
    sessionId: "integration_test",
    threadId: "integration_test_thread",
    messageText: "Hello.",
  };

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, error?: any) {
    if (ok) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name}`);
      if (error) console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  // 1. Missing GEMINI_API_KEY gracefully fails
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  
  try {
    const resNoKey = await processAishaRequest(request, { engineMode: "production" });
    assert.strictEqual(resNoKey.ok, false);
    assert.strictEqual(resNoKey.engineMode, "unavailable");
    assert.strictEqual(resNoKey.aishaEngineConnected, false);
    assert.ok(resNoKey.fallbackReason?.includes("GEMINI_API_KEY"));
    report("Missing GEMINI_API_KEY returns structured unavailable", true);
  } catch (err) {
    report("Missing GEMINI_API_KEY returns structured unavailable", false, err);
  }

  // 2. Production boot path executes when key is present (should attempt boot, may fail on invalid key)
  process.env.GEMINI_API_KEY = originalKey || "test_key_123";
  try {
    const resWithKey = await processAishaRequest(request, { engineMode: "production" });
    // It should boot cleanly, even if the key is invalid causing ok=false later
    assert.strictEqual(resWithKey.engineMode, "production");
    // If we reach here, we proved it didn't throw during boot and didn't require injected deps
    report("processAishaRequest auto-boots production runtime with no deps", true);
  } catch (err) {
    report("processAishaRequest auto-boots production runtime with no deps", false, err);
  }

  console.log(`\nFinished integration tests. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
