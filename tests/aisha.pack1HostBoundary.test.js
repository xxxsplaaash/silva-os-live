const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const esbuild = require('esbuild');
const { evaluateBlindAttributionLines, evaluateVisibleResponse } = require('../lib/studio/socialDirector/visibleResponseQuality');

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

function createDeps({ generatorInputs, writtenTurns, storeMemory = true, followupMemory = false }) {
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
        return storeMemory ? [activeNote] : [];
      },
      async listSupersededByIds(ids) {
        assert.deepEqual(ids, storeMemory ? [activeNote.id] : []);
        return storeMemory ? { [activeNote.id]: supersededNote.canonicalText } : {};
      },
      async listContradictionEvidence(filter) {
        assert.equal(filter.sessionId, 'pack1-host-boundary-session');
        return storeMemory ? [supersededNote] : [];
      },
    },
    ...(followupMemory ? {
      asyncMemoryFollowup: {
        async scheduleEpisodeProcessing() {
          return {
            gatePassed: true,
            candidatesExtracted: 2,
            notesWritten: [activeNote, supersededNote],
            linksWritten: [{
              id: 'link_active_supersedes_old',
              kind: 'note_link',
              createdAt: iso(),
              sourceModality: 'text',
              fromNoteId: activeNote.id,
              toNoteId: supersededNote.id,
              relation: 'supersedes',
              strength: 1,
            }],
          };
        },
      },
    } : {}),
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

test('Pack 1 social-director contract asks for silence reasons and speaker visible states', () => {
  const promptSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts'),
    'utf8'
  );
  const adapterSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'geminiGeneratorAdapter.ts'),
    'utf8'
  );

  assert.match(promptSource, /"visibleState":"safe pulse label"/);
  assert.match(promptSource, /"reason":"short reason the character is intentionally quiet"/);
  assert.match(adapterSource, /reason:\s*\{\s*type:\s*"string"/);
  assert.match(adapterSource, /Current-beat silence reason/i);
  assert.match(adapterSource, /required:\s*\["speakerId",\s*"visibleState",\s*"reason"\]/);
});

test('Pack 1 social-director contract asks for blind-attributable diverse speaker lines', () => {
  const promptSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts'),
    'utf8'
  );
  const adapterSource = fs.readFileSync(
    path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'geminiGeneratorAdapter.ts'),
    'utf8'
  );

  assert.match(promptSource, /blind-attributable/i);
  assert.match(promptSource, /Do not reuse the same opening/i);
  assert.match(promptSource, /recent-repeat-risk/i);
  assert.match(promptSource, /Vanya must not lean on stale charm families/i);
  assert.match(promptSource, /small enough \/ real enough/i);
  assert.match(promptSource, /concrete first move/i);
  assert.match(promptSource, /Fitness first asks must name the actual starter circuit/i);
  assert.match(promptSource, /20-minute fitness follow-ups must compress the recent starter list/i);
  assert.match(promptSource, /No solid-goal, protein\/sleep, consistency, habit, or progressive-overload boilerplate/i);
  assert.match(promptSource, /incline push-ups, backpack rows, split squats, hip hinges, plank/i);
  assert.match(promptSource, /food or design direction directly/i);
  assert.match(promptSource, /Ordinary lunch or meal asks are not training-food asks/i);
  assert.match(promptSource, /do not mention training, movement, performance, session fuel, or workout timing/i);
  assert.match(promptSource, /Ordinary lunch voice must be unmistakable/i);
  assert.match(promptSource, /Claudia opens with at least two anchors/i);
  assert.match(promptSource, /contrast current and prior claims/i);
  assert.match(promptSource, /For stress\/frustration turns, do not answer with objective slogans/i);
  assert.match(promptSource, /For repetition complaints, acknowledge the loop once/i);
  assert.match(promptSource, /For room-tension asks, at least one speaker must name the actual social pressure/i);
  assert.match(promptSource, /ask-finding loops/i);
  assert.match(promptSource, /visible silence reason/i);
  assert.match(promptSource, /Vanya:/);
  assert.match(promptSource, /Claudia:/);
  assert.match(promptSource, /Leah:/);
  assert.match(promptSource, /Grok:/);
  assert.match(promptSource, /A\.I\.S\.H\.A:/);
  assert.match(promptSource, /SOCIAL_DIRECTOR_ACCEPTANCE_EXAMPLES/);
  assert.match(promptSource, /SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES/);
  assert.match(promptSource, /SOCIAL_DIRECTOR_LINE_JOB_RULES/);
  assert.match(promptSource, /SOCIAL_DIRECTOR_SILENCE_REASON_TARGETS/);
  assert.match(promptSource, /Fitness first ask/);
  assert.match(promptSource, /20-minute fitness follow-up/);
  assert.match(promptSource, /Objective\/frustration recovery/);
  assert.match(promptSource, /Normal-answer recovery/);
  assert.match(promptSource, /Movie pivot after fitness/);
  assert.match(promptSource, /Food practical/);
  assert.match(promptSource, /Ordinary lunch practical/);
  assert.match(promptSource, /Design direction/);
  assert.match(promptSource, /Quality challenge/);
  assert.match(promptSource, /Room tension/);
  assert.match(promptSource, /Repetition complaint/);
  assert.match(promptSource, /Continuity receipt/);
  assert.match(promptSource, /Old preference receipt/);
  assert.match(adapterSource, /blind-attributable/i);
  assert.match(adapterSource, /different sentence shapes/i);
  assert.match(adapterSource, /current-beat reason/i);
  assert.match(adapterSource, /Speaker line jobs/i);
  assert.match(adapterSource, /Vanya=human temperature plus social pressure/i);
  assert.match(adapterSource, /Claudia=sequence, timer, count, movement, food option/i);
  assert.match(adapterSource, /Do not write silent reasons as generic waiting/i);
  assert.match(adapterSource, /practical, food, design, or continuity asks/i);
  assert.match(adapterSource, /generic advice or operations language/i);
  assert.match(adapterSource, /room-tension asks/i);
  assert.match(adapterSource, /repetition complaints/i);
  assert.match(adapterSource, /Prior record is allowed only for same-slot evidence/i);
  assert.match(adapterSource, /What changed or old-preference asks/i);
  assert.match(promptSource, /Line quality rules: \$\{SOCIAL_DIRECTOR_LINE_QUALITY_RULES\.join\(" "\)\}/);
  assert.match(promptSource, /Line job contracts: \$\{SOCIAL_DIRECTOR_LINE_JOB_RULES\.join\(" "\)\}/);
  assert.match(promptSource, /Silence reason examples: \$\{SOCIAL_DIRECTOR_SILENCE_REASON_TARGETS\.join\(" "\)\}/);
  assert.match(promptSource, /Recent room messages:\\n/);
  assert.match(promptSource, /recentMessages\.slice\(-6\)/);
});

