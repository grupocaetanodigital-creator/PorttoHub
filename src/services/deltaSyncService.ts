/**
 * PorttoHub — Motor de Cache Local-First (IndexedDB), Data Pre-fetching e Delta Sync Incremental
 * 
 * ARQUITETURA DE PERFORMANCE E LARGURA DE BANDA (Supabase):
 * 1. Pre-fetching no Login (Bootstrapping): Carrega dados essenciais (unidades, moradores, encomendas ativas,
 *    veículos, custódias, bancada, chaves e regras) imediatamente após o login do operador.
 * 2. Leitura Instantânea (0ms): Telas abrem consumindo o estado local do IndexedDB e memória.
 * 3. Sincronização Incremental (Delta Sync): Consultas subsequentes buscam exclusivamente registros
 *    onde `updated_at > last_sync_timestamp` ou `created_at > last_sync_timestamp`.
 * 4. Selects Cirúrgicos: Seleciona apenas colunas necessárias, eliminando payload inútil de rede.
 * 5. Merge inteligente: Atualiza ou insere registros modificados sem rebaixar a tabela inteira.
 */

import { supabase } from './supabase';
import { isUUID } from './condominioService';
import { 
  obterTodosItensLocal, 
  salvarLoteItensLocal, 
  salvarItemLocal, 
  excluirItemLocal, 
  obterMetadataSyncLocal, 
  salvarMetadataSyncLocal,
  NomeTabelaLocal 
} from './porttoHubDb';

export interface DeltaSyncResult<T> {
  dadosAtualizados: T[];
  deltaCount: number;
  veioDoCacheLocal: boolean;
  timestampSync: string;
}

// Projeções cirúrgicas de colunas por tabela para minimizar transferência de dados
export const PROJECOES_CIRURGICAS: Record<string, string> = {
  encomendas_itens: 'id, condominio_id, lote_re_id, codigo_rastreio, transportadora, destinatario_nome, unidade_bloco, unidade, bloco, local_armazenamento, status, data_hora_recebimento, data_hora_entrega, operador_recebimento, operador_entrega, recebedor_nome, recebedor_documento, foto_etiqueta_url, created_at, updated_at',
  custodia: 'id, condominio_id, codigo_custodia, codigo, descricao, fluxo, origem_tipo, origem_unidade, origem_bloco, origem_nome_doc, origem_whats, destino_tipo, destino_unidade, destino_bloco, destino_nome_doc, destino_whats, local_armazenamento, foto_entrada_url, foto_saida_url, foto_url, status, operador_entrada, operador_saida, recebedor_nome, recebedor_doc, tipo_baixa, data_hora_entrada, data_hora_saida, observacoes, created_at, updated_at',
  moradores: 'id, condominio_id, nome, unidade, bloco, telefone, email, tipo, documento, veiculo_placa, veiculo_modelo, veiculo_cor, ativo, created_at, updated_at',
  bancada_volumes: 'id, condominio_id, codigo_volume, tipo, local, status, operador_entrada, morador_identificacao, created_at, updated_at',
  chaves: 'id, condominio_id, numero, identificacao, setor, status, responsavel_atual, telefone_responsavel, retirada_em, created_at, updated_at',
  registros_acesso: 'id, condominio_id, tipo, nome, documento, telefone, empresa, unidade_bloco, morador_responsavel, ponto_acesso_entrada, ponto_acesso_saida, veiculo_placa, veiculo_modelo, veiculo_cor, data_hora_entrada, data_hora_saida, status, operador_entrada_nome, operador_saida_nome, observacoes, created_at, updated_at'
};

// Cache quente em memória RAM para renderização síncrona sem wait
const memoriaRamPorCondominio = new Map<string, Map<string, any[]>>();

function obterCacheRam<T>(tabela: string, condominioId: string): T[] | null {
  const mapaCondo = memoriaRamPorCondominio.get(condominioId);
  if (!mapaCondo) return null;
  const lista = mapaCondo.get(tabela);
  return (lista as T[]) || null;
}

