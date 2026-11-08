import { createClient } from '@supabase/supabase-js';

// Configuration check for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL'
);

// Fallback client or active client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Sync helper: Allows TurnoCerto to persist locally and optionally sync
 * with Supabase tables if credentials are set.
 */
export async function syncRecordToSupabase(table: string, payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, mode: 'local_storage', data: payload };
  }

  try {
    const { data, error } = await supabase.from(table).upsert(payload).select();
    if (error) {
      console.warn(`[Supabase Sync] Warning on table ${table}:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Supabase Sync] Exception:`, message);
    return { success: false, error: message };
  }
}
