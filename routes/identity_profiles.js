const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabaseAdmin');

router.get('/profiles', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('character_profiles')
      .select('id, payload, updated_at')
      .order('id', { ascending: true });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, profiles: data || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('character_profiles')
      .select('id, payload, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, profile: data || null });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const { data, error } = await supabaseAdmin
      .from('character_profiles')
      .upsert(
        {
          id,
          payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, profile: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
