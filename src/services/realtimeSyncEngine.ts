/**
 * PorttoHub 1.0 — Motor de Sincronização em Tempo Real (Realtime) & Consistência Multi-Dispositivo
 *
 * Isolamento estrito por condomínio:
 * - Nunca abre assinatura Postgres CDC global sem filtro `condominio_id=eq.<id>`.
 * - Descarta qualquer evento cujo payload não corresponda ao condomínio ativo monitorado.
 * - Realiza teardown limpo quando ocorre troca de condomínio ou encerramento de sessão.
 */

import { supabase } from './supabase';
import { getCondominioAtivoId } from './condominioService';
import { sincronizarFilaComSupabase, obterFilaOffline } from './offlineSyncEngine';
import { invalidarCacheTabela } from './redisCacheService';
import { extrairCondominioIdDeEvento, isValidCondominioId } from './tenantAuthService';

type RealtimeCallback = (payload: {
  tabela: string;
  tipo: 'INSERT' | 'UPDATE' | 'DELETE';
  novo: any;
  antigo: any;
}) => void;

const listenersMap = new Map<string, Set<RealtimeCallback>>();
const canaisPorTabela = new Map<string, any>();
let condominioMonitoradoAtual = '';
let globalListenersRegistrados = false;

function encerrarTodosCanais(): void {
  canaisPorTabela.forEach((canal) => {
    try {
      supabase.removeChannel(canal);
    } catch {}
  });
  canaisPorTabela.clear();
}

function garantirCanalTabela(tabela: string, condominioId: string): void {
  if (!isValidCondominioId(condominioId)) return;
  const chave = `${tabela}:${condominioId}`;
  if (canaisPorTabela.has(chave)) return;

  try {
    const canal = supabase
      .channel(`porttohub_rt_${tabela}_${condominioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tabela,
          filter: `condominio_id=eq.${condominioId}`
        },
        (payload) => {
          const tipo = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const novo = payload.new as any;
          const antigo = payload.old as any;
          const payloadCondo = String(novo?.condominio_id || antigo?.condominio_id || '').trim();

          if (payloadCondo && payloadCondo !== condominioMonitoradoAtual) {
            return;
          }

          invalidarCacheTabela(tabela, condominioId).catch(() => {});

          const listeners = listenersMap.get(tabela);
          if (listeners) {
            listeners.forEach((callback) => {
              try {
                callback({ tabela, tipo, novo, antigo });
              } catch (e) {
                console.warn(`[RealtimeSync] Erro no listener da tabela ${tabela}:`, e);
              }
            });
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('porttohub:realtime_alteracao', {
                detail: { tabela, tipo, novo, antigo, condominioId }
              })
            );
          }
        }
      )
      .subscribe();

    canaisPorTabela.set(chave, canal);
  } catch (err) {
    console.warn(`[RealtimeSync] Não foi possível conectar canal Realtime para ${tabela}:`, err);
  }
}

export function inicializarRealtimeGlobal(condominioIdParam?: string): () => void {
  const condoId = condominioIdParam || getCondominioAtivoId();
  if (isValidCondominioId(condoId)) {
    if (condominioMonitoradoAtual && condominioMonitoradoAtual !== condoId) {
      encerrarTodosCanais();
    }
    condominioMonitoradoAtual = condoId;
    listenersMap.forEach((_, tabela) => garantirCanalTabela(tabela, condoId));
  }

  if (typeof window === 'undefined') {
    return () => encerrarTodosCanais();
  }

  const handleVoltouOnline = async () => {
    const fila = obterFilaOffline();
    if (fila.length > 0) {
      window.dispatchEvent(
        new CustomEvent('porttohub:toast_notificacao', {
          detail: {
            tipo: 'info',
            titulo: 'Reconectado',
            mensagem: `Sincronizando ${fila.length} operação(ões) gravadas offline...`
          }
        })
      );
      const resultado = await sincronizarFilaComSupabase();
      if (resultado.sucessos > 0) {
        window.dispatchEvent(
          new CustomEvent('porttohub:toast_notificacao', {
            detail: {
              tipo: 'sucesso',
              titulo: 'Sincronizado',
              mensagem: `${resultado.sucessos} ação(ões) enviada(s) à nuvem com sucesso!`
            }
          })
        );
      }
    }
    window.dispatchEvent(new CustomEvent('porttohub:reconexao_sincronizada'));
  };

  const handleCondoAlterado = (e: any) => {
    const novoId = extrairCondominioIdDeEvento(e) || getCondominioAtivoId();
    encerrarTodosCanais();
    condominioMonitoradoAtual = isValidCondominioId(novoId) ? novoId : '';
    if (condominioMonitoradoAtual) {
      listenersMap.forEach((_, tabela) => garantirCanalTabela(tabela, condominioMonitoradoAtual));
    }
  };

  if (!globalListenersRegistrados) {
    globalListenersRegistrados = true;
    window.addEventListener('online', handleVoltouOnline);
    window.addEventListener('infport:condominio_alterado', handleCondoAlterado);
  }

  return () => {
    encerrarTodosCanais();
    window.removeEventListener('online', handleVoltouOnline);
    window.removeEventListener('infport:condominio_alterado', handleCondoAlterado);
    globalListenersRegistrados = false;
  };
}

/**
 * Registra um callback para ouvir alterações em tempo real de uma tabela específica filtrada pelo condomínio ativo
 */
export function subscreverTabelaRealtime(
  tabela: string,
  callback: RealtimeCallback,
  condominioIdParam?: string
): () => void {
  const condoId = condominioIdParam || condominioMonitoradoAtual || getCondominioAtivoId();
  if (!isValidCondominioId(condoId)) {
    return () => {};
  }

  if (condominioMonitoradoAtual && condominioMonitoradoAtual !== condoId) {
    encerrarTodosCanais();
  }
  condominioMonitoradoAtual = condoId;

  if (!listenersMap.has(tabela)) {
    listenersMap.set(tabela, new Set());
  }
  listenersMap.get(tabela)!.add(callback);

  garantirCanalTabela(tabela, condoId);

  return () => {
    const listeners = listenersMap.get(tabela);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersMap.delete(tabela);
        const chave = `${tabela}:${condoId}`;
        const canal = canaisPorTabela.get(chave);
        if (canal) {
          try {
            supabase.removeChannel(canal);
          } catch {}
          canaisPorTabela.delete(chave);
        }
      }
    }
  };
}
