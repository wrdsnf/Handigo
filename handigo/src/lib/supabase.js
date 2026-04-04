import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Bypass navigator.locks to prevent deadlocks during Vite HMR
// and inside onAuthStateChange callbacks.
const lockNoOp = async (_name, _acquireTimeout, fn) => await fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: lockNoOp,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
