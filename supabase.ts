
import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from the environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

/**
 * Validates that the cloud infrastructure is reachable.
 * If these logs appear in Vercel, it means you forgot to add the variables in Settings.
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "FINTRACK ARCHITECT NOTICE: Supabase credentials missing. " +
    "Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your Vercel Environment Variables."
  );
}

// Initialize the singleton client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
