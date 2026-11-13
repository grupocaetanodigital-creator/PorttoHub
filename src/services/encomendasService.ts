/**
 * PorttoHub — Serviço de Cache Permanente, Validação Estrita de Destinatário e Sincronização de Encomendas
 *
 * REGRAS CRÍTICAS DE INTEGRIDADE DE DESTINATÁRIO:
 * 1. O morador é sempre identificado pelo ID único do cadastro (morador_id).
 * 2. Nunca associa automaticamente um morador apenas pelo número da unidade.
 * 3. Seleção automática só é permitida quando há exatamente 1 morador na unidade/bloco/condomínio.
 * 4. Com múltiplos moradores na unidade, exige escolha explícita antes da gravação no Supabase.
 * 5. Preserva o morador_id original de registros históricos sem sobrescrever nem inventar associação.
 */

import { supabase } from './supabase';
import { cachedQuery, invalidarCacheTabela } from './redisCacheService';
import {
  isUUID,
  getCondominioConfigLocal,
  isEstruturaNumeralDireto,
  saoUnidadesEquivalentes,
  saoBlocosEquivalentes
} from './condominioService';
import { salvarLoteItensLocal, obterTodosItensLocal } from './porttoHubDb';
import { aplicarMutacaoLocal } from './deltaSyncService';
import { enfileirarAcaoOffline } from './offlineSyncEngine';

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

export interface ValidacaoDestinatarioInput {
  condominioId: string;
  bloco?: string | null;
  unidade: string;
  moradorId?: string | null;
  moradoresCondominio?: any[];
  tipoEstrutura?: string;
  consultarSupabaseSeOnline?: boolean;
}

export interface ValidacaoDestinatarioResultado {
  valido: boolean;
  erro?: string;
  moradorId: string | null;
  morador: any | null;
  moradoresDaUnidade: any[];
}

const CHAVE_PREFIXO_STORAGE_LEGADO = 'infport_cache_encomendas_bundle_v2_';
const CHAVE_PREFIXO_STORAGE = 'infport_cache_encomendas_bundle_v3_';
const TTL_CACHE_MS = 3 * 60 * 1000; // 3 minutos de validade antes de revalidação em background

// Armazenamento em memória RAM global no navegador (acesso instantâneo em 0ms)
const memoriaEncomendas = new Map<string, EncomendasCacheBundle>();

// Mapa de promessas ativas para evitar requisições concorrentes duplicadas
const promessasCarregamento = new Map<string, Promise<EncomendasCacheBundle>>();

// Canal Realtime para escuta de alterações nas tabelas de encomendas
let canalRealtimeEncomendas: any = null;
let condominoMonitoradoId: string = '';

function resolverTipoEstrutura(condominioId?: string, tipoEstruturaExplicito?: string): string | undefined {
  if (tipoEstruturaExplicito) return tipoEstruturaExplicito;
  if (!condominioId) return undefined;
  return getCondominioConfigLocal(condominioId)?.tipo_estrutura;
}

function ehEstruturaCasasExplicita(tipoEstrutura?: string): boolean {
  return Boolean(tipoEstrutura && tipoEstrutura.toLowerCase().includes('casa'));
}

/**
 * Verifica com rigor se um registro de morador pertence exatamente ao condomínio, bloco e unidade informados.
 */
export function moradorPertenceAUnidade(
  morador: any,
  condominioId: string,
  bloco: string | null | undefined,
  unidade: string | null | undefined,
  tipoEstrutura?: string
): boolean {
  if (!morador || !morador.id) return false;
  if (!condominioId || condominioId === 'todos' || condominioId === 'global') return false;
  if (!unidade || !String(unidade).trim()) return false;

  if (morador.condominio_id && String(morador.condominio_id).trim() !== String(condominioId).trim()) {
    return false;
  }

  if (!saoUnidadesEquivalentes(morador.unidade, unidade)) {
    return false;
  }

  const tipoResolvido = resolverTipoEstrutura(condominioId, tipoEstrutura);
  return saoBlocosEquivalentes(morador.bloco, bloco, tipoResolvido);
}

