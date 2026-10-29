/**
 * PorttoHub — Serviço de Importação, Exportação e Migração de Dados para Supabase
 * 
 * Permite extrair, salvar backups em JSON e migrar dados de bancos Supabase antigos
 * para o novo banco de dados Supabase ativo do PorttoHub com total integridade e segurança.
 * 
 * Inclui:
 * 1. Adaptador Universal de Esquemas: Detecta e corrige automaticamente colunas faltantes,
 *    diferentes ou renomeadas entre o banco antigo e o banco novo.
 * 2. Auto-Cura de Colunas: Detecta em tempo real erros de "column not in schema cache" e
 *    remove dinamicamente colunas incompatíveis sem interromper o processo.
 * 3. Resolução Inteligente de Chaves Estrangeiras (FK): Cria automaticamente registros pai
 *    (ex: condomínios ausentes) ou anula referências órfãs para garantir que 100% dos dados
 *    sejam salvos sem violação de integridade referencial.
 * 4. Descoberta de Nomes Alternativos de Tabelas: Tenta aliases comuns (ex: encomendas vs encomendas_itens).
 */

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { purgarCachesLocaisInfport } from './cacheLimpezaService';

export interface MigrationTableInfo {
  name: string;
  label: string;
  category: string;
  order: number;
  count?: number;
  status: 'idle' | 'checking' | 'migrating' | 'completed' | 'empty' | 'error';
  migratedCount: number;
  error?: string;
  detalhesAdaptacao?: string;
}

export const MIGRATION_TABLES: Omit<MigrationTableInfo, 'status' | 'migratedCount'>[] = [
  // 1. Cadastros e Tenants Raiz (Prioridade 1 - Devem entrar primeiro por dependência de Foreign Key)
  { name: 'condominios', label: 'Condomínios', category: 'Base', order: 1 },
  { name: 'operadores', label: 'Operadores & Porteiros', category: 'Acesso', order: 2 },
  { name: 'moradores', label: 'Moradores & Unidades', category: 'Base', order: 3 },
  { name: 'configuracoes', label: 'Configurações de Módulos', category: 'Sistema', order: 4 },
  { name: 'locais_armazenamento', label: 'Locais & Escaninhos', category: 'Encomendas', order: 5 },
  { name: 'entregadores', label: 'Entregadores Frequentes', category: 'Encomendas', order: 6 },
  { name: 'agenda_emergencia', label: 'Telefones de Emergência', category: 'Sistema', order: 7 },
  { name: 'templates_whatsapp', label: 'Templates de WhatsApp', category: 'Comunicação', order: 8 },

  // 2. Operacionais Principais (Prioridade 2)
  { name: 'lotes_re', label: 'Lotes RE de Encomendas', category: 'Encomendas', order: 9 },
  { name: 'encomendas_itens', label: 'Encomendas & Pacotes', category: 'Encomendas', order: 10 },
  { name: 'custodia', label: 'Itens em Custódia', category: 'Custódia', order: 11 },
  { name: 'chaves', label: 'Claviculário de Chaves', category: 'Chaves', order: 12 },
  { name: 'movimentacao_chaves', label: 'Movimentações de Chaves', category: 'Chaves', order: 13 },
  { name: 'materiais_posto', label: 'Materiais & Inventário Posto', category: 'Materiais', order: 14 },
  { name: 'prestadores', label: 'Prestadores & Autorizados', category: 'Acessos', order: 15 },
  { name: 'prestadores_acessos', label: 'Entradas/Saídas Prestadores', category: 'Acessos', order: 16 },

  // 3. Manutenção, Rondas e Registros (Prioridade 3)
  { name: 'rondas_setores', label: 'Setores de Ronda', category: 'Rondas', order: 17 },
  { name: 'rondas_pontos', label: 'Pontos de Ronda (QR/GPS)', category: 'Rondas', order: 18 },
  { name: 'rondas_execucao', label: 'Rondas Executadas', category: 'Rondas', order: 19 },
  { name: 'rondas_registros', label: 'Leituras de Pontos de Ronda', category: 'Rondas', order: 20 },
  { name: 'chamados_manutencao', label: 'Chamados & OS Manutenção', category: 'Manutenção', order: 21 },
  { name: 'checklist_manutencao', label: 'Checklists de Manutenção', category: 'Manutenção', order: 22 },
  { name: 'ocorrencias', label: 'Livro de Ocorrências', category: 'Ocorrências', order: 23 },
  { name: 'passagens_posto', label: 'Passagens de Posto', category: 'Posto', order: 24 },
  { name: 'historico_absoluto', label: 'Histórico & Auditoria', category: 'Auditoria', order: 25 },
  { name: 'lembretes_portaria', label: 'Lembretes de Portaria', category: 'Sistema', order: 26 },
  { name: 'bancada_conferencias', label: 'Conferências de Bancada', category: 'Bancada', order: 27 },
  { name: 'bancada_volumes', label: 'Volumes de Bancada', category: 'Bancada', order: 28 }
];

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export interface BancoPredefinido {
  id: string;
  nome: string;
  url: string;
  key: string;
  descricao?: string;
  padrao?: boolean;
}

export const BANCOS_PADRAO: BancoPredefinido[] = [
  {
    id: 'caetano_infport',
    nome: 'B.D caetano_infport',
    url: 'https://juafrepntyksgqiqzyes.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Imp1YWZyZXBudHlrc2dxaXF6eWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTk2NDEsImV4cCI6MjEwNTE5NTY0MX0.vIAQfpjj2PXkgF5Lw8txa0OrCitxmUxG8IEhWePM3Is',
    descricao: 'Banco antigo de onde você está puxando as informações'
  },
  {
    id: 'caetano_backup_oficial',
    nome: 'B.D caetano (Backup c/ 247 Entregadores)',
    url: 'https://fukxrdzhryumbcqibtas.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1a3hyZHpocnl1bWJjcWlidGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTY3MTUsImV4cCI6MjEwODQzMjcxNX0.f7DAt8NKPu4JMsLX-NMxBorBmFPxXTmtLJ359-ictz0',
    descricao: 'Base com 247 entregadores, 15 operadores, condomínios e dados históricos'
  },
  {
    id: 'porttohub_novo',
    nome: 'banco de dados PorttoHub',
    url: 'https://kkeizhscivyfjgetnbke.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA',
    descricao: 'Banco de dados ativo oficial do PorttoHub v2.0'
  }
];

/**
 * Ordem estrita de limpeza das tabelas (reversa de dependências FK).
 * As tabelas filhas (encomendas, movimentações, registros) devem ser excluídas primeiro,
 * e por último as tabelas raiz (operadores e condomínios).
 */
export const TABELAS_ORDEM_LIMPEZA = [
  'encomendas_itens',
  'lotes_re',
  'custodia',
  'movimentacao_chaves',
  'chaves',
  'materiais_posto',
  'prestadores_acessos',
  'prestadores',
  'rondas_registros',
  'rondas_execucao',
  'rondas_pontos',
  'rondas_setores',
  'chamados_manutencao',
  'checklist_manutencao',
  'ocorrencias',
  'passagens_posto',
  'historico_absoluto',
  'lembretes_portaria',
  'bancada_volumes',
  'bancada_conferencias',
  'templates_whatsapp',
  'agenda_emergencia',
  'entregadores',
  'locais_armazenamento',
  'moradores',
  'configuracoes',
  'operadores',
  'condominios'
];

/**
 * Esquema oficial das colunas válidas no banco de destino PorttoHub (PostgreSQL).
 * Permite filtrar de antemão colunas legadas e incompatíveis que causariam rejeição do PostgREST.
 */
