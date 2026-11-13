/**
 * INFPORT 1.0 — Motor de Trabalho Offline e Sincronização Automática
 *
 * Garante que a portaria e guarita funcionem sem interrupções por 3+ horas
 * mesmo em quedas totais de internet, com particionamento estrito por operador
 * e condomínio, trava mutex contra drenagem concorrente e quarentena segura.
 */

import { supabase } from './supabase';
import { getCondominioAtivoId, isUUID } from './condominioService';
import { isTabelaIsoladaPorCondominio, isValidCondominioId } from './tenantAuthService';

export interface AcaoOffline {
  id: string;
  tabela: string;
  tipo: 'INSERT' | 'UPDATE' | 'DELETE';
  dados: any;
  condominio_id?: string;
  operador_id?: string;
  auth_user_id?: string;
  criadoEm: string;
  tentativas: number;
  descricaoAmigavel: string;
  motivoQuarentena?: string;
}

export interface ContextoOfflineSync {
  condominioId?: string;
  operadorId?: string;
  authUserId?: string;
}

const CHAVE_FILA_LEGADA = 'infport_fila_acoes_offline_v1';
const PREFIXO_FILA_PARTICIONADA = 'infport_fila_acoes_offline_v2';
export const CHAVE_FILA_QUARANTINE = 'infport_fila_quarantine_v1';
const CHAVE_STATUS_CACHE = 'infport_cache_autonomia_3h_v1';

let syncEmExecucao: Promise<{ sucessos: number; falhas: number; restantes: number }> | null = null;

function obterSessaoOperadorLocal(): { operadorId: string; authUserId: string; condominioId: string } {
  let operadorId = '';
  let authUserId = '';
  let condominioId = getCondominioAtivoId();

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem('infport_sessao_operador_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) operadorId = String(parsed.id);
        if (parsed?.auth_user_id) authUserId = String(parsed.auth_user_id);
        if (!isValidCondominioId(condominioId) && isValidCondominioId(parsed?.condominio_id)) {
          condominioId = String(parsed.condominio_id);
        }
      }
    } catch {}
  }

  return { operadorId, authUserId, condominioId };
}

export function obterChaveFilaOffline(operadorId?: string, condominioId?: string): string {
  const sessao = obterSessaoOperadorLocal();
  const op = (operadorId || sessao.operadorId || 'anon').trim() || 'anon';
  const condo = (condominioId || sessao.condominioId || 'sem_condo').trim() || 'sem_condo';
  return `${PREFIXO_FILA_PARTICIONADA}_${op}_${condo}`;
}

function resolverContextoEfetivo(contexto?: ContextoOfflineSync): {
  operadorId: string;
  authUserId: string;
  condominioId: string;
} {
  const sessao = obterSessaoOperadorLocal();
  return {
    operadorId: contexto?.operadorId || sessao.operadorId,
    authUserId: contexto?.authUserId || sessao.authUserId,
    condominioId: contexto?.condominioId || sessao.condominioId
  };
}

export function obterFilaQuarentena(): AcaoOffline[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(CHAVE_FILA_QUARANTINE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

function enviarParaQuarentena(acao: AcaoOffline, motivo: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const atual = obterFilaQuarentena();
    if (!atual.some((it) => it.id === acao.id)) {
      atual.push({ ...acao, motivoQuarentena: motivo });
      localStorage.setItem(CHAVE_FILA_QUARANTINE, JSON.stringify(atual));
    }
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao mover ação para quarentena:', err);
  }
}

/**
 * Registra uma ação executada em modo offline ou após falha de rede
 */
export function enfileirarAcaoOffline(
  tabela: string,
  tipo: 'INSERT' | 'UPDATE' | 'DELETE',
  dados: any,
  descricaoAmigavel: string = 'Operação da Portaria',
  contexto?: ContextoOfflineSync
): AcaoOffline {
  const ctx = resolverContextoEfetivo(contexto);
  const condoAcao = String(dados?.condominio_id || ctx.condominioId || '').trim();
  const dadosNormalizados =
    dados && typeof dados === 'object' && !Array.isArray(dados) && isValidCondominioId(condoAcao) && !dados.condominio_id && isTabelaIsoladaPorCondominio(tabela)
      ? { ...dados, condominio_id: condoAcao }
      : dados;

  const acao: AcaoOffline = {
    id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    tabela,
    tipo,
    dados: dadosNormalizados,
    condominio_id: condoAcao || undefined,
    operador_id: ctx.operadorId || undefined,
    auth_user_id: ctx.authUserId || undefined,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
    descricaoAmigavel
  };

  try {
    const chaveFila = obterChaveFilaOffline(ctx.operadorId, condoAcao || ctx.condominioId);
    const filaAtual = obterFilaOffline({ operadorId: ctx.operadorId, condominioId: condoAcao || ctx.condominioId });
    filaAtual.push(acao);
    localStorage.setItem(chaveFila, JSON.stringify(filaAtual));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: filaAtual.length, novaAcao: acao } }));
    }
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao persistir ação offline:', err);
  }

  return acao;
}

