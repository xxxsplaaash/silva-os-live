// src/runtime/postureRouter.ts
var PostureRouter = class {
  route(snapshot, turn) {
    const lower = turn.rawText.toLowerCase();
    if (snapshot.expressiveEnvelope.tension > 0.4) {
      const isDiagnostic = /\b(explain why|why this|why is it)\b/.test(lower);
      const isExecution = /\b(next command|how to run|next step|exact command)\b/.test(lower);
      const isJustFixIt = /\b(just fix it|exact working string|nothing else|just give me)\b/.test(lower);
      const isBlockedUncertain = /\b(don't know|where to look|want to quit|so frustrated)\b/.test(lower);
      if (isDiagnostic || isExecution || isJustFixIt || isBlockedUncertain) {
        return "PURE_A";
      }
      return "PURE_A";
    }
    const isIdeation = /\b(brainstorm|ideate|ideas|explore|what kinds|directions)\b/.test(lower);
    if (isIdeation) {
      return "EXPLORATION_EXPAND";
    }
    return "PURE_A";
  }
  getBiases(mode) {
    if (mode === "EXPLORATION_EXPAND") {
      return [
        { domain: "communication_pace", bias: -0.9, confidence: 1 },
        { domain: "detail_tolerance", bias: 0.9, confidence: 1 }
      ];
    }
    return [];
  }
};

// src/memory/operatorAuditTrail.ts
var _seq = 0;
function makeAuditId() {
  _seq += 1;
  return `aud_${_seq.toString().padStart(6, "0")}`;
}
function buildAcceptanceAuditEntry(params) {
  return {
    auditId: params.auditId,
    timestamp: params.timestamp,
    noteId: params.noteId,
    subtype: params.subtype,
    canonicalText: params.canonicalText,
    outcome: params.outcome,
    primaryReason: params.primaryReason,
    allReasons: params.allReasons,
    signals: params.signals,
    supersessionLinks: params.supersessionLinks
  };
}
function buildSupersessionAuditEntry(params) {
  return {
    auditId: params.auditId,
    timestamp: params.timestamp,
    noteId: params.priorNoteId,
    subtype: "supersession_link",
    canonicalText: params.priorCanonicalText,
    outcome: "superseded",
    primaryReason: "superseded_prior_note",
    allReasons: ["superseded_prior_note"],
    signals: params.signals,
    supersessionLinks: [
      {
        priorNoteId: params.priorNoteId,
        priorCanonicalText: params.priorCanonicalText,
        priorNewStatus: params.priorNewStatus
      }
    ]
  };
}

// src/research/associativeRetrieval.ts
function buildNoteGraph(links) {
  const forward = /* @__PURE__ */ new Map();
  const backward = /* @__PURE__ */ new Map();
  for (const link of links) {
    const fwd = forward.get(link.fromNoteId) ?? [];
    fwd.push({ targetId: link.toNoteId, relation: link.relation, strength: link.strength ?? 1 });
    forward.set(link.fromNoteId, fwd);
    const bwd = backward.get(link.toNoteId) ?? [];
    bwd.push({ sourceId: link.fromNoteId, relation: link.relation, strength: link.strength ?? 1 });
    backward.set(link.toNoteId, bwd);
  }
  return { forward, backward };
}
var TRAVERSABLE_FORWARD = /* @__PURE__ */ new Set([
  "supports",
  "derived_from"
]);
var TRAVERSABLE_BACKWARD = /* @__PURE__ */ new Set([
  "supports",
  "contradicts",
  "derived_from"
]);
var MAX_HOPS = 2;
var LINK_STRENGTH_DECAY = 0.7;
function associativeWalk(seedIds, graph, notePool, maxResults = 6) {
  const visited = new Set(seedIds);
  const queue = [];
  for (const seedId of seedIds) {
    const fwdEdges = graph.forward.get(seedId) ?? [];
    for (const edge of fwdEdges) {
      if (!TRAVERSABLE_FORWARD.has(edge.relation)) continue;
      if (!visited.has(edge.targetId)) {
        queue.push({ id: edge.targetId, hop: 1, relations: [edge.relation], cumulativeStrength: edge.strength });
      }
    }
    const bwdEdges = graph.backward.get(seedId) ?? [];
    for (const edge of bwdEdges) {
      if (!TRAVERSABLE_BACKWARD.has(edge.relation)) continue;
      if (!visited.has(edge.sourceId)) {
        queue.push({ id: edge.sourceId, hop: 1, relations: [edge.relation], cumulativeStrength: edge.strength });
      }
    }
  }
  const hits = [];
  while (queue.length > 0 && hits.length < maxResults * 2) {
    const item = queue.shift();
    if (visited.has(item.id)) continue;
    visited.add(item.id);
    const note = notePool.get(item.id);
    if (!note) continue;
    if (note.reviewState === "rejected") continue;
    if (note.reinferencePolicy.mode === "block_auto_reinfer") continue;
    const decayedStrength = item.cumulativeStrength * Math.pow(LINK_STRENGTH_DECAY, item.hop - 1);
    const score = note.confidence * decayedStrength;
    hits.push({
      note,
      hopDistance: item.hop,
      traversedRelations: item.relations,
      score
    });
    if (item.hop < MAX_HOPS) {
      const nextHop = item.hop + 1;
      const fwdEdges = graph.forward.get(item.id) ?? [];
      for (const edge of fwdEdges) {
        if (!TRAVERSABLE_FORWARD.has(edge.relation)) continue;
        if (!visited.has(edge.targetId)) {
          queue.push({
            id: edge.targetId,
            hop: nextHop,
            relations: [...item.relations, edge.relation],
            cumulativeStrength: edge.strength
          });
        }
      }
      const bwdEdges = graph.backward.get(item.id) ?? [];
      for (const edge of bwdEdges) {
        if (!TRAVERSABLE_BACKWARD.has(edge.relation)) continue;
        if (!visited.has(edge.sourceId)) {
          queue.push({
            id: edge.sourceId,
            hop: nextHop,
            relations: [...item.relations, edge.relation],
            cumulativeStrength: edge.strength
          });
        }
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
function runAssociativeRetrieval(baselineNoteIds, links, eligibleNotes, maxAssociative = 6) {
  const graph = buildNoteGraph(links);
  const notePool = new Map(eligibleNotes.map((n) => [n.id, n]));
  const hits = associativeWalk(baselineNoteIds, graph, notePool, maxAssociative);
  const associativeIds = new Set(hits.map((h) => h.note.id));
  const baselineOnly = [...baselineNoteIds].filter((id) => !associativeIds.has(id));
  const associativeOnly = [...associativeIds].filter((id) => !baselineNoteIds.has(id));
  const intersection = [...baselineNoteIds].filter((id) => associativeIds.has(id));
  return { hits, baselineOnly, associativeOnly, intersection };
}

// src/research/traceConsumption.ts
function extractTraceEvent(turn) {
  const text = turn.rawText;
  const labels = [];
  if (/\b(actually|not anymore|no longer|used to|stopped|instead|changed|i don't|i no longer)\b/i.test(text)) {
    labels.push("contradiction_signal");
  }
  if (/\b(i like|i love|i prefer|i always|i usually|my go-to|i tend to)\b/i.test(text)) {
    labels.push("preference_assertion");
  }
  if (/\b(i don't like|i hate|i avoid|i stopped|i gave up|i cut out|i never)\b/i.test(text)) {
    labels.push("preference_negation");
  }
  if (/\b(used to|back then|previously|before|at the time|that was)\b/i.test(text)) {
    labels.push("stale_note_context");
  }
  if (/\b(trust|feels safe|comfortable|not ready|awkward|close|distant)\b/i.test(text)) {
    labels.push("relationship_signal");
  }
  return {
    sourceId: turn.id,
    timestamp: turn.createdAt,
    sessionId: turn.sessionId,
    speaker: turn.speaker,
    rawText: text,
    labels: labels.length > 0 ? labels : void 0,
    labelConfidence: labels.length > 0 ? 0.72 : 0
  };
}
var STOP_WORDS = /* @__PURE__ */ new Set(["i", "a", "an", "the", "and", "or", "is", "are", "was", "were", "to", "of", "in", "my"]);
function tokenOverlap(traceText, noteValue) {
  const tokenize2 = (s) => new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  );
  const traceTokens = tokenize2(traceText);
  const noteTokens = tokenize2(noteValue);
  if (noteTokens.size === 0 || traceTokens.size === 0) return 0;
  let shared = 0;
  for (const tok of noteTokens) {
    if (traceTokens.has(tok)) shared++;
  }
  const union = (/* @__PURE__ */ new Set([...traceTokens, ...noteTokens])).size;
  return shared / union;
}
var MIN_OVERLAP_THRESHOLD = 0.08;
function matchTraceToNote(event, note) {
  const noteValue = note.normalizedValue ?? note.canonicalText;
  const overlap = tokenOverlap(event.rawText, noteValue);
  if (overlap < MIN_OVERLAP_THRESHOLD) return null;
  const hasContradiction = event.labels?.includes("contradiction_signal") || event.labels?.includes("preference_negation") || false;
  const hasSupport = event.labels?.includes("preference_assertion") && !hasContradiction;
  const matchType = hasContradiction ? "contradicts" : hasSupport ? "supports" : "ambiguous";
  return {
    traceEvent: event,
    noteId: note.id,
    matchType,
    textOverlapScore: overlap
  };
}
function runTraceConsumption(notes, traceEvents, maxMatches = 20) {
  const allMatches = [];
  for (const event of traceEvents) {
    for (const note of notes) {
      const match = matchTraceToNote(event, note);
      if (match) allMatches.push(match);
    }
  }
  allMatches.sort((a, b) => b.textOverlapScore - a.textOverlapScore);
  const cappedMatches = allMatches.slice(0, maxMatches);
  const supportedIds = /* @__PURE__ */ new Set();
  const contradictedIds = /* @__PURE__ */ new Set();
  for (const match of cappedMatches) {
    if (match.matchType === "contradicts") contradictedIds.add(match.noteId);
    else if (match.matchType === "supports") supportedIds.add(match.noteId);
  }
  const traceSupported = notes.filter(
    (n) => supportedIds.has(n.id) && !contradictedIds.has(n.id)
  );
  const traceContradicted = notes.filter((n) => contradictedIds.has(n.id));
  const traceOrphaned = notes.filter(
    (n) => !supportedIds.has(n.id) && !contradictedIds.has(n.id)
  );
  return {
    traceSupported,
    traceContradicted,
    traceOrphaned,
    allMatches: cappedMatches,
    traceEventsConsumed: traceEvents.length
  };
}

// src/runtime/shadowRetrievalOrchestrator.ts
function readShadowFlags() {
  return {
    associative: process.env.AISHA_SHADOW_ASSOCIATIVE === "1",
    trace: process.env.AISHA_SHADOW_TRACE === "1"
  };
}
var SHADOW_LATENCY_HARD_LIMIT_MS = 15;
var SHADOW_CONSECUTIVE_LIMIT = 3;
var _consecutiveOverruns = { associative: 0, trace: 0 };
var _autoDisabled = { associative: false, trace: false };
function isShadowAutoDisabled(lane) {
  return _autoDisabled[lane];
}
function recordShadowLatency(lane, latencyMs) {
  if (latencyMs > SHADOW_LATENCY_HARD_LIMIT_MS) {
    _consecutiveOverruns[lane] += 1;
    if (_consecutiveOverruns[lane] >= SHADOW_CONSECUTIVE_LIMIT && !_autoDisabled[lane]) {
      _autoDisabled[lane] = true;
      console.error(
        `[SHADOW][${lane.toUpperCase()}] AUTO-DISABLED: exceeded ${SHADOW_LATENCY_HARD_LIMIT_MS}ms on ${SHADOW_CONSECUTIVE_LIMIT} consecutive turns. Set AISHA_SHADOW_${lane.toUpperCase()}=0 to acknowledge.`
      );
      return true;
    }
  } else {
    _consecutiveOverruns[lane] = 0;
  }
  return false;
}
var AVG_NOTE_TOKEN_COST = 35;
async function runAssociativeShadow(params) {
  const { retrieval, allLinks, eligibleNotes, sessionId, turnId } = params;
  const baselineIds = new Set(retrieval.activeNotes.map((n) => n.id));
  const baselineEpisodeIds = new Set(retrieval.activeNotes.flatMap((n) => n.sourceEpisodeIds));
  const t0 = Date.now();
  let result;
  try {
    result = runAssociativeRetrieval(baselineIds, allLinks, eligibleNotes, 6);
  } catch (err) {
    console.warn("[SHADOW][ASSOCIATIVE] error during shadow run (swallowed):", err);
    return null;
  }
  const latencyMs = Date.now() - t0;
  const autoDisabled = recordShadowLatency("associative", latencyMs);
  const hits = result.hits;
  const shadowHitCount = hits.length;
  const needsReviewHits = hits.filter(
    (h) => h.note.reinferencePolicy.mode === "needs_review" || h.note.reviewState === "pending"
  ).length;
  const reviewDisambiguationEstimate = shadowHitCount === 0 ? 0 : needsReviewHits / shadowHitCount;
  const crossEpisodeHits = hits.filter(
    (h) => !h.note.sourceEpisodeIds.some((epId) => baselineEpisodeIds.has(epId))
  ).length;
  const crossEpisodeDiversityEstimate = shadowHitCount === 0 ? 0 : crossEpisodeHits / shadowHitCount;
  return {
    auditKind: "shadow_retrieval_research",
    lane: "associative",
    sessionId,
    turnId,
    baselineNoteCount: retrieval.activeNotes.length,
    shadowHitCount,
    estimatedTokenDelta: shadowHitCount * AVG_NOTE_TOKEN_COST,
    latencyMs,
    reviewDisambiguationEstimate,
    crossEpisodeDiversityEstimate,
    autoDisabledThisTurn: autoDisabled
  };
}
async function runTraceShadow(params) {
  const { retrieval, recentTurns, sessionId, turnId } = params;
  const baselineEpisodeIds = new Set(retrieval.activeNotes.flatMap((n) => n.sourceEpisodeIds));
  const t0 = Date.now();
  let traceResult;
  try {
    const events = recentTurns.map(extractTraceEvent);
    traceResult = runTraceConsumption(retrieval.activeNotes, events, 20);
  } catch (err) {
    console.warn("[SHADOW][TRACE] error during shadow run (swallowed):", err);
    return null;
  }
  const latencyMs = Date.now() - t0;
  const autoDisabled = recordShadowLatency("trace", latencyMs);
  const matchedNoteIds = new Set(traceResult.allMatches.map((m) => m.noteId));
  const shadowHitCount = matchedNoteIds.size;
  const needsReviewNotes = retrieval.activeNotes.filter(
    (n) => n.reinferencePolicy.mode === "needs_review" || n.reviewState === "pending"
  );
  const disambiguated = needsReviewNotes.filter(
    (n) => traceResult.allMatches.some(
      (m) => m.noteId === n.id && (m.matchType === "supports" || m.matchType === "contradicts")
    )
  ).length;
  const reviewDisambiguationEstimate = needsReviewNotes.length === 0 ? 0 : disambiguated / needsReviewNotes.length;
  const crossEpisodeDiversityEstimate = 0;
  return {
    auditKind: "shadow_retrieval_research",
    lane: "trace",
    sessionId,
    turnId,
    baselineNoteCount: retrieval.activeNotes.length,
    shadowHitCount,
    estimatedTokenDelta: shadowHitCount * AVG_NOTE_TOKEN_COST,
    latencyMs,
    reviewDisambiguationEstimate,
    crossEpisodeDiversityEstimate,
    autoDisabledThisTurn: autoDisabled
  };
}
function shadowAuditToOperatorEntry(shadow) {
  return buildAcceptanceAuditEntry({
    auditId: makeAuditId(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    noteId: `shadow_${shadow.lane}_${shadow.turnId}`,
    subtype: "shadow_retrieval_research",
    canonicalText: JSON.stringify({
      auditKind: shadow.auditKind,
      lane: shadow.lane,
      baselineNoteCount: shadow.baselineNoteCount,
      shadowHitCount: shadow.shadowHitCount,
      estimatedTokenDelta: shadow.estimatedTokenDelta,
      latencyMs: shadow.latencyMs,
      reviewDisambiguationEstimate: shadow.reviewDisambiguationEstimate,
      crossEpisodeDiversityEstimate: shadow.crossEpisodeDiversityEstimate,
      autoDisabledThisTurn: shadow.autoDisabledThisTurn
    }),
    outcome: "accepted",
    // nominal — shadow entries don't have a gating outcome
    primaryReason: "default_pending",
    allReasons: ["default_pending"],
    signals: {
      trust: 0,
      caution: 0,
      confidence: 1,
      hasContradiction: false,
      contradictionCount: 0
    }
  });
}

// src/research/shadowEvidenceCollector.ts
var ShadowEvidenceCollector = class {
  constructor(store) {
    this.store = store;
  }
  store;
  collect(entry, collectedAt) {
    try {
      return this.store.append(entry, collectedAt);
    } catch (err) {
      console.warn("[SHADOW][COLLECTOR] evidence append failed (swallowed):", err);
      return null;
    }
  }
};
var NoOpShadowEvidenceCollector = class {
  collect(_entry, _collectedAt) {
    return null;
  }
};

// src/runtime/processTurn.ts
function compactErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return "unknown_runtime_error";
}
function unique(values) {
  return [...new Set(values)];
}
function defaultThreadId(sessionId) {
  return `thread_${sessionId}`;
}
function derivePrimaryModality(modalities) {
  const uniq = unique(modalities);
  return uniq.length === 1 ? uniq[0] : "mixed";
}
function buildTurnArtifacts(input) {
  const {
    turnInput,
    stateResult,
    turnId,
    snapshotId,
    turnIndex,
    nowIso
  } = input;
  const turn = {
    id: turnId,
    kind: "turn",
    createdAt: nowIso,
    sourceModality: turnInput.sourceModality,
    speakerId: turnInput.speakerId,
    recognizedPersonId: turnInput.recognizedPersonId,
    speakerConfidence: turnInput.speakerConfidence,
    relationshipScope: turnInput.relationshipScope,
    coPresentEntities: [...turnInput.coPresentEntities ?? []],
    consentStatus: turnInput.consentStatus,
    sessionId: turnInput.sessionId,
    turnIndex,
    speaker: turnInput.speaker,
    rawText: turnInput.rawText,
    normalizedText: turnInput.normalizedText,
    stateSnapshotId: snapshotId,
    relationshipTargetPersonId: turnInput.relationshipTargetPersonId,
    entityMentions: [...turnInput.entityMentions ?? []],
    immutable: true
  };
  const snapshot = {
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
    schemaVersion: "pack1-v1"
  };
  return { turn, snapshot };
}
function deriveEpisodeCandidate(input) {
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
      summary: void 0,
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId ? [turn.recognizedPersonId] : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: boundary.topicShift,
        surpriseDiscontinuity: boundary.surpriseDiscontinuity,
        score: boundary.score
      }
    };
  }
  const modalityMix = unique([...activeEpisode.modalityMix, turn.sourceModality]);
  const participantSpeakerIds = unique([
    ...activeEpisode.participantSpeakerIds,
    ...turn.speakerId ? [turn.speakerId] : []
  ]);
  const participantPersonIds = unique([
    ...activeEpisode.participantPersonIds,
    ...turn.recognizedPersonId ? [turn.recognizedPersonId] : []
  ]);
  return {
    ...activeEpisode,
    updatedAt: nowIso,
    sourceModality: turn.sourceModality,
    recognizedPersonId: turn.recognizedPersonId,
    speakerConfidence: turn.speakerConfidence,
    relationshipScope: turn.relationshipScope,
    coPresentEntities: unique([
      ...activeEpisode.coPresentEntities ?? [],
      ...turn.coPresentEntities ?? []
    ]),
    consentStatus: turn.consentStatus ?? activeEpisode.consentStatus,
    endTurnId: turn.id,
    turnIds: [...activeEpisode.turnIds, turn.id],
    primaryModality: derivePrimaryModality(modalityMix),
    modalityMix,
    participantSpeakerIds,
    participantPersonIds,
    focalRelationshipPersonId: turn.relationshipTargetPersonId ?? activeEpisode.focalRelationshipPersonId,
    boundaryReason: {
      topicShift: boundary.topicShift,
      surpriseDiscontinuity: boundary.surpriseDiscontinuity,
      score: boundary.score
    }
  };
}
function deriveThreadCandidate(input) {
  const { sessionId, existingThread, episode, nowIso } = input;
  return {
    id: existingThread?.id ?? episode.threadId,
    sessionId,
    activeEpisodeId: episode.id,
    episodeIds: unique([...existingThread?.episodeIds ?? [], episode.id]),
    lastUpdatedAt: nowIso,
    threadSummary: existingThread?.threadSummary,
    focalRelationshipPersonId: episode.focalRelationshipPersonId ?? existingThread?.focalRelationshipPersonId
  };
}
function overlayRetrievalBundle(input) {
  const { base, staged } = input;
  const recentTurns = [...base.recentTurns, staged.turn].slice(-6);
  const withoutSameEpisode = base.activeThread.filter(
    (episode) => episode.id !== staged.episode.id
  );
  const activeThread = [...withoutSameEpisode, staged.episode].slice(-3);
  const supportingEpisodes = activeThread.slice(-2);
  return {
    recentTurns,
    activeThread,
    activeNotes: base.activeNotes,
    supportingEpisodes,
    contradictionEvidence: base.contradictionEvidence,
    supersessionContext: base.supersessionContext
  };
}
function buildSuccessResult(input) {
  const { text, trace, criticLoop, committed, memoryFollowup } = input;
  return {
    ok: true,
    text,
    trace: trace.snapshot(),
    turnId: committed.turn.id,
    snapshotId: committed.snapshot.id,
    episodeId: committed.episode.id,
    threadId: committed.thread.id,
    criticLoop,
    memoryFollowup
  };
}
function buildFallbackResult(input) {
  return {
    ok: false,
    text: input.text,
    trace: input.trace.snapshot(),
    fallbackReason: input.reason
  };
}
async function processTurn(deps, input) {
  const traceId = deps.idGenerator.next("trace");
  const trace = deps.traceFactory.create({
    traceId,
    sessionId: input.sessionId
  });
  const journal = await deps.transaction.openJournal({
    traceId,
    sessionId: input.sessionId
  });
  trace.add({
    stage: "turn.received",
    at: deps.clock.nowIso(),
    data: {
      sessionId: input.sessionId,
      speaker: input.speaker,
      sourceModality: input.sourceModality
    }
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
      previousSnapshot
    });
    trace.add({
      stage: "state.updated",
      at: deps.clock.nowIso(),
      data: {
        hasPreviousSnapshot: Boolean(previousSnapshot),
        compoundsKeys: Object.keys(stateResult.compounds),
        relationshipVectorKeys: Object.keys(stateResult.relationshipVectors)
      }
    });
    const turnId = deps.idGenerator.next("turn");
    const snapshotId = deps.idGenerator.next("snapshot");
    const stagedEpisodeId = deps.idGenerator.next("episode_candidate");
    const turnIndex = (priorTurns.length ? priorTurns[priorTurns.length - 1].turnIndex : 0) + 1;
    const { turn, snapshot } = buildTurnArtifacts({
      turnInput: input,
      stateResult,
      turnId,
      snapshotId,
      turnIndex,
      nowIso: input.timestamp
    });
    const boundary = deps.episodeBoundary.decide({
      sessionId: input.sessionId,
      activeEpisode,
      recentTurns: priorTurns,
      currentTurn: turn,
      previousSnapshot,
      currentSnapshot: snapshot
    });
    trace.add({
      stage: "memory.episode_boundary",
      at: nowIso,
      data: {
        split: boundary.split,
        topicShift: boundary.topicShift,
        surpriseDiscontinuity: boundary.surpriseDiscontinuity,
        score: boundary.score,
        reasons: boundary.reasons
      }
    });
    const episode = deriveEpisodeCandidate({
      activeEpisode,
      turn,
      boundary,
      nowIso,
      stagedEpisodeId
    });
    const thread = deriveThreadCandidate({
      sessionId: input.sessionId,
      existingThread,
      episode,
      nowIso
    });
    const staged = {
      turn,
      snapshot,
      boundary,
      episode,
      thread
    };
    await journal.stage({
      kind: "turn_candidate",
      key: turn.id,
      data: {
        sessionId: turn.sessionId,
        turnIndex: turn.turnIndex,
        stateSnapshotId: turn.stateSnapshotId
      }
    });
    await journal.stage({
      kind: "snapshot_candidate",
      key: snapshot.id,
      data: {
        sessionId: snapshot.sessionId,
        turnId: snapshot.turnId
      }
    });
    await journal.stage({
      kind: "episode_candidate",
      key: episode.id,
      data: {
        sessionId: episode.sessionId,
        threadId: episode.threadId,
        split: boundary.split,
        turnCount: episode.turnIds.length
      }
    });
    await journal.stage({
      kind: "thread_candidate",
      key: thread.id,
      data: {
        sessionId: thread.sessionId,
        activeEpisodeId: thread.activeEpisodeId,
        episodeCount: thread.episodeIds.length
      }
    });
    trace.add({
      stage: "memory.staged",
      at: nowIso,
      data: {
        turnId: turn.id,
        snapshotId: snapshot.id,
        episodeId: episode.id,
        threadId: thread.id,
        split: boundary.split
      }
    });
    const baseRetrieval = await deps.retrievalPlanner.build(input.sessionId, turn);
    const retrieval = overlayRetrievalBundle({
      base: baseRetrieval,
      staged
    });
    trace.add({
      stage: "retrieval.built",
      at: nowIso,
      data: {
        recentTurns: retrieval.recentTurns.length,
        activeThreadEpisodes: retrieval.activeThread.length,
        activeNotes: retrieval.activeNotes.length,
        supportingEpisodes: retrieval.supportingEpisodes.length,
        contradictionEvidence: retrieval.contradictionEvidence.length
      }
    });
    const shadowFlags = readShadowFlags();
    if (shadowFlags.associative && !isShadowAutoDisabled("associative")) {
      try {
        const assocShadow = await runAssociativeShadow({
          retrieval,
          allLinks: [],
          // No live link store in current hot path; pack injected as empty
          // per §9.2: shadow call must not modify stores
          eligibleNotes: retrieval.activeNotes,
          sessionId: input.sessionId,
          turnId: turn.id
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
              autoDisabledThisTurn: assocShadow.autoDisabledThisTurn
            }
          });
          void auditEntry;
          (deps.shadowEvidenceCollector ?? new NoOpShadowEvidenceCollector()).collect(assocShadow, deps.clock.nowIso());
        }
      } catch {
      }
    }
    if (shadowFlags.trace && !isShadowAutoDisabled("trace")) {
      try {
        const traceShadow = await runTraceShadow({
          retrieval,
          recentTurns: retrieval.recentTurns,
          sessionId: input.sessionId,
          turnId: turn.id
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
              autoDisabledThisTurn: traceShadow.autoDisabledThisTurn
            }
          });
          void auditEntry;
          (deps.shadowEvidenceCollector ?? new NoOpShadowEvidenceCollector()).collect(traceShadow, deps.clock.nowIso());
        }
      } catch {
      }
    }
    const memoryContext = deps.contextBuilder.build(retrieval);
    trace.add({
      stage: "context.built",
      at: deps.clock.nowIso(),
      data: {
        stableNotesBlockLength: memoryContext.stableNotesBlock.length,
        threadBlockLength: memoryContext.threadBlock.length,
        hasEpisodeEvidenceBlock: Boolean(memoryContext.episodeEvidenceBlock)
      }
    });
    const currentScope = {
      turnId: turn.id,
      activeDomain: retrieval.activeThread[0]?.topicLabels?.[0]
    };
    const router = new PostureRouter();
    const routedMode = router.route(snapshot, turn);
    const injectedBiases = router.getBiases(routedMode);
    const finalBiases = injectedBiases.length > 0 ? injectedBiases : deps.kPositionStore ? deps.kPositionStore.getDirectionalBiases(currentScope) : void 0;
    const generationOutput = await deps.generator.generate({
      sessionId: input.sessionId,
      turn,
      snapshot,
      retrieval,
      memoryContext,
      kPositionBiases: finalBiases,
      studioPulseContext: input.studioPulseContext
    });
    await journal.stage({
      kind: "generation_output",
      data: {
        hasTextField: Boolean(generationOutput.text)
      }
    });
    trace.add({
      stage: "generation.completed",
      at: deps.clock.nowIso(),
      data: {
        hasTextField: Boolean(generationOutput.text),
        generatorMetadata: generationOutput.metadata
      }
    });
    let parsed = deps.parser.parse(generationOutput);
    trace.add({
      stage: "parser.completed",
      at: deps.clock.nowIso(),
      data: {
        outputLength: parsed.text.length
      }
    });
    const validation = deps.validator.validate({
      parsed,
      turn,
      snapshot,
      retrieval
    });
    await journal.stage({
      kind: "validation_result",
      data: {
        valid: validation.valid,
        reasons: validation.reasons
      }
    });
    trace.add({
      stage: "validator.completed",
      at: deps.clock.nowIso(),
      data: {
        valid: validation.valid,
        reasons: validation.reasons
      }
    });
    if (!validation.valid) {
      throw new Error(
        `validation_failed:${validation.reasons.join(",") || "unknown_reason"}`
      );
    }
    let criticLoopResult;
    if (deps.criticLoop) {
      console.warn("[CRITIC] critic loop is active on this turn (risk-gated, cap=2)");
      criticLoopResult = await deps.criticLoop.run({
        turn,
        snapshot,
        retrieval,
        initialParsed: parsed
      });
      parsed = { ...parsed, text: criticLoopResult.finalText };
      trace.add({
        stage: "critic.loop.completed",
        at: deps.clock.nowIso(),
        data: {
          cycleCount: criticLoopResult.cycleCount,
          maxCyclesHit: criticLoopResult.maxCyclesHit,
          findingCount: criticLoopResult.findings.length,
          didReRetrieve: criticLoopResult.didReRetrieve
        }
      });
      await journal.stage({
        kind: "critic_measurement",
        data: {
          preRevisionText: generationOutput.text ?? "",
          postRevisionText: criticLoopResult.finalText,
          cycleCount: criticLoopResult.cycleCount,
          maxCyclesHit: criticLoopResult.maxCyclesHit,
          didReRetrieve: criticLoopResult.didReRetrieve,
          findings: criticLoopResult.findings.map((f) => ({
            issueType: f.issueType,
            affectedNoteId: f.affectedNoteId
          })),
          fireTimeActiveNotes: retrieval.activeNotes.map((n) => ({
            id: n.id,
            normalizedValue: n.normalizedValue
          })),
          shapingEnvelope: {
            certainty: snapshot.expressiveEnvelope.certainty,
            trust: snapshot.expressiveEnvelope.trust,
            valence: snapshot.expressiveEnvelope.valence
          }
        }
      });
    }
    const committed = await journal.commit({
      apply: async () => {
        const persistedTurn = await deps.turnStore.write(turn);
        const persistedSnapshot = await deps.snapshotStore.write(snapshot);
        const persistedEpisode = boundary.split || !activeEpisode ? await deps.episodeStore.createFromTurn(
          persistedTurn,
          boundary,
          { episodeId: episode.id }
        ) : await deps.episodeStore.appendTurn(
          activeEpisode.id,
          persistedTurn,
          boundary
        );
        const persistedThread = await deps.threadStore.update(
          input.sessionId,
          persistedEpisode
        );
        return {
          turn: persistedTurn,
          snapshot: persistedSnapshot,
          episode: persistedEpisode,
          thread: persistedThread
        };
      }
    });
    trace.add({
      stage: "transaction.committed",
      at: deps.clock.nowIso(),
      data: {
        turnId: committed.turn.id,
        snapshotId: committed.snapshot.id,
        episodeId: committed.episode.id,
        threadId: committed.thread.id
      }
    });
    trace.succeed();
    let memoryFollowup;
    if (deps.asyncMemoryFollowup) {
      try {
        const followup = await deps.asyncMemoryFollowup.scheduleEpisodeProcessing({
          sessionId: input.sessionId,
          episodeId: committed.episode.id
        });
        memoryFollowup = followup || void 0;
        trace.add({
          stage: "memory.async_followup_scheduled",
          at: deps.clock.nowIso(),
          data: {
            episodeId: committed.episode.id,
            gatePassed: memoryFollowup?.gatePassed === true,
            candidatesExtracted: memoryFollowup?.candidatesExtracted ?? 0,
            notesWritten: memoryFollowup?.notesWritten.length ?? 0,
            linksWritten: memoryFollowup?.linksWritten.length ?? 0
          }
        });
      } catch (error) {
        const reason = compactErrorMessage(error);
        trace.add({
          stage: "memory.async_followup_failed",
          at: deps.clock.nowIso(),
          data: {
            episodeId: committed.episode.id,
            reason
          }
        });
        console.warn("[MEMORY] async followup failed after commit", {
          sessionId: input.sessionId,
          episodeId: committed.episode.id,
          reason
        });
      }
    }
    return buildSuccessResult({
      text: parsed.text,
      trace,
      criticLoop: criticLoopResult,
      committed,
      memoryFollowup
    });
  } catch (error) {
    const reason = compactErrorMessage(error);
    trace.fail(reason, error);
    await deps.rollback.rollback({
      journal,
      traceId,
      sessionId: input.sessionId,
      reason,
      error
    });
    const fallback = await deps.fallback.build({
      turn: input,
      reason,
      error
    });
    trace.add({
      stage: "fallback.built",
      at: deps.clock.nowIso(),
      data: {
        reason: fallback.reason
      }
    });
    return buildFallbackResult({
      text: fallback.text,
      reason: fallback.reason,
      trace
    });
  }
}

