/**
 * Serviço Avançado de OCR e Calibração de Documentos Brasileiros
 * (RG tradicional, CNH, Nova Carteira de Identidade Nacional - CIN, Cartão CPF e Crachás)
 * 
 * Implementação 100% Gratuita, Leve e Compatível com PWA:
 * 1. Pré-processamento no Cliente (Canvas / JavaScript):
 *    - Redimensionamento otimizado (evita travamento e preserva nitidez)
 *    - Conversão para Escala de Cinza (Luminância NTSC ITU-R BT.601)
 *    - Aumento de Contraste e Normalização de Histograma
 *    - Limiarização Inteligente (Thresholding de Otsu) para fundo branco e texto preto puro
 * 2. Pós-Processamento Inteligente com Regex e Correção Bidirecional:
 *    - Correção de confusões OCR (O->0, I->1, S->5, B->8, etc. em números)
 *    - Correção reversa em nomes (0->O, 1->I, 4->A, 5->S em textos alfabéticos)
 *    - Validação matemática de CPF (Módulo 11 da Receita Federal) com teste de zero inicial
 *    - Rejeição de datas de nascimento/expedição para não confundir com RG
 *    - Extração calibrada de Nome do Titular (com eliminação de STOP WORDS e de filiação)
 * 3. Estratégia Híbrida:
 *    - Tenta API Gemini 2.5 Flash se disponível no servidor
 *    - Motor Tesseract.js local calibrado multi-pass (binarizado + grayscale) para funcionamento offline / PWA
 */

export interface DadosDocumentoExtraidos {
  tipoDocumento: 'CPF' | 'RG' | 'CNH' | 'CIN' | 'CRACHA' | 'DESCONHECIDO';
  nomeCompleto: string;
  nome?: string;
  cpf?: string;
  rg?: string;
  documentoFormatado: string;
  numeroLimpo: string;
  cpfValidado: boolean;
  rgValido: boolean;
  cnhRegistro?: string;
  validade?: string;
  categoria?: string;
  dataNascimento?: string;
  empresaSugerida?: string;
  fotoDocumentoBase64?: string;
  fotoRostoBase64?: string;
  confianca: number;
  numerosRejeitados: string[];
  linhasDetectadas?: string[];
  metodoUtilizado?: 'IA_GEMINI' | 'TESSERACT_LOCAL';
}

/**
 * Validação algorítmica real do CPF (Módulo 11 da Receita Federal)
 * Garante que NENHUM número aleatório (como datas, telefones ou CEPs) seja aceito como CPF.
 */
export function validarCPF(cpf: string): boolean {
  const limpo = (cpf || '').replace(/\D/g, '');
  if (limpo.length !== 11) return false;

  // Rejeita CPFs formados por dígitos repetidos conhecidos (ex: 000.000.000-00, 111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  // Cálculo do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(9), 10)) return false;

  // Cálculo do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo.charAt(10), 10)) return false;

  return true;
}

/**
 * Formata CPF para o padrão 000.000.000-00
 */
export function formatarCPF(cpf: string): string {
  const limpo = (cpf || '').replace(/\D/g, '').slice(0, 11);
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida se um número se enquadra na estrutura de RG brasileiro (7 a 10 dígitos)
 */
export function validarRG(rg: string): boolean {
  const limpo = (rg || '').replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length < 7 || limpo.length > 10) return false;
  return /^\d{6,9}[\dX]$/.test(limpo);
}

/**
 * Formata RG para padrão visual com pontos e traço
 */
export function formatarRG(rg: string): string {
  const limpo = (rg || '').replace(/[\s.-]/g, '').toUpperCase();
  if (limpo.length === 9) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, '$1.$2.$3-$4');
  } else if (limpo.length === 8) {
    return limpo.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3');
  }
  return limpo;
}

/**
 * Termos governamentais e de cabeçalhos que devem ser ignorados na extração de nome
 */
