const {
  statements,
  parseJson,
  normalizeSessionLog,
  normalizeStudioPulseThread,
  appendStudioPulseThreadMessages,
  replaceStudioPulseThreadMessages,
  getStudioPulseThreads,
  searchStudioPulseThreads,
  getStudioPulseThreadById,
  getStudioPulseMessages
} = require('../../db/sqlite');
const { participantsFromResponse } = require('./council');

function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function pairKey(a, b) {
  return [String(a || '').toLowerCase(), String(b || '').toLowerCase()].sort().join('__');
}

function getStudioTurnHistory(limit = 12) {
  const rows = statements.getSessionLogs.all(Math.max(limit * 4, 40));
  const turns = [];
  for (const row of rows) {
    if (row.type !== 'studio_pulse_turn') continue;
    const payload = parseJson(row.payload_json, {});
    turns.push({
      id: row.id,
      ts: row.ts,
      q: String(payload.q || ''),
      effectiveQuestion: String(payload.effectiveQuestion || payload.q || ''),
      mode: String(payload.mode || 'direction'),
      summary: String(payload.summary || ''),
      lead: String(payload.lead || payload.departmentLead || ''),
      departmentLead: String(payload.departmentLead || payload.lead || ''),
      aishaFinal: String(payload.aishaFinal || payload.response?.aishaFinal || ''),
      participants: Array.isArray(payload.participants) ? payload.participants : participantsFromResponse(payload.response || {}),
      response: payload.response || null,
      fallback: !!payload.fallback,
      clarification: !!payload.clarification,
      threadId: String(payload.threadId || payload.response?.threadMeta?.id || '')
    });
    if (turns.length >= limit) break;
  }
  return turns;
}

function logStudioTurn(input = {}) {
  statements.upsertSessionLog.run(normalizeSessionLog({
    type: 'studio_pulse_turn',
    ts: input.ts,
    payload: input
  }));
}

function applyRelationshipDeltas(deltas = []) {
  const applied = [];
  for (const delta of Array.isArray(deltas) ? deltas : []) {
    const a = String(delta?.a || '').toLowerCase();
    const b = String(delta?.b || '').toLowerCase();
    if (!a || !b || a === b) continue;
    const key = pairKey(a, b);
    const existingRow = statements.getRelationshipByKey.get(key);
    const existing = existingRow ? parseJson(existingRow.payload_json, {}) : {};
    const next = {
      a,
      b,
      trust: clamp((existing.trust == null ? 0.58 : Number(existing.trust)) + Number(delta.trust || 0)),
      respect: clamp((existing.respect == null ? 0.62 : Number(existing.respect)) + Number(delta.respect || 0)),
      warmth: clamp((existing.warmth == null ? 0.48 : Number(existing.warmth)) + Number(delta.warmth || 0)),
      friction: clamp((existing.friction == null ? 0.18 : Number(existing.friction)) + Number(delta.friction || 0)),
      collaborationCount: Number(existing.collaborationCount || 0) + 1,
      recentTensionTopic: String(delta.note || existing.recentTensionTopic || ''),
      updatedAt: new Date().toISOString()
    };
    statements.upsertRelationship.run({
      pair_key: key,
      payload_json: JSON.stringify(next),
      updated_at: next.updatedAt
    });
    applied.push({ key, ...next });
  }
  return applied;
}

function chooseThreadTitle(question = '', response = {}) {
  const q = String(question || '').trim();
  if (!q) return String(response?.title || 'Untitled Studio Pulse chat').trim() || 'Untitled Studio Pulse chat';
  return q.length > 72 ? `${q.slice(0, 69).trim()}...` : q;
}

function sanitizeThreadStatus(value = '') {
  const status = String(value || '').trim().toLowerCase();
  return ['active', 'saved', 'archived'].includes(status) ? status : 'active';
}

function messageSignature(item = {}) {
  const speakerId = String(item?.speakerId || item?.speaker_id || '').trim().toLowerCase();
  const text = String(item?.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!speakerId || !text) return '';
  return `${speakerId}::${text}`;
}

