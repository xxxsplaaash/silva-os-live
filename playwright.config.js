const { defineConfig } = require('@playwright/test');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3225';

module.exports = defineConfig({
  testDir: './tests/accessibility',
  testMatch: '**/*.spec.cjs',
  timeout: 180000,
  expect: {
    timeout: 5000
  },
  use: {
    baseURL,
    trace: 'retain-on-failure'
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'PORT=3225 npm start',
    url: `${baseURL}/health`,
    reuseExistingServer: true,
    timeout: 30000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});