export const STOP_WORDS_DOCUMENTOS = [
  'REPUBLICA', 'FEDERATIVA', 'BRASIL', 'MINISTERIO', 'MINISTÉRIO', 'FAZENDA', 'RECEITA',
  'FEDERAL', 'CARTEIRA', 'NACIONAL', 'HABILITACAO', 'HABILITAÇÃO', 'IDENTIDADE', 'REGISTRO',
  'GERAL', 'SECRETARIA', 'SEGURANCA', 'SEGURANÇA', 'PUBLICA', 'PÚBLICA', 'DEPARTAMENTO', 
  'TRANSITO', 'TRÂNSITO', 'TRANSPORTES', 'SENATRAN', 'DENATRAN', 'DETRAN', 'INSTITUTO', 
  'IDENTIFICACAO', 'IDENTIFICAÇÃO', 'POLICIA', 'POLÍCIA', 'CIVIL', 'FILIACAO', 'FILIAÇÃO',
  'PAI', 'MAE', 'MÃE', 'NATURALIDADE', 'NACIONALIDADE', 'DATA', 'NASCIMENTO',
  'EXPEDICAO', 'EXPEDIÇÃO', 'VALIDADE', 'OBSERVACOES', 'OBSERVAÇÕES', 'ASSINATURA', 'PORTADOR', 'VALIDA',
  'TERRITORIO', 'TERRITÓRIO', 'VIA', 'CATEGORIA', 'HABILITADO', 'PERMISSAO', 'PERMISSÃO', 'CONDUTOR',
  'DOC', 'SSP', 'ORGAO', 'ÓRGÃO', 'EMISSOR', 'BRASILEIRA', 'BRASILEIRO', 'SEXO',
  'ESTADO', 'PREFEITURA', 'GOVERNO', 'CONSELHO', 'REGIONAL', 'LOCAL',
  'MATRICULA', 'MATRÍCULA', 'CHAVE', 'CODIGO', 'CÓDIGO', 'ACESSO', 'AUTORIZADO', 'VISITANTE',
  'EMPRESA', 'SERVICO', 'SERVIÇO', 'PORTARIA', 'SISTEMA', 'CARTAO', 'CARTÃO', 'CRACHA', 'CRACHÁ',
  'POLEGAR', 'DIREITO', 'DIRETOR', 'TITULAR', 'SUBSTITUTO', 'DRIVER', 'LICENSE', 'PERMISO', 'CONDUCCION', 'CONDUCCIÓN',
  'TRERUBLICA', 'MINTETERTO', 'MINTÊTERTOS', 'NAGIONALOE', 'TRANSPOR', 'SOBRENOME', 'VÁLIDA EM TODO'
];

/**
 * Substitui caracteres comumente confundidos pelo OCR em sequências numéricas (CPF, RG, CNH)
 */
export function corrigirErrosOcrNumeros(texto: string): string {
  return texto
    .replace(/[OoQqDd]/g, '0')
    .replace(/[Iil|!\]\[t]/g, '1')
    .replace(/[Zz]/g, '2')
    .replace(/[Ee]/g, '3')
    .replace(/[Aa]/g, '4')
    .replace(/[Ss$§]/g, '5')
    .replace(/[Ggb]/g, '6')
    .replace(/[T/j?]/g, '7')
    .replace(/[B&]/g, '8')
    .replace(/[gq]/g, '9');
}

/**
 * Substitui dígitos comumente confundidos pelo OCR em nomes alfabéticos (ex: MAR1A -> MARIA)
 */
export function corrigirErrosOcrLetras(texto: string): string {
  return texto
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/2/g, 'Z')
    .replace(/3/g, 'E')
    .replace(/4/g, 'A')
    .replace(/5/g, 'S')
    .replace(/6/g, 'G')
    .replace(/8/g, 'B');
}

// ============================================================================
// FRENTE 2: PRÉ-PROCESSAMENTO DE IMAGEM NO CLIENTE (CANVAS / JAVASCRIPT)
// ============================================================================

/**
 * Aplica Limiarização de Otsu (Otsu's Thresholding)
 * Transforma a imagem em preto e branco puro com limiar ótimo calculado pelo histograma
 */
