import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

const BASE = '/calchub/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Claim clients immediately so offline works without a second visit/reload race
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: 'CalcHub: All-in-One Calculator',
        short_name: 'CalcHub',
        description:
          'Financial, tax, investment, math, statistics, date and conversion calculators in one fast, private calculator hub.',
        theme_color: '#163B8C',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: BASE,
        scope: BASE,
        lang: 'en',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Skip terser minify of the SW (avoids rollup/plugin-terser worker hangs on some hosts)
        mode: 'development',
        // App chunks + fonts; icons/manifest are added via includeAssets + the plugin
        globPatterns: ['**/*.{js,css,html,woff,woff2}'],
        // Absolute path under GitHub Pages base so NavigationRoute resolves offline
        navigateFallback: `${BASE}index.html`,
        navigateFallbackAllowlist: [/^\/calchub\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Runtime cache for hashed assets as a safety net during first-visit precache
        runtimeCaching: [
          {
            urlPattern: /\/calchub\/assets\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'calchub-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'recharts'
          if (id.includes('node_modules/jspdf')) return 'jspdf'
          if (id.includes('node_modules/html2canvas')) return 'html2canvas'
          if (id.includes('node_modules/framer-motion')) return 'framer-motion'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