test('Pack 1 social-director target lines pass blind-attribution scoring', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-targets-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES } = await import(pathToFileURL(outfile).href);
  const evaluation = evaluateBlindAttributionLines(SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES);
  assert.equal(evaluation.ok, true, JSON.stringify(evaluation.results, null, 2));
  for (const result of evaluation.results) {
    assert.equal(result.speakerId, result.expectedSpeakerId, `${result.expectedSpeakerId}: ${result.text}`);
    assert.ok(result.identifiable, `${result.expectedSpeakerId} target was not identifiable: ${result.text}`);
  }
});

test('Pack 1 social-director fitness frustration target lines avoid generic reset drift', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-objective-targets-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES } = await import(pathToFileURL(outfile).href);
  const targetLines = SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES
    .filter(item => item.scenario === 'Objective/frustration recovery after fitness');
  const visibleText = targetLines.map(item => item.text).join('\n');
  const issues = evaluateVisibleResponse({
    userMessage: 'BRUH...',
    visibleText,
    recentTurns: [
      { speakerId: 'claudia', role: 'side', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.' }
    ],
    speakerLines: targetLines.map(item => ({ speakerId: item.speakerId, text: item.text }))
  }).map(issue => issue.key || issue);

  assert.doesNotMatch(visibleText, /\bthe objective is\b/i);
  assert.match(visibleText, /\b(push|squat|reps|set|body)\b/i);
  assert.doesNotMatch(visibleText, /\bwrite one note about what changed\b/i);
  assert.doesNotMatch(visibleText, /\bdrink water\b/i);
  assert.doesNotMatch(visibleText, /\bclear one surface\b/i);
  assert.ok(!issues.includes('topic-ignored:fitness-context'), issues.join(', '));
  assert.ok(!issues.includes('false-objective:command-posture'), issues.join(', '));
});

test('Pack 1 social-director 20-minute target lines avoid interval boilerplate', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-short-window-targets-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES } = await import(pathToFileURL(outfile).href);
  const targetLines = SOCIAL_DIRECTOR_ATTRIBUTION_TARGET_LINES
    .filter(item => item.scenario === '20-minute fitness follow-up');
  const visibleText = targetLines.map(item => item.text).join('\n');
  const issues = evaluateVisibleResponse({
    userMessage: 'turn that into a 20 minute version',
    visibleText,
    recentTurns: [
      { speakerId: 'vanya', role: 'primary', text: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
      { speakerId: 'claudia', role: 'side', text: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down.' }
    ],
    speakerLines: targetLines.map(item => ({ speakerId: item.speakerId, text: item.text }))
  }).map(issue => issue.key || issue);

  assert.match(visibleText, /\b20[- ]minutes?\b/i);
  assert.match(visibleText, /\b(push|pull|legs|hinge|core)\b/i);
  assert.match(visibleText, /\b(rep count|lowest rep|count)\b/i);
  assert.doesNotMatch(visibleText, /\b(40|45)\s+seconds?\s+on|\b(15|20)\s+seconds?\s+(off|rest)|work\/rest|work rest/i);
  assert.ok(!issues.includes('topic-ignored:referenced-fitness'), issues.join(', '));
  assert.ok(!issues.includes('generic-advice:short-window-fitness'), issues.join(', '));
});

