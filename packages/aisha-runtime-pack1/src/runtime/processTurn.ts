import {
  BuildTurnArtifactsResult,
  CommittedMemorySlice,
  ParsedOutput,
  ProcessTurnDeps,
  ProcessTurnResult,
  StagedMemorySlice,
  TurnInput,
} from "./runtime_types";
import {
  EpisodeRecord,
  RetrievalBundle,
  StateSnapshotRecord,
  ThreadRecord,
  TurnRecord,
} from "../memory/types";
import { PostureRouter } from "./postureRouter";
import {
  readShadowFlags,
  isShadowAutoDisabled,
  runAssociativeShadow,
  runTraceShadow,
  shadowAuditToOperatorEntry,
} from "./shadowRetrievalOrchestrator";
import { NoOpShadowEvidenceCollector } from "../research/shadowEvidenceCollector";

function compactErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "unknown_runtime_error";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function defaultThreadId(sessionId: string): string {
  return `thread_${sessionId}`;
}

function derivePrimaryModality(
  modalities: Array<"text" | "voice" | "image" | "video">,
): "text" | "voice" | "image" | "video" | "mixed" {
  const uniq = unique(modalities);
  return uniq.length === 1 ? uniq[0] : "mixed";
}

function buildTurnArtifacts(input: {
  turnInput: TurnInput;
  stateResult: {
    compounds: Record<string, number>;
    relationshipVectors: Record<string, number>;
    practicalActionBias: Record<string, number>;
    expressiveEnvelope: {
      certainty: number;
      load: number;
      tension: number;
      valence: number;
      desire: number;
      trust: number;
    };
    activeRelationshipPersonId?: string;
    activeSpeakerId?: string;
  };
  turnId: string;
  snapshotId: string;
  turnIndex: number;
  nowIso: string;
}): BuildTurnArtifactsResult {
  const {
    turnInput,
    stateResult,
    turnId,
    snapshotId,
    turnIndex,
    nowIso,
  } = input;

  const turn: TurnRecord = {
    id: turnId,
    kind: "turn",
    createdAt: nowIso,
    sourceModality: turnInput.sourceModality,
    speakerId: turnInput.speakerId,
    recognizedPersonId: turnInput.recognizedPersonId,
    speakerConfidence: turnInput.speakerConfidence,
    relationshipScope: turnInput.relationshipScope,
    coPresentEntities: [...(turnInput.coPresentEntities ?? [])],
    consentStatus: turnInput.consentStatus,

    sessionId: turnInput.sessionId,
    turnIndex,
    speaker: turnInput.speaker,
    rawText: turnInput.rawText,
    normalizedText: turnInput.normalizedText,
    stateSnapshotId: snapshotId,
    relationshipTargetPersonId: turnInput.relationshipTargetPersonId,
    entityMentions: [...(turnInput.entityMentions ?? [])],
    immutable: true,
  };

  const snapshot: StateSnapshotRecord = {
    id: snapshotId,
    kind: "state_snapshot",
    createdAt: nowIso,
    sourceModality: turnInput.sourceModality,
    consentStatus: turnInput.consentStatus,

    sessionId: turnInput.sessionId,
    turnId,
    compounds: { ...stateResult.compounds },
    relationshipVectors: { ...stateResult.relationshipVectors },
    practicalActionBias: { ...stateResult.practicalActionBias },
    expressiveEnvelope: { ...stateResult.expressiveEnvelope },
    activeRelationshipPersonId: stateResult.activeRelationshipPersonId,
    activeSpeakerId: stateResult.activeSpeakerId,
    schemaVersion: "pack1-v1",
  };

  return { turn, snapshot };
}

