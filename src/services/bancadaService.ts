import { supabase } from './supabase';
import { salvarCacheLocal, obterCacheLocal } from './offlineStorageService';
import { registrarAtividade } from './auditoriaService';

export interface ItemBancada {
  id: string;
  condominio_id: string;
  estrutura: string; // Ex: "Torre A", "Bloco B", "Quadra 01", "Casa"
  unidade: string; // Ex: "1405", "1604", "01"
  volumes: number; // Quantidade de volumes para esta unidade (padrão: 1)
  observacao?: string; // Ex: "Caixa grande", "Envelope Mercado Livre"
  tipo_volume?: string;
  local_armazenamento?: string; // Ex: "Bancada", "Chão", "Fora"
  operador_nome?: string;
  operador_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface EstruturaResumoBancada {
  estrutura: string;
  totalVolumes: number;
  totalUnidades: number;
  itens: ItemBancada[];
}

export interface ConferenciaBancadaSnapshot {
  id: string;
  condominio_id: string;
  operador_nome: string;
  data_hora: string;
  total_volumes: number;
  total_unidades: number;
  estruturas_resumo: Array<{
    estrutura: string;
    totalVolumes: number;
    unidades: Array<{
      unidade: string;
      volumes: number;
      observacao?: string;
    }>;
  }>;
  observacoes?: string;
}

const CACHE_KEY_ITENS = 'bancada_itens_ativos';
const CACHE_KEY_HISTORICO = 'bancada_historico_conferencias';

/**
 * Notifica a aplicação inteira de alterações na bancada
 */
function notificarAtualizacaoBancada(condominioId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bancada_atualizada', {
        detail: { condominio_id: condominioId, timestamp: Date.now() }
      })
    );
  }
}

/**
 * Carrega a lista de volumes físicos ativos na bancada do condomínio
 */
export async function carregarItensBancada(condominioId: string): Promise<ItemBancada[]> {
  if (!condominioId) return [];

  // Tenta obter do cache local primeiro para resposta ultrarrápida
  const itensLocais = obterCacheLocal<ItemBancada[]>(CACHE_KEY_ITENS, condominioId, []);

  try {
    const { data, error } = await supabase
      .from('bancada_volumes')
      .select('*')
      .eq('condominio_id', condominioId)
      .eq('status', 'ativo')
      .order('estrutura', { ascending: true })
      .order('unidade', { ascending: true });

    if (!error && Array.isArray(data)) {
      salvarCacheLocal(CACHE_KEY_ITENS, data, condominioId);
      return data;
    }
  } catch {
    // Tabela remota ainda não provisionada ou conexão offline
  }

  return itensLocais;
}

/**
 * Adiciona ou incrementa um volume na bancada
 */
