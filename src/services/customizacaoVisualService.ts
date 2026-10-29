/**
 * Serviço Avançado de Personalização Visual, Emblema, Fontes e Temas Globais (PorttoHub)
 * Permite controle total sobre:
 * - Emblema da tela principal (Upload, presets vetoriais, brilho, bordas, formatos)
 * - Ícone do Aplicativo (PWA / Favicon / WebApp)
 * - Tipografia Dinâmica (Fontes personalizadas, escala de acessibilidade, pesos)
 * - Temas Globais & Paleta de Cores (Dark, Light, Cyber, Esmeralda, Dourado, Contraste)
 * - Customização de Menus (Nomes, layouts, ícones vetoriais nativos, descrições, visibilidade)
 * - Presets salvos para alternar instantaneamente entre estilos
 * - Suporte Multi-Condomínio (Global para todos ou diferenciado por condomínio)
 * - Sincronização em tempo real e injeção dinâmica no DOM
 */
import { useState, useEffect } from "react";
import React from "react";
import defaultEmblemImg from '../assets/images/infport_emblem_1790505567327.jpg';
import {
  Package,
  PackageCheck,
  UserCheck,
  ClipboardList,
  Key,
  Wrench,
  QrCode,
  BookOpen,
  Repeat,
  Layers,
  Database,
  History,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Users,
  Bell,
  Camera,
  Car,
  Home,
  Building,
  Building2,
  FileText,
  Lock,
  Unlock,
  Sparkles,
  Cpu,
  Fingerprint,
  Radio,
  Sliders,
  Phone,
  PhoneCall,
  HardHat,
  Share2,
  Boxes,
  MapPin,
  Scan,
  Calendar,
  Clock,
  Compass,
  Zap,
  Activity,
  Award,
  Shield,
  Truck,
  FileSpreadsheet,
  Eye,
  Archive,
  CheckSquare,
  Globe,
  Search,
  HelpCircle,
  Send,
  SlidersHorizontal,
  Flame,
  BadgeCheck,
  Smile
} from "lucide-react";

// Dicionário nativo de ícones vetoriais integrados para escolha nos menus
export const DICIONARIO_ICONES_VETORIAIS: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  PackageCheck,
  UserCheck,
  ClipboardList,
  Key,
  Wrench,
  QrCode,
  BookOpen,
  Repeat,
  Layers,
  Database,
  History,
  ShieldAlert,
  ShieldCheck,
  Settings,
  Users,
  Bell,
  Camera,
  Car,
  Home,
  Building,
  Building2,
  FileText,
  Lock,
  Unlock,
  Sparkles,
  Cpu,
  Fingerprint,
  Radio,
  Sliders,
  SlidersHorizontal,
  Phone,
  PhoneCall,
  HardHat,
  Share2,
  Boxes,
  MapPin,
  Scan,
  Calendar,
  Clock,
  Compass,
  Zap,
  Activity,
  Award,
  Shield,
  Truck,
  FileSpreadsheet,
  Eye,
  Archive,
  CheckSquare,
  Globe,
  Search,
  HelpCircle,
  Send,
  Flame,
  BadgeCheck,
  Smile
};

// Obter ícone dinâmico pelo nome da chave com fallback gracioso
export function obterIconeModulo(
  nomeIcone?: string,
  IconeFallback: React.ComponentType<{ className?: string }> = Layers
): React.ComponentType<{ className?: string }> {
  if (!nomeIcone) return IconeFallback;
  const encontrado = DICIONARIO_ICONES_VETORIAIS[nomeIcone];
  return encontrado || IconeFallback;
}

export type TipoFamiliaFonte =
  | 'Inter'
  | 'Roboto'
  | 'Outfit'
  | 'Plus Jakarta Sans'
  | 'Montserrat'
  | 'Poppins'
  | 'JetBrains Mono'
  | 'Sistema Padrão';

export type TipoEscalaFonte = 'compacto' | 'normal' | 'confortavel' | 'acessibilidade';
export type TipoPesoFonte = 'normal' | 'medio' | 'semibold' | 'negrito';

export type TipoTemaGlobal =
  | 'porttohub_dark'
  | 'cyber_black'
  | 'clean_light'
  | 'emerald_security'
  | 'gold_prestige'
  | 'high_contrast'
  | 'custom';

export type TipoRaioBorda = 'reto' | 'suave' | 'moderno' | 'pill';
export type TipoLayoutMenu = 'sidebar_padrao' | 'sidebar_compacta' | 'topo_horizontal' | 'grid_icones';
export type TipoTamanhoEmblema = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type TipoBordaEmblema = 'anel_dourado' | 'neon' | 'circulo_clean' | 'sem_borda';
export type TipoFormatoEmblema = 'circular' | 'arredondado' | 'quadrado';

export interface PresetEstiloVisual {
  id: string;
  nome: string;
  descricao?: string;
  dataCriacao: string;
  autor?: string;
  dados: Partial<CustomizacaoVisual>;
}

