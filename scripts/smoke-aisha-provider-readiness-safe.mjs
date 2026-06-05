#!/usr/bin/env node

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const BACKEND_URL = String(
  process.env.BACKEND_URL ||
  'https://silva-backend-799875816242.us-central1.run.app'
).trim().replace(/\/+$/, '');
const LOCAL_PROVIDER_ROOT = path.resolve(String(process.env.LOCAL_PROVIDER_ROOT || process.cwd()));
const ALLOW_MISSING_LOCAL_VAULT = process.env.ALLOW_MISSING_LOCAL_VAULT === '1';
const SECRET_RX = /AIza[0-9A-Za-z_-]+|-----BEGIN|private[_-]?key|GEMINI_API_KEY\s*=|GOOGLE_API_KEY\s*=|sk-[A-Za-z0-9]/i;

function assertOk(condition, message) {
  if (!condition) throw new Error(message);
}

function safeStatus(status = {}) {
  const connected = status.aishaConnected === true || status.aishaEngineConnected === true;
  const engineMode = String(status.engineMode || status.aishaEngineMode || '');
  return {
    ok: status.ok === true,
    aishaConnected: connected,
    aishaEngineConnected: connected,
    engineMode,
    aishaEngineMode: engineMode,
    activeEngine: String(status.activeEngine || ''),
    updatedAt: String(status.updatedAt || '')
  };
}

function safeShowcaseStatus(status = {}) {
  return {
    ok: status.ok === true,
    activeEngine: String(status.activeEngine || ''),
    aishaEngineConnected: status.aishaEngineConnected === true,
    aishaEngineMode: String(status.aishaEngineMode || ''),
    persistenceConnected: status.persistence?.connected === true
  };
}

function localVaultProof(root) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: path.join(root, '.env'), quiet: true });
  } catch {}

  try {
    const vaultPath = path.join(root, 'lib/imageGeneration/providerVault.js');
    const { geminiVaultKeyEntries } = require(vaultPath);
    const entries = typeof geminiVaultKeyEntries === 'function' ? geminiVaultKeyEntries() : [];
    const labels = entries.map(item => String(item?.label || item?.provider || '')).filter(Boolean);
    const studioPulseGeminiVaultKeyPresent = entries.some(item => /studio pulse vault/i.test(String(item?.label || '')));
    return {
      ok: studioPulseGeminiVaultKeyPresent,
      providerRoot: root,
      studioPulseGeminiVaultKeyPresent,
      geminiCredentialCount: entries.filter(item => String(item?.provider || '').toLowerCase() === 'gemini').length,
      labels
    };
  } catch (err) {
    return {
      ok: false,
      providerRoot: root,
      studioPulseGeminiVaultKeyPresent: false,
      geminiCredentialCount: 0,
      labels: [],
      error: String(err?.message || err || '').replace(SECRET_RX, '[redacted]')
    };
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const text = await response.text();
  assertOk(!SECRET_RX.test(text), `${url} leaked secret-like material`);
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${url} returned non-JSON HTTP ${response.status}`);
  }
  return { httpStatus: response.status, json };
}

const localVault = localVaultProof(LOCAL_PROVIDER_ROOT);
const statusResponse = await fetchJson(`${BACKEND_URL}/api/studio/pulse/aisha-status?refresh=1`);
const showcaseResponse = await fetchJson(`${BACKEND_URL}/api/studio/pulse-showcase/status?refresh=1`);
const runtime = safeStatus(statusResponse.json || {});
const showcase = safeShowcaseStatus(showcaseResponse.json || {});
const summary = {
  backendUrl: BACKEND_URL,
  localVault: {
    ok: localVault.ok,
    providerRoot: localVault.providerRoot,
    studioPulseGeminiVaultKeyPresent: localVault.studioPulseGeminiVaultKeyPresent,
    geminiCredentialCount: localVault.geminiCredentialCount,
    labels: localVault.labels,
    ...(localVault.error ? { error: localVault.error } : {})
  },
  cloudRunRuntime: {
    httpStatus: statusResponse.httpStatus,
    ...runtime,
    cloudRunRuntimeConnected: runtime.aishaEngineConnected === true && runtime.activeEngine === 'aisha-runtime-pack1',
    showcaseStatusHttpStatus: showcaseResponse.httpStatus,
    showcase
  }
};

const serialized = JSON.stringify(summary, null, 2);
assertOk(!SECRET_RX.test(serialized), 'summary included secret-like material');
console.log(serialized);

if (!localVault.ok && !ALLOW_MISSING_LOCAL_VAULT) {
  console.error('Local provider vault proof failed: studio_pulse.gemini_api_key is not present.');
  process.exit(1);
}
if (statusResponse.httpStatus !== 200 || runtime.ok !== true) {
  console.error('A.I.S.H.A status endpoint did not return ok.');
  process.exit(1);
}
if (runtime.activeEngine !== 'aisha-runtime-pack1' || runtime.aishaEngineConnected !== true) {
  console.error('Pack 1 runtime is not connected.');
  process.exit(1);
}
if (showcase.persistenceConnected !== true) {
  console.error('Pack 1 persistence is not connected.');
  process.exit(1);
}
