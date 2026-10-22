/**
 * INFPORT 1.0 — Serviço de Histórico Absoluto e Auditoria Global em Tempo Real
 * 
 * Registra toda e qualquer atividade realizada no sistema (quem, quando, o que, detalhes),
 * consolida o histórico de TODOS os módulos do sistema (Encomendas, Lotes RE, Custódia, 
 * Chaves, Prestadores, Ocorrências, Manutenção, Passagem de Posto, Rondas, Materiais e Cadastros),
 * com suporte completo a consulta e limpeza/expurgo por período para administradores.
 */

import { supabase } from './supabase';

export interface RegistroAuditoria {
  id: string;
  condominio_id?: string | null;
  operador_id?: string | null;
  operador_nome: string;
  operador_login?: string | null;
  modulo: string;
  acao: string;
  descricao: string;
  detalhes?: any;
  ip?: string | null;
  criado_em: string;
}

const CHAVE_STORAGE_HISTORICO = 'infport_historico_absoluto_cache_v1';
const LIMITE_CACHE_LOCAL = 1000;

export const SQL_CRIACAO_HISTORICO_ABSOLUTO = `-- ====================================================================
-- INFPORT 1.0 - TABELA DEFINITIVA DE HISTÓRICO ABSOLUTO & AUDITORIA
-- ====================================================================
-- Execute este script no SQL Editor do seu painel Supabase:
-- https://supabase.com/dashboard/project/_/sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_id UUID,
  operador_nome TEXT NOT NULL,
  operador_login TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices de alta performance para busca e filtros rápidos
CREATE INDEX IF NOT EXISTS idx_hist_abs_condominio ON public.historico_absoluto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_modulo ON public.historico_absoluto(modulo);
CREATE INDEX IF NOT EXISTS idx_hist_abs_acao ON public.historico_absoluto(acao);
CREATE INDEX IF NOT EXISTS idx_hist_abs_operador ON public.historico_absoluto(operador_id);
CREATE INDEX IF NOT EXISTS idx_hist_abs_criado_em ON public.historico_absoluto(criado_em DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.historico_absoluto ENABLE ROW LEVEL SECURITY;

-- Política de Acesso Total para a Portaria
DROP POLICY IF EXISTS "Acesso total portaria historico_absoluto" ON public.historico_absoluto;
CREATE POLICY "Acesso total portaria historico_absoluto" 
  ON public.historico_absoluto 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Habilitar Realtime do Supabase com proteção contra duplicação
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'historico_absoluto'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_absoluto;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Publicação supabase_realtime já configurada.';
END $$;

COMMIT;

-- Recarregar o cache do PostgREST imediatamente
NOTIFY pgrst, 'reload schema';
`;

/**
 * Mapeamento completo de tabelas disponíveis para limpeza e expurgo controlado por período
 */
export interface DefinicaoTabelaLimpavel {
  id: string;
  nomeAmigavel: string;
  modulo: string;
  campoData: string;
  campoCondominio?: string;
  descricao: string;
  avisoPerigo?: boolean;
}

export const TABELAS_LIMPAGEM: DefinicaoTabelaLimpavel[] = [
  {
    id: 'todas_tabelas',
    nomeAmigavel: '🧹 TODAS AS TABELAS OPERACIONAIS (Limpeza Completa por Período)',
    modulo: 'Auditoria Geral',
    campoData: 'data',
    campoCondominio: 'condominio_id',
    descricao: 'Executa expurgo coordenado em todas as tabelas operacionais (Encomendas, Lotes RE, Custódia, Chaves, Ocorrências, Prestadores, Manutenção, Rondas, Materiais e Logs Antigos) no intervalo selecionado.',
    avisoPerigo: true
  },
  {
    id: 'encomendas_itens',
    nomeAmigavel: 'Fluxo de Encomendas (Pacotes e Baixas)',
    modulo: 'Encomendas',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Registros individuais de encomendas recebidas, entregues e pendentes na guarita.'
  },
  {
    id: 'lotes_re',
    nomeAmigavel: 'Lotes de Encomendas Recebidas (RE)',
    modulo: 'Encomendas',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Lotes de recebimento gerados pelas transportadoras e entregadores no posto.',
    avisoPerigo: true
  },
  {
    id: 'custodia',
    nomeAmigavel: 'Itens em Custódia e Guarda Temporária',
    modulo: 'Custódia',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Registros de pertences, chaves e objetos sob guarda da portaria.'
  },
  {
    id: 'movimentacao_chaves',
    nomeAmigavel: 'Movimentações do Quadro de Chaves',
    modulo: 'Chaves',
    campoData: 'data_hora_retirada',
    campoCondominio: 'condominio_id',
    descricao: 'Histórico de retiradas e devoluções de chaves da portaria.'
  },
  {
    id: 'prestadores_acessos',
    nomeAmigavel: 'Entradas e Saídas de Prestadores e Obras',
    modulo: 'Prestadores',
    campoData: 'data_hora_entrada',
    campoCondominio: 'condominio_id',
    descricao: 'Fluxo de acessos, visitas e permanência de prestadores de serviço e trabalhadores.'
  },
  {
    id: 'prestadores',
    nomeAmigavel: 'Cadastros e Histórico de Prestadores/Visitantes',
    modulo: 'Prestadores',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Registros cadastrais e autorizações concedidas a prestadores e visitantes.'
  },
  {
    id: 'ocorrencias',
    nomeAmigavel: 'Livro de Ocorrências da Portaria',
    modulo: 'Ocorrências',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Registros no livro digital de ocorrências do condomínio.'
  },
  {
    id: 'chamados_manutencao',
    nomeAmigavel: 'Chamados e Ordens de Manutenção',
    modulo: 'Manutenção',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Histórico de solicitações preventivas e corretivas de manutenção predial.'
  },
  {
    id: 'checklist_manutencao',
    nomeAmigavel: 'Checklists e Vistorias Preventivas',
    modulo: 'Manutenção',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Rotinas e vistorias preventivas executadas pela portaria ou manutenção.'
  },
  {
    id: 'passagens_posto',
    nomeAmigavel: 'Histórico de Passagem de Posto / Turno',
    modulo: 'Passagem de Posto',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Relatórios de conferência de troca de plantão entre operadores.'
  },
  {
    id: 'rondas_registros',
    nomeAmigavel: 'Pontos e Leituras de Ronda Realizadas',
    modulo: 'Rondas',
    campoData: 'data_hora',
    campoCondominio: 'condominio_id',
    descricao: 'Check-ins em pontos de ronda via QR Code ou NFC efetuados pela vigilância.'
  },
  {
    id: 'rondas_execucao',
    nomeAmigavel: 'Sessões de Ronda Concluídas',
    modulo: 'Rondas',
    campoData: 'data_inicio',
    campoCondominio: 'condominio_id',
    descricao: 'Sessões gerais de rondas abertas e finalizadas com relatórios.'
  },
  {
    id: 'materiais_posto',
    nomeAmigavel: 'Materiais e Equipamentos do Posto',
    modulo: 'Materiais',
    campoData: 'created_at',
    campoCondominio: 'condominio_id',
    descricao: 'Inventário e cautela de materiais patrimoniais da guarita.'
  },
  {
    id: 'historico_absoluto',
    nomeAmigavel: 'Histórico Absoluto (Auditoria Global Antiga)',
    modulo: 'Auditoria',
    campoData: 'criado_em',
    campoCondominio: 'condominio_id',
    descricao: 'O próprio registro geral de auditoria para expurgo de logs muito antigos.',
    avisoPerigo: true
  }
];