/**
 * Retorna todas as ações pendentes na fila offline particionada do contexto ativo
 */
export function obterFilaOffline(contexto?: ContextoOfflineSync): AcaoOffline[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const ctx = resolverContextoEfetivo(contexto);
  const chaveFila = obterChaveFilaOffline(ctx.operadorId, ctx.condominioId);

  try {
    const raw = localStorage.getItem(chaveFila);
    const lista = raw ? JSON.parse(raw) : [];
    const resultado: AcaoOffline[] = Array.isArray(lista) ? [...lista] : [];

    // Migração segura de fila legada (v1): só incorpora se corresponder ao condomínio ativo; demais vão para quarentena
    const rawLegada = localStorage.getItem(CHAVE_FILA_LEGADA);
    if (rawLegada) {
      try {
        const legada = JSON.parse(rawLegada);
        if (Array.isArray(legada) && legada.length > 0) {
          for (const item of legada) {
            const condoItem = item?.condominio_id || item?.dados?.condominio_id || '';
            if (isValidCondominioId(ctx.condominioId) && condoItem === ctx.condominioId) {
              resultado.push({
                ...item,
                condominio_id: condoItem,
                operador_id: item?.operador_id || ctx.operadorId || undefined
              });
            } else {
              enviarParaQuarentena(item, 'Ação legada sem correspondência com o condomínio ativo');
            }
          }
          localStorage.setItem(chaveFila, JSON.stringify(resultado));
        }
        localStorage.removeItem(CHAVE_FILA_LEGADA);
      } catch {}
    }

    return resultado;
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao ler fila offline:', err);
  }
  return [];
}

/**
 * Remove uma ação da fila offline por ID
 */
export function removerAcaoFila(id: string, contexto?: ContextoOfflineSync): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const ctx = resolverContextoEfetivo(contexto);
  const chaveFila = obterChaveFilaOffline(ctx.operadorId, ctx.condominioId);
  try {
    const filaAtual = obterFilaOffline(ctx).filter(a => a.id !== id);
    localStorage.setItem(chaveFila, JSON.stringify(filaAtual));
    window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: filaAtual.length } }));
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao remover ação da fila:', err);
  }
}

/**
 * Limpa toda a fila offline do contexto ativo
 */
export function limparFilaOffline(contexto?: ContextoOfflineSync): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const ctx = resolverContextoEfetivo(contexto);
  const chaveFila = obterChaveFilaOffline(ctx.operadorId, ctx.condominioId);
  localStorage.removeItem(chaveFila);
  window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: 0 } }));
}

/**
 * Sincroniza todas as ações pendentes da fila offline com o Supabase (protegido por mutex)
 */
