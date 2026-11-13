/**
 * Módulo de Segurança Multi-Tenant Server-Side (Express + Redis Cache)
 *
 * Responsabilidades:
 * 1. Validar JWT do Supabase Auth no header `Authorization: Bearer <token>`.
 * 2. Resolver no banco de dados os vínculos reais do usuário (`operadores`,
 *    `operador_condominios`, `admin_globais`) sem confiar em flags do cliente.
 * 3. Bloquear consultas sem `condominioId`, cross-tenant ou com filtros conflitantes.
 * 4. Isolar chaves Redis com namespace explícito `porttohub:condo:<condominioId>:`.
 */

export const TENANT_TABLES_SERVER = new Set<string>([
  'encomendas_itens',
  'encomendas',
  'lotes_re',
  'entregadores',
  'locais_armazenamento',
  'moradores',
  'operadores',
  'configuracoes',
  'custodia',
  'chaves',
  'movimentacao_chaves',
  'rondas_pontos',
  'rondas_setores',
  'rondas_execucao',
  'rondas_registros',
  'prestadores',
  'prestadores_acessos',
  'ocorrencias',
  'chamados_manutencao',
  'checklist_manutencao',
  'passagens_posto',
  'materiais_posto',
  'historico_absoluto',
  'lembretes',
  'bancada_volumes',
  'bancada_conferencias',
  'areas_comuns',
  'reservas_areas_comuns',
  'pontos_acesso',
  'registros_acesso',
  'blacklist_bloqueios',
  'passes_virtuais_qr',
  'operador_condominios'
]);

export const GLOBAL_CATALOG_TABLES_SERVER = new Set<string>(['condominios']);

export interface AuthenticatedTenantCaller {
  authUserId: string;
  email?: string;
  operadorId?: string | null;
  isGlobalAdmin: boolean;
  authorizedCondoIds: string[];
  accessToken: string;
}

export interface TenantSecurityDeps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
  fetchImpl?: typeof fetch;
  verifyAccessToken?: (token: string) => Promise<AuthenticatedTenantCaller | null>;
}

export function isValidUuidOrTenantId(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'global' || lower === 'todos' || lower === 'null' || lower === 'undefined') {
    return false;
  }
  return /^[a-zA-Z0-9_-]{8,64}$/.test(trimmed);
}

export function isValidTableIdentifier(table: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table);
}

export function isTenantScopedTableServer(table: string): boolean {
  const clean = String(table || '').trim().toLowerCase();
  if (GLOBAL_CATALOG_TABLES_SERVER.has(clean)) return false;
  return TENANT_TABLES_SERVER.has(clean) || true;
}

export function buildIsolatedQueryCacheKey(
  table: string,
  select?: string,
  filters?: any[],
  orderBy?: any,
  limit?: number,
  condominioId?: string,
  scopeKey?: string
): string {
  const normSelect = (select || '*').replace(/\s+/g, '');
  const normFilters = (filters || [])
    .map((f) => `${f.field}:${f.op}:${Array.isArray(f.value) ? f.value.join(',') : f.value}`)
    .sort()
    .join('|');
  const normOrder = orderBy ? `${orderBy.field}:${orderBy.ascending ? 'asc' : 'desc'}` : '';
  const normLimit = limit ? `limit:${limit}` : '';
  const tenantPrefix = condominioId
    ? `condo:${condominioId}`
    : `global:${scopeKey || 'authenticated'}`;
  const rawKey = `${tenantPrefix}__${table}__${normSelect}__${normFilters}__${normOrder}__${normLimit}`;

  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    hash = (hash << 5) - hash + rawKey.charCodeAt(i);
    hash |= 0;
  }

  if (condominioId) {
    return `porttohub:condo:${condominioId}:query:${table}:${Math.abs(hash)}`;
  }
  return `porttohub:global:${scopeKey || 'catalog'}:query:${table}:${Math.abs(hash)}`;
}

/**
 * Resolve o usuário autenticado via Supabase Auth (`/auth/v1/user`) e consulta suas
 * permissões reais (`operadores`, `operador_condominios`, `admin_globais`).
 */
