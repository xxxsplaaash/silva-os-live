const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function iso() {
  return '2026-06-02T12:00:00.000Z';
}

function note(id, canonicalText, status = 'active') {
  return {
    id,
    kind: 'note',
    subtype: 'K_pref',
    canonicalText,
    normalizedValue: canonicalText.toLowerCase(),
    status,
    confidence: status === 'active' ? 0.91 : 0.74,
    extractionConfidenceRaw: status === 'active' ? 0.91 : 0.74,
    provenanceChain: [`turn:${id}`],
    subjectKind: 'user',
    sourceEpisodeIds: ['episode_1'],
    provenanceReason: 'host_boundary_test',
    consentStatus: 'allow',
    reviewState: 'accepted',
    reinferencePolicy: { mode: 'allow' },
    createdAt: iso(),
    updatedAt: iso(),
    lastConfirmedAt: iso(),
    immutable: true,
  };
}

function createTrace(traceId, sessionId) {
  const events = [];
  let status = 'running';
  let failureReason = '';
  return {
    add(event) {
      events.push(event);
    },
    succeed() {
      status = 'succeeded';
    },
    fail(reason) {
      status = 'failed';
      failureReason = String(reason || '');
    },
    snapshot() {
      return { traceId, sessionId, status, events, failureReason };
    },
  };
}

function createDeps({ generatorInputs, writtenTurns }) {
  let counter = 0;
  const activeNote = note('note_active_dashboard', 'User dashboard preference: pale blue with no red accents', 'active');
  const supersededNote = note('note_old_dashboard', 'User dashboard preference: obsidian with one red accent', 'superseded');

  return {
    clock: { nowIso: iso },
    idGenerator: {
      next(prefix) {
        counter += 1;
        return `${prefix}_${counter}`;
      },
    },
    traceFactory: {
      create({ traceId, sessionId }) {
        return createTrace(traceId, sessionId);
      },
    },
    transaction: {
      async openJournal() {
        return {
          async stage() {},
          async commit({ apply }) {
            return apply();
          },
        };
      },
    },
    rollback: {
      async rollback() {},
    },
    fallback: {
      async build() {
        return { text: 'fallback', fallbackReason: 'test_fallback' };
      },
    },
    snapshotStore: {
      async getLatest() { return null; },
      async write(snapshot) { return snapshot; },
    },
    turnStore: {
      async getRecent() { return []; },
      async write(turn) {
        writtenTurns.push(turn);
        return turn;
      },
    },
    episodeStore: {
      async getActive() { return null; },
      async createFromTurn(turn, decision, options = {}) {
        return {
          id: options.episodeId || 'episode_1',
          kind: 'episode',
          createdAt: iso(),
          updatedAt: iso(),
          sourceModality: turn.sourceModality,
          consentStatus: 'allow',
          sessionId: turn.sessionId,
          threadId: `thread_${turn.sessionId}`,
          startTurnId: turn.id,
          endTurnId: turn.id,
          turnIds: [turn.id],
          topicLabels: [],
          primaryModality: turn.sourceModality,
          modalityMix: [turn.sourceModality],
          participantSpeakerIds: [turn.speakerId || 'user'],
          participantPersonIds: [],
          boundaryReason: decision,
        };
      },
      async appendTurn() { throw new Error('appendTurn should not be used in this fixture'); },
      async getByIds() { return []; },
    },
    threadStore: {
      async getActive() { return null; },
      async update(sessionId, episode) {
        return {
          id: episode.threadId,
          sessionId,
          activeEpisodeId: episode.id,
          episodeIds: [episode.id],
          lastUpdatedAt: iso(),
        };
      },
    },
    stateEngine: {
      async update() {
        return {
          compounds: {},
          relationshipVectors: {},
          practicalActionBias: {},
          expressiveEnvelope: {
            certainty: 0.5,
            load: 0.2,
            tension: 0.2,
            valence: 0,
            desire: 0.3,
            trust: 0.7,
          },
        };
      },
    },
    episodeBoundary: {
      decide() {
        return {
          split: true,
          topicShift: false,
          surpriseDiscontinuity: false,
          score: 0.1,
          reasons: ['host_boundary_test'],
        };
      },
    },
    retrievalPlanner: {
      async build() {
        return {
          recentTurns: [],
          activeThread: [],
          activeNotes: [],
          supportingEpisodes: [],
          contradictionEvidence: [],
          supersessionContext: {},
        };
      },
    },
    contextBuilder: {
      build() {
        return {
          stableNotesBlock: '',
          threadBlock: '',
        };
      },
    },
    generator: {
      async generate(input) {
        generatorInputs.push(input);
        return {
          raw: JSON.stringify({ response_text: 'Durable continuity boundary accepted.' }),
          text: JSON.stringify({ response_text: 'Durable continuity boundary accepted.' }),
          metadata: { structuredOutputKind: 'socialDirectorV1' },
        };
      },
    },
    parser: {
      parse(output) {
        return { text: String(output.text || output.raw || '') };
      },
    },
    validator: {
      validate() {
        return { valid: true, reasons: [] };
      },
    },
    noteVersioning: {
      async listActiveNotes(filter) {
        assert.equal(filter.sessionId, 'pack1-host-boundary-session');
        assert.equal(filter.includeGlobal, true);
        return [activeNote];
      },
      async listSupersededByIds(ids) {
        assert.deepEqual(ids, [activeNote.id]);
        return { [activeNote.id]: supersededNote.canonicalText };
      },
      async listContradictionEvidence(filter) {
        assert.equal(filter.sessionId, 'pack1-host-boundary-session');
        return [supersededNote];
      },
    },
  };
}

