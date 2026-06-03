const { characterName } = require('./characterBibles');
const { buildRoomDirectorInput, buildRoomDirectorPrompt, SCHEMA_VERSION } = require('./roomDirectorPrompt');
const { socialFallbackFor } = require('./socialDirectorFallback');
const { extractJsonObject, validateDirectorOutput } = require('./socialDirectorValidator');
const { compactText } = require('./socialDirectorTypes');

const MODE = 'social-director-experiment';
const SOCIAL_CUES_BY_PAYLOAD = new WeakMap();

function firstAishaContent(response = {}) {
  const first = Array.isArray(response.responses) ? response.responses.find(item => String(item?.content || item?.text || '').trim()) : null;
  const value = first?.content ?? first?.text ?? '';
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value || '').trim();
}

function messageEventsFor(output = {}) {
  return (Array.isArray(output.speakers) ? output.speakers : []).map(item => ({
    speakerId: item.speakerId,
    speakerName: characterName(item.speakerId),
    role: item.role,
    tone: item.tone,
    text: item.text,
    visibleState: item.visibleState || 'Watching'
  }));
}

function safeTraceStatus(response = {}) {
  return compactText(response?.diagnostics?.responseTraceStatus || response?.trace?.status || '', 80);
}

function safeTraceFailure(response = {}) {
  return compactText(response?.diagnostics?.responseTraceFailureReason || response?.trace?.failureReason || response?.trace?.reason || response?.fallbackReason || '', 160);
}

function safeProviderDiagnosticText(value = '', max = 160) {
  return String(value || '')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted-key]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted-token]')
    .replace(/\s+/g, ' ')
    .slice(0, max)
    .trim();
}

function quotaFailureDetected(value = '') {
  return /\b(resource[_ -]?exhausted|quota|rate[- ]?limit|rate limited|too many requests|rpm|rpd|429)\b/i.test(String(value || ''));
}

function providerFailureReasonFor(response = {}, reason = '') {
  const source = [
    reason,
    response?.diagnostics?.responseTraceFailureReason,
    response?.diagnostics?.responseFallbackReason,
    response?.trace?.failureReason,
    response?.trace?.reason,
    response?.fallbackReason
  ].map(item => String(item || '')).join(' ');
  if (quotaFailureDetected(source)) return 'quota exceeded / resource exhausted';
  return safeProviderDiagnosticText(source, 160);
}

function safeDiagnostics(response = {}) {
  const diagnostics = response?.diagnostics && typeof response.diagnostics === 'object' ? response.diagnostics : {};
  const providerFailureReason = providerFailureReasonFor(response);
  return {
    runtimeCredentialProvided: diagnostics.runtimeCredentialProvided === true,
    runtimeCredentialLength: Number(diagnostics.runtimeCredentialLength || 0) || 0,
    runtimeCredentialSource: compactText(diagnostics.runtimeCredentialSource || '', 120),
    runtimeTimeoutMs: Number(diagnostics.runtimeTimeoutMs || 0) || 0,
    modelUsed: compactText(diagnostics.modelUsed || 'runtime-default', 120) || 'runtime-default',
    responseCount: Number(diagnostics.responseCount || 0) || 0,
    firstResponseHasContent: diagnostics.firstResponseHasContent === true,
    providerFailureReason,
    responseFallbackReason: compactText(diagnostics.responseFallbackReason || response?.fallbackReason || '', 160),
    aishaPersistenceMode: compactText(diagnostics.aishaPersistenceMode || response?.trace?.aishaDiagnostics?.aishaPersistenceMode || '', 40),
    aishaPersistenceBackend: compactText(diagnostics.aishaPersistenceBackend || response?.trace?.aishaDiagnostics?.aishaPersistenceBackend || '', 40),
    aishaPersistenceConnected: diagnostics.aishaPersistenceConnected === true || response?.trace?.aishaDiagnostics?.aishaPersistenceConnected === true
  };
}

function safeTruthItem(item = {}) {
  const source = item && typeof item === 'object' ? item : {};
  const text = compactText(
    source.canonicalText ||
    source.text ||
    source.claimText ||
    source.normalizedValue ||
    '',
    240
  );
  if (!text) return null;
  const rawStatus = compactText(source.status || '', 40).toLowerCase();
  const status = ['active', 'superseded', 'disputed'].includes(rawStatus) ? rawStatus : 'active';
  return {
    id: compactText(source.noteId || source.id || source.claimId || text.toLowerCase().replace(/[^a-z0-9]+/g, '-'), 120),
    text,
    status,
    confidence: Number(source.confidence || 0) || 0,
    supersededPriorText: compactText(source.supersededPriorText || '', 240)
  };
}

