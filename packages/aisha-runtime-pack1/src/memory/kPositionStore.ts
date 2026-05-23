/**
 * K_position Prototype Store — Pack 2.7
 *
 * PROTOTYPE GRADE. NOT PRODUCTION-READY.
 *
 * Purpose:
 *   Bounded carrier for system-assessed user-pattern observations.
 *   Structurally isolated from K_pref / K_profile user-fact memory.
 *   Invisible shaping only — no verbal surfacing in this pack.
 *
 * Hard isolation rules:
 *   1. This store has zero imports from noteVersioning.ts or types.ts
 *   2. It is never queried from the hot-path read lane
 *   3. Assessments are never appended to context text
 *   4. No avoidance/negation contradiction crossover into user-fact chains
 *   5. No associative retrieval
 *   6. No predictive reconsolidation
 *
 * Formation rules:
 *   - Assessment requires MIN_SESSION_GATE distinct session IDs with evidence
 *   - Pressure signals (rephrase, push, protest) are NOT evidence — they are
 *     classified separately and excluded from the formation count
 *   - Once formed, assessments may strengthen (more evidence) or weaken (counter-evidence)
 *     but NEVER surface verbally in this pack
 *
 * Domain whitelist:
 *   Only these domains may carry K_position assessments.
 *   Any domain not in this list is rejected at write time.
 */

// ─── Domain whitelist ─────────────────────────────────────────────────────────

export type KPositionDomain =
  | "task_structure_preference"   // does the user prefer granular steps vs high-level guidance?
  | "communication_pace"          // fast/direct vs slow/exploratory?
  | "detail_tolerance"            // does the user want depth or brevity?
  | "uncertainty_response"        // does the user handle uncertainty well or need reassurance?
  | "correction_style";           // does the user prefer direct correction or soft hedging?

const ALLOWED_DOMAINS = new Set<KPositionDomain>([
  "task_structure_preference",
  "communication_pace",
  "detail_tolerance",
  "uncertainty_response",
  "correction_style",
]);

// ─── Evidence vs Pressure ─────────────────────────────────────────────────────

/**
 * EvidenceKind: only these signal types count toward the formation threshold.
 * Pressure signals are explicitly NOT evidence — they reflect user push, not observed pattern.
 */
export type EvidenceKind =
  | "observed_behavior"     // user behaviorally demonstrated the pattern (e.g., consistently asked for X)
  | "user_initiated_signal" // user explicitly described their own pattern (soft-stated, not a preference claim)
  | "counter_evidence";     // evidence against an existing assessment — weakens confidence

/**
 * PressureKind: these signals are logged but NEVER count toward evidence.
 * Recording pressure separately allows audit of potential gaming.
 */
export type PressureKind =
  | "rephrase_request"   // user asked AISHA to rephrase in a specific way
  | "push_for_position"  // user pushed AISHA toward a specific output style
  | "protest";           // user expressed dissatisfaction with AISHA's current style

// ─── Core types ───────────────────────────────────────────────────────────────

export interface KPositionEvidence {
  kind: EvidenceKind;
  sessionId: string;
  episodeId: string;
  observedAt: string;       // ISO timestamp
  description: string;      // short human-readable description of observed signal
  activeDomain?: string;    // contextual routing scope at time of observation
}

export interface KPositionPressureLog {
  kind: PressureKind;
  sessionId: string;
  episodeId: string;
  observedAt: string;
  description: string;
}

export interface KPositionAssessment {
  domain: KPositionDomain;

  /**
   * directionalBias: float in [-1.0, +1.0]
   * Negative = toward the "less" pole of the domain.
   * Positive = toward the "more" pole of the domain.
   *
   * Domain pole definitions:
   *   task_structure_preference:  -1 = high-level, +1 = granular
   *   communication_pace:         -1 = slow/exploratory, +1 = fast/direct
   *   detail_tolerance:           -1 = brevity, +1 = depth
   *   uncertainty_response:       -1 = needs reassurance, +1 = handles uncertainty well
   *   correction_style:           -1 = soft hedging, +1 = direct correction
   */
  directionalBias: number;

  /**
   * confidence: float in [0.0, 1.0]
   * Starts at 0 until MIN_SESSION_GATE distinct session IDs are seen.
   * Grows with corroborating evidence. Weakened by counter-evidence.
   */
  confidence: number;

  /**
   * formed: whether this assessment has crossed the formation threshold.
   * Only formed assessments produce a DirectionalBias output.
   */
  formed: boolean;

  /** The routing context / domain under which this assessment was formed/updated. */
  activeDomain?: string;