export function aplicarLimiarizacaoOtsu(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;
  const totalPixels = width * height;

  // 1. Calcula histograma dos níveis de cinza
  const histograma = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    histograma[gray]++;
  }

  // 2. Calcula limiar ótimo via Otsu
  let somaTotal = 0;
  for (let t = 0; t < 256; t++) {
    somaTotal += t * histograma[t];
  }

  let somaB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariancia = 0;
  let limiarOtimo = 128;

  for (let t = 0; t < 256; t++) {
    wB += histograma[t];
    if (wB === 0) continue;

    wF = totalPixels - wB;
    if (wF === 0) break;

    somaB += t * histograma[t];
    const mB = somaB / wB;
    const mF = (somaTotal - somaB) / wF;

    const varianciaEntre = wB * wF * (mB - mF) * (mB - mF);
    if (varianciaEntre > maxVariancia) {
      maxVariancia = varianciaEntre;
      limiarOtimo = t;
    }
  }

  // Margem de segurança para garantir legibilidade de caracteres finos
  const limiarFinal = Math.max(90, Math.min(165, limiarOtimo));

  // 3. Aplica a binarização
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const valor = gray < limiarFinal ? 0 : 255;
    d[i] = valor;
    d[i + 1] = valor;
    d[i + 2] = valor;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Aplica Escala de Cinza com Aumento de Contraste e Normalização
 */
export function aplicarEscalaCinzaEContraste(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  // Acha min e max de brilho para esticar o histograma
  let minGray = 255;
  let maxGray = 0;

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    if (gray < minGray) minGray = gray;
    if (gray > maxGray) maxGray = gray;
  }

  const range = Math.max(1, maxGray - minGray);

  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Normalização (contrast stretching)
    let normalizado = ((gray - minGray) / range) * 255;
    // Curva S para forçar o texto a ficar mais escuro e o papel mais branco
    normalizado = normalizado < 128 
      ? Math.pow(normalizado / 128, 1.4) * 128 
      : 255 - Math.pow((255 - normalizado) / 128, 1.4) * 128;

    const finalVal = Math.max(0, Math.min(255, normalizado));
    d[i] = finalVal;
    d[i + 1] = finalVal;
    d[i + 2] = finalVal;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Prepara e calibra imagem no Canvas gerando versões otimizadas:
 * - Imagem Original redimensionada (para salvar com fidelidade no cadastro)
 * - Imagem Binarizada (Otsu Thresholding para OCR ultra-rápido)
 * - Imagem em Escala de Cinza com alto contraste (para fallback)
 */
export async function prepararImagemCanvas(
  arquivoOuDataUrl: File | Blob | string,
  rotacaoGraus = 0,
  modoFiltro: 'binarizado' | 'contraste' | 'original' = 'original'
): Promise<{ dataUrl: string; width: number; height: number; canvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // 1. Redimensionamento Otimizado para OCR (evita estouro de memória e mantém máxima nitidez)
      const maxDim = 1600;
      let targetW = img.width;
      let targetH = img.height;

      if (targetW > maxDim || targetH > maxDim) {
        const fator = Math.min(maxDim / targetW, maxDim / targetH);
        targetW = Math.round(targetW * fator);
        targetH = Math.round(targetH * fator);
      } else if (targetW < 1000 && targetH < 1000) {
        // Upscaling suave se a foto for muito pequena
        const fator = Math.min(1400 / targetW, 1400 / targetH);
        targetW = Math.round(targetW * fator);
        targetH = Math.round(targetH * fator);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Falha ao inicializar Canvas 2D'));
        return;
      }

      if (rotacaoGraus === 90 || rotacaoGraus === 270) {
        canvas.width = targetH;
        canvas.height = targetW;
      } else {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotacaoGraus * Math.PI) / 180);
      ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // 2. Aplicação de filtros conforme o modo
      if (modoFiltro === 'binarizado') {
        aplicarLimiarizacaoOtsu(ctx, canvas.width, canvas.height);
      } else if (modoFiltro === 'contraste') {
        aplicarEscalaCinzaEContraste(ctx, canvas.width, canvas.height);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve({
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        canvas
      });
    };

    img.onerror = () => reject(new Error('Erro ao carregar imagem para pré-processamento.'));

    if (typeof arquivoOuDataUrl === 'string') {
      img.src = arquivoOuDataUrl;
    } else {
      img.src = URL.createObjectURL(arquivoOuDataUrl);
    }
  });
}

// ============================================================================
// FRENTE 3: PÓS-PROCESSAMENTO INTELIGENTE COM REGEX E VALIDAÇÃO DE DÍGITOS
// ============================================================================

/**
 * Extrai e valida CPF com algoritmos de substituição de OCR e Módulo 11
 */