export const CANDIDATOS_CAMPOS_DATA: Record<string, string[]> = {
  encomendas_itens: ['created_at', 'data_recebimento', 'data_retirada', 'criado_em'],
  lotes_re: ['created_at', 'criado_em'],
  custodia: ['created_at', 'data_hora_entrada', 'data_hora_saida', 'criado_em'],
  movimentacao_chaves: ['data_hora_retirada', 'data_hora_devolucao', 'created_at', 'data_retirada'],
  prestadores_acessos: ['data_hora_entrada', 'data_hora_saida', 'created_at', 'hora_entrada'],
  prestadores: ['created_at', 'data_hora_entrada', 'data_cadastro', 'criado_em'],
  ocorrencias: ['created_at', 'data_hora', 'criado_em'],
  chamados_manutencao: ['created_at', 'data_abertura', 'criado_em'],
  checklist_manutencao: ['created_at', 'data_realizacao', 'criado_em'],
  passagens_posto: ['created_at', 'data_passagem', 'criado_em'],
  rondas_registros: ['data_hora', 'created_at', 'criado_em'],
  rondas_execucao: ['data_inicio', 'data_fim', 'created_at', 'hora_inicio'],
  materiais_posto: ['created_at', 'criado_em'],
  historico_absoluto: ['criado_em', 'created_at']
};

/**
 * Salva no cache local do navegador para persistência imediata
 */
function salvarRegistroEmCacheLocal(registro: RegistroAuditoria): void {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_HISTORICO);
    let lista: RegistroAuditoria[] = raw ? JSON.parse(raw) : [];
    lista.unshift(registro);
    if (lista.length > LIMITE_CACHE_LOCAL) {
      lista = lista.slice(0, LIMITE_CACHE_LOCAL);
    }
    localStorage.setItem(CHAVE_STORAGE_HISTORICO, JSON.stringify(lista));
  } catch (err) {
    console.warn('[Auditoria] Falha ao salvar no cache local:', err);
  }
}

/**
 * Obtém os registros salvos em cache local
 */
export function obterHistoricoCacheLocal(): RegistroAuditoria[] {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_HISTORICO);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Auditoria] Falha ao ler cache local:', err);
  }
  return [];
}

/**
 * REGISTRO CENTRAL DE ATIVIDADE:
 * Grava toda e qualquer atividade no sistema (quem, quando, o que, detalhes),
 * enviando para o Supabase e mantendo réplica local com disparo em tempo real.
 */
export async function registrarAtividade(params: {
  modulo: string;
  acao: string;
  descricao: string;
  detalhes?: any;
  operador_nome?: string;
  operador_id?: string | null;
  operador_login?: string | null;
  condominio_id?: string | null;
}): Promise<RegistroAuditoria> {
  const agora = new Date().toISOString();
  const id = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  let opNome = params.operador_nome;
  let opId = params.operador_id;
  let opLogin = params.operador_login;
  let condoId = params.condominio_id;

  if (!opNome && typeof window !== 'undefined') {
    try {
      const sessaoRaw = localStorage.getItem('infport_sessao_ativa_v1');
      if (sessaoRaw) {
        const sessao = JSON.parse(sessaoRaw);
        opId = opId || sessao.operadorId;
        opLogin = opLogin || sessao.login;
        condoId = condoId || sessao.condominioId;
      }
    } catch {}
  }

  if (!condoId && typeof window !== 'undefined') {
    condoId = (window as any).idCondominioAtivo || null;
  }

  const registro: RegistroAuditoria = {
    id,
    condominio_id: condoId || null,
    operador_id: opId || null,
    operador_nome: opNome || opLogin || 'Operador da Portaria',
    operador_login: opLogin || null,
    modulo: params.modulo,
    acao: params.acao.toUpperCase(),
    descricao: params.descricao,
    detalhes: params.detalhes || {},
    ip: 'Portaria Local',
    criado_em: agora
  };

  // 1. Persistência imediata no cache local
  salvarRegistroEmCacheLocal(registro);

  // 2. Dispara evento local para atualização instantânea na UI em tempo real
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('infport_historico_novo', { detail: registro }));
  }

  // 3. Persistência na tabela do Supabase (assíncrona e resiliente)
  try {
    const sanitizeUuid = (val: any): string | null => {
      if (!val || typeof val !== 'string') return null;
      const limpo = val.trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(limpo) ? limpo : null;
    };

    const payloadSupabase = {
      condominio_id: sanitizeUuid(registro.condominio_id),
      operador_id: sanitizeUuid(registro.operador_id),
      operador_nome: registro.operador_nome,
      operador_login: registro.operador_login,
      modulo: registro.modulo,
      acao: registro.acao,
      descricao: registro.descricao,
      detalhes: registro.detalhes,
      ip: registro.ip,
      criado_em: registro.criado_em
    };

    const { error } = await supabase.from('historico_absoluto').insert([payloadSupabase]);
    if (error) {
      console.warn('[Auditoria] Aviso ao salvar no Supabase (verifique se a tabela historico_absoluto foi criada):', error.message);
    }
  } catch (err: any) {
    console.warn('[Auditoria] Exceção de rede ao enviar histórico para Supabase:', err.message);
  }

  return registro;
}