export interface CustomizacaoVisual {
  // Identidade Geral & Topo
  nomeAplicacao: string;
  tamanhoFonteNome: "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  subtituloAplicacao: string;
  tamanhoFonteSubtitulo: "xs" | "sm" | "base";
  exibirBadgeOnline: boolean;
  exibirBadgeEnterprise: boolean;

  // Emblema da Tela Principal & Topo
  emblemaUrl: string;
  emblemaPreset: string; // 'infport' | 'escudo_azul' | 'aguia_dourada' | 'moderno_minimal' | 'monograma_torre' | 'personalizado'
  emblemaTamanho: TipoTamanhoEmblema;
  emblemaBrilho: boolean;
  emblemaCorBrilho: string; // '#f59e0b', '#3b82f6', '#10b981', '#a855f7'
  emblemaEstiloBorda: TipoBordaEmblema;
  emblemaFormato: TipoFormatoEmblema;

  // Ícone do Aplicativo (Favicon, PWA & Aba)
  appIconUrl: string;
  appIconPreset: string;
  appIconTitulo: string;

  // Tipografia Dinâmica do Sistema
  familiaFonte: TipoFamiliaFonte;
  escalaFonteGlobal: TipoEscalaFonte;
  pesoFonte: TipoPesoFonte;

  // Temas Globais & Cores
  temaGlobalId: TipoTemaGlobal;
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundoHeader: string;
  corFundoSidebar: string;
  raioBorda: TipoRaioBorda;
  layoutMenu: TipoLayoutMenu;

  // Personalização Módulo a Módulo
  rotulosModulos: Record<string, string>;
  iconesModulos: Record<string, string>;
  descricoesModulos: Record<string, string>;
  coresModulos: Record<string, string>;
  modulosOcultos: string[];

  // Compatibilidade com menus
  tamanhoFonteMenu: "compacto" | "normal" | "amplo";
}

export const MAPA_ALIASES_MODULOS: Record<string, string[]> = {
  cadastros: ['cadastros', 'cadastros_base', 'mod01_cadastros_base', '01'],
  encomendas: ['encomendas', 'mod02_gestao_encomendas', 'lotes_re', '02'],
  custodia: ['custodia', 'custodia_itens', 'mod03_custodia_itens', '03'],
  materiais: ['materiais', 'materiais_posto', 'mod04_materiais_posto', '04'],
  chaves: ['chaves', 'claviculario', 'mod05_quadro_chaves', '05'],
  manutencao: ['manutencao', 'gestao_manutencao', 'manutencoes', 'mod06_gestao_manutencao', '06'],
  rondas: ['rondas', 'gestao_ronda', 'mod07_gestao_ronda', '07'],
  ocorrencias: ['ocorrencias', 'livro_ocorrencias', 'mod08_livro_ocorrencias', '08'],
  passagem: ['passagem', 'passagem_posto', 'mod09_passagem_posto', '09'],
  passagem_posto: ['passagem', 'passagem_posto', 'mod09_passagem_posto', '09'],
  prestadores: ['prestadores', 'autorizados', 'prestadores_obras', 'mod10_prestadores_servico', '10'],
  autorizados: ['prestadores', 'autorizados', 'prestadores_obras', 'mod10_prestadores_servico', '10'],
  bancada: ['bancada', 'bancada_conferencia', 'mod11_bancada_conferencia', '11'],
  historico: ['historico', 'historico_absoluto', 'mod12_historico_absoluto', '12'],
  historico_absoluto: ['historico', 'historico_absoluto', 'mod12_historico_absoluto', '12'],
  sindico: ['sindico', 'painel_sindico', 'portal_sindico', 'mod_portal_sindico', '13'],
  painel_sindico: ['sindico', 'painel_sindico', 'portal_sindico', 'mod_portal_sindico', '13'],
  configuracoes: ['configuracoes', '14'],
  guia_operacional: ['guia_operacional', 'manual', 'mod_guia_operacional', '15']
};

/**
 * Verifica se um módulo está configurado como oculto, checando seu id e quaisquer aliases conhecidos.
 */
export function isModuloOculto(id: string, modulosOcultos?: string[]): boolean {
  if (!modulosOcultos || !Array.isArray(modulosOcultos) || modulosOcultos.length === 0) return false;
  const aliases = MAPA_ALIASES_MODULOS[id] || [id];
  return aliases.some(alias => modulosOcultos.includes(alias));
}

/**
 * Obtém o rótulo/nome configurado de um módulo considerando aliases e fallbacks.
 */
export function obterRotuloModulo(id: string, rotulos?: Record<string, string>, fallback?: string): string {
  if (rotulos) {
    if (rotulos[id]) return rotulos[id];
    const aliases = MAPA_ALIASES_MODULOS[id] || [];
    for (const al of aliases) {
      if (rotulos[al]) return rotulos[al];
    }
  }
  return fallback || MODULOS_PADRAO_ROTULOS[id] || id;
}

