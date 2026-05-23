import * as assert from "assert";
import { evaluateArchiveEligibility, exportArchiveManifestMarkdown, ARCHIVE_THRESHOLDS_DAYS } from "../memory/noteLifecyclePolicy";
import type { NoteRecord } from "../memory/types";

function mockOldNote(daysOld: number, overrides: Partial<NoteRecord>): NoteRecord {
  // We use a fixed eval time to avoid Date.now()
  const EVAL_TIME = Date.parse("2026-06-01T00:00:00Z");
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const createdAtMs = EVAL_TIME - (daysOld * MS_PER_DAY);

  return {
    id: "n1",
    kind: "note",
    createdAt: new Date(createdAtMs).toISOString(),
    updatedAt: new Date(createdAtMs).toISOString(),
    sourceModality: "text",
    subtype: "K_pref",
    canonicalText: "User preference: tea",
    confidence: 0.8,
    extractionConfidenceRaw: 0.8,
    provenanceChain: [],
    subjectKind: "user",
    sourceEpisodeIds: ["ep1"],
    status: "active",
    reinferencePolicy: { mode: "allow" },
    reviewState: "accepted",
    auditTrail: [],
    ...overrides,
  };
}

const EVAL_TIME_MS = Date.parse("2026-06-01T00:00:00Z");

export async function T18_superseded_archived_after_30_days() {
  const safe = mockOldNote(29, { status: "superseded" });
  assert.strictEqual(evaluateArchiveEligibility(safe, EVAL_TIME_MS), null);

  const sweep = mockOldNote(31, { status: "superseded" });
  const result = evaluateArchiveEligibility(sweep, EVAL_TIME_MS);
  assert.ok(result);
  assert.strictEqual(result.status, "archived");
}

export async function T18_rejected_archived_after_7_days() {
  const safe = mockOldNote(6, { reviewState: "rejected" });
  assert.strictEqual(evaluateArchiveEligibility(safe, EVAL_TIME_MS), null);

  const sweep = mockOldNote(8, { reviewState: "rejected" });
  const result = evaluateArchiveEligibility(sweep, EVAL_TIME_MS);
  assert.ok(result);
  assert.strictEqual(result.status, "archived");
}

export async function T18_stale_needs_review_archived_after_21_days() {
  const safe = mockOldNote(20, { status: "active", reinferencePolicy: { mode: "needs_review", reason: "drift" }});
  assert.strictEqual(evaluateArchiveEligibility(safe, EVAL_TIME_MS), null);

  const sweep = mockOldNote(22, { status: "active", reinferencePolicy: { mode: "needs_review", reason: "drift" }});
  const result = evaluateArchiveEligibility(sweep, EVAL_TIME_MS);
  assert.ok(result);
  assert.strictEqual(result.status, "archived");
}

export async function T18_active_clean_notes_not_swept_by_age() {
  const ancient = mockOldNote(500, { status: "active" });
  assert.strictEqual(evaluateArchiveEligibility(ancient, EVAL_TIME_MS), null);
}

export async function T18_manifest_renders_deterministic_sections() {
  const notes = [
    mockOldNote(31, { id: "ns1", status: "archived", reviewState: "accepted", canonicalText: "was old" }),
    mockOldNote(8, { id: "nr1", status: "archived", reviewState: "rejected", canonicalText: "was bad" }),
    mockOldNote(22, { id: "nt1", status: "archived", reviewState: "pending", reinferencePolicy: { mode: "needs_review", reason: "drift" }, canonicalText: "was stale" }),
  ];

  const md = exportArchiveManifestMarkdown(notes, "TestDate");
  assert.ok(md.includes("## Long-Superseded Storage"), "Missing superseded section");
  assert.ok(md.includes("was old"), "Missing superseded item");
  assert.ok(md.includes("## Rejected & Swept"), "Missing rejected section");
  assert.ok(md.includes("was bad"), "Missing rejected item");
  assert.ok(md.includes("## Stale / Unconfirmed Timeout"), "Missing stale section");
  assert.ok(md.includes("was stale"), "Missing stale item");
}
