import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { 
  Building2,
  MapPin,
  ChevronLeft, 
  Users, 
  User,
  UserPlus, 
  Home, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Pencil, 
  X,
  Filter,
  ShieldCheck,
  Clock,
  MessageCircle,
  ExternalLink,
  Phone,
  Sparkles,
  Edit3,
  LayoutGrid,
  List,
  Trash2,
  Check,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Layers,
  ChevronRight,
  ChevronDown,
  Info,
  Hash,
  Key,
  CreditCard,
  Car,
  Shield,
  ShieldAlert,
  Eye,
  Mail,
  FileText,
  Tag,
  AlertTriangle,
  Camera,
  Save,
  Sliders,
  ToggleRight,
  Settings,
  Power,
  CheckCircle2
} from 'lucide-react';
import { comprimirImagemBase64 } from '../services/imageUtils';
import { 
  carregarCondominioConfig, 
  salvarCondominioConfig, 
  OPCOES_ESCALA, 
  OPCOES_TIPO_ESTRUTURA,
  isEstruturaCasas,
  isEstruturaTorres,
  isEstruturaBlocos,
  isEstruturaNumeralDireto,
  getNomeRotuloBloco,
  getNomeRotuloUnidade,
  obterListaBlocosOuTorres,
  formatarIdentificacaoUnidade,
  gerarCardsUnidadesCondominio,
  saoUnidadesEquivalentes,
  normalizarNumeroUnidade,
  formatarComZeroEsquerda,
  autoCorrigirZeroEsquerda,
  UnidadeEstruturada,
  CondominioConfig,
  BlocoDetalhe,
  criarEstruturaPadraoBloco,
  gerarUnidadesDeBlocoEstruturado
} from '../services/condominioService';
import CardPermissoesOperador from '../components/CardPermissoesOperador';
import GerenciadorModulosCondominioCard from '../components/GerenciadorModulosCondominioCard';
import ModalGerenciadorModulosCondominio from '../components/ModalGerenciadorModulosCondominio';
import ConfiguracaoAvancadaBlocosPavimentos from '../components/ConfiguracaoAvancadaBlocosPavimentos';
import { 
  carregarNiveisAcesso, 
  obterNiveisLocal, 
  obterNomeNivel, 
  NivelAcessoItem,
  PermissoesModulo,
  MODULOS_DEFINICAO_RBAC,
  obterPermissoesPadraoNivel,
  obterPermissoesOperador,
  salvarPermissoesOperador,
  contarModulosHabilitados,
  verificarPermissao
} from '../services/permissoesService';
import { salvarCacheLocal, obterCacheLocal } from '../services/offlineStorageService';
import { cachedQuery, invalidarCacheTabela } from '../services/redisCacheService';
import { ImagemOtimizada } from '../components/ImagemOtimizada';

interface CadastrosProps {
  usuarioLogado?: any;
  condominioAtivoProp?: string;
  onTrocarCondominioGlobal?: (novoId: string) => void;
}

