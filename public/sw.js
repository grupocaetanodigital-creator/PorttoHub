/**
 * PorttoHub / INFPORT 1.0 - Service Worker Oficial PWA
 * OTIMIZAÇÃO DE ASSETS, ZERO-LATENCY E RESILIÊNCIA OFFLINE
 * 
 * ESTRATÉGIAS DE CACHE APLICADAS:
 * 1. Stale-While-Revalidate: Para Scripts JS, CSS, Fontes e Imagens.
 *    -> Entrega imediata em 0ms a partir do cache local, revalidando silenciosamente em segundo plano.
 * 2. Network-First com Fallback: Apenas para checagem de versão (/version.json) e rotas críticas de autenticação.
 * 3. Cache Storage Segregado: Permite purga seletiva de versões antigas sem perder cache de fotos.
 */

const CACHE_APP_SHELL = 'porttohub-shell-v4';
const CACHE_ESTATICOS_ASSETS = 'porttohub-assets-v4';
const CACHE_IMAGENS = 'porttohub-images-v4';
const CACHE_DINAMICO = 'porttohub-runtime-v4';

const ASSETS_ESSENCIAIS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_APP_SHELL).then((cache) => {
      return cache.addAll(ASSETS_ESSENCIAIS).catch((err) => {
        console.warn('[SW] Aviso no precache inicial:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key !== CACHE_APP_SHELL && 
            key !== CACHE_ESTATICOS_ASSETS && 
            key !== CACHE_IMAGENS && 
            key !== CACHE_DINAMICO
          ) {
            console.log('[SW] Purgando cache legado:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Não intercepta WebSockets
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // 1. NETWORK-FIRST ESTRITO: Rotas de autenticação e verificação de versão para OTA Instantâneo
  const ehRotaCriticaAuthOuVersao = 
    url.pathname === '/version.json' || 
    url.pathname.startsWith('/auth') || 
    url.pathname.startsWith('/api/auth') ||
    url.searchParams.has('ts');

  if (ehRotaCriticaAuthOuVersao) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copia = networkResponse.clone();
            caches.open(CACHE_DINAMICO).then((c) => c.put(event.request, copia));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 2. STALE-WHILE-REVALIDATE PARA SCRIPTS JS, CSS E FONTES
  // Entrega imediata em 0ms do cache local com atualização invisível em background
  const ehScriptOuCssOuFonte = 
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname) ||
    url.pathname.startsWith('/assets/');

  if (ehScriptOuCssOuFonte) {
    event.respondWith(
      caches.open(CACHE_ESTATICOS_ASSETS).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => null);

          // Se tem cache, entrega na hora (0ms!) e atualiza cache em paralelo
          if (cachedResponse) {
            return cachedResponse;
          }

          // Se ainda não estava no cache, aguarda a rede
          return fetchPromise.then((res) => res || cachedResponse);
        });
      })
    );
    return;
  }

  // 3. STALE-WHILE-REVALIDATE PARA IMAGENS DOS CARDS & STORAGE
  const ehImagem = 
    event.request.destination === 'image' ||
    url.pathname.includes('/storage/v1/object/public/') ||
    /\.(png|jpe?g|webp|svg|gif|avif|ico)$/i.test(url.pathname);

  if (ehImagem) {
    event.respondWith(
      caches.open(CACHE_IMAGENS).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const revalidacaoRede = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => null);

          if (cachedResponse) {
            return cachedResponse;
          }

          return revalidacaoRede.then((res) => res || caches.match('/icon.svg'));
        });
      })
    );
    return;
  }

  // 4. ESTRATÉGIA PARA CONSULTAS DO SUPABASE (REST / PostgREST)
  // O SDK do Supabase e o nosso IndexedDB / deltaSyncService gerenciam o banco de dados
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 5. NAVEGAÇÃO SPA (index.html Shell): Network-first com fallback instantâneo para App Shell em cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copia = networkResponse.clone();
            caches.open(CACHE_APP_SHELL).then((c) => c.put('/', copia));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // Fallback padrão para demais requisições
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
