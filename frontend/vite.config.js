import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Masrofy',
        short_name: 'Masrofy',
        description: 'مدير المصروفات والاستثمارات الشخصي',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        lang: 'ar',
        dir: 'rtl',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