test('Pack 1 social-director built prompt carries line-quality fixture pressure', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = 'Return roomBeat, speakers, silentReactions, and stateUpdates for everyone.';

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'What should Leah and Claudia do with the dinner menu redesign tonight?',
      text: 'What should Leah and Claudia do with the dinner menu redesign tonight?',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      activeCharacterId: 'aisha',
      localRoomState: {
        roomMood: 'focused',
        currentTopic: 'dinner menu redesign',
        knownPresenceStatus: {
          aisha: 'anchoring',
          leah: 'active',
          claudia: 'active',
          vanya: 'quiet',
          grok: 'quiet',
        },
      },
      recentMessages: [
        { speakerId: 'aisha', content: 'Same twenty minutes, same constraint.' },
        { speakerId: 'claudia', content: 'Current record first, then we move.' },
        { speakerId: 'leah', content: 'Fair. The page still looks like a template.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'What should Leah and Claudia do with the dinner menu redesign tonight?',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          flags: {
            directAddressTarget: 'none',
            explicitEveryoneRequested: true,
            openFloorRequested: true,
          },
        },
      },
    },
  });

  assert.equal(prompt.userMessage, generatorPrompt);
  assert.match(prompt.systemPrompt, /Do not reuse the same opening, rhythm, or sentence frame/i);
  assert.match(prompt.systemPrompt, /Same twenty minutes/);
  assert.match(prompt.systemPrompt, /Vanya must not lean on stale charm families/i);
  assert.match(prompt.systemPrompt, /no victory speech until the towel is wet/i);
  assert.doesNotMatch(prompt.systemPrompt, /GOOD:[^\n]*Let the clock do the arguing/i);
  assert.doesNotMatch(prompt.systemPrompt, /Small enough to finish, real enough/i);
  assert.doesNotMatch(prompt.systemPrompt, /small enough to finish, then let the room get loud/i);
  assert.match(prompt.systemPrompt, /Current record first/);
  assert.match(prompt.systemPrompt, /Fair\. The page still looks like a template/);
  assert.match(prompt.systemPrompt, /For food or design asks, answer the food or design direction directly/i);
  assert.match(prompt.systemPrompt, /workflow alignment, deliverables, production readiness, and stakeholder language/i);
  assert.match(prompt.systemPrompt, /not process readiness or delivery theater/i);
  assert.match(prompt.systemPrompt, /Prior record only when prior or superseded evidence is the same user slot/i);
  assert.match(prompt.systemPrompt, /landing page style with landing page style/i);
  assert.match(prompt.systemPrompt, /For planning-tomorrow asks, give a plain day skeleton/i);
  assert.match(prompt.systemPrompt, /First step: 60-minute hardest-task block/i);
  assert.match(prompt.systemPrompt, /20-minute cleanup block/i);
  assert.match(prompt.systemPrompt, /one checkpoint before you stop/i);
  assert.match(prompt.systemPrompt, /Make the afternoon stay human: one hard thing early/i);
  assert.match(prompt.systemPrompt, /Normal-answer recovery:/i);
  assert.match(prompt.systemPrompt, /First step: set a twenty-minute timer/i);
  assert.match(prompt.systemPrompt, /Make the day smaller: one useful pass/i);
  assert.match(prompt.systemPrompt, /Stress recovery:/i);
  assert.match(prompt.systemPrompt, /Make the room human again: water first/i);
  assert.match(prompt.systemPrompt, /First step: close the noisy tab, set a ten-minute timer/i);
  assert.doesNotMatch(prompt.systemPrompt, /room earns another sentence/i);
  assert.match(prompt.systemPrompt, /Acceptance examples:/);
  assert.match(prompt.systemPrompt, /Acceptance examples are pattern pressure, not scripts/i);
  assert.match(prompt.systemPrompt, /Never copy an acceptance example verbatim/i);
  assert.match(prompt.systemPrompt, /Before training, eat light enough to move/i);
  assert.match(prompt.systemPrompt, /Ordinary lunch practical:/i);
  assert.match(prompt.systemPrompt, /One decision: eggs and toast, a rice bowl, a solid sandwich, or leftovers with water/i);
  assert.match(prompt.systemPrompt, /without turning it into a personality test/i);
  assert.match(prompt.systemPrompt, /Ordinary lunch voice must be unmistakable/i);
  assert.match(prompt.systemPrompt, /One strong world, not wallpaper/i);
  assert.match(prompt.systemPrompt, /Objective\/frustration recovery after fitness:/i);
  assert.match(prompt.systemPrompt, /set a ten-minute timer, do push-ups or squats/i);
  assert.match(prompt.systemPrompt, /Make the first set human: less speech, more floor/i);
  assert.doesNotMatch(prompt.systemPrompt, /write one note about what changed/i);
  assert.match(prompt.systemPrompt, /Useful half: it caught the dodge/i);
  assert.match(prompt.systemPrompt, /Room tension:/);
  assert.match(prompt.systemPrompt, /Taste problem: the safe choice is too neat/i);
  assert.match(prompt.systemPrompt, /Repetition complaint:/);
  assert.match(prompt.systemPrompt, /one concrete action, one short reason, one checkable result/i);
  assert.match(prompt.systemPrompt, /Continuity change receipt:/);
  assert.match(prompt.systemPrompt, /Changed: Prior record: landing page style is black glass with a single red pulse/i);
  assert.match(prompt.systemPrompt, /Old preference receipt:/);
  assert.match(prompt.systemPrompt, /Old record: dashboard preference is obsidian with one red accent/i);
  assert.doesNotMatch(prompt.systemPrompt, /Partly useful: it named the dodge/i);
  assert.match(prompt.systemPrompt, /Leah: taste, cultural judgment, aesthetic edge/i);
  assert.match(prompt.systemPrompt, /Claudia: practical sequencing, constraints, delivery shape/i);
  assert.match(prompt.systemPrompt, /Line job contracts:/i);
  assert.match(prompt.systemPrompt, /Vanya line job: human temperature plus one specific social pressure/i);
  assert.match(prompt.systemPrompt, /Silence reason examples:/i);
  assert.match(prompt.systemPrompt, /Grok silence: watching for the premise fault before interrupting/i);
  assert.match(prompt.systemPrompt, /Every intentionally quiet character needs a visible silence reason/i);
  assert.match(prompt.systemPrompt, /Room Presence Summary: aisha:anchoring, leah:active, claudia:active, vanya:quiet, grok:quiet/i);
  assert.match(prompt.systemPrompt, /If the user changes topic, drop stale context immediately/i);
  assert.match(prompt.systemPrompt, /Never invent an objective for the user/i);
  assert.match(prompt.systemPrompt, /For stress\/frustration turns, do not answer with objective slogans/i);
  assert.match(prompt.systemPrompt, /questions that shift the burden back to the user/i);
  assert.match(prompt.systemPrompt, /A movie prompt after fitness is a movie prompt/i);
});

