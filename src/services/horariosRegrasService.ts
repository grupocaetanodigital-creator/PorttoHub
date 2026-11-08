/**
 * Serviço de Regras e Configuração de Horários para Obras e Mudanças (PorttoHub)
 * Gerencia os horários permitidos para:
 * - Obras, Reformas e Serviços com Ruído
 * - Mudanças (Entrada e Saída)
 *
 * Configurações detalhadas por período:
 * - 2ª a 6ª feira (Dias úteis)
 * - Sábados
 * - Domingos
 * - Feriados
 *
 * Suporte a multi-condomínio com persistência local e evento global de sincronização.
 */

export interface HorarioRegraPeriodo {
  permitido: boolean;
  horarioInicio: string; // Ex: '08:00'
  horarioFim: string;    // Ex: '17:00'
  observacao?: string;
}

export interface RegrasCategoria {
  segundaASexta: HorarioRegraPeriodo;
  sabados: HorarioRegraPeriodo;
  domingos: HorarioRegraPeriodo;
  feriados: HorarioRegraPeriodo;
  toleranciaMinutos?: number;
  exigirAgendamentoPrevio?: boolean;
  observacoesGerais?: string;
}

export interface ConfiguracaoHorariosObrasMudancas {
  obras: RegrasCategoria;
  mudancas: RegrasCategoria;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export const CONFIG_HORARIOS_PADRAO: ConfiguracaoHorariosObrasMudancas = {
  obras: {
    segundaASexta: {
      permitido: true,
      horarioInicio: '08:00',
      horarioFim: '17:00',
      observacao: 'Trabalhos com martelete ou ruído pesado permitidos somente até as 16:00. Intervalo de silêncio sugerido das 12:00 às 13:00.'
    },
    sabados: {
      permitido: true,
      horarioInicio: '09:00',
      horarioFim: '12:00',
      observacao: 'Apenas serviços leves de baixa emissão sonora (pintura, medições ou instalações manuais). Proibido martelete.'
    },
    domingos: {
      permitido: false,
      horarioInicio: '00:00',
      horarioFim: '00:00',
      observacao: 'Vedado qualquer tipo de obra, reforma ou serviço ruidoso conforme regulamento interno.'
    },
    feriados: {
      permitido: false,
      horarioInicio: '00:00',
      horarioFim: '00:00',
      observacao: 'Vedado qualquer tipo de obra ou reforma em feriados municipais, estaduais ou nacionais.'
    },
    toleranciaMinutos: 15,
    exigirAgendamentoPrevio: true,
    observacoesGerais: 'Obrigatório depósito de caçamba em local demarcado e uso exclusivo do elevador de serviço com proteção.'
  },
  mudancas: {
    segundaASexta: {
      permitido: true,
      horarioInicio: '08:00',
      horarioFim: '18:00',
      observacao: 'Instalação prévia e obrigatória de acolchoado de proteção no elevador de serviço.'
    },
    sabados: {
      permitido: true,
      horarioInicio: '09:00',
      horarioFim: '13:00',
      observacao: 'Máximo de 1 mudança por bloco/torre por período matutino para não comprometer as vagas e circulação.'
    },
    domingos: {
      permitido: false,
      horarioInicio: '00:00',
      horarioFim: '00:00',
      observacao: 'Não são permitidas mudanças aos domingos para preservar a tranquilidade dos moradores.'
    },
    feriados: {
      permitido: false,
      horarioInicio: '00:00',
      horarioFim: '00:00',
      observacao: 'Não são permitidas mudanças em feriados oficiais.'
    },
    toleranciaMinutos: 30,
    exigirAgendamentoPrevio: true,
    observacoesGerais: 'Agendamento prévio com no mínimo 48h de antecedência junto à administração do condomínio.'
  }
};

const CHAVE_STORAGE_PREFIX = 'porttohub_horarios_obras_mudancas';

/**
 * Obtém a chave no localStorage para o condomínio atual
 */
function obterChaveStorage(condominioId?: string): string {
  if (condominioId && condominioId !== 'global' && condominioId !== 'todos') {
    return `${CHAVE_STORAGE_PREFIX}_${condominioId}`;
  }
  return CHAVE_STORAGE_PREFIX;
}

/**
 * Carrega a configuração de horários do condomínio
 */
export function obterConfiguracaoHorarios(condominioId?: string): ConfiguracaoHorariosObrasMudancas {
  try {
    const chave = obterChaveStorage(condominioId);
    let salvo = localStorage.getItem(chave);
    
    // Fallback para a chave global se a específica do condomínio ainda não existir
    if (!salvo && chave !== CHAVE_STORAGE_PREFIX) {
      salvo = localStorage.getItem(CHAVE_STORAGE_PREFIX);
    }

    if (!salvo) {
      return JSON.parse(JSON.stringify(CONFIG_HORARIOS_PADRAO));
    }

    const parsed = JSON.parse(salvo);
    return {
      obras: {
        ...CONFIG_HORARIOS_PADRAO.obras,
        ...parsed.obras,
        segundaASexta: { ...CONFIG_HORARIOS_PADRAO.obras.segundaASexta, ...(parsed.obras?.segundaASexta || {}) },
        sabados: { ...CONFIG_HORARIOS_PADRAO.obras.sabados, ...(parsed.obras?.sabados || {}) },
        domingos: { ...CONFIG_HORARIOS_PADRAO.obras.domingos, ...(parsed.obras?.domingos || {}) },
        feriados: { ...CONFIG_HORARIOS_PADRAO.obras.feriados, ...(parsed.obras?.feriados || {}) }
      },
      mudancas: {
        ...CONFIG_HORARIOS_PADRAO.mudancas,
        ...parsed.mudancas,
        segundaASexta: { ...CONFIG_HORARIOS_PADRAO.mudancas.segundaASexta, ...(parsed.mudancas?.segundaASexta || {}) },
        sabados: { ...CONFIG_HORARIOS_PADRAO.mudancas.sabados, ...(parsed.mudancas?.sabados || {}) },
        domingos: { ...CONFIG_HORARIOS_PADRAO.mudancas.domingos, ...(parsed.mudancas?.domingos || {}) },
        feriados: { ...CONFIG_HORARIOS_PADRAO.mudancas.feriados, ...(parsed.mudancas?.feriados || {}) }
      },
      atualizadoEm: parsed.atualizadoEm,
      atualizadoPor: parsed.atualizadoPor
    };
  } catch (error) {
    console.warn('[horariosRegrasService] Erro ao carregar horários:', error);
    return JSON.parse(JSON.stringify(CONFIG_HORARIOS_PADRAO));
  }
}

/**
 * Salva a configuração de horários
 */
export function salvarConfiguracaoHorarios(
  config: ConfiguracaoHorariosObrasMudancas,
  condominioId?: string,
  operadorNome?: string
): ConfiguracaoHorariosObrasMudancas {
  try {
    const dadosSalvar: ConfiguracaoHorariosObrasMudancas = {
      ...config,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: operadorNome || 'Operador Portaria'
    };

    const chave = obterChaveStorage(condominioId);
    localStorage.setItem(chave, JSON.stringify(dadosSalvar));

    // Se salvou no condomínio específico, também atualiza se for o primeiro
    if (chave !== CHAVE_STORAGE_PREFIX && !localStorage.getItem(CHAVE_STORAGE_PREFIX)) {
      localStorage.setItem(CHAVE_STORAGE_PREFIX, JSON.stringify(dadosSalvar));
    }

    // Dispara evento para atualização instantânea em outros componentes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('porttohub:horarios_regras_alterados', {
        detail: { config: dadosSalvar, condominioId }
      }));
    }

    return dadosSalvar;
  } catch (error) {
    console.error('[horariosRegrasService] Erro ao salvar horários:', error);
    return config;
  }
}

