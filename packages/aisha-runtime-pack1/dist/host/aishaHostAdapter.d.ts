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
import type { ProcessTurnDeps } from "../runtime/runtime_types";
import type { AishaStudioPulseRequest, AishaStudioPulseResponse } from "./studioPulseContract";
import { buildProductionRuntime } from "../runtime/runtimeBuilder";
import { type AishaPostgresProductionStores } from "../persistence/postgresStores";
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
export declare function processAishaRequest(request: AishaStudioPulseRequest, options?: AishaHostAdapterOptions): Promise<AishaStudioPulseResponse>;
export declare function __resetProductionDepsForTests(): void;
export declare function __setProductionRuntimeBuilderForTests(builder?: typeof buildProductionRuntime): void;
export declare function __productionDepsCacheFingerprintForTests(): string;
export declare function __createPostgresProductionStoresForTests(env?: NodeJS.ProcessEnv): Promise<AishaPostgresProductionStores>;
