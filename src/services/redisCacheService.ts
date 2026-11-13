import { supabase } from './supabase';
import {
  isTabelaIsoladaPorCondominio,
  isValidCondominioId,
  obterAccessTokenSupabase
} from './tenantAuthService';

export interface QueryFilter {
  field: string;
  op: 'eq' | 'neq' | 'in' | 'gte' | 'lte' | 'ilike';
  value: any;
}

export interface CachedQueryOptions {
  table: string;
  select?: string;
  filters?: QueryFilter[];
  orderBy?: { field: string; ascending?: boolean };
  limit?: number;
  ttlSeconds?: number;
  forceRefresh?: boolean;
  condominioId?: string;
}

export interface CachedQueryResult<T = any> {
  data: T;
  cached: boolean;
  origem: 'client-memory' | 'redis' | 'supabase';
  latencyMs: number;
  total: number;
}

export interface CacheTelemetry {
  provider: 'redis-server' | 'in-memory-redis';
  connected: boolean;
  totalKeys: number;
  hitCount: number;
  missCount: number;
  hitRatio: string;
  totalRequests: number;
  avgLatencyMs: number;
  keysSummary: Record<string, number>;
  supabaseUrl: string;
}

// L1: Cache em Memória do Navegador (RAM do Cliente) para resposta instantânea (0ms)
interface ClientMemoryEntry {
  data: any;
  timestamp: number;
  ttlMs: number;
}
const clientMemoryCache = new Map<string, ClientMemoryEntry>();

// Evita requisições concorrentes duplicadas para a mesma consulta (Thundering Herd / Dogpiling)
const inflightQueries = new Map<string, Promise<any>>();

function resolverCondoIdEfetivo(options: CachedQueryOptions): string | undefined {
  if (isValidCondominioId(options.condominioId)) {
    return String(options.condominioId).trim();
  }
  const fCondo = (options.filters || []).find(
    (f) => f && f.field === 'condominio_id' && f.op === 'eq' && isValidCondominioId(String(f.value || ''))
  );
  if (fCondo) return String(fCondo.value).trim();
  return undefined;
}

function buildClientKey(options: CachedQueryOptions, condoResolved?: string): string {
  const normSelect = (options.select || '*').replace(/\s+/g, '');
  const normFilters = (options.filters || [])
    .map((f) => `${f.field}:${f.op}:${Array.isArray(f.value) ? f.value.join(',') : f.value}`)
    .sort()
    .join('|');
  const normOrder = options.orderBy
    ? `${options.orderBy.field}:${options.orderBy.ascending ? 'asc' : 'desc'}`
    : '';
  const normLimit = options.limit ? `limit:${options.limit}` : '';
  const condoPart = condoResolved ? `condo:${condoResolved}` : 'condo:catalog';
  return `l1:${options.table}:${condoPart}:${normSelect}:${normFilters}:${normOrder}:${normLimit}`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const token = await obterAccessTokenSupabase();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function limparCacheMemoriaCliente(): void {
  clientMemoryCache.clear();
  inflightQueries.clear();
}

/**
 * Consulta Otimizada com Camadas Multi-Tier de Cache e Isolamento Multi-Tenant Estrito:
 * Camada 1: Memória RAM do Navegador (0ms - instantâneo)
 * Camada 2: Servidor Redis Central (/api/cache/query - autenticado via Bearer JWT)
 * Camada 3: Supabase REST Fallback de contingência (com filtro obrigatório por condominio_id)
 */
export async function cachedQuery<T = any[]>(options: CachedQueryOptions): Promise<T> {
  const isTenantTable = isTabelaIsoladaPorCondominio(options.table);
  const condoResolved = resolverCondoIdEfetivo(options);

  if (isTenantTable) {
    // Rejeita filtros manipulados em condominio_id (ex: neq, ilike)
    const filtroInvalido = (options.filters || []).find(
      (f) =>
        f &&
        f.field === 'condominio_id' &&
        (f.op !== 'eq' || !isValidCondominioId(String(f.value || '')))
    );
    if (filtroInvalido || !condoResolved) {
      throw new Error(
        `[Isolamento Multi-Tenant] Consulta bloqueada na tabela "${options.table}": condominio_id válido é obrigatório.`
      );
    }
  }

  const normalizedFilters: QueryFilter[] = isTenantTable
    ? [
        ...(options.filters || []).filter((f) => f.field !== 'condominio_id'),
        { field: 'condominio_id', op: 'eq', value: condoResolved }
      ]
    : [...(options.filters || [])];

  const normalizedOptions: CachedQueryOptions = {
    ...options,
    condominioId: condoResolved,
    filters: normalizedFilters
  };

  const clientKey = buildClientKey(normalizedOptions, condoResolved);
  const ttlMs = (options.ttlSeconds || 180) * 1000;

  // 1. Verificação L1: RAM do Cliente (0ms)
  if (!options.forceRefresh) {
    const mem = clientMemoryCache.get(clientKey);
    if (mem && Date.now() - mem.timestamp < mem.ttlMs) {
      return mem.data as T;
    }
  }

  // 2. Proteção contra Thundering Herd
  const inflightKey = options.forceRefresh ? `${clientKey}:force` : clientKey;
  if (inflightQueries.has(inflightKey)) {
    return inflightQueries.get(inflightKey) as Promise<T>;
  }

  const queryPromise = (async () => {
    try {
      const headers = await buildAuthHeaders();
      if (headers['Authorization']) {
        // 3. Verificação L2: Servidor Redis (apenas quando possui JWT válido)
        const response = await fetch('/api/cache/query', {
          method: 'POST',
          headers,
          body: JSON.stringify(normalizedOptions)
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const result: CachedQueryResult<T> = await response.json();
            if (result && result.data !== undefined) {
              clientMemoryCache.set(clientKey, {
                data: result.data,
                timestamp: Date.now(),
                ttlMs
              });
              return result.data;
            }
          }
        } else if (response.status === 401 || response.status === 403) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson?.erro || 'Acesso negado ao cache multi-tenant.');
        }
      }
    } catch (apiErr: any) {
      if (String(apiErr?.message || '').includes('Acesso negado')) {
        throw apiErr;
      }
      console.warn(
        '[Cache Redis] Endpoint indisponível ou sem resposta JSON, executando fallback Supabase isolado:',
        apiErr
      );
    }

    // 4. Verificação L3: Supabase Direto (Fallback com filtro obrigatório garantido)
    try {
      let q = supabase.from(normalizedOptions.table).select(normalizedOptions.select || '*');
      for (const f of normalizedFilters) {
        if (!f.field || f.value === undefined) continue;
        if (f.op === 'eq') q = q.eq(f.field, f.value);
        else if (f.op === 'neq') q = q.neq(f.field, f.value);
        else if (f.op === 'in') q = q.in(f.field, Array.isArray(f.value) ? f.value : [f.value]);
        else if (f.op === 'gte') q = q.gte(f.field, f.value);
        else if (f.op === 'lte') q = q.lte(f.field, f.value);
        else if (f.op === 'ilike') q = q.ilike(f.field, `%${f.value}%`);
      }

      if (normalizedOptions.orderBy) {
        q = q.order(normalizedOptions.orderBy.field, {
          ascending: normalizedOptions.orderBy.ascending ?? true
        });
      }

      if (normalizedOptions.limit) {
        q = q.limit(normalizedOptions.limit);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = Array.isArray(data)
        ? isTenantTable && condoResolved
          ? data.filter((r: any) => !r?.condominio_id || r.condominio_id === condoResolved)
          : data
        : data || [];

      const dadosFinais = rows as T;
      clientMemoryCache.set(clientKey, {
        data: dadosFinais,
        timestamp: Date.now(),
        ttlMs
      });
      return dadosFinais;
    } catch (supErr: any) {
      console.error(`[Cache Fallback] Erro na consulta da tabela ${options.table}:`, supErr);
      throw supErr;
    }
  })();

  inflightQueries.set(inflightKey, queryPromise);

  try {
    return await queryPromise;
  } finally {
    inflightQueries.delete(inflightKey);
  }
}