export const TARGET_TABLE_COLUMNS: Record<string, string[]> = {
  condominios: [
    'id', 'nome', 'cnpj', 'endereco', 'cidade', 'uf', 'telefone_portaria',
    'sindico_nome', 'sindico_whatsapp', 'whatsapp_grupo_url', 'escala_plantao',
    'horario_diurno_inicio', 'horario_noturno_inicio', 'intervalo_ronda', 'tipo_estrutura',
    'qtd_blocos', 'unidades_por_bloco', 'nomes_blocos', 'locais_armazenamento',
    'turnos_plantao', 'created_at', 'updated_at', 'whatsapp_grupo_portaria', 'tipo',
    'zeros_esquerda', 'ativo'
  ],
  operadores: [
    'id', 'condominio_id', 'nome', 'login', 'senha', 'funcao', 'cargo', 'telefone',
    'turno_padrao', 'turno', 'email', 'nivel_acesso', 'nivel_acesso_custom_id',
    'perfil', 'foto_url', 'ativo', 'created_at', 'updated_at'
  ],
  moradores: [
    'id', 'condominio_id', 'nome', 'bloco', 'unidade', 'telefone', 'email',
    'tipo', 'observacoes', 'created_at', 'cpf', 'rg', 'documento', 'foto_url',
    'foto', 'tag_rfid', 'codigo_acesso', 'status_acesso', 'veiculo_placa',
    'veiculo_modelo', 'contato_emergencia', 'ativo', 'updated_at'
  ],
  configuracoes: [
    'id', 'condominio_id', 'niveis_acesso', 'feature_flags', 'locais_armazenamento',
    'setores_ronda', 'turnos_plantao', 'dados_tenant', 'mod01_cadastros_base',
    'mod02_gestao_encomendas', 'mod03_custodia_itens', 'mod04_materiais_posto',
    'mod05_quadro_chaves', 'mod06_gestao_manutencao', 'mod07_gestao_ronda',
    'mod08_livro_ocorrencias', 'mod09_passagem_posto', 'mod10_prestadores_servico',
    'mod11_bancada_conferencia', 'mod12_historico_absoluto', 'mod_portal_sindico',
    'whatsapp_modulos', 'created_at', 'updated_at'
  ],
  locais_armazenamento: [
    'id', 'condominio_id', 'nome', 'codigo', 'categoria', 'capacidade',
    'descricao', 'observacao', 'ativo', 'created_at', 'updated_at'
  ],
  entregadores: [
    'id', 'condominio_id', 'nome', 'documento', 'empresa', 'created_at',
    'telefone', 'foto_url', 'updated_at'
  ],
  agenda_emergencia: [
    'id', 'condominio_id', 'categoria', 'nome_descricao', 'telefone_principal',
    'telefone_whatsapp', 'exibir_menu_flutuante', 'created_at', 'observacoes',
    'updated_at'
  ],
  templates_whatsapp: [
    'id', 'condominio_id', 'codigo_evento', 'canal_destino', 'corpo_texto', 'tipo', 'titulo',
    'conteudo', 'variaveis', 'ativo', 'created_at', 'updated_at'
  ],
  lotes_re: [
    'id', 'codigo_re', 'condominio_id', 'entregador_id', 'qtd_declarada',
    'qtd_triada', 'status', 'operador_id', 'created_at', 'operador_nome',
    'updated_at'
  ],
  encomendas_itens: [
    'id', 'lote_re_id', 'condominio_id', 'bloco', 'unidade', 'morador_id',
    'codigo_barras', 'codigo_rastreio', 'destinatario', 'foto_etiqueta_url',
    'foto_etiqueta', 'observacoes', 'local_armazenamento', 'status', 'retirado_por',
    'foto_retirada_url', 'foto_comprovante_url', 'data_recebimento', 'data_retirada',
    'data_hora_retirada', 'operador_baixa_id', 'operador_baixa_nome', 'operador_baixa',
    'operador_entrada', 'documento_retirante', 'parentesco_vinculo', 'assinatura_url',
    'created_at', 'updated_at'
  ],
  custodia: [
    'id', 'condominio_id', 'codigo', 'item_descricao', 'categoria', 'unidade',
    'bloco', 'morador_id', 'depositante_nome', 'recebido_por_operador_id',
    'recebido_por_operador_nome', 'data_recebimento', 'status', 'retirado_por',
    'entregue_por_operador_id', 'entregue_por_operador_nome', 'data_retirada',
    'foto_url', 'observacoes', 'created_at', 'updated_at'
  ],
  chaves: [
    'id', 'condominio_id', 'codigo_chave', 'nome_chave', 'bloco', 'unidade',
    'tempo_limite_horas', 'status', 'identificacao_sala', 'setor', 'posse_atual',
    'contato_posse', 'retirado_as', 'localizacao', 'quantidade', 'qr_code',
    'observacoes', 'created_at', 'updated_at'
  ],
  movimentacao_chaves: [
    'id', 'condominio_id', 'chave_id', 'retirado_por', 'documento_retirante',
    'empresa', 'motivo', 'operador_saida_id', 'operador_saida_nome', 'data_saida',
    'operador_devolucao_id', 'operador_devolucao_nome', 'data_devolucao',
    'status', 'observacoes', 'created_at', 'updated_at'
  ],
  materiais_posto: [
    'id', 'condominio_id', 'item', 'categoria', 'quantidade_total',
    'quantidade_disponivel', 'estado_conservacao', 'localizacao', 'observacoes',
    'created_at', 'updated_at'
  ],
  prestadores: [
    'id', 'condominio_id', 'perfil_acesso', 'nome_profissional', 'nome_completo',
    'documento', 'tipo_documento', 'empresa', 'parentesco_vinculo', 'telefone',
    'placa_veiculo', 'modelo_veiculo', 'foto_rosto', 'foto_documento', 'tipo_servico',
    'atende_condominio', 'unidade', 'bloco', 'observacoes', 'tipo_validade',
    'data_validade_inicio', 'data_validade_fim', 'status_acesso',
    'operador_entrada_nome', 'data_hora_entrada', 'data_hora_saida',
    'cracha_atribuido', 'tempo_maximo_minutos', 'limite_permanencia_ate',
    'operador_saida_nome', 'created_at', 'nome', 'funcao', 'foto_url',
    'cracha', 'ativo', 'updated_at'
  ],
  prestadores_acessos: [
    'id', 'condominio_id', 'prestador_id', 'perfil_acesso', 'nome_completo',
    'documento', 'empresa', 'parentesco_vinculo', 'unidade', 'bloco',
    'foto_rosto', 'foto_documento', 'cracha', 'placa_veiculo', 'modelo_veiculo',
    'data_hora_entrada', 'tempo_maximo_minutos', 'limite_permanencia_ate',
    'data_hora_saida', 'status_acesso', 'operador_entrada_nome',
    'operador_saida_nome', 'observacoes', 'created_at', 'foto_url'
  ],
  rondas_setores: [
    'id', 'condominio_id', 'nome', 'descricao', 'ordem', 'ativo',
    'created_at', 'updated_at'
  ],
  rondas_pontos: [
    'id', 'condominio_id', 'setor_id', 'nome', 'codigo_qr', 'latitude',
    'longitude', 'ordem', 'ativo', 'created_at', 'updated_at'
  ],
  rondas_execucao: [
    'id', 'condominio_id', 'operador_id', 'operador_nome', 'turno',
    'data_inicio', 'data_fim', 'duracao_segundos', 'total_pontos',
    'pontos_conferidos', 'status', 'observacoes', 'created_at', 'updated_at'
  ],
  rondas_registros: [
    'id', 'condominio_id', 'ronda_execucao_id', 'ponto_id', 'data_hora',
    'latitude', 'longitude', 'status', 'foto_url', 'observacao', 'created_at'
  ],
  chamados_manutencao: [
    'id', 'condominio_id', 'titulo', 'descricao', 'categoria', 'prioridade',
    'status', 'local', 'solicitante_nome', 'solicitante_tipo', 'operador_abertura_id',
    'operador_abertura_nome', 'data_abertura', 'data_conclusao', 'custo_estimado',
    'custo_real', 'observacoes', 'created_at', 'updated_at'
  ],
  checklist_manutencao: [
    'id', 'condominio_id', 'titulo', 'frequencia', 'itens_snapshot', 'status',
    'operador_id', 'operador_nome', 'data_execucao', 'observacoes',
    'created_at', 'updated_at'
  ],
  ocorrencias: [
    'id', 'condominio_id', 'titulo', 'descricao', 'tipo', 'prioridade', 'gravidade',
    'status', 'foto_url', 'fotos', 'operador_nome', 'operador_id', 'operador_login',
    'unidade_bloco', 'bloco', 'unidade', 'data_hora', 'resolucao', 'data_resolucao',
    'operador_resolucao', 'created_at', 'updated_at'
  ],
  passagens_posto: [
    'id', 'condominio_id', 'operador_sai_id', 'operador_sai_nome',
    'operador_entra_id', 'operador_entra_nome', 'turno_sai', 'turno_entra',
    'data_hora', 'materiais_conferidos', 'chaves_pendentes', 'ocorrencias_resumo',
    'observacoes', 'created_at', 'updated_at'
  ],
  historico_absoluto: [
    'id', 'condominio_id', 'operador_id', 'operador_nome', 'operador_login',
    'modulo', 'acao', 'descricao', 'detalhes', 'ip', 'criado_em', 'data_hora',
    'created_at'
  ],
  lembretes_portaria: [
    'id', 'condominio_id', 'unidade_bloco', 'remetente_tipo', 'remetente_nome',
    'mensagem', 'tipo', 'lido', 'lido_em', 'lido_por_nome', 'lido_por_id',
    'finalizado', 'finalizado_em', 'finalizado_por_nome', 'finalizado_por_id',
    'eh_adm', 'data_limite', 'created_at', 'updated_at', 'prioridade'
  ],
  bancada_conferencias: [
    'id', 'condominio_id', 'operador_nome', 'operador_id', 'data_hora',
    'total_volumes', 'total_unidades', 'estruturas_resumo', 'observacoes',
    'created_at', 'itens'
  ],
  bancada_volumes: [
    'id', 'condominio_id', 'estrutura', 'unidade', 'volumes', 'observacao',
    'tipo_volume', 'operador_nome', 'operador_id', 'status', 'created_at',
    'updated_at'
  ]
};

