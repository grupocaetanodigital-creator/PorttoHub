/**
 * Serviço de Gestão e Blindagem de Cache Local (INFPORT)
 * 
 * Garante que:
 * 1. Todos os caches locais associados a condomínios específicos sejam invalidados
 *    quando houver limpeza/reset de banco de dados ou inconsistência de ID.
 * 2. Caches contendo itens com condomínio divergente do ativo sejam instantaneamente purgados.
 * 3. Chaves com prefixos 'infport_cache_retidos_', 'infport_locais_' e 'infport_flags_'
 *    sejam eliminadas por completo nas operações de reset/limpeza.
 */

export const PREFIXOS_CACHE_BLINDADO = [
  'infport_cache_retidos_',
  'infport_locais_',
  'infport_flags_',
  'infport_item_local_'
] as const;

/**
 * Varre e apaga obrigatoriamente todas as chaves do localStorage iniciadas com:
 * - infport_cache_retidos_
 * - infport_locais_
 * - infport_flags_
 * - infport_item_local_
 */
export function purgarCachesLocaisInfport(): { totalRemovidas: number; chaves: string[] } {
  const chavesRemovidas: string[] = [];
  if (typeof window === 'undefined' || !window.localStorage) {
    return { totalRemovidas: 0, chaves: [] };
  }

  try {
    const chavesParaRemover: string[] = [];
    const totalItens = localStorage.length;

    for (let i = 0; i < totalItens; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const corresponde = PREFIXOS_CACHE_BLINDADO.some(prefixo => key.startsWith(prefixo));
      if (corresponde) {
        chavesParaRemover.push(key);
      }
    }

    chavesParaRemover.forEach((key) => {
      try {
        localStorage.removeItem(key);
        chavesRemovidas.push(key);
      } catch (err) {
        console.warn(`[INFPORT Cache] Erro ao remover chave ${key}:`, err);
      }
    });

    console.info(
      `[INFPORT Cache] Purga completa realizada. ${chavesRemovidas.length} chaves removidas do localStorage:`,
      chavesRemovidas
    );

    // Dispara evento global para que qualquer componente montado limpe seus estados locais
    window.dispatchEvent(new CustomEvent('infport:cache_purgado', { detail: { chaves: chavesRemovidas } }));
    window.dispatchEvent(new CustomEvent('infport_sincronizar_dados_global'));
  } catch (err) {
    console.warn('[INFPORT Cache] Falha na purga de caches do localStorage:', err);
  }

  return { totalRemovidas: chavesRemovidas.length, chaves: chavesRemovidas };
}

/**
 * Invalida e limpa especificamente o cache de itens retidos de um condomínio
 */
export function limparCacheRetidosCondominio(condominioId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !condominioId) return;
  try {
    localStorage.removeItem(`infport_cache_retidos_${condominioId}`);
  } catch (err) {
    console.warn(`[INFPORT Cache] Erro ao limpar cache de retidos do condomínio ${condominioId}:`, err);
  }
}

/**
 * Valida os dados de cache na inicialização.
 * Se houver qualquer divergência entre o condominio_id dos itens e o condomínio ativo,
 * ou se os itens forem inconsistentes, o cache é purgado instantaneamente.
 */
export function validarECarregarCacheRetidos(condominioAtivoId: string): any[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  if (!condominioAtivoId || condominioAtivoId === 'global' || condominioAtivoId === 'todos') {
    return [];
  }

  const cacheKey = `infport_cache_retidos_${condominioAtivoId}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(cacheKey);
      return [];
    }

    // Validação estrita: cada item deve ter condominio_id idêntico ao condomínio ativo
    const todosPertencemAoCondominio = parsed.every(
      (item: any) => item && typeof item === 'object' && item.condominio_id === condominioAtivoId
    );

    if (!todosPertencemAoCondominio) {
      console.warn(
        `[INFPORT Cache] Divergência detectada no cache ${cacheKey}. Purgando imediatamente para impedir dados fantasmas.`
      );
      localStorage.removeItem(cacheKey);
      return [];
    }

    return parsed;
  } catch (err) {
    console.warn(`[INFPORT Cache] Erro ao analisar cache ${cacheKey}. Purgando:`, err);
    try {
      localStorage.removeItem(cacheKey);
    } catch {}
    return [];
  }
}
