const { createClient } = require('@supabase/supabase-js');

function getSupabase(req) {
  const token = req.accessToken; // dari middleware authenticate

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
}

module.exports = { getSupabase };