function salvarCacheRam<T>(tabela: string, condominioId: string, dados: T[]): void {
  let mapaCondo = memoriaRamPorCondominio.get(condominioId);
  if (!mapaCondo) {
    mapaCondo = new Map();
    memoriaRamPorCondominio.set(condominioId, mapaCondo);
  }
  mapaCondo.set(tabela, dados);
}

/**
 * Lê os dados da tabela diretamente do cache local (Memória RAM -> IndexedDB) em 0ms
 */
export async function obterDadosTabelaLocal<T = any>(
  tabela: NomeTabelaLocal,
  condominioId: string
): Promise<T[]> {
  // 1. Tenta memória RAM (0.0ms síncrono)
  const ram = obterCacheRam<T>(tabela, condominioId);
  if (ram && ram.length > 0) {
    return ram;
  }

  // 2. Lê do IndexedDB (assíncrono ultrarrápido)
  const doBancoLocal = await obterTodosItensLocal<T>(tabela, condominioId);
  if (doBancoLocal && doBancoLocal.length > 0) {
    salvarCacheRam(tabela, condominioId, doBancoLocal);
    return doBancoLocal;
  }

  return [];
}

/**
 * PRE-FETCHING COMPLETO DE DADOS NO LOGIN (BOOTSTRAPPING MULTI-TENANT)
 * Executado assincronamente assim que o operador valida a sessão e o condomínio ativo é resolvido.
 */
export async function preCarregarDadosCondominio(condominioId: string): Promise<void> {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    return;
  }

  const agoraTimestamp = new Date().toISOString();

  try {
    console.log(`[LocalFirst] Iniciando bootstrapping completo para condomínio ${condominioId}...`);

    // Dispara consultas cirúrgicas paralelas em 1 único roundtrip
    const [
      encRes, 
      custRes, 
      morRes, 
      bancadaRes, 
      chavesRes,
      acessosRes
    ] = await Promise.all([
      // 1. Encomendas retidas e recentes
      supabase
        .from('encomendas_itens')
        .select(PROJECOES_CIRURGICAS.encomendas_itens || '*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false })
        .limit(350),

      // 2. Custódia de pertences
      supabase
        .from('custodia')
        .select(PROJECOES_CIRURGICAS.custodia || '*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false })
        .limit(200),

      // 3. Moradores e Unidades
      supabase
        .from('moradores')
        .select(PROJECOES_CIRURGICAS.moradores || '*')
        .eq('condominio_id', condominioId)
        .order('unidade', { ascending: true }),

      // 4. Bancada e balcão físico
      supabase
        .from('bancada_volumes')
        .select(PROJECOES_CIRURGICAS.bancada_volumes || '*')
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false }),

      // 5. Claviculário / Chaves
      supabase
        .from('chaves')
        .select(PROJECOES_CIRURGICAS.chaves || '*')
        .eq('condominio_id', condominioId)
        .order('numero', { ascending: true }),

      // 6. Registros de Acesso Recentes
      supabase
        .from('registros_acesso')
        .select(PROJECOES_CIRURGICAS.registros_acesso || '*')
        .eq('condominio_id', condominioId)
        .order('data_hora_entrada', { ascending: false })
        .limit(100)
    ]);

    // Grava de forma atômica no IndexedDB
    const promisesGravacao: Promise<any>[] = [];

    if (encRes.data) {
      salvarCacheRam('encomendas_itens', condominioId, encRes.data);
      promisesGravacao.push(salvarLoteItensLocal('encomendas_itens', encRes.data, condominioId, agoraTimestamp, true));
    }
    if (custRes.data) {
      salvarCacheRam('custodia', condominioId, custRes.data);
      promisesGravacao.push(salvarLoteItensLocal('custodia', custRes.data, condominioId, agoraTimestamp, true));
    }
    if (morRes.data) {
      salvarCacheRam('moradores', condominioId, morRes.data);
      promisesGravacao.push(salvarLoteItensLocal('moradores', morRes.data, condominioId, agoraTimestamp, true));

      // Extrai e indexa veículos a partir dos moradores
      const veiculosExtraidos = morRes.data
        .filter((m: any) => m.veiculo_placa && m.veiculo_placa.trim().length > 0)
        .map((m: any) => ({
          id: `veic_${m.id}`,
          condominio_id: condominioId,
          placa: m.veiculo_placa.toUpperCase().trim(),
          modelo: m.veiculo_modelo || '',
          cor: m.veiculo_cor || '',
          unidade_bloco: `${m.bloco ? `BL ${m.bloco} - ` : ''}AP ${m.unidade || ''}`.trim(),
          proprietario_nome: m.nome,
          proprietario_id: m.id,
          updated_at: m.updated_at || agoraTimestamp
        }));

      if (veiculosExtraidos.length > 0) {
        salvarCacheRam('veiculos', condominioId, veiculosExtraidos);
        promisesGravacao.push(salvarLoteItensLocal('veiculos', veiculosExtraidos, condominioId, agoraTimestamp, true));
      }
    }
    if (bancadaRes.data) {
      salvarCacheRam('bancada_volumes', condominioId, bancadaRes.data);
      promisesGravacao.push(salvarLoteItensLocal('bancada_volumes', bancadaRes.data, condominioId, agoraTimestamp, true));
    }
    if (chavesRes.data) {
      salvarCacheRam('chaves', condominioId, chavesRes.data);
      promisesGravacao.push(salvarLoteItensLocal('chaves', chavesRes.data, condominioId, agoraTimestamp, true));
    }
    if (acessosRes.data) {
      salvarCacheRam('registros_acesso', condominioId, acessosRes.data);
      promisesGravacao.push(salvarLoteItensLocal('registros_acesso', acessosRes.data, condominioId, agoraTimestamp, true));
    }

    await Promise.all(promisesGravacao);

    console.log(`[LocalFirst] Bootstrapping no IndexedDB concluído com sucesso. Estado offline pronto para operação imediata.`);
    window.dispatchEvent(new CustomEvent('porttohub_dados_precarregados', { detail: { condominioId } }));
  } catch (err) {
    console.warn('[LocalFirst] Falha durante bootstrapping:', err);
  }
}

