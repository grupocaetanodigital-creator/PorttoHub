#!/usr/bin/env node
/**
 * ==============================================================================
 * PORTTOHUB - SCRIPT DE INICIALIZAÇÃO AUTOMÁTICA DO BANCO DE DADOS NA ORACLE CLOUD
 * ==============================================================================
 * Executa todas as instruções SQL de criação das tabelas (Módulos 01 a 12),
 * índices, triggers e dados iniciais no PostgreSQL da sua VM na OCI (163.176.49.21).
 * 
 * Uso:
 *   node scripts/inicializar_banco_oci.js
 *   ou
 *   node scripts/inicializar_banco_oci.js postgres://postgres:SUA_SENHA@163.176.49.21:5432/porttohub
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { execSync } from 'child_process';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// IP padrão da Máquina Virtual da Oracle Cloud do usuário
const OCI_VM_IP = '163.176.49.21';

// Prioridade da string de conexão:
// 1. Argumento CLI (argv[2])
// 2. Variável de ambiente DATABASE_URL / PG_URI
// 3. Conexão padrão configurada no docker-compose.oci.yml
const connectionString = 
  process.argv[2] ||
  process.env.DATABASE_URL ||
  process.env.PG_URI ||
  `postgres://postgres:porttohub_postgres_root_pwd_2026@${OCI_VM_IP}:5432/porttohub`;

console.log('====================================================================');
console.log('🚀 PORTTOHUB: INICIALIZAÇÃO DE BANCO DE DADOS NA ORACLE CLOUD');
console.log('====================================================================');
console.log(`📡 Alvo: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

// Localiza o arquivo SQL
const caminhoSql = path.resolve(__dirname, '../oracle_cloud_postgresql_porttohub.sql');

if (!fs.existsSync(caminhoSql)) {
  console.error(`❌ Arquivo SQL não encontrado em: ${caminhoSql}`);
  process.exit(1);
}

const conteudoSql = fs.readFileSync(caminhoSql, 'utf-8');

async function executarMigracaoComPg() {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 7000,
    ssl: false
  });

  try {
    console.log('🔄 Conectando ao PostgreSQL via TCP...');
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    console.log('📦 Executando script SQL completo dos Módulos 01 a 12...');
    await client.query(conteudoSql);

    console.log('🔍 Validando tabelas criadas...');
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('====================================================================');
    console.log(`🎉 SUCESSO! ${res.rows.length} TABELAS CRIADAS/VERIFICADAS NO BANCO:`);
    console.log('====================================================================');
    res.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

    // Mostra dados do condomínio inicial
    const condo = await client.query(`SELECT id, nome FROM condominios LIMIT 1;`);
    if (condo.rows.length > 0) {
      console.log(`\n🏢 Condomínio Ativo: ${condo.rows[0].nome} (${condo.rows[0].id})`);
    }

    // Mostra operador inicial
    const op = await client.query(`SELECT login, perfil FROM operadores WHERE login = 'admin' LIMIT 1;`);
    if (op.rows.length > 0) {
      console.log(`🔑 Login Inicial: admin | Senha: admin123 (Perfil: ${op.rows[0].perfil})`);
    }

    await client.end();
    return true;
  } catch (err) {
    console.warn(`⚠️ Não foi possível conectar diretamente via TCP externo: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

// Fallback: se estiver rodando dentro da própria VM via SSH/Docker
function executarViaDockerLocal() {
  console.log('\n🔄 Tentando execução local via Docker na própria Máquina Virtual...');
  try {
    execSync(`docker exec -i porttohub_postgres psql -U postgres -d porttohub < "${caminhoSql}"`, {
      stdio: 'inherit'
    });
    console.log('🎉 SUCESSO! Script SQL executado diretamente via Docker Container.');
    return true;
  } catch (e) {
    console.error('❌ Falha ao tentar executar via Docker local:', e.message);
    return false;
  }
}

async function main() {
  const sucessoPg = await executarMigracaoComPg();
  if (sucessoPg) {
    console.log('\n✨ Banco de dados 100% pronto para uso com o PorttoHub!');
    process.exit(0);
  }

  const sucessoDocker = executarViaDockerLocal();
  if (sucessoDocker) {
    process.exit(0);
  }

  console.log('\n💡 DICA DE CONEXÃO:');
  console.log('Se o comando não conseguiu conectar à porta 5432 da VM externa (163.176.49.21):');
  console.log('1. A porta 5432 pode estar protegida no Firewall da Oracle Cloud (o que é ótimo para segurança!).');
  console.log('2. Você pode rodar este comando DIRETAMENTE dentro da sua VM colando no terminal dela:');
  console.log('   docker exec -i porttohub_postgres psql -U postgres -d porttohub < oracle_cloud_postgresql_porttohub.sql');
  console.log('   ou');
  console.log('   node scripts/inicializar_banco_oci.js postgres://postgres:porttohub_postgres_root_pwd_2026@127.0.0.1:5432/porttohub');
}

main();
