import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = 'https://kkeizhscivyfjgetnbke.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';
export const DEFAULT_STORAGE_BUCKET = 'encomendas';

/**
 * Resolve a URL do Supabase para o Storage com suporte a env vars e override em runtime
 */
export function obterSupabaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const salvo = window.localStorage.getItem('porttohub_supabase_url');
    if (salvo && salvo.trim().startsWith('http')) {
      return salvo.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_SUPABASE_URL;
}

/**
 * Resolve a Anon Key do Supabase para o Storage
 */
export function obterSupabaseKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const salvo = window.localStorage.getItem('porttohub_supabase_key');
    if (salvo && salvo.trim().length > 10) {
      return salvo.trim();
    }
  }
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return DEFAULT_SUPABASE_KEY;
}

/**
 * Resolve o nome do Bucket do Supabase Storage
 */
export function obterStorageBucket(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const salvo = window.localStorage.getItem('porttohub_supabase_bucket');
    if (salvo && salvo.trim()) {
      return salvo.trim();
    }
  }
  const envBucket = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_STORAGE_BUCKET) ||
                    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_STORAGE_BUCKET);
  if (envBucket && typeof envBucket === 'string' && envBucket.trim()) {
    return envBucket.trim();
  }
  return DEFAULT_STORAGE_BUCKET;
}

/**
 * Cliente Oficial Dedicado do Supabase Storage para Arquitetura Híbrida:
 * Permite upload direto e geração de URLs públicas de arquivos sem depender de disco de servidor.
 */
export const supabaseStorage = createClient(obterSupabaseUrl(), obterSupabaseKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
