import {
  EpisodeRecord,
  IEpisodeStore,
  INoteVersioning,
  IRetrievalPlanner,
  IThreadStore,
  ITurnStore,
  NoteRecord,
  RetrievalBundle,
  TurnRecord,
} from "./types";
import {
  reviewRetrievedActiveNotes,
  tightenContradictionEvidenceLinkage,
} from "./reactiveReconsolidation";

const MAX_RECENT_TURNS = 6;
const MAX_THREAD_EPISODES = 3;
const MAX_SUPPORTING_EPISODES = 2;
const MAX_ACTIVE_NOTES = 8;
const MAX_CONTRADICTION_EVIDENCE = 1;
const MIN_ACTIVE_NOTE_CONFIDENCE = 0.65; // aligned with joint gate threshold
const STALE_RANKING_PENALTY = 0.06;      // ephemeral, applied during ranking only; never persisted

function currentTurnSuggestsContradiction(turn: TurnRecord): boolean {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    turn.rawText,
  );
}

function noteIsPersistedStale(note: NoteRecord): boolean {
  return (
    note.reinferencePolicy.mode === "needs_review" &&
    note.reinferencePolicy.reason === "retrieved_weak_stale_note"
  );
}

/**
 * Applies an ephemeral ranking penalty to notes the async path has already
 * declared stale. The returned objects are clones used only for ranking;
 * they are never written back to the store.
 * Corroborated notes (>= 3 source episodes) are exempt.
 */
function applyStaleRankingPenalty(notes: NoteRecord[]): NoteRecord[] {
  let penalizedCount = 0;
  const result = notes.map((note) => {
    if (!noteIsPersistedStale(note)) return note;
    if (note.sourceEpisodeIds.length >= 3) return note;
    penalizedCount++;
    return {
      ...note,
      confidence: Math.round(Math.max(0.55, note.confidence - STALE_RANKING_PENALTY) * 100) / 100,
    };
  });
  if (penalizedCount > 0) {
    console.log(`[MEMORY][RETRIEVAL] stale ranking penalty applied to ${penalizedCount} note(s)`);
  }
  return result;
}

function noteIsGlobalUserNote(
  note: Pick<
    NoteRecord,
    "subjectKind" | "subjectPersonId" | "relationshipContextPersonId" | "subjectSpeakerId"
  >,
): boolean {
  return (
    note.subjectKind === "user" &&
    !note.subjectPersonId &&
    !note.relationshipContextPersonId &&
    !note.subjectSpeakerId
  );
}

function detectSubtypeIntent(turn: TurnRecord): {
  pref: number;
  profile: number;
} {
  const text = turn.rawText.toLowerCase();

  let pref = 0;
  let profile = 0;

  if (
    /\b(remember|remind me|what do you remember|what do you know about me|what should you remember)\b/.test(
      text,
    )
  ) {
    pref += 1;
    profile += 1;
  }

  if (
    /\b(drink|coffee|latte|tea|food|eat|meal|music|movie|movies|order|favorite|prefer|preference|like|love|hate)\b/.test(
      text,
    )
  ) {
    pref += 3;
  }

  if (
    /\b(about me|how i work|work style|style|usually|tend to|always|never|profile)\b/.test(
      text,
    )
  ) {
    profile += 3;
  }

  return { pref, profile };
}

function subjectMatchStrength(turn: TurnRecord, note: NoteRecord): number {
  const target = turn.relationshipTargetPersonId;

  if (
    target &&
    (note.subjectPersonId === target ||
      note.relationshipContextPersonId === target)
  ) {
    return 3;
  }

  if (
    turn.speakerId &&
    note.subjectSpeakerId &&
    note.subjectSpeakerId === turn.speakerId
  ) {
    return 2;
  }

  if (turn.speaker === "user" && noteIsGlobalUserNote(note)) {
    return 1;
  }

  return 0;
}

function subtypeRelevanceScore(turn: TurnRecord, note: NoteRecord): number {
  const intent = detectSubtypeIntent(turn);

  if (note.subtype === "K_pref") return intent.pref;
  if (note.subtype === "K_profile") return intent.profile;
  return 0;
}

