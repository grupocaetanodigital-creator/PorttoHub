/**
 * PorttoHub — Motor de Cache Local, Data Pre-fetching e Delta Sync Incremental
 * 
 * ARQUITETURA DE PERFORMANCE E LARGURA DE BANDA (Supabase):
 * 1. Pre-fetching no Login: Carrega dados essenciais (encomendas, custódias, moradores, bancada, chaves)
 *    imediatamente após a validação da sessão do operador.
 * 2. Leitura Síncrona / Instantânea (0ms): Telas abrem consumindo o estado local do cache.
 * 3. Sincronização Incremental (Delta Sync): Consultas subsequentes buscam exclusivamente registros
 *    onde `updated_at > last_sync_timestamp` ou `created_at > last_sync_timestamp`.
 * 4. Merge inteligente: Atualiza ou insere registros modificados sem rebaixar a tabela inteira.
 */

import { supabase } from './supabase';
import { isUUID } from './condominioService';

export interface DeltaCacheMetadata<T> {
  lastSyncTimestamp: string;
  condominioId: string;
  total: number;
  dados: T[];
}

const PREFIX_DELTA_CACHE = 'porttohub_delta_cache_';
const TABELAS_CORE = [
  'encomendas_itens',
  'custodia',
  'moradores',
  'bancada_volumes',
  'chaves'
] as const;

type TabelaCore = typeof TABELAS_CORE[number];

/**
 * Retorna a chave de armazenamento local de uma tabela e condomínio
 */
function obterChaveCache(tabela: string, condominioId: string): string {
  return `${PREFIX_DELTA_CACHE}${tabela}_${condominioId}`;
}

/**
 * Lê o estado em cache local de forma instantânea (0ms)
 */
export function lerCacheLocalTabela<T>(tabela: string, condominioId: string): DeltaCacheMetadata<T> | null {
  try {
    const raw = localStorage.getItem(obterChaveCache(tabela, condominioId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.dados)) {
      return parsed as DeltaCacheMetadata<T>;
    }
  } catch (e) {
    console.warn(`[DeltaSync] Erro ao ler cache de ${tabela}:`, e);
  }
  return null;
}

/**
 * Grava o estado consolidado no cache local com o timestamp do cursor de sincronização
 */
export function salvarCacheLocalTabela<T>(
  tabela: string,
  condominioId: string,
  dados: T[],
  lastSyncTimestamp: string = new Date().toISOString()
): void {
  try {
    const payload: DeltaCacheMetadata<T> = {
      lastSyncTimestamp,
      condominioId,
      total: dados.length,
      dados
    };
    localStorage.setItem(obterChaveCache(tabela, condominioId), JSON.stringify(payload));
  } catch (e) {
    console.warn(`[DeltaSync] Erro ao gravar cache de ${tabela}:`, e);
  }
}

/**
 * PRE-FETCHING COMPLETO DE DADOS NO LOGIN
 * Executa requisições em paralelo no login bem-sucedido e popula o cache local.
 */
export async function preCarregarDadosCondominio(condominioId: string): Promise<void> {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    return;
  }

  const agoraTimestamp = new Date().toISOString();

  try {
    console.log(`[DeltaSync] Iniciando pré-carregamento dos dados core para condomínio ${condominioId}...`);

    const [encRes, custRes, morRes, bancadaRes, chavesRes] = await Promise.all([
      // 1. Encomendas retidas e recentes
      supabase
        .from('encomendas_itens')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false })
        .limit(300),

      // 2. Custódia de pertences
      supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false })
        .limit(200),

      // 3. Moradores e Unidades
      supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('unidade', { ascending: true }),

      // 4. Bancada e balcão físico
      supabase
        .from('bancada_volumes')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false }),

      // 5. Claviculário / Chaves
      supabase
        .from('chaves')
        .select('*')
        .eq('condominio_id', condominioId)
        .order('numero', { ascending: true })
    ]);

    if (encRes.data) salvarCacheLocalTabela('encomendas_itens', condominioId, encRes.data, agoraTimestamp);
    if (custRes.data) salvarCacheLocalTabela('custodia', condominioId, custRes.data, agoraTimestamp);
    if (morRes.data) salvarCacheLocalTabela('moradores', condominioId, morRes.data, agoraTimestamp);
    if (bancadaRes.data) salvarCacheLocalTabela('bancada_volumes', condominioId, bancadaRes.data, agoraTimestamp);
    if (chavesRes.data) salvarCacheLocalTabela('chaves', condominioId, chavesRes.data, agoraTimestamp);

    console.log(`[DeltaSync] Pré-carregamento concluído com sucesso. Estado offline pronto.`);
    window.dispatchEvent(new CustomEvent('porttohub_dados_precarregados', { detail: { condominioId } }));
  } catch (err) {
    console.warn('[DeltaSync] Falha durante pré-carregamento:', err);
  }
}