/**
 * DELTA SYNC INCREMENTAL (Verificação em Milissegundos)
 * 
 * - Lê imediatamente do IndexedDB / RAM (0ms).
 * - Envia checagem ultraleve ao Supabase: `updated_at > cursor OR created_at > cursor`
 * - Faz merge inteligente dos registros novos/modificados no IndexedDB e na RAM.
 */
export async function sincronizarDeltaTabela<T extends { id: string | number; updated_at?: string; created_at?: string }>(
  tabela: NomeTabelaLocal,
  condominioId: string,
  colunaChaveId: string = 'id'
): Promise<DeltaSyncResult<T>> {
  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    const dadosLocais = await obterDadosTabelaLocal<T>(tabela, condominioId);
    return { dadosAtualizados: dadosLocais, deltaCount: 0, veioDoCacheLocal: true, timestampSync: new Date().toISOString() };
  }

  // 1. Lê os dados existentes localmente
  const dadosLocais = await obterDadosTabelaLocal<T>(tabela, condominioId);
  const metadata = await obterMetadataSyncLocal(tabela, condominioId);

  // Se não houver dados locais nem cursor, faz carga inicial completa cirúrgica
  if (!metadata || !metadata.lastSyncTimestamp || dadosLocais.length === 0) {
    try {
      const colunas = PROJECOES_CIRURGICAS[tabela] || '*';
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .eq('condominio_id', condominioId)
        .order('created_at', { ascending: false })
        .limit(400);

      if (!error && data) {
        const agora = new Date().toISOString();
        salvarCacheRam(tabela, condominioId, data);
        await salvarLoteItensLocal(tabela, data, condominioId, agora, true);
        return {
          dadosAtualizados: data,
          deltaCount: data.length,
          veioDoCacheLocal: false,
          timestampSync: agora
        };
      }
    } catch (e) {
      console.warn(`[DeltaSync] Erro na carga inicial de ${tabela}:`, e);
    }
    return {
      dadosAtualizados: dadosLocais,
      deltaCount: 0,
      veioDoCacheLocal: true,
      timestampSync: metadata?.lastSyncTimestamp || new Date().toISOString()
    };
  }

  // 2. Consulta cirúrgica por Delta: Apenas registros modificados após o cursor
  const cursorTimestamp = metadata.lastSyncTimestamp;
  const novoCursor = new Date().toISOString();
  const colunas = PROJECOES_CIRURGICAS[tabela] || '*';

  try {
    const { data: deltaData, error } = await supabase
      .from(tabela)
      .select(colunas)
      .eq('condominio_id', condominioId)
      .or(`updated_at.gt.${cursorTimestamp},created_at.gt.${cursorTimestamp}`);

    if (error) {
      console.warn(`[DeltaSync] Falha na busca delta de ${tabela}:`, error.message);
      return {
        dadosAtualizados: dadosLocais,
        deltaCount: 0,
        veioDoCacheLocal: true,
        timestampSync: cursorTimestamp
      };
    }

    if (!deltaData || deltaData.length === 0) {
      // 0 alterações remotas: Atualiza apenas o timestamp de verificação
      await salvarMetadataSyncLocal(tabela, condominioId, novoCursor, dadosLocais.length);
      return {
        dadosAtualizados: dadosLocais,
        deltaCount: 0,
        veioDoCacheLocal: true,
        timestampSync: novoCursor
      };
    }

    // 3. Merge inteligente: Substitui registros atualizados e insere novos
    const mapaItens = new Map<string, T>();
    dadosLocais.forEach((it: any) => mapaItens.set(String(it[colunaChaveId]), it));

    deltaData.forEach((deltaItem: any) => {
      mapaItens.set(String(deltaItem[colunaChaveId]), deltaItem);
    });

    const listaConsolidada = Array.from(mapaItens.values());

    // Atualiza RAM e IndexedDB
    salvarCacheRam(tabela, condominioId, listaConsolidada);
    await salvarLoteItensLocal(tabela, deltaData, condominioId, novoCursor, false);

    console.log(`[DeltaSync] ${deltaData.length} registro(s) sincronizado(s) em ${tabela} via Delta Sync.`);
    window.dispatchEvent(new CustomEvent(`porttohub_delta_${tabela}`, {
      detail: { tabela, condominioId, alterados: deltaData.length }
    }));

    return {
      dadosAtualizados: listaConsolidada,
      deltaCount: deltaData.length,
      veioDoCacheLocal: false,
      timestampSync: novoCursor
    };
  } catch (err) {
    console.warn(`[DeltaSync] Exceção em sincronizarDeltaTabela para ${tabela}:`, err);
    return {
      dadosAtualizados: dadosLocais,
      deltaCount: 0,
      veioDoCacheLocal: true,
      timestampSync: cursorTimestamp
    };
  }
}

