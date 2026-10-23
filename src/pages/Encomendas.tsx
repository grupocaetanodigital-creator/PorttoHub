import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { registrarAtividade } from '../services/auditoriaService';
import { uploadFotoComprimidaStorage, comprimirImagemBase64 } from '../services/imageUtils';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Plus, 
  UserCheck, 
  MessageCircle, 
  ExternalLink, 
  X, 
  Camera, 
  QrCode, 
  Clock, 
  Building2, 
  CheckSquare, 
  Square,
  User,
  Boxes,
  MapPin,
  Edit3,
  Layers,
  ClipboardCheck,
  Check,
  FileText,
  ShieldCheck,
  Share2,
  Copy,
  Printer,
  Calendar,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Home,
  Trash2,
  Pencil,
  ShieldAlert,
  Lock,
  SlidersHorizontal,
  Sparkles,
  ScanLine,
  Tag,

  ChevronDown,
  ChevronUp,
  ChevronLeft,
  PenTool,
  Eraser
} from 'lucide-react';
import CampoAssinaturaDigital from '../components/CampoAssinaturaDigital';
import { verificarPermissao, carregarNiveisAcesso } from '../services/permissoesService';
import { 
  carregarCondominioConfig, 
  isEstruturaCasas, 
  isEstruturaTorres, 
  isEstruturaBlocos,
  isEstruturaNumeralDireto,
  getNomeRotuloBloco, 
  getNomeRotuloUnidade, 
  obterListaBlocosOuTorres, 
  formatarIdentificacaoUnidade, 
  formatarTextoWhatsUnidade,
  saoUnidadesEquivalentes,
  autoCorrigirZeroEsquerda,
  CondominioConfig 
} from '../services/condominioService';

interface EncomendasProps {
  usuarioLogado?: any;
}

