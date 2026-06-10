import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'charts'
          if (id.includes('node_modules/leaflet')) return 'maps'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/@rive-app')) return 'rive'
          if (id.includes('node_modules/@zxing')) return 'scanner'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
  preview: {
    allowedHosts: ['prataykarali-carbonlens.hf.space', '.hf.space'],
  },
  plugins: [react(), tailwindcss()],
})