test('Pack 1 social-director prompt separates ordinary lunch from training fuel', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-lunch-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = 'Return roomBeat, speakers, silentReactions, and stateUpdates for an ordinary lunch ask.';

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'quick help: what should I eat for lunch?',
      text: 'quick help: what should I eat for lunch?',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'claudia', content: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write the reps down.' },
        { speakerId: 'vanya', content: 'Feed the session, not the performance. Small if training is close; bigger if you have time.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'quick help: what should I eat for lunch?',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          impulsePlan: {
            category: 'practical',
            topicClass: 'food choice',
            maxSpeakers: 2,
            enforceSelectedSpeakers: true,
            speakerOrder: ['claudia', 'vanya'],
            selectedSpeakers: [
              { speakerId: 'claudia', lineJob: 'answer ordinary lunch with named food options first; no workout timing or fuel framing' },
              { speakerId: 'vanya', lineJob: 'add human temperature without performance, training, movement, or session-fuel language' },
            ],
          },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /Ordinary lunch or meal asks are not training-food asks/i);
  assert.match(prompt.systemPrompt, /For ordinary lunch, name lunch options first/i);
  assert.match(prompt.systemPrompt, /do not mention training, movement, performance, session fuel, or workout timing/i);
  assert.match(prompt.systemPrompt, /Claudia opens with at least two anchors/i);
  assert.match(prompt.systemPrompt, /one decision, boring baseline, eggs and toast, rice bowl, solid sandwich, leftovers with water/i);
  assert.match(prompt.systemPrompt, /Vanya adds lunch\/afternoon human pressure with playful bite/i);
  assert.match(prompt.systemPrompt, /Ordinary lunch practical:/i);
  assert.match(prompt.systemPrompt, /One decision: eggs and toast, a rice bowl, a solid sandwich, or leftovers with water/i);
  assert.match(prompt.systemPrompt, /Keep lunch boring in the useful way/i);
  assert.match(prompt.systemPrompt, /claudia: answer ordinary lunch with named food options first/i);
  assert.match(prompt.systemPrompt, /vanya: add human temperature without performance, training, movement/i);
  assert.match(prompt.systemPrompt, /For ordinary lunch turns, Claudia must list named foods first plus at least two anchors/i);
  assert.match(prompt.systemPrompt, /Vanya must use lunch\/afternoon\/personality-test pressure/i);
  assert.match(prompt.systemPrompt, /Vanya-first generic encouragement line is a first-attempt failure/i);
  assert.match(prompt.systemPrompt, /vanya: Feed the session, not the performance/i);
  assert.match(prompt.systemPrompt, /Recent assistant\/card repeat risks:/i);
});

test('Pack 1 social-director built prompt separates recent assistant repeat risks from user anchors', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-repeat-risk-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = 'Return roomBeat, speakers, silentReactions, and stateUpdates for this fresher follow-up.';

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'Use that card, but make the room answer fresher.',
      text: 'Use that card, but make the room answer fresher.',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'Do not treat my line as an assistant answer to imitate.' },
        { speakerId: 'vanya', content: 'Tiny vanity, clean discipline. Let the clock do the arguing.' },
        { speakerId: 'claudia', content: 'Start with three 20-minute sessions: push, squat, hinge, row.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'Use that card, but make the room answer fresher.',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /Recent assistant\/card repeat risks:/i);
  assert.match(prompt.systemPrompt, /vanya: Tiny vanity, clean discipline/i);
  assert.match(prompt.systemPrompt, /claudia: Start with three 20-minute sessions/i);
  assert.match(prompt.systemPrompt, /forbidden source shapes/i);
  assert.match(prompt.systemPrompt, /Do not reuse their first three words/i);
  assert.match(prompt.systemPrompt, /choose a different first verb/i);
  assert.match(prompt.systemPrompt, /User recent lines are anchors, not answer text to imitate/i);
  assert.doesNotMatch(
    prompt.systemPrompt.match(/Recent assistant\/card repeat risks:[\s\S]*?Recent room messages:/)?.[0] || '',
    /Do not treat my line as an assistant answer/i
  );
});