/**
 * Busca moradores cadastrados que pertencem estritamente ao condomínio, bloco e unidade informados.
 * Em condomínios de blocos/torres, exige bloco preenchido para evitar cruzamento entre blocos diferentes.
 */
export function buscarMoradoresDaUnidadeExata(
  moradores: any[],
  condominioId: string,
  bloco: string | null | undefined,
  unidade: string | null | undefined,
  tipoEstrutura?: string
): any[] {
  if (!Array.isArray(moradores) || moradores.length === 0) return [];
  if (!condominioId || condominioId === 'todos' || condominioId === 'global') return [];
  if (!unidade || !String(unidade).trim()) return [];

  const tipoResolvido = resolverTipoEstrutura(condominioId, tipoEstrutura);
  const eCasas = ehEstruturaCasasExplicita(tipoResolvido);
  const eNumeral = Boolean(tipoResolvido && isEstruturaNumeralDireto(tipoResolvido));
  const blocoLimpo = String(bloco || '').trim();

  if (!eCasas && !eNumeral && !blocoLimpo) {
    return [];
  }

  return moradores.filter((m) =>
    moradorPertenceAUnidade(m, condominioId, eCasas ? (blocoLimpo || 'Casa') : blocoLimpo, unidade, tipoResolvido)
  );
}

/**
 * Enriquece um item de encomenda exclusivamente pelo `morador_id` único.
 * Nunca associa um morador por fallback de número de unidade e preserva `morador_id` original.
 */
export function enriquecerEncomendaComMorador(
  item: any,
  listaMoradores: any[],
  listaLotes: any[] = [],
  tipoEstrutura?: string
): any {
  const condoItem = item?.condominio_id || '';
  const tipoResolvido = resolverTipoEstrutura(condoItem, tipoEstrutura);
  const moradorIdOriginal = item?.morador_id ?? null;

  let moradorEnriquecido: any = null;

  if (moradorIdOriginal) {
    const encontradoPorId = (listaMoradores || []).find(
      (mor: any) =>
        mor &&
        mor.id &&
        String(mor.id) === String(moradorIdOriginal) &&
        (!mor.condominio_id || !condoItem || String(mor.condominio_id) === String(condoItem))
    );

    if (encontradoPorId) {
      if (moradorPertenceAUnidade(encontradoPorId, condoItem, item.bloco, item.unidade, tipoResolvido)) {
        moradorEnriquecido = {
          id: encontradoPorId.id,
          nome: encontradoPorId.nome,
          telefone: encontradoPorId.telefone,
          bloco: encontradoPorId.bloco,
          unidade: encontradoPorId.unidade
        };
      }
    } else if (item.moradores && item.moradores.nome) {
      const candidatoJoin = {
        ...item.moradores,
        id: moradorIdOriginal,
        condominio_id: condoItem
      };
      if (moradorPertenceAUnidade(candidatoJoin, condoItem, item.bloco, item.unidade, tipoResolvido)) {
        moradorEnriquecido = {
          id: moradorIdOriginal,
          nome: item.moradores.nome,
          telefone: item.moradores.telefone,
          bloco: item.moradores.bloco,
          unidade: item.moradores.unidade
        };
      }
    }
  }

  const lote = item?.lote_re_id
    ? (listaLotes || []).find((lt: any) => lt.id === item.lote_re_id)
    : null;

  return {
    ...item,
    morador_id: moradorIdOriginal,
    codigo_barras: item.codigo_barras || item.codigo_rastreio || '',
    codigo_rastreio: item.codigo_rastreio || item.codigo_barras || '',
    foto_etiqueta: item.foto_etiqueta || item.foto_etiqueta_url || '',
    operador_baixa: item.operador_baixa || item.operador_baixa_nome || '',
    moradores: moradorEnriquecido,
    lotes_re: lote ? { operador_id: lote.operador_id, codigo_re: lote.codigo_re } : (item.lotes_re || null)
  };
}

