/**
 * PorttoHub — Serviço de Cache Permanente e Aceleração de Encomendas
 *
 * Mantém os dados de encomendas (itens retidos, lotes RE, entregadores, moradores e locais)
 * 100% carregados em memória (RAM) e persistidos em cache local ultra-rápido.
 * Elimina totalmente qualquer delay ou travamento ao clicar e abrir o menu de Encomendas.
 */

import { supabase } from './supabase';
import { cachedQuery } from './redisCacheService';
import { isUUID } from './condominioService';
import { salvarLoteItensLocal } from './porttoHubDb';

export interface EncomendasCacheBundle {
  condominioId: string;
  itensRetidos: any[];
  lotesPendentes: any[];
  todosLotesRE: any[];
  entregadores: any[];
  moradores: any[];
  locaisArmazenamento: any[];
  atualizadoEm: number;
}

const CHAVE_PREFIXO_STORAGE = 'infport_cache_encomendas_bundle_v2_';
const TTL_CACHE_MS = 3 * 60 * 1000; // 3 minutos de validade antes de revalidação em background

// Armazenamento em memória RAM global no navegador (acesso instantâneo em 0ms)
const memoriaEncomendas = new Map<string, EncomendasCacheBundle>();

// Mapa de promessas ativas para evitar requisições concorrentes duplicadas
const promessasCarregamento = new Map<string, Promise<EncomendasCacheBundle>>();

// Canal Realtime para escuta de alterações nas tabelas de encomendas
let canalRealtimeEncomendas: any = null;
let condominoMonitoradoId: string = '';

/**
 * Obtém os dados de encomendas imediatamente do cache (RAM ou localStorage).
 * Retorna dados vazios formatados se ainda não houver cache, sem lançar erros.
 */
