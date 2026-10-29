/**
 * Serviço de Gerenciamento de Cache Local e Otimização de Rede (PWA)
 * 
 * DIRETRIZ ARQUITETURAL SUPABASE FREE TIER:
 * 1. Cache local com controle de validade/timestamp (TTL) para condomínios, blocos, unidades, operadores e configs.
 * 2. Previne requisições GET redundantes a cada navegação de tela.
 * 3. Consultas ao Supabase só disparam na expiração do TTL, mutação de dados (Insert/Update/Delete) ou acionamento de "Atualizar/Sincronizar".
 */

const PREFIX_CACHE = 'infport_offline_cache_';
export const EVENTO_SINCRONIZAR_DADOS = 'infport_sincronizar_dados_global';
export const EVENTO_CACHE_INVALIDADO = 'infport_cache_invalidado';

export interface CachePayload<T> {
  timestamp: number; // Unix timestamp em milissegundos
  ttlMs: number;     // Duração máxima em milissegundos
  dados: T;
}

/**
 * Salva dados no cache local com TTL configurável (padrão: 60 minutos para dados cadastrais e configs)
 */
export function salvarCacheLocal<T>(
  chave: string, 
  dados: T, 
  condominioId: string = 'global', 
  ttlMinutos: number = 60
): void {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const payload: CachePayload<T> = {
      timestamp: Date.now(),
      ttlMs: ttlMinutos * 60 * 1000,
      dados
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn(`[OfflineService] Erro ao persistir cache local para ${chave}:`, e);
  }
}

/**
 * Obtém dados do cache local respeitando o TTL.
 * Se o cache estiver expirado ou ausente, retorna fallbackDefault (ou null).
 * Permite forçar bypass via parametro forcarAtualizacao.
 */
export function obterCacheLocal<T>(
  chave: string, 
  condominioId: string = 'global', 
  fallbackDefault: T,
  ignorarExpiracao: boolean = false
): T {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackDefault;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.dados === undefined) return fallbackDefault;

    // Suporte retrocompatível com payloads legados que tinham timestamp em string ISO
    const timestamp = typeof parsed.timestamp === 'number' 
      ? parsed.timestamp 
      : (parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0);
    const ttlMs = parsed.ttlMs || (60 * 60 * 1000); // 60 min padrão legado

    const expirado = Date.now() - timestamp > ttlMs;

    // Se estiver online e expirado (e não configurado para ignorar), retorna fallback para acionar GET
    if (expirado && !ignorarExpiracao && typeof navigator !== 'undefined' && navigator.onLine) {
      return fallbackDefault;
    }

    return parsed.dados as T;
  } catch (e) {
    console.warn(`[OfflineService] Erro ao ler cache local de ${chave}:`, e);
  }
  return fallbackDefault;
}

/**
 * Verifica se um dado em cache existe e AINDA está válido dentro da sua janela de TTL
 */
export function isCacheValido(chave: string, condominioId: string = 'global'): boolean {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.dados === undefined) return false;

    const timestamp = typeof parsed.timestamp === 'number'
      ? parsed.timestamp
      : (parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0);
    const ttlMs = parsed.ttlMs || (60 * 60 * 1000);

    return (Date.now() - timestamp) <= ttlMs;
  } catch {
    return false;
  }
}

/**
 * Invalida o cache local para uma chave específica (usado em mutações INSERT, UPDATE, DELETE)
 */
export function invalidarCacheLocal(chave: string, condominioId: string = 'global'): void {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    localStorage.removeItem(key);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTO_CACHE_INVALIDADO, { detail: { chave, condominioId } }));
    }
  } catch (e) {
    console.warn(`[OfflineService] Erro ao invalidar cache para ${chave}:`, e);
  }
}

/**
 * Dispara evento global de sincronização manual acionado pelo operador ("Atualizar/Sincronizar")
 */
export function dispararSincronizacaoManual(condominioId?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_SINCRONIZAR_DADOS, { detail: { condominioId, timestamp: Date.now() } }));
  }
}

export function obterDataUltimoCache(chave: string, condominioId: string = 'global'): Date | null {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp) {
        return typeof parsed.timestamp === 'number' ? new Date(parsed.timestamp) : new Date(parsed.timestamp);
      }
    }
  } catch {
    // ignorar
  }
  return null;
}

/**
 * Executa uma consulta de dados com estratégia Stale-While-Revalidate:
 * 1. Tenta carregar do cache local imediatamente para exibição sem atraso.
 * 2. Se online, dispara a busca na rede / Supabase.
 * 3. Se a rede retornar com sucesso, salva no cache e retorna os dados novos.
 * 4. Se a rede falhar (ou offline), preserva e retorna o dado em cache sem gerar erro na tela.
 */
export async function executarConsultaResiliente<T>(
  chave: string,
  consultaFn: () => Promise<T>,
  condominioId: string = 'global',
  ttlMinutos: number = 60
): Promise<{ dados: T; veioDoCache: boolean }> {
  const dadosEmCache = obterCacheLocal<T | null>(chave, condominioId, null, true);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (dadosEmCache !== null) {
      return { dados: dadosEmCache, veioDoCache: true };
    }
  }

  try {
    const dadosNovos = await consultaFn();
    if (dadosNovos !== null && dadosNovos !== undefined) {
      salvarCacheLocal<T>(chave, dadosNovos, condominioId, ttlMinutos);
      return { dados: dadosNovos, veioDoCache: false };
    }
  } catch (err) {
    console.warn(`[OfflineService] Falha na rede para ${chave}. Usando fallback em cache:`, err);
    if (dadosEmCache !== null) {
      return { dados: dadosEmCache, veioDoCache: true };
    }
    throw err;
  }

  return { dados: (dadosEmCache ?? ([] as any)) as T, veioDoCache: true };
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

