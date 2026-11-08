/**
 * Serviço de Gerenciamento do Sistema de Temas do INFPORT 1.0
 * 
 * Permite alternar perfeitamente entre:
 * - Modo Claro ('claro'): Fundo claro/branco, textos escuros, bordas finas e sutis.
 * - Modo Escuro ('escuro'): Fundo escuro/slate, textos brancos/claros, bordas suaves escuras.
 */

export type TipoTema = 'claro' | 'escuro';

const CHAVE_STORAGE_TEMA = 'infport_tema_visual_v2';
const CHAVE_CUSTOMIZACAO = 'porttohub_customizacao_visual_v2';

/**
 * Retorna o tema atual configurado ('claro' ou 'escuro')
 * Padrão: 'escuro'
 */
export function obterTemaAtual(): TipoTema {
  if (typeof window === 'undefined') return 'escuro';
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE_TEMA);
    if (salvo === 'escuro' || salvo === 'claro') {
      return salvo;
    }
    const customStr = localStorage.getItem(CHAVE_CUSTOMIZACAO);
    if (customStr) {
      const parsed = JSON.parse(customStr);
      if (parsed.temaGlobalId === 'clean_light') {
        return 'claro';
      }
    }
    // Sincroniza com a classe já presente no elemento raiz do documento
    if (document.documentElement.classList.contains('light')) {
      return 'claro';
    }
    if (document.documentElement.classList.contains('dark')) {
      return 'escuro';
    }
    return 'escuro';
  } catch {
    return 'escuro';
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
    body?.classList.remove('alto-contraste');

    if (tema === 'escuro') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
        body.setAttribute('data-theme', 'dark');
      }
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      if (body) {
        body.classList.add('light');
        body.classList.remove('dark');
        body.setAttribute('data-theme', 'light');
      }
      root.style.colorScheme = 'light';
    }

    localStorage.setItem(CHAVE_STORAGE_TEMA, tema);
    // Limpa chave antiga de alto contraste
    localStorage.removeItem('infport_modo_alto_contraste');

    // Sincroniza bidirecionalmente com as chaves de customização visual para evitar sobrescritas
    try {
      const customStr = localStorage.getItem(CHAVE_CUSTOMIZACAO);
      const customObj = customStr ? JSON.parse(customStr) : {};
      customObj.temaGlobalId = tema === 'claro' ? 'clean_light' : 'porttohub_dark';
      localStorage.setItem(CHAVE_CUSTOMIZACAO, JSON.stringify(customObj));

      const condoId = localStorage.getItem('infport_condominio_ativo_id');
      if (condoId && condoId !== 'global' && condoId !== 'todos') {
        const chaveCondo = `porttohub_customizacao_visual_${condoId}`;
        const cStr = localStorage.getItem(chaveCondo);
        if (cStr) {
          const cObj = JSON.parse(cStr);
          cObj.temaGlobalId = tema === 'claro' ? 'clean_light' : 'porttohub_dark';
          localStorage.setItem(chaveCondo, JSON.stringify(cObj));
        }
      }
    } catch {}

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', tema === 'escuro' ? '#0f172a' : '#f8fafc');
    }

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

