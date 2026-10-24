/**
 * PorttoHub — Serviço de Migração Supabase (v1) → Firebase Firestore (v2.0)
 * 
 * Permite extrair 100% dos dados legados de qualquer projeto Supabase e migrar
 * para a nova arquitetura do PorttoHub v2.0 preservando IDs, datas, fotos e relacionamentos.
 */

import { db } from './firebase';
import { doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';

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
  // 1. Cadastros e Tenants Raiz (Prioridade 1)
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

/**
 * Normaliza a URL do Supabase removendo barras finais e espaços
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Limpa objetos recursivamente para que o Firestore aceite (remove 'undefined')
 */
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      result[key] = null;
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Testa conexão direta com o Supabase via PostgREST API
 */
export async function testSupabaseConnection(credentials: SupabaseCredentials): Promise<{
  success: boolean;
  message: string;
  projectRef?: string;
}> {
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();

  if (!url || !key) {
    return { success: false, message: 'URL e Chave do Supabase são obrigatórias.' };
  }

  try {
    // Tenta consultar a rota OpenAPI raiz ou uma tabela padrão com limit 1
    const testEndpoints = [
      `${url}/rest/v1/condominios?select=id&limit=1`,
      `${url}/rest/v1/operadores?select=id&limit=1`,
      `${url}/rest/v1/?`
    ];

    let lastError = '';
    for (const endpoint of testEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok || res.status === 200 || res.status === 206) {
          const match = url.match(/https?:\/\/([^.]+)\./);
          const projectRef = match ? match[1] : 'supabase-v1';
          return {
            success: true,
            message: `Conexão estabelecida com sucesso com o Supabase (${projectRef})!`,
            projectRef
          };
        } else if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            message: 'Erro de autenticação no Supabase: A chave fornecida (API Key) é inválida ou expirou.'
          };
        } else {
          lastError = `Status ${res.status}: ${res.statusText}`;
        }
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    return {
      success: false,
      message: `Não foi possível comunicar com o Supabase: ${lastError}. Verifique a URL e se o CORS está liberado.`
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
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();

  try {
    const res = await fetch(`${url}/rest/v1/${tableName}?select=*`, {
      method: 'HEAD',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact'
      }
    });

    if (res.ok || res.status === 200 || res.status === 206) {
      const contentRange = res.headers.get('content-range');
      if (contentRange) {
        const parts = contentRange.split('/');
        if (parts.length > 1 && !isNaN(Number(parts[1]))) {
          return { count: Number(parts[1]), exists: true };
        }
      }
      return { count: 0, exists: true };
    }

    if (res.status === 404) {
      return { count: 0, exists: false, error: 'Tabela não existe no banco antigo' };
    }

    // Fallback: consulta com limit 1000
    const fallbackRes = await fetch(`${url}/rest/v1/${tableName}?select=id&limit=1000`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });

    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      return { count: Array.isArray(data) ? data.length : 0, exists: true };
    }

    return { count: 0, exists: false, error: `Status ${res.status}` };
  } catch (err: any) {
    return { count: 0, exists: false, error: err.message };
  }
}

/**
 * Busca todos os registros de uma tabela no Supabase paginando com Range
 */
export async function fetchAllSupabaseTableData(
  credentials: SupabaseCredentials,
  tableName: string,
  onBatchFetched?: (count: number) => void
): Promise<any[]> {
  const url = normalizeSupabaseUrl(credentials.url);
  const key = credentials.key.trim();
  const PAGE_SIZE = 1000;
  let offset = 0;
  let allRecords: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const rangeHeader = `${offset}-${offset + PAGE_SIZE - 1}`;
    const res = await fetch(`${url}/rest/v1/${tableName}?select=*`, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: rangeHeader
      }
    });

    if (!res.ok) {
      if (res.status === 404) break; // Tabela não existe
      throw new Error(`Falha ao buscar tabela ${tableName} (${res.status}: ${res.statusText})`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
      break;
    }

    allRecords = allRecords.concat(data);
    if (onBatchFetched) onBatchFetched(allRecords.length);

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
    }
  }

  return allRecords;
}

/**
 * Salva uma lista de registros no Firestore em lotes de até 250 documentos
 */
