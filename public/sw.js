/**
 * PorttoHub / INFPORT 1.0 - Service Worker Oficial PWA
 * Habilita instalação como aplicativo nativo no PC / Android / iOS
 * e garante resiliência offline para a guarita com cache de páginas e imagens dos cards.
 */

const CACHE_APP_SHELL = 'porttohub-shell-v3';
const CACHE_IMAGENS = 'infport-card-images-v1';
const CACHE_DINAMICO = 'porttohub-runtime-v3';

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
        console.warn('[SW] Aviso no precache:', err);
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
            key !== CACHE_IMAGENS && 
            key !== CACHE_DINAMICO && 
            !key.includes('workbox')
          ) {
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

  // Não intercepta WebSockets ou chamadas RPC da API de backend
  if (
    url.pathname.startsWith('/api') || 
    url.protocol === 'ws:' ||
    url.protocol === 'wss:'
  ) {
    return;
  }

  // ESTRATÉGIA PARA IMAGENS DOS CARDS (Supabase Storage, Fotos de Pacotes, Visitantes, Ocorrências)
  const ehImagem = 
    event.request.destination === 'image' ||
    url.pathname.includes('/storage/v1/object/public/') ||
    /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(url.pathname);

  if (ehImagem) {
    event.respondWith(
      caches.open(CACHE_IMAGENS).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Em segundo plano, revalida se houver conexão (Stale-While-Revalidate)
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(event.request, networkResponse.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          // Se não está em cache, busca na rede e guarda no cache
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Retorna fallback se estiver offline e sem cache prévio
              return caches.match('/icon.svg');
            });
        });
      })
    );
    return;
  }

  // ESTRATÉGIA PARA CONSULTAS DO SUPABASE (REST / PostgREST)
  // Permite ler do cache local se a rede falhar
  if (url.hostname.includes('supabase.co')) {
    // Permite que o SDK do Supabase gerencie diretamente requisições da API, 
    // com nosso offlineStorageService / offlineSyncEngine garantindo a persistência.
    return;
  }

  // ESTRATÉGIA PARA NAVEGAÇÃO E RECURSOS ESTÁTICOS DO APP
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_DINAMICO).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/') || caches.match('/index.html');
          }
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
