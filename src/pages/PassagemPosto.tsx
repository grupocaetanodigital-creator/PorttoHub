import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Repeat, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck, 
  Lock, 
  MessageCircle, 
  FileCheck2, 
  ShieldCheck, 
  Clock, 
  User, 
  CheckSquare, 
  Square, 
  Key, 
  Radio, 
  Wrench, 
  Package, 
  Box, 
  Footprints, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  HardHat, 
  Phone, 
  Calendar, 
  Building, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert,
  Copy,
  Check,
  Share2,
  Table,
  CheckCircle,
  XCircle,
  FileText,
  Layers,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { 
  carregarCondominioConfig, 
  calcularPlantaoVigente, 
  CondominioConfig 
} from '../services/condominioService';
import TabelasResumoPosto from '../components/TabelasResumoPosto';
import { dispararNotificacaoModuloWhatsApp, carregarConfigWhatsApp, formatarLinkWhatsApp } from '../services/configWhatsappService';
import { registrarAtividade } from '../services/auditoriaService';
import { 
  carregarItensBancada, 
  agruparItensPorEstrutura, 
  sincronizarComEncomendasRetidas,
  ItemBancada, 
  EstruturaResumoBancada 
} from '../services/bancadaService';
import { checarEDispararAlarmeTrocaPlantao } from '../services/lembretesService';

interface PassagemPostoProps {
  usuarioLogado?: any;
  condominioConfig?: any;
  onVoltar?: () => void;
  onTrocarOperador?: (novoOperador: any) => void;
  featureFlags?: any;
  onNavegar?: (modulo: string, params?: any) => void;
}

export function isModuloHabilitado(modulo: string, flags?: any): boolean {
  if (!flags || typeof flags !== 'object') return true;
  const f = (flags.feature_flags && typeof flags.feature_flags === 'object')
    ? { ...flags.feature_flags, ...flags }
    : flags;

  const isDesabilitado = (val: any) => val === false || val === 'false' || val === 0;

  switch (modulo) {
    case 'encomendas':
      return !isDesabilitado(f.mod02_gestao_encomendas) && !isDesabilitado(f.encomendas);
    case 'bancada':
      return !isDesabilitado(f.mod11_bancada_conferencia) && !isDesabilitado(f.bancada);
    case 'rondas':
      return !isDesabilitado(f.mod07_gestao_ronda) && !isDesabilitado(f.rondas);
    case 'chaves':
      return !isDesabilitado(f.mod05_quadro_chaves) && !isDesabilitado(f.chaves);
    case 'prestadores':
      return !isDesabilitado(f.mod10_prestadores_servico) && !isDesabilitado(f.prestadores);
    case 'custodia':
      return !isDesabilitado(f.mod03_custodia_itens) && !isDesabilitado(f.custodia);
    case 'materiais':
      return !isDesabilitado(f.mod04_materiais_posto) && !isDesabilitado(f.materiais);
    case 'ocorrencias':
      return !isDesabilitado(f.mod08_livro_ocorrencias) && !isDesabilitado(f.ocorrencias);
    case 'manutencao':
      return !isDesabilitado(f.mod06_gestao_manutencao) && !isDesabilitado(f.manutencao);
    default:
      return true;
  }
}

