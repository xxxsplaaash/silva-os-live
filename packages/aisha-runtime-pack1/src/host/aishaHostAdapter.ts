/**
 * A.I.S.H.A Host Adapter for Studio Pulse
 *
 * Translates AishaStudioPulseRequest → TurnInput → processTurn() → AishaStudioPulseResponse.
 *
 * Rules:
 * - Uses in-memory stores + InMemoryGeneratorAdapter for the fixture path.
 * - Returns engineMode: "unavailable" with aishaEngineConnected: false when deps cannot be built.
 * - Never fabricates a successful engine response.
 * - Never claims aishaEngineConnected: true unless processTurn() returned ok: true.
 * - Does not invent memory fields that don't exist in the engine yet.
 */

import { processTurn } from "../runtime/processTurn";
import { createHash } from "node:crypto";
import type { ProcessTurnDeps, TurnInput } from "../runtime/runtime_types";
import type {
  AishaStudioPulseRequest,
  AishaStudioPulseResponse,
  AishaMemorySummary,
  AishaStateEnvelope,
  AishaEngineTrace,
  AishaTruthRecord,
} from "./studioPulseContract";
import type { NoteRecord, StateSnapshotRecord } from "../memory/types";
import { buildProductionRuntime } from "../runtime/runtimeBuilder";
import { InMemoryTurnStore } from "../memory/turnStore";
import { InMemorySnapshotStore } from "../memory/snapshotStore";
import {
  FixtureEpisodeStore,
  FixtureThreadStore,
  FixtureNoteVersioning,
} from "./inMemoryStores";

// ─── Internal helpers ─────────────────────────────────────────────────────────

let cachedProductionDeps:
  | {
      fingerprint: string;
      deps: ProcessTurnDeps;
    }
  | null = null;

let productionRuntimeBuilder = buildProductionRuntime;

function productionKeyFingerprint(apiKey: string): string {
  const key = String(apiKey || "");
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 10);
  return `${key.length}:${digest}`;
}

function productionRuntimeFingerprint(apiKey: string, timeoutMs?: number, model?: string): string {
  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1000, Math.min(60000, Number(timeoutMs))) : 0;
  const modelKey = String(model || "").trim() || "default-model";
  return `${productionKeyFingerprint(apiKey)}:${timeout || "default-timeout"}:${modelKey}`;
}

function clearCachedProductionDeps(fingerprint: string) {
  if (cachedProductionDeps?.fingerprint === fingerprint) {
    cachedProductionDeps = null;
  }
}

function shouldClearCachedDepsAfterFailure(reason = ""): boolean {
  return /\b(api[_ -]?key|credential|auth|unauth|permission|invalid|forbidden|quota|gemini|provider|fetch|network|timeout)\b/i.test(
    String(reason || ""),
  );
}

function noteToTruthRecord(
  note: NoteRecord,
  supersededPriorText?: string,
): AishaTruthRecord {
  return {
    noteId: note.id,
    subtype: note.subtype,
    canonicalText: note.canonicalText,
    normalizedValue: note.normalizedValue,
    status: note.status,
    confidence: note.confidence,
    supersededPriorText,
    provenanceChain: note.provenanceChain ?? [],
    subjectKind: note.subjectKind,
    subjectPersonId: note.subjectPersonId,
    lastConfirmedAt: note.lastConfirmedAt,
  };
}

function snapshotToStateEnvelope(snapshot: StateSnapshotRecord): AishaStateEnvelope {
  return {
    certainty: snapshot.expressiveEnvelope.certainty,
    load: snapshot.expressiveEnvelope.load,
    tension: snapshot.expressiveEnvelope.tension,
    valence: snapshot.expressiveEnvelope.valence,
    desire: snapshot.expressiveEnvelope.desire,
    trust: snapshot.expressiveEnvelope.trust,
    activeRelationshipPersonId: snapshot.activeRelationshipPersonId,
    activeSpeakerId: snapshot.activeSpeakerId,
  };
}

function emptyStateEnvelope(): AishaStateEnvelope {
  return { certainty: 0, load: 0, tension: 0, valence: 0, desire: 0, trust: 0 };
}

function emptyMemorySummary(sessionId: string, threadId?: string): AishaMemorySummary {
  return {
    activeTruths: [],
    supersededTruths: [],
    memoryCandidates: [],
    characterProfiles: [],
    sessionId,
    threadId,
  };
}

function emptyRoomSocialState(roomId?: string): import("./studioPulseContract").AishaRoomSocialState {
  return {
    roomId: roomId ?? "unknown_room",
    overallTension: 0,
    dominantMood: "neutral",
    activeConflicts: [],
    speakerPressures: [],
    isPlaceholder: true,
  };
}

