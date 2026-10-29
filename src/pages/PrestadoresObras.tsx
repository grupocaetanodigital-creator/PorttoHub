import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import ModalLeitorDocumentoOCR from '../components/ModalLeitorDocumentoOCR';
import { registrarAtividade } from '../services/auditoriaService';
import { comprimirImagemBase64 } from '../services/imageUtils';
import { ImagemOtimizada } from '../components/ImagemOtimizada';
import { 
  carregarCondominioConfig,
  isEstruturaCasas,
  formatarIdentificacaoUnidade,
  getCondominioAtivoId
} from '../services/condominioService';
import { formatarLinkWhatsApp } from '../services/configWhatsappService';
import { 
  UserCheck, 
  Building2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  X, 
  Search, 
  Plus, 
  Camera, 
  Scan, 
  LogIn, 
  LogOut, 
  Phone, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Database, 
  Calendar, 
  Eye, 
  Volume2, 
  VolumeX, 
  Shield, 
  ArrowRight, 
  UserPlus, 
  Car, 
  Tag, 
  Edit3,
  Users,
  Timer,
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  HardHat,
  Filter,
  ChevronDown
} from 'lucide-react';

export type PerfilAcesso = 'autorizado' | 'prestador_unidade' | 'prestador_condominio';
export type TipoValidade = 'hoje' | 'amanha' | '3_dias' | '7_dias' | '30_dias' | 'personalizado' | 'permanente';

export const OPCOES_PARENTESCO = [
  'Mãe',
  'Pai',
  'Filho(a)',
  'Irmão(ã)',
  'Cônjuge / Namorado(a)',
  'Avô(ó)',
  'Neto(a)',
  'Tio(a) / Primo(a)',
  'Amigo(a)',
  'Entregador Eventual',
  'Diarista Frequente',
  'Outro'
];

interface PrestadoresObrasProps {
  usuarioLogado?: any;
}

