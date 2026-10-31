import { createClient } from '@supabase/supabase-js';
import { cachedQuery } from './redisCacheService';

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
 * Nome do Bucket padrão do Supabase Storage ('encomendas').
 * O sistema opera exclusivamente com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
 * Nenhuma variável VITE_SUPABASE_STORAGE_BUCKET é necessária ou esperada.
 */
export function obterStorageBucket(): string {
  return DEFAULT_STORAGE_BUCKET;
}

/**
 * Configurações de Conexão e Pooler do Supabase (PgBouncer / Supavisor)
 * 
 * DIRETRIZES DE CONNECTION LIMITS NA VERCEL:
 * - Porta 5432: Modo Sessão (Direto ao PostgreSQL) -> Limite estrito (~60 conexões). NÃO USAR na Vercel!
 * - Porta 6543: Modo Transação (Supavisor / PgBouncer) -> Suporta milhares de lambdas concorrentes.
 *   Connection String Vercel: postgresql://postgres.[REF]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true
 */
export function obterConfiguracaoPooler() {
  const url = obterSupabaseUrl();
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match ? match[1] : 'kkeizhscivyfjgetnbke';

  return {
    projectRef,
    portaPoolerTransacao: 6543,
    portaPoolerSessao: 5432,
    hostPoolerPadrao: `aws-0-sa-east-1.pooler.supabase.com`,
    parametroPgBouncer: '?pgbouncer=true',
    modoRecomendadoVercel: 'Transaction Mode (Port 6543)'
  };
}

/**
 * Cliente Oficial Dedicado do Supabase para Banco de Dados e Realtime
 * Otimizado com keepalive, schema public e tratamento de reconexão de WebSockets
 */
export const supabase = createClient(obterSupabaseUrl(), obterSupabaseKey(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'porttohub-localfirst-pwa'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
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

/**
 * Cliente Inteligente com Suporte a Cache Redis para Aceleração de Consultas
 */
export const supabaseCached = {
  from: (table: string) => {
    let selectFields = '*';
    const filters: Array<{ field: string; op: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'ilike'; value: any }> = [];
    let orderByOpt: { field: string; ascending?: boolean } | undefined;
    let limitCount: number | undefined;
    let ttlSecs = 180;
    let condoId: string | undefined;

    const builder = {
      select: (fields: string = '*') => {
        selectFields = fields;
        return builder;
      },
      eq: (field: string, value: any) => {
        filters.push({ field, op: 'eq', value });
        if (field === 'condominio_id') condoId = String(value);
        return builder;
      },
      neq: (field: string, value: any) => {
        filters.push({ field, op: 'neq', value });
        return builder;
      },
      in: (field: string, values: any[]) => {
        filters.push({ field, op: 'in', value: values });
        return builder;
      },
      order: (field: string, opts?: { ascending?: boolean }) => {
        orderByOpt = { field, ascending: opts?.ascending ?? true };
        return builder;
      },
      limit: (count: number) => {
        limitCount = count;
        return builder;
      },
      ttl: (seconds: number) => {
        ttlSecs = seconds;
        return builder;
      },
      async execute<T = any[]>(): Promise<{ data: T | null; error: any }> {
        try {
          const data = await cachedQuery<T>({
            table,
            select: selectFields,
            filters,
            orderBy: orderByOpt,
            limit: limitCount,
            ttlSeconds: ttlSecs,
            condominioId: condoId
          });
          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    };

    return builder;
  }
};
