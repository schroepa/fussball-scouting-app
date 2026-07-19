// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import AstroPWA from '@vite-pwa/astro';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',

  integrations: [
    react(),
    // Hinweis: @vite-pwa/astro deklariert offiziell Astro <=5 als Peer-
    // Dependency, funktioniert aber auch mit Astro 7 (installiert via
    // --legacy-peer-deps). Der Wrapper hakt sich – anders als das rohe
    // vite-plugin-pwa – korrekt in Astros Build-Lifecycle ein, damit der
    // Service Worker (sw.js) zuverlässig erzeugt wird.
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Fussball Scouting',
        short_name: 'Scouting',
        description:
          'Mobile-first Scouting-App zur offline-fähigen Erfassung von Spieler- und Team-Daten.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            // Supabase-Storage-Fotos: bei Offline-Nutzung aus Cache bedienen
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },

  adapter: vercel(),
});