export async function sincronizarFilaComSupabase(contexto?: ContextoOfflineSync): Promise<{
  sucessos: number;
  falhas: number;
  restantes: number;
}> {
  if (syncEmExecucao) {
    return syncEmExecucao;
  }

  syncEmExecucao = (async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { sucessos: 0, falhas: 0, restantes: obterFilaOffline(contexto).length };
    }

    const ctx = resolverContextoEfetivo(contexto);
    const chaveFila = obterChaveFilaOffline(ctx.operadorId, ctx.condominioId);
    const fila = obterFilaOffline(ctx);
    if (fila.length === 0) {
      return { sucessos: 0, falhas: 0, restantes: 0 };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('infport_sincronizacao_iniciada', { detail: { total: fila.length } }));
    }

    let sucessos = 0;
    let falhas = 0;
    const acoesNaoSincronizadas: AcaoOffline[] = [];

    for (const acao of fila) {
      const condoAcao = String(acao.condominio_id || acao.dados?.condominio_id || '').trim();
      const tabelaIsolada = isTabelaIsoladaPorCondominio(acao.tabela);

      // Valida contexto de condomínio e operador antes de qualquer replay: se divergir, coloca em quarentena segura
      if (tabelaIsolada && (!isValidCondominioId(condoAcao) || (isValidCondominioId(ctx.condominioId) && condoAcao !== ctx.condominioId))) {
        enviarParaQuarentena(acao, `Divergência de condomínio (${condoAcao || 'ausente'} != ${ctx.condominioId || 'ausente'})`);
        continue;
      }
      if (acao.operador_id && ctx.operadorId && acao.operador_id !== ctx.operadorId) {
        enviarParaQuarentena(acao, `Divergência de operador (${acao.operador_id} != ${ctx.operadorId})`);
        continue;
      }
      if (acao.auth_user_id && ctx.authUserId && acao.auth_user_id !== ctx.authUserId) {
        enviarParaQuarentena(acao, `Divergência de auth_user_id (${acao.auth_user_id} != ${ctx.authUserId})`);
        continue;
      }

      try {
        acao.tentativas += 1;
        let resError: any = null;

        if (acao.tipo === 'INSERT') {
          const payload = { ...acao.dados };
          if (typeof payload.id === 'string' && payload.id.startsWith('offline_')) {
            delete payload.id;
          }
          if (tabelaIsolada && !payload.condominio_id && isValidCondominioId(condoAcao)) {
            payload.condominio_id = condoAcao;
          }

          const { error } = await supabase.from(acao.tabela).insert([payload]);
          resError = error;
        } else if (acao.tipo === 'UPDATE') {
          const idAlvo = acao.dados?.id;
          const payload = { ...acao.dados };
          delete payload.id;

          if (idAlvo) {
            let query = supabase.from(acao.tabela).update(payload).eq('id', idAlvo);
            if (tabelaIsolada) {
              query = query.eq('condominio_id', condoAcao);
            }
            const { error } = await query;
            resError = error;
          }
        } else if (acao.tipo === 'DELETE') {
          const idAlvo = acao.dados?.id || acao.dados;
          if (idAlvo) {
            let query = supabase.from(acao.tabela).delete().eq('id', idAlvo);
            if (tabelaIsolada) {
              query = query.eq('condominio_id', condoAcao);
            }
            const { error } = await query;
            resError = error;
          }
        }

        if (resError) {
          console.warn(`[OfflineSyncEngine] Erro ao sincronizar ${acao.descricaoAmigavel}:`, resError.message);
          falhas++;
          acoesNaoSincronizadas.push(acao);
        } else {
          sucessos++;
        }
      } catch (err: any) {
        console.warn(`[OfflineSyncEngine] Exceção na sincronização de ${acao.descricaoAmigavel}:`, err.message);
        falhas++;
        acoesNaoSincronizadas.push(acao);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(chaveFila, JSON.stringify(acoesNaoSincronizadas));
      window.dispatchEvent(new CustomEvent('infport_sincronizacao_concluida', {
        detail: { sucessos, falhas, restantes: acoesNaoSincronizadas.length }
      }));
    }

    return {
      sucessos,
      falhas,
      restantes: acoesNaoSincronizadas.length
    };
  })().finally(() => {
    syncEmExecucao = null;
  });

  return syncEmExecucao;
}

/**
 * Pré-carrega e mantém em cache local todos os dados essenciais para 3+ horas de autonomia
 */