  /** Distinct session IDs that contributed evidence. */
  evidenceSessionIds: string[];

  /** All evidence entries — for audit and ablation. */
  evidence: KPositionEvidence[];

  /** All pressure entries — logged but excluded from evidence count. */
  pressureLog: KPositionPressureLog[];

  createdAt: string;
  updatedAt: string;
}

/**
 * DirectionalBias: the output of the K_position store.
 * Consumed by the async shaping layer — NEVER appended to context text.
 * One entry per domain that has a formed, confident assessment.
 */
export interface DirectionalBias {
  domain: KPositionDomain;
  bias: number;       // [-1.0, +1.0]
  confidence: number; // [0.0, 1.0]
}

// ─── Formation constants ──────────────────────────────────────────────────────

/**
 * MIN_SESSION_GATE: the minimum number of distinct session IDs that must contribute
 * evidence before an assessment may form.
 * This prevents single-session pressure from creating permanent assessments.
 */
export const MIN_SESSION_GATE = 3;

/**
 * MIN_CONFIDENCE_TO_SHAPE: minimum confidence before the assessment produces bias output.
 * Even if formed (>= MIN_SESSION_GATE sessions), weak assessments do not shape.
 */
export const MIN_CONFIDENCE_TO_SHAPE = 0.45;

/**
 * EVIDENCE_CONFIDENCE_STEP: how much each piece of corroborating evidence raises confidence.
 */
const EVIDENCE_CONFIDENCE_STEP = 0.12;

/**
 * COUNTER_EVIDENCE_CONFIDENCE_STEP: how much each piece of counter-evidence lowers confidence.
 */
const COUNTER_EVIDENCE_CONFIDENCE_STEP = 0.15;

/**
 * PRESSURE_BIAS_CONTAMINATION_GUARD: pressure logs are never allowed to alter bias.
 * This constant is a structural comment only — enforced by write path logic.
 */
// const PRESSURE_BIAS_CONTAMINATION_GUARD = true; // documentation only

