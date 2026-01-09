
import { createClient } from '@supabase/supabase-js';

/**
 * Retrieve credentials from the environment.
 * These are injected via window.process.env in the index.html or Vercel.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

/**
 * We export the client only if configuration is present.
 * This prevents '@supabase/supabase-js' from throwing an "Uncaught Error: supabaseUrl is required" 
 * which would crash the entire JS bundle before any React code can run.
 */
export const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 0);

export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null as any;