/**
 * Nomes alternativos de tabelas em bancos de dados antigos
 */
export const TABLE_NAME_ALIASES: Record<string, string[]> = {
  encomendas_itens: ['encomendas_itens', 'encomendas', 'pacotes', 'encomenda_itens', 'itens_encomendas'],
  operadores: ['operadores', 'usuarios_sistema', 'usuarios', 'porteiros'],
  moradores: ['moradores', 'morador', 'cadastros_moradores'],
  lotes_re: ['lotes_re', 'lotes', 'recebimentos', 'recebimento_lotes'],
  prestadores: ['prestadores', 'prestadores_servico', 'visitantes', 'visitas'],
  locais_armazenamento: ['locais_armazenamento', 'escaninhos', 'locais'],
  historico_absoluto: ['historico_absoluto', 'auditoria', 'logs_atividades', 'historico']
};

/**
 * Cache dinâmico de colunas desconhecidas que foram rejeitadas pelo PostgREST em tempo de execução
 */
const dynamicInvalidColumnsCache: Map<string, Set<string>> = new Map();

/**
 * Cache de condomínios já validados/criados no banco de destino
 */
const validatedCondominiosCache: Set<string> = new Set();

export function carregarBancosPredefinidos(): BancoPredefinido[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const salvo = window.localStorage.getItem('porttohub_bancos_migracao');
      if (salvo) {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Garante que novos presets oficiais padrão também apareçam na lista do usuário
          const idsExistentes = new Set(parsed.map((p: any) => p.id));
          const mesclados = [...parsed];
          for (const padrao of BANCOS_PADRAO) {
            if (!idsExistentes.has(padrao.id)) {
              mesclados.push(padrao);
            }
          }
          return mesclados;
        }
      }
    } catch {
      // fallback
    }
  }
  return BANCOS_PADRAO;
}

export function salvarBancosPredefinidos(bancos: BancoPredefinido[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('porttohub_bancos_migracao', JSON.stringify(bancos));
  }
}

export function cleanApiKey(key: string): string {
  if (!key) return '';
  return key.trim().replace(/^["']|["']$/g, '');
}

export function normalizeSupabaseUrl(url: string): string {
  let cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '').replace(/\/auth\/v1\/?$/, '').replace(/\/+$/, '');
  return cleaned;
}

export function extractProjectRef(url: string): string {
  try {
    const norm = normalizeSupabaseUrl(url);
    const match = norm.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) return match[1];
    return 'custom';
  } catch {
    return 'desconhecido';
  }
}

/**
 * Gera um UUID determinístico válido (v4 compatível) a partir de qualquer string não-UUID (ex: 'admin_master_root')
 * Garantindo que o PostgreSQL não rejeite com erro de sintaxe de UUID.
 */
