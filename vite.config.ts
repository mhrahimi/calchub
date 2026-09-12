import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: '/calchub/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CalcHub: All-in-One Calculator',
        short_name: 'CalcHub',
        description:
          'Financial, tax, investment, math, statistics, date and conversion calculators in one fast, private calculator hub.',
        theme_color: '#163B8C',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/calchub/',
        scope: '/calchub/',
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
        // Icons + webmanifest are added by the plugin; keep globs to app chunks only
        globPatterns: ['**/*.{js,css,html,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
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