/**
 * Obtém a descrição configurada de um módulo considerando aliases e fallbacks.
 */
export function obterDescricaoModulo(id: string, descricoes?: Record<string, string>, fallback?: string): string {
  if (descricoes) {
    if (descricoes[id]) return descricoes[id];
    const aliases = MAPA_ALIASES_MODULOS[id] || [];
    for (const al of aliases) {
      if (descricoes[al]) return descricoes[al];
    }
  }
  return fallback || MODULOS_PADRAO_DESCRICOES[id] || '';
}

/**
 * Obtém o ícone de um módulo considerando o dicionário de customização e aliases.
 */
export function obterIconeModuloDinamico(
  id: string, 
  icones?: Record<string, string>, 
  IconeFallback: React.ComponentType<{ className?: string }> = Layers
): React.ComponentType<{ className?: string }> {
  if (icones) {
    if (icones[id]) return obterIconeModulo(icones[id], IconeFallback);
    const aliases = MAPA_ALIASES_MODULOS[id] || [];
    for (const al of aliases) {
      if (icones[al]) return obterIconeModulo(icones[al], IconeFallback);
    }
  }
  const nomePadrao = MODULOS_PADRAO_ICONES[id];
  return obterIconeModulo(nomePadrao, IconeFallback);
}

export const MODULOS_PADRAO_ROTULOS: Record<string, string> = {
  cadastros: "Cadastros Base",
  encomendas: "Encomendas",
  custodia: "Custódia de Itens",
  materiais: "Materiais & Inventário",
  chaves: "Claviculário / Chaves",
  manutencao: "Gestão de Manutenção",
  rondas: "Rondas Patrimoniais",
  ocorrencias: "Livro de Ocorrências",
  passagem: "Passagem de Posto",
  passagem_posto: "Passagem de Posto",
  prestadores: "Autorizados & Obras",
  autorizados: "Autorizados & Obras",
  bancada: "Bancada de Portaria",
  historico: "Histórico Absoluto",
  historico_absoluto: "Histórico Absoluto",
  sindico: "Portal do Síndico",
  painel_sindico: "Portal do Síndico",
  configuracoes: "Configurações",
  guia_operacional: "Manual & Guia",
  reservas: "Reserva de Áreas",
  areas_comuns: "Reserva de Áreas",
  controle_acesso: "Controle de Acesso",
  acesso: "Controle de Acesso"
};

export const MODULOS_PADRAO_ICONES: Record<string, string> = {
  cadastros: "Users",
  encomendas: "Package",
  custodia: "PackageCheck",
  materiais: "ClipboardList",
  chaves: "Key",
  manutencao: "Wrench",
  rondas: "QrCode",
  ocorrencias: "BookOpen",
  passagem: "Repeat",
  passagem_posto: "Repeat",
  prestadores: "UserCheck",
  autorizados: "UserCheck",
  bancada: "Layers",
  historico: "History",
  historico_absoluto: "History",
  sindico: "ShieldCheck",
  painel_sindico: "ShieldCheck",
  configuracoes: "Settings",
  guia_operacional: "BookOpen",
  reservas: "Calendar",
  areas_comuns: "Calendar",
  controle_acesso: "Scan",
  acesso: "Scan"
};

export const MODULOS_PADRAO_DESCRICOES: Record<string, string> = {
  cadastros: "Moradores, veículos, unidades e operadores autorizados",
  encomendas: "Triagem com IA, leitura OCR de etiquetas e aviso WhatsApp",
  custodia: "Guarda temporária de pertences e achados e perdidos",
  materiais: "Inventário de equipamentos, ferramentas e materiais de posto",
  chaves: "Controle de claviculário digital com assinatura do recebedor",
  manutencao: "Registro de chamados prediais e ordens de serviço (O.S.)",
  rondas: "Checkpoints com tags físicas NFC e QR Code com validação de horário",
  ocorrencias: "Diário de bordo e livro negro digital com registro fotográfico",
  passagem: "Checklist inviolável de troca de plantão e pendências da guarita",
  passagem_posto: "Checklist inviolável de troca de plantão e pendências da guarita",
  prestadores: "Controle de obras, prestadores de serviço e crachás de acesso",
  autorizados: "Controle de obras, prestadores de serviço e crachás de acesso",
  bancada: "Atendimento veloz, triagem e conferência de acessos em tempo real",
  historico: "Auditoria cronológica unificada de todas as movimentações",
  historico_absoluto: "Auditoria cronológica unificada de todas as movimentações",
  sindico: "Dashboard executivo com métricas e conformidade condominial",
  painel_sindico: "Dashboard executivo com métricas e conformidade condominial",
  configuracoes: "Parâmetros operacionais, permissões e personalização de módulos",
  guia_operacional: "Instruções e manual de todas as funções da guarita (desative quando a equipe já estiver treinada)",
  reservas: "Agendamento de salão de festas, churrasqueiras, convidados e termos",
  areas_comuns: "Agendamento de salão de festas, churrasqueiras, convidados e termos",
  controle_acesso: "Liberação de pedestres e veículos, passes QR Code e portaria",
  acesso: "Liberação de pedestres e veículos, passes QR Code e portaria"
};

