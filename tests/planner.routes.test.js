const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const TEST_DB_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'silva-planner-routes-test-'));
process.env.SILVA_DB_PATH = path.join(TEST_DB_DIR, 'silva-planner-routes-test.db');

const plannerRouter = require('../routes/planner');
const { db } = require('../db/sqlite');

async function withTestServer(fn) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/planner', plannerRouter);
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function jsonFetch(url, options) {
  const response = await fetch(url, Object.assign({
    headers: { 'content-type': 'application/json' }
  }, options || {}));
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

test.after(() => {
  try { db.close(); } catch {}
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

test('planner route supports date-range reads and POST/PATCH/DELETE flow', async () => {
  await withTestServer(async baseUrl => {
    const posts = [
      { id: 'plan_range_one', title: 'May launch post', char: 'leah', platform: 'instagram', date: '2026-05-01', campaign: 'spring' },
      { id: 'plan_range_two', title: 'May structure post', char: 'claudia', platform: 'linkedin', scheduledFor: '2026-05-08T10:00:00.000Z', campaignId: 'spring' },
      { id: 'plan_range_three', title: 'June diagnostic post', char: 'grok', platform: 'carousel', scheduled_for: '2026-06-01', campaign: 'winter' }
    ];

    for (const post of posts) {
      const { response, body } = await jsonFetch(`${baseUrl}/api/planner`, {
        method: 'POST',
        body: JSON.stringify(post)
      });
      assert.equal(response.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.item.id, post.id);
      assert.match(body.item.date, /^2026-/);
    }

    const may = await jsonFetch(`${baseUrl}/api/planner?from=2026-05-01&to=2026-05-31`);
    assert.equal(may.response.status, 200);
    assert.equal(may.body.ok, true);
    assert.deepEqual(may.body.range, { from: '2026-05-01', to: '2026-05-31' });
    assert.deepEqual(may.body.items.map(item => item.id).sort(), ['plan_range_one', 'plan_range_two']);
    assert.equal(may.body.items.find(item => item.id === 'plan_range_two').date, '2026-05-08');

    const patched = await jsonFetch(`${baseUrl}/api/planner/plan_range_one`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated May launch post', date: '2026-05-09' })
    });
    assert.equal(patched.response.status, 200);
    assert.equal(patched.body.item.title, 'Updated May launch post');
    assert.equal(patched.body.item.date, '2026-05-09');

    const deleted = await jsonFetch(`${baseUrl}/api/planner/plan_range_two`, { method: 'DELETE' });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.deleted, true);
    assert.equal(deleted.body.id, 'plan_range_two');

    const missing = await jsonFetch(`${baseUrl}/api/planner/plan_range_two`);
    assert.equal(missing.response.status, 404);

    const mayAfterDelete = await jsonFetch(`${baseUrl}/api/planner?from=2026-05-01&to=2026-05-31`);
    assert.deepEqual(mayAfterDelete.body.items.map(item => item.id), ['plan_range_one']);
  });
});
