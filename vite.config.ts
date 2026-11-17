import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { contentPlugin } from './vite/content-plugin'

const contentDir = resolve(__dirname, 'content')

export default defineConfig({
  resolve: { dedupe: ['react', 'react-dom', '@tanstack/react-query', '@tanstack/query-core', 'react-router', 'react-router-dom'], alias: { '@': resolve(__dirname, 'src'), '@content': contentDir } },
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.ORATIO_API ?? 'http://localhost:8010', rewrite: (p) => p.replace(/^\/api/, '') } },
  },
  preview: { proxy: { '/api': { target: process.env.ORATIO_API ?? 'http://localhost:8010', rewrite: (p) => p.replace(/^\/api/, '') } } },
  build: {
    target: 'es2022',
    sourcemap: false,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'vendor-react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ }],
        },
      },
    },
  },
  plugins: [
    react(),
    contentPlugin(contentDir),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Oratio',
        short_name: 'Oratio',
        description: 'Oração diária: liturgia, terço, orações e novenas.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f2f4fb',
        background_color: '#f2f4fb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/liturgia/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-liturgia-v2',
              expiration: { maxEntries: 40, maxAgeSeconds: 14 * 86400 },
              cacheableResponse: { statuses: [200] },
            },
          },
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/auth/'), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
})
