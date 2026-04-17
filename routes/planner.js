const express = require('express');
const { statements, normalizePlanner, rowWithPayload } = require('../db/sqlite');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = statements.getPlanner.all();
  res.json({ ok: true, items: rows.map(rowWithPayload) });
});

router.get('/:id', (req, res) => {
  const row = statements.getPlannerById.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Planner post not found.' });
  res.json({ ok: true, item: rowWithPayload(row) });
});

router.post('/', (req, res) => {
  const normalized = normalizePlanner(req.body || {});
  statements.upsertPlanner.run(normalized);
  const row = statements.getPlannerById.get(normalized.id);
  res.status(201).json({ ok: true, item: rowWithPayload(row) });
});

router.patch('/:id', (req, res) => {
  const existing = statements.getPlannerById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Planner post not found.' });
  const merged = { ...rowWithPayload(existing), ...req.body, id: req.params.id };
  const normalized = normalizePlanner(merged);
  statements.upsertPlanner.run(normalized);
  const row = statements.getPlannerById.get(req.params.id);
  res.json({ ok: true, item: rowWithPayload(row) });
});

module.exports = router;