test('Pack 1 host separates social-director generator prompt from durable turn text', async () => {
  const { processAishaRequest } = await import('../packages/aisha-runtime-pack1/dist/index.js');
  const generatorInputs = [];
  const writtenTurns = [];
  const deps = createDeps({ generatorInputs, writtenTurns });
  const generatorPrompt = 'SOCIAL DIRECTOR JSON CONTRACT: return roomBeat, speakers, stateUpdates.';
  const userText = 'My dashboard preference is obsidian with one red accent.';

  const response = await processAishaRequest({
    sessionId: 'pack1-host-boundary-session',
    threadId: 'pack1-host-boundary-session',
    roomId: 'studio-pulse-social-director',
    activeSpeakerId: 'aisha',
    activeCharacterId: 'aisha',
    messageText: userText,
    message: userText,
    projectContext: {
      socialDirectorV1: {
        schemaVersion: 'studio-pulse.social-director.v1',
        userMessage: userText,
        generatorPrompt,
        structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
      },
    },
    recentMessages: [],
  }, { deps, engineMode: 'fixture' });

  assert.equal(response.ok, true);
  assert.equal(writtenTurns.length, 1);
  assert.equal(writtenTurns[0].rawText, userText);
  assert.doesNotMatch(writtenTurns[0].rawText, /SOCIAL DIRECTOR|roomBeat|stateUpdates/);
  assert.equal(generatorInputs.length, 1);
  assert.equal(generatorInputs[0].turn.rawText, userText);
  assert.equal(generatorInputs[0].studioPulseContext.projectContext.socialDirectorV1.generatorPrompt, generatorPrompt);
  assert.ok(response.memorySummary.activeTruths.some(item => /pale blue/.test(item.canonicalText)));
  assert.ok(response.memorySummary.activeTruths.some(item => /obsidian/.test(item.supersededPriorText || '')));
  assert.ok(response.memorySummary.supersededTruths.some(item => /obsidian/.test(item.canonicalText)));
});

test('Pack 1 social-director prompt builder prefers generatorPrompt over turn rawText', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts'),
    'utf8'
  );
  assert.match(source, /function socialDirectorGeneratorPrompt/);
  assert.match(source, /socialDirectorGeneratorPrompt\(input\)\s*\?\?/);
  assert.match(source, /readString\(turn,\s*"rawText"\)/);
});

test('Pack 1 extractor and retrieval prioritize durable dashboard slot preferences', () => {
  const extractionSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'memory', 'noteExtractionSandbox.ts'),
    'utf8'
  );
  const retrievalSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'memory', 'retrievalPlanner.ts'),
    'utf8'
  );
  assert.match(extractionSource, /my \[a-z0-9 _-\]\{2,80\} preference is/);
  assert.match(extractionSource, /heuristic_slot_preference_pattern/);
  assert.match(extractionSource, /User \$\{slot\} preference: \$\{cleaned\}/);
  assert.match(retrievalSource, /sessionAffinity/);
  assert.match(retrievalSource, /sessionEpisodeIds\.has\(id\)/);
  assert.match(retrievalSource, /dashboard\|design\|aesthetic/);
});
