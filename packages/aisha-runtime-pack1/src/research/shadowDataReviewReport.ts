/**
 * Pack 3.13 — Shadow Data Review: Report Renderer
 *
 * REVIEW LAYER ONLY. Pure functions that render LaneEvidenceReport[] into
 * markdown or machine-readable structured output for operator consumption.
 *
 * No LLM. No store calls. No Date.now(). All deterministic.
 */

import type { LaneEvidenceReport, MaybeInsufficient } from "./shadowDataReview";
import { INSUFFICIENT } from "./shadowDataReview";

// ─── Rendering Helpers ────────────────────────────────────────────────────────

function fmt(v: MaybeInsufficient<number>, decimals = 3): string {
  if (v === INSUFFICIENT) return "⚠ INSUFFICIENT";
  return v.toFixed(decimals);
}

function fmtMs(v: MaybeInsufficient<number>): string {
  if (v === INSUFFICIENT) return "⚠ INSUFFICIENT";
  return `${v.toFixed(1)}ms`;
}

function fmtCount(v: MaybeInsufficient<number>): string {
  if (v === INSUFFICIENT) return "⚠ INSUFFICIENT";
  return String(v);
}

function gateIcon(met: boolean): string {
  return met ? "✅" : "❌";
}

function criterionIcon(v: MaybeInsufficient<number>, required: number, op: ">=" | "<="): string {
  if (v === INSUFFICIENT) return "⚠";
  if (op === ">=") return v >= required ? "✅" : "❌";
  return v <= required ? "✅" : "❌";
}

function boolIcon(v: boolean): string {
  return v ? "✅" : "❌";
}

// ─── Per-Lane Markdown ────────────────────────────────────────────────────────

/**
 * Render a single LaneEvidenceReport as a markdown section.
 */
export function renderLaneReportMarkdown(report: LaneEvidenceReport): string {
  const laneName = report.lane === "associative" ? "Associative Retrieval" : "Trace Consumption";

  const lines: string[] = [
    `## ${laneName} (lane: \`${report.lane}\`)`,
    "",
    `**Promotion Gate:** ${gateIcon(report.promotionGateMet)} ${report.promotionGateMet ? "MET" : "NOT MET"}`,
    "",
    "### Evidence Collection",
    `- **Total Entries Collected**: ${report.totalEntries}`,
    `- **Operator-Reviewed Entries**: ${report.operatorReviewedCount} / 10 required ${criterionIcon(report.operatorReviewedCount, 10, ">=")}`,
    "",
    "### Recall & Precision",
    `- **Contradiction Recovery Rate**: ${fmt(report.contradictionRecoveryRate)} ${
      report.contradictionRecoveryRate !== INSUFFICIENT
        ? criterionIcon(report.contradictionRecoveryRate, 0.80, ">=")
        : "⚠"
    } *(need ≥ 0.80)*`,
    `- **Noise / Precision Loss Rate**: ${fmt(report.noisePrecisionLossRate)} ${
      report.noisePrecisionLossRate !== INSUFFICIENT
        ? criterionIcon(report.noisePrecisionLossRate, 0.25, "<=")
        : "⚠"
    } *(need ≤ 0.25)*`,
    "",
    "### Latency & Token Budget",
    `- **Shadow p99 Latency**: ${fmtMs(report.p99LatencyMs)} ${
      report.p99LatencyMs !== INSUFFICIENT
        ? criterionIcon(report.p99LatencyMs, 5, "<=")
        : "⚠"
    } *(need ≤ 5ms)*`,
    `- **Token Overflow Count**: ${fmtCount(report.tokenOverflowCount)} ${
      report.tokenOverflowCount !== INSUFFICIENT
        ? criterionIcon(report.tokenOverflowCount, 0, "<=")
        : "⚠"
    } *(need = 0)*`,
    "",
    "### Usefulness Metrics",
    `- **Review Disambiguation Rate**: ${fmt(report.reviewDisambiguationRate)}${
      report.lane === "trace"
        ? ` ${report.reviewDisambiguationRate !== INSUFFICIENT ? criterionIcon(report.reviewDisambiguationRate, 0.50, ">=") : "⚠"} *(trace gate: need ≥ 0.50)*`
        : ""
    }`,
    `- **Utilisation Rate**: ${fmt(report.utilisationRate)}${
      report.lane === "trace"
        ? ` ${report.utilisationRate !== INSUFFICIENT ? criterionIcon(report.utilisationRate, 0.30, ">=") : "⚠"} *(trace gate: need ≥ 0.30)*`
        : ""
    }`,
    "",
    "### Evidence Coverage",
    `- **Note Graph Size Logged**: ${boolIcon(report.noteGraphSizeEvidencePresent)} *(required for graph-density validation)*`,
  ];

  if (report.lane === "trace") {
    lines.push(
      `- **Episode Summary Population Rate**: ${fmt(report.episodeSummaryPopulationRate)} *(trace lane only)*`,
    );
  }

  if (report.unmetGateCriteria.length > 0) {
    lines.push("", "### Unmet Gate Criteria");
    for (const criterion of report.unmetGateCriteria) {
      lines.push(`- ❌ ${criterion}`);
    }
  }

  return lines.join("\n");
}

