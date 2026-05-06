import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: '0.0.0.0',
      port: 5173, // Move Frontend to 5173 to avoid conflict with Backend (3000)
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
        manifest: {
          name: 'Taksapark',
          short_name: 'Taksapark',
          description: 'Taksapark - Professional taksi parkini boshqarish tizimi',
          theme_color: '#0f766e',
          background_color: '#111827',
          display: 'standalone',
          icons: [
            {
              src: '/web-app-manifest-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable any'
            },
            {
              src: '/web-app-manifest-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable any'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              // Supabase Storage bucket (driver avatars, documents, car photos).
              // CacheFirst: serve from cache instantly, network only if cache misses.
              // 24-hour TTL keeps images fresh without wasting bandwidth on every load.
              urlPattern: /^https:\/\/[A-Za-z0-9-]+\.supabase\.co\/storage\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage-v1',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24, // 24 hours
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase REST API (select/insert/update queries).
              // NetworkFirst: try network first (3s timeout), fall back to cache.
              // This means on slow connections the app shows last-known data instantly.
              // Realtime channels use WebSockets and are unaffected by this rule.
              urlPattern: /^https:\/\/[A-Za-z0-9-]+\.supabase\.co\/rest\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest-v1',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Supabase Auth endpoints — always NetworkOnly, never cache auth tokens.
              urlPattern: /^https:\/\/[A-Za-z0-9-]+\.supabase\.co\/auth\/.*/i,
              handler: 'NetworkOnly',
            },
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
