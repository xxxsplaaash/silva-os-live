#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const inputPath = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : '';
const raw = readFileSync(inputPath || 0, 'utf8');
const payload = JSON.parse(raw);
const results = Array.isArray(payload.results) ? payload.results : [];

const LEAK_RX = /prompt|visiblePreview|cards|text|generatorPrompt|socialCues|aishaDiagnostics|requestShapeSummary|processAishaRequestType|provider payload|raw model|GEMINI_API_KEY|GOOGLE_API_KEY|AIza[0-9A-Za-z_-]+|test-room-provider-key/i;
const SPEAKERS = new Set(['aisha', 'vanya', 'leah', 'claudia', 'grok']);

function safeToken(value = '', fallback = '') {
  const token = String(value || '').trim().toLowerCase();
  return /^[a-z0-9:_./-]{1,96}$/.test(token) ? token : fallback;
}

function safeIssueList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => safeToken(item)).filter(Boolean).slice(0, 12);
}

function safeSpeakerList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => safeToken(item))
    .filter(item => SPEAKERS.has(item))
    .slice(0, 5);
}

function countBy(values = []) {
  const counts = {};
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function latencySummary(values = []) {
  const latencies = values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);
  if (!latencies.length) return { minMs: 0, avgMs: 0, p95Ms: 0, maxMs: 0 };
  const sum = latencies.reduce((total, value) => total + value, 0);
  const p95Index = Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1);
  return {
    minMs: latencies[0],
    avgMs: Math.round(sum / latencies.length),
    p95Ms: latencies[p95Index],
    maxMs: latencies[latencies.length - 1]
  };
}

const attempts = results.map((item, index) => {
  const diagnostics = item && typeof item.operatorDiagnostics === 'object' ? item.operatorDiagnostics : {};
  return {
    turnIndex: index + 1,
    mode: safeToken(item.mode),
    classification: safeToken(item.classification),
    activeEngine: safeToken(item.activeEngine),
    acceptedByPack1: item.acceptedByPack1 === true,
    repairedByRuntime: item.repairedByRuntime === true,
    latencyMs: Number(item.latencyMs) || 0,
    firstAttemptStatus: safeToken(diagnostics.firstAttemptStatus),
    repairAttemptStatus: safeToken(diagnostics.repairAttemptStatus),
    firstAttemptCategory: safeToken(diagnostics.firstAttemptCategory),
    repairAttemptCategory: safeToken(diagnostics.repairAttemptCategory),
    firstAttemptAccepted: diagnostics.firstAttemptAccepted === true,
    repairAttemptAccepted: diagnostics.repairAttemptAccepted === true,
    firstAttemptIssueCount: Math.max(0, Math.min(50, Math.round(Number(diagnostics.firstAttemptIssueCount || 0) || 0))),
    repairAttemptIssueCount: Math.max(0, Math.min(50, Math.round(Number(diagnostics.repairAttemptIssueCount || 0) || 0))),
    firstAttemptResponseMode: safeToken(diagnostics.firstAttemptResponseMode),
    repairAttemptResponseMode: safeToken(diagnostics.repairAttemptResponseMode),
    firstAttemptSpeakerOrder: safeSpeakerList(diagnostics.firstAttemptSpeakerOrder),
    repairAttemptSpeakerOrder: safeSpeakerList(diagnostics.repairAttemptSpeakerOrder),
    firstAttemptIssues: safeIssueList(diagnostics.firstAttemptIssues),
    repairAttemptIssues: safeIssueList(diagnostics.repairAttemptIssues),
    providerValidationIssues: safeIssueList(diagnostics.providerValidationIssues),
    publicQualityIssues: safeIssueList(diagnostics.publicQualityIssues),
    plannedSpeakerOrder: safeSpeakerList(diagnostics.plannedSpeakerOrder),
    actualSpeakerOrder: safeSpeakerList(diagnostics.actualSpeakerOrder),
    fallbackCategory: safeToken(diagnostics.fallbackCategory || item.fallbackCategory),
    qualityFailureCategory: safeToken(diagnostics.qualityFailureCategory || item.qualityFailureCategory)
  };
});

const counts = payload.counts && typeof payload.counts === 'object' ? payload.counts : {};
const accepted = Number(counts.accepted ?? attempts.filter(item => item.classification === 'accepted').length) || 0;
const repaired = Number(counts.repaired ?? attempts.filter(item => item.classification === 'repaired').length) || 0;
const fallback = Number(counts.fallback ?? attempts.filter(item => item.classification === 'fallback').length) || 0;
const summary = {
  schemaVersion: 'studio-pulse.operator-diagnostics-summary.v0.1',
  backendUrl: String(payload.backendUrl || '').replace(/\/+$/, ''),
  sessionIdPresent: Boolean(payload.sessionId),
  totalTurns: results.length,
  turnsWithDiagnostics: attempts.filter(item => item.firstAttemptStatus || item.repairAttemptStatus || item.firstAttemptIssues.length || item.repairAttemptIssues.length).length,
  acceptance: {
    accepted,
    repaired,
    fallback,
    cleanAcceptedRate: results.length ? Number((accepted / results.length).toFixed(3)) : 0
  },
  latency: latencySummary(attempts.map(item => item.latencyMs)),
  issueCounts: {
    firstAttempt: countBy(attempts.flatMap(item => item.firstAttemptIssues)),
    repairAttempt: countBy(attempts.flatMap(item => item.repairAttemptIssues)),
    firstAttemptCategory: countBy(attempts.map(item => item.firstAttemptCategory).filter(Boolean)),
    repairAttemptCategory: countBy(attempts.map(item => item.repairAttemptCategory).filter(Boolean)),
    providerValidation: countBy(attempts.flatMap(item => item.providerValidationIssues)),
    publicQuality: countBy(attempts.flatMap(item => item.publicQualityIssues)),
    finalQualityCategory: countBy(attempts.map(item => item.qualityFailureCategory).filter(Boolean))
  },
  attemptOutcomes: {
    firstAccepted: attempts.filter(item => item.firstAttemptAccepted).length,
    repairAccepted: attempts.filter(item => item.repairAttemptAccepted).length,
    firstRejected: attempts.filter(item => item.firstAttemptStatus && !item.firstAttemptAccepted).length,
    repairRejected: attempts.filter(item => item.repairAttemptStatus && !item.repairAttemptAccepted).length
  },
  attemptSummaries: attempts
};

const serialized = JSON.stringify(summary, null, 2);
if (LEAK_RX.test(serialized)) {
  throw new Error('diagnostic summary would expose raw prompt, visible text, provider, or internal diagnostic material');
}
console.log(serialized);
