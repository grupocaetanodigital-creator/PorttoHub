import { supabase } from './supabase';
import { isUUID } from './condominioService';

export interface PermissaoModuloPadrao {
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
  [key: string]: boolean | undefined;
}

export interface PermissoesModulo {
  encomendas?: PermissaoModuloPadrao & {
    entrada_lote?: boolean;
    cadastrar_entregador?: boolean;
    triagem?: boolean;
    baixa?: boolean;
    editar_pacote?: boolean;
    excluir_pacote?: boolean;
    dossie?: boolean;
    editar_lotes?: boolean;
    excluir_lotes?: boolean;
    historico?: boolean;
  };
  custodia?: PermissaoModuloPadrao & {
    receber?: boolean;
    baixa?: boolean;
    auditoria?: boolean;
  };
  chaves?: PermissaoModuloPadrao & {
    emprestar?: boolean;
    devolver?: boolean;
    cadastrar?: boolean;
    excluir?: boolean;
  };
  rondas?: PermissaoModuloPadrao & {
    iniciar_ronda?: boolean;
    cadastrar_pontos?: boolean;
    setores?: boolean;
  };
  autorizados?: PermissaoModuloPadrao & {
    cadastrar?: boolean;
    dar_entrada?: boolean;
    dar_saida?: boolean;
  };
  materiais?: PermissaoModuloPadrao & {
    cadastrar_equipamentos?: boolean;
    editar?: boolean;
    excluir?: boolean;
  };
  manutencao?: PermissaoModuloPadrao & {
    abrir_os?: boolean;
    concluir?: boolean;
    excluir?: boolean;
  };
  ocorrencias?: PermissaoModuloPadrao & {
    criar?: boolean;
    resolver?: boolean;
    excluir?: boolean;
  };
  passagem_posto?: PermissaoModuloPadrao & {
    assumir_posto?: boolean;
    relatorio?: boolean;
  };
  cadastros?: PermissaoModuloPadrao & {
    operadores?: boolean;
    moradores?: boolean;
    condominios?: boolean;
    gerenciar_niveis?: boolean;
  };
  moradores?: PermissaoModuloPadrao & {
    adicionar?: boolean;
    editar?: boolean;
    excluir?: boolean;
  };
  historico_absoluto?: PermissaoModuloPadrao & {
    ver_feed?: boolean;
    ver_metricas?: boolean;
    exportar_csv?: boolean;
    limpar_dados?: boolean;
  };
  configuracoes?: PermissaoModuloPadrao & {
    gerenciar_niveis?: boolean;
    feature_flags?: boolean;
  };
  bancada?: PermissaoModuloPadrao & {
    lancar?: boolean;
    baixa?: boolean;
    zerar?: boolean;
    historico?: boolean;
  };
}

export interface NivelAcessoItem {
  id: string; // Ex: 'nivel_0', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4', ou custom
  nome: string; // Ex: 'Nível 0 — Administrador Geral', 'Supervisor de Segurança', etc.
  descricao?: string;
  condominio_id?: string | null;
  padrao_sistema?: boolean; // Se é nível nativo do sistema
  permissoes: PermissoesModulo;
}

export interface ModuloAcaoInfo {
  id: string;
  label: string;
}

export interface ModuloDefinicaoInfo {
  id: keyof PermissoesModulo;
  nome: string;
  descricao?: string;
  acoesEspecificas: ModuloAcaoInfo[];
}

