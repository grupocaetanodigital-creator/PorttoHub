/**
 * Serviço de Gerenciamento do Sistema de Temas do INFPORT 1.0
 * 
 * Permite alternar perfeitamente entre:
 * - Modo Claro ('claro'): Fundo claro/branco, textos escuros, bordas finas e sutis.
 * - Modo Escuro ('escuro'): Fundo escuro/slate, textos brancos/claros, bordas suaves escuras.
 */

export type TipoTema = 'claro' | 'escuro';

const CHAVE_STORAGE_TEMA = 'infport_tema_visual_v2';

/**
 * Retorna o tema atual configurado ('claro' ou 'escuro')
 * Padrão: 'claro'
 */
export function obterTemaAtual(): TipoTema {
  if (typeof window === 'undefined') return 'claro';
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_TEMA);
    if (salvo === 'escuro' || salvo === 'claro') {
      return salvo;
    }
    // Compatibilidade com chave antiga
    if (localStorage.getItem('infport_modo_alto_contraste') === 'true') {
      return 'claro';
    }
    return 'claro';
  } catch {
    return 'claro';
  }
}

/**
 * Aplica as classes no <html> e <body> e persiste no localStorage
 */
export function aplicarTema(tema: TipoTema): void {
  if (typeof window === 'undefined') return;

  try {
    const root = document.documentElement;
    const body = document.body;

    // Remove classes legadas que causavam conflitos
    root.classList.remove('alto-contraste');
    body.classList.remove('alto-contraste');

    if (tema === 'escuro') {
      root.classList.add('dark');
      root.classList.remove('light');
      body.classList.add('dark');
      body.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      body.classList.add('light');
      body.classList.remove('dark');
    }

    localStorage.setItem(CHAVE_STORAGE_TEMA, tema);
    // Limpa chave antiga de alto contraste
    localStorage.removeItem('infport_modo_alto_contraste');

    // Notifica todos os componentes para re-renderização imediata
    window.dispatchEvent(
      new CustomEvent('infport_tema_alterado', {
        detail: { tema, eEscuro: tema === 'escuro', eClaro: tema === 'claro' }
      })
    );
  } catch (err) {
    console.warn('[Tema] Erro ao aplicar tema:', err);
  }
}

/**
 * Alterna entre Modo Claro e Modo Escuro
 */
export function alternarTema(): TipoTema {
  const atual = obterTemaAtual();
  const novo: TipoTema = atual === 'claro' ? 'escuro' : 'claro';
  aplicarTema(novo);
  return novo;
}

/**
 * Inicializa o tema no carregamento do aplicativo
 */
export function inicializarTema(): void {
  const tema = obterTemaAtual();
  aplicarTema(tema);
}
