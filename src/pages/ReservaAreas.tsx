import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Download,
  Phone,
  UserCheck,
  UserX,
  ListFilter,
  Grid,
  CalendarDays,
  SlidersHorizontal,
  Waves,
  Trophy,
  Dumbbell,
  Utensils,
  ArrowRight,
  Smartphone
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

// Retorna ícone correspondente ao tipo de espaço comum
function getIconeArea(nome: string) {
  const n = (nome || '').toLowerCase();
  if (n.includes('churrasqu') || n.includes('parrilha') || n.includes('bbq')) {
    return <Flame className="w-5 h-5 text-amber-500 shrink-0" />;
  }
  if (n.includes('piscina') || n.includes('deck') || n.includes('solarium')) {
    return <Waves className="w-5 h-5 text-cyan-500 shrink-0" />;
  }
  if (n.includes('quadra') || n.includes('campo') || n.includes('futebol') || n.includes('tenis') || n.includes('esporte')) {
    return <Trophy className="w-5 h-5 text-emerald-500 shrink-0" />;
  }
  if (n.includes('academia') || n.includes('fitness') || n.includes('muscula')) {
    return <Dumbbell className="w-5 h-5 text-rose-500 shrink-0" />;
  }
  if (n.includes('gourmet') || n.includes('lounge') || n.includes('bistr') || n.includes('cozinha')) {
    return <Utensils className="w-5 h-5 text-orange-500 shrink-0" />;
  }
  if (n.includes('coworking') || n.includes('reuni') || n.includes('sala')) {
    return <Coffee className="w-5 h-5 text-blue-500 shrink-0" />;
  }
  return <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />;
}