export const CUSTOMIZACAO_PADRAO: CustomizacaoVisual = {
  nomeAplicacao: "PorttoHub",
  tamanhoFonteNome: "xl",
  subtituloAplicacao: "",
  tamanhoFonteSubtitulo: "xs",
  exibirBadgeOnline: true,
  exibirBadgeEnterprise: true,

  emblemaUrl: defaultEmblemImg || "/emblema-infport.png",
  emblemaPreset: "infport",
  emblemaTamanho: "md",
  emblemaBrilho: true,
  emblemaCorBrilho: "#f59e0b",
  emblemaEstiloBorda: "anel_dourado",
  emblemaFormato: "circular",

  appIconUrl: "/pwa-192x192.png",
  appIconPreset: "padrao_porttohub",
  appIconTitulo: "PorttoHub - Portaria Inteligente",

  familiaFonte: "Inter",
  escalaFonteGlobal: "normal",
  pesoFonte: "normal",

  temaGlobalId: "porttohub_dark",
  corPrimaria: "#10b981",
  corSecundaria: "#3b82f6",
  corDestaque: "#f59e0b",
  corFundoHeader: "#0f172a",
  corFundoSidebar: "#0b1329",
  raioBorda: "moderno",
  layoutMenu: "sidebar_padrao",

  rotulosModulos: { ...MODULOS_PADRAO_ROTULOS },
  iconesModulos: { ...MODULOS_PADRAO_ICONES },
  descricoesModulos: { ...MODULOS_PADRAO_DESCRICOES },
  coresModulos: {},
  modulosOcultos: [],

  tamanhoFonteMenu: "normal"
};

// Galeria de Emblemas Pré-definidos de Alta Resolução / Vetoriais
export const PRESETS_EMBLEMAS = [
  {
    id: 'infport',
    nome: 'Águia Dourada Oficial (INFPORT)',
    url: defaultEmblemImg || '/emblema-infport.png',
    descricao: 'Brasão clássico de segurança com águia e coroa dourada',
    corBrilhoPadrao: '#f59e0b'
  },
  {
    id: 'escudo_azul',
    nome: 'Escudo Tático Neon (Cyber Blue)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%230b1329" stroke="%2338bdf8" stroke-width="3"/><path d="M50 20 L75 32 V52 C75 68 50 82 50 82 C50 82 25 68 25 52 V32 Z" fill="%230284c7" stroke="%2338bdf8" stroke-width="2.5"/><path d="M50 27 L68 36 V51 C68 63 50 74 50 74 C50 74 32 63 32 51 V36 Z" fill="%230369a1"/><path d="M44 51 L48 55 L58 43" stroke="%23ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    descricao: 'Escudo tático com brilho azul elétrico para segurança cibernética',
    corBrilhoPadrao: '#38bdf8'
  },
  {
    id: 'esmeralda_seguranca',
    nome: 'Guarita Biométrica (Esmeralda)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%2306241b" stroke="%2310b981" stroke-width="3"/><path d="M50 18 L76 34 V66 L50 82 L24 66 V34 Z" fill="%23047857" stroke="%2334d399" stroke-width="2"/><circle cx="50" cy="50" r="14" fill="%23064e3b" stroke="%236ee7b7" stroke-width="2"/><path d="M50 42 V58 M42 50 H58" stroke="%23a7f3d0" stroke-width="3" stroke-linecap="round"/></svg>',
    descricao: 'Hexágono de proteção com núcleo de acesso seguro',
    corBrilhoPadrao: '#10b981'
  },
  {
    id: 'torre_prestige',
    nome: 'Torre Condominial Real (Gold Onyx)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="48" fill="%2318181b" stroke="%23f59e0b" stroke-width="3"/><path d="M36 78 V34 L50 22 L64 34 V78 Z" fill="%23b45309" stroke="%23fcd34d" stroke-width="2.5"/><rect x="44" y="44" width="12" height="12" rx="2" fill="%23fef3c7"/><rect x="44" y="62" width="12" height="16" rx="2" fill="%23f59e0b"/><circle cx="50" cy="22" r="3" fill="%23ffffff"/></svg>',
    descricao: 'Monograma arquitetônico premium com acabamento ouro e ônix',
    corBrilhoPadrao: '#f59e0b'
  },
  {
    id: 'minimal_portto',
    nome: 'PorttoHub Conectividade (Minimal)',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="28" fill="%230f172a"/><path d="M30 50 C30 38.95 38.95 30 50 30 C61.05 30 70 38.95 70 50 C70 61.05 61.05 70 50 70" stroke="%236366f1" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="8" fill="%2310b981"/><path d="M50 20 V30 M80 50 H70 M50 80 V70 M20 50 H30" stroke="%23818cf8" stroke-width="3" stroke-linecap="round"/></svg>',
    descricao: 'Design contemporâneo focado em IoT e integração em nuvem',
    corBrilhoPadrao: '#6366f1'
  }
];