export async function adicionarOuIncrementarItemBancada(
  condominioId: string,
  dados: {
    estrutura: string;
    unidade: string;
    volumes?: number;
    observacao?: string;
    tipo_volume?: string;
    local_armazenamento?: string;
    operador_nome?: string;
    operador_id?: string;
  }
): Promise<{ itens: ItemBancada[]; itemAdicionado: ItemBancada; incrementou: boolean }> {
  const itensAtuais = await carregarItensBancada(condominioId);
  const estruturaNormalizada = dados.estrutura.trim();
  const unidadeNormalizada = String(dados.unidade).trim();
  const volumesAdicionar = Math.max(1, Number(dados.volumes) || 1);

  // Verifica se já existe um item para a mesma estrutura e unidade
  const indexExistente = itensAtuais.findIndex(
    it =>
      it.estrutura.toLowerCase() === estruturaNormalizada.toLowerCase() &&
      it.unidade.toLowerCase() === unidadeNormalizada.toLowerCase()
  );

  let incrementou = false;
  let itemResultado: ItemBancada;

  if (indexExistente >= 0) {
    // Incrementa os volumes existentes
    const existente = itensAtuais[indexExistente];
    const novosVolumes = existente.volumes + volumesAdicionar;
    existente.volumes = novosVolumes;
    existente.updated_at = new Date().toISOString();
    if (dados.local_armazenamento) {
      existente.local_armazenamento = dados.local_armazenamento;
    }
    if (dados.tipo_volume) {
      existente.tipo_volume = dados.tipo_volume;
    }
    if (dados.observacao) {
      existente.observacao = existente.observacao
        ? `${existente.observacao} | ${dados.observacao}`
        : dados.observacao;
    }
    itemResultado = { ...existente };
    itensAtuais[indexExistente] = itemResultado;
    incrementou = true;
  } else {
    // Cria novo item
    itemResultado = {
      id: `bancada_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      condominio_id: condominioId,
      estrutura: estruturaNormalizada,
      unidade: unidadeNormalizada,
      volumes: volumesAdicionar,
      observacao: dados.observacao?.trim() || undefined,
      tipo_volume: dados.tipo_volume?.trim() || 'Volume',
      local_armazenamento: dados.local_armazenamento?.trim() || undefined,
      operador_nome: dados.operador_nome || 'Portaria',
      operador_id: dados.operador_id,
      created_at: new Date().toISOString()
    };
    itensAtuais.push(itemResultado);
  }

  // Ordena por estrutura e unidade numericamente
  itensAtuais.sort((a, b) => {
    const compEstr = a.estrutura.localeCompare(b.estrutura, undefined, { numeric: true });
    if (compEstr !== 0) return compEstr;
    return a.unidade.localeCompare(b.unidade, undefined, { numeric: true });
  });

  // Salva no cache local
  salvarCacheLocal(CACHE_KEY_ITENS, itensAtuais, condominioId);

  // Tenta persistir no Supabase em segundo plano
  try {
    if (incrementou) {
      await supabase
        .from('bancada_volumes')
        .update({
          volumes: itemResultado.volumes,
          observacao: itemResultado.observacao,
          updated_at: itemResultado.updated_at
        })
        .eq('id', itemResultado.id);
    } else {
      await supabase
        .from('bancada_volumes')
        .insert({
          id: itemResultado.id,
          condominio_id: condominioId,
          estrutura: itemResultado.estrutura,
          unidade: itemResultado.unidade,
          volumes: itemResultado.volumes,
          observacao: itemResultado.observacao,
          tipo_volume: itemResultado.tipo_volume,
          operador_nome: itemResultado.operador_nome,
          operador_id: itemResultado.operador_id,
          status: 'ativo',
          created_at: itemResultado.created_at
        });
    }
  } catch {
    // Silencioso se offline
  }

  notificarAtualizacaoBancada(condominioId);
  return { itens: itensAtuais, itemAdicionado: itemResultado, incrementou };
}

/**
 * Atualiza um item individual na bancada (volumes, observação, etc.)
 */
export async function atualizarItemBancada(
  condominioId: string,
  itemId: string,
  updates: Partial<ItemBancada>
): Promise<ItemBancada[]> {
  const itensAtuais = await carregarItensBancada(condominioId);
  const idx = itensAtuais.findIndex(it => it.id === itemId);
  if (idx < 0) return itensAtuais;

  itensAtuais[idx] = {
    ...itensAtuais[idx],
    ...updates,
    updated_at: new Date().toISOString()
  };

  salvarCacheLocal(CACHE_KEY_ITENS, itensAtuais, condominioId);

  try {
    await supabase
      .from('bancada_volumes')
      .update({
        volumes: itensAtuais[idx].volumes,
        observacao: itensAtuais[idx].observacao,
        updated_at: itensAtuais[idx].updated_at
      })
      .eq('id', itemId);
  } catch {
    // Offline
  }

  notificarAtualizacaoBancada(condominioId);
  return itensAtuais;
}

/**
 * Dá baixa ou entrega de volume (decrementa 1 ou remove se zerar)
 */
export async function darBaixaVolumeBancada(
  condominioId: string,
  itemId: string,
  quantidade: number = 1,
  operadorNome: string = 'Portaria'
): Promise<ItemBancada[]> {
  const itensAtuais = await carregarItensBancada(condominioId);
  const idx = itensAtuais.findIndex(it => it.id === itemId);
  if (idx < 0) return itensAtuais;

  const item = itensAtuais[idx];
  const novosVolumes = Math.max(0, item.volumes - quantidade);

  if (novosVolumes <= 0) {
    // Remove o item da bancada
    itensAtuais.splice(idx, 1);
    try {
      await supabase
        .from('bancada_volumes')
        .update({ status: 'entregue', updated_at: new Date().toISOString() })
        .eq('id', itemId);
    } catch {
      // Offline
    }
  } else {
    item.volumes = novosVolumes;
    item.updated_at = new Date().toISOString();
    try {
      await supabase
        .from('bancada_volumes')
        .update({ volumes: novosVolumes, updated_at: item.updated_at })
        .eq('id', itemId);
    } catch {
      // Offline
    }
  }

  salvarCacheLocal(CACHE_KEY_ITENS, itensAtuais, condominioId);

  // Registra no histórico de auditoria
  registrarAtividade({
    condominio_id: condominioId,
    operador_nome: operadorNome,
    modulo: 'bancada',
    acao: 'baixa_volume',
    descricao: `Baixa de ${quantidade} volume(s) da bancada para ${item.estrutura} • ${item.unidade}.`,
    detalhes: { item_id: itemId, estrutura: item.estrutura, unidade: item.unidade, restantes: novosVolumes }
  }).catch(() => {});

  notificarAtualizacaoBancada(condominioId);
  return itensAtuais;
}

/**
 * Remove um item completamente da bancada (ex: lançamento por engano)
 */
export async function removerItemBancada(
  condominioId: string,
  itemId: string,
  operadorNome: string = 'Portaria'
): Promise<ItemBancada[]> {
  const itensAtuais = await carregarItensBancada(condominioId);
  const itemRemovido = itensAtuais.find(it => it.id === itemId);
  const novosItens = itensAtuais.filter(it => it.id !== itemId);

  salvarCacheLocal(CACHE_KEY_ITENS, novosItens, condominioId);

  try {
    await supabase
      .from('bancada_volumes')
      .delete()
      .eq('id', itemId);
  } catch {
    // Offline
  }

  if (itemRemovido) {
    registrarAtividade({
      condominio_id: condominioId,
      operador_nome: operadorNome,
      modulo: 'bancada',
      acao: 'remover_item',
      descricao: `Removido lançamento da bancada: ${itemRemovido.estrutura} • ${itemRemovido.unidade} (${itemRemovido.volumes} vol.).`,
      detalhes: { item_id: itemId, item: itemRemovido }
    }).catch(() => {});
  }

  notificarAtualizacaoBancada(condominioId);
  return novosItens;
}

/**
 * Salva uma conferência completa/snapshot para auditoria e histórico
 */
export async function salvarSnapshotConferencia(
  condominioId: string,
  operadorNome: string,
  observacoes?: string
): Promise<ConferenciaBancadaSnapshot> {
  const itens = await carregarItensBancada(condominioId);
  const agrupado = agruparItensPorEstrutura(itens);

  const totalVolumes = itens.reduce((acc, it) => acc + (it.volumes || 1), 0);
  const totalUnidades = itens.length;

  const snapshot: ConferenciaBancadaSnapshot = {
    id: `conf_bancada_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    condominio_id: condominioId,
    operador_nome: operadorNome,
    data_hora: new Date().toISOString(),
    total_volumes: totalVolumes,
    total_unidades: totalUnidades,
    observacoes,
    estruturas_resumo: agrupado.map(g => ({
      estrutura: g.estrutura,
      totalVolumes: g.totalVolumes,
      unidades: g.itens.map(it => ({
        unidade: it.unidade,
        volumes: it.volumes,
        observacao: it.observacao
      }))
    }))
  };

  // Salva no histórico local
  const historico = obterCacheLocal<ConferenciaBancadaSnapshot[]>(CACHE_KEY_HISTORICO, condominioId, []);
  historico.unshift(snapshot);
  // Mantém os últimos 100 snapshots
  salvarCacheLocal(CACHE_KEY_HISTORICO, historico.slice(0, 100), condominioId);

  // Tenta salvar no Supabase
  try {
    await supabase.from('bancada_conferencias').insert({
      id: snapshot.id,
      condominio_id: condominioId,
      operador_nome: operadorNome,
      data_hora: snapshot.data_hora,
      total_volumes: totalVolumes,
      total_unidades: totalUnidades,
      estruturas_resumo: snapshot.estruturas_resumo,
      observacoes
    });
  } catch {
    // Offline
  }

  // Registra no Histórico Absoluto
  registrarAtividade({
    condominio_id: condominioId,
    operador_nome: operadorNome,
    modulo: 'bancada',
    acao: 'conferencia_realizada',
    descricao: `Conferência de Bancada realizada: ${totalVolumes} volumes em ${totalUnidades} unidades sob custódia.`,
    detalhes: { snapshot_id: snapshot.id, total_volumes: totalVolumes, total_unidades: totalUnidades }
  }).catch(() => {});

  notificarAtualizacaoBancada(condominioId);
  return snapshot;
}

/**
 * Zera os itens da bancada (com snapshot de segurança antes)
 */
export async function limparBancada(
  condominioId: string,
  operadorNome: string,
  motivo?: string
): Promise<void> {
  // Salva snapshot pré-limpeza
  await salvarSnapshotConferencia(condominioId, operadorNome, `Zerar bancada: ${motivo || 'Troca de plantão / Limpeza de balcão'}`);

  salvarCacheLocal(CACHE_KEY_ITENS, [], condominioId);

  try {
    await supabase
      .from('bancada_volumes')
      .update({ status: 'finalizado', updated_at: new Date().toISOString() })
      .eq('condominio_id', condominioId)
      .eq('status', 'ativo');
  } catch {
    // Offline
  }

  registrarAtividade({
    condominio_id: condominioId,
    operador_nome: operadorNome,
    modulo: 'bancada',
    acao: 'zerar_bancada',
    descricao: `Bancada da portaria zerada/limpa. Motivo: ${motivo || 'Nova conferência'}.`,
    detalhes: { motivo }
  }).catch(() => {});

  notificarAtualizacaoBancada(condominioId);
}

/**
 * Obtém o histórico de conferências da bancada
 */
export async function obterHistoricoConferencias(condominioId: string): Promise<ConferenciaBancadaSnapshot[]> {
  const local = obterCacheLocal<ConferenciaBancadaSnapshot[]>(CACHE_KEY_HISTORICO, condominioId, []);

  try {
    const { data, error } = await supabase
      .from('bancada_conferencias')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('data_hora', { ascending: false })
      .limit(50);

    if (!error && Array.isArray(data) && data.length > 0) {
      salvarCacheLocal(CACHE_KEY_HISTORICO, data, condominioId);
      return data;
    }
  } catch {
    // Offline
  }

  return local;
}

/**
 * Agrupa itens da bancada por Torre/Bloco/Estrutura
 */
export function agruparItensPorEstrutura(itens: ItemBancada[]): EstruturaResumoBancada[] {
  const mapa = new Map<string, ItemBancada[]>();

  itens.forEach(it => {
    const estr = it.estrutura.trim() || 'Geral';
    if (!mapa.has(estr)) {
      mapa.set(estr, []);
    }
    mapa.get(estr)!.push(it);
  });

  const lista: EstruturaResumoBancada[] = [];

  mapa.forEach((itensEstrutura, estrutura) => {
    // Ordena unidades numericamente
    itensEstrutura.sort((a, b) => a.unidade.localeCompare(b.unidade, undefined, { numeric: true }));

    const totalVolumes = itensEstrutura.reduce((acc, it) => acc + (it.volumes || 1), 0);
    const totalUnidades = itensEstrutura.length;

    lista.push({
      estrutura,
      totalVolumes,
      totalUnidades,
      itens: itensEstrutura
    });
  });

  // Ordena as estruturas alfanumericamente
  return lista.sort((a, b) => a.estrutura.localeCompare(b.estrutura, undefined, { numeric: true }));
}

/**
 * Sincroniza e importa encomendas físicas retidas do Módulo 02 (encomendas_itens)
 * diretamente para a bancada automaticamente com conferência e espelhamento exato
 */
export async function sincronizarComEncomendasRetidas(
  condominioId: string,
  operadorNome: string = 'Portaria',
  espelharExato: boolean = true
): Promise<{ importados: number; totalAtual: number; itens: ItemBancada[] }> {
  if (!condominioId) return { importados: 0, totalAtual: 0, itens: [] };

  const itensAtuais = await carregarItensBancada(condominioId);

  // Busca encomendas pendentes de retirada no Módulo 02
  let encomendasRetidas: any[] = [];
  try {
    const { data, error } = await supabase
      .from('encomendas_itens')
      .select('id, bloco, unidade, observacoes, created_at')
      .eq('condominio_id', condominioId)
      .eq('status', 'retido');

    if (!error && Array.isArray(data)) {
      encomendasRetidas = data;
    }
  } catch (e) {
    console.warn('Erro ao consultar encomendas retidas para bancada:', e);
  }

  // Se não há encomendas retidas pendentes e o espelhamento exato estiver ativo, limpa a bancada
  if (encomendasRetidas.length === 0) {
    if (espelharExato && itensAtuais.length > 0) {
      try {
        await supabase
          .from('bancada_volumes')
          .update({ status: 'entregue', updated_at: new Date().toISOString() })
          .eq('condominio_id', condominioId)
          .eq('status', 'ativo');
      } catch {}
      salvarCacheLocal(CACHE_KEY_ITENS, [], condominioId);
      notificarAtualizacaoBancada(condominioId);
      return { importados: 0, totalAtual: 0, itens: [] };
    }
    return { importados: 0, totalAtual: itensAtuais.reduce((a, b) => a + (b.volumes || 1), 0), itens: itensAtuais };
  }

  // Agrupa as encomendas retidas por estrutura e unidade
  const mapaRetidas = new Map<string, { volumes: number; observacoes: string[]; estrutura: string; unidade: string }>();

  encomendasRetidas.forEach(enc => {
    const estr = (enc.bloco || 'Torre A').trim();
    const uni = String(enc.unidade || '').trim().toUpperCase();
    if (!uni) return;

    const chave = `${estr.toLowerCase()}_${uni.toLowerCase()}`;
    if (!mapaRetidas.has(chave)) {
      mapaRetidas.set(chave, {
        volumes: 0,
        observacoes: [],
        estrutura: estr,
        unidade: uni
      });
    }
    const reg = mapaRetidas.get(chave)!;
    reg.volumes += 1;
    if (enc.observacoes && !reg.observacoes.includes(enc.observacoes)) {
      reg.observacoes.push(enc.observacoes);
    }
  });

  let importadosCount = 0;
  const novosItensFinais: ItemBancada[] = [];

  // Se espelharExato for verdadeiro, desativa itens na bancada que já foram entregues
  if (espelharExato) {
    for (const itemAntigo of itensAtuais) {
      const chaveAntiga = `${itemAntigo.estrutura.toLowerCase()}_${itemAntigo.unidade.toLowerCase()}`;
      if (!mapaRetidas.has(chaveAntiga)) {
        try {
          await supabase
            .from('bancada_volumes')
            .update({ status: 'entregue', updated_at: new Date().toISOString() })
            .eq('id', itemAntigo.id);
        } catch {}
      }
    }
  }

  // Atualiza ou insere itens exatos da bancada correspondentes aos retidos
  for (const [, val] of mapaRetidas) {
    const idxExistente = itensAtuais.findIndex(
      it =>
        it.estrutura.toLowerCase() === val.estrutura.toLowerCase() &&
        it.unidade.toLowerCase() === val.unidade.toLowerCase()
    );

    if (idxExistente >= 0) {
      const itemExistente = itensAtuais[idxExistente];
      const volAnterior = itemExistente.volumes;
      itemExistente.volumes = val.volumes;
      itemExistente.updated_at = new Date().toISOString();
      if (val.observacoes.length > 0) {
        itemExistente.observacao = val.observacoes.join(' | ');
      }
      novosItensFinais.push(itemExistente);
      if (val.volumes > volAnterior) {
        importadosCount += (val.volumes - volAnterior);
      }

      try {
        await supabase
          .from('bancada_volumes')
          .update({ 
            volumes: val.volumes, 
            observacao: itemExistente.observacao, 
            status: 'ativo',
            updated_at: new Date().toISOString() 
          })
          .eq('id', itemExistente.id);
      } catch {}
    } else {
      // Novo lançamento importado do RE
      const novoItem: ItemBancada = {
        id: `bancada_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        condominio_id: condominioId,
        estrutura: val.estrutura,
        unidade: val.unidade,
        volumes: val.volumes,
        observacao: val.observacoes.length > 0 ? val.observacoes.join(' | ') : undefined,
        tipo_volume: 'Encomenda RE',
        operador_nome: operadorNome,
        created_at: new Date().toISOString()
      };
      novosItensFinais.push(novoItem);
      importadosCount += val.volumes;

      try {
        await supabase.from('bancada_volumes').insert({
          id: novoItem.id,
          condominio_id: condominioId,
          estrutura: novoItem.estrutura,
          unidade: novoItem.unidade,
          volumes: novoItem.volumes,
          observacao: novoItem.observacao,
          tipo_volume: novoItem.tipo_volume,
          operador_nome: operadorNome,
          status: 'ativo',
          created_at: novoItem.created_at
        });
      } catch {}
    }
  }

  // Ordena por estrutura e unidade
  novosItensFinais.sort((a, b) => {
    const compEstr = a.estrutura.localeCompare(b.estrutura, undefined, { numeric: true });
    if (compEstr !== 0) return compEstr;
    return a.unidade.localeCompare(b.unidade, undefined, { numeric: true });
  });

  salvarCacheLocal(CACHE_KEY_ITENS, novosItensFinais, condominioId);
  notificarAtualizacaoBancada(condominioId);

  const totalFinal = novosItensFinais.reduce((a, b) => a + (b.volumes || 1), 0);
  return { importados: importadosCount, totalAtual: totalFinal, itens: novosItensFinais };
}

/**
 * Gera texto formatado para envio no WhatsApp da portaria com o resumo detalhado da bancada
 * Formato padrão: TORRE A, TOTAL 20, 105A, 1507A...
 */
export function gerarTextoResumoBancadaWhats(
  itens: ItemBancada[],
  nomeCondominio?: string,
  nomeOperador?: string
): string {
  const agrupado = agruparItensPorEstrutura(itens);
  const totalVolumes = itens.reduce((acc, it) => acc + (it.volumes || 1), 0);
  const totalUnidades = itens.length;
  const dataHora = new Date().toLocaleString('pt-BR');

  let texto = `*📦 CONFERÊNCIA DE BANCADA (BALCÃO FÍSICO)*\n`;
  if (nomeCondominio) texto += `🏢 *${nomeCondominio}*\n`;
  texto += `🕒 Data/Hora: *${dataHora}*\n`;
  if (nomeOperador) texto += `👤 Responsável: *${nomeOperador}*\n`;
  texto += `📊 *Total na Bancada:* *${totalVolumes} volume(s)* em *${totalUnidades} unidade(s)*\n`;
  texto += `─────────────────────────\n`;

  if (agrupado.length === 0) {
    texto += `✅ *Nenhum volume físico pendente na bancada no momento.*\n`;
  } else {
    agrupado.forEach(g => {
      const listaUnidadesStr = g.itens
        .map(it => {
          const obsStr = it.observacao ? ` [${it.observacao}]` : '';
          const volStr = it.volumes > 1 ? ` (${it.volumes} vol)` : '';
          return `${it.unidade}${volStr}${obsStr}`;
        })
        .join(', ');
      texto += `\n*${g.estrutura.toUpperCase()}*, TOTAL ${g.totalVolumes}:\n`;
      texto += `↳ ${listaUnidadesStr}\n`;
    });
  }

  texto += `\n─────────────────────────\n`;
  texto += `_Conferência gerada pelo sistema INFPORT_`;
  return texto;
}