function safeMemorySummary(response = {}) {
  const summary = response?.memorySummary && typeof response.memorySummary === 'object' ? response.memorySummary : {};
  const activeTruths = (Array.isArray(summary.activeTruths) ? summary.activeTruths : [])
    .map(item => safeTruthItem({ ...item, status: item?.status || 'active' }))
    .filter(Boolean)
    .slice(0, 8);
  const supersededTruths = (Array.isArray(summary.supersededTruths) ? summary.supersededTruths : [])
    .map(item => safeTruthItem({ ...item, status: item?.status || 'superseded' }))
    .filter(Boolean)
    .slice(0, 8);
  return {
    activeTruths,
    supersededTruths,
    sessionId: compactText(summary.sessionId || '', 120)
  };
}

function schemaInvalidIssue(issue = '') {
  return /^(no-speakers|invalid-speaker|invalid-room-mood|invalid-response-mode|too-many-speakers|all-five-long-paragraphs|takeover-has-non-aisha-speakers|aisha-takeover-too-long)/.test(String(issue || ''));
}

function qualityInvalidIssue(issue = '') {
  return /^(allowed-topic-refusal|false-objective-claim|topic-ignored|recent-repeat-risk|stale-topic-answer|generic-status-report|operational-jargon|generic-advice-column|social-question-ignored|frustration-ignored|continuity-question-ignored|takeover-for-ordinary-topic|feels-task-router-risk|repeated-point-risk)/.test(String(issue || ''));
}

function failureCategoryForAttempt(attempt = null) {
  const response = attempt?.response || {};
  const validation = attempt?.validation || {};
  const issues = Array.isArray(validation.issues) ? validation.issues : [];
  const reason = [
    attempt?.parseStatus,
    response?.fallbackReason,
    response?.diagnostics?.rejectionReason,
    response?.diagnostics?.responseFallbackReason,
    response?.diagnostics?.responseTraceFailureReason,
    response?.trace?.failureReason,
    response?.trace?.reason
  ].map(item => String(item || '')).join(' ');

  if (quotaFailureDetected(reason)) return 'quota-exceeded';
  if (/\b(timeout|abort|deadline|timed out|generation_timeout)\b/i.test(reason)) return 'generation-timeout';
  if (/\b(api[_ -]?key|credential|auth|unauth|permission|forbidden|invalid key|invalid-key|invalid)\b/i.test(reason)) return 'invalid-key';
  if (response?.aishaEngineConnected !== true) return 'aisha-unavailable';
  if (issues.includes('empty-response-content') || issues.includes('no-content')) return 'aisha-unavailable';
  if (issues.includes('invalid-json') || attempt?.parseStatus === 'json-parse-failed') return 'json-parse-failed';
  if (issues.some(schemaInvalidIssue)) return 'schema-invalid';
  if (issues.some(qualityInvalidIssue)) return 'quality-rejected';
  if (issues.length) return 'validator-rejected';
  return '';
}