/**
 * Carrega moradores autoritativos do condomínio (Supabase quando online, ou cache local/IndexedDB quando offline).
 */
async function obterMoradoresAutoritativosCondominio(
  condominioId: string,
  moradoresEmMemoria: any[] = [],
  consultarSupabaseSeOnline: boolean = true
): Promise<any[]> {
  const estaOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  if (consultarSupabaseSeOnline && estaOnline && isUUID(condominioId)) {
    try {
      const { data, error } = await supabase
        .from('moradores')
        .select('id, condominio_id, nome, bloco, unidade, telefone, status_acesso')
        .eq('condominio_id', condominioId)
        .order('nome', { ascending: true });

      if (!error && Array.isArray(data)) {
        const bundleAtual = memoriaEncomendas.get(condominioId);
        if (bundleAtual) {
          bundleAtual.moradores = data;
          memoriaEncomendas.set(condominioId, bundleAtual);
        }
        return data;
      }
    } catch (err) {
      console.warn('[encomendasService] Falha ao consultar moradores no Supabase, usando cache local:', err);
    }
  }

  if (Array.isArray(moradoresEmMemoria) && moradoresEmMemoria.length > 0) {
    return moradoresEmMemoria.filter((m) => !m.condominio_id || String(m.condominio_id) === String(condominioId));
  }

  const cacheBundle = obterCacheEncomendas(condominioId);
  if (cacheBundle.moradores && cacheBundle.moradores.length > 0) {
    return cacheBundle.moradores;
  }

  try {
    const locais = await obterTodosItensLocal<any>('moradores', condominioId);
    if (Array.isArray(locais) && locais.length > 0) {
      return locais;
    }
  } catch {}

  return [];
}

/**
 * Validação obrigatória antes de qualquer gravação no Supabase (ou fila offline).
 * Garante correspondência exata de condomínio, bloco, unidade e ID único do morador.
 */
