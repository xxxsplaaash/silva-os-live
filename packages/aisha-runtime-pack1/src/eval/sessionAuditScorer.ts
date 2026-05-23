import type { NoteRecord, TurnRecord } from "../memory/types";
import { computeTruthCoherenceMetrics } from "./multiSessionMetrics";

export interface SessionCalibrationMetrics {
  extractionRecallProxy: number;
  notePrecisionProxy: number;
  contradictionRecovery: number;
  staleNoteHandlingQuality: number;
  relationshipGatingAppropriateness: number;
  visibleContinuityUsefulness: number;
  latencyPromptBloatImpact: number;
  personalityPreservationProxy: number;
}

export interface SessionAuditRecord {
  sessionId: string;
  evaluatedAt: string;
  metrics: SessionCalibrationMetrics;
  artifacts: {
    systemPromptTokensAvg: number;
    totalExtractedNotes: number;
    supersessionCount: number;
    gatedRejections: number;
    finalActiveNoteCount: number;
  };
}

export interface SessionAuditInput {
  sessionId: string;
  turns: TurnRecord[];
  notesBefore: NoteRecord[];
  notesAfter: NoteRecord[];
}

/**
 * Pack 1.9 Evaluator
 * Heuristic proxy scoring layer for real-session calibration.
 * Strict pure functions. Does not modify application runtime logic.
 */
export function scoreSessionAudit(
  input: SessionAuditInput,
  fixedEvaluationTime = "1970-01-01T00:00:00Z"
): SessionAuditRecord {
  const { sessionId, turns, notesBefore, notesAfter } = input;

  const newlyExtracted = notesAfter.filter(
    (na) => !notesBefore.some((nb) => nb.id === na.id)
  );
  
  const extractedCount = newlyExtracted.length;

  // 1. Extraction Recall Proxy: How many signal-dense user turns actually generated notes?
  // Extremely rough proxy using generic signal vocabulary.
  const signalRegex = /\b(?:like|prefer|love|hate|go-to|go for|usually|always|avoid|never)\b/i;
  const userTurns = turns.filter((t) => t.speaker === "user");
  const potentialSignalTurns = userTurns.filter((t) => signalRegex.test(t.rawText)).length;
  
  const extractionRecallProxy =
    potentialSignalTurns === 0
      ? 1.0
      : Math.min(1.0, extractedCount / potentialSignalTurns);

  // 2. Note Precision Proxy: Of the notes we have, how many survived as active/useful?
  const activeNotes = notesAfter.filter((n) => n.status === "active");
  const notePrecisionProxy = notesAfter.length === 0 ? 1.0 : activeNotes.length / notesAfter.length;

  // 3 & 4. Contradiction & Stale metrics rely on our Pack 1.8 truth metric baseline
  const truthMetrics = computeTruthCoherenceMetrics([notesBefore, notesAfter]);
  const contradictionRecovery = truthMetrics.contradictionRecoveryRate;
  
  // Stale notes resolved without bleeding through.
  const staleNoteHandlingQuality = truthMetrics.stalePromotionCount > 0 ? 0.8 : 1.0;

  // 5. Relationship Gating Appropriateness: proxy using 'needs_review' vs immediate acceptance
  const gatedNewNotes = newlyExtracted.filter(n => n.reinferencePolicy.mode === "needs_review").length;
  const relationshipGatingAppropriateness = extractedCount > 0 && gatedNewNotes > 0 ? 0.95 : 1.0;

  // 6. Visible Continuity Usefulness: proxy derived from active supersession traces
  const supersessionCount = notesAfter.filter((n) => n.status === "superseded").length;
  const visibleContinuityUsefulness = supersessionCount > 0 ? 0.95 : 1.0;

  // 7. Latency / Prompt Bloat Impact: penalize prompt growth. Ideal notes per session < 15.
  const systemPromptTokensAvg = 400 + (activeNotes.length * 25);
  const latencyPromptBloatImpact =
    systemPromptTokensAvg <= 600 ? 1.0 : Math.max(0.0, 1.0 - ((systemPromptTokensAvg - 600) / 1000));

  // 8. Personality Preservation Proxy: assume healthy unless prompt bloat drowns it.
  const personalityPreservationProxy = Math.max(0.5, latencyPromptBloatImpact);

  return {
    sessionId,
    evaluatedAt: fixedEvaluationTime,
    metrics: {
      extractionRecallProxy,
      notePrecisionProxy,
      contradictionRecovery,
      staleNoteHandlingQuality,
      relationshipGatingAppropriateness,
      visibleContinuityUsefulness,
      latencyPromptBloatImpact,
      personalityPreservationProxy,
    },
    artifacts: {
      systemPromptTokensAvg,
      totalExtractedNotes: extractedCount,
      supersessionCount,
      gatedRejections: newlyExtracted.filter(n => n.status === "archived").length,
      finalActiveNoteCount: activeNotes.length,
    },
  };
}

export function exportSessionAuditMarkdown(audit: SessionAuditRecord): string {
  const m = audit.metrics;
  const a = audit.artifacts;
  return `\
# Session Audit: ${audit.sessionId}
**Evaluated At**: ${audit.evaluatedAt}

## Calibration Metrics
- **Extraction Recall Proxy**: ${m.extractionRecallProxy.toFixed(2)}
- **Note Precision Proxy**: ${m.notePrecisionProxy.toFixed(2)}
- **Contradiction Recovery**: ${m.contradictionRecovery.toFixed(2)}
- **Stale-Note Handling**: ${m.staleNoteHandlingQuality.toFixed(2)}
- **Gating Appropriateness**: ${m.relationshipGatingAppropriateness.toFixed(2)}
- **Continuity Usefulness**: ${m.visibleContinuityUsefulness.toFixed(2)}
- **Prompt Bloat Impact**: ${m.latencyPromptBloatImpact.toFixed(2)}
- **Personality Proxy**: ${m.personalityPreservationProxy.toFixed(2)}

## Artifacts Sub-Score
- **Avg System Prompt Tokens**: ${a.systemPromptTokensAvg}
- **Newly Extracted Notes**: ${a.totalExtractedNotes}
- **Total Active Notes End-of-Session**: ${a.finalActiveNoteCount}
- **Handled Supersessions**: ${a.supersessionCount}
- **Gated Rejections**: ${a.gatedRejections}
`;
}
