const { characterName } = require('./characterBibles');
const { buildRoomDirectorInput, buildRoomDirectorPrompt, SCHEMA_VERSION } = require('./roomDirectorPrompt');
const { socialFallbackFor } = require('./socialDirectorFallback');
const { extractJsonObject, validateDirectorOutput } = require('./socialDirectorValidator');
const { compactText } = require('./socialDirectorTypes');

const MODE = 'social-director-experiment';

function firstAishaContent(response = {}) {
  const first = Array.isArray(response.responses) ? response.responses.find(item => String(item?.content || item?.text || '').trim()) : null;
  return String(first?.content || first?.text || '').trim();
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

function responseEnvelope(output, validation, meta = {}) {
  return {
    ok: true,
    mode: MODE,
    activeEngine: meta.activeEngine || 'local-social-director',
    aishaConnected: meta.aishaConnected === true,
    roomBeat: output.roomBeat,
    roomMood: output.roomMood,
    responseMode: output.responseMode,
    messageEvents: messageEventsFor(output),
    silentReactions: output.silentReactions || [],
    validation,
    debugSummary: {
      schemaVersion: SCHEMA_VERSION,
      source: meta.source || 'fallback',
      aishaAttempted: meta.aishaAttempted === true,
      aishaEngineMode: compactText(meta.aishaEngineMode || '', 80),
      aishaTraceStatus: compactText(meta.aishaTraceStatus || '', 80),
      aishaTraceFailureReason: compactText(meta.aishaTraceFailureReason || '', 160),
      repairAttempted: meta.repairAttempted === true,
      rawPromptExposed: false
    }
  };
}

function buildAishaRequest(input, prompt, body = {}) {
  const threadId = compactText(body.threadId || `social-director-${Date.now()}`, 120);
  return {
    sessionId: threadId,
    threadId,
    roomId: 'studio-pulse-social-director',
    userId: 'studio-pulse-ui',
    activeCharacterId: 'aisha',
    activeSpeakerId: 'aisha',
    message: prompt,
    messageText: prompt,
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
        flags: input.flags,
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
    ? validateDirectorOutput(parsed, { userMessage: input.userMessage })
    : { ok: false, issues: ['invalid-json'], output: null, bannedPhraseFound: false, rawInternalLeak: false, repeatedPointRisk: false, feelsTaskRouterRisk: false };
  return { response, content, parsed, validation };
}

async function runSocialDirectorTurn({
  body = {},
  callAishaEngine,
  runtimeOptions = {}
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
            issues: []
          }, {
            activeEngine: 'aisha-runtime-pack1',
            aishaConnected: first.response?.aishaEngineConnected === true,
            aishaAttempted: true,
            aishaEngineMode: first.response?.engineMode || '',
            aishaTraceStatus: safeTraceStatus(first.response),
            source: 'aisha'
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
              issues: []
            }, {
              activeEngine: 'aisha-runtime-pack1',
              aishaConnected: repair.response?.aishaEngineConnected === true,
              aishaAttempted: true,
              aishaEngineMode: repair.response?.engineMode || '',
              aishaTraceStatus: safeTraceStatus(repair.response),
              repairAttempted: true,
              source: 'aisha-repair'
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

  const fallbackOutput = socialFallbackFor(input.userMessage, body);
  const fallbackValidation = validateDirectorOutput(fallbackOutput, { userMessage: input.userMessage });
  return {
    statusCode: 200,
    payload: responseEnvelope(fallbackValidation.output, {
      ok: fallbackValidation.ok,
      accepted: false,
      source: 'sandbox-fallback',
      issues: fallbackValidation.issues,
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
      source: 'sandbox-fallback'
    })
  };
}

module.exports = {
  MODE,
  buildAishaRequest,
  messageEventsFor,
  runSocialDirectorTurn
};
