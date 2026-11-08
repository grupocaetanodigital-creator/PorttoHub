/**
 * Hook Central de Sincronização Local-First: IndexedDB + Delta Sync + Supabase Realtime
 * 
 * BENEFÍCIOS OPERACIONAIS:
 * 1. Zero-delay (0ms): A tela renderiza imediatamente com os dados locais do IndexedDB.
 * 2. Delta Sync em Background: Dispara verificação ultraleve sem travar a interface do operador.
 * 3. Realtime WebSockets: Ouve canais dedicados no Supabase filtrados por `condominio_id`.
 * 4. Resiliência Offline: Permite operação contínua mesmo sem conexão de rede.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { 
  NomeTabelaLocal, 
  obterTodosItensLocal, 
  salvarItemLocal, 
  excluirItemLocal 
} from '../services/porttoHubDb';
import { 
  obterDadosTabelaLocal, 
  sincronizarDeltaTabela, 
  aplicarMutacaoLocal 
} from '../services/deltaSyncService';
import { isUUID } from '../services/condominioService';

export interface UseLocalFirstSyncOptions {
  habilitarRealtime?: boolean;
  intervaloDeltaMs?: number; // Ex: a cada 60s verificar delta em background
  colunaChaveId?: string;
  filtroCustomizado?: (item: any) => boolean;
}

export function useLocalFirstSync<T extends { id: any; condominio_id?: string; updated_at?: string; created_at?: string }>(
  tabela: NomeTabelaLocal,
  condominioId: string | undefined,
  opcoes: UseLocalFirstSyncOptions = {}
) {
  const {
    habilitarRealtime = true,
    intervaloDeltaMs = 0,
    colunaChaveId = 'id',
    filtroCustomizado
  } = opcoes;

  const [dados, setDados] = useState<T[]>([]);
  const [carregandoLocal, setCarregandoLocal] = useState<boolean>(true);
  const [sincronizandoDelta, setSincronizandoDelta] = useState<boolean>(false);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const [deltaCount, setDeltaCount] = useState<number>(0);

  const dadosRef = useRef<T[]>([]);
  dadosRef.current = dados;

  const condoIdValido = Boolean(
    condominioId && 
    condominioId !== 'todos' && 
    condominioId !== 'global' && 
    isUUID(condominioId)
  );

  /**
   * 1. Carga Instantânea (0ms) a partir do IndexedDB / RAM
   */
  const carregarDoBancoLocal = useCallback(async () => {
    if (!condominioId) {
      setDados([]);
      setCarregandoLocal(false);
      return;
    }

    try {
      const itensLocais = await obterDadosTabelaLocal<T>(tabela, condominioId);
      const filtrados = filtroCustomizado ? itensLocais.filter(filtroCustomizado) : itensLocais;
      setDados(filtrados);
    } catch (err) {
      console.warn(`[useLocalFirstSync] Erro ao carregar cache local de ${tabela}:`, err);
    } finally {
      setCarregandoLocal(false);
    }
  }, [tabela, condominioId, filtroCustomizado]);

  /**
   * 2. Executa a sincronização Delta em Background
   */
  const executarDeltaSync = useCallback(async () => {
    if (!condoIdValido || !condominioId) return;

    setSincronizandoDelta(true);
    try {
      const resultado = await sincronizarDeltaTabela<T>(tabela, condominioId, colunaChaveId);
      const filtrados = filtroCustomizado ? resultado.dadosAtualizados.filter(filtroCustomizado) : resultado.dadosAtualizados;
      setDados(filtrados);
      setUltimoSync(resultado.timestampSync);
      setDeltaCount(resultado.deltaCount);
    } catch (err) {
      console.warn(`[useLocalFirstSync] Erro no Delta Sync de ${tabela}:`, err);
    } finally {
      setSincronizandoDelta(false);
    }
  }, [tabela, condominioId, condoIdValido, colunaChaveId, filtroCustomizado]);

  /**
   * Ciclo de Vida: Carrega local de imediato e dispara delta em background
   */
  useEffect(() => {
    let ativo = true;

    setCarregandoLocal(true);
    carregarDoBancoLocal().then(() => {
      if (ativo && condoIdValido) {
        executarDeltaSync();
      }
    });

    return () => {
      ativo = false;
    };
  }, [tabela, condominioId, carregarDoBancoLocal, executarDeltaSync, condoIdValido]);

  /**
   * 3. Sincronização em Tempo Real (Supabase Realtime WebSockets)
   * Filtrado especificamente pelo tenant `condominio_id`
   */
  useEffect(() => {
    if (!habilitarRealtime || !condoIdValido || !condominioId) return;

    const nomeCanal = `rt_${tabela}_${condominioId.slice(0, 8)}`;
    
    const canal = supabase
      .channel(nomeCanal)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tabela,
          filter: `condominio_id=eq.${condominioId}`
        },
        async (payload) => {
          const tipo = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const novo = payload.new as T;
          const antigo = payload.old as T;

          console.log(`[Realtime LocalFirst] Evento ${tipo} em ${tabela}:`, novo || antigo);

          if (tipo === 'INSERT' && novo) {
            await salvarItemLocal(tabela, novo);
            setDados((prev) => {
              const semDuplicata = prev.filter((it) => String(it.id) !== String(novo.id));
              const atualizada = [novo, ...semDuplicata];
              return filtroCustomizado ? atualizada.filter(filtroCustomizado) : atualizada;
            });
          } else if (tipo === 'UPDATE' && novo) {
            await salvarItemLocal(tabela, novo);
            setDados((prev) => {
              const atualizada = prev.map((it) => (String(it.id) === String(novo.id) ? { ...it, ...novo } : it));
              return filtroCustomizado ? atualizada.filter(filtroCustomizado) : atualizada;
            });
          } else if (tipo === 'DELETE' && antigo) {
            await excluirItemLocal(tabela, antigo.id);
            setDados((prev) => prev.filter((it) => String(it.id) !== String(antigo.id)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [tabela, condominioId, habilitarRealtime, condoIdValido, filtroCustomizado]);

  /**
   * Listener para mutações locais da mesma aba ou de outros componentes
   */
  useEffect(() => {
    const handleMutacao = (e: any) => {
      const detail = e.detail;
      if (detail && detail.tabela === tabela && detail.condominioId === condominioId) {
        carregarDoBancoLocal();
      }
    };

    window.addEventListener(`porttohub_delta_${tabela}`, handleMutacao);
    window.addEventListener(`porttohub_local_mutate_${tabela}`, handleMutacao);
    window.addEventListener('porttohub_dados_precarregados', handleMutacao);

    return () => {
      window.removeEventListener(`porttohub_delta_${tabela}`, handleMutacao);
      window.removeEventListener(`porttohub_local_mutate_${tabela}`, handleMutacao);
      window.removeEventListener('porttohub_dados_precarregados', handleMutacao);
    };
  }, [tabela, condominioId, carregarDoBancoLocal]);

  /**
   * Polling opcional para Delta Sync periódico em telas ativas
   */
  useEffect(() => {
    if (!intervaloDeltaMs || intervaloDeltaMs <= 0 || !condoIdValido) return;

    const timer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        executarDeltaSync();
      }
    }, intervaloDeltaMs);

    return () => clearInterval(timer);
  }, [intervaloDeltaMs, condoIdValido, executarDeltaSync]);

  /**
   * Helper para mutação otimista na UI com persistência local imediata
   */
  const mutarLocal = useCallback(
    async (item: T, tipo: 'INSERT' | 'UPDATE' | 'DELETE') => {
      if (!condominioId) return;
      await aplicarMutacaoLocal(tabela, condominioId, item, tipo);
      if (tipo === 'DELETE') {
        setDados((prev) => prev.filter((it) => String(it.id) !== String(item.id)));
      } else if (tipo === 'UPDATE') {
        setDados((prev) => prev.map((it) => (String(it.id) === String(item.id) ? { ...it, ...item } : it)));
      } else {
        setDados((prev) => [item, ...prev]);
      }
    },
    [tabela, condominioId]
  );

  return {
    dados,
    carregandoLocal,
    sincronizandoDelta,
    ultimoSync,
    deltaCount,
    recarregarDelta: executarDeltaSync,
    mutarLocal
  };
}