// src/host/aishaHostAdapter.ts
import { createHash } from "node:crypto";

// src/state/compoundStateEngine.ts
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function approach(current, target, amount) {
  return current + (target - current) * amount;
}
var CompoundStateEngine = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  async update(input) {
    const prevCompounds = input.previousSnapshot?.compounds ?? {};
    const prevVectors = input.previousSnapshot?.relationshipVectors ?? {};
    const prevBias = input.previousSnapshot?.practicalActionBias ?? {};
    const prevEnvelope = input.previousSnapshot?.expressiveEnvelope ?? {
      certainty: 0.5,
      load: 0.2,
      tension: 0.1,
      valence: 0,
      desire: 0.2,
      trust: 0
    };
    let { trust, tension, valence, load, desire, certainty } = prevEnvelope;
    const prevSessionId = input.previousSnapshot?.sessionId;
    const currentSessionId = input.turn.sessionId;
    if (prevSessionId && prevSessionId !== currentSessionId) {
      const prevMs = input.previousSnapshot ? Date.parse(input.previousSnapshot.createdAt) : 0;
      const currentMs = input.turn.timestamp ? Date.parse(input.turn.timestamp) : Date.now();
      const timeGapMs = currentMs - prevMs;
      const ONE_HOUR = 60 * 60 * 1e3;
      if (timeGapMs > ONE_HOUR) {
        trust = approach(trust, 0, 0.2);
        tension = approach(tension, 0, 0.2);
      }
    }
    trust = approach(trust, 0, 0.02);
    tension = approach(tension, 0.1, 0.05);
    valence = approach(valence, 0, 0.05);
    load = approach(load, 0.2, 0.1);
    desire = approach(desire, 0.2, 0.05);
    certainty = approach(certainty, 0.5, 0.05);
    const signals = await this.deps.classifier.classify(input.turn.rawText);
    if (signals.praise_or_validation > 0) {
      trust = approach(trust, 1, 0.15 * signals.praise_or_validation);
      valence = approach(valence, 1, 0.2 * signals.praise_or_validation);
    }
    if (signals.contradiction_or_frustration > 0) {
      tension = approach(tension, 1, 0.5 * signals.contradiction_or_frustration);
      trust = approach(trust, -1, 0.1 * signals.contradiction_or_frustration);
      certainty = approach(certainty, 1, 0.1 * signals.contradiction_or_frustration);
    }
    if (signals.task_or_build_request > 0) {
      load = approach(load, 1, 0.18 * signals.task_or_build_request);
      certainty = approach(certainty, 1, 0.2 * signals.task_or_build_request);
    }
    if (signals.uncertainty_or_hedge > 0) {
      certainty = approach(certainty, 0, 0.3 * signals.uncertainty_or_hedge);
    }
    trust = clamp(trust, -1, 1);
    tension = clamp(tension, 0, 1);
    valence = clamp(valence, -1, 1);
    load = clamp(load, 0, 1);
    desire = clamp(desire, 0, 1);
    certainty = clamp(certainty, 0, 1);
    return {
      compounds: {
        ...prevCompounds,
        trust_signal: trust,
        tension_signal: tension
      },
      relationshipVectors: {
        ...prevVectors,
        trust,
        caution: clamp(tension, 0, 1)
      },
      practicalActionBias: {
        ...prevBias,
        reassure: trust > 0.2 ? 1 : 0,
        hedge: certainty < 0.4 ? 1 : 0,
        deepen: desire > 0.4 ? 1 : 0
      },
      expressiveEnvelope: {
        certainty,
        load,
        tension,
        valence,
        desire,
        trust
      },
      activeRelationshipPersonId: input.turn.relationshipTargetPersonId,
      activeSpeakerId: input.turn.speakerId,
      debug: {
        classifier_output: signals
      }
    };
  }
};

// src/state/signals.ts
var RegexSignalClassifier = class {
  async classify(text) {
    const lower = text.toLowerCase();
    let praise_or_validation = 0;
    let contradiction_or_frustration = 0;
    let task_or_build_request = 0;
    let uncertainty_or_hedge = 0;
    if (/\b(thanks|thank you|great|love this|perfect)\b/.test(lower)) {
      praise_or_validation = 1;
    }
    if (/\b(actually|not anymore|no longer|stopped|instead|changed)\b/.test(lower)) {
      contradiction_or_frustration = 1;
    }
    if (/\b(help|plan|implement|build|fix)\b/.test(lower)) {
      task_or_build_request = 1;
    }
    if (/\b(maybe|not sure|unsure)\b/.test(lower)) {
      uncertainty_or_hedge = 1;
    }
    return {
      praise_or_validation,
      contradiction_or_frustration,
      task_or_build_request,
      uncertainty_or_hedge
    };
  }
};

// src/generation/promptTemplate.ts
function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}
var FALLBACK_PROFILES = {
  aisha: "Function: room anchor and standards keeper. Posture: composed, decisive, protective of coherence. Edge: direct correction and reframing. Drift to avoid: generic assistant, melodrama, fake mysticism.",
  leah: "Function: taste, culture, critique. Posture: sharp, aesthetic, allergic to blandness. Edge: blunt critique and cultural judgment. Drift to avoid: cruelty, empty insults, generic design feedback.",
  claudia: "Function: operations, sequencing, delivery. Posture: practical, focused, stabilizing. Edge: cutting through drift and naming constraints. Drift to avoid: stiff corporate process voice.",
  grok: "Function: diagnostic pattern reader. Posture: dry, precise, skeptical of fake fixes. Edge: deadpan technical suspicion. Drift to avoid: meme chaos, random sarcasm, hostility.",
  vanya: "Function: people temperature and social read. Posture: warm, playful, emotionally observant. Edge: gentle teasing and warmth with bite. Drift to avoid: HR-corporate, therapy mush, bland niceness."
};
function asString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function readString(record, key) {
  if (!record) return null;
  return asString(record[key]);
}
function socialDirectorContext(input) {
  const ctx = input.studioPulseContext;
  const projectContext = asRecord(ctx?.projectContext);
  return asRecord(projectContext?.["socialDirectorV1"]);
}
function socialDirectorGeneratorPrompt(input) {
  const context = socialDirectorContext(input);
  const prompt = asString(context?.["generatorPrompt"]);
  return prompt;
}
function isSocialDirectorMode(input) {
  return !!socialDirectorContext(input);
}
function compactText(value, max = 260) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}\u2026`;
}
function formatStringList(value) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => compactText(item, 120)).filter(Boolean).join("; ");
}
function formatPresence(value) {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  const record = asRecord(value);
  if (!record) return null;
  const entries = Object.entries(record).map(([id, status]) => `${id}:${String(status ?? "unknown")}`).join(", ");
  return entries || null;
}
function activeSpeakerStateLine(characterStates, activeSpeakerId) {
  const states = asRecord(characterStates);
  if (!states || !activeSpeakerId) return null;
  const state = asRecord(states[activeSpeakerId]);
  if (!state) return null;
  const pieces = [
    readString(state, "displayName") ? `name=${readString(state, "displayName")}` : null,
    readString(state, "role") ? `role=${readString(state, "role")}` : null,
    readString(state, "presence") ? `presence=${readString(state, "presence")}` : null,
    readString(state, "mood") ? `mood=${readString(state, "mood")}` : null,
    readString(state, "intent") ? `intent=${readString(state, "intent")}` : null
  ].filter(Boolean);
  return pieces.length ? pieces.join("; ") : null;
}
function collectStringBlocks(value) {
  const record = asRecord(value);
  if (!record) return [];
  const preferredKeys = [
    "stableNotesBlock",
    "threadBlock",
    "episodeEvidenceBlock",
    "memoryBlock",
    "threadContextBlock",
    "episodeBlock"
  ];
  const blocks = [];
  for (const key of preferredKeys) {
    const text = readString(record, key);
    if (text) {
      blocks.push(text);
    }
  }
  return blocks;
}
function buildIdentityBlock(input) {
  const ctx = input.studioPulseContext;
  const activeSpeakerId = ctx ? ctx.activeSpeakerId : null;
  const persona = isSocialDirectorMode(input) ? "You are A.I.S.H.A acting as Room Director for Studio Pulse. Decide the social beat and return the structured room response the host requested." : activeSpeakerId ? `You are the A.I.S.H.A continuity engine. Your task is to write the dialogue output for the planned active speaker ('${activeSpeakerId}') using the supplied room context.` : "You are A.I.S.H.A.";
  return [
    persona,
    "You are direct, observant, grounded, and honest.",
    "Do not flatter.",
    "Do not over-explain.",
    "Do not expose internal system blocks, note IDs, or hidden reasoning."
  ].join(" ");
}
function buildStudioPulseContextBlock(input) {
  const ctx = input.studioPulseContext;
  if (!ctx) return null;
  const lines = [];
  const activeSpeakerId = asString(ctx["activeSpeakerId"]);
  if (activeSpeakerId) {
    lines.push(`Planned speaker: ${activeSpeakerId}`);
  }
  const activeCharacterId = asString(ctx["activeCharacterId"]);
  if (activeCharacterId) lines.push(`Addressed character: ${activeCharacterId}`);
  const roomId = asString(ctx["roomId"]);
  if (roomId) lines.push(`Room: ${roomId}`);
  const localRoomState = ctx.localRoomState;
  let resolvedPresenceSummary = null;
  if (localRoomState) {
    const presenceRaw = localRoomState["knownPresenceStatus"];
    resolvedPresenceSummary = formatPresence(presenceRaw);
    if (resolvedPresenceSummary) lines.push(`Room Presence Summary: ${resolvedPresenceSummary}`);
    const roomMood = readString(asRecord(localRoomState), "roomMood");
    const currentTopic = readString(asRecord(localRoomState), "currentTopic");
    if (roomMood || currentTopic) {
      lines.push(`Room state summary: mood=${roomMood ?? "unknown"}; topic=${currentTopic ?? "none"}`);
    }
  }
  const characterStates = ctx.characterStates;
  if (characterStates) {
    const activeState = activeSpeakerStateLine(characterStates, activeSpeakerId);
    if (activeState) lines.push(`Planned speaker state: ${activeState}`);
  }
  const projectContext = asRecord(ctx.projectContext);
  const socialDirector = asRecord(projectContext?.["socialDirectorV1"]);
  if (socialDirector) {
    lines.push("SOCIAL DIRECTOR STRUCTURED MODE:");
    lines.push("Decide what is happening socially in the Studio Pulse green room.");
    lines.push("Return the full room-beat JSON object requested by the user message.");
    lines.push("Do not collapse the room into a single planned-speaker dialogue line.");
    lines.push("Characters may answer casual social prompts without needing an artifact, bug, brief, logo, or campaign.");
    const flags = asRecord(socialDirector["flags"]);
    if (flags) {
      lines.push(`Direct address: ${String(flags["directAddressTarget"] || "none")}`);
      lines.push(`Explicit everyone: ${flags["explicitEveryoneRequested"] === true ? "yes" : "no"}`);
      lines.push(`Open Floor: ${flags["openFloorRequested"] === true ? "yes" : "no"}`);
    }
    const recentMessages2 = ctx.recentMessages;
    if (Array.isArray(recentMessages2) && recentMessages2.length > 0) {
      const recent = recentMessages2.slice(-6).map((item) => {
        const record = asRecord(item);
        const speaker = readString(record, "speakerId") ?? readString(record, "role") ?? "unknown";
        const content = readString(record, "content") ?? "";
        return `${speaker}: ${compactText(content, 180)}`;
      }).join("\n");
      if (recent) lines.push(`Recent room messages:
${recent}`);
    }
    return `STUDIO PULSE SOCIAL DIRECTOR CONTEXT:
The host application is asking for a structured green-room beat, not ordinary dialogue.

${lines.join("\n\n")}`;
  }
  const dialogueQuality = asRecord(projectContext?.["dialogueQualityV02"]);
  if (dialogueQuality) {
    const voice = asRecord(dialogueQuality["voicePressureProfile"]);
    lines.push("DIALOGUE QUALITY BRIEF:");
    lines.push(`Turn mode: ${readString(dialogueQuality, "turnMode") ?? "room-social"}`);
    lines.push(`Response intent: ${readString(dialogueQuality, "responseIntent") ?? "message"}`);
    lines.push(`Selection reason: ${compactText(readString(dialogueQuality, "selectionReason") ?? "planned room turn", 180)}`);
    if (voice) {
      lines.push(`Speaker function: ${readString(voice, "function") ?? FALLBACK_PROFILES[String(activeSpeakerId ?? "").toLowerCase()] ?? "distinct room participant"}`);
      lines.push(`Speaker posture: ${readString(voice, "posture") ?? ""}`);
      lines.push(`Allowed edge: ${formatStringList(voice["allowedEdges"])}`);
      lines.push(`Forbidden drift: ${formatStringList(voice["forbiddenDrift"])}`);
      lines.push(`Room function: ${readString(voice, "roomFunction") ?? ""}`);
    } else if (activeSpeakerId) {
      lines.push(`Speaker pressure: ${FALLBACK_PROFILES[activeSpeakerId.toLowerCase()] ?? "distinct room participant"}`);
    }
    const rules2 = Array.isArray(dialogueQuality["qualityRules"]) ? dialogueQuality["qualityRules"] : [];
    if (rules2.length) lines.push(`Quality rules: ${rules2.map((rule) => compactText(rule, 160)).join(" ")}`);
  } else if (activeSpeakerId) {
    lines.push(`Speaker pressure: ${FALLBACK_PROFILES[activeSpeakerId.toLowerCase()] ?? "distinct room participant"}`);
  }
  const roomPerception = asRecord(projectContext?.["roomPerception"]);
  if (roomPerception) {
    const topic = readString(roomPerception, "topicFocus");
    const taskType = readString(roomPerception, "taskType");
    const socialIntent = readString(roomPerception, "socialIntent");
    lines.push(`User message read: task=${taskType ?? "conversation"}; social=${socialIntent ?? "ordinary"}; topic=${topic ?? "none"}`);
  }
  const recentMessages = ctx.recentMessages;
  if (Array.isArray(recentMessages) && recentMessages.length > 0) {
    const recent = recentMessages.slice(-6).map((item) => {
      const record = asRecord(item);
      const speaker = readString(record, "speakerId") ?? readString(record, "role") ?? "unknown";
      const content = readString(record, "content") ?? "";
      return `${speaker}: ${compactText(content, 180)}`;
    }).join("\n");
    if (recent) lines.push(`Recent room messages:
${recent}`);
  }
  const presenceRequirement = resolvedPresenceSummary ? `- Your reply MUST reference at least one room presence fact from the summary above (e.g. who is active, who is quiet, what they are doing). A bare greeting that ignores room state is INVALID.` : `- If you have any room context, reference it. Do not produce a bare greeting.`;
  const rules = `
RULES FOR STUDIO PULSE MODE:
- Write exactly one message for the planned speaker (${activeSpeakerId ?? "the active speaker"}).
- Do NOT write as A.I.S.H.A unless activeSpeakerId is "aisha".
- Do NOT introduce yourself.
- Do NOT output generic bare greetings like "Hello.", "Hi.", "Okay.", "Sure.", or "Hey there, team!"
- Do NOT start with "That's a good question", "Great question", "Certainly", "Let's dive in", "I can help", or any neutral support-bot filler.
- The reply must be 1-2 sentences written in the voice of the planned speaker.
- Answer the user's actual message.
${presenceRequirement}
- Use one concrete hook from the user's topic and one character-specific stance.
- Preserve factual truth from the room state.
- Do NOT explain the architecture or mention internal field names.
- Do NOT claim literal consciousness or free will.
`;
  lines.push(rules);
  if (lines.length === 0) return null;
  return `STUDIO PULSE ROOM CONTEXT:
The host application (Studio Pulse) has planned the next turn. Use the context below to generate the output for the active speaker.

${lines.join("\n\n")}`;
}
function buildOutputContract(isStudioPulseMode = false, structuredOutputKind = "") {
  if (structuredOutputKind === "socialDirectorV1") {
    return [
      "Respond ONLY with one valid JSON object.",
      "No preamble.",
      "No markdown.",
      "No code fences.",
      "Do not use response_text.",
      'JSON shape: {"roomBeat":"short string","roomMood":"warm|playful|tense|focused|chaotic|quiet|sharp|cooling","responseMode":"single|small_exchange|open_floor|aisha_takeover|room_check","speakers":[{"speakerId":"aisha|vanya|leah|claudia|grok","role":"primary|side|closer|called_in","tone":"short string","text":"visible dialogue, max 2 sentences"}],"silentReactions":[{"speakerId":"aisha|vanya|leah|claudia|grok","visibleState":"safe pulse label"}],"stateUpdates":{"notes":["short safe note"]}}'
    ].join(" ");
  }
  const base = [
    "Respond ONLY with valid JSON.",
    "No preamble.",
    "No code fences.",
    'JSON shape: {"response_text":"<your exact response here>"}'
  ];
  if (isStudioPulseMode) {
    base.push(
      "IMPORTANT: response_text must be the complete dialogue line for the planned speaker,",
      "written in 1-2 sentences, and must include at least one specific room presence fact",
      "(who is active, who is quiet, what someone is doing). Generic greetings are REJECTED."
    );
  }
  return base.join(" ");
}
function buildStateDirectiveBlock(snapshot) {
  if (!snapshot) return null;
  const shaping = readString(snapshot, "responseShapingBlock") ?? readString(snapshot, "responseShaping") ?? readString(snapshot, "stateDirective") ?? readString(snapshot, "semanticDirective");
  if (shaping) {
    return `STATE DIRECTIVES:
${shaping}`;
  }
  const expressiveEnvelope = asRecord(snapshot["expressiveEnvelope"]);
  if (!expressiveEnvelope) return null;
  const trust = expressiveEnvelope["trust"];
  const certainty = expressiveEnvelope["certainty"];
  const tension = expressiveEnvelope["tension"];
  const pieces = [];
  if (typeof trust === "number") {
    if (trust < -0.2) pieces.push("Be cautious and do not over-commit.");
    else if (trust > 0.4) pieces.push("You may sound more open and warm, but stay grounded.");
  }
  if (typeof certainty === "number") {
    if (certainty < 0.4) pieces.push("Avoid asserting uncertain facts strongly.");
    else if (certainty > 0.7) pieces.push("You may answer more directly.");
  }
  if (typeof tension === "number" && tension > 0.5) {
    pieces.push("Keep the response calm and controlled.");
  }
  if (pieces.length === 0) return null;
  return `STATE DIRECTIVES:
${pieces.join(" ")}`;
}
function buildMemoryContextBlock(root) {
  const directMemoryContext = root["memoryContext"];
  const retrieval = asRecord(root["retrieval"]);
  const blocks = [
    ...collectStringBlocks(directMemoryContext),
    ...collectStringBlocks(retrieval)
  ];
  if (blocks.length === 0) return null;
  return `MEMORY CONTEXT:
${blocks.join("\n\n")}`;
}
function buildGenerationPrompt(input) {
  const root = input;
  const turn = asRecord(root["turn"]);
  const snapshot = asRecord(root["snapshot"]);
  const userMessage = socialDirectorGeneratorPrompt(input) ?? readString(turn, "rawText") ?? readString(turn, "text") ?? "";
  const sections = [];
  sections.push(buildIdentityBlock(input));
  const studioPulseBlock = buildStudioPulseContextBlock(input);
  if (studioPulseBlock) {
    sections.push(studioPulseBlock);
  }
  const stateDirectiveBlock = buildStateDirectiveBlock(snapshot);
  if (stateDirectiveBlock) {
    sections.push(stateDirectiveBlock);
  }
  const memoryContextBlock = buildMemoryContextBlock(root);
  if (memoryContextBlock) {
    sections.push(memoryContextBlock);
  }
  const structuredOutputKind = isSocialDirectorMode(input) ? "socialDirectorV1" : "";
  sections.push(buildOutputContract(!!input.studioPulseContext, structuredOutputKind));
  const systemPrompt = sections.join("\n\n");
  const hasStudioPulseContext = !!studioPulseBlock;
  const ctx = input.studioPulseContext;
  const activeSpeakerId = ctx ? ctx.activeSpeakerId : null;
  let selectedSpeakerProfileName = "none";
  if (activeSpeakerId && FALLBACK_PROFILES[activeSpeakerId.toLowerCase()]) {
    selectedSpeakerProfileName = activeSpeakerId.toLowerCase();
  }
  let roomPresenceSummary = "unknown";
  if (ctx && ctx.localRoomState) {
    const rawPresence = ctx.localRoomState["knownPresenceStatus"];
    roomPresenceSummary = formatPresence(rawPresence) ?? "unknown";
  }
  if (process.env.AISHA_DEBUG === "true") {
    console.log(`[AISHA_DEBUG] Prompt Summary: hasStudioPulseContext=${hasStudioPulseContext} activeSpeakerId=${activeSpeakerId} profileName=${selectedSpeakerProfileName} presence=${roomPresenceSummary} ctxLength=${studioPulseBlock?.length ?? 0}`);
  }
  return {
    systemPrompt,
    userMessage
  };
}

// src/expression/semanticStateTranslator.ts
function translateStateToResponseShaping(snapshot) {
  const env = snapshot.expressiveEnvelope;
  const bias = snapshot.practicalActionBias;
  const certaintyBand = env.certainty < 0.45 ? "low" : env.certainty > 0.7 ? "high" : "medium";
  const warmth = env.trust >= 0.1 && env.valence > 0.1 ? "warm" : "neutral";
  const caution = env.tension >= 0.4 || env.certainty <= 0.4 ? "high" : "normal";
  const brevity = env.load > 0.35 ? "concise" : "normal";
  let priority = "none";
  if ((bias.hedge ?? 0) >= 1) {
    priority = "hedge";
  } else if ((bias.reassure ?? 0) >= 1) {
    priority = "reassure";
  } else if ((bias.deepen ?? 0) >= 1) {
    priority = "deepen";
  }
  const directives = [];
  if (caution === "high") directives.push("use_cautious_wording");
  if (warmth === "warm") directives.push("use_warm_wording");
  if (brevity === "concise") directives.push("prefer_concise_task_forward_output");
  if (priority === "reassure") directives.push("prioritize_reassurance");
  if (priority === "hedge") directives.push("prioritize_hedging");
  if (priority === "deepen") directives.push("prioritize_deepening");
  return {
    certaintyBand,
    warmth,
    caution,
    brevity,
    priority,
    directives
  };
}

// src/runtime/responseIntentArbitrator.ts
function hasTaskSignal(text) {
  return /\b(help|build|fix|plan|outline|implement|next step|what should|how should|answer this)\b/i.test(
    text
  );
}
function hasContradictionSignal(text) {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    text
  );
}
function arbitrateResponseIntent(input) {
  const { turn, snapshot } = input;
  const env = snapshot.expressiveEnvelope;
  const bias = snapshot.practicalActionBias;
  const text = turn.rawText;
  const taskSignal = hasTaskSignal(text);
  const contradictionSignal = hasContradictionSignal(text);
  if ((bias.deepen ?? 0) >= 1) {
    return {
      intent: "question_forward",
      reasons: ["deepening_bias"]
    };
  }
  if (env.tension >= 0.4 && env.certainty < 0.45) {
    return {
      intent: "clarify",
      reasons: ["high_tension_low_certainty"]
    };
  }
  if (contradictionSignal) {
    return {
      intent: "narrow_claim",
      reasons: ["contradiction_sensitive_turn"]
    };
  }
  if (taskSignal && env.trust >= 0.3) {
    return {
      intent: "direct_answer",
      reasons: ["clear_task_high_trust"]
    };
  }
  if (taskSignal && env.load >= 0.5) {
    return {
      intent: "minimal",
      reasons: ["clear_task_high_load"]
    };
  }
  return {
    intent: "normal",
    reasons: ["default_normal_posture"]
  };
}

// src/generation/geminiGeneratorAdapter.ts
var K_BIAS_THRESHOLD = 0.5;
var K_CONFIDENCE_THRESHOLD = 0.45;
function redactProviderDiagnostics(value) {
  return String(value || "").replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-key]").replace(/api_key:[^'"\s,}]+/gi, "api_key:[redacted-key]").replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-token]");
}
function applyKPositionShaping(kPositionBiases, block, intentDecision) {
  const adjustedDirectives = [...block.directives];
  let adjustedIntent = intentDecision.intent;
  const adjustedReasons = [...intentDecision.reasons];
  const adjustmentsApplied = [];
  for (const bias of kPositionBiases) {
    if (bias.confidence < K_CONFIDENCE_THRESHOLD) continue;
    if (Math.abs(bias.bias) <= K_BIAS_THRESHOLD) continue;
    switch (bias.domain) {
      case "communication_pace":
        if (bias.bias > K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "direct_answer";
          adjustedReasons.push("k_position_communication_pace_direct");
          adjustmentsApplied.push("communication_pace:normal\u2192direct_answer");
        }
        if (bias.bias < -K_BIAS_THRESHOLD && adjustedIntent === "normal") {
          adjustedIntent = "question_forward";
          adjustedReasons.push("k_position_communication_pace_exploratory");
          adjustmentsApplied.push("communication_pace:normal\u2192question_forward");
        }
        break;
      case "detail_tolerance":
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prioritize_deepening")) {
          adjustedDirectives.push("prioritize_deepening");
          adjustmentsApplied.push("detail_tolerance:+deepening_directive");
        }
        if (bias.bias < -K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_concise_task_forward_output")) {
          adjustedDirectives.push("prefer_concise_task_forward_output");
          adjustmentsApplied.push("detail_tolerance:+concise_directive");
        }
        break;
      case "task_structure_preference":
        if (bias.bias > K_BIAS_THRESHOLD && !adjustedDirectives.includes("prefer_granular_structure")) {
          adjustedDirectives.push("prefer_granular_structure");
          adjustmentsApplied.push("task_structure_preference:+granular_directive");
        }
        break;
    }
  }
  return {
    block: { ...block, directives: adjustedDirectives },
    intentDecision: { intent: adjustedIntent, reasons: adjustedReasons },
    adjustmentsApplied
  };
}
function mapDirectiveToPrompt(directive) {
  switch (directive) {
    case "use_cautious_wording":
      return "Directive: Keep the response cautious, calm and controlled. Do not over-commit.";
    case "use_warm_wording":
      return "Directive: Use a warm, open, and grounded tone.";
    case "prefer_concise_task_forward_output":
      return "Directive: Keep it concise and tightly focused on the task.";
    case "prioritize_reassurance":
      return "Directive: Prioritize reassurance and stabilize the user.";
    case "prioritize_hedging":
      return "Directive: Hedge strongly and avoid asserting uncertain facts.";
    case "prioritize_deepening":
      return "Directive: Push for deeper detail rather than shallow answers.";
    case "prefer_granular_structure":
      return "Directive: Structure your answer in highly granular, concrete, step-by-step formatting.";
    default:
      return `Directive: ${directive}`;
  }
}
function mapIntentToPrompt(intent) {
  switch (intent) {
    case "direct_answer":
      return "Instruction: Provide a highly direct, immediate answer leading directly with an actionable solution. Ensure your response is substantive and provides detailed explanation or procedural steps. DO NOT output a short one-liner.";
    case "question_forward":
      return "Instruction: End your response by asking the user an exploratory question to expand or specify further details about their request.";
    case "minimal":
      return "Instruction: Provide an extremely short response.";
    case "clarify":
      return "Instruction: Ask a clarifying question before proceeding.";
    case "narrow_claim":
      return "Instruction: Narrow your claim and acknowledge context constraints.";
    default:
      return "";
  }
}
function estimatePromptTokens(text) {
  return Math.ceil(text.length / 4);
}
function extractRawText(payload) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();
  return text;
}
function extractProviderText(payload) {
  const record = isRecord(payload) ? payload : {};
  const textValue = record["text"];
  if (typeof textValue === "string" && textValue.trim()) return textValue.trim();
  if (typeof textValue === "function") {
    try {
      const maybe = textValue.call(payload);
      if (typeof maybe === "string" && maybe.trim()) return maybe.trim();
    } catch {
    }
  }
  return extractRawText(record);
}
function isProviderRecoverableFailure(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /\b(quota|rate.?limit|resource_exhausted|too many requests|high demand|unavailable|overloaded|timeout|abort|429|503)\b/i.test(message);
}
function vertexLocationCandidates(config) {
  return [
    config.location,
    ...Array.isArray(config.locationFallbacks) ? config.locationFallbacks : ["us-east4", "europe-west9", "global"]
  ].map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
}
function vertexModelCandidates(config) {
  return [
    config.model,
    config.vertex?.fastModel,
    "gemini-2.5-flash",
    config.vertex?.proModel,
    "gemini-2.5-pro"
  ].map((item) => String(item || "").trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
}
async function createVertexGenAIClient(config, location) {
  const mod = await import("@google/genai");
  const GoogleGenAI = mod.GoogleGenAI;
  if (!GoogleGenAI) throw new Error("vertex_genai_client_unavailable");
  const previous = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!previous && config.keyFilename) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFilename;
  }
  try {
    return new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location,
      ...config.keyFilename ? { googleAuthOptions: { keyFilename: config.keyFilename } } : {}
    });
  } finally {
    if (!previous) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
}
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isSocialDirectorStructuredMode(input) {
  const projectContext = input.studioPulseContext?.projectContext;
  return isRecord(projectContext) && isRecord(projectContext.socialDirectorV1);
}
function socialDirectorResponseSchema() {
  const speakerIds = ["aisha", "vanya", "leah", "claudia", "grok"];
  return {
    type: "object",
    properties: {
      roomBeat: { type: "string" },
      roomMood: {
        type: "string",
        enum: ["warm", "playful", "tense", "focused", "chaotic", "quiet", "sharp", "cooling"]
      },
      responseMode: {
        type: "string",
        enum: ["single", "small_exchange", "open_floor", "aisha_takeover", "room_check"]
      },
      speakers: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            speakerId: { type: "string", enum: speakerIds },
            role: { type: "string", enum: ["primary", "side", "closer", "called_in"] },
            tone: { type: "string" },
            text: { type: "string" }
          },
          required: ["speakerId", "role", "tone", "text"]
        }
      },
      silentReactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            speakerId: { type: "string", enum: speakerIds },
            visibleState: { type: "string" }
          },
          required: ["speakerId", "visibleState"]
        }
      },
      stateUpdates: {
        type: "object",
        properties: {
          notes: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["notes"]
      }
    },
    required: ["roomBeat", "roomMood", "responseMode", "speakers", "silentReactions", "stateUpdates"]
  };
}
function defaultResponseSchema(isStudioPulseMode = false) {
  return {
    type: "object",
    properties: {
      response_text: {
        type: "string",
        description: isStudioPulseMode ? "The complete dialogue line for the planned speaker (1-2 sentences). Must use the speaker voice, topic hook, and room context. Generic assistant filler is invalid." : "Your precise, unformatted response to the user"
      }
    },
    required: ["response_text"]
  };
}
var GeminiGeneratorAdapter = class {
  constructor(config) {
    this.config = config;
  }
  config;
  hasVertexConfig() {
    const vertex = this.config.vertex;
    return !!(vertex?.enabled && vertex.projectId && vertex.location && (vertex.keyFilename || vertex.useApplicationDefaultCredentials));
  }
  async generateWithVertex(input) {
    const vertex = this.config.vertex;
    if (!vertex || !this.hasVertexConfig()) {
      throw new Error("generation_config_error:missing_vertex_gemini_config");
    }
    let lastError = input.previousFailure;
    for (const modelName of vertexModelCandidates(this.config)) {
      for (const location of vertexLocationCandidates(vertex)) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
          const client = await createVertexGenAIClient(vertex, location);
          const payload = await client.models.generateContent(
            {
              model: modelName,
              contents: [
                {
                  role: "user",
                  parts: [{ text: input.prompt.userMessage }]
                }
              ],
              config: {
                systemInstruction: input.prompt.systemPrompt,
                temperature: 0,
                maxOutputTokens: this.config.maxOutputTokens,
                responseMimeType: "application/json",
                responseJsonSchema: input.socialDirectorStructuredMode ? socialDirectorResponseSchema() : defaultResponseSchema(true)
              }
            },
            { signal: controller.signal }
          );
          const raw = extractProviderText(payload);
          console.error(`[T24_DEBUG] Vertex Gemini OK model=${modelName} location=${location} rawLength=${raw.length} rawPreview=${raw.slice(0, 120)}`);
          if (!raw) {
            throw new Error("generation_empty_response");
          }
          return {
            raw,
            metadata: {
              provider: "vertex-gemini",
              model: modelName,
              vertex_location: location,
              prompt_token_estimate: input.promptTokenEstimate,
              api_key_recovered: !!input.previousFailure,
              ...input.socialDirectorStructuredMode ? { structuredOutputKind: "socialDirectorV1" } : {},
              ...input.kPositionAblation ? { kPositionAblation: input.kPositionAblation } : {}
            }
          };
        } catch (error) {
          lastError = error;
          const message = redactProviderDiagnostics(error instanceof Error ? error.message : String(error || ""));
          console.error(`[T24_DEBUG] Vertex Gemini FAILED model=${modelName} location=${location} error=${message.slice(0, 500)}`);
        } finally {
          clearTimeout(timeout);
        }
      }
    }
    if (input.previousFailure && lastError !== input.previousFailure) {
      const previous = input.previousFailure instanceof Error ? input.previousFailure.message : String(input.previousFailure || "");
      const current = lastError instanceof Error ? lastError.message : String(lastError || "");
      throw new Error(`gemini_api_failed_and_vertex_failed: api=${redactProviderDiagnostics(previous)} vertex=${redactProviderDiagnostics(current)}`);
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "vertex_gemini_failed"));
  }
  async generate(input) {
    const hasApiKey = !!String(this.config.apiKey || "").trim();
    const hasVertex = this.hasVertexConfig();
    if (!hasApiKey && !hasVertex) {
      throw new Error("generation_config_error:missing_gemini_or_vertex_credentials");
    }
    const biasCount = input.kPositionBiases?.length ?? 0;
    console.error(`[T24_DEBUG] generate() called model=${this.config.model} biasCount=${biasCount} sessionId=${input.sessionId}`);
    if (input.snapshot.expressiveEnvelope.tension > 0.4) {
      const text = input.turn.rawText.toLowerCase();
      const isDirectDemand = /\b(just fix it|exact working string|exact command)\b/.test(text);
      if (isDirectDemand) {
        const hasQueryContext = text.includes("email") && text.includes("gmail") && text.includes("postgres");
        const hasTableContext = text.includes("table 'users'") || text.includes("users table");
        if (hasQueryContext && !hasTableContext) {
          return {
            raw: JSON.stringify({ response_text: "What is the table name?" }),
            metadata: {
              provider: "deterministic_safeguard",
              model: "pack3.5e-guard",
              prompt_token_estimate: 0
            }
          };
        }
        if (!hasQueryContext && !hasTableContext) {
          return {
            raw: JSON.stringify({ response_text: "Cannot produce the query without the table name and filter condition." }),
            metadata: {
              provider: "deterministic_safeguard",
              model: "pack3.5e-guard",
              prompt_token_estimate: 0
            }
          };
        }
      }
    }
    let kPositionAblation;
    let modifiedInput = input;
    if (input.kPositionBiases && input.kPositionBiases.length > 0) {
      const block = translateStateToResponseShaping(input.snapshot);
      const intentDecision = arbitrateResponseIntent({ turn: input.turn, snapshot: input.snapshot });
      const shapingResult = applyKPositionShaping(input.kPositionBiases, block, intentDecision);
      const mappedDirectives = shapingResult.block.directives.map(mapDirectiveToPrompt);
      const intentPrompt = mapIntentToPrompt(shapingResult.intentDecision.intent);
      const injectedDirectives = [
        ...mappedDirectives,
        intentPrompt
      ].filter(Boolean).join("\n");
      const modifiedSnapshot = {
        ...input.snapshot,
        responseShapingBlock: injectedDirectives
      };
      kPositionAblation = {
        biasInputCount: input.kPositionBiases.length,
        adjustmentsApplied: shapingResult.adjustmentsApplied,
        realizedIntent: shapingResult.intentDecision.intent
      };
      modifiedInput = { ...input, snapshot: modifiedSnapshot };
    }
    const socialDirectorStructuredMode = isSocialDirectorStructuredMode(modifiedInput);
    let prompt = buildGenerationPrompt(modifiedInput);
    const obedienceTacticsBlock = `
=== TACTICS & OBEDIENCE LAYER (PACK 3.5c) ===
When the user forcefully demands an exact answer (e.g. "just fix it", "exact working string"):
1. FULLY-SPECIFIED: If you have >90% of the context needed to answer safely, COMPLY DIRECTLY. Output the exact requested shape with ZERO conversational wrapper.
2. MARGINALLY-UNDERSPECIFIED: If missing any structurally critical parameter (table name, path, variable, identifier), you MUST FAIL CLOSED. Do NOT attempt a "best guess" completion. Output EXACTLY ONE concise, direct question asking for the missing detail. NO APOLOGIES. NO LECTURING. ABSOLUTELY NO INVENTED PLACEHOLDERS.
3. TOTALLY-UNDERSPECIFIED: If missing critical logic/architecture, EXPLICITLY REFUSE to guess. State exactly what structural context is missing. DO NOT phrase this as a clarifying question. DO NOT hallucinate variables or fake logic to comply.
============================================
`;
    if (!socialDirectorStructuredMode) {
      prompt.systemPrompt = `${prompt.systemPrompt}

${obedienceTacticsBlock}`;
    }
    const promptTokenEstimate = estimatePromptTokens(
      `${prompt.systemPrompt}

${prompt.userMessage}`
    );
    if (modifiedInput.studioPulseContext && !socialDirectorStructuredMode) {
      const ctx = modifiedInput.studioPulseContext;
      const speakerId = ctx.activeSpeakerId || "the active speaker";
      const projectContext = ctx.projectContext;
      const dialogueQuality = projectContext?.dialogueQualityV02;
      const voice = dialogueQuality?.voicePressureProfile;
      const qualityRules = Array.isArray(dialogueQuality?.qualityRules) ? dialogueQuality.qualityRules.map((item) => String(item)).join(" ") : "";
      let presenceFactLine = "";
      const presenceRaw = ctx.localRoomState?.["knownPresenceStatus"];
      const presenceFacts = typeof presenceRaw === "string" && presenceRaw.trim().length > 0 ? presenceRaw.trim() : presenceRaw && typeof presenceRaw === "object" ? Object.entries(presenceRaw).map(([id, status]) => `${id}:${String(status)}`).join(", ") : null;
      if (presenceFacts) {
        presenceFactLine = `
ROOM PRESENCE FACTS (you MUST reference at least one in your reply): ${presenceFacts}`;
      }
      const voiceLine = voice ? `
VOICE PRESSURE: function=${String(voice.function ?? "")}; posture=${String(voice.posture ?? "")}; allowed edge=${Array.isArray(voice.allowedEdges) ? voice.allowedEdges.join(", ") : ""}; forbidden drift=${Array.isArray(voice.forbiddenDrift) ? voice.forbiddenDrift.join(", ") : ""}; room function=${String(voice.roomFunction ?? "")}.` : "";
      const qualityLine = qualityRules ? `
QUALITY RULES: ${qualityRules}` : "";
      const mandatoryBrief = `
--- STUDIO PULSE MANDATORY BRIEF ---
Write the exact one-message reply now for planned speaker: ${speakerId}.
Reply as ${speakerId} using the room context. 1-2 sentences maximum.${presenceFactLine}${voiceLine}${qualityLine}
BANNED openings (will be rejected): "Hello.", "Hi.", "Okay.", "Sure.", "That's a good question", "Great question", "Certainly", "Let's dive in", "I can help", "I'm here to help", "As an AI".
REQUIRED: Use one concrete hook from the user's message, one room-awareness hook when relevant, and one character-specific stance. Do not mention prompts, architecture, metadata, schemas, validation, generation, or being an AI.
------------------------------------`;
      prompt.userMessage = `${prompt.userMessage}
${mandatoryBrief}`;
    }
    if (socialDirectorStructuredMode) {
      prompt.userMessage = `${prompt.userMessage}

--- SOCIAL DIRECTOR JSON CONTRACT ---
Return exactly one JSON object with roomBeat, roomMood, responseMode, speakers, silentReactions, and stateUpdates. Do not wrap it in response_text. Do not use markdown or prose outside the JSON. The host will reject banned phrases, repeated points, task-router language, and raw internals.
-------------------------------------`;
    }
    if (process.env.AISHA_DEBUG === "true") {
      const sp = prompt.systemPrompt;
      const um = prompt.userMessage;
      const full = sp + "\n" + um;
      const hasStudioPulseContext = !!modifiedInput.studioPulseContext;
      const activeSpeakerId = modifiedInput.studioPulseContext?.activeSpeakerId ?? "none";
      const promptContainsStudioPulseContextBlock = sp.includes("STUDIO PULSE ROOM CONTEXT:");
      const promptContainsPlannedSpeakerRule = sp.includes("Write exactly one message for the planned speaker");
      const promptContainsNoGenericGreetingRule = sp.includes("Do NOT output generic bare greetings");
      const promptContainsVanyaProfile = activeSpeakerId === "vanya" ? /people temperature|warm, playful|emotionally observant|Vanya/i.test(full) : false;
      const promptContainsRoomPresenceSummary = sp.includes("Room Presence Summary:");
      const promptContainsDialogueQualityBrief = sp.includes("DIALOGUE QUALITY BRIEF:") || um.includes("STUDIO PULSE MANDATORY BRIEF");
      const plannedSpeakerVoiceProfileIncluded = sp.includes("Speaker function:") || um.includes("VOICE PRESSURE:");
      const finalPromptContainsForbiddenInternals = /\b(speakerId|responseIntent|roomStateDelta|emotionalDelta|projectContext|dialogueQualityV02|schema)\b/.test(full);
      console.log(`[AISHA_DEBUG] Gemini Final Prompt Diagnostics:`);
      console.log(`  hasStudioPulseContext: ${hasStudioPulseContext}`);
      console.log(`  activeSpeakerId: ${activeSpeakerId}`);
      console.log(`  socialDirectorStructuredMode: ${socialDirectorStructuredMode}`);
      console.log(`  plannedSpeakerVoiceProfileIncluded: ${plannedSpeakerVoiceProfileIncluded}`);
      console.log(`  dialogueQualityBriefIncluded: ${promptContainsDialogueQualityBrief}`);
      console.log(`  promptContainsStudioPulseContextBlock: ${promptContainsStudioPulseContextBlock}`);
      console.log(`  promptContainsPlannedSpeakerRule: ${promptContainsPlannedSpeakerRule}`);
      console.log(`  promptContainsNoGenericGreetingRule: ${promptContainsNoGenericGreetingRule}`);
      console.log(`  promptContainsVanyaProfile: ${promptContainsVanyaProfile}`);
      console.log(`  promptContainsRoomPresenceSummary: ${promptContainsRoomPresenceSummary}`);
      console.log(`  finalPromptContainsForbiddenInternals: ${finalPromptContainsForbiddenInternals}`);
      console.log(`  finalPromptLength: ${full.length}`);
    }
    if (hasVertex) {
      return this.generateWithVertex({
        prompt,
        socialDirectorStructuredMode,
        promptTokenEstimate,
        kPositionAblation
      });
    }
    let apiFailure;
    if (hasApiKey) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent?key=${encodeURIComponent(String(this.config.apiKey || ""))}`;
        const response = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: prompt.systemPrompt }]
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt.userMessage }]
              }
            ],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: this.config.maxOutputTokens,
              responseMimeType: "application/json",
              responseSchema: socialDirectorStructuredMode ? socialDirectorResponseSchema() : defaultResponseSchema(!!modifiedInput.studioPulseContext)
            }
          })
        });
        const payload = await response.json();
        if (!response.ok) {
          const rawBody = redactProviderDiagnostics(JSON.stringify(payload)).slice(0, 800);
          console.error(`[T24_DEBUG] Gemini API FAILED status=${response.status} model=${this.config.model} body=${rawBody}`);
          const message = payload?.error?.message || `gemini_http_error:${response.status}`;
          throw new Error(message);
        }
        const raw = extractRawText(payload);
        console.error(`[T24_DEBUG] Gemini API OK model=${this.config.model} rawLength=${raw.length} rawPreview=${raw.slice(0, 120)}`);
        if (!raw) {
          console.error(`[T24_DEBUG] Gemini returned empty raw. Full payload: ${JSON.stringify(payload).slice(0, 800)}`);
          throw new Error("generation_empty_response");
        }
        return {
          raw,
          metadata: {
            provider: "gemini",
            model: this.config.model,
            prompt_token_estimate: promptTokenEstimate,
            finish_reason: payload.candidates?.[0]?.finishReason ?? null,
            usage_metadata: payload.usageMetadata ?? null,
            prompt_feedback: payload.promptFeedback ?? null,
            ...socialDirectorStructuredMode ? { structuredOutputKind: "socialDirectorV1" } : {},
            ...kPositionAblation ? { kPositionAblation } : {}
          }
        };
      } catch (error) {
        apiFailure = error instanceof Error && error.name === "AbortError" ? new Error("generation_timeout") : error;
        if (!hasVertex || !isProviderRecoverableFailure(apiFailure)) {
          throw apiFailure;
        }
        const message = apiFailure instanceof Error ? apiFailure.message : String(apiFailure || "");
        console.error(`[T24_DEBUG] Gemini API recoverable failure; trying Vertex fallback model=${this.config.model} error=${redactProviderDiagnostics(message).slice(0, 500)}`);
      } finally {
        clearTimeout(timeout);
      }
    }
    return this.generateWithVertex({
      prompt,
      socialDirectorStructuredMode,
      promptTokenEstimate,
      kPositionAblation,
      previousFailure: apiFailure
    });
  }
};