test('Pack 1 social-director built prompt carries first-attempt selected speaker jobs', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-speaker-plan-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = 'Return roomBeat, speakers, silentReactions, and stateUpdates for the referenced workout follow-up.';

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'turn that into a 20 minute version',
      text: 'turn that into a 20 minute version',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'claudia', content: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'turn that into a 20 minute version',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          impulsePlan: {
            category: 'practical',
            topicClass: 'reference-follow-up',
            maxSpeakers: 2,
            enforceSelectedSpeakers: true,
            speakerOrder: ['claudia', 'vanya'],
            selectedSpeakers: [
              { speakerId: 'claudia', lineJob: 'compress the referenced workout into a 20-minute timer plan using named movement categories or moves plus one rep count; never say chosen exercises or work/rest intervals' },
              { speakerId: 'vanya', lineJob: 'add one fresh human pressure line after Claudia; avoid recent mirror, first-round, clock, ego, heroic-rebrand, and solid-block imagery' },
            ],
          },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /First-attempt speaker plan:/);
  assert.match(prompt.systemPrompt, /Speaker order: claudia -> vanya/);
  assert.match(prompt.systemPrompt, /Max speakers: 2/);
  assert.match(prompt.systemPrompt, /Use only selected speakers on the first attempt/i);
  assert.match(prompt.systemPrompt, /claudia: compress the referenced workout into a 20-minute timer plan using named movement categories/i);
  assert.match(prompt.systemPrompt, /never say chosen exercises or work\/rest intervals/i);
  assert.match(prompt.systemPrompt, /vanya: add one fresh human pressure line after Claudia/i);
  assert.match(prompt.systemPrompt, /avoid recent mirror, first-round, clock, ego/i);
  assert.match(prompt.systemPrompt, /solid-block imagery/i);
  assert.match(prompt.systemPrompt, /Claudia must land the concrete movement\/timer\/reps line before Vanya/i);
  assert.match(prompt.systemPrompt, /Vanya-first generic encouragement line is a first-attempt failure/i);
  assert.match(prompt.systemPrompt, /For terse frustration after recent fitness context/i);
  assert.match(prompt.systemPrompt, /Do not switch to water, clear-a-surface, generic reset/i);
  assert.ok(
    prompt.systemPrompt.indexOf('First-attempt speaker plan:') < prompt.systemPrompt.indexOf('Acceptance examples:'),
    'first-attempt speaker plan should apply before softer acceptance examples'
  );
});

test('Pack 1 social-director prompt pressures room-tension first attempts to speak', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-room-tension-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = [
    'Return roomBeat, speakers, silentReactions, and stateUpdates for the room tension question.',
    'User asks: everyone, what is the actual tension in this room?'
  ].join('\n');

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'everyone, what is the actual tension in this room?',
      text: 'everyone, what is the actual tension in this room?',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'everyone, what is the actual tension in this room?' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'everyone, what is the actual tension in this room?',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          impulsePlan: {
            category: 'everyone',
            topicClass: 'everyone',
            maxSpeakers: 5,
            enforceSelectedSpeakers: false,
            speakerOrder: ['aisha', 'vanya', 'leah', 'claudia', 'grok'],
            selectedSpeakers: [
              { speakerId: 'aisha', lineJob: 'anchor the room tension without turning it into diagnostics' },
              { speakerId: 'vanya', lineJob: 'name the human pressure or warmth-versus-usefulness tension directly' },
              { speakerId: 'leah', lineJob: 'name the taste, safe-choice, or consensus pressure in the room' },
              { speakerId: 'claudia', lineJob: 'name one concrete next move after the room tension is stated' },
              { speakerId: 'grok', lineJob: 'name the premise fault or dodge causing the room tension' },
            ],
          },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /First-attempt speaker plan:/);
  assert.match(prompt.systemPrompt, /Selected line jobs: aisha: anchor the room tension/i);
  assert.match(prompt.systemPrompt, /vanya: name the human pressure/i);
  assert.match(prompt.systemPrompt, /leah: name the taste, safe-choice, or consensus pressure/i);
  assert.match(prompt.systemPrompt, /grok: name the premise fault or dodge/i);
  assert.match(prompt.systemPrompt, /For room-tension turns, at least one selected speaker must speak visible text/i);
  assert.match(prompt.systemPrompt, /Silence-only JSON is a first-attempt failure/i);
  assert.match(prompt.systemPrompt, /Current turn acceptance target:/);
  assert.match(prompt.systemPrompt, /room-tension: return visible speaker text naming the actual pressure/i);
  assert.match(prompt.systemPrompt, /empty speakers, silence-only JSON, role summaries, and diagnostics are invalid/i);
  assert.ok(
    prompt.systemPrompt.indexOf('Current turn acceptance target:') < prompt.systemPrompt.indexOf('Acceptance examples:'),
    'current-turn acceptance target should steer before softer examples'
  );
});