function deriveEpisodeCandidate(input: {
  activeEpisode: EpisodeRecord | null;
  turn: TurnRecord;
  boundary: {
    split: boolean;
    topicShift: boolean;
    surpriseDiscontinuity: boolean;
    score: number;
  };
  nowIso: string;
  stagedEpisodeId: string;
}): EpisodeRecord {
  const { activeEpisode, turn, boundary, nowIso, stagedEpisodeId } = input;

  if (!activeEpisode || boundary.split) {
    return {
      id: stagedEpisodeId,
      kind: "episode",
      createdAt: nowIso,
      updatedAt: nowIso,
      sourceModality: turn.sourceModality,
      speakerId: turn.speakerId,
      recognizedPersonId: turn.recognizedPersonId,
      speakerConfidence: turn.speakerConfidence,
      relationshipScope: turn.relationshipScope,
      coPresentEntities: turn.coPresentEntities ?? [],
      consentStatus: turn.consentStatus,

      sessionId: turn.sessionId,
      threadId: defaultThreadId(turn.sessionId),
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      summary: undefined,
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId
        ? [turn.recognizedPersonId]
        : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: boundary.topicShift,
        surpriseDiscontinuity: boundary.surpriseDiscontinuity,
        score: boundary.score,
      },
    };
  }

  const modalityMix = unique([...activeEpisode.modalityMix, turn.sourceModality]);
  const participantSpeakerIds = unique([
    ...activeEpisode.participantSpeakerIds,
    ...(turn.speakerId ? [turn.speakerId] : []),
  ]);
  const participantPersonIds = unique([
    ...activeEpisode.participantPersonIds,
    ...(turn.recognizedPersonId ? [turn.recognizedPersonId] : []),
  ]);

  return {
    ...activeEpisode,
    updatedAt: nowIso,
    sourceModality: turn.sourceModality,
    recognizedPersonId: turn.recognizedPersonId,
    speakerConfidence: turn.speakerConfidence,
    relationshipScope: turn.relationshipScope,
    coPresentEntities: unique([
      ...(activeEpisode.coPresentEntities ?? []),
      ...(turn.coPresentEntities ?? []),
    ]),
    consentStatus: turn.consentStatus ?? activeEpisode.consentStatus,
    endTurnId: turn.id,
    turnIds: [...activeEpisode.turnIds, turn.id],
    primaryModality: derivePrimaryModality(modalityMix),
    modalityMix,
    participantSpeakerIds,
    participantPersonIds,
    focalRelationshipPersonId:
      turn.relationshipTargetPersonId ?? activeEpisode.focalRelationshipPersonId,
    boundaryReason: {
      topicShift: boundary.topicShift,
      surpriseDiscontinuity: boundary.surpriseDiscontinuity,
      score: boundary.score,
    },
  };
}

function deriveThreadCandidate(input: {
  sessionId: string;
  existingThread: ThreadRecord | null;
  episode: EpisodeRecord;
  nowIso: string;
}): ThreadRecord {
  const { sessionId, existingThread, episode, nowIso } = input;

  return {
    id: existingThread?.id ?? episode.threadId,
    sessionId,
    activeEpisodeId: episode.id,
    episodeIds: unique([...(existingThread?.episodeIds ?? []), episode.id]),
    lastUpdatedAt: nowIso,
    threadSummary: existingThread?.threadSummary,
    focalRelationshipPersonId:
      episode.focalRelationshipPersonId ?? existingThread?.focalRelationshipPersonId,
  };
}

function overlayRetrievalBundle(input: {
  base: RetrievalBundle;
  staged: StagedMemorySlice;
}): RetrievalBundle {
  const { base, staged } = input;

  const recentTurns = [...base.recentTurns, staged.turn].slice(-6);

  const withoutSameEpisode = base.activeThread.filter(
    (episode) => episode.id !== staged.episode.id,
  );
  const activeThread = [...withoutSameEpisode, staged.episode].slice(-3);

  const supportingEpisodes = activeThread.slice(-2);

  return {
    recentTurns,
    activeThread,
    activeNotes: base.activeNotes,
    supportingEpisodes,
    contradictionEvidence: base.contradictionEvidence,
    supersessionContext: base.supersessionContext,
  };
}

