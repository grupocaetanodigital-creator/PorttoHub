/**
 * Serviço de Acessibilidade e Ajuste Dinâmico da Escala de Fontes
 * INFPORT 1.0 - Projetado para Guaritas e Portarias
 * 
 * Permite ao operador ajustar o tamanho das letras de forma proporcional em todo o sistema.
 * Os valores em REM do Tailwind escalam perfeitamente sem quebrar layouts.
 */

export type NivelEscalaFonte = 100 | 110 | 125 | 140;

export interface OpcaoEscala {
  nivel: NivelEscalaFonte;
  rotulo: string;
  descricao: string;
}

export const OPCOES_ESCALA_FONTE: OpcaoEscala[] = [
  { nivel: 100, rotulo: '100% Padrão', descricao: 'Tamanho padrão de sistema (16px)' },
  { nivel: 110, rotulo: '110% Médio', descricao: 'Leve aumento para leitura facilitada' },
  { nivel: 125, rotulo: '125% Grande', descricao: 'Recomendado para monitores de guarita distantes' },
  { nivel: 140, rotulo: '140% Extra', descricao: 'Máxima visibilidade e acessibilidade' }
];

const CHAVE_STORAGE = 'infport_font_scale';

/**
 * Obtém a escala salva ou retorna o padrão (100)
 */
export function obterEscalaFonteAtual(): NivelEscalaFonte {
  if (typeof window === 'undefined') return 100;
  try {
    const salva = localStorage.getItem(CHAVE_STORAGE);
    if (salva) {
      const num = parseInt(salva, 10);
      if ([100, 110, 125, 140].includes(num)) {
        return num as NivelEscalaFonte;
      }
    }
  } catch (e) {
    // ignore
  }
  return 100;
}

/**
 * Aplica a escala na tag <html> e persiste no localStorage
 */
export function aplicarEscalaFonte(escala: NivelEscalaFonte): void {
  if (typeof window === 'undefined') return;
  try {
    document.documentElement.style.fontSize = `${escala}%`;
    localStorage.setItem(CHAVE_STORAGE, escala.toString());

    // Dispara evento para sincronizar componentes reativos na tela
    window.dispatchEvent(new CustomEvent('infport_escala_fonte_alterada', {
      detail: { escala }
    }));
  } catch (e) {
    console.warn('[Acessibilidade] Falha ao aplicar escala de fonte:', e);
  }
}

/**
 * Aumenta a fonte para o próximo nível
 */
export function aumentarFonte(): NivelEscalaFonte {
  const atual = obterEscalaFonteAtual();
  let nova: NivelEscalaFonte = 100;
  if (atual === 100) nova = 110;
  else if (atual === 110) nova = 125;
  else if (atual >= 125) nova = 140;

  aplicarEscalaFonte(nova);
  return nova;
}

/**
 * Diminui a fonte para o nível anterior
 */
export function diminuirFonte(): NivelEscalaFonte {
  const atual = obterEscalaFonteAtual();
  let nova: NivelEscalaFonte = 100;
  if (atual === 140) nova = 125;
  else if (atual === 125) nova = 110;
  else if (atual <= 110) nova = 100;

  aplicarEscalaFonte(nova);
  return nova;
}

/**
 * Inicializa a fonte na inicialização da aplicação
 */
export function inicializarAcessibilidadeFonte(): void {
  const escala = obterEscalaFonteAtual();
  aplicarEscalaFonte(escala);
}
