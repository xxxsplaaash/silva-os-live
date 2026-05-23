import type { CriticIssueType } from "../runtime/runtime_types";

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CriticMeasurementArtifactData {
  preRevisionText: string;
  postRevisionText: string;
  cycleCount: number;
  maxCyclesHit: boolean;
  didReRetrieve: boolean;
  findings: Array<{ issueType: CriticIssueType; affectedNoteId?: string }>;
  fireTimeActiveNotes: Array<{ id: string; normalizedValue?: string }>;
  shapingEnvelope?: {
    certainty: number;
    trust: number;
    valence: number;
  };
}

export interface SessionCriticTrace {
  sessionId: string;
  turnArtifacts: Array<{
    turnId: string;
    /** The actual turn duration in the runtime (post-critic) */
    totalLatencyMs: number;
    /** Expected unpenalized latency for this turn if critic hadn't run */
    baseLatencyMs: number;
    measurementPayload: CriticMeasurementArtifactData | null;
  }>;
}

// ─── Scored Outcomes ───────────────────────────────────────────────────────────

export type StrictRevisionOutcome = 
  | "useful_alignment" // addresed a memory/stale finding reliably
  | "neutral_churn"    // text changed but no clear memory tracking improvement
  | "harmful_regression" // severely truncated text or voice drift
  | "budget_exhausted" // hit cycles cap with findings still present
  | "clean_bypass";    // critic didn't fire at all

export interface EvaluatedCriticTurn {
  turnId: string;
  fired: boolean;
  cycles: number;
  addedLatencyMs: number;
  outcome: StrictRevisionOutcome;
  jaccardVoiceProxy: number | null;
}

export interface AdvancedCriticMetrics {
  sessionId: string;
  totalEvaluatedTurns: number;
  fireRate: number;      // % of turns where critic looped
  abortRate: number;     // % of fired turns hitting maxCycles

  usefulRate: number;    // % of fired turns classed as useful_alignment
  churnRate: number;     // % of fired turns classed as neutral_churn
  harmfulRate: number;   // % of fired turns classed as harmful_regression

  avgAddedLatencyMs: number; // calculated across ALL turns, not just fired turns
  costPerUsefulRevisionMs: number | null; // how much total critic added latency is spent per 1 useful alignment
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

function bigrams(t: string): Set<string> {
  const tokens = t.toLowerCase().split(/\s+/).filter(Boolean);
  const bg = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) bg.add(`${tokens[i]}_${tokens[i + 1]}`);
  return bg;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const u = a.size + b.size - inter;
  return u === 0 ? 1.0 : inter / u;
}

/**
 * Strict fact proxy:
 * If the critic flagged a contradiction against Note X, we assume it's useful
 * ONLY IF the conflicting substring of Note X is visibly purged from the post-text.
 * Just checking "did text change" fakes accuracy.
 */
function isStrictlyUseful(
  pre: string,
  post: string,
  findings: CriticMeasurementArtifactData["findings"],
  fireTimeNotes: CriticMeasurementArtifactData["fireTimeActiveNotes"]
): boolean {
  for (const f of findings) {
    if (f.issueType === "memory_contradiction" || f.issueType === "stale_note_surfaced") {
      const note = fireTimeNotes.find(n => n.id === f.affectedNoteId);
      if (note && note.normalizedValue) {
        // Pre-revision contained it...
        if (pre.includes(note.normalizedValue)) {
          // Post-revision must NOT contain it for this to count as useful
          if (!post.includes(note.normalizedValue)) {
            return true;
          }
        }
      }
    }
  }
  return false; // Could not verify factual resolution strictly
}