export const MODULOS_DEFINICAO_RBAC: ModuloDefinicaoInfo[] = [
  {
    id: 'encomendas',
    nome: 'Encomendas',
    acoesEspecificas: [
      { id: 'entrada_lote', label: '1ª Etapa: Recebimento de Lotes' },
      { id: 'criar_lote', label: 'Adicionar Novo Lote' },
      { id: 'cadastrar_entregador', label: 'Cadastrar Novo Entregador' },
      { id: 'triagem', label: '2ª Etapa: Efetuar Triagem' },
      { id: 'baixa', label: '3ª Etapa: Dar Saída / Baixa' },
      { id: 'editar_pacote', label: 'Editar Pacote Retido' },
      { id: 'excluir_pacote', label: 'Excluir Pacote Retido' },
      { id: 'dossie', label: 'Auditoria & Provas: Aba Dossiê' },
      { id: 'editar_lotes', label: 'Editar Lotes de Encomendas' },
      { id: 'excluir_lotes', label: 'Excluir Lotes de Encomendas' }
    ]
  },
  {
    id: 'custodia',
    nome: 'Custódia de Itens',
    acoesEspecificas: [
      { id: 'receber', label: 'Receber e Guardar' },
      { id: 'baixa', label: 'Baixa / Devolução' },
      { id: 'auditoria', label: 'Auditoria' }
    ]
  },
  {
    id: 'chaves',
    nome: 'Quadro Digital de Chaves (Claviculário)',
    acoesEspecificas: [
      { id: 'emprestar', label: 'Emprestar Chave' },
      { id: 'devolver', label: 'Devolver Chave' },
      { id: 'cadastrar', label: 'Cadastrar / Editar Chave' },
      { id: 'excluir', label: 'Excluir Chave do Quadro' }
    ]
  },
  {
    id: 'rondas',
    nome: 'Rondas Patrimoniais QR',
    acoesEspecificas: [
      { id: 'iniciar_ronda', label: 'Iniciar Ronda' },
      { id: 'cadastrar_pontos', label: 'Cadastrar / Editar Pontos' },
      { id: 'setores', label: 'Configurar Setores' }
    ]
  },
  {
    id: 'autorizados',
    nome: 'Autorizados & Prestadores',
    acoesEspecificas: [
      { id: 'cadastrar', label: 'Cadastrar / Liberar' },
      { id: 'dar_entrada', label: 'Dar Entrada' },
      { id: 'dar_saida', label: 'Dar Saída' }
    ]
  },
  {
    id: 'materiais',
    nome: 'Materiais & Inventário do Posto',
    acoesEspecificas: [
      { id: 'cadastrar_equipamentos', label: 'Cadastrar Equipamentos (HT, etc)' },
      { id: 'editar', label: 'Editar' },
      { id: 'excluir', label: 'Excluir' }
    ]
  },
  {
    id: 'manutencao',
    nome: 'Gestão de Manutenção & OS',
    acoesEspecificas: [
      { id: 'abrir_os', label: 'Abertura de Chamados (OS)' },
      { id: 'concluir', label: 'Resolução / Concluir OS' },
      { id: 'excluir', label: 'Excluir Chamado' }
    ]
  },
  {
    id: 'ocorrencias',
    nome: 'Livro de Ocorrências',
    acoesEspecificas: [
      { id: 'criar', label: 'Registrar c/ áudio/foto' },
      { id: 'resolver', label: 'Dar Ciência / Resolver' },
      { id: 'excluir', label: 'Excluir Ocorrência' }
    ]
  },
  {
    id: 'passagem_posto',
    nome: 'Passagem de Posto',
    acoesEspecificas: [
      { id: 'assumir_posto', label: 'Realizar / Assumir Passagem' },
      { id: 'relatorio', label: 'Ver Relatório Completo' }
    ]
  },
  {
    id: 'cadastros',
    nome: 'Cadastros Base',
    acoesEspecificas: [
      { id: 'operadores', label: 'Gerenciar Operadores' },
      { id: 'moradores', label: 'Gerenciar Moradores & Unidades' },
      { id: 'condominios', label: 'Gerenciar Condomínios' },
      { id: 'gerenciar_niveis', label: 'Gerenciar Níveis de Acesso (RBAC)' }
    ]
  },
  {
    id: 'historico_absoluto',
    nome: 'Histórico Absoluto & Auditoria',
    acoesEspecificas: [
      { id: 'visualizar', label: 'Visualização do Histórico Absoluto' },
      { id: 'ver_feed', label: 'Feed em Tempo Real' },
      { id: 'ver_metricas', label: 'Métricas & Indicadores' },
      { id: 'exportar_csv', label: 'Exportar Relatórios CSV' },
      { id: 'limpar_dados', label: 'Exclusão de Dados por Período (Limpar Dados - Apenas ADM)' }
    ]
  },
  {
    id: 'configuracoes',
    nome: 'Configurações do Sistema',
    acoesEspecificas: [
      { id: 'gerenciar_niveis', label: 'Gerenciar Níveis (RBAC)' },
      { id: 'feature_flags', label: 'Feature Flags (Módulos)' }
    ]
  },
  {
    id: 'bancada',
    nome: 'Bancada (Balcão Físico)',
    acoesEspecificas: [
      { id: 'lancar', label: 'Lançar Unidades na Bancada' },
      { id: 'baixa', label: 'Dar Baixa / Entregar Volumes' },
      { id: 'zerar', label: 'Zerar / Nova Conferência' },
      { id: 'historico', label: 'Ver Histórico de Auditoria' }
    ]
  }
];

