import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkeizhscivyfjgetnbke.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCrud() {
  console.log('=== VERIFICANDO CONECTIVIDADE E LEITURA DAS TABELAS ESSENCIAIS ===');

  // 1. Condomínios
  const { data: condos, error: errCondo } = await supabase.from('condominios').select('*').limit(3);
  console.log('1. condominios:', errCondo ? `ERRO: ${errCondo.message}` : `OK (${condos?.length} retornados)`);
  if (condos && condos[0]) {
    console.log('   Exemplo condomínio:', condos[0].nome, '| ID:', condos[0].id);
  }

  // 2. Operadores
  const { data: ops, error: errOps } = await supabase.from('operadores').select('*').limit(3);
  console.log('2. operadores:', errOps ? `ERRO: ${errOps.message}` : `OK (${ops?.length} retornados)`);
  if (ops && ops[0]) {
    console.log('   Exemplo operador:', ops[0].nome, '| Login:', ops[0].login);
  }

  // 3. Moradores
  const { data: mors, error: errMors } = await supabase.from('moradores').select('*').limit(3);
  console.log('3. moradores:', errMors ? `ERRO: ${errMors.message}` : `OK (${mors?.length} retornados)`);
  if (mors && mors[0]) {
    console.log('   Exemplo morador:', mors[0].nome, '| Bloco:', mors[0].bloco, '| Unidade:', mors[0].unidade);
  }

  // 4. Encomendas Itens
  const { data: encs, error: errEncs } = await supabase.from('encomendas_itens').select('*').limit(3);
  console.log('4. encomendas_itens:', errEncs ? `ERRO: ${errEncs.message}` : `OK (${encs?.length} retornados)`);
  if (encs && encs[0]) {
    console.log('   Exemplo item:', encs[0].codigo_barras, '| Status:', encs[0].status, '| Local:', encs[0].local_armazenamento);
  }

  // 5. Chaves e Movimentação
  const { data: chvs, error: errChvs } = await supabase.from('chaves').select('*').limit(3);
  console.log('5. chaves:', errChvs ? `ERRO: ${errChvs.message}` : `OK (${chvs?.length} retornados)`);

  const { data: movs, error: errMovs } = await supabase.from('movimentacao_chaves').select('*').limit(3);
  console.log('6. movimentacao_chaves:', errMovs ? `ERRO: ${errMovs.message}` : `OK (${movs?.length} retornados)`);

  // 7. Rondas
  const { data: rPontos, error: errRPontos } = await supabase.from('rondas_pontos').select('*').limit(3);
  console.log('7. rondas_pontos:', errRPontos ? `ERRO: ${errRPontos.message}` : `OK (${rPontos?.length} retornados)`);

  const { data: rExec, error: errRExec } = await supabase.from('rondas_execucao').select('*').limit(3);
  console.log('8. rondas_execucao:', errRExec ? `ERRO: ${errRExec.message}` : `OK (${rExec?.length} retornados)`);

  // 9. Prestadores
  const { data: prest, error: errPrest } = await supabase.from('prestadores').select('*').limit(3);
  console.log('9. prestadores:', errPrest ? `ERRO: ${errPrest.message}` : `OK (${prest?.length} retornados)`);

  // 10. Passagens de Posto
  const { data: pass, error: errPass } = await supabase.from('passagens_posto').select('*').limit(3);
  console.log('10. passagens_posto:', errPass ? `ERRO: ${errPass.message}` : `OK (${pass?.length} retornados)`);

  // 11. Ocorrências
  const { data: ocs, error: errOcs } = await supabase.from('ocorrencias').select('*').limit(3);
  console.log('11. ocorrencias:', errOcs ? `ERRO: ${errOcs.message}` : `OK (${ocs?.length} retornados)`);

  // 12. Materiais
  const { data: mats, error: errMats } = await supabase.from('materiais_posto').select('*').limit(3);
  console.log('12. materiais_posto:', errMats ? `ERRO: ${errMats.message}` : `OK (${mats?.length} retornados)`);

  // 13. Custódia
  const { data: cust, error: errCust } = await supabase.from('custodia').select('*').limit(3);
  console.log('13. custodia:', errCust ? `ERRO: ${errCust.message}` : `OK (${cust?.length} retornados)`);

  // 14. Configurações
  const { data: cfg, error: errCfg } = await supabase.from('configuracoes').select('*').limit(3);
  console.log('14. configuracoes:', errCfg ? `ERRO: ${errCfg.message}` : `OK (${cfg?.length} retornados)`);
}

testCrud().catch(console.error);