function buildSuccessResult(input: {
  text: string;
  trace: ReturnType<ProcessTurnDeps["traceFactory"]["create"]>;
  criticLoop?: import("./runtime_types").CriticLoopResult;
  committed: CommittedMemorySlice;
}): ProcessTurnResult {
  const { text, trace, criticLoop, committed } = input;

  return {
    ok: true,
    text,
    trace: trace.snapshot(),
    turnId: committed.turn.id,
    snapshotId: committed.snapshot.id,
    episodeId: committed.episode.id,
    threadId: committed.thread.id,
    criticLoop,
  };
}

function buildFallbackResult(input: {
  text: string;
  reason: string;
  trace: ReturnType<ProcessTurnDeps["traceFactory"]["create"]>;
}): ProcessTurnResult {
  return {
    ok: false,
    text: input.text,
    trace: input.trace.snapshot(),
    fallbackReason: input.reason,
  };
}

export async function processTurn(
  deps: ProcessTurnDeps,
  input: TurnInput,
): Promise<ProcessTurnResult> {
  const traceId = deps.idGenerator.next("trace");
  const trace = deps.traceFactory.create({
    traceId,
    sessionId: input.sessionId,
  });

  const journal = await deps.transaction.openJournal({
    traceId,
    sessionId: input.sessionId,
  });

  trace.add({
    stage: "turn.received",
    at: deps.clock.nowIso(),
    data: {
      sessionId: input.sessionId,
      speaker: input.speaker,
      sourceModality: input.sourceModality,
    },
  });

  try {
    const previousSnapshot = await deps.snapshotStore.getLatest(input.sessionId);
    const activeEpisode = await deps.episodeStore.getActive(input.sessionId);
    const existingThread = await deps.threadStore.getActive(input.sessionId);
    const priorTurns = await deps.turnStore.getRecent(input.sessionId, 6);

    if (!input.timestamp) {
      input.timestamp = deps.clock.nowIso();
    }
    const nowIso = input.timestamp;

    const stateResult = await deps.stateEngine.update({
      turn: input,
      previousSnapshot,
    });

    trace.add({
      stage: "state.updated",
      at: deps.clock.nowIso(),
      data: {
        hasPreviousSnapshot: Boolean(previousSnapshot),
        compoundsKeys: Object.keys(stateResult.compounds),
        relationshipVectorKeys: Object.keys(stateResult.relationshipVectors),
      },
    });

    const turnId = deps.idGenerator.next("turn");
    const snapshotId = deps.idGenerator.next("snapshot");
    const stagedEpisodeId = deps.idGenerator.next("episode_candidate");

    const turnIndex =
      (priorTurns.length ? priorTurns[priorTurns.length - 1].turnIndex : 0) + 1;

    const { turn, snapshot } = buildTurnArtifacts({
      turnInput: input,
      stateResult,
      turnId,
      snapshotId,
      turnIndex,
      nowIso: input.timestamp!,
    });

    const boundary = deps.episodeBoundary.decide({
      sessionId: input.sessionId,
      activeEpisode,
      recentTurns: priorTurns,
      currentTurn: turn,
      previousSnapshot,
      currentSnapshot: snapshot,
    });

    trace.add({
      stage: "memory.episode_boundary",
      at: nowIso,
      data: {
        split: boundary.split,
        topicShift: boundary.topicShift,
        surpriseDiscontinuity: boundary.surpriseDiscontinuity,
        score: boundary.score,
        reasons: boundary.reasons,
      },
    });

    const episode = deriveEpisodeCandidate({
      activeEpisode,
      turn,
      boundary,
      nowIso,
      stagedEpisodeId,
    });

    const thread = deriveThreadCandidate({
      sessionId: input.sessionId,
      existingThread,
      episode,
      nowIso,
    });

    const staged: StagedMemorySlice = {
      turn,
      snapshot,
      boundary,
      episode,
      thread,
    };

    await journal.stage({
      kind: "turn_candidate",
      key: turn.id,
      data: {
        sessionId: turn.sessionId,
        turnIndex: turn.turnIndex,
        stateSnapshotId: turn.stateSnapshotId,
      },
    });

    await journal.stage({
      kind: "snapshot_candidate",
      key: snapshot.id,
      data: {
        sessionId: snapshot.sessionId,
        turnId: snapshot.turnId,
      },
    });

    await journal.stage({
      kind: "episode_candidate",
      key: episode.id,
      data: {
        sessionId: episode.sessionId,
        threadId: episode.threadId,
        split: boundary.split,
        turnCount: episode.turnIds.length,
      },
    });

    await journal.stage({
      kind: "thread_candidate",
      key: thread.id,
      data: {
        sessionId: thread.sessionId,
        activeEpisodeId: thread.activeEpisodeId,
        episodeCount: thread.episodeIds.length,
      },
    });

    trace.add({
      stage: "memory.staged",
      at: nowIso,
      data: {
        turnId: turn.id,
        snapshotId: snapshot.id,
        episodeId: episode.id,
        threadId: thread.id,
        split: boundary.split,
      },
    });

    const baseRetrieval = await deps.retrievalPlanner.build(input.sessionId, turn);
    const retrieval = overlayRetrievalBundle({
      base: baseRetrieval,
      staged,
    });

    trace.add({
      stage: "retrieval.built",
      at: nowIso,
      data: {
        recentTurns: retrieval.recentTurns.length,
        activeThreadEpisodes: retrieval.activeThread.length,
        activeNotes: retrieval.activeNotes.length,
        supportingEpisodes: retrieval.supportingEpisodes.length,
        contradictionEvidence: retrieval.contradictionEvidence.length,
      },
    });

    // ── Pack 3.12: Shadow Retrieval Instrumentation ──
    // Shadow calls run AFTER the baseline bundle is finalized and BEFORE contextBuilder.
    // They MUST NOT modify retrieval, activeNotes, contradictionEvidence, or any generator field.
    // Exceptions are silently swallowed. Both lanes are independently measured.
    const shadowFlags = readShadowFlags();

    if (shadowFlags.associative && !isShadowAutoDisabled("associative")) {
      try {
        const assocShadow = await runAssociativeShadow({
          retrieval,
          allLinks: [], // No live link store in current hot path; pack injected as empty
                        // per §9.2: shadow call must not modify stores
          eligibleNotes: retrieval.activeNotes,
          sessionId: input.sessionId,
          turnId: turn.id,
        });
        if (assocShadow) {
          const auditEntry = shadowAuditToOperatorEntry(assocShadow);
          trace.add({
            stage: "shadow.associative.completed",
            at: deps.clock.nowIso(),
            data: {
              shadowHitCount: assocShadow.shadowHitCount,
              latencyMs: assocShadow.latencyMs,
              estimatedTokenDelta: assocShadow.estimatedTokenDelta,
              reviewDisambiguationEstimate: assocShadow.reviewDisambiguationEstimate,
              crossEpisodeDiversityEstimate: assocShadow.crossEpisodeDiversityEstimate,
              autoDisabledThisTurn: assocShadow.autoDisabledThisTurn,
            },
          });
          void auditEntry; // available for caller extraction; not used in hot path
          // Pack 3.14b: persist to evidence store (no-op when dep absent)
          (deps.shadowEvidenceCollector ?? new NoOpShadowEvidenceCollector())
            .collect(assocShadow, deps.clock.nowIso());
        }
      } catch {
        // Shadow failure must never surface. Swallow silently.
      }
    }

    if (shadowFlags.trace && !isShadowAutoDisabled("trace")) {
      try {
        const traceShadow = await runTraceShadow({
          retrieval,
          recentTurns: retrieval.recentTurns,
          sessionId: input.sessionId,
          turnId: turn.id,
        });
        if (traceShadow) {
          const auditEntry = shadowAuditToOperatorEntry(traceShadow);
          trace.add({
            stage: "shadow.trace.completed",
            at: deps.clock.nowIso(),
            data: {
              shadowHitCount: traceShadow.shadowHitCount,
              latencyMs: traceShadow.latencyMs,
              estimatedTokenDelta: traceShadow.estimatedTokenDelta,
              reviewDisambiguationEstimate: traceShadow.reviewDisambiguationEstimate,
              autoDisabledThisTurn: traceShadow.autoDisabledThisTurn,
            },
          });
          void auditEntry; // available for caller extraction; not used in hot path
          // Pack 3.14b: persist to evidence store (no-op when dep absent)
          (deps.shadowEvidenceCollector ?? new NoOpShadowEvidenceCollector())
            .collect(traceShadow, deps.clock.nowIso());
        }
      } catch {
        // Shadow failure must never surface. Swallow silently.
      }
    }
    // ── End Pack 3.12 shadow block ──

    const memoryContext = deps.contextBuilder.build(retrieval);

    trace.add({
      stage: "context.built",
      at: deps.clock.nowIso(),
      data: {
        stableNotesBlockLength: memoryContext.stableNotesBlock.length,
        threadBlockLength: memoryContext.threadBlock.length,
        hasEpisodeEvidenceBlock: Boolean(memoryContext.episodeEvidenceBlock),
      },
    });

    const currentScope = {
      turnId: turn.id,
      activeDomain: retrieval.activeThread[0]?.topicLabels?.[0],
    };

    const router = new PostureRouter();
    const routedMode = router.route(snapshot, turn);
    
    // Fallback to K_position store if the router explicitly routed to PURE_A and there are organic biases.
    // However, the memo states: "Connect the router output to the existing generator adapter through the existing K_position bias path only. Do not introduce a second directive-injection path."
    const injectedBiases = router.getBiases(routedMode);
    
    // Combine router biases with organic store biases if needed, or let router take precedence.
    // Given the memo, the router represents the entire approved policy.
    const finalBiases = injectedBiases.length > 0 ? injectedBiases : (deps.kPositionStore ? deps.kPositionStore.getDirectionalBiases(currentScope) : undefined);

    const generationOutput = await deps.generator.generate({
      sessionId: input.sessionId,
      turn,
      snapshot,
      retrieval,
      memoryContext,
      kPositionBiases: finalBiases,
      studioPulseContext: input.studioPulseContext,
    });

    await journal.stage({
      kind: "generation_output",
      data: {
        hasTextField: Boolean(generationOutput.text),
      },
    });

    trace.add({
      stage: "generation.completed",
      at: deps.clock.nowIso(),
      data: {
        hasTextField: Boolean(generationOutput.text),
        generatorMetadata: generationOutput.metadata,
      },
    });

    let parsed: ParsedOutput = deps.parser.parse(generationOutput);

    trace.add({
      stage: "parser.completed",
      at: deps.clock.nowIso(),
      data: {
        outputLength: parsed.text.length,
      },
    });

    const validation = deps.validator.validate({
      parsed,
      turn,
      snapshot,
      retrieval,
    });

    await journal.stage({
      kind: "validation_result",
      data: {
        valid: validation.valid,
        reasons: validation.reasons,
      },
    });

    trace.add({
      stage: "validator.completed",
      at: deps.clock.nowIso(),
      data: {
        valid: validation.valid,
        reasons: validation.reasons,
      },
    });

    if (!validation.valid) {
      throw new Error(
        `validation_failed:${validation.reasons.join(",") || "unknown_reason"}`,
      );
    }

    // ── Bounded Critic Loop (sync, before commit) ──────────────────────────
    // Risk-gated: only runs when criticLoop dep is injected.
    // MAX_CRITIC_CYCLES = 2 hard cap. Never aborts the turn on failure.
    // Speed doctrine: warn if critic loop is active; latency is measured by T7 fixtures.
    let criticLoopResult: import("./runtime_types").CriticLoopResult | undefined;
    if (deps.criticLoop) {
      console.warn("[CRITIC] critic loop is active on this turn (risk-gated, cap=2)");
      criticLoopResult = await deps.criticLoop.run({
        turn,
        snapshot,
        retrieval,
        initialParsed: parsed,
      });
      // Update parsed text to critic-resolved version before commit
      parsed = { ...parsed, text: criticLoopResult.finalText };
      trace.add({
        stage: "critic.loop.completed",
        at: deps.clock.nowIso(),
        data: {
          cycleCount: criticLoopResult.cycleCount,
          maxCyclesHit: criticLoopResult.maxCyclesHit,
          findingCount: criticLoopResult.findings.length,
          didReRetrieve: criticLoopResult.didReRetrieve,
        },
      });

      await journal.stage({
        kind: "critic_measurement",
        data: {
          preRevisionText: generationOutput.text ?? "",
          postRevisionText: criticLoopResult.finalText,
          cycleCount: criticLoopResult.cycleCount,
          maxCyclesHit: criticLoopResult.maxCyclesHit,
          didReRetrieve: criticLoopResult.didReRetrieve,
          findings: criticLoopResult.findings.map(f => ({
            issueType: f.issueType,
            affectedNoteId: f.affectedNoteId,
          })),
          fireTimeActiveNotes: retrieval.activeNotes.map(n => ({
            id: n.id,
            normalizedValue: n.normalizedValue
          })),
          shapingEnvelope: {
            certainty: snapshot.expressiveEnvelope.certainty,
            trust: snapshot.expressiveEnvelope.trust,
            valence: snapshot.expressiveEnvelope.valence
          }
        },
      });
    }

    const committed = await journal.commit<CommittedMemorySlice>({
      apply: async () => {
        const persistedTurn = await deps.turnStore.write(turn);
        const persistedSnapshot = await deps.snapshotStore.write(snapshot);

        const persistedEpisode =
          boundary.split || !activeEpisode
            ? await deps.episodeStore.createFromTurn(
                persistedTurn,
                boundary,
                { episodeId: episode.id },
              )
            : await deps.episodeStore.appendTurn(
                activeEpisode.id,
                persistedTurn,
                boundary,
              );

        const persistedThread = await deps.threadStore.update(
          input.sessionId,
          persistedEpisode,
        );

        return {
          turn: persistedTurn,
          snapshot: persistedSnapshot,
          episode: persistedEpisode,
          thread: persistedThread,
        };
      },
    });

    trace.add({
      stage: "transaction.committed",
      at: deps.clock.nowIso(),
      data: {
        turnId: committed.turn.id,
        snapshotId: committed.snapshot.id,
        episodeId: committed.episode.id,
        threadId: committed.thread.id,
      },
    });

    trace.succeed();

    if (deps.asyncMemoryFollowup) {
      await deps.asyncMemoryFollowup.scheduleEpisodeProcessing({
        sessionId: input.sessionId,
        episodeId: committed.episode.id,
      });

      trace.add({
        stage: "memory.async_followup_scheduled",
        at: deps.clock.nowIso(),
        data: {
          episodeId: committed.episode.id,
        },
      });
    }

    return buildSuccessResult({
      text: parsed.text,
      trace,
      criticLoop: criticLoopResult,
      committed,
    });
  } catch (error) {
    const reason = compactErrorMessage(error);

    trace.fail(reason, error);

    await deps.rollback.rollback({
      journal,
      traceId,
      sessionId: input.sessionId,
      reason,
      error,
    });

    const fallback = await deps.fallback.build({
      turn: input,
      reason,
      error,
    });

    trace.add({
      stage: "fallback.built",
      at: deps.clock.nowIso(),
      data: {
        reason: fallback.reason,
      },
    });

    return buildFallbackResult({
      text: fallback.text,
      reason: fallback.reason,
      trace,
    });
  }
}