test('Pack 1 social-director prompt gives current-turn targets for stress and normal-answer recovery', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-current-turn-target-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);

  function promptFor(userMessage, generatorPrompt = `Return roomBeat, speakers, silentReactions, and stateUpdates. User asks: ${userMessage}`) {
    return buildGenerationPrompt({
      turn: { rawText: userMessage, text: userMessage },
      snapshot: { expressiveEnvelope: { certainty: 0.7, load: 0.2, tension: 0.1 } },
      studioPulseContext: {
        roomId: 'studio-pulse-social-director',
        activeSpeakerId: 'aisha',
        recentMessages: [{ speakerId: 'user', content: userMessage }],
        projectContext: {
          socialDirectorV1: {
            schemaVersion: 'studio-pulse.social-director.v1',
            userMessage,
            generatorPrompt,
            structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
            impulsePlan: {
              category: 'emotional',
              topicClass: 'emotional',
              maxSpeakers: 2,
              enforceSelectedSpeakers: true,
              speakerOrder: ['vanya', 'claudia'],
              selectedSpeakers: [
                { speakerId: 'vanya', lineJob: 'lower the social temperature in one concrete line' },
                { speakerId: 'claudia', lineJob: 'add one checkable reset move without project logistics' },
              ],
            },
          },
        },
      },
    });
  }

  const stressPrompt = promptFor('I am stressed and this is starting to feel dumb.');
  assert.match(stressPrompt.systemPrompt, /Current turn acceptance target:/);
  assert.match(stressPrompt.systemPrompt, /stress-recovery: lower the temperature in visible dialogue/i);
  assert.match(stressPrompt.systemPrompt, /Vanya may answer alone if the line is concrete/i);
  assert.match(stressPrompt.systemPrompt, /No objective slogans, ask-finding loops, or room-theater critique/i);
  assert.ok(
    stressPrompt.systemPrompt.indexOf('Current turn acceptance target:') < stressPrompt.systemPrompt.indexOf('Acceptance examples:'),
    'stress current-turn target should be before examples'
  );

  const normalPrompt = promptFor('answer normally, what should I do today?', 'Return a normal answer. User asks: answer normally, what should I do today?');
  assert.match(normalPrompt.systemPrompt, /normal-answer recovery: if the current turn contains a practical task, answer that task directly/i);
  assert.match(normalPrompt.systemPrompt, /only make the line about repetition when the user actually mentions repeating/i);

  const fitnessObjectivePrompt = promptFor(
    'WHAT IS THE OBJECTIVE?',
    [
      'Return roomBeat, speakers, silentReactions, and stateUpdates.',
      'Recent visible thread: user wants to grow muscles.',
      'Claudia said: Twenty minutes: 3 minutes to warm up, 12 minutes for squats, wall push-ups, towel rows, and glute bridges, then 5 minutes for plank. Record total reps.',
      'Vanya said: Make it socially impossible to negotiate: twenty minutes, then proof.'
    ].join('\n')
  );
  assert.match(fitnessObjectivePrompt.systemPrompt, /fitness terse follow-up: stay inside the muscle-building thread/i);
  assert.match(fitnessObjectivePrompt.systemPrompt, /Do not use generic work-day phrases like rough pass, visible result, switching tasks, or make the day smaller/i);
  assert.match(fitnessObjectivePrompt.systemPrompt, /Claudia must show exercises, reps\/logging, or training days/i);
  assert.match(fitnessObjectivePrompt.systemPrompt, /push\/pull\/legs\/hinge\/core, reps, timer, or Monday\/Wednesday\/Friday/i);
  assert.ok(
    fitnessObjectivePrompt.systemPrompt.indexOf('fitness terse follow-up:') < fitnessObjectivePrompt.systemPrompt.indexOf('Acceptance examples:'),
    'fitness objective target should beat softer examples'
  );
});

