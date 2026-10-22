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
import AlertaRondaGlobal from './components/AlertaRondaGlobal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import ControleFonteAcessibilidade from './components/ControleFonteAcessibilidade';
import SeletorTema from './components/SeletorTema';
import BotaoAtualizarApp from './components/BotaoAtualizarApp';
import AlertaNovaVersaoPWA from './components/AlertaNovaVersaoPWA';
import IndicadorConectividade from './components/IndicadorConectividade';
import EmblemaInfport from './components/EmblemaInfport';
import LeitorNFC from './components/LeitorNFC';
import ModalMeuPerfil from './components/ModalMeuPerfil';
import SupabaseDoctorModal from './components/SupabaseDoctorModal';
import BotaoNotificacoesLembretes from './components/BotaoNotificacoesLembretes';
import AlertaNoCondominioTopo from './components/AlertaNoCondominioTopo';
import ModalLembretesPortaria from './components/ModalLembretesPortaria';
import { checarEDispararAlarmeTrocaPlantao } from './services/lembretesService';
import { salvarCacheLocal, obterCacheLocal } from './services/offlineStorageService';
import { atualizarCacheAutonomia3Horas } from './services/offlineSyncEngine';
import { registrarAtividade } from './services/auditoriaService';
import { carregarNiveisAcesso, verificarPermissao } from './services/permissoesService';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  LogOut, 
  Database, 
  Package, 
  Shield, 
  Radio, 
  Key, 
  Wrench, 
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
  Sparkles,
  HardHat,
  PackageCheck,
  ClipboardList,
  KeyRound,
  Eye,
  EyeOff,
  History,
  UserCheck,
  Layers
} from 'lucide-react';

const CHAVE_SESSAO = 'infport_sessao_ativa_v1';

