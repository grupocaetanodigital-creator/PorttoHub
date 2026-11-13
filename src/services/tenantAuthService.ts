import { supabase } from './supabase';

/**
 * Serviço Central de Autenticação, Autorização e Isolamento Multi-Tenant (PorttoHub)
 *
 * Responsabilidades:
 * 1. Definir explicitamente tabelas isoladas por condominio_id vs catálogo de condomínios.
 * 2. Validar sessão real Supabase Auth e vínculo operador <-> condomínios / admin_globais.
 * 3. Eliminar qualquer bypass hardcoded (ex: 'admin'/'2468', 'admin_master_root', login === 'jaq').
 * 4. Padronizar troca de condomínio, disparo do evento infport:condominio_alterado e limpeza segura de caches.
 */

export const TENANT_SCOPED_TABLES = new Set<string>([
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

export const STORAGE_ACTIVE_CONDO_KEY = 'infport_condominio_ativo_id';
export const STORAGE_SESSION_KEY = 'infport_sessao_ativa_v1';

export function isTabelaIsoladaPorCondominio(table: string): boolean {
  const t = String(table || '').trim().toLowerCase();
  if (!t) return true;
  if (t === 'condominios' || t === 'admin_globais') return false;
  return TENANT_SCOPED_TABLES.has(t) || true;
}

export function isValidCondominioId(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower === 'global' || lower === 'todos' || lower === 'null' || lower === 'undefined') {
    return false;
  }
  return true;
}

export function isStrictUUID(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

/**
 * Verifica se o usuário possui privilégio explícito e auditado de Super Administrador Global.
 * NUNCA infere privilégio global por login ('admin', 'jaq'), senha fixa ou ID sintético.
 */
export function isVerifiedGlobalAdmin(usuario: any): boolean {
  if (!usuario || typeof usuario !== 'object') return false;
  if (usuario.id === 'admin_master_root') return false;
  if (usuario.e_super_admin_global === true && usuario.global_admin_verificado === true) {
    return true;
  }
  if (
    usuario.admin_global_registro?.ativo === true &&
    usuario.condominio_id === null &&
    Number(usuario.nivel_acesso) === 0
  ) {
    return true;
  }
  return false;
}

/**
 * Lista todos os IDs de condomínios aos quais o operador tem acesso explícito.
 */
export function obterCondominiosAutorizadosIds(usuario: any): string[] {
  if (!usuario || typeof usuario !== 'object') return [];
  const ids = new Set<string>();

  if (Array.isArray(usuario.condominios_autorizados)) {
    for (const id of usuario.condominios_autorizados) {
      if (isValidCondominioId(String(id || ''))) {
        ids.add(String(id).trim());
      }
    }
  }

  if (Array.isArray(usuario.listaCondominios)) {
    for (const item of usuario.listaCondominios) {
      const cid = typeof item === 'string' ? item : item?.id;
      if (isValidCondominioId(cid)) {
        ids.add(String(cid).trim());
      }
    }
  }

  if (isValidCondominioId(usuario.condominio_id)) {
    ids.add(String(usuario.condominio_id).trim());
  }

  if (isValidCondominioId(usuario.condominio?.id)) {
    ids.add(String(usuario.condominio.id).trim());
  }

  return Array.from(ids);
}

/**
 * Verifica se o usuário tem autorização explícita para operar sobre um condomínio específico.
 */
export function canAccessCondominio(usuario: any, condominioId?: string | null): boolean {
  if (!isValidCondominioId(condominioId)) return false;
  const target = String(condominioId).trim();

  if (isVerifiedGlobalAdmin(usuario)) return true;

  const autorizados = obterCondominiosAutorizadosIds(usuario);
  return autorizados.includes(target);
}

/**
 * Verifica se o usuário tem permissão para alternar entre múltiplos condomínios na barra superior.
 */
export function canSwitchCondominio(usuario: any): boolean {
  if (!usuario) return false;
  if (isVerifiedGlobalAdmin(usuario)) return true;
  return obterCondominiosAutorizadosIds(usuario).length > 1;
}

/**
 * Extrai o ID de condomínio de um evento customizado `infport:condominio_alterado`,
 * suportando ambos os contratos legados/padronizados (`novoCondominioId` e `id`).
 */
export function extrairCondominioIdDeEvento(event: any): string {
  const detail = event?.detail;
  if (!detail) return '';
  const candidate = detail.novoCondominioId || detail.id || detail.condominio?.id || '';
  return isValidCondominioId(String(candidate)) ? String(candidate).trim() : '';
}

/**
 * Dispara a troca oficial de condomínio validando autorização e padronizando o payload do evento.
 */
export function dispatchCondominioAlterado(
  novoId: string,
  condominioObj?: any,
  usuario?: any
): boolean {
  if (!isValidCondominioId(novoId)) return false;
  if (usuario && !canAccessCondominio(usuario, novoId)) {
    console.warn(`[TenantAuth] Troca bloqueada: operador sem vínculo com o condomínio ${novoId}.`);
    return false;
  }

  const limpo = novoId.trim();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_ACTIVE_CONDO_KEY, limpo);
    } catch {}
    (window as any).idCondominioAtivo = limpo;
    window.dispatchEvent(
      new CustomEvent('infport:condominio_alterado', {
        detail: {
          id: limpo,
          novoCondominioId: limpo,
          condominio: condominioObj || null
        }
      })
    );
  }
  return true;
}

