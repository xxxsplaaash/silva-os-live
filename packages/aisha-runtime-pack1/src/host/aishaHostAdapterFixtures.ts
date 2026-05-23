/**
 * A.I.S.H.A Host Adapter Fixtures
 *
 * Tests for processAishaRequest() using in-memory / fixture deps.
 * No live Gemini API required.
 * Deterministic — no LLM, no live network.
 */

import * as assert from "assert";
import { fileURLToPath } from "url";

import {
  processAishaRequest,
  __productionDepsCacheFingerprintForTests,
  __resetProductionDepsForTests,
  __setProductionRuntimeBuilderForTests,
} from "./aishaHostAdapter";
import type { AishaStudioPulseRequest } from "./studioPulseContract";
import { buildGenerationPrompt } from "../generation/promptTemplate";

// ─── Re-use the existing fixture dependency builder ────────────────────────────
// We mirror InMemoryScenarioEnvironmentFactory to get a real ProcessTurnDeps
// without pulling in the ScenarioRunner abstraction.
import { CautiousFallbackHandler } from "../governance/fallback";
import { SimpleContextBuilder } from "../memory/contextBuilder";
import { DeterministicEpisodeBoundaryDetector } from "../memory/episodeBoundary";
import { SimpleNoteExtractionSandbox } from "../memory/noteExtractionSandbox";
import { SimpleRetrievalPlanner } from "../memory/retrievalPlanner";
import { InMemorySnapshotStore } from "../memory/snapshotStore";
import { InMemoryTurnStore } from "../memory/turnStore";
import { InMemoryGeneratorAdapter } from "../generation/inMemoryGeneratorAdapter";
import { FixturePathParser } from "../runtime/fixtureParser";
import { InMemoryAsyncMemoryFollowup } from "../runtime/inMemoryAsyncMemoryFollowup";
import { CompoundStateEngine } from "../state/compoundStateEngine";
import { RegexSignalClassifier } from "../state/signals";
import { JournalRollbackHelper } from "../runtime/rollback";
import { InMemoryRuntimeTransaction } from "../runtime/transaction";
import { MinimalRuntimeValidator } from "../runtime/validator";
import { ProductionParser } from "../runtime/productionParser";
import type { ProcessTurnDeps } from "../runtime/runtime_types";

// Minimal copies of the private helpers from inMemoryScenarioEnvironment
class SystemClock { nowIso() { return new Date().toISOString(); } }
class SequentialIdGenerator {
  private counters = new Map<string, number>();
  next(prefix: string): string {
    const n = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, n);
    return `${prefix}_${n}`;
  }
}
class RuntimeTrace {
  private status: "running" | "succeeded" | "failed" = "running";
  private failureReason?: string;
  private readonly events: Array<{ stage: string; at: string; data?: Record<string, unknown> }> = [];
  constructor(private readonly traceId: string, private readonly sessionId: string) {}
  add(event: { stage: string; at: string; data?: Record<string, unknown> }) { this.events.push(event); }
  fail(reason: string) { this.status = "failed"; this.failureReason = reason; }
  succeed() { this.status = "succeeded"; }
  snapshot() { return { traceId: this.traceId, sessionId: this.sessionId, status: this.status, events: [...this.events], failureReason: this.failureReason }; }
}
class RuntimeTraceFactory {
  create(input: { traceId: string; sessionId: string }) { return new RuntimeTrace(input.traceId, input.sessionId); }
}

import {
  FixtureEpisodeStore,
  FixtureThreadStore,
  FixtureNoteVersioning,
} from "./inMemoryStores";