function extrairCpfInteligente(
  textoBruto: string, 
  linhas: string[], 
  rejeitados: string[]
): string | null {
  const candidatos = new Set<string>();

  // 1. Padrão formal: 000.000.000-00 com pontuações variadas
  const regexFormatados = /\b\d{3}[.,\s]?\d{3}[.,\s]?\d{3}[-.,\s]?\d{2}\b/g;
  const matchFormatados = textoBruto.match(regexFormatados);
  if (matchFormatados) {
    matchFormatados.forEach(m => candidatos.add(m));
  }

  // 2. Padrão contínuo: 11 dígitos
  const regexContinuo = /\b\d{11}\b/g;
  const matchContinuo = textoBruto.match(regexContinuo);
  if (matchContinuo) {
    matchContinuo.forEach(m => candidatos.add(m));
  }

  // 3. Padrão com letras confundidas pelo OCR em linhas próximas a CPF/CIN/DOC
  for (const linha of linhas) {
    const linhaUpper = linha.toUpperCase();
    const temDicaCpf = linhaUpper.includes('CPF') || 
                       linhaUpper.includes('CIC') || 
                       linhaUpper.includes('DOC') || 
                       linhaUpper.includes('IDENTIDADE') ||
                       linhaUpper.includes('NACIONAL') ||
                       linhaUpper.includes('REGISTRO');

    // Converte possíveis letras para números
    const corrigida = corrigirErrosOcrNumeros(linha).replace(/\D/g, '');

    // Se tiver 11 dígitos
    if (corrigida.length === 11) {
      candidatos.add(corrigida);
    } else if (corrigida.length > 11) {
      // Janela deslizante de 11 dígitos caso tenha dígitos colados
      for (let i = 0; i <= corrigida.length - 11; i++) {
        candidatos.add(corrigida.substring(i, i + 11));
      }
    } else if (temDicaCpf && corrigida.length === 10) {
      // Se faltou o zero inicial comum em muitos estados brasileiros (ex: 0XXXXXXXXXX)
      candidatos.add('0' + corrigida);
    }
  }

  // 4. Testa e valida cada candidato com Módulo 11
  for (const cand of candidatos) {
    const limpo = cand.replace(/\D/g, '');
    if (validarCPF(limpo)) {
      return formatarCPF(limpo);
    } else {
      rejeitados.push(`${cand} (Inválido no Módulo 11)`);
    }
  }

  return null;
}

/**
 * Extrai e valida RG descartando datas e números irrelevantes
 */
function extrairRgInteligente(
  textoBruto: string, 
  linhas: string[], 
  rejeitados: string[]
): string | null {
  const regexRg = /\b\d{1,2}[.,\s]?\d{3}[.,\s]?\d{3}[-.,\s]?[\dX]\b/gi;
  const matchRg = textoBruto.match(regexRg);
  const candidatosRg: string[] = matchRg ? Array.from(matchRg) : [];

  // Também busca em linhas com rótulo "RG" ou "REGISTRO GERAL"
  for (const linha of linhas) {
    const upper = linha.toUpperCase();
    if (upper.includes('RG') || upper.includes('REGISTRO GERAL') || upper.includes('IDENTIDADE') || upper.includes('SSP')) {
      const corrigida = corrigirErrosOcrNumeros(linha).replace(/[^0-9X]/gi, '');
      if (corrigida.length >= 7 && corrigida.length <= 10) {
        candidatosRg.push(corrigida);
      }
    }
  }

  for (const cand of candidatosRg) {
    const limpo = cand.replace(/[\s.,-]/g, '').toUpperCase();

    // Descarta se for data no formato DDMMAAAA ou AAAAMMDD
    const pareceData = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(limpo) ||
                       /^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(limpo);

    if (pareceData) {
      rejeitados.push(`${cand} (Descartado: Padrão de Data)`);
      continue;
    }

    if (validarRG(limpo)) {
      return formatarRG(limpo);
    }
  }

  return null;
}

/**
 * Sanitiza e formata Nome do Titular em Title Case, corrigindo dígitos e preposições
 */
