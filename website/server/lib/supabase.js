const { createClient } = require('@supabase/supabase-js');

function createSupabase(config) {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return null;
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = { createSupabase };
