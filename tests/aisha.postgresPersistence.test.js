const test = require('node:test');
const assert = require('node:assert/strict');

const DIST_URL = new URL('../packages/aisha-runtime-pack1/dist/index.js', `file://${__filename}`);

async function importRuntime() {
  return import(`${DIST_URL.href}?cache=${Date.now()}_${Math.random()}`);
}

function withEnv(next, fn) {
  const previous = {};
  for (const key of Object.keys(next)) {
    previous[key] = process.env[key];
    if (next[key] == null) delete process.env[key];
    else process.env[key] = next[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const key of Object.keys(next)) {
        if (previous[key] == null) delete process.env[key];
        else process.env[key] = previous[key];
      }
    });
}

function turnRecord(sessionId, id, index, text) {
  const createdAt = new Date().toISOString();
  return {
    id,
    kind: 'turn',
    createdAt,
    sourceModality: 'text',
    sessionId,
    turnIndex: index,
    speaker: 'user',
    rawText: text,
    stateSnapshotId: `snapshot_${id}`,
    entityMentions: [],
    immutable: true
  };
}

function snapshotRecord(sessionId, id, turnId) {
  return {
    id,
    kind: 'state_snapshot',
    createdAt: new Date().toISOString(),
    sourceModality: 'text',
    sessionId,
    turnId,
    compounds: {},
    relationshipVectors: {},
    practicalActionBias: {},
    expressiveEnvelope: {
      certainty: 0.5,
      load: 0.2,
      tension: 0.1,
      valence: 0,
      desire: 0.2,
      trust: 0.8
    },
    schemaVersion: 'pack1.state.test'
  };
}

function candidate(text, normalizedValue, episodeId) {
  return {
    subtype: 'K_pref',
    canonicalText: text,
    normalizedValue,
    confidence: 0.82,
    extractionConfidenceRaw: 0.82,
    provenanceChain: ['postgres_test'],
    subjectKind: 'user',
    sourceEpisodeIds: [episodeId],
    provenanceReason: 'postgres_test',
    status: 'active'
  };
}

test('A.I.S.H.A postgres mode fails honestly when DB config is missing', async () => {
  const runtime = await importRuntime();
  await withEnv({
    AISHA_PERSISTENCE: 'postgres',
    AISHA_TEST_POSTGRES_URL: null,
    AISHA_POSTGRES_URL: null,
    AISHA_POSTGRES_DATABASE: null,
    AISHA_POSTGRES_USER: null,
    AISHA_POSTGRES_PASSWORD: null,
    AISHA_CLOUD_SQL_CONNECTION_NAME: null,
    GEMINI_API_KEY: 'test-gemini-key'
  }, async () => {
    runtime.__resetProductionDepsForTests();
    const response = await runtime.processAishaRequest({
      sessionId: 'pg_missing_config',
      threadId: 'thread_pg_missing_config',
      messageText: 'I prefer coffee.'
    }, {
      engineMode: 'production',
      productionGeminiApiKey: 'test-gemini-key'
    });
    assert.equal(response.ok, false);
    assert.equal(response.aishaEngineConnected, false);
    assert.equal(response.engineMode, 'unavailable');
    assert.match(response.fallbackReason || '', /AISHA_PERSISTENCE=postgres requires/);
    assert.equal(response.trace?.aishaDiagnostics?.aishaPersistenceMode, 'postgres');
    assert.equal(response.trace?.aishaDiagnostics?.aishaPersistenceBackend, 'unavailable');
    assert.equal(response.trace?.aishaDiagnostics?.aishaPersistenceConnected, false);
    assert.match(response.trace?.aishaDiagnostics?.aishaPersistenceFailureReason || '', /AISHA_PERSISTENCE=postgres requires/);
  });
});

