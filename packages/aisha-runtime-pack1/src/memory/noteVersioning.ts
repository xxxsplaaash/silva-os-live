import {
  INoteVersioning,
  ListActiveNotesFilter,
  ListProvisionalNotesFilter,
  ListContradictionEvidenceFilter,
  NoteCandidate,
  NoteLinkRecord,
  NoteMergeResult,
  NoteRecord,
  ProvisionalPromotionResult,
  AuditEvent,
} from "./types";
import {
  PersistedReviewReason,
  PersistedReviewSignal,
} from "./reactiveReconsolidation";
import {
  makeAuditId,
  buildAcceptanceAuditEntry,
  buildSupersessionAuditEntry,
  type OperatorAuditEntry,
  type OperatorAuditReasonCode,
  type OperatorAuditSignals,
} from "./operatorAuditTrail";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): string {
  return new Date().toISOString();
}

function normalizeValue(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function sameSubject(a: NoteCandidate | NoteRecord, b: NoteRecord): boolean {
  return (
    a.subjectKind === b.subjectKind &&
    (a.subjectSpeakerId ?? "") === (b.subjectSpeakerId ?? "") &&
    (a.subjectPersonId ?? "") === (b.subjectPersonId ?? "") &&
    (a.relationshipContextPersonId ?? "") ===
      (b.relationshipContextPersonId ?? "")
  );
}

function isSameMeaning(candidate: NoteCandidate, note: NoteRecord): boolean {
  const normalizedCandidate = normalizeValue(
    candidate.normalizedValue ?? candidate.canonicalText,
  );
  const normalizedExisting = normalizeValue(
    note.normalizedValue ?? note.canonicalText,
  );

  return (
    candidate.subtype === note.subtype &&
    sameSubject(candidate, note) &&
    normalizedCandidate === normalizedExisting
  );
}

function isSameTrack(candidate: NoteCandidate, note: NoteRecord): boolean {
  return candidate.subtype === note.subtype && sameSubject(candidate, note);
}

/**
 * isContradictory: narrowly scoped — detects oppositional contradictions and slot mutations.
 * "avoids X" contradicts "X" and vice versa.
 * Additionally, if two notes share a prefix slot (separated by a colon, e.g. "key: value"),
 * and their values differ, they represent a mutation of that same semantic slot.
 * Unrelated notes on the same track with no shared slot or explicit avoidance are NOT contradictions.
 */
function isContradictory(candidate: NoteCandidate, note: NoteRecord): boolean {
  if (candidate.subtype !== note.subtype) return false;
  if (!candidate.normalizedValue || !note.normalizedValue) return false;

  const cVal = candidate.normalizedValue;
  const nVal = note.normalizedValue;

  // Explicit avoidance opposition
  if (cVal.startsWith("avoids ") && !nVal.startsWith("avoids ")) {
    return cVal.replace("avoids ", "") === nVal;
  }
  if (!cVal.startsWith("avoids ") && nVal.startsWith("avoids ")) {
    return cVal === nVal.replace("avoids ", "");
  }

  // Single-slot mutation (e.g., "backend language: Python" vs "backend language: Rust")
  const cColonIndex = cVal.indexOf(":");
  const nColonIndex = nVal.indexOf(":");
  if (cColonIndex > 0 && nColonIndex > 0) {
    const cKey = cVal.substring(0, cColonIndex).trim();
    const nKey = nVal.substring(0, nColonIndex).trim();
    if (cKey === nKey && cVal !== nVal) {
      return true;
    }
  }

  return false;
}

function reasonPriority(reason: PersistedReviewReason): number {
  if (reason === "contradiction_sensitive_lower_support") return 2;
  if (reason === "retrieved_weak_stale_note") return 1;
  // soft_signal_increment: lowest priority — count-only, no escalation
  return 0;
}

export class InMemoryNoteVersioning implements INoteVersioning {
  private readonly notesById = new Map<string, NoteRecord>();
  private readonly linksById = new Map<string, NoteLinkRecord>();

  validate(candidate: NoteCandidate): { valid: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!["K_pref", "K_profile"].includes(candidate.subtype)) {
      reasons.push("unsupported_subtype");
    }

    if (!candidate.canonicalText.trim()) {
      reasons.push("empty_canonical_text");
    }

    if (!candidate.sourceEpisodeIds.length) {
      reasons.push("missing_source_episode_ids");
    }

    if (candidate.confidence < 0 || candidate.confidence > 1) {
      reasons.push("confidence_out_of_bounds");
    }

    const valid = reasons.length === 0;
    return { valid, reasons };
  }

  async mergeOrSupersede(
    candidate: NoteCandidate,
    existing: NoteRecord[],
    context?: { trust: number; caution: number },
  ): Promise<NoteMergeResult> {
    const notesWritten: NoteRecord[] = [];
    const linksWritten: NoteLinkRecord[] = [];

    const activeSameTrack = existing.filter(
      (note) => (note.status === "active" || note.status === "provisional") && isSameTrack(candidate, note),
    );

    const supportiveMatch = activeSameTrack.find((note) =>
      isSameMeaning(candidate, note),
    );

    if (supportiveMatch) {
      // Reinforce: bump live confidence but keep extractionConfidenceRaw frozen
      const episodeId = candidate.sourceEpisodeIds[0] ?? "unknown";
      const existingChain = supportiveMatch.provenanceChain ?? [];
      const mergedEpisodeIds = [
        ...new Set([
          ...supportiveMatch.sourceEpisodeIds,
          ...candidate.sourceEpisodeIds,
        ]),
      ];
      const updated: NoteRecord = {
        ...supportiveMatch,
        updatedAt: now(),
        lastConfirmedAt: now(),
        confidence: Math.min(
          1,
          Math.max(supportiveMatch.confidence, candidate.confidence),
        ),
        // extractionConfidenceRaw is intentionally NOT updated on reinforce
        extractionConfidenceRaw: supportiveMatch.extractionConfidenceRaw,
        provenanceChain: [...existingChain.slice(-4), `reinforced_ep_${episodeId}`],
        sourceEpisodeIds: mergedEpisodeIds,
      };

      // ── Trust clearance promotion ──
      // A provisional note may promote to active only when:
      //   (a) corroborated by >1 distinct source episodes, AND
      //   (b) confidence >= 0.65 (aspirations/intentions are capped below this).
      // No contextual-trust shortcut: structural corroboration is required.
      if (updated.status === "provisional") {
        const hasMultiEp = mergedEpisodeIds.length > 1;
        const hasConf = updated.confidence >= 0.65;
        if (hasMultiEp && hasConf) {
          updated.status = "active";
          updated.expiresAt = undefined; // no longer bounded
        }
      }

      this.notesById.set(updated.id, updated);
      notesWritten.push(updated);

      // ── Pack 3.8: Reinforce audit entry ──
      const reinforceSignals: OperatorAuditSignals = {
        trust: context?.trust ?? 0,
        caution: context?.caution ?? 0,
        confidence: candidate.confidence,
        hasContradiction: false,
        contradictionCount: 0,
      };
      const reinforceAuditEntry = buildAcceptanceAuditEntry({
        auditId: makeAuditId(),
        timestamp: updated.updatedAt ?? updated.createdAt,
        noteId: updated.id,
        subtype: updated.subtype,
        canonicalText: updated.canonicalText,
        outcome: "reinforced",
        primaryReason: "reinforced_existing_note",
        allReasons: ["reinforced_existing_note"],
        signals: reinforceSignals,
      });

      return { notesWritten, linksWritten, auditEntries: [reinforceAuditEntry] };
    }

    // ── Contradiction scoping ──
    // Only actual avoidance/negation opposites are contradictions.
    // Same-track notes with unrelated content are NOT contradictions.
    const priorActiveConflicts = activeSameTrack.filter((note) =>
      isContradictory(candidate, note),
    );

    // ── Pack 3.7: Advanced Relationship Acceptance Gating ──
    const trust = context?.trust ?? 0;
    const caution = context?.caution ?? 0;

    const TRUST_ACCEPT_THRESHOLD = 0.8;
    const TRUST_GATE_THRESHOLD = 0;      // trust < 0 triggers soft gate
    const TRUST_REJECT_THRESHOLD = -0.6; // trust <= -0.6 triggers rejection
    const CAUTION_GATE_THRESHOLD = 0.7;  // caution > 0.7 triggers soft gate

    const isTrustRejected = trust <= TRUST_REJECT_THRESHOLD;
    const isTrustGated = trust < TRUST_GATE_THRESHOLD && !isTrustRejected;
    const isCautionGated = caution > CAUTION_GATE_THRESHOLD;
    const isTrustAccepted = trust >= TRUST_ACCEPT_THRESHOLD;
    const isWeak = candidate.confidence < 0.65;
    const hasContradiction = priorActiveConflicts.length > 0;

    let initialReviewState: "pending" | "accepted" | "rejected" = "pending";
    let reinferenceMode: "allow" | "block_auto_reinfer" | "needs_review" = "allow";
    let gatingReasonString: string | undefined;

    if (isTrustRejected || isWeak) {
      initialReviewState = "rejected";
      reinferenceMode = "block_auto_reinfer";
      gatingReasonString = isTrustRejected ? "relationship_trust_rejected" : "weakly_grounded_rejected";
    } else if (hasContradiction || isTrustGated || isCautionGated) {
      initialReviewState = "pending";
      reinferenceMode = "needs_review";
      gatingReasonString = hasContradiction 
        ? "contradiction_needs_review" 
        : (isTrustGated ? "relationship_trust_gated" : "relationship_caution_gated");
    } else if (isTrustAccepted) {
      initialReviewState = "accepted";
      reinferenceMode = "allow";
      // We don't set gatingReasonString for reinferencePolicy because mode is "allow",
      // but we will use this info for the audit trail.
    } else {
      initialReviewState = "pending";
      reinferenceMode = "allow";
    }

    const auditTrail: AuditEvent[] = [
      {
        timestamp: now(),
        action: "created",
        reason: "Memory extraction process",
      },
    ];

    if (initialReviewState === "rejected" || reinferenceMode === "needs_review") {
      auditTrail.push({
        timestamp: now(),
        action: "relationship_gated",
        reason: gatingReasonString ?? "Gated",
        newState: reinferenceMode === "needs_review" ? "needs_review" : initialReviewState,
      });
    } else if (initialReviewState === "accepted") {
      auditTrail.push({
        timestamp: now(),
        action: "relationship_gated",
        reason: "relationship_trust_accepted",
        newState: "accepted",
      });
    }

    // ── Provisional tier assignment ──
    // K_boundary candidates are always immediately active (safety/override signals).
    // Candidates that explicitly carry status="provisional" (set by the updated sandbox)
    // enter the provisional tier. Callers WITHOUT a status field (old API, test fixtures,
    // direct mergeOrSupersede calls) default to "active" — full backward compatibility.
    const candidateStatus = candidate.subtype === "K_boundary"
      ? "active"
      : (candidate.status === "provisional" ? "provisional" : "active");

    const newNote: NoteRecord = {
      id: makeId("note"),
      kind: "note",
      createdAt: now(),
      updatedAt: now(),
      sourceModality: "text",
      status: candidateStatus,
      subtype: candidate.subtype,
      canonicalText: candidate.canonicalText,
      normalizedValue: candidate.normalizedValue,
      confidence: candidate.confidence,
      extractionConfidenceRaw: candidate.extractionConfidenceRaw,
      provenanceChain: [candidate.provenanceReason, ...(candidate.provenanceChain ?? [])].slice(0, 5),
      subjectKind: candidate.subjectKind,
      subjectSpeakerId: candidate.subjectSpeakerId,
      subjectPersonId: candidate.subjectPersonId,
      relationshipContextPersonId: candidate.relationshipContextPersonId,
      sourceEpisodeIds: candidate.sourceEpisodeIds,
      lastConfirmedAt: now(),
      reviewState: initialReviewState,
      reinferencePolicy: {
        mode: reinferenceMode,
        reason: reinferenceMode === "needs_review" || reinferenceMode === "block_auto_reinfer"
          ? gatingReasonString
          : undefined,
      },
      auditTrail,
      // Provisional notes are bounded: they expire after 7 days if not promoted.
      expiresAt: candidateStatus === "provisional"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    };

    this.notesById.set(newNote.id, newNote);
    notesWritten.push(newNote);

    // ── Pack 3.8: New-note audit entry ──
    const signals: OperatorAuditSignals = {
      trust,
      caution,
      confidence: candidate.confidence,
      hasContradiction,
      contradictionCount: priorActiveConflicts.length,
    };

    // Build the ordered list of all reason codes that applied
    const allReasons: OperatorAuditReasonCode[] = [];
    if (isTrustRejected) allReasons.push("relationship_trust_rejected");
    if (isWeak) allReasons.push("weakly_grounded_rejected");
    if (hasContradiction) allReasons.push("contradiction_needs_review");
    if (isTrustGated) allReasons.push("relationship_trust_gated");
    if (isCautionGated) allReasons.push("relationship_caution_gated");
    if (isTrustAccepted) allReasons.push("relationship_trust_accepted");
    if (allReasons.length === 0) allReasons.push("default_pending");

    const primaryReason = allReasons[0];
    const newNoteOutcome = initialReviewState === "accepted"
      ? "accepted"
      : initialReviewState === "rejected"
        ? "rejected"
        : "needs_review";

    const auditEntries: OperatorAuditEntry[] = [];
    auditEntries.push(buildAcceptanceAuditEntry({
      auditId: makeAuditId(),
      timestamp: newNote.createdAt,
      noteId: newNote.id,
      subtype: newNote.subtype,
      canonicalText: newNote.canonicalText,
      outcome: newNoteOutcome,
      primaryReason,
      allReasons,
      signals,
    }));

    for (const prior of priorActiveConflicts) {
      // Provisional conflicts are quietly superseded (no dispute prestige).
      // Active conflicts are disputed — preserving the audit trail.
      const priorNewStatus = prior.status === "provisional" ? "superseded" : "disputed";
      const supersededPrior: NoteRecord = {
        ...prior,
        updatedAt: now(),
        status: priorNewStatus,
      };

      this.notesById.set(supersededPrior.id, supersededPrior);
      notesWritten.push(supersededPrior);

      const supersedesLink: NoteLinkRecord = {
        id: makeId("note_link"),
        kind: "note_link",
        createdAt: now(),
        sourceModality: "text",
        fromNoteId: newNote.id,
        toNoteId: supersededPrior.id,
        relation: "supersedes",
        strength: 1,
      };

      this.linksById.set(supersedesLink.id, supersedesLink);
      linksWritten.push(supersedesLink);

      // ── Pack 3.8: Supersession audit entry ──
      auditEntries.push(buildSupersessionAuditEntry({
        auditId: makeAuditId(),
        timestamp: supersededPrior.updatedAt ?? supersededPrior.createdAt,
        priorNoteId: supersededPrior.id,
        priorCanonicalText: supersededPrior.canonicalText,
        priorNewStatus,
        causedByNoteId: newNote.id,
        signals,
      }));
    }

    return { notesWritten, linksWritten, auditEntries };
  }


  async persistReviewSignals(
    signals: PersistedReviewSignal[],
    subjectScope: {
      subjectKind: NoteRecord["subjectKind"];
      subjectPersonId?: string;
      relationshipContextPersonId?: string;
    },
  ): Promise<NoteRecord[]> {
    const MAX_PENDING_REVIEW_NOTES = 10;

    // Count pending-review notes scoped to the same subject universe as the signals.
    // A budget hit for one subject scope does not affect other scopes.
    const scopedPendingCount = [...this.notesById.values()].filter(
      (n) =>
        n.status === "active" &&
        n.reviewState === "pending" &&
        n.reinferencePolicy.mode === "needs_review" &&
        n.subjectKind === subjectScope.subjectKind &&
        (n.subjectPersonId ?? "") === (subjectScope.subjectPersonId ?? "") &&
        (n.relationshipContextPersonId ?? "") === (subjectScope.relationshipContextPersonId ?? ""),
    ).length;

    if (scopedPendingCount >= MAX_PENDING_REVIEW_NOTES) {
      console.warn(
        "[MEMORY] scoped review budget ceiling hit; signals dropped",
        { subjectScope, droppedCount: signals.length },
      );
      return [];
    }

    const reduced = new Map<string, PersistedReviewSignal>();

    for (const signal of signals) {
      const existing = reduced.get(signal.noteId);

      if (!existing || reasonPriority(signal.reason) > reasonPriority(existing.reason)) {
        reduced.set(signal.noteId, signal);
      }
    }

    const updated: NoteRecord[] = [];

    for (const signal of reduced.values()) {
      const note = this.notesById.get(signal.noteId);
      if (!note) continue;
      if (note.status !== "active") continue;
      if (note.reviewState === "rejected") continue;

      // Pack 4.2: soft_signal_increment — increment count only, do NOT escalate reinferencePolicy.
      if (signal.reason === "soft_signal_increment") {
        const next: NoteRecord = {
          ...note,
          updatedAt: now(),
          reconsolidationSignalCount: (note.reconsolidationSignalCount ?? 0) + 1,
        };
        this.notesById.set(next.id, next);
        updated.push(next);
        continue;
      }

      const existingReason =
        note.reinferencePolicy.mode === "needs_review"
          ? (note.reinferencePolicy.reason as PersistedReviewReason | undefined)
          : undefined;

      const nextReason =
        existingReason && reasonPriority(existingReason) > reasonPriority(signal.reason)
          ? existingReason
          : signal.reason;

      const alreadySame =
        note.reviewState === "pending" &&
        note.reinferencePolicy.mode === "needs_review" &&
        note.reinferencePolicy.reason === nextReason;

      if (alreadySame) {
        updated.push(note);
        continue;
      }

      const next: NoteRecord = {
        ...note,
        updatedAt: now(),
        lastReviewedAt: now(),
        reviewState: "pending",
        reinferencePolicy: {
          mode: "needs_review",
          reason: nextReason,
        },
      };

      this.notesById.set(next.id, next);
      updated.push(next);
    }

    return updated;
  }

  private isExpired(note: NoteRecord): boolean {
    if (note.status === "provisional" && note.expiresAt) {
      return Date.parse(note.expiresAt) < Date.now();
    }
    return false;
  }

  async listActiveNotes(filter?: ListActiveNotesFilter): Promise<NoteRecord[]> {
    // Joint gate: a note passes if it has adequate confidence OR enough corroborating episodes.
    // JOINT_GATE_CONFIDENCE = 0.65 (base threshold)
    // JOINT_GATE_EPISODE_OVERRIDE = 3 (corroborating episodes override weak confidence)
    const JOINT_GATE_CONFIDENCE = 0.65;
    const JOINT_GATE_EPISODE_OVERRIDE = 3;

    const notes = [...this.notesById.values()].filter((note) => {
      // Expired provisional notes are silently excluded — no deletion, just invisible.
      if (this.isExpired(note)) return false;

      if (filter?.includeProvisional) {
        // includeProvisional is used by async followup for trust-clearance accumulation.
        // It must NEVER be used on the hot generation path.
        if (note.status !== "active" && note.status !== "provisional") return false;
      } else {
        if (note.status !== "active") return false;
      }

      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (filter?.allowedConsentStatuses?.length) {
        if (!note.consentStatus || !filter.allowedConsentStatuses.includes(note.consentStatus)) {
          return false;
        }
      } else if (note.consentStatus === "deny") {
        return false;
      }
      const passesGate =
        note.confidence >= JOINT_GATE_CONFIDENCE ||
        note.sourceEpisodeIds.length >= JOINT_GATE_EPISODE_OVERRIDE;
      if (!passesGate) return false;
      return true;
    });

    const filtered = notes.filter((note) => {
      if (!filter) return true;

      if (filter.relationshipContextPersonId) {
        const matchesRelationship =
          note.relationshipContextPersonId === filter.relationshipContextPersonId;
        const allowGlobal =
          filter.includeGlobal === true && !note.relationshipContextPersonId;
        if (!matchesRelationship && !allowGlobal) return false;
      }

      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }

      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectSpeakerId;
        if (!matchesSpeaker && !allowGlobal) return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aTime = Date.parse(a.updatedAt ?? a.createdAt);
      const bTime = Date.parse(b.updatedAt ?? b.createdAt);
      return bTime - aTime;
    });

    return sorted.slice(0, filter?.maxResults ?? sorted.length);
  }

  async listProvisionalNotes(filter?: ListProvisionalNotesFilter): Promise<NoteRecord[]> {
    const notes = [...this.notesById.values()].filter((note) => {
      if (note.status !== "provisional") return false;
      // Expired provisional notes are invisible here too — expiry is authoritative
      if (this.isExpired(note)) return false;
      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (note.consentStatus === "deny") return false;

      if (!filter) return true;

      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }

      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectSpeakerId;
        if (!matchesSpeaker && !allowGlobal) return false;
      }

      return true;
    });

    const sorted = notes.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const aTime = Date.parse(a.updatedAt ?? a.createdAt);
      const bTime = Date.parse(b.updatedAt ?? b.createdAt);
      return bTime - aTime;
    });

    return sorted.slice(0, filter?.maxResults ?? sorted.length);
  }

  async evaluateProvisionalPromotion(
    filter?: ListProvisionalNotesFilter,
  ): Promise<ProvisionalPromotionResult> {
    // ASYNC FOLLOWUP LANE ONLY. Never call on hot path.
    const PROMOTION_CONFIDENCE_THRESHOLD = 0.65;
    const PROMOTION_MIN_EPISODES = 2; // >1 distinct source episodes required

    // Scan store directly to include notes that may be past expiresAt —
    // listProvisionalNotes() already filters those out so expiry would never fire.
    const allProvisional = [...this.notesById.values()].filter((note) => {
      if (note.status !== "provisional") return false;
      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (note.consentStatus === "deny") return false;

      if (!filter) return true;

      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }

      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal =
          filter.includeGlobal === true &&
          note.subjectKind === "user" &&
          !note.subjectSpeakerId;
        if (!matchesSpeaker && !allowGlobal) return false;
      }

      return true;
    });

    const promoted: NoteRecord[] = [];
    const expired: NoteRecord[] = [];
    const unchanged: NoteRecord[] = [];

    const nowMs = Date.now();

    for (const note of allProvisional) {
      // ── Expiry check first (expiresAt is authoritative) ──────────────────
      if (note.expiresAt && Date.parse(note.expiresAt) < nowMs) {
        const stale: NoteRecord = {
          ...note,
          updatedAt: new Date(nowMs).toISOString(),
          status: "stale",
          expiresAt: undefined,
          auditTrail: [
            ...(note.auditTrail ?? []),
            {
              timestamp: new Date(nowMs).toISOString(),
              action: "created",
              reason: "provisional_expired: expiresAt exceeded without promotion",
              previousState: "provisional",
              newState: "stale",
            },
          ],
        };
        this.notesById.set(stale.id, stale);
        expired.push(stale);
        continue;
      }

      // ── Promotion check (multi-episode corroboration + confidence) ────────
      const hasMultiEp = note.sourceEpisodeIds.length >= PROMOTION_MIN_EPISODES;
      const hasConf = note.confidence >= PROMOTION_CONFIDENCE_THRESHOLD;

      if (hasMultiEp && hasConf) {
        const promotedNote: NoteRecord = {
          ...note,
          updatedAt: new Date(nowMs).toISOString(),
          status: "active",
          expiresAt: undefined, // no longer bounded
          lastConfirmedAt: new Date(nowMs).toISOString(),
          auditTrail: [
            ...(note.auditTrail ?? []),
            {
              timestamp: new Date(nowMs).toISOString(),
              action: "operator_approved",
              reason: `provisional_promoted: ${note.sourceEpisodeIds.length} source episodes, confidence=${note.confidence}`,
              previousState: "provisional",
              newState: "active",
            },
          ],
        };
        this.notesById.set(promotedNote.id, promotedNote);
        promoted.push(promotedNote);
        continue;
      }

      unchanged.push(note);
    }

    if (promoted.length > 0 || expired.length > 0) {
      console.log(
        `[MEMORY][PROVISIONAL] evaluated ${allProvisional.length} provisional note(s): ` +
        `promoted=${promoted.length}, expired=${expired.length}, unchanged=${unchanged.length}`,
      );
    }

    return { promoted, expired, unchanged };
  }

  async listContradictionEvidence(
    filter?: ListContradictionEvidenceFilter,
  ): Promise<NoteRecord[]> {
    const notes = [...this.notesById.values()].filter((note) => {
      if (!(note.status === "superseded" || note.status === "disputed")) {
        return false;
      }
      if (filter?.allowedConsentStatuses?.length) {
        return Boolean(note.consentStatus && filter.allowedConsentStatuses.includes(note.consentStatus));
      }
      return note.consentStatus !== "deny";
    });

    const filtered = notes.filter((note) => {
      if (!filter) return true;

      if (filter.subjectPersonId && note.subjectPersonId !== filter.subjectPersonId) {
        return false;
      }

      if (filter.subjectSpeakerId && note.subjectSpeakerId !== filter.subjectSpeakerId) {
        return false;
      }

      if (
        filter.relationshipContextPersonId &&
        note.relationshipContextPersonId !== filter.relationshipContextPersonId
      ) {
        return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt ?? a.createdAt);
      const bTime = Date.parse(b.updatedAt ?? b.createdAt);
      return bTime - aTime;
    });

    return sorted.slice(0, filter?.maxResults ?? 2);
  }

  async operatorReview(
    noteId: string,
    decision: "accept" | "reject",
    operatorId: string,
  ): Promise<NoteRecord | null> {
    const note = this.notesById.get(noteId);
    if (!note) return null;

    const action = decision === "accept" ? "operator_approved" : "operator_rejected";
    const newState = decision === "accept" ? "accepted" : "rejected";
    const reinferenceMode = decision === "accept" ? "allow" : "block_auto_reinfer";

    const updated: NoteRecord = {
      ...note,
      updatedAt: now(),
      reviewState: newState,
      reinferencePolicy: {
        mode: reinferenceMode,
        reason: decision === "accept" ? undefined : "operator_rejected",
      },
      auditTrail: [
        ...(note.auditTrail ?? []),
        {
          timestamp: now(),
          action,
          reason: `Operator decision: ${decision}`,
          operatorId,
          previousState: note.reviewState,
          newState,
        },
      ],
    };

    this.notesById.set(updated.id, updated);
    return updated;
  }

  /**
   * Seeds notes directly into the store for testing purposes.
   * Notes are inserted as-is without validation or merging.
   */
  async seedNotes(notes: NoteRecord[]): Promise<void> {
    for (const note of notes) {
      this.notesById.set(note.id, note);
    }
  }

  /**
   * For each given active noteId, returns the canonical text of the note it
   * directly superseded via a 'supersedes' link. Pure read. No store writes.
   * Returns at most one entry per input noteId (the most recently created link).
   */
  async listSupersededByIds(noteIds: string[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const idSet = new Set(noteIds);

    // Group supersedes links by fromNoteId (the active note that superseded something)
    const linksByFrom = new Map<string, NoteLinkRecord[]>();
    for (const link of this.linksById.values()) {
      if (link.relation !== "supersedes") continue;
      if (!idSet.has(link.fromNoteId)) continue;
      const existing = linksByFrom.get(link.fromNoteId) ?? [];
      existing.push(link);
      linksByFrom.set(link.fromNoteId, existing);
    }

    for (const [fromNoteId, links] of linksByFrom.entries()) {
      // Take the most recently created link (sort by createdAt desc)
      const sorted = links.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      );
      const best = sorted[0];
      if (!best) continue;

      const supersededNote = this.notesById.get(best.toNoteId);
      if (!supersededNote) continue;

      result[fromNoteId] = supersededNote.canonicalText;
    }

    return result;
  }
}