export function carregarFlagsCondominioLocal(condominioId?: string): Record<string, boolean> {
  const padroes: Record<string, boolean> = {
    mod01_cadastros_base: true,
    mod02_gestao_encomendas: true,
    mod03_custodia_itens: true,
    mod04_materiais_posto: true,
    mod05_quadro_chaves: true,
    mod06_gestao_manutencao: true,
    mod07_gestao_ronda: true,
    mod08_livro_ocorrencias: true,
    mod09_passagem_posto: true,
    mod10_prestadores_servico: true,
    mod11_bancada_conferencia: true,
    mod12_historico_absoluto: true,
    mod_portal_sindico: true
  };
  if (!condominioId) return padroes;
  try {
    const raw = localStorage.getItem(`infport_flags_${condominioId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...padroes, ...parsed };
    }
  } catch {}
  return padroes;
}

export interface ConsolidacaoPosto {
  plantaoInicio: string;
  plantaoFim: string;
  plantaoHoras: number;
  
  // 1. Encomendas / RE
  encomendas: {
    totalRePlantao: number;
    reFaltandoTriagem: number;
    qtdFaltaTriagem: number;
    qtdPacotesTriadosPlantao: number;
    qtdPacotesRetiradosPlantao: number;
    totalRetidasNoPosto: number;
    lotesPendentes: Array<{
      id: string;
      codigo: string;
      entregadorNome: string;
      entregadorEmpresa: string;
      qtdDeclarada: number;
      qtdTriada: number;
      status: string;
    }>;
    retidasPorBloco?: Record<string, { total: number; unidades: string[] }>;
  };

  // 2. Rondas
  rondas: {
    totalExecutadasPlantao: number;
    concluidas: number;
    incompletas: number;
    temDivergencias: boolean;
    rondaAtivaNaoFinalizada: boolean;
    listaDivergencias: string[];
    rondasRecentes: Array<{
      id: string;
      operador: string;
      inicio: string;
      fim?: string;
      status: string;
      pontosLidos: number;
      pontosTotais: number;
    }>;
  };

  // 3. Chaves fora do quadro
  chaves: {
    totalFora: number;
    totalCadastradas?: number;
    listaChavesFora: Array<{
      id: string;
      nomeChave: string;
      codigoChave: string;
      setor: string;
      comQuemTa: string;
      documento: string;
      empresaOuApto: string;
      telefone: string;
      retiradaEm: string;
      previsaoDevolucao: string;
      atrasado: boolean;
      motivo?: string;
    }>;
  };

  // 4. Prestadores e Autorizados no condomínio (Presentes e Liberados)
  prestadores: {
    totalPresentes: number;
    listaPresentes: Array<{
      id: string;
      nome: string;
      empresa: string;
      documento: string;
      destino: string;
      cracha: string;
      entradaEm: string;
      tipoServico?: string;
      telefone?: string;
      perfil?: string;
      estourado?: boolean;
    }>;
    totalLiberados: number;
    listaLiberados: Array<{
      id: string;
      nome: string;
      empresa: string;
      documento: string;
      destino: string;
      perfil: string;
      validade: string;
      telefone?: string;
    }>;
  };

  // 5. Custódia
  custodia: {
    totalAguardando: number;
    listaCustodias: Array<{
      id: string;
      codigo: string;
      descricao: string;
      origem: string;
      destino: string;
      entradaEm: string;
      fotoUrl?: string;
    }>;
  };

  // 6. Materiais
  materiais: {
    totalEquipamentos: number;
    perfeitos: number;
    avariados: number;
    listaAvariados: Array<{
      id: string;
      nome: string;
      categoria: string;
      codigoPatrimonio?: string;
      estado: string;
      observacao?: string;
      fotoUrl?: string;
    }>;
    alteracoesPlantao: Array<{
      id: string;
      tipo: string;
      detalhe: any;
      operador: string;
      timestamp: string;
    }>;
  };

  // 7. Ocorrências
  ocorrencias: {
    totalPendentes: number;
    listaPendentes: Array<{
      id: string;
      titulo: string;
      descricao: string;
      prioridade: string;
      tipo: string;
      unidadeBloco?: string;
      operador: string;
      criadaEm: string;
      diasEmAberto: number;
      fotoUrl?: string;
    }>;
  };

  // 8. Bancada (Balcão Físico)
  bancada?: {
    totalVolumes: number;
    totalUnidades: number;
    estruturasResumo: EstruturaResumoBancada[];
    itens: ItemBancada[];
  };
}

const estadoInicialConsolidacao: ConsolidacaoPosto = {
  plantaoInicio: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  plantaoFim: new Date().toISOString(),
  plantaoHoras: 12,
  encomendas: {
    totalRePlantao: 0,
    reFaltandoTriagem: 0,
    qtdFaltaTriagem: 0,
    qtdPacotesTriadosPlantao: 0,
    qtdPacotesRetiradosPlantao: 0,
    totalRetidasNoPosto: 0,
    lotesPendentes: []
  },
  bancada: {
    totalVolumes: 0,
    totalUnidades: 0,
    estruturasResumo: [],
    itens: []
  },
  rondas: {
    totalExecutadasPlantao: 0,
    concluidas: 0,
    incompletas: 0,
    temDivergencias: false,
    rondaAtivaNaoFinalizada: false,
    listaDivergencias: [],
    rondasRecentes: []
  },
  chaves: {
    totalFora: 0,
    listaChavesFora: []
  },
  prestadores: {
    totalPresentes: 0,
    listaPresentes: [],
    totalLiberados: 0,
    listaLiberados: []
  },
  custodia: {
    totalAguardando: 0,
    listaCustodias: []
  },
  materiais: {
    totalEquipamentos: 0,
    perfeitos: 0,
    avariados: 0,
    listaAvariados: [],
    alteracoesPlantao: []
  },
  ocorrencias: {
    totalPendentes: 0,
    listaPendentes: []
  }
};

export default function PassagemPosto({ 
  usuarioLogado, 
  condominioConfig: propCondominioConfig, 
  onVoltar, 
  onTrocarOperador, 
  featureFlags: propFlags,
  onNavegar 
}: PassagemPostoProps) {
  const [featureFlags, setFeatureFlags] = useState<any>(propFlags || null);
  const [passagens, setPassagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAuditoria, setLoadingAuditoria] = useState(false);
  const [verificandoChecklistBancada, setVerificandoChecklistBancada] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [condominioConfig, setCondominioConfig] = useState<CondominioConfig | null>(propCondominioConfig || null);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [modalCompartilharWhatsApp, setModalCompartilharWhatsApp] = useState<any | null>(null);

  const [modalNova, setModalNova] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [loginEntrante, setLoginEntrante] = useState('');
  const [senhaEntrante, setSenhaEntrante] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [divergencia, setDivergencia] = useState('');
  const [temDivergencia, setTemDivergencia] = useState(false);

  // Estados de operadores para autenticação, seleção rápida e efetivação no posto (Etapa 3)
  const [listaOperadores, setListaOperadores] = useState<any[]>([]);
  const [operadorSelecionadoEntrante, setOperadorSelecionadoEntrante] = useState<any | null>(null);
  const [mostrarSenhaEntrante, setMostrarSenhaEntrante] = useState(false);
  const [modalSucessoTroca, setModalSucessoTroca] = useState<any | null>(null);

  // Módulo ativo para visualização detalhada na etapa 1
  const [moduloAtivo, setModuloAtivo] = useState<string>('todos');

  // Estado consolidado completo
  const [consolidacao, setConsolidacao] = useState<ConsolidacaoPosto>(estadoInicialConsolidacao);

  // Modal para ver relatório histórico completo
  const [modalHistoricoDetalhes, setModalHistoricoDetalhes] = useState<any | null>(null);

  // 1. Configuração de auditoria dos módulos do sistema
  const modulosAuditConfig: Array<{ key: string; label: string }> = [
    { key: 'encomendas', label: 'Módulo 02: Gestão de Encomendas & RE' },
    { key: 'bancada', label: 'Módulo 11: Bancada Física do Posto' },
    { key: 'rondas', label: 'Módulo 07: Rondas Patrimoniais' },
    { key: 'chaves', label: 'Módulo 05: Quadro de Chaves' },
    { key: 'prestadores', label: 'Módulo 10: Prestadores & Autorizados' },
    { key: 'custodia', label: 'Módulo 03: Custódia na Portaria' },
    { key: 'materiais', label: 'Módulo 04: Equipamentos & Materiais' },
    { key: 'ocorrencias', label: 'Módulo 08: Livro de Ocorrências' }
  ];

  const [auditModulos, setAuditModulos] = useState<Record<string, { status: 'ok' | 'divergente' | null; obs: string }>>({
    encomendas: { status: null, obs: '' },
    bancada: { status: null, obs: '' },
    rondas: { status: null, obs: '' },
    chaves: { status: null, obs: '' },
    prestadores: { status: null, obs: '' },
    custodia: { status: null, obs: '' },
    materiais: { status: null, obs: '' },
    ocorrencias: { status: null, obs: '' }
  });

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    encomendasOk: true,
    bancadaOk: true,
    custodiaOk: true,
    materiaisOk: true,
    chavesOk: true,
    rondasOk: true,
    prestadoresOk: true,
    ocorrenciasCientes: true,
    limpezaOk: true
  });

  // Totalizadores de auditoria obrigatória considerando APENAS os módulos habilitados para o condomínio em questão
  const modulosObrigatoriosAtivos = modulosAuditConfig.filter(m => isModuloHabilitado(m.key, featureFlags));
  const totalModulosObrigatorios = modulosObrigatoriosAtivos.length;
  const totalModulosAvaliados = modulosObrigatoriosAtivos.filter(m => auditModulos[m.key]?.status !== null).length;
  const checklistCompletoValido = totalModulosAvaliados === totalModulosObrigatorios;

  const marcarTodosModulosOk = () => {
    setAuditModulos(prev => {
      const atualizado: Record<string, { status: 'ok' | 'divergente' | null; obs: string }> = { ...prev };
      modulosObrigatoriosAtivos.forEach(m => {
        atualizado[m.key] = {
          status: 'ok',
          obs: ''
        };
      });
      return atualizado;
    });
  };

  const carregarOperadores = async () => {
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('id, nome, login, perfil, foto_url, nivel_acesso, condominio_id, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao carregar operadores para passagem:', error);
        return;
      }

      if (data) {
        const condId = usuarioLogado?.condominio_id;
        const opsDoPosto = data.filter(op => {
          if (op.id === usuarioLogado?.id) return false;
          if (!condId) return true;
          return op.condominio_id === condId || !op.condominio_id || op.condominio_id === '00000000-0000-0000-0000-000000000001' || op.perfil === 'admin' || op.nivel_acesso === 0;
        });
        setListaOperadores(opsDoPosto.length > 0 ? opsDoPosto : data.filter(op => op.id !== usuarioLogado?.id));
      }
    } catch (err) {
      console.error('Erro ao carregar lista de operadores:', err);
    }
  };

  useEffect(() => {
    if (propFlags) {
      setFeatureFlags(propFlags);
    } else if (usuarioLogado?.condominio_id) {
      const local = carregarFlagsCondominioLocal(usuarioLogado.condominio_id);
      if (local) setFeatureFlags(local);
    }
  }, [propFlags, usuarioLogado?.condominio_id]);

  useEffect(() => {
    if (usuarioLogado?.condominio_id) {
      carregarPassagens();
      carregarConfigEConsolidar(usuarioLogado.condominio_id);
    }
    carregarOperadores();
  }, [usuarioLogado?.condominio_id]);

  const carregarConfigEConsolidar = async (condId: string) => {
    const cfg = await carregarCondominioConfig(condId);
    setCondominioConfig(cfg);

    try {
      const { data: cfgDb } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', condId)
        .maybeSingle();

      if (cfgDb) {
        const ff = typeof cfgDb.feature_flags === 'object' && cfgDb.feature_flags !== null ? cfgDb.feature_flags : {};
        const resolverFlag = (chave: string) => {
          if (ff[chave] !== undefined && ff[chave] !== null) return Boolean(ff[chave]);
          if ((cfgDb as any)[chave] !== undefined && (cfgDb as any)[chave] !== null) return Boolean((cfgDb as any)[chave]);
          return true;
        };
        const flagsAtualizadas = {
          mod01_cadastros_base: resolverFlag('mod01_cadastros_base'),
          mod02_gestao_encomendas: resolverFlag('mod02_gestao_encomendas'),
          mod03_custodia_itens: resolverFlag('mod03_custodia_itens'),
          mod04_materiais_posto: resolverFlag('mod04_materiais_posto'),
          mod05_quadro_chaves: resolverFlag('mod05_quadro_chaves'),
          mod06_gestao_manutencao: resolverFlag('mod06_gestao_manutencao'),
          mod07_gestao_ronda: resolverFlag('mod07_gestao_ronda'),
          mod08_livro_ocorrencias: resolverFlag('mod08_livro_ocorrencias'),
          mod09_passagem_posto: resolverFlag('mod09_passagem_posto'),
          mod10_prestadores_servico: resolverFlag('mod10_prestadores_servico'),
          mod11_bancada_conferencia: resolverFlag('mod11_bancada_conferencia'),
          mod12_historico_absoluto: resolverFlag('mod12_historico_absoluto'),
          mod_portal_sindico: resolverFlag('mod_portal_sindico')
        };
        setFeatureFlags(flagsAtualizadas);
        localStorage.setItem(`infport_flags_${condId}`, JSON.stringify(flagsAtualizadas));
      }
    } catch (e) {
      console.warn('Erro ao carregar flags do condomínio:', e);
    }

    await consolidarModulosPosto(cfg);
  };

  const carregarPassagens = async () => {
    if (!usuarioLogado?.condominio_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('passagens_posto')
        .select('*')
        .eq('condominio_id', usuarioLogado.condominio_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPassagens(data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar histórico: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const abrirNovaPassagem = async () => {
    const condId = usuarioLogado?.condominio_id;
    if (!condId) {
      setMensagem({ tipo: 'erro', texto: 'Condomínio não identificado no login.' });
      return;
    }

    setVerificandoChecklistBancada(true);
    setMensagem({ tipo: 'aviso', texto: 'Atualizando a bancada com encomendas pendentes e verificando o checklist...' });

    try {
      // 1. O app vai atualizar a bancada com todas as encomendas que tiverem pendentes
      const syncResult = await sincronizarComEncomendasRetidas(
        condId, 
        usuarioLogado?.nome || usuarioLogado?.login || 'Portaria', 
        true
      );

      // Carrega os itens atualizados da bancada
      const itensBancada = (syncResult?.itens && syncResult.itens.length > 0)
        ? syncResult.itens
        : await carregarItensBancada(condId);

      // 2. Lê os itens conferidos no checklist físico de balcão
      let checklistMap: Record<string, boolean> = {};
      try {
        const salvo = localStorage.getItem(`bancada_checklist_${condId}`);
        if (salvo) checklistMap = JSON.parse(salvo);
      } catch {}

      // Verifica itens pendentes no checklist
      const itensPendentesChecklist = (itensBancada || []).filter(it => !checklistMap[it.id]);

      if (itensPendentesChecklist.length > 0) {
        // CASO TIVER ENCOMENDAS PENDENTES DE CHECKLIST:
        // O OPERADOR SERÁ DIRECIONADO DIRETAMENTE PARA O CHECKLIST!
        const totalVolumesPendentes = itensPendentesChecklist.reduce((acc, it) => acc + (it.volumes || 1), 0);

        sessionStorage.setItem('bancada_aba_ativa', 'checklist');
        sessionStorage.setItem('bancada_aviso_checklist', JSON.stringify({
          motivo: 'troca_de_turno',
          pendentesQtd: itensPendentesChecklist.length,
          totalVolumes: totalVolumesPendentes,
          timestamp: Date.now()
        }));

        setMensagem({
          tipo: 'aviso',
          texto: `Existem ${itensPendentesChecklist.length} encomenda(s) (${totalVolumesPendentes} volumes) pendentes no Checklist. Direcionando diretamente para o Checklist de Balcão...`
        });

        // Direciona imediatamente para o Checklist de Balcão na Bancada
        setTimeout(() => {
          if (onNavegar) {
            onNavegar('bancada', { aba: 'checklist' });
          } else {
            window.dispatchEvent(new CustomEvent('navegar_modulo', {
              detail: { modulo: 'bancada', aba: 'checklist' }
            }));
          }
        }, 350);

        return;
      }

      // SE TODAS TIVEREM NO CHECKLIST FEITO (ou sem encomendas ativas):
      // A TROCA DE TURNO SEGUE NORMALMENTE!
      setMensagem({ tipo: '', texto: '' });
      setModalNova(true);
      setEtapa(1);
      setModuloAtivo('todos');
      setOperadorSelecionadoEntrante(null);
      setLoginEntrante('');
      setSenhaEntrante('');
      setMostrarSenhaEntrante(false);
      setAuditModulos({
        encomendas: { status: null, obs: '' },
        bancada: { status: null, obs: '' },
        rondas: { status: null, obs: '' },
        chaves: { status: null, obs: '' },
        prestadores: { status: null, obs: '' },
        custodia: { status: null, obs: '' },
        materiais: { status: null, obs: '' },
        ocorrencias: { status: null, obs: '' }
      });
      setTemDivergencia(false);
      setDivergencia('');
      setObservacoes('');

      carregarOperadores();
      await consolidarModulosPosto();
    } catch (err: any) {
      console.error('Erro na validação do checklist para troca de turno:', err);
      // Fallback em caso de erro para não travar a operação da guarita
      setModalNova(true);
      setEtapa(1);
      carregarOperadores();
      await consolidarModulosPosto();
    } finally {
      setVerificandoChecklistBancada(false);
    }
  };

  const consolidarModulosPosto = async (cfgParam?: CondominioConfig) => {
    const condId = usuarioLogado?.condominio_id;
    if (!condId) return;

    setLoadingAuditoria(true);
    try {
      const cfg = cfgParam || condominioConfig || await carregarCondominioConfig(condId);
      if (!condominioConfig) setCondominioConfig(cfg);

      // 0. Determinar intervalo do plantão atual com base na escala configurada do condomínio
      const vig = calcularPlantaoVigente(cfg, new Date());
      let plantaoInicioDate = vig.inicio;

      const { data: ultimasPassagens } = await supabase
        .from('passagens_posto')
        .select('created_at')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (ultimasPassagens && ultimasPassagens.length > 0 && ultimasPassagens[0].created_at) {
        const ultData = new Date(ultimasPassagens[0].created_at);
        // Se a última passagem ocorreu dentro do turno vigente (após o início do plantão), usamos a passagem
        if (ultData.getTime() > plantaoInicioDate.getTime() && (Date.now() - ultData.getTime() < 24 * 60 * 60 * 1000)) {
          plantaoInicioDate = ultData;
        }
      }

      const plantaoInicioStr = plantaoInicioDate.toISOString();
      const plantaoFimStr = new Date().toISOString();
      const diffMs = Date.now() - plantaoInicioDate.getTime();
      const plantaoHoras = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

      // 1. MÓDULO 02 - ENCOMENDAS & RE
      // 1.1 REs criadas no plantão
      const { data: lotesPlantao } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', condId)
        .gte('created_at', plantaoInicioStr);

      // 1.2 REs pendentes de triagem (todas que ainda faltam triagem geral)
      const { data: lotesPendentesGerais } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa)')
        .eq('condominio_id', condId)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });

      const lotesPendentesFormatados = (lotesPendentesGerais || []).map((l: any) => ({
        id: l.id,
        codigo: l.codigo || 'RE-LOTE',
        entregadorNome: l.entregadores?.nome || 'Não informado',
        entregadorEmpresa: l.entregadores?.empresa || 'Entregador',
        qtdDeclarada: Number(l.qtd_declarada) || 0,
        qtdTriada: Number(l.qtd_triada) || 0,
        status: l.status
      }));

      const totalRePlantao = lotesPlantao?.length || 0;
      const reFaltandoTriagem = lotesPendentesFormatados.length;
      const qtdFaltaTriagem = lotesPendentesFormatados.reduce(
        (acc: number, l: any) => acc + Math.max(0, l.qtdDeclarada - l.qtdTriada),
        0
      );

      // 1.3 Pacotes triados no plantão
      const { data: itensTriadosPlantao } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .gte('created_at', plantaoInicioStr);

      // 1.4 Pacotes entregues/retirados no plantão
      const { data: itensRetiradosPlantao } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .eq('status', 'entregue')
        .gte('data_retirada', plantaoInicioStr);

      // 1.5 Total de encomendas físicas retidas no posto aguardando moradores retirarem
      const { data: todosRetidosPosto } = await supabase
        .from('encomendas_itens')
        .select('id, bloco, unidade, observacoes, created_at')
        .eq('condominio_id', condId)
        .eq('status', 'retido');

      const retidasAgrupadasPorBloco: Record<string, { total: number; unidades: string[] }> = {};
      (todosRetidosPosto || []).forEach((enc: any) => {
        const bloco = (enc.bloco || 'Torre A').trim();
        const uni = String(enc.unidade || '').trim().toUpperCase();
        if (!uni) return;
        if (!retidasAgrupadasPorBloco[bloco]) {
          retidasAgrupadasPorBloco[bloco] = { total: 0, unidades: [] };
        }
        retidasAgrupadasPorBloco[bloco].total += 1;
        if (!retidasAgrupadasPorBloco[bloco].unidades.includes(uni)) {
          retidasAgrupadasPorBloco[bloco].unidades.push(uni);
        }
      });

      // 1.6 MÓDULO 11 - CONFERÊNCIA FÍSICA DE BANCADA (BALCÃO)
      const itensBancada = await carregarItensBancada(condId);
      const estruturasResumoBancada = agruparItensPorEstrutura(itensBancada);
      const totalVolumesBancada = itensBancada.reduce((acc, it) => acc + (it.volumes || 1), 0);
      const totalUnidadesBancada = itensBancada.length;

      // 2. MÓDULO 07 - RONDAS PATRIMONIAIS
      const { data: rondasPlantaoData } = await supabase
        .from('rondas_execucao')
        .select('*')
        .eq('condominio_id', condId)
        .gte('data_inicio', plantaoInicioStr)
        .order('data_inicio', { ascending: false });

      const rondasPlantao = rondasPlantaoData || [];
      const concluidasRondas = rondasPlantao.filter((r: any) => r.status === 'Concluída').length;
      const incompletasRondas = rondasPlantao.filter((r: any) => r.status === 'Incompleta' || (r.status !== 'Concluída' && r.status !== 'Em Andamento')).length;
      const rondaAtiva = rondasPlantao.some((r: any) => r.status === 'Em Andamento');

      const listaDivergenciasRonda: string[] = [];
      if (rondaAtiva) {
        listaDivergenciasRonda.push('Existe 1 ronda com status "Em Andamento" que não foi finalizada antes da troca de turno!');
      }

      rondasPlantao.forEach((r: any) => {
        if (r.status === 'Incompleta') {
          listaDivergenciasRonda.push(`Ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} finalizada incompleta (${r.pontos_lidos || 0} de ${r.pontos_totais || 0} pontos).`);
        }
        if (r.resumo_detalhado && (r.resumo_detalhado.includes('FORA DA ÁREA') || r.resumo_detalhado.includes('ALERTAS DE VALIDAÇÃO'))) {
          listaDivergenciasRonda.push(`Alerta antifraude GPS na ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: Ponto validado com distância acima do permitido!`);
        }
        if (r.resumo_detalhado && r.resumo_detalhado.includes('AVARIAS REGISTRADAS')) {
          listaDivergenciasRonda.push(`Avaria patrimonial apontada durante ronda das ${new Date(r.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
        }
      });

      const rondasRecentesFormatadas = rondasPlantao.slice(0, 5).map((r: any) => ({
        id: r.id,
        operador: r.operador_nome || 'Ronda',
        inicio: r.data_inicio,
        fim: r.data_fim,
        status: r.status,
        pontosLidos: r.pontos_lidos || 0,
        pontosTotais: r.pontos_totais || 0
      }));

      // 3. MÓDULO 05 - QUADRO DE CHAVES (Chaves fora do quadro, quem está com ela)
      let totalCadastradasChaves = 23;
      try {
        const { count: countChaves } = await supabase
          .from('chaves')
          .select('*', { count: 'exact', head: true })
          .eq('condominio_id', condId);
        if (countChaves !== null && countChaves !== undefined && countChaves > 0) {
          totalCadastradasChaves = countChaves;
        }
      } catch {}

      const { data: movsChavesData } = await supabase
        .from('movimentacao_chaves')
        .select('*, chaves(*)')
        .eq('condominio_id', condId)
        .eq('status', 'Em Andamento')
        .order('data_hora_retirada', { ascending: false });

      const agora = new Date();
      const listaChavesFora = (movsChavesData || []).map((m: any) => {
        const previsao = m.previsao_devolucao ? new Date(m.previsao_devolucao) : null;
        const atrasado = previsao ? agora > previsao : false;
        return {
          id: m.id,
          nomeChave: m.chaves?.nome_chave || m.nome_chave || 'Chave do Posto',
          codigoChave: m.chaves?.codigo_chave || m.codigo_chave || 'S/C',
          setor: m.chaves?.setor || 'Geral',
          comQuemTa: m.nome_retirante || 'Não informado',
          documento: m.documento_retirante || 'Não informado',
          empresaOuApto: m.empresa_ou_apto || 'Morador/Terceiro',
          telefone: m.telefone_retirante || 'Não informado',
          retiradaEm: m.data_hora_retirada,
          previsaoDevolucao: m.previsao_devolucao,
          atrasado,
          motivo: m.motivo_retirada
        };
      });

      // 4. MÓDULO 10 - AUTORIZADOS E PRESTADORES (PRESENTES E LIBERADOS NO CONDOMÍNIO)
      const { data: prestadoresData } = await supabase
        .from('prestadores')
        .select('*')
        .eq('condominio_id', condId)
        .order('data_hora_entrada', { ascending: false });

      const agoraTs = Date.now();
      const hojeStr = new Date().toISOString().slice(0, 10);

      // A) Pessoas que estão DENTRO do condomínio agora
      const prestadoresPresentes = (prestadoresData || []).filter((p: any) => {
        const st = (p.status_acesso || '').trim().toUpperCase();
        return st === 'DENTRO' || st === 'EM_ANDAMENTO' || st === 'PRESENTE' || st === 'EM ANDAMENTO';
      }).map((p: any) => {
        const estourado = Boolean(
          p.perfil_acesso !== 'autorizado' && 
          p.limite_permanencia_ate && 
          new Date(p.limite_permanencia_ate).getTime() < agoraTs
        );
        return {
          id: p.id,
          nome: p.nome_profissional || p.nome_completo || p.nome || 'Pessoa Autorizada',
          empresa: p.empresa || (p.perfil_acesso === 'autorizado' ? (p.parentesco_vinculo || 'Visitante/Família') : 'Autônomo'),
          documento: p.documento || 'Não informado',
          destino: `${p.unidade ? 'Ap. ' + p.unidade : (p.unidade_destino ? 'Ap. ' + p.unidade_destino : '')} ${p.bloco ? 'Bloco ' + p.bloco : (p.bloco_destino ? 'Bloco ' + p.bloco_destino : '')}`.trim() || 'Área Comum',
          cracha: p.cracha || p.cracha_atribuido || 'Portaria',
          entradaEm: p.data_hora_entrada || p.created_at,
          tipoServico: p.tipo_servico || p.tipo || (p.perfil_acesso === 'autorizado' ? 'Visita Familiar' : 'Prestação de Serviço'),
          telefone: p.telefone || 'Não informado',
          perfil: p.perfil_acesso || 'autorizado',
          estourado
        };
      });

      // B) Pessoas com autorizações ativas cadastradas (aguardando entrada)
      const autorizadosLiberados = (prestadoresData || []).filter((p: any) => {
        const st = (p.status_acesso || '').trim().toUpperCase();
        if (st === 'DENTRO' || st === 'EM_ANDAMENTO' || st === 'PRESENTE') return false;
        if (p.status === 'BLOQUEADO' || p.status_acesso === 'BLOQUEADO') return false;
        if (p.tipo_validade === 'permanente') return true;
        if (p.data_validade_fim && p.data_validade_fim >= hojeStr) return true;
        if (!p.data_validade_fim) return true;
        return false;
      }).map((p: any) => ({
        id: p.id,
        nome: p.nome_profissional || p.nome_completo || p.nome || 'Autorizado',
        empresa: p.empresa || (p.perfil_acesso === 'autorizado' ? (p.parentesco_vinculo || 'Familiar') : 'Serviço'),
        documento: p.documento || 'Não informado',
        destino: `${p.unidade ? 'Ap. ' + p.unidade : ''} ${p.bloco ? 'Bloco ' + p.bloco : ''}`.trim() || 'Área Comum',
        perfil: p.perfil_acesso || 'autorizado',
        validade: p.tipo_validade === 'permanente' ? 'Permanente' : `Até ${p.data_validade_fim ? new Date(p.data_validade_fim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'}`,
        telefone: p.telefone || 'Não informado'
      }));

      // 5. MÓDULO 03 - CUSTÓDIA DE OBJETOS NA PORTARIA
      const { data: custodiaData } = await supabase
        .from('custodia')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false });

      const itensCustodiaAguardando = (custodiaData || []).filter((c: any) => {
        const st = (c.status || '').trim().toLowerCase();
        return st === 'aguardando retirada' || st === 'retido' || st === 'pendente';
      }).map((c: any) => ({
        id: c.id,
        codigo: c.codigo_custodia || 'CUST',
        descricao: c.descricao || 'Item em custódia',
        origem: `${c.origem_nome_doc || 'Origem'} (${c.origem_unidade ? 'Ap. ' + c.origem_unidade : c.origem_tipo || 'Externo'})`,
        destino: `${c.destino_nome_doc || 'Destino'} (${c.destino_unidade ? 'Ap. ' + c.destino_unidade : c.destino_tipo || 'Morador'})`,
        entradaEm: c.created_at,
        fotoUrl: c.foto_entrada_url
      }));

      // 6. MÓDULO 04 - MATERIAIS DO POSTO E EQUIPAMENTOS
      const { data: materiaisData } = await supabase
        .from('materiais_posto')
        .select('*')
        .eq('condominio_id', condId)
        .order('nome');

      const materiaisLista = materiaisData || [];
      const materiaisAvariados = materiaisLista.filter((m: any) => m.estado && m.estado !== 'Perfeito').map((m: any) => ({
        id: m.id,
        nome: m.nome,
        categoria: m.categoria,
        codigoPatrimonio: m.codigo_patrimonio,
        estado: m.estado,
        observacao: m.observacao_avaria,
        fotoUrl: m.foto_avaria_url
      }));

      // Buscar log de alterações de materiais (adições, exclusões e mudanças de status)
      let alteracoesMateriais: any[] = [];
      try {
        const rawLog = localStorage.getItem(`infport_materiais_log_${condId}`);
        if (rawLog) {
          const parsed = JSON.parse(rawLog);
          if (Array.isArray(parsed)) {
            alteracoesMateriais = parsed.filter((item: any) => {
              const dt = new Date(item.timestamp).getTime();
              return dt >= plantaoInicioDate.getTime();
            });
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar log local de materiais:', e);
      }

      // Se houver materiais atualizados no plantão que não estão no log local
      materiaisLista.forEach((m: any) => {
        if (m.updated_at && new Date(m.updated_at).getTime() >= plantaoInicioDate.getTime()) {
          const jaTem = alteracoesMateriais.some((a: any) => a.detalhe?.id === m.id || a.detalhe?.nome === m.nome);
          if (!jaTem && m.estado !== 'Perfeito') {
            alteracoesMateriais.push({
              id: m.id,
              tipo: 'ALTERACAO_STATUS',
              detalhe: { nome: m.nome, estado: m.estado, observacao: m.observacao_avaria },
              operador: m.operador_atualizacao || 'Portaria',
              timestamp: m.updated_at
            });
          }
        }
      });

      // 7. MÓDULO 08 - LIVRO DE OCORRÊNCIAS PENDENTES (Mesmo que esteja há 10+ dias!)
      const { data: ocorrenciasData } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: true }); // mais antigas primeiro

      const ocorrenciasPendentes = (ocorrenciasData || []).filter((o: any) => {
        const st = (o.status || '').trim().toLowerCase();
        return !st || (!st.includes('resolv') && !st.includes('conclui') && !st.includes('fechad'));
      }).map((o: any) => {
        const dtCriada = new Date(o.created_at || Date.now());
        const diasEmAberto = Math.max(0, Math.floor((Date.now() - dtCriada.getTime()) / (1000 * 60 * 60 * 24)));
        return {
          id: o.id,
          titulo: o.titulo || 'Ocorrência sem título',
          descricao: o.descricao || '',
          prioridade: o.prioridade || 'Média',
          tipo: o.tipo || 'Interna',
          unidadeBloco: o.unidade_bloco,
          operador: o.operador_nome || 'Operador',
          criadaEm: o.created_at,
          diasEmAberto,
          fotoUrl: o.foto_url
        };
      });

      // Montar objeto consolidado completo
      const consolidacaoFinal: ConsolidacaoPosto = {
        plantaoInicio: plantaoInicioStr,
        plantaoFim: plantaoFimStr,
        plantaoHoras,
        encomendas: {
          totalRePlantao,
          reFaltandoTriagem,
          qtdFaltaTriagem,
          qtdPacotesTriadosPlantao: itensTriadosPlantao?.length || 0,
          qtdPacotesRetiradosPlantao: itensRetiradosPlantao?.length || 0,
          totalRetidasNoPosto: todosRetidosPosto?.length || 0,
          lotesPendentes: lotesPendentesFormatados,
          retidasPorBloco: retidasAgrupadasPorBloco
        },
        bancada: {
          totalVolumes: totalVolumesBancada,
          totalUnidades: totalUnidadesBancada,
          estruturasResumo: estruturasResumoBancada,
          itens: itensBancada
        },
        rondas: {
          totalExecutadasPlantao: rondasPlantao.length,
          concluidas: concluidasRondas,
          incompletas: incompletasRondas,
          temDivergencias: listaDivergenciasRonda.length > 0,
          rondaAtivaNaoFinalizada: rondaAtiva,
          listaDivergencias: listaDivergenciasRonda,
          rondasRecentes: rondasRecentesFormatadas
        },
        chaves: {
          totalFora: listaChavesFora.length,
          totalCadastradas: totalCadastradasChaves,
          listaChavesFora
        },
        prestadores: {
          totalPresentes: prestadoresPresentes.length,
          listaPresentes: prestadoresPresentes,
          totalLiberados: autorizadosLiberados.length,
          listaLiberados: autorizadosLiberados
        },
        custodia: {
          totalAguardando: itensCustodiaAguardando.length,
          listaCustodias: itensCustodiaAguardando
        },
        materiais: {
          totalEquipamentos: materiaisLista.length,
          perfeitos: materiaisLista.length - materiaisAvariados.length,
          avariados: materiaisAvariados.length,
          listaAvariados: materiaisAvariados,
          alteracoesPlantao: alteracoesMateriais
        },
        ocorrencias: {
          totalPendentes: ocorrenciasPendentes.length,
          listaPendentes: ocorrenciasPendentes
        }
      };

      setConsolidacao(consolidacaoFinal);

    } catch (err) {
      console.error('Erro na auditoria consolidada:', err);
    } finally {
      setLoadingAuditoria(false);
    }
  };

  const marcarModuloAudit = (modKey: string, status: 'ok' | 'divergente') => {
    setAuditModulos(prev => ({
      ...prev,
      [modKey]: {
        ...prev[modKey],
        status: prev[modKey]?.status === status ? null : status
      }
    }));
  };

  const setObsModuloAudit = (modKey: string, obs: string) => {
    setAuditModulos(prev => ({
      ...prev,
      [modKey]: {
        ...prev[modKey],
        obs
      }
    }));
  };

  const avancarParaEtapa2 = () => {
    if (!checklistCompletoValido) {
      const faltam = totalModulosObrigatorios - totalModulosAvaliados;
      setMensagem({
        tipo: 'erro',
        texto: `Atenção: É obrigatório auditar todos os 8 módulos operacionais do posto antes de avançar! Faltam ${faltam} módulo(s).`
      });
      return;
    }

    // Coleta todas as divergências apontadas nos módulos
    const divergenciasColetadas: string[] = [];

    const nomesModulos: Record<string, string> = {
      encomendas: 'Módulo 02: Encomendas & RE',
      bancada: 'Módulo 11: Bancada & Balcão Físico',
      rondas: 'Módulo 07: Rondas Patrimoniais',
      chaves: 'Módulo 05: Quadro de Chaves',
      prestadores: 'Módulo 10: Autorizados & Prestadores',
      custodia: 'Módulo 03: Custódia na Portaria',
      materiais: 'Módulo 04: Equipamentos & Materiais',
      ocorrencias: 'Módulo 08: Livro de Ocorrências'
    };

    Object.entries(auditModulos).forEach(([key, val]) => {
      if (val.status === 'divergente') {
        divergenciasColetadas.push(`• [${nomesModulos[key] || key}] ${val.obs.trim() || 'Divergência apontada na conferência do módulo.'}`);
      }
    });

    if (divergenciasColetadas.length > 0) {
      setTemDivergencia(true);
      setDivergencia(prev => prev ? prev + '\n' + divergenciasColetadas.join('\n') : divergenciasColetadas.join('\n'));
    }

    setEtapa(2);
  };

  const toggleChecklist = (item: string) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const realizarPassagemPosto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const loginLimpo = loginEntrante.trim();
      const senhaLimpa = senhaEntrante.trim();

      if (!loginLimpo || !senhaLimpa) {
        setMensagem({ tipo: 'erro', texto: 'Informe o login e a senha do operador entrante que está assumindo o posto.' });
        setLoading(false);
        return;
      }

      // Busca operador entrante por login (case-insensitive com ilike)
      let { data: opCandidatos, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .ilike('login', loginLimpo)
        .eq('senha', senhaLimpa)
        .eq('ativo', true);

      if (opError) throw opError;

      // Fallback: se não encontrou pelo login exato, tenta pelo nome completo ou primeiro nome
      if (!opCandidatos || opCandidatos.length === 0) {
        const { data: opPorNome } = await supabase
          .from('operadores')
          .select('*')
          .ilike('nome', `%${loginLimpo}%`)
          .eq('senha', senhaLimpa)
          .eq('ativo', true);
        if (opPorNome && opPorNome.length > 0) {
          opCandidatos = opPorNome;
        }
      }

      if (!opCandidatos || opCandidatos.length === 0) {
        setMensagem({ 
          tipo: 'erro', 
          texto: 'Credenciais incorretas ou operador inativo. Verifique se o login e a senha digitados estão corretos.' 
        });
        setLoading(false);
        return;
      }

      // Se houver mais de um, prioriza o do condomínio do posto
      let opEntrante = opCandidatos.find(
        op => op.condominio_id === usuarioLogado.condominio_id
      ) || opCandidatos[0];

      if (opEntrante.id === usuarioLogado.id) {
        setMensagem({ tipo: 'erro', texto: 'Atenção: O operador entrante deve ser uma pessoa diferente do operador sainte atual.' });
        setLoading(false);
        return;
      }

      const agora = new Date();
      const dia = String(agora.getDate()).padStart(2, '0');
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = String(agora.getFullYear()).slice(-2);
      const codigoPas = `PAS:${dia}${mes}${ano}OPER${String(agora.getMinutes()).padStart(2, '0')}`;

      const nomeCondominioFinal = condominioConfig?.nome || usuarioLogado?.condominio_nome || usuarioLogado?.condominio?.nome || 'Village Di Padova';

      // Snapshot consolidado completo do plantão (8 módulos)
      const snapshotConsolidado = {
        ...consolidacao,
        featureFlags: featureFlags || carregarFlagsCondominioLocal(usuarioLogado?.condominio_id),
        auditModulos,
        chavesFora: consolidacao.chaves.totalFora,
        totalChavesCadastradas: (consolidacao.chaves as any).totalCadastradas || 23,
        listaChaves: consolidacao.chaves.listaChavesFora,
        condominio_nome: nomeCondominioFinal,
        materiaisOk: consolidacao.materiais.avariados === 0,
        qtdMateriais: consolidacao.materiais.totalEquipamentos,
        listaMateriaisAvariados: consolidacao.materiais.listaAvariados,
        ocorrenciasAbertas: consolidacao.ocorrencias.totalPendentes,
        listaOcorrencias: consolidacao.ocorrencias.listaPendentes,
        encomendasPendentes: consolidacao.encomendas.totalRetidasNoPosto,
        custodiasPendentes: consolidacao.custodia.totalAguardando,
        rondasUltimas12h: consolidacao.rondas.totalExecutadasPlantao,
        ultimaRondaStatus: consolidacao.rondas.temDivergencias ? 'Divergências Mapeadas' : '100% Auditada'
      };

      const novaPassagem: any = {
        condominio_id: usuarioLogado.condominio_id,
        codigo: codigoPas,
        operador_sainte_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_entrante_nome: opEntrante.nome || opEntrante.login,
        operador_sainte_id: usuarioLogado?.id || null,
        operador_entrante_id: opEntrante?.id || null,
        checklist: checklist,
        pendencias: snapshotConsolidado,
        observacoes: observacoes.trim() || 'Sem observações gravadas para o próximo turno.',
        divergencia: temDivergencia ? divergencia.trim() : null,
        status: temDivergencia ? 'Divergência Registrada' : 'Concluída'
      };

      const { error: insertError } = await supabase
        .from('passagens_posto')
        .insert([novaPassagem]);

      if (insertError) throw insertError;

      // 1. EFETIVAÇÃO IMEDIATA NO DISPOSITIVO (PERSISTÊNCIA LOCALSTORAGE)
      // Gravamos a sessão do operador entrante antes de qualquer ação externa!
      localStorage.setItem('infport_sessao_ativa_v1', JSON.stringify({
        operadorId: opEntrante.id,
        login: opEntrante.login,
        condominioId: opEntrante.condominio_id || usuarioLogado.condominio_id,
        salvoEm: new Date().toISOString()
      }));
      if (opEntrante.condominio_id || usuarioLogado.condominio_id) {
        localStorage.setItem('infport_condominio_ativo_id', opEntrante.condominio_id || usuarioLogado.condominio_id);
      }

      // 1.1 Dispara verificação do alarme sonoro contínuo de troca de plantão caso haja lembretes
      const targetCondoId = opEntrante.condominio_id || usuarioLogado.condominio_id;
      if (targetCondoId) {
        checarEDispararAlarmeTrocaPlantao(targetCondoId);
      }

      // 2. Registro de auditoria no Histórico Absoluto
      registrarAtividade({
        modulo: 'Passagem de Posto',
        acao: 'TROCA_OPERADOR_EFETIVADA',
        descricao: `Passagem ${codigoPas}: Operador ${opEntrante.nome || opEntrante.login} assumiu oficialmente o posto em substituição a ${usuarioLogado?.nome || usuarioLogado?.login}.`,
        detalhes: {
          codigo: codigoPas,
          operadorSainte: usuarioLogado?.nome || usuarioLogado?.login,
          operadorEntrante: opEntrante.nome || opEntrante.login,
          operadorEntranteId: opEntrante.id,
          condominioId: usuarioLogado.condominio_id
        },
        operador_nome: opEntrante.nome || opEntrante.login,
        operador_id: opEntrante.id,
        operador_login: opEntrante.login,
        condominio_id: usuarioLogado.condominio_id
      });

      const passagemCompletaParaRelatorio = {
        ...novaPassagem,
        created_at: new Date().toISOString()
      };

      // Fecha o modal de preenchimento e abre a tela de confirmação e efetivação do login do novo operador
      setModalNova(false);
      setModalSucessoTroca({
        operadorEntrante: opEntrante,
        operadorSainte: usuarioLogado,
        passagem: passagemCompletaParaRelatorio,
        relatorioTexto: gerarTextoRelatorio(passagemCompletaParaRelatorio)
      });

      carregarPassagens();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar passagem: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const gerarTextoRelatorio = (item: any) => {
    const dataHora = new Date(item.created_at || Date.now()).toLocaleString('pt-BR');
    const c = item.pendencias || {};
    const enc = c.encomendas || {};
    const ban = c.bancada || {};
    const ron = c.rondas || {};
    const cha = c.chaves || {};
    const cus = c.custodia || {};
    const mat = c.materiais || {};
    const oco = c.ocorrencias || {};

    const flags = c.featureFlags || featureFlags || carregarFlagsCondominioLocal(usuarioLogado?.condominio_id || item.condominio_id);

    const nomeCondominio = item.condominio_nome || item.pendencias?.condominio_nome || condominioConfig?.nome || usuarioLogado?.condominio_nome || usuarioLogado?.condominio?.nome || 'Village Di Padova';

    let texto = `🔄 *RELATÓRIO COMPLETO DE TROCA DE PLANTÃO - INFPORT*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 *${nomeCondominio}*\n` +
      `🔑 *Código:* ${item.codigo || 'PAS:INFPORT'}\n` +
      `📅 *Data/Hora da Troca:* ${dataHora}\n` +
      `👤 *Operador Sainte:* ${item.operador_sainte_nome || usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}\n` +
      `👤 *Operador Entrante:* ${item.operador_entrante_nome || 'Operador'}\n` +
      `📊 *Status do Turno:* ${item.status === 'Divergência Registrada' ? '⚠️ DIVERGÊNCIA APONTADA' : '🟢 100% AUDITADO E VALIDADO'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 1. MÓDULO UNIFICADO - RECEBIMENTO DE ENCOMENDAS (RE) (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('encomendas', flags) || isModuloHabilitado('bancada', flags)) {
      const totalReRecebidas = enc.totalRePlantao ?? 0;
      const totalTriadas = enc.qtdPacotesTriadosPlantao ?? 0;
      const totalPendentesTriagem = enc.qtdFaltaTriagem ?? enc.reFaltandoTriagem ?? 0;
      const totalSaidas = enc.qtdPacotesRetiradosPlantao ?? 0;

      const totalVolumes = ban.totalVolumes ?? enc.totalRetidasNoPosto ?? c.encomendasPendentes ?? 0;
      let totalUnidades = ban.totalUnidades ?? 0;
      if (!totalUnidades) {
        if (enc.retidasPorBloco) {
          totalUnidades = Object.values(enc.retidasPorBloco).reduce((acc: number, b: any) => acc + (b.unidades?.length || 0), 0);
        } else {
          totalUnidades = totalVolumes;
        }
      }

      texto += `📦 *RECEBIMENTO DE ENCOMENDAS (RE)*\n` +
        `• Quantidade de RE recebida: *${totalReRecebidas}*\n` +
        `• Quantidade triada: *${totalTriadas}*\n` +
        `• Pendente de triagem: *${totalPendentesTriagem > 0 ? `${totalPendentesTriagem} volume(s)` : '0 (Tudo triado)'}*\n` +
        `• Quantas encomendas saíram no plantão: *${totalSaidas}*\n` +
        `• Total retido no posto aguardando moradores: *${totalVolumes} volume(s) em ${totalUnidades} unidade(s)*\n`;

      // Relação física detalhada por torre/bloco e unidades
      if (ban.estruturasResumo && Array.isArray(ban.estruturasResumo) && ban.estruturasResumo.length > 0) {
        texto += `  _Discriminação física completa:_\n`;
        ban.estruturasResumo.forEach((g: any) => {
          const lista = g.itens || g.unidades || [];
          const apsStr = lista.map((u: any) => {
            const uni = u.unidade || u;
            const vol = (u.volumes && u.volumes > 1) ? ` (${u.volumes} vol)` : '';
            const obs = u.observacao ? ` [${u.observacao}]` : '';
            return `${uni}${vol}${obs}`;
          }).join(', ');
          const totalVols = g.totalVolumes ?? lista.reduce((acc: number, it: any) => acc + (it.volumes || 1), 0);
          texto += `  *${(g.estrutura || 'TORRE A').toUpperCase()}*, TOTAL ${totalVols}:\n`;
          texto += `  ↳ ${apsStr || 'Nenhum'}\n`;
        });
      } else if (enc.retidasPorBloco && Object.keys(enc.retidasPorBloco).length > 0) {
        texto += `  _Discriminação física completa:_\n`;
        Object.entries(enc.retidasPorBloco).forEach(([bloco, info]: [string, any]) => {
          texto += `  *${bloco.toUpperCase()}*, TOTAL ${info.total}:\n`;
          texto += `  ↳ ${info.unidades.join(', ')}\n`;
        });
      } else {
        texto += `• Situação: *Nenhum volume retido no posto no momento*\n`;
      }
      texto += `\n`;
    }

    // 2. QUADRO DE CHAVES (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('chaves', flags)) {
      const totalChavesFora = cha.totalFora ?? c.chavesFora ?? 0;
      const totalChavesGeral = cha.totalCadastradas ?? c.totalChavesCadastradas ?? (totalChavesFora + (cha.totalNoQuadro || 23));
      texto += `🔑 *QUADRO DE CHAVES*\n`;
      if (totalChavesFora === 0) {
        texto += `• Situação: *TODAS AS ${totalChavesGeral} CHAVES ESTÃO guardadas no quadro*\n`;
      } else {
        texto += `• Situação: *${totalChavesFora} chave(s) fora do quadro de um total de ${totalChavesGeral} chaves*\n`;
        const listaChaves = cha.listaChavesFora || c.listaChaves || [];
        if (listaChaves.length > 0) {
          texto += `🚨 *Chaves em posse de terceiros/moradores:*\n` +
            listaChaves.map((k: any) => 
              `  🔑 *${k.nomeChave || k.nome_chave || 'Chave'}* (${k.codigoChave || k.codigo_chave || 'S/C'})\n` +
              `     ↳ Com quem tá: *${k.comQuemTa || k.nome_retirante || 'Portador'}* (${k.empresaOuApto || k.empresa_ou_apto || 'N/A'})\n` +
              `     ↳ Doc: ${k.documento || k.documento_retirante || 'N/A'} | Fone: ${k.telefone || k.telefone_retirante || 'N/A'}\n` +
              `     ↳ Retirada em: ${new Date(k.retiradaEm || k.data_hora_retirada || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${k.atrasado ? ' ⚠️ *ATRASADO!*' : ''}`
            ).join('\n\n') + `\n`;
        }
      }
      texto += `\n`;
    }

    // 3. CUSTÓDIA DE OBJETOS NA PORTARIA (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('custodia', flags)) {
      const totalCustodia = cus.totalAguardando ?? c.custodiasPendentes ?? 0;
      texto += `📦 *CUSTÓDIA DE OBJETOS NA PORTARIA*\n` +
        `• Itens guardados aguardando retirada: *${totalCustodia}*\n`;
      const listaCustodias = cus.listaCustodias || c.listaCustodias || [];
      if (totalCustodia > 0 && listaCustodias.length > 0) {
        texto += listaCustodias.map((cItem: any) => 
          `  • [${cItem.codigo || 'CUST'}] *${cItem.descricao || 'Item em custódia'}*\n` +
          `    ↳ De: ${cItem.origem || 'Morador/Terceiro'} ➔ Para: ${cItem.destino || 'Destinatário'}`
        ).join('\n') + `\n`;
      }
      texto += `\n`;
    }

    // 4. EQUIPAMENTOS E MATERIAIS DA GUARITA (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('materiais', flags)) {
      const totalAvariados = mat.avariados ?? (c.materiaisOk === false ? 1 : 0);
      const totalEquip = mat.totalEquipamentos ?? c.qtdMateriais ?? 0;
      const totalPerfeitos = mat.perfeitos ?? (totalEquip - totalAvariados);
      texto += `🛠 *EQUIPAMENTOS E MATERIAIS DA GUARITA*\n` +
        `• Total de itens inventariados: *${totalEquip}*\n` +
        `• Em perfeito estado: *${totalPerfeitos}*\n` +
        `• Com avaria / em manutenção: *${totalAvariados}*\n`;
      const listaAvarias = mat.listaAvariados || c.listaMateriaisAvariados || [];
      if (totalAvariados > 0 && listaAvarias.length > 0) {
        texto += `  🚨 *Itens com Avaria/Defeito:*\n` +
          listaAvarias.map((a: any) => `  ↳ *${a.nome}*: ${a.observacao || a.observacao_avaria || a.estado || 'Avariado'}`).join('\n') + `\n`;
      }
      texto += `\n`;
    }

    // 5. LIVRO DE OCORRÊNCIAS PENDENTES (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('ocorrencias', flags)) {
      const totalOcorrencias = oco.totalPendentes ?? c.ocorrenciasAbertas ?? 0;
      texto += `📖 *LIVRO DE OCORRÊNCIAS PENDENTES*\n` +
        `• Total não resolvido: *${totalOcorrencias}*\n`;
      const listaOcorrencias = oco.listaPendentes || c.listaOcorrencias || [];
      if (totalOcorrencias > 0 && listaOcorrencias.length > 0) {
        texto += `🚨 *Alerta detalhado dos casos pendentes:*\n` +
          listaOcorrencias.map((o: any) => 
            `  • [${(o.prioridade || 'Média').toUpperCase()}] *${o.titulo}*\n` +
            `    ↳ ⏳ *Há ${o.diasEmAberto ?? 0} dia(s) em aberto!* (${new Date(o.criadaEm || o.created_at || Date.now()).toLocaleDateString('pt-BR')})\n` +
            `    ↳ Local: ${o.unidadeBloco || o.unidade_bloco || 'Área Comum'} | Responsável: ${o.operador || o.operador_nome || 'Portaria'}\n` +
            `    ↳ Resumo: ${o.descricao}`
          ).join('\n\n') + `\n`;
      } else {
        texto += `• Situação: *Nenhuma ocorrência pendente no posto*\n`;
      }
      texto += `\n`;
    }

    // NOTA: Autorizados e Prestadores no Condomínio OMITIDOS da mensagem de WhatsApp conforme especificação do usuário.

    // 6. RONDAS PATRIMONIAIS NO PLANTÃO (Apenas se habilitado para o condomínio em questão)
    if (isModuloHabilitado('rondas', flags)) {
      if (ron.totalExecutadasPlantao > 0 || ron.temDivergencias) {
        texto += `🛡️ *RONDAS PATRIMONIAIS NO PLANTÃO*\n` +
          `• Total executadas: *${ron.totalExecutadasPlantao || 0}* | Concluídas: *${ron.concluidas || 0}* | Falhas: *${ron.incompletas || 0}*\n`;
        if (ron.temDivergencias && ron.listaDivergencias && ron.listaDivergencias.length > 0) {
          texto += ron.listaDivergencias.map((d: string) => `  ⚠️ ${d}`).join('\n') + `\n`;
        }
        texto += `\n`;
      }
    }

    // 7. INSTRUÇÕES E RECADOS DO TURNO
    texto += `💬 *INSTRUÇÕES E RECADOS DO TURNO:*\n"${item.observacoes || 'Nenhuma observação registrada.'}"\n`;
    if (item.divergencia) {
      texto += `\n🚨 *DIVERGÊNCIA APONTADA PELO OPERADOR:*\n"${item.divergencia}"\n`;
    }

    texto += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n_INFPORT Portaria Digital Inteligente_`;
    return texto;
  };

  const gerarLinkWhatsApp = (item: any) => {
    const texto = gerarTextoRelatorio(item);
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  };

  const copiarRelatorioWhatsApp = async (item: any) => {
    try {
      const texto = gerarTextoRelatorio(item);
      await navigator.clipboard.writeText(texto);
      setCopiadoTexto(true);
      setTimeout(() => setCopiadoTexto(false), 3000);
      setMensagem({ tipo: 'sucesso', texto: '✓ Relatório formatado copiado! Cole no grupo do WhatsApp do condomínio.' });
    } catch (e) {
      console.warn('Erro ao copiar relatório:', e);
    }
  };

  const infoPlantaoVigente = calcularPlantaoVigente(condominioConfig, new Date());

  return (
    <div className="space-y-3">
      {/* Header Principal Compacto */}
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <h3 className="font-bold text-xs sm:text-sm text-white">Auditoria & Passagem de Posto</h3>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {condominioConfig?.whatsapp_grupo_url && (
            <a
              href={condominioConfig.whatsapp_grupo_url}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-2xs"
              title="Abrir o Grupo de WhatsApp Oficial"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}



          <button
            onClick={abrirNovaPassagem}
            disabled={verificandoChecklistBancada}
            className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-600 disabled:opacity-75 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition uppercase shadow-2xs cursor-pointer"
            title="Atualizar a bancada com encomendas pendentes e verificar checklist para troca de turno"
          >
            {verificandoChecklistBancada ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verificando Bancada...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> <span>Troca de Turno</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BANNER DE CONFIGURAÇÃO DE PLANTÃO COMPACTO */}
      <div className="bg-slate-900/90 text-white p-2.5 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shadow-2xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Building className="w-3 h-3 text-emerald-400" />
              {condominioConfig?.nome || 'Condomínio'}
            </span>
            <span className="text-emerald-400 font-mono text-[10px] font-bold bg-slate-800 px-2 py-0.2 rounded-md border border-slate-700 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Escala: {condominioConfig?.escala_label || '06:00 às 18:00 / 18:00 às 06:00'}
            </span>
          </div>

          <p className="text-[11px] text-slate-300">
            <strong>{infoPlantaoVigente.labelTurno}</strong> • Início às {new Date(consolidacao.plantaoInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({consolidacao.plantaoHoras}h decorridas)
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {condominioConfig?.whatsapp_grupo_url ? (
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-emerald-500/40 px-2 py-1 rounded-lg text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300">Grupo:</span>
              <a
                href={condominioConfig.whatsapp_grupo_url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-bold underline flex items-center gap-0.5"
              >
                Conectado <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          ) : (
            <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-lg">
              ⚠️ Grupo WhatsApp pendente
            </span>
          )}

          <button
            type="button"
            onClick={() => consolidarModulosPosto()}
            disabled={loadingAuditoria}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            title="Recarregar auditoria"
          >
            <RefreshCw className={`w-3 h-3 ${loadingAuditoria ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{loadingAuditoria ? 'Atualizando...' : 'Recarregar'}</span>
          </button>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold transition shadow-xs ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : mensagem.tipo === 'aviso'
            ? 'bg-amber-50 text-amber-900 border-2 border-amber-400 animate-pulse'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : mensagem.tipo === 'aviso' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{mensagem.texto}</span>
        </div>
      )}



      {/* Histórico de Trocas de Turno */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" /> Histórico de Trocas de Turno Registradas
          </h4>
          <span className="text-xs text-slate-500 font-medium">
            {passagens.length} troca(s) auditada(s)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {passagens.map((item) => {
            const p = item.pendencias || {};
            const enc = p.encomendas || {};
            const cha = p.chaves || {};
            const oco = p.ocorrencias || {};
            const ron = p.rondas || {};
            const pre = p.prestadores || {};

            return (
              <div key={item.id} className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between hover:border-slate-300 transition">
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b pb-1.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1 font-mono">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> {item.codigo || 'PAS:CONCLUÍDO'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                      item.status === 'Divergência Registrada' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.status || 'Concluída'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-lg text-xs border border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Sainte:</span>
                      <strong className="text-slate-800 text-[11px] truncate block">{item.operador_sainte_nome}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Entrante:</span>
                      <strong className="text-emerald-700 text-[11px] truncate block">{item.operador_entrante_nome}</strong>
                    </div>
                  </div>

                  {/* Resumo Consolidado em Chips */}
                  <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-700 uppercase text-[9px] block border-b pb-0.5">Snapshot do Plantão:</span>
                    <div className="grid grid-cols-2 gap-1 text-slate-600 text-[10px]">
                      <div className="flex items-center gap-1 truncate">
                        <Package className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">Retidas: <strong>{enc.totalRetidasNoPosto ?? p.encomendasPendentes ?? 0} vol.</strong></span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Key className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">Chaves Fora: <strong className={(cha.totalFora ?? p.chavesFora) > 0 ? 'text-amber-700' : ''}>{cha.totalFora ?? p.chavesFora ?? 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Footprints className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Rondas: <strong>{ron.totalExecutadasPlantao ?? p.rondasUltimas12h ?? 0} feitas</strong></span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <HardHat className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">Prestadores: <strong>{pre.totalPresentes ?? 0} ativos</strong></span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
                        <span className="truncate">Ocorrências: <strong className={(oco.totalPendentes ?? p.ocorrenciasAbertas) > 0 ? 'text-red-700' : ''}>{oco.totalPendentes ?? p.ocorrenciasAbertas ?? 0}</strong></span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Radio className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Materiais: <strong>{p.materiaisOk !== false ? 'OK' : 'Avaria'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {item.observacoes && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      "{item.observacoes}"
                    </p>
                  )}

                  {item.divergencia && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <strong>Divergência:</strong> {item.divergencia}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex justify-between items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModalHistoricoDetalhes(item)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-md text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Ver Auditoria Completa"
                    >
                      <Eye className="w-3 h-3" /> Detalhes
                    </button>
                    <button
                      onClick={() => setModalCompartilharWhatsApp(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-md text-xs flex items-center gap-1 transition shadow-2xs cursor-pointer"
                      title="Opções de WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {passagens.length === 0 && !loading && (
            <div className="col-span-full bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 italic text-xs">
              Nenhuma passagem de posto registrada até o momento.
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVA PASSAGEM DE POSTO COM CONSOLIDAÇÃO TOTAL */}
      {modalNova && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button 
              onClick={() => setModalNova(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between border-b pb-3 pr-8">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" /> Relatório Completo de Troca de Plantão
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consolidação automática dos {modulosObrigatoriosAtivos.length} módulos habilitados com verificação em tempo real
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                Etapa {etapa} de 3
              </span>
            </div>

            {/* Conteúdo rolável */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {etapa === 1 && (
                <div className="space-y-4">
                  {/* Banner do Plantão */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-sm">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Plantão Vigente Sendo Auditado:</span>
                      <strong className="text-emerald-400 text-xs sm:text-sm">
                        Desde {new Date(consolidacao.plantaoInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} de {new Date(consolidacao.plantaoInicio).toLocaleDateString('pt-BR')} ({consolidacao.plantaoHoras}h de turno)
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-300">Operador Sainte:</span>
                      <strong className="bg-slate-700/80 px-2.5 py-1 rounded text-white font-mono">
                        {usuarioLogado?.nome || usuarioLogado?.login}
                      </strong>
                    </div>
                  </div>

                  {loadingAuditoria && (
                    <div className="p-4 bg-slate-50 border rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> Varrimento e consolidação em tempo real dos módulos...
                    </div>
                  )}

                  {/* AUDITORIA DO POSTO POR MÓDULO */}
                  <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 px-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Auditoria do Posto por Módulo
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Conferência ativa em tempo real
                    </span>
                  </div>

                  {/* CARDS RESUMO DE ALTO NÍVEL */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* RE / Encomendas */}
                    {isModuloHabilitado('encomendas', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('encomendas')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'encomendas' ? 'ring-2 ring-purple-600 bg-purple-50/50 border-purple-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-purple-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">RE & Encomendas</span>
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.encomendas.totalRePlantao} REs no plantão
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {consolidacao.encomendas.reFaltandoTriagem > 0 ? (
                          <span className="text-amber-600 font-bold">{consolidacao.encomendas.reFaltandoTriagem} RE(s) a triar ({consolidacao.encomendas.qtdFaltaTriagem} vol.)</span>
                        ) : (
                          <span className="text-emerald-600">Triagem 100% em dia</span>
                        )}
                      </div>
                    </button>
                    )}

                    {/* Bancada (Balcão Físico) */}
                    {isModuloHabilitado('bancada', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('bancada')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'bancada' ? 'ring-2 ring-amber-600 bg-amber-50/50 border-amber-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-amber-700 mb-1">
                        <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Bancada (Balcão)
                        </span>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.bancada?.totalVolumes || 0} volume(s)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {consolidacao.bancada?.totalUnidades || 0} unidade(s) sob custódia
                      </div>
                    </button>
                    )}

                    {/* Rondas */}
                    {isModuloHabilitado('rondas', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('rondas')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'rondas' ? 'ring-2 ring-indigo-600 bg-indigo-50/50 border-indigo-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-indigo-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Rondas Patrimoniais</span>
                        <Footprints className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.rondas.totalExecutadasPlantao} ronda(s) feitas
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.rondas.temDivergencias ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Divergência notada
                          </span>
                        ) : (
                          <span className="text-emerald-600">100% Concluídas</span>
                        )}
                      </div>
                    </button>
                    )}

                    {/* Chaves */}
                    {isModuloHabilitado('chaves', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('chaves')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'chaves' ? 'ring-2 ring-amber-600 bg-amber-50/50 border-amber-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-amber-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Quadro de Chaves</span>
                        <Key className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.chaves.totalFora} chave(s) fora
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.chaves.totalFora > 0 ? (
                          <span className="text-amber-700 font-bold">Ver com quem está</span>
                        ) : (
                          <span className="text-emerald-600">Todas no quadro</span>
                        )}
                      </div>
                    </button>
                    )}

                    {/* Prestadores */}
                    {isModuloHabilitado('prestadores', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('prestadores')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'prestadores' ? 'ring-2 ring-blue-600 bg-blue-50/50 border-blue-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-blue-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Prestadores no Cond.</span>
                        <HardHat className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.prestadores.totalPresentes} presente(s)
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.prestadores.totalPresentes > 0 ? (
                          <span className="text-blue-700 font-bold">Ver crachás e Aps.</span>
                        ) : (
                          <span className="text-slate-500">Nenhum no momento</span>
                        )}
                      </div>
                    </button>
                    )}

                    {/* Custódia */}
                    {isModuloHabilitado('custodia', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('custodia')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'custodia' ? 'ring-2 ring-sky-600 bg-sky-50/50 border-sky-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sky-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Custódia Portaria</span>
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.custodia.totalAguardando} item(ns)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Aguardando retirada
                      </div>
                    </button>
                    )}

                    {/* Materiais */}
                    {isModuloHabilitado('materiais', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('materiais')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'materiais' ? 'ring-2 ring-emerald-600 bg-emerald-50/50 border-emerald-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-emerald-700 mb-1">
                        <span className="text-[10px] font-bold uppercase">Inventário do Posto</span>
                        <Radio className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.materiais.totalEquipamentos} equipamentos
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.materiais.avariados > 0 ? (
                          <span className="text-red-600 font-bold">{consolidacao.materiais.avariados} avariado(s)</span>
                        ) : (
                          <span className="text-emerald-600">100% Perfeitos</span>
                        )}
                      </div>
                    </button>
                    )}

                    {/* Ocorrências Pendentes */}
                    {isModuloHabilitado('ocorrencias', featureFlags) && (
                    <button
                      type="button"
                      onClick={() => setModuloAtivo('ocorrencias')}
                      className={`p-3 rounded-xl border text-left transition ${
                        moduloAtivo === 'ocorrencias' ? 'ring-2 ring-red-600 bg-red-50/50 border-red-300' : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-red-700 mb-1">
                        <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Livro de Ocorrências
                        </span>
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {consolidacao.ocorrencias.totalPendentes} ocorrência(s)
                      </div>
                      <div className="text-[10px]">
                        {consolidacao.ocorrencias.totalPendentes > 0 ? (
                          <span className="text-red-700 font-bold">
                            Pendências ativas
                          </span>
                        ) : (
                          <span className="text-emerald-600">Nenhuma pendência</span>
                        )}
                      </div>
                    </button>
                    )}
                  </div>

                  {/* ABAS / SEÇÕES DETALHADAS DE CADA MÓDULO */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        {moduloAtivo === 'encomendas' && <><Package className="w-4 h-4 text-purple-600" /> Detalhamento: Encomendas e Lotes de RE</>}
                        {moduloAtivo === 'rondas' && <><Footprints className="w-4 h-4 text-indigo-600" /> Detalhamento: Rondas e Auditoria de Pontos</>}
                        {moduloAtivo === 'chaves' && <><Key className="w-4 h-4 text-amber-600" /> Detalhamento: Chaves Fora do Quadro</>}
                        {moduloAtivo === 'prestadores' && <><HardHat className="w-4 h-4 text-blue-600" /> Detalhamento: Prestadores e Autorizados Presentes</>}
                        {moduloAtivo === 'custodia' && <><Box className="w-4 h-4 text-sky-600" /> Detalhamento: Objetos de Custódia</>}
                        {moduloAtivo === 'materiais' && <><Radio className="w-4 h-4 text-emerald-600" /> Detalhamento: Inventário e Equipamentos</>}
                        {moduloAtivo === 'ocorrencias' && <><AlertTriangle className="w-4 h-4 text-red-600" /> Detalhamento: Ocorrências Pendentes (Sem importar a data!)</>}
                        {moduloAtivo === 'bancada' && <><Layers className="w-4 h-4 text-amber-600" /> Detalhamento: Volumes Físicos na Bancada (Por Torre & Unidade)</>}
                        {moduloAtivo === 'todos' && <><ShieldCheck className="w-4 h-4 text-emerald-600" /> Visão Consolidada Completa</>}
                      </span>

                      <button
                        type="button"
                        onClick={() => setModuloAtivo('todos')}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition ${
                          moduloAtivo === 'todos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Ver Todos
                      </button>
                    </div>

                    {/* SEÇÃO 1: RE / ENCOMENDAS */}
                    {isModuloHabilitado('encomendas', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'encomendas') && (
                      <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-purple-950 flex items-center gap-1.5 font-bold uppercase">
                            <Package className="w-4 h-4 text-purple-600" /> Módulo 02 - Encomendas & REs
                          </strong>
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded">
                            {consolidacao.encomendas.totalRetidasNoPosto} pacote(s) retidos no posto
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                            <span className="text-[10px] text-purple-700 block">REs no Turno:</span>
                            <strong className="text-purple-950">{consolidacao.encomendas.totalRePlantao} recebida(s)</strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                            <span className="text-[10px] text-amber-800 block">Faltam Triagem:</span>
                            <strong className="text-amber-950">{consolidacao.encomendas.reFaltandoTriagem} RE(s) pendente(s)</strong>
                          </div>
                          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                            <span className="text-[10px] text-amber-800 block">Qtd a Triar:</span>
                            <strong className="text-amber-950">{consolidacao.encomendas.qtdFaltaTriagem} pacote(s)</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">Triados no Turno:</span>
                            <strong className="text-emerald-950">{consolidacao.encomendas.qtdPacotesTriadosPlantao} pacote(s)</strong>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <span className="text-[10px] text-blue-700 block">Entregues no Turno:</span>
                            <strong className="text-blue-950">{consolidacao.encomendas.qtdPacotesRetiradosPlantao} pacote(s)</strong>
                          </div>
                        </div>

                        {consolidacao.encomendas.lotesPendentes.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-amber-800 block">
                              ⚠️ REs Aguardando / Em Triagem:
                            </span>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {consolidacao.encomendas.lotesPendentes.map((lote) => (
                                <div key={lote.id} className="text-[11px] bg-amber-50/80 p-2 rounded-lg border border-amber-200 flex justify-between items-center">
                                  <div>
                                    <strong className="text-amber-950">{lote.codigo}</strong> — {lote.entregadorEmpresa} ({lote.entregadorNome})
                                  </div>
                                  <div className="text-amber-900 font-bold">
                                    Faltam {lote.qtdDeclarada - lote.qtdTriada} de {lote.qtdDeclarada} vol.
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 1.1: BANCADA (CONFERÊNCIA DETALHADA POR TORRE E APARTAMENTO) */}
                    {isModuloHabilitado('bancada', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'bancada') && (
                      <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm space-y-2.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-amber-950 flex items-center gap-1.5 font-bold uppercase">
                            <Layers className="w-4 h-4 text-amber-600" /> Módulo 11 - Bancada & Balcão Físico
                          </strong>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                            {consolidacao.bancada?.totalVolumes || 0} volume(s) em {consolidacao.bancada?.totalUnidades || 0} unidade(s)
                          </span>
                        </div>

                        {(!consolidacao.bancada?.estruturasResumo || consolidacao.bancada.estruturasResumo.length === 0) ? (
                          <p className="text-xs text-slate-500 italic py-1">
                            Bancada limpa. Nenhum volume físico retido no balcão no momento da passagem.
                          </p>
                        ) : (
                          <div className="space-y-2 mt-1">
                            <p className="text-[11px] font-bold text-slate-600">
                              Volumes físicos conferidos separados por torre e apartamento:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {consolidacao.bancada.estruturasResumo.map(g => (
                                <div key={g.estrutura} className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-xs">
                                  <div className="flex justify-between items-center font-black text-amber-950 mb-1 border-b border-amber-200 pb-1">
                                    <span>{g.estrutura}</span>
                                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                                      {g.totalVolumes} vol. ({g.totalUnidades} un.)
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {g.itens.map(it => (
                                      <div key={it.id} className="flex justify-between items-center text-slate-800">
                                        <span className="font-bold text-[11px]">
                                          Unidade {it.unidade} {it.observacao ? <em className="text-[10px] text-slate-500 font-normal">({it.observacao})</em> : ''}
                                        </span>
                                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border border-amber-200 font-bold">
                                          {it.volumes} vol.
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 2: RONDAS */}
                    {isModuloHabilitado('rondas', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'rondas') && (
                      <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-indigo-950 flex items-center gap-1.5 font-bold uppercase">
                            <Footprints className="w-4 h-4 text-indigo-600" /> Módulo 07 - Rondas Patrimoniais
                          </strong>
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                            {consolidacao.rondas.totalExecutadasPlantao} executada(s) no plantão
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                            <span className="text-[10px] text-indigo-700 block">Total no Plantão:</span>
                            <strong className="text-indigo-950">{consolidacao.rondas.totalExecutadasPlantao}</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">100% Concluídas:</span>
                            <strong className="text-emerald-950">{consolidacao.rondas.concluidas}</strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${consolidacao.rondas.incompletas > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-[10px] block ${consolidacao.rondas.incompletas > 0 ? 'text-red-700' : 'text-slate-500'}`}>Incompletas / Falhas:</span>
                            <strong className={consolidacao.rondas.incompletas > 0 ? 'text-red-950' : 'text-slate-700'}>{consolidacao.rondas.incompletas}</strong>
                          </div>
                        </div>

                        {consolidacao.rondas.temDivergencias && (
                          <div className="bg-red-50 p-2.5 rounded-lg border border-red-200 space-y-1">
                            <span className="text-[10px] font-bold text-red-800 uppercase flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Erros & Divergências Detectadas nas Rondas:
                            </span>
                            <ul className="text-[11px] text-red-900 space-y-0.5 list-disc pl-4">
                              {consolidacao.rondas.listaDivergencias.map((div, i) => (
                                <li key={i}>{div}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 3: CHAVES FORA DO QUADRO */}
                    {isModuloHabilitado('chaves', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'chaves') && (
                      <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-amber-950 flex items-center gap-1.5 font-bold uppercase">
                            <Key className="w-4 h-4 text-amber-600" /> Módulo 05 - Quadro de Chaves
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.chaves.totalFora > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {consolidacao.chaves.totalFora > 0 ? `${consolidacao.chaves.totalFora} chave(s) fora` : 'Todas no quadro'}
                          </span>
                        </div>

                        {consolidacao.chaves.totalFora > 0 ? (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase block">
                              Chaves Fora do Quadro — Qual é e com quem está:
                            </span>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {consolidacao.chaves.listaChavesFora.map((k) => (
                                <div key={k.id} className="p-2.5 rounded-lg border bg-amber-50/70 border-amber-200 text-xs space-y-1">
                                  <div className="flex justify-between items-center">
                                    <strong className="text-amber-950 flex items-center gap-1">
                                      <Key className="w-3.5 h-3.5 text-amber-700" /> {k.nomeChave} ({k.codigoChave}) — Setor {k.setor}
                                    </strong>
                                    {k.atrasado && (
                                      <span className="bg-red-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                                        Devolução Atrasada!
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                                    <div>
                                      👤 <strong>Com quem tá:</strong> {k.comQuemTa} ({k.empresaOuApto})
                                    </div>
                                    <div>
                                      📄 <strong>Doc:</strong> {k.documento} | 📞 {k.telefone}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      🕒 Retirada: {new Date(k.retiradaEm).toLocaleString('pt-BR')}
                                    </div>
                                    {k.motivo && (
                                      <div className="text-[10px] text-slate-600 italic">
                                        Motivo: {k.motivo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 italic">
                            ✓ Nenhuma chave fora do quadro. Todas conferidas no painel físico.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 4: PRESTADORES E AUTORIZADOS */}
                    {isModuloHabilitado('prestadores', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'prestadores') && (
                      <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-blue-950 flex items-center gap-1.5 font-bold uppercase">
                            <HardHat className="w-4 h-4 text-blue-600" /> Módulo 06 - Autorizados & Prestadores
                          </strong>
                          <div className="flex gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                              {consolidacao.prestadores.totalPresentes} presente(s)
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                              {consolidacao.prestadores.totalLiberados ?? (consolidacao.prestadores.listaLiberados?.length || 0)} liberado(s)
                            </span>
                          </div>
                        </div>

                        {/* A) DENTRO DO CONDOMÍNIO */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-blue-800 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600" /> Pessoas DENTRO do Condomínio Agora:
                          </span>
                          {consolidacao.prestadores.totalPresentes > 0 ? (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {consolidacao.prestadores.listaPresentes.map((p) => (
                                <div key={p.id} className="p-2.5 rounded-lg border bg-blue-50/60 border-blue-200 text-xs flex justify-between items-start">
                                  <div>
                                    <strong className="text-blue-950">{p.nome}</strong> ({p.empresa})
                                    <p className="text-[11px] text-slate-600">
                                      🏢 Destino: <strong>{p.destino}</strong> | Crachá: <strong>{p.cracha}</strong>
                                    </p>
                                    <span className="text-[10px] text-slate-500">
                                      Entrada: {new Date(p.entradaEm).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Doc: {p.documento}
                                    </span>
                                  </div>
                                  <span className={`text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    p.estourado ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
                                  }`}>
                                    {p.estourado ? 'Tempo Estourado' : 'No Condomínio'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic p-1.5 bg-slate-50 rounded">
                              Nenhuma pessoa com crachá ativo dentro do condomínio no momento.
                            </p>
                          )}
                        </div>

                        {/* B) CADASTRADOS E LIBERADOS (AGUARDANDO ENTRADA) */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-purple-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Cadastros LIBERADOS Ativos (Aguardando Entrada):
                          </span>
                          {consolidacao.prestadores.listaLiberados && consolidacao.prestadores.listaLiberados.length > 0 ? (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {consolidacao.prestadores.listaLiberados.map((p) => (
                                <div key={p.id} className="p-2 rounded-lg border bg-purple-50/50 border-purple-200 text-xs flex justify-between items-start">
                                  <div>
                                    <strong className="text-purple-950">{p.nome}</strong>
                                    <span className="text-slate-600 text-[11px]"> ({p.empresa})</span>
                                    <p className="text-[11px] text-slate-600">
                                      🏢 Destino: <strong>{p.destino}</strong> • Perfil: <strong>{p.perfil === 'autorizado' ? 'Visitante/Família' : 'Prestador'}</strong>
                                    </p>
                                  </div>
                                  <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                    {p.validade}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic p-1.5 bg-slate-50 rounded">
                              Nenhum outro cadastro liberado ativo.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SEÇÃO 5: CUSTÓDIA */}
                    {isModuloHabilitado('custodia', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'custodia') && (
                      <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-sky-950 flex items-center gap-1.5 font-bold uppercase">
                            <Box className="w-4 h-4 text-sky-600" /> Módulo 03 - Custódia de Objetos na Portaria
                          </strong>
                          <span className="text-[10px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded">
                            {consolidacao.custodia.totalAguardando} item(ns) aguardando retirada
                          </span>
                        </div>

                        {consolidacao.custodia.totalAguardando > 0 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {consolidacao.custodia.listaCustodias.map((c) => (
                              <div key={c.id} className="p-2 rounded-lg border bg-sky-50/50 border-sky-200 text-xs flex justify-between items-center">
                                <div>
                                  <strong className="text-sky-950">[{c.codigo}] {c.descricao}</strong>
                                  <p className="text-[11px] text-slate-600">
                                    De: {c.origem} ➔ Para: {c.destino}
                                  </p>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(c.entradaEm).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 italic">
                            Nenhum item sob custódia temporária na guarita.
                          </p>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 6: MATERIAIS */}
                    {isModuloHabilitado('materiais', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'materiais') && (
                      <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-emerald-950 flex items-center gap-1.5 font-bold uppercase">
                            <Radio className="w-4 h-4 text-emerald-600" /> Módulo 04 - Inventário & Materiais do Posto
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.materiais.avariados > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {consolidacao.materiais.avariados > 0 ? `${consolidacao.materiais.avariados} avaria(s)` : '100% Operacional'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                            <span className="text-[10px] text-slate-500 block">Total Inventariado:</span>
                            <strong className="text-slate-900">{consolidacao.materiais.totalEquipamentos} itens</strong>
                          </div>
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                            <span className="text-[10px] text-emerald-700 block">100% Perfeitos:</span>
                            <strong className="text-emerald-950">{consolidacao.materiais.perfeitos} itens</strong>
                          </div>
                          <div className={`p-2 rounded-lg border ${consolidacao.materiais.avariados > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-[10px] block ${consolidacao.materiais.avariados > 0 ? 'text-red-700' : 'text-slate-500'}`}>Com Avaria / Manutenção:</span>
                            <strong className={consolidacao.materiais.avariados > 0 ? 'text-red-950' : 'text-slate-700'}>{consolidacao.materiais.avariados} itens</strong>
                          </div>
                        </div>

                        {consolidacao.materiais.listaAvariados.length > 0 && (
                          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold uppercase text-red-800 block">
                              Equipamentos com Avaria Mapeada:
                            </span>
                            <div className="space-y-1">
                              {consolidacao.materiais.listaAvariados.map((m) => (
                                <div key={m.id} className="text-xs text-red-950 flex justify-between">
                                  <span><strong>{m.nome}</strong> ({m.categoria})</span>
                                  <span className="text-red-700 italic">{m.observacao || m.estado}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {consolidacao.materiais.alteracoesPlantao.length > 0 && (
                          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-700 block">
                              📝 Alterações, Adições ou Exclusões no Plantão:
                            </span>
                            <div className="space-y-1 text-[11px] text-slate-700">
                              {consolidacao.materiais.alteracoesPlantao.map((alt, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span>
                                    <strong>[{alt.tipo}]</strong> {alt.detalhe?.nome || 'Item'} — {alt.detalhe?.observacao || alt.detalhe?.estado || ''}
                                  </span>
                                  <span className="text-[10px] text-slate-400">por {alt.operador}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SEÇÃO 7: OCORRÊNCIAS PENDENTES (MESMO HÁ 10+ DIAS!) */}
                    {isModuloHabilitado('ocorrencias', featureFlags) && (moduloAtivo === 'todos' || moduloAtivo === 'ocorrencias') && (
                      <div className="bg-white p-3.5 rounded-xl border border-red-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-xs text-red-950 flex items-center gap-1.5 font-bold uppercase">
                            <AlertTriangle className="w-4 h-4 text-red-600" /> Módulo 08 - Livro de Ocorrências Pendentes
                          </strong>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            consolidacao.ocorrencias.totalPendentes > 0 ? 'bg-red-100 text-red-900' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {consolidacao.ocorrencias.totalPendentes} pendência(s) em aberto
                          </span>
                        </div>

                        {consolidacao.ocorrencias.totalPendentes > 0 ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 font-medium">
                              ⚠️ <strong>Atenção Obrigatória:</strong> As ocorrências abaixo continuam em aberto e exigem atenção contínua do próximo operador, independente de quantos dias já se passaram!
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto">
                              {consolidacao.ocorrencias.listaPendentes.map((oco) => (
                                <div key={oco.id} className="p-3 bg-red-50/50 rounded-lg border border-red-200 text-xs space-y-1.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <strong className="text-slate-900 text-sm block">{oco.titulo}</strong>
                                      <span className="text-[10px] text-slate-500">
                                        Local: {oco.unidadeBloco || 'Área Geral'} • Tipo: {oco.tipo} • Registrado por: {oco.operador}
                                      </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                      <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs">
                                        🚨 Há {oco.diasEmAberto} dia(s) em aberto!
                                      </span>
                                      <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                        Prioridade {oco.prioridade}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-slate-700 text-xs italic bg-white/80 p-2 rounded border border-red-100">
                                    "{oco.descricao}"
                                  </p>

                                  <div className="text-[10px] text-slate-400">
                                    Aberta em: {new Date(oco.criadaEm).toLocaleString('pt-BR')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-700 italic">
                            ✓ Nenhuma ocorrência pendente no livro. Todas resolvidas ou finalizadas!
                          </p>
                        )}
                      </div>
                    )}
                  </div>


                  {/* CHECKLIST DE CONFERÊNCIA DOS MÓDULOS OPERACIONAIS (SEM CHECKLIST FÍSICO REDUNDANTE) */}
                  <div className="space-y-4 border-t pt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          Conferência Operacional dos Módulos da Portaria
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Validação dos 8 módulos da guarita com dados consolidados em tempo real
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={marcarTodosModulosOk}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          title="Marca todos os 8 módulos como Conformes (OK) de uma só vez"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marcar Todos como OK (Conforme)
                        </button>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                          checklistCompletoValido 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {totalModulosAvaliados} de {totalModulosObrigatorios} auditados {checklistCompletoValido ? '✓ 100%' : `(faltam ${totalModulosObrigatorios - totalModulosAvaliados})`}
                        </span>
                      </div>
                    </div>

                    {/* AUDITORIA DOS 8 MÓDULOS OPERACIONAIS */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-700 uppercase">
                        Auditoria Módulo a Módulo (Clique em OK ou Divergente para registrar o status):
                      </label>

                      <div className="grid grid-cols-1 gap-2.5 text-xs">
                        {/* 1.1 Encomendas */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.encomendas.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.encomendas.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Package className="w-3.5 h-3.5 text-purple-600" /> Módulo 02: RE & Encomendas Recebidas
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.encomendas.totalRePlantao} REs recebidas • {consolidacao.encomendas.reFaltandoTriagem} lote(s) pendentes de triagem ({consolidacao.encomendas.qtdFaltaTriagem} vol.)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('encomendas', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.encomendas.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('encomendas', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.encomendas.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.encomendas.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Encomendas:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.encomendas.obs}
                                onChange={(e) => setObsModuloAudit('encomendas', e.target.value)}
                                placeholder="Descreva o que está divergente em encomendas/RE..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.2 Rondas */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.rondas.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.rondas.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Footprints className="w-3.5 h-3.5 text-indigo-600" /> Módulo 07: Rondas Patrimoniais
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.rondas.totalExecutadasPlantao} executadas ({consolidacao.rondas.concluidas} concluídas) • {consolidacao.rondas.temDivergencias ? '🚨 Constam divergências no plantão' : '✓ Sem falhas'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('rondas', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.rondas.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('rondas', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.rondas.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.rondas.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Rondas:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.rondas.obs}
                                onChange={(e) => setObsModuloAudit('rondas', e.target.value)}
                                placeholder="Descreva a falha ou divergência de ronda..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.3 Chaves */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.chaves.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.chaves.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Key className="w-3.5 h-3.5 text-amber-600" /> Módulo 05: Quadro de Chaves
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.chaves.totalFora} chave(s) fora do quadro ({consolidacao.chaves.listaChavesFora.filter(k => k.atrasado).length} atrasadas)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('chaves', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.chaves.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('chaves', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.chaves.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.chaves.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Chaves:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.chaves.obs}
                                onChange={(e) => setObsModuloAudit('chaves', e.target.value)}
                                placeholder="Descreva a divergência encontrada nas chaves..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.4 Autorizados & Prestadores */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.prestadores.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.prestadores.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <HardHat className="w-3.5 h-3.5 text-blue-600" /> Módulo 10: Autorizados & Prestadores (Dentro e Liberados)
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.prestadores.totalPresentes} pessoas DENTRO do condomínio • {consolidacao.prestadores.totalLiberados ?? (consolidacao.prestadores.listaLiberados?.length || 0)} cadastros LIBERADOS ativos
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('prestadores', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.prestadores.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('prestadores', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.prestadores.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.prestadores.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Prestadores / Autorizados:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.prestadores.obs}
                                onChange={(e) => setObsModuloAudit('prestadores', e.target.value)}
                                placeholder="Descreva a divergência de prestador ou crachá..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.5 Custódia */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.custodia.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.custodia.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Box className="w-3.5 h-3.5 text-sky-600" /> Módulo 03: Custódia de Objetos na Portaria
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.custodia.totalAguardando} item(ns) aguardando retirada pelos destinatários
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('custodia', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.custodia.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('custodia', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.custodia.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.custodia.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Custódia:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.custodia.obs}
                                onChange={(e) => setObsModuloAudit('custodia', e.target.value)}
                                placeholder="Descreva a divergência em objetos guardados..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.6 Materiais */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.materiais.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.materiais.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Radio className="w-3.5 h-3.5 text-emerald-600" /> Módulo 04: Equipamentos & Materiais da Guarita
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.materiais.totalEquipamentos} equipamentos ({consolidacao.materiais.perfeitos} perfeitos, {consolidacao.materiais.avariados} avariados)
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('materiais', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.materiais.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('materiais', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.materiais.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.materiais.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Materiais:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.materiais.obs}
                                onChange={(e) => setObsModuloAudit('materiais', e.target.value)}
                                placeholder="Descreva o equipamento avariado ou ausente..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.7 Ocorrências */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.ocorrencias.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.ocorrencias.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Módulo 08: Livro de Ocorrências Pendentes
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.ocorrencias.totalPendentes} pendência(s) em aberto que exigem ciência do próximo operador
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('ocorrencias', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.ocorrencias.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('ocorrencias', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.ocorrencias.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.ocorrencias.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência em Ocorrências:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.ocorrencias.obs}
                                onChange={(e) => setObsModuloAudit('ocorrencias', e.target.value)}
                                placeholder="Descreva a pendência ou ocorrência sem registro..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* 1.8 Bancada (Balcão Físico) */}
                        <div className={`p-3 rounded-xl border transition ${
                          auditModulos.bancada?.status === 'ok' 
                            ? 'bg-emerald-50/70 border-emerald-300' 
                            : auditModulos.bancada?.status === 'divergente'
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <strong className="text-slate-900 flex items-center gap-1.5 font-bold">
                                <Layers className="w-3.5 h-3.5 text-amber-600" /> Módulo 11: Bancada & Balcão Físico
                              </strong>
                              <span className="text-[11px] text-slate-500">
                                {consolidacao.bancada?.totalVolumes || 0} volume(s) em {consolidacao.bancada?.totalUnidades || 0} unidade(s) na guarita
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('bancada', 'ok')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.bancada?.status === 'ok'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> OK
                              </button>
                              <button
                                type="button"
                                onClick={() => marcarModuloAudit('bancada', 'divergente')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                                  auditModulos.bancada?.status === 'divergente'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Divergente
                              </button>
                            </div>
                          </div>

                          {auditModulos.bancada?.status === 'divergente' && (
                            <div className="mt-2 pt-2 border-t border-amber-200">
                              <label className="block text-[10px] font-bold text-amber-900 uppercase mb-1">
                                Observação da Divergência na Bancada:
                              </label>
                              <input
                                type="text"
                                value={auditModulos.bancada?.obs || ''}
                                onChange={(e) => setObsModuloAudit('bancada', e.target.value)}
                                placeholder="Descreva o pacote faltante, avariado ou sem identificação..."
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-xs text-amber-950 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* BOTÃO DE AVANÇAR COM VALIDAÇÃO DOS 8 MÓDULOS */}
                  <div className="space-y-1.5 pt-2">
                    {!checklistCompletoValido && (
                      <p className="text-[11px] text-amber-600 text-center font-bold">
                        ⚠️ Atenção: Para avançar, é obrigatório conferir os {totalModulosObrigatorios} módulos operacionais acima (clique em OK ou Divergente, ou use o botão "Marcar Todos como OK"). Faltam {totalModulosObrigatorios - totalModulosAvaliados} módulo(s).
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={!checklistCompletoValido}
                      onClick={avancarParaEtapa2}
                      className={`w-full font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition uppercase shadow-md ${
                        checklistCompletoValido
                          ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Avançar para Observações & Divergências ({totalModulosAvaliados}/{totalModulosObrigatorios}) <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {etapa === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Recados, Avisos e Instruções do Turno
                    </label>
                    <textarea
                      rows={4}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Avisos sobre agendamentos de mudanças, moradores, entregas programadas, alertas de segurança para o próximo operador..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    ></textarea>
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Registrar Divergência Encontrada
                      </label>
                      <input
                        type="checkbox"
                        checked={temDivergencia}
                        onChange={(e) => setTemDivergencia(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                      />
                    </div>

                    {temDivergencia && (
                      <textarea
                        rows={3}
                        required
                        value={divergencia}
                        onChange={(e) => setDivergencia(e.target.value)}
                        placeholder="Descreva detalhadamente a divergência notada (ex: volume de encomenda não encontrado fisicamente, chave em falta sem registro, equipamento com defeito não informado)..."
                        className="w-full p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs"
                      ></textarea>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEtapa(1)}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition"
                    >
                      Voltar à Consolidação
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtapa(3)}
                      className="w-2/3 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 transition uppercase shadow-md"
                    >
                      Avançar para Dupla Assinatura Digital <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {etapa === 3 && (
                <form onSubmit={realizarPassagemPosto} className="space-y-4">
                  <div className="bg-emerald-50 p-4 sm:p-5 rounded-2xl border border-emerald-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-700" /> Autenticação do Operador Entrante (Dupla Assinatura)
                      </label>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded">
                        Etapa 3 de 3
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Para efetivar o login e transferir oficialmente a responsabilidade da portaria, selecione seu nome ou digite seu login e insira sua senha pessoal.
                    </p>

                    {/* QUADRO DE TRANSFERÊNCIA DE POSTO (QUEM SAI ➔ QUEM ASSUME) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white/90 p-3 rounded-xl border border-emerald-200 text-xs">
                      <div className="space-y-0.5 border-b sm:border-b-0 sm:border-r border-slate-200 pb-2 sm:pb-0 sm:pr-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          1. Operador Sainte (Entregando):
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {(usuarioLogado?.nome || usuarioLogado?.login || 'O').charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800 truncate">
                            {usuarioLogado?.nome || usuarioLogado?.login}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5 sm:pl-2">
                        <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                          2. Operador Entrante (Assumindo):
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {operadorSelecionadoEntrante 
                              ? operadorSelecionadoEntrante.nome.charAt(0) 
                              : (loginEntrante ? loginEntrante.charAt(0).toUpperCase() : '?')}
                          </div>
                          <span className="font-black text-emerald-900 truncate">
                            {operadorSelecionadoEntrante 
                              ? `${operadorSelecionadoEntrante.nome} (@${operadorSelecionadoEntrante.login})` 
                              : (loginEntrante ? `@${loginEntrante}` : 'Selecione ou digite abaixo')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SELEÇÃO RÁPIDA DE OPERADORES DO CONDOMÍNIO */}
                    {listaOperadores.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">
                          Quem está assumindo o posto agora? (Clique para selecionar rapidamente):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {listaOperadores.map((op) => {
                            const selecionado = operadorSelecionadoEntrante?.id === op.id || loginEntrante.toLowerCase() === op.login.toLowerCase();
                            return (
                              <button
                                key={op.id}
                                type="button"
                                onClick={() => {
                                  setOperadorSelecionadoEntrante(op);
                                  setLoginEntrante(op.login);
                                  setMensagem({ tipo: '', texto: '' });
                                }}
                                className={`p-2 rounded-xl text-left border transition flex items-center gap-2 cursor-pointer ${
                                  selecionado
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {op.foto_url ? (
                                  <img 
                                    src={op.foto_url} 
                                    alt={op.nome} 
                                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-white" 
                                  />
                                ) : (
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    selecionado ? 'bg-white text-emerald-800' : 'bg-slate-800 text-white'
                                  }`}>
                                    {op.nome?.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0 truncate">
                                  <p className="text-[11px] font-bold truncate leading-tight">{op.nome}</p>
                                  <p className={`text-[9px] truncate ${selecionado ? 'text-emerald-100' : 'text-slate-400'}`}>
                                    @{op.login}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CAMPOS DE CREDENCIAIS DO OPERADOR ENTRANTE */}
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Login do Operador Entrante:
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                          <input
                            type="text"
                            required
                            value={loginEntrante}
                            onChange={(e) => {
                              setLoginEntrante(e.target.value);
                              const match = listaOperadores.find(op => op.login.toLowerCase() === e.target.value.toLowerCase().trim());
                              setOperadorSelecionadoEntrante(match || null);
                            }}
                            placeholder="Ex: hugo"
                            className="w-full pl-9 pr-3 py-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Senha Pessoal do Operador Entrante:
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                          <input
                            type={mostrarSenhaEntrante ? "text" : "password"}
                            required
                            value={senhaEntrante}
                            onChange={(e) => setSenhaEntrante(e.target.value)}
                            placeholder="Digite sua senha de acesso ao Infport"
                            className="w-full pl-9 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSenhaEntrante(!mostrarSenhaEntrante)}
                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title={mostrarSenhaEntrante ? "Ocultar senha" : "Ver senha"}
                          >
                            {mostrarSenhaEntrante ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Efetivação de Login Permanente:</strong> Ao autenticar, o operador entrante assumirá imediatamente o comando da guarita neste dispositivo.
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEtapa(2)}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl uppercase text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Autenticando e Efetivando Login...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" /> Assinar e Assumir Posto Agora
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUCESSO E EFETIVAÇÃO DE LOGIN DO NOVO OPERADOR */}
      {modalSucessoTroca && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border-2 border-emerald-500 animate-in fade-in zoom-in-95 duration-200">
            {/* Ícone e Título de Confirmação */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <span className="inline-block bg-emerald-100 text-emerald-900 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-300">
                ✓ Passagem de Posto Concluída
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Login Efetivado com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                O operador <strong className="text-emerald-700 font-black">{modalSucessoTroca.operadorEntrante.nome || modalSucessoTroca.operadorEntrante.login}</strong> assumiu oficialmente o comando da guarita.
              </p>
            </div>

            {/* Cartão de Auditoria e Status */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Operador Sainte (Saiu):</span>
                  <span className="font-bold text-slate-700 text-xs">
                    {modalSucessoTroca.operadorSainte?.nome || modalSucessoTroca.operadorSainte?.login}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Operador Ativo no Posto:</span>
                  <span className="font-black text-emerald-800 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {modalSucessoTroca.operadorEntrante.nome || modalSucessoTroca.operadorEntrante.login}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-600">
                <span>Código: <strong>{modalSucessoTroca.passagem.codigo}</strong></span>
                <span>Data/Hora: <strong>{new Date(modalSucessoTroca.passagem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1 text-emerald-950">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Sessão ativa e salva no dispositivo:
                </p>
                <p className="text-emerald-800 text-[10px]">
                  Mesmo recarregando a página, abrindo o WhatsApp ou reabrindo o PWA, o operador <strong>{modalSucessoTroca.operadorEntrante.nome}</strong> permanecerá autenticado. Todas as rotinas da portaria (encomendas, bancada, chaves, rondas e ocorrências) registrarão seu nome.
                </p>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onTrocarOperador) {
                    onTrocarOperador(modalSucessoTroca.operadorEntrante);
                  }
                  setModalSucessoTroca(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                Assumir Posto Agora (Ir para o Painel)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cfgWhats = condominioConfig?.whatsapp_grupo_url;
                    copiarRelatorioWhatsApp(modalSucessoTroca.passagem);
                    if (cfgWhats) {
                      window.open(cfgWhats, '_blank');
                    } else {
                      const link = gerarLinkWhatsApp(modalSucessoTroca.passagem);
                      window.open(link, '_blank');
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition text-center cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  Enviar WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => copiarRelatorioWhatsApp(modalSucessoTroca.passagem)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {copiadoTexto ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiadoTexto ? 'Relatório Copiado!' : 'Copiar Relatório'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO RELATÓRIO HISTÓRICO */}
      {modalHistoricoDetalhes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setModalHistoricoDetalhes(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3 pr-8">
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                Snapshot Histórico de Auditoria
              </span>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 mt-1">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                Passagem {modalHistoricoDetalhes.codigo}
              </h3>
              <p className="text-xs text-slate-500">
                Registrada em {new Date(modalHistoricoDetalhes.created_at).toLocaleString('pt-BR')} por {modalHistoricoDetalhes.operador_sainte_nome} para {modalHistoricoDetalhes.operador_entrante_nome}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Observações */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Observações do Turno:</strong>
                <p className="italic text-slate-700">"{modalHistoricoDetalhes.observacoes}"</p>
              </div>

              {modalHistoricoDetalhes.divergencia && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <strong className="block text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Divergência Registrada:
                  </strong>
                  <p>{modalHistoricoDetalhes.divergencia}</p>
                </div>
              )}

              {/* Snapshot Detalhado */}
              <div className="space-y-3">
                <h5 className="font-bold uppercase text-[11px] text-slate-700 border-b pb-1">
                  Módulos Consolidados no Momento da Troca:
                </h5>

                {/* Encomendas */}
                {isModuloHabilitado('encomendas', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && (
                  <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/30 space-y-1">
                    <div className="font-bold text-purple-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Package className="w-3.5 h-3.5 text-purple-600" /> Módulo Encomendas & RE
                    </div>
                    <p className="text-slate-600">
                      Retidas no posto: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.totalRetidasNoPosto ?? modalHistoricoDetalhes.pendencias?.encomendasPendentes ?? 0} vol.</strong> • 
                      REs no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.totalRePlantao ?? 'N/A'}</strong> • 
                      Triadas no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.qtdPacotesTriadosPlantao ?? 'N/A'}</strong> • 
                      Entregues no turno: <strong>{modalHistoricoDetalhes.pendencias?.encomendas?.qtdPacotesRetiradosPlantao ?? 'N/A'}</strong>
                    </p>
                  </div>
                )}

                {/* Bancada */}
                {isModuloHabilitado('bancada', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && modalHistoricoDetalhes.pendencias?.bancada && (
                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Layers className="w-3.5 h-3.5 text-amber-600" /> Módulo Bancada (Balcão)
                    </div>
                    <p className="text-slate-600">
                      Volumes físicos: <strong>{modalHistoricoDetalhes.pendencias?.bancada?.totalVolumes || 0} vol.</strong> em <strong>{modalHistoricoDetalhes.pendencias?.bancada?.totalUnidades || 0} unidade(s)</strong>
                    </p>
                  </div>
                )}

                {/* Rondas */}
                {isModuloHabilitado('rondas', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && (
                  <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-1">
                    <div className="font-bold text-indigo-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Footprints className="w-3.5 h-3.5 text-indigo-600" /> Módulo Rondas Patrimoniais
                    </div>
                    <p className="text-slate-600">
                      Total executadas: <strong>{modalHistoricoDetalhes.pendencias?.rondas?.totalExecutadasPlantao ?? modalHistoricoDetalhes.pendencias?.rondasUltimas12h ?? 0}</strong> • 
                      Status: <strong>{modalHistoricoDetalhes.pendencias?.ultimaRondaStatus || 'Auditada'}</strong>
                    </p>
                  </div>
                )}

                {/* Chaves Fora */}
                {isModuloHabilitado('chaves', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && (
                  <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Key className="w-3.5 h-3.5 text-amber-600" /> Módulo Quadro de Chaves
                    </div>
                    <p className="text-slate-600">
                      Chaves fora do quadro: <strong>{modalHistoricoDetalhes.pendencias?.chaves?.totalFora ?? modalHistoricoDetalhes.pendencias?.chavesFora ?? 0}</strong>
                    </p>
                    {((modalHistoricoDetalhes.pendencias?.chaves?.listaChavesFora || modalHistoricoDetalhes.pendencias?.listaChaves || []).length > 0) && (
                      <div className="pt-1 space-y-1">
                        {(modalHistoricoDetalhes.pendencias?.chaves?.listaChavesFora || modalHistoricoDetalhes.pendencias?.listaChaves || []).map((k: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded border border-amber-200 text-[11px]">
                            <strong>{k.nomeChave || k.nome_chave} ({k.codigoChave || k.codigo_chave})</strong> — Com quem: {k.comQuemTa || k.nome_retirante} ({k.empresaOuApto || k.empresa_ou_apto})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custódia */}
                {isModuloHabilitado('custodia', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && modalHistoricoDetalhes.pendencias?.custodia && (
                  <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/30 space-y-1">
                    <div className="font-bold text-sky-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Box className="w-3.5 h-3.5 text-sky-600" /> Módulo Custódia Portaria
                    </div>
                    <p className="text-slate-600">
                      Itens retidos: <strong>{modalHistoricoDetalhes.pendencias?.custodia?.totalAguardando ?? modalHistoricoDetalhes.pendencias?.custodiasPendentes ?? 0} item(ns)</strong>
                    </p>
                  </div>
                )}

                {/* Materiais */}
                {isModuloHabilitado('materiais', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && modalHistoricoDetalhes.pendencias?.materiais && (
                  <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <Radio className="w-3.5 h-3.5 text-emerald-600" /> Módulo Equipamentos & Materiais
                    </div>
                    <p className="text-slate-600">
                      Equipamentos: <strong>{modalHistoricoDetalhes.pendencias?.materiais?.totalEquipamentos ?? modalHistoricoDetalhes.pendencias?.qtdMateriais ?? 0}</strong> • 
                      Avariados: <strong>{modalHistoricoDetalhes.pendencias?.materiais?.avariados ?? (modalHistoricoDetalhes.pendencias?.materiaisOk === false ? 1 : 0)}</strong>
                    </p>
                  </div>
                )}

                {/* Ocorrências */}
                {isModuloHabilitado('ocorrencias', modalHistoricoDetalhes.pendencias?.featureFlags || featureFlags) && (
                  <div className="p-3 rounded-xl border border-red-100 bg-red-50/30 space-y-1">
                    <div className="font-bold text-red-950 flex items-center gap-1.5 uppercase text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Módulo Ocorrências Pendentes
                    </div>
                    <p className="text-slate-600">
                      Pendências abertas: <strong>{modalHistoricoDetalhes.pendencias?.ocorrencias?.totalPendentes ?? modalHistoricoDetalhes.pendencias?.ocorrenciasAbertas ?? 0}</strong>
                    </p>
                    {((modalHistoricoDetalhes.pendencias?.ocorrencias?.listaPendentes || modalHistoricoDetalhes.pendencias?.listaOcorrencias || []).length > 0) && (
                      <div className="pt-1 space-y-1">
                        {(modalHistoricoDetalhes.pendencias?.ocorrencias?.listaPendentes || modalHistoricoDetalhes.pendencias?.listaOcorrencias || []).map((o: any, idx: number) => (
                          <div key={idx} className="bg-white p-2 rounded border border-red-200 text-[11px]">
                            <strong>{o.titulo}</strong> ({o.prioridade}) — Há {o.diasEmAberto ?? 'X'} dia(s) em aberto!
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center">
              <button
                onClick={() => setModalHistoricoDetalhes(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Fechar
              </button>
              <button
                onClick={() => setModalCompartilharWhatsApp(modalHistoricoDetalhes)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" /> Opções do WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DISPARO WHATSAPP COM SUPORTE AO GRUPO DO CONDOMÍNIO */}
      {modalCompartilharWhatsApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button 
              onClick={() => setModalCompartilharWhatsApp(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b pb-3 pr-8">
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded">
                Compartilhamento Oficial
              </span>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 mt-1">
                <MessageCircle className="w-5 h-5 text-emerald-600" /> Disparar para WhatsApp
              </h3>
              <p className="text-xs text-slate-500">
                Relatório consolidado da passagem {modalCompartilharWhatsApp.codigo || ''}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              {condominioConfig?.whatsapp_grupo_url ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-950 flex items-center gap-1.5 uppercase text-[11px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Grupo de WhatsApp Vinculado a este Condomínio
                  </span>
                  <p className="text-slate-600 text-[11px]">
                    Este condomínio possui grupo oficial configurado. Clique abaixo para copiar o relatório e abrir o grupo diretamente:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      copiarRelatorioWhatsApp(modalCompartilharWhatsApp);
                      window.open(condominioConfig.whatsapp_grupo_url, '_blank');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Copiar e Abrir Grupo do Condomínio
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  ⚠️ Este condomínio ainda não possui um link de grupo de WhatsApp cadastrado. Você pode configurá-lo na aba <strong>Cadastros ➔ Condomínios</strong>.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={gerarLinkWhatsApp(modalCompartilharWhatsApp)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition text-center"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Abrir WhatsApp Web
                </a>

                <button
                  type="button"
                  onClick={() => copiarRelatorioWhatsApp(modalCompartilharWhatsApp)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copiadoTexto ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiadoTexto ? 'Copiado!' : 'Copiar Texto'}
                </button>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prévia da Mensagem:</span>
                <textarea
                  readOnly
                  rows={6}
                  value={gerarTextoRelatorio(modalCompartilharWhatsApp)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-700 resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setModalCompartilharWhatsApp(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