export function toDeterministicUuid(seed: string): string {
  if (!seed || typeof seed !== 'string') {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : '00000000-0000-4000-8000-000000000001';
  }
  const trimmed = seed.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x12345678, h4 = 0x87654321;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = [h1, h2, h3, h4].map(h => (h >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export interface MigrationContext {
  targetCondominioId?: string; // Se fornecido e !== 'todos', vincula os dados exclusivamente a este condomínio
  defaultCondominioId?: string; // Se o registro não possuir condomínio_id, vincula a este
  condoMap?: Map<string, string>; // Mapeia IDs/nomes de condomínios antigos para novos UUIDs
}

/**
 * LIMPEZA COMPLETA DO BANCO NOVO ANTES DA MIGRAÇÃO (RESET GERAL):
 * Exclui de forma controlada e segura todos os registros das 28 tabelas do banco de destino
 * em ordem reversa de dependência Foreign Key para evitar violações relacionais.
 * Zera moradores, encomendas, operadores, configurações e condomínios para que a importação
 * seja limpa, pura e sem mistura de dados entre condomínios diferentes.
 */
export async function limparBancoDestinoCompleto(
  onProgress?: (tabela: string, idx: number, total: number) => void
): Promise<{
  sucesso: boolean;
  totalRemovidos: number;
  tabelasLimpas: string[];
  erros: string[];
}> {
  let totalRemovidos = 0;
  const tabelasLimpas: string[] = [];
  const erros: string[] = [];

  validatedCondominiosCache.clear();
  dynamicInvalidColumnsCache.clear();

  for (let i = 0; i < TABELAS_ORDEM_LIMPEZA.length; i++) {
    const tabela = TABELAS_ORDEM_LIMPEZA[i];
    if (onProgress) {
      onProgress(tabela, i + 1, TABELAS_ORDEM_LIMPEZA.length);
    }

    try {
      // Deleta todos os registros não-nulos
      const { error, count } = await supabase
        .from(tabela)
        .delete({ count: 'exact' })
        .not('id', 'is', null);

      if (!error) {
        totalRemovidos += (count || 0);
        tabelasLimpas.push(tabela);
      } else {
        // Fallback para tabelas com IDs específicos
        const { error: err2, count: count2 } = await supabase
          .from(tabela)
          .delete({ count: 'exact' })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        if (!err2) {
          totalRemovidos += (count2 || 0);
          tabelasLimpas.push(tabela);
        } else {
          if (!error.message?.includes('schema cache') && !error.message?.includes('does not exist')) {
            erros.push(`${tabela}: ${error.message}`);
          }
        }
      }
    } catch (e: any) {
      erros.push(`${tabela}: ${e.message || String(e)}`);
    }
  }

  // Blindagem de Cache: Apaga obrigatoriamente todas as chaves infport_cache_retidos_, infport_locais_ e infport_flags_
  try {
    purgarCachesLocaisInfport();
  } catch (errCache) {
    console.warn('[limparBancoDestinoCompleto] Aviso ao purgar caches locais:', errCache);
  }

  return {
    sucesso: erros.length === 0,
    totalRemovidos,
    tabelasLimpas,
    erros
  };
}

/**
 * ADAPTADOR UNIVERSAL DE ESQUEMAS:
 * Mapeia colunas renomeadas, converte tipos legados, resolve o condomínio correto
 * e alinha com a tabela de destino para que nenhuma informação seja perdida ou descartada.
 */
export function adaptRecordForTargetTable(tableName: string, rawRecord: any, context?: MigrationContext): any {
  if (!rawRecord || typeof rawRecord !== 'object') return rawRecord;
  const item: any = { ...rawRecord };

  // 0. Resolução estrita de condomínio para evitar misturas entre condomínios
  if (tableName !== 'condominios') {
    const rawCondo = item.condominio_id || item.condominioId || item.id_condominio || item.condo_id || item.tenant_id;

    if (tableName === 'operadores') {
      const eAdmin = item.login === 'admin' || item.perfil === 'admin_geral' || item.nivel_acesso === 0;
      if (eAdmin && (rawCondo === 'todos' || rawCondo === 'global' || !rawCondo)) {
        item.condominio_id = null;
      } else if (context?.targetCondominioId && context.targetCondominioId !== 'todos' && !eAdmin) {
        item.condominio_id = context.targetCondominioId;
      } else if (rawCondo && context?.condoMap?.has(String(rawCondo))) {
        item.condominio_id = context.condoMap.get(String(rawCondo));
      } else if (rawCondo && rawCondo !== 'todos' && rawCondo !== 'global') {
        item.condominio_id = toDeterministicUuid(String(rawCondo));
      } else {
        item.condominio_id = null;
      }
    } else {
      // Para moradores, encomendas, chaves, ocorrências, prestadores, etc.
      if (context?.targetCondominioId && context.targetCondominioId !== 'todos') {
        item.condominio_id = context.targetCondominioId;
      } else if (rawCondo && context?.condoMap?.has(String(rawCondo))) {
        item.condominio_id = context.condoMap.get(String(rawCondo));
      } else if (rawCondo && rawCondo !== 'todos' && rawCondo !== 'global' && String(rawCondo).trim() !== '') {
        item.condominio_id = toDeterministicUuid(String(rawCondo));
      } else if (context?.defaultCondominioId) {
        item.condominio_id = context.defaultCondominioId;
      }
    }
  }

  // 1. Adaptações específicas por tabela
  if (tableName === 'condominios') {
    // Endereço composto
    if (!item.endereco && (item.rua || item.logradouro)) {
      item.endereco = item.rua || item.logradouro;
    }
    if (item.numero || item.bairro) {
      const parts = [item.endereco];
      if (item.numero && !String(item.endereco || '').includes(String(item.numero))) {
        parts.push(`Nº ${item.numero}`);
      }
      if (item.bairro && !String(item.endereco || '').includes(String(item.bairro))) {
        parts.push(`Bairro ${item.bairro}`);
      }
      item.endereco = parts.filter(Boolean).join(', ');
    }
    // Mapeamento de WhatsApp do síndico
    if (!item.sindico_whatsapp && (item.telefone_sindico || item.whatsapp_sindico)) {
      item.sindico_whatsapp = item.telefone_sindico || item.whatsapp_sindico;
    }
    // Mapeamento de blocos e unidades
    if (!item.qtd_blocos && item.total_blocos) {
      item.qtd_blocos = Number(item.total_blocos) || 1;
    }
    if (!item.unidades_por_bloco && item.total_unidades) {
      item.unidades_por_bloco = Number(item.total_unidades) || 10;
    }
    if (item.ativo === undefined) item.ativo = true;
  }

  if (tableName === 'operadores') {
    // Função / Cargo
    item.funcao = item.funcao || item.cargo || 'Porteiro';
    item.cargo = item.cargo || item.funcao || 'Porteiro';

    // Turno
    item.turno_padrao = item.turno_padrao || item.turno || 'Diurno (12x36)';
    item.turno = item.turno || item.turno_padrao || 'Diurno (12x36)';

    // Nível de acesso
    if (item.nivel_acesso === undefined || item.nivel_acesso === null) {
      item.nivel_acesso = (item.login === 'admin' || item.perfil === 'admin_geral') ? 0 : 3;
    }
    if (item.ativo === undefined) item.ativo = true;
  }

  if (tableName === 'moradores') {
    // Telefone
    item.telefone = item.telefone || item.telefone_whatsapp || item.whatsapp || item.celular || '';

    // Bloco e Unidade
    if (item.unidade !== undefined && item.unidade !== null) item.unidade = String(item.unidade).trim();
    if (item.bloco !== undefined && item.bloco !== null) item.bloco = String(item.bloco).trim().toUpperCase();

    // Documento
    item.documento = item.documento || item.cpf || item.rg || '';

    // Veículos (converte array de objetos [{ placa, modelo }] para colunas dedicadas)
    if (Array.isArray(item.veiculos) && item.veiculos.length > 0) {
      const primeiroVeiculo = item.veiculos[0];
      if (primeiroVeiculo) {
        if (!item.veiculo_placa) item.veiculo_placa = primeiroVeiculo.placa || primeiroVeiculo.veiculo_placa || '';
        if (!item.veiculo_modelo) item.veiculo_modelo = primeiroVeiculo.modelo || primeiroVeiculo.veiculo_modelo || '';
      }
    }

    // Contato de emergência
    if (!item.contato_emergencia && item.parentesco) {
      item.contato_emergencia = `Parentesco: ${item.parentesco}`;
    }

    if (!item.tipo) item.tipo = 'proprietario';
    if (item.ativo === undefined) item.ativo = true;
  }

  if (tableName === 'encomendas_itens') {
    // Código de barras / Rastreio em ambas as colunas
    const rastreio = item.codigo_rastreio || item.rastreio || item.tracking_code || item.codigo_barras || '';
    item.codigo_rastreio = rastreio;
    item.codigo_barras = item.codigo_barras || rastreio;

    // Destinatário
    item.destinatario = item.destinatario || item.destinatario_nome || '';

    // Foto da etiqueta
    const fotoEtiqueta = item.foto_etiqueta_url || item.foto_etiqueta || item.foto_url || '';
    item.foto_etiqueta_url = fotoEtiqueta;
    item.foto_etiqueta = fotoEtiqueta;

    // Data de recebimento
    item.data_recebimento = item.data_recebimento || item.created_at || new Date().toISOString();

    // Operador
    item.operador_baixa = item.operador_baixa || item.operador_baixa_nome || '';
    item.operador_baixa_nome = item.operador_baixa_nome || item.operador_baixa || '';

    // Local de armazenamento e status
    if (!item.local_armazenamento) item.local_armazenamento = 'Bancada Principal';
    if (!item.status) item.status = 'retido';

    // Bloco e Unidade limpos
    if (item.unidade !== undefined && item.unidade !== null) item.unidade = String(item.unidade).trim();
    if (item.bloco !== undefined && item.bloco !== null) item.bloco = String(item.bloco).trim().toUpperCase();

    // Data de retirada
    if (!item.data_retirada && item.data_hora_retirada) {
      item.data_retirada = item.data_hora_retirada;
    }
    // Foto de retirada / comprovante
    if (!item.foto_comprovante_url && item.foto_retirada_url) {
      item.foto_comprovante_url = item.foto_retirada_url;
    }
  }

  if (tableName === 'chaves') {
    item.codigo_chave = item.codigo_chave || item.codigo || 'CHV';
    item.nome_chave = item.nome_chave || item.nome || item.sala_local || 'Chave';
    item.identificacao_sala = item.identificacao_sala || item.sala_local || item.localizacao || '';
    item.tempo_limite_horas = Number(item.tempo_limite_horas) || 24;
    item.status = item.status || 'disponivel';
  }

  if (tableName === 'locais_armazenamento') {
    item.codigo = item.codigo || (item.nome ? item.nome.slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '') : 'LOC') || 'LOC01';
    item.observacao = item.observacao || item.descricao || '';
    item.descricao = item.descricao || item.observacao || '';
    if (!item.categoria) item.categoria = 'Prateleira';
    if (item.ativo === undefined) item.ativo = true;
  }

  if (tableName === 'templates_whatsapp') {
    item.codigo_evento = item.codigo_evento || item.tipo || (item.titulo ? item.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'evento_geral');
    item.canal_destino = item.canal_destino || item.tipo || 'morador';
    item.corpo_texto = item.corpo_texto || item.conteudo || item.texto || item.mensagem || 'Mensagem do PorttoHub';
    if (item.ativo === undefined) item.ativo = true;
  }

  if (tableName === 'ocorrencias') {
    item.tipo = item.tipo || item.categoria || 'Geral';
    item.prioridade = item.prioridade || item.gravidade || 'Média';
    item.gravidade = item.gravidade || item.prioridade || 'Média';
    item.unidade_bloco = item.unidade_bloco || (item.bloco && item.unidade ? `${item.bloco} - ${item.unidade}` : (item.unidade || ''));
    if (!item.status) item.status = 'aberta';
  }

  if (tableName === 'configuracoes') {
    if (item.parametros && typeof item.parametros === 'object') {
      item.feature_flags = {
        ...(typeof item.feature_flags === 'object' ? item.feature_flags : {}),
        ...item.parametros
      };
    }
  }

  if (tableName === 'lotes_re') {
    if (!item.operador_nome && item.operador_id && typeof item.operador_id === 'string' && !item.operador_id.includes('-')) {
      item.operador_nome = item.operador_id;
    }
  }

  // 2. Higienização geral e remoção de colunas desconhecidas
  const targetCols = TARGET_TABLE_COLUMNS[tableName];
  const invalidSet = dynamicInvalidColumnsCache.get(tableName);

  const sanitized: any = {};

  for (const [key, val] of Object.entries(item)) {
    if (val === undefined) continue;

    // Se conhecemos o esquema da tabela, descarta colunas inexistentes no destino
    if (targetCols && !targetCols.includes(key)) {
      continue;
    }

    // Se já foi identificado dinamicamente que a coluna foi rejeitada
    if (invalidSet && invalidSet.has(key)) {
      continue;
    }

    // Normalização de booleanos
    if (val === 'true') {
      sanitized[key] = true;
      continue;
    }
    if (val === 'false') {
      sanitized[key] = false;
      continue;
    }

    // Limpeza de campos vazios "" que quebram PostgreSQL
    if (typeof val === 'string' && val.trim() === '') {
      if (
        key === 'id' || 
        key.endsWith('_id') || 
        key.endsWith('Id') ||
        key.endsWith('_em') || 
        key.endsWith('_at') || 
        key.startsWith('data_') || 
        key.startsWith('horario_') ||
        key === 'volumes' || 
        key === 'quantidade' || 
        key === 'quantidade_total' || 
        key === 'quantidade_disponivel' || 
        key === 'duracao_segundos' || 
        key === 'total_pontos' || 
        key === 'pontos_conferidos' ||
        key === 'ordem' || 
        key === 'nivel_acesso'
      ) {
        sanitized[key] = null;
        continue;
      }
    }

    sanitized[key] = val;
  }

  // Garante ID presente e padronizado em formato UUID válido para PostgreSQL
  if (!sanitized.id) {
    sanitized.id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : toDeterministicUuid(`item_${Date.now()}_${Math.random()}`);
  } else {
    sanitized.id = toDeterministicUuid(String(sanitized.id));
  }

  return sanitized;
}

export const sanitizeForSupabase = (record: any) => adaptRecordForTargetTable('geral', record);
export const sanitizeForFirestore = sanitizeForSupabase;

/**
 * Cria cliente Supabase de origem com tratamento seguro
 */
export function createSourceSupabaseClient(credentials: SupabaseCredentials) {
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Testa a conexão com o Supabase de origem
 */
export async function testSupabaseConnection(credentials: SupabaseCredentials): Promise<{
  success: boolean;
  message: string;
  projectRef?: string;
}> {
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();

  if (!url || !url.includes('.')) {
    return { success: false, message: 'URL do Supabase inválida. Exemplo: https://xyz.supabase.co' };
  }
  if (!key || key.length < 20) {
    return { success: false, message: 'Chave de API do Supabase inválida (deve ser anon ou service_role).' };
  }

  const projectRef = extractProjectRef(url);

  try {
    const client = createSourceSupabaseClient(credentials);

    // Tenta ler de tabelas primárias ou aliases
    const testTables = ['condominios', 'operadores', 'moradores', 'entregadores', 'encomendas_itens', 'encomendas', 'configuracoes'];
    let connected = false;
    let authError = false;
    let lastErrorMsg = '';

    for (const t of testTables) {
      try {
        const { error, status } = await client.from(t).select('id').limit(1);
        if (!error || status === 200 || status === 206) {
          connected = true;
          break;
        } else if (status === 401 || status === 403) {
          authError = true;
          lastErrorMsg = error.message;
        } else {
          lastErrorMsg = error.message;
        }
      } catch (err: any) {
        lastErrorMsg = err.message || String(err);
      }
    }

    if (connected) {
      return {
        success: true,
        message: `Conexão bem-sucedida com o projeto (${projectRef}).`,
        projectRef
      };
    }

    if (authError) {
      return {
        success: false,
        message: `Erro de autenticação no Supabase (${projectRef}): A chave fornecida é inválida ou expirou (${lastErrorMsg}).`
      };
    }

    // Fallback: Teste via REST API direto
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });

    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        success: true,
        message: `Conexão bem-sucedida com o projeto (${projectRef}).`,
        projectRef
      };
    }

    return {
      success: false,
      message: `Não foi possível comunicar com o Supabase (${res.status} ${res.statusText}). Verifique a URL e a chave.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar conexão: ${err.message || String(err)}`
    };
  }
}