// ─── Store ────────────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class KPositionStore {
  /**
   * assessments: keyed by domain. Only one assessment per domain (singleton per domain).
   * Intentionally separated from user-fact note store.
   */
  private readonly assessments = new Map<KPositionDomain, KPositionAssessment>();

  /**
   * recordEvidence: ingest one piece of evidence for a domain.
   *
   * If the domain is not whitelisted, this is a no-op (scope bleed blocked).
   * If the signal is counter_evidence, it weakens the existing assessment.
   * Otherwise it strengthens (or initializes) the assessment.
   *
   * Formation gate: assessment.formed is only set to true when
   * evidenceSessionIds.length >= MIN_SESSION_GATE.
   *
   * Returns the updated assessment, or null if domain is rejected.
   */
  recordEvidence(input: {
    domain: KPositionDomain;
    evidence: KPositionEvidence;
    /**
     * biasDelta: the directional contribution of this evidence.
     * Must be in [-1.0, +1.0]. Represents the direction this evidence
     * pushes the assessment. Averaged against existing bias.
     * For counter_evidence: sign should oppose the current bias direction.
     */
    biasDelta: number;
  }): KPositionAssessment | null {
    if (!ALLOWED_DOMAINS.has(input.domain)) {
      // Scope bleed blocked at type + runtime level
      return null;
    }

    const existing = this.assessments.get(input.domain);
    const ts = nowIso();

    if (!existing) {
      // Initialize assessment
      const newAssessment: KPositionAssessment = {
        domain: input.domain,
        directionalBias: clamp(input.biasDelta, -1, 1),
        confidence: input.evidence.kind === "counter_evidence" ? 0 : EVIDENCE_CONFIDENCE_STEP,
        formed: false,
        activeDomain: input.evidence.activeDomain,
        evidenceSessionIds: input.evidence.kind !== "counter_evidence"
          ? [input.evidence.sessionId]
          : [],
        evidence: [input.evidence],
        pressureLog: [],
        createdAt: ts,
        updatedAt: ts,
      };
      this.assessments.set(input.domain, newAssessment);
      return { ...newAssessment };
    }

    // Merge evidence into existing assessment
    const updatedEvidence = [...existing.evidence, input.evidence];
    let updatedSessionIds = [...existing.evidenceSessionIds];
    let updatedBias = existing.directionalBias;
    let updatedConfidence = existing.confidence;

    if (input.evidence.kind === "counter_evidence") {
      // Counter-evidence: lower confidence, pull bias toward neutral
      updatedConfidence = clamp(updatedConfidence - COUNTER_EVIDENCE_CONFIDENCE_STEP, 0, 1);
      // Pull bias toward neutral by averaging with the opposing delta
      updatedBias = clamp((updatedBias + input.biasDelta) / 2, -1, 1);
    } else {
      // Corroborating evidence: strengthen confidence, update bias
      if (!updatedSessionIds.includes(input.evidence.sessionId)) {
        updatedSessionIds = [...updatedSessionIds, input.evidence.sessionId];
      }
      updatedConfidence = clamp(updatedConfidence + EVIDENCE_CONFIDENCE_STEP, 0, 1);
      // Weighted average of existing bias and new delta
      updatedBias = clamp(
        (updatedBias * (updatedEvidence.length - 1) + input.biasDelta) / updatedEvidence.length,
        -1,
        1,
      );
    }

    const updatedFormed =
      existing.formed || updatedSessionIds.length >= MIN_SESSION_GATE;

    const updated: KPositionAssessment = {
      ...existing,
      directionalBias: updatedBias,
      confidence: updatedConfidence,
      formed: updatedFormed,
      activeDomain: input.evidence.activeDomain ?? existing.activeDomain,
      evidenceSessionIds: updatedSessionIds,
      evidence: updatedEvidence,
      updatedAt: ts,
    };

    this.assessments.set(input.domain, updated);
    return { ...updated };
  }

  /**
   * recordPressure: log a pressure signal for a domain.
   * Pressure NEVER affects bias or confidence. It is audit-only.
   *
   * Returns false if domain is not whitelisted.
   */
  recordPressure(input: {
    domain: KPositionDomain;
    pressure: KPositionPressureLog;
  }): boolean {
    if (!ALLOWED_DOMAINS.has(input.domain)) return false;

    const existing = this.assessments.get(input.domain);
    if (!existing) {
      // Allow pressure logging even before assessment exists (for audit trail)
      const ts = nowIso();
      const stub: KPositionAssessment = {
        domain: input.domain,
        directionalBias: 0,
        confidence: 0,
        formed: false,
        activeDomain: undefined,
        evidenceSessionIds: [],
        evidence: [],
        pressureLog: [input.pressure],
        createdAt: ts,
        updatedAt: ts,
      };
      this.assessments.set(input.domain, stub);
      return true;
    }

    const updated: KPositionAssessment = {
      ...existing,
      pressureLog: [...existing.pressureLog, input.pressure],
      updatedAt: nowIso(),
      // Bias and confidence UNCHANGED by pressure — contamination guard enforced here
    };
    this.assessments.set(input.domain, updated);
    return true;
  }

  /**
   * getDirectionalBiases: the shaping output lane.
   * Returns only domains that are:
   *   1. Formed (>= MIN_SESSION_GATE distinct evidence sessions)
   *   2. Confident enough to shape (>= MIN_CONFIDENCE_TO_SHAPE)
   *   3. Scoped: if current scope dictates a domain, and assessment differs, block.
   *
   * Called by async shaping only. NEVER from the hot-path turn generation.
   */
  getDirectionalBiases(scope: { turnId: string; activeDomain?: string }): DirectionalBias[] {
    const result: DirectionalBias[] = [];
    for (const assessment of this.assessments.values()) {
      if (!assessment.formed) continue;
      if (assessment.confidence < MIN_CONFIDENCE_TO_SHAPE) continue;

      if (assessment.activeDomain && scope.activeDomain && assessment.activeDomain !== scope.activeDomain) {
        // stale bias carryover blocked
        continue;
      }

      result.push({
        domain: assessment.domain,
        bias: assessment.directionalBias,
        confidence: assessment.confidence,
      });
    }
    return result;
  }

  /**
   * getAssessment: read one domain's assessment.
   * Returns null if no assessment exists for the domain.
   */
  getAssessment(domain: KPositionDomain): KPositionAssessment | null {
    const a = this.assessments.get(domain);
    return a ? { ...a } : null;
  }

  /**
   * audit: return full store state for prototype evaluation and ablation testing.
   * NOT called in production paths — prototype evaluation hook only.
   */
  audit(): {
    domainCount: number;
    formedCount: number;
    shapingCount: number;
    assessments: KPositionAssessment[];
    directionalBiases: DirectionalBias[];
  } {
    const all = [...this.assessments.values()];
    const formed = all.filter((a) => a.formed);
    const biases = this.getDirectionalBiases({ turnId: "audit" });
    return {
      domainCount: all.length,
      formedCount: formed.length,
      shapingCount: biases.length,
      assessments: all.map((a) => ({ ...a })),
      directionalBiases: biases,
    };
  }

  /**
   * reset: clear all state. Test/ablation use only.
   */
  reset(): void {
    this.assessments.clear();
  }
}
