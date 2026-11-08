/**
 * PorttoHub 1.0 — Motor de Sincronização em Tempo Real (Realtime) & Consistência Multi-Dispositivo
 * 
 * - Ouve alterações via Supabase Realtime Channels (PostgreSQL CDC).
 * - Sincroniza abas, dispositivos móveis e computadores de guarita instantaneamente.
 * - Quando a rede é restabelecida após queda, drena automaticamente a fila offline
 *   e sincroniza dados pendentes sem intervenção manual do usuário.
 */

import { supabase } from './supabase';
import { sincronizarFilaComSupabase, obterFilaOffline } from './offlineSyncEngine';
import { invalidarCacheTabela } from './redisCacheService';

type RealtimeCallback = (payload: {
  tabela: string;
  tipo: 'INSERT' | 'UPDATE' | 'DELETE';
  novo: any;
  antigo: any;
}) => void;

const listenersMap = new Map<string, Set<RealtimeCallback>>();
let canalRealtimeGeral: any = null;
let inicializado = false;

/**
 * Inicializa a escuta global em tempo real no Supabase
 */
export function inicializarRealtimeGlobal(): () => void {
  if (inicializado && canalRealtimeGeral) {
    return () => {};
  }

  try {
    canalRealtimeGeral = supabase
      .channel('porttohub_sincronizacao_geral')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          const tabela = payload.table;
          const tipo = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const novo = payload.new;
          const antigo = payload.old;

          // Invalida cache local e Redis para a tabela afetada
          invalidarCacheTabela(tabela);

          // Notifica os componentes cadastrados para a tabela específica
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

          // Dispara evento global no DOM para reatividade decoupled
          window.dispatchEvent(
            new CustomEvent('porttohub:realtime_alteracao', {
              detail: { tabela, tipo, novo, antigo }
            })
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[RealtimeSync] Canal de sincronização em tempo real conectado com sucesso!');
        }
      });

    inicializado = true;
  } catch (err) {
    console.warn('[RealtimeSync] Não foi possível conectar ao canal Realtime:', err);
  }

  // Listener para restabelecimento de conexão de rede
  const handleVoltouOnline = async () => {
    console.log('[RealtimeSync] Conexão com a internet restabelecida! Iniciando sincronização automática...');
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

    // Notifica todos os módulos para atualizarem suas listagens com dados frescos
    window.dispatchEvent(new CustomEvent('porttohub:reconexao_sincronizada'));
  };

  window.addEventListener('online', handleVoltouOnline);

  return () => {
    window.removeEventListener('online', handleVoltouOnline);
    if (canalRealtimeGeral) {
      supabase.removeChannel(canalRealtimeGeral);
      canalRealtimeGeral = null;
      inicializado = false;
    }
  };
}

/**
 * Registra um callback para ouvir alterações em tempo real de uma tabela específica
 */
export function subscreverTabelaRealtime(tabela: string, callback: RealtimeCallback): () => void {
  if (!listenersMap.has(tabela)) {
    listenersMap.set(tabela, new Set());
  }
  listenersMap.get(tabela)!.add(callback);

  // Garante que o canal geral está ativo
  if (!inicializado) {
    inicializarRealtimeGlobal();
  }

  return () => {
    const listeners = listenersMap.get(tabela);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        listenersMap.delete(tabela);
      }
    }
  };
}
