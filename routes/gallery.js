const express = require('express');
const { statements, normalizeGallery, rowWithPayload } = require('../db/sqlite');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = statements.getGallery.all();
  res.json({ ok: true, items: rows.map(rowWithPayload) });
});

router.get('/:id', (req, res) => {
  const row = statements.getGalleryById.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Gallery item not found.' });
  res.json({ ok: true, item: rowWithPayload(row) });
});

router.post('/', (req, res) => {
  const normalized = normalizeGallery(req.body || {});
  statements.upsertGallery.run(normalized);
  const row = statements.getGalleryById.get(normalized.id);
  res.status(201).json({ ok: true, item: rowWithPayload(row) });
});

router.patch('/:id', (req, res) => {
  const existing = statements.getGalleryById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Gallery item not found.' });
  const merged = { ...rowWithPayload(existing), ...req.body, id: req.params.id };
  const normalized = normalizeGallery(merged);
  statements.upsertGallery.run(normalized);
  const row = statements.getGalleryById.get(req.params.id);
  res.json({ ok: true, item: rowWithPayload(row) });
});

module.exports = router;
