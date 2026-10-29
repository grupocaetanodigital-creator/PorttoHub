import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Users,
  Building,
  DollarSign,
  Share2,
  Camera,
  Check,
  X,
  Trash2,
  Pencil,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Info,
  Key,
  Flame,
  Coffee,
  Tv,
  Eye,
  FileCheck2,
  Send,
  Download
} from 'lucide-react';
import {
  AreaComum,
  ReservaArea,
  ConvidadoEvento,
  carregarAreasComuns,
  salvarAreaComum,
  excluirAreaComum,
  carregarReservas,
  criarOuAtualizarReserva,
  atualizarStatusReserva,
  verificarConflitoReserva,
  formatarMensagemWhatsAppReserva
} from '../services/reservaAreasService';
import {
  carregarCondominioConfig,
  obterListaBlocosOuTorres,
  getNomeRotuloBloco,
  getNomeRotuloUnidade,
  getCondominioAtivoId,
  CondominioConfig
} from '../services/condominioService';
import { formatarLinkWhatsApp } from '../services/configWhatsappService';
import { verificarPermissao } from '../services/permissoesService';
import { supabase } from '../services/supabase';

interface ReservaAreasProps {
  usuarioLogado?: any;
}

export default function ReservaAreas({ usuarioLogado }: ReservaAreasProps) {
  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Dados
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [reservas, setReservas] = useState<ReservaArea[]>([]);
  const [moradoresCadastrados, setMoradoresCadastrados] = useState<any[]>([]);

  // Abas
  const [abaAtiva, setAbaAtiva] = useState<'calendario' | 'nova' | 'convidados' | 'vistorias' | 'espacos'>('calendario');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [termoBusca, setTermoBusca] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<string>(new Date().toISOString().split('T')[0]);

  // Mensagens
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Permissões
  const eSindico = Boolean(
    usuarioLogado?.nivel_acesso === 4 ||
    usuarioLogado?.perfil === 'sindico' ||
    usuarioLogado?.eSindico
  );
  const podeAprovar = Boolean(
    usuarioLogado?.login === 'admin' ||
    usuarioLogado?.perfil === 'admin' ||
    usuarioLogado?.nivel_acesso <= 2 ||
    eSindico ||
    verificarPermissao(usuarioLogado, 'reservas', 'aprovar')
  );
  const podeGerenciarAreas = Boolean(
    usuarioLogado?.login === 'admin' ||
    usuarioLogado?.perfil === 'admin' ||
    usuarioLogado?.nivel_acesso <= 1 ||
    eSindico ||
    verificarPermissao(usuarioLogado, 'reservas', 'gerenciar_areas')
  );

  // Modais
  const [modalAprovacao, setModalAprovacao] = useState<{ aberto: boolean; reserva: ReservaArea | null; acao: 'aprovar' | 'recusar'; motivo: string }>({
    aberto: false,
    reserva: null,
    acao: 'aprovar',
    motivo: ''
  });

  const [modalNovaArea, setModalNovaArea] = useState(false);
  const [areaEmEdicao, setAreaEmEdicao] = useState<Partial<AreaComum>>({
    nome: '',
    descricao: '',
    capacidade_maxima: 40,
    taxa_reserva: 0,
    taxa_limpeza: 0,
    valor_caucao: 0,
    horario_inicio: '09:00',
    horario_fim: '22:00',
    turnos_disponiveis: ['manha', 'tarde', 'noite', 'dia_todo'],
    regras_termo: '',
    exige_aprovacao_sindico: true,
    ativa: true
  });

  // Formulário de Nova Reserva
  const [formNovaReserva, setFormNovaReserva] = useState<{
    area_id: string;
    data_reserva: string;
    turno: 'manha' | 'tarde' | 'noite' | 'dia_todo' | 'personalizado';
    horario_inicio: string;
    horario_fim: string;
    unidade_bloco: string;
    morador_nome: string;
    morador_telefone: string;
    tipo_evento: string;
    qtd_convidados_estimada: number;
    observacoes: string;
    termo_aceito: boolean;
  }>({
    area_id: '',
    data_reserva: new Date().toISOString().split('T')[0],
    turno: 'noite',
    horario_inicio: '18:00',
    horario_fim: '23:00',
    unidade_bloco: '',
    morador_nome: '',
    morador_telefone: '',
    tipo_evento: 'Aniversário',
    qtd_convidados_estimada: 20,
    observacoes: '',
    termo_aceito: false
  });

  const [conflitoDetectado, setConflitoDetectado] = useState<string | null>(null);

  // Gerenciamento de Convidados
  const [reservaSelecionadaConvidados, setReservaSelecionadaConvidados] = useState<ReservaArea | null>(null);
  const [novoConvidadoNome, setNovoConvidadoNome] = useState('');
  const [novoConvidadoDoc, setNovoConvidadoDoc] = useState('');
  const [textoColarConvidados, setTextoColarConvidados] = useState('');

  // Vistorias
  const [modalVistoria, setModalVistoria] = useState<{
    aberto: boolean;
    reserva: ReservaArea | null;
    tipo: 'entrada' | 'saida';
    chaves: boolean;
    estado: 'otimo' | 'bom' | 'regular' | 'com_avarias';
    limpeza: boolean;
    avarias: boolean;
    observacoes: string;
  }>({
    aberto: false,
    reserva: null,
    tipo: 'entrada',
    chaves: true,
    estado: 'bom',
    limpeza: true,
    avarias: false,
    observacoes: ''
  });

  // Monitora troca global de condomínio
  useEffect(() => {
    const handleCondoChange = (e: any) => {
      const novoId = e?.detail?.id;
      if (novoId && novoId !== 'global' && novoId !== 'todos') {
        setCondId(novoId);
      } else {
        setCondId(getCondominioAtivoId(usuarioLogado));
      }
    };
    window.addEventListener('infport:condominio_alterado', handleCondoChange);
    return () => window.removeEventListener('infport:condominio_alterado', handleCondoChange);
  }, [usuarioLogado]);

  // Carrega dados iniciais
  useEffect(() => {
    carregarTudo();
  }, [condId]);

  const carregarTudo = async () => {
    if (!condId || condId === 'global' || condId === 'todos') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cfg, areasData, reservasData] = await Promise.all([
        carregarCondominioConfig(condId),
        carregarAreasComuns(condId),
        carregarReservas(condId)
      ]);
      setCondoConfig(cfg);
      setAreas(areasData);
      setReservas(reservasData);

      if (areasData.length > 0 && !formNovaReserva.area_id) {
        setFormNovaReserva(prev => ({ ...prev, area_id: areasData[0].id }));
      }

      // Busca lista de moradores para auto-complete
      const { data: morData } = await supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone, celular')
        .eq('condominio_id', condId)
        .order('nome', { ascending: true })
        .limit(200);

      if (morData) {
        setMoradoresCadastrados(morData);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de reservas:', e);
    } finally {
      setLoading(false);
    }
  };

  // Verifica conflito quando muda área, data ou horário no formulário
  useEffect(() => {
    if (!condId || !formNovaReserva.area_id || !formNovaReserva.data_reserva) return;

    verificarConflitoReserva(
      condId,
      formNovaReserva.area_id,
      formNovaReserva.data_reserva,
      formNovaReserva.turno,
      formNovaReserva.horario_inicio,
      formNovaReserva.horario_fim
    ).then(res => {
      if (res.temConflito) {
        setConflitoDetectado(res.motivo || 'Horário já reservado.');
      } else {
        setConflitoDetectado(null);
      }
    });
  }, [
    condId,
    formNovaReserva.area_id,
    formNovaReserva.data_reserva,
    formNovaReserva.turno,
    formNovaReserva.horario_inicio,
    formNovaReserva.horario_fim
  ]);

  // Métricas de resumo
  const metricas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const total = reservas.length;
    const pendentes = reservas.filter(r => r.status === 'pendente').length;
    const confirmadasHoje = reservas.filter(r => r.data_reserva === hoje && r.status === 'aprovada').length;
    const totalArrecadado = reservas
      .filter(r => r.status === 'aprovada' || r.status === 'concluida')
      .reduce((acc, r) => acc + (r.valor_total || 0), 0);

    return { total, pendentes, confirmadasHoje, totalArrecadado };
  }, [reservas]);

  // Lista filtrada
  const reservasFiltradas = useMemo(() => {
    return reservas.filter(r => {
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroArea !== 'todas' && r.area_id !== filtroArea) return false;
      if (termoBusca) {
        const t = termoBusca.toLowerCase();
        const bateNome = r.morador_nome?.toLowerCase().includes(t);
        const bateUnidade = r.unidade_bloco?.toLowerCase().includes(t);
        const bateArea = r.area_nome?.toLowerCase().includes(t);
        const bateEvento = r.tipo_evento?.toLowerCase().includes(t);
        if (!bateNome && !bateUnidade && !bateArea && !bateEvento) return false;
      }
      return true;
    });
  }, [reservas, filtroStatus, filtroArea, termoBusca]);

  // Disparo WhatsApp
  const handleDispararWhats = (reserva: ReservaArea) => {
    const tel = reserva.morador_telefone || '';
    const texto = formatarMensagemWhatsAppReserva(reserva, condoConfig?.nome || 'Condomínio');
    const link = formatarLinkWhatsApp(tel, texto);
    window.open(link, '_blank');
  };

  // Salvar Nova Reserva
  const handleCriarReserva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflitoDetectado) {
      setFeedback({ tipo: 'erro', texto: 'Não é possível reservar: conflito de horário identificado.' });
      return;
    }
    if (!formNovaReserva.unidade_bloco || !formNovaReserva.morador_nome) {
      setFeedback({ tipo: 'erro', texto: 'Informe a unidade e o nome do morador responsável.' });
      return;
    }
    if (!formNovaReserva.termo_aceito) {
      setFeedback({ tipo: 'erro', texto: 'É obrigatório declarar a concordância com o Termo e Regras de Uso.' });
      return;
    }

    const resultado = await criarOuAtualizarReserva(condId, formNovaReserva, usuarioLogado);
    if (resultado.sucesso && resultado.reserva) {
      setReservas(prev => [resultado.reserva!, ...prev]);
      setFeedback({ tipo: 'sucesso', texto: 'Reserva cadastrada com sucesso!' });
      setAbaAtiva('calendario');
      // Reseta form
      setFormNovaReserva(prev => ({
        ...prev,
        unidade_bloco: '',
        morador_nome: '',
        morador_telefone: '',
        qtd_convidados_estimada: 15,
        observacoes: '',
        termo_aceito: false
      }));
    } else {
      setFeedback({ tipo: 'erro', texto: resultado.erro || 'Erro ao registrar reserva.' });
    }
  };

  // Confirmar Aprovação / Recusa
  const handleConfirmarStatus = async () => {
    if (!modalAprovacao.reserva) return;
    const novoStatus = modalAprovacao.acao === 'aprovar' ? 'aprovada' : 'recusada';

    const ok = await atualizarStatusReserva(
      condId,
      modalAprovacao.reserva.id,
      novoStatus,
      modalAprovacao.motivo,
      usuarioLogado
    );

    if (ok) {
      setReservas(prev =>
        prev.map(r =>
          r.id === modalAprovacao.reserva!.id
            ? {
                ...r,
                status: novoStatus,
                motivo_recusa: modalAprovacao.motivo,
                aprovado_por_nome: novoStatus === 'aprovada' ? usuarioLogado?.nome || 'Gestão' : undefined
              }
            : r
        )
      );
      setFeedback({
        tipo: 'sucesso',
        texto: `Reserva ${novoStatus === 'aprovada' ? 'aprovada' : 'recusada'} com sucesso!`
      });
      setModalAprovacao({ aberto: false, reserva: null, acao: 'aprovar', motivo: '' });
    }
  };

  // Gerenciamento de Convidados
  const handleAdicionarConvidado = async () => {
    if (!reservaSelecionadaConvidados || !novoConvidadoNome.trim()) return;

    const novo: ConvidadoEvento = {
      id: `conv-${Date.now()}`,
      nome: novoConvidadoNome.trim(),
      documento: novoConvidadoDoc.trim(),
      parentesco_ou_tipo: 'Convidado'
    };

    const listaAtual = reservaSelecionadaConvidados.lista_convidados || [];
    const novaLista = [...listaAtual, novo];

    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };
    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);

    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
    setNovoConvidadoNome('');
    setNovoConvidadoDoc('');
    setFeedback({ tipo: 'sucesso', texto: 'Convidado adicionado à lista oficial da portaria!' });
  };

  const handleImportarTextoConvidados = async () => {
    if (!reservaSelecionadaConvidados || !textoColarConvidados.trim()) return;

    const linhas = textoColarConvidados.split('\n').filter(l => l.trim().length > 0);
    const novos: ConvidadoEvento[] = linhas.map((linha, idx) => {
      const partes = linha.split(/[-–,;]/);
      return {
        id: `conv-${Date.now()}-${idx}`,
        nome: partes[0].trim(),
        documento: partes[1] ? partes[1].trim() : undefined,
        parentesco_ou_tipo: 'Convidado'
      };
    });

    const listaAtual = reservaSelecionadaConvidados.lista_convidados || [];
    const novaLista = [...listaAtual, ...novos];
    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };

    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
    setTextoColarConvidados('');
    setFeedback({ tipo: 'sucesso', texto: `${novos.length} convidados importados para a portaria!` });
  };

  const handleRemoverConvidado = async (convId: string) => {
    if (!reservaSelecionadaConvidados) return;
    const novaLista = (reservaSelecionadaConvidados.lista_convidados || []).filter(c => c.id !== convId);
    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };
    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
  };

  // Salvar Vistoria
  const handleSalvarVistoria = async () => {
    if (!modalVistoria.reserva) return;
    const r = modalVistoria.reserva;
    const vistoriaDados = {
      realizada: true,
      data_hora: new Date().toISOString(),
      operador_nome: usuarioLogado?.nome || 'Operador',
      chaves_entregues_ou_devolvidas: modalVistoria.chaves,
      estado_conservacao: modalVistoria.estado,
      limpeza_conforme: modalVistoria.limpeza,
      houve_avarias: modalVistoria.avarias,
      observacoes: modalVistoria.observacoes
    };

    const atualizada: ReservaArea = {
      ...r,
      ...(modalVistoria.tipo === 'entrada' ? { vistoria_entrada: vistoriaDados } : { vistoria_saida: vistoriaDados, status: 'concluida' })
    };

    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservas(prev => prev.map(item => (item.id === atualizada.id ? atualizada : item)));
    setModalVistoria({ aberto: false, reserva: null, tipo: 'entrada', chaves: true, estado: 'bom', limpeza: true, avarias: false, observacoes: '' });
    setFeedback({ tipo: 'sucesso', texto: `Vistoria de ${modalVistoria.tipo === 'entrada' ? 'Entrada / Check-in' : 'Saída / Check-out'} registrada!` });
  };

  // Salvar Área Comum
  const handleSalvarArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaEmEdicao.nome?.trim()) {
      setFeedback({ tipo: 'erro', texto: 'Informe o nome do espaço.' });
      return;
    }
    const salva = await salvarAreaComum(condId, areaEmEdicao);
    setAreas(prev => {
      const idx = prev.findIndex(a => a.id === salva.id);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = salva;
        return copia;
      }
      return [...prev, salva];
    });
    setModalNovaArea(false);
    setFeedback({ tipo: 'sucesso', texto: 'Espaço comum salvo com sucesso!' });
  };

  const handleExcluirArea = async (areaId: string) => {
    if (!confirm('Deseja realmente remover este espaço comum?')) return;
    await excluirAreaComum(condId, areaId);
    setAreas(prev => prev.filter(a => a.id !== areaId));
    setFeedback({ tipo: 'sucesso', texto: 'Espaço comum removido.' });
  };

  const getStatusBadge = (status: ReservaArea['status']) => {
    switch (status) {
      case 'aprovada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Aguardando Aprovação
          </span>
        );
      case 'recusada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Recusada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <AlertCircle className="w-3.5 h-3.5" /> Cancelada
          </span>
        );
      case 'concluida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Check className="w-3.5 h-3.5" /> Concluída
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-20">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between shadow-md text-sm font-semibold transition-all ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{feedback.texto}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Topo / Banner & Indicadores */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Reserva de Áreas Comuns
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {condoConfig?.nome || 'Condomínio'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agendamento de salão de festas, churrasqueiras, lista de convidados para portaria e vistorias
              </p>
            </div>
          </div>
        </div>

        {/* Botão de Ação Rápida */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva('nova')}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Nova Reserva
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Reservas</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{metricas.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Aguardando Aprovação</span>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{metricas.pendentes}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Eventos Hoje</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{metricas.confirmadasHoje}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Taxas Arrecadadas</span>
            <div className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
              R$ {metricas.totalArrecadado.toFixed(2)}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/80 dark:bg-slate-850 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setAbaAtiva('calendario')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'calendario'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-emerald-500" />
          <span>Agenda & Reservas</span>
          {metricas.pendentes > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold">
              {metricas.pendentes}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('nova')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'nova'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 text-blue-500" />
          <span>Solicitar Reserva</span>
        </button>

        <button
          onClick={() => setAbaAtiva('convidados')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'convidados'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-purple-500" />
          <span>Lista de Convidados (Portaria)</span>
        </button>

        <button
          onClick={() => setAbaAtiva('vistorias')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
            abaAtiva === 'vistorias'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-amber-500" />
          <span>Vistorias & Chaves</span>
        </button>

        {podeGerenciarAreas && (
          <button
            onClick={() => setAbaAtiva('espacos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              abaAtiva === 'espacos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building className="w-4 h-4 text-indigo-500" />
            <span>Configurar Espaços ({areas.length})</span>
          </button>
        )}
      </div>

      {/* ABA 1: AGENDA & LISTAGEM */}
      {abaAtiva === 'calendario' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                placeholder="Buscar por morador, unidade, espaço ou tipo de evento..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filtroArea}
                onChange={e => setFiltroArea(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="todas">Todos os Espaços</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>

              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="todos">Todos Status</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovada">Aprovadas</option>
                <option value="concluida">Concluídas</option>
                <option value="recusada">Recusadas</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          </div>

          {/* Cards de Reservas */}
          {reservasFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Nenhuma reserva encontrada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Não há registros com os filtros atuais. Clique em "Nova Reserva" para registrar um agendamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservasFiltradas.map(res => {
                const area = areas.find(a => a.id === res.area_id);
                const dataFmt = new Date(res.data_reserva + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short'
                });

                return (
                  <div
                    key={res.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Cabeçalho do Card */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            {dataFmt} • {res.horario_inicio} às {res.horario_fim}
                          </span>
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                            {res.area_nome}
                          </h4>
                        </div>
                        {getStatusBadge(res.status)}
                      </div>

                      {/* Informações do Solicitante & Evento */}
                      <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Unidade:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{res.unidade_bloco}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Morador:</span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {res.morador_nome}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Evento:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {res.tipo_evento} ({res.qtd_convidados_estimada} pessoas)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Taxas Totais:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            R$ {res.valor_total.toFixed(2)}
                          </span>
                        </div>
                        {res.motivo_recusa && (
                          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-750 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            Motivo recusa: {res.motivo_recusa}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => handleDispararWhats(res)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        title="Enviar comprovante e regras por WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {/* Ver Convidados */}
                      <button
                        type="button"
                        onClick={() => {
                          setReservaSelecionadaConvidados(res);
                          setAbaAtiva('convidados');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
                        title="Ver ou cadastrar lista de convidados"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Convidados ({res.lista_convidados?.length || 0})</span>
                      </button>

                      {/* Botões de Aprovação se Pendente */}
                      {res.status === 'pendente' && podeAprovar && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModalAprovacao({ aberto: true, reserva: res, acao: 'aprovar', motivo: '' })}
                            className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                            title="Aprovar Reserva"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalAprovacao({ aberto: true, reserva: res, acao: 'recusar', motivo: '' })}
                            className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                            title="Recusar Reserva"
                          >
                            <X className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      )}

                      {/* Vistoria rápida se Aprovada */}
                      {res.status === 'aprovada' && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalVistoria({
                              aberto: true,
                              reserva: res,
                              tipo: res.vistoria_entrada?.realizada ? 'saida' : 'entrada',
                              chaves: true,
                              estado: 'bom',
                              limpeza: true,
                              avarias: false,
                              observacoes: ''
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{res.vistoria_entrada?.realizada ? 'Check-out' : 'Check-in'}</span>
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

      {/* ABA 2: FORMULÁRIO DE NOVA RESERVA */}
      {abaAtiva === 'nova' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                Cadastrar Nova Reserva
              </h3>
              <p className="text-xs text-slate-500">
                Preencha os dados da reserva e verifique a disponibilidade do espaço
              </p>
            </div>
            <button
              onClick={() => setAbaAtiva('calendario')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleCriarReserva} className="space-y-6">
            {/* Escolha do Espaço */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Selecione o Espaço Comum *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {areas.map(area => {
                  const selecionada = formNovaReserva.area_id === area.id;
                  return (
                    <div
                      key={area.id}
                      onClick={() => setFormNovaReserva(prev => ({ ...prev, area_id: area.id }))}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        selecionada
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {area.nome}
                          </h4>
                          {selecionada && <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {area.descricao}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Cap: {area.capacidade_maxima} pess.</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {area.taxa_reserva + area.taxa_limpeza > 0
                            ? `R$ ${(area.taxa_reserva + area.taxa_limpeza).toFixed(2)}`
                            : 'Gratuito'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data e Turno */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Data do Evento *
                </label>
                <input
                  type="date"
                  required
                  value={formNovaReserva.data_reserva}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, data_reserva: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  3. Turno / Período *
                </label>
                <select
                  value={formNovaReserva.turno}
                  onChange={e => {
                    const t = e.target.value as any;
                    let ini = '10:00';
                    let fim = '22:00';
                    if (t === 'manha') { ini = '09:00'; fim = '13:00'; }
                    if (t === 'tarde') { ini = '13:30'; fim = '18:00'; }
                    if (t === 'noite') { ini = '18:30'; fim = '23:30'; }
                    setFormNovaReserva(prev => ({
                      ...prev,
                      turno: t,
                      horario_inicio: ini,
                      horario_fim: fim
                    }));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="noite">Noite (18:30 às 23:30)</option>
                  <option value="tarde">Tarde (13:30 às 18:00)</option>
                  <option value="manha">Manhã (09:00 às 13:00)</option>
                  <option value="dia_todo">Dia Todo (10:00 às 22:00)</option>
                  <option value="personalizado">Horário Personalizado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Início</label>
                  <input
                    type="time"
                    value={formNovaReserva.horario_inicio}
                    onChange={e => setFormNovaReserva(prev => ({ ...prev, horario_inicio: e.target.value }))}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Término</label>
                  <input
                    type="time"
                    value={formNovaReserva.horario_fim}
                    onChange={e => setFormNovaReserva(prev => ({ ...prev, horario_fim: e.target.value }))}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                  />
                </div>
              </div>
            </div>

            {/* Alerta de Conflito em tempo real */}
            {conflitoDetectado ? (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-bold animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>ATENÇÃO: {conflitoDetectado}</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Horário e data disponíveis para agendamento!</span>
              </div>
            )}

            {/* Unidade & Solicitante */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  4. Unidade / Apto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Torre A - Apto 502"
                  value={formNovaReserva.unidade_bloco}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, unidade_bloco: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  5. Nome do Morador(a) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do responsável"
                  value={formNovaReserva.morador_nome}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, morador_nome: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  6. Telefone WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 90000-0000"
                  value={formNovaReserva.morador_telefone}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, morador_telefone: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Tipo de Evento & Convidados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipo de Comemoração / Evento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aniversário de 30 anos, Churrasco Familiar..."
                  value={formNovaReserva.tipo_evento}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, tipo_evento: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Qtd Estimada de Pessoas
                </label>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={formNovaReserva.qtd_convidados_estimada}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, qtd_convidados_estimada: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                />
              </div>
            </div>

            {/* Termo de Responsabilidade */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-amber-700 dark:text-amber-300">
                <FileText className="w-4 h-4" />
                <span>Termo de Responsabilidade e Regulamento do Condomínio</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                O morador assume total responsabilidade pelo bom uso das instalações, móveis, eletrodomésticos e equipamentos. Fica ciente das normas de horário de silêncio (conforme regimento interno) e de que qualquer dano será cobrado na cota condominial da unidade.
              </p>
              <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formNovaReserva.termo_aceito}
                  onChange={e => setFormNovaReserva(prev => ({ ...prev, termo_aceito: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Declaro que li e concordo com os termos e regras de utilização.
                </span>
              </label>
            </div>

            {/* Botão de Envio */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAbaAtiva('calendario')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={Boolean(conflitoDetectado)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Confirmar Solicitação de Reserva
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: LISTA DE CONVIDADOS PARA A PORTARIA */}
      {abaAtiva === 'convidados' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Lista de Convidados & Liberação na Portaria
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vincule convidados a uma reserva aprovada para que os porteiros liberem o acesso com 1 clique
            </p>

            {/* Seletor de Reserva */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Selecione a Reserva / Evento:
              </label>
              <select
                value={reservaSelecionadaConvidados?.id || ''}
                onChange={e => {
                  const r = reservas.find(item => item.id === e.target.value);
                  setReservaSelecionadaConvidados(r || null);
                }}
                className="w-full max-w-xl px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                <option value="">-- Escolha um evento na lista --</option>
                {reservas
                  .filter(r => r.status === 'aprovada' || r.status === 'pendente')
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {r.data_reserva} — {r.area_nome} ({r.unidade_bloco} - {r.morador_nome})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {reservaSelecionadaConvidados ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Painel de Cadastro de Convidados */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Adicionar Convidado</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nome completo do convidado"
                    value={novoConvidadoNome}
                    onChange={e => setNovoConvidadoNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="RG / CPF (Opcional para portaria)"
                    value={novoConvidadoDoc}
                    onChange={e => setNovoConvidadoDoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAdicionarConvidado}
                    className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                  >
                    + Adicionar à Lista
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                    Importação Rápida em Massa:
                  </span>
                  <textarea
                    rows={4}
                    placeholder="Cole vários nomes (um por linha)...&#10;Exemplo:&#10;Mariana Silva&#10;Carlos Eduardo, 42.123.456-7&#10;Beatriz Ramos"
                    value={textoColarConvidados}
                    onChange={e => setTextoColarConvidados(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleImportarTextoConvidados}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-800 dark:bg-slate-750 text-white text-xs font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Processar Lista em Massa
                  </button>
                </div>
              </div>

              {/* Lista dos Convidados Cadastrados */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Convidados Registrados ({reservaSelecionadaConvidados.lista_convidados?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDispararWhats(reservaSelecionadaConvidados)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-400 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Enviar Lista via WhatsApp
                  </button>
                </div>

                {(!reservaSelecionadaConvidados.lista_convidados || reservaSelecionadaConvidados.lista_convidados.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    Nenhum convidado adicionado até o momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[420px] overflow-y-auto">
                    {reservaSelecionadaConvidados.lista_convidados.map((c, idx) => (
                      <div key={c.id || idx} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white">{c.nome}</span>
                            {c.documento && (
                              <span className="text-[11px] text-slate-400 font-mono ml-2">Doc: {c.documento}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {c.confirmado_portaria ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Presente ({c.horario_entrada})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              Aguardando
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoverConvidado(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Remover convidado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 text-xs">
              Selecione uma reserva acima para gerenciar os convidados.
            </div>
          )}
        </div>
      )}

      {/* ABA 4: VISTORIAS & CONTROLE DE CHAVES */}
      {abaAtiva === 'vistorias' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-500" />
              Checklist de Vistorias Pré e Pós Evento
            </h3>
            <p className="text-xs text-slate-500">
              Controle de entrega de chaves, verificação de limpeza, conservação e devolução de caução
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reservas
              .filter(r => r.status === 'aprovada' || r.status === 'concluida')
              .map(res => (
                <div key={res.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {res.data_reserva} • {res.horario_inicio} às {res.horario_fim}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {res.area_nome} — {res.unidade_bloco} ({res.morador_nome})
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      <span>Check-in: {res.vistoria_entrada?.realizada ? `✅ Realizado por ${res.vistoria_entrada.operador_nome}` : '⏳ Pendente'}</span>
                      <span>Check-out: {res.vistoria_saida?.realizada ? `✅ Realizado por ${res.vistoria_saida.operador_nome}` : '⏳ Pendente'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalVistoria({
                          aberto: true,
                          reserva: res,
                          tipo: 'entrada',
                          chaves: true,
                          estado: res.vistoria_entrada?.estado_conservacao || 'bom',
                          limpeza: true,
                          avarias: false,
                          observacoes: res.vistoria_entrada?.observacoes || ''
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      Vistoria Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalVistoria({
                          aberto: true,
                          reserva: res,
                          tipo: 'saida',
                          chaves: true,
                          estado: res.vistoria_saida?.estado_conservacao || 'bom',
                          limpeza: res.vistoria_saida?.limpeza_conforme !== false,
                          avarias: Boolean(res.vistoria_saida?.houve_avarias),
                          observacoes: res.vistoria_saida?.observacoes || ''
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-400 cursor-pointer shadow-xs"
                    >
                      Vistoria Saída
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ABA 5: GESTÃO DE ESPAÇOS COMUNS */}
      {abaAtiva === 'espacos' && podeGerenciarAreas && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-500" />
                Espaços Comuns Cadastrados
              </h3>
              <p className="text-xs text-slate-500">
                Configure regras, horários de funcionamento, taxas e turnos de cada área do condomínio
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAreaEmEdicao({
                  nome: '',
                  descricao: '',
                  capacidade_maxima: 50,
                  taxa_reserva: 100,
                  taxa_limpeza: 60,
                  valor_caucao: 200,
                  horario_inicio: '10:00',
                  horario_fim: '23:00',
                  turnos_disponiveis: ['manha', 'tarde', 'noite', 'dia_todo'],
                  regras_termo: 'Respeitar normas e lei do silêncio.',
                  exige_aprovacao_sindico: true,
                  ativa: true
                });
                setModalNovaArea(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              + Novo Espaço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map(area => (
              <div
                key={area.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">{area.nome}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        area.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {area.ativa ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{area.descricao}</p>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <div>Capacidade: <span className="font-bold">{area.capacidade_maxima} pessoas</span></div>
                    <div>Horário: <span className="font-bold">{area.horario_inicio} às {area.horario_fim}</span></div>
                    <div>Taxa Reserva: <span className="font-bold font-mono">R$ {area.taxa_reserva.toFixed(2)}</span></div>
                    <div>Taxa Limpeza: <span className="font-bold font-mono">R$ {area.taxa_limpeza.toFixed(2)}</span></div>
                    <div>Aprovação Síndico: <span className="font-bold">{area.exige_aprovacao_sindico ? 'Exigida' : 'Livre'}</span></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAreaEmEdicao(area);
                      setModalNovaArea(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer"
                    title="Editar espaço"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirArea(area.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                    title="Remover espaço"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE APROVAÇÃO / RECUSA */}
      {modalAprovacao.aberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              {modalAprovacao.acao === 'aprovar' ? 'Aprovar Reserva' : 'Recusar Solicitação'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {modalAprovacao.reserva?.area_nome} — {modalAprovacao.reserva?.unidade_bloco} ({modalAprovacao.reserva?.morador_nome}) em {modalAprovacao.reserva?.data_reserva}
            </p>

            {modalAprovacao.acao === 'recusar' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Recusa (visível para o morador):
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Conflito com evento geral do condomínio, manutenção programada..."
                  value={modalAprovacao.motivo}
                  onChange={e => setModalAprovacao(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAprovacao({ aberto: false, reserva: null, acao: 'aprovar', motivo: '' })}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarStatus}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer ${
                  modalAprovacao.acao === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirmar {modalAprovacao.acao === 'aprovar' ? 'Aprovação' : 'Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTORIA */}
      {modalVistoria.aberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Vistoria de {modalVistoria.tipo === 'entrada' ? 'Entrada (Check-in)' : 'Saída (Check-out)'}
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalVistoria.chaves}
                  onChange={e => setModalVistoria(prev => ({ ...prev, chaves: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {modalVistoria.tipo === 'entrada' ? 'Chaves entregues ao morador' : 'Chaves devolvidas à portaria'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalVistoria.limpeza}
                  onChange={e => setModalVistoria(prev => ({ ...prev, limpeza: e.target.checked }))}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Limpeza e descarte de lixo em conformidade
                </span>
              </label>

              {modalVistoria.tipo === 'saida' && (
                <label className="flex items-center gap-2 cursor-pointer text-rose-600">
                  <input
                    type="checkbox"
                    checked={modalVistoria.avarias}
                    onChange={e => setModalVistoria(prev => ({ ...prev, avarias: e.target.checked }))}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  <span className="font-bold">Houve avarias materiais ou quebra de itens</span>
                </label>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Observações da Vistoria:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Espaço limpo, refrigerador funcionando, cadeiras contadas..."
                  value={modalVistoria.observacoes}
                  onChange={e => setModalVistoria(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalVistoria({ aberto: false, reserva: null, tipo: 'entrada', chaves: true, estado: 'bom', limpeza: true, avarias: false, observacoes: '' })}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarVistoria}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Salvar Vistoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO DE ÁREA */}
      {modalNovaArea && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-3">
              {areaEmEdicao.id ? 'Editar Espaço Comum' : 'Novo Espaço Comum'}
            </h3>

            <form onSubmit={handleSalvarArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Espaço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salão de Festas, Churrasqueira 01..."
                  value={areaEmEdicao.nome}
                  onChange={e => setAreaEmEdicao(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Estrutura, localização e itens disponíveis..."
                  value={areaEmEdicao.descricao}
                  onChange={e => setAreaEmEdicao(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Capacidade Máxima</label>
                  <input
                    type="number"
                    value={areaEmEdicao.capacidade_maxima}
                    onChange={e => setAreaEmEdicao(prev => ({ ...prev, capacidade_maxima: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Taxa Reserva (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.taxa_reserva}
                    onChange={e => setAreaEmEdicao(prev => ({ ...prev, taxa_reserva: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Taxa Limpeza (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.taxa_limpeza}
                    onChange={e => setAreaEmEdicao(prev => ({ ...prev, taxa_limpeza: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Caução (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.valor_caucao}
                    onChange={e => setAreaEmEdicao(prev => ({ ...prev, valor_caucao: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaEmEdicao.exige_aprovacao_sindico}
                    onChange={e => setAreaEmEdicao(prev => ({ ...prev, exige_aprovacao_sindico: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Exige aprovação do síndico / administração para confirmar
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovaArea(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Salvar Espaço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