/**
 * Invalida o cache de uma tabela específica tanto localmente quanto no Redis
 */
export async function invalidarCacheTabela(table: string, condominioId?: string): Promise<void> {
  for (const k of Array.from(clientMemoryCache.keys())) {
    if (
      k.startsWith(`l1:${table}:`) &&
      (!condominioId || k.includes(`:condo:${condominioId}:`) || k.includes(':condo:catalog:'))
    ) {
      clientMemoryCache.delete(k);
    }
  }

  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) return;
    await fetch('/api/cache/invalidate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ table, condominioId })
    });
  } catch (err) {
    console.warn('[Cache Invalidate] Aviso ao invalidar no Redis:', err);
  }
}

/**
 * Invalida todas as consultas de um condomínio específico
 */
export async function invalidarCacheCondominio(condominioId: string): Promise<void> {
  for (const k of Array.from(clientMemoryCache.keys())) {
    if (k.includes(`:condo:${condominioId}:`)) {
      clientMemoryCache.delete(k);
    }
  }
  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) return;
    await fetch('/api/cache/invalidate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ condominioId })
    });
  } catch {}
}

/**
 * Limpa todo o cache local (e no servidor Redis se o operador for Global Admin)
 */
export async function limparTodoCache(): Promise<void> {
  limparCacheMemoriaCliente();
  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) return;
    await fetch('/api/cache/clear', { method: 'POST', headers });
  } catch {}
}

/**
 * Pré-aquece as consultas mais pesadas no Redis para o condomínio especificado
 */
export async function aquecerCacheCondominio(condominioId?: string): Promise<any> {
  if (!isValidCondominioId(condominioId)) {
    return { sucesso: false, erro: 'condominioId válido obrigatório para pré-aquecimento.' };
  }
  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) {
      return { sucesso: false, erro: 'Sessão Supabase Auth ausente.' };
    }
    const res = await fetch('/api/cache/warmup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ condominioId })
    });
    return await res.json();
  } catch (e: any) {
    return { sucesso: false, erro: e.message };
  }
}

/**
 * Retorna as estatísticas do Redis e da performance de carregamento
 */
export async function obterEstatisticasCache(): Promise<CacheTelemetry | null> {
  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) return null;
    const res = await fetch('/api/cache/stats', { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

/**
 * Executa benchmark real comparando o tempo de resposta Supabase Direto vs Cache Redis
 */
export async function executarBenchmarkVelocidade(condominioId?: string): Promise<{
  latenciaSupabaseMs: number;
  latenciaRedisMs: number;
  ganhoDesempenho: string;
  reducaoLatenciaPercentual: string;
  itensRetornados: number;
} | null> {
  try {
    const headers = await buildAuthHeaders();
    if (!headers['Authorization']) return null;
    const qs = isValidCondominioId(condominioId)
      ? `?condominioId=${encodeURIComponent(String(condominioId))}`
      : '';
    const res = await fetch(`/api/cache/benchmark${qs}`, { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}
