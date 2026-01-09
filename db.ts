
import { supabase } from './supabase';

export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
  ALERTS: 'alerts',
  INSIGHTS: 'insights'
};

/**
 * Utility to convert camelCase keys to snake_case for Supabase compatibility.
 */
const toSnakeCase = (obj: any) => {
  const snakeObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeObj[snakeKey] = obj[key];
  }
  return snakeObj;
};

/**
 * Utility to convert snake_case keys back to camelCase for Frontend.
 */
const toCamelCase = (obj: any) => {
  if (!obj) return null;
  const camelObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
    camelObj[camelKey] = obj[key];
  }
  return camelObj;
};

/**
 * Strips out null, undefined, or empty strings from the payload.
 * This prevents Supabase from trying to write to columns that might not exist 
 * or throwing errors on invalid UUID formats for optional fields.
 */
const cleanPayload = (payload: any) => {
  const cleaned: any = {};
  for (const key in payload) {
    const val = payload[key];
    // Only include keys that have actual content. 
    // This solves "column not found" errors if optional columns are missing in the DB.
    if (val !== null && val !== undefined && val !== "") {
      cleaned[key] = val;
    }
  }
  return cleaned;
};

export const FireballDB = {
  async fetchAll() {
    const { data: accounts } = await supabase.from('accounts').select('*');
    const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    const { data: categories } = await supabase.from('categories').select('*');
    const { data: budgets } = await supabase.from('budgets').select('*');
    
    return { 
      accounts: (accounts || []).map(toCamelCase), 
      transactions: (transactions || []).map(toCamelCase), 
      categories: (categories || []).map(toCamelCase), 
      budgets: (budgets || []).map(toCamelCase) 
    };
  },

  async insert(table: string, data: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Authentication required for database write.");

    // Map keys and inject user_id explicitly for RLS compliance
    let payload = { 
      ...toSnakeCase(data), 
      user_id: user.id 
    };

    // Strip empty/null fields so they don't trigger "Column not found" if missing in DB
    payload = cleanPayload(payload);

    const { data: inserted, error } = await supabase.from(table)
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error(`Supabase Insert Error [${table}]:`, error.message, error.details || error.hint);
      throw error;
    }
    return toCamelCase(inserted);
  },

  async update(table: string, id: string, data: any) {
    let payload = toSnakeCase(data);
    payload = cleanPayload(payload);
    
    const { error } = await supabase.from(table).update(payload).eq('id', id);
    if (error) {
      console.error(`Supabase Update Error:`, error.message);
      throw error;
    }
  },

  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }
};
