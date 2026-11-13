import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';

// Shim mínimo de ambiente browser para serviços Client-Side em execução Node
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  get length() {
    return storageMap.size;
  },
  key(index: number) {
    return Array.from(storageMap.keys())[index] ?? null;
  },
  getItem(key: string) {
    return storageMap.has(key) ? storageMap.get(key)! : null;
  },
  setItem(key: string, value: string) {
    storageMap.set(key, String(value));
  },
  removeItem(key: string) {
    storageMap.delete(key);
  },
  clear() {
    storageMap.clear();
  }
};

const eventListeners = new Map<string, Set<Function>>();
const mockWindow: any = {
  localStorage: mockLocalStorage,
  addEventListener(type: string, cb: Function) {
    if (!eventListeners.has(type)) eventListeners.set(type, new Set());
    eventListeners.get(type)!.add(cb);
  },
  removeEventListener(type: string, cb: Function) {
    eventListeners.get(type)?.delete(cb);
  },
  dispatchEvent(ev: any) {
    const cbs = eventListeners.get(ev?.type);
    if (cbs) {
      cbs.forEach((cb) => cb(ev));
    }
    return true;
  }
};

if (!(globalThis as any).CustomEvent) {
  (globalThis as any).CustomEvent = class CustomEventShim {
    type: string;
    detail: any;
    constructor(type: string, init?: { detail?: any }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
}
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = mockWindow;
if (!(globalThis as any).navigator) {
  (globalThis as any).navigator = { onLine: true };
} else {
  try {
    Object.defineProperty((globalThis as any).navigator, 'onLine', {
      value: true,
      configurable: true
    });
  } catch {}
}

import {
  canAccessCondominio,
  canSwitchCondominio,
  dispatchCondominioAlterado,
  extrairCondominioIdDeEvento,
  isValidCondominioId,
  isVerifiedGlobalAdmin,
  limparCachesOperacionaisTrocaSessao,
  obterCondominiosAutorizadosIds
} from '../src/services/tenantAuthService';
import { getCondominioAtivoId } from '../src/services/condominioService';
import {
  buildIsolatedQueryCacheKey,
  validateAndScopeTenantQuery,
  type AuthenticatedTenantCaller
} from '../src/server/tenantSecurity';
import { createCacheRouter, type RedisCacheLike } from '../src/server/cacheRoutes';
import { cachedQuery, limparCacheMemoriaCliente } from '../src/services/redisCacheService';
import {
  aplicarMutacaoLocal,
  limparCacheRamDeltaSync,
  obterDadosTabelaLocal
} from '../src/services/deltaSyncService';
import { verificarPermissao } from '../src/services/permissoesService';
import {
  obterNomeDestinatarioExibicao,
  resolverMoradorDaEncomenda
} from '../src/services/encomendasService';
import {
  CHAVE_FILA_QUARANTINE,
  enfileirarAcaoOffline,
  obterChaveFilaOffline,
  obterFilaOffline,
  obterFilaQuarentena,
  sincronizarFilaComSupabase
} from '../src/services/offlineSyncEngine';
import {
  excluirItemLocal,
  obterItemPorIdLocal,
  obterTodosItensLocal,
  salvarItemLocal,
  salvarLoteItensLocal
} from '../src/services/porttoHubDb';
import {
  extrairPathBucketEncomendas,
  resolverUrlFotoPrivada
} from '../src/services/imageUtils';
import { supabase } from '../src/services/supabase';
import { subscreverTabelaRealtime } from '../src/services/realtimeSyncEngine';

const CONDO_A = '11111111-1111-4111-8111-111111111111';
const CONDO_B = '22222222-2222-4222-8222-222222222222';
const CONDO_C = '33333333-3333-4333-8333-333333333333';

const OP_A = {
  id: 'op-a-001',
  auth_user_id: 'auth-a-001',
  nome: 'Porteiro Alfa',
  login: 'porteiro_a',
  perfil: 'operador',
  nivel_acesso: 3,
  condominio_id: CONDO_A,
  condominios_autorizados: [CONDO_A]
};

const OP_B = {
  id: 'op-b-001',
  auth_user_id: 'auth-b-001',
  nome: 'Porteiro Beta',
  login: 'porteiro_b',
  perfil: 'operador',
  nivel_acesso: 3,
  condominio_id: CONDO_B,
  condominios_autorizados: [CONDO_B]
};

const ADMIN_LOCAL_A = {
  id: 'adm-a-001',
  auth_user_id: 'auth-adm-a',
  nome: 'Síndico / Adm Local A',
  login: 'admin',
  perfil: 'admin',
  nivel_acesso: 0,
  condominio_id: CONDO_A,
  condominios_autorizados: [CONDO_A],
  e_super_admin_global: false,
  global_admin_verificado: false
};

const ADMIN_GLOBAL_VERIFICADO = {
  id: 'adm-global-001',
  auth_user_id: 'auth-global-001',
  nome: 'Administrador Global Auditado',
  login: 'gestor_global',
  perfil: 'admin_geral',
  nivel_acesso: 0,
  condominio_id: null,
  condominios_autorizados: [CONDO_A, CONDO_B],
  e_super_admin_global: true,
  global_admin_verificado: true,
  admin_global_registro: { id: 'ag-1', ativo: true }
};

function resetMockBrowserState() {
  mockLocalStorage.clear();
  delete mockWindow.idCondominioAtivo;
}

// ============================================================================
// CENÁRIO 1: Isolamento Estrito de Operadores (Condomínio A vs Condomínio B)
// ============================================================================
test('1. Operador do Condomínio A não acessa Condomínio B e lista autorizados isolada', () => {
  resetMockBrowserState();
  assert.equal(canAccessCondominio(OP_A, CONDO_A), true);
  assert.equal(canAccessCondominio(OP_A, CONDO_B), false);
  assert.equal(canAccessCondominio(OP_B, CONDO_B), true);
  assert.equal(canAccessCondominio(OP_B, CONDO_A), false);
  assert.equal(canAccessCondominio(OP_A, 'todos'), false);
  assert.equal(canAccessCondominio(OP_A, 'global'), false);
  assert.deepEqual(obterCondominiosAutorizadosIds(OP_A), [CONDO_A]);
  assert.deepEqual(obterCondominiosAutorizadosIds(OP_B), [CONDO_B]);
  assert.equal(canSwitchCondominio(OP_A), false);
});

// ============================================================================
// CENÁRIO 2: Admin Local vs Administrador Global Verificado (Zero Bypass Hardcoded)
// ============================================================================
test('2. Admin local (mesmo com login "admin") nunca é Global Admin; Global Admin auditado mantém acesso multi-tenant', () => {
  resetMockBrowserState();
  assert.equal(isVerifiedGlobalAdmin(ADMIN_LOCAL_A), false);
  assert.equal(canSwitchCondominio(ADMIN_LOCAL_A), false);
  assert.equal(canAccessCondominio(ADMIN_LOCAL_A, CONDO_A), true);
  assert.equal(canAccessCondominio(ADMIN_LOCAL_A, CONDO_B), false);

  // Sessão sintética legada nunca é aceita
  assert.equal(
    isVerifiedGlobalAdmin({
      id: 'admin_master_root',
      e_super_admin_global: true,
      global_admin_verificado: true
    }),
    false
  );

  // Admin Global verificado continua gerenciando múltiplos condomínios
  assert.equal(isVerifiedGlobalAdmin(ADMIN_GLOBAL_VERIFICADO), true);
  assert.equal(canSwitchCondominio(ADMIN_GLOBAL_VERIFICADO), true);
  assert.equal(canAccessCondominio(ADMIN_GLOBAL_VERIFICADO, CONDO_A), true);
  assert.equal(canAccessCondominio(ADMIN_GLOBAL_VERIFICADO, CONDO_B), true);
  assert.equal(canAccessCondominio(ADMIN_GLOBAL_VERIFICADO, CONDO_C), true);
});

// ============================================================================
// CENÁRIO 3: Servidor Express /api/cache/* Autorização e Anti-Tampering
// ============================================================================
test('3. /api/cache/* bloqueia sem JWT (401), bloqueia cross-tenant e tampering (403) e valida Admin Global', async () => {
  const store = new Map<string, string>();
  const cacheMock: RedisCacheLike = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
      return 'OK';
    },
    async invalidateByPattern() {
      return 0;
    },
    async invalidateByTag() {
      return 0;
    },
    async flush() {
      store.clear();
      return 'OK';
    },
    async getStats() {
      return {
        provider: 'in-memory-redis',
        connected: true,
        totalKeys: store.size,
        hitCount: 0,
        missCount: 0,
        hitRatio: '0%',
        totalRequests: 0,
        avgLatencyMs: 0,
        keysSummary: {}
      };
    }
  };

  const callerA: AuthenticatedTenantCaller = {
    authUserId: 'auth-a-001',
    email: 'a@condo.test',
    operadorId: 'op-a-001',
    isGlobalAdmin: false,
    authorizedCondoIds: [CONDO_A],
    accessToken: 'jwt-operador-a'
  };

  const fetchMock: typeof fetch = async () =>
    new Response(
      JSON.stringify([
        { id: 'item-a', condominio_id: CONDO_A, nome: 'Morador A' },
        { id: 'item-intruso-b', condominio_id: CONDO_B, nome: 'Intruso B' }
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const app = express();
  app.use(express.json());
  app.use(
    '/api/cache',
    createCacheRouter({
      cache: cacheMock,
      security: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'anon-key-test',
        fetchImpl: fetchMock,
        verifyAccessToken: async (token) => (token === 'jwt-operador-a' ? callerA : null)
      }
    })
  );

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    // Sem Bearer JWT -> 401
    const rUnauth = await fetch(`${baseUrl}/api/cache/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'moradores', condominioId: CONDO_A })
    });
    assert.equal(rUnauth.status, 401);

    // JWT anônimo inválido -> 401
    const rAnon = await fetch(`${baseUrl}/api/cache/stats`, {
      headers: { Authorization: 'Bearer anon-key-test' }
    });
    assert.equal(rAnon.status, 401);

    // Operador A tentando consultar Condomínio B -> 403
    const rCross = await fetch(`${baseUrl}/api/cache/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-operador-a'
      },
      body: JSON.stringify({ table: 'encomendas_itens', condominioId: CONDO_B })
    });
    assert.equal(rCross.status, 403);

    // Tampering de filtro: condominio_id neq CONDO_A -> 403
    const rTamperOp = await fetch(`${baseUrl}/api/cache/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-operador-a'
      },
      body: JSON.stringify({
        table: 'moradores',
        condominioId: CONDO_A,
        filters: [{ field: 'condominio_id', op: 'neq', value: CONDO_A }]
      })
    });
    assert.equal(rTamperOp.status, 403);

    // Tampering conflitante: condominioId=CONDO_A + filtro condominio_id=CONDO_B -> 403
    const rTamperConflict = await fetch(`${baseUrl}/api/cache/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-operador-a'
      },
      body: JSON.stringify({
        table: 'moradores',
        condominioId: CONDO_A,
        filters: [{ field: 'condominio_id', op: 'eq', value: CONDO_B }]
      })
    });
    assert.equal(rTamperConflict.status, 403);

    // Operador comum tentando limpar todo cache -> 403
    const rClear = await fetch(`${baseUrl}/api/cache/clear`, {
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-operador-a' }
    });
    assert.equal(rClear.status, 403);

    // Consulta autorizada no Condomínio A -> 200 e filtragem em profundidade descarta intruso de B
    const rOk = await fetch(`${baseUrl}/api/cache/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer jwt-operador-a'
      },
      body: JSON.stringify({ table: 'moradores', condominioId: CONDO_A })
    });
    assert.equal(rOk.status, 200);
    const jsonOk: any = await rOk.json();
    assert.equal(jsonOk.data.length, 1);
    assert.equal(jsonOk.data[0].condominio_id, CONDO_A);

    // validateAndScopeTenantQuery direto para Admin Global vs Operador
    const valAdminGlobal = validateAndScopeTenantQuery({
      caller: { ...callerA, isGlobalAdmin: true, authorizedCondoIds: [CONDO_A, CONDO_B] },
      table: 'encomendas_itens',
      rawCondoId: CONDO_B
    });
    assert.equal(valAdminGlobal.ok, true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// ============================================================================
// CENÁRIO 4: Redis Namespace por Condomínio + Fallback L3 Isolado + DeltaSync
// ============================================================================
test('4. Chaves Redis segregam por condomínio e cachedQuery/deltaSync rejeitam fallback sem escopo válido', async () => {
  limparCacheMemoriaCliente();
  limparCacheRamDeltaSync();

  const keyA = buildIsolatedQueryCacheKey('moradores', '*', [], undefined, undefined, CONDO_A);
  const keyB = buildIsolatedQueryCacheKey('moradores', '*', [], undefined, undefined, CONDO_B);
  assert.notEqual(keyA, keyB);
  assert.ok(keyA.startsWith(`porttohub:condo:${CONDO_A}:`));
  assert.ok(keyB.startsWith(`porttohub:condo:${CONDO_B}:`));

  // cachedQuery sem condominioId ou com 'todos'/'global' ou filtro neq deve ser rejeitada antes de atingir Supabase
  await assert.rejects(
    cachedQuery({ table: 'encomendas_itens', condominioId: 'todos' })
  );
  await assert.rejects(
    cachedQuery({
      table: 'moradores',
      condominioId: CONDO_A,
      filters: [{ field: 'condominio_id', op: 'neq', value: CONDO_A }]
    })
  );

  // DeltaSync rejeita leitura sem condomínio válido e bloqueia mutação local cross-tenant
  assert.deepEqual(await obterDadosTabelaLocal('encomendas_itens', 'todos'), []);
  await aplicarMutacaoLocal(
    'encomendas_itens',
    CONDO_B,
    { id: 'cross-1', condominio_id: CONDO_A },
    'INSERT'
  );
  assert.deepEqual(await obterDadosTabelaLocal('encomendas_itens', CONDO_B), []);
});

// ============================================================================
// CENÁRIO 5: Padronização de Troca de Condomínio e Prioridade de Seleção Ativa
// ============================================================================
test('5. getCondominioAtivoId prioriza seleção validada em localStorage e evento unificado funciona', () => {
  resetMockBrowserState();
  let eventoRecebidoId = '';
  const listener = (ev: any) => {
    eventoRecebidoId = extrairCondominioIdDeEvento(ev);
  };
  mockWindow.addEventListener('infport:condominio_alterado', listener);

  // Admin global com condominio_id legado no objeto não sobrescreve troca para CONDO_B
  const adminMulti = {
    ...ADMIN_GLOBAL_VERIFICADO,
    condominio_id: CONDO_A
  };
  const trocou = dispatchCondominioAlterado(CONDO_B, { id: CONDO_B, nome: 'Beta' }, adminMulti);
  assert.equal(trocou, true);
  assert.equal(eventoRecebidoId, CONDO_B);
  assert.equal(getCondominioAtivoId(adminMulti), CONDO_B);

  // Operador restrito ao Condomínio A é bloqueado ao tentar despachar troca para B
  const bloqueado = dispatchCondominioAlterado(CONDO_B, { id: CONDO_B }, OP_A);
  assert.equal(bloqueado, false);

  // Mesmo se alguém manipular manualmente localStorage para CONDO_B, OP_A continua preso a CONDO_A
  mockLocalStorage.setItem('infport_condominio_ativo_id', CONDO_B);
  assert.equal(getCondominioAtivoId(OP_A), CONDO_A);

  mockWindow.removeEventListener('infport:condominio_alterado', listener);
});

// ============================================================================
// CENÁRIO 6: Permissões Particionadas & Fim de Atalhos por Login
// ============================================================================
test('6. permissoesService particiona chaves locais e nega configuração para operador comum', () => {
  resetMockBrowserState();
  assert.equal(verificarPermissao(OP_A, 'configuracoes', 'visualizar'), false);
  assert.equal(verificarPermissao(OP_A, 'materiais', 'excluir'), false);
  assert.equal(verificarPermissao(ADMIN_LOCAL_A, 'configuracoes', 'visualizar'), true);

  // Ao limpar caches na troca de sessão, filas offline particionadas v2 permanecem preservadas
  const chaveFila = obterChaveFilaOffline(OP_A.id, CONDO_A);
  mockLocalStorage.setItem(chaveFila, JSON.stringify([{ id: 'off-1', condominio_id: CONDO_A }]));
  mockLocalStorage.setItem('infport_cache_global_operadores', 'stale');

  limparCachesOperacionaisTrocaSessao({ preservarSessao: false, preservarCondoAtivo: false });
  assert.equal(mockLocalStorage.getItem('infport_cache_global_operadores'), null);
  assert.ok(mockLocalStorage.getItem(chaveFila)?.includes('off-1'));
});

// ============================================================================
// CENÁRIO 7: Integridade Nominal e Isolamento de Encomendas + Guards de Race Condition
// ============================================================================
test('7. Encomendas prioriza morador_id exato, preserva destinatario e rejeita associação ambígua/cross-tenant', () => {
  const moradores = [
    { id: 'mor-1', condominio_id: CONDO_A, nome: 'Ana Silva', bloco: 'A', unidade: '101' },
    { id: 'mor-2', condominio_id: CONDO_A, nome: 'Bruno Silva', bloco: 'A', unidade: '101' },
    { id: 'mor-3', condominio_id: CONDO_A, nome: 'Carlos Souza', bloco: 'A', unidade: '102' },
    { id: 'mor-b-101', condominio_id: CONDO_B, nome: 'Morador B 101', bloco: 'A', unidade: '101' }
  ];

  // Prioridade absoluta por morador_id mesmo havendo 2 moradores na unidade 101
  const resolvidoBruno = resolverMoradorDaEncomenda(
    { morador_id: 'mor-2', condominio_id: CONDO_A, bloco: 'A', unidade: '101' },
    moradores,
    'blocos'
  );
  assert.equal(resolvidoBruno?.id, 'mor-2');

  // Se morador_id aponta para morador do Condomínio B, NÃO associa nem substitui por outro de A
  const crossTenant = resolverMoradorDaEncomenda(
    { morador_id: 'mor-b-101', condominio_id: CONDO_A, bloco: 'A', unidade: '101' },
    moradores,
    'blocos'
  );
  assert.equal(crossTenant, null);

  // Sem morador_id e com 2 moradores na unidade 101, NÃO escolhe o primeiro alfabeticamente
  const ambiguo = resolverMoradorDaEncomenda(
    { condominio_id: CONDO_A, bloco: 'A', unidade: '101' },
    moradores,
    'blocos'
  );
  assert.equal(ambiguo, null);

  // Sem morador_id e apenas 1 morador na unidade 102 do mesmo condomínio, associa com segurança
  const unico = resolverMoradorDaEncomenda(
    { condominio_id: CONDO_A, bloco: 'A', unidade: '102' },
    moradores,
    'blocos'
  );
  assert.equal(unico?.id, 'mor-3');

  // Preserva nome histórico gravado na coluna destinatario
  assert.equal(
    obterNomeDestinatarioExibicao({ destinatario: 'Bruno Silva', moradores: { nome: 'Outro Nome' } }),
    'Bruno Silva'
  );

  // Verifica guards anti-race-condition (sequenciamento de carga) em páginas críticas
  const encomendasSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Encomendas.tsx'), 'utf8');
  const cadastrosSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Cadastros.tsx'), 'utf8');
  assert.ok(encomendasSrc.includes('loadSeqRef'));
  assert.ok(cadastrosSrc.includes('loadSeqRef'));
});

// ============================================================================
// CENÁRIO 8: Portal do Síndico / Auditoria sem Fallbacks Globais nem Dados Fake
// ============================================================================
test('8. PainelSindico não possui fallbacks globais de passagem de posto nem dados demonstrativos estáticos', () => {
  const painelSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/PainelSindico.tsx'), 'utf8');
  assert.equal(painelSrc.includes("id: 'oc-1'"), false);
  assert.equal(painelSrc.includes("id: 'ch-1'"), false);
  assert.equal(painelSrc.includes("id: 'cst-1'"), false);
  assert.equal(painelSrc.includes("id: 'mat-1'"), false);
  assert.ok(painelSrc.includes('Não há passagem de posto registrada para este condomínio.'));
  assert.ok(painelSrc.includes('loadSeqRef'));
});

// ============================================================================
// CENÁRIO 9: Fila Offline Particionada, Quarentena e Trava Mutex Concorrente
// ============================================================================
test('9. offlineSyncEngine segrega por operador+condomínio, coloca divergentes em quarentena e evita replay concorrente', async () => {
  resetMockBrowserState();
  const calls: Array<{ table: string; op: string; filters: Array<[string, any]> }> = [];

  const originalFrom = supabase.from.bind(supabase);
  let releaseUpdate!: () => void;
  const updateGate = new Promise<void>((res) => {
    releaseUpdate = res;
  });

  (supabase as any).from = (table: string) => ({
    insert: async () => {
      calls.push({ table, op: 'insert', filters: [] });
      return { error: null };
    },
    update: () => {
      const filters: Array<[string, any]> = [];
      const chain: any = {
        eq(col: string, val: any) {
          filters.push([col, val]);
          return chain;
        },
        then(resolve: any) {
          calls.push({ table, op: 'update', filters });
          return updateGate.then(() => resolve({ error: null }));
        }
      };
      return chain;
    },
    delete: () => {
      const filters: Array<[string, any]> = [];
      const chain: any = {
        eq(col: string, val: any) {
          filters.push([col, val]);
          return chain;
        },
        then(resolve: any) {
          calls.push({ table, op: 'delete', filters });
          return Promise.resolve({ error: null }).then(resolve);
        }
      };
      return chain;
    }
  });

  try {
    // Cria ação offline no Condomínio A
    enfileirarAcaoOffline(
      'encomendas_itens',
      'UPDATE',
      { id: 'pkg-1', status: 'Retirado' },
      'Baixa Offline A',
      { condominioId: CONDO_A, operadorId: OP_A.id, authUserId: OP_A.auth_user_id }
    );

    // Troca para Condomínio B -> fila de B está vazia, ação de A permanece intacta na partição de A
    assert.equal(obterFilaOffline({ condominioId: CONDO_B, operadorId: OP_B.id }).length, 0);
    assert.equal(obterFilaOffline({ condominioId: CONDO_A, operadorId: OP_A.id }).length, 1);

    // Simula ação antiga/incompatível tentando sincronizar no contexto de B -> vai para quarentena, não executa em B
    const chaveB = obterChaveFilaOffline(OP_B.id, CONDO_B);
    mockLocalStorage.setItem(
      chaveB,
      JSON.stringify([
        {
          id: 'off-intruso',
          tabela: 'encomendas_itens',
          tipo: 'UPDATE',
          dados: { id: 'pkg-a', condominio_id: CONDO_A, status: 'Excluido' },
          condominio_id: CONDO_A,
          operador_id: OP_A.id,
          criadoEm: new Date().toISOString(),
          tentativas: 0,
          descricaoAmigavel: 'Ação cruzada'
        }
      ])
    );

    const resQuarentena = await sincronizarFilaComSupabase({
      condominioId: CONDO_B,
      operadorId: OP_B.id,
      authUserId: OP_B.auth_user_id
    });
    assert.equal(resQuarentena.sucessos, 0);
    assert.equal(calls.length, 0);
    assert.equal(obterFilaQuarentena().some((it) => it.id === 'off-intruso'), true);
    assert.ok(mockLocalStorage.getItem(CHAVE_FILA_QUARANTINE));

    // Sincronização concorrente no contexto válido de A: duas chamadas simultâneas executam UPDATE apenas 1 vez com .eq('condominio_id', CONDO_A)
    const p1 = sincronizarFilaComSupabase({
      condominioId: CONDO_A,
      operadorId: OP_A.id,
      authUserId: OP_A.auth_user_id
    });
    const p2 = sincronizarFilaComSupabase({
      condominioId: CONDO_A,
      operadorId: OP_A.id,
      authUserId: OP_A.auth_user_id
    });
    releaseUpdate();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1.sucessos, 1);
    assert.equal(r2.sucessos, 1);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].filters, [
      ['id', 'pkg-1'],
      ['condominio_id', CONDO_A]
    ]);
  } finally {
    (supabase as any).from = originalFrom;
  }
});

// ============================================================================
// CENÁRIO 10: Supabase Realtime Isolado por Canal e Validação de Payload
// ============================================================================
test('10. realtimeSyncEngine aplica filtro condominio_id=eq e descarta payloads de outro condomínio', () => {
  resetMockBrowserState();
  const capturedSubs: Array<{ filter?: string; handler: Function }> = [];
  const removedChannels: any[] = [];

  const originalChannel = supabase.channel.bind(supabase);
  const originalRemoveChannel = supabase.removeChannel.bind(supabase);

  (supabase as any).channel = (name: string) => {
    const channelObj: any = {
      name,
      on(_evt: string, opts: any, handler: Function) {
        capturedSubs.push({ filter: opts?.filter, handler });
        return channelObj;
      },
      subscribe() {
        return channelObj;
      }
    };
    return channelObj;
  };
  (supabase as any).removeChannel = (ch: any) => {
    removedChannels.push(ch);
  };

  try {
    const recebidosB: any[] = [];
    const unsub = subscreverTabelaRealtime(
      'ocorrencias',
      (ev) => recebidosB.push(ev),
      CONDO_B
    );

    assert.equal(capturedSubs.length, 1);
    assert.equal(capturedSubs[0].filter, `condominio_id=eq.${CONDO_B}`);

    // Simula evento vazado pertencente ao Condomínio A -> deve ser descartado
    capturedSubs[0].handler({
      eventType: 'INSERT',
      new: { id: 'oc-a-1', condominio_id: CONDO_A, titulo: 'Ocorrência A' },
      old: {}
    });
    assert.equal(recebidosB.length, 0);

    // Simula evento legítimo do Condomínio B -> deve ser entregue
    capturedSubs[0].handler({
      eventType: 'INSERT',
      new: { id: 'oc-b-1', condominio_id: CONDO_B, titulo: 'Ocorrência B' },
      old: {}
    });
    assert.equal(recebidosB.length, 1);
    assert.equal(recebidosB[0].novo.id, 'oc-b-1');

    unsub();
    assert.equal(removedChannels.length, 1);
  } finally {
    (supabase as any).channel = originalChannel;
    (supabase as any).removeChannel = originalRemoveChannel;
  }
});

// ============================================================================
// CENÁRIO 11: IndexedDB / Armazenamento Local Rejeita Cross-Tenant
// ============================================================================
test('11. porttoHubDb bloqueia leitura, gravação e exclusão cross-tenant no armazenamento local', async () => {
  await salvarLoteItensLocal(
    'encomendas_itens',
    [{ id: 'loc-a-1', condominio_id: CONDO_A, codigo_rastreio: 'AAA' }],
    CONDO_A
  );

  // Gravação com condominio_id incompatível deve ser recusada
  await assert.rejects(
    salvarItemLocal(
      'encomendas_itens',
      { id: 'loc-a-2', condominio_id: CONDO_A },
      CONDO_B
    )
  );

  // Leitura por ID e listagem no contexto B não enxergam itens de A
  const itemNoContextoB = await obterItemPorIdLocal('encomendas_itens', 'loc-a-1', CONDO_B);
  assert.equal(itemNoContextoB, null);

  const listaB = await obterTodosItensLocal('encomendas_itens', CONDO_B);
  assert.equal(listaB.length, 0);

  // Exclusão no contexto B não apaga registro pertencente a A
  await excluirItemLocal('encomendas_itens', 'loc-a-1', CONDO_B);
  const aindaEmA = await obterTodosItensLocal('encomendas_itens', CONDO_A);
  assert.equal(aindaEmA.length, 1);
});

// ============================================================================
// CENÁRIO 12: Fotografias, Storage Privado e Compatibilidade com Links Legados
// ============================================================================
test('12. Storage extrai path de URLs legadas/privadas, resolve signed URL e preserva base64/legado', async () => {
  const pathLegado = extrairPathBucketEncomendas(
    'https://kkeizhscivyfjgetnbke.supabase.co/storage/v1/object/public/encomendas/etiquetas/foto1.jpg'
  );
  assert.deepEqual(pathLegado, { bucket: 'encomendas', path: 'etiquetas/foto1.jpg' });

  const pathParticionado = extrairPathBucketEncomendas(`condominios/${CONDO_A}/etiquetas/foto2.jpg`);
  assert.deepEqual(pathParticionado, {
    bucket: 'encomendas',
    path: `condominios/${CONDO_A}/etiquetas/foto2.jpg`
  });

  // Base64 nunca dispara request de Storage
  assert.equal(extrairPathBucketEncomendas('data:image/jpeg;base64,/9j/4AAQ'), null);
  assert.equal(
    await resolverUrlFotoPrivada('data:image/jpeg;base64,/9j/4AAQ'),
    'data:image/jpeg;base64,/9j/4AAQ'
  );

  // Simula resolução assinada autenticada para bucket privado
  const originalStorage = (supabase as any).storage;
  (supabase as any).storage = {
    from(bucket: string) {
      return {
        async createSignedUrl(objectPath: string) {
          return {
            data: {
              signedUrl: `https://kkeizhscivyfjgetnbke.supabase.co/storage/v1/object/sign/${bucket}/${objectPath}?token=signed-ok`
            },
            error: null
          };
        }
      };
    }
  };

  try {
    const urlResolvida = await resolverUrlFotoPrivada(`condominios/${CONDO_A}/etiquetas/foto2.jpg`);
    assert.ok(urlResolvida.includes('/storage/v1/object/sign/encomendas/'));
    assert.ok(urlResolvida.includes(`condominios/${CONDO_A}/etiquetas/foto2.jpg`));
    assert.equal(isValidCondominioId(CONDO_A), true);
  } finally {
    (supabase as any).storage = originalStorage;
  }
});
