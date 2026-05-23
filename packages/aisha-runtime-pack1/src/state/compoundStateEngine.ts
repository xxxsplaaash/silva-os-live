import type { 
  IDeterministicStateEngine, 
  DeterministicStateResult, 
  TurnInput 
} from "../runtime/runtime_types";
import type { StateSnapshotRecord } from "../memory/types";
import type { ISignalClassifier } from "./signals";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function approach(current: number, target: number, amount: number): number {
  return current + (target - current) * amount;
}

export class CompoundStateEngine implements IDeterministicStateEngine {
  constructor(private readonly deps: { classifier: ISignalClassifier }) {}

  async update(input: {
    turn: TurnInput;
    previousSnapshot: StateSnapshotRecord | null;
  }): Promise<DeterministicStateResult> {
    const prevCompounds = input.previousSnapshot?.compounds ?? {};
    const prevVectors = input.previousSnapshot?.relationshipVectors ?? {};
    const prevBias = input.previousSnapshot?.practicalActionBias ?? {};
    const prevEnvelope = input.previousSnapshot?.expressiveEnvelope ?? {
      certainty: 0.5,
      load: 0.2,
      tension: 0.1,
      valence: 0,
      desire: 0.2,
      trust: 0,
    };

    let { trust, tension, valence, load, desire, certainty } = prevEnvelope;

    // Detect meaningful session gap for Multi-Session Drift Protection (Pack 1.3)
    const prevSessionId = input.previousSnapshot?.sessionId;
    const currentSessionId = input.turn.sessionId;
    
    if (prevSessionId && prevSessionId !== currentSessionId) {
      const prevMs = input.previousSnapshot ? Date.parse(input.previousSnapshot.createdAt) : 0;
      const currentMs = input.turn.timestamp ? Date.parse(input.turn.timestamp) : Date.now();
      const timeGapMs = currentMs - prevMs;
      
      const ONE_HOUR = 60 * 60 * 1000;
      if (timeGapMs > ONE_HOUR) {
        // Apply 20% boundary decay towards neutral (0)
        trust = approach(trust, 0, 0.20);
        tension = approach(tension, 0, 0.20);
      }
    }

    // Per-turn baseline relaxation (decay occurs on every turn)
    trust = approach(trust, 0, 0.02);
    tension = approach(tension, 0.1, 0.05);
    valence = approach(valence, 0, 0.05);
    load = approach(load, 0.2, 0.1);
    desire = approach(desire, 0.2, 0.05);
    certainty = approach(certainty, 0.5, 0.05);

    const signals = await this.deps.classifier.classify(input.turn.rawText);

    // Emphasize scale slightly to ensure thresholds are still met
    // Old math added 0.45. If distance is 0.9, we need multiplier 0.5 to add 0.45.
    
    // Tuning to strictly match old fixture deltas exactly at baseline:
    if (signals.praise_or_validation > 0) {
      trust = approach(trust, 1.0, 0.15 * signals.praise_or_validation);
      valence = approach(valence, 1.0, 0.2 * signals.praise_or_validation);
    }

    if (signals.contradiction_or_frustration > 0) {
      tension = approach(tension, 1.0, 0.5 * signals.contradiction_or_frustration); // 0.1 + 0.9*0.5 = 0.55
      trust = approach(trust, -1.0, 0.1 * signals.contradiction_or_frustration);
      certainty = approach(certainty, 1.0, 0.1 * signals.contradiction_or_frustration); // 0.5 + 0.5*0.1 = 0.55
    }

    if (signals.task_or_build_request > 0) {
      load = approach(load, 1.0, 0.18 * signals.task_or_build_request); // slightly lower to stay safely bounded beneath concise threshold
      certainty = approach(certainty, 1.0, 0.2 * signals.task_or_build_request); // 0.5 + 0.5*0.2 = 0.6
    }

    if (signals.uncertainty_or_hedge > 0) {
      certainty = approach(certainty, 0.0, 0.3 * signals.uncertainty_or_hedge); // 0.5 - 0.5*0.3 = 0.35
    }

    trust = clamp(trust, -1, 1);
    tension = clamp(tension, 0, 1);
    valence = clamp(valence, -1, 1);
    load = clamp(load, 0, 1);
    desire = clamp(desire, 0, 1);
    certainty = clamp(certainty, 0, 1);

    return {
      compounds: {
        ...prevCompounds,
        trust_signal: trust,
        tension_signal: tension,
      },
      relationshipVectors: {
        ...prevVectors,
        trust,
        caution: clamp(tension, 0, 1),
      },
      practicalActionBias: {
        ...prevBias,
        reassure: trust > 0.2 ? 1 : 0,
        hedge: certainty < 0.4 ? 1 : 0,
        deepen: desire > 0.4 ? 1 : 0,
      },
      expressiveEnvelope: {
        certainty,
        load,
        tension,
        valence,
        desire,
        trust,
      },
      activeRelationshipPersonId: input.turn.relationshipTargetPersonId,
      activeSpeakerId: input.turn.speakerId,
      debug: {
        classifier_output: signals,
      },
    };
  }
}
