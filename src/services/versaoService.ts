/**
 * Serviço de Versionamento do Aplicativo INFPORT / PorttoHub
 * Padrão solicitado: DDMMAAHHMM (ex: 2410261730)
 */

export const NOME_APLICACAO = 'PorttoHub';

// Versão de build gravada da última modificação
export const VERSAO_BUILD_ATUAL = '2410261730';

/**
 * Retorna a string da versão formatada
 */
export function obterVersaoApp(): string {
  return VERSAO_BUILD_ATUAL;
}