export default function Cadastros({ usuarioLogado, condominioAtivoProp, onTrocarCondominioGlobal }: CadastrosProps) {
  const nivelNum = usuarioLogado?.nivel_acesso !== undefined && usuarioLogado?.nivel_acesso !== null 
    ? Number(usuarioLogado.nivel_acesso) 
    : 3;
  const perfilStr = (usuarioLogado?.perfil || '').toLowerCase();
  
  const eAdmin = Boolean(
    usuarioLogado?.eSuperAdminGlobal ||
    perfilStr === 'admin' ||
    perfilStr === 'master' ||
    nivelNum === 0 ||
    nivelNum === 1
  );
  const eMaster = perfilStr === 'master' || nivelNum === 1 || nivelNum === 0 || Boolean(usuarioLogado?.eSuperAdminGlobal);
  const eSupervisor = perfilStr === 'supervisor' || nivelNum === 2;
  const eOperador = (perfilStr === 'operador' || perfilStr === 'porteiro' || nivelNum >= 3) && !eAdmin && !eSupervisor;

  // Diretriz de Segurança RBAC: Permite customizar numeração se for Admin/Master/Supervisor ou tiver permissão ativa
  const podeCustomizarEstrutura = eAdmin || eMaster || eSupervisor || nivelNum <= 2 || verificarPermissao(usuarioLogado, 'cadastros', 'condominios');

  const [condominios, setCondominios] = useState<any[]>([]);
  const [mapaConfigsCondos, setMapaConfigsCondos] = useState<Record<string, CondominioConfig>>({});
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);

  const [condominioFiltroAdmin, setCondominioFiltroAdmin] = useState<string>(() => {
    return condominioAtivoProp || usuarioLogado?.condominio_id || (typeof localStorage !== 'undefined' ? localStorage.getItem('infport_condominio_ativo_id') || '' : '');
  });

  // Controle do Condomínio Selecionado no Hub (4 Cards: Unidades, Operadores, Módulos, Editar Condomínio)
  const [condominioSelecionadoHub, setCondominioSelecionadoHub] = useState<any | null>(null);
  const [subAbaCondo, setSubAbaCondo] = useState<'hub' | 'unidades' | 'operadores' | 'modulos'>('hub');
  const [condominioMenuAberto, setCondominioMenuAberto] = useState<any | null>(null);
  const [modalModulosCondoAberto, setModalModulosCondoAberto] = useState(false);
  const [condominioModulosAlvo, setCondominioModulosAlvo] = useState<any | null>(null);

  // Sincronismo global obrigatório de condomínio ativo
  const sincronizarCondominioGlobal = (c: any) => {
    if (!c?.id) return;
    try {
      localStorage.setItem('infport_condominio_ativo_id', c.id);
      if (typeof window !== 'undefined') {
        (window as any).idCondominioAtivo = c.id;
        window.dispatchEvent(new CustomEvent('infport:condominio_alterado', { 
          detail: { novoCondominioId: c.id, condominio: c } 
        }));
        window.dispatchEvent(new CustomEvent('infport_sincronizar_dados_global'));
      }
      if (onTrocarCondominioGlobal) {
        onTrocarCondominioGlobal(c.id);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar condomínio global:', e);
    }
  };

  const abrirGerenciadorModulosCondo = (c: any) => {
    setCondominioModulosAlvo(c);
    setModalModulosCondoAberto(true);
    sincronizarCondominioGlobal(c);
  };

  const abrirOperadoresExclusivo = (c: any) => {
    if (!c?.id) return;
    setCondominioFiltroAdmin(c.id);
    setCondominioSelecionadoHub(c);
    setCondominioIdOperador(c.id);
    setCondominioMenuAberto(null);
    setAbaAtiva("operadores");
    sincronizarCondominioGlobal(c);
  };

  const abrirMoradoresExclusivo = (c: any) => {
    if (!c?.id) return;
    setCondominioFiltroAdmin(c.id);
    setCondominioSelecionadoHub(c);
    setCondominioIdMorador(c.id);
    setCondominioMenuAberto(null);
    setAbaAtiva("moradores");
    sincronizarCondominioGlobal(c);
  };

  const voltarParaCondominios = () => {
    setAbaAtiva("condominios");
    setCondominioSelecionadoHub(null);
  };

  const [abaAtiva, setAbaAtiva] = useState<'condominios' | 'operadores' | 'moradores'>(
    eAdmin ? 'condominios' : 'moradores'
  );

  const abrirMenuCondominio = (c: any) => {
    if (!c?.id) return;
    setCondominioFiltroAdmin(c.id);
    setCondominioSelecionadoHub(c);
    setCondominioIdOperador(c.id);
    setCondominioIdMorador(c.id);
    setCondominioMenuAberto(c);
    sincronizarCondominioGlobal(c);
  };

  // Seleciona um condomínio para gerenciar no Hub de 4 Cards
  const selecionarCondominio = (c: any, subAba: 'hub' | 'unidades' | 'operadores' | 'modulos' = 'hub') => {
    if (!c?.id) return;
    setCondominioSelecionadoHub(c);
    setCondominioFiltroAdmin(c.id);
    setCondominioIdOperador(c.id);
    setCondominioIdMorador(c.id);
    setSubAbaCondo(subAba);
    sincronizarCondominioGlobal(c);
  };

  // Se não for admin global, foca automaticamente no condomínio do operador logado
  useEffect(() => {
    if (!eAdmin && condominios.length > 0 && !condominioSelecionadoHub) {
      const meuCondo = condominios.find(c => c.id === usuarioLogado?.condominio_id) || condominios[0];
      if (meuCondo) {
        setCondominioSelecionadoHub(meuCondo);
        setSubAbaCondo('unidades');
        sincronizarCondominioGlobal(meuCondo);
      }
    }
  }, [eAdmin, condominios, usuarioLogado?.condominio_id]);

  // Identificação do condomínio ativo em foco com fallback resiliente e sanitização de UUID
  const condoAtivoId = useMemo(() => {
    if (condominioSelecionadoHub?.id) return String(condominioSelecionadoHub.id).trim();
    let raw = (eAdmin 
      ? (condominioFiltroAdmin || condominioAtivoProp || (condominios[0]?.id || usuarioLogado?.condominio_id || ''))
      : (usuarioLogado?.condominio_id || (condominios[0]?.id || ''))) || (condominios[0]?.id || '');
    if (raw === 'global' || raw === 'todos') {
      const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
      return primeiroValido ? String(primeiroValido).trim() : (condominios[0]?.id ? String(condominios[0].id).trim() : '');
    }
    return String(raw || '').trim();
  }, [condominioSelecionadoHub, eAdmin, condominioFiltroAdmin, condominioAtivoProp, condominios, usuarioLogado?.condominio_id]);

  const condoEmFoco = useMemo(() => {
    if (condominioSelecionadoHub) return condominioSelecionadoHub;
    return condominios.find(c => c.id === condoAtivoId) || condominios[0] || null;
  }, [condominioSelecionadoHub, condominios, condoAtivoId]);

  const configCondoAtivo = mapaConfigsCondos[condoAtivoId] || {
    id: condoAtivoId,
    nome: condoEmFoco?.nome || 'Condomínio',
    tipo_estrutura: 'casas',
    unidades_por_bloco: 117,
    zeros_esquerda: true
  };
  const eEstruturaCasasAtivo = isEstruturaCasas(configCondoAtivo?.tipo_estrutura);

  // ISOLAMENTO RIGOROSO MULTI-TENANT: Operadores pertencem exclusivamente ao condomínio em questão!
  const operadoresDoCondoAtivo = useMemo(() => {
    if (!condoAtivoId || condoAtivoId === 'global' || condoAtivoId === 'todos') return [];
    const cidNorm = String(condoAtivoId).trim().toLowerCase();
    return operadores.filter(op => {
      const opCid = String(op.condominio_id || '').trim().toLowerCase();
      // O operador DEVE pertencer estritamente a este condomínio
      return opCid === cidNorm;
    });
  }, [operadores, condoAtivoId]);

  // Lista visível de operadores filtrada por permissões e pelo condomínio ativo
  const operadoresVisiveis = useMemo(() => {
    return operadoresDoCondoAtivo.filter(op => {
      const ehAdminMaster = op.login?.toLowerCase() === 'admin' || op.perfil === 'admin_geral';
      if (ehAdminMaster) {
        return usuarioLogado?.login?.toLowerCase() === 'admin';
      }
      const ehContaAdmin = op.perfil?.toLowerCase() === 'admin' || Number(op.nivel_acesso) === 0;
      if (ehContaAdmin && !eAdmin) {
        return false;
      }
      return true;
    });
  }, [operadoresDoCondoAtivo, usuarioLogado?.login, eAdmin]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Controle de Navegação em Tela Cheia (Máquina de Estados: 'lista' | 'form')
  const [viewMode, setViewMode] = useState<'lista' | 'form'>('lista');
  const [tipoFormulario, setTipoFormulario] = useState<'condominio' | 'operador' | 'morador'>('morador');
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Filtros de busca individuais
  const [buscaCondominio, setBuscaCondominio] = useState('');
  const [buscaOperador, setBuscaOperador] = useState('');
  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [criterioBuscaMorador, setCriterioBuscaMorador] = useState<'todos' | 'nome' | 'cpf' | 'rg' | 'veiculo' | 'telefone' | 'unidade'>('todos');
  const inputBuscaRef = useRef<HTMLInputElement>(null);
  const [menuPersonalizarAberto, setMenuPersonalizarAberto] = useState(false);
  const menuPersonalizarRef = useRef<HTMLDivElement>(null);
  const [menuFabAberto, setMenuFabAberto] = useState(false);
  const menuFabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickForaPersonalizar = (e: MouseEvent) => {
      if (menuPersonalizarRef.current && !menuPersonalizarRef.current.contains(e.target as Node)) {
        setMenuPersonalizarAberto(false);
      }
    };
    const handleClickForaFab = (e: MouseEvent) => {
      if (menuFabRef.current && !menuFabRef.current.contains(e.target as Node)) {
        setMenuFabAberto(false);
      }
    };
    if (menuPersonalizarAberto) {
      document.addEventListener('mousedown', handleClickForaPersonalizar);
    }
    if (menuFabAberto) {
      document.addEventListener('mousedown', handleClickForaFab);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickForaPersonalizar);
      document.removeEventListener('mousedown', handleClickForaFab);
    };
  }, [menuPersonalizarAberto, menuFabAberto]);

  // Estrutura e Visualização de Unidades
  const [modoVisaoMoradores, setModoVisaoMoradores] = useState<'cards_unidades' | 'lista_moradores'>('cards_unidades');
  const [filtroStatusUnidade, setFiltroStatusUnidade] = useState<'todas' | 'ocupadas' | 'vagas'>('todas');
  const [faixaCasasFiltro, setFaixaCasasFiltro] = useState<string>('todas');

  // Formulário Condomínio
  const [nomeCondominio, setNomeCondominio] = useState('');
  const [enderecoCondominio, setEnderecoCondominio] = useState('');
  const [tipoEstruturaCondominio, setTipoEstruturaCondominio] = useState<string>('casas');
  const [unidadesPorBlocoCondominio, setUnidadesPorBlocoCondominio] = useState<number>(117);
  const [qtdBlocosCondominio, setQtdBlocosCondominio] = useState<number>(1);
  const [nomesBlocosCondominio, setNomesBlocosCondominio] = useState<string>('');
  const [escalaPlantao, setEscalaPlantao] = useState<'06_18' | '07_19' | '08_20' | 'personalizado'>('06_18');
  const [horarioDiurnoInicio, setHorarioDiurnoInicio] = useState('06:00');
  const [horarioNoturnoInicio, setHorarioNoturnoInicio] = useState('18:00');
  const [whatsappGrupoUrl, setWhatsappGrupoUrl] = useState('');
  const [telefonePortaria, setTelefonePortaria] = useState('');
  const [sindicoNome, setSindicoNome] = useState('');
  const [sindicoWhatsapp, setSindicoWhatsapp] = useState('');
  const [zerosEsquerdaCondominio, setZerosEsquerdaCondominio] = useState<boolean>(true);
  const [condominioAtivoStatus, setCondominioAtivoStatus] = useState<boolean>(true);
  const [blocosDetalhes, setBlocosDetalhes] = useState<BlocoDetalhe[]>([]);
  const [modalExcluirCondoAberto, setModalExcluirCondoAberto] = useState<boolean>(false);
  const [excluindoCondominio, setExcluindoCondominio] = useState<boolean>(false);

  // Sincroniza a quantidade de blocos quando o input numérico for alterado
  const handleQtdBlocosChange = (novaQtd: number) => {
    const q = Math.max(1, Math.min(novaQtd, 50));
    setQtdBlocosCondominio(q);
    setBlocosDetalhes((prev) => {
      const atual = [...prev];
      const eTorre = isEstruturaTorres(tipoEstruturaCondominio);
      const uPadrao = unidadesPorBlocoCondominio || 20;
      if (atual.length < q) {
        for (let i = atual.length; i < q; i++) {
          const nomeB = eTorre ? `Torre ${i + 1}` : `Bloco ${String.fromCharCode(65 + i)}`;
          const est = criarEstruturaPadraoBloco(nomeB);
          atual.push({
            nome: nomeB,
            unidades: gerarUnidadesDeBlocoEstruturado({ nome: nomeB, unidades: 0, estrutura: est }).length,
            estrutura: est
          });
        }
      } else if (atual.length > q) {
        return atual.slice(0, q);
      }
      return atual;
    });
  };

  // Atualiza as unidades padrão e reflete nos blocos
  const handleUnidadesPorBlocoPadraoChange = (novoValor: number) => {
    const val = Math.max(1, novoValor);
    setUnidadesPorBlocoCondominio(val);
  };

  // Atualiza o nome ou quantidade de apartamentos de um bloco específico
  const handleAtualizarBloco = (index: number, campo: 'nome' | 'unidades', valor: any) => {
    setBlocosDetalhes((prev) => {
      const copia = [...prev];
      if (copia[index]) {
        copia[index] = {
          ...copia[index],
          [campo]: campo === 'unidades' ? Math.max(1, parseInt(valor) || 1) : valor
        };
      }
      return copia;
    });
  };

  // Adiciona um novo bloco/torre na lista detalhada
  const handleAdicionarBlocoIndividual = () => {
    setBlocosDetalhes((prev) => {
      const i = prev.length;
      const eTorre = isEstruturaTorres(tipoEstruturaCondominio);
      const novoNome = eTorre ? `Torre ${i + 1}` : `Bloco ${String.fromCharCode(65 + i)}`;
      const novo = [...prev, { nome: novoNome, unidades: unidadesPorBlocoCondominio || 20 }];
      setQtdBlocosCondominio(novo.length);
      return novo;
    });
  };

  // Remove um bloco da lista detalhada
  const handleRemoverBlocoIndividual = (index: number) => {
    if (blocosDetalhes.length <= 1) return;
    setBlocosDetalhes((prev) => {
      const novo = prev.filter((_, i) => i !== index);
      setQtdBlocosCondominio(novo.length);
      return novo;
    });
  };

  // Aplica a quantidade padrão para todos os blocos
  const handleAplicarPadraoATodosBlocos = () => {
    const val = unidadesPorBlocoCondominio || 20;
    setBlocosDetalhes((prev) => prev.map((b) => ({ ...b, unidades: val })));
  };

  // Total acumulado de unidades para blocos/torres ou casas
  const totalUnidadesBlocos = useMemo(() => {
    if (isEstruturaCasas(tipoEstruturaCondominio)) {
      return unidadesPorBlocoCondominio || 117;
    }
    if (tipoEstruturaCondominio === 'numeral_direto') {
      return unidadesPorBlocoCondominio || 100;
    }
    if (blocosDetalhes && blocosDetalhes.length > 0) {
      return blocosDetalhes.reduce((acc, b) => acc + (Number(b.unidades) || 0), 0);
    }
    return (qtdBlocosCondominio || 1) * (unidadesPorBlocoCondominio || 20);
  }, [tipoEstruturaCondominio, unidadesPorBlocoCondominio, qtdBlocosCondominio, blocosDetalhes]);

  // Formulário Operador
  const [nomeOperador, setNomeOperador] = useState('');
  const [loginOperador, setLoginOperador] = useState('');
  const [senhaOperador, setSenhaOperador] = useState('');
  const [fotoOperador, setFotoOperador] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('nivel_3');
  const [condominioIdOperador, setCondominioIdOperador] = useState('');
  const [ativoOperador, setAtivoOperador] = useState(true);
  const [permissoesOperador, setPermissoesOperador] = useState<PermissoesModulo>(() => obterPermissoesPadraoNivel('nivel_3'));

  // Modal de edição rápida de permissões direto do card do operador
  const [operadorPermissoesModal, setOperadorPermissoesModal] = useState<any | null>(null);
  const [permissoesModalState, setPermissoesModalState] = useState<PermissoesModulo>(() => obterPermissoesPadraoNivel('nivel_3'));
  const [salvandoPermissoesModal, setSalvandoPermissoesModal] = useState<boolean>(false);

  const handleMudarNivelOperador = (novoNivel: string) => {
    setNivelAcesso(novoNivel);
    const padrao = obterPermissoesPadraoNivel(novoNivel);
    setPermissoesOperador(padrao);
  };

  const abrirModalPermissoesRapido = (op: any) => {
    setOperadorPermissoesModal(op);
    const perms = obterPermissoesOperador(op);
    setPermissoesModalState(perms);
  };

  const salvarPermissoesModalHandler = async () => {
    if (!operadorPermissoesModal) return;
    setSalvandoPermissoesModal(true);
    try {
      const opId = operadorPermissoesModal.id || operadorPermissoesModal.login;
      await salvarPermissoesOperador(opId, permissoesModalState);
      
      // Atualiza na lista de operadores
      setOperadores(prev => prev.map(o => {
        if (o.id === operadorPermissoesModal.id || o.login === operadorPermissoesModal.login) {
          return { ...o, permissoes: permissoesModalState };
        }
        return o;
      }));
      
      setMensagem({ tipo: 'sucesso', texto: `Permissões de ${operadorPermissoesModal.nome} atualizadas com sucesso!` });
      setOperadorPermissoesModal(null);
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (e: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar permissões: ${e.message}` });
    } finally {
      setSalvandoPermissoesModal(false);
    }
  };

  const [listaNiveis, setListaNiveis] = useState<NivelAcessoItem[]>(() => obterNiveisLocal());

  // Formulário Morador & Controle de Acesso
  const [nomeMorador, setNomeMorador] = useState('');
  const [blocoMorador, setBlocoMorador] = useState('');
  const [unidadeMorador, setUnidadeMorador] = useState('');
  const [telefoneMorador, setTelefoneMorador] = useState('');
  const [condominioIdMorador, setCondominioIdMorador] = useState('');
  const [cpfMorador, setCpfMorador] = useState('');
  const [rgMorador, setRgMorador] = useState('');
  const [emailMorador, setEmailMorador] = useState('');
  const [fotoMorador, setFotoMorador] = useState('');
  const [tipoMorador, setTipoMorador] = useState<string>('Morador');

  const handleFotoMoradorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await comprimirImagemBase64(file, 400, 400, 0.82);
      setFotoMorador(b64);
    } catch (err) {
      console.error('Erro ao processar foto do morador:', err);
    }
  };

  const handleFotoOperadorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await comprimirImagemBase64(file, 400, 400, 0.82);
      setFotoOperador(b64);
    } catch (err) {
      console.error('Erro ao processar foto do operador:', err);
    }
  };
  const [statusAcessoMorador, setStatusAcessoMorador] = useState<'liberado' | 'bloqueado' | 'aviso'>('liberado');
  const [tagRfidMorador, setTagRfidMorador] = useState('');
  const [codigoAcessoMorador, setCodigoAcessoMorador] = useState('');
  const [veiculoPlacaMorador, setVeiculoPlacaMorador] = useState('');
  const [veiculoModeloMorador, setVeiculoModeloMorador] = useState('');
  const [contatoEmergenciaMorador, setContatoEmergenciaMorador] = useState('');
  const [observacoesMorador, setObservacoesMorador] = useState('');
  const [abaModalMorador, setAbaModalMorador] = useState<'dados' | 'contato' | 'acesso'>('dados');
  const [moradorDetalheModal, setMoradorDetalheModal] = useState<any | null>(null);
  const [filtroTipoMorador, setFiltroTipoMorador] = useState<string>('todos');
  const [filtroStatusAcesso, setFiltroStatusAcesso] = useState<string>('todos');

  // condoAtivoId, condoEmFoco, configCondoAtivo e eEstruturaCasasAtivo definidos no topo com isolamento rigoroso

  // Estados para edição dos números das unidades/casas nos cards (ex: "Casa 1" -> "Casa 12A")
  const [unidadeEditandoId, setUnidadeEditandoId] = useState<string | null>(null);
  const [novoNumeroUnidade, setNovoNumeroUnidade] = useState<string>('');
  const [salvandoNumeroUnidade, setSalvandoNumeroUnidade] = useState<boolean>(false);

  // Estados para Modal de Personalização em Lote e Adição de Casas Avulsas
  const [modalRenumeracaoAberto, setModalRenumeracaoAberto] = useState<boolean>(false);
  const [textoListaUnidades, setTextoListaUnidades] = useState<string>('');
  const [modalAddUnidadeAvulsaAberto, setModalAddUnidadeAvulsaAberto] = useState<boolean>(false);
  const [novaUnidadeAvulsaNumero, setNovaUnidadeAvulsaNumero] = useState<string>('');
  const [unidadeModalAberta, setUnidadeModalAberta] = useState<any | null>(null);
  const [moradorParaExcluir, setMoradorParaExcluir] = useState<any | null>(null);

  // Estados para Filtro de Bloco/Torre e Menus de Gerenciamento de Tags RFID e Veículos
  const [blocoFiltro, setBlocoFiltro] = useState<string>('todos');
  const [modalGerenciarTagsAberto, setModalGerenciarTagsAberto] = useState<boolean>(false);
  const [modalGerenciarVeiculosAberto, setModalGerenciarVeiculosAberto] = useState<boolean>(false);
  const [termoBuscaTags, setTermoBuscaTags] = useState<string>('');
  const [termoBuscaVeiculos, setTermoBuscaVeiculos] = useState<string>('');

  // Estados para cadastro e edição rápida de Tags RFID
  const [tagNovaUID, setTagNovaUID] = useState<string>('');
  const [tagNovaMoradorId, setTagNovaMoradorId] = useState<string>('');
  const [tagEditandoMoradorId, setTagEditandoMoradorId] = useState<string | null>(null);
  const [tagEditandoUID, setTagEditandoUID] = useState<string>('');

  // Estados para cadastro e edição rápida de Veículos
  const [veiculoNovaPlaca, setVeiculoNovaPlaca] = useState<string>('');
  const [veiculoNovoModelo, setVeiculoNovoModelo] = useState<string>('');
  const [veiculoNovoMoradorId, setVeiculoNovoMoradorId] = useState<string>('');
  const [veiculoEditandoMoradorId, setVeiculoEditandoMoradorId] = useState<string | null>(null);
  const [veiculoEditandoPlaca, setVeiculoEditandoPlaca] = useState<string>('');
  const [veiculoEditandoModelo, setVeiculoEditandoModelo] = useState<string>('');

  useEffect(() => {
    if (usuarioLogado?.condominio_id && !condominioFiltroAdmin) {
      setCondominioFiltroAdmin(usuarioLogado.condominio_id);
    }
  }, [usuarioLogado?.condominio_id]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setListaNiveis(e.detail);
      }
    };
    window.addEventListener('niveis_acesso_atualizados', handler);
    return () => window.removeEventListener('niveis_acesso_atualizados', handler);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [abaAtiva, condominioFiltroAdmin]);

  useEffect(() => {
    const handleVoltar = (e: Event) => {
      if (viewMode === 'form') {
        e.preventDefault();
        voltarParaLista();
      }
    };
    window.addEventListener('infport_voltar_menu_anterior', handleVoltar);
    return () => {
      window.removeEventListener('infport_voltar_menu_anterior', handleVoltar);
    };
  }, [viewMode]);

  const limparFormularios = () => {
    const targetCondo = condoAtivoId || (condominios[0]?.id || usuarioLogado?.condominio_id || '');
    setIdEdicao(null);
    setNomeCondominio('');
    setEnderecoCondominio('');
    setTipoEstruturaCondominio('casas');
    setUnidadesPorBlocoCondominio(117);
    setQtdBlocosCondominio(1);
    setNomesBlocosCondominio('');
    setBlocosDetalhes([]);
    setEscalaPlantao('06_18');
    setHorarioDiurnoInicio('06:00');
    setHorarioNoturnoInicio('18:00');
    setWhatsappGrupoUrl('');
    setTelefonePortaria('');
    setSindicoNome('');
    setSindicoWhatsapp('');
    setZerosEsquerdaCondominio(true);
    setNomeOperador('');
    setLoginOperador('');
    setSenhaOperador('');
    setFotoOperador('');
    setNivelAcesso('nivel_3');
    setCondominioIdOperador(targetCondo);
    setAtivoOperador(true);
    setPermissoesOperador(obterPermissoesPadraoNivel('nivel_3'));
    setNomeMorador('');
    setFotoMorador('');
    setBlocoMorador(eEstruturaCasasAtivo ? 'Casa' : '');
    setUnidadeMorador('');
    setTelefoneMorador('');
    setCondominioIdMorador(targetCondo);
    setCpfMorador('');
    setRgMorador('');
    setEmailMorador('');
    setTipoMorador('Morador');
    setStatusAcessoMorador('liberado');
    setTagRfidMorador('');
    setCodigoAcessoMorador('');
    setVeiculoPlacaMorador('');
    setVeiculoModeloMorador('');
    setContatoEmergenciaMorador('');
    setObservacoesMorador('');
    setAbaModalMorador('dados');
  };

  const voltarParaLista = () => {
    setViewMode('lista');
    limparFormularios();
  };

  const abrirNovoCondominio = () => {
    limparFormularios();
    setIdEdicao(null);
    setTipoFormulario('condominio');
    setViewMode('form');
  };

  const abrirNovoOperador = () => {
    limparFormularios();
    let targetCondo = condoAtivoId || (condominios[0]?.id || usuarioLogado?.condominio_id || '');
    if (targetCondo === 'global' || targetCondo === 'todos') {
      targetCondo = 'todos';
    }
    setCondominioIdOperador(targetCondo);
    setNivelAcesso('nivel_3');
    setPermissoesOperador(obterPermissoesPadraoNivel('nivel_3'));
    setIdEdicao(null);
    setTipoFormulario('operador');
    setViewMode('form');
  };

  const abrirNovoMorador = (unidadePredefinida?: { numero: string; bloco?: string }) => {
    limparFormularios();
    let targetCondo = condoAtivoId || (condominios[0]?.id || usuarioLogado?.condominio_id || '');
    if (targetCondo === 'global' || targetCondo === 'todos') {
      targetCondo = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id || '';
    }
    setCondominioIdMorador(targetCondo);
    const cfg = mapaConfigsCondos[targetCondo] || configCondoAtivo;
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);

    if (eCasas) {
      setBlocoMorador('Casa');
    } else if (unidadePredefinida?.bloco) {
      setBlocoMorador(unidadePredefinida.bloco);
    } else {
      setBlocoMorador('');
    }

    if (unidadePredefinida?.numero) {
      setUnidadeMorador(unidadePredefinida.numero);
    }

    setUnidadeModalAberta(null);
    setIdEdicao(null);
    setTipoFormulario('morador');
    setViewMode('form');
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      // 0. Garante que a lista de condomínios esteja disponível desde o primeiro carregamento
      let listaCondos = condominios;
      if (listaCondos.length === 0) {
        const { data: condoData } = await supabase.from('condominios').select('*').order('nome');
        if (condoData && condoData.length > 0) {
          listaCondos = condoData;
          setCondominios(condoData);
          salvarCacheLocal('condominios', condoData, 'global');
          if (!condominioFiltroAdmin) {
            const initialId = usuarioLogado?.condominio_id || condoData[0].id;
            setCondominioFiltroAdmin(initialId);
          }
        } else {
          const cacheCondos = obterCacheLocal<any[]>('condominios', 'global', []);
          if (cacheCondos && cacheCondos.length > 0) {
            listaCondos = cacheCondos;
            setCondominios(cacheCondos);
          }
        }
      }

      const activeCondoId = (eAdmin
        ? (condominioFiltroAdmin || listaCondos[0]?.id || usuarioLogado?.condominio_id || '')
        : (usuarioLogado?.condominio_id || listaCondos[0]?.id || '')) || (listaCondos[0]?.id || '');

      // Carrega as configurações completas e atualizadas dos condomínios
      const configs: Record<string, CondominioConfig> = {};
      for (const c of listaCondos) {
        configs[c.id] = await carregarCondominioConfig(c.id, true);
      }
      if (activeCondoId && !configs[activeCondoId]) {
        configs[activeCondoId] = await carregarCondominioConfig(activeCondoId, true);
      }
      setMapaConfigsCondos(configs);

      // 1. Carrega lista de condomínios atualizada com status de ativação
      const { data: condoData, error: condoErr } = await supabase.from('condominios').select('*').order('nome');
      if (!condoErr && condoData) {
        setCondominios(condoData);
        listaCondos = condoData;
        salvarCacheLocal('condominios', condoData, 'global');
      }

      // 2. Carrega todos os operadores para alimentar os cards, totais de equipe e permissões
      const { data: opData, error: opErr } = await supabase.from('operadores').select('*').order('nome');
      if (!opErr && opData) {
        setOperadores(opData);
        salvarCacheLocal('operadores', opData, 'global');
      }

      // 3. Carrega todos os moradores cadastrados para garantir que as quantidades registradas apareçam em todos os condomínios
      try {
        const { data: morData, error: morErr } = await supabase
          .from('moradores')
          .select('*')
          .order('unidade', { ascending: true });
        if (!morErr && morData && Array.isArray(morData)) {
          setMoradores(morData);
          salvarCacheLocal('moradores', morData, 'global');
        } else {
          const cacheMoradores = obterCacheLocal<any[]>('moradores', 'global', []);
          if (cacheMoradores && cacheMoradores.length > 0) {
            setMoradores(cacheMoradores);
          }
        }
      } catch (errMor) {
        console.warn('Aviso ao sincronizar moradores no banco:', errMor);
        const cacheMoradores = obterCacheLocal<any[]>('moradores', 'global', []);
        if (cacheMoradores && cacheMoradores.length > 0) {
          setMoradores(cacheMoradores);
        }
      }

      // Sempre atualiza os níveis em segundo plano
      const niveisCarregados = await carregarNiveisAcesso(activeCondoId || condoAtivoId);
      setListaNiveis(niveisCarregados);
    } catch (err: any) {
      console.warn('[Cadastros] Aviso ao sincronizar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const getNomeCondominioPorId = (id: string | null | undefined) => {
    if (!id || id === 'global' || id === 'todos') {
      return '🌐 Todos os Condomínios (Global)';
    }
    const c = condominios.find(item => item.id === id);
    return c ? c.nome : (id ? 'Condomínio Vinculado' : '🌐 Todos os Condomínios (Global)');
  };

  // Mapeamento dinâmico e seguro de contagens de operadores e moradores por condomínio
  const mapaContagensOperadores = useMemo(() => {
    const mapa: Record<string, number> = {};
    operadores.forEach((op) => {
      const cid = String(op.condominio_id || '').trim().toLowerCase();
      if (cid && cid !== 'global' && cid !== 'todos') {
        mapa[cid] = (mapa[cid] || 0) + 1;
      }
    });
    return mapa;
  }, [operadores]);

  const mapaContagensMoradores = useMemo(() => {
    const mapa: Record<string, number> = {};
    moradores.forEach((m) => {
      const cid = String(m.condominio_id || '').trim().toLowerCase();
      if (cid) {
        mapa[cid] = (mapa[cid] || 0) + 1;
      }
    });
    return mapa;
  }, [moradores]);

  const salvarCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eAdmin) return;
    if (!nomeCondominio.trim()) {
      setMensagem({ tipo: 'erro', texto: 'O nome do condomínio é obrigatório.' });
      return;
    }
    setLoading(true);

    try {
      let targetId = idEdicao;

      const opt = OPCOES_ESCALA.find(o => o.id === escalaPlantao);
      const configCondo: Partial<CondominioConfig> = {
        id: targetId || '',
        nome: nomeCondominio.trim(),
        endereco: enderecoCondominio.trim(),
        ativo: condominioAtivoStatus,
        tipo_estrutura: tipoEstruturaCondominio || 'casas',
        unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
        qtd_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
          ? (blocosDetalhes.length > 0 ? blocosDetalhes.length : Number(qtdBlocosCondominio) || 1)
          : (Number(qtdBlocosCondominio) || 1),
        nomes_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres') && blocosDetalhes.length > 0
          ? blocosDetalhes.map(b => b.nome.trim()).filter(Boolean).join(', ')
          : nomesBlocosCondominio.trim(),
        blocos_detalhes: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
          ? blocosDetalhes
          : [],
        zeros_esquerda: zerosEsquerdaCondominio,
        escala_plantao: escalaPlantao,
        horario_diurno_inicio: horarioDiurnoInicio,
        horario_noturno_inicio: horarioNoturnoInicio,
        escala_label: escalaPlantao === 'personalizado'
          ? `Personalizado (${horarioDiurnoInicio} às ${horarioNoturnoInicio})`
          : (opt?.label || '06:00 às 18:00 / 18:00 às 06:00'),
        whatsapp_grupo_url: whatsappGrupoUrl.trim() || '',
        telefone_portaria: telefonePortaria.trim() || '',
        sindico_nome: sindicoNome.trim() || '',
        sindico_whatsapp: sindicoWhatsapp.trim() || ''
      };

      const turnosPlantaoPayload = {
        unidades_customizadas: configCondo.unidades_customizadas || [],
        blocos_detalhes: configCondo.blocos_detalhes || [],
        zeros_esquerda: configCondo.zeros_esquerda !== false,
        estrutura_avancada_ativa: configCondo.estrutura_avancada_ativa !== false
      };

      const payloadAtualizacao: any = {
        nome: nomeCondominio.trim(),
        endereco: enderecoCondominio.trim(),
        ativo: condominioAtivoStatus,
        tipo_estrutura: tipoEstruturaCondominio || 'casas',
        unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
        qtd_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
          ? (blocosDetalhes.length > 0 ? blocosDetalhes.length : Number(qtdBlocosCondominio) || 1)
          : (Number(qtdBlocosCondominio) || 1),
        nomes_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres') && blocosDetalhes.length > 0
          ? blocosDetalhes.map(b => b.nome.trim()).filter(Boolean).join(', ')
          : nomesBlocosCondominio.trim(),
        whatsapp_grupo_url: whatsappGrupoUrl.trim() || '',
        escala_plantao: escalaPlantao,
        horario_diurno_inicio: horarioDiurnoInicio,
        horario_noturno_inicio: horarioNoturnoInicio,
        telefone_portaria: telefonePortaria.trim() || '',
        sindico_nome: sindicoNome.trim() || '',
        sindico_whatsapp: sindicoWhatsapp.trim() || '',
        turnos_plantao: turnosPlantaoPayload
      };

      if (idEdicao) {
        // 1. Atualiza na tabela condominios com todos os campos estruturais e operacionais
        const { error: errUpd } = await supabase
          .from('condominios')
          .update(payloadAtualizacao)
          .eq('id', idEdicao);

        if (errUpd) {
          console.warn('Tentativa com payload parcial devido a restrição de esquema:', errUpd.message);
          // Fallback para campos básicos caso colunas extras não existam no esquema
          const { error: errFallback } = await supabase
            .from('condominios')
            .update({
              nome: nomeCondominio.trim(),
              endereco: enderecoCondominio.trim(),
              ativo: condominioAtivoStatus,
              tipo_estrutura: tipoEstruturaCondominio || 'casas',
              unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
              qtd_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
                ? (blocosDetalhes.length > 0 ? blocosDetalhes.length : Number(qtdBlocosCondominio) || 1)
                : (Number(qtdBlocosCondominio) || 1)
            })
            .eq('id', idEdicao);

          if (errFallback) {
            await supabase
              .from('condominios')
              .update({
                nome: nomeCondominio.trim(),
                endereco: enderecoCondominio.trim(),
                ativo: condominioAtivoStatus
              })
              .eq('id', idEdicao);
          }
        }

        // 2. Salva configurações estruturais e metadados no Supabase e no cache local
        configCondo.ativo = condominioAtivoStatus;
        const configSalva = await salvarCondominioConfig(idEdicao, configCondo);

        // 3. Atualiza estado em memória imediatamente
        setMapaConfigsCondos(prev => ({
          ...prev,
          [idEdicao]: configSalva
        }));

        setCondominios(prev => prev.map(item => item.id === idEdicao ? {
          ...item,
          nome: nomeCondominio.trim(),
          endereco: enderecoCondominio.trim(),
          ativo: condominioAtivoStatus,
          tipo_estrutura: configSalva.tipo_estrutura,
          unidades_por_bloco: configSalva.unidades_por_bloco,
          qtd_blocos: configSalva.qtd_blocos
        } : item));

        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio de Casas atualizado com sucesso! ${unidadesPorBlocoCondominio || 117} cards de casas gerados. Status: ${condominioAtivoStatus ? 'Ativo' : 'Desativado'}.`
            : (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
            ? `Condomínio atualizado! ${blocosDetalhes.length || qtdBlocosCondominio} blocos configurados. Status: ${condominioAtivoStatus ? 'Ativo' : 'Desativado'}.`
            : `Condomínio e estrutura atualizados com sucesso! Status: ${condominioAtivoStatus ? 'Ativo' : 'Desativado'}.` 
        });
      } else {
        let novoCond: any = null;
        let insertErr: any = null;

        const resCompleto = await supabase
          .from('condominios')
          .insert([payloadAtualizacao])
          .select()
          .maybeSingle();

        novoCond = resCompleto.data;
        insertErr = resCompleto.error;

        if (insertErr && (
          insertErr.message?.includes('schema cache') || 
          insertErr.message?.includes('column') || 
          (insertErr as any).code === '42703' || 
          (insertErr as any).code === 'PGRST204'
        )) {
          console.warn('Fallback: cadastrando condominio sem colunas extras estruturais no banco...');
          const resFallback = await supabase
            .from('condominios')
            .insert([{ 
              nome: nomeCondominio.trim(), 
              endereco: enderecoCondominio.trim(),
              ativo: condominioAtivoStatus,
              tipo_estrutura: tipoEstruturaCondominio || 'casas',
              unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
              qtd_blocos: (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
                ? (blocosDetalhes.length > 0 ? blocosDetalhes.length : Number(qtdBlocosCondominio) || 1)
                : (Number(qtdBlocosCondominio) || 1)
            }])
            .select()
            .maybeSingle();
          novoCond = resFallback.data;
          insertErr = resFallback.error;

          if (insertErr) {
            const resUltraBasico = await supabase
              .from('condominios')
              .insert([{ 
                nome: nomeCondominio.trim(), 
                endereco: enderecoCondominio.trim(),
                ativo: condominioAtivoStatus
              }])
              .select()
              .maybeSingle();
            novoCond = resUltraBasico.data;
            insertErr = resUltraBasico.error;
          }
        }

        if (insertErr) throw insertErr;
        if (novoCond?.id) {
          targetId = novoCond.id;
          configCondo.id = novoCond.id;
          configCondo.ativo = condominioAtivoStatus;
          const configSalva = await salvarCondominioConfig(novoCond.id, configCondo);
          setMapaConfigsCondos(prev => ({
            ...prev,
            [novoCond.id]: configSalva
          }));
        }
        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio cadastrado com sucesso! ${unidadesPorBlocoCondominio || 117} cards de casas gerados para moradores.`
            : (tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres')
            ? `Condomínio cadastrado com sucesso! ${blocosDetalhes.length || qtdBlocosCondominio} blocos com apartamentos.`
            : 'Condomínio e configurações cadastrados com sucesso!' 
        });
      }

      voltarParaLista();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const excluirCondominioConfirmado = async () => {
    if (!idEdicao || !eAdmin) return;
    setExcluindoCondominio(true);
    try {
      const nomeExcluido = nomeCondominio;
      const { error } = await supabase
        .from('condominios')
        .delete()
        .eq('id', idEdicao);

      if (error) throw error;

      invalidarCacheTabela('condominios', idEdicao);

      setCondominios(prev => prev.filter(c => c.id !== idEdicao));
      if (condoAtivoId === idEdicao) {
        setCondominioSelecionadoHub(null);
        setCondominioFiltroAdmin('');
      }

      setMensagem({
        tipo: 'sucesso',
        texto: `Condomínio "${nomeExcluido}" excluído com sucesso do sistema!`
      });
      setModalExcluirCondoAberto(false);
      voltarParaLista();
      await carregarDados();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir condomínio: ${err.message}` });
    } finally {
      setExcluindoCondominio(false);
    }
  };

  const prepararEdicaoCondominio = (c: any) => {
    if (!eAdmin) return;
    setIdEdicao(c.id);
    setNomeCondominio(c.nome || '');
    setEnderecoCondominio(c.endereco || '');
    setCondominioAtivoStatus(c.ativo !== false);

    const cfg = mapaConfigsCondos[c.id];
    if (cfg) {
      setTipoEstruturaCondominio(cfg.tipo_estrutura || 'casas');
      setUnidadesPorBlocoCondominio(cfg.unidades_por_bloco !== undefined ? Number(cfg.unidades_por_bloco) : 117);
      setQtdBlocosCondominio(cfg.qtd_blocos !== undefined ? Number(cfg.qtd_blocos) : 1);
      setNomesBlocosCondominio(cfg.nomes_blocos || '');
      
      if (cfg.blocos_detalhes && Array.isArray(cfg.blocos_detalhes) && cfg.blocos_detalhes.length > 0) {
        const comEstrutura = cfg.blocos_detalhes.map((b, bIdx) => {
          if (b.estrutura) return b;
          const est = criarEstruturaPadraoBloco(b.nome || `Bloco ${bIdx + 1}`);
          return { ...b, estrutura: est };
        });
        setBlocosDetalhes(comEstrutura);
        setQtdBlocosCondominio(comEstrutura.length);
      } else {
        const q = cfg.qtd_blocos ? Number(cfg.qtd_blocos) : 1;
        const nomes = cfg.nomes_blocos ? cfg.nomes_blocos.split(',').map(s => s.trim()).filter(Boolean) : [];
        const eTorre = isEstruturaTorres(cfg.tipo_estrutura);
        const inicial: BlocoDetalhe[] = [];
        for (let i = 0; i < q; i++) {
          const nomeB = nomes[i] || (eTorre ? `Torre ${i + 1}` : `Bloco ${String.fromCharCode(65 + i)}`);
          const est = criarEstruturaPadraoBloco(nomeB);
          inicial.push({
            nome: nomeB,
            unidades: gerarUnidadesDeBlocoEstruturado({ nome: nomeB, unidades: 0, estrutura: est }).length,
            estrutura: est
          });
        }
        setBlocosDetalhes(inicial);
      }

      setZerosEsquerdaCondominio(cfg.zeros_esquerda !== false);
      setEscalaPlantao(cfg.escala_plantao || '06_18');
      setHorarioDiurnoInicio(cfg.horario_diurno_inicio || '06:00');
      setHorarioNoturnoInicio(cfg.horario_noturno_inicio || '18:00');
      setWhatsappGrupoUrl(cfg.whatsapp_grupo_url || '');
      setTelefonePortaria(cfg.telefone_portaria || '');
      setSindicoNome(cfg.sindico_nome || '');
      setSindicoWhatsapp(cfg.sindico_whatsapp || '');
    } else {
      setTipoEstruturaCondominio(c.tipo_estrutura || 'casas');
      setUnidadesPorBlocoCondominio(c.unidades_por_bloco ? Number(c.unidades_por_bloco) : 117);
      setQtdBlocosCondominio(c.qtd_blocos ? Number(c.qtd_blocos) : 1);
      setNomesBlocosCondominio(c.nomes_blocos || '');
      setBlocosDetalhes([]);
      setZerosEsquerdaCondominio(true);
      setEscalaPlantao('06_18');
      setHorarioDiurnoInicio('06:00');
      setHorarioNoturnoInicio('18:00');
      setWhatsappGrupoUrl('');
      setTelefonePortaria('');
      setSindicoNome('');
      setSindicoWhatsapp('');
    }
    setTipoFormulario('condominio');
    setViewMode('form');
  };

  const salvarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    const podeGerenciarOperadores = eAdmin || eMaster || verificarPermissao(usuarioLogado, 'cadastros', 'operadores') || verificarPermissao(usuarioLogado, 'cadastros', 'criar');
    if (!podeGerenciarOperadores) {
      setMensagem({ tipo: 'erro', texto: 'Seu perfil de acesso não possui permissão para cadastrar ou gerenciar operadores.' });
      return;
    }

    if (!nomeOperador.trim() || !loginOperador.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome e o login do operador.' });
      return;
    }

    setLoading(true);

    try {
      let nivelNum = 3;
      let perfilStr = 'operador';
      let customId: string | null = null;

      if (nivelAcesso.startsWith('nivel_')) {
        const parsed = parseInt(nivelAcesso.replace('nivel_', ''), 10);
        nivelNum = !isNaN(parsed) ? parsed : 3;
        perfilStr = nivelNum === 0 ? 'admin' : nivelNum === 1 ? 'master' : nivelNum === 2 ? 'supervisor' : nivelNum === 4 ? 'sindico' : 'operador';
        customId = nivelAcesso;
      } else if (!isNaN(parseInt(nivelAcesso, 10)) && !nivelAcesso.startsWith('custom_')) {
        nivelNum = parseInt(nivelAcesso, 10);
        perfilStr = nivelNum === 0 ? 'admin' : nivelNum === 1 ? 'master' : nivelNum === 2 ? 'supervisor' : nivelNum === 4 ? 'sindico' : 'operador';
        customId = `nivel_${nivelNum}`;
      } else {
        const objCustom = listaNiveis.find(n => n.id === nivelAcesso);
        customId = nivelAcesso;
        perfilStr = objCustom?.nome || 'custom';
        nivelNum = 3;
      }

      // REGRA OBRIGATÓRIA MULTI-TENANT: Todo operador deve ser vinculado a um condomínio específico
      let targetCondominioId: string | null = (condominioIdOperador && condominioIdOperador !== 'todos' && condominioIdOperador !== 'global')
        ? condominioIdOperador
        : (condoAtivoId || condominioFiltroAdmin || usuarioLogado?.condominio_id || null);

      if (targetCondominioId === 'todos' || targetCondominioId === 'global') {
        const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
        targetCondominioId = primeiroValido || null;
      }

      if (!targetCondominioId) {
        setMensagem({ tipo: 'erro', texto: 'Selecione obrigatoriamente o condomínio ao qual este operador pertence.' });
        setLoading(false);
        return;
      }

      if (idEdicao) {
        const dadosAtualizacao: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim().toLowerCase(),
          nivel_acesso: nivelNum,
          nivel_acesso_custom_id: customId,
          perfil: perfilStr,
          foto_url: fotoOperador || null,
          condominio_id: targetCondominioId,
          ativo: ativoOperador,
          permissoes: permissoesOperador
        };
        if (senhaOperador.trim()) {
          dadosAtualizacao.senha = senhaOperador.trim();
        }

        let { error } = await supabase
          .from('operadores')
          .update(dadosAtualizacao)
          .eq('id', idEdicao);

        if (error && (
          error.message?.includes('permissoes') ||
          error.message?.includes('nivel_acesso_custom_id') || 
          error.message?.includes('perfil') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('column') || 
          (error as any).code === '42703' ||
          (error as any).code === 'PGRST204'
        )) {
          console.warn('Fallback: salvando operador sem colunas extras de RBAC...');
          const fallback: any = {
            nome: nomeOperador.trim(),
            login: loginOperador.trim().toLowerCase(),
            nivel_acesso: nivelNum,
            foto_url: fotoOperador || null,
            condominio_id: targetCondominioId,
            ativo: ativoOperador
          };
          if (dadosAtualizacao.senha) fallback.senha = dadosAtualizacao.senha;
          const retry = await supabase.from('operadores').update(fallback).eq('id', idEdicao);
          error = retry.error;
        }

        if (error) throw error;

        // Persiste as permissões no storage/estado instantâneo do operador
        await salvarPermissoesOperador(idEdicao, permissoesOperador);

        setMensagem({ tipo: 'sucesso', texto: 'Operador e permissões atualizados com sucesso!' });
      } else {
        if (!senhaOperador.trim()) {
          setMensagem({ tipo: 'erro', texto: 'Informe a senha para o novo operador.' });
          setLoading(false);
          return;
        }

        const novoOp: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim().toLowerCase(),
          senha: senhaOperador.trim(),
          nivel_acesso: nivelNum,
          nivel_acesso_custom_id: customId,
          perfil: perfilStr,
          foto_url: fotoOperador || null,
          condominio_id: targetCondominioId,
          ativo: ativoOperador,
          permissoes: permissoesOperador
        };

        let { data: opCriado, error } = await supabase.from('operadores').insert([novoOp]).select().single();

        if (error && (
          error.message?.includes('permissoes') ||
          error.message?.includes('nivel_acesso_custom_id') || 
          error.message?.includes('perfil') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('column') || 
          (error as any).code === '42703' ||
          (error as any).code === 'PGRST204'
        )) {
          console.warn('Fallback: cadastrando operador sem colunas extras de RBAC...');
          const fallbackOp = {
            nome: novoOp.nome,
            login: novoOp.login,
            senha: novoOp.senha,
            nivel_acesso: novoOp.nivel_acesso,
            condominio_id: novoOp.condominio_id,
            ativo: ativoOperador
          };
          const retry = await supabase.from('operadores').insert([fallbackOp]).select().single();
          error = retry.error;
          opCriado = retry.data;
        }

        if (error) throw error;

        const opIdSalvo = opCriado?.id || novoOp.login;
        await salvarPermissoesOperador(opIdSalvo, permissoesOperador);

        setMensagem({ tipo: 'sucesso', texto: 'Operador cadastrado e permissões configuradas com sucesso!' });
      }

      voltarParaLista();
      carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar operador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoOperador = (op: any) => {
    if (eOperador) return;
    setIdEdicao(op.id);
    setNomeOperador(op.nome || '');
    setLoginOperador(op.login || '');
    setFotoOperador(op.foto_url || '');
    setSenhaOperador('');
    const nivelDefinido = op.nivel_acesso_custom_id ||
      (op.nivel_acesso !== undefined && op.nivel_acesso !== null && !isNaN(Number(op.nivel_acesso)) ? `nivel_${op.nivel_acesso}` : null) ||
      (op.perfil === 'admin' ? 'nivel_0' : op.perfil === 'master' ? 'nivel_1' : op.perfil === 'supervisor' ? 'nivel_2' : (op.perfil === 'sindico' || op.perfil === 'Síndico') ? 'nivel_4' : 'nivel_3');
    setNivelAcesso(nivelDefinido);
    setCondominioIdOperador(op.condominio_id || condoAtivoId);
    setAtivoOperador(op.ativo !== false);

    // Carrega as permissões específicas do operador para visualização e edição
    const perms = obterPermissoesOperador(op);
    setPermissoesOperador(perms);

    setTipoFormulario('operador');
    setViewMode('form');
  };

  const alternarStatusOperador = async (op: any) => {
    const novoStatus = !(op.ativo !== false);
    try {
      const { error } = await supabase
        .from('operadores')
        .update({ ativo: novoStatus })
        .eq('id', op.id);
      if (error) throw error;
      setOperadores(prev => prev.map(item => item.id === op.id ? { ...item, ativo: novoStatus } : item));
      setMensagem({
        tipo: 'sucesso',
        texto: `Operador ${op.nome} ${novoStatus ? 'ativado' : 'desativado'} com sucesso.`
      });
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao alterar status: ${err.message}` });
    }
  };

  const salvarMorador = async (e: React.FormEvent) => {
    e.preventDefault();
    const podeGerenciarMoradores = eAdmin || eMaster || eSupervisor || verificarPermissao(usuarioLogado, 'cadastros', 'moradores') || verificarPermissao(usuarioLogado, 'moradores', 'adicionar') || verificarPermissao(usuarioLogado, 'moradores', 'criar');
    if (!podeGerenciarMoradores) {
      setMensagem({ tipo: 'erro', texto: 'Seu perfil de acesso não possui permissão para cadastrar ou editar moradores.' });
      return;
    }

    let targetCondominioId = (condominioIdMorador && condominioIdMorador !== 'todos' && condominioIdMorador !== 'global')
      ? condominioIdMorador
      : (condoAtivoId || condominioFiltroAdmin || usuarioLogado?.condominio_id || '');
    if (targetCondominioId === 'global' || targetCondominioId === 'todos') {
      const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
      targetCondominioId = primeiroValido || '';
    }

    if (!nomeMorador.trim() || !unidadeMorador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Nome, Unidade e Condomínio são obrigatórios. Selecione um condomínio específico.' });
      return;
    }
    setLoading(true);

    const cfg = mapaConfigsCondos[targetCondominioId];
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);
    const blocoFinal = eCasas ? 'Casa' : (blocoMorador.trim() || '');

    const dadosMorador: any = {
      nome: nomeMorador.trim(),
      bloco: blocoFinal,
      unidade: autoCorrigirZeroEsquerda(unidadeMorador.trim()),
      telefone: telefoneMorador.trim(),
      condominio_id: targetCondominioId,
      tipo: tipoMorador || 'Morador',
      cpf: cpfMorador.trim() || null,
      rg: rgMorador.trim() || null,
      email: emailMorador.trim() || null,
      foto_url: fotoMorador || null,
      tag_rfid: tagRfidMorador.trim() || null,
      codigo_acesso: codigoAcessoMorador.trim() || null,
      status_acesso: statusAcessoMorador || 'liberado',
      veiculo_placa: veiculoPlacaMorador.trim().toUpperCase() || null,
      veiculo_modelo: veiculoModeloMorador.trim() || null,
      contato_emergencia: contatoEmergenciaMorador.trim() || null,
      observacoes: observacoesMorador.trim() || null
    };

    try {
      if (idEdicao) {
        let { error } = await supabase
          .from('moradores')
          .update(dadosMorador)
          .eq('id', idEdicao);

        // Fallback resiliente se o banco de dados ainda não tiver as colunas extras de controle de acesso
        if (error && (
          error.message?.includes('tag_rfid') || 
          error.message?.includes('status_acesso') || 
          error.message?.includes('cpf') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('column') || 
          (error as any).code === '42703' ||
          (error as any).code === 'PGRST204'
        )) {
          console.warn('Fallback: salvando morador em modo compatibilidade com schema legado...');
          const fallbackBasico = {
            nome: dadosMorador.nome,
            bloco: dadosMorador.bloco,
            unidade: dadosMorador.unidade,
            telefone: dadosMorador.telefone,
            condominio_id: dadosMorador.condominio_id,
            tipo: dadosMorador.tipo
          };
          const resRetry = await supabase.from('moradores').update(fallbackBasico).eq('id', idEdicao);
          error = resRetry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: `Morador "${dadosMorador.nome}" atualizado com sucesso!` });
      } else {
        let { error } = await supabase.from('moradores').insert([dadosMorador]);

        if (error && (
          error.message?.includes('tag_rfid') || 
          error.message?.includes('status_acesso') || 
          error.message?.includes('cpf') || 
          error.message?.includes('schema cache') || 
          error.message?.includes('column') || 
          (error as any).code === '42703' ||
          (error as any).code === 'PGRST204'
        )) {
          console.warn('Fallback: inserindo morador em modo compatibilidade com schema legado...');
          const fallbackBasico = {
            nome: dadosMorador.nome,
            bloco: dadosMorador.bloco,
            unidade: dadosMorador.unidade,
            telefone: dadosMorador.telefone,
            condominio_id: dadosMorador.condominio_id,
            tipo: dadosMorador.tipo
          };
          const resRetry = await supabase.from('moradores').insert([fallbackBasico]);
          error = resRetry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: `Morador "${dadosMorador.nome}" cadastrado com sucesso!` });
      }

      invalidarCacheTabela('moradores', dadosMorador.condominio_id || condoAtivoId);
      voltarParaLista();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoMorador = (m: any) => {
    setIdEdicao(m.id);
    setNomeMorador(m.nome || '');
    const cfg = mapaConfigsCondos[m.condominio_id || condoAtivoId];
    const eCasas = isEstruturaCasas(cfg?.tipo_estrutura);
    setBlocoMorador(eCasas ? 'Casa' : (m.bloco || ''));
    setUnidadeMorador(m.unidade || '');
    setTelefoneMorador(m.telefone || '');
    setCondominioIdMorador(m.condominio_id || '');
    setCpfMorador(m.cpf || '');
    setRgMorador(m.rg || '');
    setEmailMorador(m.email || '');
    setFotoMorador(m.foto_url || '');
    setTipoMorador(m.tipo || 'Morador');
    setStatusAcessoMorador(m.status_acesso || 'liberado');
    setTagRfidMorador(m.tag_rfid || '');
    setCodigoAcessoMorador(m.codigo_acesso || '');
    setVeiculoPlacaMorador(m.veiculo_placa || '');
    setVeiculoModeloMorador(m.veiculo_modelo || '');
    setContatoEmergenciaMorador(m.contato_emergencia || '');
    setObservacoesMorador(m.observacoes || '');
    setAbaModalMorador('dados');
    setUnidadeModalAberta(null);
    setTipoFormulario('morador');
    setViewMode('form');
  };

  const excluirMorador = (m: any) => {
    setMoradorParaExcluir(m);
  };

  const confirmarExcluirMorador = async () => {
    if (!moradorParaExcluir) return;
    const m = moradorParaExcluir;
    setLoading(true);
    try {
      const { error } = await supabase.from('moradores').delete().eq('id', m.id);
      if (error) throw error;
      invalidarCacheTabela('moradores', m.condominio_id || condoAtivoId);
      setMensagem({ tipo: 'sucesso', texto: `Morador "${m.nome}" removido com sucesso!` });
      setMoradorParaExcluir(null);
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao remover morador: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Métodos para edição individual ou em lote do número das unidades (ex: "Casa 1" -> "Casa 12A")
  const iniciarEdicaoNumero = (u: UnidadeEstruturada) => {
    if (!podeCustomizarEstrutura) return;
    setUnidadeEditandoId(u.id);
    setNovoNumeroUnidade(u.numero);
  };

  const salvarEdicaoNumeroUnidade = async (u: UnidadeEstruturada, novoNumInput: string) => {
    if (!podeCustomizarEstrutura) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: operadores não possuem permissão para alterar numeração.' });
      return;
    }
    const numLimpo = novoNumInput.trim();
    if (!numLimpo) {
      setMensagem({ tipo: 'erro', texto: 'O número da casa/unidade não pode ficar vazio.' });
      return;
    }

    if (numLimpo === u.numero) {
      setUnidadeEditandoId(null);
      return;
    }

    setSalvandoNumeroUnidade(true);
    setLoading(true);

    try {
      const targetCondoId = condoAtivoId;
      if (!targetCondoId) throw new Error('Condomínio não identificado.');

      // 1. Atualizar no banco os moradores que pertencem a essa unidade (respeitando zeros à esquerda)
      const moradoresAfetados = moradoresDoCondoAtivo.filter(m => 
        saoUnidadesEquivalentes(m.unidade, u.numero)
      );

      for (const mor of moradoresAfetados) {
        await supabase
          .from('moradores')
          .update({ 
            unidade: numLimpo,
            bloco: eEstruturaCasasAtivo ? 'Casa' : (mor.bloco || '')
          })
          .eq('id', mor.id);
      }

      // Fallback direto por query caso algum morador não estivesse no cache de estado
      await supabase
        .from('moradores')
        .update({ unidade: numLimpo })
        .eq('condominio_id', targetCondoId)
        .eq('unidade', u.numero);

      // 2. Atualizar a lista de unidades customizadas da configuração
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      let listaBase: string[] = [];
      if (Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0) {
        listaBase = [...configCondoAtivo.unidades_customizadas];
      } else {
        listaBase = Array.from({ length: totalQtd }, (_, i) => {
          const n = i + 1;
          return (configCondoAtivo?.zeros_esquerda !== false && n < 10) ? String(n).padStart(2, '0') : String(n);
        });
      }

      // Garantir tamanho
      while (listaBase.length < totalQtd) {
        const n = listaBase.length + 1;
        listaBase.push((configCondoAtivo?.zeros_esquerda !== false && n < 10) ? String(n).padStart(2, '0') : String(n));
      }

      if (u.indiceOriginal !== undefined && u.indiceOriginal >= 0 && u.indiceOriginal < listaBase.length) {
        listaBase[u.indiceOriginal] = numLimpo;
      } else {
        const idx = listaBase.findIndex(val => saoUnidadesEquivalentes(val, u.numero));
        if (idx !== -1) {
          listaBase[idx] = numLimpo;
        } else {
          listaBase.push(numLimpo);
        }
      }

      // 3. Salvar no Supabase (turnos_plantao.unidades_customizadas) e LocalStorage
      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaBase
      });

      // 4. Atualizar o estado em memória
      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `Identificação alterada de "${u.bloco ? `${u.bloco} ` : ''}${u.numero}" para "${u.bloco ? `${u.bloco} ` : ''}${numLimpo}" com sucesso!` 
      });

      setUnidadeEditandoId(null);
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar novo número: ${err.message}` });
    } finally {
      setSalvandoNumeroUnidade(false);
      setLoading(false);
    }
  };

  const abrirModalRenumeracao = () => {
    if (!podeCustomizarEstrutura) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: operadores não possuem permissão para personalizar unidades.' });
      return;
    }
    const numsAtuais = listaCardsGerados.map(c => c.numero).join('\n');
    setTextoListaUnidades(numsAtuais);
    setModalRenumeracaoAberto(true);
  };

  const salvarRenumeracaoEmLote = async () => {
    if (!podeCustomizarEstrutura) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: apenas supervisores e masters podem alterar a lista de unidades.' });
      return;
    }
    // Suportar quebra de linha (\n), vírgula (,), ponto e vírgula (;) e espaços
    const linhas = textoListaUnidades
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (linhas.length === 0) {
      setMensagem({ tipo: 'erro', texto: 'Informe ao menos um número de unidade/casa.' });
      return;
    }

    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;

      // Sincronizar moradores existentes com o novo formato de unidade correspondente
      for (const m of moradores) {
        if (!m.unidade) continue;
        const novoEquiv = linhas.find(n => saoUnidadesEquivalentes(n, m.unidade));
        if (novoEquiv && novoEquiv !== m.unidade) {
          await supabase
            .from('moradores')
            .update({ unidade: novoEquiv })
            .eq('id', m.id);
        }
      }

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: linhas,
        unidades_por_bloco: linhas.length
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `${linhas.length} números de ${eEstruturaCasasAtivo ? 'casas' : 'unidades'} salvos com sucesso!` 
      });

      setModalRenumeracaoAberto(false);
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao renumerar unidades: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const formatarTodasComZeroEsquerda = async () => {
    if (!podeCustomizarEstrutura) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: operadores não possuem permissão para alterar numeração.' });
      return;
    }
    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      
      const listaFormatada: string[] = [];
      const listaAtual = Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0
        ? [...configCondoAtivo.unidades_customizadas]
        : Array.from({ length: totalQtd }, (_, i) => String(i + 1));

      for (let i = 0; i < Math.max(totalQtd, listaAtual.length); i++) {
        const val = listaAtual[i] || String(i + 1);
        listaFormatada.push(formatarComZeroEsquerda(val, 2));
      }

      // Sincronizar moradores existentes no banco para 2 dígitos (01..09)
      for (const m of moradores) {
        if (!m.unidade) continue;
        const formatada = formatarComZeroEsquerda(normalizarNumeroUnidade(m.unidade), 2);
        if (formatada && formatada !== m.unidade) {
          await supabase
            .from('moradores')
            .update({ unidade: formatada })
            .eq('id', m.id);
        }
      }

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaFormatada,
        zeros_esquerda: true
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({
        tipo: 'sucesso',
        texto: 'Todas as casas 1 a 9 foram formatadas com zero no início (01, 02, 03... 117) com sucesso!'
      });

      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao formatar com zero no início: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const adicionarCasaAvulsa = async () => {
    if (!podeCustomizarEstrutura) {
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: operadores não possuem permissão para incluir unidades avulsas.' });
      return;
    }
    const numLimpo = novaUnidadeAvulsaNumero.trim();
    if (!numLimpo) {
      setMensagem({ tipo: 'erro', texto: 'Informe o número da casa/unidade.' });
      return;
    }

    setLoading(true);
    try {
      const targetCondoId = condoAtivoId;
      const totalQtd = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
      let listaAtual = Array.isArray(configCondoAtivo?.unidades_customizadas) && configCondoAtivo.unidades_customizadas.length > 0
        ? [...configCondoAtivo.unidades_customizadas]
        : Array.from({ length: totalQtd }, (_, i) => {
            const seq = i + 1;
            return (configCondoAtivo?.zeros_esquerda !== false && seq < 10) 
              ? String(seq).padStart(2, '0') 
              : String(seq);
          });

      if (listaAtual.some(n => saoUnidadesEquivalentes(n, numLimpo))) {
        setMensagem({ tipo: 'erro', texto: `A casa/unidade "${numLimpo}" já existe na lista!` });
        setLoading(false);
        return;
      }
      listaAtual.push(numLimpo);

      const configSalva = await salvarCondominioConfig(targetCondoId, {
        unidades_customizadas: listaAtual,
        unidades_por_bloco: Math.max(Number(configCondoAtivo?.unidades_por_bloco || 0), listaAtual.length)
      });

      setMapaConfigsCondos(prev => ({
        ...prev,
        [targetCondoId]: configSalva
      }));

      setMensagem({ tipo: 'sucesso', texto: `Nova ${eEstruturaCasasAtivo ? 'Casa' : 'Unidade'} "${numLimpo}" adicionada!` });
      setModalAddUnidadeAvulsaAberto(false);
      setNovaUnidadeAvulsaNumero('');
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao adicionar unidade: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Isolamento absoluto multi-tenant de moradores por condomínio ativo
  const moradoresDoCondoAtivo = useMemo(() => {
    if (!condoAtivoId || condoAtivoId === 'global' || condoAtivoId === 'todos') return [];
    const cidNorm = String(condoAtivoId).trim().toLowerCase();
    return moradores.filter(m => String(m.condominio_id || '').trim().toLowerCase() === cidNorm);
  }, [moradores, condoAtivoId]);

  // Processamento e geração dos cards de unidades para a aba Moradores
  const listaCardsGerados = useMemo(() => {
    const cards = gerarCardsUnidadesCondominio(configCondoAtivo);
    // Assegura que se houver moradores DESTE condomínio com unidades fora do range, eles também ganhem card (sem duplicar unidades equivalentes)
    const extras: UnidadeEstruturada[] = [];
    moradoresDoCondoAtivo.forEach(m => {
      const num = (m.unidade || '').toString().trim();
      if (!num) return;
      const jaExiste = cards.some(c => saoUnidadesEquivalentes(c.numero, num)) || 
                       extras.some(e => saoUnidadesEquivalentes(e.numero, num));
      if (!jaExiste) {
        extras.push({
          id: `extra-${num}`,
          numero: num,
          bloco: m.bloco || (eEstruturaCasasAtivo ? 'Casa' : ''),
          label: eEstruturaCasasAtivo ? `Casa ${num}` : `${m.bloco ? `${m.bloco} - ` : ''}Ap. ${num}`
        });
      }
    });
    return [...cards, ...extras];
  }, [configCondoAtivo, moradoresDoCondoAtivo, eEstruturaCasasAtivo]);

  const unidadesComMoradores = useMemo(() => {
    return listaCardsGerados.map(u => {
      const moradoresDestaUnidade = moradoresDoCondoAtivo.filter(m => {
        const numMatch = saoUnidadesEquivalentes(m.unidade, u.numero);
        if (!numMatch) return false;
        if (eEstruturaCasasAtivo) return true;
        if (u.bloco && m.bloco) {
          return m.bloco.toString().trim().toLowerCase() === u.bloco.toString().trim().toLowerCase();
        }
        return true;
      });
      return {
        unidade: u,
        moradores: moradoresDestaUnidade,
        ocupada: moradoresDestaUnidade.length > 0
      };
    });
  }, [listaCardsGerados, moradoresDoCondoAtivo, eEstruturaCasasAtivo]);

  const contadoresUnidades = useMemo(() => {
    const total = unidadesComMoradores.length;
    const ocupadas = unidadesComMoradores.filter(u => u.ocupada).length;
    const vagas = total - ocupadas;
    const totalTags = moradoresDoCondoAtivo.filter(m => Boolean(m.tag_rfid && m.tag_rfid.trim())).length;
    const totalVeiculos = moradoresDoCondoAtivo.filter(m => Boolean(m.veiculo_placa && m.veiculo_placa.trim())).length;
    const totalBloqueados = moradoresDoCondoAtivo.filter(m => m.status_acesso === 'bloqueado').length;
    return { total, ocupadas, vagas, totalMoradores: moradoresDoCondoAtivo.length, totalTags, totalVeiculos, totalBloqueados };
  }, [unidadesComMoradores, moradoresDoCondoAtivo]);

  // Lista dinâmica e unificada de blocos/torres para filtro
  const listaBlocosDisponiveis = useMemo(() => {
    const lista = obterListaBlocosOuTorres(configCondoAtivo, moradoresDoCondoAtivo);
    listaCardsGerados.forEach(c => {
      const b = (c.bloco || '').trim();
      if (b && b.toLowerCase() !== 'casa' && !lista.some(existente => existente.toLowerCase() === b.toLowerCase())) {
        lista.push(b);
      }
    });
    return lista.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [configCondoAtivo, moradoresDoCondoAtivo, listaCardsGerados]);

  // Salvar ou atualizar Tag RFID de morador
  const salvarTagMorador = async (moradorId: string, novaTagUID: string) => {
    if (!moradorId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um morador para vincular a tag.' });
      return;
    }
    const uidLimpo = novaTagUID.trim();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('moradores')
        .update({ tag_rfid: uidLimpo || null })
        .eq('id', moradorId);
      if (error) throw error;
      setMoradores(prev => prev.map(m => m.id === moradorId ? { ...m, tag_rfid: uidLimpo || null } : m));
      setMensagem({
        tipo: 'sucesso',
        texto: uidLimpo ? `Tag RFID "${uidLimpo}" vinculada com sucesso!` : 'Tag RFID desvinculada com sucesso!'
      });
      setTagNovaUID('');
      setTagNovaMoradorId('');
      setTagEditandoMoradorId(null);
      setTagEditandoUID('');
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3500);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar Tag RFID: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Salvar ou atualizar Veículo de morador
  const salvarVeiculoMorador = async (moradorId: string, placa: string, modelo: string) => {
    if (!moradorId) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um morador para vincular o veículo.' });
      return;
    }
    const placaLimpa = placa.trim().toUpperCase();
    const modeloLimpo = modelo.trim();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('moradores')
        .update({ 
          veiculo_placa: placaLimpa || null,
          veiculo_modelo: modeloLimpo || null
        })
        .eq('id', moradorId);
      if (error) throw error;
      setMoradores(prev => prev.map(m => m.id === moradorId ? { 
        ...m, 
        veiculo_placa: placaLimpa || null,
        veiculo_modelo: modeloLimpo || null
      } : m));
      setMensagem({
        tipo: 'sucesso',
        texto: placaLimpa ? `Veículo placa "${placaLimpa}" salvo com sucesso!` : 'Veículo desvinculado com sucesso!'
      });
      setVeiculoNovaPlaca('');
      setVeiculoNovoModelo('');
      setVeiculoNovoMoradorId('');
      setVeiculoEditandoMoradorId(null);
      setVeiculoEditandoPlaca('');
      setVeiculoEditandoModelo('');
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3500);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar veículo: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Busca dinâmica por critério selecionado (Todos, CPF, RG, Veículo/Placa, Nome, Telefone, Unidade)
  const matchBuscaUnidadeMoradorPlaca = (item: { unidade: UnidadeEstruturada; moradores: any[] }, termo: string): boolean => {
    if (!termo) return true;
    const t = termo.trim().toLowerCase();
    if (!t) return true;

    const tLimpo = t.replace(/\D/g, '');
    const tAlfanum = t.replace(/[^a-z0-9]/gi, '');

    // 1. Filtro estrito por CPF
    if (criterioBuscaMorador === 'cpf') {
      return item.moradores.some(m => {
        if (!m.cpf) return false;
        const cLimpo = (m.cpf || '').replace(/\D/g, '');
        return (m.cpf || '').toLowerCase().includes(t) || (tLimpo.length >= 2 && cLimpo.includes(tLimpo));
      });
    }

    // 2. Filtro estrito por RG
    if (criterioBuscaMorador === 'rg') {
      return item.moradores.some(m => {
        if (!m.rg) return false;
        const rLimpo = (m.rg || '').replace(/\D/g, '');
        return (m.rg || '').toLowerCase().includes(t) || (tLimpo.length >= 2 && rLimpo.includes(tLimpo));
      });
    }

    // 3. Filtro estrito por Veículo (Placa, Modelo, Cor)
    if (criterioBuscaMorador === 'veiculo') {
      return item.moradores.some(m => {
        const plk = (m.veiculo_placa || '').toLowerCase();
        const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
        const mod = (m.veiculo_modelo || '').toLowerCase();
        const cor = (m.veiculo_cor || '').toLowerCase();
        return plk.includes(t) || (tAlfanum.length >= 2 && plkLimpa.includes(tAlfanum)) || mod.includes(t) || cor.includes(t);
      });
    }

    // 4. Filtro estrito por Nome do Morador
    if (criterioBuscaMorador === 'nome') {
      return item.moradores.some(m => 
        (m.nome || '').toLowerCase().includes(t) ||
        (m.contato_emergencia || '').toLowerCase().includes(t)
      );
    }

    // 5. Filtro estrito por Telefone / WhatsApp
    if (criterioBuscaMorador === 'telefone') {
      return item.moradores.some(m => {
        const tel = (m.telefone || '').replace(/\D/g, '');
        const telRaw = (m.telefone || '').toLowerCase();
        return telRaw.includes(t) || (tLimpo.length >= 2 && tel.includes(tLimpo));
      });
    }

    // 6. Filtro estrito por Unidade / Casa
    if (criterioBuscaMorador === 'unidade') {
      const num = (item.unidade.numero || '').toLowerCase();
      const lbl = (item.unidade.label || '').toLowerCase();
      if (num === t || num.includes(t) || lbl.includes(t) || saoUnidadesEquivalentes(item.unidade.numero, t)) return true;
      return item.moradores.some(m => saoUnidadesEquivalentes(m.unidade, t) || (m.unidade || '').toString().toLowerCase().includes(t));
    }

    // 7. Modo 'todos' (Busca Inteligente Global em todos os campos):
    // Unidade
    const num = (item.unidade.numero || '').toLowerCase();
    const lbl = (item.unidade.label || '').toLowerCase();
    if (num === t || num.includes(t) || lbl.includes(t) || saoUnidadesEquivalentes(item.unidade.numero, t)) return true;
    if (item.moradores.some(m => saoUnidadesEquivalentes(m.unidade, t) || (m.unidade || '').toString().toLowerCase().includes(t))) return true;

    // Nome
    if (item.moradores.some(m => (m.nome || '').toLowerCase().includes(t))) return true;

    // Placa / Veículo
    if (item.moradores.some(m => {
      const plk = (m.veiculo_placa || '').toLowerCase();
      const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
      const mod = (m.veiculo_modelo || '').toLowerCase();
      return plk.includes(t) || (tAlfanum.length >= 2 && plkLimpa.includes(tAlfanum)) || mod.includes(t);
    })) return true;

    // CPF
    if (tLimpo.length >= 2 && item.moradores.some(m => {
      if (!m.cpf) return false;
      const cLimpo = (m.cpf || '').replace(/\D/g, '');
      return cLimpo.includes(tLimpo) || (m.cpf || '').toLowerCase().includes(t);
    })) return true;

    // RG
    if (item.moradores.some(m => {
      if (!m.rg) return false;
      const rLimpo = (m.rg || '').replace(/\D/g, '');
      return (tLimpo.length >= 2 && rLimpo.includes(tLimpo)) || (m.rg || '').toLowerCase().includes(t);
    })) return true;

    // Telefone
    if (tLimpo.length >= 2 && item.moradores.some(m => {
      const tel = (m.telefone || '').replace(/\D/g, '');
      return tel.includes(tLimpo);
    })) return true;

    return false;
  };

  const matchBuscaItemMorador = (m: any, termo: string): boolean => {
    if (!termo) return true;
    const t = termo.trim().toLowerCase();
    if (!t) return true;

    const tLimpo = t.replace(/\D/g, '');
    const tAlfanum = t.replace(/[^a-z0-9]/gi, '');

    if (criterioBuscaMorador === 'cpf') {
      if (!m.cpf) return false;
      const cLimpo = (m.cpf || '').replace(/\D/g, '');
      return (m.cpf || '').toLowerCase().includes(t) || (tLimpo.length >= 2 && cLimpo.includes(tLimpo));
    }

    if (criterioBuscaMorador === 'rg') {
      if (!m.rg) return false;
      const rLimpo = (m.rg || '').replace(/\D/g, '');
      return (m.rg || '').toLowerCase().includes(t) || (tLimpo.length >= 2 && rLimpo.includes(tLimpo));
    }

    if (criterioBuscaMorador === 'veiculo') {
      const plk = (m.veiculo_placa || '').toLowerCase();
      const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
      const mod = (m.veiculo_modelo || '').toLowerCase();
      const cor = (m.veiculo_cor || '').toLowerCase();
      return plk.includes(t) || (tAlfanum.length >= 2 && plkLimpa.includes(tAlfanum)) || mod.includes(t) || cor.includes(t);
    }

    if (criterioBuscaMorador === 'nome') {
      return (m.nome || '').toLowerCase().includes(t) || (m.contato_emergencia || '').toLowerCase().includes(t);
    }

    if (criterioBuscaMorador === 'telefone') {
      const tel = (m.telefone || '').toLowerCase();
      const telLimpo = tel.replace(/\D/g, '');
      return tel.includes(t) || (tLimpo.length >= 2 && telLimpo.includes(tLimpo));
    }

    if (criterioBuscaMorador === 'unidade') {
      const und = (m.unidade || '').toString().toLowerCase();
      return und === t || und.includes(t) || saoUnidadesEquivalentes(m.unidade, t);
    }

    // Modo 'todos'
    const und = (m.unidade || '').toString().toLowerCase();
    if (und === t || und.includes(t) || saoUnidadesEquivalentes(m.unidade, t)) return true;
    if ((m.nome || '').toLowerCase().includes(t)) return true;
    if (m.veiculo_placa) {
      const plk = m.veiculo_placa.toLowerCase();
      const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
      if (plk.includes(t) || (tAlfanum.length >= 2 && plkLimpa.includes(tAlfanum))) return true;
    }
    if (m.veiculo_modelo && m.veiculo_modelo.toLowerCase().includes(t)) return true;
    if (m.cpf) {
      const cLimpo = m.cpf.replace(/\D/g, '');
      if (m.cpf.toLowerCase().includes(t) || (tLimpo.length >= 2 && cLimpo.includes(tLimpo))) return true;
    }
    if (m.rg) {
      const rLimpo = m.rg.replace(/\D/g, '');
      if (m.rg.toLowerCase().includes(t) || (tLimpo.length >= 2 && rLimpo.includes(tLimpo))) return true;
    }
    if (m.telefone) {
      const tel = m.telefone.replace(/\D/g, '');
      if (tLimpo.length >= 2 && tel.includes(tLimpo)) return true;
    }

    return false;
  };

  return (
    <div className="space-y-4 pb-12">
      {viewMode === 'form' ? (
        <div className="space-y-6 pb-36 md:pb-28 animate-fade-in">
          {/* TOPO DO FORMULÁRIO: CABEÇALHO PROFISSIONAL E AÇÕES */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={voltarParaLista}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
                title="Voltar para a lista"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <span className={`p-2.5 rounded-xl shrink-0 ${
                tipoFormulario === 'condominio' 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                  : tipoFormulario === 'operador' 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}>
                {tipoFormulario === 'condominio' ? (
                  <Building2 className="w-5 h-5" />
                ) : tipoFormulario === 'operador' ? (
                  <UserPlus className="w-5 h-5" />
                ) : (
                  <Home className="w-5 h-5" />
                )}
              </span>

              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  {idEdicao ? 'Edição Cadastral' : 'Novo Cadastro'}
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {idEdicao ? (
                    tipoFormulario === 'condominio' 
                      ? `Editar: ${nomeCondominio || 'Condomínio'}` 
                      : tipoFormulario === 'operador' 
                      ? `Editar: ${nomeOperador || 'Operador'}` 
                      : `Editar: ${nomeMorador || 'Morador'}`
                  ) : (
                    tipoFormulario === 'condominio' 
                      ? 'Cadastrar Novo Condomínio' 
                      : tipoFormulario === 'operador' 
                      ? 'Cadastrar Novo Operador' 
                      : 'Cadastrar Novo Morador'
                  )}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={voltarParaLista}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-cadastro-dedicado"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Salvar Condomínio'}</span>
              </button>
            </div>
          </div>

          {/* Mensagens de feedback no formulário */}
          {mensagem.texto && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold border shadow-xs ${
                mensagem.tipo === 'sucesso'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
                <span className="text-sm">{mensagem.texto}</span>
              </div>
              <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1">✕</button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMULÁRIO 1: CONDOMÍNIO (TELA CHEIA PROFISSIONAL)                       */}
          {/* ========================================================================= */}
          {tipoFormulario === 'condominio' && (
            <form id="form-cadastro-dedicado" onSubmit={salvarCondominio} className="space-y-6">
              {/* Card 0: Status Operacional do Condomínio (Ativar / Desativar) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      condominioAtivoStatus 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/50' 
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200/50'
                    }`}>
                      <Power className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Status Operacional</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          condominioAtivoStatus 
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' 
                            : 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300'
                        }`}>
                          {condominioAtivoStatus ? 'Ativo' : 'Desativado'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Ative ou desative o condomínio e o acesso de portaria e operadores
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setCondominioAtivoStatus(true)}
                    className={`p-3.5 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 text-left ${
                      condominioAtivoStatus
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${condominioAtivoStatus ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block font-bold">Condomínio Ativo</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block">Operações liberadas e guarita em funcionamento</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondominioAtivoStatus(false)}
                    className={`p-3.5 rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 text-left ${
                      !condominioAtivoStatus
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-900 dark:text-red-200 shadow-xs ring-2 ring-red-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${!condominioAtivoStatus ? 'text-red-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="block font-bold">Condomínio Desativado</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block">Operações suspensas temporariamente</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Card 1: Identificação Institucional & Endereço */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Identificação & Endereço
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nome oficial e localização do empreendimento
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nome do Condomínio *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeCondominio}
                      onChange={(e) => setNomeCondominio(e.target.value)}
                      placeholder="Ex: Residencial Flores do Bosque"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Endereço Completo
                    </label>
                    <input
                      type="text"
                      value={enderecoCondominio}
                      onChange={(e) => setEnderecoCondominio(e.target.value)}
                      placeholder="Av. Exemplo, 1234 - Bairro, Cidade/UF - CEP 00000-000"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Estrutura Física & Unidades */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                      <Home className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Tipologia & Unidades
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Estruturação das residências e controle de numeração
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Geração Automática de Cards
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Tipo de Condomínio *
                    </label>
                    <select
                      value={tipoEstruturaCondominio}
                      onChange={(e) => {
                        const novoTipo = e.target.value;
                        setTipoEstruturaCondominio(novoTipo);
                        if (isEstruturaCasas(novoTipo)) {
                          if (!unidadesPorBlocoCondominio || unidadesPorBlocoCondominio <= 1) {
                            setUnidadesPorBlocoCondominio(117);
                          }
                        } else if (novoTipo === 'blocos' || novoTipo === 'torres') {
                          const eTorre = novoTipo === 'torres';
                          const q = qtdBlocosCondominio >= 1 ? qtdBlocosCondominio : 2;
                          const u = unidadesPorBlocoCondominio >= 1 && unidadesPorBlocoCondominio <= 300 ? unidadesPorBlocoCondominio : 20;
                          setQtdBlocosCondominio(q);
                          setUnidadesPorBlocoCondominio(u);
                          if (blocosDetalhes.length === 0) {
                            const inicial: BlocoDetalhe[] = [];
                            for (let i = 0; i < q; i++) {
                              const nomeB = eTorre ? `Torre ${i + 1}` : `Bloco ${String.fromCharCode(65 + i)}`;
                              const est = criarEstruturaPadraoBloco(nomeB);
                              inicial.push({
                                nome: nomeB,
                                unidades: gerarUnidadesDeBlocoEstruturado({ nome: nomeB, unidades: 0, estrutura: est }).length,
                                estrutura: est
                              });
                            }
                            setBlocosDetalhes(inicial);
                          }
                        }
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                    >
                      {OPCOES_TIPO_ESTRUTURA.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Detalhes para Condomínio de Casas */}
                  {isEstruturaCasas(tipoEstruturaCondominio) && (
                    <div className="md:col-span-2 p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-4">
                      <div className="flex items-center gap-2.5">
                        <Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="text-sm font-black text-emerald-950 dark:text-emerald-200 block">
                            Estrutura de Casas (Bloco Fixo como "Casa")
                          </span>
                          <span className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                            Criação direta de cards numerados para cada residência
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider mb-1.5">
                            Qtd de Unidades *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            required
                            value={unidadesPorBlocoCondominio}
                            onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                            placeholder="Ex: 117"
                            className="w-full p-3 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none shadow-2xs"
                          />
                        </div>

                        <div className="flex items-end">
                          <label className="w-full flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-emerald-400 transition">
                            <input
                              type="checkbox"
                              checked={zerosEsquerdaCondominio}
                              onChange={(e) => setZerosEsquerdaCondominio(e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Numeração com zero no início (01, 02, 03... 117)
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configuração Avançada de Estrutura de Blocos e Pavimentos */}
                  {(tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres') && (
                    <div className="md:col-span-2">
                      <ConfiguracaoAvancadaBlocosPavimentos
                        tipoEstrutura={tipoEstruturaCondominio}
                        blocos={blocosDetalhes}
                        onChangeBlocos={(novos) => {
                          setBlocosDetalhes(novos);
                          setQtdBlocosCondominio(novos.length);
                          if (novos.length > 0) {
                            setUnidadesPorBlocoCondominio(novos[0].unidades);
                          }
                        }}
                        unidadesPadraoGeral={unidadesPorBlocoCondominio}
                      />
                    </div>
                  )}

                  {/* Detalhes para Numeral Direto */}
                  {tipoEstruturaCondominio === 'numeral_direto' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Quantidade Total de Unidades / Lotes *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={unidadesPorBlocoCondominio}
                        onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Ex: 100"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Escala de Plantão & Horários de Troca */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Escala & Horários de Plantão
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Definição oficial dos turnos diurno e noturno da portaria
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Modelo da Escala de Plantão
                    </label>
                    <select
                      value={escalaPlantao}
                      onChange={(e: any) => {
                        const nova = e.target.value;
                        setEscalaPlantao(nova);
                        const opt = OPCOES_ESCALA.find(o => o.id === nova);
                        if (opt && nova !== 'personalizado') {
                          setHorarioDiurnoInicio(opt.diurnoInicio);
                          setHorarioNoturnoInicio(opt.noturnoInicio);
                        }
                      }}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                    >
                      {OPCOES_ESCALA.map((op) => (
                        <option key={op.id} value={op.id}>
                          🕒 {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {escalaPlantao === 'personalizado' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          Início Diurno
                        </label>
                        <input
                          type="time"
                          value={horarioDiurnoInicio}
                          onChange={(e) => setHorarioDiurnoInicio(e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          Início Noturno
                        </label>
                        <input
                          type="time"
                          value={horarioNoturnoInicio}
                          onChange={(e) => setHorarioNoturnoInicio(e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 4: Comunicação & Canais da Portaria */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Comunicação & Síndico
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Canais da guarita e contatos do gestor responsável
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      Link do Grupo de WhatsApp da Portaria
                    </label>
                    <input
                      type="url"
                      value={whatsappGrupoUrl}
                      onChange={(e) => setWhatsappGrupoUrl(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-500" />
                      Telefone da Portaria / Ramal
                    </label>
                    <input
                      type="text"
                      value={telefonePortaria}
                      onChange={(e) => setTelefonePortaria(e.target.value)}
                      placeholder="(11) 98888-0000 ou Ramal 100"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nome do Síndico(a)
                    </label>
                    <input
                      type="text"
                      value={sindicoNome}
                      onChange={(e) => setSindicoNome(e.target.value)}
                      placeholder="Nome do Síndico Responsável"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      WhatsApp do Síndico(a)
                    </label>
                    <input
                      type="text"
                      value={sindicoWhatsapp}
                      onChange={(e) => setSindicoWhatsapp(e.target.value)}
                      placeholder="(11) 99999-8888"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Zona de Perigo / Exclusão do Condomínio (apenas na edição) */}
              {idEdicao && (
                <div className="bg-red-50/70 dark:bg-red-950/30 rounded-2xl border-2 border-red-200 dark:border-red-900/60 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-red-900 dark:text-red-200 uppercase tracking-wider">
                          Zona de Exclusão Definitiva
                        </h3>
                        <p className="text-xs text-red-700/80 dark:text-red-300/80">
                          Excluir permanentemente este condomínio do banco de dados e do sistema PorttoHub
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalExcluirCondoAberto(true)}
                      className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer active:scale-95 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir Condomínio</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 5 / Barra de Ações Integrada no Rodapé do Formulário */}
              <div className="sticky bottom-2 md:bottom-4 z-20 pt-2 pb-2">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl p-3.5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={voltarParaLista}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Cadastrar Condomínio'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* FORMULÁRIO 2: OPERADOR (TELA CHEIA)                                       */}
          {/* ========================================================================= */}
          {tipoFormulario === 'operador' && (
            <form id="form-cadastro-dedicado" onSubmit={salvarOperador} className="space-y-6">
              {/* Card 1: Perfil do Operador & Foto de Crachá */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Perfil & Identificação do Operador
                    </h3>

                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="relative group shrink-0">
                    {fotoOperador ? (
                      <img src={fotoOperador} alt="Foto Operador" loading="lazy" decoding="async" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500 shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-800 text-blue-400 font-black text-2xl flex items-center justify-center border border-slate-700 shadow-inner">
                        {nomeOperador ? nomeOperador.charAt(0).toUpperCase() : 'OP'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase block">
                      Fotografia de Perfil / Crachá
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Identificação visual nos registros de passagem de posto e auditoria
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                        <Camera className="w-4 h-4 text-blue-400" />
                        <span>{fotoOperador ? 'Trocar Foto' : 'Tirar / Enviar Foto'}</span>
                        <input type="file" accept="image/*" capture="user" onChange={handleFotoOperadorUpload} className="hidden" />
                      </label>
                      {fotoOperador && (
                        <button type="button" onClick={() => setFotoOperador('')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nome Completo do Operador *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeOperador}
                      onChange={(e) => setNomeOperador(e.target.value)}
                      placeholder="Ex: Marcos Souza Oliveira"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Login de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginOperador}
                      onChange={(e) => setLoginOperador(e.target.value.trim().toLowerCase())}
                      placeholder="Ex: marcos.porteiro"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Credenciais & Nível de Permissão */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Credenciais de Acesso & Nível RBAC
                    </h3>

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      {idEdicao ? 'Nova Senha de Acesso (opcional)' : 'Senha de Acesso *'}
                    </label>
                    <input
                      type="password"
                      required={!idEdicao}
                      value={senhaOperador}
                      onChange={(e) => setSenhaOperador(e.target.value)}
                      placeholder={idEdicao ? 'Deixe em branco para manter a senha atual' : 'Digite a senha do usuário'}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nível de Acesso / Perfil *
                    </label>
                    <select
                      value={nivelAcesso}
                      onChange={(e) => handleMudarNivelOperador(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                    >
                      {listaNiveis.map((n) => {
                        if (n.id === 'nivel_0' && !eAdmin && nivelAcesso !== '0' && nivelAcesso !== 'nivel_0') {
                          return null;
                        }
                        return (
                          <option key={n.id} value={n.id}>
                            {n.nome} {n.padrao_sistema ? '' : '★ (Customizado)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 3: Vínculo Condominial & Status da Conta */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Vínculo Condominial & Status da Conta
                    </h3>

                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eAdmin && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Condomínio Vinculado *
                      </label>
                      <select
                        value={condominioIdOperador}
                        onChange={(e) => setCondominioIdOperador(e.target.value)}
                        required
                        className="w-full p-3 rounded-xl text-sm font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition cursor-pointer"
                      >
                        <option value="">Selecione o Condomínio...</option>
                        {condominios.map((c) => (
                          <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Status da Conta / Login
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAtivoOperador(true)}
                        className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer border ${
                          ativoOperador
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        <span>Conta Ativa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAtivoOperador(false)}
                        className={`py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer border ${
                          !ativoOperador
                            ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-600/30'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span>Desativada (Ex-funcionário)</span>
                      </button>
                    </div>
                    {!ativoOperador && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-2">
                        ⚠️ Contas desativadas não conseguem autenticar nem visualizar dados no sistema. Use para revogar o acesso de ex-funcionários com segurança.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 4: Controle Granular de Permissões e Módulos */}
              <div className="space-y-3">
                <CardPermissoesOperador
                  permissoes={permissoesOperador}
                  onChange={setPermissoesOperador}
                  nomeOperador={nomeOperador}
                  loginOperador={loginOperador}
                  somenteLeitura={eOperador}
                />
              </div>

              {/* BARRA DE AÇÕES FIXA NO RODAPÉ (ACIMA DA BARRA DE MENU INFERIOR) */}
              <div className="fixed bottom-14 md:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
                <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl py-2.5 px-4 flex items-center justify-end gap-3 pointer-events-auto">
                  <button
                    type="button"
                    onClick={voltarParaLista}
                    className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    title={loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Salvar Registro'}
                    aria-label={loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Salvar Registro'}
                    className="p-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* FORMULÁRIO 3: MORADOR (TELA CHEIA CORPORATIVA)                            */}
          {/* ========================================================================= */}
          {tipoFormulario === 'morador' && (
            <form id="form-cadastro-dedicado" onSubmit={salvarMorador} className="space-y-6">
              {/* Card 1: Identificação Pessoal & Foto Facial */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Identificação Pessoal & Foto Facial
                    </h3>

                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <div className="relative group shrink-0">
                    {fotoMorador ? (
                      <img src={fotoMorador} alt="Foto Morador" loading="lazy" decoding="async" className="w-20 h-20 rounded-2xl object-cover border-2 border-purple-500 shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-2xl flex items-center justify-center border border-purple-300 dark:border-purple-800 shadow-inner">
                        {nomeMorador ? nomeMorador.charAt(0).toUpperCase() : 'MO'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase block">
                      Fotografia de Perfil do Morador
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Utilizada na identificação rápida na guarita e no controle de acesso
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs">
                        <Camera className="w-4 h-4 text-purple-200" />
                        <span>{fotoMorador ? 'Trocar Foto' : 'Tirar / Enviar Foto'}</span>
                        <input type="file" accept="image/*" capture="user" onChange={handleFotoMoradorUpload} className="hidden" />
                      </label>
                      {fotoMorador && (
                        <button type="button" onClick={() => setFotoMorador('')} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {eAdmin && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Condomínio *
                      </label>
                      <select
                        value={condominioIdMorador}
                        onChange={(e) => {
                          const novoId = e.target.value;
                          setCondominioIdMorador(novoId);
                          const cfgNovo = mapaConfigsCondos[novoId];
                          if (isEstruturaCasas(cfgNovo?.tipo_estrutura)) {
                            setBlocoMorador('Casa');
                          }
                        }}
                        required
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                      >
                        <option value="">Selecione o Condomínio...</option>
                        {condominios.map((c) => (
                          <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Nome Completo do Morador *
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeMorador}
                      onChange={(e) => setNomeMorador(e.target.value)}
                      placeholder="Ex: Carlos Eduardo da Silva"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Tipo de Vínculo *
                    </label>
                    <select
                      value={tipoMorador}
                      onChange={(e) => setTipoMorador(e.target.value)}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                    >
                      <option value="Morador">Morador</option>
                      <option value="Proprietário">Proprietário</option>
                      <option value="Inquilino">Inquilino</option>
                      <option value="Familiar">Familiar / Dependente</option>
                      <option value="Prestador Fixo">Prestador Fixo</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Localização & Unidade Residencial */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Localização Residencial & Unidade
                    </h3>

                  </div>
                </div>

                {(() => {
                  const targetCondo = eAdmin ? (condominioIdMorador || condominioFiltroAdmin) : usuarioLogado?.condominio_id;
                  const cfgTarget = mapaConfigsCondos[targetCondo];
                  const eCasasModal = isEstruturaCasas(cfgTarget?.tipo_estrutura);
                  const eTorresModal = isEstruturaTorres(cfgTarget?.tipo_estrutura);
                  const eNumeralModal = isEstruturaNumeralDireto(cfgTarget?.tipo_estrutura);
                  const listaBlocosSugestao = obterListaBlocosOuTorres(cfgTarget, moradores);
                  const rotuloBlocoModal = eTorresModal ? 'Torre' : 'Bloco';
                  const rotuloUnidadeModal = eCasasModal 
                    ? 'Número da Casa *' 
                    : eNumeralModal 
                    ? 'Número da Unidade / Lote *' 
                    : 'Apartamento / Unidade *';

                  return (
                    <div className={eNumeralModal ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                      {eCasasModal ? (
                        <div>
                          <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Bloco / Tipologia
                          </label>
                          <div className="w-full p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
                            <span>🏠 Casa (Fixo Automático)</span>
                            <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                              Automático
                            </span>
                          </div>
                        </div>
                      ) : eNumeralModal ? null : (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              {rotuloBlocoModal} *
                            </label>
                            {listaBlocosSugestao.length > 0 && (
                              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold">
                                {listaBlocosSugestao.length} {eTorresModal ? 'torres' : 'blocos'} cadastrados
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              list="lista-sugestoes-blocos-full"
                              value={blocoMorador}
                              onChange={(e) => setBlocoMorador(e.target.value)}
                              placeholder={eTorresModal ? "Selecione ou digite a Torre..." : "Selecione ou digite o Bloco..."}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                            />
                            <datalist id="lista-sugestoes-blocos-full">
                              {listaBlocosSugestao.map((b) => (
                                <option key={b} value={b} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          {rotuloUnidadeModal}
                        </label>
                        <input
                          type="text"
                          required
                          value={unidadeMorador}
                          onChange={(e) => {
                            const v = e.target.value;
                            setUnidadeMorador(/^0+[1-9]\d+.*$/.test(v.trim()) ? v.trim().replace(/^0+/, '') : v);
                          }}
                          onBlur={() => setUnidadeMorador(autoCorrigirZeroEsquerda(unidadeMorador))}
                          placeholder={eCasasModal ? "Ex: 01 ou 117" : "Ex: 01 ou 101"}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Card 3: Documentação & Contatos */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Documentação & Contatos
                    </h3>

                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={telefoneMorador}
                      onChange={(e) => setTelefoneMorador(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={cpfMorador}
                      onChange={(e) => setCpfMorador(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      RG
                    </label>
                    <input
                      type="text"
                      value={rgMorador}
                      onChange={(e) => setRgMorador(e.target.value)}
                      placeholder="00.000.000-0"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail
                    </label>
                    <input
                      type="email"
                      value={emailMorador}
                      onChange={(e) => setEmailMorador(e.target.value)}
                      placeholder="morador@email.com"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Segurança & Controle de Acesso Portaria */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Segurança & Controle de Acesso Portaria
                    </h3>

                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Status de Acesso na Portaria *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setStatusAcessoMorador('liberado')}
                        className={`p-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-2 ${
                          statusAcessoMorador === 'liberado'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>🟢 Liberado (Acesso Normal)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusAcessoMorador('aviso')}
                        className={`p-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-2 ${
                          statusAcessoMorador === 'aviso'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                        <span>🟡 Alerta / Pendência</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusAcessoMorador('bloqueado')}
                        className={`p-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-2 ${
                          statusAcessoMorador === 'bloqueado'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
                        <span>🔴 Bloqueado (Não Liberar)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-600" />
                        Tag RFID / Chaveiro
                      </label>
                      <input
                        type="text"
                        value={tagRfidMorador}
                        onChange={(e) => setTagRfidMorador(e.target.value.toUpperCase())}
                        placeholder="Ex: TAG-998822"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-slate-500" />
                        Código de Acesso / Senha
                      </label>
                      <input
                        type="text"
                        value={codigoAcessoMorador}
                        onChange={(e) => setCodigoAcessoMorador(e.target.value)}
                        placeholder="Ex: 4421"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 5: Veículo Cadastrado */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Veículo Principal Cadastrado
                    </h3>

                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Placa do Veículo
                    </label>
                    <input
                      type="text"
                      value={veiculoPlacaMorador}
                      onChange={(e) => setVeiculoPlacaMorador(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC-1234 ou BRA2E19"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-black text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Modelo / Marca / Cor
                    </label>
                    <input
                      type="text"
                      value={veiculoModeloMorador}
                      onChange={(e) => setVeiculoModeloMorador(e.target.value)}
                      placeholder="Ex: Toyota Corolla Preto"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Card 6: Contato de Emergência & Observações da Portaria */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Contato de Emergência & Regras da Portaria
                    </h3>

                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Contato de Emergência (Nome, Parentesco e Telefone)
                    </label>
                    <input
                      type="text"
                      value={contatoEmergenciaMorador}
                      onChange={(e) => setContatoEmergenciaMorador(e.target.value)}
                      placeholder="Ex: Mãe Maria - (11) 98888-7777"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Observações da Portaria & Regras Específicas
                    </label>
                    <textarea
                      rows={4}
                      value={observacoesMorador}
                      onChange={(e) => setObservacoesMorador(e.target.value)}
                      placeholder="Ex: Autorizado a receber encomendas em horário comercial. Não permitir entrega com terceiro sem confirmação prévia..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* BARRA DE AÇÕES FIXA NO RODAPÉ (ACIMA DA BARRA DE MENU INFERIOR) */}
              <div className="fixed bottom-14 md:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
                <div className="max-w-4xl mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl py-2.5 px-4 flex items-center justify-end gap-3 pointer-events-auto">
                  <button
                    type="button"
                    onClick={voltarParaLista}
                    className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 font-bold text-xs transition cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    title={loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Salvar Registro'}
                    aria-label={loading ? 'Salvando...' : idEdicao ? 'Salvar Alterações' : 'Salvar Registro'}
                    className="p-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-4">
      {/* Banner de Navegação Contextual Exclusiva quando visualizando Operadores ou Moradores */}
      {eAdmin && (abaAtiva === 'operadores' || abaAtiva === 'moradores') && (
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={voltarParaCondominios}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer flex items-center gap-2 text-xs font-bold shadow-2xs active:scale-95 border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← Voltar aos Condomínios</span>
            </button>
            <div className="h-5 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">
                {abaAtiva === 'operadores' ? 'Equipe de Operadores:' : 'Moradores & Unidades:'}
              </span>
              <span className="text-xs sm:text-sm font-black text-white px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                {condominioSelecionadoHub?.nome || getNomeCondominioPorId(condominioFiltroAdmin) || 'Condomínio Selecionado'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Alertas e Notificações */}
      {mensagem.texto && (
        <div
          className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
            mensagem.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{mensagem.texto}</span>
          </div>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* 1. ABA CONDOMÍNIOS (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'condominios' && eAdmin && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Condomínio */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaCondominio}
                onChange={(e) => setBuscaCondominio(e.target.value)}
                placeholder="Buscar condomínio por nome ou endereço..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={abrirNovoCondominio}
              className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" /> <span>Add Condomínio</span>
            </button>
          </div>

          {/* Grid de Cards dos Condomínios - Responsivo, Fluido e Sem Quebra */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
            {condominios
              .filter(c => {
                if (!buscaCondominio.trim()) return true;
                const termo = buscaCondominio.toLowerCase();
                return (c.nome || '').toLowerCase().includes(termo) || (c.endereco || '').toLowerCase().includes(termo);
              })
              .map((c) => {
                const cfg = mapaConfigsCondos[c.id] || {};
                const ehCasas = isEstruturaCasas(cfg.tipo_estrutura);
                const qtdUnidades = ehCasas 
                  ? `${cfg.unidades_por_bloco || 117} Casas` 
                  : (cfg.blocos_detalhes && Array.isArray(cfg.blocos_detalhes) && cfg.blocos_detalhes.length > 0)
                  ? `${cfg.blocos_detalhes.reduce((acc: number, b: any) => acc + (Number(b.unidades) || 0), 0)} Unidades`
                  : `${(cfg.qtd_blocos || 1) * (cfg.unidades_por_bloco || 20)} Unidades`;

                const ehAtivo = condoAtivoId === c.id;
                const estaDesativado = c.ativo === false;
                const cIdNorm = String(c.id || '').trim().toLowerCase();

                // Contagem precisa e em tempo real a partir do banco
                const totalOps = mapaContagensOperadores[cIdNorm] !== undefined 
                  ? mapaContagensOperadores[cIdNorm] 
                  : operadores.filter(op => {
                      const opCid = String(op.condominio_id || '').trim().toLowerCase();
                      return opCid === cIdNorm;
                    }).length;

                const totalMoradores = mapaContagensMoradores[cIdNorm] !== undefined
                  ? mapaContagensMoradores[cIdNorm]
                  : moradores.filter(m => String(m.condominio_id || '').trim().toLowerCase() === cIdNorm).length;

                return (
                  <div 
                    key={c.id} 
                    className={`rounded-3xl border p-4 sm:p-5 shadow-xs transition-all duration-200 flex flex-col justify-between w-full gap-3 text-left relative hover:shadow-lg ${
                      estaDesativado
                        ? 'bg-slate-50/80 dark:bg-slate-900/50 border-red-200 dark:border-red-900/50 opacity-90'
                        : ehAtivo
                        ? 'bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-500/70 ring-2 ring-emerald-500/20 shadow-emerald-500/10'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Topo do card: Identificação do condomínio e botões de ação (Lápis para editar + Sliders para módulos) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-3 rounded-2xl shrink-0 transition-transform ${
                          estaDesativado
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            : ehAtivo 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {ehCasas ? <Home className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug truncate" title={c.nome}>
                              {c.nome}
                            </h4>
                            {estaDesativado ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 shrink-0 border border-red-200 dark:border-red-800">
                                Desativado
                              </span>
                            ) : ehAtivo ? (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                                Ativo
                              </span>
                            ) : null}
                          </div>
                          {c.endereco ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{c.endereco}</span>
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">
                              Endereço não informado
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botão em frente ao nome do condomínio: Lápis (Editar) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Ícone de Lápis: Função Editar o Condomínio (dados, ativar/desativar e excluir) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            prepararEdicaoCondominio(c);
                          }}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 transition cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shadow-2xs hover:border-amber-300 active:scale-95"
                          title="Editar condomínio (todos os dados cadastrais, ativar/desativar e excluir)"
                        >
                          <Pencil className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </button>
                      </div>
                    </div>

                    {/* Painel de Estatísticas: Tipo/Unid., Equipe e Moradores (Qtd Cadastradas em tempo real) */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tipo / Unid.</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
                          {qtdUnidades}
                        </span>
                      </div>
                      <div 
                        onClick={() => abrirOperadoresExclusivo(c)}
                        className="border-x border-slate-200 dark:border-slate-800 px-1 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer"
                        title="Ver equipe de operadores cadastrados deste condomínio"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Equipe</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 truncate block">
                          {loading && operadores.length === 0 ? (
                            <span className="opacity-50">...</span>
                          ) : (
                            `${totalOps} ${totalOps === 1 ? 'Op' : 'Ops'}`
                          )}
                        </span>
                      </div>
                      <div 
                        onClick={() => abrirMoradoresExclusivo(c)}
                        className="hover:bg-purple-50/50 dark:hover:bg-purple-950/30 rounded-lg transition cursor-pointer"
                        title="Ver moradores cadastrados deste condomínio"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Moradores</span>
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 truncate block">
                          {loading && moradores.length === 0 ? (
                            <span className="opacity-50">...</span>
                          ) : (
                            `${totalMoradores} Cad.`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Ações Diretas no Rodapé do Card */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {/* Botão Módulos */}
                      <button
                        type="button"
                        onClick={() => abrirGerenciadorModulosCondo(c)}
                        className="py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs active:scale-95"
                        title="Gerenciar módulos ativos deste condomínio"
                      >
                        <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Módulos</span>
                      </button>

                      {/* Botão Operadores */}
                      <button
                        type="button"
                        onClick={() => abrirOperadoresExclusivo(c)}
                        className="py-2 px-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs active:scale-95"
                        title="Gerenciar equipe e operadores deste condomínio"
                      >
                        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Equipe</span>
                      </button>

                      {/* Botão Moradores */}
                      <button
                        type="button"
                        onClick={() => abrirMoradoresExclusivo(c)}
                        className="py-2 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs active:scale-95"
                        title="Gerenciar moradores e unidades deste condomínio"
                      >
                        <Home className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>Unidades</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
          {condominios.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum condomínio cadastrado ainda.</p>
              <button
                onClick={abrirNovoCondominio}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Condomínio
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. ABA OPERADORES (VISÃO DE CARDS COMPLETA COM MENU FLUTUANTE) */}
      {abaAtiva === 'operadores' && !eOperador && (
        <div className="space-y-4">
          {/* Barra de Ações: Busca e Botão de Novo Operador */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={buscaOperador}
                onChange={(e) => setBuscaOperador(e.target.value)}
                placeholder="Buscar operador por nome ou login..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-black px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shrink-0">
                {operadoresVisiveis.length} {operadoresVisiveis.length === 1 ? 'Operador Cadastrado' : 'Operadores Cadastrados'}
              </span>
              <button
                type="button"
                onClick={abrirNovoOperador}
                className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" /> <span>+ Operador</span>
              </button>
            </div>
          </div>

          {/* Grid de Cards dos Operadores - Minimalista & Limpo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {operadoresVisiveis
              .filter(op => {
                if (!buscaOperador.trim()) return true;
                const termo = buscaOperador.toLowerCase();
                return (op.nome || '').toLowerCase().includes(termo) || (op.login || '').toLowerCase().includes(termo);
              })
              .map((op) => {
                const estaAtivo = op.ativo !== false;
                const permsOp = obterPermissoesOperador(op);
                const qtdModulos = contarModulosHabilitados(permsOp);
                const totalModulos = MODULOS_DEFINICAO_RBAC.length;
                return (
                  <div 
                    key={op.id} 
                    className={`bg-white rounded-xl border p-3 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between gap-2.5 ${
                      estaAtivo ? 'border-slate-200/80' : 'border-red-200 bg-red-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {op.foto_url ? (
                          <img 
                            src={op.foto_url} 
                            alt={op.nome} 
                            loading="lazy" 
                            decoding="async" 
                            className={`w-9 h-9 rounded-lg object-cover border shrink-0 ${
                              estaAtivo ? 'border-slate-200' : 'border-red-300 opacity-60'
                            }`} 
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 border ${
                            estaAtivo ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {op.nome ? op.nome.charAt(0).toUpperCase() : 'OP'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className={`font-bold text-xs sm:text-sm truncate ${
                            estaAtivo ? 'text-slate-900' : 'text-slate-500 line-through'
                          }`}>
                            {op.nome}
                          </h4>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            @{op.login}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => alternarStatusOperador(op)}
                          title={estaAtivo ? "Clique para desativar login de ex-funcionário" : "Clique para reativar"}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                            estaAtivo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                              : 'bg-red-50 text-red-700 border-red-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                          }`}
                        >
                          {estaAtivo ? 'Ativo' : 'Desativado'}
                        </button>
                        {!eOperador && (
                          <button
                            type="button"
                            onClick={() => abrirModalPermissoesRapido(op)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Gerenciar Acessos & Permissões deste operador"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => prepararEdicaoOperador(op)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar operador e permissões"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="truncate pr-2 font-medium">
                        {getNomeCondominioPorId(op.condominio_id)}
                      </span>
                      <button
                        type="button"
                        onClick={() => !eOperador && abrirModalPermissoesRapido(op)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 transition text-[10px] font-bold shrink-0 cursor-pointer"
                        title="Ver ou ajustar permissões deste operador"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{qtdModulos} de {totalModulos}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {operadoresVisiveis.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">Nenhum operador encontrado.</p>
              <button
                onClick={abrirNovoOperador}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Cadastrar Primeiro Operador
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA MORADORES & UNIDADES (VISÃO DE CARDS POR CASAS/UNIDADES EDITÁVEIS) */}
      {abaAtiva === 'moradores' && (
        <div className="space-y-4">
          {/* Banner de Identificação do Condomínio e Estrutura */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white p-3 sm:p-4 rounded-2xl border border-slate-700 shadow-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {getNomeCondominioPorId(condoAtivoId)}
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Home className="w-3 h-3 text-emerald-400" />
                  {eEstruturaCasasAtivo ? 'Condomínio de Casas' : 'Condomínio Vertical'}
                </span>
              </div>
            </div>

            {/* Botões de Ação Rápida e Filtro Direto: Total, Ocupadas, Disponíveis, Moradores Cadastrados e Veículos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2.5 w-full pt-2.5 border-t border-slate-700/60">
              {/* Botão 1: Total Casas / Unidades */}
              <button
                type="button"
                onClick={() => {
                  setModoVisaoMoradores('cards_unidades');
                  setFiltroStatusUnidade('todas');
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between gap-1 transition-all cursor-pointer active:scale-95 text-left border ${
                  modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'todas'
                    ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-950/60'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700/80 hover:border-slate-500 shadow-2xs'
                }`}
                title="Filtrar todas as unidades para visualização, adição e edição completa"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Home className={`w-3.5 h-3.5 shrink-0 ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'todas' ? 'text-emerald-300' : 'text-emerald-400'
                  }`} />
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'todas' ? 'text-white' : 'text-slate-300'
                  }`}>
                    {eEstruturaCasasAtivo ? 'Total Casas' : 'Total Unid.'}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-emerald-400 shrink-0">{contadoresUnidades.total}</span>
              </button>

              {/* Botão 2: Ocupadas */}
              <button
                type="button"
                onClick={() => {
                  setModoVisaoMoradores('cards_unidades');
                  setFiltroStatusUnidade('ocupadas');
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between gap-1 transition-all cursor-pointer active:scale-95 text-left border ${
                  modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'ocupadas'
                    ? 'bg-emerald-900/90 border-emerald-400 ring-2 ring-emerald-500/50 shadow-md shadow-emerald-950/60'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700/80 hover:border-emerald-500/50 shadow-2xs'
                }`}
                title="Filtrar e abrir apenas unidades ocupadas para edição e adição"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'ocupadas' ? 'text-emerald-300' : 'text-emerald-400'
                  }`} />
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'ocupadas' ? 'text-emerald-200' : 'text-emerald-300'
                  }`}>
                    Ocupadas
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-white shrink-0">{contadoresUnidades.ocupadas}</span>
              </button>

              {/* Botão 3: Disponíveis */}
              <button
                type="button"
                onClick={() => {
                  setModoVisaoMoradores('cards_unidades');
                  setFiltroStatusUnidade('vagas');
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between gap-1 transition-all cursor-pointer active:scale-95 text-left border ${
                  modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'vagas'
                    ? 'bg-slate-700/95 border-amber-400 ring-2 ring-amber-500/50 shadow-md'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700/80 hover:border-slate-500 shadow-2xs'
                }`}
                title="Filtrar e abrir unidades disponíveis/vagas para edição e adição completa"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'vagas' ? 'text-amber-400' : 'text-slate-400'
                  }`} />
                  <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate ${
                    modoVisaoMoradores === 'cards_unidades' && filtroStatusUnidade === 'vagas' ? 'text-amber-300 font-black' : 'text-slate-400'
                  }`}>
                    Disponíveis
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-slate-200 shrink-0">{contadoresUnidades.vagas}</span>
              </button>

              {/* Botão 4: Moradores Cadastrados (Qtd Cadastradas) */}
              <button
                type="button"
                onClick={() => {
                  setModoVisaoMoradores(prev => prev === 'lista_moradores' ? 'cards_unidades' : 'lista_moradores');
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between gap-1 transition-all cursor-pointer active:scale-95 text-left border ${
                  modoVisaoMoradores === 'lista_moradores'
                    ? 'bg-purple-950/90 border-purple-400 ring-2 ring-purple-500/50 shadow-md shadow-purple-950/60'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700/80 hover:border-purple-400 shadow-2xs'
                }`}
                title="Visualizar moradores cadastrados no condomínio"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-300 truncate">
                    Moradores Cad.
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-purple-300 shrink-0">{contadoresUnidades.totalMoradores || 0}</span>
              </button>

              {/* Botão 5: Veículos Cadastrados */}
              <button
                type="button"
                onClick={() => {
                  setModalGerenciarVeiculosAberto(true);
                }}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl flex items-center justify-between gap-1 transition-all cursor-pointer active:scale-95 text-left border ${
                  modalGerenciarVeiculosAberto
                    ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-500/50 shadow-md shadow-amber-950/60'
                    : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700/80 hover:border-amber-400 shadow-2xs'
                }`}
                title="Abrir menu de veículos e placas para consulta e edição completa"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
                    Veículos
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-amber-300 shrink-0">{contadoresUnidades.totalVeiculos || 0}</span>
              </button>
            </div>
          </div>

          {/* Barra de Controle: Filtros e Busca */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 transition-colors">
            {/* Linha de Filtros: Filtro por Bloco/Torre ou Casa COM ÍCONE DE PESQUISA AO LADO */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Bloco / Torre ou Casa (Botões com rótulo dedicado) */}
              {eEstruturaCasasAtivo ? (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setBlocoFiltro('todos')}
                    className="px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 bg-emerald-600 text-white shadow-2xs active:scale-95"
                    title="Condomínio com estrutura de casas"
                  >
                    <Home className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Casa</span>
                  </button>
                </div>
              ) : (
                listaBlocosDisponiveis.filter(b => b && b.toLowerCase() !== 'casa').length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700/80 overflow-x-auto max-w-full scrollbar-thin">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 pl-1.5 pr-0.5 flex items-center gap-1 shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="hidden sm:inline">
                        {isEstruturaTorres(configCondoAtivo?.tipo_estrutura) ? 'Torre:' : 'Bloco:'}
                      </span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setBlocoFiltro('todos')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                        blocoFiltro === 'todos'
                          ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {isEstruturaTorres(configCondoAtivo?.tipo_estrutura) ? 'Todas' : 'Todos'}
                    </button>

                    {listaBlocosDisponiveis
                      .filter(b => b && b.toLowerCase() !== 'casa')
                      .map((b) => {
                        const rotuloBase = isEstruturaTorres(configCondoAtivo?.tipo_estrutura) ? 'Torre' : 'Bloco';
                        const labelComRotulo = b.toLowerCase().startsWith(rotuloBase.toLowerCase())
                          ? b
                          : `${rotuloBase} ${b}`;
                        const estaAtivo = blocoFiltro.toLowerCase().trim() === b.toLowerCase().trim();

                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setBlocoFiltro(estaAtivo ? 'todos' : b)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                              estaAtivo
                                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                            }`}
                            title={`Filtrar por ${labelComRotulo}`}
                          >
                            <span>{labelComRotulo}</span>
                          </button>
                        );
                      })}
                  </div>
                )
              )}

              {/* Ícone de Filtrar: Ao lado da seleção de Casa, Bloco ou Torre */}
              <button
                type="button"
                onClick={() => {
                  const novo = !buscaAberta;
                  setBuscaAberta(novo);
                  if (novo) {
                    setTimeout(() => inputBuscaRef.current?.focus(), 100);
                  }
                }}
                className={`p-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 border shrink-0 ${
                  buscaAberta || termoBuscaMorador
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 dark:border-slate-700'
                }`}
                title={buscaAberta ? 'Fechar menu de filtros e busca' : 'Filtrar por CPF, RG, Veículo, Morador ou Unidade'}
              >
                <Filter className="w-4 h-4" />
                {termoBuscaMorador && (
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                    Ativo
                  </span>
                )}
              </button>
            </div>

            {/* Painel de Busca e Filtro Selecionável Aberto Dinamicamente via Ícone de Filtrar */}
            {(buscaAberta || termoBuscaMorador) && (
              <div className="pt-2.5 pb-1 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Tabela / Seletor do que o operador está buscando: CPF, RG, Veículo, Nome, etc. */}
                <div className="bg-slate-50 dark:bg-slate-900/90 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Critério de Busca:</span>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-thin flex-wrap">
                    {[
                      { id: 'todos', label: 'Todos', placeholder: 'Buscar por unidade, morador, CPF, RG, veículo, telefone...' },
                      { id: 'cpf', label: 'CPF', placeholder: 'Digite o CPF (ex: 123.456.789-00 ou 12345678900)...' },
                      { id: 'rg', label: 'RG', placeholder: 'Digite o RG do morador...' },
                      { id: 'veiculo', label: 'Veículo / Placa', placeholder: 'Digite a placa ou modelo do veículo (ex: ABC1D23)...' },
                      { id: 'nome', label: 'Nome / Morador', placeholder: 'Digite o nome ou sobrenome do morador...' },
                      { id: 'telefone', label: 'Telefone', placeholder: 'Digite o telefone ou WhatsApp com DDD...' },
                      { id: 'unidade', label: 'Casa / Unidade', placeholder: 'Digite o número da casa ou unidade...' },
                    ].map((op) => {
                      const ativo = criterioBuscaMorador === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => {
                            setCriterioBuscaMorador(op.id as any);
                            setTimeout(() => inputBuscaRef.current?.focus(), 50);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 border ${
                            ativo
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          <span>{op.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Barra de Pesquisa com Ícone de Filtro e Botão de Limpar Embutido */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={inputBuscaRef}
                      type="text"
                      value={termoBuscaMorador}
                      onChange={(e) => setTermoBuscaMorador(e.target.value)}
                      placeholder={
                        criterioBuscaMorador === 'cpf'
                          ? 'Digite o CPF (ex: 123.456.789-00 ou números)...'
                          : criterioBuscaMorador === 'rg'
                          ? 'Digite o RG do morador...'
                          : criterioBuscaMorador === 'veiculo'
                          ? 'Digite a placa (ex: ABC1D23) ou modelo do veículo...'
                          : criterioBuscaMorador === 'nome'
                          ? 'Digite o nome do morador ou dependente...'
                          : criterioBuscaMorador === 'telefone'
                          ? 'Digite o telefone ou WhatsApp com DDD...'
                          : criterioBuscaMorador === 'unidade'
                          ? 'Digite o número da unidade ou casa...'
                          : 'Buscar em todos os campos: unidade, morador, CPF, RG, veículo...'
                      }
                      title={`Filtrando por: ${criterioBuscaMorador.toUpperCase()}`}
                      className="w-full pl-9 pr-24 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold transition shadow-2xs"
                    />
                    {termoBuscaMorador && (
                      <button
                        type="button"
                        onClick={() => {
                          setTermoBuscaMorador('');
                          inputBuscaRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                        title="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaAberta(false);
                      setTermoBuscaMorador('');
                    }}
                    className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
                    title="Fechar formulário de busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* MODO 1: GRID DE CARDS POR CASAS / UNIDADES (117 CARDS GERADOS)            */}
          {/* ========================================================================= */}
          {modoVisaoMoradores === 'cards_unidades' && (
            <div className="space-y-3">
              {/* Contagem de cards exibidos */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Exibindo{' '}
                  <strong className="text-slate-800">
                    {unidadesComMoradores.filter(item => {
                      if (filtroStatusUnidade === 'ocupadas' && !item.ocupada) return false;
                      if (filtroStatusUnidade === 'vagas' && item.ocupada) return false;
                      if (blocoFiltro !== 'todos') {
                        const bFiltro = blocoFiltro.toLowerCase().trim();
                        const blocoCard = (item.unidade.bloco || '').toLowerCase().trim();
                        const matchBlocoCard = blocoCard === bFiltro || blocoCard.includes(bFiltro) || bFiltro.includes(blocoCard);
                        const matchBlocoMoradores = item.moradores.some(m => {
                          const mb = (m.bloco || '').toLowerCase().trim();
                          return mb === bFiltro || mb.includes(bFiltro) || bFiltro.includes(mb);
                        });
                        if (!matchBlocoCard && !matchBlocoMoradores) return false;
                      }
                      if (faixaCasasFiltro !== 'todas') {
                        const num = parseInt(item.unidade.numero.replace(/\D/g, ''), 10);
                        if (!isNaN(num)) {
                          if (faixaCasasFiltro === '1_30' && (num < 1 || num > 30)) return false;
                          if (faixaCasasFiltro === '31_60' && (num < 31 || num > 60)) return false;
                          if (faixaCasasFiltro === '61_90' && (num < 61 || num > 90)) return false;
                          if (faixaCasasFiltro === '91_120' && num < 91) return false;
                        }
                      }
                      if (filtroStatusAcesso !== 'todos') {
                        const temAcesso = item.moradores.some(m => (m.status_acesso || 'liberado') === filtroStatusAcesso);
                        if (!temAcesso) return false;
                      }
                      if (filtroTipoMorador !== 'todos') {
                        const temTipo = item.moradores.some(m => (m.tipo || 'Morador') === filtroTipoMorador);
                        if (!temTipo) return false;
                      }
                      return matchBuscaUnidadeMoradorPlaca(item, termoBuscaMorador);
                    }).length}
                  </strong>{' '}
                  de {contadoresUnidades.total} {eEstruturaCasasAtivo ? 'casas' : 'unidades'}
                </span>
              </div>

              {/* Grid Responsivo de Cards de Casas/Unidades: cabe de 2 a 3 cards no celular, ergonômico e veloz para operadores */}
              <div className="grid grid-cols-2 min-[410px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
                {unidadesComMoradores
                  .filter(item => {
                    if (filtroStatusUnidade === 'ocupadas' && !item.ocupada) return false;
                    if (filtroStatusUnidade === 'vagas' && item.ocupada) return false;
                    if (blocoFiltro !== 'todos') {
                      const bFiltro = blocoFiltro.toLowerCase().trim();
                      const blocoCard = (item.unidade.bloco || '').toLowerCase().trim();
                      const matchBlocoCard = blocoCard === bFiltro || blocoCard.includes(bFiltro) || bFiltro.includes(blocoCard);
                      const matchBlocoMoradores = item.moradores.some(m => {
                        const mb = (m.bloco || '').toLowerCase().trim();
                        return mb === bFiltro || mb.includes(bFiltro) || bFiltro.includes(mb);
                      });
                      if (!matchBlocoCard && !matchBlocoMoradores) return false;
                    }
                    if (faixaCasasFiltro !== 'todas') {
                      const num = parseInt(item.unidade.numero.replace(/\D/g, ''), 10);
                      if (!isNaN(num)) {
                        if (faixaCasasFiltro === '1_30' && (num < 1 || num > 30)) return false;
                        if (faixaCasasFiltro === '31_60' && (num < 31 || num > 60)) return false;
                        if (faixaCasasFiltro === '61_90' && (num < 61 || num > 90)) return false;
                        if (faixaCasasFiltro === '91_120' && num < 91) return false;
                      }
                    }
                    if (filtroStatusAcesso !== 'todos') {
                      const temAcesso = item.moradores.some(m => (m.status_acesso || 'liberado') === filtroStatusAcesso);
                      if (!temAcesso) return false;
                    }
                    if (filtroTipoMorador !== 'todos') {
                      const temTipo = item.moradores.some(m => (m.tipo || 'Morador') === filtroTipoMorador);
                      if (!temTipo) return false;
                    }
                    return matchBuscaUnidadeMoradorPlaca(item, termoBuscaMorador);
                  })
                  .map((item) => {
                    const qtdMoradores = item.moradores.length;
                    const qtdVeiculos = item.moradores.filter((m: any) => Boolean(m.veiculo_placa && m.veiculo_placa.trim())).length;

                    // 1. Sem nenhum dado = VERMELHO (sem moradores cadastrados)
                    const semDados = qtdMoradores === 0;

                    // 2. Dados pendentes = AMARELO:
                    // Se tem morador com contato/documento pendente, OU se começou a preencher veículo e deixou incompleto.
                    // (Se a unidade simplesmente não tem carro, NÃO é pendência!)
                    const temPendencia = !semDados && item.moradores.some((m: any) => {
                      const contatoIncompleto = !m.telefone?.trim() || !m.cpf?.trim();
                      const temCampoVeiculo = Boolean(
                        (m.veiculo_placa && m.veiculo_placa.trim()) || 
                        (m.veiculo_modelo && m.veiculo_modelo.trim())
                      );
                      const veiculoIncompleto = temCampoVeiculo && (
                        !m.veiculo_placa?.trim() || 
                        !m.veiculo_modelo?.trim()
                      );
                      return contatoIncompleto || veiculoIncompleto;
                    });

                    // 3. Dados OK = VERDE (tem moradores e todos os dados estão regulares)
                    const dadosOk = !semDados && !temPendencia;

                    return (
                      <div
                        key={item.unidade.id}
                        onClick={() => setUnidadeModalAberta(item)}
                        className={`rounded-xl border p-2 sm:p-2.5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-2 cursor-pointer group select-none active:scale-[0.98] ${
                          semDados
                            ? 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-300 hover:border-rose-400 text-rose-950'
                            : temPendencia
                            ? 'bg-amber-50/75 hover:bg-amber-100/75 border-amber-300 hover:border-amber-400 text-amber-950'
                            : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 hover:border-emerald-400 text-emerald-950'
                        }`}
                      >
                        {/* Topo do Card: Ícone e Identificação da Unidade (Casa e Número) */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            semDados
                              ? 'bg-rose-200 text-rose-800'
                              : temPendencia
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-emerald-600 text-white shadow-2xs'
                          }`}>
                            <Home className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs sm:text-sm font-black block truncate leading-tight">
                            {eEstruturaCasasAtivo ? `Casa ${item.unidade.numero}` : item.unidade.label}
                          </span>
                        </div>

                        {/* Dados da Unidade: Qtd de Moradores e Qtd de Veículos */}
                        <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-slate-200/60">
                          <div
                            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold truncate ${
                              semDados
                                ? 'bg-rose-100/60 text-rose-900'
                                : temPendencia
                                ? 'bg-amber-100/60 text-amber-900'
                                : 'bg-emerald-100/60 text-emerald-900'
                            }`}
                            title={`${qtdMoradores} ${qtdMoradores === 1 ? 'morador cadastrado' : 'moradores cadastrados'}`}
                          >
                            <Users className={`w-3 h-3 shrink-0 ${
                              semDados ? 'text-rose-600' : temPendencia ? 'text-amber-700' : 'text-emerald-700'
                            }`} />
                            <span className="truncate">{qtdMoradores} {qtdMoradores === 1 ? 'morador' : 'morad.'}</span>
                          </div>

                          <div
                            className={`flex items-center gap-1 px-1.5 py-1 rounded text-[10px] sm:text-[11px] font-bold truncate ${
                              semDados
                                ? 'bg-rose-100/60 text-rose-900'
                                : temPendencia
                                ? 'bg-amber-100/60 text-amber-900'
                                : 'bg-emerald-100/60 text-emerald-900'
                            }`}
                            title={`${qtdVeiculos} ${qtdVeiculos === 1 ? 'veículo cadastrado' : 'veículos cadastrados'}`}
                          >
                            <Car className={`w-3 h-3 shrink-0 ${
                              semDados ? 'text-rose-600' : temPendencia ? 'text-amber-700' : 'text-emerald-700'
                            }`} />
                            <span className="truncate">{qtdVeiculos} {qtdVeiculos === 1 ? 'veículo' : 'veíc.'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODO 2: LISTA DE MORADORES (VISÃO EM TABELA / CARDS DE PESSOAS)           */}
          {/* ========================================================================= */}
          {modoVisaoMoradores === 'lista_moradores' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {moradores
                  .filter(m => {
                    if (blocoFiltro !== 'todos') {
                      const bFiltro = blocoFiltro.toLowerCase().trim();
                      const mb = (m.bloco || '').toLowerCase().trim();
                      if (mb !== bFiltro && !mb.includes(bFiltro) && !bFiltro.includes(mb)) return false;
                    }
                    if (filtroTipoMorador !== 'todos' && (m.tipo || 'Morador') !== filtroTipoMorador) return false;
                    if (filtroStatusAcesso !== 'todos' && (m.status_acesso || 'liberado') !== filtroStatusAcesso) return false;
                    return matchBuscaItemMorador(m, termoBuscaMorador);
                  })
                  .map((m) => {
                    const telLimpo = (m.telefone || '').replace(/\D/g, '');
                    const statusAcesso = m.status_acesso || 'liberado';

                    return (
                      <div 
                        key={m.id}
                        className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between ${
                          statusAcesso === 'bloqueado' 
                            ? 'border-rose-300 bg-rose-50/20' 
                            : statusAcesso === 'aviso'
                            ? 'border-amber-300 bg-amber-50/20'
                            : 'border-slate-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Topo do Morador com Avatar, Nome e Badges */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {m.foto_url ? (
                                <img 
                                  src={m.foto_url} 
                                  alt={m.nome} 
                                  loading="lazy"
                                  decoding="async"
                                  className="w-11 h-11 rounded-2xl object-cover shrink-0 border-2 border-purple-400 shadow-2xs" 
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 border ${
                                  statusAcesso === 'bloqueado'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : statusAcesso === 'aviso'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-purple-100 text-purple-800 border-purple-200'
                                }`}>
                                  {m.nome ? m.nome.slice(0, 2).toUpperCase() : 'MO'}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 border border-emerald-200">
                                    {eEstruturaCasasAtivo ? `Casa ${m.unidade}` : `${m.bloco ? `${m.bloco} - ` : ''}Ap. ${m.unidade}`}
                                  </span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                    {m.tipo || 'Morador'}
                                  </span>
                                </div>
                                <h4 className="font-black text-slate-900 text-sm mt-0.5 truncate">{m.nome}</h4>
                              </div>
                            </div>

                            {/* Badge de Status de Acesso */}
                            <div className="shrink-0">
                              {statusAcesso === 'bloqueado' ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" /> Bloqueado
                                </span>
                              ) : statusAcesso === 'aviso' ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Alerta
                                </span>
                              ) : (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Liberado
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Credenciais de Controle de Acesso e Contatos */}
                          <div className="space-y-1.5 text-xs text-slate-600">
                            {/* Telefone e Documento */}
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="flex items-center gap-1 truncate text-slate-700 font-semibold">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                {m.telefone || 'Sem telefone'}
                              </span>
                              {m.cpf && (
                                <span className="text-slate-400 font-mono text-[10px] shrink-0">
                                  CPF: {m.cpf}
                                </span>
                              )}
                            </div>

                            {/* Tags RFID e Veículos Cadastrados */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.tag_rfid ? (
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1">
                                  <CreditCard className="w-3 h-3 text-indigo-600" /> Tag: {m.tag_rfid}
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">Sem tag RFID</span>
                              )}

                              {m.veiculo_placa && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                                  <Car className="w-3 h-3 text-amber-700" /> {m.veiculo_placa} {m.veiculo_modelo ? `(${m.veiculo_modelo})` : ''}
                                </span>
                              )}

                              {m.codigo_acesso && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                  <Key className="w-3 h-3 text-slate-500" /> Senha ativa
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Ações Rápidas do Morador */}
                        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                          {telLimpo ? (
                            <a
                              href={`https://wa.me/55${telLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sem WhatsApp</span>
                          )}

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMoradorDetalheModal(m)}
                              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                              title="Visualizar Dossiê Completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => prepararEdicaoMorador(m)}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirMorador(m)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                              title="Excluir Morador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {moradoresDoCondoAtivo.length === 0 && (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Home className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">Nenhum morador encontrado com os filtros atuais.</p>
                  <button
                    onClick={() => abrirNovoMorador()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Cadastrar Primeiro Morador
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}




        </div>
      )}

      {/* Modal de Personalização / Renumeração em Lote das Unidades */}
      {modalRenumeracaoAberto && podeCustomizarEstrutura && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Pencil className="w-5 h-5 text-amber-700" />
                </span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Personalizar Unidades & Numeração
                  </h4>
                  <p className="text-xs text-slate-500">
                    Condomínio: {getNomeCondominioPorId(condoAtivoId)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRenumeracaoAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ação Rápida Movida para Dentro do Modal: Salvar 01, 02, 03... diretamente no banco */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="text-xs font-black text-emerald-950">
                    Salvar Unidades com 2 Dígitos (01, 02, 03...)
                  </h5>
                  <p className="text-[11px] text-emerald-800">
                    Formata automaticamente todas as unidades de 1 a 9 com zero à esquerda e grava no banco.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await formatarTodasComZeroEsquerda();
                  setModalRenumeracaoAberto(false);
                }}
                disabled={loading}
                className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                title="Aplica e salva no banco de dados a formatação 01, 02, 03..."
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>{loading ? 'Salvando...' : 'Salvar 01, 02, 03...'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-slate-600">
                Digite ou cole os números das casas (um por linha ou separados por vírgula). Se as identificações forem <strong>01, 02, 03</strong> ou personalizadas (ex: <strong>12A, 14, Lote 3</strong>), ajuste livremente abaixo:
              </p>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const total = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
                    const seq = Array.from({ length: total }, (_, i) => {
                      const n = i + 1;
                      return n < 10 ? String(n).padStart(2, '0') : String(n);
                    }).join('\n');
                    setTextoListaUnidades(seq);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 rounded-lg font-black transition cursor-pointer flex items-center gap-1 border border-emerald-300 shadow-2xs"
                  title="Gera sequência 01, 02, 03... com zero à esquerda nos números de 1 dígito"
                >
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  ✨ Gerar 01 a {configCondoAtivo?.unidades_por_bloco || 117} (com zero: 01, 02, 03...)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const total = configCondoAtivo?.unidades_por_bloco ? Number(configCondoAtivo.unidades_por_bloco) : 117;
                    const seq = Array.from({ length: total }, (_, i) => String(i + 1)).join('\n');
                    setTextoListaUnidades(seq);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition cursor-pointer"
                >
                  🔢 Gerar 1 a {configCondoAtivo?.unidades_por_bloco || 117} (sem zero)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const itens = textoListaUnidades.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
                    const convertidos = itens.map(s => formatarComZeroEsquerda(s, 2));
                    setTextoListaUnidades(convertidos.join('\n'));
                  }}
                  className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-lg font-bold transition cursor-pointer border border-amber-300"
                  title="Converte 1 -> 01, 2 -> 02, etc."
                >
                  0️⃣ Adicionar zero aos números 1..9 (01, 02...)
                </button>
              </div>

              <textarea
                value={textoListaUnidades}
                onChange={(e) => setTextoListaUnidades(e.target.value)}
                rows={10}
                placeholder="Exemplo:&#10;01&#10;02&#10;03&#10;... ou separados por vírgula: 01, 02, 03"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Total de casas/unidades informadas: <strong>{textoListaUnidades.split(/[\n,;]+/).filter(s => s.trim()).length}</strong></span>
                <span className="text-[10px] text-emerald-700 font-semibold">✓ Suporta quebra de linha ou vírgulas (01,02,03)</span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalRenumeracaoAberto(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarRenumeracaoEmLote}
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {loading ? 'Salvando...' : 'Salvar Lista de Unidades'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição de Casa / Unidade Avulsa */}
      {modalAddUnidadeAvulsaAberto && podeCustomizarEstrutura && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-900 rounded-xl">
                  <Home className="w-5 h-5 text-emerald-700" />
                </span>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Adicionar {eEstruturaCasasAtivo ? 'Casa Avulsa' : 'Unidade Avulsa'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {getNomeCondominioPorId(condoAtivoId)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAddUnidadeAvulsaAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Número ou Identificação da {eEstruturaCasasAtivo ? 'Casa' : 'Unidade'} *
                </label>
                <input
                  type="text"
                  value={novaUnidadeAvulsaNumero}
                  onChange={(e) => setNovaUnidadeAvulsaNumero(e.target.value)}
                  placeholder={eEstruturaCasasAtivo ? "Ex: 118 ou 12A" : "Ex: 105"}
                  autoFocus
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarCasaAvulsa();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAddUnidadeAvulsaAberto(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={adicionarCasaAvulsa}
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {loading ? 'Adicionando...' : 'Adicionar Casa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Segura para Exclusão de Morador */}
      {moradorParaExcluir && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">Excluir Morador?</h4>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Confirma a remoção de <strong>{moradorParaExcluir.nome}</strong> ({moradorParaExcluir.bloco ? `${moradorParaExcluir.bloco} - ` : ''}Unidade {moradorParaExcluir.unidade})?
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMoradorParaExcluir(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={confirmarExcluirMorador}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                {loading ? 'Removendo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR MORADORES DA UNIDADE / CASA */}
      {unidadeModalAberta && (() => {
        const itemUnidade = unidadesComMoradores.find((u: any) => u.unidade.id === unidadeModalAberta.unidade.id) || unidadeModalAberta;
        const totalMoradores = itemUnidade.moradores.length;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center">
                    <Home className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <span>{eEstruturaCasasAtivo ? `CASA ${itemUnidade.unidade.numero}` : itemUnidade.unidade.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalMoradores > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {totalMoradores > 0 ? `${totalMoradores} ${totalMoradores > 1 ? 'Moradores' : 'Morador'}` : 'Disponível'}
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setUnidadeModalAberta(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão de Adicionar Morador nesta Unidade */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    abrirNovoMorador({ numero: itemUnidade.unidade.numero, bloco: itemUnidade.unidade.bloco });
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {totalMoradores > 0 ? '+ Adicionar Morador' : '+ Cadastrar Morador'}
                  </span>
                </button>
              </div>

              {/* Lista dos Moradores da Unidade */}
              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                {totalMoradores > 0 ? (
                  itemUnidade.moradores.map((m: any) => {
                    const telLimpo = (m.telefone || '').replace(/\D/g, '');

                    return (
                      <div
                        key={m.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200 flex items-center justify-between gap-2.5 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {m.foto_url ? (
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-purple-300 shadow-2xs shrink-0">
                              <ImagemOtimizada src={m.foto_url} alt={m.nome} permitirAmpliar={false} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200">
                              {m.nome ? m.nome.slice(0, 2).toUpperCase() : 'MO'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {m.nome}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {m.telefone ? `📞 ${m.telefone}` : 'Telefone não informado'} • <span className="font-semibold text-slate-700">{m.tipo || 'Morador'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {telLimpo && (
                            <a
                              href={`https://wa.me/55${telLimpo}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                              title="Conversar no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => prepararEdicaoMorador(m)}
                            className="p-2 text-slate-600 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                            title="Editar Dados do Morador"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => excluirMorador(m)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir Morador"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1">
                    <Home className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      Nenhum morador cadastrado nesta {eEstruturaCasasAtivo ? 'casa' : 'unidade'}.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setUnidadeModalAberta(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 1: GERENCIAMENTO E CONFIGURAÇÃO COMPLETA DE TAGS RFID               */}
      {/* ========================================================================= */}
      {modalGerenciarTagsAberto && (() => {
        const moradoresComTag = moradoresDoCondoAtivo.filter(m => Boolean(m.tag_rfid && m.tag_rfid.trim()));
        const moradoresFiltrados = moradoresComTag.filter(m => {
          if (!termoBuscaTags.trim()) return true;
          const termo = termoBuscaTags.trim().toLowerCase();
          const tag = (m.tag_rfid || '').toLowerCase();
          const nome = (m.nome || '').toLowerCase();
          const und = (m.unidade || '').toString().toLowerCase();
          const blk = (m.bloco || '').toLowerCase();
          return tag.includes(termo) || nome.includes(termo) || und.includes(termo) || blk.includes(termo);
        });

        const totalLiberadas = moradoresComTag.filter(m => m.status_acesso !== 'bloqueado').length;
        const totalBloqueadas = moradoresComTag.filter(m => m.status_acesso === 'bloqueado').length;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              {/* Cabeçalho do Modal de Tags */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-indigo-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <span>Gerenciamento de Tags RFID</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                        {moradoresComTag.length} cadastradas
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configuração centralizada, vinculação e edição de cartões e tags RFID
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalGerenciarTagsAberto(false);
                    setTagEditandoMoradorId(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Fechar modal de tags"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indicadores Resumidos */}
              <div className="grid grid-cols-3 gap-2 shrink-0">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Total de Tags</div>
                    <div className="text-lg font-black text-indigo-700">{moradoresComTag.length}</div>
                  </div>
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-emerald-800">Liberadas</div>
                    <div className="text-lg font-black text-emerald-700">{totalLiberadas}</div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="bg-rose-50/60 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-rose-800">Bloqueadas</div>
                    <div className="text-lg font-black text-rose-700">{totalBloqueadas}</div>
                  </div>
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
              </div>

              {/* Formulário Rápido de Cadastro / Vinculação de Nova Tag */}
              <div className="bg-indigo-50/50 border border-indigo-200/80 p-3 rounded-xl space-y-2.5 shrink-0">
                <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Vincular Nova Tag RFID a um Morador</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-6">
                    <select
                      value={tagNovaMoradorId}
                      onChange={(e) => setTagNovaMoradorId(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Selecione o morador...</option>
                      {moradoresDoCondoAtivo.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome} — {formatarIdentificacaoUnidade(m.unidade, m.bloco, configCondoAtivo?.tipo_estrutura)} {m.tag_rfid ? `(Tag atual: ${m.tag_rfid})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={tagNovaUID}
                      onChange={(e) => setTagNovaUID(e.target.value)}
                      placeholder="Código da Tag (UID)"
                      className="w-full text-xs font-mono font-bold p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={loading || !tagNovaMoradorId || !tagNovaUID.trim()}
                      onClick={() => salvarTagMorador(tagNovaMoradorId, tagNovaUID)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-2xs"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Busca de Tags */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={termoBuscaTags}
                  onChange={(e) => setTermoBuscaTags(e.target.value)}
                  placeholder="Filtrar por código da tag, morador ou unidade..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-bold placeholder:text-slate-400 placeholder:font-normal"
                />
                {termoBuscaTags && (
                  <button
                    type="button"
                    onClick={() => setTermoBuscaTags('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lista de Tags RFID */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
                {moradoresFiltrados.length > 0 ? (
                  moradoresFiltrados.map((m) => {
                    const emEdicao = tagEditandoMoradorId === m.id;
                    const statusAcesso = m.status_acesso || 'liberado';

                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition ${
                          statusAcesso === 'bloqueado'
                            ? 'bg-rose-50/30 border-rose-200'
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {emEdicao ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={tagEditandoUID}
                              onChange={(e) => setTagEditandoUID(e.target.value)}
                              placeholder="Novo código da Tag RFID"
                              autoFocus
                              className="flex-1 text-xs font-mono font-bold p-2 bg-white border border-indigo-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => salvarTagMorador(m.id, tagEditandoUID)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setTagEditandoMoradorId(null)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 tracking-wider shrink-0 flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                {m.tag_rfid}
                              </span>
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{m.nome}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                    statusAcesso === 'bloqueado' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {statusAcesso}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-bold">
                                  {formatarIdentificacaoUnidade(m.unidade, m.bloco, configCondoAtivo?.tipo_estrutura)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 justify-end shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setTagEditandoMoradorId(m.id);
                                  setTagEditandoUID(m.tag_rfid || '');
                                }}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Editar Código da Tag"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => salvarTagMorador(m.id, '')}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Desvincular / Excluir Tag"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalGerenciarTagsAberto(false);
                                  prepararEdicaoMorador(m);
                                }}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                title="Abrir cadastro completo do morador"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1.5">
                    <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      {termoBuscaTags ? 'Nenhuma tag encontrada para a busca.' : 'Nenhuma tag RFID vinculada ainda.'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Use o formulário acima para vincular uma tag a um morador.
                    </p>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalGerenciarTagsAberto(false);
                    setTagEditandoMoradorId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 2: GERENCIAMENTO E CONSULTA COMPLETA DE VEÍCULOS & PLACAS            */}
      {/* ========================================================================= */}
      {modalGerenciarVeiculosAberto && (() => {
        const moradoresComVeiculo = moradoresDoCondoAtivo.filter(m => Boolean(m.veiculo_placa && m.veiculo_placa.trim()));
        const veiculosFiltrados = moradoresComVeiculo.filter(m => {
          if (!termoBuscaVeiculos.trim()) return true;
          const termo = termoBuscaVeiculos.trim().toLowerCase();
          const placa = (m.veiculo_placa || '').toLowerCase();
          const modelo = (m.veiculo_modelo || '').toLowerCase();
          const nome = (m.nome || '').toLowerCase();
          const und = (m.unidade || '').toString().toLowerCase();
          const blk = (m.bloco || '').toLowerCase();
          return placa.includes(termo) || modelo.includes(termo) || nome.includes(termo) || und.includes(termo) || blk.includes(termo);
        });

        const totalUnidadesComCarro = new Set(moradoresComVeiculo.map(m => m.unidade)).size;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              {/* Cabeçalho do Modal de Veículos */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center">
                    <Car className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <span>Gerenciamento de Veículos & Placas</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {moradoresComVeiculo.length} cadastrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Consulta centralizada, cadastro e edição de placas e modelos de veículos
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalGerenciarVeiculosAberto(false);
                    setVeiculoEditandoMoradorId(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Fechar modal de veículos"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Indicadores Resumidos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500">Total Veículos</div>
                    <div className="text-lg font-black text-amber-700">{moradoresComVeiculo.length}</div>
                  </div>
                  <Car className="w-5 h-5 text-amber-500" />
                </div>
                <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-emerald-800">Unidades com Veículo</div>
                    <div className="text-lg font-black text-emerald-700">{totalUnidadesComCarro}</div>
                  </div>
                  <Home className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="bg-indigo-50/60 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-indigo-800">Identificação</div>
                    <div className="text-xs font-bold text-indigo-700 mt-1">Placas Mercosul & Convencionais</div>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              {/* Formulário Rápido de Cadastro de Veículo */}
              <div className="bg-amber-50/50 border border-amber-200/80 p-3 rounded-xl space-y-2.5 shrink-0">
                <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>Cadastrar Veículo para Morador</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <select
                      value={veiculoNovoMoradorId}
                      onChange={(e) => setVeiculoNovoMoradorId(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="">Selecione o morador...</option>
                      {moradoresDoCondoAtivo.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nome} — {formatarIdentificacaoUnidade(m.unidade, m.bloco, configCondoAtivo?.tipo_estrutura)} {m.veiculo_placa ? `(Placa: ${m.veiculo_placa})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={veiculoNovaPlaca}
                      onChange={(e) => setVeiculoNovaPlaca(e.target.value.toUpperCase())}
                      placeholder="Placa (ex: BRA2E19)"
                      className="w-full text-xs font-mono font-bold uppercase p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={veiculoNovoModelo}
                      onChange={(e) => setVeiculoNovoModelo(e.target.value)}
                      placeholder="Modelo / Cor (ex: Civic Prata)"
                      className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      disabled={loading || !veiculoNovoMoradorId || !veiculoNovaPlaca.trim()}
                      onClick={() => salvarVeiculoMorador(veiculoNovoMoradorId, veiculoNovaPlaca, veiculoNovoModelo)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-2xs"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Busca de Veículos */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={termoBuscaVeiculos}
                  onChange={(e) => setTermoBuscaVeiculos(e.target.value)}
                  placeholder="Filtrar por placa, modelo, morador ou unidade..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-bold placeholder:text-slate-400 placeholder:font-normal"
                />
                {termoBuscaVeiculos && (
                  <button
                    type="button"
                    onClick={() => setTermoBuscaVeiculos('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lista de Veículos */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
                {veiculosFiltrados.length > 0 ? (
                  veiculosFiltrados.map((m) => {
                    const emEdicao = veiculoEditandoMoradorId === m.id;

                    return (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border bg-white border-slate-200 hover:border-amber-300 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 transition"
                      >
                        {emEdicao ? (
                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                            <input
                              type="text"
                              value={veiculoEditandoPlaca}
                              onChange={(e) => setVeiculoEditandoPlaca(e.target.value.toUpperCase())}
                              placeholder="Placa"
                              autoFocus
                              className="w-full sm:w-36 text-xs font-mono font-bold uppercase p-2 bg-white border border-amber-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={veiculoEditandoModelo}
                              onChange={(e) => setVeiculoEditandoModelo(e.target.value)}
                              placeholder="Modelo e Cor"
                              className="flex-1 text-xs font-bold p-2 bg-white border border-amber-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => salvarVeiculoMorador(m.id, veiculoEditandoPlaca, veiculoEditandoModelo)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setVeiculoEditandoMoradorId(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Placa com Design Mercosul Elegante */}
                              <div className="shrink-0 border border-slate-400 rounded-md overflow-hidden shadow-2xs">
                                <div className="bg-blue-700 text-white text-[7px] font-black uppercase text-center px-2 py-0.2 tracking-widest flex items-center justify-center gap-1">
                                  <span>BRASIL</span>
                                </div>
                                <div className="bg-white text-slate-900 font-mono font-black text-xs px-2.5 py-0.5 tracking-wider text-center">
                                  {m.veiculo_placa}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{m.veiculo_modelo || 'Modelo não informado'}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                                  <span className="text-slate-800">{m.nome}</span>
                                  <span>•</span>
                                  <span>{formatarIdentificacaoUnidade(m.unidade, m.bloco, configCondoAtivo?.tipo_estrutura)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 justify-end shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setVeiculoEditandoMoradorId(m.id);
                                  setVeiculoEditandoPlaca(m.veiculo_placa || '');
                                  setVeiculoEditandoModelo(m.veiculo_modelo || '');
                                }}
                                className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                                title="Editar Dados do Veículo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => salvarVeiculoMorador(m.id, '', '')}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Remover Veículo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalGerenciarVeiculosAberto(false);
                                  prepararEdicaoMorador(m);
                                }}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                                title="Abrir cadastro do morador"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1.5">
                    <Car className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      {termoBuscaVeiculos ? 'Nenhum veículo encontrado para a busca.' : 'Nenhum veículo cadastrado ainda.'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Use o formulário acima para cadastrar a placa de um morador.
                    </p>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setModalGerenciarVeiculosAberto(false);
                    setVeiculoEditandoMoradorId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Rápido de Permissões do Operador direto do Card */}
      {operadorPermissoesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Permissões de {operadorPermissoesModal.nome}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    @{operadorPermissoesModal.login}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOperadorPermissoesModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <CardPermissoesOperador
                permissoes={permissoesModalState}
                onChange={setPermissoesModalState}
                nomeOperador={operadorPermissoesModal.nome}
                loginOperador={operadorPermissoesModal.login}
                somenteLeitura={eOperador}
              />
            </div>

            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOperadorPermissoesModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoPermissoesModal}
                onClick={salvarPermissoesModalHandler}
                className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{salvandoPermissoesModal ? 'Salvando...' : 'Salvar Permissões'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Menu de Ações do Condomínio Selecionado */}
      {condominioMenuAberto && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setCondominioMenuAberto(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Menu com identificação do condomínio */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 dark:from-slate-950 dark:to-emerald-950/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20 shrink-0">
                  {isEstruturaCasas(mapaConfigsCondos[condominioMenuAberto.id]?.tipo_estrutura) ? (
                    <Home className="w-6 h-6" />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Opções do Condomínio
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {condominioMenuAberto.nome}
                  </h3>
                  {condominioMenuAberto.endereco && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {condominioMenuAberto.endereco}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCondominioMenuAberto(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Opções de Ação do Condomínio: Editar, Módulos, Operadores, Moradores */}
            <div className="p-3 sm:p-4 space-y-2">
              {/* Opção 1: Gerenciar Módulos do Condomínio (Destaque Principal) */}
              <button
                type="button"
                onClick={() => {
                  const c = condominioMenuAberto;
                  setCondominioMenuAberto(null);
                  abrirGerenciadorModulosCondo(c);
                }}
                className="w-full p-3.5 rounded-xl border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:border-emerald-500 transition flex items-center justify-between group cursor-pointer active:scale-[0.98] shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition flex items-center gap-2">
                      <span>Gerenciar Módulos</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-2xs">
                        Ativação
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Ative ou desative módulos e personalize nomes exclusivos deste condomínio
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opção 2: Editar Condomínio */}
              <button
                type="button"
                onClick={() => {
                  const c = condominioMenuAberto;
                  setCondominioMenuAberto(null);
                  prepararEdicaoCondominio(c);
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 hover:border-amber-200 dark:hover:border-amber-800 transition flex items-center justify-between group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                      Editar Condomínio
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Alterar nome, endereço, blocos ou quantidade de unidades
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opção 3: Operadores & Portaria */}
              <button
                type="button"
                onClick={() => {
                  if (condominioMenuAberto) {
                    abrirOperadoresExclusivo(condominioMenuAberto);
                  }
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800 transition flex items-center justify-between group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      Operadores & Portaria
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gerenciar operadores, permissões granulares e logins
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Opção 4: Moradores & Unidades */}
              <button
                type="button"
                onClick={() => {
                  if (condominioMenuAberto) {
                    abrirMoradoresExclusivo(condominioMenuAberto);
                  }
                }}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800 transition flex items-center justify-between group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs">
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                      Moradores & Unidades
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Acessar lista de casas, apartamentos, moradores e veículos
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Rodapé do Menu */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setCondominioMenuAberto(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Condomínio */}
      {modalExcluirCondoAberto && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !excluindoCondominio && setModalExcluirCondoAberto(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/60 p-6 max-w-md w-full shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Excluir Condomínio?
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-bold">
                  Ação Irreversível
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir o condomínio <strong className="text-slate-900 dark:text-white">"{nomeCondominio}"</strong>? Esta operação removerá este condomínio do banco de dados e do PorttoHub.
            </p>

            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-[11px] text-red-800 dark:text-red-300">
              ⚠️ <strong>Atenção:</strong> Recomenda-se desativar o condomínio caso queira apenas pausar as operações sem apagar o histórico.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalExcluirCondoAberto(false)}
                disabled={excluindoCondominio}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluirCondominioConfirmado}
                disabled={excluindoCondominio}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black shadow-md shadow-red-600/30 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {excluindoCondominio ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirmar e Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão de Módulos integrado diretamente ao Condomínio */}
      <ModalGerenciadorModulosCondominio
        aberto={modalModulosCondoAberto}
        onFechar={() => {
          setModalModulosCondoAberto(false);
          setCondominioModulosAlvo(null);
        }}
        listaCondominios={condominios}
        condominioAtivoId={condominioModulosAlvo?.id || ''}
        onSalvoComSucesso={() => {
          setMensagem({
            tipo: 'sucesso',
            texto: '✓ Módulos do condomínio atualizados com sucesso!'
          });
          setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3500);
        }}
      />
    </div>
  );
}
