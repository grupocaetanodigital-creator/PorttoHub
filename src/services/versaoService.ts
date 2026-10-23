/**
 * Serviço de Versionamento do Aplicativo INFPORT
 * Padrão solicitado: DDMMAAHHMM (ex: 2310260025)
 * Onde:
 * - 23: Dia
 * - 10: Mês
 * - 26: Ano (2026)
 * - 00: Hora
 * - 25: Minutos
 */

export const NOME_APLICACAO = 'INFPORT';

// Versão de build gravada da última modificação
export const VERSAO_BUILD_ATUAL = '2310261134';

/**
 * Retorna a string da versão formatada
 */
export function obterVersaoApp(): string {
  return VERSAO_BUILD_ATUAL;
}
