/**
 * PorttoHub — Serviço de Importação, Exportação e Migração de Dados para Supabase
 * 
 * Permite extrair, salvar backups em JSON e migrar dados de bancos Supabase antigos
 * para o novo banco de dados Supabase ativo do PorttoHub com total integridade e segurança.
 */

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface MigrationTableInfo {
  name: string;
  label: string;
  category: string;
  order: number;
  count?: number;
  status: 'idle' | 'checking' | 'migrating' | 'completed' | 'empty' | 'error';
  migratedCount: number;
  error?: string;
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
  { name: 'bancada_volumes', label: 'Volumes de Bancada', category: 'Bancada', order: 28 },
  { name: 'fotos_armazenadas', label: 'Galeria & Fotos Armazenadas', category: 'Storage', order: 29 }
];

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export function normalizeSupabaseUrl(url: string): string {
  let cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

export function extractProjectRef(url: string): string {
  try {
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) return match[1];
    return 'custom';
  } catch {
    return 'desconhecido';
  }
}

/**
 * Higieniza rigorosamente um registro para inserção no banco de dados PostgreSQL do Supabase:
 * - Converte strings vazias "" em null para UUIDs (evita 'invalid input syntax for type uuid: ""')
 * - Converte strings vazias "" em null para timestamps e números
 * - Mapeia colunas legadas e normaliza booleanos
 */