function buildFixtureDeps(): ProcessTurnDeps {
  const turnStore = new InMemoryTurnStore();
  const snapshotStore = new InMemorySnapshotStore();
  const episodeStore = new FixtureEpisodeStore();
  const threadStore = new FixtureThreadStore();
  const noteVersioning = new FixtureNoteVersioning();
  const retrievalPlanner = new SimpleRetrievalPlanner({ turnStore, threadStore, episodeStore, noteVersioning });
  const noteExtractionSandbox = new SimpleNoteExtractionSandbox();
  const asyncMemoryFollowup = new InMemoryAsyncMemoryFollowup({ episodeStore, turnStore, snapshotStore, noteExtractionSandbox, noteVersioning });

  return {
    turnStore,
    snapshotStore,
    episodeBoundary: new DeterministicEpisodeBoundaryDetector(),
    episodeStore,
    threadStore,
    retrievalPlanner,
    contextBuilder: new SimpleContextBuilder(),
    stateEngine: new CompoundStateEngine({ classifier: new RegexSignalClassifier() }),
    generator: new InMemoryGeneratorAdapter(),
    parser: new FixturePathParser(),
    validator: new MinimalRuntimeValidator(),
    transaction: new InMemoryRuntimeTransaction(),
    rollback: new JournalRollbackHelper(),
    fallback: new CautiousFallbackHandler(),
    traceFactory: new RuntimeTraceFactory() as unknown as import("../runtime/runtime_types").ITraceFactory,
    idGenerator: new SequentialIdGenerator(),
    clock: new SystemClock(),
    asyncMemoryFollowup,
  };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function baseRequest(overrides: Partial<AishaStudioPulseRequest> = {}): AishaStudioPulseRequest {
  return {
    sessionId: "host_test_session",
    threadId: "host_test_thread",
    messageText: "Hello, help me plan this scene.",
    ...overrides,
  };
}

function socialDirectorJson() {
  return {
    roomBeat: "Vanya opens the green room socially.",
    roomMood: "playful",
    responseMode: "small_exchange",
    speakers: [
      {
        speakerId: "vanya",
        role: "primary",
        tone: "warm with bite",
        text: "The room is awake. Nobody needs a task badge to talk.",
      },
      {
        speakerId: "grok",
        role: "side",
        tone: "dry",
        text: "I have logged a mild objection to the word vibe, but yes.",
      },
    ],
    silentReactions: [{ speakerId: "aisha", visibleState: "Anchoring" }],
    stateUpdates: { notes: ["valid social beat"] },
  };
}

function socialDirectorRequest(overrides: Partial<AishaStudioPulseRequest> = {}): AishaStudioPulseRequest {
  return baseRequest({
    sessionId: "social_director_session",
    threadId: "social_director_thread",
    activeSpeakerId: "aisha",
    activeCharacterId: "aisha",
    messageText: "hi team",
    projectContext: {
      socialDirectorV1: {
        schemaVersion: "studio-pulse.social-director.v1",
        structuredOutput: { kind: "socialDirectorV1", jsonOnly: true },
      },
    },
    ...overrides,
  });
}

function buildStructuredOutputDeps(raw: unknown, structured = true): ProcessTurnDeps {
  const deps = buildFixtureDeps();
  deps.parser = new ProductionParser();
  deps.generator = {
    async generate() {
      return {
        raw,
        metadata: structured ? { structuredOutputKind: "socialDirectorV1" } : {},
      };
    },
  };
  return deps;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export async function T_host_unavailable_when_no_deps() {
  const req = baseRequest();
  const res = await processAishaRequest(req, {});
  assert.strictEqual(res.ok, false, "Should not be ok without deps");
  assert.strictEqual(res.engineMode, "unavailable");
  assert.strictEqual(res.aishaEngineConnected, false);
  assert.ok(res.fallbackReason, "fallbackReason must be set");
  assert.ok(res.error, "error must be present");
  assert.ok(res.responses.length > 0, "Must still return at least one response entry");
}

export async function T_host_maps_request_to_turn_input() {
  const deps = buildFixtureDeps();
  const req = baseRequest({
    sessionId: "map_test",
    messageText: "I use Python for all my projects.",
    activeSpeakerId: "speaker_test",
  });
  const res = await processAishaRequest(req, { deps, engineMode: "fixture" });
  assert.ok(res.ok, `Expected ok=true, got fallbackReason: ${res.fallbackReason}`);
  assert.ok(res.responses[0].speakerId === "speaker_test", "speakerId must be preserved from request");
}

export async function T_host_returns_response_array() {
  const deps = buildFixtureDeps();
  const res = await processAishaRequest(baseRequest(), { deps, engineMode: "fixture" });
  assert.ok(Array.isArray(res.responses), "responses must be an array");
  assert.ok(res.responses.length > 0, "responses must not be empty");
  assert.ok(typeof res.responses[0].content === "string", "content must be a string");
  assert.ok(res.responses[0].content.length > 0, "content must not be empty");
}

export async function T_host_exposes_engine_mode_honestly() {
  const deps = buildFixtureDeps();
  const res = await processAishaRequest(baseRequest(), { deps, engineMode: "fixture" });
  assert.strictEqual(res.engineMode, "fixture", "engineMode must reflect fixture path");
  assert.notStrictEqual(res.engineMode, "production", "must not claim production");
}

export async function T_host_connected_true_only_on_success() {
  const deps = buildFixtureDeps();
  const res = await processAishaRequest(baseRequest(), { deps, engineMode: "fixture" });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.aishaEngineConnected, true, "aishaEngineConnected must be true when ok=true");

  const unavailable = await processAishaRequest(baseRequest({ sessionId: "no_deps" }), {});
  assert.strictEqual(unavailable.aishaEngineConnected, false, "aishaEngineConnected must be false when unavailable");
}

export async function T_host_preserves_speaker_and_modality() {
  const deps = buildFixtureDeps();
  const req = baseRequest({
    sessionId: "modality_test",
    modalityMetadata: {
      sourceModality: "voice",
      sourceChannel: "voice_call",
      speakerId: "speaker_voice",
      speakerConfidence: 0.95,
    },
  });
  const res = await processAishaRequest(req, { deps, engineMode: "fixture" });
  assert.ok(res.ok, "Should succeed");
  // The trace should contain the turn.received event
  const receivedEvent = res.trace.events.find((e) => e.stage === "turn.received");
  assert.ok(receivedEvent, "trace must contain turn.received stage");
}

export async function T_host_works_without_voice_fields() {
  const deps = buildFixtureDeps();
  const req: AishaStudioPulseRequest = {
    sessionId: "no_voice",
    threadId: "no_voice_thread",
    messageText: "Tell me something interesting.",
    // No modalityMetadata, no speakerId, no characterId
  };
  const res = await processAishaRequest(req, { deps, engineMode: "fixture" });
  assert.ok(res.ok, "Should succeed without voice fields");
  assert.ok(res.responses[0].content.length > 0, "content must be present");
}

export async function T_host_trace_fields_present() {
  const deps = buildFixtureDeps();
  const res = await processAishaRequest(baseRequest({ sessionId: "trace_test" }), { deps, engineMode: "fixture" });
  assert.ok(res.trace.traceId, "trace.traceId must be set");
  assert.ok(res.trace.sessionId, "trace.sessionId must be set");
  assert.strictEqual(res.trace.status, "succeeded");
  assert.ok(Array.isArray(res.trace.events), "trace.events must be an array");
  assert.ok(res.trace.events.length > 0, "trace.events must not be empty");
}

export async function T_host_memory_summary_shape() {
  const deps = buildFixtureDeps();
  const res = await processAishaRequest(baseRequest({ sessionId: "mem_shape" }), { deps, engineMode: "fixture" });
  assert.ok(res.ok);
  assert.strictEqual(res.memorySummary.sessionId, "mem_shape");
  assert.ok(Array.isArray(res.memorySummary.activeTruths));
  assert.ok(Array.isArray(res.memorySummary.supersededTruths));
  assert.ok(Array.isArray(res.memorySummary.memoryCandidates));
}

export async function T_host_studio_pulse_dialogue_quality_brief_in_prompt() {
  const prompt = buildGenerationPrompt({
    turn: { rawText: "hi team" },
    studioPulseContext: {
      activeSpeakerId: "vanya",
      activeCharacterId: "vanya",
      roomId: "studio-pulse",
      localRoomState: {
        roomMood: "warm",
        knownPresenceStatus: { aisha: "active", vanya: "active", leah: "quiet" },
      },
      characterStates: {
        vanya: { personId: "vanya", displayName: "Vanya Khumalo", role: "social pulse", mood: "warm", intent: "greeting" },
      },
      projectContext: {
        dialogueQualityV02: {
          schemaVersion: "studio-pulse.dialogue-quality.v0.2",
          plannedSpeakerId: "vanya",
          responseIntent: "greeting",
          selectionReason: "room greeting",
          turnMode: "room-social",
          voicePressureProfile: {
            function: "people temperature, social read, morale, human landing",
            posture: "warm, playful, emotionally observant",
            allowedEdges: ["gentle teasing"],
            forbiddenDrift: ["generic assistant"],
            roomFunction: "Say how this lands on people.",
          },
          qualityRules: ["Do not start with generic assistant filler."],
        },
        roomPerception: { taskType: "greeting", socialIntent: "greeting_room", topicFocus: "" },
      },
      recentMessages: [],
    },
  } as any);

  assert.ok(prompt.systemPrompt.includes("DIALOGUE QUALITY BRIEF:"), "dialogue quality brief must be present");
  assert.ok(prompt.systemPrompt.includes("Speaker function: people temperature"), "voice pressure must be present");
  assert.ok(prompt.systemPrompt.includes("Do NOT start with"), "assistant filler ban must be present");
  assert.ok(!/\b(dialogueQualityV02|projectContext|speakerId|responseIntent|roomStateDelta|emotionalDelta)\b/.test(prompt.systemPrompt), "raw internal field names must not leak into prompt text");
}

export async function T_host_social_director_prompt_uses_structured_contract() {
  const prompt = buildGenerationPrompt({
    turn: { rawText: "hi team" },
    studioPulseContext: {
      activeSpeakerId: "aisha",
      activeCharacterId: "aisha",
      roomId: "studio-pulse-social-director",
      localRoomState: { roomMood: "warm" },
      characterStates: {},
      projectContext: {
        socialDirectorV1: {
          schemaVersion: "studio-pulse.social-director.v1",
          flags: { explicitEveryoneRequested: false, openFloorRequested: false },
        },
      },
      recentMessages: [],
    },
  } as any);

  assert.ok(prompt.systemPrompt.includes("SOCIAL DIRECTOR STRUCTURED MODE"), "social director mode must be explicit");
  assert.ok(prompt.systemPrompt.includes("roomBeat"), "structured roomBeat contract must be present");
  assert.ok(!prompt.systemPrompt.includes("JSON shape: {\"response_text\""), "social director must not use response_text contract");
  assert.ok(!prompt.systemPrompt.includes("Write exactly one message for the planned speaker"), "social director must not inherit one-speaker rule");
}

export async function T_host_social_director_json_is_accepted_with_explicit_context() {
  const deps = buildStructuredOutputDeps(JSON.stringify(socialDirectorJson()));
  const res = await processAishaRequest(socialDirectorRequest(), { deps, engineMode: "production" });
  assert.strictEqual(res.ok, true, `expected structured JSON to pass, got ${res.fallbackReason}`);
  assert.strictEqual(res.engineMode, "production");
  assert.strictEqual(res.aishaEngineConnected, true);
  const parsed = JSON.parse(res.responses[0].content);
  assert.strictEqual(parsed.roomBeat, socialDirectorJson().roomBeat);
  assert.strictEqual(parsed.responseMode, "small_exchange");
}

export async function T_host_social_director_fenced_json_is_accepted() {
  const raw = `Here is the beat:\n\`\`\`json\n${JSON.stringify(socialDirectorJson())}\n\`\`\``;
  const deps = buildStructuredOutputDeps(raw);
  const res = await processAishaRequest(socialDirectorRequest({ sessionId: "social_director_fenced" }), { deps, engineMode: "production" });
  assert.strictEqual(res.ok, true, `expected fenced structured JSON to pass, got ${res.fallbackReason}`);
  const parsed = JSON.parse(res.responses[0].content);
  assert.strictEqual(parsed.speakers[0].speakerId, "vanya");
}

export async function T_host_ordinary_json_still_rejected_as_json_leak() {
  const deps = buildStructuredOutputDeps(JSON.stringify(socialDirectorJson()), false);
  deps.generator = {
    async generate() {
      return {
        raw: "",
        text: JSON.stringify(socialDirectorJson()),
        metadata: {},
      };
    },
  };
  const res = await processAishaRequest(baseRequest({ sessionId: "ordinary_json_leak" }), { deps, engineMode: "fixture" });
  assert.strictEqual(res.ok, false, "ordinary dialogue path must still reject JSON-shaped visible output");
  assert.strictEqual(res.aishaEngineConnected, false);
  assert.match(String(res.fallbackReason || ""), /json_leak/i);
}

export async function T_host_production_key_override_uses_fingerprinted_cache() {
  const seenConfigs: Array<{ key: string; model?: string }> = [];
  __setProductionRuntimeBuilderForTests((config) => {
    seenConfigs.push({ key: config.geminiApiKey, model: config.geminiModel });
    return buildFixtureDeps();
  });

  try {
    const first = await processAishaRequest(baseRequest({ sessionId: "prod_cache_a1" }), {
      engineMode: "production",
      productionGeminiApiKey: "override-key-a",
    });
    assert.ok(first.ok, `expected first production override call to succeed, got ${first.fallbackReason}`);
    const firstFingerprint = __productionDepsCacheFingerprintForTests();
    assert.ok(firstFingerprint, "production deps cache fingerprint must be set after success");
    assert.deepStrictEqual(seenConfigs, [{ key: "override-key-a", model: undefined }], "builder must receive the host-supplied key");

    const second = await processAishaRequest(baseRequest({ sessionId: "prod_cache_a2" }), {
      engineMode: "production",
      productionGeminiApiKey: "override-key-a",
    });
    assert.ok(second.ok, `expected cached production override call to succeed, got ${second.fallbackReason}`);
    assert.deepStrictEqual(seenConfigs, [{ key: "override-key-a", model: undefined }], "same key should reuse cached deps");
    assert.strictEqual(__productionDepsCacheFingerprintForTests(), firstFingerprint, "same key should keep same cache fingerprint");

    const third = await processAishaRequest(baseRequest({ sessionId: "prod_cache_b1" }), {
      engineMode: "production",
      productionGeminiApiKey: "override-key-b",
    });
    assert.ok(third.ok, `expected changed production override call to succeed, got ${third.fallbackReason}`);
    assert.deepStrictEqual(seenConfigs.map(item => item.key), ["override-key-a", "override-key-b"], "changed key should rebuild production deps");
    assert.notStrictEqual(__productionDepsCacheFingerprintForTests(), firstFingerprint, "changed key should change safe fingerprint");
    const keyBFingerprint = __productionDepsCacheFingerprintForTests();

    const fourth = await processAishaRequest(baseRequest({ sessionId: "prod_cache_b_lite" }), {
      engineMode: "production",
      productionGeminiApiKey: "override-key-b",
      productionGeminiModel: "gemini-2.5-flash-lite",
    });
    assert.ok(fourth.ok, `expected changed production model override call to succeed, got ${fourth.fallbackReason}`);
    assert.deepStrictEqual(seenConfigs, [
      { key: "override-key-a", model: undefined },
      { key: "override-key-b", model: undefined },
      { key: "override-key-b", model: "gemini-2.5-flash-lite" },
    ], "changed model should rebuild production deps and reach the builder");
    assert.notStrictEqual(__productionDepsCacheFingerprintForTests(), keyBFingerprint, "changed model should change safe fingerprint");
  } finally {
    __resetProductionDepsForTests();
  }
}

export async function T_host_failed_production_boot_is_not_cached() {
  let buildCalls = 0;
  __setProductionRuntimeBuilderForTests((config) => {
    buildCalls++;
    if (config.geminiApiKey === "bad-key") {
      throw new Error("Gemini credential boot failed");
    }
    return buildFixtureDeps();
  });

  try {
    const failed = await processAishaRequest(baseRequest({ sessionId: "prod_boot_bad" }), {
      engineMode: "production",
      productionGeminiApiKey: "bad-key",
    });
    assert.strictEqual(failed.ok, false, "failed boot should return unavailable response");
    assert.strictEqual(failed.engineMode, "unavailable");
    assert.strictEqual(__productionDepsCacheFingerprintForTests(), "", "failed boot must not cache deps");

    const recovered = await processAishaRequest(baseRequest({ sessionId: "prod_boot_good" }), {
      engineMode: "production",
      productionGeminiApiKey: "good-key",
    });
    assert.ok(recovered.ok, `expected later valid key to retry and succeed, got ${recovered.fallbackReason}`);
    assert.strictEqual(buildCalls, 2, "valid key must be attempted after failed boot");
    assert.ok(__productionDepsCacheFingerprintForTests(), "successful retry should cache deps");
  } finally {
    __resetProductionDepsForTests();
  }
}

export async function T_host_runtime_credential_failure_clears_cache() {
  let buildCalls = 0;
  __setProductionRuntimeBuilderForTests(() => {
    buildCalls++;
    const deps = buildFixtureDeps();
    deps.generator = {
      async generate() {
        throw new Error("Gemini API key invalid");
      },
    };
    return deps;
  });

  try {
    const failed = await processAishaRequest(baseRequest({ sessionId: "prod_runtime_bad" }), {
      engineMode: "production",
      productionGeminiApiKey: "runtime-bad-key",
    });
    assert.strictEqual(failed.ok, false, "runtime credential failure should not be connected");
    assert.strictEqual(failed.aishaEngineConnected, false);
    assert.match(String(failed.fallbackReason || ""), /Gemini API key invalid/i);
    assert.strictEqual(__productionDepsCacheFingerprintForTests(), "", "runtime credential failure must clear cached deps");

    const failedAgain = await processAishaRequest(baseRequest({ sessionId: "prod_runtime_bad_again" }), {
      engineMode: "production",
      productionGeminiApiKey: "runtime-bad-key",
    });
    assert.strictEqual(failedAgain.ok, false);
    assert.strictEqual(buildCalls, 2, "same key should retry after runtime credential failure instead of reusing failed deps");
  } finally {
    __resetProductionDepsForTests();
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  A.I.S.H.A Host Adapter Fixtures");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixtures = [
    { name: "T_host_unavailable_when_no_deps", fn: T_host_unavailable_when_no_deps },
    { name: "T_host_maps_request_to_turn_input", fn: T_host_maps_request_to_turn_input },
    { name: "T_host_returns_response_array", fn: T_host_returns_response_array },
    { name: "T_host_exposes_engine_mode_honestly", fn: T_host_exposes_engine_mode_honestly },
    { name: "T_host_connected_true_only_on_success", fn: T_host_connected_true_only_on_success },
    { name: "T_host_preserves_speaker_and_modality", fn: T_host_preserves_speaker_and_modality },
    { name: "T_host_works_without_voice_fields", fn: T_host_works_without_voice_fields },
    { name: "T_host_trace_fields_present", fn: T_host_trace_fields_present },
    { name: "T_host_memory_summary_shape", fn: T_host_memory_summary_shape },
    { name: "T_host_studio_pulse_dialogue_quality_brief_in_prompt", fn: T_host_studio_pulse_dialogue_quality_brief_in_prompt },
    { name: "T_host_social_director_prompt_uses_structured_contract", fn: T_host_social_director_prompt_uses_structured_contract },
    { name: "T_host_social_director_json_is_accepted_with_explicit_context", fn: T_host_social_director_json_is_accepted_with_explicit_context },
    { name: "T_host_social_director_fenced_json_is_accepted", fn: T_host_social_director_fenced_json_is_accepted },
    { name: "T_host_ordinary_json_still_rejected_as_json_leak", fn: T_host_ordinary_json_still_rejected_as_json_leak },
    { name: "T_host_production_key_override_uses_fingerprinted_cache", fn: T_host_production_key_override_uses_fingerprinted_cache },
    { name: "T_host_failed_production_boot_is_not_cached", fn: T_host_failed_production_boot_is_not_cached },
    { name: "T_host_runtime_credential_failure_clears_cache", fn: T_host_runtime_credential_failure_clears_cache },
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
      console.log(`   - ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log(`\nFinished host adapter fixtures. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
