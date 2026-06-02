import type { NoteRecord } from "./types";
/**
 * Pure function to derive the true runtime trust level of a note.
 * Uses extraction raw confidence as the baseline, adjusts up for
 * evidence reinforcement, and heavily penalizes explicitly stalled/contradicted
 * states ("needs_review").
 *
 * Strict Read-Path safe: does not use live Date.now() or execute store I/O.
 */
export declare function calculateCalibratedConfidence(note: NoteRecord): number;
/**
 * Evaluates whether a note warrants render-time active caution.
 * Distinct from 'needs_review' - uncertain simply means the system lacks
 * high deterministic faith in the current output.
 */
export declare function isNoteUncertain(note: NoteRecord, threshold?: number): boolean;