test('Pack 1 social-director prompt keeps Claudia practical line first when Vanya is the referenced card', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-vanya-reference-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = [
    'Return roomBeat, speakers, silentReactions, and stateUpdates for the Vanya-referenced workout follow-up.',
    'For a referenced fitness follow-up asking for a 20-minute version, answer exactly that: Claudia first with a timed mini-plan.',
    'Vanya second only if she adds a fresh social pressure line.'
  ].join('\n');

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'turn that into a 20 minute version',
      text: 'turn that into a 20 minute version',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'vanya', content: 'Start at home this week. Three short sessions; no heroic rebrand required.' },
        { speakerId: 'claudia', content: 'Do incline push-ups, backpack rows, split squats, hip hinges, and a plank. Write reps down.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'turn that into a 20 minute version',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          references: [
            {
              speakerId: 'vanya',
              speakerName: 'Vanya Khumalo',
              role: 'primary',
              text: 'Start at home this week. Three short sessions; no heroic rebrand required.'
            }
          ],
          impulsePlan: {
            category: 'practical',
            topicClass: 'reference-follow-up',
            maxSpeakers: 2,
            enforceSelectedSpeakers: true,
            speakerOrder: ['claudia', 'vanya'],
            selectedSpeakers: [
              { speakerId: 'claudia', lineJob: 'compress the referenced workout into a 20-minute timer plan using named movement categories or moves plus one rep count; never say chosen exercises or work/rest intervals' },
              { speakerId: 'vanya', lineJob: 'add one fresh human pressure line after Claudia; avoid recent mirror, first-round, clock, ego, heroic-rebrand, and solid-block imagery' },
            ],
          },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /Speaker order: claudia -> vanya/);
  assert.match(prompt.systemPrompt, /Use only selected speakers on the first attempt/i);
  assert.match(prompt.systemPrompt, /Claudia must land the concrete movement\/timer\/reps line before Vanya/i);
  assert.match(prompt.systemPrompt, /Vanya-first generic encouragement line is a first-attempt failure/i);
  assert.match(prompt.systemPrompt, /Current turn acceptance target:/);
  assert.match(prompt.systemPrompt, /20-minute fitness follow-up: Claudia must speak first with a timed mini-plan/i);
  assert.match(prompt.systemPrompt, /squat, hinge, push, pull, core, timer, reps/i);
  assert.match(prompt.systemPrompt, /chair squats, incline push-ups, backpack rows, dead bugs/i);
  assert.match(prompt.systemPrompt, /chosen exercises/i);
  assert.match(prompt.systemPrompt, /work\/rest interval boilerplate/i);
  assert.match(prompt.systemPrompt, /Vanya may only add a second line after Claudia/i);
  assert.match(prompt.systemPrompt, /If the referenced card is Vanya social framing, preserve only that social context/i);
  assert.match(prompt.systemPrompt, /do not let Vanya answer alone or turn the line into motivation/i);
  assert.match(prompt.systemPrompt, /Focused-work advice, 'chosen exercises', work\/rest interval boilerplate, and restating the old card are invalid/i);
  assert.match(prompt.systemPrompt, /vanya: Start at home this week\. Three short sessions; no heroic rebrand required/i);
  assert.match(prompt.systemPrompt, /claudia: Do incline push-ups, backpack rows, split squats, hip hinges, and a plank/i);
  assert.match(prompt.systemPrompt, /vanya: add one fresh human pressure line after Claudia/i);
  assert.match(prompt.systemPrompt, /avoid recent mirror, first-round, clock, ego, heroic-rebrand, and solid-block imagery/i);
  assert.ok(
    prompt.systemPrompt.indexOf('Current turn acceptance target:') < prompt.systemPrompt.indexOf('Acceptance examples:'),
    '20-minute current-turn target should beat softer examples'
  );
  assert.doesNotMatch(
    prompt.systemPrompt,
    /20-minute fitness follow-up:[\s\S]*Let the clock do the arguing|GOOD:[^\n]*Let the clock do the arguing/i
  );
});

test('Pack 1 social-director prompt changes shape for repeated explicit 20-minute constraint', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-repeat-short-window-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = [
    'The recent visible answer already said:',
    'Claudia: Twenty minutes: 3 minutes warm-up, 12 minutes for squats, wall push-ups, towel rows, and glute bridges, then 5 minutes for plank. Record total reps.',
    'Vanya: Make it socially impossible to negotiate: twenty minutes, then proof.',
    'The user repeats the same constraint. Return a fresh useful room answer, not the same block.'
  ].join('\n');

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'ok but I only have 20 minutes',
      text: 'ok but I only have 20 minutes',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'LOL I WANNA GROW MY MUSCLES' },
        { speakerId: 'claudia', content: 'First step: set a 20-minute timer for four blocks: push or pull, legs, hinge, core. Write the lowest rep count before you stop.' },
        { speakerId: 'vanya', content: 'Keep it human: no victory speech until the towel is wet.' },
        { speakerId: 'user', content: 'turn that into a 20 minute version' },
        { speakerId: 'claudia', content: 'Twenty minutes: 3 minutes warm-up, 12 minutes for squats, wall push-ups, towel rows, and glute bridges, then 5 minutes for plank. Record total reps.' },
        { speakerId: 'vanya', content: 'Make it socially impossible to negotiate: twenty minutes, then proof.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'ok but I only have 20 minutes',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
          impulsePlan: {
            category: 'practical',
            topicClass: 'practical',
            maxSpeakers: 2,
            enforceSelectedSpeakers: true,
            speakerOrder: ['claudia', 'vanya'],
            selectedSpeakers: [
              { speakerId: 'claudia', lineJob: 'change the repeated 20-minute constraint into a fresh one-pass circuit with exercises and reps to log' },
              { speakerId: 'vanya', lineJob: 'add one short pressure line without repeating the previous proof or negotiation wording' },
            ],
          },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /Current turn acceptance target:/);
  assert.match(prompt.systemPrompt, /repeated 20-minute constraint: the 20-minute plan was already answered/i);
  assert.match(prompt.systemPrompt, /Do not repeat the prior warm-up\/squats\/wall-push-ups\/towel-rows\/glute-bridges\/plank line/i);
  assert.match(prompt.systemPrompt, /chair squats, incline push-ups, backpack rows, dead bugs/i);
  assert.match(prompt.systemPrompt, /two clean rounds, 20-minute cap, log reps/i);
  assert.match(prompt.systemPrompt, /do not repeat the previous Vanya proof\/negotiation line/i);
  assert.ok(
    prompt.systemPrompt.indexOf('Current turn acceptance target:') < prompt.systemPrompt.indexOf('Acceptance examples:'),
    'repeated 20-minute target should beat softer examples'
  );
});

