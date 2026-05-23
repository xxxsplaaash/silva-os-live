/**
 * Pack 3.15 — Shadow Session Sampling Layer
 *
 * Provides a bounded workflow for enabling real-session shadow evidence collection,
 * exporting evidence snapshots to JSON, generating annotation templates, and
 * loading annotated snapshots back into the Pack 3.13 review layer.
 *
 * Strict Guardrails (per Pack 3.11/3.14):
 *  - Sampling never modifies production retrieval fields.
 *  - Associative and trace lanes remain logically independent.
 *  - Annotations never overwrite the raw immutable ShadowAuditEntry payloads.
 *  - This module is for evidence collection and review workflows, not runtime routing.
 */

import * as fs from "fs";
import {
  ShadowEvidenceStore,
  exportSnapshot,
  importSnapshot,
  type ShadowEvidenceSnapshot,
  type ShadowEvidenceAnnotation,
} from "./shadowEvidenceStore";

// ─── Shadow Sampling Protocol ──────────────────────────────────────────────────

/**
 * Controller for enabling/disabling shadow data collection in the active process.
 * Modifies process.env flags read by shadowRetrievalOrchestrator.
 */
export class ShadowSessionSampler {
  /**
   * Enable associative lane shadow sampling.
   * Activates AISHA_SHADOW_ASSOCIATIVE flag.
   */
  static enableAssociativeSampling(): void {
    process.env.AISHA_SHADOW_ASSOCIATIVE = "1";
  }

  /**
   * Enable trace lane shadow sampling.
   * Activates AISHA_SHADOW_TRACE flag.
   */
  static enableTraceSampling(): void {
    process.env.AISHA_SHADOW_TRACE = "1";
  }

  /**
   * Disable all shadow sampling for the active process.
   */
  static disableSampling(): void {
    delete process.env.AISHA_SHADOW_ASSOCIATIVE;
    delete process.env.AISHA_SHADOW_TRACE;
  }
}

// ─── Evidence Export Workflow ─────────────────────────────────────────────────

/**
 * Export the current contents of a ShadowEvidenceStore to a JSON-safe snapshot file.
 */
export function exportShadowEvidence(store: ShadowEvidenceStore, filePath: string, exportedAt: string): void {
  const snapshot = exportSnapshot(store, exportedAt);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf8");
}

/**
 * Generate a blank annotation template for all evidence entries in a specific lane.
 * If an entry already has annotations, they are preserved in the template.
 */
export function generateAnnotationTemplate(
  store: ShadowEvidenceStore,
  lane: "associative" | "trace"
): ShadowEvidenceAnnotation[] {
  return store.listByLane(lane).map((evidenceId) => {
    const existing = store.getAnnotation(evidenceId);
    return {
      evidenceId,
      operatorReviewed: existing?.operatorReviewed ?? false,
      contradictionCaught: existing?.contradictionCaught,
      noiseFlagged: existing?.noiseFlagged,
      noteGraphSizeLogged: existing?.noteGraphSizeLogged,
      episodeSummaryPopulationRate: existing?.episodeSummaryPopulationRate,
      annotatedAt: existing?.annotatedAt,
    };
  });
}

/**
 * Export an annotation template to a JSON file.
 * The output array maps 1:1 with the raw payloads in the snapshot for the given lane.
 */
export function exportAnnotationTemplate(
  store: ShadowEvidenceStore,
  lane: "associative" | "trace",
  filePath: string
): void {
  const template = generateAnnotationTemplate(store, lane);
  fs.writeFileSync(filePath, JSON.stringify(template, null, 2), "utf8");
}

// ─── Evidence Import / Replay Workflow ────────────────────────────────────────

/**
 * Load an exported shadow evidence snapshot back into memory.
 * If an annotations file is provided, its contents are overlaid onto the store.
 *
 * This reconstructed store can then be fed into the Pack 3.13 review layer via
 * store.exportForReview(lane) -> aggregateLaneEvidence(lane, records).
 */
export function loadAnnotatedSnapshot(
  snapshotFilePath: string,
  annotationsFilePath?: string
): ShadowEvidenceStore {
  const snapshotRaw = fs.readFileSync(snapshotFilePath, "utf8");
  const snapshot = JSON.parse(snapshotRaw) as ShadowEvidenceSnapshot;
  
  const store = importSnapshot(snapshot);

  if (annotationsFilePath) {
    const annotationsRaw = fs.readFileSync(annotationsFilePath, "utf8");
    const annotations = JSON.parse(annotationsRaw) as ShadowEvidenceAnnotation[];
    
    for (const ann of annotations) {
      // Exclude evidenceId from the payload since annotate() injects it
      const { evidenceId, annotatedAt, ...fields } = ann;
      const appliedAt = annotatedAt ?? new Date().toISOString();
      
      // Ignore annotations for evidence IDs that don't exist in the snapshot
      if (store.get(evidenceId)) {
        store.annotate(evidenceId, fields, appliedAt);
      }
    }
  }

  return store;
}
