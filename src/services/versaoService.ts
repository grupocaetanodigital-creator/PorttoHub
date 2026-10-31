/**
 * Serviço de Versionamento do Aplicativo INFPORT / PorttoHub
 * Padrão solicitado: DDMMAAHHMM (ex: 3010262309)
 * Fuso Horário Obrigatório: Horário Oficial do Brasil (Brasília / America/Sao_Paulo - UTC-3)
 */

export const NOME_APLICACAO = 'PorttoHub';

export const FUSO_HORARIO_OFICIAL_BRASIL = 'America/Sao_Paulo';

// Versão de build gerada automaticamente no build (Horário de Brasília)
export const VERSAO_BUILD_ATUAL = '3010262309';
export const COMMIT_HASH_ATUAL = 'bf58573';

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

    return `${dia}${mes}${ano}${hora}${minuto}`;
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
  return `${dia}/${mes}/${ano} ${hora}:${min} (BRT)`;
}