export const NIVEIS_PADRAO: NivelAcessoItem[] = [
  {
    id: 'nivel_0',
    nome: 'Nível 0 — Administrador Geral',
    descricao: 'Acesso total e irrestrito a todos os módulos, configurações, exclusões e expurgo de dados.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: true, excluir: true, entrada_lote: true, triagem: true, baixa: true, dossie: true, editar_lotes: true, excluir_lotes: true, cadastrar_entregador: true, editar_pacote: true, excluir_pacote: true, historico: true },
      custodia: { visualizar: true, criar: true, editar: true, excluir: true, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: true, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: true, iniciar_ronda: true, cadastrar_pontos: true, setores: true },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: true, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: true, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: true, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: true, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: true, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: true, operadores: true, moradores: true, condominios: true, gerenciar_niveis: true },
      moradores: { visualizar: true, criar: true, editar: true, excluir: true, adicionar: true },
      historico_absoluto: { visualizar: true, criar: true, editar: true, excluir: true, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: true },
      configuracoes: { visualizar: true, criar: true, editar: true, excluir: true, gerenciar_niveis: true, feature_flags: true },
      bancada: { visualizar: true, criar: true, editar: true, excluir: true, lancar: true, baixa: true, zerar: true, historico: true }
    }
  },
  {
    id: 'nivel_1',
    nome: 'Nível 1 — Master (Síndico / Auditoria)',
    descricao: 'Visualização completa de relatórios, auditoria de dados, métricas executivas e cadastros.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: true, excluir: true, entrada_lote: true, triagem: true, baixa: true, dossie: true, editar_lotes: true, excluir_lotes: true, cadastrar_entregador: true, editar_pacote: true, excluir_pacote: true, historico: true },
      custodia: { visualizar: true, criar: true, editar: true, excluir: false, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: false, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: false, iniciar_ronda: true, cadastrar_pontos: true, setores: true },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: false, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: false, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: false, operadores: true, moradores: true, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: true, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: false },
      configuracoes: { visualizar: true, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false },
      bancada: { visualizar: true, criar: true, editar: true, excluir: false, lancar: true, baixa: true, zerar: true, historico: true }
    }
  },
  {
    id: 'nivel_2',
    nome: 'Nível 2 — Supervisor de Segurança',
    descricao: 'Gestão operacional de equipes, controle de rondas, ocorrências, materiais e supervisão de portaria.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: true, excluir: true, entrada_lote: true, triagem: true, baixa: true, dossie: true, editar_lotes: true, excluir_lotes: true, cadastrar_entregador: true, editar_pacote: true, excluir_pacote: true, historico: true },
      custodia: { visualizar: true, criar: true, editar: false, excluir: false, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: false, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: false, iniciar_ronda: true, cadastrar_pontos: true, setores: false },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: false, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: false, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: false, operadores: false, moradores: true, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: true, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: false, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false },
      bancada: { visualizar: true, criar: true, editar: true, excluir: false, lancar: true, baixa: true, zerar: false, historico: true }
    }
  },
  {
    id: 'nivel_3',
    nome: 'Nível 3 — Operador de Guarita / Portaria',
    descricao: 'Operação cotidiana do posto de trabalho: encomendas, triagem, liberação de pessoas e chaves.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: false, excluir: false, entrada_lote: true, triagem: true, baixa: true, dossie: false, editar_lotes: false, excluir_lotes: false, cadastrar_entregador: true, editar_pacote: false, excluir_pacote: false, historico: true },
      custodia: { visualizar: true, criar: true, editar: false, excluir: false, receber: true, baixa: true, auditoria: false },
      chaves: { visualizar: true, criar: true, editar: false, excluir: false, emprestar: true, devolver: true, cadastrar: false },
      rondas: { visualizar: true, criar: true, editar: false, excluir: false, iniciar_ronda: true, cadastrar_pontos: false, setores: false },
      autorizados: { visualizar: true, criar: true, editar: false, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar_equipamentos: false },
      manutencao: { visualizar: true, criar: true, editar: false, excluir: false, abrir_os: true, concluir: false },
      ocorrencias: { visualizar: true, criar: true, editar: false, excluir: false, resolver: false },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: false, editar: false, excluir: false, operadores: false, moradores: false, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: false, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: false, exportar_csv: false, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false },
      bancada: { visualizar: true, criar: true, editar: false, excluir: false, lancar: true, baixa: true, zerar: false, historico: false }
    }
  },
  {
    id: 'nivel_4',
    nome: 'Nível 4 — Síndico (Visualização & Consultas)',
    descricao: 'Acesso de consulta executiva a dashboards, relatórios e dossiês sem edição de portaria.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: false, editar: false, excluir: false, entrada_lote: false, triagem: false, baixa: false, dossie: true, editar_lotes: false, excluir_lotes: false, cadastrar_entregador: false, editar_pacote: false, excluir_pacote: false, historico: true },
      custodia: { visualizar: true, criar: false, editar: false, excluir: false, receber: false, baixa: false, auditoria: true },
      chaves: { visualizar: true, criar: false, editar: false, excluir: false, emprestar: false, devolver: false, cadastrar: false },
      rondas: { visualizar: true, criar: false, editar: false, excluir: false, iniciar_ronda: false, cadastrar_pontos: false, setores: false },
      autorizados: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar: false, dar_entrada: false, dar_saida: false },
      materiais: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar_equipamentos: false },
      bancada: { visualizar: true, criar: false, editar: false, excluir: false, lancar: false, baixa: false, zerar: false, historico: true },
      manutencao: { visualizar: true, criar: true, editar: false, excluir: false, abrir_os: true, concluir: false },
      ocorrencias: { visualizar: true, criar: true, editar: false, excluir: false, resolver: false },
      passagem_posto: { visualizar: true, criar: false, editar: false, excluir: false, assumir_posto: false, relatorio: true },
      cadastros: { visualizar: true, criar: false, editar: false, excluir: false, operadores: false, moradores: false, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: false, editar: false, excluir: false, adicionar: false },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false }
    }
  }
];

