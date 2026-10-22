import { supabase } from './supabase';

export interface CondominioConfig {
  id: string;
  nome: string;
  endereco?: string;
  escala_plantao: '06_18' | '07_19' | '08_20' | 'personalizado';
  escala_label: string;
  horario_diurno_inicio: string; // Ex: "06:00" ou "07:00"
  horario_noturno_inicio: string; // Ex: "18:00" ou "19:00"
  whatsapp_grupo_url: string; // Ex: "https://chat.whatsapp.com/G8AZH67UIPO6xXSwzxROpZ"
  telefone_portaria?: string;
  sindico_nome?: string;
  sindico_whatsapp?: string;
  tipo_estrutura?: 'casas' | 'blocos' | 'torres' | 'numeral_direto' | string;
  qtd_blocos?: number;
  unidades_por_bloco?: number;
  nomes_blocos?: string;
  unidades_customizadas?: string[];
  zeros_esquerda?: boolean; // Se true, gera sequências como 01, 02, 03... (padrão true para casas)
  turnos_plantao?: any;
}

export type TipoEstruturaCondominio = 'casas' | 'blocos' | 'torres' | 'numeral_direto';

export const OPCOES_TIPO_ESTRUTURA: {
  id: TipoEstruturaCondominio;
  label: string;
  descricao: string;
  rotuloBloco: string;
  rotuloUnidade: string;
}[] = [
  {
    id: 'casas',
    label: '🏡 Condomínio de Casas (Casas Horizontais)',
    descricao: 'Onde seria "Bloco" vira "Casa" fixo em todo o sistema. Ideal para vilas e residenciais.',
    rotuloBloco: 'Casa',
    rotuloUnidade: 'Número da Casa'
  },
  {
    id: 'blocos',
    label: '🏢 Condomínio de Apartamentos / Edifícios',
    descricao: 'Estrutura tradicional com Blocos e Apartamentos.',
    rotuloBloco: 'Bloco',
    rotuloUnidade: 'Apartamento'
  },
  {
    id: 'torres',
    label: '🏙️ Condomínio de Torres',
    descricao: 'Estrutura vertical com Torres e Apartamentos.',
    rotuloBloco: 'Torre',
    rotuloUnidade: 'Apartamento'
  },
  {
    id: 'numeral_direto',
    label: '🔢 Numeral Direto / Lotes',
    descricao: 'Numeração sequencial contínua sem necessidade de bloco.',
    rotuloBloco: 'Unidade',
    rotuloUnidade: 'Lote / Unidade'
  }
];

export function isEstruturaCasas(tipo?: string): boolean {
  if (!tipo) return true; // Padrão inteligente
  const lower = tipo.toString().toLowerCase();
  return lower.includes('casa');
}

export function isEstruturaTorres(tipo?: string): boolean {
  if (!tipo) return false;
  const lower = tipo.toString().toLowerCase();
  return lower.includes('torre');
}

export function isEstruturaBlocos(tipo?: string): boolean {
  if (!tipo) return false;
  const lower = tipo.toString().toLowerCase();
  return lower.includes('bloco') || lower.includes('edificio') || lower.includes('apartamento');
}

export function isEstruturaNumeralDireto(tipo?: string): boolean {
  if (!tipo) return false;
  const lower = tipo.toString().toLowerCase();
  return lower.includes('numeral') || lower.includes('lote');
}

export function getNomeRotuloBloco(tipo?: string): string {
  if (isEstruturaCasas(tipo)) return 'Casa';
  if (isEstruturaTorres(tipo)) return 'Torre';
  if (isEstruturaNumeralDireto(tipo)) return 'Unidade';
  return 'Bloco';
}

export function getNomeRotuloUnidade(tipo?: string): string {
  if (isEstruturaCasas(tipo)) return 'Número da Casa';
  if (isEstruturaNumeralDireto(tipo)) return 'Lote / Unidade';
  return 'Apartamento';
}

/**
 * Retorna a lista de blocos ou torres cadastrados para o condomínio.
 * Se for casas, retorna ['Casa'].
 * Se for torres ou blocos, retorna as torres/blocos definidos na configuração (nomes_blocos ou qtd_blocos)
 * e também quaisquer blocos já existentes em moradores.
 */