export async function atualizarCacheAutonomia3Horas(condominioId: string, forcar: boolean = false): Promise<boolean> {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return false;
  }

  if (!forcar) {
    try {
      const statusRaw = localStorage.getItem(CHAVE_STATUS_CACHE);
      if (statusRaw) {
        const status = JSON.parse(statusRaw);
        if (status.condominioId === condominioId && status.atualizadoEm) {
          const decorridoMs = Date.now() - new Date(status.atualizadoEm).getTime();
          if (decorridoMs < 3 * 60 * 60 * 1000) {
            return true;
          }
        }
      }
    } catch {}
  }

  try {
    const [moradoresRes, chavesRes, pontosRes, materiaisRes, custodiaRes] = await Promise.all([
      supabase.from('moradores').select('id, condominio_id, nome, bloco, unidade, telefone, status_acesso, tag_rfid, veiculo_placa, veiculo_modelo').eq('condominio_id', condominioId).order('nome'),
      supabase.from('chaves').select('id, condominio_id, codigo_chave, nome_chave, status, localizacao').eq('condominio_id', condominioId).order('codigo_chave'),
      supabase.from('rondas_pontos').select('id, condominio_id, nome_ponto, ordem, qr_code, nfc_tag, ativo').eq('condominio_id', condominioId).order('nome_ponto'),
      supabase.from('materiais_posto').select('id, condominio_id, nome, quantidade, status, categoria').eq('condominio_id', condominioId).order('nome'),
      supabase.from('custodia').select('id, condominio_id, codigo_custodia, codigo, descricao, fluxo, origem_tipo, origem_unidade, origem_bloco, origem_nome_doc, origem_whats, destino_tipo, destino_unidade, destino_bloco, destino_nome_doc, destino_whats, local_armazenamento, foto_entrada_url, foto_url, status, operador_entrada, created_at, data_hora_entrada').eq('condominio_id', condominioId).in('status', ['Aguardando Retirada', 'Retido', 'Guardado', 'Pendente']).order('created_at', { ascending: false })
    ]);

    const timestamp = new Date().toISOString();

    if (moradoresRes.data) {
      localStorage.setItem(`infport_offline_cache_moradores_${condominioId}`, JSON.stringify({ timestamp, dados: moradoresRes.data }));
    }
    if (chavesRes.data) {
      localStorage.setItem(`infport_offline_cache_chaves_${condominioId}`, JSON.stringify({ timestamp, dados: chavesRes.data }));
    }
    if (pontosRes.data) {
      localStorage.setItem(`infport_offline_cache_pontos_${condominioId}`, JSON.stringify({ timestamp, dados: pontosRes.data }));
    }
    if (materiaisRes.data) {
      localStorage.setItem(`infport_offline_cache_materiais_${condominioId}`, JSON.stringify({ timestamp, dados: materiaisRes.data }));
    }
    if (custodiaRes.data) {
      localStorage.setItem(`infport_offline_cache_custodia_ativa_${condominioId}`, JSON.stringify({ timestamp, dados: custodiaRes.data }));
    }

    localStorage.setItem(CHAVE_STATUS_CACHE, JSON.stringify({
      condominioId,
      atualizadoEm: timestamp,
      validadeHoras: 3,
      totalMoradores: moradoresRes.data?.length || 0,
      totalChaves: chavesRes.data?.length || 0,
      totalCustodia: custodiaRes.data?.length || 0,
      totalPontos: pontosRes.data?.length || 0
    }));

    return true;
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao renovar cache de 3 horas:', err);
    return false;
  }
}

export function obterStatusCacheAutonomia(): {
  atualizadoEm: string | null;
  valido: boolean;
  minutosDesdeAtualizacao: number;
} {
  try {
    const raw = localStorage.getItem(CHAVE_STATUS_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.atualizadoEm) {
        const diffMs = Date.now() - new Date(parsed.atualizadoEm).getTime();
        const minutos = Math.floor(diffMs / 60000);
        return {
          atualizadoEm: parsed.atualizadoEm,
          valido: minutos < 180,
          minutosDesdeAtualizacao: minutos
        };
      }
    }
  } catch {}

  return { atualizadoEm: null, valido: false, minutosDesdeAtualizacao: 999 };
}

let motorInicializado = false;
export function inicializarMotorSincronizacaoOffline(): void {
  if (motorInicializado || typeof window === 'undefined') return;
  motorInicializado = true;

  window.addEventListener('online', () => {
    setTimeout(() => {
      sincronizarFilaComSupabase();
    }, 1500);
  });

  setInterval(() => {
    if (navigator.onLine && obterFilaOffline().length > 0) {
      sincronizarFilaComSupabase();
    }
  }, 30000);
}