export default function ReservaAreas({ usuarioLogado }: ReservaAreasProps) {
  const [condId, setCondId] = useState(() => getCondominioAtivoId(usuarioLogado));
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Dados principais
  const [areas, setAreas] = useState<AreaComum[]>([]);
  const [reservas, setReservas] = useState<ReservaArea[]>([]);
  const [moradoresCadastrados, setMoradoresCadastrados] = useState<any[]>([]);

  // Abas principais
  const [abaAtiva, setAbaAtiva] = useState<'agenda' | 'nova' | 'convidados' | 'vistorias' | 'espacos'>('agenda');

  // Modo de visualização na agenda (Cards vs Linha do Tempo / Disponibilidade)
  const [modoVisualizacaoAgenda, setModoVisualizacaoAgenda] = useState<'cards' | 'disponibilidade'>('cards');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroArea, setFiltroArea] = useState<string>('todas');
  const [termoBusca, setTermoBusca] = useState('');
  const [dataSelecionadaFiltro, setDataSelecionadaFiltro] = useState<string>('todas'); // 'todas' ou 'YYYY-MM-DD'

  // Mensagens de Toast
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

  // Modais e Diálogos
  const [modalAprovacao, setModalAprovacao] = useState<{
    aberto: boolean;
    reserva: ReservaArea | null;
    acao: 'aprovar' | 'recusar';
    motivo: string;
  }>({
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

  // Formulário de Nova Reserva (Otimizado Mobile)
  const [passoFormReserva, setPassoFormReserva] = useState<1 | 2 | 3>(1);
  const [buscaMoradorInput, setBuscaMoradorInput] = useState('');
  const [mostrarSugestoesMorador, setMostrarSugestoesMorador] = useState(false);
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
    horario_inicio: '18:30',
    horario_fim: '23:30',
    unidade_bloco: '',
    morador_nome: '',
    morador_telefone: '',
    tipo_evento: 'Comemoração Familiar',
    qtd_convidados_estimada: 20,
    observacoes: '',
    termo_aceito: false
  });

  const [conflitoDetectado, setConflitoDetectado] = useState<string | null>(null);

  // Convidados
  const [reservaSelecionadaConvidados, setReservaSelecionadaConvidados] = useState<ReservaArea | null>(null);
  const [novoConvidadoNome, setNovoConvidadoNome] = useState('');
  const [novoConvidadoDoc, setNovoConvidadoDoc] = useState('');
  const [buscaConvidadoFiltro, setBuscaConvidadoFiltro] = useState('');
  const [modalImportarConvidados, setModalImportarConvidados] = useState(false);
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

      // Auto-seleciona primeira reserva se houver para convidados
      if (reservasData.length > 0 && !reservaSelecionadaConvidados) {
        const apta = reservasData.find(r => r.status === 'aprovada') || reservasData[0];
        setReservaSelecionadaConvidados(apta);
      }

      // Carrega moradores cadastrados para auto-complete
      const { data: morData } = await supabase
        .from('moradores')
        .select('id, nome, bloco, unidade, telefone, celular')
        .eq('condominio_id', condId)
        .order('nome', { ascending: true })
        .limit(300);

      if (morData) {
        setMoradoresCadastrados(morData);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de reservas:', e);
    } finally {
      setLoading(false);
    }
  };

  // Verifica conflito em tempo real
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

  // Carrossel de Datas Próximas (Hoje + próximos 14 dias)
  const datasCarrossel = useMemo(() => {
    const lista = [];
    const hoje = new Date();
    for (let i = 0; i < 15; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const diaMes = d.getDate();
      const mesAbrev = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

      // Contagem de eventos nesta data
      const qtdReservasData = reservas.filter(
        r => r.data_reserva === iso && r.status !== 'cancelada' && r.status !== 'recusada'
      ).length;

      lista.push({
        iso,
        diaSemana,
        diaMes,
        mesAbrev,
        isHoje: i === 0,
        qtdReservasData
      });
    }
    return lista;
  }, [reservas]);

  // Métricas do Painel
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

  // Lista Filtrada de Reservas
  const reservasFiltradas = useMemo(() => {
    return reservas.filter(r => {
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroArea !== 'todas' && r.area_id !== filtroArea) return false;
      if (dataSelecionadaFiltro !== 'todas' && r.data_reserva !== dataSelecionadaFiltro) return false;
      if (termoBusca.trim()) {
        const t = termoBusca.toLowerCase().trim();
        const bateNome = r.morador_nome?.toLowerCase().includes(t);
        const bateUnidade = r.unidade_bloco?.toLowerCase().includes(t);
        const bateArea = r.area_nome?.toLowerCase().includes(t);
        const bateEvento = r.tipo_evento?.toLowerCase().includes(t);
        if (!bateNome && !bateUnidade && !bateArea && !bateEvento) return false;
      }
      return true;
    });
  }, [reservas, filtroStatus, filtroArea, dataSelecionadaFiltro, termoBusca]);

  // Área Selecionada no Form
  const areaSelecionadaObj = useMemo(() => {
    return areas.find(a => a.id === formNovaReserva.area_id) || areas[0] || null;
  }, [areas, formNovaReserva.area_id]);

  // Valor Total Calculado
  const valorTotalReserva = useMemo(() => {
    if (!areaSelecionadaObj) return 0;
    return (areaSelecionadaObj.taxa_reserva || 0) + (areaSelecionadaObj.taxa_limpeza || 0);
  }, [areaSelecionadaObj]);

  // Auto-complete de Moradores Filtrados
  const moradoresFiltradosAutoComplete = useMemo(() => {
    if (!buscaMoradorInput.trim()) return [];
    const t = buscaMoradorInput.toLowerCase().trim();
    return moradoresCadastrados
      .filter(m => {
        const nomeMatch = m.nome?.toLowerCase().includes(t);
        const unMatch = `${m.bloco || ''} ${m.unidade || ''}`.toLowerCase().includes(t);
        return nomeMatch || unMatch;
      })
      .slice(0, 6);
  }, [buscaMoradorInput, moradoresCadastrados]);

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
      setFeedback({ tipo: 'erro', texto: 'É obrigatório aceitar o Termo e Regras de Uso.' });
      return;
    }

    const resultado = await criarOuAtualizarReserva(condId, formNovaReserva, usuarioLogado);
    if (resultado.sucesso && resultado.reserva) {
      setReservas(prev => [resultado.reserva!, ...prev]);
      setFeedback({ tipo: 'sucesso', texto: 'Reserva cadastrada com sucesso!' });
      setAbaAtiva('agenda');
      setPassoFormReserva(1);
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
      setBuscaMoradorInput('');
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

  // Gerenciamento de Convidados - Adicionar 1
  const handleAdicionarConvidado = async () => {
    if (!reservaSelecionadaConvidados || !novoConvidadoNome.trim()) return;

    const novo: ConvidadoEvento = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      nome: novoConvidadoNome.trim(),
      documento: novoConvidadoDoc.trim(),
      parentesco_ou_tipo: 'Convidado',
      confirmado_portaria: false
    };

    const listaAtual = reservaSelecionadaConvidados.lista_convidados || [];
    const novaLista = [...listaAtual, novo];
    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };

    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
    setNovoConvidadoNome('');
    setNovoConvidadoDoc('');
    setFeedback({ tipo: 'sucesso', texto: 'Convidado incluído na lista da portaria!' });
  };

  // 1-Toque: Confirmar Presença do Convidado na Portaria
  const handleTogglePresencaConvidado = async (convId: string) => {
    if (!reservaSelecionadaConvidados) return;
    const listaAtual = reservaSelecionadaConvidados.lista_convidados || [];
    const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novaLista = listaAtual.map(c => {
      if (c.id === convId) {
        const novoStatus = !c.confirmado_portaria;
        return {
          ...c,
          confirmado_portaria: novoStatus,
          horario_entrada: novoStatus ? agoraHora : undefined
        };
      }
      return c;
    });

    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };
    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
  };

  // Importar Convidados em Lote
  const handleImportarTextoConvidados = async () => {
    if (!reservaSelecionadaConvidados || !textoColarConvidados.trim()) return;

    const linhas = textoColarConvidados.split('\n').filter(l => l.trim().length > 0);
    const novos: ConvidadoEvento[] = linhas.map((linha, idx) => {
      const partes = linha.split(/[-–,;]/);
      return {
        id: `conv-${Date.now()}-${idx}`,
        nome: partes[0].trim(),
        documento: partes[1] ? partes[1].trim() : undefined,
        parentesco_ou_tipo: 'Convidado',
        confirmado_portaria: false
      };
    });

    const listaAtual = reservaSelecionadaConvidados.lista_convidados || [];
    const novaLista = [...listaAtual, ...novos];
    const atualizada = { ...reservaSelecionadaConvidados, lista_convidados: novaLista };

    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservaSelecionadaConvidados(atualizada);
    setReservas(prev => prev.map(r => (r.id === atualizada.id ? atualizada : r)));
    setTextoColarConvidados('');
    setModalImportarConvidados(false);
    setFeedback({ tipo: 'sucesso', texto: `${novos.length} convidados importados para a portaria!` });
  };

  // Remover Convidado
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
      operador_nome: usuarioLogado?.nome || 'Portaria / Gestão',
      chaves_entregues_ou_devolvidas: modalVistoria.chaves,
      estado_conservacao: modalVistoria.estado,
      limpeza_conforme: modalVistoria.limpeza,
      houve_avarias: modalVistoria.avarias,
      observacoes: modalVistoria.observacoes
    };

    const atualizada: ReservaArea = {
      ...r,
      ...(modalVistoria.tipo === 'entrada'
        ? { vistoria_entrada: vistoriaDados }
        : { vistoria_saida: vistoriaDados, status: 'concluida' })
    };

    await criarOuAtualizarReserva(condId, atualizada, usuarioLogado);
    setReservas(prev => prev.map(item => (item.id === atualizada.id ? atualizada : item)));
    setModalVistoria({
      aberto: false,
      reserva: null,
      tipo: 'entrada',
      chaves: true,
      estado: 'bom',
      limpeza: true,
      avarias: false,
      observacoes: ''
    });
    setFeedback({
      tipo: 'sucesso',
      texto: `Vistoria de ${modalVistoria.tipo === 'entrada' ? 'Entrada (Check-in)' : 'Saída (Check-out)'} concluída!`
    });
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

  // Status Badge Mobile-Friendly
  const getStatusBadge = (status: ReservaArea['status']) => {
    switch (status) {
      case 'aprovada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovada
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pendente
          </span>
        );
      case 'recusada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Recusada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <AlertCircle className="w-3.5 h-3.5" /> Cancelada
          </span>
        );
      case 'concluida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Check className="w-3.5 h-3.5" /> Concluída
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3.5 sm:space-y-4 pb-28 px-2 sm:px-4">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 sm:p-3.5 rounded-2xl flex items-center justify-between shadow-lg text-xs sm:text-sm font-bold transition-all sticky top-2 z-50 animate-in fade-in slide-in-from-top-2 ${
            feedback.tipo === 'sucesso' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            <span>{feedback.texto}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/20 rounded-lg cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Compacto Mobile-First */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Reserva de Áreas
                </h1>
                <span className="text-[10px] sm:text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 truncate max-w-[150px]">
                  {condoConfig?.nome || 'Condomínio'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Salão, churrasqueiras, convidados e vistorias
              </p>
            </div>
          </div>

          {/* Botão Ação Rápida */}
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('nova');
              setPassoFormReserva(1);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden xs:inline">Nova Reserva</span>
            <span className="xs:hidden">Nova</span>
          </button>
        </div>

        {/* Barra de Métricas Interativa com 1 Toque (Filtro Instantâneo) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('agenda');
              setFiltroStatus('todos');
              setDataSelecionadaFiltro('todas');
            }}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
              filtroStatus === 'todos' && dataSelecionadaFiltro === 'todas'
                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 block">Total</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {metricas.total}
              </span>
            </div>
            <CalendarIcon className="w-4 h-4 text-blue-500" />
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('agenda');
              setFiltroStatus('pendente');
              setDataSelecionadaFiltro('todas');
            }}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
              filtroStatus === 'pendente'
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block truncate">
                Pendentes
              </span>
              <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 leading-tight">
                {metricas.pendentes}
              </span>
            </div>
            <Clock className="w-4 h-4 text-amber-500" />
          </button>

          <button
            type="button"
            onClick={() => {
              setAbaAtiva('agenda');
              const hoje = new Date().toISOString().split('T')[0];
              setDataSelecionadaFiltro(hoje);
              setFiltroStatus('aprovada');
            }}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
              dataSelecionadaFiltro === new Date().toISOString().split('T')[0]
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                Hoje
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                {metricas.confirmadasHoje}
              </span>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </button>

          <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block truncate">
                Arrecadado
              </span>
              <span className="text-xs sm:text-sm font-black font-mono text-purple-700 dark:text-purple-300 leading-tight">
                R$ {metricas.totalArrecadado.toFixed(0)}
              </span>
            </div>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Navegação por Abas (Otimizada para Smartphones com Scroll Suave) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl overflow-x-auto text-xs font-bold scrollbar-none sticky top-1 z-30 shadow-xs backdrop-blur-md">
        <button
          onClick={() => setAbaAtiva('agenda')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap min-h-[38px] ${
            abaAtiva === 'agenda'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Agenda</span>
          {metricas.pendentes > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black">
              {metricas.pendentes}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setAbaAtiva('nova');
            setPassoFormReserva(1);
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap min-h-[38px] ${
            abaAtiva === 'nova'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Reservar</span>
        </button>

        <button
          onClick={() => setAbaAtiva('convidados')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap min-h-[38px] ${
            abaAtiva === 'convidados'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-purple-500 shrink-0" />
          <span>Portaria & Convidados</span>
        </button>

        <button
          onClick={() => setAbaAtiva('vistorias')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap min-h-[38px] ${
            abaAtiva === 'vistorias'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Vistorias & Chaves</span>
        </button>

        {podeGerenciarAreas && (
          <button
            onClick={() => setAbaAtiva('espacos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap min-h-[38px] ${
              abaAtiva === 'espacos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Espaços ({areas.length})</span>
          </button>
        )}
      </div>

      {/* ABA 1: AGENDA & RESERVAS */}
      {abaAtiva === 'agenda' && (
        <div className="space-y-3.5">
          {/* Seletor Deslizável de Dias (Carrossel Horizontal de Toque Rápido para Celular) */}
          <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
                Seletor Rápido de Dias
              </span>
              <div className="flex items-center gap-2">
                {dataSelecionadaFiltro !== 'todas' && (
                  <button
                    onClick={() => setDataSelecionadaFiltro('todas')}
                    className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Ver Todas as Datas
                  </button>
                )}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setModoVisualizacaoAgenda('cards')}
                    className={`p-1 rounded-md text-xs font-bold transition ${
                      modoVisualizacaoAgenda === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                    title="Visualizar em Cards"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacaoAgenda('disponibilidade')}
                    className={`p-1 rounded-md text-xs font-bold transition ${
                      modoVisualizacaoAgenda === 'disponibilidade'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                    title="Visualizar Linha do Tempo / Vagas"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Fita de Dias Deslizável */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x">
              <button
                type="button"
                onClick={() => setDataSelecionadaFiltro('todas')}
                className={`flex flex-col items-center justify-center min-w-[62px] h-[64px] rounded-xl border transition-all cursor-pointer snap-start shrink-0 ${
                  dataSelecionadaFiltro === 'todas'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-750'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">Todas</span>
                <span className="text-sm font-black mt-0.5">Datas</span>
                <span className="text-[9px] opacity-80 mt-0.5 font-bold">({reservas.length})</span>
              </button>

              {datasCarrossel.map(d => {
                const ativo = dataSelecionadaFiltro === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setDataSelecionadaFiltro(d.iso)}
                    className={`flex flex-col items-center justify-center min-w-[58px] sm:min-w-[64px] h-[64px] rounded-xl border transition-all cursor-pointer snap-start shrink-0 relative ${
                      ativo
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-[1.03]'
                        : d.isHoje
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-750'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{d.isHoje ? 'Hoje' : d.diaSemana}</span>
                    <span className="text-base font-black leading-tight">{d.diaMes}</span>
                    <span className="text-[9px] font-medium opacity-80">{d.mesAbrev}</span>

                    {/* Indicador de reserva no dia */}
                    {d.qtdReservasData > 0 && (
                      <span
                        className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                          ativo ? 'bg-white' : 'bg-amber-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtros em Chips & Barra de Busca */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                placeholder="Buscar por morador, unidade, espaço ou evento..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de Filtragem por Espaço Comum */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setFiltroArea('todas')}
                className={`px-3 py-1.5 rounded-full transition whitespace-nowrap cursor-pointer shrink-0 ${
                  filtroArea === 'todas'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos Espaços
              </button>
              {areas.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setFiltroArea(a.id)}
                  className={`px-3 py-1.5 rounded-full transition whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1 ${
                    filtroArea === a.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {getIconeArea(a.nome)}
                  <span>{a.nome}</span>
                </button>
              ))}
            </div>

            {/* Chips de Filtragem por Status */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-bold border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold shrink-0">Status:</span>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'pendente', label: 'Pendentes' },
                { id: 'aprovada', label: 'Aprovadas' },
                { id: 'concluida', label: 'Concluídas' },
                { id: 'recusada', label: 'Recusadas' }
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFiltroStatus(st.id)}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer shrink-0 ${
                    filtroStatus === st.id
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* VISUALIZAÇÃO 1: LINHA DO TEMPO & DISPONIBILIDADE (Ideal para Celular) */}
          {modoVisualizacaoAgenda === 'disponibilidade' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ListFilter className="w-4 h-4 text-emerald-500" />
                    Quadro de Disponibilidade dos Espaços
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Data:{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {dataSelecionadaFiltro === 'todas'
                        ? 'Hoje (' + new Date().toLocaleDateString('pt-BR') + ')'
                        : new Date(dataSelecionadaFiltro + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {areas.map(area => {
                  const dataCheck = dataSelecionadaFiltro === 'todas' ? new Date().toISOString().split('T')[0] : dataSelecionadaFiltro;
                  const reservasAreaDia = reservas.filter(
                    r =>
                      r.area_id === area.id &&
                      r.data_reserva === dataCheck &&
                      r.status !== 'recusada' &&
                      r.status !== 'cancelada'
                  );

                  const turnos = [
                    { id: 'manha', label: 'Manhã', horas: '09h - 13h' },
                    { id: 'tarde', label: 'Tarde', horas: '13h30 - 18h' },
                    { id: 'noite', label: 'Noite', horas: '18h30 - 23h30' }
                  ];

                  return (
                    <div
                      key={area.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getIconeArea(area.nome)}
                          <div>
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                              {area.nome}
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Cap: {area.capacidade_maxima} pessoas •{' '}
                              {area.taxa_reserva > 0 ? `Taxa R$ ${area.taxa_reserva.toFixed(2)}` : 'Gratuito'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormNovaReserva(prev => ({
                              ...prev,
                              area_id: area.id,
                              data_reserva: dataCheck
                            }));
                            setAbaAtiva('nova');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          + Agendar
                        </button>
                      </div>

                      {/* Turnos / Slots Visuais */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {turnos.map(turno => {
                          const reservaDoTurno = reservasAreaDia.find(
                            r => r.turno === turno.id || r.turno === 'dia_todo'
                          );

                          return (
                            <div
                              key={turno.id}
                              className={`p-2 rounded-xl text-center border transition ${
                                reservaDoTurno
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                                  : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              <span className="block text-[10px] font-black uppercase">{turno.label}</span>
                              <span className="block text-[9px] opacity-75 font-mono">{turno.horas}</span>
                              {reservaDoTurno ? (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 truncate max-w-full">
                                  {reservaDoTurno.unidade_bloco}
                                </span>
                              ) : (
                                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100">
                                  Livre
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO 2: CARDS DETALHADOS MOBILE-FIRST */}
          {modoVisualizacaoAgenda === 'cards' && (
            <div>
              {reservasFiltradas.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-300 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white">
                    Nenhuma reserva encontrada
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Não existem reservas com os filtros selecionados. Clique em "Nova Reserva" para cadastrar.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAbaAtiva('nova');
                      setPassoFormReserva(1);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Solicitar Reserva
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reservasFiltradas.map(res => {
                    const dataObj = new Date(res.data_reserva + 'T12:00:00');
                    const dataExtenso = dataObj.toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short'
                    });
                    const convidadosCount = res.lista_convidados?.length || 0;
                    const confirmadosCount = res.lista_convidados?.filter(c => c.confirmado_portaria).length || 0;

                    return (
                      <div
                        key={res.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Cabeçalho do Card */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                                {getIconeArea(res.area_nome)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                  {res.area_nome}
                                </h4>
                                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                                  {dataExtenso} • {res.horario_inicio} às {res.horario_fim}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0">{getStatusBadge(res.status)}</div>
                          </div>

                          {/* Bloco de Informações do Morador & Evento */}
                          <div className="space-y-1.5 p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Unidade / Apto:</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                {res.unidade_bloco}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Responsável:</span>
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                                {res.morador_nome}
                              </span>
                            </div>

                            {res.morador_telefone && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">WhatsApp:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {res.morador_telefone}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium">Evento:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {res.tipo_evento} ({res.qtd_convidados_estimada} conv.)
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                              <span className="text-slate-500 font-medium">Taxas Totais:</span>
                              <span className="font-mono font-black text-slate-900 dark:text-white">
                                R$ {(res.valor_total || 0).toFixed(2)}
                              </span>
                            </div>

                            {res.motivo_recusa && (
                              <div className="pt-1.5 border-t border-rose-200 dark:border-rose-900 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                                Recusa: {res.motivo_recusa}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Barra de Ações Mobile do Card (Touch Targets Grandes) */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                          {/* Botão WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleDispararWhats(res)}
                            className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-pointer flex items-center justify-center min-w-[40px] min-h-[40px]"
                            title="Enviar comprovante e regras por WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Botão Convidados */}
                          <button
                            type="button"
                            onClick={() => {
                              setReservaSelecionadaConvidados(res);
                              setAbaAtiva('convidados');
                            }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 cursor-pointer min-h-[40px]"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Convidados ({convidadosCount})</span>
                            {confirmadosCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-black">
                                {confirmadosCount}
                              </span>
                            )}
                          </button>

                          {/* Aprovação / Recusa para Síndico ou Vistoria */}
                          {res.status === 'pendente' && podeAprovar && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setModalAprovacao({ aberto: true, reserva: res, acao: 'aprovar', motivo: '' })
                                }
                                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs min-w-[40px] min-h-[40px] flex items-center justify-center"
                                title="Aprovar Reserva"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setModalAprovacao({ aberto: true, reserva: res, acao: 'recusar', motivo: '' })
                                }
                                className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs min-w-[40px] min-h-[40px] flex items-center justify-center"
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
                              className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800 cursor-pointer min-h-[40px]"
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
        </div>
      )}

      {/* ABA 2: FORMULÁRIO DE NOVA RESERVA (EXPERIÊNCIA MOBILE-FIRST EM PASSOS) */}
      {abaAtiva === 'nova' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl mx-auto">
          {/* Topo do Formulário */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Plus className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Nova Reserva
                </h3>
                <span className="text-[11px] text-slate-500">
                  Passo {passoFormReserva} de 3:{' '}
                  {passoFormReserva === 1 ? 'Escolha do Espaço' : passoFormReserva === 2 ? 'Data e Horário' : 'Dados do Morador'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAbaAtiva('agenda')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {/* Stepper Visual Mobile */}
          <div className="grid grid-cols-3 gap-1 mb-5">
            {[
              { passo: 1, label: '1. Espaço' },
              { passo: 2, label: '2. Data & Horário' },
              { passo: 3, label: '3. Morador & Regras' }
            ].map(s => (
              <button
                key={s.passo}
                type="button"
                onClick={() => setPassoFormReserva(s.passo as any)}
                className={`py-1.5 text-center rounded-lg text-xs font-bold transition ${
                  passoFormReserva === s.passo
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : passoFormReserva > s.passo
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleCriarReserva} className="space-y-4">
            {/* PASSO 1: SELEÇÃO DO ESPAÇO */}
            {passoFormReserva === 1 && (
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Selecione a Área Comum Desejada:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {areas.map(area => {
                    const selecionada = formNovaReserva.area_id === area.id;
                    const taxaTotal = (area.taxa_reserva || 0) + (area.taxa_limpeza || 0);

                    return (
                      <div
                        key={area.id}
                        onClick={() => setFormNovaReserva(prev => ({ ...prev, area_id: area.id }))}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                          selecionada
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 hover:border-slate-300'
                        }`}
                      >
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs shrink-0">
                          {getIconeArea(area.nome)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {area.nome}
                            </h4>
                            {selecionada && <Check className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {area.descricao}
                          </p>

                          <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-600 dark:text-slate-400">
                              Cap: <strong>{area.capacidade_maxima} pess.</strong>
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {taxaTotal > 0 ? `R$ ${taxaTotal.toFixed(2)}` : 'Gratuito'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPassoFormReserva(2)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Avançar para Data & Horário</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 2: DATA, TURNO E VERIFICAÇÃO DE DISPONIBILIDADE */}
            {passoFormReserva === 2 && (
              <div className="space-y-4">
                {/* Indicador do Espaço Selecionado */}
                {areaSelecionadaObj && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {getIconeArea(areaSelecionadaObj.nome)}
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold">Espaço Selecionado:</span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {areaSelecionadaObj.nome}
                        </h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPassoFormReserva(1)}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                )}

                {/* Data do Evento */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    Data do Agendamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formNovaReserva.data_reserva}
                    onChange={e => setFormNovaReserva(prev => ({ ...prev, data_reserva: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                {/* Seleção do Turno / Período (Bancos Grandes para Toque) */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    Turno Desejado *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'noite', label: 'Noite', horas: '18:30 às 23:30', ini: '18:30', fim: '23:30' },
                      { id: 'tarde', label: 'Tarde', horas: '13:30 às 18:00', ini: '13:30', fim: '18:00' },
                      { id: 'manha', label: 'Manhã', horas: '09:00 às 13:00', ini: '09:00', fim: '13:00' },
                      { id: 'dia_todo', label: 'Dia Todo', horas: '10:00 às 22:00', ini: '10:00', fim: '22:00' }
                    ].map(t => {
                      const sel = formNovaReserva.turno === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() =>
                            setFormNovaReserva(prev => ({
                              ...prev,
                              turno: t.id as any,
                              horario_inicio: t.ini,
                              horario_fim: t.fim
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                            sel
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="block font-black text-xs">{t.label}</span>
                          <span className="block text-[10px] opacity-80 font-mono mt-0.5">{t.horas}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Horários Personalizados */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Horário Início</label>
                    <input
                      type="time"
                      value={formNovaReserva.horario_inicio}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, horario_inicio: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Horário Término</label>
                    <input
                      type="time"
                      value={formNovaReserva.horario_fim}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, horario_fim: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Banner de Conflito em Tempo Real */}
                {conflitoDetectado ? (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-bold animate-pulse">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>ATENÇÃO: {conflitoDetectado}</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Data e horário 100% disponíveis para agendamento!</span>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPassoFormReserva(1)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(conflitoDetectado)}
                    onClick={() => setPassoFormReserva(3)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <span>Avançar para Morador</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3: MORADOR, TIPO DE EVENTO E TERMO */}
            {passoFormReserva === 3 && (
              <div className="space-y-4">
                {/* Campo de Auto-complete Rápido de Morador */}
                <div className="relative">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                    Localizar Morador Cadastrado (Opcional - Preenchimento Rápido)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Digite nome ou apto (ex: 502, Torre A)..."
                      value={buscaMoradorInput}
                      onChange={e => {
                        setBuscaMoradorInput(e.target.value);
                        setMostrarSugestoesMorador(true);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  {mostrarSugestoesMorador && moradoresFiltradosAutoComplete.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {moradoresFiltradosAutoComplete.map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setFormNovaReserva(prev => ({
                              ...prev,
                              morador_nome: m.nome || '',
                              unidade_bloco: `${m.bloco || ''} - Apto ${m.unidade || ''}`.trim(),
                              morador_telefone: m.celular || m.telefone || ''
                            }));
                            setBuscaMoradorInput(`${m.nome} (${m.bloco} - ${m.unidade})`);
                            setMostrarSugestoesMorador(false);
                          }}
                          className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer text-xs"
                        >
                          <span className="font-extrabold text-slate-900 dark:text-white block">{m.nome}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {m.bloco ? `${m.bloco} • ` : ''}Apto {m.unidade} {m.celular ? `• ${m.celular}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Unidade / Bloco *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Torre A - Apto 502"
                      value={formNovaReserva.unidade_bloco}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, unidade_bloco: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Nome do Responsável *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome completo do morador"
                      value={formNovaReserva.morador_nome}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, morador_nome: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={formNovaReserva.morador_telefone}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, morador_telefone: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Tipo de Comemoração
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aniversário, Churrasco"
                      value={formNovaReserva.tipo_evento}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, tipo_evento: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1 uppercase">
                      Qtd de Convidados
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={areaSelecionadaObj?.capacidade_maxima || 100}
                      value={formNovaReserva.qtd_convidados_estimada}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, qtd_convidados_estimada: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Resumo Financeiro & Regras */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> Resumo das Taxas:
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      Total: R$ {valorTotalReserva.toFixed(2)}
                    </span>
                  </div>

                  {areaSelecionadaObj && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      <div>Taxa de Reserva: R$ {(areaSelecionadaObj.taxa_reserva || 0).toFixed(2)}</div>
                      <div>Taxa de Limpeza: R$ {(areaSelecionadaObj.taxa_limpeza || 0).toFixed(2)}</div>
                      {areaSelecionadaObj.valor_caucao > 0 && (
                        <div>Caução (devolvido após vistoria): R$ {areaSelecionadaObj.valor_caucao.toFixed(2)}</div>
                      )}
                    </div>
                  )}

                  <label className="flex items-start gap-2 pt-2 cursor-pointer select-none border-t border-amber-500/20 mt-2">
                    <input
                      type="checkbox"
                      checked={formNovaReserva.termo_aceito}
                      onChange={e => setFormNovaReserva(prev => ({ ...prev, termo_aceito: e.target.checked }))}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5 shrink-0"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug">
                      Declaro que li e concordo com o Regulamento Interno, horários de silêncio e conservação do espaço.
                    </span>
                  </label>
                </div>

                {/* Botões de Ação */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setPassoFormReserva(2)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Voltar
                  </button>

                  <button
                    type="submit"
                    disabled={Boolean(conflitoDetectado) || !formNovaReserva.termo_aceito}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    Confirmar Reserva
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ABA 3: LISTA DE CONVIDADOS (PORTARIA & LIBERAÇÃO TOUCH NA PORTARIA) */}
      {abaAtiva === 'convidados' && (
        <div className="space-y-3.5">
          {/* Seletor do Evento no Topo */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Controle de Convidados na Portaria
              </h3>
              {reservaSelecionadaConvidados && (
                <button
                  type="button"
                  onClick={() => handleDispararWhats(reservaSelecionadaConvidados)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar Lista
                </button>
              )}
            </div>

            <label className="block text-[11px] font-bold text-slate-500 uppercase">
              Selecione o Evento / Reserva:
            </label>
            <select
              value={reservaSelecionadaConvidados?.id || ''}
              onChange={e => {
                const r = reservas.find(item => item.id === e.target.value);
                setReservaSelecionadaConvidados(r || null);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200"
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

          {reservaSelecionadaConvidados ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {/* Formulário de Adição Rápida */}
              <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                    + Adicionar Convidado
                  </h4>
                  <button
                    type="button"
                    onClick={() => setModalImportarConvidados(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    Importar Lista
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nome completo do convidado"
                    value={novoConvidadoNome}
                    onChange={e => setNovoConvidadoNome(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Documento RG / CPF (Opcional)"
                    value={novoConvidadoDoc}
                    onChange={e => setNovoConvidadoDoc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAdicionarConvidado}
                    disabled={!novoConvidadoNome.trim()}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-md shadow-purple-600/20"
                  >
                    + Salvar na Lista
                  </button>
                </div>

                {/* Resumo de Presença */}
                <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-purple-700 dark:text-purple-300">Total Convidados:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {reservaSelecionadaConvidados.lista_convidados?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-emerald-700 dark:text-emerald-300">Presentes na Festa:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {reservaSelecionadaConvidados.lista_convidados?.filter(c => c.confirmado_portaria).length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista com Ação de Check-in em 1 Toque na Portaria */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                {/* Campo de Busca Rápida de Convidados */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou RG do convidado..."
                    value={buscaConvidadoFiltro}
                    onChange={e => setBuscaConvidadoFiltro(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>

                {(!reservaSelecionadaConvidados.lista_convidados ||
                  reservaSelecionadaConvidados.lista_convidados.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    Nenhum convidado cadastrado até o momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[480px] overflow-y-auto">
                    {reservaSelecionadaConvidados.lista_convidados
                      .filter(c => {
                        if (!buscaConvidadoFiltro.trim()) return true;
                        const t = buscaConvidadoFiltro.toLowerCase().trim();
                        return (
                          c.nome?.toLowerCase().includes(t) ||
                          c.documento?.toLowerCase().includes(t)
                        );
                      })
                      .map((c, idx) => (
                        <div
                          key={c.id || idx}
                          className="py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 dark:text-white block truncate">
                                {c.nome}
                              </span>
                              {c.documento && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  Doc: {c.documento}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Botão de 1 Toque para Confirmar Entrada na Portaria */}
                            <button
                              type="button"
                              onClick={() => handleTogglePresencaConvidado(c.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                                c.confirmado_portaria
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{c.confirmado_portaria ? `Presente (${c.horario_entrada})` : 'Liberar'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoverConvidado(c.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="Remover convidado"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* ABA 4: VISTORIAS & CONTROLE DE CHAVES (MOBILE-FIRST) */}
      {abaAtiva === 'vistorias' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-500" />
              Checklist de Vistorias e Chaves
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Controle de entrega e devolução de chaves, verificação de avarias e limpeza
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reservas
              .filter(r => r.status === 'aprovada' || r.status === 'concluida')
              .map(res => (
                <div
                  key={res.id}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {res.data_reserva} • {res.horario_inicio} às {res.horario_fim}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {res.area_nome} — {res.unidade_bloco} ({res.morador_nome})
                    </h4>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                      <span>
                        Check-in:{' '}
                        {res.vistoria_entrada?.realizada ? (
                          <span className="text-emerald-600 font-bold">✅ Realizado</span>
                        ) : (
                          <span className="text-amber-500 font-bold">⏳ Pendente</span>
                        )}
                      </span>
                      <span>
                        Check-out:{' '}
                        {res.vistoria_saida?.realizada ? (
                          <span className="text-emerald-600 font-bold">✅ Realizado</span>
                        ) : (
                          <span className="text-amber-500 font-bold">⏳ Pendente</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
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
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 cursor-pointer min-h-[38px]"
                    >
                      Check-in Entrada
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
                      className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-500 text-white font-extrabold hover:bg-amber-400 cursor-pointer shadow-xs min-h-[38px]"
                    >
                      Check-out Saída
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ABA 5: GESTÃO DE ESPAÇOS COMUNS */}
      {abaAtiva === 'espacos' && podeGerenciarAreas && (
        <div className="space-y-3.5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-500" />
                Espaços Comuns
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Configure horários, limites de convidados e taxas
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
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
            >
              + Novo Espaço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {areas.map(area => (
              <div
                key={area.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getIconeArea(area.nome)}
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{area.nome}</h4>
                    </div>
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
                    <div>
                      Capacidade: <span className="font-bold">{area.capacidade_maxima} pessoas</span>
                    </div>
                    <div>
                      Horário: <span className="font-bold">{area.horario_inicio} às {area.horario_fim}</span>
                    </div>
                    <div>
                      Taxa Reserva:{' '}
                      <span className="font-bold font-mono">R$ {(area.taxa_reserva || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      Taxa Limpeza:{' '}
                      <span className="font-bold font-mono">R$ {(area.taxa_limpeza || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAreaEmEdicao(area);
                      setModalNovaArea(true);
                    }}
                    className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluirArea(area.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE APROVAÇÃO / RECUSA (RESPONSIVO BOTTOM-SHEET NO CELULAR) */}
      {modalAprovacao.aberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {modalAprovacao.acao === 'aprovar' ? 'Aprovar Reserva' : 'Recusar Solicitação'}
            </h3>
            <p className="text-xs text-slate-500">
              {modalAprovacao.reserva?.area_nome} — {modalAprovacao.reserva?.unidade_bloco} (
              {modalAprovacao.reserva?.morador_nome}) em {modalAprovacao.reserva?.data_reserva}
            </p>

            {modalAprovacao.acao === 'recusar' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Recusa:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Conflito de agenda, manutenção extraordinária..."
                  value={modalAprovacao.motivo}
                  onChange={e => setModalAprovacao(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAprovacao({ aberto: false, reserva: null, acao: 'aprovar', motivo: '' })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmarStatus}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md cursor-pointer ${
                  modalAprovacao.acao === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirmar {modalAprovacao.acao === 'aprovar' ? 'Aprovação' : 'Recusa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTORIA (TOUCH-FRIENDLY BOTTOM-SHEET NO CELULAR) */}
      {modalVistoria.aberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3.5">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Vistoria de {modalVistoria.tipo === 'entrada' ? 'Entrada (Check-in)' : 'Saída (Check-out)'}
            </h3>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalVistoria.chaves}
                  onChange={e => setModalVistoria(prev => ({ ...prev, chaves: e.target.checked }))}
                  className="w-5 h-5 rounded text-emerald-600 cursor-pointer shrink-0"
                />
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {modalVistoria.tipo === 'entrada'
                    ? 'Chaves entregues ao morador'
                    : 'Chaves devolvidas à portaria'}
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={modalVistoria.limpeza}
                  onChange={e => setModalVistoria(prev => ({ ...prev, limpeza: e.target.checked }))}
                  className="w-5 h-5 rounded text-emerald-600 cursor-pointer shrink-0"
                />
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  Limpeza e descarte de lixo em conformidade
                </span>
              </label>

              {modalVistoria.tipo === 'saida' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalVistoria.avarias}
                    onChange={e => setModalVistoria(prev => ({ ...prev, avarias: e.target.checked }))}
                    className="w-5 h-5 rounded text-rose-600 cursor-pointer shrink-0"
                  />
                  <span className="font-black">Houve quebra de itens ou avarias</span>
                </label>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                  Observações da Vistoria:
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Espaço limpo, cadeiras conferidas, freezer desligado..."
                  value={modalVistoria.observacoes}
                  onChange={e => setModalVistoria(prev => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setModalVistoria({
                    aberto: false,
                    reserva: null,
                    tipo: 'entrada',
                    chaves: true,
                    estado: 'bom',
                    limpeza: true,
                    avarias: false,
                    observacoes: ''
                  })
                }
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarVistoria}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Concluir Vistoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO EM MASSA DE CONVIDADOS */}
      {modalImportarConvidados && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Importar Lista de Convidados
            </h3>
            <p className="text-xs text-slate-500">
              Cole a lista (um convidado por linha). Pode conter nome e documento separados por vírgula ou hífen.
            </p>

            <textarea
              rows={6}
              placeholder="Mariana Lima, 45.123.456-7&#10;Rodrigo Ramos&#10;Fernanda Paes, 38.990.231-1"
              value={textoColarConvidados}
              onChange={e => setTextoColarConvidados(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalImportarConvidados(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportarTextoConvidados}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Processar e Incluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAÇÃO DE ÁREA */}
      {modalNovaArea && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {areaEmEdicao.id ? 'Editar Espaço Comum' : 'Novo Espaço Comum'}
            </h3>

            <form onSubmit={handleSalvarArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Espaço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salão de Festas, Churrasqueira 01..."
                  value={areaEmEdicao.nome}
                  onChange={e => setAreaEmEdicao(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Capacidade Máxima
                  </label>
                  <input
                    type="number"
                    value={areaEmEdicao.capacidade_maxima}
                    onChange={e =>
                      setAreaEmEdicao(prev => ({ ...prev, capacidade_maxima: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Taxa Reserva (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.taxa_reserva}
                    onChange={e =>
                      setAreaEmEdicao(prev => ({ ...prev, taxa_reserva: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Taxa Limpeza (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.taxa_limpeza}
                    onChange={e =>
                      setAreaEmEdicao(prev => ({ ...prev, taxa_limpeza: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Valor Caução (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={areaEmEdicao.valor_caucao}
                    onChange={e =>
                      setAreaEmEdicao(prev => ({ ...prev, valor_caucao: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovaArea(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer"
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
