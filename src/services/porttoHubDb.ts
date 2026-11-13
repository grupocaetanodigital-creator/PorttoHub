/**
 * PorttoHub — Banco de Dados Local-First no Cliente (IndexedDB)
 * 
 * ARQUITETURA DE PERFORMANCE ULTRA-RÁPIDA (0ms):
 * - Persistência assíncrona de alta capacidade no dispositivo do operador.
 * - Desacoplamento da UI: Leitura em 0ms sem bloquear o event loop (ao contrário do localStorage).
 * - Suporta milhares de encomendas, moradores, veículos, custódias e registros de acesso.
 * - Suporte a índices compostos para queries multi-tenant instantâneas.
 */

export const PORTTOHUB_DB_NAME = 'PorttoHub_LocalFirst_DB';
export const PORTTOHUB_DB_VERSION = 1;

export type NomeTabelaLocal = 
  | 'encomendas_itens'
  | 'custodia'
  | 'moradores'
  | 'veiculos'
  | 'unidades'
  | 'regras_horarios'
  | 'bancada_volumes'
  | 'chaves'
  | 'registros_acesso'
  | 'sync_metadata';

export interface SyncMetadataRecord {
  store_and_condo: string; // Chave primária: ex "${tabela}_${condominioId}"
  tabela: string;
  condominioId: string;
  lastSyncTimestamp: string;
  totalCount: number;
  lastFullSync: string;
}

let dbInstancia: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

// Fallback in-memory para ambientes onde IndexedDB estiver desabilitado (ex: modo anônimo restrito)
const memoriaFallback = new Map<string, any[]>();
const memoriaMetadataFallback = new Map<string, SyncMetadataRecord>();

/**
 * Abre e inicializa a conexão com o IndexedDB do PorttoHub
 */