/**
 * Consulta registros do Histórico Absoluto com filtros avançados e agregação completa de TODOS os módulos
 */
export async function buscarHistoricoAbsoluto(filtros: {
  condominio_id?: string;
  modulo?: string;
  acao?: string;
  operador_id?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
  limite?: number;
}): Promise<{ registros: RegistroAuditoria[]; total: number; fonte: 'supabase' | 'cache_local' }> {
  const limite = filtros.limite || 300;
  const listaConsolidada: RegistroAuditoria[] = [];

  const condoId = filtros.condominio_id && filtros.condominio_id !== 'todos' ? filtros.condominio_id : undefined;
  const moduloFiltro = filtros.modulo && filtros.modulo !== 'todos' ? filtros.modulo : null;

  // 1. Consulta a tabela de auditoria central (historico_absoluto)
  try {
    let qHist = supabase
      .from('historico_absoluto')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limite);

    if (condoId) {
      qHist = qHist.eq('condominio_id', condoId);
    }
    if (moduloFiltro) {
      qHist = qHist.ilike('modulo', `%${moduloFiltro}%`);
    }
    if (filtros.acao && filtros.acao !== 'todas') {
      qHist = qHist.eq('acao', filtros.acao.toUpperCase());
    }

    const { data: dadosHist } = await qHist;
    if (dadosHist && dadosHist.length > 0) {
      listaConsolidada.push(...(dadosHist as RegistroAuditoria[]));
    }
  } catch (e) {
    console.warn('[Auditoria] Falha ao consultar historico_absoluto:', e);
  }

  // 2. Agregação em paralelo de cada módulo operacional do sistema
  const promisesModulos: Promise<void>[] = [];

  // Helper seguro para consultar tabelas com ordenação resiliente
  const consultarTabelaResiliente = async (
    tabela: string,
    camposOrdem: string[]
  ): Promise<any[]> => {
    for (const campo of camposOrdem) {
      try {
        let q = supabase.from(tabela).select('*').limit(limite);
        if (condoId) {
          q = q.eq('condominio_id', condoId);
        }
        if (campo) {
          q = q.order(campo, { ascending: false });
        }
        const { data, error } = await q;
        if (!error && data) {
          return data;
        }
      } catch {}
    }
    // Fallback sem order
    try {
      let q = supabase.from(tabela).select('*').limit(limite);
      if (condoId) q = q.eq('condominio_id', condoId);
      const { data } = await q;
      return data || [];
    } catch {
      return [];
    }
  };

  // 2.1 Encomendas: Itens (encomendas_itens)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('encomenda')) {
    promisesModulos.push((async () => {
      try {
        const itens = await consultarTabelaResiliente('encomendas_itens', ['created_at', 'data_recebimento', 'criado_em']);
        itens.forEach((item: any) => {
          const rastreio = item.codigo_barras || item.codigo_rastreio || item.rastreio || 'S/ Rastreio';
          const dest = item.destinatario || item.nome_morador || 'Morador';
          const apFormatado = `Ap. ${item.unidade || ''} ${item.bloco ? '• Bl ' + item.bloco : ''}`.trim();

          // Evento de Recebimento
          listaConsolidada.push({
            id: `enc_ent_${item.id}`,
            condominio_id: item.condominio_id,
            operador_id: item.operador_entrada_id || null,
            operador_nome: item.operador_entrada || 'Portaria',
            modulo: 'Encomendas',
            acao: 'CRIAR',
            descricao: `Encomenda recebida no posto para ${apFormatado} (${dest}) - Rastreio: ${rastreio} - Local: ${item.local_armazenamento || 'Escaninho'}`,
            detalhes: item,
            criado_em: item.created_at || item.data_recebimento || new Date().toISOString()
          });

          // Evento de Baixa/Entrega
          if (item.status === 'entregue' || item.data_retirada) {
            listaConsolidada.push({
              id: `enc_sai_${item.id}`,
              condominio_id: item.condominio_id,
              operador_id: item.operador_baixa_id || null,
              operador_nome: item.operador_baixa || 'Portaria',
              modulo: 'Encomendas',
              acao: 'BAIXA',
              descricao: `Baixa e entrega de encomenda concluída para ${item.retirado_por || dest} (${apFormatado}) - Rastreio: ${rastreio}`,
              detalhes: item,
              criado_em: item.data_retirada || item.created_at || new Date().toISOString()
            });
          }
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar encomendas_itens:', err);
      }
    })());

    // 2.1.B Lotes RE de Encomendas (lotes_re)
    promisesModulos.push((async () => {
      try {
        const lotes = await consultarTabelaResiliente('lotes_re', ['created_at', 'criado_em']);
        lotes.forEach((lote: any) => {
          listaConsolidada.push({
            id: `lote_re_${lote.id}`,
            condominio_id: lote.condominio_id,
            operador_id: null,
            operador_nome: lote.operador_nome || 'Portaria',
            modulo: 'Encomendas',
            acao: 'CRIAR',
            descricao: `Lote de Encomendas [${lote.codigo_re || 'RE'}]: Declaradas: ${lote.qtd_declarada || 0} | Triadas: ${lote.qtd_triada || 0} | Status: ${lote.status || 'concluido'}`,
            detalhes: lote,
            criado_em: lote.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar lotes_re:', err);
      }
    })());
  }

  // 2.2 Custódia (custodia)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('custodia') || moduloFiltro.toLowerCase().includes('custódia')) {
    promisesModulos.push((async () => {
      try {
        const itensCustodia = await consultarTabelaResiliente('custodia', ['created_at', 'data_hora_entrada', 'criado_em']);
        itensCustodia.forEach((c: any) => {
          listaConsolidada.push({
            id: `cus_ent_${c.id}`,
            condominio_id: c.condominio_id,
            operador_id: null,
            operador_nome: c.operador_entrada || 'Portaria',
            modulo: 'Custódia',
            acao: 'CRIAR',
            descricao: `Objeto sob custódia: [${c.codigo_custodia || 'CUST'}] ${c.descricao || 'Item'} - De: ${c.origem_nome_doc || 'Origem'} ➔ Para: ${c.destino_nome_doc || 'Destino'} (${c.fluxo || 'Geral'})`,
            detalhes: c,
            criado_em: c.created_at || c.data_hora_entrada || new Date().toISOString()
          });

          if (c.status === 'Retirado' || c.data_hora_saida) {
            listaConsolidada.push({
              id: `cus_sai_${c.id}`,
              condominio_id: c.condominio_id,
              operador_id: null,
              operador_nome: c.operador_saida || 'Portaria',
              modulo: 'Custódia',
              acao: 'BAIXA',
              descricao: `Devolução de custódia [${c.codigo_custodia}] entregue a ${c.recebedor_nome || 'Retirante'} (Doc: ${c.recebedor_doc || 'N/I'})`,
              detalhes: c,
              criado_em: c.data_hora_saida || c.created_at || new Date().toISOString()
            });
          }
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar custodia:', err);
      }
    })());
  }

  // 2.3 Quadro de Chaves (movimentacao_chaves & chaves)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('chave')) {
    promisesModulos.push((async () => {
      try {
        const movs = await consultarTabelaResiliente('movimentacao_chaves', ['data_hora_retirada', 'created_at', 'data_retirada']);
        movs.forEach((m: any) => {
          listaConsolidada.push({
            id: `chv_ret_${m.id}`,
            condominio_id: m.condominio_id,
            operador_id: null,
            operador_nome: m.operador_retirada || 'Portaria',
            modulo: 'Chaves',
            acao: 'RETIRADA',
            descricao: `Retirada de chave realizada por ${m.retirante_nome || 'Retirante'} (Doc: ${m.retirante_doc || 'N/I'}) - Status: ${m.status}`,
            detalhes: m,
            criado_em: m.data_hora_retirada || m.created_at || new Date().toISOString()
          });

          if (m.status === 'Devolvida' || m.data_hora_devolucao) {
            listaConsolidada.push({
              id: `chv_dev_${m.id}`,
              condominio_id: m.condominio_id,
              operador_id: null,
              operador_nome: m.operador_devolucao || 'Portaria',
              modulo: 'Chaves',
              acao: 'DEVOLUCAO',
              descricao: `Devolução de chave concluída no quadro por ${m.devolvido_por || m.retirante_nome || 'Portaria'}`,
              detalhes: m,
              criado_em: m.data_hora_devolucao || m.created_at || new Date().toISOString()
            });
          }
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar movimentacao_chaves:', err);
      }
    })());
  }

  // 2.4 Prestadores & Obras (prestadores_acessos & prestadores)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('prestador')) {
    promisesModulos.push((async () => {
      try {
        // Acessos e permanência
        const acessos = await consultarTabelaResiliente('prestadores_acessos', ['data_hora_entrada', 'created_at', 'hora_entrada']);
        acessos.forEach((p: any) => {
          listaConsolidada.push({
            id: `prs_ent_${p.id}`,
            condominio_id: p.condominio_id,
            operador_id: null,
            operador_nome: p.operador_entrada_nome || 'Portaria',
            modulo: 'Prestadores',
            acao: 'CRIAR',
            descricao: `Entrada liberada: ${p.nome_completo || 'Prestador'} (${p.empresa || p.perfil_acesso || 'Visitante/Obra'}) - Destino: ${p.unidade ? 'Ap. ' + p.unidade : 'Condomínio'} - Crachá: ${p.cracha || p.cracha_atribuido || 'S/ Crachá'}`,
            detalhes: p,
            criado_em: p.data_hora_entrada || p.created_at || new Date().toISOString()
          });

          if (p.data_hora_saida) {
            listaConsolidada.push({
              id: `prs_sai_${p.id}`,
              condominio_id: p.condominio_id,
              operador_id: null,
              operador_nome: p.operador_saida_nome || 'Portaria',
              modulo: 'Prestadores',
              acao: 'BAIXA',
              descricao: `Saída concluída: ${p.nome_completo || 'Prestador'} (${p.empresa || 'Visitante'}) - Permanência finalizada`,
              detalhes: p,
              criado_em: p.data_hora_saida || p.created_at || new Date().toISOString()
            });
          }
        });

        // Cadastros e autorizações de prestadores
        const cadPrest = await consultarTabelaResiliente('prestadores', ['created_at', 'data_hora_entrada', 'data_cadastro']);
        cadPrest.forEach((cp: any) => {
          if (!listaConsolidada.some(r => r.id === `prs_cad_${cp.id}`)) {
            listaConsolidada.push({
              id: `prs_cad_${cp.id}`,
              condominio_id: cp.condominio_id,
              operador_id: null,
              operador_nome: cp.operador_entrada_nome || 'Portaria',
              modulo: 'Prestadores',
              acao: 'CRIAR',
              descricao: `Cadastro / Autorização de Prestador: ${cp.nome_profissional || cp.nome_completo || 'Prestador'} (${cp.empresa || 'Autônomo'}) - Vínculo: ${cp.parentesco_vinculo || cp.perfil_acesso || 'Obra/Serviço'}`,
              detalhes: cp,
              criado_em: cp.created_at || cp.data_hora_entrada || new Date().toISOString()
            });
          }
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar prestadores:', err);
      }
    })());
  }

  // 2.5 Ocorrências (ocorrencias)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('ocorr')) {
    promisesModulos.push((async () => {
      try {
        const ocs = await consultarTabelaResiliente('ocorrencias', ['created_at', 'data_hora', 'criado_em']);
        ocs.forEach((o: any) => {
          listaConsolidada.push({
            id: `ocr_${o.id}`,
            condominio_id: o.condominio_id,
            operador_id: null,
            operador_nome: o.operador_nome || 'Portaria',
            modulo: 'Ocorrências',
            acao: 'CRIAR',
            descricao: `Livro de Ocorrências [${o.tipo || 'Geral'}]: ${o.titulo || 'Ocorrência'} ${o.unidade_bloco ? '(' + o.unidade_bloco + ')' : ''} - Gravidade: ${o.prioridade || 'Média'}`,
            detalhes: o,
            criado_em: o.created_at || o.data_hora || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar ocorrencias:', err);
      }
    })());
  }

  // 2.6 Manutenção (chamados_manutencao & checklist_manutencao)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('manuten')) {
    promisesModulos.push((async () => {
      try {
        const mans = await consultarTabelaResiliente('chamados_manutencao', ['created_at', 'data_abertura', 'criado_em']);
        mans.forEach((man: any) => {
          listaConsolidada.push({
            id: `man_${man.id}`,
            condominio_id: man.condominio_id,
            operador_id: null,
            operador_nome: man.operador_abertura || 'Portaria',
            modulo: 'Manutenção',
            acao: man.status === 'Concluído' ? 'BAIXA' : 'CRIAR',
            descricao: `Ordem de Serviço [${man.categoria || 'Geral'}]: ${man.titulo || 'Manutenção'} - Local: ${man.localizacao || 'Área Comum'} - Status: ${man.status || 'Aberto'}`,
            detalhes: man,
            criado_em: man.created_at || new Date().toISOString()
          });
        });

        const chkMans = await consultarTabelaResiliente('checklist_manutencao', ['created_at', 'criado_em']);
        chkMans.forEach((chk: any) => {
          listaConsolidada.push({
            id: `chk_man_${chk.id}`,
            condominio_id: chk.condominio_id,
            operador_id: null,
            operador_nome: chk.operador_nome || 'Manutenção',
            modulo: 'Manutenção',
            acao: 'CRIAR',
            descricao: `Checklist Preventivo de Manutenção: [${chk.item || chk.titulo || 'Item'}] - Periodicidade: ${chk.periodicidade || 'Geral'} - Status: ${chk.status || 'Conforme'}`,
            detalhes: chk,
            criado_em: chk.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar manutencao:', err);
      }
    })());
  }

  // 2.7 Passagem de Posto (passagens_posto)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('passagem')) {
    promisesModulos.push((async () => {
      try {
        const passagens = await consultarTabelaResiliente('passagens_posto', ['created_at', 'data_passagem', 'criado_em']);
        passagens.forEach((pas: any) => {
          listaConsolidada.push({
            id: `pas_${pas.id}`,
            condominio_id: pas.condominio_id,
            operador_id: null,
            operador_nome: pas.operador_sainte_nome || 'Portaria',
            modulo: 'Passagem de Posto',
            acao: 'CRIAR',
            descricao: `Passagem de Posto realizada: Saindo ${pas.operador_sainte_nome || 'Operador'} ➔ Entrando ${pas.operador_entrante_nome || 'Próximo turno'} (${pas.status || 'Concluída'})`,
            detalhes: pas,
            criado_em: pas.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar passagens_posto:', err);
      }
    })());
  }

  // 2.8 Rondas Patrimoniais (rondas_execucao & rondas_registros)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('ronda')) {
    promisesModulos.push((async () => {
      try {
        const rondas = await consultarTabelaResiliente('rondas_execucao', ['data_inicio', 'created_at', 'hora_inicio']);
        rondas.forEach((r: any) => {
          listaConsolidada.push({
            id: `rnd_${r.id}`,
            condominio_id: r.condominio_id,
            operador_id: null,
            operador_nome: r.operador_nome || 'Vigilante',
            modulo: 'Rondas',
            acao: r.status === 'finalizada' ? 'BAIXA' : 'CRIAR',
            descricao: `Ronda patrimonial [${r.status || 'Concluída'}]: Pontos lidos ${r.pontos_lidos ?? 0}/${r.pontos_totais ?? 0} - Vigia: ${r.operador_nome || 'Segurança'}`,
            detalhes: r,
            criado_em: r.data_fim || r.data_inicio || r.created_at || new Date().toISOString()
          });
        });

        const checkins = await consultarTabelaResiliente('rondas_registros', ['data_hora', 'created_at']);
        checkins.forEach((ck: any) => {
          listaConsolidada.push({
            id: `rnd_reg_${ck.id}`,
            condominio_id: ck.condominio_id,
            operador_id: null,
            operador_nome: ck.operador_nome || 'Vigilante',
            modulo: 'Rondas',
            acao: 'CHECKIN',
            descricao: `Ponto de ronda verificado: [${ck.ponto_nome || 'Ponto'}] - Status: ${ck.status_leitura || 'Lido'}`,
            detalhes: ck,
            criado_em: ck.data_hora || ck.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar rondas:', err);
      }
    })());
  }

  // 2.9 Materiais do Posto (materiais_posto)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('material')) {
    promisesModulos.push((async () => {
      try {
        const mats = await consultarTabelaResiliente('materiais_posto', ['created_at', 'criado_em']);
        mats.forEach((mat: any) => {
          listaConsolidada.push({
            id: `mat_${mat.id}`,
            condominio_id: mat.condominio_id,
            operador_id: null,
            operador_nome: 'Portaria',
            modulo: 'Materiais',
            acao: 'CRIAR',
            descricao: `Material do Posto registrado: [${mat.categoria || 'Geral'}] ${mat.nome || 'Item'} - Quantidade: ${mat.quantidade || 1} - Estado: ${mat.estado || 'Bom'}`,
            detalhes: mat,
            criado_em: mat.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar materiais_posto:', err);
      }
    })());
  }

  // 2.10 Cadastros Base (moradores, operadores, condominios)
  if (!moduloFiltro || moduloFiltro.toLowerCase().includes('cadastro')) {
    promisesModulos.push((async () => {
      try {
        const moradores = await consultarTabelaResiliente('moradores', ['created_at', 'criado_em']);
        moradores.forEach((m: any) => {
          listaConsolidada.push({
            id: `mor_${m.id}`,
            condominio_id: m.condominio_id,
            operador_id: null,
            operador_nome: 'Administração',
            modulo: 'Cadastros',
            acao: 'CRIAR',
            descricao: `Morador cadastrado: ${m.nome || 'Morador'} - Unidade: ${m.unidade || ''} ${m.bloco ? '• Bl ' + m.bloco : ''} - Tel: ${m.telefone || 'N/I'}`,
            detalhes: m,
            criado_em: m.created_at || new Date().toISOString()
          });
        });

        const operadores = await consultarTabelaResiliente('operadores', ['created_at', 'criado_em']);
        operadores.forEach((op: any) => {
          listaConsolidada.push({
            id: `opr_${op.id}`,
            condominio_id: op.condominio_id,
            operador_id: null,
            operador_nome: 'Administração',
            modulo: 'Cadastros',
            acao: 'CRIAR',
            descricao: `Operador da portaria cadastrado: ${op.nome || op.login} (${op.perfil || 'Portaria'})`,
            detalhes: op,
            criado_em: op.created_at || new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn('[Auditoria] Falha ao agregar cadastros:', err);
      }
    })());
  }

  // Aguarda todas as consultas em paralelo
  await Promise.allSettled(promisesModulos);

  // 3. Mescla com o cache local para não perder eventos imediatos
  const locais = obterHistoricoCacheLocal();
  locais.forEach(l => {
    if (!listaConsolidada.some(r => r.id === l.id)) {
      listaConsolidada.push(l);
    }
  });

  // 4. Aplicação dos Filtros no Conjunto Consolidado
  let resultado = listaConsolidada;

  // Filtro de Condomínio
  if (condoId) {
    resultado = resultado.filter(r => !r.condominio_id || r.condominio_id === condoId);
  }

  // Filtro de Módulo
  if (moduloFiltro) {
    resultado = resultado.filter(r => 
      r.modulo.toLowerCase().includes(moduloFiltro.toLowerCase()) || 
      moduloFiltro.toLowerCase().includes(r.modulo.toLowerCase())
    );
  }

  // Filtro de Ação
  if (filtros.acao && filtros.acao !== 'todas') {
    resultado = resultado.filter(r => r.acao.toUpperCase() === filtros.acao?.toUpperCase());
  }

  // Filtro de Operador
  if (filtros.operador_id && filtros.operador_id !== 'todos') {
    resultado = resultado.filter(r => r.operador_id === filtros.operador_id);
  }

  // Filtro de Data Inicial
  if (filtros.dataInicio) {
    const tInicio = new Date(`${filtros.dataInicio}T00:00:00.000Z`).getTime();
    resultado = resultado.filter(r => new Date(r.criado_em).getTime() >= tInicio);
  }

  // Filtro de Data Final
  if (filtros.dataFim) {
    const tFim = new Date(`${filtros.dataFim}T23:59:59.999Z`).getTime();
    resultado = resultado.filter(r => new Date(r.criado_em).getTime() <= tFim);
  }

  // Filtro de Busca Textual
  if (filtros.termoBusca && filtros.termoBusca.trim()) {
    const termo = filtros.termoBusca.toLowerCase().trim();
    resultado = resultado.filter(r => 
      (r.descricao || '').toLowerCase().includes(termo) ||
      (r.operador_nome || '').toLowerCase().includes(termo) ||
      (r.modulo || '').toLowerCase().includes(termo) ||
      (r.acao || '').toLowerCase().includes(termo)
    );
  }

  // 5. Ordenação decrescente por data/hora (mais recentes no topo)
  resultado.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  // Deduplicação final por id
  const mapaUnicos = new Map<string, RegistroAuditoria>();
  resultado.forEach(r => {
    if (!mapaUnicos.has(r.id)) mapaUnicos.set(r.id, r);
  });
  const finais = Array.from(mapaUnicos.values()).slice(0, limite);

  return {
    registros: finais,
    total: finais.length,
    fonte: 'supabase'
  };
}

/**
 * Consulta quantidade de registros em uma tabela específica dentro de um intervalo de datas
 * com descoberta dinâmica inteligente do campo de data e pré-visualização de amostras.
 */
export async function consultarRegistrosTabelaPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
}): Promise<{ 
  total: number; 
  campoDataUsado: string; 
  amostras?: any[]; 
  detalhesPorTabela?: { id: string; nomeAmigavel: string; modulo: string; total: number; campoData: string }[];
  erro?: string 
}> {
  // CASO 1: Consulta global de TODAS as tabelas operacionais
  if (params.tabela === 'todas_tabelas') {
    const tabelasParaVerificar = TABELAS_LIMPAGEM.filter(t => t.id !== 'todas_tabelas');
    const detalhes: { id: string; nomeAmigavel: string; modulo: string; total: number; campoData: string }[] = [];
    const amostrasConsolidadas: any[] = [];
    let somaTotal = 0;

    for (const t of tabelasParaVerificar) {
      try {
        const subRes = await consultarRegistrosTabelaPeriodo({
          tabela: t.id,
          dataInicio: params.dataInicio,
          dataFim: params.dataFim,
          condominio_id: params.condominio_id
        });
        detalhes.push({
          id: t.id,
          nomeAmigavel: t.nomeAmigavel,
          modulo: t.modulo,
          total: subRes.total,
          campoData: subRes.campoDataUsado
        });
        somaTotal += subRes.total;
        if (subRes.amostras && subRes.amostras.length > 0) {
          amostrasConsolidadas.push(...subRes.amostras.slice(0, 2).map(a => ({ ...a, __tabela_origem: t.nomeAmigavel })));
        }
      } catch (err: any) {
        detalhes.push({
          id: t.id,
          nomeAmigavel: t.nomeAmigavel,
          modulo: t.modulo,
          total: 0,
          campoData: t.campoData
        });
      }
    }

    return {
      total: somaTotal,
      campoDataUsado: 'Todas as tabelas (conforme esquema de cada módulo)',
      amostras: amostrasConsolidadas.slice(0, 8),
      detalhesPorTabela: detalhes
    };
  }

  // CASO 2: Tabela individual
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const candidatos = CANDIDATOS_CAMPOS_DATA[params.tabela] || [def?.campoData || 'created_at', 'criado_em'];

  let ultimoErro: string | undefined;

  for (const campo of candidatos) {
    try {
      let q = supabase
        .from(params.tabela)
        .select('*', { count: 'exact', head: true });

      if (params.condominio_id && def?.campoCondominio) {
        q = q.eq(def.campoCondominio, params.condominio_id);
      }

      if (params.dataInicio) {
        q = q.gte(campo, `${params.dataInicio}T00:00:00.000Z`);
      }
      if (params.dataFim) {
        q = q.lte(campo, `${params.dataFim}T23:59:59.999Z`);
      }

      const { count, error } = await q;

      if (!error) {
        // Amostras para pré-visualização
        let qAmostra = supabase
          .from(params.tabela)
          .select('*')
          .limit(5);

        if (params.condominio_id && def?.campoCondominio) {
          qAmostra = qAmostra.eq(def.campoCondominio, params.condominio_id);
        }
        if (params.dataInicio) {
          qAmostra = qAmostra.gte(campo, `${params.dataInicio}T00:00:00.000Z`);
        }
        if (params.dataFim) {
          qAmostra = qAmostra.lte(campo, `${params.dataFim}T23:59:59.999Z`);
        }

        const { data: amostrasData } = await qAmostra;

        return {
          total: count || 0,
          campoDataUsado: campo,
          amostras: (amostrasData || []).map(a => ({ ...a, __tabela_origem: def?.nomeAmigavel || params.tabela }))
        };
      } else {
        ultimoErro = error.message;
      }
    } catch (err: any) {
      ultimoErro = err.message;
    }
  }

  return { total: 0, campoDataUsado: def?.campoData || 'created_at', erro: ultimoErro };
}

/**
 * Exporta registros que serão apagados como backup de segurança (JSON)
 */
export async function baixarBackupSegurancaPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
}): Promise<any> {
  // Backup de todas as tabelas
  if (params.tabela === 'todas_tabelas') {
    const tabelasParaExportar = TABELAS_LIMPAGEM.filter(t => t.id !== 'todas_tabelas');
    const bundle: Record<string, any[]> = {};

    for (const t of tabelasParaExportar) {
      const dadosTabela = await baixarBackupSegurancaPeriodo({
        tabela: t.id,
        dataInicio: params.dataInicio,
        dataFim: params.dataFim,
        condominio_id: params.condominio_id
      });
      if (Array.isArray(dadosTabela) && dadosTabela.length > 0) {
        bundle[t.id] = dadosTabela;
      }
    }

    return {
      sistema: 'INFPORT 1.0 - Portaria Digital',
      tipo_backup: 'EXPURGO_GLOBAL_PERIODO',
      periodo: { inicio: params.dataInicio, fim: params.dataFim },
      condominio_id: params.condominio_id || 'TODOS',
      data_geracao: new Date().toISOString(),
      tabelas: bundle
    };
  }

  // Backup de tabela individual
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const consulta = await consultarRegistrosTabelaPeriodo(params);
  const campoData = consulta.campoDataUsado || def?.campoData || 'created_at';

  try {
    let query = supabase
      .from(params.tabela)
      .select('*')
      .order(campoData, { ascending: true })
      .limit(5000);

    if (params.condominio_id && def?.campoCondominio) {
      query = query.eq(def.campoCondominio, params.condominio_id);
    }
    if (params.dataInicio) {
      query = query.gte(campoData, `${params.dataInicio}T00:00:00.000Z`);
    }
    if (params.dataFim) {
      query = query.lte(campoData, `${params.dataFim}T23:59:59.999Z`);
    }

    const { data } = await query;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * EXECUÇÃO CONTROLADA DE LIMPEZA / EXPURGO POR PERÍODO (Exclusivo para Administrador)
 * Apaga dados de qualquer tabela ou de todas as tabelas operacionais pelo período selecionado,
 * sincroniza cache local e gera registro obrigatório e imutável de auditoria no Histórico Absoluto!
 */
export async function executarLimpezaTabelaPorPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
  operador: {
    id?: string;
    nome: string;
    login?: string;
    perfil?: string;
  };
  motivo?: string;
}): Promise<{ sucesso: boolean; registrosRemovidos: number; detalheRemocao?: Record<string, number>; erro?: string }> {
  // CASO 1: Limpeza Completa de TODAS as Tabelas Operacionais
  if (params.tabela === 'todas_tabelas') {
    // Ordem estrita de exclusão para não violar chaves estrangeiras:
    // Exclui tabelas dependentes (filhas) primeiro, depois tabelas mestres (pais)
    const ordemExclusao = [
      'encomendas_itens',
      'rondas_registros',
      'prestadores_acessos',
      'lotes_re',
      'rondas_execucao',
      'prestadores',
      'custodia',
      'movimentacao_chaves',
      'ocorrencias',
      'chamados_manutencao',
      'checklist_manutencao',
      'passagens_posto',
      'materiais_posto',
      'historico_absoluto'
    ];

    let totalGeral = 0;
    const mapaRemovidos: Record<string, number> = {};

    for (const tabId of ordemExclusao) {
      try {
        const resTab = await executarLimpezaTabelaPorPeriodo({
          tabela: tabId,
          dataInicio: params.dataInicio,
          dataFim: params.dataFim,
          condominio_id: params.condominio_id,
          operador: params.operador,
          motivo: `${params.motivo || 'Rotina de expurgo periódico global'} (Parte do expurgo consolidado)`
        });
        if (resTab.sucesso && resTab.registrosRemovidos > 0) {
          mapaRemovidos[tabId] = resTab.registrosRemovidos;
          totalGeral += resTab.registrosRemovidos;
        }
      } catch (err: any) {
        console.warn(`[Auditoria] Aviso ao expurgar tabela ${tabId} no pacote global:`, err.message);
      }
    }

    // Registro consolidado de auditoria
    await registrarAtividade({
      modulo: 'Limpeza de Dados',
      acao: 'LIMPEZA_PERIODO',
      descricao: `Administrador ${params.operador.nome} executou EXPURGO GLOBAL em todas as tabelas no período de ${formatarDataBr(params.dataInicio)} até ${formatarDataBr(params.dataFim)}. Total de registros removidos: ${totalGeral}. Motivo: ${params.motivo || 'Rotina de expurgo periódico'}.`,
      detalhes: {
        tipo: 'EXPURGO_GLOBAL',
        detalhePorTabela: mapaRemovidos,
        dataInicio: params.dataInicio,
        dataFim: params.dataFim,
        registrosRemovidos: totalGeral,
        motivo: params.motivo || 'Expurgo periódico de rotina administrativa',
        executadoPor: params.operador
      },
      operador_nome: params.operador.nome,
      operador_id: params.operador.id,
      operador_login: params.operador.login,
      condominio_id: params.condominio_id
    });

    return {
      sucesso: true,
      registrosRemovidos: totalGeral,
      detalheRemocao: mapaRemovidos
    };
  }

  // CASO 2: Tabela individual
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const nomeTabela = def ? def.nomeAmigavel : params.tabela;

  try {
    const consulta = await consultarRegistrosTabelaPeriodo({
      tabela: params.tabela,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      condominio_id: params.condominio_id
    });

    if (consulta.erro && consulta.total === 0) {
      throw new Error(`Não foi possível localizar registros com os campos de data disponíveis: ${consulta.erro}`);
    }

    const campoReal = consulta.campoDataUsado || def?.campoData || 'created_at';
    const registrosRemovidos = consulta.total || 0;

    // Executa a exclusão no Supabase
    let deleteQuery = supabase.from(params.tabela).delete();

    if (params.condominio_id && def?.campoCondominio) {
      deleteQuery = deleteQuery.eq(def.campoCondominio, params.condominio_id);
    }
    deleteQuery = deleteQuery
      .gte(campoReal, `${params.dataInicio}T00:00:00.000Z`)
      .lte(campoReal, `${params.dataFim}T23:59:59.999Z`);

    const { error } = await deleteQuery;

    if (error) {
      throw new Error(error.message);
    }

    // Se for a tabela historico_absoluto, também purga do cache local do navegador
    if (params.tabela === 'historico_absoluto') {
      try {
        const tInicio = new Date(`${params.dataInicio}T00:00:00.000Z`).getTime();
        const tFim = new Date(`${params.dataFim}T23:59:59.999Z`).getTime();
        const raw = localStorage.getItem('infport_historico_absoluto_cache_v1');
        if (raw) {
          const lista = JSON.parse(raw);
          const filtrados = lista.filter((r: any) => {
            const t = new Date(r.criado_em).getTime();
            return t < tInicio || t > tFim;
          });
          localStorage.setItem('infport_historico_absoluto_cache_v1', JSON.stringify(filtrados));
        }
      } catch (errCache) {
        console.warn('Aviso ao expurgar cache local:', errCache);
      }
    }

    // REGISTRO OBRIGATÓRIO E IMUTÁVEL DE AUDITORIA NO HISTÓRICO ABSOLUTO
    await registrarAtividade({
      modulo: 'Limpeza de Dados',
      acao: 'LIMPEZA_PERIODO',
      descricao: `Administrador ${params.operador.nome} executou expurgo na tabela [${nomeTabela}] no período de ${formatarDataBr(params.dataInicio)} até ${formatarDataBr(params.dataFim)}. Total de registros removidos: ${registrosRemovidos}. Motivo: ${params.motivo || 'Rotina de expurgo periódico'}.`,
      detalhes: {
        tabela: params.tabela,
        nomeTabela,
        campoDataUsado: campoReal,
        dataInicio: params.dataInicio,
        dataFim: params.dataFim,
        registrosRemovidos,
        motivo: params.motivo || 'Expurgo periódico de rotina administrativa',
        executadoPor: params.operador
      },
      operador_nome: params.operador.nome,
      operador_id: params.operador.id,
      operador_login: params.operador.login,
      condominio_id: params.condominio_id
    });

    return {
      sucesso: true,
      registrosRemovidos
    };
  } catch (err: any) {
    console.error(`[Auditoria] Falha ao executar limpeza na tabela ${params.tabela}:`, err);
    return {
      sucesso: false,
      registrosRemovidos: 0,
      erro: err.message || 'Erro desconhecido ao executar exclusão no banco'
    };
  }
}

function formatarDataBr(dataStr: string): string {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  if (ano && mes && dia) {
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
}