export function obterCacheEncomendas(condominioId: string): EncomendasCacheBundle {
  const vazio: EncomendasCacheBundle = {
    condominioId,
    itensRetidos: [],
    lotesPendentes: [],
    todosLotesRE: [],
    entregadores: [],
    moradores: [],
    locaisArmazenamento: [],
    atualizadoEm: 0
  };

  if (!condominioId || condominioId === 'todos' || condominioId === 'global') {
    return vazio;
  }

  // 1. Tenta memória RAM do cliente (0.0ms)
  const emMemoria = memoriaEncomendas.get(condominioId);
  if (emMemoria && emMemoria.itensRetidos !== undefined) {
    return emMemoria;
  }

  // 2. Tenta localStorage se ainda não estiver na RAM
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`${CHAVE_PREFIXO_STORAGE}${condominioId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.condominioId === condominioId) {
          memoriaEncomendas.set(condominioId, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[encomendasService] Erro ao ler bundle do localStorage:', e);
    }
  }

  return vazio;
}

/**
 * Carrega e pré-aquece todos os dados de encomendas em paralelo para o condomínio.
 * Atualiza silenciosamente a memória RAM e o storage local sem travar o usuário.
 */
export async function carregarEPreaquecerEncomendas(
  condominioId: string,
  forcar: boolean = false
): Promise<EncomendasCacheBundle> {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    return obterCacheEncomendas(condominioId);
  }

  const agora = Date.now();
  const cacheAtual = memoriaEncomendas.get(condominioId) || obterCacheEncomendas(condominioId);

  // Se o cache está recente e não foi forçado, retorna imediatamente
  if (!forcar && cacheAtual.atualizadoEm && (agora - cacheAtual.atualizadoEm < TTL_CACHE_MS)) {
    return cacheAtual;
  }

  // Deduplicação de requisições concorrentes (Thundering Herd)
  if (promessasCarregamento.has(condominioId)) {
    return promessasCarregamento.get(condominioId)!;
  }

  const tarefa = (async () => {
    try {
      const condoFiltros = [{ field: 'condominio_id', op: 'eq' as const, value: condominioId }];

      // Dispara todas as consultas críticas em paralelo (1 único roundtrip de rede!)
      const [
        entData,
        lotesPendentesRes,
        todosLotesRes,
        moradData,
        rawItensRetidos,
        configRes
      ] = await Promise.all([
        // 1. Entregadores
        cachedQuery<any[]>({
          table: 'entregadores',
          select: '*',
          filters: condoFiltros,
          orderBy: { field: 'nome', ascending: true },
          ttlSeconds: 300,
          condominioId
        }).catch(() => []),

        // 2. Lotes RE pendentes
        supabase
          .from('lotes_re')
          .select('id, condominio_id, entregador_id, codigo_re, qtd_declarada, qtd_triada, status, created_at, operador_id, operador_nome')
          .in('status', ['aguardando_triagem', 'em_triagem'])
          .eq('condominio_id', condominioId)
          .order('created_at', { ascending: false })
          .then(res => res.data || [], () => []),

        // 3. Histórico recente de lotes RE
        supabase
          .from('lotes_re')
          .select('id, condominio_id, entregador_id, codigo_re, qtd_declarada, qtd_triada, status, created_at, operador_id, operador_nome')
          .eq('condominio_id', condominioId)
          .order('created_at', { ascending: false })
          .limit(50)
          .then(res => res.data || [], () => []),

        // 4. Moradores
        cachedQuery<any[]>({
          table: 'moradores',
          select: 'id, condominio_id, nome, bloco, unidade, telefone, status_acesso',
          filters: condoFiltros,
          orderBy: { field: 'nome', ascending: true },
          ttlSeconds: 300,
          condominioId
        }).catch(() => []),

        // 5. Itens Retidos (encomendas_itens)
        cachedQuery<any[]>({
          table: 'encomendas_itens',
          select: 'id, condominio_id, lote_re_id, codigo_rastreio, codigo_barras, destinatario, bloco, unidade, status, local_armazenamento, data_recebimento, data_retirada, operador_entrada, operador_baixa, retirado_por, created_at, foto_etiqueta, foto_etiqueta_url, assinatura_url, morador_id',
          filters: [
            { field: 'status', op: 'eq' as const, value: 'retido' },
            ...condoFiltros
          ],
          orderBy: { field: 'created_at', ascending: false },
          ttlSeconds: 120,
          condominioId
        }).catch(() => []),

        // 6. Locais de armazenamento
        supabase
          .from('configuracoes')
          .select('locais_armazenamento')
          .eq('condominio_id', condominioId)
          .maybeSingle()
          .then(res => res.data?.locais_armazenamento || [], () => [])
      ]);

      const listaEntregadores = Array.isArray(entData) ? entData : [];
      const listaMoradores = Array.isArray(moradData) ? moradData : [];
      const listaLocais = Array.isArray(configRes) ? configRes : [];

      // Enriquecimento dos lotes pendentes com dados de entregadores
      const lotesPendentesEnriquecidos = (lotesPendentesRes || []).map((l: any) => {
        const ent = listaEntregadores.find((e: any) => e.id === l.entregador_id);
        return {
          ...l,
          entregadores: ent ? { nome: ent.nome, empresa: ent.empresa, documento: ent.documento } : null
        };
      });

      // Enriquecimento do histórico de lotes
      const todosLotesEnriquecidos = (todosLotesRes || []).map((l: any) => {
        const ent = listaEntregadores.find((e: any) => e.id === l.entregador_id);
        return {
          ...l,
          entregadores: ent ? { nome: ent.nome, empresa: ent.empresa, documento: ent.documento } : null
        };
      });

      // Enriquecimento dos itens retidos
      let itensRetidosFinal: any[] = [];
      const itensRaw = Array.isArray(rawItensRetidos) ? rawItensRetidos : [];

      if (itensRaw.length > 0) {
        itensRetidosFinal = itensRaw.map((item: any) => {
          const m = listaMoradores.find((mor: any) =>
            mor.id === item.morador_id ||
            (mor.unidade && String(mor.unidade).trim() === String(item.unidade).trim() && (!item.bloco || mor.bloco === item.bloco))
          );
          const l = todosLotesEnriquecidos.find((lt: any) => lt.id === item.lote_re_id);
          return {
            ...item,
            codigo_barras: item.codigo_barras || item.codigo_rastreio || '',
            codigo_rastreio: item.codigo_rastreio || item.codigo_barras || '',
            foto_etiqueta: item.foto_etiqueta || item.foto_etiqueta_url || '',
            operador_baixa: item.operador_baixa || item.operador_baixa_nome || '',
            moradores: m ? { nome: m.nome, telefone: m.telefone, bloco: m.bloco, unidade: m.unidade } : (item.moradores || null),
            lotes_re: l ? { operador_id: l.operador_id, codigo_re: l.codigo_re } : (item.lotes_re || null)
          };
        });
      }

      const novoBundle: EncomendasCacheBundle = {
        condominioId,
        itensRetidos: itensRetidosFinal,
        lotesPendentes: lotesPendentesEnriquecidos,
        todosLotesRE: todosLotesEnriquecidos,
        entregadores: listaEntregadores,
        moradores: listaMoradores,
        locaisArmazenamento: listaLocais,
        atualizadoEm: Date.now()
      };

      // Grava em memória RAM
      memoriaEncomendas.set(condominioId, novoBundle);

      // Persiste no IndexedDB de alta capacidade (sem limite de 5MB do localStorage)
      salvarLoteItensLocal('encomendas_itens', itensRetidosFinal, condominioId, new Date().toISOString(), false).catch((err) => {
        console.warn('[encomendasService] Erro ao gravar itens no IndexedDB:', err);
      });

      // Persiste no localStorage como contingência secundária
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(`${CHAVE_PREFIXO_STORAGE}${condominioId}`, JSON.stringify(novoBundle));
          localStorage.setItem(`infport_cache_retidos_${condominioId}`, JSON.stringify(itensRetidosFinal));
        } catch (e) {
          console.warn('[encomendasService] Quota ou erro ao gravar cache no localStorage:', e);
        }
      }

      // Notifica componentes em tempo real
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('infport_encomendas_atualizadas', {
            detail: { condominioId, totalRetidos: itensRetidosFinal.length }
          })
        );
      }

      // Ativa escuta Realtime para este condomínio
      inicializarRealtimeEncomendas(condominioId);

      return novoBundle;
    } finally {
      promessasCarregamento.delete(condominioId);
    }
  })();

  promessasCarregamento.set(condominioId, tarefa);
  return tarefa;
}

/**
 * Conecta escuta Realtime (CDC) no canal de encomendas do Supabase
 * Atualiza o cache silenciosamente assim que qualquer entrega/baixa ocorrer
 */
export function inicializarRealtimeEncomendas(condominioId?: string): () => void {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    return () => {};
  }

  if (canalRealtimeEncomendas && condominoMonitoradoId === condominioId) {
    return () => {};
  }

  try {
    if (canalRealtimeEncomendas) {
      supabase.removeChannel(canalRealtimeEncomendas);
    }

    condominoMonitoradoId = condominioId;
    canalRealtimeEncomendas = supabase
      .channel(`porttohub_realtime_encomendas_${condominioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'encomendas_itens',
          filter: `condominio_id=eq.${condominioId}`
        },
        () => {
          // Revalida em background sem travar a interface
          carregarEPreaquecerEncomendas(condominioId, true).catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lotes_re',
          filter: `condominio_id=eq.${condominioId}`
        },
        () => {
          carregarEPreaquecerEncomendas(condominioId, true).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      if (canalRealtimeEncomendas) {
        supabase.removeChannel(canalRealtimeEncomendas);
        canalRealtimeEncomendas = null;
      }
    };
  } catch (err) {
    console.warn('[encomendasService] Falha ao conectar Realtime:', err);
    return () => {};
  }
}

/**
 * Atualiza ou remove um item pontual no cache em memória imediatamente (otimista)
 */
export function atualizarItemRetidoCache(
  condominioId: string,
  itemId: string,
  novoItem?: any,
  acao: 'upsert' | 'delete' = 'upsert'
): void {
  if (!condominioId) return;

  const bundle = memoriaEncomendas.get(condominioId);
  if (!bundle) return;

  let novaLista = [...bundle.itensRetidos];
  if (acao === 'delete') {
    novaLista = novaLista.filter(it => it.id !== itemId);
  } else if (novoItem) {
    const idx = novaLista.findIndex(it => it.id === itemId);
    if (idx >= 0) {
      novaLista[idx] = { ...novaLista[idx], ...novoItem };
    } else {
      novaLista.unshift(novoItem);
    }
  }

  bundle.itensRetidos = novaLista;
  bundle.atualizadoEm = Date.now();
  memoriaEncomendas.set(condominioId, bundle);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`${CHAVE_PREFIXO_STORAGE}${condominioId}`, JSON.stringify(bundle));
      localStorage.setItem(`infport_cache_retidos_${condominioId}`, JSON.stringify(novaLista));
    } catch {}
  }
}