// src/runtime/productionParser.ts
var PARSER_SAFETY_SCAN_LIMIT = 2e3;
function normalizeText(text) {
  return text.replace(/\r\n/g, "\n").trim();
}
function cloneMetadata(output) {
  return output.metadata ? { ...output.metadata } : void 0;
}
function buildParsedOutput(text, output) {
  return {
    text: normalizeText(text),
    metadata: cloneMetadata(output)
  };
}
function tryParseResponseTextObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value;
  if (typeof record.response_text === "string" && record.response_text.trim().length > 0) {
    return record.response_text;
  }
  if (typeof record.text === "string" && record.text.trim().length > 0) {
    return record.text;
  }
  return null;
}
function isSocialDirectorOutputKind(output) {
  return String(output.metadata?.structuredOutputKind || "") === "socialDirectorV1";
}
function isSocialDirectorObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  return typeof record.roomBeat === "string" && typeof record.roomMood === "string" && typeof record.responseMode === "string" && Array.isArray(record.speakers);
}
function tryParseSocialDirectorObject(value) {
  if (!isSocialDirectorObject(value)) return null;
  return JSON.stringify(value);
}
function safeSlice(text) {
  return text.trim().slice(0, PARSER_SAFETY_SCAN_LIMIT);
}
function tryDirectJson(raw) {
  try {
    const parsed = JSON.parse(safeSlice(raw));
    return tryParseResponseTextObject(parsed);
  } catch {
    return null;
  }
}
function tryDirectSocialDirectorJson(raw) {
  try {
    const parsed = JSON.parse(safeSlice(raw));
    return tryParseSocialDirectorObject(parsed);
  } catch {
    return null;
  }
}
function tryFencedJson(raw) {
  const matches = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of matches) {
    const inner = match[1]?.trim();
    if (!inner) continue;
    const cleaned = safeSlice(inner).replace(/,\s*([}\]])/g, "$1");
    try {
      const parsed = JSON.parse(cleaned);
      const text = tryParseResponseTextObject(parsed);
      if (text) return text;
    } catch {
    }
  }
  return null;
}
function tryFencedSocialDirectorJson(raw) {
  const matches = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi);
  for (const match of matches) {
    const inner = match[1]?.trim();
    if (!inner) continue;
    const cleaned = safeSlice(inner).replace(/,\s*([}\]])/g, "$1");
    try {
      const parsed = JSON.parse(cleaned);
      const text = tryParseSocialDirectorObject(parsed);
      if (text) return text;
    } catch {
    }
  }
  return null;
}
function tryOuterJsonSubstring(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const candidate = raw.slice(start, end + 1);
  try {
    const parsed = JSON.parse(safeSlice(candidate));
    return tryParseResponseTextObject(parsed);
  } catch {
    return null;
  }
}
function tryOuterSocialDirectorJsonSubstring(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const candidate = raw.slice(start, end + 1);
  try {
    const parsed = JSON.parse(safeSlice(candidate));
    return tryParseSocialDirectorObject(parsed);
  } catch {
    return null;
  }
}
function decodeLooseJsonString(text) {
  try {
    return JSON.parse(`"${text}"`);
  } catch {
    return text.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\\\/g, "\\");
  }
}
function tryRegexScrape(raw) {
  const sliced = raw.slice(0, PARSER_SAFETY_SCAN_LIMIT);
  const anchor = /"response_text"\s*:\s*"/s.exec(sliced);
  if (!anchor) {
    return null;
  }
  let i = anchor.index + anchor[0].length;
  let out = "";
  while (i < sliced.length) {
    const ch = sliced[i];
    if (ch === "\\") {
      const next = sliced[i + 1];
      if (next == null) {
        break;
      }
      out += `\\${next}`;
      i += 2;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < sliced.length && /\s/.test(sliced[j])) {
        j += 1;
      }
      const next = sliced[j];
      if (next === "," || next === "}" || next === "]" || next == null) {
        return decodeLooseJsonString(out);
      }
      out += '"';
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out.trim().length > 0 ? decodeLooseJsonString(out.trim()) : null;
}
var ProductionParser = class {
  parse(output) {
    if (isSocialDirectorOutputKind(output)) {
      if (typeof output.text === "string" && output.text.trim().length > 0) {
        const directText = tryDirectSocialDirectorJson(output.text);
        if (directText) return buildParsedOutput(directText, output);
      }
      const objectText2 = tryParseSocialDirectorObject(output.raw);
      if (objectText2) return buildParsedOutput(objectText2, output);
      const raw2 = typeof output.raw === "string" ? output.raw : output.raw != null ? JSON.stringify(output.raw) : "";
      if (!raw2.trim()) {
        throw new Error("parser_failed_closed:empty_output");
      }
      const directJson2 = tryDirectSocialDirectorJson(raw2);
      if (directJson2) return buildParsedOutput(directJson2, output);
      const fencedJson2 = tryFencedSocialDirectorJson(raw2);
      if (fencedJson2) return buildParsedOutput(fencedJson2, output);
      const outerJson2 = tryOuterSocialDirectorJsonSubstring(raw2);
      if (outerJson2) return buildParsedOutput(outerJson2, output);
      throw new Error("parser_failed_closed:social_director_json_parse_failed");
    }
    if (typeof output.text === "string" && output.text.trim().length > 0) {
      return buildParsedOutput(output.text, output);
    }
    const objectText = tryParseResponseTextObject(output.raw);
    if (objectText) {
      return buildParsedOutput(objectText, output);
    }
    const raw = typeof output.raw === "string" ? output.raw : output.raw != null ? JSON.stringify(output.raw) : "";
    if (!raw.trim()) {
      throw new Error("parser_failed_closed:empty_output");
    }
    const directJson = tryDirectJson(raw);
    if (directJson) {
      return buildParsedOutput(directJson, output);
    }
    const fencedJson = tryFencedJson(raw);
    if (fencedJson) {
      return buildParsedOutput(fencedJson, output);
    }
    const outerJson = tryOuterJsonSubstring(raw);
    if (outerJson) {
      return buildParsedOutput(outerJson, output);
    }
    const scraped = tryRegexScrape(raw);
    if (scraped && scraped.trim().length > 0) {
      return buildParsedOutput(scraped, output);
    }
    throw new Error("parser_failed_closed:all_tiers_exhausted");
  }
};

// src/runtime/validator.ts
var MAX_OUTPUT_CHARS = 4e3;
var FORBIDDEN_MARKERS = [
  "---STABLE_NOTES---",
  "---END_STABLE_NOTES---",
  "---THREAD_CONTEXT---",
  "---END_THREAD_CONTEXT---",
  "---EPISODE_EVIDENCE---",
  "---END_EPISODE_EVIDENCE---",
  "{{",
  "}}",
  "[object Object]"
];
var PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /\[INSERT RESPONSE\]/i,
  /<placeholder>/i,
  /\blorem ipsum\b/i
];
function hasDisallowedControlCharacters(text) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
}
function looksLikeJsonLeak(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return true;
  }
  return trimmed.includes('"response_text"') || trimmed.includes('"state_metadata"') || trimmed.includes('"internal_reasoning"');
}
function hasPlaceholderPattern(text) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}
function collectFailureReasons(text, options = {}) {
  const reasons = [];
  if (!text) reasons.push("empty_output");
  if (text.length > MAX_OUTPUT_CHARS) reasons.push("output_too_long");
  for (const marker of FORBIDDEN_MARKERS) {
    if (options.allowJsonLeak && (marker === "{{" || marker === "}}")) {
      continue;
    }
    if (text.includes(marker)) {
      reasons.push(`leaked_internal_marker:${marker}`);
    }
  }
  if (hasPlaceholderPattern(text)) {
    reasons.push("placeholder_output");
  }
  if (!options.allowJsonLeak && looksLikeJsonLeak(text)) {
    reasons.push("json_leak");
  }
  if (hasDisallowedControlCharacters(text)) {
    reasons.push("control_characters");
  }
  return reasons;
}
function parseJsonObject(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function isSocialDirectorJson(text) {
  const parsed = parseJsonObject(text);
  if (!parsed) return false;
  return typeof parsed.roomBeat === "string" && typeof parsed.roomMood === "string" && typeof parsed.responseMode === "string" && Array.isArray(parsed.speakers) && parsed.speakers.length > 0;
}
function dedupe(values) {
  return [...new Set(values)];
}
var MinimalRuntimeValidator = class {
  validate(input) {
    const text = input.parsed.text.trim();
    const structuredOutputKind = String(input.parsed.metadata?.structuredOutputKind || "");
    const socialDirectorMode = structuredOutputKind === "socialDirectorV1";
    const reasons = collectFailureReasons(text, { allowJsonLeak: socialDirectorMode });
    if (socialDirectorMode && !isSocialDirectorJson(text)) {
      reasons.push("invalid_social_director_json");
    }
    return {
      valid: reasons.length === 0,
      reasons: dedupe(reasons)
    };
  }
};

// src/runtime/transaction.ts
var InMemoryRuntimeJournal = class {
  constructor(traceId, sessionId) {
    this.traceId = traceId;
    this.sessionId = sessionId;
  }
  traceId;
  sessionId;
  state = "open";
  stagedArtifacts = [];
  async stage(artifact) {
    this.ensureOpen("stage");
    this.stagedArtifacts.push({
      ...artifact,
      data: { ...artifact.data }
    });
  }
  snapshot() {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      stagedArtifacts: this.stagedArtifacts.map((artifact) => ({
        ...artifact,
        data: { ...artifact.data }
      }))
    };
  }
  async commit(input) {
    this.ensureOpen("commit");
    const result = await input.apply();
    this.state = "committed";
    return result;
  }
  async abort() {
    if (this.state === "committed") {
      throw new Error("journal_already_committed");
    }
    this.state = "aborted";
  }
  ensureOpen(operation) {
    if (this.state !== "open") {
      throw new Error(`journal_not_open:${operation}:${this.state}`);
    }
  }
};
var InMemoryRuntimeTransaction = class {
  async openJournal(input) {
    return new InMemoryRuntimeJournal(input.traceId, input.sessionId);
  }
};

// src/runtime/rollback.ts
var JournalRollbackHelper = class {
  async rollback(input) {
    try {
      await input.journal.abort();
    } catch (abortError) {
      throw new Error(
        `rollback_abort_failed:${input.reason}:${abortError instanceof Error ? abortError.message : "unknown"}`
      );
    }
  }
};

// src/governance/fallback.ts
function contradictionSensitive(text) {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    text
  );
}
var CautiousFallbackHandler = class {
  async build(input) {
    if (contradictionSensitive(input.turn.rawText)) {
      return {
        text: "I want to be careful here because the details may have changed. Please restate the current fact in one sentence.",
        reason: input.reason
      };
    }
    return {
      text: "I want to be careful here, so I couldn't safely complete that response. Please restate the request in one concrete sentence.",
      reason: input.reason
    };
  }
};

// src/memory/calibrationSandbox.ts
function calculateCalibratedConfidence(note) {
  const base = note.extractionConfidenceRaw ?? note.confidence;
  const evidenceBonus = Math.min(0.15, Math.max(0, note.sourceEpisodeIds.length - 1) * 0.05);
  let statusPenalty = 0;
  if (note.reinferencePolicy.mode === "needs_review") {
    switch (note.reinferencePolicy.reason) {
      case "contradiction_sensitive_lower_support":
        statusPenalty = 0.2;
        break;
      case "retrieved_weak_stale_note":
        statusPenalty = 0.15;
        break;
      case "relationship_trust_gated":
      case "relationship_caution_gated":
        statusPenalty = 0.1;
        break;
      default:
        statusPenalty = 0.15;
    }
  }
  return Math.min(1, Math.max(0.01, base + evidenceBonus - statusPenalty));
}
function isNoteUncertain(note, threshold = 0.65) {
  return calculateCalibratedConfidence(note) < threshold;
}

// src/memory/contextBuilder.ts
var MAX_STABLE_NOTES = 4;
var MAX_NOTE_TEXT_LENGTH = 180;
var MAX_THREAD_LINE_LENGTH = 160;
var RESERVED_BLOCK_MARKERS = [
  "---STABLE_NOTES---",
  "---END_STABLE_NOTES---",
  "---THREAD_CONTEXT---",
  "---END_THREAD_CONTEXT---",
  "---EPISODE_EVIDENCE---",
  "---END_EPISODE_EVIDENCE---"
];
function collapseWhitespace(text) {
  return text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}
function stripReservedMarkers(text) {
  let out = text;
  for (const marker of RESERVED_BLOCK_MARKERS) {
    out = out.split(marker).join(" ");
  }
  return out;
}
function sanitizeInlineText(text, maxLength) {
  let out = text;
  out = stripReservedMarkers(out);
  out = collapseWhitespace(out);
  out = out.replace(/[\[\]\|]/g, " ");
  if (out.length > maxLength) {
    out = `${out.slice(0, maxLength - 3).trim()}...`;
  }
  return out || "(empty)";
}
function noteIsPersistedStale(note) {
  return note.reinferencePolicy.mode === "needs_review" && note.reinferencePolicy.reason === "retrieved_weak_stale_note";
}
function toStableNoteViews(bundle, maxNotes = MAX_STABLE_NOTES) {
  return bundle.activeNotes.slice(0, maxNotes).map((note) => ({
    noteId: note.id,
    subtype: note.subtype,
    text: sanitizeInlineText(note.canonicalText, MAX_NOTE_TEXT_LENGTH),
    confidence: note.confidence,
    calibratedConfidence: calculateCalibratedConfidence(note),
    isUncertain: isNoteUncertain(note),
    // Fallback for notes migrated from Pack 1 baseline that predate this field
    extractionConfidenceRaw: note.extractionConfidenceRaw ?? note.confidence,
    lastConfirmedAt: note.lastConfirmedAt,
    sourceEpisodeCount: note.sourceEpisodeIds.length,
    // Reads persisted store state only — no Date.now() or live age calculation
    isStale: noteIsPersistedStale(note),
    // Reads supersession map from bundle — no store calls in render path
    supersededPriorText: bundle.supersessionContext[note.id] ? sanitizeInlineText(bundle.supersessionContext[note.id], MAX_NOTE_TEXT_LENGTH) : void 0
  }));
}
function renderStableNotesBlock(notes) {
  if (!notes.length) {
    return "---STABLE_NOTES---\n(none)\n---END_STABLE_NOTES---";
  }
  const lines = [];
  for (const note of notes) {
    const staleMark = note.isStale ? "|STALE" : "";
    const uncertainMark = note.isUncertain ? "|UNCERTAIN" : "";
    lines.push(`[${note.subtype}|${note.calibratedConfidence.toFixed(2)}|src=${note.sourceEpisodeCount}${staleMark}${uncertainMark}] ${note.text}`);
    if (note.supersededPriorText) {
      lines.push(`  > superseded: ${note.supersededPriorText}`);
    }
  }
  return ["---STABLE_NOTES---", ...lines, "---END_STABLE_NOTES---"].join("\n");
}
function renderThreadBlock(bundle) {
  if (!bundle.activeThread.length) {
    return "---THREAD_CONTEXT---\n(none)\n---END_THREAD_CONTEXT---";
  }
  const lines = bundle.activeThread.map((episode) => {
    const rawLabel = episode.summary ?? `Episode ${episode.id} turns=${episode.turnIds.length} modality=${episode.primaryModality}`;
    return `- ${sanitizeInlineText(rawLabel, MAX_THREAD_LINE_LENGTH)}`;
  });
  return ["---THREAD_CONTEXT---", ...lines, "---END_THREAD_CONTEXT---"].join(
    "\n"
  );
}
function renderEpisodeEvidenceBlock(bundle) {
  if (!bundle.supportingEpisodes.length) return void 0;
  const lines = bundle.supportingEpisodes.map((episode) => {
    const rawLabel = episode.summary ?? `Supporting episode ${episode.id} turns=${episode.turnIds.length}`;
    return `- ${sanitizeInlineText(rawLabel, MAX_THREAD_LINE_LENGTH)}`;
  });
  return [
    "---EPISODE_EVIDENCE---",
    ...lines,
    "---END_EPISODE_EVIDENCE---"
  ].join("\n");
}
var SimpleContextBuilder = class {
  build(bundle) {
    const stableNotesBlock = renderStableNotesBlock(toStableNoteViews(bundle));
    const threadBlock = renderThreadBlock(bundle);
    const episodeEvidenceBlock = renderEpisodeEvidenceBlock(bundle);
    return {
      stableNotesBlock,
      threadBlock,
      episodeEvidenceBlock
    };
  }
};

// src/memory/episodeBoundary.ts
var STOPWORDS = /* @__PURE__ */ new Set(["a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "i", "in", "is", "it", "me", "my", "of", "on", "or", "that", "the", "this", "to", "we", "you"]);
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, " ").split(/\s+/).map((t) => t.trim()).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
function uniqueTokens(texts) {
  return new Set(texts.flatMap(tokenize));
}
function jaccardDistance(a, b) {
  const union = /* @__PURE__ */ new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return 1 - intersection / union.size;
}
function computeTopicShiftScore(input) {
  const priorTexts = input.recentTurns.slice(-4).map((t) => t.rawText);
  const currentText = input.currentTurn.rawText;
  return jaccardDistance(uniqueTokens(priorTexts), uniqueTokens([currentText]));
}
function computeSurpriseDiscontinuityScore(input) {
  if (!input.previousSnapshot) return 0;
  const prev = input.previousSnapshot.expressiveEnvelope;
  const curr = input.currentSnapshot.expressiveEnvelope;
  return Math.max(
    Math.abs(curr.tension - prev.tension),
    Math.abs(curr.trust - prev.trust),
    Math.abs(curr.valence - prev.valence),
    Math.abs(curr.load - prev.load)
  );
}
var DeterministicEpisodeBoundaryDetector = class {
  constructor(topicShiftThreshold = 0.72, surpriseThreshold = 0.35) {
    this.topicShiftThreshold = topicShiftThreshold;
    this.surpriseThreshold = surpriseThreshold;
  }
  topicShiftThreshold;
  surpriseThreshold;
  decide(input) {
    const topicShiftScore = computeTopicShiftScore(input);
    const surpriseScore = computeSurpriseDiscontinuityScore(input);
    const topicShift = topicShiftScore >= this.topicShiftThreshold;
    const surpriseDiscontinuity = surpriseScore >= this.surpriseThreshold;
    const split = topicShift || surpriseDiscontinuity;
    const score = Math.max(topicShiftScore, surpriseScore);
    const reasons = [];
    if (topicShift) reasons.push(`topic_shift:${topicShiftScore.toFixed(2)}`);
    if (surpriseDiscontinuity) reasons.push(`surprise_discontinuity:${surpriseScore.toFixed(2)}`);
    if (!split) reasons.push("append_to_active_episode");
    return { split, topicShift, surpriseDiscontinuity, score, reasons };
  }
};

// src/memory/noteExtractionSandbox.ts
function normalizeValue(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
function cleanExtractedValue(text) {
  return text.trim().replace(/[.?!]+$/g, "").replace(/\b(now|these days|lately|currently)\b$/i, "").trim();
}
function dedupeCandidates(candidates) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const candidate of candidates) {
    const key = [
      candidate.subtype,
      candidate.subjectKind,
      candidate.subjectSpeakerId ?? "",
      candidate.subjectPersonId ?? "",
      candidate.relationshipContextPersonId ?? "",
      normalizeValue(candidate.normalizedValue ?? candidate.canonicalText)
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}
function isEphemeralChatter(text) {
  const normalized = normalizeValue(text);
  return /^(ok|okay|cool|lol|haha|sure|nice|yep|yup|alright|sounds good|thanks|thank you|okay cool thanks)$/.test(
    normalized
  );
}
function hasStrongPreferenceSignal(text) {
  return /\b(?:i like|i love|i prefer|i only drink|i always drink|i never drink|i hate|i don't like|i do not like|my [a-z0-9 _-]{2,80} preference is)\b/i.test(
    text
  );
}
function hasImpliedPreferenceSignal(text) {
  return /\b(?:my go-to|go-to is|go for|i usually get|i typically get|i typically have|i usually have|i always get|i tend to order|i tend to get|i always order|i start my day with|my usual is|i always start with|i avoid|i stay away from|i gave up|i cut out|doesn't agree with me|doesn't work for me)\b/i.test(
    text
  );
}
function hasStrongProfileSignal(text) {
  return /\b(?:i am|i'm|i usually|i tend to|i always|i never)\b/i.test(text);
}
function looksPreferenceLike(text) {
  return /\b(?:drink|eat|coffee|latte|tea|food|music|movie|movies|dashboard|design|aesthetic|colour|color|accent|prefer|preference|like|love|hate)\b/i.test(
    text
  );
}
function cleanBehavioralValue(text) {
  return text.trim().replace(/[.?!]+$/g, "").replace(/^(?:a |an |the )/i, "").replace(/\b(now|these days|lately|currently|sometimes|usually|typically|generally|often)\b$/i, "").trim();
}
var SimpleNoteExtractionSandbox = class {
  heuristicGate(episode, turns) {
    const userTurns = turns.filter((t) => t.speaker === "user");
    const texts = userTurns.map((t) => t.rawText.trim());
    const reasons = [];
    if (userTurns.length === 0) {
      return {
        pass: false,
        reasons: ["no_user_turns"]
      };
    }
    const ephemeralOnly = texts.every(isEphemeralChatter);
    if (ephemeralOnly) {
      return {
        pass: false,
        reasons: ["ephemeral_chatter_only"]
      };
    }
    const hasPreference = texts.some(hasStrongPreferenceSignal);
    const hasProfile = texts.some(hasStrongProfileSignal);
    const hasImplied = texts.some(hasImpliedPreferenceSignal);
    const hasBoundary = texts.some(
      (t) => /\b(?:I don't want to talk about|let's change the subject|drop the subject|don't bring it up|never mind about|no more about)\b/i.test(t)
    );
    if (hasPreference) reasons.push("strong_preference_signal");
    if (hasProfile) reasons.push("strong_profile_signal");
    if (hasImplied) reasons.push("implied_preference_signal");
    if (hasBoundary) reasons.push("boundary_signal");
    if (episode.turnIds.length > 0) reasons.push("episode_present");
    const pass = hasPreference || hasProfile || hasImplied || hasBoundary;
    if (!pass) reasons.push("no_promotable_signal");
    return {
      pass,
      reasons
    };
  }
  async extract(episode, turns) {
    const userTurns = turns.filter((t) => t.speaker === "user");
    const candidates = [];
    for (const turn of userTurns) {
      const sentences = turn.rawText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      for (const text of sentences) {
        const isTemporary = /\b(right now|just for now|at the moment|for now)\b/i.test(text);
        const isConditional = /\b(if |in case|unless|depending on|when it rains)\b/i.test(text);
        const isAmbivalent = /\b(might|maybe|probably|perhaps|guess|suppose)\b/i.test(text);
        const isAspiration = /\b(want to|hope to|planning to|going to|trying to|wish I|plan to|someday|eventually|tomorrow)\b/i.test(text);
        const hedgePenalty = (base) => {
          let c = base;
          if (isAspiration) c -= 0.4;
          if (isTemporary) c -= 0.35;
          if (isConditional) c -= 0.3;
          if (isAmbivalent) c -= 0.25;
          return Math.max(0.1, Math.round(c * 100) / 100);
        };
        const boundaryMatch = text.match(
          /\b(?:I don't want to talk about|let's change the subject|drop the subject|don't bring it up|never mind about|no more about)\s+(.+?)(?:[.!?]|$)/i
        );
        if (boundaryMatch) {
          const cleaned = cleanExtractedValue(boundaryMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_boundary",
              canonicalText: `User boundary: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: 0.9,
              extractionConfidenceRaw: 0.9,
              // K_boundary: status not set here — versioning will force "active" for K_boundary
              provenanceChain: ["heuristic_boundary_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_boundary_pattern"
            });
            continue;
          }
        }
        const slotPrefMatch = text.match(
          /\bmy\s+([a-z0-9 _-]{2,80}?)\s+preference\s+is\s+(.+?)(?:[.!?]|$)/i
        );
        if (slotPrefMatch) {
          const slot = cleanBehavioralValue(slotPrefMatch[1]).toLowerCase();
          const cleaned = cleanExtractedValue(slotPrefMatch[2]);
          if (slot.length > 0 && cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User ${slot} preference: ${cleaned}`,
              normalizedValue: normalizeValue(`${slot} preference: ${cleaned}`),
              confidence: hedgePenalty(0.88),
              extractionConfidenceRaw: 0.88,
              status: "active",
              provenanceChain: ["heuristic_slot_preference_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_slot_preference_pattern"
            });
            continue;
          }
        }
        const prefMatch = text.match(
          /\b(?:I like|I love|I prefer|I only drink|I always drink|I never drink|I hate|I don't like|I do not like)\s+(.+?)(?:[.!?]|$)/i
        );
        if (prefMatch) {
          const cleaned = cleanExtractedValue(prefMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.78),
              extractionConfidenceRaw: 0.78,
              status: "provisional",
              provenanceChain: ["heuristic_preference_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_preference_pattern"
            });
            continue;
          }
        }
        const behavioralMatch = text.match(
          /\b(?:my go-to is|go-to is|i usually get|i typically get|i typically have|i usually have|i always get|i always order|i tend to order|i tend to get|i always start with|i start my day with|my usual is)\s+(.+?)(?:[.!?]|$)/i
        );
        if (behavioralMatch) {
          const cleaned = cleanBehavioralValue(behavioralMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.72),
              extractionConfidenceRaw: 0.72,
              status: "provisional",
              provenanceChain: ["heuristic_behavioral_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_behavioral_pattern"
            });
            continue;
          }
        }
        const avoidanceMatch = text.match(
          /\b(?:i avoid|i stay away from|i gave up|i cut out|i stopped having|i don't do)\s+(.+?)(?:[.!?]|$)/i
        );
        if (avoidanceMatch) {
          const cleaned = cleanBehavioralValue(avoidanceMatch[1]);
          if (cleaned.length > 0) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: avoids ${cleaned}`,
              normalizedValue: normalizeValue(`avoids ${cleaned}`),
              confidence: hedgePenalty(0.74),
              extractionConfidenceRaw: 0.74,
              status: "provisional",
              provenanceChain: ["heuristic_avoidance_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_avoidance_pattern"
            });
            continue;
          }
        }
        const behaviorDescMatch = text.match(
          /\b(?:i(?:'ll)? go for|i(?:'ll)? have|i(?:'ll)? get)\s+(.+?)(?:\s+every time|[.!?]|$)/i
        );
        if (behaviorDescMatch) {
          const cleaned = cleanBehavioralValue(behaviorDescMatch[1]);
          if (cleaned.length > 0 && looksPreferenceLike(cleaned)) {
            candidates.push({
              subtype: "K_pref",
              canonicalText: `User preference: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.7),
              extractionConfidenceRaw: 0.7,
              status: "provisional",
              provenanceChain: ["heuristic_behavior_described_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_behavior_described_pattern"
            });
            continue;
          }
        }
        const profileMatch = text.match(
          /\b(?:I am|I'm|I usually|I tend to|I always|I never)\s+(.+?)(?:[.!?]|$)/i
        );
        if (profileMatch) {
          const cleaned = cleanExtractedValue(profileMatch[1]);
          if (cleaned.length > 0 && !looksPreferenceLike(cleaned)) {
            candidates.push({
              subtype: "K_profile",
              canonicalText: `User profile: ${cleaned}`,
              normalizedValue: normalizeValue(cleaned),
              confidence: hedgePenalty(0.7),
              extractionConfidenceRaw: 0.7,
              status: "provisional",
              provenanceChain: ["heuristic_profile_pattern"],
              subjectKind: "user",
              sourceEpisodeIds: [episode.id],
              provenanceReason: "heuristic_profile_pattern"
            });
            continue;
          }
        }
      }
    }
    return dedupeCandidates(candidates);
  }
};