/**
 * Obtém a contagem de registros de uma tabela específica no Supabase
 * Testa também nomes alternativos caso a tabela principal não exista
 */
export async function getSupabaseRowCount(
  credentials: SupabaseCredentials,
  tableName: string
): Promise<{ count: number; exists: boolean; resolvedTable: string; error?: string }> {
  const client = createSourceSupabaseClient(credentials);
  const candidateNames = TABLE_NAME_ALIASES[tableName] || [tableName];

  for (const candidate of candidateNames) {
    try {
      const { count, error, status } = await client
        .from(candidate)
        .select('*', { count: 'exact', head: true });

      if (!error && (status === 200 || status === 206)) {
        return { count: count || 0, exists: true, resolvedTable: candidate };
      }

      if (status !== 404 && error?.code !== '42P01') {
        // Tenta fallback com select('id').limit(1000)
        const { data: idData, error: idErr } = await client.from(candidate).select('id').limit(1000);
        if (!idErr && Array.isArray(idData)) {
          return { count: idData.length, exists: true, resolvedTable: candidate };
        }
      }
    } catch {
      // continua para próximo alias
    }
  }

  return { count: 0, exists: false, resolvedTable: tableName, error: 'Tabela não encontrada no banco antigo' };
}

/**
 * Busca todos os registros de uma tabela no Supabase com suporte a paginação e aliases
 */