test('A.I.S.H.A postgres stores persist hot records, notes, and supersession links', async (t) => {
  const url = String(process.env.AISHA_TEST_POSTGRES_URL || '').trim();
  if (!url) {
    t.skip('Set AISHA_TEST_POSTGRES_URL to run Pack 1 Postgres persistence conformance.');
    return;
  }

  const runtime = await importRuntime();
  const sessionId = `pg_store_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const stores = await runtime.__createPostgresProductionStoresForTests({
    AISHA_POSTGRES_URL: url
  });

  try {
    const firstTurn = turnRecord(sessionId, `${sessionId}_turn_1`, 1, 'I prefer coffee.');
    const secondTurn = turnRecord(sessionId, `${sessionId}_turn_2`, 2, 'Actually I prefer tea.');
    await stores.turnStore.write(firstTurn);
    await stores.turnStore.write(secondTurn);
    const recent = await stores.turnStore.getRecent(sessionId, 2);
    assert.deepEqual(recent.map((turn) => turn.id), [firstTurn.id, secondTurn.id]);
    assert.equal((await stores.turnStore.getById(firstTurn.id)).rawText, 'I prefer coffee.');

    const firstSnapshot = snapshotRecord(sessionId, firstTurn.stateSnapshotId, firstTurn.id);
    const secondSnapshot = snapshotRecord(sessionId, secondTurn.stateSnapshotId, secondTurn.id);
    await stores.snapshotStore.write(firstSnapshot);
    await stores.snapshotStore.write(secondSnapshot);
    assert.equal((await stores.snapshotStore.getLatest(sessionId)).id, secondSnapshot.id);
    assert.equal((await stores.snapshotStore.getByTurnId(firstTurn.id)).id, firstSnapshot.id);

    const decision = {
      split: true,
      topicShift: false,
      surpriseDiscontinuity: false,
      score: 0.2,
      reasons: ['postgres_test']
    };
    const episode = await stores.episodeStore.createFromTurn(firstTurn, decision, {
      episodeId: `${sessionId}_episode_1`
    });
    const appended = await stores.episodeStore.appendTurn(episode.id, secondTurn, decision);
    assert.deepEqual(appended.turnIds, [firstTurn.id, secondTurn.id]);
    const thread = await stores.threadStore.update(sessionId, appended);
    assert.equal((await stores.threadStore.getActive(sessionId)).activeEpisodeId, thread.activeEpisodeId);
    assert.equal((await stores.episodeStore.getActive(sessionId)).id, appended.id);

    const coffee = candidate('User preference: coffee', 'drink: coffee', appended.id);
    const firstMerge = await stores.noteVersioning.mergeOrSupersede(coffee, [], { trust: 1, caution: 0 });
    const activeAfterFirst = await stores.noteVersioning.listActiveNotes({ sessionId, includeGlobal: true });
    assert.equal(activeAfterFirst.length, 1);
    assert.equal(activeAfterFirst[0].canonicalText, 'User preference: coffee');

    const tea = candidate('User preference: tea', 'drink: tea', appended.id);
    const secondMerge = await stores.noteVersioning.mergeOrSupersede(
      tea,
      activeAfterFirst,
      { trust: 1, caution: 0 }
    );
    const newNote = secondMerge.notesWritten.find((note) => note.canonicalText === 'User preference: tea');
    assert.ok(newNote, 'expected new superseding tea note');
    const supersededMap = await stores.noteVersioning.listSupersededByIds([newNote.id]);
    assert.equal(supersededMap[newNote.id], 'User preference: coffee');
    const contradictionEvidence = await stores.noteVersioning.listContradictionEvidence({ sessionId });
    assert.ok(contradictionEvidence.some((note) => note.canonicalText === 'User preference: coffee'));

    const storesAfterReset = await runtime.__createPostgresProductionStoresForTests({
      AISHA_POSTGRES_URL: url
    });
    try {
      const restoredNotes = await storesAfterReset.noteVersioning.listActiveNotes({ sessionId, includeGlobal: true });
      assert.ok(restoredNotes.some((note) => note.canonicalText === 'User preference: tea'));
      assert.equal((await storesAfterReset.turnStore.getById(secondTurn.id)).rawText, secondTurn.rawText);
    } finally {
      await storesAfterReset.close();
    }
  } finally {
    await stores.close();
  }
});