export function abrirPorttoHubDb(): Promise<IDBDatabase> {
  if (dbInstancia) {
    return Promise.resolve(dbInstancia);
  }
  if (dbPromise) {
    return dbPromise;
  }

  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB não suportado neste ambiente'));
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(PORTTOHUB_DB_NAME, PORTTOHUB_DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Encomendas Itens
        if (!db.objectStoreNames.contains('encomendas_itens')) {
          const store = db.createObjectStore('encomendas_itens', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('unidade_bloco', 'unidade_bloco', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('condo_status', ['condominio_id', 'status'], { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 2. Custódia
        if (!db.objectStoreNames.contains('custodia')) {
          const store = db.createObjectStore('custodia', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('updated_at', 'updated_at', { unique: false });
          store.createIndex('condo_status', ['condominio_id', 'status'], { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 3. Moradores
        if (!db.objectStoreNames.contains('moradores')) {
          const store = db.createObjectStore('moradores', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('unidade', 'unidade', { unique: false });
          store.createIndex('bloco', 'bloco', { unique: false });
          store.createIndex('veiculo_placa', 'veiculo_placa', { unique: false });
          store.createIndex('condo_unidade', ['condominio_id', 'unidade'], { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 4. Veículos
        if (!db.objectStoreNames.contains('veiculos')) {
          const store = db.createObjectStore('veiculos', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('placa', 'placa', { unique: false });
          store.createIndex('unidade_bloco', 'unidade_bloco', { unique: false });
          store.createIndex('condo_placa', ['condominio_id', 'placa'], { unique: false });
        }

        // 5. Unidades Cadastradas / Estrutura
        if (!db.objectStoreNames.contains('unidades')) {
          const store = db.createObjectStore('unidades', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('unidade', 'unidade', { unique: false });
          store.createIndex('bloco', 'bloco', { unique: false });
        }

        // 6. Regras de Horários (Obras / Mudanças)
        if (!db.objectStoreNames.contains('regras_horarios')) {
          const store = db.createObjectStore('regras_horarios', { keyPath: 'condominio_id' });
          store.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // 7. Bancada Volumes
        if (!db.objectStoreNames.contains('bancada_volumes')) {
          const store = db.createObjectStore('bancada_volumes', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 8. Claviculário / Chaves
        if (!db.objectStoreNames.contains('chaves')) {
          const store = db.createObjectStore('chaves', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('numero', 'numero', { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 9. Registros de Acesso Portaria
        if (!db.objectStoreNames.contains('registros_acesso')) {
          const store = db.createObjectStore('registros_acesso', { keyPath: 'id' });
          store.createIndex('condominio_id', 'condominio_id', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('data_hora_entrada', 'data_hora_entrada', { unique: false });
          store.createIndex('condo_updated', ['condominio_id', 'updated_at'], { unique: false });
        }

        // 10. Metadados de Sincronização Delta
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'store_and_condo' });
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstancia = (event.target as IDBOpenDBRequest).result;
        dbInstancia.onversionchange = () => {
          dbInstancia?.close();
          dbInstancia = null;
          dbPromise = null;
        };
        resolve(dbInstancia);
      };

      request.onerror = (event: Event) => {
        console.warn('[IndexedDB] Erro ao abrir banco de dados local:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    } catch (err) {
      console.warn('[IndexedDB] Exceção ao inicializar banco local:', err);
      reject(err);
    }
  });

  return dbPromise;
}

function isCondoLocalValido(condominioId?: string): condominioId is string {
  return Boolean(
    condominioId &&
    condominioId !== 'todos' &&
    condominioId !== 'global' &&
    condominioId !== 'undefined' &&
    condominioId !== 'null'
  );
}

/**
 * Lê todos os registros de uma tabela local filtrados estritamente por condomínio (0ms)
 */
export async function obterTodosItensLocal<T = any>(
  storeName: NomeTabelaLocal,
  condominioId: string
): Promise<T[]> {
  if (!isCondoLocalValido(condominioId)) {
    return [];
  }

  try {
    const db = await abrirPorttoHubDb();
    return new Promise<T[]>((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      if (store.indexNames.contains('condominio_id')) {
        const index = store.index('condominio_id');
        const req = index.getAll(IDBKeyRange.only(condominioId));
        req.onsuccess = () => resolve(((req.result || []) as any[]).filter((it: any) => it?.condominio_id === condominioId) as T[]);
        req.onerror = () => {
          const reqAll = store.getAll();
          reqAll.onsuccess = () => {
            const todos = reqAll.result || [];
            resolve(todos.filter((it: any) => it?.condominio_id === condominioId) as T[]);
          };
          reqAll.onerror = () => resolve([]);
        };
      } else {
        const req = store.getAll();
        req.onsuccess = () => {
          const lista = (req.result || []).filter((it: any) => it?.condominio_id === condominioId);
          resolve(lista as T[]);
        };
        req.onerror = () => resolve([]);
      }
    });
  } catch (err) {
    const chave = `${storeName}_${condominioId}`;
    return ((memoriaFallback.get(chave) || []) as any[]).filter((it: any) => it?.condominio_id === condominioId) as T[];
  }
}

/**
 * Lê um único registro por chave primária, validando pertencimento ao condomínio quando informado
 */
export async function obterItemPorIdLocal<T = any>(
  storeName: NomeTabelaLocal,
  id: string | number,
  condominioId?: string
): Promise<T | null> {
  if (condominioId !== undefined && !isCondoLocalValido(condominioId)) {
    return null;
  }

  try {
    const db = await abrirPorttoHubDb();
    return new Promise<T | null>((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result || null;
        if (res && condominioId && (res as any).condominio_id && (res as any).condominio_id !== condominioId) {
          resolve(null);
          return;
        }
        resolve(res);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    if (condominioId) {
      const lista = memoriaFallback.get(`${storeName}_${condominioId}`) || [];
      return (lista.find((it: any) => String(it.id) === String(id) && it?.condominio_id === condominioId) || null) as T | null;
    }
    return null;
  }
}

/**
 * Salva um item individual no banco local validando compatibilidade com condominioId
 */
export async function salvarItemLocal<T extends { id?: any; condominio_id?: string }>(
  storeName: NomeTabelaLocal,
  item: T,
  condominioId?: string
): Promise<void> {
  if (condominioId !== undefined && !isCondoLocalValido(condominioId)) {
    throw new Error('[IndexedDB] condominioId inválido ao salvar item local.');
  }
  if (condominioId && item.condominio_id && item.condominio_id !== condominioId) {
    throw new Error(`[IndexedDB] Tentativa bloqueada de gravação cross-tenant em ${storeName}.`);
  }

  const itemSeguro: T = condominioId && !item.condominio_id
    ? { ...item, condominio_id: condominioId }
    : item;

  try {
    const db = await abrirPorttoHubDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(itemSeguro);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    if (itemSeguro.condominio_id) {
      const chave = `${storeName}_${itemSeguro.condominio_id}`;
      const lista = memoriaFallback.get(chave) || [];
      const idx = lista.findIndex((it: any) => String(it.id) === String(itemSeguro.id));
      if (idx >= 0) lista[idx] = itemSeguro;
      else lista.push(itemSeguro);
      memoriaFallback.set(chave, lista);
    }
  }
}

/**
 * Exclui um registro do banco local validando pertencimento ao condomínio quando informado
 */
export async function excluirItemLocal(
  storeName: NomeTabelaLocal,
  id: string | number,
  condominioId?: string
): Promise<void> {
  if (condominioId !== undefined && !isCondoLocalValido(condominioId)) {
    return;
  }

  try {
    const db = await abrirPorttoHubDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (condominioId) {
        const reqGet = store.get(id);
        reqGet.onsuccess = () => {
          const existente = reqGet.result;
          if (existente && existente.condominio_id && existente.condominio_id !== condominioId) {
            return;
          }
          store.delete(id);
        };
      } else {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    if (condominioId) {
      const chave = `${storeName}_${condominioId}`;
      const lista = memoriaFallback.get(chave) || [];
      memoriaFallback.set(chave, lista.filter((it: any) => String(it.id) !== String(id)));
    }
  }
}

/**
 * Salva um lote inteiro de registros em uma única transação atômica com validação estrita de tenant
 */
export async function salvarLoteItensLocal<T = any>(
  storeName: NomeTabelaLocal,
  itens: T[],
  condominioId: string,
  cursorTimestamp?: string,
  substituirTodos: boolean = false
): Promise<void> {
  if (!isCondoLocalValido(condominioId) || !itens || itens.length === 0) return;

  const itensSeguros = itens.filter((item: any) => !item?.condominio_id || item.condominio_id === condominioId);
  if (itensSeguros.length === 0) return;

  try {
    const db = await abrirPorttoHubDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      if (substituirTodos && store.indexNames.contains('condominio_id')) {
        const index = store.index('condominio_id');
        const reqKeys = index.getAllKeys(IDBKeyRange.only(condominioId));
        reqKeys.onsuccess = () => {
          const keys = reqKeys.result || [];
          for (const k of keys) {
            store.delete(k);
          }
          for (const item of itensSeguros) {
            store.put(item);
          }
        };
      } else {
        for (const item of itensSeguros) {
          store.put(item);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (cursorTimestamp) {
      await salvarMetadataSyncLocal(storeName, condominioId, cursorTimestamp, itensSeguros.length);
    }
  } catch (err) {
    console.warn(`[IndexedDB] Fallback para gravação de ${storeName}:`, err);
    const chave = `${storeName}_${condominioId}`;
    memoriaFallback.set(chave, itensSeguros);
  }
}

/**
 * Obtém os metadados da última sincronização delta para uma tabela e condomínio
 */
export async function obterMetadataSyncLocal(
  tabela: string,
  condominioId: string
): Promise<SyncMetadataRecord | null> {
  const chave = `${tabela}_${condominioId}`;
  try {
    const db = await abrirPorttoHubDb();
    return new Promise<SyncMetadataRecord | null>((resolve) => {
      const tx = db.transaction('sync_metadata', 'readonly');
      const store = tx.objectStore('sync_metadata');
      const req = store.get(chave);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return memoriaMetadataFallback.get(chave) || null;
  }
}

/**
 * Grava os metadados da sincronização delta
 */
export async function salvarMetadataSyncLocal(
  tabela: string,
  condominioId: string,
  lastSyncTimestamp: string,
  totalCount: number
): Promise<void> {
  const payload: SyncMetadataRecord = {
    store_and_condo: `${tabela}_${condominioId}`,
    tabela,
    condominioId,
    lastSyncTimestamp,
    totalCount,
    lastFullSync: new Date().toISOString()
  };

  try {
    const db = await abrirPorttoHubDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sync_metadata', 'readwrite');
      const store = tx.objectStore('sync_metadata');
      store.put(payload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    memoriaMetadataFallback.set(payload.store_and_condo, payload);
  }
}

/**
 * Limpa todo o cache local de um condomínio específico (ex: ao trocar de condomínio)
 */
export async function limparCacheLocalCondominio(condominioId: string): Promise<void> {
  try {
    const db = await abrirPorttoHubDb();
    const tabelas: NomeTabelaLocal[] = [
      'encomendas_itens',
      'custodia',
      'moradores',
      'veiculos',
      'unidades',
      'bancada_volumes',
      'chaves',
      'registros_acesso'
    ];

    for (const tab of tabelas) {
      const tx = db.transaction(tab, 'readwrite');
      const store = tx.objectStore(tab);
      if (store.indexNames.contains('condominio_id')) {
        const index = store.index('condominio_id');
        const reqKeys = index.getAllKeys(IDBKeyRange.only(condominioId));
        reqKeys.onsuccess = () => {
          const keys = reqKeys.result || [];
          for (const k of keys) {
            store.delete(k);
          }
        };
      }
    }
  } catch (err) {
    console.warn('[IndexedDB] Erro ao limpar cache do condomínio:', err);
  }
}
