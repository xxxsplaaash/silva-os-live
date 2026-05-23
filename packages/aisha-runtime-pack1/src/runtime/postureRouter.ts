import { StateSnapshotRecord, TurnRecord } from "../memory/types";

export type PostureModeId = "PURE_A" | "EXPLORATION_EXPAND";

export interface PostureBias {
  domain: string;
  bias: number;
  confidence: number;
}

/**
 * Implements the conservative Pack 3.4 response routing policy.
 * Default is PURE_A.
 * Authorizes EXPLORATION_EXPAND only for high-confidence breadth/ideation requests.
 */
export class PostureRouter {
  public route(snapshot: StateSnapshotRecord, turn: TurnRecord): PostureModeId {
    const lower = turn.rawText.toLowerCase();

    // 1. Frustration Subtype Override Layer (Pack 3.4b)
    if (snapshot.expressiveEnvelope.tension > 0.4) {
      // We detect frustration. Now classify the subtype using minimal heuristics.
      const isDiagnostic = /\b(explain why|why this|why is it)\b/.test(lower);
      const isExecution = /\b(next command|how to run|next step|exact command)\b/.test(lower);
      const isJustFixIt = /\b(just fix it|exact working string|nothing else|just give me)\b/.test(lower);
      const isBlockedUncertain = /\b(don't know|where to look|want to quit|so frustrated)\b/.test(lower);

      // Explicitly map all 4 known frustration subtypes to PURE_A per Pack 3.4b policy.
      if (isDiagnostic || isExecution || isJustFixIt || isBlockedUncertain) {
        return "PURE_A";
      }

      // If tension > 0.4 but it doesn't match the known subtypes cleanly,
      // the conservative fallback is still PURE_A.
      return "PURE_A";
    }

    // 2. Standard Pack 3.4 Routing (preserves existing behavior for non-frustrated contexts)
    const isIdeation = /\b(brainstorm|ideate|ideas|explore|what kinds|directions)\b/.test(lower);
    if (isIdeation) {
      return "EXPLORATION_EXPAND";
    }

    return "PURE_A";
  }

  public getBiases(mode: PostureModeId): PostureBias[] {
    if (mode === "EXPLORATION_EXPAND") {
      return [
        { domain: "communication_pace", bias: -0.9, confidence: 1.0 },
        { domain: "detail_tolerance", bias: 0.9, confidence: 1.0 }
      ];
    }
    return []; // PURE_A
  }
}
