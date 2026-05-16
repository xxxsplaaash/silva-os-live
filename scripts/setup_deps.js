#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const RUNTIME_DIR = path.join(ROOT, '.runtime');
const HASH_MARKER = path.join(RUNTIME_DIR, 'deps.hash');
const LOCKFILE = path.join(ROOT, 'package-lock.json');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const NODE_MODULES = path.join(ROOT, 'node_modules');

function log(message = '') {
  process.stdout.write(`${message}\n`);
}

function recoveryMessage(error) {
  const detail = error && error.message ? `\nReason: ${error.message}` : '';
  return [
    '',
    'Dependency setup failed.',
    'Recovery:',
    '1. Delete node_modules and .runtime/deps.hash.',
    '2. Run npm run setup:all again.',
    '3. If better-sqlite3 fails, verify your Node version and native build tools, then retry.',
    '',
    'No API keys or .env values were read or printed by setup.',
    detail
  ].join('\n');
}

function hashFile(filePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

function readExistingHash() {
  try {
    return fs.readFileSync(HASH_MARKER, 'utf8').trim();
  } catch (_) {
    return '';
  }
}

function writeHash(hash) {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(HASH_MARKER, `${hash}\n`);
}

function runNpm(args) {
  const result = spawnSync('npm', args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_audit: process.env.npm_config_audit || 'false',
      npm_config_fund: process.env.npm_config_fund || 'false'
    }
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} exited with status ${result.status}`);
  }
}

function main() {
  if (!fs.existsSync(PACKAGE_JSON)) {
    throw new Error('package.json not found from setup script root.');
  }

  const hasLockfile = fs.existsSync(LOCKFILE);
  const sourceFile = hasLockfile ? LOCKFILE : PACKAGE_JSON;
  const nextHash = hashFile(sourceFile);
  const existingHash = readExistingHash();
  const hasDependencies = fs.existsSync(NODE_MODULES);

  if (hasDependencies && existingHash === nextHash) {
    log('Dependencies are current. Reusing existing node_modules.');
    return;
  }

  if (hasLockfile) {
    log('Lockfile changed or dependencies are missing. Running deterministic install: npm ci --omit=dev');
    runNpm(['ci', '--omit=dev']);
  } else {
    log('No package-lock.json found. Running npm install --omit=dev as a non-deterministic fallback.');
    runNpm(['install', '--omit=dev']);
  }

  writeHash(nextHash);
  log('Dependency setup complete. Wrote .runtime/deps.hash.');
}

try {
  main();
} catch (error) {
  console.error(recoveryMessage(error));
  process.exit(1);
}
