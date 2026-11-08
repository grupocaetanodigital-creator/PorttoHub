import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import ModalGerenciadorModulosCondominio from '../components/ModalGerenciadorModulosCondominio';
import { carregarModulosCondominio, salvarModulosCondominio } from '../services/modulosService';
import { 
  Settings, 
  Sliders, 
  MessageSquare, 
  PhoneCall, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Plus, 
  Trash2, 
  Phone, 
  Send, 
  FileSpreadsheet,
  Package,
  Archive,
  Briefcase,
  Key,
  Wrench,
  ShieldCheck,
  BookOpen,
  ArrowRightLeft,
  HardHat,
  Database,
  Sparkles,
  Copy,
  Check,
  Boxes,
  MapPin,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
  ListChecks,
  Share2,
  ExternalLink,
  Users,
  History,
  Building2,
  Sun,
  Moon,
  Layers,
  Scan,
  ArrowLeft,
  ChevronRight,
  LayoutGrid
} from 'lucide-react';
import AbaModelosDocumentosOCR from '../components/AbaModelosDocumentosOCR';
import { obterTemaAtual, aplicarTema, TipoTema } from '../services/themeService';
import SeletorTema from '../components/SeletorTema';
import ModalGerenciarSetores from '../components/ModalGerenciarSetores';
import SupabaseDoctorModal from '../components/SupabaseDoctorModal';
import ModalMigracaoSupabase from '../components/ModalMigracaoSupabase';
import ModalCustomizacaoVisual from '../components/ModalCustomizacaoVisual';
import GerenciamentoPermissoes from '../components/GerenciamentoPermissoes';
import { generateMigrationSql } from '../services/databaseDoctor';
import { SetorRonda, carregarSetoresRonda } from '../services/setoresRonda';
import { 
  carregarConfigWhatsApp, 
  salvarConfigWhatsApp, 
  ConfigNotificacoesWhatsApp, 
  CONFIG_WHATSAPP_PADRAO, 
  formatarLinkWhatsApp 
} from '../services/configWhatsappService';
import { isUUID } from '../services/condominioService';

export interface LocalArmazenamento {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  capacidade: string;
  observacao: string;
  ativo: boolean;
}

export const LOCAIS_ARMAZENAMENTO_PADRAO: LocalArmazenamento[] = [
  { id: '1', codigo: 'PRAT-A1', nome: 'Prateleira A1 - Caixas Pequenas', categoria: 'Prateleira', capacidade: 'Até 25 pacotes', observacao: 'Volumes leves e encomendas pequenas', ativo: true },
  { id: '2', codigo: 'PRAT-A2', nome: 'Prateleira A2 - Caixas Médias', categoria: 'Prateleira', capacidade: 'Até 15 pacotes', observacao: 'Volumes médios e caixas padrão', ativo: true },
  { id: '3', codigo: 'GAV-01', nome: 'Gaveta 01 - Cartas & Envelopes', categoria: 'Gaveta', capacidade: 'Até 60 itens', observacao: 'Correspondências, cartões e documentos', ativo: true },
  { id: '4', codigo: 'ARM-01', nome: 'Armário Trancado 01', categoria: 'Armário', capacidade: 'Restrito', observacao: 'Itens de valor, eletrônicos e celulares', ativo: true },
  { id: '5', codigo: 'CHAO-01', nome: 'Chão / Área de Volumosos', categoria: 'Chão / Palete', capacidade: 'Grandes volumes', observacao: 'Eletrodomésticos, TVs e móveis', ativo: true },
  { id: '6', codigo: 'BANCADA', nome: 'Bancada Principal de Triagem', categoria: 'Bancada', capacidade: 'Saída rápida', observacao: 'Pacotes em trânsito para retirada no dia', ativo: true }
];

interface ConfiguracoesProps {
  usuarioLogado?: any;
  onConfigSalva?: (payload: any) => void;
}

export type TipoAbaConfiguracao = 
  | 'menu' 
  | 'flags' 
  | 'permissoes_rbac' 
  | 'templates' 
  | 'emergencia' 
  | 'backup' 
  | 'whats_modulos' 
  | 'locais_triagem' 
  | 'setores_ronda' 
  | 'modelos_documentos';

