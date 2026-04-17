require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[supabaseClient] env check', {
    hasUrl: !!supabaseUrl,
    hasPublishableKey: !!supabaseKey,
    cwd: process.cwd(),
  });
  throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
