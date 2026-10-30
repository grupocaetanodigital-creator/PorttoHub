/**
 * Script de Geração Automática de Versão do PorttoHub
 * Padrão solicitado: DDMMAAHHMM (ex: 3010261530)
 * Fuso horário: Horário Oficial de Brasília (America/Sao_Paulo / UTC-3)
 * Gera sincronamente versaoService.ts, public/version.json e atualiza package.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function obterVersaoHorarioBrasil(data = new Date()) {
  const formatador = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const partes = formatador.formatToParts(data);
  const mapa = {};
  for (const p of partes) {
    mapa[p.type] = p.value;
  }

  const hora = mapa.hour === '24' ? '00' : (mapa.hour || '00').padStart(2, '0');
  const minuto = (mapa.minute || '00').padStart(2, '0');
  const dia = (mapa.day || '01').padStart(2, '0');
  const mes = (mapa.month || '01').padStart(2, '0');
  const ano = (mapa.year || '26').slice(-2);

  return `${dia}${mes}${ano}${hora}${minuto}`;
}

let commitHash = 'prod';
try {
  commitHash = execSync('git rev-parse --short HEAD', { timeout: 1500, stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
} catch {}

const versaoCalculada = obterVersaoHorarioBrasil();
const arquivoVersaoService = path.resolve(__dirname, '../src/services/versaoService.ts');
const arquivoPublicVersion = path.resolve(__dirname, '../public/version.json');
const arquivoPackageJson = path.resolve(__dirname, '../package.json');

// 1. Gera src/services/versaoService.ts
const conteudoVersaoService = `/**
 * Serviço de Versionamento do Aplicativo INFPORT / PorttoHub
 * Padrão solicitado: DDMMAAHHMM (ex: ${versaoCalculada})
 * Fuso Horário Obrigatório: Horário Oficial do Brasil (Brasília / America/Sao_Paulo - UTC-3)
 */

export const NOME_APLICACAO = 'PorttoHub';

export const FUSO_HORARIO_OFICIAL_BRASIL = 'America/Sao_Paulo';

// Versão de build gerada automaticamente no build (Horário de Brasília)
export const VERSAO_BUILD_ATUAL = '${versaoCalculada}';
export const COMMIT_HASH_ATUAL = '${commitHash}';

export function gerarVersaoHorarioBrasil(data: Date = new Date()): string {
  try {
    const formatador = new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO_HORARIO_OFICIAL_BRASIL,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const partes = formatador.formatToParts(data);
    const mapa: Record<string, string> = {};
    for (const p of partes) {
      mapa[p.type] = p.value;
    }

    const dia = (mapa.day || '01').padStart(2, '0');
    const mes = (mapa.month || '01').padStart(2, '0');
    const ano = (mapa.year || '26').slice(-2);
    const hora = mapa.hour === '24' ? '00' : (mapa.hour || '00').padStart(2, '0');
    const minuto = (mapa.minute || '00').padStart(2, '0');

    return \`\${dia}\${mes}\${ano}\${hora}\${minuto}\`;
  } catch (e) {
    return VERSAO_BUILD_ATUAL;
  }
}

export function obterVersaoApp(): string {
  return VERSAO_BUILD_ATUAL;
}

export function formatarVersaoParaExibicao(versao: string = VERSAO_BUILD_ATUAL): string {
  if (!versao || versao.length < 10) return versao;
  const dia = versao.slice(0, 2);
  const mes = versao.slice(2, 4);
  const ano = versao.slice(4, 6);
  const hora = versao.slice(6, 8);
  const min = versao.slice(8, 10);
  return \`\${dia}/\${mes}/\${ano} \${hora}:\${min} (BRT)\`;
}
`;

fs.writeFileSync(arquivoVersaoService, conteudoVersaoService, 'utf8');

// 2. Gera public/version.json estático para OTA no Vercel (zero dependência de backend/node)
const payloadVersionJson = {
  versao: versaoCalculada,
  commit: commitHash,
  dataIso: new Date().toISOString(),
  fuso: 'America/Sao_Paulo',
  sucesso: true
};

fs.writeFileSync(arquivoPublicVersion, JSON.stringify(payloadVersionJson, null, 2), 'utf8');

// 3. Atualiza package.json
try {
  if (fs.existsSync(arquivoPackageJson)) {
    const pkg = JSON.parse(fs.readFileSync(arquivoPackageJson, 'utf8'));
    pkg.version = versaoCalculada;
    fs.writeFileSync(arquivoPackageJson, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  }
} catch (e) {}

console.log(`[atualizar-versao] PorttoHub Build Version atualizada: ${versaoCalculada} (${commitHash})`);