// ─── Combined Report ──────────────────────────────────────────────────────────

/**
 * Render a full Pack 3.13 shadow data review report for both lanes.
 * Outputs are independent — lanes are never merged.
 */
export function renderFullShadowDataReport(
  reports: { associative: LaneEvidenceReport; trace: LaneEvidenceReport },
  label = "Pack 3.13 — Shadow Data Review Report",
): string {
  const bothMet = reports.associative.promotionGateMet && reports.trace.promotionGateMet;
  const eitherMet = reports.associative.promotionGateMet || reports.trace.promotionGateMet;

  const header = [
    `# ${label}`,
    "",
    "> **Status:** This is a shadow-data evidence report, not a promotion decision.",
    "> Promotion requires Pack 3.12 gate criteria to be satisfied on real session data.",
    "> Live-path promotion is explicitly denied until Pack 3.12 gate criteria are met.",
    "",
    "## Summary",
    `- **Associative Lane Gate**: ${gateIcon(reports.associative.promotionGateMet)} ${reports.associative.promotionGateMet ? "MET" : "NOT MET"}`,
    `- **Trace Lane Gate**: ${gateIcon(reports.trace.promotionGateMet)} ${reports.trace.promotionGateMet ? "MET" : "NOT MET"}`,
    `- **Overall**: ${bothMet ? "✅ Both gates met — eligible for Pack 3.12 live-path decision" : eitherMet ? "⚠ One lane gate met — partial evidence only" : "❌ Neither gate met — continue shadow data collection"}`,
    "",
  ].join("\n");

  return [
    header,
    renderLaneReportMarkdown(reports.associative),
    "",
    "---",
    "",
    renderLaneReportMarkdown(reports.trace),
  ].join("\n");
}

// ─── Machine-Readable Serializer ─────────────────────────────────────────────

/**
 * Serialize a LaneEvidenceReport to a compact JSON-safe object.
 * All INSUFFICIENT values are serialized as the string "INSUFFICIENT".
 */
export function serializeLaneReport(report: LaneEvidenceReport): Record<string, unknown> {
  const ser = (v: MaybeInsufficient<number>): number | "INSUFFICIENT" =>
    v === INSUFFICIENT ? "INSUFFICIENT" : v;

  return {
    lane: report.lane,
    totalEntries: report.totalEntries,
    operatorReviewedCount: report.operatorReviewedCount,
    contradictionRecoveryRate: ser(report.contradictionRecoveryRate),
    noisePrecisionLossRate: ser(report.noisePrecisionLossRate),
    p99LatencyMs: ser(report.p99LatencyMs),
    tokenOverflowCount: ser(report.tokenOverflowCount),
    reviewDisambiguationRate: ser(report.reviewDisambiguationRate),
    utilisationRate: ser(report.utilisationRate),
    noteGraphSizeEvidencePresent: report.noteGraphSizeEvidencePresent,
    episodeSummaryPopulationRate: ser(report.episodeSummaryPopulationRate),
    promotionGateMet: report.promotionGateMet,
    unmetGateCriteria: report.unmetGateCriteria,
  };
}
