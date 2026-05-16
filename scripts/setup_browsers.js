#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function main() {
  try {
    require.resolve('@playwright/test');
  } catch (_) {
    console.error([
      'Playwright is not installed in node_modules.',
      'Run npm install first for development dependencies, then run npm run setup:browsers.',
      'Release setup intentionally uses npm ci --omit=dev and does not install browser test tooling.'
    ].join('\n'));
    process.exit(1);
  }

  const result = spawnSync('npx', ['playwright', 'install', 'chromium'], {
    cwd: ROOT,
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(`Browser setup failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Browser setup failed: playwright install exited with status ${result.status}.`);
    process.exit(result.status || 1);
  }
}

main();