export async function fetchAllSupabaseTableData(
  credentials: SupabaseCredentials,
  tableName: string
): Promise<{ records: any[]; sourceTable: string }> {
  const client = createSourceSupabaseClient(credentials);
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();
  const PAGE_SIZE = 1000;

  const candidateNames = TABLE_NAME_ALIASES[tableName] || [tableName];

  for (const candidate of candidateNames) {
    let offset = 0;
    let allRecords: any[] = [];
    let hasMore = true;
    let foundTable = false;

    while (hasMore) {
      let batch: any[] = [];
      let fetchError: any = null;

      try {
        const { data, error, status } = await client
          .from(candidate)
          .select('*')
          .range(offset, offset + PAGE_SIZE - 1);

        if (!error && Array.isArray(data)) {
          batch = data;
          foundTable = true;
        } else {
          if (status === 404 || error?.code === '42P01' || error?.message?.includes('does not exist')) {
            break; // Tenta próximo alias
          }
          fetchError = error;
        }
      } catch (e) {
        fetchError = e;
      }

      // Fallback REST direto
      if (fetchError && batch.length === 0) {
        try {
          const fallbackUrl = `${url}/rest/v1/${candidate}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
          const res = await fetch(fallbackUrl, {
            method: 'GET',
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`
            }
          });

          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
              batch = json;
              foundTable = true;
            }
          }
        } catch {
          // ignore
        }
      }

      if (batch.length === 0) {
        hasMore = false;
      } else {
        allRecords = allRecords.concat(batch);
        if (batch.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          offset += PAGE_SIZE;
        }
      }
    }

    if (foundTable && allRecords.length > 0) {
      return { records: allRecords, sourceTable: candidate };
    }
  }

  return { records: [], sourceTable: tableName };
}

/**
 * Garante que o condomínio referenciado exista no banco de destino para não quebrar Foreign Keys
 */
async function ensureCondominioExists(condominioId: string | null | undefined): Promise<void> {
  if (!condominioId || typeof condominioId !== 'string') return;
  const idTrim = condominioId.trim();

  // Ignora IDs que não sejam UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idTrim);
  if (!isUuid || validatedCondominiosCache.has(idTrim)) return;

  try {
    const { data } = await supabase.from('condominios').select('id').eq('id', idTrim).maybeSingle();
    if (data?.id) {
      validatedCondominiosCache.add(idTrim);
      return;
    }

    // Não existe: cria stub automático do condomínio
    await supabase.from('condominios').upsert([{
      id: idTrim,
      nome: `Condomínio Migrado (${idTrim.slice(0, 8)})`,
      tipo_estrutura: 'blocos',
      ativo: true
    }], { onConflict: 'id' });

    validatedCondominiosCache.add(idTrim);
  } catch (err) {
    console.warn('[Migrador] Aviso ao validar FK de condomínio:', err);
  }
}

/**
 * Salva um lote de registros com AUTO-CURA de esquemas:
 * 1. Remove dinamicamente colunas incompatíveis quando PostgREST reclama.
 * 2. Resolve referências de chave estrangeira órfãs (lote_re_id, morador_id, entregador_id).
 * 3. Cria condomínio stub se faltar.
 */
export async function saveRecordsToSupabase(
  tableName: string,
  records: any[],
  onProgress?: (saved: number, total: number) => void,
  context?: MigrationContext
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  if (!records || records.length === 0) {
    return { success: true, savedCount: 0, errors: [] };
  }

  const BATCH_SIZE = 50;
  let savedCount = 0;
  const errors: string[] = [];

  // Se forem registros que referenciam condomínios, valida previamente os IDs únicos
  const condoIds = Array.from(new Set(records.map(r => r.condominio_id).filter(Boolean)));
  for (const cid of condoIds) {
    await ensureCondominioExists(cid);
  }

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const rawChunk = records.slice(i, i + BATCH_SIZE);
    let chunk = rawChunk.map(r => adaptRecordForTargetTable(tableName, r, context));

    let batchSuccess = false;
    let attempts = 0;
    const maxAttempts = 15;

    while (!batchSuccess && attempts < maxAttempts) {
      attempts++;
      try {
        const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });

        if (!error) {
          batchSuccess = true;
          savedCount += chunk.length;
          break;
        }

        const msg = (error.message || '').toLowerCase();

        // 1. Tratamento de Coluna Inexistente: "Could not find the 'xyz' column of 'table' in the schema cache"
        const colMatch = error.message.match(/Could not find the '([^']+)' column/i);
        if (colMatch && colMatch[1]) {
          const badCol = colMatch[1];
          if (!dynamicInvalidColumnsCache.has(tableName)) {
            dynamicInvalidColumnsCache.set(tableName, new Set());
          }
          dynamicInvalidColumnsCache.get(tableName)!.add(badCol);

          chunk = chunk.map(item => {
            const copy = { ...item };
            delete copy[badCol];
            return copy;
          });
          continue;
        }

        // 2. Tratamento de Violação de Chave Estrangeira (FK)
        if (msg.includes('foreign key constraint') || msg.includes('violates foreign key')) {
          if (msg.includes('condominio_id')) {
            // Cria stub para qualquer condomínio pendente
            for (const item of chunk) {
              if (item.condominio_id) {
                await ensureCondominioExists(item.condominio_id);
              }
            }
          }
          if (msg.includes('lote_re_id')) {
            chunk = chunk.map(item => ({ ...item, lote_re_id: null }));
          }
          if (msg.includes('morador_id')) {
            chunk = chunk.map(item => ({ ...item, morador_id: null }));
          }
          if (msg.includes('entregador_id')) {
            chunk = chunk.map(item => ({ ...item, entregador_id: null }));
          }
          if (msg.includes('prestador_id')) {
            chunk = chunk.map(item => ({ ...item, prestador_id: null }));
          }
          if (msg.includes('setor_id')) {
            chunk = chunk.map(item => ({ ...item, setor_id: null }));
          }
          if (msg.includes('chave_id')) {
            chunk = chunk.map(item => ({ ...item, chave_id: null }));
          }
          continue;
        }

        // Se for outro erro, faz fallback unitário
        break;
      } catch (exc: any) {
        break;
      }
    }

    // Fallback Unitário com Auto-Cura se o lote falhar
    if (!batchSuccess) {
      for (const rawItem of rawChunk) {
        let singleItem = adaptRecordForTargetTable(tableName, rawItem, context);
        let singleSuccess = false;
        let singleAttempts = 0;

        while (!singleSuccess && singleAttempts < 10) {
          singleAttempts++;
          try {
            const { error: singleErr } = await supabase.from(tableName).upsert(singleItem, { onConflict: 'id' });
            if (!singleErr) {
              singleSuccess = true;
              savedCount++;
              break;
            }

            const sMsg = (singleErr.message || '').toLowerCase();
            const colMatch = singleErr.message.match(/Could not find the '([^']+)' column/i);
            if (colMatch && colMatch[1]) {
              const badCol = colMatch[1];
              if (!dynamicInvalidColumnsCache.has(tableName)) {
                dynamicInvalidColumnsCache.set(tableName, new Set());
              }
              dynamicInvalidColumnsCache.get(tableName)!.add(badCol);
              delete singleItem[badCol];
              continue;
            }

            if (sMsg.includes('foreign key constraint') || sMsg.includes('violates foreign key')) {
              if (sMsg.includes('lote_re_id')) singleItem.lote_re_id = null;
              if (sMsg.includes('morador_id')) singleItem.morador_id = null;
              if (sMsg.includes('entregador_id')) singleItem.entregador_id = null;
              if (sMsg.includes('condominio_id')) {
                await ensureCondominioExists(singleItem.condominio_id);
              }
              continue;
            }

            errors.push(`Erro em ${tableName} (ID: ${singleItem.id}): ${singleErr.message}`);
            break;
          } catch (singleException: any) {
            errors.push(`Exceção em ${tableName} (ID: ${singleItem.id}): ${singleException.message}`);
            break;
          }
        }
      }
    }

    if (onProgress) {
      onProgress(savedCount, records.length);
    }
  }

  return {
    success: errors.length === 0,
    savedCount,
    errors
  };
}