const STORAGE_KEY_NIVEIS = 'infport_niveis_acesso_v1';
let cacheNiveisMemoria: NivelAcessoItem[] | null = null;

export function obterNiveisLocal(): NivelAcessoItem[] {
  if (cacheNiveisMemoria && Array.isArray(cacheNiveisMemoria) && cacheNiveisMemoria.length > 0) {
    return cacheNiveisMemoria;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_NIVEIS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantir que todos os níveis padrão existam no merge
        const mapa = new Map<string, NivelAcessoItem>();
        NIVEIS_PADRAO.forEach(n => mapa.set(n.id, n));
        parsed.forEach((n: NivelAcessoItem) => mapa.set(n.id, n));
        const consolidados = Array.from(mapa.values());
        cacheNiveisMemoria = consolidados;
        return consolidados;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler níveis locais:', e);
  }
  cacheNiveisMemoria = [...NIVEIS_PADRAO];
  return [...NIVEIS_PADRAO];
}

export function salvarNiveisLocal(niveis: NivelAcessoItem[]) {
  cacheNiveisMemoria = niveis;
  try {
    localStorage.setItem(STORAGE_KEY_NIVEIS, JSON.stringify(niveis));
  } catch (e) {
    console.warn('Erro ao salvar níveis locais:', e);
  }
  // Notifica imediatamente toda a aplicação para reavaliação de permissões
  try {
    window.dispatchEvent(new CustomEvent('niveis_acesso_atualizados', { detail: niveis }));
  } catch (e) {
    // ignore
  }
}