// Presets de Estilo Completos (1-clique para transformar a identidade do app)
export const PRESETS_ESTILOS_COMPLETOS: PresetEstiloVisual[] = [
  {
    id: 'padrao_oficial',
    nome: 'PorttoHub Tático Oficial',
    descricao: 'Visual noturno profundo clássico com acentos esmeralda e brasão dourado',
    dataCriacao: '2026-01-01',
    autor: 'PorttoHub Core',
    dados: {
      nomeAplicacao: 'PorttoHub',
      tamanhoFonteNome: 'xl',
      emblemaPreset: 'infport',
      emblemaUrl: defaultEmblemImg || '/emblema-infport.png',
      emblemaBrilho: true,
      emblemaCorBrilho: '#f59e0b',
      emblemaEstiloBorda: 'anel_dourado',
      familiaFonte: 'Inter',
      escalaFonteGlobal: 'normal',
      temaGlobalId: 'porttohub_dark',
      corPrimaria: '#10b981',
      corDestaque: '#f59e0b',
      raioBorda: 'moderno'
    }
  },
  {
    id: 'cyber_night',
    nome: 'Cyber Tático Noturno',
    descricao: 'Preto puro ônix, linhas azuis ciano e escudo neon de alta tecnologia',
    dataCriacao: '2026-02-15',
    autor: 'Design System',
    dados: {
      nomeAplicacao: 'PorttoHub | Tático',
      tamanhoFonteNome: '2xl',
      emblemaPreset: 'escudo_azul',
      emblemaUrl: PRESETS_EMBLEMAS[1].url,
      emblemaBrilho: true,
      emblemaCorBrilho: '#38bdf8',
      emblemaEstiloBorda: 'neon',
      familiaFonte: 'Outfit',
      escalaFonteGlobal: 'normal',
      temaGlobalId: 'cyber_black',
      corPrimaria: '#0284c7',
      corDestaque: '#38bdf8',
      raioBorda: 'suave'
    }
  },
  {
    id: 'prestige_gold',
    nome: 'Prestige Condomínio Luxo',
    descricao: 'Elegância executiva com dourado âmbar, tipografia Plus Jakarta e brasão imperial',
    dataCriacao: '2026-03-10',
    autor: 'Gestão VIP',
    dados: {
      nomeAplicacao: 'PorttoHub Prestige',
      tamanhoFonteNome: 'xl',
      emblemaPreset: 'torre_prestige',
      emblemaUrl: PRESETS_EMBLEMAS[3].url,
      emblemaBrilho: true,
      emblemaCorBrilho: '#f59e0b',
      emblemaEstiloBorda: 'anel_dourado',
      familiaFonte: 'Plus Jakarta Sans',
      escalaFonteGlobal: 'normal',
      temaGlobalId: 'gold_prestige',
      corPrimaria: '#d97706',
      corDestaque: '#fbbf24',
      raioBorda: 'moderno'
    }
  },
  {
    id: 'eco_emerald',
    nome: 'Esmeralda Segurança & Sustentável',
    descricao: 'Tons verdes nobres e ícones de alta visibilidade para portarias ativas',
    dataCriacao: '2026-04-01',
    autor: 'Eco Security',
    dados: {
      nomeAplicacao: 'PorttoHub Eco',
      tamanhoFonteNome: 'xl',
      emblemaPreset: 'esmeralda_seguranca',
      emblemaUrl: PRESETS_EMBLEMAS[2].url,
      emblemaBrilho: true,
      emblemaCorBrilho: '#10b981',
      emblemaEstiloBorda: 'circulo_clean',
      familiaFonte: 'Poppins',
      escalaFonteGlobal: 'confortavel',
      temaGlobalId: 'emerald_security',
      corPrimaria: '#059669',
      corDestaque: '#34d399',
      raioBorda: 'moderno'
    }
  },
  {
    id: 'acessibilidade_alto_contraste',
    nome: 'Acessibilidade & Alto Contraste Guarita',
    descricao: 'Fontes ampliadas, fundo de alto contraste e bordas nítidas para uso sob luz intensa',
    dataCriacao: '2026-05-12',
    autor: 'Operação Portaria',
    dados: {
      nomeAplicacao: 'PorttoHub Operacional',
      tamanhoFonteNome: '2xl',
      emblemaPreset: 'infport',
      emblemaUrl: defaultEmblemImg || '/emblema-infport.png',
      emblemaBrilho: false,
      emblemaEstiloBorda: 'sem_borda',
      familiaFonte: 'Roboto',
      escalaFonteGlobal: 'acessibilidade',
      temaGlobalId: 'high_contrast',
      corPrimaria: '#2563eb',
      corDestaque: '#e11d48',
      raioBorda: 'reto'
    }
  }
];

