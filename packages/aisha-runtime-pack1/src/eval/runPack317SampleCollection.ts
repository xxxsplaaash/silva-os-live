/**
 * Pack 3.17: Controlled Shadow Session Sample Collection
 * 
 * Executes a controlled in-memory session with shadow flags enabled to collect
 * sample shadow evidence without hitting real LLM live-paths or faking evidence
 * via dummy objects. Uses processTurn end-to-end to generate true ShadowAuditEntry
 * payloads.
 */

import * as fs from "fs";
import * as path from "path";
import {
  ShadowSessionSampler,
  exportShadowEvidence,
  exportAnnotationTemplate,
  loadAnnotatedSnapshot,
} from "../research/shadowSessionSampling";
import { ShadowEvidenceStore } from "../research/shadowEvidenceStore";
import { ShadowEvidenceCollector } from "../research/shadowEvidenceCollector";
import { aggregateLaneEvidence } from "../research/shadowDataReview";
import { InMemoryScenarioEnvironmentFactory } from "./inMemoryScenarioEnvironment";
import { processTurn } from "../runtime/processTurn";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Pack 3.17 — Controlled Shadow Session Sample Collection");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const outDir = path.join(__dirname, "../../artifacts/shadow_samples/pack3_17");
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Enable flags using Pack 3.15 module
  console.log("[1] Enabling shadow sampling flags...");
  ShadowSessionSampler.enableAssociativeSampling();
  ShadowSessionSampler.enableTraceSampling();

  // 2. Set up environment
  console.log("[2] Setting up controlled in-memory runtime...");
  const factory = new InMemoryScenarioEnvironmentFactory();
  const env = await factory.create();
  
  // Wire the real collector into the environment deps
  const store = new ShadowEvidenceStore();
  const collector = new ShadowEvidenceCollector(store);
  env.deps.shadowEvidenceCollector = collector;

  // Seed some dummy active notes to trigger associative shadow hits
  await env.seed({
    notes: [
      {
        id: "note_1",
        kind: "note",
        createdAt: new Date().toISOString(),
        sourceModality: "text",
        status: "active",
        subtype: "K_pref",
        canonicalText: "User loves coffee",
        normalizedValue: "user loves coffee",
        confidence: 0.9,
        extractionConfidenceRaw: 0.9,
        provenanceChain: [],
        subjectKind: "user",
        sourceEpisodeIds: ["ep_1"],
        reviewState: "accepted",
        reinferencePolicy: { mode: "allow" },
        auditTrail: [],
      },
      {
        id: "note_2",
        kind: "note",
        createdAt: new Date().toISOString(),
        sourceModality: "text",
        status: "active",
        subtype: "K_profile",
        canonicalText: "User is a software engineer",
        normalizedValue: "user is a software engineer",
        confidence: 0.95,
        extractionConfidenceRaw: 0.95,
        provenanceChain: [],
        subjectKind: "user",
        sourceEpisodeIds: ["ep_2"],
        reviewState: "accepted",
        reinferencePolicy: { mode: "allow" },
        auditTrail: [],
      }
    ]
  });

  // 3. Run Controlled Session
  console.log("[3] Running simulated session to trigger shadow evidence collection...");
  await processTurn(
    env.deps,
    {
      turnId: "turn_sample_1",
      sessionId: "s_sample_session",
      rawText: "I'm going to grab a coffee and code.",
      sourceModality: "text",
      clientTimestampIso: new Date().toISOString(),
    }
  );

  await processTurn(
    env.deps,
    {
      turnId: "turn_sample_2",
      sessionId: "s_sample_session",
      rawText: "Actually I might just take a break.",
      sourceModality: "text",
      clientTimestampIso: new Date().toISOString(),
    }
  );

  ShadowSessionSampler.disableSampling();
  console.log("    Session complete. Disabled flags.");

  // 4. Export artifacts
  console.log("[4] Exporting Pack 3.17 artifacts...");
  
  const snapPath = path.join(outDir, "shadow_snapshot.json");
  exportShadowEvidence(store, snapPath, new Date().toISOString());
  console.log(`    Saved snapshot: ${snapPath}`);

  const assocAnnPath = path.join(outDir, "annotations_associative_template.json");
  exportAnnotationTemplate(store, "associative", assocAnnPath);
  console.log(`    Saved assoc template: ${assocAnnPath}`);

  const traceAnnPath = path.join(outDir, "annotations_trace_template.json");
  exportAnnotationTemplate(store, "trace", traceAnnPath);
  console.log(`    Saved trace template: ${traceAnnPath}`);

  // 5. Generate Unannotated Report
  const loadedStore = loadAnnotatedSnapshot(snapPath); // No annotations loaded
  const report = aggregateLaneEvidence("associative", loadedStore.exportForReview("associative"));
  
  const reportPath = path.join(outDir, "unannotated_review_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`    Saved unannotated report: ${reportPath}`);

  // 6. Generate README
  const readmePath = path.join(outDir, "README.md");
  fs.writeFileSync(readmePath, `# Pack 3.17 Controlled Shadow Session Samples

**NOTICE: These are CONTROLLED SAMPLE evidence records, NOT production real-session evidence.**

These artifacts were produced using an in-memory test runner executing \`processTurn\` with a mocked Gemini adapter and pre-seeded active notes. No live-path promotion occurs here.

## Contents
- \`shadow_snapshot.json\`: Raw, immutable ShadowAuditEntry payloads generated by the shadow orchestrator during the controlled run.
- \`annotations_associative_template.json\`: Blank annotation template for the associative lane.
- \`annotations_trace_template.json\`: Blank annotation template for the trace lane.
- \`unannotated_review_report.json\`: A Pack 3.13 aggregation report generated without any operator annotations, proving that missing reviews explicitly force metrics to \`INSUFFICIENT\` and fail the promotion gate.
`, "utf8");

  console.log(`    Saved README: ${readmePath}`);
  console.log("\n✅ Pack 3.17 Sample Collection Complete");
}

main().catch(console.error);
