/**
 * T27 First Human Review Run — Pack 3.1
 *
 * PROTOTYPE GRADE.
 *
 * Purpose:
 *   Produce a deterministic, ingestible blank JSON template for human reviewers
 *   that strictly matches the CompletedRating interface.
 *   Provide validation to ensure incoming filled templates haven't had their
 *   structure altered.
 *
 * Use:
 *   Generate blind review packet (T25) + blank templates (T27).
 *   Distribute to human.
 *   Receive filled JSON.
 *   Validate with validateReviewerTemplate().
 *   Pass to ingestRatings() (T26).
 */

import { CompletedRating } from "./t26ReviewIngestion";
import { BlindedPacket } from "./t25BlindABReview";

/**
 * Generate a blank, zero-filled review template perfectly matching
 * the review packet's scenarios.
 */
export function generateBlankReviewTemplate(packet: BlindedPacket): CompletedRating[] {
  return packet.pairs.map((pair) => ({
    scenarioId: pair.scenarioId,
    sideA: {
      directness: 0,
      usefulness: 0,
      loopBreaking: 0,
      voiceIntegrity: 0,
      overAggression: 0,
      weirdnessMismatch: 0,
    },
    sideB: {
      directness: 0,
      usefulness: 0,
      loopBreaking: 0,
      voiceIntegrity: 0,
      overAggression: 0,
      weirdnessMismatch: 0,
    },
    overallPreference: "Tie" as const, // Neutral default
    note: "Reviewer comment here (optional)",
  }));
}

/**
 * Validate incoming JSON payload to ensure it conforms exactly
 * to CompletedRating[] without duck-typing issues.
 */
export function validateReviewerTemplate(data: any): data is CompletedRating[] {
  if (!Array.isArray(data)) {
    return false;
  }

  for (const item of data) {
    if (typeof item !== "object" || item === null) return false;
    if (typeof item.scenarioId !== "string") return false;
    
    if (typeof item.sideA !== "object" || item.sideA === null) return false;
    if (typeof item.sideB !== "object" || item.sideB === null) return false;

    const requiredDims = [
      "directness",
      "usefulness",
      "loopBreaking",
      "voiceIntegrity",
      "overAggression",
      "weirdnessMismatch",
    ];

    for (const dim of requiredDims) {
      if (typeof item.sideA[dim] !== "number") return false;
      if (typeof item.sideB[dim] !== "number") return false;
    }

    if (!["A", "B", "Tie"].includes(item.overallPreference)) {
      return false;
    }
  }

  return true;
}
