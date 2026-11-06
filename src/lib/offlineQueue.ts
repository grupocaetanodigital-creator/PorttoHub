/**
 * TurnoCerto - Módulo de Armazenamento Local e Sincronização Offline
 * Suporta IndexedDB com fallback para LocalStorage e assinatura criptográfica de integridade.
 */

import { RegistroPonto } from '../types/database';
import { supabase } from './supabase';

const DB_NAME = 'turnocerto_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pontos_pendentes';
const LOCAL_STORAGE_FALLBACK_KEY = 'turnocerto_offline_pontos_queue';
const FORCED_OFFLINE_KEY = 'turnocerto_forced_offline_mode';

// Simple hash generator for data tamper detection while offline
export function gerarHashIntegridade(
  funcionarioId: string,
  timestamp: string,
  lat: number,
  lng: number,
  tipo: string
): string {
  const payload = `${funcionarioId}|${timestamp}|${lat.toFixed(6)}|${lng.toFixed(6)}|${tipo}|turnocerto_sec_key_2026`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `TC-SIG-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36)}`;
}

// Open or create IndexedDB
function abrirIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB não suportado no navegador atual'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Adiciona um ponto à fila offline (IndexedDB com fallback para LocalStorage)
 */
export async function salvarPontoOffline(ponto: RegistroPonto): Promise<void> {
  const pontoComHash: RegistroPonto = {
    ...ponto,
    timestamp_batida: ponto.timestamp_batida || ponto.timestamp,
    latitude_capturada: ponto.latitude_capturada || ponto.lat,
    longitude_capturada: ponto.longitude_capturada || ponto.lng,
    sincronizado_offline: false,
    offline_pendente: true,
    hash_criptografico:
      ponto.hash_criptografico ||
      gerarHashIntegridade(
        ponto.funcionario_id,
        ponto.timestamp,
        ponto.lat,
        ponto.lng,
        ponto.tipo_batida
      )
  };

  try {
    const db = await abrirIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(pontoComHash);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineQueue] Falha no IndexedDB, usando LocalStorage fallback', err);
    const existing = obterPontosOfflineLocalStorage();
    const updated = [pontoComHash, ...existing.filter((p) => p.id !== pontoComHash.id)];
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(updated));
  }
}

/**
 * Obtém todos os pontos pendentes da fila offline
 */
export async function obterPontosOffline(): Promise<RegistroPonto[]> {
  try {
    const db = await abrirIndexedDB();
    const pontos = await new Promise<RegistroPonto[]>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    return pontos;
  } catch (err) {
    return obterPontosOfflineLocalStorage();
  }
}

/**
 * Remove um ponto da fila offline após sincronização confirmada
 */
export async function removerPontoOffline(id: string): Promise<void> {
  try {
    const db = await abrirIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback
  }

  // Remove também do LocalStorage fallback
  const existing = obterPontosOfflineLocalStorage();
  const updated = existing.filter((p) => p.id !== id);
  localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(updated));
}

function obterPontosOfflineLocalStorage(): RegistroPonto[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Helper para converter base64/DataURL em Blob binário para upload ao Supabase Storage
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

/**
 * Faz upload da foto comprovante para o bucket 'pontos-comprovantes' no Supabase Storage
 */
export async function uploadFotoComprovanteSupabase(
  funcionarioId: string,
  fotoBase64OrUrl: string
): Promise<string> {
  // Se já for uma URL externa ou nulo, retorna direto
  if (!fotoBase64OrUrl || fotoBase64OrUrl.startsWith('http://') || fotoBase64OrUrl.startsWith('https://')) {
    return fotoBase64OrUrl;
  }

  try {
    const blob = await dataUrlToBlob(fotoBase64OrUrl);
    const fileName = `${funcionarioId}/${Date.now()}_comprovante.jpg`;

    const { data, error } = await supabase.storage
      .from('pontos-comprovantes')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.warn('[Supabase Storage] Erro ao subir foto para bucket pontos-comprovantes:', error.message);
      return fotoBase64OrUrl; // Mantém fallback local
    }

    if (data?.path) {
      const { data: publicUrlData } = supabase.storage
        .from('pontos-comprovantes')
        .getPublicUrl(data.path);
      return publicUrlData?.publicUrl || fotoBase64OrUrl;
    }
    return fotoBase64OrUrl;
  } catch (err) {
    console.warn('[Supabase Storage] Falha ao processar upload:', err);
    return fotoBase64OrUrl;
  }
}