export default function Configuracoes({ usuarioLogado, onConfigSalva }: ConfiguracoesProps) {
  const [abaAtiva, setAbaAtiva] = useState<TipoAbaConfiguracao>('menu');
  const [loading, setLoading] = useState(false);
  const [modalGerenciadorModulosAberto, setModalGerenciadorModulosAberto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [copiadoSql, setCopiadoSql] = useState(false);
  const [tema, setTema] = useState<TipoTema>(() => obterTemaAtual());

  const handleAlternarTema = (novoTema: TipoTema) => {
    setTema(novoTema);
    aplicarTema(novoTema);
    setMensagem({
      tipo: 'sucesso',
      texto: novoTema === 'claro'
        ? '✓ Modo Claro ativado com sucesso! Cores e fontes ajustadas para máxima legibilidade.'
        : '✓ Modo Escuro ativado com sucesso! Paleta escura suave para menor fadiga visual.'
    });
  };

  // Estado para Central de WhatsApp por Módulo
  const [whatsModulos, setWhatsModulos] = useState<ConfigNotificacoesWhatsApp>(CONFIG_WHATSAPP_PADRAO);
  const [salvandoWhats, setSalvandoWhats] = useState(false);

  const [listaCondominios, setListaCondominios] = useState<any[]>([]);
  const [condominioBackupId, setCondominioBackupId] = useState(usuarioLogado?.condominio_id || '');

  // Estado para Setores de Ronda (Tabela & Checklist)
  const [setoresRonda, setSetoresRonda] = useState<SetorRonda[]>([]);
  const [modalSetoresRondaAberto, setModalSetoresRondaAberto] = useState(false);
  const [modalPersonalizacaoAberto, setModalPersonalizacaoAberto] = useState(false);
  const [pontosRondaLista, setPontosRondaLista] = useState<any[]>([]);

  const [condominioConfigId, setCondominioConfigId] = useState<string>(usuarioLogado?.condominio_id || '');

  const [config, setConfig] = useState<Record<string, any>>({
    id: null,
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

  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState({
    codigo_evento: 'ENCOMENDA_CHEGOU',
    canal_destino: 'Morador Direct',
    corpo_texto: 'Olá {NOME_MORADOR}, sua encomenda {CODIGO} chegou na portaria do condomínio e está disponível para retirada!'
  });

  const [contatos, setContatos] = useState<any[]>([]);
  const [novoContato, setNovoContato] = useState({
    categoria: 'Órgão Público',
    nome_descricao: '',
    telefone_principal: '',
    telefone_whatsapp: '',
    exibir_menu_flutuante: true
  });

  // Estado para Locais de Triagem & Armazenamento (Tabela)
  const [locaisArmazenamento, setLocaisArmazenamento] = useState<LocalArmazenamento[]>([]);
  const [modalLocalAberto, setModalLocalAberto] = useState(false);
  const [localParaExcluir, setLocalParaExcluir] = useState<LocalArmazenamento | null>(null);
  const [modalDoctorAberto, setModalDoctorAberto] = useState(false);
  const [modalMigracaoAberto, setModalMigracaoAberto] = useState(false);
  const [editandoLocalId, setEditandoLocalId] = useState<string | null>(null);
  const [filtroLocais, setFiltroLocais] = useState('');
  const [formLocal, setFormLocal] = useState({
    codigo: '',
    nome: '',
    categoria: 'Prateleira',
    capacidade: 'Até 20 pacotes',
    observacao: '',
    ativo: true
  });

  const modulosVisual = [
    { 
      key: 'mod01_cadastros_base', 
      moduloNum: '01',
      titulo: 'Módulo 01 - Cadastros Base do Sistema', 
      desc: 'Moradores, unidades/casas, condomínios, operadores e controle de acesso', 
      icon: Users 
    },
    { 
      key: 'mod02_gestao_encomendas', 
      moduloNum: '02',
      titulo: 'Módulo 02 - Encomendas', 
      desc: 'Lotes de entregas, leitura de etiquetas e baixa com foto', 
      icon: Package 
    },
    { 
      key: 'mod03_custodia_itens', 
      moduloNum: '03',
      titulo: 'Módulo 03 - Custódia de Itens', 
      desc: 'Guarda de chaves, envelopes e pertences de terceiros/moradores com alerta de 48h', 
      icon: Archive 
    },
    { 
      key: 'mod04_materiais_posto', 
      moduloNum: '04',
      titulo: 'Módulo 04 - Materiais & Inventário do Posto', 
      desc: 'Rádios HT, lanternas, bastões e controles da guarita', 
      icon: Briefcase 
    },
    { 
      key: 'mod05_quadro_chaves', 
      moduloNum: '05',
      titulo: 'Módulo 05 - Claviculário Digital de Chaves', 
      desc: 'Controle de retirada por morador/terceiro com horário limite de devolução', 
      icon: Key 
    },
    { 
      key: 'mod06_gestao_manutencao', 
      moduloNum: '06',
      titulo: 'Módulo 06 - Gestão de Manutenção & OS', 
      desc: 'Abertura de chamados com foto antes/depois e checklists diário/semanal/mensal', 
      icon: Wrench 
    },
    { 
      key: 'mod07_gestao_ronda', 
      moduloNum: '07',
      titulo: 'Módulo 07 - Ronda Patrimonial (GPS & QR/NFC)', 
      desc: 'Leitura de pontos georreferenciados e alerta sonoro de próxima ronda', 
      icon: ShieldCheck 
    },
    { 
      key: 'mod08_livro_ocorrencias', 
      moduloNum: '08',
      titulo: 'Módulo 08 - Livro de Ocorrências (Foto & Áudio)', 
      desc: 'Registro interno do posto com áudio narrado e fluxo de resolução', 
      icon: BookOpen 
    },
    { 
      key: 'mod09_passagem_posto', 
      moduloNum: '09',
      titulo: 'Módulo 09 - Passagem de Posto Auditada', 
      desc: 'Consolidação de pendências de todos os módulos e dupla validação de PIN', 
      icon: ArrowRightLeft 
    },
    { 
      key: 'mod10_prestadores_servico', 
      moduloNum: '10',
      titulo: 'Módulo 10 - Autorizados (Visitas, Diaristas e Obras)', 
      desc: 'Pré-autorizações com vigência e entrada com 1 toque sem exigência de docs', 
      icon: HardHat 
    },
    { 
      key: 'mod11_bancada_conferencia', 
      moduloNum: '11',
      titulo: 'Módulo 11 - Bancada de Portaria & Conferência de Balcão', 
      desc: 'Lançamento rápido e organizado dos volumes físicos na guarita por torre/bloco e auditoria de balcão', 
      icon: Layers 
    },
    { 
      key: 'mod12_historico_absoluto', 
      moduloNum: '12',
      titulo: 'Módulo 12 - Histórico Absoluto & Auditoria', 
      desc: 'Registro imutável de todas as ações, auditoria de expurgo e feed de segurança', 
      icon: History 
    },
    { 
      key: 'mod_portal_sindico', 
      moduloNum: '13',
      titulo: 'Módulo 13 - Portal do Síndico', 
      desc: 'Painel de gestão, auditoria e consulta exclusivo para síndicos e administradores', 
      icon: ShieldAlert 
    },
    { 
      key: 'mod_guia_operacional', 
      moduloNum: '14',
      titulo: 'Módulo 14 - Manual Oficial & Guia Operacional', 
      desc: 'Instruções e manual de todas as funções (desative quando a equipe já estiver treinada)', 
      icon: BookOpen 
    }
  ];

  const funcoesMenuConfig = [
    {
      id: 'flags' as TipoAbaConfiguracao,
      numero: '11.1',
      titulo: 'Tema Visual & Módulos (No Condomínio)',
      subtitulo: 'Alternar Tema Claro/Escuro e atalho para o Gerenciador de Módulos (agora no Menu do Condomínio).',
      icone: Sliders,
      badge: 'No Menu do Condomínio',
      corBorda: 'hover:border-blue-400 group-hover:border-blue-500',
      corBgIcone: 'bg-blue-500/10 text-blue-600 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white',
      corBadge: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      id: 'permissoes_rbac' as TipoAbaConfiguracao,
      numero: '11.2',
      titulo: 'Níveis de Acesso & Permissões (RBAC)',
      subtitulo: 'Gestão de permissões por perfil: Síndico, Zelador, Porteiro e Administrador.',
      icone: ShieldCheck,
      badge: 'Controle de Acesso',
      corBorda: 'hover:border-emerald-400 group-hover:border-emerald-500',
      corBgIcone: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white',
      corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'whats_modulos' as TipoAbaConfiguracao,
      numero: '11.3',
      titulo: 'Grupos & Notificações WhatsApp',
      subtitulo: 'Configuração de canais e grupos de WhatsApp por módulo e tipo de evento.',
      icone: Share2,
      badge: 'Grupos WhatsApp',
      corBorda: 'hover:border-green-400 group-hover:border-green-500',
      corBgIcone: 'bg-green-500/10 text-green-600 border border-green-500/20 group-hover:bg-green-600 group-hover:text-white',
      corBadge: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      id: 'locais_triagem' as TipoAbaConfiguracao,
      numero: '11.4',
      titulo: 'Locais de Armazenamento & Triagem',
      subtitulo: 'Tabela de escaninhos, prateleiras, gavetas e bancadas para encomendas físicas.',
      icone: Boxes,
      badge: 'Locais Físicos',
      corBorda: 'hover:border-amber-400 group-hover:border-amber-500',
      corBgIcone: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white',
      corBadge: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'setores_ronda' as TipoAbaConfiguracao,
      numero: '11.5',
      titulo: 'Setores & Rotas de Ronda',
      subtitulo: 'Pontos georreferenciados (QR/GPS), áreas de ronda patrimonial e checklists.',
      icone: MapPin,
      badge: 'Rondas Patrimoniais',
      corBorda: 'hover:border-cyan-400 group-hover:border-cyan-500',
      corBgIcone: 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 group-hover:bg-cyan-600 group-hover:text-white',
      corBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    },
    {
      id: 'templates' as TipoAbaConfiguracao,
      numero: '11.6',
      titulo: 'Templates de Mensagens WhatsApp',
      subtitulo: 'Modelos de textos com tags dinâmicas ({NOME_MORADOR}, {CODIGO}) para avisos.',
      icone: MessageSquare,
      badge: 'Modelos de Texto',
      corBorda: 'hover:border-indigo-400 group-hover:border-indigo-500',
      corBgIcone: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white',
      corBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'emergencia' as TipoAbaConfiguracao,
      numero: '11.7',
      titulo: 'Agenda & Telefones de Emergência',
      subtitulo: 'Números rápidos: Polícia Militar, Bombeiros, SAMU, Zelador e Suporte da Guarita.',
      icone: PhoneCall,
      badge: 'Discagem 1-Clique',
      corBorda: 'hover:border-rose-400 group-hover:border-rose-500',
      corBgIcone: 'bg-rose-500/10 text-rose-600 border border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white',
      corBadge: 'bg-rose-50 text-rose-700 border-rose-200'
    },
    {
      id: 'modelos_documentos' as TipoAbaConfiguracao,
      numero: '11.8',
      titulo: 'Design & Modelos de Documentos (OCR)',
      subtitulo: 'Leitura ótica e layouts de conferência de CNH, RG, crachás e comprovantes.',
      icone: Scan,
      badge: 'OCR & Identidade',
      corBorda: 'hover:border-purple-400 group-hover:border-purple-500',
      corBgIcone: 'bg-purple-500/10 text-purple-600 border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white',
      corBadge: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'backup' as TipoAbaConfiguracao,
      numero: '11.9',
      titulo: 'Backup & Exportação Excel (.CSV)',
      subtitulo: 'Extração instantânea e download de todas as tabelas do condomínio para Excel.',
      icone: FileSpreadsheet,
      badge: 'Planilhas .CSV',
      corBorda: 'hover:border-teal-400 group-hover:border-teal-500',
      corBgIcone: 'bg-teal-500/10 text-teal-600 border border-teal-500/20 group-hover:bg-teal-600 group-hover:text-white',
      corBadge: 'bg-teal-50 text-teal-700 border-teal-200'
    },
    {
      id: 'banco_doctor' as any,
      numero: '11.10',
      titulo: 'Diagnóstico do Banco de Dados',
      subtitulo: 'Verificação da integridade das 29 tabelas do Supabase PostgreSQL e status de integridade.',
      icone: Database,
      badge: 'Supabase Doctor',
      corBorda: 'hover:border-blue-500 group-hover:border-blue-600 ring-2 ring-blue-500/20',
      corBgIcone: 'bg-blue-600 text-white shadow-xs group-hover:scale-105',
      corBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
    },
    {
      id: 'migracao_supabase' as any,
      numero: '11.11',
      titulo: 'Migrador Oficial de Dados: Supabase Antigo → PorttoHub',
      subtitulo: 'Extrair, salvar backup JSON e transferir 100% dos dados do banco antigo para o banco de dados PorttoHub.',
      icone: ArrowRightLeft,
      badge: 'Migração Exclusiva',
      corBorda: 'hover:border-emerald-500 group-hover:border-emerald-600 ring-2 ring-emerald-500/20',
      corBgIcone: 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white shadow-xs group-hover:scale-105',
      corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
    },
    {
      id: 'personalizacao_visual' as any,
      numero: '11.12',
      titulo: 'Personalização Visual & Emblema',
      subtitulo: 'Editar o nome em frente ao emblema, tamanhos de fonte e rótulos personalizados dos módulos.',
      icone: Sparkles,
      badge: 'Identidade & Fontes',
      corBorda: 'hover:border-purple-400 group-hover:border-purple-500 ring-2 ring-purple-500/20',
      corBgIcone: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-xs group-hover:scale-105',
      corBadge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
    }
  ];

  useEffect(() => {
    carregarCondominios();
    const targetCondo = condominioConfigId || usuarioLogado?.condominio_id;
    if (targetCondo) {
      carregarConfiguracoes(targetCondo);
      carregarTemplates();
      carregarContatosEmergencia();
      carregarLocaisArmazenamento();
      carregarSetoresRondaConfig();
      carregarConfigWhatsApp(targetCondo).then(cfg => {
        setWhatsModulos(cfg);
      });
    }

    const handleSetoresAtualizados = (e: any) => {
      if (e.detail?.setores && Array.isArray(e.detail.setores)) {
        setSetoresRonda(e.detail.setores);
      }
    };
    window.addEventListener('setores_ronda_atualizados', handleSetoresAtualizados);
    return () => {
      window.removeEventListener('setores_ronda_atualizados', handleSetoresAtualizados);
    };
  }, [usuarioLogado?.condominio_id, condominioConfigId]);

  const carregarSetoresRondaConfig = async () => {
    try {
      const lista = await carregarSetoresRonda(usuarioLogado?.condominio_id);
      setSetoresRonda(lista);
      if (usuarioLogado?.condominio_id) {
        const { data: pts } = await supabase
          .from('rondas_pontos')
          .select('id, setor_id, nome_ponto')
          .eq('condominio_id', usuarioLogado.condominio_id);
        if (pts) setPontosRondaLista(pts);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const carregarCondominios = async () => {
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setListaCondominios(data || []);

      if (!condominioConfigId && data && data.length > 0) {
        const idPadrao = usuarioLogado?.condominio_id || data[0].id;
        setCondominioConfigId(idPadrao);
      }

      if (!condominioBackupId && data && data.length > 0) {
        setCondominioBackupId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de condomínios:', err);
    }
  };

  const carregarConfiguracoes = async (condoIdAlvo?: string) => {
    let targetCondoId = condoIdAlvo || condominioConfigId;
    if (!targetCondoId || targetCondoId === 'todos' || targetCondoId === 'global' || !isUUID(targetCondoId)) {
      if (usuarioLogado?.condominio_id && isUUID(usuarioLogado.condominio_id)) {
        targetCondoId = usuarioLogado.condominio_id;
      } else {
        const primeiroCondo = listaCondominios.find(c => isUUID(c.id));
        targetCondoId = primeiroCondo ? primeiroCondo.id : '';
      }
    }
    if (!targetCondoId || !isUUID(targetCondoId)) return;

    try {
      // 1. Tenta cache do localStorage primeiro para resposta instantânea
      const cached = localStorage.getItem(`infport_flags_${targetCondoId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig(prev => ({
            ...prev,
            ...parsed
          }));
        } catch {
          // ignore
        }
      }

      const flagsConsolidadas = await carregarModulosCondominio(targetCondoId);
      setConfig(prev => ({
        ...prev,
        ...flagsConsolidadas
      }));
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const carregarTemplates = async () => {
    try {
      const condoId = (condominioConfigId && isUUID(condominioConfigId)) 
        ? condominioConfigId 
        : (isUUID(usuarioLogado?.condominio_id) ? usuarioLogado.condominio_id : (listaCondominios.find(c => isUUID(c.id))?.id || ''));
      if (!condoId || !isUUID(condoId)) return;
      const { data, error } = await supabase
        .from('templates_whatsapp')
        .select('*')
        .eq('condominio_id', condoId);

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Erro ao carregar templates:', err);
    }
  };

  const carregarContatosEmergencia = async () => {
    try {
      const condoId = (condominioConfigId && isUUID(condominioConfigId)) 
        ? condominioConfigId 
        : (isUUID(usuarioLogado?.condominio_id) ? usuarioLogado.condominio_id : (listaCondominios.find(c => isUUID(c.id))?.id || ''));
      if (!condoId || !isUUID(condoId)) return;
      const { data, error } = await supabase
        .from('agenda_emergencia')
        .select('*')
        .eq('condominio_id', condoId)
        .order('categoria', { ascending: true });

      if (error) throw error;
      setContatos(data || []);
    } catch (err) {
      console.error('Erro ao carregar contatos de emergência:', err);
    }
  };

  const carregarLocaisArmazenamento = async () => {
    let targetCondoId = (condominioConfigId && isUUID(condominioConfigId)) 
      ? condominioConfigId 
      : (isUUID(usuarioLogado?.condominio_id) ? usuarioLogado.condominio_id : (listaCondominios.find(c => isUUID(c.id))?.id || ''));
    if (!targetCondoId || !isUUID(targetCondoId)) {
      setLocaisArmazenamento(LOCAIS_ARMAZENAMENTO_PADRAO);
      return;
    }

    try {
      // 1. Tentar ler do localStorage para resposta imediata
      const cached = localStorage.getItem(`infport_locais_${targetCondoId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocaisArmazenamento(parsed);
          }
        } catch {
          // ignore
        }
      }

      // 2. Tenta buscar da tabela dedicada locais_armazenamento
      const { data: locaisTabela, error: errTabela } = await supabase
        .from('locais_armazenamento')
        .select('*')
        .eq('condominio_id', targetCondoId)
        .order('codigo', { ascending: true });

      if (!errTabela && locaisTabela && locaisTabela.length > 0) {
        setLocaisArmazenamento(locaisTabela);
        localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(locaisTabela));
        return;
      }

      // 3. Fallback: Tenta buscar da coluna locais_armazenamento na tabela configuracoes
      const { data: configData } = await supabase
        .from('configuracoes')
        .select('locais_armazenamento')
        .eq('condominio_id', targetCondoId)
        .maybeSingle();

      if (configData?.locais_armazenamento && Array.isArray(configData.locais_armazenamento) && configData.locais_armazenamento.length > 0) {
        setLocaisArmazenamento(configData.locais_armazenamento);
        localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(configData.locais_armazenamento));
        return;
      }

      // 4. Se não existir nada cadastrado ainda, inicializa com os locais padrão
      setLocaisArmazenamento(LOCAIS_ARMAZENAMENTO_PADRAO);
      localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(LOCAIS_ARMAZENAMENTO_PADRAO));
    } catch (err) {
      console.error('Erro ao carregar locais de armazenamento:', err);
      if (locaisArmazenamento.length === 0) {
        setLocaisArmazenamento(LOCAIS_ARMAZENAMENTO_PADRAO);
      }
    }
  };

  const persistirLocais = async (novosLocais: LocalArmazenamento[]) => {
    const targetCondoId = usuarioLogado?.condominio_id || condominioBackupId || 'condominio_ativo';

    setLocaisArmazenamento(novosLocais);
    localStorage.setItem(`infport_locais_${targetCondoId}`, JSON.stringify(novosLocais));
    localStorage.setItem('infport_locais_global', JSON.stringify(novosLocais));

    // Notifica outros módulos (como Encomendas) em tempo real
    window.dispatchEvent(new CustomEvent('locais_armazenamento_atualizados', {
      detail: { condominio_id: targetCondoId, locais: novosLocais }
    }));

    // Tenta salvar no Supabase
    try {
      const idSalvar = usuarioLogado?.condominio_id || condominioBackupId;
      if (idSalvar) {
        // Salva na tabela configuracoes (JSONB)
        await supabase
          .from('configuracoes')
          .upsert([
            { condominio_id: idSalvar, locais_armazenamento: novosLocais }
          ], { onConflict: 'condominio_id' });
      }
    } catch (e) {
      console.warn('Aviso de persistência de locais:', e);
    }
  };

  const abrirModalNovoLocal = () => {
    setEditandoLocalId(null);
    setFormLocal({
      codigo: '',
      nome: '',
      categoria: 'Prateleira',
      capacidade: 'Até 20 pacotes',
      observacao: '',
      ativo: true
    });
    setModalLocalAberto(true);
  };

  const abrirEdicaoLocal = (local: LocalArmazenamento) => {
    setEditandoLocalId(local.id);
    setFormLocal({
      codigo: local.codigo,
      nome: local.nome,
      categoria: local.categoria || 'Prateleira',
      capacidade: local.capacidade || '',
      observacao: local.observacao || '',
      ativo: local.ativo
    });
    setModalLocalAberto(true);
  };

  const salvarLocalArmazenamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLocal.codigo.trim() || !formLocal.nome.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o código e o nome do local de armazenamento.' });
      return;
    }

    const codigoFormatado = formLocal.codigo.trim().toUpperCase();
    let atualizados: LocalArmazenamento[] = [];

    if (editandoLocalId) {
      atualizados = locaisArmazenamento.map(l => {
        if (l.id === editandoLocalId) {
          return {
            ...l,
            codigo: codigoFormatado,
            nome: formLocal.nome.trim(),
            categoria: formLocal.categoria,
            capacidade: formLocal.capacidade.trim(),
            observacao: formLocal.observacao.trim(),
            ativo: formLocal.ativo
          };
        }
        return l;
      });
      setMensagem({ tipo: 'sucesso', texto: `Local "${formLocal.nome}" atualizado na tabela com sucesso!` });
    } else {
      const novoLocal: LocalArmazenamento = {
        id: Date.now().toString(),
        codigo: codigoFormatado,
        nome: formLocal.nome.trim(),
        categoria: formLocal.categoria,
        capacidade: formLocal.capacidade.trim(),
        observacao: formLocal.observacao.trim(),
        ativo: formLocal.ativo
      };
      atualizados = [...locaisArmazenamento, novoLocal];
      setMensagem({ tipo: 'sucesso', texto: `Novo local "${formLocal.nome}" cadastrado na tabela!` });
    }

    await persistirLocais(atualizados);
    setModalLocalAberto(false);
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
  };

  const toggleStatusLocal = async (id: string) => {
    const atualizados = locaisArmazenamento.map(l => {
      if (l.id === id) {
        return { ...l, ativo: !l.ativo };
      }
      return l;
    });
    await persistirLocais(atualizados);
  };

  const excluirLocalArmazenamento = (local: LocalArmazenamento) => {
    setLocalParaExcluir(local);
  };

  const confirmarExclusaoLocal = async () => {
    if (!localParaExcluir) return;
    const id = localParaExcluir.id;
    const nome = localParaExcluir.nome;
    const atualizados = locaisArmazenamento.filter(l => l.id !== id);
    setLocalParaExcluir(null);
    await persistirLocais(atualizados);

    try {
      await supabase.from('locais_armazenamento').delete().eq('id', id);
    } catch (e) {
      console.warn('Aviso ao deletar de locais_armazenamento:', e);
    }

    setMensagem({ tipo: 'sucesso', texto: `Local de armazenamento "${nome}" removido com sucesso!` });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);
  };

  const salvarParametrizacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    let targetCondoId = condominioConfigId;
    if (!targetCondoId || targetCondoId === 'todos' || targetCondoId === 'global' || !isUUID(targetCondoId)) {
      if (usuarioLogado?.condominio_id && isUUID(usuarioLogado.condominio_id)) {
        targetCondoId = usuarioLogado.condominio_id;
      } else {
        const primeiroCondo = listaCondominios.find(c => isUUID(c.id));
        targetCondoId = primeiroCondo ? primeiroCondo.id : '';
      }
    }
    if (!targetCondoId || !isUUID(targetCondoId)) {
      setMensagem({ tipo: 'erro', texto: 'Selecione um condomínio válido para salvar configurações.' });
      setLoading(false);
      return;
    }

    try {
      const res = await salvarModulosCondominio(targetCondoId, config);

      if (res.sucesso) {
        setConfig(prev => ({
          ...prev,
          ...res.flags
        }));

        setMensagem({ tipo: 'sucesso', texto: 'Parametrização dos módulos salva com sucesso!' });
        setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4000);

        if (onConfigSalva) onConfigSalva(res.flags);
      } else {
        setMensagem({ tipo: 'erro', texto: res.erro || 'Erro ao salvar parametrização.' });
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar parametrização: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const salvarTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        codigo_evento: templateSelecionado.codigo_evento,
        canal_destino: templateSelecionado.canal_destino,
        corpo_texto: templateSelecionado.corpo_texto
      };

      const { error } = await supabase
        .from('templates_whatsapp')
        .upsert([payload]);

      if (error) throw error;

      carregarTemplates();
      setMensagem({ tipo: 'sucesso', texto: 'Template de WhatsApp atualizado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar template: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfigWhatsModulos = async () => {
    setSalvandoWhats(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      await salvarConfigWhatsApp(usuarioLogado?.condominio_id, whatsModulos);
      setMensagem({ tipo: 'sucesso', texto: 'Configurações de WhatsApp de todos os módulos salvas com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações de WhatsApp: ' + err.message });
    } finally {
      setSalvandoWhats(false);
    }
  };

  const testarWhatsModulo = (chave: keyof ConfigNotificacoesWhatsApp, tituloModulo: string) => {
    const dest = whatsModulos[chave];
    if (!dest?.telefone_ou_grupo) {
      setMensagem({ tipo: 'erro', texto: `Por favor, preencha o número de WhatsApp ou link de grupo para ${tituloModulo} antes de testar.` });
      return;
    }
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Operador';
    const texto = `🔔 *TESTE DE NOTIFICAÇÃO INFPORT — ${tituloModulo.toUpperCase()}*\n` +
      `🏢 Condomínio: ${usuarioLogado?.condominio_nome || 'INFPORT'}\n` +
      `🎯 Canal: ${dest.nome_destinatario || tituloModulo}\n` +
      `👮 Operador: ${nomeOp}\n` +
      `✅ Status da Conexão: OPERACIONAL (Verificado com sucesso!)\n` +
      `⏰ Data/Hora: ${new Date().toLocaleString('pt-BR')}`;
    const link = formatarLinkWhatsApp(dest.telefone_ou_grupo, texto);
    window.open(link, '_blank');
  };

  const testarTemplate = () => {
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'Operador';
    const textoFormatado = `⚙️ *TESTE DE CONFIGURAÇÃO DE TEMPLATE DE WHATSAPP*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'INFPORT'}\n` +
      `Módulo de Origem: Módulo 11 - Motor de Comunicação\n\n` +
      `• Operador Responsável: ${nomeOp}\n` +
      `• Data e Hora: ${new Date().toLocaleString('pt-BR')}\n` +
      `• Status da Integração: 🟢 OPERACIONAL\n` +
      `• Modo de Envio: Deep Link Direct (API Nativa)\n` +
      `• Evento: ${templateSelecionado.codigo_evento}\n\n` +
      `*Texto do Template:*\n"${templateSelecionado.corpo_texto}"`;

    window.open(`https://wa.me/?text=${encodeURIComponent(textoFormatado)}`, '_blank');
  };

  const adicionarContato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoContato.nome_descricao || !novoContato.telefone_principal) return;

    setLoading(true);
    try {
      const payload = {
        condominio_id: usuarioLogado.condominio_id,
        ...novoContato
      };

      const { error } = await supabase
        .from('agenda_emergencia')
        .insert([payload]);

      if (error) throw error;

      setNovoContato({
        categoria: 'Órgão Público',
        nome_descricao: '',
        telefone_principal: '',
        telefone_whatsapp: '',
        exibir_menu_flutuante: true
      });

      carregarContatosEmergencia();
      setMensagem({ tipo: 'sucesso', texto: 'Contato de emergência adicionado com sucesso!' });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao adicionar contato: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const excluirContato = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agenda_emergencia')
        .delete()
        .eq('id', id);

      if (error) throw error;

      carregarContatosEmergencia();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir contato: ' + err.message });
    }
  };

  const dispararPanico = (contato: any) => {
    const agora = new Date();
    const dataHoraStr = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}H`;
    const nomeOp = usuarioLogado?.nome || usuarioLogado?.login || 'OPERADOR';

    const textoPanico = `🚨 *ALERTA DE EMERGÊNCIA / PÂNICO ACIONADO NA GUARITA*\n` +
      `Condomínio: ${usuarioLogado?.condominio_nome || 'INFPORT'}\n` +
      `Posto: Guarita Principal\n\n` +
      `• Acionado por: ${nomeOp}\n` +
      `• Operador Responsável: ${nomeOp}\n` +
      `• Tipo de Ocorrência: Solicitação de Apoio Imediato (${contato.nome_descricao})\n` +
      `• Data/Hora do Disparo: ${dataHoraStr}\n\n` +
      `A central da INFPORT e a supervisão foram notificadas. Favor entrar em contato imediato com o posto!`;

    const num = contato.telefone_whatsapp || contato.telefone_principal;
    window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${encodeURIComponent(textoPanico)}`, '_blank');
  };

  const converterParaCSV = (nomeTabela: string, dados: any[]) => {
    if (!dados || dados.length === 0) {
      return `--- TABELA: ${nomeTabela} ---\nNenhum registro encontrado.\n\n`;
    }

    const colunas = Object.keys(dados[0]);
    let csv = `--- TABELA: ${nomeTabela} ---\n`;
    csv += colunas.join(';') + '\n';

    dados.forEach((row) => {
      const linha = colunas.map((col) => {
        let val = row[col];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csv += linha.join(';') + '\n';
    });

    return csv + '\n';
  };

  const gerarBackupExcelCondominio = async () => {
    setExportando(true);
    setMensagem({ tipo: 'sucesso', texto: 'Extraindo dados e gerando arquivo formatado para Excel...' });

    try {
      const targetCondoId = condominioBackupId;
      const condoObj = listaCondominios.find(c => c.id === targetCondoId);
      const condoNome = condoObj ? condoObj.nome.replace(/[^a-zA-Z0-9]/g, '_') : 'TODOS_OS_CONDOMINIOS';

      const buscarTabela = async (tabela: string) => {
        let query = supabase.from(tabela).select('*');
        if (targetCondoId && targetCondoId !== 'TODOS' && targetCondoId !== 'todos' && isUUID(targetCondoId)) {
          query = query.eq('condominio_id', targetCondoId);
        }
        const { data, error } = await query;
        if (error) console.warn(`Aviso ao buscar tabela ${tabela}:`, error.message);
        return data || [];
      };

      const [
        condominiosData,
        operadoresData,
        moradoresData,
        encomendasItensData,
        custodiaData,
        materiaisData,
        chavesData,
        manutencaoData,
        rondasPontosData,
        rondasExecucaoData,
        rondasRegistrosData,
        passagemPostoData,
        ocorrenciasData,
        prestadoresData,
        configuracoesData,
        templatesData,
        agendaData
      ] = await Promise.all([
        targetCondoId && targetCondoId !== 'TODOS' 
          ? supabase.from('condominios').select('*').eq('id', targetCondoId).then(r => r.data || [])
          : supabase.from('condominios').select('*').then(r => r.data || []),
        buscarTabela('operadores'),
        buscarTabela('moradores'),
        buscarTabela('encomendas_itens'),
        buscarTabela('custodia'),
        buscarTabela('materiais_posto'),
        buscarTabela('chaves'),
        buscarTabela('chamados_manutencao'),
        buscarTabela('rondas_pontos'),
        buscarTabela('rondas_execucao'),
        buscarTabela('rondas_registros'),
        buscarTabela('passagens_posto'),
        buscarTabela('ocorrencias'),
        buscarTabela('prestadores'),
        buscarTabela('configuracoes'),
        buscarTabela('templates_whatsapp'),
        buscarTabela('agenda_emergencia')
      ]);

      let relatorioCSV = '\uFEFF';
      relatorioCSV += `RELATÓRIO DE BACKUP - INFPORT 1.0\n`;
      relatorioCSV += `Condomínio:;${condoObj?.nome || 'TODOS OS CONDOMÍNIOS'}\n`;
      relatorioCSV += `Data de Exportação:;${new Date().toLocaleString('pt-BR')}\n`;
      relatorioCSV += `Solicitado Por:;${usuarioLogado?.login || 'ADMIN'}\n\n`;

      relatorioCSV += converterParaCSV('CONDOMINIOS', condominiosData);
      relatorioCSV += converterParaCSV('OPERADORES', operadoresData);
      relatorioCSV += converterParaCSV('MORADORES', moradoresData);
      relatorioCSV += converterParaCSV('ENCOMENDAS_ITENS', encomendasItensData);
      relatorioCSV += converterParaCSV('CUSTODIA', custodiaData);
      relatorioCSV += converterParaCSV('MATERIAIS_POSTO', materiaisData);
      relatorioCSV += converterParaCSV('QUADRO_CHAVES', chavesData);
      relatorioCSV += converterParaCSV('CHAMADOS_MANUTENCAO', manutencaoData);
      relatorioCSV += converterParaCSV('RONDAS_PONTOS', rondasPontosData);
      relatorioCSV += converterParaCSV('RONDAS_EXECUCAO', rondasExecucaoData);
      relatorioCSV += converterParaCSV('RONDAS_REGISTROS', rondasRegistrosData);
      relatorioCSV += converterParaCSV('PASSAGENS_POSTO', passagemPostoData);
      relatorioCSV += converterParaCSV('OCORRENCIAS', ocorrenciasData);
      relatorioCSV += converterParaCSV('PRESTADORES', prestadoresData);
      relatorioCSV += converterParaCSV('CONFIGURACOES', configuracoesData);
      relatorioCSV += converterParaCSV('TEMPLATES_WHATSAPP', templatesData);
      relatorioCSV += converterParaCSV('AGENDA_EMERGENCIA', agendaData);

      const blob = new Blob([relatorioCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const dataHoje = new Date().toISOString().split('T')[0];

      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', `BACKUP_EXCEL_${condoNome}_${dataHoje}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setMensagem({ tipo: 'sucesso', texto: `Planilha Excel (.csv) baixada com sucesso!` });
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao gerar planilha do backup: ' + err.message });
    } finally {
      setExportando(false);
    }
  };

  const copiarSqlDireto = () => {
    const sql = generateMigrationSql();
    navigator.clipboard.writeText(sql);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  return (
    <div className="space-y-3 relative pb-6">
      <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shadow-2xs border border-slate-800">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
            <Settings className="w-3 h-3" /> Módulo 11 — Configurações & Regras
          </span>
          <h3 className="font-bold text-sm sm:text-base mt-0.5">Painel Master & Parametrização</h3>
          <p className="text-[11px] text-slate-300">Feature Flags, Motor de Templates WhatsApp, Agenda, Backup e Central de WhatsApp por Módulo.</p>
        </div>
      </div>

      {mensagem.texto && (
        <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs border ${
          mensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* VISÃO 1: MENU PRINCIPAL LIMPO DE BOTÕES (QUANDO NENHUMA ABA ESPECÍFICA ESTÁ ABERTA) */}
      {abaAtiva === 'menu' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                Menu de Funções & Módulos Administrativos
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique no botão da função desejada para acessar ou gerenciar as opções correspondentes.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setModalPersonalizacaoAberto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                title="Editar o nome em frente ao emblema, tamanho de fontes e rótulos dos módulos"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Personalização Visual & Emblema</span>
              </button>
              <button
                type="button"
                onClick={() => setModalDoctorAberto(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                title="Diagnóstico & Integridade do Banco (Supabase PostgreSQL)"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Diagnóstico Supabase</span>
              </button>
            </div>
          </div>

          {/* Grade de Botões de Menu Limpos: Mantendo Ícone e Nome da Função */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {funcoesMenuConfig.map((funcao, idx) => {
              const Icone = funcao.icone;
              const ehDoctor = funcao.id === 'banco_doctor';
              const ehMigracao = funcao.id === 'migracao_supabase';
              const ehPersonalizacao = funcao.id === 'personalizacao_visual';

              return (
                <button
                  key={`cfg-menu-${funcao.id || idx}`}
                  type="button"
                  onClick={() => {
                    if (ehPersonalizacao) {
                      setModalPersonalizacaoAberto(true);
                    } else if (ehDoctor) {
                      setModalDoctorAberto(true);
                    } else if (ehMigracao) {
                      setModalMigracaoAberto(true);
                    } else {
                      setAbaAtiva(funcao.id);
                    }
                  }}
                  className={`group relative text-left p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${funcao.corBorda}`}
                  title={`Acessar ${funcao.titulo}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${funcao.corBgIcone}`}>
                      <Icone className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 block leading-none mb-1">
                        FUNÇÃO {funcao.numero}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug truncate">
                        {funcao.titulo}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISÃO 2: BARRA DE NAVEGAÇÃO SUPERIOR QUANDO UMA FUNÇÃO ESTIVER SENDO EXECUTADA */
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAbaAtiva('menu')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer group"
                title="Voltar à grade de botões de configuração"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Voltar ao Menu de Configurações</span>
              </button>

              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 hidden sm:inline">Configurações</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  {funcoesMenuConfig.find(f => f.id === abaAtiva)?.titulo || 'Função'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={() => setModalPersonalizacaoAberto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/80 dark:hover:to-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Editar o nome em frente ao emblema, tamanho de fontes e rótulos dos módulos"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Personalização Visual & Emblema</span>
              </button>
              <button
                type="button"
                onClick={() => setModalDoctorAberto(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Diagnóstico & Integridade do Banco de Dados (Supabase)"
              >
                <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Diagnóstico Supabase</span>
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos Compactos entre Funções */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setAbaAtiva('menu')}
              className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 font-bold transition flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700"
            >
              <LayoutGrid className="w-3 h-3" /> Menu Completo
            </button>
            {funcoesMenuConfig.filter(f => f.id !== 'banco_doctor' && f.id !== 'migracao_supabase').map((f, idx) => (
              <button
                key={`cfg-tab-${f.id || idx}`}
                type="button"
                onClick={() => setAbaAtiva(f.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1.5 ${
                  abaAtiva === f.id
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <f.icone className="w-3 h-3" />
                <span>{f.titulo.split(' ')[0]} {f.numero}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ABA NÍVEIS DE ACESSO & PERMISSÕES (RBAC) */}
      {abaAtiva === 'permissoes_rbac' && (
        <div className="space-y-4">
          <GerenciamentoPermissoes
            condominioId={usuarioLogado?.condominio_id}
            onAtualizacao={carregarConfiguracoes}
          />
        </div>
      )}

      {/* ABA 11.1: PARAMETRIZAÇÃO */}
      {abaAtiva === 'flags' && (
        <div className="space-y-6">
          {/* SEÇÃO GLOBAL: SISTEMA DE TEMAS (MODO CLARO & MODO ESCURO) */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                  tema === 'claro'
                    ? 'bg-amber-500/10 text-amber-600 border-amber-200' 
                    : 'bg-slate-900 text-slate-100 border-slate-700'
                }`}>
                  {tema === 'claro' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    Tema Visual da Interface (Modo Claro & Modo Escuro)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Alterne entre o Modo Claro (com fundo claro, textos escuros e alta legibilidade) e o Modo Escuro (tons escuros e conforto visual).
                  </p>
                </div>
              </div>

              {/* Seletor Segmentado */}
              <SeletorTema onAlternar={handleAlternarTema} />
            </div>

            {/* Explicação e Destaques dos Modos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className={`p-3.5 rounded-xl border transition ${
                tema === 'claro'
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 text-slate-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 shadow-xs ring-2 ring-amber-400/30'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1 text-slate-900 dark:text-white">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Modo Claro (Fundo Branco & Alta Legibilidade)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fundo claro com tons de branco e ardósia suave, textos escuros e sólidos, e bordas finas e discretas. Ideal para leitura rápida na guarita sob luz natural.
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border transition ${
                tema === 'escuro'
                  ? 'bg-slate-900 text-white border-slate-700 shadow-xs ring-2 ring-emerald-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1 text-slate-900 dark:text-white">
                  <Moon className="w-4 h-4 text-emerald-400" />
                  <span>Modo Escuro (Turnos Noturnos & Descanso Visual)</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Tema escuro clássico do INFPORT com paleta slate suave. Confortável para os olhos em turnos noturnos e ambientes fechados com luz moderada.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={salvarParametrizacao} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Ativação de Módulos (Feature Flags)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ative ou desative as funções do sistema exclusivas para este condomínio.
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm transition whitespace-nowrap cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>

            {/* Botao de Abertura do Gerenciador Completo de Modulos e Rotulos */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/60 dark:to-emerald-950/60 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Personalização de Títulos e Nomes de Módulos por Condomínio</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Defina quais módulos cada condomínio pode acessar e renomeie o que aparece no menu e botões.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalGerenciadorModulosAberto(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Editar Nomes & Módulos</span>
              </button>
            </div>

            {listaCondominios.length > 1 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl mb-5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Condomínio a Parametrizar:
                  </span>
                </div>
                <select
                  value={condominioConfigId || usuarioLogado?.condominio_id || ''}
                  onChange={(e) => {
                    const novoId = e.target.value;
                    setCondominioConfigId(novoId);
                    carregarConfiguracoes(novoId);
                  }}
                  className="bg-white border-2 border-slate-300 text-xs sm:text-sm font-bold p-2.5 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs w-full sm:w-auto cursor-pointer"
                >
                  {listaCondominios.map((c, idx) => (
                    <option key={c?.id ? `condo-opt-${c.id}-${idx}` : `condo-opt-${idx}`} value={c?.id || ''} className="bg-white text-slate-900 font-bold py-1.5">🏢 {c?.nome || 'Condomínio'}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modulosVisual.map((modulo, idx) => {
                const Icone = modulo.icon;
                const isAtivo = Boolean(config[modulo.key]);
                return (
                  <div 
                    key={`modulo-flag-${modulo.key || idx}`} 
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col justify-between h-full ${
                      isAtivo 
                        ? 'bg-emerald-50/50 border-emerald-500 shadow-sm' 
                        : 'bg-slate-50 border-slate-200 opacity-75 grayscale-[0.3]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg ${isAtivo ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                        <Icone className="w-5 h-5" />
                      </div>
                      
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={(e) => setConfig({ ...config, [modulo.key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isAtivo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          Módulo {modulo.moduloNum}
                        </span>
                        <span className={`text-[11px] font-bold ${isAtivo ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isAtivo ? '● Ativo' : '○ Desativado'}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 mt-1 leading-tight">
                        {modulo.titulo.replace(/^Módulo \d+ - /, '')}
                      </h5>
                      <p className="text-xs text-slate-500 mt-1">{modulo.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </div>
      )}

      {/* ABA 11.2: TEMPLATES WHATSAPP */}
      {abaAtiva === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Editor de Templates do WhatsApp
            </h4>

            <form onSubmit={salvarTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Evento Desencadeador</label>
                  <select
                    value={templateSelecionado.codigo_evento}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, codigo_evento: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="ENCOMENDA_CHEGOU">ENCOMENDA_CHEGOU</option>
                    <option value="CUSTODIA_GUARDADA">CUSTODIA_GUARDADA</option>
                    <option value="CHAVE_ATRASADA">CHAVE_ATRASADA</option>
                    <option value="CHAMADO_ABERTO">CHAMADO_ABERTO</option>
                    <option value="RONDA_AUSENTE">RONDA_AUSENTE</option>
                    <option value="PRESTADOR_ENTROU">PRESTADOR_ENTROU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canal de Destino</label>
                  <select
                    value={templateSelecionado.canal_destino}
                    onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, canal_destino: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Morador Direct">WhatsApp Morador Direct</option>
                    <option value="Grupo Gestão">Grupo Gestão / Síndico</option>
                    <option value="WhatsApp Supervisor">WhatsApp Supervisor INFPORT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Corpo do Texto do Template
                </label>
                <textarea
                  rows={4}
                  value={templateSelecionado.corpo_texto}
                  onChange={(e) => setTemplateSelecionado({ ...templateSelecionado, corpo_texto: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={testarTemplate}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition w-full sm:w-auto justify-center"
                >
                  <Send className="w-3.5 h-3.5" /> Testar Envio no WhatsApp
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Save className="w-4 h-4" /> Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 11.3: AGENDA & ESCALA */}
      {abaAtiva === 'emergencia' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> Cadastrar Novo Contato de Emergência
            </h4>

            <form onSubmit={adicionarContato} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoria</label>
                  <select
                    value={novoContato.categoria}
                    onChange={(e) => setNovoContato({ ...novoContato, categoria: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  >
                    <option value="Órgão Público">Órgão Público (Polícia/Bombeiro)</option>
                    <option value="Manutenção / Concessionária">Manutenção / Concessionária</option>
                    <option value="Supervisão / Síndico">Supervisão / Síndico</option>
                    <option value="Emergência Médica">Emergência Médica / SAMU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome / Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Polícia Militar (190) ou Zelador"
                    value={novoContato.nome_descricao}
                    onChange={(e) => setNovoContato({ ...novoContato, nome_descricao: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 190 ou (11) 99999-9999"
                    value={novoContato.telefone_principal}
                    onChange={(e) => setNovoContato({ ...novoContato, telefone_principal: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 11999999999"
                    value={novoContato.telefone_whatsapp}
                    onChange={(e) => setNovoContato({ ...novoContato, telefone_whatsapp: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoContato.exibir_menu_flutuante}
                    onChange={(e) => setNovoContato({ ...novoContato, exibir_menu_flutuante: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>Exibir no menu rápido da Guarita</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Contato
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b pb-3 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" /> Agenda de Contatos Cadastrados
            </h4>

            {contatos.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum contato de emergência cadastrado para este condomínio.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contatos.map((c, idx) => (
                  <div key={c?.id ? `contato-emergencia-${c.id}-${idx}` : `contato-emergencia-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {c.categoria}
                      </span>
                      <h5 className="font-bold text-xs text-slate-900">{c.nome_descricao}</h5>
                      <div className="text-xs text-slate-600 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.telefone_principal}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {(c.telefone_whatsapp || c.telefone_principal) && (
                        <button
                          type="button"
                          onClick={() => dispararPanico(c)}
                          title="Disparar Alerta / Pânico no WhatsApp"
                          className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-lg transition shadow-sm flex items-center gap-1 text-xs font-bold"
                        >
                          <ShieldAlert className="w-4 h-4" />
                          <span className="hidden sm:inline">Pânico</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => excluirContato(c.id)}
                        title="Excluir Contato"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
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
      )}

      {/* ABA 11.4: BACKUP PARA EXCEL */}
      {abaAtiva === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Exportação de Backup para Excel (.csv)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Gere um relatório completo em formato compatível com Excel contendo todas as tabelas de dados do sistema INFPORT 1.0.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Selecione o Condomínio para Exportação
                </label>
                <select
                  value={condominioBackupId}
                  onChange={(e) => setCondominioBackupId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                >
                  <option value="TODOS">🌐 VISÃO GLOBAL (Todos os Condomínios)</option>
                  {listaCondominios.map((condo, idx) => (
                    <option key={condo?.id ? `condo-backup-${condo.id}-${idx}` : `condo-backup-${idx}`} value={condo?.id || ''}>
                      🏢 {condo?.nome || 'Condomínio'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={gerarBackupExcelCondominio}
                disabled={exportando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-2 shadow-sm transition h-[42px]"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportando ? 'Exportando Dados...' : 'Baixar Planilha Excel (.csv)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 11.5: CENTRAL DE NOTIFICAÇÕES WHATSAPP POR MÓDULO */}
      {abaAtiva === 'whats_modulos' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600" /> Central de Notificações WhatsApp & Grupos por Módulo
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Configure o número ou link de grupo do WhatsApp para receber automaticamente os relatórios, alertas e ocorrências de cada setor do condomínio.
                </p>
              </div>

              <button
                type="button"
                onClick={salvarConfigWhatsModulos}
                disabled={salvandoWhats}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 transition shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {salvandoWhats ? 'Salvando...' : 'Salvar Todos os Canais'}
              </button>
            </div>

            {/* Grid dos Módulos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Passagem de Posto */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                      <ArrowRightLeft className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Passagem de Posto (Troca de Turno)
                      </strong>
                      <span className="text-[10px] text-slate-500">Relatório consolidado de troca de plantão</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.passagem_posto.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        passagem_posto: { ...prev.passagem_posto, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp (com DDD) ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.passagem_posto.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        passagem_posto: { ...prev.passagem_posto, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.passagem_posto.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        passagem_posto: { ...prev.passagem_posto, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Passagem de Posto / Diretoria"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.passagem_posto.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          passagem_posto: { ...prev.passagem_posto, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Abrir automaticamente ao concluir</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('passagem_posto', 'Passagem de Posto')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Rondas Preventivas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Rondas Preventivas & Atrasos
                      </strong>
                      <span className="text-[10px] text-slate-500">Alertas de ronda atrasada e relatórios</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.rondas.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        rondas: { ...prev.rondas, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp (com DDD) ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.rondas.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        rondas: { ...prev.rondas, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.rondas.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        rondas: { ...prev.rondas, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Operacional de Rondas"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.rondas.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          rondas: { ...prev.rondas, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar alertas críticos</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('rondas', 'Rondas Preventivas')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Manutenções & Ordens de Serviço */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                      <Wrench className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Manutenções Prediais & OS
                      </strong>
                      <span className="text-[10px] text-slate-500">Abertura de chamados e fotos de reparo</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.manutencoes.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        manutencoes: { ...prev.manutencoes, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.manutencoes.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        manutencoes: { ...prev.manutencoes, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.manutencoes.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        manutencoes: { ...prev.manutencoes, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Manutenção Predial / Zeladoria"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.manutencoes.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          manutencoes: { ...prev.manutencoes, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar abertura de OS</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('manutencoes', 'Manutenções')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Lotes de RE & Encomendas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                      <Package className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Lotes de RE & Encomendas
                      </strong>
                      <span className="text-[10px] text-slate-500">Notificação de lotes de entregadores e triagem</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.lotes_re.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        lotes_re: { ...prev.lotes_re, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.lotes_re.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        lotes_re: { ...prev.lotes_re, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.lotes_re.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        lotes_re: { ...prev.lotes_re, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Encomendas / Logística"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.lotes_re.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          lotes_re: { ...prev.lotes_re, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar lotes recebidos</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('lotes_re', 'Lotes de RE')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Quadro de Chaves Extraviadas & Atrasadas */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                      <Key className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Chaves Extraviadas & Limite Excedido
                      </strong>
                      <span className="text-[10px] text-slate-500">Alertas de chaves fora do prazo de devolução</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.chaves_extraviadas.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        chaves_extraviadas: { ...prev.chaves_extraviadas, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.chaves_extraviadas.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        chaves_extraviadas: { ...prev.chaves_extraviadas, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.chaves_extraviadas.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        chaves_extraviadas: { ...prev.chaves_extraviadas, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Segurança Patrimonial / Chaves"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.chaves_extraviadas.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          chaves_extraviadas: { ...prev.chaves_extraviadas, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar atraso automaticamente</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('chaves_extraviadas', 'Chaves Extraviadas')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. Livro de Ocorrências */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Livro de Ocorrências
                      </strong>
                      <span className="text-[10px] text-slate-500">Notificações de ocorrências abertas na guarita</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.ocorrencias.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        ocorrencias: { ...prev.ocorrencias, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.ocorrencias.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        ocorrencias: { ...prev.ocorrencias, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.ocorrencias.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        ocorrencias: { ...prev.ocorrencias, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Grupo Síndico & Conselho"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.ocorrencias.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          ocorrencias: { ...prev.ocorrencias, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar novas ocorrências</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('ocorrencias', 'Ocorrências')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 7. Prestadores & Obras (Permanência Estourada) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                      <HardHat className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Autorizados & Prestadores (Tempo Excedido)
                      </strong>
                      <span className="text-[10px] text-slate-500">Alertas de prestadores com limite de horas estourado</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.prestadores_obras.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        prestadores_obras: { ...prev.prestadores_obras, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp ou Link do Grupo:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.prestadores_obras.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        prestadores_obras: { ...prev.prestadores_obras, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11988887777 ou https://chat.whatsapp.com/..."
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Identificação do Destinatário:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.prestadores_obras.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        prestadores_obras: { ...prev.prestadores_obras, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Fiscalização de Obras / Administração"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsModulos.prestadores_obras.notificar_automatico}
                        onChange={(e) => setWhatsModulos(prev => ({
                          ...prev,
                          prestadores_obras: { ...prev.prestadores_obras, notificar_automatico: e.target.checked }
                        }))}
                        className="rounded text-emerald-600"
                      />
                      <span>Notificar permanência estourada</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('prestadores_obras', 'Prestadores & Obras')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>

              {/* 8. WhatsApp Geral do Síndico / Gestão */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                      <ShieldAlert className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-xs text-slate-900 block font-black uppercase">
                        Síndico Geral / Gestão Condominial
                      </strong>
                      <span className="text-[10px] text-slate-500">Contato direto do síndico para notificações especiais</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsModulos.geral_sindico.ativo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        geral_sindico: { ...prev.geral_sindico, ativo: e.target.checked }
                      }))}
                      className="rounded text-emerald-600"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Número WhatsApp Direto do Síndico:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.geral_sindico.telefone_ou_grupo}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        geral_sindico: { ...prev.geral_sindico, telefone_ou_grupo: e.target.value }
                      }))}
                      placeholder="Ex: 11999998888"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Nome / Descrição:
                    </label>
                    <input
                      type="text"
                      value={whatsModulos.geral_sindico.nome_destinatario}
                      onChange={(e) => setWhatsModulos(prev => ({
                        ...prev,
                        geral_sindico: { ...prev.geral_sindico, nome_destinatario: e.target.value }
                      }))}
                      placeholder="Ex: Dr. Carlos (Síndico Morador)"
                      className="w-full bg-white p-2.5 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">Canal direto com a administração</span>

                    <button
                      type="button"
                      onClick={() => testarWhatsModulo('geral_sindico', 'Síndico Geral')}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" /> Testar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={salvarConfigWhatsModulos}
                disabled={salvandoWhats}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs uppercase flex items-center gap-2 transition shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {salvandoWhats ? 'Salvando Configurações...' : 'Salvar Todos os Canais WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 11.6: LOCAIS DE TRIAGEM & ARMAZENAMENTO (TABELA) */}
      {abaAtiva === 'locais_triagem' && (
        <div className="space-y-6">
          {/* Card de Apresentação e KPIs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit mb-1">
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" /> Tabela de Triagem & Guarda de Pacotes
                </span>
                <h4 className="font-bold text-slate-900 text-base">
                  Locais Físicos de Armazenamento na Portaria
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cadastre prateleiras, gavetas e armários. O porteiro seleciona o local na triagem (Módulo 02) e o sistema alerta exatamente onde o item está na hora da entrega e no WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={abrirModalNovoLocal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-sm transition whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Novo Local de Guarda
              </button>
            </div>

            {/* Métricas Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total de Locais</span>
                  <span className="text-lg font-black text-slate-800">{locaisArmazenamento.length}</span>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Locais Ativos</span>
                  <span className="text-lg font-black text-emerald-800">
                    {locaisArmazenamento.filter(l => l.ativo).length}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Categorias</span>
                  <span className="text-lg font-black text-slate-800">
                    {new Set(locaisArmazenamento.map(l => l.categoria)).size}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de Filtro */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={filtroLocais}
                onChange={(e) => setFiltroLocais(e.target.value)}
                placeholder="Filtrar por código, nome ou categoria (ex: PRAT, Gaveta, Armário)..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* TABELA DE LOCAIS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Código / Tag</th>
                    <th className="py-3.5 px-4 font-bold">Local Físico & Descrição</th>
                    <th className="py-3.5 px-4 font-bold">Categoria</th>
                    <th className="py-3.5 px-4 font-bold">Capacidade Estimada</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locaisArmazenamento
                    .filter(l => {
                      if (!filtroLocais.trim()) return true;
                      const term = filtroLocais.toLowerCase();
                      return (
                        l.codigo.toLowerCase().includes(term) ||
                        l.nome.toLowerCase().includes(term) ||
                        l.categoria.toLowerCase().includes(term) ||
                        (l.observacao && l.observacao.toLowerCase().includes(term))
                      );
                    })
                    .map((local, idx) => (
                      <tr key={local?.id ? `local-guarda-${local.id}-${idx}` : `local-guarda-${local?.codigo || idx}`} className={`hover:bg-slate-50/80 transition ${!local.ativo ? 'opacity-60 bg-slate-50/40' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold bg-slate-100 border border-slate-200 text-slate-800 px-2 py-1 rounded text-[11px]">
                            {local.codigo}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 text-xs">{local.nome}</p>
                          {local.observacao && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{local.observacao}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {local.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-600 text-[11px]">
                            {local.capacidade || 'Não especificada'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleStatusLocal(local.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition ${
                              local.ativo 
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="Clique para alternar status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${local.ativo ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                            {local.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirEdicaoLocal(local)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Editar Local"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirLocalArmazenamento(local)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Excluir Local"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {locaisArmazenamento.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum local cadastrado na tabela. Clique em "+ Novo Local de Guarda" para criar.
              </div>
            )}
          </div>

          {/* MODAL DE CADASTRO / EDIÇÃO DE LOCAL */}
          {modalLocalAberto && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-emerald-600" />
                    {editandoLocalId ? 'Editar Local de Guarda' : 'Novo Local de Guarda na Portaria'}
                  </h3>
                  <button onClick={() => setModalLocalAberto(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={salvarLocalArmazenamento} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Código / Sigla *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: PRAT-A1"
                        value={formLocal.codigo}
                        onChange={(e) => setFormLocal({ ...formLocal, codigo: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Categoria *
                      </label>
                      <select
                        value={formLocal.categoria}
                        onChange={(e) => setFormLocal({ ...formLocal, categoria: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                      >
                        <option value="Prateleira">Prateleira</option>
                        <option value="Armário">Armário</option>
                        <option value="Gaveta">Gaveta</option>
                        <option value="Chão / Palete">Chão / Palete (Volumosos)</option>
                        <option value="Bancada">Bancada de Triagem</option>
                        <option value="Locker">Locker / Inteligente</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nome / Identificação Física *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Prateleira Superior A1 - Caixas Pequenas"
                      value={formLocal.nome}
                      onChange={(e) => setFormLocal({ ...formLocal, nome: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Capacidade Estimada (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Até 25 pacotes pequenos"
                      value={formLocal.capacidade}
                      onChange={(e) => setFormLocal({ ...formLocal, capacidade: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Observação / Localização no Posto (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Prateleira fixada à esquerda da porta de entrada da guarita."
                      value={formLocal.observacao}
                      onChange={(e) => setFormLocal({ ...formLocal, observacao: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formLocal.ativo}
                        onChange={(e) => setFormLocal({ ...formLocal, ativo: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                      <span>Local Ativo para Triagem</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalLocalAberto(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                      >
                        Salvar Local
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE LOCAL */}
          {localParaExcluir && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Excluir Local de Guarda?</h3>
                    <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p><strong>Nome:</strong> {localParaExcluir.nome}</p>
                  <p><strong>Código / Tag:</strong> <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">{localParaExcluir.codigo}</span></p>
                  <p><strong>Categoria:</strong> {localParaExcluir.categoria}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setLocalParaExcluir(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarExclusaoLocal}
                    className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Sim, Excluir Local
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 11.7: SETORES DE RONDA (GESTÃO ADMINISTRATIVA E CHECKLISTS) */}
      {abaAtiva === 'setores_ronda' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> 11.7 Gestão dos Setores de Ronda Patrimonial & Checklists
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Configure os setores aos quais os pontos de ronda pertencem e personalize a lista de itens inspecionados em cada ronda.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalSetoresRondaAberto(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Gerenciar Setores
                </button>
              </div>
            </div>

            {/* KPIs dos Setores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Setores Ativos</span>
                <strong className="text-xl font-black text-slate-900 mt-1 block">{setoresRonda.length}</strong>
                <span className="text-[10px] text-slate-500">Divisões patrimoniais</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Itens de Inspeção</span>
                <strong className="text-xl font-black text-blue-700 mt-1 block">
                  {setoresRonda.reduce((acc, s) => acc + (s.itens?.length || 0), 0)}
                </strong>
                <span className="text-[10px] text-slate-500">Checklists cadastrados</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Pontos Vinculados</span>
                <strong className="text-xl font-black text-emerald-700 mt-1 block">
                  {pontosRondaLista.length}
                </strong>
                <span className="text-[10px] text-slate-500">Tags/Pontos nos setores</span>
              </div>
            </div>

            {/* Tabela Resumo dos Setores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-blue-600" /> Setores Configurados ({setoresRonda.length})
                </h5>
                <button
                  type="button"
                  onClick={() => setModalSetoresRondaAberto(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Abrir Painel Completo de Edição &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {setoresRonda.map((s, idx) => {
                  const pts = pontosRondaLista.filter(p => p.setor_id === s.id || p.setor_id === s.titulo);
                  return (
                    <div key={s?.id ? `setor-ronda-${s.id}-${idx}` : `setor-ronda-${s?.codigo || idx}`} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                          {s.codigo || s.id}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {s.itens?.length || 0} itens
                        </span>
                      </div>
                      <h6 className="font-bold text-slate-900 text-xs">{s.titulo}</h6>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>{pts.length} ponto(s) cadastrado(s)</span>
                        <button
                          type="button"
                          onClick={() => setModalSetoresRondaAberto(true)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Configurar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'modelos_documentos' && (
        <AbaModelosDocumentosOCR />
      )}

      {/* MODAL GERENCIAR SETORES */}
      <ModalGerenciarSetores
        aberto={modalSetoresRondaAberto}
        onFechar={() => setModalSetoresRondaAberto(false)}
        condominioId={usuarioLogado?.condominio_id}
        pontosCadastrados={pontosRondaLista}
        onSetoresAlterados={(novos) => setSetoresRonda(novos)}
      />

      {/* MODAL SUPABASE DOCTOR */}
      <SupabaseDoctorModal 
        isOpen={modalDoctorAberto} 
        onClose={() => setModalDoctorAberto(false)} 
        onAbrirMigrador={() => setModalMigracaoAberto(true)}
      />

      {/* MODAL MIGRACÃO SUPABASE (v1) -> PORTTOHUB v2.0 */}
      <ModalMigracaoSupabase
        aberto={modalMigracaoAberto}
        onFechar={() => setModalMigracaoAberto(false)}
        onMigracaoConcluida={() => {
          carregarCondominios();
          const target = condominioConfigId || usuarioLogado?.condominio_id;
          if (target) carregarConfiguracoes(target);
        }}
      />

      {/* MODAL PERSONALIZAÇÃO VISUAL, EMBLEMA & FONTES */}
      <ModalCustomizacaoVisual
        aberto={modalPersonalizacaoAberto}
        onFechar={() => setModalPersonalizacaoAberto(false)}
        condominioAtualId={condominioConfigId || usuarioLogado?.condominio_id || "global"}
        listaCondominios={listaCondominios}
      />
      {/* Modal de Gerenciamento e Personalizacao de Modulos por Condominio */}
      <ModalGerenciadorModulosCondominio
        aberto={modalGerenciadorModulosAberto}
        onFechar={() => setModalGerenciadorModulosAberto(false)}
        listaCondominios={listaCondominios}
        condominioAtivoId={condominioConfigId || usuarioLogado?.condominio_id || ""}
        onSalvoComSucesso={(condoId) => {
          carregarConfiguracoes(condoId);
        }}
      />
    </div>
  );
}
