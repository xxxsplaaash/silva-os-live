/**
 * A.I.S.H.A Host Package — Public Surface
 *
 * This is the only module Studio Pulse (Codex) should import.
 * It exports the contract types and the processAishaRequest function.
 *
 * Do not import internal A.I.S.H.A modules directly.
 */

export type {
  AishaStudioPulseRequest,
  AishaStudioPulseResponse,
  AishaEngineTrace,
  AishaMemorySummary,
  AishaStateEnvelope,
  AishaTruthRecord,
  AishaEngineError,
  AishaSpeakerResponse,
  AishaRelationshipDelta,
  AishaCharacterState,
  AishaModalityMetadata,
  AishaRecentMessage,
} from "./studioPulseContract";

export {
  processAishaRequest,
  __createPostgresProductionStoresForTests,
  __resetProductionDepsForTests,
  type AishaHostAdapterOptions,
} from "./aishaHostAdapter";
