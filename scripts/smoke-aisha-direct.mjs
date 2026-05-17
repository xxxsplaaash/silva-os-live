#!/usr/bin/env node

import { processAishaRequest } from 'aisha-runtime-pack1';

function safeText(value = '') {
  return String(value || '')
    .replace(/AIza[0-9A-Za-z_-]+/g, '[redacted-key]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted-token]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

const request = {
  sessionId: 'aisha-direct-smoke',
  userId: 'studio-user',
  threadId: 'aisha-direct-smoke-thread',
  roomId: 'studio-pulse-room',
  activeSpeakerId: 'vanya',
  activeCharacterId: 'vanya',
  messageText: process.argv.slice(2).join(' ').trim() || 'hi team',
  recentMessages: [],
  localRoomState: {
    roomMood: 'steady',
    knownPresenceStatus: {
      aisha: 'active',
      vanya: 'active',
      leah: 'quiet',
      claudia: 'quiet',
      grok: 'quiet',
    },
  },
  characterStates: {
    vanya: {
      personId: 'vanya',
      displayName: 'Vanya Khumalo',
      presence: 'active',
      mood: 'warm',
      currentIntent: 'greeting',
    },
  },
  projectContext: {
    smoke: 'direct-aisha',
    dialogueQualityV02: {
      schemaVersion: 'studio-pulse.dialogue-quality.v0.2',
      plannedSpeakerId: 'vanya',
      plannedSpeakerName: 'Vanya Khumalo',
      responseIntent: 'greeting',
      selectionReason: 'room greeting',
      turnMode: 'room-social',
      qualityRules: ['Do not start with generic assistant filler.'],
    },
  },
  modalityMetadata: {
    sourceModality: 'text',
    sourceChannel: 'chat',
    activeSpeakerId: 'vanya',
  },
};

try {
  const response = await processAishaRequest(request, { engineMode: 'production' });
  const first = Array.isArray(response.responses) ? response.responses[0] : null;
  console.log(JSON.stringify({
    ok: response.ok === true,
    engineMode: safeText(response.engineMode || ''),
    aishaEngineConnected: response.aishaEngineConnected === true,
    fallbackReason: safeText(response.fallbackReason || ''),
    traceStatus: safeText(response.trace?.status || ''),
    traceFailureReason: safeText(response.trace?.failureReason || ''),
    responseCount: Array.isArray(response.responses) ? response.responses.length : 0,
    firstResponseHasContent: !!String(first?.content || first?.text || '').trim(),
  }, null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    error: safeText(error?.message || error),
  }, null, 2));
  process.exitCode = 1;
}
