
import { createClient } from '@supabase/supabase-js';

/**
 * Retrieve credentials from the environment.
 * Values are populated in index.html for this project.
 */
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

/**
 * Validation flag to ensure we don't call createClient with invalid/empty parameters.
 */
export const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

/**
 * Create the client singleton. 
 * Using a proxy-safe approach to avoid crashing the module if not configured.
 */
export const supabase = isConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null as any;