function isUserMessage(item = {}) {
  return String(item?.speakerId || item?.speaker_id || '').trim().toLowerCase() === 'user';
}

function hasRecentDuplicate(item = {}, recentMessages = [], windowSize = 24) {
  if (isUserMessage(item)) return false;
  const signature = messageSignature(item);
  if (!signature) return false;
  return recentMessages.slice(-windowSize).some(existing => !isUserMessage(existing) && messageSignature(existing) === signature);
}

function makeThreadScopedMessageId(threadId = '', speakerId = '', kind = 'message', index = 0, createdAt = '') {
  const baseTs = Date.parse(String(createdAt || '')) || Date.now();
  const safeSpeaker = String(speakerId || 'msg').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || 'msg';
  const safeKind = String(kind || 'message').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || 'message';
  return `${String(threadId || 'pulse_thread').trim()}_${baseTs.toString(36)}_${String(index).padStart(2, '0')}_${safeSpeaker}_${safeKind}`;
}

function upsertStudioThread(input = {}) {
  const normalized = normalizeStudioPulseThread({
    ...input,
    status: sanitizeThreadStatus(input.status)
  });
  statements.upsertStudioPulseThread.run(normalized);
  return getStudioPulseThreadById(normalized.id);
}

function storeStudioThreadConversation({
  threadId = '',
  title = '',
  status = 'active',
  includeInContext = true,
  pinned = false,
  question = '',
  directTarget = '',
  userReplyToId = '',
  userTargetSpeakerId = '',
  userTargetType = 'room',
  userMetadata = {},
  mode = 'direction',
  response = {},
  userTs = '',
  threadMeta = {}
} = {}) {
  const safeThreadId = String(threadId || '').trim() || normalizeStudioPulseThread({}).id;
  const now = new Date().toISOString();
  const messageEvents = Array.isArray(response?.messageEvents) ? response.messageEvents : [];
  const existingMessages = getStudioPulseMessages(safeThreadId);
  const nextUserTurnIndex = (() => {
    const explicit = Number(threadMeta?.userTurnIndex || 0) || 0;
    if (question) return Math.max(1, explicit || (existingMessages.filter(item => isUserMessage(item)).length + 1));
    const latestExisting = Math.max(...existingMessages.map(item => Number(item?.userTurnIndex || 0)).filter(Number.isFinite), 0);
    return Math.max(1, explicit || latestExisting || existingMessages.filter(item => isUserMessage(item)).length);
  })();
  const thread = upsertStudioThread({
    id: safeThreadId,
    title: title || chooseThreadTitle(question, response),
    status,
    includeInContext,
    pinned,
    lastMessageAt: now,
    meta: {
      ...threadMeta,
      mode,
      participants: response?.participants || [],
      summary: response?.summary || '',
      archived: status === 'archived'
    }
  });

  const messages = [];
  if (question) {
    messages.push({
      id: `${safeThreadId}_user_${Date.now().toString(36)}`,
      threadId: safeThreadId,
      userTurnIndex: nextUserTurnIndex,
      speakerId: 'user',
      kind: 'user',
      text: String(question).trim(),
      replyToId: String(userReplyToId || '').trim(),
      targetSpeakerId: String(userTargetSpeakerId || '').trim().toLowerCase(),
      targetType: String(userTargetType || 'room').trim().toLowerCase() || 'room',
      directTarget: String(directTarget || '').trim().toLowerCase(),
      tone: mode,
      delayMs: 0,
      emotionalState: '',
      metadata: userMetadata && typeof userMetadata === 'object' ? userMetadata : {},
      createdAt: userTs || now
    });
  }

  const eventIdMap = new Map();
  const incomingEvents = (Array.isArray(messageEvents) ? messageEvents : []).map((event, idx) => {
    const createdAt = String(event?.createdAt || event?.created_at || now);
    const speakerId = String(event?.speakerId || event?.speaker_id || 'msg').trim().toLowerCase();
    const kind = String(event?.kind || 'message').trim().toLowerCase();
    const rawId = String(event?.id || '').trim();
    const scopedId = rawId && rawId.startsWith(`${safeThreadId}_`)
      ? rawId
      : makeThreadScopedMessageId(safeThreadId, speakerId, kind, idx, createdAt);
    if (rawId) eventIdMap.set(rawId, scopedId);
    return {
      ...event,
      id: scopedId,
      threadId: safeThreadId,
      userTurnIndex: Number.isFinite(Number(event?.userTurnIndex || event?.user_turn_index))
        ? Number(event?.userTurnIndex || event?.user_turn_index)
        : nextUserTurnIndex,
      createdAt,
      __rawReplyToId: String(event?.replyToId || event?.reply_to_id || '').trim()
    };
  });

  incomingEvents.forEach((event) => {
    const replyToId = event.__rawReplyToId
      ? (eventIdMap.get(event.__rawReplyToId) || (event.__rawReplyToId.startsWith(`${safeThreadId}_`) ? event.__rawReplyToId : ''))
      : '';
    const next = { ...event };
    delete next.__rawReplyToId;
    messages.push({
      ...next,
      replyToId
    });
  });

  const filteredIncoming = [];
  const recentRolling = existingMessages.slice(-36);
  const seenIncoming = new Set();
  for (const item of messages) {
    if (!item || !String(item.text || '').trim()) continue;
    const signature = messageSignature(item);
    if (!isUserMessage(item) && signature) {
      if (seenIncoming.has(signature)) continue;
      if (hasRecentDuplicate(item, recentRolling, 28)) continue;
      seenIncoming.add(signature);
    }
    filteredIncoming.push(item);
    recentRolling.push(item);
  }

  const mergedMessages = [...existingMessages, ...filteredIncoming];
  const dedupedMessages = [];
  const seen = new Set();
  for (const item of mergedMessages) {
    const key = String(item?.id || '').trim() || `${item?.speakerId || item?.speaker_id || 'unknown'}::${item?.kind || 'message'}::${item?.text || ''}::${item?.createdAt || item?.created_at || ''}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    dedupedMessages.push(item);
  }

  const cappedMessages = dedupedMessages.slice(-240);
  const canAppendOnly = cappedMessages.length >= existingMessages.length
    && cappedMessages.length <= 240
    && existingMessages.every((item, idx) => String(item?.id || '') === String(cappedMessages[idx]?.id || ''));
  if (canAppendOnly) {
    appendStudioPulseThreadMessages(safeThreadId, filteredIncoming, 240);
  } else {
    replaceStudioPulseThreadMessages(safeThreadId, cappedMessages);
  }
  return {
    thread: getStudioPulseThreadById(safeThreadId),
    messages: cappedMessages
  };
}

function patchStudioThread(threadId, patch = {}) {
  const existing = getStudioPulseThreadById(threadId);
  if (!existing) return null;
  const merged = {
    ...existing,
    ...patch,
    id: existing.id,
    status: sanitizeThreadStatus(patch.status || existing.status),
    includeInContext: patch.includeInContext == null ? existing.includeInContext !== false : patch.includeInContext,
    pinned: patch.pinned == null ? Boolean(existing.pinned) : Boolean(patch.pinned),
    lastMessageAt: patch.lastMessageAt || existing.lastMessageAt || new Date().toISOString()
  };
  statements.upsertStudioPulseThread.run(normalizeStudioPulseThread(merged));
  return getStudioPulseThreadById(threadId);
}

function removeStudioThread(threadId) {
  const existing = getStudioPulseThreadById(threadId);
  if (!existing) return false;
  statements.deleteStudioPulseThread.run(String(threadId));
  return true;
}

function getStudioArchive({ search = '', limit = 60, includeMessages = false } = {}) {
  const threads = search ? searchStudioPulseThreads(search, limit) : getStudioPulseThreads(limit);
  return threads.map(thread => ({
    ...thread,
    messages: includeMessages ? getStudioPulseMessages(thread.id) : []
  }));
}

module.exports = {
  getStudioTurnHistory,
  logStudioTurn,
  applyRelationshipDeltas,
  upsertStudioThread,
  storeStudioThreadConversation,
  patchStudioThread,
  removeStudioThread,
  getStudioArchive,
  getStudioPulseThreadById,
  getStudioPulseMessages
};