test('Pack 1 social-director built prompt locks repeat phrase families', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisha-prompt-template-repeat-family-'));
  const outfile = path.join(tempDir, 'promptTemplate.mjs');
  esbuild.buildSync({
    entryPoints: [path.join(__dirname, '..', 'packages', 'aisha-runtime-pack1', 'src', 'generation', 'promptTemplate.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
  });
  const { buildGenerationPrompt } = await import(pathToFileURL(outfile).href);
  const generatorPrompt = 'Return roomBeat, speakers, silentReactions, and stateUpdates without repeating the prior card.';

  const prompt = buildGenerationPrompt({
    turn: {
      rawText: 'Same topic, but stop sounding like the last card.',
      text: 'Same topic, but stop sounding like the last card.',
    },
    snapshot: {
      expressiveEnvelope: {
        certainty: 0.7,
        load: 0.2,
        tension: 0.1,
      },
    },
    studioPulseContext: {
      roomId: 'studio-pulse-social-director',
      activeSpeakerId: 'aisha',
      recentMessages: [
        { speakerId: 'user', content: 'This user line is a conversational anchor, not a repeat-risk family.' },
        { speakerId: 'vanya', content: 'Let the clock do the arguing; the ego can decorate later.' },
        { speakerId: 'claudia', content: 'Start with three 20-minute sessions and write the reps down before you stop.' },
        { speakerId: 'leah', content: 'One strong world, not wallpaper; pick the feeling first.' },
        { speakerId: 'grok', content: 'Track reps, because narrative ambition is not a training plan.' },
      ],
      projectContext: {
        socialDirectorV1: {
          schemaVersion: 'studio-pulse.social-director.v1',
          userMessage: 'Same topic, but stop sounding like the last card.',
          generatorPrompt,
          structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
        },
      },
    },
  });

  assert.match(prompt.systemPrompt, /Recent repeat family locks:/i);
  assert.match(prompt.systemPrompt, /Replace the family, not only the exact words/i);
  assert.match(prompt.systemPrompt, /vanya: recent family 'tiny vanity \/ clock \/ first-round pressure'/i);
  assert.match(prompt.systemPrompt, /Claudia must use a different structure shape/i);
  assert.match(prompt.systemPrompt, /do not invent owners or handoffs/i);
  assert.doesNotMatch(prompt.systemPrompt, /one owner/i);
  assert.match(prompt.systemPrompt, /Leah must use a fresh taste verdict/i);
  assert.match(prompt.systemPrompt, /Grok must name a new premise consequence/i);
  assert.match(prompt.systemPrompt, /useful\/fake self-review language/i);
  assert.match(prompt.systemPrompt, /same metaphor, advice rhythm, or line job still counts as recent-repeat-risk/i);
  assert.doesNotMatch(prompt.systemPrompt, /user: recent family/i);
});

test('Pack 1 host surfaces same-turn memory follow-up writes when store summary is empty', async () => {
  const { processAishaRequest } = await import('../packages/aisha-runtime-pack1/dist/index.js');
  const generatorInputs = [];
  const writtenTurns = [];
  const deps = createDeps({
    generatorInputs,
    writtenTurns,
    storeMemory: false,
    followupMemory: true,
  });

  const response = await processAishaRequest({
    sessionId: 'pack1-host-boundary-session',
    threadId: 'pack1-host-boundary-session',
    roomId: 'studio-pulse-social-director',
    activeSpeakerId: 'aisha',
    activeCharacterId: 'aisha',
    messageText: 'Actually my dashboard preference is pale blue with no red accents.',
    message: 'Actually my dashboard preference is pale blue with no red accents.',
    projectContext: {
      socialDirectorV1: {
        schemaVersion: 'studio-pulse.social-director.v1',
        userMessage: 'Actually my dashboard preference is pale blue with no red accents.',
        generatorPrompt: 'SOCIAL DIRECTOR JSON CONTRACT: return roomBeat, speakers, stateUpdates.',
        structuredOutput: { kind: 'socialDirectorV1', jsonOnly: true },
      },
    },
    recentMessages: [],
  }, { deps, engineMode: 'fixture' });

  assert.equal(response.ok, true);
  assert.ok(response.memorySummary.activeTruths.some(item => /pale blue/.test(item.canonicalText)));
  assert.ok(response.memorySummary.activeTruths.some(item => /obsidian/.test(item.supersededPriorText || '')));
  assert.ok(response.memorySummary.supersededTruths.some(item => /obsidian/.test(item.canonicalText)));
});

test('Pack 1 extractor and retrieval prioritize durable visual slot preferences', () => {
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
  assert.match(extractionSource, /my \[a-z0-9 _-\]\{2,80\} style is/);
  assert.match(extractionSource, /heuristic_slot_style_pattern/);
  assert.match(extractionSource, /User \$\{slot\} \$\{slotKind\}: \$\{cleaned\}/);
  assert.match(retrievalSource, /sessionAffinity/);
  assert.match(retrievalSource, /sessionEpisodeIds\.has\(id\)/);
  assert.match(retrievalSource, /dashboard\|landing page\|homepage\|website\|brand\|design\|style\|aesthetic/);
});