function buildTurnInput(req: AishaStudioPulseRequest): TurnInput {
  const modality = req.modalityMetadata;
  return {
    sessionId: req.sessionId,
    speaker: "user",
    rawText: req.messageText,
    sourceModality: modality?.sourceModality ?? "text",
    sourceChannel: modality?.sourceChannel ?? "chat",
    speakerId: modality?.activeSpeakerId ?? modality?.speakerId ?? req.activeSpeakerId,
    recognizedPersonId: modality?.recognizedPersonId ?? req.activeCharacterId,
    speakerConfidence: modality?.speakerConfidence,
    consentStatus: "allow",
    entityMentions: [],
    studioPulseContext: {
      activeSpeakerId: req.activeSpeakerId,
      activeCharacterId: req.activeCharacterId,
      roomId: req.roomId,
      localRoomState: req.localRoomState,
      characterStates: req.characterStates,
      recentMessages: req.recentMessages,
      projectContext: req.projectContext,
    },
  };
}

function unavailableResponse(
  req: AishaStudioPulseRequest,
  reason: string,
): AishaStudioPulseResponse {
  return {
    ok: false,
    responses: [
      {
        content:
          "A.I.S.H.A is not available in this environment. Using local fallback.",
      },
    ],
    memorySummary: emptyMemorySummary(req.sessionId, req.threadId),
    stateEnvelope: emptyStateEnvelope(),
    roomSocialState: emptyRoomSocialState(req.roomId),
    continuityEvents: [],
    relationshipDeltas: [],
    trace: {
      traceId: "unavailable",
      sessionId: req.sessionId,
      status: "failed",
      events: [],
      failureReason: reason,
    },
    engineMode: "unavailable",
    aishaEngineConnected: false,
    confidence: 0,
    fallbackReason: reason,
    error: {
      code: "engine_unavailable",
      message: reason,
      stage: "startup",
      retryable: false,
    },
  };
}

// ─── Public adapter interface ─────────────────────────────────────────────────

export interface AishaHostAdapterOptions {
  /**
   * Pre-built ProcessTurnDeps. Use buildProductionRuntime() for real Gemini path,
   * or buildFixtureDeps() from tests for the in-memory path.
   * When absent, the adapter returns engineMode: "unavailable".
   */
  deps?: ProcessTurnDeps;
  /**
   * "production" | "fixture" — set by the caller to honestly label which deps path is active.
   * The adapter will not override this unless falling back to unavailable.
   */
  engineMode?: "production" | "fixture";
  /**
   * Optional production Gemini key supplied by the Studio Pulse host. This lets
   * the host reuse its existing provider-vault key chain without exposing the
   * secret or importing runtime internals. Falls back to GEMINI_API_KEY.
   */
  productionGeminiApiKey?: string;
  /**
   * Optional production Gemini timeout supplied by Studio Pulse. Kept on the
   * public host boundary so callers do not import runtime internals.
   */
  productionGeminiTimeoutMs?: number;
  /**
   * Optional production Gemini model supplied by Studio Pulse experiments.
   * Falls back to the runtime default when unset.
   */
  productionGeminiModel?: string;
}

/**
 * processAishaRequest
 *
 * The one function Studio Pulse calls. Maps AishaStudioPulseRequest to the engine and back.
 * Returns engineMode: "unavailable" and aishaEngineConnected: false if deps are missing.
 */
