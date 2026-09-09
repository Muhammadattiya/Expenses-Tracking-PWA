import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt', // Better for update detection prompt
      injectRegister: 'auto',
      pwaAssets: false,
      manifest: {
        name: 'Finova',
        short_name: 'Finova',
        description: 'Finova, Personal Finance and Investment Manager',
        theme_color: '#141115',
        background_color: '#141115',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'en',
        dir: 'ltr',
        icons: [
          { src: '/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
      },
      devOptions: {
        enabled: false,
        type: 'module',
      },
    }),
  ]
})