export default function PrestadoresObras({ usuarioLogado }: PrestadoresObrasProps) {
  const [idCondominio, setIdCondominio] = useState(() => getCondominioAtivoId(usuarioLogado));
  const operadorNome = usuarioLogado?.nome || usuarioLogado?.login || 'Operador da Portaria';

  // Configuração da estrutura do condomínio (Casas vs Torres vs Blocos)
  const [condoConfig, setCondoConfig] = useState<any>(null);

  useEffect(() => {
    const handleCondoChange = (e: any) => {
      const novoId = e?.detail?.id;
      if (novoId && novoId !== 'global' && novoId !== 'todos') {
        setIdCondominio(novoId);
      } else {
        setIdCondominio(getCondominioAtivoId(usuarioLogado));
      }
    };
    window.addEventListener('infport:condominio_alterado', handleCondoChange);
    return () => window.removeEventListener('infport:condominio_alterado', handleCondoChange);
  }, [usuarioLogado]);

  useEffect(() => {
    async function carregarConfigCondo() {
      if (idCondominio && idCondominio !== 'global' && idCondominio !== 'todos') {
        try {
          const cfg = await carregarCondominioConfig(idCondominio);
          setCondoConfig(cfg);
        } catch (e) {
          console.warn('Erro ao carregar configuracao do condominio:', e);
        }
      }
    }
    carregarConfigCondo();
  }, [idCondominio]);

  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);

  // Abas principais (Removida aba SQL da tela conforme solicitação)
  const [abaAtiva, setAbaAtiva] = useState<'dentro' | 'cadastros' | 'historico'>('dentro');

  // Dados
  const [cadastros, setCadastros] = useState<any[]>([]);
  const [acessosAtivos, setAcessosAtivos] = useState<any[]>([]);
  const [historicoAcessos, setHistoricoAcessos] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos');
  const [filtroValidade, setFiltroValidade] = useState<string>('todos');
  const [mostrarFiltrosCadastros, setMostrarFiltrosCadastros] = useState(false);

  // Hora atual em tempo real para cálculo dos cronômetros regressivos
  const [tempoAtual, setTempoAtual] = useState(Date.now());
  const [alertaSonoroHabilitado, setAlertaSonoroHabilitado] = useState(true);

  // Modais
  const [modalNovoCadastro, setModalNovoCadastro] = useState(false);
  const [modalEditarCadastro, setModalEditarCadastro] = useState(false);
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalSaida, setModalSaida] = useState(false);
  const [modalProrrogar, setModalProrrogar] = useState(false);
  const [modalOcrAberto, setModalOcrAberto] = useState(false);
  const [modalVisualizarFoto, setModalVisualizarFoto] = useState<string | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<any | null>(null);

  // Formulário de Cadastro / Liberação / Edição
  const [perfilAcesso, setPerfilAcesso] = useState<PerfilAcesso>('autorizado');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('CPF');
  const [empresa, setEmpresa] = useState('');
  const [parentescoVinculo, setParentescoVinculo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [unidade, setUnidade] = useState('');
  const [bloco, setBloco] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoRosto, setFotoRosto] = useState('');
  const [fotoDocumento, setFotoDocumento] = useState('');
  const [tipoValidade, setTipoValidade] = useState<TipoValidade>('hoje');
  const [dataValidadeInicio, setDataValidadeInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataValidadeFim, setDataValidadeFim] = useState(new Date().toISOString().slice(0, 10));
  const [termoReutilizacao, setTermoReutilizacao] = useState('');
  const [sugestoesReutilizacao, setSugestoesReutilizacao] = useState<any[]>([]);

  // Formulário de Entrada
  const [tempoMaximoMinutos, setTempoMaximoMinutos] = useState<number>(240); // Padrão: 4 horas para prestadores
  const [tempoMaximoCustomizado, setTempoMaximoCustomizado] = useState<string>('');
  const [crachaEntrada, setCrachaEntrada] = useState('');
  const [placaEntrada, setPlacaEntrada] = useState('');
  const [observacoesEntrada, setObservacoesEntrada] = useState('');
  const [alertaExpiracaoConfirmado, setAlertaExpiracaoConfirmado] = useState(false);

  // Formulário de Saída
  const [crachaDevolvido, setCrachaDevolvido] = useState(true);
  const [observacoesSaida, setObservacoesSaida] = useState('');

  // Formulário de Prorrogação
  const [minutosProrrogacao, setMinutosProrrogacao] = useState(60);
  const [prorrogarCustomizado, setProrrogarCustomizado] = useState<string>('');

  // Atualiza relógio do cronômetro a cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setTempoAtual(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    carregarTudo();
    carregarMoradores();
  }, [idCondominio]);

  // Carrega moradores do condomínio para vínculo rápido
  const carregarMoradores = async () => {
    if (!idCondominio || idCondominio === 'global' || idCondominio === 'todos') {
      setMoradores([]);
      return;
    }
    try {
      const query = supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone')
        .eq('condominio_id', idCondominio)
        .order('unidade');
      const { data } = await query;
      if (data) setMoradores(data);
    } catch (e) {
      console.warn('Erro ao carregar moradores:', e);
    }
  };

  const carregarTudo = async () => {
    if (!idCondominio || idCondominio === 'global' || idCondominio === 'todos') {
      setCadastros([]);
      setAcessosAtivos([]);
      setHistoricoAcessos([]);
      return;
    }

    setLoading(true);
    try {
      // 1. Carrega cadastros mestres com projeção estrita de colunas e paginação
      const cadQuery = supabase
        .from('prestadores')
        .select('id, condominio_id, nome_profissional, documento, empresa, perfil_acesso, unidade, bloco, cracha_atribuido, data_hora_entrada, limite_permanencia_ate, status_acesso, telefone, placa_veiculo, modelo_veiculo, foto_rosto, foto_documento, parentesco_vinculo, created_at')
        .eq('condominio_id', idCondominio)
        .order('created_at', { ascending: false })
        .range(0, 49);
      const { data: dadosCadastros, error: erroCad } = await cadQuery;

      if (erroCad) throw erroCad;
      setCadastros(dadosCadastros || []);

      // 2. Carrega acessos ativos (Dentro do Condomínio)
      let ativos: any[] = [];
      try {
        const acessosQuery = supabase
          .from('prestadores_acessos')
          .select('id, prestador_id, condominio_id, perfil_acesso, nome_completo, documento, empresa, parentesco_vinculo, unidade, bloco, foto_rosto, foto_documento, cracha, placa_veiculo, modelo_veiculo, data_hora_entrada, tempo_maximo_minutos, limite_permanencia_ate, operador_entrada_nome, status_acesso')
          .eq('condominio_id', idCondominio)
          .is('data_hora_saida', null)
          .order('data_hora_entrada', { ascending: false })
          .range(0, 49);
        const { data: acessosDb, error: erroAcessos } = await acessosQuery;

        if (!erroAcessos && acessosDb && acessosDb.length > 0) {
          ativos = acessosDb;
        } else {
          // Fallback para prestadores com status 'DENTRO' ou 'EM_ANDAMENTO'
          ativos = (dadosCadastros || []).filter((p: any) => 
            p.status_acesso === 'EM_ANDAMENTO' || p.status_acesso === 'DENTRO'
          ).map((p: any) => ({
            id: p.id,
            prestador_id: p.id,
            condominio_id: p.condominio_id,
            perfil_acesso: p.perfil_acesso || (p.atende_condominio ? 'prestador_condominio' : 'prestador_unidade'),
            nome_completo: p.nome_profissional || p.nome_completo,
            documento: p.documento,
            empresa: p.empresa,
            parentesco_vinculo: p.parentesco_vinculo,
            unidade: p.unidade,
            bloco: p.bloco,
            foto_rosto: p.foto_rosto,
            cracha: p.cracha_atribuido || p.cracha,
            placa_veiculo: p.placa_veiculo,
            data_hora_entrada: p.data_hora_entrada || p.created_at,
            tempo_maximo_minutos: p.perfil_acesso === 'autorizado' ? null : (p.tempo_maximo_minutos || 240),
            limite_permanencia_ate: p.perfil_acesso === 'autorizado' ? null : p.limite_permanencia_ate,
            operador_entrada_nome: p.operador_entrada_nome || 'Operador',
            status_acesso: 'DENTRO'
          }));
        }
      } catch {
        ativos = (dadosCadastros || []).filter((p: any) => 
          p.status_acesso === 'EM_ANDAMENTO' || p.status_acesso === 'DENTRO'
        );
      }
      setAcessosAtivos(ativos);

      // 3. Carrega histórico de acessos concluídos com range pagination
      try {
        const histQuery = supabase
          .from('prestadores_acessos')
          .select('id, prestador_id, condominio_id, perfil_acesso, nome_completo, documento, empresa, unidade, bloco, cracha, placa_veiculo, data_hora_entrada, data_hora_saida, status_acesso')
          .eq('condominio_id', idCondominio)
          .not('data_hora_saida', 'is', null)
          .order('data_hora_saida', { ascending: false })
          .range(0, 49);
        const { data: histDb } = await histQuery;

        if (histDb) setHistoricoAcessos(histDb);
      } catch {}
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar dados: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Autocomplete / Busca rápida de histórico para reutilização de cadastro
  useEffect(() => {
    if (!termoReutilizacao || termoReutilizacao.trim().length < 2) {
      setSugestoesReutilizacao([]);
      return;
    }
    const termo = termoReutilizacao.toLowerCase();
    const filtrados = cadastros.filter((c: any) => 
      (c.nome_profissional || c.nome_completo || '').toLowerCase().includes(termo) ||
      (c.documento || '').replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
    ).slice(0, 5);
    setSugestoesReutilizacao(filtrados);
  }, [termoReutilizacao, cadastros]);

  // Preenche dados ao selecionar uma pessoa já cadastrada anteriormente
  const selecionarParaReutilizar = (item: any) => {
    setNomeCompleto(item.nome_profissional || item.nome_completo || '');
    setDocumento(item.documento || '');
    setTipoDocumento(item.tipo_documento || 'CPF');
    setEmpresa(item.empresa || '');
    setParentescoVinculo(item.parentesco_vinculo || '');
    setTelefone(item.telefone || '');
    setPlacaVeiculo(item.placa_veiculo || '');
    setFotoRosto(item.foto_rosto || '');
    setFotoDocumento(item.foto_documento || '');
    setTipoServico(item.tipo_servico || '');
    setObservacoes(item.observacoes || '');
    if (item.perfil_acesso) setPerfilAcesso(item.perfil_acesso as PerfilAcesso);
    if (item.unidade && item.unidade !== 'Condomínio') setUnidade(item.unidade);
    if (item.bloco && item.bloco !== 'Área Comum') setBloco(item.bloco);
    setSugestoesReutilizacao([]);
    setTermoReutilizacao('');
    setMensagem({ tipo: 'sucesso', texto: 'Dados do histórico recuperados! Ajuste e confirme a liberação.' });
  };

  // Abertura do Modal de Edição de Cadastro
  const abrirEdicaoCadastro = (item: any) => {
    setIdEdicao(item.id);
    setNomeCompleto(item.nome_profissional || item.nome_completo || '');
    setDocumento(item.documento || '');
    setTipoDocumento(item.tipo_documento || 'CPF');
    setEmpresa(item.empresa || '');
    setParentescoVinculo(item.parentesco_vinculo || '');
    setTelefone(item.telefone || '');
    setPlacaVeiculo(item.placa_veiculo || '');
    setFotoRosto(item.foto_rosto || '');
    setFotoDocumento(item.foto_documento || '');
    setTipoServico(item.tipo_servico || '');
    setObservacoes(item.observacoes || '');
    setPerfilAcesso((item.perfil_acesso as PerfilAcesso) || 'autorizado');
    setUnidade(item.unidade === 'Condomínio' ? '' : item.unidade || '');
    setBloco(item.bloco === 'Área Comum' ? '' : item.bloco || '');
    setTipoValidade((item.tipo_validade as TipoValidade) || 'hoje');
    if (item.data_validade_inicio) setDataValidadeInicio(item.data_validade_inicio.slice(0, 10));
    if (item.data_validade_fim) setDataValidadeFim(item.data_validade_fim.slice(0, 10));
    setModalEditarCadastro(true);
  };

  // Salvar Edição
  const salvarEdicaoCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idEdicao) return;
    setLoading(true);

    try {
      const datasValidade = calcularDatasValidade(tipoValidade);
      const payload: any = {
        perfil_acesso: perfilAcesso,
        nome_profissional: nomeCompleto.trim(),
        documento: documento.trim(),
        tipo_documento: tipoDocumento,
        empresa: perfilAcesso === 'autorizado' ? (parentescoVinculo || 'Visitante/Família') : empresa.trim(),
        parentesco_vinculo: parentescoVinculo.trim() || null,
        telefone: telefone.trim() || null,
        placa_veiculo: placaVeiculo.trim() || null,
        foto_rosto: fotoRosto || null,
        foto_url: fotoRosto || null,
        foto_documento: fotoDocumento || null,
        tipo_servico: tipoServico.trim() || null,
        atende_condominio: perfilAcesso === 'prestador_condominio',
        unidade: perfilAcesso === 'prestador_condominio' ? 'Condomínio' : unidade.trim(),
        bloco: perfilAcesso === 'prestador_condominio' ? 'Área Comum' : (eEstruturaCasas ? 'Casa' : bloco.trim()),
        observacoes: observacoes.trim(),
        tipo_validade: tipoValidade,
        data_validade_inicio: datasValidade.inicio,
        data_validade_fim: datasValidade.fim
      };

      const { error } = await supabase
        .from('prestadores')
        .update(payload)
        .eq('id', idEdicao);

      if (error) throw error;

      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'EDITAR',
        descricao: `Atualizou dados cadastrais de ${nomeCompleto.trim()} (${perfilNome(perfilAcesso)}). Validade: ${tipoValidade}.`,
        detalhes: { id: idEdicao, nome: nomeCompleto.trim(), perfil: perfilAcesso },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Cadastro de ${nomeCompleto} atualizado com sucesso!` });
      fecharModalCadastro();
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar cadastro: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // OCR de Documentos
  const handleOcrConfirmado = (dados: {
    nomeCompleto: string;
    documento: string;
    tipoDocumento: string;
    cpf?: string;
    rg?: string;
    cnhRegistro?: string;
    validade?: string;
    fotoDocumentoBase64?: string;
    fotoRostoBase64?: string;
    empresa?: string;
  }) => {
    setNomeCompleto(dados.nomeCompleto);
    setDocumento(dados.documento);
    setTipoDocumento(dados.tipoDocumento);
    if (dados.fotoDocumentoBase64) setFotoDocumento(dados.fotoDocumentoBase64);
    if (dados.fotoRostoBase64) setFotoRosto(dados.fotoRostoBase64);
    if (dados.empresa && !empresa) setEmpresa(dados.empresa);
    setModalOcrAberto(false);
    setMensagem({ 
      tipo: 'sucesso', 
      texto: `Documento extraído com sucesso! Titular: ${dados.nomeCompleto} | Doc: ${dados.documento}` 
    });
  };

  // Upload manual de foto do rosto otimizada
  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await comprimirImagemBase64(file, 800, 800, 0.75);
      setFotoRosto(b64);
      setMensagem({ tipo: 'sucesso', texto: 'Foto do rosto otimizada e carregada com sucesso!' });
    } catch (err: any) {
      console.error('Erro ao processar foto:', err);
      setMensagem({ tipo: 'erro', texto: 'Falha ao processar foto.' });
    }
  };

  // Helper de datas de validade da liberação
  const calcularDatasValidade = (tipo: TipoValidade): { inicio: string; fim: string | null } => {
    const agora = new Date();
    const hojeStr = agora.toISOString().slice(0, 10);

    if (tipo === 'permanente') {
      return { inicio: hojeStr, fim: null };
    }

    if (tipo === 'hoje') {
      const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
      return { inicio: hojeStr, fim: fimHoje.toISOString() };
    }

    if (tipo === 'amanha') {
      const amanhaInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 0);
      const amanhaFim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 23, 59, 59);
      return { inicio: amanhaInicio.toISOString(), fim: amanhaFim.toISOString() };
    }

    if (tipo === '3_dias') {
      const fim3 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 3, 23, 59, 59);
      return { inicio: hojeStr, fim: fim3.toISOString() };
    }

    if (tipo === '7_dias') {
      const fim7 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 7, 23, 59, 59);
      return { inicio: hojeStr, fim: fim7.toISOString() };
    }

    if (tipo === '30_dias') {
      const fim30 = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 30, 23, 59, 59);
      return { inicio: hojeStr, fim: fim30.toISOString() };
    }

    return {
      inicio: dataValidadeInicio ? `${dataValidadeInicio}T00:00:00.000Z` : hojeStr,
      fim: dataValidadeFim ? `${dataValidadeFim}T23:59:59.999Z` : null
    };
  };

  // Validação de expiração da liberação
  const checarValidade = (item: any): { valido: boolean; expirou: boolean; texto: string; cor: string } => {
    if (item.tipo_validade === 'permanente' || !item.data_validade_fim) {
      return { valido: true, expirou: false, texto: 'Permanente (Sem Expiração)', cor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }

    const tFim = new Date(item.data_validade_fim).getTime();
    const dataFimFormatada = new Date(item.data_validade_fim).toLocaleDateString('pt-BR');

    if (Date.now() > tFim) {
      return {
        valido: false,
        expirou: true,
        texto: `Liberação expirada em ${dataFimFormatada}`,
        cor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      };
    }

    return {
      valido: true,
      expirou: false,
      texto: `Válido até ${dataFimFormatada}`,
      cor: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    };
  };

  // Cronômetro de permanência: Visitantes/Família NÃO têm limite de permanência!
  const checarPermanencia = (item: any) => {
    const ehVisitante = item.perfil_acesso === 'autorizado';

    if (ehVisitante || !item.limite_permanencia_ate) {
      return {
        status: 'normal',
        minutosRestantes: 999,
        texto: 'Permanência Livre (Família / Visitante)',
        corFundo: 'bg-slate-900 border-slate-800',
        badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        estourado: false
      };
    }

    const tLimite = new Date(item.limite_permanencia_ate).getTime();
    const diffMs = tLimite - tempoAtual;
    const estourado = diffMs <= 0;

    const absMs = Math.abs(diffMs);
    const horas = Math.floor(absMs / 3600000);
    const minutos = Math.floor((absMs % 3600000) / 60000);
    const segundos = Math.floor((absMs % 60000) / 1000);
    const formatado = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

    if (estourado) {
      return {
        status: 'estourado',
        minutosRestantes: 0,
        texto: `ESTOURADO: +${formatado}`,
        corFundo: 'bg-red-950/60 border-red-500/70 shadow-lg shadow-red-950/50 animate-pulse',
        badge: 'bg-red-600 text-white font-black',
        estourado: true
      };
    }

    const minutosTotais = Math.floor(diffMs / 60000);
    if (minutosTotais < 15) {
      return {
        status: 'alerta',
        minutosRestantes: minutosTotais,
        texto: `Atenção: resta ${formatado}`,
        corFundo: 'bg-amber-950/40 border-amber-500/60',
        badge: 'bg-amber-500 text-slate-950 font-black',
        estourado: false
      };
    }

    return {
      status: 'normal',
      minutosRestantes: minutosTotais,
      texto: `Restante: ${formatado}`,
      corFundo: 'bg-slate-900 border-slate-800',
      badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      estourado: false
    };
  };

  // Salvar Novo Cadastro
  const salvarCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });

    if (!nomeCompleto.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O Nome Completo é obrigatório.' });
      return;
    }

    if (perfilAcesso === 'autorizado' && !unidade.trim()) {
      setMensagem({ tipo: 'erro', texto: `Para Autorizados (Visitantes/Família), informe ${eEstruturaCasas ? 'o Número da Casa' : 'a Unidade/Apartamento'} de destino.` });
      return;
    }

    if (perfilAcesso === 'prestador_unidade' && (!documento.trim() || !unidade.trim())) {
      setMensagem({ tipo: 'erro', texto: `Para Prestadores da Unidade, o Documento e ${eEstruturaCasas ? 'o Número da Casa' : 'a Unidade'} de destino são obrigatórios.` });
      return;
    }

    if (perfilAcesso === 'prestador_condominio' && !documento.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Para Prestadores do Condomínio, o Documento é obrigatório.' });
      return;
    }

    setLoading(true);
    try {
      const datasValidade = calcularDatasValidade(tipoValidade);
      const condoEfetivo = (!idCondominio || idCondominio === 'global' || idCondominio === 'todos')
        ? getCondominioAtivoId(usuarioLogado)
        : idCondominio;

      if (!condoEfetivo || condoEfetivo === 'global' || condoEfetivo === 'todos') {
        setMensagem({ tipo: 'erro', texto: 'Selecione um condomínio válido antes de cadastrar pessoa/prestador.' });
        setLoading(false);
        return;
      }

      const payload: any = {
        condominio_id: condoEfetivo,
        perfil_acesso: perfilAcesso,
        nome_profissional: nomeCompleto.trim(),
        documento: documento.trim(),
        tipo_documento: tipoDocumento,
        empresa: perfilAcesso === 'autorizado' ? (parentescoVinculo || 'Visitante/Família') : empresa.trim(),
        parentesco_vinculo: parentescoVinculo.trim() || null,
        telefone: telefone.trim() || null,
        placa_veiculo: placaVeiculo.trim() || null,
        foto_rosto: fotoRosto || null,
        foto_url: fotoRosto || null,
        foto_documento: fotoDocumento || null,
        tipo_servico: tipoServico.trim() || (perfilAcesso === 'autorizado' ? 'Visita Familiar' : 'Prestação de Serviço'),
        atende_condominio: perfilAcesso === 'prestador_condominio',
        unidade: perfilAcesso === 'prestador_condominio' ? 'Condomínio' : unidade.trim(),
        bloco: perfilAcesso === 'prestador_condominio' ? 'Área Comum' : (eEstruturaCasas ? 'Casa' : bloco.trim()),
        observacoes: observacoes.trim(),
        tipo_validade: tipoValidade,
        data_validade_inicio: datasValidade.inicio,
        data_validade_fim: datasValidade.fim,
        status_acesso: 'AUTORIZADO',
        operador_entrada_nome: operadorNome
      };

      const { error } = await supabase.from('prestadores').insert([payload]);
      if (error) throw error;

      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'CRIAR',
        descricao: `Cadastrou liberação para ${nomeCompleto.trim()} (${perfilNome(perfilAcesso)}) - Destino: ${payload.unidade} ${payload.bloco || ''}. Validade: ${tipoValidade}.`,
        detalhes: { nome: nomeCompleto.trim(), perfil: perfilAcesso, unidade: payload.unidade, tipoValidade },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Liberação de ${nomeCompleto} cadastrada com sucesso!` });
      fecharModalCadastro();
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao cadastrar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const fecharModalCadastro = () => {
    setModalNovoCadastro(false);
    setModalEditarCadastro(false);
    setIdEdicao(null);
    setNomeCompleto('');
    setDocumento('');
    setTipoDocumento('CPF');
    setEmpresa('');
    setParentescoVinculo('');
    setTelefone('');
    setPlacaVeiculo('');
    setUnidade('');
    setBloco('');
    setTipoServico('');
    setObservacoes('');
    setFotoRosto('');
    setFotoDocumento('');
    setTipoValidade('hoje');
    setTermoReutilizacao('');
    setSugestoesReutilizacao([]);
  };

  // Entrada
  const abrirModalEntradaPara = (pessoa: any) => {
    setItemSelecionado(pessoa);
    setTempoMaximoMinutos(240); // 4 horas para prestadores
    setTempoMaximoCustomizado('');
    setCrachaEntrada(pessoa.cracha_atribuido || '');
    setPlacaEntrada(pessoa.placa_veiculo || '');
    setObservacoesEntrada('');
    setAlertaExpiracaoConfirmado(false);
    setModalEntrada(true);
  };

  const confirmarEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSelecionado) return;

    const statusValidade = checarValidade(itemSelecionado);
    if (statusValidade.expirou && !alertaExpiracaoConfirmado) {
      setMensagem({ tipo: 'erro', texto: 'Atenção: A liberação desta pessoa está expirada. Confirme com o morador para prosseguir.' });
      return;
    }

    setLoading(true);
    try {
      const ehVisitante = itemSelecionado.perfil_acesso === 'autorizado';
      const minutosEfetivos = ehVisitante ? null : (tempoMaximoCustomizado ? parseInt(tempoMaximoCustomizado, 10) || 240 : tempoMaximoMinutos);
      const agora = new Date();
      const limitePermanencia = (ehVisitante || !minutosEfetivos) ? null : new Date(agora.getTime() + minutosEfetivos * 60000).toISOString();

      // 1. Atualiza status no cadastro mestre
      await supabase
        .from('prestadores')
        .update({
          status_acesso: 'DENTRO',
          data_hora_entrada: agora.toISOString(),
          data_hora_saida: null,
          cracha_atribuido: crachaEntrada.trim() || null,
          tempo_maximo_minutos: minutosEfetivos,
          limite_permanencia_ate: limitePermanencia,
          operador_entrada_nome: operadorNome
        })
        .eq('id', itemSelecionado.id);

      // 2. Grava histórico na tabela prestadores_acessos
      try {
        await supabase.from('prestadores_acessos').insert([{
          condominio_id: idCondominio,
          prestador_id: itemSelecionado.id,
          perfil_acesso: itemSelecionado.perfil_acesso || 'prestador_unidade',
          nome_completo: itemSelecionado.nome_profissional || itemSelecionado.nome_completo,
          documento: itemSelecionado.documento,
          empresa: itemSelecionado.empresa,
          parentesco_vinculo: itemSelecionado.parentesco_vinculo,
          unidade: itemSelecionado.unidade,
          bloco: itemSelecionado.bloco,
          foto_rosto: itemSelecionado.foto_rosto,
          cracha: crachaEntrada.trim() || null,
          placa_veiculo: placaEntrada.trim() || itemSelecionado.placa_veiculo || null,
          data_hora_entrada: agora.toISOString(),
          tempo_maximo_minutos: minutosEfetivos,
          limite_permanencia_ate: limitePermanencia,
          status_acesso: 'DENTRO',
          operador_entrada_nome: operadorNome,
          observacoes: observacoesEntrada.trim() || null
        }]);
      } catch {}

      // 3. Auditoria no Histórico Absoluto
      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'ENTRADA',
        descricao: `Registrou ENTRADA de ${itemSelecionado.nome_profissional || itemSelecionado.nome_completo} para ${itemSelecionado.unidade} ${itemSelecionado.bloco || ''}. ${ehVisitante ? 'Permanência Livre' : `Tempo max: ${Math.floor((minutosEfetivos || 0) / 60)}h`}. Crachá: ${crachaEntrada || 'N/A'}.`,
        detalhes: {
          pessoaId: itemSelecionado.id,
          nome: itemSelecionado.nome_profissional || itemSelecionado.nome_completo,
          unidade: itemSelecionado.unidade,
          cracha: crachaEntrada,
          ehVisitante
        },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      const horaLimiteFmt = limitePermanencia 
        ? new Date(limitePermanencia).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null;

      setMensagem({ 
        tipo: 'sucesso', 
        texto: horaLimiteFmt 
          ? `Entrada de ${itemSelecionado.nome_profissional || itemSelecionado.nome_completo} registrada! Permanência autorizada até às ${horaLimiteFmt}.`
          : `Entrada de ${itemSelecionado.nome_profissional || itemSelecionado.nome_completo} registrada (Permanência livre)!` 
      });
      setModalEntrada(false);
      setAbaAtiva('dentro');
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar entrada: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Saída
  const abrirModalSaidaPara = (item: any) => {
    setItemSelecionado(item);
    setCrachaDevolvido(true);
    setObservacoesSaida('');
    setModalSaida(true);
  };

  const confirmarSaida = async () => {
    if (!itemSelecionado) return;
    setLoading(true);

    try {
      const agora = new Date().toISOString();
      const targetId = itemSelecionado.prestador_id || itemSelecionado.id;

      await supabase
        .from('prestadores')
        .update({
          status_acesso: 'AUTORIZADO',
          data_hora_saida: agora,
          operador_saida_nome: operadorNome
        })
        .eq('id', targetId);

      try {
        await supabase
          .from('prestadores_acessos')
          .update({
            data_hora_saida: agora,
            status_acesso: 'CONCLUIDO',
            operador_saida_nome: operadorNome,
            observacoes: observacoesSaida.trim() || undefined
          })
          .eq('status_acesso', 'DENTRO')
          .eq('prestador_id', targetId);
      } catch {}

      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'SAIDA',
        descricao: `Registrou SAÍDA de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional}. Crachá: ${crachaDevolvido ? 'Devolvido' : 'Pendente'}.`,
        detalhes: {
          nome: itemSelecionado.nome_completo || itemSelecionado.nome_profissional,
          cracha: itemSelecionado.cracha || itemSelecionado.cracha_atribuido,
          crachaDevolvido
        },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ tipo: 'sucesso', texto: `Saída de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional} registrada!` });
      setModalSaida(false);
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao registrar saída: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Prorrogação de Tempo de Permanência
  const handleProrrogarTempo = async () => {
    if (!itemSelecionado) return;
    setLoading(true);

    try {
      const minAdicionados = prorrogarCustomizado ? (parseInt(prorrogarCustomizado, 10) || 60) : minutosProrrogacao;
      const tAntigo = itemSelecionado.limite_permanencia_ate ? new Date(itemSelecionado.limite_permanencia_ate).getTime() : Date.now();
      const novoLimite = new Date(Math.max(Date.now(), tAntigo) + minAdicionados * 60000).toISOString();
      const novoLimiteFmt = new Date(novoLimite).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const targetId = itemSelecionado.prestador_id || itemSelecionado.id;

      await supabase
        .from('prestadores')
        .update({ limite_permanencia_ate: novoLimite })
        .eq('id', targetId);

      try {
        await supabase
          .from('prestadores_acessos')
          .update({ limite_permanencia_ate: novoLimite })
          .eq('status_acesso', 'DENTRO')
          .eq('prestador_id', targetId);
      } catch {}

      await registrarAtividade({
        modulo: 'Prestadores',
        acao: 'EDITAR',
        descricao: `Prorrogou tempo de permanência de ${itemSelecionado.nome_completo || itemSelecionado.nome_profissional} em +${minAdicionados} minutos (Autorizado até às ${novoLimiteFmt}).`,
        detalhes: { novoLimite, minutosAdicionados: minAdicionados },
        operador_nome: operadorNome,
        condominio_id: idCondominio
      });

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Tempo prorrogado em +${minAdicionados} minutos! Novo horário limite de permanência: até às ${novoLimiteFmt}.` 
      });
      setModalProrrogar(false);
      setProrrogarCustomizado('');
      await carregarTudo();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao prorrogar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp
  const dispararWhatsAppEntrada = (item: any) => {
    const nome = item.nome_profissional || item.nome_completo;
    const agora = new Date();
    const dataHoje = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
    const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
    const horaLimiteStr = item.limite_permanencia_ate 
      ? new Date(item.limite_permanencia_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
      : null;
    const linhaLimite = horaLimiteStr ? `\n⏰ *Permanência autorizada até às:* ${horaLimiteStr}` : '';

    if (perfil === 'prestador_condominio') {
      const telSindico = usuarioLogado?.condominio?.sindico_whatsapp?.replace(/\D/g, '') || '';
      const texto = `Aviso Portaria: O prestador *${nome}* da empresa *${item.empresa || 'Serviços'}* registrou *ENTRADA* para manutenção no condomínio às *${hora}* em *${dataHoje}*. Crachá: ${item.cracha || item.cracha_atribuido || 'N/A'}.${linhaLimite}\n• Operador Responsável: ${nomeOp}\n• Data/Hora: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telSindico, texto, nomeOp);
      window.open(url, '_blank');
    } else {
      const moradorDestino = moradores.find((m: any) => 
        m.unidade?.toString().trim().toLowerCase() === item.unidade?.toString().trim().toLowerCase() &&
        (!item.bloco || m.bloco?.toString().trim().toLowerCase() === item.bloco?.toString().trim().toLowerCase())
      );
      const telMorador = moradorDestino?.telefone?.replace(/\D/g, '') || item.telefone?.replace(/\D/g, '') || '';
      const rotuloDestino = formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura);
      const texto = `Olá! Informamos que o prestador *${nome}* acabou de registrar *ENTRADA* na portaria para ${rotuloDestino} às *${hora}* do dia *${dataHoje}*.${linhaLimite}\n• Operador Responsável: ${nomeOp}\n• Data/Hora: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telMorador, texto, nomeOp);
      window.open(url, '_blank');
    }
  };

  const dispararWhatsAppProrrogacao = (item: any, novoLimiteIso?: string, minAdicionados?: number) => {
    const nome = item.nome_profissional || item.nome_completo;
    const agora = new Date();
    const dataHoje = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
    const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
    const targetLimite = novoLimiteIso || item.limite_permanencia_ate;
    const horaLimiteStr = targetLimite 
      ? new Date(targetLimite).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
      : 'Horário estendido';
    const strTempo = minAdicionados ? ` em *+${minAdicionados} minutos*` : '';

    if (perfil === 'prestador_condominio') {
      const telSindico = usuarioLogado?.condominio?.sindico_whatsapp?.replace(/\D/g, '') || '';
      const texto = `⏱️ *PRORROGAÇÃO DE PERMANÊNCIA - PORTARIA*\nO prestador *${nome}* (${item.empresa || 'Serviços'}) teve seu prazo de permanência estendido.\n⏰ *Novo Horário Limite de Saída:* até às *${horaLimiteStr}*.\n• Operador Responsável: ${nomeOp}\n• Atualizado em: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telSindico, texto, nomeOp);
      window.open(url, '_blank');
    } else {
      const moradorDestino = moradores.find((m: any) => 
        m.unidade?.toString().trim().toLowerCase() === item.unidade?.toString().trim().toLowerCase() &&
        (!item.bloco || m.bloco?.toString().trim().toLowerCase() === item.bloco?.toString().trim().toLowerCase())
      );
      const telMorador = moradorDestino?.telefone?.replace(/\D/g, '') || item.telefone?.replace(/\D/g, '') || '';
      const rotuloDestino = formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura);
      const texto = `⏱️ *PRORROGAÇÃO DE PERMANÊNCIA - PORTARIA*\nInformamos que a permanência do prestador *${nome}* para ${rotuloDestino} foi estendida na portaria.\n⏰ *Novo Horário Limite de Saída:* até às *${horaLimiteStr}*.\n• Operador Responsável: ${nomeOp}\n• Atualizado em: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telMorador, texto, nomeOp);
      window.open(url, '_blank');
    }
  };

  const dispararWhatsAppSaida = (item: any) => {
    const nome = item.nome_profissional || item.nome_completo;
    const agora = new Date();
    const dataHoje = agora.toLocaleDateString('pt-BR');
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
    const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');

    if (perfil === 'prestador_condominio') {
      const telSindico = usuarioLogado?.condominio?.sindico_whatsapp?.replace(/\D/g, '') || '';
      const texto = `Aviso Portaria: O prestador *${nome}* da empresa *${item.empresa || 'Serviços'}* registrou *SAÍDA* do condomínio às *${hora}* em *${dataHoje}*.\n• Operador Responsável: ${nomeOp}\n• Data/Hora: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telSindico, texto, nomeOp);
      window.open(url, '_blank');
    } else {
      const moradorDestino = moradores.find((m: any) => 
        m.unidade?.toString().trim().toLowerCase() === item.unidade?.toString().trim().toLowerCase() &&
        (!item.bloco || m.bloco?.toString().trim().toLowerCase() === item.bloco?.toString().trim().toLowerCase())
      );
      const telMorador = moradorDestino?.telefone?.replace(/\D/g, '') || item.telefone?.replace(/\D/g, '') || '';
      const texto = `Olá! Informamos que *${nome}* registrou *SAÍDA* na portaria às *${hora}* do dia *${dataHoje}*.\n• Operador Responsável: ${nomeOp}\n• Data/Hora: ${dataHoje} às ${hora}`;
      const url = formatarLinkWhatsApp(telMorador, texto, nomeOp);
      window.open(url, '_blank');
    }
  };

  const perfilNome = (p: string) => {
    switch (p) {
      case 'autorizado': return 'Visitante / Família';
      case 'prestador_unidade': return 'Prestador da Unidade';
      case 'prestador_condominio': return 'Prestador do Condomínio';
      default: return 'Autorizado';
    }
  };

  const perfilBadge = (p: string) => {
    switch (p) {
      case 'autorizado':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'prestador_unidade':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'prestador_condominio':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const cadastrosFiltrados = useMemo(() => {
    return cadastros.filter((c: any) => {
      const nome = (c.nome_profissional || c.nome_completo || '').toLowerCase();
      const doc = (c.documento || '').toLowerCase();
      const emp = (c.empresa || '').toLowerCase();
      const uni = (c.unidade || '').toLowerCase();
      const buscaTermo = busca.toLowerCase();

      const bateBusca = !busca || nome.includes(buscaTermo) || doc.includes(buscaTermo) || emp.includes(buscaTermo) || uni.includes(buscaTermo);
      if (!bateBusca) return false;

      if (filtroPerfil !== 'todos' && c.perfil_acesso !== filtroPerfil) return false;

      if (filtroValidade !== 'todos') {
        const infoVal = checarValidade(c);
        if (filtroValidade === 'validos' && !infoVal.valido) return false;
        if (filtroValidade === 'vencidos' && !infoVal.expirou) return false;
        if (filtroValidade === 'permanentes' && c.tipo_validade !== 'permanente') return false;
      }

      return true;
    });
  }, [cadastros, busca, filtroPerfil, filtroValidade]);

  const totalEstourados = useMemo(() => {
    return acessosAtivos.filter(a => checarPermanencia(a).estourado).length;
  }, [acessosAtivos, tempoAtual]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
            <UserCheck className="w-5 h-5" />
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
              Autorizados
            </h2>
            {totalEstourados > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {totalEstourados}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={carregarTudo}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              fecharModalCadastro();
              setModalNovoCadastro(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
            title="Liberação de Acesso"
          >
            <UserPlus className="w-4 h-4" />
            <span>Liberação</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK DE MENSAGEM */}
      {mensagem.texto && (
        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-150 ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
            : 'bg-red-950/80 text-red-300 border-red-500/40'
        }`}>
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO DE ABAS (Removida aba SQL da tela conforme instrução) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 border-b border-slate-800 pb-2 w-full">
        <button
          onClick={() => setAbaAtiva('dentro')}
          className={`w-full py-2 px-1 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
            abaAtiva === 'dentro'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center leading-tight">
            <div className="flex items-center gap-1 shrink-0">
              <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>No</span>
            </div>
            <span className="sm:ml-1">Condomínio</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
            totalEstourados > 0 
              ? 'bg-red-600 text-white animate-pulse' 
              : abaAtiva === 'dentro' ? 'bg-slate-950 text-purple-300' : 'bg-slate-800 text-slate-300'
          }`}>
            {acessosAtivos.length}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva('cadastros')}
          className={`w-full py-2 px-1 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
            abaAtiva === 'cadastros'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <div className="flex items-center justify-center gap-1 leading-tight shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Liberados</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] bg-slate-900/60 text-slate-300 shrink-0">
            {cadastros.length}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva('historico')}
          className={`w-full py-2 px-1 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs md:text-sm font-black transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
            abaAtiva === 'historico'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Histórico</span>
        </button>
      </div>

      {/* ABA 1: DENTRO DO CONDOMÍNIO */}
      {abaAtiva === 'dentro' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Presentes no condomínio agora: <strong className="text-white">{acessosAtivos.length}</strong></span>
            </div>
            {totalEstourados > 0 && (
              <span className="text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {totalEstourados} estouraram o limite de permanência!
              </span>
            )}
          </div>

          {acessosAtivos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-center flex items-center justify-center">
              <button
                type="button"
                onClick={() => setAbaAtiva('cadastros')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <Users className="w-4 h-4" />
                <span>Lista de Liberados</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {acessosAtivos.map((item) => {
                const infoPermanencia = checarPermanencia(item);
                const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
                const horaEntradaFmt = item.data_hora_entrada ? new Date(item.data_hora_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const ehVisitante = perfil === 'autorizado';

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-4 border transition duration-200 flex flex-col justify-between gap-3 text-white ${infoPermanencia.corFundo}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => (item.foto_rosto || item.foto_url) && setModalVisualizarFoto(item.foto_rosto || item.foto_url)}
                            className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center text-slate-500 relative group"
                          >
                            {(item.foto_rosto || item.foto_url) ? (
                              <ImagemOtimizada 
                                src={item.foto_rosto || item.foto_url} 
                                alt={item.nome_completo || 'Visitante/Prestador'} 
                                permitirAmpliar={false}
                                className="w-full h-full object-cover group-hover:scale-105 transition" 
                              />
                            ) : (
                              <UserCheck className="w-7 h-7" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${perfilBadge(perfil)}`}>
                              {perfilNome(perfil)}
                            </span>
                            <h4 className="font-extrabold text-sm text-white truncate mt-1">
                              {item.nome_completo || item.nome_profissional}
                            </h4>
                            <p className="text-[11px] text-slate-300 truncate">
                              {item.empresa || item.parentesco_vinculo || 'Visitante'}
                            </p>
                          </div>
                        </div>

                        {item.cracha && (
                          <span className="px-2 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-black shrink-0">
                            Crachá {item.cracha}
                          </span>
                        )}
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Destino:</span>
                          <span className="font-bold text-white">
                            {perfil === 'prestador_condominio' 
                              ? 'Área Comum / Condomínio' 
                              : formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="text-slate-400">Entrada registrada:</span>
                          <span className="font-mono text-emerald-400 font-bold">{horaEntradaFmt} ({item.operador_entrada_nome || 'Operador'})</span>
                        </div>
                        {item.placa_veiculo && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="text-slate-400">Veículo:</span>
                            <span className="font-mono text-slate-200 uppercase font-bold flex items-center gap-1">
                              <Car className="w-3 h-3 text-slate-400" /> {item.placa_veiculo}
                            </span>
                          </div>
                        )}

                        {!ehVisitante && item.limite_permanencia_ate && (
                          <div className="flex items-center justify-between text-slate-200 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/25 mt-1">
                            <span className="text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Autorizado até:
                            </span>
                            <span className="font-mono text-amber-200 font-black text-xs">
                              Até às {new Date(item.limite_permanencia_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Cronômetro Regressivo (Apenas para prestadores; visitantes têm permanência livre) */}
                      <div className={`p-3 rounded-2xl border text-center space-y-1 ${
                        infoPermanencia.estourado 
                          ? 'bg-red-950/80 border-red-500 text-red-200' 
                          : infoPermanencia.status === 'alerta'
                          ? 'bg-amber-950/60 border-amber-500/70 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}>
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase">
                          <Timer className={`w-3.5 h-3.5 ${infoPermanencia.estourado ? 'animate-bounce text-red-400' : 'text-purple-400'}`} />
                          <span>{ehVisitante ? 'Status de Permanência' : (infoPermanencia.estourado ? 'Tempo Esgotado' : 'Permanência Interna')}</span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-black tracking-wider">
                          {infoPermanencia.texto}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModalSaidaPara(item)}
                          className="bg-red-600 hover:bg-red-700 text-white font-black py-2 px-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1 transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Dar Saída</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => dispararWhatsAppEntrada(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition shadow-md active:scale-95 cursor-pointer"
                          title="Enviar aviso via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      {!ehVisitante && (
                        <button
                          type="button"
                          onClick={() => {
                            setItemSelecionado(item);
                            setMinutosProrrogacao(60);
                            setModalProrrogar(true);
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition border border-slate-700 cursor-pointer"
                        >
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Prorrogar Tempo (+1h / +2h)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LIBERAÇÕES & CADASTROS */}
      {abaAtiva === 'cadastros' && (
        <div className="space-y-3">
          {/* Barra Superior com Botão de Pesquisa e Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMostrarFiltrosCadastros(!mostrarFiltrosCadastros)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border shadow-2xs ${
                  mostrarFiltrosCadastros || (busca.trim() || filtroPerfil !== 'todos' || filtroValidade !== 'todos')
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-200 border-slate-800'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <Filter className="w-3.5 h-3.5" />
                <span>Pesquisa e Filtros</span>
                {(busca.trim() || filtroPerfil !== 'todos' || filtroValidade !== 'todos') && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Filtros ativos" />
                )}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mostrarFiltrosCadastros ? 'rotate-180' : ''}`} />
              </button>

              {/* 4º Mover para o lado do botão pesquisa e filtros */}
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-2 rounded-xl text-slate-300 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs">
                <span>{cadastrosFiltrados.length}</span>
                <span className="text-slate-400 font-normal">{cadastrosFiltrados.length === 1 ? 'liberação' : 'liberações'}</span>
              </span>
            </div>

            {(busca.trim() || filtroPerfil !== 'todos' || filtroValidade !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setFiltroPerfil('todos');
                  setFiltroValidade('todos');
                }}
                className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition cursor-pointer px-2 py-1 rounded-lg hover:bg-red-950/40"
              >
                <X className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>

          {/* Menus de Pesquisa e Filtros (Colocados dentro do botão) */}
          {mostrarFiltrosCadastros && (
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Buscar Autorizado / Prestador
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome, documento, ap., empresa..."
                      className="w-full bg-slate-950 text-white text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Filtrar por Perfil
                  </label>
                  <select
                    value={filtroPerfil}
                    onChange={(e) => setFiltroPerfil(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
                  >
                    <option value="todos">Todos os Perfis (3 Categorias)</option>
                    <option value="autorizado">🟣 1. Autorizados (Visitantes / Família)</option>
                    <option value="prestador_unidade">🔵 2. Prestadores da Unidade</option>
                    <option value="prestador_condominio">🟠 3. Prestadores do Condomínio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                    Status da Validade
                  </label>
                  <select
                    value={filtroValidade}
                    onChange={(e) => setFiltroValidade(e.target.value)}
                    className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
                  >
                    <option value="todos">Todas as Validades</option>
                    <option value="validos">🟢 Liberações Válidas</option>
                    <option value="vencidos">⚠️ Liberações Expiradas (Aviso Amarelo)</option>
                    <option value="permanentes">♾️ Permanentes / Recorrentes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {cadastrosFiltrados.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">Nenhum cadastro encontrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há pessoas cadastradas para os filtros aplicados. Clique em "Nova Liberação / Cadastro" acima.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cadastrosFiltrados.map((item) => {
                const perfil = item.perfil_acesso || (item.atende_condominio ? 'prestador_condominio' : 'prestador_unidade');
                const infoValidade = checarValidade(item);
                const jaEstaDentro = acessosAtivos.some((a: any) => (a.prestador_id || a.id) === item.id);

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 hover:bg-slate-850 p-3.5 sm:p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md ${
                      infoValidade.expirou ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      <div
                        onClick={() => (item.foto_rosto || item.foto_url) && setModalVisualizarFoto(item.foto_rosto || item.foto_url)}
                        className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 cursor-pointer"
                      >
                        {(item.foto_rosto || item.foto_url) ? (
                          <img src={item.foto_rosto || item.foto_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-6 h-6" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${perfilBadge(perfil)}`}>
                            {perfilNome(perfil)}
                          </span>

                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${infoValidade.cor}`}>
                            {infoValidade.texto}
                          </span>

                          {jaEstaDentro && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-500 text-slate-950">
                              Dentro Agora
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-white truncate">
                          {item.nome_profissional || item.nome_completo}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          {item.documento && (
                            <span>Doc: <strong className="text-slate-300 font-mono">{item.documento}</strong></span>
                          )}
                          {item.empresa && (
                            <span>Empresa: <strong className="text-slate-300">{item.empresa}</strong></span>
                          )}
                          {item.parentesco_vinculo && (
                            <span>Vínculo: <strong className="text-purple-300">{item.parentesco_vinculo}</strong></span>
                          )}
                          <span>
                            Destino: <strong className="text-amber-300">
                              {perfil === 'prestador_condominio' 
                                ? 'Área Comum' 
                                : formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações: Entrada, Editar Cadastro, WhatsApp */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {/* BOTÃO EDITAR CADASTRO */}
                      <button
                        type="button"
                        onClick={() => abrirEdicaoCadastro(item)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
                        title="Editar cadastro / Renovar validade"
                      >
                        <Pencil className="w-4 h-4 text-purple-400" />
                      </button>

                      {jaEstaDentro ? (
                        <button
                          type="button"
                          onClick={() => {
                            const ativo = acessosAtivos.find(a => (a.prestador_id || a.id) === item.id);
                            abrirModalSaidaPara(ativo || item);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Dar Saída</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModalEntradaPara(item)}
                          className={`font-black px-3.5 py-2 rounded-xl text-xs uppercase flex items-center gap-1.5 transition shadow-md active:scale-95 cursor-pointer ${
                            infoValidade.expirou
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                          }`}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{infoValidade.expirou ? 'Entrada (Expirado)' : 'Registrar Entrada'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => dispararWhatsAppEntrada(item)}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 p-2 rounded-xl border border-slate-700 transition cursor-pointer"
                        title="Notificar Morador / Síndico via WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE ACESSOS */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <span>Últimos acessos auditados e concluídos na guarita</span>
            <span className="font-bold text-white">{historicoAcessos.length} registro(s)</span>
          </div>

          {historicoAcessos.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Nenhum acesso concluído no histórico recente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historicoAcessos.map((h: any) => {
                const entradaFmt = h.data_hora_entrada ? new Date(h.data_hora_entrada).toLocaleString('pt-BR') : '--';
                const saidaFmt = h.data_hora_saida ? new Date(h.data_hora_saida).toLocaleString('pt-BR') : '--';

                return (
                  <div
                    key={h.id}
                    className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        onClick={() => (h.foto_rosto || h.foto_url) && setModalVisualizarFoto(h.foto_rosto || h.foto_url)}
                        className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 cursor-pointer"
                      >
                        {(h.foto_rosto || h.foto_url) ? (
                          <img src={h.foto_rosto || h.foto_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <UserCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${perfilBadge(h.perfil_acesso)}`}>
                            {perfilNome(h.perfil_acesso)}
                          </span>
                          <strong className="text-white text-sm truncate">{h.nome_completo}</strong>
                          {h.cracha && <span className="font-mono text-amber-300">Crachá {h.cracha}</span>}
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5 truncate">
                          Destino: <strong className="text-slate-200">{formatarIdentificacaoUnidade(h.unidade, h.bloco, condoConfig?.tipo_estrutura)}</strong> • Empresa/Vínculo: {h.empresa || h.parentesco_vinculo || 'Geral'}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono space-y-0.5 text-right self-end sm:self-center">
                      <p className="text-emerald-400">Entrada: {entradaFmt} ({h.operador_entrada_nome || 'Op'})</p>
                      <p className="text-red-400">Saída: {saidaFmt} ({h.operador_saida_nome || 'Op'})</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO CADASTRO OU EDIÇÃO */}
      {/* ========================================================================= */}
      {(modalNovoCadastro || modalEditarCadastro) && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 text-white space-y-5 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  {modalEditarCadastro ? <Pencil className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white uppercase">
                    {modalEditarCadastro ? 'Editar Cadastro / Liberação' : 'Nova Liberação de Acesso'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalEditarCadastro ? 'Atualize dados, validade ou fotos da pessoa' : 'Cadastre a autorização para familiares, prestadores de ap. ou condomínio'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalCadastro}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SELEÇÃO DOS 3 PERFIS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-amber-400">
                Categoria de Acesso:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPerfilAcesso('autorizado')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'autorizado'
                      ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-purple-300">1. Autorizados</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Visitantes / Família</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Permanência livre</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfilAcesso('prestador_unidade')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'prestador_unidade'
                      ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-blue-300">2. Prestador Unidade</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Obras e Reformas</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Com tempo limite</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPerfilAcesso('prestador_condominio')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                    perfilAcesso === 'prestador_condominio'
                      ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg shadow-amber-600/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <strong className="block text-xs text-amber-300">3. Condomínio</strong>
                  <span className="text-[11px] block mt-0.5 text-slate-300">Manutenção Predial</span>
                  <span className="text-[10px] block text-slate-400 mt-1">Área comum</span>
                </button>
              </div>
            </div>

            {/* REUTILIZAÇÃO (Apenas em novo cadastro) */}
            {!modalEditarCadastro && (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1.5 relative">
                <label className="block text-[11px] font-black uppercase text-indigo-400 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Reutilizar Cadastro Anterior (Busca Rápida por Nome ou CPF/RG)
                </label>
                <input
                  type="text"
                  value={termoReutilizacao}
                  onChange={(e) => setTermoReutilizacao(e.target.value)}
                  placeholder="Comece a digitar para puxar dados de quem já visitou antes..."
                  className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                />
                {sugestoesReutilizacao.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-2xl mt-1 shadow-2xl z-30 overflow-hidden divide-y divide-slate-800">
                    {sugestoesReutilizacao.map((sug) => (
                      <div
                        key={sug.id}
                        onClick={() => selecionarParaReutilizar(sug)}
                        className="p-2.5 hover:bg-indigo-950/60 cursor-pointer flex items-center justify-between text-xs transition"
                      >
                        <div className="flex items-center gap-2">
                          {sug.foto_rosto ? (
                            <img src={sug.foto_rosto} alt="" loading="lazy" decoding="async" className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                              <UserCheck className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <strong className="block text-white">{sug.nome_profissional || sug.nome_completo}</strong>
                            <span className="text-[10px] text-slate-400">Doc: {sug.documento || 'N/A'} • {sug.empresa || sug.unidade}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-400">Reutilizar Dados →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={modalEditarCadastro ? salvarEdicaoCadastro : salvarCadastro} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Nome Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Nome completo do visitante ou prestador"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-indigo-400 mb-1 flex items-center justify-between">
                    <span>Leitor OCR</span>
                    <span className="text-[10px] text-emerald-400 font-normal">CNH / RG</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalOcrAberto(true)}
                    className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-bold text-xs p-3 rounded-xl border border-indigo-500/50 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Scan className="w-4 h-4 text-indigo-400" />
                    <span>Ler Documento</span>
                  </button>
                </div>
              </div>

              {/* Documento e Empresa / Parentesco com Opções Padronizadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {perfilAcesso !== 'autorizado' && (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Documento (RG / CPF) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      placeholder="Número do documento"
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                )}

                {perfilAcesso === 'autorizado' ? (
                  <div className="sm:col-span-2 space-y-2">
                    <label className="block text-xs font-black uppercase text-purple-300 flex items-center justify-between">
                      <span>Parentesco / Vínculo (Formato Lista) <span className="text-red-400">*</span></span>
                      <span className="text-[10px] text-purple-400 font-normal">Selecione na lista</span>
                    </label>
                    <select
                      value={OPCOES_PARENTESCO.includes(parentescoVinculo) ? parentescoVinculo : (parentescoVinculo ? 'Outro' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== 'Outro') {
                          setParentescoVinculo(val);
                        } else {
                          setParentescoVinculo('Outro');
                        }
                      }}
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-semibold cursor-pointer"
                    >
                      <option value="">-- Selecione o Parentesco / Vínculo na Lista --</option>
                      {OPCOES_PARENTESCO.map((opc) => (
                        <option key={opc} value={opc}>
                          📋 {opc}
                        </option>
                      ))}
                    </select>

                    {(!OPCOES_PARENTESCO.includes(parentescoVinculo) || parentescoVinculo === 'Outro') && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">
                          Especifique o Parentesco / Vínculo Personalizado:
                        </label>
                        <input
                          type="text"
                          value={parentescoVinculo === 'Outro' ? '' : parentescoVinculo}
                          onChange={(e) => setParentescoVinculo(e.target.value)}
                          placeholder="Digite aqui o parentesco ou vínculo..."
                          className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-purple-500/70 focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      Empresa / Autônomo <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Ex: Pintor Autônomo, Elevadores Atlas"
                      className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Telefone WhatsApp
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Placa do Veículo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={placaVeiculo}
                    onChange={(e) => setPlacaVeiculo(e.target.value)}
                    placeholder="ABC-1234"
                    className="w-full bg-slate-950 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Destino */}
              {perfilAcesso !== 'prestador_condominio' && (
                <div className={`grid gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 ${eEstruturaCasas ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                      {eEstruturaCasas ? 'Número da Casa' : 'Apartamento / Unidade de Destino'} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={unidade}
                      onChange={(e) => setUnidade(e.target.value)}
                      placeholder={eEstruturaCasas ? "Ex: 45 ou 102" : "Ex: 102"}
                      className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 font-bold"
                    />
                  </div>

                  {!eEstruturaCasas && (
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                        Bloco (se houver)
                      </label>
                      <input
                        type="text"
                        value={bloco}
                        onChange={(e) => setBloco(e.target.value)}
                        placeholder="Ex: Bloco A"
                        className="w-full bg-slate-900 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Foto do Rosto */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs font-black uppercase text-emerald-400 flex items-center justify-between">
                  <span>Foto do Rosto (Obrigatória para Segurança)</span>
                  {fotoRosto && <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold"><CheckCircle2 className="w-3 h-3" /> Foto anexada</span>}
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
                    {fotoRosto ? (
                      <img src={fotoRosto} alt="Foto Rosto" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{fotoRosto ? 'Trocar Foto do Rosto' : 'Tirar Foto com Câmera ou Carregar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Validade */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="block text-xs font-black uppercase text-amber-400">
                  Prazo de Validade da Liberação:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoValidade('hoje')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'hoje'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Hoje (1 Dia)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('amanha')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'amanha'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Amanhã
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('7_dias')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === '7_dias'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    1 Semana
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoValidade('permanente')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                      tipoValidade === 'permanente'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Permanente ♾️
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTipoValidade('personalizado')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      tipoValidade === 'personalizado' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Personalizado...
                  </button>

                  {tipoValidade === 'personalizado' && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="date"
                        value={dataValidadeInicio}
                        onChange={(e) => setDataValidadeInicio(e.target.value)}
                        className="bg-slate-900 text-white text-xs p-1.5 rounded-lg border border-slate-700"
                      />
                      <span className="text-xs text-slate-400">até</span>
                      <input
                        type="date"
                        value={dataValidadeFim}
                        onChange={(e) => setDataValidadeFim(e.target.value)}
                        className="bg-slate-900 text-white text-xs p-1.5 rounded-lg border border-slate-700"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={fecharModalCadastro}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {loading ? 'Salvando...' : (modalEditarCadastro ? 'Salvar Alterações' : 'Salvar Liberação')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE ENTRADA (Visitantes NÃO têm tempo limite) */}
      {/* ========================================================================= */}
      {modalEntrada && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white uppercase">
                    Registrar Entrada no Condomínio
                  </h3>
                  <p className="text-xs text-slate-400">
                    {itemSelecionado.perfil_acesso === 'autorizado' ? 'Visitante / Família: Permanência livre' : 'Prestador: Defina tempo máximo de permanência e crachá'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalEntrada(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border border-slate-700">
                {itemSelecionado.foto_rosto ? (
                  <img src={itemSelecionado.foto_rosto} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <UserCheck className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-white text-sm truncate">
                  {itemSelecionado.nome_profissional || itemSelecionado.nome_completo}
                </h4>
                <p className="text-xs text-slate-300">
                  {itemSelecionado.empresa || itemSelecionado.parentesco_vinculo || 'Visitante'} • Destino: <strong>{formatarIdentificacaoUnidade(itemSelecionado.unidade, itemSelecionado.bloco, condoConfig?.tipo_estrutura)}</strong>
                </p>
              </div>
            </div>

            {/* AVISO DE EXPIRAÇÃO */}
            {(() => {
              const infoVal = checarValidade(itemSelecionado);
              if (infoVal.expirou) {
                return (
                  <div className="bg-amber-950/70 border-2 border-amber-500 p-4 rounded-2xl space-y-2 text-xs text-amber-200 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-black text-amber-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>{infoVal.texto}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Esta autorização venceu. Ligue por interfone para o morador para confirmar se autoriza a renovação de entrada hoje.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alertaExpiracaoConfirmado}
                        onChange={(e) => setAlertaExpiracaoConfirmado(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span className="font-bold text-white text-xs">
                        Morador confirmou liberação por interfone (Renovar para Hoje)
                      </span>
                    </label>
                  </div>
                );
              }
              return null;
            })()}

            <form onSubmit={confirmarEntrada} className="space-y-4">
              {/* REGRA: VISITANTES E FAMILIARES NÃO TÊM TEMPO MÁXIMO DE PERMANÊNCIA! */}
              {itemSelecionado.perfil_acesso === 'autorizado' ? (
                <div className="bg-purple-950/40 border border-purple-500/40 p-3.5 rounded-2xl text-xs space-y-1">
                  <span className="font-black text-purple-300 block flex items-center gap-1.5 uppercase text-[11px]">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" /> Permanência Livre (Visitante / Família)
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Familiares e visitantes não possuem tempo limite fixado e não geram alarmes de permanência estourada.
                  </p>
                </div>
              ) : (
                /* TEMPO MÁXIMO APENAS PARA PRESTADORES */
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase text-amber-400 flex items-center justify-between">
                    <span>Tempo Máximo de Permanência do Prestador:</span>
                    <span className="text-slate-400 font-normal">
                      {tempoMaximoCustomizado ? `${tempoMaximoCustomizado} min` : `${Math.floor(tempoMaximoMinutos / 60)}h`}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => { setTempoMaximoMinutos(60); setTempoMaximoCustomizado(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        tempoMaximoMinutos === 60 && !tempoMaximoCustomizado
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      1 Hora
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTempoMaximoMinutos(120); setTempoMaximoCustomizado(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        tempoMaximoMinutos === 120 && !tempoMaximoCustomizado
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      2 Horas
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTempoMaximoMinutos(240); setTempoMaximoCustomizado(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        tempoMaximoMinutos === 240 && !tempoMaximoCustomizado
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      4 Horas
                    </button>

                    <button
                      type="button"
                      onClick={() => { setTempoMaximoMinutos(480); setTempoMaximoCustomizado(''); }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                        tempoMaximoMinutos === 480 && !tempoMaximoCustomizado
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      8 Horas (Obra)
                    </button>
                  </div>

                  {/* Informativo Claro de Limite de Permanência no Cadastro/Entrada */}
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-amber-300 font-bold block">Horário Limite Autorizado:</span>
                        <span className="text-[10px] text-slate-400">Prestador tem permissão para permanecer no condomínio:</span>
                      </div>
                    </div>
                    <span className="font-mono text-amber-200 font-black text-xs sm:text-sm px-3 py-1.5 bg-amber-500/20 rounded-xl border border-amber-500/40 text-center">
                      Até às {new Date(Date.now() + (tempoMaximoCustomizado ? parseInt(tempoMaximoCustomizado, 10) || 240 : tempoMaximoMinutos) * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )}

              {/* Crachá e Placa */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-400" /> Número do Crachá Entregue
                  </label>
                  <input
                    type="text"
                    value={crachaEntrada}
                    onChange={(e) => setCrachaEntrada(e.target.value)}
                    placeholder="Ex: #12"
                    className="w-full bg-slate-900 text-white font-mono font-bold text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-300 mb-1 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-emerald-400" /> Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={placaEntrada}
                    onChange={(e) => setPlacaEntrada(e.target.value)}
                    placeholder="ABC-1234"
                    className="w-full bg-slate-900 text-white font-mono uppercase text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => dispararWhatsAppEntrada(itemSelecionado)}
                  className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Notificar WhatsApp</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalEntrada(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {loading ? 'Registrando...' : 'Confirmar Entrada'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAÍDA E DEVOLUÇÃO DE CRACHÁ */}
      {modalSaida && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base uppercase text-white flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                Registrar Saída do Condomínio
              </h3>
              <button onClick={() => setModalSaida(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <strong className="block text-white text-sm">
                {itemSelecionado.nome_completo || itemSelecionado.nome_profissional}
              </strong>
              <p className="text-xs text-slate-400">
                Destino: {formatarIdentificacaoUnidade(itemSelecionado.unidade, itemSelecionado.bloco, condoConfig?.tipo_estrutura)}
              </p>
              {itemSelecionado.cracha && (
                <p className="text-xs text-amber-300 font-mono font-bold pt-1">
                  Crachá entregue na entrada: #{itemSelecionado.cracha}
                </p>
              )}
            </div>

            {itemSelecionado.cracha && (
              <label className="flex items-center gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crachaDevolvido}
                  onChange={(e) => setCrachaDevolvido(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                <span className="text-xs font-bold text-white">
                  Confirmar devolução do crachá #{itemSelecionado.cracha} na guarita
                </span>
              </label>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => dispararWhatsAppSaida(itemSelecionado)}
                className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-xs px-3 py-2.5 rounded-xl border border-emerald-500/40 flex items-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Saída</span>
              </button>

              <button
                type="button"
                onClick={confirmarSaida}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-xs uppercase transition shadow-lg active:scale-95 cursor-pointer"
              >
                {loading ? 'Registrando...' : 'Confirmar Saída'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRORROGAR TEMPO */}
      {modalProrrogar && itemSelecionado && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-sm uppercase text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Prorrogação de Tempo de Permanência
              </h3>
              <button onClick={() => setModalProrrogar(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <strong className="block text-white text-sm">
                {itemSelecionado.nome_completo || itemSelecionado.nome_profissional}
              </strong>
              <p className="text-xs text-slate-300">
                Destino: <strong>{formatarIdentificacaoUnidade(itemSelecionado.unidade, itemSelecionado.bloco, condoConfig?.tipo_estrutura)}</strong>
              </p>
              {itemSelecionado.limite_permanencia_ate && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-850 mt-1">
                  <span className="text-slate-400">Horário limite atual:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    Até às {new Date(itemSelecionado.limite_permanencia_ate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                Selecione o tempo a adicionar:
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { m: 30, lbl: '+30m' },
                  { m: 60, lbl: '+1h' },
                  { m: 120, lbl: '+2h' },
                  { m: 240, lbl: '+4h' }
                ].map(opc => (
                  <button
                    key={opc.m}
                    type="button"
                    onClick={() => { setMinutosProrrogacao(opc.m); setProrrogarCustomizado(''); }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      minutosProrrogacao === opc.m && !prorrogarCustomizado
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {opc.lbl}
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={prorrogarCustomizado}
                  onChange={(e) => setProrrogarCustomizado(e.target.value)}
                  placeholder="Ou digite outros minutos (ex: 45, 90)..."
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Prévia do Novo Horário Limite */}
            {(() => {
              const minAdd = prorrogarCustomizado ? (parseInt(prorrogarCustomizado, 10) || 60) : minutosProrrogacao;
              const tRef = itemSelecionado.limite_permanencia_ate ? new Date(itemSelecionado.limite_permanencia_ate).getTime() : Date.now();
              const novoTs = Math.max(Date.now(), tRef) + minAdd * 60000;
              const novoFmt = new Date(novoTs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-amber-300 font-bold block">Novo Limite Autorizado:</span>
                    <span className="text-[10px] text-slate-400">Prestador poderá permanecer até:</span>
                  </div>
                  <span className="font-mono text-amber-200 font-black text-sm px-3 py-1 bg-amber-500/20 rounded-xl border border-amber-500/40">
                    Até às {novoFmt}
                  </span>
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalProrrogar(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const minAdd = prorrogarCustomizado ? (parseInt(prorrogarCustomizado, 10) || 60) : minutosProrrogacao;
                    const tRef = itemSelecionado.limite_permanencia_ate ? new Date(itemSelecionado.limite_permanencia_ate).getTime() : Date.now();
                    const novoIso = new Date(Math.max(Date.now(), tRef) + minAdd * 60000).toISOString();
                    await handleProrrogarTempo();
                    dispararWhatsAppProrrogacao({ ...itemSelecionado, limite_permanencia_ate: novoIso }, novoIso, minAdd);
                  }}
                  disabled={loading}
                  className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Prorrogar e abrir WhatsApp para notificar"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Salvar + WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleProrrogarTempo}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                >
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL OCR */}
      {modalOcrAberto && (
        <ModalLeitorDocumentoOCR
          aberto={modalOcrAberto}
          onFechar={() => setModalOcrAberto(false)}
          onDadosConfirmados={handleOcrConfirmado}
        />
      )}

      {/* MODAL VISUALIZAR FOTO EXPANDIDA */}
      {modalVisualizarFoto && (
        <div 
          onClick={() => setModalVisualizarFoto(null)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="max-w-md w-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 p-2">
            <img src={modalVisualizarFoto} alt="Foto Expandida" loading="lazy" decoding="async" className="w-full h-auto max-h-[80vh] object-contain rounded-2xl mx-auto" />
            <p className="text-center text-xs text-slate-400 pt-2">Clique em qualquer lugar para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
