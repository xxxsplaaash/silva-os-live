const express = require('express');
const { statements, normalizePlanner, rowWithPayload } = require('../db/sqlite');

const router = express.Router();

function normalizePlannerDateValue(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  const direct = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  if (!/[Tt:\d]{4,}/.test(raw)) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function plannerRowWithPayload(row) {
  const item = rowWithPayload(row) || {};
  const campaign = String(item.campaign || item.campaignId || row?.campaign_id || '').trim();
  const platform = String(item.platform || item.channel || '').trim().toLowerCase();
  const scheduledFor = String(item.scheduledFor || item.scheduled_for || row?.scheduled_for || item.date || '').trim();
  return {
    ...item,
    id: String(item.id || row?.id || '').trim(),
    title: String(item.title || row?.title || '').trim() || 'Untitled planner item',
    char: String(item.char || item.char_id || row?.char_id || '').trim().toLowerCase(),
    platform,
    channel: platform || String(item.channel || '').trim().toLowerCase(),
    campaign,
    campaignId: campaign,
    promptId: item.promptId || item.prompt_id || row?.prompt_id || '',
    scheduledFor,
    scheduled_for: scheduledFor,
    date: normalizePlannerDateValue(item.date || scheduledFor)
  };
}

function plannerDateInRange(item, from, to) {
  const date = normalizePlannerDateValue(item && (item.date || item.scheduledFor || item.scheduled_for));
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

router.get('/', (req, res) => {
  const from = normalizePlannerDateValue(req.query.from);
  const to = normalizePlannerDateValue(req.query.to);
  let items = statements.getPlanner.all().map(plannerRowWithPayload);
  if (from || to) {
    items = items.filter(item => plannerDateInRange(item, from, to));
  }
  res.json({ ok: true, items, count: items.length, range: from || to ? { from: from || null, to: to || null } : null });
});

router.get('/:id', (req, res) => {
  const row = statements.getPlannerById.get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, error: 'Planner post not found.' });
  res.json({ ok: true, item: plannerRowWithPayload(row) });
});

router.post('/', (req, res) => {
  const normalized = normalizePlanner(req.body || {});
  statements.upsertPlanner.run(normalized);
  const row = statements.getPlannerById.get(normalized.id);
  res.status(201).json({ ok: true, item: plannerRowWithPayload(row) });
});

router.patch('/:id', (req, res) => {
  const existing = statements.getPlannerById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Planner post not found.' });
  const merged = { ...plannerRowWithPayload(existing), ...req.body, id: req.params.id };
  const normalized = normalizePlanner(merged);
  statements.upsertPlanner.run(normalized);
  const row = statements.getPlannerById.get(req.params.id);
  res.json({ ok: true, item: plannerRowWithPayload(row) });
});

router.delete('/:id', (req, res) => {
  const existing = statements.getPlannerById.get(req.params.id);
  if (!existing) return res.status(404).json({ ok: false, error: 'Planner post not found.' });
  statements.deletePlanner.run(req.params.id);
  res.json({ ok: true, deleted: true, id: String(req.params.id || '') });
});

module.exports = router;
