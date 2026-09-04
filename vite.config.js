import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'The Perfect Walk',
        short_name: 'Walk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0F0D16',
        theme_color: '#0F0D16',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Audio extensions are omitted deliberately. Caching media means the service worker
        // answers Safari's range requests, and a non-range response breaks playback silently.
        // Not precaching audio removes the trap rather than configuring around it. Offline
        // playback is not on the checklist, and adding it later needs workbox-range-requests
        // and its own record.
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
})