/**
 * Limpa todos os caches operacionais transientes ao fazer logout, trocar de usuário ou trocar de condomínio.
 * IMPORTANTE: preserva as filas offline particionadas por usuário/condomínio para nunca perder trabalho pendente.
 */
export function limparCachesOperacionaisTrocaSessao(opcoes?: {
  preservarSessao?: boolean;
  preservarCondoAtivo?: boolean;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // NUNCA apaga filas offline particionadas durante limpeza de cache de leitura
      if (key.startsWith('infport_fila_acoes_offline_v2_')) continue;
      if (key === 'infport_fila_quarantine_v1') continue;

      if (
        key.startsWith('infport_cache_') ||
        key.startsWith('infport_delta_sync_') ||
        key.startsWith('porttohub_operador_permissoes_') ||
        key.startsWith('infport_locais_') ||
        key === 'infport_historico_absoluto_cache_v1' ||
        key === 'infport_niveis_acesso_v1' ||
        key === 'infport_global_cache_disabled'
      ) {
        keysToRemove.push(key);
      }

      if (!opcoes?.preservarSessao && key === STORAGE_SESSION_KEY) {
        keysToRemove.push(key);
      }

      if (!opcoes?.preservarCondoAtivo && key === STORAGE_ACTIVE_CONDO_KEY) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    if (!opcoes?.preservarCondoAtivo) {
      delete (window as any).idCondominioAtivo;
    }
  } catch (err) {
    console.warn('[TenantAuth] Aviso ao limpar caches operacionais:', err);
  }

  try {
    window.dispatchEvent(new CustomEvent('infport:cache_purgado'));
  } catch {}
}

/**
 * Obtém o JWT Access Token ativo do Supabase Auth no cliente.
 */
export async function obterAccessTokenSupabase(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) return null;
    return data.session.access_token;
  } catch {
    return null;
  }
}

export interface ContextoOperadorAutenticado {
  operador: any;
  condominiosAutorizados: any[];
  eSuperAdminGlobal: boolean;
  viaSupabaseAuth: boolean;
}

/**
 * Carrega os vínculos explícitos do operador (`operador_condominios`, `admin_globais`, `condominios`)
 * após autenticação verificada.
 */
