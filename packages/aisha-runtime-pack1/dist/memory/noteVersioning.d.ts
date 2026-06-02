import { INoteVersioning, ListActiveNotesFilter, ListProvisionalNotesFilter, ListContradictionEvidenceFilter, NoteCandidate, NoteMergeResult, NoteRecord, ProvisionalPromotionResult } from "./types";
import { PersistedReviewSignal } from "./reactiveReconsolidation";
export declare class InMemoryNoteVersioning implements INoteVersioning {
    private readonly notesById;
    private readonly linksById;
    validate(candidate: NoteCandidate): {
        valid: boolean;
        reasons: string[];
    };
    mergeOrSupersede(candidate: NoteCandidate, existing: NoteRecord[], context?: {
        trust: number;
        caution: number;
    }): Promise<NoteMergeResult>;
    persistReviewSignals(signals: PersistedReviewSignal[], subjectScope: {
        subjectKind: NoteRecord["subjectKind"];
        subjectPersonId?: string;
        relationshipContextPersonId?: string;
    }): Promise<NoteRecord[]>;
    private isExpired;
    listActiveNotes(filter?: ListActiveNotesFilter): Promise<NoteRecord[]>;
    listProvisionalNotes(filter?: ListProvisionalNotesFilter): Promise<NoteRecord[]>;
    evaluateProvisionalPromotion(filter?: ListProvisionalNotesFilter): Promise<ProvisionalPromotionResult>;
    listContradictionEvidence(filter?: ListContradictionEvidenceFilter): Promise<NoteRecord[]>;
    operatorReview(noteId: string, decision: "accept" | "reject", operatorId: string): Promise<NoteRecord | null>;
    /**
     * Seeds notes directly into the store for testing purposes.
     * Notes are inserted as-is without validation or merging.
     */
    seedNotes(notes: NoteRecord[]): Promise<void>;
    /**
     * For each given active noteId, returns the canonical text of the note it
     * directly superseded via a 'supersedes' link. Pure read. No store writes.
     * Returns at most one entry per input noteId (the most recently created link).
     */
    listSupersededByIds(noteIds: string[]): Promise<Record<string, string>>;
}