export async function carregarNiveisAcesso(condominioId?: string): Promise<NivelAcessoItem[]> {
  const locais = obterNiveisLocal();

  try {
    let targetCondo = condominioId;
    if (!targetCondo || targetCondo === 'global' || targetCondo === 'todos' || !isUUID(targetCondo)) {
      const { data: c } = await supabase.from('condominios').select('id').limit(1).maybeSingle();
      if (c?.id && isUUID(c.id)) targetCondo = c.id;
      else targetCondo = undefined;
    }

    if (targetCondo && isUUID(targetCondo)) {
      const { data } = await supabase
        .from('configuracoes')
        .select('niveis_acesso')
        .eq('condominio_id', targetCondo)
        .maybeSingle();

      if (data?.niveis_acesso && Array.isArray(data.niveis_acesso) && data.niveis_acesso.length > 0) {
        const mapa = new Map<string, NivelAcessoItem>();
        NIVEIS_PADRAO.forEach(n => mapa.set(n.id, n));
        locais.forEach(n => mapa.set(n.id, n));
        data.niveis_acesso.forEach((n: NivelAcessoItem) => mapa.set(n.id, n));
        const consolidados = Array.from(mapa.values());
        salvarNiveisLocal(consolidados);
        return consolidados;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar níveis remotos:', err);
  }

  return locais;
}

export async function salvarNivelAcesso(nivel: NivelAcessoItem, condominioId?: string): Promise<void> {
  const atuais = obterNiveisLocal();
  let targetCondo = condominioId || nivel.condominio_id;
  if (!targetCondo || targetCondo === 'global' || targetCondo === 'todos' || !isUUID(targetCondo)) {
    try {
      const { data: c } = await supabase.from('condominios').select('id').limit(1).maybeSingle();
      if (c?.id && isUUID(c.id)) targetCondo = c.id;
      else targetCondo = undefined;
    } catch (e) {
      // ignore
    }
  }

  const nivelParaSalvar: NivelAcessoItem = {
    ...nivel,
    condominio_id: (targetCondo && isUUID(targetCondo)) ? targetCondo : (isUUID(nivel.condominio_id) ? nivel.condominio_id : null)
  };

  const idx = atuais.findIndex(n => n.id === nivel.id);
  let atualizados: NivelAcessoItem[];

  if (idx >= 0) {
    atualizados = [...atuais];
    atualizados[idx] = nivelParaSalvar;
  } else {
    atualizados = [...atuais, nivelParaSalvar];
  }

  salvarNiveisLocal(atualizados);

  if (targetCondo && isUUID(targetCondo)) {
    try {
      // Salva a lista completa consolidada de níveis para este condomínio (incluindo padrões customizados)
      const { error: upsertErr } = await supabase
        .from('configuracoes')
        .upsert({
          condominio_id: targetCondo,
          niveis_acesso: atualizados
        } as any, { onConflict: 'condominio_id' });

      if (upsertErr) {
        // Fallback para update simples
        const { error: updErr } = await supabase
          .from('configuracoes')
          .update({ niveis_acesso: atualizados } as any)
          .eq('condominio_id', targetCondo);
        if (updErr) {
          console.warn('Persistência remota de nível no Supabase:', updErr.message);
        }
      }
    } catch (e) {
      console.warn('Persistência remota de nível de acesso (graceful fallback):', e);
    }
  }
}

export async function excluirNivelAcesso(id: string, condominioId?: string): Promise<void> {
  const atuais = obterNiveisLocal();
  const atualizados = atuais.filter(n => n.id !== id);
  salvarNiveisLocal(atualizados);

  if (condominioId && isUUID(condominioId)) {
    try {
      const customizadosDoCondo = atualizados.filter(n => n.condominio_id === condominioId || !n.padrao_sistema);
      const { error } = await supabase
        .from('configuracoes')
        .update({ niveis_acesso: customizadosDoCondo } as any)
        .eq('condominio_id', condominioId);
      if (error) {
        console.warn('Exclusão remota de nível no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Erro ao atualizar exclusão de nível remoto:', e);
    }
  }
}

/**
 * Valida se um perfil de nível de acesso está sendo usado por algum operador.
 * Retorna a lista de nomes de operadores usando este perfil.
 */
export function verificarOperadoresEmUso(nivelId: string, operadores: any[]): string[] {
  if (!operadores || operadores.length === 0) return [];

  // Mapear correspondência com o nível ID (ex: 'nivel_0' -> nivel_acesso === 0, ou custom id)
  const nivelNum = nivelId.startsWith('nivel_') ? parseInt(nivelId.replace('nivel_', ''), 10) : NaN;

  const operadoresVinculados = operadores.filter(op => {
    if (op.nivel_acesso_custom_id === nivelId) return true;
    if (op.perfil_id === nivelId) return true;
    if (!isNaN(nivelNum) && op.nivel_acesso === nivelNum) return true;
    if (op.perfil === nivelId) return true;
    return false;
  });

  return operadoresVinculados.map(op => op.nome || op.login || 'Operador sem nome');
}

/**
 * Retorna o nome amigável de um perfil pelo seu ID ou nível numérico
 */
export function obterNomeNivel(nivelIdentificador: string | number | undefined, niveis?: NivelAcessoItem[]): string {
  if (nivelIdentificador === undefined || nivelIdentificador === null) return 'Nível Desconhecido';

  const lista = niveis || obterNiveisLocal();
  const idStr = String(nivelIdentificador);

  // Busca direta por ID
  const direto = lista.find(n => n.id === idStr);
  if (direto) return direto.nome;

  // Busca por 'nivel_' + id
  const porPrefixo = lista.find(n => n.id === `nivel_${idStr}`);
  if (porPrefixo) return porPrefixo.nome;

  // Fallbacks conhecidos
  switch (idStr) {
    case '0':
    case 'admin':
      return 'Nível 0 — Administrador Geral';
    case '1':
    case 'master':
      return 'Nível 1 — Master (Síndico / Auditoria)';
    case '2':
    case 'supervisor':
      return 'Nível 2 — Supervisor de Segurança';
    case '3':
    case 'operador':
      return 'Nível 3 — Operador de Guarita';
    case '4':
    case 'sindico':
      return 'Nível 4 — Síndico (Visualização)';
    default:
      return idStr;
  }
}

/**
 * Clona as permissões de um perfil base para um novo perfil customizado
 */
export function clonarPermissoes(permissoesOrigem: PermissoesModulo): PermissoesModulo {
  return JSON.parse(JSON.stringify(permissoesOrigem || {}));
}

/**
 * Obtém permissões padrão para um nível específico (ex: 'nivel_0', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4')
 */
export function obterPermissoesPadraoNivel(nivel: string): PermissoesModulo {
  const chave = nivel.startsWith('nivel_') ? nivel : `nivel_${nivel}`;
  const todos = obterNiveisLocal();
  const nivelEncontrado = todos.find(n => n.id === chave) || NIVEIS_PADRAO.find(n => n.id === chave) || NIVEIS_PADRAO.find(n => n.id === 'nivel_3');
  return JSON.parse(JSON.stringify(nivelEncontrado?.permissoes || NIVEIS_PADRAO[3].permissoes));
}

/**
 * Obtém as permissões configuradas diretamente para um operador (no card dele)
 */
export function obterPermissoesOperador(operador: any): PermissoesModulo {
  if (!operador) return obterPermissoesPadraoNivel('nivel_3');

  // 1. Se já está no objeto do operador
  if (operador.permissoes && typeof operador.permissoes === 'object' && Object.keys(operador.permissoes).length > 0) {
    return JSON.parse(JSON.stringify(operador.permissoes));
  }

  // 2. Se está armazenado no localStorage específico do operador
  const opId = operador.id || operador.login;
  if (opId) {
    try {
      const salvo = localStorage.getItem(`porttohub_operador_permissoes_${opId}`);
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. Fallback para as permissões do nível do operador
  const nivelStr = operador.nivel_acesso_custom_id || 
                  (operador.nivel_acesso !== undefined && operador.nivel_acesso !== null ? `nivel_${operador.nivel_acesso}` : null) ||
                  (operador.perfil ? `nivel_${operador.perfil}` : 'nivel_3');
  return obterPermissoesPadraoNivel(nivelStr);
}

/**
 * Salva as permissões granulares diretamente no card do operador
 */
export async function salvarPermissoesOperador(operadorId: string, permissoes: PermissoesModulo): Promise<boolean> {
  if (!operadorId) return false;

  try {
    // 1. Salva localmente para resposta instantânea
    localStorage.setItem(`porttohub_operador_permissoes_${operadorId}`, JSON.stringify(permissoes));
    
    // 2. Notifica componentes e o App para atualizar operador logado se for ele
    window.dispatchEvent(new CustomEvent('permissoes_operador_atualizadas', {
      detail: { operadorId, permissoes }
    }));

    // 3. Persiste no banco Supabase se a coluna 'permissoes' estiver disponível
    try {
      if (isUUID(operadorId)) {
        await supabase
          .from('operadores')
          .update({ permissoes } as any)
          .eq('id', operadorId);
      } else {
        await supabase
          .from('operadores')
          .update({ permissoes } as any)
          .eq('login', operadorId);
      }
    } catch (errSupabase) {
      console.warn('Persistindo permissões no Supabase (fallback ativo):', errSupabase);
    }

    return true;
  } catch (err) {
    console.error('Erro ao salvar permissões do operador:', err);
    return false;
  }
}

/**
 * Conta quantos módulos estão com acesso visual ativado
 */
export function contarModulosHabilitados(permissoes: PermissoesModulo): number {
  if (!permissoes) return 0;
  return Object.values(permissoes).filter((m: any) => m && m.visualizar === true).length;
}

export function extrairIdNivel(operador: any): string {
  if (!operador) return 'nivel_3';
  if (operador.nivel_acesso_custom_id) {
    return String(operador.nivel_acesso_custom_id).trim();
  }
  const rawNivel = operador.nivel_acesso ?? operador.nivel;
  if (rawNivel !== undefined && rawNivel !== null && String(rawNivel).trim() !== '') {
    const s = String(rawNivel).trim();
    if (s.startsWith('nivel_')) return s;
    if (s.startsWith('custom_')) return s;
    return `nivel_${s}`;
  }
  const rawPerfil = operador.perfil ? String(operador.perfil).trim().toLowerCase() : '';
  if (rawPerfil) {
    if (rawPerfil === 'admin' || rawPerfil === 'admin_geral') return 'nivel_0';
    if (rawPerfil === 'master') return 'nivel_1';
    if (rawPerfil === 'supervisor') return 'nivel_2';
    if (rawPerfil === 'operador' || rawPerfil === 'porteiro') return 'nivel_3';
    if (rawPerfil === 'sindico') return 'nivel_4';
    if (rawPerfil.startsWith('nivel_')) return rawPerfil;
    return `nivel_${rawPerfil}`;
  }
  return 'nivel_3';
}

export function resolverAcaoEmPermissoesModulo(permissoesModulo: any, modKey: string, acao: string): boolean | undefined {
  if (!permissoesModulo || typeof permissoesModulo !== 'object') return undefined;

  // 1. Verificação direta da chave exata
  if (permissoesModulo[acao] !== undefined) {
    return Boolean(permissoesModulo[acao]);
  }

  // 2. Aliases cruzados específicos por módulo
  if (modKey === 'chaves') {
    if (acao === 'excluir') return permissoesModulo.excluir;
    if (acao === 'cadastrar' || acao === 'criar') return permissoesModulo.cadastrar ?? permissoesModulo.criar;
    if (acao === 'editar') return permissoesModulo.editar ?? permissoesModulo.cadastrar;
    if (acao === 'emprestar') return permissoesModulo.emprestar ?? permissoesModulo.criar ?? true;
    if (acao === 'devolver') return permissoesModulo.devolver ?? permissoesModulo.editar ?? true;
  }

  if (modKey === 'encomendas') {
    if (acao === 'cadastrar_entregador') return permissoesModulo.cadastrar_entregador ?? permissoesModulo.criar;
    if (acao === 'entrada_lote' || acao === 'criar_lote') return permissoesModulo.entrada_lote ?? permissoesModulo.criar_lote ?? permissoesModulo.criar;
    if (acao === 'triagem') return permissoesModulo.triagem ?? permissoesModulo.criar;
    if (acao === 'baixa') return permissoesModulo.baixa ?? permissoesModulo.criar;
    if (acao === 'editar_pacote' || acao === 'editar_lotes') return permissoesModulo.editar_pacote ?? permissoesModulo.editar_lotes ?? permissoesModulo.editar;
    if (acao === 'excluir_pacote' || acao === 'excluir_lotes') return permissoesModulo.excluir_pacote ?? permissoesModulo.excluir_lotes ?? permissoesModulo.excluir;
    if (acao === 'dossie' || acao === 'historico') return permissoesModulo.dossie ?? permissoesModulo.historico ?? permissoesModulo.visualizar;
  }

  if (modKey === 'autorizados' || modKey === 'prestadores') {
    if (acao === 'cadastrar' || acao === 'criar') return permissoesModulo.cadastrar ?? permissoesModulo.criar;
    if (acao === 'dar_entrada') return permissoesModulo.dar_entrada ?? permissoesModulo.cadastrar ?? permissoesModulo.criar ?? true;
    if (acao === 'dar_saida') return permissoesModulo.dar_saida ?? permissoesModulo.editar ?? true;
    if (acao === 'editar') return permissoesModulo.editar ?? permissoesModulo.cadastrar;
    if (acao === 'excluir') return permissoesModulo.excluir;
  }

  if (modKey === 'custodia') {
    if (acao === 'receber' || acao === 'criar') return permissoesModulo.receber ?? permissoesModulo.criar;
    if (acao === 'baixa') return permissoesModulo.baixa ?? permissoesModulo.editar;
    if (acao === 'auditoria') return permissoesModulo.auditoria ?? permissoesModulo.visualizar;
  }

  if (modKey === 'manutencao') {
    if (acao === 'abrir_os' || acao === 'criar') return permissoesModulo.abrir_os ?? permissoesModulo.criar;
    if (acao === 'concluir' || acao === 'editar') return permissoesModulo.concluir ?? permissoesModulo.editar;
  }

  if (modKey === 'rondas') {
    if (acao === 'iniciar_ronda') return permissoesModulo.iniciar_ronda ?? permissoesModulo.criar ?? true;
    if (acao === 'cadastrar_pontos' || acao === 'criar') return permissoesModulo.cadastrar_pontos ?? permissoesModulo.criar;
    if (acao === 'setores') return permissoesModulo.setores ?? permissoesModulo.editar;
  }

  if (modKey === 'passagem_posto' || modKey === 'passagem') {
    if (acao === 'assumir_posto' || acao === 'criar') return permissoesModulo.assumir_posto ?? permissoesModulo.criar ?? true;
    if (acao === 'relatorio') return permissoesModulo.relatorio ?? permissoesModulo.visualizar;
  }

  if (modKey === 'cadastros') {
    if (acao === 'operadores') return permissoesModulo.operadores ?? permissoesModulo.criar;
    if (acao === 'moradores') return permissoesModulo.moradores ?? permissoesModulo.criar;
    if (acao === 'condominios') return permissoesModulo.condominios ?? permissoesModulo.criar;
    if (acao === 'gerenciar_niveis') return permissoesModulo.gerenciar_niveis ?? permissoesModulo.editar;
  }

  if (modKey === 'moradores') {
    if (acao === 'adicionar' || acao === 'cadastrar' || acao === 'criar') return permissoesModulo.adicionar ?? permissoesModulo.criar ?? permissoesModulo.cadastrar;
    if (acao === 'editar') return permissoesModulo.editar;
    if (acao === 'excluir') return permissoesModulo.excluir;
  }

  if (modKey === 'ocorrencias') {
    if (acao === 'criar' || acao === 'cadastrar') return permissoesModulo.criar ?? permissoesModulo.cadastrar ?? true;
    if (acao === 'resolver' || acao === 'editar') return permissoesModulo.resolver ?? permissoesModulo.editar;
  }

  if (modKey === 'bancada') {
    if (acao === 'lancar' || acao === 'criar') return permissoesModulo.lancar ?? permissoesModulo.criar ?? true;
    if (acao === 'baixa' || acao === 'editar') return permissoesModulo.baixa ?? permissoesModulo.editar;
    if (acao === 'zerar' || acao === 'excluir') return permissoesModulo.zerar ?? permissoesModulo.excluir;
    if (acao === 'historico') return permissoesModulo.historico ?? permissoesModulo.visualizar;
  }

  if (modKey === 'historico_absoluto') {
    if (acao === 'ver_feed' || acao === 'ver_metricas' || acao === 'exportar_csv') return permissoesModulo[acao] ?? permissoesModulo.visualizar;
    if (acao === 'limpar_dados' || acao === 'excluir') return permissoesModulo.limpar_dados ?? permissoesModulo.excluir;
  }

  // 3. Fallback genérico: se for ação de criação e tiver 'criar', ou edição e tiver 'editar'
  if (acao === 'criar' && permissoesModulo.criar !== undefined) return Boolean(permissoesModulo.criar);
  if (acao === 'editar' && permissoesModulo.editar !== undefined) return Boolean(permissoesModulo.editar);
  if (acao === 'excluir' && permissoesModulo.excluir !== undefined) return Boolean(permissoesModulo.excluir);

  return undefined;
}

/**
 * Verifica se um operador logado possui uma permissão específica.
 */
export function verificarPermissao(
  operador: any,
  modulo: keyof PermissoesModulo | string,
  acao: string
): boolean {
  if (!operador) return false;

  const nivelNum = Number(operador.nivel_acesso ?? operador.nivel ?? 3);
  const perfilStr = String(operador.perfil || '').toLowerCase();
  const idNivel = extrairIdNivel(operador);

  // REGRA ESTRITA DE SEGURANÇA: Nível 3 (Operador/Porteiro) NUNCA pode excluir materiais do posto
  if (modulo === 'materiais' && (acao === 'excluir' || acao === 'excluir_equipamento')) {
    if (nivelNum >= 3 || idNivel === 'nivel_3' || perfilStr === 'operador' || perfilStr === 'porteiro') {
      return false;
    }
  }

  const ehAdminGeral = (perfilStr === 'admin' || perfilStr === 'admin_geral' || perfilStr === 'master' || nivelNum === 0 || nivelNum === 1 || Boolean(operador.eSuperAdminGlobal));

  // Normalização de sinônimos de módulos
  let modKey = String(modulo).toLowerCase();
  if (modKey === 'prestadores') modKey = 'autorizados';
  if (modKey === 'passagem') modKey = 'passagem_posto';

  // 1. VERIFICAÇÃO PRIORITÁRIA: Permissões Granulares Específicas do Operador (Configuradas diretamente no Card)
  const permissoesDiretas = obterPermissoesOperador(operador);
  if (permissoesDiretas) {
    const modConfig: any = (permissoesDiretas as any)[modKey] || (permissoesDiretas as any)[modulo];
    if (modConfig) {
      if (modConfig.visualizar === false) {
        if (ehAdminGeral && (modKey === 'configuracoes' || modKey === 'cadastros')) {
          return true;
        }
        return false;
      }
      if (acao === 'visualizar') {
        return Boolean(modConfig.visualizar ?? true);
      }
      const resAcaoDireta = resolverAcaoEmPermissoesModulo(modConfig, modKey, acao);
      if (resAcaoDireta !== undefined) {
        return resAcaoDireta;
      }
    }
  }

  // 2. VERIFICAÇÃO POR PERFIL / NÍVEL DE ACESSO (RBAC)
  const todos = obterNiveisLocal();
  let nivelObj = todos.find(n => n.id === idNivel);

  if (!nivelObj && operador.nivel_acesso !== undefined && operador.nivel_acesso !== null) {
    const chaveNivelAlt = String(operador.nivel_acesso).startsWith('nivel_') ? String(operador.nivel_acesso) : `nivel_${operador.nivel_acesso}`;
    nivelObj = todos.find(n => n.id === chaveNivelAlt);
  }

  if (!nivelObj) {
    if (perfilStr.includes('admin') || nivelNum === 0) nivelObj = todos.find(n => n.id === 'nivel_0') || NIVEIS_PADRAO[0];
    else if (perfilStr.includes('master') || nivelNum === 1) nivelObj = todos.find(n => n.id === 'nivel_1') || NIVEIS_PADRAO[1];
    else if (perfilStr.includes('superv') || nivelNum === 2) nivelObj = todos.find(n => n.id === 'nivel_2') || NIVEIS_PADRAO[2];
    else if (perfilStr.includes('sind') || nivelNum === 4) nivelObj = todos.find(n => n.id === 'nivel_4') || NIVEIS_PADRAO[4];
    else nivelObj = todos.find(n => n.id === 'nivel_3') || NIVEIS_PADRAO[3];
  }

  if (nivelObj && nivelObj.permissoes) {
    let permissoesModulo: any = 
      (nivelObj.permissoes as any)[modKey] || 
      (nivelObj.permissoes as any)[modulo] ||
      (modKey === 'autorizados' ? (nivelObj.permissoes as any)['prestadores'] : undefined) ||
      (modKey === 'passagem_posto' ? (nivelObj.permissoes as any)['passagem'] : undefined) ||
      (modKey === 'bancada' ? (nivelObj.permissoes as any)['bancada'] : undefined);

    if (permissoesModulo) {
      if (permissoesModulo.visualizar === false) {
        if (ehAdminGeral && (modKey === 'configuracoes' || modKey === 'cadastros')) {
          return true;
        }
        return false;
      }
      if (acao === 'visualizar') {
        return Boolean(permissoesModulo.visualizar ?? true);
      }
      const resAcaoNivel = resolverAcaoEmPermissoesModulo(permissoesModulo, modKey, acao);
      if (resAcaoNivel !== undefined) {
        return resAcaoNivel;
      }
    }
  }

  // 3. Fallbacks para Administrador Geral / Master
  if (ehAdminGeral || nivelNum === 0 || perfilStr === 'admin') {
    return true;
  }

  // Se não foi concedido por nenhuma regra:
  return false;
}