/**
 * Restaura os horários de fábrica
 */
export function restaurarPadraoHorarios(
  condominioId?: string,
  operadorNome?: string
): ConfiguracaoHorariosObrasMudancas {
  return salvarConfiguracaoHorarios(CONFIG_HORARIOS_PADRAO, condominioId, operadorNome);
}

/**
 * Lista de feriados nacionais brasileiros fixos (mês e dia)
 */
const FERIADOS_NACIONAIS_FIXOS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia da Consciência Negra
  '12-25'  // Natal
];

/**
 * Checa se uma data específica é feriado nacional
 */
export function isFeriadoNacional(data: Date = new Date()): boolean {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const chave = `${mes}-${dia}`;
  return FERIADOS_NACIONAIS_FIXOS.includes(chave);
}

export type TipoPeriodoSemana = 'segundaASexta' | 'sabados' | 'domingos' | 'feriados';

/**
 * Identifica o período correspondente para a data fornecida
 */
export function identificarPeriodoSemana(data: Date = new Date()): {
  chave: TipoPeriodoSemana;
  rotulo: string;
  eFeriado: boolean;
} {
  if (isFeriadoNacional(data)) {
    return { chave: 'feriados', rotulo: 'Feriado', eFeriado: true };
  }

  const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
  if (diaSemana === 0) {
    return { chave: 'domingos', rotulo: 'Domingo', eFeriado: false };
  }
  if (diaSemana === 6) {
    return { chave: 'sabados', rotulo: 'Sábado', eFeriado: false };
  }
  return { chave: 'segundaASexta', rotulo: '2ª a 6ª Feira', eFeriado: false };
}