export async function validarDestinatarioAntesGravacao(
  input: ValidacaoDestinatarioInput
): Promise<ValidacaoDestinatarioResultado> {
  const {
    condominioId,
    bloco,
    unidade,
    moradorId,
    moradoresCondominio = [],
    tipoEstrutura,
    consultarSupabaseSeOnline = true
  } = input;

  if (!condominioId || condominioId === 'todos' || condominioId === 'global' || !isUUID(condominioId)) {
    return {
      valido: false,
      erro: 'Condomínio ativo inválido para gravação da encomenda.',
      moradorId: null,
      morador: null,
      moradoresDaUnidade: []
    };
  }

  const unidadeLimpa = String(unidade || '').trim();
  if (!unidadeLimpa) {
    return {
      valido: false,
      erro: 'Informe o número da unidade antes de salvar a encomenda.',
      moradorId: null,
      morador: null,
      moradoresDaUnidade: []
    };
  }

  const tipoResolvido = resolverTipoEstrutura(condominioId, tipoEstrutura);
  const eCasas = ehEstruturaCasasExplicita(tipoResolvido);
  const eNumeral = Boolean(tipoResolvido && isEstruturaNumeralDireto(tipoResolvido));
  const blocoLimpo = eCasas ? 'Casa' : String(bloco || '').trim();

  if (!eCasas && !eNumeral && !blocoLimpo) {
    return {
      valido: false,
      erro: 'Selecione o bloco/torre da unidade antes de registrar a encomenda.',
      moradorId: null,
      morador: null,
      moradoresDaUnidade: []
    };
  }

  const listaMoradores = await obterMoradoresAutoritativosCondominio(
    condominioId,
    moradoresCondominio,
    consultarSupabaseSeOnline
  );

  const moradoresDaUnidade = buscarMoradoresDaUnidadeExata(
    listaMoradores,
    condominioId,
    blocoLimpo,
    unidadeLimpa,
    tipoResolvido
  );

  const moradorIdLimpo = moradorId ? String(moradorId).trim() : '';

  if (moradorIdLimpo) {
    const moradorEncontrado = listaMoradores.find((m) => String(m.id) === moradorIdLimpo) || null;

    if (!moradorEncontrado) {
      return {
        valido: false,
        erro: 'O morador selecionado não foi encontrado no cadastro deste condomínio.',
        moradorId: null,
        morador: null,
        moradoresDaUnidade
      };
    }

    if (!moradorPertenceAUnidade(moradorEncontrado, condominioId, blocoLimpo, unidadeLimpa, tipoResolvido)) {
      const origemMorador = [moradorEncontrado.bloco, moradorEncontrado.unidade].filter(Boolean).join(' - ') || 'outra unidade';
      return {
        valido: false,
        erro: `Inconsistência bloqueada: o morador "${moradorEncontrado.nome}" está cadastrado em ${origemMorador}, não na unidade ${blocoLimpo ? blocoLimpo + ' - ' : ''}${unidadeLimpa}.`,
        moradorId: null,
        morador: null,
        moradoresDaUnidade
      };
    }

    return {
      valido: true,
      moradorId: moradorEncontrado.id,
      morador: moradorEncontrado,
      moradoresDaUnidade
    };
  }

  // Nenhum moradorId foi informado
  if (moradoresDaUnidade.length > 1) {
    return {
      valido: false,
      erro: `Esta unidade possui ${moradoresDaUnidade.length} moradores cadastrados. Selecione explicitamente o destinatário de cada pacote.`,
      moradorId: null,
      morador: null,
      moradoresDaUnidade
    };
  }

  if (moradoresDaUnidade.length === 1) {
    return {
      valido: true,
      moradorId: moradoresDaUnidade[0].id,
      morador: moradoresDaUnidade[0],
      moradoresDaUnidade
    };
  }

  // Unidade sem nenhum morador cadastrado: grava sem inventar associação
  return {
    valido: true,
    moradorId: null,
    morador: null,
    moradoresDaUnidade: []
  };
}

/**
 * Valida todo o lote de pacotes e executa a inserção segura no Supabase (ou fila offline).
 */
