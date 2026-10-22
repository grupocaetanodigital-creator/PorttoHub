/**
 * INFPORT 1.0 — Motor de Trabalho Offline e Sincronização Automática
 * 
 * Garante que a portaria e guarita funcionem sem interrupções por 3+ horas
 * mesmo em quedas totais de internet. Todas as ações realizadas offline são
 * enfileiradas localmente e sincronizadas com o Supabase assim que a conexão retorna.
 */

import { supabase } from './supabase';

export interface AcaoOffline {
  id: string;
  tabela: string;
  tipo: 'INSERT' | 'UPDATE' | 'DELETE';
  dados: any;
  criadoEm: string;
  tentativas: number;
  descricaoAmigavel: string;
}

const CHAVE_FILA_OFFLINE = 'infport_fila_acoes_offline_v1';
const CHAVE_STATUS_CACHE = 'infport_cache_autonomia_3h_v1';

/**
 * Registra uma ação executada em modo offline ou após falha de rede
 */
export function enfileirarAcaoOffline(
  tabela: string,
  tipo: 'INSERT' | 'UPDATE' | 'DELETE',
  dados: any,
  descricaoAmigavel: string = 'Operação da Portaria'
): AcaoOffline {
  const acao: AcaoOffline = {
    id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    tabela,
    tipo,
    dados,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
    descricaoAmigavel
  };

  try {
    const filaAtual = obterFilaOffline();
    filaAtual.push(acao);
    localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(filaAtual));

    // Notifica a aplicação em tempo real
    window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: filaAtual.length, novaAcao: acao } }));
    console.log(`[OfflineSyncEngine] Ação salva localmente (${filaAtual.length} pendente(s)): ${descricaoAmigavel}`);
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao persistir ação offline:', err);
  }

  return acao;
}

/**
 * Retorna todas as ações pendentes na fila offline
 */
export function obterFilaOffline(): AcaoOffline[] {
  try {
    const raw = localStorage.getItem(CHAVE_FILA_OFFLINE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao ler fila offline:', err);
  }
  return [];
}

/**
 * Remove uma ação da fila offline por ID
 */
export function removerAcaoFila(id: string): void {
  try {
    const filaAtual = obterFilaOffline().filter(a => a.id !== id);
    localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(filaAtual));
    window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: filaAtual.length } }));
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao remover ação da fila:', err);
  }
}

/**
 * Limpa toda a fila offline
 */
export function limparFilaOffline(): void {
  localStorage.removeItem(CHAVE_FILA_OFFLINE);
  window.dispatchEvent(new CustomEvent('infport_fila_atualizada', { detail: { total: 0 } }));
}

/**
 * Sincroniza todas as ações pendentes da fila offline com o Supabase
 */
export async function sincronizarFilaComSupabase(): Promise<{
  sucessos: number;
  falhas: number;
  restantes: number;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { sucessos: 0, falhas: 0, restantes: obterFilaOffline().length };
  }

  const fila = obterFilaOffline();
  if (fila.length === 0) {
    return { sucessos: 0, falhas: 0, restantes: 0 };
  }

  console.log(`[OfflineSyncEngine] Iniciando sincronização de ${fila.length} ação(ões) com o Supabase...`);
  window.dispatchEvent(new CustomEvent('infport_sincronizacao_iniciada', { detail: { total: fila.length } }));

  let sucessos = 0;
  let falhas = 0;
  const acoesNaoSincronizadas: AcaoOffline[] = [];

  for (const acao of fila) {
    try {
      acao.tentativas += 1;
      let resError: any = null;

      if (acao.tipo === 'INSERT') {
        // Remove IDs temporários gerados no front offline caso existam
        const payload = { ...acao.dados };
        if (typeof payload.id === 'string' && payload.id.startsWith('offline_')) {
          delete payload.id;
        }

        const { error } = await supabase.from(acao.tabela).insert([payload]);
        resError = error;
      } else if (acao.tipo === 'UPDATE') {
        const idAlvo = acao.dados.id;
        const payload = { ...acao.dados };
        delete payload.id;

        if (idAlvo) {
          const { error } = await supabase.from(acao.tabela).update(payload).eq('id', idAlvo);
          resError = error;
        }
      } else if (acao.tipo === 'DELETE') {
        const idAlvo = acao.dados.id || acao.dados;
        if (idAlvo) {
          const { error } = await supabase.from(acao.tabela).delete().eq('id', idAlvo);
          resError = error;
        }
      }

      if (resError) {
        console.warn(`[OfflineSyncEngine] Erro ao sincronizar ${acao.descricaoAmigavel}:`, resError.message);
        falhas++;
        acoesNaoSincronizadas.push(acao);
      } else {
        sucessos++;
        console.log(`[OfflineSyncEngine] Sincronizado com sucesso: ${acao.descricaoAmigavel}`);
      }
    } catch (err: any) {
      console.warn(`[OfflineSyncEngine] Exceção na sincronização de ${acao.descricaoAmigavel}:`, err.message);
      falhas++;
      acoesNaoSincronizadas.push(acao);
    }
  }

  // Atualiza fila com o que sobrou
  localStorage.setItem(CHAVE_FILA_OFFLINE, JSON.stringify(acoesNaoSincronizadas));

  window.dispatchEvent(new CustomEvent('infport_sincronizacao_concluida', {
    detail: { sucessos, falhas, restantes: acoesNaoSincronizadas.length }
  }));

  return {
    sucessos,
    falhas,
    restantes: acoesNaoSincronizadas.length
  };
}