function responseEnvelope(output, validation, meta = {}) {
  const runtime = safeDiagnostics(meta.response || {});
  const publicValidation = validation?.output?.socialCues
    ? { ...validation, output: { ...validation.output, socialCues: undefined } }
    : validation;
  const envelope = {
    ok: true,
    mode: MODE,
    activeEngine: meta.activeEngine || 'local-social-director',
    aishaConnected: meta.aishaConnected === true,
    roomBeat: output.roomBeat,
    roomMood: output.roomMood,
    responseMode: output.responseMode,
    messageEvents: messageEventsFor(output),
    silentReactions: output.silentReactions || [],
    stateUpdates: output.stateUpdates || { notes: [] },
    validation: publicValidation,
    qualityAccepted: validation?.accepted === true && validation?.fallbackUsed !== true && !(validation?.issues || []).length,
    repairedByRuntime: validation?.repaired === true,
    qualityFailureCategory: compactText(meta.failureCategory || validation?.failureCategory || '', 80),
    debugSummary: {
      schemaVersion: SCHEMA_VERSION,
      source: meta.source || 'fallback',
      aishaAttempted: meta.aishaAttempted === true,
      aishaEngineMode: compactText(meta.aishaEngineMode || '', 80),
      aishaTraceStatus: compactText(meta.aishaTraceStatus || '', 80),
      aishaTraceFailureReason: compactText(meta.aishaTraceFailureReason || '', 160),
      failureCategory: compactText(meta.failureCategory || validation?.failureCategory || '', 80),
      runtimeTimeoutMs: runtime.runtimeTimeoutMs,
      runtimeCredentialProvided: runtime.runtimeCredentialProvided,
      runtimeCredentialLength: runtime.runtimeCredentialLength,
      runtimeCredentialSource: runtime.runtimeCredentialSource,
      modelUsed: runtime.modelUsed,
      providerFailureReason: runtime.providerFailureReason,
      responseCount: runtime.responseCount,
      firstResponseHasContent: runtime.firstResponseHasContent,
      responseFallbackReason: runtime.responseFallbackReason,
      aishaPersistenceMode: runtime.aishaPersistenceMode,
      aishaPersistenceBackend: runtime.aishaPersistenceBackend,
      aishaPersistenceConnected: runtime.aishaPersistenceConnected,
      repairAttempted: meta.repairAttempted === true,
      repaired: validation?.repaired === true,
      fallbackUsed: validation?.fallbackUsed === true,
      qualityAccepted: validation?.accepted === true && validation?.fallbackUsed !== true && !(validation?.issues || []).length,
      qualityFailureCategory: compactText(meta.failureCategory || validation?.failureCategory || '', 80),
      rawPromptExposed: false
    },
    ...(meta.includeMemorySummary ? { memorySummary: safeMemorySummary(meta.response || {}) } : {})
  };
  if (output?.socialCues && typeof output.socialCues === 'object') {
    SOCIAL_CUES_BY_PAYLOAD.set(envelope, output.socialCues);
  }
  return envelope;
}

function socialCuesForPayload(payload = {}) {
  return SOCIAL_CUES_BY_PAYLOAD.get(payload) || null;
}

function buildAishaRequest(input, prompt, body = {}) {
  const threadId = compactText(body.threadId || `social-director-${Date.now()}`, 120);
  const userMessage = compactText(input.userMessage || body.question || body.message || '', 1000);
  return {
    sessionId: threadId,
    threadId,
    roomId: 'studio-pulse-social-director',
    userId: 'studio-pulse-ui',
    activeCharacterId: 'aisha',
    activeSpeakerId: 'aisha',
    message: userMessage,
    messageText: userMessage,
    recentMessages: input.recentTurns.map((turn, idx) => ({
      id: `recent-${idx}`,
      speakerId: turn.speakerId || 'user',
      role: turn.role || 'message',
      content: turn.text
    })),
    localRoomState: {
      experiment: MODE,
      currentMood: input.currentMood || input.roomState?.roomMood || '',
      priorSpeaker: input.priorSpeaker || '',
      flags: input.flags
    },
    characterStates: Object.fromEntries(Object.keys(input.characters || {}).map(id => [id, {
      personId: id,
      displayName: input.characters[id].displayName,
      presence: id === 'aisha' || id === 'vanya' ? 'active' : 'present',
      mood: input.currentMood || 'warm',
      currentIntent: 'social-director-sandbox'
    }])),
    projectContext: {
      socialDirectorV1: {
        schemaVersion: SCHEMA_VERSION,
        userMessage: input.userMessage,
        generatorPrompt: prompt,
        flags: input.flags,
        structuredOutput: {
          kind: 'socialDirectorV1',
          jsonOnly: true,
          moods: ['warm', 'playful', 'tense', 'focused', 'chaotic', 'quiet', 'sharp', 'cooling'],
          modes: ['single', 'small_exchange', 'open_floor', 'aisha_takeover', 'room_check'],
          speakerIds: ['aisha', 'vanya', 'leah', 'claudia', 'grok'],
          roles: ['primary', 'side', 'closer', 'called_in']
        },
        hardLimits: {
          defaultMaxSpeakers: 3,
          explicitEveryoneMaxSpeakers: 5,
          maxSpeakerSentences: 2,
          maxAishaTakeoverSentences: 3
        }
      }
    },
    modality: {
      channel: 'studio-pulse-social-director',
      sourceChannel: 'chat'
    }
  };
}