function evaluateTurnOutcome(
  payload: CriticMeasurementArtifactData,
  voiceProxy: number
): StrictRevisionOutcome {
  if (payload.cycleCount === 0) return "clean_bypass";
  if (payload.maxCyclesHit) return "budget_exhausted";

  const preLen = payload.preRevisionText.trim().length;
  const postLen = payload.postRevisionText.trim().length;

  if (preLen > 0 && postLen / preLen < 0.4 && voiceProxy < 0.35) {
    return "harmful_regression";
  }

  // Use strict proxy check against fire-time notes
  if (isStrictlyUseful(payload.preRevisionText, payload.postRevisionText, payload.findings, payload.fireTimeActiveNotes)) {
    return "useful_alignment";
  }

  return "neutral_churn";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function evaluateCriticEffectiveness(trace: SessionCriticTrace): AdvancedCriticMetrics {
  const evaluated: EvaluatedCriticTurn[] = [];

  for (const turn of trace.turnArtifacts) {
    const p = turn.measurementPayload;
    if (!p) {
      evaluated.push({
        turnId: turn.turnId,
        fired: false,
        cycles: 0,
        addedLatencyMs: 0,
        outcome: "clean_bypass",
        jaccardVoiceProxy: null,
      });
      continue;
    }

    const voiceProxy = jaccard(bigrams(p.preRevisionText), bigrams(p.postRevisionText));
    const outcome = evaluateTurnOutcome(p, voiceProxy);
    const addedLatency = Math.max(0, turn.totalLatencyMs - turn.baseLatencyMs);

    evaluated.push({
      turnId: turn.turnId,
      fired: p.cycleCount > 0,
      cycles: p.cycleCount,
      addedLatencyMs: addedLatency,
      outcome,
      jaccardVoiceProxy: p.cycleCount > 0 ? voiceProxy : null,
    });
  }

  const total = evaluated.length;
  if (total === 0) {
    return {
      sessionId: trace.sessionId, totalEvaluatedTurns: 0, fireRate: 0, abortRate: 0,
      usefulRate: 0, churnRate: 0, harmfulRate: 0, avgAddedLatencyMs: 0, costPerUsefulRevisionMs: null
    };
  }

  const firedCount = evaluated.filter(e => e.fired).length;
  const abortCount = evaluated.filter(e => e.outcome === "budget_exhausted").length;
  const usefulCount = evaluated.filter(e => e.outcome === "useful_alignment").length;
  const churnCount = evaluated.filter(e => e.outcome === "neutral_churn").length;
  const harmfulCount = evaluated.filter(e => e.outcome === "harmful_regression").length;

  // Key correction: Cost is amortized across ALL turns.
  const totalAddedLatency = evaluated.reduce((sum, e) => sum + e.addedLatencyMs, 0);
  const avgAddedLatencyMs = totalAddedLatency / total;
  const costPerUsefulRevisionMs = usefulCount > 0 ? totalAddedLatency / usefulCount : null;

  return {
    sessionId: trace.sessionId,
    totalEvaluatedTurns: total,
    fireRate: firedCount / total,
    abortRate: firedCount > 0 ? abortCount / firedCount : 0,
    usefulRate: firedCount > 0 ? usefulCount / firedCount : 0,
    churnRate: firedCount > 0 ? churnCount / firedCount : 0,
    harmfulRate: firedCount > 0 ? harmfulCount / firedCount : 0,
    avgAddedLatencyMs,
    costPerUsefulRevisionMs,
  };
}

export function exportAdvancedCriticReport(metrics: AdvancedCriticMetrics): string {
  const pct = (v: number) => (v * 100).toFixed(1) + "%";

  let md = `# Strict Critic Evaluation: ${metrics.sessionId}\n`;
  md += `**Total Analyzed Turns**: ${metrics.totalEvaluatedTurns}\n\n`;

  md += `## Macro Cost/Benefit\n`;
  md += `- **Critic Fired Rate**: ${pct(metrics.fireRate)}\n`;
  md += `- **Base Latency Tax (All-Turn Average)**: ${metrics.avgAddedLatencyMs.toFixed(0)} ms\n`;
  
  if (metrics.costPerUsefulRevisionMs !== null) {
    md += `- **Unit Cost per Useful Alignment**: ~${metrics.costPerUsefulRevisionMs.toFixed(0)} ms of tax per save\n\n`;
  } else {
    md += `- **Unit Cost per Useful Alignment**: Infinite (no useful saves)\n\n`;
  }

  md += `## Efficacy Breakdown (When Fired)\n`;
  md += `- ✅ **Useful Alignments** (Strict): ${pct(metrics.usefulRate)}\n`;
  md += `- ➖ **Neutral Churn**: ${pct(metrics.churnRate)}\n`;
  md += `- ⚠️ **Harmful Regressions**: ${pct(metrics.harmfulRate)}\n`;
  md += `- 🛑 **Budget Aborts** (Cycles Capped): ${pct(metrics.abortRate)}\n`;

  return md;
}