export function obterListaBlocosOuTorres(config?: CondominioConfig | null, moradores?: { bloco?: string }[]): string[] {
  if (!config) {
    const blocosMoradores = Array.from(new Set((moradores || []).map(m => m.bloco?.trim()).filter(Boolean))) as string[];
    return blocosMoradores.length > 0 ? blocosMoradores : ['Casa'];
  }

  const tipo = config.tipo_estrutura || 'casas';
  if (isEstruturaCasas(tipo)) {
    return ['Casa'];
  }

  if (isEstruturaNumeralDireto(tipo)) {
    return [];
  }

  const lista: string[] = [];

  // 1. Nomes configurados explicitamente
  if (config.nomes_blocos) {
    const partes = config.nomes_blocos
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    lista.push(...partes);
  }

  // 2. Se a lista estiver vazia ou menor que qtd_blocos, gera os nomes padronizados
  const qtd = Math.max(1, Math.min(Number(config.qtd_blocos) || 1, 50));
  if (lista.length === 0) {
    const eTorre = isEstruturaTorres(tipo);
    for (let i = 0; i < qtd; i++) {
      if (eTorre) {
        lista.push(`Torre ${i + 1}`);
      } else {
        lista.push(`Bloco ${String.fromCharCode(65 + i)}`);
      }
    }
  }

  // 3. Mescla com blocos que já existam em moradores para não perder nenhum histórico
  if (moradores && Array.isArray(moradores)) {
    moradores.forEach(m => {
      const b = (m.bloco || '').trim();
      if (b && !lista.some(existente => existente.toLowerCase() === b.toLowerCase())) {
        lista.push(b);
      }
    });
  }

  // Ordenação inteligente (natural / alfanumérica)
  return lista.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

/**
 * Formata visualmente o rótulo de uma unidade respeitando a estrutura do condomínio.
 * Ex: Casas: "Casa 07"
 *     Torres: "Torre 1 • Ap. 102"
 *     Blocos: "Bloco B • Ap. 42"
 *     Numeral: "Unidade 15"
 */
export function formatarIdentificacaoUnidade(
  unidade: string | number | null | undefined, 
  bloco?: string | null | undefined, 
  tipoEstrutura?: string
): string {
  const u = String(unidade || '').trim();
  const b = String(bloco || '').trim();
  const tipo = tipoEstrutura || 'casas';

  if (isEstruturaCasas(tipo)) {
    return u.toLowerCase().startsWith('casa') ? u : (u ? `Casa ${u}` : 'Casa');
  }

  if (isEstruturaNumeralDireto(tipo)) {
    return `Unidade ${u}`;
  }

  if (isEstruturaTorres(tipo)) {
    const torreStr = b ? (b.toLowerCase().startsWith('torre') ? b : `Torre ${b}`) : '';
    return torreStr ? `${torreStr} • Ap. ${u}` : `Ap. ${u}`;
  }

  // Blocos
  const blocoStr = b && b.toLowerCase() !== 'casa' ? (b.toLowerCase().startsWith('bloco') ? b : `Bloco ${b}`) : '';
  return blocoStr ? `${blocoStr} • Ap. ${u}` : `Ap. ${u}`;
}

/**
 * Formata a menção de unidade/bloco para mensagens de WhatsApp enviadas aos moradores
 */
export function formatarTextoWhatsUnidade(
  unidade: string | number | null | undefined, 
  bloco?: string | null | undefined, 
  tipoEstrutura?: string
): string {
  const u = String(unidade || '').trim();
  const b = String(bloco || '').trim();
  const tipo = tipoEstrutura || 'casas';

  if (isEstruturaCasas(tipo)) {
    return u.toLowerCase().startsWith('casa') ? u : (u ? `Casa ${u}` : 'Casa');
  }

  if (isEstruturaNumeralDireto(tipo)) {
    return `Unidade ${u}`;
  }

  if (isEstruturaTorres(tipo)) {
    const torreStr = b ? (b.toLowerCase().startsWith('torre') ? b : `Torre ${b}`) : '';
    return torreStr ? `Ap. ${u} - ${torreStr}` : `Ap. ${u}`;
  }

  const blocoStr = b && b.toLowerCase() !== 'casa' ? (b.toLowerCase().startsWith('bloco') ? b : `Bloco ${b}`) : '';
  return blocoStr ? `Ap. ${u} - ${blocoStr}` : `Ap. ${u}`;
}

/**
 * Normaliza uma identificação de unidade, removendo prefixos redundantes como "Casa", "Ap." etc.
 */
export function normalizarNumeroUnidade(val: string | null | undefined): string {
  if (!val) return '';
  let str = String(val).trim();
  str = str.replace(/^(casa|apto|ap|unidade|und|lote)\.?\s+/i, '').trim();
  return str;
}

/**
 * Verifica se duas identificações de unidades são equivalentes, respeitando números com zero no início:
 * Ex: "01" equivale a "1" ou "01"; "Casa 07" equivale a "07" ou "7"; "12A" equivale a "12A".
 */
export function saoUnidadesEquivalentes(numA: string | null | undefined, numB: string | null | undefined): boolean {
  if (!numA || !numB) return false;
  const aNorm = normalizarNumeroUnidade(numA);
  const bNorm = normalizarNumeroUnidade(numB);
  
  if (aNorm.toLowerCase() === bNorm.toLowerCase()) return true;
  
  const numAInt = parseInt(aNorm, 10);
  const numBInt = parseInt(bNorm, 10);
  if (!isNaN(numAInt) && !isNaN(numBInt) && numAInt === numBInt) {
    if (/^\d+$/.test(aNorm) && /^\d+$/.test(bNorm)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Formata um número com zero à esquerda de forma segura:
 * Ex: 1 -> "01", 7 -> "07", "03" -> "03", "12A" -> "12A"
 */
export function formatarComZeroEsquerda(num: string | number, digitos: number = 2): string {
  const str = String(num).trim();
  const n = parseInt(str, 10);
  if (!isNaN(n) && /^\d+$/.test(str) && str.length < digitos) {
    return String(n).padStart(digitos, '0');
  }
  return str;
}

/**
 * Auto-corrige unidades de 1 a 9 adicionando o zero à esquerda (ex: "1" -> "01", "9" -> "09")
 * Caso o operador esqueça de colocar, o sistema corrige na hora.
 */
/**
 * Auto-corrige unidades de 1 a 9 adicionando o zero à esquerda (ex: "1" -> "01", "9" -> "09")
 * e remove o zero espúrio caso o número seja maior que 9 (ex: "057" -> "57", "0117" -> "117", "Casa 057" -> "Casa 57").
 */
export function autoCorrigirZeroEsquerda(val: string | null | undefined): string {
  if (!val) return '';
  let limpo = String(val).trim();

  // Se for numeral com prefixo e zero espúrio em número >= 10 (ex: 'Casa 057' -> 'Casa 57', 'Ap 0101' -> 'Ap 101')
  const matchPrefixoSpurious = limpo.match(/^((?:casa|apto|ap|unidade|und|lote|bloco|quadra)\.?\s*)0+([1-9]\d+.*)$/i);
  if (matchPrefixoSpurious) {
    return `${matchPrefixoSpurious[1]}${matchPrefixoSpurious[2]}`;
  }

  // Remove zero(s) à esquerda espúrios de números maiores que 9 (ex: '057' -> '57', '0117' -> '117', '010' -> '10')
  if (/^0+[1-9]\d+.*$/.test(limpo)) {
    return limpo.replace(/^0+/, '');
  }

  // Se for múltiplos zeros seguidos de 1 a 9 (ex: '005' -> '05')
  if (/^0+([1-9])$/.test(limpo)) {
    return `0${limpo.replace(/^0+/, '')}`;
  }

  // Se for apenas um único dígito de 1 a 9: '1' -> '01', ..., '9' -> '09'
  if (/^[1-9]$/.test(limpo)) {
    return `0${limpo}`;
  }

  // Se for numeral com prefixo de 1 a 9 (ex: "Casa 5" -> "Casa 05", "Ap 3" -> "Ap 03")
  const matchPrefixo = limpo.match(/^((?:casa|apto|ap|unidade|und|lote|bloco|quadra)\.?\s*)([1-9])$/i);
  if (matchPrefixo) {
    return `${matchPrefixo[1]}0${matchPrefixo[2]}`;
  }
  return limpo;
}

export interface UnidadeEstruturada {
  id: string; // Ex: "casa-1" ou "bloco-A-ap-101"
  numero: string; // Ex: "01", "1", "101", "12A"
  bloco: string; // Ex: "Casa", "A"
  label: string; // Ex: "Casa 01" ou "Casa 12A"
  indiceOriginal?: number; // Índice na lista de unidades para permitir edição direta
}

export function gerarCardsUnidadesCondominio(config?: CondominioConfig | null): UnidadeEstruturada[] {
  const lista: UnidadeEstruturada[] = [];
  if (!config) return lista;

  const tipo = config.tipo_estrutura || 'casas';
  const eCasas = isEstruturaCasas(tipo);
  const totalCasas = config.unidades_por_bloco ? Number(config.unidades_por_bloco) : 117;
  const customList = Array.isArray(config.unidades_customizadas) ? config.unidades_customizadas : [];
  // Por padrão em condomínio de casas ou quando não desligado explicitamente, zeros_esquerda é true (01, 02, 03...)
  const usarZeros = config.zeros_esquerda !== false;

  if (eCasas) {
    const qtd = Math.max(1, Math.min(totalCasas, 1000));
    for (let i = 0; i < qtd; i++) {
      const numSequencial = i + 1;
      const numPadrao = (usarZeros && numSequencial < 10) 
        ? String(numSequencial).padStart(2, '0') 
        : String(numSequencial);
      const customVal = customList[i];
      const numFinal = (customVal !== undefined && customVal !== null && String(customVal).trim() !== '')
        ? String(customVal).trim()
        : numPadrao;

      lista.push({
        id: `casa-${i + 1}`,
        numero: numFinal,
        bloco: 'Casa',
        label: `Casa ${numFinal}`,
        indiceOriginal: i
      });
    }

    // Se houver unidades extras cadastradas na lista customizada além de qtd (evitando duplicar equivalentes)
    for (let i = qtd; i < customList.length; i++) {
      const customVal = customList[i];
      if (customVal && String(customVal).trim() !== '') {
        const numFinal = String(customVal).trim();
        const jaExiste = lista.some(u => saoUnidadesEquivalentes(u.numero, numFinal));
        if (!jaExiste) {
          lista.push({
            id: `casa-extra-${i + 1}`,
            numero: numFinal,
            bloco: 'Casa',
            label: `Casa ${numFinal}`,
            indiceOriginal: i
          });
        }
      }
    }
  } else if (tipo === 'numeral_direto') {
    const qtd = Math.max(1, Math.min(totalCasas, 1000));
    for (let i = 0; i < qtd; i++) {
      const numSequencial = i + 1;
      const numPadrao = (usarZeros && numSequencial < 10) 
        ? String(numSequencial).padStart(2, '0') 
        : String(numSequencial);
      const customVal = customList[i];
      const numFinal = (customVal !== undefined && customVal !== null && String(customVal).trim() !== '')
        ? String(customVal).trim()
        : numPadrao;

      lista.push({
        id: `und-${i + 1}`,
        numero: numFinal,
        bloco: '',
        label: `Unidade ${numFinal}`,
        indiceOriginal: i
      });
    }

    for (let i = qtd; i < customList.length; i++) {
      const customVal = customList[i];
      if (customVal && String(customVal).trim() !== '') {
        const numFinal = String(customVal).trim();
        const jaExiste = lista.some(u => saoUnidadesEquivalentes(u.numero, numFinal));
        if (!jaExiste) {
          lista.push({
            id: `und-extra-${i + 1}`,
            numero: numFinal,
            bloco: '',
            label: `Unidade ${numFinal}`,
            indiceOriginal: i
          });
        }
      }
    }
  } else {
    // blocos ou torres
    const qBlocos = Math.max(1, Math.min(Number(config.qtd_blocos) || 1, 50));
    const nomesBlocosCustom = config.nomes_blocos 
      ? config.nomes_blocos.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const undPorBloco = Math.max(1, Math.min(Number(config.unidades_por_bloco) || 20, 200));

    let idxGlobal = 0;
    for (let b = 0; b < qBlocos; b++) {
      const nomeBloco = nomesBlocosCustom[b] || (tipo === 'torres' ? `Torre ${b + 1}` : `Bloco ${String.fromCharCode(65 + b)}`);
      for (let u = 1; u <= undPorBloco; u++) {
        const numFormatado = u < 100 ? (100 + u) : u;
        const customVal = customList[idxGlobal];
        const numFinal = (customVal !== undefined && customVal !== null && String(customVal).trim() !== '')
          ? String(customVal).trim()
          : String(numFormatado);

        lista.push({
          id: `${nomeBloco}-${numFormatado}-${idxGlobal}`,
          numero: numFinal,
          bloco: nomeBloco,
          label: `${nomeBloco} • Ap. ${numFinal}`,
          indiceOriginal: idxGlobal
        });
        idxGlobal++;
      }
    }
  }

  return lista;
}

export const OPCOES_ESCALA = [
  {
    id: '06_18',
    label: '06:00 às 18:00 / 18:00 às 06:00',
    descricao: 'Plantão 12x36 padrão com troca às 06h e 18h',
    diurnoInicio: '06:00',
    noturnoInicio: '18:00'
  },
  {
    id: '07_19',
    label: '07:00 às 19:00 / 19:00 às 07:00',
    descricao: 'Plantão 12x36 com troca às 07h e 19h',
    diurnoInicio: '07:00',
    noturnoInicio: '19:00'
  },
  {
    id: '08_20',
    label: '08:00 às 20:00 / 20:00 às 08:00',
    descricao: 'Plantão 12x36 com troca às 08h e 20h',
    diurnoInicio: '08:00',
    noturnoInicio: '20:00'
  },
  {
    id: 'personalizado',
    label: 'Horário Personalizado',
    descricao: 'Defina horários específicos de início para turno diurno e noturno',
    diurnoInicio: '06:00',
    noturnoInicio: '18:00'
  }
];

const STORAGE_KEY_PREFIX = 'infport_condominio_config_';

export function getCondominioConfigLocal(condominioId: string): CondominioConfig | null {
  if (!condominioId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${condominioId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler config local do condomínio:', e);
  }
  return null;
}

export function saveCondominioConfigLocal(condominioId: string, config: CondominioConfig): void {
  if (!condominioId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${condominioId}`, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('condominio_config_updated', { detail: config }));
  } catch (e) {
    console.warn('Erro ao salvar config local do condomínio:', e);
  }
}

/**
 * Busca a configuração completa do condomínio (mesclando banco de dados com cache local)
 */
export async function carregarCondominioConfig(condominioId: string): Promise<CondominioConfig> {
  const local = getCondominioConfigLocal(condominioId);

  // Valores padrão
  let defaultConfig: CondominioConfig = {
    id: condominioId,
    nome: 'Condomínio',
    endereco: '',
    escala_plantao: '06_18',
    escala_label: '06:00 às 18:00 / 18:00 às 06:00',
    horario_diurno_inicio: '06:00',
    horario_noturno_inicio: '18:00',
    whatsapp_grupo_url: '',
    telefone_portaria: '',
    sindico_nome: '',
    sindico_whatsapp: '',
    tipo_estrutura: 'casas',
    qtd_blocos: 1,
    unidades_por_bloco: 117,
    nomes_blocos: ''
  };

  if (local) {
    defaultConfig = { ...defaultConfig, ...local };
  }

  try {
    const { data, error } = await supabase
      .from('condominios')
      .select('*')
      .eq('id', condominioId)
      .maybeSingle();

    if (!error && data) {
      defaultConfig.nome = data.nome || defaultConfig.nome;
      defaultConfig.endereco = data.endereco || defaultConfig.endereco;

      // Se existirem colunas específicas no Supabase:
      if (data.tipo_estrutura) {
        defaultConfig.tipo_estrutura = data.tipo_estrutura;
      }
      if (data.qtd_blocos !== undefined && data.qtd_blocos !== null) {
        defaultConfig.qtd_blocos = Number(data.qtd_blocos);
      }
      if (data.unidades_por_bloco !== undefined && data.unidades_por_bloco !== null) {
        defaultConfig.unidades_por_bloco = Number(data.unidades_por_bloco);
      }
      if (data.nomes_blocos) {
        defaultConfig.nomes_blocos = data.nomes_blocos;
      }
      if (data.whatsapp_grupo_url) {
        defaultConfig.whatsapp_grupo_url = data.whatsapp_grupo_url;
      }
      if (data.escala_plantao) {
        defaultConfig.escala_plantao = data.escala_plantao;
        const opt = OPCOES_ESCALA.find(o => o.id === data.escala_plantao);
        if (opt) defaultConfig.escala_label = opt.label;
      }
      if (data.horario_diurno_inicio) {
        defaultConfig.horario_diurno_inicio = data.horario_diurno_inicio;
      }
      if (data.horario_noturno_inicio) {
        defaultConfig.horario_noturno_inicio = data.horario_noturno_inicio;
      }
      if (data.telefone_portaria) {
        defaultConfig.telefone_portaria = data.telefone_portaria;
      }
      if (data.sindico_nome) {
        defaultConfig.sindico_nome = data.sindico_nome;
      }
      if (data.sindico_whatsapp) {
        defaultConfig.sindico_whatsapp = data.sindico_whatsapp;
      }
      if (data.turnos_plantao && typeof data.turnos_plantao === 'object') {
        defaultConfig.turnos_plantao = data.turnos_plantao;
        if (Array.isArray(data.turnos_plantao.unidades_customizadas)) {
          defaultConfig.unidades_customizadas = data.turnos_plantao.unidades_customizadas;
        }
        if (data.turnos_plantao.zeros_esquerda !== undefined) {
          defaultConfig.zeros_esquerda = Boolean(data.turnos_plantao.zeros_esquerda);
        }
      }

      // Também salvar no cache local para persistência garantida e ultra rápida
      saveCondominioConfigLocal(condominioId, defaultConfig);
    }
  } catch (err) {
    console.warn('Erro ao carregar dados do condomínio no supabase, usando cache local:', err);
  }

  return defaultConfig;
}

/**
 * Salva a configuração do condomínio no Supabase (com fallback tolerante) e no localStorage
 */
export async function salvarCondominioConfig(
  condominioId: string, 
  dados: Partial<CondominioConfig>
): Promise<CondominioConfig> {
  const atual = await carregarCondominioConfig(condominioId);
  const atualizada: CondominioConfig = {
    ...atual,
    ...dados,
    id: condominioId
  };

  // 1. Salvar no localStorage primeiro (garantia instantânea)
  saveCondominioConfigLocal(condominioId, atualizada);

  // 2. Tentar atualizar no Supabase com tolerância a colunas ausentes
  try {
    // Primeiro tenta atualizar apenas campos padrão
    const updateBasico: any = {
      nome: atualizada.nome,
      endereco: atualizada.endereco
    };

    const turnosPlantaoBase = (atual.turnos_plantao && typeof atual.turnos_plantao === 'object')
      ? atual.turnos_plantao
      : {};
    const turnosPlantaoNovo = {
      ...turnosPlantaoBase,
      ...(dados.turnos_plantao || {}),
      unidades_customizadas: dados.unidades_customizadas !== undefined 
        ? dados.unidades_customizadas 
        : (atualizada.unidades_customizadas || []),
      zeros_esquerda: dados.zeros_esquerda !== undefined 
        ? dados.zeros_esquerda 
        : (atualizada.zeros_esquerda !== undefined ? atualizada.zeros_esquerda : true)
    };

    // Tentar com as colunas extras
    const updateCompleto: any = {
      ...updateBasico,
      tipo_estrutura: atualizada.tipo_estrutura || 'casas',
      qtd_blocos: atualizada.qtd_blocos !== undefined ? Number(atualizada.qtd_blocos) : 1,
      unidades_por_bloco: atualizada.unidades_por_bloco !== undefined ? Number(atualizada.unidades_por_bloco) : 117,
      nomes_blocos: atualizada.nomes_blocos || '',
      whatsapp_grupo_url: atualizada.whatsapp_grupo_url,
      escala_plantao: atualizada.escala_plantao,
      horario_diurno_inicio: atualizada.horario_diurno_inicio,
      horario_noturno_inicio: atualizada.horario_noturno_inicio,
      telefone_portaria: atualizada.telefone_portaria,
      sindico_nome: atualizada.sindico_nome,
      sindico_whatsapp: atualizada.sindico_whatsapp,
      turnos_plantao: turnosPlantaoNovo
    };

    const { error: errCompleto } = await supabase
      .from('condominios')
      .update(updateCompleto)
      .eq('id', condominioId);

    if (errCompleto) {
      console.warn('Supabase não possui algumas colunas extras de condominios. Salvando dados básicos no banco:', errCompleto.message);
      // Fallback para campos nativos que com certeza existem
      await supabase
        .from('condominios')
        .update(updateBasico)
        .eq('id', condominioId);
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar condominios no Supabase:', err);
  }

  return atualizada;
}

/**
 * Calcula o início e fim exatos do plantão atual com base na configuração do condomínio
 * Ex: Se a escala é 06:00 às 18:00 / 18:00 às 06:00 e agora são 14:00, o início foi às 06:00 de hoje.
 * Se a escala é 07:00 às 19:00 / 19:00 às 07:00 e agora são 03:00, o início foi às 19:00 de ontem.
 */
export function calcularPlantaoVigente(
  config?: CondominioConfig | null, 
  agora: Date = new Date()
): {
  inicio: Date;
  fim: Date;
  turnoAtual: 'diurno' | 'noturno';
  labelTurno: string;
  horasTurno: number;
} {
  const diurnoInicioStr = config?.horario_diurno_inicio || '06:00';
  const noturnoInicioStr = config?.horario_noturno_inicio || '18:00';

  const [hDiurno, mDiurno] = diurnoInicioStr.split(':').map(Number);
  const [hNoturno, mNoturno] = noturnoInicioStr.split(':').map(Number);

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosDiurno = (hDiurno || 6) * 60 + (mDiurno || 0);
  const minutosNoturno = (hNoturno || 18) * 60 + (mNoturno || 0);

  let inicio = new Date(agora);
  let fim = new Date(agora);
  let turnoAtual: 'diurno' | 'noturno' = 'diurno';
  let labelTurno = `Turno Diurno (${diurnoInicioStr} às ${noturnoInicioStr})`;

  if (minutosAgora >= minutosDiurno && minutosAgora < minutosNoturno) {
    // Estamos no Turno Diurno
    turnoAtual = 'diurno';
    labelTurno = `Turno Diurno (${diurnoInicioStr} às ${noturnoInicioStr})`;
    
    inicio.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    fim.setHours(hNoturno || 18, mNoturno || 0, 0, 0);
  } else {
    // Estamos no Turno Noturno
    turnoAtual = 'noturno';
    labelTurno = `Turno Noturno (${noturnoInicioStr} às ${diurnoInicioStr})`;

    if (minutosAgora >= minutosNoturno) {
      // Início foi hoje às horas do turno noturno, fim é amanhã no início do diurno
      inicio.setHours(hNoturno || 18, mNoturno || 0, 0, 0);
      
      fim.setDate(fim.getDate() + 1);
      fim.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    } else {
      // Início foi ontem às horas do turno noturno, fim é hoje no início do diurno
      inicio.setDate(inicio.getDate() - 1);
      inicio.setHours(hNoturno || 18, mNoturno || 0, 0, 0);

      fim.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    }
  }

  const diffMs = agora.getTime() - inicio.getTime();
  const horasTurno = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  return {
    inicio,
    fim,
    turnoAtual,
    labelTurno,
    horasTurno
  };
}