async function runAishaDirector({ input, callAishaEngine, runtimeOptions, body, repair = null }) {
  const prompt = buildRoomDirectorPrompt(input, repair || {});
  const response = await callAishaEngine(buildAishaRequest(input, prompt, body), runtimeOptions);
  const content = firstAishaContent(response);
  const parsed = extractJsonObject(content);
  const validation = parsed
    ? validateDirectorOutput(parsed, { userMessage: input.userMessage, recentTurns: input.recentTurns })
    : { ok: false, issues: [content ? 'invalid-json' : 'empty-response-content'], output: null, bannedPhraseFound: false, rawInternalLeak: false, repeatedPointRisk: false, feelsTaskRouterRisk: false };
  const parseStatus = parsed ? 'parsed' : (content ? 'json-parse-failed' : 'no-content');
  return { response, content, parsed, validation, parseStatus };
}

async function runSocialDirectorTurn({
  body = {},
  callAishaEngine,
  runtimeOptions = {},
  includeMemorySummary = false
} = {}) {
  const input = buildRoomDirectorInput(body);
  if (!input.userMessage) {
    return { statusCode: 400, payload: { ok: false, mode: MODE, error: 'question is required' } };
  }

  let first = null;
  let repair = null;
  if (typeof callAishaEngine === 'function') {
    try {
      first = await runAishaDirector({ input, callAishaEngine, runtimeOptions, body });
      if (first.validation.ok) {
        return {
          statusCode: 200,
          payload: responseEnvelope(first.validation.output, {
            ok: true,
            accepted: true,
            source: 'aisha',
            issues: [],
            repaired: false,
            fallbackUsed: false,
            failureCategory: ''
          }, {
            activeEngine: 'aisha-runtime-pack1',
            aishaConnected: first.response?.aishaEngineConnected === true,
            aishaAttempted: true,
            aishaEngineMode: first.response?.engineMode || '',
            aishaTraceStatus: safeTraceStatus(first.response),
            source: 'aisha',
            response: first.response,
            includeMemorySummary
          })
        };
      }
      if (first.response?.aishaEngineConnected === true) {
        repair = await runAishaDirector({
          input,
          callAishaEngine,
          runtimeOptions,
          body,
          repair: { issues: first.validation.issues }
        });
        if (repair.validation.ok) {
          return {
            statusCode: 200,
            payload: responseEnvelope(repair.validation.output, {
              ok: true,
              accepted: true,
              source: 'aisha-repair',
              issues: [],
              repaired: true,
              fallbackUsed: false,
              failureCategory: ''
            }, {
              activeEngine: 'aisha-runtime-pack1',
              aishaConnected: repair.response?.aishaEngineConnected === true,
              aishaAttempted: true,
              aishaEngineMode: repair.response?.engineMode || '',
              aishaTraceStatus: safeTraceStatus(repair.response),
              repairAttempted: true,
              source: 'aisha-repair',
              response: repair.response,
              includeMemorySummary
            })
          };
        }
      }
    } catch (err) {
      first = {
        response: { aishaEngineConnected: false, engineMode: 'unavailable', fallbackReason: 'social-director-error' },
        validation: { issues: ['aisha-call-error'] },
        error: err
      };
    }
  }

  const failedAttempt = repair || first;
  const fallbackOutput = socialFallbackFor(input.userMessage, {
    ...body,
    memorySummary: safeMemorySummary(failedAttempt?.response || {})
  });
  const fallbackValidation = validateDirectorOutput(fallbackOutput, { userMessage: input.userMessage, recentTurns: input.recentTurns });
  const failureCategory = failureCategoryForAttempt(failedAttempt) || 'aisha-unavailable';
  return {
    statusCode: 200,
    payload: responseEnvelope(fallbackValidation.output, {
      ok: fallbackValidation.ok,
      accepted: false,
      source: 'sandbox-fallback',
      issues: fallbackValidation.issues,
      repaired: false,
      fallbackUsed: true,
      failureCategory,
      firstAttemptIssues: first?.validation?.issues || [],
      repairAttemptIssues: repair?.validation?.issues || []
    }, {
      activeEngine: 'local-social-director',
      aishaConnected: first?.response?.aishaEngineConnected === true || repair?.response?.aishaEngineConnected === true,
      aishaAttempted: typeof callAishaEngine === 'function',
      aishaEngineMode: first?.response?.engineMode || repair?.response?.engineMode || '',
      aishaTraceStatus: safeTraceStatus(first?.response || repair?.response || {}),
      aishaTraceFailureReason: safeTraceFailure(first?.response || repair?.response || {}),
      repairAttempted: !!repair,
      source: 'sandbox-fallback',
      failureCategory,
      response: failedAttempt?.response || {},
      includeMemorySummary
    })
  };
}

module.exports = {
  MODE,
  buildAishaRequest,
  messageEventsFor,
  runSocialDirectorTurn,
  socialCuesForPayload
};