export async function inserirEncomendasValidadas(
  pacotes: any[],
  opcoes: {
    condominioId: string;
    moradoresCondominio?: any[];
    tipoEstrutura?: string;
    localArmazenamento?: string;
    operadorNome?: string;
  }
): Promise<{ data: any[]; offline: boolean; destinatariosValidados: ValidacaoDestinatarioResultado[] }> {
  if (!Array.isArray(pacotes) || pacotes.length === 0) {
    throw new Error('Nenhum pacote informado para gravação.');
  }

  const { condominioId, moradoresCondominio = [], tipoEstrutura, localArmazenamento } = opcoes;
  const moradoresAutoritativos = await obterMoradoresAutoritativosCondominio(condominioId, moradoresCondominio, true);

  const validacoes: ValidacaoDestinatarioResultado[] = [];
  const payloadsValidados: any[] = [];

  for (let i = 0; i < pacotes.length; i++) {
    const pkt = pacotes[i];
    if (pkt.condominio_id && String(pkt.condominio_id) !== String(condominioId)) {
      throw new Error(`Pacote #${i + 1}: condomínio divergente do condomínio ativo.`);
    }

    const resVal = await validarDestinatarioAntesGravacao({
      condominioId,
      bloco: pkt.bloco,
      unidade: pkt.unidade,
      moradorId: pkt.morador_id,
      moradoresCondominio: moradoresAutoritativos,
      tipoEstrutura,
      consultarSupabaseSeOnline: false
    });

    if (!resVal.valido) {
      throw new Error(pacotes.length > 1 ? `Pacote #${i + 1}: ${resVal.erro}` : resVal.erro);
    }

    validacoes.push(resVal);
    payloadsValidados.push({
      ...pkt,
      condominio_id: condominioId,
      morador_id: resVal.moradorId,
      destinatario: resVal.morador?.nome || null
    });
  }

  const estaOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const localFinal = localArmazenamento || payloadsValidados[0]?.local_armazenamento || 'Bancada Principal';

  if (estaOnline) {
    try {
      let { data: itensInseridos, error: itemErr } = await supabase
        .from('encomendas_itens')
        .insert(payloadsValidados)
        .select();

      if (
        itemErr &&
        (itemErr.message?.includes('local_armazenamento') ||
          itemErr.message?.includes('destinatario') ||
          (itemErr as any).code === '42703' ||
          itemErr.message?.includes('schema cache'))
      ) {
        const compatPayloads = payloadsValidados.map(({ local_armazenamento, destinatario, ...rest }) => {
          if (itemErr?.message?.includes('destinatario') && !itemErr?.message?.includes('local_armazenamento')) {
            return { ...rest, local_armazenamento };
          }
          if (itemErr?.message?.includes('local_armazenamento') && !itemErr?.message?.includes('destinatario')) {
            return { ...rest, destinatario };
          }
          return rest;
        });
        const retry = await supabase.from('encomendas_itens').insert(compatPayloads).select();
        itemErr = retry.error;
        itensInseridos = retry.data;
      }

      if (itemErr) {
        const msg = String(itemErr.message || '').toLowerCase();
        const ehErroRede = msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch');
        if (!ehErroRede) {
          throw itemErr;
        }
      } else {
        const listaFinal = (itensInseridos || []).map((item, idx) =>
          enriquecerEncomendaComMorador(
            { ...item, local_armazenamento: item.local_armazenamento || localFinal },
            validacoes[idx]?.morador ? [validacoes[idx].morador] : moradoresAutoritativos,
            [],
            tipoEstrutura
          )
        );

        await invalidarCacheTabela('encomendas_itens', condominioId);

        for (const item of listaFinal) {
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(`infport_item_local_${item.id}`, localFinal);
            } catch {}
          }
          atualizarItemRetidoCache(condominioId, item.id, item, 'upsert');
          aplicarMutacaoLocal('encomendas_itens', condominioId, item, 'INSERT').catch(() => {});
        }

        return { data: listaFinal, offline: false, destinatariosValidados: validacoes };
      }
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      const ehErroRede = msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch');
      if (!ehErroRede) {
        throw err;
      }
    }
  }

  // Fluxo Offline seguro: já passou por validação estrita antes de entrar na fila
  const agoraIso = new Date().toISOString();
  const itensOffline = payloadsValidados.map((payload, idx) => {
    const idLocal = `offline_enc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
    enfileirarAcaoOffline(
      'encomendas_itens',
      'INSERT',
      payload,
      `Entrada de encomenda unidade ${payload.unidade}${validacoes[idx]?.morador?.nome ? ` (${validacoes[idx].morador.nome})` : ''}`
    );

    const itemEnriquecido = enriquecerEncomendaComMorador(
      { ...payload, id: idLocal, created_at: agoraIso, updated_at: agoraIso },
      validacoes[idx]?.morador ? [validacoes[idx].morador] : moradoresAutoritativos,
      [],
      tipoEstrutura
    );

    atualizarItemRetidoCache(condominioId, idLocal, itemEnriquecido, 'upsert');
    aplicarMutacaoLocal('encomendas_itens', condominioId, itemEnriquecido, 'INSERT').catch(() => {});
    return itemEnriquecido;
  });

  return { data: itensOffline, offline: true, destinatariosValidados: validacoes };
}

/**
 * Valida e executa a atualização de um pacote retido no Supabase (ou fila offline).
 */
export async function atualizarEncomendaValidada(
  itemId: string,
  dadosAtualizacao: {
    condominio_id: string;
    bloco?: string | null;
    unidade: string;
    morador_id?: string | null;
    codigo_barras?: string;
    local_armazenamento?: string;
    observacoes?: string;
  },
  opcoes: {
    moradoresCondominio?: any[];
    tipoEstrutura?: string;
  } = {}
): Promise<{ offline: boolean; moradorValidado: any | null }> {
  const condominioId = dadosAtualizacao.condominio_id;
  const moradoresAutoritativos = await obterMoradoresAutoritativosCondominio(
    condominioId,
    opcoes.moradoresCondominio || [],
    true
  );

  const validacao = await validarDestinatarioAntesGravacao({
    condominioId,
    bloco: dadosAtualizacao.bloco,
    unidade: dadosAtualizacao.unidade,
    moradorId: dadosAtualizacao.morador_id,
    moradoresCondominio: moradoresAutoritativos,
    tipoEstrutura: opcoes.tipoEstrutura,
    consultarSupabaseSeOnline: false
  });

  if (!validacao.valido) {
    throw new Error(validacao.erro || 'Destinatário inconsistente para esta unidade.');
  }

  const payloadFinal: any = {
    unidade: dadosAtualizacao.unidade,
    bloco: dadosAtualizacao.bloco ?? '',
    morador_id: validacao.moradorId,
    destinatario: validacao.morador?.nome || null,
    codigo_barras: dadosAtualizacao.codigo_barras ?? '',
    local_armazenamento: dadosAtualizacao.local_armazenamento ?? 'Bancada Principal',
    observacoes: dadosAtualizacao.observacoes ?? ''
  };

  const estaOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  if (estaOnline && !String(itemId).startsWith('offline_')) {
    try {
      let { error } = await supabase
        .from('encomendas_itens')
        .update(payloadFinal)
        .eq('id', itemId)
        .eq('condominio_id', condominioId);

      if (error && (error.message?.includes('destinatario') || (error as any).code === '42703')) {
        const { destinatario, ...semDest } = payloadFinal;
        const retry = await supabase
          .from('encomendas_itens')
          .update(semDest)
          .eq('id', itemId)
          .eq('condominio_id', condominioId);
        error = retry.error;
      }

      if (error) throw error;

      await invalidarCacheTabela('encomendas_itens', condominioId);
      const itemAtualizado = enriquecerEncomendaComMorador(
        { id: itemId, condominio_id: condominioId, ...payloadFinal },
        validacao.morador ? [validacao.morador] : moradoresAutoritativos,
        [],
        opcoes.tipoEstrutura
      );
      atualizarItemRetidoCache(condominioId, itemId, itemAtualizado, 'upsert');
      aplicarMutacaoLocal('encomendas_itens', condominioId, itemAtualizado, 'UPDATE').catch(() => {});
      return { offline: false, moradorValidado: validacao.morador };
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      const ehErroRede = msg.includes('failed to fetch') || msg.includes('network') || msg.includes('fetch');
      if (!ehErroRede) throw err;
    }
  }

  enfileirarAcaoOffline(
    'encomendas_itens',
    'UPDATE',
    { id: itemId, condominio_id: condominioId, ...payloadFinal },
    `Edição de encomenda unidade ${payloadFinal.unidade}`
  );
  const itemLocal = enriquecerEncomendaComMorador(
    { id: itemId, condominio_id: condominioId, ...payloadFinal },
    validacao.morador ? [validacao.morador] : moradoresAutoritativos,
    [],
    opcoes.tipoEstrutura
  );
  atualizarItemRetidoCache(condominioId, itemId, itemLocal, 'upsert');
  aplicarMutacaoLocal('encomendas_itens', condominioId, itemLocal, 'UPDATE').catch(() => {});

  return { offline: true, moradorValidado: validacao.morador };
}

/**
 * Obtém os dados de encomendas imediatamente do cache (RAM ou localStorage),
 * revalidando o vínculo dos moradores estritamente por `morador_id`.
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

  const tipoEstrutura = resolverTipoEstrutura(condominioId);

  // 1. Tenta memória RAM do cliente (0.0ms)
  const emMemoria = memoriaEncomendas.get(condominioId);
  if (emMemoria && emMemoria.itensRetidos !== undefined) {
    return {
      ...emMemoria,
      itensRetidos: (emMemoria.itensRetidos || []).map((item: any) =>
        enriquecerEncomendaComMorador(item, emMemoria.moradores || [], emMemoria.todosLotesRE || [], tipoEstrutura)
      )
    };
  }

  // 2. Tenta localStorage se ainda não estiver na RAM (remove chave legada v2 se existir)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(`${CHAVE_PREFIXO_STORAGE_LEGADO}${condominioId}`);
      const raw = localStorage.getItem(`${CHAVE_PREFIXO_STORAGE}${condominioId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.condominioId === condominioId) {
          const saneado: EncomendasCacheBundle = {
            ...parsed,
            itensRetidos: (parsed.itensRetidos || [])
              .filter((it: any) => !it?.condominio_id || String(it.condominio_id) === String(condominioId))
              .map((item: any) =>
                enriquecerEncomendaComMorador(item, parsed.moradores || [], parsed.todosLotesRE || [], tipoEstrutura)
              )
          };
          memoriaEncomendas.set(condominioId, saneado);
          return saneado;
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
      const tipoEstrutura = resolverTipoEstrutura(condominioId);

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
          condominioId,
          forceRefresh: forcar
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
          condominioId,
          forceRefresh: forcar
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
          condominioId,
          forceRefresh: forcar
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

      // Enriquecimento estrito dos itens retidos apenas pelo morador_id único (preservando morador_id histórico)
      let itensRetidosFinal: any[] = [];
      const itensRaw = Array.isArray(rawItensRetidos) ? rawItensRetidos : [];

      if (itensRaw.length > 0) {
        itensRetidosFinal = itensRaw
          .filter((item: any) => !item?.condominio_id || String(item.condominio_id) === String(condominioId))
          .map((item: any) =>
            enriquecerEncomendaComMorador(item, listaMoradores, todosLotesEnriquecidos, tipoEstrutura)
          );
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

      // Persiste no IndexedDB substituindo estado do condomínio (evita itens fantasmas)
      salvarLoteItensLocal('encomendas_itens', itensRetidosFinal, condominioId, new Date().toISOString(), true).catch((err) => {
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
          invalidarCacheTabela('encomendas_itens', condominioId)
            .then(() => carregarEPreaquecerEncomendas(condominioId, true))
            .catch(() => {});
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

  const bundle = memoriaEncomendas.get(condominioId) || obterCacheEncomendas(condominioId);
  const tipoEstrutura = resolverTipoEstrutura(condominioId);

  let novaLista = [...(bundle.itensRetidos || [])];
  if (acao === 'delete') {
    novaLista = novaLista.filter(it => it.id !== itemId);
  } else if (novoItem) {
    const itemSaneado = enriquecerEncomendaComMorador(
      novoItem,
      bundle.moradores || [],
      bundle.todosLotesRE || [],
      tipoEstrutura
    );
    const idx = novaLista.findIndex(it => it.id === itemId);
    if (idx >= 0) {
      novaLista[idx] = { ...novaLista[idx], ...itemSaneado };
    } else {
      novaLista.unshift(itemSaneado);
    }
  }

  const bundleAtualizado: EncomendasCacheBundle = {
    ...bundle,
    condominioId,
    itensRetidos: novaLista,
    atualizadoEm: Date.now()
  };

  memoriaEncomendas.set(condominioId, bundleAtualizado);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`${CHAVE_PREFIXO_STORAGE}${condominioId}`, JSON.stringify(bundleAtualizado));
      localStorage.setItem(`infport_cache_retidos_${condominioId}`, JSON.stringify(novaLista));
    } catch {}
  }
}