export async function saveRecordsToFirestore(
  tableName: string,
  records: any[],
  onProgress?: (saved: number, total: number) => void
): Promise<{ success: boolean; savedCount: number; errors: string[] }> {
  if (!records || records.length === 0) {
    return { success: true, savedCount: 0, errors: [] };
  }

  const BATCH_SIZE = 200; // Limite seguro abaixo dos 500 do Firestore
  let savedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const record of chunk) {
      try {
        const sanitized = sanitizeForFirestore(record);
        // Identificador primário: id, uuid, codigo, ou autogerado
        const docId = String(record.id || record.uuid || record.codigo || `${tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        
        // Garante que o documento contenha o ID e marcas de tempo
        sanitized.id = docId;
        if (!sanitized.updated_at) {
          sanitized.updated_at = new Date().toISOString();
        }

        const docRef = doc(db, tableName, docId);
        batch.set(docRef, sanitized, { merge: true });
      } catch (err: any) {
        errors.push(`Erro ao preparar doc na tabela ${tableName}: ${err.message}`);
      }
    }

    try {
      await batch.commit();
      savedCount += chunk.length;
      if (onProgress) {
        onProgress(savedCount, records.length);
      }
    } catch (commitErr: any) {
      // Se falhar o batch coletivo, tenta item por item para não abortar tudo
      for (const record of chunk) {
        try {
          const sanitized = sanitizeForFirestore(record);
          const docId = String(record.id || record.uuid || record.codigo || `${tableName}_${Date.now()}`);
          sanitized.id = docId;
          await setDoc(doc(db, tableName, docId), sanitized, { merge: true });
          savedCount++;
        } catch (individualErr: any) {
          errors.push(`Erro individual em ${tableName} ID ${record.id}: ${individualErr.message}`);
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    savedCount,
    errors
  };
}

/**
 * Executa a migração direta de todas as tabelas do Supabase para o Firestore
 */
export async function executeFullSupabaseMigration(
  credentials: SupabaseCredentials,
  tablesToMigrate: string[],
  onTableProgress: (table: MigrationTableInfo) => void
): Promise<{
  totalMigrated: number;
  tablesSummary: Record<string, { count: number; error?: string }>;
}> {
  let totalMigrated = 0;
  const tablesSummary: Record<string, { count: number; error?: string }> = {};

  for (const def of MIGRATION_TABLES) {
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
      // 1. Busca dados no Supabase
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

      // 2. Salva no Firestore
      const saveResult = await saveRecordsToFirestore(def.name, records, (saved, total) => {
        tableState.migratedCount = saved;
        onTableProgress(tableState);
      });

      totalMigrated += saveResult.savedCount;
      tableState.status = saveResult.errors.length > 0 ? 'error' : 'completed';
      tableState.migratedCount = saveResult.savedCount;
      if (saveResult.errors.length > 0) {
        tableState.error = `${saveResult.errors.length} erros durante o salvamento.`;
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

  // Garante que o operador admin master continue ativo após a migração
  try {
    const adminRef = doc(db, 'operadores', 'admin_master_root');
    await setDoc(adminRef, {
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
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[Migracao] Aviso ao assegurar admin:', err);
  }

  return { totalMigrated, tablesSummary };
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

  // Se o JSON for um array de uma tabela única (ex: [{id: 1, ...}])
  // ou se for um dicionário mapeado: { "moradores": [...], "encomendas_itens": [...] }
  if (Array.isArray(data)) {
    return {
      success: false,
      totalImported: 0,
      summary: {},
      errors: ['O arquivo fornecido é uma lista avulsa sem nome de tabela. Por favor, envie o formato exportado completo ou indique a tabela.']
    };
  }

  for (const [tableKey, records] of Object.entries(data)) {
    if (!Array.isArray(records) || records.length === 0) continue;

    // Normaliza nome de tabela legada se necessário
    let canonicalTable = tableKey.toLowerCase().trim();
    if (canonicalTable === 'usuarios_sistema') canonicalTable = 'operadores';
    if (canonicalTable === 'encomendas') canonicalTable = 'encomendas_itens';

    try {
      const result = await saveRecordsToFirestore(canonicalTable, records, (saved, total) => {
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
    success: errors.length === 0,
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
  RAISE NOTICE 'Gerando Dump JSON completo para migração ao PorttoHub v2.0...';
END $$;

SELECT json_build_object(
${jsonBuildParts}
) AS porttohub_v2_dump_completo;
`;
}