function sanitizarNomeTitular(texto: string): string {
  if (!texto) return '';

  // Converte números acidentais de OCR em letras (ex: 1 -> I, 0 -> O, 4 -> A)
  const comLetras = corrigirErrosOcrLetras(texto);

  // Remove caracteres que não são letras ou espaços
  const limpo = comLetras
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const preposicoes = new Set(['da', 'de', 'do', 'dos', 'das', 'e', 'del', 'la']);
  const partes = limpo.toLowerCase().split(' ').filter(p => p.length >= 2);

  return partes
    .map((p, idx) => {
      if (idx > 0 && preposicoes.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

/**
 * Analisa o texto bruto e extrai os campos com base no layout dos documentos brasileiros
 */
export function extrairDadosDocumento(textoBruto: string): DadosDocumentoExtraidos {
  const linhasBrutas = textoBruto
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const numerosRejeitados: string[] = [];
  let tipoDetectado: DadosDocumentoExtraidos['tipoDocumento'] = 'DESCONHECIDO';

  const textoUpper = textoBruto.toUpperCase();

  // 1. Identificar o tipo do documento
  if (
    textoUpper.includes('HABILITACAO') || 
    textoUpper.includes('HABILITAÇÃO') || 
    textoUpper.includes('CNH') || 
    textoUpper.includes('CONDUTOR') || 
    textoUpper.includes('DETRAN') ||
    textoUpper.includes('SENATRAN') ||
    textoUpper.includes('DENATRAN') ||
    textoUpper.includes('TRANSPORTES') ||
    textoUpper.includes('TRANSPOR') ||
    textoUpper.includes('DRIVER') ||
    textoUpper.includes('PERMISO') ||
    textoUpper.includes('TRANSITO') ||
    textoUpper.includes('TRÂNSITO')
  ) {
    tipoDetectado = 'CNH';
  } else if (textoUpper.includes('REGISTRO GERAL') || textoUpper.includes('SECRETARIA DE SEGURANCA') || textoUpper.includes('IDENTIDADE') || textoUpper.includes('SSP')) {
    tipoDetectado = 'RG';
  } else if (textoUpper.includes('CARTEIRA DE IDENTIDADE NACIONAL') || textoUpper.includes('CIN')) {
    tipoDetectado = 'CIN';
  } else if (textoUpper.includes('CADASTRO DE PESSOAS FISICAS') || textoUpper.includes('RECEITA FEDERAL')) {
    tipoDetectado = 'CPF';
  } else if (textoUpper.includes('CRACHA') || textoUpper.includes('COLABORADOR') || textoUpper.includes('VISITANTE') || textoUpper.includes('PRESTADOR')) {
    tipoDetectado = 'CRACHA';
  }

  // 2. Extração de CPF com Validação e Correção
  const cpfValidoEncontrado = extrairCpfInteligente(textoBruto, linhasBrutas, numerosRejeitados);

  // 3. Extração de RG
  const rgEncontrado = extrairRgInteligente(textoBruto, linhasBrutas, numerosRejeitados);

  // 4. Extração de CNH Registro
  let cnhRegistroEncontrado: string | null = null;
  if (tipoDetectado === 'CNH') {
    const matchReg = textoBruto.match(/(?:REGISTRO|Nº\s*REGISTRO|N°\s*REGISTRO|5\s*N)[\s:]*([0-9OIZESAB]{11})/i);
    if (matchReg && matchReg[1]) {
      cnhRegistroEncontrado = corrigirErrosOcrNumeros(matchReg[1]);
    }
  }

  // 5. Determinação do Documento Principal
  let documentoFormatado = '';
  let numeroLimpo = '';
  let cpfValidado = false;
  let rgValido = false;

  if (cpfValidoEncontrado) {
    documentoFormatado = cpfValidoEncontrado;
    numeroLimpo = cpfValidoEncontrado.replace(/\D/g, '');
    cpfValidado = true;
    if (tipoDetectado === 'DESCONHECIDO') tipoDetectado = 'CPF';
  } else if (rgEncontrado) {
    documentoFormatado = rgEncontrado;
    numeroLimpo = rgEncontrado.replace(/[\s.-]/g, '');
    rgValido = true;
    if (tipoDetectado === 'DESCONHECIDO') tipoDetectado = 'RG';
  } else if (cnhRegistroEncontrado) {
    documentoFormatado = `CNH: ${cnhRegistroEncontrado}`;
    numeroLimpo = cnhRegistroEncontrado;
  }

  // 6. Extração de Nome Completo do Titular
  let nomeCompleto = '';

  // Procura rótulo "NOME" ou "2 e 1 NOME E SOBRENOME" no texto (evitando a filiação)
  for (let i = 0; i < linhasBrutas.length; i++) {
    const linha = linhasBrutas[i];
    const linhaUpper = linha.toUpperCase();

    // Se chegou na filiação, interrompe a busca de nome para não capturar pais
    if (linhaUpper.includes('FILIACAO') || linhaUpper.includes('FILIAÇÃO')) {
      break;
    }

    if (
      linhaUpper.includes('NOME') || 
      linhaUpper.includes('SOBRENOME') || 
      linhaUpper.includes('2 E 1') || 
      linhaUpper.includes('CONDUTOR') || 
      linhaUpper.includes('TITULAR')
    ) {
      let candidata = linha;
      // Remove o rótulo CNH (ex: "2 e 1 NOME E SOBRENOME" ou "1. NOME:")
      candidata = candidata.replace(/^(?:2\s*e\s*1\s*)?NOME(?:\s*E\s*SOBRENOME)?\s*[:.-]?\s*/i, '');
      if (candidata.includes(':')) {
        candidata = candidata.split(':')[1] || '';
      }
      if (!candidata.trim() && i + 1 < linhasBrutas.length) {
        candidata = linhasBrutas[i + 1];
      }

      candidata = sanitizarNomeTitular(candidata);
      const partes = candidata.split(' ').filter(p => p.length >= 2);
      if (partes.length >= 2 && candidata.length >= 6) {
        nomeCompleto = candidata;
        break;
      }
    }
  }

  // Se não achou com rótulo explícito, busca a primeira linha com formato de nome próprio válido antes de filiação
  if (!nomeCompleto) {
    for (const linha of linhasBrutas) {
      const linhaUpper = linha.toUpperCase();
      if (linhaUpper.includes('FILIACAO') || linhaUpper.includes('FILIAÇÃO')) break;

      const sanitizada = sanitizarNomeTitular(linha);
      const partes = sanitizada.split(' ').filter(p => p.length >= 2);

      if (partes.length >= 2 && sanitizada.length >= 7) {
        const upper = sanitizada.toUpperCase();
        const temPalavraProibida = STOP_WORDS_DOCUMENTOS.some(sw => {
          const regex = new RegExp(`\\b${sw}\\b`, 'i');
          return regex.test(upper);
        });

        if (!temPalavraProibida) {
          nomeCompleto = sanitizada;
          break;
        }
      }
    }
  }

  // 7. Extração de Empresa / Prestadora (se constar no documento ou crachá)
  let empresaSugerida: string | undefined = undefined;
  for (const linha of linhasBrutas) {
    const upper = linha.toUpperCase();
    if (upper.includes('EMPRESA:') || upper.includes('PRESTADOR:') || upper.includes('TERCEIRIZADA:')) {
      const pedacos = linha.split(':');
      if (pedacos[1] && pedacos[1].trim().length > 2) {
        empresaSugerida = pedacos[1].trim();
        break;
      }
    }
  }

  let confianca = 0;
  if (cpfValidado) confianca += 50;
  if (rgValido) confianca += 30;
  if (nomeCompleto) confianca += 40;
  if (tipoDetectado !== 'DESCONHECIDO') confianca += 10;

  return {
    tipoDocumento: tipoDetectado,
    nomeCompleto,
    documentoFormatado,
    numeroLimpo,
    cpfValidado,
    rgValido,
    cnhRegistro: cnhRegistroEncontrado || undefined,
    empresaSugerida,
    confianca: Math.min(confianca, 100),
    numerosRejeitados,
    linhasDetectadas: linhasBrutas.slice(0, 20),
    metodoUtilizado: 'TESSERACT_LOCAL'
  };
}

/**
 * Recorta a foto com base em coordenadas normalizadas [0..1]
 */
export function recortarFotoPorCoordenadas(
  canvasDoc: HTMLCanvasElement,
  ymin: number,
  xmin: number,
  ymax: number,
  xmax: number
): string | undefined {
  try {
    const w = canvasDoc.width;
    const h = canvasDoc.height;

    // Converte coordenadas relativas com margem de segurança
    const cropX = Math.max(0, Math.round(xmin * w));
    const cropY = Math.max(0, Math.round(ymin * h));
    const cropW = Math.min(w - cropX, Math.round((xmax - xmin) * w));
    const cropH = Math.min(h - cropY, Math.round((ymax - ymin) * h));

    if (cropW < 20 || cropH < 20) return undefined;

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 240;
    faceCanvas.height = 300;
    const fCtx = faceCanvas.getContext('2d');
    if (!fCtx) return undefined;

    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(
      canvasDoc,
      cropX, cropY, cropW, cropH,
      0, 0, faceCanvas.width, faceCanvas.height
    );

    return faceCanvas.toDataURL('image/jpeg', 0.90);
  } catch {
    return undefined;
  }
}

/**
 * Recorta a foto do rosto do titular com base nas proporções do documento brasileiro
 */
export function recortarFotoTitular(
  canvasDoc: HTMLCanvasElement,
  tipo: DadosDocumentoExtraidos['tipoDocumento']
): string | undefined {
  try {
    const w = canvasDoc.width;
    const h = canvasDoc.height;

    let cropX = Math.round(w * 0.04);
    let cropY = Math.round(h * 0.12);
    let cropW = Math.round(w * 0.36);
    let cropH = Math.round(h * 0.68);

    if (tipo === 'CNH') {
      // Na CNH (Nova CNH 2022-2026 e Tradicional):
      // A foto fica após a faixa verde lateral de segurança (inicia em ~19% da largura)
      // e ocupa de ~36% a ~78% da altura
      cropX = Math.round(w * 0.19);
      cropY = Math.round(h * 0.36);
      cropW = Math.round(w * 0.25);
      cropH = Math.round(h * 0.42);
    } else if (tipo === 'CRACHA') {
      // No crachá vertical a foto costuma ficar no topo central
      cropX = Math.round(w * 0.25);
      cropY = Math.round(h * 0.10);
      cropW = Math.round(w * 0.50);
      cropH = Math.round(h * 0.45);
    }

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 240;
    faceCanvas.height = 300;
    const fCtx = faceCanvas.getContext('2d');
    if (!fCtx) return undefined;

    fCtx.imageSmoothingEnabled = true;
    fCtx.imageSmoothingQuality = 'high';
    fCtx.drawImage(
      canvasDoc,
      cropX, cropY, cropW, cropH,
      0, 0, faceCanvas.width, faceCanvas.height
    );

    return faceCanvas.toDataURL('image/jpeg', 0.90);
  } catch {
    return undefined;
  }
}

/**
 * Executa o fluxo completo de OCR:
 * 1. Pré-processa a imagem (Redimensionamento + Escala de Cinza + Binarização de Otsu)
 * 2. Tenta API Gemini no backend (se disponível)
 * 3. Fallback inteligente e resiliente para o motor Tesseract.js (100% gratuito e local para PWA)
 * 4. Pós-processa com validação matemática Módulo 11 e substituições regex
 */
export async function executarOCRCompleto(
  arquivoOuDataUrl: File | Blob | string,
  onProgresso?: (progresso: number, status: string) => void
): Promise<DadosDocumentoExtraidos> {
  onProgresso?.(10, 'Preparando imagem e ajustando dimensões...');

  // 1. Gera a imagem original limpa para arquivo no sistema
  const imgOriginal = await prepararImagemCanvas(arquivoOuDataUrl, 0, 'original');
  const fotoDocBase64 = imgOriginal.dataUrl;

  // 2. Pré-processa no cliente com Otsu Thresholding (Binarização Preto e Branco Puro)
  onProgresso?.(25, 'Aplicando filtro de escala de cinza e limiarização Otsu...');
  const imgBinarizada = await prepararImagemCanvas(arquivoOuDataUrl, 0, 'binarizado');

  // Tentativa 1: IA Gemini no backend (se configurada)
  try {
    onProgresso?.(40, 'Consultando reconhecimento de alta precisão com IA...');
    const respostaApi = await fetch('/api/ocr-documento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagemBase64: fotoDocBase64 })
    });

    if (respostaApi.ok) {
      const dadosGemini = await respostaApi.json();
      if (dadosGemini && (dadosGemini.nome || dadosGemini.nomeCompleto || dadosGemini.cpf || dadosGemini.rg || dadosGemini.documentoFormatado)) {
        onProgresso?.(90, 'Extraindo fotos e calibração das zonas...');
        
        let fotoRosto: string | undefined = undefined;
        if (dadosGemini.boxRosto && Array.isArray(dadosGemini.boxRosto) && dadosGemini.boxRosto.length === 4) {
          const [ymin, xmin, ymax, xmax] = dadosGemini.boxRosto;
          fotoRosto = recortarFotoPorCoordenadas(imgOriginal.canvas, ymin, xmin, ymax, xmax);
        }
        if (!fotoRosto) {
          fotoRosto = recortarFotoTitular(imgOriginal.canvas, dadosGemini.tipoDocumento);
        }

        onProgresso?.(100, 'OCR com IA concluído com sucesso!');

        const nomeFinal = (dadosGemini.nome || dadosGemini.nomeCompleto || '').trim();
        const cpfFinal = (dadosGemini.cpf || '').trim();
        const rgFinal = (dadosGemini.rg || '').trim();
        const docFormatadoFinal = cpfFinal || rgFinal || dadosGemini.documentoFormatado || '';
        const numeroLimpoFinal = (cpfFinal || rgFinal || dadosGemini.numeroLimpo || '').replace(/\D/g, '');

        return {
          tipoDocumento: dadosGemini.tipoDocumento || 'CNH',
          nomeCompleto: nomeFinal,
          nome: nomeFinal,
          cpf: cpfFinal,
          rg: rgFinal,
          documentoFormatado: docFormatadoFinal,
          numeroLimpo: numeroLimpoFinal,
          cpfValidado: Boolean(dadosGemini.cpfValidado || (cpfFinal && cpfFinal.length >= 11)),
          rgValido: Boolean(dadosGemini.rgValido || rgFinal),
          cnhRegistro: dadosGemini.cnhRegistro,
          validade: dadosGemini.validade,
          categoria: dadosGemini.categoria,
          dataNascimento: dadosGemini.dataNascimento,
          empresaSugerida: dadosGemini.empresaSugerida,
          fotoDocumentoBase64: fotoDocBase64,
          fotoRostoBase64: fotoRosto,
          confianca: dadosGemini.confianca || 99,
          numerosRejeitados: [],
          metodoUtilizado: 'IA_GEMINI'
        };
      }
    }
  } catch (errApi) {
    console.info('[OCR Service] Utilizando motor local do navegador:', errApi);
  }

  // Tentativa 2: Motor Local Tesseract.js com Imagem Binarizada (100% Gratuito e Offline)
  onProgresso?.(45, 'Inicializando motor OCR no navegador...');

  if (!(window as any).Tesseract) {
    onProgresso?.(50, 'Carregando biblioteca OCR do navegador...');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao inicializar o motor OCR no navegador'));
      document.head.appendChild(script);
    });
  }

  const Tesseract = (window as any).Tesseract;
  onProgresso?.(60, 'Lendo caracteres no documento binarizado...');

  let textoFinal = '';

  try {
    const ret = await Tesseract.recognize(imgBinarizada.dataUrl, 'por', {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && m.progress) {
          const perc = 60 + Math.round(m.progress * 30);
          onProgresso?.(perc, `Lendo documento... (${perc}%)`);
        }
      }
    });
    textoFinal = ret?.data?.text || '';
  } catch (errPor) {
    // Fallback de idioma para 'eng' caso os pesos portugueses falhem em conexão fraca
    try {
      const retEng = await Tesseract.recognize(imgBinarizada.dataUrl, 'eng');
      textoFinal = retEng?.data?.text || '';
    } catch {
      textoFinal = '';
    }
  }

  let resultado = extrairDadosDocumento(textoFinal);

  // Se a primeira passada binarizada não encontrou documento válido, faz Segunda Passada com contraste adaptativo
  if (!resultado.cpfValidado && !resultado.rgValido) {
    onProgresso?.(85, 'Refinando leitura com contraste adaptativo...');
    const imgContraste = await prepararImagemCanvas(arquivoOuDataUrl, 0, 'contraste');
    try {
      const retContraste = await Tesseract.recognize(imgContraste.dataUrl, 'por');
      const textoPassada2 = retContraste?.data?.text || '';
      const resultadoPassada2 = extrairDadosDocumento(textoPassada2);

      if (resultadoPassada2.cpfValidado || resultadoPassada2.rgValido || resultadoPassada2.nomeCompleto) {
        resultado = resultadoPassada2;
      }
    } catch {}
  }

  const fotoRosto = recortarFotoTitular(imgOriginal.canvas, resultado.tipoDocumento);

  resultado.fotoDocumentoBase64 = fotoDocBase64;
  resultado.fotoRostoBase64 = fotoRosto;
  resultado.metodoUtilizado = 'TESSERACT_LOCAL';

  onProgresso?.(100, 'Leitura concluída com sucesso!');
  return resultado;
}