export async function processAishaRequest(
  request: AishaStudioPulseRequest,
  options: AishaHostAdapterOptions = {},
): Promise<AishaStudioPulseResponse> {
  let { deps } = options;
  const { engineMode = "fixture" } = options;

  if (!deps && engineMode === "production") {
    const apiKey = String(options.productionGeminiApiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      return unavailableResponse(
        request,
        "No GEMINI_API_KEY found in environment. A.I.S.H.A cannot boot.",
      );
    }
    const timeoutMs = Number.isFinite(Number(options.productionGeminiTimeoutMs))
      ? Math.max(1000, Math.min(60000, Number(options.productionGeminiTimeoutMs)))
      : undefined;
    const model = String(options.productionGeminiModel || "").trim() || undefined;
    const keyFingerprint = productionRuntimeFingerprint(apiKey, timeoutMs, model);
    if (!cachedProductionDeps || cachedProductionDeps.fingerprint !== keyFingerprint) {
      try {
        const turnStore = new InMemoryTurnStore();
        const snapshotStore = new InMemorySnapshotStore();
        const episodeStore = new FixtureEpisodeStore();
        const threadStore = new FixtureThreadStore();
        const noteVersioning =
          new FixtureNoteVersioning() as unknown as import("../memory/types").INoteVersioning;

        const depsForKey = productionRuntimeBuilder(
          { geminiApiKey: apiKey, geminiTimeoutMs: timeoutMs, geminiModel: model },
          { turnStore, snapshotStore, episodeStore, threadStore, noteVersioning },
        );
        cachedProductionDeps = {
          fingerprint: keyFingerprint,
          deps: depsForKey,
        };
      } catch (err) {
        clearCachedProductionDeps(keyFingerprint);
        return unavailableResponse(
          request,
          `Failed to boot A.I.S.H.A engine: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    deps = cachedProductionDeps.deps;
  }

  if (!deps) {
    return unavailableResponse(
      request,
      "No ProcessTurnDeps provided. Set GEMINI_API_KEY for production, or provide fixture deps for testing.",
    );
  }

  const turnInput = buildTurnInput(request);

  let result;
  try {
    result = await processTurn(deps, turnInput);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailableResponse(request, `processTurn threw: ${msg}`);
  }

  // Build the trace envelope from the engine trace
  const engineTrace: AishaEngineTrace = {
    traceId: result.trace.traceId,
    sessionId: result.trace.sessionId,
    status: result.trace.status,
    events: result.trace.events,
    failureReason: result.trace.failureReason,
    criticLoopCycles: result.criticLoop?.cycleCount,
    criticMaxCyclesHit: result.criticLoop?.maxCyclesHit,
  };

  // If the engine fallback-path ran (ok=false), still return a structured response.
  if (!result.ok) {
    const reason = String(result.fallbackReason || engineTrace.failureReason || "");
    if (!options.deps && engineMode === "production") {
      const key = String(options.productionGeminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      if (key && shouldClearCachedDepsAfterFailure(reason)) {
        const timeoutMs = Number.isFinite(Number(options.productionGeminiTimeoutMs))
          ? Math.max(1000, Math.min(60000, Number(options.productionGeminiTimeoutMs)))
          : undefined;
        const model = String(options.productionGeminiModel || "").trim() || undefined;
        clearCachedProductionDeps(productionRuntimeFingerprint(key, timeoutMs, model));
      }
    }
    return {
      ok: false,
      responses: [{ content: result.text }],
      memorySummary: emptyMemorySummary(request.sessionId, request.threadId),
      stateEnvelope: emptyStateEnvelope(),
      roomSocialState: emptyRoomSocialState(request.roomId),
      continuityEvents: [],
      relationshipDeltas: [],
      trace: engineTrace,
      engineMode,
      aishaEngineConnected: false,
      confidence: 0,
      fallbackReason: result.fallbackReason,
    };
  }

  // Success path: engine ran cleanly.
  // Note: active notes, supersession context, and snapshot must be retrieved from deps stores
  // to populate memorySummary. The engine doesn't re-expose them in ProcessTurnResult by design.
  // This is the seam where the adapter can query the stores for the latest memory state.
  let activeTruths: AishaTruthRecord[] = [];
  let supersededTruths: AishaTruthRecord[] = [];
  let stateEnvelope: AishaStateEnvelope = emptyStateEnvelope();
  let episodeId: string | undefined = result.episodeId;

  try {
    // Read active notes from noteVersioning if available via deps cast
    const anyDeps = deps as unknown as Record<string, unknown>;
    const noteVersioning = anyDeps["noteVersioning"] as
      | {
          listActiveNotes: (f: { sessionId: string }) => Promise<NoteRecord[]>;
          listSupersededByIds: (ids: string[]) => Promise<Record<string, string>>;
        }
      | undefined;

    if (noteVersioning) {
      const activeNotes = await noteVersioning.listActiveNotes({
        sessionId: request.sessionId,
      });
      const activeNoteIds = activeNotes.map((n) => n.id);
      const supersededMap = await noteVersioning.listSupersededByIds(activeNoteIds);

      activeTruths = activeNotes
        .filter((n) => n.status === "active")
        .map((n) => noteToTruthRecord(n, supersededMap[n.id]));

      supersededTruths = activeNotes
        .filter((n) => n.status === "superseded")
        .map((n) => noteToTruthRecord(n));
    }

    // Read latest snapshot for state envelope
    const snapshotStore = anyDeps["snapshotStore"] as
      | { getLatest: (sid: string) => Promise<StateSnapshotRecord | null> }
      | undefined;
    if (snapshotStore) {
      const latest = await snapshotStore.getLatest(request.sessionId);
      if (latest) {
        stateEnvelope = snapshotToStateEnvelope(latest);
      }
    }
  } catch {
    // Store read failure must not break the response.
    // activeTruths and stateEnvelope stay at defaults.
  }

  const memorySummary: AishaMemorySummary = {
    activeTruths,
    supersededTruths,
    memoryCandidates: [],
    characterProfiles: [],
    sessionId: request.sessionId,
    threadId: result.threadId ?? request.threadId,
    episodeId,
  };

  return {
    ok: true,
    responses: [{ content: result.text, speakerId: turnInput.speakerId }],
    memorySummary,
    stateEnvelope,
    roomSocialState: emptyRoomSocialState(request.roomId),
    continuityEvents: [],
    relationshipDeltas: [],
    trace: engineTrace,
    engineMode,
    aishaEngineConnected: true,
    confidence: 1.0,
  };
}

export function __resetProductionDepsForTests() {
  cachedProductionDeps = null;
  productionRuntimeBuilder = buildProductionRuntime;
}

export function __setProductionRuntimeBuilderForTests(builder?: typeof buildProductionRuntime) {
  cachedProductionDeps = null;
  productionRuntimeBuilder = typeof builder === "function" ? builder : buildProductionRuntime;
}

export function __productionDepsCacheFingerprintForTests(): string {
  return cachedProductionDeps?.fingerprint ?? "";
}
