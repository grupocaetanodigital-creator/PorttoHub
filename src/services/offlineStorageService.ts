/**
 * Serviço de Gerenciamento de Cache Offline e Fallback para a Portaria
 * Garante que em caso de queda de conexão, o operador continue visualizando
 * dados essenciais e consiga navegar normalmente sem travamentos.
 */

const PREFIX_CACHE = 'infport_offline_cache_';

export function salvarCacheLocal<T>(chave: string, dados: T, condominioId: string = 'global'): void {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const payload = {
      timestamp: new Date().toISOString(),
      dados
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn(`[OfflineService] Erro ao persistir cache local para ${chave}:`, e);
  }
}

export function obterCacheLocal<T>(chave: string, condominioId: string = 'global', fallbackDefault: T): T {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dados !== undefined) {
        return parsed.dados as T;
      }
    }
  } catch (e) {
    console.warn(`[OfflineService] Erro ao ler cache local de ${chave}:`, e);
  }
  return fallbackDefault;
}

export function obterDataUltimoCache(chave: string, condominioId: string = 'global'): Date | null {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp) {
        return new Date(parsed.timestamp);
      }
    }
  } catch (e) {
    // ignorar
  }
  return null;
}

import { inicializarDetectorAtualizacoesPwa } from './pwaUpdateService';

/**
 * Registra o Service Worker do PWA usando a API padrão do navegador
 * e inicializa o detector de atualizações automáticas
 */
export async function registrarPwaServiceWorker(): Promise<void> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      await inicializarDetectorAtualizacoesPwa();
    } catch (e) {
      console.warn('[PWA] Falha ao inicializar Service Worker:', e);
    }
  }
}