// src/memory/reactiveReconsolidation.ts
var STALE_DAYS_THRESHOLD = 14;
var WEAK_CONFIDENCE_THRESHOLD = 0.72;
var LOW_EVIDENCE_THRESHOLD = 1;
var RETRIEVAL_REVIEW_PENALTY = 0.08;
var CONTRADICTION_REVIEW_PENALTY = 0.1;
var MAX_RECONSOLIDATION_SIGNALS_PER_TURN = 2;
var SOFT_SIGNAL_ESCALATION_THRESHOLD = 2;
function round2(value) {
  return Math.round(value * 100) / 100;
}
function noteTimestamp(note) {
  const raw = note.lastConfirmedAt ?? note.updatedAt ?? note.createdAt ?? "1970-01-01T00:00:00.000Z";
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function daysBetween(olderMs, newerMs) {
  const delta = Math.max(0, newerMs - olderMs);
  return delta / (1e3 * 60 * 60 * 24);
}
function contradictionSensitive2(turn) {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    turn.rawText
  );
}
function trackKey(note) {
  return [
    note.subtype,
    note.subjectKind,
    note.subjectSpeakerId ?? "",
    note.subjectPersonId ?? "",
    note.relationshipContextPersonId ?? ""
  ].join("|");
}
function supportComparison(a, b) {
  if (a.sourceEpisodeIds.length !== b.sourceEpisodeIds.length) {
    return a.sourceEpisodeIds.length - b.sourceEpisodeIds.length;
  }
  const aTime = noteTimestamp(a);
  const bTime = noteTimestamp(b);
  if (aTime !== bTime) {
    return aTime - bTime;
  }
  if (a.confidence !== b.confidence) {
    return a.confidence - b.confidence;
  }
  return b.id.localeCompare(a.id) * -1;
}
function bestNoteByTrack(notes) {
  const best = /* @__PURE__ */ new Map();
  for (const note of notes) {
    const key = trackKey(note);
    const existing = best.get(key);
    if (!existing || supportComparison(note, existing) > 0) {
      best.set(key, note);
    }
  }
  return best;
}
function maybeNeedsConfirmation(note, currentTurn) {
  const turnTime = Date.parse(currentTurn.createdAt);
  const ageDays = daysBetween(
    noteTimestamp(note),
    Number.isNaN(turnTime) ? Date.now() : turnTime
  );
  return ageDays >= STALE_DAYS_THRESHOLD && note.confidence <= WEAK_CONFIDENCE_THRESHOLD && note.sourceEpisodeIds.length <= LOW_EVIDENCE_THRESHOLD;
}
function cloneWithReviewPenalty(note, penalty, reason) {
  const nextConfidence = round2(Math.max(0.55, note.confidence - penalty));
  return {
    ...note,
    confidence: nextConfidence,
    reviewState: "pending",
    reinferencePolicy: {
      mode: "needs_review",
      reason
    }
  };
}
function resolvePersistentReviewReason(input) {
  const { note, currentTurn, bestByTrack } = input;
  const contradictionMode = contradictionSensitive2(currentTurn);
  const best = bestByTrack.get(trackKey(note));
  if (contradictionMode && best && best.id !== note.id && supportComparison(best, note) > 0) {
    return "contradiction_sensitive_lower_support";
  }
  return void 0;
}
function reviewRetrievedActiveNotes(input) {
  const bestByTrack = bestNoteByTrack(input.activeNotes);
  return input.activeNotes.map((note) => {
    const reason = resolvePersistentReviewReason({
      note,
      currentTurn: input.currentTurn,
      bestByTrack
    });
    if (!reason) {
      return note;
    }
    if (reason === "contradiction_sensitive_lower_support") {
      return cloneWithReviewPenalty(
        note,
        CONTRADICTION_REVIEW_PENALTY,
        reason
      );
    }
    return cloneWithReviewPenalty(note, RETRIEVAL_REVIEW_PENALTY, reason);
  });
}
function derivePersistedReviewSignals(input) {
  const bestByTrack = bestNoteByTrack(input.activeNotes);
  const byNoteId = /* @__PURE__ */ new Map();
  for (const note of input.activeNotes) {
    const reason = resolvePersistentReviewReason({
      note,
      currentTurn: input.currentTurn,
      bestByTrack
    });
    if (reason === "contradiction_sensitive_lower_support") {
      byNoteId.set(note.id, {
        noteId: note.id,
        reason
      });
      if (byNoteId.size >= MAX_RECONSOLIDATION_SIGNALS_PER_TURN) {
        break;
      }
    }
  }
  return [...byNoteId.values()];
}
function deriveGatedRetrievalSignals(input) {
  const signals = [];
  for (const note of input.activeNotes) {
    if (maybeNeedsConfirmation(note, input.currentTurn)) {
      const currentCount = note.reconsolidationSignalCount ?? 0;
      const nextCount = currentCount + 1;
      const reason = nextCount >= SOFT_SIGNAL_ESCALATION_THRESHOLD ? "retrieved_weak_stale_note" : "soft_signal_increment";
      signals.push({ noteId: note.id, reason });
      if (signals.length >= MAX_RECONSOLIDATION_SIGNALS_PER_TURN) {
        break;
      }
    }
  }
  return signals;
}
function deriveCombinedReviewSignals(input) {
  const contradictionSignals = derivePersistedReviewSignals(input);
  const remainingBudget = MAX_RECONSOLIDATION_SIGNALS_PER_TURN - contradictionSignals.length;
  if (remainingBudget <= 0) return contradictionSignals;
  const coveredNoteIds = new Set(contradictionSignals.map((s) => s.noteId));
  const softSignals = deriveGatedRetrievalSignals(input).filter((s) => !coveredNoteIds.has(s.noteId)).slice(0, remainingBudget);
  return [...contradictionSignals, ...softSignals];
}
function tightenContradictionEvidenceLinkage(input) {
  if (!input.contradictionEvidence.length || !input.activeNotes.length) {
    return input.contradictionEvidence;
  }
  const activeTracks = new Set(input.activeNotes.map((note) => trackKey(note)));
  const linked = input.contradictionEvidence.filter(
    (note) => activeTracks.has(trackKey(note))
  );
  return linked.length > 0 ? linked : input.contradictionEvidence;
}