export default function Encomendas({ usuarioLogado }: EncomendasProps) {
  const idCondominioAtivo = usuarioLogado?.condominio_id || '';
  const isGlobal = !idCondominioAtivo || idCondominioAtivo === 'global';
  const listaCondominios = usuarioLogado?.listaCondominios || [];
  const [condominioNovoLoteId, setCondominioNovoLoteId] = useState(() => {
    if (usuarioLogado?.condominio_id && usuarioLogado.condominio_id !== 'global') {
      return usuarioLogado.condominio_id;
    }
    const primeiro = (usuarioLogado?.listaCondominios || []).find((c: any) => c.id && c.id !== 'global');
    return primeiro?.id || '';
  });
  const [etapa, setEtapa] = useState<'1' | '2' | '3' | '4'>('3');
  const [mostrarDossie, setMostrarDossie] = useState(false);
  const [modalEntradaAberta, setModalEntradaAberta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  const [entregadores, setEntregadores] = useState<any[]>([]);
  const [lotesPendentes, setLotesPendentes] = useState<any[]>([]);
  const [todosLotesRE, setTodosLotesRE] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [todosItensRetidos, setTodosItensRetidos] = useState<any[]>([]);

  // Estados de Edição e Exclusão no Histórico de REs
  const [loteEmEdicao, setLoteEmEdicao] = useState<any | null>(null);
  const [editQtdDeclarada, setEditQtdDeclarada] = useState<number | string>(1);
  const [editEntregadorId, setEditEntregadorId] = useState<string>('');
  const [loteParaExcluir, setLoteParaExcluir] = useState<any | null>(null);

  // Estados de Edição e Exclusão de Pacotes Retidos (Cards de Encomendas)
  const [pacoteEmEdicao, setPacoteEmEdicao] = useState<any | null>(null);
  const [editPacoteUnidade, setEditPacoteUnidade] = useState('');
  const [editPacoteBloco, setEditPacoteBloco] = useState('');
  const [editPacoteMoradorId, setEditPacoteMoradorId] = useState('');
  const [editPacoteCodigo, setEditPacoteCodigo] = useState('');
  const [editPacoteLocal, setEditPacoteLocal] = useState('');
  const [editPacoteObs, setEditPacoteObs] = useState('');
  const [pacoteParaExcluir, setPacoteParaExcluir] = useState<any | null>(null);

  // Estados de Opções Avançadas na Finalização da Entrega / Baixa
  const [mostrarOpcoesBaixa, setMostrarOpcoesBaixa] = useState(false);
  const [baixaDocRetirante, setBaixaDocRetirante] = useState('');
  const [baixaParentesco, setBaixaParentesco] = useState('Titular / Morador');
  const [baixaObsEspecial, setBaixaObsEspecial] = useState('');
  const [baixaNotificarSupervisor, setBaixaNotificarSupervisor] = useState(false);

  // Timer para auto-correção imediata do zero à esquerda (1 a 9 -> 01 a 09)
  const timerCorrecaoUnidadeRef = useRef<any>(null);

  // RBAC: Verificação do nível de acesso e permissões configuradas na matriz de Acesso & Permissões
  const nivelNum = usuarioLogado?.nivel_acesso !== undefined && usuarioLogado?.nivel_acesso !== null 
    ? Number(usuarioLogado.nivel_acesso) 
    : 3;
  const perfilStr = (usuarioLogado?.perfil || '').toLowerCase();
  
  // Superadministradores e Masters têm permissão ampla por padrão
  const eAdmin = perfilStr === 'admin' || perfilStr === 'admin_geral' || nivelNum === 0 || usuarioLogado?.login === 'admin' || usuarioLogado?.login === 'jaq';

  // Permissões granulares do operador logado por etapa - REGIDAS DE FORMA REAL PELA MATRIZ RBAC
  // 1ª Etapa: Recebimento (RE)
  const podeCadastrarEntregador = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'cadastrar_entregador'));
  const podeReceberRE = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'entrada_lote'));
  const podeCriarLote = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'criar_lote') || verificarPermissao(usuarioLogado, 'encomendas', 'entrada_lote'));
  const podeEditarLotes = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'editar_lotes') || verificarPermissao(usuarioLogado, 'encomendas', 'editar'));
  const podeExcluirLotes = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'excluir_lotes') || verificarPermissao(usuarioLogado, 'encomendas', 'excluir'));

  // 2ª Etapa: Entrada de Encomendas (substituindo Triagem)
  const podeFazerTriagem = Boolean(
    eAdmin || 
    verificarPermissao(usuarioLogado, 'encomendas', 'triagem') || 
    verificarPermissao(usuarioLogado, 'encomendas', 'entrada') || 
    verificarPermissao(usuarioLogado, 'encomendas', 'criar') ||
    (usuarioLogado && Number(usuarioLogado.nivel_acesso) !== 4)
  );
  const podeFazerEntrada = podeFazerTriagem;

  // 3ª Etapa: Saída / Baixa
  const podeDarBaixa = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'baixa'));
  const podeEditarPacote = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'editar_pacote') || verificarPermissao(usuarioLogado, 'encomendas', 'editar'));
  const podeExcluirPacote = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'excluir_pacote') || verificarPermissao(usuarioLogado, 'encomendas', 'excluir'));

  // 4ª Etapa: Dossiê Completo (Auditoria & Provas)
  const podeVerDossie = Boolean(eAdmin || verificarPermissao(usuarioLogado, 'encomendas', 'dossie'));

  // Atualização em tempo real das permissões quando forem salvas na matriz
  const [, setVersaoPermissoes] = useState(0);
  useEffect(() => {
    const condoId = usuarioLogado?.condominio_id || idCondominioAtivo;
    carregarNiveisAcesso(condoId).then(() => setVersaoPermissoes(v => v + 1));

    const handleAtualizacao = () => setVersaoPermissoes(v => v + 1);
    window.addEventListener('niveis_acesso_atualizados', handleAtualizacao);
    return () => window.removeEventListener('niveis_acesso_atualizados', handleAtualizacao);
  }, [usuarioLogado?.condominio_id, idCondominioAtivo]);

  // Estados do Módulo Dossiê Auditável de Encomendas
  const [itensDossie, setItensDossie] = useState<any[]>([]);
  const [loadingDossie, setLoadingDossie] = useState(false);
  const [buscaDossie, setBuscaDossie] = useState('');
  const [tipoFiltroBuscaDossie, setTipoFiltroBuscaDossie] = useState<'unidade' | 'todos' | 'nome' | 'rastreio' | 'bloco' | 'retirante'>('unidade');
  const [filtroStatusDossie, setFiltroStatusDossie] = useState<'todos' | 'entregue' | 'retido'>('todos');
  const [filtroPeriodoDossie, setFiltroPeriodoDossie] = useState<'todos' | 'hoje' | 'personalizado'>('todos');
  const [dataInicioPersonalizadaDossie, setDataInicioPersonalizadaDossie] = useState('');
  const [dataFimPersonalizadaDossie, setDataFimPersonalizadaDossie] = useState('');
  const [itensFotosExpandidasDossie, setItensFotosExpandidasDossie] = useState<Record<string, boolean>>({});
  const [itemModalDossie, setItemModalDossie] = useState<any | null>(null);
  const [copiadoDossie, setCopiadoDossie] = useState(false);

  const [statsDia, setStatsDia] = useState<{
    lotesHoje: number;
    triadasHoje: number;
    aguardandoTriagem: number;
    entreguesHoje: number;
    retidosPorBloco: Record<string, number>;
  }>({
    lotesHoje: 0,
    triadasHoje: 0,
    aguardandoTriagem: 0,
    entreguesHoje: 0,
    retidosPorBloco: {}
  });

  const [buscaEntregador, setBuscaEntregador] = useState('');
  const [entregadorSelecionado, setEntregadorSelecionado] = useState<any | null>(null);
  const [qtdDeclarada, setQtdDeclarada] = useState<number | string>(1);
  const [modalNovoEntregador, setModalNovoEntregador] = useState(false);
  const [novoEntNome, setNovoEntNome] = useState('');
  const [novoEntDoc, setNovoEntDoc] = useState('');
  const [novoEntEmpresa, setNovoEntEmpresa] = useState('');
  const [loteCriadoWhats, setLoteCriadoWhats] = useState<{ codigo: string; link: string } | null>(null);

  const [loteAtivo, setLoteAtivo] = useState<any | null>(null);
  const [unidadeTriagem, setUnidadeTriagem] = useState('');
  const [blocoTriagem, setBlocoTriagem] = useState('');
  const [moradoresDaUnidade, setMoradoresDaUnidade] = useState<any[]>([]);
  const [moradorSelecionado, setMoradorSelecionado] = useState<any | null>(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Estados para OCR Automático da Etiqueta de Encomendas (Leitura com IA)
  const [analisandoOcrEtiqueta, setAnalisandoOcrEtiqueta] = useState(false);
  const [sugestoesCodigosOcr, setSugestoesCodigosOcr] = useState<Array<{
    tipo: 'rastreio' | 'nf' | 'outro';
    label: string;
    valor: string;
    destaque?: boolean;
  }>>([]);
  const [codigoSelecionadoOcr, setCodigoSelecionadoOcr] = useState<string>('');
  const [ocrDadosDetectados, setOcrDadosDetectados] = useState<{
    destinatario?: string;
    unidade?: string;
    bloco?: string;
    transportadora?: string;
  } | null>(null);

  // Câmera Direta para Foto da Etiqueta
  const [modalCameraEtiqueta, setModalCameraEtiqueta] = useState(false);
  const [codigoDetectadoAoVivo, setCodigoDetectadoAoVivo] = useState<string>('');
  const videoCameraEtiquetaRef = useRef<HTMLVideoElement | null>(null);
  const streamCameraEtiquetaRef = useRef<MediaStream | null>(null);
  const fileInputEtiquetaRef = useRef<HTMLInputElement | null>(null);

  const [locaisArmazenamento, setLocaisArmazenamento] = useState<any[]>([]);
  const [localArmazenamentoTriagem, setLocalArmazenamentoTriagem] = useState('PRAT-A1 - Prateleira A1 - Caixas Pequenas');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState<any | null>(null);
  const [agrupandoTodosLocais, setAgrupandoTodosLocais] = useState(false);
  const [itemTriadoWhats, setItemTriadoWhats] = useState<any | null>(null);

  const [modalLeitor, setModalLeitor] = useState(false);
  const [destinoLeitor, setDestinoLeitor] = useState<'entrada' | 'triagem' | 'baixa'>('entrada');
  const [erroCamera, setErroCamera] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [buscaBaixaGeral, setBuscaBaixaGeral] = useState('');
  const [mostrarBuscaBaixa, setMostrarBuscaBaixa] = useState(false);
  const [tipoFiltroBuscaBaixa, setTipoFiltroBuscaBaixa] = useState<'todos' | 'unidade' | 'nome' | 'rastreio'>('unidade');
  const [leitorModoLote, setLeitorModoLote] = useState(true);
  const [ultimoPacoteBipado, setUltimoPacoteBipado] = useState<any | null>(null);
  const ultimoCodigoLidoRef = useRef<{ codigo: string; timestamp: number }>({ codigo: '', timestamp: 0 });
  const [abaBlocoSelecionada, setAbaBlocoSelecionada] = useState('TODOS');
  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<string[]>([]);
  const [itensCandidatosEntrega, setItensCandidatosEntrega] = useState<string[]>([]);
  const [modalFotoAmpliada, setModalFotoAmpliada] = useState<string | null>(null);
  const [modalBaixaAberta, setModalBaixaAberta] = useState(false);
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [nomeRetiranteManual, setNomeRetiranteManual] = useState('');
  const [fotoRetiranteUrl, setFotoRetiranteUrl] = useState('');
  const [assinaturaDigitalUrl, setAssinaturaDigitalUrl] = useState('');
  const [baixaConcluidaWhats, setBaixaConcluidaWhats] = useState<any | null>(null);

  // Estados para Edição e Troca Dinâmica de Local Físico
  const [modalMoverLocal, setModalMoverLocal] = useState(false);
  const [itemParaMover, setItemParaMover] = useState<any | null>(null);
  const [novoLocalSelecionado, setNovoLocalSelecionado] = useState('');
  const [moverTodosDaUnidade, setMoverTodosDaUnidade] = useState(true);
  const [moverEmLoteSelecionados, setMoverEmLoteSelecionados] = useState(false);

  // Configuração de estrutura do condomínio ativo (Casas, Torres, Blocos etc)
  const [condoConfig, setCondoConfig] = useState<CondominioConfig | null>(null);
  const condoAlvoId = loteAtivo?.condominio_id || idCondominioAtivo || condominioNovoLoteId;

  // Redirecionamento inteligente vindo da Bancada (quando o operador clica em "Baixar Encomenda")
  useEffect(() => {
    const processarRedirecionamento = (etapaAlvo?: string | null, uniAlvo?: string | null, blkAlvo?: string | null) => {
      if (etapaAlvo === '3') {
        setEtapa('3');
        setTipoFiltroBuscaBaixa('unidade');
        if (uniAlvo && uniAlvo.trim()) {
          setBuscaBaixaGeral(uniAlvo.trim());
        }
        // Para condomínios de casas ou quando não houver bloco específico, usa sempre 'TODOS'
        const blkLimpo = (blkAlvo || '').trim();
        if (!blkLimpo || blkLimpo === 'TODOS' || blkLimpo.toLowerCase() === 'casa' || blkLimpo.toLowerCase() === 'casas') {
          setAbaBlocoSelecionada('TODOS');
        } else {
          setAbaBlocoSelecionada(blkLimpo);
        }
      }
    };

    try {
      const etapaIni = sessionStorage.getItem('encomendas_etapa_inicial');
      const uni = sessionStorage.getItem('encomenda_filtro_unidade');
      const blk = sessionStorage.getItem('encomenda_filtro_bloco');

      if (etapaIni === '3') {
        processarRedirecionamento(etapaIni, uni, blk);
        sessionStorage.removeItem('encomendas_etapa_inicial');
        sessionStorage.removeItem('encomenda_filtro_unidade');
        sessionStorage.removeItem('encomenda_filtro_bloco');
      }
    } catch {}

    const handleNavegar = (e: any) => {
      if (e.detail?.etapa === '3') {
        processarRedirecionamento(e.detail.etapa, e.detail.unidade, e.detail.bloco);
      }
    };
    window.addEventListener('navegar_modulo', handleNavegar);
    return () => window.removeEventListener('navegar_modulo', handleNavegar);
  }, []);

  // Quando há busca de unidade ativa na etapa 3 e os itens estão carregados, auto-seleciona os pacotes correspondentes
  useEffect(() => {
    if (etapa === '3' && buscaBaixaGeral.trim() && todosItensRetidos.length > 0) {
      const termoB = buscaBaixaGeral.trim();
      const pacotes = todosItensRetidos
        .filter((item: any) => saoUnidadesEquivalentes(item.unidade, termoB))
        .map((item: any) => item.id);
      
      if (pacotes.length > 0) {
        const jaEstaExatamenteSelecionado = 
          itensSelecionadosIds.length === pacotes.length &&
          pacotes.every(id => itensSelecionadosIds.includes(id));

        if (!jaEstaExatamenteSelecionado) {
          // Se a seleção atual continha pacotes de outra unidade ou estava vazia, isola para a nova unidade pesquisada
          const itensAtuais = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));
          const temOutraUnidade = itensAtuais.some(i => !saoUnidadesEquivalentes(i.unidade, termoB));

          if (temOutraUnidade || itensSelecionadosIds.length === 0) {
            setItensSelecionadosIds(pacotes);
            setItensCandidatosEntrega(pacotes);
          }
        }
      }
    }
  }, [etapa, buscaBaixaGeral, todosItensRetidos]);

  useEffect(() => {
    if (condoAlvoId) {
      carregarCondominioConfig(condoAlvoId).then((cfg) => {
        setCondoConfig(cfg);
        if (isEstruturaCasas(cfg?.tipo_estrutura)) {
          setBlocoTriagem('Casa');
        }
      });
    }
  }, [condoAlvoId]);

  const eEstruturaCasas = isEstruturaCasas(condoConfig?.tipo_estrutura);
  const eEstruturaTorres = isEstruturaTorres(condoConfig?.tipo_estrutura);
  const rotuloBloco = getNomeRotuloBloco(condoConfig?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(condoConfig?.tipo_estrutura);

  const blocosDisponiveis = useMemo(() => {
    return obterListaBlocosOuTorres(condoConfig, moradores);
  }, [condoConfig, moradores]);

  useEffect(() => {
    carregarDadosBase();
  }, [etapa, idCondominioAtivo]);

  useEffect(() => {
    const handleAtualizacaoLocais = (e: any) => {
      if (e.detail?.locais && Array.isArray(e.detail.locais)) {
        setLocaisArmazenamento(e.detail.locais);
        const primeiroAtivo = e.detail.locais.find((l: any) => l.ativo);
        if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
      }
    };
    window.addEventListener('locais_armazenamento_atualizados', handleAtualizacaoLocais);
    return () => window.removeEventListener('locais_armazenamento_atualizados', handleAtualizacaoLocais);
  }, []);

  const carregarLocais = async (targetCondoId?: string) => {
    const condoIdFinal = targetCondoId || idCondominioAtivo;
    if (!condoIdFinal) {
      setLocaisArmazenamento([
        { id: '1', codigo: 'B01', nome: 'Bancada Principal', ativo: true },
        { id: '2', codigo: 'C01', nome: 'Chão / Caixas Grandes', ativo: true }
      ]);
      setLocalArmazenamentoTriagem('B01 - Bancada Principal');
      return;
    }
    try {
      const cached = localStorage.getItem(`infport_locais_${condoIdFinal}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocaisArmazenamento(parsed);
            const primeiroAtivo = parsed.find((l: any) => l.ativo);
            if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
          }
        } catch {}
      }

      const { data, error } = await supabase
        .from('locais_armazenamento')
        .select('*')
        .eq('condominio_id', condoIdFinal)
        .eq('ativo', true)
        .order('codigo');

      if (!error && data && data.length > 0) {
        setLocaisArmazenamento(data);
        const primeiroAtivo = data[0];
        setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
        return;
      }

      const { data: configData } = await supabase
        .from('configuracoes')
        .select('locais_armazenamento')
        .eq('condominio_id', condoIdFinal)
        .maybeSingle();

      if (configData?.locais_armazenamento && Array.isArray(configData.locais_armazenamento)) {
        setLocaisArmazenamento(configData.locais_armazenamento);
        const primeiroAtivo = configData.locais_armazenamento.find((l: any) => l.ativo);
        if (primeiroAtivo) setLocalArmazenamentoTriagem(`${primeiroAtivo.codigo} - ${primeiroAtivo.nome}`);
      }
    } catch (e) {
      console.warn('Erro ao carregar locais:', e);
    }
  };

  const obterOperadorPacote = (item: any) => {
    if (item.operador_id) return item.operador_id;
    if (item.operador_nome) return item.operador_nome;
    if (item.operador_cadastro) return item.operador_cadastro;
    if (item.lotes_re?.operador_id) return item.lotes_re.operador_id;
    if (item.lote_re_id) {
      const lote = todosLotesRE.find((l: any) => l.id === item.lote_re_id);
      if (lote?.operador_id) return lote.operador_id;
    }
    return usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';
  };

  const carregarDadosBase = async () => {
    setLoading(true);
    carregarLocais();
    try {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date();
      fimDia.setHours(23, 59, 59, 999);

      // Mapa auxiliar de condomínios para exibição de tags sem joins arriscados
      const mapaCondos = new Map<string, string>();
      try {
        const { data: conds } = await supabase.from('condominios').select('id, nome');
        if (conds) {
          conds.forEach((c: any) => mapaCondos.set(c.id, c.nome));
        }
      } catch (errC) {
        console.warn('Aviso ao carregar condominios:', errC);
      }

      const condId = usuarioLogado?.condominio_id;

      const { data: entData } = await supabase
        .from('entregadores')
        .select('*')
        .eq('condominio_id', condId)
        .order('nome');
      setEntregadores(entData || []);

      const { data: lotesData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa, documento)')
        .eq('condominio_id', condId)
        .in('status', ['aguardando_triagem', 'em_triagem'])
        .order('created_at', { ascending: false });
      setLotesPendentes(lotesData || []);

      // Carrega histórico completo de REs (Recebimento de Entregas) para a 1ª Etapa
      const { data: todosLData } = await supabase
        .from('lotes_re')
        .select('*, entregadores(nome, empresa, documento)')
        .eq('condominio_id', condId)
        .order('created_at', { ascending: false })
        .limit(100);
      setTodosLotesRE(todosLData || []);

      const { data: moradData } = await supabase
        .from('moradores')
        .select('*')
        .eq('condominio_id', condId)
        .order('nome');
      setMoradores(moradData || []);

      let { data: retidosData, error: errRetidos } = await supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone), lotes_re(operador_id, codigo_re)')
        .eq('condominio_id', condId)
        .eq('status', 'retido')
        .order('created_at', { ascending: false });

      if (errRetidos || !retidosData) {
        const { data: fallbackRetidos } = await supabase
          .from('encomendas_itens')
          .select('*, moradores(nome, telefone)')
          .eq('condominio_id', condId)
          .eq('status', 'retido')
          .order('created_at', { ascending: false });
        retidosData = fallbackRetidos;
      }
      setTodosItensRetidos(retidosData || []);

      const { data: lotesHojeData } = await supabase
        .from('lotes_re')
        .select('id, qtd_declarada, qtd_triada')
        .eq('condominio_id', condId)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      const { data: triadosHojeData } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .gte('created_at', inicioDia.toISOString())
        .lte('created_at', fimDia.toISOString());

      const { data: entreguesHojeData } = await supabase
        .from('encomendas_itens')
        .select('id')
        .eq('condominio_id', condId)
        .eq('status', 'entregue')
        .gte('data_retirada', inicioDia.toISOString())
        .lte('data_retirada', fimDia.toISOString());

      const totalLotesHoje = lotesHojeData?.length || 0;
      const totalTriadasHoje = triadosHojeData?.length || 0;
      const totalEntreguesHoje = entreguesHojeData?.length || 0;
      const totalAguardando = (lotesData || []).reduce((acc: number, l: any) => acc + (l.qtd_declarada - l.qtd_triada), 0);

      const mapaBlocos: Record<string, number> = {};
      (retidosData || []).forEach((item: any) => {
        const b = String(item.bloco || '').trim();
        let blk = 'Geral / Sem Bloco';
        if (eEstruturaCasas || b.toLowerCase() === 'casa') {
          blk = 'Casas';
        } else if (b) {
          blk = b.toLowerCase().startsWith('torre') || b.toLowerCase().startsWith('bloco')
            ? b
            : eEstruturaTorres ? `Torre ${b}` : `Bloco ${b}`;
        }
        mapaBlocos[blk] = (mapaBlocos[blk] || 0) + 1;
      });

      setStatsDia({
        lotesHoje: totalLotesHoje,
        triadasHoje: totalTriadasHoje,
        aguardandoTriagem: totalAguardando,
        entreguesHoje: totalEntreguesHoje,
        retidosPorBloco: mapaBlocos
      });

    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const carregarDossie = async () => {
    setLoadingDossie(true);
    const idCondo = isGlobal ? '' : idCondominioAtivo;
    try {
      // 1. Tenta carregar os itens de encomendas com moradores
      let query = supabase
        .from('encomendas_itens')
        .select('*, moradores(nome, telefone, bloco, unidade)')
        .order('created_at', { ascending: false })
        .limit(300);

      if (idCondo) {
        query = query.eq('condominio_id', idCondo);
      }

      let { data: itens, error } = await query;

      // Fallback seguro se o join com moradores falhar por qualquer motivo
      if (error || !itens) {
        console.warn('Fallback simples para encomendas_itens no dossiê:', error?.message);
        let fallbackQuery = supabase
          .from('encomendas_itens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(300);
        if (idCondo) fallbackQuery = fallbackQuery.eq('condominio_id', idCondo);
        const fbRes = await fallbackQuery;
        itens = fbRes.data || [];
      }

      if (itens && itens.length > 0) {
        // Enriquecer itens com dados de Lote RE e entregadores de forma segura
        const loteIds = Array.from(new Set(itens.map((it: any) => it.lote_re_id).filter(Boolean)));
        if (loteIds.length > 0) {
          try {
            const { data: lotes } = await supabase
              .from('lotes_re')
              .select('id, codigo_re, created_at, entregador_id')
              .in('id', loteIds);

            if (lotes && lotes.length > 0) {
              const mapaLotes = new Map(lotes.map((l: any) => [l.id, l]));
              itens = itens.map((it: any) => ({
                ...it,
                lotes_re: it.lote_re_id ? mapaLotes.get(it.lote_re_id) : null
              }));
            }
          } catch (errLote) {
            console.warn('Aviso ao consultar lotes_re:', errLote);
          }
        }
        setItensDossie(itens);
      } else {
        setItensDossie([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar dossiê:', e);
      setItensDossie([]);
    } finally {
      setLoadingDossie(false);
    }
  };

  useEffect(() => {
    if (etapa === '4') {
      carregarDossie();
    }
  }, [etapa]);

  const tocarAlertaSonoro = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.log('Audio indisponível', e);
    }
  };

  const tocarBipSucesso = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio indisponível', e);
    }
  };

  const uploadFotoStorage = async (file: File | null, pastaDestino: string, setUrlCallback: (url: string) => void) => {
    if (!file) return;
    setUploadingFoto(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { publicUrl, tamanhoOriginalKb, tamanhoComprimidoKb, taxaReducaoPct } = await uploadFotoComprimidaStorage({
        file,
        pasta: pastaDestino,
        maxWidth: 1000,
        maxHeight: 1000,
        qualidade: 0.75
      });

      setUrlCallback(publicUrl);
      const detalheEconomia = taxaReducaoPct > 0 ? ` (otimizada: ${tamanhoOriginalKb}KB ➔ ${tamanhoComprimidoKb}KB, -${taxaReducaoPct}%)` : '';
      setMensagem({ tipo: 'sucesso', texto: `Foto capturada e salva com sucesso!${detalheEconomia}` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Falha ao salvar foto: ' + err.message });
    } finally {
      setUploadingFoto(false);
    }
  };

  /**
   * Processamento de OCR Ultra-Rápido (< 5 segundos) em Etiquetas de Encomenda (IA Gemini)
   * Extrai com precisão códigos de rastreamento (Correios, Mercado Livre, Shopee, Amazon),
   * e número da Nota Fiscal (NF).
   * NÃO extrai chaves de 44 dígitos da DANFE.
   * Lista no MÁXIMO 3 códigos com a NF inclusa.
   */
  const processarOcrEtiqueta = async (file: File | null) => {
    if (!file) return;
    setAnalisandoOcrEtiqueta(true);
    setSugestoesCodigosOcr([]);
    setCodigoSelecionadoOcr('');
    setOcrDadosDetectados(null);

    try {
      // 1. Otimização extrema: redimensiona e comprime instantaneamente (~40KB)
      const base64 = await comprimirImagemBase64(file, 800, 800, 0.72);
      
      // 2. Timeout estrito de 4.8s para NUNCA ultrapassar 5 segundos
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 4800);

      const resp = await fetch('/api/ocr-etiqueta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagemBase64: base64 }),
        signal: controller.signal
      });

      clearTimeout(timeoutTimer);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        console.warn('[OCR Etiqueta] Resposta do servidor:', errJson);
        return;
      }

      const dados = await resp.json();
      let listaSugestoes: Array<{
        tipo: 'rastreio' | 'nf' | 'outro';
        label: string;
        valor: string;
        destaque?: boolean;
      }> = Array.isArray(dados.sugestoes) ? dados.sugestoes : [];

      // 3. Regra estrita: REMOVER qualquer chave longa de DANFE (44 dígitos)
      listaSugestoes = listaSugestoes.filter(s => s.valor.replace(/\D/g, '').length < 35);

      // 4. Regra estrita: No MÁXIMO 3 códigos, com NF inclusa
      listaSugestoes = listaSugestoes.slice(0, 3);

      if (listaSugestoes.length > 0) {
        setSugestoesCodigosOcr(listaSugestoes);
        setOcrDadosDetectados({
          destinatario: dados.destinatario || '',
          unidade: dados.unidade || '',
          bloco: dados.bloco || '',
          transportadora: dados.transportadora || ''
        });

        // Seleciona e preenche automaticamente o primeiro código (ex: Rastreio ou NF)
        const principal = listaSugestoes[0];
        setCodigoSelecionadoOcr(principal.valor);
        setCodigoBarras(principal.valor);

        // Se encontrou a unidade ou morador na etiqueta e o campo ainda estiver em branco, auxilia o operador
        if (dados.unidade && !unidadeTriagem.trim()) {
          handleDigitarUnidadeTriagem(dados.unidade);
        }

        tocarAlertaSonoro();
        setMensagem({
          tipo: 'sucesso',
          texto: `⚡ OCR Ultra-Rápido: ${listaSugestoes.length} código(s) encontrado(s) (máx. 3). Código preenchido automaticamente!`
        });
      } else {
        setMensagem({
          tipo: 'info',
          texto: 'Foto capturada. Nenhum código de rastreio ou NF legível encontrado automaticamente. Você pode digitar ou escanear.'
        });
      }
    } catch (err: any) {
      console.warn('[OCR Etiqueta] OCR finalizado ou tempo limite atingido:', err);
    } finally {
      setAnalisandoOcrEtiqueta(false);
    }
  };

  /**
   * Abre a câmera diretamente para tirar foto da etiqueta
   */
  const abrirCameraFotoEtiqueta = async () => {
    setCodigoDetectadoAoVivo('');
    setErroCamera('');

    // Garante sempre o formulário de entrada aberto para o operador
    setModalEntradaAberta(true);

    // Se o dispositivo ou navegador não suportar getUserMedia, mantém o formulário aberto com fallback
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('[Câmera Etiqueta] mediaDevices não suportado neste navegador. Abrindo formulário de entrada.');
      setMensagem({
        tipo: 'info',
        texto: 'Formulário aberto! Navegador sem suporte a transmissão direta. Utilize a Câmera Nativa do aparelho.'
      });
      return;
    }

    try {
      setModalCameraEtiqueta(true);

      // Limpa stream anterior se ainda estiver aberto
      if (streamCameraEtiquetaRef.current) {
        streamCameraEtiquetaRef.current.getTracks().forEach(t => t.stop());
        streamCameraEtiquetaRef.current = null;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (eEnv) {
        console.warn('Tentativa com câmera traseira falhou, alternando para câmera disponível:', eEnv);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      streamCameraEtiquetaRef.current = stream;

      if (videoCameraEtiquetaRef.current) {
        videoCameraEtiquetaRef.current.srcObject = stream;
        videoCameraEtiquetaRef.current.setAttribute('playsinline', 'true');
        videoCameraEtiquetaRef.current.play().catch(e => console.warn('Erro ao reproduzir vídeo:', e));
      }
    } catch (err: any) {
      console.warn('[Câmera Etiqueta] Erro ao abrir stream ao vivo:', err);
      fecharCameraFotoEtiqueta();
      // O formulário de entrada já fica aberto para preenchimento imediato!
      setModalEntradaAberta(true);
      setMensagem({
        tipo: 'info',
        texto: 'Formulário aberto para preenchimento! Para anexar a etiqueta, toque em "Câmera Nativa" ou selecione a foto.'
      });
      if (fileInputEtiquetaRef.current) {
        try {
          fileInputEtiquetaRef.current.click();
        } catch {}
      }
    }
  };

  const fecharCameraFotoEtiqueta = () => {
    if (streamCameraEtiquetaRef.current) {
      streamCameraEtiquetaRef.current.getTracks().forEach(t => t.stop());
      streamCameraEtiquetaRef.current = null;
    }
    if (videoCameraEtiquetaRef.current && videoCameraEtiquetaRef.current.srcObject) {
      const stream = videoCameraEtiquetaRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoCameraEtiquetaRef.current.srcObject = null;
    }
    setModalCameraEtiqueta(false);
  };

  // Garante que o stream seja anexado ao elemento de vídeo assim que o modal for montado no DOM
  useEffect(() => {
    if (modalCameraEtiqueta && streamCameraEtiquetaRef.current && videoCameraEtiquetaRef.current) {
      if (videoCameraEtiquetaRef.current.srcObject !== streamCameraEtiquetaRef.current) {
        videoCameraEtiquetaRef.current.srcObject = streamCameraEtiquetaRef.current;
        videoCameraEtiquetaRef.current.setAttribute('playsinline', 'true');
        videoCameraEtiquetaRef.current.play().catch(e => console.warn('Erro ao reproduzir vídeo:', e));
      }
    }
  }, [modalCameraEtiqueta]);

  /**
   * Disparado ao pressionar o botão flutuante de Nova Entrada (+)
   * Abre o formulário de entrada E ativa a câmera simultaneamente.
   */
  const iniciarEntradaComCamera = () => {
    // 1. Limpa qualquer seleção pendente de pacotes para evitar conflitos de interface
    setItensSelecionadosIds([]);
    setItensCandidatosEntrega([]);

    // 2. Prepara estados limpos para a nova entrada
    setFotoEtiquetaUrl('');
    setCodigoBarras('');
    setCodigoDetectadoAoVivo('');
    setSugestoesCodigosOcr([]);
    setCodigoSelecionadoOcr('');
    setOcrDadosDetectados(null);
    setItemTriadoWhats(null);

    // 3. Abre o formulário de entrada E ativa a câmera
    setModalEntradaAberta(true);
    abrirCameraFotoEtiqueta();
  };

  /**
   * Leitor de código em tempo real enquanto o operador posiciona a câmera para foto
   */
  useEffect(() => {
    let intervalId: any = null;
    let cancelado = false;

    if (modalCameraEtiqueta) {
      intervalId = setInterval(async () => {
        if (cancelado) return;
        const video = videoCameraEtiquetaRef.current;
        if (!video || video.readyState !== 4) return;

        if ('BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['code_128', 'ean_13', 'qr_code', 'itf', 'code_39', 'upc_a', 'ean_8']
            });
            const barcodes = await detector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const valorLido = (barcodes[0].rawValue || '').trim();
              // Não aceitar chave DANFE de 44 dígitos
              if (valorLido && valorLido.replace(/\D/g, '').length < 35) {
                setCodigoBarras((prev) => {
                  if (prev !== valorLido) {
                    setCodigoDetectadoAoVivo(valorLido);
                    tocarBipSucesso();
                    return valorLido;
                  }
                  return prev;
                });
              }
            }
          } catch (e) {
            // Continua em silêncio se algum frame não for decodificado
          }
        }
      }, 200);
    }

    return () => {
      cancelado = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [modalCameraEtiqueta]);

  const capturarFotoDaCameraAoVivo = () => {
    if (!videoCameraEtiquetaRef.current) return;
    const video = videoCameraEtiquetaRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `etiqueta_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Cria preview local imediato da foto tirada (0ms de espera)
      const previewUrl = URL.createObjectURL(blob);
      setFotoEtiquetaUrl(previewUrl);

      // Fecha a câmera de captura ao vivo
      fecharCameraFotoEtiqueta();

      // Abre imediatamente o menu de entrada de encomenda já com a foto e o código de rastreio preenchidos
      setModalEntradaAberta(true);

      // Inicia upload seguro para o storage e o OCR ultra-rápido (< 5s) em segundo plano
      uploadFotoStorage(file, 'etiquetas', (urlFinal) => {
        setFotoEtiquetaUrl(urlFinal);
      });
      processarOcrEtiqueta(file);
    }, 'image/jpeg', 0.85);
  };

  const abrirLeitorCamera = async (destino: 'entrada' | 'triagem' | 'baixa' = 'entrada') => {
    setDestinoLeitor(destino);
    setUltimoPacoteBipado(null);
    ultimoCodigoLidoRef.current = { codigo: '', timestamp: 0 };
    setModalLeitor(true);
    setErroCamera('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setErroCamera('Não foi possível acessar a câmera: ' + err.message);
    }
  };

  const fecharLeitorCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setModalLeitor(false);
  };

  useEffect(() => {
    let intervalId: any = null;
    if (modalLeitor) {
      intervalId = setInterval(async () => {
        if ('BarcodeDetector' in window && videoRef.current && videoRef.current.readyState === 4) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf']
            });
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const valorLido = (barcodes[0].rawValue || '').trim();
              if (!valorLido) return;

              const agora = Date.now();
              // Evita bip duplicado consecutivo do mesmo código em menos de 1.8 segundos
              if (ultimoCodigoLidoRef.current.codigo === valorLido && (agora - ultimoCodigoLidoRef.current.timestamp) < 1800) {
                return;
              }
              ultimoCodigoLidoRef.current = { codigo: valorLido, timestamp: agora };

              if (destinoLeitor === 'entrada' || destinoLeitor === 'triagem') {
                tocarBipSucesso();
                fecharLeitorCamera();
                setCodigoBarras(valorLido);
                setMensagem({ tipo: 'sucesso', texto: `Código de rastreio lido: ${valorLido}` });
              } else {
                // Destino: BAIXA / SAÍDA — Escaneamento contínuo em lote com auto-seleção
                const pacoteEncontrado = todosItensRetidos.find(i => 
                  (i.codigo_barras || '').trim().toLowerCase() === valorLido.toLowerCase()
                );

                if (pacoteEncontrado) {
                  tocarBipSucesso();
                  const primeiroItem = todosItensRetidos.find(i => itensSelecionadosIds.includes(i.id));
                  const labelUnid = formatarIdentificacaoUnidade(pacoteEncontrado.unidade, pacoteEncontrado.bloco, condoConfig?.tipo_estrutura);

                  if (primeiroItem && !saoUnidadesEquivalentes(primeiroItem.unidade, pacoteEncontrado.unidade)) {
                    // Unidade diferente: isola o checklist para a nova unidade
                    setItensSelecionadosIds([pacoteEncontrado.id]);
                    setItensCandidatosEntrega([pacoteEncontrado.id]);
                    setUltimoPacoteBipado(pacoteEncontrado);
                    const labelAntiga = formatarIdentificacaoUnidade(primeiroItem.unidade, primeiroItem.bloco, condoConfig?.tipo_estrutura);
                    setMensagem({
                      tipo: 'alerta',
                      texto: `⚠️ Seleção alterada para ${labelUnid} (pacotes de ${labelAntiga} desmarcados para não misturar no checklist).`
                    });
                  } else {
                    setItensSelecionadosIds(prev => prev.includes(pacoteEncontrado.id) ? prev : [...prev, pacoteEncontrado.id]);
                    setItensCandidatosEntrega(prev => prev.includes(pacoteEncontrado.id) ? prev : [...prev, pacoteEncontrado.id]);
                    setUltimoPacoteBipado(pacoteEncontrado);
                    setMensagem({
                      tipo: 'sucesso',
                      texto: `✅ Pacote ${pacoteEncontrado.codigo_barras || valorLido} (${labelUnid}) adicionado ao lote!`
                    });
                  }

                  // Se NÃO estiver em modo lote, fecha a câmera; se estiver em modo lote, continua aberto para escanear mais pacotes!
                  if (!leitorModoLote) {
                    fecharLeitorCamera();
                    setBuscaBaixaGeral(valorLido);
                  }
                } else {
                  setMensagem({
                    tipo: 'erro',
                    texto: `⚠️ Código "${valorLido}" lido, mas não corresponde a nenhum pacote retido pendente.`
                  });
                  if (!leitorModoLote) {
                    fecharLeitorCamera();
                    setBuscaBaixaGeral(valorLido);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Erro ao ler código:', e);
          }
        }
      }, 400);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [modalLeitor, destinoLeitor, leitorModoLote, todosItensRetidos, condoConfig]);

  const entregadoresFiltrados = entregadores.filter(ent => {
    const termo = buscaEntregador.toLowerCase();
    const nome = ent.nome?.toLowerCase() || '';
    const empresa = ent.empresa?.toLowerCase() || '';
    const doc = ent.documento?.toLowerCase() || '';
    return nome.includes(termo) || empresa.includes(termo) || doc.includes(termo);
  });

  const cadastrarEntregadorRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeCadastrarEntregador) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem cadastrar entregadores.' });
      return;
    }
    if (!novoEntNome.trim()) return;
    setLoading(true);
    try {
      const targetCondo = (isGlobal ? condominioNovoLoteId : idCondominioAtivo) || (listaCondominios[0]?.id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851');
      const { data, error } = await supabase
        .from('entregadores')
        .insert([{
          condominio_id: targetCondo,
          nome: novoEntNome.trim(),
          documento: novoEntDoc.trim(),
          empresa: novoEntEmpresa.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      setEntregadores([...entregadores, data]);
      setEntregadorSelecionado(data);
      setModalNovoEntregador(false);
      setNovoEntNome(''); setNovoEntDoc(''); setNovoEntEmpresa('');
      setMensagem({ tipo: 'sucesso', texto: 'Entregador cadastrado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criarLoteRE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeCriarLote) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Seu usuário não tem permissão para Adicionar Lotes de RE.' });
      return;
    }
    if (!entregadorSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um entregador da lista.' });
      return;
    }
    setLoading(true);

    try {
      // 1. Resolução segura do ID do Condomínio (nunca permitir 'global' ou string vazia)
      let targetCondo = (isGlobal && condominioNovoLoteId ? condominioNovoLoteId : (idCondominioAtivo !== 'global' ? idCondominioAtivo : ''));
      if (!targetCondo || targetCondo === 'global') {
        const condoValido = listaCondominios.find((c: any) => c.id && c.id !== 'global');
        if (condoValido?.id) {
          targetCondo = condoValido.id;
        }
      }

      if (!targetCondo || targetCondo === 'global') {
        const { data: dbCondo } = await supabase.from('condominios').select('id').limit(1).maybeSingle();
        if (dbCondo?.id) {
          targetCondo = dbCondo.id;
        }
      }

      if (!targetCondo || targetCondo === 'global') {
        setMensagem({ tipo: 'erro', texto: 'Por favor, selecione um condomínio válido para criar o Lote de Recebimento.' });
        setLoading(false);
        return;
      }

      const hoje = new Date();
      const diaStr = String(hoje.getDate()).padStart(2, '0');
      const mesStr = String(hoje.getMonth() + 1).padStart(2, '0');
      const anoStr = String(hoje.getFullYear()).slice(-2);
      const prefixoHoje = `RE${diaStr}/${mesStr}/${anoStr}N`;

      // 1. Descobre a maior sequência existente hoje no banco para evitar colisão de unique key
      let maiorSeq = 0;
      try {
        const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0, 0);
        const { data: lotesHoje } = await supabase
          .from('lotes_re')
          .select('codigo_re, created_at')
          .or(`codigo_re.ilike.%${diaStr}/${mesStr}/${anoStr}%,created_at.gte.${inicioDoDia.toISOString()}`)
          .limit(200);

        if (lotesHoje && lotesHoje.length > 0) {
          lotesHoje.forEach((l: any) => {
            const cod = String(l.codigo_re || '');
            const match = cod.match(/N(\d+)/i) || cod.match(/-(\d+)$/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (!isNaN(num) && num > maiorSeq) {
                maiorSeq = num;
              }
            }
          });
        }
      } catch (errSeq) {
        console.warn('Aviso ao consultar maior sequência RE do dia:', errSeq);
      }

      let sequenciaHoje = Math.max(maiorSeq + 1, 1);
      let data: any = null;
      let codigoRE = '';
      let tentativas = 0;
      const maxTentativas = 15;

      // 2. Loop de inserção com resolução e incremento automático contra qualquer variação de duplicate key
      while (!data && tentativas < maxTentativas) {
        tentativas++;
        const seqFormatada = String(sequenciaHoje).padStart(3, '0');
        codigoRE = `${prefixoHoje}${seqFormatada}`;

        const payload: any = {
          codigo_re: codigoRE,
          condominio_id: targetCondo,
          entregador_id: entregadorSelecionado.id,
          qtd_declarada: parseInt(String(qtdDeclarada)) || 1,
          qtd_triada: 0,
          status: 'aguardando_triagem',
          operador_id: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
        };

        const res = await supabase
          .from('lotes_re')
          .insert([payload])
          .select('*')
          .single();

        if (!res.error && res.data) {
          data = res.data;
          break;
        }

        const msgErro = (res.error?.message || '').toLowerCase();
        const codigoErro = (res.error as any)?.code;
        const ehDuplicata = codigoErro === '23505' ||
                            msgErro.includes('unique') ||
                            msgErro.includes('duplicate') ||
                            msgErro.includes('duplicad') ||
                            msgErro.includes('unicidad') ||
                            msgErro.includes('already exists') ||
                            msgErro.includes('já existe') ||
                            msgErro.includes('lotes_re_codigo_re');

        if (ehDuplicata) {
          console.warn(`[Lotes RE] Código ${codigoRE} colidiu com registro existente no banco. Incrementando para sequência ${sequenciaHoje + 1}...`);
          sequenciaHoje++;
          continue;
        }

        // Se o erro foi restrição de FK de entregador_id
        if (msgErro.includes('entregador_id') || msgErro.includes('foreign key') || msgErro.includes('chave estrangeira')) {
          console.warn('[Lotes RE] Tentando sem vínculo estrito de entregador_id...');
          const fbPayload = { ...payload, entregador_id: null };
          const resFb = await supabase.from('lotes_re').insert([fbPayload]).select('*').single();
          if (!resFb.error && resFb.data) {
            data = resFb.data;
            break;
          }
          const msgFb = (resFb.error?.message || '').toLowerCase();
          if ((resFb.error as any)?.code === '23505' || msgFb.includes('unique') || msgFb.includes('duplicate') || msgFb.includes('unicidad')) {
            sequenciaHoje++;
            continue;
          }
        }

        // Se persistir outro erro não recuperável
        throw res.error;
      }

      // 3. Fallback garantido de unicidade caso haja concorrência extrema
      if (!data) {
        const sufixoAleatorio = Math.floor(100 + Math.random() * 900);
        const codigoEmergencia = `${prefixoHoje}${String(sequenciaHoje).padStart(3, '0')}-${sufixoAleatorio}`;
        codigoRE = codigoEmergencia;
        const payloadEmergencia = {
          codigo_re: codigoEmergencia,
          condominio_id: targetCondo,
          entregador_id: null,
          qtd_declarada: parseInt(String(qtdDeclarada)) || 1,
          qtd_triada: 0,
          status: 'aguardando_triagem',
          operador_id: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'
        };
        const resEmergencia = await supabase.from('lotes_re').insert([payloadEmergencia]).select('*').single();
        if (resEmergencia.data) {
          data = resEmergencia.data;
        } else {
          data = {
            id: crypto.randomUUID(),
            ...payloadEmergencia,
            created_at: new Date().toISOString()
          };
        }
      }

      const loteCompleto = {
        ...data,
        entregadores: entregadorSelecionado
      };

      const qtdDeclaradaFinal = loteCompleto.qtd_declarada || parseInt(String(qtdDeclarada)) || 1;

      await registrarAtividade({
        modulo: 'Encomendas',
        acao: 'CRIAR',
        descricao: `Gerou lote de recebimento ${codigoRE} (${entregadorSelecionado.empresa || 'Entregador'}: ${entregadorSelecionado.nome}) - ${qtdDeclaradaFinal} volumes declarados.`,
        detalhes: { codigo_re: codigoRE, qtd_declarada: qtdDeclaradaFinal, entregador: entregadorSelecionado.nome },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        condominio_id: targetCondo
      });

      const textoWhats = `📦 *NOVO LOTE DE ENCOMENDAS RECEBIDO (RE)*\nLote: ${codigoRE}\nTransportadora: ${entregadorSelecionado.empresa || 'N/A'}\nEntregador: ${entregadorSelecionado.nome} (Doc: ${entregadorSelecionado.documento || 'N/A'})\nTotal de Volumes Declarados: ${qtdDeclaradaFinal} pacotes\nOperador: ${usuarioLogado?.nome || usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setLoteCriadoWhats({ codigo: codigoRE, link: `https://wa.me/?text=${encodeURIComponent(textoWhats)}` });
      setEntregadorSelecionado(null);
      setBuscaEntregador('');
      setQtdDeclarada(1);
      setLoteAtivo(loteCompleto);
      if (loteCompleto?.condominio_id) {
        carregarLocais(loteCompleto.condominio_id);
      }
      await carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: `Lote ${codigoRE} gerado com sucesso!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao gerar lote: ' + (err.message || 'Falha de comunicação') });
    } finally {
      setLoading(false);
    }
  };

  // Funções de Edição e Exclusão no Histórico de REs (Blindadas por RBAC)
  const abrirEdicaoLote = (lote: any) => {
    if (!podeEditarLotes) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem editar lotes de RE.' });
      return;
    }
    setLoteEmEdicao(lote);
    setEditQtdDeclarada(lote.qtd_declarada || 1);
    setEditEntregadorId(lote.entregador_id || '');
  };

  const salvarEdicaoLoteRE = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditarLotes) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem editar lotes de RE.' });
      return;
    }
    if (!loteEmEdicao) return;
    setLoading(true);

    try {
      const novaQtd = parseInt(String(editQtdDeclarada)) || 1;
      const { error } = await supabase
        .from('lotes_re')
        .update({
          qtd_declarada: novaQtd,
          entregador_id: editEntregadorId || loteEmEdicao.entregador_id
        })
        .eq('id', loteEmEdicao.id);

      if (error) throw error;

      await registrarAtividade({
        modulo: 'Encomendas',
        acao: 'EDITAR',
        descricao: `Editou lote ${loteEmEdicao.codigo_re}: Volumes alterados de ${loteEmEdicao.qtd_declarada} para ${novaQtd}.`,
        detalhes: { lote_id: loteEmEdicao.id, codigo_re: loteEmEdicao.codigo_re, nova_qtd: novaQtd },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        condominio_id: loteEmEdicao.condominio_id
      });

      setMensagem({ tipo: 'sucesso', texto: `Lote ${loteEmEdicao.codigo_re} atualizado com sucesso!` });
      setLoteEmEdicao(null);
      await carregarDadosBase();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar lote: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarExcluirLote = (lote: any) => {
    if (!podeExcluirLotes) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem excluir lotes de RE.' });
      return;
    }
    setLoteParaExcluir(lote);
  };

  const executarExclusaoLoteRE = async () => {
    if (!podeExcluirLotes || !loteParaExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Operação de exclusão de lote não autorizada.' });
      return;
    }
    setLoading(true);

    try {
      // Exclui o lote do banco
      const { error } = await supabase
        .from('lotes_re')
        .delete()
        .eq('id', loteParaExcluir.id);

      if (error) throw error;

      await registrarAtividade({
        modulo: 'Encomendas',
        acao: 'EXCLUIR',
        descricao: `Excluiu lote de RE ${loteParaExcluir.codigo_re} (${loteParaExcluir.entregadores?.nome || 'Entregador'}).`,
        detalhes: { lote_id: loteParaExcluir.id, codigo_re: loteParaExcluir.codigo_re },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        condominio_id: loteParaExcluir.condominio_id
      });

      setMensagem({ tipo: 'sucesso', texto: `Lote ${loteParaExcluir.codigo_re} excluído com sucesso!` });
      setLoteParaExcluir(null);
      if (loteAtivo?.id === loteParaExcluir.id) {
        setLoteAtivo(null);
      }
      await carregarDadosBase();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir lote: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Funções de Edição e Exclusão nos Cards de Pacotes Retidos (Blindadas por RBAC)
  const abrirEdicaoPacote = (item: any) => {
    if (!podeEditarPacote) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem editar pacotes retidos.' });
      return;
    }
    setPacoteEmEdicao(item);
    setEditPacoteUnidade(item.unidade || '');
    setEditPacoteBloco(item.bloco || (eEstruturaCasas ? 'Casa' : ''));
    setEditPacoteMoradorId(item.morador_id || '');
    setEditPacoteCodigo(item.codigo_barras || '');
    setEditPacoteLocal(item.local_armazenamento || 'Bancada Principal');
    setEditPacoteObs(item.observacoes || '');
  };

  const salvarEdicaoPacote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditarPacote || !pacoteEmEdicao) return;
    setLoading(true);

    try {
      const payload: any = {
        unidade: autoCorrigirZeroEsquerda(editPacoteUnidade.trim()),
        bloco: eEstruturaCasas ? 'Casa' : editPacoteBloco.trim(),
        morador_id: editPacoteMoradorId || null,
        codigo_barras: editPacoteCodigo.trim(),
        local_armazenamento: editPacoteLocal.trim(),
        observacoes: editPacoteObs.trim()
      };

      const { error } = await supabase
        .from('encomendas_itens')
        .update(payload)
        .eq('id', pacoteEmEdicao.id);

      if (error) throw error;

      await registrarAtividade({
        modulo: 'Encomendas',
        acao: 'EDITAR',
        descricao: `Editou pacote retido ${pacoteEmEdicao.codigo_barras || pacoteEmEdicao.id}: Unidade ${editPacoteUnidade} (${editPacoteBloco}).`,
        detalhes: { pacoteId: pacoteEmEdicao.id, alteracoes: payload },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        condominio_id: pacoteEmEdicao.condominio_id
      });

      setMensagem({ tipo: 'sucesso', texto: 'Pacote retido atualizado com sucesso!' });
      setPacoteEmEdicao(null);
      await carregarDadosBase();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao editar pacote: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmarExcluirPacote = (item: any) => {
    if (!podeExcluirPacote) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) podem excluir pacotes retidos.' });
      return;
    }
    setPacoteParaExcluir(item);
  };

  const executarExclusaoPacote = async () => {
    if (!podeExcluirPacote || !pacoteParaExcluir) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Operação de exclusão de pacote não autorizada.' });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('encomendas_itens')
        .delete()
        .eq('id', pacoteParaExcluir.id);

      if (error) throw error;

      if (pacoteParaExcluir.lote_re_id) {
        try {
          const { data: loteObj } = await supabase
            .from('lotes_re')
            .select('id, qtd_triada')
            .eq('id', pacoteParaExcluir.lote_re_id)
            .maybeSingle();

          if (loteObj && loteObj.qtd_triada > 0) {
            await supabase
              .from('lotes_re')
              .update({ qtd_triada: Math.max(0, loteObj.qtd_triada - 1), status: 'em_triagem' })
              .eq('id', pacoteParaExcluir.lote_re_id);
          }
        } catch (errLote) {
          console.warn('Erro ao atualizar contador de lote na exclusão de pacote:', errLote);
        }
      }

      await registrarAtividade({
        modulo: 'Encomendas',
        acao: 'EXCLUIR',
        descricao: `Excluiu pacote retido da unidade ${pacoteParaExcluir.unidade} (Cód: ${pacoteParaExcluir.codigo_barras || 'S/ Rastreio'}).`,
        detalhes: { pacoteId: pacoteParaExcluir.id, unidade: pacoteParaExcluir.unidade, codigo: pacoteParaExcluir.codigo_barras },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login || 'Portaria',
        condominio_id: pacoteParaExcluir.condominio_id
      });

      setMensagem({ tipo: 'sucesso', texto: 'Pacote excluído com sucesso!' });
      setPacoteParaExcluir(null);
      await carregarDadosBase();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir pacote: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const buscarMoradoresEChecarAgrupamento = async (unid: string, bloc: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : bloc;
    setUnidadeTriagem(unid);
    setBlocoTriagem(blocoEfetivo);

    if (!unid.trim()) {
      setMoradoresDaUnidade([]);
      setMoradorSelecionado(null);
      setAlertaAgrupamento(null);
      return;
    }

    const moradoresEncontrados = moradores.filter(m => {
      const uMatch = saoUnidadesEquivalentes(m.unidade, unid);
      const bMatch = eEstruturaCasas 
        ? true 
        : blocoEfetivo.trim() 
        ? (m.bloco || '').toString().toLowerCase() === blocoEfetivo.trim().toLowerCase() 
        : true;
      return uMatch && bMatch;
    });
    setMoradoresDaUnidade(moradoresEncontrados);

    if (moradoresEncontrados.length > 0) {
      setMoradorSelecionado(moradoresEncontrados[0]);
    } else {
      setMoradorSelecionado(null);
    }

    // Busca itens retidos da mesma unidade na lista local com suporte a zeros à esquerda
    const itensMesmaUnidade = todosItensRetidos.filter((item: any) => {
      const uMatch = saoUnidadesEquivalentes(item.unidade, unid);
      const bMatch = eEstruturaCasas 
        ? true 
        : blocoEfetivo.trim() 
        ? (item.bloco || '').toString().toLowerCase() === blocoEfetivo.trim().toLowerCase() 
        : true;
      return uMatch && bMatch;
    });

    if (itensMesmaUnidade.length > 0) {
      tocarAlertaSonoro();
      const locaisExistentes = Array.from(
        new Set(
          itensMesmaUnidade
            .map((i: any) => i.local_armazenamento)
            .filter((loc: any) => typeof loc === 'string' && loc.trim().length > 0)
        )
      );

      setAlertaAgrupamento({
        qtd: itensMesmaUnidade.length,
        unidade: unid,
        bloco: blocoEfetivo,
        locais: locaisExistentes.length > 0 ? locaisExistentes : ['Bancada Principal'],
        itens: itensMesmaUnidade
      });
    } else {
      setAlertaAgrupamento(null);
    }
  };

  /**
   * Trata a digitação da unidade na triagem sem forçar zero enquanto o operador digita.
   * Se o valor contiver zero espúrio em número maior que 9 (ex: se tinha '05' e digitou '7' -> vira '57'),
   * remove imediatamente o zero espúrio para evitar '057'.
   * O zero à esquerda só é padronizado (01 a 09) ao sair do campo (onBlur) ou ao salvar.
   */
  const handleDigitarUnidadeTriagem = (valor: string) => {
    const blocoEfetivo = eEstruturaCasas ? 'Casa' : blocoTriagem;

    if (timerCorrecaoUnidadeRef.current) {
      clearTimeout(timerCorrecaoUnidadeRef.current);
    }

    // Se o operador digitou número maior que 9 com zero à esquerda (ex: '057' ou '0117'),
    // remove imediatamente o zero espúrio!
    let valorHigienizado = valor;
    if (/^0+[1-9]\d+.*$/.test(valor.trim())) {
      valorHigienizado = valor.trim().replace(/^0+/, '');
    }

    setUnidadeTriagem(valorHigienizado);
    buscarMoradoresEChecarAgrupamento(valorHigienizado, blocoEfetivo);
  };

  const handleBlurUnidadeTriagem = () => {
    if (timerCorrecaoUnidadeRef.current) {
      clearTimeout(timerCorrecaoUnidadeRef.current);
    }
    const corrigida = autoCorrigirZeroEsquerda(unidadeTriagem);
    if (corrigida !== unidadeTriagem) {
      setUnidadeTriagem(corrigida);
      buscarMoradoresEChecarAgrupamento(corrigida, eEstruturaCasas ? 'Casa' : blocoTriagem);
    }
  };

  const handleAgruparTodosEmLocal = async (novoLocal: string) => {
    if (!novoLocal) return;
    setLocalArmazenamentoTriagem(novoLocal);

    if (!alertaAgrupamento?.itens || alertaAgrupamento.itens.length === 0) {
      return;
    }

    setAgrupandoTodosLocais(true);
    try {
      const ids = alertaAgrupamento.itens.map((i: any) => i.id);
      const { error } = await supabase
        .from('encomendas_itens')
        .update({ local_armazenamento: novoLocal })
        .in('id', ids);

      if (error && (error.message?.includes('local_armazenamento') || (error as any).code === '42703')) {
        ids.forEach((id: string) => localStorage.setItem(`infport_item_local_${id}`, novoLocal));
      } else if (error) {
        throw error;
      }

      setTodosItensRetidos(prev => prev.map(item => {
        if (ids.includes(item.id)) {
          return { ...item, local_armazenamento: novoLocal };
        }
        return item;
      }));

      setAlertaAgrupamento((prev: any) => prev ? {
        ...prev,
        locais: [novoLocal],
        itens: prev.itens.map((it: any) => ({ ...it, local_armazenamento: novoLocal }))
      } : null);

      tocarBipSucesso();
      setMensagem({
        tipo: 'sucesso',
        texto: `✅ Todos os ${ids.length} pacote(s) anteriores foram agrupados em "${novoLocal}"!`
      });
    } catch (err: any) {
      console.warn('Erro ao agrupar pacotes:', err);
    } finally {
      setAgrupandoTodosLocais(false);
    }
  };

  const salvarItemEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeFazerEntrada) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados podem registrar entrada de encomendas.' });
      return;
    }
    if (!unidadeTriagem.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Por favor, informe a unidade / número para registrar a entrada.' });
      return;
    }
    setLoading(true);

    try {
      const localArmazenar = localArmazenamentoTriagem || 'Bancada Principal';
      const condoAlvo = idCondominioAtivo || usuarioLogado?.condominio_id || 'aa205bfb-55cc-42fe-ab25-9c16ac943851';

      // Se já existiam pacotes retidos para esta unidade e o operador definiu um novo local, agrupa todos no novo local
      if (alertaAgrupamento?.itens && alertaAgrupamento.itens.length > 0) {
        const idsAntigos = alertaAgrupamento.itens.map((i: any) => i.id);
        supabase
          .from('encomendas_itens')
          .update({ local_armazenamento: localArmazenar })
          .in('id', idsAntigos)
          .then(({ error: errAgrupar }) => {
            if (!errAgrupar) {
              setTodosItensRetidos(prev => prev.map(it => idsAntigos.includes(it.id) ? { ...it, local_armazenamento: localArmazenar } : it));
            }
          });
      }
      const blocoFinal = eEstruturaCasas ? 'Casa' : (blocoTriagem || '').trim();
      const unidadeFinal = autoCorrigirZeroEsquerda(unidadeTriagem.trim());

      let payloadItem: any = {
        lote_re_id: loteAtivo?.id || null, // Não vincula lote obrigatoriamente
        condominio_id: condoAlvo,
        bloco: blocoFinal,
        unidade: unidadeFinal,
        morador_id: moradorSelecionado?.id || null,
        codigo_barras: codigoBarras.trim(),
        foto_etiqueta_url: fotoEtiquetaUrl.trim(),
        observacoes: observacoes.trim(),
        local_armazenamento: localArmazenar,
        status: 'retido'
      };

      let { data: itemInserido, error: itemErr } = await supabase
        .from('encomendas_itens')
        .insert([payloadItem])
        .select()
        .maybeSingle();

      // Fallback seguro caso a coluna local_armazenamento ainda não exista no Supabase
      if (itemErr && (itemErr.message?.includes('local_armazenamento') || (itemErr as any).code === '42703' || itemErr.message?.includes('schema cache'))) {
        console.warn('[INFPORT] Coluna local_armazenamento não encontrada no Supabase. Salvando pacote sem a coluna...');
        delete payloadItem.local_armazenamento;
        const retry = await supabase.from('encomendas_itens').insert([payloadItem]).select().maybeSingle();
        itemErr = retry.error;
        itemInserido = retry.data;
        if (itemInserido) {
          localStorage.setItem(`infport_item_local_${itemInserido.id}`, localArmazenar);
        }
      }

      if (itemErr) throw itemErr;

      // Se houver lote ativo no estado, atualiza-o de forma segura
      if (loteAtivo) {
        const novaQtdTriada = (loteAtivo.qtd_triada || 0) + 1;
        const novoStatusLote = novaQtdTriada >= loteAtivo.qtd_declarada ? 'concluido' : 'em_triagem';
        await supabase
          .from('lotes_re')
          .update({ qtd_triada: novaQtdTriada, status: novoStatusLote })
          .eq('id', loteAtivo.id);

        setLoteAtivo((prev: any) => prev ? ({ ...prev, qtd_triada: novaQtdTriada, status: novoStatusLote }) : null);
      }

      const telMorador = moradorSelecionado?.telefone?.replace(/\D/g, '') || '';
      const nomeDestinatario = moradorSelecionado ? moradorSelecionado.nome : 'Morador';
      const labelUnidadeFormatada = formatarIdentificacaoUnidade(unidadeFinal, blocoFinal, condoConfig?.tipo_estrutura);

      // Registra evento no Histórico Absoluto
      registrarAtividade({
        modulo: 'Encomendas',
        acao: 'CRIAR',
        descricao: `Registrou entrada de encomenda para ${nomeDestinatario} (${labelUnidadeFormatada}). Local de guarda: ${localArmazenar}.`,
        detalhes: {
          unidade: unidadeFinal,
          bloco: blocoFinal,
          destinatario: nomeDestinatario,
          localGuarda: localArmazenar,
          codigoRastreio: codigoBarras || 'N/A'
        },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_id: usuarioLogado?.id,
        operador_login: usuarioLogado?.login,
        condominio_id: condoAlvo
      });

      const orientacaoRetirada = eEstruturaCasas ? 'o número da sua casa' : 'seu apartamento e bloco';
      const textoWhatsMorador = `Olá, ${nomeDestinatario} (${labelUnidadeFormatada})! 📦\n\nSua encomenda acabou de chegar na Portaria.\n• Destinatário: ${nomeDestinatario}\n• Cód. Rastreio: ${codigoBarras || 'N/A'}\n• Local Físico de Guarda: ${localArmazenar}\n• Observação: ${observacoes || 'Nenhuma'}\n• Foto do Pacote: ${fotoEtiquetaUrl || 'Registrada na portaria'}\n\nPor favor, retire na portaria informando ${orientacaoRetirada}!`;

      const linkWhatsMorador = telMorador 
        ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoWhatsMorador)}` 
        : `https://wa.me/?text=${encodeURIComponent(textoWhatsMorador)}`;

      setItemTriadoWhats({
        destinatario: nomeDestinatario,
        link: linkWhatsMorador
      });

      // Dispara a mensagem para a unidade automaticamente se houver telefone cadastrado
      if (telMorador) {
        try {
          window.open(linkWhatsMorador, '_blank');
        } catch (eWhats) {
          console.warn('[WhatsApp] Disparo automático de mensagem:', eWhats);
        }
      }

      setUnidadeTriagem(''); setBlocoTriagem(eEstruturaCasas ? 'Casa' : ''); setMoradorSelecionado(null); setMoradoresDaUnidade([]);
      setCodigoBarras(''); setFotoEtiquetaUrl(''); setObservacoes('');
      setSugestoesCodigosOcr([]); setCodigoSelecionadoOcr(''); setOcrDadosDetectados(null);
      setAlertaAgrupamento(null);

      // Fecha o modal de entrada e retorna diretamente para o menu de entrega de pacotes aos moradores
      setModalEntradaAberta(false);
      setEtapa('3'); // Menu de Entrega de Pacotes / Baixa
      setTipoFiltroBuscaBaixa('unidade');
      setBuscaBaixaGeral(unidadeFinal);

      carregarDadosBase();
      setMensagem({ 
        tipo: 'sucesso', 
        texto: `✅ Encomenda salva! Mensagem disparada para ${nomeDestinatario} e retornado ao menu de entrega de pacotes.` 
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  const salvarItemTriagem = salvarItemEntrada;

  /**
   * Permite alterar e mover o local físico de guarda de encomendas a qualquer momento
   * Suporta alteração individual, da unidade inteira ou em lote de itens selecionados.
   */
  const executarMudancaLocal = async () => {
    if (!novoLocalSelecionado) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o novo local físico de armazenamento.' });
      return;
    }
    setLoading(true);

    try {
      let idsParaAtualizar: string[] = [];

      if (moverEmLoteSelecionados) {
        idsParaAtualizar = [...itensSelecionadosIds];
      } else if (itemParaMover) {
        if (moverTodosDaUnidade) {
          // Pega todos os itens retidos da mesma unidade/bloco para agrupar
          const itensMesmaUnidade = todosItensRetidos.filter(
            i => i.unidade === itemParaMover.unidade && (itemParaMover.bloco ? i.bloco === itemParaMover.bloco : true)
          );
          idsParaAtualizar = itensMesmaUnidade.map(i => i.id);
        } else {
          idsParaAtualizar = [itemParaMover.id];
        }
      }

      if (idsParaAtualizar.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Nenhum pacote selecionado para mover.' });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('encomendas_itens')
        .update({ local_armazenamento: novoLocalSelecionado })
        .in('id', idsParaAtualizar);

      if (error && (error.message?.includes('local_armazenamento') || (error as any).code === '42703' || error.message?.includes('schema cache'))) {
        console.warn('[INFPORT] Coluna local_armazenamento ausente no Supabase. Atualizando localmente no navegador...');
        idsParaAtualizar.forEach(id => {
          localStorage.setItem(`infport_item_local_${id}`, novoLocalSelecionado);
        });
      } else if (error) {
        throw error;
      }

      // Atualiza o estado da lista em tempo real na tela
      setTodosItensRetidos(prev => prev.map(item => {
        if (idsParaAtualizar.includes(item.id)) {
          return { ...item, local_armazenamento: novoLocalSelecionado };
        }
        return item;
      }));

      tocarBipSucesso();
      setModalMoverLocal(false);
      setItemParaMover(null);
      setMoverEmLoteSelecionados(false);
      setMensagem({
        tipo: 'sucesso',
        texto: `✅ ${idsParaAtualizar.length} encomenda(s) movida(s) para "${novoLocalSelecionado}" com sucesso!`
      });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao alterar local: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const getRotuloBlocoParaFiltro = (bloco?: string | null) => {
    const b = String(bloco || '').trim();
    if (eEstruturaCasas || b.toLowerCase() === 'casa' || b.toLowerCase() === 'casas') return 'Casas';
    if (!b) return 'Geral / Sem Bloco';
    if (b.toLowerCase().startsWith('torre') || b.toLowerCase().startsWith('bloco')) return b;
    return eEstruturaTorres ? `Torre ${b}` : `Bloco ${b}`;
  };

  const saoBlocosEquivalentes = (blocoA?: string | null, blocoB?: string | null): boolean => {
    if (!blocoA || !blocoB) return false;
    const a = blocoA.trim().toLowerCase();
    const b = blocoB.trim().toLowerCase();
    if (a === b) return true;
    if (a === 'todos' || b === 'todos') return true;
    if ((a === 'casa' || a === 'casas') && (b === 'casa' || b === 'casas')) return true;

    // Normaliza 'Torre 1' vs '1', 'Bloco A' vs 'A'
    const aNorm = a.replace(/^(torre|bloco)\s*/i, '').trim();
    const bNorm = b.replace(/^(torre|bloco)\s*/i, '').trim();
    if (aNorm && bNorm && aNorm === bNorm) return true;

    return false;
  };

  const itensRetidosFiltrados = todosItensRetidos.filter(item => {
    // 1. Filtro por Bloco / Torre selecionado nas abas (ignora restrição de bloco se for condomínio de casas)
    if (abaBlocoSelecionada !== 'TODOS' && !eEstruturaCasas) {
      const blocoItem = getRotuloBlocoParaFiltro(item.bloco);
      if (
        blocoItem !== abaBlocoSelecionada &&
        !saoBlocosEquivalentes(blocoItem, abaBlocoSelecionada) &&
        !saoBlocosEquivalentes(item.bloco, abaBlocoSelecionada)
      ) {
        return false;
      }
    }

    if (!buscaBaixaGeral.trim()) return true;

    const termo = buscaBaixaGeral.toLowerCase().trim();
    const termoSemEspaco = termo.replace(/\s+/g, '');

    const unid = item.unidade?.toString().toLowerCase() || '';
    const bloc = item.bloco?.toString().toLowerCase() || '';
    const cod = item.codigo_barras?.toString().toLowerCase() || '';
    const moradorNome = item.moradores?.nome?.toLowerCase() || '';

    const comboUnidBloco = `${unid}${bloc}`;
    const comboUnidBlocoEspaco = `${unid} ${bloc}`;
    const comboBlocoUnid = `${bloc}${unid}`;

    // Filtro estrito por tipo selecionado
    if (tipoFiltroBuscaBaixa === 'unidade') {
      return (
        saoUnidadesEquivalentes(unid, termo) ||
        saoUnidadesEquivalentes(item.unidade, buscaBaixaGeral) ||
        unid === termo ||
        unid.includes(termo) ||
        bloc.includes(termo) ||
        comboUnidBloco.includes(termoSemEspaco) ||
        comboUnidBlocoEspaco.includes(termo) ||
        comboBlocoUnid.includes(termoSemEspaco)
      );
    }

    if (tipoFiltroBuscaBaixa === 'nome') {
      return moradorNome.includes(termo);
    }

    if (tipoFiltroBuscaBaixa === 'rastreio') {
      return cod.includes(termo);
    }

    // Geral: Todos os campos
    return (
      saoUnidadesEquivalentes(unid, termo) ||
      unid.includes(termo) ||
      bloc.includes(termo) ||
      cod.includes(termo) ||
      moradorNome.includes(termo) ||
      comboUnidBloco.includes(termoSemEspaco) ||
      comboUnidBlocoEspaco.includes(termo) ||
      comboBlocoUnid.includes(termoSemEspaco)
    );
  });

  // Resumo visual de encomendas pendentes agrupadas por unidade (com badges/contadores)
  // Quando há busca ativa, exibe rigorosamente apenas o que está sendo pesquisado
  const resumoPendenciasPorUnidade = useMemo(() => {
    const mapa: Record<string, {
      chave: string;
      unidade: string;
      bloco: string;
      label: string;
      qtd: number;
      moradoresNomes: string[];
      itensIds: string[];
    }> = {};

    // Mantém as badges de todas as unidades com pendências visíveis no bloco selecionado
    // para que o operador possa visualizar e alternar de unidade diretamente com 1 clique
    const baseItens = todosItensRetidos.filter((item: any) => {
      if (abaBlocoSelecionada !== 'TODOS') {
        const blocoItem = getRotuloBlocoParaFiltro(item.bloco);
        if (blocoItem !== abaBlocoSelecionada) return false;
      }
      return true;
    });

    baseItens.forEach((item: any) => {
      const u = String(item.unidade || 'Sem Unidade').trim();
      const b = String(item.bloco || '').trim();
      const chave = `${u}__${b}`;
      const label = formatarIdentificacaoUnidade(u, b, condoConfig?.tipo_estrutura);

      if (!mapa[chave]) {
        mapa[chave] = {
          chave,
          unidade: u,
          bloco: b,
          label,
          qtd: 0,
          moradoresNomes: [],
          itensIds: []
        };
      }

      mapa[chave].qtd += 1;
      mapa[chave].itensIds.push(item.id);
      const nomeMorador = item.moradores?.nome;
      if (nomeMorador && !mapa[chave].moradoresNomes.includes(nomeMorador)) {
        mapa[chave].moradoresNomes.push(nomeMorador);
      }
    });

    // Ordena priorizando unidades com maior volume de pacotes retidos
    return Object.values(mapa).sort((a, b) => {
      if (b.qtd !== a.qtd) return b.qtd - a.qtd;
      return a.unidade.localeCompare(b.unidade, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [todosItensRetidos, abaBlocoSelecionada, condoConfig]);

  // Lista de itens candidatos ao checklist (preserva itens mesmo se desmarcados temporariamente no checklist)
  const idsParaChecklist = itensCandidatosEntrega.length > 0 
    ? itensCandidatosEntrega 
    : itensSelecionadosIds;

  const itensCandidatosObjetos = todosItensRetidos.filter(i => idsParaChecklist.includes(i.id));
  const itensSelecionadosObjetos = todosItensRetidos.filter(i => itensSelecionadosIds.includes(i.id));

  const moradoresDasUnidadesBaixa = useMemo(() => {
    const listaEncontrada: any[] = [];
    const nomesJaAdicionados = new Set<string>();

    const unidadesDosItens = [
      ...itensSelecionadosObjetos,
      ...itensCandidatosObjetos
    ];

    // 1. Moradores cadastrados na mesma unidade/bloco
    moradores.forEach(m => {
      const match = unidadesDosItens.some(item => 
        saoUnidadesEquivalentes(item.unidade, m.unidade) &&
        (!item.bloco || String(item.bloco).toLowerCase() === String(m.bloco || '').toLowerCase() || eEstruturaCasas)
      );
      if (match && m.nome && !nomesJaAdicionados.has(m.nome.toLowerCase().trim())) {
        nomesJaAdicionados.add(m.nome.toLowerCase().trim());
        listaEncontrada.push(m);
      }
    });

    // 2. Morador diretamente vinculado ao pacote se houver
    unidadesDosItens.forEach(item => {
      if (item.moradores?.nome && !nomesJaAdicionados.has(item.moradores.nome.toLowerCase().trim())) {
        nomesJaAdicionados.add(item.moradores.nome.toLowerCase().trim());
        listaEncontrada.push({
          id: item.morador_id || item.moradores.id || `morador-${item.id}`,
          nome: item.moradores.nome,
          tipo: item.moradores.tipo || 'Morador'
        });
      }
    });

    return listaEncontrada;
  }, [moradores, itensSelecionadosObjetos, itensCandidatosObjetos, eEstruturaCasas]);

  const handleLimparBuscaBaixa = () => {
    setBuscaBaixaGeral('');
    setAbaBlocoSelecionada('TODOS');
    setTipoFiltroBuscaBaixa('unidade');
    setItensSelecionadosIds([]);
    setItensCandidatosEntrega([]);
  };

  const handleExecutarBusca = (termoFornecido?: string) => {
    const termo = (termoFornecido !== undefined ? termoFornecido : buscaBaixaGeral).trim();
    if (!termo) {
      setItensSelecionadosIds([]);
      setItensCandidatosEntrega([]);
      return;
    }

    // Se o termo corresponder a um código de barras de algum pacote retido, já seleciona no lote automaticamente
    const pacoteEncontrado = todosItensRetidos.find(i => 
      (i.codigo_barras || '').trim().toLowerCase() === termo.toLowerCase()
    );

    if (pacoteEncontrado) {
      tocarBipSucesso();
      const primeiroItem = todosItensRetidos.find(i => itensSelecionadosIds.includes(i.id));
      const labelUnid = formatarIdentificacaoUnidade(pacoteEncontrado.unidade, pacoteEncontrado.bloco, condoConfig?.tipo_estrutura);

      if (primeiroItem && !saoUnidadesEquivalentes(primeiroItem.unidade, pacoteEncontrado.unidade)) {
        setItensSelecionadosIds([pacoteEncontrado.id]);
        setItensCandidatosEntrega([pacoteEncontrado.id]);
        const labelAntiga = formatarIdentificacaoUnidade(primeiroItem.unidade, primeiroItem.bloco, condoConfig?.tipo_estrutura);
        setMensagem({
          tipo: 'alerta',
          texto: `⚠️ Seleção alterada para ${labelUnid} (pacotes de ${labelAntiga} desmarcados para não misturar no checklist).`
        });
      } else {
        setItensSelecionadosIds(prev => prev.includes(pacoteEncontrado.id) ? prev : [...prev, pacoteEncontrado.id]);
        setItensCandidatosEntrega(prev => prev.includes(pacoteEncontrado.id) ? prev : [...prev, pacoteEncontrado.id]);
        setMensagem({
          tipo: 'sucesso',
          texto: `✅ Pacote ${pacoteEncontrado.codigo_barras || termo} (${labelUnid}) selecionado no lote de entrega!`
        });
      }
      return;
    }

    // Se corresponder à busca por unidade exata, seleciona exclusivamente os pacotes desta unidade
    const pacotesUnid = todosItensRetidos.filter(i => saoUnidadesEquivalentes(i.unidade, termo));
    if (pacotesUnid.length > 0) {
      const ids = pacotesUnid.map(p => p.id);
      setItensSelecionadosIds(ids);
      setItensCandidatosEntrega(ids);
      const labelUnid = formatarIdentificacaoUnidade(pacotesUnid[0].unidade, pacotesUnid[0].bloco, condoConfig?.tipo_estrutura);
      setMensagem({
        tipo: 'sucesso',
        texto: `✅ ${ids.length} pacote(s) da unidade ${labelUnid} selecionados para conferência!`
      });
    }
  };

  const toggleItemSelecao = (id: string) => {
    const itemClicado = todosItensRetidos.find(i => i.id === id);
    if (!itemClicado) return;

    if (itensSelecionadosIds.includes(id)) {
      const novos = itensSelecionadosIds.filter(item => item !== id);
      setItensSelecionadosIds(novos);
      setItensCandidatosEntrega(novos);
    } else {
      // Verifica se já existem itens selecionados de OUTRA unidade
      const primeiroItem = todosItensRetidos.find(i => itensSelecionadosIds.includes(i.id));
      if (primeiroItem && !saoUnidadesEquivalentes(primeiroItem.unidade, itemClicado.unidade)) {
        // Unidade diferente: isola o checklist exclusivamente para a nova unidade selecionada
        setItensSelecionadosIds([id]);
        setItensCandidatosEntrega([id]);
        setBuscaBaixaGeral(itemClicado.unidade);
        const labelNova = formatarIdentificacaoUnidade(itemClicado.unidade, itemClicado.bloco, condoConfig?.tipo_estrutura);
        const labelAntiga = formatarIdentificacaoUnidade(primeiroItem.unidade, primeiroItem.bloco, condoConfig?.tipo_estrutura);
        setMensagem({
          tipo: 'info',
          texto: `ℹ️ Alternado para ${labelNova}. Pacotes de ${labelAntiga} foram desmarcados para não misturar unidades no mesmo checklist.`
        });
      } else {
        const novos = [...itensSelecionadosIds, id];
        setItensSelecionadosIds(novos);
        setItensCandidatosEntrega(novos);
      }
    }
  };

  const abrirModalBaixa = () => {
    setItensCandidatosEntrega([...itensSelecionadosIds]);
    setModalBaixaAberta(true);
  };

  const alternarItemChecklist = (id: string) => {
    if (itensSelecionadosIds.includes(id)) {
      setItensSelecionadosIds(prev => prev.filter(item => item !== id));
    } else {
      setItensSelecionadosIds(prev => [...prev, id]);
    }
  };

  const removerItemDoChecklist = (id: string) => {
    setItensCandidatosEntrega(prev => prev.filter(item => item !== id));
    setItensSelecionadosIds(prev => prev.filter(item => item !== id));
  };

  const selecionarTodosChecklist = () => {
    const todosIds = itensCandidatosObjetos.map((i: any) => i.id);
    setItensSelecionadosIds(todosIds);
  };

  const desmarcarTodosChecklist = () => {
    setItensSelecionadosIds([]);
  };

  const limparChecklistCompleto = () => {
    setItensSelecionadosIds([]);
    setItensCandidatosEntrega([]);
    setBuscaBaixaGeral('');
  };

  const renderChecklistConferencia = (isModal: boolean = false) => {
    if (itensCandidatosObjetos.length === 0) return null;

    const totalCandidatos = itensCandidatosObjetos.length;
    const totalConferidos = itensSelecionadosIds.length;
    const todosMarcados = totalConferidos === totalCandidatos && totalCandidatos > 0;

    return (
      <div className="border border-slate-200 rounded-xl bg-slate-50/90 p-2.5 sm:p-3 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 flex-wrap gap-1">
          <div className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h5 className="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-tight">
                Checklist de Conferência da Entrega
              </h5>
              <p className="text-[10px] text-slate-500">
                Confira os volumes físicos com o morador para evitar erro de baixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={selecionarTodosChecklist}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold transition cursor-pointer shadow-2xs"
            >
              Marcar Todos
            </button>
            <button
              type="button"
              onClick={desmarcarTodosChecklist}
              className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-medium transition cursor-pointer shadow-2xs"
            >
              Desmarcar
            </button>
            <button
              type="button"
              onClick={limparChecklistCompleto}
              className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold transition cursor-pointer shadow-2xs"
              title="Limpar seleção e remover itens do checklist"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Banner de status da conferência */}
        <div className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-between gap-1.5 transition ${
          totalConferidos === 0
            ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
            : todosMarcados
            ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300'
            : 'bg-blue-100/90 text-blue-900 border border-blue-300'
        }`}>
          <span className="flex items-center gap-1.5">
            {totalConferidos === 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : todosMarcados ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            {totalConferidos === 0 ? (
              'Atenção: Marque ao menos um pacote no checklist para liberar a entrega!'
            ) : todosMarcados ? (
              `Pronto: Todos os ${totalCandidatos} pacote(s) conferidos para baixa!`
            ) : (
              `${totalConferidos} de ${totalCandidatos} pacote(s) marcados (${totalCandidatos - totalConferidos} ficarão retidos na portaria)`
            )}
          </span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-xs text-slate-800 shrink-0">
            {totalConferidos}/{totalCandidatos}
          </span>
        </div>

        {/* Lista de itens do checklist */}
        <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${isModal ? 'max-h-56 sm:max-h-64' : 'max-h-60'}`}>
          {itensCandidatosObjetos.map((item: any, idx: number) => {
            const isConferido = itensSelecionadosIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => alternarItemChecklist(item.id)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition flex items-start gap-2.5 relative ${
                  isConferido
                    ? 'bg-white border-emerald-400 ring-1 ring-emerald-500/25 shadow-xs'
                    : 'bg-slate-100/80 border-dashed border-slate-300 opacity-60 hover:opacity-90'
                }`}
              >
                {/* Checkbox visual interativo */}
                <div className="mt-0.5 shrink-0">
                  {isConferido ? (
                    <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md border-2 border-slate-400 bg-white flex items-center justify-center">
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    </div>
                  )}
                </div>

                {/* Conteúdo completo e legível */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        #{idx + 1} {formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        isConferido 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}>
                        {isConferido ? '✓ Entregar' : '○ Não Entregar'}
                      </span>
                    </div>

                    <div className="flex flex-col items-end text-right shrink-0">
                      {/* EM FRENTE DA HORA: LOCAL ONDE ESTA O VOLUME */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9.5px] font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <Boxes className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.local_armazenamento || 'Bancada Principal'}</span>
                        </span>

                        {/* HORA */}
                        <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5 text-slate-400" />
                          <span>{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>

                      {/* NOME DE OPERADOR: EM BAIXO DA HORA */}
                      <span className="text-[8.5px] text-slate-500 font-semibold truncate max-w-[140px] mt-0.5 flex items-center gap-0.5">
                        <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span>{obterOperadorPacote(item)}</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 truncate">
                    {item.moradores?.nome || 'Morador não vinculado'}
                  </p>

                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">

                    {/* Código de Rastreio */}
                    {item.codigo_barras && (
                      <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]" title={item.codigo_barras}>
                        📦 {item.codigo_barras}
                      </span>
                    )}

                    {/* Foto da Etiqueta */}
                    {item.foto_etiqueta_url && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalFotoAmpliada(item.foto_etiqueta_url);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                      >
                        <Camera className="w-2.5 h-2.5" /> Ver Foto
                      </button>
                    )}
                  </div>

                  {item.observacoes && (
                    <p className="text-[10px] text-slate-600 italic bg-white p-1 rounded border border-slate-100">
                      Obs: {item.observacoes}
                    </p>
                  )}
                </div>

                {/* Botão de excluir este item do checklist */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removerItemDoChecklist(item.id);
                  }}
                  className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition cursor-pointer shrink-0"
                  title="Remover este pacote da entrega atual"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const efetivarBaixaSaida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeDarBaixa) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: Apenas usuários autorizados (Master/Supervisor/Admin) possuem permissão para realizar Baixa de Pacotes.' });
      return;
    }
    if (itensSelecionadosIds.length === 0) {
      setMensagem({ 
        tipo: 'erro', 
        texto: 'Selecione e marque ao menos um volume no checklist para realizar a entrega.' 
      });
      return;
    }
    const nomeFinalRetirante = (nomeRetirante === '__OUTRO__' ? nomeRetiranteManual : nomeRetirante).trim();
    if (!nomeFinalRetirante) {
      setMensagem({ 
        tipo: 'erro', 
        texto: 'Por favor, selecione o morador ou digite o nome de quem está retirando.' 
      });
      return;
    }
    // FOTO DO PACOTE É OBRIGATÓRIA PARA TODA E QUALQUER RETIRADA
    if (!fotoRetiranteUrl.trim()) {
      setMensagem({ 
        tipo: 'erro', 
        texto: '⚠️ A FOTO DO PACOTE É OBRIGATÓRIA para toda e qualquer retirada! Anexe ou tire a foto do pacote para concluir.' 
      });
      return;
    }
    setLoading(true);

    try {
      const retiranteFormatado = [
        nomeFinalRetirante,
        baixaDocRetirante ? `(Doc: ${baixaDocRetirante.trim()})` : '',
        baixaParentesco ? `[${baixaParentesco}]` : ''
      ].filter(Boolean).join(' ');

      // Se houver assinatura digital desenhada (data:image), comprime e salva no storage
      let urlAssinaturaFinal = assinaturaDigitalUrl.trim();
      if (urlAssinaturaFinal.startsWith('data:image/')) {
        try {
          const fetchRes = await fetch(urlAssinaturaFinal);
          const blobAssinatura = await fetchRes.blob();
          const uploadRes = await uploadFotoComprimidaStorage({
            file: blobAssinatura,
            pasta: 'assinaturas_encomendas',
            maxWidth: 900,
            maxHeight: 450,
            qualidade: 0.85
          });
          if (uploadRes?.publicUrl) {
            urlAssinaturaFinal = uploadRes.publicUrl;
          }
        } catch (errUpload) {
          console.warn('Upload de assinatura digital usou fallback:', errUpload);
        }
      }

      const comprovantePrincipal = fotoRetiranteUrl.trim() || urlAssinaturaFinal;
      const comprovanteAssinatura = urlAssinaturaFinal || fotoRetiranteUrl.trim();

      const payloadUpdate: any = {
        status: 'entregue',
        retirado_por: retiranteFormatado,
        foto_retirada_url: comprovantePrincipal,
        foto_comprovante_url: comprovanteAssinatura,
        data_retirada: new Date().toISOString(),
        operador_baixa_id: usuarioLogado?.login || usuarioLogado?.id || 'Operador'
      };

      const { error } = await supabase
        .from('encomendas_itens')
        .update(payloadUpdate)
        .in('id', itensSelecionadosIds);

      if (error) throw error;

      const primeiroItem = todosItensRetidos.find(i => i.id === itensSelecionadosIds[0]);

      // Registra baixa / entrega no Histórico Absoluto com detalhes de assinatura
      registrarAtividade({
        modulo: 'Encomendas',
        acao: 'BAIXA',
        descricao: `Entregou ${itensSelecionadosIds.length} encomenda(s) para o retirante: ${retiranteFormatado}.${urlAssinaturaFinal ? ' [ASSINATURA DIGITAL COLETADA]' : ''}${baixaObsEspecial ? ` Obs: ${baixaObsEspecial}` : ''}${baixaNotificarSupervisor ? ' [AUDITORIA SUPERVISÃO SOLICITADA]' : ''}`,
        detalhes: {
          totalItens: itensSelecionadosIds.length,
          itensIds: itensSelecionadosIds,
          retiradoPor: retiranteFormatado,
          docRetirante: baixaDocRetirante,
          vinculo: baixaParentesco,
          temAssinaturaDigital: Boolean(urlAssinaturaFinal),
          temFoto: Boolean(fotoRetiranteUrl),
          obsEspecial: baixaObsEspecial,
          notificadoSupervisor: baixaNotificarSupervisor
        },
        operador_nome: usuarioLogado?.nome || usuarioLogado?.login,
        operador_id: usuarioLogado?.id,
        operador_login: usuarioLogado?.login,
        condominio_id: primeiroItem?.condominio_id || idCondominioAtivo
      });

      const telMorador = primeiroItem?.moradores?.telefone?.replace(/\D/g, '') || '';
      
      const volumesDetalhados = itensSelecionadosObjetos.map((it: any, idx: number) => {
        const cod = it.codigo_barras ? ` (Cód: ${it.codigo_barras})` : '';
        const loc = it.local_armazenamento ? ` [${it.local_armazenamento}]` : '';
        const labelItem = formatarIdentificacaoUnidade(it.unidade, it.bloco, condoConfig?.tipo_estrutura);
        return `  ${idx + 1}. ${labelItem}${cod}${loc}`;
      }).join('\n');

      const rotuloUnidPrimeiro = formatarIdentificacaoUnidade(primeiroItem?.unidade, primeiroItem?.bloco, condoConfig?.tipo_estrutura);
      const comprovanteWhats = fotoRetiranteUrl.trim() || urlAssinaturaFinal || 'Assinatura digital coletada na portaria';
      const infoAssinaturaWhats = urlAssinaturaFinal ? `• Assinatura Digital: Confirmada no sistema\n` : '';

      const textoCruzado = `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*\nUnidade: ${rotuloUnidPrimeiro}\n\nInformamos que o(s) seguinte(s) pacote(s) foram RETIRADOS da portaria:\n• Volumes Entregues (${itensSelecionadosIds.length}):\n${volumesDetalhados}\n• Quem Retirou: ${retiranteFormatado}\n${infoAssinaturaWhats}• Comprovante da Entrega: ${comprovanteWhats}\n\nOperador Responsável: ${usuarioLogado?.login || 'Portaria'}\nData/Hora: ${new Date().toLocaleString('pt-BR')}`;

      setBaixaConcluidaWhats({
        link: telMorador ? `https://wa.me/55${telMorador}?text=${encodeURIComponent(textoCruzado)}` : `https://wa.me/?text=${encodeURIComponent(textoCruzado)}`
      });

      setItensSelecionadosIds([]);
      setItensCandidatosEntrega([]);
      setModalBaixaAberta(false);
      setNomeRetirante(''); setNomeRetiranteManual(''); setFotoRetiranteUrl(''); setAssinaturaDigitalUrl('');
      setBaixaDocRetirante(''); setBaixaParentesco('Titular / Morador');
      setBaixaObsEspecial(''); setBaixaNotificarSupervisor(false);
      setMostrarOpcoesBaixa(false);
      carregarDadosBase();
      setMensagem({ tipo: 'sucesso', texto: 'Baixa de saída realizada com sucesso com assinatura digital registrada!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* PAINEL DE MÉTRICAS DO DIA (DIRETO E COMPACTO) */}
      <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
        <div className="py-1 px-1.5 rounded-lg bg-blue-50/70 flex items-center justify-center gap-1.5 text-center">
          <Boxes className="w-3.5 h-3.5 text-blue-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Retidos</span>
            <strong className="text-xs sm:text-sm font-black text-blue-900">{todosItensRetidos.length}</strong>
          </div>
        </div>

        <div className="py-1 px-1.5 rounded-lg bg-emerald-50/70 flex items-center justify-center gap-1.5 text-center">
          <Package className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Entradas Hoje</span>
            <strong className="text-xs sm:text-sm font-black text-emerald-700">{statsDia.triadasHoje}</strong>
          </div>
        </div>

        <div className="py-1 px-1.5 rounded-lg bg-purple-50/70 flex items-center justify-center gap-1.5 text-center">
          <UserCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
          <div className="leading-tight">
            <span className="text-[9px] font-bold uppercase text-slate-500 block truncate">Saídas Hoje</span>
            <strong className="text-xs sm:text-sm font-black text-purple-900">{statsDia.entreguesHoje}</strong>
          </div>
        </div>
      </div>

      {/* Mensagens Globais */}
      {mensagem.texto && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* 3ª ETAPA — SAÍDA E BAIXA */}
      {etapa === '3' && (
        !podeDarBaixa ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Acesso Restrito à Saída / Baixa de Encomendas</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Toda a área de conferência, saída e baixa de pacotes é restrita a usuários com nível de permissão adequado (Master, Supervisor ou Administrador).
            </p>
          </div>
        ) : (
        <div className="space-y-2">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl shadow-2xs border border-slate-200 space-y-2">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 shrink-0">
                <UserCheck className="w-4 h-4 text-slate-800" /> Entrega de Pacotes
              </h3>

              {/* Botão Dossiê ao lado de Entrega de Pacotes */}
              <button
                type="button"
                onClick={() => {
                  if (!podeVerDossie) {
                    setMensagem({ tipo: 'erro', texto: 'Acesso restrito: A visualização do Dossiê Completo de Auditoria exige permissão adequada.' });
                    return;
                  }
                  setEtapa('4');
                  carregarDossie();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 hover:border-purple-300 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer group"
                title="Dossiê Completo de Auditoria e Histórico de Encomendas"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>Dossiê</span>
              </button>
            </div>

            {/* Botão de Pesquisa em frente a Entrega de Pacotes (Saída) */}
            <button
              type="button"
              onClick={() => setMostrarBuscaBaixa(!mostrarBuscaBaixa)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border shadow-2xs ${
                mostrarBuscaBaixa || buscaBaixaGeral.trim()
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title={mostrarBuscaBaixa ? "Recolher pesquisa" : "Abrir pesquisa de encomendas"}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Pesquisa</span>
              {buscaBaixaGeral.trim() && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Pesquisa ativa" />
              )}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${mostrarBuscaBaixa || buscaBaixaGeral.trim() ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* PAINEL DA FUNÇÃO DE PESQUISA (ABERTO PELO BOTÃO DE PESQUISA) */}
          {(mostrarBuscaBaixa || buscaBaixaGeral.trim()) && (
            <div className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap sm:flex-nowrap items-center gap-2 animate-in fade-in duration-150">
              {/* Lista seletora com o tipo de filtro */}
              <select
                value={tipoFiltroBuscaBaixa}
                onChange={(e) => setTipoFiltroBuscaBaixa(e.target.value as any)}
                className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition cursor-pointer shrink-0"
                title="Filtrar tipo de pesquisa"
              >
                <option value="unidade">🏠 UNIDADE</option>
                <option value="todos">🔍 TODOS</option>
                <option value="nome">👤 MORADOR</option>
                <option value="rastreio">📦 RASTREIO</option>
              </select>

              {/* Input com botão de pesquisa embutido */}
              <div className="relative flex-1 min-w-[160px] flex items-center">
                <input
                  type="text"
                  value={buscaBaixaGeral}
                  autoFocus
                  onChange={(e) => {
                    const novoVal = e.target.value;
                    setBuscaBaixaGeral(novoVal);
                    if (!novoVal.trim()) {
                      setItensSelecionadosIds([]);
                      setItensCandidatosEntrega([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecutarBusca();
                    }
                  }}
                  placeholder={
                    tipoFiltroBuscaBaixa === 'unidade' 
                      ? (eEstruturaCasas ? "Casa (ex: 01, 14)..." : "Unidade (ex: 101, B2)...")
                      : tipoFiltroBuscaBaixa === 'nome'
                      ? "Nome do morador..."
                      : tipoFiltroBuscaBaixa === 'rastreio'
                      ? "Código de rastreio..."
                      : "Unidade, morador ou rastreio..."
                  }
                  className="pl-3 pr-9 py-1.5 w-full bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition font-medium"
                />

                {/* Botão de Pesquisa DENTRO da barra de pesquisa */}
                <button
                  type="button"
                  onClick={() => handleExecutarBusca()}
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center transition cursor-pointer shadow-xs"
                  title="Pesquisar"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botão de Leitura de Código / Escanear DENTRO da barra de pesquisa */}
              <button 
                type="button"
                onClick={() => abrirLeitorCamera('baixa')} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition flex items-center justify-center shrink-0 cursor-pointer shadow-2xs" 
                title="Leitor de Código de Barras / Escanear em Lote"
              >
                <QrCode className="w-4 h-4" />
              </button>

              {/* Botão de Limpar (Borracha) */}
              <button
                type="button"
                onClick={handleLimparBuscaBaixa}
                className={`p-2 rounded-lg transition flex items-center justify-center shrink-0 cursor-pointer border ${
                  buscaBaixaGeral 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-300 shadow-2xs' 
                    : 'bg-white hover:bg-red-50 text-red-500 border-red-200'
                }`}
                title="Limpar pesquisa (Borracha)"
              >
                <Eraser className="w-4 h-4 text-red-600" />
              </button>

              {/* Botão para Fechar / Recolher a pesquisa */}
              <button
                type="button"
                onClick={() => {
                  setMostrarBuscaBaixa(false);
                  if (buscaBaixaGeral) handleLimparBuscaBaixa();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Fechar pesquisa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex overflow-x-auto pb-1 gap-1 snap-x">
            <button
              onClick={() => setAbaBlocoSelecionada('TODOS')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition snap-start cursor-pointer ${abaBlocoSelecionada === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {eEstruturaCasas ? 'Todas as Casas' : eEstruturaTorres ? 'Todas as Torres' : 'Todos os Blocos'}
            </button>
            {Object.keys(statsDia.retidosPorBloco).map(bloco => (
              <button
                key={bloco}
                onClick={() => setAbaBlocoSelecionada(bloco)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition snap-start flex items-center gap-1 cursor-pointer ${abaBlocoSelecionada === bloco ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {bloco} <span className="bg-emerald-500 text-white px-1 py-0.2 rounded text-[10px] font-mono">{statsDia.retidosPorBloco[bloco]}</span>
              </button>
            ))}
          </div>

          {/* RESUMO VISUAL DE ENCOMENDAS PENDENTES POR UNIDADE (BADGES / CONTADORES) */}
          <div className="bg-slate-50/90 p-2 sm:p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                  Resumo de Pendências por Unidade
                </h4>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                  {resumoPendenciasPorUnidade.length} {resumoPendenciasPorUnidade.length === 1 ? 'unidade' : 'unidades'}
                </span>
              </div>

              {buscaBaixaGeral && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaBaixaGeral('');
                    setItensSelecionadosIds([]);
                    setItensCandidatosEntrega([]);
                  }}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 transition cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpar filtro ({buscaBaixaGeral})
                </button>
              )}
            </div>

            {resumoPendenciasPorUnidade.length > 0 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin snap-x">
                {resumoPendenciasPorUnidade.map((item) => {
                  const todosSelecionados = item.itensIds.length > 0 && item.itensIds.every(id => itensSelecionadosIds.includes(id));
                  const parcialmenteSelecionados = !todosSelecionados && item.itensIds.some(id => itensSelecionadosIds.includes(id));
                  const isFiltroAtivo = buscaBaixaGeral.trim().toLowerCase() === item.unidade.toLowerCase();

                  return (
                    <button
                      key={item.chave}
                      type="button"
                      onClick={() => {
                        const estaAtivaComSelecao = (todosSelecionados || isFiltroAtivo) && itensSelecionadosIds.some(id => item.itensIds.includes(id));
                        if (estaAtivaComSelecao) {
                          // Se já for a unidade ativa com pacotes selecionados, desmarca tudo e limpa busca
                          setBuscaBaixaGeral('');
                          setItensSelecionadosIds([]);
                          setItensCandidatosEntrega([]);
                        } else {
                          // Seleciona EXCLUSIVAMENTE os pacotes desta unidade (substitui qualquer outra unidade anterior)
                          setBuscaBaixaGeral(item.unidade);
                          setItensSelecionadosIds(item.itensIds);
                          setItensCandidatosEntrega(item.itensIds);
                        }
                      }}
                      className={`p-2 rounded-xl border transition flex flex-col justify-between text-left shrink-0 min-w-[135px] max-w-[170px] snap-start cursor-pointer ${
                        todosSelecionados
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs'
                          : parcialmenteSelecionados
                          ? 'bg-blue-50/70 border-blue-300'
                          : isFiltroAtivo
                          ? 'bg-slate-100 border-slate-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                      }`}
                      title={`Clique para selecionar os ${item.qtd} pacote(s) de ${item.label}`}
                    >
                      <div className="flex items-center justify-between gap-1 w-full mb-1">
                        <span className="text-[11px] font-black text-slate-900 truncate">
                          {item.label}
                        </span>
                        {/* BADGE / CONTADOR DE ENCOMENDAS PENDENTES */}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono flex items-center gap-0.5 shrink-0 ${
                          item.qtd > 1 
                            ? 'bg-amber-500 text-white shadow-2xs' 
                            : 'bg-emerald-600 text-white'
                        }`}>
                          <Package className="w-2.5 h-2.5" />
                          {item.qtd} {item.qtd === 1 ? 'pct' : 'pcts'}
                        </span>
                      </div>

                      {item.bloco && !eEstruturaCasas && item.bloco.toLowerCase() !== 'casa' && (
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded w-fit mb-0.5">
                          {eEstruturaTorres ? (item.bloco.toLowerCase().startsWith('torre') ? item.bloco : `Torre ${item.bloco}`) : `Bloco ${item.bloco}`}
                        </span>
                      )}

                      <p className="text-[10px] text-slate-600 font-medium truncate w-full">
                        {item.moradoresNomes.length > 0 ? item.moradoresNomes.join(', ') : 'Morador não vinculado'}
                      </p>

                      {/* Indicador de seleção removido conforme solicitado */}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-2.5 text-center text-slate-500 text-xs bg-white rounded-lg border border-dashed border-slate-200">
                Nenhuma encomenda pendente aguardando retirada.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <h4 className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Pacotes Retidos ({itensRetidosFiltrados.length})
                </h4>

                {itensSelecionadosIds.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={abrirModalBaixa}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <UserCheck className="w-3 h-3" /> Finalizar ({itensSelecionadosIds.length})
                    </button>
                    {podeEditarPacote && (
                      <button
                        type="button"
                        onClick={() => {
                          setMoverEmLoteSelecionados(true);
                          setItemParaMover(null);
                          const primeiro = locaisArmazenamento.find(l => l.ativo !== false);
                          setNovoLocalSelecionado(primeiro ? (primeiro.codigo && primeiro.nome ? `${primeiro.codigo} - ${primeiro.nome}` : primeiro.nome || primeiro) : 'Bancada Principal');
                          setModalMoverLocal(true);
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-black text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                      >
                        <Boxes className="w-3 h-3" /> Mover Sel.
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                {itensRetidosFiltrados.length > 0 ? (
                  itensRetidosFiltrados.map((item: any) => {
                    const selecionado = itensSelecionadosIds.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemSelecao(item.id)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex gap-2 items-start ${
                          selecionado ? 'border-emerald-500 bg-emerald-50/70 shadow-2xs ring-1 ring-emerald-500/30' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 text-slate-400 shrink-0">
                          {selecionado ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* LINHA SUPERIOR: UNIDADE NA ESQUERDA, LOCAL EM FRENTE DA HORA E OPERADOR ABAIXO DA HORA */}
                          <div className="flex justify-between items-start gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}
                            </span>

                            <div className="flex flex-col items-end text-right shrink-0">
                              {/* EM FRENTE DA HORA: LOCAL ONDE ESTA O VOLUME */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9.5px] font-bold text-emerald-950 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                                  <Boxes className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[120px]">{item.local_armazenamento || 'Bancada Principal'}</span>
                                </span>

                                {/* HORA DE ENTRADA */}
                                <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-0.5" title={`Entrada: ${new Date(item.created_at).toLocaleDateString('pt-BR')} às ${new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span>{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              </div>

                              {/* NOME DE OPERADOR EM BAIXO DA HORA */}
                              <span className="text-[8.5px] text-slate-500 font-semibold truncate max-w-[150px] mt-0.5 flex items-center gap-0.5" title={`Operador de cadastro: ${obterOperadorPacote(item)}`}>
                                <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{obterOperadorPacote(item)}</span>
                              </span>
                            </div>
                          </div>

                          <p className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                            {item.moradores?.nome || 'Morador não vinculado'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="truncate max-w-[170px]">
                              {(() => {
                                const cod = item.codigo_barras?.trim();
                                if (!cod) return 'Rastreio: Sem código';
                                if (cod.startsWith('http')) return 'Rastreio: Link/QR';
                                return `Rastreio: ${cod.length > 14 ? cod.substring(0, 12) + '…' : cod}`;
                              })()}
                            </span>
                            {item.foto_etiqueta_url && (
                              <a 
                                href={item.foto_etiqueta_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={e => e.stopPropagation()} 
                                className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-bold shrink-0"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Foto
                              </a>
                            )}
                          </div>

                          {/* DATA E BOTÕES DE AÇÃO */}
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 flex-wrap gap-1">
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </span>

                            <div className="flex items-center gap-1 ml-auto">
                              {podeEditarPacote && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setItemParaMover(item);
                                    const localAtual = item.local_armazenamento || (locaisArmazenamento[0] ? `${locaisArmazenamento[0].codigo} - ${locaisArmazenamento[0].nome}` : 'Bancada Principal');
                                    setNovoLocalSelecionado(localAtual);
                                    setMoverTodosDaUnidade(true);
                                    setMoverEmLoteSelecionados(false);
                                    setModalMoverLocal(true);
                                  }}
                                  className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                                  title="Alterar local físico deste pacote"
                                >
                                  <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar Local
                                </button>
                              )}

                              {podeEditarPacote && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    abrirEdicaoPacote(item);
                                  }}
                                  className="p-1 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 rounded border border-slate-200 transition cursor-pointer"
                                  title="Editar dados deste pacote"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}

                              {podeExcluirPacote && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmarExcluirPacote(item);
                                  }}
                                  className="p-1 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-700 rounded border border-slate-200 transition cursor-pointer"
                                  title="Excluir este pacote retido"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl space-y-2">
                    <p className="font-bold text-slate-700">
                      {buscaBaixaGeral 
                        ? `Nenhum pacote retido encontrado para "${buscaBaixaGeral}".`
                        : 'Nenhum pacote retido aguardando entrega.'}
                    </p>
                    {buscaBaixaGeral && (
                      <button
                        type="button"
                        onClick={handleLimparBuscaBaixa}
                        className="text-emerald-600 hover:text-emerald-700 font-bold underline text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Limpar pesquisa e mostrar todos
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Finalizar Entrega (Baixa)
                </h4>
                <div className="flex items-center gap-1.5">
                  {itensSelecionadosIds.length > 0 && (
                    <span className="bg-emerald-600 text-white font-black px-2 py-0.5 rounded text-[10px]">
                      {itensSelecionadosIds.length} marcado(s)
                    </span>
                  )}
                  {itensCandidatosObjetos.length > 0 && (
                    <button
                      type="button"
                      onClick={limparChecklistCompleto}
                      className="text-[10px] text-red-600 hover:text-red-700 font-bold bg-white hover:bg-red-50 border border-red-200 px-1.5 py-0.5 rounded cursor-pointer transition flex items-center gap-0.5 shadow-2xs"
                      title="Limpar seleção e checklist"
                    >
                      <X className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>
              </div>

              {itensCandidatosObjetos.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {/* CHECKLIST DE CONFERÊNCIA DOS PACOTES */}
                  {renderChecklistConferencia(false)}

                  <button 
                    type="button" 
                    onClick={abrirModalBaixa}
                    disabled={itensSelecionadosIds.length === 0} 
                    className={`w-full font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-xs ${
                      itensSelecionadosIds.length === 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98 shadow-md'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" /> 
                    {itensSelecionadosIds.length > 0 
                      ? `Finalizar Baixa (${itensSelecionadosIds.length} ${itensSelecionadosIds.length === 1 ? 'volume' : 'volumes'})`
                      : 'Marque ao menos 1 volume no checklist'}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs text-center">
                  Selecione ao menos um pacote na lista ao lado para efetuar a entrega.
                </div>
              )}

              {baixaConcluidaWhats && (
                 <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                   <p className="text-sm font-bold text-emerald-800">Baixa registrada com sucesso!</p>
                   <a href={baixaConcluidaWhats.link} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition w-full">
                     <MessageCircle className="w-4 h-4" /> Enviar Recibo de Entrega
                   </a>
                 </div>
              )}
            </div>
          </div>
        </div>
        </div>
        )
      )}

      {/* BARRA FLUTUANTE MOBILE (FAB) PARA FINALIZAR ENTREGA (Posicionada acima da barra de navegação inferior) */}
      {etapa === '3' && itensSelecionadosIds.length > 0 && !modalBaixaAberta && (
        <div className="md:hidden fixed bottom-14 left-3 right-3 bg-slate-900 text-white p-2.5 rounded-xl shadow-2xl flex items-center justify-between z-50 border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {itensSelecionadosIds.length}
            </div>
            <div>
              <p className="font-bold text-xs text-white">Pacotes Selecionados</p>
              <p className="text-[10px] text-slate-400">Prontos para conferência</p>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirModalBaixa}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
          >
            <UserCheck className="w-3.5 h-3.5" /> Finalizar Baixa
          </button>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET DE BAIXA / FINALIZAÇÃO DE ENTREGA COM CHECKLIST */}
      {modalBaixaAberta && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col p-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Finalizar Entrega (Baixa)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {itensSelecionadosIds.length} de {itensCandidatosObjetos.length} volume(s) conferido(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBaixaAberta(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-2">
              {itensCandidatosObjetos.length > 0 ? (
                <form onSubmit={efetivarBaixaSaida} className="space-y-3">
                  {/* CHECKLIST DE CONFERÊNCIA DOS VOLUMES */}
                  {renderChecklistConferencia(true)}

                  {/* 1. QUEM ESTÁ RETIRANDO (LISTANDO OS MORADORES DA UNIDADE) */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-800 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        Quem está retirando? *
                      </span>
                      {moradoresDasUnidadesBaixa.length > 0 && (
                        <span className="text-[10px] text-emerald-700 font-bold lowercase">
                          ({moradoresDasUnidadesBaixa.length} morador(es) na unidade)
                        </span>
                      )}
                    </label>

                    {moradoresDasUnidadesBaixa.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={nomeRetirante}
                          onChange={(e) => {
                            setNomeRetirante(e.target.value);
                            if (e.target.value !== '__OUTRO__') {
                              setNomeRetiranteManual('');
                            }
                          }}
                          required
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition cursor-pointer shadow-2xs"
                        >
                          <option value="">Selecione quem está retirando...</option>
                          {moradoresDasUnidadesBaixa.map((m: any) => (
                            <option key={m.id} value={m.nome}>
                              👤 {m.nome} {m.tipo ? `(${m.tipo})` : ''}
                            </option>
                          ))}
                          <option value="__OUTRO__">✍️ Outro (digitar nome)...</option>
                        </select>

                        {/* Campo para digitação de Outro */}
                        {nomeRetirante === '__OUTRO__' && (
                          <div className="pt-0.5 animate-in fade-in duration-150">
                            <input
                              type="text"
                              value={nomeRetiranteManual}
                              onChange={(e) => setNomeRetiranteManual(e.target.value)}
                              placeholder="Digite o nome completo de quem está retirando..."
                              required
                              autoFocus
                              className="w-full p-2 bg-white border border-emerald-500 rounded-lg text-slate-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition shadow-2xs"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={nomeRetirante}
                        onChange={(e) => setNomeRetirante(e.target.value)}
                        placeholder="Nome de quem pegou o pacote..."
                        required
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition font-medium"
                      />
                    )}
                  </div>

                  {/* 2. FOTO DO PACOTE (OBRIGATÓRIA PARA TODA E QUALQUER RETIRADA) */}
                  <div className={`space-y-1.5 p-3 rounded-xl border-2 transition ${
                    fotoRetiranteUrl 
                      ? 'border-emerald-300 bg-emerald-50/40' 
                      : 'border-amber-400 bg-amber-50/40'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black text-slate-900 uppercase flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Foto do Pacote * (Obrigatória)</span>
                      </label>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        fotoRetiranteUrl 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                      }`}>
                        {fotoRetiranteUrl ? '✓ Foto Anexada' : 'Obrigatório'}
                      </span>
                    </div>

                    {!fotoRetiranteUrl ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-amber-900 font-bold">
                          A foto do pacote é obrigatória para registrar a retirada e liberar a entrega.
                        </p>
                        <label className="border-2 border-dashed border-amber-400 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition text-xs font-black text-slate-800 shadow-2xs active:scale-98">
                          <Camera className="w-5 h-5 text-emerald-600" />
                          <span>{uploadingFoto ? 'Enviando foto...' : '📷 Tirar Foto do Pacote'}</span>
                          <span className="text-[10px] text-slate-500 font-normal">Tire a foto do pacote ou comprovante</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="hidden" 
                            onChange={(e) => uploadFotoStorage(e.target.files ? e.target.files[0] : null, 'comprovantes_baixa', setFotoRetiranteUrl)} 
                            disabled={uploadingFoto} 
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-white p-2 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={fotoRetiranteUrl} alt="Foto do Pacote" loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-emerald-900 block truncate">✓ Foto do Pacote Registrada</span>
                            <span className="text-[10px] text-slate-500 block truncate">Comprovante anexado com sucesso</span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFotoRetiranteUrl('')} 
                          className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Tirar outra foto"
                        >
                          <X className="w-3.5 h-3.5" /> Tirar Outra
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. CAMPO DE ASSINATURA DIGITAL (APARECE APENAS DEPOIS QUE TIRAR A FOTO, COMO OPCIONAL) */}
                  {fotoRetiranteUrl ? (
                    <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5 text-purple-600" />
                          <span>Assinatura Digital (Opcional)</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Opcional
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Foto do pacote já registrada com sucesso. A assinatura digital na tela é opcional.
                      </p>
                      <CampoAssinaturaDigital
                        valor={assinaturaDigitalUrl}
                        onChange={setAssinaturaDigitalUrl}
                        onLimpar={() => setAssinaturaDigitalUrl('')}
                        nomeRetirante={nomeRetirante}
                        obrigatorio={false}
                        altura={140}
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-100/70 text-center text-xs text-slate-500 space-y-0.5">
                      <span className="font-bold text-slate-700 block">✍️ Campo de Assinatura Digital</span>
                      <span className="text-[11px] text-slate-500">Tire a foto obrigatória do pacote acima para liberar o campo opcional de assinatura.</span>
                    </div>
                  )}

                  {/* SOLICITAÇÃO DE RECURSO: BOTÃO / MENU 'ADICIONAR OPÇÕES' NA FINALIZAÇÃO DA ENTREGA */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setMostrarOpcoesBaixa(!mostrarOpcoesBaixa)}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer border border-slate-200"
                    >
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
                        <span>{mostrarOpcoesBaixa ? 'Ocultar Opções Adicionais' : '+ Adicionar Opções à Entrega'}</span>
                      </span>
                      {mostrarOpcoesBaixa ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>

                    {mostrarOpcoesBaixa && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">
                            Documento do Retirante (RG / CNH / CPF)
                          </label>
                          <input
                            type="text"
                            value={baixaDocRetirante}
                            onChange={(e) => setBaixaDocRetirante(e.target.value)}
                            placeholder="Ex: 12.345.678-9 ou CPF..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">
                            Vínculo / Parentesco com o Morador
                          </label>
                          <select
                            value={baixaParentesco}
                            onChange={(e) => setBaixaParentesco(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-bold focus:ring-2 focus:ring-slate-900"
                          >
                            <option value="Titular / Morador">Titular / Morador</option>
                            <option value="Cônjuge / Familiar">Cônjuge / Familiar</option>
                            <option value="Filho(a) / Dependente">Filho(a) / Dependente</option>
                            <option value="Funcionário(a) / Diarista">Funcionário(a) / Diarista</option>
                            <option value="Procurador Autorizado">Procurador Autorizado</option>
                            <option value="Vizinho com Autorização">Vizinho com Autorização</option>
                            <option value="Outro (Especificar em obs)">Outro (Especificar em obs)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">
                            Observação Adicional / Registro de Ocorrência
                          </label>
                          <input
                            type="text"
                            value={baixaObsEspecial}
                            onChange={(e) => setBaixaObsEspecial(e.target.value)}
                            placeholder="Ex: Embalagem violada antes da entrega, autorização via interfone..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-slate-900"
                          />
                        </div>

                        <label className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={baixaNotificarSupervisor}
                            onChange={(e) => setBaixaNotificarSupervisor(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-[11px] font-medium text-slate-700">
                            Sinalizar para auditoria / supervisão (alerta especial no dossiê)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl} 
                    className={`w-full font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-xs ${
                      loading || itensSelecionadosIds.length === 0 || !nomeRetirante.trim() || !fotoRetiranteUrl
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                    }`}
                  >
                    {loading ? 'Processando...' : !fotoRetiranteUrl ? (
                      <>
                        <Camera className="w-4 h-4 text-slate-600" />
                        <span>Tire a foto do pacote para liberar entrega</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" /> 
                        {itensSelecionadosIds.length > 0 
                          ? `Confirmar Entrega (${itensSelecionadosIds.length} ${itensSelecionadosIds.length === 1 ? 'volume' : 'volumes'})`
                          : 'Selecione ao menos 1 volume no checklist'}
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs text-center space-y-1">
                  <p className="font-bold">Nenhum pacote selecionado</p>
                  <p className="text-[11px] text-amber-700">Selecione ao menos um pacote na lista para efetuar a entrega.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR ENTREGADOR */}
      {modalNovoEntregador && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900">Novo Entregador</h3>
              <button onClick={() => setModalNovoEntregador(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={cadastrarEntregadorRapido} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Nome Completo *</label>
                <input type="text" required value={novoEntNome} onChange={e => setNovoEntNome(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Documento (RG/CPF)</label>
                <input type="text" value={novoEntDoc} onChange={e => setNovoEntDoc(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Empresa / Transportadora</label>
                <input type="text" value={novoEntEmpresa} onChange={e => setNovoEntEmpresa(e.target.value)} placeholder="Ex: Correios, Mercado Livre..." className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-slate-900" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl mt-2 transition">
                {loading ? 'Salvando...' : 'Salvar Entregador'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LEITOR DE CÓDIGO (COM SUPORTE A ESCANEAMENTO EM LOTE) */}
      {modalLeitor && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xs z-50 flex flex-col justify-between">
          {/* Header Superior do Leitor */}
          <div className="p-3 sm:p-4 flex justify-between items-center bg-slate-900/90 border-b border-slate-800 z-10 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <QrCode className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  {destinoLeitor === 'baixa' ? 'Escaneamento de Pacotes (Saída)' : 'Leitor de Código de Rastreio'}
                </h3>
                <p className="text-[10px] text-slate-300">
                  {destinoLeitor === 'baixa' 
                    ? 'Aponte a câmera para os pacotes para selecionar em lote'
                    : 'Aponte a câmera para o código de barras ou QR Code'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {destinoLeitor === 'baixa' && (
                <button
                  type="button"
                  onClick={() => setLeitorModoLote(!leitorModoLote)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    leitorModoLote 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Permite escanear vários pacotes seguidos sem fechar a câmera"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  {leitorModoLote ? 'Modo Lote: Ativo ✓' : 'Modo Lote: Desligado'}
                </button>
              )}

              <button 
                onClick={fecharLeitorCamera} 
                className="bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-lg transition cursor-pointer"
                title="Fechar Leitor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área Central da Câmera com Mira e Indicadores */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
            {erroCamera ? (
              <div className="text-white text-center p-6 bg-red-900/50 rounded-xl m-4 border border-red-500 max-w-sm">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                <p className="text-sm font-bold">{erroCamera}</p>
                <p className="text-xs mt-2 text-red-200">Verifique as permissões de câmera do seu navegador.</p>
              </div>
            ) : (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                
                {/* Mira central de escaneamento */}
                <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-40 border-2 border-emerald-500 bg-transparent rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br"></div>
                    <div className="w-full h-0.5 bg-emerald-500/50 absolute top-1/2 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                  </div>
                </div>

                {/* Banner flutuante com feedback do último pacote bipado em lote */}
                {destinoLeitor === 'baixa' && (
                  <div className="absolute top-4 left-4 right-4 flex flex-col items-center gap-2 pointer-events-none">
                    {ultimoPacoteBipado && (
                      <div className="bg-emerald-950/90 text-emerald-200 border border-emerald-500 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Bipado: {ultimoPacoteBipado.codigo_barras || 'S/ Rastreio'} ({formatarIdentificacaoUnidade(ultimoPacoteBipado.unidade, ultimoPacoteBipado.bloco, condoConfig?.tipo_estrutura)})
                        </span>
                      </div>
                    )}

                    <div className="bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1 rounded-full text-[11px] font-black border border-slate-700 shadow-sm flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{itensSelecionadosIds.length} volume(s) selecionado(s) no lote</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Rodapé do Leitor com Ação de Conclusão */}
          <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 text-center flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
            <p className="text-slate-300 text-xs">
              {destinoLeitor === 'baixa' 
                ? 'Posicione o código de barras no centro da mira. O sistema selecionará automaticamente cada pacote em lote.'
                : 'A câmera lerá automaticamente o código de barras ou QR Code do pacote.'}
            </p>

            {destinoLeitor === 'baixa' && (
              <button
                type="button"
                onClick={fecharLeitorCamera}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Concluir Escaneamento ({itensSelecionadosIds.length} selecionados)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL ALTERAR / MOVER LOCAL FÍSICO DE ENCOMENDAS */}
      {modalMoverLocal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {moverEmLoteSelecionados ? 'Mover Encomendas Selecionadas' : 'Alterar Local de Armazenamento'}
                  </h3>
                  <p className="text-xs text-slate-500">Reorganização física dos pacotes na portaria</p>
                </div>
              </div>
              <button 
                onClick={() => setModalMoverLocal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do item / lote */}
            {moverEmLoteSelecionados ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs space-y-1 text-emerald-950 font-medium">
                <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-700" />
                  {itensSelecionadosIds.length} pacote(s) selecionado(s)
                </p>
                <p className="text-[11px] text-emerald-800">
                  Todos os pacotes selecionados serão movidos em lote para o novo local escolhido abaixo.
                </p>
              </div>
            ) : itemParaMover ? (
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between items-center">
                  <strong className="text-slate-900 text-sm">
                    {formatarIdentificacaoUnidade(itemParaMover.unidade, itemParaMover.bloco, condoConfig?.tipo_estrutura)}
                  </strong>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-mono">
                    {itemParaMover.codigo_barras || 'Sem rastreio'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Destinatário: <strong>{itemParaMover.moradores?.nome || 'Morador'}</strong>
                </p>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  Local Atual: <strong>{itemParaMover.local_armazenamento || 'Bancada Principal'}</strong>
                </p>
              </div>
            ) : null}

            {/* Seleção do Novo Local */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase">
                Selecione o Novo Local Físico de Guarda *
              </label>
              <select
                value={novoLocalSelecionado}
                onChange={(e) => setNovoLocalSelecionado(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
              >
                {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                  const valor = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                  return (
                    <option key={loc.id || loc.codigo || loc} value={valor}>
                      📦 {valor} {loc.categoria ? `(${loc.categoria})` : ''}
                    </option>
                  );
                })}
                {locaisArmazenamento.length === 0 && (
                  <>
                    <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                    <option value="Chão / Caixas Grandes">📦 Chão / Caixas Grandes</option>
                  </>
                )}
              </select>
            </div>

            {/* Checkbox Agrupar todos da mesma unidade */}
            {!moverEmLoteSelecionados && itemParaMover && (
              <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={moverTodosDaUnidade}
                  onChange={(e) => setMoverTodosDaUnidade(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5"
                />
                <div>
                  <span className="font-bold block">
                    Agrupar todas as encomendas de {formatarIdentificacaoUnidade(itemParaMover.unidade, itemParaMover.bloco, condoConfig?.tipo_estrutura)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Conforme chegam novos pacotes, move todos para ficarem juntos no mesmo local físico.
                  </span>
                </div>
              </label>
            )}

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMoverLocal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl text-xs transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={executarMudancaLocal}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl text-xs uppercase shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Confirmar Novo Local'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4ª ETAPA — DOSSIÊ AUDITÁVEL DE ENCOMENDAS (HISTÓRICO COM FOTOS DE RECEBIMENTO E ENTREGA) */}
      {etapa === '4' && (
        !podeVerDossie ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Dossiê de Auditoria</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              O acesso ao Dossiê Completo, histórico sequencial e fotos de auditabilidade é restrito a perfis autorizados (Master, Supervisor ou Administrador) para garantir a integridade das auditorias.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {/* BARRA SUPERIOR DO DOSSIÊ COM RETORNO PARA ENCOMENDAS PENDENTES */}
          <div className="flex items-center justify-between bg-purple-50 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold text-purple-950">Dossiê de Encomendas (DOCI) & Auditoria</span>
            </div>
            <button
              type="button"
              onClick={() => setEtapa('3')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-950 border border-purple-300 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
              title="Voltar para a tela principal de encomendas pendentes"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar para Encomendas Pendentes</span>
            </button>
          </div>
          {/* Filtros e Busca Rápida com Seleção de Tipo (Unidade como padrão) igual Saída/Baixa */}
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5 shrink-0">
                  <FileText className="w-4 h-4 text-purple-700" /> Dossiê Auditável
                </span>

                {/* Lista seletora com o que deve ser buscado (Unidade padrão) igual busca de baixa */}
                <select
                  value={tipoFiltroBuscaDossie}
                  onChange={(e) => setTipoFiltroBuscaDossie(e.target.value as any)}
                  className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-800 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-700 transition cursor-pointer shrink-0"
                  title="Filtrar tipo de pesquisa no dossiê"
                >
                  <option value="unidade">🏠 UNIDADE</option>
                  <option value="todos">🔍 TODOS</option>
                  <option value="nome">👤 MORADOR</option>
                  <option value="rastreio">📦 RASTREIO</option>
                  <option value="bloco">🏢 BLOCO / TORRE</option>
                  <option value="retirante">✍️ RETIRANTE</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {/* Input com botão de pesquisa embutido (Buscar) */}
                <div className="relative flex-1 sm:w-64 min-w-[160px] flex items-center">
                  <input
                    type="text"
                    value={buscaDossie}
                    onChange={(e) => setBuscaDossie(e.target.value)}
                    placeholder={
                      tipoFiltroBuscaDossie === 'unidade'
                        ? (eEstruturaCasas ? "Casa (ex: 01, 14)..." : "Unidade (ex: 101, B2)...")
                        : tipoFiltroBuscaDossie === 'nome'
                        ? "Nome do morador..."
                        : tipoFiltroBuscaDossie === 'rastreio'
                        ? "Código de rastreio ou RE..."
                        : tipoFiltroBuscaDossie === 'bloco'
                        ? "Bloco ou Torre..."
                        : tipoFiltroBuscaDossie === 'retirante'
                        ? "Quem retirou..."
                        : "Unidade, morador, rastreio..."
                    }
                    className="pl-3 pr-9 py-1.5 w-full bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-700 transition font-medium"
                  />

                  {/* Botão de Pesquisa DENTRO da barra: só o ícone */}
                  <button
                    type="button"
                    className="absolute right-1 top-1 bottom-1 px-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-md flex items-center justify-center transition cursor-pointer shadow-xs"
                    title="Buscar"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Botão de Limpar com o ícone da borracha em vermelho igual baixa */}
                <button
                  type="button"
                  onClick={() => setBuscaDossie('')}
                  className={`p-2 rounded-lg transition flex items-center justify-center shrink-0 cursor-pointer border ${
                    buscaDossie
                      ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-300 shadow-2xs'
                      : 'bg-white hover:bg-red-50 text-red-500 border-red-200'
                  }`}
                  title="Limpar pesquisa (Borracha)"
                >
                  <Eraser className="w-4 h-4 text-red-600" />
                </button>

                {/* Botão Atualizar Dossiê - Apenas o ícone */}
                <button
                  type="button"
                  onClick={carregarDossie}
                  disabled={loadingDossie}
                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center justify-center shadow-xs active:scale-95 cursor-pointer shrink-0"
                  title="Atualizar Dossiê"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDossie ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Linha de Filtros compacta: Status ocupando menos espaço e Período (Todos, Hoje, Personalizado) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              {/* Status com layout compacto para ocupar menos espaço */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Status:
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFiltroStatusDossie('todos')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroStatusDossie === 'todos' ? 'bg-purple-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({itensDossie.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusDossie('entregue')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroStatusDossie === 'entregue' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Entregues ({itensDossie.filter(i => i.status === 'entregue').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusDossie('retido')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroStatusDossie === 'retido' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Retidos ({itensDossie.filter(i => i.status !== 'entregue').length})
                  </button>
                </div>
              </div>

              {/* Período: apenas Todos, Hoje e Personalizado */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Período:
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodoDossie('todos')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroPeriodoDossie === 'todos' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodoDossie('hoje')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroPeriodoDossie === 'hoje' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroPeriodoDossie('personalizado')}
                    className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                      filtroPeriodoDossie === 'personalizado' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {filtroPeriodoDossie === 'personalizado' && (
                  <div className="flex items-center gap-1 text-[11px] bg-purple-50 p-1 rounded-lg border border-purple-200">
                    <span className="text-purple-900 font-bold">De:</span>
                    <input
                      type="date"
                      value={dataInicioPersonalizadaDossie}
                      onChange={(e) => setDataInicioPersonalizadaDossie(e.target.value)}
                      className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] text-slate-800 font-medium focus:ring-1 focus:ring-purple-600"
                    />
                    <span className="text-purple-900 font-bold">Até:</span>
                    <input
                      type="date"
                      value={dataFimPersonalizadaDossie}
                      onChange={(e) => setDataFimPersonalizadaDossie(e.target.value)}
                      className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] text-slate-800 font-medium focus:ring-1 focus:ring-purple-600"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Listagem em Cards de Dossiê */}
          {loadingDossie ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Carregando arquivo de dossiês e fotos...
            </div>
          ) : (
            (() => {
              const itensFiltrados = itensDossie.filter((item) => {
                // Filtro status
                if (filtroStatusDossie === 'entregue' && item.status !== 'entregue') return false;
                if (filtroStatusDossie === 'retido' && item.status === 'entregue') return false;

                // Filtro período
                if (filtroPeriodoDossie === 'hoje') {
                  const hojeStr = new Date().toISOString().slice(0, 10);
                  const dtStr = (item.data_retirada || item.created_at || '').slice(0, 10);
                  if (dtStr !== hojeStr) return false;
                } else if (filtroPeriodoDossie === 'personalizado') {
                  const dtStr = (item.data_retirada || item.created_at || '').slice(0, 10);
                  if (dataInicioPersonalizadaDossie && dtStr < dataInicioPersonalizadaDossie) return false;
                  if (dataFimPersonalizadaDossie && dtStr > dataFimPersonalizadaDossie) return false;
                }

                // Filtro texto conforme tipo selecionado (Unidade por padrão)
                if (buscaDossie.trim()) {
                  const termo = buscaDossie.trim().toLowerCase();
                  const und = (item.unidade || '').toString().toLowerCase();
                  const blc = (item.bloco || '').toString().toLowerCase();
                  const cod = (item.codigo_barras || item.codigo_rastreio || item.rastreio || '').toLowerCase();
                  const reCod = (item.lotes_re?.codigo_re || '').toLowerCase();
                  const mor = (item.moradores?.nome || '').toLowerCase();
                  const ret = (item.retirado_por || '').toLowerCase();
                  const op = (item.operador_baixa_id || '').toLowerCase();
                  const loc = (item.local_armazenamento || '').toLowerCase();

                  if (tipoFiltroBuscaDossie === 'unidade') {
                    if (!und.includes(termo)) return false;
                  } else if (tipoFiltroBuscaDossie === 'nome') {
                    if (!mor.includes(termo)) return false;
                  } else if (tipoFiltroBuscaDossie === 'rastreio') {
                    if (!cod.includes(termo) && !reCod.includes(termo)) return false;
                  } else if (tipoFiltroBuscaDossie === 'bloco') {
                    if (!blc.includes(termo)) return false;
                  } else if (tipoFiltroBuscaDossie === 'retirante') {
                    if (!ret.includes(termo)) return false;
                  } else {
                    const match = und.includes(termo) || blc.includes(termo) || cod.includes(termo) || reCod.includes(termo) || mor.includes(termo) || ret.includes(termo) || op.includes(termo) || loc.includes(termo);
                    if (!match) return false;
                  }
                }

                return true;
              });

              if (itensFiltrados.length === 0) {
                return (
                  <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    Nenhum pacote encontrado com os filtros selecionados.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {itensFiltrados.map((item) => {
                    const estaEntregue = item.status === 'entregue';
                    const rastreioExibicao = item.codigo_barras || item.codigo_rastreio || item.rastreio || (item.lotes_re?.codigo_re ? `Lote ${item.lotes_re.codigo_re}` : null);
                    const fotosAbertas = Boolean(itensFotosExpandidasDossie[item.id]);

                    return (
                      <div 
                        key={item.id} 
                        className={`bg-white rounded-xl border p-2.5 sm:p-3 shadow-2xs space-y-2 transition hover:shadow-xs ${
                          estaEntregue ? 'border-emerald-200' : 'border-amber-200'
                        }`}
                      >
                        {/* Cabeçalho do Card Compacto */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                {formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                ({item.moradores?.nome || 'Morador'})
                              </span>
                            </div>

                            <div className="flex items-center gap-1 mt-0.5 flex-wrap text-[10px]">
                              {rastreioExibicao ? (
                                <span className="bg-purple-50 text-purple-900 font-mono font-bold px-1.5 py-0.2 rounded border border-purple-200 truncate max-w-[160px]" title={rastreioExibicao}>
                                  #{rastreioExibicao}
                                </span>
                              ) : (
                                <span className="italic text-slate-400">Sem rastreio</span>
                              )}

                              {item.lotes_re?.codigo_re && (
                                <span className="bg-slate-100 text-slate-700 font-bold px-1 py-0.2 rounded border border-slate-200">
                                  RE {item.lotes_re.codigo_re}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase shrink-0 flex items-center gap-1 ${
                            estaEntregue ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {estaEntregue ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <Clock className="w-2.5 h-2.5 text-amber-600" />}
                            {estaEntregue ? 'Entregue' : 'Retido'}
                          </span>
                        </div>

                        {/* Corpo do Card: Resumo em texto ou Fotos expandidas */}
                        {fotosAbertas ? (
                          <div className="space-y-1.5 bg-slate-50/80 p-2 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700 flex items-center gap-1 text-[10px] uppercase">
                                <Camera className="w-3 h-3 text-purple-600" /> Fotos Auditáveis
                              </span>
                              <button
                                type="button"
                                onClick={() => setItensFotosExpandidasDossie(prev => ({ ...prev, [item.id]: false }))}
                                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 cursor-pointer"
                              >
                                <ChevronUp className="w-3 h-3" /> Ocultar
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              {/* Foto 1: Recebimento */}
                              <div className="space-y-1">
                                <span className="font-bold text-purple-900 block truncate">1. Recebimento</span>
                                <div 
                                  onClick={() => item.foto_etiqueta_url && setModalFotoAmpliada(item.foto_etiqueta_url)}
                                  className="h-20 bg-slate-200 rounded-md overflow-hidden flex items-center justify-center cursor-pointer border border-slate-300 relative group"
                                >
                                  {item.foto_etiqueta_url ? (
                                    <>
                                      <img src={item.foto_etiqueta_url} alt="Etiqueta" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[8.5px] font-bold px-1 rounded flex items-center gap-0.5">
                                        <Eye className="w-2 h-2" /> Ver
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 text-[9px]">Sem foto</span>
                                  )}
                                </div>
                                <div className="text-[9.5px] text-slate-500 leading-tight truncate">
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>

                              {/* Foto 2: Saída */}
                              <div className="space-y-1">
                                <span className="font-bold text-emerald-900 block truncate">2. Entrega</span>
                                <div 
                                  onClick={() => item.foto_retirada_url && setModalFotoAmpliada(item.foto_retirada_url)}
                                  className="h-20 bg-slate-200 rounded-md overflow-hidden flex items-center justify-center cursor-pointer border border-slate-300 relative group"
                                >
                                  {item.foto_retirada_url ? (
                                    <>
                                      <img src={item.foto_retirada_url} alt="Comprovante" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition" />
                                      <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[8.5px] font-bold px-1 rounded flex items-center gap-0.5">
                                        <Eye className="w-2 h-2" /> Ver
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-slate-400 text-[9px]">{estaEntregue ? 'Sem foto' : 'Aguardando'}</span>
                                  )}
                                </div>
                                <div className="text-[9.5px] text-slate-500 leading-tight truncate">
                                  {estaEntregue ? (
                                    <span>{new Date(item.data_retirada).toLocaleDateString('pt-BR')} • {item.retirado_por || 'Morador'}</span>
                                  ) : (
                                    <span className="text-amber-700 italic">No posto</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-200/80 text-[10.5px] space-y-0.5 leading-snug">
                            <div className="truncate text-slate-600">
                              <span className="font-bold text-purple-900 text-[10px] uppercase">Entrada:</span> {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <strong>{item.local_armazenamento || 'Escaninho'}</strong>
                            </div>
                            <div className="truncate text-slate-600">
                              {estaEntregue ? (
                                <>
                                  <span className="font-bold text-emerald-900 text-[10px] uppercase">Saída:</span> {new Date(item.data_retirada).toLocaleDateString('pt-BR')} {new Date(item.data_retirada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <strong className="text-slate-800">{item.retirado_por}</strong>
                                </>
                              ) : (
                                <span className="text-amber-700 italic">📦 Aguardando retirada na guarita</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Barra de Ações Compacta */}
                        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setItensFotosExpandidasDossie(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                                fotosAbertas 
                                  ? 'bg-purple-50 text-purple-800 border-purple-200' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                              title={fotosAbertas ? "Ocultar fotos" : "Ver fotos"}
                            >
                              <Camera className="w-3 h-3 text-purple-600" />
                              <span>{fotosAbertas ? 'Ocultar' : 'Fotos'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setItemModalDossie(item)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-2xs cursor-pointer"
                              title="Visualizar Dossiê Completo"
                            >
                              <FileText className="w-3 h-3" /> Dossiê
                            </button>
                          </div>

                          {estaEntregue && (
                            <button
                              type="button"
                              onClick={() => {
                                const tel = item.moradores?.telefone?.replace(/\D/g, '') || '';
                                const dataStr = new Date(item.data_retirada).toLocaleString('pt-BR');
                                const msg = `📦 *COMPROVANTE DE ENTREGA DE ENCOMENDA - INFPORT*\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `🏢 *Unidade:* ${formatarIdentificacaoUnidade(item.unidade, item.bloco, condoConfig?.tipo_estrutura)}\n` +
                                  `👤 *Destinatário Cadastrado:* ${item.moradores?.nome || 'Morador'}\n` +
                                  `🏷️ *Código de Rastreio:* ${item.codigo_barras || 'S/ Código'}\n` +
                                  `✅ *Status:* ENTREGUE COM SUCESSO\n` +
                                  `👤 *Retirado Por:* ${item.retirado_por}\n` +
                                  `📅 *Data e Hora da Baixa:* ${dataStr}\n` +
                                  `🛡️ *Operador Responsável:* ${item.operador_baixa_id || 'Portaria'}\n` +
                                  `📸 *Fotos Arquivadas:* Foto da etiqueta no recebimento e foto do retirante arquivadas no sistema da portaria.\n` +
                                  `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                                  `_Dossiê arquivado para sua total segurança._`;
                                const link = `https://wa.me/${tel ? (tel.startsWith('55') ? tel : '55' + tel) : ''}?text=${encodeURIComponent(msg)}`;
                                window.open(link, '_blank');
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-2xs cursor-pointer shrink-0"
                              title="Enviar comprovante via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
        )
      )}

      {/* MODAL DE DOSSIÊ COMPLETO DE AUDITORIA DE ENCOMENDA */}
      {itemModalDossie && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              type="button"
              onClick={() => setItemModalDossie(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Cabeçalho do Dossiê */}
            <div className="border-b pb-3 pr-8 space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Dossiê Oficial de Auditoria & Custódia
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Encomenda {formatarIdentificacaoUnidade(itemModalDossie.unidade, itemModalDossie.bloco, condoConfig?.tipo_estrutura)}
              </h3>
              <p className="text-xs text-slate-500">
                Morador: <strong>{itemModalDossie.moradores?.nome || 'Não cadastrado'}</strong> • Telefone: {itemModalDossie.moradores?.telefone || 'S/ Tel'} • Código: <strong>{itemModalDossie.codigo_barras || 'S/ Rastreio'}</strong>
              </p>
            </div>

            {/* Conteúdo do Dossiê */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Linha do Tempo de Custódia */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-black uppercase text-slate-700 block">
                  Linha do Tempo da Custódia:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-purple-700 uppercase block">1. Entrada no Posto</span>
                    <strong className="text-slate-900 text-xs block">{new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}</strong>
                    <span className="text-[10px] text-slate-500">Lote: {itemModalDossie.lotes_re?.codigo || 'RE Portaria'}</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-blue-700 uppercase block">2. Triagem Física</span>
                    <strong className="text-slate-900 text-xs block">{itemModalDossie.local_armazenamento || 'Escaninho Padrão'}</strong>
                    <span className="text-[10px] text-slate-500">Local de Guarda</span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    itemModalDossie.status === 'entregue' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <span className="text-[10px] font-bold uppercase block text-emerald-800">
                      3. Saída / Entrega
                    </span>
                    {itemModalDossie.status === 'entregue' ? (
                      <>
                        <strong className="text-emerald-950 text-xs block">{new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')}</strong>
                        <span className="text-[10px] text-emerald-700">Para: <strong>{itemModalDossie.retirado_por}</strong></span>
                      </>
                    ) : (
                      <span className="text-amber-800 font-bold">Aguardando Retirada</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Comparativo de Fotos em Alta Resolução */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Foto 1 */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <strong className="text-xs font-black text-purple-950 uppercase flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" /> Foto 1: Recebimento na Portaria (Etiqueta)
                  </strong>

                  <div className="bg-slate-900 rounded-xl overflow-hidden h-56 flex items-center justify-center border border-slate-300">
                    {itemModalDossie.foto_etiqueta_url ? (
                      <img src={itemModalDossie.foto_etiqueta_url} alt="Etiqueta no Recebimento" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-500 text-center text-xs">
                        <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        Sem foto de etiqueta arquivada
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Foto tirada no momento da entrada da carga pelo operador para conferência da integridade da embalagem.
                  </p>
                </div>

                {/* Foto 2 */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <strong className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" /> Foto 2: Comprovante de Entrega ao Morador
                  </strong>

                  <div className="bg-slate-900 rounded-xl overflow-hidden h-56 flex items-center justify-center border border-slate-300">
                    {itemModalDossie.foto_retirada_url ? (
                      <img src={itemModalDossie.foto_retirada_url} alt="Comprovante de Saída" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-500 text-center text-xs p-4">
                        <Clock className="w-8 h-8 mx-auto mb-1 text-amber-500 opacity-60" />
                        Ainda não entregue. A foto do comprovante será registrada quando o morador retirar.
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {itemModalDossie.status === 'entregue' ? (
                      <>Comprovante registrado pelo operador <strong>{itemModalDossie.operador_baixa_id || 'Portaria'}</strong> no ato da entrega a <strong>{itemModalDossie.retirado_por}</strong>.</>
                    ) : (
                      'Pacote em custódia na portaria aguardando retirada pelo morador.'
                    )}
                  </p>
                </div>

                {/* Assinatura Digital Coletada (se houver e for distinta da foto de saída) */}
                {itemModalDossie.foto_comprovante_url && itemModalDossie.foto_comprovante_url !== itemModalDossie.foto_retirada_url && (
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 space-y-2 sm:col-span-2">
                    <strong className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-emerald-700" /> Assinatura Digital do Retirante
                    </strong>
                    <div className="bg-white rounded-xl overflow-hidden h-36 flex items-center justify-center border border-emerald-300 p-2">
                      <img src={itemModalDossie.foto_comprovante_url} alt="Assinatura Digital" loading="lazy" decoding="async" className="max-h-32 object-contain" />
                    </div>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Assinatura capturada na tela da portaria no ato da entrega para <strong>{itemModalDossie.retirado_por}</strong>.
                    </p>
                  </div>
                )}
              </div>

              {/* Relatório Texto Formatado */}
              <div className="bg-slate-950 p-3.5 rounded-2xl text-slate-200 font-mono text-[11px] space-y-1 border border-slate-800">
                <div className="text-emerald-400 font-bold">DOSSIÊ INFPORT — REGISTRO DE AUDITORIA DE ENCOMENDA</div>
                <div>ID: {itemModalDossie.id}</div>
                <div>DESTINO: {formatarIdentificacaoUnidade(itemModalDossie.unidade, itemModalDossie.bloco, condoConfig?.tipo_estrutura)}</div>
                <div>MORADOR TITULAR: {itemModalDossie.moradores?.nome || 'Não informado'} ({itemModalDossie.moradores?.telefone || 'S/ Tel'})</div>
                <div>CÓDIGO DE RASTREIO: {itemModalDossie.codigo_barras || itemModalDossie.codigo_rastreio || itemModalDossie.rastreio || (itemModalDossie.lotes_re?.codigo_re ? `Lote RE ${itemModalDossie.lotes_re.codigo_re}` : 'Sem código')}</div>
                <div>LOCAL DE GUARDA: {itemModalDossie.local_armazenamento || 'Escaninho'}</div>
                <div>ENTRADA NA PORTARIA: {new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}</div>
                <div>STATUS: {itemModalDossie.status?.toUpperCase()}</div>
                {itemModalDossie.status === 'entregue' && (
                  <>
                    <div className="text-emerald-300">ENTREGUE PARA: {itemModalDossie.retirado_por}</div>
                    <div className="text-emerald-300">DATA DA ENTREGA: {new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')}</div>
                    <div className="text-emerald-300">OPERADOR RESPONSÁVEL: {itemModalDossie.operador_baixa_id || 'Portaria'}</div>
                  </>
                )}
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const codDossie = itemModalDossie.codigo_barras || itemModalDossie.codigo_rastreio || itemModalDossie.rastreio || (itemModalDossie.lotes_re?.codigo_re ? `RE ${itemModalDossie.lotes_re.codigo_re}` : 'S/ Código');
                  const labelDestino = formatarIdentificacaoUnidade(itemModalDossie.unidade, itemModalDossie.bloco, condoConfig?.tipo_estrutura);
                  const texto = `DOSSIÊ DE ENCOMENDA - INFPORT\n` +
                    `${labelDestino} - Morador: ${itemModalDossie.moradores?.nome || 'N/A'}\n` +
                    `Código de Rastreio: ${codDossie}\n` +
                    `Status: ${itemModalDossie.status === 'entregue' ? 'ENTREGUE' : 'RETIDO'}\n` +
                    `Entrada: ${new Date(itemModalDossie.created_at).toLocaleString('pt-BR')}\n` +
                    (itemModalDossie.status === 'entregue' ? `Entregue em: ${new Date(itemModalDossie.data_retirada).toLocaleString('pt-BR')} para ${itemModalDossie.retirado_por} por ${itemModalDossie.operador_baixa_id}\n` : '') +
                    `Fotos arquivadas no sistema da portaria.`;
                  navigator.clipboard.writeText(texto);
                  setCopiadoDossie(true);
                  setTimeout(() => setCopiadoDossie(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiadoDossie ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                {copiadoDossie ? 'Copiado!' : 'Copiar Texto do Dossiê'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setItemModalDossie(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR FOTO DA ETIQUETA / PACOTE EM ALTA RESOLUÇÃO */}
      {modalFotoAmpliada && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-60 flex items-center justify-center p-3 sm:p-4 cursor-pointer animate-in fade-in duration-150"
          onClick={() => setModalFotoAmpliada(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full p-3 sm:p-4 space-y-3 shadow-2xl overflow-hidden cursor-default animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Foto da Etiqueta / Pacote
              </h4>
              <button 
                type="button" 
                onClick={() => setModalFotoAmpliada(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center bg-slate-100 rounded-xl overflow-hidden max-h-[70vh] border border-slate-200">
              <img src={modalFotoAmpliada} alt="Etiqueta Ampliada" loading="lazy" decoding="async" className="w-full h-auto object-contain max-h-[70vh]" />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalFotoAmpliada(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LOTE DE RE */}
      {loteEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>Editar Lote {loteEmEdicao.codigo_re}</span>
              </h4>
              <button
                type="button"
                onClick={() => setLoteEmEdicao(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoLoteRE} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Quantidade Declarada de Volumes *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editQtdDeclarada}
                  onChange={(e) => setEditQtdDeclarada(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Entregador / Transportadora *
                </label>
                <select
                  value={editEntregadorId}
                  onChange={(e) => setEditEntregadorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Selecione o entregador...</option>
                  {entregadores.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nome} {ent.empresa ? `(${ent.empresa})` : ''} - Doc: {ent.documento || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoteEmEdicao(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE LOTE DE RE */}
      {loteParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-red-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-red-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Excluir Lote {loteParaExcluir.codigo_re}</span>
              </h4>
              <button
                type="button"
                onClick={() => setLoteParaExcluir(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900">
                Tem certeza que deseja excluir permanentemente o lote <span className="font-mono text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-200">{loteParaExcluir.codigo_re}</span>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-950">
                <p>• <strong>Entregador:</strong> {loteParaExcluir.entregadores?.nome || 'N/A'}</p>
                <p>• <strong>Volumes Declarados:</strong> {loteParaExcluir.qtd_declarada}</p>
                <p>• <strong>Volumes Já Triados:</strong> {loteParaExcluir.qtd_triada}</p>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Esta ação é destinada a corrigir lotes gerados incorretamente e será registrada no Histórico de Auditoria.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setLoteParaExcluir(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusaoLoteRE}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PACOTE RETIDO (PROTEGIDO POR RBAC) */}
      {pacoteEmEdicao && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-emerald-600" />
                <span>Editar Pacote Retido</span>
              </h4>
              <button
                type="button"
                onClick={() => setPacoteEmEdicao(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicaoPacote} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {!eEstruturaCasas && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      {rotuloBloco}
                    </label>
                    <input
                      type="text"
                      value={editPacoteBloco}
                      onChange={(e) => setEditPacoteBloco(e.target.value)}
                      placeholder="Bloco / Torre"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
                <div className={`space-y-1 ${eEstruturaCasas ? 'col-span-2' : ''}`}>
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    {rotuloUnidade} *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPacoteUnidade}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditPacoteUnidade(/^0+[1-9]\d+.*$/.test(v.trim()) ? v.trim().replace(/^0+/, '') : v);
                    }}
                    onBlur={() => setEditPacoteUnidade(autoCorrigirZeroEsquerda(editPacoteUnidade))}
                    placeholder="Unidade"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Código de Barras / Rastreio
                </label>
                <input
                  type="text"
                  value={editPacoteCodigo}
                  onChange={(e) => setEditPacoteCodigo(e.target.value)}
                  placeholder="Código de barras..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Local de Armazenamento *
                </label>
                <select
                  value={editPacoteLocal}
                  onChange={(e) => setEditPacoteLocal(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                    const valor = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                    return (
                      <option key={loc.id || loc.codigo || loc} value={valor}>
                        📦 {valor}
                      </option>
                    );
                  })}
                  {locaisArmazenamento.length === 0 && (
                    <option value="Bancada Principal">📦 Bancada Principal</option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Observações
                </label>
                <input
                  type="text"
                  value={editPacoteObs}
                  onChange={(e) => setEditPacoteObs(e.target.value)}
                  placeholder="Observações do pacote..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPacoteEmEdicao(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE PACOTE RETIDO (PROTEGIDO POR RBAC) */}
      {pacoteParaExcluir && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 border-2 border-red-100">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-red-900 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Excluir Pacote Retido</span>
              </h4>
              <button
                type="button"
                onClick={() => setPacoteParaExcluir(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p className="font-bold text-slate-900">
                Tem certeza que deseja excluir o pacote da unidade{' '}
                <span className="font-mono text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-200">
                  {formatarIdentificacaoUnidade(pacoteParaExcluir.unidade, pacoteParaExcluir.bloco, condoConfig?.tipo_estrutura)}
                </span>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-red-950">
                <p>• <strong>Código / Rastreio:</strong> {pacoteParaExcluir.codigo_barras || 'Sem código'}</p>
                <p>• <strong>Local Físico:</strong> {pacoteParaExcluir.local_armazenamento || 'Bancada Principal'}</p>
                <p>• <strong>Destinatário:</strong> {pacoteParaExcluir.moradores?.nome || 'Não vinculado'}</p>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Esta exclusão será registrada no histórico de auditoria e ajustará os volumes pendentes do lote RE correspondente.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPacoteParaExcluir(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarExclusaoPacote}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BOTÃO FLUTUANTE (FAB) DE + NO CANTO INFERIOR DIREITO PARA NOVAS ENTRADAS */}
      <button
        type="button"
        onClick={iniciarEntradaComCamera}
        className="fixed bottom-20 md:bottom-12 right-6 z-40 transition-all duration-200 flex items-center justify-center border-2 border-white/80 rounded-full p-4 shadow-2xl group bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white hover:scale-110 cursor-pointer ring-4 ring-emerald-500/35 hover:shadow-emerald-950/40"
        title="Nova Entrada de Encomenda: Abrir Câmera e Ler Código (+)"
        aria-label="Nova Entrada de Encomenda"
      >
        <Plus className="w-7 h-7 stroke-[2.8] group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* MODAL: ENTRADA DE ENCOMENDAS (SUBSTITUINDO TRIAGEM - SEM SELEÇÃO DE LOTE RE) */}
      {modalEntradaAberta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 my-auto max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    Entrada de Encomendas
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEntradaAberta(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Fechar formulário de entrada"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              <form onSubmit={salvarItemEntrada} className="space-y-3">
                {/* Seletor de Condomínio caso o usuário tenha múltiplos ou perfil global */}
                {isGlobal && listaCondominios.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">Condomínio *</label>
                    <select
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                      value={condominioNovoLoteId}
                      onChange={(e) => {
                        const novoId = e.target.value;
                        setCondominioNovoLoteId(novoId);
                        carregarLocais(novoId);
                        supabase.from('moradores').select('*').eq('condominio_id', novoId).order('nome').then(({ data }) => {
                          if (data) setMoradores(data);
                        });
                      }}
                    >
                      <option value="">Selecione o condomínio...</option>
                      {listaCondominios.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {eEstruturaCasas ? (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-600" /> Bloco / Tipo
                      </label>
                      <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-black flex items-center justify-between">
                        <span>🏠 Casa</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">Automático</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        {rotuloBloco} {eEstruturaTorres ? '*' : ''}
                      </label>
                      <select
                        value={blocoTriagem}
                        onChange={(e) => buscarMoradoresEChecarAgrupamento(unidadeTriagem, e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                      >
                        <option value="">{eEstruturaTorres ? 'Selecione a Torre...' : 'Selecione o Bloco...'}</option>
                        {blocosDisponiveis.map((b: any) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between">
                      <span>{rotuloUnidade} *</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={unidadeTriagem}
                      onChange={(e) => handleDigitarUnidadeTriagem(e.target.value)}
                      onBlur={handleBlurUnidadeTriagem}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleBlurUnidadeTriagem();
                        }
                      }}
                      placeholder={eEstruturaCasas ? "Ex: 01 ou 117" : "Ex: 01 ou 101"}
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                  </div>
                </div>

                {/* SELETOR DE DESTINATÁRIO */}
                {moradoresDaUnidade.length > 0 && (
                  <div className="space-y-1 bg-blue-50/80 p-2 rounded-xl border border-blue-200">
                    <label className="block text-[10px] font-bold text-blue-800 uppercase">Destinatário (Morador)</label>
                    <select
                      className="w-full p-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-800"
                      onChange={(e) => setMoradorSelecionado(moradoresDaUnidade.find(m => m.id === e.target.value))}
                      value={moradorSelecionado?.id || ''}
                    >
                      {moradoresDaUnidade.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} (Tel: {m.telefone || 'Sem tel'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* LOCAL DE ARMAZENAMENTO E ALERTA DE AGRUPAMENTO (INTEGRADOS ABAIXO DO DESTINATÁRIO) */}
                {alertaAgrupamento ? (
                  <div className="bg-amber-50 text-amber-950 p-2.5 rounded-xl border border-amber-300 shadow-2xs space-y-2">
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        <div className="text-[11px] leading-tight">
                          <p className="font-bold text-amber-900">
                            Já existem {alertaAgrupamento.qtd} pacote(s) retido(s) para unidade.
                          </p>
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            <span className="text-amber-800 font-semibold">Local atual:</span>
                            {alertaAgrupamento.locais && alertaAgrupamento.locais.map((loc: string, idx: number) => {
                              const sigla = loc ? loc.split(' - ')[0].trim() : loc;
                              return (
                                <span key={idx} className="bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded font-mono font-bold text-[10px]" title={loc}>
                                  {sigla}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SELETOR DE LOCAL INTEGRADO DENTRO DO ALERTA DE AGRUPAMENTO */}
                    <div className="pt-2 border-t border-amber-200/80 space-y-1">
                      <label className="block text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-amber-700" />
                        Local de armazenamento
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={localArmazenamentoTriagem}
                          onChange={(e) => setLocalArmazenamentoTriagem(e.target.value)}
                          required
                          className="flex-1 p-2 bg-white border border-amber-300 rounded-xl text-slate-900 font-bold text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
                        >
                          {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                            const valorFormatado = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                            return (
                              <option key={loc.id || loc.codigo || loc} value={valorFormatado}>
                                📦 {valorFormatado}
                              </option>
                            );
                          })}
                          {locaisArmazenamento.length === 0 && (
                            <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                          )}
                        </select>

                        <button
                          type="button"
                          disabled={agrupandoTodosLocais}
                          onClick={() => handleAgruparTodosEmLocal(localArmazenamentoTriagem || alertaAgrupamento.locais[0])}
                          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                          title="Agrupar todos os pacotes anteriores e o novo neste local"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>{agrupandoTodosLocais ? 'Agrupando...' : 'Agrupar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SELETOR NORMAL QUANDO NÃO HÁ ENCOMENDA RETIDA ANTERIOR */
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                      Local de armazenamento
                    </label>
                    <select
                      value={localArmazenamentoTriagem}
                      onChange={(e) => setLocalArmazenamentoTriagem(e.target.value)}
                      required
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    >
                      {locaisArmazenamento.filter(l => l.ativo !== false).map((loc: any) => {
                        const valorFormatado = loc.codigo && loc.nome ? `${loc.codigo} - ${loc.nome}` : loc.nome || loc;
                        return (
                          <option key={loc.id || loc.codigo || loc} value={valorFormatado}>
                            📦 {valorFormatado}
                          </option>
                        );
                      })}
                      {locaisArmazenamento.length === 0 && (
                        <option value="Bancada Principal">📦 Bancada Principal de Triagem</option>
                      )}
                    </select>
                  </div>
                )}

                {/* CÓDIGO DE BARRAS / RASTREIO */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-slate-600" />
                      Código de Barras / Rastreio
                    </label>
                    {analisandoOcrEtiqueta && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full animate-pulse border border-emerald-300">
                        <Sparkles className="w-3 h-3 text-emerald-600 animate-spin" />
                        Lendo etiqueta com IA...
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={codigoBarras}
                      onChange={(e) => {
                        setCodigoBarras(e.target.value);
                        setCodigoSelecionadoOcr('');
                      }}
                      placeholder="Escaneie, digite ou tire foto da etiqueta..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                    />
                    <button 
                      type="button" 
                      onClick={abrirCameraFotoEtiqueta} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer font-bold text-xs shadow-xs shrink-0"
                      title="Abrir câmera direto para tirar foto da etiqueta"
                    >
                      <Camera className="w-4 h-4" />
                      <span className="hidden sm:inline">Câmera</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => abrirLeitorCamera('entrada')} 
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                      title="Escanear código de barras"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* CHIPS DE SELEÇÃO: NO MÁXIMO 3 CÓDIGOS (INCLUINDO NOTA FISCAL) */}
                  {sugestoesCodigosOcr.length > 0 && (
                    <div className="mt-2 p-2.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl space-y-2 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase text-emerald-950 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Códigos Extraídos (Máx 3 - Toque para selecionar):
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700">
                          {Math.min(3, sugestoesCodigosOcr.length)} código(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {sugestoesCodigosOcr.slice(0, 3).map((sug, idx) => {
                          const estaSelecionado = codigoBarras === sug.valor;
                          const icon = sug.tipo === 'rastreio' ? '📦' : sug.tipo === 'nf' ? '📄' : '🏷️';
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setCodigoBarras(sug.valor);
                                setCodigoSelecionadoOcr(sug.valor);
                                tocarAlertaSonoro();
                              }}
                              className={`text-left transition-all px-3 py-2 rounded-xl border text-xs cursor-pointer flex items-center gap-2 shadow-xs ${
                                estaSelecionado
                                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md ring-2 ring-emerald-400 font-bold scale-[1.02]'
                                  : 'bg-white hover:bg-emerald-50 border-slate-300 text-slate-800 hover:border-emerald-400'
                              }`}
                              title={`Clique para preencher: ${sug.valor}`}
                            >
                              <span className="text-sm">{icon}</span>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[9px] uppercase tracking-wider font-semibold ${estaSelecionado ? 'text-emerald-100' : 'text-slate-600'}`}>
                                  {sug.label}
                                </span>
                                <span className="text-xs font-mono font-bold tracking-tight truncate max-w-[190px]">
                                  {sug.valor}
                                </span>
                              </div>
                              {estaSelecionado ? (
                                <Check className="w-4 h-4 text-white ml-auto shrink-0" />
                              ) : (
                                <span className="text-[10px] text-slate-600 ml-auto font-sans font-medium hover:text-emerald-700">Usar</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Metadados adicionais lidos na etiqueta */}
                      {ocrDadosDetectados && (ocrDadosDetectados.destinatario || ocrDadosDetectados.transportadora || ocrDadosDetectados.unidade) && (
                        <div className="pt-1.5 border-t border-emerald-200/70 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-emerald-950 font-medium">
                          {ocrDadosDetectados.transportadora && (
                            <span className="inline-flex items-center gap-1">
                              🚚 Transportadora: <b>{ocrDadosDetectados.transportadora}</b>
                            </span>
                          )}
                          {ocrDadosDetectados.destinatario && (
                            <span className="inline-flex items-center gap-1">
                              👤 Destinatário: <b>{ocrDadosDetectados.destinatario}</b>
                            </span>
                          )}
                          {ocrDadosDetectados.unidade && (
                            <span className="inline-flex items-center gap-1">
                              🏠 Unidade lida: <b>{ocrDadosDetectados.unidade} {ocrDadosDetectados.bloco || ''}</b>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input oculto com capture="environment" para suporte universal */}
                <input 
                  ref={fileInputEtiquetaRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    if (file) {
                      uploadFotoStorage(file, 'etiquetas', setFotoEtiquetaUrl);
                      processarOcrEtiqueta(file);
                    }
                  }} 
                  disabled={uploadingFoto || analisandoOcrEtiqueta} 
                />

                {fotoEtiquetaUrl && (
                  <div className="space-y-1">
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex flex-col items-center gap-2">
                      <div className="relative w-full flex justify-center">
                        <img 
                          src={fotoEtiquetaUrl} 
                          alt="Etiqueta" 
                          loading="lazy" 
                          decoding="async" 
                          className="max-h-28 rounded-lg object-contain shadow-xs border border-slate-200" 
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            setFotoEtiquetaUrl('');
                            setSugestoesCodigosOcr([]);
                            setCodigoSelecionadoOcr('');
                            setOcrDadosDetectados(null);
                          }} 
                          className="absolute top-1 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md cursor-pointer"
                          title="Remover foto e limpar sugestões"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {analisandoOcrEtiqueta ? (
                        <div className="w-full bg-emerald-100/90 border border-emerald-300 text-emerald-950 rounded-lg p-2 text-center text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                          <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                          <span>Lendo código de rastreio e NF em alta velocidade (&lt; 5s)...</span>
                        </div>
                      ) : sugestoesCodigosOcr.length > 0 ? (
                        <div className="w-full flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                          <span className="font-bold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {Math.min(3, sugestoesCodigosOcr.length)} código(s) extraído(s)
                          </span>
                          <button
                            type="button"
                            onClick={abrirCameraFotoEtiqueta}
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer flex items-center gap-0.5"
                          >
                            <Camera className="w-3 h-3" /> Tirar outra foto
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">Observações (Opcional)</label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Caixa pequena Mercado Livre, frágil..."
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900 transition"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs shadow-md disabled:opacity-50 cursor-pointer mt-2"
                >
                  {loading ? 'Salvando...' : <><CheckCircle2 className="w-4 h-4" /> Registrar Entrada e Reter Pacote</>}
                </button>
              </form>

              {/* FEEDBACK & WHATSAPP APÓS REGISTRO */}
              {itemTriadoWhats && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Pacote registrado com sucesso!</p>
                      <p className="text-[11px] text-emerald-800">Notifique o morador {itemTriadoWhats.destinatario} pelo WhatsApp.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <a 
                      href={itemTriadoWhats.link} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" /> Avisar no WhatsApp
                    </a>
                    <button 
                      type="button"
                      onClick={() => setItemTriadoWhats(null)} 
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CÂMERA AO VIVO: TIRA FOTO DIRETO DA ETIQUETA E LÊ CÓDIGO EM TEMPO REAL */}
      {modalCameraEtiqueta && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="w-full max-w-md flex justify-between items-center text-white pb-2">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-sm block">Câmera: Foto da Etiqueta</span>
                <span className="text-[10px] text-emerald-300 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Leitor de código ativo durante o enquadramento
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={fecharCameraFotoEtiqueta}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition cursor-pointer"
              title="Fechar câmera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-md flex-1 flex items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/20 shadow-2xl my-2">
            <video
              ref={videoCameraEtiquetaRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Banner HUD de status do leitor em tempo real */}
            <div className="absolute top-3 left-3 right-3 z-10 flex flex-col items-center pointer-events-none">
              {codigoDetectadoAoVivo ? (
                <div className="bg-emerald-600/95 text-white border-2 border-emerald-300 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2 animate-in zoom-in-95 backdrop-blur-xs text-left w-full sm:w-auto">
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-bounce" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-extrabold block">
                      ✓ Código Detectado e Preenchido!
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-black truncate block text-white">
                      {codigoDetectadoAoVivo}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-black/70 text-slate-200 border border-white/20 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[11px] font-semibold backdrop-blur-xs">
                  <QrCode className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Posicione a etiqueta — Leitor escaneando automaticamente...</span>
                </div>
              )}
            </div>

            {/* Retículo de enquadramento da etiqueta com orientações dinâmicas */}
            <div className={`absolute inset-5 sm:inset-8 border-2 rounded-2xl pointer-events-none flex flex-col justify-between p-3 transition-colors ${
              codigoDetectadoAoVivo ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-emerald-400/70'
            }`}>
              <div className="flex justify-between">
                <div className={`w-7 h-7 border-t-4 border-l-4 rounded-tl-lg -mt-1 -ml-1 transition-colors ${codigoDetectadoAoVivo ? 'border-emerald-300' : 'border-emerald-400'}`}></div>
                <div className={`w-7 h-7 border-t-4 border-r-4 rounded-tr-lg -mt-1 -mr-1 transition-colors ${codigoDetectadoAoVivo ? 'border-emerald-300' : 'border-emerald-400'}`}></div>
              </div>

              <div className="text-center bg-black/75 backdrop-blur-xs text-white text-xs font-semibold py-1.5 px-3.5 rounded-full mx-auto self-center shadow-lg border border-white/10 flex items-center gap-1.5">
                {codigoDetectadoAoVivo ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-emerald-300 font-bold">Código registrado! Clique em "Tirar Foto Agora"</span>
                  </>
                ) : (
                  <span>Centralize o código de rastreio ou número da NF</span>
                )}
              </div>

              <div className="flex justify-between">
                <div className={`w-7 h-7 border-b-4 border-l-4 rounded-bl-lg -mb-1 -ml-1 transition-colors ${codigoDetectadoAoVivo ? 'border-emerald-300' : 'border-emerald-400'}`}></div>
                <div className={`w-7 h-7 border-b-4 border-r-4 rounded-br-lg -mb-1 -mr-1 transition-colors ${codigoDetectadoAoVivo ? 'border-emerald-300' : 'border-emerald-400'}`}></div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-md flex items-center justify-between gap-3 py-2">
            <button
              type="button"
              onClick={() => {
                fecharCameraFotoEtiqueta();
                if (fileInputEtiquetaRef.current) {
                  fileInputEtiquetaRef.current.click();
                }
              }}
              className="px-3.5 py-3.5 bg-white/15 hover:bg-white/25 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Alternar para câmera nativa do aparelho"
            >
              <Camera className="w-4 h-4" /> Câmera Nativa
            </button>

            <button
              type="button"
              onClick={capturarFotoDaCameraAoVivo}
              className={`flex-1 font-black px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl ring-4 transition text-xs sm:text-sm cursor-pointer active:scale-95 ${
                codigoDetectadoAoVivo
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white ring-emerald-400/50 shadow-emerald-950/50 scale-[1.02]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-emerald-500/30'
              }`}
            >
              <Camera className="w-5 h-5 shrink-0" />
              <span>{codigoDetectadoAoVivo ? 'Tirar Foto Agora (Código Lido!)' : 'Tirar Foto Agora'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
