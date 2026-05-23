require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Ensure both env vars are present before continuing
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. ' +
    'Check your backend .env file.'
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role stays server-side only
);

module.exports = { supabase };