import express from 'express';
import {
  AuthenticatedTenantCaller,
  TenantSecurityDeps,
  buildIsolatedQueryCacheKey,
  isTenantScopedTableServer,
  isValidUuidOrTenantId,
  resolveSupabaseCaller,
  validateAndScopeTenantQuery
} from './tenantSecurity.ts';

export interface RedisCacheLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number, tags?: string[]): Promise<string>;
  invalidateByPattern(pattern: string): Promise<number>;
  invalidateByTag(tag: string): Promise<number>;
  flush(): Promise<string>;
  getStats(): Promise<any>;
}

export function createCacheRouter(deps: {
  cache: RedisCacheLike;
  security: TenantSecurityDeps;
}) {
  const router = express.Router();
  const doFetch = deps.security.fetchImpl || fetch;

  async function requireAuthenticatedCaller(
    req: express.Request,
    res: express.Response
  ): Promise<AuthenticatedTenantCaller | null> {
    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      res.status(401).json({ erro: 'Autenticação obrigatória (Bearer token ausente).' });
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token || token === deps.security.supabaseAnonKey) {
      res.status(401).json({ erro: 'Token de sessão do usuário ausente ou inválido.' });
      return null;
    }

    const caller = await resolveSupabaseCaller(token, deps.security);
    if (!caller) {
      res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
      return null;
    }
    return caller;
  }

  function buildSupabaseRestHeaders(caller: AuthenticatedTenantCaller): Record<string, string> {
    const key = deps.security.supabaseServiceRoleKey || deps.security.supabaseAnonKey;
    const bearer = deps.security.supabaseServiceRoleKey || caller.accessToken;
    return {
      apikey: key,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * POST /api/cache/query
   * Consulta isolada por condomínio com verificação JWT e reescrita autoritativa de filtros.
   */
  router.post('/query', async (req, res) => {
    const start = Date.now();
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      const {
        table,
        select = '*',
        filters = [],
        orderBy,
        limit,
        ttlSeconds = 180,
        forceRefresh = false,
        condominioId: rawCondoId
      } = req.body || {};

      const headerCondo = req.headers['x-condominio-id'] as string | undefined;
      const validation = validateAndScopeTenantQuery({
        caller,
        table,
        rawCondoId,
        headerCondoId: headerCondo,
        filters
      });

      if (!validation.ok) {
        return res.status(validation.status).json({
          erro: validation.erro,
          data: []
        });
      }

      const condominioId = validation.condominioId;
      const sanitizedFilters = validation.sanitizedFilters;
      const scopeKey = condominioId
        ? undefined
        : caller.isGlobalAdmin
        ? 'global_admin'
        : `user_${caller.authUserId}`;

      const cacheKey = buildIsolatedQueryCacheKey(
        table,
        select,
        sanitizedFilters,
        orderBy,
        limit,
        condominioId,
        scopeKey
      );

      const tags: string[] = [];
      if (condominioId) {
        tags.push(`condo:${condominioId}:table:${table}`);
        tags.push(`condominio:${condominioId}`);
      } else {
        tags.push(`catalog:table:${table}`);
      }

      if (!forceRefresh) {
        const cached = await deps.cache.get(cacheKey);
        if (cached) {
          try {
            const parsedData = JSON.parse(cached);
            const latencyMs = Date.now() - start;
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('X-Response-Time', `${latencyMs}ms`);
            return res.json({
              sucesso: true,
              cached: true,
              origem: 'redis',
              latencyMs,
              total: Array.isArray(parsedData) ? parsedData.length : 1,
              data: parsedData
            });
          } catch {
            // JSON corrompido: refaz consulta
          }
        }
      }

      const baseUrl = deps.security.supabaseUrl.replace(/\/+$/, '');
      const queryParams = new URLSearchParams();
      queryParams.set('select', select);

      for (const f of sanitizedFilters) {
        if (!f.field || f.value === undefined) continue;
        const op = f.op || 'eq';
        if (op === 'eq') queryParams.append(f.field, `eq.${f.value}`);
        else if (op === 'neq') queryParams.append(f.field, `neq.${f.value}`);
        else if (op === 'in') {
          queryParams.append(
            f.field,
            `in.(${Array.isArray(f.value) ? f.value.join(',') : f.value})`
          );
        } else if (op === 'gte') queryParams.append(f.field, `gte.${f.value}`);
        else if (op === 'lte') queryParams.append(f.field, `lte.${f.value}`);
        else if (op === 'ilike') queryParams.append(f.field, `ilike.%${f.value}%`);
      }

      if (orderBy && orderBy.field) {
        queryParams.set('order', `${orderBy.field}.${orderBy.ascending ? 'asc' : 'desc'}`);
      }

      if (limit && Number(limit) > 0) {
        queryParams.set('limit', String(limit));
      }

      const restUrl = `${baseUrl}/rest/v1/${table}?${queryParams.toString()}`;
      const supabaseRes = await doFetch(restUrl, {
        method: 'GET',
        headers: buildSupabaseRestHeaders(caller)
      });

      if (!supabaseRes.ok) {
        const errText = await supabaseRes.text();
        return res.status(supabaseRes.status).json({ erro: `Erro no Supabase: ${errText}` });
      }

      const data = await supabaseRes.json();

      // Defesa em profundidade: filtra novamente qualquer registro fora do tenant antes de cachear/retornar
      const safeData =
        Array.isArray(data) && isTenantScopedTableServer(table) && condominioId
          ? data.filter((row: any) => !row?.condominio_id || row.condominio_id === condominioId)
          : data;

      const ttlFinal = Number(ttlSeconds) > 0 ? Number(ttlSeconds) : 180;
      await deps.cache.set(cacheKey, JSON.stringify(safeData), ttlFinal, tags);

      const latencyMs = Date.now() - start;
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Response-Time', `${latencyMs}ms`);
      return res.json({
        sucesso: true,
        cached: false,
        origem: 'supabase',
        latencyMs,
        total: Array.isArray(safeData) ? safeData.length : 1,
        data: safeData
      });
    } catch (err: any) {
      console.error('[API Cache Query] Erro:', err);
      return res
        .status(500)
        .json({ erro: err.message || 'Falha ao executar consulta com cache Redis' });
    }
  });

  /**
   * POST /api/cache/invalidate
   * Invalidação estritamente isolada por condomínio autorizado.
   */
  router.post('/invalidate', async (req, res) => {
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      const { table, condominioId } = req.body || {};
      const cleanCondoId = condominioId ? String(condominioId).trim() : '';

      if (!cleanCondoId || !isValidUuidOrTenantId(cleanCondoId)) {
        if (!caller.isGlobalAdmin) {
          return res.status(400).json({
            erro: 'condominioId válido é obrigatório para invalidar cache.'
          });
        }
      } else if (!caller.isGlobalAdmin && !caller.authorizedCondoIds.includes(cleanCondoId)) {
        return res.status(403).json({ erro: 'Sem autorização para invalidar cache deste condomínio.' });
      }

      let removidos = 0;
      if (cleanCondoId && isValidUuidOrTenantId(cleanCondoId)) {
        if (table) {
          removidos += await deps.cache.invalidateByTag(`condo:${cleanCondoId}:table:${table}`);
          removidos += await deps.cache.invalidateByPattern(
            `porttohub:condo:${cleanCondoId}:query:${table}:*`
          );
        } else {
          removidos += await deps.cache.invalidateByTag(`condominio:${cleanCondoId}`);
          removidos += await deps.cache.invalidateByPattern(`porttohub:condo:${cleanCondoId}:*`);
        }
      } else if (caller.isGlobalAdmin) {
        if (table === 'condominios') {
          removidos += await deps.cache.invalidateByTag('catalog:table:condominios');
          removidos += await deps.cache.invalidateByPattern('porttohub:global:*:query:condominios:*');
        } else if (table) {
          removidos += await deps.cache.invalidateByPattern(`porttohub:*:query:${table}:*`);
        }
      }

      return res.json({
        sucesso: true,
        removidos,
        mensagem: `${removidos} entrada(s) de cache invalidada(s) no Redis.`
      });
    } catch (err: any) {
      return res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/cache/stats
   * Restrito a operadores autenticados (resumo de chaves globais visível apenas para Admin Global).
   */
  router.get('/stats', async (req, res) => {
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      const stats = await deps.cache.getStats();
      return res.json({
        sucesso: true,
        provider: stats.provider,
        connected: stats.connected,
        totalKeys: caller.isGlobalAdmin ? stats.totalKeys : undefined,
        hitCount: stats.hitCount,
        missCount: stats.missCount,
        hitRatio: stats.hitRatio,
        totalRequests: stats.totalRequests,
        avgLatencyMs: stats.avgLatencyMs,
        lastConnectedAt: stats.lastConnectedAt,
        keysSummary: caller.isGlobalAdmin ? stats.keysSummary : undefined,
        horarioServidor: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      });
    } catch (err: any) {
      return res.status(500).json({ erro: err.message });
    }
  });

  /**
   * POST /api/cache/clear
   * Exclusivo para Super Administrador Global autenticado.
   */
  router.post('/clear', async (req, res) => {
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      if (!caller.isGlobalAdmin) {
        return res.status(403).json({
          erro: 'Apenas Super Administrador Global verificado pode limpar todo o cache Redis.'
        });
      }

      await deps.cache.flush();
      return res.json({ sucesso: true, mensagem: 'Cache Redis limpo com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({ erro: err.message });
    }
  });

  /**
   * POST /api/cache/warmup
   * Pré-aquecimento estritamente isolado ao condomínio autorizado.
   */
  router.post('/warmup', async (req, res) => {
    const start = Date.now();
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      const { condominioId } = req.body || {};
      const cleanCondoId = condominioId ? String(condominioId).trim() : '';

      if (!cleanCondoId || !isValidUuidOrTenantId(cleanCondoId)) {
        return res.status(400).json({ erro: 'condominioId válido obrigatório para pré-aquecimento.' });
      }

      if (!caller.isGlobalAdmin && !caller.authorizedCondoIds.includes(cleanCondoId)) {
        return res.status(403).json({ erro: 'Acesso negado ao condomínio solicitado.' });
      }

      const baseUrl = deps.security.supabaseUrl.replace(/\/+$/, '');
      const headers = buildSupabaseRestHeaders(caller);

      const tabelasParaAquecer: { table: string; ttl: number; select: string }[] = [
        { table: 'chaves', ttl: 180, select: '*' },
        {
          table: 'moradores',
          ttl: 300,
          select: 'id,condominio_id,nome,bloco,unidade,telefone,status_acesso,tag_rfid,veiculo_placa,veiculo_modelo'
        },
        { table: 'entregadores', ttl: 300, select: '*' },
        { table: 'bancada_volumes', ttl: 60, select: '*' }
      ];

      const resultados: any[] = [];
      for (const item of tabelasParaAquecer) {
        try {
          const restUrl = `${baseUrl}/rest/v1/${item.table}?select=${encodeURIComponent(item.select)}&condominio_id=eq.${encodeURIComponent(cleanCondoId)}`;
          const resp = await doFetch(restUrl, { headers });
          if (resp.ok) {
            const dados = await resp.json();
            const filters = [{ field: 'condominio_id', op: 'eq', value: cleanCondoId }];
            const key = buildIsolatedQueryCacheKey(
              item.table,
              item.select,
              filters,
              undefined,
              undefined,
              cleanCondoId
            );
            await deps.cache.set(key, JSON.stringify(dados), item.ttl, [
              `condo:${cleanCondoId}:table:${item.table}`,
              `condominio:${cleanCondoId}`
            ]);
            resultados.push({
              table: item.table,
              registros: Array.isArray(dados) ? dados.length : 0,
              status: 'ok'
            });
          } else {
            resultados.push({ table: item.table, status: 'erro', erro: `HTTP ${resp.status}` });
          }
        } catch (itemErr: any) {
          resultados.push({ table: item.table, status: 'erro', erro: itemErr.message });
        }
      }

      return res.json({
        sucesso: true,
        tempoTotalMs: Date.now() - start,
        tabelasAquecidas: resultados
      });
    } catch (err: any) {
      return res.status(500).json({ erro: err.message });
    }
  });

  /**
   * GET /api/cache/benchmark
   * Exclusivo para usuários autenticados; nunca expõe dados brutos de outros tenants.
   */
  router.get('/benchmark', async (req, res) => {
    try {
      const caller = await requireAuthenticatedCaller(req, res);
      if (!caller) return;

      const baseUrl = deps.security.supabaseUrl.replace(/\/+$/, '');
      const headers = buildSupabaseRestHeaders(caller);
      const condoAlvo =
        (req.query.condominioId ? String(req.query.condominioId).trim() : '') ||
        caller.authorizedCondoIds[0] ||
        '';

      let urlBenchmark = `${baseUrl}/rest/v1/condominios?select=id,nome`;
      if (!caller.isGlobalAdmin) {
        if (condoAlvo && caller.authorizedCondoIds.includes(condoAlvo)) {
          urlBenchmark += `&id=eq.${encodeURIComponent(condoAlvo)}`;
        } else if (caller.authorizedCondoIds.length > 0) {
          urlBenchmark += `&id=in.(${caller.authorizedCondoIds.map(encodeURIComponent).join(',')})`;
        } else {
          return res.status(403).json({ erro: 'Sem condomínio autorizado.' });
        }
      }

      const t0 = Date.now();
      const supRes = await doFetch(urlBenchmark, { headers });
      const supData = await supRes.json();
      const latenciaSupabaseMs = Date.now() - t0;

      const testKey = `porttohub:benchmark:${caller.authUserId}`;
      await deps.cache.set(testKey, JSON.stringify({ count: Array.isArray(supData) ? supData.length : 0 }), 30);

      const t1 = Date.now();
      await deps.cache.get(testKey);
      const latenciaRedisMs = Date.now() - t1;

      const ganhoDesempenho =
        latenciaRedisMs > 0
          ? `${(latenciaSupabaseMs / latenciaRedisMs).toFixed(1)}x mais rápido`
          : '99% mais rápido (< 1ms)';

      return res.json({
        sucesso: true,
        latenciaSupabaseMs,
        latenciaRedisMs: Math.max(latenciaRedisMs, 0.5),
        ganhoDesempenho,
        reducaoLatenciaPercentual: `${(
          ((latenciaSupabaseMs - latenciaRedisMs) / Math.max(latenciaSupabaseMs, 1)) *
          100
        ).toFixed(1)}%`,
        itensRetornados: Array.isArray(supData) ? supData.length : 0
      });
    } catch (err: any) {
      return res.status(500).json({ erro: err.message });
    }
  });

  return router;
}