export async function resolveSupabaseCaller(
  accessToken: string,
  deps: TenantSecurityDeps
): Promise<AuthenticatedTenantCaller | null> {
  if (!accessToken) return null;
  if (deps.verifyAccessToken) {
    return deps.verifyAccessToken(accessToken);
  }

  const doFetch = deps.fetchImpl || fetch;
  const baseUrl = deps.supabaseUrl.replace(/\/+$/, '');
  const apiKey = deps.supabaseAnonKey;
  const serverReadKey = deps.supabaseServiceRoleKey || apiKey;
  const authHeaderForDb = deps.supabaseServiceRoleKey
    ? `Bearer ${deps.supabaseServiceRoleKey}`
    : `Bearer ${accessToken}`;

  // 1. Validar JWT com Supabase Auth
  const userResp = await doFetch(`${baseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!userResp.ok) {
    return null;
  }

  const authUser: any = await userResp.json();
  if (!authUser || !authUser.id) {
    return null;
  }

  const authUserId = String(authUser.id);
  const email = authUser.email ? String(authUser.email).toLowerCase() : undefined;

  // 2. Localizar operador vinculado por auth_user_id (ou email durante janela de transição)
  let operador: any = null;
  try {
    const opRes = await doFetch(
      `${baseUrl}/rest/v1/operadores?select=id,condominio_id,nivel_acesso,perfil,ativo,auth_user_id,email&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`,
      {
        headers: {
          apikey: serverReadKey,
          Authorization: authHeaderForDb
        }
      }
    );
    if (opRes.ok) {
      const rows = (await opRes.json()) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        operador = rows[0];
      }
    }
  } catch {}

  if (!operador && email) {
    try {
      const opEmailRes = await doFetch(
        `${baseUrl}/rest/v1/operadores?select=id,condominio_id,nivel_acesso,perfil,ativo,auth_user_id,email&email=eq.${encodeURIComponent(email)}&limit=1`,
        {
          headers: {
            apikey: serverReadKey,
            Authorization: authHeaderForDb
          }
        }
      );
      if (opEmailRes.ok) {
        const rows = (await opEmailRes.json()) as any[];
        if (Array.isArray(rows) && rows.length > 0) {
          operador = rows[0];
        }
      }
    } catch {}
  }

  if (operador && operador.ativo === false) {
    return null;
  }

  // 3. Verificar admin_globais explícito
  let isGlobalAdmin = false;
  try {
    const adminRes = await doFetch(
      `${baseUrl}/rest/v1/admin_globais?select=id,ativo&or=(auth_user_id.eq.${encodeURIComponent(authUserId)}${operador?.id ? `,operador_id.eq.${encodeURIComponent(operador.id)}` : ''})&ativo=eq.true&limit=1`,
      {
        headers: {
          apikey: serverReadKey,
          Authorization: authHeaderForDb
        }
      }
    );
    if (adminRes.ok) {
      const rows = (await adminRes.json()) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        isGlobalAdmin = true;
      }
    }
  } catch {}

  // Também aceita vínculo explícito na tabela operadores quando condominio_id IS NULL, nivel_acesso=0 e perfil='admin_geral'
  if (
    !isGlobalAdmin &&
    operador &&
    operador.ativo !== false &&
    Number(operador.nivel_acesso) === 0 &&
    operador.condominio_id === null &&
    String(operador.perfil || '').toLowerCase() === 'admin_geral'
  ) {
    isGlobalAdmin = true;
  }

  // 4. Coletar condomínios autorizados via operador_condominios + condominio_id do operador
  const authorizedSet = new Set<string>();
  if (operador?.condominio_id && isValidUuidOrTenantId(String(operador.condominio_id))) {
    authorizedSet.add(String(operador.condominio_id).trim());
  }

  if (operador?.id) {
    try {
      const vincRes = await doFetch(
        `${baseUrl}/rest/v1/operador_condominios?select=condominio_id,ativo&operador_id=eq.${encodeURIComponent(operador.id)}&ativo=eq.true`,
        {
          headers: {
            apikey: serverReadKey,
            Authorization: authHeaderForDb
          }
        }
      );
      if (vincRes.ok) {
        const vincs = (await vincRes.json()) as any[];
        if (Array.isArray(vincs)) {
          vincs.forEach((v: any) => {
            if (isValidUuidOrTenantId(v?.condominio_id)) {
              authorizedSet.add(String(v.condominio_id).trim());
            }
          });
        }
      }
    } catch {}
  }

  return {
    authUserId,
    email,
    operadorId: operador?.id || null,
    isGlobalAdmin,
    authorizedCondoIds: Array.from(authorizedSet),
    accessToken
  };
}

export interface ValidatedTenantQueryResult {
  ok: true;
  condominioId: string | undefined;
  sanitizedFilters: Array<{ field: string; op: string; value: any }>;
}

export interface RejectedTenantQueryResult {
  ok: false;
  status: number;
  erro: string;
}

/**
 * Valida e sanitiza uma requisição de consulta multi-tenant no servidor:
 * - Impede bypasses por filtros conflitantes (`condominio_id neq ...`, `in.(A,B)`).
 * - Exige `condominioId` válido para toda tabela de condomínio.
 * - Verifica autorização do usuário para o `condominioId` alvo.
 * - Reescreve os filtros de forma autoritativa pelo servidor.
 */
export function validateAndScopeTenantQuery(params: {
  caller: AuthenticatedTenantCaller;
  table: string;
  rawCondoId?: string | null;
  headerCondoId?: string | null;
  filters?: any[];
}): ValidatedTenantQueryResult | RejectedTenantQueryResult {
  const { caller, table, rawCondoId, headerCondoId } = params;
  const inputFilters = Array.isArray(params.filters) ? params.filters : [];

  if (!table || !isValidTableIdentifier(table)) {
    return { ok: false, status: 400, erro: 'Nome de tabela inválido.' };
  }

  const isTenantTable = isTenantScopedTableServer(table);

  // Coleta filtros explícitos sobre condominio_id enviados pelo cliente
  const condoFilters = inputFilters.filter(
    (f) => f && String(f.field || '').trim().toLowerCase() === 'condominio_id'
  );

  // Rejeita qualquer operador diferente de 'eq' sobre condominio_id (ex: neq, ilike, in, etc.)
  for (const cf of condoFilters) {
    const op = String(cf.op || 'eq').toLowerCase();
    if (op !== 'eq') {
      return {
        ok: false,
        status: 403,
        erro: 'Operação não permitida sobre o identificador de condomínio (tampering bloqueado).'
      };
    }
    if (!isValidUuidOrTenantId(String(cf.value || ''))) {
      return {
        ok: false,
        status: 400,
        erro: 'Filtro condominio_id inválido.'
      };
    }
  }

  const candidates = new Set<string>();
  if (rawCondoId && String(rawCondoId).trim()) {
    if (!isValidUuidOrTenantId(String(rawCondoId))) {
      return { ok: false, status: 400, erro: 'Parâmetro condominioId inválido.' };
    }
    candidates.add(String(rawCondoId).trim());
  }
  if (headerCondoId && String(headerCondoId).trim()) {
    if (!isValidUuidOrTenantId(String(headerCondoId))) {
      return { ok: false, status: 400, erro: 'Cabeçalho x-condominio-id inválido.' };
    }
    candidates.add(String(headerCondoId).trim());
  }
  for (const cf of condoFilters) {
    candidates.add(String(cf.value).trim());
  }

  if (candidates.size > 1) {
    return {
      ok: false,
      status: 403,
      erro: 'Conflito entre identificadores de condomínio na requisição.'
    };
  }

  const resolvedCondoId = candidates.size === 1 ? Array.from(candidates)[0] : undefined;

  if (isTenantTable) {
    if (!resolvedCondoId) {
      return {
        ok: false,
        status: 400,
        erro: `Isolamento Multi-Tenant Obrigatório: A tabela "${table}" exige condominioId válido.`
      };
    }

    if (!caller.isGlobalAdmin && !caller.authorizedCondoIds.includes(resolvedCondoId)) {
      return {
        ok: false,
        status: 403,
        erro: 'Acesso negado ao condomínio solicitado.'
      };
    }

    const otherFilters = inputFilters.filter(
      (f) => f && String(f.field || '').trim().toLowerCase() !== 'condominio_id'
    );

    return {
      ok: true,
      condominioId: resolvedCondoId,
      sanitizedFilters: [
        ...otherFilters,
        { field: 'condominio_id', op: 'eq', value: resolvedCondoId }
      ]
    };
  }

  // Tabela global de catálogo (`condominios`)
  if (!caller.isGlobalAdmin) {
    if (caller.authorizedCondoIds.length === 0) {
      return { ok: false, status: 403, erro: 'Operador sem condomínio autorizado.' };
    }
    const sanitized = inputFilters.filter(
      (f) => f && String(f.field || '').trim().toLowerCase() !== 'id'
    );
    if (resolvedCondoId) {
      if (!caller.authorizedCondoIds.includes(resolvedCondoId)) {
        return { ok: false, status: 403, erro: 'Acesso negado ao condomínio solicitado.' };
      }
      sanitized.push({ field: 'id', op: 'eq', value: resolvedCondoId });
    } else {
      sanitized.push({ field: 'id', op: 'in', value: caller.authorizedCondoIds });
    }
    return {
      ok: true,
      condominioId: resolvedCondoId,
      sanitizedFilters: sanitized
    };
  }

  return {
    ok: true,
    condominioId: resolvedCondoId,
    sanitizedFilters: inputFilters
  };
}