const CHAVE_STORAGE = "porttohub_customizacao_visual_v2";
const CHAVE_STORAGE_PRESETS = "porttohub_presets_personalizados_v1";
const EVENTO_CUSTOMIZACAO = "porttohub_customizacao_alterada";

// Injeta dinamicamente estilos, tipografia, favicon e variáveis CSS no DOM
export function aplicarEstilosGlobaisNoDOM(cfg: CustomizacaoVisual) {
  if (typeof window === "undefined" || !document || !document.documentElement) return;

  try {
    const root = document.documentElement;

    // 1. Mapeamento de fontes dinâmicas
    const mapFontes: Record<TipoFamiliaFonte, string> = {
      'Inter': 'Inter, system-ui, -apple-system, sans-serif',
      'Roboto': 'Roboto, system-ui, sans-serif',
      'Outfit': '"Outfit", sans-serif',
      'Plus Jakarta Sans': '"Plus Jakarta Sans", sans-serif',
      'Montserrat': '"Montserrat", sans-serif',
      'Poppins': '"Poppins", sans-serif',
      'JetBrains Mono': '"JetBrains Mono", monospace',
      'Sistema Padrão': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };

    const familiaEscolhida = mapFontes[cfg.familiaFonte] || mapFontes['Inter'];
    root.style.setProperty('--app-font-family', familiaEscolhida);
    document.body.style.fontFamily = familiaEscolhida;

    // 2. Mapeamento de escala de fontes
    const mapEscala: Record<TipoEscalaFonte, string> = {
      'compacto': '14.5px',
      'normal': '16px',
      'confortavel': '17.5px',
      'acessibilidade': '19.5px'
    };
    root.style.fontSize = mapEscala[cfg.escalaFonteGlobal] || '16px';

    // 3. Raio de borda dinâmico
    const mapRaio: Record<TipoRaioBorda, string> = {
      'reto': '4px',
      'suave': '10px',
      'moderno': '16px',
      'pill': '9999px'
    };
    root.style.setProperty('--app-border-radius', mapRaio[cfg.raioBorda] || '16px');

    // 4. Cores principais
    if (cfg.corPrimaria) root.style.setProperty('--app-color-primary', cfg.corPrimaria);
    if (cfg.corDestaque) root.style.setProperty('--app-color-accent', cfg.corDestaque);

    // 5. Atualização instantânea do Favicon / Ícone do App no navegador
    if (cfg.appIconUrl) {
      let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(favicon);
      }
      favicon.href = cfg.appIconUrl;
    }

    // 6. Atualização do título da página
    if (cfg.nomeAplicacao) {
      const sufixo = cfg.subtituloAplicacao ? ` - ${cfg.subtituloAplicacao}` : ' - Sistema de Portaria';
      document.title = `${cfg.nomeAplicacao}${sufixo}`;
    }

    // 7. Sincronização e aplicação de tema (Modo Claro vs Modo Escuro)
    const temaSalvo = localStorage.getItem('infport_tema_visual_v2');
    const eModoClaro = temaSalvo === 'claro' || (!temaSalvo && cfg.temaGlobalId === 'clean_light');

    if (eModoClaro) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      if (document.body) {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        document.body.setAttribute('data-theme', 'light');
      }
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      if (document.body) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
        document.body.setAttribute('data-theme', 'dark');
      }
      root.style.colorScheme = 'dark';
    }
  } catch (err) {
    console.warn('[customizacaoVisualService] Erro ao aplicar estilos no DOM:', err);
  }
}

export function obterCustomizacaoVisual(condominioId?: string): CustomizacaoVisual {
  if (typeof window === "undefined") return CUSTOMIZACAO_PADRAO;
  try {
    let salvo = null;
    if (condominioId && condominioId !== "global" && condominioId !== "todos") {
      salvo = localStorage.getItem(`porttohub_customizacao_visual_${condominioId}`);
    }
    if (!salvo) {
      salvo = localStorage.getItem(CHAVE_STORAGE);
    }
    // Fallback legado v1
    if (!salvo) {
      salvo = localStorage.getItem("porttohub_customizacao_visual_v1");
    }

    if (!salvo) {
      aplicarEstilosGlobaisNoDOM(CUSTOMIZACAO_PADRAO);
      return CUSTOMIZACAO_PADRAO;
    }

    const parse = JSON.parse(salvo);
    const combinada: CustomizacaoVisual = {
      ...CUSTOMIZACAO_PADRAO,
      ...parse,
      emblemaBrilho: parse.emblemaBrilho !== undefined ? parse.emblemaBrilho === true : CUSTOMIZACAO_PADRAO.emblemaBrilho,
      rotulosModulos: {
        ...MODULOS_PADRAO_ROTULOS,
        ...(parse.rotulosModulos || {})
      },
      iconesModulos: {
        ...MODULOS_PADRAO_ICONES,
        ...(parse.iconesModulos || {})
      },
      descricoesModulos: {
        ...MODULOS_PADRAO_DESCRICOES,
        ...(parse.descricoesModulos || {})
      },
      coresModulos: {
        ...(parse.coresModulos || {})
      },
      modulosOcultos: parse.modulosOcultos || []
    };

    aplicarEstilosGlobaisNoDOM(combinada);
    return combinada;
  } catch (e) {
    console.warn("[customizacaoVisualService] Erro ao carregar customização:", e);
    return CUSTOMIZACAO_PADRAO;
  }
}