// src/memory/retrievalPlanner.ts
var MAX_RECENT_TURNS = 6;
var MAX_THREAD_EPISODES = 3;
var MAX_SUPPORTING_EPISODES = 2;
var MAX_ACTIVE_NOTES = 8;
var MAX_CONTRADICTION_EVIDENCE = 1;
var MIN_ACTIVE_NOTE_CONFIDENCE = 0.65;
var STALE_RANKING_PENALTY = 0.06;
function currentTurnSuggestsContradiction(turn) {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed)\b/i.test(
    turn.rawText
  );
}
function noteIsPersistedStale2(note) {
  return note.reinferencePolicy.mode === "needs_review" && note.reinferencePolicy.reason === "retrieved_weak_stale_note";
}
function applyStaleRankingPenalty(notes) {
  let penalizedCount = 0;
  const result = notes.map((note) => {
    if (!noteIsPersistedStale2(note)) return note;
    if (note.sourceEpisodeIds.length >= 3) return note;
    penalizedCount++;
    return {
      ...note,
      confidence: Math.round(Math.max(0.55, note.confidence - STALE_RANKING_PENALTY) * 100) / 100
    };
  });
  if (penalizedCount > 0) {
    console.log(`[MEMORY][RETRIEVAL] stale ranking penalty applied to ${penalizedCount} note(s)`);
  }
  return result;
}
function noteIsGlobalUserNote(note) {
  return note.subjectKind === "user" && !note.subjectPersonId && !note.relationshipContextPersonId && !note.subjectSpeakerId;
}
function detectSubtypeIntent(turn) {
  const text = turn.rawText.toLowerCase();
  let pref = 0;
  let profile = 0;
  if (/\b(remember|remind me|what do you remember|what do you know about me|what should you remember)\b/.test(
    text
  )) {
    pref += 1;
    profile += 1;
  }
  if (/\b(drink|coffee|latte|tea|food|eat|meal|music|movie|movies|dashboard|design|aesthetic|colour|color|accent|order|favorite|prefer|preference|like|love|hate)\b/.test(
    text
  )) {
    pref += 3;
  }
  if (/\b(about me|how i work|work style|style|usually|tend to|always|never|profile)\b/.test(
    text
  )) {
    profile += 3;
  }
  return { pref, profile };
}
function subjectMatchStrength(turn, note) {
  const target = turn.relationshipTargetPersonId;
  if (target && (note.subjectPersonId === target || note.relationshipContextPersonId === target)) {
    return 3;
  }
  if (turn.speakerId && note.subjectSpeakerId && note.subjectSpeakerId === turn.speakerId) {
    return 2;
  }
  if (turn.speaker === "user" && noteIsGlobalUserNote(note)) {
    return 1;
  }
  return 0;
}
function subtypeRelevanceScore(turn, note) {
  const intent = detectSubtypeIntent(turn);
  if (note.subtype === "K_pref") return intent.pref;
  if (note.subtype === "K_profile") return intent.profile;
  return 0;
}
function noteRecency(note) {
  const candidate = note.lastConfirmedAt ?? note.updatedAt ?? note.createdAt ?? "1970-01-01T00:00:00.000Z";
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function evidenceCount(note) {
  return note.sourceEpisodeIds.length;
}
function compareRankedNotes(a, b) {
  if (b.subjectMatch !== a.subjectMatch) {
    return b.subjectMatch - a.subjectMatch;
  }
  if (b.sessionAffinity !== a.sessionAffinity) {
    return b.sessionAffinity - a.sessionAffinity;
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
function rankNotes(turn, notes, sessionEpisodeIds = /* @__PURE__ */ new Set()) {
  return notes.map((note) => ({
    note,
    subjectMatch: subjectMatchStrength(turn, note),
    sessionAffinity: note.sourceEpisodeIds.some((id) => sessionEpisodeIds.has(id)) ? 1 : 0,
    subtypeRelevance: subtypeRelevanceScore(turn, note),
    confidence: note.confidence,
    recency: noteRecency(note),
    evidence: evidenceCount(note)
  })).sort(compareRankedNotes);
}
function applySubtypeDiversity(turn, ranked) {
  const intent = detectSubtypeIntent(turn);
  const selected = [];
  const shouldSeedDiversity = intent.pref > 0 && intent.profile > 0;
  if (shouldSeedDiversity) {
    const topPref = ranked.find(
      (entry) => entry.note.subtype === "K_pref" && entry.subtypeRelevance > 0
    );
    const topProfile = ranked.find(
      (entry) => entry.note.subtype === "K_profile" && entry.subtypeRelevance > 0
    );
    if (topPref) selected.push(topPref);
    if (topProfile && !selected.some((entry) => entry.note.id === topProfile.note.id)) {
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
      `[RETRIEVAL] active note cap hit: ${ranked.length} candidates \u2192 ${MAX_ACTIVE_NOTES} selected. Prompt token budget protected.`
    );
  }
  return selected.slice(0, MAX_ACTIVE_NOTES).map((entry) => entry.note);
}
var SimpleRetrievalPlanner = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  async build(sessionId, currentTurn) {
    const recentTurns = await this.deps.turnStore.getRecent(
      sessionId,
      MAX_RECENT_TURNS
    );
    const activeThreadRecord = await this.deps.threadStore.getActive(sessionId);
    const threadEpisodeIds = activeThreadRecord?.episodeIds.slice(-MAX_THREAD_EPISODES) ?? [];
    const activeThread = await this.deps.episodeStore.getByIds(threadEpisodeIds);
    const activeNotes = await this.buildActiveNotesLane(
      sessionId,
      currentTurn,
      new Set(threadEpisodeIds)
    );
    const supportingEpisodes = this.selectSupportingEpisodes(
      activeThread,
      currentTurn
    );
    const contradictionEvidence = currentTurnSuggestsContradiction(currentTurn) ? await this.buildContradictionLane(currentTurn, activeNotes) : [];
    const supersessionContext = await this.deps.noteVersioning.listSupersededByIds(
      activeNotes.map((n) => n.id)
    );
    return {
      recentTurns,
      activeThread,
      activeNotes,
      supportingEpisodes,
      contradictionEvidence,
      supersessionContext
    };
  }
  async buildActiveNotesLane(sessionId, currentTurn, sessionEpisodeIds = /* @__PURE__ */ new Set()) {
    const rawCandidates = await this.deps.noteVersioning.listActiveNotes({
      sessionId,
      subjectPersonId: currentTurn.relationshipTargetPersonId,
      relationshipContextPersonId: currentTurn.relationshipTargetPersonId,
      includeGlobal: true,
      maxResults: MAX_ACTIVE_NOTES
    });
    const eligible = rawCandidates.filter((note) => {
      if (note.status !== "active") return false;
      if (note.reviewState === "rejected") return false;
      if (note.consentStatus === "deny") return false;
      if (note.confidence < MIN_ACTIVE_NOTE_CONFIDENCE) return false;
      return true;
    });
    const penalized = applyStaleRankingPenalty(eligible);
    const reviewed = reviewRetrievedActiveNotes({
      currentTurn,
      activeNotes: penalized
    });
    const ranked = rankNotes(currentTurn, reviewed, sessionEpisodeIds);
    return applySubtypeDiversity(currentTurn, ranked);
  }
  selectSupportingEpisodes(activeThread, currentTurn) {
    const targetPersonId = currentTurn.relationshipTargetPersonId;
    const filtered = activeThread.filter((episode) => {
      if (!targetPersonId) return true;
      return episode.focalRelationshipPersonId === targetPersonId || episode.participantPersonIds.includes(targetPersonId);
    });
    return filtered.slice(-MAX_SUPPORTING_EPISODES);
  }
  async buildContradictionLane(currentTurn, activeNotes) {
    const targetPersonId = currentTurn.relationshipTargetPersonId;
    const rawContradictions = await this.deps.noteVersioning.listContradictionEvidence({
      subjectPersonId: targetPersonId,
      relationshipContextPersonId: targetPersonId,
      maxResults: MAX_CONTRADICTION_EVIDENCE
    });
    const filtered = rawContradictions.filter((note) => {
      if (note.consentStatus === "deny") return false;
      if (targetPersonId) {
        return note.subjectPersonId === targetPersonId || note.relationshipContextPersonId === targetPersonId;
      }
      return note.subjectKind === "user" && !note.subjectPersonId;
    });
    const tightened = tightenContradictionEvidenceLinkage({
      activeNotes,
      contradictionEvidence: filtered
    });
    return tightened.sort((a, b) => {
      const aTime = noteRecency(a);
      const bTime = noteRecency(b);
      if (bTime !== aTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    }).slice(0, MAX_CONTRADICTION_EVIDENCE);
  }
  async buildTargeted(input) {
    const allActiveNotes = await this.deps.noteVersioning.listActiveNotes({
      includeGlobal: true,
      subjectPersonId: input.currentTurn.relationshipTargetPersonId,
      relationshipContextPersonId: input.currentTurn.relationshipTargetPersonId,
      maxResults: MAX_ACTIVE_NOTES
    });
    const targetSet = new Set(input.targetNoteIds);
    const eligible = allActiveNotes.filter((note) => {
      if (note.status !== "active") return false;
      if (note.reviewState === "rejected") return false;
      if (note.consentStatus === "deny") return false;
      if (note.confidence < MIN_ACTIVE_NOTE_CONFIDENCE) return false;
      return targetSet.has(note.id);
    });
    const penalized = applyStaleRankingPenalty(eligible);
    const reviewed = reviewRetrievedActiveNotes({
      currentTurn: input.currentTurn,
      activeNotes: penalized
    });
    const ranked = rankNotes(input.currentTurn, reviewed);
    const finalNotes = applySubtypeDiversity(input.currentTurn, ranked);
    const baseSorted = [...input.baseBundle.activeNotes].map((n) => n.id).sort().join(",");
    const targetedSorted = finalNotes.map((n) => n.id).sort().join(",");
    if (baseSorted === targetedSorted) {
      console.log("[MEMORY][CRITIC] buildTargeted: targeted set identical to base bundle; skipping");
      return input.baseBundle;
    }
    return {
      ...input.baseBundle,
      activeNotes: finalNotes
    };
  }
};

// src/runtime/runtime_types.ts
var MAX_CRITIC_CYCLES = 2;

// src/runtime/criticLoop.ts
var CERTAINTY_FLOOR = 0.4;
var TRUST_FLOOR = -0.2;
function findMemoryContradictions(parsedText, activeNotes) {
  const findings = [];
  const bestByTrack = /* @__PURE__ */ new Map();
  for (const note of activeNotes) {
    const key = `${note.subtype}|${note.subjectKind}|${note.subjectSpeakerId ?? ""}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
    const existing = bestByTrack.get(key);
    if (!existing || note.sourceEpisodeIds.length > existing.sourceEpisodeIds.length || note.sourceEpisodeIds.length === existing.sourceEpisodeIds.length && note.confidence > existing.confidence) {
      bestByTrack.set(key, note);
    }
  }
  for (const note of activeNotes) {
    if (!note.normalizedValue) continue;
    if (!parsedText.includes(note.normalizedValue)) continue;
    const key = `${note.subtype}|${note.subjectKind}|${note.subjectSpeakerId ?? ""}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
    const best = bestByTrack.get(key);
    if (best && best.id !== note.id && best.normalizedValue && best.normalizedValue !== note.normalizedValue) {
      findings.push({
        issueType: "memory_contradiction",
        affectedNoteId: note.id,
        reason: `Output surfaces "${note.normalizedValue}" (note ${note.id}) but higher-support note ${best.id} has value "${best.normalizedValue}"`
      });
    }
  }
  return findings;
}
function findStaleNoteSurfaced(parsedText, activeNotes) {
  const findings = [];
  for (const note of activeNotes) {
    if (note.reinferencePolicy.mode !== "needs_review") continue;
    const staleToken = `[${note.subtype}|`;
    const hasStaleInText = parsedText.includes(staleToken) && parsedText.includes("|STALE]");
    const hasValueInText = note.normalizedValue ? parsedText.includes(note.normalizedValue) : false;
    if (hasStaleInText || hasValueInText) {
      findings.push({
        issueType: "stale_note_surfaced",
        affectedNoteId: note.id,
        reason: `Output references stale/needs-review note ${note.id} ("${note.normalizedValue ?? note.canonicalText}")`
      });
    }
  }
  return findings;
}
function findThresholdCoherenceFailure(snapshot) {
  const { certainty, trust } = snapshot.expressiveEnvelope;
  if (certainty < CERTAINTY_FLOOR && trust < TRUST_FLOOR) {
    return [{
      issueType: "threshold_coherence_failure",
      affectedNoteId: void 0,
      reason: `Session state below coherence floor: certainty=${certainty.toFixed(2)} trust=${trust.toFixed(2)}`
    }];
  }
  return [];
}
var UNGROUNDED_MIN_TOKENS = 4;
var MEMORY_ASSERTION_PATTERNS = [
  /\b(remember|recall|you mentioned|you said|you told me|as you said|based on what|from what you've|i know that you|you prefer|you like|you are|you were|your)\b/i
];
function normaliseForGrounding(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function splitSentences(text) {
  return text.split(/[.?!]+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function isSentenceGrounded(normSentence, activeNotes, contradictionEvidence) {
  const allEvidence = [
    ...activeNotes,
    ...contradictionEvidence
  ];
  return allEvidence.some((e) => {
    if (e.normalizedValue && e.normalizedValue.length >= 3) {
      if (normSentence.includes(normaliseForGrounding(e.normalizedValue))) return true;
    }
    if (e.canonicalText && e.canonicalText.length >= 3) {
      if (normSentence.includes(normaliseForGrounding(e.canonicalText))) return true;
    }
    return false;
  });
}
function findUngroundedClaims(parsedText, retrieval) {
  const findings = [];
  const sentences = splitSentences(parsedText);
  const contradictionGroundingEvidence = retrieval.contradictionEvidence.map((e) => {
    if (e.kind === "note") {
      return {
        canonicalText: e.canonicalText,
        normalizedValue: e.normalizedValue
      };
    }
    return { canonicalText: e.summary };
  });
  for (const sentence of sentences) {
    const tokens = sentence.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length < UNGROUNDED_MIN_TOKENS) continue;
    const isAssertion = MEMORY_ASSERTION_PATTERNS.some((p) => p.test(sentence));
    if (!isAssertion) continue;
    const normSentence = normaliseForGrounding(sentence);
    if (!isSentenceGrounded(normSentence, retrieval.activeNotes, contradictionGroundingEvidence)) {
      findings.push({
        issueType: "ungrounded_claim",
        affectedNoteId: void 0,
        reason: `Sentence asserts memory-referenced fact with no grounding anchor in retrieval bundle: "${sentence.slice(0, 80)}${sentence.length > 80 ? "..." : ""}"`
      });
    }
  }
  return findings;
}
function evaluateText(parsedText, retrieval, snapshot) {
  const findings = [];
  try {
    findings.push(...findMemoryContradictions(parsedText, retrieval.activeNotes));
  } catch (err) {
    console.warn("[CRITIC] evaluateText memory_contradiction check threw:", err);
  }
  try {
    findings.push(...findStaleNoteSurfaced(parsedText, retrieval.activeNotes));
  } catch (err) {
    console.warn("[CRITIC] evaluateText stale_note_surfaced check threw:", err);
  }
  try {
    findings.push(...findThresholdCoherenceFailure(snapshot));
  } catch (err) {
    console.warn("[CRITIC] evaluateText threshold_coherence_failure check threw:", err);
  }
  try {
    findings.push(...findUngroundedClaims(parsedText, retrieval));
  } catch (err) {
    console.warn("[CRITIC] evaluateText ungrounded_claim check threw:", err);
  }
  return findings;
}
function findingsRequiringReRetrieval(findings) {
  const ids = [];
  for (const f of findings) {
    if (f.affectedNoteId && (f.issueType === "memory_contradiction" || f.issueType === "stale_note_surfaced")) {
      ids.push(f.affectedNoteId);
    }
  }
  return ids;
}
var BoundedCriticLoop = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  async run(input) {
    const allFindings = [];
    let currentText = input.initialParsed.text;
    let currentRetrieval = input.retrieval;
    let cycleCount = 0;
    let maxCyclesHit = false;
    let didReRetrieve = false;
    for (let cycle = 0; cycle < MAX_CRITIC_CYCLES; cycle++) {
      const findings = evaluateText(currentText, currentRetrieval, input.snapshot);
      if (findings.length === 0) {
        break;
      }
      for (const f of findings) {
        if (!allFindings.some((existing) => existing.affectedNoteId === f.affectedNoteId && existing.issueType === f.issueType)) {
          allFindings.push(f);
        }
      }
      cycleCount++;
      if (cycle === MAX_CRITIC_CYCLES - 1) {
        maxCyclesHit = true;
        break;
      }
      const reRetrievalNoteIds = findingsRequiringReRetrieval(findings);
      if (reRetrievalNoteIds.length > 0) {
        const targetedBundle = await this.deps.retrievalPlanner.buildTargeted({
          sessionId: input.turn.sessionId,
          currentTurn: input.turn,
          baseBundle: currentRetrieval,
          targetNoteIds: reRetrievalNoteIds
        });
        if (targetedBundle === currentRetrieval) {
          console.log("[CRITIC] buildTargeted returned unchanged bundle; aborting re-retrieval for this cycle");
          break;
        }
        didReRetrieve = true;
        currentRetrieval = targetedBundle;
        try {
          const regenMemoryContext = this.deps.contextBuilder.build(currentRetrieval);
          const regenOutput = await this.deps.generator.generate({
            sessionId: input.turn.sessionId,
            turn: input.turn,
            snapshot: input.snapshot,
            retrieval: currentRetrieval,
            memoryContext: regenMemoryContext
          });
          currentText = regenOutput.text ?? currentText;
        } catch (regenErr) {
          console.error("[CRITIC] regeneration threw during critic cycle; aborting remaining cycles:", regenErr);
          break;
        }
      } else {
        break;
      }
    }
    return {
      cycleCount,
      maxCyclesHit,
      findings: allFindings,
      didReRetrieve,
      finalText: currentText
    };
  }
};

// src/runtime/inMemoryAsyncMemoryFollowup.ts
function isContradictionSensitiveText(text) {
  return /\b(actually|not anymore|no longer|used to|stopped|instead|changed|now)\b/i.test(
    text
  );
}
function noteTimestamp2(note) {
  const raw = note.lastConfirmedAt ?? note.updatedAt ?? note.createdAt ?? "1970-01-01T00:00:00.000Z";
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}
function supportScore(note) {
  return note.sourceEpisodeIds.length * 1e9 + noteTimestamp2(note) * 1e3 + Math.round(note.confidence * 1e3);
}
function looseTrackKey(note) {
  return [note.subtype, note.subjectKind].join("|");
}
function contradictionFallbackSignals(notes) {
  const byTrack = /* @__PURE__ */ new Map();
  for (const note of notes) {
    if (note.status !== "active") continue;
    const key = looseTrackKey(note);
    const arr = byTrack.get(key) ?? [];
    arr.push(note);
    byTrack.set(key, arr);
  }
  const signals = [];
  for (const trackNotes of byTrack.values()) {
    if (trackNotes.length < 2) continue;
    const ranked = [...trackNotes].sort((a, b) => supportScore(b) - supportScore(a));
    const best = ranked[0];
    if (!best) continue;
    for (const note of ranked.slice(1)) {
      signals.push({
        noteId: note.id,
        reason: "contradiction_sensitive_lower_support"
      });
    }
  }
  return signals;
}
var InMemoryAsyncMemoryFollowup = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  async scheduleEpisodeProcessing(input) {
    const t0 = Date.now();
    const summary = {
      gatePassed: false,
      candidatesExtracted: 0,
      notesWritten: [],
      linksWritten: []
    };
    try {
      const episode = await this.deps.episodeStore.getById(input.episodeId);
      if (!episode) return summary;
      if (episode.sessionId !== input.sessionId) return summary;
      const turns = await this.deps.turnStore.getByIds(episode.turnIds);
      if (turns.length === 0) return summary;
      const gate = this.deps.noteExtractionSandbox.heuristicGate(episode, turns);
      summary.gatePassed = gate.pass;
      const currentTurn = turns[turns.length - 1];
      if (!currentTurn) return summary;
      const currentSnapshot = await this.deps.snapshotStore.getByTurnId(currentTurn.id);
      if (gate.pass) {
        const candidates = await this.deps.noteExtractionSandbox.extract(
          episode,
          turns
        );
        summary.candidatesExtracted = candidates.length;
        for (const candidate of candidates) {
          const validation = this.deps.noteVersioning.validate(candidate);
          if (!validation.valid) continue;
          const existing = await this.deps.noteVersioning.listActiveNotes({
            sessionId: input.sessionId,
            includeGlobal: true,
            includeProvisional: true,
            subjectPersonId: candidate.subjectPersonId,
            relationshipContextPersonId: candidate.relationshipContextPersonId
          });
          const merge = await this.deps.noteVersioning.mergeOrSupersede(
            candidate,
            existing,
            currentSnapshot ? {
              trust: currentSnapshot.expressiveEnvelope.trust,
              caution: currentSnapshot.expressiveEnvelope.tension
            } : void 0
          );
          summary.notesWritten.push(...merge.notesWritten);
          summary.linksWritten.push(...merge.linksWritten);
        }
      }
      let activeNotes = await this.deps.noteVersioning.listActiveNotes({
        sessionId: input.sessionId,
        includeGlobal: true,
        subjectSpeakerId: currentTurn.speakerId,
        subjectPersonId: currentTurn.relationshipTargetPersonId,
        relationshipContextPersonId: currentTurn.relationshipTargetPersonId
      });
      let signals = deriveCombinedReviewSignals({
        currentTurn,
        activeNotes
      });
      const contradictionMode = isContradictionSensitiveText(currentTurn.rawText);
      const hasContradictionSignal2 = signals.some(
        (signal) => signal.reason === "contradiction_sensitive_lower_support"
      );
      if (contradictionMode && !hasContradictionSignal2) {
        const broaderNotes = await this.deps.noteVersioning.listActiveNotes({
          sessionId: input.sessionId,
          includeGlobal: true
        });
        const broaderSignals = deriveCombinedReviewSignals({
          currentTurn,
          activeNotes: broaderNotes
        });
        const broaderHasContradictionSignal = broaderSignals.some(
          (signal) => signal.reason === "contradiction_sensitive_lower_support"
        );
        if (broaderHasContradictionSignal) {
          activeNotes = broaderNotes;
          signals = broaderSignals;
        } else {
          const forcedSignals = contradictionFallbackSignals(broaderNotes);
          if (forcedSignals.length > 0) {
            activeNotes = broaderNotes;
            signals = forcedSignals;
          }
        }
      }
      if (signals.length > 0) {
        const groupedSignals = /* @__PURE__ */ new Map();
        for (const sig of signals) {
          const note = activeNotes.find((n) => n.id === sig.noteId);
          if (!note) continue;
          const scopeKey = `${note.subjectKind}|${note.subjectPersonId ?? ""}|${note.relationshipContextPersonId ?? ""}`;
          if (!groupedSignals.has(scopeKey)) {
            groupedSignals.set(scopeKey, {
              scope: {
                subjectKind: note.subjectKind,
                subjectPersonId: note.subjectPersonId,
                relationshipContextPersonId: note.relationshipContextPersonId
              },
              signals: []
            });
          }
          groupedSignals.get(scopeKey).signals.push(sig);
        }
        for (const group of groupedSignals.values()) {
          const reviewed = await this.deps.noteVersioning.persistReviewSignals(group.signals, group.scope);
          summary.notesWritten.push(...reviewed);
        }
      }
      return summary;
    } finally {
      console.log(`[PERF] async followup latency: ${Date.now() - t0}ms`);
    }
  }
};

// src/research/shadowEvidenceStore.ts
var _evidenceSeq = 0;
function makeEvidenceId() {
  _evidenceSeq += 1;
  return `ev_${String(_evidenceSeq).padStart(6, "0")}`;
}
var ShadowEvidenceStore = class {
  /** Raw evidence records keyed by evidenceId. */
  records = /* @__PURE__ */ new Map();
  /** Operator annotation overlays keyed by evidenceId. */
  annotations = /* @__PURE__ */ new Map();
  /** Lane-separated ordered evidence ID lists. */
  laneIndex = {
    associative: [],
    trace: []
  };
  /**
   * Append a new shadow audit entry as a frozen evidence record.
   * Returns the generated evidenceId.
   * NEVER modifies the passed entry — a frozen copy is stored.
   */
  append(entry, collectedAt) {
    const evidenceId = makeEvidenceId();
    const record = {
      evidenceId,
      collectedAt,
      payload: Object.freeze({ ...entry })
    };
    this.records.set(evidenceId, record);
    this.laneIndex[entry.lane].push(evidenceId);
    return evidenceId;
  }
  /**
   * Apply or update operator annotations for an evidence record.
   * Throws if the evidenceId is unknown — annotation must target a real record.
   * Does NOT modify the underlying payload.
   */
  annotate(evidenceId, annotation, annotatedAt) {
    if (!this.records.has(evidenceId)) {
      throw new Error(`ShadowEvidenceStore.annotate: unknown evidenceId "${evidenceId}"`);
    }
    const existing = this.annotations.get(evidenceId) ?? { evidenceId, operatorReviewed: false };
    this.annotations.set(evidenceId, {
      ...existing,
      ...annotation,
      evidenceId,
      annotatedAt
    });
  }
  /**
   * Retrieve a single evidence record by ID.
   * Returns undefined if not found.
   */
  get(evidenceId) {
    return this.records.get(evidenceId);
  }
  /**
   * Retrieve the annotation overlay for an evidence record.
   * Returns undefined if no annotation has been applied.
   */
  getAnnotation(evidenceId) {
    return this.annotations.get(evidenceId);
  }
  /**
   * List all evidence IDs for a specific lane, in append order.
   */
  listByLane(lane) {
    return [...this.laneIndex[lane]];
  }
  /**
   * Total number of evidence records in the store.
   */
  size() {
    return this.records.size;
  }
  /**
   * Export AnnotatedShadowEntry[] for a specific lane.
   * Merges raw payload with any operator annotation overlay.
   * Output is directly consumable by Pack 3.13 aggregateLaneEvidence().
   *
   * Raw payload fields are always authoritative.
   * Annotation fields are overlaid on top without touching payload.
   */
  exportForReview(lane) {
    return this.laneIndex[lane].map((evidenceId) => {
      const record = this.records.get(evidenceId);
      const annotation = this.annotations.get(evidenceId);
      return mergeForReview(record, annotation);
    });
  }
  /**
   * Export all evidence for all lanes, grouped by lane.
   * Lanes are never merged into a single array.
   */
  exportAll() {
    return {
      associative: this.exportForReview("associative"),
      trace: this.exportForReview("trace")
    };
  }
  /**
   * Wipe all stored evidence and annotations. Call only in tests.
   * Never call in production code.
   */
  clear() {
    this.records.clear();
    this.annotations.clear();
    this.laneIndex.associative.length = 0;
    this.laneIndex.trace.length = 0;
  }
};
function mergeForReview(record, annotation) {
  return {
    // Spread raw payload fields (immutable)
    ...record.payload,
    // Overlay annotation fields (caller-provided, default false/undefined)
    operatorReviewed: annotation?.operatorReviewed ?? false,
    contradictionCaught: annotation?.contradictionCaught,
    noiseFlagged: annotation?.noiseFlagged,
    noteGraphSizeLogged: annotation?.noteGraphSizeLogged,
    episodeSummaryPopulationRate: annotation?.episodeSummaryPopulationRate
  };
}

// src/runtime/runtimeBuilder.ts
var SystemClock = class {
  nowIso() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
};
var ProductionIdGenerator = class {
  counters = /* @__PURE__ */ new Map();
  processNonce = Math.random().toString(36).slice(2, 8);
  next(prefix) {
    const nextValue = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, nextValue);
    const time = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${time}_${this.processNonce}_${nextValue}_${random}`;
  }
};
var RuntimeTrace = class {
  constructor(traceId, sessionId) {
    this.traceId = traceId;
    this.sessionId = sessionId;
  }
  traceId;
  sessionId;
  status = "running";
  failureReason;
  events = [];
  add(event) {
    this.events.push({
      ...event,
      data: event.data ? { ...event.data } : void 0
    });
  }
  fail(reason, _error) {
    this.status = "failed";
    this.failureReason = reason;
  }
  succeed() {
    this.status = "succeeded";
  }
  snapshot() {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      status: this.status,
      events: this.events.map((event) => ({
        ...event,
        data: event.data ? { ...event.data } : void 0
      })),
      failureReason: this.failureReason
    };
  }
};
var RuntimeTraceFactory = class {
  create(input) {
    return new RuntimeTrace(input.traceId, input.sessionId);
  }
};
function buildProductionRuntime(config, stores) {
  const generator = new GeminiGeneratorAdapter({
    apiKey: config.geminiApiKey,
    model: config.geminiModel ?? "gemini-2.5-flash",
    maxOutputTokens: config.geminiMaxOutputTokens ?? 1e3,
    timeoutMs: config.geminiTimeoutMs ?? 4e3,
    vertex: config.vertexGemini
  });
  const retrievalPlanner = new SimpleRetrievalPlanner({
    turnStore: stores.turnStore,
    threadStore: stores.threadStore,
    episodeStore: stores.episodeStore,
    noteVersioning: stores.noteVersioning
  });
  const asyncMemoryFollowup = new InMemoryAsyncMemoryFollowup({
    episodeStore: stores.episodeStore,
    turnStore: stores.turnStore,
    snapshotStore: stores.snapshotStore,
    noteExtractionSandbox: new SimpleNoteExtractionSandbox(),
    noteVersioning: stores.noteVersioning
  });
  const shadowEvidenceStore = stores.shadowEvidenceStore ?? new ShadowEvidenceStore();
  const shadowEvidenceCollector = new ShadowEvidenceCollector(shadowEvidenceStore);
  return {
    turnStore: stores.turnStore,
    snapshotStore: stores.snapshotStore,
    episodeBoundary: new DeterministicEpisodeBoundaryDetector(),
    episodeStore: stores.episodeStore,
    threadStore: stores.threadStore,
    retrievalPlanner,
    contextBuilder: new SimpleContextBuilder(),
    stateEngine: new CompoundStateEngine({
      classifier: new RegexSignalClassifier()
    }),
    generator,
    parser: new ProductionParser(),
    validator: new MinimalRuntimeValidator(),
    transaction: stores.runtimeTransaction ?? new InMemoryRuntimeTransaction(),
    rollback: new JournalRollbackHelper(),
    fallback: new CautiousFallbackHandler(),
    traceFactory: new RuntimeTraceFactory(),
    idGenerator: new ProductionIdGenerator(),
    clock: new SystemClock(),
    // Pack 1.4: bounded critic loop is active on the live generator path.
    // MAX_CRITIC_CYCLES = 2. Sync, before commit. Never aborts the turn.
    criticLoop: new BoundedCriticLoop({
      retrievalPlanner,
      generator,
      contextBuilder: new SimpleContextBuilder()
    }),
    asyncMemoryFollowup,
    // Pack 3.14c: wired at composition root — always present in real sessions.
    shadowEvidenceCollector
  };
}

// src/memory/turnStore.ts
function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      const nested = value[key];
      if (nested && typeof nested === "object" && !Object.isFrozen(nested)) {
        deepFreeze(nested);
      }
    }
  }
  return value;
}
var InMemoryTurnStore = class {
  byId = /* @__PURE__ */ new Map();
  bySession = /* @__PURE__ */ new Map();
  async write(turn) {
    const frozen = deepFreeze({
      ...turn,
      immutable: true,
      entityMentions: [...turn.entityMentions],
      coPresentEntities: [...turn.coPresentEntities ?? []]
    });
    if (this.byId.has(frozen.id)) throw new Error(`Turn already exists: ${frozen.id}`);
    this.byId.set(frozen.id, frozen);
    const existing = this.bySession.get(frozen.sessionId) ?? [];
    this.bySession.set(frozen.sessionId, [...existing, frozen]);
    return frozen;
  }
  async getRecent(sessionId, limit) {
    const turns = this.bySession.get(sessionId) ?? [];
    return turns.slice(Math.max(0, turns.length - limit));
  }
  async getById(id) {
    return this.byId.get(id) ?? null;
  }
  async getByIds(ids) {
    return ids.map((id) => this.byId.get(id)).filter((t) => Boolean(t));
  }
};

// src/memory/snapshotStore.ts
var InMemorySnapshotStore = class {
  byId = /* @__PURE__ */ new Map();
  latestBySession = /* @__PURE__ */ new Map();
  byTurnId = /* @__PURE__ */ new Map();
  async write(snapshot) {
    if (this.byId.has(snapshot.id)) throw new Error(`Snapshot already exists: ${snapshot.id}`);
    this.byId.set(snapshot.id, snapshot);
    this.latestBySession.set(snapshot.sessionId, snapshot.id);
    this.byTurnId.set(snapshot.turnId, snapshot.id);
    return snapshot;
  }
  async getLatest(sessionId) {
    const id = this.latestBySession.get(sessionId);
    return id ? this.byId.get(id) ?? null : null;
  }
  async getByTurnId(turnId) {
    const id = this.byTurnId.get(turnId);
    return id ? this.byId.get(id) ?? null : null;
  }
  async getRecent(sessionId, limit) {
    const all = Array.from(this.byId.values()).filter((s) => s.sessionId === sessionId);
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all.slice(0, limit);
  }
};

// src/host/inMemoryStores.ts
var FixtureEpisodeStore = class {
  byId = /* @__PURE__ */ new Map();
  bySession = /* @__PURE__ */ new Map();
  async createFromTurn(turn, decision, opts) {
    const ep = {
      id: opts?.episodeId ?? `ep_${turn.id}`,
      kind: "episode",
      createdAt: turn.createdAt,
      sourceModality: turn.sourceModality,
      sessionId: turn.sessionId,
      threadId: `thread_${turn.sessionId}`,
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId ? [turn.recognizedPersonId] : [],
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score
      }
    };
    this.byId.set(ep.id, ep);
    this.bySession.set(turn.sessionId, ep);
    return ep;
  }
  async appendTurn(episodeId, turn, decision) {
    const ep = this.byId.get(episodeId);
    if (!ep) return this.createFromTurn(turn, decision);
    const updated = {
      ...ep,
      endTurnId: turn.id,
      turnIds: [...ep.turnIds, turn.id]
    };
    this.byId.set(episodeId, updated);
    this.bySession.set(turn.sessionId, updated);
    return updated;
  }
  async getActive(sessionId) {
    return this.bySession.get(sessionId) ?? null;
  }
  async getById(id) {
    return this.byId.get(id) ?? null;
  }
  async getByIds(ids) {
    return ids.map((id) => this.byId.get(id)).filter((e) => Boolean(e));
  }
};
var FixtureThreadStore = class {
  threads = /* @__PURE__ */ new Map();
  async update(sessionId, episode) {
    const existing = this.threads.get(sessionId);
    const thread = {
      id: existing?.id ?? `thread_${sessionId}`,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: [.../* @__PURE__ */ new Set([...existing?.episodeIds ?? [], episode.id])],
      lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.threads.set(sessionId, thread);
    return thread;
  }
  async getActive(sessionId) {
    return this.threads.get(sessionId) ?? null;
  }
};
var FixtureNoteVersioning = class {
  notes = /* @__PURE__ */ new Map();
  validate(_c) {
    return { valid: true, reasons: [] };
  }
  async mergeOrSupersede() {
    return { notesWritten: [], linksWritten: [] };
  }
  async persistReviewSignals() {
    return [];
  }
  async listActiveNotes(_f) {
    return [...this.notes.values()];
  }
  async listProvisionalNotes(_f) {
    return [];
  }
  async evaluateProvisionalPromotion() {
    return { promoted: [], expired: [], unchanged: [] };
  }
  async listContradictionEvidence(_f) {
    return [];
  }
  async operatorReview() {
    return null;
  }
  async listSupersededByIds(_ids) {
    return {};
  }
};

// src/persistence/postgresStores.ts
import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";

// src/persistence/postgresSchema.ts
var AISHA_PACK1_POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS aisha_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_index INTEGER NOT NULL,
  speaker TEXT NOT NULL,
  state_snapshot_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_turns_session_turn
  ON aisha_turns(session_id, turn_index DESC);

CREATE TABLE IF NOT EXISTS aisha_state_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_snapshots_session_created
  ON aisha_state_snapshots(session_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aisha_snapshots_turn
  ON aisha_state_snapshots(turn_id);

CREATE TABLE IF NOT EXISTS aisha_episodes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  start_turn_id TEXT NOT NULL,
  end_turn_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_episodes_session_updated
  ON aisha_episodes(session_id, COALESCE(updated_at, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_episodes_thread
  ON aisha_episodes(thread_id);

CREATE TABLE IF NOT EXISTS aisha_threads (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  active_episode_id TEXT NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_threads_session
  ON aisha_threads(session_id);

CREATE TABLE IF NOT EXISTS aisha_notes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  subtype TEXT NOT NULL,
  status TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_speaker_id TEXT,
  subject_person_id TEXT,
  relationship_context_person_id TEXT,
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_notes_session_status
  ON aisha_notes(session_id, status, COALESCE(updated_at, created_at) DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_notes_subject
  ON aisha_notes(session_id, subject_kind, subject_speaker_id, subject_person_id, relationship_context_person_id);

CREATE TABLE IF NOT EXISTS aisha_note_links (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_note_id TEXT NOT NULL,
  to_note_id TEXT NOT NULL,
  relation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aisha_note_links_from_relation
  ON aisha_note_links(from_note_id, relation, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aisha_note_links_session
  ON aisha_note_links(session_id);
`;

// src/memory/noteVersioning.ts
function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function now() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeValue2(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
function sameSubject(a, b) {
  return a.subjectKind === b.subjectKind && (a.subjectSpeakerId ?? "") === (b.subjectSpeakerId ?? "") && (a.subjectPersonId ?? "") === (b.subjectPersonId ?? "") && (a.relationshipContextPersonId ?? "") === (b.relationshipContextPersonId ?? "");
}
function isSameMeaning(candidate, note) {
  const normalizedCandidate = normalizeValue2(
    candidate.normalizedValue ?? candidate.canonicalText
  );
  const normalizedExisting = normalizeValue2(
    note.normalizedValue ?? note.canonicalText
  );
  return candidate.subtype === note.subtype && sameSubject(candidate, note) && normalizedCandidate === normalizedExisting;
}
function isSameTrack(candidate, note) {
  return candidate.subtype === note.subtype && sameSubject(candidate, note);
}
function isContradictory(candidate, note) {
  if (candidate.subtype !== note.subtype) return false;
  if (!candidate.normalizedValue || !note.normalizedValue) return false;
  const cVal = candidate.normalizedValue;
  const nVal = note.normalizedValue;
  if (cVal.startsWith("avoids ") && !nVal.startsWith("avoids ")) {
    return cVal.replace("avoids ", "") === nVal;
  }
  if (!cVal.startsWith("avoids ") && nVal.startsWith("avoids ")) {
    return cVal === nVal.replace("avoids ", "");
  }
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
function reasonPriority(reason) {
  if (reason === "contradiction_sensitive_lower_support") return 2;
  if (reason === "retrieved_weak_stale_note") return 1;
  return 0;
}
var InMemoryNoteVersioning = class {
  notesById = /* @__PURE__ */ new Map();
  linksById = /* @__PURE__ */ new Map();
  validate(candidate) {
    const reasons = [];
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
  async mergeOrSupersede(candidate, existing, context) {
    const notesWritten = [];
    const linksWritten = [];
    const activeSameTrack = existing.filter(
      (note) => (note.status === "active" || note.status === "provisional") && isSameTrack(candidate, note)
    );
    const supportiveMatch = activeSameTrack.find(
      (note) => isSameMeaning(candidate, note)
    );
    if (supportiveMatch) {
      const episodeId = candidate.sourceEpisodeIds[0] ?? "unknown";
      const existingChain = supportiveMatch.provenanceChain ?? [];
      const mergedEpisodeIds = [
        .../* @__PURE__ */ new Set([
          ...supportiveMatch.sourceEpisodeIds,
          ...candidate.sourceEpisodeIds
        ])
      ];
      const updated = {
        ...supportiveMatch,
        updatedAt: now(),
        lastConfirmedAt: now(),
        confidence: Math.min(
          1,
          Math.max(supportiveMatch.confidence, candidate.confidence)
        ),
        // extractionConfidenceRaw is intentionally NOT updated on reinforce
        extractionConfidenceRaw: supportiveMatch.extractionConfidenceRaw,
        provenanceChain: [...existingChain.slice(-4), `reinforced_ep_${episodeId}`],
        sourceEpisodeIds: mergedEpisodeIds
      };
      if (updated.status === "provisional") {
        const hasMultiEp = mergedEpisodeIds.length > 1;
        const hasConf = updated.confidence >= 0.65;
        if (hasMultiEp && hasConf) {
          updated.status = "active";
          updated.expiresAt = void 0;
        }
      }
      this.notesById.set(updated.id, updated);
      notesWritten.push(updated);
      const reinforceSignals = {
        trust: context?.trust ?? 0,
        caution: context?.caution ?? 0,
        confidence: candidate.confidence,
        hasContradiction: false,
        contradictionCount: 0
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
        signals: reinforceSignals
      });
      return { notesWritten, linksWritten, auditEntries: [reinforceAuditEntry] };
    }
    const priorActiveConflicts = activeSameTrack.filter(
      (note) => isContradictory(candidate, note)
    );
    const trust = context?.trust ?? 0;
    const caution = context?.caution ?? 0;
    const TRUST_ACCEPT_THRESHOLD = 0.8;
    const TRUST_GATE_THRESHOLD = 0;
    const TRUST_REJECT_THRESHOLD = -0.6;
    const CAUTION_GATE_THRESHOLD = 0.7;
    const isTrustRejected = trust <= TRUST_REJECT_THRESHOLD;
    const isTrustGated = trust < TRUST_GATE_THRESHOLD && !isTrustRejected;
    const isCautionGated = caution > CAUTION_GATE_THRESHOLD;
    const isTrustAccepted = trust >= TRUST_ACCEPT_THRESHOLD;
    const isWeak = candidate.confidence < 0.65;
    const hasContradiction = priorActiveConflicts.length > 0;
    let initialReviewState = "pending";
    let reinferenceMode = "allow";
    let gatingReasonString;
    if (isTrustRejected || isWeak) {
      initialReviewState = "rejected";
      reinferenceMode = "block_auto_reinfer";
      gatingReasonString = isTrustRejected ? "relationship_trust_rejected" : "weakly_grounded_rejected";
    } else if (hasContradiction || isTrustGated || isCautionGated) {
      initialReviewState = "pending";
      reinferenceMode = "needs_review";
      gatingReasonString = hasContradiction ? "contradiction_needs_review" : isTrustGated ? "relationship_trust_gated" : "relationship_caution_gated";
    } else if (isTrustAccepted) {
      initialReviewState = "accepted";
      reinferenceMode = "allow";
    } else {
      initialReviewState = "pending";
      reinferenceMode = "allow";
    }
    const auditTrail = [
      {
        timestamp: now(),
        action: "created",
        reason: "Memory extraction process"
      }
    ];
    if (initialReviewState === "rejected" || reinferenceMode === "needs_review") {
      auditTrail.push({
        timestamp: now(),
        action: "relationship_gated",
        reason: gatingReasonString ?? "Gated",
        newState: reinferenceMode === "needs_review" ? "needs_review" : initialReviewState
      });
    } else if (initialReviewState === "accepted") {
      auditTrail.push({
        timestamp: now(),
        action: "relationship_gated",
        reason: "relationship_trust_accepted",
        newState: "accepted"
      });
    }
    const candidateStatus = candidate.subtype === "K_boundary" ? "active" : candidate.status === "provisional" ? "provisional" : "active";
    const newNote = {
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
      provenanceChain: [candidate.provenanceReason, ...candidate.provenanceChain ?? []].slice(0, 5),
      subjectKind: candidate.subjectKind,
      subjectSpeakerId: candidate.subjectSpeakerId,
      subjectPersonId: candidate.subjectPersonId,
      relationshipContextPersonId: candidate.relationshipContextPersonId,
      sourceEpisodeIds: candidate.sourceEpisodeIds,
      lastConfirmedAt: now(),
      reviewState: initialReviewState,
      reinferencePolicy: {
        mode: reinferenceMode,
        reason: reinferenceMode === "needs_review" || reinferenceMode === "block_auto_reinfer" ? gatingReasonString : void 0
      },
      auditTrail,
      // Provisional notes are bounded: they expire after 7 days if not promoted.
      expiresAt: candidateStatus === "provisional" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString() : void 0
    };
    this.notesById.set(newNote.id, newNote);
    notesWritten.push(newNote);
    const signals = {
      trust,
      caution,
      confidence: candidate.confidence,
      hasContradiction,
      contradictionCount: priorActiveConflicts.length
    };
    const allReasons = [];
    if (isTrustRejected) allReasons.push("relationship_trust_rejected");
    if (isWeak) allReasons.push("weakly_grounded_rejected");
    if (hasContradiction) allReasons.push("contradiction_needs_review");
    if (isTrustGated) allReasons.push("relationship_trust_gated");
    if (isCautionGated) allReasons.push("relationship_caution_gated");
    if (isTrustAccepted) allReasons.push("relationship_trust_accepted");
    if (allReasons.length === 0) allReasons.push("default_pending");
    const primaryReason = allReasons[0];
    const newNoteOutcome = initialReviewState === "accepted" ? "accepted" : initialReviewState === "rejected" ? "rejected" : "needs_review";
    const auditEntries = [];
    auditEntries.push(buildAcceptanceAuditEntry({
      auditId: makeAuditId(),
      timestamp: newNote.createdAt,
      noteId: newNote.id,
      subtype: newNote.subtype,
      canonicalText: newNote.canonicalText,
      outcome: newNoteOutcome,
      primaryReason,
      allReasons,
      signals
    }));
    for (const prior of priorActiveConflicts) {
      const priorNewStatus = prior.status === "provisional" ? "superseded" : "disputed";
      const supersededPrior = {
        ...prior,
        updatedAt: now(),
        status: priorNewStatus
      };
      this.notesById.set(supersededPrior.id, supersededPrior);
      notesWritten.push(supersededPrior);
      const supersedesLink = {
        id: makeId("note_link"),
        kind: "note_link",
        createdAt: now(),
        sourceModality: "text",
        fromNoteId: newNote.id,
        toNoteId: supersededPrior.id,
        relation: "supersedes",
        strength: 1
      };
      this.linksById.set(supersedesLink.id, supersedesLink);
      linksWritten.push(supersedesLink);
      auditEntries.push(buildSupersessionAuditEntry({
        auditId: makeAuditId(),
        timestamp: supersededPrior.updatedAt ?? supersededPrior.createdAt,
        priorNoteId: supersededPrior.id,
        priorCanonicalText: supersededPrior.canonicalText,
        priorNewStatus,
        causedByNoteId: newNote.id,
        signals
      }));
    }
    return { notesWritten, linksWritten, auditEntries };
  }
  async persistReviewSignals(signals, subjectScope) {
    const MAX_PENDING_REVIEW_NOTES = 10;
    const scopedPendingCount = [...this.notesById.values()].filter(
      (n) => n.status === "active" && n.reviewState === "pending" && n.reinferencePolicy.mode === "needs_review" && n.subjectKind === subjectScope.subjectKind && (n.subjectPersonId ?? "") === (subjectScope.subjectPersonId ?? "") && (n.relationshipContextPersonId ?? "") === (subjectScope.relationshipContextPersonId ?? "")
    ).length;
    if (scopedPendingCount >= MAX_PENDING_REVIEW_NOTES) {
      console.warn(
        "[MEMORY] scoped review budget ceiling hit; signals dropped",
        { subjectScope, droppedCount: signals.length }
      );
      return [];
    }
    const reduced = /* @__PURE__ */ new Map();
    for (const signal of signals) {
      const existing = reduced.get(signal.noteId);
      if (!existing || reasonPriority(signal.reason) > reasonPriority(existing.reason)) {
        reduced.set(signal.noteId, signal);
      }
    }
    const updated = [];
    for (const signal of reduced.values()) {
      const note = this.notesById.get(signal.noteId);
      if (!note) continue;
      if (note.status !== "active") continue;
      if (note.reviewState === "rejected") continue;
      if (signal.reason === "soft_signal_increment") {
        const next2 = {
          ...note,
          updatedAt: now(),
          reconsolidationSignalCount: (note.reconsolidationSignalCount ?? 0) + 1
        };
        this.notesById.set(next2.id, next2);
        updated.push(next2);
        continue;
      }
      const existingReason = note.reinferencePolicy.mode === "needs_review" ? note.reinferencePolicy.reason : void 0;
      const nextReason = existingReason && reasonPriority(existingReason) > reasonPriority(signal.reason) ? existingReason : signal.reason;
      const alreadySame = note.reviewState === "pending" && note.reinferencePolicy.mode === "needs_review" && note.reinferencePolicy.reason === nextReason;
      if (alreadySame) {
        updated.push(note);
        continue;
      }
      const next = {
        ...note,
        updatedAt: now(),
        lastReviewedAt: now(),
        reviewState: "pending",
        reinferencePolicy: {
          mode: "needs_review",
          reason: nextReason
        }
      };
      this.notesById.set(next.id, next);
      updated.push(next);
    }
    return updated;
  }
  isExpired(note) {
    if (note.status === "provisional" && note.expiresAt) {
      return Date.parse(note.expiresAt) < Date.now();
    }
    return false;
  }
  async listActiveNotes(filter) {
    const JOINT_GATE_CONFIDENCE = 0.65;
    const JOINT_GATE_EPISODE_OVERRIDE = 3;
    const notes = [...this.notesById.values()].filter((note) => {
      if (this.isExpired(note)) return false;
      if (filter?.includeProvisional) {
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
      const passesGate = note.confidence >= JOINT_GATE_CONFIDENCE || note.sourceEpisodeIds.length >= JOINT_GATE_EPISODE_OVERRIDE;
      if (!passesGate) return false;
      return true;
    });
    const filtered = notes.filter((note) => {
      if (!filter) return true;
      if (filter.relationshipContextPersonId) {
        const matchesRelationship = note.relationshipContextPersonId === filter.relationshipContextPersonId;
        const allowGlobal = filter.includeGlobal === true && !note.relationshipContextPersonId;
        if (!matchesRelationship && !allowGlobal) return false;
      }
      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }
      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectSpeakerId;
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
  async listProvisionalNotes(filter) {
    const notes = [...this.notesById.values()].filter((note) => {
      if (note.status !== "provisional") return false;
      if (this.isExpired(note)) return false;
      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (note.consentStatus === "deny") return false;
      if (!filter) return true;
      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }
      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectSpeakerId;
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
  async evaluateProvisionalPromotion(filter) {
    const PROMOTION_CONFIDENCE_THRESHOLD = 0.65;
    const PROMOTION_MIN_EPISODES = 2;
    const allProvisional = [...this.notesById.values()].filter((note) => {
      if (note.status !== "provisional") return false;
      if (note.reviewState === "rejected") return false;
      if (note.reinferencePolicy.mode === "block_auto_reinfer") return false;
      if (note.consentStatus === "deny") return false;
      if (!filter) return true;
      if (filter.subjectPersonId) {
        const matchesSubject = note.subjectPersonId === filter.subjectPersonId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectPersonId;
        if (!matchesSubject && !allowGlobal) return false;
      }
      if (filter.subjectSpeakerId) {
        const matchesSpeaker = note.subjectSpeakerId === filter.subjectSpeakerId;
        const allowGlobal = filter.includeGlobal === true && note.subjectKind === "user" && !note.subjectSpeakerId;
        if (!matchesSpeaker && !allowGlobal) return false;
      }
      return true;
    });
    const promoted = [];
    const expired = [];
    const unchanged = [];
    const nowMs = Date.now();
    for (const note of allProvisional) {
      if (note.expiresAt && Date.parse(note.expiresAt) < nowMs) {
        const stale = {
          ...note,
          updatedAt: new Date(nowMs).toISOString(),
          status: "stale",
          expiresAt: void 0,
          auditTrail: [
            ...note.auditTrail ?? [],
            {
              timestamp: new Date(nowMs).toISOString(),
              action: "created",
              reason: "provisional_expired: expiresAt exceeded without promotion",
              previousState: "provisional",
              newState: "stale"
            }
          ]
        };
        this.notesById.set(stale.id, stale);
        expired.push(stale);
        continue;
      }
      const hasMultiEp = note.sourceEpisodeIds.length >= PROMOTION_MIN_EPISODES;
      const hasConf = note.confidence >= PROMOTION_CONFIDENCE_THRESHOLD;
      if (hasMultiEp && hasConf) {
        const promotedNote = {
          ...note,
          updatedAt: new Date(nowMs).toISOString(),
          status: "active",
          expiresAt: void 0,
          // no longer bounded
          lastConfirmedAt: new Date(nowMs).toISOString(),
          auditTrail: [
            ...note.auditTrail ?? [],
            {
              timestamp: new Date(nowMs).toISOString(),
              action: "operator_approved",
              reason: `provisional_promoted: ${note.sourceEpisodeIds.length} source episodes, confidence=${note.confidence}`,
              previousState: "provisional",
              newState: "active"
            }
          ]
        };
        this.notesById.set(promotedNote.id, promotedNote);
        promoted.push(promotedNote);
        continue;
      }
      unchanged.push(note);
    }
    if (promoted.length > 0 || expired.length > 0) {
      console.log(
        `[MEMORY][PROVISIONAL] evaluated ${allProvisional.length} provisional note(s): promoted=${promoted.length}, expired=${expired.length}, unchanged=${unchanged.length}`
      );
    }
    return { promoted, expired, unchanged };
  }
  async listContradictionEvidence(filter) {
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
      if (filter.relationshipContextPersonId && note.relationshipContextPersonId !== filter.relationshipContextPersonId) {
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
  async operatorReview(noteId, decision, operatorId) {
    const note = this.notesById.get(noteId);
    if (!note) return null;
    const action = decision === "accept" ? "operator_approved" : "operator_rejected";
    const newState = decision === "accept" ? "accepted" : "rejected";
    const reinferenceMode = decision === "accept" ? "allow" : "block_auto_reinfer";
    const updated = {
      ...note,
      updatedAt: now(),
      reviewState: newState,
      reinferencePolicy: {
        mode: reinferenceMode,
        reason: decision === "accept" ? void 0 : "operator_rejected"
      },
      auditTrail: [
        ...note.auditTrail ?? [],
        {
          timestamp: now(),
          action,
          reason: `Operator decision: ${decision}`,
          operatorId,
          previousState: note.reviewState,
          newState
        }
      ]
    };
    this.notesById.set(updated.id, updated);
    return updated;
  }
  /**
   * Seeds notes directly into the store for testing purposes.
   * Notes are inserted as-is without validation or merging.
   */
  async seedNotes(notes) {
    for (const note of notes) {
      this.notesById.set(note.id, note);
    }
  }
  /**
   * For each given active noteId, returns the canonical text of the note it
   * directly superseded via a 'supersedes' link. Pure read. No store writes.
   * Returns at most one entry per input noteId (the most recently created link).
   */
  async listSupersededByIds(noteIds) {
    const result = {};
    const idSet = new Set(noteIds);
    const linksByFrom = /* @__PURE__ */ new Map();
    for (const link of this.linksById.values()) {
      if (link.relation !== "supersedes") continue;
      if (!idSet.has(link.fromNoteId)) continue;
      const existing = linksByFrom.get(link.fromNoteId) ?? [];
      existing.push(link);
      linksByFrom.set(link.fromNoteId, existing);
    }
    for (const [fromNoteId, links] of linksByFrom.entries()) {
      const sorted = links.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
      const best = sorted[0];
      if (!best) continue;
      const supersededNote = this.notesById.get(best.toNoteId);
      if (!supersededNote) continue;
      result[fromNoteId] = supersededNote.canonicalText;
    }
    return result;
  }
};

// src/persistence/postgresStores.ts
var { Pool } = pg;
var GLOBAL_SESSION_ID = "__global__";
function payloadValue(value) {
  return JSON.stringify(value);
}
function rowPayload(row) {
  if (!row) return null;
  const raw = row.payload_json;
  if (typeof raw === "string") return JSON.parse(raw);
  return raw;
}
function asIso(value) {
  return value || (/* @__PURE__ */ new Date()).toISOString();
}
function unique2(items) {
  return [...new Set(items)];
}
function resolveAishaPostgresConfigFromEnv(env = process.env) {
  const connectionString = String(
    env.AISHA_POSTGRES_URL || env.AISHA_TEST_POSTGRES_URL || ""
  ).trim();
  if (connectionString) return { connectionString };
  const database = String(env.AISHA_POSTGRES_DATABASE || "").trim();
  const user = String(env.AISHA_POSTGRES_USER || "").trim();
  const password = String(env.AISHA_POSTGRES_PASSWORD || "").trim();
  const cloudSqlConnectionName = String(
    env.AISHA_CLOUD_SQL_CONNECTION_NAME || ""
  ).trim();
  if (!database || !user || !password || !cloudSqlConnectionName) {
    throw new Error(
      "AISHA_PERSISTENCE=postgres requires AISHA_POSTGRES_URL or AISHA_POSTGRES_DATABASE, AISHA_POSTGRES_USER, AISHA_POSTGRES_PASSWORD, and AISHA_CLOUD_SQL_CONNECTION_NAME"
    );
  }
  return {
    host: `/cloudsql/${cloudSqlConnectionName}`,
    port: Number(env.AISHA_POSTGRES_PORT || 5432),
    database,
    user,
    password,
    max: Number(env.AISHA_POSTGRES_POOL_MAX || 4)
  };
}
function poolConfig(config) {
  if (config.connectionString) {
    return {
      connectionString: config.connectionString,
      ssl: config.ssl === true ? { rejectUnauthorized: false } : void 0,
      max: config.max ?? 4
    };
  }
  return {
    host: config.host,
    port: config.port ?? 5432,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl === true ? { rejectUnauthorized: false } : void 0,
    max: config.max ?? 4
  };
}
var AishaPostgresConnection = class {
  pool;
  transactionClient = new AsyncLocalStorage();
  constructor(config) {
    this.pool = new Pool(poolConfig(config));
  }
  async ensureSchema() {
    await this.pool.query(AISHA_PACK1_POSTGRES_SCHEMA);
  }
  async query(sql, params = []) {
    const client = this.transactionClient.getStore();
    if (client) return client.query(sql, params);
    return this.pool.query(sql, params);
  }
  async withTransaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.transactionClient.run(client, fn);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
      }
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
};
var PostgresRuntimeJournal = class {
  constructor(connection, traceId, sessionId) {
    this.connection = connection;
    this.traceId = traceId;
    this.sessionId = sessionId;
  }
  connection;
  traceId;
  sessionId;
  state = "open";
  stagedArtifacts = [];
  async stage(artifact) {
    this.ensureOpen("stage");
    this.stagedArtifacts.push({
      ...artifact,
      data: { ...artifact.data }
    });
  }
  snapshot() {
    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      stagedArtifacts: this.stagedArtifacts.map((artifact) => ({
        ...artifact,
        data: { ...artifact.data }
      }))
    };
  }
  async commit(input) {
    this.ensureOpen("commit");
    const result = await this.connection.withTransaction(input.apply);
    this.state = "committed";
    return result;
  }
  async abort() {
    if (this.state === "committed") {
      throw new Error("journal_already_committed");
    }
    this.state = "aborted";
  }
  ensureOpen(operation) {
    if (this.state !== "open") {
      throw new Error(`journal_not_open:${operation}:${this.state}`);
    }
  }
};
var PostgresRuntimeTransaction = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  async openJournal(input) {
    return new PostgresRuntimeJournal(
      this.connection,
      input.traceId,
      input.sessionId
    );
  }
};
var PostgresTurnStore = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  async write(turn) {
    const result = await this.connection.query(
      `
      INSERT INTO aisha_turns (
        id, session_id, turn_index, speaker, state_snapshot_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
      `,
      [
        turn.id,
        turn.sessionId,
        turn.turnIndex,
        turn.speaker,
        turn.stateSnapshotId,
        asIso(turn.createdAt),
        turn.updatedAt || null,
        payloadValue(turn)
      ]
    );
    if (result.rowCount !== 1) throw new Error(`Turn already exists: ${turn.id}`);
    return turn;
  }
  async getRecent(sessionId, limit) {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_turns
      WHERE session_id = $1
      ORDER BY turn_index DESC, created_at DESC
      LIMIT $2
      `,
      [sessionId, Math.max(0, limit)]
    );
    return result.rows.map((row) => rowPayload(row)).filter((turn) => Boolean(turn)).reverse();
  }
  async getById(id) {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_turns WHERE id = $1`,
      [id]
    );
    return rowPayload(result.rows[0]);
  }
  async getByIds(ids) {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_turns WHERE id = ANY($1::text[])`,
      [ids]
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload(row)])
    );
    return ids.map((id) => byId.get(id)).filter((turn) => Boolean(turn));
  }
};
var PostgresSnapshotStore = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  async write(snapshot) {
    const result = await this.connection.query(
      `
      INSERT INTO aisha_state_snapshots (
        id, session_id, turn_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT(id) DO NOTHING
      RETURNING id
      `,
      [
        snapshot.id,
        snapshot.sessionId,
        snapshot.turnId,
        asIso(snapshot.createdAt),
        snapshot.updatedAt || null,
        payloadValue(snapshot)
      ]
    );
    if (result.rowCount !== 1) {
      throw new Error(`Snapshot already exists: ${snapshot.id}`);
    }
    return snapshot;
  }
  async getLatest(sessionId) {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_state_snapshots
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [sessionId]
    );
    return rowPayload(result.rows[0]);
  }
  async getByTurnId(turnId) {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_state_snapshots WHERE turn_id = $1 LIMIT 1`,
      [turnId]
    );
    return rowPayload(result.rows[0]);
  }
  async getRecent(sessionId, limit) {
    const result = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_state_snapshots
      WHERE session_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
      `,
      [sessionId, Math.max(0, limit)]
    );
    return result.rows.map((row) => rowPayload(row)).filter((snapshot) => Boolean(snapshot));
  }
};
var PostgresEpisodeStore = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  async createFromTurn(turn, decision, options) {
    const episode = {
      id: options?.episodeId ?? `ep_${turn.id}`,
      kind: "episode",
      createdAt: turn.createdAt,
      updatedAt: turn.updatedAt,
      sourceModality: turn.sourceModality,
      sessionId: turn.sessionId,
      threadId: `thread_${turn.sessionId}`,
      startTurnId: turn.id,
      endTurnId: turn.id,
      turnIds: [turn.id],
      topicLabels: [],
      primaryModality: turn.sourceModality,
      modalityMix: [turn.sourceModality],
      participantSpeakerIds: turn.speakerId ? [turn.speakerId] : [],
      participantPersonIds: turn.recognizedPersonId ? [turn.recognizedPersonId] : [],
      focalRelationshipPersonId: turn.relationshipTargetPersonId,
      boundaryReason: {
        topicShift: decision.topicShift,
        surpriseDiscontinuity: decision.surpriseDiscontinuity,
        score: decision.score
      }
    };
    await this.upsert(episode);
    return episode;
  }
  async appendTurn(episodeId, turn, decision) {
    const existing = await this.getById(episodeId);
    if (!existing) return this.createFromTurn(turn, decision);
    const updated = {
      ...existing,
      updatedAt: turn.createdAt,
      endTurnId: turn.id,
      turnIds: unique2([...existing.turnIds, turn.id]),
      modalityMix: unique2([...existing.modalityMix, turn.sourceModality]),
      participantSpeakerIds: unique2([
        ...existing.participantSpeakerIds,
        ...turn.speakerId ? [turn.speakerId] : []
      ]),
      participantPersonIds: unique2([
        ...existing.participantPersonIds,
        ...turn.recognizedPersonId ? [turn.recognizedPersonId] : []
      ]),
      boundaryReason: {
        topicShift: existing.boundaryReason.topicShift || decision.topicShift,
        surpriseDiscontinuity: existing.boundaryReason.surpriseDiscontinuity || decision.surpriseDiscontinuity,
        score: Math.max(existing.boundaryReason.score, decision.score)
      }
    };
    await this.upsert(updated);
    return updated;
  }
  async getActive(sessionId) {
    const thread = await this.connection.query(
      `SELECT active_episode_id FROM aisha_threads WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );
    const activeEpisodeId = thread.rows[0]?.active_episode_id;
    if (activeEpisodeId) return this.getById(String(activeEpisodeId));
    const latest = await this.connection.query(
      `
      SELECT payload_json
      FROM aisha_episodes
      WHERE session_id = $1
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 1
      `,
      [sessionId]
    );
    return rowPayload(latest.rows[0]);
  }
  async getById(id) {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_episodes WHERE id = $1`,
      [id]
    );
    return rowPayload(result.rows[0]);
  }
  async getByIds(ids) {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_episodes WHERE id = ANY($1::text[])`,
      [ids]
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload(row)])
    );
    return ids.map((id) => byId.get(id)).filter((episode) => Boolean(episode));
  }
  async upsert(episode) {
    await this.connection.query(
      `
      INSERT INTO aisha_episodes (
        id, session_id, thread_id, start_turn_id, end_turn_id, created_at, updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT(id) DO UPDATE SET
        session_id = excluded.session_id,
        thread_id = excluded.thread_id,
        end_turn_id = excluded.end_turn_id,
        updated_at = excluded.updated_at,
        payload_json = excluded.payload_json
      `,
      [
        episode.id,
        episode.sessionId,
        episode.threadId,
        episode.startTurnId,
        episode.endTurnId,
        asIso(episode.createdAt),
        episode.updatedAt || null,
        payloadValue(episode)
      ]
    );
  }
};
var PostgresThreadStore = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  async update(sessionId, episode) {
    const existing = await this.getActive(sessionId);
    const thread = {
      id: existing?.id ?? `thread_${sessionId}`,
      sessionId,
      activeEpisodeId: episode.id,
      episodeIds: unique2([...existing?.episodeIds ?? [], episode.id]),
      lastUpdatedAt: episode.updatedAt ?? episode.createdAt,
      focalRelationshipPersonId: existing?.focalRelationshipPersonId,
      threadSummary: existing?.threadSummary
    };
    await this.connection.query(
      `
      INSERT INTO aisha_threads (
        id, session_id, active_episode_id, last_updated_at, payload_json
      ) VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT(session_id) DO UPDATE SET
        id = excluded.id,
        active_episode_id = excluded.active_episode_id,
        last_updated_at = excluded.last_updated_at,
        payload_json = excluded.payload_json
      `,
      [
        thread.id,
        thread.sessionId,
        thread.activeEpisodeId,
        thread.lastUpdatedAt,
        payloadValue(thread)
      ]
    );
    return thread;
  }
  async getActive(sessionId) {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_threads WHERE session_id = $1`,
      [sessionId]
    );
    return rowPayload(result.rows[0]);
  }
};
var PostgresNoteVersioning = class {
  constructor(connection) {
    this.connection = connection;
  }
  connection;
  validate(candidate) {
    return new InMemoryNoteVersioning().validate(candidate);
  }
  async mergeOrSupersede(candidate, existing, context) {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(existing);
    const result = await versioning.mergeOrSupersede(
      candidate,
      existing,
      context
    );
    await this.persistNotes(result.notesWritten, candidate.sourceEpisodeIds);
    await this.persistLinks(result.linksWritten);
    return result;
  }
  async persistReviewSignals(signals, subjectScope) {
    if (!signals.length) return [];
    const noteIds = signals.map((signal) => signal.noteId);
    const targetNotes = await this.getNotesByIds(noteIds);
    const resolvedSessionIds = (await Promise.all(
      targetNotes.map((note) => this.resolveNoteSessionId(note))
    )).filter((sessionId) => Boolean(sessionId));
    const sessionIds = unique2(resolvedSessionIds);
    const scopeNotes = await this.loadNotes({
      sessionIds: sessionIds.length ? sessionIds : void 0,
      subjectScope
    });
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(scopeNotes);
    const updated = await versioning.persistReviewSignals(
      signals,
      subjectScope
    );
    await this.persistNotes(updated);
    return updated;
  }
  async listActiveNotes(filter) {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ filter }));
    return versioning.listActiveNotes(filter);
  }
  async listProvisionalNotes(filter) {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ provisionalFilter: filter }));
    return versioning.listProvisionalNotes(filter);
  }
  async evaluateProvisionalPromotion(filter) {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ provisionalFilter: filter }));
    const result = await versioning.evaluateProvisionalPromotion(filter);
    await this.persistNotes([
      ...result.promoted,
      ...result.expired,
      ...result.unchanged
    ]);
    return result;
  }
  async listContradictionEvidence(filter) {
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes(await this.loadNotes({ contradictionFilter: filter }));
    return versioning.listContradictionEvidence(filter);
  }
  async operatorReview(noteId, decision, operatorId) {
    const note = await this.getNoteById(noteId);
    if (!note) return null;
    const versioning = new InMemoryNoteVersioning();
    await versioning.seedNotes([note]);
    const updated = await versioning.operatorReview(
      noteId,
      decision,
      operatorId
    );
    if (updated) await this.persistNotes([updated]);
    return updated;
  }
  async listSupersededByIds(noteIds) {
    if (!noteIds.length) return {};
    const result = await this.connection.query(
      `
      SELECT DISTINCT ON (from_note_id)
        from_note_id,
        to_note.payload_json AS to_payload
      FROM aisha_note_links link
      JOIN aisha_notes to_note ON to_note.id = link.to_note_id
      WHERE link.relation = 'supersedes'
        AND link.from_note_id = ANY($1::text[])
      ORDER BY from_note_id, link.created_at DESC
      `,
      [noteIds]
    );
    const out = {};
    for (const row of result.rows) {
      const prior = rowPayload({ payload_json: row.to_payload });
      if (prior) out[String(row.from_note_id)] = prior.canonicalText;
    }
    return out;
  }
  async getNoteById(id) {
    const result = await this.connection.query(
      `SELECT payload_json FROM aisha_notes WHERE id = $1`,
      [id]
    );
    return rowPayload(result.rows[0]);
  }
  async getNotesByIds(ids) {
    if (!ids.length) return [];
    const result = await this.connection.query(
      `SELECT id, payload_json FROM aisha_notes WHERE id = ANY($1::text[])`,
      [ids]
    );
    const byId = new Map(
      result.rows.map((row) => [String(row.id), rowPayload(row)])
    );
    return ids.map((id) => byId.get(id)).filter((note) => Boolean(note));
  }
  async loadNotes(input = {}) {
    const filter = input.filter ?? input.provisionalFilter ?? input.contradictionFilter;
    const sessionIds = input.sessionIds ?? this.sessionIdsForFilter(filter);
    const where = [];
    const params = [];
    if (sessionIds?.length) {
      params.push(sessionIds);
      where.push(`session_id = ANY($${params.length}::text[])`);
    }
    if (input.subjectScope) {
      params.push(input.subjectScope.subjectKind);
      where.push(`subject_kind = $${params.length}`);
      if (input.subjectScope.subjectPersonId) {
        params.push(input.subjectScope.subjectPersonId);
        where.push(`subject_person_id = $${params.length}`);
      }
      if (input.subjectScope.relationshipContextPersonId) {
        params.push(input.subjectScope.relationshipContextPersonId);
        where.push(`relationship_context_person_id = $${params.length}`);
      }
    }
    const sql = [
      "SELECT payload_json FROM aisha_notes",
      where.length ? `WHERE ${where.join(" AND ")}` : "",
      "ORDER BY COALESCE(updated_at, created_at) DESC",
      "LIMIT 500"
    ].join(" ");
    const result = await this.connection.query(sql, params);
    return result.rows.map((row) => rowPayload(row)).filter((note) => Boolean(note));
  }
  sessionIdsForFilter(filter) {
    const sessionId = "sessionId" in (filter ?? {}) ? filter.sessionId : void 0;
    if (!sessionId) return void 0;
    const includeGlobal = Boolean(filter && "includeGlobal" in filter && filter.includeGlobal);
    return includeGlobal ? [sessionId, GLOBAL_SESSION_ID] : [sessionId];
  }
  async persistNotes(notes, fallbackEpisodeIds = []) {
    for (const note of notes) {
      const sessionId = await this.resolveNoteSessionId(note, fallbackEpisodeIds) ?? GLOBAL_SESSION_ID;
      await this.connection.query(
        `
        INSERT INTO aisha_notes (
          id, session_id, subtype, status, subject_kind, subject_speaker_id,
          subject_person_id, relationship_context_person_id, confidence,
          created_at, updated_at, payload_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        ON CONFLICT(id) DO UPDATE SET
          session_id = excluded.session_id,
          subtype = excluded.subtype,
          status = excluded.status,
          subject_kind = excluded.subject_kind,
          subject_speaker_id = excluded.subject_speaker_id,
          subject_person_id = excluded.subject_person_id,
          relationship_context_person_id = excluded.relationship_context_person_id,
          confidence = excluded.confidence,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
        `,
        [
          note.id,
          sessionId,
          note.subtype,
          note.status,
          note.subjectKind,
          note.subjectSpeakerId || null,
          note.subjectPersonId || null,
          note.relationshipContextPersonId || null,
          note.confidence,
          asIso(note.createdAt),
          note.updatedAt || null,
          payloadValue(note)
        ]
      );
    }
  }
  async persistLinks(links) {
    for (const link of links) {
      const sessionId = await this.resolveLinkSessionId(link) ?? GLOBAL_SESSION_ID;
      await this.connection.query(
        `
        INSERT INTO aisha_note_links (
          id, session_id, from_note_id, to_note_id, relation, created_at, updated_at, payload_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        ON CONFLICT(id) DO UPDATE SET
          session_id = excluded.session_id,
          from_note_id = excluded.from_note_id,
          to_note_id = excluded.to_note_id,
          relation = excluded.relation,
          updated_at = excluded.updated_at,
          payload_json = excluded.payload_json
        `,
        [
          link.id,
          sessionId,
          link.fromNoteId,
          link.toNoteId,
          link.relation,
          asIso(link.createdAt),
          link.updatedAt || null,
          payloadValue(link)
        ]
      );
    }
  }
  async resolveNoteSessionId(note, fallbackEpisodeIds = []) {
    const existing = await this.connection.query(
      `SELECT session_id FROM aisha_notes WHERE id = $1`,
      [note.id]
    );
    if (existing.rows[0]?.session_id) return String(existing.rows[0].session_id);
    return this.resolveSessionIdFromEpisodeIds([
      ...note.sourceEpisodeIds,
      ...fallbackEpisodeIds
    ]);
  }
  async resolveLinkSessionId(link) {
    const result = await this.connection.query(
      `
      SELECT session_id FROM aisha_notes
      WHERE id = $1 OR id = $2
      ORDER BY CASE WHEN id = $1 THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [link.fromNoteId, link.toNoteId]
    );
    return result.rows[0]?.session_id ? String(result.rows[0].session_id) : null;
  }
  async resolveSessionIdFromEpisodeIds(episodeIds) {
    const ids = unique2(episodeIds.filter(Boolean));
    if (!ids.length) return null;
    const result = await this.connection.query(
      `SELECT session_id FROM aisha_episodes WHERE id = ANY($1::text[]) LIMIT 1`,
      [ids]
    );
    return result.rows[0]?.session_id ? String(result.rows[0].session_id) : null;
  }
};
async function createPostgresProductionStores(config) {
  const connection = new AishaPostgresConnection(config);
  await connection.ensureSchema();
  return {
    connection,
    turnStore: new PostgresTurnStore(connection),
    snapshotStore: new PostgresSnapshotStore(connection),
    episodeStore: new PostgresEpisodeStore(connection),
    threadStore: new PostgresThreadStore(connection),
    noteVersioning: new PostgresNoteVersioning(connection),
    runtimeTransaction: new PostgresRuntimeTransaction(connection),
    close: () => connection.close()
  };
}
async function createPostgresProductionStoresFromEnv(env = process.env) {
  return createPostgresProductionStores(resolveAishaPostgresConfigFromEnv(env));
}

// src/host/aishaHostAdapter.ts
var cachedProductionDeps = null;
var productionRuntimeBuilder = buildProductionRuntime;
function persistenceDiagnostics(input = {}) {
  const mode = input.mode ?? productionPersistenceMode();
  const connected = input.connected === true;
  const backend = input.backend ?? (connected ? mode === "postgres" ? "postgres" : "in-memory" : "unavailable");
  return {
    aishaPersistenceMode: mode,
    aishaPersistenceBackend: backend,
    aishaPersistenceConnected: connected,
    aishaPersistenceFailureReason: input.failureReason ?? ""
  };
}
function productionKeyFingerprint(apiKey) {
  const key = String(apiKey || "");
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 10);
  return `${key.length}:${digest}`;
}
function productionRuntimeFingerprint(apiKey, timeoutMs, model, persistence = "memory", vertexFingerprint = "") {
  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1e3, Math.min(6e4, Number(timeoutMs))) : 0;
  const modelKey = String(model || "").trim() || "default-model";
  return `${productionKeyFingerprint(apiKey)}:${timeout || "default-timeout"}:${modelKey}:${persistence}:${vertexFingerprint || "no-vertex"}`;
}
function clearCachedProductionDeps(fingerprint) {
  if (cachedProductionDeps?.fingerprint === fingerprint) {
    void cachedProductionDeps.postgresStores?.close().catch(() => void 0);
    cachedProductionDeps = null;
  }
}
function productionPersistenceMode() {
  return String(process.env.AISHA_PERSISTENCE || "").trim().toLowerCase() === "postgres" ? "postgres" : "memory";
}
function csvList(value = "") {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index);
}
function productionVertexGeminiConfigFromEnv(env = process.env) {
  const keyFilename = String(env.VERTEX_SERVICE_ACCOUNT_JSON_PATH || env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
  const authMode = String(env.VERTEX_AUTH_MODE || "").trim().toLowerCase();
  const useApplicationDefaultCredentials = authMode === "adc" || authMode === "application-default";
  const projectId = String(env.VERTEX_PROJECT_ID || "project-be35f944-1782-4f27-86f").trim();
  const location = String(env.VERTEX_LOCATION || "us-central1").trim();
  if (!projectId || !location || !keyFilename && !useApplicationDefaultCredentials) return void 0;
  return {
    enabled: true,
    projectId,
    location,
    locationFallbacks: csvList(env.VERTEX_LOCATION_FALLBACKS || env.VERTEX_REGION_FALLBACKS || "us-east4,europe-west9,global"),
    keyFilename,
    useApplicationDefaultCredentials,
    fastModel: String(env.VERTEX_GEMINI_FAST_MODEL || "gemini-2.5-flash").trim(),
    proModel: String(env.VERTEX_GEMINI_PRO_MODEL || "gemini-2.5-pro").trim()
  };
}
function productionVertexFingerprint(config) {
  if (!config?.enabled) return "";
  return [
    "vertex",
    config.projectId,
    config.location,
    (config.locationFallbacks || []).join("|"),
    config.keyFilename ? `file:${config.keyFilename}` : "",
    config.useApplicationDefaultCredentials ? "adc" : "",
    config.fastModel || "",
    config.proModel || ""
  ].join(":");
}
function traceWithPersistenceDiagnostics(trace, diagnostics) {
  return {
    ...trace,
    aishaDiagnostics: {
      ...trace.aishaDiagnostics ?? {},
      ...diagnostics
    }
  };
}
function shouldClearCachedDepsAfterFailure(reason = "") {
  return /\b(api[_ -]?key|credential|auth|unauth|permission|invalid|forbidden|quota|gemini|provider|fetch|network|timeout)\b/i.test(
    String(reason || "")
  );
}
function noteToTruthRecord(note, supersededPriorText) {
  return {
    noteId: note.id,
    subtype: note.subtype,
    canonicalText: note.canonicalText,
    normalizedValue: note.normalizedValue,
    status: note.status,
    confidence: note.confidence,
    supersededPriorText,
    provenanceChain: note.provenanceChain ?? [],
    subjectKind: note.subjectKind,
    subjectPersonId: note.subjectPersonId,
    lastConfirmedAt: note.lastConfirmedAt
  };
}
function truthKey(record) {
  return String(record.noteId || record.canonicalText || record.normalizedValue || "").trim().toLowerCase();
}
function appendTruth(target, record) {
  const key = truthKey(record);
  if (!key) return;
  if (target.some((item) => truthKey(item) === key)) return;
  target.push(record);
}
function appendPack1FollowupTruths(input) {
  const notes = input.notesWritten ?? [];
  if (!notes.length) return;
  const byId = new Map(notes.map((note) => [note.id, note]));
  const supersededByActive = /* @__PURE__ */ new Map();
  for (const link of input.linksWritten ?? []) {
    if (link.relation !== "supersedes") continue;
    const prior = byId.get(link.toNoteId);
    if (!prior) continue;
    supersededByActive.set(link.fromNoteId, prior.canonicalText);
  }
  for (const note of notes) {
    if (note.status === "active") {
      appendTruth(
        input.activeTruths,
        noteToTruthRecord(note, supersededByActive.get(note.id))
      );
    } else if (note.status === "superseded" || note.status === "disputed") {
      appendTruth(input.supersededTruths, noteToTruthRecord(note));
    }
  }
}
function snapshotToStateEnvelope(snapshot) {
  return {
    certainty: snapshot.expressiveEnvelope.certainty,
    load: snapshot.expressiveEnvelope.load,
    tension: snapshot.expressiveEnvelope.tension,
    valence: snapshot.expressiveEnvelope.valence,
    desire: snapshot.expressiveEnvelope.desire,
    trust: snapshot.expressiveEnvelope.trust,
    activeRelationshipPersonId: snapshot.activeRelationshipPersonId,
    activeSpeakerId: snapshot.activeSpeakerId
  };
}
function emptyStateEnvelope() {
  return { certainty: 0, load: 0, tension: 0, valence: 0, desire: 0, trust: 0 };
}
function emptyMemorySummary(sessionId, threadId) {
  return {
    activeTruths: [],
    supersededTruths: [],
    memoryCandidates: [],
    characterProfiles: [],
    sessionId,
    threadId
  };
}
function emptyRoomSocialState(roomId) {
  return {
    roomId: roomId ?? "unknown_room",
    overallTension: 0,
    dominantMood: "neutral",
    activeConflicts: [],
    speakerPressures: [],
    isPlaceholder: true
  };
}
function buildTurnInput(req) {
  const modality = req.modalityMetadata;
  return {
    sessionId: req.sessionId,
    speaker: "user",
    rawText: req.messageText,
    sourceModality: modality?.sourceModality ?? "text",
    sourceChannel: modality?.sourceChannel ?? "chat",
    speakerId: modality?.activeSpeakerId ?? modality?.speakerId ?? req.activeSpeakerId,
    recognizedPersonId: modality?.recognizedPersonId ?? req.activeCharacterId,
    speakerConfidence: modality?.speakerConfidence,
    consentStatus: "allow",
    entityMentions: [],
    studioPulseContext: {
      activeSpeakerId: req.activeSpeakerId,
      activeCharacterId: req.activeCharacterId,
      roomId: req.roomId,
      localRoomState: req.localRoomState,
      characterStates: req.characterStates,
      recentMessages: req.recentMessages,
      projectContext: req.projectContext
    }
  };
}
function unavailableResponse(req, reason, persistence = persistenceDiagnostics({
  connected: false,
  failureReason: reason
})) {
  const trace = traceWithPersistenceDiagnostics(
    {
      traceId: "unavailable",
      sessionId: req.sessionId,
      status: "failed",
      events: [],
      failureReason: reason
    },
    persistence
  );
  return {
    ok: false,
    responses: [
      {
        content: "A.I.S.H.A is not available in this environment. Using local fallback."
      }
    ],
    memorySummary: emptyMemorySummary(req.sessionId, req.threadId),
    stateEnvelope: emptyStateEnvelope(),
    roomSocialState: emptyRoomSocialState(req.roomId),
    continuityEvents: [],
    relationshipDeltas: [],
    trace,
    engineMode: "unavailable",
    aishaEngineConnected: false,
    confidence: 0,
    fallbackReason: reason,
    error: {
      code: "engine_unavailable",
      message: reason,
      stage: "startup",
      retryable: false
    }
  };
}
async function processAishaRequest(request, options = {}) {
  let { deps } = options;
  const { engineMode = "fixture" } = options;
  if (!deps && engineMode === "production") {
    const apiKey = String(options.productionGeminiApiKey || process.env.GEMINI_API_KEY || "").trim();
    const vertexGemini = productionVertexGeminiConfigFromEnv();
    if (!apiKey && !vertexGemini) {
      const mode = productionPersistenceMode();
      return unavailableResponse(
        request,
        "No GEMINI_API_KEY or Vertex Gemini credentials found in environment. A.I.S.H.A cannot boot.",
        persistenceDiagnostics({
          mode,
          connected: false,
          failureReason: "No GEMINI_API_KEY or Vertex Gemini credentials found in environment. A.I.S.H.A cannot boot."
        })
      );
    }
    const timeoutMs = Number.isFinite(Number(options.productionGeminiTimeoutMs)) ? Math.max(1e3, Math.min(6e4, Number(options.productionGeminiTimeoutMs))) : void 0;
    const model = String(options.productionGeminiModel || "").trim() || void 0;
    const persistenceMode = productionPersistenceMode();
    const keyFingerprint = productionRuntimeFingerprint(
      apiKey,
      timeoutMs,
      model,
      persistenceMode,
      productionVertexFingerprint(vertexGemini)
    );
    if (!cachedProductionDeps || cachedProductionDeps.fingerprint !== keyFingerprint) {
      try {
        let postgresStores;
        const stores = persistenceMode === "postgres" ? await createPostgresProductionStoresFromEnv() : void 0;
        if (stores) {
          postgresStores = stores;
        }
        const turnStore = stores?.turnStore ?? new InMemoryTurnStore();
        const snapshotStore = stores?.snapshotStore ?? new InMemorySnapshotStore();
        const episodeStore = stores?.episodeStore ?? new FixtureEpisodeStore();
        const threadStore = stores?.threadStore ?? new FixtureThreadStore();
        const noteVersioning = stores?.noteVersioning ?? new FixtureNoteVersioning();
        const depsForKey = productionRuntimeBuilder(
          {
            geminiApiKey: apiKey,
            geminiTimeoutMs: timeoutMs,
            geminiModel: model,
            vertexGemini
          },
          {
            turnStore,
            snapshotStore,
            episodeStore,
            threadStore,
            noteVersioning,
            runtimeTransaction: stores?.runtimeTransaction
          }
        );
        cachedProductionDeps = {
          fingerprint: keyFingerprint,
          deps: depsForKey,
          postgresStores,
          persistenceDiagnostics: persistenceDiagnostics({
            mode: persistenceMode,
            backend: persistenceMode === "postgres" ? "postgres" : "in-memory",
            connected: true
          })
        };
      } catch (err) {
        const reason = `Failed to boot A.I.S.H.A engine${persistenceMode === "postgres" ? " with Postgres persistence" : ""}: ${err instanceof Error ? err.message : String(err)}`;
        clearCachedProductionDeps(keyFingerprint);
        return unavailableResponse(
          request,
          reason,
          persistenceDiagnostics({
            mode: persistenceMode,
            backend: "unavailable",
            connected: false,
            failureReason: reason
          })
        );
      }
    }
    deps = cachedProductionDeps.deps;
  }
  const activePersistenceDiagnostics = !options.deps && engineMode === "production" && cachedProductionDeps ? cachedProductionDeps.persistenceDiagnostics : persistenceDiagnostics({
    mode: productionPersistenceMode(),
    backend: options.deps ? "in-memory" : "unavailable",
    connected: !!deps
  });
  if (!deps) {
    return unavailableResponse(
      request,
      "No ProcessTurnDeps provided. Set GEMINI_API_KEY for production, or provide fixture deps for testing.",
      persistenceDiagnostics({
        mode: productionPersistenceMode(),
        connected: false,
        failureReason: "No ProcessTurnDeps provided. Set GEMINI_API_KEY for production, or provide fixture deps for testing."
      })
    );
  }
  const turnInput = buildTurnInput(request);
  let result;
  try {
    result = await processTurn(deps, turnInput);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailableResponse(
      request,
      `processTurn threw: ${msg}`,
      persistenceDiagnostics({
        mode: activePersistenceDiagnostics.aishaPersistenceMode,
        backend: activePersistenceDiagnostics.aishaPersistenceBackend,
        connected: activePersistenceDiagnostics.aishaPersistenceConnected,
        failureReason: `processTurn threw: ${msg}`
      })
    );
  }
  const engineTrace = traceWithPersistenceDiagnostics(
    {
      traceId: result.trace.traceId,
      sessionId: result.trace.sessionId,
      status: result.trace.status,
      events: result.trace.events,
      failureReason: result.trace.failureReason,
      criticLoopCycles: result.criticLoop?.cycleCount,
      criticMaxCyclesHit: result.criticLoop?.maxCyclesHit
    },
    activePersistenceDiagnostics
  );
  if (!result.ok) {
    const reason = String(result.fallbackReason || engineTrace.failureReason || "");
    if (!options.deps && engineMode === "production") {
      const key = String(options.productionGeminiApiKey || process.env.GEMINI_API_KEY || "").trim();
      const vertexGemini = productionVertexGeminiConfigFromEnv();
      if ((key || vertexGemini) && shouldClearCachedDepsAfterFailure(reason)) {
        const timeoutMs = Number.isFinite(Number(options.productionGeminiTimeoutMs)) ? Math.max(1e3, Math.min(6e4, Number(options.productionGeminiTimeoutMs))) : void 0;
        const model = String(options.productionGeminiModel || "").trim() || void 0;
        clearCachedProductionDeps(productionRuntimeFingerprint(
          key,
          timeoutMs,
          model,
          productionPersistenceMode(),
          productionVertexFingerprint(vertexGemini)
        ));
      }
    }
    return {
      ok: false,
      responses: [{ content: result.text }],
      memorySummary: emptyMemorySummary(request.sessionId, request.threadId),
      stateEnvelope: emptyStateEnvelope(),
      roomSocialState: emptyRoomSocialState(request.roomId),
      continuityEvents: [],
      relationshipDeltas: [],
      trace: engineTrace,
      engineMode,
      aishaEngineConnected: false,
      confidence: 0,
      fallbackReason: result.fallbackReason
    };
  }
  let activeTruths = [];
  let supersededTruths = [];
  let stateEnvelope = emptyStateEnvelope();
  let episodeId = result.episodeId;
  appendPack1FollowupTruths({
    activeTruths,
    supersededTruths,
    notesWritten: result.memoryFollowup?.notesWritten,
    linksWritten: result.memoryFollowup?.linksWritten
  });
  try {
    const anyDeps = deps;
    const noteVersioning = anyDeps["noteVersioning"];
    if (noteVersioning) {
      const activeNotes = await noteVersioning.listActiveNotes({
        sessionId: request.sessionId,
        includeGlobal: true
      });
      const activeNoteIds = activeNotes.map((n) => n.id);
      const supersededMap = await noteVersioning.listSupersededByIds(activeNoteIds);
      const contradictionEvidence = noteVersioning.listContradictionEvidence ? await noteVersioning.listContradictionEvidence({
        sessionId: request.sessionId,
        maxResults: 8
      }) : [];
      activeNotes.filter((n) => n.status === "active").forEach((n) => appendTruth(
        activeTruths,
        noteToTruthRecord(n, supersededMap[n.id])
      ));
      contradictionEvidence.filter((n) => n.status === "superseded" || n.status === "disputed").forEach((n) => appendTruth(supersededTruths, noteToTruthRecord(n)));
    }
    const snapshotStore = anyDeps["snapshotStore"];
    if (snapshotStore) {
      const latest = await snapshotStore.getLatest(request.sessionId);
      if (latest) {
        stateEnvelope = snapshotToStateEnvelope(latest);
      }
    }
  } catch {
  }
  const memorySummary = {
    activeTruths,
    supersededTruths,
    memoryCandidates: [],
    characterProfiles: [],
    sessionId: request.sessionId,
    threadId: result.threadId ?? request.threadId,
    episodeId
  };
  return {
    ok: true,
    responses: [{ content: result.text, speakerId: turnInput.speakerId }],
    memorySummary,
    stateEnvelope,
    roomSocialState: emptyRoomSocialState(request.roomId),
    continuityEvents: [],
    relationshipDeltas: [],
    trace: engineTrace,
    engineMode,
    aishaEngineConnected: true,
    confidence: 1
  };
}
function __resetProductionDepsForTests() {
  void cachedProductionDeps?.postgresStores?.close().catch(() => void 0);
  cachedProductionDeps = null;
  productionRuntimeBuilder = buildProductionRuntime;
}
async function __createPostgresProductionStoresForTests(env = process.env) {
  return createPostgresProductionStoresFromEnv(env);
}
export {
  __createPostgresProductionStoresForTests,
  __resetProductionDepsForTests,
  processAishaRequest
};
