import { supabase } from '../src/services/supabase';

const CANONICAL_TABLES = [
  'condominios',
  'configuracoes',
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
  'chamados_manutencao',
  'checklist_manutencao',
  'rondas_setores',
  'rondas_pontos',
  'rondas_execucao',
  'rondas_registros',
  'passagens_posto',
  'ocorrencias',
  'prestadores',
  'prestadores_acessos',
  'templates_whatsapp',
  'agenda_emergencia',
  'historico_absoluto',
  'bancada_volumes',
  'bancada_conferencias',
  'lembretes_portaria'
];

async function main() {
  console.log('Verificando todas as 28 tabelas canônicas no Supabase...');
  const results = await Promise.all(
    CANONICAL_TABLES.map(async (table) => {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      return {
        table,
        ok: !error,
        error: error?.message,
        count
      };
    })
  );

  let okCount = 0;
  for (const r of results) {
    if (r.ok) {
      okCount++;
      console.log(`[OK] ${r.table.padEnd(25)} (registros: ${r.count ?? 0})`);
    } else {
      console.log(`[FALTA] ${r.table.padEnd(25)} - ${r.error}`);
    }
  }

  console.log(`\nTOTAL: ${okCount}/${CANONICAL_TABLES.length} tabelas operacionais.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