export default function App() {
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
    mod_portal_sindico: true
  });

  const [moduloAtual, setModuloAtual] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const [versaoPermissoes, setVersaoPermissoes] = useState(0);

  useEffect(() => {
    const handleAtualizacao = () => setVersaoPermissoes(v => v + 1);
    window.addEventListener('niveis_acesso_atualizados', handleAtualizacao);
    return () => window.removeEventListener('niveis_acesso_atualizados', handleAtualizacao);
  }, []);

  const eSuperAdminGlobal = (operador?.login === 'admin' || operador?.perfil === 'admin_geral' || (Number(operador?.nivel_acesso) === 0 && (!operador?.condominio_id || operador?.condominio_id === 'global')));
  const eAdmin = eSuperAdminGlobal || operador?.perfil === 'admin' || operador?.nivel_acesso === 0;
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
            const { data: opData } = await supabase
              .from('operadores')
              .select('*')
              .eq('id', sessao.operadorId)
              .eq('ativo', true)
              .maybeSingle();

            if (opData && montado) {
              setOperador(opData);
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

  useEffect(() => {
    if (!operador) return;

    window.history.replaceState({ modulo: moduloAtual }, '');

    const handlePopState = () => {
      if (moduloAtual !== 'dashboard') {
        setModuloAtual('dashboard');
        window.history.pushState({ modulo: 'dashboard' }, '');
      } else {
        window.history.pushState({ modulo: 'dashboard' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [operador, moduloAtual]);

  const mudarModulo = (novoModulo: string) => {
    let modDestino = novoModulo;
    if (eSindico) {
      if (modDestino === 'cadastros' || modDestino === 'configuracoes') {
        modDestino = 'painel_sindico';
      }
    }
    setModuloAtual(modDestino);
    setDrawerMobileAberto(false);
    window.history.pushState({ modulo: modDestino }, '');
  };

  useEffect(() => {
    if (operador) {
      carregarCondominiosHeader();
    }
  }, [operador]);

  useEffect(() => {
    if (operador) {
      const idCondTarget = eAdmin ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id;
      if (idCondTarget) {
        carregarFeatureFlags(idCondTarget);
      } else {
        resetarFeatureFlagsPadrao();
      }
    }
  }, [operador, condominioAtivoId]);

  // Listener para atualização em tempo real quando as flags forem salvas em Configurações
  useEffect(() => {
    const handleAtualizacaoModulos = (e: any) => {
      if (e.detail) {
        const idAlvo = e.detail.condominio_id;
        const condoAtual = eAdmin ? (condominioAtivoId || operador?.condominio_id) : operador?.condominio_id;
        if (!idAlvo || idAlvo === condoAtual) {
          const novas = e.detail.flags || e.detail;
          setFeatureFlags(prev => ({
            ...prev,
            ...novas
          }));
        }
      }
    };

    window.addEventListener('modulos_atualizados', handleAtualizacaoModulos);
    return () => {
      window.removeEventListener('modulos_atualizados', handleAtualizacaoModulos);
    };
  }, [operador?.condominio_id, condominioAtivoId, eAdmin]);

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

  const carregarCondominiosHeader = async () => {
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      const condos = data || [];
      setListaCondominios(condos);
      salvarCacheLocal('condominios', condos, 'global');

      // Se for admin e o condomínio ativo atual for vazio ou o de homologação, verifica seleção preferencial
      if (eAdmin && condos.length > 0) {
        const savedCondo = localStorage.getItem('infport_condominio_ativo_id');
        if (savedCondo !== null) {
          if (savedCondo && condos.some(c => c.id === savedCondo)) {
            setCondominioAtivoId(savedCondo);
            const cObj = condos.find(c => c.id === savedCondo);
            if (cObj) setCondominio(cObj);
          }
        } else if (!condominioAtivoId || condominioAtivoId === '00000000-0000-0000-0000-000000000001') {
          // Prefere o primeiro condomínio real (ex: Village Di Padova)
          const condoReal = condos.find(c => c.id !== '00000000-0000-0000-0000-000000000001') || condos[0];
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
      mod_portal_sindico: true
    });
  };

  const carregarFeatureFlags = async (condominioId: string) => {
    if (!condominioId) {
      resetarFeatureFlagsPadrao();
      return;
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
          mod_portal_sindico: resolverFlag('mod_portal_sindico')
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

      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', loginLimpo)
        .eq('senha', senhaLimpa)
        .eq('ativo', true)
        .maybeSingle();

      if (opError) throw opError;
      if (!opData) {
        setErro('Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }

      let condData = null;
      if (opData.condominio_id) {
        const { data: cData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', opData.condominio_id)
          .maybeSingle();
        condData = cData;
      }

      setOperador(opData);
      setCondominio(condData || { nome: 'Administração Geral Dev' });
      setCondominioAtivoId(opData.condominio_id || '');
      carregarNiveisAcesso(opData.condominio_id);

      if (lembrarAcesso) {
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
          operadorId: opData.id,
          login: opData.login,
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

    // 2. EFETIVA O LOGIN NO DISPOSITIVO (PERSISTÊNCIA NO LOCALSTORAGE)
    // Garante que recarregamentos de página, abas em segundo plano e WhatsApp não desfaçam a troca!
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
      operadorId: novoOperador.id,
      login: novoOperador.login,
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

  const modulosDisponiveis = eSindico ? [
    { id: 'painel_sindico', titulo: 'Portal do Síndico', icone: ShieldCheck, flag: true, cor: 'bg-emerald-950 text-emerald-300 border-emerald-700' }
  ] : [
    ...(eAdmin ? [{ id: 'painel_sindico', titulo: 'Portal Síndico (Visão)', icone: ShieldCheck, flag: Boolean(featureFlags.mod_portal_sindico ?? true), cor: 'bg-emerald-950 text-emerald-300 border-emerald-700' }] : []),
    { id: 'encomendas', titulo: 'Encomendas', icone: Package, flag: Boolean(featureFlags.mod02_gestao_encomendas && verificarPermissao(operadorContextoGlobal, 'encomendas', 'visualizar')), cor: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'custodia', titulo: 'Custódia Itens', icone: PackageCheck, flag: Boolean(featureFlags.mod03_custodia_itens && verificarPermissao(operadorContextoGlobal, 'custodia', 'visualizar')), cor: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'prestadores', titulo: 'Autorizados', icone: UserCheck, flag: Boolean(featureFlags.mod10_prestadores_servico && (verificarPermissao(operadorContextoGlobal, 'autorizados', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'prestadores', 'visualizar'))), cor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'materiais', titulo: 'Materiais Posto', icone: ClipboardList, flag: Boolean(featureFlags.mod04_materiais_posto && verificarPermissao(operadorContextoGlobal, 'materiais', 'visualizar')), cor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'chaves', titulo: 'Quadro Chaves', icone: Key, flag: Boolean(featureFlags.mod05_quadro_chaves && verificarPermissao(operadorContextoGlobal, 'chaves', 'visualizar')), cor: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { id: 'manutencao', titulo: 'Manutenção OS', icone: Wrench, flag: Boolean(featureFlags.mod06_gestao_manutencao && verificarPermissao(operadorContextoGlobal, 'manutencao', 'visualizar')), cor: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: 'rondas', titulo: 'Rondas QR', icone: QrCode, flag: Boolean(featureFlags.mod07_gestao_ronda && verificarPermissao(operadorContextoGlobal, 'rondas', 'visualizar')), cor: 'bg-slate-100 text-slate-800 border-slate-300' },
    { id: 'ocorrencias', titulo: 'Ocorrências', icone: BookOpen, flag: Boolean(featureFlags.mod08_livro_ocorrencias && verificarPermissao(operadorContextoGlobal, 'ocorrencias', 'visualizar')), cor: 'bg-rose-50 text-rose-600 border-rose-200' },
    { id: 'passagem', titulo: 'Passagem Posto', icone: Repeat, flag: Boolean(featureFlags.mod09_passagem_posto && (verificarPermissao(operadorContextoGlobal, 'passagem_posto', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'passagem', 'visualizar'))), cor: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { id: 'bancada', titulo: 'Bancada (Balcão)', icone: Layers, flag: Boolean(featureFlags.mod11_bancada_conferencia && (verificarPermissao(operadorContextoGlobal, 'bancada', 'visualizar') || verificarPermissao(operadorContextoGlobal, 'encomendas', 'visualizar'))), cor: 'bg-amber-50 text-amber-800 border-amber-200' },
    ...(podeAcessarCadastros ? [{ id: 'cadastros', titulo: 'Cadastros Base', icone: Database, flag: Boolean(featureFlags.mod01_cadastros_base ?? true), cor: 'bg-slate-100 text-slate-700 border-slate-300' }] : []),
    ...(verificarPermissao(operadorContextoGlobal, 'historico_absoluto', 'visualizar') ? [{ id: 'historico_absoluto', titulo: 'Histórico Absoluto', icone: History, flag: Boolean(featureFlags.mod12_historico_absoluto ?? true), cor: 'bg-indigo-50 text-indigo-700 border-indigo-200' }] : []),
  ];

  // Se o módulo ativo no momento for desativado nas flags ou bloqueado pelo perfil, redireciona para o dashboard
  useEffect(() => {
    if (moduloAtual !== 'dashboard' && moduloAtual !== 'painel_sindico') {
      const modAtivo = modulosDisponiveis.find(m => m.id === moduloAtual);
      if (!modAtivo || !modAtivo.flag) {
        setModuloAtual('dashboard');
      }
    }
  }, [featureFlags, moduloAtual, versaoPermissoes, operador]);

  if (podeAcessarConfiguracoes) {
    modulosDisponiveis.push({ id: 'configuracoes', titulo: 'Configurações', icone: Settings, flag: true, cor: 'bg-slate-800 text-white border-slate-900' });
  }

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans pb-16 md:pb-0 text-slate-900 antialiased">
        
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
                      INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
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

            {eSuperAdminGlobal && !eSindico && menuAberto && (
              <div className="p-3 bg-slate-800/80 mx-3 mt-3 rounded-xl border border-slate-700/60 space-y-1">
                <label className="block text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Condomínio Ativo
                </label>
                <select
                  value={condominioAtivoId}
                  onChange={(e) => {
                    const novoId = e.target.value;
                    setCondominioAtivoId(novoId);
                    const cObj = listaCondominios.find(c => c.id === novoId);
                    if (cObj) setCondominio(cObj);
                  }}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-600 focus:outline-none"
                >
                  <option value="">🏢 Todos (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-250px)]">
              {!eSindico && (
                <button
                  onClick={() => mudarModulo('dashboard')}
                  className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                    moduloAtual === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 shrink-0" />
                    {menuAberto && <span>Painel Principal</span>}
                  </div>
                </button>
              )}

              {modulosDisponiveis.filter(m => m.flag).map((item) => {
                const IconeComponente = item.icone;
                return (
                  <button
                    key={item.id}
                    onClick={() => mudarModulo(item.id)}
                    className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                      moduloAtual === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconeComponente className="w-5 h-5 shrink-0" />
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

        {/* DRAWER MOBILE */}
        {drawerMobileAberto && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-end md:hidden">
            <div className="w-4/5 max-w-xs bg-slate-900 h-full flex flex-col justify-between p-4 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <EmblemaInfport tamanho="sm" />
                    <span className="font-bold text-white text-sm sm:text-base">Menu INFPORT</span>
                  </div>
                  <button onClick={() => setDrawerMobileAberto(false)} className="text-slate-400 p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {eSuperAdminGlobal && !eSindico && (
                  <div className="my-3 p-2.5 bg-slate-800 rounded-xl space-y-1">
                    <label className="text-xs font-bold text-emerald-400 uppercase">Condomínio Ativo</label>
                    <select
                      value={condominioAtivoId}
                      onChange={(e) => {
                        const novoId = e.target.value;
                        setCondominioAtivoId(novoId);
                        localStorage.setItem('infport_condominio_ativo_id', novoId);
                        const cObj = listaCondominios.find(c => c.id === novoId);
                        if (cObj) setCondominio(cObj);
                      }}
                      className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700"
                    >
                      <option value="">🏢 Todos os Condomínios (Visão Global)</option>
                      {listaCondominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="py-3 space-y-1 overflow-y-auto max-h-[55vh]">
                  {!eSindico && (
                    <button
                      onClick={() => mudarModulo('dashboard')}
                      className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 ${
                        moduloAtual === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Home className="w-5 h-5" /> Painel Geral
                    </button>
                  )}

                  {modulosDisponiveis.filter(m => m.flag).map((item) => {
                    const Icone = item.icone;
                    return (
                      <button
                        key={item.id}
                        onClick={() => mudarModulo(item.id)}
                        className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 ${
                          moduloAtual === item.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icone className="w-5 h-5" /> {item.titulo}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setModalLeitorNfcGlobal(true);
                      setDrawerMobileAberto(false);
                    }}
                    className="w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/20 transition mt-2 cursor-pointer"
                  >
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span>Leitor NFC / Tags</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div 
                  onClick={() => {
                    setModalMeuPerfilAberto(true);
                    setDrawerMobileAberto(false);
                  }}
                  className="flex items-center gap-2.5 truncate cursor-pointer hover:opacity-85 transition"
                >
                  {operador.foto_url ? (
                    <img 
                      src={operador.foto_url} 
                      alt={operador.nome} 
                      loading="lazy"
                      decoding="async"
                      className="w-9 h-9 rounded-full object-cover border-2 border-emerald-400 shrink-0" 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      {operador.nome?.charAt(0)}
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{operador.nome}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{operadorContextoGlobal.condominio_nome}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                  title="Sair do Sistema"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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

          {/* CABEÇALHO GLOBAL (MOBILE E DESKTOP COM NOTIFICAÇÕES NO TOPO DIREITO) */}
          <header className="bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md border-b border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden flex-1 mr-2">
              <div className="shrink-0 flex items-center">
                <EmblemaInfport tamanho="sm" comBrilho />
              </div>
              <div className="min-w-0 flex-1">
                {eSuperAdminGlobal && !eSindico ? (
                  <select
                    value={condominioAtivoId}
                    onChange={(e) => {
                      const novoId = e.target.value;
                      setCondominioAtivoId(novoId);
                      localStorage.setItem('infport_condominio_ativo_id', novoId);
                      const cObj = listaCondominios.find(c => c.id === novoId);
                      if (cObj) setCondominio(cObj);
                    }}
                    className="bg-slate-800 text-emerald-400 font-extrabold text-[11px] sm:text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none max-w-full truncate"
                  >
                    <option value="">🏢 Todos (Global)</option>
                    {listaCondominios.map((c) => (
                      <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                    ))}
                  </select>
                ) : (
                  <h1 className="font-extrabold text-xs sm:text-sm text-white truncate leading-tight">
                    {operadorContextoGlobal.condominio_nome || 'Condomínio'}
                  </h1>
                )}
                <p className="text-[11px] text-slate-300 font-semibold truncate leading-tight mt-0.5">
                  Operador: <span className="text-white font-bold">{operador.nome || 'Caetano'}</span>
                </p>
              </div>
            </div>

            {/* Ações no Topo Superior Direito: Botão de Notificações/Lembretes e Alerta de Presentes no Condomínio */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Alerta de pessoas presentes no condomínio logo ao lado do botão de lembrete */}
              <AlertaNoCondominioTopo
                condominioId={condominioAtivoId || operador?.condominio_id || ''}
                onNavegar={() => mudarModulo('prestadores')}
              />

              {/* Ícone de Notificações (Sino/Mensagens) com Alerta Piscante e Contador em Tempo Real */}
              <BotaoNotificacoesLembretes
                condominioId={condominioAtivoId || operador?.condominio_id || ''}
                onAbrirPainel={() => setModalLembretesAberto(true)}
              />
            </div>
          </header>

          {moduloAtual !== 'dashboard' && !eSindico && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <button 
                onClick={() => mudarModulo('dashboard')}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800 dark:border-slate-700 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                title="Voltar ao Painel Principal"
              >
                <ChevronLeft className="w-4 h-4 text-white shrink-0" />
                <span className="text-white font-bold">Voltar ao Painel</span>
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <ControleFonteAcessibilidade />
                <BotaoAtualizarApp />
                <PWAInstallButton />
              </div>
            </div>
          )}

          <main className="flex-1 p-2.5 sm:p-4 overflow-y-auto text-slate-900 dark:text-slate-100">
            
            {moduloAtual === 'dashboard' && (
              <div className="max-w-4xl mx-auto space-y-3">
                
                {/* Bloco Utilitário: Botão Instalar App, Atualizar e Acessibilidade */}
                <div className="flex items-center justify-end flex-wrap gap-1.5 sm:gap-2 p-1">
                  <SeletorTema />
                  <ControleFonteAcessibilidade />
                  <BotaoAtualizarApp />
                  <PWAInstallButton />
                </div>

                {/* Grid dos Módulos Operacionais Otimizado (Ícones Compactos e Fáceis de Clicar) */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 px-1">
                    Módulos Operacionais
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {modulosDisponiveis.filter(m => m.flag).map((item) => {
                      const Icone = item.icone;
                      return (
                        <button
                          key={item.id}
                          onClick={() => mudarModulo(item.id)}
                          className="bg-white hover:bg-slate-50 active:scale-[0.98] p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group cursor-pointer"
                        >
                          <div className={`p-2 rounded-lg border ${item.cor} group-hover:scale-105 transition duration-150`}>
                            <Icone className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">
                            {item.titulo}
                          </span>
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
                    onNavegar={(mod) => setModuloAtual(mod)}
                  />
                )}
                {moduloAtual === 'cadastros' && podeAcessarCadastros && Boolean(featureFlags.mod01_cadastros_base ?? true) && (
                  <Cadastros usuarioLogado={operadorContextoGlobal} />
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
              </>
            )}
          </main>

        </div>

        {/* BARRA INFERIOR MOBILE COMPACTA & MODERNA */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-300 flex justify-around items-center h-12 z-40 px-1 shadow-xl">
          {eSindico ? (
            <>
              <button
                onClick={() => mudarModulo('painel_sindico')}
                className="flex flex-col items-center justify-center w-full h-full text-[10px] font-bold text-emerald-400 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 mb-0.5" />
                Portal do Síndico
              </button>
              <button
                onClick={handleLogout}
                className="flex flex-col items-center justify-center w-full h-full text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mb-0.5" />
                Sair
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => mudarModulo('dashboard')}
                className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                  moduloAtual === 'dashboard' ? 'text-emerald-400' : 'hover:text-slate-100'
                }`}
              >
                <Home className="w-4 h-4 mb-0.5" />
                Início
              </button>

              {featureFlags.mod02_gestao_encomendas && (
                <button
                  onClick={() => mudarModulo('encomendas')}
                  className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                    moduloAtual === 'encomendas' ? 'text-emerald-400' : 'hover:text-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4 mb-0.5" />
                  Encomendas
                </button>
              )}

              {featureFlags.mod05_quadro_chaves && (
                <button
                  onClick={() => mudarModulo('chaves')}
                  className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                    moduloAtual === 'chaves' ? 'text-emerald-400' : 'hover:text-slate-100'
                  }`}
                >
                  <Key className="w-4 h-4 mb-0.5" />
                  Chaves
                </button>
              )}

              {featureFlags.mod07_gestao_ronda && (
                <button
                  onClick={() => mudarModulo('rondas')}
                  className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                    moduloAtual === 'rondas' ? 'text-emerald-400' : 'hover:text-slate-100'
                  }`}
                >
                  <QrCode className="w-4 h-4 mb-0.5" />
                  Rondas
                </button>
              )}

              <button
                onClick={() => setDrawerMobileAberto(true)}
                className="flex flex-col items-center justify-center w-full h-full text-[10px] font-bold hover:text-slate-100 text-slate-300 transition cursor-pointer"
              >
                <Grid className="w-4 h-4 mb-0.5" />
                Módulos
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-900 antialiased relative">
      {/* Barra Superior de Acessibilidade, Atualização e Instalação na Tela de Login */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <SeletorTema />
        <ControleFonteAcessibilidade />
        <BotaoAtualizarApp />
        <PWAInstallButton />
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 my-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <EmblemaInfport tamanho="xl" comBrilho />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">INFPORT 1.0</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            Sistema Integrado de Portaria & Segurança Patrimonial
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm mb-4 border border-red-200 break-words font-semibold">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1.5">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 z-10" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário (ex: admin)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 z-10" />
              <input
                type={mostrarSenhaLogin ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base font-semibold"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={mostrarSenhaLogin ? "Ocultar senha" : "Ver senha"}
              >
                {mostrarSenhaLogin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-0.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-semibold select-none">
              <input
                type="checkbox"
                checked={lembrarAcesso}
                onChange={(e) => setLembrarAcesso(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Manter conectado neste dispositivo</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition text-sm sm:text-base uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>

      <IndicadorConectividade />
      <OfflineIndicator />
      <AlertaNovaVersaoPWA />
    </div>
  );
}