function noteRecency(note: NoteRecord): number {
  const candidate =
    note.lastConfirmedAt ??
    note.updatedAt ??
    note.createdAt ??
    "1970-01-01T00:00:00.000Z";
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function evidenceCount(note: NoteRecord): number {
  return note.sourceEpisodeIds.length;
}

type RankedNote = {
  note: NoteRecord;
  subjectMatch: number;
  subtypeRelevance: number;
  confidence: number;
  recency: number;
  evidence: number;
};

function compareRankedNotes(a: RankedNote, b: RankedNote): number {
  if (b.subjectMatch !== a.subjectMatch) {
    return b.subjectMatch - a.subjectMatch;
  }

  if (b.subtypeRelevance !== a.subtypeRelevance) {
    return b.subtypeRelevance - a.subtypeRelevance;
  }

  if (b.evidence !== a.evidence) {
    return b.evidence - a.evidence;
  }

  if (b.recency !== a.recency) {
    return b.recency - a.recency;
  }

  if (b.confidence !== a.confidence) {
    return b.confidence - a.confidence;
  }

  return a.note.id.localeCompare(b.note.id);
}

function rankNotes(turn: TurnRecord, notes: NoteRecord[]): RankedNote[] {
  return notes
    .map((note) => ({
      note,
      subjectMatch: subjectMatchStrength(turn, note),
      subtypeRelevance: subtypeRelevanceScore(turn, note),
      confidence: note.confidence,
      recency: noteRecency(note),
      evidence: evidenceCount(note),
    }))
    .sort(compareRankedNotes);
}

function applySubtypeDiversity(
  turn: TurnRecord,
  ranked: RankedNote[],
): NoteRecord[] {
  const intent = detectSubtypeIntent(turn);
  const selected: RankedNote[] = [];

  const shouldSeedDiversity = intent.pref > 0 && intent.profile > 0;

  if (shouldSeedDiversity) {
    const topPref = ranked.find(
      (entry) => entry.note.subtype === "K_pref" && entry.subtypeRelevance > 0,
    );
    const topProfile = ranked.find(
      (entry) =>
        entry.note.subtype === "K_profile" && entry.subtypeRelevance > 0,
    );

    if (topPref) selected.push(topPref);
    if (
      topProfile &&
      !selected.some((entry) => entry.note.id === topProfile.note.id)
    ) {
      selected.push(topProfile);
    }

    selected.sort(compareRankedNotes);
  }

  for (const entry of ranked) {
    if (selected.some((existing) => existing.note.id === entry.note.id)) {
      continue;
    }

    selected.push(entry);

    if (selected.length >= MAX_ACTIVE_NOTES) {
      break;
    }
  }

  if (ranked.length > MAX_ACTIVE_NOTES) {
    console.warn(
      `[RETRIEVAL] active note cap hit: ${ranked.length} candidates → ${MAX_ACTIVE_NOTES} selected. Prompt token budget protected.`,
    );
  }

  return selected.slice(0, MAX_ACTIVE_NOTES).map((entry) => entry.note);
}

/**
 * Deterministic Pack 1 retrieval planner:
 * - recent turns
 * - compact active thread slice
 * - ranked active notes
 * - contradiction evidence isolated in a separate lane
 * - narrow reactive reconsolidation applied only at retrieval time
 * - no embeddings, vectors, or LLM ranking
 */
export class SimpleRetrievalPlanner implements IRetrievalPlanner {
  constructor(
    private readonly deps: {
      turnStore: ITurnStore;
      threadStore: IThreadStore;
      episodeStore: IEpisodeStore;
      noteVersioning: INoteVersioning;
    },
  ) {}

  async build(sessionId: string, currentTurn: TurnRecord): Promise<RetrievalBundle> {
    const recentTurns = await this.deps.turnStore.getRecent(
      sessionId,
      MAX_RECENT_TURNS,
    );

    const activeThreadRecord = await this.deps.threadStore.getActive(sessionId);
    const threadEpisodeIds =
      activeThreadRecord?.episodeIds.slice(-MAX_THREAD_EPISODES) ?? [];
    const activeThread = await this.deps.episodeStore.getByIds(threadEpisodeIds);

    const activeNotes = await this.buildActiveNotesLane(sessionId, currentTurn);
    const supportingEpisodes = this.selectSupportingEpisodes(
      activeThread,
      currentTurn,
    );

    const contradictionEvidence = currentTurnSuggestsContradiction(currentTurn)
      ? await this.buildContradictionLane(currentTurn, activeNotes)
      : [];

    const supersessionContext = await this.deps.noteVersioning.listSupersededByIds(
      activeNotes.map((n) => n.id),
    );

    return {
      recentTurns,
      activeThread,
      activeNotes,
      supportingEpisodes,
      contradictionEvidence,
      supersessionContext,
    };
  }

  private async buildActiveNotesLane(
    sessionId: string,
    currentTurn: TurnRecord,
  ): Promise<NoteRecord[]> {
    const rawCandidates = await this.deps.noteVersioning.listActiveNotes({
      sessionId,
      subjectPersonId: currentTurn.relationshipTargetPersonId,
      relationshipContextPersonId: currentTurn.relationshipTargetPersonId,
      includeGlobal: true,
      maxResults: MAX_ACTIVE_NOTES,
    });

    const eligible = rawCandidates.filter((note) => {
      if (note.status !== "active") return false;
      if (note.reviewState === "rejected") return false;
      if (note.consentStatus === "deny") return false;
      if (note.confidence < MIN_ACTIVE_NOTE_CONFIDENCE) return false;
      return true;
    });

    // Apply ephemeral stale ranking penalty before reconsolidation review.
    // Reads persisted reinferencePolicy only — no Date.now(), no store writes.
    const penalized = applyStaleRankingPenalty(eligible);
    const reviewed = reviewRetrievedActiveNotes({
      currentTurn,
      activeNotes: penalized,
    });

    const ranked = rankNotes(currentTurn, reviewed);
    return applySubtypeDiversity(currentTurn, ranked);
  }

  private selectSupportingEpisodes(
    activeThread: EpisodeRecord[],
    currentTurn: TurnRecord,
  ): EpisodeRecord[] {
    const targetPersonId = currentTurn.relationshipTargetPersonId;

    const filtered = activeThread.filter((episode) => {
      if (!targetPersonId) return true;

      return (
        episode.focalRelationshipPersonId === targetPersonId ||
        episode.participantPersonIds.includes(targetPersonId)
      );
    });

    return filtered.slice(-MAX_SUPPORTING_EPISODES);
  }

  private async buildContradictionLane(
    currentTurn: TurnRecord,
    activeNotes: NoteRecord[],
  ): Promise<NoteRecord[]> {
    const targetPersonId = currentTurn.relationshipTargetPersonId;

    const rawContradictions =
      await this.deps.noteVersioning.listContradictionEvidence({
        subjectPersonId: targetPersonId,
        relationshipContextPersonId: targetPersonId,
        maxResults: MAX_CONTRADICTION_EVIDENCE,
      });

    const filtered = rawContradictions.filter((note) => {
      if (note.consentStatus === "deny") return false;

      if (targetPersonId) {
        return (
          note.subjectPersonId === targetPersonId ||
          note.relationshipContextPersonId === targetPersonId
        );
      }

      return note.subjectKind === "user" && !note.subjectPersonId;
    });

    const tightened = tightenContradictionEvidenceLinkage({
      activeNotes,
      contradictionEvidence: filtered,
    });

    return tightened
      .sort((a, b) => {
        const aTime = noteRecency(a);
        const bTime = noteRecency(b);
        if (bTime !== aTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
      })
      .slice(0, MAX_CONTRADICTION_EVIDENCE);
  }

  async buildTargeted(input: {
    sessionId: string;
    currentTurn: TurnRecord;
    baseBundle: RetrievalBundle;
    targetNoteIds: string[];
  }): Promise<RetrievalBundle> {
    // Fetch all notes in the target set explicitly.
    const allActiveNotes = await this.deps.noteVersioning.listActiveNotes({
      includeGlobal: true,
      subjectPersonId: input.currentTurn.relationshipTargetPersonId,
      relationshipContextPersonId: input.currentTurn.relationshipTargetPersonId,
      maxResults: MAX_ACTIVE_NOTES,
    });

    const targetSet = new Set(input.targetNoteIds);
    const eligible = allActiveNotes.filter((note) => {
      if (note.status !== "active") return false;
      if (note.reviewState === "rejected") return false;
      if (note.consentStatus === "deny") return false;
      if (note.confidence < MIN_ACTIVE_NOTE_CONFIDENCE) return false;
      return targetSet.has(note.id);
    });

    // Apply the same stale ranking penalty as the primary lane.
    // Reads persisted reinferencePolicy only — no Date.now(), no store writes.
    const penalized = applyStaleRankingPenalty(eligible);
    const reviewed = reviewRetrievedActiveNotes({
      currentTurn: input.currentTurn,
      activeNotes: penalized,
    });
    const ranked = rankNotes(input.currentTurn, reviewed);
    const finalNotes = applySubtypeDiversity(input.currentTurn, ranked);

    // If the targeted result is identical to the base bundle's activeNotes,
    // return the base bundle unchanged so the caller can detect no-progress.
    const baseSorted = [...input.baseBundle.activeNotes].map((n) => n.id).sort().join(",");
    const targetedSorted = finalNotes.map((n) => n.id).sort().join(",");
    if (baseSorted === targetedSorted) {
      console.log("[MEMORY][CRITIC] buildTargeted: targeted set identical to base bundle; skipping");
      return input.baseBundle;
    }

    return {
      ...input.baseBundle,
      activeNotes: finalNotes,
    };
  }
}