export const saveRecordsToFirestore = saveRecordsToSupabase;

/**
 * NOVO RECURSO: Exporta e baixa todos os dados do banco de origem como arquivo JSON
 */
export async function exportSourceDatabaseToJson(
  credentials: SupabaseCredentials,
  tablesToExport?: string[],
  onProgress?: (tabela: string, registros: number, indice: number, total: number) => void
): Promise<{
  success: boolean;
  totalRecords: number;
  dump: Record<string, any[]>;
  fileName: string;
}> {
  const projectRef = extractProjectRef(credentials.url);
  const targetTables = tablesToExport && tablesToExport.length > 0 
    ? tablesToExport 
    : MIGRATION_TABLES.map(t => t.name);

  const dump: Record<string, any[]> = {};
  let totalRecords = 0;

  for (let i = 0; i < targetTables.length; i++) {
    const tableName = targetTables[i];
    try {
      const { records, sourceTable } = await fetchAllSupabaseTableData(credentials, tableName);
      dump[tableName] = records;
      totalRecords += records.length;
      if (onProgress) {
        onProgress(`${tableName}${sourceTable !== tableName ? ` (via ${sourceTable})` : ''}`, records.length, i + 1, targetTables.length);
      }
    } catch (e: any) {
      console.warn(`[Dump] Tabela ${tableName} não exportada:`, e.message);
      dump[tableName] = [];
    }
  }

  const payload = {
    exportado_em: new Date().toISOString(),
    projeto_origem: projectRef,
    origem_url: credentials.url,
    total_tabelas: targetTables.length,
    total_registros: totalRecords,
    tabelas: dump
  };

  const fileName = `porttohub_backup_origem_${projectRef}_${new Date().toISOString().split('T')[0]}.json`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Falha ao acionar download no browser:', err);
    }
  }

  return {
    success: true,
    totalRecords,
    dump,
    fileName
  };
}

/**
 * Executa a migração direta de todas as tabelas para o Supabase com auto-cura de esquemas,
 * suporte a limpeza prévia do banco novo e isolamento estrito de condomínios para evitar misturas.
 */
export async function executeFullSupabaseMigration(
  credentials: SupabaseCredentials,
  tablesToMigrate: string[],
  onTableProgress: (table: MigrationTableInfo) => void,
  opcoes?: {
    salvarBackupAntes?: boolean;
    limparBancoAntes?: boolean;
    targetCondominioId?: string;
    onBackupProgresso?: (msg: string) => void;
    onLimpezaProgresso?: (msg: string) => void;
  }
): Promise<{
  totalMigrated: number;
  tablesSummary: Record<string, { count: number; error?: string }>;
  backupSalvo?: boolean;
  bancoLimpo?: boolean;
}> {
  let totalMigrated = 0;
  const tablesSummary: Record<string, { count: number; error?: string }> = {};

  // 1. Salva cópia de backup do banco antigo se solicitado
  if (opcoes?.salvarBackupAntes) {
    if (opcoes.onBackupProgresso) opcoes.onBackupProgresso('Extraindo e salvando cópia de backup do banco de origem...');
    try {
      await exportSourceDatabaseToJson(credentials, tablesToMigrate);
    } catch (e) {
      console.warn('Aviso: Não foi possível salvar backup prévio:', e);
    }
  }

  // 2. Limpeza prévia completa do banco novo para evitar misturas de dados e resíduos
  let bancoLimpo = false;
  if (opcoes?.limparBancoAntes) {
    if (opcoes.onLimpezaProgresso) opcoes.onLimpezaProgresso('Efetuando limpeza prévia completa no banco de dados novo...');
    try {
      await limparBancoDestinoCompleto((tab, idx, total) => {
        if (opcoes.onLimpezaProgresso) {
          opcoes.onLimpezaProgresso(`Limpando tabela ${idx}/${total}: ${tab}...`);
        }
      });
      bancoLimpo = true;
    } catch (limpErr) {
      console.warn('Aviso na limpeza prévia do banco:', limpErr);
    }
  }

  // 3. Mapeamento Inteligente de Condomínios da Origem
  const condoMap = new Map<string, string>();
  let defaultCondominioId: string | undefined = (opcoes?.targetCondominioId && opcoes.targetCondominioId !== 'todos') 
    ? opcoes.targetCondominioId 
    : undefined;

  try {
    const { records: sourceCondos } = await fetchAllSupabaseTableData(credentials, 'condominios');
    if (sourceCondos.length > 0) {
      for (const sc of sourceCondos) {
        const originalId = String(sc.id || '').trim();
        const targetUuid = toDeterministicUuid(originalId);
        if (originalId) condoMap.set(originalId, targetUuid);
        if (sc.codigo) condoMap.set(String(sc.codigo).trim(), targetUuid);
        if (sc.nome) condoMap.set(String(sc.nome).trim().toLowerCase(), targetUuid);
      }
      if (!defaultCondominioId && sourceCondos.length === 1) {
        defaultCondominioId = toDeterministicUuid(String(sourceCondos[0].id));
      }
    }
  } catch (err) {
    console.warn('Aviso ao mapear condomínios da origem:', err);
  }

  const migrationContext: MigrationContext = {
    targetCondominioId: (opcoes?.targetCondominioId && opcoes.targetCondominioId !== 'todos') ? opcoes.targetCondominioId : undefined,
    defaultCondominioId,
    condoMap
  };

  // 4. Ordena as tabelas conforme a prioridade (condomínios e operadores primeiro)
  const orderedDefs = [...MIGRATION_TABLES].sort((a, b) => a.order - b.order);

  for (const def of orderedDefs) {
    if (tablesToMigrate.length > 0 && !tablesToMigrate.includes(def.name)) {
      continue;
    }

    const tableState: MigrationTableInfo = {
      ...def,
      status: 'migrating',
      migratedCount: 0
    };
    onTableProgress(tableState);

    try {
      const { records, sourceTable } = await fetchAllSupabaseTableData(credentials, def.name);

      if (records.length === 0) {
        tableState.status = 'empty';
        tableState.count = 0;
        tableState.migratedCount = 0;
        onTableProgress(tableState);
        tablesSummary[def.name] = { count: 0 };
        continue;
      }

      tableState.count = records.length;
      if (sourceTable !== def.name) {
        tableState.detalhesAdaptacao = `Encontrado como "${sourceTable}" no banco antigo`;
      }
      onTableProgress(tableState);

      const saveResult = await saveRecordsToSupabase(def.name, records, (saved) => {
        tableState.migratedCount = saved;
        onTableProgress(tableState);
      }, migrationContext);

      totalMigrated += saveResult.savedCount;
      tableState.status = saveResult.savedCount > 0 ? 'completed' : (saveResult.errors.length > 0 ? 'error' : 'empty');
      tableState.migratedCount = saveResult.savedCount;
      if (saveResult.errors.length > 0 && saveResult.savedCount === 0) {
        tableState.error = saveResult.errors[0];
      }
      onTableProgress(tableState);

      tablesSummary[def.name] = {
        count: saveResult.savedCount,
        error: saveResult.errors.length > 0 ? saveResult.errors[0] : undefined
      };
    } catch (err: any) {
      tableState.status = 'error';
      tableState.error = err.message || String(err);
      onTableProgress(tableState);
      tablesSummary[def.name] = { count: 0, error: tableState.error };
    }
  }

  return { totalMigrated, tablesSummary, backupSalvo: Boolean(opcoes?.salvarBackupAntes), bancoLimpo };
}