export function sanitizeForSupabase(record: any): any {
  if (!record || typeof record !== 'object') return record;
  const sanitized: any = {};

  for (const [key, val] of Object.entries(record)) {
    if (val === undefined) continue;

    // Normalização de booleanos
    if (val === 'true') {
      sanitized[key] = true;
      continue;
    }
    if (val === 'false') {
      sanitized[key] = false;
      continue;
    }

    // Limpeza de campos vazios "" que quebram PostgreSQL (UUID, Timestamps, Inteiros)
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

    // Normalização de fotos e nomes de arquivos
    if (key === 'fileName' || key === 'filename' || key === 'file_name') {
      sanitized['filename'] = val;
      sanitized['file_name'] = val;
      continue;
    }

    // Normalização de colunas JSONB
    if (
      (key === 'veiculos' || key === 'dependentes' || key === 'tags_acesso' || key === 'feature_flags' || 
       key === 'locais_armazenamento' || key === 'fotos' || key === 'checklist_resumo' || key === 'itens_snapshot' || key === 'detalhes') &&
      typeof val === 'string'
    ) {
      try {
        sanitized[key] = JSON.parse(val);
        continue;
      } catch {
        // Se falhar o parse, mantém original
      }
    }

    sanitized[key] = val;
  }

  // Garante chave primária id válida
  if (!sanitized.id) {
    sanitized.id = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  return sanitized;
}

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
    return { success: false, message: 'Chave de API do Supabase inválida (deve ser a anon ou service_role).' };
  }

  const projectRef = extractProjectRef(url);

  try {
    const client = createSourceSupabaseClient(credentials);

    // Tenta ler de tabelas primárias
    const testTables = ['condominios', 'operadores', 'moradores', 'configuracoes'];
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
        message: `Erro de autenticação no Supabase: A chave fornecida é inválida ou expirou (${lastErrorMsg}).`
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
 */
export async function getSupabaseRowCount(
  credentials: SupabaseCredentials,
  tableName: string
): Promise<{ count: number; exists: boolean; error?: string }> {
  const client = createSourceSupabaseClient(credentials);

  try {
    const { count, error, status } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (!error) {
      return { count: count || 0, exists: true };
    }

    // Se a tabela não existe
    if (status === 404 || error.code === '42P01' || error.message?.includes('does not exist')) {
      return { count: 0, exists: false, error: 'Tabela não existe no banco de origem' };
    }

    // Fallback: tenta buscar até 1000 IDs
    const { data: idData, error: idErr } = await client.from(tableName).select('id').limit(1000);
    if (!idErr && Array.isArray(idData)) {
      return { count: idData.length, exists: true };
    }

    return { count: 0, exists: false, error: error.message };
  } catch (err: any) {
    return { count: 0, exists: false, error: err.message || String(err) };
  }
}

/**
 * Busca todos os registros de uma tabela no Supabase de forma resiliente e paginada
 */
export async function fetchAllSupabaseTableData(
  credentials: SupabaseCredentials,
  tableName: string
): Promise<any[]> {
  const client = createSourceSupabaseClient(credentials);
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();
  const PAGE_SIZE = 1000;
  let offset = 0;
  let allRecords: any[] = [];
  let hasMore = true;

  while (hasMore) {
    let batch: any[] = [];
    let fetchError: any = null;

    // 1. Tentativa via cliente oficial do Supabase
    try {
      const { data, error, status } = await client
        .from(tableName)
        .select('*')
        .range(offset, offset + PAGE_SIZE - 1);

      if (!error && Array.isArray(data)) {
        batch = data;
      } else {
        if (status === 404 || error?.code === '42P01' || error?.message?.includes('does not exist')) {
          return allRecords; // Tabela inexistente, retorna o que tem
        }
        fetchError = error;
      }
    } catch (e) {
      fetchError = e;
    }

    // 2. Fallback via requisição REST com limit e offset se o SDK falhar
    if (fetchError && batch.length === 0) {
      try {
        const fallbackUrl = `${url}/rest/v1/${tableName}?select=*&limit=${PAGE_SIZE}&offset=${offset}`;
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
          }
        } else if (res.status === 404) {
          return allRecords;
        } else {
          const errText = await res.text().catch(() => '');
          throw new Error(`Falha na tabela ${tableName} (${res.status}): ${errText || res.statusText}`);
        }
      } catch (err: any) {
        throw new Error(`Não foi possível puxar os dados de ${tableName}: ${err.message}`);
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

  return allRecords;
}

/**
 * NOVO RECURSO: Exporta e baixa todos os dados do banco de origem como arquivo JSON
 * Permite ao usuário salvar um backup completo de onde está puxando informações
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
      const records = await fetchAllSupabaseTableData(credentials, tableName);
      dump[tableName] = records;
      totalRecords += records.length;
      if (onProgress) {
        onProgress(tableName, records.length, i + 1, targetTables.length);
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

  // Dispara o download automático no navegador
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
 * Salva uma lista de registros no Supabase usando upsert com fallback unitário
 */
export async function saveRecordsToSupabase(
  tableName: string,
  records: any[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  if (!records || records.length === 0) {
    return { success: true, savedCount: 0, errors: [] };
  }

  const BATCH_SIZE = 50;
  let savedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE).map(r => sanitizeForSupabase(r));

    try {
      const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id', ignoreDuplicates: false });
      if (error) {
        // Tenta individualmente para isolar e salvar tudo o que for possível
        for (const item of chunk) {
          try {
            const { error: singleErr } = await supabase.from(tableName).upsert(item, { onConflict: 'id' });
            if (singleErr) {
              errors.push(`Erro em ${tableName} (ID: ${item.id}): ${singleErr.message}`);
            } else {
              savedCount++;
            }
          } catch (singleException: any) {
            errors.push(`Exceção em ${tableName} (ID: ${item.id}): ${singleException.message}`);
          }
        }
      } else {
        savedCount += chunk.length;
      }
    } catch (err: any) {
      // Fallback unitário se a requisição de lote explodir
      for (const item of chunk) {
        try {
          const { error: singleErr } = await supabase.from(tableName).upsert(item, { onConflict: 'id' });
          if (singleErr) {
            errors.push(`Erro em ${tableName}: ${singleErr.message}`);
          } else {
            savedCount++;
          }
        } catch (itemErr: any) {
          errors.push(`Falha em ${tableName}: ${itemErr.message}`);
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
 * Executa a migração direta de todas as tabelas para o Supabase
 */
export async function executeFullSupabaseMigration(
  credentials: SupabaseCredentials,
  tablesToMigrate: string[],
  onTableProgress: (table: MigrationTableInfo) => void,
  opcoes?: {
    salvarBackupAntes?: boolean;
    onBackupProgresso?: (msg: string) => void;
  }
): Promise<{
  totalMigrated: number;
  tablesSummary: Record<string, { count: number; error?: string }>;
  backupSalvo?: boolean;
}> {
  let totalMigrated = 0;
  const tablesSummary: Record<string, { count: number; error?: string }> = {};

  // Se solicitado, salva backup em JSON do banco de origem antes de iniciar
  let backupSalvo = false;
  if (opcoes?.salvarBackupAntes) {
    if (opcoes.onBackupProgresso) opcoes.onBackupProgresso('Extraindo e salvando cópia de backup do banco de origem...');
    try {
      await exportSourceDatabaseToJson(credentials, tablesToMigrate);
      backupSalvo = true;
    } catch (e) {
      console.warn('Aviso: Não foi possível salvar backup prévio:', e);
    }
  }

  // Ordena as tabelas conforme a prioridade (condomínios e operadores primeiro)
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
      const records = await fetchAllSupabaseTableData(credentials, def.name);

      if (records.length === 0) {
        tableState.status = 'empty';
        tableState.count = 0;
        tableState.migratedCount = 0;
        onTableProgress(tableState);
        tablesSummary[def.name] = { count: 0 };
        continue;
      }

      tableState.count = records.length;
      onTableProgress(tableState);

      const saveResult = await saveRecordsToSupabase(def.name, records, (saved) => {
        tableState.migratedCount = saved;
        onTableProgress(tableState);
      });

      totalMigrated += saveResult.savedCount;
      tableState.status = saveResult.errors.length > 0 ? (saveResult.savedCount > 0 ? 'completed' : 'error') : 'completed';
      tableState.migratedCount = saveResult.savedCount;
      if (saveResult.errors.length > 0) {
        tableState.error = `${saveResult.errors.length} erros durante a gravação (${saveResult.errors[0]}).`;
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

  return { totalMigrated, tablesSummary, backupSalvo };
}

/**
 * Importa um dump JSON carregado via arquivo ou colado pelo usuário
 */
export async function importJsonDump(
  rawJson: string | object,
  onProgress?: (currentTable: string, saved: number, total: number) => void
): Promise<{
  success: boolean;
  totalImported: number;
  summary: Record<string, number>;
  errors: string[];
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

  // Se o JSON contiver o envelope { exportado_em, tabelas: { ... } }
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

  // Ordena por ordem de prioridade de dependência
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
    if (canonicalTable === 'usuarios_sistema') canonicalTable = 'operadores';
    if (canonicalTable === 'encomendas') canonicalTable = 'encomendas_itens';

    try {
      const result = await saveRecordsToSupabase(canonicalTable, records, (saved, total) => {
        if (onProgress) onProgress(canonicalTable, saved, total);
      });

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
    errors
  };
}

/**
 * Gera um script SQL pronto para rodar no Supabase SQL Editor
 * que gera um dump JSON consolidado de todas as tabelas em 1 segundo
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
