import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(async ({ command }) => {
  const pwaPlugins = [];
  if (command === 'build') {
    const { VitePWA } = await import('vite-plugin-pwa');
    pwaPlugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'PorttoHub - Sistema Integrado de Portaria',
          short_name: 'PorttoHub',
          description: 'PorttoHub - Sistema integrado de portaria, controle de acesso, rondas e auditoria predial PWA.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Estratégia NetworkFirst com fallback em cache para a API do Supabase na portaria
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias de persistência para falhas temporárias
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Imagens e uploads em cache StaleWhileRevalidate
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dias
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      })
    );
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...pwaPlugins,
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://kkeizhscivyfjgetnbke.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZWl6aHNjaXZ5ZmpnZXRuYmtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2ODk5NDUsImV4cCI6MjEwODI2NTk0NX0.hQzzvICbZfNPziWrj8DlD-A8-Vm4xbr25Nr0xQe3BEA'),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