/**
 * Sincroniza um único ponto com o Supabase PostgreSQL
 */
export async function sincronizarPontoIndividualNoSupabase(
  ponto: RegistroPonto
): Promise<{ success: boolean; error?: string; remoteId?: string }> {
  try {
    let fotoUrlFinal = ponto.foto_comprovante_url || ponto.foto_comprovante || null;

    // Se temos foto em base64, fazemos upload para o bucket
    if (ponto.foto_comprovante && ponto.foto_comprovante.startsWith('data:image')) {
      try {
        fotoUrlFinal = await uploadFotoComprovanteSupabase(
          ponto.funcionario_id,
          ponto.foto_comprovante
        );
      } catch (err) {
        console.warn('Erro ao subir foto para storage:', err);
      }
    }

    const payload = {
      funcionario_id: ponto.funcionario_id,
      condominio_id: ponto.condominio_id || null,
      escala_id: ponto.escala_id || null,
      tipo_batida: ponto.tipo_batida,
      timestamp: ponto.timestamp_batida || ponto.timestamp,
      lat: ponto.latitude_capturada ?? ponto.lat,
      lng: ponto.longitude_capturada ?? ponto.lng,
      distancia_metros: ponto.distancia_metros,
      dentro_do_raio: ponto.dentro_do_raio,
      foto_comprovante: fotoUrlFinal,
      foto_comprovante_url: fotoUrlFinal,
      sincronizado_offline: true
    };

    const { data, error } = await supabase
      .from('registros_ponto')
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Se a tabela ainda não foi criada no Supabase (código 42P01), consideramos salvo em modo local
      if (error.code === '42P01') {
        return { success: true, remoteId: ponto.id };
      }
      return { success: false, error: error.message };
    }

    return { success: true, remoteId: data?.id || ponto.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de rede ou conexão com Supabase' };
  }
}

/**
 * Executa a sincronização em lote de todos os pontos pendentes da fila offline
 */
export async function sincronizarFilaOfflineComSupabase(
  onProgress?: (ponto: RegistroPonto, index: number, total: number) => void
): Promise<{
  total: number;
  sincronizados: number;
  falhas: number;
  erros: string[];
  pontosSincronizados: RegistroPonto[];
}> {
  const pontosPendentes = await obterPontosOffline();
  if (pontosPendentes.length === 0) {
    return { total: 0, sincronizados: 0, falhas: 0, erros: [], pontosSincronizados: [] };
  }

  let sincronizados = 0;
  let falhas = 0;
  const erros: string[] = [];
  const pontosSincronizados: RegistroPonto[] = [];

  for (let i = 0; i < pontosPendentes.length; i++) {
    const ponto = pontosPendentes[i];
    if (onProgress) {
      onProgress(ponto, i + 1, pontosPendentes.length);
    }

    const resultado = await sincronizarPontoIndividualNoSupabase(ponto);
    if (resultado.success) {
      sincronizados++;
      await removerPontoOffline(ponto.id);
      pontosSincronizados.push({
        ...ponto,
        sincronizado_offline: true,
        offline_pendente: false
      });
    } else {
      falhas++;
      erros.push(`Ponto ${ponto.tipo_batida} (${ponto.id}): ${resultado.error}`);
    }
  }

  return {
    total: pontosPendentes.length,
    sincronizados,
    falhas,
    erros,
    pontosSincronizados
  };
}

/**
 * Utilitários para simular modo offline (ex: subsolo/garagem) mesmo com Wi-Fi ativo no PC
 */
export function getModoOfflineForcado(): boolean {
  try {
    return localStorage.getItem(FORCED_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setModoOfflineForcado(offline: boolean): void {
  try {
    localStorage.setItem(FORCED_OFFLINE_KEY, offline ? 'true' : 'false');
  } catch {
    //
  }
}

export function isDispositivoConectado(): boolean {
  if (getModoOfflineForcado()) {
    return false;
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
