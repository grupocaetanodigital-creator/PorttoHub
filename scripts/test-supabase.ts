import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkeizhscivyfjgetnbke.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES_TO_CHECK = [
  'condominios',
  'operadores',
  'moradores',
  'entregadores',
  'lotes_re',
  'encomendas_itens',
  'locais_armazenamento',
  'custodia',
  'materiais_posto',
  'chaves',
  'movimentacao_chaves',
  'prestadores_obras',
  'entradas_prestadores',
  'manutencoes',
  'ocorrencias_livro',
  'passagens_posto',
  'rotas_ronda',
  'pontos_ronda',
  'execucoes_ronda',
  'leituras_ronda',
  'auditoria_sistema',
  // Legadas / duplicadas que possam existir:
  'usuarios_sistema',
  'unidades',
  'blocos',
  'encomendas',
  'custodia_itens',
  'materiais',
  'inspecoes_materiais',
  'movimentacoes_chaves',
  'prestadores',
  'visitas_prestadores',
  'ocorrencias',
  'passagem_posto',
  'passagens_plantao',
  'pontos_verificacao',
  'rondas_executadas'
];

async function runDiagnosis() {
  console.log('=== TESTE DE CONECTIVIDADE E TABELAS SUPABASE ===');
  console.log('URL:', supabaseUrl);

  const results: Record<string, any> = {};

  for (const table of TABLES_TO_CHECK) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        results[table] = {
          exists: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        };
      } else {
        const sampleRow = data && data[0] ? Object.keys(data[0]) : [];
        results[table] = {
          exists: true,
          count: count ?? data?.length,
          columns: sampleRow,
          sample: data?.[0]
        };
      }
    } catch (e: any) {
      results[table] = {
        exists: false,
        error: e.message
      };
    }
  }

  console.log('\n--- RESULTADOS POR TABELA ---');
  let existingCount = 0;
  let missingCount = 0;

  for (const [table, res] of Object.entries(results)) {
    if (res.exists) {
      existingCount++;
      console.log(`✅ [EXISTE] ${table.padEnd(25)} | Linhas: ${res.count} | Colunas detectadas: ${res.columns.length > 0 ? res.columns.join(', ') : '(Tabela vazia)'}`);
    } else {
      missingCount++;
      console.log(`❌ [FALTA OU ERRO] ${table.padEnd(25)} | Erro: ${res.error} (código: ${res.code || 'N/A'})`);
    }
  }

  console.log(`\nResumo: ${existingCount} tabelas encontradas, ${missingCount} com erro ou inexistentes.`);
}

runDiagnosis().catch(console.error);