export function salvarCustomizacaoVisual(
  novosDados: Partial<CustomizacaoVisual>,
  condominioId?: string
): CustomizacaoVisual {
  const atual = obterCustomizacaoVisual(condominioId);
  const atualizado: CustomizacaoVisual = {
    ...atual,
    ...novosDados,
    emblemaBrilho: novosDados.emblemaBrilho !== undefined ? novosDados.emblemaBrilho === true : atual.emblemaBrilho,
    rotulosModulos: {
      ...atual.rotulosModulos,
      ...(novosDados.rotulosModulos || {})
    },
    iconesModulos: {
      ...atual.iconesModulos,
      ...(novosDados.iconesModulos || {})
    },
    descricoesModulos: {
      ...atual.descricoesModulos,
      ...(novosDados.descricoesModulos || {})
    },
    coresModulos: {
      ...atual.coresModulos,
      ...(novosDados.coresModulos || {})
    },
    modulosOcultos: novosDados.modulosOcultos !== undefined ? novosDados.modulosOcultos : atual.modulosOcultos
  };

  try {
    const jsonStr = JSON.stringify(atualizado);
    if (condominioId && condominioId !== "global" && condominioId !== "todos") {
      localStorage.setItem(`porttohub_customizacao_visual_${condominioId}`, jsonStr);
    } else {
      localStorage.setItem(CHAVE_STORAGE, jsonStr);
    }

    aplicarEstilosGlobaisNoDOM(atualizado);

    window.dispatchEvent(
      new CustomEvent(EVENTO_CUSTOMIZACAO, {
        detail: { ...atualizado, condominio_id: condominioId }
      })
    );

    // Se modulosOcultos foi alterado, sincroniza com o mapa de feature flags para garantir reflexo imediato no menu
    if (novosDados.modulosOcultos !== undefined) {
      const mapaOcultos = new Set(atualizado.modulosOcultos);
      const condoKey = (condominioId && condominioId !== 'global' && condominioId !== 'todos') ? condominioId : '';
      const storageKey = condoKey ? `infport_flags_${condoKey}` : 'infport_flags_global';
      let flagsExistentes: Record<string, boolean> = {};
      try {
        const raw = localStorage.getItem(storageKey) || localStorage.getItem('infport_flags_global');
        if (raw) flagsExistentes = JSON.parse(raw);
      } catch {}

      const flagsAtualizadas = { ...flagsExistentes };
      // Mapeia chaves para false se estiver em modulosOcultos, true caso contrário
      Object.keys(MAPA_ALIASES_MODULOS).forEach(modId => {
        const estaOculto = isModuloOculto(modId, atualizado.modulosOcultos);
        const aliases = MAPA_ALIASES_MODULOS[modId] || [];
        flagsAtualizadas[modId] = !estaOculto;
        aliases.forEach(al => {
          flagsAtualizadas[al] = !estaOculto;
        });
      });

      if (condoKey) {
        localStorage.setItem(`infport_flags_${condoKey}`, JSON.stringify(flagsAtualizadas));
        localStorage.setItem(`porttohub_flags_${condoKey}`, JSON.stringify(flagsAtualizadas));
      }
      localStorage.setItem('infport_flags_global', JSON.stringify(flagsAtualizadas));

      window.dispatchEvent(new CustomEvent('modulos_atualizados', {
        detail: {
          condominio_id: condominioId,
          flags: flagsAtualizadas,
          modulos: flagsAtualizadas
        }
      }));
    }
  } catch (e) {
    console.error("[customizacaoVisualService] Erro ao salvar customização:", e);
  }
  return atualizado;
}

// Aplica a customização atual para todos os condomínios listados
export function aplicarParaTodosCondominios(
  dados: CustomizacaoVisual,
  listaIdsCondominios: string[] = []
): void {
  try {
    const jsonStr = JSON.stringify(dados);
    localStorage.setItem(CHAVE_STORAGE, jsonStr);

    for (const cId of listaIdsCondominios) {
      if (cId && cId !== 'global') {
        localStorage.setItem(`porttohub_customizacao_visual_${cId}`, jsonStr);
      }
    }

    aplicarEstilosGlobaisNoDOM(dados);

    window.dispatchEvent(
      new CustomEvent(EVENTO_CUSTOMIZACAO, {
        detail: { ...dados, condominio_id: 'global', replicadoTodos: true }
      })
    );
  } catch (e) {
    console.error("[customizacaoVisualService] Erro ao replicar para todos:", e);
  }
}