/**
 * Valida se um horário atual ou informado está dentro do permitido para obra ou mudança
 */
export function validarHorarioPermitido(
  categoria: 'obras' | 'mudancas',
  dataHora: Date = new Date(),
  condominioId?: string
): {
  permitido: boolean;
  statusTexto: string;
  periodoRotulo: string;
  regra: HorarioRegraPeriodo;
  horarioFormatado: string;
  toleranciaMinutos: number;
  observacao?: string;
} {
  const config = obterConfiguracaoHorarios(condominioId);
  const regrasCat = config[categoria];
  const { chave, rotulo } = identificarPeriodoSemana(dataHora);
  const regra = regrasCat[chave];

  const horaAtualStr = `${String(dataHora.getHours()).padStart(2, '0')}:${String(dataHora.getMinutes()).padStart(2, '0')}`;
  const tolerancia = regrasCat.toleranciaMinutos || 0;

  if (!regra.permitido) {
    return {
      permitido: false,
      statusTexto: `Não permitido aos ${rotulo.toLowerCase()}s`,
      periodoRotulo: rotulo,
      regra,
      horarioFormatado: 'Bloqueado',
      toleranciaMinutos: tolerancia,
      observacao: regra.observacao
    };
  }

  const dentroDoHorario = horaAtualStr >= regra.horarioInicio && horaAtualStr <= regra.horarioFim;

  if (dentroDoHorario) {
    return {
      permitido: true,
      statusTexto: `Permitido até às ${regra.horarioFim}`,
      periodoRotulo: rotulo,
      regra,
      horarioFormatado: `${regra.horarioInicio} às ${regra.horarioFim}`,
      toleranciaMinutos: tolerancia,
      observacao: regra.observacao
    };
  }

  if (horaAtualStr < regra.horarioInicio) {
    return {
      permitido: false,
      statusTexto: `Início permitido às ${regra.horarioInicio}`,
      periodoRotulo: rotulo,
      regra,
      horarioFormatado: `${regra.horarioInicio} às ${regra.horarioFim}`,
      toleranciaMinutos: tolerancia,
      observacao: regra.observacao
    };
  }

  return {
    permitido: false,
    statusTexto: `Encerrado às ${regra.horarioFim}`,
    periodoRotulo: rotulo,
    regra,
    horarioFormatado: `${regra.horarioInicio} às ${regra.horarioFim}`,
    toleranciaMinutos: tolerancia,
    observacao: regra.observacao
  };
}
