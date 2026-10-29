import { isModuloAtivo, carregarModulosCondominio } from './services/modulosService';
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Cadastros from './pages/Cadastros';
import Encomendas from './pages/Encomendas';
import Custodia from './pages/Custodia';
import Materiais from './pages/Materiais';
import Chaves from './pages/Chaves';
import Manutencao from './pages/Manutencao';
import Rondas from './pages/Rondas';
import Ocorrencias from './pages/Ocorrencias';
import PassagemPosto from './pages/PassagemPosto';
import PrestadoresObras from './pages/PrestadoresObras';
import Bancada from './pages/Bancada';
import Configuracoes from './pages/Configuracoes';
import HistoricoAbsoluto from './pages/HistoricoAbsoluto';
import PainelSindico from './pages/PainelSindico';
import ReservaAreas from './pages/ReservaAreas';
import ControleAcesso from './pages/ControleAcesso';
import AlertaRondaGlobal from './components/AlertaRondaGlobal';
import TutorialOperacionalPorttoHub from './components/TutorialOperacionalPorttoHub';
import ModalGerenciadorModulosCondominio from './components/ModalGerenciadorModulosCondominio';
import { OfflineIndicator } from './components/OfflineIndicator';
import ControleFonteAcessibilidade from './components/ControleFonteAcessibilidade';
import BotaoAtualizarApp from './components/BotaoAtualizarApp';
import { inicializarTema } from './services/themeService';
import { NOME_APLICACAO, VERSAO_BUILD_ATUAL } from './services/versaoService';
import { 
  useCustomizacaoVisual, 
  obterClasseTamanhoFonte, 
  obterIconeModulo, 
  isModuloOculto, 
  obterRotuloModulo, 
  obterIconeModuloDinamico 
} from './services/customizacaoVisualService';
import ModalInfoVersaoRepositorio from './components/ModalInfoVersaoRepositorio';
import AlertaNovaVersaoPWA from './components/AlertaNovaVersaoPWA';
import IndicadorConectividade from './components/IndicadorConectividade';
import EmblemaInfport from './components/EmblemaInfport';
import LeitorNFC from './components/LeitorNFC';
import ModalMeuPerfil from './components/ModalMeuPerfil';
import SupabaseDoctorModal from './components/SupabaseDoctorModal';
import BotaoNotificacoesLembretes from './components/BotaoNotificacoesLembretes';
import AlertaNoCondominioTopo from './components/AlertaNoCondominioTopo';
import ModalLembretesPortaria from './components/ModalLembretesPortaria';
import BarraTopoMenus from './components/BarraTopoMenus';
import HeaderBarPrincipal from './components/HeaderBarPrincipal';
import { checarEDispararAlarmeTrocaPlantao } from './services/lembretesService';
import { salvarCacheLocal, obterCacheLocal } from './services/offlineStorageService';
import { atualizarCacheAutonomia3Horas } from './services/offlineSyncEngine';
import { registrarAtividade } from './services/auditoriaService';
import { carregarNiveisAcesso, verificarPermissao } from './services/permissoesService';
import { isUUID } from './services/condominioService';
import { cachedQuery, aquecerCacheCondominio } from './services/redisCacheService';
import { 
  ShieldCheck, Sliders, Play, 
  Lock, 
  User, 
  Zap,
  LogOut, 
  Database, 
  Package, 
  Shield, 
  Radio, 
  Key, 
  Wrench, Hammer, 
  QrCode, 
  BookOpen,
  Repeat,
  Briefcase,
  Settings,
  Filter,
  Menu,
  X,
  Home,
  Grid,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HardHat,
  PackageCheck,
  ClipboardList,
  KeyRound,
  Eye,
  EyeOff,
  History,
  UserCheck,
  Layers,
  Calendar,
  Scan
} from 'lucide-react';

const CHAVE_SESSAO = 'infport_sessao_ativa_v1';