/**
 * Atualiza um único item diretamente no cache local e dispara reatividade na UI
 */
export async function aplicarMutacaoLocal<T extends { id: any; condominio_id?: string }>(
  tabela: NomeTabelaLocal,
  condominioId: string,
  item: T,
  tipo: 'INSERT' | 'UPDATE' | 'DELETE'
): Promise<void> {
  const chaveId = String(item.id);
  const itensAtuais = await obterDadosTabelaLocal<T>(tabela, condominioId);

  let novaLista: T[] = [];
  if (tipo === 'DELETE') {
    novaLista = itensAtuais.filter((it: any) => String(it.id) !== chaveId);
    await excluirItemLocal(tabela, item.id);
  } else {
    const idx = itensAtuais.findIndex((it: any) => String(it.id) === chaveId);
    if (idx >= 0) {
      novaLista = [...itensAtuais];
      novaLista[idx] = { ...novaLista[idx], ...item };
    } else {
      novaLista = [item, ...itensAtuais];
    }
    await salvarItemLocal(tabela, item);
  }

  salvarCacheRam(tabela, condominioId, novaLista);

  window.dispatchEvent(new CustomEvent(`porttohub_local_mutate_${tabela}`, {
    detail: { tabela, condominioId, tipo, item }
  }));
}
