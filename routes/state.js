const express = require('express');
const { statements, migrateState, rowWithPayload, parseJson } = require('../db/sqlite');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const router = express.Router();

router.get('/workspace', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspace_state')
      .select('workspace_key, state, updated_at')
      .eq('workspace_key', 'primary')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({
      ok: true,
      workspace: data || null,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/workspace', async (req, res) => {
  try {
    const payload = req.body || {};

    const { data, error } = await supabaseAdmin
      .from('workspace_state')
      .upsert(
        {
          workspace_key: 'primary',
          state: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_key' }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({
      ok: true,
      workspace: data,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});


router.get('/export', (req, res) => {
  const prompts = statements.getPrompts.all().map(rowWithPayload);
  const gallery = statements.getGallery.all().map(rowWithPayload);
  const plannerPosts = statements.getPlanner.all().map(rowWithPayload);
  const sessionLog = statements.getSessionLogs.all(300).map(row => ({
    id: row.id,
    type: row.type,
    ts: row.ts,
    meta: parseJson(row.payload_json, {})
  }));

  const characterState = {};
  for (const row of statements.getCharacterStates.all()) {
    characterState[row.character_id] = parseJson(row.payload_json, {});
  }

  const relationships = {};
  for (const row of statements.getRelationships.all()) {
    relationships[row.pair_key] = parseJson(row.payload_json, {});
  }

  res.json({
    ok: true,
    state: {
      prompts,
      gallery,
      plannerPosts,
      sessionLog,
      personhood: {
        liveState: characterState,
        relationships
      }
    }
  });
});

router.post('/migrate', (req, res) => {
  const source = req.body?.source || 'frontend_localStorage';
  const state = req.body?.state;

  if (!state || typeof state !== 'object') {
    return res.status(400).json({ ok: false, error: 'A state object is required.' });
  }

  const result = migrateState(state, source);
  res.status(201).json({ ok: true, ...result });
});

router.get('/summary', (req, res) => {
  const lastMigration = statements.getSystemState.get('last_migration');
  res.json({
    ok: true,
    counts: {
      prompts: statements.getPrompts.all().length,
      gallery: statements.getGallery.all().length,
      plannerPosts: statements.getPlanner.all().length,
      characterState: statements.getCharacterStates.all().length,
      relationships: statements.getRelationships.all().length
    },
    lastMigration: lastMigration ? parseJson(lastMigration.value_json, {}) : null
  });
});

module.exports = router;
