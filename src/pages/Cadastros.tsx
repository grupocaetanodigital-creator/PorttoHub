import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { 
  Building2, 
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
  Camera
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
  CondominioConfig 
} from '../services/condominioService';
import GerenciamentoPermissoes from '../components/GerenciamentoPermissoes';
import { 
  carregarNiveisAcesso, 
  obterNiveisLocal, 
  obterNomeNivel, 
  NivelAcessoItem 
} from '../services/permissoesService';
import { salvarCacheLocal, obterCacheLocal } from '../services/offlineStorageService';

interface CadastrosProps {
  usuarioLogado?: any;
}

export default function Cadastros({ usuarioLogado }: CadastrosProps) {
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

  // Diretriz de Segurança RBAC: Apenas Supervisores (Nível 2) e Masters/Admins (Nível 1/0) podem customizar numeração, casas avulsas e alterações estruturais
  const podeCustomizarEstrutura = !eOperador && (eAdmin || eMaster || eSupervisor || nivelNum <= 2);

  const [condominioFiltroAdmin, setCondominioFiltroAdmin] = useState(usuarioLogado?.condominio_id || '');
  const [abaAtiva, setAbaAtiva] = useState<'condominios' | 'operadores' | 'moradores' | 'niveis'>(
    eAdmin ? 'condominios' : 'moradores'
  );

  const [condominios, setCondominios] = useState<any[]>([]);
  const [mapaConfigsCondos, setMapaConfigsCondos] = useState<Record<string, CondominioConfig>>({});
  const [operadores, setOperadores] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Controle do Menu Flutuante / Modal de Cadastro e Edição no Card
  const [modalFlutuanteAberto, setModalFlutuanteAberto] = useState(false);
  const [tipoModalFlutuante, setTipoModalFlutuante] = useState<'condominio' | 'operador' | 'morador'>('morador');
  const [idEdicao, setIdEdicao] = useState<string | null>(null);

  // Filtros de busca individuais
  const [buscaCondominio, setBuscaCondominio] = useState('');
  const [buscaOperador, setBuscaOperador] = useState('');
  const [termoBuscaMorador, setTermoBuscaMorador] = useState('');

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

  // Formulário Operador
  const [nomeOperador, setNomeOperador] = useState('');
  const [loginOperador, setLoginOperador] = useState('');
  const [senhaOperador, setSenhaOperador] = useState('');
  const [fotoOperador, setFotoOperador] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('nivel_3');
  const [condominioIdOperador, setCondominioIdOperador] = useState('');
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

  // Identificação do condomínio ativo em foco com fallback resiliente e sanitização de UUID
  const condoAtivoId = useMemo(() => {
    let raw = (eAdmin 
      ? (condominioFiltroAdmin || (condominios[0]?.id || usuarioLogado?.condominio_id || ''))
      : (usuarioLogado?.condominio_id || (condominios[0]?.id || ''))) || (condominios[0]?.id || '');
    if (raw === 'global' || raw === 'todos') {
      const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
      return primeiroValido || (condominios[0]?.id || '');
    }
    return raw;
  }, [eAdmin, condominioFiltroAdmin, condominios, usuarioLogado?.condominio_id]);

  const configCondoAtivo = mapaConfigsCondos[condoAtivoId] || {
    id: condoAtivoId,
    nome: condominios.find(c => c.id === condoAtivoId)?.nome || 'Condomínio',
    tipo_estrutura: 'casas',
    unidades_por_bloco: 117,
    zeros_esquerda: true
  };
  const eEstruturaCasasAtivo = isEstruturaCasas(configCondoAtivo?.tipo_estrutura);

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

  const limparFormularios = () => {
    const targetCondo = condoAtivoId || (condominios[0]?.id || usuarioLogado?.condominio_id || '');
    setIdEdicao(null);
    setNomeCondominio('');
    setEnderecoCondominio('');
    setTipoEstruturaCondominio('casas');
    setUnidadesPorBlocoCondominio(117);
    setQtdBlocosCondominio(1);
    setNomesBlocosCondominio('');
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

  const fecharModalFlutuante = () => {
    setModalFlutuanteAberto(false);
    limparFormularios();
  };

  const abrirNovoCondominio = () => {
    limparFormularios();
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const abrirNovoOperador = () => {
    limparFormularios();
    let targetCondo = condoAtivoId || (condominios[0]?.id || usuarioLogado?.condominio_id || '');
    if (targetCondo === 'global' || targetCondo === 'todos') {
      targetCondo = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id || '';
    }
    setCondominioIdOperador(targetCondo);
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
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

    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
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

      // Carrega antecipadamente as configurações dos condomínios para que os cards das unidades sempre apareçam
      const configs: Record<string, CondominioConfig> = { ...mapaConfigsCondos };
      for (const c of listaCondos) {
        if (!configs[c.id]) {
          configs[c.id] = await carregarCondominioConfig(c.id);
        }
      }
      if (activeCondoId && !configs[activeCondoId]) {
        configs[activeCondoId] = await carregarCondominioConfig(activeCondoId);
      }
      setMapaConfigsCondos(configs);

      if (abaAtiva === 'condominios' && eAdmin) {
        const { data, error } = await supabase.from('condominios').select('*').order('nome');
        if (!error && data) {
          setCondominios(data);
          listaCondos = data;
          salvarCacheLocal('condominios', data, 'global');
        }
      } else if (abaAtiva === 'operadores' && !eOperador) {
        let query = supabase.from('operadores').select('*').order('nome');
        if (activeCondoId) {
          query = query.eq('condominio_id', activeCondoId);
        }
        const { data, error } = await query;
        if (!error && data) {
          setOperadores(data);
        }
      } else if (abaAtiva === 'moradores') {
        let query = supabase.from('moradores').select('*').order('unidade');
        if (activeCondoId) {
          query = query.eq('condominio_id', activeCondoId);
        }

        const { data, error } = await query;
        if (!error && data) {
          setMoradores(data);
          salvarCacheLocal('moradores', data, activeCondoId || 'global');
        } else {
          const cacheMoradores = obterCacheLocal<any[]>('moradores', activeCondoId || 'global', []);
          if (cacheMoradores && cacheMoradores.length > 0) {
            setMoradores(cacheMoradores);
          }
        }
      } else if (abaAtiva === 'niveis' && !eOperador) {
        let query = supabase.from('operadores').select('*').order('nome');
        if (activeCondoId) {
          query = query.eq('condominio_id', activeCondoId);
        }
        const { data: opsData } = await query;
        if (opsData) setOperadores(opsData);
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

  const getNomeCondominioPorId = (id: string) => {
    const c = condominios.find(item => item.id === id);
    return c ? c.nome : (id ? 'Condomínio Vinculado' : 'Não atribuído');
  };

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
        tipo_estrutura: tipoEstruturaCondominio || 'casas',
        unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
        qtd_blocos: Number(qtdBlocosCondominio) || 1,
        nomes_blocos: nomesBlocosCondominio.trim(),
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

      if (idEdicao) {
        await salvarCondominioConfig(idEdicao, configCondo);
        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio de Casas atualizado! ${unidadesPorBlocoCondominio || 117} cards de casas gerados para moradores.`
            : 'Condomínio e estrutura atualizados com sucesso!' 
        });
      } else {
        let novoCond: any = null;
        let insertErr: any = null;

        const resCompleto = await supabase
          .from('condominios')
          .insert([{ 
            nome: nomeCondominio.trim(), 
            endereco: enderecoCondominio.trim(),
            tipo_estrutura: tipoEstruturaCondominio || 'casas',
            unidades_por_bloco: Number(unidadesPorBlocoCondominio) || 117,
            qtd_blocos: Number(qtdBlocosCondominio) || 1
          }])
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
              endereco: enderecoCondominio.trim() 
            }])
            .select()
            .maybeSingle();
          novoCond = resFallback.data;
          insertErr = resFallback.error;
        }

        if (insertErr) throw insertErr;
        if (novoCond?.id) {
          targetId = novoCond.id;
          configCondo.id = novoCond.id;
          await salvarCondominioConfig(novoCond.id, configCondo);
        }
        setMensagem({ 
          tipo: 'sucesso', 
          texto: isEstruturaCasas(tipoEstruturaCondominio)
            ? `Condomínio cadastrado com sucesso! ${unidadesPorBlocoCondominio || 117} cards de casas gerados para moradores.`
            : 'Condomínio e configurações cadastrados com sucesso!' 
        });
      }

      fecharModalFlutuante();
      await carregarDados();
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const prepararEdicaoCondominio = (c: any) => {
    if (!eAdmin) return;
    setIdEdicao(c.id);
    setNomeCondominio(c.nome);
    setEnderecoCondominio(c.endereco || '');

    const cfg = mapaConfigsCondos[c.id];
    if (cfg) {
      setTipoEstruturaCondominio(cfg.tipo_estrutura || 'casas');
      setUnidadesPorBlocoCondominio(cfg.unidades_por_bloco !== undefined ? Number(cfg.unidades_por_bloco) : 117);
      setQtdBlocosCondominio(cfg.qtd_blocos !== undefined ? Number(cfg.qtd_blocos) : 1);
      setNomesBlocosCondominio(cfg.nomes_blocos || '');
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
      setZerosEsquerdaCondominio(true);
      setEscalaPlantao('06_18');
      setHorarioDiurnoInicio('06:00');
      setHorarioNoturnoInicio('18:00');
      setWhatsappGrupoUrl('');
      setTelefonePortaria('');
      setSindicoNome('');
      setSindicoWhatsapp('');
    }
    setTipoModalFlutuante('condominio');
    setModalFlutuanteAberto(true);
  };

  const salvarOperador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (eOperador) {
      setMensagem({ tipo: 'erro', texto: 'Operadores de portaria não possuem permissão para criar usuários.' });
      return;
    }

    let targetCondominioId = (eAdmin ? (condominioIdOperador || condominioFiltroAdmin || condoAtivoId) : usuarioLogado?.condominio_id) || condoAtivoId || condominios[0]?.id;
    if (targetCondominioId === 'global' || targetCondominioId === 'todos') {
      const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
      targetCondominioId = primeiroValido || '';
    }

    if (!nomeOperador.trim() || !loginOperador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o nome, login e selecione um condomínio.' });
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

      if (idEdicao) {
        const dadosAtualizacao: any = {
          nome: nomeOperador.trim(),
          login: loginOperador.trim().toLowerCase(),
          nivel_acesso: nivelNum,
          nivel_acesso_custom_id: customId,
          perfil: perfilStr,
          foto_url: fotoOperador || null,
          condominio_id: targetCondominioId
        };
        if (senhaOperador.trim()) {
          dadosAtualizacao.senha = senhaOperador.trim();
        }

        let { error } = await supabase
          .from('operadores')
          .update(dadosAtualizacao)
          .eq('id', idEdicao);

        if (error && (
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
            condominio_id: targetCondominioId
          };
          if (dadosAtualizacao.senha) fallback.senha = dadosAtualizacao.senha;
          const retry = await supabase.from('operadores').update(fallback).eq('id', idEdicao);
          error = retry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador atualizado com sucesso!' });
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
          ativo: true
        };

        let { error } = await supabase.from('operadores').insert([novoOp]);

        if (error && (
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
            ativo: true
          };
          const retry = await supabase.from('operadores').insert([fallbackOp]);
          error = retry.error;
        }

        if (error) throw error;
        setMensagem({ tipo: 'sucesso', texto: 'Operador cadastrado com sucesso!' });
      }

      fecharModalFlutuante();
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
    setCondominioIdOperador(op.condominio_id || '');
    setTipoModalFlutuante('operador');
    setModalFlutuanteAberto(true);
  };

  const salvarMorador = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetCondominioId = (eAdmin ? (condominioIdMorador || condominioFiltroAdmin || condoAtivoId) : usuarioLogado?.condominio_id) || condoAtivoId || condominios[0]?.id;
    if (targetCondominioId === 'global' || targetCondominioId === 'todos') {
      const primeiroValido = condominios.find(c => c.id && c.id !== 'global' && c.id !== 'todos')?.id;
      targetCondominioId = primeiroValido || '';
    }

    if (!nomeMorador.trim() || !unidadeMorador.trim() || !targetCondominioId) {
      setMensagem({ tipo: 'erro', texto: 'Nome, Unidade e Condomínio são obrigatórios.' });
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

      fecharModalFlutuante();
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
    setTipoModalFlutuante('morador');
    setModalFlutuanteAberto(true);
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
      const moradoresAfetados = moradores.filter(m => 
        (m.condominio_id === targetCondoId || !m.condominio_id) && 
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
      setMensagem({ tipo: 'erro', texto: 'Acesso restrito: operadores não possuem permissão para personalizar numeração.' });
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

  // Processamento e geração dos cards de unidades para a aba Moradores
  const listaCardsGerados = useMemo(() => {
    const cards = gerarCardsUnidadesCondominio(configCondoAtivo);
    // Assegura que se houver moradores com unidades fora do range, eles também ganhem card (sem duplicar unidades equivalentes)
    const extras: UnidadeEstruturada[] = [];
    moradores.forEach(m => {
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
  }, [configCondoAtivo, moradores, eEstruturaCasasAtivo]);

  const unidadesComMoradores = useMemo(() => {
    return listaCardsGerados.map(u => {
      const moradoresDestaUnidade = moradores.filter(m => {
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
  }, [listaCardsGerados, moradores, eEstruturaCasasAtivo]);

  const contadoresUnidades = useMemo(() => {
    const total = unidadesComMoradores.length;
    const ocupadas = unidadesComMoradores.filter(u => u.ocupada).length;
    const vagas = total - ocupadas;
    const totalTags = moradores.filter(m => m.tag_rfid).length;
    const totalVeiculos = moradores.filter(m => m.veiculo_placa).length;
    const totalBloqueados = moradores.filter(m => m.status_acesso === 'bloqueado').length;
    return { total, ocupadas, vagas, totalMoradores: moradores.length, totalTags, totalVeiculos, totalBloqueados };
  }, [unidadesComMoradores, moradores]);

  // Busca estrita: Unidade, Nome de Moradores e Placa de Veículo (nada mais)
  const matchBuscaUnidadeMoradorPlaca = (item: { unidade: UnidadeEstruturada; moradores: any[] }, termo: string): boolean => {
    if (!termo) return true;
    const t = termo.trim().toLowerCase();
    if (!t) return true;

    // 1. UNIDADE: número direto, label, equivalência (ex: 1 e 01) ou busca na lista de moradores da unidade
    const num = (item.unidade.numero || '').toLowerCase();
    const lbl = (item.unidade.label || '').toLowerCase();
    const matchNum = num === t || num.includes(t) || lbl.includes(t) || saoUnidadesEquivalentes(item.unidade.numero, t);
    if (matchNum) return true;

    const matchUnidadeMorador = item.moradores.some(m => 
      saoUnidadesEquivalentes(m.unidade, t) || (m.unidade || '').toString().toLowerCase().includes(t)
    );
    if (matchUnidadeMorador) return true;

    // 2. NOME DE MORADORES
    const matchNomeMorador = item.moradores.some(m => 
      (m.nome || '').toLowerCase().includes(t)
    );
    if (matchNomeMorador) return true;

    // 3. PLACA DE VEÍCULO
    const tLimpo = t.replace(/[^a-z0-9]/gi, '');
    const matchPlaca = item.moradores.some(m => {
      if (!m.veiculo_placa) return false;
      const plk = m.veiculo_placa.toLowerCase();
      const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
      return plk.includes(t) || (tLimpo.length >= 2 && plkLimpa.includes(tLimpo));
    });
    if (matchPlaca) return true;

    // NADA MAIS: Não filtra por telefone, tag RFID, CPF, etc.
    return false;
  };

  const matchBuscaItemMorador = (m: any, termo: string): boolean => {
    if (!termo) return true;
    const t = termo.trim().toLowerCase();
    if (!t) return true;

    // 1. UNIDADE
    const und = (m.unidade || '').toString().toLowerCase();
    if (und === t || und.includes(t) || saoUnidadesEquivalentes(m.unidade, t)) return true;

    // 2. NOME DO MORADOR
    if ((m.nome || '').toLowerCase().includes(t)) return true;

    // 3. PLACA DE VEÍCULO
    if (m.veiculo_placa) {
      const plk = m.veiculo_placa.toLowerCase();
      const tLimpo = t.replace(/[^a-z0-9]/gi, '');
      const plkLimpa = plk.replace(/[^a-z0-9]/gi, '');
      if (plk.includes(t) || (tLimpo.length >= 2 && plkLimpa.includes(tLimpo))) return true;
    }

    // NADA MAIS
    return false;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Painel Escuro de Filtragem e Seleção de Condomínio */}
      {eAdmin && (
        <div className="bg-slate-900 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="w-full flex-1 space-y-1">
            <label className="block text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Filtrar Condomínio em Gerenciamento
            </label>
            <select
              value={condominioFiltroAdmin}
              onChange={(e) => {
                setCondominioFiltroAdmin(e.target.value);
                setCondominioIdOperador(e.target.value);
                setCondominioIdMorador(e.target.value);
              }}
              className="w-full bg-slate-950 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="">🏢 Todos os Condomínios (Visão Global)</option>
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>🏢 {c.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navegação de Abas Fluida Apenas com Ícones e Contadores */}
      <div className="flex bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300 gap-1.5 shadow-2xs items-center">
        {eAdmin && (
          <button
            type="button"
            onClick={() => setAbaAtiva('condominios')}
            title="Condomínios Cadastrados"
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'condominios'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              abaAtiva === 'condominios' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {condominios.length}
            </span>
          </button>
        )}

        {!eOperador && (
          <button
            type="button"
            onClick={() => setAbaAtiva('operadores')}
            title="Operadores e Equipe de Portaria"
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'operadores'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400 shrink-0" />
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
              abaAtiva === 'operadores' ? 'bg-slate-800 text-blue-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {operadores.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setAbaAtiva('moradores')}
          title="Moradores & Unidades"
          className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
            abaAtiva === 'moradores'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          <Home className="w-4 h-4 text-purple-400 shrink-0" />
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            abaAtiva === 'moradores' ? 'bg-slate-800 text-purple-300' : 'bg-slate-300 text-slate-700'
          }`}>
            {moradores.length}
          </span>
        </button>

        {!eOperador && (
          <button
            type="button"
            onClick={() => setAbaAtiva('niveis')}
            title="Níveis de Acesso & Permissões"
            className={`flex-1 py-2 px-3 text-xs font-black flex items-center justify-center gap-2 rounded-xl transition cursor-pointer ${
              abaAtiva === 'niveis'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              abaAtiva === 'niveis' ? 'bg-slate-800 text-emerald-300' : 'bg-slate-300 text-slate-700'
            }`}>
              {listaNiveis.length}
            </span>
          </button>
        )}
      </div>

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
              <Plus className="w-4 h-4" /> <span>+ Condomínio</span>
            </button>
          </div>

          {/* Grid de Cards dos Condomínios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {condominios
              .filter(c => {
                if (!buscaCondominio.trim()) return true;
                const termo = buscaCondominio.toLowerCase();
                return (c.nome || '').toLowerCase().includes(termo) || (c.endereco || '').toLowerCase().includes(termo);
              })
              .map((c) => {
                const cfg = mapaConfigsCondos[c.id] || {};
                const temGrupo = !!cfg.whatsapp_grupo_url;

                return (
                  <div 
                    key={c.id} 
                    style={{ width: '340px', height: '272.328px' }}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition space-y-3 flex flex-col justify-between w-[340px] max-w-full"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Condomínio
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">{c.nome}</h4>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                          Ativo
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">
                        📍 {c.endereco || 'Endereço não informado'}
                      </p>

                      {/* Informações de Estrutura de Casas / Unidades */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-800">
                          <span className="font-bold flex items-center gap-1.5">
                            {isEstruturaCasas(cfg.tipo_estrutura) ? (
                              <Home className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            {isEstruturaCasas(cfg.tipo_estrutura) ? 'Condomínio de Casas' : 'Condomínio Vertical'}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {isEstruturaCasas(cfg.tipo_estrutura) 
                              ? `${cfg.unidades_por_bloco || 117} Casas Totais` 
                              : `${(cfg.qtd_blocos || 1) * (cfg.unidades_por_bloco || 20)} Unidades`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 pt-0.5 border-t border-slate-200/60">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Plantão: <strong>{cfg.escala_label || '06:00 às 18:00 / 18:00 às 06:00'}</strong></span>
                        </div>
                        {cfg.telefone_portaria && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>Portaria: <strong>{cfg.telefone_portaria}</strong></span>
                          </div>
                        )}
                        {cfg.sindico_nome && (
                          <div className="text-[11px] text-slate-500">
                            Síndico(a): <strong>{cfg.sindico_nome}</strong> {cfg.sindico_whatsapp ? `(${cfg.sindico_whatsapp})` : ''}
                          </div>
                        )}
                      </div>

                      {temGrupo && (
                        <a
                          href={cfg.whatsapp_grupo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grupo WhatsApp do Posto</span>
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCondominioFiltroAdmin(c.id);
                          setCondominioIdMorador(c.id);
                          setAbaAtiva('moradores');
                        }}
                        className="w-full py-2 px-3 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black rounded-xl border border-emerald-200 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        title="Ver e gerenciar cards de casas e moradores deste condomínio"
                      >
                        <Home className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">Gerenciar {isEstruturaCasas(cfg.tipo_estrutura) ? `${cfg.unidades_por_bloco || 117} Casas` : `${(cfg.qtd_blocos || 1) * (cfg.unidades_por_bloco || 20)} Unidades`}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCondominioFiltroAdmin(c.id)}
                          className="flex-1 py-1.5 px-2.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer text-center"
                        >
                          Filtrar
                        </button>

                        <button
                          type="button"
                          onClick={() => prepararEdicaoCondominio(c)}
                          className="flex-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Pencil className="w-3.5 h-3.5 shrink-0" />
                          <span>Editar no Card</span>
                        </button>
                      </div>
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

            <button
              type="button"
              onClick={abrirNovoOperador}
              className="w-full sm:w-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" /> <span>+ Operador</span>
            </button>
          </div>

          {/* Grid de Cards dos Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {operadores
              .filter(op => {
                if (!buscaOperador.trim()) return true;
                const termo = buscaOperador.toLowerCase();
                return (op.nome || '').toLowerCase().includes(termo) || (op.login || '').toLowerCase().includes(termo);
              })
              .map((op) => {
                const nivelStr = obterNomeNivel(op.nivel_acesso_custom_id || op.nivel_acesso || op.perfil, listaNiveis);

                const badgeCor = (op.nivel_acesso === 0 || op.perfil === 'admin' || op.nivel_acesso_custom_id === 'nivel_0')
                  ? 'bg-purple-100 text-purple-900 border-purple-200' 
                  : (op.nivel_acesso === 1 || op.perfil === 'master' || op.nivel_acesso_custom_id === 'nivel_1')
                  ? 'bg-amber-100 text-amber-900 border-amber-200' 
                  : (op.nivel_acesso === 2 || op.perfil === 'supervisor' || op.nivel_acesso_custom_id === 'nivel_2')
                  ? 'bg-blue-100 text-blue-900 border-blue-200'
                  : (op.nivel_acesso === 4 || op.perfil === 'sindico' || op.nivel_acesso_custom_id === 'nivel_4')
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : 'bg-teal-100 text-teal-900 border-teal-200';

                return (
                  <div 
                    key={op.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-300 transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {op.foto_url ? (
                            <img 
                              src={op.foto_url} 
                              alt={op.nome} 
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-xl object-cover border-2 border-blue-400 shrink-0 shadow-2xs" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-blue-400 font-black text-sm flex items-center justify-center shrink-0 border border-slate-700">
                              {op.nome ? op.nome.charAt(0).toUpperCase() : 'OP'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeCor}`}>
                              {nivelStr}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-0.5 truncate">{op.nome}</h4>
                          </div>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full shrink-0">
                          Ativo
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600">
                        <div>Login de Acesso: <strong className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{op.login}</strong></div>
                        <div className="text-[11px] text-slate-500">
                          🏢 Condomínio: <strong>{getNomeCondominioPorId(op.condominio_id)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => prepararEdicaoOperador(op)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar no Card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {operadores.length === 0 && (
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
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 text-white p-4 rounded-2xl border border-slate-700 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-emerald-400" />
                    {eEstruturaCasasAtivo ? 'Condomínio de Casas (Horizontal)' : 'Condomínio Vertical'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">
                    {eEstruturaCasasAtivo ? '• Bloco FIXO como "Casa"' : `• ${configCondoAtivo?.qtd_blocos || 1} Bloco(s)`}
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-black text-white mt-1">
                  {getNomeCondominioPorId(condoAtivoId)}
                </h4>
                <p className="text-xs text-slate-300">
                  {eEstruturaCasasAtivo
                    ? `Gestão direta por Casas: ${contadoresUnidades.total} cards de casas prontos para cadastro e edição dos moradores.`
                    : `Gestão de unidades e moradores vinculados ao posto.`}
                </p>
              </div>
            </div>

            {/* Contadores em Tempo Real com Preparação para Controle de Acesso */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 w-full pt-2 border-t border-slate-700/60">
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Total Casas</p>
                <p className="text-base font-black text-emerald-400">{contadoresUnidades.total}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-emerald-400">Ocupadas</p>
                <p className="text-base font-black text-white">{contadoresUnidades.ocupadas}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Disponíveis</p>
                <p className="text-base font-black text-slate-300">{contadoresUnidades.vagas}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-purple-400">Moradores</p>
                <p className="text-base font-black text-white">{contadoresUnidades.totalMoradores}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-indigo-400 flex items-center justify-center gap-1">
                  <CreditCard className="w-3 h-3 text-indigo-400" /> Tags RFID
                </p>
                <p className="text-base font-black text-indigo-300">{contadoresUnidades.totalTags || 0}</p>
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase text-amber-400 flex items-center justify-center gap-1">
                  <Car className="w-3 h-3 text-amber-400" /> Veículos
                </p>
                <p className="text-base font-black text-amber-300">{contadoresUnidades.totalVeiculos || 0}</p>
              </div>
            </div>
          </div>

          {/* Barra de Controle: Alternador de Visualização, Filtros e Busca */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
              {/* Alternador de Modo de Visualização */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setModoVisaoMoradores('cards_unidades')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    modoVisaoMoradores === 'cards_unidades'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cards ({contadoresUnidades.total})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModoVisaoMoradores('lista_moradores')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    modoVisaoMoradores === 'lista_moradores'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-purple-600" />
                  <span>Lista ({moradores.length})</span>
                </button>
              </div>

              {/* Botões de Ação da Aba Moradores */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Funções de Customização Estrutural restritas a Supervisores Nível 2 e Masters Nível 1/0 (RBAC) */}
                {podeCustomizarEstrutura && (
                  <>
                    {/* Botão de Personalizar Numeração em Lote */}
                    <button
                      type="button"
                      onClick={abrirModalRenumeracao}
                      className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Editar ou colar sequência personalizada de números das casas"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-700" />
                      <span>Personalizar Numeração</span>
                    </button>

                    {/* Botão de Formatar com Zero no Início (01, 02, 03...) */}
                    <button
                      type="button"
                      onClick={formatarTodasComZeroEsquerda}
                      disabled={loading}
                      className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Formatar automaticamente todas as casas 1 a 9 com zero no início (01, 02, 03...)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Salvar 01, 02, 03...</span>
                    </button>

                    {/* Botão de Adicionar Casa Avulsa */}
                    <button
                      type="button"
                      onClick={() => {
                        setNovaUnidadeAvulsaNumero('');
                        setModalAddUnidadeAvulsaAberto(true);
                      }}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Adicionar uma casa ou unidade avulsa à lista"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                      <span>+ {eEstruturaCasasAtivo ? 'Casa Avulsa' : 'Unidade Avulsa'}</span>
                    </button>
                  </>
                )}

                {/* Botão de Adicionar Novo Morador (Compacto) */}
                <button
                  type="button"
                  onClick={() => abrirNovoMorador()}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" /> <span>+ Morador</span>
                </button>
              </div>
            </div>

            {/* Linha de Busca e Navegador de Faixas de Casas */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={termoBuscaMorador}
                  onChange={(e) => setTermoBuscaMorador(e.target.value)}
                  placeholder="Buscar: unidade, moradores ou placa..."
                  title="Busca restrita a: Unidade, Nome de Moradores e Placa de Veículo (nada mais)"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-bold placeholder:text-slate-400 placeholder:font-normal transition shadow-2xs"
                />
                {termoBuscaMorador && (
                  <button
                    type="button"
                    onClick={() => setTermoBuscaMorador('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                    title="Limpar busca"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Navegação Rápida por Faixa de Casas (Ex: 01-30, 31-60, 61-90, 91-117) */}
              {modoVisaoMoradores === 'cards_unidades' && contadoresUnidades.total > 30 && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 px-1 uppercase">Casas:</span>
                  {[
                    { id: 'todas', label: 'Todas' },
                    { id: '1_30', label: '01 - 30' },
                    { id: '31_60', label: '31 - 60' },
                    { id: '61_90', label: '61 - 90' },
                    { id: '91_120', label: `91 - ${contadoresUnidades.total}` }
                  ].map((fx) => (
                    <button
                      key={fx.id}
                      type="button"
                      onClick={() => setFaixaCasasFiltro(fx.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                        faixaCasasFiltro === fx.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                      }`}
                    >
                      {fx.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtros de Ocupação da Casa */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('todas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                    filtroStatusUnidade === 'todas'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todas ({contadoresUnidades.total})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('ocupadas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filtroStatusUnidade === 'ocupadas'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Ocupadas ({contadoresUnidades.ocupadas})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStatusUnidade('vagas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    filtroStatusUnidade === 'vagas'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Disponíveis ({contadoresUnidades.vagas})
                </button>
              </div>
            </div>
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

              {/* Grid Responsivo de Cards de Casas com Status de Acesso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {unidadesComMoradores
                  .filter(item => {
                    if (filtroStatusUnidade === 'ocupadas' && !item.ocupada) return false;
                    if (filtroStatusUnidade === 'vagas' && item.ocupada) return false;
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
                    const placas: string[] = item.moradores
                      .map((m: any) => m.veiculo_placa ? `${m.veiculo_placa}${m.veiculo_modelo ? ` (${m.veiculo_modelo})` : ''}` : null)
                      .filter((p: string | null): p is string => Boolean(p));

                    return (
                      <div
                        key={item.unidade.id}
                        onClick={() => setUnidadeModalAberta(item)}
                        className={`rounded-2xl border p-3.5 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-3 cursor-pointer group select-none ${
                          item.ocupada 
                            ? 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300' 
                            : 'bg-slate-50/70 hover:bg-slate-100/70 border-dashed border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* 1. UNIDADE */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                                <Home className="w-4 h-4 text-emerald-400" />
                              </div>
                              <span className="text-sm font-black text-slate-900 block truncate">
                                {eEstruturaCasasAtivo ? `CASA ${item.unidade.numero}` : item.unidade.label}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              item.ocupada 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {item.ocupada ? 'Ocupada' : 'Disponível'}
                            </span>
                          </div>

                          {/* 2. NOME DE MORADORES */}
                          {item.ocupada && item.moradores.length > 0 ? (
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Morador(es):
                                </span>
                                <div className="space-y-1">
                                  {item.moradores.map((m: any) => (
                                    <div key={m.id} className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span className="truncate">{m.nome}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 3. PLACA DE VEÍCULO (NADA MAIS) */}
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                  Placa de Veículo:
                                </span>
                                {placas.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {placas.map((p: string, idx: number) => (
                                      <span 
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 font-mono font-black text-xs bg-amber-50 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs"
                                      >
                                        <Car className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <span>{p}</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Sem veículo cadastrado</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">Nenhum morador cadastrado nesta unidade.</p>
                          )}
                        </div>

                        {/* Ação simples se vaga */}
                        {!item.ocupada && (
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirNovoMorador({ numero: item.unidade.numero, bloco: item.unidade.bloco });
                              }}
                              className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-black transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Cadastrar Morador</span>
                            </button>
                          </div>
                        )}
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

              {moradores.length === 0 && (
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

      {/* 4. ABA GESTÃO DINÂMICA DE NÍVEIS DE ACESSO E PERMISSÕES (RBAC) */}
      {abaAtiva === 'niveis' && !eOperador && (
        <div className="space-y-4">
          <GerenciamentoPermissoes
            condominioId={condoAtivoId}
            operadores={operadores}
            onAtualizacao={carregarDados}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MENU FLUTUANTE / MODAL DE CADASTRO E EDIÇÃO DIRETAMENTE NO CARD           */}
      {/* ========================================================================= */}
      {modalFlutuanteAberto && (
        <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className={`bg-white rounded-3xl ${tipoModalFlutuante === 'morador' ? 'max-w-2xl' : 'max-w-lg'} w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8 relative`}>
            {/* Header do Menu Flutuante */}
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className={`p-2.5 rounded-2xl ${
                  tipoModalFlutuante === 'condominio' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : tipoModalFlutuante === 'operador' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {tipoModalFlutuante === 'condominio' ? (
                    <Building2 className="w-5 h-5" />
                  ) : tipoModalFlutuante === 'operador' ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Home className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    {idEdicao ? (
                      tipoModalFlutuante === 'condominio' 
                        ? `Editar Condomínio: ${nomeCondominio}` 
                        : tipoModalFlutuante === 'operador' 
                        ? `Editar Operador: ${nomeOperador}` 
                        : `Editar Morador: ${nomeMorador}`
                    ) : (
                      tipoModalFlutuante === 'condominio' 
                        ? 'Novo Cadastro de Condomínio' 
                        : tipoModalFlutuante === 'operador' 
                        ? 'Novo Cadastro de Operador' 
                        : 'Novo Cadastro de Morador'
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menu flutuante de edição rápida e parametrização
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fecharModalFlutuante}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FORMULÁRIO 1: CONDOMÍNIO */}
            {tipoModalFlutuante === 'condominio' && (
              <form onSubmit={salvarCondominio} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome do Condomínio *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeCondominio}
                    onChange={(e) => setNomeCondominio(e.target.value)}
                    placeholder="Ex: Residencial Flores do Bosque"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={enderecoCondominio}
                    onChange={(e) => setEnderecoCondominio(e.target.value)}
                    placeholder="Av. Exemplo, 1234 - Bairro, Cidade/UF"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Estrutura das Casas / Unidades */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-emerald-600" />
                      Estrutura do Condomínio & Unidades
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Geração Automática de Cards
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
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
                        }
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      {OPCOES_TIPO_ESTRUTURA.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Se for Condomínio de Casas */}
                  {isEstruturaCasas(tipoEstruturaCondominio) && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="text-xs font-black text-emerald-950">
                          Estrutura de Casas (Bloco Fixo)
                        </span>
                      </div>

                      <div className="pt-1">
                        <label className="block text-[10px] font-black text-emerald-950 uppercase mb-1">
                          Quantidade Total de Casas / Unidades *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          required
                          value={unidadesPorBlocoCondominio}
                          onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="Ex: 117"
                          className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                        />

                        <label className="flex items-center gap-2.5 cursor-pointer pt-2 mt-2 border-t border-emerald-200/80 bg-white/80 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                          <input
                            type="checkbox"
                            checked={zerosEsquerdaCondominio}
                            onChange={(e) => setZerosEsquerdaCondominio(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-emerald-950">
                            Numeração com zero no início (01, 02, 03...)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Se for Blocos ou Torres */}
                  {(tipoEstruturaCondominio === 'blocos' || tipoEstruturaCondominio === 'torres') && (
                    <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Qtd de {tipoEstruturaCondominio === 'torres' ? 'Torres' : 'Blocos'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={qtdBlocosCondominio}
                          onChange={(e) => setQtdBlocosCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                          Unidades por Bloco
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="300"
                          value={unidadesPorBlocoCondominio}
                          onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  {/* Se for Numeral Direto */}
                  {tipoEstruturaCondominio === 'numeral_direto' && (
                    <div className="animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                        Quantidade Total de Unidades / Lotes
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={unidadesPorBlocoCondominio}
                        onChange={(e) => setUnidadesPorBlocoCondominio(Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Ex: 100"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {/* Escala e Horários */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Escala de Plantão & Horários de Troca
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
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  >
                    {OPCOES_ESCALA.map((op) => (
                      <option key={op.id} value={op.id}>
                        🕒 {op.label}
                      </option>
                    ))}
                  </select>

                  {escalaPlantao === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Diurno</label>
                        <input
                          type="time"
                          value={horarioDiurnoInicio}
                          onChange={(e) => setHorarioDiurnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Início Noturno</label>
                        <input
                          type="time"
                          value={horarioNoturnoInicio}
                          onChange={(e) => setHorarioNoturnoInicio(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp do Grupo do Posto */}
                <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                    Link do Grupo de WhatsApp da Portaria
                  </label>
                  <input
                    type="url"
                    value={whatsappGrupoUrl}
                    onChange={(e) => setWhatsappGrupoUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-slate-900"
                  />
                </div>

                {/* Telefones de Apoio e Síndico */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Telefone Portaria</label>
                    <input
                      type="text"
                      value={telefonePortaria}
                      onChange={(e) => setTelefonePortaria(e.target.value)}
                      placeholder="(11) 98888-0000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Nome do Síndico</label>
                    <input
                      type="text"
                      value={sindicoNome}
                      onChange={(e) => setSindicoNome(e.target.value)}
                      placeholder="Nome do Síndico"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Condomínio' : 'Salvar Condomínio'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 2: OPERADOR */}
            {tipoModalFlutuante === 'operador' && (
              <form onSubmit={salvarOperador} className="space-y-3.5">
                {eAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Condomínio Vinculado *
                    </label>
                    <select
                      value={condominioIdOperador}
                      onChange={(e) => setCondominioIdOperador(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecione o Condomínio...</option>
                      {condominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Foto do Operador */}
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="relative group shrink-0">
                    {fotoOperador ? (
                      <img src={fotoOperador} alt="Foto Operador" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 shadow-xs" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-800 text-blue-400 font-black text-lg flex items-center justify-center border border-slate-700">
                        {nomeOperador ? nomeOperador.charAt(0).toUpperCase() : 'OP'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] font-bold text-slate-800 uppercase block">Foto de Perfil</span>
                    <p className="text-[10px] text-slate-500">Foto do crachá e perfil do operador</p>
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition">
                        <Camera className="w-3.5 h-3.5 text-blue-400" />
                        <span>{fotoOperador ? 'Trocar Foto' : 'Tirar / Carregar Foto'}</span>
                        <input type="file" accept="image/*" capture="user" onChange={handleFotoOperadorUpload} className="hidden" />
                      </label>
                      {fotoOperador && (
                        <button type="button" onClick={() => setFotoOperador('')} className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo do Operador *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeOperador}
                    onChange={(e) => setNomeOperador(e.target.value)}
                    placeholder="Ex: Marcos Souza Oliveira"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Login de Acesso *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginOperador}
                      onChange={(e) => setLoginOperador(e.target.value.toLowerCase())}
                      placeholder="marcos.porteiro"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      {idEdicao ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
                    </label>
                    <input
                      type="password"
                      required={!idEdicao}
                      value={senhaOperador}
                      onChange={(e) => setSenhaOperador(e.target.value)}
                      placeholder={idEdicao ? 'Deixe em branco para manter' : 'Senha secreta'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nível de Acesso / Perfil *
                  </label>
                  <select
                    value={nivelAcesso}
                    onChange={(e) => setNivelAcesso(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
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

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-600/30 cursor-pointer"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Operador' : 'Salvar Operador'}
                  </button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 3: MORADOR (COMPLETO COM CONTROLE DE ACESSO, VEÍCULOS E VÍNCULO) */}
            {tipoModalFlutuante === 'morador' && (
              <form onSubmit={salvarMorador} className="space-y-3.5">
                {/* Abas Internas do Formulário do Morador */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setAbaModalMorador('dados')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      abaModalMorador === 'dados' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👤 Dados Gerais</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaModalMorador('acesso')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      abaModalMorador === 'acesso' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🛡️ Acesso & Veículos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaModalMorador('contato')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                      abaModalMorador === 'contato' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📝 Observações</span>
                  </button>
                </div>

                {/* ABA 1: DADOS GERAIS */}
                {abaModalMorador === 'dados' && (
                  <div className="space-y-3">
                    {/* Foto do Morador */}
                    <div className="flex items-center gap-3.5 bg-purple-50/70 p-3 rounded-xl border border-purple-200">
                      <div className="relative group shrink-0">
                        {fotoMorador ? (
                          <img src={fotoMorador} alt="Foto Morador" loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover border-2 border-purple-500 shadow-xs" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-800 font-black text-lg flex items-center justify-center border border-purple-300">
                            {nomeMorador ? nomeMorador.charAt(0).toUpperCase() : 'MO'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] font-bold text-slate-800 uppercase block">Foto de Perfil do Morador</span>
                        <p className="text-[10px] text-slate-500">Identificação facial e controle de acesso na portaria</p>
                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs">
                            <Camera className="w-3.5 h-3.5 text-purple-200" />
                            <span>{fotoMorador ? 'Trocar Foto' : 'Tirar / Carregar Foto'}</span>
                            <input type="file" accept="image/*" capture="user" onChange={handleFotoMoradorUpload} className="hidden" />
                          </label>
                          {fotoMorador && (
                            <button type="button" onClick={() => setFotoMorador('')} className="p-1 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    {eAdmin && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
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
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        >
                          <option value="">Selecione o Condomínio...</option>
                          {condominios.map((c) => (
                            <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Nome Completo do Morador *
                        </label>
                        <input
                          type="text"
                          required
                          value={nomeMorador}
                          onChange={(e) => setNomeMorador(e.target.value)}
                          placeholder="Ex: Carlos Eduardo da Silva"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Tipo de Vínculo *
                        </label>
                        <select
                          value={tipoMorador}
                          onChange={(e) => setTipoMorador(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                        >
                          <option value="Morador">Morador</option>
                          <option value="Proprietário">Proprietário</option>
                          <option value="Inquilino">Inquilino</option>
                          <option value="Familiar">Familiar / Dependente</option>
                          <option value="Prestador Fixo">Prestador Fixo</option>
                        </select>
                      </div>
                    </div>

                    {/* Estrutura: Se for Condomínio de Casas, Bloco vira "Casa" fixo sem operador selecionar ou digitar */}
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
                        <div className={eNumeralModal ? 'space-y-2' : 'grid grid-cols-2 gap-2.5'}>
                          {eCasasModal ? (
                            <div>
                              <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1 flex items-center gap-1">
                                <Home className="w-3.5 h-3.5 text-emerald-600" /> Bloco / Tipo
                              </label>
                              <div className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-950 flex items-center justify-between">
                                <span>🏠 Casa (Fixo)</span>
                                <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                                  Automático
                                </span>
                              </div>
                            </div>
                          ) : eNumeralModal ? null : (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                                  {rotuloBlocoModal} *
                                </label>
                                {listaBlocosSugestao.length > 0 && (
                                  <span className="text-[10px] text-purple-700 font-bold">
                                    {listaBlocosSugestao.length} {eTorresModal ? 'torres' : 'blocos'} cadastrados
                                  </span>
                                )}
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  list="lista-sugestoes-blocos"
                                  value={blocoMorador}
                                  onChange={(e) => setBlocoMorador(e.target.value)}
                                  placeholder={eTorresModal ? "Selecione ou digite a Torre..." : "Selecione ou digite o Bloco..."}
                                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                                />
                                <datalist id="lista-sugestoes-blocos">
                                  {listaBlocosSugestao.map((b) => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
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
                              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Telefone / WhatsApp (com DDD)
                        </label>
                        <input
                          type="text"
                          value={telefoneMorador}
                          onChange={(e) => setTelefoneMorador(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          CPF
                        </label>
                        <input
                          type="text"
                          value={cpfMorador}
                          onChange={(e) => setCpfMorador(e.target.value)}
                          placeholder="000.000.000-00"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          RG
                        </label>
                        <input
                          type="text"
                          value={rgMorador}
                          onChange={(e) => setRgMorador(e.target.value)}
                          placeholder="00.000.000-0"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={emailMorador}
                          onChange={(e) => setEmailMorador(e.target.value)}
                          placeholder="morador@email.com"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ABA 2: ACESSO & VEÍCULOS */}
                {abaModalMorador === 'acesso' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-900 uppercase">
                        Status de Acesso na Portaria
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setStatusAcessoMorador('liberado')}
                          className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusAcessoMorador === 'liberado'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                          }`}
                        >
                          <span>🟢 Liberado</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusAcessoMorador('aviso')}
                          className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusAcessoMorador === 'aviso'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                          }`}
                        >
                          <span>🟡 Alerta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusAcessoMorador('bloqueado')}
                          className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            statusAcessoMorador === 'bloqueado'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
                          }`}
                        >
                          <span>🔴 Bloqueado</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Tag RFID / Chaveiro
                        </label>
                        <input
                          type="text"
                          value={tagRfidMorador}
                          onChange={(e) => setTagRfidMorador(e.target.value.toUpperCase())}
                          placeholder="Ex: TAG-998822"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Código de Acesso / Senha
                        </label>
                        <input
                          type="text"
                          value={codigoAcessoMorador}
                          onChange={(e) => setCodigoAcessoMorador(e.target.value)}
                          placeholder="Ex: 4421"
                          className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-[11px] font-bold text-slate-900 uppercase flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-amber-600" /> Veículo Principal
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Placa</label>
                          <input
                            type="text"
                            value={veiculoPlacaMorador}
                            onChange={(e) => setVeiculoPlacaMorador(e.target.value.toUpperCase())}
                            placeholder="ABC-1234 ou BRA2E19"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-black text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Modelo / Cor</label>
                          <input
                            type="text"
                            value={veiculoModeloMorador}
                            onChange={(e) => setVeiculoModeloMorador(e.target.value)}
                            placeholder="Ex: Corolla Preto"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Contato de Emergência (Nome e Telefone)
                      </label>
                      <input
                        type="text"
                        value={contatoEmergenciaMorador}
                        onChange={(e) => setContatoEmergenciaMorador(e.target.value)}
                        placeholder="Ex: Mãe Maria - (11) 98888-7777"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}

                {/* ABA 3: OBSERVAÇÕES */}
                {abaModalMorador === 'contato' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Observações da Portaria & Regras Específicas
                      </label>
                      <textarea
                        rows={4}
                        value={observacoesMorador}
                        onChange={(e) => setObservacoesMorador(e.target.value)}
                        placeholder="Ex: Autorizado a receber encomendas em horário comercial. Não permitir entrega com terceiro sem ligação prévia..."
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={fecharModalFlutuante}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs font-black transition shadow-md shadow-purple-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : idEdicao ? 'Atualizar Morador' : 'Salvar Morador'}
                  </button>
                </div>
              </form>
            )}
          </div>
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
                    Personalizar Numeração das Casas / Unidades
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
                            <img src={m.foto_url} alt={m.nome} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover shrink-0 border border-purple-300 shadow-2xs" />
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
    </div>
  );
}
