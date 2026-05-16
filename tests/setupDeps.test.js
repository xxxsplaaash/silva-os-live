const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

function makeExecutable(filePath) {
  fs.chmodSync(filePath, 0o755);
}

test('setup:all failure message is clear and secret-safe', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silva-setup-test-'));
  const scriptsDir = path.join(tmp, 'scripts');
  const binDir = path.join(tmp, 'bin');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'scripts/setup_deps.js'), path.join(scriptsDir, 'setup_deps.js'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'setup-test', version: '1.0.0' }, null, 2));
  fs.writeFileSync(path.join(tmp, 'package-lock.json'), JSON.stringify({
    name: 'setup-test',
    version: '1.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'setup-test',
        version: '1.0.0'
      }
    }
  }, null, 2));

  const fakeNpm = path.join(binDir, 'npm');
  fs.writeFileSync(fakeNpm, '#!/bin/sh\necho "fake npm failure" >&2\nexit 7\n');
  makeExecutable(fakeNpm);

  const result = spawnSync(process.execPath, [path.join(scriptsDir, 'setup_deps.js')], {
    cwd: tmp,
    env: {
      ...process.env,
      PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      GOOGLE_API_KEY: 'SECRET_TEST_VALUE'
    },
    encoding: 'utf8'
  });

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.notEqual(result.status, 0);
  assert.match(combined, /Dependency setup failed/);
  assert.match(combined, /Delete node_modules and \.runtime\/deps\.hash/);
  assert.match(combined, /better-sqlite3/);
  assert.doesNotMatch(combined, /SECRET_TEST_VALUE/);
});
