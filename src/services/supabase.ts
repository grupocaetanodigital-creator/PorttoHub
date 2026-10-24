import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_URL = 'https://kkeizhscivyfjgetnbke.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';
export const DEFAULT_STORAGE_BUCKET = 'encomendas';

/**
 * Resolve a URL do Supabase com suporte a env vars e override em runtime via localStorage
 */
export function obterSupabaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const salvo = window.localStorage.getItem('porttohub_supabase_url');
    // Sanitização automática: remove URLs legadas (OCI ou projetos antigos)
    if (salvo && (salvo.includes('163.176.49.21') || salvo.includes('fukxrdzhryumbcqibtas') || salvo.includes('juafrepntyksgqiqzyes') || !salvo.includes('supabase.co'))) {
      window.localStorage.removeItem('porttohub_supabase_url');
      window.localStorage.removeItem('porttohub_supabase_key');
      window.localStorage.removeItem('porttohub_supabase_bucket');
    } else if (salvo && salvo.trim().startsWith('http')) {
      return salvo.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL);
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return SUPABASE_PROJECT_URL;
}

/**
 * Resolve a Anon Key do Supabase com suporte a env vars e override em runtime via localStorage
 */
export function obterSupabaseKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const salvoUrl = window.localStorage.getItem('porttohub_supabase_url');
    if (salvoUrl && (salvoUrl.includes('163.176.49.21') || !salvoUrl.includes('supabase.co'))) {
      window.localStorage.removeItem('porttohub_supabase_key');
    } else {
      const salvo = window.localStorage.getItem('porttohub_supabase_key');
      if (salvo && salvo.trim().length > 10) {
        return salvo.trim();
      }
    }
  }
  const envKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
                 (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY);
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return SUPABASE_ANON_KEY;
}

/**
 * Nome do Bucket padrão do Supabase Storage ('encomendas')
 * Funciona de forma 100% automática sem exigir VITE_SUPABASE_STORAGE_BUCKET
 */
export function obterStorageBucket(): string {
  return DEFAULT_STORAGE_BUCKET;
}

/**
 * Cliente Oficial Dedicado do Supabase para Banco de Dados e Realtime
 */
export const supabase = createClient(obterSupabaseUrl(), obterSupabaseKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  db: {
    schema: 'public'
  }
});

/**
 * Cliente Oficial Dedicado do Supabase Storage
 */
export const supabaseStorage = createClient(obterSupabaseUrl(), obterSupabaseKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

/**
 * Utilitários de Diagnóstico e Compatibilidade
 */
export function obterStatusConexaoBanco() {
  const urlAtual = obterSupabaseUrl();
  const customizado = urlAtual !== SUPABASE_PROJECT_URL;
  return {
    url: urlAtual,
    tipo: 'supabase' as const,
    projectId: 'kkeizhscivyfjgetnbke',
    customizado
  };
}

export function salvarConfiguracaoOCI(url: string, key?: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (url) window.localStorage.setItem('porttohub_supabase_url', url.trim());
    if (key) window.localStorage.setItem('porttohub_supabase_key', key.trim());
  }
}

export function limparConfiguracaoOCI(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('porttohub_supabase_url');
    window.localStorage.removeItem('porttohub_supabase_key');
  }
}

export const OCI_DEFAULT_IP = '163.176.49.21';
export const OCI_DEFAULT_URL = SUPABASE_PROJECT_URL;
export function resolveApiUrl(): string { return obterSupabaseUrl(); }
export function resolveApiKey(): string { return obterSupabaseKey(); }
