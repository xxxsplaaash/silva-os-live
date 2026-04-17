const express = require('express');
const { statements, normalizePrompt, rowWithPayload } = require('../db/sqlite');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = statements.getPrompts.all();
  res.json({ ok: true, items: rows.map(rowWithPayload) });
});

router.get('/:id', (req, res) => {
  const row = statements.getPromptById.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Prompt not found.' });
  res.json({ ok: true, item: rowWithPayload(row) });
});

router.post('/', (req, res) => {
  const body = req.body || {};
  const normalized = normalizePrompt(body);
  statements.upsertPrompt.run(normalized);
  const row = statements.getPromptById.get(normalized.id);
  res.status(201).json({ ok: true, item: rowWithPayload(row) });
});

router.patch('/:id', (req, res) => {
  const existing = statements.getPromptById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Prompt not found.' });
  const merged = { ...rowWithPayload(existing), ...req.body, id: req.params.id };
  const normalized = normalizePrompt(merged);
  statements.upsertPrompt.run(normalized);
  const row = statements.getPromptById.get(req.params.id);
  res.json({ ok: true, item: rowWithPayload(row) });
});

module.exports = router;