/**
 * Pré-carrega e mantém em cache local todos os dados essenciais para 3+ horas de autonomia
 */
export async function atualizarCacheAutonomia3Horas(condominioId: string): Promise<boolean> {
  if (!condominioId || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return false;
  }

  try {
    const [moradoresRes, chavesRes, pontosRes, materiaisRes] = await Promise.all([
      supabase.from('moradores').select('*').eq('condominio_id', condominioId).order('nome'),
      supabase.from('chaves').select('*').eq('condominio_id', condominioId).order('codigo_chave'),
      supabase.from('rondas_pontos').select('*').eq('condominio_id', condominioId).order('nome_ponto'),
      supabase.from('materiais_posto').select('*').eq('condominio_id', condominioId).order('nome')
    ]);

    const timestamp = new Date().toISOString();

    if (moradoresRes.data) {
      localStorage.setItem(`infport_offline_cache_moradores_${condominioId}`, JSON.stringify({
        timestamp,
        dados: moradoresRes.data
      }));
    }

    if (chavesRes.data) {
      localStorage.setItem(`infport_offline_cache_chaves_${condominioId}`, JSON.stringify({
        timestamp,
        dados: chavesRes.data
      }));
    }

    if (pontosRes.data) {
      localStorage.setItem(`infport_offline_cache_pontos_${condominioId}`, JSON.stringify({
        timestamp,
        dados: pontosRes.data
      }));
    }

    if (materiaisRes.data) {
      localStorage.setItem(`infport_offline_cache_materiais_${condominioId}`, JSON.stringify({
        timestamp,
        dados: materiaisRes.data
      }));
    }

    // Registra carimbo da autonomia
    localStorage.setItem(CHAVE_STATUS_CACHE, JSON.stringify({
      condominioId,
      atualizadoEm: timestamp,
      validadeHoras: 3,
      totalMoradores: moradoresRes.data?.length || 0,
      totalChaves: chavesRes.data?.length || 0,
      totalPontos: pontosRes.data?.length || 0
    }));

    return true;
  } catch (err) {
    console.warn('[OfflineSyncEngine] Erro ao renovar cache de 3 horas:', err);
    return false;
  }
}

/**
 * Retorna os metadados do cache de 3 horas
 */
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
          valido: minutos < 180, // Menos de 3 horas
          minutosDesdeAtualizacao: minutos
        };
      }
    }
  } catch {}

  return { atualizadoEm: null, valido: false, minutosDesdeAtualizacao: 999 };
}

/**
 * Inicializador automático do motor de sincronização em segundo plano
 */
let motorInicializado = false;
export function inicializarMotorSincronizacaoOffline(): void {
  if (motorInicializado || typeof window === 'undefined') return;
  motorInicializado = true;

  // 1. Sincroniza automaticamente assim que a conexão com a internet retorna
  window.addEventListener('online', () => {
    console.log('[OfflineSyncEngine] Conexão detectada! Disparando sincronização automática com Supabase...');
    setTimeout(() => {
      sincronizarFilaComSupabase();
    }, 1500);
  });

  // 2. Heartbeat a cada 30 segundos para sincronizar se estiver online e houver pendências
  setInterval(() => {
    if (navigator.onLine && obterFilaOffline().length > 0) {
      sincronizarFilaComSupabase();
    }
  }, 30000);
}