export async function resolverContextoOperador(
  operadorRaw: any,
  viaSupabaseAuth: boolean
): Promise<ContextoOperadorAutenticado> {
  if (!operadorRaw || !operadorRaw.id) {
    throw new Error('Registro de operador inválido.');
  }

  const isLegacyHardcoded = operadorRaw.id === 'admin_master_root';
  if (isLegacyHardcoded) {
    throw new Error('Sessão sintética legada bloqueada por política de segurança.');
  }

  // 1. Verificar tabela explícita admin_globais (se existir no banco)
  let adminGlobalRow: any = null;
  try {
    const { data: gRow, error: gErr } = await supabase
      .from('admin_globais')
      .select('id, operador_id, auth_user_id, ativo')
      .eq('operador_id', operadorRaw.id)
      .eq('ativo', true)
      .maybeSingle();

    if (!gErr && gRow) {
      adminGlobalRow = gRow;
    }
  } catch {}

  // Também aceita apenas se o operador vier autenticado via Supabase Auth, estiver ativo,
  // tiver nivel_acesso === 0 E condominio_id === null (papel global explícito em operadores)
  const eGlobalPorOperador =
    viaSupabaseAuth &&
    operadorRaw.ativo !== false &&
    Number(operadorRaw.nivel_acesso) === 0 &&
    (operadorRaw.condominio_id === null || operadorRaw.condominio_id === undefined) &&
    (operadorRaw.e_super_admin_global === true || String(operadorRaw.perfil || '').toLowerCase() === 'admin_geral');

  const eSuperAdminGlobal = Boolean(adminGlobalRow?.ativo === true || eGlobalPorOperador);

  // 2. Buscar vínculos explícitos em operador_condominios (se tabela existir)
  const idsAutorizados = new Set<string>();
  if (isValidCondominioId(operadorRaw.condominio_id)) {
    idsAutorizados.add(String(operadorRaw.condominio_id).trim());
  }

  try {
    const { data: vinculos, error: vErr } = await supabase
      .from('operador_condominios')
      .select('condominio_id, ativo')
      .eq('operador_id', operadorRaw.id)
      .eq('ativo', true);

    if (!vErr && Array.isArray(vinculos)) {
      vinculos.forEach((v: any) => {
        if (isValidCondominioId(v.condominio_id)) {
          idsAutorizados.add(String(v.condominio_id).trim());
        }
      });
    }
  } catch {}

  // 3. Carregar somente os condomínios autorizados
  let condominiosAutorizados: any[] = [];
  if (eSuperAdminGlobal) {
    const { data: todosCondos } = await supabase
      .from('condominios')
      .select('*')
      .order('nome', { ascending: true });
    condominiosAutorizados = (todosCondos || []).filter((c: any) => isValidCondominioId(c?.id));
  } else {
    const listaIds = Array.from(idsAutorizados);
    if (listaIds.length > 0) {
      const { data: meusCondos } = await supabase
        .from('condominios')
        .select('*')
        .in('id', listaIds)
        .order('nome', { ascending: true });
      condominiosAutorizados = (meusCondos || []).filter((c: any) => isValidCondominioId(c?.id));
    }
  }

  const autorizadosIdsFinais = eSuperAdminGlobal
    ? condominiosAutorizados.map((c: any) => c.id)
    : Array.from(
        new Set([
          ...Array.from(idsAutorizados),
          ...condominiosAutorizados.map((c: any) => c.id)
        ])
      );

  const condoPrincipal =
    condominiosAutorizados.find((c: any) => c.id === operadorRaw.condominio_id) ||
    condominiosAutorizados[0] ||
    null;

  const operadorSeguro = {
    ...operadorRaw,
    senha: '', // Nunca manter senha em memória/localStorage
    condominio: condoPrincipal,
    condominio_id: eSuperAdminGlobal ? null : (operadorRaw.condominio_id || condoPrincipal?.id || null),
    listaCondominios: condominiosAutorizados,
    condominios_autorizados: autorizadosIdsFinais,
    e_super_admin_global: eSuperAdminGlobal,
    global_admin_verificado: eSuperAdminGlobal,
    admin_global_registro: adminGlobalRow,
    via_supabase_auth: viaSupabaseAuth
  };

  return {
    operador: operadorSeguro,
    condominiosAutorizados,
    eSuperAdminGlobal,
    viaSupabaseAuth
  };
}