export function restaurarPadroesVisual(condominioId?: string): CustomizacaoVisual {
  try {
    if (condominioId && condominioId !== "global" && condominioId !== "todos") {
      localStorage.removeItem(`porttohub_customizacao_visual_${condominioId}`);
    } else {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(CUSTOMIZACAO_PADRAO));
    }
    aplicarEstilosGlobaisNoDOM(CUSTOMIZACAO_PADRAO);
    window.dispatchEvent(
      new CustomEvent(EVENTO_CUSTOMIZACAO, {
        detail: { ...CUSTOMIZACAO_PADRAO, condominio_id: condominioId }
      })
    );
  } catch (e) {
    console.error("[customizacaoVisualService] Erro ao resetar:", e);
  }
  return CUSTOMIZACAO_PADRAO;
}

// Gerenciamento de Presets Salvos pelo Administrador
export function carregarPresetsSalvos(): PresetEstiloVisual[] {
  if (typeof window === "undefined") return PRESETS_ESTILOS_COMPLETOS;
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_PRESETS);
    if (!salvo) return PRESETS_ESTILOS_COMPLETOS;
    const presetsUsuario: PresetEstiloVisual[] = JSON.parse(salvo);
    return [...PRESETS_ESTILOS_COMPLETOS, ...presetsUsuario];
  } catch {
    return PRESETS_ESTILOS_COMPLETOS;
  }
}

export function salvarNovoPresetPersonalizado(
  nome: string,
  descricao: string,
  dados: Partial<CustomizacaoVisual>
): PresetEstiloVisual {
  const novoPreset: PresetEstiloVisual = {
    id: `preset_${Date.now()}`,
    nome,
    descricao,
    dataCriacao: new Date().toISOString().split('T')[0],
    autor: 'Administrador',
    dados
  };

  try {
    const presetsAtuais = carregarPresetsSalvos().filter(
      p => !PRESETS_ESTILOS_COMPLETOS.some(padrao => padrao.id === p.id)
    );
    presetsAtuais.push(novoPreset);
    localStorage.setItem(CHAVE_STORAGE_PRESETS, JSON.stringify(presetsAtuais));
  } catch (e) {
    console.error("[customizacaoVisualService] Erro ao salvar novo preset:", e);
  }

  return novoPreset;
}

export function excluirPresetPersonalizado(presetId: string): void {
  try {
    const presetsAtuais = carregarPresetsSalvos().filter(
      p => !PRESETS_ESTILOS_COMPLETOS.some(padrao => padrao.id === p.id) && p.id !== presetId
    );
    localStorage.setItem(CHAVE_STORAGE_PRESETS, JSON.stringify(presetsAtuais));
  } catch (e) {
    console.error("[customizacaoVisualService] Erro ao excluir preset:", e);
  }
}

/**
 * Hook do React para sincronização instantânea em tempo real de todas as preferências visuais
 */
export function useCustomizacaoVisual(condominioId?: string): CustomizacaoVisual {
  const [config, setConfig] = useState<CustomizacaoVisual>(() => obterCustomizacaoVisual(condominioId));

  useEffect(() => {
    const nova = obterCustomizacaoVisual(condominioId);
    setConfig(nova);
    aplicarEstilosGlobaisNoDOM(nova);
  }, [condominioId]);

  useEffect(() => {
    const handleAtualizacao = (evt?: any) => {
      if (evt?.detail) {
        if (!evt.detail.condominio_id || evt.detail.condominio_id === condominioId || evt.detail.condominio_id === 'global') {
          setConfig(evt.detail);
          aplicarEstilosGlobaisNoDOM(evt.detail);
        }
      } else {
        const atual = obterCustomizacaoVisual(condominioId);
        setConfig(atual);
        aplicarEstilosGlobaisNoDOM(atual);
      }
    };
    window.addEventListener(EVENTO_CUSTOMIZACAO, handleAtualizacao);
    window.addEventListener("storage", handleAtualizacao);
    return () => {
      window.removeEventListener(EVENTO_CUSTOMIZACAO, handleAtualizacao);
      window.removeEventListener("storage", handleAtualizacao);
    };
  }, [condominioId]);

  return config;
}

export function obterClasseTamanhoFonte(tamanho: CustomizacaoVisual["tamanhoFonteNome"]): string {
  switch (tamanho) {
    case "sm": return "text-sm sm:text-base";
    case "base": return "text-base sm:text-lg";
    case "lg": return "text-lg sm:text-xl";
    case "xl": return "text-xl sm:text-2xl";
    case "2xl": return "text-2xl sm:text-3xl";
    case "3xl": return "text-3xl sm:text-4xl";
    default: return "text-xl sm:text-2xl";
  }
}