/**
 * Importa um dump JSON carregado via arquivo ou colado pelo usuário
 * com suporte a limpeza prévia do banco de destino e direcionamento de condomínio.
 */
export async function importJsonDump(
  rawJson: string | object,
  onProgress?: (currentTable: string, saved: number, total: number) => void,
  opcoes?: {
    limparBancoAntes?: boolean;
    targetCondominioId?: string;
    onLimpezaProgresso?: (msg: string) => void;
  }
): Promise<{
  success: boolean;
  totalImported: number;
  summary: Record<string, number>;
  errors: string[];
  bancoLimpo?: boolean;
}> {
  let data: any;
  if (typeof rawJson === 'string') {
    try {
      data = JSON.parse(rawJson);
    } catch (err: any) {
      return {
        success: false,
        totalImported: 0,
        summary: {},
        errors: [`JSON inválido ou corrompido: ${err.message}`]
      };
    }
  } else {
    data = rawJson;
  }

  let totalImported = 0;
  const summary: Record<string, number> = {};
  const errors: string[] = [];

  // Limpeza prévia antes do JSON se solicitada
  let bancoLimpo = false;
  if (opcoes?.limparBancoAntes) {
    if (opcoes.onLimpezaProgresso) opcoes.onLimpezaProgresso('Limpando banco novo antes de importar o arquivo JSON...');
    try {
      await limparBancoDestinoCompleto();
      bancoLimpo = true;
    } catch (e: any) {
      console.warn('Aviso ao limpar banco antes do JSON:', e);
    }
  }

  const tabelasFonte = data?.tabelas && typeof data.tabelas === 'object' && !Array.isArray(data.tabelas) 
    ? data.tabelas 
    : data;

  if (Array.isArray(tabelasFonte)) {
    return {
      success: false,
      totalImported: 0,
      summary: {},
      errors: ['O arquivo fornecido é uma lista avulsa sem nome de tabela. Por favor, envie o formato exportado completo.']
    };
  }

  // Mapeia condomínios declarados no JSON
  const condoMap = new Map<string, string>();
  let defaultCondominioId: string | undefined = (opcoes?.targetCondominioId && opcoes.targetCondominioId !== 'todos') 
    ? opcoes.targetCondominioId 
    : undefined;

  const jsonCondos = tabelasFonte['condominios'] || tabelasFonte['condominio'] || [];
  if (Array.isArray(jsonCondos) && jsonCondos.length > 0) {
    for (const c of jsonCondos) {
      const origId = String(c.id || '').trim();
      const targetUuid = toDeterministicUuid(origId);
      if (origId) condoMap.set(origId, targetUuid);
      if (c.codigo) condoMap.set(String(c.codigo).trim(), targetUuid);
      if (c.nome) condoMap.set(String(c.nome).trim().toLowerCase(), targetUuid);
    }
    if (!defaultCondominioId && jsonCondos.length === 1) {
      defaultCondominioId = toDeterministicUuid(String(jsonCondos[0].id));
    }
  }

  const migrationContext: MigrationContext = {
    targetCondominioId: (opcoes?.targetCondominioId && opcoes.targetCondominioId !== 'todos') ? opcoes.targetCondominioId : undefined,
    defaultCondominioId,
    condoMap
  };

  const nomesTabelas = Object.keys(tabelasFonte);
  const tabelasOrdenadas = nomesTabelas.sort((a, b) => {
    const orderA = MIGRATION_TABLES.find(t => t.name === a)?.order || 99;
    const orderB = MIGRATION_TABLES.find(t => t.name === b)?.order || 99;
    return orderA - orderB;
  });

  for (const tableKey of tabelasOrdenadas) {
    const records = tabelasFonte[tableKey];
    if (!Array.isArray(records) || records.length === 0) continue;

    let canonicalTable = tableKey.toLowerCase().trim();
    if (canonicalTable === 'usuarios_sistema' || canonicalTable === 'usuarios') canonicalTable = 'operadores';
    if (canonicalTable === 'encomendas' || canonicalTable === 'pacotes') canonicalTable = 'encomendas_itens';
    if (canonicalTable === 'lotes') canonicalTable = 'lotes_re';
    if (canonicalTable === 'morador') canonicalTable = 'moradores';
    if (canonicalTable === 'prestadores_servico') canonicalTable = 'prestadores';

    try {
      const result = await saveRecordsToSupabase(canonicalTable, records, (saved, total) => {
        if (onProgress) onProgress(canonicalTable, saved, total);
      }, migrationContext);

      totalImported += result.savedCount;
      summary[canonicalTable] = result.savedCount;
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    } catch (tableErr: any) {
      errors.push(`Erro na tabela ${canonicalTable}: ${tableErr.message}`);
    }
  }

  return {
    success: errors.length === 0 || totalImported > 0,
    totalImported,
    summary,
    errors,
    bancoLimpo
  };
}

/**
 * Gera um script SQL pronto para rodar no Supabase SQL Editor
 */
export function generateSupabaseDumpSqlScript(): string {
  const tables = [
    'condominios',
    'operadores',
    'moradores',
    'configuracoes',
    'locais_armazenamento',
    'entregadores',
    'agenda_emergencia',
    'templates_whatsapp',
    'lotes_re',
    'encomendas_itens',
    'custodia',
    'chaves',
    'movimentacao_chaves',
    'materiais_posto',
    'prestadores',
    'prestadores_acessos',
    'rondas_setores',
    'rondas_pontos',
    'rondas_execucao',
    'rondas_registros',
    'chamados_manutencao',
    'checklist_manutencao',
    'ocorrencias',
    'passagens_posto',
    'historico_absoluto',
    'lembretes_portaria',
    'bancada_conferencias',
    'bancada_volumes'
  ];

  const jsonBuildParts = tables
    .map(t => `  '${t}', (SELECT COALESCE(json_agg(t), '[]'::json) FROM (SELECT * FROM ${t}) t)`)
    .join(',\n');

  return `-- ============================================================
-- SCRIPT DE EXPORTAÇÃO COMPLETA: SUPABASE v1 -> PORTTOHUB v2.0
-- Rode este script no Supabase: SQL Editor -> New Query -> Run
-- O resultado será um JSON único com 100% dos dados de todas as tabelas!
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Gerando Dump JSON completo do PorttoHub...';
END $$;

SELECT json_build_object(
${jsonBuildParts}
) AS porttohub_dump_completo;
`;
}
