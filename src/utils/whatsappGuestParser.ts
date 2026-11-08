/**
 * Utilitário de Higienização e Parser Inteligente de Lista de Convidados do WhatsApp
 * Converte textos brutos colados do WhatsApp em lista estruturada de convidados (Nome + Documento).
 */

export interface ConvidadoExtraido {
  id: string;
  nome: string;
  documento?: string;
  linhaOriginal: string;
}

// Cabeçalhos comuns de mensagens de WhatsApp a serem desconsiderados
const REGEX_CABECALHOS_WHATSAPP = /^(lista|convidados?|total|anivers[aá]rio|churrasco|festa|evento|morador|unidade|apto|apartamento|bloco|data|hor[aá]rio|observa[cç][oõ]es?|por\s+favor|favor\s+liberar|segue\s+(a\s+)?lista|confirmados?|n[aã]o\s+confirmados?|crian[cç]as?|adultos?|aten[cç][aã]o|entrada|libera[cç][aã]o|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite)/i;

const REGEX_DATA_HORA_WHATSAPP = /^\[?\d{1,2}[:/]\d{1,2}(?:[:/]\d{2,4})?(?:,\s*\d{1,2}:\d{2}(?::\d{2})?)?\]?\s*[^:]*:/;

/**
 * Processa a string colada do WhatsApp e sanitiza automaticamente os registros
 */
export function parseListaConvidadosWhatsApp(textoBruto: string): ConvidadoExtraido[] {
  if (!textoBruto || typeof textoBruto !== 'string') return [];

  const linhas = textoBruto.split(/\r?\n/);
  const resultado: ConvidadoExtraido[] = [];

  for (let i = 0; i < linhas.length; i++) {
    let linha = linhas[i].trim();
    if (!linha) continue;

    // Remove carimbo de data/hora comum quando mensagem é encaminhada ou copiada com cabeçalho
    if (REGEX_DATA_HORA_WHATSAPP.test(linha)) {
      linha = linha.replace(REGEX_DATA_HORA_WHATSAPP, '').trim();
    }
    if (!linha) continue;

    // Ignora linhas que são apenas títulos ou cabeçalhos
    const linhaSemPontuacao = linha.replace(/[:\-–—\.]/g, ' ').trim();
    if (
      REGEX_CABECALHOS_WHATSAPP.test(linhaSemPontuacao) &&
      (linha.endsWith(':') || linhaSemPontuacao.split(/\s+/).length <= 4)
    ) {
      if (!linha.match(/\d{5,}/) && linha.length < 40) {
        continue;
      }
    }

    // 1. Remove numerações iniciais (ex: "1.", "01 -", "1)", "1 - ", marcadores, emojis)
    linha = linha
      .replace(/^[\s\d]+[\.\-\)\–\—]\s*/, '')
      .replace(/^[\*\•\-\–\—\>\#\+\~▪▫✅👤👉]\s*/, '')
      .trim();

    if (!linha) continue;

    // 2. Extrai documento (RG / CPF / Documento) se fornecido na mesma linha
    let documento: string | undefined = undefined;
    let nome = linha;

    // Padrão A: Em parênteses, ex: "(RG: 12.345.678-9)" ou "(CPF 123.456.789-00)"
    const matchParenteses = nome.match(/\((?:(?:RG|CPF|Doc|Documento)[:\s]*)?([0-9\.\-\/XxeE]{5,})\)/i);
    if (matchParenteses) {
      documento = matchParenteses[1].trim();
      nome = nome.replace(matchParenteses[0], '').trim();
    }

    // Padrão B: Com prefixo identificador de documento, ex: " - RG 12345678"
    if (!documento) {
      const matchDocComPalavra = nome.match(/(?:[-–—/,;]|\s+)\b(?:RG|CPF|DOC|DOCUMENTO)[:\s]*([0-9\.\-\/XxeE]{5,})/i);
      if (matchDocComPalavra) {
        documento = matchDocComPalavra[1].trim();
        nome = nome.substring(0, matchDocComPalavra.index).trim();
      }
    }

    // Padrão C: Separado por hífen ou vírgula com sequência numérica, ex: "Carlos Silva, 451234567"
    if (!documento) {
      const matchDocSeparador = nome.match(/[-–—/,;]\s*([0-9\.\-\/XxeE]{6,})\s*$/);
      if (matchDocSeparador) {
        documento = matchDocSeparador[1].trim();
        nome = nome.substring(0, matchDocSeparador.index).trim();
      }
    }

    // 3. Limpeza e sanitização final do Nome
    nome = nome
      .replace(/^[\*\_\~]+|[\*\_\~]+$/g, '')
      .replace(/[\-–—,;:\.\/]+$/, '')
      .trim();

    if (nome.length < 2 || /^\d+$/.test(nome)) continue;

    nome = formatarNomeCapitalizado(nome);

    resultado.push({
      id: `conv-${Date.now()}-${resultado.length}-${Math.random().toString(36).substring(2, 6)}`,
      nome,
      documento,
      linhaOriginal: linhas[i]
    });
  }

  return resultado;
}

/**
 * Formata nome em Capitalização Adequada, respeitando preposições em minúsculas
 */
function formatarNomeCapitalizado(str: string): string {
  const minusculas = ['de', 'da', 'do', 'dos', 'das', 'e'];
  return str
    .split(/\s+/)
    .map((palavra, idx) => {
      const lower = palavra.toLowerCase();
      if (idx > 0 && minusculas.includes(lower)) {
        return lower;
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(' ');
}
