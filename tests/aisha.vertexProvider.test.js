const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Pack 1 production boot accepts Vertex Gemini credentials without requiring a Gemini API key', () => {
  const hostAdapter = readRepoFile('packages/aisha-runtime-pack1/src/host/aishaHostAdapter.ts');

  assert.match(hostAdapter, /productionVertexGeminiConfigFromEnv/);
  assert.match(hostAdapter, /VERTEX_SERVICE_ACCOUNT_JSON_PATH\s*\|\|\s*env\.GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(hostAdapter, /if \(!apiKey && !vertexGemini\)/);
  assert.match(hostAdapter, /No GEMINI_API_KEY or Vertex Gemini credentials found/);
  assert.doesNotMatch(hostAdapter, /if \(!apiKey\) \{\s*const mode = productionPersistenceMode\(\)/);
});

test('Pack 1 Vertex Gemini path is preferred and uses JSON-schema output config', () => {
  const adapter = readRepoFile('packages/aisha-runtime-pack1/src/generation/geminiGeneratorAdapter.ts');

  assert.match(adapter, /provider:\s*"vertex-gemini"/);
  assert.match(adapter, /if \(hasVertex\) \{\s*return this\.generateWithVertex/s);
  assert.match(adapter, /responseMimeType:\s*"application\/json"/);
  assert.match(adapter, /responseJsonSchema:/);
});