export default function App() {
  const [modalGerenciadorModulosAberto, setModalGerenciadorModulosAberto] = useState(false);
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState<any | null>(null);
  const [condominio, setCondominio] = useState<any | null>(null);
  const [modalLeitorNfcGlobal, setModalLeitorNfcGlobal] = useState(false);
  const [modalMeuPerfilAberto, setModalMeuPerfilAberto] = useState(false);
  const [modalSupabaseDoctorAberto, setModalSupabaseDoctorAberto] = useState(false);
  const [modalLembretesAberto, setModalLembretesAberto] = useState(false);
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(true);
  const [restaurandoSessao, setRestaurandoSessao] = useState(true);
  
  const [listaCondominios, setListaCondominios] = useState<any[]>([]);
  const [condominioAtivoId, setCondominioAtivoId] = useState('');
  const customVisual = useCustomizacaoVisual(condominioAtivoId || operador?.condominio_id);
  const [, setForcarAtualizacaoTema] = useState(0);

  useEffect(() => {
    inicializarTema();
    const handleTema = () => setForcarAtualizacaoTema(n => n + 1);
    window.addEventListener('infport_tema_alterado', handleTema);
    return () => window.removeEventListener('infport_tema_alterado', handleTema);
  }, []);

  const [menuAberto, setMenuAberto] = useState(true);
  const [drawerMobileAberto, setDrawerMobileAberto] = useState(false);

  const [featureFlags, setFeatureFlags] = useState({
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
    mod_portal_sindico: true,
    mod_guia_operacional: true,
    mod15_reserva_areas: true,
    mod16_controle_acesso: true
  });

  const [moduloAtual, setModuloAtual] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [modalVersaoInfoAberto, setModalVersaoInfoAberto] = useState(false);

  const [versaoPermissoes, setVersaoPermissoes] = useState(0);

  useEffect(() => {
    const handleAtualizacao = () => setVersaoPermissoes(v => v + 1);
    window.addEventListener('niveis_acesso_atualizados', handleAtualizacao);
    return () => window.removeEventListener('niveis_acesso_atualizados', handleAtualizacao);
  }, []);

  const eSupervisorGlobal = (Number(operador?.nivel_acesso) === 2 || operador?.perfil === 'supervisor') && (!operador?.condominio_id || operador?.condominio_id === 'global' || operador?.condominio_id === 'todos');
  const eSuperAdminGlobal = (operador?.login === 'admin' || operador?.perfil === 'admin_geral' || (Number(operador?.nivel_acesso) <= 1 && (!operador?.condominio_id || operador?.condominio_id === 'global' || operador?.condominio_id === 'todos')));
  const eAdmin = eSuperAdminGlobal || operador?.perfil === 'admin' || operador?.nivel_acesso === 0 || operador?.nivel_acesso === 1;
  const eAcessoMultiCondominio = eSuperAdminGlobal || eSupervisorGlobal || (eAdmin && (!operador?.condominio_id || operador?.condominio_id === 'global' || operador?.condominio_id === 'todos'));
  const eSindico = operador?.nivel_acesso === 4 || 
                   operador?.perfil === 'sindico' || 
                   operador?.perfil === 'Síndico' || 
                   operador?.funcao?.toLowerCase() === 'síndico' || 
                   operador?.funcao?.toLowerCase() === 'sindico';

  useEffect(() => {
    let montado = true;

    // Timer de segurança para NUNCA travar a tela em caso de lentidão de rede
    const safetyTimer = setTimeout(() => {
      if (montado) setRestaurandoSessao(false);
    }, 800);

    const restaurarSessaoSalva = async () => {
      try {
        const sessaoRaw = localStorage.getItem(CHAVE_SESSAO);
        if (sessaoRaw) {
          const sessao = JSON.parse(sessaoRaw);
          if (sessao.operadorId) {
            let { data: opData } = await supabase
              .from('operadores')
              .select('*')
              .eq('id', sessao.operadorId)
              .eq('ativo', true)
              .maybeSingle();

            if (!opData && sessao.login === 'admin') {
              opData = {
                id: 'admin_master_root',
                nome: 'Administrador Master',
                login: 'admin',
                senha: '2468',
                funcao: 'Administrador Geral',
                cargo: 'Administrador Geral',
                perfil: 'admin_geral',
                nivel_acesso: 0,
                ativo: true,
                condominio_id: 'todos',
                email: 'admin@porttohub.com',
                turno_padrao: 'Geral',
                turno: 'Geral'
              };
            }

            if (opData && montado) {
              setOperador(opData);
              const nomeAtivoRestaurado = opData.nome || opData.login || '';
              localStorage.setItem('infport_ultimo_operador_nome', nomeAtivoRestaurado);
              (window as any).__operadorAtivoNome = nomeAtivoRestaurado;
              (window as any).__operadorAtivo = opData;
              const ehSindicoOp = opData.nivel_acesso === 4 || 
                                  opData.perfil === 'sindico' || 
                                  opData.funcao?.toLowerCase() === 'síndico' || 
                                  opData.funcao?.toLowerCase() === 'sindico';
              if (ehSindicoOp) {
                setModuloAtual('painel_sindico');
              }
              const targetCondo = sessao.condominioId || opData.condominio_id;
              setCondominioAtivoId(targetCondo || '');
              if (targetCondo) {
                carregarNiveisAcesso(targetCondo);
                const { data: cData } = await supabase
                  .from('condominios')
                  .select('*')
                  .eq('id', targetCondo)
                  .maybeSingle();
                if (cData && montado) setCondominio(cData);
              } else {
                carregarNiveisAcesso();
              }
            }
          }
        }
      } catch (err) {
        console.warn('Falha ao restaurar sessão salva:', err);
      } finally {
        if (montado) setRestaurandoSessao(false);
      }
    };

    restaurarSessaoSalva();
    return () => {
      montado = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  // Garante a autonomia de 3 horas em cache local para o condomínio ativo
  useEffect(() => {
    if (condominioAtivoId) {
      atualizarCacheAutonomia3Horas(condominioAtivoId);
    }
  }, [condominioAtivoId]);

  // Pilha de histórico de navegação para permitir retornar com precisão à tela anterior
  const [historicoModulos, setHistoricoModulos] = useState<string[]>([]);

  const voltarModulo = () => {
    // 1. Dispara evento customizado para permitir que sub-telas (como formulário em Cadastros) voltem internamente
    const evento = new CustomEvent('infport_voltar_menu_anterior', { cancelable: true });
    const foiTratado = !window.dispatchEvent(evento);
    if (foiTratado) {
      return;
    }

    // 2. Retorna para o módulo anterior registrado na pilha de histórico
    if (historicoModulos.length > 0) {
      const pilhaAtualizada = [...historicoModulos];
      const moduloAnterior = pilhaAtualizada.pop();
      setHistoricoModulos(pilhaAtualizada);
      setModuloAtual(moduloAnterior || 'dashboard');
    } else {
      setModuloAtual('dashboard');
    }
  };

  useEffect(() => {
    if (!operador) return;

    window.history.replaceState({ modulo: moduloAtual }, '');

    const handlePopState = () => {
      if (moduloAtual !== 'dashboard') {
        voltarModulo();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [operador, moduloAtual, historicoModulos]);

  const mudarModulo = (novoModulo: string, substituir = false) => {
    let modDestino = novoModulo;
    if (eSindico) {
      if (modDestino === 'cadastros' || modDestino === 'configuracoes') {
        modDestino = 'painel_sindico';
      }
    }

    if (modDestino === moduloAtual) return;

    if (!substituir) {
      setHistoricoModulos(prev => [...prev, moduloAtual]);
    }
    setModuloAtual(modDestino);
    setDrawerMobileAberto(false);
    try {
      window.history.pushState({ modulo: modDestino }, '');
    } catch {}
  };

  useEffect(() => {
    if (operador) {
      carregarCondominiosHeader();
    }
  }, [operador]);

  useEffect(() => {
    if (operador) {
      let idCondTarget = (eAdmin || eAcessoMultiCondominio) ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id;
      if (!idCondTarget || idCondTarget === 'todos' || idCondTarget === 'global' || !isUUID(idCondTarget)) {
        const idSalvo = localStorage.getItem('infport_condominio_ativo_id');
        if (idSalvo && idSalvo !== 'todos' && idSalvo !== 'global' && isUUID(idSalvo)) {
          idCondTarget = idSalvo;
        } else if (listaCondominios && listaCondominios.length > 0) {
          idCondTarget = listaCondominios[0].id;
        }
      }
      if (idCondTarget && idCondTarget !== 'todos' && idCondTarget !== 'global' && isUUID(idCondTarget)) {
        carregarFeatureFlags(idCondTarget);
      }
    }
  }, [operador, condominioAtivoId, listaCondominios]);

  // Listener para atualização em tempo real quando as flags forem salvas em Configurações
  useEffect(() => {
    const handleAtualizacaoModulos = (e: any) => {
      if (e.detail) {
        const idAlvo = e.detail.condominio_id || e.detail.condominioId;
        const condoAtual = (eAdmin || eAcessoMultiCondominio) ? (condominioAtivoId || operador?.condominio_id) : operador?.condominio_id;
        if (!idAlvo || !condoAtual || idAlvo === condoAtual || condoAtual === 'todos' || condoAtual === 'global') {
          const novas = e.detail.flags || e.detail.modulos || e.detail;
          setFeatureFlags(prev => ({
            ...prev,
            ...novas
          }));
        }
      }
    };

    window.addEventListener('modulos_atualizados', handleAtualizacaoModulos);
    window.addEventListener('modulos_condominio_atualizados', handleAtualizacaoModulos);
    return () => {
      window.removeEventListener('modulos_atualizados', handleAtualizacaoModulos);
      window.removeEventListener('modulos_condominio_atualizados', handleAtualizacaoModulos);
    };
  }, [operador?.condominio_id, condominioAtivoId, eAdmin, eAcessoMultiCondominio]);

  // Listener para navegação rápida entre módulos (ex: da Bancada para Baixa ou da Passagem para Checklist)
  useEffect(() => {
    const handleNavegarModulo = (e: any) => {
      if (e.detail?.modulo) {
        if (e.detail.aba) {
          sessionStorage.setItem('bancada_aba_ativa', e.detail.aba);
        }
        setModuloAtual(e.detail.modulo);
      }
    };
    window.addEventListener('navegar_modulo', handleNavegarModulo);
    return () => window.removeEventListener('navegar_modulo', handleNavegarModulo);
  }, []);

  // Mantém a variável global idCondominioAtivo sempre sincronizada para prevenir ReferenceError em todo o sistema
  useEffect(() => {
    const idAtivo = condominioAtivoId || operador?.condominio_id || '';
    if (typeof window !== 'undefined') {
      (window as any).idCondominioAtivo = idAtivo;
    }
  }, [condominioAtivoId, operador?.condominio_id]);

  // Escuta alterações de condomínio disparadas por subcomponentes (ex: cards do Cadastros)
  useEffect(() => {
    const handleCondominioAlterado = (e: any) => {
      const novoId = e.detail?.novoCondominioId;
      if (novoId && novoId !== condominioAtivoId) {
        setCondominioAtivoId(novoId);
        const cObj = listaCondominios.find(c => c.id === novoId) || e.detail?.condominio;
        if (cObj) setCondominio(cObj);
        localStorage.setItem('infport_condominio_ativo_id', novoId);
        if (typeof window !== 'undefined') {
          (window as any).idCondominioAtivo = novoId;
        }
      }
    };
    window.addEventListener('infport:condominio_alterado', handleCondominioAlterado);
    return () => window.removeEventListener('infport:condominio_alterado', handleCondominioAlterado);
  }, [condominioAtivoId, listaCondominios]);

  const trocarCondominioGlobal = (novoId: string) => {
    setCondominioAtivoId(novoId);
    if (novoId) {
      localStorage.setItem('infport_condominio_ativo_id', novoId);
    } else {
      localStorage.removeItem('infport_condominio_ativo_id');
    }
    const cObj = listaCondominios.find(c => c.id === novoId);
    setCondominio(cObj || null);

    // Pré-aquece o cache no Redis em background para resposta ultrarrápida nos módulos
    if (novoId && novoId !== 'global' && novoId !== 'todos') {
      aquecerCacheCondominio(novoId).catch(() => {});
    }

    // Dispara evento global de troca imediata para que todos os componentes (ex: Encomendas) limpem seus estados locais
    // antes mesmo da nova requisição ao Supabase, impedindo dados de condomínio anterior na tela
    window.dispatchEvent(new CustomEvent('infport:condominio_alterado', { detail: { novoCondominioId: novoId } }));
    window.dispatchEvent(new CustomEvent('infport_sincronizar_dados_global'));
  };

  const carregarCondominiosHeader = async () => {
    try {
      const condos = await cachedQuery<any[]>({
        table: 'condominios',
        select: '*',
        orderBy: { field: 'nome', ascending: true },
        ttlSeconds: 600
      });
      setListaCondominios(condos || []);
      salvarCacheLocal('condominios', condos || [], 'global');

      // Se for admin e o condomínio ativo atual for vazio, verifica seleção preferencial
      if (eAdmin && condos && condos.length > 0) {
        const savedCondo = localStorage.getItem('infport_condominio_ativo_id');
        if (savedCondo !== null) {
          if (savedCondo && condos.some(c => c.id === savedCondo)) {
            setCondominioAtivoId(savedCondo);
            const cObj = condos.find(c => c.id === savedCondo);
            if (cObj) setCondominio(cObj);
          }
        } else if (!condominioAtivoId) {
          const condoReal = condos[0];
          if (condoReal) {
            setCondominioAtivoId(condoReal.id);
            setCondominio(condoReal);
            localStorage.setItem('infport_condominio_ativo_id', condoReal.id);
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar condomínios (tentando cache offline):', err);
      const cache = obterCacheLocal<any[]>('condominios', 'global', []);
      if (cache && cache.length > 0) {
        setListaCondominios(cache);
      }
    }
  };

  const resetarFeatureFlagsPadrao = () => {
    setFeatureFlags({
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
      mod_portal_sindico: true,
      mod_guia_operacional: true,
      mod15_reserva_areas: true,
      mod16_controle_acesso: true
    });
  };

  const carregarFeatureFlags = async (condominioId: string) => {
    let idFinal = condominioId;
    if (!idFinal || idFinal === 'todos' || idFinal === 'global' || !isUUID(idFinal)) {
      const idSalvo = localStorage.getItem('infport_condominio_ativo_id');
      if (idSalvo && idSalvo !== 'todos' && idSalvo !== 'global' && isUUID(idSalvo)) {
        idFinal = idSalvo;
      } else if (listaCondominios && listaCondominios.length > 0) {
        idFinal = listaCondominios[0].id;
      } else {
        return;
      }
    }
    try {
      const flagsConsolidadas = await carregarModulosCondominio(idFinal);
      setFeatureFlags(prev => ({
        ...prev,
        ...flagsConsolidadas
      }));
      return;
    } catch (e) {
      console.warn('Erro ao carregar modulosService:', e);
    }

    try {
      // 1. Tenta carregar do localStorage primeiro para resposta instantânea
      const cacheLocal = localStorage.getItem(`infport_flags_${condominioId}`);
      if (cacheLocal) {
        try {
          const parsed = JSON.parse(cacheLocal);
          setFeatureFlags(prev => ({
            ...prev,
            ...parsed
          }));
        } catch {
          // ignore
        }
      }

      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const ff = (typeof data.feature_flags === 'object' && data.feature_flags !== null) 
          ? data.feature_flags 
          : {};

        const resolverFlag = (chave: string, padrao: boolean = true) => {
          if (ff[chave] !== undefined && ff[chave] !== null) return Boolean(ff[chave]);
          if (data[chave] !== undefined && data[chave] !== null) return Boolean(data[chave]);
          return padrao;
        };

        const novasFlags = {
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
          mod_portal_sindico: resolverFlag('mod_portal_sindico'),
          mod_guia_operacional: resolverFlag('mod_guia_operacional'),
          mod15_reserva_areas: resolverFlag('mod15_reserva_areas'),
          mod16_controle_acesso: resolverFlag('mod16_controle_acesso')
        };

        setFeatureFlags(novasFlags);
        localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(novasFlags));
      } else {
        resetarFeatureFlagsPadrao();
      }
    } catch (err) {
      console.error('Erro ao carregar Feature Flags:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const loginLimpo = login.trim();
      const senhaLimpa = senha.trim();

      let opData: any = null;

      // Suporte instantâneo e total para o login admin / senha 2468
      if (loginLimpo.toLowerCase() === 'admin' && senhaLimpa === '2468') {
        opData = {
          id: 'admin_master_root',
          nome: 'Administrador Master',
          login: 'admin',
          senha: '2468',
          funcao: 'Administrador Geral',
          cargo: 'Administrador Geral',
          perfil: 'admin_geral',
          nivel_acesso: 0,
          ativo: true,
          condominio_id: 'todos',
          email: 'admin@porttohub.com',
          turno_padrao: 'Geral',
          turno: 'Geral',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        // Persiste/atualiza no Firestore em segundo plano
        supabase.from('operadores').upsert(opData);
      } else {
        // Busca sem restrição de maiúsculas/minúsculas (case-insensitive com ilike)
        let { data: dbData, error: opError } = await supabase
          .from('operadores')
          .select('*')
          .ilike('login', loginLimpo)
          .eq('senha', senhaLimpa)
          .maybeSingle();

        if (opError || !dbData) {
          const fallback = await supabase
            .from('operadores')
            .select('*')
            .eq('login', loginLimpo.toLowerCase())
            .eq('senha', senhaLimpa)
            .maybeSingle();
          opData = fallback.data;
        } else {
          opData = dbData;
        }
      }

      if (!opData) {
        setErro('Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }

      if (opData.ativo === false) {
        setErro('Esta conta de acesso está desativada. Entre em contato com a supervisão.');
        setLoading(false);
        return;
      }

      let condData = null;
      if (opData.condominio_id && opData.condominio_id !== 'todos' && opData.condominio_id !== 'global') {
        const { data: cData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', opData.condominio_id)
          .maybeSingle();
        condData = cData;
      } else {
        // Para admin geral com acesso total, busca o primeiro condomínio disponível
        const { data: listaCondos } = await supabase.from('condominios').select('*').limit(1);
        if (listaCondos && listaCondos.length > 0) {
          condData = listaCondos[0];
        }
      }

      const idCondFinal = condData?.id || (opData.condominio_id !== 'todos' && opData.condominio_id !== 'global' ? opData.condominio_id : '');
      setOperador(opData);
      const nomeAtivoLogin = opData.nome || opData.login || '';
      localStorage.setItem('infport_ultimo_operador_nome', nomeAtivoLogin);
      (window as any).__operadorAtivoNome = nomeAtivoLogin;
      (window as any).__operadorAtivo = opData;
      setCondominio(condData || { id: 'condo_principal_001', nome: 'Condomínio Residencial PorttoHub' });
      setCondominioAtivoId(idCondFinal);
      carregarNiveisAcesso(idCondFinal);

      if (lembrarAcesso) {
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
          operadorId: opData.id,
          login: opData.login,
          nome: nomeAtivoLogin,
          operadorNome: nomeAtivoLogin,
          condominioId: opData.condominio_id,
          salvoEm: new Date().toISOString()
        }));
      } else {
        localStorage.removeItem(CHAVE_SESSAO);
      }

      // Registra login no Histórico Absoluto
      registrarAtividade({
        modulo: 'Sistema',
        acao: 'LOGIN',
        descricao: `Operador ${opData.nome || opData.login} iniciou sessão no sistema.`,
        detalhes: { operadorId: opData.id, perfil: opData.perfil, condominioId: opData.condominio_id },
        operador_nome: opData.nome || opData.login,
        operador_id: opData.id,
        operador_login: opData.login,
        condominio_id: opData.condominio_id
      });

      const ehSindicoOp = opData.nivel_acesso === 4 || 
                          opData.perfil === 'sindico' || 
                          opData.funcao?.toLowerCase() === 'síndico' || 
                          opData.funcao?.toLowerCase() === 'sindico';
      mudarModulo(ehSindicoOp ? 'painel_sindico' : 'dashboard');

      // Dispara verificação de alarme de troca/início de plantão se houver lembretes ativos
      if (opData.condominio_id) {
        checarEDispararAlarmeTrocaPlantao(opData.condominio_id);
      }
    } catch (err: any) {
      setErro(`Falha de conexão: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (operador) {
      registrarAtividade({
        modulo: 'Sistema',
        acao: 'LOGOUT',
        descricao: `Operador ${operador.nome || operador.login} encerrou a sessão.`,
        detalhes: { operadorId: operador.id, login: operador.login },
        operador_nome: operador.nome || operador.login,
        operador_id: operador.id,
        operador_login: operador.login,
        condominio_id: operador.condominio_id
      });
    }

    localStorage.removeItem(CHAVE_SESSAO);
    setOperador(null);
    setCondominio(null);
    setLogin('');
    setSenha('');
    setCondominioAtivoId('');
    setDrawerMobileAberto(false);
  };

  const handleTrocarOperador = async (novoOperador: any) => {
    if (!novoOperador) return;

    // 1. Atualiza estado do operador ativo em memória
    setOperador(novoOperador);
    const nomeNovoOperador = novoOperador.nome || novoOperador.login || '';
    localStorage.setItem('infport_ultimo_operador_nome', nomeNovoOperador);
    (window as any).__operadorAtivoNome = nomeNovoOperador;
    (window as any).__operadorAtivo = novoOperador;

    // 2. EFETIVA O LOGIN NO DISPOSITIVO (PERSISTÊNCIA NO LOCALSTORAGE)
    // Garante que recarregamentos de página, abas em segundo plano e WhatsApp não desfaçam a troca!
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      operadorId: novoOperador.id,
      login: novoOperador.login,
      nome: nomeNovoOperador,
      operadorNome: nomeNovoOperador,
      condominioId: novoOperador.condominio_id,
      salvoEm: new Date().toISOString()
    }));

    if (novoOperador.condominio_id) {
      setCondominioAtivoId(novoOperador.condominio_id);
      localStorage.setItem('infport_condominio_ativo_id', novoOperador.condominio_id);
      try {
        const { data: cData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', novoOperador.condominio_id)
          .maybeSingle();
        if (cData) {
          setCondominio(cData);
        }
      } catch (err) {
        console.error('Erro ao sincronizar condomínio após troca de operador:', err);
      }
      carregarNiveisAcesso(novoOperador.condominio_id);
    }

    // 3. Registra assunção de plantão no Histórico Absoluto
    registrarAtividade({
      modulo: 'Passagem de Posto',
      acao: 'TROCA_OPERADOR_EFETIVADA',
      descricao: `Operador ${novoOperador.nome || novoOperador.login} assumiu oficialmente o posto (Login efetivado e autenticado no dispositivo).`,
      detalhes: { operadorId: novoOperador.id, perfil: novoOperador.perfil, condominioId: novoOperador.condominio_id },
      operador_nome: novoOperador.nome || novoOperador.login,
      operador_id: novoOperador.id,
      operador_login: novoOperador.login,
      condominio_id: novoOperador.condominio_id
    });

    // 4. Notifica globalmente outros módulos e componentes da troca
    window.dispatchEvent(new CustomEvent('infport:operador_trocado', { detail: novoOperador }));

    // 5. Redireciona para o painel principal do novo operador
    const ehSindicoOp = novoOperador.nivel_acesso === 4 || 
                        novoOperador.perfil === 'sindico' || 
                        novoOperador.funcao?.toLowerCase() === 'síndico' || 
                        novoOperador.funcao?.toLowerCase() === 'sindico';
    mudarModulo(ehSindicoOp ? 'painel_sindico' : 'dashboard');

    // 6. Toda vez que houver troca de plantão, se tiver algum lembrete, o app dispara o alarme contínuo
    const idCondAlvo = novoOperador.condominio_id || condominioAtivoId;
    if (idCondAlvo) {
      checarEDispararAlarmeTrocaPlantao(idCondAlvo);
    }
  };

  const objCondominioSelecionado = listaCondominios.find(c => c.id === condominioAtivoId);

  const operadorContextoGlobal = operador ? {
    ...operador,
    somenteLeitura: eSindico,
    eSindico: eSindico,
    condominio_id: (eAdmin && condominioAtivoId) ? condominioAtivoId : (operador.condominio_id || condominioAtivoId || ''),
    condominio_nome: (eAdmin && objCondominioSelecionado?.nome) 
      ? objCondominioSelecionado.nome 
      : (condominio?.nome || 'Condomínio Geral'),
    listaCondominios: listaCondominios
  } : null;

  const podeAcessarConfiguracoes = Boolean(
    !eSindico && (eAdmin || operador?.perfil === 'master' || operador?.nivel_acesso === 1 || verificarPermissao(operadorContextoGlobal, 'configuracoes', 'visualizar'))
  );
  const podeAcessarCadastros = Boolean(
    !eSindico && (eAdmin || operador?.perfil === 'master' || operador?.nivel_acesso === 1 || verificarPermissao(operadorContextoGlobal, 'cadastros', 'visualizar'))
  );

  const modulosDisponiveis = (eSindico ? [
    { 
      id: 'painel_sindico', 
      titulo: obterRotuloModulo('painel_sindico', customVisual.rotulosModulos, 'Síndico'), 
      icone: obterIconeModuloDinamico('painel_sindico', customVisual.iconesModulos, ShieldCheck), 
      flag: true, 
      cor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
    }
  ] : [
    ...(eAdmin ? [{ 
      id: 'painel_sindico', 
      titulo: obterRotuloModulo('painel_sindico', customVisual.rotulosModulos, 'Síndico'), 
      icone: obterIconeModuloDinamico('painel_sindico', customVisual.iconesModulos, ShieldCheck), 
      flag: isModuloAtivo('painel_sindico', featureFlags), 
      cor: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
    }] : []),
    { 
      id: 'encomendas', 
      titulo: obterRotuloModulo('encomendas', customVisual.rotulosModulos, 'Encomendas'), 
      icone: obterIconeModuloDinamico('encomendas', customVisual.iconesModulos, Package), 
      flag: isModuloAtivo('encomendas', featureFlags) && verificarPermissao(operadorContextoGlobal, 'encomendas', 'visualizar'), 
      cor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60' 
    },
    { 
      id: 'custodia', 
      titulo: obterRotuloModulo('custodia', customVisual.rotulosModulos, 'Custódia Itens'), 
      icone: obterIconeModuloDinamico('custodia', customVisual.iconesModulos, PackageCheck), 
      flag: isModuloAtivo('custodia', featureFlags) && verificarPermissao(operadorContextoGlobal, 'custodia', 'visualizar'), 
      cor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
    },
    { 
      id: 'prestadores', 
      titulo: obterRotuloModulo('prestadores', customVisual.rotulosModulos, 'Autorizados'), 
      icone: obterIconeModuloDinamico('prestadores', customVisual.iconesModulos, UserCheck), 
      flag: isModuloAtivo('prestadores', featureFlags) && (verificarPermissao(operadorContextoGlobal, 'autorizados', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'prestadores', 'visualizar')), 
      cor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60' 
    },
    { 
      id: 'materiais', 
      titulo: obterRotuloModulo('materiais', customVisual.rotulosModulos, 'Materiais Posto'), 
      icone: obterIconeModuloDinamico('materiais', customVisual.iconesModulos, ClipboardList), 
      flag: isModuloAtivo('materiais', featureFlags) && verificarPermissao(operadorContextoGlobal, 'materiais', 'visualizar'), 
      cor: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60' 
    },
    { 
      id: 'chaves', 
      titulo: obterRotuloModulo('chaves', customVisual.rotulosModulos, 'Quadro Chaves'), 
      icone: obterIconeModuloDinamico('chaves', customVisual.iconesModulos, Key), 
      flag: isModuloAtivo('chaves', featureFlags) && verificarPermissao(operadorContextoGlobal, 'chaves', 'visualizar'), 
      cor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60' 
    },
    { 
      id: 'manutencao', 
      titulo: obterRotuloModulo('manutencao', customVisual.rotulosModulos, 'Manutenção OS'), 
      icone: obterIconeModuloDinamico('manutencao', customVisual.iconesModulos, Wrench), 
      flag: isModuloAtivo('manutencao', featureFlags) && verificarPermissao(operadorContextoGlobal, 'manutencao', 'visualizar'), 
      cor: 'bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/60' 
    },
    { 
      id: 'rondas', 
      titulo: obterRotuloModulo('rondas', customVisual.rotulosModulos, 'Rondas QR'), 
      icone: obterIconeModuloDinamico('rondas', customVisual.iconesModulos, QrCode), 
      flag: isModuloAtivo('rondas', featureFlags) && verificarPermissao(operadorContextoGlobal, 'rondas', 'visualizar'), 
      cor: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700' 
    },
    { 
      id: 'ocorrencias', 
      titulo: obterRotuloModulo('ocorrencias', customVisual.rotulosModulos, 'Ocorrências'), 
      icone: obterIconeModuloDinamico('ocorrencias', customVisual.iconesModulos, BookOpen), 
      flag: isModuloAtivo('ocorrencias', featureFlags) && verificarPermissao(operadorContextoGlobal, 'ocorrencias', 'visualizar'), 
      cor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/60' 
    },
    { 
      id: 'passagem', 
      titulo: obterRotuloModulo('passagem', customVisual.rotulosModulos, 'Passagem de Posto'), 
      icone: obterIconeModuloDinamico('passagem', customVisual.iconesModulos, Repeat), 
      flag: isModuloAtivo('passagem', featureFlags) && (verificarPermissao(operadorContextoGlobal, 'passagem_posto', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'passagem', 'visualizar')), 
      cor: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60' 
    },
    { 
      id: 'bancada', 
      titulo: obterRotuloModulo('bancada', customVisual.rotulosModulos, 'Bancada'), 
      icone: obterIconeModuloDinamico('bancada', customVisual.iconesModulos, Layers), 
      flag: isModuloAtivo('bancada', featureFlags) && verificarPermissao(operadorContextoGlobal, 'bancada', 'visualizar'), 
      cor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' 
    },
    ...(podeAcessarCadastros && verificarPermissao(operadorContextoGlobal, 'cadastros', 'visualizar') ? [{ 
      id: 'cadastros', 
      titulo: obterRotuloModulo('cadastros', customVisual.rotulosModulos, 'Cadastros Base'), 
      icone: obterIconeModuloDinamico('cadastros', customVisual.iconesModulos, Database), 
      flag: isModuloAtivo('cadastros', featureFlags), 
      cor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' 
    }] : []),
    ...(verificarPermissao(operadorContextoGlobal, 'historico_absoluto', 'visualizar') ? [{ 
      id: 'historico_absoluto', 
      titulo: obterRotuloModulo('historico_absoluto', customVisual.rotulosModulos, 'Histórico Absoluto'), 
      icone: obterIconeModuloDinamico('historico_absoluto', customVisual.iconesModulos, History), 
      flag: isModuloAtivo('historico_absoluto', featureFlags), 
      cor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60' 
    }] : []),
    { 
      id: 'controle_acesso', 
      titulo: obterRotuloModulo('controle_acesso', customVisual.rotulosModulos, 'Controle de Acesso'), 
      icone: obterIconeModuloDinamico('controle_acesso', customVisual.iconesModulos, Scan), 
      flag: isModuloAtivo('controle_acesso', featureFlags) && (verificarPermissao(operadorContextoGlobal, 'controle_acesso', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'autorizados', 'visualizar')), 
      cor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60' 
    },
    { 
      id: 'reservas', 
      titulo: obterRotuloModulo('reservas', customVisual.rotulosModulos, 'Reserva de Áreas'), 
      icone: obterIconeModuloDinamico('reservas', customVisual.iconesModulos, Calendar), 
      flag: isModuloAtivo('reservas', featureFlags) && verificarPermissao(operadorContextoGlobal, 'reservas', 'visualizar'), 
      cor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
    },
  ]).filter(m => !isModuloOculto(m.id, customVisual.modulosOcultos));

  // Se o módulo ativo no momento for desativado nas flags ou bloqueado pelo perfil, redireciona para o dashboard
  useEffect(() => {
    if (moduloAtual !== 'dashboard' && moduloAtual !== 'painel_sindico') {
      const modAtivo = modulosDisponiveis.find(m => m.id === moduloAtual);
      if (!modAtivo || !modAtivo.flag) {
        setModuloAtual('dashboard');
      }
    }
  }, [featureFlags, moduloAtual, versaoPermissoes, operador, customVisual]);

  if (podeAcessarConfiguracoes && !isModuloOculto('configuracoes', customVisual.modulosOcultos)) {
    modulosDisponiveis.push({ 
      id: 'configuracoes', 
      titulo: obterRotuloModulo('configuracoes', customVisual.rotulosModulos, 'Configurações'), 
      icone: obterIconeModuloDinamico('configuracoes', customVisual.iconesModulos, Settings), 
      flag: true, 
      cor: 'bg-slate-800 text-white border-slate-900' 
    });
  }

  // Módulo de Manual Oficial & Guia Operacional (Logo abaixo de Configurações no menu)
  if (isModuloAtivo('guia_operacional', featureFlags) && !isModuloOculto('guia_operacional', customVisual.modulosOcultos)) {
    modulosDisponiveis.push({
      id: 'guia_operacional',
      titulo: obterRotuloModulo('guia_operacional', customVisual.rotulosModulos, 'Manual & Guia'),
      icone: obterIconeModuloDinamico('guia_operacional', customVisual.iconesModulos, BookOpen),
      flag: isModuloAtivo('guia_operacional', featureFlags),
      cor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
    });
  }

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row font-sans pb-20 md:pb-0 text-slate-900 dark:text-slate-100 antialiased transition-colors duration-200">
        
        {/* SIDEBAR DESKTOP */}
        <aside className={`hidden md:flex bg-slate-900 text-white flex-col justify-between transition-all duration-300 z-30 ${
          menuAberto ? 'w-64' : 'w-20'
        } shrink-0 min-h-screen sticky top-0`}>
          
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <EmblemaInfport tamanho="md" comBrilho />
                {menuAberto && (
                  <div>
                    <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                      {customVisual.nomeAplicacao || 'PorttoHub'} <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
                    </h1>
                    <p className="text-xs text-slate-400 truncate max-w-[150px]">
                      {operadorContextoGlobal.condominio_nome}
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setMenuAberto(!menuAberto)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {eAcessoMultiCondominio && !eSindico && menuAberto && (
              <div className="p-3 bg-slate-800/80 mx-3 mt-3 rounded-xl border border-slate-700/60 space-y-1">
                <label className="block text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Condomínio Ativo
                </label>
                <select
                  value={condominioAtivoId}
                  onChange={(e) => trocarCondominioGlobal(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-600 focus:outline-none"
                >
                  <option value="">🏢 Todos (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
              {!eSindico && (
                <button
                  onClick={() => mudarModulo('dashboard')}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                    moduloAtual === 'dashboard'
                      ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500 shadow-2xs font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 shrink-0" />
                    {menuAberto && <span>Painel Principal</span>}
                  </div>
                </button>
              )}

              {modulosDisponiveis.filter(m => m.flag).map((item) => {
                const IconeComponente = item.icone;
                const ativo = moduloAtual === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => mudarModulo(item.id)}
                    className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all duration-150 cursor-pointer ${
                      ativo
                        ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500 shadow-2xs font-bold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconeComponente className="w-4 h-4 shrink-0" />
                      {menuAberto && <span>{item.titulo}</span>}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-1">
            {menuAberto && (
              <div
                onClick={() => setModalMeuPerfilAberto(true)}
                className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-85 transition group"
                title="Meu Perfil & Alterar Senha"
              >
                {operador.foto_url ? (
                  <img 
                    src={operador.foto_url} 
                    alt={operador.nome} 
                    loading="lazy"
                    decoding="async"
                    className="w-8 h-8 rounded-full object-cover border-2 border-emerald-400 shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                    {operador.nome?.charAt(0)}
                  </div>
                )}
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1">
                    {operador.nome}
                    <KeyRound className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">
                    {eAdmin ? 'DEV ADMIN' : (eSindico ? '🛡️ SÍNDICO (CONSULTA)' : `NÍVEL ${operador.nivel_acesso ?? 3}`)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setModalMeuPerfilAberto(true)}
                className="text-slate-400 hover:text-emerald-400 hover:bg-slate-800 p-2 rounded-xl transition font-bold text-xs cursor-pointer"
                title="Meu Perfil & Senha"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-xl transition font-bold text-xs cursor-pointer"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* DRAWER MOBILE MODERNO E FLUIDO */}
        {drawerMobileAberto && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-start md:hidden animate-in fade-in duration-200">
            <div className="w-[85%] max-w-xs bg-slate-900 h-full flex flex-col justify-between p-4 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200 overflow-y-auto">
              <div className="space-y-3">
                {/* Cabeçalho do Drawer */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <EmblemaInfport tamanho="sm" comBrilho />
                    <div>
                      <span className="font-black text-white text-sm tracking-tight block">
                        {customVisual.nomeAplicacao || 'PorttoHub'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold block">
                        v{VERSAO_BUILD_ATUAL} • PWA Offline
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDrawerMobileAberto(false)} 
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    aria-label="Fechar Menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Seletor de Condomínio Ativo para Administrador */}
                {eAcessoMultiCondominio && !eSindico && (
                  <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Condomínio Ativo
                    </label>
                    <select
                      value={condominioAtivoId}
                      onChange={(e) => trocarCondominioGlobal(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs font-bold p-2 rounded-lg border border-slate-600 focus:outline-none"
                    >
                      <option value="">🏢 Todos (Visão Global)</option>
                      {listaCondominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lista Categorizada de Módulos */}
                <div className="py-1 space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                  {!eSindico && (
                    <button
                      onClick={() => {
                        mudarModulo('dashboard');
                        setDrawerMobileAberto(false);
                      }}
                      className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                        moduloAtual === 'dashboard'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Home className="w-4 h-4 text-emerald-400" />
                      <span>Painel Geral</span>
                    </button>
                  )}

                  {modulosDisponiveis.filter(m => m.flag).map((item) => {
                    const Icone = item.icone;
                    const ativo = moduloAtual === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          mudarModulo(item.id);
                          setDrawerMobileAberto(false);
                        }}
                        className={`w-full p-2.5 rounded-xl font-bold text-xs flex items-center gap-3 transition cursor-pointer ${
                          ativo
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icone className={`w-4 h-4 ${ativo ? 'text-white' : 'text-emerald-400'}`} />
                        <span>{item.titulo}</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setModalLeitorNfcGlobal(true);
                      setDrawerMobileAberto(false);
                    }}
                    className="w-full p-2.5 rounded-xl font-bold text-xs flex items-center gap-3 text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/20 transition mt-2 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Leitor NFC / Tags</span>
                  </button>
                </div>
              </div>

              {/* Rodapé do Drawer com Ações e Sair */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Sincronizado
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalMeuPerfilAberto(true);
                      setDrawerMobileAberto(false);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Meu Perfil</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="py-2 px-3.5 rounded-xl bg-red-600/90 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Sair do Sistema"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {!eSindico && (
            <AlertaRondaGlobal 
              onNavegarRondas={() => mudarModulo('rondas')} 
              onNavegarModulo={(mod) => mudarModulo(mod)}
              usuarioLogado={operadorContextoGlobal} 
              condominioId={condominioAtivoId || operador?.condominio_id}
              moduloRondaHabilitado={Boolean(featureFlags.mod07_gestao_ronda)}
            />
          )}

          {/* CONTROLE CONDICIONAL DE CABEÇALHO SUPERIOR */}
          {moduloAtual === 'dashboard' ? (
            /* CABEÇALHO DO PAINEL PRINCIPAL: Emblema e texto PorttoHub ficam APENAS aqui */
            <HeaderBarPrincipal
              condominioId={condominioAtivoId || operador?.condominio_id || ''}
              condominioNome={operadorContextoGlobal?.condominio_nome}
              operador={operadorContextoGlobal}
              eAdmin={eAdmin}
              eSindico={eSindico}
              onAbrirDrawerMobile={() => setDrawerMobileAberto(true)}
              onAbrirNotificacoes={() => setModalLembretesAberto(true)}
              onAbrirDoctor={() => setModalSupabaseDoctorAberto(true)}
              onAbrirMeuPerfil={() => setModalMeuPerfilAberto(true)}
              onAbrirVersaoInfo={() => setModalVersaoInfoAberto(true)}
              onLogout={handleLogout}
              onNavegarModulo={(mod) => mudarModulo(mod)}
            />
          ) : (
            /* CABEÇALHO DENTRO DOS MENUS E FUNÇÕES: Botão Voltar + Nome do Menu/Função + Acessibilidade & Sistema */
            <BarraTopoMenus
              moduloId={moduloAtual}
              tituloModulo={
                modulosDisponiveis.find(m => m.id === moduloAtual)?.titulo || 
                (moduloAtual === 'painel_sindico' ? 'Portal Síndico' : (moduloAtual === 'guia_operacional' ? 'Manual & Guia' : 'Menu Operacional'))
              }
              iconeModulo={
                modulosDisponiveis.find(m => m.id === moduloAtual)?.icone || 
                (moduloAtual === 'painel_sindico' ? ShieldCheck : Grid)
              }
              onVoltar={voltarModulo}
              condominioNome={operadorContextoGlobal?.condominio_nome}
              condominioId={condominioAtivoId || operador?.condominio_id || ''}
              operador={operadorContextoGlobal}
              eAdmin={eAdmin}
              eSindico={eSindico}
              onAbrirDoctor={() => setModalSupabaseDoctorAberto(true)}
              onAbrirNotificacoes={() => setModalLembretesAberto(true)}
              onAbrirMeuPerfil={() => setModalMeuPerfilAberto(true)}
              onAbrirVersaoInfo={() => setModalVersaoInfoAberto(true)}
              onAbrirDrawerMobile={() => setDrawerMobileAberto(true)}
              onLogout={handleLogout}
              onNavegarModulo={(mod) => mudarModulo(mod)}
            />
          )}

          <main className="flex-1 p-3.5 sm:p-5 md:p-6 overflow-y-auto text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-950 transition-colors duration-200">
            
            {moduloAtual === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-4">

                {/* Grid dos Módulos Operacionais Otimizado e Profissional */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1 gap-2 pt-1 pb-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-5 bg-emerald-500 rounded-full shrink-0" />
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-white tracking-tight truncate">
                          {operadorContextoGlobal.condominio_nome || 'Painel Operacional'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 hidden sm:inline-block" />
                        <span>Operador:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">
                          {operador.nome || operador.login}
                        </span>
                        <span className="hidden sm:inline text-slate-400">•</span>
                        <span className="hidden sm:inline text-[11px] font-mono bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          {operador.turno_padrao || operador.turno || 'Plantão Ativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {modulosDisponiveis.filter(m => m.flag).map((item) => {
                      const Icone = item.icone;
                      return (
                        <button
                          key={item.id}
                          onClick={() => mudarModulo(item.id)}
                          className="bg-white dark:bg-slate-900/95 hover:bg-slate-50 dark:hover:bg-slate-800/90 active:scale-95 p-2 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 shadow-xs hover:shadow-md flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 group cursor-pointer relative overflow-hidden min-h-[96px] sm:min-h-[108px]"
                        >
                          <div className={`p-2 sm:p-2.5 rounded-xl border ${item.cor} group-hover:scale-110 transition-transform duration-200 shadow-2xs flex items-center justify-center`}>
                            <Icone className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                          </div>
                          <div className="w-full flex items-center justify-center px-0.5">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-center leading-tight line-clamp-2">
                              {item.titulo}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {(eSindico || moduloAtual === 'painel_sindico') ? (
              <PainelSindico
                usuarioLogado={operadorContextoGlobal}
                condominioAtivo={objCondominioSelecionado || condominio || { id: condominioAtivoId, nome: 'Condomínio Ativo' }}
                listaCondominios={listaCondominios}
                abaInicial={moduloAtual === 'painel_sindico' || moduloAtual === 'dashboard' ? 'resumo' : moduloAtual}
              />
            ) : (
              <>
                {moduloAtual === 'encomendas' && featureFlags.mod02_gestao_encomendas && (
                  <Encomendas usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'custodia' && featureFlags.mod03_custodia_itens && (
                  <Custodia usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'materiais' && featureFlags.mod04_materiais_posto && (
                  <Materiais usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'chaves' && featureFlags.mod05_quadro_chaves && (
                  <Chaves usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'manutencao' && featureFlags.mod06_gestao_manutencao && (
                  <Manutencao usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'rondas' && featureFlags.mod07_gestao_ronda && (
                  <Rondas usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'ocorrencias' && featureFlags.mod08_livro_ocorrencias && (
                  <Ocorrencias usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'passagem' && featureFlags.mod09_passagem_posto && (
                  <PassagemPosto 
                    usuarioLogado={operadorContextoGlobal} 
                    onTrocarOperador={handleTrocarOperador} 
                    featureFlags={featureFlags} 
                    condominioConfig={condominio} 
                    onNavegar={(mod, params) => {
                      if (params?.aba) {
                        sessionStorage.setItem('bancada_aba_ativa', params.aba);
                      }
                      setModuloAtual(mod);
                    }}
                  />
                )}
                {moduloAtual === 'prestadores' && featureFlags.mod10_prestadores_servico && (
                  <PrestadoresObras usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'bancada' && featureFlags.mod11_bancada_conferencia && (
                  <Bancada 
                    usuarioLogado={operadorContextoGlobal} 
                    onNavegar={(mod, params) => {
                      if (params?.abrirTrocaTurno) {
                        sessionStorage.setItem('abrir_modal_troca_turno', 'true');
                      }
                      setModuloAtual(mod);
                    }}
                  />
                )}
                {moduloAtual === 'cadastros' && podeAcessarCadastros && Boolean(featureFlags.mod01_cadastros_base ?? true) && (
                  <Cadastros 
                    usuarioLogado={operadorContextoGlobal} 
                    condominioAtivoProp={condominioAtivoId}
                    onTrocarCondominioGlobal={trocarCondominioGlobal}
                  />
                )}
                {moduloAtual === 'historico_absoluto' && Boolean(featureFlags.mod12_historico_absoluto ?? true) && (
                  <HistoricoAbsoluto 
                    operadorLogado={operadorContextoGlobal} 
                    condominioAtivo={objCondominioSelecionado || condominio || { id: condominioAtivoId, nome: 'Condomínio Ativo' }} 
                    listaCondominios={listaCondominios} 
                  />
                )}
                {moduloAtual === 'configuracoes' && podeAcessarConfiguracoes && (
                  <Configuracoes 
                    usuarioLogado={operadorContextoGlobal} 
                    onConfigSalva={() => carregarFeatureFlags(operadorContextoGlobal.condominio_id)} 
                  />
                )}
                {moduloAtual === 'guia_operacional' && Boolean(featureFlags.mod_guia_operacional ?? true) && (
                  <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-500" />
                          <span>{customVisual.rotulosModulos['guia_operacional'] || 'Manual Oficial & Guia Operacional'}</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Apresentação detalhada de rotinas, normas operacionais e instruções da guarita
                        </p>
                      </div>
                      <button
                        onClick={() => mudarModulo('dashboard')}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                      >
                        ← Voltar ao Início
                      </button>
                    </div>
                    <TutorialOperacionalPorttoHub
                      onNavegarModulo={mudarModulo}
                      modulosDisponiveisIds={modulosDisponiveis.filter(m => m.flag).map(m => m.id)}
                      nomeCondominio={operadorContextoGlobal?.condominio_nome || 'Condomínio'}
                      eAdmin={eAdmin}
                    />
                  </div>
                )}
                {moduloAtual === 'reservas' && Boolean(featureFlags.mod15_reserva_areas ?? true) && (
                  <ReservaAreas usuarioLogado={operadorContextoGlobal} />
                )}
                {moduloAtual === 'controle_acesso' && Boolean(featureFlags.mod16_controle_acesso ?? true) && (
                  <ControleAcesso usuarioLogado={operadorContextoGlobal} />
                )}
              </>
            )}
          </main>

        </div>

        {/* BARRA INFERIOR MOBILE ERGONÔMICA & FLUIDA */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 text-slate-400 flex justify-around items-center h-16 z-40 px-1.5 shadow-2xl pb-[env(safe-area-inset-bottom)]">
          {eSindico ? (
            <>
              <button
                type="button"
                onClick={() => mudarModulo('painel_sindico')}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold text-emerald-400 cursor-pointer active:scale-95 transition"
              >
                <div className="p-1 rounded-xl bg-emerald-500/10 mb-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Portal Síndico</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer active:scale-95 transition"
              >
                <div className="p-1 rounded-xl bg-rose-500/10 mb-0.5">
                  <LogOut className="w-4 h-4 text-rose-400" />
                </div>
                <span>Sair</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => mudarModulo('dashboard')}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition cursor-pointer active:scale-95 ${
                  moduloAtual === 'dashboard'
                    ? 'text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`p-1 rounded-xl transition ${moduloAtual === 'dashboard' ? 'bg-emerald-500/15' : ''}`}>
                  <Home className={`w-4 h-4 ${moduloAtual === 'dashboard' ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
                </div>
                <span className="truncate max-w-[60px]">Início</span>
              </button>

              {modulosDisponiveis.some(m => m.id === 'encomendas' && m.flag) && (
                <button
                  type="button"
                  onClick={() => mudarModulo('encomendas')}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition cursor-pointer active:scale-95 ${
                    moduloAtual === 'encomendas'
                      ? 'text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1 rounded-xl transition ${moduloAtual === 'encomendas' ? 'bg-emerald-500/15' : ''}`}>
                    <Package className={`w-4 h-4 ${moduloAtual === 'encomendas' ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
                  </div>
                  <span className="truncate max-w-[65px]">Encomendas</span>
                </button>
              )}

              {modulosDisponiveis.some(m => m.id === 'ocorrencias' && m.flag) && (
                <button
                  type="button"
                  onClick={() => mudarModulo('ocorrencias')}
                  className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition cursor-pointer active:scale-95 ${
                    moduloAtual === 'ocorrencias'
                      ? 'text-emerald-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-1 rounded-xl transition ${moduloAtual === 'ocorrencias' ? 'bg-emerald-500/15' : ''}`}>
                    <BookOpen className={`w-4 h-4 ${moduloAtual === 'ocorrencias' ? 'text-emerald-400 stroke-[2.5]' : ''}`} />
                  </div>
                  <span className="truncate max-w-[65px]">Ocorrências</span>
                </button>
              )}

              {/* BOTÃO ACESSIBILIDADE NA BARRA DE MENU (NO LUGAR DE PASSAGEM DE POSTO) */}
              <ControleFonteAcessibilidade variante="barra_menu" />

              <button
                type="button"
                onClick={() => setDrawerMobileAberto(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition cursor-pointer active:scale-95"
              >
                <div className="p-1 rounded-xl hover:bg-slate-800 transition">
                  <Grid className="w-4 h-4" />
                </div>
                <span className="truncate max-w-[60px]">Menu</span>
              </button>
            </>
          )}
        </nav>

        {/* Indicador de Status Offline e Conexão na Portaria */}
        <IndicadorConectividade />
        <OfflineIndicator />

        {/* Modal Global do Leitor de Tags & Cartões NFC */}
        {modalLeitorNfcGlobal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <LeitorNFC
                titulo="Leitor de Tags & Cartões NFC"
                subtitulo="Aproxime qualquer tag física, cartão ou chaveiro da portaria"
                onTagLida={(tagLida, dadosExtras) => {
                  console.log('[App] Tag NFC lida:', tagLida, dadosExtras);
                }}
                onFechar={() => setModalLeitorNfcGlobal(false)}
              />
            </div>
          </div>
        )}

        {/* Modal de Gerenciamento e Customização de Módulos por Condomínio */}
        <ModalGerenciadorModulosCondominio
          aberto={modalGerenciadorModulosAberto}
          onFechar={() => setModalGerenciadorModulosAberto(false)}
          listaCondominios={listaCondominios}
          condominioAtivoId={condominioAtivoId || operador?.condominio_id || ""}
          onSalvoComSucesso={(condoId, novasFlags) => {
            const condoAtual = (eAdmin || eAcessoMultiCondominio) ? (condominioAtivoId || operador?.condominio_id) : operador?.condominio_id;
            if (!condoId || !condoAtual || condoId === condoAtual || condoAtual === 'todos' || condoAtual === 'global') {
              setFeatureFlags(prev => ({ ...prev, ...novasFlags }));
            }
          }}
        />

        {/* Modal de Meu Perfil & Troca de Senha */}
        {modalMeuPerfilAberto && (
          <ModalMeuPerfil
            isOpen={modalMeuPerfilAberto}
            onClose={() => setModalMeuPerfilAberto(false)}
            operador={operadorContextoGlobal}
            condominio={condominio}
            onOperadorAtualizado={(opAtualizado) => {
              setOperador(opAtualizado);
            }}
          />
        )}

        {/* Modal Global do Supabase Doctor */}
        <SupabaseDoctorModal
          isOpen={modalSupabaseDoctorAberto}
          onClose={() => setModalSupabaseDoctorAberto(false)}
          onAbrirMigrador={() => {
            setModalSupabaseDoctorAberto(false);
            mudarModulo('configuracoes');
          }}
        />

        {/* Modal Global de Lembretes & Mensagens da Portaria (Portaria ⇄ Moradores) */}
        <ModalLembretesPortaria
          aberto={modalLembretesAberto}
          onFechar={() => setModalLembretesAberto(false)}
          condominioId={condominioAtivoId || operador?.condominio_id || ''}
          condominioNome={operadorContextoGlobal?.condominio_nome}
          operadorAtual={{
            id: operador?.id,
            nome: operador?.nome,
            login: operador?.login,
            perfil: operador?.perfil,
            nivel: operador?.nivel,
            nivel_acesso: operador?.nivel_acesso,
            nivel_acesso_custom_id: (operador as any)?.nivel_acesso_custom_id,
            eSuperAdminGlobal: eAdmin
          }}
        />

        {/* Modal de Versao e Repositorio GitHub que fica na tela */}
        <ModalInfoVersaoRepositorio 
          aberto={modalVersaoInfoAberto} 
          onFechar={() => setModalVersaoInfoAberto(false)} 
        />

        {/* Notificação Flutuante de Nova Versão PWA */}
        <AlertaNovaVersaoPWA />

      </div>
    );
  }

  if (restaurandoSessao) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 mb-3 animate-pulse flex items-center justify-center">
          <EmblemaInfport tamanho="xl" comBrilho />
        </div>
        <h1 className="text-lg font-bold tracking-tight">INFPORT 1.0</h1>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Restaurando sessão segura...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 antialiased relative transition-colors duration-200">
      {/* Barra Superior com Marca, Versão, Fonte, Tema, Atualizações e Botão Banco OCI */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <div className="hidden sm:flex flex-col text-right leading-none">
          <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100">
            {NOME_APLICACAO}
          </span>
          <button 
            type="button"
            onClick={() => setModalVersaoInfoAberto(true)}
            className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-emerald-500 font-mono font-bold mt-0.5 cursor-pointer text-right underline underline-offset-2"
            title="Clique para ver os detalhes da versão e repositório GitHub"
          >
            VERSÃO {VERSAO_BUILD_ATUAL}
          </button>
        </div>
        <ControleFonteAcessibilidade />
        <BotaoAtualizarApp />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-slate-950/80 w-full max-w-md p-6 sm:p-8 my-auto border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <EmblemaInfport tamanho="xl" comBrilho />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{NOME_APLICACAO}</h1>
          <button 
            type="button"
            onClick={() => setModalVersaoInfoAberto(true)}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 mt-1 uppercase tracking-wider cursor-pointer underline underline-offset-2 inline-block mx-auto"
            title="Clique para ver os detalhes da versão e repositório GitHub"
          >
            VERSÃO {VERSAO_BUILD_ATUAL}
          </button>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Sistema Integrado de Portaria & Segurança Patrimonial
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-sm mb-4 border border-red-200 dark:border-red-900/50 break-words font-semibold">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5 z-10" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário de acesso"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base font-semibold shadow-inner transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5 z-10" />
              <input
                type={mostrarSenhaLogin ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-base font-semibold shadow-inner transition-colors"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                title={mostrarSenhaLogin ? "Ocultar senha" : "Ver senha"}
              >
                {mostrarSenhaLogin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold select-none group">
              <input
                type="checkbox"
                checked={lembrarAcesso}
                onChange={(e) => setLembrarAcesso(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 transition cursor-pointer"
              />
              <span className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Manter conectado neste dispositivo
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:active:bg-emerald-600 text-white dark:text-slate-950 font-black py-3.5 rounded-xl transition duration-150 text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-emerald-900/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>

      {/* Modal do Banco Doctor acessível também na tela de login */}
      <SupabaseDoctorModal
        isOpen={modalSupabaseDoctorAberto}
        onClose={() => setModalSupabaseDoctorAberto(false)}
        abaInicial="condominios"
      />

      <IndicadorConectividade />
      <OfflineIndicator />
      <AlertaNovaVersaoPWA />

      {/* Modal de Versao e Repositorio GitHub acessivel no login */}
      <ModalInfoVersaoRepositorio 
        aberto={modalVersaoInfoAberto} 
        onFechar={() => setModalVersaoInfoAberto(false)} 
      />
    </div>
  );
}
