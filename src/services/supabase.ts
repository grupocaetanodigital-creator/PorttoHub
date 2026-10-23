import { createClient } from '@supabase/supabase-js';

const SUPABASE_TARGET_URL = 'https://kkeizhscivyfjgetnbke.supabase.co';
const SUPABASE_TARGET_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';

function resolveSupabaseUrl(): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  if (envUrl && typeof envUrl === 'string' && !envUrl.includes('juafrepntyksgqiqzyes')) {
    return envUrl;
  }
  return SUPABASE_TARGET_URL;
}

function resolveSupabaseKey(): string {
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);
  if (envKey && typeof envKey === 'string' && !envKey.includes('juafrepntyksgqiqzyes')) {
    return envKey;
  }
  return SUPABASE_TARGET_KEY;
}

export const supabase = createClient(resolveSupabaseUrl(), resolveSupabaseKey());