/**
 * DELTA SYNC INCREMENTAL
 * Busca apenas itens alterados desde o último cursor de sincronização e faz merge no cache local
 */
export async function sincronizarDeltaTabela<T extends { id: string | number; updated_at?: string; created_at?: string }>(
  tabela: TabelaCore | string,
  condominioId: string,
  colunaChaveId: string = 'id'
): Promise<{ dadosAtualizados: T[]; deltaCount: number }> {
  const cacheAtual = lerCacheLocalTabela<T>(tabela, condominioId);

  // Se não existir cache local prévio, faz carga inicial completa
  if (!cacheAtual || !cacheAtual.lastSyncTimestamp) {
    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        salvarCacheLocalTabela(tabela, condominioId, data);
        return { dadosAtualizados: data, deltaCount: data.length };
      }
    } catch (e) {
      console.warn(`[DeltaSync] Erro na carga inicial de ${tabela}:`, e);
    }
    return { dadosAtualizados: cacheAtual?.dados || [], deltaCount: 0 };
  }

  // Busca delta incremental: registros atualizados após o cursor
  const cursorTimestamp = cacheAtual.lastSyncTimestamp;
  const novoCursor = new Date().toISOString();

  try {
    const { data: deltaData, error } = await supabase
      .from(tabela)
      .select('*')
      .eq('condominio_id', condominioId)
      .or(`updated_at.gt.${cursorTimestamp},created_at.gt.${cursorTimestamp}`);

    if (error) {
      console.warn(`[DeltaSync] Erro ao buscar delta de ${tabela}:`, error);
      return { dadosAtualizados: cacheAtual.dados, deltaCount: 0 };
    }

    if (!deltaData || deltaData.length === 0) {
      // Nenhum dado modificado: atualiza apenas o timestamp de verificação
      salvarCacheLocalTabela(tabela, condominioId, cacheAtual.dados, novoCursor);
      return { dadosAtualizados: cacheAtual.dados, deltaCount: 0 };
    }

    // Merge inteligente: substitui modificados e adiciona novos
    const mapaItens = new Map<string, T>();
    cacheAtual.dados.forEach((it: any) => mapaItens.set(String(it[colunaChaveId]), it));

    deltaData.forEach((deltaItem: any) => {
      mapaItens.set(String(deltaItem[colunaChaveId]), deltaItem);
    });

    const listaConsolidada = Array.from(mapaItens.values());
    salvarCacheLocalTabela(tabela, condominioId, listaConsolidada, novoCursor);

    console.log(`[DeltaSync] ${deltaData.length} alteração(ões) incorporada(s) em ${tabela}.`);
    window.dispatchEvent(new CustomEvent(`porttohub_delta_${tabela}`, {
      detail: { tabela, condominioId, alterados: deltaData.length }
    }));

    return { dadosAtualizados: listaConsolidada, deltaCount: deltaData.length };
  } catch (err) {
    console.warn(`[DeltaSync] Exceção em sincronizarDeltaTabela para ${tabela}:`, err);
    return { dadosAtualizados: cacheAtual.dados, deltaCount: 0 };
  }
}
